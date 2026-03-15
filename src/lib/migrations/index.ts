import type { DB } from '@/lib/db';
import sql002 from './002_fitbod_blocks_equipment';
import sql003 from './003_sets_completed';
import sql004 from './004_favorite_exercises';
import sql005 from './005_set_notes';
import sql006 from './006_body_weight';
import sql007 from './007_workout_duration';

async function getSchemaVersion(db: DB): Promise<number> {
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM app_meta WHERE key='schema_version'`
  );
  const v = row?.value ? parseInt(row.value, 10) : 1;
  return isNaN(v) ? 1 : v;
}

async function setSchemaVersion(db: DB, v: number) {
  await db.runAsync(
    `INSERT INTO app_meta(key, value) VALUES('schema_version', ?) 
     ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
    [String(v)]
  );
}

export async function applyPendingMigrations(db: DB) {
  const current = await getSchemaVersion(db);
  if (current < 2) {
    await db.execAsync(sql002);
    await setSchemaVersion(db, 2);
  }
  if (current < 3) {
    await db.execAsync(sql003);
    await setSchemaVersion(db, 3);
  }
  if (current < 4) {
    await db.execAsync(sql004);
    await setSchemaVersion(db, 4);
  }
  if (current < 5) {
    await db.execAsync(sql005);
    await setSchemaVersion(db, 5);
  }
  if (current < 6) {
    await db.execAsync(sql006);
    await setSchemaVersion(db, 6);
  }
  if (current < 7) {
    await db.execAsync(sql007);
    await setSchemaVersion(db, 7);
  }
}
