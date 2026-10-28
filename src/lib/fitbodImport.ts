/**
 * Fitbod CSV import
 *
 * Pure parsing/planning for Fitbod's "Export Workout Data" CSV:
 *   Date,Exercise,Reps,Weight(kg),Duration(s),Distance(m),Incline,Resistance,isWarmup,Note,multiplier
 *
 * - Every row is one set; all rows in a workout share the workout's start timestamp
 * - Weight is always kg, per implement (one dumbbell), regardless of the user's Fitbod unit
 * - Timed/cardio sets carry Duration(s)/Distance(m) instead of reps
 *
 * No database access — dao.importFitbodPlan() writes the plan.
 */

import { epley1RM } from '@/lib/progression';
import { SPLIT_MUSCLES } from '@/lib/workoutGenerator';

export const KG_TO_LB = 2.2046226218;

export type FitbodRow = {
  date: string;        // ISO timestamp of the workout start
  exercise: string;
  reps: number;
  weightKg: number;
  durationSec: number;
  distanceM: number;
  isWarmup: boolean;
  note: string;
};

export type PlannedSet = {
  id: string;
  exercise: string;
  set_index: number;
  weight: number | null;
  reps: number | null;
  is_warmup: number;
  notes: string | null;
};

export type PlannedWorkout = {
  id: string;
  date: string;
  split: string | null;
  sets: PlannedSet[];
};

export type PlannedMetric = {
  id: string;
  date: string;
  exercise: string;
  est_1rm: number;
  top_set_weight: number;
  top_set_reps: number;
};

export type ImportPlan = {
  workouts: PlannedWorkout[];
  metrics: PlannedMetric[];
  exerciseNames: string[];
};

// ── CSV parsing ──

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

/** "2026-10-26 22:40:34 +0000" → "2026-10-26T22:40:34.000Z" */
export function fitbodDateToIso(raw: string): string | null {
  const m = raw.trim().match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})\s*([+-]\d{2}):?(\d{2})?$/);
  const d = m
    ? new Date(`${m[1]}T${m[2]}${m[3]}:${m[4] ?? '00'}`)
    : new Date(raw.trim());
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export function parseFitbodCsv(text: string): FitbodRow[] {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];
  const header = splitCsvLine(lines[0]).map((h) => h.trim());
  const col = (name: string) => header.indexOf(name);
  const iDate = col('Date');
  const iEx = col('Exercise');
  const iReps = col('Reps');
  const iWeight = col('Weight(kg)');
  if (iDate < 0 || iEx < 0 || iReps < 0 || iWeight < 0) {
    throw new Error('Not a Fitbod export (missing Date/Exercise/Reps/Weight(kg) columns)');
  }
  const iDur = col('Duration(s)');
  const iDist = col('Distance(m)');
  const iWarm = col('isWarmup');
  const iNote = col('Note');
  const num = (cells: string[], i: number) => (i < 0 ? 0 : parseFloat(cells[i]) || 0);

  const rows: FitbodRow[] = [];
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const date = fitbodDateToIso(cells[iDate] ?? '');
    const exercise = (cells[iEx] ?? '').trim();
    if (!date || !exercise) continue;
    rows.push({
      date,
      exercise,
      reps: Math.round(num(cells, iReps)),
      weightKg: num(cells, iWeight),
      durationSec: num(cells, iDur),
      distanceM: num(cells, iDist),
      isWarmup: iWarm >= 0 && cells[iWarm]?.trim().toLowerCase() === 'true',
      note: iNote >= 0 ? (cells[iNote] ?? '').trim() : '',
    });
  }
  return rows;
}

// ── Unknown exercise classification ──

const CARDIO_RE = /\b(running|walking|treadmill|elliptical|cycling|bike|rowing machine|stair|swimming|jumping jack|jump rope)\b/i;

/** Best-effort muscle groups for Fitbod exercises missing from the seed library. */
export function guessExercise(name: string): { muscle_groups: string; is_compound: number } {
  const n = name.toLowerCase();
  if (CARDIO_RE.test(n)) return { muscle_groups: 'cardio', is_compound: 0 };
  if (/rear delt|reverse fly/.test(n)) return { muscle_groups: 'rear_delts', is_compound: 0 };
  if (/tricep/.test(n)) return { muscle_groups: 'triceps', is_compound: 0 };
  if (/curl/.test(n)) return { muscle_groups: 'biceps', is_compound: 0 };
  if (/pullover/.test(n)) return { muscle_groups: 'lats,chest', is_compound: 0 };
  if (/row/.test(n)) return { muscle_groups: 'lats,upper_back', is_compound: 1 };
  if (/overhead press|shoulder press|military/.test(n)) return { muscle_groups: 'delts,triceps', is_compound: 1 };
  if (/farmer|carry/.test(n)) return { muscle_groups: 'forearms,core', is_compound: 1 };
  if (/squat|lunge|leg press/.test(n)) return { muscle_groups: 'quads,glutes', is_compound: 1 };
  if (/bench|chest press|push.?up/.test(n)) return { muscle_groups: 'chest,triceps', is_compound: 1 };
  return { muscle_groups: 'core', is_compound: 0 };
}

// ── Split inference ──

/**
 * Labels a Fitbod workout (which has no split) from its working sets'
 * muscle groups so suggestSplit() has history to rotate on.
 */
export function inferSplit(muscleGroupsPerSet: string[]): string | null {
  const push = new Set(SPLIT_MUSCLES.push);
  const pull = new Set(SPLIT_MUSCLES.pull);
  const legs = new Set(SPLIT_MUSCLES.legs);
  let p = 0, u = 0, l = 0;
  for (const mg of muscleGroupsPerSet) {
    const primary = mg.split(',')[0].trim();
    if (primary === 'core') continue;
    if (push.has(primary)) p++;
    else if (pull.has(primary)) u++;
    else if (legs.has(primary)) l++;
  }
  const total = p + u + l;
  if (total === 0) return null;
  if (p / total >= 0.7) return 'push';
  if (u / total >= 0.7) return 'pull';
  if (l / total >= 0.7) return 'legs';
  if (l / total < 0.15) return 'upper';
  if ((p + u) / total < 0.15) return 'lower';
  return 'full';
}

// ── Plan ──

const round = (x: number, step: number) => Math.round(x / step) * step;

/** kg → user unit, rounded to a loadable step (0.5 lb / 0.25 kg). */
export function convertWeight(kg: number, unit: 'lb' | 'kg'): number {
  return unit === 'lb' ? round(kg * KG_TO_LB, 0.5) : round(kg, 0.25);
}

function timedNote(r: FitbodRow): string | null {
  const parts: string[] = [];
  if (r.durationSec > 0) {
    parts.push(r.durationSec >= 120 ? `${Math.round(r.durationSec / 60)} min` : `${Math.round(r.durationSec)}s`);
  }
  if (r.distanceM > 0) parts.push(r.distanceM >= 1000 ? `${(r.distanceM / 1000).toFixed(2)} km` : `${Math.round(r.distanceM)} m`);
  if (r.note) parts.push(r.note);
  return parts.length ? parts.join(', ') : null;
}

/**
 * Groups rows into workouts with deterministic ids (re-importing the same
 * export is a no-op under INSERT OR IGNORE), orders each exercise's sets
 * warmups-first, and computes a best-set metric per exercise per workout.
 *
 * muscleGroupsFor resolves an exercise name to its muscle_groups (seed or guessed).
 */
export function planFitbodImport(
  rows: FitbodRow[],
  unit: 'lb' | 'kg',
  muscleGroupsFor: (exercise: string) => string,
): ImportPlan {
  const byDate = new Map<string, FitbodRow[]>();
  for (const r of rows) {
    const list = byDate.get(r.date);
    if (list) list.push(r);
    else byDate.set(r.date, [r]);
  }

  const workouts: PlannedWorkout[] = [];
  const metrics: PlannedMetric[] = [];
  const exerciseNames = new Set<string>();

  for (const [date, wRows] of byDate) {
    const key = `fitbod-${new Date(date).getTime()}`;

    // Keep exercise order as exported; within an exercise, warmups first
    const order: string[] = [];
    const byEx = new Map<string, FitbodRow[]>();
    for (const r of wRows) {
      if (!byEx.has(r.exercise)) { order.push(r.exercise); byEx.set(r.exercise, []); }
      byEx.get(r.exercise)!.push(r);
    }

    const sets: PlannedSet[] = [];
    const workingMuscles: string[] = [];
    let idx = 1;
    for (const ex of order) {
      exerciseNames.add(ex);
      const exRows = byEx.get(ex)!;
      const ordered = [...exRows.filter((r) => r.isWarmup), ...exRows.filter((r) => !r.isWarmup)];
      let best: { e1rm: number; weight: number; reps: number } | null = null;

      for (const r of ordered) {
        const timed = r.reps === 0 && (r.durationSec > 0 || r.distanceM > 0);
        const weight = r.weightKg > 0 ? convertWeight(r.weightKg, unit) : timed ? null : 0;
        const reps = timed ? null : r.reps;
        sets.push({
          id: `${key}-${idx}`,
          exercise: ex,
          set_index: idx,
          weight,
          reps,
          is_warmup: r.isWarmup ? 1 : 0,
          notes: timedNote(r),
        });
        idx++;
        if (!r.isWarmup) {
          workingMuscles.push(muscleGroupsFor(ex));
          if (weight && reps) {
            const e1rm = epley1RM(weight, reps);
            if (!best || e1rm > best.e1rm) best = { e1rm, weight, reps };
          }
        }
      }

      if (best) {
        metrics.push({
          id: `${key}-${ex}`,
          date,
          exercise: ex,
          est_1rm: Math.round(best.e1rm * 10) / 10,
          top_set_weight: best.weight,
          top_set_reps: best.reps,
        });
      }
    }

    workouts.push({ id: key, date, split: inferSplit(workingMuscles), sets });
  }

  workouts.sort((a, b) => (a.date < b.date ? -1 : 1));
  return { workouts, metrics, exerciseNames: [...exerciseNames].sort() };
}
