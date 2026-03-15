import { SQLiteDatabase } from 'expo-sqlite';

export type Ctx = { db: SQLiteDatabase; userId: string };

const nowIso = () => new Date().toISOString();

export async function ensureUser(
  ctx: Ctx,
  user: { id: string; email?: string | null; display_name?: string | null; unit?: 'lb' | 'kg' }
){
  const ts = nowIso();
  await ctx.db.runAsync(
    `INSERT OR IGNORE INTO users(id,email,display_name,unit,created_at,updated_at) VALUES (?,?,?,?,?,?)`,
    [user.id, user.email ?? null, user.display_name ?? null, user.unit ?? 'lb', ts, ts]
  );
}

// Settings helpers (key-value in settings table)
export async function getSetting(ctx: Ctx, key: string): Promise<string | null> {
  const row = await ctx.db.getFirstAsync<{ value: string }>(`SELECT value FROM settings WHERE user_id=? AND key=?`, [ctx.userId, key]);
  return row?.value ?? null;
}

export async function setSetting(ctx: Ctx, key: string, value: string) {
  await ctx.db.runAsync(
    `INSERT INTO settings(user_id,key,value) VALUES(?,?,?) ON CONFLICT(user_id,key) DO UPDATE SET value=excluded.value`,
    [ctx.userId, key, value]
  );
}

export async function deleteSetting(ctx: Ctx, key: string) {
  await ctx.db.runAsync(`DELETE FROM settings WHERE user_id=? AND key=?`, [ctx.userId, key]);
}

// Get today's in-progress workout (if any)
export async function getTodayWorkout(ctx: Ctx) {
  const today = new Date().toISOString().slice(0, 10);
  return ctx.db.getFirstAsync<any>(
    `SELECT * FROM workouts WHERE user_id=? AND date >= ? ORDER BY date DESC LIMIT 1`,
    [ctx.userId, today]
  );
}

export async function getUserUnit(ctx: Ctx): Promise<'lb' | 'kg'> {
  const row = await ctx.db.getFirstAsync<{ unit: string }>(
    `SELECT unit FROM users WHERE id=?`, [ctx.userId]
  );
  return (row?.unit === 'kg' ? 'kg' : 'lb');
}

export async function updateUserUnit(ctx: Ctx, unit: 'lb' | 'kg') {
  const ts = nowIso();
  await ctx.db.runAsync(
    `UPDATE users SET unit=?, updated_at=? WHERE id=?`,
    [unit, ts, ctx.userId]
  );
}

export async function createExercise(
  ctx: Ctx,
  ex: { id: string; name: string; modality?: string | null; muscle_groups: string; is_compound?: number; default_increment?: number; notes?: string | null; required_equipment?: string | null; tags?: string | null; video_url?: string | null }
){
  const ts = nowIso();
  await ctx.db.runAsync(
    `INSERT INTO exercises (id,user_id,name,modality,muscle_groups,is_compound,default_increment,notes,required_equipment,tags,video_url,is_archived,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,0,?,?)`,
    [
      ex.id,
      ctx.userId,
      ex.name,
      ex.modality ?? null,
      ex.muscle_groups,
      ex.is_compound ? 1 : 0,
      ex.default_increment ?? 2.5,
      ex.notes ?? null,
      ex.required_equipment ?? null,
      ex.tags ?? null,
      ex.video_url ?? null,
      ts,
      ts,
    ]
  );
}

export async function listExercises(ctx: Ctx, q?: string) {
  if (q && q.trim().length) {
    return ctx.db.getAllAsync(`SELECT * FROM exercises WHERE user_id=? AND name LIKE ? AND is_archived=0 ORDER BY name`, [ctx.userId, `%${q}%`]);
  }
  return ctx.db.getAllAsync(`SELECT * FROM exercises WHERE user_id=? AND is_archived=0 ORDER BY name`, [ctx.userId]);
}

export async function findExerciseByName(ctx: Ctx, name: string) {
  return ctx.db.getFirstAsync<any>(
    `SELECT * FROM exercises WHERE user_id=? AND name=? AND is_archived=0 LIMIT 1`,
    [ctx.userId, name]
  );
}

export async function createWorkout(
  ctx: Ctx,
  w: { id: string; date: string; split?: string | null; notes?: string | null }
){
  const ts = nowIso();
  await ctx.db.runAsync(
    `INSERT INTO workouts (id,user_id,date,split,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?)`,
    [w.id, ctx.userId, w.date, w.split ?? null, w.notes ?? null, ts, ts]
  );
}

export async function addSet(
  ctx: Ctx,
  s: { id: string; workout_id: string; exercise_id: string; set_index: number; weight?: number | null; reps?: number | null; rir?: number | null; tempo?: string | null; is_warmup?: number; block_id?: string | null; is_completed?: number }
){
  const ts = nowIso();
  await ctx.db.runAsync(
    `INSERT INTO sets (id,user_id,workout_id,exercise_id,set_index,weight,reps,rir,tempo,is_warmup,block_id,is_completed,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [s.id, ctx.userId, s.workout_id, s.exercise_id, s.set_index, s.weight ?? null, s.reps ?? null, s.rir ?? null, s.tempo ?? null, s.is_warmup ? 1 : 0, s.block_id ?? null, s.is_completed ?? 0, ts, ts]
  );
}

export async function listWorkoutSets(ctx: Ctx, workoutId: string) {
  return ctx.db.getAllAsync(
    `SELECT sets.*, exercises.name AS exercise_name FROM sets JOIN exercises ON sets.exercise_id = exercises.id WHERE sets.user_id=? AND sets.workout_id=? ORDER BY set_index`,
    [ctx.userId, workoutId]
  );
}

export async function latestExerciseTopSet(ctx: Ctx, exerciseId: string) {
  return ctx.db.getFirstAsync(
    `SELECT s.* FROM sets s JOIN workouts w ON w.id = s.workout_id WHERE s.user_id=? AND s.exercise_id=? AND s.is_warmup=0 ORDER BY w.date DESC, s.weight DESC, s.reps DESC LIMIT 1`,
    [ctx.userId, exerciseId]
  );
}

// New: Blocks & equipment
export async function createBlock(
  ctx: Ctx,
  b: { id: string; workout_id: string; kind: string; order_index: number; notes?: string | null }
){
  await ctx.db.runAsync(
    `INSERT INTO workout_blocks (id,user_id,workout_id,kind,order_index,notes) VALUES (?,?,?,?,?,?)`,
    [b.id, ctx.userId, b.workout_id, b.kind, b.order_index, b.notes ?? null]
  );
}

export async function addBlockExercise(
  ctx: Ctx,
  e: { id: string; block_id: string; exercise_id: string; order_index: number }
){
  await ctx.db.runAsync(
    `INSERT INTO block_exercises (id,user_id,block_id,exercise_id,order_index) VALUES (?,?,?,?,?)`,
    [e.id, ctx.userId, e.block_id, e.exercise_id, e.order_index]
  );
}

export async function listBlocksWithExercises(ctx: Ctx, workoutId: string) {
  // Select blocks with their first exercise (if any) and exercise name
  return ctx.db.getAllAsync(
    `SELECT
       wb.id,
       wb.kind,
       wb.order_index,
       wb.notes,
       (
         SELECT be.exercise_id FROM block_exercises be
         WHERE be.user_id=wb.user_id AND be.block_id=wb.id
         ORDER BY be.order_index ASC
         LIMIT 1
       ) AS exercise_id,
       (
         SELECT ex.name FROM exercises ex WHERE ex.id = (
           SELECT be2.exercise_id FROM block_exercises be2 WHERE be2.user_id=wb.user_id AND be2.block_id=wb.id ORDER BY be2.order_index ASC LIMIT 1
         )
       ) AS exercise_name
     FROM workout_blocks wb
     WHERE wb.user_id=? AND wb.workout_id=?
     ORDER BY wb.order_index ASC`,
    [ctx.userId, workoutId]
  );
}

export async function updateSet(
  ctx: Ctx,
  s: { id: string; weight?: number | null; reps?: number | null; rir?: number | null; tempo?: string | null; is_completed?: number | null; notes?: string | null }
){
  const ts = nowIso();
  await ctx.db.runAsync(
    `UPDATE sets SET weight=COALESCE(?,weight), reps=COALESCE(?,reps), rir=COALESCE(?,rir), tempo=COALESCE(?,tempo), is_completed=COALESCE(?,is_completed), notes=COALESCE(?,notes), updated_at=? WHERE id=? AND user_id=?`,
    [s.weight ?? null, s.reps ?? null, s.rir ?? null, s.tempo ?? null, s.is_completed ?? null, s.notes ?? null, ts, s.id, ctx.userId]
  );
}

// Equipment inventory
export async function addEquipment(ctx: Ctx, item: string) {
  await ctx.db.runAsync(
    `INSERT OR IGNORE INTO user_equipment(user_id,item) VALUES(?,?)`,
    [ctx.userId, item]
  );
}

// Sets indexing helper (next sequential index within a workout)
export async function getNextSetIndex(ctx: Ctx, workoutId: string) {
  const row = await ctx.db.getFirstAsync<{ n: number }>(
    `SELECT COALESCE(MAX(set_index),0)+1 AS n FROM sets WHERE user_id=? AND workout_id=?`,
    [ctx.userId, workoutId]
  );
  return row?.n ?? 1;
}

export async function removeEquipment(ctx: Ctx, item: string) {
  await ctx.db.runAsync(
    `DELETE FROM user_equipment WHERE user_id=? AND item=?`,
    [ctx.userId, item]
  );
}

export async function listEquipment(ctx: Ctx) {
  return ctx.db.getAllAsync<{ item: string }>(
    `SELECT item FROM user_equipment WHERE user_id=? ORDER BY item`,
    [ctx.userId]
  );
}

export async function getExercise(ctx: Ctx, id: string) {
  return ctx.db.getFirstAsync<any>(`SELECT * FROM exercises WHERE id=? AND user_id=?`, [id, ctx.userId]);
}

export async function listExercisesAvailableByEquipment(ctx: Ctx) {
  // Fetch exercises and user equipment; filter client-side for simplicity
  const [exercises, equipRows] = await Promise.all([
    ctx.db.getAllAsync<any>(`SELECT * FROM exercises WHERE user_id=? AND is_archived=0 ORDER BY name`, [ctx.userId]),
    listEquipment(ctx),
  ]);
  const equip = new Set(equipRows.map((e: any) => String(e.item)));
  return exercises.filter((ex: any) => {
    const req = (ex.required_equipment ?? '').trim();
    if (!req) return true;
    const items = req.split(',').map((s: string) => s.trim()).filter(Boolean);
    return items.every((it: string) => equip.has(it));
  });
}

export async function listBlockExercisesWithNames(ctx: Ctx, blockId: string) {
  return ctx.db.getAllAsync<any>(
    `SELECT be.*, ex.name AS exercise_name
     FROM block_exercises be
     JOIN exercises ex ON ex.id = be.exercise_id
     WHERE be.user_id=? AND be.block_id=?
     ORDER BY be.order_index ASC`,
    [ctx.userId, blockId]
  );
}

// Favorite exercises
export async function addFavoriteExercise(ctx: Ctx, exerciseId: string){
  await ctx.db.runAsync(`INSERT OR IGNORE INTO user_favorite_exercises(user_id,exercise_id) VALUES(?,?)`, [ctx.userId, exerciseId]);
}
export async function removeFavoriteExercise(ctx: Ctx, exerciseId: string){
  await ctx.db.runAsync(`DELETE FROM user_favorite_exercises WHERE user_id=? AND exercise_id=?`, [ctx.userId, exerciseId]);
}
export async function listFavoriteExerciseIds(ctx: Ctx){
  const rows = await ctx.db.getAllAsync<{exercise_id:string}>(`SELECT exercise_id FROM user_favorite_exercises WHERE user_id=?`, [ctx.userId]);
  return rows.map(r=>r.exercise_id);
}
export async function listFavoriteExercises(ctx: Ctx){
  return ctx.db.getAllAsync<any>(`SELECT ex.* FROM user_favorite_exercises f JOIN exercises ex ON ex.id=f.exercise_id WHERE f.user_id=? ORDER BY ex.name`, [ctx.userId]);
}

// Last-time preview: most recent completed working sets for an exercise (from any prior workout)
export async function lastWorkingSetsForExercise(ctx: Ctx, exerciseId: string, excludeWorkoutId?: string) {
  const excludeClause = excludeWorkoutId ? `AND s.workout_id != ?` : '';
  const params = excludeWorkoutId
    ? [ctx.userId, exerciseId, excludeWorkoutId]
    : [ctx.userId, exerciseId];
  // Find the most recent workout containing this exercise (excluding current)
  const topRow = await ctx.db.getFirstAsync<{ workout_id: string }>(
    `SELECT DISTINCT s.workout_id FROM sets s
     JOIN workouts w ON w.id = s.workout_id
     WHERE s.user_id=? AND s.exercise_id=? AND s.is_warmup=0 AND s.is_completed=1 ${excludeClause}
     ORDER BY w.date DESC LIMIT 1`,
    params
  );
  if (!topRow) return [];
  return ctx.db.getAllAsync<any>(
    `SELECT s.* FROM sets s WHERE s.user_id=? AND s.workout_id=? AND s.exercise_id=? AND s.is_warmup=0
     ORDER BY s.set_index ASC`,
    [ctx.userId, topRow.workout_id, exerciseId]
  );
}

// PR detection: upsert into metrics table
export async function upsertMetric(
  ctx: Ctx,
  m: { id: string; date: string; exercise_id: string; est_1rm: number; top_set_weight: number; top_set_reps: number }
) {
  const ts = nowIso();
  await ctx.db.runAsync(
    `INSERT INTO metrics (id,user_id,date,exercise_id,est_1rm,top_set_weight,top_set_reps,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET est_1rm=excluded.est_1rm, top_set_weight=excluded.top_set_weight, top_set_reps=excluded.top_set_reps, updated_at=excluded.updated_at`,
    [m.id, ctx.userId, m.date, m.exercise_id, m.est_1rm, m.top_set_weight, m.top_set_reps, ts, ts]
  );
}

// Get best est_1rm ever for an exercise
export async function getBestMetric(ctx: Ctx, exerciseId: string) {
  return ctx.db.getFirstAsync<{ est_1rm: number; top_set_weight: number; top_set_reps: number; date: string }>(
    `SELECT est_1rm, top_set_weight, top_set_reps, date FROM metrics
     WHERE user_id=? AND exercise_id=?
     ORDER BY est_1rm DESC LIMIT 1`,
    [ctx.userId, exerciseId]
  );
}

// History: list workout summaries (most recent first)
export async function listWorkoutSummaries(ctx: Ctx, limit: number = 50) {
  return ctx.db.getAllAsync<any>(
    `SELECT w.id, w.date, w.split, w.notes,
       COUNT(DISTINCT s.exercise_id) AS exercise_count,
       COUNT(s.id) AS total_sets,
       SUM(CASE WHEN s.is_warmup=0 AND s.is_completed=1 THEN 1 ELSE 0 END) AS working_sets,
       GROUP_CONCAT(DISTINCT ex.name) AS exercise_names
     FROM workouts w
     LEFT JOIN sets s ON s.workout_id = w.id AND s.user_id = w.user_id
     LEFT JOIN exercises ex ON ex.id = s.exercise_id
     WHERE w.user_id=?
     GROUP BY w.id
     ORDER BY w.date DESC
     LIMIT ?`,
    [ctx.userId, limit]
  );
}

// History detail: all sets for a specific workout
export async function listWorkoutDetail(ctx: Ctx, workoutId: string) {
  return ctx.db.getAllAsync<any>(
    `SELECT s.*, ex.name AS exercise_name, ex.muscle_groups
     FROM sets s
     JOIN exercises ex ON ex.id = s.exercise_id
     WHERE s.user_id=? AND s.workout_id=?
     ORDER BY s.set_index ASC`,
    [ctx.userId, workoutId]
  );
}

// Weekly volume: upsert hard sets per muscle group for a given week
export async function upsertWeeklyVolume(ctx: Ctx, weekStart: string, muscleGroup: string, hardSets: number) {
  const ts = nowIso();
  const id = `${ctx.userId}_${weekStart}_${muscleGroup}`;
  await ctx.db.runAsync(
    `INSERT INTO weekly_volume (id, user_id, week_start, muscle_group, hard_sets, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?)
     ON CONFLICT(user_id, week_start, muscle_group) DO UPDATE SET hard_sets=excluded.hard_sets, updated_at=excluded.updated_at`,
    [id, ctx.userId, weekStart, muscleGroup, hardSets, ts, ts]
  );
}

export async function getWeeklyVolume(ctx: Ctx, weekStart: string) {
  return ctx.db.getAllAsync<{ muscle_group: string; hard_sets: number }>(
    `SELECT muscle_group, hard_sets FROM weekly_volume WHERE user_id=? AND week_start=? ORDER BY muscle_group`,
    [ctx.userId, weekStart]
  );
}

// Count hard (non-warmup, completed) sets per muscle group for a week range
export async function computeWeeklyVolume(ctx: Ctx, weekStart: string, weekEnd: string) {
  const rows = await ctx.db.getAllAsync<any>(
    `SELECT ex.muscle_groups, COUNT(s.id) AS hard_sets
     FROM sets s
     JOIN exercises ex ON ex.id = s.exercise_id
     JOIN workouts w ON w.id = s.workout_id
     WHERE s.user_id=? AND s.is_warmup=0 AND s.is_completed=1
       AND w.date >= ? AND w.date < ?
     GROUP BY ex.muscle_groups`,
    [ctx.userId, weekStart, weekEnd]
  );
  // Expand comma-separated muscle_groups into individual counts
  const volume: Record<string, number> = {};
  for (const r of rows) {
    const groups = (r.muscle_groups || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    for (const mg of groups) {
      volume[mg] = (volume[mg] || 0) + r.hard_sets;
    }
  }
  return volume;
}

// Export all user data as a JSON-serializable object
export async function exportAllData(ctx: Ctx) {
  const [exercises, workouts, sets, equipment, favorites, metrics, volume] = await Promise.all([
    ctx.db.getAllAsync<any>(`SELECT * FROM exercises WHERE user_id=?`, [ctx.userId]),
    ctx.db.getAllAsync<any>(`SELECT * FROM workouts WHERE user_id=? ORDER BY date DESC`, [ctx.userId]),
    ctx.db.getAllAsync<any>(`SELECT * FROM sets WHERE user_id=? ORDER BY created_at DESC`, [ctx.userId]),
    listEquipment(ctx),
    listFavoriteExerciseIds(ctx),
    ctx.db.getAllAsync<any>(`SELECT * FROM metrics WHERE user_id=? ORDER BY date DESC`, [ctx.userId]),
    ctx.db.getAllAsync<any>(`SELECT * FROM weekly_volume WHERE user_id=? ORDER BY week_start DESC`, [ctx.userId]),
  ]);
  const user = await ctx.db.getFirstAsync<any>(`SELECT * FROM users WHERE id=?`, [ctx.userId]);
  return {
    exported_at: nowIso(),
    user,
    exercises,
    workouts,
    sets,
    equipment: equipment.map(e => e.item),
    favorite_exercise_ids: favorites,
    metrics,
    weekly_volume: volume,
  };
}

// Exercise recency: last workout date per exercise (for smart suggestions)
export async function exerciseRecency(ctx: Ctx) {
  return ctx.db.getAllAsync<{ exercise_id: string; last_used: string }>(
    `SELECT s.exercise_id, MAX(w.date) AS last_used
     FROM sets s
     JOIN workouts w ON w.id = s.workout_id
     WHERE s.user_id=? AND s.is_warmup=0
     GROUP BY s.exercise_id
     ORDER BY last_used ASC`,
    [ctx.userId]
  );
}

// Delete a single set
export async function deleteSet(ctx: Ctx, setId: string) {
  await ctx.db.runAsync(`DELETE FROM sets WHERE id=? AND user_id=?`, [setId, ctx.userId]);
}

// Delete a block and all its associated sets and block_exercises
export async function deleteBlock(ctx: Ctx, blockId: string) {
  await ctx.db.runAsync(`DELETE FROM sets WHERE user_id=? AND block_id=?`, [ctx.userId, blockId]);
  await ctx.db.runAsync(`DELETE FROM block_exercises WHERE user_id=? AND block_id=?`, [ctx.userId, blockId]);
  await ctx.db.runAsync(`DELETE FROM workout_blocks WHERE id=? AND user_id=?`, [blockId, ctx.userId]);
}

// Reorder blocks: swap order_index between two blocks
export async function swapBlockOrder(ctx: Ctx, blockIdA: string, blockIdB: string) {
  const a = await ctx.db.getFirstAsync<{ order_index: number }>(`SELECT order_index FROM workout_blocks WHERE id=? AND user_id=?`, [blockIdA, ctx.userId]);
  const b = await ctx.db.getFirstAsync<{ order_index: number }>(`SELECT order_index FROM workout_blocks WHERE id=? AND user_id=?`, [blockIdB, ctx.userId]);
  if (!a || !b) return;
  await ctx.db.runAsync(`UPDATE workout_blocks SET order_index=? WHERE id=? AND user_id=?`, [b.order_index, blockIdA, ctx.userId]);
  await ctx.db.runAsync(`UPDATE workout_blocks SET order_index=? WHERE id=? AND user_id=?`, [a.order_index, blockIdB, ctx.userId]);
}

// Delete a workout and all associated data
export async function deleteWorkout(ctx: Ctx, workoutId: string) {
  // Delete sets first (FK), then block_exercises, blocks, then workout
  await ctx.db.runAsync(`DELETE FROM sets WHERE user_id=? AND workout_id=?`, [ctx.userId, workoutId]);
  const blocks = await ctx.db.getAllAsync<{ id: string }>(`SELECT id FROM workout_blocks WHERE user_id=? AND workout_id=?`, [ctx.userId, workoutId]);
  for (const b of blocks) {
    await ctx.db.runAsync(`DELETE FROM block_exercises WHERE user_id=? AND block_id=?`, [ctx.userId, b.id]);
  }
  await ctx.db.runAsync(`DELETE FROM workout_blocks WHERE user_id=? AND workout_id=?`, [ctx.userId, workoutId]);
  await ctx.db.runAsync(`DELETE FROM workouts WHERE id=? AND user_id=?`, [workoutId, ctx.userId]);
}

// Import data from a JSON backup (merges with existing data using INSERT OR IGNORE)
export async function importData(ctx: Ctx, data: any) {
  const ts = nowIso();
  // Import exercises
  if (data.exercises) {
    for (const ex of data.exercises) {
      await ctx.db.runAsync(
        `INSERT OR IGNORE INTO exercises (id,user_id,name,modality,muscle_groups,is_compound,default_increment,notes,required_equipment,tags,video_url,is_archived,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [ex.id, ctx.userId, ex.name, ex.modality ?? null, ex.muscle_groups, ex.is_compound ?? 0, ex.default_increment ?? 2.5, ex.notes ?? null, ex.required_equipment ?? null, ex.tags ?? null, ex.video_url ?? null, ex.is_archived ?? 0, ex.created_at ?? ts, ex.updated_at ?? ts]
      );
    }
  }
  // Import workouts
  if (data.workouts) {
    for (const w of data.workouts) {
      await ctx.db.runAsync(
        `INSERT OR IGNORE INTO workouts (id,user_id,date,split,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?)`,
        [w.id, ctx.userId, w.date, w.split ?? null, w.notes ?? null, w.created_at ?? ts, w.updated_at ?? ts]
      );
    }
  }
  // Import sets
  if (data.sets) {
    for (const s of data.sets) {
      await ctx.db.runAsync(
        `INSERT OR IGNORE INTO sets (id,user_id,workout_id,exercise_id,set_index,weight,reps,rir,tempo,is_warmup,block_id,is_completed,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [s.id, ctx.userId, s.workout_id, s.exercise_id, s.set_index, s.weight ?? null, s.reps ?? null, s.rir ?? null, s.tempo ?? null, s.is_warmup ?? 0, s.block_id ?? null, s.is_completed ?? 0, s.created_at ?? ts, s.updated_at ?? ts]
      );
    }
  }
  // Import equipment
  if (data.equipment) {
    for (const item of data.equipment) {
      await ctx.db.runAsync(`INSERT OR IGNORE INTO user_equipment(user_id,item) VALUES(?,?)`, [ctx.userId, item]);
    }
  }
  // Import favorites
  if (data.favorite_exercise_ids) {
    for (const exId of data.favorite_exercise_ids) {
      await ctx.db.runAsync(`INSERT OR IGNORE INTO user_favorite_exercises(user_id,exercise_id) VALUES(?,?)`, [ctx.userId, exId]);
    }
  }
}

// Replace exercise in a block: update block_exercises and delete old sets
export async function replaceBlockExercise(
  ctx: Ctx,
  blockId: string,
  oldExerciseId: string,
  newExerciseId: string
) {
  await ctx.db.runAsync(
    `UPDATE block_exercises SET exercise_id=? WHERE user_id=? AND block_id=? AND exercise_id=?`,
    [newExerciseId, ctx.userId, blockId, oldExerciseId]
  );
  // Delete sets for the old exercise in this block
  await ctx.db.runAsync(
    `DELETE FROM sets WHERE user_id=? AND block_id=? AND exercise_id=?`,
    [ctx.userId, blockId, oldExerciseId]
  );
}

// ========== PROGRAMS ==========

export async function createProgram(ctx: Ctx, p: { id: string; name: string }) {
  const ts = nowIso();
  await ctx.db.runAsync(
    `INSERT INTO programs (id,user_id,name,is_active,created_at,updated_at) VALUES (?,?,?,1,?,?)`,
    [p.id, ctx.userId, p.name, ts, ts]
  );
}

export async function listPrograms(ctx: Ctx) {
  return ctx.db.getAllAsync<any>(`SELECT * FROM programs WHERE user_id=? ORDER BY created_at DESC`, [ctx.userId]);
}

export async function getActiveProgram(ctx: Ctx) {
  return ctx.db.getFirstAsync<any>(`SELECT * FROM programs WHERE user_id=? AND is_active=1 LIMIT 1`, [ctx.userId]);
}

export async function setActiveProgram(ctx: Ctx, programId: string) {
  await ctx.db.runAsync(`UPDATE programs SET is_active=0 WHERE user_id=?`, [ctx.userId]);
  await ctx.db.runAsync(`UPDATE programs SET is_active=1 WHERE id=? AND user_id=?`, [programId, ctx.userId]);
}

export async function deleteProgram(ctx: Ctx, programId: string) {
  // Cascade: delete exercises in days, then days, then program
  const days = await ctx.db.getAllAsync<{ id: string }>(`SELECT id FROM program_days WHERE user_id=? AND program_id=?`, [ctx.userId, programId]);
  for (const d of days) {
    await ctx.db.runAsync(`DELETE FROM program_day_exercises WHERE user_id=? AND program_day_id=?`, [ctx.userId, d.id]);
  }
  await ctx.db.runAsync(`DELETE FROM program_days WHERE user_id=? AND program_id=?`, [ctx.userId, programId]);
  await ctx.db.runAsync(`DELETE FROM programs WHERE id=? AND user_id=?`, [programId, ctx.userId]);
}

export async function addProgramDay(ctx: Ctx, d: { id: string; program_id: string; day_order: number; split: string }) {
  const ts = nowIso();
  await ctx.db.runAsync(
    `INSERT INTO program_days (id,user_id,program_id,day_order,split,created_at,updated_at) VALUES (?,?,?,?,?,?,?)`,
    [d.id, ctx.userId, d.program_id, d.day_order, d.split, ts, ts]
  );
}

export async function listProgramDays(ctx: Ctx, programId: string) {
  return ctx.db.getAllAsync<any>(`SELECT * FROM program_days WHERE user_id=? AND program_id=? ORDER BY day_order`, [ctx.userId, programId]);
}

export async function deleteProgramDay(ctx: Ctx, dayId: string) {
  await ctx.db.runAsync(`DELETE FROM program_day_exercises WHERE user_id=? AND program_day_id=?`, [ctx.userId, dayId]);
  await ctx.db.runAsync(`DELETE FROM program_days WHERE id=? AND user_id=?`, [dayId, ctx.userId]);
}

export async function addProgramDayExercise(ctx: Ctx, e: { id: string; program_day_id: string; exercise_id: string; target_sets?: number; target_reps_min?: number; target_reps_max?: number; target_rir?: number }) {
  const ts = nowIso();
  await ctx.db.runAsync(
    `INSERT INTO program_day_exercises (id,user_id,program_day_id,exercise_id,target_reps_min,target_reps_max,target_sets,target_rir,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [e.id, ctx.userId, e.program_day_id, e.exercise_id, e.target_reps_min ?? null, e.target_reps_max ?? null, e.target_sets ?? 3, e.target_rir ?? 2, ts, ts]
  );
}

export async function listProgramDayExercises(ctx: Ctx, dayId: string) {
  return ctx.db.getAllAsync<any>(
    `SELECT pde.*, ex.name AS exercise_name, ex.muscle_groups
     FROM program_day_exercises pde
     JOIN exercises ex ON ex.id = pde.exercise_id
     WHERE pde.user_id=? AND pde.program_day_id=?
     ORDER BY pde.created_at`,
    [ctx.userId, dayId]
  );
}

export async function removeProgramDayExercise(ctx: Ctx, id: string) {
  await ctx.db.runAsync(`DELETE FROM program_day_exercises WHERE id=? AND user_id=?`, [id, ctx.userId]);
}

// Get the next program day based on last workout's split
export async function getNextProgramDay(ctx: Ctx, programId: string) {
  // Find the last workout split
  const lastWorkout = await ctx.db.getFirstAsync<{ split: string }>(
    `SELECT split FROM workouts WHERE user_id=? ORDER BY date DESC LIMIT 1`,
    [ctx.userId]
  );
  const days = await listProgramDays(ctx, programId);
  if (days.length === 0) return null;
  if (!lastWorkout?.split) return days[0];
  // Find the day after the last split
  const lastIdx = days.findIndex((d: any) => d.split === lastWorkout.split);
  const nextIdx = lastIdx >= 0 ? (lastIdx + 1) % days.length : 0;
  return days[nextIdx];
}

// ========== PROGRESS / METRICS ==========

// Get 1RM history for an exercise (for progress tracking)
export async function getMetricHistory(ctx: Ctx, exerciseId: string, limit: number = 20) {
  return ctx.db.getAllAsync<any>(
    `SELECT date, est_1rm, top_set_weight, top_set_reps FROM metrics
     WHERE user_id=? AND exercise_id=?
     ORDER BY date DESC LIMIT ?`,
    [ctx.userId, exerciseId, limit]
  );
}

// Update workout notes
export async function updateWorkoutNotes(ctx: Ctx, workoutId: string, notes: string) {
  const ts = nowIso();
  await ctx.db.runAsync(`UPDATE workouts SET notes=?, updated_at=? WHERE id=? AND user_id=?`, [notes, ts, workoutId, ctx.userId]);
}

// Get workout notes
export async function getWorkoutNotes(ctx: Ctx, workoutId: string): Promise<string> {
  const row = await ctx.db.getFirstAsync<{ notes: string }>(`SELECT notes FROM workouts WHERE id=? AND user_id=?`, [workoutId, ctx.userId]);
  return row?.notes ?? '';
}

// Streak: count consecutive days with workouts ending today
export async function getWorkoutStreak(ctx: Ctx): Promise<number> {
  const rows = await ctx.db.getAllAsync<{ day: string }>(
    `SELECT DISTINCT substr(date, 1, 10) AS day FROM workouts WHERE user_id=? ORDER BY day DESC LIMIT 60`,
    [ctx.userId]
  );
  if (rows.length === 0) return 0;
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < rows.length; i++) {
    const expected = new Date(today);
    expected.setDate(today.getDate() - i);
    const expectedStr = expected.toISOString().slice(0, 10);
    if (rows[i].day === expectedStr) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// Workouts this week (Mon-Sun)
export async function getWorkoutsThisWeek(ctx: Ctx): Promise<number> {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d);
  mon.setDate(diff);
  const weekStart = mon.toISOString().slice(0, 10);
  const row = await ctx.db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM workouts WHERE user_id=? AND date >= ?`,
    [ctx.userId, weekStart]
  );
  return row?.n ?? 0;
}

// Enhanced workout summaries with volume and muscle groups
export async function listWorkoutSummariesEnhanced(ctx: Ctx, limit: number = 50) {
  return ctx.db.getAllAsync<any>(
    `SELECT w.id, w.date, w.split, w.notes, w.duration_seconds,
       COUNT(DISTINCT s.exercise_id) AS exercise_count,
       COUNT(s.id) AS total_sets,
       SUM(CASE WHEN s.is_warmup=0 AND s.is_completed=1 THEN 1 ELSE 0 END) AS working_sets,
       SUM(CASE WHEN s.is_warmup=0 AND s.is_completed=1 THEN COALESCE(s.weight,0) * COALESCE(s.reps,0) ELSE 0 END) AS total_volume,
       GROUP_CONCAT(DISTINCT ex.name) AS exercise_names,
       GROUP_CONCAT(DISTINCT ex.muscle_groups) AS all_muscle_groups
     FROM workouts w
     LEFT JOIN sets s ON s.workout_id = w.id AND s.user_id = w.user_id
     LEFT JOIN exercises ex ON ex.id = s.exercise_id
     WHERE w.user_id=?
     GROUP BY w.id
     ORDER BY w.date DESC
     LIMIT ?`,
    [ctx.userId, limit]
  );
}

// Get exercises that have metrics (for progress screen)
export async function listExercisesWithMetrics(ctx: Ctx) {
  return ctx.db.getAllAsync<any>(
    `SELECT DISTINCT ex.id, ex.name, ex.muscle_groups,
       (SELECT MAX(m.est_1rm) FROM metrics m WHERE m.exercise_id=ex.id AND m.user_id=ex.user_id) AS best_1rm,
       (SELECT COUNT(*) FROM metrics m2 WHERE m2.exercise_id=ex.id AND m2.user_id=ex.user_id) AS metric_count
     FROM exercises ex
     JOIN metrics met ON met.exercise_id=ex.id AND met.user_id=ex.user_id
     WHERE ex.user_id=?
     ORDER BY ex.name`,
    [ctx.userId]
  );
}

// ========== ITERATION 11 ==========

// Repeat a past workout: copy structure (blocks + exercises) into a new workout with fresh sets
export async function repeatWorkout(ctx: Ctx, sourceWorkoutId: string, newWorkoutId: string, newDate: string) {
  const ts = nowIso();
  // Get source workout
  const src = await ctx.db.getFirstAsync<any>(`SELECT * FROM workouts WHERE id=? AND user_id=?`, [sourceWorkoutId, ctx.userId]);
  if (!src) return;
  // Create new workout
  await ctx.db.runAsync(
    `INSERT INTO workouts (id,user_id,date,split,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?)`,
    [newWorkoutId, ctx.userId, newDate, src.split ?? null, null, ts, ts]
  );
  // Copy blocks
  const blocks = await ctx.db.getAllAsync<any>(
    `SELECT * FROM workout_blocks WHERE user_id=? AND workout_id=? ORDER BY order_index`,
    [ctx.userId, sourceWorkoutId]
  );
  let setIdx = 1;
  for (const b of blocks) {
    const newBlockId = `${newWorkoutId}_b${b.order_index}`;
    await ctx.db.runAsync(
      `INSERT INTO workout_blocks (id,user_id,workout_id,kind,order_index,notes) VALUES (?,?,?,?,?,?)`,
      [newBlockId, ctx.userId, newWorkoutId, b.kind, b.order_index, b.notes]
    );
    // Copy block exercises
    const blockExs = await ctx.db.getAllAsync<any>(
      `SELECT * FROM block_exercises WHERE user_id=? AND block_id=? ORDER BY order_index`,
      [ctx.userId, b.id]
    );
    for (const be of blockExs) {
      const newBeId = `${newBlockId}_e${be.order_index}`;
      await ctx.db.runAsync(
        `INSERT INTO block_exercises (id,user_id,block_id,exercise_id,order_index) VALUES (?,?,?,?,?)`,
        [newBeId, ctx.userId, newBlockId, be.exercise_id, be.order_index]
      );
      // Copy working sets (not warmups), use last top set weight or original weight
      const srcSets = await ctx.db.getAllAsync<any>(
        `SELECT * FROM sets WHERE user_id=? AND block_id=? AND exercise_id=? AND is_warmup=0 ORDER BY set_index`,
        [ctx.userId, b.id, be.exercise_id]
      );
      const lastTop = await ctx.db.getFirstAsync<any>(
        `SELECT s.* FROM sets s JOIN workouts w ON w.id=s.workout_id WHERE s.user_id=? AND s.exercise_id=? AND s.is_warmup=0 ORDER BY w.date DESC, s.weight DESC LIMIT 1`,
        [ctx.userId, be.exercise_id]
      );
      for (const s of srcSets) {
        const newSetId = `${newBlockId}_s${setIdx}`;
        await ctx.db.runAsync(
          `INSERT INTO sets (id,user_id,workout_id,exercise_id,set_index,weight,reps,rir,tempo,is_warmup,block_id,is_completed,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,0,?,0,?,?)`,
          [newSetId, ctx.userId, newWorkoutId, be.exercise_id, setIdx, lastTop?.weight ?? s.weight, s.reps, s.rir, s.tempo ?? null, newBlockId, ts, ts]
        );
        setIdx++;
      }
    }
  }
}

// Duplicate a block within the same workout
export async function duplicateBlock(ctx: Ctx, blockId: string, workoutId: string) {
  const ts = nowIso();
  // Get source block
  const src = await ctx.db.getFirstAsync<any>(
    `SELECT * FROM workout_blocks WHERE id=? AND user_id=?`, [blockId, ctx.userId]
  );
  if (!src) return;
  // Get max order_index
  const maxRow = await ctx.db.getFirstAsync<{ mx: number }>(
    `SELECT COALESCE(MAX(order_index),0) AS mx FROM workout_blocks WHERE user_id=? AND workout_id=?`,
    [ctx.userId, workoutId]
  );
  const newOrder = (maxRow?.mx ?? 0) + 1;
  const newBlockId = `${blockId}_dup${newOrder}`;
  await ctx.db.runAsync(
    `INSERT INTO workout_blocks (id,user_id,workout_id,kind,order_index,notes) VALUES (?,?,?,?,?,?)`,
    [newBlockId, ctx.userId, workoutId, src.kind, newOrder, src.notes]
  );
  // Copy block exercises
  const blockExs = await ctx.db.getAllAsync<any>(
    `SELECT * FROM block_exercises WHERE user_id=? AND block_id=? ORDER BY order_index`,
    [ctx.userId, blockId]
  );
  let nextIdx = await ctx.db.getFirstAsync<{ n: number }>(
    `SELECT COALESCE(MAX(set_index),0)+1 AS n FROM sets WHERE user_id=? AND workout_id=?`,
    [ctx.userId, workoutId]
  );
  let setIdx = nextIdx?.n ?? 1;
  for (const be of blockExs) {
    const newBeId = `${newBlockId}_e${be.order_index}`;
    await ctx.db.runAsync(
      `INSERT INTO block_exercises (id,user_id,block_id,exercise_id,order_index) VALUES (?,?,?,?,?)`,
      [newBeId, ctx.userId, newBlockId, be.exercise_id, be.order_index]
    );
    // Copy sets (uncompleted)
    const srcSets = await ctx.db.getAllAsync<any>(
      `SELECT * FROM sets WHERE user_id=? AND block_id=? AND exercise_id=? AND is_warmup=0 ORDER BY set_index`,
      [ctx.userId, blockId, be.exercise_id]
    );
    for (const s of srcSets) {
      const newSetId = `${newBlockId}_s${setIdx}`;
      await ctx.db.runAsync(
        `INSERT INTO sets (id,user_id,workout_id,exercise_id,set_index,weight,reps,rir,tempo,is_warmup,block_id,is_completed,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,0,?,0,?,?)`,
        [newSetId, ctx.userId, workoutId, be.exercise_id, setIdx, s.weight, s.reps, s.rir, s.tempo ?? null, newBlockId, ts, ts]
      );
      setIdx++;
    }
  }
  return newBlockId;
}

// Check if a set was a PR at the time it was logged
export async function getSetPRStatus(ctx: Ctx, workoutId: string) {
  // Get all completed working sets for this workout with their est_1rm
  const sets = await ctx.db.getAllAsync<any>(
    `SELECT s.id, s.exercise_id, s.weight, s.reps, ex.name AS exercise_name
     FROM sets s JOIN exercises ex ON ex.id=s.exercise_id
     WHERE s.user_id=? AND s.workout_id=? AND s.is_warmup=0 AND s.is_completed=1 AND s.weight>0 AND s.reps>0`,
    [ctx.userId, workoutId]
  );
  // For each set, check if its est_1rm matches the best ever for that exercise
  const prSetIds = new Set<string>();
  for (const s of sets) {
    const est = s.weight * (1 + s.reps / 30); // Epley inline
    const best = await ctx.db.getFirstAsync<{ est_1rm: number }>(
      `SELECT MAX(est_1rm) AS est_1rm FROM metrics WHERE user_id=? AND exercise_id=?`,
      [ctx.userId, s.exercise_id]
    );
    if (best && Math.abs(est - best.est_1rm) < 0.1) {
      prSetIds.add(s.id);
    }
  }
  return prSetIds;
}

// ========== ITERATION 13 ==========

// Save current workout as a program template
export async function saveWorkoutAsTemplate(ctx: Ctx, workoutId: string, programName: string, programId: string) {
  const ts = nowIso();
  const workout = await ctx.db.getFirstAsync<any>(`SELECT * FROM workouts WHERE id=? AND user_id=?`, [workoutId, ctx.userId]);
  if (!workout) return;
  // Create program
  await ctx.db.runAsync(
    `INSERT INTO programs (id,user_id,name,is_active,created_at,updated_at) VALUES (?,?,?,0,?,?)`,
    [programId, ctx.userId, programName, ts, ts]
  );
  // Create single day
  const dayId = `${programId}_day1`;
  await ctx.db.runAsync(
    `INSERT INTO program_days (id,user_id,program_id,day_order,split,created_at,updated_at) VALUES (?,?,?,1,?,?,?)`,
    [dayId, ctx.userId, programId, workout.split ?? 'full', ts, ts]
  );
  // Get blocks and exercises
  const blocks = await ctx.db.getAllAsync<any>(
    `SELECT * FROM workout_blocks WHERE user_id=? AND workout_id=? ORDER BY order_index`,
    [ctx.userId, workoutId]
  );
  for (const b of blocks) {
    const blockExs = await ctx.db.getAllAsync<any>(
      `SELECT be.exercise_id, COUNT(s.id) AS set_count,
         AVG(CASE WHEN s.is_warmup=0 THEN s.reps END) AS avg_reps,
         AVG(CASE WHEN s.is_warmup=0 THEN s.rir END) AS avg_rir
       FROM block_exercises be
       LEFT JOIN sets s ON s.block_id=be.block_id AND s.exercise_id=be.exercise_id AND s.user_id=be.user_id
       WHERE be.user_id=? AND be.block_id=?
       GROUP BY be.exercise_id
       ORDER BY be.order_index`,
      [ctx.userId, b.id]
    );
    for (const ex of blockExs) {
      const pdeId = `${dayId}_${ex.exercise_id}`;
      await ctx.db.runAsync(
        `INSERT INTO program_day_exercises (id,user_id,program_day_id,exercise_id,target_reps_min,target_reps_max,target_sets,target_rir,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [pdeId, ctx.userId, dayId, ex.exercise_id, Math.round(ex.avg_reps ?? 8), Math.round(ex.avg_reps ?? 8), ex.set_count ?? 3, Math.round(ex.avg_rir ?? 2), ts, ts]
      );
    }
  }
}

// Archive / unarchive exercises
export async function archiveExercise(ctx: Ctx, exerciseId: string) {
  const ts = nowIso();
  await ctx.db.runAsync(`UPDATE exercises SET is_archived=1, updated_at=? WHERE id=? AND user_id=?`, [ts, exerciseId, ctx.userId]);
}

export async function unarchiveExercise(ctx: Ctx, exerciseId: string) {
  const ts = nowIso();
  await ctx.db.runAsync(`UPDATE exercises SET is_archived=0, updated_at=? WHERE id=? AND user_id=?`, [ts, exerciseId, ctx.userId]);
}

export async function listArchivedExercises(ctx: Ctx) {
  return ctx.db.getAllAsync<any>(`SELECT * FROM exercises WHERE user_id=? AND is_archived=1 ORDER BY name`, [ctx.userId]);
}

// Best set per exercise in a workout (highest est 1RM)
export async function getBestSetsInWorkout(ctx: Ctx, workoutId: string) {
  const sets = await ctx.db.getAllAsync<any>(
    `SELECT s.id, s.exercise_id, s.weight, s.reps FROM sets s
     WHERE s.user_id=? AND s.workout_id=? AND s.is_warmup=0 AND s.is_completed=1 AND s.weight>0 AND s.reps>0`,
    [ctx.userId, workoutId]
  );
  // Group by exercise, find max est_1rm
  const bestByEx: Record<string, { id: string; est: number }> = {};
  for (const s of sets) {
    const est = s.weight * (1 + s.reps / 30);
    if (!bestByEx[s.exercise_id] || est > bestByEx[s.exercise_id].est) {
      bestByEx[s.exercise_id] = { id: s.id, est };
    }
  }
  return new Set(Object.values(bestByEx).map(v => v.id));
}

// ========== ITERATION 12 ==========

// Body weight tracking
export async function logBodyWeight(ctx: Ctx, entry: { id: string; date: string; weight: number }) {
  const ts = nowIso();
  await ctx.db.runAsync(
    `INSERT INTO body_weight (id,user_id,date,weight,created_at) VALUES (?,?,?,?,?)`,
    [entry.id, ctx.userId, entry.date, entry.weight, ts]
  );
}

export async function getBodyWeightHistory(ctx: Ctx, limit: number = 30) {
  return ctx.db.getAllAsync<{ id: string; date: string; weight: number }>(
    `SELECT id, date, weight FROM body_weight WHERE user_id=? ORDER BY date DESC LIMIT ?`,
    [ctx.userId, limit]
  );
}

export async function getLatestBodyWeight(ctx: Ctx) {
  return ctx.db.getFirstAsync<{ weight: number; date: string }>(
    `SELECT weight, date FROM body_weight WHERE user_id=? ORDER BY date DESC LIMIT 1`,
    [ctx.userId]
  );
}

export async function deleteBodyWeight(ctx: Ctx, id: string) {
  await ctx.db.runAsync(`DELETE FROM body_weight WHERE id=? AND user_id=?`, [id, ctx.userId]);
}

// Calendar: get workout dates for a given month (YYYY-MM)
export async function getWorkoutDatesForMonth(ctx: Ctx, yearMonth: string) {
  const start = `${yearMonth}-01`;
  // Get last day of month
  const [y, m] = yearMonth.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${yearMonth}-${String(lastDay).padStart(2, '0')}T23:59:59`;
  const rows = await ctx.db.getAllAsync<{ day: string }>(
    `SELECT DISTINCT substr(date, 1, 10) AS day FROM workouts WHERE user_id=? AND date >= ? AND date <= ? ORDER BY day`,
    [ctx.userId, start, end]
  );
  return rows.map(r => r.day);
}

// Lifetime stats
export async function getLifetimeStats(ctx: Ctx) {
  const [workoutCount, setCount, volumeRow, topExercise, streakDays] = await Promise.all([
    ctx.db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM workouts WHERE user_id=?`, [ctx.userId]),
    ctx.db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM sets WHERE user_id=? AND is_warmup=0 AND is_completed=1`, [ctx.userId]),
    ctx.db.getFirstAsync<{ vol: number }>(`SELECT COALESCE(SUM(weight * reps), 0) AS vol FROM sets WHERE user_id=? AND is_warmup=0 AND is_completed=1`, [ctx.userId]),
    ctx.db.getFirstAsync<{ name: string; cnt: number }>(
      `SELECT ex.name, COUNT(s.id) AS cnt FROM sets s JOIN exercises ex ON ex.id=s.exercise_id WHERE s.user_id=? AND s.is_warmup=0 AND s.is_completed=1 GROUP BY s.exercise_id ORDER BY cnt DESC LIMIT 1`,
      [ctx.userId]
    ),
    getWorkoutStreak(ctx),
  ]);
  return {
    totalWorkouts: workoutCount?.n ?? 0,
    totalSets: setCount?.n ?? 0,
    totalVolume: volumeRow?.vol ?? 0,
    mostTrainedExercise: topExercise?.name ?? null,
    currentStreak: streakDays,
  };
}

// Update workout duration
export async function updateWorkoutDuration(ctx: Ctx, workoutId: string, durationSeconds: number) {
  const ts = nowIso();
  await ctx.db.runAsync(`UPDATE workouts SET duration_seconds=?, updated_at=? WHERE id=? AND user_id=?`, [durationSeconds, ts, workoutId, ctx.userId]);
}

// Exercise stats: best 1RM, best weight, total completed sets
export async function getExerciseStats(ctx: Ctx, exerciseId: string) {
  const [best, topWeight, setCount] = await Promise.all([
    ctx.db.getFirstAsync<{ est_1rm: number }>(
      `SELECT MAX(est_1rm) AS est_1rm FROM metrics WHERE user_id=? AND exercise_id=?`, [ctx.userId, exerciseId]
    ),
    ctx.db.getFirstAsync<{ weight: number }>(
      `SELECT MAX(weight) AS weight FROM sets WHERE user_id=? AND exercise_id=? AND is_warmup=0 AND is_completed=1`, [ctx.userId, exerciseId]
    ),
    ctx.db.getFirstAsync<{ n: number }>(
      `SELECT COUNT(*) AS n FROM sets WHERE user_id=? AND exercise_id=? AND is_warmup=0 AND is_completed=1`, [ctx.userId, exerciseId]
    ),
  ]);
  return {
    bestEst1RM: best?.est_1rm ?? null,
    bestWeight: topWeight?.weight ?? null,
    totalSets: setCount?.n ?? 0,
  };
}

// All exercise stats in one query (for exercises screen)
export async function getAllExerciseStats(ctx: Ctx) {
  return ctx.db.getAllAsync<any>(
    `SELECT ex.id,
       (SELECT MAX(m.est_1rm) FROM metrics m WHERE m.exercise_id=ex.id AND m.user_id=ex.user_id) AS best_1rm,
       (SELECT MAX(s.weight) FROM sets s WHERE s.exercise_id=ex.id AND s.user_id=ex.user_id AND s.is_warmup=0 AND s.is_completed=1) AS best_weight,
       (SELECT COUNT(*) FROM sets s2 WHERE s2.exercise_id=ex.id AND s2.user_id=ex.user_id AND s2.is_warmup=0 AND s2.is_completed=1) AS total_sets
     FROM exercises ex WHERE ex.user_id=? AND ex.is_archived=0`,
    [ctx.userId]
  );
}

// Get most recent workout ID (for quick-start)
export async function getMostRecentWorkoutId(ctx: Ctx): Promise<string | null> {
  const row = await ctx.db.getFirstAsync<{ id: string }>(
    `SELECT id FROM workouts WHERE user_id=? ORDER BY date DESC LIMIT 1`, [ctx.userId]
  );
  return row?.id ?? null;
}
