import { exerciseFormVideo, exerciseVideoSearchUrl } from '@/lib/exerciseInstructions';
import videos from '@/data/formVideos.json';

describe('form videos', () => {
  const entries = Object.entries(videos as Record<string, { id: string; title: string; channel: string }>);

  it('every entry is a valid YouTube video id with a title', () => {
    expect(entries.length).toBeGreaterThan(0);
    for (const [, v] of entries) {
      expect(v.id).toMatch(/^[A-Za-z0-9_-]{11}$/);
      expect(v.title.length).toBeGreaterThan(0);
    }
  });

  it('returns a direct watch link, case and spacing insensitive', () => {
    const [name, v] = entries[0];
    const got = exerciseFormVideo(`  ${name.toUpperCase()} `);
    expect(got?.url).toBe(`https://www.youtube.com/watch?v=${v.id}`);
  });

  it('returns null for unknown exercises so the UI falls back to search', () => {
    expect(exerciseFormVideo('zzz not an exercise')).toBeNull();
    expect(exerciseVideoSearchUrl('Dip')).toContain('youtube.com/results');
  });
});
