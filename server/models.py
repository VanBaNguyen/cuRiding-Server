"""Pydantic models for GPS data."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class GPSData(BaseModel):
    """GPS reading sent by a Raspberry Pi device."""

    device_id: str = Field(..., description="Unique identifier for the Pi device")
    latitude: float = Field(..., ge=-90, le=90, description="Latitude in decimal degrees")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude in decimal degrees")
    altitude: Optional[float] = Field(None, description="Altitude in meters above sea level")
    speed: Optional[float] = Field(None, ge=0, description="Speed in m/s")
    heading: Optional[float] = Field(None, ge=0, lt=360, description="Heading in degrees from true north")
    accuracy: Optional[float] = Field(None, ge=0, description="Horizontal accuracy in meters")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="UTC timestamp of the GPS reading",
    )


class GPSResponse(BaseModel):
    """Response returned after storing a GPS reading."""

    status: str = "ok"
    device_id: str
    subscribers: int = Field(
        ..., description="Number of WebSocket clients currently listening"
    )


class DeviceInfo(BaseModel):
    """Summary info for a tracked device."""

    device_id: str
    last_seen: datetime
    latitude: float
    longitude: float
