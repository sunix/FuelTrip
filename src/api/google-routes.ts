import type { GeoPoint, Location, Route } from '../domain/route';
import type { RouteProvider } from '../services/route-service';

interface GoogleRouteResponse {
  routes?: Array<{
    distanceMeters?: number;
    duration?: string;
    polyline?: {
      encodedPolyline?: string;
    };
  }>;
}

const decodeGooglePolyline = (encodedPolyline: string): GeoPoint[] => {
  const points: GeoPoint[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encodedPolyline.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encodedPolyline.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLatitude = result & 1 ? ~(result >> 1) : result >> 1;
    latitude += deltaLatitude;

    shift = 0;
    result = 0;

    do {
      byte = encodedPolyline.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLongitude = result & 1 ? ~(result >> 1) : result >> 1;
    longitude += deltaLongitude;

    points.push({
      latitude: latitude / 1e5,
      longitude: longitude / 1e5,
    });
  }

  return points;
};

const parseDurationSeconds = (duration: string | undefined): number => {
  if (!duration) {
    return 0;
  }

  return Number(duration.replace('s', ''));
};

type Waypoint = { location: { latLng: { latitude: number; longitude: number } } } | { address: string };

const locationToWaypoint = (location: Location): Waypoint => {
  if (location.point) {
    return {
      location: {
        latLng: {
          latitude: location.point.latitude,
          longitude: location.point.longitude,
        },
      },
    };
  }

  const address = location.label.trim();
  if (!address) {
    throw new Error('GoogleRouteProvider requires either coordinates or an address for origin and destination.');
  }

  return { address };
};

export class GoogleRouteProvider implements RouteProvider {
  constructor(private readonly apiKey: string) {}

  async calculateRoute(origin: Location, destination: Location): Promise<Route> {
    if (!this.apiKey) {
      throw new Error('Google Maps API key is missing. Configure VITE_GOOGLE_MAPS_API_KEY.');
    }

    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
        'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline',
      },
      body: JSON.stringify({
        origin: locationToWaypoint(origin),
        destination: locationToWaypoint(destination),
        travelMode: 'DRIVE',
      }),
    });

    if (!response.ok) {
      throw new Error(`Google Routes error: ${response.status}`);
    }

    const payload = (await response.json()) as GoogleRouteResponse;
    const selectedRoute = payload.routes?.[0];

    if (!selectedRoute?.polyline?.encodedPolyline) {
      throw new Error('Google Routes response did not include a polyline.');
    }

    return {
      distanceMeters: selectedRoute.distanceMeters ?? 0,
      durationSeconds: parseDurationSeconds(selectedRoute.duration),
      polyline: selectedRoute.polyline.encodedPolyline,
      points: decodeGooglePolyline(selectedRoute.polyline.encodedPolyline),
    };
  }
}
