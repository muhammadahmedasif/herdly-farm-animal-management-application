/**
 * Insemination repository — CRUD + queries for the `inseminations` table.
 */
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Insemination } from '../../types';
import { getDb } from '../database';

interface InseminationRow {
  id: string;
  animal_id: string | null;
  lactation_number: string | null;
  ai_date: string | null;
  semen_company: string | null;
  bull_name: string | null;
  pregnancy_check_date: string | null;
  pregnancy_status: string | null;
  expected_calving_date: string | null;
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

function rowToInsemination(r: InseminationRow): Insemination {
  return {
    id: r.id,
    animal_id: r.animal_id ?? '',
    lactation_number: r.lactation_number ?? '',
    ai_date: r.ai_date ?? '',
    semen_company: r.semen_company ?? '',
    bull_name: r.bull_name ?? '',
    pregnancy_check_date: r.pregnancy_check_date ?? '',
    pregnancy_status: (r.pregnancy_status as Insemination['pregnancy_status']) ?? 'Pending',
    expected_calving_date: r.expected_calving_date ?? '',
    notes: r.notes ?? '',
    created_at: r.created_at,
    updated_at: r.updated_at ?? undefined,
  };
}

export const inseminationRepository = {
  async createInsemination(i: Insemination, db: SQLiteDatabase = getDb()): Promise<void> {
    await db.runAsync(
      `INSERT INTO inseminations (
        id, animal_id, lactation_number, ai_date, semen_company, bull_name,
        pregnancy_check_date, pregnancy_status, expected_calving_date, notes, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        i.id, nvl(i.animal_id), i.lactation_number ?? null, nvl(i.ai_date), i.semen_company ?? null,
        i.bull_name ?? null, nvl(i.pregnancy_check_date), i.pregnancy_status ?? null,
        nvl(i.expected_calving_date), i.notes ?? null, i.created_at || nowIso(), i.updated_at ?? nowIso(),
      ],
    );
  },

  async getInseminations(db: SQLiteDatabase = getDb()): Promise<Insemination[]> {
    const rows = await db.getAllAsync<InseminationRow>('SELECT * FROM inseminations ORDER BY created_at DESC');
    return rows.map(rowToInsemination);
  },

  async getInseminationById(id: string, db: SQLiteDatabase = getDb()): Promise<Insemination | null> {
    const row = await db.getFirstAsync<InseminationRow>('SELECT * FROM inseminations WHERE id = ?', [id]);
    return row ? rowToInsemination(row) : null;
  },

  async getInseminationsByAnimal(animalId: string, db: SQLiteDatabase = getDb()): Promise<Insemination[]> {
    const rows = await db.getAllAsync<InseminationRow>(
      'SELECT * FROM inseminations WHERE animal_id = ? ORDER BY created_at DESC',
      [animalId],
    );
    return rows.map(rowToInsemination);
  },

  async updateInsemination(i: Insemination, db: SQLiteDatabase = getDb()): Promise<void> {
    await db.runAsync(
      `UPDATE inseminations SET
        animal_id = ?, lactation_number = ?, ai_date = ?, semen_company = ?, bull_name = ?,
        pregnancy_check_date = ?, pregnancy_status = ?, expected_calving_date = ?, notes = ?, updated_at = ?
       WHERE id = ?`,
      [
        nvl(i.animal_id), i.lactation_number ?? null, nvl(i.ai_date), i.semen_company ?? null,
        i.bull_name ?? null, nvl(i.pregnancy_check_date), i.pregnancy_status ?? null,
        nvl(i.expected_calving_date), i.notes ?? null, nowIso(), i.id,
      ],
    );
  },

  async deleteInsemination(id: string, db: SQLiteDatabase = getDb()): Promise<void> {
    await db.runAsync('DELETE FROM inseminations WHERE id = ?', [id]);
  },

  async insertRaw(i: Insemination, db: SQLiteDatabase = getDb()): Promise<void> {
    await db.runAsync(
      `INSERT OR IGNORE INTO inseminations (
        id, animal_id, lactation_number, ai_date, semen_company, bull_name,
        pregnancy_check_date, pregnancy_status, expected_calving_date, notes, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        i.id, nvl(i.animal_id), i.lactation_number ?? null, nvl(i.ai_date), i.semen_company ?? null,
        i.bull_name ?? null, nvl(i.pregnancy_check_date), i.pregnancy_status ?? null,
        nvl(i.expected_calving_date), i.notes ?? null, i.created_at || nowIso(), i.updated_at ?? nowIso(),
      ],
    );
  },
};
