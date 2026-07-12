import { useEffect, useRef } from 'react';
import { Animated, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTelemetry } from '@/src/context/TelemetryContext';
import { theme } from '@/src/theme';

const COUNTDOWN_TOTAL = 30;

export function CrashCountdown() {
  const { crashCountdown, dismissCrashCountdown, triggerEmergencyCall, emergencyNumber } =
    useTelemetry();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!crashCountdown.active) return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [crashCountdown.active, pulseAnim]);

  // Auto-dial when countdown reaches 0
  useEffect(() => {
    if (crashCountdown.active && crashCountdown.secondsLeft <= 0) {
      dialEmergency();
    }
  }, [crashCountdown.secondsLeft, crashCountdown.active]);

  const dialEmergency = () => {
    triggerEmergencyCall();
    const phoneUrl = Platform.select({
      ios: `tel:${emergencyNumber}`,
      android: `tel:${emergencyNumber}`,
      default: `tel:${emergencyNumber}`,
    });
    Linking.openURL(phoneUrl).catch((err) =>
      console.error('Failed to open dialer:', err),
    );
  };

  if (!crashCountdown.active) return null;

  const progress = crashCountdown.secondsLeft / COUNTDOWN_TOTAL;

  return (
    <View style={styles.overlay}>
      <View style={styles.content}>
        <Text style={styles.title}>⚠️ CRASH DETECTED</Text>
        <Text style={styles.subtitle}>
          Emergency services will be contacted in
        </Text>

        <Animated.View
          style={[
            styles.countdownCircle,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <View style={styles.countdownInner}>
            <Text style={styles.countdownNumber}>
              {crashCountdown.secondsLeft}
            </Text>
            <Text style={styles.countdownLabel}>seconds</Text>
          </View>
          {/* Progress ring via border trick */}
          <View
            style={[
              styles.progressRing,
              {
                borderColor:
                  progress > 0.5
                    ? 'rgba(255,255,255,0.3)'
                    : 'rgba(255,80,80,0.8)',
              },
            ]}
          />
        </Animated.View>

        <Text style={styles.callingText}>
          Calling: {emergencyNumber}
        </Text>

        <Pressable
          onPress={dismissCrashCountdown}
          style={({ pressed }) => [
            styles.okButton,
            pressed && styles.okButtonPressed,
          ]}
        >
          <Text style={styles.okButtonText}>I'm OK — Cancel</Text>
        </Pressable>

        <Pressable
          onPress={dialEmergency}
          style={({ pressed }) => [
            styles.callNowButton,
            pressed && styles.callNowButtonPressed,
          ]}
        >
          <Text style={styles.callNowButtonText}>Call Now</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(120, 10, 26, 0.97)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 22,
  },
  countdownCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
  },
  countdownInner: {
    alignItems: 'center',
  },
  countdownNumber: {
    fontFamily: theme.fonts.mono,
    fontSize: 60,
    color: '#FFFFFF',
    lineHeight: 68,
  },
  countdownLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    marginTop: -4,
  },
  progressRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 80,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  callingText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
  },
  okButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 50,
    marginTop: 8,
    minWidth: 240,
    alignItems: 'center',
  },
  okButtonPressed: {
    opacity: 0.85,
  },
  okButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.redDeep,
  },
  callNowButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    minWidth: 240,
    alignItems: 'center',
  },
  callNowButtonPressed: {
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  callNowButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
