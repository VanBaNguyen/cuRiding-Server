import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AlertCard } from '@/src/components/AlertCard';
import { useTelemetry } from '@/src/context/TelemetryContext';
import { theme } from '@/src/theme';

export default function AlertsScreen() {
  const { events, setFocusEvent, clearEvents } = useTelemetry();
  const router = useRouter();

  const handleClearHistory = () => {
    Alert.alert(
      'Clear alert history',
      'Are you sure you want to clear all safety alerts? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: clearEvents },
      ],
    );
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.heading}>Safety alerts</Text>
          <Text style={styles.sub}>
            AI warnings, auto-brake events, and crash protocol from the on-vehicle QNX unit.
          </Text>
        </View>
        {events.length > 0 ? (
          <Pressable
            onPress={handleClearHistory}
            style={({ pressed }) => [styles.clearButton, pressed && styles.clearButtonPressed]}
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </Pressable>
        ) : null}
      </View>

      {events.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>✓</Text>
          <Text style={styles.emptyTitle}>No alerts</Text>
          <Text style={styles.emptyBody}>
            Safety events from the QNX unit will appear here in real time.
          </Text>
        </View>
      ) : (
        events.map((event) => (
          <AlertCard
            key={event.id}
            event={event}
            onPress={() => {
              setFocusEvent(event);
              router.push('/');
            }}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.md,
    gap: 12,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerText: {
    flex: 1,
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
    lineHeight: 20,
  },
  clearButton: {
    backgroundColor: theme.colors.emergencyBg,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.danger,
    marginTop: 2,
  },
  clearButtonPressed: {
    opacity: 0.7,
  },
  clearButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.danger,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 40,
    color: theme.colors.success,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.slate,
  },
  emptyBody: {
    fontSize: 14,
    color: theme.colors.slateMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
});
