"""
Activity Logger — Fire-and-forget logging to Supabase.
"""

import os
import logging
from typing import Any, Dict, Optional

logger = logging.getLogger("hermes.activity_logger")


async def log_activity(
    trace_id: str,
    service: str,
    action: str,
    status: str = "success",
    duration_ms: int = 0,
    error: Optional[str] = None,
    workflow_run_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None
):
    """Log activity to Supabase (fire-and-forget)."""
    try:
        from supabase import create_client
        url = os.environ.get("SUPABASE_URL", "")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

        if not url or not key:
            logger.debug("Supabase not configured, skipping activity log")
            return

        client = create_client(url, key)
        import datetime
        client.table("activity_logs").insert({
            "trace_id": trace_id,
            "workflow_run_id": workflow_run_id,
            "service": service,
            "action": action,
            "status": status,
            "duration_ms": duration_ms,
            "error": error,
            "details": details,
            "created_at": datetime.datetime.utcnow().isoformat() + "Z"
        }).execute()

    except Exception as e:
        logger.debug(f"Activity log failed (fire-and-forget): {e}")


async def log_tool_execution(
    trace_id: str,
    tool_name: str,
    status: str,
    params: Dict[str, Any],
    duration_ms: int,
    error: Optional[str] = None,
    workflow_run_id: Optional[str] = None,
    result_size: int = 0
):
    """Log tool execution to Supabase tool_logs table."""
    try:
        from supabase import create_client
        url = os.environ.get("SUPABASE_URL", "")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

        if not url or not key:
            return

        client = create_client(url, key)
        import datetime
        client.table("tool_logs").insert({
            "trace_id": trace_id,
            "workflow_run_id": workflow_run_id,
            "tool_name": tool_name,
            "status": status,
            "params": params,
            "result_size_bytes": result_size,
            "duration_ms": duration_ms,
            "error": error,
            "created_at": datetime.datetime.utcnow().isoformat() + "Z"
        }).execute()

    except Exception as e:
        logger.debug(f"Tool log failed (fire-and-forget): {e}")
