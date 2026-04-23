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
  --help                 Show this help message

${BOLD}Examples:${RESET}
  OPENAI_API_KEY=sk-... $0
  $0 --openai-key sk-... --port 3001 --no-service
  $0 --openai-key sk-... --integrate-opencode
  $0 --openai-key sk-... --integrate-opencode --config ~/.config/opencode/opencode.json
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

if [[ -z "$OPENAI_API_KEY" ]]; then
  err "OPENAI_API_KEY is required."
  err "Set it with:  --openai-key sk-...   OR   export OPENAI_API_KEY=sk-..."
  exit 1
fi
ok "OPENAI_API_KEY is set (${#OPENAI_API_KEY} chars)"

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
  skill-router:latest

ok "Container started: skill-router on port $PORT"

# ─────────────────────────────────────────────────────────────────────────────
# STEP 9 — Health check (poll with retry)
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}[Step 9] Waiting for health check...${RESET}"
info "Polling http://localhost:$PORT/health (up to 15 attempts)"

HEALTH_RESPONSE=""
HEALTHY=false

for attempt in $(seq 1 15); do
  printf "  ."
  sleep 2
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
  err "Health check failed after 15 attempts."
  err "Container logs:"
  docker logs skill-router --tail 20 >&2
  exit 1
fi

ok "Health check passed on attempt $attempt"
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

  # STEP 11 — Generate skill-router-api.md
  echo ""
  echo -e "${BOLD}[Step 11] Generating skill-router-api.md...${RESET}"

  API_DOC_PATH="$HOME/.config/opencode/skill-router-api.md"
  mkdir -p "$HOME/.config/opencode"

  cat > "$API_DOC_PATH" <<MARKDOWN
# Skill Router API

The Skill Router is running at \`http://localhost:${PORT}\` and provides intelligent task→skill matching.

## Endpoints

### Health Check
\`\`\`bash
curl http://localhost:${PORT}/health
\`\`\`
Response: \`{"status":"healthy","timestamp":"...","version":"1.0.0"}\`

### Stats
\`\`\`bash
curl http://localhost:${PORT}/stats
\`\`\`
Response: \`{"skills":{"totalSkills":N,"categories":[...],"tags":[...]},"mcpTools":{...}}\`

### Route a Task to Skills
\`\`\`bash
curl -X POST http://localhost:${PORT}/route \\
  -H "Content-Type: application/json" \\
  -d '{
    "task": "Deploy a Kubernetes manifest to production",
    "context": {"environment": "production"},
    "constraints": {"maxSkills": 3}
  }'
\`\`\`
Returns: selected skills, confidence scores, execution plan (sequential/parallel/hybrid).

### Execute a Task
\`\`\`bash
curl -X POST http://localhost:${PORT}/execute \\
  -H "Content-Type: application/json" \\
  -d '{
    "task": "Deploy a Kubernetes manifest to production",
    "inputs": {"manifest": "..."},
    "skills": ["cncf-kubernetes"]
  }'
\`\`\`

## Usage in OpenCode Sessions

When you need to route a task to the best skill, call the \`/route\` endpoint via shell tools.
The router uses OpenAI embeddings + LLM ranking to find the most relevant skills.

## Docker Management

\`\`\`bash
# Check container status
docker ps --filter name=skill-router

# View logs
docker logs skill-router --tail 50 -f

# Restart
docker restart skill-router

# Stop
docker stop skill-router
\`\`\`
MARKDOWN

  ok "Written: $API_DOC_PATH"

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
# STEP 14 — Create systemd user service (unless --no-service)
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}[Step 14] Setting up systemd user service...${RESET}"

SERVICE_STATUS="skipped (--no-service)"

if $NO_SERVICE; then
  info "Skipping systemd setup (--no-service flag set)"
elif ! command -v systemctl &>/dev/null; then
  warn "systemctl not found — skipping systemd user service setup"
  SERVICE_STATUS="skipped (no systemctl)"
else
  SYSTEMD_USER_DIR="$HOME/.config/systemd/user"
  mkdir -p "$SYSTEMD_USER_DIR"

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

  SERVICE_STATUS="systemd user service enabled ✓"
fi

# ─────────────────────────────────────────────────────────────────────────────
# STEP 15 — Final summary
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${GREEN}║         Skill Router Installation Complete        ║${RESET}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  ${BOLD}Container:${RESET}    skill-router (running on port $PORT)"
echo -e "  ${BOLD}Image:${RESET}        skill-router:latest"
echo -e "  ${BOLD}Health:${RESET}       http://localhost:$PORT/health ${GREEN}✓${RESET}"
echo -e "  ${BOLD}Service:${RESET}      $SERVICE_STATUS"

if $INTEGRATE_OPENCODE; then
  echo -e "  ${BOLD}Config:${RESET}       $OPENCODE_CONFIG ${GREEN}✓${RESET}"
  echo -e "  ${BOLD}Instructions:${RESET} $API_DOC_PATH ${GREEN}✓${RESET}"
fi

echo ""
echo -e "  ${BOLD}Useful commands:${RESET}"
echo -e "    docker logs skill-router --tail 50 -f"
echo -e "    docker restart skill-router"
echo -e "    curl http://localhost:$PORT/health"

if ! $INTEGRATE_OPENCODE; then
  echo ""
  echo -e "  ${YELLOW}Tip:${RESET} Re-run with ${BOLD}--integrate-opencode${RESET} to add this service to your OpenCode config."
fi

echo ""
