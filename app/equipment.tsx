import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { bootstrapDb } from '@/lib/bootstrap';
import { ensureUser, listEquipment, addEquipment, removeEquipment } from '@/lib/dao';
import { useTheme } from '@/theme/ThemeContext';
import { fontSize, fontWeight } from '@/theme/typography';
import { Card } from '@/components/Card';

const COMMON_ITEMS = [
  { key: 'barbell', label: 'Barbell', icon: 'barbell-outline' as const },
  { key: 'rack', label: 'Rack', icon: 'grid-outline' as const },
  { key: 'bench', label: 'Bench', icon: 'bed-outline' as const },
  { key: 'dumbbells', label: 'Dumbbells', icon: 'fitness-outline' as const },
  { key: 'pullup_bar', label: 'Pull-up Bar', icon: 'remove-outline' as const },
  { key: 'cable', label: 'Cable', icon: 'swap-vertical-outline' as const },
];

export default function EquipmentScreen() {
  const { c } = useTheme();
  const [dbCtx, setDbCtx] = useState<any>(null);
  const [items, setItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState('');

  useEffect(() => {
    (async () => {
      const { db, userId } = await bootstrapDb();
      const ctx = { db, userId };
      await ensureUser(ctx, { id: userId, display_name: 'You', unit: 'lb' });
      setDbCtx(ctx);
      const rows = await listEquipment(ctx);
      setItems(rows.map((r: any) => r.item));
    })();
  }, []);

  async function refresh() {
    if (!dbCtx) return;
    const rows = await listEquipment(dbCtx);
    setItems(rows.map((r: any) => r.item));
  }

  async function handleAdd() {
    if (!dbCtx || !newItem.trim()) return;
    await addEquipment(dbCtx, newItem.trim());
    setNewItem('');
    await refresh();
  }

  async function toggleCommon(item: string) {
    if (!dbCtx) return;
    if (items.includes(item)) await removeEquipment(dbCtx, item);
    else await addEquipment(dbCtx, item);
    await refresh();
  }

  const customItems = items.filter((it) => !COMMON_ITEMS.some((ci) => ci.key === it));

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}>
      <Text style={[styles.h1, { color: c.text }]}>Equipment</Text>

      {/* Add custom */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: c.textMuted }]}>ADD CUSTOM</Text>
        <Card>
          <View style={styles.addRow}>
            <TextInput
              placeholder="e.g., resistance bands"
              value={newItem}
              onChangeText={setNewItem}
              style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]}
              placeholderTextColor={c.textMuted}
            />
            <Pressable
              onPress={handleAdd}
              disabled={!newItem.trim()}
              style={[styles.addBtn, { backgroundColor: newItem.trim() ? c.accent : c.cardBorder }]}
            >
              <Ionicons name="add" size={20} color={newItem.trim() ? c.textOnAccent : c.textMuted} />
            </Pressable>
          </View>
        </Card>
      </View>

      {/* Common equipment toggles */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: c.textMuted }]}>COMMON EQUIPMENT</Text>
        <Card style={{ padding: 0 }}>
          {COMMON_ITEMS.map((item, idx) => {
            const isSelected = items.includes(item.key);
            return (
              <Pressable
                key={item.key}
                onPress={() => toggleCommon(item.key)}
                style={[
                  styles.equipRow,
                  idx < COMMON_ITEMS.length - 1 && { borderBottomColor: c.cardBorder, borderBottomWidth: StyleSheet.hairlineWidth },
                ]}
              >
                <Ionicons name={item.icon} size={20} color={isSelected ? c.accent : c.textMuted} />
                <Text style={[styles.equipLabel, { color: c.text }]}>{item.label}</Text>
                <Ionicons
                  name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={isSelected ? c.green : c.textMuted}
                />
              </Pressable>
            );
          })}
        </Card>
      </View>

      {/* Custom items */}
      {customItems.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.textMuted }]}>CUSTOM</Text>
          <Card style={{ padding: 0 }}>
            {customItems.map((it, idx) => (
              <View
                key={it}
                style={[
                  styles.equipRow,
                  idx < customItems.length - 1 && { borderBottomColor: c.cardBorder, borderBottomWidth: StyleSheet.hairlineWidth },
                ]}
              >
                <Ionicons name="checkmark-circle" size={20} color={c.green} />
                <Text style={[styles.equipLabel, { color: c.text }]}>{it}</Text>
                <Pressable onPress={() => toggleCommon(it)} hitSlop={8}>
                  <Ionicons name="close-circle" size={20} color={c.textMuted} />
                </Pressable>
              </View>
            ))}
          </Card>
        </View>
      )}

      {items.length === 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="barbell-outline" size={48} color={c.textMuted} />
          <Text style={[styles.emptyText, { color: c.textMuted }]}>No equipment selected</Text>
          <Text style={[styles.emptyHint, { color: c.textMuted }]}>Toggle common equipment above or add custom items</Text>
        </View>
      )}

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
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: fontSize.body,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  equipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  equipLabel: {
    flex: 1,
    fontSize: fontSize.body,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: { fontSize: fontSize.body, fontWeight: fontWeight.semibold },
  emptyHint: { fontSize: fontSize.caption, textAlign: 'center' },
});
