import type { Route } from '../../domain/route';
import type { Station } from '../../domain/station';

export const parisLilleFixtureRoute: Route = {
  distanceMeters: 225_000,
  durationSeconds: 8_400,
  points: [
    { latitude: 48.8566, longitude: 2.3522 },
    { latitude: 49.2, longitude: 2.55 },
    { latitude: 49.7, longitude: 2.85 },
    { latitude: 50.15, longitude: 3.06 },
    { latitude: 50.6292, longitude: 3.0573 },
  ],
};

export const fixtureStations: Station[] = [
  {
    id: 'close-pricey',
    name: 'Close but pricey',
    latitude: 49.708,
    longitude: 2.851,
    prices: [
      { fuel: 'E10', price: 1.74, updatedAt: '2026-08-24T08:00:00Z' },
      { fuel: 'DIESEL', price: 1.72, updatedAt: '2026-08-24T08:00:00Z' },
    ],
  },
  {
    id: 'slightly-far-cheap',
    name: 'Slightly far and cheap',
    latitude: 49.64,
    longitude: 2.97,
    prices: [
      { fuel: 'E10', price: 1.62, updatedAt: '2026-08-24T08:00:00Z' },
      { fuel: 'DIESEL', price: 1.65, updatedAt: '2026-08-24T08:00:00Z' },
    ],
  },
  {
    id: 'balanced',
    name: 'Balanced station',
    latitude: 49.94,
    longitude: 2.93,
    prices: [{ fuel: 'E10', price: 1.67, updatedAt: '2026-08-24T08:00:00Z' }],
  },
  {
    id: 'very-far',
    name: 'Very far station',
    latitude: 49.45,
    longitude: 1.2,
    prices: [{ fuel: 'E10', price: 1.5, updatedAt: '2026-08-24T08:00:00Z' }],
  },
  {
    id: 'missing-fuel',
    name: 'Missing fuel station',
    latitude: 49.96,
    longitude: 2.95,
    prices: [{ fuel: 'SP98', price: 1.89, updatedAt: '2026-08-24T08:00:00Z' }],
  },
  {
    id: 'tie-a',
    name: 'Tie A',
    latitude: 49.91,
    longitude: 2.91,
    prices: [{ fuel: 'E10', price: 1.7, updatedAt: '2026-08-24T08:00:00Z' }],
  },
  {
    id: 'tie-b',
    name: 'Tie B',
    latitude: 49.91,
    longitude: 2.91,
    prices: [{ fuel: 'E10', price: 1.7, updatedAt: '2026-08-24T08:00:00Z' }],
  },
  {
    id: 'e85-only',
    name: 'E85 only station',
    latitude: 49.89,
    longitude: 2.9,
    prices: [{ fuel: 'E85', price: 0.88, updatedAt: '2026-08-24T08:00:00Z' }],
  },
  {
    id: 'lpg-only',
    name: 'LPG only station',
    latitude: 50.12,
    longitude: 3.01,
    prices: [{ fuel: 'LPG', price: 1.02, updatedAt: '2026-08-24T08:00:00Z' }],
  },
  {
    id: 'diesel-value',
    name: 'Diesel value station',
    latitude: 50.1,
    longitude: 3.02,
    prices: [{ fuel: 'DIESEL', price: 1.61, updatedAt: '2026-08-24T08:00:00Z' }],
  },
];
