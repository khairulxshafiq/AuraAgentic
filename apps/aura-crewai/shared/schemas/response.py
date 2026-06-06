"""
CrewResponse — Standard response schema for CrewAI -> Brain.
Matches Master Architecture Section 12.3.
"""

from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional


class SourceSchema(BaseModel):
    url: str = ""
    title: str = ""
    type: str = "web"
    accessed_at: Optional[str] = None


class MetadataSchema(BaseModel):
    duration_ms: int = 0
    agent_version: str = "1.0.0"
    model_used: Optional[str] = None
    tokens_used: int = 0
    pages_scraped: int = 0


class CrewResponse(BaseModel):
    """Standard response from CrewAI agent to Brain."""
    trace_id: str = Field(..., description="UUID v4 trace identifier")
    workflow_run_id: Optional[str] = Field(None, description="Workflow run ID")
    status: str = Field(default="success", description="success | error | partial")
    agent: str = Field(..., description="Agent/crew name")
    result: Dict[str, Any] = Field(default_factory=dict, description="Structured result")
    summary: str = Field(default="", description="Human-readable summary")
    sources: List[SourceSchema] = Field(default_factory=list)
    metadata: MetadataSchema = Field(default_factory=MetadataSchema)
    error: Optional[Dict[str, Any]] = Field(None, description="Error details")
