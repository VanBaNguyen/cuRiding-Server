"""cuRiding GPS Relay Server.

Receives GPS coordinates from Raspberry Pi 5 devices running QNX and relays
them in real-time to React Native mobile clients over WebSocket.
"""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from haystack import haystack_poller
from routes import router
from telemetry import crash_watchdog, telemetry_store

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run the crash watchdog and the Find My poller alongside the API."""
    tasks = [asyncio.create_task(crash_watchdog(telemetry_store))]
    if haystack_poller.configured():
        tasks.append(asyncio.create_task(haystack_poller.run()))
    else:
        logger.info("HAYSTACK_URL/HAYSTACK_KEYFILE not set; Find My polling disabled")
    yield
    for task in tasks:
        task.cancel()


app = FastAPI(
    title="cuRiding GPS Relay",
    description=(
        "Receives GPS data from Raspberry Pi 5 devices on QNX and relays "
        "updates to React Native mobile clients in real-time."
    ),
    version="0.2.0",
    lifespan=lifespan,
)

# Allow the React Native app (and dev tools) to connect from any origin.
# Tighten this in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health")
async def health() -> dict:
    """Simple liveness check."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
    )
