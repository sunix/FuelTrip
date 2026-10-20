// Shapes captured from the live open data feed
// (prix-des-carburants-en-france-flux-instantane-v2): scalar `latitude` and
// `longitude` are PTV strings, `geom` holds the decimal degrees, and there is
// no brand column.
export const openDataRecordWithGeom = {
  id: 40500002,
  latitude: '4377300',
  longitude: '-56700',
  geom: { lon: -0.567, lat: 43.773 },
  adresse: 'Route de Mont de Marsan',
  ville: 'Saint-Sever',
  e10_prix: 2.149,
  e10_maj: '2026-10-19T08:12:00+02:00',
  gazole_prix: 2.399,
};

export const openDataRecordWithoutGeom = {
  id: 58240003,
  latitude: '4675351.71497',
  longitude: '314069.121289',
  adresse: 'ROUTE NATIONALE 7 - LES BOULAISES',
  ville: 'Chantenay-Saint-Imbert',
  e10_prix: 1.99,
  gazole_prix: 2.25,
};

// Older ODS endpoints nest the columns under `fields` and already expose
// decimal degrees.
export const openDataRecordWithFields = {
  recordid: 'legacy-shape',
  fields: {
    latitude: 49.7,
    longitude: 2.85,
    enseigne: 'Total Access',
    ville: 'Roye',
    e10_prix: '1,879',
  },
};

export const openDataRecordWithoutCoordinates = {
  id: 'no-coordinates',
  ville: 'Nulle Part',
  e10_prix: 1.75,
};

export const buildOpenDataResponse = (results: unknown[], totalCount = results.length) => ({
  total_count: totalCount,
  results,
});
