import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { fontSize, fontWeight } from '@/theme/typography';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  size?: 'sm' | 'md';
};

export function Chip({ label, selected, onPress, size = 'md' }: ChipProps) {
  const { c } = useTheme();
  const sm = size === 'sm';
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        sm && styles.chipSm,
        {
          backgroundColor: selected ? c.chipSelectedBg : c.chipBg,
          borderColor: selected ? c.chipSelectedBg : c.chipBorder,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          sm && styles.labelSm,
          { color: selected ? c.chipSelectedText : c.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipSm: {
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  label: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
  },
  labelSm: {
    fontSize: fontSize.small,
  },
});
