import type { Species, Sex, Purpose, ReproductiveStatus } from '../constants/livestock';

export interface Animal {
  id: string;
  tag_number: string;
  name?: string;
  species: Species;
  breed?: string;
  sex: Sex;
  animal_type?: string;
  purpose?: Purpose;
  date_of_birth?: string; // ISO date string YYYY-MM-DD
  status: ReproductiveStatus;
  mother_id?: string;
  father_id?: string;
  image_url?: string;
  image_public_id?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AnimalWithRelations extends Animal {
  mother?: Pick<Animal, 'id' | 'tag_number' | 'name' | 'species'>;
  father?: Pick<Animal, 'id' | 'tag_number' | 'name' | 'species'>;
  offspring?: Pick<Animal, 'id' | 'tag_number' | 'name' | 'species' | 'sex' | 'date_of_birth'>[];
}
