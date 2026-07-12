import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/src/theme';
import type { TelemetryPoint } from '@/src/types/device';

export function RideChart({ points }: { points: TelemetryPoint[] }) {
  const max = Math.max(...points.map((p) => p.speedKmh), 1);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Speed over time</Text>
      <View style={styles.chart}>
        {points.map((p, i) => {
          const height = Math.max(8, (p.speedKmh / max) * 100);
          return (
            <View key={`${p.timestamp}-${i}`} style={styles.barCol}>
              <View style={[styles.bar, { height }]} />
            </View>
          );
        })}
      </View>
      <View style={styles.axis}>
        <Text style={styles.axisText}>0</Text>
        <Text style={styles.axisText}>{Math.round(max)} km/h</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.slateMuted,
  },
  chart: {
    height: 110,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  barCol: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    backgroundColor: theme.colors.primary,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  axisText: {
    fontSize: 11,
    color: theme.colors.slateMuted,
  },
});
