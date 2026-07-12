"""API routes for GPS ingest and relay."""

import logging

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, status

from models import (
    GPSData,
    GPSResponse,
    NMEARequest,
    DeviceEvent,
    TelemetryHeartbeat,
    TelemetryStatus,
)
from nmea import parse_nmea
from store import gps_store, manager
from telemetry import telemetry_store

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1")


# ---------------------------------------------------------------------------
# Ingest — Raspberry Pi posts GPS data here
# ---------------------------------------------------------------------------


@router.post("/gps", response_model=GPSResponse, status_code=status.HTTP_201_CREATED)
async def ingest_gps(
    data: GPSData,
) -> GPSResponse:
    """Receive a GPS reading from a Raspberry Pi device.

    The reading is stored and immediately broadcast to any WebSocket
    subscribers watching this device.
    """
    subscribers = await gps_store.update(data)
    logger.info(
        "GPS update from %s  (%.6f, %.6f) → %d subscribers",
        data.device_id,
        data.latitude,
        data.longitude,
        subscribers,
    )
    return GPSResponse(
        device_id=data.device_id,
        subscribers=subscribers,
    )


# ---------------------------------------------------------------------------
# NMEA ingest — Pi forwards raw NMEA sentences
# ---------------------------------------------------------------------------


@router.post("/gps/nmea", response_model=GPSResponse, status_code=status.HTTP_201_CREATED)
async def ingest_nmea(
    data: NMEARequest,
) -> GPSResponse:
    """Receive raw NMEA sentences from a Raspberry Pi device.

    Parses $GNRMC and $GNGGA sentences, extracts GPS data, stores it,
    and broadcasts to WebSocket subscribers.
    """
    result = parse_nmea(data.nmea)
    if not result.valid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No valid fix found in NMEA data",
        )

    gps = GPSData(**result.to_dict(data.device_id))
    subscribers = await gps_store.update(gps)
    logger.info(
        "NMEA update from %s  (%.6f, %.6f) → %d subscribers",
        data.device_id,
        gps.latitude,
        gps.longitude,
        subscribers,
    )
    return GPSResponse(
        device_id=data.device_id,
        subscribers=subscribers,
    )


# ---------------------------------------------------------------------------
# Telemetry — heartbeats from the QNX traffic-AI app
# ---------------------------------------------------------------------------


@router.post("/telemetry", status_code=status.HTTP_201_CREATED)
async def ingest_telemetry(heartbeat: TelemetryHeartbeat) -> dict:
    """Receive a telemetry heartbeat from the Pi.

    The heartbeat is stored, relayed to WebSocket subscribers (as
    "type": "telemetry"), any embedded GPS fix is mirrored into the GPS
    store, and a newly raised rider alert is broadcast as an event. The
    crash watchdog uses the heartbeat cadence: a stream that stops while
    the rider was moving raises a crash event.
    """
    subscribers = await telemetry_store.update(heartbeat)
    return {
        "status": "ok",
        "device": heartbeat.device,
        "seq": heartbeat.seq,
        "subscribers": subscribers,
    }


@router.get("/telemetry/{device_id}/latest", response_model=TelemetryStatus)
async def get_latest_telemetry(device_id: str) -> TelemetryStatus:
    """Return the most recent heartbeat (and crash state) for a device."""
    latest = telemetry_store.get_latest(device_id)
    if latest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No telemetry for device '{device_id}'",
        )
    return latest


@router.get("/telemetry/devices")
async def list_telemetry_devices() -> list[dict]:
    """Return heartbeat status for all devices that have reported."""
    return telemetry_store.list_devices()


# ---------------------------------------------------------------------------
# Events — crash detection, alerts, etc.
# ---------------------------------------------------------------------------


@router.post("/events", status_code=status.HTTP_201_CREATED)
async def report_event(event: DeviceEvent) -> dict:
    """Receive an event from a Pi device (crash, low battery, etc.).

    The event is broadcast to all WebSocket subscribers of the device.
    """
    subscribers = await gps_store.broadcast_event(event)
    logger.warning(
        "Event from %s: %s — %s → %d subscribers",
        event.device_id,
        event.event_type.value,
        event.message or "(no message)",
        subscribers,
    )
    return {
        "status": "ok",
        "device_id": event.device_id,
        "event_type": event.event_type.value,
        "subscribers": subscribers,
    }


# ---------------------------------------------------------------------------
# Polling fallback — get last known location
# ---------------------------------------------------------------------------


@router.get("/gps/{device_id}/latest", response_model=GPSData)
async def get_latest(device_id: str) -> GPSData:
    """Return the most recent GPS reading for a device."""
    data = gps_store.get_latest(device_id)
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No GPS data for device '{device_id}'",
        )
    return data


# ---------------------------------------------------------------------------
# Device list
# ---------------------------------------------------------------------------


@router.get("/gps/devices")
async def list_devices() -> list[dict]:
    """Return a list of all devices that have reported GPS data."""
    return gps_store.list_devices()


# ---------------------------------------------------------------------------
# WebSocket — real-time relay to React Native app
# ---------------------------------------------------------------------------


@router.websocket("/ws/gps/{device_id}")
async def gps_websocket(websocket: WebSocket, device_id: str) -> None:
    """Stream GPS updates and events for *device_id* to connected clients.

    The client connects and receives JSON messages whenever the device
    sends a new GPS reading or triggers an event. GPS messages have no
    "type" field; events have "type": "event".
    """
    await manager.subscribe(device_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected from device %s", device_id)
    finally:
        manager.unsubscribe(device_id, websocket)
