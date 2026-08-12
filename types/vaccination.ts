export interface Vaccination {
  id: string;
  animal_id: string;
  vaccine_id?: string;
  vaccine_name: string;
  date_given: string; // YYYY-MM-DD
  dose?: string;
  batch_number?: string;
  next_due_date?: string;
  notes?: string;
  created_at?: string;
}

export interface VaccineSchedule {
  id: string;
  vaccine_name: string;
  species: string; // 'Cow' | 'Buffalo' | 'Goat' | 'Sheep' | 'All'
  first_due_days?: number; // days after birth for initial dose
  repeat_interval_days: number;
  notes?: string;
  active: boolean;
}
