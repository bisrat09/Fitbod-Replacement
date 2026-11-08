import { computeRecovery, recoveryOf, recoveringMuscles, FULL_FATIGUE_SETS } from '@/lib/muscleRecovery';
import { suggestSplit, selectExercises, splitReadiness, type AvailableExercise } from '@/lib/workoutGenerator';

const NOW = new Date('2026-11-08T12:00:00Z').getTime();
const hoursAgo = (h: number) => new Date(NOW - h * 3600000).toISOString();
const sets = (n: number, mg: string, h: number) => Array.from({ length: n }, () => ({ date: hoursAgo(h), muscle_groups: mg }));

describe('computeRecovery', () => {
  test('no history means fully recovered', () => {
    expect(computeRecovery([], NOW)).toEqual({});
    expect(recoveryOf({}, 'chest')).toBe(1);
  });

  test('sets just done fatigue the primary fully, secondaries half', () => {
    const r = computeRecovery(sets(6, 'chest, triceps', 0), NOW);
    expect(r.chest).toBeCloseTo(1 - 6 / FULL_FATIGUE_SETS);
    expect(r.triceps).toBeCloseTo(1 - 3 / FULL_FATIGUE_SETS);
  });

  test('fatigue fades over the recovery window, faster for small muscles', () => {
    const r = computeRecovery(sets(10, 'chest', 36).concat(sets(10, 'biceps', 36)), NOW);
    expect(r.chest).toBeCloseTo(0.5); // 72h window, half gone
    expect(r.biceps).toBeCloseTo(0.75); // 48h window, three quarters gone
    const later = computeRecovery(sets(10, 'chest', 80), NOW);
    expect(later.chest).toBeUndefined();
  });

  test('floors at 0%', () => {
    expect(computeRecovery(sets(30, 'quads', 0), NOW).quads).toBe(0);
  });

  test('recoveringMuscles lists the most fatigued first', () => {
    const r = computeRecovery(sets(8, 'chest', 0).concat(sets(2, 'biceps', 0)), NOW);
    expect(recoveringMuscles(r).map((m) => m.muscle)).toEqual(['chest', 'biceps']);
    expect(recoveringMuscles(r)[0].percentage).toBe(20);
  });
});

describe('suggestSplit with recovery', () => {
  test('after a heavy push day, picks a split that avoids chest', () => {
    const rec = computeRecovery(sets(8, 'chest, triceps, front_delts', 20).concat(sets(6, 'delts, triceps', 20)), NOW);
    const s = suggestSplit([{ split: 'push', date: hoursAgo(20) }], rec, NOW);
    expect(['pull', 'legs']).toContain(s.split);
    expect(s.readiness).toBeGreaterThan(0.95);
  });

  test('after pull yesterday and push today, legs wins', () => {
    const rec = computeRecovery(
      sets(10, 'lats, biceps', 24).concat(sets(6, 'upper_back, rear_delts', 24), sets(10, 'chest, triceps', 2)),
      NOW,
    );
    const s = suggestSplit([{ split: 'push', date: hoursAgo(2) }, { split: 'pull', date: hoursAgo(24) }], rec, NOW);
    expect(s.split).toBe('legs');
  });

  test('everything fresh: the split trained longest ago wins', () => {
    const s = suggestSplit(
      [{ split: 'pull', date: hoursAgo(24 * 5) }, { split: 'push', date: hoursAgo(24 * 6) }, { split: 'full', date: hoursAgo(24 * 9) }],
      {},
      NOW,
    );
    // legs/upper/lower never trained in the window count as 14 days stale
    expect(s.split).toBe('legs');
  });

  test('readiness ignores accessory muscles', () => {
    expect(splitReadiness('legs', { calves: 0, core: 0 })).toBe(1);
  });

  test('legacy rotation still used when no recovery map is passed', () => {
    expect(suggestSplit([{ split: 'push', date: new Date().toISOString() }]).split).toBe('pull');
  });
});

describe('selectExercises with recovery', () => {
  const ex = (id: string, mg: string, compound = 1): AvailableExercise => ({ id, name: id, muscle_groups: mg, is_compound: compound, required_equipment: null });
  const pool = [
    ex('bench', 'chest, triceps'),
    ex('row', 'upper_back, biceps'),
    ex('pulldown', 'lats, biceps'),
    ex('squat', 'quads, glutes'),
    ex('rdl', 'hamstrings, glutes'),
    ex('pushdown', 'triceps', 0),
  ];

  test('full body skips lifts led by a recovering muscle', () => {
    const rec = { chest: 0.3, triceps: 0.4 };
    const picked = selectExercises(pool, 'full', 4, [], new Set(), undefined, NOW, rec).map((e) => e.id);
    expect(picked).not.toContain('bench');
    expect(picked).not.toContain('pushdown');
    expect(picked).toEqual(expect.arrayContaining(['row', 'pulldown', 'squat', 'rdl']));
  });

  test('falls back to the full split when too few muscles are fresh', () => {
    const rec = { chest: 0.2, triceps: 0.2, front_delts: 0.2, delts: 0.2, upper_chest: 0.2 };
    const picked = selectExercises(pool, 'push', 2, [], new Set(), undefined, NOW, rec).map((e) => e.id);
    expect(picked).toContain('bench');
  });
});
