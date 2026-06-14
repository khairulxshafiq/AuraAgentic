"""
Aura-Hermes — Tool Executor Service.
FastAPI entry point. Port 5000.
Hermes executes tools, does NOT reason or generate content.
"""

import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from mcp.tool_registry import build_registry
from mcp.tool_executor import ToolExecutor
from routes.tools import create_tools_router
from routes.mcp import create_mcp_router
from routes.log import router as log_router
from routes.health import router as health_router

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s"
)
logger = logging.getLogger("hermes")

app = FastAPI(
    title="AURA Hermes — Tool Executor",
    description="MCP Tool Executor Service for AURA Agentic AI",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# Build tool registry and executor
registry = build_registry()
executor = ToolExecutor(registry)

# Store in app state
app.state.registry = registry
app.state.executor = executor

# Mount routes
app.include_router(create_tools_router(executor, registry), prefix="/tools")
app.include_router(create_mcp_router(registry), prefix="/mcp")
app.include_router(log_router)
app.include_router(health_router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "aura-hermes",
        "version": "1.0.0",
        "status": "online",
        "tools_registered": registry.count
    }


@app.on_event("startup")
async def startup_event():
    import httpx
    import asyncio

    async def register():
        brain_url = os.environ.get("BRAIN_URL", "http://localhost:3001")
        service_url = os.environ.get("SERVICE_URL", "http://localhost:5000")
        for i in range(10):
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        f"{brain_url}/register",
                        json={
                            "service_name": "hermes",
                            "url": service_url,
                            "agents_count": 0,
                            "capabilities": ["tools"]
                        },
                        timeout=5.0
                    )
                    if response.status_code == 200:
                        logger.info("Successfully registered hermes with Brain")
                        break
            except Exception as e:
                logger.warning(f"Failed to register hermes with Brain (attempt {i+1}): {e}")
                await asyncio.sleep(2)

    asyncio.create_task(register())
