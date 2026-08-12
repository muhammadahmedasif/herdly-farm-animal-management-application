/**
 * Database layer entry point.
 *
 * The app (StoreContext) only talks to this module + the repositories. Screens
 * never import SQLite directly, so the storage engine can later be swapped for a
 * cloud-backed implementation without touching the UI.
 */
export { initDatabase, getDb, isDatabaseReady } from './database';
export { migrateFromAsyncStorage } from './asyncStorageMigration';
export { animalRepository } from './repositories/animalRepository';
export { inseminationRepository } from './repositories/inseminationRepository';
export { calvingRepository } from './repositories/calvingRepository';
export { vaccinationRepository } from './repositories/vaccinationRepository';
export { dewormingRepository } from './repositories/dewormingRepository';
export { persistAnimalImage, deleteAnimalImage, isManagedUri } from './imageStorage';
