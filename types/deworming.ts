export interface Deworming {
  id: string;
  animal_id: string;
  product_name: string;
  date_given: string; // YYYY-MM-DD
  dose?: string;
  weight?: number; // in kg
  next_due_date?: string;
  notes?: string;
  created_at?: string;
}

export interface DewormingSchedule {
  id: string;
  species: string; // 'Cow' | 'Buffalo' | 'Goat' | 'Sheep' | 'All'
  animal_type?: string; // e.g. 'Calf', 'Adult'
  first_due_days?: number; // days after birth for initial dose
  repeat_interval_days: number;
  notes?: string;
  active: boolean;
}
