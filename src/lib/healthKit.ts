/**
 * Thin native adapter for Apple Health. Everything is guarded: on Android, in Expo Go,
 * or when Health is unavailable, these return false / null instead of throwing.
 */
import { Platform } from 'react-native';
import type * as HealthKit from '@kingstinct/react-native-healthkit';
import * as Crypto from 'expo-crypto';
import { getBodyWeightHistory, getLatestBodyWeight, getSetting, logBodyWeight, setSetting } from '@/lib/dao';
import {
  HEALTH_SYNC_SETTING, syncBodyWeightFromHealth, withTimeout,
  type HealthSyncResult, type HealthWeightSource, type WeightUnit, type WeightSample,
} from '@/lib/healthWeight';
import {
  BODY_FAT_GOAL_SETTING, BODY_FAT_START_SETTING, DEFAULT_BODY_FAT_GOAL, computeBodyFatGoal, parseGoalPct,
  type BodyFatGoal, type FatSample, type MassSample,
} from '@/lib/bodyComposition';

type Ctx = Parameters<typeof getSetting>[0];

const BODY_MASS = 'HKQuantityTypeIdentifierBodyMass' as const;
const BODY_FAT = 'HKQuantityTypeIdentifierBodyFatPercentage' as const;
/**
 * Every type Fitlog reads, requested together so iOS shows one sheet. Authorization must
 * come before any query: querying a type that was never requested crashes the app.
 */
const READ_TYPES = [BODY_MASS, BODY_FAT];
/** The permission sheet can stay open a long time; a read behind it waits this long. */
const PROMPT_TIMEOUT_MS = 5 * 60 * 1000;
const HISTORY_DAYS = 90;

function lib(): typeof HealthKit | null {
  if (Platform.OS !== 'ios') return null;
  try {
    // Loaded lazily so a missing native module can never break app start
    return require('@kingstinct/react-native-healthkit') as typeof HealthKit;
  } catch {
    return null;
  }
}

export function isHealthAvailable(): boolean {
  try {
    return !!lib()?.isHealthDataAvailable();
  } catch {
    return false;
  }
}

/**
 * Asks for read access (iOS shows the sheet only the first time per type), then reads the
 * newest body mass sample.
 */
async function readLatestWeight(unit: WeightUnit): Promise<WeightSample | null> {
  const hk = lib();
  if (!hk || !hk.isHealthDataAvailable()) return null;
  try {
    await hk.requestAuthorization({ toRead: READ_TYPES });
    const s = await hk.getMostRecentQuantitySample(BODY_MASS, unit);
    if (!s) return null;
    return { weight: s.quantity, date: new Date(s.startDate).toISOString() };
  } catch {
    return null;
  }
}

export const healthKitSource: HealthWeightSource = { readLatestWeight };

/** Read Health and store a newer weight. Returns the weight to use for this user. */
export async function syncHealthWeight(ctx: Ctx, unit: WeightUnit, timeoutMs?: number): Promise<HealthSyncResult> {
  return syncBodyWeightFromHealth({
    source: healthKitSource,
    unit,
    timeoutMs,
    getLatest: () => getLatestBodyWeight(ctx),
    save: (s) => logBodyWeight(ctx, { id: Crypto.randomUUID(), date: s.date, weight: s.weight }),
  });
}

export async function isHealthSyncOn(ctx: Ctx): Promise<boolean> {
  return (await getSetting(ctx, HEALTH_SYNC_SETTING)) === '1';
}

/** Body fat and weight readings from the last 90 days, or null when Health cannot be read. */
async function readBodyComposition(unit: WeightUnit): Promise<{ fats: FatSample[]; weights: MassSample[] } | null> {
  const hk = lib();
  if (!hk || !hk.isHealthDataAvailable()) return null;
  try {
    await hk.requestAuthorization({ toRead: READ_TYPES });
    const filter = { date: { startDate: new Date(Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000) } };
    const [fat, mass] = await Promise.all([
      hk.queryQuantitySamples(BODY_FAT, { limit: 0, unit: '%', filter }),
      hk.queryQuantitySamples(BODY_MASS, { limit: 0, unit, filter }),
    ]);
    return {
      fats: fat.map((s) => ({ date: new Date(s.startDate).toISOString(), percent: s.quantity })),
      weights: mass.map((s) => ({ date: new Date(s.startDate).toISOString(), weight: s.quantity })),
    };
  } catch {
    return null;
  }
}

export type BodyFatGoalState =
  /** unavailable: no Apple Health here. off: sync is switched off. empty: no body fat readings. */
  | { status: 'unavailable' | 'off' | 'empty'; goalPct: number }
  | { status: 'ok'; goalPct: number; goal: BodyFatGoal };

export async function getBodyFatGoalPct(ctx: Ctx): Promise<number> {
  return parseGoalPct((await getSetting(ctx, BODY_FAT_GOAL_SETTING)) ?? '') ?? DEFAULT_BODY_FAT_GOAL;
}

export async function setBodyFatGoalPct(ctx: Ctx, pct: number): Promise<void> {
  await setSetting(ctx, BODY_FAT_GOAL_SETTING, String(pct));
}

/** Everything the Progress tab needs for the body fat goal card. Never throws. */
export async function loadBodyFatGoal(ctx: Ctx, unit: WeightUnit): Promise<BodyFatGoalState> {
  const goalPct = await getBodyFatGoalPct(ctx);
  if (!isHealthAvailable()) return { status: 'unavailable', goalPct };
  if (!(await isHealthSyncOn(ctx))) return { status: 'off', goalPct };
  try {
    const data = await withTimeout(readBodyComposition(unit), PROMPT_TIMEOUT_MS);
    if (!data || data.fats.length === 0) return { status: 'empty', goalPct };
    // No weight in Health: fall back to weights logged in Fitlog
    const weights = data.weights.length ? data.weights : await getBodyWeightHistory(ctx, 60);
    const stored = parseFloat((await getSetting(ctx, BODY_FAT_START_SETTING)) ?? '');
    const args = { fats: data.fats, weights, goalPct, now: new Date() };
    let goal = computeBodyFatGoal({ ...args, startPct: Number.isFinite(stored) ? stored : null });
    if (!goal) return { status: 'empty', goalPct };
    if (!Number.isFinite(stored) && !goal.stale) {
      // First real reading becomes the starting point of the progress bar
      await setSetting(ctx, BODY_FAT_START_SETTING, String(goal.bodyFat));
      goal = computeBodyFatGoal({ ...args, startPct: goal.bodyFat }) ?? goal;
    }
    return { status: 'ok', goalPct, goal };
  } catch {
    return { status: 'empty', goalPct };
  }
}
