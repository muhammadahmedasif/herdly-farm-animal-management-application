/**
 * Animal repository — CRUD + queries for the `animals` table.
 * All access is parameterized (prepared statements) to avoid SQL injection.
 */
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Animal } from '../../types';
import { getDb } from '../database';
import { persistAnimalImage, deleteAnimalImage } from '../imageStorage';

interface AnimalRow {
  id: string;
  tag_number: string;
  name: string;
  species: string;
  breed: string;
  sex: string;
  date_of_birth: string;
  dob_is_estimated: number | null;
  color: string;
  repro_status: string;
  lactation_number: string | null;
  last_insemination_date: string | null;
  mother_id: string | null;
  child_number: string | null;
  image_url: string;
  notes: string;
  created_at: string;
  updated_at: string | null;
}

function nowIso(): string {
  return new Date().toISOString();
}

function rowToAnimal(r: AnimalRow): Animal {
  return {
    id: r.id,
    tag_number: r.tag_number,
    name: r.name,
    species: r.species as Animal['species'],
    breed: r.breed,
    sex: r.sex as Animal['sex'],
    date_of_birth: r.date_of_birth,
    dob_is_estimated: r.dob_is_estimated === 1,
    color: r.color,
    repro_status: r.repro_status as Animal['repro_status'],
    lactation_number: r.lactation_number ?? undefined,
    last_insemination_date: r.last_insemination_date ?? undefined,
    mother_id: r.mother_id ?? undefined,
    child_number: r.child_number ?? undefined,
    image_url: r.image_url,
    notes: r.notes,
    created_at: r.created_at,
    updated_at: r.updated_at ?? undefined,
  };
}

/** Convert an Animal to an insertion row, persisting its image into our dir. */
async function toRow(a: Animal): Promise<AnimalRow> {
  const image_url = await persistAnimalImage(a.id, a.image_url);
  return {
    id: a.id,
    tag_number: a.tag_number ?? '',
    name: a.name ?? 'Unknown',
    species: a.species,
    breed: a.breed ?? '',
    sex: a.sex,
    date_of_birth: a.date_of_birth ?? '',
    dob_is_estimated: a.dob_is_estimated ? 1 : 0,
    color: a.color ?? '',
    repro_status: a.repro_status,
    lactation_number: a.lactation_number ?? null,
    last_insemination_date: a.last_insemination_date ?? null,
    mother_id: a.mother_id ?? null,
    child_number: a.child_number ?? null,
    image_url,
    notes: a.notes ?? '',
    created_at: a.created_at || nowIso(),
    updated_at: a.updated_at ?? nowIso(),
  };
}

export const animalRepository = {
  async createAnimal(a: Animal, db: SQLiteDatabase = getDb()): Promise<void> {
    const r = await toRow(a);
    await db.runAsync(
      `INSERT INTO animals (
        id, tag_number, name, species, breed, sex, date_of_birth, dob_is_estimated,
        color, repro_status, lactation_number, last_insemination_date,
        mother_id, child_number, image_url, notes, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        r.id, r.tag_number, r.name, r.species, r.breed, r.sex, r.date_of_birth, r.dob_is_estimated,
        r.color, r.repro_status, r.lactation_number, r.last_insemination_date,
        r.mother_id, r.child_number, r.image_url, r.notes, r.created_at, r.updated_at,
      ],
    );
  },

  async getAnimals(db: SQLiteDatabase = getDb()): Promise<Animal[]> {
    const rows = await db.getAllAsync<AnimalRow>('SELECT * FROM animals ORDER BY created_at DESC');
    return rows.map(rowToAnimal);
  },

  async getAnimalById(id: string, db: SQLiteDatabase = getDb()): Promise<Animal | null> {
    const row = await db.getFirstAsync<AnimalRow>('SELECT * FROM animals WHERE id = ?', [id]);
    return row ? rowToAnimal(row) : null;
  },

  async updateAnimal(a: Animal, db: SQLiteDatabase = getDb()): Promise<void> {
    // Fetch the previous image path so we can clean it up if it was replaced.
    const prev = await db.getFirstAsync<{ image_url: string }>(
      'SELECT image_url FROM animals WHERE id = ?',
      [a.id],
    );
    const r = await toRow(a);
    await db.runAsync(
      `UPDATE animals SET
        tag_number = ?, name = ?, species = ?, breed = ?, sex = ?, date_of_birth = ?,
        dob_is_estimated = ?, color = ?, repro_status = ?, lactation_number = ?,
        last_insemination_date = ?, mother_id = ?, child_number = ?,
        image_url = ?, notes = ?, updated_at = ?
       WHERE id = ?`,
      [
        r.tag_number, r.name, r.species, r.breed, r.sex, r.date_of_birth, r.dob_is_estimated,
        r.color, r.repro_status, r.lactation_number, r.last_insemination_date,
        r.mother_id, r.child_number, r.image_url, r.notes, nowIso(), a.id,
      ],
    );
    if (prev && prev.image_url && prev.image_url !== r.image_url) {
      await deleteAnimalImage(a.id).catch(() => {});
    }
  },

  async deleteAnimal(id: string, db: SQLiteDatabase = getDb()): Promise<void> {
    await db.runAsync('DELETE FROM animals WHERE id = ?', [id]);
    // Health records keep their (now null) animal_id; just remove the photo.
    await deleteAnimalImage(id).catch(() => {});
  },

  async searchAnimals(query: string, db: SQLiteDatabase = getDb()): Promise<Animal[]> {
    const q = `%${query.toLowerCase()}%`;
    const rows = await db.getAllAsync<AnimalRow>(
      `SELECT * FROM animals
       WHERE LOWER(tag_number) LIKE ? OR LOWER(name) LIKE ? OR LOWER(species) LIKE ?
       ORDER BY created_at DESC`,
      [q, q, q],
    );
    return rows.map(rowToAnimal);
  },

  async getAnimalsByStatus(status: string, db: SQLiteDatabase = getDb()): Promise<Animal[]> {
    const rows = await db.getAllAsync<AnimalRow>(
      'SELECT * FROM animals WHERE repro_status = ? ORDER BY created_at DESC',
      [status],
    );
    return rows.map(rowToAnimal);
  },

  async getAnimalsBySpecies(species: string, db: SQLiteDatabase = getDb()): Promise<Animal[]> {
    const rows = await db.getAllAsync<AnimalRow>(
      'SELECT * FROM animals WHERE species = ? ORDER BY created_at DESC',
      [species],
    );
    return rows.map(rowToAnimal);
  },

  /** Raw insert used by the AsyncStorage migration (no image processing). */
  async insertRaw(a: Animal, db: SQLiteDatabase = getDb()): Promise<void> {
    await db.runAsync(
      `INSERT OR IGNORE INTO animals (
        id, tag_number, name, species, breed, sex, date_of_birth, dob_is_estimated,
        color, repro_status, lactation_number, last_insemination_date,
        mother_id, child_number, image_url, notes, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        a.id, a.tag_number ?? '', a.name ?? 'Unknown', a.species, a.breed ?? '', a.sex,
        a.date_of_birth ?? '', a.dob_is_estimated ? 1 : 0, a.color ?? '', a.repro_status,
        a.lactation_number ?? null, a.last_insemination_date ?? null,
        a.mother_id ?? null, a.child_number ?? null, a.image_url ?? '',
        a.notes ?? '', a.created_at || nowIso(), a.updated_at ?? nowIso(),
      ],
    );
  },
};
