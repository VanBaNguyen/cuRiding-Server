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
    alignItems: 'flex-end',
  },
  value: {
    fontFamily: theme.fonts.mono,
    color: theme.colors.ink,
    fontSize: 28,
    lineHeight: 30,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  unit: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.colors.redBright,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
