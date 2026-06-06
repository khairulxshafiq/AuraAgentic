"""
Tool Executor — Dispatches tool execution requests to the correct connector.
Receives ToolRequest, looks up connector, calls execute, wraps in ToolResponse.
"""

import logging
import time
from typing import Dict, Any

from .tool_registry import ToolRegistry
from .schemas import ToolRequest, ToolResponse

logger = logging.getLogger("hermes.tool_executor")


class ToolExecutor:
    """Dispatches tool calls to registered connectors."""

    def __init__(self, registry: ToolRegistry):
        self.registry = registry

    async def execute(self, request: ToolRequest) -> ToolResponse:
        """
        Execute a tool by name.

        Args:
            request: ToolRequest with tool_name, params, trace_id, etc.

        Returns:
            ToolResponse with result, status, duration
        """
        start_time = time.time()

        logger.info(
            f"Executing tool '{request.tool_name}' | "
            f"trace_id={request.trace_id} | "
            f"caller={request.caller}"
        )

        # Look up connector
        connector = self.registry.get_connector(request.tool_name)

        if connector is None:
            duration_ms = int((time.time() - start_time) * 1000)
            logger.error(f"Tool '{request.tool_name}' not found in registry")
            return ToolResponse(
                trace_id=request.trace_id,
                workflow_run_id=request.workflow_run_id,
                tool_name=request.tool_name,
                status="error",
                result=None,
                duration_ms=duration_ms,
                error={
                    "code": "TOOL_NOT_FOUND",
                    "message": f"Tool '{request.tool_name}' is not registered"
                }
            )

        # Execute via safe_execute (handles timing, validation, errors)
        execution_result = await connector.safe_execute(request.params)

        duration_ms = int((time.time() - start_time) * 1000)

        logger.info(
            f"Tool '{request.tool_name}' completed | "
            f"status={execution_result['status']} | "
            f"duration_ms={duration_ms} | "
            f"trace_id={request.trace_id}"
        )

        return ToolResponse(
            trace_id=request.trace_id,
            workflow_run_id=request.workflow_run_id,
            tool_name=request.tool_name,
            status=execution_result["status"],
            result=execution_result["result"],
            duration_ms=duration_ms,
            error=execution_result["error"]
        )
