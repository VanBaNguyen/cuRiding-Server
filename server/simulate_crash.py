#!/usr/bin/env python3
"""Simulate a crash by heartbeating like the Pi, then stopping.

The app treats heartbeat loss as a crash:
  ~10s after the last heartbeat  -> online flips false, crash countdown starts
  ~30s after the last heartbeat  -> server watchdog broadcasts a crash event

Also POSTs GPS under the app device id so the map has a position.

Usage:
    # Start local server first:  cd server && python main.py

    # Send 15 heartbeats (1 Hz) then stop — watch the app countdown
    python simulate_crash.py

    # Keep heartbeating until you Ctrl+C, then wait for the countdown
    python simulate_crash.py --forever

    # Point at production
    python simulate_crash.py --server https://curiding2.akramb.com
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

DEFAULT_SERVER = "http://localhost:8000"
APP_DEVICE = "scooter"
TELEMETRY_DEVICE = "qnx-traffic-ai"


def post_json(url: str, payload: dict) -> None:
    body = json.dumps(payload).encode()
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        resp.read()


def heartbeat(seq: int, speed_kmh: float = 18.0) -> dict:
    return {
        "device": TELEMETRY_DEVICE,
        "seq": seq,
        "uptimeMs": seq * 1000,
        "speedKmh": speed_kmh,
        "trafficLight": "GREEN",
        "alert": "",
        "gps": {"valid": False, "lat": None, "lon": None, "courseDeg": 0, "sats": 0},
    }


def gps_fix(lat: float, lon: float, speed_ms: float = 5.0) -> dict:
    return {
        "device_id": APP_DEVICE,
        "latitude": lat,
        "longitude": lon,
        "speed": speed_ms,
        "heading": 90.0,
        "satellites": 7,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Simulate heartbeat disconnect crash")
    parser.add_argument("--server", default=DEFAULT_SERVER, help="Server base URL")
    parser.add_argument(
        "--count",
        type=int,
        default=15,
        help="Heartbeats to send before stopping (default: 15)",
    )
    parser.add_argument(
        "--forever",
        action="store_true",
        help="Heartbeat until Ctrl+C, then let the disconnect trigger the crash",
    )
    parser.add_argument("--lat", type=float, default=45.382, help="GPS latitude")
    parser.add_argument("--lon", type=float, default=-75.699, help="GPS longitude")
    args = parser.parse_args()

    base = args.server.rstrip("/")
    telemetry_url = f"{base}/api/v1/telemetry"
    gps_url = f"{base}/api/v1/gps"

    print(f"Server: {base}")
    print(f"App device id: {APP_DEVICE}")
    print("Seeding GPS position...")
    try:
        post_json(gps_url, gps_fix(args.lat, args.lon))
    except urllib.error.URLError as exc:
        print(f"GPS post failed: {exc}", file=sys.stderr)
        return 1

    seq = 0
    try:
        if args.forever:
            print("Sending heartbeats at 1 Hz — press Ctrl+C to simulate disconnect...")
            while True:
                post_json(telemetry_url, heartbeat(seq))
                print(f"  heartbeat seq={seq}", end="\r")
                seq += 1
                time.sleep(1)
        else:
            print(f"Sending {args.count} heartbeats at 1 Hz, then stopping...")
            for seq in range(args.count):
                post_json(telemetry_url, heartbeat(seq))
                print(f"  heartbeat seq={seq}")
                time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopped heartbeats.")
    except urllib.error.URLError as exc:
        print(f"Telemetry post failed: {exc}", file=sys.stderr)
        return 1

    print("")
    print("Heartbeats stopped. On the app you should see:")
    print("  ~10s  — unit goes offline, 30s crash countdown starts")
    print("  ~30s  — server also broadcasts a crash event")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
