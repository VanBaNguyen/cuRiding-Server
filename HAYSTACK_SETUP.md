# Find My tracking setup (macless-haystack)

From zero to seeing the scooter on the map. One-time setup, ~20 minutes,
most of it waiting on Apple.

Everything runs from this repo's `docker-compose.yml`, which starts three
containers:

| Container | Job |
|-----------|-----|
| `curiding-server` | The FastAPI relay (this repo) |
| `curiding-anisette` | Fakes the Apple device attestation headers |
| `curiding-haystack` | Logs into Apple with your (burner) Apple ID and serves the tag's encrypted location reports on port 6176 (internal only) |

The server polls `curiding-haystack` once a minute, decrypts the reports
with the tag's private key, and publishes the position as device
**`scooter-tag`** on the normal GPS endpoints and WebSocket.

## Prerequisites

- The flashed BLE tag (already done — XIAO ESP32-C3, beaconing every 60 s)
- The key file `scooter.keys` produced by `generate_keys.py` when the tag
  was flashed (contains the private key — treat it like a password)
- A **burner Apple ID**. Make a fresh one at appleid.apple.com with a
  phone number that can receive SMS. Do not use your real account:
  accounts used this way occasionally get flagged/locked.

## Steps

### 1. Configure

```bash
cp server/.env.example server/.env
```

The haystack defaults in `.env.example` already point at the compose
containers — you only need to touch them if you renamed things. Then put
the key file in place:

```bash
mkdir -p secrets
cp /path/to/scooter.keys secrets/     # gitignored, mounted read-only into the server
```

### 2. Start the stack

```bash
docker compose up -d
```

### 3. First-run Apple login (one time only)

The haystack container prompts for the Apple ID on its stdin the first
time it starts (and again only if the stored auth expires):

```bash
docker attach curiding-haystack
```

Enter the burner Apple ID email and password, then the SMS 2FA code when
asked. When it settles into serving mode, detach **without killing it**
using `Ctrl-p` then `Ctrl-q` (plain Ctrl-C stops the container).

Auth is stored in the `mh_data` volume, so restarts don't ask again.

### 4. Verify

```bash
docker compose logs -f server | grep -i haystack
```

You want to see `Haystack poller running: ...` at startup and, once
Apple has reports for the tag, lines like:

```
Haystack fix for scooter-tag (45.421530, -75.697193) at 2026-07-12T...
```

Then check the API:

```bash
curl http://localhost:8000/api/v1/gps/scooter-tag/latest
```

### 5. Point the Pi at the server

On the scooter (QNX app environment):

```bash
TELEMETRY_URL=https://<your-host>/api/v1/telemetry
```

That's the heartbeat/crash-detection side — independent of Find My, but
together they make the full picture: heartbeats say *alive/crashed*,
`scooter-tag` says *where*.

## Expectations & troubleshooting

- **First reports can take a while.** The tag must be heard by a passing
  iPhone, which uploads on its own schedule; minutes to hours. Dense
  areas (campus) work great, empty parking lots at night don't.
- **404 on `/gps/scooter-tag/latest`** = no reports decrypted yet. Check
  the server logs; if the poller logs auth errors, redo step 3.
- **`Haystack poll failed` in logs** = the haystack container isn't up
  or isn't logged in. `docker compose ps`, then `docker attach` and see
  what it wants.
- **Apple ID locked** = make a new burner, `docker volume rm` the
  `mh_data` volume, redo step 3. The tag and keys are unaffected.
- The tag key file never leaves the server container; only the hashed
  advertisement key (a public value) is ever sent to Apple's servers.
