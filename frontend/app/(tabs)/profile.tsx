import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTelemetry } from '@/src/context/TelemetryContext';
import { statusColors, statusLabels, theme } from '@/src/theme';
import type { DeviceStatus } from '@/src/types/device';
function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, mono && styles.mono]}>{value}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { device, live, deviceStatus, emergencyNumber, setEmergencyNumber, simulateCrash } =
    useTelemetry();
  const statusColor = statusColors[live.status] ?? theme.colors.inkMuted;
  const statusLabel = statusLabels[live.status as DeviceStatus] ?? live.status;

  const handleCallEmergency = () => {
    Linking.openURL(`tel:${emergencyNumber}`).catch((err) =>
      console.error('Failed to open dialer:', err),
    );
  };

  const handleSimulateCrash = () => {
    Alert.alert(
      'Simulate crash',
      'Start the 30-second emergency countdown? Same flow as a real detected crash.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Simulate', style: 'destructive', onPress: simulateCrash },
      ],
    );
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <View style={styles.hero}>
        <Text style={styles.rider}>{device.riderName}</Text>
        <View style={styles.unitLine}>
          <View style={[styles.dot, { backgroundColor: statusColor }]} />
          <Text style={styles.unitText}>
            {device.name} · {statusLabel}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Emergency number</Text>
        <Text style={styles.sectionHint}>
          Dialed automatically if a crash countdown expires without cancellation.
        </Text>
        <View style={styles.phoneRow}>
          <TextInput
            style={styles.phoneInput}
            value={emergencyNumber}
            onChangeText={setEmergencyNumber}
            keyboardType="phone-pad"
            placeholder="911"
            placeholderTextColor={theme.colors.inkFaint}
          />
          <Pressable onPress={handleCallEmergency} hitSlop={8}>
            <Text style={styles.callLink}>Call</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Live status</Text>
        <InfoRow
          label="Heartbeat"
          value={
            deviceStatus.heartbeatAgeSeconds == null
              ? 'No heartbeat yet'
              : `${Math.round(deviceStatus.heartbeatAgeSeconds)}s ago · seq ${deviceStatus.heartbeatSeq ?? '—'}`
          }
          mono
        />
        <InfoRow
          label="Position fix"
          value={
            deviceStatus.positionAgeSeconds == null
              ? 'No fix yet'
              : `${Math.round(deviceStatus.positionAgeSeconds)}s ago`
          }
          mono
        />
        {deviceStatus.activeAlert ? (
          <InfoRow label="Active alert" value={deviceStatus.activeAlert} />
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Unit</Text>
        <InfoRow label="Hardware" value={device.hardware} />
        <InfoRow label="ID" value={device.id} mono />
        <InfoRow label="Pairing" value={device.paired ? 'Paired' : 'Not paired'} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Testing</Text>
        <Text style={styles.sectionHint}>
          Demo the crash detection flow without waiting for a real disconnect.
        </Text>
        <Pressable
          onPress={handleSimulateCrash}
          style={({ pressed }) => [styles.simulateButton, pressed && styles.simulateButtonPressed]}>
          <Text style={styles.simulateButtonText}>Simulate crash</Text>
        </Pressable>
      </View>

      <Text style={styles.footnote}>
        Position comes from the Find My tag. Heartbeats (~1 Hz) from the Pi drive crash
        detection and rider alerts. This app tracks live GPS, speed, camera, and safety events.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingBottom: 32,
  },
  hero: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 6,
  },
  rider: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.ink,
    letterSpacing: -0.3,
  },
  unitLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  unitText: {
    fontSize: 14,
    color: theme.colors.inkMuted,
  },
  section: {
    paddingHorizontal: 18,
    paddingTop: 20,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: theme.colors.red,
  },
  sectionHint: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.inkMuted,
    marginTop: -4,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: 8,
  },
  phoneInput: {
    flex: 1,
    fontFamily: theme.fonts.mono,
    fontSize: 24,
    color: theme.colors.ink,
    paddingVertical: 4,
  },
  callLink: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.redBright,
  },
  infoRow: {
    gap: 2,
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 11,
    color: theme.colors.inkFaint,
  },
  infoValue: {
    fontSize: 15,
    color: theme.colors.ink,
    lineHeight: 20,
  },
  mono: {
    fontFamily: theme.fonts.mono,
    fontSize: 13,
    color: theme.colors.inkMuted,
  },
  simulateButton: {
    marginTop: 4,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.red,
    backgroundColor: theme.colors.emergencyBg,
    alignItems: 'center',
  },
  simulateButtonPressed: {
    opacity: 0.8,
  },
  simulateButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.redBright,
    letterSpacing: 0.2,
  },
  footnote: {
    paddingHorizontal: 18,
    paddingTop: 16,
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.inkFaint,
  },
});
