import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { fontSize, fontWeight } from '@/theme/typography';
import { calculatePlates } from '@/lib/progression';
import { BottomSheet } from '../BottomSheet';

type PlateCalcSheetProps = {
  visible: boolean;
  onClose: () => void;
  unit: 'lb' | 'kg';
  initialWeight?: string;
};

const BAR_WEIGHT = { lb: 45, kg: 20 };

export function PlateCalcSheet({ visible, onClose, unit, initialWeight = '' }: PlateCalcSheetProps) {
  const { c } = useTheme();
  const [target, setTarget] = useState(initialWeight);

  // Reset on open
  React.useEffect(() => {
    if (visible) setTarget(initialWeight);
  }, [visible, initialWeight]);

  const targetNum = parseFloat(target) || 0;
  const bar = BAR_WEIGHT[unit];
  const plates = targetNum > bar ? calculatePlates(targetNum, bar, unit) : [];

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Plate Calculator">
      <TextInput
        placeholder={`Target weight (${unit})`}
        value={target}
        onChangeText={setTarget}
        keyboardType="numeric"
        style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]}
        placeholderTextColor={c.textMuted}
      />
      <Text style={[styles.barLabel, { color: c.textSecondary }]}>
        Bar: {bar} {unit}
      </Text>

      {targetNum <= bar && targetNum > 0 && (
        <Text style={{ color: c.textMuted }}>
          Weight must exceed bar weight ({bar} {unit})
        </Text>
      )}

      {plates.length > 0 && (
        <View style={styles.platesContainer}>
          <Text style={[styles.perSide, { color: c.text }]}>Per side:</Text>
          {plates.map((p) => (
            <View key={p.plate} style={styles.plateRow}>
              <View
                style={[
                  styles.plateVisual,
                  { backgroundColor: c.textMuted, width: Math.max(36, p.plate * (unit === 'lb' ? 1.2 : 2.5)) },
                ]}
              >
                <Text style={[styles.plateText, { color: c.textOnAccent }]}>{p.plate}</Text>
              </View>
              <Text style={[styles.plateCount, { color: c.text }]}>{'\u00D7'}{p.count}</Text>
            </View>
          ))}
          <Text style={[styles.total, { color: c.textSecondary }]}>
            Total: {bar} + {plates.reduce((s, p) => s + p.plate * p.count * 2, 0)} ={' '}
            {bar + plates.reduce((s, p) => s + p.plate * p.count * 2, 0)} {unit}
          </Text>
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: fontSize.body,
  },
  barLabel: {
    fontSize: fontSize.small,
  },
  platesContainer: {
    gap: 6,
  },
  perSide: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
  },
  plateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  plateVisual: {
    height: 30,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plateText: {
    fontWeight: fontWeight.bold,
    fontSize: fontSize.small,
  },
  plateCount: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
  },
  total: {
    fontSize: fontSize.small,
    marginTop: 4,
  },
});
