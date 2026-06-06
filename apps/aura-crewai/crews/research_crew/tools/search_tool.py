"""
Search Tool — CrewAI tool wrapper for Hermes search-engine.
"""

from typing import Any, Dict, Optional
from shared.hermes_client import execute_tool


async def search_web(
    query: str,
    trace_id: str,
    workflow_run_id: Optional[str] = None,
    num_results: int = 10,
    language: str = "en"
) -> Dict[str, Any]:
    """
    Search the web using Hermes search-engine tool.
    
    Args:
        query: Search query
        trace_id: Request trace ID
        workflow_run_id: Optional workflow ID
        num_results: Number of results
        language: Search language
    
    Returns:
        Hermes ToolResponse dict
    """
    return await execute_tool(
        tool_name="search-engine",
        params={
            "query": query,
            "num_results": num_results,
            "language": language
        },
        trace_id=trace_id,
        workflow_run_id=workflow_run_id,
        caller="research_crew"
    )
