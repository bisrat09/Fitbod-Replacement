import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { fontSize, fontWeight } from '@/theme/typography';
import { ExerciseImage } from '../ExerciseImage';

type ExerciseListItemProps = {
  name: string;
  imageUrl?: string | null;
  subtitle: string; // e.g. "3 sets · 10 reps · 155 lb"
  /** Progress text for active workout, e.g. "2/3" */
  progress?: string;
  allDone?: boolean;
  onPress?: () => void;
  onMenuPress?: () => void;
  onImageFetched?: (url: string) => void;
};

export function ExerciseListItem({
  name,
  imageUrl,
  subtitle,
  progress,
  allDone,
  onPress,
  onMenuPress,
  onImageFetched,
}: ExerciseListItemProps) {
  const { c } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[styles.container, { borderBottomColor: c.cardBorder }]}
    >
      <ExerciseImage name={name} imageUrl={imageUrl} size={56} onImageFetched={onImageFetched} />
      <View style={styles.info}>
        <Text style={[styles.name, { color: allDone ? c.green : c.text }]} numberOfLines={2}>
          {name}
        </Text>
        <Text style={[styles.subtitle, { color: c.textSecondary }]} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {progress && (
        <Text style={[styles.progress, { color: allDone ? c.green : c.textSecondary }]}>
          {progress}
        </Text>
      )}
      {onMenuPress && (
        <Pressable onPress={onMenuPress} hitSlop={8} style={styles.menuBtn}>
          <Ionicons name="ellipsis-horizontal" size={20} color={c.textSecondary} />
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  subtitle: {
    fontSize: fontSize.caption,
  },
  progress: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    marginRight: 4,
  },
  menuBtn: {
    padding: 4,
  },
});
