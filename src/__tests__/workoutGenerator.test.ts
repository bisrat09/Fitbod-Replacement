import {
  SPLIT_MUSCLES,
  DURATION_EXERCISE_COUNT,
  DURATION_OPTIONS,
  suggestSplit,
  selectExercises,
  formatStaleness,
  type AvailableExercise,
  type RecencyEntry,
} from '@/lib/workoutGenerator';

// ── Constants ──

describe('SPLIT_MUSCLES', () => {
  test('all 6 splits are defined', () => {
    expect(Object.keys(SPLIT_MUSCLES)).toEqual(
      expect.arrayContaining(['push', 'pull', 'legs', 'upper', 'lower', 'full'])
    );
    expect(Object.keys(SPLIT_MUSCLES)).toHaveLength(6);
  });

  test('push includes chest and triceps', () => {
    expect(SPLIT_MUSCLES.push).toContain('chest');
    expect(SPLIT_MUSCLES.push).toContain('triceps');
  });

  test('pull includes lats and biceps', () => {
    expect(SPLIT_MUSCLES.pull).toContain('lats');
    expect(SPLIT_MUSCLES.pull).toContain('biceps');
  });

  test('legs includes quads and hamstrings', () => {
    expect(SPLIT_MUSCLES.legs).toContain('quads');
    expect(SPLIT_MUSCLES.legs).toContain('hamstrings');
  });

  test('upper contains push + pull muscles', () => {
    expect(SPLIT_MUSCLES.upper).toContain('chest');
    expect(SPLIT_MUSCLES.upper).toContain('lats');
    expect(SPLIT_MUSCLES.upper).toContain('biceps');
  });

  test('full contains muscles from all major splits', () => {
    expect(SPLIT_MUSCLES.full).toContain('chest');
    expect(SPLIT_MUSCLES.full).toContain('lats');
    expect(SPLIT_MUSCLES.full).toContain('quads');
  });
});

describe('DURATION_EXERCISE_COUNT', () => {
  test('30 min = 5 exercises', () => expect(DURATION_EXERCISE_COUNT[30]).toBe(5));
  test('45 min = 8 exercises', () => expect(DURATION_EXERCISE_COUNT[45]).toBe(8));
  test('60 min = 10 exercises', () => expect(DURATION_EXERCISE_COUNT[60]).toBe(10));
  test('90 min = 14 exercises', () => expect(DURATION_EXERCISE_COUNT[90]).toBe(14));
});

describe('DURATION_OPTIONS', () => {
  test('contains 4 options', () => {
    expect(DURATION_OPTIONS).toHaveLength(4);
    expect([...DURATION_OPTIONS]).toEqual([30, 45, 60, 90]);
  });
});

// ── suggestSplit ──

describe('suggestSplit', () => {
  test('returns push for brand new user (no history)', () => {
    const result = suggestSplit([]);
    expect(result.split).toBe('push');
    expect(result.daysSince).toBeNull();
  });

  test('suggests pull after push was trained today', () => {
    const today = new Date().toISOString();
    const result = suggestSplit([{ split: 'push', date: today }]);
    expect(result.split).toBe('pull');
    expect(result.daysSince).toBeNull();
  });

  test('suggests legs after push + pull trained', () => {
    const today = new Date().toISOString();
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const result = suggestSplit([
      { split: 'pull', date: today },
      { split: 'push', date: yesterday },
    ]);
    expect(result.split).toBe('legs');
    expect(result.daysSince).toBeNull();
  });

  test('suggests the stalest split when all are trained', () => {
    const d = (daysAgo: number) =>
      new Date(Date.now() - daysAgo * 86400000).toISOString();
    const result = suggestSplit([
      { split: 'push', date: d(1) },
      { split: 'pull', date: d(2) },
      { split: 'legs', date: d(3) },
      { split: 'upper', date: d(4) },
      { split: 'lower', date: d(5) },
      { split: 'full', date: d(6) },
    ]);
    // full is stalest at 6 days
    expect(result.split).toBe('full');
    expect(result.daysSince).toBe(6);
  });

  test('handles null splits gracefully', () => {
    const result = suggestSplit([
      { split: null, date: new Date().toISOString() },
    ]);
    expect(result.split).toBe('push');
  });

  test('returns daysSince for trained splits', () => {
    const d = (daysAgo: number) =>
      new Date(Date.now() - daysAgo * 86400000).toISOString();
    const result = suggestSplit([
      { split: 'push', date: d(0) },
      { split: 'pull', date: d(1) },
      { split: 'legs', date: d(2) },
      { split: 'upper', date: d(3) },
      { split: 'lower', date: d(4) },
      { split: 'full', date: d(5) },
    ]);
    // All trained — stalest is full at 5 days
    expect(result.split).toBe('full');
    expect(result.daysSince).toBe(5);
  });

  test('prefers untrained splits over trained ones', () => {
    const d = (daysAgo: number) =>
      new Date(Date.now() - daysAgo * 86400000).toISOString();
    const result = suggestSplit([
      { split: 'push', date: d(10) },
    ]);
    // pull, legs, upper, lower, full are all untrained — pull wins by priority
    expect(result.split).toBe('pull');
    expect(result.daysSince).toBeNull();
  });

  test('case-insensitive split matching', () => {
    const today = new Date().toISOString();
    const result = suggestSplit([{ split: 'PUSH', date: today }]);
    expect(result.split).toBe('pull');
  });
});

// ── selectExercises ──

describe('selectExercises', () => {
  const makeEx = (
    id: string,
    name: string,
    mg: string,
    compound: number
  ): AvailableExercise => ({
    id,
    name,
    muscle_groups: mg,
    is_compound: compound,
    required_equipment: null,
  });

  const pushExercises: AvailableExercise[] = [
    makeEx('bp', 'Bench Press', 'chest,triceps,front_delts', 1),
    makeEx('ibp', 'Incline DB Press', 'upper_chest,triceps,front_delts', 1),
    makeEx('ohp', 'Overhead Press', 'delts,triceps,upper_chest', 1),
    makeEx('dips', 'Dips', 'chest,triceps,front_delts', 1),
    makeEx('tp', 'Tricep Pushdown', 'triceps', 0),
    makeEx('lr', 'Lateral Raise', 'delts', 0),
  ];

  test('returns correct number of exercises', () => {
    const result = selectExercises(pushExercises, 'push', 4, [], new Set());
    expect(result).toHaveLength(4);
  });

  test('selects compounds first (~60%)', () => {
    const result = selectExercises(pushExercises, 'push', 5, [], new Set());
    const compoundCount = result.filter((e) => e.is_compound === 1).length;
    expect(compoundCount).toBeGreaterThanOrEqual(3);
  });

  test('prioritizes favorites', () => {
    const favs = new Set(['tp']);
    const result = selectExercises(pushExercises, 'push', 4, [], favs);
    expect(result.some((e) => e.id === 'tp')).toBe(true);
  });

  test('prioritizes stale exercises', () => {
    const recency: RecencyEntry[] = [
      { exercise_id: 'bp', last_used: new Date().toISOString() },
      { exercise_id: 'ibp', last_used: new Date(Date.now() - 7 * 86400000).toISOString() },
    ];
    const result = selectExercises(pushExercises, 'push', 2, recency, new Set());
    // ibp (staler) should come before bp (used today) among compounds
    const ibpIdx = result.findIndex((e) => e.id === 'ibp');
    const bpIdx = result.findIndex((e) => e.id === 'bp');
    if (ibpIdx >= 0 && bpIdx >= 0) {
      expect(ibpIdx).toBeLessThan(bpIdx);
    }
  });

  test('filters to exercises matching split muscles', () => {
    const allExercises = [
      ...pushExercises,
      makeEx('sq', 'Back Squat', 'quads,glutes,hamstrings', 1),
    ];
    const result = selectExercises(allExercises, 'push', 4, [], new Set());
    expect(result.some((e) => e.id === 'sq')).toBe(false);
  });

  test('fills from remaining if not enough matching exercises', () => {
    const mixed = [
      makeEx('bp', 'Bench Press', 'chest,triceps', 1),
      makeEx('sq', 'Squat', 'quads,glutes', 1),
    ];
    // Asking for 3 push exercises, but only 1 matches push
    const result = selectExercises(mixed, 'push', 3, [], new Set());
    // Should include Squat as filler
    expect(result.length).toBe(2);
  });

  test('returns empty array when no exercises available', () => {
    const result = selectExercises([], 'push', 5, [], new Set());
    expect(result).toEqual([]);
  });

  test('handles unknown split by falling back to full', () => {
    const result = selectExercises(pushExercises, 'custom', 2, [], new Set());
    // Should still return exercises (full split matches everything)
    expect(result.length).toBeGreaterThan(0);
  });

  test('no duplicate exercises in selection', () => {
    const result = selectExercises(pushExercises, 'push', 6, [], new Set());
    const ids = result.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ── selectExercises with recommendations ──

describe('selectExercises with recommendations', () => {
  const makeEx = (
    id: string,
    name: string,
    mg: string,
    compound: number
  ): AvailableExercise => ({
    id,
    name,
    muscle_groups: mg,
    is_compound: compound,
    required_equipment: null,
  });

  const exercises = [
    makeEx('bp', 'Bench Press', 'chest', 1),
    makeEx('ohp', 'Overhead Press', 'delts', 1),
    makeEx('fly', 'Cable Fly', 'chest', 0),
    makeEx('lr', 'Lateral Raise', 'delts', 0),
    makeEx('td', 'Tricep Dip', 'triceps', 1),
  ];

  test('filters out "never" recommended exercises', () => {
    const recs = new Map([['bp', 'never']]);
    const result = selectExercises(exercises, 'push', 5, [], new Set(), recs);
    expect(result.find((e) => e.id === 'bp')).toBeUndefined();
  });

  test('"more" exercises are prioritized', () => {
    const recs = new Map([['lr', 'more']]);
    const result = selectExercises(exercises, 'push', 3, [], new Set(), recs);
    // lr should be included even though it's an isolation and might otherwise be cut
    expect(result.find((e) => e.id === 'lr')).toBeDefined();
  });

  test('"less" exercises are deprioritized', () => {
    const recs = new Map([['bp', 'less']]);
    const result = selectExercises(exercises, 'push', 2, [], new Set(), recs);
    // With only 2 slots and bp deprioritized, other compounds should be preferred
    const bpIdx = result.findIndex((e) => e.id === 'bp');
    const ohpIdx = result.findIndex((e) => e.id === 'ohp');
    if (bpIdx >= 0 && ohpIdx >= 0) {
      expect(ohpIdx).toBeLessThan(bpIdx);
    }
  });

  test('works without recommendations (backward compatible)', () => {
    const result = selectExercises(exercises, 'push', 3, [], new Set());
    expect(result.length).toBe(3);
  });

  test('empty recommendations map has no effect', () => {
    const result = selectExercises(exercises, 'push', 3, [], new Set(), new Map());
    expect(result.length).toBe(3);
  });
});

// ── formatStaleness ──

describe('formatStaleness', () => {
  test('null returns "never trained"', () => {
    expect(formatStaleness(null)).toBe('never trained');
  });

  test('0 returns "trained today"', () => {
    expect(formatStaleness(0)).toBe('trained today');
  });

  test('1 returns "last trained yesterday"', () => {
    expect(formatStaleness(1)).toBe('last trained yesterday');
  });

  test('3 returns "last trained 3 days ago"', () => {
    expect(formatStaleness(3)).toBe('last trained 3 days ago');
  });

  test('14 returns "last trained 14 days ago"', () => {
    expect(formatStaleness(14)).toBe('last trained 14 days ago');
  });
});
