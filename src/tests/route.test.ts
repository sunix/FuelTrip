import { describe, expect, it } from 'vitest';
import { parseGeoPoint } from '../domain/route';

describe('parseGeoPoint', () => {
  it('reads a comma separated pair as typed in the search form', () => {
    expect(parseGeoPoint('48.8528, 2.3835')).toEqual({ latitude: 48.8528, longitude: 2.3835 });
  });

  it('accepts tight and space separated pairs, and negative values', () => {
    expect(parseGeoPoint('48.8528,2.3835')).toEqual({ latitude: 48.8528, longitude: 2.3835 });
    expect(parseGeoPoint('43.773 -0.567')).toEqual({ latitude: 43.773, longitude: -0.567 });
  });

  it('leaves addresses alone so they keep travelling as an address waypoint', () => {
    expect(parseGeoPoint('A6 - Sens Paris - Lyon, 77760 Villiers-sous-Grez')).toBeUndefined();
    expect(parseGeoPoint('Paris')).toBeUndefined();
    expect(parseGeoPoint('48.8528')).toBeUndefined();
  });

  it('rejects out of range coordinates', () => {
    expect(parseGeoPoint('148.8528, 2.3835')).toBeUndefined();
    expect(parseGeoPoint('48.8528, 200.1')).toBeUndefined();
  });
});
