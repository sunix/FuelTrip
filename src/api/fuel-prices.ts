import type { FuelType } from '../domain/fuel';
import { ALL_FUEL_TYPES } from '../domain/fuel';
import type { Route } from '../domain/route';
import type { FuelPrice, Station } from '../domain/station';
import type { FuelStationProvider } from '../services/station-service';

interface OpenDataRecord {
  id?: string;
  recordid?: string;
  fields?: Record<string, unknown>;
  [key: string]: unknown;
}

interface OpenDataResponse {
  results?: OpenDataRecord[];
  records?: OpenDataRecord[];
}

const FUEL_FIELD_CANDIDATES: Record<FuelType, string[]> = {
  DIESEL: ['gazole_prix', 'prix_gazole', 'price_gazole'],
  SP95: ['sp95_prix', 'prix_sp95', 'price_sp95'],
  SP98: ['sp98_prix', 'prix_sp98', 'price_sp98'],
  E10: ['e10_prix', 'sp95_e10_prix', 'prix_e10', 'price_e10'],
  E85: ['e85_prix', 'prix_e85', 'price_e85'],
  LPG: ['gplc_prix', 'prix_gplc', 'price_gplc', 'prix_gpl'],
};

const UPDATED_AT_FIELD_CANDIDATES = ['maj', 'updated_at', 'date_maj', 'last_update'];
const NAME_FIELD_CANDIDATES = ['enseigne', 'nom', 'name'];
const LAT_FIELD_CANDIDATES = ['latitude', 'lat'];
const LON_FIELD_CANDIDATES = ['longitude', 'lon', 'lng'];

const asRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>;
  }

  return {};
};

const readNumberField = (record: Record<string, unknown>, candidates: string[]): number | undefined => {
  for (const candidate of candidates) {
    const rawValue = record[candidate];
    if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
      return rawValue;
    }
    if (typeof rawValue === 'string') {
      const normalized = Number(rawValue.replace(',', '.'));
      if (Number.isFinite(normalized)) {
        return normalized;
      }
    }
  }

  return undefined;
};

const readStringField = (record: Record<string, unknown>, candidates: string[]): string | undefined => {
  for (const candidate of candidates) {
    const rawValue = record[candidate];
    if (typeof rawValue === 'string' && rawValue.trim().length > 0) {
      return rawValue;
    }
  }

  return undefined;
};

const extractFuelPrices = (record: Record<string, unknown>): FuelPrice[] => {
  const updatedAt =
    readStringField(record, UPDATED_AT_FIELD_CANDIDATES) ?? new Date().toISOString();

  return ALL_FUEL_TYPES.flatMap((fuelType) => {
    const price = readNumberField(record, FUEL_FIELD_CANDIDATES[fuelType]);
    if (price === undefined) {
      return [];
    }

    return [{ fuel: fuelType, price, updatedAt } satisfies FuelPrice];
  });
};

export class OpenDataFuelStationProvider implements FuelStationProvider {
  constructor(private readonly baseUrl: string) {}

  async getStations(_route: Route, _fuelType: FuelType): Promise<Station[]> {
    const query = new URL(this.baseUrl);
    query.searchParams.set('limit', '100');

    const response = await fetch(query.toString());
    if (!response.ok) {
      throw new Error(`Fuel price API error: ${response.status}`);
    }

    const payload = (await response.json()) as OpenDataResponse;
    const records = payload.results ?? payload.records ?? [];

    return records
      .map((rawRecord, index) => {
        const root = asRecord(rawRecord);
        const fields = asRecord(root.fields);
        const mergedRecord = { ...root, ...fields };

        const latitude = readNumberField(mergedRecord, LAT_FIELD_CANDIDATES);
        const longitude = readNumberField(mergedRecord, LON_FIELD_CANDIDATES);

        if (latitude === undefined || longitude === undefined) {
          return undefined;
        }

        const prices = extractFuelPrices(mergedRecord);
        if (prices.length === 0) {
          return undefined;
        }

        return {
          id: String(root.id ?? root.recordid ?? index),
          name: readStringField(mergedRecord, NAME_FIELD_CANDIDATES) ?? `Station ${index + 1}`,
          latitude,
          longitude,
          prices,
        } satisfies Station;
      })
      .filter((station): station is Station => Boolean(station));
  }
}
