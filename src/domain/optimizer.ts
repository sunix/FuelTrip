import { filterStationsNearRoute } from './geometry';
import type { FuelType } from './fuel';
import type { Route } from './route';
import { getFuelPrice, type Station } from './station';

export type OptimizationStrategy = 'BEST_COMPROMISE' | 'CHEAPEST' | 'MINIMAL_DETOUR';

export interface OptimizationOptions {
  fuelType: FuelType;
  strategy: OptimizationStrategy;
  maxDistanceFromRouteMeters: number;
  detourSpeedMetersPerSecond?: number;
  compromiseWeights?: {
    detour: number;
    price: number;
  };
  limit?: number;
}

export interface FuelStopRecommendation {
  stationId: string;
  stationName: string;
  fuelType: FuelType;
  pricePerLiter: number;
  distanceFromRouteMeters: number;
  estimatedDetourMeters: number;
  estimatedExtraTimeSeconds: number;
  score: number;
  latitude: number;
  longitude: number;
}

type Candidate = FuelStopRecommendation;

const estimateDetourMeters = (distanceFromRouteMeters: number): number => distanceFromRouteMeters * 2.2;

const normalize = (value: number, min: number, max: number): number => {
  if (min === max) {
    return 0;
  }

  return (value - min) / (max - min);
};

export const optimizeFuelStops = (
  route: Route,
  stations: Station[],
  options: OptimizationOptions,
): FuelStopRecommendation[] => {
  const routeStations = filterStationsNearRoute(
    stations,
    route.points,
    options.maxDistanceFromRouteMeters,
  );

  const detourSpeedMetersPerSecond =
    options.detourSpeedMetersPerSecond ??
    Math.max(route.distanceMeters / Math.max(route.durationSeconds, 1), 16.67);

  const candidates: Candidate[] = routeStations
    .map((station) => {
      const fuelPrice = getFuelPrice(station, options.fuelType);
      if (!fuelPrice) {
        return undefined;
      }

      const estimatedDetourMeters = estimateDetourMeters(station.distanceFromRouteMeters);
      const estimatedExtraTimeSeconds = estimatedDetourMeters / detourSpeedMetersPerSecond;

      return {
        stationId: station.id,
        stationName: station.name,
        fuelType: options.fuelType,
        pricePerLiter: fuelPrice.price,
        distanceFromRouteMeters: station.distanceFromRouteMeters,
        estimatedDetourMeters,
        estimatedExtraTimeSeconds,
        score: 0,
        latitude: station.latitude,
        longitude: station.longitude,
      };
    })
    .filter((candidate): candidate is Candidate => Boolean(candidate));

  if (candidates.length === 0) {
    return [];
  }

  const prices = candidates.map((candidate) => candidate.pricePerLiter);
  const detourTimes = candidates.map((candidate) => candidate.estimatedExtraTimeSeconds);

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minDetour = Math.min(...detourTimes);
  const maxDetour = Math.max(...detourTimes);

  const compromiseWeights = {
    price: options.compromiseWeights?.price ?? 0.35,
    detour: options.compromiseWeights?.detour ?? 0.65,
  };

  const weightedCandidates = candidates.map((candidate) => {
    const normalizedPrice = normalize(candidate.pricePerLiter, minPrice, maxPrice);
    const normalizedDetour = normalize(candidate.estimatedExtraTimeSeconds, minDetour, maxDetour);

    let score: number;

    if (options.strategy === 'CHEAPEST') {
      score = normalizedPrice;
    } else if (options.strategy === 'MINIMAL_DETOUR') {
      score = normalizedDetour;
    } else {
      const epsilon = 1e-6;
      score =
        Math.pow(normalizedPrice + epsilon, compromiseWeights.price) *
        Math.pow(normalizedDetour + epsilon, compromiseWeights.detour);
    }

    return {
      ...candidate,
      score,
    };
  });

  const limit = options.limit ?? 3;

  return weightedCandidates
    .sort((left, right) => {
      if (left.score !== right.score) {
        return left.score - right.score;
      }

      if (left.pricePerLiter !== right.pricePerLiter) {
        return left.pricePerLiter - right.pricePerLiter;
      }

      if (left.estimatedExtraTimeSeconds !== right.estimatedExtraTimeSeconds) {
        return left.estimatedExtraTimeSeconds - right.estimatedExtraTimeSeconds;
      }

      return left.stationName.localeCompare(right.stationName);
    })
    .slice(0, limit);
};
