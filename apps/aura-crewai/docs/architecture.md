# AURA CrewAI — Architecture

## Overview
AURA CrewAI contains specialized AI agent crews that handle complex reasoning tasks.

## Phase 1 Crews

### research_crew (Port 8003)
- **Agents**: Research Analyst + Report Writer
- **Domain**: Web research, scraping, summarization
- **MCP Tools**: web-scraper (required), search-engine (optional)

### image_crew (Port 8004)
- **Agents**: Visual Designer / Prompt Engineer
- **Domain**: Image prompt engineering, style planning
- **MCP Tools**: image-generator (optional)

## Standard Interface
Every crew exposes:
- `POST /execute` — Execute crew task (CrewRequest → CrewResponse)
- `GET /health` — Health check
