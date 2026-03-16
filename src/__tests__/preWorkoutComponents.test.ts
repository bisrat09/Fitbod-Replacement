import { computeTargetMuscles } from '@/lib/targetMuscles';

// ── computeTargetMuscles (pure function) ──

describe('computeTargetMuscles', () => {
  test('returns empty array for no exercises', () => {
    expect(computeTargetMuscles([])).toEqual([]);
  });

  test('returns empty array for exercises with empty muscle_groups', () => {
    expect(computeTargetMuscles([{ muscle_groups: '' }])).toEqual([]);
  });

  test('computes percentages from single exercise', () => {
    const result = computeTargetMuscles([
      { muscle_groups: 'chest,triceps' },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].percentage).toBe(50);
    expect(result[1].percentage).toBe(50);
  });

  test('formats underscored muscle names', () => {
    const result = computeTargetMuscles([
      { muscle_groups: 'front_delts' },
    ]);
    expect(result[0].muscle).toBe('Front Delts');
  });

  test('sorts by percentage descending', () => {
    const result = computeTargetMuscles([
      { muscle_groups: 'chest,triceps' },
      { muscle_groups: 'chest,front_delts' },
      { muscle_groups: 'chest' },
    ]);
    expect(result[0].muscle).toBe('Chest');
    expect(result[0].percentage).toBeGreaterThan(result[1].percentage);
  });

  test('limits to 8 muscles maximum', () => {
    const exercises = [
      { muscle_groups: 'a,b,c,d,e,f,g,h,i,j' },
    ];
    const result = computeTargetMuscles(exercises);
    expect(result.length).toBeLessThanOrEqual(8);
  });

  test('handles multiple exercises with correct distribution', () => {
    const result = computeTargetMuscles([
      { muscle_groups: 'chest,triceps' },
      { muscle_groups: 'chest,front_delts' },
    ]);
    // chest appears 2/4 = 50%, triceps 1/4 = 25%, front_delts 1/4 = 25%
    expect(result).toHaveLength(3);
    const chest = result.find(t => t.muscle === 'Chest');
    expect(chest?.percentage).toBe(50);
    const triceps = result.find(t => t.muscle === 'Triceps');
    expect(triceps?.percentage).toBe(25);
  });

  test('trims whitespace in muscle names', () => {
    const result = computeTargetMuscles([
      { muscle_groups: ' chest , triceps ' },
    ]);
    expect(result.map(t => t.muscle)).toContain('Chest');
    expect(result.map(t => t.muscle)).toContain('Triceps');
  });

  test('capitalizes each word', () => {
    const result = computeTargetMuscles([
      { muscle_groups: 'upper_back' },
    ]);
    expect(result[0].muscle).toBe('Upper Back');
  });

  test('percentages sum to approximately 100', () => {
    const result = computeTargetMuscles([
      { muscle_groups: 'chest,triceps,front_delts' },
      { muscle_groups: 'chest,lats' },
    ]);
    const sum = result.reduce((acc, t) => acc + t.percentage, 0);
    // Rounding can cause slight deviation
    expect(sum).toBeGreaterThanOrEqual(96);
    expect(sum).toBeLessThanOrEqual(104);
  });
});
