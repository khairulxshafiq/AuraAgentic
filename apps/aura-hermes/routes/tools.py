"""
Tools routes — POST /tools/execute, GET /tools/health.
"""

import logging
from fastapi import APIRouter

from mcp.schemas import ToolRequest, ToolResponse
from mcp.tool_executor import ToolExecutor
from mcp.tool_registry import ToolRegistry
from logger.activity_logger import log_tool_execution

logger = logging.getLogger("hermes.routes.tools")


def create_tools_router(executor: ToolExecutor, registry: ToolRegistry) -> APIRouter:
    """Create tools router with executor and registry."""
    router = APIRouter()

    @router.post("/execute", response_model=ToolResponse)
    async def execute_tool(request: ToolRequest):
        """Execute a tool by name."""
        result = await executor.execute(request)

        # Fire-and-forget logging
        await log_tool_execution(
            trace_id=request.trace_id,
            workflow_run_id=request.workflow_run_id,
            tool_name=request.tool_name,
            status=result.status,
            params=request.params,
            duration_ms=result.duration_ms,
            error=result.error.get("message") if result.error else None,
            result_size=len(str(result.result)) if result.result else 0
        )

        return result

    @router.get("/health")
    async def tools_health():
        """List available tools and their health status."""
        statuses = await registry.get_health_status()
        return {
            "service": "hermes",
            "tools_registered": registry.count,
            "tools": statuses
        }

    return router
