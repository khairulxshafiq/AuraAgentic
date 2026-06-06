# Aura-CrewAI — Context for LLM Coding Agents

## Service Description
CrewAI multi-agent service. research_crew (port 8003) + image_crew (port 8004).

## Architecture Context
- Part of AURA Agentic AI — a multi-service Agentic AI platform
- Flow: Telegram → Gateway → Brain → CrewAI/Hermes → Supabase
- This service communicates via HTTP REST with JSON payloads
- Every request includes trace_id for traceability
- See /docs/architecture/phase1-overview.md for full architecture

## Key Rules
- Follow the coding standards in /llm-rules/coding-standards.md
- Follow the architecture rules in /llm-rules/architecture-rules.md
- Never hardcode URLs or secrets
- Always include error handling
- Log important actions with trace_id
