import React, { useEffect, useState } from 'react';
import { View, Text, Image, Pressable, Modal, ScrollView, StyleSheet, Linking, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { fontSize, fontWeight } from '@/theme/typography';
import { ExerciseImage } from './ExerciseImage';
import { getExerciseInstructions, exercisePhotoUrls, exerciseVideoSearchUrl } from '@/lib/exerciseInstructions';
import { isGifBlocked } from '@/lib/exerciseImages';

type ExerciseDemoModalProps = {
  visible: boolean;
  onClose: () => void;
  name: string;
  imageUrl?: string | null;
};

/**
 * Full-screen exercise demo: sharp start/finish photos cycling like a slow animation
 * (falls back to the low-res ExerciseDB GIF), target muscles, step-by-step
 * instructions, and a link out to real form videos.
 */

const PHOTO_ASPECT = 567 / 850; // free-exercise-db photos are 850×567
const PHOTO_CYCLE_MS = 1200;
export function ExerciseDemoModal({ visible, onClose, name, imageUrl }: ExerciseDemoModalProps) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const info = getExerciseInstructions(name);
  const muscles = info ? [...info.primary, ...info.secondary] : [];
  const photos = exercisePhotoUrls(info);
  const [mode, setMode] = useState<'photos' | 'animation'>('photos');
  const [frame, setFrame] = useState(0);
  const showPhotos = photos.length >= 2 && mode === 'photos';

  useEffect(() => {
    if (!visible || !showPhotos) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % photos.length), PHOTO_CYCLE_MS);
    return () => clearInterval(id);
  }, [visible, showPhotos, photos.length]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: c.bg }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            {showPhotos ? (
              <View style={{ width, height: width * PHOTO_ASPECT }}>
                {/* Stack all frames so switching is instant (no reload flicker) */}
                {photos.map((uri, i) => (
                  <Image
                    key={uri}
                    source={{ uri }}
                    style={[StyleSheet.absoluteFill, { opacity: i === frame ? 1 : 0 }]}
                    resizeMode="cover"
                  />
                ))}
              </View>
            ) : (
              <ExerciseImage name={name} imageUrl={imageUrl} size={width} shape="square" />
            )}
            <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: c.chipBg }]} hitSlop={8}>
              <Ionicons name="close" size={22} color={c.text} />
            </Pressable>
          </View>

          {photos.length >= 2 && (
            <View style={styles.mediaBar}>
              <View style={styles.frameDots}>
                {showPhotos && photos.map((_, i) => (
                  <View key={i} style={[styles.frameDot, { backgroundColor: i === frame ? c.accent : c.chipBorder }]} />
                ))}
                {showPhotos && (
                  <Text style={[styles.frameLabel, { color: c.textSecondary }]}>
                    {frame === 0 ? 'Start' : 'Finish'}
                  </Text>
                )}
              </View>
              {!isGifBlocked(name) && <Pressable
                onPress={() => setMode(mode === 'photos' ? 'animation' : 'photos')}
                style={[styles.modeChip, { backgroundColor: c.chipBg, borderColor: c.chipBorder }]}
              >
                <Text style={[styles.modeChipText, { color: c.text }]}>
                  {mode === 'photos' ? 'Show animation' : 'Show photos'}
                </Text>
              </Pressable>}
            </View>
          )}

          <View style={styles.body}>
            <Text style={[styles.title, { color: c.text }]}>{name}</Text>

            <Pressable
              onPress={() => Linking.openURL(exerciseVideoSearchUrl(name))}
              style={[styles.videoBtn, { backgroundColor: c.accent }]}
            >
              <Ionicons name="logo-youtube" size={20} color={c.textOnAccent} />
              <Text style={[styles.videoBtnText, { color: c.textOnAccent }]}>Watch form videos</Text>
            </Pressable>

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
  mediaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  frameDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  frameDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  frameLabel: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    marginLeft: 4,
  },
  modeChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  modeChipText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
  },
  videoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
  },
  videoBtnText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
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
