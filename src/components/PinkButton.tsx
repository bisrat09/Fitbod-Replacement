import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { fontSize, fontWeight } from '@/theme/typography';

type PinkButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
};

export function PinkButton({ title, onPress, disabled, fullWidth }: PinkButtonProps) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.btn,
        { backgroundColor: disabled ? c.textMuted : c.accent },
        fullWidth && styles.fullWidth,
      ]}
    >
      <Text style={[styles.text, { color: c.textOnAccent }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
});
