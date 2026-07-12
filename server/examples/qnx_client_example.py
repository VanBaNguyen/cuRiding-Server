#!/usr/bin/env python3
"""Example GPS client for Raspberry Pi 5 running QNX.

Uses only the standard library (urllib) so there are no pip dependencies
to install on the embedded QNX system.

Usage:
    python3 qnx_client_example.py

Customise SERVER_URL and API_KEY for your deployment.  In production you
would read actual GPS data from a serial NMEA device (e.g. /dev/ser1) and
parse it, but this script shows the HTTP contract the server expects.
"""

import json
import time
import urllib.request
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# Configuration — adjust for your deployment
# ---------------------------------------------------------------------------
SERVER_URL = "http://<server-ip>:8000/api/v1/gps"
DEVICE_ID = "pi-001"
SEND_INTERVAL_S = 1  # seconds between GPS posts


def build_gps_payload(lat: float, lon: float) -> bytes:
    """Create a JSON GPS payload."""
    payload = {
        "device_id": DEVICE_ID,
        "latitude": lat,
        "longitude": lon,
        "altitude": 50.0,
        "speed": 0.0,
        "heading": 0.0,
        "accuracy": 2.5,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    return json.dumps(payload).encode("utf-8")


def send_gps(lat: float, lon: float) -> None:
    """POST a GPS reading to the relay server."""
    data = build_gps_payload(lat, lon)
    req = urllib.request.Request(
        SERVER_URL,
        data=data,
        headers={
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            body = json.loads(resp.read().decode("utf-8"))
            print(f"[OK] {resp.status}  subscribers={body.get('subscribers', '?')}")
    except Exception as exc:
        print(f"[ERR] {exc}")


# ---------------------------------------------------------------------------
# Main loop — replace with real GPS reads on QNX
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    # Simulate a slow drift along a straight line (Montreal area)
    lat, lon = 45.5017, -73.5673
    print(f"Sending GPS to {SERVER_URL} as device '{DEVICE_ID}'")
    while True:
        send_gps(lat, lon)
        # Simulate movement
        lat += 0.00001
        lon += 0.00001
        time.sleep(SEND_INTERVAL_S)
