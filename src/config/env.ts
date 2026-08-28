export interface AppConfig {
  googleMapsApiKey: string;
  maxDistanceFromRouteMeters: number;
  fuelApiBaseUrl: string;
}

export const appConfig: AppConfig = {
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '',
  maxDistanceFromRouteMeters: Number(import.meta.env.VITE_MAX_DISTANCE_FROM_ROUTE_METERS ?? 3000),
  fuelApiBaseUrl:
    import.meta.env.VITE_FUEL_API_BASE_URL ??
    'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records',
};
