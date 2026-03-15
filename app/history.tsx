import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { bootstrapDb } from '@/lib/bootstrap';
import { ensureUser, listWorkoutSummariesEnhanced, listWorkoutDetail, getUserUnit, deleteWorkout, repeatWorkout, getSetPRStatus, setSetting, getWorkoutDatesForMonth } from '@/lib/dao';
import * as Crypto from 'expo-crypto';

export default function History() {
  const [dbCtx, setDbCtx] = useState<any>(null);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, any[]>>({});
  const [unit, setUnit] = useState<'lb'|'kg'>('lb');
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
    // Set as active workout so it shows on the Workout tab
    await setSetting(dbCtx, 'active_workout_id', newId);
    await setSetting(dbCtx, 'workout_start_time', String(Date.now()));
    setRepeatStatus('Workout created! Go to Workout tab.');
    setTimeout(() => setRepeatStatus(null), 3000);
    // Refresh list
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
    if (expanded === workoutId) {
      setExpanded(null);
      return;
    }
    if (!detail[workoutId] && dbCtx) {
      const [rows, prs] = await Promise.all([
        listWorkoutDetail(dbCtx, workoutId),
        getSetPRStatus(dbCtx, workoutId),
      ]);
      setDetail(prev => ({ ...prev, [workoutId]: rows }));
      setPrSets(prev => ({ ...prev, [workoutId]: prs }));
    }
    setExpanded(workoutId);
  }

  function changeMonth(delta: number) {
    const [y, m] = calMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  function renderCalendar() {
    const [y, m] = calMonth.split('-').map(Number);
    const firstDay = new Date(y, m - 1, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(y, m, 0).getDate();
    const monthName = new Date(y, m - 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const cells: React.ReactNode[] = [];
    // Empty cells for offset
    for (let i = 0; i < firstDay; i++) cells.push(<View key={`e${i}`} style={styles.calCell} />);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calMonth}-${String(d).padStart(2, '0')}`;
      const hasWorkout = calDays.has(dateStr);
      const isToday = dateStr === new Date().toISOString().slice(0, 10);
      cells.push(
        <View key={d} style={[styles.calCell, isToday && styles.calCellToday]}>
          <Text style={[styles.calDay, isToday && styles.calDayToday]}>{d}</Text>
          {hasWorkout && <View style={styles.calDot} />}
        </View>
      );
    }
    return (
      <View style={styles.calContainer}>
        <View style={styles.calHeader}>
          <Pressable onPress={() => changeMonth(-1)}><Text style={styles.calNav}>◀</Text></Pressable>
          <Text style={styles.calMonth}>{monthName}</Text>
          <Pressable onPress={() => changeMonth(1)}><Text style={styles.calNav}>▶</Text></Pressable>
        </View>
        <View style={styles.calWeekRow}>
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <Text key={i} style={styles.calWeekDay}>{d}</Text>
          ))}
        </View>
        <View style={styles.calGrid}>{cells}</View>
      </View>
    );
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

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.h1}>History</Text>
      {repeatStatus && (
        <View style={styles.repeatBanner}><Text style={styles.repeatBannerText}>{repeatStatus}</Text></View>
      )}
      {renderCalendar()}
      {workouts.length === 0 ? (
        <Text style={styles.empty}>No workouts yet. Start one from the Workout tab!</Text>
      ) : (
        workouts.map((w: any) => {
          const names = (w.exercise_names || '').split(',').filter(Boolean);
          const isExpanded = expanded === w.id;
          const sets = detail[w.id] ?? [];
          return (
            <Pressable key={w.id} onPress={() => toggleExpand(w.id)}>
              <View style={[styles.card, isExpanded && styles.cardExpanded]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.date}>{formatDate(w.date)}</Text>
                  <Text style={styles.badge}>{w.working_sets || 0} sets</Text>
                </View>
                <View style={styles.tagsRow}>
                  {w.split ? <Text style={styles.splitBadge}>{w.split.toUpperCase()}</Text> : null}
                  {w.total_volume > 0 && <Text style={styles.volBadge}>{Math.round(w.total_volume).toLocaleString()} {unit}</Text>}
                </View>
                <Text style={styles.exercises} numberOfLines={isExpanded ? undefined : 2}>
                  {names.length > 0 ? names.join(' · ') : 'No exercises'}
                </Text>
                {(() => {
                  const allMg = (w.all_muscle_groups || '').split(',').flatMap((g: string) => g.split(',').map((s: string) => s.trim())).filter(Boolean);
                  const unique = [...new Set(allMg)].slice(0, 6);
                  return unique.length > 0 ? <Text style={styles.musclesText}>{unique.join(' · ')}</Text> : null;
                })()}
                <Text style={styles.meta}>
                  {w.exercise_count} exercise{w.exercise_count !== 1 ? 's' : ''} · {w.working_sets || 0} working sets
                </Text>
                {w.notes ? <Text style={styles.notesText}>{w.notes}</Text> : null}
                {isExpanded && sets.length > 0 && (
                  <View style={styles.detailSection}>
                    {groupByExercise(sets).map(([name, exSets]: [string, any[]]) => (
                      <View key={name} style={styles.detailGroup}>
                        <Text style={styles.detailExName}>{name}</Text>
                        {exSets.map((s: any) => {
                          const isPR = prSets[w.id]?.has(s.id);
                          return (
                            <View key={s.id} style={styles.detailSetRow}>
                              <Text style={[styles.detailSet, isPR && styles.detailSetPR]}>
                                {s.is_warmup ? 'W ' : ''}
                                {s.weight ?? '-'} {unit} × {s.reps ?? '-'}
                                {s.rir != null ? ` @ RIR ${s.rir}` : ''}
                                {s.is_completed ? ' ✓' : ''}
                                {s.notes ? ` — ${s.notes}` : ''}
                              </Text>
                              {isPR && <Text style={styles.prBadge}>PR</Text>}
                            </View>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                )}
                {isExpanded && (
                  <View style={styles.actionRow}>
                    <Pressable onPress={() => handleRepeatWorkout(w.id)} style={styles.repeatBtn}>
                      <Text style={styles.repeatBtnText}>Repeat Workout</Text>
                    </Pressable>
                    <Pressable onPress={() => handleDeleteWorkout(w.id)} style={styles.deleteBtn}>
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </Pressable>
                  </View>
                )}
                <Text style={styles.expandHint}>{isExpanded ? '▲ collapse' : '▼ tap for details'}</Text>
              </View>
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
  container: { flex: 1, padding: 16 },
  h1: { fontSize: 24, fontWeight: '600', marginBottom: 12 },
  empty: { color: '#666', marginTop: 20 },
  card: { borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 10, padding: 12, marginBottom: 10, backgroundColor: '#fafafa' },
  cardExpanded: { backgroundColor: '#f0f9ff', borderColor: '#93c5fd' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: 16, fontWeight: '700', color: '#111' },
  badge: { backgroundColor: '#ef4444', color: '#fff', fontSize: 12, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' },
  tagsRow: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  splitBadge: { fontSize: 10, fontWeight: '700', color: '#fff', backgroundColor: '#6366f1', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, overflow: 'hidden' },
  volBadge: { fontSize: 10, fontWeight: '600', color: '#374151', backgroundColor: '#e5e7eb', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, overflow: 'hidden' },
  exercises: { fontSize: 14, color: '#374151', marginTop: 6 },
  musclesText: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  meta: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  notesText: { fontSize: 12, color: '#6b7280', fontStyle: 'italic', marginTop: 4 },
  expandHint: { fontSize: 11, color: '#9ca3af', marginTop: 6, textAlign: 'center' },
  detailSection: { marginTop: 10, gap: 8 },
  detailGroup: { gap: 2 },
  detailExName: { fontWeight: '600', fontSize: 13, color: '#1f2937' },
  detailSet: { fontSize: 13, color: '#4b5563', paddingLeft: 8 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  repeatBtn: { flex: 1, padding: 8, borderRadius: 6, backgroundColor: '#dbeafe', alignItems: 'center' },
  repeatBtnText: { color: '#1d4ed8', fontWeight: '600', fontSize: 13 },
  deleteBtn: { flex: 1, padding: 8, borderRadius: 6, backgroundColor: '#fee2e2', alignItems: 'center' },
  deleteBtnText: { color: '#ef4444', fontWeight: '600', fontSize: 13 },
  detailSetRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailSetPR: { color: '#d97706', fontWeight: '700' },
  prBadge: { fontSize: 9, fontWeight: '800', color: '#fff', backgroundColor: '#f59e0b', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3, overflow: 'hidden' },
  repeatBanner: { backgroundColor: '#dbeafe', padding: 8, borderRadius: 8, marginBottom: 8 },
  repeatBannerText: { color: '#1d4ed8', fontWeight: '600', fontSize: 13, textAlign: 'center' },
  // Calendar
  calContainer: { marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, backgroundColor: '#fafafa' },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  calNav: { fontSize: 16, color: '#6b7280', paddingHorizontal: 12 },
  calMonth: { fontSize: 15, fontWeight: '700', color: '#111' },
  calWeekRow: { flexDirection: 'row' },
  calWeekDay: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: '#9ca3af', marginBottom: 4 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: '14.28%', alignItems: 'center', paddingVertical: 4, minHeight: 32 },
  calCellToday: { backgroundColor: '#eff6ff', borderRadius: 6 },
  calDay: { fontSize: 13, color: '#374151' },
  calDayToday: { fontWeight: '800', color: '#1d4ed8' },
  calDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#ef4444', marginTop: 1 },
});
