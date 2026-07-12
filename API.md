# cuRiding API — app-facing reference

Everything the mobile app needs: live position, telemetry/alerts, crash
detection, live camera, and crash/manual clips.

- **Base URL (through the tunnel):** `https://curiding2.akramb.com`
- **WebSockets:** `wss://curiding2.akramb.com` — use `wss`/`https` (Cloudflare
  terminates TLS; the app should never use `ws`/`http` over the tunnel).
- **One device:** everything is published under a single device id
  (`APP_DEVICE_ID`, default `scooter`). Set it to whatever your app uses.

The app can be **WebSocket-only** — every live feed has a WS endpoint that
sends the current value on connect, then pushes updates. The REST/HTTPS
endpoints are conveniences (one-shot fetches, plain `<img>` URLs).

---

## 1. Live position + events  (the map)

`wss://curiding2.akramb.com/api/v1/ws/gps/scooter`

Sends the last known position on connect, then pushes updates. Three message
shapes on this channel:

```jsonc
// GPS update (no "type" field) — the scooter's location
{ "device_id": "scooter", "latitude": 45.382, "longitude": -75.699,
  "speed": 5.1, "heading": 92.0, "satellites": 7, "timestamp": "..." }

// event — rider alerts, crash, recovery
{ "type": "event", "event_type": "crash", "message": "...", "timestamp": "..." }
```

`event_type` is one of `crash`, `custom` (rider alerts like "CAR AHEAD"),
`low_battery`, `geofence_exit`, `device_offline`.

Position comes from the Find My BLE tag (or a GPS module if attached).

REST fallback: `GET /api/v1/gps/scooter/latest`, `GET /api/v1/gps/devices`.

---

## 2. Status  (name, hardware, last heartbeat, last position, online)

`wss://curiding2.akramb.com/api/v1/ws/status` — pushes every ~2s.

```jsonc
{
  "type": "status",
  "app_device_id": "scooter",
  "name": "cuRiding Scooter",
  "hardware": "Raspberry Pi 5 (QNX 8) + ESP32-C3 Find My tag",
  "online": true,
  "heartbeat": { "age_seconds": 0.8, "seq": 42, "speedKmh": 18.5,
                 "alert": "", "crash_suspected": false },
  "position": { "age_seconds": 12.3, "latitude": 45.382, "longitude": -75.699 }
}
```

`online` is true when a heartbeat arrived within `HEARTBEAT_ONLINE_S` (10s).
`age_seconds` on each block lets you show "updated Ns ago".

### ⚠️ Treat missing heartbeats as a problem, not just "no data"

The scooter sends a heartbeat about **once per second** while it's alive.
So heartbeats are the liveness signal — their *absence* is meaningful:

- **`online: false`** (or `heartbeat.age_seconds` climbing past ~10s) means the
  scooter has **stopped reporting**: it lost power, the network dropped, the
  app died, or the rider crashed. The app should surface this as a visible
  **warning state** ("Scooter offline / not reporting"), not silently show
  stale data.
- If the scooter was **moving** when heartbeats stopped, that's the crash /
  theft signal. The server raises a `crash` event automatically (see the
  events on `/ws/gps/scooter`) and saves a pre-crash clip — but the app
  should *also* independently flag a prolonged offline even if no crash event
  arrived (e.g. a total power loss can cut the connection before the watchdog
  fires).
- **`heartbeat: null`** means the scooter has never reported since the server
  started — show "no device" / "waiting for scooter".

Practical rule for the app: **green when `online` is true and the age is
small; amber/red when it goes false or the age keeps growing.** A live map dot
with silently frozen telemetry is worse than an explicit "offline" badge.

REST: `GET /api/v1/status`.

---

## 3. Live camera

`wss://curiding2.akramb.com/api/v1/ws/snapshot` — sends the latest frame on
connect, then each new frame (~every 2s):

```jsonc
{ "type": "snapshot", "ts": "...", "age_seconds": 0.3, "jpeg_b64": "<base64 JPEG>" }
```

Render `jpeg_b64` as a data URI: `data:image/jpeg;base64,<jpeg_b64>`.

REST (plain `<img>`): `GET /api/v1/snapshot` → returns `image/jpeg`.

---

## 4. Clips — crash recordings + record button

Every camera frame is buffered (rolling ~30s). A crash saves the pre-crash
footage automatically; the user can also record manually.

### Record button
```
POST /api/v1/recording/start   -> { "status": "recording" }
POST /api/v1/recording/stop    -> { "status": "saved", "clip_id": "..." }
GET  /api/v1/recording         -> { "recording": true|false }
```
The recording includes a few seconds from **before** Start was pressed
(seeded from the pre-crash buffer).

### Simulate a crash (for testing/demo)
```
POST /api/v1/crash/simulate    -> { "status": "ok", "clip_id": "..." }
```
Saves the pre-crash clip and broadcasts a `crash` event, exactly like a real
detected crash. Real crashes (heartbeats stop while moving) do this
automatically.

### List + play clips
```
GET /api/v1/clips
  -> [ { "id": "20260712-150047-crash", "reason": "crash",
         "created_at": "...", "frame_count": 15, "duration_s": 28.0 }, ... ]

GET /api/v1/clips/{id}                 -> clip metadata
GET /api/v1/clips/{id}/frames          -> { "frame_count": N,
                                            "frames": ["<base64 jpeg>", ...] }
GET /api/v1/clips/{id}/frame/{n}       -> image/jpeg (single frame)
```
`reason` is `crash`, `crash-sim`, or `manual`. To play a clip, step through
`frames` (base64) as an animation, or point an `<img>` at `/frame/{n}`.

### Live "new clip" notifications
`wss://curiding2.akramb.com/api/v1/ws/clips` — on connect sends the clip list;
then pushes a message whenever a clip is saved (so a crash clip appears in the
app instantly):
```jsonc
{ "type": "clips", "clips": [ ...meta... ] }              // on connect
{ "type": "clip", "id": "...", "reason": "crash", ... }   // on each new clip
```

---

## 5. Device ingest (Pi → server, for reference)

The QNX app posts these; the app doesn't call them.

```
POST /api/v1/telemetry   1 Hz heartbeat: {device, seq, uptimeMs, speedKmh,
                         trafficLight, alert, gps:{valid,lat,lon,courseDeg,sats}}
POST /api/v1/snapshot    raw image/jpeg body — a camera frame
```

---

## Config (`server/.env`)

| Var | Default | Meaning |
|-----|---------|---------|
| `APP_DEVICE_ID` | `scooter` | device id the app subscribes to |
| `APP_DEVICE_NAME` | cuRiding Scooter | shown in status |
| `APP_DEVICE_HARDWARE` | Pi 5 … tag | shown in status |
| `CRASH_GAP_S` | 30 | heartbeat silence (s) to flag a crash |
| `CRASH_MIN_SPEED_KMH` | 5 | min last-known speed for a crash |
| `PRECRASH_FRAMES` | 15 | frames of pre-crash footage (~30s) |
| `MAX_CLIPS` | 50 | clips kept before pruning oldest |
| `HAYSTACK_*` | — | Find My tag (see HAYSTACK_SETUP.md) |
