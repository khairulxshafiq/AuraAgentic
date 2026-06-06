"""
CrewRequest — Standard request schema for Brain -> CrewAI.
Matches Master Architecture Section 12.2.
"""

from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional


class ContextSchema(BaseModel):
    conversation_history: List[Dict[str, Any]] = Field(default_factory=list)
    brand: Optional[str] = None
    platform: Optional[str] = None
    language: str = "en"
    research_context: Optional[Dict[str, Any]] = None
    plugin_rules: Optional[str] = None
    custom: Dict[str, Any] = Field(default_factory=dict)


class MemorySchema(BaseModel):
    relevant_memories: List[str] = Field(default_factory=list)
    user_preferences: Dict[str, Any] = Field(default_factory=dict)


class OptionsSchema(BaseModel):
    timeout_ms: int = 60000
    output_format: str = "structured_json"
    verbose: bool = False
    include_sources: bool = True


class CrewRequest(BaseModel):
    """Standard request from Brain to CrewAI agent."""
    trace_id: str = Field(..., description="UUID v4 trace identifier")
    workflow_run_id: Optional[str] = Field(None, description="Workflow run ID for multi-step flows")
    user_id: str = Field(..., description="User identifier (Telegram chat_id)")
    intent: str = Field(..., description="Detected intent")
    task: str = Field(..., description="Task type")
    input: str = Field(..., description="User's original message/input")
    context: ContextSchema = Field(default_factory=ContextSchema)
    memory: MemorySchema = Field(default_factory=MemorySchema)
    options: OptionsSchema = Field(default_factory=OptionsSchema)
