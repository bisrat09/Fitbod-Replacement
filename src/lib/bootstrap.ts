import { openDb, migrate } from '@/lib/db';
import schemaSql from '@/lib/fitlog_schema';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
export async function bootstrapDb(){const db=await openDb();await migrate(db,schemaSql);let userId=await SecureStore.getItemAsync('user_id');if(!userId){userId=Crypto.randomUUID();await SecureStore.setItemAsync('user_id',userId);}return { db, userId };}
