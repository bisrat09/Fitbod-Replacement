import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Button } from 'react-native';
import { bootstrapDb } from '@/lib/bootstrap';
import { ensureUser, findExerciseByName, createExercise, listFavoriteExerciseIds, listFavoriteExercises, addFavoriteExercise, removeFavoriteExercise, listExercises, archiveExercise, unarchiveExercise, listArchivedExercises } from '@/lib/dao';
import * as Crypto from 'expo-crypto';

export default function ExerciseLibrary() {
  const [dbCtx, setDbCtx] = useState<any>(null);
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const [exercises, setExercises] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  // Custom exercise form
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMuscles, setNewMuscles] = useState('');
  const [newEquipment, setNewEquipment] = useState('');
  // Archive
  const [showArchived, setShowArchived] = useState(false);
  const [archivedExercises, setArchivedExercises] = useState<any[]>([]);

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
    const c = ctx || dbCtx;
    if (!c) return;
    const [exs, ids, archived] = await Promise.all([
      listExercises(c),
      listFavoriteExerciseIds(c),
      listArchivedExercises(c),
    ]);
    setExercises(exs);
    setFavIds(new Set(ids));
    setArchivedExercises(archived);
  }

  async function toggleFav(exerciseId: string) {
    if (!dbCtx) return;
    if (favIds.has(exerciseId)) {
      await removeFavoriteExercise(dbCtx, exerciseId);
    } else {
      await addFavoriteExercise(dbCtx, exerciseId);
    }
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
    if (existing) return; // already exists
    const id = Crypto.randomUUID();
    await createExercise(dbCtx, {
      id,
      name: newName.trim(),
      muscle_groups: newMuscles.trim() || 'other',
      is_compound: 0,
      required_equipment: newEquipment.trim() || '',
      tags: 'custom',
      default_increment: 2.5,
    });
    setNewName('');
    setNewMuscles('');
    setNewEquipment('');
    setShowForm(false);
    await refresh();
  }

  const filtered = search
    ? exercises.filter((ex: any) => ex.name.toLowerCase().includes(search.toLowerCase()))
    : exercises;

  // Sort: favorites first
  const sorted = [...filtered].sort((a: any, b: any) => {
    const af = favIds.has(a.id) ? 0 : 1;
    const bf = favIds.has(b.id) ? 0 : 1;
    return af - bf || a.name.localeCompare(b.name);
  });

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.h1}>Exercise Library</Text>
      <Text style={styles.hint}>Tap to favorite. Favorites appear first when adding exercises to workouts.</Text>
      <TextInput placeholder='Search exercises...' value={search} onChangeText={setSearch} style={styles.searchInput} />

      {sorted.map((ex: any) => {
        const isFav = favIds.has(ex.id);
        const muscles = (ex.muscle_groups || '').replace(/,/g, ' · ');
        const equip = (ex.required_equipment || '').replace(/,/g, ' · ');
        return (
          <View key={ex.id} style={[styles.exRow, isFav && styles.exRowFav]}>
            <Pressable onPress={() => toggleFav(ex.id)} style={{flex:1}}>
              <View style={styles.exHeader}>
                <Text style={[styles.exName, isFav && styles.exNameFav]}>{isFav ? '★ ' : '☆ '}{ex.name}</Text>
              </View>
              <Text style={[styles.muscleText, isFav && { color: '#d1fae5' }]}>{muscles}</Text>
              {equip ? <Text style={[styles.equipText, isFav && { color: '#a7f3d0' }]}>{equip}</Text> : null}
            </Pressable>
            <Pressable onPress={() => handleArchive(ex.id)} style={styles.archiveBtn}>
              <Text style={styles.archiveBtnText}>Archive</Text>
            </Pressable>
          </View>
        );
      })}

      {/* Custom Exercise */}
      <View style={styles.customSection}>
        {!showForm ? (
          <Button title='+ Create Custom Exercise' onPress={() => setShowForm(true)} />
        ) : (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>New Exercise</Text>
            <TextInput placeholder='Exercise name' value={newName} onChangeText={setNewName} style={styles.formInput} />
            <TextInput placeholder='Muscle groups (comma-separated)' value={newMuscles} onChangeText={setNewMuscles} style={styles.formInput} />
            <TextInput placeholder='Required equipment (comma-separated)' value={newEquipment} onChangeText={setNewEquipment} style={styles.formInput} />
            <View style={styles.formRow}>
              <Button title='Cancel' onPress={() => setShowForm(false)} />
              <Button title='Create' color='#059669' onPress={createCustomExercise} disabled={!newName.trim()} />
            </View>
          </View>
        )}
      </View>

      {/* Archived */}
      {archivedExercises.length > 0 && (
        <View style={styles.archivedSection}>
          <Pressable onPress={() => setShowArchived(!showArchived)}>
            <Text style={styles.archivedToggle}>{showArchived ? '▲' : '▼'} Archived ({archivedExercises.length})</Text>
          </Pressable>
          {showArchived && archivedExercises.map((ex: any) => (
            <View key={ex.id} style={styles.archivedRow}>
              <Text style={styles.archivedName}>{ex.name}</Text>
              <Pressable onPress={() => handleUnarchive(ex.id)}>
                <Text style={styles.unarchiveBtn}>Restore</Text>
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
  h1: { fontSize: 24, fontWeight: '600', marginBottom: 4 },
  hint: { fontSize: 13, color: '#6b7280', marginBottom: 12 },
  searchInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 8, fontSize: 14, marginBottom: 12 },
  exRow: { padding: 12, borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 8, marginBottom: 8, gap: 2 },
  exRowFav: { backgroundColor: '#0ea5a4', borderColor: '#0ea5a4' },
  exHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exName: { fontWeight: '600', color: '#111', fontSize: 15 },
  exNameFav: { color: '#fff' },
  muscleText: { fontSize: 12, color: '#6b7280' },
  equipText: { fontSize: 11, color: '#9ca3af' },
  customSection: { marginTop: 16 },
  formCard: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 12, gap: 8, backgroundColor: '#f9fafb' },
  formTitle: { fontWeight: '600', fontSize: 15 },
  formInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, padding: 8, fontSize: 14 },
  formRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  archiveBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  archiveBtnText: { fontSize: 11, color: '#6b7280' },
  archivedSection: { marginTop: 16, gap: 6 },
  archivedToggle: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  archivedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  archivedName: { fontSize: 13, color: '#9ca3af' },
  unarchiveBtn: { fontSize: 12, color: '#059669', fontWeight: '600' },
});
