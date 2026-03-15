import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { bootstrapDb } from '@/lib/bootstrap';
import { ensureUser, listWorkoutSummariesEnhanced, listWorkoutDetail, getUserUnit, deleteWorkout, repeatWorkout, getSetPRStatus, setSetting, getWorkoutDatesForMonth } from '@/lib/dao';
import * as Crypto from 'expo-crypto';
import { useTheme } from '@/theme/ThemeContext';
import { fontSize, fontWeight } from '@/theme/typography';
import { Card } from '@/components/Card';
import { ExerciseInitial } from '@/components/ExerciseInitial';
import { ActionChip } from '@/components/ActionChip';

export default function History() {
  const { c } = useTheme();
  const [dbCtx, setDbCtx] = useState<any>(null);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, any[]>>({});
  const [unit, setUnit] = useState<'lb' | 'kg'>('lb');
  const [prSets, setPrSets] = useState<Record<string, Set<string>>>({});
  const [repeatStatus, setRepeatStatus] = useState<string | null>(null);
  // Calendar
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [calDays, setCalDays] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const { db, userId } = await bootstrapDb();
      const ctx = { db, userId };
      await ensureUser(ctx, { id: userId, display_name: 'You', unit: 'lb' });
      setDbCtx(ctx);
      const u = await getUserUnit(ctx);
      setUnit(u);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!dbCtx) return;
      const rows = await listWorkoutSummariesEnhanced(dbCtx, 50);
      setWorkouts(rows);
      const days = await getWorkoutDatesForMonth(dbCtx, calMonth);
      setCalDays(new Set(days));
    })();
  }, [dbCtx]);

  useEffect(() => {
    if (!dbCtx) return;
    (async () => {
      const days = await getWorkoutDatesForMonth(dbCtx, calMonth);
      setCalDays(new Set(days));
    })();
  }, [calMonth, dbCtx]);

  async function handleRepeatWorkout(sourceWorkoutId: string) {
    if (!dbCtx) return;
    const newId = Crypto.randomUUID();
    await repeatWorkout(dbCtx, sourceWorkoutId, newId, new Date().toISOString());
    await setSetting(dbCtx, 'active_workout_id', newId);
    await setSetting(dbCtx, 'workout_start_time', String(Date.now()));
    setRepeatStatus('Workout created! Go to Workout tab.');
    setTimeout(() => setRepeatStatus(null), 3000);
    const rows = await listWorkoutSummariesEnhanced(dbCtx, 50);
    setWorkouts(rows);
  }

  async function handleDeleteWorkout(workoutId: string) {
    if (!dbCtx) return;
    await deleteWorkout(dbCtx, workoutId);
    const rows = await listWorkoutSummariesEnhanced(dbCtx, 50);
    setWorkouts(rows);
    setExpanded(null);
  }

  async function toggleExpand(workoutId: string) {
    if (expanded === workoutId) { setExpanded(null); return; }
    if (!detail[workoutId] && dbCtx) {
      const [rows, prs] = await Promise.all([listWorkoutDetail(dbCtx, workoutId), getSetPRStatus(dbCtx, workoutId)]);
      setDetail((prev) => ({ ...prev, [workoutId]: rows }));
      setPrSets((prev) => ({ ...prev, [workoutId]: prs }));
    }
    setExpanded(workoutId);
  }

  function changeMonth(delta: number) {
    const [y, m] = calMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  function formatDate(iso: string) {
    try {
      const d = new Date(iso);
      const today = new Date();
      const yday = new Date();
      yday.setDate(today.getDate() - 1);
      const fmt = (x: Date) => x.toISOString().slice(0, 10);
      if (fmt(d) === fmt(today)) return 'Today';
      if (fmt(d) === fmt(yday)) return 'Yesterday';
      return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    } catch {
      return iso;
    }
  }

  // ── Calendar ──
  function renderCalendar() {
    const [y, m] = calMonth.split('-').map(Number);
    const firstDay = new Date(y, m - 1, 1).getDay();
    const daysInMonth = new Date(y, m, 0).getDate();
    const monthName = new Date(y, m - 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const cells: React.ReactNode[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(<View key={`e${i}`} style={styles.calCell} />);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calMonth}-${String(d).padStart(2, '0')}`;
      const hasWorkout = calDays.has(dateStr);
      const isToday = dateStr === new Date().toISOString().slice(0, 10);
      cells.push(
        <View key={d} style={[styles.calCell, isToday && { backgroundColor: c.accentLight, borderRadius: 6 }]}>
          <Text style={[styles.calDay, { color: isToday ? c.accent : c.text }]}>{d}</Text>
          {hasWorkout && <View style={[styles.calDot, { backgroundColor: c.accent }]} />}
        </View>,
      );
    }
    return (
      <View style={[styles.calContainer, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
        <View style={styles.calHeader}>
          <Pressable onPress={() => changeMonth(-1)} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={c.textSecondary} />
          </Pressable>
          <Text style={[styles.calMonth, { color: c.text }]}>{monthName}</Text>
          <Pressable onPress={() => changeMonth(1)} hitSlop={8}>
            <Ionicons name="chevron-forward" size={20} color={c.textSecondary} />
          </Pressable>
        </View>
        <View style={styles.calWeekRow}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <Text key={i} style={[styles.calWeekDay, { color: c.textMuted }]}>{d}</Text>
          ))}
        </View>
        <View style={styles.calGrid}>{cells}</View>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.bg }]}>
      <Text style={[styles.h1, { color: c.text }]}>Log</Text>

      {repeatStatus && (
        <View style={[styles.repeatBanner, { backgroundColor: c.accentLight }]}>
          <Text style={[styles.repeatBannerText, { color: c.accent }]}>{repeatStatus}</Text>
        </View>
      )}

      {renderCalendar()}

      {workouts.length === 0 ? (
        <Text style={[styles.empty, { color: c.textMuted }]}>No workouts yet. Start one from the Workout tab!</Text>
      ) : (
        workouts.map((w: any) => {
          const names = (w.exercise_names || '').split(',').filter(Boolean);
          const isExpanded = expanded === w.id;
          const sets = detail[w.id] ?? [];
          return (
            <Pressable key={w.id} onPress={() => toggleExpand(w.id)}>
              <Card style={isExpanded ? { borderColor: c.accent } : undefined}>
                {/* Header row */}
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={[styles.date, { color: c.text }]}>{formatDate(w.date)}</Text>
                    {w.duration_seconds > 0 && (
                      <Text style={[styles.duration, { color: c.textMuted }]}>
                        {Math.round(w.duration_seconds / 60)} min
                      </Text>
                    )}
                  </View>
                  <View style={styles.badgesRow}>
                    {w.split && (
                      <Text style={[styles.splitBadge, { backgroundColor: c.accent, color: c.textOnAccent }]}>
                        {w.split.toUpperCase()}
                      </Text>
                    )}
                    <Text style={[styles.setsBadge, { backgroundColor: c.setBadgeBg, color: c.textSecondary }]}>
                      {w.working_sets || 0} sets
                    </Text>
                  </View>
                </View>

                {/* Volume */}
                {w.total_volume > 0 && (
                  <Text style={[styles.volume, { color: c.textSecondary }]}>
                    {Math.round(w.total_volume).toLocaleString()} {unit} volume
                  </Text>
                )}

                {/* Exercise names */}
                <Text style={[styles.exercises, { color: c.textSecondary }]} numberOfLines={isExpanded ? undefined : 2}>
                  {names.length > 0 ? names.join(' \u00B7 ') : 'No exercises'}
                </Text>

                {/* Muscle groups */}
                {(() => {
                  const allMg = (w.all_muscle_groups || '').split(',').map((s: string) => s.trim()).filter(Boolean);
                  const unique = [...new Set(allMg)].slice(0, 6);
                  return unique.length > 0 ? (
                    <Text style={[styles.musclesText, { color: c.textMuted }]}>
                      {unique.join(' \u00B7 ').replace(/_/g, ' ')}
                    </Text>
                  ) : null;
                })()}

                {/* Notes */}
                {w.notes && (
                  <Text style={[styles.notesText, { color: c.textMuted }]}>{w.notes}</Text>
                )}

                {/* Expanded detail */}
                {isExpanded && sets.length > 0 && (
                  <View style={styles.detailSection}>
                    {groupByExercise(sets).map(([name, exSets]: [string, any[]]) => (
                      <View key={name} style={styles.detailGroup}>
                        <View style={styles.detailExHeader}>
                          <ExerciseInitial name={name} size={28} />
                          <Text style={[styles.detailExName, { color: c.text }]}>{name}</Text>
                        </View>
                        {exSets.map((s: any) => {
                          const isPR = prSets[w.id]?.has(s.id);
                          return (
                            <View key={s.id} style={styles.detailSetRow}>
                              {s.is_completed ? (
                                <Ionicons name="checkmark-circle" size={16} color={c.green} />
                              ) : (
                                <View style={[styles.setDot, { backgroundColor: c.textMuted }]} />
                              )}
                              <Text style={[styles.detailSet, { color: isPR ? c.gold : c.textSecondary }]}>
                                {s.is_warmup ? 'W  ' : ''}
                                {s.weight ?? '-'} {unit} {'\u00D7'} {s.reps ?? '-'}
                                {s.rir != null ? `  @${s.rir}` : ''}
                                {s.notes ? ` \u2014 ${s.notes}` : ''}
                              </Text>
                              {isPR && (
                                <View style={[styles.prBadge, { backgroundColor: c.gold }]}>
                                  <Text style={[styles.prBadgeText, { color: c.goldText }]}>PR</Text>
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                )}

                {/* Action buttons */}
                {isExpanded && (
                  <View style={styles.actionRow}>
                    <ActionChip icon="repeat-outline" label="Repeat" onPress={() => handleRepeatWorkout(w.id)} />
                    <Pressable
                      onPress={() => handleDeleteWorkout(w.id)}
                      style={[styles.deleteBtn, { backgroundColor: c.dangerBg }]}
                    >
                      <Ionicons name="trash-outline" size={14} color={c.danger} />
                      <Text style={[styles.deleteBtnText, { color: c.danger }]}>Delete</Text>
                    </Pressable>
                  </View>
                )}

                {/* Expand hint */}
                <View style={styles.expandHintRow}>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color={c.textMuted}
                  />
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

function groupByExercise(sets: any[]): [string, any[]][] {
  const map = new Map<string, any[]>();
  for (const s of sets) {
    const name = s.exercise_name || 'Unknown';
    if (!map.has(name)) map.set(name, []);
    map.get(name)!.push(s);
  }
  return Array.from(map.entries());
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  h1: {
    fontSize: fontSize.h1,
    fontWeight: fontWeight.bold,
    marginBottom: 12,
  },
  empty: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: fontSize.body,
  },
  repeatBanner: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  repeatBannerText: {
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.caption,
    textAlign: 'center',
  },
  // Card content
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  date: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  duration: {
    fontSize: fontSize.small,
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  splitBadge: {
    fontSize: fontSize.tiny,
    fontWeight: fontWeight.bold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  setsBadge: {
    fontSize: fontSize.tiny,
    fontWeight: fontWeight.semibold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  volume: {
    fontSize: fontSize.small,
  },
  exercises: {
    fontSize: fontSize.caption,
  },
  musclesText: {
    fontSize: fontSize.tiny,
    textTransform: 'capitalize',
  },
  notesText: {
    fontSize: fontSize.small,
    fontStyle: 'italic',
  },
  // Detail
  detailSection: {
    marginTop: 8,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 10,
  },
  detailGroup: {
    gap: 4,
  },
  detailExHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  detailExName: {
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.caption,
  },
  detailSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 36,
  },
  setDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  detailSet: {
    fontSize: fontSize.caption,
    flex: 1,
  },
  prBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  prBadgeText: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
  },
  // Actions
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  deleteBtnText: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.medium,
  },
  expandHintRow: {
    alignItems: 'center',
    marginTop: 2,
  },
  // Calendar
  calContainer: {
    marginBottom: 16,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  calHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  calMonth: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
  },
  calWeekRow: {
    flexDirection: 'row',
  },
  calWeekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.tiny,
    fontWeight: fontWeight.semibold,
    marginBottom: 4,
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calCell: {
    width: '14.28%' as any,
    alignItems: 'center',
    paddingVertical: 4,
    minHeight: 32,
  },
  calDay: {
    fontSize: fontSize.caption,
  },
  calDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 1,
  },
});
