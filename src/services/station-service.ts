import type { FuelType } from '../domain/fuel';
import type { Route } from '../domain/route';
import type { Station } from '../domain/station';

export interface FuelStationProvider {
  getStations(route: Route, fuelType: FuelType): Promise<Station[]>;
}

export class StationService {
  constructor(private readonly provider: FuelStationProvider) {}

  getStations(route: Route, fuelType: FuelType): Promise<Station[]> {
    return this.provider.getStations(route, fuelType);
  }
}
