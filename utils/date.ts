import type { Species } from '../types';

/**
 * Format a Date as a LOCAL date string `YYYY-MM-DD`.
 * IMPORTANT: use this instead of `date.toISOString().split('T')[0]`, which
 * shifts the date by the device's UTC offset and corrupts stored dates.
 */
export function toDateString(d: Date): string {
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Parse a `YYYY-MM-DD` string as a LOCAL date (midnight local time).
 * Avoids `new Date('2020-05-15')`, which is interpreted as UTC midnight and
 * can land on the wrong local calendar day.
 */
export function parseDate(dateStr?: string): Date {
  if (!dateStr) return new Date(NaN);
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date(NaN) : d;
}

/** Add a number of days to a `YYYY-MM-DD` string, returning `YYYY-MM-DD`. */
export function addDays(dateStr: string, days: number): string {
  const d = parseDate(dateStr);
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + days);
  return toDateString(d);
}

/** Compute an animal's age (in full years and months) up to the given moment. */
export function calculateAge(dobStr?: string, now: Date = new Date()): { years: number; months: number; valid: boolean } {
  const dob = parseDate(dobStr);
  if (isNaN(dob.getTime()) || dob.getTime() > now.getTime()) {
    return { years: 0, months: 0, valid: false };
  }

  let years = now.getFullYear() - dob.getFullYear();
  let months = now.getMonth() - dob.getMonth();

  if (months < 0) {
    years--;
    months += 12;
  }

  if (now.getDate() < dob.getDate()) {
    months--;
    if (months < 0) {
      years--;
      months += 12;
    }
  }

  if (years < 0) return { years: 0, months: 0, valid: true };

  return { years, months, valid: true };
}

export function formatDob(dateStr?: string, isEstimated?: boolean): string {
  if (isEstimated) return 'N/A';
  const d = parseDate(dateStr);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatAge(dobStr?: string, now: Date = new Date()): string {
  const { years, months, valid } = calculateAge(dobStr, now);
  if (!valid) return 'N/A';
  if (years > 0 && months > 0) return `${years} yr ${months} mo`;
  if (years > 0) return `${years} yr`;
  if (months > 0) return `${months} mo`;
  return '0 mo';
}

/** Gestation length in days per species. */
export function getGestationDays(species?: Species): number {
  switch (species) {
    case 'Buffalo': return 310;
    case 'Goat': return 150;
    case 'Sheep': return 147;
    default: return 283; // Cow
  }
}

/**
 * Back-calculate a date of birth from a whole number of years + months.
 * Handles month-length overflow (e.g. Aug 31 minus 6 months) by clamping to
 * the last valid day of the target month.
 */
export function dateFromAge(years: number, months: number, from: Date = new Date()): Date {
  const totalMonths = from.getFullYear() * 12 + from.getMonth() - years * 12 - months;
  const year = Math.floor(totalMonths / 12);
  const month = ((totalMonths % 12) + 12) % 12;
  const norm = new Date(year, month, 1); // first day of the target month
  const lastDay = new Date(norm.getFullYear(), norm.getMonth() + 1, 0).getDate();
  const day = Math.min(from.getDate(), lastDay);
  return new Date(norm.getFullYear(), norm.getMonth(), day);
}

/** Compute the difference in days between two dates. */
export function differenceInDays(date1: Date, date2: Date): number {
  const diffTime = date1.getTime() - date2.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
