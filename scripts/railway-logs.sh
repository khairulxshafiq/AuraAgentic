#!/bin/bash
# ============================================================
# 🚀 AURA Railway Logs Viewer
# Single script untuk akses logs semua AURA services di Railway
# 
# Usage:
#   ./scripts/railway-logs.sh <service|all> [--follow] [--latest]
#
# Services: gateway | brain | crewresearch | crewimage | hermes | all
# 
# Cline: Guna script ni untuk baca logs mana-mana AURA service.
#        Rujuk docs/railway-ops.md untuk full documentation.
# ============================================================

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# --- Config ---
ENV_FILE=".env.railway"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# --- Functions ---
print_header() {
    echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║  ${BOLD}🚀 AURA Railway Logs Viewer${NC}${CYAN}             ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
    echo ""
}

print_help() {
    print_header
    echo -e "${BOLD}Usage:${NC}"
    echo -e "  ./scripts/railway-logs.sh ${GREEN}<service>${NC} [options]"
    echo ""
    echo -e "${BOLD}Services:${NC}"
    echo -e "  ${GREEN}gateway${NC}        Aura-Gateway (Telegram webhook, routing)"
    echo -e "  ${GREEN}brain${NC}          Aura-Brain (Core reasoning engine)"
    echo -e "  ${GREEN}crewresearch${NC}   Aura-CrewResearch (Research crew)"
    echo -e "  ${GREEN}crewimage${NC}      Aura-CrewImage (Image generation crew)"
    echo -e "  ${GREEN}hermes${NC}         Aura-HermesExecutor (Task executor)"
    echo -e "  ${GREEN}all${NC}            Semua services sekaligus"
    echo ""
    echo -e "${BOLD}Options:${NC}"
    echo -e "  ${YELLOW}--follow, -f${NC}   Stream logs secara real-time"
    echo -e "  ${YELLOW}--latest, -l${NC}   Logs dari latest deployment sahaja"
    echo -e "  ${YELLOW}--help, -h${NC}     Paparkan help message ini"
    echo ""
    echo -e "${BOLD}Examples:${NC}"
    echo -e "  ./scripts/railway-logs.sh gateway          # View gateway logs"
    echo -e "  ./scripts/railway-logs.sh brain --follow    # Stream brain logs"
    echo -e "  ./scripts/railway-logs.sh all               # View semua logs"
    echo -e "  ./scripts/railway-logs.sh hermes --latest   # Latest deployment logs"
    echo ""
    echo -e "${BOLD}Setup:${NC}"
    echo -e "  1. Create ${YELLOW}.env.railway${NC} di project root"
    echo -e "  2. Tambah tokens untuk setiap service:"
    echo -e "     RAILWAY_TOKEN_GATEWAY=xxx"
    echo -e "     RAILWAY_TOKEN_BRAIN=xxx"
    echo -e "     RAILWAY_TOKEN_CREWRESEARCH=xxx"
    echo -e "     RAILWAY_TOKEN_CREWIMAGE=xxx"
    echo -e "     RAILWAY_TOKEN_HERMES=xxx"
    echo -e "  3. Pastikan .env.railway ada dalam .gitignore!"
    echo ""
}

check_railway_cli() {
    if ! command -v railway &> /dev/null; then
        echo -e "${RED}❌ Railway CLI not found!${NC}"
        echo -e "Install: ${YELLOW}bash <(curl -fsSL railway.com/install.sh)${NC}"
        exit 1
    fi
}

load_env() {
    local env_path="$PROJECT_ROOT/$ENV_FILE"
    if [ -f "$env_path" ]; then
        echo -e "${GREEN}✅ Loading tokens from $ENV_FILE${NC}"
        set -a
        source "$env_path"
        set +a
    else
        echo -e "${YELLOW}⚠️  $ENV_FILE not found at $env_path${NC}"
        echo -e "${YELLOW}   Will try using railway login session instead.${NC}"
        echo -e "${YELLOW}   Create $ENV_FILE with tokens for direct access.${NC}"
        echo ""
    fi
}

get_token_var() {
    local service="$1"
    case "$service" in
        gateway)      echo "RAILWAY_TOKEN_GATEWAY" ;;
        brain)        echo "RAILWAY_TOKEN_BRAIN" ;;
        crewresearch) echo "RAILWAY_TOKEN_CREWRESEARCH" ;;
        crewimage)    echo "RAILWAY_TOKEN_CREWIMAGE" ;;
        hermes)       echo "RAILWAY_TOKEN_HERMES" ;;
        *)            echo "" ;;
    esac
}

get_service_label() {
    local service="$1"
    case "$service" in
        gateway)      echo "🌐 Aura-Gateway" ;;
        brain)        echo "🧠 Aura-Brain" ;;
        crewresearch) echo "🔍 Aura-CrewResearch" ;;
        crewimage)    echo "🎨 Aura-CrewImage" ;;
        hermes)       echo "⚡ Aura-HermesExecutor" ;;
        *)            echo "❓ Unknown" ;;
    esac
}

get_service_color() {
    local service="$1"
    case "$service" in
        gateway)      echo "$GREEN" ;;
        brain)        echo "$BLUE" ;;
        crewresearch) echo "$MAGENTA" ;;
        crewimage)    echo "$YELLOW" ;;
        hermes)       echo "$CYAN" ;;
        *)            echo "$NC" ;;
    esac
}

view_logs() {
    local service="$1"
    local extra_args="$2"
    local token_var=$(get_token_var "$service")
    local label=$(get_service_label "$service")
    local color=$(get_service_color "$service")
    
    echo -e "${color}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${color}${BOLD}  $label${NC}"
    echo -e "${color}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    local token_value="${!token_var}"
    
    if [ -n "$token_value" ]; then
        # Use environment-specific token
        RAILWAY_TOKEN="$token_value" railway logs $extra_args 2>&1
    else
        # Fallback: try using logged-in session with service flag
        echo -e "${YELLOW}  (Using login session — no token found for $service)${NC}"
        railway logs --service "$service" $extra_args 2>&1
    fi
    
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        echo -e "${RED}  ❌ Failed to fetch logs for $service (exit code: $exit_code)${NC}"
        echo -e "${YELLOW}  💡 Tips:${NC}"
        echo -e "${YELLOW}     - Run: railway login --browserless${NC}"
        echo -e "${YELLOW}     - Or add token to .env.railway${NC}"
    fi
    echo ""
}

# --- Main ---
SERVICE=""
EXTRA_ARGS=""
ALL_SERVICES=("gateway" "brain" "crewresearch" "crewimage" "hermes")

# Parse arguments
for arg in "$@"; do
    case "$arg" in
        --help|-h)
            print_help
            exit 0
            ;;
        --follow|-f)
            EXTRA_ARGS="$EXTRA_ARGS --follow"
            ;;
        --latest|-l)
            EXTRA_ARGS="$EXTRA_ARGS --latest"
            ;;
        gateway|brain|crewresearch|crewimage|hermes|all)
            SERVICE="$arg"
            ;;
        *)
            echo -e "${RED}❌ Unknown argument: $arg${NC}"
            echo -e "Run ${YELLOW}./scripts/railway-logs.sh --help${NC} for usage."
            exit 1
            ;;
    esac
done

# Validate service argument
if [ -z "$SERVICE" ]; then
    print_help
    echo -e "${RED}❌ Please specify a service name.${NC}"
    exit 1
fi

# Run
print_header
check_railway_cli
load_env

if [ "$SERVICE" = "all" ]; then
    echo -e "${BOLD}📋 Viewing logs for ALL services...${NC}"
    echo ""
    for svc in "${ALL_SERVICES[@]}"; do
        view_logs "$svc" "$EXTRA_ARGS"
    done
    echo -e "${GREEN}${BOLD}✅ Done — all service logs displayed.${NC}"
else
    view_logs "$SERVICE" "$EXTRA_ARGS"
fi
