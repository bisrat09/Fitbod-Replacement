import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { fontSize, fontWeight } from '@/theme/typography';

type SettingsRowProps = {
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  danger?: boolean;
};

export function SettingsRow({ label, value, onPress, showChevron = true, danger }: SettingsRowProps) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <Text style={[styles.label, { color: danger ? c.danger : c.text }]}>{label}</Text>
      <View style={styles.right}>
        {value && <Text style={[styles.value, { color: c.textSecondary }]}>{value}</Text>}
        {showChevron && onPress && (
          <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
  },
  label: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.regular,
    flex: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  value: {
    fontSize: fontSize.body,
  },
});
