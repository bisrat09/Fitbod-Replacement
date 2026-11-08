import { isCardio, formatClock, parseClock, describeSet, estimateCardioCalories, CARDIO_MET } from '@/lib/cardio';
import { summarizeWorkout, STRENGTH_MET } from '@/lib/workoutSummary';
import { computeRecovery } from '@/lib/muscleRecovery';
import { selectExercises, type AvailableExercise } from '@/lib/workoutGenerator';

describe('cardio helpers', () => {
  test('isCardio reads the primary muscle group', () => {
    expect(isCardio('cardio')).toBe(true);
    expect(isCardio('Cardio, quads')).toBe(true);
    expect(isCardio('quads,cardio')).toBe(false);
    expect(isCardio(null)).toBe(false);
  });

  test('formatClock / parseClock round-trip', () => {
    expect(formatClock(754)).toBe('12:34');
    expect(formatClock(3725)).toBe('1:02:05');
    expect(formatClock(0)).toBe('0:00');
    expect(parseClock('12:34')).toBe(754);
    expect(parseClock('1:02:05')).toBe(3725);
    expect(parseClock('20')).toBe(1200);
    expect(parseClock('abc')).toBeNull();
    expect(parseClock('')).toBeNull();
  });

  test('describeSet: cardio, lifting, and imported timed sets never print null', () => {
    expect(describeSet({ duration_sec: 720, level: 8, calories: 150 }, 'lb')).toBe('12:00 · L8 · 150 cal');
    expect(describeSet({ weight: 135, reps: 8, rir: 2 }, 'lb')).toBe('135lb×8 @2');
    expect(describeSet({ weight: 0, reps: 13 }, 'lb')).toBe('13');
    expect(describeSet({ weight: null, reps: null, notes: '10 min' }, 'lb')).toBe('10 min');
    expect(describeSet({ weight: null, reps: null }, 'lb')).not.toContain('null');
  });

  test('estimateCardioCalories uses CARDIO_MET', () => {
    // 80 kg, 30 min
    expect(estimateCardioCalories(1800, 80, 'kg')).toBe(Math.round(CARDIO_MET * 80 * 0.5));
    expect(estimateCardioCalories(1800, null, 'kg')).toBeNull();
  });
});

describe('summary with cardio', () => {
  const mg = { bench: 'chest,triceps', stair: 'cardio' };
  const base = { split: 'push', date: '2026-11-08T12:00:00Z', muscleGroupsByExercise: mg, unit: 'kg' as const };
  const bench = { exercise_id: 'bench', exercise_name: 'Bench', weight: 100, reps: 5, is_warmup: 0, is_completed: 1 };

  test('machine calories are used and cardio time is excluded from the lifting estimate', () => {
    const s = summarizeWorkout({
      ...base, durationSec: 3600, bodyWeight: 80,
      sets: [bench, { exercise_id: 'stair', exercise_name: 'Stair Stepper', weight: null, reps: null, is_warmup: 0, is_completed: 1, duration_sec: 900, level: 8, calories: 140 }],
    });
    expect(s.cardioSec).toBe(900);
    expect(s.volume).toBe(500);
    expect(s.calories).toBe(Math.round(STRENGTH_MET * 80 * 0.75) + 140);
    const line = s.lines.find((l) => l.exerciseId === 'stair')!;
    expect(line.cardio).toEqual({ durationSec: 900, level: 8, calories: 140 });
  });

  test('cardio calories are estimated when the machine number is missing', () => {
    const s = summarizeWorkout({
      ...base, durationSec: 1800, bodyWeight: 80,
      sets: [{ exercise_id: 'stair', weight: null, reps: null, is_warmup: 0, is_completed: 1, duration_sec: 1800, level: 6, calories: null }],
    });
    expect(s.calories).toBe(Math.round(CARDIO_MET * 80 * 0.5));
  });

  test('logged machine calories show even without a body weight', () => {
    const s = summarizeWorkout({
      ...base, durationSec: 1800, bodyWeight: null,
      sets: [{ exercise_id: 'stair', weight: null, reps: null, is_warmup: 0, is_completed: 1, duration_sec: 600, level: 6, calories: 90 }],
    });
    expect(s.calories).toBe(90);
  });
});

test('cardio does not show up as a recovering muscle', () => {
  expect(computeRecovery([{ date: new Date().toISOString(), muscle_groups: 'cardio' }])).toEqual({});
});

test('generator never pads a workout with cardio', () => {
  const ex = (id: string, mg: string): AvailableExercise => ({ id, name: id, muscle_groups: mg, is_compound: 1, required_equipment: null });
  const picked = selectExercises([ex('bench', 'chest,triceps'), ex('stair', 'cardio')], 'push', 5, [], new Set());
  expect(picked.map((e) => e.id)).toEqual(['bench']);
});
