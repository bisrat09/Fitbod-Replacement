import { syncBodyWeightFromHealth, isNewerSample, isValidSample, roundWeight, type WeightSample } from '@/lib/healthWeight';

const stored: WeightSample = { weight: 180, date: '2026-11-09T07:00:00.000Z' };

function setup(health: WeightSample | null | Promise<WeightSample | null>, latest: WeightSample | null = stored) {
  const saved: WeightSample[] = [];
  const units: string[] = [];
  return {
    saved,
    units,
    deps: {
      unit: 'lb' as const,
      source: { readLatestWeight: (u: string) => { units.push(u); return Promise.resolve(health); } },
      getLatest: async () => latest,
      save: async (s: WeightSample) => { saved.push(s); },
    },
  };
}

describe('pure helpers', () => {
  it('rounds to one decimal', () => {
    expect(roundWeight(182.36)).toBe(182.4);
    expect(roundWeight(82)).toBe(82);
  });
  it('rejects bad samples', () => {
    expect(isValidSample(null)).toBe(false);
    expect(isValidSample({ weight: 0, date: stored.date })).toBe(false);
    expect(isValidSample({ weight: NaN, date: stored.date })).toBe(false);
    expect(isValidSample({ weight: 180, date: 'nope' })).toBe(false);
    expect(isValidSample(stored)).toBe(true);
  });
  it('only a later measurement is newer', () => {
    expect(isNewerSample({ weight: 1, date: '2026-11-10T07:00:00.000Z' }, stored)).toBe(true);
    expect(isNewerSample({ weight: 1, date: stored.date }, stored)).toBe(false);
    expect(isNewerSample({ weight: 1, date: '2026-11-01T07:00:00.000Z' }, stored)).toBe(false);
    expect(isNewerSample({ weight: 1, date: stored.date }, null)).toBe(true);
  });
});

describe('syncBodyWeightFromHealth', () => {
  it('imports a newer Health weight in the user unit', async () => {
    const t = setup({ weight: 182.36, date: '2026-11-11T06:30:00.000Z' });
    const r = await syncBodyWeightFromHealth(t.deps);
    expect(r).toEqual({ weight: 182.4, imported: true, sample: { weight: 182.4, date: '2026-11-11T06:30:00.000Z' } });
    expect(t.saved).toEqual([{ weight: 182.4, date: '2026-11-11T06:30:00.000Z' }]);
    expect(t.units).toEqual(['lb']);
  });
  it('imports when nothing is stored yet', async () => {
    const t = setup({ weight: 82.1, date: '2026-11-11T06:30:00.000Z' }, null);
    const r = await syncBodyWeightFromHealth(t.deps);
    expect(r.weight).toBe(82.1);
    expect(t.saved).toHaveLength(1);
  });
  it('does not duplicate a sample that was already imported', async () => {
    const t = setup({ weight: 180, date: stored.date });
    const r = await syncBodyWeightFromHealth(t.deps);
    expect(r.imported).toBe(false);
    expect(r.weight).toBe(180);
    expect(t.saved).toEqual([]);
  });
  it('keeps a manual entry that is newer than Health', async () => {
    const t = setup({ weight: 175, date: '2026-11-01T07:00:00.000Z' });
    const r = await syncBodyWeightFromHealth(t.deps);
    expect(r.weight).toBe(180);
    expect(t.saved).toEqual([]);
  });
  it('falls back to the stored weight when Health has nothing', async () => {
    const t = setup(null);
    expect(await syncBodyWeightFromHealth(t.deps)).toEqual({ weight: 180, imported: false, sample: null });
  });
  it('returns null weight with no Health data and nothing stored', async () => {
    const t = setup(null, null);
    expect((await syncBodyWeightFromHealth(t.deps)).weight).toBeNull();
  });
  it('falls back when the native read throws', async () => {
    const t = setup(Promise.reject(new Error('denied')));
    expect((await syncBodyWeightFromHealth(t.deps)).weight).toBe(180);
  });
  it('falls back when the native read hangs', async () => {
    const t = setup(new Promise<WeightSample | null>(() => {}));
    const r = await syncBodyWeightFromHealth({ ...t.deps, timeoutMs: 20 });
    expect(r).toEqual({ weight: 180, imported: false, sample: null });
  });
});
