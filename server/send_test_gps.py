#!/usr/bin/env python3
"""Send a test GPS location from the server to the app.

This simulates what a Raspberry Pi device would do: it POSTs GPS readings
to the running server's ingest endpoint, which then broadcasts them in
real-time over WebSocket to any connected React Native app.

Flow:  this script --> POST /api/v1/gps --> server broadcast --> app map

The device_id MUST match the one the app subscribes to (see
frontend/src/data/mockTelemetry.ts -> MOCK_DEVICE.id).

Usage:
    # Send a single point (defaults to Ottawa / Rideau Canal)
    python send_test_gps.py

    # Continuously "drive" along a short path so the map animates
    python send_test_gps.py --move

    # Point at a server on the LAN instead of localhost
    python send_test_gps.py --server http://172.17.143.0:8000 --move

    # Send one custom coordinate
    python send_test_gps.py --lat 45.4245 --lon -75.6942 --speed 6.5
"""

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

# Must match MOCK_DEVICE.id in the frontend so the app receives the broadcast.
DEFAULT_DEVICE_ID = "cu-pi5-0a3f"
DEFAULT_SERVER = "http://localhost:8000"

# A short loop around the Rideau Canal in Ottawa (lat, lon, speed m/s).
CANAL_PATH = [
    (45.4215, -75.6972, 3.3),
    (45.4222, -75.6965, 5.0),
    (45.4230, -75.6958, 6.1),
    (45.4238, -75.6950, 6.9),
    (45.4245, -75.6942, 5.5),
    (45.4252, -75.6935, 4.4),
    (45.4260, -75.6928, 3.9),
    (45.4268, -75.6920, 5.3),
    (45.4275, -75.6912, 6.4),
    (45.4282, -75.6905, 4.7),
]


def post_gps(server: str, device_id: str, lat: float, lon: float, speed: float) -> bool:
    """POST a single GPS reading to the server. Returns True on success."""
    url = f"{server.rstrip('/')}/api/v1/gps"
    payload = {
        "device_id": device_id,
        "latitude": lat,
        "longitude": lon,
        "speed": speed,
        "heading": 0.0,
        "satellites": 9,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
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
            subs = body.get("subscribers", 0)
            flag = "" if subs else "  (no app connected yet!)"
            print(f"[OK] ({lat:.5f}, {lon:.5f})  ->  {subs} subscriber(s){flag}")
            return True
    except urllib.error.URLError as exc:
        print(f"[ERR] Could not reach {url}: {exc}")
        print("      Is the server running?  cd server && python main.py")
        return False
    except Exception as exc:  # noqa: BLE001
        print(f"[ERR] {exc}")
        return False


def main() -> int:
    parser = argparse.ArgumentParser(description="Send test GPS data to the cuRiding server.")
    parser.add_argument("--server", default=DEFAULT_SERVER, help="Base server URL (default: %(default)s)")
    parser.add_argument("--device-id", default=DEFAULT_DEVICE_ID, help="Device ID the app listens for (default: %(default)s)")
    parser.add_argument("--lat", type=float, default=45.4215, help="Latitude for a single reading")
    parser.add_argument("--lon", type=float, default=-75.6972, help="Longitude for a single reading")
    parser.add_argument("--speed", type=float, default=4.0, help="Speed in m/s for a single reading")
    parser.add_argument("--move", action="store_true", help="Continuously drive along a path instead of one point")
    parser.add_argument("--interval", type=float, default=1.0, help="Seconds between points when using --move")
    args = parser.parse_args()

    print(f"Server:    {args.server}")
    print(f"Device ID: {args.device_id}")
    print("-" * 48)

    if not args.move:
        ok = post_gps(args.server, args.device_id, args.lat, args.lon, args.speed)
        return 0 if ok else 1

    print("Driving along the Rideau Canal loop. Press Ctrl+C to stop.\n")
    try:
        while True:
            for lat, lon, speed in CANAL_PATH:
                if not post_gps(args.server, args.device_id, lat, lon, speed):
                    return 1
                time.sleep(args.interval)
    except KeyboardInterrupt:
        print("\nStopped.")
        return 0


if __name__ == "__main__":
    sys.exit(main())
