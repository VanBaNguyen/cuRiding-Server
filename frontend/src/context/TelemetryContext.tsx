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

const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:8000';

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const [live, setLive] = useState<LiveState>({
    position: LIVE_PATH[0],
    status: 'offline',
    pathIndex: 0,
    lastUpdated: new Date().toISOString(),
  });
  const [trail, setTrail] = useState<TelemetryPoint[]>([]);
  const [events, setEvents] = useState<SafetyEvent[]>(MOCK_EVENTS);
  const [focusEvent, setFocusEvent] = useState<SafetyEvent | null>(null);

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
              type: data.event_type === 'crash' ? 'crash' : data.event_type === 'ai_warning' ? 'ai_warning' : 'auto_brake',
              title: data.event_type.replace('_', ' ').toUpperCase(),
              message: data.message || 'No message provided',
              timestamp: data.timestamp || new Date().toISOString(),
              lat: data.latitude || live.position.lat,
              lng: data.longitude || live.position.lng,
              emergencyCalled: data.event_type === 'crash'
            };
            setEvents((prev) => [newEvent, ...prev]);
            setFocusEvent(newEvent);
            
            // Briefly show the event status
            const newStatus = data.event_type === 'crash' ? 'emergency' : (data.event_type === 'ai_warning' ? 'ai_warning' : 'braking');
            setLive((prev) => ({ ...prev, status: newStatus as DeviceStatus }));
            setTimeout(() => setLive((prev) => ({ ...prev, status: 'online' })), 5000);
            
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
              status: prev.status === 'online' || prev.status === 'offline' ? 'online' : prev.status,
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
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const value = useMemo(
    () => ({
      live,
      rides: MOCK_RIDES,
      events,
      device: MOCK_DEVICE,
      trail,
      focusEvent,
      setFocusEvent,
    }),
    [live, trail, events, focusEvent],
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
