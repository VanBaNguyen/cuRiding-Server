import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/src/theme';
import type { SafetyEvent, SafetyEventType } from '@/src/types/device';

const typeMeta: Record<
  SafetyEventType,
  { label: string; color: string; bg: string }
> = {
  crash: { label: 'Crash', color: theme.colors.danger, bg: theme.colors.emergencyBg },
  auto_brake: { label: 'Auto-brake', color: theme.colors.braking, bg: theme.colors.brakingBg },
  ai_warning: { label: 'AI warning', color: theme.colors.warning, bg: theme.colors.warningBg },
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
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
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.85 : 1 }]}>
      <View style={[styles.badge, { backgroundColor: meta.bg }]}>
        <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
      </View>
      <Text style={styles.title}>{event.title}</Text>
      <Text style={styles.message}>{event.message}</Text>
      <View style={styles.footer}>
        <Text style={styles.time}>{formatWhen(event.timestamp)}</Text>
        {event.emergencyCalled ? (
          <Text style={styles.emergency}>Emergency called</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.slate,
  },
  message: {
    fontSize: 14,
    color: theme.colors.slateMuted,
    lineHeight: 20,
  },
  footer: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  time: {
    fontSize: 12,
    color: theme.colors.slateMuted,
  },
  emergency: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.danger,
  },
});
