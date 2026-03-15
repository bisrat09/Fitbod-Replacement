import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

type CardProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  done?: boolean;
};

export function Card({ children, style, done }: CardProps) {
  const { c } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: c.card, borderColor: done ? c.completedBorder : c.cardBorder },
        done && { backgroundColor: c.completedBg },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
});
