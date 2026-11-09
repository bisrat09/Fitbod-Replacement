/**
 * Exercise instructions lookup from the static map built by
 * `scripts/buildInstructions.mjs` (free-exercise-db, public domain).
 */

import instructions from '@/data/exerciseInstructions.json';
import formVideos from '@/data/formVideos.json';

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

export type FormVideo = { url: string; title: string; channel: string };

const videos = formVideos as Record<string, { id: string; title: string; channel: string }>;

/** One hand-picked form video (trusted coaching channel), built by `scripts/buildFormVideos.mjs`. */
export function exerciseFormVideo(name: string): FormVideo | null {
  const v = videos[name.toLowerCase().trim().replace(/\s+/g, ' ')];
  if (!v?.id) return null;
  return { url: `https://www.youtube.com/watch?v=${v.id}`, title: v.title, channel: v.channel.replace(/\u2122/g, '') };
}

/** Fallback: YouTube search for form videos of this exercise. */
export function exerciseVideoSearchUrl(name: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} exercise proper form`)}`;
}

const map = instructions as Record<string, ExerciseInstructions>;

export function getExerciseInstructions(name: string): ExerciseInstructions | null {
  return map[name.toLowerCase().trim().replace(/\s+/g, ' ')] ?? null;
}
