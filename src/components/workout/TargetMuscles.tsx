import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { fontSize, fontWeight } from '@/theme/typography';
import { computeTargetMuscles } from '@/lib/targetMuscles';

type TargetMusclesProps = {
  exercises: { muscle_groups: string }[];
};

export function TargetMuscles({ exercises }: TargetMusclesProps) {
  const { c } = useTheme();
  const targets = computeTargetMuscles(exercises);

  if (targets.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: c.text }]}>Target Muscles</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {targets.map((t) => (
          <View key={t.muscle} style={styles.badge}>
            <Text style={[styles.muscleName, { color: c.text }]}>{t.muscle}</Text>
            <View style={[styles.percentBadge, { backgroundColor: c.accent }]}>
              <Text style={[styles.percentText, { color: c.textOnAccent }]}>{t.percentage}%</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  title: {
    fontSize: fontSize.h2,
    fontWeight: fontWeight.bold,
    marginBottom: 12,
  },
  scroll: {
    gap: 16,
    paddingRight: 16,
  },
  badge: {
    alignItems: 'center',
    gap: 6,
  },
  muscleName: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
  },
  percentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  percentText: {
    fontSize: fontSize.tiny,
    fontWeight: fontWeight.bold,
  },
});
