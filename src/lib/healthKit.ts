/**
 * Thin native adapter for Apple Health. Everything is guarded: on Android, in Expo Go,
 * or when Health is unavailable, these return false / null instead of throwing.
 */
import { Platform } from 'react-native';
import type * as HealthKit from '@kingstinct/react-native-healthkit';
import * as Crypto from 'expo-crypto';
import { getLatestBodyWeight, getSetting, logBodyWeight } from '@/lib/dao';
import {
  HEALTH_SYNC_SETTING, syncBodyWeightFromHealth,
  type HealthSyncResult, type HealthWeightSource, type WeightUnit, type WeightSample,
} from '@/lib/healthWeight';

type Ctx = Parameters<typeof getSetting>[0];

const BODY_MASS = 'HKQuantityTypeIdentifierBodyMass' as const;

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
 * Asks for read access (iOS shows the sheet only the first time), then reads the newest
 * body mass sample. Authorization must come before the query: querying a type that was
 * never requested crashes the app.
 */
async function readLatestWeight(unit: WeightUnit): Promise<WeightSample | null> {
  const hk = lib();
  if (!hk || !hk.isHealthDataAvailable()) return null;
  try {
    await hk.requestAuthorization({ toRead: [BODY_MASS] });
    const s = await hk.getMostRecentQuantitySample(BODY_MASS, unit);
    if (!s) return null;
    return { weight: s.quantity, date: new Date(s.startDate).toISOString() };
  } catch {
    return null;
  }
}

export const healthKitSource: HealthWeightSource = { readLatestWeight };

/** Read Health and store a newer weight. Returns the weight to use for this user. */
export async function syncHealthWeight(ctx: Ctx, unit: WeightUnit): Promise<HealthSyncResult> {
  return syncBodyWeightFromHealth({
    source: healthKitSource,
    unit,
    getLatest: () => getLatestBodyWeight(ctx),
    save: (s) => logBodyWeight(ctx, { id: Crypto.randomUUID(), date: s.date, weight: s.weight }),
  });
}

export async function isHealthSyncOn(ctx: Ctx): Promise<boolean> {
  return (await getSetting(ctx, HEALTH_SYNC_SETTING)) === '1';
}
