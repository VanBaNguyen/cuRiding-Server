import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/src/theme';
import { distanceKm, formatDistance } from '@/src/utils/geo';

import type { DeviceMapProps } from './DeviceMap.types';

export default function DeviceMap({
  position,
  userLocation,
  locationPermission,
  onRequestLocation,
}: DeviceMapProps) {
  const [webLocation, setWebLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (userLocation || typeof navigator === 'undefined' || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setWebLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {},
      { enableHighAccuracy: false, maximumAge: 30_000 },
    );
  }, [userLocation]);

  const you = userLocation ?? webLocation;
  const hasDeviceFix = position.lat !== 0 || position.lng !== 0;
  const separation =
    you && hasDeviceFix ? formatDistance(distanceKm(you, position)) : null;

  return (
    <View style={styles.webFallback}>
      <Text style={styles.title}>Map runs on your phone</Text>
      <Text style={styles.body}>
        Install the Android app for the live map, your location, and recenter controls.
      </Text>

      <View style={styles.readoutBlock}>
        <Text style={styles.line}>
          Unit ·{' '}
          {hasDeviceFix
            ? `${position.lat.toFixed(4)}, ${position.lng.toFixed(4)} · ${Math.round(position.speedKmh)} km/h`
            : 'waiting for fix'}
        </Text>
        <Text style={styles.line}>
          You ·{' '}
          {you
            ? `${you.lat.toFixed(4)}, ${you.lng.toFixed(4)}`
            : locationPermission === 'denied'
              ? 'location denied'
              : 'locating…'}
        </Text>
        {separation ? <Text style={styles.separation}>{separation} apart</Text> : null}
      </View>

      {locationPermission === 'denied' && onRequestLocation ? (
        <Pressable onPress={onRequestLocation}>
          <Text style={styles.link}>Enable location</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  webFallback: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: theme.colors.background,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.ink,
  },
  body: {
    fontSize: 14,
    color: theme.colors.inkMuted,
    lineHeight: 20,
    maxWidth: 340,
  },
  readoutBlock: {
    marginTop: 8,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 14,
  },
  line: {
    fontFamily: theme.fonts.mono,
    fontSize: 13,
    color: theme.colors.ink,
    lineHeight: 18,
  },
  separation: {
    fontFamily: theme.fonts.mono,
    fontSize: 13,
    color: theme.colors.redBright,
  },
  link: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.redBright,
  },
});
