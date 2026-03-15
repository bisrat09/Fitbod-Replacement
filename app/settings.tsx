import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { bootstrapDb } from '@/lib/bootstrap';
import { ensureUser, getUserUnit, updateUserUnit, exportAllData, importData, logBodyWeight, getBodyWeightHistory, deleteBodyWeight, getLifetimeStats } from '@/lib/dao';
import { useTheme } from '@/theme/ThemeContext';
import { fontSize, fontWeight } from '@/theme/typography';
import { Card } from '@/components/Card';
import { SettingsRow } from '@/components/SettingsRow';

export default function Settings() {
  const { theme, c, toggle: toggleTheme } = useTheme();
  const [dbCtx, setDbCtx] = useState<any>(null);
  const [unit, setUnit] = useState<'lb' | 'kg'>('lb');
  const [status, setStatus] = useState<string | null>(null);
  const [bwInput, setBwInput] = useState('');
  const [bwHistory, setBwHistory] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { db, userId } = await bootstrapDb();
      const ctx = { db, userId };
      await ensureUser(ctx, { id: userId, display_name: 'You', unit: 'lb' });
      setUnit(await getUserUnit(ctx));
      setDbCtx(ctx);
      await refreshData(ctx);
    })();
  }, []);

  async function refreshData(ctx?: any) {
    const x = ctx || dbCtx;
    if (!x) return;
    const [bw, st] = await Promise.all([getBodyWeightHistory(x, 10), getLifetimeStats(x)]);
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
      const backups = files.filter((f) => f.startsWith('fitlog_backup_') && f.endsWith('.json')).sort().reverse();
      if (backups.length === 0) { setStatus('No backup files found.'); setTimeout(() => setStatus(null), 4000); return; }
      const path = `${FileSystem.documentDirectory}${backups[0]}`;
      const json = await FileSystem.readAsStringAsync(path);
      setStatus(`Importing from ${backups[0]}...`);
      await importData(dbCtx, JSON.parse(json));
      setStatus('Imported successfully!');
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
    <ScrollView style={[styles.container, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}>
      <Text style={[styles.h1, { color: c.text }]}>Settings</Text>

      {/* Lifetime Stats */}
      {stats && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.textMuted }]}>LIFETIME STATS</Text>
          <Card>
            <View style={styles.statsGrid}>
              {[
                { value: stats.totalWorkouts, label: 'Workouts' },
                { value: stats.totalSets, label: 'Sets' },
                { value: Math.round(stats.totalVolume).toLocaleString(), label: `${unit} lifted` },
                { value: stats.currentStreak, label: 'Day streak' },
              ].map((s) => (
                <View key={s.label} style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: c.text }]}>{s.value}</Text>
                  <Text style={[styles.statLabel, { color: c.textMuted }]}>{s.label}</Text>
                </View>
              ))}
            </View>
            {stats.mostTrainedExercise && (
              <Text style={[styles.statMeta, { color: c.textSecondary }]}>
                Most trained: {stats.mostTrainedExercise}
              </Text>
            )}
          </Card>
        </View>
      )}

      {/* Body Weight */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: c.textMuted }]}>BODY WEIGHT</Text>
        <Card>
          <View style={styles.bwInputRow}>
            <TextInput
              placeholder={`Weight (${unit})`}
              value={bwInput}
              onChangeText={setBwInput}
              keyboardType="numeric"
              style={[styles.bwInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]}
              placeholderTextColor={c.textMuted}
            />
            <Pressable
              onPress={handleLogWeight}
              disabled={!bwInput.trim()}
              style={[styles.logBtn, { backgroundColor: bwInput.trim() ? c.accent : c.cardBorder }]}
            >
              <Text style={[styles.logBtnText, { color: bwInput.trim() ? c.textOnAccent : c.textMuted }]}>Log</Text>
            </Pressable>
          </View>
          {bwHistory.length > 0 && (
            <View style={styles.bwList}>
              {bwHistory.map((entry: any, idx: number) => (
                <View
                  key={entry.id}
                  style={[
                    styles.bwRow,
                    idx < bwHistory.length - 1 && { borderBottomColor: c.cardBorder, borderBottomWidth: StyleSheet.hairlineWidth },
                  ]}
                >
                  <Text style={[styles.bwDate, { color: c.textSecondary }]}>{formatDate(entry.date)}</Text>
                  <Text style={[styles.bwWeight, { color: c.text }]}>{entry.weight} {unit}</Text>
                  <Pressable onPress={() => handleDeleteBw(entry.id)} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color={c.textMuted} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </Card>
      </View>

      {/* Preferences */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: c.textMuted }]}>PREFERENCES</Text>
        <Card style={{ padding: 0 }}>
          {/* Unit selector */}
          <View style={[styles.settingRow, { borderBottomColor: c.cardBorder }]}>
            <Text style={[styles.settingLabel, { color: c.text }]}>Units</Text>
            <View style={[styles.segmentedControl, { backgroundColor: c.inputBg, borderColor: c.cardBorder }]}>
              <Pressable
                onPress={() => { if (unit !== 'lb') toggleUnit(); }}
                style={[styles.segmentBtn, unit === 'lb' && [styles.segmentBtnSelected, { backgroundColor: c.chipSelectedBg }]]}
              >
                <Text style={[styles.segmentText, { color: unit === 'lb' ? c.chipSelectedText : c.textSecondary }]}>lb</Text>
              </Pressable>
              <Pressable
                onPress={() => { if (unit !== 'kg') toggleUnit(); }}
                style={[styles.segmentBtn, unit === 'kg' && [styles.segmentBtnSelected, { backgroundColor: c.chipSelectedBg }]]}
              >
                <Text style={[styles.segmentText, { color: unit === 'kg' ? c.chipSelectedText : c.textSecondary }]}>kg</Text>
              </Pressable>
            </View>
          </View>

          {/* Dark mode toggle */}
          <View style={[styles.settingRow, { borderBottomColor: c.cardBorder }]}>
            <Text style={[styles.settingLabel, { color: c.text }]}>Dark Mode</Text>
            <Switch
              value={theme === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: c.cardBorder, true: c.accent }}
              thumbColor={c.textOnAccent}
            />
          </View>

          {/* Navigation rows */}
          <View style={[styles.navRow, { borderBottomColor: c.cardBorder }]}>
            <SettingsRow
              label="Programs"
              onPress={() => import('expo-router').then((m) => m.router.push('/programs'))}
            />
          </View>
          <View style={[styles.navRow, { borderBottomColor: c.cardBorder }]}>
            <SettingsRow
              label="Exercise Library"
              onPress={() => import('expo-router').then((m) => m.router.push('/exercises'))}
            />
          </View>
          <View style={styles.navRowLast}>
            <SettingsRow
              label="Equipment"
              onPress={() => import('expo-router').then((m) => m.router.push('/equipment'))}
            />
          </View>
        </Card>
      </View>

      {/* Data */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: c.textMuted }]}>DATA</Text>
        <Card style={{ padding: 0 }}>
          <Pressable onPress={handleExport} style={[styles.dataActionRow, { borderBottomColor: c.cardBorder }]}>
            <Ionicons name="download-outline" size={20} color={c.accent} />
            <Text style={[styles.dataActionLabel, { color: c.text }]}>Export Backup</Text>
            <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
          </Pressable>
          <Pressable onPress={handleImport} style={styles.dataActionRowLast}>
            <Ionicons name="push-outline" size={20} color={c.accent} />
            <Text style={[styles.dataActionLabel, { color: c.text }]}>Import Backup</Text>
            <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
          </Pressable>
        </Card>
        {status && (
          <Text style={[styles.statusText, { color: c.green }]}>{status}</Text>
        )}
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: c.textMuted }]}>ABOUT</Text>
        <Card>
          <Text style={[styles.aboutText, { color: c.textSecondary }]}>Fitlog — Offline-first fitness tracker</Text>
          <Text style={[styles.aboutText, { color: c.textMuted }]}>All data stored locally on your device.</Text>
          <Text style={[styles.aboutText, { color: c.textMuted }]}>Expo SDK 54 · React Native 0.81 · Schema v7</Text>
        </Card>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingTop: 8 },
  h1: { fontSize: fontSize.h1, fontWeight: fontWeight.bold, marginBottom: 20 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingLeft: 16,
    marginBottom: 8,
  },
  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  statItem: { alignItems: 'center', width: '50%', paddingVertical: 8 },
  statNumber: { fontSize: fontSize.h1, fontWeight: fontWeight.bold },
  statLabel: { fontSize: fontSize.small, marginTop: 2 },
  statMeta: { fontSize: fontSize.small, fontStyle: 'italic', marginTop: 8, textAlign: 'center' },
  // Body weight
  bwInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  bwInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: fontSize.body,
  },
  logBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  logBtnText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  bwList: { marginTop: 8 },
  bwRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  bwDate: { fontSize: fontSize.body, width: 64 },
  bwWeight: { fontSize: fontSize.body, fontWeight: fontWeight.semibold, flex: 1 },
  // Preferences section
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
  },
  settingLabel: { fontSize: fontSize.body },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  segmentBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  segmentBtnSelected: {
    borderRadius: 6,
    margin: 1,
  },
  segmentText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  navRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navRowLast: {},
  // Data
  dataActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dataActionRowLast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dataActionLabel: {
    fontSize: fontSize.body,
    flex: 1,
  },
  statusText: { fontSize: fontSize.caption, fontStyle: 'italic', marginTop: 8, paddingLeft: 16 },
  aboutText: { fontSize: fontSize.caption, lineHeight: 20 },
});
