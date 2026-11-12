/**
 * Body fat goal tracker (pure logic).
 *
 * Scale body fat readings (bioimpedance) swing day to day with hydration, so everything
 * here works on a 7-day average and a 4-week trend, never a single weigh-in.
 */

export const DEFAULT_BODY_FAT_GOAL = 15;
export const BODY_FAT_GOAL_SETTING = 'body_fat_goal_pct';
export const BODY_FAT_START_SETTING = 'body_fat_start_pct';

const DAY_MS = 24 * 60 * 60 * 1000;
const AVG_DAYS = 7;
const TREND_DAYS = 28;
/** A trend needs readings on at least this many days... */
const TREND_MIN_DAYS = 5;
/** ...spread over at least this many days. */
const TREND_MIN_SPAN_DAYS = 10;
/** Slower than this (points per week) is treated as flat: no date is promised. */
const MIN_WEEKLY_DROP = 0.05;
const MAX_WEEKS = 104;

export type FatSample = { date: string; percent: number };
export type MassSample = { date: string; weight: number };

export type BodyFatGoal = {
  /** 7-day average body fat in percent (or the latest reading when `stale`). */
  bodyFat: number;
  /** Days with a reading in the last 7 days. */
  days: number;
  /** No reading in the last 7 days: `bodyFat` is the most recent single day. */
  stale: boolean;
  goalPct: number;
  reached: boolean;
  /** Body fat change in percentage points per week over 4 weeks; negative = dropping. */
  weeklyChange: number | null;
  /** Weeks until the goal at the current trend; null when flat, rising or too little data. */
  weeksToGoal: number | null;
  /** 0..1 from the starting body fat to the goal; null without a start above the goal. */
  progress: number | null;
  /** Null when Health has no weight to pair with the body fat reading. */
  mass: {
    weight: number;
    leanMass: number;
    fatMass: number;
    /** Weight at the goal if all lean mass is kept. */
    goalWeight: number;
    toLose: number;
  } | null;
};

/** HealthKit reports body fat as a fraction (0.224); people read it as 22.4. */
export function normalizePercent(v: number): number {
  return v <= 1 ? v * 100 : v;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** One value per calendar day (mean of that day's readings), oldest first. */
function dailyMeans(samples: { date: string; value: number }[]): { t: number; value: number }[] {
  const byDay = new Map<string, { t: number; sum: number; n: number }>();
  for (const s of samples) {
    const t = Date.parse(s.date);
    if (Number.isNaN(t) || !Number.isFinite(s.value) || s.value <= 0) continue;
    const key = new Date(t).toISOString().slice(0, 10);
    const d = byDay.get(key) ?? { t: Date.parse(key), sum: 0, n: 0 };
    d.sum += s.value;
    d.n += 1;
    byDay.set(key, d);
  }
  return [...byDay.values()].map((d) => ({ t: d.t, value: d.sum / d.n })).sort((a, b) => a.t - b.t);
}

function recentAverage(days: { t: number; value: number }[], now: number) {
  const recent = days.filter((d) => d.t > now - AVG_DAYS * DAY_MS && d.t <= now);
  if (recent.length) return { value: recent.reduce((a, d) => a + d.value, 0) / recent.length, days: recent.length, stale: false };
  const last = days[days.length - 1];
  return last ? { value: last.value, days: 0, stale: true } : null;
}

/** Least-squares slope in units per week, or null with too little data. */
function weeklySlope(days: { t: number; value: number }[], now: number): number | null {
  const pts = days.filter((d) => d.t > now - TREND_DAYS * DAY_MS && d.t <= now);
  if (pts.length < TREND_MIN_DAYS) return null;
  if (pts[pts.length - 1].t - pts[0].t < TREND_MIN_SPAN_DAYS * DAY_MS) return null;
  const xs = pts.map((p) => (p.t - pts[0].t) / DAY_MS);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = pts.reduce((a, p) => a + p.value, 0) / pts.length;
  let num = 0;
  let den = 0;
  pts.forEach((p, i) => { num += (xs[i] - mx) * (p.value - my); den += (xs[i] - mx) ** 2; });
  return den === 0 ? null : (num / den) * 7;
}

export function computeBodyFatGoal(args: {
  fats: FatSample[];
  weights: MassSample[];
  goalPct: number;
  /** Body fat when tracking started, for the progress bar. */
  startPct?: number | null;
  now: Date;
}): BodyFatGoal | null {
  const now = args.now.getTime();
  const fatDays = dailyMeans(args.fats.map((f) => ({ date: f.date, value: normalizePercent(f.percent) })));
  const fat = recentAverage(fatDays, now);
  if (!fat) return null;

  const bodyFat = round1(fat.value);
  const goalPct = args.goalPct;
  const reached = bodyFat <= goalPct;

  const slope = weeklySlope(fatDays, now);
  const weeklyChange = slope == null ? null : Math.round(slope * 100) / 100;
  let weeksToGoal: number | null = null;
  if (!reached && slope != null && slope <= -MIN_WEEKLY_DROP) {
    const w = (fat.value - goalPct) / -slope;
    weeksToGoal = w <= MAX_WEEKS ? Math.ceil(w) : null;
  }

  let progress: number | null = null;
  if (args.startPct != null && args.startPct > goalPct) {
    progress = Math.min(1, Math.max(0, (args.startPct - fat.value) / (args.startPct - goalPct)));
  }

  const w = recentAverage(dailyMeans(args.weights.map((m) => ({ date: m.date, value: m.weight }))), now);
  let mass: BodyFatGoal['mass'] = null;
  if (w && goalPct < 100) {
    const leanMass = w.value * (1 - fat.value / 100);
    const goalWeight = leanMass / (1 - goalPct / 100);
    mass = {
      weight: round1(w.value),
      leanMass: round1(leanMass),
      fatMass: round1(w.value - leanMass),
      goalWeight: round1(goalWeight),
      toLose: round1(Math.max(0, w.value - goalWeight)),
    };
  }

  return { bodyFat, days: fat.days, stale: fat.stale, goalPct, reached, weeklyChange, weeksToGoal, progress, mass };
}

/** Accepts "15", "15%", "14.5"; returns null outside a sane 3-50% range. */
export function parseGoalPct(input: string): number | null {
  const n = parseFloat(input.replace('%', '').trim());
  if (!Number.isFinite(n) || n < 3 || n > 50) return null;
  return round1(n);
}
