import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, type ComponentProps } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

import { darkMapStyle, MAP_EDGE_PADDING } from '@/src/components/map/darkMapStyle';
import { theme } from '@/src/theme';
import { toMapCoord } from '@/src/utils/geo';

import type { DeviceMapProps } from './DeviceMap.types';

const DEFAULT_REGION = {
  latitude: 45.4215,
  longitude: -75.6972,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const DEVICE_REGION = {
  latitudeDelta: 0.012,
  longitudeDelta: 0.012,
};

type RecenterMode = 'both' | 'you' | 'unit';

function DeviceMarker({ speedKmh }: { speedKmh: number }) {
  return (
    <View style={markerStyles.wrap}>
      <View style={markerStyles.ring} />
      <View style={markerStyles.core}>
        <Ionicons name="bicycle" size={16} color={theme.colors.white} />
      </View>
      <View style={markerStyles.tag}>
        <Text style={markerStyles.tagText}>{Math.round(speedKmh)}</Text>
      </View>
    </View>
  );
}

export default function DeviceMap({
  position,
  trail,
  status,
  focusEvent,
  onFocusHandled,
  userLocation,
  locationPermission,
  onRequestLocation,
}: DeviceMapProps) {
  const mapRef = useRef<MapView>(null);
  const hasInitialFitRef = useRef(false);
  const hasFix = position.lat !== 0 || position.lng !== 0;
  const hasUser = userLocation != null;

  const getCoords = useCallback(() => {
    const coords = [];
    if (hasUser && userLocation) coords.push(toMapCoord(userLocation));
    if (hasFix) coords.push(toMapCoord(position));
    return coords;
  }, [hasFix, hasUser, position, userLocation]);

  const centerOn = useCallback(
    (mode: RecenterMode) => {
      if (!mapRef.current) return;

      if (mode === 'both') {
        const coords = getCoords();
        if (coords.length >= 2) {
          mapRef.current.fitToCoordinates(coords, {
            edgePadding: MAP_EDGE_PADDING,
            animated: true,
          });
          return;
        }
      }

      if (mode === 'you' && hasUser && userLocation) {
        mapRef.current.animateToRegion(
          { ...toMapCoord(userLocation), ...DEVICE_REGION },
          500,
        );
        return;
      }

      if (hasFix) {
        mapRef.current.animateToRegion(
          { ...toMapCoord(position), ...DEVICE_REGION },
          500,
        );
      }
    },
    [getCoords, hasFix, hasUser, position, userLocation],
  );

  // First time we have enough data, frame both you and the unit.
  useEffect(() => {
    if (hasInitialFitRef.current || !mapRef.current) return;

    const coords = getCoords();
    if (coords.length >= 2) {
      hasInitialFitRef.current = true;
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: MAP_EDGE_PADDING,
        animated: true,
      });
      return;
    }

    if (hasFix && !hasUser) {
      hasInitialFitRef.current = true;
      mapRef.current.animateToRegion(
        { ...toMapCoord(position), ...DEVICE_REGION },
        600,
      );
    }
  }, [getCoords, hasFix, hasUser, position]);

  useEffect(() => {
    if (!focusEvent || !mapRef.current) return;
    mapRef.current.animateToRegion(
      {
        latitude: focusEvent.lat,
        longitude: focusEvent.lng,
        ...DEVICE_REGION,
      },
      600,
    );
    onFocusHandled();
  }, [focusEvent, onFocusHandled]);

  const trailCoords = trail.map((p) => toMapCoord(p));

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        customMapStyle={Platform.OS === 'android' ? darkMapStyle : undefined}
        userInterfaceStyle="dark"
        initialRegion={
          hasFix
            ? { ...toMapCoord(position), ...DEVICE_REGION }
            : hasUser && userLocation
              ? { ...toMapCoord(userLocation), ...DEVICE_REGION }
              : DEFAULT_REGION
        }
        showsUserLocation={locationPermission === 'granted'}
        showsMyLocationButton={false}
        showsCompass
        showsBuildings={false}
        toolbarEnabled={false}>
        {trailCoords.length > 1 ? (
          <>
            <Polyline
              coordinates={trailCoords}
              strokeColor="rgba(200,16,46,0.18)"
              strokeWidth={8}
            />
            <Polyline
              coordinates={trailCoords}
              strokeColor={theme.colors.red}
              strokeWidth={4}
            />
          </>
        ) : null}

        {hasUser && hasFix && userLocation ? (
          <Polyline
            coordinates={[toMapCoord(userLocation), toMapCoord(position)]}
            strokeColor="rgba(244,244,245,0.28)"
            strokeWidth={2}
            lineDashPattern={[10, 8]}
          />
        ) : null}

        {hasFix ? (
          <Marker
            coordinate={toMapCoord(position)}
            anchor={{ x: 0.5, y: 0.5 }}
            title="CuRiding unit"
            description={`${Math.round(position.speedKmh)} km/h · ${status}`}>
            <DeviceMarker speedKmh={position.speedKmh} />
          </Marker>
        ) : null}
      </MapView>

      <View style={styles.controls} pointerEvents="box-none">
        {locationPermission === 'denied' ? (
          <Pressable
            onPress={onRequestLocation}
            style={({ pressed }) => [styles.permissionChip, pressed && styles.controlPressed]}>
            <Ionicons name="location-outline" size={14} color={theme.colors.redBright} />
            <Text style={styles.permissionText}>Enable location</Text>
          </Pressable>
        ) : (
          <>
            <MapControl icon="scan-outline" onPress={() => centerOn('both')} disabled={!hasUser || !hasFix} />
            <MapControl icon="locate-outline" onPress={() => centerOn('you')} disabled={!hasUser} />
            <MapControl icon="bicycle-outline" onPress={() => centerOn('unit')} disabled={!hasFix} />
          </>
        )}
      </View>
    </View>
  );
}

function MapControl({
  icon,
  onPress,
  disabled,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.control,
        disabled && styles.controlDisabled,
        pressed && !disabled && styles.controlPressed,
      ]}>
      <Ionicons
        name={icon}
        size={22}
        color={disabled ? theme.colors.inkFaint : theme.colors.ink}
        style={styles.controlIcon}
      />
    </Pressable>
  );
}

const markerStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 56,
  },
  ring: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(200,16,46,0.22)',
  },
  core: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.red,
    borderWidth: 2,
    borderColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tag: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tagText: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    color: theme.colors.ink,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  controls: {
    position: 'absolute',
    right: 14,
    top: '38%',
    gap: 8,
  },
  control: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlIcon: {
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  controlDisabled: {
    opacity: 0.35,
  },
  controlPressed: {
    opacity: 0.65,
  },
  permissionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  permissionText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.redBright,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
