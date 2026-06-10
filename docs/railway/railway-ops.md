# 🚀 AURA Railway Operations Guide
# Cline Reference — Single Source of Truth untuk semua Railway operations
# Last Updated: 2026-06-10

---

## 📋 PROJECT OVERVIEW

| Key | Value |
|-----|-------|
| **Project Name** | AuraAgentic |
| **Platform** | Railway (https://railway.app) |
| **Repo** | /workspaces/AuraAgentic |
| **Deploy Method** | Auto-deploy dari GitHub (push to main) |

---

## 🏗️ SERVICES MAP

| # | Service Name | Type | Port | Description |
|---|-------------|------|------|-------------|
| 1 | **Aura-Gateway** | Node.js | 3000 | Entry point — Telegram webhook, routing ke Brain |
| 2 | **Aura-Brain** | Node.js | 3000 | Core reasoning — decide mana crew nak dispatch |
| 3 | **Aura-CrewResearch** | Python | 8080 | Research crew — web search, analysis |
| 4 | **Aura-CrewImage** | Python | 8080 | Image generation crew |
| 5 | **Aura-HermesExecutor** | Node.js | 3000 | Executor agent — task execution, optimization |

---

## 🔍 LOGS COMMANDS

### Quick Reference — View Logs Per Service

```bash
# Gateway logs
RAILWAY_TOKEN=$RAILWAY_TOKEN_GATEWAY railway logs

# Brain logs
RAILWAY_TOKEN=$RAILWAY_TOKEN_BRAIN railway logs

# CrewResearch logs
RAILWAY_TOKEN=$RAILWAY_TOKEN_CREWRESEARCH railway logs

# CrewImage logs
RAILWAY_TOKEN=$RAILWAY_TOKEN_CREWIMAGE railway logs

# HermesExecutor logs
RAILWAY_TOKEN=$RAILWAY_TOKEN_HERMES railway logs
```

### Using the Companion Script (Recommended)

```bash
# Lihat semua logs sekaligus
./scripts/railway-logs.sh all

# Lihat logs untuk satu service
./scripts/railway-logs.sh gateway
./scripts/railway-logs.sh brain
./scripts/railway-logs.sh crewresearch
./scripts/railway-logs.sh crewimage
./scripts/railway-logs.sh hermes

# Stream real-time logs
./scripts/railway-logs.sh gateway --follow

# Lihat logs terakhir (latest deployment)
./scripts/railway-logs.sh brain --latest
```

---

## 🔑 ENVIRONMENT TOKENS SETUP

Setiap service perlukan **Environment Token** sendiri dari Railway Dashboard.

### Cara Generate Token:
1. Pergi ke Railway Dashboard → Project Settings → Tokens
2. Create token untuk setiap environment:
   - `Gateway` → Environment: Aura-Gateway
   - `Brain` → Environment: Aura-Brain
   - `CrewResearch` → Environment: Aura-CrewResearch
   - `CrewImage` → Environment: Aura-CrewImage
   - `Hermes` → Environment: Aura-HermesExecutor

### Save Tokens dalam `.env.railway` (Jangan commit!):

```bash
# File: .env.railway (add to .gitignore!)
RAILWAY_TOKEN_GATEWAY=your_gateway_token_here
RAILWAY_TOKEN_BRAIN=your_brain_token_here
RAILWAY_TOKEN_CREWRESEARCH=your_crewresearch_token_here
RAILWAY_TOKEN_CREWIMAGE=your_crewimage_token_here
RAILWAY_TOKEN_HERMES=your_hermes_token_here
```

---

## 🏥 HEALTH CHECK ENDPOINTS

| Service | Health Check URL |
|---------|-----------------|
| Gateway | `GET /` atau `GET /health` |
| Brain | `GET /health` |
| CrewResearch | `GET /health` |
| CrewImage | `GET /health` |
| HermesExecutor | `GET /health` |

### Test Health Check:

```bash
curl https://aura-gateway-xxxx.up.railway.app/health
curl https://aura-brain-xxxx.up.railway.app/health
curl https://aura-crewresearch-xxxx.up.railway.app/health
curl https://aura-crewimage-xxxx.up.railway.app/health
curl https://aura-hermes-xxxx.up.railway.app/health
```

---

## 🔧 COMMON TROUBLESHOOTING

### 1. Service Crash / Restart Loop
```bash
# Check logs untuk error message
./scripts/railway-logs.sh <service> --latest

# Common causes:
# - Missing environment variable
# - Port conflict
# - Dependency not installed
```

### 2. 404 Error dari OpenRouter
```bash
# Check model name dalam env var
# ❌ Wrong: OPENROUTER_MODEL=gemini-flash
# ✅ Correct: OPENROUTER_MODEL=google/gemini-2.0-flash-exp:free
```

### 3. Service Tak Connect ke Service Lain
```bash
# Verify service URLs dalam env vars
# Make sure ada https:// prefix
# Make sure takde trailing slash /

# Check Brain env vars:
# CREW_SERVICE_URL=https://aura-crewresearch-xxxx.up.railway.app
# HERMES_SERVICE_URL=https://aura-hermes-xxxx.up.railway.app
```

### 4. Supabase Connection Failed
```bash
# Check these env vars:
# SUPABASE_URL → format: https://xxxx.supabase.co (no /rest/v1 suffix!)
# SUPABASE_SERVICE_ROLE_KEY → must be service_role, NOT anon key
```

### 5. Telegram Bot Tak Respond
```bash
# Check Gateway logs first
./scripts/railway-logs.sh gateway --follow

# Verify TELEGRAM_BOT_TOKEN is set
# Verify webhook URL is correct
```

---

## 📊 RAILWAY CLI CHEATSHEET

```bash
# Authentication
railway login --browserless    # Login tanpa browser
railway whoami                 # Check siapa yang logged in
railway logout                 # Logout

# Project Management
railway status                 # Current project info
railway link                   # Link ke project
railway open                   # Open project dalam browser

# Deployment
railway up                     # Deploy current directory
railway redeploy               # Redeploy latest
railway restart                # Restart service
railway down                   # Remove latest deployment

# Logs & Debug
railway logs                   # View logs
railway logs -f                # Stream real-time
railway logs --latest          # Latest deployment only

# Variables
railway variables              # List all env vars
railway variables set KEY=VAL  # Set env var

# SSH (Advanced Debug)
railway ssh                    # SSH into running container
```

---

## 🔐 SECURITY NOTES

1. **JANGAN** commit `.env.railway` ke Git
2. **JANGAN** share token secara public
3. Kalau token exposed, DELETE segera dan create baru
4. Guna `railway login --browserless` untuk interactive sessions
5. Guna `RAILWAY_TOKEN` (project-scoped) untuk automation, bukan `RAILWAY_API_TOKEN`

---

## 📁 FILE STRUCTURE

```
AuraAgentic/
├── docs/
│   └── railway-ops.md          ← THIS FILE (Cline reference)
├── scripts/
│   └── railway-logs.sh         ← Companion log viewer script
├── .env.railway                ← Tokens (GITIGNORED!)
├── .gitignore                  ← Must include .env.railway
└── ...
```

---

> **Untuk Cline:** Rujuk file ini sebelum run apa-apa Railway command.
> Guna `./scripts/railway-logs.sh` untuk akses logs semua service.
> Kalau token expired, minta user run `railway login --browserless`.
