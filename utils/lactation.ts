import type { Animal } from '../types';

export const PREGNANCY_CHECK_DAYS = 45;

/**
 * Effective lactation number for a female.
 *
 * The stored `lactation_number` is the committed base. A confirmed pregnancy
 * always carries one extra (future) lactation, so while an animal is Pregnant
 * her effective lactation is base + 1. As soon as she is moved to Open/Dry the
 * extra lactation disappears automatically, and at calving the base is
 * committed permanently (base + 1).
 */
export function getEffectiveLactation(
  animal?: Pick<Animal, 'repro_status' | 'lactation_number' | 'last_insemination_date'>,
  _now: Date = new Date(),
): number {
  if (!animal) return 0;
  const base = parseInt(animal.lactation_number || '0', 10) || 0;
  if (animal.repro_status === 'Pregnant') return base + 1;
  return base;
}

/** Increment a lactation number by one (used when committing a calving). */
export function incrementLactation(current?: string): string {
  const base = parseInt(current || '0', 10) || 0;
  return String(base + 1);
}
