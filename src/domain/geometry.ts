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
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
};

const projectToPlaneMeters = (point: GeoPoint, referenceLatitudeDeg: number): { x: number; y: number } => {
  const latitudeRad = toRadians(point.latitude);
  const longitudeRad = toRadians(point.longitude);
  const referenceLatitudeRad = toRadians(referenceLatitudeDeg);

  return {
    x: EARTH_RADIUS_METERS * longitudeRad * Math.cos(referenceLatitudeRad),
    y: EARTH_RADIUS_METERS * latitudeRad,
  };
};

export const distancePointToSegmentMeters = (point: GeoPoint, segmentStart: GeoPoint, segmentEnd: GeoPoint): number => {
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
