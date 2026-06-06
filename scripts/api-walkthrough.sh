#!/usr/bin/env bash
# ============================================================================
# Agent Skill Router - Comprehensive API Walkthrough
# ============================================================================
# A presenter-style walkthrough of ALL API features with detailed explanations.
# Think of this as a guided tour - each section tells the story of WHY an
# endpoint exists, HOW it works under the hood, and WHEN you'd use it in practice.
#
# Usage:
#   ./api-walkthrough.sh          Interactive mode (press Enter to continue)
#   ./api-walkthrough.sh --live   Run all scenarios automatically (no prompts)
# ============================================================================

set -euo pipefail

readonly API_URL="http://localhost:3000"
readonly TOTAL_SCENARIOS=12
LIVE_MODE=false
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Color Palette (ANSI escape codes)
readonly RESET='\033[0m'
readonly BOLD='\033[1m'
DIM='\033[2m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
WHITE='\033[1;37m'

# ─── Helper Functions ────────────────────────────────────────────────────────

banner() {
    local text="$1" width=72
    local pad_len=$(( (width - ${#text} - 4) / 2 ))
    local padding=""
    for ((i = 0; i < pad_len; i++)); do padding+=" "; done
    echo ""
    echo -e "${CYAN}[${BOLD}$(printf '=%.0s' $(seq 1 $width))${CYAN}]${RESET}"
    echo -e "${CYAN}|${WHITE}${padding}${text}${padding}${CYAN}|${RESET}"
    echo -e "${CYAN}[${DIM}$(printf '--%.0s' $(seq 1 $width))${CYAN}]${RESET}"
    echo ""
}

sub_banner() {
    local text="$1" width=72
    local pad_len=$(( (width - ${#text} - 4) / 2 ))
    local padding=""
    for ((i = 0; i < pad_len; i++)); do padding+=" "; done
    echo -e "${MAGENTA}[${BOLD}$(printf '--%.0s' $(seq 1 $width))${MAGENTA}]${RESET}"
    echo -e "${MAGENTA}|${WHITE}${padding}${text}${padding}${MAGENTA}|${RESET}"
    echo -e "${MAGENTA}[${DIM}$(printf '..%.0s' $(seq 1 $width))${MAGENTA}]${RESET}"
    echo ""
}

separator() {
    echo -e "${DIM}│$(printf '--%.0s' $(seq 1 72))│${RESET}"
}

progress_indicator() {
    local current="$1" total="${2:-$TOTAL_SCENARIOS}"
    local pct=$(( (current * 100) / total ))
    local filled=$(( pct / 5 ))
    local empty=$(( 20 - filled ))
    local bar=""
    for ((i = 0; i < filled; i++)); do bar+="="; done
    for ((i = 0; i < empty; i++)); do bar+="-"; done
    echo -e "  ${DIM}[$bar] ${pct}%${RESET}"
}

code_block() {
    local label="$1"; shift
    echo -e "${BLUE}  +--- ${label}${RESET}"
    for line in "$@"; do
        echo -e "  |  ${DIM}${line}${RESET}"
    done
    echo -e "  +${DIM}$(printf '--%.0s' $(seq 1 $(( ${#label} + 2 )) ))${RESET}"
    echo ""
}

error_block() {
    local label="$1"; shift
    echo -e "${RED}  +--- ERROR CASE: ${label}${RESET}"
    for line in "$@"; do
        echo -e "  |  ${DIM}${line}${RESET}"
    done
    echo -e "  +${DIM}$(printf '--%.0s' $(seq 1 72))${RESET}"
    echo ""
}

key_point() {
    echo -e "${GREEN}  + $*${RESET}"
}

note_msg() {
    echo -e "${YELLOW}  NOTE: $*${RESET}"
}

advance() {
    if [[ "$LIVE_MODE" == "true" ]]; then
        sleep 0.8
    else
        local prompt_text="${CYAN}  Press Enter to continue...${RESET}"
        read -rp "$prompt_text" || true
    fi
}

check_service() {
    echo -e "\n${BOLD}Checking if the Agent Skill Router is running...${RESET}"
    if timeout 3 bash -c "echo > /dev/tcp/localhost/3000" 2>/dev/null; then
        echo -e "${GREEN}  + Port 3000 is open -- router appears running.${RESET}"
        local health_response
        if health_response=$(curl -s --max-time 5 "${API_URL}/health" 2>/dev/null); then
            local status
            status=$(echo "$health_response" | grep -o '"status":"[^"]*"' | head -1)
            if [[ "$status" == *"healthy"* ]]; then
                echo -e "${GREEN}  + /health responded: ${status}${RESET}"
            else
                echo -e "${YELLOW}  + Service running but health check non-healthy${RESET}"
            fi
        else
            echo -e "${YELLOW}  + Port open but /health unreachable -- might be loading${RESET}"
        fi
        return 0
    fi
    if command -v docker &>/dev/null; then
        local container_status
        container_status=$(docker ps --filter name=skill-router --format '{{.Status}}' 2>/dev/null || true)
        if [[ -n "$container_status" ]]; then
            echo -e "${GREEN}  + Docker container found: ${container_status}${RESET}"
            return 0
        fi
    fi
    echo -e "${RED}  X The Agent Skill Router does not appear to be running.${RESET}"
    echo -e "  ${DIM}Expected at: ${API_URL}${RESET}"
    echo ""
    echo -e "  ${YELLOW}To start it:${RESET}"
    printf '    docker run -d --name skill-router -p 3000:3000 \\\n'
    printf '      ghcr.io/paulpas/agent-skill-router:latest\n'
    echo ""
    echo -e "  ${YELLOW}Or build locally:${RESET}"
    echo -e "    cd agent-skill-routing-system && npm run build && node dist/index.js"
    echo ""
    if [[ "$LIVE_MODE" == "true" ]]; then
        echo -e "${RED}  X In live mode, the service must be running.${RESET}"
        return 1
    else
        echo -e "${YELLOW}  Continuing -- this walkthrough uses HEREDOC examples${RESET}"
        echo -e "${YELLOW}  that show what responses look like (no API calls).${RESET}"
        echo ""
        read -rp "Press Enter to continue, or Ctrl+C to abort: " || true
    fi
    return 0
}

# ─── Section 0: Architecture & Introduction ──────────────────────────────────

section_00_intro() {
    banner "AGENT SKILL ROUTER -- API WALKTHROUGH"
    echo -e "${BOLD}Welcome!${RESET} This walkthrough takes you through every endpoint of the Agent Skill"
    echo -e "Router API -- the engine that powers intelligent skill selection for AI agents."
    echo ""
    echo -e "${DIM}Think of it as a restaurant kitchen:${RESET}"
    echo ""
    echo -e "  ${CYAN}Customer${RESET} (OpenCode)      -> Orders a dish (asks a question)"
    echo -e "  ${MAGENTA}Head Chef${RESET} (Router API)   -> Decides which specialist cooks what"
    echo -e "  ${GREEN}Sous Chefs${RESET} (Skills)      -> Each one masters a specific cuisine"
    echo -e "  ${BLUE}Waiter${RESET} (MCP Bridge)      -> Delivers results back to the customer"
    echo ""
    advance

    sub_banner "SYSTEM ARCHITECTURE"
    echo -e "${CYAN}+--------------------------------------+     +--------------------------+" \
           "${RESET}"
    echo -e "|  OpenCode AI  | HTTP |                | HTTP | Router API             |${RESET}"
    echo -e "|  (Agent)      |---->| MCP Bridge     |---->| Hybrid Scorer          |${RESET}"
    echo -e "|               |<----| Tool Dispatcher|<----| Vector + BM25           |${RESET}"
    echo -e "+---------------+ JSON +----------------+ JSON +------------------------+" \
           "${RESET}"
    echo ""

    echo -e "${BOLD}Core Components:${RESET}"
    echo ""
    key_point "${CYAN}Router API${RESET}       -- Fastify HTTP server with 12 endpoints for routing and management"
    key_point "${MAGENTA}Hybrid Scorer${RESET}     -- 5-signal pipeline: vector (50%), BM25 (20%), triggers (15%), archetype (10%), historical (5%)"
    key_point "${GREEN}Skills Index${RESET}      -- 593+ skills across 8 domains (agent, cncf, coding, go, linux, programming, trading, writing)"
    key_point "${BLUE}MCP Bridge${RESET}        -- Tool dispatcher that executes routed tasks via MCP-compatible tools"
    key_point "${WHITE}Vector DB + BM25${RESET}  -- Combined semantic search with exact-term matching for robust retrieval"
    echo ""

    sub_banner "THE 12 ENDPOINTS WE'LL COVER"
    local endpoints=(
        "GET     /health              -- Health check and readiness probe"
        "GET     /stats               -- System statistics dashboard"
        "GET     /skills              -- Browse the complete skill catalog"
        "GET     /skill/:name         -- Retrieve a specific SKILL.md document"
        "POST    /route  CORE         -- Route a task to best-matching skills"
        "POST    /execute             -- Actually execute routed tasks"
        "GET     /access-log          -- Audit trail of all routing decisions"
        "POST    /reload              -- Force reload from source of truth"
        "GET     /metrics             -- Compression and caching statistics"
        "POST    /skill/create        -- AI-driven auto-skill creation"
        "GET     /skills/created      -- List all auto-created skills"
        "GET/POST /config/link-following  -- Markdown link resolution config"
    )
    for ep in "${endpoints[@]}"; do
        echo -e "  ${DIM}|${RESET}  $ep"
    done
    separator
    advance
}

# ─── Section 1: Health Check ─────────────────────────────────────────────────

section_01_health_check() {
    banner "SECTION 1/${TOTAL_SCENARIOS}: Health Check -- GET /health"
    echo -e "${BOLD}WHY THIS MATTERS:${RESET}"
    echo ""
    echo -e "  In microservices architecture, the health check endpoint is your first line"
    echo -e "  of defense. Before you route a complex task or list skills, you need to know:"
    echo -e "${CYAN}\"Is the service even running?\"${RESET}"
    echo ""
    echo -e "  Think of it like checking if a restaurant is open before ordering dinner."
    echo -e "  Or verifying your car has fuel before starting a road trip."
    echo ""
    advance

    echo -e "${BOLD}THE ANATOMY:${RESET}"
    echo ""
    code_block "CURL COMMAND" "curl ${API_URL}/health"
    note_msg "No headers, no body payload -- just a plain GET request. Simple by design."
    echo ""

    advance
    echo -e "${BOLD}WHAT THE RESPONSE LOOKS LIKE:${RESET}"
    echo ""
    # Use printf to output the sample JSON since heredoc inside heredoc is tricky
    printf '  Sample response:\n'
    printf '  +----------------------------------------------------------------------+\n'
    printf '  | {\n'
    printf '  |   "status": "healthy",        -- Green light! Service operational\n'
    printf '  |   "ready": true,              -- Skills finished loading (false = booting)\n'
    printf '  |   "loading": false,           -- Background init still running?\n'
    printf '  |   "error": null,              -- Any init errors? (null = clean)\n'
    printf '  |   "timestamp": "2026-06-06T12:34:56.789Z",\n'
    printf '  |   "version": "1.0.0"         -- Router version\n'
    printf '  | }\n'
    printf '  +----------------------------------------------------------------------+\n'
    echo ""

    echo -e "${BOLD}FIELD DEEP DIVE:${RESET}"
    echo ""
    key_point "\"status\" -- Always 'healthy'. If process crashes, server disappears entirely"
    key_point "\"ready\" -- Crucial field! False means skills still loading. Routes return 503 when not ready"
    key_point "\"loading\" -- Complementary: true = booting, false = ready for queries"
    key_point "\"error\" -- If background init fails (GitHub unreachable), error message appears here"
    key_point "\"timestamp\" -- ISO-8601 timestamp. Useful for monitoring and debugging timing"
    echo ""

    advance
    error_block "Container not running" \
        "$ curl http://localhost:3000/health" \
        "" \
        "  curl: (7) Failed to connect to localhost port 3000: Connection refused" \
        "" \
        "  This means the Docker container is down or the process crashed."
    echo ""

    advance
    sub_banner "REAL-WORLD USE CASES"
    echo -e "  ${CYAN}Kubernetes Liveness Probe:${RESET}   K8s calls this every 30s. Fails 3x = restart container."
    echo -e "  ${MAGENTA}CI/CD Pipeline Check:${RESET}       Before deploying new code, verify old service is healthy."
    echo -e "  ${GREEN}Load Balancer Health:{RESET}       HAProxy/Nginx use this to route traffic here."
    echo -e "  ${BLUE}Monitoring Alerting:${RESET}        Prometheus scrapes /health and alerts if unhealthy."
    echo ""
    key_point "The endpoint must be FAST (under 10ms) since K8s calls it every 30 seconds"
    key_point "It always returns HTTP 200 -- the response body carries all state info"
    separator
}

# ─── Section 2: System Stats ─────────────────────────────────────────────────

section_02_system_stats() {
    banner "SECTION 2/${TOTAL_SCENARIOS}: System Stats -- GET /stats"
    echo -e "${BOLD}WHY THIS MATTERS:${RESET}"
    echo ""
    echo -e "  After the health check tells you the service is up, the next question:"
    echo -e "${CYAN}\"How many skills are loaded? Is everything working normally?\"${RESET}"
    echo -e "  The /stats endpoint gives you a bird's-eye view of the entire system."
    echo ""
    advance

    code_block "CURL COMMAND" "curl ${API_URL}/stats"
    advance

    echo -e "${BOLD}WHAT THE RESPONSE LOOKS LIKE (service running):${RESET}"
    echo ""
    printf '  +----------------------------------------------------------------------+\n'
    printf '  | {\n'
    printf '  |   "skills": {\n'
    printf '  |     "totalSkills": 593,          -- Total skills loaded\n'
    printf '  |     "categories": 8,            -- Number of domain categories\n'
    printf '  |     "tags": 2847                -- Unique trigger tags across all skills\n'
    printf '  |   },\n'
    printf '  |   "mcpTools": {\n'
    printf '  |     "totalTools": 6,\n'
    printf '  |     "enabledTools": [\n'
    printf '  |       "file",            -- File read/write operations\n'
    printf '  |       "shell-command",   -- Execute shell commands\n'
    printf '  |       "http",            -- Make HTTP requests\n'
    printf '  |       "log-fetch",       -- Fetch log files from containers\n'
    printf '  |       "kubectl",         -- Kubernetes cluster management\n'
    printf '  |       "skill-generation" -- Generate new skills via LLM\n'
    printf '  |     ]\n'
    printf '  |   }\n'
    printf '  | }\n'
    printf '  +----------------------------------------------------------------------+\n'

    echo -e "${BOLD}WHAT THE RESPONSE LOOKS LIKE (still loading):${RESET}"
    echo ""
    printf '  {\n'
    printf '    "status": "loading",          -- Not ready yet\n'
    printf '    "message": "Skills are still loading, please wait",\n'
    printf '    "skills": { "totalSkills": 0, "categories": 0, "tags": 0 },\n'
    printf '    "mcpTools": { "totalTools": 0, "enabledTools": [] }\n'
    printf '  }\n'
    echo ""

    advance
    sub_banner "WHAT YOU'RE LOOKING FOR"
    echo ""
    key_point "\"totalSkills\" should be > 500 for production. If it's 0, skills have not loaded."
    key_point "\"categories\" == 8 means all domain directories were scanned"
    key_point "\"tags\" tells you the breadth of the index -- more tags = richer matching vocabulary"
    echo ""

    sub_banner "REAL-WORLD USE CASES"
    echo -e "  ${CYAN}Post-Deploy Verification:${RESET}  After a new release, verify totalSkills has not dropped."
    echo -e "  ${MAGENTA}Capacity Planning:{RESET}        If tags count is low, you may need more domain triggers."
    echo -e "  ${GREEN}Health Dashboard:{RESET}          Display these numbers in Grafana for ops team visibility."
    echo ""
    separator
}

# ─── Section 3: Skill Listing ────────────────────────────────────────────────

section_03_skill_listing() {
    banner "SECTION 3/${TOTAL_SCENARIOS}: Skill Listing -- GET /skills"
    echo -e "${BOLD}WHY THIS MATTERS:${RESET}"
    echo ""
    echo -e "  You've just started using the Agent Skill Router. You want to know:"
    echo -e "${CYAN}\"What skills are available? How many are there? Can I browse by domain?\"${RESET}"
    echo -e "  The /skills endpoint is your catalog browser -- like searching a library."
    echo ""
    advance

    code_block "CURL COMMAND" "curl ${API_URL}/skills"
    note_msg "Returns ALL skills at once -- useful for building a UI or batch processing."
    echo ""

    advance
    echo -e "${BOLD}HOW TO COUNT SKILLS:${RESET}"
    echo ""
    code_block "COUNT ALL SKILLS" \
        "curl ${API_URL}/skills | python3 -c \"import sys,json; d=json.load(sys.stdin); print(f'Total: {d[chr(39)+chr(39)]}')\""

    advance
    echo -e "${BOLD}WHAT EACH SKILL OBJECT CONTAINS:${RESET}"
    echo ""
    printf '  Each skill entry in the response array:\n'
    printf '  +----------------------------------------------------------------------+\n'
    printf '  | {\n'
    printf '  |   "name": "prometheus-querying",       -- Skill identifier (kebab-case)\n'
    printf '  |   "category": "coding",                -- Domain category\n'
    printf '  |   "description": "Implements querying with PromQL...",\n'
    printf '  |                                          -- One-sentence what this skill does\n'
    printf '  |   "tags": ["prometheus", "promql", ...],-- Trigger keywords (3-8 terms)\n'
    printf '  |   "version": "1.0.0",                  -- Skill version\n'
    printf '  |   "sourceFile": "/cache/skills/coding/prometheus-querying/SKILL.md"\n'
    printf '  |                                          -- Full filesystem path\n'
    printf '  | }\n'
    printf '  +----------------------------------------------------------------------+\n'

    advance
    sub_banner "WHAT YOU'RE LOOKING FOR"
    echo ""
    key_point "\"total\" field tells you how many skills are loaded -- should match /stats.totalSkills"
    key_point "Each skill has exactly 6 fields: name, category, description, tags, version, sourceFile"
    key_point "Tags array contains the trigger keywords used for auto-loading matching conversations"
    echo ""

    sub_banner "REAL-WORLD USE CASES"
    echo -e "  ${CYAN}Skill Inventory Audit:${RESET}         Periodically scan /skills to verify no skills lost."
    echo -e "  ${MAGENTA}Domain Distribution:{RESET}          Check if certain domains are underrepresented."
    echo -e "  ${GREEN}Debugging Missing Skills:{RESET}     Search tags array for a keyword to find relevant skills."
    echo ""
    separator
}

# ─── Section 4: Skill Retrieval ──────────────────────────────────────────────

section_04_skill_retrieval() {
    banner "SECTION 4/${TOTAL_SCENARIOS}: Skill Retrieval -- GET /skill/:name"
    echo -e "${BOLD}WHY THIS MATTERS:${RESET}"
    echo ""
    echo -e "  You've browsed the catalog and found a skill you want. Now you need:"
    echo -e "${CYAN}\"Show me the actual content -- instructions, examples, constraints.${RESET}\""
    echo -e "  Think of /skills as the library card catalog (metadata only), and"
    echo -e "  /skill/:name as walking to the shelf and opening that specific book."
    echo ""
    advance

    code_block "CURL COMMAND (basic)" "curl ${API_URL}/skill/prometheus-querying"
    note_msg "Returns full SKILL.md as plain text -- Content-Type: text/plain; charset=utf-8"
    echo ""

    code_block "WITH COMPRESSION (production optimization)" \
        "# Get compressed version (~35% savings):" \
        "curl '${API_URL}/skill/prometheus-querying?compression=moderate'" \
        "" \
        "# Get detailed full content (no compression):" \
        "curl '${API_URL}/skill/prometheus-querying?compression=detailed'" \
        "" \
        "# Specify domain for better context:" \
        "curl '${API_URL}/skill/m365-agents-ts?domain=agent&compression=moderate'"

    advance
    echo -e "${BOLD}WHAT THE RESPONSE LOOKS LIKE:${RESET}"
    echo ""
    printf '  Content-Type: text/plain; charset=utf-8\n'
    printf '  X-Compression-Version: moderate\n'
    printf '  X-Compression-Tokens: 2847\n'
    printf '  X-Compression-Percent: 35\n'
    printf '  X-Compression-Source: compressed\n'
    printf '  # Prometheus Querying\n\n'
    printf '  Implements querying techniques with PromQL to extract metrics...\n\n'
    printf '  ## When to Use\n'
    printf '  - Writing PromQL queries to monitor system health\n'
    printf '  - Designing alert rules based on metric thresholds\n\n'
    printf '  ## Core Workflow\n'
    printf '  1. **Identify the metric** -- Find exact name using /api/v1/label/__name__/values\n'
    echo ""

    advance
    echo -e "${BOLD}EXTRACTING FRONTMATTER:${RESET}"
    echo ""
    code_block "PARSING YAML FRONTMATTER" \
        "# Extract name and description from any skill's frontmatter:" \
        "curl ${API_URL}/skill/m365-agents-ts | head -15 | grep -E '^(name|description):'"

    advance
    sub_banner "WHAT YOU'RE LOOKING FOR"
    echo ""
    key_point "Full SKILL.md content -- the complete markdown document including frontmatter and examples"
    key_point "Response headers include compression metadata: X-Compression-Version, X-Compression-Percent"
    key_point "404 error when skill name does not exist: {\"error\": \"Skill not found: non-existent-skill\"}"
    echo ""

    sub_banner "REAL-WORLD USE CASES"
    echo -e "  ${CYAN}Debugging Skill Content:${RESET}        Fetch a skill to verify its examples and constraints."
    echo -e "  ${MAGENTA}Content Auditing:{RESET}              Check that all implementation skills have code examples."
    echo -e "  ${GREEN}Compression Testing:{RESET}           Test different compression levels to find the sweet spot."
    echo ""
    separator
}

# ─── Section 5: Task Routing (THE CORE FEATURE) ──────────────────────────────

section_05_task_routing() {
    banner "SECTION 5/${TOTAL_SCENARIOS}: Task Routing -- POST /route  **CORE**"
    echo -e "${BOLD}WHY THIS MATTERS (the MOST important section):${RESET}"
    echo ""
    echo -e "  This is the engine room. Everything else supports it."
    echo -e "  When an OpenCode user types 'Fix my pod crash', the system needs to find"
    echo -e "  the right skill(s) from 593+ options. That is what /route does -- using a"
    echo -e "${CYAN}hybrid scoring pipeline${RESET}."
    echo ""
    advance

    sub_banner "THE HYBRID SCORING PIPELINE -- Like a Restaurant Kitchen"
    echo ""
    printf '  1. Vector Similarity (50%%)     -- Semantic meaning (does recipe match fish?)\n'
    printf '  2. BM25 Exact Terms (20%%)      -- Keyword matching (menu says salmon?)\n'
    printf '  3. Trigger Match (15%%)         -- Pre-defined keywords (kubernetes in triggers?)\n'
    printf '  4. Archetype Alignment (10%%)   -- Intent type (diagnostic, tactical, etc.)\n'
    printf '  5. Historical Success (5%%)     -- Past performance (was this helpful before?)\n'
    echo ""

    advance
    sub_banner "QUERY ARCHETYPES -- Understanding USER INTENT"
    echo ""
    printf '  Archetype        | When to Use              | Example Query\n'
    printf '  ---------------------------------------------------------------\n'
    printf '  tactical         | Specific implementation  | "fix this ingress timeout"\n'
    printf '  strategic        | Design, architecture     | "design a scalable event bus"\n'
    printf '  diagnostic       | Root cause analysis      | "why is my pod crashing"\n'
    printf '  orchestration    | Multi-step workflows     | "automate CI/CD pipeline"\n'
    printf '  educational      | Learning, explanation    | "teach me kubernetes networking"\n'
    printf '  enforcement      | Compliance, security     | "security audit required"\n'
    printf '  generation       | Code scaffolding         | "generate boilerplate"\n\n'
    echo -e "  Matching skills get a +30%% score boost (full match) or +10%% (partial)."
    echo ""

    advance
    echo -e "${BOLD}EXAMPLE 1: SIMPLE TASK:${RESET}"
    echo ""
    code_block "CURL REQUEST" \
        "curl -X POST ${API_URL}/route \"-H Content-Type: application/json\" \\" \
        "  \"-d '{\"task\": \"Fix my Kubernetes pod crash\"}'\""

    advance
    echo -e "${BOLD}SIMPLE RESPONSE:${RESET}"
    echo ""
    printf '  {\n'
    printf '    "taskId": "route_1718000000000",\n'
    printf '    "selectedSkills": [\n'
    printf '      {\n'
    printf '        "name": "kubernetes-events-management",\n'
    printf '        "score": 0.89,                       -- High score = strong match\n'
    printf '        "role": "primary",                   -- THE skill to use\n'
    printf '        "reasoning": "Directly addresses pod crash diagnostics...",\n'
    printf '        "scoreBreakdown": {\n'
    printf '          "finalScore": 0.89,\n'
    printf '          "vectorScore": 0.92,               -- Semantic match very strong\n'
    printf '          "bm25Score": 0.78,                 -- Keywords kubernetes, pod matched\n'
    printf '          "triggerMatchScore": 0.85,         -- Triggers: pod, events aligned\n'
    printf '          "archetypeScore": 0.91,           -- Archetype diagnostic matched\n'
    printf '          "specificityScore": 0.88\n'
    printf '        }\n'
    printf '      },\n'
    printf '      {\n'
    printf '        "name": "kubernetes-deployments-management",\n'
    printf '        "score": 0.67,                       -- Secondary/supplementary skill\n'
    printf '        "role": "supporting"\n'
    printf '      }\n'
    printf '    ],\n'
    printf '    "executionPlan": {\n'
    printf '      "strategy": "sequential",            -- Run skills one after another\n'
    printf '      "steps": [\n'
    printf '        {"skill": "kubernetes-events-management", "dependencies": []},\n'
    printf '        {"skill": "kubernetes-deployments-management", "dependencies": [0]}\n'
    printf '      ]\n'
    printf '    },\n'
    printf '    "confidence": 0.94,                    -- How sure is the router?\n'
    printf '    "reasoningSummary": "Pod crash diagnostics point to kubernetes-events-...",\n'
    printf '    "candidatePool": ["kubernetes-events-mgmt", "k8s-deployments-mgmt", ...],\n'
    printf '    "latencyMs": 142,                      -- Total routing time: 142ms\n'
    printf '    "inputTokens": 3200,\n'
    printf '    "outputTokens": 180\n'
    printf '  }\n'

    advance
    echo -e "${BOLD}EXAMPLE 2: MEDIUM TASK -- Domain Context:${RESET}"
    echo ""
    code_block "CURL REQUEST" \
        "curl -X POST ${API_URL}/route \"-H Content-Type: application/json\" \\" \
        "  \"-d '{\"task\": \"Implement a stop loss strategy for crypto trading\"}'\""

    advance
    echo -e "${BOLD}MEDIUM RESPONSE (key differences):${RESET}"
    echo ""
    printf '  Top result: {\n'
    printf '    "name": "trading-risk-stop-loss",\n'
    printf '    "score": 0.93,\n'
    printf '    "role": "primary",\n'
    printf '    "archetype": "tactical"          -- Identified as tactical implementation\n'
    printf '  }\n\n'
    printf '  Supporting skills:\n'
    printf '    - trading-risk-kill-switches     -- Emergency layer on top of stops\n'
    printf '    - trading-risk-position-sizing   -- How much to trade before setting stops\n\n'
    printf '  executionPlan.strategy = "hybrid"  -- Mix of parallel and sequential steps\n'
    echo ""

    advance
    echo -e "${BOLD}EXAMPLE 3: COMPLEX TASK -- Full Context & Constraints:${RESET}"
    echo ""
    code_block "CURL REQUEST (production-quality)" \
        "curl -X POST ${API_URL}/route \"-H Content-Type: application/json\" \\" \
        "  \"-d '{\"task\": \"Set up monitoring for a microservices app\",\"" \
        "\"context\": {\"environment\": \"production\", \"tech_stack\": [\"kubernetes\"]}," \
        "\"constraints\": {\"maxSkills\": 3, \"includeScoreBreakdown\": true}}'\""

    note_msg "The 'context' field adds extra signal. The 'constraints' field limits results and requests score explanations."
    echo ""

    advance
    sub_banner "KEY THINGS TO NOTICE IN THE RESPONSE"
    echo ""
    key_point "\"confidence\" -- 0 to 1 scale. Below 0.35 means 'gap detected' which triggers auto-skill creation (Section 10)"
    key_point "\"scoreBreakdown\" -- Only present when constraints.includeScoreBreakdown=true. Shows WHY each score was given"
    key_point "\"executionPlan.strategy\" -- 'sequential', 'parallel', or 'hybrid'"
    key_point "\"latencyMs\" -- The entire routing pipeline runs in ~100-300ms"
    echo ""

    sub_banner "REAL-WORLD USE CASES"
    echo -e "  ${CYAN}Auto-routing:${RESET}              OpenCode calls this silently for every user message."
    echo -e "  ${MAGENTA}Skill Gap Detection:${RESET}       Low confidence (< 0.35) triggers /skill/create to auto-generate skills."
    echo -e "  ${GREEN}Multi-skill Workflows:${RESET}     Complex tasks route to 2-4 skills that work together in sequence."
    echo ""
    separator
}

# ─── Section 6: Task Execution ────────────────────────────────────────────────

section_06_task_execution() {
    banner "SECTION 6/${TOTAL_SCENARIOS}: Task Execution -- POST /execute"
    echo -e "${BOLD}WHY THIS MATTERS:${RESET}"
    echo ""
    echo -e "  The routing endpoint (/route) tells you WHAT skills to use. But what about"
    echo -e "${CYAN}\"Actually doing the work?\"${RESET}"
    echo -e "  POST /execute runs skills through MCP tools: reading files, running kubectl,"
    echo -e "  making HTTP requests."
    echo ""
    advance

    echo -e "${BOLD}ROUTE vs EXECUTE: THE KEY DIFFERENCE:${RESET}"
    echo ""
    printf '  POST /route          -> Planning phase. Returns skill recommendations.\n'
    printf '                         "Which chef should cook this dish?"\n\n'
    printf '  POST /execute        -> Action phase. Actually runs the skills via MCP tools.\n'
    printf '                         "Now actually cook it and bring me the result."\n\n'
    echo -e "  Think of routing as a GPS giving directions, and executing as driving there."
    echo ""

    advance
    code_block "CURL REQUEST" \
        "curl -X POST ${API_URL}/execute \"-H Content-Type: application/json\" \\" \
        "  \"-d '{\"task\": \"Deploy Kubernetes manifest\", \"skills\": [\"kubernetes-deployments-management\"]}'\""

    advance
    echo -e "${BOLD}WHAT THE RESPONSE LOOKS LIKE:${RESET}"
    echo ""
    printf '  {\n'
    printf '    "taskId": "deploy-001",               -- Your tracking ID or auto-generated\n'
    printf '    "task": "Deploy Kubernetes manifest",\n'
    printf '    "status": "success",                  -- success | partial_failure | failure\n'
    printf '    "results": [\n'
    printf '      {\n'
    printf '        "skillName": "kubernetes-deployments-management",\n'
    printf '        "status": "success",\n'
    printf '        "output": {\n'
    printf '          "command": "kubectl apply -f deployment.yaml",\n'
    printf '          "result": "deployment.apps/myapp created"\n'
    printf '        },\n'
    printf '        "error": null,\n'
    printf '        "latencyMs": 2340                 -- How long this skill took to run\n'
    printf '      }\n'
    printf '    ],\n'
    printf '    "totalLatencyMs": 2456,               -- Total time across all skills\n'
    printf '    "confidence": 0.92                      -- Confidence in the results\n'
    printf '  }\n'

    advance
    sub_banner "WHAT HAPPENS UNDER THE HOOD"
    echo ""
    code_block "EXECUTION FLOW" \
        "1. /execute receives: task, skill names, input parameters" \
        "2. MCP Bridge looks up each skill by name in its tool registry" \
        "3. For each found skill: calls getTool(skillName).execute(inputs)" \
        "4. MCP tools can: read files, run shell commands, execute kubectl, etc." \
        "5. Results returned as array with success/failure per skill" \
        "6. Overall status = 'success' if ALL succeeded, 'partial_failure' otherwise"
    echo ""

    sub_banner "WHAT YOU'RE LOOKING FOR"
    echo ""
    key_point "\"status\" -- 'success' means everything worked. 'partial_failure' means some skills failed."
    key_point "\"results[]\" array -- each skill gets its own result object with output and latencyMs"
    key_point "\"totalLatencyMs\" -- Useful for performance monitoring and SLA compliance checking"
    echo ""

    sub_banner "REAL-WORLD USE CASES"
    echo -e "  ${CYAN}End-to-End Task Execution:${RESET}       Route -> Execute in one automated workflow."
    echo -e "  ${MAGENTA}Multi-Skill Orchestration:${RESET}      Pass multiple skills to execute in parallel or sequence."
    echo -e "  ${GREEN}Error Recovery:{RESET}                 Check status for 'partial_failure' and retry failed skills."
    echo ""
    separator
}

# ─── Section 7: Access Log ────────────────────────────────────────────────────

section_07_access_log() {
    banner "SECTION 7/${TOTAL_SCENARIOS}: Access Log -- GET /access-log"
    echo -e "${BOLD}WHY THIS MATTERS:${RESET}"
    echo ""
    echo -e "  Imagine being able to look back and ask: ${CYAN}\"What was I just asked to do?\"${RESET}"
    echo -e "  Or ${MAGENTA}\"Which skills got routed the most today?\"${RESET}"
    echo -e "  The /access-log endpoint is your audit trail -- a rolling window of the"
    echo -e "  last 100 routing decisions. It is like a security camera for your AI agent."
    echo ""
    advance

    code_block "CURL COMMAND" "curl ${API_URL}/access-log"
    note_msg "The log keeps only the last 100 entries (FIFO queue). Older entries are discarded."
    echo ""

    advance
    echo -e "${BOLD}WHAT THE RESPONSE LOOKS LIKE:${RESET}"
    echo ""
    printf '  {\n'
    printf '    "totalRequests": 47,                -- Total routing requests this session\n'
    printf '    "entries": [\n'
    printf '      {\n'
    printf '        "timestamp": "2026-06-06T15:30:22.100Z",\n'
    printf '        "task": "Debug my PostgreSQL connection pool exhaustion issue...",\n'
    printf '        "topSkill": "cncf-postgresql",\n'
    printf '        "totalMatches": 3,\n'
    printf '        "confidence": 0.91,\n'
    printf '        "latencyMs": 156\n'
    printf '      },\n'
    printf '      {\n'
    printf '        "timestamp": "2026-06-06T15:28:14.500Z",\n'
    printf '        "task": "How do I set up a Kubernetes ingress with TLS?",\n'
    printf '        "topSkill": "kubernetes-ingress-management",\n'
    printf '        "totalMatches": 5,\n'
    printf '        "confidence": 0.97,\n'
    printf '        "latencyMs": 132\n'
    printf '      }\n'
    printf '    ]\n'
    printf '  }\n'

    advance
    sub_banner "WHAT YOU'RE LOOKING FOR"
    echo ""
    key_point "\"totalRequests\" -- Cumulative count of all /route calls this session (resets on restart)"
    key_point "\"entries[]\" sorted newest-first, so the first entry is always your most recent task"
    key_point "Low confidence scores (< 0.35) indicate potential skill gaps worth investigating"
    key_point "\"latencyMs\" -- Spot slow routing decisions that might need optimization (e.g., >500ms)"
    echo ""

    sub_banner "REAL-WORLD USE CASES"
    echo -e "  ${CYAN}Debugging Routing Quality:${RESET}     Review recent entries to see if the right skills were selected."
    echo -e "  ${MAGENTA}Analytics Dashboard:{RESET}          Count tasks per topSkill to see which skills are most popular."
    echo -e "  ${GREEN}Performance Monitoring:{RESET}        Alert when latencyMs exceeds SLA thresholds."
    echo ""
    separator
}

# ─── Section 8: Force Reload ──────────────────────────────────────────────────

section_08_force_reload() {
    banner "SECTION 8/${TOTAL_SCENARIOS}: Force Reload -- POST /reload"
    echo -e "${BOLD}WHY THIS MATTERS:${RESET}"
    echo ""
    echo -e "  You've just pushed 50 new skills to the repository. Or maybe you fixed a bug."
    echo -e "  How do you get the router to pick up these changes?${CYAN}Answer: POST /reload${RESET}"
    echo ""
    echo -e "  Think of this like hitting Ctrl+R on your browser after a website update."
    echo -e "  The system discards the old index and rebuilds from scratch."
    echo ""
    advance

    code_block "CURL COMMAND" "curl -X POST ${API_URL}/reload"
    note_msg "Simple POST with no request body -- just sends the signal to reload."
    echo ""

    advance
    sub_banner "WHAT HAPPENS DURING RELOAD (the internal dance):"
    echo ""
    code_block "RELOAD SEQUENCE" \
        "1. Server receives POST /reload" \
        "2. Fetches updated skills-index.json from GitHub remote URL" \
        "3. Downloads new/changed SKILL.md files from the skills repository" \
        "4. Rebuilds the vector database (re-embeds all skill descriptions)" \
        "5. Rebuilds the BM25 index (re-indexes all trigger keywords)" \
        "6. Re-initializes MCP tools for each loaded skill" \
        "7. Returns with updated statistics"
    echo ""

    advance
    echo -e "${BOLD}WHAT THE RESPONSE LOOKS LIKE:${RESET}"
    echo ""
    printf '  {\n'
    printf '    "status": "reloaded",              -- Operation completed successfully\n'
    printf '    "skills": {\n'
    printf '      "totalSkills": 643,           -- New count after reload (was 593 before)\n'
    printf '      "categories": 8,            -- Domain categories remain the same\n'
    printf '      "tags": 3012                -- Tags increased (new skills = new triggers)\n'
    printf '    }\n'
    printf '  }\n'

    advance
    sub_banner "WHEN TO USE /reload vs AUTOMATIC SYNC"
    echo ""
    code_block "AUTOMATIC VS MANUAL" \
        "Auto-sync: The router fetches the skills index every SKILL_SYNC_INTERVAL seconds" \
        "  (default: 3600 = 1 hour). New skills are discovered automatically." \
        "" \
        "Manual /reload: Use this when you need changes IMMEDIATELY -- after:" \
        "  - Pushing a batch of new skills to the repository" \
        "  - Fixing bugs in existing SKILL.md files" \
        "  - Updating trigger keywords for better matching" \
        "  - Testing that your changes actually get picked up"
    echo ""

    sub_banner "WHAT YOU'RE LOOKING FOR"
    echo ""
    key_point "\"status\": \"reloaded\" means the full pipeline completed successfully"
    key_point "Compare totalSkills before and after to verify new skills were added"
    key_point "If you see an error, check Docker logs: docker logs skill-router --tail 50"
    echo ""

    sub_banner "REAL-WORLD USE CASES"
    echo -e "  ${CYAN}Post-Push Verification:${RESET}       Push skills -> /reload -> verify totalSkills increased."
    echo -e "  ${MAGENTA}Troubleshooting:{RESET}             Skills not auto-loading? /reload to refresh the index."
    echo -e "  ${GREEN}Testing Workflow:{RESET}            Create a skill, push it, then /reload and route."
    echo ""
    separator
}

# ─── Section 9: Compression Metrics ──────────────────────────────────────────

section_09_compression_metrics() {
    banner "SECTION 9/${TOTAL_SCENARIOS}: Compression Metrics -- GET /metrics"
    echo -e "${BOLD}WHY THIS MATTERS:${RESET}"
    echo ""
    echo -e "  Each skill is a Markdown document, often thousands of characters long."
    echo -e "  When an LLM has a finite context window (say, 128K tokens), you cannot"
    echo -e "  load every skill verbatim. That is where ${CYAN}compression${RESET} comes in."
    echo ""
    echo -e "  The /metrics endpoint tells you how well the compression system works:"
    echo -e "  How many tokens are we saving? Is the cache doing its job? Are skills"
    echo -e "  getting evicted too quickly?"
    echo ""
    advance

    code_block "CURL COMMAND" "curl ${API_URL}/metrics"

    advance
    echo -e "${BOLD}WHAT THE RESPONSE LOOKS LIKE:${RESET}"
    echo ""
    printf '  {\n'
    printf '    "timestamp": "2026-06-06T15:45:00.000Z",\n'
    printf '    "compression": {\n'
    printf '      "totalOperations": 1847,         -- Total compression operations performed\n'
    printf '      "successfulCompressions": 1823,   -- How many succeeded\n'
    printf '      "failedCompressions": 24,         -- How many failed (errors, too large)\n'
    printf '      "cacheHits": 892,               -- Cached responses returned without recomputing\n'
    printf '      "cacheMisses": 955,             -- Fresh compression needed\n'
    printf '      "evictions": 156,               -- Cache entries removed (LRU eviction)\n'
    printf '      "totalTokensSaved": 2847000,    -- Total tokens saved across all queries\n'
    printf '      "averageCompressionPercent": 34.7, -- Average savings percentage\n'
    printf '      "maxCacheSizeBytes": 1073741824,  -- Maximum cache size (1GB default)\n'
    printf '      "currentCacheSizeBytes": 756492800   -- How much cache is currently used\n'
    printf '    },\n'
    printf '    "recentEvents": [\n'
    printf '      {\n'
    printf '        "timestamp": "2026-06-06T15:44:58.234Z",\n'
    printf '        "event": "cache_hit",          -- compression | cache_hit | cache_miss | ...\n'
    printf '        "skillName": "kubernetes-deployments-management",\n'
    printf '        "tokensBefore": 4200,\n'
    printf '        "tokensAfter": 2940,\n'
    printf '        "compressPercent": 30.0,\n'
    printf '        "cacheHit": true\n'
    printf '      }\n'
    printf '    ]\n'
    printf '  }\n'

    advance
    sub_banner "KEY METRICS TO WATCH"
    echo ""
    key_point "cacheHits / (cacheHits + cacheMisses) = Cache Hit Ratio. Above 80% is good for production."
    key_point "totalTokensSaved -- The most important number. Shows how much context window you saved."
    key_point "evictions -- High evictions with low cache usage suggests the TTL is too short."
    key_point "averageCompressionPercent -- Level 3 (~12%%) to Level 5 (~35%%) are safe production values."
    echo ""

    sub_banner "COMPRESSION LEVELS REFERENCE"
    echo ""
    code_block "LEVEL -> SAVINGS -> WHAT IT REMOVES" \
        "0   -> 0%%       No compression (original, full content)" \
        "1   -> ~5%%      Remove blank lines" \
        "2   -> ~12%%     Remove 'When to Use' section" \
        "3   -> ~18%%     Remove 'When NOT to Use' section" \
        "4   -> ~28%%     Collapse 'Core Workflow' to paragraph" \
        "5   -> ~35%%     Remove related-skills table" \
        "6   -> ~42%%     Remove markdown formatting" \
        "7   -> ~55%%     Remove code examples" \
        "8   -> ~68%%     Abbreviate section names" \
        "9   -> ~75%%     Combine all sections into summary" \
        "10+ -> ~85%%     Summary only (first 200 chars)"
    echo ""

    sub_banner "REAL-WORLD USE CASES"
    echo -e "  ${CYAN}Cost Optimization:${RESET}            Fewer tokens = lower LLM API costs."
    echo -e "  ${MAGENTA}Capacity Planning:{RESET}           Monitor currentCacheSizeBytes vs maxCacheSizeBytes."
    echo -e "  ${GREEN}Quality Assurance:{RESET}             Check averageCompressionPercent -- if too high, you may be" \
    "                                                    losing critical instructions. Level 3-5 is the sweet spot."
    echo ""
    separator
}

# ─── Section 10: Auto-Created Skills ──────────────────────────────────────────

section_10_auto_created_skills() {
    banner "SECTION 10/${TOTAL_SCENARIOS}: Auto-Created Skills (POST /skill/create)"
    echo -e "${BOLD}WHY THIS MATTERS:${RESET}"
    echo ""
    echo -e "  Here is a problem: What if a user asks about something you have NO skill for?"
    echo -e "${CYAN}\"How do I set up ArgoCD sync waves?\"${RESET} -- maybe you do not have that skill."
    echo -e ""
    echo -e "  The answer: The system ${MAGENTA}auto-creates skills on the fly${RESET}. When /route returns"
    echo -e "  low confidence (below threshold), it triggers AI-driven skill generation."
    echo ""
    advance

    sub_banner "POST /skill/create -- Generating a New Skill"
    echo ""
    code_block "CURL REQUEST (create from task)" \
        "curl -X POST ${API_URL}/skill/create \"-H Content-Type: application/json\" \\" \
        "  \"-d '{\"task\": \"Set up ArgoCD sync waves for deployment ordering\",\"" \
        "\"domain\": \"cncf\", \"topic\": \"argocd-sync-waves\", \"dryRun\": false}'\""

    advance
    echo -e "${BOLD}WHAT THE RESPONSE LOOKS LIKE:${RESET}"
    echo ""
    printf '  {\n'
    printf '    "status": "created",                -- created | dry_run | no_gap\n'
    printf '    "skillName": "cncf-argocd-sync-waves",\n'
    printf '    "skillPath": "/cache/skills/cncf/argocd-sync-waves/SKILL.md",\n'
    printf '    "domain": "cncf",                   -- Auto-detected domain\n'
    printf '    "topic": "argocd-sync-waves",       -- Generated topic (kebab-case)\n'
    printf '    "description": "Implements ArgoCD sync wave patterns for ordered deployment...",\n'
    printf '    "triggers": "argocd, sync waves, deployment ordering, gitops,...",\n'
    printf '    "validationPasses": 3,              -- Passed validation after 3 rounds\n'
    printf '    "totalValidationAttempts": 4,       -- One attempt failed before succeeding\n'
    printf '    "confidenceThreshold": 0.35,        -- Gap detection threshold used\n'
    printf '    "gapConfidence": 0.21,              -- Original routing confidence (low = gap)\n'
    printf '    "totalTokensUsed": 4720,            -- LLM tokens consumed during generation\n'
    printf '    "generationAttempts": 2             -- 1 initial + 1 regeneration during retry\n'
    printf '  }\n'

    advance
    sub_banner "THE AUTO-CREATION PIPELINE"
    echo ""
    code_block "HOW IT WORKS (under the hood)" \
        "1. Router detects gap: confidence < 0.35 (or empty results)" \
        "2. LLM analyzes the task and existing skill corpus" \
        "3. Determines: domain, topic, description, triggers for new skill" \
        "4. Generates SKILL.md with proper frontmatter and content" \
        "5. Validates against stub detection rules (size, sentinels, etc.)" \
        "6. If validation fails -> regenerates (up to max retries, default 5)" \
        "7. If all pass -> writes file, commits to git, pushes to origin/main" \
        "8. Calls POST /reload to make the new skill immediately available"
    echo ""

    advance
    sub_banner "WHAT MAKES A GOOD AUTO-CREATION CANDIDATE"
    echo ""
    key_point "High gap confidence = low skill coverage -> system knows it needs a new skill"
    key_point "Domain is clear (cncf, coding, trading) -> LLM can target the right knowledge area"
    key_point "Topic fits naming convention (kebab-case) -> auto-generated names follow rules"
    key_point "Task description is specific and actionable -> better skill content quality"
    echo ""

    sub_banner "REAL-WORLD USE CASES"
    echo -e "  ${CYAN}Auto-Discovers Gaps:${RESET}          No need to manually track which skills are missing."
    echo -e "  ${MAGENTA}Rapid Skill Development:${RESET}      New domain emerges? The system creates the skill for you."
    echo -e "  ${GREEN}Dry Run Mode:{RESET}                 Set dryRun=true to preview without saving to disk."
    echo ""
    separator

    # Section 10b: GET /skills/created
    sub_banner "GET /skills/created -- Listing Auto-Created Skills"
    echo ""
    code_block "CURL COMMAND" "curl ${API_URL}/skills/created"

    advance
    echo -e "${BOLD}WHAT THE RESPONSE LOOKS LIKE:${RESET}"
    echo ""
    printf '  {\n'
    printf '    "total": 7,                     -- Number of auto-created skills\n'
    printf '    "totalTokensUsed": 32840,       -- Cumulative tokens spent creating them\n'
    printf '    "skills": [\n'
    printf '      {\n'
    printf '        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",\n'
    printf '        "skillName": "cncf-argocd-sync-waves",\n'
    printf '        "domain": "cncf",\n'
    printf '        "topic": "argocd-sync-waves",\n'
    printf '        "description": "Implements ArgoCD sync wave patterns...",\n'
    printf '        "triggers": "argocd, sync waves, deployment ordering, gitops,...",\n'
    printf '        "filePath": "/cache/skills/cncf/argocd-sync-waves/SKILL.md",\n'
    printf '        "timestamp": "2026-06-06T15:30:00.000Z",\n'
    printf '        "totalTokensUsed": 4720,\n'
    printf '        "generationAttempts": 2,\n'
    printf '        "validationAttempts": 4,\n'
    printf '        "gitCommitted": true,\n'
    printf '        "gitPushed": true\n'
    printf '      }\n'
    printf '    ]\n'
    printf '  }\n'

    advance
    sub_banner "WHAT YOU'RE LOOKING FOR"
    echo ""
    key_point "\"totalTokensUsed\" -- Budget tracking: how much have you spent on auto-created skills?"
    key_point "\"gitCommitted\" / \"gitPushed\" -- Verify auto-generated skills made it into version control"
    key_point "Each skill entry has full metadata, including generation cost and validation history"
    echo ""

    sub_banner "REAL-WORLD USE CASES"
    echo -e "  ${CYAN}Audit Trail:${RESET}                    Review all auto-created skills for quality review."
    echo -e "  ${MAGENTA}Budget Tracking:{RESET}             Monitor token usage for auto-creation (can get expensive!)."
    echo -e "  ${GREEN}Dependency Mapping:{RESET}           See which domains have the most auto-generated coverage."
    echo ""
    separator
}

# ─── Section 11: Config Link Following ────────────────────────────────────────

section_11_config_link_following() {
    banner "SECTION 11/${TOTAL_SCENARIOS}: Config -- GET/POST /config/link-following"
    echo -e "${BOLD}WHY THIS MATTERS:${RESET}"
    echo ""
    echo -e "  SKILL.md files often contain markdown links -- to other skills, external docs,"
    echo -e "  or GitHub pages. The ${CYAN}link following system${RESET} decides:"
    echo -e ""
    echo -e "${MAGENTA}\"Should we follow this link? If so, how deep? External URLs allowed?\"${RESET}"
    echo ""
    echo -e "  Think of it like a web browser's security settings for links -- you control"
    echo -e "  what gets followed, how deeply, and whether external sites are safe to visit."
    echo ""
    advance

    sub_banner "GET /config/link-following -- Read Current Configuration"
    echo ""
    code_block "CURL COMMAND (read)" "curl ${API_URL}/config/link-following"

    advance
    echo -e "${BOLD}WHAT THE RESPONSE LOOKS LIKE:${RESET}"
    echo ""
    printf '  {\n'
    printf '    "enabled": true,                -- Are link following rules active?\n'
    printf '    "allowExternalLinks": false,    -- Follow links to external URLs (https://)?\n'
    printf '    "maxDepth": 3,                  -- How deep to follow nested links\n'
    printf '    "maxExternalSizeKb": 10,        -- Max KB for fetched external content\n'
    printf '    "compressionMode": "brief",     -- brief | moderate | skip\n'
    printf '    "jsRenderingEnabled": false,    -- Execute JavaScript on external pages?\n'
    printf '    "jsRenderTimeoutMs": 5000,      -- Timeout for JS rendering (ms)\n'
    printf '    "jsRenderFallback": true,       -- Fallback to raw HTML if JS fails\n'
    printf '    "resolutionMode": "inline",    -- inline | semantic | compressed\n'
    printf '    "semanticTopK": 3,              -- Top-K results for semantic resolution\n'
    printf '    "semanticSimilarityThreshold": 0.3, -- Min similarity score for match\n'
    printf '    "updatedAt": "2026-06-06T15:45:00.000Z"\n'
    printf '  }\n'

    advance
    sub_banner "POST /config/link-following -- Update Configuration at Runtime"
    echo ""
    code_block "CURL REQUEST (update)" \
        "curl -X POST ${API_URL}/config/link-following \"-H Content-Type: application/json\" \\" \
        "  \"-d '{\"max_depth\": 5, \"allow_external_links\": true,\"" \
        "\"resolution_mode\": \"semantic\", \"compression_mode\": \"moderate\"}'\""

    advance
    echo -e "${BOLD}WHAT THE RESPONSE LOOKS LIKE:${RESET}"
    echo ""
    printf '  {\n'
    printf '    "enabled": true,                -- Updated config values\n'
    printf '    "allowExternalLinks": true,\n'
    printf '    "maxDepth": 5,                  -- Was 3 before this update\n'
    printf '    "maxExternalSizeKb": 10,\n'
    printf '    "compressionMode": "moderate",\n'
    printf '    "jsRenderingEnabled": false,\n'
    printf '    "jsRenderTimeoutMs": 5000,\n'
    printf '    "jsRenderFallback": true,\n'
    printf '    "resolutionMode": "semantic",\n'
    printf '    "semanticTopK": 3,\n'
    printf '    "semanticSimilarityThreshold": 0.3,\n'
    printf '    "updatedAt": "2026-06-06T15:47:30.123Z"   -- When this change was made\n'
    printf '  }\n'

    advance
    sub_banner "CONFIGURATION FIELD EXPLANATIONS"
    echo ""
    code_block "KEY FIELDS AND THEIR PURPOSES" \
        "maxDepth (1-10):     How deep to follow nested links. 3 means: A->B->C stops before D." \
        "allowExternalLinks:  When false, only local SKILL.md references are resolved." \
        "compressionMode:     brief=summary, moderate=key sections, skip=no fetch" \
        "resolutionMode:      inline=full content, semantic=search-match, compressed" \
        "jsRenderingEnabled:  Execute JS on external pages to render SPAs. Security risk!" \
        "jsRenderTimeoutMs:   How long to wait for JS execution (1000-30000ms)" \
        "semanticTopK:        When using semantic mode, how many results to return" \
        "semanticSimilarityThreshold: Min score (0-1) for a semantic match to be accepted"
    echo ""

    sub_banner "WHAT YOU'RE LOOKING FOR"
    echo ""
    key_point "\"allowExternalLinks\" -- Should be false in production unless you trust all referenced sources."
    key_point "\"maxDepth\" -- Higher values = more content loaded but more latency. 3-5 is recommended."
    key_point "\"resolutionMode\" -- 'semantic' mode uses vector search to find matching content sections."
    echo ""

    sub_banner "REAL-WORLD USE CASES"
    echo -e "  ${CYAN}Security Hardening:${RESET}         Set allowExternalLinks=false to prevent loading untrusted content."
    echo -e "  ${MAGENTA}Performance Tuning:{RESET}         Reduce maxDepth for faster routing, increase for richer context."
    echo -e "  ${GREEN}Semantic Link Resolution:{RESET}   Use 'semantic' mode with high similarity threshold for accuracy."
    echo ""
    separator
}

# ─── Section Summary & Exit ──────────────────────────────────────────────────

section_summary() {
    banner "COMPLETE ENDPOINT REFERENCE -- YOUR CHEAT SHEET"
    echo -e "${BOLD}Here is every endpoint we covered today:${RESET}"
    echo ""

    printf "  ${DIM}+${BOLD} %-6s${DIM}-+-- %-42s${DIM}-+----------------------------------------------+\n" \
        "METHOD" "ENDPOINT" "PURPOSE"
    printf "  ${DIM}+------++------------------------------------------+-+----------------------------------------------+\n"

    local endpoints=(
        "GET     /health                    Health check and readiness probe"
        "GET     /stats                     System statistics (skills count, categories)"
        "GET     /skills                    Browse full skill catalog with metadata"
        "GET     /skill/:name               Retrieve SKILL.md content for a specific skill"
        "POST    /route  CORE               Route a natural language task to best-matching skills"
        "POST    /execute                   Execute routed tasks via MCP tools"
        "GET     /access-log                Audit trail of last 100 routing decisions"
        "POST    /reload                    Force reload skills index from source of truth"
        "GET     /metrics                   Compression metrics and cache statistics"
        "POST    /skill/create              AI-driven skill creation when no good match exists"
        "GET     /skills/created            List all auto-generated skills with metadata"
        "GET     /config/link-following     Read current markdown link resolution config"
        "POST    /config/link-following     Update link following configuration at runtime"
    )

    for ep in "${endpoints[@]}"; do
        local method endpoint purpose
        method=$(echo "$ep" | awk '{print $1}')
        endpoint=$(echo "$ep" | awk '{print $2}')
        purpose=$(echo "$ep" | sed 's/^[^ ]* [^ ]* //')
        if [[ ${#purpose} -gt 56 ]]; then
            purpose="${purpose:0:53}..."
        fi
        printf "  ${DIM}| ${BOLD}%-6s${RESET}${DIM} │ %-42s${DIM} │ %-58s${RESET}│\n" "$method" "$endpoint" "$purpose"
    done

    printf "  ${DIM}+------+------+----------------------------------------------+\n\n"

    advance

    sub_banner "WHAT YOU'VE LEARNED TODAY"
    echo ""
    code_block "THE AGENT SKILL ROUTER IN 5 SENTENCES" \
        "1. OpenCode sends a user query as a natural language task string." \
        "2. POST /route uses hybrid scoring (vector + BM25 + triggers + archetype + historical) to find the best-matching skills from 593+ options." \
        "3. The response includes skill names, scores, reasoning, and an execution plan (sequential/parallel/hybrid)." \
        "4. POST /execute runs the selected skills through MCP tools for actual task completion." \
        "5. If no good match is found (low confidence), POST /skill/create auto-generates a new skill via LLM."
    echo ""

    advance

    sub_banner "QUICK REFERENCE: COMMON WORKFLOWS"
    echo ""
    code_block "WORKFLOW 1: Check service health" \
        "curl ${API_URL}/health | grep status"
    echo ""
    code_block "WORKFLOW 2: Route a task and get top skill" \
        "curl -X POST ${API_URL}/route \"-d '{\"task\": \"Fix my pod crash\"}'\" | grep '\"name\"'"
    echo ""
    code_block "WORKFLOW 3: Get full skill content" \
        "curl ${API_URL}/skill/kubernetes-events-management"
    echo ""
    code_block "WORKFLOW 4: Browse all skills by domain" \
        "curl ${API_URL}/skills | python3 -m json.tool | grep -E '\"(name|category)\":'"
    echo ""
    code_block "WORKFLOW 5: After pushing new skills, reload" \
        "curl -X POST ${API_URL}/reload && echo 'Skills reloaded!'"
    echo ""
    code_block "WORKFLOW 6: Check compression efficiency" \
        "curl ${API_URL}/metrics | grep totalTokensSaved"
    echo ""

    advance

    # Final sign-off banner
    banner "END OF WALKTHROUGH -- THANK YOU!"
    echo ""
    echo -e "${BOLD}You now know every endpoint of the Agent Skill Router API:${RESET}"
    echo ""
    echo -e "  ${CYAN}${TOTAL_SCENARIOS} sections${RESET} covering health, stats, catalog browsing, skill retrieval,"
    echo -e "  task routing (the core), execution, audit logging, reload, compression metrics,"
    echo -e "  auto-skill creation, and configuration management."
    echo ""
    echo -e "  ${DIM}Quick stats from this walkthrough:${RESET}"
    echo -e "    ${GREEN}${TOTAL_SCENARIOS}${RESET} endpoint categories | ${GREEN}12${RESET} API endpoints | ${GREEN}593+${RESET} skills across ${GREEN}8${RESET} domains"
    echo -e "    ${GREEN}5-signal${RESET} hybrid pipeline | ${GREEN}7${RESET} query archetypes | ${GREEN}Auto-create${RESET} on gap detection"
    echo ""
    echo -e "${DIM}Next steps:${RESET}"
    echo -e "  -> Try the endpoints yourself: curl ${API_URL}/health"
    echo -e "  -> Explore skills:        curl ${API_URL}/skills | python3 -m json.tool"
    echo -e "  -> Route a real task:     curl -X POST ${API_URL}/route -d '{\"task\":\"Your question here\"}'"
    echo ""

    progress_indicator "$TOTAL_SCENARIOS" "$TOTAL_SCENARIOS"
    echo ""
}

# ─── Main Function ─────────────────────────────────────────────────────────────

main() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --live) LIVE_MODE="true"; shift ;;
            *) echo "Unknown option: $1"; echo "Usage: $0 [--live]"; exit 1 ;;
        esac
    done

    if [[ "$LIVE_MODE" != "true" ]] && [[ ! -t 0 ]]; then
        echo -e "${YELLOW}Warning: Running in non-interactive mode without --live flag.${RESET}"
        echo -e "${YELLOW}Switching to live mode automatically.${RESET}"
        LIVE_MODE="true"
    fi

    check_service || true

    sub_banner "AGENT SKILL ROUTER -- API WALKTHROUGH v1.0.0"

    if [[ "$LIVE_MODE" == "true" ]]; then
        echo -e "${DIM}Running in LIVE mode -- all scenarios will execute automatically.${RESET}"
    else
        echo -e "${BOLD}${CYAN}Welcome to the Agent Skill Router API Walkthrough!${RESET}"
        echo ""
        echo -e "  This is an ${CYAN}educational walkthrough${RESET} that teaches you how every endpoint"
        echo -e "  of the Agent Skill Router works. Each section includes:"
        echo ""
        echo -e "    ${GREEN}+ WHY this feature exists${RESET}     -- The problem it solves"
        echo -e "    ${GREEN}+ THE ANATOMY${RESET}                 -- How to call it (curl commands)"
        echo -e "    ${GREEN}+ SAMPLE OUTPUTS${RESET}              -- What the response looks like"
        echo -e "    ${GREEN}+ KEY INSIGHTS${RESET}                -- Things to notice and watch for"
        echo -e "    ${GREEN}+ REAL-WORLD USE CASES${RESET}        -- When you would actually use this"
        echo ""
        echo -e "  ${DIM}Press Enter between sections, or use --live for automated mode.${RESET}"
    fi

    echo ""

    section_00_intro
    section_01_health_check
    advance
    section_02_system_stats
    advance
    section_03_skill_listing
    advance
    section_04_skill_retrieval
    advance
    section_05_task_routing
    advance
    section_06_task_execution
    advance
    section_07_access_log
    advance
    section_08_force_reload
    advance
    section_09_compression_metrics
    advance
    section_10_auto_created_skills
    advance
    section_11_config_link_following
    advance
    section_summary

    echo ""
}

main "$@"
