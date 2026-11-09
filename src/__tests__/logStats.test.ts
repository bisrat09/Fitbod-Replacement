import { computeLogStats, weekStart, weekDaysSunFirst, workoutTitle, summarizeNames, formatDuration, formatVolume, muscleLabel } from '@/lib/logStats';

describe('weekStart', () => {
  it('returns Monday', () => {
    expect(weekStart('2026-11-08')).toBe('2026-11-02'); // Sunday -> previous Monday
    expect(weekStart('2026-11-09')).toBe('2026-11-09'); // Monday
    expect(weekStart('2026-11-14')).toBe('2026-11-09'); // Saturday
  });
});

describe('weekDaysSunFirst', () => {
  it('lists Sun..Sat around the day', () => {
    expect(weekDaysSunFirst('2026-11-11')).toEqual([
      '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14',
    ]);
  });
});

describe('computeLogStats', () => {
  const today = '2026-11-11'; // Wed; week = Nov 9..15
  it('counts total workouts and distinct days this week', () => {
    const s = computeLogStats(['2026-11-10', '2026-11-10', '2026-11-09', '2026-11-05'], 4, today);
    expect(s.total).toBe(4);
    expect(s.daysThisWeek).toBe(2);
  });
  it('streak counts prior weeks that hit the goal, unfinished week does not break it', () => {
    const lastWeek = ['2026-11-02', '2026-11-03', '2026-11-05', '2026-11-07'];
    const twoAgo = ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-30'];
    const s = computeLogStats([...lastWeek, ...twoAgo, '2026-11-10'], 4, today);
    expect(s.streakWeeks).toBe(2);
  });
  it('current week adds to streak once goal is hit', () => {
    const thisWeek = ['2026-11-09', '2026-11-10', '2026-11-11'];
    expect(computeLogStats(thisWeek, 3, today).streakWeeks).toBe(1);
  });
  it('a missed week resets the streak', () => {
    const s = computeLogStats(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29'], 4, today);
    expect(s.streakWeeks).toBe(0);
  });
  it('handles no workouts', () => {
    expect(computeLogStats([], 4, today)).toEqual({ total: 0, daysThisWeek: 0, streakWeeks: 0 });
  });
});

describe('workoutTitle', () => {
  it('ranks primary muscles by working sets', () => {
    const sets = ['chest', 'chest', 'chest', 'quads,glutes', 'quads,glutes', 'biceps', 'core'].join('|');
    expect(workoutTitle(sets)).toBe('Chest, Quads, Biceps');
  });
  it('merges muscles with the same label', () => {
    expect(workoutTitle('lats,upper_back|upper_back|delts')).toBe('Back, Shoulders');
  });
  it('falls back to Workout', () => {
    expect(workoutTitle(null)).toBe('Workout');
    expect(workoutTitle('')).toBe('Workout');
  });
  it('labels unknown groups nicely', () => {
    expect(muscleLabel('hip_flexors')).toBe('Hip Flexors');
  });
});

describe('formatting', () => {
  it('summarizes names', () => {
    expect(summarizeNames([])).toBe('No exercises');
    expect(summarizeNames(['A', 'B'])).toBe('A, B');
    expect(summarizeNames(['A', 'B', 'C', 'D', 'E', 'F'])).toBe('A, B, C and 3 more');
  });
  it('formats duration and volume', () => {
    expect(formatDuration(0)).toBe('');
    expect(formatDuration(3360)).toBe('56 min');
    expect(formatDuration(4020)).toBe('1h 07m');
    expect(formatVolume(19450)).toBe('19,450');
  });
});
