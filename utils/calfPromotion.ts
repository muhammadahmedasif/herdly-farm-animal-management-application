/**
 * Herdly — Calf auto-promotion utility.
 *
 * Calves that have reached (or passed) the species-specific maturity threshold
 * should be promoted to an adult `repro_status`. This is a pure side-effect
 * function: it compares each calf's age against the threshold and fires
 * `updateAnimal` for any that qualify.
 *
 * Call this once on app startup (after loading animals from the DB) so that the
 * UI always shows the correct status without requiring manual editing.
 */
import type { Animal } from '../types';
import { calculateAge } from './date';
import { CALF_MATURITY_MONTHS } from '../constants/livestock';

export async function promoteCalves(
  animals: Animal[],
  updateAnimal: (a: Animal) => Promise<void>,
): Promise<void> {
  const calves = animals.filter(a => a.repro_status === 'Calf');
  for (const calf of calves) {
    const { years, months, valid } = calculateAge(calf.date_of_birth);
    const ageMonths = valid ? years * 12 + months : 0;
    const threshold = CALF_MATURITY_MONTHS[calf.species] ?? 12;

    if (ageMonths >= threshold) {
      const newStatus = calf.sex === 'Male' ? 'Not Applicable' : 'Open';
      // Preserve all existing fields; only change repro_status
      await updateAnimal({
        ...calf,
        repro_status: newStatus as Animal['repro_status'],
        updated_at: new Date().toISOString(),
      });
    }
  }
}
