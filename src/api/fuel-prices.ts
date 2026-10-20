import type { FuelType } from '../domain/fuel';
import { ALL_FUEL_TYPES } from '../domain/fuel';
import type { BoundingBox } from '../domain/geometry';
import { buildRouteBoundingBoxes } from '../domain/geometry';
import type { GeoPoint, Route } from '../domain/route';
import type { FuelPrice, Station } from '../domain/station';
import type { FuelStationProvider } from '../services/station-service';

interface OpenDataRecord {
  id?: string;
  recordid?: string;
  fields?: Record<string, unknown>;
  [key: string]: unknown;
}

interface OpenDataResponse {
  total_count?: number;
  results?: OpenDataRecord[];
  records?: OpenDataRecord[];
}

interface OpenDataErrorResponse {
  message?: string;
  error_code?: string;
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
const NAME_FIELD_CANDIDATES = ['enseigne', 'nom', 'name', 'brand'];
const ADDRESS_FIELD_CANDIDATES = ['adresse', 'address'];
const CITY_FIELD_CANDIDATES = ['ville', 'city', 'commune'];
const LAT_FIELD_CANDIDATES = ['latitude', 'lat'];
const LON_FIELD_CANDIDATES = ['longitude', 'lon', 'lng'];
const GEO_FIELD_CANDIDATES = ['geom', 'geo_point_2d', 'geopoint', 'coordonnees'];

const MAX_LATITUDE_DEGREES = 90;
const MAX_LONGITUDE_DEGREES = 180;

// The feed publishes `latitude`/`longitude` as PTV units (decimal degrees
// multiplied by 100000, as strings) while `geom` carries plain decimal
// degrees. Reading the scalars as-is placed every station 100000x away from
// the route, so nothing ever passed the near-route filter.
const PTV_UNITS_PER_DEGREE = 100_000;

// The API caps a page at 100 records out of ~10000 stations nationwide, so the
// corridor has to be narrowed server-side rather than paged through blindly.
const GEO_QUERY_FIELD = 'geom';
const MAX_RECORDS_PER_PAGE = 100;
const MAX_PAGES_PER_BOX = 10;
const ROUTE_BOX_SPAN_METERS = 60_000;
const QUERY_COORDINATE_PRECISION = 5;

const asRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>;
  }

  return {};
};

const readNumberField = (
  record: Record<string, unknown>,
  candidates: string[],
): number | undefined => {
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

const readStringField = (
  record: Record<string, unknown>,
  candidates: string[],
): string | undefined => {
  for (const candidate of candidates) {
    const rawValue = record[candidate];
    if (typeof rawValue === 'string' && rawValue.trim().length > 0) {
      return rawValue;
    }
  }

  return undefined;
};

const isValidCoordinate = (latitude: number, longitude: number): boolean =>
  Math.abs(latitude) <= MAX_LATITUDE_DEGREES && Math.abs(longitude) <= MAX_LONGITUDE_DEGREES;

const readGeoObjectPoint = (record: Record<string, unknown>): GeoPoint | undefined => {
  for (const candidate of GEO_FIELD_CANDIDATES) {
    const rawValue = record[candidate];
    if (!rawValue || typeof rawValue !== 'object') {
      continue;
    }

    // ODS exposes geo fields as `{ lat, lon }`, as a GeoJSON point whose
    // coordinates are `[longitude, latitude]`, or as a `[latitude, longitude]`
    // pair, depending on the dataset and the API version.
    const value = rawValue as Record<string, unknown> & { coordinates?: unknown };
    const pair = Array.isArray(rawValue)
      ? (rawValue as unknown[])
      : Array.isArray(value.coordinates)
        ? (value.coordinates as unknown[])
        : undefined;

    const latitude = pair
      ? Number(Array.isArray(rawValue) ? pair[0] : pair[1])
      : readNumberField(value, LAT_FIELD_CANDIDATES);
    const longitude = pair
      ? Number(Array.isArray(rawValue) ? pair[1] : pair[0])
      : readNumberField(value, LON_FIELD_CANDIDATES);

    if (
      latitude !== undefined &&
      longitude !== undefined &&
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      isValidCoordinate(latitude, longitude)
    ) {
      return { latitude, longitude };
    }
  }

  return undefined;
};

const readScalarPoint = (record: Record<string, unknown>): GeoPoint | undefined => {
  const rawLatitude = readNumberField(record, LAT_FIELD_CANDIDATES);
  const rawLongitude = readNumberField(record, LON_FIELD_CANDIDATES);

  if (rawLatitude === undefined || rawLongitude === undefined) {
    return undefined;
  }

  // Latitude decides the unit for both axes: a latitude outside [-90, 90] can
  // only be PTV, and a record never mixes the two units.
  const scale = Math.abs(rawLatitude) > MAX_LATITUDE_DEGREES ? PTV_UNITS_PER_DEGREE : 1;
  const latitude = rawLatitude / scale;
  const longitude = rawLongitude / scale;

  return isValidCoordinate(latitude, longitude) ? { latitude, longitude } : undefined;
};

const readStationPoint = (record: Record<string, unknown>): GeoPoint | undefined =>
  readGeoObjectPoint(record) ?? readScalarPoint(record);

// Addresses often come through in full uppercase ("ROUTE NATIONALE 7 - LES
// BOULAISES"); title-case those so the recommendation list stays readable.
const toDisplayCase = (value: string): string =>
  /\p{Ll}/u.test(value)
    ? value
    : value
        .toLocaleLowerCase('fr-FR')
        .replace(
          /(^|[\s'-])(\p{L})/gu,
          (_match, separator: string, letter: string) =>
            separator + letter.toLocaleUpperCase('fr-FR'),
        );

// The feed has no brand column, so a station is named after its street and
// town instead of the "Station 12" placeholder every record used to get.
const buildStationName = (record: Record<string, unknown>, index: number): string => {
  const street =
    readStringField(record, NAME_FIELD_CANDIDATES) ??
    readStringField(record, ADDRESS_FIELD_CANDIDATES);
  const city = readStringField(record, CITY_FIELD_CANDIDATES);

  const parts = [street, city]
    .filter((part): part is string => Boolean(part?.trim()))
    .map((part) => toDisplayCase(part.trim()));
  const uniqueParts = parts.filter(
    (part, position) =>
      parts.findIndex((other) => other.toLowerCase() === part.toLowerCase()) === position,
  );

  return uniqueParts.length > 0 ? uniqueParts.join(', ') : `Station ${index + 1}`;
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

const formatCoordinate = (value: number): string => value.toFixed(QUERY_COORDINATE_PRECISION);

const buildWhereClause = (box: BoundingBox, fuelType: FuelType): string => {
  const bbox = [box.minLatitude, box.minLongitude, box.maxLatitude, box.maxLongitude]
    .map(formatCoordinate)
    .join(', ');

  // Only stations that actually sell the requested fuel are worth a page slot.
  return `in_bbox(${GEO_QUERY_FIELD}, ${bbox}) and ${FUEL_FIELD_CANDIDATES[fuelType][0]} is not null`;
};

const toStation = (rawRecord: OpenDataRecord, index: number): Station | undefined => {
  const root = asRecord(rawRecord);
  const fields = asRecord(root.fields);
  const mergedRecord = { ...root, ...fields };

  const point = readStationPoint(mergedRecord);
  if (!point) {
    return undefined;
  }

  const prices = extractFuelPrices(mergedRecord);
  if (prices.length === 0) {
    return undefined;
  }

  return {
    // Overlapping boxes return the same station twice, and coordinates keep
    // the identity stable when the source exposes no id of its own.
    id: String(root.id ?? root.recordid ?? `${point.latitude},${point.longitude}`),
    name: buildStationName(mergedRecord, index),
    latitude: point.latitude,
    longitude: point.longitude,
    prices,
  } satisfies Station;
};

export class OpenDataFuelStationProvider implements FuelStationProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly searchRadiusMeters: number,
  ) {}

  async getStations(route: Route, fuelType: FuelType): Promise<Station[]> {
    const boxes = buildRouteBoundingBoxes(
      route.points,
      this.searchRadiusMeters,
      ROUTE_BOX_SPAN_METERS,
    );

    if (boxes.length === 0) {
      return [];
    }

    const recordsPerBox = await Promise.all(boxes.map((box) => this.fetchBox(box, fuelType)));

    const stationsById = new Map<string, Station>();
    recordsPerBox.flat().forEach((rawRecord, index) => {
      const station = toStation(rawRecord, index);
      if (station && !stationsById.has(station.id)) {
        stationsById.set(station.id, station);
      }
    });

    return [...stationsById.values()];
  }

  private async fetchBox(box: BoundingBox, fuelType: FuelType): Promise<OpenDataRecord[]> {
    const records: OpenDataRecord[] = [];

    for (let page = 0; page < MAX_PAGES_PER_BOX; page += 1) {
      const payload = await this.fetchPage(box, fuelType, page * MAX_RECORDS_PER_PAGE);
      const pageRecords = payload.results ?? payload.records ?? [];
      records.push(...pageRecords);

      const isLastPage =
        pageRecords.length < MAX_RECORDS_PER_PAGE ||
        (payload.total_count !== undefined && records.length >= payload.total_count);

      if (isLastPage) {
        break;
      }
    }

    return records;
  }

  private async fetchPage(
    box: BoundingBox,
    fuelType: FuelType,
    offset: number,
  ): Promise<OpenDataResponse> {
    const query = new URL(this.baseUrl);
    query.searchParams.set('limit', String(MAX_RECORDS_PER_PAGE));
    query.searchParams.set('offset', String(offset));
    query.searchParams.set('where', buildWhereClause(box, fuelType));

    const response = await fetch(query.toString());
    if (!response.ok) {
      const errorPayload = (await response.json().catch(() => undefined)) as
        OpenDataErrorResponse | undefined;

      throw new Error(`Fuel price API error: ${errorPayload?.message ?? String(response.status)}`);
    }

    return (await response.json()) as OpenDataResponse;
  }
}
