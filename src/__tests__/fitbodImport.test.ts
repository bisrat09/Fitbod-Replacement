import {
  parseFitbodCsv,
  planFitbodImport,
  fitbodDateToIso,
  convertWeight,
  guessExercise,
  inferSplit,
} from '@/lib/fitbodImport';

const HEADER = 'Date,Exercise,Reps,Weight(kg),Duration(s),Distance(m),Incline,Resistance,isWarmup,Note,multiplier';

const CSV = [
  HEADER,
  '2026-10-26 22:40:34 +0000,Dumbbell Bench Press, 5,22.679618519018916,0.0,0.0,0.0,0.0,false,, 2.0',
  '2026-10-26 22:40:34 +0000,Dumbbell Bench Press, 5,22.679618519018916,0.0,0.0,0.0,0.0,false,, 2.0',
  '2026-10-26 22:40:34 +0000,Dumbbell Bench Press, 8,11.339809259509458,0.0,0.0,0.0,0.0,true,, 2.0',
  '2026-10-26 22:40:34 +0000,Plank, 0,0.0,60.0,0.0,0.0,0.0,false,, 1.0',
  '2023-04-15 16:07:02 +0000,Chin Up, 7,0.0,0.0,0.0,0.0,0.0,false,, 1.0',
  '2023-04-15 16:07:02 +0000,Stair Stepper, 0,0.0,600.0,0.0,0.0,0.0,false,"Felt good, steady", 1.0',
].join('\n');

const MG: Record<string, string> = {
  'Dumbbell Bench Press': 'chest,triceps',
  'Plank': 'core',
  'Chin Up': 'lats,upper_back',
  'Stair Stepper': 'cardio',
};
const mgFor = (n: string) => MG[n] ?? 'core';

describe('parseFitbodCsv', () => {
  test('parses rows with trimmed reps, warmup flag, quoted notes', () => {
    const rows = parseFitbodCsv(CSV);
    expect(rows).toHaveLength(6);
    expect(rows[0]).toMatchObject({ exercise: 'Dumbbell Bench Press', reps: 5, isWarmup: false });
    expect(rows[2].isWarmup).toBe(true);
    expect(rows[5].note).toBe('Felt good, steady');
  });

  test('handles BOM and CRLF', () => {
    const rows = parseFitbodCsv('﻿' + CSV.replace(/\n/g, '\r\n'));
    expect(rows).toHaveLength(6);
  });

  test('rejects non-Fitbod CSV', () => {
    expect(() => parseFitbodCsv('a,b,c\n1,2,3')).toThrow(/Not a Fitbod export/);
  });

  test('empty input → no rows', () => {
    expect(parseFitbodCsv('')).toEqual([]);
  });
});

describe('fitbodDateToIso', () => {
  test('converts Fitbod timestamp to ISO UTC', () => {
    expect(fitbodDateToIso('2026-10-26 22:40:34 +0000')).toBe('2026-10-26T22:40:34.000Z');
  });
  test('applies offsets', () => {
    expect(fitbodDateToIso('2026-10-26 15:40:34 -0700')).toBe('2026-10-26T22:40:34.000Z');
  });
  test('garbage → null', () => {
    expect(fitbodDateToIso('not a date')).toBeNull();
  });
});

describe('convertWeight', () => {
  test('kg → lb rounds to 0.5', () => {
    expect(convertWeight(22.679618519018916, 'lb')).toBe(50);
    expect(convertWeight(11.339809259509458, 'lb')).toBe(25);
  });
  test('kg stays kg, rounded to 0.25', () => {
    expect(convertWeight(22.679618519018916, 'kg')).toBe(22.75);
  });
});

describe('planFitbodImport', () => {
  const plan = planFitbodImport(parseFitbodCsv(CSV), 'lb', mgFor);

  test('groups rows into workouts by timestamp, oldest first', () => {
    expect(plan.workouts).toHaveLength(2);
    expect(plan.workouts[0].date).toBe('2023-04-15T16:07:02.000Z');
  });

  test('deterministic ids for idempotent re-import', () => {
    const again = planFitbodImport(parseFitbodCsv(CSV), 'lb', mgFor);
    expect(again.workouts.map((w) => w.id)).toEqual(plan.workouts.map((w) => w.id));
    expect(again.workouts[1].sets.map((s) => s.id)).toEqual(plan.workouts[1].sets.map((s) => s.id));
  });

  test('warmups come first within an exercise', () => {
    const bench = plan.workouts[1].sets.filter((s) => s.exercise === 'Dumbbell Bench Press');
    expect(bench.map((s) => s.is_warmup)).toEqual([1, 0, 0]);
    expect(bench[0].weight).toBe(25);
    expect(bench[1].weight).toBe(50);
  });

  test('set_index is sequential across the workout', () => {
    expect(plan.workouts[1].sets.map((s) => s.set_index)).toEqual([1, 2, 3, 4]);
  });

  test('timed sets keep duration as a note, null reps/weight', () => {
    const plank = plan.workouts[1].sets.find((s) => s.exercise === 'Plank')!;
    expect(plank.reps).toBeNull();
    expect(plank.weight).toBeNull();
    expect(plank.notes).toBe('60s');
    const stair = plan.workouts[0].sets.find((s) => s.exercise === 'Stair Stepper')!;
    expect(stair.notes).toBe('10 min, Felt good, steady');
  });

  test('bodyweight sets keep reps with weight 0', () => {
    const chin = plan.workouts[0].sets.find((s) => s.exercise === 'Chin Up')!;
    expect(chin).toMatchObject({ reps: 7, weight: 0 });
  });

  test('one metric per weighted exercise per workout, from working sets only', () => {
    expect(plan.metrics).toHaveLength(1);
    expect(plan.metrics[0]).toMatchObject({ exercise: 'Dumbbell Bench Press', top_set_weight: 50, top_set_reps: 5 });
  });

  test('lists every exercise name', () => {
    expect(plan.exerciseNames).toEqual(['Chin Up', 'Dumbbell Bench Press', 'Plank', 'Stair Stepper']);
  });
});

describe('inferSplit', () => {
  test('push-dominant', () => {
    expect(inferSplit(['chest,triceps', 'chest', 'delts', 'triceps'])).toBe('push');
  });
  test('legs-dominant', () => {
    expect(inferSplit(['quads,glutes', 'hamstrings', 'calves'])).toBe('legs');
  });
  test('push + pull → upper', () => {
    expect(inferSplit(['chest', 'chest', 'lats', 'lats'])).toBe('upper');
  });
  test('mixed upper + legs → full', () => {
    expect(inferSplit(['chest', 'lats', 'quads', 'hamstrings'])).toBe('full');
  });
  test('core/cardio only → null', () => {
    expect(inferSplit(['core', 'cardio'])).toBeNull();
  });
});

describe('guessExercise', () => {
  test('cardio is kept out of strength splits', () => {
    expect(guessExercise('Running - Treadmill').muscle_groups).toBe('cardio');
    expect(guessExercise('Elliptical').muscle_groups).toBe('cardio');
  });
  test('common lifts', () => {
    expect(guessExercise('Cable Rope Overhead Triceps Extension').muscle_groups).toBe('triceps');
    expect(guessExercise('Machine Rear Delt Fly').muscle_groups).toBe('rear_delts');
    expect(guessExercise('Seated Cable Row')).toEqual({ muscle_groups: 'lats,upper_back', is_compound: 1 });
    expect(guessExercise('Dumbbell Curl').muscle_groups).toBe('biceps');
  });
});
