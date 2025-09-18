import * as SQLite from 'expo-sqlite';
export type DB = SQLite.SQLiteDatabase;
export async function openDb(){const db=await SQLite.openDatabaseAsync('fitlog.db');await db.execAsync('PRAGMA foreign_keys = ON;');return db;}
export async function migrate(db:DB, schemaSql:string){await db.execAsync(schemaSql);}
