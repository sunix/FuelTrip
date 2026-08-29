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
