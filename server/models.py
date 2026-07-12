"""Pydantic models for GPS data and device events."""

from datetime import datetime
from enum import Enum
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
    accuracy: Optional[float] = Field(None, ge=0, description="HDOP or horizontal accuracy in meters")
    satellites: Optional[int] = Field(None, ge=0, description="Number of satellites in use")
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


class NMEARequest(BaseModel):
    """Raw NMEA sentences from the Pi."""

    device_id: str = Field(..., description="Unique identifier for the Pi device")
    nmea: str = Field(..., description="One or more newline-separated NMEA sentences")


class EventType(str, Enum):
    """Types of device events."""

    CRASH = "crash"
    LOW_BATTERY = "low_battery"
    GEOFENCE_EXIT = "geofence_exit"
    DEVICE_OFFLINE = "device_offline"
    CUSTOM = "custom"


class DeviceEvent(BaseModel):
    """An event reported by a Pi device."""

    device_id: str = Field(..., description="Device that triggered the event")
    event_type: EventType = Field(..., description="Type of event")
    message: Optional[str] = Field(None, description="Human-readable description")
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    speed: Optional[float] = Field(None, ge=0, description="Speed at time of event in m/s")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="UTC timestamp of the event",
    )


class DeviceInfo(BaseModel):
    """Summary info for a tracked device."""

    device_id: str
    last_seen: datetime
    latitude: float
    longitude: float
