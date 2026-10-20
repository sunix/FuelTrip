export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface Route {
  distanceMeters: number;
  durationSeconds: number;
  polyline?: string;
  points: GeoPoint[];
}

export interface Location {
  label: string;
  point?: GeoPoint;
}

// Google rejects a "lat, lon" pair sent as an address waypoint with
// INVALID_ARGUMENT, so coordinates typed by hand have to be recognised here
// and travel as a latLng waypoint, exactly like the geolocation button does.
const COORDINATE_PAIR_PATTERN = /^(-?\d{1,3}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)$/;

export const parseGeoPoint = (value: string): GeoPoint | undefined => {
  const match = COORDINATE_PAIR_PATTERN.exec(value.trim());
  if (!match) {
    return undefined;
  }

  const latitude = Number(match[1]);
  const longitude = Number(match[2]);

  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return undefined;
  }

  return { latitude, longitude };
};
