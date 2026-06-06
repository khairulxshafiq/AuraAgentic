# AURA — Architecture Rules for LLM Agents

## The 4 Golden Rules
1. **Gateway is THIN** — No LLM logic, no direct agent calls
2. **Brain ORCHESTRATES** — All routing decisions flow through Brain
3. **CrewAI THINKS** — Returns structured JSON, never sends to Telegram
4. **Hermes DOES** — Executes tools, no reasoning or content generation

## Communication Rules
- Workers (CrewAI, Hermes) NEVER reply to Telegram directly
- Agents NEVER communicate directly — always through Brain state
- Only Gateway sends messages to Telegram
- All inter-service communication is HTTP REST (Phase 1)

## Adding New Capabilities
1. Create plugin.json + rules.md in Brain plugins/
2. Create .tool.json in Brain mcp/tools/ if new tool needed
3. Create connector in Hermes mcp/connectors/ if new tool needed
4. Create crew in CrewAI crews/ if new reasoning needed
5. Restart Brain — auto-discovers. ZERO changes to Gateway or Brain core.

## Phase 1 Boundaries
- Only 2 agents: research_crew, image_crew
- Phase 2 tools are STUBS with NotImplementedError
- No message brokers or queues (sync HTTP only)
- No Web UI or frontend code
- No Supabase SQL migrations in code
