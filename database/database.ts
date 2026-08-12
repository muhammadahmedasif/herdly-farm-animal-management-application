/**
 * Herdly — SQLite database bootstrap.
 *
 * Opens a single on-device database (herdly.db), enables foreign keys, and runs
 * schema migrations exactly once. The connection is created lazily and cached so
 * every repository shares the same instance.
 */
import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';

let db: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Open (or return the cached) database and ensure the schema is current. */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const connection = await SQLite.openDatabaseAsync('herdly.db');
    // Foreign keys must be re-enabled on every new connection.
    await connection.execAsync('PRAGMA foreign_keys = ON;');
    await runMigrations(connection);
    db = connection;
    return connection;
  })();

  return initPromise;
}

/** Returns the initialized database. Throws if called before initDatabase(). */
export function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('Database accessed before initDatabase() completed.');
  }
  return db;
}

export function isDatabaseReady(): boolean {
  return db !== null;
}
