import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenDataFuelStationProvider } from '../api/fuel-prices';
import { buildRouteBoundingBoxes } from '../domain/geometry';
import {
  buildOpenDataResponse,
  openDataRecordWithFields,
  openDataRecordWithGeom,
  openDataRecordWithoutCoordinates,
  openDataRecordWithoutGeom,
} from './fixtures/open-data-records';
import { parisLilleFixtureRoute } from './fixtures/paris-lille';

const BASE_URL = 'https://open-data.test/records';
const SEARCH_RADIUS_METERS = 3_000;

const createProvider = (): OpenDataFuelStationProvider =>
  new OpenDataFuelStationProvider(BASE_URL, SEARCH_RADIUS_METERS);

const whereClauseOf = (call: unknown[]): string =>
  new URL(String(call[0])).searchParams.get('where') ?? '';

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

    const stations = await createProvider().getStations(parisLilleFixtureRoute, 'E10');

    expect(stations).toHaveLength(1);
    expect(stations[0].latitude).toBeCloseTo(43.773, 5);
    expect(stations[0].longitude).toBeCloseTo(-0.567, 5);
  });

  it('rescales PTV scalars when the record carries no geo object', async () => {
    stubFetch(buildOpenDataResponse([openDataRecordWithoutGeom]));

    const stations = await createProvider().getStations(parisLilleFixtureRoute, 'E10');

    expect(stations[0].latitude).toBeCloseTo(46.7535, 3);
    expect(stations[0].longitude).toBeCloseTo(3.1407, 3);
  });

  it('keeps decimal coordinates nested under the legacy fields wrapper', async () => {
    stubFetch(buildOpenDataResponse([openDataRecordWithFields]));

    const stations = await createProvider().getStations(parisLilleFixtureRoute, 'E10');

    expect(stations[0].latitude).toBeCloseTo(49.7, 5);
    expect(stations[0].longitude).toBeCloseTo(2.85, 5);
    expect(stations[0].prices).toContainEqual(
      expect.objectContaining({ fuel: 'E10', price: 1.879 }),
    );
  });

  it('drops records without usable coordinates', async () => {
    stubFetch(buildOpenDataResponse([openDataRecordWithoutCoordinates]));

    const stations = await createProvider().getStations(parisLilleFixtureRoute, 'E10');

    expect(stations).toEqual([]);
  });
});

describe('OpenDataFuelStationProvider naming', () => {
  it('names a station after its street and town', async () => {
    stubFetch(buildOpenDataResponse([openDataRecordWithGeom]));

    const stations = await createProvider().getStations(parisLilleFixtureRoute, 'E10');

    expect(stations[0].name).toBe('Route de Mont de Marsan, Saint-Sever');
  });

  it('title-cases addresses published in full uppercase', async () => {
    stubFetch(buildOpenDataResponse([openDataRecordWithoutGeom]));

    const stations = await createProvider().getStations(parisLilleFixtureRoute, 'E10');

    expect(stations[0].name).toBe('Route Nationale 7 - Les Boulaises, Chantenay-Saint-Imbert');
  });

  it('prefers a brand column when the source exposes one', async () => {
    stubFetch(buildOpenDataResponse([openDataRecordWithFields]));

    const stations = await createProvider().getStations(parisLilleFixtureRoute, 'E10');

    expect(stations[0].name).toBe('Total Access, Roye');
  });

  it('falls back to a generic label when nothing identifies the station', async () => {
    stubFetch(
      buildOpenDataResponse([{ id: 'anonymous', geom: { lat: 49.7, lon: 2.85 }, e10_prix: 1.72 }]),
    );

    const stations = await createProvider().getStations(parisLilleFixtureRoute, 'E10');

    expect(stations[0].name).toBe('Station 1');
  });
});

describe('OpenDataFuelStationProvider route filtering', () => {
  it('queries a bounding box per route chunk, restricted to the requested fuel', async () => {
    const fetchMock = stubFetch(buildOpenDataResponse([openDataRecordWithGeom]));

    await createProvider().getStations(parisLilleFixtureRoute, 'DIESEL');

    const expectedBoxCount = buildRouteBoundingBoxes(
      parisLilleFixtureRoute.points,
      SEARCH_RADIUS_METERS,
      60_000,
    ).length;

    expect(expectedBoxCount).toBeGreaterThan(1);
    expect(fetchMock).toHaveBeenCalledTimes(expectedBoxCount);
    fetchMock.mock.calls.forEach((call) => {
      expect(whereClauseOf(call)).toMatch(
        /^in_bbox\(geom, -?\d+\.\d+, -?\d+\.\d+, -?\d+\.\d+, -?\d+\.\d+\) and gazole_prix is not null$/,
      );
    });
  });

  it('deduplicates stations returned by two overlapping boxes', async () => {
    stubFetch(buildOpenDataResponse([openDataRecordWithGeom]));

    const stations = await createProvider().getStations(parisLilleFixtureRoute, 'E10');

    expect(stations).toHaveLength(1);
  });

  it('pages through a box until the feed reports every record', async () => {
    const firstPage = Array.from({ length: 100 }, (_unused, index) => ({
      id: `page-1-${index}`,
      geom: { lat: 48.8 + index / 1000, lon: 2.3 },
      e10_prix: 1.8,
    }));
    const secondPage = [{ id: 'page-2-0', geom: { lat: 48.9, lon: 2.4 }, e10_prix: 1.7 }];

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(buildOpenDataResponse(firstPage, 101)),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(buildOpenDataResponse(secondPage, 101)),
      });
    vi.stubGlobal('fetch', fetchMock);

    const singlePointRoute = {
      ...parisLilleFixtureRoute,
      points: [{ latitude: 48.8566, longitude: 2.3522 }],
    };
    const stations = await createProvider().getStations(singlePointRoute, 'E10');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(new URL(String(fetchMock.mock.calls[1][0])).searchParams.get('offset')).toBe('100');
    expect(stations).toHaveLength(101);
  });

  it('does not call the feed when the route carries no geometry', async () => {
    const fetchMock = stubFetch(buildOpenDataResponse([openDataRecordWithGeom]));

    const stations = await createProvider().getStations(
      { ...parisLilleFixtureRoute, points: [] },
      'E10',
    );

    expect(stations).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces the feed's own error message", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Invalid value for limit API parameter' }),
      }),
    );

    await expect(createProvider().getStations(parisLilleFixtureRoute, 'E10')).rejects.toThrow(
      'Invalid value for limit API parameter',
    );
  });
});
