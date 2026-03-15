import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { fontSize, fontWeight } from '@/theme/typography';

type SupersetHeaderProps = {
  exerciseCount: number;
  rounds?: number;
  onMorePress?: () => void;
};

export function SupersetHeader({ exerciseCount, rounds, onMorePress }: SupersetHeaderProps) {
  const { c } = useTheme();
  const label = rounds
    ? `Superset \u00B7 ${rounds} Rounds`
    : `Superset \u00B7 ${exerciseCount} Exercises`;
  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: c.accent }]}>{label}</Text>
      {onMorePress && (
        <Pressable onPress={onMorePress} hitSlop={8}>
          <Ionicons name="ellipsis-horizontal" size={18} color={c.textSecondary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  label: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
