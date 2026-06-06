"""
Log route — POST /log for fire-and-forget activity logging.
"""

import logging
from fastapi import APIRouter
from mcp.schemas import LogRequest
from logger.activity_logger import log_activity

logger = logging.getLogger("hermes.routes.log")

router = APIRouter()


@router.post("/log")
async def post_log(request: LogRequest):
    """Fire-and-forget activity logging to Supabase."""
    await log_activity(
        trace_id=request.trace_id,
        workflow_run_id=request.workflow_run_id,
        service=request.service,
        action=request.action,
        status=request.status,
        duration_ms=request.duration_ms,
        error=request.error,
        details=request.details
    )
    return {"status": "logged"}
