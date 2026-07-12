import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CameraFeed } from '@/src/components/CameraFeed';
import { CrashCountdown } from '@/src/components/CrashCountdown';
import DeviceMap from '@/src/components/DeviceMap';
import { SpeedBadge } from '@/src/components/SpeedBadge';
import { useTelemetry } from '@/src/context/TelemetryContext';
import { useUserLocation } from '@/src/hooks/useUserLocation';
import { statusColors, statusLabels, theme } from '@/src/theme';
import type { DeviceStatus } from '@/src/types/device';
import {
  distanceKm,
  formatDistance,
  formatRelativeTime,
  trailDistanceKm,
} from '@/src/utils/geo';

function Stat({
  label,
  value,
  valueColor,
  dot,
}: {
  label: string;
  value: string;
  valueColor?: string;
  dot?: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValueRow}>
        {dot ? <View style={[styles.dot, { backgroundColor: dot }]} /> : null}
        <Text style={[styles.statValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
      </View>
    </View>
  );
}

export default function LiveMapScreen() {
  const {
    live,
    trail,
    events,
    device,
    deviceStatus,
    focusEvent,
    setFocusEvent,
    crashCountdown,
    cameraSnapshot,
    cameraConnected,
    recording,
    toggleRecording,
  } = useTelemetry();
  const { location: userLocation, permission, requestPermission } = useUserLocation();
  const [cameraExpanded, setCameraExpanded] = useState(false);
  const showEmergencyBanner = live.status === 'emergency' && !crashCountdown.active;
  const showOfflineChip =
    !showEmergencyBanner &&
    !crashCountdown.active &&
    (live.status === 'offline' || live.status === 'waiting' || !deviceStatus.online);
  const offlineChipLabel =
    live.status === 'waiting' || deviceStatus.heartbeatAgeSeconds == null
      ? 'Waiting for unit'
      : deviceStatus.crashSuspected
        ? 'Not reporting'
        : 'Offline';
  const offlineChipDetail =
    deviceStatus.heartbeatAgeSeconds != null
      ? `${Math.round(deviceStatus.heartbeatAgeSeconds)}s`
      : null;

  const hasDeviceFix = live.position.lat !== 0 || live.position.lng !== 0;
  const separation =
    userLocation && hasDeviceFix
      ? formatDistance(distanceKm(userLocation, live.position))
      : null;
  const trailKm = trailDistanceKm(trail);
  const trailLabel = trailKm < 0.1 ? `${Math.round(trailKm * 1000)} m` : `${trailKm.toFixed(1)} km`;
  const statusColor = statusColors[live.status] ?? theme.colors.inkMuted;
  const statusLabel = statusLabels[live.status as DeviceStatus] ?? live.status;

  return (
    <View style={styles.container}>
      <DeviceMap
        position={live.position}
        trail={trail}
        status={live.status}
        focusEvent={focusEvent}
        onFocusHandled={() => setFocusEvent(null)}
        userLocation={userLocation}
        locationPermission={permission}
        onRequestLocation={requestPermission}
      />

      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topBlock}>
          <View style={styles.headerBar}>
            <Text style={styles.brand}>
              Cu<Text style={styles.brandAccent}>Riding</Text>
            </Text>
            <Text style={styles.rider}>{device.riderName} · {device.name}</Text>
          </View>

          <CameraFeed
            uri={cameraSnapshot?.uri ?? null}
            connected={cameraConnected}
            ageSeconds={cameraSnapshot?.ageSeconds ?? null}
            expanded={cameraExpanded}
            onToggle={() => setCameraExpanded((v) => !v)}
          />

          <Pressable
            onPress={toggleRecording}
            style={[styles.recordChip, recording && styles.recordChipActive]}>
            <View style={[styles.recordChipDot, recording && styles.recordChipDotActive]} />
            <Text style={[styles.recordChipText, recording && styles.recordChipTextActive]}>
              {recording ? 'Recording…' : 'Record'}
            </Text>
          </Pressable>

          {showOfflineChip ? (
            <View style={styles.offlineChip}>
              <View style={styles.offlineChipDot} />
              <Text style={styles.offlineChipText}>{offlineChipLabel}</Text>
              {offlineChipDetail ? (
                <Text style={styles.offlineChipMeta}>{offlineChipDetail}</Text>
              ) : null}
            </View>
          ) : null}
        </View>

        {showEmergencyBanner ? (
          <View style={styles.emergencyStrip}>
            <Text style={styles.emergencyText}>Emergency — services contacted</Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          <View style={styles.speedCorner}>
            <SpeedBadge speedKmh={live.position.speedKmh} />
          </View>

          <View style={styles.telemetry}>
            <View style={styles.statRow}>
              <Stat
                label="Unit"
                value={statusLabel}
                valueColor={statusColor}
                dot={statusColor}
              />
              <View style={styles.divider} />
              <Stat
                label="From you"
                value={separation ?? (userLocation ? '—' : 'No GPS')}
                valueColor={separation && separation !== 'Here' ? theme.colors.redBright : undefined}
              />
              <View style={styles.divider} />
              <Stat label="Trail" value={trail.length > 1 ? trailLabel : '—'} />
              <View style={styles.divider} />
              <Stat label="Alerts" value={events.length > 0 ? String(events.length) : 'None'} />
            </View>

            <Text style={styles.meta}>
              {hasDeviceFix
                ? `Position ${formatRelativeTime(live.lastUpdated)}`
                : 'Waiting for position'}
              {deviceStatus.positionAgeSeconds != null
                ? ` · fix ${Math.round(deviceStatus.positionAgeSeconds)}s old`
                : ''}
              {hasDeviceFix
                ? ` · ${live.position.lat.toFixed(4)}, ${live.position.lng.toFixed(4)}`
                : ''}
            </Text>
          </View>
        </View>
      </View>

      <CrashCountdown />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topBlock: {
    paddingTop: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  headerBar: {
    backgroundColor: 'rgba(11,11,13,0.9)',
    borderRadius: theme.radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.red,
  },
  brand: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.2,
    color: theme.colors.ink,
  },
  brandAccent: {
    color: theme.colors.redBright,
  },
  rider: {
    marginTop: 2,
    fontSize: 12,
    color: theme.colors.inkMuted,
  },
  recordChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: 'rgba(11,11,13,0.85)',
  },
  recordChipActive: {
    borderColor: theme.colors.red,
    backgroundColor: theme.colors.emergencyBg,
  },
  recordChipDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.redBright,
  },
  recordChipDotActive: {
    borderRadius: 2,
  },
  recordChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  recordChipTextActive: {
    color: theme.colors.redBright,
  },
  emergencyStrip: {
    marginHorizontal: 18,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.emergencyBg,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.red,
  },
  emergencyText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.redBright,
  },
  offlineChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(244,183,64,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(244,183,64,0.35)',
  },
  offlineChipDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.warning,
  },
  offlineChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.warning,
  },
  offlineChipMeta: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    color: theme.colors.inkMuted,
  },
  footer: {
    position: 'relative',
  },
  speedCorner: {
    position: 'absolute',
    right: 18,
    bottom: '100%',
    marginBottom: 10,
    zIndex: 1,
  },
  telemetry: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: 'rgba(11,11,13,0.94)',
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 18,
    gap: 8,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stat: {
    flex: 1,
    gap: 3,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: theme.colors.inkMuted,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statValue: {
    fontFamily: theme.fonts.mono,
    fontSize: 14,
    color: theme.colors.ink,
  },
  divider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: theme.colors.border,
    marginHorizontal: 10,
    marginVertical: 2,
  },
  meta: {
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    color: theme.colors.inkMuted,
  },
});
