import { StyleSheet, Text, View } from 'react-native';

import { statusColors, statusLabels, theme } from '@/src/theme';
import type { DeviceStatus } from '@/src/types/device';

export function StatusChip({ status }: { status: DeviceStatus }) {
  const color = statusColors[status] ?? theme.colors.slateMuted;
  return (
    <View style={[styles.chip, { backgroundColor: `${color}22`, borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{statusLabels[status] ?? status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
