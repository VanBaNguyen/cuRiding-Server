import type { DeviceInfo } from '@/src/types/device';

/** Local rider metadata. Name, hardware, and live status come from the server. */
export const DEVICE: DeviceInfo = {
  id: 'scooter',
  name: 'cuRiding Scooter',
  hardware: 'Raspberry Pi 5 (QNX 8) + ESP32-C3 Find My tag',
  riderName: 'Alex',
  paired: true,
};
