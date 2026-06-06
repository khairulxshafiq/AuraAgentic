# AURA — Coding Standards for LLM Agents

## General
- Use strict mode ('use strict') in all Node.js files
- Use async/await over callbacks or raw promises
- Always handle errors with try/catch and graceful degradation
- Never hardcode URLs, API keys, or secrets — use environment variables
- Include trace_id in every request, response, and log entry

## Node.js (Gateway, Brain)
- Express for HTTP servers
- Pino for JSON structured logging
- Standard module.exports (CommonJS)
- Workspace packages: @aura/shared-*

## Python (CrewAI, Hermes)
- FastAPI for HTTP servers
- Pydantic for request/response validation
- httpx for async HTTP calls
- Standard logging module
- Type hints on all functions

## File Naming
- Node.js: kebab-case (mcp-registry.js, plugin-registry.js)
- Python: snake_case (tool_executor.py, web_scraper.py)
- Config: kebab-case JSON (plugin.json, web-scraper.tool.json)

## Error Handling
- Every function that can fail must have error handling
- Return structured error objects, not plain strings
- Fire-and-forget for logging (never fail the main flow due to logging)
