// Herdly Livestock Configuration

export const SPECIES_LIST = ['Cow', 'Buffalo', 'Goat', 'Sheep'] as const;
export type Species = typeof SPECIES_LIST[number];

export const SEX_OPTIONS = ['Female', 'Male'] as const;
export type Sex = typeof SEX_OPTIONS[number];

export const PURPOSE_OPTIONS = ['Dairy / Milking', 'Meat', 'Breeding', 'Other'] as const;
export type Purpose = typeof PURPOSE_OPTIONS[number];

export const REPRODUCTIVE_STATUS_OPTIONS = [
  'Open',
  'Inseminated',
  'Pregnant',
  'Dry',
  'Newly Calved',
  'Not Applicable',
] as const;
export type ReproductiveStatus = typeof REPRODUCTIVE_STATUS_OPTIONS[number];

// Animal types by species + sex + age
export const ANIMAL_TYPES: Record<Species, { female: string[]; male: string[] }> = {
  Cow: {
    female: ['Calf (Female)', 'Heifer', 'Adult Female'],
    male: ['Calf (Male)', 'Bull'],
  },
  Buffalo: {
    female: ['Calf (Female)', 'Heifer', 'Adult Female'],
    male: ['Calf (Male)', 'Bull'],
  },
  Goat: {
    female: ['Kid (Female)', 'Doe'],
    male: ['Kid (Male)', 'Buck'],
  },
  Sheep: {
    female: ['Lamb (Female)', 'Ewe'],
    male: ['Lamb (Male)', 'Ram'],
  },
};

// Breed suggestions per species
export const BREEDS: Record<Species, string[]> = {
  Cow: ['Sahiwal', 'Friesian', 'Jersey', 'Holstein', 'Crossbred', 'Desi', 'Other'],
  Buffalo: ['Nili-Ravi', 'Kundi', 'Murrah', 'Azi Kheli', 'Other'],
  Goat: ['Beetal', 'Teddy', 'Dera Din Panah', 'Pahari', 'Kamori', 'Other'],
  Sheep: ['Lohi', 'Kajli', 'Thalli', 'Dumbi', 'Other'],
};

// Species emoji mapping
export const SPECIES_EMOJI: Record<Species, string> = {
  Cow: '🐄',
  Buffalo: '🐃',
  Goat: '🐐',
  Sheep: '🐑',
};

// Status color mapping (returns key from Colors)
export const STATUS_COLORS: Record<ReproductiveStatus, 'success' | 'warning' | 'danger' | 'info' | 'primary'> = {
  Open: 'warning',
  Inseminated: 'info',
  Pregnant: 'success',
  Dry: 'warning',
  'Newly Calved': 'success',
  'Not Applicable': 'primary',
};

// Default cattle gestation period in days
export const CATTLE_GESTATION_DAYS = 283;

// Default pregnancy check day after insemination
export const PREGNANCY_CHECK_DAYS = 45;

// Default re-insemination window after calving
export const RE_INSEMINATION_DAYS = 45;
