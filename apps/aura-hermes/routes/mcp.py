"""
MCP Routes — Exposes MCP protocol endpoints for Cline tool discovery.
Mounts alongside existing /tools routes with zero impact on current API.
"""

import logging
import uuid
from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Dict, Any, List, Optional

from mcp.mcp_adapter import MCPAdapter

logger = logging.getLogger("hermes.routes.mcp")


class MCPToolCallRequest(BaseModel):
    """MCP tool call request body."""
    name: str
    arguments: Dict[str, Any] = {}


class MCPListToolsResponse(BaseModel):
    """MCP tools/list response."""
    tools: List[Dict[str, Any]]


class MCPToolCallResponse(BaseModel):
    """MCP tools/call response."""
    content: List[Dict[str, Any]]
    isError: bool = False


def create_mcp_router(registry) -> APIRouter:
    """
    Create MCP router with tools/list and tools/call endpoints.

    Args:
        registry: ToolRegistry instance

    Returns:
        APIRouter with MCP endpoints
    """
    router = APIRouter()
    adapter = MCPAdapter(registry)

    @router.get("/tools/list", response_model=MCPListToolsResponse)
    async def list_tools():
        """List all available tools in MCP format."""
        tools = adapter.list_tools()
        logger.info(f"MCP: listed {len(tools)} tools")
        return {"tools": tools}

    @router.post("/tools/call", response_model=MCPToolCallResponse)
    async def call_tool(request: MCPToolCallRequest):
        """Execute a tool via MCP protocol."""
        trace_id = str(uuid.uuid4())
        logger.info(f"MCP: calling tool '{request.name}' (trace={trace_id})")
        result = await adapter.call_tool(request.name, request.arguments, trace_id)
        return result

    return router