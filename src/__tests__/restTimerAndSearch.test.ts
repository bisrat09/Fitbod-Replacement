import {
  defaultRestSeconds, clampRest, startTimer, timeLeft, pauseTimer, resumeTimer, adjustTimer, finishTimer,
} from '@/lib/restTimer';
import { scoreExercise, searchExercises, normalize } from '@/lib/exerciseSearch';

describe('defaultRestSeconds', () => {
  it('gives heavy barbell compounds 2 minutes', () => {
    expect(defaultRestSeconds({ name: 'Barbell Bench Press', muscle_groups: 'chest', is_compound: 1 })).toBe(120);
    expect(defaultRestSeconds({ name: 'Deadlift', muscle_groups: 'hamstrings', is_compound: 1 })).toBe(120);
    expect(defaultRestSeconds({ name: 'Back Squat', muscle_groups: 'quads,glutes', is_compound: 1 })).toBe(120);
  });
  it('gives other compounds 90s', () => {
    expect(defaultRestSeconds({ name: 'Dumbbell Bench Press', muscle_groups: 'chest', is_compound: 1 })).toBe(90);
    expect(defaultRestSeconds({ name: 'Lat Pulldown', muscle_groups: 'lats,upper_back', is_compound: 1 })).toBe(90);
  });
  it('gives isolation 60s', () => {
    expect(defaultRestSeconds({ name: 'Dumbbell Bicep Curl', muscle_groups: 'biceps', is_compound: 0 })).toBe(60);
    expect(defaultRestSeconds({ name: 'Lateral Raise', muscle_groups: 'delts', is_compound: 0 })).toBe(60);
  });
  it('gives core, calves, forearms 30s', () => {
    expect(defaultRestSeconds({ name: 'Plank', muscle_groups: 'core', is_compound: 0 })).toBe(30);
    expect(defaultRestSeconds({ name: 'Standing Machine Calf Press', muscle_groups: 'calves', is_compound: 0 })).toBe(30);
    expect(defaultRestSeconds({ name: 'Wrist Curl', muscle_groups: 'forearms', is_compound: 0 })).toBe(30);
  });
  it('falls back to 90s with no info', () => {
    expect(defaultRestSeconds(null)).toBe(90);
  });
  it('clamps', () => {
    expect(clampRest(0)).toBe(15);
    expect(clampRest(9999)).toBe(600);
  });
});

describe('wall-clock timer', () => {
  const t0 = 1_000_000;
  it('keeps counting while the app is away (no ticks needed)', () => {
    const st = startTimer(60, t0, 'ex');
    expect(timeLeft(st, t0)).toBe(60);
    // 45 seconds pass with zero ticks (backgrounded)
    expect(timeLeft(st, t0 + 45_000)).toBe(15);
    expect(timeLeft(st, t0 + 120_000)).toBe(0);
  });
  it('pauses and resumes', () => {
    let st = startTimer(60, t0);
    st = pauseTimer(st, t0 + 20_000);
    expect(st.running).toBe(false);
    expect(timeLeft(st, t0 + 500_000)).toBe(40);
    st = resumeTimer(st, t0 + 500_000);
    expect(timeLeft(st, t0 + 510_000)).toBe(30);
  });
  it('adjusts running timer and duration', () => {
    let st = startTimer(60, t0);
    st = adjustTimer(st, -10, t0 + 5_000);
    expect(timeLeft(st, t0 + 5_000)).toBe(45);
    expect(st.duration).toBe(50);
    st = adjustTimer(st, -100, t0 + 5_000);
    expect(timeLeft(st, t0 + 5_000)).toBe(0);
  });
  it('finish zeroes and stops', () => {
    const st = finishTimer(startTimer(60, t0));
    expect(st.running).toBe(false);
    expect(timeLeft(st, t0)).toBe(0);
  });
});

describe('exercise search', () => {
  const names = [
    'Dumbbell Bench Press', 'Barbell Bench Press', 'Incline Dumbbell Bench Press', 'Pull Up',
    'Dumbbell Bicep Curl', 'Cable Rope Tricep Extension', 'Romanian Deadlift', 'Close-Grip Bench Press',
    'Skullcrusher', 'Lat Pulldown',
  ].map((name) => ({ name }));
  const find = (q: string) => searchExercises(names, q).map((x) => x.name);

  it('normalizes punctuation', () => {
    expect(normalize('Close-Grip  Bench/Press')).toBe('close grip bench press');
  });
  it('matches partial words in any order', () => {
    expect(find('bench dumb')).toEqual(expect.arrayContaining(['Dumbbell Bench Press', 'Incline Dumbbell Bench Press']));
    expect(find('ben')).toHaveLength(4);
    expect(find('incl db')).toEqual(['Incline Dumbbell Bench Press']);
  });
  it('expands gym abbreviations', () => {
    expect(find('db curl')).toEqual(['Dumbbell Bicep Curl']);
    expect(find('rdl')).toEqual(['Romanian Deadlift']);
    expect(find('tri ext')).toEqual(['Cable Rope Tricep Extension']);
  });
  it('handles plurals and joined words', () => {
    expect(find('curls')).toEqual(['Dumbbell Bicep Curl']);
    expect(find('pullup')).toEqual(['Pull Up']);
    expect(find('close grip')).toEqual(['Close-Grip Bench Press']);
  });
  it('ranks whole-word and prefix matches first', () => {
    expect(find('incline')[0]).toBe('Incline Dumbbell Bench Press');
    expect(scoreExercise('Lat Pulldown', 'lat')).toBeGreaterThan(scoreExercise('Lateral Raise', 'lat'));
  });
  it('returns nothing for non-matches and everything for empty query', () => {
    expect(find('zzz')).toEqual([]);
    expect(find('  ')).toHaveLength(names.length);
  });
});
