import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { LIVE_PATH, MOCK_DEVICE, MOCK_EVENTS, MOCK_RIDES } from '@/src/data/mockTelemetry';
import type {
  DeviceInfo,
  DeviceStatus,
  LiveState,
  Ride,
  SafetyEvent,
  TelemetryPoint,
} from '@/src/types/device';

interface TelemetryContextValue {
  live: LiveState;
  rides: Ride[];
  events: SafetyEvent[];
  device: DeviceInfo;
  trail: TelemetryPoint[];
  focusEvent: SafetyEvent | null;
  setFocusEvent: (event: SafetyEvent | null) => void;
}

const TelemetryContext = createContext<TelemetryContextValue | null>(null);

function statusForIndex(index: number): DeviceStatus {
  // Periodically surface demo states along the loop
  const phase = index % LIVE_PATH.length;
  if (phase === 8) return 'emergency';
  if (phase === 5 || phase === 12) return 'braking';
  if (phase === 3 || phase === 10) return 'ai_warning';
  return 'online';
}

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const [pathIndex, setPathIndex] = useState(0);
  const [focusEvent, setFocusEvent] = useState<SafetyEvent | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setPathIndex((i) => (i + 1) % LIVE_PATH.length);
    }, 2200);
    return () => clearInterval(id);
  }, []);

  const live = useMemo<LiveState>(() => {
    const point = LIVE_PATH[pathIndex];
    const now = new Date().toISOString();
    return {
      pathIndex,
      status: statusForIndex(pathIndex),
      lastUpdated: now,
      position: {
        ...point,
        timestamp: now,
      },
    };
  }, [pathIndex]);

  const trail = useMemo(
    () =>
      LIVE_PATH.slice(0, pathIndex + 1).map((p, i) => ({
        ...p,
        timestamp: new Date(Date.now() - (pathIndex - i) * 2200).toISOString(),
      })),
    [pathIndex],
  );

  const value = useMemo(
    () => ({
      live,
      rides: MOCK_RIDES,
      events: MOCK_EVENTS,
      device: MOCK_DEVICE,
      trail,
      focusEvent,
      setFocusEvent,
    }),
    [live, trail, focusEvent],
  );

  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>;
}

export function useTelemetry() {
  const ctx = useContext(TelemetryContext);
  if (!ctx) {
    throw new Error('useTelemetry must be used within TelemetryProvider');
  }
  return ctx;
}
