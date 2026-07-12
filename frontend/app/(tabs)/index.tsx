import { StyleSheet, Text, View } from 'react-native';

import DeviceMap from '@/src/components/DeviceMap';
import { SpeedBadge } from '@/src/components/SpeedBadge';
import { StatusChip } from '@/src/components/StatusChip';
import { useTelemetry } from '@/src/context/TelemetryContext';
import { theme } from '@/src/theme';

export default function LiveMapScreen() {
  const { live, trail, focusEvent, setFocusEvent } = useTelemetry();
  const showEmergencyBanner = live.status === 'emergency';

  return (
    <View style={styles.container}>
      <DeviceMap
        position={live.position}
        trail={trail}
        status={live.status}
        focusEvent={focusEvent}
        onFocusHandled={() => setFocusEvent(null)}
      />

      <View style={styles.overlay}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.brand}>CuRiding</Text>
            <Text style={styles.sub}>Ottawa · live device</Text>
          </View>
          <StatusChip status={live.status} />
        </View>

        {showEmergencyBanner ? (
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>Emergency protocol active</Text>
            <Text style={styles.bannerBody}>
              Violent crash simulated — QNX would contact 911 with this GPS fix.
            </Text>
          </View>
        ) : null}

        <View style={styles.bottomCard}>
          <SpeedBadge speedKmh={live.position.speedKmh} />
          <View style={styles.meta}>
            <Text style={styles.metaLabel}>Last updated</Text>
            <Text style={styles.metaValue}>
              {new Date(live.lastUpdated).toLocaleTimeString()}
            </Text>
            <Text style={styles.metaLabel}>Coordinates</Text>
            <Text style={styles.metaValue}>
              {live.position.lat.toFixed(5)}, {live.position.lng.toFixed(5)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    pointerEvents: 'box-none',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: theme.radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  brand: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  sub: {
    fontSize: 12,
    color: theme.colors.slateMuted,
    marginTop: 2,
  },
  banner: {
    marginTop: 10,
    backgroundColor: theme.colors.emergencyBg,
    borderRadius: theme.radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.danger,
  },
  bannerTitle: {
    fontWeight: '800',
    color: theme.colors.danger,
    marginBottom: 4,
  },
  bannerBody: {
    color: theme.colors.slate,
    fontSize: 13,
    lineHeight: 18,
  },
  bottomCard: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: theme.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  meta: {
    flex: 1,
    gap: 2,
  },
  metaLabel: {
    fontSize: 11,
    color: theme.colors.slateMuted,
    fontWeight: '600',
    marginTop: 4,
  },
  metaValue: {
    fontSize: 14,
    color: theme.colors.slate,
    fontWeight: '600',
  },
});
