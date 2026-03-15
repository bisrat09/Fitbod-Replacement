import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { bootstrapDb } from '@/lib/bootstrap';
import { ensureUser, findExerciseByName, createExercise, listFavoriteExerciseIds, addFavoriteExercise, removeFavoriteExercise, listExercises, archiveExercise, unarchiveExercise, listArchivedExercises, getAllExerciseStats, getUserUnit } from '@/lib/dao';
import { useTheme } from '@/theme/ThemeContext';
import { fontSize, fontWeight } from '@/theme/typography';
import { Card } from '@/components/Card';
import { ExerciseInitial } from '@/components/ExerciseInitial';
import { PinkButton } from '@/components/PinkButton';
import { ActionChip } from '@/components/ActionChip';

export default function ExerciseLibrary() {
  const { c } = useTheme();
  const [dbCtx, setDbCtx] = useState<any>(null);
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const [exercises, setExercises] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMuscles, setNewMuscles] = useState('');
  const [newEquipment, setNewEquipment] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [archivedExercises, setArchivedExercises] = useState<any[]>([]);
  const [exStats, setExStats] = useState<Record<string, any>>({});
  const [unit, setUnit] = useState<'lb' | 'kg'>('lb');

  useEffect(() => {
    (async () => {
      const { db, userId } = await bootstrapDb();
      const ctx = { db, userId };
      await ensureUser(ctx, { id: userId, display_name: 'You', unit: 'lb' });
      setDbCtx(ctx);
      await refresh(ctx);
    })();
  }, []);

  async function refresh(ctx?: any) {
    const x = ctx || dbCtx;
    if (!x) return;
    const [exs, ids, archived, stats, u] = await Promise.all([
      listExercises(x), listFavoriteExerciseIds(x), listArchivedExercises(x), getAllExerciseStats(x), getUserUnit(x),
    ]);
    setExercises(exs);
    setFavIds(new Set(ids));
    setArchivedExercises(archived);
    setUnit(u);
    const statsMap: Record<string, any> = {};
    for (const s of stats) statsMap[s.id] = s;
    setExStats(statsMap);
  }

  async function toggleFav(exerciseId: string) {
    if (!dbCtx) return;
    if (favIds.has(exerciseId)) await removeFavoriteExercise(dbCtx, exerciseId);
    else await addFavoriteExercise(dbCtx, exerciseId);
    await refresh();
  }

  async function handleArchive(exerciseId: string) {
    if (!dbCtx) return;
    await archiveExercise(dbCtx, exerciseId);
    await refresh();
  }

  async function handleUnarchive(exerciseId: string) {
    if (!dbCtx) return;
    await unarchiveExercise(dbCtx, exerciseId);
    await refresh();
  }

  async function createCustomExercise() {
    if (!dbCtx || !newName.trim()) return;
    const existing = await findExerciseByName(dbCtx, newName.trim());
    if (existing) return;
    await createExercise(dbCtx, {
      id: Crypto.randomUUID(), name: newName.trim(), muscle_groups: newMuscles.trim() || 'other',
      is_compound: 0, required_equipment: newEquipment.trim() || '', tags: 'custom', default_increment: 2.5,
    });
    setNewName(''); setNewMuscles(''); setNewEquipment(''); setShowForm(false);
    await refresh();
  }

  const filtered = search ? exercises.filter((ex: any) => ex.name.toLowerCase().includes(search.toLowerCase())) : exercises;
  const sorted = [...filtered].sort((a: any, b: any) => {
    const af = favIds.has(a.id) ? 0 : 1;
    const bf = favIds.has(b.id) ? 0 : 1;
    return af - bf || a.name.localeCompare(b.name);
  });

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.bg }]}>
      <Text style={[styles.h1, { color: c.text }]}>Exercise Library</Text>
      <Text style={[styles.hint, { color: c.textMuted }]}>
        Tap the star to favorite. Favorites appear first when adding exercises.
      </Text>

      {/* Search */}
      <View style={[styles.searchRow, { backgroundColor: c.inputBg, borderColor: c.inputBorder }]}>
        <Ionicons name="search" size={16} color={c.textMuted} />
        <TextInput
          placeholder="Search exercises..."
          value={search}
          onChangeText={setSearch}
          style={[styles.searchInput, { color: c.text }]}
          placeholderTextColor={c.textMuted}
        />
      </View>

      {/* Exercise list */}
      {sorted.map((ex: any) => {
        const isFav = favIds.has(ex.id);
        const stat = exStats[ex.id];
        return (
          <Card key={ex.id}>
            <View style={styles.exRow}>
              <Pressable onPress={() => toggleFav(ex.id)} hitSlop={6}>
                <Ionicons name={isFav ? 'star' : 'star-outline'} size={20} color={isFav ? c.gold : c.textMuted} />
              </Pressable>
              <ExerciseInitial name={ex.name} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.exName, { color: c.text }]}>{ex.name}</Text>
                <Text style={[styles.muscleText, { color: c.textMuted }]}>
                  {(ex.muscle_groups || '').replace(/,/g, ' \u00B7 ').replace(/_/g, ' ')}
                </Text>
                {(ex.required_equipment || '') !== '' && (
                  <Text style={[styles.equipText, { color: c.textMuted }]}>
                    {(ex.required_equipment || '').replace(/,/g, ' \u00B7 ')}
                  </Text>
                )}
                {stat?.total_sets > 0 && (
                  <Text style={[styles.statsText, { color: c.textSecondary }]}>
                    {stat.total_sets} sets
                    {stat.best_1rm ? ` \u00B7 Best 1RM: ${Math.round(stat.best_1rm)} ${unit}` : ''}
                    {stat.best_weight ? ` \u00B7 Max: ${stat.best_weight} ${unit}` : ''}
                  </Text>
                )}
              </View>
              <Pressable onPress={() => handleArchive(ex.id)} hitSlop={6}>
                <Ionicons name="archive-outline" size={16} color={c.textMuted} />
              </Pressable>
            </View>
          </Card>
        );
      })}

      {/* Create custom exercise */}
      <View style={styles.customSection}>
        {!showForm ? (
          <PinkButton title="+ Create Custom Exercise" onPress={() => setShowForm(true)} fullWidth />
        ) : (
          <Card>
            <Text style={[styles.formTitle, { color: c.text }]}>New Exercise</Text>
            <TextInput
              placeholder="Exercise name"
              value={newName}
              onChangeText={setNewName}
              style={[styles.formInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]}
              placeholderTextColor={c.textMuted}
            />
            <TextInput
              placeholder="Muscle groups (comma-separated)"
              value={newMuscles}
              onChangeText={setNewMuscles}
              style={[styles.formInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]}
              placeholderTextColor={c.textMuted}
            />
            <TextInput
              placeholder="Required equipment (comma-separated)"
              value={newEquipment}
              onChangeText={setNewEquipment}
              style={[styles.formInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]}
              placeholderTextColor={c.textMuted}
            />
            <View style={styles.formRow}>
              <ActionChip label="Cancel" onPress={() => setShowForm(false)} />
              <View style={{ flex: 1 }}>
                <PinkButton title="Create" onPress={createCustomExercise} disabled={!newName.trim()} fullWidth />
              </View>
            </View>
          </Card>
        )}
      </View>

      {/* Archived */}
      {archivedExercises.length > 0 && (
        <View style={styles.archivedSection}>
          <Pressable onPress={() => setShowArchived(!showArchived)} style={styles.archivedToggle}>
            <Ionicons name={showArchived ? 'chevron-up' : 'chevron-down'} size={14} color={c.textMuted} />
            <Text style={[styles.archivedLabel, { color: c.textMuted }]}>
              Archived ({archivedExercises.length})
            </Text>
          </Pressable>
          {showArchived && archivedExercises.map((ex: any) => (
            <View key={ex.id} style={[styles.archivedRow, { borderBottomColor: c.cardBorder }]}>
              <Text style={[styles.archivedName, { color: c.textMuted }]}>{ex.name}</Text>
              <Pressable onPress={() => handleUnarchive(ex.id)}>
                <Text style={[styles.restoreBtn, { color: c.green }]}>Restore</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  h1: { fontSize: fontSize.h1, fontWeight: fontWeight.bold, marginBottom: 4 },
  hint: { fontSize: fontSize.caption, marginBottom: 12 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: fontSize.caption, padding: 0 },
  // Exercise row
  exRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  exName: { fontWeight: fontWeight.semibold, fontSize: fontSize.body },
  muscleText: { fontSize: fontSize.tiny, textTransform: 'capitalize' },
  equipText: { fontSize: fontSize.tiny },
  statsText: { fontSize: fontSize.tiny, marginTop: 2 },
  // Custom exercise
  customSection: { marginTop: 16 },
  formTitle: { fontWeight: fontWeight.semibold, fontSize: fontSize.body },
  formInput: { borderWidth: 1, borderRadius: 8, padding: 8, fontSize: fontSize.caption },
  formRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 },
  // Archived
  archivedSection: { marginTop: 16, gap: 6 },
  archivedToggle: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  archivedLabel: { fontSize: fontSize.caption, fontWeight: fontWeight.semibold },
  archivedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1 },
  archivedName: { fontSize: fontSize.caption },
  restoreBtn: { fontSize: fontSize.small, fontWeight: fontWeight.semibold },
});
