import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { RideChart } from '@/src/components/RideChart';
import { useTelemetry } from '@/src/context/TelemetryContext';
import { theme } from '@/src/theme';
import type { Ride } from '@/src/types/device';

function formatRideDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function RideCard({
  ride,
  selected,
  onPress,
}: {
  ride: Ride;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, selected && styles.cardSelected]}>
      <Text style={styles.cardTitle}>{formatRideDate(ride.startedAt)}</Text>
      <View style={styles.stats}>
        <Stat label="Duration" value={`${ride.durationMin} min`} />
        <Stat label="Distance" value={`${ride.distanceKm} km`} />
        <Stat label="Avg" value={`${ride.avgSpeedKmh} km/h`} />
        <Stat label="Max" value={`${ride.maxSpeedKmh} km/h`} />
      </View>
      {selected ? <RideChart points={ride.points} /> : null}
    </Pressable>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export default function HistoryScreen() {
  const { rides } = useTelemetry();
  const [selectedId, setSelectedId] = useState<string | null>(rides[0]?.id ?? null);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Ride history</Text>
      <Text style={styles.sub}>Speed and distance from the CuRiding unit (mock data).</Text>
      {rides.map((ride) => (
        <RideCard
          key={ride.id}
          ride={ride}
          selected={selectedId === ride.id}
          onPress={() => setSelectedId(selectedId === ride.id ? null : ride.id)}
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
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
  },
  cardSelected: {
    borderColor: theme.colors.primary,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.slate,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  stat: {
    minWidth: '45%',
    flexGrow: 1,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.slateMuted,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.slate,
  },
});
