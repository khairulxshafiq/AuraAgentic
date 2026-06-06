"""
Research Crew — CrewAI crew definition.
Agents: Research Analyst + Report Writer.
"""

import os
import time
import logging
from typing import Any, Dict

from shared.schemas import CrewRequest, CrewResponse
from shared.schemas.response import SourceSchema, MetadataSchema
from shared.hermes_client import execute_tool

logger = logging.getLogger("research_crew.crew")


async def run_research_crew(request: CrewRequest) -> CrewResponse:
    """
    Execute the research crew workflow.
    
    Step 1: Research Analyst — scrapes website and searches for info
    Step 2: Report Writer — synthesizes findings into structured report
    """
    trace_id = request.trace_id
    workflow_run_id = request.workflow_run_id
    user_input = request.input

    logger.info(f"Starting research workflow | trace_id={trace_id}")

    # Extract URL from input if present
    import re
    url_pattern = r'https?://[^\s]+'
    urls = re.findall(url_pattern, user_input)
    target_url = urls[0] if urls else None

    scraped_data = None
    search_data = None
    sources = []

    # ─── Step 1a: Web Scraping (if URL provided) ───
    if target_url:
        logger.info(f"Scraping URL: {target_url}")
        scrape_result = await execute_tool(
            tool_name="web-scraper",
            params={
                "url": target_url,
                "depth": 1,
                "extract_images": False,
                "max_content_length": 50000
            },
            trace_id=trace_id,
            workflow_run_id=workflow_run_id,
            caller="research_crew"
        )

        if scrape_result.get("status") == "success" and scrape_result.get("result"):
            scraped_data = scrape_result["result"]
            sources.append(SourceSchema(
                url=target_url,
                title=scraped_data.get("title", ""),
                type="web",
                accessed_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            ))
    
    # ─── Step 1b: Web Search (supplementary) ───
    search_query = user_input.replace(target_url, "").strip() if target_url else user_input
    if search_query and len(search_query) > 3:
        logger.info(f"Searching: {search_query[:50]}...")
        search_result = await execute_tool(
            tool_name="search-engine",
            params={
                "query": search_query,
                "num_results": 5,
                "language": request.context.language or "en"
            },
            trace_id=trace_id,
            workflow_run_id=workflow_run_id,
            caller="research_crew"
        )

        if search_result.get("status") == "success" and search_result.get("result"):
            search_data = search_result["result"]
            for sr in (search_data.get("results", []))[:3]:
                sources.append(SourceSchema(
                    url=sr.get("link", ""),
                    title=sr.get("title", ""),
                    type="search"
                ))

    # ─── Step 2: Report Writer — Synthesize findings ───
    title = ""
    summary = ""
    key_findings = []
    extracted_data = {}

    if scraped_data:
        title = f"Website Analysis: {scraped_data.get('title', target_url or 'Unknown')}"
        content = scraped_data.get("content", "")
        
        # Generate summary from scraped content
        word_count = len(content.split())
        summary_text = content[:500] + "..." if len(content) > 500 else content

        summary = f"Analyzed {target_url or 'the provided URL'}. Found {word_count} words of content."

        # Extract key findings
        lines = [l.strip() for l in content.split("\n") if l.strip() and len(l.strip()) > 20]
        key_findings = lines[:5]  # Top 5 meaningful lines as findings

        extracted_data = {
            "page_title": scraped_data.get("title", ""),
            "word_count": word_count,
            "links_found": len(scraped_data.get("links", [])),
            "images_found": len(scraped_data.get("images", []))
        }
    elif search_data:
        title = f"Search Results: {search_query[:50]}"
        results = search_data.get("results", [])
        summary = f"Found {len(results)} search results for '{search_query[:50]}'."
        key_findings = [f"{r.get('title', '')}: {r.get('snippet', '')}" for r in results[:5]]
        extracted_data = {"search_results_count": len(results)}
    else:
        title = "Research Report"
        summary = "Unable to retrieve data from the provided source. Please check the URL and try again."
        key_findings = ["No data could be retrieved"]

    result = {
        "title": title,
        "summary": summary,
        "key_findings": key_findings,
        "extracted_data": extracted_data,
        "raw_content_length": len(scraped_data.get("content", "")) if scraped_data else 0,
        "recommendation": "Research completed successfully." if scraped_data or search_data else "Try providing a valid URL or search query."
    }

    return CrewResponse(
        trace_id=trace_id,
        workflow_run_id=workflow_run_id,
        status="success" if (scraped_data or search_data) else "partial",
        agent="research_crew",
        result=result,
        summary=summary,
        sources=sources,
        metadata=MetadataSchema(
            agent_version="1.0.0",
            model_used="google/gemini-flash-1.5",
            pages_scraped=1 if scraped_data else 0
        )
    )
