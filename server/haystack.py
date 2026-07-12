"""Find My location polling via a macless-haystack endpoint.

The scooter carries a BLE tag (ESP32/nRF running OpenHaystack-compatible
firmware). Nearby iPhones report its position, encrypted, to Apple. A
macless-haystack container fetches those reports; this module polls it,
decrypts the payloads with the tag's private key, and feeds the newest
position into the regular GPS store — so the mobile app receives tag
locations through the same endpoints and WebSocket as live GPS.

Report crypto (OpenHaystack scheme): each report carries an ephemeral P-224
public key; ECDH against the tag's private key + an X9.63 KDF yields an
AES-128-GCM key/IV for the 10-byte location blob (lat/lon as 1e-7 degrees,
confidence, status).
"""

import asyncio
import base64
import hashlib
import logging
from datetime import datetime, timezone
from typing import Optional, Tuple

import httpx
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from config import settings
from models import GPSData
from store import gps_store

logger = logging.getLogger(__name__)

# Apple epoch (2001-01-01) to Unix epoch offset, seconds
APPLE_EPOCH_OFFSET = 978307200

# mute repeated poll errors after this many consecutive failures
FAILURES_TO_MUTE = 3


def load_keys(keyfile_path: str) -> Tuple[str, str]:
    """Read the generate_keys.py output (PREFIX.keys format).

    Returns (private_key_b64, hashed_adv_key_b64). The hashed advertisement
    key — SHA-256 of the 28-byte public key — is the report id Apple indexes
    by; the private key decrypts the reports.
    """
    private_b64 = ""
    adv_b64 = ""
    hashed_b64 = ""
    with open(keyfile_path) as keyfile:
        for line in keyfile:
            label, _, value = line.partition(":")
            value = value.strip()
            if label == "Private key":
                private_b64 = value
            elif label == "Advertisement key":
                adv_b64 = value
            elif label == "Hashed adv key":
                hashed_b64 = value
    if not hashed_b64 and adv_b64:
        hashed_b64 = base64.b64encode(
            hashlib.sha256(base64.b64decode(adv_b64)).digest()
        ).decode()
    if not private_b64 or not hashed_b64:
        raise ValueError(f"Could not parse keys from {keyfile_path}")
    return private_b64, hashed_b64


def decrypt_report(payload_b64: str, private_key_b64: str) -> Tuple[int, float, float, int]:
    """Decrypt one Find My report payload.

    Returns (unix_timestamp, latitude, longitude, confidence).
    """
    data = base64.b64decode(payload_b64)
    # newer reports carry an extra status byte after the timestamp; strip it
    # so the fixed offsets below hold (classic layout is 88 bytes)
    if len(data) > 88:
        data = data[:4] + data[5:]

    timestamp = int.from_bytes(data[0:4], "big") + APPLE_EPOCH_OFFSET

    private_key = ec.derive_private_key(
        int.from_bytes(base64.b64decode(private_key_b64), "big"), ec.SECP224R1()
    )
    ephemeral_key = ec.EllipticCurvePublicKey.from_encoded_point(
        ec.SECP224R1(), data[5:62]
    )
    shared_secret = private_key.exchange(ec.ECDH(), ephemeral_key)

    # X9.63 KDF with a single round: SHA-256(secret || counter || eph pubkey)
    derived = hashlib.sha256(
        shared_secret + b"\x00\x00\x00\x01" + data[5:62]
    ).digest()

    decrypted = AESGCM(derived[:16]).decrypt(
        derived[16:], data[62:72] + data[72:88], None
    )

    latitude = int.from_bytes(decrypted[0:4], "big", signed=True) / 1e7
    longitude = int.from_bytes(decrypted[4:8], "big", signed=True) / 1e7
    confidence = decrypted[8]
    return timestamp, latitude, longitude, confidence


class HaystackPoller:
    """Periodically pulls and decrypts tag locations."""

    def __init__(self) -> None:
        self._private_key_b64 = ""
        self._report_id = ""
        self._last_timestamp = 0
        self._failures = 0

    def configured(self) -> bool:
        return bool(settings.haystack_url and settings.haystack_keyfile)

    async def poll_once(self, client: httpx.AsyncClient) -> Optional[GPSData]:
        auth = None
        if settings.haystack_user:
            auth = (settings.haystack_user, settings.haystack_pass)

        response = await client.post(
            settings.haystack_url,
            json={"ids": [self._report_id], "days": settings.haystack_days},
            auth=auth,
            timeout=30.0,
        )
        response.raise_for_status()
        results = response.json().get("results", [])
        if not results:
            return None

        # the endpoint returns reports newest-first; take the freshest one
        timestamp, latitude, longitude, confidence = decrypt_report(
            results[0]["payload"], self._private_key_b64
        )
        if timestamp <= self._last_timestamp:
            return None
        self._last_timestamp = timestamp

        return GPSData(
            device_id=settings.app_device_id,
            latitude=latitude,
            longitude=longitude,
            accuracy=float(confidence),
            timestamp=datetime.fromtimestamp(timestamp, tz=timezone.utc),
        )

    async def run(self) -> None:
        self._private_key_b64, self._report_id = load_keys(settings.haystack_keyfile)
        logger.info(
            "Haystack poller running: %s every %ds (device '%s')",
            settings.haystack_url,
            settings.haystack_poll_s,
            settings.app_device_id,
        )

        async with httpx.AsyncClient() as client:
            while True:
                try:
                    fix = await self.poll_once(client)
                    if fix is not None:
                        subscribers = await gps_store.update(fix)
                        logger.info(
                            "Haystack fix for %s (%.6f, %.6f) at %s → %d subscribers",
                            fix.device_id,
                            fix.latitude,
                            fix.longitude,
                            fix.timestamp.isoformat(),
                            subscribers,
                        )
                    if self._failures >= FAILURES_TO_MUTE:
                        logger.info("Haystack endpoint is reachable again")
                    self._failures = 0
                except Exception as error:
                    self._failures += 1
                    if self._failures <= FAILURES_TO_MUTE:
                        logger.warning("Haystack poll failed: %s", error)
                        if self._failures == FAILURES_TO_MUTE:
                            logger.warning(
                                "Muting haystack errors until the endpoint returns"
                            )
                await asyncio.sleep(settings.haystack_poll_s)


haystack_poller = HaystackPoller()
