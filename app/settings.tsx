import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Button, TextInput } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { bootstrapDb } from '@/lib/bootstrap';
import { ensureUser, getUserUnit, updateUserUnit, exportAllData, importData, logBodyWeight, getBodyWeightHistory, deleteBodyWeight, getLifetimeStats } from '@/lib/dao';

export default function Settings() {
  const [dbCtx, setDbCtx] = useState<any>(null);
  const [unit, setUnit] = useState<'lb' | 'kg'>('lb');
  const [status, setStatus] = useState<string | null>(null);
  // Body weight
  const [bwInput, setBwInput] = useState('');
  const [bwHistory, setBwHistory] = useState<any[]>([]);
  // Lifetime stats
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { db, userId } = await bootstrapDb();
      const ctx = { db, userId };
      await ensureUser(ctx, { id: userId, display_name: 'You', unit: 'lb' });
      const u = await getUserUnit(ctx);
      setUnit(u);
      setDbCtx(ctx);
      await refreshData(ctx);
    })();
  }, []);

  async function refreshData(ctx?: any) {
    const c = ctx || dbCtx;
    if (!c) return;
    const [bw, st] = await Promise.all([
      getBodyWeightHistory(c, 10),
      getLifetimeStats(c),
    ]);
    setBwHistory(bw);
    setStats(st);
  }

  async function toggleUnit() {
    if (!dbCtx) return;
    const newUnit = unit === 'lb' ? 'kg' : 'lb';
    await updateUserUnit(dbCtx, newUnit);
    setUnit(newUnit);
  }

  async function handleLogWeight() {
    if (!dbCtx || !bwInput.trim()) return;
    const w = parseFloat(bwInput);
    if (isNaN(w) || w <= 0) return;
    await logBodyWeight(dbCtx, { id: Crypto.randomUUID(), date: new Date().toISOString(), weight: w });
    setBwInput('');
    await refreshData();
  }

  async function handleDeleteBw(id: string) {
    if (!dbCtx) return;
    await deleteBodyWeight(dbCtx, id);
    await refreshData();
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
      const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory!);
      const backups = files.filter(f => f.startsWith('fitlog_backup_') && f.endsWith('.json')).sort().reverse();
      if (backups.length === 0) {
        setStatus('No backup files found.');
        setTimeout(() => setStatus(null), 4000);
        return;
      }
      const latest = backups[0];
      const path = `${FileSystem.documentDirectory}${latest}`;
      const json = await FileSystem.readAsStringAsync(path);
      const data = JSON.parse(json);
      setStatus(`Importing from ${latest}...`);
      await importData(dbCtx, data);
      setStatus(`Imported successfully!`);
      await refreshData();
      setTimeout(() => setStatus(null), 5000);
    } catch (err: any) {
      setStatus(`Import failed: ${err.message}`);
      setTimeout(() => setStatus(null), 5000);
    }
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch { return iso; }
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.h1}>Settings</Text>

      {/* Lifetime Stats */}
      {stats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lifetime Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.totalWorkouts}</Text>
              <Text style={styles.statLabel}>Workouts</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.totalSets}</Text>
              <Text style={styles.statLabel}>Sets</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{Math.round(stats.totalVolume).toLocaleString()}</Text>
              <Text style={styles.statLabel}>{unit} lifted</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.currentStreak}</Text>
              <Text style={styles.statLabel}>Day streak</Text>
            </View>
          </View>
          {stats.mostTrainedExercise && (
            <Text style={styles.statMeta}>Most trained: {stats.mostTrainedExercise}</Text>
          )}
        </View>
      )}

      {/* Body Weight */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Body Weight</Text>
        <View style={styles.row}>
          <TextInput placeholder={`Weight (${unit})`} value={bwInput} onChangeText={setBwInput} keyboardType='numeric' style={styles.bwInput} />
          <Button title='Log' onPress={handleLogWeight} disabled={!bwInput.trim()} />
        </View>
        {bwHistory.length > 0 && (
          <View style={styles.bwList}>
            {bwHistory.map((entry: any) => (
              <View key={entry.id} style={styles.bwRow}>
                <Text style={styles.bwDate}>{formatDate(entry.date)}</Text>
                <Text style={styles.bwWeight}>{entry.weight} {unit}</Text>
                <Pressable onPress={() => handleDeleteBw(entry.id)}><Text style={styles.bwDelete}>×</Text></Pressable>
              </View>
            ))}
          </View>
        )}
      </View>

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
          <Button title='Import Backup' color='#059669' onPress={handleImport} />
        </View>
        {status && <Text style={styles.statusText}>{status}</Text>}
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.aboutText}>Fitlog — Offline-first fitness tracker</Text>
        <Text style={styles.aboutText}>All data stored locally on your device.</Text>
        <Text style={styles.aboutText}>Expo SDK 54 · React Native 0.81 · Schema v6</Text>
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
  aboutText: { fontSize: 13, color: '#6b7280' },
  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: { backgroundColor: '#f3f4f6', borderRadius: 8, padding: 12, alignItems: 'center', minWidth: 75, flex: 1 },
  statNumber: { fontSize: 20, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  statMeta: { fontSize: 12, color: '#6b7280', fontStyle: 'italic' },
  // Body weight
  bwInput: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 8, fontSize: 14 },
  bwList: { gap: 4, marginTop: 4 },
  bwRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  bwDate: { fontSize: 12, color: '#6b7280', width: 60 },
  bwWeight: { fontSize: 14, fontWeight: '600', color: '#111', flex: 1 },
  bwDelete: { color: '#ef4444', fontWeight: '700', fontSize: 16 },
});
