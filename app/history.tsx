import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { bootstrapDb } from '@/lib/bootstrap';
import { ensureUser, listWorkoutSummariesEnhanced, listWorkoutDetail, getUserUnit, deleteWorkout } from '@/lib/dao';

export default function History() {
  const [dbCtx, setDbCtx] = useState<any>(null);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, any[]>>({});
  const [unit, setUnit] = useState<'lb'|'kg'>('lb');

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
    })();
  }, [dbCtx]);

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
      const rows = await listWorkoutDetail(dbCtx, workoutId);
      setDetail(prev => ({ ...prev, [workoutId]: rows }));
    }
    setExpanded(workoutId);
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
                        {exSets.map((s: any) => (
                          <Text key={s.id} style={styles.detailSet}>
                            {s.is_warmup ? 'W ' : ''}
                            {s.weight ?? '-'} {unit} × {s.reps ?? '-'}
                            {s.rir != null ? ` @ RIR ${s.rir}` : ''}
                            {s.is_completed ? ' ✓' : ''}
                          </Text>
                        ))}
                      </View>
                    ))}
                  </View>
                )}
                {isExpanded && (
                  <Pressable onPress={() => handleDeleteWorkout(w.id)} style={styles.deleteBtn}>
                    <Text style={styles.deleteBtnText}>Delete Workout</Text>
                  </Pressable>
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
  deleteBtn: { marginTop: 10, padding: 8, borderRadius: 6, backgroundColor: '#fee2e2', alignItems: 'center' },
  deleteBtnText: { color: '#ef4444', fontWeight: '600', fontSize: 13 },
});
