/**
 * Herdly — schema migrations.
 *
 * Versioning uses SQLite's `user_version` pragma (a single integer stored in the
 * database file). Each migration is applied only when the current version is
 * lower than the target, so the file survives app restarts, navigation, reboots
 * and normal updates — and never gets deleted or recreated.
 */
import type { SQLiteDatabase } from 'expo-sqlite';
import { uuid } from '../utils/uuid';

export const SCHEMA_VERSION = 2;

const SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS animals (
  id                  TEXT PRIMARY KEY NOT NULL,
  tag_number          TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL DEFAULT '',
  species             TEXT NOT NULL,
  breed               TEXT NOT NULL DEFAULT '',
  sex                 TEXT NOT NULL,
  date_of_birth       TEXT NOT NULL DEFAULT '',
  dob_is_estimated    INTEGER NOT NULL DEFAULT 0,
  color               TEXT NOT NULL DEFAULT '',
  repro_status        TEXT NOT NULL,
  lactation_number    TEXT,
  last_insemination_date TEXT,
  image_url           TEXT NOT NULL DEFAULT '',
  notes               TEXT NOT NULL DEFAULT '',
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS inseminations (
  id                  TEXT PRIMARY KEY NOT NULL,
  animal_id           TEXT REFERENCES animals(id) ON DELETE SET NULL,
  lactation_number    TEXT,
  ai_date             TEXT,
  semen_company       TEXT,
  bull_name           TEXT,
  pregnancy_check_date TEXT,
  pregnancy_status    TEXT,
  expected_calving_date TEXT,
  notes               TEXT,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS calvings (
  id                  TEXT PRIMARY KEY NOT NULL,
  animal_id           TEXT REFERENCES animals(id) ON DELETE SET NULL,
  insemination_id     TEXT REFERENCES inseminations(id) ON DELETE SET NULL,
  calving_date        TEXT,
  calf_tag            TEXT,
  calf_name           TEXT,
  calf_sex            TEXT,
  calf_weight_kg      REAL,
  complications       TEXT,
  notes               TEXT,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vaccinations (
  id                  TEXT PRIMARY KEY NOT NULL,
  animal_id           TEXT REFERENCES animals(id) ON DELETE SET NULL,
  vaccine_name        TEXT,
  date_given          TEXT,
  next_due_date       TEXT,
  administered_by     TEXT,
  notes               TEXT,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dewormings (
  id                  TEXT PRIMARY KEY NOT NULL,
  animal_id           TEXT REFERENCES animals(id) ON DELETE SET NULL,
  product_name        TEXT,
  date_given          TEXT,
  next_due_date       TEXT,
  dose_ml             TEXT,
  notes               TEXT,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY NOT NULL,
  value TEXT
);

CREATE INDEX IF NOT EXISTS idx_animals_tag      ON animals(tag_number);
CREATE INDEX IF NOT EXISTS idx_animals_repro    ON animals(repro_status);
CREATE INDEX IF NOT EXISTS idx_animals_species  ON animals(species);
CREATE INDEX IF NOT EXISTS idx_insem_animal     ON inseminations(animal_id);
CREATE INDEX IF NOT EXISTS idx_calv_animal      ON calvings(animal_id);
CREATE INDEX IF NOT EXISTS idx_calv_insem       ON calvings(insemination_id);
CREATE INDEX IF NOT EXISTS idx_vac_animal       ON vaccinations(animal_id);
CREATE INDEX IF NOT EXISTS idx_dew_animal       ON dewormings(animal_id);
`;

/**
 * Apply any pending migrations. Safe to call on every app launch.
 * @param db an already-opened SQLite database
 */
export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const current = row?.user_version ?? 0;

  if (current < 1) {
    await db.execAsync(SCHEMA_V1);
    await db.execAsync(`PRAGMA user_version = 1;`);
  }

  // Migration v2: Backfill calving records for calves registered without one.
  // This fixes data from the Register Animal screen which created the calf animal
  // but skipped the calving record.
  if (current < 2) {
    const calves = await db.getAllAsync<{
      id: string; tag_number: string; name: string; sex: string;
      date_of_birth: string; notes: string; created_at: string;
    }>(
      `SELECT id, tag_number, name, sex, date_of_birth, notes, created_at
       FROM animals WHERE repro_status = 'Calf'`
    );
    for (const calf of calves) {
      const existing = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM calvings WHERE calf_tag = ? LIMIT 1',
        [calf.tag_number],
      );
      if (existing) continue;

      // Extract mother tag from notes field ("Mother Tag: <tag>")
      const motherMatch = calf.notes?.match(/Mother Tag:\s*(.+)/);
      const motherTag = motherMatch?.[1]?.trim();
      let motherId: string | null = null;
      if (motherTag) {
        const mother = await db.getFirstAsync<{ id: string }>(
          'SELECT id FROM animals WHERE tag_number = ? LIMIT 1',
          [motherTag],
        );
        motherId = mother?.id ?? null;
      }

      await db.runAsync(
        `INSERT OR IGNORE INTO calvings (
          id, animal_id, insemination_id, calving_date, calf_tag, calf_name,
          calf_sex, calf_weight_kg, complications, notes, created_at, updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          uuid(), motherId, null, calf.date_of_birth || null,
          calf.tag_number, calf.name || null, calf.sex || null,
          null, '', '', calf.created_at || new Date().toISOString(),
          new Date().toISOString(),
        ],
      );
    }
    await db.execAsync(`PRAGMA user_version = 2;`);
  }

  // Future migrations:
  // if (current < 2) { await db.execAsync(...); await db.execAsync('PRAGMA user_version = 2;'); }
}
