import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

export type UserLocation = {
  lat: number;
  lng: number;
};

export type LocationPermission = 'granted' | 'denied' | 'undetermined';

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [permission, setPermission] = useState<LocationPermission>('undetermined');

  const requestPermission = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    const granted = status === Location.PermissionStatus.GRANTED;
    setPermission(granted ? 'granted' : 'denied');
    return granted;
  }, []);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    const start = async () => {
      const granted = await requestPermission();
      if (!granted || cancelled) return;

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (cancelled) return;

      setLocation({
        lat: current.coords.latitude,
        lng: current.coords.longitude,
      });

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 8,
          timeInterval: 4000,
        },
        (update) => {
          setLocation({
            lat: update.coords.latitude,
            lng: update.coords.longitude,
          });
        },
      );
    };

    start();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [requestPermission]);

  return { location, permission, requestPermission };
};
