import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/src/theme';
import type { SafetyEvent, SafetyEventType } from '@/src/types/device';

const typeMeta: Record<SafetyEventType, { label: string; color: string }> = {
  crash: { label: 'Crash', color: theme.colors.danger },
  custom: { label: 'Rider alert', color: theme.colors.warning },
  low_battery: { label: 'Low battery', color: theme.colors.warning },
  geofence_exit: { label: 'Geofence', color: theme.colors.warning },
  device_offline: { label: 'Offline', color: theme.colors.inkMuted },
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function AlertCard({
  event,
  onPress,
}: {
  event: SafetyEvent;
  onPress?: () => void;
}) {
  const meta = typeMeta[event.type];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={[styles.marker, { backgroundColor: meta.color }]} />
      <View style={styles.body}>
        <View style={styles.topLine}>
          <Text style={[styles.type, { color: meta.color }]}>{meta.label}</Text>
          <Text style={styles.time}>{formatWhen(event.timestamp)}</Text>
        </View>
        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.message} numberOfLines={2}>
          {event.message}
        </Text>
        <View style={styles.footer}>
          {event.emergencyCalled ? (
            <Text style={styles.emergency}>911 called</Text>
          ) : (
            <Text style={styles.action}>View on map</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: 14,
    paddingRight: 18,
  },
  rowPressed: {
    opacity: 0.75,
  },
  marker: {
    width: 3,
    marginRight: 14,
    borderRadius: 1,
  },
  body: {
    flex: 1,
    gap: 3,
  },
  topLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
  },
  type: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  time: {
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    color: theme.colors.inkFaint,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.inkMuted,
  },
  footer: {
    marginTop: 2,
  },
  emergency: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.redBright,
  },
  action: {
    fontSize: 11,
    color: theme.colors.inkFaint,
  },
});
