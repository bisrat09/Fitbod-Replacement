#!/usr/bin/env node
/**
 * Builds a static name → instructions (+ start/finish photo paths) map from free-exercise-db
 * (https://github.com/yuhonas/free-exercise-db, public domain / Unlicense).
 *
 * Matching is deliberately strict (normalized exact name only): a fuzzy match
 * pairs e.g. "Barbell Bench Press" with "Dumbbell Bench Press", and wrong
 * instructions are worse than none.
 *
 * Usage: node scripts/buildInstructions.mjs
 * Output: src/data/exerciseInstructions.json
 */

import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const SOURCE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const OUT_FILE = new URL('../src/data/exerciseInstructions.json', import.meta.url);

/** Lowercase, drop punctuation, unify "pull up"/"pull-up"/"pullup", strip plural s. */
export function normalize(name) {
  return name
    .toLowerCase()
    .replace(/[-–]/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\b(pull|push|chin|sit|step) ups?\b/g, '$1up')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w))
    .join(' ');
}

// Hand-checked: Fitlog/Fitbod name → free-exercise-db name for the same movement.
// Only add pairs that are genuinely the same exercise.
const ALIASES = {
  'Barbell Bench Press': 'Barbell Bench Press - Medium Grip',
  'Barbell Incline Bench Press': 'Barbell Incline Bench Press - Medium Grip',
  'Dumbbell Incline Bench Press': 'Incline Dumbbell Press',
  'Dumbbell Fly': 'Dumbbell Flyes',
  'Dumbbell Incline Fly': 'Incline Dumbbell Flyes',
  'Machine Fly': 'Butterfly',
  'Close-Grip Bench Press': 'Close-Grip Barbell Bench Press',
  'Lat Pulldown': 'Wide-Grip Lat Pulldown',
  'Close-Grip Lat Pulldown': 'Close-Grip Front Lat Pulldown',
  'Cable Row': 'Seated Cable Rows',
  'Seated Cable Row': 'Seated Cable Rows',
  'Dumbbell Row': 'One-Arm Dumbbell Row',
  'Single Arm Row': 'One-Arm Dumbbell Row',
  'Hammerstrength High Row': 'Leverage High Row',
  'Machine Hip Adductor': 'Thigh Adductor',
  'Machine Hip Abductor': 'Thigh Abductor',
  'Seated Back Extension': 'Hyperextensions (Back Extensions)',
  'Incline Back Extension': 'Hyperextensions (Back Extensions)',
  'Lying Hamstrings Curl': 'Lying Leg Curls',
  'Glute Kickback Machine': 'Glute Kickback',
  'Machine Leg Press': 'Leg Press',
  'Machine Tricep Dip': 'Dip Machine',
  'Machine Shoulder Press': 'Leverage Shoulder Press',
  'Back Squat': 'Barbell Squat',
  'Deadlift': 'Barbell Deadlift',
  'Ab Rollout': 'Ab Roller',
  'Seated Machine Calf Press': 'Seated Calf Raise',
  'Cable Rope Tricep Extension': 'Triceps Overhead Extension with Rope',
  'Cable Rope Overhead Triceps Extension': 'Cable Rope Overhead Triceps Extension',
  'Cable Tricep Pushdown': 'Triceps Pushdown',
  'Dumbbell Lateral Raise': 'Side Lateral Raise',
  'Dumbbell Hammer Curl': 'Hammer Curls',
  'Dumbbell Shrug': 'Dumbbell Shrug',
  'Vertical Leg Raise': 'Knee/Hip Raise On Parallel Bars',
  'Hanging Leg Raise': 'Hanging Leg Raise',
  'Dumbbell Front Raise': 'Front Dumbbell Raise',
  'Leg Extension': 'Leg Extensions',
  'Hip Thrust': 'Barbell Hip Thrust',
};

function seedNames() {
  const seedPath = fileURLToPath(new URL('../src/data/seedExercises.ts', import.meta.url));
  const src = readFileSync(seedPath, 'utf-8');
  const body = src.slice(src.indexOf('const RAW'), src.indexOf('// ── Build processed'));
  const names = [];
  for (const m of body.matchAll(/^\s+'((?:[^'\\]|\\.)*)',\s*$/gm)) names.push(m[1].replace(/\\'/g, "'"));
  return names;
}

async function main() {
  console.log(`Fetching ${SOURCE}...`);
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const all = await res.json();

  const byNorm = new Map();
  for (const ex of all) {
    if (ex.instructions?.length) byNorm.set(normalize(ex.name), ex);
  }

  const out = {};
  const names = new Set([...seedNames(), ...Object.keys(ALIASES)]);
  for (const name of names) {
    const ex = byNorm.get(normalize(ALIASES[name] ?? name));
    if (!ex) continue;
    out[name.toLowerCase()] = {
      steps: ex.instructions.map((s) => s.trim()).filter(Boolean),
      primary: ex.primaryMuscles ?? [],
      secondary: ex.secondaryMuscles ?? [],
      equipment: ex.equipment ?? null,
      images: ex.images ?? [],
    };
  }

  writeFileSync(OUT_FILE, JSON.stringify(out, null, 1) + '\n');
  console.log(`Wrote ${Object.keys(out).length} exercises with instructions.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
