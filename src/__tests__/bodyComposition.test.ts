import { computeBodyFatGoal, normalizePercent, parseGoalPct, type FatSample, type MassSample } from '@/lib/bodyComposition';

const now = new Date('2026-11-12T12:00:00.000Z');
const day = (daysAgo: number, hour = 7) => {
  const d = new Date(Date.UTC(2026, 10, 12 - daysAgo, hour));
  return d.toISOString();
};
const fats = (vals: [number, number][]): FatSample[] => vals.map(([ago, percent]) => ({ date: day(ago), percent }));
const weights = (vals: [number, number][]): MassSample[] => vals.map(([ago, weight]) => ({ date: day(ago), weight }));

describe('normalizePercent', () => {
  it('turns HealthKit fractions into percent', () => {
    expect(normalizePercent(0.224)).toBeCloseTo(22.4);
    expect(normalizePercent(22.4)).toBe(22.4);
  });
});

describe('parseGoalPct', () => {
  it('parses and bounds the goal', () => {
    expect(parseGoalPct('15')).toBe(15);
    expect(parseGoalPct(' 14.5% ')).toBe(14.5);
    expect(parseGoalPct('0')).toBeNull();
    expect(parseGoalPct('80')).toBeNull();
    expect(parseGoalPct('abc')).toBeNull();
  });
});

describe('computeBodyFatGoal', () => {
  it('returns null without body fat readings', () => {
    expect(computeBodyFatGoal({ fats: [], weights: weights([[0, 190]]), goalPct: 15, now })).toBeNull();
  });

  it('works out lean mass and the weight at the goal', () => {
    const g = computeBodyFatGoal({ fats: fats([[0, 0.22]]), weights: weights([[0, 190]]), goalPct: 15, now })!;
    expect(g.bodyFat).toBe(22);
    expect(g.mass).toEqual({ weight: 190, leanMass: 148.2, fatMass: 41.8, goalWeight: 174.4, toLose: 15.6 });
    expect(g.reached).toBe(false);
  });

  it('averages the last 7 days, one value per day', () => {
    const g = computeBodyFatGoal({
      // two readings on the same day count once; day 9 is outside the window
      fats: [...fats([[0, 22], [1, 23], [2, 21], [9, 30]]), { date: day(0, 20), percent: 24 }],
      weights: weights([[0, 190], [3, 192]]),
      goalPct: 15, now,
    })!;
    expect(g.bodyFat).toBe(22.3); // (23 + 23 + 21) / 3
    expect(g.days).toBe(3);
    expect(g.stale).toBe(false);
    expect(g.mass!.weight).toBe(191);
  });

  it('falls back to the latest reading when the week is empty', () => {
    const g = computeBodyFatGoal({ fats: fats([[12, 24], [20, 26]]), weights: [], goalPct: 15, now })!;
    expect(g.bodyFat).toBe(24);
    expect(g.stale).toBe(true);
    expect(g.days).toBe(0);
    expect(g.mass).toBeNull();
  });

  it('gives a trend and weeks to goal when body fat is dropping', () => {
    // 0.1 points per day down: 22.0 today, 24.7 four weeks ago
    const series: [number, number][] = Array.from({ length: 28 }, (_, i) => [i, 22 + i * 0.1]);
    const g = computeBodyFatGoal({ fats: fats(series), weights: weights([[0, 190]]), goalPct: 15, now })!;
    expect(g.weeklyChange).toBeCloseTo(-0.7, 2);
    expect(g.bodyFat).toBe(22.3); // 7-day average of 22.0..22.6
    expect(g.weeksToGoal).toBe(11); // 7.3 points / 0.7 per week
  });

  it('promises no date when flat, rising or short on data', () => {
    const flat = computeBodyFatGoal({ fats: fats(Array.from({ length: 20 }, (_, i) => [i, 22] as [number, number])), weights: [], goalPct: 15, now })!;
    expect(flat.weeklyChange).toBeCloseTo(0);
    expect(flat.weeksToGoal).toBeNull();

    const rising = computeBodyFatGoal({ fats: fats(Array.from({ length: 20 }, (_, i) => [i, 24 - i * 0.1] as [number, number])), weights: [], goalPct: 15, now })!;
    expect(rising.weeklyChange!).toBeGreaterThan(0);
    expect(rising.weeksToGoal).toBeNull();

    const short = computeBodyFatGoal({ fats: fats([[0, 22], [1, 22.5], [2, 23]]), weights: [], goalPct: 15, now })!;
    expect(short.weeklyChange).toBeNull();
    expect(short.weeksToGoal).toBeNull();
  });

  it('tracks progress from the starting body fat', () => {
    const g = computeBodyFatGoal({ fats: fats([[0, 20]]), weights: [], goalPct: 15, startPct: 25, now })!;
    expect(g.progress).toBeCloseTo(0.5);
    const none = computeBodyFatGoal({ fats: fats([[0, 20]]), weights: [], goalPct: 15, now })!;
    expect(none.progress).toBeNull();
    const worse = computeBodyFatGoal({ fats: fats([[0, 27]]), weights: [], goalPct: 15, startPct: 25, now })!;
    expect(worse.progress).toBe(0);
  });

  it('marks the goal reached', () => {
    const g = computeBodyFatGoal({ fats: fats([[0, 14.6]]), weights: weights([[0, 175]]), goalPct: 15, startPct: 22, now })!;
    expect(g.reached).toBe(true);
    expect(g.progress).toBe(1);
    expect(g.mass!.toLose).toBe(0);
    expect(g.weeksToGoal).toBeNull();
  });

  it('ignores bad samples', () => {
    const g = computeBodyFatGoal({
      fats: [{ date: 'nope', percent: 50 }, { date: day(0), percent: NaN }, { date: day(1), percent: 22 }],
      weights: [], goalPct: 15, now,
    })!;
    expect(g.bodyFat).toBe(22);
  });
});
