/**
 * One-time migration of legacy AsyncStorage data into SQLite.
 *
 * Idempotent & safe to run on every launch:
 *  - guarded by a `meta` flag (`async_migrated`), so it only performs the copy once
 *  - uses INSERT OR IGNORE keyed on the existing id, so an interrupted run can be
 *    resumed without creating duplicate records
 *  - the original AsyncStorage data is left untouched until the copy is confirmed
 *
 * Old image URIs (temporary expo-image-picker paths) are stored as-is; the UI
 * falls back to a placeholder when the file is no longer present.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Animal, Insemination, Calving, Vaccination, Deworming } from '../types';
import { animalRepository } from './repositories/animalRepository';
import { inseminationRepository } from './repositories/inseminationRepository';
import { calvingRepository } from './repositories/calvingRepository';
import { vaccinationRepository } from './repositories/vaccinationRepository';
import { dewormingRepository } from './repositories/dewormingRepository';

const LEGACY_KEYS = {
  animals: '@herdly/animals',
  inseminations: '@herdly/inseminations',
  calvings: '@herdly/calvings',
  vaccinations: '@herdly/vaccinations',
  dewormings: '@herdly/dewormings',
};

async function readLegacy<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

export async function migrateFromAsyncStorage(db: SQLiteDatabase): Promise<void> {
  const flag = await db.getFirstAsync<{ value: string }>("SELECT value FROM meta WHERE key = 'async_migrated'");
  if (flag?.value === '1') return; // already migrated

  const [animals, inseminations, calvings, vaccinations, dewormings] = await Promise.all([
    readLegacy<Animal>(LEGACY_KEYS.animals),
    readLegacy<Insemination>(LEGACY_KEYS.inseminations),
    readLegacy<Calving>(LEGACY_KEYS.calvings),
    readLegacy<Vaccination>(LEGACY_KEYS.vaccinations),
    readLegacy<Deworming>(LEGACY_KEYS.dewormings),
  ]);

  for (const a of animals) await animalRepository.insertRaw(a, db);
  for (const i of inseminations) await inseminationRepository.insertRaw(i, db);
  for (const c of calvings) await calvingRepository.insertRaw(c, db);
  for (const v of vaccinations) await vaccinationRepository.insertRaw(v, db);
  for (const d of dewormings) await dewormingRepository.insertRaw(d, db);

  await db.runAsync("INSERT OR REPLACE INTO meta (key, value) VALUES ('async_migrated', '1')");
}
