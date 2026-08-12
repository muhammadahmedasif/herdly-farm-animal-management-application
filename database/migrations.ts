/**
 * Herdly — schema migrations.
 *
 * Versioning uses SQLite's `user_version` pragma (a single integer stored in the
 * database file). Each migration is applied only when the current version is
 * lower than the target, so the file survives app restarts, navigation, reboots
 * and normal updates — and never gets deleted or recreated.
 */
import type { SQLiteDatabase } from 'expo-sqlite';

export const SCHEMA_VERSION = 1;

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

  // Future migrations:
  // if (current < 2) { await db.execAsync(...); await db.execAsync('PRAGMA user_version = 2;'); }
}
