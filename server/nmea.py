"""NMEA sentence parser.

Parses $GNRMC and $GNGGA sentences into structured GPS data.
Handles both GN (multi-constellation) and GP (GPS-only) prefixes.
"""

from datetime import datetime, timezone
from typing import Optional


def _nmea_to_decimal(raw: str, direction: str) -> float:
    """Convert NMEA coordinate (DDDMM.MMMM) to decimal degrees."""
    if not raw:
        return 0.0
    # Find the degree/minute split — minutes are always the last 2 digits
    # before the decimal point.
    dot = raw.index(".")
    degrees = float(raw[: dot - 2])
    minutes = float(raw[dot - 2 :])
    decimal = degrees + minutes / 60.0
    if direction in ("S", "W"):
        decimal = -decimal
    return round(decimal, 7)


def _knots_to_mps(knots: str) -> Optional[float]:
    """Convert speed in knots to meters per second."""
    if not knots:
        return None
    return round(float(knots) * 0.514444, 2)


def _parse_heading(heading: str) -> Optional[float]:
    """Parse heading/course in degrees."""
    if not heading:
        return None
    return round(float(heading), 2)


def _parse_altitude(alt: str) -> Optional[float]:
    """Parse altitude in meters."""
    if not alt:
        return None
    return round(float(alt), 2)


def _parse_hdop(hdop: str) -> Optional[float]:
    """Parse HDOP as a rough accuracy indicator."""
    if not hdop:
        return None
    return round(float(hdop), 2)


def _parse_timestamp(time_str: str, date_str: str = "") -> datetime:
    """Parse NMEA time (HHMMSS.SS) and optional date (DDMMYY) into UTC datetime."""
    if not time_str:
        return datetime.now(timezone.utc)

    hour = int(time_str[0:2])
    minute = int(time_str[2:4])
    second = int(float(time_str[4:]))

    if date_str and len(date_str) == 6:
        day = int(date_str[0:2])
        month = int(date_str[2:4])
        year = 2000 + int(date_str[4:6])
    else:
        now = datetime.now(timezone.utc)
        day, month, year = now.day, now.month, now.year

    return datetime(year, month, day, hour, minute, second, tzinfo=timezone.utc)


class NMEAResult:
    """Accumulated result from parsing one or more NMEA sentences."""

    def __init__(self) -> None:
        self.latitude: Optional[float] = None
        self.longitude: Optional[float] = None
        self.altitude: Optional[float] = None
        self.speed: Optional[float] = None
        self.heading: Optional[float] = None
        self.accuracy: Optional[float] = None
        self.satellites: Optional[int] = None
        self.timestamp: Optional[datetime] = None
        self.valid: bool = False

    def to_dict(self, device_id: str) -> dict:
        """Convert to a dict matching the GPSData model."""
        return {
            "device_id": device_id,
            "latitude": self.latitude or 0.0,
            "longitude": self.longitude or 0.0,
            "altitude": self.altitude,
            "speed": self.speed,
            "heading": self.heading,
            "accuracy": self.accuracy,
            "satellites": self.satellites,
            "timestamp": self.timestamp or datetime.now(timezone.utc),
        }


def parse_nmea(sentences: str) -> NMEAResult:
    """Parse one or more NMEA sentences.

    Accepts a string containing one or more newline-separated NMEA sentences.
    Merges data from all recognised sentences (RMC + GGA) into a single result.

    Args:
        sentences: Raw NMEA string, e.g. from serial port.

    Returns:
        NMEAResult with all parsed fields populated.
    """
    result = NMEAResult()

    for line in sentences.strip().splitlines():
        line = line.strip()
        if not line.startswith("$"):
            continue

        # Strip checksum
        if "*" in line:
            line = line[: line.index("*")]

        parts = line.split(",")
        sentence_type = parts[0]

        # Accept both GP and GN prefixes
        tag = sentence_type[3:] if len(sentence_type) >= 5 else ""

        if tag == "RMC" and len(parts) >= 10:
            _parse_rmc(parts, result)
        elif tag == "GGA" and len(parts) >= 13:
            _parse_gga(parts, result)

    return result


def _parse_rmc(parts: list[str], result: NMEAResult) -> None:
    """Parse $GxRMC — Recommended Minimum.

    Fields: $GxRMC,time,status,lat,N/S,lon,E/W,speed,heading,date,mag_var,E/W,mode
    """
    status = parts[2]
    if status != "A":
        return  # V = void / invalid fix

    result.valid = True
    result.latitude = _nmea_to_decimal(parts[3], parts[4])
    result.longitude = _nmea_to_decimal(parts[5], parts[6])
    result.speed = _knots_to_mps(parts[7])
    result.heading = _parse_heading(parts[8])
    result.timestamp = _parse_timestamp(parts[1], parts[9])


def _parse_gga(parts: list[str], result: NMEAResult) -> None:
    """Parse $GxGGA — Global Positioning System Fix Data.

    Fields: $GxGGA,time,lat,N/S,lon,E/W,quality,sats,hdop,alt,M,geoid,M,age,ref
    """
    fix_quality = parts[6]
    if fix_quality == "0":
        return  # No fix

    result.valid = True
    result.latitude = _nmea_to_decimal(parts[2], parts[3])
    result.longitude = _nmea_to_decimal(parts[4], parts[5])
    result.altitude = _parse_altitude(parts[9])
    result.accuracy = _parse_hdop(parts[8])

    if parts[7]:
        result.satellites = int(parts[7])

    if result.timestamp is None:
        result.timestamp = _parse_timestamp(parts[1])
