import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { bootstrapDb } from '@/lib/bootstrap';
import { ensureUser, listExercisesWithMetrics, getMetricHistory, getUserUnit } from '@/lib/dao';
import { useTheme } from '@/theme/ThemeContext';
import { fontSize, fontWeight } from '@/theme/typography';
import { epley1RM } from '@/lib/progression';
import { Card } from '@/components/Card';
import { ExerciseInitial } from '@/components/ExerciseInitial';

export default function Progress() {
  const { c } = useTheme();
  const [dbCtx, setDbCtx] = useState<any>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, any[]>>({});
  const [unit, setUnit] = useState<'lb' | 'kg'>('lb');
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
      setHistory((prev) => ({ ...prev, [exerciseId]: rows }));
    }
    setExpanded(exerciseId);
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch { return iso; }
  }

  const hasCalc = parseFloat(calcWeight) > 0 && parseInt(calcReps) > 0;
  const calc1RM = hasCalc ? epley1RM(parseFloat(calcWeight), parseInt(calcReps)) : 0;

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.bg }]}>
      <Text style={[styles.h1, { color: c.text }]}>Progress</Text>
      <Text style={[styles.hint, { color: c.textMuted }]}>Track your estimated 1RM over time per exercise.</Text>

      {/* 1RM Calculator */}
      <Card>
        <Text style={[styles.calcTitle, { color: c.text }]}>1RM Calculator</Text>
        <View style={styles.calcRow}>
          <TextInput
            placeholder="Weight"
            value={calcWeight}
            onChangeText={setCalcWeight}
            keyboardType="numeric"
            style={[styles.calcInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]}
            placeholderTextColor={c.textMuted}
          />
          <Text style={{ color: c.textSecondary }}>{'\u00D7'}</Text>
          <TextInput
            placeholder="Reps"
            value={calcReps}
            onChangeText={setCalcReps}
            keyboardType="numeric"
            style={[styles.calcInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]}
            placeholderTextColor={c.textMuted}
          />
          <Text style={{ color: c.textSecondary }}>=</Text>
          <Text style={[styles.calcResult, { color: c.gold }]}>
            {hasCalc ? `${Math.round(calc1RM)} ${unit}` : '\u2014'}
          </Text>
        </View>
        {hasCalc && (
          <View style={styles.repTable}>
            {[1, 2, 3, 4, 5, 6, 8, 10, 12, 15].map((r) => (
              <View key={r} style={styles.repRow}>
                <Text style={[styles.repLabel, { color: c.textMuted }]}>{r}RM</Text>
                <Text style={[styles.repValue, { color: c.text }]}>
                  {Math.round(calc1RM / (1 + r / 30))} {unit}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      {exercises.length === 0 ? (
        <Text style={[styles.empty, { color: c.textMuted }]}>
          No data yet. Complete some sets to see your progress!
        </Text>
      ) : (
        exercises.map((ex: any) => {
          const isExpanded = expanded === ex.id;
          const entries = history[ex.id] ?? [];
          return (
            <Pressable key={ex.id} onPress={() => toggleExpand(ex.id)}>
              <Card style={isExpanded ? { borderColor: c.gold } : undefined}>
                <View style={styles.cardHeader}>
                  <View style={styles.exInfo}>
                    <ExerciseInitial name={ex.name} size={36} />
                    <View>
                      <Text style={[styles.exName, { color: c.text }]}>{ex.name}</Text>
                      <Text style={[styles.muscles, { color: c.textMuted }]}>
                        {(ex.muscle_groups || '').replace(/,/g, ' \u00B7 ').replace(/_/g, ' ')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.prBox}>
                    <Text style={[styles.prLabel, { color: c.textMuted }]}>BEST 1RM</Text>
                    <Text style={[styles.prValue, { color: c.gold }]}>
                      {Math.round(ex.best_1rm)} {unit}
                    </Text>
                  </View>
                </View>

                {isExpanded && entries.length > 0 && (
                  <View style={[styles.timeline, { borderTopColor: c.cardBorder }]}>
                    {entries.map((m: any, i: number) => {
                      const prev = entries[i + 1];
                      const delta = prev ? m.est_1rm - prev.est_1rm : 0;
                      const isMax = Math.round(m.est_1rm) === Math.round(ex.best_1rm);
                      return (
                        <View key={i} style={styles.timelineRow}>
                          <Text style={[styles.timelineDate, { color: c.textMuted }]}>
                            {formatDate(m.date)}
                          </Text>
                          <View style={styles.timelineDotCol}>
                            <View
                              style={[
                                styles.dot,
                                { backgroundColor: isMax ? c.gold : c.textMuted },
                                isMax && styles.dotPR,
                              ]}
                            />
                            {i < entries.length - 1 && (
                              <View style={[styles.timelineLine, { backgroundColor: c.cardBorder }]} />
                            )}
                          </View>
                          <View style={styles.timelineContent}>
                            <Text style={[styles.timelineValue, { color: isMax ? c.gold : c.text }]}>
                              {Math.round(m.est_1rm)} {unit}
                            </Text>
                            <Text style={[styles.timelineDetail, { color: c.textSecondary }]}>
                              {m.top_set_weight}{'\u00D7'}{m.top_set_reps}
                              {delta !== 0 && (
                                <Text style={{ color: delta > 0 ? c.green : c.danger }}>
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

                <View style={styles.expandHintRow}>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color={c.textMuted}
                  />
                  {!isExpanded && (
                    <Text style={[styles.expandHintText, { color: c.textMuted }]}>
                      {ex.metric_count} entries
                    </Text>
                  )}
                </View>
              </Card>
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
  h1: { fontSize: fontSize.h1, fontWeight: fontWeight.bold, marginBottom: 4 },
  hint: { fontSize: fontSize.caption, marginBottom: 12 },
  empty: { marginTop: 20, textAlign: 'center', fontSize: fontSize.body },
  // Calculator
  calcTitle: { fontWeight: fontWeight.bold, fontSize: fontSize.body },
  calcRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  calcInput: { borderWidth: 1, borderRadius: 8, padding: 8, width: 65, fontSize: fontSize.caption, textAlign: 'center' },
  calcResult: { fontSize: fontSize.h2, fontWeight: fontWeight.bold },
  repTable: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  repRow: { flexDirection: 'row', gap: 4, minWidth: 80, paddingVertical: 2 },
  repLabel: { fontSize: fontSize.small, width: 30 },
  repValue: { fontSize: fontSize.small, fontWeight: fontWeight.semibold },
  // Cards
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  exInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  exName: { fontSize: fontSize.body, fontWeight: fontWeight.semibold },
  muscles: { fontSize: fontSize.tiny, textTransform: 'capitalize' },
  prBox: { alignItems: 'flex-end' },
  prLabel: { fontSize: fontSize.tiny, textTransform: 'uppercase', letterSpacing: 0.5 },
  prValue: { fontSize: fontSize.h3, fontWeight: fontWeight.bold },
  // Timeline
  timeline: { marginTop: 8, borderTopWidth: 1, paddingTop: 8 },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 32 },
  timelineDate: { width: 50, fontSize: fontSize.tiny, paddingTop: 2 },
  timelineDotCol: { width: 20, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  dotPR: { width: 10, height: 10, borderRadius: 5, marginTop: 3 },
  timelineLine: { width: 2, flex: 1, minHeight: 16 },
  timelineContent: { flex: 1, paddingLeft: 8, paddingBottom: 8 },
  timelineValue: { fontSize: fontSize.caption, fontWeight: fontWeight.semibold },
  timelineDetail: { fontSize: fontSize.small },
  // Expand
  expandHintRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 4 },
  expandHintText: { fontSize: fontSize.tiny },
});
