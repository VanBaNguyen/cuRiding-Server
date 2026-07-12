import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { StatusChip } from '@/src/components/StatusChip';
import { useTelemetry } from '@/src/context/TelemetryContext';
import { theme } from '@/src/theme';

export default function ProfileScreen() {
  const { device, live, emergencyNumber, setEmergencyNumber } = useTelemetry();

  const handleCallEmergency = () => {
    const phoneUrl = Platform.select({
      ios: `tel:${emergencyNumber}`,
      android: `tel:${emergencyNumber}`,
      default: `tel:${emergencyNumber}`,
    });
    Linking.openURL(phoneUrl).catch((err) =>
      console.error('Failed to open dialer:', err),
    );
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
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
        <Text style={[styles.value, { color: device.paired ? theme.colors.success : theme.colors.danger }]}>
          {device.paired ? 'Paired' : 'Not paired'}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Emergency contact</Text>
        <Text style={styles.body}>
          This number will be dialed automatically if a crash is detected and
          the 30-second countdown expires without cancellation.
        </Text>
        <View style={styles.emergencyRow}>
          <TextInput
            style={styles.emergencyInput}
            value={emergencyNumber}
            onChangeText={setEmergencyNumber}
            keyboardType="phone-pad"
            placeholder="911"
            placeholderTextColor={theme.colors.slateMuted}
          />
          <Pressable
            onPress={handleCallEmergency}
            style={({ pressed }) => [styles.callButton, pressed && styles.callButtonPressed]}
          >
            <Text style={styles.callButtonText}>📞 Call</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>On-vehicle stack</Text>
        <Text style={styles.body}>
          Raspberry Pi 5 runs vision AI on Camera Module 3. QNX handles hard real-time
          decisions: auto-brake on risk, and emergency contact after a violent crash. This app
          monitors GPS, speed, and safety events.
        </Text>
      </View>
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
  emergencyRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    alignItems: 'center',
  },
  emergencyInput: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.slate,
  },
  callButton: {
    backgroundColor: theme.colors.danger,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  callButtonPressed: {
    opacity: 0.8,
  },
  callButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
