"""Application settings loaded from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Server configuration.

    Values are read from environment variables or a .env file located in the
    same directory as this module.
    """

    host: str = "0.0.0.0"
    port: int = 8000

    # The single device_id the mobile app subscribes to. Tag location and all
    # Pi events (alerts, crash) are published under this id so the app sees one
    # unified scooter on /api/v1/ws/gps/{device_id} and /api/v1/gps/{id}/latest.
    # Set this to whatever id your existing app already uses.
    app_device_id: str = "scooter"

    # Human-readable device metadata the app displays (name + hardware).
    app_device_name: str = "cuRiding Scooter"
    app_device_hardware: str = "Raspberry Pi 5 (QNX 8) + ESP32-C3 Find My tag"

    # Crash detection: a device that stops heartbeating for crash_gap_s
    # seconds while last seen at >= crash_min_speed_kmh raises a crash event.
    crash_gap_s: float = 30.0
    crash_min_speed_kmh: float = 5.0

    # a device counts as "online" if its last heartbeat is newer than this
    heartbeat_online_s: float = 10.0
    # how often the status WebSocket pushes a fresh summary
    status_push_s: float = 2.0

    # Camera clips / crash recording.
    # Rolling pre-crash buffer: how many recent camera frames to keep so a
    # crash clip includes the footage from just before the crash. At the Pi's
    # ~2s snapshot interval, 15 frames is ~30s of pre-crash footage.
    precrash_frames: int = 15
    # where clips are stored on disk (a dir per clip of frame_*.jpg + meta.json)
    clips_dir: str = "clips"
    # keep at most this many clips; oldest are pruned
    max_clips: int = 50

    # Find My integration via macless-haystack. Leave haystack_url empty to
    # disable. haystack_keyfile is the generate_keys.py PREFIX.keys output
    # (contains the tag's private key — mount it, never commit it).
    haystack_url: str = ""
    haystack_user: str = ""
    haystack_pass: str = ""
    haystack_keyfile: str = ""
    haystack_poll_s: int = 60
    haystack_days: int = 1

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
