export type FuelType = 'DIESEL' | 'SP95' | 'SP98' | 'E10' | 'E85' | 'LPG';

export const FUEL_LABELS: Record<FuelType, string> = {
  DIESEL: 'Gazole',
  SP95: 'SP95',
  SP98: 'SP98',
  E10: 'SP95-E10',
  E85: 'E85',
  LPG: 'GPLc',
};

export const ALL_FUEL_TYPES: FuelType[] = ['DIESEL', 'SP95', 'SP98', 'E10', 'E85', 'LPG'];
