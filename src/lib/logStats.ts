/**
 * Pure helpers for the Log screen: weekly goal + streak, workout titles, exercise summaries.
 * Dates are 'YYYY-MM-DD' strings (same day key the rest of the app uses: ISO date prefix).
 */

export const DEFAULT_WEEKLY_GOAL = 4;

/** Monday of the week containing `day` ('YYYY-MM-DD'), as 'YYYY-MM-DD'. */
export function weekStart(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = dt.getUTCDay(); // 0 = Sun
  dt.setUTCDate(dt.getUTCDate() - (dow === 0 ? 6 : dow - 1));
  return dt.toISOString().slice(0, 10);
}

function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export type LogStats = { total: number; daysThisWeek: number; streakWeeks: number };

/**
 * total: number of workouts. daysThisWeek: distinct training days this week (Mon-Sun).
 * streakWeeks: consecutive weeks that hit the goal, ending last week; the current week
 * is added once it hits the goal (an unfinished week never breaks the streak).
 */
export function computeLogStats(workoutDays: string[], goal: number, today: string): LogStats {
  const days = new Set(workoutDays);
  const perWeek = new Map<string, number>();
  for (const d of days) {
    const w = weekStart(d);
    perWeek.set(w, (perWeek.get(w) ?? 0) + 1);
  }
  const thisWeek = weekStart(today);
  const daysThisWeek = perWeek.get(thisWeek) ?? 0;

  let streak = daysThisWeek >= goal ? 1 : 0;
  let w = addDays(thisWeek, -7);
  while ((perWeek.get(w) ?? 0) >= goal) {
    streak++;
    w = addDays(w, -7);
  }
  return { total: workoutDays.length, daysThisWeek, streakWeeks: streak };
}

/** The 7 'YYYY-MM-DD' days (Sun..Sat) of the week containing `day`, matching the month grid. */
export function weekDaysSunFirst(day: string): string[] {
  const [y, m, d] = day.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const sun = addDays(day, -dow);
  return Array.from({ length: 7 }, (_, i) => addDays(sun, i));
}

const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Chest', upper_chest: 'Chest',
  lats: 'Back', upper_back: 'Back', lower_back: 'Lower Back',
  delts: 'Shoulders', front_delts: 'Shoulders', rear_delts: 'Shoulders',
  biceps: 'Biceps', triceps: 'Triceps', forearms: 'Forearms',
  quads: 'Quads', hamstrings: 'Hamstrings', glutes: 'Glutes', calves: 'Calves',
  core: 'Abs', abs: 'Abs', cardio: 'Cardio',
};

export function muscleLabel(mg: string): string {
  const k = mg.trim().toLowerCase();
  return MUSCLE_LABELS[k] ?? k.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

/**
 * Title like "Chest, Quads, Biceps": top primary muscles by working-set count.
 * `setMuscleGroups` is one exercise muscle_groups string per working set, joined by '|'.
 */
export function workoutTitle(setMuscleGroups: string | null | undefined, max = 3): string {
  const counts = new Map<string, number>();
  const order: string[] = [];
  for (const mg of (setMuscleGroups ?? '').split('|')) {
    const primary = mg.split(',')[0]?.trim();
    if (!primary) continue;
    const label = muscleLabel(primary);
    if (!counts.has(label)) order.push(label);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  if (!order.length) return 'Workout';
  return order
    .map((label, i) => ({ label, i, n: counts.get(label)! }))
    .sort((a, b) => b.n - a.n || a.i - b.i)
    .slice(0, max)
    .map((x) => x.label)
    .join(', ');
}

/** "A, B, C and 3 more" */
export function summarizeNames(names: string[], max = 3): string {
  if (names.length === 0) return 'No exercises';
  if (names.length <= max) return names.join(', ');
  return `${names.slice(0, max).join(', ')} and ${names.length - max} more`;
}

/** 4,350 -> "4,350"; 19450 -> "19,450" */
export function formatVolume(v: number): string {
  return Math.round(v).toLocaleString('en-US');
}

/** 3420 s -> "57 min"; 4000 s -> "1h 07m" */
export function formatDuration(sec: number | null | undefined): string {
  if (!sec || sec <= 0) return '';
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}
