import { todayString, parseLocalDate } from './dateCalculations';
import { VALIDATION_MESSAGES } from './errorMessages';
import type { Animal } from '../types/animal';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate animal form fields before saving.
 */
export function validateAnimalForm(
  data: Partial<Animal>,
  existingAnimals: Animal[],
  isEdit = false,
  originalTagNumber?: string
): ValidationResult {
  const errors: string[] = [];

  // Tag number required
  if (!data.tag_number?.trim()) {
    errors.push(VALIDATION_MESSAGES.tagRequired);
  } else {
    // Duplicate tag check (skip for edit if unchanged)
    const isDuplicate = existingAnimals.some(
      (a) =>
        a.tag_number.trim().toLowerCase() === data.tag_number!.trim().toLowerCase() &&
        (!isEdit || a.tag_number.toLowerCase() !== originalTagNumber?.toLowerCase())
    );
    if (isDuplicate) {
      errors.push(VALIDATION_MESSAGES.duplicateTag);
    }
  }

  // Species required
  if (!data.species) {
    errors.push(VALIDATION_MESSAGES.speciesRequired);
  }

  // Sex required
  if (!data.sex) {
    errors.push(VALIDATION_MESSAGES.sexRequired);
  }

  // Birth date must not be in the future
  if (data.date_of_birth) {
    const dob = parseLocalDate(data.date_of_birth);
    const today = parseLocalDate(todayString());
    if (dob > today) {
      errors.push(VALIDATION_MESSAGES.futureBirthDate);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate an insemination form.
 */
export function validateInseminationForm(data: {
  insemination_date?: string;
  animal_date_of_birth?: string;
}): ValidationResult {
  const errors: string[] = [];

  if (!data.insemination_date) {
    errors.push(VALIDATION_MESSAGES.inseminationDateRequired);
  } else if (data.animal_date_of_birth) {
    const insemDate = parseLocalDate(data.insemination_date);
    const dob = parseLocalDate(data.animal_date_of_birth);
    if (insemDate < dob) {
      errors.push(VALIDATION_MESSAGES.inseminationBeforeBirth);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a calving form.
 */
export function validateCalvingForm(data: {
  calving_date?: string;
  insemination_date?: string;
}): ValidationResult {
  const errors: string[] = [];

  if (!data.calving_date) {
    errors.push(VALIDATION_MESSAGES.calvingDateRequired);
  } else if (data.insemination_date) {
    const calvDate = parseLocalDate(data.calving_date);
    const insemDate = parseLocalDate(data.insemination_date);
    if (calvDate < insemDate) {
      errors.push(VALIDATION_MESSAGES.calvingBeforeInsemination);
    }
  }

  return { valid: errors.length === 0, errors };
}
