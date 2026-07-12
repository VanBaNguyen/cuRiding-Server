#!/usr/bin/env python3
"""Example GPS client for Raspberry Pi 5 running QNX.

Uses only the standard library (urllib) so there are no pip dependencies
to install on the embedded QNX system.

Forwards raw NMEA sentences from the GPS serial port to the server,
which handles all the parsing. Can also send events (e.g. crash).

Usage:
    python3 qnx_client_example.py
"""

import json
import time
import urllib.request
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# Configuration — adjust for your deployment
# ---------------------------------------------------------------------------
SERVER_URL = "http://<server-ip>:8000/api/v1"
DEVICE_ID = "pi-001"
SEND_INTERVAL_S = 1  # seconds between GPS posts


def post_json(endpoint: str, payload: dict) -> None:
    """POST JSON to a server endpoint."""
    url = f"{SERVER_URL}{endpoint}"
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            body = json.loads(resp.read().decode("utf-8"))
            print(f"[OK] {resp.status}  {body}")
    except Exception as exc:
        print(f"[ERR] {exc}")


def send_nmea(nmea_lines: str) -> None:
    """Forward raw NMEA sentences to the server for parsing."""
    post_json("/gps/nmea", {
        "device_id": DEVICE_ID,
        "nmea": nmea_lines,
    })


def send_event(event_type: str, message: str, lat: float = None, lon: float = None) -> None:
    """Send an event (crash, low battery, etc.) to the server."""
    payload = {
        "device_id": DEVICE_ID,
        "event_type": event_type,
        "message": message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    if lat is not None and lon is not None:
        payload["latitude"] = lat
        payload["longitude"] = lon
    post_json("/events", payload)


# ---------------------------------------------------------------------------
# Main loop — replace with real serial reads on QNX
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print(f"Sending GPS to {SERVER_URL} as device '{DEVICE_ID}'")

    # Simulated NMEA sentences (replace with serial port reads)
    # On QNX you would read from e.g. /dev/ser1:
    #
    #   import serial  # or use open('/dev/ser1', 'r')
    #   ser = serial.Serial('/dev/ser1', 9600)
    #   while True:
    #       line = ser.readline().decode('ascii').strip()
    #       send_nmea(line)
    #
    sample_nmea = (
        "$GNRMC,201530.00,A,4525.1234,N,07541.5678,W,12.4,83.2,110726,,,A*6F\n"
        "$GNGGA,201530.00,4525.1234,N,07541.5678,W,1,09,0.9,82.4,M,-34.0,M,,*5A"
    )

    while True:
        send_nmea(sample_nmea)
        time.sleep(SEND_INTERVAL_S)

    # --- Example: sending a crash event ---
    # send_event("crash", "Impact detected — 4.2g", lat=45.4189, lon=-75.6945)
