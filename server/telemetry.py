"""Telemetry heartbeat store and crash watchdog.

The Pi posts one heartbeat per second (see TelemetryHeartbeat). This module
keeps the latest heartbeat per device, relays it over the existing WebSocket
channel, mirrors any embedded GPS fix into the GPS store, and runs a
watchdog that raises a crash event when a device goes silent while it was
last seen moving.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional

from config import settings
from models import DeviceEvent, EventType, GPSData, TelemetryHeartbeat, TelemetryStatus
from recordings import recorder
from store import gps_store, manager

logger = logging.getLogger(__name__)

WATCHDOG_INTERVAL_S = 5.0


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class TelemetryStore:
    """Latest heartbeat per device plus crash-gap detection state."""

    def __init__(self) -> None:
        self._status: Dict[str, TelemetryStatus] = {}
        self._lock = asyncio.Lock()

    async def update(self, heartbeat: TelemetryHeartbeat) -> int:
        """Store a heartbeat, relay it, and clear any crash suspicion.

        Returns the number of WebSocket subscribers notified.
        """
        now = _utcnow()
        recovered = False

        async with self._lock:
            previous = self._status.get(heartbeat.device)
            missed = 0
            if previous is not None:
                gap = heartbeat.seq - previous.heartbeat.seq - 1
                # seq resets to 0 when the app restarts; only count forward gaps
                missed = gap if gap > 0 else 0
                recovered = previous.crash_suspected
                new_alert = (
                    heartbeat.alert != ""
                    and heartbeat.alert != previous.heartbeat.alert
                )
            else:
                new_alert = heartbeat.alert != ""

            self._status[heartbeat.device] = TelemetryStatus(
                heartbeat=heartbeat,
                received_at=now,
                missed_heartbeats=missed,
                crash_suspected=False,
            )

        # everything the app consumes is published under the single
        # app-facing device id, in the legacy GPS/event message shapes
        app_id = settings.app_device_id

        # relay the full heartbeat on a SEPARATE "-telemetry" channel so a
        # richer client can opt in; the legacy app's channel never sees this
        # unfamiliar message shape
        payload = {
            "type": "telemetry",
            "received_at": now.isoformat(),
            **heartbeat.model_dump(mode="json"),
        }
        await manager.broadcast(f"{app_id}-telemetry", payload)

        # mirror a valid GPS fix into the GPS store so the existing map
        # endpoints and WebSocket messages keep working unchanged
        if heartbeat.gps.valid and heartbeat.gps.lat is not None:
            await gps_store.update(
                GPSData(
                    device_id=app_id,
                    latitude=heartbeat.gps.lat,
                    longitude=heartbeat.gps.lon,
                    speed=max(heartbeat.speedKmh, 0.0) / 3.6,
                    heading=heartbeat.gps.courseDeg,
                    satellites=heartbeat.gps.sats,
                )
            )

        # surface rider alerts (danger warnings, red light) as legacy events
        if new_alert:
            await gps_store.broadcast_event(
                DeviceEvent(
                    device_id=app_id,
                    event_type=EventType.CUSTOM,
                    message=heartbeat.alert,
                    speed=max(heartbeat.speedKmh, 0.0) / 3.6,
                )
            )

        if recovered:
            logger.warning("Device %s heartbeats resumed", heartbeat.device)
            await gps_store.broadcast_event(
                DeviceEvent(
                    device_id=app_id,
                    event_type=EventType.CUSTOM,
                    message="heartbeats resumed",
                )
            )

        return manager.subscriber_count(app_id)

    def get_latest(self, device: str) -> Optional[TelemetryStatus]:
        return self._status.get(device)

    def most_recent(self) -> Optional[TelemetryStatus]:
        """The newest heartbeat across all devices (aliveness at a glance)."""
        if not self._status:
            return None
        return max(self._status.values(), key=lambda s: s.received_at)

    def list_devices(self) -> List[dict]:
        return [
            {
                "device": device,
                "last_heartbeat": status.received_at.isoformat(),
                "seq": status.heartbeat.seq,
                "speedKmh": status.heartbeat.speedKmh,
                "alert": status.heartbeat.alert,
                "crash_suspected": status.crash_suspected,
            }
            for device, status in self._status.items()
        ]

    async def check_for_crashes(self) -> None:
        """Flag devices whose heartbeats stopped while they were moving.

        The Pi heartbeats every second; a gap of `crash_gap_s` while the
        last known speed was at least `crash_min_speed_kmh` suggests the
        rider went down (or the device lost power mid-ride).
        """
        now = _utcnow()
        suspects: List[str] = []

        async with self._lock:
            for device, status in self._status.items():
                if status.crash_suspected:
                    continue
                gap = (now - status.received_at).total_seconds()
                was_moving = status.heartbeat.speedKmh >= settings.crash_min_speed_kmh
                if gap >= settings.crash_gap_s and was_moving:
                    status.crash_suspected = True
                    suspects.append(device)

        for device in suspects:
            status = self._status[device]
            logger.error(
                "CRASH SUSPECTED: %s silent for %.0fs, last speed %.1f km/h",
                device,
                (now - status.received_at).total_seconds(),
                status.heartbeat.speedKmh,
            )
            await gps_store.broadcast_event(
                DeviceEvent(
                    device_id=settings.app_device_id,
                    event_type=EventType.CRASH,
                    message=(
                        "heartbeats stopped while moving at "
                        f"{status.heartbeat.speedKmh:.1f} km/h"
                    ),
                    speed=max(status.heartbeat.speedKmh, 0.0) / 3.6,
                )
            )
            # save the pre-crash camera footage as a clip
            await recorder.make_crash_clip("crash")


async def crash_watchdog(store: "TelemetryStore") -> None:
    """Background task: periodically scan for heartbeat gaps."""
    logger.info(
        "Crash watchdog running (gap %.0fs, min speed %.1f km/h)",
        settings.crash_gap_s,
        settings.crash_min_speed_kmh,
    )
    while True:
        try:
            await store.check_for_crashes()
        except Exception:
            logger.exception("Crash watchdog iteration failed")
        await asyncio.sleep(WATCHDOG_INTERVAL_S)


telemetry_store = TelemetryStore()
