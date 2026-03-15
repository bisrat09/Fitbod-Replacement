import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { fontSize, fontWeight } from '@/theme/typography';

type ActionChipProps = {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
};

export function ActionChip({ icon, label, onPress }: ActionChipProps) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { backgroundColor: c.chipBg, borderColor: c.chipBorder }]}
    >
      {icon && <Ionicons name={icon} size={14} color={c.textSecondary} />}
      <Text style={[styles.label, { color: c.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  label: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.medium,
  },
});
