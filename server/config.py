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

    # Crash detection: a device that has been heartbeating and then goes
    # silent for crash_gap_s seconds raises a crash event (sudden heartbeat
    # stop = crash). Speed is not considered; location comes from the tag.
    crash_gap_s: float = 30.0

    # a device counts as "online" if its last heartbeat is newer than this
    heartbeat_online_s: float = 10.0
    # how often the status WebSocket pushes a fresh summary
    status_push_s: float = 2.0

    # Camera clip buffer + storage
    precrash_frames: int = 15
    max_clips: int = 50
    clips_dir: str = "clips"

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
