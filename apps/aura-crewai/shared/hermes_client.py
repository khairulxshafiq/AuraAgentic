"""
Hermes Client — HTTP client for calling Hermes tool execution endpoints.
Used by CrewAI agents to invoke MCP tools via Hermes.
"""

import os
import time
import logging
from typing import Any, Dict, Optional

import httpx

logger = logging.getLogger("crewai.hermes_client")

HERMES_URL = os.environ.get("HERMES_URL", "http://localhost:5000")


async def execute_tool(
    tool_name: str,
    params: Dict[str, Any],
    trace_id: str,
    workflow_run_id: Optional[str] = None,
    caller: str = "crewai",
    timeout_ms: int = 30000
) -> Dict[str, Any]:
    """
    Call Hermes to execute a tool.

    Args:
        tool_name: Name of the tool to execute
        params: Tool-specific parameters
        trace_id: Request trace ID
        workflow_run_id: Optional workflow run ID
        caller: Calling service name
        timeout_ms: Timeout in milliseconds

    Returns:
        ToolResponse dict from Hermes
    """
    url = f"{HERMES_URL}/tools/execute"
    timeout_seconds = timeout_ms / 1000

    request_body = {
        "trace_id": trace_id,
        "workflow_run_id": workflow_run_id,
        "tool_name": tool_name,
        "params": params,
        "caller": caller,
        "timeout_ms": timeout_ms
    }

    start_time = time.time()

    try:
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            response = await client.post(url, json=request_body)
            response.raise_for_status()
            result = response.json()

        duration_ms = int((time.time() - start_time) * 1000)
        logger.info(f"Tool '{tool_name}' executed | status={result.get('status')} | duration={duration_ms}ms")
        return result

    except httpx.TimeoutException:
        duration_ms = int((time.time() - start_time) * 1000)
        logger.error(f"Tool '{tool_name}' timed out after {duration_ms}ms")
        return {
            "trace_id": trace_id,
            "workflow_run_id": workflow_run_id,
            "tool_name": tool_name,
            "status": "error",
            "result": None,
            "duration_ms": duration_ms,
            "error": {"code": "TIMEOUT", "message": f"Tool execution timed out after {timeout_ms}ms"}
        }
    except Exception as e:
        duration_ms = int((time.time() - start_time) * 1000)
        logger.error(f"Tool '{tool_name}' failed: {e}")
        return {
            "trace_id": trace_id,
            "workflow_run_id": workflow_run_id,
            "tool_name": tool_name,
            "status": "error",
            "result": None,
            "duration_ms": duration_ms,
            "error": {"code": "TOOL_EXECUTION_FAILED", "message": str(e)}
        }
