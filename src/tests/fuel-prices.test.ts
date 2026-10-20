import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenDataFuelStationProvider } from '../api/fuel-prices';
import {
  buildOpenDataResponse,
  openDataRecordWithFields,
  openDataRecordWithGeom,
  openDataRecordWithoutCoordinates,
  openDataRecordWithoutGeom,
} from './fixtures/open-data-records';
import { parisLilleFixtureRoute } from './fixtures/paris-lille';

const BASE_URL = 'https://open-data.test/records';

const stubFetch = (payload: unknown): ReturnType<typeof vi.fn> => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(payload),
  });

  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('OpenDataFuelStationProvider coordinates', () => {
  it('reads decimal degrees from geom rather than the PTV scalars', async () => {
    stubFetch(buildOpenDataResponse([openDataRecordWithGeom]));

    const stations = await new OpenDataFuelStationProvider(BASE_URL).getStations(
      parisLilleFixtureRoute,
      'E10',
    );

    expect(stations).toHaveLength(1);
    expect(stations[0].latitude).toBeCloseTo(43.773, 5);
    expect(stations[0].longitude).toBeCloseTo(-0.567, 5);
  });

  it('rescales PTV scalars when the record carries no geo object', async () => {
    stubFetch(buildOpenDataResponse([openDataRecordWithoutGeom]));

    const stations = await new OpenDataFuelStationProvider(BASE_URL).getStations(
      parisLilleFixtureRoute,
      'E10',
    );

    expect(stations[0].latitude).toBeCloseTo(46.7535, 3);
    expect(stations[0].longitude).toBeCloseTo(3.1407, 3);
  });

  it('keeps decimal coordinates nested under the legacy fields wrapper', async () => {
    stubFetch(buildOpenDataResponse([openDataRecordWithFields]));

    const stations = await new OpenDataFuelStationProvider(BASE_URL).getStations(
      parisLilleFixtureRoute,
      'E10',
    );

    expect(stations[0].latitude).toBeCloseTo(49.7, 5);
    expect(stations[0].longitude).toBeCloseTo(2.85, 5);
    expect(stations[0].prices).toContainEqual(
      expect.objectContaining({ fuel: 'E10', price: 1.879 }),
    );
  });

  it('drops records without usable coordinates', async () => {
    stubFetch(buildOpenDataResponse([openDataRecordWithoutCoordinates]));

    const stations = await new OpenDataFuelStationProvider(BASE_URL).getStations(
      parisLilleFixtureRoute,
      'E10',
    );

    expect(stations).toEqual([]);
  });
});
