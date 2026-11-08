/**
 * Forgiving exercise search.
 *
 * Old behaviour: exact substring on the full name, so "db bench", "bench dumbbell",
 * "pullup" or "curls" returned nothing. Now every query word must match the start
 * of some word in the name (any order), with common gym abbreviations expanded,
 * hyphens ignored, and simple plurals tolerated.
 */

const ALIASES: Record<string, string[]> = {
  db: ['dumbbell'],
  dbs: ['dumbbell'],
  bb: ['barbell'],
  kb: ['kettlebell'],
  ez: ['ez'],
  sa: ['single arm'],
  sl: ['single leg'],
  ohp: ['overhead press'],
  rdl: ['romanian deadlift'],
  sldl: ['stiff leg deadlift'],
  bw: ['bodyweight'],
  tri: ['tricep'],
  tris: ['tricep'],
  bi: ['bicep'],
  bis: ['bicep'],
  lat: ['lat'],
  lats: ['lat'],
  delt: ['delt', 'shoulder'],
  delts: ['delt', 'shoulder'],
  abs: ['ab', 'crunch', 'core'],
  incl: ['incline'],
  decl: ['decline'],
  ext: ['extension'],
  mach: ['machine'],
};

export function normalize(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/[-_/,()]+/g, ' ')
    .replace(/[^a-z0-9 ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function singular(w: string): string {
  if (w.length > 3 && w.endsWith('es') && /(ss|sh|ch|x)es$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

/** A single query term matches if it prefixes any name word, or appears in the name with spaces removed. */
function termMatches(term: string, words: string[], joined: string): boolean {
  const t = singular(term);
  if (words.some((w) => w.startsWith(term) || w.startsWith(t) || singular(w) === t)) return true;
  // "pullup" vs "pull up", "skullcrusher" vs "skull crusher"
  return t.length >= 4 && joined.includes(t);
}

function phraseMatches(phrase: string, words: string[], joined: string): boolean {
  return phrase.split(' ').every((p) => termMatches(p, words, joined));
}

/** Returns a score > 0 if `name` matches `query`, else 0. Higher is better. */
export function scoreExercise(name: string, query: string): number {
  const q = normalize(query);
  if (!q) return 1;
  const n = normalize(name);
  const words = n.split(' ');
  const joined = words.join('');
  const terms = q.split(' ');

  const allMatch = terms.every((term) => {
    if (termMatches(term, words, joined)) return true;
    const alts = ALIASES[term];
    return !!alts && alts.some((a) => phraseMatches(a, words, joined));
  });
  if (!allMatch) return 0;

  let score = 10;
  if (n === q) score += 100;
  else if (n.startsWith(q)) score += 50;
  else if (n.includes(q)) score += 25;
  if (words[0].startsWith(terms[0])) score += 10;
  score += terms.filter((t) => words.includes(t)).length * 5; // whole-word hits beat prefix hits
  score -= words.length * 0.5; // prefer shorter, more canonical names
  return score;
}

/** Filter + rank. Stable for ties (keeps caller's order, e.g. favourites/recency). */
export function searchExercises<T extends { name: string }>(items: T[], query: string): T[] {
  if (!normalize(query)) return items;
  return items
    .map((item, i) => ({ item, i, s: scoreExercise(item.name, query) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.item);
}
