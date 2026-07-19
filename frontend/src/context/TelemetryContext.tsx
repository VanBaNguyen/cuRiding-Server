import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { wsUrl } from '@/src/config/api';
import {
  fetchClipFrames,
  fetchClips,
  fetchRecordingState,
  simulateServerCrash,
  startRecording,
  stopRecording,
} from '@/src/api/clips';
import { DEVICE } from '@/src/data/device';
import type { ClipMeta } from '@/src/types/clip';
import type {
  DeviceInfo,
  DeviceStatus,
  DeviceStatusSnapshot,
  LiveState,
  Ride,
  SafetyEvent,
  SafetyEventType,
  TelemetryPoint,
} from '@/src/types/device';

export interface CrashCountdownState {
  active: boolean;
  secondsLeft: number;
  event: SafetyEvent | null;
}

export interface CameraSnapshot {
  uri: string;
  timestamp: string;
  ageSeconds: number;
}

interface ServerStatusFrame {
  type: 'status';
  app_device_id: string;
  name: string;
  hardware: string;
  server_time: string;
  online: boolean;
  heartbeat: {
    device: string;
    last_heartbeat: string;
    age_seconds: number;
    seq: number;
    speedKmh: number;
    alert: string;
    crash_suspected: boolean;
  } | null;
  position: {
    last_update: string;
    age_seconds: number;
    latitude: number;
    longitude: number;
  } | null;
}

interface TelemetryContextValue {
  live: LiveState;
  rides: Ride[];
  events: SafetyEvent[];
  device: DeviceInfo;
  deviceStatus: DeviceStatusSnapshot;
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
  cameraSnapshot: CameraSnapshot | null;
  cameraConnected: boolean;
  clips: ClipMeta[];
  recording: boolean;
  toggleRecording: () => Promise<void>;
  loadClipFrames: (clipId: string) => Promise<string[]>;
  selectedClipId: string | null;
  setSelectedClipId: (id: string | null) => void;
}

const TelemetryContext = createContext<TelemetryContextValue | null>(null);

const DEFAULT_POSITION: TelemetryPoint = {
  lat: 0,
  lng: 0,
  speedKmh: 0,
  timestamp: new Date().toISOString(),
  accelMagnitude: 0,
};

const CRASH_COUNTDOWN_SECONDS = 30;

function disconnectCrashMessage(frame: ServerStatusFrame): string {
  const age = frame.heartbeat?.age_seconds ?? 0;
  if (frame.heartbeat?.crash_suspected) {
    return `Heartbeat stopped suddenly (${Math.round(age)}s ago)`;
  }
  return `Scooter stopped reporting (${Math.round(age)}s since last heartbeat)`;
}

function eventTitle(type: SafetyEventType, message?: string): string {
  switch (type) {
    case 'crash':
      return 'CRASH DETECTED';
    case 'low_battery':
      return 'LOW BATTERY';
    case 'geofence_exit':
      return 'GEOFENCE EXIT';
    case 'device_offline':
      return 'DEVICE OFFLINE';
    default:
      return message?.trim() ? message.trim().toUpperCase() : 'RIDER ALERT';
  }
}

function mapEventType(eventType: string): SafetyEventType {
  switch (eventType) {
    case 'crash':
      return 'crash';
    case 'low_battery':
      return 'low_battery';
    case 'geofence_exit':
      return 'geofence_exit';
    case 'device_offline':
      return 'device_offline';
    default:
      return 'custom';
  }
}

function deriveDeviceStatus(
  frame: ServerStatusFrame | null,
  current: DeviceStatus,
): DeviceStatus {
  if (current === 'emergency') return 'emergency';
  if (!frame) return 'waiting';
  if (!frame.heartbeat) return 'waiting';
  if (!frame.online) return 'offline';
  if (frame.heartbeat.alert) return 'alert';
  return 'online';
}

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const [live, setLive] = useState<LiveState>({
    position: DEFAULT_POSITION,
    status: 'waiting',
    pathIndex: 0,
    lastUpdated: new Date().toISOString(),
  });
  const [device, setDevice] = useState<DeviceInfo>(DEVICE);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatusSnapshot>({
    online: false,
    heartbeatAgeSeconds: null,
    positionAgeSeconds: null,
    heartbeatSeq: null,
    activeAlert: null,
    crashSuspected: false,
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
  const [cameraSnapshot, setCameraSnapshot] = useState<CameraSnapshot | null>(null);
  const [cameraConnected, setCameraConnected] = useState(false);
  const [clips, setClips] = useState<ClipMeta[]>([]);
  const [recording, setRecording] = useState(false);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveRef = useRef(live);
  const deviceStatusRef = useRef(deviceStatus);
  const wasOnlineRef = useRef(false);
  const disconnectCrashTriggeredRef = useRef(false);
  const crashCountdownActiveRef = useRef(false);
  liveRef.current = live;
  deviceStatusRef.current = deviceStatus;

  const clearCountdownTimer = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const dismissCrashCountdown = useCallback(() => {
    clearCountdownTimer();
    crashCountdownActiveRef.current = false;
    setCrashCountdown({ active: false, secondsLeft: CRASH_COUNTDOWN_SECONDS, event: null });
    setLive((prev) => ({
      ...prev,
      status: deviceStatusRef.current.online ? 'online' : 'offline',
    }));
  }, [clearCountdownTimer]);

  const triggerEmergencyCall = useCallback(() => {
    clearCountdownTimer();
    crashCountdownActiveRef.current = false;
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
      crashCountdownActiveRef.current = true;
      setCrashCountdown({ active: true, secondsLeft: CRASH_COUNTDOWN_SECONDS, event });

      countdownRef.current = setInterval(() => {
        setCrashCountdown((prev) => {
          if (prev.secondsLeft <= 1) {
            clearCountdownTimer();
            crashCountdownActiveRef.current = false;
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

  const raiseDisconnectCrash = useCallback(
    (frame: ServerStatusFrame) => {
      if (crashCountdownActiveRef.current) return;

      const pos = liveRef.current.position;
      const newEvent: SafetyEvent = {
        id: `evt-disconnect-${Date.now()}`,
        type: 'crash',
        title: 'CRASH DETECTED',
        message: disconnectCrashMessage(frame),
        timestamp: new Date().toISOString(),
        lat: pos.lat,
        lng: pos.lng,
        emergencyCalled: false,
      };

      setEvents((prev) => [newEvent, ...prev]);
      setFocusEvent(newEvent);
      startCrashCountdown(newEvent);
      setLive((prev) => ({ ...prev, status: 'emergency' }));
    },
    [startCrashCountdown],
  );

  const handleServerEvent = useCallback(
    (data: Record<string, unknown>) => {
      const eventType = mapEventType(String(data.event_type ?? 'custom'));
      const message = typeof data.message === 'string' ? data.message : 'No message provided';
      const pos = liveRef.current.position;

      const newEvent: SafetyEvent = {
        id: `evt-${Date.now()}`,
        type: eventType,
        title: eventTitle(eventType, message),
        message,
        timestamp: typeof data.timestamp === 'string' ? data.timestamp : new Date().toISOString(),
        lat: typeof data.latitude === 'number' ? data.latitude : pos.lat,
        lng: typeof data.longitude === 'number' ? data.longitude : pos.lng,
        emergencyCalled: false,
      };

      setEvents((prev) => [newEvent, ...prev]);
      setFocusEvent(newEvent);

      if (eventType === 'crash') {
        if (crashCountdownActiveRef.current) {
          setEvents((prev) => [newEvent, ...prev]);
          setFocusEvent(newEvent);
          setLive((prev) => ({ ...prev, status: 'emergency' }));
          return;
        }
        disconnectCrashTriggeredRef.current = true;
        startCrashCountdown(newEvent);
        setLive((prev) => ({ ...prev, status: 'emergency' }));
        return;
      }

      if (eventType === 'custom') {
        setLive((prev) => ({ ...prev, status: 'alert' }));
        setTimeout(() => {
          setLive((prev) =>
            prev.status === 'alert' ? { ...prev, status: 'online' } : prev,
          );
        }, 5000);
        return;
      }

      setLive((prev) => ({ ...prev, status: 'alert' }));
      setTimeout(() => {
        setLive((prev) => (prev.status === 'alert' ? { ...prev, status: 'online' } : prev));
      }, 5000);
    },
    [startCrashCountdown],
  );

  const applyStatusFrame = useCallback(
    (frame: ServerStatusFrame) => {
      const hadHeartbeats = frame.heartbeat != null;
      const isOnline = frame.online && hadHeartbeats;

      if (isOnline) {
        wasOnlineRef.current = true;
        disconnectCrashTriggeredRef.current = false;
      } else if (
        wasOnlineRef.current &&
        hadHeartbeats &&
        !disconnectCrashTriggeredRef.current &&
        (!frame.online || frame.heartbeat!.crash_suspected)
      ) {
        disconnectCrashTriggeredRef.current = true;
        raiseDisconnectCrash(frame);
      }

      const nextDeviceStatus = {
        online: frame.online,
        heartbeatAgeSeconds: frame.heartbeat?.age_seconds ?? null,
        positionAgeSeconds: frame.position?.age_seconds ?? null,
        heartbeatSeq: frame.heartbeat?.seq ?? null,
        activeAlert: frame.heartbeat?.alert || null,
        crashSuspected: frame.heartbeat?.crash_suspected ?? false,
      };
      deviceStatusRef.current = nextDeviceStatus;

      setDevice((prev) => ({
        ...prev,
        id: frame.app_device_id,
        name: frame.name,
        hardware: frame.hardware,
      }));

      setDeviceStatus(nextDeviceStatus);

      setLive((prev) => {
        const nextStatus = deriveDeviceStatus(frame, prev.status);
        const heartbeatSpeed = frame.heartbeat?.speedKmh;
        const hasHeartbeatSpeed = heartbeatSpeed != null && heartbeatSpeed >= 0;

        return {
          ...prev,
          status: prev.status === 'emergency' ? 'emergency' : nextStatus,
          position: hasHeartbeatSpeed
            ? { ...prev.position, speedKmh: heartbeatSpeed }
            : prev.position,
        };
      });
    },
    [raiseDisconnectCrash],
  );

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const simulateCrash = useCallback(async () => {
    try {
      await simulateServerCrash();
    } catch (e) {
      console.warn('Server crash simulate unavailable, falling back to local:', e);
      disconnectCrashTriggeredRef.current = true;
      handleServerEvent({
        event_type: 'crash',
        message: 'Simulated crash — emergency protocol initiated.',
        timestamp: new Date().toISOString(),
        latitude: liveRef.current.position.lat,
        longitude: liveRef.current.position.lng,
      });
    }
  }, [handleServerEvent]);

  const toggleRecording = useCallback(async () => {
    try {
      if (recording) {
        const clipId = await stopRecording();
        setRecording(false);
        if (clipId) setSelectedClipId(clipId);
      } else {
        await startRecording();
        setRecording(true);
      }
    } catch (e) {
      console.error('Recording toggle failed:', e);
    }
  }, [recording]);

  const loadClipFrames = useCallback(async (clipId: string) => {
    return fetchClipFrames(clipId);
  }, []);

  const upsertClip = useCallback((clip: ClipMeta) => {
    setClips((prev) => {
      const without = prev.filter((c) => c.id !== clip.id);
      return [clip, ...without].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    });
  }, []);

  useEffect(() => {
    fetchClips()
      .then(setClips)
      .catch((e) => console.warn('Could not load clips:', e));
    fetchRecordingState()
      .then(setRecording)
      .catch(() => {});
  }, []);

  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      ws = new WebSocket(wsUrl('/api/v1/ws/clips'));

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'clips' && Array.isArray(data.clips)) {
            setClips(data.clips as ClipMeta[]);
            return;
          }
          if (data.type === 'clip' && data.id) {
            upsertClip(data as ClipMeta);
          }
        } catch (e) {
          console.error('Failed to parse clips WS message:', e);
        }
      };

      ws.onclose = () => {
        reconnectTimer = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [upsertClip]);

  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      ws = new WebSocket(wsUrl(`/api/v1/ws/gps/${DEVICE.id}`));

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'event') {
            handleServerEvent(data);
            return;
          }

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
              prev.status === 'online' ||
              prev.status === 'offline' ||
              prev.status === 'waiting' ||
              prev.status === 'alert'
                ? prev.status === 'offline' || prev.status === 'waiting'
                  ? prev.status
                  : 'online'
                : prev.status,
            pathIndex: prev.pathIndex + 1,
            lastUpdated: point.timestamp,
          }));
        } catch (e) {
          console.error('Failed to parse GPS WS message:', e);
        }
      };

      ws.onclose = () => {
        console.log('GPS websocket disconnected. Reconnecting in 3s...');
        reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = (e) => {
        console.error('GPS WebSocket error:', e);
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [handleServerEvent]);

  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      ws = new WebSocket(wsUrl('/api/v1/ws/status'));

      ws.onopen = () => {
        console.log('Connected to status websocket');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as ServerStatusFrame;
          if (data.type === 'status') {
            applyStatusFrame(data);
          }
        } catch (e) {
          console.error('Failed to parse status WS message:', e);
        }
      };

      ws.onclose = () => {
        console.log('Status websocket disconnected. Reconnecting in 3s...');
        reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = (e) => {
        console.error('Status WebSocket error:', e);
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [applyStatusFrame]);

  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      ws = new WebSocket(wsUrl('/api/v1/ws/snapshot'));

      ws.onopen = () => {
        console.log('Connected to snapshot websocket');
        setCameraConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type !== 'snapshot' || !data.jpeg_b64) return;

          setCameraSnapshot({
            uri: `data:image/jpeg;base64,${data.jpeg_b64}`,
            timestamp: data.ts || new Date().toISOString(),
            ageSeconds: data.age_seconds ?? 0,
          });
        } catch (e) {
          console.error('Failed to parse snapshot message:', e);
        }
      };

      ws.onclose = () => {
        console.log('Snapshot websocket disconnected. Reconnecting in 3s...');
        setCameraConnected(false);
        reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = (e) => {
        console.error('Snapshot WebSocket error:', e);
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, []);

  useEffect(() => {
    return () => {
      clearCountdownTimer();
    };
  }, [clearCountdownTimer]);

  const value = useMemo(
    () => ({
      live,
      rides: [] as Ride[],
      events,
      device,
      deviceStatus,
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
      cameraSnapshot,
      cameraConnected,
      clips,
      recording,
      toggleRecording,
      loadClipFrames,
      selectedClipId,
      setSelectedClipId,
    }),
    [
      live,
      trail,
      events,
      device,
      deviceStatus,
      focusEvent,
      emergencyNumber,
      crashCountdown,
      cameraSnapshot,
      cameraConnected,
      clips,
      recording,
      selectedClipId,
      clearEvents,
      dismissCrashCountdown,
      triggerEmergencyCall,
      simulateCrash,
      toggleRecording,
      loadClipFrames,
    ],
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
