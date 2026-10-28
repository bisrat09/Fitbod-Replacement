import React from 'react';
import { View, Text, Pressable, Modal, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { fontSize, fontWeight } from '@/theme/typography';
import { ExerciseImage } from './ExerciseImage';
import { getExerciseInstructions } from '@/lib/exerciseInstructions';

type ExerciseDemoModalProps = {
  visible: boolean;
  onClose: () => void;
  name: string;
  imageUrl?: string | null;
};

/**
 * Full-screen exercise demo: large animated GIF + target muscles + step-by-step instructions.
 */
export function ExerciseDemoModal({ visible, onClose, name, imageUrl }: ExerciseDemoModalProps) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const info = getExerciseInstructions(name);
  const muscles = info ? [...info.primary, ...info.secondary] : [];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: c.bg }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <ExerciseImage name={name} imageUrl={imageUrl} size={width} shape="square" />
            <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: c.chipBg }]} hitSlop={8}>
              <Ionicons name="close" size={22} color={c.text} />
            </Pressable>
          </View>

          <View style={styles.body}>
            <Text style={[styles.title, { color: c.text }]}>{name}</Text>

            {muscles.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: c.textMuted }]}>TARGET</Text>
                <View style={styles.chips}>
                  {info!.primary.map((m) => (
                    <View key={`p-${m}`} style={[styles.chip, { backgroundColor: c.accentLight, borderColor: c.accent }]}>
                      <Text style={[styles.chipText, { color: c.accent }]}>{m}</Text>
                    </View>
                  ))}
                  {info!.secondary.map((m) => (
                    <View key={`s-${m}`} style={[styles.chip, { backgroundColor: c.chipBg, borderColor: c.chipBorder }]}>
                      <Text style={[styles.chipText, { color: c.textSecondary }]}>{m}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: c.textMuted }]}>INSTRUCTIONS</Text>
              {info ? (
                info.steps.map((step, i) => (
                  <View key={i} style={styles.step}>
                    <Text style={[styles.stepNum, { color: c.accent }]}>{i + 1}</Text>
                    <Text style={[styles.stepText, { color: c.text }]}>{step}</Text>
                  </View>
                ))
              ) : (
                <Text style={[styles.stepText, { color: c.textSecondary }]}>
                  No written instructions for this exercise yet.
                </Text>
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 48,
  },
  hero: {
    position: 'relative',
    minHeight: 68,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 16,
    gap: 24,
  },
  title: {
    fontSize: fontSize.h1,
    fontWeight: fontWeight.bold,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    textTransform: 'capitalize',
  },
  step: {
    flexDirection: 'row',
    gap: 12,
  },
  stepNum: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    width: 20,
  },
  stepText: {
    flex: 1,
    fontSize: fontSize.body,
    lineHeight: 24,
  },
});
