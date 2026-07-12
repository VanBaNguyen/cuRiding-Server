"""Camera clip recording: pre-crash buffer, crash clips, and manual recording.

Every camera snapshot the Pi POSTs is appended to a rolling buffer (the last
N frames). When a crash is detected the buffer is saved as a clip — the
footage from just before the crash. A phone can also start/stop a manual
recording, and trigger a simulated crash for testing.

Clips are persisted to disk (a directory per clip of frame_XXXX.jpg plus a
meta.json) so they survive a server restart, and indexed in memory.
"""

import asyncio
import json
import logging
import os
import shutil
from collections import deque
from datetime import datetime, timezone
from typing import Deque, Dict, List, Optional, Tuple

from config import settings
from store import manager

logger = logging.getLogger(__name__)

Frame = Tuple[bytes, datetime]


def _now() -> datetime:
    return datetime.now(timezone.utc)


def clips_channel(device_id: str) -> str:
    return f"{device_id}-clips"


class Recorder:
    """Rolling frame buffer + clip store for crash and manual recordings."""

    def __init__(self) -> None:
        self._buffer: Deque[Frame] = deque(maxlen=settings.precrash_frames)
        self._recording = False
        self._recording_frames: List[Frame] = []
        self._index: Dict[str, dict] = {}
        self._lock = asyncio.Lock()
        os.makedirs(settings.clips_dir, exist_ok=True)
        self._load_index()

    def _load_index(self) -> None:
        for clip_id in os.listdir(settings.clips_dir):
            meta_path = os.path.join(settings.clips_dir, clip_id, "meta.json")
            if os.path.isfile(meta_path):
                try:
                    with open(meta_path) as handle:
                        self._index[clip_id] = json.load(handle)
                except Exception:
                    logger.warning("Could not load clip meta %s", meta_path)
        logger.info("Recorder: %d existing clip(s) loaded", len(self._index))

    async def on_frame(self, jpeg: bytes) -> None:
        """Append a newly received camera frame to the buffer / recording."""
        frame: Frame = (jpeg, _now())
        async with self._lock:
            self._buffer.append(frame)
            if self._recording:
                self._recording_frames.append(frame)

    async def start_recording(self) -> bool:
        """Begin a manual recording (seeded with the pre-roll buffer)."""
        async with self._lock:
            if self._recording:
                return False
            self._recording = True
            self._recording_frames = list(self._buffer)
        logger.info("Recording started")
        return True

    async def stop_recording(self) -> Optional[str]:
        """Finish a manual recording and save it as a clip."""
        async with self._lock:
            if not self._recording:
                return None
            frames = self._recording_frames
            self._recording = False
            self._recording_frames = []
        return await self._save_clip("manual", frames)

    def is_recording(self) -> bool:
        return self._recording

    async def make_crash_clip(self, reason: str = "crash") -> Optional[str]:
        """Save the current pre-crash buffer as a clip."""
        async with self._lock:
            frames = list(self._buffer)
        clip_id = await self._save_clip(reason, frames)
        if clip_id is None:
            logger.warning("Crash clip requested but no frames buffered yet")
        return clip_id

    async def _save_clip(self, reason: str, frames: List[Frame]) -> Optional[str]:
        if not frames:
            return None

        created = frames[-1][1]
        clip_id = f"{created.strftime('%Y%m%d-%H%M%S')}-{reason}"
        clip_dir = os.path.join(settings.clips_dir, clip_id)
        os.makedirs(clip_dir, exist_ok=True)

        for index, (jpeg, _ts) in enumerate(frames):
            with open(os.path.join(clip_dir, f"frame_{index:04d}.jpg"), "wb") as handle:
                handle.write(jpeg)

        meta = {
            "id": clip_id,
            "reason": reason,
            "created_at": created.isoformat(),
            "frame_count": len(frames),
            "duration_s": round((frames[-1][1] - frames[0][1]).total_seconds(), 1),
        }
        with open(os.path.join(clip_dir, "meta.json"), "w") as handle:
            json.dump(meta, handle)

        self._index[clip_id] = meta
        self._prune()

        logger.info("Saved %s clip %s (%d frames)", reason, clip_id, len(frames))
        await manager.broadcast(
            clips_channel(settings.app_device_id), {"type": "clip", **meta}
        )
        return clip_id

    def _prune(self) -> None:
        """Drop the oldest clips beyond max_clips (from memory and disk)."""
        if len(self._index) <= settings.max_clips:
            return
        ordered = sorted(self._index.values(), key=lambda m: m["created_at"])
        for meta in ordered[: len(self._index) - settings.max_clips]:
            self._index.pop(meta["id"], None)
            shutil.rmtree(os.path.join(settings.clips_dir, meta["id"]), ignore_errors=True)

    def list_clips(self) -> List[dict]:
        return sorted(self._index.values(), key=lambda m: m["created_at"], reverse=True)

    def get_meta(self, clip_id: str) -> Optional[dict]:
        return self._index.get(clip_id)

    def frame_path(self, clip_id: str, index: int) -> Optional[str]:
        if clip_id not in self._index:
            return None
        path = os.path.join(settings.clips_dir, clip_id, f"frame_{index:04d}.jpg")
        return path if os.path.isfile(path) else None

    def read_frames(self, clip_id: str) -> Optional[List[bytes]]:
        meta = self._index.get(clip_id)
        if meta is None:
            return None
        frames = []
        for index in range(meta["frame_count"]):
            path = os.path.join(settings.clips_dir, clip_id, f"frame_{index:04d}.jpg")
            if os.path.isfile(path):
                with open(path, "rb") as handle:
                    frames.append(handle.read())
        return frames


recorder = Recorder()
