# 🚀 AURA Railway Operations Guide v2
# Cline Reference — Single Source of Truth untuk semua Railway operations
# Last Updated: 2026-06-10
# ⚠️ Commands verified against actual `railway logs --help` output

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

## 🔀 SWITCHING BETWEEN SERVICES

```bash
# Link/switch ke service lain
railway service
# → Pilih service yang nak tengok (Gateway/Brain/CrewResearch/etc.)

# Check current linked service
railway status
```

> ⚠️ Satu terminal = satu service. Nak monitor 2 service serentak? Buka 2 terminal.

---

## 🔍 LOGS COMMANDS (VERIFIED ✅)

### Basic Logs

```bash
# View logs (current linked service)
railway logs

# View last N lines
railway logs --lines 10
railway logs --lines 50

# Stream logs dari latest deployment (even if failed/building)
railway logs --latest

# Get logs dalam JSON format
railway logs --json
```

### Filter by Log Level

```bash
# Error logs sahaja
railway logs --lines 10 --filter "@level:error"

# Warning logs
railway logs --lines 10 --filter "@level:warn"

# Warning logs related to rate limiting
railway logs --lines 10 --filter "@level:warn AND rate limit"
```

### HTTP Logs (Typed Filters)

```bash
# GET requests with status 200
railway logs --http --method GET --status 200

# POST requests to specific path
railway logs --http --method POST --path /api/users

# Client/server errors (status >= 400), last 50
railway logs --http --status ">=400" --lines 50

# Server errors only (500-599)
railway logs --http --status 500..599

# Find specific request by ID
railway logs --http --request-id abc123
```

### Advanced Raw Filters

```bash
# Slow requests (> 1 second)
railway logs --http --method GET --filter "@totalDuration:>=1000"

# Filter by source IP and region
railway logs --http --filter "@srcIp:203.0.113.1 @edgeRegion:us-east-1"

# Errors on API routes
railway logs --http --filter "@httpStatus:>=400 AND @path:/api"

# Exclude OPTIONS requests
railway logs --http --filter "-@method:OPTIONS"
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

---

## 🔧 COMMON TROUBLESHOOTING

### 1. Service Crash / Restart Loop
```bash
# Check error logs
railway logs --lines 20 --filter "@level:error"

# Check latest deployment logs
railway logs --latest
```
**Common causes:** Missing env var, wrong port, dependency error

### 2. 404 Error dari OpenRouter
```bash
# Check model name dalam env var
# ❌ Wrong: OPENROUTER_MODEL=gemini-flash
# ✅ Correct: OPENROUTER_MODEL=google/gemini-2.0-flash-exp:free
```

### 3. Service Tak Connect ke Service Lain
```bash
# Verify: mesti ada https:// prefix, takde trailing slash /
# ✅ CREW_SERVICE_URL=https://aura-crewresearch-xxxx.up.railway.app
# ❌ CREW_SERVICE_URL=aura-crewresearch-xxxx.up.railway.app/
```

### 4. Supabase Connection Failed
```bash
# SUPABASE_URL → https://xxxx.supabase.co (NO /rest/v1 suffix!)
# SUPABASE_SERVICE_ROLE_KEY → must be service_role, NOT anon key
```

### 5. Telegram Bot Tak Respond
```bash
# Check Gateway logs for incoming webhook
railway service   # → switch ke Gateway
railway logs --lines 20

# Check for HTTP errors
railway logs --http --status ">=400" --lines 20
```

---

## 📊 RAILWAY CLI CHEATSHEET

```bash
# Authentication
railway login --browserless    # Login tanpa browser
railway whoami                 # Check current user
railway logout                 # Logout

# Project Management
railway status                 # Current project/service info
railway link                   # Link ke project
railway service                # Switch service
railway open                   # Open dalam browser

# Deployment
railway up                     # Deploy current directory
railway redeploy               # Redeploy latest
railway restart                # Restart service
railway down                   # Remove latest deployment

# Logs
railway logs                   # View logs
railway logs --latest          # Latest deployment logs
railway logs --lines 50        # Last 50 lines
railway logs --json            # JSON format
railway logs --filter "xxx"    # Filter logs

# Variables
railway variables              # List all env vars
railway variables set KEY=VAL  # Set env var
```

---

## 🔐 SECURITY NOTES

1. **JANGAN** commit `.env.railway` ke Git
2. **JANGAN** share token secara public
3. Kalau token exposed, DELETE segera dan create baru
4. Guna `railway login --browserless` untuk Codespace sessions

---

## 🤖 CLINE QUICK REFERENCE

**Untuk Cline — gunakan section ini sebagai panduan cepat:**

### Nak check logs satu service:
```bash
railway service          # → pilih service
railway logs --lines 20
```

### Nak cari errors:
```bash
railway logs --lines 20 --filter "@level:error"
```

### Nak check HTTP errors:
```bash
railway logs --http --status ">=400" --lines 20
```

### Nak tengok latest deployment (termasuk yang fail):
```bash
railway logs --latest
```

### Nak switch service:
```bash
railway service
# Pilih: Aura-Gateway / Aura-Brain / Aura-CrewResearch / Aura-CrewImage / Aura-HermesExecutor
```

### Nak redeploy after fix:
```bash
git add . && git commit -m "fix: <description>" && git push
# Railway auto-deploy dari GitHub push
```

### ⚠️ JANGAN GUNA (tak wujud dalam CLI ni):
```
❌ railway logs --follow
❌ railway logs -f
```

---

> **Cline:** Rujuk file ini sebelum run apa-apa Railway command.
> Kalau session expired, minta user run `railway login --browserless`.
