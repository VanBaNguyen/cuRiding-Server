# cuRiding-Server

GPS relay server for cuRiding. Receives real-time GPS coordinates and events from Raspberry Pi 5 devices running QNX and pushes them to a React Native mobile app.

## Architecture

```
RPi 5 (QNX) --POST /api/v1/gps/nmea--> FastAPI Server --WebSocket /api/v1/ws/gps/{device_id}--> React Native App
```

The Pi posts raw NMEA sentences or structured GPS data over HTTP. The server stores the latest position per device in memory and immediately broadcasts it to any connected WebSocket clients. A polling endpoint is also available as a fallback.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/gps` | Receive structured GPS data |
| POST | `/api/v1/gps/nmea` | Receive and parse raw NMEA sentences |
| POST | `/api/v1/events` | Receive device events (e.g., crash detection) |
| GET | `/api/v1/gps/{device_id}/latest` | Get last known location |
| GET | `/api/v1/gps/devices` | List all active devices |
| WS | `/api/v1/ws/gps/{device_id}` | Real-time GPS and event stream |
| GET | `/health` | Liveness check |

## Setup

### Using Docker (Recommended)

```bash
docker compose up -d
```
The server will be available at `http://localhost:8000`.

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

See `server/examples/qnx_client_example.c` for a POSIX C client (no dependencies) and `server/examples/qnx_client_example.py` for a stdlib-only Python client. Both scripts read NMEA data from the serial port and POST it to the server.

## Project Structure

```
.github/workflows/   - CI/CD pipelines
docker-compose.yml   - Docker compose configuration
server/
  Dockerfile         - Docker image definition
  main.py            - FastAPI app, CORS, uvicorn
  config.py          - Settings from .env
  models.py          - Pydantic GPS models
  store.py           - In-memory store + WebSocket manager
  routes.py          - All API endpoints
  nmea.py            - NMEA sentence parser
  examples/          - C and Python QNX clients
```