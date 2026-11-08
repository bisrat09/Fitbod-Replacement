/**
 * Cardio machines (stair stepper, treadmill, bike...) are tracked by time,
 * level and calories instead of reps and weight. Pure logic.
 */

/** An exercise is cardio when its primary muscle group is "cardio". */
export function isCardio(muscleGroups: string | null | undefined): boolean {
  return (muscleGroups ?? '').split(',')[0].trim().toLowerCase() === 'cardio';
}

/** Vigorous machine cardio (stair climber ~9, rowing/elliptical ~7-8). Used only when the machine's calories aren't logged. */
export const CARDIO_MET = 8.0;
const LB_PER_KG = 2.20462;

export function estimateCardioCalories(durationSec: number, bodyWeight: number | null | undefined, unit: 'lb' | 'kg'): number | null {
  if (!bodyWeight || bodyWeight <= 0 || durationSec <= 0) return null;
  const kg = unit === 'lb' ? bodyWeight / LB_PER_KG : bodyWeight;
  return Math.round(CARDIO_MET * kg * (durationSec / 3600));
}

/** 754 → "12:34", 3725 → "1:02:05" */
export function formatClock(sec: number | null | undefined): string {
  const s = Math.max(0, Math.round(sec ?? 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const ss = String(r).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** "12:30" → 750, "1:02:05" → 3725, "20" → 1200 (a bare number is minutes). Null if unreadable. */
export function parseClock(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  if (/^\d+(\.\d+)?$/.test(t)) return Math.round(parseFloat(t) * 60);
  const parts = t.split(':');
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return null;
  const n = parts.map((p) => parseInt(p, 10));
  return n.length === 2 ? n[0] * 60 + n[1] : n[0] * 3600 + n[1] * 60 + n[2];
}

export type BriefSet = {
  weight?: number | null; reps?: number | null; rir?: number | null;
  duration_sec?: number | null; level?: number | null; calories?: number | null; notes?: string | null;
};

/** One-line description of a set for "Last:" previews and summaries. */
export function describeSet(s: BriefSet, unit: string): string {
  if (s.duration_sec || s.level != null || s.calories != null) {
    const parts: string[] = [];
    if (s.duration_sec) parts.push(formatClock(s.duration_sec));
    if (s.level != null) parts.push(`L${s.level}`);
    if (s.calories != null) parts.push(`${s.calories} cal`);
    return parts.join(' · ');
  }
  if (s.reps == null && s.weight == null) return s.notes || '-';
  const w = s.weight ? `${s.weight}${unit}×` : '';
  return `${w}${s.reps ?? 0}${s.rir != null ? ` @${s.rir}` : ''}`;
}
