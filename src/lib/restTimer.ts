/**
 * Rest timer: per-exercise default durations + wall-clock timer math.
 *
 * The timer stores an absolute end time instead of counting down tick by tick,
 * so it stays correct when the app is backgrounded (JS intervals are suspended
 * by iOS while the app is not in the foreground).
 */

export type RestExercise = {
  name?: string | null;
  muscle_groups?: string | null;
  is_compound?: number | null;
};

export const REST_MIN = 15;
export const REST_MAX = 600;

const HEAVY_LIFT_RE = /\b(squat|deadlift|bench press|overhead press|military press|rack pull|hip thrust|clean|snatch|jerk)\b/i;
const HEAVY_IMPLEMENT_RE = /\b(barbell|trap bar|hex bar|smith)\b/i;
const BARE_HEAVY_RE = /^(back squat|front squat|squat|deadlift|bench press|sumo deadlift|romanian deadlift|overhead press)$/i;
const SHORT_REST_RE = /\b(plank|crunch|sit[ -]?up|hollow|dead bug|bird dog|flutter|scissor|leg raise|knee raise|v-up|mountain climber|russian twist|calf|wrist|farmer|stretch|jumping jack|burpee|jump rope)\b/i;
const SHORT_REST_GROUPS = new Set(['core', 'abs', 'calves', 'forearms']);

/** Sensible default rest in seconds for an exercise. */
export function defaultRestSeconds(ex: RestExercise | null | undefined): number {
  if (!ex) return 90;
  const name = (ex.name ?? '').trim();
  const groups = (ex.muscle_groups ?? '').toLowerCase().split(',').map((g) => g.trim()).filter(Boolean);
  const compound = ex.is_compound === 1;

  // Heavy barbell compounds: full recovery
  if (BARE_HEAVY_RE.test(name) || (HEAVY_LIFT_RE.test(name) && HEAVY_IMPLEMENT_RE.test(name))) return 120;
  // Core, calves, forearms, conditioning: short
  if (SHORT_REST_RE.test(name) || (groups.length > 0 && groups.every((g) => SHORT_REST_GROUPS.has(g)))) return 30;
  if (compound) return 90;
  return 60;
}

export function clampRest(sec: number): number {
  return Math.max(REST_MIN, Math.min(REST_MAX, Math.round(sec)));
}

export function restSettingKey(exerciseId: string): string {
  return `rest_seconds:${exerciseId}`;
}

// ── Wall-clock timer ──

export type TimerState = {
  exerciseId: string | null;
  duration: number;      // full duration in seconds (for "+/-" learning)
  endAt: number | null;  // epoch ms when running
  pausedLeft: number;    // seconds left when paused
  running: boolean;
};

export function startTimer(duration: number, now: number, exerciseId: string | null = null): TimerState {
  return { exerciseId, duration, endAt: now + duration * 1000, pausedLeft: duration, running: true };
}

export function timeLeft(st: TimerState | undefined, now: number): number {
  if (!st) return 0;
  if (st.running && st.endAt != null) return Math.max(0, Math.ceil((st.endAt - now) / 1000));
  return Math.max(0, st.pausedLeft);
}

export function pauseTimer(st: TimerState, now: number): TimerState {
  if (!st.running) return st;
  return { ...st, running: false, endAt: null, pausedLeft: timeLeft(st, now) };
}

export function resumeTimer(st: TimerState, now: number): TimerState {
  if (st.running || st.pausedLeft <= 0) return st;
  return { ...st, running: true, endAt: now + st.pausedLeft * 1000 };
}

export function adjustTimer(st: TimerState, delta: number, now: number): TimerState {
  const left = Math.max(0, timeLeft(st, now) + delta);
  const duration = Math.max(0, st.duration + delta);
  if (st.running) return { ...st, duration, endAt: now + left * 1000 };
  return { ...st, duration, pausedLeft: left };
}

export function finishTimer(st: TimerState): TimerState {
  return { ...st, running: false, endAt: null, pausedLeft: 0 };
}
