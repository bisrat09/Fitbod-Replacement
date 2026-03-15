import { epley1RM, roundToIncrement, suggestNextWeight, calculatePlates, formatWorkoutSummary } from '@/lib/progression';

// ============================================================
// Edge cases for progression functions
// ============================================================

describe('epley1RM edge cases', () => {
  test('negative weight returns negative (theoretical)', () => {
    expect(epley1RM(-100, 5)).toBeLessThan(0);
  });

  test('negative reps reduces estimate', () => {
    expect(epley1RM(100, -1)).toBeLessThan(100);
  });

  test('very high reps (30+)', () => {
    // 100 * (1 + 30/30) = 200
    expect(epley1RM(100, 30)).toBe(200);
    // 100 * (1 + 50/30) ≈ 266.67
    expect(epley1RM(100, 50)).toBeCloseTo(266.667, 0);
  });

  test('decimal weight and reps', () => {
    expect(epley1RM(67.5, 7.5)).toBeCloseTo(67.5 * (1 + 7.5 / 30), 2);
  });
});

describe('roundToIncrement edge cases', () => {
  test('very large numbers', () => {
    expect(roundToIncrement(1000, 2.5)).toBe(1000);
    expect(roundToIncrement(999.9, 2.5)).toBe(1000);
  });

  test('very small increment', () => {
    expect(roundToIncrement(10.05, 0.1)).toBe(10.1);
  });

  test('increment equals value', () => {
    expect(roundToIncrement(5, 5)).toBe(5);
  });

  test('value smaller than increment', () => {
    expect(roundToIncrement(1, 5)).toBe(0);
    expect(roundToIncrement(3, 5)).toBe(5);
  });
});

describe('suggestNextWeight edge cases', () => {
  test('handles undefined prevRir', () => {
    // @ts-ignore — testing runtime behavior
    expect(suggestNextWeight(100, undefined, 2, 2.5)).toBe(100);
  });

  test('zero prevWeight', () => {
    expect(suggestNextWeight(0, 1, 2, 2.5)).toBe(0);
  });

  test('negative delta clamped', () => {
    // prevRir=10, targetRir=0 → delta=-10 → clamped to -0.075
    const result = suggestNextWeight(100, 10, 0, 2.5);
    expect(result).toBe(92.5);
  });

  test('positive delta clamped', () => {
    // prevRir=0, targetRir=10 → delta=10 → clamped to 0.075
    const result = suggestNextWeight(100, 0, 10, 2.5);
    expect(result).toBe(107.5);
  });

  test('same rir = no change', () => {
    expect(suggestNextWeight(185, 2, 2, 2.5)).toBe(185);
  });
});

describe('calculatePlates edge cases', () => {
  test('exact bar weight', () => {
    expect(calculatePlates(45, 45, 'lb')).toEqual([]);
    expect(calculatePlates(20, 20, 'kg')).toEqual([]);
  });

  test('just above bar weight but below smallest plate', () => {
    // 46 lb: (46-45)/2 = 0.5 per side — no standard plate
    expect(calculatePlates(46, 45, 'lb')).toEqual([]);
  });

  test('very heavy weight', () => {
    // 500 lb: (500-45)/2 = 227.5 per side
    // 5x45=225, remaining 2.5 → 1x2.5
    const result = calculatePlates(500, 45, 'lb');
    expect(result[0]).toEqual({ plate: 45, count: 5 });
    expect(result[result.length - 1]).toEqual({ plate: 2.5, count: 1 });
  });

  test('all kg plates used', () => {
    // 58.75 kg: (58.75-20)/2 = 19.375 per side
    // 0x20, 1x10=10, 1x5=5, 1x2.5=2.5, 1x1.25=1.25 = 18.75 — leftover 0.625
    const result = calculatePlates(58.75, 20, 'kg');
    expect(result.length).toBeGreaterThan(0);
    const totalPerSide = result.reduce((s, p) => s + p.plate * p.count, 0);
    // Should be close to 19.375 but limited to available plates
    expect(totalPerSide).toBeLessThanOrEqual(19.375);
  });

  test('zero target weight', () => {
    expect(calculatePlates(0, 45, 'lb')).toEqual([]);
  });

  test('negative target weight', () => {
    expect(calculatePlates(-10, 45, 'lb')).toEqual([]);
  });
});

describe('formatWorkoutSummary edge cases', () => {
  test('empty exercises list', () => {
    const text = formatWorkoutSummary({ date: '2026-03-14' }, [], 'lb');
    expect(text).toContain('Logged with Fitlog');
    expect(text).not.toContain('undefined');
  });

  test('exercise with no completed sets', () => {
    const text = formatWorkoutSummary(
      { date: '2026-03-14' },
      [{ name: 'Bench', sets: [{ weight: 100, reps: 5, is_warmup: 0, is_completed: 0 }] }],
      'lb'
    );
    expect(text).toContain('Bench');
    expect(text).not.toContain('100 lb'); // incomplete, should be excluded
  });

  test('no split', () => {
    const text = formatWorkoutSummary({ date: '2026-03-14' }, [], 'kg');
    expect(text).not.toContain('undefined');
    expect(text).not.toContain('null');
  });

  test('no elapsed time', () => {
    const text = formatWorkoutSummary({ date: '2026-03-14' }, [], 'lb');
    expect(text).not.toContain('Duration');
  });

  test('zero elapsed time', () => {
    const text = formatWorkoutSummary({ date: '2026-03-14', elapsed: 0 }, [], 'lb');
    expect(text).not.toContain('Duration');
  });

  test('handles null RIR', () => {
    const text = formatWorkoutSummary(
      { date: '2026-03-14' },
      [{ name: 'Squat', sets: [{ weight: 100, reps: 5, is_warmup: 0, is_completed: 1 }] }],
      'kg'
    );
    expect(text).toContain('100 kg × 5');
    expect(text).not.toContain('RIR');
  });
});

// ============================================================
// Edge cases for DAO mock patterns
// ============================================================
import { createMockDb, createCtx } from './helpers';
import {
  getWorkoutStreak, computeWeeklyVolume, lastWorkingSetsForExercise,
  listExercisesAvailableByEquipment, getNextProgramDay
} from '@/lib/dao';

let mockDb: ReturnType<typeof createMockDb>;
let ctx: ReturnType<typeof createCtx>;

beforeEach(() => {
  mockDb = createMockDb();
  ctx = createCtx(mockDb);
});

describe('getWorkoutStreak edge cases', () => {
  test('streak of 1 (only today)', () => {
    const today = new Date().toISOString().slice(0, 10);
    mockDb.setDefaultGetAll([{ day: today }]);
    return getWorkoutStreak(ctx).then(result => {
      expect(result).toBe(1);
    });
  });

  test('no streak when last workout was 2 days ago', () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    mockDb.setDefaultGetAll([{ day: twoDaysAgo.toISOString().slice(0, 10) }]);
    return getWorkoutStreak(ctx).then(result => {
      expect(result).toBe(0);
    });
  });
});

describe('computeWeeklyVolume edge cases', () => {
  test('single muscle group', () => {
    mockDb.setDefaultGetAll([{ muscle_groups: 'chest', hard_sets: 5 }]);
    return computeWeeklyVolume(ctx, '2026-03-09', '2026-03-16').then(result => {
      expect(result).toEqual({ chest: 5 });
    });
  });

  test('muscle group with spaces in comma list', () => {
    mockDb.setDefaultGetAll([{ muscle_groups: 'chest, triceps, front_delts', hard_sets: 3 }]);
    return computeWeeklyVolume(ctx, '2026-03-09', '2026-03-16').then(result => {
      expect(result['chest']).toBe(3);
      expect(result['triceps']).toBe(3);
      expect(result['front_delts']).toBe(3);
    });
  });

  test('empty muscle groups string', () => {
    mockDb.setDefaultGetAll([{ muscle_groups: '', hard_sets: 5 }]);
    return computeWeeklyVolume(ctx, '2026-03-09', '2026-03-16').then(result => {
      expect(result).toEqual({});
    });
  });
});

describe('listExercisesAvailableByEquipment edge cases', () => {
  test('exercise with multiple required equipment where user has all', () => {
    mockDb.setGetAllResult('exercises', [
      { id: 'ex1', required_equipment: 'barbell,bench,rack' },
    ]);
    mockDb.setGetAllResult('user_equipment', [
      { item: 'barbell' }, { item: 'bench' }, { item: 'rack' },
    ]);
    return listExercisesAvailableByEquipment(ctx).then(result => {
      expect(result).toHaveLength(1);
    });
  });

  test('exercise with whitespace in equipment string', () => {
    mockDb.setGetAllResult('exercises', [
      { id: 'ex1', required_equipment: ' barbell , bench ' },
    ]);
    mockDb.setGetAllResult('user_equipment', [
      { item: 'barbell' }, { item: 'bench' },
    ]);
    return listExercisesAvailableByEquipment(ctx).then(result => {
      expect(result).toHaveLength(1);
    });
  });
});

describe('getNextProgramDay edge cases', () => {
  test('returns null when program has no days', () => {
    mockDb.db.getFirstAsync.mockResolvedValueOnce(null);
    mockDb.setGetAllResult('program_days', []);
    return getNextProgramDay(ctx, 'p1').then(result => {
      expect(result).toBeNull();
    });
  });

  test('handles split not in program days', () => {
    mockDb.db.getFirstAsync.mockResolvedValueOnce({ split: 'cardio' }); // last split not in program
    mockDb.setGetAllResult('program_days', [
      { id: 'd1', split: 'push', day_order: 1 },
    ]);
    return getNextProgramDay(ctx, 'p1').then(result => {
      expect(result?.split).toBe('push'); // falls back to first
    });
  });
});
