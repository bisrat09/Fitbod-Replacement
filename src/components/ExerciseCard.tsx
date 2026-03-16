import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { fontSize, fontWeight } from '@/theme/typography';
import { ExerciseImage } from './ExerciseImage';

type ExerciseCardProps = {
  name: string;
  subtitle?: string; // e.g. "3 sets · 10 reps · 155 lb"
  muscleGroups?: string;
  imageUrl?: string | null;
  onPress?: () => void;
  onMorePress?: () => void;
  selected?: boolean;
};

export function ExerciseCard({ name, subtitle, muscleGroups, imageUrl, onPress, onMorePress, selected }: ExerciseCardProps) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.container,
        { borderColor: selected ? c.accent : c.cardBorder },
        selected && { backgroundColor: c.accentLight },
      ]}
    >
      <ExerciseImage name={name} imageUrl={imageUrl} size={44} />
      <View style={styles.info}>
        <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>{name}</Text>
        {subtitle && <Text style={[styles.subtitle, { color: c.textSecondary }]} numberOfLines={1}>{subtitle}</Text>}
        {muscleGroups && (
          <Text style={[styles.muscles, { color: c.textMuted }]} numberOfLines={1}>
            {muscleGroups.replace(/,/g, ' \u00B7 ').replace(/_/g, ' ')}
          </Text>
        )}
      </View>
      {onMorePress && (
        <Pressable onPress={onMorePress} hitSlop={8} style={styles.more}>
          <Ionicons name="ellipsis-horizontal" size={18} color={c.textSecondary} />
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  subtitle: {
    fontSize: fontSize.caption,
  },
  muscles: {
    fontSize: fontSize.small,
    textTransform: 'capitalize',
  },
  more: {
    padding: 4,
  },
});
