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
  /** free-exercise-db photo paths, usually [start, finish] */
  images: string[];
};

// Same public-domain repo the instructions come from, served via jsDelivr's CDN
const PHOTO_BASE = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/';

export function exercisePhotoUrls(info: ExerciseInstructions | null): string[] {
  return (info?.images ?? []).map((p) => PHOTO_BASE + p);
}

/** YouTube search for real form videos of this exercise. */
export function exerciseVideoSearchUrl(name: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} exercise proper form`)}`;
}

const map = instructions as Record<string, ExerciseInstructions>;

export function getExerciseInstructions(name: string): ExerciseInstructions | null {
  return map[name.toLowerCase().trim().replace(/\s+/g, ' ')] ?? null;
}
