/**
 * Body weight sync from Apple Health (pure logic, no native imports).
 *
 * Smart scales (Renpho, Withings...) write weight to Apple Health; Fitlog reads the most
 * recent sample and stores it in body_weight so the calorie estimate uses a real number.
 * The native side lives in healthKit.ts and is passed in as `source`.
 */

export const HEALTH_SYNC_SETTING = 'health_weight_sync';

export type WeightUnit = 'lb' | 'kg';

/** Weight in the user's unit, with the time it was measured (ISO string). */
export type WeightSample = { weight: number; date: string };

export type HealthWeightSource = {
  readLatestWeight: (unit: WeightUnit) => Promise<WeightSample | null>;
};

export type HealthSyncResult = {
  /** Most recent weight to use (Health if newer, else the stored one). */
  weight: number | null;
  /** True when a new Health sample was saved to body_weight. */
  imported: boolean;
  /** The Health sample that was read, if any. */
  sample: WeightSample | null;
};

/** Scales report 2 decimals in lb; one is plenty for a calorie estimate. */
export function roundWeight(w: number): number {
  return Math.round(w * 10) / 10;
}

export function isValidSample(s: WeightSample | null | undefined): s is WeightSample {
  if (!s) return false;
  return Number.isFinite(s.weight) && s.weight > 0 && !Number.isNaN(Date.parse(s.date));
}

/** Import only samples measured after the newest stored entry (so a re-sync never duplicates). */
export function isNewerSample(sample: WeightSample, latest: { date: string } | null | undefined): boolean {
  if (!latest) return true;
  const stored = Date.parse(latest.date);
  if (Number.isNaN(stored)) return true;
  return Date.parse(sample.date) > stored;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, () => { clearTimeout(t); resolve(null); });
  });
}

/**
 * Read the latest Health weight and save it when it is newer than what is stored.
 * Never throws: a missing permission, an empty Health store or a slow native call
 * all fall back to the stored weight.
 */
export async function syncBodyWeightFromHealth(deps: {
  source: HealthWeightSource;
  unit: WeightUnit;
  getLatest: () => Promise<WeightSample | null | undefined>;
  save: (sample: WeightSample) => Promise<void>;
  timeoutMs?: number;
}): Promise<HealthSyncResult> {
  const latest = (await deps.getLatest()) ?? null;
  const raw = await withTimeout(deps.source.readLatestWeight(deps.unit), deps.timeoutMs ?? 4000);
  if (!isValidSample(raw)) return { weight: latest?.weight ?? null, imported: false, sample: null };

  const sample: WeightSample = { weight: roundWeight(raw.weight), date: new Date(raw.date).toISOString() };
  if (!isNewerSample(sample, latest)) return { weight: latest?.weight ?? sample.weight, imported: false, sample };

  await deps.save(sample);
  return { weight: sample.weight, imported: true, sample };
}
