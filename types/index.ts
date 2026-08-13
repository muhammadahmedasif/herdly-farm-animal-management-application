/**
 * Herdly — Core data types
 * These mirror the Supabase table columns exactly so swapping
 * the local store for the real DB is a one-file change.
 */

export type Species = 'Cow' | 'Buffalo' | 'Goat' | 'Sheep';
export type Sex     = 'Male' | 'Female';

export type ReproStatus =
  | 'Open'
  | 'Inseminated'
  | 'Pregnant'
  | 'Dry'
  | 'Newly Calved'
  | 'Breeding'
  | 'Non-Breeding'
  | 'Not Applicable'
  | 'Calf';

export interface Animal {
  id:            string;
  tag_number:    string;
  name:          string;
  species:       Species;
  breed:         string;
  sex:           Sex;
  date_of_birth: string;        // YYYY-MM-DD
  dob_is_estimated?: boolean;   // True if user only entered age
  color:         string;
  repro_status:  ReproStatus;
  lactation_number?: string;
  last_insemination_date?: string;
  mother_id?:    string;        // FK to parent animal (optional)
  child_number?: string;        // Which lactation calf this animal is (e.g. "1", "2")
  image_url:     string;
  notes:         string;
  created_at:    string;
  updated_at?:   string;
}

export interface Insemination {
  id:               string;
  animal_id:        string;
  lactation_number: string;
  ai_date:          string;     // YYYY-MM-DD
  semen_company:    string;
  bull_name:        string;
  pregnancy_check_date: string; // YYYY-MM-DD  (auto: ai_date + 60 days)
  pregnancy_status: 'Pending' | 'Pregnant' | 'Open' | 'Repeat' | 'Inseminated' | 'Dry';
  expected_calving_date: string; // YYYY-MM-DD
  notes:            string;
  created_at:       string;
  updated_at?:      string;
}

export interface Calving {
  id:            string;
  animal_id?:    string;
  insemination_id?: string;
  calving_date?: string;        // YYYY-MM-DD
  calf_tag?:     string;
  calf_name?:    string;
  calf_sex?:     Sex;
  calf_weight_kg?: number;
  complications: string;
  notes:         string;
  created_at:    string;
  updated_at?:   string;
}

export interface Vaccination {
  id:             string;
  animal_id:      string;
  vaccine_name:   string;
  date_given:     string;       // YYYY-MM-DD
  next_due_date:  string;       // YYYY-MM-DD
  administered_by: string;
  notes:          string;
  created_at:     string;
  updated_at?:    string;
}

export interface Deworming {
  id:             string;
  animal_id:      string;
  product_name:   string;
  date_given:     string;       // YYYY-MM-DD
  next_due_date:  string;       // YYYY-MM-DD
  dose_ml:        string;
  notes:          string;
  created_at:     string;
  updated_at?:    string;
}
