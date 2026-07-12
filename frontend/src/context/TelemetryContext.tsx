import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { MOCK_DEVICE } from '@/src/data/mockTelemetry';
import type {
  DeviceInfo,
  DeviceStatus,
  LiveState,
  Ride,
  SafetyEvent,
  TelemetryPoint,
} from '@/src/types/device';

export interface CrashCountdownState {
  active: boolean;
  secondsLeft: number;
  event: SafetyEvent | null;
}

interface TelemetryContextValue {
  live: LiveState;
  rides: Ride[];
  events: SafetyEvent[];
  device: DeviceInfo;
  trail: TelemetryPoint[];
  focusEvent: SafetyEvent | null;
  setFocusEvent: (event: SafetyEvent | null) => void;
  clearEvents: () => void;
  emergencyNumber: string;
  setEmergencyNumber: (num: string) => void;
  crashCountdown: CrashCountdownState;
  dismissCrashCountdown: () => void;
  triggerEmergencyCall: () => void;
  simulateCrash: () => void;
}

const TelemetryContext = createContext<TelemetryContextValue | null>(null);

const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:8000';

const DEFAULT_POSITION: TelemetryPoint = {
  lat: 0,
  lng: 0,
  speedKmh: 0,
  timestamp: new Date().toISOString(),
  accelMagnitude: 0,
};

const CRASH_COUNTDOWN_SECONDS = 30;

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const [live, setLive] = useState<LiveState>({
    position: DEFAULT_POSITION,
    status: 'offline',
    pathIndex: 0,
    lastUpdated: new Date().toISOString(),
  });
  const [trail, setTrail] = useState<TelemetryPoint[]>([]);
  const [events, setEvents] = useState<SafetyEvent[]>([]);
  const [focusEvent, setFocusEvent] = useState<SafetyEvent | null>(null);
  const [emergencyNumber, setEmergencyNumber] = useState('911');
  const [crashCountdown, setCrashCountdown] = useState<CrashCountdownState>({
    active: false,
    secondsLeft: CRASH_COUNTDOWN_SECONDS,
    event: null,
  });

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearCountdownTimer = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const dismissCrashCountdown = useCallback(() => {
    clearCountdownTimer();
    setCrashCountdown({ active: false, secondsLeft: CRASH_COUNTDOWN_SECONDS, event: null });
  }, [clearCountdownTimer]);

  const triggerEmergencyCall = useCallback(() => {
    clearCountdownTimer();
    // Mark the event as emergency-called
    setCrashCountdown((prev) => {
      if (prev.event) {
        setEvents((evts) =>
          evts.map((e) => (e.id === prev.event!.id ? { ...e, emergencyCalled: true } : e)),
        );
      }
      return { active: false, secondsLeft: CRASH_COUNTDOWN_SECONDS, event: null };
    });
  }, [clearCountdownTimer]);

  const startCrashCountdown = useCallback(
    (event: SafetyEvent) => {
      clearCountdownTimer();
      setCrashCountdown({ active: true, secondsLeft: CRASH_COUNTDOWN_SECONDS, event });

      countdownRef.current = setInterval(() => {
        setCrashCountdown((prev) => {
          if (prev.secondsLeft <= 1) {
            clearCountdownTimer();
            // Mark event as emergency-called
            setEvents((evts) =>
              evts.map((e) => (e.id === prev.event?.id ? { ...e, emergencyCalled: true } : e)),
            );
            return { active: false, secondsLeft: CRASH_COUNTDOWN_SECONDS, event: null };
          }
          return { ...prev, secondsLeft: prev.secondsLeft - 1 };
        });
      }, 1000);
    },
    [clearCountdownTimer],
  );

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const simulateCrash = useCallback(() => {
    const now = new Date().toISOString();
    const crashEvent: SafetyEvent = {
      id: `evt-${Date.now()}`,
      type: 'crash',
      title: 'CRASH DETECTED',
      message: 'Crash detected — emergency protocol initiated.',
      timestamp: now,
      lat: live.position.lat,
      lng: live.position.lng,
      emergencyCalled: false,
    };
    setEvents((prev) => [crashEvent, ...prev]);
    setFocusEvent(crashEvent);
    startCrashCountdown(crashEvent);
    setLive((prev) => ({ ...prev, status: 'emergency' as DeviceStatus }));
  }, [live.position.lat, live.position.lng, startCrashCountdown]);

  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      ws = new WebSocket(`${WS_URL}/api/v1/ws/gps/${MOCK_DEVICE.id}`);

      ws.onopen = () => {
        console.log('Connected to GPS websocket');
        setLive((prev) => ({ ...prev, status: 'online' }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'event') {
            const newEvent: SafetyEvent = {
              id: `evt-${Date.now()}`,
              type:
                data.event_type === 'crash'
                  ? 'crash'
                  : data.event_type === 'ai_warning'
                    ? 'ai_warning'
                    : 'auto_brake',
              title: data.event_type.replace('_', ' ').toUpperCase(),
              message: data.message || 'No message provided',
              timestamp: data.timestamp || new Date().toISOString(),
              lat: data.latitude || live.position.lat,
              lng: data.longitude || live.position.lng,
              emergencyCalled: false,
            };
            setEvents((prev) => [newEvent, ...prev]);
            setFocusEvent(newEvent);

            if (data.event_type === 'crash') {
              // Start the 30-second countdown instead of immediately calling
              startCrashCountdown(newEvent);
              setLive((prev) => ({ ...prev, status: 'emergency' as DeviceStatus }));
            } else {
              const newStatus =
                data.event_type === 'ai_warning' ? 'ai_warning' : 'braking';
              setLive((prev) => ({ ...prev, status: newStatus as DeviceStatus }));
              setTimeout(
                () => setLive((prev) => ({ ...prev, status: 'online' })),
                5000,
              );
            }
          } else {
            const point: TelemetryPoint = {
              lat: data.latitude,
              lng: data.longitude,
              speedKmh: (data.speed || 0) * 3.6,
              timestamp: data.timestamp || new Date().toISOString(),
              accelMagnitude: 1.0,
            };

            setTrail((prev) => [...prev, point].slice(-500));
            setLive((prev) => ({
              position: point,
              status:
                prev.status === 'online' || prev.status === 'offline'
                  ? 'online'
                  : prev.status,
              pathIndex: prev.pathIndex + 1,
              lastUpdated: point.timestamp,
            }));
          }
        } catch (e) {
          console.error('Failed to parse WS message:', e);
        }
      };

      ws.onclose = () => {
        console.log('Disconnected from GPS websocket. Reconnecting in 3s...');
        setLive((prev) => ({ ...prev, status: 'offline' }));
        reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = (e) => {
        console.error('WebSocket error:', e);
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      clearCountdownTimer();
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const value = useMemo(
    () => ({
      live,
      rides: [] as Ride[],
      events,
      device: MOCK_DEVICE,
      trail,
      focusEvent,
      setFocusEvent,
      clearEvents,
      emergencyNumber,
      setEmergencyNumber,
      crashCountdown,
      dismissCrashCountdown,
      triggerEmergencyCall,
      simulateCrash,
    }),
    [live, trail, events, focusEvent, emergencyNumber, crashCountdown, clearEvents, dismissCrashCountdown, triggerEmergencyCall, simulateCrash],
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
