# cuRiding-Server

GPS relay server for cuRiding. Receives real-time GPS coordinates from Raspberry Pi 5 devices running QNX and pushes them to a React Native mobile app.

## Architecture

```
RPi 5 (QNX) --POST /api/v1/gps--> FastAPI Server --WebSocket /api/v1/ws/gps/{device_id}--> React Native App
```

The Pi posts GPS readings over HTTP. The server stores the latest position per device in memory and immediately broadcasts it to any connected WebSocket clients. A polling endpoint is also available as a fallback.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/gps` | Receive GPS data from a Pi |
| GET | `/api/v1/gps/{device_id}/latest` | Get last known location |
| GET | `/api/v1/gps/devices` | List all active devices |
| WS | `/api/v1/ws/gps/{device_id}` | Real-time GPS stream |
| GET | `/health` | Liveness check |

## Setup

```bash
cd server
cp .env.example .env
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

Server starts on `http://0.0.0.0:8000`. API docs at `/docs`.

## GPS Payload

```json
{
  "device_id": "pi-001",
  "latitude": 45.5017,
  "longitude": -73.5673,
  "altitude": 50.0,
  "speed": 0.0,
  "heading": 0.0,
  "accuracy": 2.5,
  "timestamp": "2026-07-11T21:00:00Z"
}
```

`altitude`, `speed`, `heading`, `accuracy`, and `timestamp` are optional.

## Pi Client

See `server/examples/qnx_client_example.py` for a stdlib-only Python script that posts GPS data to the server. No pip dependencies required on QNX.

## Project Structure

```
server/
  main.py        - FastAPI app, CORS, uvicorn
  config.py      - Settings from .env
  models.py      - Pydantic GPS models
  store.py       - In-memory store + WebSocket manager
  routes.py      - All API endpoints
  examples/
    qnx_client_example.py
```