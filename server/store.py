"""In-memory GPS store and WebSocket connection manager."""

import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Set

from fastapi import WebSocket

from models import GPSData

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections grouped by device_id."""

    def __init__(self) -> None:
        # device_id -> set of connected WebSocket clients
        self._subscribers: Dict[str, Set[WebSocket]] = {}

    async def subscribe(self, device_id: str, websocket: WebSocket) -> None:
        """Accept a WebSocket and register it for a device's updates."""
        await websocket.accept()
        if device_id not in self._subscribers:
            self._subscribers[device_id] = set()
        self._subscribers[device_id].add(websocket)
        logger.info(
            "Client subscribed to device %s (%d total)",
            device_id,
            len(self._subscribers[device_id]),
        )

    def unsubscribe(self, device_id: str, websocket: WebSocket) -> None:
        """Remove a WebSocket from a device's subscriber list."""
        if device_id in self._subscribers:
            self._subscribers[device_id].discard(websocket)
            if not self._subscribers[device_id]:
                del self._subscribers[device_id]
            logger.info("Client unsubscribed from device %s", device_id)

    def subscriber_count(self, device_id: str) -> int:
        """Return the number of active subscribers for a device."""
        return len(self._subscribers.get(device_id, set()))

    async def broadcast(self, device_id: str, data: dict) -> None:
        """Send data to all subscribers of a device.

        Disconnected clients are removed automatically.
        """
        subscribers = self._subscribers.get(device_id, set()).copy()
        stale: List[WebSocket] = []

        for ws in subscribers:
            try:
                await ws.send_json(data)
            except Exception:
                stale.append(ws)

        for ws in stale:
            self.unsubscribe(device_id, ws)


class GPSStore:
    """Holds the latest GPS reading per device and drives broadcasts."""

    def __init__(self, manager: ConnectionManager) -> None:
        self._manager = manager
        # device_id -> latest GPSData
        self._latest: Dict[str, GPSData] = {}
        self._lock = asyncio.Lock()

    async def update(self, data: GPSData) -> int:
        """Store a new GPS reading and broadcast to subscribers.

        Returns the number of subscribers that were notified.
        """
        async with self._lock:
            self._latest[data.device_id] = data

        payload = data.model_dump(mode="json")
        await self._manager.broadcast(data.device_id, payload)
        return self._manager.subscriber_count(data.device_id)

    def get_latest(self, device_id: str) -> GPSData | None:
        """Return the most recent GPS reading for a device, or None."""
        return self._latest.get(device_id)

    def list_devices(self) -> List[dict]:
        """Return summary info for all tracked devices."""
        devices = []
        for device_id, gps in self._latest.items():
            devices.append(
                {
                    "device_id": device_id,
                    "last_seen": gps.timestamp.isoformat(),
                    "latitude": gps.latitude,
                    "longitude": gps.longitude,
                }
            )
        return devices


# --- Singletons ---
manager = ConnectionManager()
gps_store = GPSStore(manager)
