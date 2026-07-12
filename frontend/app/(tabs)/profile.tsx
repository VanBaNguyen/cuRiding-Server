import { StyleSheet, Text, View } from 'react-native';

import { StatusChip } from '@/src/components/StatusChip';
import { useTelemetry } from '@/src/context/TelemetryContext';
import { theme } from '@/src/theme';

export default function ProfileScreen() {
  const { device, live } = useTelemetry();

  return (
    <View style={styles.screen}>
      <Text style={styles.heading}>Device & rider</Text>
      <Text style={styles.sub}>CuRiding safety unit paired to this phone.</Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Rider</Text>
          <StatusChip status={live.status} />
        </View>
        <Text style={styles.value}>{device.riderName}</Text>

        <Text style={styles.label}>Device</Text>
        <Text style={styles.value}>{device.name}</Text>
        <Text style={styles.mono}>{device.id}</Text>

        <Text style={styles.label}>Hardware</Text>
        <Text style={styles.body}>{device.hardware}</Text>

        <Text style={styles.label}>Pairing</Text>
        <Text style={[styles.value, { color: theme.colors.success }]}>
          {device.paired ? 'Paired (mock)' : 'Not paired'}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>On-vehicle stack</Text>
        <Text style={styles.body}>
          Raspberry Pi 5 runs vision AI on Camera Module 3. QNX handles hard real-time
          decisions: auto-brake on risk, and 911 contact after a violent crash. This app
          monitors GPS, speed, and safety events.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    gap: 12,
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.slate,
  },
  sub: {
    fontSize: 14,
    color: theme.colors.slateMuted,
    marginBottom: 4,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.slateMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.slate,
  },
  mono: {
    fontSize: 13,
    color: theme.colors.slateMuted,
    fontFamily: 'SpaceMono',
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.slate,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.slate,
    marginBottom: 4,
  },
});
