"""
Image Crew — FastAPI Application.
Port: 8004
Endpoints: POST /execute, GET /health
"""

import os
import time
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from shared.schemas import CrewRequest, CrewResponse
from shared.health import get_health_response
from shared.logger import log_activity
from .crew import run_image_crew

logger = logging.getLogger("image_crew")

app = FastAPI(title="AURA Image Crew", version="1.0.0")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

last_request_at = None
active_requests = 0


@app.post("/execute", response_model=CrewResponse)
async def execute(request: CrewRequest):
    """Execute image crew task."""
    global last_request_at, active_requests
    start_time = time.time()
    active_requests += 1
    last_request_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    logger.info(f"Image crew executing | trace_id={request.trace_id} | intent={request.intent}")

    try:
        result = await run_image_crew(request)
        duration_ms = int((time.time() - start_time) * 1000)

        await log_activity(
            trace_id=request.trace_id,
            service="image_crew",
            action="execute",
            status=result.status,
            duration_ms=duration_ms,
            workflow_run_id=request.workflow_run_id
        )

        result.metadata.duration_ms = duration_ms
        active_requests -= 1
        return result

    except Exception as e:
        duration_ms = int((time.time() - start_time) * 1000)
        active_requests -= 1
        logger.error(f"Image crew error: {e}")

        await log_activity(
            trace_id=request.trace_id,
            service="image_crew",
            action="execute",
            status="error",
            duration_ms=duration_ms,
            error=str(e),
            workflow_run_id=request.workflow_run_id
        )

        return CrewResponse(
            trace_id=request.trace_id,
            workflow_run_id=request.workflow_run_id,
            status="error",
            agent="image_crew",
            summary=f"Image crew failed: {str(e)}",
            error={"code": "CREW_EXECUTION_FAILED", "message": str(e)}
        )


@app.get("/health")
async def health():
    """Health check endpoint."""
    return get_health_response(
        service_name="image_crew",
        agents_count=1,
        last_request_at=last_request_at,
        active_requests=active_requests
    )
