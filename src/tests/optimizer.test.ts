import { describe, expect, it } from 'vitest';
import { optimizeFuelStops } from '../domain/optimizer';
import { fixtureStations, parisLilleFixtureRoute } from './fixtures/paris-lille';

describe('optimizeFuelStops', () => {
  it('best compromise is not always the absolute cheapest', () => {
    const cheapest = optimizeFuelStops(parisLilleFixtureRoute, fixtureStations, {
      fuelType: 'E10',
      strategy: 'CHEAPEST',
      maxDistanceFromRouteMeters: 15_000,
      limit: 1,
    })[0];

    const compromise = optimizeFuelStops(parisLilleFixtureRoute, fixtureStations, {
      fuelType: 'E10',
      strategy: 'BEST_COMPROMISE',
      maxDistanceFromRouteMeters: 15_000,
      limit: 1,
    })[0];

    expect(cheapest.stationId).toBe('slightly-far-cheap');
    expect(compromise.stationId).not.toBe('slightly-far-cheap');
  });

  it('can prefer slightly more expensive but significantly closer stations', () => {
    const compromise = optimizeFuelStops(parisLilleFixtureRoute, fixtureStations, {
      fuelType: 'E10',
      strategy: 'BEST_COMPROMISE',
      maxDistanceFromRouteMeters: 15_000,
      limit: 10,
    });

    const closePriceyIndex = compromise.findIndex(
      (station) => station.stationId === 'close-pricey',
    );
    const cheapFarIndex = compromise.findIndex(
      (station) => station.stationId === 'slightly-far-cheap',
    );

    expect(closePriceyIndex).toBeGreaterThan(-1);
    expect(cheapFarIndex).toBeGreaterThan(-1);
    expect(closePriceyIndex).toBeLessThan(cheapFarIndex);
  });

  it('does not collapse the compromise onto the minimal detour', () => {
    const options = {
      fuelType: 'E10',
      maxDistanceFromRouteMeters: 15_000,
      limit: 1,
    } as const;

    const compromise = optimizeFuelStops(parisLilleFixtureRoute, fixtureStations, {
      ...options,
      strategy: 'BEST_COMPROMISE',
    })[0];
    const minimalDetour = optimizeFuelStops(parisLilleFixtureRoute, fixtureStations, {
      ...options,
      strategy: 'MINIMAL_DETOUR',
    })[0];

    // The closest station is also the most expensive one of the fixture, so a
    // compromise that still picks it is ignoring the price entirely.
    expect(minimalDetour.stationId).toBe('close-pricey');
    expect(compromise.stationId).not.toBe('close-pricey');
  });

  it('weighs price against detour instead of ranking on one of them', () => {
    const [best] = optimizeFuelStops(parisLilleFixtureRoute, fixtureStations, {
      fuelType: 'E10',
      strategy: 'BEST_COMPROMISE',
      maxDistanceFromRouteMeters: 15_000,
      limit: 1,
    });

    // Neither the cheapest (23 km of detour) nor the closest (the dearest
    // litre): the station that is reasonable on both axes.
    expect(best.stationId).toBe('balanced');
  });

  it('ignores stations without the requested fuel', () => {
    const recommendations = optimizeFuelStops(parisLilleFixtureRoute, fixtureStations, {
      fuelType: 'SP98',
      strategy: 'CHEAPEST',
      maxDistanceFromRouteMeters: 15_000,
    });

    expect(recommendations.length).toBe(1);
    expect(recommendations[0].stationId).toBe('missing-fuel');
  });

  it('eliminates stations too far from the route', () => {
    const recommendations = optimizeFuelStops(parisLilleFixtureRoute, fixtureStations, {
      fuelType: 'E10',
      strategy: 'CHEAPEST',
      maxDistanceFromRouteMeters: 15_000,
      limit: 10,
    });

    expect(recommendations.some((station) => station.stationId === 'very-far')).toBe(false);
  });

  it('handles ties deterministically', () => {
    const tieOnlyStations = fixtureStations.filter((station) =>
      ['tie-a', 'tie-b'].includes(station.id),
    );

    const recommendations = optimizeFuelStops(parisLilleFixtureRoute, tieOnlyStations, {
      fuelType: 'E10',
      strategy: 'CHEAPEST',
      maxDistanceFromRouteMeters: 25_000,
      limit: 2,
    });

    expect(recommendations[0].stationName).toBe('Tie A');
    expect(recommendations[1].stationName).toBe('Tie B');
  });

  it('supports different fuel types', () => {
    const dieselRecommendations = optimizeFuelStops(parisLilleFixtureRoute, fixtureStations, {
      fuelType: 'DIESEL',
      strategy: 'CHEAPEST',
      maxDistanceFromRouteMeters: 20_000,
      limit: 1,
    });

    const lpgRecommendations = optimizeFuelStops(parisLilleFixtureRoute, fixtureStations, {
      fuelType: 'LPG',
      strategy: 'CHEAPEST',
      maxDistanceFromRouteMeters: 20_000,
      limit: 1,
    });

    expect(dieselRecommendations[0].stationId).toBe('diesel-value');
    expect(lpgRecommendations[0].stationId).toBe('lpg-only');
  });
});
