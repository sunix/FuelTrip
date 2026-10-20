import type { GeoPoint } from './route';
import type { Station } from './station';

const EARTH_RADIUS_METERS = 6_371_000;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

export const haversineDistanceMeters = (from: GeoPoint, to: GeoPoint): number => {
  const fromLat = toRadians(from.latitude);
  const toLat = toRadians(to.latitude);
  const deltaLat = toLat - fromLat;
  const deltaLon = toRadians(to.longitude - from.longitude);

  const a =
    Math.sin(deltaLat / 2) ** 2 + Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
};

const projectToPlaneMeters = (
  point: GeoPoint,
  referenceLatitudeDeg: number,
): { x: number; y: number } => {
  const latitudeRad = toRadians(point.latitude);
  const longitudeRad = toRadians(point.longitude);
  const referenceLatitudeRad = toRadians(referenceLatitudeDeg);

  return {
    x: EARTH_RADIUS_METERS * longitudeRad * Math.cos(referenceLatitudeRad),
    y: EARTH_RADIUS_METERS * latitudeRad,
  };
};

export interface BoundingBox {
  minLatitude: number;
  minLongitude: number;
  maxLatitude: number;
  maxLongitude: number;
}

const METERS_PER_DEGREE_LATITUDE = (Math.PI * EARTH_RADIUS_METERS) / 180;

// Guards the meridian convergence near the poles, where a degree of longitude
// shrinks to nothing and the padding would otherwise explode.
const MIN_LONGITUDE_SCALE = 0.01;

const metersPerDegreeLongitude = (latitudeDegrees: number): number =>
  METERS_PER_DEGREE_LATITUDE * Math.max(Math.cos(toRadians(latitudeDegrees)), MIN_LONGITUDE_SCALE);

const boxFromPoint = (point: GeoPoint): BoundingBox => ({
  minLatitude: point.latitude,
  minLongitude: point.longitude,
  maxLatitude: point.latitude,
  maxLongitude: point.longitude,
});

const extendBox = (box: BoundingBox, point: GeoPoint): BoundingBox => ({
  minLatitude: Math.min(box.minLatitude, point.latitude),
  minLongitude: Math.min(box.minLongitude, point.longitude),
  maxLatitude: Math.max(box.maxLatitude, point.latitude),
  maxLongitude: Math.max(box.maxLongitude, point.longitude),
});

const boxSpanMeters = (box: BoundingBox): number => {
  const centerLatitude = (box.minLatitude + box.maxLatitude) / 2;

  return Math.max(
    (box.maxLatitude - box.minLatitude) * METERS_PER_DEGREE_LATITUDE,
    (box.maxLongitude - box.minLongitude) * metersPerDegreeLongitude(centerLatitude),
  );
};

const padBox = (box: BoundingBox, paddingMeters: number): BoundingBox => {
  const latitudePadding = paddingMeters / METERS_PER_DEGREE_LATITUDE;
  const longitudePadding =
    paddingMeters / metersPerDegreeLongitude((box.minLatitude + box.maxLatitude) / 2);

  return {
    minLatitude: box.minLatitude - latitudePadding,
    minLongitude: box.minLongitude - longitudePadding,
    maxLatitude: box.maxLatitude + latitudePadding,
    maxLongitude: box.maxLongitude + longitudePadding,
  };
};

// Splits a route into overlapping bounding boxes so station lookups can be
// restricted to the corridor the driver actually follows. Each box is padded
// by the search radius, and a new box restarts on the previous point so every
// segment stays fully inside at least one box.
export const buildRouteBoundingBoxes = (
  polyline: GeoPoint[],
  paddingMeters: number,
  maxSpanMeters: number,
): BoundingBox[] => {
  if (polyline.length === 0) {
    return [];
  }

  const boxes: BoundingBox[] = [];
  let currentBox = boxFromPoint(polyline[0]);

  for (let index = 1; index < polyline.length; index += 1) {
    const extendedBox = extendBox(currentBox, polyline[index]);

    if (boxSpanMeters(extendedBox) > maxSpanMeters) {
      boxes.push(currentBox);
      currentBox = extendBox(boxFromPoint(polyline[index - 1]), polyline[index]);
    } else {
      currentBox = extendedBox;
    }
  }

  boxes.push(currentBox);

  return boxes.map((box) => padBox(box, paddingMeters));
};

export const distancePointToSegmentMeters = (
  point: GeoPoint,
  segmentStart: GeoPoint,
  segmentEnd: GeoPoint,
): number => {
  if (
    segmentStart.latitude === segmentEnd.latitude &&
    segmentStart.longitude === segmentEnd.longitude
  ) {
    return haversineDistanceMeters(point, segmentStart);
  }

  const referenceLatitude = (point.latitude + segmentStart.latitude + segmentEnd.latitude) / 3;
  const projectedPoint = projectToPlaneMeters(point, referenceLatitude);
  const projectedStart = projectToPlaneMeters(segmentStart, referenceLatitude);
  const projectedEnd = projectToPlaneMeters(segmentEnd, referenceLatitude);

  const segmentVectorX = projectedEnd.x - projectedStart.x;
  const segmentVectorY = projectedEnd.y - projectedStart.y;
  const segmentLengthSquared = segmentVectorX ** 2 + segmentVectorY ** 2;

  const projectionNumerator =
    (projectedPoint.x - projectedStart.x) * segmentVectorX +
    (projectedPoint.y - projectedStart.y) * segmentVectorY;

  const projection = Math.max(0, Math.min(1, projectionNumerator / segmentLengthSquared));

  const closestX = projectedStart.x + segmentVectorX * projection;
  const closestY = projectedStart.y + segmentVectorY * projection;

  return Math.hypot(projectedPoint.x - closestX, projectedPoint.y - closestY);
};

export const distancePointToPolylineMeters = (point: GeoPoint, polyline: GeoPoint[]): number => {
  if (polyline.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  if (polyline.length === 1) {
    return haversineDistanceMeters(point, polyline[0]);
  }

  return polyline.slice(1).reduce((minimumDistance, currentPoint, index) => {
    const previousPoint = polyline[index];
    const distance = distancePointToSegmentMeters(point, previousPoint, currentPoint);
    return Math.min(minimumDistance, distance);
  }, Number.POSITIVE_INFINITY);
};

export const filterStationsNearRoute = (
  stations: Station[],
  polyline: GeoPoint[],
  maxDistanceFromRouteMeters: number,
): Array<Station & { distanceFromRouteMeters: number }> =>
  stations
    .map((station) => {
      const distanceFromRouteMeters = distancePointToPolylineMeters(
        { latitude: station.latitude, longitude: station.longitude },
        polyline,
      );

      return { ...station, distanceFromRouteMeters };
    })
    .filter((station) => station.distanceFromRouteMeters <= maxDistanceFromRouteMeters);
