export type DeviceStatus = 'online' | 'ai_warning' | 'braking' | 'emergency' | 'offline';

export type SafetyEventType = 'ai_warning' | 'auto_brake' | 'crash';

export interface TelemetryPoint {
  lat: number;
  lng: number;
  speedKmh: number;
  timestamp: string;
  accelMagnitude?: number;
}

export interface SafetyEvent {
  id: string;
  type: SafetyEventType;
  title: string;
  message: string;
  timestamp: string;
  lat: number;
  lng: number;
  emergencyCalled?: boolean;
}

export interface Ride {
  id: string;
  startedAt: string;
  endedAt: string;
  durationMin: number;
  distanceKm: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  points: TelemetryPoint[];
}

export interface DeviceInfo {
  id: string;
  name: string;
  hardware: string;
  riderName: string;
  paired: boolean;
}

export interface LiveState {
  position: TelemetryPoint;
  status: DeviceStatus;
  pathIndex: number;
  lastUpdated: string;
}
