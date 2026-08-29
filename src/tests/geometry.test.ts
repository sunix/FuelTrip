import { describe, expect, it } from 'vitest';
import {
  distancePointToPolylineMeters,
  filterStationsNearRoute,
  haversineDistanceMeters,
} from '../domain/geometry';
import { fixtureStations, parisLilleFixtureRoute } from './fixtures/paris-lille';

describe('geometry helpers', () => {
  it('computes haversine distance with realistic values', () => {
    const paris = { latitude: 48.8566, longitude: 2.3522 };
    const lille = { latitude: 50.6292, longitude: 3.0573 };

    const distance = haversineDistanceMeters(paris, lille);

    expect(distance).toBeGreaterThan(200_000);
    expect(distance).toBeLessThan(210_000);
  });

  it('computes point-to-polyline distance and excludes very far stations', () => {
    const farPoint = { latitude: 49.45, longitude: 1.2 };
    const closePoint = { latitude: 49.94, longitude: 2.93 };

    expect(distancePointToPolylineMeters(farPoint, parisLilleFixtureRoute.points)).toBeGreaterThan(50_000);
    expect(distancePointToPolylineMeters(closePoint, parisLilleFixtureRoute.points)).toBeLessThan(5_000);
  });

  it('filters stations around the route with configurable radius', () => {
    const nearStations = filterStationsNearRoute(
      fixtureStations,
      parisLilleFixtureRoute.points,
      8_000,
    );

    expect(nearStations.some((station) => station.id === 'very-far')).toBe(false);
    expect(nearStations.length).toBeGreaterThan(5);
  });
});
