/**
 * Exercise instructions lookup from the static map built by
 * `scripts/buildInstructions.mjs` (free-exercise-db, public domain).
 */

import instructions from '@/data/exerciseInstructions.json';

export type ExerciseInstructions = {
  steps: string[];
  primary: string[];
  secondary: string[];
  equipment: string | null;
};

const map = instructions as Record<string, ExerciseInstructions>;

export function getExerciseInstructions(name: string): ExerciseInstructions | null {
  return map[name.toLowerCase().trim().replace(/\s+/g, ' ')] ?? null;
}
