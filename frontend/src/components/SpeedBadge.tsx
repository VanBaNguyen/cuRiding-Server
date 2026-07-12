import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/src/theme';

export function SpeedBadge({ speedKmh }: { speedKmh: number }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.value}>{Math.round(speedKmh)}</Text>
      <Text style={styles.unit}>km/h</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.colors.slate,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 72,
  },
  value: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 32,
  },
  unit: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
});
