# 🧠 AURA Agentic AI — Monorepo

**Autonomous Unified Reasoning Agent** — A production-ready, multi-service Agentic AI platform.

## Architecture

```
Telegram → Gateway → Brain → CrewAI Agents / Hermes Tools → Supabase
```

| Service | Tech | Port | Role |
|---------|------|------|------|
| **Gateway** | Node.js/Express | 3000 | Telegram webhook, auth, forwarding |
| **Brain** | Node.js/Express | 3001 | Orchestrator, intent detection, routing |
| **CrewAI Research** | Python/FastAPI | 8003 | Web research, scraping, reports |
| **CrewAI Image** | Python/FastAPI | 8004 | Image prompt engineering |
| **Hermes** | Python/FastAPI | 5000 | Tool executor, MCP connectors |

## Quick Start

```bash
# Clone
git clone https://github.com/your-org/AURA-Agentic.git
cd AURA-Agentic

# Install Node.js dependencies
pnpm install

# Setup Python services
cd apps/aura-crewai && pip install -r requirements.txt && cd ../..
cd apps/aura-hermes && pip install -r requirements.txt && cd ../..

# Copy environment files
cp apps/gateway/.env.example apps/gateway/.env
cp apps/aura-brain/.env.example apps/aura-brain/.env
cp apps/aura-crewai/.env.example apps/aura-crewai/.env
cp apps/aura-hermes/.env.example apps/aura-hermes/.env
# Edit .env files with your actual keys

# Run all services (Docker)
docker-compose up

# Or run individually
pnpm gateway:dev
pnpm brain:dev
```

## Phase 1 Scope
- ✅ research_crew — Website research, scraping, summarization
- ✅ image_crew — Image prompt engineering, style planning
- ✅ Plugin system — 5-layer architecture
- ✅ MCP tool system — Brain registry + Hermes executor
- ✅ Supabase memory — 12 tables

## Author
Matrol — Mohammad Khairul Shafiq bin Mohd Nizam
