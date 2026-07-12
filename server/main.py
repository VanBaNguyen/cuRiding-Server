"""cuRiding GPS Relay Server.

Receives GPS coordinates from Raspberry Pi 5 devices running QNX and relays
them in real-time to React Native mobile clients over WebSocket.
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routes import router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)

app = FastAPI(
    title="cuRiding GPS Relay",
    description=(
        "Receives GPS data from Raspberry Pi 5 devices on QNX and relays "
        "updates to React Native mobile clients in real-time."
    ),
    version="0.1.0",
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
