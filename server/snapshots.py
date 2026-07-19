"""Latest camera snapshot per device, relayed to WebSocket subscribers.

The Pi periodically POSTs a small JPEG of what its camera sees. The most
recent frame is held in memory and pushed to any /ws/snapshot subscribers as
base64 (so a WebSocket-only app can render it from a data URI), and also
served raw as image/jpeg for convenience.
"""

import asyncio
import base64
from datetime import datetime, timezone
from typing import Dict, Optional, Tuple

from store import manager

# WebSocket channel suffix so snapshot frames never land on the gps channel
SNAPSHOT_CHANNEL_SUFFIX = "-snapshot"


def channel_for(device_id: str) -> str:
    return f"{device_id}{SNAPSHOT_CHANNEL_SUFFIX}"


def _encode_message(device_id: str, jpeg: bytes, when: datetime) -> dict:
    now = datetime.now(timezone.utc)
    return {
        "type": "snapshot",
        "device_id": device_id,
        "ts": when.isoformat(),
        "age_seconds": round((now - when).total_seconds(), 1),
        "jpeg_b64": base64.b64encode(jpeg).decode(),
    }


class SnapshotStore:
    """Holds the latest JPEG per device and pushes it to subscribers."""

    def __init__(self) -> None:
        self._latest: Dict[str, Tuple[bytes, datetime]] = {}
        self._lock = asyncio.Lock()

    async def update(self, device_id: str, jpeg: bytes) -> int:
        """Store a new frame and broadcast it. Returns subscriber count."""
        now = datetime.now(timezone.utc)
        async with self._lock:
            self._latest[device_id] = (jpeg, now)
        await manager.broadcast(channel_for(device_id), _encode_message(device_id, jpeg, now))
        return manager.subscriber_count(channel_for(device_id))

    def get_latest(self, device_id: str) -> Optional[Tuple[bytes, datetime]]:
        return self._latest.get(device_id)

    def latest_message(self, device_id: str) -> Optional[dict]:
        latest = self._latest.get(device_id)
        if latest is None:
            return None
        jpeg, when = latest
        return _encode_message(device_id, jpeg, when)


snapshot_store = SnapshotStore()
