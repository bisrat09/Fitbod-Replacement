import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Button, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { bootstrapDb } from '@/lib/bootstrap';
import { ensureUser, getUserUnit, updateUserUnit, exportAllData, importData } from '@/lib/dao';

export default function Settings() {
  const [dbCtx, setDbCtx] = useState<any>(null);
  const [unit, setUnit] = useState<'lb' | 'kg'>('lb');
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { db, userId } = await bootstrapDb();
      const ctx = { db, userId };
      await ensureUser(ctx, { id: userId, display_name: 'You', unit: 'lb' });
      const u = await getUserUnit(ctx);
      setUnit(u);
      setDbCtx(ctx);
    })();
  }, []);

  async function toggleUnit() {
    if (!dbCtx) return;
    const newUnit = unit === 'lb' ? 'kg' : 'lb';
    await updateUserUnit(dbCtx, newUnit);
    setUnit(newUnit);
  }

  async function handleExport() {
    if (!dbCtx) return;
    try {
      setStatus('Exporting...');
      const data = await exportAllData(dbCtx);
      const json = JSON.stringify(data, null, 2);
      const filename = `fitlog_backup_${new Date().toISOString().slice(0, 10)}.json`;
      const path = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(path, json);
      setStatus(`Exported: ${filename}`);
      setTimeout(() => setStatus(null), 5000);
    } catch (err: any) {
      setStatus(`Export failed: ${err.message}`);
      setTimeout(() => setStatus(null), 5000);
    }
  }

  async function handleImport() {
    if (!dbCtx) return;
    try {
      setStatus('Looking for backup...');
      // List files in document directory
      const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory!);
      const backups = files.filter(f => f.startsWith('fitlog_backup_') && f.endsWith('.json')).sort().reverse();
      if (backups.length === 0) {
        setStatus('No backup files found in app directory.');
        setTimeout(() => setStatus(null), 4000);
        return;
      }
      // Import the most recent backup
      const latest = backups[0];
      const path = `${FileSystem.documentDirectory}${latest}`;
      const json = await FileSystem.readAsStringAsync(path);
      const data = JSON.parse(json);
      setStatus(`Importing from ${latest}...`);
      await importData(dbCtx, data);
      setStatus(`Imported from ${latest} successfully!`);
      setTimeout(() => setStatus(null), 5000);
    } catch (err: any) {
      setStatus(`Import failed: ${err.message}`);
      setTimeout(() => setStatus(null), 5000);
    }
  }

  async function listBackups(): Promise<string[]> {
    try {
      const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory!);
      return files.filter(f => f.startsWith('fitlog_backup_') && f.endsWith('.json')).sort().reverse();
    } catch { return []; }
  }

  const [backups, setBackups] = useState<string[]>([]);
  useEffect(() => { listBackups().then(setBackups); }, [status]);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.h1}>Settings</Text>

      {/* Unit Preference */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weight Unit</Text>
        <View style={styles.row}>
          <Pressable onPress={toggleUnit} style={[styles.unitBtn, unit === 'lb' && styles.unitBtnActive]}>
            <Text style={[styles.unitBtnText, unit === 'lb' && styles.unitBtnTextActive]}>LB</Text>
          </Pressable>
          <Pressable onPress={toggleUnit} style={[styles.unitBtn, unit === 'kg' && styles.unitBtnActive]}>
            <Text style={[styles.unitBtnText, unit === 'kg' && styles.unitBtnTextActive]}>KG</Text>
          </Pressable>
        </View>
      </View>

      {/* Export / Import */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>
        <View style={styles.row}>
          <Button title='Export Backup' onPress={handleExport} />
          <Button title='Import Latest Backup' color='#059669' onPress={handleImport} />
        </View>
        {status && <Text style={styles.statusText}>{status}</Text>}
      </View>

      {/* Backups list */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Backup Files</Text>
        {backups.length === 0 ? (
          <Text style={styles.emptyText}>No backups yet. Tap "Export Backup" to create one.</Text>
        ) : (
          backups.map(f => (
            <Text key={f} style={styles.backupItem}>{f}</Text>
          ))
        )}
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.aboutText}>Fitlog — Offline-first fitness tracker</Text>
        <Text style={styles.aboutText}>All data stored locally on your device.</Text>
        <Text style={styles.aboutText}>Expo SDK 54 · React Native 0.81</Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  h1: { fontSize: 24, fontWeight: '600', marginBottom: 16 },
  section: { marginBottom: 20, gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  unitBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#f9fafb' },
  unitBtnActive: { backgroundColor: '#111827', borderColor: '#111827' },
  unitBtnText: { fontWeight: '700', fontSize: 16, color: '#374151' },
  unitBtnTextActive: { color: '#fff' },
  statusText: { fontSize: 13, color: '#059669', fontStyle: 'italic', marginTop: 4 },
  emptyText: { fontSize: 13, color: '#9ca3af' },
  backupItem: { fontSize: 13, color: '#4b5563', paddingVertical: 4 },
  aboutText: { fontSize: 13, color: '#6b7280' },
});
