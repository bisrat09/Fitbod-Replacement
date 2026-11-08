/**
 * Post-workout summary: metrics, muscle split, estimated calories.
 * Pure logic, no React Native or DB dependencies.
 */

import { computeTargetMuscles, type MuscleTarget } from './targetMuscles';
import { isCardio, estimateCardioCalories } from './cardio';

/**
 * MET for resistance training at moderate-to-vigorous effort with short rests.
 * Compendium of Physical Activities lists 3.5 (light/moderate) to 6.0 (vigorous)
 * for weight lifting; 5.0 sits between. Calories are an estimate either way.
 */
export const STRENGTH_MET = 5.0;
const LB_PER_KG = 2.20462;

/** kcal = MET x body weight (kg) x hours. Null without a body weight or a real duration. */
export function estimateCalories(
  durationSec: number,
  bodyWeight: number | null | undefined,
  unit: 'lb' | 'kg',
): number | null {
  if (!bodyWeight || bodyWeight <= 0 || durationSec < 60) return null;
  const kg = unit === 'lb' ? bodyWeight / LB_PER_KG : bodyWeight;
  return Math.round(STRENGTH_MET * kg * (durationSec / 3600));
}

export type SummarySet = {
  exercise_id: string;
  exercise_name?: string;
  weight: number | null;
  reps: number | null;
  is_warmup: number;
  is_completed: number;
  duration_sec?: number | null;
  level?: number | null;
  calories?: number | null;
};

export type SummaryExerciseLine = {
  exerciseId: string;
  name: string;
  sets: number;
  bestWeight: number;
  bestReps: number;
  /** Set for cardio exercises: total time, highest level, calories (logged or estimated). */
  cardio?: { durationSec: number; level: number | null; calories: number | null };
};

export type WorkoutSummary = {
  split: string;
  date: string;
  durationSec: number;
  exercises: number;
  workingSets: number;
  reps: number;
  volume: number;
  calories: number | null;
  cardioSec: number;
  muscles: MuscleTarget[];
  lines: SummaryExerciseLine[];
};

/**
 * Summarise completed working sets. Muscle split is weighted by completed sets,
 * so an exercise you did 4 sets of counts more than one you did once.
 */
export function summarizeWorkout(args: {
  split: string;
  date: string;
  durationSec: number;
  sets: SummarySet[];
  muscleGroupsByExercise: Record<string, string>;
  bodyWeight: number | null;
  unit: 'lb' | 'kg';
}): WorkoutSummary {
  const done = args.sets.filter((s) => s.is_completed && !s.is_warmup);

  const byEx = new Map<string, SummaryExerciseLine>();
  let reps = 0;
  let volume = 0;
  let cardioSec = 0;
  let cardioCalories = 0;
  let cardioCaloriesKnown = true;
  const muscleEntries: { muscle_groups: string }[] = [];

  for (const s of done) {
    const mg = args.muscleGroupsByExercise[s.exercise_id];
    if (mg) muscleEntries.push({ muscle_groups: mg });
    const line = byEx.get(s.exercise_id) ?? {
      exerciseId: s.exercise_id,
      name: s.exercise_name ?? 'Exercise',
      sets: 0, bestWeight: 0, bestReps: 0,
    };
    line.sets += 1;

    if (isCardio(mg)) {
      const sec = s.duration_sec || 0;
      // Machine calories win; otherwise estimate from time and body weight
      const cal = s.calories != null && s.calories > 0
        ? Math.round(s.calories)
        : estimateCardioCalories(sec, args.bodyWeight, args.unit);
      cardioSec += sec;
      if (cal != null) cardioCalories += cal; else if (sec > 0) cardioCaloriesKnown = false;
      const c = line.cardio ?? { durationSec: 0, level: null, calories: null };
      c.durationSec += sec;
      if (s.level != null) c.level = Math.max(c.level ?? 0, s.level);
      if (cal != null) c.calories = (c.calories ?? 0) + cal;
      line.cardio = c;
    } else {
      const r = s.reps || 0;
      const w = s.weight || 0;
      reps += r;
      volume += r * w;
      if (w > line.bestWeight || (w === line.bestWeight && r > line.bestReps)) {
        line.bestWeight = w;
        line.bestReps = r;
      }
    }
    byEx.set(s.exercise_id, line);
  }

  // Lifting at STRENGTH_MET for the time not spent on cardio, plus cardio calories
  const strength = estimateCalories(Math.max(0, args.durationSec - cardioSec), args.bodyWeight, args.unit);
  let calories: number | null = null;
  if (strength != null || cardioCalories > 0) {
    calories = (strength ?? 0) + cardioCalories;
    if (!cardioCaloriesKnown && strength == null) calories = cardioCalories || null;
  }

  return {
    split: args.split,
    date: args.date,
    durationSec: args.durationSec,
    exercises: byEx.size,
    workingSets: done.length,
    reps,
    volume: Math.round(volume),
    calories,
    cardioSec,
    muscles: computeTargetMuscles(muscleEntries),
    lines: [...byEx.values()],
  };
}

const SPLIT_LABELS: Record<string, string> = {
  push: 'Push', pull: 'Pull', legs: 'Legs',
  upper: 'Upper Body', lower: 'Lower Body', full: 'Full Body',
};

export function splitLabel(split: string | null | undefined): string {
  if (!split) return 'Workout';
  return SPLIT_LABELS[split.toLowerCase()] ?? split.charAt(0).toUpperCase() + split.slice(1);
}
