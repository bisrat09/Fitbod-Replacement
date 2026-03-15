import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { fontSize, fontWeight } from '@/theme/typography';
import { PinkButton } from '../PinkButton';

type StickyBarProps = {
  label: string;
  onPress: () => void;
  disabled: boolean;
  timerText?: string;
};

export function StickyBar({ label, onPress, disabled, timerText }: StickyBarProps) {
  const { c } = useTheme();
  return (
    <View style={[styles.bar, { backgroundColor: c.stickyBg, borderTopColor: c.cardBorder }]}>
      {timerText && (
        <Text style={[styles.timer, { color: c.accent }]}>{timerText}</Text>
      )}
      <PinkButton title={label} onPress={onPress} disabled={disabled} fullWidth />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    alignItems: 'center',
    gap: 4,
    zIndex: 50,
  },
  timer: {
    fontSize: fontSize.h3,
    fontWeight: fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
});
