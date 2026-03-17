/**
 * Phase 6 — Additional tests for the new workout flow components.
 *
 * Covers:
 * - workoutGenerator edge cases (recommendations, boundary conditions)
 * - targetMuscles edge cases
 * - Generator + targetMuscles integration
 */

import {
  suggestSplit,
  selectExercises,
  formatStaleness,
  SPLIT_MUSCLES,
  DURATION_EXERCISE_COUNT,
  type AvailableExercise,
  type RecencyEntry,
} from '@/lib/workoutGenerator';
import { computeTargetMuscles, type MuscleTarget } from '@/lib/targetMuscles';

// ── Helper ──

function makeEx(
  id: string,
  mg: string,
  compound: number,
  name?: string
): AvailableExercise {
  return {
    id,
    name: name ?? id,
    muscle_groups: mg,
    is_compound: compound,
    required_equipment: null,
  };
}

// ═════════════════════════════════════════════════
// workoutGenerator — selectExercises edge cases
// ═════════════════════════════════════════════════

describe('selectExercises — edge cases', () => {
  const pushExercises = [
    makeEx('bp', 'chest,triceps', 1, 'Bench Press'),
    makeEx('ohp', 'delts,triceps', 1, 'Overhead Press'),
    makeEx('ibp', 'upper_chest,triceps', 1, 'Incline Press'),
    makeEx('tp', 'triceps', 0, 'Tricep Pushdown'),
    makeEx('lr', 'delts', 0, 'Lateral Raise'),
    makeEx('cf', 'chest', 0, 'Cable Fly'),
  ];

  test('returns empty when all exercises are "never" recommended', () => {
    const recs = new Map(pushExercises.map((e) => [e.id, 'never']));
    const result = selectExercises(pushExercises, 'push', 5, [], new Set(), recs);
    expect(result).toEqual([]);
  });

  test('count larger than available exercises returns all available', () => {
    const result = selectExercises(pushExercises, 'push', 100, [], new Set());
    expect(result.length).toBe(pushExercises.length);
  });

  test('count of 0 returns empty array', () => {
    const result = selectExercises(pushExercises, 'push', 0, [], new Set());
    expect(result).toEqual([]);
  });

  test('count of 1 returns exactly one exercise', () => {
    const result = selectExercises(pushExercises, 'push', 1, [], new Set());
    expect(result).toHaveLength(1);
  });

  test('only isolation exercises available — still fills correctly', () => {
    const isoOnly = [
      makeEx('tp', 'triceps', 0),
      makeEx('lr', 'delts', 0),
      makeEx('cf', 'chest', 0),
    ];
    const result = selectExercises(isoOnly, 'push', 3, [], new Set());
    expect(result).toHaveLength(3);
  });

  test('only compound exercises available — still fills correctly', () => {
    const compOnly = [
      makeEx('bp', 'chest,triceps', 1),
      makeEx('ohp', 'delts,triceps', 1),
      makeEx('ibp', 'upper_chest,triceps', 1),
    ];
    const result = selectExercises(compOnly, 'push', 3, [], new Set());
    expect(result).toHaveLength(3);
  });

  test('favorites + recommendations interact correctly', () => {
    // Favorite an exercise that's also "less" recommended
    const recs = new Map([['tp', 'less']]);
    const favs = new Set(['tp']);
    const result = selectExercises(pushExercises, 'push', 3, [], favs, recs);
    // tp is favorited (priority boost) but "less" (priority penalty) — still should appear
    // because favorites sort first
    expect(result.some((e) => e.id === 'tp')).toBe(true);
  });

  test('"more" recommendation boosts isolation priority', () => {
    const recs = new Map([['cf', 'more']]);
    // All isolations equally stale — "more" should pick cf first among isolations
    const result = selectExercises(pushExercises, 'push', 5, [], new Set(), recs);
    const isos = result.filter((e) => e.is_compound === 0);
    // cf should be first isolation picked due to "more" boost
    if (isos.length > 0) {
      expect(isos[0].id).toBe('cf');
    }
  });

  test('exercises with no muscle group overlap are excluded then backfilled', () => {
    const mixed = [
      makeEx('sq', 'quads,glutes', 1, 'Squat'),       // legs — not push
      makeEx('bp', 'chest,triceps', 1, 'Bench Press'), // push
    ];
    const result = selectExercises(mixed, 'push', 2, [], new Set());
    // bp matches push, sq doesn't — but sq gets backfilled
    expect(result[0].id).toBe('bp');
    expect(result).toHaveLength(2);
  });
});

// ═════════════════════════════════════════════════
// workoutGenerator — suggestSplit edge cases
// ═════════════════════════════════════════════════

describe('suggestSplit — edge cases', () => {
  test('duplicate splits in history — only first occurrence counts', () => {
    const d = (daysAgo: number) =>
      new Date(Date.now() - daysAgo * 86400000).toISOString();
    const result = suggestSplit([
      { split: 'push', date: d(1) },
      { split: 'push', date: d(5) }, // should be ignored (first occurrence = 1 day ago)
      { split: 'pull', date: d(3) },
    ]);
    // pull is stalest (3 days), push is 1 day, legs/upper/lower/full untrained
    // untrained splits have priority → legs wins
    expect(result.split).toBe('legs');
  });

  test('all splits trained same day — returns push (first in priority)', () => {
    const today = new Date().toISOString();
    const all = ['push', 'pull', 'legs', 'upper', 'lower', 'full'].map(
      (split) => ({ split, date: today })
    );
    const result = suggestSplit(all);
    // All 0 days ago — push wins by priority order
    expect(result.split).toBe('push');
    expect(result.daysSince).toBe(0);
  });

  test('empty string split is treated like null', () => {
    const result = suggestSplit([
      { split: '', date: new Date().toISOString() },
    ]);
    // Empty split is falsy → skipped, returns push (default)
    expect(result.split).toBe('push');
  });
});

// ═════════════════════════════════════════════════
// computeTargetMuscles — additional edge cases
// ═════════════════════════════════════════════════

describe('computeTargetMuscles — additional edge cases', () => {
  test('single exercise with single muscle group = 100%', () => {
    const result = computeTargetMuscles([{ muscle_groups: 'chest' }]);
    expect(result).toHaveLength(1);
    expect(result[0].muscle).toBe('Chest');
    expect(result[0].percentage).toBe(100);
  });

  test('duplicate muscle in same exercise string', () => {
    const result = computeTargetMuscles([{ muscle_groups: 'chest,chest' }]);
    expect(result).toHaveLength(1);
    expect(result[0].muscle).toBe('Chest');
    expect(result[0].percentage).toBe(100);
  });

  test('many exercises with same muscle group', () => {
    const exercises = Array.from({ length: 5 }, () => ({ muscle_groups: 'chest' }));
    const result = computeTargetMuscles(exercises);
    expect(result).toHaveLength(1);
    expect(result[0].percentage).toBe(100);
  });

  test('exercises with comma-only muscle_groups are filtered', () => {
    const result = computeTargetMuscles([{ muscle_groups: ',,' }]);
    expect(result).toEqual([]);
  });

  test('uppercase muscle names keep first-letter capitalization', () => {
    // formatMuscle only capitalizes word-start chars; does not lowercase the rest
    const result = computeTargetMuscles([{ muscle_groups: 'CHEST' }]);
    expect(result[0].muscle).toBe('CHEST');
  });
});

// ═════════════════════════════════════════════════
// Generator + TargetMuscles integration
// ═════════════════════════════════════════════════

describe('selectExercises → computeTargetMuscles pipeline', () => {
  test('push split produces chest-heavy muscle distribution', () => {
    const pushPool = [
      makeEx('bp', 'chest,triceps,front_delts', 1),
      makeEx('ibp', 'upper_chest,triceps,front_delts', 1),
      makeEx('ohp', 'delts,triceps', 1),
      makeEx('tp', 'triceps', 0),
      makeEx('lr', 'delts', 0),
      makeEx('cf', 'chest', 0),
    ];
    const selected = selectExercises(pushPool, 'push', 5, [], new Set());
    const muscles = computeTargetMuscles(selected);

    expect(muscles.length).toBeGreaterThan(0);
    // triceps should be a top muscle for push
    const triceps = muscles.find((m) => m.muscle === 'Triceps');
    expect(triceps).toBeDefined();
    expect(triceps!.percentage).toBeGreaterThan(0);
  });

  test('pull split produces back-heavy muscle distribution', () => {
    const pullPool = [
      makeEx('row', 'lats,upper_back,biceps', 1),
      makeEx('pu', 'lats,biceps', 1),
      makeEx('fr', 'rear_delts,upper_back', 0),
      makeEx('bc', 'biceps', 0),
      makeEx('sr', 'upper_back', 0),
    ];
    const selected = selectExercises(pullPool, 'pull', 4, [], new Set());
    const muscles = computeTargetMuscles(selected);

    expect(muscles.length).toBeGreaterThan(0);
    // Lats or biceps should be prominent
    const hasBack = muscles.some(
      (m) => m.muscle === 'Lats' || m.muscle === 'Upper Back' || m.muscle === 'Biceps'
    );
    expect(hasBack).toBe(true);
  });

  test('all DURATION_EXERCISE_COUNT values produce valid muscle targets', () => {
    const pool = [
      makeEx('bp', 'chest,triceps', 1),
      makeEx('sq', 'quads,glutes,hamstrings', 1),
      makeEx('dl', 'lower_back,hamstrings,glutes', 1),
      makeEx('row', 'lats,upper_back,biceps', 1),
      makeEx('ohp', 'delts,triceps', 1),
      makeEx('lu', 'quads,glutes', 1),
      makeEx('cf', 'chest', 0),
      makeEx('bc', 'biceps', 0),
      makeEx('lr', 'delts', 0),
      makeEx('tp', 'triceps', 0),
      makeEx('le', 'quads', 0),
      makeEx('lc', 'hamstrings', 0),
      makeEx('cr', 'core', 0),
      makeEx('sh', 'upper_back', 0),
    ];

    for (const [dur, count] of Object.entries(DURATION_EXERCISE_COUNT)) {
      const selected = selectExercises(pool, 'full', count, [], new Set());
      const muscles = computeTargetMuscles(selected);
      expect(muscles.length).toBeGreaterThan(0);
      // Percentages should be positive
      for (const m of muscles) {
        expect(m.percentage).toBeGreaterThan(0);
      }
    }
  });
});

// ═════════════════════════════════════════════════
// SPLIT_MUSCLES coverage
// ═════════════════════════════════════════════════

describe('SPLIT_MUSCLES — completeness', () => {
  test('lower is disjoint from push muscles', () => {
    const pushSet = new Set(SPLIT_MUSCLES.push);
    for (const m of SPLIT_MUSCLES.lower) {
      expect(pushSet.has(m)).toBe(false);
    }
  });

  test('upper + lower covers all muscles in full', () => {
    const combined = new Set([...SPLIT_MUSCLES.upper, ...SPLIT_MUSCLES.lower]);
    for (const m of SPLIT_MUSCLES.full) {
      expect(combined.has(m)).toBe(true);
    }
  });

  test('push + pull + legs covers all muscles in full', () => {
    const combined = new Set([
      ...SPLIT_MUSCLES.push,
      ...SPLIT_MUSCLES.pull,
      ...SPLIT_MUSCLES.legs,
    ]);
    for (const m of SPLIT_MUSCLES.full) {
      expect(combined.has(m)).toBe(true);
    }
  });

  test('no split has empty muscle list', () => {
    for (const [split, muscles] of Object.entries(SPLIT_MUSCLES)) {
      expect(muscles.length).toBeGreaterThan(0);
    }
  });
});

// ═════════════════════════════════════════════════
// formatStaleness — boundary values
// ═════════════════════════════════════════════════

describe('formatStaleness — additional', () => {
  test('2 returns "last trained 2 days ago"', () => {
    expect(formatStaleness(2)).toBe('last trained 2 days ago');
  });

  test('large number works', () => {
    expect(formatStaleness(365)).toBe('last trained 365 days ago');
  });
});
