import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { AlertCard } from '@/src/components/AlertCard';
import { useTelemetry } from '@/src/context/TelemetryContext';
import { theme } from '@/src/theme';

export default function AlertsScreen() {
  const { events, setFocusEvent } = useTelemetry();
  const router = useRouter();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Safety alerts</Text>
      <Text style={styles.sub}>
        AI warnings, auto-brake events, and crash / 911 protocol from the on-vehicle QNX
        unit.
      </Text>
      {events.map((event) => (
        <AlertCard
          key={event.id}
          event={event}
          onPress={() => {
            setFocusEvent(event);
            router.push('/');
          }}
        />
      ))}
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
});
