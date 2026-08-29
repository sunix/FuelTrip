import type { FuelType } from './fuel';

export interface FuelPrice {
  fuel: FuelType;
  price: number;
  updatedAt: string;
}

export interface Station {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  prices: FuelPrice[];
}

export const getFuelPrice = (station: Station, fuel: FuelType): FuelPrice | undefined =>
  station.prices.find((price) => price.fuel === fuel);
