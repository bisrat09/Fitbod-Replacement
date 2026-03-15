import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { fontWeight } from '@/theme/typography';

// Stable color palette for exercise initials (decorative, theme-independent)
const INITIAL_COLORS = [
  '#FF3B5C', '#0A84FF', '#34C759', '#FF9500', '#AF52DE',
  '#5AC8FA', '#FF2D55', '#64D2FF', '#FFD700', '#30D158',
];

type ExerciseInitialProps = {
  name: string;
  size?: number;
};

export function ExerciseInitial({ name, size = 40 }: ExerciseInitialProps) {
  const { c } = useTheme();
  const initial = (name || '?')[0].toUpperCase();
  // Deterministic color from name
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % INITIAL_COLORS.length;
  const bg = INITIAL_COLORS[hash];

  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={[styles.text, { fontSize: size * 0.45, color: c.textOnAccent }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: fontWeight.bold,
  },
});
