export type ClipReason = 'crash' | 'crash-sim' | 'manual';

export interface ClipMeta {
  id: string;
  reason: ClipReason;
  created_at: string;
  frame_count: number;
  duration_s: number;
}

export interface ClipPlayback {
  clipId: string;
  frames: string[];
  frameIndex: number;
}
