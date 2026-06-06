"""
Search Engine Connector — Phase 1 ACTIVE.
Searches the web using SerpAPI.
"""

import os
import time
import logging
from typing import Any, Dict

import httpx

from ..tool_base import AuraTool

logger = logging.getLogger("hermes.connectors.search_engine")

SERPAPI_BASE_URL = "https://serpapi.com/search"


class SearchEngineConnector(AuraTool):
    """Search the web using SerpAPI."""

    tool_name = "search-engine"
    tool_version = "1.0.0"
    tool_description = "Search the web using SerpAPI or similar search providers"
    phase = 1
    status = "active"

    def validate_params(self, params: Dict[str, Any]) -> bool:
        """Validate that query is provided."""
        super().validate_params(params)
        query = params.get("query")
        if not query or not query.strip():
            raise ValueError("Parameter 'query' is required and must not be empty")
        return True

    async def execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Search the web using SerpAPI.

        Args:
            params: {query, num_results (default 10), language (default 'en'), region (default 'us')}

        Returns:
            {results: [{title, link, snippet, position}], total_results, search_time_ms}
        """
        query = params["query"]
        num_results = params.get("num_results", 10)
        language = params.get("language", "en")
        region = params.get("region", "us")

        api_key = os.environ.get("SERPAPI_KEY", "")
        if not api_key:
            logger.warning("SERPAPI_KEY not configured, returning empty results")
            return {
                "results": [],
                "total_results": 0,
                "search_time_ms": 0,
                "error_note": "SERPAPI_KEY not configured"
            }

        logger.info(f"Searching: '{query}' (num_results={num_results}, lang={language})")

        start_time = time.time()

        search_params = {
            "q": query,
            "api_key": api_key,
            "engine": "google",
            "num": num_results,
            "hl": language,
            "gl": region
        }

        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(SERPAPI_BASE_URL, params=search_params)
            response.raise_for_status()
            data = response.json()

        search_time_ms = int((time.time() - start_time) * 1000)

        # Parse organic results
        organic_results = data.get("organic_results", [])
        results = []
        for i, item in enumerate(organic_results[:num_results]):
            results.append({
                "title": item.get("title", ""),
                "link": item.get("link", ""),
                "snippet": item.get("snippet", ""),
                "position": i + 1
            })

        # Get search information
        search_info = data.get("search_information", {})
        total_results = search_info.get("total_results", len(results))

        return {
            "results": results,
            "total_results": total_results,
            "search_time_ms": search_time_ms
        }
