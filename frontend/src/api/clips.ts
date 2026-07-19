import { apiUrl } from '@/src/config/api';
import type { ClipMeta } from '@/src/types/clip';

async function post(path: string): Promise<Record<string, unknown>> {
  const res = await fetch(apiUrl(path), { method: 'POST' });
  if (!res.ok) {
    throw new Error(`${path} failed (${res.status})`);
  }
  return res.json();
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(apiUrl(path));
  if (!res.ok) {
    throw new Error(`${path} failed (${res.status})`);
  }
  return res.json();
}

export async function fetchClips(): Promise<ClipMeta[]> {
  return get<ClipMeta[]>('/api/v1/clips');
}

export async function fetchRecordingState(): Promise<boolean> {
  const data = await get<{ recording: boolean }>('/api/v1/recording');
  return data.recording;
}

export async function startRecording(): Promise<void> {
  await post('/api/v1/recording/start');
}

export async function stopRecording(): Promise<string | null> {
  const data = await post('/api/v1/recording/stop');
  return typeof data.clip_id === 'string' ? data.clip_id : null;
}

export async function simulateServerCrash(): Promise<string | null> {
  const data = await post('/api/v1/crash/simulate');
  return typeof data.clip_id === 'string' ? data.clip_id : null;
}

export async function fetchClipFrames(clipId: string): Promise<string[]> {
  const data = await get<{ frames: string[] }>(`/api/v1/clips/${clipId}/frames`);
  return data.frames;
}

export function clipReasonLabel(reason: ClipMeta['reason']): string {
  switch (reason) {
    case 'crash':
      return 'Crash';
    case 'crash-sim':
      return 'Simulated crash';
    default:
      return 'Manual recording';
  }
}
