# AURA Phase 1 — Architecture Overview

## System Architecture
```
Telegram → Gateway (3000) → Brain (3001) → CrewAI / Hermes → Supabase
```

## Services
1. **Gateway** — Telegram webhook, auth, rate limiting, forwarding
2. **Brain** — Intent detection, plugin routing, workflow orchestration
3. **CrewAI** — research_crew (8003) + image_crew (8004)
4. **Hermes** — Tool executor with MCP connectors (5000)

## Key Patterns
- **Plugin System**: 5-layer model (Rules, Skills, MCP Tools, Subagents, Manifest)
- **MCP Tool System**: Brain registry + Hermes executor split
- **Service Registry**: Static URLs + health polling (60s)
- **Workflow Orchestration**: Brain-coordinated, sequential steps with workflow_run_id

## Phase 1 Scope
- 2 agents: research_crew, image_crew
- 3 active tools: web-scraper, search-engine, image-generator
- 8 Phase 2 tool stubs
- 12 Supabase tables
- 2 active plugins + 1 disabled Phase 2 plugin

## API Contracts
- Gateway → Brain: POST /process
- Brain → CrewAI: POST /execute
- Brain/CrewAI → Hermes: POST /tools/execute
- All services: GET /health
