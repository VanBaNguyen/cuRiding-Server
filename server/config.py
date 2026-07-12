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

    # Crash detection: a device that stops heartbeating for crash_gap_s
    # seconds while last seen at >= crash_min_speed_kmh raises a crash event.
    crash_gap_s: float = 30.0
    crash_min_speed_kmh: float = 5.0

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
