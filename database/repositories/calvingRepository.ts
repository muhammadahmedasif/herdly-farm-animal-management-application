/**
 * Calving repository — CRUD + the atomic calving transaction.
 *
 * A new calving also (optionally) creates a calf `Animal` and updates the mother
 * (status -> Newly Calved, lactation incremented). Those three writes MUST be
 * atomic: the whole operation runs inside a single exclusive SQLite transaction
 * so a failure can never leave a half-written calving (calf without mother update,
 * or calving without calf).
 */
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Calving, Animal } from '../../types';
import { getDb } from '../database';
import { persistAnimalImage } from '../imageStorage';

interface CalvingRow {
  id: string;
  animal_id: string | null;
  insemination_id: string | null;
  calving_date: string | null;
  calf_tag: string | null;
  calf_name: string | null;
  calf_sex: string | null;
  calf_weight_kg: number | null;
  complications: string | null;
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

function rowToCalving(r: CalvingRow): Calving {
  return {
    id: r.id,
    animal_id: r.animal_id ?? undefined,
    insemination_id: r.insemination_id ?? undefined,
    calving_date: r.calving_date ?? undefined,
    calf_tag: r.calf_tag ?? undefined,
    calf_name: r.calf_name ?? undefined,
    calf_sex: (r.calf_sex as Calving['calf_sex']) ?? undefined,
    calf_weight_kg: r.calf_weight_kg ?? undefined,
    complications: r.complications ?? '',
    notes: r.notes ?? '',
    created_at: r.created_at,
    updated_at: r.updated_at ?? undefined,
  };
}

async function insertCalvingRow(db: SQLiteDatabase, c: Calving): Promise<void> {
  await db.runAsync(
    `INSERT INTO calvings (
      id, animal_id, insemination_id, calving_date, calf_tag, calf_name,
      calf_sex, calf_weight_kg, complications, notes, created_at, updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      c.id, nvl(c.animal_id), nvl(c.insemination_id), nvl(c.calving_date), c.calf_tag ?? null,
      c.calf_name ?? null, c.calf_sex ?? null, c.calf_weight_kg ?? null, c.complications ?? null,
      c.notes ?? null, c.created_at || nowIso(), c.updated_at ?? nowIso(),
    ],
  );
}

export const calvingRepository = {
  async createCalving(c: Calving, db: SQLiteDatabase = getDb()): Promise<void> {
    await insertCalvingRow(db, c);
  },

  async getCalvings(db: SQLiteDatabase = getDb()): Promise<Calving[]> {
    const rows = await db.getAllAsync<CalvingRow>('SELECT * FROM calvings ORDER BY created_at DESC');
    return rows.map(rowToCalving);
  },

  async getCalvingById(id: string, db: SQLiteDatabase = getDb()): Promise<Calving | null> {
    const row = await db.getFirstAsync<CalvingRow>('SELECT * FROM calvings WHERE id = ?', [id]);
    return row ? rowToCalving(row) : null;
  },

  async getCalvingsByAnimal(animalId: string, db: SQLiteDatabase = getDb()): Promise<Calving[]> {
    const rows = await db.getAllAsync<CalvingRow>(
      'SELECT * FROM calvings WHERE animal_id = ? ORDER BY created_at DESC',
      [animalId],
    );
    return rows.map(rowToCalving);
  },

  async updateCalving(c: Calving, db: SQLiteDatabase = getDb()): Promise<void> {
    await db.runAsync(
      `UPDATE calvings SET
        animal_id = ?, insemination_id = ?, calving_date = ?, calf_tag = ?, calf_name = ?,
        calf_sex = ?, calf_weight_kg = ?, complications = ?, notes = ?, updated_at = ?
       WHERE id = ?`,
      [
        nvl(c.animal_id), nvl(c.insemination_id), nvl(c.calving_date), c.calf_tag ?? null,
        c.calf_name ?? null, c.calf_sex ?? null, c.calf_weight_kg ?? null, c.complications ?? null,
        c.notes ?? null, nowIso(), c.id,
      ],
    );
  },

  async deleteCalving(id: string, db: SQLiteDatabase = getDb()): Promise<void> {
    await db.runAsync('DELETE FROM calvings WHERE id = ?', [id]);
  },

  /**
   * ATOMIC calving write.
   * Inserts the calving record, optionally inserts the calf animal, and
   * optionally updates the mother — all in one exclusive transaction.
   */
  async recordCalving(
    calving: Calving,
    calf?: Animal,
    motherUpdate?: Animal,
    db: SQLiteDatabase = getDb(),
  ): Promise<void> {
    await db.withExclusiveTransactionAsync(async (tx) => {
      await insertCalvingRow(tx, calving);
      if (calf) {
        const image_url = await persistAnimalImage(calf.id, calf.image_url);
        await tx.runAsync(
          `INSERT INTO animals (
            id, tag_number, name, species, breed, sex, date_of_birth, dob_is_estimated,
            color, repro_status, lactation_number, last_insemination_date, image_url,
            notes, created_at, updated_at
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            calf.id, calf.tag_number ?? '', calf.name ?? 'Unknown', calf.species, calf.breed ?? '',
            calf.sex, calf.date_of_birth ?? '', calf.dob_is_estimated ? 1 : 0, calf.color ?? '',
            calf.repro_status, calf.lactation_number ?? null, calf.last_insemination_date ?? null,
            image_url, calf.notes ?? '', calf.created_at || nowIso(), calf.updated_at ?? nowIso(),
          ],
        );
      }
      if (motherUpdate) {
        await tx.runAsync(
          `UPDATE animals SET repro_status = ?, lactation_number = ?, updated_at = ? WHERE id = ?`,
          [motherUpdate.repro_status, motherUpdate.lactation_number ?? null, nowIso(), motherUpdate.id],
        );
      }
    });
  },

  async insertRaw(c: Calving, db: SQLiteDatabase = getDb()): Promise<void> {
    await db.runAsync(
      `INSERT OR IGNORE INTO calvings (
        id, animal_id, insemination_id, calving_date, calf_tag, calf_name,
        calf_sex, calf_weight_kg, complications, notes, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        c.id, nvl(c.animal_id), nvl(c.insemination_id), nvl(c.calving_date), c.calf_tag ?? null,
        c.calf_name ?? null, c.calf_sex ?? null, c.calf_weight_kg ?? null, c.complications ?? null,
        c.notes ?? null, c.created_at || nowIso(), c.updated_at ?? nowIso(),
      ],
    );
  },
};
