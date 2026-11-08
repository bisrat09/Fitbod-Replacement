/**
 * Fitbod-style muscle recovery. Pure logic, no DB or React Native.
 *
 * Every completed working set adds fatigue to the muscles it trains
 * (primary muscle 1.0, secondary muscles 0.5). That fatigue fades linearly
 * to zero over the muscle's recovery window. Recovery = 1 - fatigue / FULL_FATIGUE_SETS.
 */

/** Effective sets that leave a muscle at 0% recovered. */
export const FULL_FATIGUE_SETS = 10;
export const SECONDARY_WEIGHT = 0.5;

/** Large muscles take longer to recover than small ones. */
const LARGE_MUSCLES = new Set(['chest', 'upper_chest', 'lats', 'upper_back', 'quads', 'glutes', 'hamstrings', 'lower_back']);
export const LARGE_RECOVERY_HOURS = 72;
export const SMALL_RECOVERY_HOURS = 48;

/** How far back fatigue can still matter. */
export const RECOVERY_LOOKBACK_DAYS = 4;

/** Below this a muscle is "still recovering" and the generator avoids it. */
export const FRESH_THRESHOLD = 0.6;

export type MuscleSetEntry = { date: string; muscle_groups: string };
export type RecoveryMap = Record<string, number>;

export function recoveryHours(muscle: string): number {
  return LARGE_MUSCLES.has(muscle) ? LARGE_RECOVERY_HOURS : SMALL_RECOVERY_HOURS;
}

function parseMuscles(mg: string): string[] {
  return mg.split(',').map((s) => s.trim()).filter(Boolean);
}

/**
 * Recovery (0..1) for every muscle that has fatigue. Muscles not in the map are fully recovered;
 * read them with `recoveryOf`.
 */
export function computeRecovery(entries: MuscleSetEntry[], now: number = Date.now()): RecoveryMap {
  const fatigue: Record<string, number> = {};
  for (const e of entries) {
    const t = new Date(e.date).getTime();
    if (!Number.isFinite(t)) continue;
    const hours = Math.max(0, (now - t) / 3600000);
    parseMuscles(e.muscle_groups).forEach((m, i) => {
      const left = 1 - hours / recoveryHours(m);
      if (left <= 0) return;
      fatigue[m] = (fatigue[m] ?? 0) + (i === 0 ? 1 : SECONDARY_WEIGHT) * left;
    });
  }
  const out: RecoveryMap = {};
  for (const [m, f] of Object.entries(fatigue)) {
    out[m] = Math.max(0, Math.min(1, 1 - f / FULL_FATIGUE_SETS));
  }
  return out;
}

export function recoveryOf(recovery: RecoveryMap, muscle: string): number {
  return recovery[muscle] ?? 1;
}

/** Muscles still recovering, most fatigued first, for display. */
export function recoveringMuscles(recovery: RecoveryMap, limit = 6): { muscle: string; percentage: number }[] {
  return Object.entries(recovery)
    .filter(([, r]) => r < 0.995)
    .sort((a, b) => a[1] - b[1])
    .slice(0, limit)
    .map(([m, r]) => ({ muscle: m, percentage: Math.round(r * 100) }));
}
