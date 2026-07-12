import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/src/theme';

import type { DeviceMapProps } from './DeviceMap.types';

export default function DeviceMap({ position }: DeviceMapProps) {
  return (
    <View style={styles.webFallback}>
      <Text style={styles.webTitle}>Live map</Text>
      <Text style={styles.webBody}>
        Open this project on iOS or Android (Expo Go) to see the Ottawa map. Live mock position:{' '}
        {position.lat.toFixed(4)}, {position.lng.toFixed(4)} · {Math.round(position.speedKmh)} km/h
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  webFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: theme.colors.background,
  },
  webTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.slate,
    marginBottom: 8,
  },
  webBody: {
    textAlign: 'center',
    color: theme.colors.slateMuted,
    lineHeight: 22,
  },
});
