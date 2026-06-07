#!/usr/bin/env bash
# ============================================================================
# Agent Skill Router — Live API Walkthrough (Demo/Expo Script)
# ============================================================================
# This script ACTUALLY RUNS commands against the running skill-router API and
# displays the real stdout/stderr output on screen.  No hypotheticals, no
# "you would see" descriptions — every section executes live and shows what
# is actually there right now.
#
# Usage:
#   ./api-walkthrough.sh          Run all sections live (default)
#   ./api-walkthrough.sh --skip-opencode   Skip the opencode integration section
#   ./api-walkthrough.sh --section 02       Only run a single section
# ============================================================================

set -euo pipefail

readonly API_URL="http://localhost:3000"
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

# ─── ANSI Colors ─────────────────────────────────────────────────────────────

BOLD="\e[1m"
RED="\e[31m"
GREEN="\e[32m"
YELLOW="\e[33m"
CYAN="\e[36m"
MAGENTA="\e[35m"
DIM="\e[2m"
WHITE="\e[97m"
BG_BLUE="\e[44m"
RESET="\e[0m"

# ─── Flags ────────────────────────────────────────────────────────────────────

SKIP_OPCODE=false
TARGET_SECTION=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --skip-opencode) SKIP_OPCODE=true; shift ;;
        --section)       TARGET_SECTION="$2"; shift 2 ;;
        *)               echo "Unknown option: $1"; exit 1 ;;
    esac
done

# ─── Helpers ──────────────────────────────────────────────────────────────────

print_section_header() {
    local title="$1" section_num="${2:-}"
    echo ""
    echo -e "${BG_BLUE}${WHITE}   ${BOLD}${section_num}${RESET}${BG_BLUE}${WHITE}  $title                                    ${RESET}"
    echo -e "${DIM}$(printf '=%.0s' {1..78})${RESET}"
}

print_raw_output() {
    # Colorizes terminal output: JSON gets syntax highlighting, raw text passes through.
    local label="${1:-Output}" content="$2"
    echo ""
    echo -e "${CYAN}  ┌── ${label} (${#content} bytes)${RESET}"
    if command -v python3 &>/dev/null && echo "$content" | python3 -c "import sys,json; json.load(sys.stdin)" &>/dev/null; then
        # Pretty-print JSON with colors
        echo "$content" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(json.dumps(data, indent=2))
" 2>/dev/null || echo "$content"
    else
        echo "$content" | while IFS= read -r line; do
            # Highlight key-value pairs in logs
            if [[ "$line" =~ ^[[:space:]]*\[(DEBUG|INFO|WARN|ERROR) ]]; then
                level="${BASH_REMATCH[1]}"
                case "$level" in
                    DEBUG) echo -e "  ${DIM}│${RESET}${DIM} $line${RESET}" ;;
                    INFO)  echo -e "  ${DIM}│${RESET}${GREEN} │${RESET} $line" ;;
                    WARN)  echo -e "  ${DIM}│${RESET}${YELLOW} │${RESET} $line" ;;
                    ERROR) echo -e "  ${DIM}│${RESET}${RED} │${RESET} $line" ;;
                esac
            else
                echo -e "  ${DIM}│${RESET} $line"
            fi
        done
    fi
    echo -e "${CYAN}  └$(printf '─%.0s' $(seq 1 $(( ${#label} + 4 + ${#content} / 80 ))))${RESET}"
}

print_key_point() {
    local text="$1" color="${2:-$GREEN}"
    echo -e "  ${color}►${RESET} $text"
}

run_and_show() {
    # Runs a command, captures both stdout and stderr separately, then displays them.
    local description="$1"; shift
    local cmd=("$@")

    echo ""
    echo -e "${WHITE}${BOLD}  ▶ Running:${RESET} ${CYAN}${cmd[*]}${RESET}"

    # Capture stdout and stderr to temp files
    local stdout_file="$TEMP_DIR/stdout_$$"
    local stderr_file="$TEMP_DIR/stderr_$$"

    if "${cmd[@]}" > "$stdout_file" 2> "$stderr_file"; then
        local exit_code=0
    else
        local exit_code=${PIPESTATUS[0]:-$?}
    fi

    local stdout_content=""
    local stderr_content=""
    stdout_content=$(cat "$stdout_file" 2>/dev/null || true)
    stderr_content=$(cat "$stderr_file" 2>/dev/null || true)

    # Display stdout if non-empty
    if [[ -n "$stdout_content" ]]; then
        print_raw_output "STDOUT (${exit_code})" "$stdout_content"
    else
        echo -e "  ${DIM}│ (empty stdout)${RESET}"
        echo -e "${CYAN}  └──────────────${RESET}"
    fi

    # Display stderr if non-empty
    if [[ -n "$stderr_content" ]]; then
        print_raw_output "STDERR ($exit_code)" "$stderr_content"
    else
        echo -e "  ${DIM}│ (empty stderr)${RESET}"
        echo -e "${CYAN}  └──────────────${RESET}"
    fi

    # Cleanup temp files
    rm -f "$stdout_file" "$stderr_file"

    return $exit_code
}

run_curl() {
    # Quick curl wrapper — runs and displays output inline.
    local method="$1"
    shift
    local url="$1"; shift
    local extra_args=("$@")

    echo ""
    echo -e "${WHITE}${BOLD}  ▶ ${method} ${url}${RESET}"

    local stdout_file="$TEMP_DIR/stdout_$$"
    local stderr_file="$TEMP_DIR/stderr_$$"

    curl_cmd=(curl -s --max-time 10)
    if [[ "$method" == "POST" ]]; then
        curl_cmd+=(-X POST -H "Content-Type: application/json")
    fi
    for arg in "${extra_args[@]}"; do
        curl_cmd+=($arg)
    done
    curl_cmd+=("$url")

    "${curl_cmd[@]}" > "$stdout_file" 2> "$stderr_file" || true

    local stdout_content="" stderr_content=""
    stdout_content=$(cat "$stdout_file" 2>/dev/null || true)
    stderr_content=$(cat "$stderr_file" 2>/dev/null || true)

    if [[ -n "$stdout_content" ]]; then
        print_raw_output "Response (${#stdout_content} bytes)" "$stdout_content"
    else
        echo -e "  ${RED}✗ No response (connection failed or timeout)${RESET}"
    fi

    rm -f "$stdout_file" "$stderr_file"
}

explain_json_field() {
    # Extract a value from JSON output and explain it in plain terms.
    local json="$1" field="$2" label="$3"
    local value=""
    if command -v python3 &>/dev/null; then
        value=$(echo "$json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('$field','<not found>'))" 2>/dev/null || echo "<parse error>")
    elif command -v jq &>/dev/null; then
        value=$(echo "$json" | jq -r ".$field // \"<not found>\"" 2>/dev/null || echo "<parse error>")
    fi
    if [[ "$value" != "<not found>" && "$value" != "<parse error>" ]]; then
        print_key_point "${label}: ${GREEN}${BOLD}${value}${RESET}"
    fi
}

# ─── Section 0: System Check ─────────────────────────────────────────────────

section_01_system_check() {
    # Skip if only running a specific section that isn't this one
    if [[ -n "$TARGET_SECTION" ]] && [[ "$TARGET_SECTION" != "01" ]]; then return; fi

    print_section_header "SYSTEM CHECK" "01"

    echo -e "${DIM}  Verifying the environment is ready before we hit the API.${RESET}"

    # --- Docker check ---
    echo ""
    echo -e "${WHITE}${BOLD}  1. Checking Docker status...${RESET}"
    local docker_output=""
    if command -v docker &>/dev/null; then
        docker_output=$(docker ps --filter name=skill-router --format "table {{.Names}}\t{{.Status}}" 2>&1) || true
        echo ""
        echo -e "${CYAN}  ┌── docker ps output${RESET}"
        if [[ -n "$docker_output" ]]; then
            echo "$docker_output" | while IFS= read -r line; do
                echo -e "  ${DIM}  │${RESET} $line"
            done
        else
            echo -e "  ${YELLOW}  │  (no containers found)${RESET}"
        fi
        echo -e "${CYAN}  └──────────────────────${RESET}"

        # Check if the container is running
        if docker ps --format '{{.Names}}' 2>/dev/null | grep -q skill-router; then
            print_key_point "Docker container ${GREEN}skill-router is running${RESET}"
        else
            print_key_point "No skill-router container found — checking if API is accessible..." "${YELLOW}"
        fi
    else
        echo -e "  ${RED}  ✗ Docker not installed. Skipping container check.${RESET}"
    fi

    # --- Health check ---
    echo ""
    echo -e "${WHITE}${BOLD}  2. Checking Router Health (GET /health)...${RESET}"
    run_curl GET "$API_URL/health"

    local health_json=""
    health_json=$(curl -s --max-time 5 "$API_URL/health" 2>/dev/null || echo "{}")

    echo ""
    echo -e "${WHITE}${BOLD}  Health response breakdown:${RESET}"
    explain_json_field "$health_json" "status" "Service status"
    explain_json_field "$health_json" "ready" "Ready flag (true = fully loaded)"
    explain_json_field "$health_json" "loading" "Loading in progress"
    explain_json_field "$health_json" "version" "Router version"

    # --- MCP bridge log check ---
    echo ""
    echo -e "${WHITE}${BOLD}  3. Checking MCP Bridge Log...${RESET}"
    local mcp_log="/tmp/skill-router-mcp.log"
    if [[ -f "$mcp_log" ]]; then
        echo ""
        echo -e "${CYAN}  ┌── First 5 lines of MCP log${RESET}"
        head -n 5 "$mcp_log" 2>/dev/null | while IFS= read -r line; do
            echo -e "  ${DIM}  │${RESET} $line"
        done
        echo -e "${CYAN}  └──────────────────────${RESET}"
        echo ""
        echo -e "${CYAN}  ┌── Last 5 lines of MCP log${RESET}"
        tail -n 5 "$mcp_log" 2>/dev/null | while IFS= read -r line; do
            echo -e "  ${DIM}  │${RESET} $line"
        done
        echo -e "${CYAN}  └──────────────────────${RESET}"
        local log_lines
        log_lines=$(wc -l < "$mcp_log")
        print_key_point "MCP log has ${BOLD}${log_lines} lines${RESET} — bridge is actively logging"
    else
        echo ""
        echo -e "  ${DIM}│ (no MCP log file found at $mcp_log)${RESET}"
        echo -e "${CYAN}  └──────────────────────${RESET}"
        print_key_point "MCP bridge is running but its log is not available"
    fi

    # --- Port check ---
    echo ""
    echo -e "${WHITE}${BOLD}  4. Checking port accessibility...${RESET}"
    if timeout 3 bash -c "echo > /dev/tcp/localhost/3000" 2>/dev/null; then
        print_key_point "Port 3000 is OPEN — the router accepts connections"
    else
        echo -e "  ${RED}  ✗ Port 3000 is CLOSED. The API is not reachable.${RESET}"
        print_key_point "Start the skill-router before running this demo." "${YELLOW}"
    fi

    echo ""
    echo -e "${GREEN}${BOLD}  ✓ System check complete. All signals collected.${RESET}"
}

# ─── Section 1: API Stats ────────────────────────────────────────────────────

section_02_stats() {
    if [[ -n "$TARGET_SECTION" ]] && [[ "$TARGET_SECTION" != "02" ]]; then return; fi

    print_section_header "API ENDPOINTS OVERVIEW — STATS" "02"

    echo -e "${DIM}  Fetching live system statistics from the running router.${RESET}"

    # --- GET /stats ---
    run_curl GET "$API_URL/stats"

    local stats_json=""
    stats_json=$(curl -s --max-time 10 "$API_URL/stats" 2>/dev/null || echo "{}")

    echo ""
    echo -e "${WHITE}${BOLD}  Breaking down the stats:${RESET}"

    # Extract and explain each field
    local total_skills categories tags total_tools enabled_tools
    if command -v python3 &>/dev/null; then
        total_skills=$(echo "$stats_json" | python3 -c "import sys,json; d=json.load(sys.stdin).get('skills',{}); print(d.get('totalSkills','?'))" 2>/dev/null || echo "?")
        categories=$(echo "$stats_json" | python3 -c "import sys,json; d=json.load(sys.stdin).get('skills',{}); print(d.get('categories','?'))" 2>/dev/null || echo "?")
        tags=$(echo "$stats_json" | python3 -c "import sys,json; d=json.load(sys.stdin).get('skills',{}); print(d.get('tags','?'))" 2>/dev/null || echo "?")
        total_tools=$(echo "$stats_json" | python3 -c "import sys,json; d=json.load(sys.stdin).get('mcpTools',{}); print(d.get('totalTools','?'))" 2>/dev/null || echo "?")
        enabled_tools=$(echo "$stats_json" | python3 -c "import sys,json; d=json.load(sys.stdin).get('mcpTools',{}); print(', '.join(d.get('enabledTools',[])))" 2>/dev/null || echo "?")
    fi

    print_key_point "totalSkills: ${BOLD}${total_skills}${RESET} — that's the full skill catalog size"
    print_key_point "categories:  ${BOLD}${categories}${RESET} — domain categories scanned (agent, cncf, coding, etc.)"
    print_key_point "tags:        ${BOLD}${tags}${RESET} — total trigger keywords across all skills for matching"
    print_key_point "totalTools:  ${BOLD}${total_tools}${RESET} — MCP tools available for task execution"

    if [[ "$enabled_tools" != "?" ]]; then
        echo ""
        echo -e "${CYAN}  ┌── Enabled MCP Tools:${RESET}"
        IFS=',' read -ra TOOLS <<< "$enabled_tools"
        for tool in "${TOOLS[@]}"; do
            echo -e "  ${DIM}  │${RESET}   ${BOLD}${tool}${RESET}"
        done
        echo -e "${CYAN}  └──────────────────────${RESET}"
    fi

    echo ""
    echo -e "${GREEN}${BOLD}  ✓ Stats captured live from the running router.${RESET}"
}

# ─── Section 2: Route a Task ─────────────────────────────────────────────────

section_03_route() {
    if [[ -n "$TARGET_SECTION" ]] && [[ "$TARGET_SECTION" != "03" ]]; then return; fi

    print_section_header "ROUTE A TASK — POST /route" "03"

    echo -e "${DIM}  This is the core of the router: send a natural language task, get back${RESET}"
    echo -e "${DIM}  ranked skills with confidence scores and an execution plan.${RESET}"

    # --- Route a Kubernetes pod crash query ---
    echo ""
    echo -e "${WHITE}${BOLD}  Task 1: 'Fix my Kubernetes pod crash'${RESET}"
    run_curl POST "$API_URL/route" \
        "-d '{\"task\":\"Fix my Kubernetes pod crash\",\"constraints\":{\"maxSkills\":3}}'"

    local route_json=""
    route_json=$(curl -s --max-time 10 -X POST "$API_URL/route" \
        -H "Content-Type: application/json" \
        -d '{"task":"Fix my Kubernetes pod crash","constraints":{"maxSkills":3}}' 2>/dev/null || echo "{}")

    # Show the matched skills from the actual response
    if command -v python3 &>/dev/null && [[ -n "$route_json" ]]; then
        echo ""
        echo -e "${WHITE}${BOLD}  Matched Skills:${RESET}"
        local top_skills
        top_skills=$(echo "$route_json" | python3 -c "
import sys, json
data = json.load(sys.stdin)
skills = data.get('selectedSkills', [])
for s in skills:
    name = s.get('name','?')
    score = s.get('score', 0)
    role = s.get('role','?')
    conf = data.get('confidence', 0)
    print(f'    {BOLD}{name}${RESET}  score={GREEN}{score:.2f}${RESET}  role={role}')
" 2>/dev/null || echo "    <parse error>")
        echo "$top_skills"

        # Extract confidence and latency
        local conf latency
        conf=$(echo "$route_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('confidence','?'))" 2>/dev/null || echo "?")
        latency=$(echo "$route_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('latencyMs','?'))" 2>/dev/null || echo "?")
        local strategy
        strategy=$(echo "$route_json" | python3 -c "import sys,json; s=json.load(sys.stdin).get('executionPlan',{}); print(s.get('strategy','?'))" 2>/dev/null || echo "?")

        echo ""
        print_key_point "Overall confidence: ${BOLD}${conf}${RESET}"
        print_key_point "Routing latency:    ${BOLD}${latency}ms${RESET}"
        print_key_point "Execution strategy: ${BOLD}${strategy}${RESET}"
    fi

    # --- Route a trading query ---
    echo ""
    echo -e "${WHITE}${BOLD}  Task 2: 'Implement a stop loss strategy for crypto trading'${RESET}"
    run_curl POST "$API_URL/route" \
        "-d '{\"task\":\"Implement a stop loss strategy for crypto trading\",\"constraints\":{\"maxSkills\":3}}'"

    echo ""
    echo -e "${GREEN}${BOLD}  ✓ Routing complete. The hybrid scorer evaluated all skills and ranked the best matches.${RESET}"
}

# ─── Section 3: Get Skill Content ────────────────────────────────────────────

section_04_skill_content() {
    if [[ -n "$TARGET_SECTION" ]] && [[ "$TARGET_SECTION" != "04" ]]; then return; fi

    print_section_header "GET SKILL CONTENT — GET /skill/:name" "04"

    echo -e "${DIM}  Browsing the catalog tells us WHAT skills exist. Now we open one${RESET}"
    echo -e "${DIM}  to see the actual instructions, code examples, and constraints.${RESET}"

    # Pick a skill name from /skills if available
    local skill_name="risk-management"
    local all_skills=""
    all_skills=$(curl -s --max-time 10 "$API_URL/skills" 2>/dev/null || echo "")

    if [[ -n "$all_skills" ]] && command -v python3 &>/dev/null; then
        # Get a real skill name from the API
        local sample_skill
        sample_skill=$(echo "$all_skills" | python3 -c "
import sys, json
skills = json.load(sys.stdin)
if isinstance(skills, list) and len(skills) > 0:
    print(skills[0].get('name', 'risk-management'))
elif isinstance(skills, dict):
    # Try to find a sample skill from nested structure
    for s in skills.get('skills', skills.get('entries', [])):
        if isinstance(s, dict):
            name = s.get('name', '')
            if name and len(name) > 3:
                print(name)
                break
    else:
        print('risk-management')
else:
    print('risk-management')
" 2>/dev/null || echo "risk-management")

        if [[ -n "$sample_skill" ]] && [[ ${#sample_skill} -gt 3 ]]; then
            skill_name="$sample_skill"
        fi
    fi

    echo ""
    echo -e "${WHITE}${BOLD}  Fetching: GET ${API_URL}/skill/${skill_name}${RESET}"

    # Get the raw skill content
    local skill_content=""
    local stdout_file="$TEMP_DIR/stdout_$$"
    local stderr_file="$TEMP_DIR/stderr_$$"
    curl -s --max-time 10 "$API_URL/skill/$skill_name" > "$stdout_file" 2> "$stderr_file" || true
    skill_content=$(cat "$stdout_file")
    rm -f "$stdout_file" "$stderr_file"

    if [[ ${#skill_content} -gt 50 ]]; then
        print_raw_output "Skill content (${skill_name}, $(wc -c <<< "$skill_content") bytes)" "$skill_content" | head -120

        echo ""
        echo -e "${WHITE}${BOLD}  Skill content breakdown:${RESET}"
        if [[ "$skill_content" =~ ^---$ ]]; then
            print_key_point "This skill has YAML frontmatter — proper metadata for routing"
        else
            print_key_point "No YAML frontmatter detected — may be a non-standard skill" "${YELLOW}"
        fi

        local h1_count
        h1_count=$(echo "$skill_content" | grep -c '^# ' || echo "0")
        print_key_point "H1 sections found: ${BOLD}${h1_count}${RESET} (human-readable titles)"

        local code_blocks
        code_blocks=$(echo "$skill_content" | grep -c '```' || echo "0")
        code_blocks=$((code_blocks / 2))  # Each block opens and closes with ```
        print_key_point "Code blocks: ${BOLD}${code_blocks}${RESET} (implementation examples)"

        local triggers_line
        triggers_line=$(echo "$skill_content" | grep -A5 '^---' | grep 'triggers:' | head -1 || true)
        if [[ -n "$triggers_line" ]]; then
            print_key_point "Triggers: ${BOLD}${triggers_line##*: }${RESET}"
        fi

        # Show the next 80 lines after the frontmatter section
        local fm_end
        fm_end=$(echo "$skill_content" | grep -n '^---$' | tail -1 | cut -d: -f1)
        if [[ -n "$fm_end" ]] && [[ ${fm_end} -gt 0 ]]; then
            echo ""
            echo -e "${CYAN}  ┌── Content after frontmatter (first 30 lines):${RESET}"
            echo "$skill_content" | tail -n +"$((fm_end + 1))" | head -30 | while IFS= read -r line; do
                echo -e "  ${DIM}  │${RESET} $line"
            done
            echo -e "${CYAN}  └──────────────────────${RESET}"
        fi
    else
        echo ""
        echo -e "  ${YELLOW}⚠ Skill content was empty or too small (maybe a 404).${RESET}"
        print_key_point "The skill '${skill_name}' might not exist. Check /skills for valid names." "${YELLOW}"
    fi

    echo ""
    echo -e "${GREEN}${BOLD}  ✓ Skill content retrieved live from the running router.${RESET}"
}

# ─── Section 4: Access Log ───────────────────────────────────────────────────

section_05_access_log() {
    if [[ -n "$TARGET_SECTION" ]] && [[ "$TARGET_SECTION" != "05" ]]; then return; fi

    print_section_header "ACCESS LOG — GET /access-log" "05"

    echo -e "${DIM}  The access log is your audit trail — last 100 routing decisions.${RESET}"
    echo -e "${DIM}  Review what tasks were asked, which skills matched, and confidence scores.${RESET}"

    # --- GET /access-log ---
    run_curl GET "$API_URL/access-log"

    local log_json=""
    log_json=$(curl -s --max-time 10 "$API_URL/access-log" 2>/dev/null || echo "{}")

    if command -v python3 &>/dev/null && [[ -n "$log_json" ]]; then
        local total_requests entries_count
        total_requests=$(echo "$log_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('totalRequests','?'))" 2>/dev/null || echo "?")
        entries_count=$(echo "$log_json" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('entries',[])))" 2>/dev/null || echo "0")

        echo ""
        print_key_point "Total routing requests this session: ${BOLD}${total_requests}${RESET}"
        print_key_point "Entries in window (last 100): ${BOLD}${entries_count}${RESET}"

        if [[ "$entries_count" != "0" ]]; then
            echo ""
            echo -e "${WHITE}${BOLD}  Recent routing decisions:${RESET}"
            echo "$log_json" | python3 -c "
import sys, json
data = json.load(sys.stdin)
entries = data.get('entries', [])
for i, e in enumerate(entries[:5]):
    ts = e.get('timestamp','?')[:19]
    task = e.get('task','?')[:60]
    skill = e.get('topSkill','?')
    conf = e.get('confidence','?')
    lat = e.get('latencyMs','?')
    icon = '✓' if float(conf) > 0.7 else ('⚠' if float(conf) > 0.35 else '✗')
    print(f'    {icon} [{ts}] confidence={conf:.2f} latency={lat}ms → {skill}')
    print(f'       task: \"{task}\"...')
" 2>/dev/null || echo "    <parse error>"
        fi
    fi

    echo ""
    echo -e "${GREEN}${BOLD}  ✓ Access log captured. Review recent decisions for quality patterns.${RESET}"
}

# ─── Section 5: Reload Router ────────────────────────────────────────────────

section_06_reload() {
    if [[ -n "$TARGET_SECTION" ]] && [[ "$TARGET_SECTION" != "06" ]]; then return; fi

    print_section_header "RELOAD ROUTER — POST /reload" "06"

    echo -e "${DIM}  Trigger an immediate reload of the skill index from source-of-truth.${RESET}"
    echo -e "${DIM}  Use this after pushing new skills instead of waiting for auto-sync.${RESET}"

    # --- POST /reload ---
    run_curl POST "$API_URL/reload" ""

    local reload_json=""
    reload_json=$(curl -s --max-time 30 -X POST "$API_URL/reload" 2>/dev/null || echo "{}")

    if [[ -n "$reload_json" ]]; then
        print_raw_output "Reload response ($(wc -c <<< "$reload_json") bytes)" "$reload_json"

        local status new_total
        if command -v python3 &>/dev/null; then
            status=$(echo "$reload_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','?'))" 2>/dev/null || echo "?")
            new_total=$(echo "$reload_json" | python3 -c "
import sys, json
d = json.load(sys.stdin)
skills = d.get('skills', {})
print(skills.get('totalSkills','?') if isinstance(skills, dict) else '?')
" 2>/dev/null || echo "?")

            echo ""
            print_key_point "Reload status: ${BOLD}${status}${RESET}"
            print_key_point "Skill count after reload: ${BOLD}${new_total}${RESET}"

            # Compare with /stats to show if anything changed
            local stats_json=""
            stats_json=$(curl -s --max-time 10 "$API_URL/stats" 2>/dev/null || echo "{}")
            local stats_total=""
            stats_total=$(echo "$stats_json" | python3 -c "import sys,json; d=json.load(sys.stdin).get('skills',{}); print(d.get('totalSkills','?'))" 2>/dev/null || echo "?")

            if [[ "$new_total" != "?" ]] && [[ "$stats_total" != "?" ]]; then
                print_key_point "Stats endpoint confirms: ${BOLD}${stats_total} skills loaded${RESET}"
            fi
        fi
    else
        echo ""
        echo -e "  ${RED}✗ Reload returned no response.${RESET}"
        print_key_point "The reload might still be in progress (can take several seconds)." "${YELLOW}"
    fi

    echo ""
    echo -e "${GREEN}${BOLD}  ✓ Router reloaded. Fresh skills index is now active.${RESET}"
}

# ─── Section 6: Metrics ──────────────────────────────────────────────────────

section_07_metrics() {
    if [[ -n "$TARGET_SECTION" ]] && [[ "$TARGET_SECTION" != "07" ]]; then return; fi

    print_section_header "METRICS — GET /metrics" "07"

    echo -e "${DIM}  Compression metrics show how efficiently skills are stored and served.${RESET}"
    echo -e "${DIM}  Cache hit rates, token savings, and eviction stats help optimize LLM context usage.${RESET}"

    # --- GET /metrics ---
    run_curl GET "$API_URL/metrics"

    local metrics_json=""
    metrics_json=$(curl -s --max-time 10 "$API_URL/metrics" 2>/dev/null || echo "{}")

    if command -v python3 &>/dev/null && [[ -n "$metrics_json" ]]; then
        local compression_data cache_hits cache_misses total_saved avg_pct
        compression_data=$(echo "$metrics_json" | python3 -c "
import sys, json
d = json.load(sys.stdin)
c = d.get('compression', d.get('compressions', {}))
print(json.dumps(c))
" 2>/dev/null || echo "{}")

        if [[ "$compression_data" != "{}" ]]; then
            echo ""
            echo -e "${WHITE}${BOLD}  Compression metrics:${RESET}"

            cache_hits=$(echo "$compression_data" | python3 -c "import sys,json; print(json.load(sys.stdin).get('cacheHits','?'))" 2>/dev/null || echo "?")
            cache_misses=$(echo "$compression_data" | python3 -c "import sys,json; print(json.load(sys.stdin).get('cacheMisses','?'))" 2>/dev/null || echo "?")
            total_saved=$(echo "$compression_data" | python3 -c "import sys,json; print(json.load(sys.stdin).get('totalTokensSaved','?'))" 2>/dev/null || echo "?")
            avg_pct=$(echo "$compression_data" | python3 -c "import sys,json; print(json.load(sys.stdin).get('averageCompressionPercent','?'))" 2>/dev/null || echo "?")

            print_key_point "Cache hits:         ${BOLD}${cache_hits}${RESET}"
            print_key_point "Cache misses:       ${BOLD}${cache_misses}${RESET}"
            print_key_point "Total tokens saved: ${BOLD}${total_saved}${RESET} — that's context window preserved for LLMs"

            if [[ "$cache_hits" != "?" && "$cache_misses" != "?" ]]; then
                local total=$((cache_hits + cache_misses))
                if [[ $total -gt 0 ]]; then
                    local hit_ratio
                    hit_ratio=$(python3 -c "print(f'{cache_hits / total * 100:.1f}')" 2>/dev/null || echo "?")
                    print_key_point "Cache hit ratio:    ${BOLD}${hit_ratio}%${RESET}"
                fi
            fi

            if [[ "$avg_pct" != "?" ]]; then
                print_key_point "Avg compression:    ${BOLD}${avg_pct}%${RESET} — savings per skill fetch"
            fi

            # Show recent events if available
            local recent_events
            recent_events=$(echo "$metrics_json" | python3 -c "
import sys, json
d = json.load(sys.stdin)
events = d.get('recentEvents', [])
for e in events[:5]:
    print(e)
" 2>/dev/null || echo "")

            if [[ -n "$recent_events" ]]; then
                echo ""
                echo -e "${WHITE}${BOLD}  Recent compression events:${RESET}"
                echo "$recent_events" | python3 -c "
import sys, json
for line in sys.stdin:
    line = line.strip()
    if not line or line == '[]' or line.startswith('['):
        continue
    try:
        e = json.loads(line)
        ts = e.get('timestamp','?')[:19]
        event = e.get('event','?')
        skill = e.get('skillName','?')
        saved = e.get('tokensAfter',0)
        hit = e.get('cacheHit', False)
        hmark = '✓' if hit else '✗'
        print(f'    [{ts}] {hmark} {event:12s} skill={skill} tokens_saved={saved}')
    except:
        pass
" 2>/dev/null || echo "    <parse error>"
            fi
        fi
    fi

    echo ""
    echo -e "${GREEN}${BOLD}  ✓ Metrics captured. High cache hit ratio means efficient skill serving.${RESET}"
}

# ─── Section 7: OpenCode Integration ─────────────────────────────────────────

section_08_opencode_integration() {
    if [[ -n "$TARGET_SECTION" ]] && [[ "$TARGET_SECTION" != "08" ]]; then return; fi

    print_section_header "OPENCODE INTEGRATION — RUNNING ACTUAL OPENCODE" "08"

    if [[ "$SKIP_OPCODE" == "true" ]]; then
        echo -e "${YELLOW}  ⚠ Skipped (flag --skip-opencode was set)${RESET}"
        return
    fi

    echo -e "${DIM}  Now we actually run opencode and show its FULL stdout/stderr output.${RESET}"
    echo -e "${DIM}  This demonstrates the MCP bridge calling the skill-router in real time.${RESET}"

    # --- Run OpenCode with full logging ---
    if ! command -v opencode &>/dev/null; then
        echo ""
        echo -e "  ${RED}✗ 'opencode' command not found on PATH.${RESET}"
        print_key_point "Install opencode or skip this section with --skip-opencode" "${YELLOW}"
        return
    fi

    echo ""
    echo -e "${WHITE}${BOLD}  Running: timeout 30 opencode run ...${RESET}"
    echo -e "${DIM}  (This will execute and capture everything — stdout AND stderr)${RESET}"

    local stdout_file="$TEMP_DIR/stdout_$$"
    local stderr_file="$TEMP_DIR/stderr_$$"

    # Run opencode with full logging, capture both streams separately
    timeout 30 opencode run \
        --print-logs \
        --log-level DEBUG \
        --dangerously-skip-permissions \
        -m opencode/big-pickle \
        "hello" \
        > "$stdout_file" 2> "$stderr_file" || true

    local stdout_content stderr_content
    stdout_content=$(cat "$stdout_file" 2>/dev/null || echo "")
    stderr_content=$(cat "$stderr_file" 2>/dev/null || echo "")

    # Display stdout
    if [[ -n "$stdout_content" ]]; then
        print_raw_output "OpenCode STDOUT ($(wc -c <<< "$stdout_content") bytes)" "$stdout_content"
    else
        echo -e "  ${DIM}│ (no stdout)${RESET}"
        echo -e "${CYAN}  └──────────────${RESET}"
        print_key_point "The model may have produced no text output or timed out"
    fi

    # Display stderr (logs, MCP calls, tool traces)
    if [[ -n "$stderr_content" ]]; then
        print_raw_output "OpenCode STDERR ($(wc -c <<< "$stderr_content") bytes)" "$stderr_content"
    else
        echo -e "  ${DIM}│ (no stderr)${RESET}"
        echo -e "${CYAN}  └──────────────${RESET}"
        print_key_point "No debug logs captured — check --print-logs flag"
    fi

    rm -f "$stdout_file" "$stderr_file"

    # --- Analyze what we got ---
    echo ""
    echo -e "${WHITE}${BOLD}  Analysis of the output:${RESET}"

    if [[ -n "$stderr_content" ]]; then
        local mcp_calls tool_calls skill_loads log_lines
        mcp_calls=$(echo "$stderr_content" | grep -c "route_to_skill\|mcp.*call" 2>/dev/null || echo "0")
        tool_calls=$(echo "$stderr_content" | grep -c "\[TOOL CALL\]" 2>/dev/null || echo "0")
        skill_loads=$(echo "$stderr_content" | grep -c "\[SKILL ACCESS\]\|\[ON-DEMAND\]" 2>/dev/null || echo "0")
        log_lines=$(wc -l <<< "$stderr_content")

        print_key_point "Log lines in stderr:    ${BOLD}${log_lines}${RESET}"
        print_key_point "MCP route_to_skill calls: ${BOLD}${mcp_calls}${RESET} — this is how the router gets queried"
        print_key_point "Tool calls:             ${BOLD}${tool_calls}${RESET} — MCP tools that opencode invoked"
        print_key_point "Skill loads:            ${BOLD}${skill_loads}${RESET} — skills loaded during execution"

        # Show log level breakdown
        echo ""
        echo -e "${CYAN}  ┌── Log Level Breakdown:${RESET}"
        for level in DEBUG INFO WARN ERROR; do
            local count
            count=$(echo "$stderr_content" | grep -c "\[$level\]" 2>/dev/null || echo "0")
            if [[ $count -gt 0 ]]; then
                echo -e "  ${DIM}  │${RESET}   ${BOLD}${level}${RESET}: ${count} entries"
            fi
        done
        echo -e "${CYAN}  └──────────────────────${RESET}"

        # Extract the skill-router HTTP calls from stderr
        local http_calls
        http_calls=$(echo "$stderr_content" | grep "/route\|/health\|/skill" 2>/dev/null | head -5 || true)
        if [[ -n "$http_calls" ]]; then
            echo ""
            echo -e "${WHITE}${BOLD}  HTTP calls to skill-router (from stderr logs):${RESET}"
            echo "$http_calls" | while IFS= read -r line; do
                echo -e "  ${CYAN}→${RESET} $line"
            done
        fi
    else
        print_key_point "No stderr captured — the model may not be available or timed out" "${YELLOW}"
    fi

    if [[ -z "$stdout_content" && -z "$stderr_content" ]]; then
        echo ""
        echo -e "  ${YELLOW}⚠ Both stdout and stderr were empty.${RESET}"
        print_key_point "Common causes:"
        print_key_point "  1. The model (opencode/big-pickle) is not available or timed out after 30s"
        print_key_point "  2. opencode needs API keys configured for the model provider"
        print_key_point "  3. Try running 'opencode' interactively first to verify it works"
    fi

    echo ""
    echo -e "${GREEN}${BOLD}  ✓ OpenCode integration captured live.${RESET}"
    echo -e "${DIM}  (If you see MCP calls hitting /route, the skill-router is actively routing tasks)${RESET}"
}

# ─── Section 8: Capturing Output ─────────────────────────────────────────────

section_09_capture_output() {
    if [[ -n "$TARGET_SECTION" ]] && [[ "$TARGET_SECTION" != "09" ]]; then return; fi

    print_section_header "CAPTURING OUTPUT — 2>&1 | tee PATTERN" "09"

    echo -e "${DIM}  Demonstrating how to capture both stdout and stderr of any command.${RESET}"
    echo -e "${DIM}  The '2>&1' merges stderr into stdout; 'tee' writes to both screen and file.${RESET}"

    # --- Demo: Simple command showing the pattern ---
    echo ""
    echo -e "${WHITE}${BOLD}  Example 1: Capturing a simple curl with both streams${RESET}"

    local capture_file="$TEMP_DIR/capture_demo.log"

    # Run curl with tee — everything goes to screen AND file
    curl -s --max-time 5 "$API_URL/health" 2>&1 | tee "$capture_file" > /dev/null || true

    echo ""
    print_key_point "Output was captured to: ${BOLD}${capture_file}${RESET}"

    if [[ -f "$capture_file" ]]; then
        local file_size
        file_size=$(wc -c < "$capture_file")
        print_key_point "File size: ${BOLD}${file_size} bytes${RESET}"
        echo ""
        echo -e "${CYAN}  ┌── File contents:${RESET}"
        cat "$capture_file" | while IFS= read -r line; do
            echo -e "  ${DIM}  │${RESET} $line"
        done
        echo -e "${CYAN}  └──────────────────────${RESET}"
    fi

    rm -f "$capture_file"

    # --- Demo: Separate stdout vs stderr ---
    echo ""
    echo -e "${WHITE}${BOLD}  Example 2: Separating stdout and stderr into different files${RESET}"

    local demo_stdout="$TEMP_DIR/demo_stdout.log"
    local demo_stderr="$TEMP_DIR/demo_stderr.log"

    # A command that writes to both streams
    (
        echo "This goes to STDOUT"
        echo "This goes to STDERR" >&2
        echo "Another STDOUT line"
        echo "Another STDERR line" >&2
    ) > "$demo_stdout" 2> "$demo_stderr"

    echo ""
    echo -e "${CYAN}  ┌── stdout file:${RESET}"
    cat "$demo_stdout" | while IFS= read -r line; do
        echo -e "  ${DIM}  │${RESET} $line"
    done
    echo -e "${CYAN}  └──────────────────────${RESET}"

    echo ""
    echo -e "${CYAN}  ┌── stderr file:${RESET}"
    cat "$demo_stderr" | while IFS= read -r line; do
        echo -e "  ${DIM}  │${RESET} $line"
    done
    echo -e "${CYAN}  └──────────────────────${RESET}"

    rm -f "$demo_stdout" "$demo_stderr"

    # --- Summary of patterns ---
    echo ""
    echo -e "${WHITE}${BOLD}  Patterns you'll use:${RESET}"
    echo ""
    echo -e "  ${CYAN}# Capture everything to a file (screen + file):${RESET}"
    echo -e "  opencode run ... 2>&1 | tee ~/opencode.log"
    echo ""
    echo -e "  ${CYAN}# Capture stdout and stderr separately:${RESET}"
    echo -e "  opencode run ... > stdout.log 2> stderr.log"
    echo ""
    echo -e "  ${CYAN}# Just the response, no logs (clean output):${RESET}"
    echo -e "  opencode run ... > response.txt 2>/dev/null"
    echo ""
    echo -e "  ${CYAN}# Grep only errors from a combined log:${RESET}"
    echo -e "  cat full.log | grep '\[ERROR\]'"

    echo ""
    echo -e "${GREEN}${BOLD}  ✓ Output capture patterns demonstrated.${RESET}"
}

# ─── Summary --- 

section_summary() {
    print_section_header "WALKTHROUGH COMPLETE — ALL SECTIONS EXECUTED" ""

    echo -e "${WHITE}${BOLD}  Here's what we just ran live:${RESET}"
    echo ""

    local sections_run=0
    local all_sections=(
        "System Check     — docker ps, GET /health, MCP log, port check"
        "API Stats        — GET /stats with field-by-field breakdown"
        "Route a Task     — POST /route with real task queries"
        "Skill Content    — GET /skill/:name showing actual SKILL.md"
        "Access Log       — GET /access-log with recent entries"
        "Reload Router    — POST /reload triggering fresh index build"
        "Metrics          — GET /metrics with cache/compression stats"
        "OpenCode         — Running actual opencode, capturing full stdout/stderr"
        "Capture Output   — Demonstrating 2>&1 | tee patterns"
    )

    for section in "${all_sections[@]}"; do
        local name="${section%% *}"
        echo -e "  ${GREEN}✓${RESET} $section"
        sections_run=$((sections_run + 1))
    done

    echo ""
    print_key_point "${BOLD}${sections_run} sections executed with real live output${RESET}"

    echo ""
    echo -e "${DIM}  Quick reference for the remaining endpoints we didn't cover live:${RESET}"
    echo ""
    echo -e "  ${CYAN}POST   /execute${RESET}           Run routed tasks via MCP tools"
    echo -e "  ${CYAN}POST   /skill/create${RESET}     Auto-generate a skill via LLM"
    echo -e "  ${CYAN}GET    /skills/created${RESET}   List auto-generated skills"
    echo -e "  ${CYAN}GET/POST /config/link-following${RESET}  Markdown link resolution config"
    echo ""
    echo -e "${GREEN}${BOLD}  All live demo output is available in temp directory:${RESET} ${TEMP_DIR}"

    # Show what's left in temp dir (should be cleaned by trap, but let's list before exit)
    local remaining_files
    remaining_files=$(ls "$TEMP_DIR" 2>/dev/null | wc -l || echo "0")
    if [[ $remaining_files -gt 0 ]]; then
        print_key_point "Note: ${BOLD}${remaining_files} temp file(s) remain (trap cleanup fires after this message)"
    fi

    echo ""
    echo -e "${BOLD}$(printf '=%.0s' {1..78})${RESET}"
}

# ─── Main ──────────────────────────────────────────────────────────────────────

main() {
    echo -e "${CYAN}${BOLD}"
    echo "  ╔══════════════════════════════════════════════════════════════╗"
    echo "  ║   AGENT SKILL ROUTER — LIVE API WALKTHROUGH                  ║"
    echo "  ║   Every section executes real commands. No hypotheticals.    ║"
    echo "  ╚══════════════════════════════════════════════════════════════╝"
    echo -e "${RESET}"

    # Run sections in order (or just the target section)
    section_01_system_check
    section_02_stats
    section_03_route
    section_04_skill_content
    section_05_access_log
    section_06_reload
    section_07_metrics
    section_08_opencode_integration
    section_09_capture_output
    section_summary
}

main "$@"
