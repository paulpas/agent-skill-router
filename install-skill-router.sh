#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# ANSI color codes
# ─────────────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

ok()   { echo -e "  ${GREEN}→${RESET} $*"; }
warn() { echo -e "  ${YELLOW}→ WARNING:${RESET} $*"; }
err()  { echo -e "  ${RED}→ ERROR:${RESET} $*" >&2; }
info() { echo -e "  ${CYAN}→${RESET} $*"; }

# ─────────────────────────────────────────────────────────────────────────────
# STEP 1 — Parse arguments
# ─────────────────────────────────────────────────────────────────────────────
OPENAI_API_KEY="${OPENAI_API_KEY:-}"
PORT=3000
SKILLS_DIR_ARG=""
CONFIG_ARG=""
NO_SERVICE=false
INTEGRATE_OPENCODE=false
LLM_PROVIDER="${LLM_PROVIDER:-openai}"
LLM_MODEL="${LLM_MODEL:-}"
EMBEDDING_MODEL="${EMBEDDING_MODEL:-}"
ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}"
LLAMACPP_URL="${LLAMACPP_URL:-}"
EMBEDDING_PROVIDER="${EMBEDDING_PROVIDER:-openai}"
GITHUB_ENABLED=true
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
SYNC_INTERVAL="${SYNC_INTERVAL:-3600}"
INTEGRATE_CLAUDE=false
CLAUDE_CONFIG_ARG=""

usage() {
  cat <<EOF
${BOLD}Usage:${RESET} $0 [OPTIONS]

Install and configure the Skill Router Docker container.

${BOLD}Options:${RESET}
  --openai-key KEY       OpenAI API key (or set OPENAI_API_KEY env var)
  --port PORT            Host port to bind (default: 3000)
  --skills-dir PATH      Path to agent-skill-routing-system directory
  --no-service           Skip systemd user service setup
  --integrate-opencode   Generate skill-router-api.md and register it in
                         opencode.json instructions (steps 11-13)
  --config PATH          Path to opencode.json (only used with --integrate-opencode)
  --provider openai|anthropic|llamacpp   LLM provider (default: openai)
  --model MODEL                          LLM model name (provider default if omitted)
  --embedding-model MODEL                Embedding model name (provider default if omitted)
  --anthropic-key KEY                    Anthropic API key (or ANTHROPIC_API_KEY env)
  --llamacpp-url URL                     llama.cpp base URL (default: http://host.docker.internal:8080)
  --embedding-provider openai|llamacpp   Embedding provider (default: openai)
  --no-github              Disable GitHub remote skill loading
  --github-token TOKEN     GitHub token (or GITHUB_TOKEN env) for higher rate limits
  --sync-interval SECS     GitHub sync interval in seconds (default: 3600)
  --integrate-claude       Generate MCP script and register in claude.json
                           mcpServers section (steps 14-16)
  --claude-config PATH     Path to claude.json (auto-detects with fallbacks)
  --help                 Show this help message

${BOLD}Examples:${RESET}
  OPENAI_API_KEY=sk-... $0
  $0 --openai-key sk-... --port 3001 --no-service
  $0 --openai-key sk-... --integrate-opencode
  $0 --openai-key sk-... --integrate-opencode --config ~/.config/opencode/opencode.json
  $0 --openai-key sk-... --provider anthropic --anthropic-key sk-ant-... --model claude-3-5-haiku-20241022
  $0 --provider llamacpp --llamacpp-url http://host.docker.internal:8080 --embedding-provider llamacpp
EOF
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --openai-key)
      OPENAI_API_KEY="${2:?'--openai-key requires a value'}"
      shift 2
      ;;
    --port)
      PORT="${2:?'--port requires a value'}"
      shift 2
      ;;
    --skills-dir)
      SKILLS_DIR_ARG="${2:?'--skills-dir requires a value'}"
      shift 2
      ;;
    --config)
      CONFIG_ARG="${2:?'--config requires a value'}"
      shift 2
      ;;
    --no-service)
      NO_SERVICE=true
      shift
      ;;
    --integrate-opencode)
      INTEGRATE_OPENCODE=true
      shift
      ;;
    --provider)
      LLM_PROVIDER="${2:?'--provider requires a value'}"
      shift 2
      ;;
    --model)
      LLM_MODEL="${2:?'--model requires a value'}"
      shift 2
      ;;
    --embedding-model)
      EMBEDDING_MODEL="${2:?'--embedding-model requires a value'}"
      shift 2
      ;;
    --anthropic-key)
      ANTHROPIC_API_KEY="${2:?'--anthropic-key requires a value'}"
      shift 2
      ;;
    --llamacpp-url)
      LLAMACPP_URL="${2:?'--llamacpp-url requires a value'}"
      shift 2
      ;;
    --embedding-provider)
      EMBEDDING_PROVIDER="${2:?'--embedding-provider requires a value'}"
      shift 2
      ;;
    --no-github)       GITHUB_ENABLED=false; shift ;;
    --github-token)    GITHUB_TOKEN="$2"; shift 2 ;;
    --sync-interval)   SYNC_INTERVAL="$2"; shift 2 ;;
    --integrate-claude)
      INTEGRATE_CLAUDE=true
      shift
      ;;
    --claude-config)
      CLAUDE_CONFIG_ARG="${2:?'--claude-config requires a value'}"
      shift 2
      ;;
    --help|-h)
      usage
      ;;
    *)
      err "Unknown argument: $1"
      echo "  Run '$0 --help' for usage." >&2
      exit 1
      ;;
  esac
done

echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}║         Skill Router Installer                    ║${RESET}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════╝${RESET}"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# STEP 2 — Detect OpenCode config (only when --integrate-opencode is set)
# ─────────────────────────────────────────────────────────────────────────────
OPENCODE_CONFIG=""

if $INTEGRATE_OPENCODE; then
  echo -e "${BOLD}[Step 2] Detecting OpenCode config...${RESET}"

  if [[ -n "$CONFIG_ARG" ]]; then
    if [[ -f "$CONFIG_ARG" ]]; then
      OPENCODE_CONFIG="$CONFIG_ARG"
      ok "Using config from --config arg: $OPENCODE_CONFIG"
    else
      err "--config path does not exist: $CONFIG_ARG"
      exit 1
    fi
  elif [[ -f "$HOME/.config/opencode/opencode.json" ]]; then
    OPENCODE_CONFIG="$HOME/.config/opencode/opencode.json"
    ok "Found config at: $OPENCODE_CONFIG"
  elif [[ -f "$PWD/.opencode/opencode.json" ]]; then
    OPENCODE_CONFIG="$PWD/.opencode/opencode.json"
    ok "Found config at: $OPENCODE_CONFIG"
  else
    err "Could not find opencode.json. Searched:"
    err "  1. $HOME/.config/opencode/opencode.json"
    err "  2. $PWD/.opencode/opencode.json"
    err "Use --config PATH to specify its location, or omit --integrate-opencode."
    exit 1
  fi
else
  info "[Step 2] Skipping OpenCode config detection (pass --integrate-opencode to enable)"
fi

# ─────────────────────────────────────────────────────────────────────────────
# STEP 3 — Detect routing system directory
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}[Step 3] Detecting routing system directory...${RESET}"

ROUTER_DIR=""

_check_router_dir() {
  local candidate="$1"
  if [[ -d "$candidate" && -f "$candidate/Dockerfile" ]]; then
    ROUTER_DIR="$candidate"
    return 0
  fi
  return 1
}

if [[ -n "$SKILLS_DIR_ARG" ]]; then
  if _check_router_dir "$SKILLS_DIR_ARG"; then
    ok "Using routing system from --skills-dir: $ROUTER_DIR"
  else
    err "--skills-dir path does not contain a Dockerfile: $SKILLS_DIR_ARG"
    exit 1
  fi
elif _check_router_dir "$PWD/agent-skill-routing-system"; then
  ok "Found routing system at: $ROUTER_DIR"
elif _check_router_dir "$HOME/git/skills/agent-skill-routing-system"; then
  ok "Found routing system at: $ROUTER_DIR"
elif _check_router_dir "$HOME/.config/opencode/skills/agent-skill-routing-system"; then
  ok "Found routing system at: $ROUTER_DIR"
else
  err "Could not find agent-skill-routing-system with a Dockerfile. Searched:"
  err "  1. $PWD/agent-skill-routing-system"
  err "  2. $HOME/git/skills/agent-skill-routing-system"
  err "  3. $HOME/.config/opencode/skills/agent-skill-routing-system"
  err "Use --skills-dir PATH to specify its location."
  exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
# STEP 4 — Prerequisite checks
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}[Step 4] Checking prerequisites...${RESET}"

# docker
if ! command -v docker &>/dev/null; then
  err "docker is not installed. Install it from https://docs.docker.com/get-docker/"
  exit 1
fi
ok "docker found: $(docker --version)"

if ! docker info &>/dev/null; then
  err "Docker daemon is not running. Start it with: sudo systemctl start docker"
  exit 1
fi
ok "Docker daemon is running"

# curl
if ! command -v curl &>/dev/null; then
  err "curl is not installed. Install it with: apt-get install curl  OR  brew install curl"
  exit 1
fi
ok "curl found: $(curl --version | head -1)"

# jq or python3
HAS_JQ=false
HAS_PYTHON3=false

if command -v jq &>/dev/null; then
  HAS_JQ=true
  ok "jq found: $(jq --version)"
elif command -v python3 &>/dev/null; then
  HAS_PYTHON3=true
  ok "python3 found (jq fallback): $(python3 --version)"
else
  err "Neither jq nor python3 is available. Install one:"
  err "  apt-get install jq   OR   brew install jq"
  exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
# STEP 5 — OPENAI_API_KEY handling
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}[Step 5] Validating OPENAI_API_KEY...${RESET}"

if [[ "$LLM_PROVIDER" != "llamacpp" || "$EMBEDDING_PROVIDER" != "llamacpp" ]]; then
  if [[ -z "$OPENAI_API_KEY" ]]; then
    err "OPENAI_API_KEY is required when using openai provider for LLM or embeddings."
    err "Set it with:  --openai-key sk-...   OR   export OPENAI_API_KEY=sk-..."
    err "For a fully local setup: --provider llamacpp --embedding-provider llamacpp"
    exit 1
  fi
  ok "OPENAI_API_KEY is set (${#OPENAI_API_KEY} chars)"
else
  info "Skipping OPENAI_API_KEY check (using llamacpp for both LLM and embeddings)"
fi

if [[ "$LLM_PROVIDER" == "anthropic" && -z "$ANTHROPIC_API_KEY" ]]; then
  err "--provider anthropic requires --anthropic-key or ANTHROPIC_API_KEY env var"
  exit 1
fi
[[ -n "$ANTHROPIC_API_KEY" ]] && ok "ANTHROPIC_API_KEY is set (${#ANTHROPIC_API_KEY} chars)"

# ─────────────────────────────────────────────────────────────────────────────
# STEP 6 — Build Docker image
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}[Step 6] Building Docker image...${RESET}"
info "Building skill-router:latest from $ROUTER_DIR"

if ! docker build -t skill-router:latest "$ROUTER_DIR"; then
  err "Docker build failed. Check the output above for details."
  exit 1
fi
ok "Docker image built successfully: skill-router:latest"

# ─────────────────────────────────────────────────────────────────────────────
# STEP 7 — Stop/remove existing container (idempotent)
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}[Step 7] Removing existing container (if any)...${RESET}"
docker stop skill-router 2>/dev/null && ok "Stopped existing skill-router container" || true
docker rm   skill-router 2>/dev/null && ok "Removed existing skill-router container" || true

# ─────────────────────────────────────────────────────────────────────────────
# STEP 8 — Run the container
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}[Step 8] Starting container...${RESET}"

docker run -d \
  --name skill-router \
  --restart unless-stopped \
  -p "${PORT}:3000" \
  -e OPENAI_API_KEY="$OPENAI_API_KEY" \
  -e LLM_PROVIDER="$LLM_PROVIDER" \
  ${LLM_MODEL:+-e LLM_MODEL="$LLM_MODEL"} \
  ${EMBEDDING_MODEL:+-e EMBEDDING_MODEL="$EMBEDDING_MODEL"} \
  ${ANTHROPIC_API_KEY:+-e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY"} \
  ${LLAMACPP_URL:+-e LLAMACPP_BASE_URL="$LLAMACPP_URL"} \
  -e EMBEDDING_PROVIDER="$EMBEDDING_PROVIDER" \
  -e GITHUB_SKILLS_ENABLED="$GITHUB_ENABLED" \
  -e SKILL_SYNC_INTERVAL="$SYNC_INTERVAL" \
  ${GITHUB_TOKEN:+-e GITHUB_TOKEN="$GITHUB_TOKEN"} \
  -e SKILLS_DIRECTORY=/skills \
  -v "${ROUTER_DIR%/agent-skill-routing-system}/skills:/skills:ro" \
  -v skill-router-cache:/cache \
  skill-router:latest

ok "Container started: skill-router on port $PORT"

# ─────────────────────────────────────────────────────────────────────────────
# STEP 9 — Health check (poll with retry)
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}[Step 9] Waiting for health check...${RESET}"
info "Note: skills load in the background — server responds immediately, ready:true appears once loading completes"
info "Polling http://localhost:${PORT}/health (up to 60 attempts, 5s apart = 5min max)"

HEALTH_RESPONSE=""
HEALTHY=false

for attempt in $(seq 1 60); do
  printf "  ."
  sleep 5
  HTTP_CODE=$(curl -s -o /tmp/skill-router-health.json -w "%{http_code}" \
    "http://localhost:$PORT/health" 2>/dev/null || echo "000")

  if [[ "$HTTP_CODE" == "200" ]]; then
    HEALTH_RESPONSE=$(cat /tmp/skill-router-health.json)
    if echo "$HEALTH_RESPONSE" | grep -q '"healthy"'; then
      HEALTHY=true
      break
    fi
  fi
done

echo ""

if [[ "$HEALTHY" != "true" ]]; then
  err "Health check failed after 60 attempts."
  err "Container logs:"
  docker logs skill-router --tail 20 >&2
  exit 1
fi

READY=$(echo "$HEALTH_RESPONSE" | grep -o '"ready:[a-z]*' | cut -d: -f2 || echo "unknown")

ok "Health check passed on attempt $attempt"
echo ""
echo -e "  ${GREEN}→ Server is up (ready: $READY)${RESET}"
if [[ "$READY" != "true" ]]; then
  echo -e "  ${YELLOW}→ Skills are still loading in background. Check readiness with:${RESET}"
  echo -e "      curl http://localhost:${PORT}/health | jq .ready"
fi
echo ""
echo -e "  ${GREEN}Health response:${RESET}"
if $HAS_JQ; then
  echo "$HEALTH_RESPONSE" | jq .
else
  echo "$HEALTH_RESPONSE" | python3 -m json.tool
fi

# ─────────────────────────────────────────────────────────────────────────────
# STEP 10 — Show stats
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}[Step 10] Skill Router stats:${RESET}"
STATS_RESPONSE=$(curl -s "http://localhost:$PORT/stats")
if $HAS_JQ; then
  echo "$STATS_RESPONSE" | jq . || warn "Stats response could not be parsed as JSON"
else
  echo "$STATS_RESPONSE" | python3 -m json.tool || warn "Stats response could not be parsed as JSON"
fi

# ─────────────────────────────────────────────────────────────────────────────
# STEPS 11-13 — OpenCode integration (only when --integrate-opencode is set)
# ─────────────────────────────────────────────────────────────────────────────
API_DOC_PATH=""

if $INTEGRATE_OPENCODE; then

  # STEP 11 — Fetch skill-router-api.md from GitHub
  echo ""
  echo -e "${BOLD}[Step 11] Fetching skill-router-api.md from GitHub...${RESET}"

  API_DOC_PATH="$HOME/.config/opencode/skill-router-api.md"
  RAW_URL="https://raw.githubusercontent.com/paulpas/skills/main/agent-skill-routing-system/skill-router-api.md"
  mkdir -p "$HOME/.config/opencode"

  if command -v curl &>/dev/null; then
    curl -fsSL "$RAW_URL" -o "$API_DOC_PATH" && ok "Written: $API_DOC_PATH" || warn "curl fetch failed, skipping"
  elif command -v wget &>/dev/null; then
    wget -q "$RAW_URL" -O "$API_DOC_PATH" && ok "Written: $API_DOC_PATH" || warn "wget fetch failed, skipping"
  else
    warn "Neither curl nor wget found — skipping skill-router-api.md fetch"
  fi

  # STEP 12 — Update opencode.json instructions array
  echo ""
  echo -e "${BOLD}[Step 12] Updating opencode.json instructions array...${RESET}"

  INSTRUCTIONS_PATH="$HOME/.config/opencode/skill-router-api.md"

  _update_instructions_jq() {
    if jq -e --arg p "$INSTRUCTIONS_PATH" \
      '(.instructions // []) | index($p) != null' \
      "$OPENCODE_CONFIG" > /dev/null 2>&1; then
      ok "Already in instructions array, skipping"
    else
      jq --arg p "$INSTRUCTIONS_PATH" '
        if .instructions then
          .instructions += [$p]
        else
          .instructions = [$p]
        end
      ' "$OPENCODE_CONFIG" > "$OPENCODE_CONFIG.tmp" && mv "$OPENCODE_CONFIG.tmp" "$OPENCODE_CONFIG"
      ok "Added $INSTRUCTIONS_PATH to instructions array"
    fi
  }

  _update_instructions_python() {
    python3 - "$OPENCODE_CONFIG" "$INSTRUCTIONS_PATH" <<'PYEOF'
import json, sys
config_path = sys.argv[1]
instr_path = sys.argv[2]
with open(config_path) as f:
    cfg = json.load(f)
if 'instructions' not in cfg:
    cfg['instructions'] = []
if instr_path not in cfg['instructions']:
    cfg['instructions'].append(instr_path)
    with open(config_path, 'w') as f:
        json.dump(cfg, f, indent=2)
    print('Added to instructions array')
else:
    print('Already in instructions array, skipping')
PYEOF
  }

  if $HAS_JQ; then
    _update_instructions_jq
  else
    _update_instructions_python
  fi

  # STEP 12b — Install the skill-router-mcp.js bridge script
  # The bridge is a stdio MCP server that OpenCode launches; it proxies
  # tool calls to the router's HTTP API. This file is portable across
  # Linux and macOS (no hardcoded absolute paths — it resolves $HOME,
  # SKILLS dir, and log path at runtime).
  #
  # Install the file BEFORE injecting the config entry (Step 12c), so
  # opencode.json never references a missing file. If this step fails,
  # opencode.json is left untouched.
  echo ""
  echo -e "${BOLD}[Step 12b] Installing skill-router-mcp.js bridge script...${RESET}"

  MCP_NODE_CMD="$(which node)"
  MCP_SCRIPT_PATH="$HOME/.config/opencode/skill-router-mcp.js"
  BRIDGE_SRC="$ROUTER_DIR/skill-router-mcp.js"

  if [[ ! -f "$BRIDGE_SRC" ]]; then
    err "Bridge script source not found: $BRIDGE_SRC"
    err "Expected it shipped alongside the Dockerfile in $ROUTER_DIR"
    exit 1
  fi

  mkdir -p "$(dirname "$MCP_SCRIPT_PATH")"

  if [[ -f "$MCP_SCRIPT_PATH" ]]; then
    # Only overwrite if content differs, to preserve local edits if any.
    if cmp -s "$BRIDGE_SRC" "$MCP_SCRIPT_PATH"; then
      ok "Bridge script already up to date: $MCP_SCRIPT_PATH"
    else
      cp "$BRIDGE_SRC" "$MCP_SCRIPT_PATH"
      ok "Bridge script updated: $MCP_SCRIPT_PATH"
    fi
  else
    cp "$BRIDGE_SRC" "$MCP_SCRIPT_PATH"
    ok "Bridge script installed: $MCP_SCRIPT_PATH"
  fi

  # Sanity-check the copy with `node --check` if node is available.
  if node --check "$MCP_SCRIPT_PATH" 2>/dev/null; then
    ok "Bridge script syntax valid"
  else
    warn "node --check failed on $MCP_SCRIPT_PATH — review manually"
  fi

  # STEP 12c — Inject skill-router MCP entry into opencode.json
  # This runs AFTER Step 12b so the config never points at a missing file.
  echo ""
  echo -e "${BOLD}[Step 12c] Injecting skill-router MCP server into $OPENCODE_CONFIG...${RESET}"

  if command -v jq &>/dev/null; then
    if jq -e '.mcp["skill-router"]' "$OPENCODE_CONFIG" > /dev/null 2>&1; then
      ok "skill-router already in mcp section, skipping"
    else
      jq --arg cmd "$MCP_NODE_CMD" --arg script "$MCP_SCRIPT_PATH" '
        .mcp["skill-router"] = {
          "type": "local",
          "command": [$cmd, $script],
          "enabled": true
        }
      ' "$OPENCODE_CONFIG" > "$OPENCODE_CONFIG.tmp" && mv "$OPENCODE_CONFIG.tmp" "$OPENCODE_CONFIG"
      ok "Added skill-router to mcp section"
    fi
  else
    python3 - "$OPENCODE_CONFIG" "$MCP_NODE_CMD" "$MCP_SCRIPT_PATH" <<'PYEOF'
import sys, json
cfg_path, node_cmd, script_path = sys.argv[1], sys.argv[2], sys.argv[3]
with open(cfg_path) as f:
    cfg = json.load(f)
if 'mcp' not in cfg:
    cfg['mcp'] = {}
if 'skill-router' not in cfg['mcp']:
    cfg['mcp']['skill-router'] = {
        "type": "local",
        "command": [node_cmd, script_path],
        "enabled": True
    }
    with open(cfg_path, 'w') as f:
        json.dump(cfg, f, indent=2)
    print("Added skill-router to mcp section")
else:
    print("skill-router already in mcp section, skipping")
PYEOF
  fi

  # STEP 13 — Validate opencode.json
  echo ""
  echo -e "${BOLD}[Step 13] Validating opencode.json...${RESET}"

  if $HAS_JQ; then
    if jq empty "$OPENCODE_CONFIG" 2>/dev/null; then
      ok "opencode.json is valid JSON"
    else
      warn "opencode.json may have JSON errors — review manually: $OPENCODE_CONFIG"
    fi
  else
    if python3 -c "import json; json.load(open('$OPENCODE_CONFIG'))" 2>/dev/null; then
      ok "opencode.json is valid JSON"
    else
      warn "opencode.json may have JSON errors — review manually: $OPENCODE_CONFIG"
    fi
  fi

else
  info "[Steps 11-13] Skipping OpenCode integration (pass --integrate-opencode to enable)"
fi

# ─────────────────────────────────────────────────────────────────────────────
# STEP 14 — Detect Claude config (only when --integrate-claude is set)
# ─────────────────────────────────────────────────────────────────────────────
CLAUDE_CONFIG=""

if $INTEGRATE_CLAUDE; then
  echo ""
  echo -e "${BOLD}[Step 14] Detecting Claude config...${RESET}"

  if [[ -n "$CLAUDE_CONFIG_ARG" ]]; then
    if [[ -f "$CLAUDE_CONFIG_ARG" ]]; then
      CLAUDE_CONFIG="$CLAUDE_CONFIG_ARG"
      ok "Using config from --claude-config arg: $CLAUDE_CONFIG"
    else
      err "--claude-config path does not exist: $CLAUDE_CONFIG_ARG"
      exit 1
    fi
  elif [[ -f "$HOME/.claude.json" ]]; then
    CLAUDE_CONFIG="$HOME/.claude.json"
    ok "Found config at: $CLAUDE_CONFIG"
  elif [[ -f "$HOME/.config/claude/claude.json" ]]; then
    CLAUDE_CONFIG="$HOME/.config/claude/claude.json"
    ok "Found config at: $CLAUDE_CONFIG"
  elif [[ -f "$HOME/Library/Application Support/Claude/claude.json" ]]; then
    CLAUDE_CONFIG="$HOME/Library/Application Support/Claude/claude.json"
    ok "Found config at: $CLAUDE_CONFIG"
  else
    err "Could not find claude.json. Searched:"
    err "  1. $HOME/.claude.json"
    err "  2. $HOME/.config/claude/claude.json"
    err "  3. $HOME/Library/Application Support/Claude/claude.json"
    err "Use --claude-config PATH to specify its location, or omit --integrate-claude."
    exit 1
  fi
else
  info "[Step 14] Skipping Claude config detection (pass --integrate-claude to enable)"
fi

# ─────────────────────────────────────────────────────────────────────────────
# STEP 15 — Inject skill-router MCP entry into claude.json
# ─────────────────────────────────────────────────────────────────────────────
if $INTEGRATE_CLAUDE; then
  echo ""
  echo -e "${BOLD}[Step 15] Injecting skill-router MCP server into $CLAUDE_CONFIG...${RESET}"

  MCP_NODE_CMD="$(which node)"
  MCP_SCRIPT_PATH="$HOME/.config/claude/skill-router-mcp.js"

  # Create MCP script directory if needed
  mkdir -p "$HOME/.config/claude"

  # Create MCP script (same as OpenCode - stdio-based transport)
  if [[ ! -f "$MCP_SCRIPT_PATH" ]]; then
    cat > "$MCP_SCRIPT_PATH" <<'MCPSCRIPT'
// skill-router MCP server for Claude
// Auto-generated by install-skill-router.sh
const { spawn } = require('child_process');
const path = require('path');

const SERVER_PATH = path.join(__dirname, 'skill-router-server.js');

function createStdioTransport() {
  return {
    readable: process.stdin,
    writable: process.stdout
  };
}

function createServer() {
  const child = spawn(process.execPath, [SERVER_PATH], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, MCP_MODE: 'stdio' }
  });

  child.stderr.on('data', (data) => {
    console.error(`[skill-router] ${data}`);
  });

  return {
    process: child,
    transport: createStdioTransport()
  };
}

const server = createServer();
MCPSCRIPT
    ok "Written MCP script: $MCP_SCRIPT_PATH"
  else
    ok "MCP script already exists: $MCP_SCRIPT_PATH"
  fi

  # Inject into claude.json using jq or python3
  if command -v jq &>/dev/null; then
    if jq -e '.mcpServers["skill-router"]' "$CLAUDE_CONFIG" > /dev/null 2>&1; then
      ok "skill-router already in mcpServers section, skipping"
    else
      jq --arg cmd "$MCP_NODE_CMD" --arg script "$MCP_SCRIPT_PATH" '
        .mcpServers["skill-router"] = {
          "command": $cmd,
          "args": [$script],
          "env": {}
        }
      ' "$CLAUDE_CONFIG" > "$CLAUDE_CONFIG.tmp" && mv "$CLAUDE_CONFIG.tmp" "$CLAUDE_CONFIG"
      ok "Added skill-router to mcpServers section"
    fi
  else
    python3 - "$CLAUDE_CONFIG" "$MCP_NODE_CMD" "$MCP_SCRIPT_PATH" <<'PYEOF'
import sys, json
cfg_path, node_cmd, script_path = sys.argv[1], sys.argv[2], sys.argv[3]
with open(cfg_path) as f:
    cfg = json.load(f)
if 'mcpServers' not in cfg:
    cfg['mcpServers'] = {}
if 'skill-router' not in cfg['mcpServers']:
    cfg['mcpServers']['skill-router'] = {
        "command": node_cmd,
        "args": [script_path],
        "env": {}
    }
    with open(cfg_path, 'w') as f:
        json.dump(cfg, f, indent=2)
    print("Added skill-router to mcpServers section")
else:
    print("skill-router already in mcpServers section, skipping")
PYEOF
  fi

  # Validate JSON
  echo ""
  echo -e "${BOLD}[Step 15b] Validating claude.json...${RESET}"

  if command -v jq &>/dev/null; then
    if jq empty "$CLAUDE_CONFIG" 2>/dev/null; then
      ok "claude.json is valid JSON"
    else
      warn "claude.json may have JSON errors — review manually: $CLAUDE_CONFIG"
    fi
  else
    if python3 -c "import json; json.load(open('$CLAUDE_CONFIG'))" 2>/dev/null; then
      ok "claude.json is valid JSON"
    else
      warn "claude.json may have JSON errors — review manually: $CLAUDE_CONFIG"
    fi
  fi
else
  info "[Step 15] Skipping Claude MCP injection (pass --integrate-claude to enable)"
fi

# ─────────────────────────────────────────────────────────────────────────────
# STEP 16 — Create systemd user service (unless --no-service)
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}[Step 16] Setting up systemd user service...${RESET}"

SERVICE_STATUS="skipped (--no-service)"

if $NO_SERVICE; then
  info "Skipping systemd setup (--no-service flag set)"
elif ! command -v systemctl &>/dev/null; then
  warn "systemctl not found — skipping systemd user service setup"
  SERVICE_STATUS="skipped (no systemctl)"
else
  SYSTEMD_USER_DIR="$HOME/.config/systemd/user"
  mkdir -p "$SYSTEMD_USER_DIR"

  if [[ -f "$SYSTEMD_USER_DIR/skill-router.service" ]]; then
    ok "Systemd service file already exists, skipping"
  else
    cat > "$SYSTEMD_USER_DIR/skill-router.service" <<UNIT
[Unit]
Description=Skill Router (Docker)
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/bin/docker start skill-router
ExecStop=/usr/bin/docker stop skill-router
Restart=no

[Install]
WantedBy=default.target
UNIT

    ok "Written: $SYSTEMD_USER_DIR/skill-router.service"

    systemctl --user daemon-reload
    ok "Reloaded systemd user daemon"

    systemctl --user enable skill-router
    ok "Enabled skill-router user service"
  fi

  SERVICE_STATUS="systemd user service enabled ✓"
fi

# ─────────────────────────────────────────────────────────────────────────────
# STEP 17 — Final summary
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${GREEN}║         Skill Router Installation Complete        ║${RESET}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════╝${RESET}"
echo ""
_model_display="${LLM_MODEL:-provider default}"
_embedding_model_display="${EMBEDDING_MODEL:-provider default}"
echo -e "  ${BOLD}Container:${RESET}    skill-router (running on port $PORT)"
echo -e "  ${BOLD}Image:${RESET}        skill-router:latest"
echo -e "  ${BOLD}Health:${RESET}       http://localhost:$PORT/health ${GREEN}✓${RESET}"
echo -e "  ${BOLD}LLM Provider:${RESET} $LLM_PROVIDER ($_model_display)"
echo -e "  ${BOLD}Embeddings:${RESET}   $EMBEDDING_PROVIDER ($_embedding_model_display)"
echo -e "  ${BOLD}Service:${RESET}      $SERVICE_STATUS"
if [[ "$GITHUB_ENABLED" == "true" ]]; then
  echo -e "  ${BOLD}GitHub Sync:${RESET}  enabled (https://github.com/paulpas/skills)"
  echo -e "  ${BOLD}Sync Interval:${RESET} every ${SYNC_INTERVAL}s (new skills auto-discovered without restart)"
else
  echo -e "  ${BOLD}GitHub Sync:${RESET}  disabled"
fi

if $INTEGRATE_OPENCODE; then
  echo -e "  ${BOLD}OpenCode:${RESET}     $OPENCODE_CONFIG ${GREEN}✓${RESET}"
  echo -e "  ${BOLD}Instructions:${RESET} $API_DOC_PATH ${GREEN}✓${RESET}"
fi

if $INTEGRATE_CLAUDE; then
  echo -e "  ${BOLD}Claude:${RESET}       $CLAUDE_CONFIG ${GREEN}✓${RESET}"
  echo -e "  ${BOLD}MCP Script:${RESET}   $HOME/.config/claude/skill-router-mcp.js ${GREEN}✓${RESET}"
  echo -e "  ${BOLD}MCP Section:${RESET}  mcpServers.skill-router ${GREEN}✓${RESET}"
fi

echo ""
echo -e "  ${BOLD}Useful commands:${RESET}"
echo -e "    docker logs skill-router --tail 50 -f"
echo -e "    docker restart skill-router"
echo -e "    curl http://localhost:$PORT/health"

if $INTEGRATE_CLAUDE; then
  echo -e "    cat $CLAUDE_CONFIG | jq '.mcpServers[\"skill-router\"]'"
fi

if ! $INTEGRATE_OPENCODE && ! $INTEGRATE_CLAUDE; then
  echo ""
  echo -e "  ${YELLOW}Tip:${RESET} Re-run with ${BOLD}--integrate-opencode${RESET} or ${BOLD}--integrate-claude${RESET} to add this service to your IDE config."
elif ! $INTEGRATE_OPENCODE; then
  echo ""
  echo -e "  ${YELLOW}Tip:${RESET} Re-run with ${BOLD}--integrate-opencode${RESET} to add this service to your OpenCode config."
elif ! $INTEGRATE_CLAUDE; then
  echo ""
  echo -e "  ${YELLOW}Tip:${RESET} Re-run with ${BOLD}--integrate-claude${RESET} to add this service to your Claude config."
fi

echo ""
