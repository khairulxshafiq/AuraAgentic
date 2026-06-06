"""
Pydantic schemas for Hermes MCP tool requests and responses.
Matches the API contracts defined in Master Architecture Section 12.
"""

from pydantic import BaseModel, Field
from typing import Any, Dict, Optional


class ToolRequest(BaseModel):
    """Standard tool execution request — Brain/CrewAI -> Hermes."""
    trace_id: str = Field(..., description="UUID v4 trace identifier")
    workflow_run_id: Optional[str] = Field(None, description="Workflow run identifier for multi-step flows")
    tool_name: str = Field(..., description="Name of the tool to execute")
    params: Dict[str, Any] = Field(default_factory=dict, description="Tool-specific parameters")
    caller: str = Field(default="brain", description="Service that initiated the call")
    timeout_ms: int = Field(default=30000, description="Timeout in milliseconds")


class ToolResponse(BaseModel):
    """Standard tool execution response — Hermes -> Brain/CrewAI."""
    trace_id: str = Field(..., description="UUID v4 trace identifier")
    workflow_run_id: Optional[str] = Field(None, description="Workflow run identifier")
    tool_name: str = Field(..., description="Name of the tool that was executed")
    status: str = Field(..., description="Execution status: success | error")
    result: Optional[Dict[str, Any]] = Field(None, description="Tool execution result")
    duration_ms: int = Field(default=0, description="Execution duration in milliseconds")
    error: Optional[Dict[str, Any]] = Field(None, description="Error details if status is error")


class LogRequest(BaseModel):
    """Activity log request."""
    trace_id: str = Field(..., description="UUID v4 trace identifier")
    workflow_run_id: Optional[str] = Field(None, description="Workflow run identifier")
    service: str = Field(..., description="Service name")
    action: str = Field(..., description="Action performed")
    status: str = Field(default="success", description="Action status")
    duration_ms: int = Field(default=0, description="Duration in milliseconds")
    error: Optional[str] = Field(None, description="Error message if any")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional details")
