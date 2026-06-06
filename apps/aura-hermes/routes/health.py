"""
Health route — GET /health.
"""

import time
from fastapi import APIRouter

router = APIRouter()

START_TIME = time.time()


@router.get("/health")
async def health():
    """Service health check."""
    uptime_seconds = int(time.time() - START_TIME)
    return {
        "service": "hermes",
        "status": "healthy",
        "uptime_seconds": uptime_seconds,
        "version": "1.0.0",
        "agents_count": 0
    }
