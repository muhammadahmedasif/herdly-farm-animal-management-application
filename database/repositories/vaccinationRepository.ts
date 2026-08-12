/**
 * Vaccination repository — CRUD + queries for the `vaccinations` table.
 */
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Vaccination } from '../../types';
import { getDb } from '../database';

interface VaccinationRow {
  id: string;
  animal_id: string | null;
  vaccine_name: string | null;
  date_given: string | null;
  next_due_date: string | null;
  administered_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

function nowIso(): string {
  return new Date().toISOString();
}

function nvl(v: string | null | undefined): string | null {
  return v === undefined || v === '' || v === null ? null : v;
}

function rowToVaccination(r: VaccinationRow): Vaccination {
  return {
    id: r.id,
    animal_id: r.animal_id ?? '',
    vaccine_name: r.vaccine_name ?? '',
    date_given: r.date_given ?? '',
    next_due_date: r.next_due_date ?? '',
    administered_by: r.administered_by ?? '',
    notes: r.notes ?? '',
    created_at: r.created_at,
    updated_at: r.updated_at ?? undefined,
  };
}

export const vaccinationRepository = {
  async createVaccination(v: Vaccination, db: SQLiteDatabase = getDb()): Promise<void> {
    await db.runAsync(
      `INSERT INTO vaccinations (
        id, animal_id, vaccine_name, date_given, next_due_date, administered_by, notes, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        v.id, nvl(v.animal_id), v.vaccine_name ?? null, nvl(v.date_given), nvl(v.next_due_date),
        v.administered_by ?? null, v.notes ?? null, v.created_at || nowIso(), v.updated_at ?? nowIso(),
      ],
    );
  },

  async getVaccinations(db: SQLiteDatabase = getDb()): Promise<Vaccination[]> {
    const rows = await db.getAllAsync<VaccinationRow>('SELECT * FROM vaccinations ORDER BY created_at DESC');
    return rows.map(rowToVaccination);
  },

  async getVaccinationsByAnimal(animalId: string, db: SQLiteDatabase = getDb()): Promise<Vaccination[]> {
    const rows = await db.getAllAsync<VaccinationRow>(
      'SELECT * FROM vaccinations WHERE animal_id = ? ORDER BY created_at DESC',
      [animalId],
    );
    return rows.map(rowToVaccination);
  },

  async insertRaw(v: Vaccination, db: SQLiteDatabase = getDb()): Promise<void> {
    await db.runAsync(
      `INSERT OR IGNORE INTO vaccinations (
        id, animal_id, vaccine_name, date_given, next_due_date, administered_by, notes, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        v.id, nvl(v.animal_id), v.vaccine_name ?? null, nvl(v.date_given), nvl(v.next_due_date),
        v.administered_by ?? null, v.notes ?? null, v.created_at || nowIso(), v.updated_at ?? nowIso(),
      ],
    );
  },
};
