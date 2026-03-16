/**
 * Compute muscle group percentages from a list of exercises.
 * Pure utility — no React Native dependencies.
 */

export type MuscleTarget = { muscle: string; percentage: number };

export function computeTargetMuscles(
  exercises: { muscle_groups: string }[]
): MuscleTarget[] {
  const counts: Record<string, number> = {};
  let total = 0;

  for (const ex of exercises) {
    const muscles = ex.muscle_groups.split(',').map((s) => s.trim()).filter(Boolean);
    for (const m of muscles) {
      counts[m] = (counts[m] ?? 0) + 1;
      total++;
    }
  }

  if (total === 0) return [];

  return Object.entries(counts)
    .map(([muscle, count]) => ({
      muscle: formatMuscle(muscle),
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 8);
}

function formatMuscle(raw: string): string {
  return raw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
