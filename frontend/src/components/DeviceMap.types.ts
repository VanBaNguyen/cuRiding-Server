import type { SafetyEvent, TelemetryPoint } from '@/src/types/device';

export type DeviceMapProps = {
  position: TelemetryPoint;
  trail: TelemetryPoint[];
  status: string;
  focusEvent: SafetyEvent | null;
  onFocusHandled: () => void;
};
