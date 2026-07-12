# cuRiding-Server

Relay server for cuRiding. Receives telemetry heartbeats and events from Raspberry Pi 5 devices running QNX, tracks the scooter's Find My BLE tag via macless-haystack, and pushes everything to a React Native mobile app in real time.

## Architecture

```
RPi 5 (QNX) --POST /api/v1/telemetry (1 Hz heartbeats)--\
                                                         FastAPI Server --WS /api/v1/ws/gps/{device_id}--> React Native App
BLE tag -> iPhones -> Apple --macless-haystack----------/
```

Two independent data sources:

- **Telemetry heartbeats** — the Pi's traffic-AI app POSTs one JSON heartbeat per second: speed, GPS fix (if a module is attached), detected traffic-light state, and any active rider alert. A heartbeat stream that **stops while the rider was moving raises a crash event** (the Pi has no cellular; silence is the signal).
- **Find My tag** — the scooter carries an OpenHaystack-compatible BLE tag. Passing iPhones report its encrypted position to Apple; the bundled `macless-haystack` container fetches those reports, and the server decrypts them with the tag's private key and feeds them into the same GPS store, so the app sees tag positions through the normal GPS endpoints under the `scooter-tag` device id.

The legacy NMEA/GPS ingest endpoints remain for devices that post GPS directly.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/telemetry` | Receive a heartbeat from the Pi (see payload below) |
| GET | `/api/v1/telemetry/{device_id}/latest` | Last heartbeat + crash state |
| GET | `/api/v1/telemetry/devices` | Heartbeat status of all devices |
| POST | `/api/v1/gps` | Receive structured GPS data |
| POST | `/api/v1/gps/nmea` | Receive and parse raw NMEA sentences |
| POST | `/api/v1/events` | Receive device events (e.g., crash detection) |
| GET | `/api/v1/gps/{device_id}/latest` | Get last known location |
| GET | `/api/v1/gps/devices` | List all active devices |
| WS | `/api/v1/ws/gps/{device_id}` | Real-time GPS, telemetry and event stream |
| GET | `/health` | Liveness check |

### Telemetry heartbeat payload (what the Pi sends)

```json
{
  "device": "qnx-traffic-ai",
  "seq": 42,
  "uptimeMs": 123456,
  "speedKmh": 18.5,
  "trafficLight": "GREEN",
  "alert": "",
  "gps": {"valid": true, "lat": 45.4215, "lon": -75.6972, "courseDeg": 92.0, "sats": 7}
}
```

`speedKmh` is negative when unknown; `gps.valid` is false when no GPS module is attached. Timestamps are assigned server-side on arrival.

### WebSocket messages

Subscribers of `/api/v1/ws/gps/{device_id}` receive three message shapes:

- GPS updates — no `type` field (unchanged from before)
- `{"type": "telemetry", ...heartbeat fields..., "received_at": ...}` — every heartbeat
- `{"type": "event", "event_type": "crash" | "custom" | ..., "message": ...}` — rider alerts, crash suspicion, heartbeat recovery

## Setup

### Using Docker (Recommended)

```bash
cp server/.env.example server/.env       # then edit as needed
cp /path/to/scooter.keys secrets/        # tag keys from generate_keys.py (see below)
docker compose up -d
docker attach curiding-haystack          # FIRST RUN ONLY: enter the (burner) Apple ID + 2FA, then Ctrl-p Ctrl-q to detach
```

The server will be available at `http://localhost:8000`.

### Find My tag setup

1. Generate keys with [macless-haystack](https://github.com/dchristl/macless-haystack)'s `generate_keys.py` and flash the firmware + keyfile onto the tag (ESP32/ESP32-C3/nRF).
2. Drop the generated `PREFIX.keys` file into `./secrets/` (gitignored; contains the private key) and point `HAYSTACK_KEYFILE` at it in `server/.env`.
3. `docker compose up -d`, then on the very first start attach to `curiding-haystack` and complete the Apple ID login (use a burner account; SMS 2FA).
4. Tag locations appear as device `scooter-tag` (configurable via `HAYSTACK_DEVICE_ID`) in the GPS endpoints and WebSocket. Expect report latency of minutes to hours depending on iPhone traffic around the tag.

### Crash detection tuning

`CRASH_GAP_S` (default 30) and `CRASH_MIN_SPEED_KMH` (default 5) in `server/.env`: a device whose heartbeats stop for the gap while last moving at or above the speed threshold gets a `crash` event broadcast to its WebSocket subscribers. Heartbeats resuming broadcast a recovery event.

### Manual Setup

```bash
cd server
cp .env.example .env
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

API documentation is automatically generated at `http://localhost:8000/docs`.

## CI/CD

A GitHub Actions workflow is configured to automatically build and push the Docker image to the GitHub Container Registry (GHCR) on pushes to the `main` branch.

## Pi Client

The QNX traffic-AI app (`ai-camera-app`, branch `traffic-warning`) has the telemetry uploader built in — set `TELEMETRY_URL=https://<host>/api/v1/telemetry` (plus optional `TELEMETRY_TOKEN`, `TELEMETRY_INTERVAL_MS`) in its environment. See `server/examples/` for standalone NMEA clients.

## Project Structure

```
.github/workflows/   - CI/CD pipelines
docker-compose.yml   - Server + anisette + macless-haystack
secrets/             - Tag key file mount point (gitignored)
server/
  Dockerfile         - Docker image definition
  main.py            - FastAPI app, CORS, background tasks, uvicorn
  config.py          - Settings from .env
  models.py          - Pydantic GPS + telemetry models
  store.py           - In-memory store + WebSocket manager
  telemetry.py       - Heartbeat store + crash watchdog
  haystack.py        - Find My report polling + decryption
  routes.py          - All API endpoints
  nmea.py            - NMEA sentence parser
  examples/          - C and Python QNX clients
```
