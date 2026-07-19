import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/src/theme';
import type { TelemetryPoint } from '@/src/types/device';

export function RideChart({ points }: { points: TelemetryPoint[] }) {
  const max = Math.max(...points.map((p) => p.speedKmh), 1);

  return (
    <View style={styles.wrap}>
      <View style={styles.chart}>
        {points.map((p, i) => {
          const ratio = p.speedKmh / max;
          const height = Math.max(6, ratio * 100);
          const color = ratio > 0.75 ? theme.colors.red : theme.colors.inkFaint;
          return (
            <View key={`${p.timestamp}-${i}`} style={styles.barCol}>
              <View style={[styles.bar, { height, backgroundColor: color }]} />
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
    paddingTop: 12,
    gap: 6,
  },
  chart: {
    height: 96,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  barCol: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  axisText: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    color: theme.colors.inkFaint,
  },
});
