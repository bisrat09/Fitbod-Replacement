import React from 'react';
import { View, Text, Pressable, Modal, StyleSheet, KeyboardAvoidingView, Platform, Keyboard, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { fontSize, fontWeight } from '@/theme/typography';

type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  style?: ViewStyle;
  /** iOS: fires once the sheet has fully closed. */
  onDismiss?: () => void;
};

export function BottomSheet({ visible, onClose, title, children, style, onDismiss }: BottomSheetProps) {
  const { c } = useTheme();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} onDismiss={onDismiss}>
      {/* Lifts the sheet above the keyboard so search results stay tappable */}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pressable style={[styles.backdrop, { backgroundColor: c.modalBackdrop }]} onPress={onClose}>
        <View />
      </Pressable>
      <View style={[styles.sheet, { backgroundColor: c.modalBg }, style]}>
        <Pressable onPress={Keyboard.dismiss} hitSlop={12} style={styles.handleHit}>
        <View style={[styles.handle, { backgroundColor: c.textMuted }]} />
        </Pressable>
        {title && (
          <View style={styles.header}>
            <Text style={[styles.title, { color: c.text }]}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={c.accent} />
            </Pressable>
          </View>
        )}
        {children}
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  handleHit: { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 4 },
  backdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 32,
    gap: 12,
    maxHeight: '80%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: fontSize.h3,
    fontWeight: fontWeight.bold,
  },
});
