"""
Centralized logging for CrewAI services.
Logs to stdout and optionally to Supabase activity_logs.
"""

import os
import logging
import httpx
from typing import Optional

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s"
)


def get_logger(name: str) -> logging.Logger:
    """Get a named logger."""
    return logging.getLogger(name)


async def log_activity(
    trace_id: str,
    service: str,
    action: str,
    status: str = "success",
    duration_ms: int = 0,
    error: Optional[str] = None,
    workflow_run_id: Optional[str] = None
):
    """Fire-and-forget activity log to Supabase via Hermes /log endpoint."""
    hermes_url = os.environ.get("HERMES_URL", "http://localhost:5000")
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            await client.post(f"{hermes_url}/log", json={
                "trace_id": trace_id,
                "workflow_run_id": workflow_run_id,
                "service": service,
                "action": action,
                "status": status,
                "duration_ms": duration_ms,
                "error": error
            })
    except Exception:
        pass  # Fire-and-forget
