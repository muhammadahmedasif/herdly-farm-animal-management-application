export type PregnancyCheckResult = 'Pregnant' | 'Not Pregnant';

export interface Insemination {
  id: string;
  animal_id: string;
  insemination_date: string; // YYYY-MM-DD
  semen_company?: string;
  semen_name?: string;
  bull_name?: string;
  pregnancy_check_date?: string;
  pregnancy_check_result?: PregnancyCheckResult;
  expected_calving_date?: string;
  notes?: string;
  created_at?: string;
}

export interface Calving {
  id: string;
  mother_id: string;
  calving_date: string; // YYYY-MM-DD
  number_of_offspring: number;
  notes?: string;
  created_at?: string;
}

export type TaskType = 'pregnancy_check' | 'vaccination' | 'deworming' | 'calving';
export type TaskStatus = 'upcoming' | 'due_today' | 'overdue' | 'completed';

export interface HealthSchedule {
  id: string;
  animal_id: string;
  task_type: TaskType;
  reference_id?: string; // FK to insemination/vaccination/deworming id
  due_date: string; // YYYY-MM-DD
  status: TaskStatus;
  completed_at?: string;
  notes?: string;
  created_at?: string;
  // Joined
  animal?: {
    tag_number: string;
    name?: string;
    species: string;
  };
}
