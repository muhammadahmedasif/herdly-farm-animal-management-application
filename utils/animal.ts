import type { Animal, ReproStatus } from '../types';
import { calculateAge } from './date';
import { CALF_MATURITY_MONTHS } from '../constants/livestock';

/**
 * Derive the *effective* reproductive status of an animal.
 *
 * Calves are a lifecycle stage, not a permanent status. A young animal stored
 * with `repro_status = 'Calf'` is displayed as a calf only until it reaches the
 * species maturity threshold (see CALF_MATURITY_MONTHS). After that it is
 * treated exactly like any other animal: females become 'Open' (available for
 * breeding) and males become 'Not Applicable'.
 *
 * This is a pure derivation from date_of_birth — the stored value is never
 * mutated, so no database writes happen during render.
 */
export function getEffectiveReproStatus(animal: Animal): ReproStatus {
  if (animal.repro_status !== 'Calf') return animal.repro_status;

  const { years, months, valid } = calculateAge(animal.date_of_birth);
  const ageMonths = valid ? years * 12 + months : 0;

  if (ageMonths >= CALF_MATURITY_MONTHS[animal.species]) {
    return animal.sex === 'Male' ? 'Not Applicable' : 'Open';
  }
  return 'Calf';
}
