import type { DeviceInfo, Ride, SafetyEvent, TelemetryPoint } from '@/src/types/device';

/** Ottawa — Rideau Canal / downtown corridor */
export const OTTAWA_REGION = {
  latitude: 45.4215,
  longitude: -75.6972,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

/** Simulated live GPS path along the Canal area */
export const LIVE_PATH: TelemetryPoint[] = [
  { lat: 45.4215, lng: -75.6972, speedKmh: 12, timestamp: '', accelMagnitude: 1.0 },
  { lat: 45.4222, lng: -75.6965, speedKmh: 18, timestamp: '', accelMagnitude: 1.1 },
  { lat: 45.4230, lng: -75.6958, speedKmh: 22, timestamp: '', accelMagnitude: 1.05 },
  { lat: 45.4238, lng: -75.6950, speedKmh: 25, timestamp: '', accelMagnitude: 1.2 },
  { lat: 45.4245, lng: -75.6942, speedKmh: 20, timestamp: '', accelMagnitude: 0.95 },
  { lat: 45.4252, lng: -75.6935, speedKmh: 16, timestamp: '', accelMagnitude: 1.0 },
  { lat: 45.4260, lng: -75.6928, speedKmh: 14, timestamp: '', accelMagnitude: 0.9 },
  { lat: 45.4268, lng: -75.6920, speedKmh: 19, timestamp: '', accelMagnitude: 1.15 },
  { lat: 45.4275, lng: -75.6912, speedKmh: 23, timestamp: '', accelMagnitude: 1.3 },
  { lat: 45.4282, lng: -75.6905, speedKmh: 17, timestamp: '', accelMagnitude: 1.0 },
  { lat: 45.4270, lng: -75.6910, speedKmh: 15, timestamp: '', accelMagnitude: 0.85 },
  { lat: 45.4255, lng: -75.6925, speedKmh: 21, timestamp: '', accelMagnitude: 1.1 },
  { lat: 45.4240, lng: -75.6940, speedKmh: 24, timestamp: '', accelMagnitude: 1.25 },
  { lat: 45.4225, lng: -75.6955, speedKmh: 18, timestamp: '', accelMagnitude: 1.0 },
  { lat: 45.4215, lng: -75.6972, speedKmh: 10, timestamp: '', accelMagnitude: 0.8 },
];

function ridePoints(
  base: { lat: number; lng: number }[],
  speeds: number[],
  startIso: string,
): TelemetryPoint[] {
  const start = new Date(startIso).getTime();
  return base.map((p, i) => ({
    lat: p.lat,
    lng: p.lng,
    speedKmh: speeds[i] ?? speeds[speeds.length - 1] ?? 15,
    timestamp: new Date(start + i * 30_000).toISOString(),
    accelMagnitude: 0.9 + (i % 5) * 0.08,
  }));
}

const canalBase = LIVE_PATH.map(({ lat, lng }) => ({ lat, lng }));

export const MOCK_RIDES: Ride[] = [
  {
    id: 'ride-1',
    startedAt: '2026-07-10T16:20:00.000Z',
    endedAt: '2026-07-10T16:48:00.000Z',
    durationMin: 28,
    distanceKm: 4.2,
    avgSpeedKmh: 18.5,
    maxSpeedKmh: 28,
    points: ridePoints(
      canalBase,
      [8, 14, 19, 24, 28, 22, 16, 20, 25, 18, 15, 21, 26, 17, 9],
      '2026-07-10T16:20:00.000Z',
    ),
  },
  {
    id: 'ride-2',
    startedAt: '2026-07-09T12:05:00.000Z',
    endedAt: '2026-07-09T12:22:00.000Z',
    durationMin: 17,
    distanceKm: 2.6,
    avgSpeedKmh: 15.2,
    maxSpeedKmh: 22,
    points: ridePoints(
      canalBase.slice(0, 10),
      [6, 12, 16, 20, 22, 18, 14, 17, 19, 11],
      '2026-07-09T12:05:00.000Z',
    ),
  },
  {
    id: 'ride-3',
    startedAt: '2026-07-08T18:40:00.000Z',
    endedAt: '2026-07-08T19:05:00.000Z',
    durationMin: 25,
    distanceKm: 3.8,
    avgSpeedKmh: 16.8,
    maxSpeedKmh: 24,
    points: ridePoints(
      canalBase,
      [10, 15, 18, 21, 24, 19, 14, 16, 20, 22, 17, 19, 23, 15, 8],
      '2026-07-08T18:40:00.000Z',
    ),
  },
];

export const MOCK_EVENTS: SafetyEvent[] = [
  {
    id: 'evt-crash-1',
    type: 'crash',
    title: 'Violent crash detected',
    message: 'QNX triggered emergency protocol. 911 contacted. Last known location near Rideau Canal.',
    timestamp: '2026-07-10T16:41:12.000Z',
    lat: 45.4268,
    lng: -75.6920,
    emergencyCalled: true,
  },
  {
    id: 'evt-brake-1',
    type: 'auto_brake',
    title: 'Automatic brake applied',
    message: 'QNX assessed elevated collision risk and applied brakes.',
    timestamp: '2026-07-10T16:38:04.000Z',
    lat: 45.4252,
    lng: -75.6935,
  },
  {
    id: 'evt-ai-1',
    type: 'ai_warning',
    title: 'Pedestrian ahead',
    message: 'Camera AI flagged a pedestrian crossing the path. Warning issued to rider.',
    timestamp: '2026-07-10T16:35:22.000Z',
    lat: 45.4240,
    lng: -75.6945,
  },
  {
    id: 'evt-ai-2',
    type: 'ai_warning',
    title: 'Obstacle detected',
    message: 'Vision model detected an obstacle in the travel corridor.',
    timestamp: '2026-07-09T12:14:50.000Z',
    lat: 45.4230,
    lng: -75.6958,
  },
  {
    id: 'evt-brake-2',
    type: 'auto_brake',
    title: 'Automatic brake applied',
    message: 'Sudden closing speed on a cyclist ahead — brakes engaged.',
    timestamp: '2026-07-08T18:52:10.000Z',
    lat: 45.4275,
    lng: -75.6912,
  },
];

export const MOCK_DEVICE: DeviceInfo = {
  id: 'cu-pi5-0a3f',
  name: 'CuRiding Unit',
  hardware: 'Raspberry Pi 5 (8GB) · Camera Module 3 AF · GPS · Accel',
  riderName: 'Alex',
  paired: true,
};
