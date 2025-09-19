import * as SQLite from 'expo-sqlite';
import { applyPendingMigrations } from '@/lib/migrations';

export type DB = SQLite.SQLiteDatabase;

export async function openDb() {
  const db = await SQLite.openDatabaseAsync('fitlog.db');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  return db;
}

let migratePromise: Promise<void> | null = null;

export async function migrate(db: DB, schemaSql: string) {
  if (migratePromise) return migratePromise;
  migratePromise = (async () => {
    // Ensure base schema exists
    await db.execAsync(schemaSql);
    // Apply incremental migrations to bump schema_version
    await applyPendingMigrations(db);
  })();
  try {
    await migratePromise;
  } finally {
    // Keep the resolved promise cached so future callers don't re-run
    // (do not reset to null)
  }
}
