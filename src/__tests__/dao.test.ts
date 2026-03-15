import { createMockDb, createCtx } from './helpers';
import {
  ensureUser, getSetting, setSetting, deleteSetting, getTodayWorkout,
  getUserUnit, updateUserUnit, createExercise, listExercises, findExerciseByName,
  createWorkout, addSet, listWorkoutSets, latestExerciseTopSet,
  createBlock, addBlockExercise, listBlocksWithExercises, updateSet,
  addEquipment, getNextSetIndex, removeEquipment, listEquipment,
  getExercise, listExercisesAvailableByEquipment, listBlockExercisesWithNames,
  addFavoriteExercise, removeFavoriteExercise, listFavoriteExerciseIds, listFavoriteExercises,
  lastWorkingSetsForExercise, upsertMetric, getBestMetric,
  listWorkoutSummaries, listWorkoutDetail,
  upsertWeeklyVolume, getWeeklyVolume, computeWeeklyVolume,
  exportAllData, exerciseRecency, deleteSet, deleteBlock, swapBlockOrder,
  deleteWorkout, importData, replaceBlockExercise,
  createProgram, listPrograms, getActiveProgram, setActiveProgram, deleteProgram,
  addProgramDay, listProgramDays, deleteProgramDay,
  addProgramDayExercise, listProgramDayExercises, removeProgramDayExercise, getNextProgramDay,
  getMetricHistory, updateWorkoutNotes, getWorkoutNotes,
  getWorkoutStreak, getWorkoutsThisWeek, listWorkoutSummariesEnhanced,
  listExercisesWithMetrics,
  repeatWorkout, duplicateBlock, getSetPRStatus,
  logBodyWeight, getBodyWeightHistory, getLatestBodyWeight, deleteBodyWeight,
  getWorkoutDatesForMonth, getLifetimeStats,
} from '@/lib/dao';

let mockDb: ReturnType<typeof createMockDb>;
let ctx: ReturnType<typeof createCtx>;

beforeEach(() => {
  mockDb = createMockDb();
  ctx = createCtx(mockDb);
});

// ============================================================
// Iteration 1: Core user management
// ============================================================
describe('ensureUser', () => {
  test('inserts user with INSERT OR IGNORE', async () => {
    await ensureUser(ctx, { id: 'u1', display_name: 'Test', unit: 'lb' });
    expect(mockDb.db.runAsync).toHaveBeenCalledTimes(1);
    const sql = mockDb.db.runAsync.mock.calls[0][0];
    expect(sql).toContain('INSERT OR IGNORE INTO users');
    const params = mockDb.db.runAsync.mock.calls[0][1];
    expect(params[0]).toBe('u1');
    expect(params[2]).toBe('Test');
    expect(params[3]).toBe('lb');
  });

  test('defaults unit to lb', async () => {
    await ensureUser(ctx, { id: 'u1' });
    const params = mockDb.db.runAsync.mock.calls[0][1];
    expect(params[3]).toBe('lb');
  });

  test('handles null email and display_name', async () => {
    await ensureUser(ctx, { id: 'u1' });
    const params = mockDb.db.runAsync.mock.calls[0][1];
    expect(params[1]).toBeNull(); // email
    expect(params[2]).toBeNull(); // display_name
  });
});

// ============================================================
// Iteration 8: Settings CRUD
// ============================================================
describe('getSetting', () => {
  test('returns value when setting exists', async () => {
    mockDb.setGetFirstResult('settings', { value: 'workout-123' });
    const result = await getSetting(ctx, 'active_workout_id');
    expect(result).toBe('workout-123');
    expect(mockDb.sqlContains('settings')).toBe(true);
  });

  test('returns null when setting does not exist', async () => {
    mockDb.setGetFirstResult('settings', null);
    const result = await getSetting(ctx, 'nonexistent');
    expect(result).toBeNull();
  });
});

describe('setSetting', () => {
  test('upserts setting with ON CONFLICT', async () => {
    await setSetting(ctx, 'theme', 'dark');
    const sql = mockDb.db.runAsync.mock.calls[0][0];
    expect(sql).toContain('INSERT INTO settings');
    expect(sql).toContain('ON CONFLICT');
    const params = mockDb.db.runAsync.mock.calls[0][1];
    expect(params).toEqual([ctx.userId, 'theme', 'dark']);
  });
});

describe('deleteSetting', () => {
  test('deletes setting by key', async () => {
    await deleteSetting(ctx, 'active_workout_id');
    const sql = mockDb.db.runAsync.mock.calls[0][0];
    expect(sql).toContain('DELETE FROM settings');
    const params = mockDb.db.runAsync.mock.calls[0][1];
    expect(params).toEqual([ctx.userId, 'active_workout_id']);
  });
});

// ============================================================
// Iteration 4: User unit preference
// ============================================================
describe('getUserUnit', () => {
  test('returns kg when user has kg', async () => {
    mockDb.setGetFirstResult('users', { unit: 'kg' });
    expect(await getUserUnit(ctx)).toBe('kg');
  });

  test('returns lb by default', async () => {
    mockDb.setGetFirstResult('users', { unit: 'lb' });
    expect(await getUserUnit(ctx)).toBe('lb');
  });

  test('returns lb when user not found', async () => {
    expect(await getUserUnit(ctx)).toBe('lb');
  });
});

describe('updateUserUnit', () => {
  test('updates unit in users table', async () => {
    await updateUserUnit(ctx, 'kg');
    const params = mockDb.db.runAsync.mock.calls[0][1];
    expect(params[0]).toBe('kg');
    expect(params[2]).toBe(ctx.userId);
  });
});

// ============================================================
// Iteration 1: Exercise CRUD
// ============================================================
describe('createExercise', () => {
  test('inserts exercise with all fields', async () => {
    await createExercise(ctx, {
      id: 'ex1', name: 'Bench Press', muscle_groups: 'chest,triceps',
      is_compound: 1, required_equipment: 'barbell,bench', tags: 'primary',
      default_increment: 2.5,
    });
    expect(mockDb.db.runAsync).toHaveBeenCalledTimes(1);
    const sql = mockDb.db.runAsync.mock.calls[0][0];
    expect(sql).toContain('INSERT INTO exercises');
    const params = mockDb.db.runAsync.mock.calls[0][1];
    expect(params[0]).toBe('ex1');
    expect(params[1]).toBe(ctx.userId);
    expect(params[2]).toBe('Bench Press');
    expect(params[4]).toBe('chest,triceps');
  });

  test('defaults increment to 2.5', async () => {
    await createExercise(ctx, { id: 'ex1', name: 'Test', muscle_groups: 'test' });
    const params = mockDb.db.runAsync.mock.calls[0][1];
    expect(params[6]).toBe(2.5); // default_increment
  });
});

describe('listExercises', () => {
  test('lists all non-archived exercises', async () => {
    mockDb.setDefaultGetAll([{ id: 'ex1', name: 'Bench' }]);
    const result = await listExercises(ctx);
    expect(result).toHaveLength(1);
    const sql = mockDb.db.getAllAsync.mock.calls[0][0];
    expect(sql).toContain('is_archived=0');
    expect(sql).toContain('ORDER BY name');
  });

  test('filters by name when query provided', async () => {
    await listExercises(ctx, 'bench');
    const sql = mockDb.db.getAllAsync.mock.calls[0][0];
    expect(sql).toContain('LIKE');
    const params = mockDb.db.getAllAsync.mock.calls[0][1];
    expect(params[1]).toBe('%bench%');
  });

  test('ignores empty query string', async () => {
    await listExercises(ctx, '');
    const sql = mockDb.db.getAllAsync.mock.calls[0][0];
    expect(sql).not.toContain('LIKE');
  });
});

describe('findExerciseByName', () => {
  test('finds exercise by exact name', async () => {
    mockDb.setDefaultGetFirst({ id: 'ex1', name: 'Bench Press' });
    const result = await findExerciseByName(ctx, 'Bench Press');
    expect(result).toEqual({ id: 'ex1', name: 'Bench Press' });
  });
});

// ============================================================
// Iteration 1: Workout + Set CRUD
// ============================================================
describe('createWorkout', () => {
  test('creates workout with date and split', async () => {
    await createWorkout(ctx, { id: 'w1', date: '2026-03-14T10:00:00Z', split: 'push' });
    const params = mockDb.db.runAsync.mock.calls[0][1];
    expect(params[0]).toBe('w1');
    expect(params[1]).toBe(ctx.userId);
    expect(params[2]).toBe('2026-03-14T10:00:00Z');
    expect(params[3]).toBe('push');
  });
});

describe('addSet', () => {
  test('inserts set with all fields', async () => {
    await addSet(ctx, {
      id: 's1', workout_id: 'w1', exercise_id: 'ex1',
      set_index: 1, weight: 100, reps: 5, rir: 2,
      is_warmup: 0, block_id: 'b1',
    });
    const sql = mockDb.db.runAsync.mock.calls[0][0];
    expect(sql).toContain('INSERT INTO sets');
    const params = mockDb.db.runAsync.mock.calls[0][1];
    expect(params[5]).toBe(100); // weight
    expect(params[6]).toBe(5);   // reps
    expect(params[7]).toBe(2);   // rir
  });

  test('defaults is_completed to 0', async () => {
    await addSet(ctx, { id: 's1', workout_id: 'w1', exercise_id: 'ex1', set_index: 1 });
    const params = mockDb.db.runAsync.mock.calls[0][1];
    expect(params[11]).toBe(0); // is_completed
  });
});

describe('listWorkoutSets', () => {
  test('joins with exercises for name', async () => {
    await listWorkoutSets(ctx, 'w1');
    const sql = mockDb.db.getAllAsync.mock.calls[0][0];
    expect(sql).toContain('JOIN exercises');
    expect(sql).toContain('exercise_name');
    expect(sql).toContain('ORDER BY set_index');
  });
});

describe('updateSet', () => {
  test('uses COALESCE to only update provided fields', async () => {
    await updateSet(ctx, { id: 's1', weight: 105 });
    const sql = mockDb.db.runAsync.mock.calls[0][0];
    expect(sql).toContain('COALESCE');
    expect(sql).toContain('UPDATE sets');
  });

  test('can mark set as completed', async () => {
    await updateSet(ctx, { id: 's1', is_completed: 1 });
    const params = mockDb.db.runAsync.mock.calls[0][1];
    expect(params[4]).toBe(1); // is_completed
  });
});

describe('getNextSetIndex', () => {
  test('returns next index', async () => {
    mockDb.setDefaultGetFirst({ n: 4 });
    const result = await getNextSetIndex(ctx, 'w1');
    expect(result).toBe(4);
  });

  test('returns 1 when no sets exist', async () => {
    mockDb.setDefaultGetFirst(null);
    const result = await getNextSetIndex(ctx, 'w1');
    expect(result).toBe(1);
  });
});

// ============================================================
// Iteration 2: Blocks
// ============================================================
describe('createBlock', () => {
  test('creates workout block', async () => {
    await createBlock(ctx, { id: 'b1', workout_id: 'w1', kind: 'single', order_index: 1 });
    const sql = mockDb.db.runAsync.mock.calls[0][0];
    expect(sql).toContain('INSERT INTO workout_blocks');
  });
});

describe('addBlockExercise', () => {
  test('links exercise to block', async () => {
    await addBlockExercise(ctx, { id: 'be1', block_id: 'b1', exercise_id: 'ex1', order_index: 1 });
    const sql = mockDb.db.runAsync.mock.calls[0][0];
    expect(sql).toContain('INSERT INTO block_exercises');
  });
});

// ============================================================
// Iteration 2: Equipment
// ============================================================
describe('equipment CRUD', () => {
  test('addEquipment uses INSERT OR IGNORE', async () => {
    await addEquipment(ctx, 'barbell');
    const sql = mockDb.db.runAsync.mock.calls[0][0];
    expect(sql).toContain('INSERT OR IGNORE INTO user_equipment');
  });

  test('removeEquipment deletes by item', async () => {
    await removeEquipment(ctx, 'barbell');
    const sql = mockDb.db.runAsync.mock.calls[0][0];
    expect(sql).toContain('DELETE FROM user_equipment');
  });

  test('listEquipment returns items ordered', async () => {
    mockDb.setDefaultGetAll([{ item: 'barbell' }, { item: 'dumbbells' }]);
    const result = await listEquipment(ctx);
    expect(result).toHaveLength(2);
    const sql = mockDb.db.getAllAsync.mock.calls[0][0];
    expect(sql).toContain('ORDER BY item');
  });
});

describe('listExercisesAvailableByEquipment', () => {
  test('filters exercises by user equipment', async () => {
    mockDb.setGetAllResult('exercises', [
      { id: 'ex1', name: 'Bench', required_equipment: 'barbell,bench' },
      { id: 'ex2', name: 'Dips', required_equipment: '' },
      { id: 'ex3', name: 'Squat', required_equipment: 'barbell,rack' },
    ]);
    mockDb.setGetAllResult('user_equipment', [{ item: 'barbell' }, { item: 'bench' }]);
    const result = await listExercisesAvailableByEquipment(ctx);
    // ex1: needs barbell+bench, user has both → included
    // ex2: no requirements → included
    // ex3: needs barbell+rack, user missing rack → excluded
    expect(result).toHaveLength(2);
    expect(result.map((e: any) => e.id)).toEqual(['ex1', 'ex2']);
  });

  test('includes all exercises when no equipment required', async () => {
    mockDb.setGetAllResult('exercises', [
      { id: 'ex1', name: 'Dips', required_equipment: '' },
      { id: 'ex2', name: 'Pushups', required_equipment: null },
    ]);
    mockDb.setGetAllResult('user_equipment', []);
    const result = await listExercisesAvailableByEquipment(ctx);
    expect(result).toHaveLength(2);
  });
});

// ============================================================
// Iteration 2: Favorites
// ============================================================
describe('favorites', () => {
  test('addFavoriteExercise uses INSERT OR IGNORE', async () => {
    await addFavoriteExercise(ctx, 'ex1');
    const sql = mockDb.db.runAsync.mock.calls[0][0];
    expect(sql).toContain('INSERT OR IGNORE INTO user_favorite_exercises');
  });

  test('removeFavoriteExercise deletes', async () => {
    await removeFavoriteExercise(ctx, 'ex1');
    const sql = mockDb.db.runAsync.mock.calls[0][0];
    expect(sql).toContain('DELETE FROM user_favorite_exercises');
  });

  test('listFavoriteExerciseIds returns array of ids', async () => {
    mockDb.setDefaultGetAll([{ exercise_id: 'ex1' }, { exercise_id: 'ex2' }]);
    const result = await listFavoriteExerciseIds(ctx);
    expect(result).toEqual(['ex1', 'ex2']);
  });
});

// ============================================================
// Iteration 3: Last-time preview
// ============================================================
describe('lastWorkingSetsForExercise', () => {
  test('returns empty array when no history', async () => {
    const result = await lastWorkingSetsForExercise(ctx, 'ex1');
    expect(result).toEqual([]);
  });

  test('excludes current workout when specified', async () => {
    mockDb.setDefaultGetFirst({ workout_id: 'w-old' });
    await lastWorkingSetsForExercise(ctx, 'ex1', 'w-current');
    const sql = mockDb.db.getFirstAsync.mock.calls[0][0];
    expect(sql).toContain('workout_id != ?');
  });

  test('queries for non-warmup completed sets', async () => {
    await lastWorkingSetsForExercise(ctx, 'ex1');
    const sql = mockDb.db.getFirstAsync.mock.calls[0][0];
    expect(sql).toContain('is_warmup=0');
    expect(sql).toContain('is_completed=1');
  });
});

// ============================================================
// Iteration 3: PR detection
// ============================================================
describe('upsertMetric', () => {
  test('inserts with ON CONFLICT update', async () => {
    await upsertMetric(ctx, {
      id: 'm1', date: '2026-03-14', exercise_id: 'ex1',
      est_1rm: 120, top_set_weight: 100, top_set_reps: 5,
    });
    const sql = mockDb.db.runAsync.mock.calls[0][0];
    expect(sql).toContain('INSERT INTO metrics');
    expect(sql).toContain('ON CONFLICT');
  });
});

describe('getBestMetric', () => {
  test('orders by est_1rm DESC', async () => {
    await getBestMetric(ctx, 'ex1');
    const sql = mockDb.db.getFirstAsync.mock.calls[0][0];
    expect(sql).toContain('ORDER BY est_1rm DESC');
    expect(sql).toContain('LIMIT 1');
  });
});

// ============================================================
// Iteration 3: History
// ============================================================
describe('listWorkoutSummaries', () => {
  test('aggregates sets per workout', async () => {
    await listWorkoutSummaries(ctx, 10);
    const sql = mockDb.db.getAllAsync.mock.calls[0][0];
    expect(sql).toContain('COUNT(DISTINCT s.exercise_id)');
    expect(sql).toContain('GROUP BY w.id');
    expect(sql).toContain('ORDER BY w.date DESC');
  });
});

describe('listWorkoutDetail', () => {
  test('joins exercises for muscle groups', async () => {
    await listWorkoutDetail(ctx, 'w1');
    const sql = mockDb.db.getAllAsync.mock.calls[0][0];
    expect(sql).toContain('JOIN exercises');
    expect(sql).toContain('muscle_groups');
  });
});

// ============================================================
// Iteration 4: Weekly volume
// ============================================================
describe('upsertWeeklyVolume', () => {
  test('upserts with composite key', async () => {
    await upsertWeeklyVolume(ctx, '2026-03-09', 'chest', 6);
    const sql = mockDb.db.runAsync.mock.calls[0][0];
    expect(sql).toContain('INSERT INTO weekly_volume');
    expect(sql).toContain('ON CONFLICT');
  });
});

describe('computeWeeklyVolume', () => {
  test('expands comma-separated muscle groups', async () => {
    mockDb.setDefaultGetAll([
      { muscle_groups: 'chest,triceps', hard_sets: 3 },
      { muscle_groups: 'chest,front_delts', hard_sets: 2 },
    ]);
    const result = await computeWeeklyVolume(ctx, '2026-03-09', '2026-03-16');
    expect(result['chest']).toBe(5);     // 3 + 2
    expect(result['triceps']).toBe(3);
    expect(result['front_delts']).toBe(2);
  });

  test('returns empty object when no data', async () => {
    const result = await computeWeeklyVolume(ctx, '2026-03-09', '2026-03-16');
    expect(result).toEqual({});
  });
});

// ============================================================
// Iteration 5: Export/Import
// ============================================================
describe('exportAllData', () => {
  test('gathers all tables', async () => {
    mockDb.setDefaultGetAll([]);
    mockDb.setDefaultGetFirst({ id: 'u1', unit: 'lb' });
    const data = await exportAllData(ctx);
    expect(data).toHaveProperty('exported_at');
    expect(data).toHaveProperty('user');
    expect(data).toHaveProperty('exercises');
    expect(data).toHaveProperty('workouts');
    expect(data).toHaveProperty('sets');
    expect(data).toHaveProperty('equipment');
    expect(data).toHaveProperty('favorite_exercise_ids');
    expect(data).toHaveProperty('metrics');
    expect(data).toHaveProperty('weekly_volume');
  });
});

describe('importData', () => {
  test('imports exercises with INSERT OR IGNORE', async () => {
    await importData(ctx, {
      exercises: [{ id: 'ex1', name: 'Test', muscle_groups: 'test' }],
    });
    const sql = mockDb.calls.find(c => c.sql.includes('exercises'))!.sql;
    expect(sql).toContain('INSERT OR IGNORE');
  });

  test('imports workouts', async () => {
    await importData(ctx, {
      workouts: [{ id: 'w1', date: '2026-03-14' }],
    });
    expect(mockDb.sqlContains('INSERT OR IGNORE INTO workouts')).toBe(true);
  });

  test('imports equipment', async () => {
    await importData(ctx, { equipment: ['barbell', 'bench'] });
    const equipCalls = mockDb.calls.filter(c => c.sql.includes('user_equipment'));
    expect(equipCalls).toHaveLength(2);
  });

  test('handles empty data gracefully', async () => {
    await importData(ctx, {});
    // Should not throw
    expect(mockDb.db.runAsync).not.toHaveBeenCalled();
  });
});

// ============================================================
// Iteration 5: Delete operations
// ============================================================
describe('deleteSet', () => {
  test('deletes by id and userId', async () => {
    await deleteSet(ctx, 's1');
    const sql = mockDb.db.runAsync.mock.calls[0][0];
    expect(sql).toContain('DELETE FROM sets');
    const params = mockDb.db.runAsync.mock.calls[0][1];
    expect(params).toEqual(['s1', ctx.userId]);
  });
});

describe('deleteBlock', () => {
  test('deletes sets, block_exercises, and block', async () => {
    await deleteBlock(ctx, 'b1');
    expect(mockDb.db.runAsync).toHaveBeenCalledTimes(3);
    expect(mockDb.sqlContains('DELETE FROM sets')).toBe(true);
    expect(mockDb.sqlContains('DELETE FROM block_exercises')).toBe(true);
    expect(mockDb.sqlContains('DELETE FROM workout_blocks')).toBe(true);
  });
});

describe('deleteWorkout', () => {
  test('cascades delete through all related tables', async () => {
    mockDb.setDefaultGetAll([]); // no blocks
    await deleteWorkout(ctx, 'w1');
    expect(mockDb.sqlContains('DELETE FROM sets')).toBe(true);
    expect(mockDb.sqlContains('DELETE FROM workout_blocks')).toBe(true);
    expect(mockDb.sqlContains('DELETE FROM workouts')).toBe(true);
  });

  test('deletes block_exercises for each block', async () => {
    mockDb.setGetAllResult('workout_blocks', [{ id: 'b1' }, { id: 'b2' }]);
    await deleteWorkout(ctx, 'w1');
    const beCalls = mockDb.calls.filter(c => c.sql.includes('DELETE FROM block_exercises'));
    expect(beCalls).toHaveLength(2);
  });
});

// ============================================================
// Iteration 5: Exercise recency
// ============================================================
describe('exerciseRecency', () => {
  test('groups by exercise_id with max date', async () => {
    await exerciseRecency(ctx);
    const sql = mockDb.db.getAllAsync.mock.calls[0][0];
    expect(sql).toContain('MAX(w.date)');
    expect(sql).toContain('GROUP BY s.exercise_id');
    expect(sql).toContain('ORDER BY last_used ASC');
  });
});

// ============================================================
// Iteration 6: Block reorder
// ============================================================
describe('swapBlockOrder', () => {
  test('swaps order_index between two blocks', async () => {
    mockDb.db.getFirstAsync
      .mockResolvedValueOnce({ order_index: 1 })
      .mockResolvedValueOnce({ order_index: 2 });
    await swapBlockOrder(ctx, 'b1', 'b2');
    // Should have 2 updates
    const updates = mockDb.calls.filter(c => c.method === 'runAsync');
    expect(updates).toHaveLength(2);
  });

  test('does nothing if block not found', async () => {
    mockDb.db.getFirstAsync.mockResolvedValue(null);
    await swapBlockOrder(ctx, 'b1', 'b2');
    const updates = mockDb.calls.filter(c => c.method === 'runAsync');
    expect(updates).toHaveLength(0);
  });
});

// ============================================================
// Iteration 6: Replace exercise in block
// ============================================================
describe('replaceBlockExercise', () => {
  test('updates exercise_id and deletes old sets', async () => {
    await replaceBlockExercise(ctx, 'b1', 'old-ex', 'new-ex');
    expect(mockDb.db.runAsync).toHaveBeenCalledTimes(2);
    const updateSql = mockDb.db.runAsync.mock.calls[0][0];
    expect(updateSql).toContain('UPDATE block_exercises');
    const deleteSql = mockDb.db.runAsync.mock.calls[1][0];
    expect(deleteSql).toContain('DELETE FROM sets');
  });
});

// ============================================================
// Iteration 9: Programs
// ============================================================
describe('createProgram', () => {
  test('inserts program with is_active=1', async () => {
    await createProgram(ctx, { id: 'p1', name: 'PPL' });
    const sql = mockDb.db.runAsync.mock.calls[0][0];
    expect(sql).toContain('INSERT INTO programs');
    const params = mockDb.db.runAsync.mock.calls[0][1];
    expect(params[2]).toBe('PPL');
  });
});

describe('setActiveProgram', () => {
  test('deactivates all then activates one', async () => {
    await setActiveProgram(ctx, 'p1');
    expect(mockDb.db.runAsync).toHaveBeenCalledTimes(2);
    // First: set all to 0
    const sql1 = mockDb.db.runAsync.mock.calls[0][0];
    expect(sql1).toContain('is_active=0');
    // Second: set target to 1
    const sql2 = mockDb.db.runAsync.mock.calls[1][0];
    expect(sql2).toContain('is_active=1');
  });
});

describe('deleteProgram', () => {
  test('cascades through days and exercises', async () => {
    mockDb.setDefaultGetAll([{ id: 'day1' }, { id: 'day2' }]);
    await deleteProgram(ctx, 'p1');
    // Should delete day exercises for each day, then days, then program
    expect(mockDb.sqlContains('DELETE FROM program_day_exercises')).toBe(true);
    expect(mockDb.sqlContains('DELETE FROM program_days')).toBe(true);
    expect(mockDb.sqlContains('DELETE FROM programs')).toBe(true);
  });
});

describe('addProgramDay', () => {
  test('inserts day with split', async () => {
    await addProgramDay(ctx, { id: 'd1', program_id: 'p1', day_order: 1, split: 'push' });
    const params = mockDb.db.runAsync.mock.calls[0][1];
    expect(params[4]).toBe('push');
  });
});

describe('addProgramDayExercise', () => {
  test('inserts with target defaults', async () => {
    await addProgramDayExercise(ctx, {
      id: 'pde1', program_day_id: 'd1', exercise_id: 'ex1',
    });
    const params = mockDb.db.runAsync.mock.calls[0][1];
    expect(params[6]).toBe(3); // default target_sets
    expect(params[7]).toBe(2); // default target_rir
  });
});

describe('getNextProgramDay', () => {
  test('returns first day when no previous workout', async () => {
    mockDb.db.getFirstAsync.mockResolvedValueOnce(null); // no last workout
    mockDb.setGetAllResult('program_days', [
      { id: 'd1', split: 'push', day_order: 1 },
      { id: 'd2', split: 'pull', day_order: 2 },
    ]);
    const result = await getNextProgramDay(ctx, 'p1');
    expect(result?.split).toBe('push');
  });

  test('cycles to next day after last split', async () => {
    mockDb.db.getFirstAsync.mockResolvedValueOnce({ split: 'push' }); // last was push
    mockDb.setGetAllResult('program_days', [
      { id: 'd1', split: 'push', day_order: 1 },
      { id: 'd2', split: 'pull', day_order: 2 },
      { id: 'd3', split: 'legs', day_order: 3 },
    ]);
    const result = await getNextProgramDay(ctx, 'p1');
    expect(result?.split).toBe('pull');
  });

  test('wraps around to first day', async () => {
    mockDb.db.getFirstAsync.mockResolvedValueOnce({ split: 'legs' });
    mockDb.setGetAllResult('program_days', [
      { id: 'd1', split: 'push', day_order: 1 },
      { id: 'd2', split: 'pull', day_order: 2 },
      { id: 'd3', split: 'legs', day_order: 3 },
    ]);
    const result = await getNextProgramDay(ctx, 'p1');
    expect(result?.split).toBe('push'); // wraps to first
  });
});

// ============================================================
// Iteration 9: Progress / Metrics
// ============================================================
describe('getMetricHistory', () => {
  test('orders by date DESC with limit', async () => {
    await getMetricHistory(ctx, 'ex1', 10);
    const sql = mockDb.db.getAllAsync.mock.calls[0][0];
    expect(sql).toContain('ORDER BY date DESC');
    expect(sql).toContain('LIMIT');
  });
});

describe('listExercisesWithMetrics', () => {
  test('joins exercises with metrics', async () => {
    await listExercisesWithMetrics(ctx);
    const sql = mockDb.db.getAllAsync.mock.calls[0][0];
    expect(sql).toContain('MAX(m.est_1rm)');
    expect(sql).toContain('JOIN metrics');
  });
});

// ============================================================
// Iteration 10: Notes and Streaks
// ============================================================
describe('updateWorkoutNotes', () => {
  test('updates notes field', async () => {
    await updateWorkoutNotes(ctx, 'w1', 'Great workout!');
    const params = mockDb.db.runAsync.mock.calls[0][1];
    expect(params[0]).toBe('Great workout!');
    expect(params[2]).toBe('w1');
  });
});

describe('getWorkoutNotes', () => {
  test('returns notes when exists', async () => {
    mockDb.setDefaultGetFirst({ notes: 'Felt strong today' });
    const result = await getWorkoutNotes(ctx, 'w1');
    expect(result).toBe('Felt strong today');
  });

  test('returns empty string when no notes', async () => {
    const result = await getWorkoutNotes(ctx, 'w1');
    expect(result).toBe('');
  });
});

describe('getWorkoutStreak', () => {
  test('returns 0 when no workouts', async () => {
    mockDb.setDefaultGetAll([]);
    const result = await getWorkoutStreak(ctx);
    expect(result).toBe(0);
  });

  test('counts consecutive days from today', async () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(today.getDate() - 2);

    mockDb.setDefaultGetAll([
      { day: today.toISOString().slice(0, 10) },
      { day: yesterday.toISOString().slice(0, 10) },
      { day: twoDaysAgo.toISOString().slice(0, 10) },
    ]);
    const result = await getWorkoutStreak(ctx);
    expect(result).toBe(3);
  });

  test('breaks streak on gap', async () => {
    const today = new Date();
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(today.getDate() - 2); // skip yesterday

    mockDb.setDefaultGetAll([
      { day: today.toISOString().slice(0, 10) },
      { day: twoDaysAgo.toISOString().slice(0, 10) },
    ]);
    const result = await getWorkoutStreak(ctx);
    expect(result).toBe(1); // only today counts
  });
});

describe('getWorkoutsThisWeek', () => {
  test('returns count', async () => {
    mockDb.setDefaultGetFirst({ n: 3 });
    const result = await getWorkoutsThisWeek(ctx);
    expect(result).toBe(3);
  });

  test('returns 0 when no workouts', async () => {
    const result = await getWorkoutsThisWeek(ctx);
    expect(result).toBe(0);
  });
});

// ============================================================
// Iteration 10: Enhanced history
// ============================================================
describe('listWorkoutSummariesEnhanced', () => {
  test('includes volume and muscle groups', async () => {
    await listWorkoutSummariesEnhanced(ctx, 20);
    const sql = mockDb.db.getAllAsync.mock.calls[0][0];
    expect(sql).toContain('total_volume');
    expect(sql).toContain('all_muscle_groups');
    expect(sql).toContain('GROUP BY w.id');
  });
});

// ============================================================
// Iteration 8: Today's workout resume
// ============================================================
describe('getTodayWorkout', () => {
  test('queries for workouts from today', async () => {
    const today = new Date().toISOString().slice(0, 10);
    await getTodayWorkout(ctx);
    const params = mockDb.db.getFirstAsync.mock.calls[0][1];
    expect(params[1]).toBe(today);
  });
});

// ============================================================
// Cross-iteration: latestExerciseTopSet
// ============================================================
describe('latestExerciseTopSet', () => {
  test('excludes warmups and orders by date then weight', async () => {
    await latestExerciseTopSet(ctx, 'ex1');
    const sql = mockDb.db.getFirstAsync.mock.calls[0][0];
    expect(sql).toContain('is_warmup=0');
    expect(sql).toContain('ORDER BY w.date DESC, s.weight DESC');
  });
});

// ============================================================
// Iteration 11: Repeat workout
// ============================================================
describe('repeatWorkout', () => {
  test('creates new workout from source', async () => {
    // Source workout exists
    mockDb.db.getFirstAsync.mockResolvedValueOnce({ id: 'w-old', split: 'push', notes: 'good' });
    // No blocks
    mockDb.db.getAllAsync.mockResolvedValueOnce([]);
    await repeatWorkout(ctx, 'w-old', 'w-new', '2026-03-15T10:00:00Z');
    // Should insert new workout
    const insertCalls = mockDb.calls.filter(c => c.method === 'runAsync' && c.sql.includes('INSERT INTO workouts'));
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0].params![2]).toBe('2026-03-15T10:00:00Z');
    expect(insertCalls[0].params![3]).toBe('push'); // preserves split
  });

  test('does nothing if source workout not found', async () => {
    mockDb.db.getFirstAsync.mockResolvedValueOnce(null);
    await repeatWorkout(ctx, 'nonexistent', 'w-new', '2026-03-15');
    const insertCalls = mockDb.calls.filter(c => c.sql.includes('INSERT INTO workouts'));
    expect(insertCalls).toHaveLength(0);
  });

  test('copies blocks and block exercises', async () => {
    mockDb.db.getFirstAsync.mockResolvedValueOnce({ id: 'w-old', split: 'pull' });
    // Blocks
    mockDb.db.getAllAsync
      .mockResolvedValueOnce([{ id: 'b1', order_index: 1, kind: 'single', notes: null }])  // blocks
      .mockResolvedValueOnce([{ id: 'be1', exercise_id: 'ex1', order_index: 1 }])           // block exercises
      .mockResolvedValueOnce([{ id: 's1', weight: 100, reps: 5, rir: 2, tempo: null }]);    // source sets
    mockDb.db.getFirstAsync.mockResolvedValueOnce({ weight: 105, reps: 5 }); // latest top set
    await repeatWorkout(ctx, 'w-old', 'w-new', '2026-03-15');
    expect(mockDb.sqlContains('INSERT INTO workout_blocks')).toBe(true);
    expect(mockDb.sqlContains('INSERT INTO block_exercises')).toBe(true);
    expect(mockDb.sqlContains('INSERT INTO sets')).toBe(true);
  });
});

// ============================================================
// Iteration 11: Duplicate block
// ============================================================
describe('duplicateBlock', () => {
  test('copies block with exercises and sets', async () => {
    // Source block
    mockDb.db.getFirstAsync
      .mockResolvedValueOnce({ id: 'b1', kind: 'single', order_index: 1, notes: null }) // source block
      .mockResolvedValueOnce({ mx: 2 }) // max order index
      .mockResolvedValueOnce({ n: 5 }); // next set index
    // Block exercises
    mockDb.db.getAllAsync
      .mockResolvedValueOnce([{ id: 'be1', exercise_id: 'ex1', order_index: 1 }])
      .mockResolvedValueOnce([{ id: 's1', weight: 100, reps: 5, rir: 2, tempo: null }]);

    const newBlockId = await duplicateBlock(ctx, 'b1', 'w1');
    expect(newBlockId).toBeTruthy();
    expect(mockDb.sqlContains('INSERT INTO workout_blocks')).toBe(true);
    expect(mockDb.sqlContains('INSERT INTO block_exercises')).toBe(true);
  });

  test('returns undefined if source block not found', async () => {
    mockDb.db.getFirstAsync.mockResolvedValueOnce(null);
    const result = await duplicateBlock(ctx, 'nonexistent', 'w1');
    expect(result).toBeUndefined();
  });
});

// ============================================================
// Iteration 11: PR status per set
// ============================================================
describe('getSetPRStatus', () => {
  test('returns set of PR set IDs', async () => {
    // Completed sets for workout
    mockDb.db.getAllAsync.mockResolvedValueOnce([
      { id: 's1', exercise_id: 'ex1', weight: 100, reps: 5 },
      { id: 's2', exercise_id: 'ex1', weight: 90, reps: 8 },
    ]);
    // Best metric for ex1 — matches s1's est_1rm (100 * (1 + 5/30) ≈ 116.67)
    mockDb.db.getFirstAsync
      .mockResolvedValueOnce({ est_1rm: 116.667 })  // for s1
      .mockResolvedValueOnce({ est_1rm: 116.667 }); // for s2 (doesn't match s2's est)

    const result = await getSetPRStatus(ctx, 'w1');
    expect(result).toBeInstanceOf(Set);
    expect(result.has('s1')).toBe(true);
    // s2: 90*(1+8/30) = 114, != 116.667, so not a PR
    expect(result.has('s2')).toBe(false);
  });

  test('returns empty set when no completed sets', async () => {
    mockDb.db.getAllAsync.mockResolvedValueOnce([]);
    const result = await getSetPRStatus(ctx, 'w1');
    expect(result.size).toBe(0);
  });
});

// ============================================================
// Iteration 11: updateSet with notes
// ============================================================
describe('updateSet with notes', () => {
  test('includes notes in COALESCE update', async () => {
    await updateSet(ctx, { id: 's1', notes: 'felt strong' });
    const sql = mockDb.db.runAsync.mock.calls[0][0];
    expect(sql).toContain('notes=COALESCE');
  });
});

// ============================================================
// Iteration 12: Body weight tracking
// ============================================================
describe('logBodyWeight', () => {
  test('inserts body weight entry', async () => {
    await logBodyWeight(ctx, { id: 'bw1', date: '2026-03-14', weight: 185 });
    const sql = mockDb.db.runAsync.mock.calls[0][0];
    expect(sql).toContain('INSERT INTO body_weight');
    const params = mockDb.db.runAsync.mock.calls[0][1];
    expect(params[3]).toBe(185);
  });
});

describe('getBodyWeightHistory', () => {
  test('returns entries ordered by date DESC', async () => {
    mockDb.setDefaultGetAll([{ id: 'bw1', date: '2026-03-14', weight: 185 }]);
    const result = await getBodyWeightHistory(ctx, 10);
    expect(result).toHaveLength(1);
    const sql = mockDb.db.getAllAsync.mock.calls[0][0];
    expect(sql).toContain('ORDER BY date DESC');
  });
});

describe('getLatestBodyWeight', () => {
  test('returns most recent entry', async () => {
    mockDb.setDefaultGetFirst({ weight: 185, date: '2026-03-14' });
    const result = await getLatestBodyWeight(ctx);
    expect(result?.weight).toBe(185);
  });

  test('returns null when no entries', async () => {
    const result = await getLatestBodyWeight(ctx);
    expect(result).toBeNull();
  });
});

describe('deleteBodyWeight', () => {
  test('deletes by id and userId', async () => {
    await deleteBodyWeight(ctx, 'bw1');
    const sql = mockDb.db.runAsync.mock.calls[0][0];
    expect(sql).toContain('DELETE FROM body_weight');
  });
});

// ============================================================
// Iteration 12: Workout calendar
// ============================================================
describe('getWorkoutDatesForMonth', () => {
  test('queries for distinct days in month', async () => {
    mockDb.setDefaultGetAll([{ day: '2026-03-01' }, { day: '2026-03-05' }]);
    const result = await getWorkoutDatesForMonth(ctx, '2026-03');
    expect(result).toEqual(['2026-03-01', '2026-03-05']);
    const sql = mockDb.db.getAllAsync.mock.calls[0][0];
    expect(sql).toContain('DISTINCT');
  });

  test('handles February correctly', async () => {
    mockDb.setDefaultGetAll([]);
    await getWorkoutDatesForMonth(ctx, '2026-02');
    const params = mockDb.db.getAllAsync.mock.calls[0][1];
    expect(params[1]).toBe('2026-02-01');
    // Feb 2026 has 28 days
    expect(params[2]).toContain('2026-02-28');
  });
});

// ============================================================
// Iteration 12: Lifetime stats
// ============================================================
describe('getLifetimeStats', () => {
  test('aggregates all stats', async () => {
    mockDb.db.getFirstAsync
      .mockResolvedValueOnce({ n: 50 })     // workout count
      .mockResolvedValueOnce({ n: 200 })    // set count
      .mockResolvedValueOnce({ vol: 100000 }) // volume
      .mockResolvedValueOnce({ name: 'Bench Press', cnt: 60 }); // top exercise
    // getWorkoutStreak internal call
    mockDb.db.getAllAsync.mockResolvedValueOnce([]); // streak days

    const result = await getLifetimeStats(ctx);
    expect(result.totalWorkouts).toBe(50);
    expect(result.totalSets).toBe(200);
    expect(result.totalVolume).toBe(100000);
    expect(result.mostTrainedExercise).toBe('Bench Press');
    expect(result.currentStreak).toBe(0);
  });

  test('handles empty database', async () => {
    mockDb.db.getFirstAsync.mockResolvedValue(null);
    mockDb.db.getAllAsync.mockResolvedValueOnce([]);
    const result = await getLifetimeStats(ctx);
    expect(result.totalWorkouts).toBe(0);
    expect(result.totalSets).toBe(0);
    expect(result.totalVolume).toBe(0);
    expect(result.mostTrainedExercise).toBeNull();
  });
});
