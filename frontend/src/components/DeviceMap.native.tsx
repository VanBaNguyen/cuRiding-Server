import { useEffect, useRef } from 'react';
import { Platform, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

import { OTTAWA_REGION } from '@/src/data/mockTelemetry';
import { theme } from '@/src/theme';

import type { DeviceMapProps } from './DeviceMap.types';

export default function DeviceMap({
  position,
  trail,
  status,
  focusEvent,
  onFocusHandled,
}: DeviceMapProps) {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (!focusEvent || !mapRef.current) return;
    mapRef.current.animateToRegion(
      {
        latitude: focusEvent.lat,
        longitude: focusEvent.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      600,
    );
    onFocusHandled();
  }, [focusEvent, onFocusHandled]);

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      initialRegion={OTTAWA_REGION}
      showsUserLocation={false}
      showsCompass>
      <Polyline
        coordinates={trail.map((p) => ({ latitude: p.lat, longitude: p.lng }))}
        strokeColor={theme.colors.primary}
        strokeWidth={4}
      />
      <Marker
        coordinate={{
          latitude: position.lat,
          longitude: position.lng,
        }}
        title="CuRiding device"
        description={`${Math.round(position.speedKmh)} km/h · ${status}`}
        pinColor={theme.colors.primary}
      />
    </MapView>
  );
}
