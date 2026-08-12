/**
 * Herdly — User-Friendly Error Messages
 *
 * Converts technical database/network errors into clear, simple messages.
 * Never expose raw PostgrestError codes to users.
 */

export function getFriendlyError(error: unknown): string {
  if (!error) return 'Something went wrong. Please try again.';

  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();

  // Duplicate tag / unique constraint
  if (lower.includes('23505') || lower.includes('unique') || lower.includes('duplicate')) {
    return '⚠️ This tag number is already registered. Please use a different tag.';
  }

  // Foreign key violation
  if (lower.includes('23503') || lower.includes('foreign key')) {
    return '⚠️ This record is linked to other data and cannot be removed.';
  }

  // Not null violation
  if (lower.includes('23502') || lower.includes('not null')) {
    return '⚠️ Please fill in all required fields.';
  }

  // Network errors
  if (
    lower.includes('network') ||
    lower.includes('fetch') ||
    lower.includes('failed to fetch') ||
    lower.includes('network request failed')
  ) {
    return '📶 Internet connection is unavailable. Please check your connection and try again.';
  }

  // Auth errors
  if (lower.includes('invalid login') || lower.includes('invalid email or password')) {
    return '❌ Incorrect email or password. Please try again.';
  }

  // Upload errors
  if (lower.includes('upload') || lower.includes('cloudinary') || lower.includes('image')) {
    return '📷 Unable to upload the image. Please try again.';
  }

  // Timeout
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return '⏱️ The request took too long. Please try again.';
  }

  // Default
  return 'Something went wrong. Please try again.';
}

// Common success messages
export const SUCCESS_MESSAGES = {
  animalRegistered: '✅ Animal registered successfully.',
  animalUpdated: '✅ Animal details updated successfully.',
  animalDeleted: '✅ Animal deleted successfully.',
  inseminationSaved: '✅ Insemination record saved.',
  pregnancyChecked: '✅ Pregnancy check recorded.',
  calvingSaved: '✅ Calving recorded.',
  vaccinationSaved: '✅ Vaccination record saved.',
  dewormingSaved: '✅ Deworming record saved.',
  imageUploaded: '✅ Image uploaded successfully.',
};

// Common validation messages
export const VALIDATION_MESSAGES = {
  tagRequired: 'Please enter the animal tag number.',
  speciesRequired: 'Please select the animal species.',
  sexRequired: 'Please select the animal sex.',
  inseminationDateRequired: 'Please enter the insemination date.',
  calvingDateRequired: 'Please enter the calving date.',
  vaccineDateRequired: 'Please enter the vaccination date.',
  dewormDateRequired: 'Please enter the deworming date.',
  vaccineNameRequired: 'Please enter the vaccine name.',
  dewormProductRequired: 'Please enter the deworming product name.',
  futureBirthDate: 'Date of birth cannot be in the future.',
  inseminationBeforeBirth: 'Insemination date cannot be before the animal\'s date of birth.',
  calvingBeforeInsemination: 'Calving date cannot be before the insemination date.',
  duplicateTag: '⚠️ This tag number is already registered.',
  noAnimalFound: (tag: string) => `No animal was found with tag number "${tag}".`,
  confirmDelete: (tag: string) => `Are you sure you want to permanently delete animal "${tag}"? This cannot be undone.`,
};
