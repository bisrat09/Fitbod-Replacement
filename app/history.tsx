import { describeSet } from '@/lib/cardio';
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { bootstrapDb } from '@/lib/bootstrap';
import { ensureUser, listWorkoutSummariesEnhanced, listWorkoutDetail, getUserUnit, deleteWorkout, repeatWorkout, getSetPRStatus, setSetting, getSetting, listWorkoutDays } from '@/lib/dao';
import { computeLogStats, DEFAULT_WEEKLY_GOAL, weekDaysSunFirst, workoutTitle, summarizeNames, formatVolume, formatDuration } from '@/lib/logStats';
import { useFocusEffect } from 'expo-router';
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
  const [calOpen, setCalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [allDays, setAllDays] = useState<string[]>([]);
  const [goal, setGoal] = useState(DEFAULT_WEEKLY_GOAL);
  const [limit, setLimit] = useState(30);

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

  async function reload(ctx = dbCtx, lim = limit) {
    if (!ctx) return;
    const [rows, days, g] = await Promise.all([
      listWorkoutSummariesEnhanced(ctx, lim),
      listWorkoutDays(ctx),
      getSetting(ctx, 'weekly_goal_days'),
    ]);
    setWorkouts(rows);
    setAllDays(days);
    const gi = parseInt(g ?? '', 10);
    if (gi >= 1 && gi <= 7) setGoal(gi);
  }

  useFocusEffect(useCallback(() => { reload(); }, [dbCtx, limit]));

  async function cycleGoal() {
    const next = goal >= 7 ? 1 : goal + 1;
    setGoal(next);
    if (dbCtx) await setSetting(dbCtx, 'weekly_goal_days', String(next));
  }

  async function handleRepeatWorkout(sourceWorkoutId: string) {
    if (!dbCtx) return;
    const newId = Crypto.randomUUID();
    await repeatWorkout(dbCtx, sourceWorkoutId, newId, new Date().toISOString());
    await setSetting(dbCtx, 'active_workout_id', newId);
    await setSetting(dbCtx, 'workout_start_time', String(Date.now()));
    setRepeatStatus('Workout created! Go to Workout tab.');
    setTimeout(() => setRepeatStatus(null), 3000);
    await reload();
  }

  async function handleDeleteWorkout(workoutId: string) {
    if (!dbCtx) return;
    await deleteWorkout(dbCtx, workoutId);
    await reload();
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

  const todayKey = new Date().toISOString().slice(0, 10);
  const stats = computeLogStats(allDays, goal, todayKey);
  const daySet = new Set(allDays);
  const shown = selectedDay ? workouts.filter((w: any) => (w.date || '').slice(0, 10) === selectedDay) : workouts;

  function pickDay(day: string) {
    if (!daySet.has(day)) return;
    if (selectedDay === day) { setSelectedDay(null); return; }
    // Make sure that day's workouts are loaded (list is newest first)
    const lastIdx = allDays.lastIndexOf(day);
    if (lastIdx >= limit) setLimit(lastIdx + 1);
    setSelectedDay(day);
  }

  function renderDay(day: string, key: string, dim = false) {
    const d = Number(day.slice(8, 10));
    const has = daySet.has(day);
    const isToday = day === todayKey;
    const isSel = day === selectedDay;
    return (
      <Pressable key={key} onPress={() => pickDay(day)} style={styles.calCell} disabled={!has}>
        <View style={[
          styles.dayCircle,
          has && { backgroundColor: c.accentLight },
          isSel && { backgroundColor: c.accent },
          isToday && !isSel && { borderWidth: 1.5, borderColor: c.accent },
        ]}>
          <Text style={[styles.calDay, { color: isSel ? c.textOnAccent : has ? c.accent : dim ? c.textMuted : c.text }, has && { fontWeight: fontWeight.bold }]}>{d}</Text>
        </View>
      </Pressable>
    );
  }

  // ── Calendar: week strip, expands to month ──
  function renderCalendar() {
    const [y, m] = calMonth.split('-').map(Number);
    const firstDay = new Date(y, m - 1, 1).getDay();
    const daysInMonth = new Date(y, m, 0).getDate();
    const monthName = new Date(y, m - 1).toLocaleDateString(undefined, { month: calOpen ? 'long' : 'short', year: calOpen ? 'numeric' : undefined });
    const cells: React.ReactNode[] = [];
    if (calOpen) {
      for (let i = 0; i < firstDay; i++) cells.push(<View key={`e${i}`} style={styles.calCell} />);
      for (let d = 1; d <= daysInMonth; d++) cells.push(renderDay(`${calMonth}-${String(d).padStart(2, '0')}`, `d${d}`));
    } else {
      weekDaysSunFirst(todayKey).forEach((day, i) => cells.push(renderDay(day, `w${i}`)));
    }
    return (
      <View style={[styles.calContainer, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
        <View style={styles.calHeader}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Calendar</Text>
          <View style={styles.calHeaderRight}>
            {calOpen && (
              <Pressable onPress={() => changeMonth(-1)} hitSlop={8}>
                <Ionicons name="chevron-back" size={18} color={c.textSecondary} />
              </Pressable>
            )}
            <Pressable onPress={() => { setCalOpen((o) => !o); if (calOpen) setCalMonth(todayKey.slice(0, 7)); }} hitSlop={8} style={styles.calToggle}>
              <Text style={[styles.calMonth, { color: c.accent }]}>{monthName}</Text>
              <Ionicons name={calOpen ? 'chevron-up' : 'chevron-down'} size={16} color={c.accent} />
            </Pressable>
            {calOpen && (
              <Pressable onPress={() => changeMonth(1)} hitSlop={8}>
                <Ionicons name="chevron-forward" size={18} color={c.textSecondary} />
              </Pressable>
            )}
          </View>
        </View>
        <View style={styles.calWeekRow}>
          {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map((d, i) => (
            <Text key={i} style={[styles.calWeekDay, { color: c.textMuted }]}>{d}</Text>
          ))}
        </View>
        <View style={styles.calGrid}>{cells}</View>
      </View>
    );
  }

  function renderStats() {
    const goalHit = stats.daysThisWeek >= goal;
    return (
      <View style={[styles.statsCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
        <View style={styles.statCell}>
          <Text style={[styles.statLabel, { color: c.textMuted }]}>WORKOUTS</Text>
          <Text style={[styles.statValue, { color: c.text }]}>{stats.total.toLocaleString('en-US')}</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: c.cardBorder }]} />
        <Pressable style={styles.statCell} onPress={cycleGoal} hitSlop={4}>
          <Text style={[styles.statLabel, { color: c.textMuted }]}>THIS WEEK</Text>
          <Text style={[styles.statValue, { color: goalHit ? c.green : c.text }]}>
            {stats.daysThisWeek}/{goal}
            <Text style={[styles.statUnit, { color: c.textSecondary }]}> days</Text>
          </Text>
          <Text style={[styles.statHint, { color: c.textMuted }]}>tap to set goal</Text>
        </Pressable>
        <View style={[styles.statDivider, { backgroundColor: c.cardBorder }]} />
        <View style={styles.statCell}>
          <Text style={[styles.statLabel, { color: c.textMuted }]}>STREAK</Text>
          <Text style={[styles.statValue, { color: stats.streakWeeks > 0 ? c.accent : c.text }]}>
            {stats.streakWeeks}
            <Text style={[styles.statUnit, { color: c.textSecondary }]}> {stats.streakWeeks === 1 ? 'week' : 'weeks'}</Text>
          </Text>
        </View>
      </View>
    );
  }

  function dayHeading(iso: string) {
    const rel = formatDate(iso);
    if (rel === 'Today' || rel === 'Yesterday') return rel.toUpperCase();
    try {
      return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric' }).toUpperCase();
    } catch { return iso; }
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.bg }]}>
      <Text style={[styles.h1, { color: c.text }]}>Log</Text>

      {repeatStatus && (
        <View style={[styles.repeatBanner, { backgroundColor: c.accentLight }]}>
          <Text style={[styles.repeatBannerText, { color: c.accent }]}>{repeatStatus}</Text>
        </View>
      )}

      {renderStats()}
      {renderCalendar()}

      <View style={styles.pastHeader}>
        <Text style={[styles.sectionTitle, { color: c.text }]}>{selectedDay ? dayHeading(selectedDay) : 'Past Workouts'}</Text>
        {selectedDay && (
          <Pressable onPress={() => setSelectedDay(null)} hitSlop={8}>
            <Text style={[styles.calMonth, { color: c.accent }]}>Show all</Text>
          </Pressable>
        )}
      </View>

      {shown.length === 0 ? (
        <Text style={[styles.empty, { color: c.textMuted }]}>{selectedDay ? 'Loading...' : 'No workouts yet. Start one from the Workout tab!'}</Text>
      ) : (
        shown.map((w: any, idx: number) => {
          const names = (w.exercise_names || '').split(',').filter(Boolean);
          const isExpanded = expanded === w.id;
          const sets = detail[w.id] ?? [];
          const isLast = idx === shown.length - 1;
          return (
            <View key={w.id} style={styles.timelineItem}>
              <View style={styles.timelineRail}>
                <View style={[styles.timelineDot, { backgroundColor: idx === 0 ? c.accent : c.textMuted }]} />
                {!isLast && <View style={[styles.timelineLine, { backgroundColor: c.cardBorder }]} />}
              </View>
              <View style={styles.timelineBody}>
                <View style={styles.dateRow}>
                  <Text style={[styles.dateHeading, { color: c.textSecondary }]}>{dayHeading(w.date)}</Text>
                  <Text style={[styles.dateHeading, { color: c.textMuted }]}>{formatDuration(w.duration_seconds)}</Text>
                </View>
            <Pressable onPress={() => toggleExpand(w.id)}>
              <Card style={isExpanded ? { borderColor: c.accent } : undefined}>
                {/* Title + chevron */}
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: c.text }]} numberOfLines={2}>{workoutTitle(w.set_muscle_groups)}</Text>
                  <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={c.textMuted} />
                </View>

                {/* Stats row */}
                <View style={[styles.cardStats, { borderColor: c.cardBorder }]}>
                  <View style={styles.cardStat}>
                    <Text style={[styles.cardStatLabel, { color: c.textMuted }]}>EXERCISES</Text>
                    <Text style={[styles.cardStatValue, { color: c.text }]}>{w.exercise_count || names.length}</Text>
                  </View>
                  <View style={[styles.statDivider, { backgroundColor: c.cardBorder }]} />
                  <View style={styles.cardStat}>
                    <Text style={[styles.cardStatLabel, { color: c.textMuted }]}>VOLUME</Text>
                    <Text style={[styles.cardStatValue, { color: c.text }]}>{w.total_volume > 0 ? `${formatVolume(w.total_volume)} ${unit}` : '-'}</Text>
                  </View>
                  <View style={[styles.statDivider, { backgroundColor: c.cardBorder }]} />
                  <View style={styles.cardStat}>
                    <Text style={[styles.cardStatLabel, { color: c.textMuted }]}>SETS</Text>
                    <Text style={[styles.cardStatValue, { color: c.text }]}>{w.working_sets || 0}</Text>
                  </View>
                </View>

                {/* Exercise summary */}
                {!isExpanded && (
                  <Text style={[styles.exercises, { color: c.textSecondary }]} numberOfLines={2}>
                    {summarizeNames(names)}
                  </Text>
                )}

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
                                {s.duration_sec || s.level != null || s.calories != null
                                  ? describeSet(s, unit)
                                  : `${s.weight ?? '-'} ${unit} \u00D7 ${s.reps ?? '-'}${s.rir != null ? `  @${s.rir}` : ''}`}
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

              </Card>
            </Pressable>
              </View>
            </View>
          );
        })
      )}
      {!selectedDay && workouts.length >= limit && (
        <Pressable onPress={() => setLimit((l) => l + 30)} style={[styles.moreBtn, { borderColor: c.cardBorder }]}>
          <Text style={[styles.calMonth, { color: c.accent }]}>Show more</Text>
        </Pressable>
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
    alignItems: 'center',
    gap: 8,
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
  // Stats header
  statsCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 12,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: fontSize.tiny,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.8,
  },
  statValue: {
    fontSize: 26,
    fontWeight: fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  statUnit: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
  statHint: {
    fontSize: 10,
  },
  statDivider: {
    width: 1,
    alignSelf: 'stretch',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: fontWeight.bold,
  },
  pastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  // Timeline
  timelineItem: {
    flexDirection: 'row',
  },
  timelineRail: {
    width: 18,
    alignItems: 'center',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  timelineBody: {
    flex: 1,
    paddingLeft: 8,
    paddingBottom: 16,
    gap: 8,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateHeading: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.5,
  },
  cardTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: fontWeight.bold,
  },
  cardStats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 10,
    marginVertical: 4,
  },
  cardStat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  cardStatLabel: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.8,
  },
  cardStatValue: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    fontVariant: ['tabular-nums'],
  },
  moreBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginLeft: 26,
  },
  // Calendar
  calHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  calToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    paddingVertical: 3,
    minHeight: 40,
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
