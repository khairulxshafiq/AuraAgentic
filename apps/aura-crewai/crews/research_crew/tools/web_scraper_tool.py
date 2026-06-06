"""
Web Scraper Tool — CrewAI tool wrapper for Hermes web-scraper.
"""

from typing import Any, Dict, Optional
from shared.hermes_client import execute_tool


async def scrape_website(
    url: str,
    trace_id: str,
    workflow_run_id: Optional[str] = None,
    depth: int = 1,
    extract_images: bool = False,
    max_content_length: int = 50000
) -> Dict[str, Any]:
    """
    Scrape a website using Hermes web-scraper tool.
    
    Args:
        url: Target URL to scrape
        trace_id: Request trace ID
        workflow_run_id: Optional workflow ID
        depth: Crawl depth
        extract_images: Whether to extract image URLs
        max_content_length: Max content chars
    
    Returns:
        Hermes ToolResponse dict
    """
    return await execute_tool(
        tool_name="web-scraper",
        params={
            "url": url,
            "depth": depth,
            "extract_images": extract_images,
            "max_content_length": max_content_length
        },
        trace_id=trace_id,
        workflow_run_id=workflow_run_id,
        caller="research_crew"
    )
