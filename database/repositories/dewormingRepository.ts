/**
 * Deworming repository — CRUD + queries for the `dewormings` table.
 */
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Deworming } from '../../types';
import { getDb } from '../database';

interface DewormingRow {
  id: string;
  animal_id: string | null;
  product_name: string | null;
  date_given: string | null;
  next_due_date: string | null;
  dose_ml: string | null;
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

function rowToDeworming(r: DewormingRow): Deworming {
  return {
    id: r.id,
    animal_id: r.animal_id ?? '',
    product_name: r.product_name ?? '',
    date_given: r.date_given ?? '',
    next_due_date: r.next_due_date ?? '',
    dose_ml: r.dose_ml ?? '',
    notes: r.notes ?? '',
    created_at: r.created_at,
    updated_at: r.updated_at ?? undefined,
  };
}

export const dewormingRepository = {
  async createDeworming(d: Deworming, db: SQLiteDatabase = getDb()): Promise<void> {
    await db.runAsync(
      `INSERT INTO dewormings (
        id, animal_id, product_name, date_given, next_due_date, dose_ml, notes, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        d.id, nvl(d.animal_id), d.product_name ?? null, nvl(d.date_given), nvl(d.next_due_date),
        d.dose_ml ?? null, d.notes ?? null, d.created_at || nowIso(), d.updated_at ?? nowIso(),
      ],
    );
  },

  async getDewormings(db: SQLiteDatabase = getDb()): Promise<Deworming[]> {
    const rows = await db.getAllAsync<DewormingRow>('SELECT * FROM dewormings ORDER BY created_at DESC');
    return rows.map(rowToDeworming);
  },

  async getDewormingsByAnimal(animalId: string, db: SQLiteDatabase = getDb()): Promise<Deworming[]> {
    const rows = await db.getAllAsync<DewormingRow>(
      'SELECT * FROM dewormings WHERE animal_id = ? ORDER BY created_at DESC',
      [animalId],
    );
    return rows.map(rowToDeworming);
  },

  async insertRaw(d: Deworming, db: SQLiteDatabase = getDb()): Promise<void> {
    await db.runAsync(
      `INSERT OR IGNORE INTO dewormings (
        id, animal_id, product_name, date_given, next_due_date, dose_ml, notes, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        d.id, nvl(d.animal_id), d.product_name ?? null, nvl(d.date_given), nvl(d.next_due_date),
        d.dose_ml ?? null, d.notes ?? null, d.created_at || nowIso(), d.updated_at ?? nowIso(),
      ],
    );
  },
};
