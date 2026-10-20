import { describe, expect, it } from 'vitest';
import {
  buildRouteBoundingBoxes,
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

    expect(distancePointToPolylineMeters(farPoint, parisLilleFixtureRoute.points)).toBeGreaterThan(
      50_000,
    );
    expect(distancePointToPolylineMeters(closePoint, parisLilleFixtureRoute.points)).toBeLessThan(
      5_000,
    );
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

describe('route bounding boxes', () => {
  const containsPoint = (
    box: { minLatitude: number; minLongitude: number; maxLatitude: number; maxLongitude: number },
    point: { latitude: number; longitude: number },
  ): boolean =>
    point.latitude >= box.minLatitude &&
    point.latitude <= box.maxLatitude &&
    point.longitude >= box.minLongitude &&
    point.longitude <= box.maxLongitude;

  it('splits a long route into several boxes that still cover every point', () => {
    const boxes = buildRouteBoundingBoxes(parisLilleFixtureRoute.points, 3_000, 60_000);

    expect(boxes.length).toBeGreaterThan(1);
    parisLilleFixtureRoute.points.forEach((point) => {
      expect(boxes.some((box) => containsPoint(box, point))).toBe(true);
    });
  });

  it('keeps consecutive boxes overlapping so no segment falls between them', () => {
    const boxes = buildRouteBoundingBoxes(parisLilleFixtureRoute.points, 0, 60_000);

    boxes.slice(1).forEach((box, index) => {
      const previousBox = boxes[index];
      expect(box.minLatitude).toBeLessThanOrEqual(previousBox.maxLatitude);
      expect(box.maxLatitude).toBeGreaterThanOrEqual(previousBox.minLatitude);
    });
  });

  it('pads each box by the search radius', () => {
    const [paddedBox] = buildRouteBoundingBoxes(
      [{ latitude: 48.8566, longitude: 2.3522 }],
      3_000,
      60_000,
    );

    expect(
      haversineDistanceMeters(
        { latitude: paddedBox.minLatitude, longitude: 2.3522 },
        { latitude: paddedBox.maxLatitude, longitude: 2.3522 },
      ),
    ).toBeCloseTo(6_000, -2);
  });

  it('returns no box for a route without geometry', () => {
    expect(buildRouteBoundingBoxes([], 3_000, 60_000)).toEqual([]);
  });
});
