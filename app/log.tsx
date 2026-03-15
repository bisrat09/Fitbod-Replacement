import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { bootstrapDb } from '@/lib/bootstrap';
import { ensureUser, getUserUnit } from '@/lib/dao';
import { useTheme } from '@/theme/ThemeContext';
import { fontSize, fontWeight } from '@/theme/typography';
import { Card } from '@/components/Card';
import { ExerciseInitial } from '@/components/ExerciseInitial';

export default function LogScreen() {
  const { c } = useTheme();
  const [dbCtx, setDbCtx] = useState<any>(null);
  const [recentByDate, setRecentByDate] = useState<Record<string, any[]>>({});
  const [unit, setUnit] = useState<'lb' | 'kg'>('lb');

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
      const rows = await dbCtx.db.getAllAsync(`
        SELECT s.*, ex.name AS exercise_name, w.date AS workout_date
        FROM sets s
        JOIN exercises ex ON ex.id=s.exercise_id
        JOIN workouts w ON w.id = s.workout_id
        WHERE s.user_id=?
        ORDER BY w.date DESC, s.set_index ASC
        LIMIT 100
      `, [dbCtx.userId]);
      const by: Record<string, any[]> = {};
      for (const r of rows) {
        const key = (r.workout_date || '').slice(0, 10);
        if (!by[key]) by[key] = [];
        by[key].push(r);
      }
      setRecentByDate(by);
    })();
  }, [dbCtx]);

  function formatHeader(key: string) {
    try {
      const d = new Date(key);
      const today = new Date();
      const yday = new Date(); yday.setDate(today.getDate() - 1);
      const fmt = (x: Date) => x.toISOString().slice(0, 10);
      if (fmt(d) === fmt(today)) return 'Today';
      if (fmt(d) === fmt(yday)) return 'Yesterday';
      return d.toLocaleDateString();
    } catch { return key; }
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}>
      <Text style={[styles.h1, { color: c.text }]}>Log</Text>
      {Object.keys(recentByDate).length === 0 ? (
        <Text style={[styles.emptyText, { color: c.textMuted }]}>No recent activity yet.</Text>
      ) : (
        Object.entries(recentByDate).map(([key, list]) => (
          <View key={key} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.textMuted }]}>{formatHeader(key)}</Text>
            <Card style={{ padding: 0 }}>
              {list.map((s: any, idx: number) => (
                <View
                  key={s.id}
                  style={[
                    styles.rowItem,
                    idx < list.length - 1 && { borderBottomColor: c.cardBorder, borderBottomWidth: StyleSheet.hairlineWidth },
                  ]}
                >
                  <ExerciseInitial name={s.exercise_name || '?'} size={32} />
                  <View style={styles.rowText}>
                    <Text style={[styles.title, { color: c.text }]}>{s.exercise_name}</Text>
                    <Text style={[styles.meta, { color: c.textSecondary }]}>{s.reps ?? '-'} reps {'\u00B7'} {s.weight ?? '-'} {unit}</Text>
                  </View>
                </View>
              ))}
            </Card>
          </View>
        ))
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingTop: 8 },
  h1: { fontSize: fontSize.h1, fontWeight: fontWeight.bold, marginBottom: 20 },
  emptyText: { fontSize: fontSize.body },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingLeft: 16,
    marginBottom: 8,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  rowText: { flex: 1 },
  title: { fontSize: fontSize.body, fontWeight: fontWeight.semibold },
  meta: { fontSize: fontSize.caption, marginTop: 2 },
});
