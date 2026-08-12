/**
 * Herdly — Centralized Date Calculation Engine
 *
 * All date arithmetic is handled here. Do NOT duplicate date calculations in UI components.
 * Treats farm dates as calendar dates (local midnight) to avoid timezone off-by-one bugs.
 */

import { CATTLE_GESTATION_DAYS, PREGNANCY_CHECK_DAYS } from '../constants/livestock';

/**
 * Parse a YYYY-MM-DD date string as a local calendar date.
 * Avoids UTC midnight conversion issues that can shift the date by 1 day.
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format a Date object to YYYY-MM-DD string (local calendar date).
 */
export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Format a YYYY-MM-DD date string to a display-friendly format: "11 Aug 2026"
 */
export function formatDisplayDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '--';
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Add a number of calendar days to a YYYY-MM-DD date string.
 * Returns a new YYYY-MM-DD string.
 */
export function addDays(dateStr: string, days: number): string {
  const date = parseLocalDate(dateStr);
  date.setDate(date.getDate() + days);
  return toLocalDateString(date);
}

/**
 * Calculate the difference in calendar days between two dates.
 * Positive = later is in the future, Negative = later is in the past.
 */
export function daysDifference(fromDateStr: string, toDateStr: string): number {
  const from = parseLocalDate(fromDateStr);
  const to = parseLocalDate(toDateStr);
  const diffMs = to.getTime() - from.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculate today as a YYYY-MM-DD local date string.
 */
export function todayString(): string {
  return toLocalDateString(new Date());
}

// ─── Reproductive Calculations ────────────────────────────────────────────────

/**
 * Calculate the pregnancy check date.
 * Default: 45 days after insemination.
 */
export function calculatePregnancyCheckDate(inseminationDate: string, daysAfter = PREGNANCY_CHECK_DAYS): string {
  return addDays(inseminationDate, daysAfter);
}

/**
 * Calculate the expected calving date.
 * Default: 283 days (gestation) after insemination.
 */
export function calculateExpectedCalvingDate(inseminationDate: string, gestationDays = CATTLE_GESTATION_DAYS): string {
  return addDays(inseminationDate, gestationDays);
}

/**
 * Calculate how many days the animal has been pregnant since insemination.
 * Returns a positive integer (days elapsed).
 */
export function calculatePregnancyDays(inseminationDate: string): number {
  return daysDifference(inseminationDate, todayString());
}

/**
 * Calculate how many days remain until a due date.
 * Positive = days remaining, Negative = overdue by that many days, 0 = due today.
 */
export function calculateDaysRemaining(dueDateStr: string): number {
  return daysDifference(todayString(), dueDateStr);
}

// ─── Health Task Status ───────────────────────────────────────────────────────

export type DueDateStatus = 'overdue' | 'due_today' | 'due_soon' | 'upcoming';

/**
 * Classify a due date into a health-task status.
 * "due_soon" = within the next `soonThresholdDays` days (default: 7).
 */
export function getDueDateStatus(dueDateStr: string, soonThresholdDays = 7): DueDateStatus {
  const daysRemaining = calculateDaysRemaining(dueDateStr);
  if (daysRemaining < 0) return 'overdue';
  if (daysRemaining === 0) return 'due_today';
  if (daysRemaining <= soonThresholdDays) return 'due_soon';
  return 'upcoming';
}

/**
 * Format days remaining into a human-readable string.
 * Examples: "Overdue by 3 days", "Due today", "Due in 5 days", "In 30 days"
 */
export function formatDaysRemaining(dueDateStr: string): string {
  const days = calculateDaysRemaining(dueDateStr);
  if (days < 0) return `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}`;
  if (days === 0) return 'Due today';
  if (days <= 14) return `Due in ${days} day${days === 1 ? '' : 's'}`;
  return `In ${days} days`;
}

// ─── Age Calculation ──────────────────────────────────────────────────────────

/**
 * Calculate an animal's age from its date of birth.
 * Returns a human-readable string: "2 years 3 months", "5 months", "12 days"
 */
export function calculateAge(dateOfBirth: string | undefined | null): string {
  if (!dateOfBirth) return 'Unknown';
  const dob = parseLocalDate(dateOfBirth);
  const today = new Date();

  let years = today.getFullYear() - dob.getFullYear();
  let months = today.getMonth() - dob.getMonth();
  let days = today.getDate() - dob.getDate();

  if (days < 0) {
    months--;
    days += 30;
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  if (years > 0) {
    return months > 0 ? `${years}y ${months}m` : `${years} year${years === 1 ? '' : 's'}`;
  }
  if (months > 0) {
    return `${months} month${months === 1 ? '' : 's'}`;
  }
  return `${days} day${days === 1 ? '' : 's'}`;
}
