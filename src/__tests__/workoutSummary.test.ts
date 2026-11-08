import { estimateCalories, summarizeWorkout, splitLabel, STRENGTH_MET } from '@/lib/workoutSummary';

describe('estimateCalories', () => {
  test('MET x kg x hours, lb converted to kg', () => {
    // 180 lb = 81.65 kg, 1 hour at MET 5 -> ~408
    expect(estimateCalories(3600, 180, 'lb')).toBe(Math.round(STRENGTH_MET * (180 / 2.20462)));
    expect(estimateCalories(3600, 80, 'kg')).toBe(400);
    expect(estimateCalories(1800, 80, 'kg')).toBe(200);
  });
  test('null without body weight or a real duration', () => {
    expect(estimateCalories(3600, null, 'lb')).toBeNull();
    expect(estimateCalories(3600, 0, 'lb')).toBeNull();
    expect(estimateCalories(30, 180, 'lb')).toBeNull();
  });
});

describe('summarizeWorkout', () => {
  const sets = [
    { exercise_id: 'row', exercise_name: 'Cable Row', weight: 140, reps: 9, is_warmup: 0, is_completed: 1 },
    { exercise_id: 'row', exercise_name: 'Cable Row', weight: 140, reps: 10, is_warmup: 0, is_completed: 1 },
    { exercise_id: 'row', exercise_name: 'Cable Row', weight: 70, reps: 10, is_warmup: 1, is_completed: 1 },
    { exercise_id: 'dip', exercise_name: 'Dip', weight: 0, reps: 7, is_warmup: 0, is_completed: 1 },
    { exercise_id: 'dip', exercise_name: 'Dip', weight: 0, reps: 7, is_warmup: 0, is_completed: 0 },
  ];
  const s = summarizeWorkout({
    split: 'full', date: '2026-11-08T10:00:00Z', durationSec: 2700, sets,
    muscleGroupsByExercise: { row: 'lats,upper_back', dip: 'chest,triceps' },
    bodyWeight: 80, unit: 'kg',
  });

  test('counts only completed working sets', () => {
    expect(s.workingSets).toBe(3);
    expect(s.reps).toBe(26);
    expect(s.volume).toBe(140 * 9 + 140 * 10);
    expect(s.exercises).toBe(2);
  });
  test('per-exercise best set', () => {
    const row = s.lines.find((l) => l.exerciseId === 'row')!;
    expect(row).toMatchObject({ sets: 2, bestWeight: 140, bestReps: 10 });
    expect(s.lines.find((l) => l.exerciseId === 'dip')!).toMatchObject({ sets: 1, bestWeight: 0, bestReps: 7 });
  });
  test('muscle split weighted by completed sets', () => {
    const pct = Object.fromEntries(s.muscles.map((m) => [m.muscle, m.percentage]));
    // row: 2 sets x 2 muscles, dip: 1 set x 2 muscles -> 6 entries
    expect(pct['Lats']).toBe(33);
    expect(pct['Chest']).toBe(17);
  });
  test('calories from duration and body weight', () => {
    expect(s.calories).toBe(300); // 5 x 80 x 0.75
  });
  test('empty workout', () => {
    const e = summarizeWorkout({ split: 'push', date: '', durationSec: 0, sets: [], muscleGroupsByExercise: {}, bodyWeight: null, unit: 'lb' });
    expect(e).toMatchObject({ workingSets: 0, reps: 0, volume: 0, exercises: 0, calories: null, muscles: [] });
  });
});

describe('splitLabel', () => {
  test('readable names', () => {
    expect(splitLabel('full')).toBe('Full Body');
    expect(splitLabel('push')).toBe('Push');
    expect(splitLabel(null)).toBe('Workout');
  });
});
