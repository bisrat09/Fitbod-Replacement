/**
 * Smart Workout Generator
 *
 * Pure logic module for automatic workout generation.
 * No database access, no side effects — fully testable.
 */

// ── Split-to-muscle-group mapping ──

export const SPLIT_MUSCLES: Record<string, string[]> = {
  push: ['chest', 'triceps', 'front_delts', 'delts', 'upper_chest'],
  pull: ['lats', 'upper_back', 'biceps', 'rear_delts', 'lower_back', 'forearms'],
  legs: ['quads', 'glutes', 'hamstrings', 'core', 'calves'],
  upper: ['chest', 'triceps', 'front_delts', 'delts', 'upper_chest', 'lats', 'upper_back', 'biceps', 'rear_delts', 'forearms'],
  lower: ['quads', 'glutes', 'hamstrings', 'lower_back', 'core', 'calves'],
  full: ['chest', 'triceps', 'front_delts', 'delts', 'upper_chest', 'lats', 'upper_back', 'biceps', 'rear_delts', 'quads', 'glutes', 'hamstrings', 'lower_back', 'core', 'calves', 'forearms'],
};

// ── Duration-to-exercise-count mapping ──

export const DURATION_EXERCISE_COUNT: Record<number, number> = {
  30: 5,
  45: 8,
  60: 10,
  90: 14,
};

export const DURATION_OPTIONS = [30, 45, 60, 90] as const;
export type DurationOption = (typeof DURATION_OPTIONS)[number];

// ── Types ──

export type RecentWorkout = {
  split: string | null;
  date: string;
};

export type AvailableExercise = {
  id: string;
  name: string;
  muscle_groups: string;
  is_compound: number;
  required_equipment: string | null;
};

export type RecencyEntry = {
  exercise_id: string;
  last_used: string;
};

// ── Split suggestion ──

const SPLIT_PRIORITY = ['push', 'pull', 'legs', 'upper', 'lower', 'full'];

/**
 * Suggests the best split for today based on recent workout history.
 *
 * Algorithm:
 * 1. For each split, find when it was most recently trained
 * 2. The stalest split (longest since last trained) wins
 * 3. Never-trained splits get max priority
 * 4. Ties broken by SPLIT_PRIORITY order (push > pull > legs > ...)
 */
export function suggestSplit(
  recentWorkouts: RecentWorkout[]
): { split: string; daysSince: number | null } {
  const now = new Date();
  const splitLastTrained: Record<string, number> = {};

  for (const w of recentWorkouts) {
    if (!w.split) continue;
    const s = w.split.toLowerCase();
    if (!(s in splitLastTrained)) {
      const daysSince = Math.floor(
        (now.getTime() - new Date(w.date).getTime()) / (1000 * 60 * 60 * 24)
      );
      splitLastTrained[s] = daysSince;
    }
  }

  let bestSplit = 'push';
  let bestScore = -1;
  let bestDaysSince: number | null = null;

  for (const split of SPLIT_PRIORITY) {
    if (split in splitLastTrained) {
      const days = splitLastTrained[split];
      if (days > bestScore) {
        bestScore = days;
        bestSplit = split;
        bestDaysSince = days;
      }
    } else {
      // Never trained — max priority, but respect SPLIT_PRIORITY order
      if (bestScore < 999) {
        bestScore = 999;
        bestSplit = split;
        bestDaysSince = null;
      }
    }
  }

  return { split: bestSplit, daysSince: bestDaysSince };
}

// ── Exercise selection ──

/**
 * Selects exercises for a workout based on split, duration, recency, and favorites.
 *
 * Algorithm:
 * 1. Filter to exercises whose muscle groups overlap with the split
 * 2. Separate compounds and isolations
 * 3. Sort each: favorites first, then stalest first
 * 4. Pick ~60% compounds, ~40% isolations
 * 5. Fill from remaining if not enough matches
 */
export function selectExercises(
  availableExercises: AvailableExercise[],
  split: string,
  count: number,
  recency: RecencyEntry[],
  favoriteIds: Set<string>
): AvailableExercise[] {
  const targetMuscles = new Set(SPLIT_MUSCLES[split] ?? SPLIT_MUSCLES.full);
  const recencyMap = new Map(recency.map((r) => [r.exercise_id, r.last_used]));

  // Filter to exercises matching the split's muscles
  const matching = availableExercises.filter((ex) => {
    const exMuscles = ex.muscle_groups.split(',').map((s) => s.trim());
    return exMuscles.some((m) => targetMuscles.has(m));
  });

  const compounds = matching.filter((ex) => ex.is_compound === 1);
  const isolations = matching.filter((ex) => ex.is_compound !== 1);

  function sortByPriority(exercises: AvailableExercise[]): AvailableExercise[] {
    return [...exercises].sort((a, b) => {
      // Favorites first
      const aFav = favoriteIds.has(a.id) ? 0 : 1;
      const bFav = favoriteIds.has(b.id) ? 0 : 1;
      if (aFav !== bFav) return aFav - bFav;

      // Stalest first (never used = earliest possible date)
      const aDate = recencyMap.get(a.id) ?? '0000-00-00';
      const bDate = recencyMap.get(b.id) ?? '0000-00-00';
      return aDate < bDate ? -1 : aDate > bDate ? 1 : 0;
    });
  }

  const sortedCompounds = sortByPriority(compounds);
  const sortedIsolations = sortByPriority(isolations);

  const compoundCount = Math.min(Math.ceil(count * 0.6), sortedCompounds.length);
  const isolationCount = Math.min(count - compoundCount, sortedIsolations.length);

  const selected = [
    ...sortedCompounds.slice(0, compoundCount),
    ...sortedIsolations.slice(0, isolationCount),
  ];

  // Fill from remaining if not enough
  if (selected.length < count) {
    const selectedIds = new Set(selected.map((e) => e.id));
    const remaining = sortByPriority(
      availableExercises.filter((ex) => !selectedIds.has(ex.id))
    );
    for (const ex of remaining) {
      if (selected.length >= count) break;
      selected.push(ex);
    }
  }

  return selected.slice(0, count);
}

// ── UI helpers ──

export function formatStaleness(daysSince: number | null): string {
  if (daysSince === null) return 'never trained';
  if (daysSince === 0) return 'trained today';
  if (daysSince === 1) return 'last trained yesterday';
  return `last trained ${daysSince} days ago`;
}
