import type { Location, Route } from '../domain/route';

export interface RouteProvider {
  calculateRoute(origin: Location, destination: Location): Promise<Route>;
}

export class RouteService {
  constructor(private readonly provider: RouteProvider) {}

  calculateRoute(origin: Location, destination: Location): Promise<Route> {
    return this.provider.calculateRoute(origin, destination);
  }
}
