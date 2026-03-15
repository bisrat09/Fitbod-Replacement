import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { fontSize, fontWeight } from '@/theme/typography';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
};

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  const { c } = useTheme();
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Text style={[styles.title, { color: c.text }]}>{title}</Text>
        {subtitle && <Text style={[styles.subtitle, { color: c.textSecondary }]}>{subtitle}</Text>}
      </View>
      {action && (
        <Pressable onPress={action.onPress}>
          <Text style={[styles.action, { color: c.accent }]}>{action.label}</Text>
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
  },
  left: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.h2,
    fontWeight: fontWeight.bold,
  },
  subtitle: {
    fontSize: fontSize.caption,
    marginTop: 2,
  },
  action: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
  },
});
