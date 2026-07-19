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
    <View style={styles.screen}>
      {events.length > 0 ? (
        <View style={styles.toolbar}>
          <Text style={styles.count}>
            {events.length} {events.length === 1 ? 'event' : 'events'}
          </Text>
          <Pressable onPress={handleClearHistory} hitSlop={8}>
            <Text style={styles.clear}>Clear</Text>
          </Pressable>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.content}>
        {events.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>All clear</Text>
            <Text style={styles.emptyBody}>
              Crash, rider alerts, and device events from the unit appear here as they happen.
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  count: {
    fontFamily: theme.fonts.mono,
    fontSize: 12,
    color: theme.colors.inkMuted,
  },
  clear: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.redBright,
  },
  content: {
    paddingBottom: 24,
  },
  empty: {
    paddingHorizontal: 18,
    paddingTop: 48,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.inkMuted,
    maxWidth: 300,
  },
});
