import type { Route } from '../domain/route';
import type { Station } from '../domain/station';

export const parisLilleRoute: Route = {
  distanceMeters: 225_000,
  durationSeconds: 8_400,
  points: [
    { latitude: 48.8566, longitude: 2.3522 },
    { latitude: 49.02, longitude: 2.46 },
    { latitude: 49.18, longitude: 2.58 },
    { latitude: 49.32, longitude: 2.72 },
    { latitude: 49.5, longitude: 2.84 },
    { latitude: 49.72, longitude: 2.98 },
    { latitude: 50.02, longitude: 3.08 },
    { latitude: 50.28, longitude: 3.17 },
    { latitude: 50.48, longitude: 3.32 },
    { latitude: 50.6292, longitude: 3.0573 },
  ],
};

export const mockStations: Station[] = [
  {
    id: 'carrefour-arras',
    name: 'Carrefour Arras',
    latitude: 50.2809,
    longitude: 2.776,
    prices: [
      { fuel: 'E10', price: 1.679, updatedAt: '2026-08-24T08:00:00Z' },
      { fuel: 'DIESEL', price: 1.699, updatedAt: '2026-08-24T08:00:00Z' },
    ],
  },
  {
    id: 'leclerc-cambrai',
    name: 'Leclerc Cambrai',
    latitude: 50.158, longitude: 3.24,
    prices: [
      { fuel: 'E10', price: 1.629, updatedAt: '2026-08-24T08:00:00Z' },
      { fuel: 'DIESEL', price: 1.659, updatedAt: '2026-08-24T08:00:00Z' },
    ],
  },
  {
    id: 'total-saint-quentin',
    name: 'TotalEnergies Saint-Quentin',
    latitude: 49.85,
    longitude: 3.29,
    prices: [
      { fuel: 'E10', price: 1.759, updatedAt: '2026-08-24T08:00:00Z' },
      { fuel: 'SP98', price: 1.869, updatedAt: '2026-08-24T08:00:00Z' },
    ],
  },
  {
    id: 'auchan-peronne',
    name: 'Auchan Péronne',
    latitude: 49.9403,
    longitude: 2.9325,
    prices: [
      { fuel: 'E10', price: 1.665, updatedAt: '2026-08-24T08:00:00Z' },
      { fuel: 'SP95', price: 1.7, updatedAt: '2026-08-24T08:00:00Z' },
    ],
  },
  {
    id: 'intermarche-roye',
    name: 'Intermarché Roye',
    latitude: 49.7004,
    longitude: 2.7909,
    prices: [
      { fuel: 'E10', price: 1.649, updatedAt: '2026-08-24T08:00:00Z' },
      { fuel: 'E85', price: 0.889, updatedAt: '2026-08-24T08:00:00Z' },
    ],
  },
  {
    id: 'esso-clermont',
    name: 'Esso Clermont',
    latitude: 49.3757,
    longitude: 2.426,
    prices: [
      { fuel: 'E10', price: 1.72, updatedAt: '2026-08-24T08:00:00Z' },
      { fuel: 'LPG', price: 0.995, updatedAt: '2026-08-24T08:00:00Z' },
    ],
  },
  {
    id: 'bp-senlis',
    name: 'BP Senlis',
    latitude: 49.2044,
    longitude: 2.5844,
    prices: [
      { fuel: 'E10', price: 1.735, updatedAt: '2026-08-24T08:00:00Z' },
      { fuel: 'SP98', price: 1.85, updatedAt: '2026-08-24T08:00:00Z' },
    ],
  },
  {
    id: 'station-hors-corridor',
    name: 'Station Très éloignée',
    latitude: 49.45,
    longitude: 1.15,
    prices: [{ fuel: 'E10', price: 1.49, updatedAt: '2026-08-24T08:00:00Z' }],
  },
  {
    id: 'station-sans-e10',
    name: 'Station sans E10',
    latitude: 50.121,
    longitude: 2.919,
    prices: [{ fuel: 'DIESEL', price: 1.63, updatedAt: '2026-08-24T08:00:00Z' }],
  },
  {
    id: 'lpg-lille',
    name: 'GPL Lille Centre',
    latitude: 50.6321,
    longitude: 3.0636,
    prices: [{ fuel: 'LPG', price: 1.029, updatedAt: '2026-08-24T08:00:00Z' }],
  },
];
