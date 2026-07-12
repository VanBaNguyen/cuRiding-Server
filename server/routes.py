"""API routes for GPS ingest and relay."""

import logging

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, status

from models import GPSData, GPSResponse
from store import gps_store, manager

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
    """Stream GPS updates for *device_id* to connected clients.

    The client connects and receives JSON messages whenever the device
    sends a new GPS reading.  The connection stays open until the client
    disconnects.
    """
    await manager.subscribe(device_id, websocket)
    try:
        # Keep the connection alive — wait for client to disconnect.
        # We also accept incoming messages so the client can send pings or
        # control messages in the future.
        while True:
            # This blocks until the client sends something or disconnects.
            await websocket.receive_text()
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected from device %s", device_id)
    finally:
        manager.unsubscribe(device_id, websocket)
