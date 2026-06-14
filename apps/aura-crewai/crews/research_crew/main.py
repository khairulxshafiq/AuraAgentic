"""
Research Crew — FastAPI Application.
Port: 8003
Endpoints: POST /execute, GET /health
"""

import os
import time
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from shared.schemas import CrewRequest, CrewResponse
from shared.health import get_health_response
from shared.logger import log_activity
from .crew import run_research_crew

logger = logging.getLogger("research_crew")

app = FastAPI(title="AURA Research Crew", version="1.0.0")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

last_request_at = None
active_requests = 0


@app.post("/execute", response_model=CrewResponse)
async def execute(request: CrewRequest):
    """Execute research crew task."""
    global last_request_at, active_requests
    start_time = time.time()
    active_requests += 1
    last_request_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    logger.info(f"Research crew executing | trace_id={request.trace_id} | intent={request.intent}")

    try:
        result = await run_research_crew(request)
        duration_ms = int((time.time() - start_time) * 1000)

        # Log activity
        await log_activity(
            trace_id=request.trace_id,
            service="research_crew",
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
        logger.error(f"Research crew error: {e}")

        await log_activity(
            trace_id=request.trace_id,
            service="research_crew",
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
            agent="research_crew",
            result={},
            summary=f"Research crew failed: {str(e)}",
            error={"code": "CREW_EXECUTION_FAILED", "message": str(e)}
        )


@app.get("/health")
async def health():
    """Health check endpoint."""
    return get_health_response(
        service_name="research_crew",
        agents_count=2,
        last_request_at=last_request_at,
        active_requests=active_requests
    )


@app.on_event("startup")
async def startup_event():
    import httpx
    import asyncio

    async def register():
        brain_url = os.environ.get("BRAIN_URL", "http://localhost:3001")
        service_url = os.environ.get("SERVICE_URL", "http://localhost:8003")
        for i in range(10):
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        f"{brain_url}/register",
                        json={
                            "service_name": "research_crew",
                            "url": service_url,
                            "agents_count": 2,
                            "capabilities": ["research"]
                        },
                        timeout=5.0
                    )
                    if response.status_code == 200:
                        logger.info("Successfully registered research_crew with Brain")
                        break
            except Exception as e:
                logger.warning(f"Failed to register research_crew with Brain (attempt {i+1}): {e}")
                await asyncio.sleep(2)

    asyncio.create_task(register())
