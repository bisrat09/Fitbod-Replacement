import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { bootstrapDb } from '@/lib/bootstrap';
import { ensureUser, listExercisesWithMetrics, getMetricHistory, getUserUnit } from '@/lib/dao';
import { useTheme } from '@/theme/ThemeContext';
import { epley1RM } from '@/lib/progression';

export default function Progress() {
  const { c } = useTheme();
  const [dbCtx, setDbCtx] = useState<any>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, any[]>>({});
  const [unit, setUnit] = useState<'lb' | 'kg'>('lb');
  // 1RM Calculator
  const [calcWeight, setCalcWeight] = useState('');
  const [calcReps, setCalcReps] = useState('');

  useEffect(() => {
    (async () => {
      const { db, userId } = await bootstrapDb();
      const ctx = { db, userId };
      await ensureUser(ctx, { id: userId, display_name: 'You', unit: 'lb' });
      setUnit(await getUserUnit(ctx));
      setDbCtx(ctx);
      const exs = await listExercisesWithMetrics(ctx);
      setExercises(exs);
    })();
  }, []);

  async function toggleExpand(exerciseId: string) {
    if (expanded === exerciseId) { setExpanded(null); return; }
    if (!history[exerciseId] && dbCtx) {
      const rows = await getMetricHistory(dbCtx, exerciseId, 20);
      setHistory(prev => ({ ...prev, [exerciseId]: rows }));
    }
    setExpanded(exerciseId);
  }

  function formatDate(iso: string) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch { return iso; }
  }

  return (
    <ScrollView style={[styles.container, {backgroundColor: c.bg}]}>
      <Text style={[styles.h1, {color: c.text}]}>Progress</Text>
      <Text style={[styles.hint, {color: c.textMuted}]}>Track your estimated 1RM over time per exercise.</Text>

      {/* 1RM Calculator */}
      <View style={[styles.calcCard, {backgroundColor: c.card, borderColor: c.cardBorder}]}>
        <Text style={[styles.calcTitle, {color: c.text}]}>1RM Calculator</Text>
        <View style={styles.calcRow}>
          <TextInput placeholder='Weight' value={calcWeight} onChangeText={setCalcWeight} keyboardType='numeric' style={[styles.calcInput, {borderColor: c.inputBorder, color: c.text}]} />
          <Text style={{color: c.textSecondary}}>×</Text>
          <TextInput placeholder='Reps' value={calcReps} onChangeText={setCalcReps} keyboardType='numeric' style={[styles.calcInput, {borderColor: c.inputBorder, color: c.text}]} />
          <Text style={{color: c.textSecondary}}>=</Text>
          <Text style={[styles.calcResult, {color: c.gold}]}>
            {(parseFloat(calcWeight) > 0 && parseInt(calcReps) > 0) ? `${Math.round(epley1RM(parseFloat(calcWeight), parseInt(calcReps)))} ${unit}` : '—'}
          </Text>
        </View>
        {parseFloat(calcWeight) > 0 && parseInt(calcReps) > 0 && (
          <View style={styles.repTable}>
            {[1,2,3,4,5,6,8,10,12,15].map(r => {
              const est1rm = epley1RM(parseFloat(calcWeight), parseInt(calcReps));
              const repMax = est1rm / (1 + r / 30);
              return (
                <View key={r} style={styles.repRow}>
                  <Text style={[styles.repLabel, {color: c.textSecondary}]}>{r}RM</Text>
                  <Text style={[styles.repValue, {color: c.text}]}>{Math.round(repMax)} {unit}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {exercises.length === 0 ? (
        <Text style={styles.empty}>No data yet. Complete some sets to see your progress!</Text>
      ) : (
        exercises.map((ex: any) => {
          const isExpanded = expanded === ex.id;
          const entries = history[ex.id] ?? [];
          return (
            <Pressable key={ex.id} onPress={() => toggleExpand(ex.id)}>
              <View style={[styles.card, isExpanded && styles.cardExpanded]}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.exName}>{ex.name}</Text>
                    <Text style={styles.muscles}>{(ex.muscle_groups || '').replace(/,/g, ' · ')}</Text>
                  </View>
                  <View style={styles.prBox}>
                    <Text style={styles.prLabel}>Best 1RM</Text>
                    <Text style={styles.prValue}>{Math.round(ex.best_1rm)} {unit}</Text>
                  </View>
                </View>

                {isExpanded && entries.length > 0 && (
                  <View style={styles.timeline}>
                    {entries.map((m: any, i: number) => {
                      const prev = entries[i + 1];
                      const delta = prev ? m.est_1rm - prev.est_1rm : 0;
                      const isMax = Math.round(m.est_1rm) === Math.round(ex.best_1rm);
                      return (
                        <View key={i} style={styles.timelineRow}>
                          <Text style={styles.timelineDate}>{formatDate(m.date)}</Text>
                          <View style={styles.timelineDot}>
                            <View style={[styles.dot, isMax && styles.dotPR]} />
                            {i < entries.length - 1 && <View style={styles.timelineLine} />}
                          </View>
                          <View style={styles.timelineContent}>
                            <Text style={[styles.timelineValue, isMax && styles.timelineValuePR]}>
                              {Math.round(m.est_1rm)} {unit}
                            </Text>
                            <Text style={styles.timelineDetail}>
                              {m.top_set_weight}×{m.top_set_reps}
                              {delta !== 0 && (
                                <Text style={{ color: delta > 0 ? '#059669' : '#ef4444' }}>
                                  {' '}{delta > 0 ? '+' : ''}{Math.round(delta)}
                                </Text>
                              )}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

                <Text style={styles.expandHint}>
                  {isExpanded ? '▲' : `▼ ${ex.metric_count} entries`}
                </Text>
              </View>
            </Pressable>
          );
        })
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  h1: { fontSize: 24, fontWeight: '600', marginBottom: 4 },
  hint: { fontSize: 13, color: '#6b7280', marginBottom: 12 },
  empty: { color: '#666', marginTop: 20 },
  card: { borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 10, padding: 12, marginBottom: 10, backgroundColor: '#fafafa' },
  cardExpanded: { backgroundColor: '#fefce8', borderColor: '#fbbf24' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  exName: { fontSize: 15, fontWeight: '700', color: '#111' },
  muscles: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  prBox: { alignItems: 'flex-end' },
  prLabel: { fontSize: 10, color: '#6b7280', textTransform: 'uppercase' },
  prValue: { fontSize: 18, fontWeight: '800', color: '#f59e0b' },
  timeline: { marginTop: 12, gap: 0 },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 32 },
  timelineDate: { width: 50, fontSize: 11, color: '#6b7280', paddingTop: 2 },
  timelineDot: { width: 20, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#d1d5db', marginTop: 4 },
  dotPR: { backgroundColor: '#f59e0b', width: 10, height: 10, borderRadius: 5, marginTop: 3 },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#e5e7eb', minHeight: 16 },
  timelineContent: { flex: 1, paddingLeft: 8, paddingBottom: 8 },
  timelineValue: { fontSize: 14, fontWeight: '600', color: '#374151' },
  timelineValuePR: { color: '#f59e0b', fontWeight: '800' },
  timelineDetail: { fontSize: 12, color: '#6b7280' },
  expandHint: { fontSize: 11, color: '#9ca3af', marginTop: 6, textAlign: 'center' },
  // Calculator
  calcCard: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 16, gap: 8 },
  calcTitle: { fontWeight: '700', fontSize: 15 },
  calcRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  calcInput: { borderWidth: 1, borderRadius: 6, padding: 6, width: 65, fontSize: 14, textAlign: 'center' },
  calcResult: { fontSize: 20, fontWeight: '800' },
  repTable: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  repRow: { flexDirection: 'row', gap: 4, minWidth: 80, paddingVertical: 2 },
  repLabel: { fontSize: 12, width: 30 },
  repValue: { fontSize: 12, fontWeight: '600' },
});
