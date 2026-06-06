"""
Health check helper for CrewAI services.
"""

import time
import psutil
from typing import Optional

START_TIME = time.time()


def get_health_response(
    service_name: str,
    version: str = "1.0.0",
    agents_count: int = 0,
    last_request_at: Optional[str] = None,
    active_requests: int = 0
) -> dict:
    """Get standard health check response."""
    uptime_seconds = int(time.time() - START_TIME)
    
    try:
        memory_mb = round(psutil.Process().memory_info().rss / 1024 / 1024, 1)
    except Exception:
        memory_mb = 0

    return {
        "service": service_name,
        "status": "healthy",
        "uptime_seconds": uptime_seconds,
        "version": version,
        "agents_count": agents_count,
        "last_request_at": last_request_at,
        "memory_usage_mb": memory_mb,
        "active_requests": active_requests
    }
