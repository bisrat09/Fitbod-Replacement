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
  s: { id: string; weight?: number | null; reps?: number | null; rir?: number | null; tempo?: string | null; is_completed?: number | null }
){
  const ts = nowIso();
  await ctx.db.runAsync(
    `UPDATE sets SET weight=COALESCE(?,weight), reps=COALESCE(?,reps), rir=COALESCE(?,rir), tempo=COALESCE(?,tempo), is_completed=COALESCE(?,is_completed), updated_at=? WHERE id=? AND user_id=?`,
    [s.weight ?? null, s.reps ?? null, s.rir ?? null, s.tempo ?? null, s.is_completed ?? null, ts, s.id, ctx.userId]
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
