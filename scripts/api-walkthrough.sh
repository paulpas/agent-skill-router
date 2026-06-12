#!/usr/bin/env bash
# ============================================================================
# Agent Skill Router — Using OpenCode as an AI Coding Assistant Across Domains
# ============================================================================
# Demonstrates how a developer asks their AI assistant (OpenCode + skill router)
# to solve problems in DIFFERENT technical domains, showing real skill routing
# for each task. All prompts are purely hypothetical knowledge questions.
#
# Usage:
#   ./api-walkthrough.sh                          Walk through all 10 chapters (uses llamacpp/anomaly-llama-cpp-model)
#   ./api-walkthrough.sh --chapter N              Jump to chapter N directly (1-10)
#   ./api-walkthrough.sh --skip-opencode          Skip the OpenCode integration chapter
#   ./api-walkthrough.sh --model ollama/qwen3     Use a different model provider
#   MODEL=ollama/qwen3-coder:30b ./api-walkthrough.sh  Override model via environment variable
#
# Requirements: bash 4+, curl, python3, jq
# Note: For markdown rendering of AI responses, install glow (optional):
#   brew install glow        (macOS)
#   snap install glow --classic   (Ubuntu/Debian — also available on other distros via snapd)
#   cargo install glow       (any platform with Rust toolchain)
# ============================================================================

set -euo pipefail

readonly API_URL="http://localhost:3000"
TEMP_DIR=$(mktemp -d)
CHAPTER=0
TOTAL_CHAPTERS=10
TARGET_CHAPTER=""
SKIP_OPENCODE=false
# MODEL override for Chapter 7 (default: match ai() function's opencode/big-pickle)
# Usage: ./script.sh --chapter 7 --model ollama/qwen3
# Or:    MODEL=ollama/qwen3 ./script.sh --chapter 7
MODEL=""

trap 'rm -rf "$TEMP_DIR"' EXIT

# ─── ANSI Colors ─────────────────────────────────────────────────────────────

BOLD="\e[1m" RED="\e[31m" GREEN="\e[32m" YELLOW="\e[33m"
CYAN="\e[36m" DIM="\e[2m" WHITE="\e[97m"
BG_CYAN="\e[46m" BG_GREEN="\e[42m" RESET="\e[0m"

# ─── Dependency Check ────────────────────────────────────────────────────────

check_dependencies() {
    for cmd in curl python3 jq; do
        if ! command -v "$cmd" &>/dev/null; then
            echo ""; echo -e "  ${RED}✗ Required command not found: ${cmd}${RESET}"
            exit 1
        fi
    done
}

# ─── Argument Parsing with Validation ─────────────────────────────────────

while [[ $# -gt 0 ]]; do
    case "$1" in
        --skip-opencode)
            SKIP_OPENCODE=true
            shift
            ;;
        --chapter)
            TARGET_CHAPTER="$2"
            # FIX: Validate that TARGET_CHAPTER is numeric
            if ! [[ "$TARGET_CHAPTER" =~ ^[0-9]+$ ]] || [[ "$TARGET_CHAPTER" -lt 1 || "$TARGET_CHAPTER" -gt 10 ]]; then
                echo "Error: --chapter must be a number between 1 and 10" >&2
                exit 1
            fi
            shift 2
            ;;
        --model)
            MODEL="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1" >&2
            exit 1
            ;;
    esac
done

# ─── Write Python JSON colorizer to temp file (avoids quoting issues) ────────

cat > "$TEMP_DIR/colorize_json.py" << 'ENDOFPYTHON'
import sys,json,re
try:
    d=json.load(sys.stdin)
    def fmt(obj, indent=0):
        sp='  '*indent
        if isinstance(obj,dict):
            lines=['{']
            for k,v in obj.items():
                lines.append(f'{sp}  {repr(k)}: {fmt(v,indent+1)}')
            lines.append(f'{sp}}}')
            return '\n'.join(lines)
        elif isinstance(obj,list):
            if len(obj)==0: return '[]'
            lines=['[']
            for v in obj:
                lines.append(f'{sp}  {fmt(v,indent+1)},')
            lines.append(f'{sp}]')
            return '\n'.join(lines)
        elif isinstance(obj,bool): return ('\033[32mTrue\033[0m' if obj else '\033[31mFalse\033[0m')
        elif isinstance(obj,int) or isinstance(obj,float): return f'\033[36m{obj}\033[0m'
        elif isinstance(obj,str): return f'\033[33m{repr(obj)}\033[0m'
        else: return str(obj)
    print(fmt(d))
except: sys.stdout.write(sys.stdin.read())
ENDOFPYTHON

colorize_json() {
    python3 "$TEMP_DIR/colorize_json.py" 2>/dev/null || cat
}

# ─── Helpers ──────────────────────────────────────────────────────────────────

check_api() {
    curl -s --max-time 3 "$API_URL/health" &>/dev/null || {
        echo ""; echo -e "  ${RED}✗ API not available at ${API_URL}${RESET}"
        print_key_point "Start: $(pwd)/scripts/start-skill-router.sh" "${YELLOW}"
        exit 1
    }
}

show_progress() {
    printf "\r${DIM}  [%d/%d]${RESET} ${CYAN}${BOLD}%s${RESET}" "$1" "$TOTAL_CHAPTERS" "$2"
}

print_chapter_header() {
    echo ""
    echo -e "${CYAN}${BOLD}  CHAPTER $1 — $2${RESET}"
    echo -e "${DIM}$(printf '═%.0s' {1..78})${RESET}"
}

print_scenario() { echo ""; echo -e "${WHITE}${BOLD}  📖 Scenario:${RESET} ${DIM}$1${RESET}"; }

print_key_point() { local color="${2:-$GREEN}"; echo -e "  ${color}►${RESET} $1"; }

# Display output from a file with optional pagination for massive responses.
# Shows first N lines without pausing, then offers to continue if >max_lines total.
# Supports configurable lines per page (default 30-40 for readability).
display_output() {
    local label="$1" file="$2" max_lines="${3:-300}" lines_per_page="${4:-35}"
    echo ""

    # If file is empty (0 bytes), report immediately
    if [[ ! -s "$file" ]]; then
        printf "  ${CYAN}  ┌── %s (empty)${RESET}\n" "$label"
        echo -e "  ${DIM}  │ (empty response)${RESET}"
        echo -e "  ${CYAN}  └──────────────────────────────────────${RESET}"
        return
    fi

    # Normalize single-line JSON to multi-line for display and correct line counting
    # FIX: Remove '|| true' so JSON formatting errors are visible
    if [[ "$(wc -l < "$file")" -eq 0 ]]; then
        python3 -m json.tool < "$file" > "${file}.norm" 2>/dev/null && mv "${file}.norm" "$file"
    fi

    local count; count=$(wc -l < "$file")
    printf "  ${CYAN}  ┌── %s (${count} lines)${RESET}\n" "$label"

    if [[ "$count" -eq 0 ]]; then
        echo -e "  ${DIM}  │ (empty response)${RESET}"
    else
        # Display full JSON output
        cat "$file" | colorize_json

        # For large output, paginate the rest with interactive prompts
        if [[ "$count" -gt "$max_lines" ]]; then
            local offset=$count
            while [[ "$offset" -lt "$count" ]]; do
                # In non-interactive mode, show all pages automatically
                if [[ ! -t 1 ]]; then
                    echo ""
                    sed -n "$((offset + 1)),${count}p" "$file" | colorize_json
                    break
                fi

                echo ""
                local remaining=$((count - offset))
                echo -e "  ${DIM}─── [ ${count} lines total — showing ${offset}/${count} above ] ───${RESET}"
                echo -e "  ${CYAN}${BOLD}Press ENTER for next page, Q to skip remaining${RESET}"
                read -r -t 60 user_input < /dev/tty 2>/dev/null || user_input=""
                
                if [[ "${user_input,,}" == "q" ]]; then
                    break
                fi
                
                # Show next page
                echo ""
                local next_end=$((offset + lines_per_page))
                if [[ "$next_end" -gt "$count" ]]; then
                    next_end=$count
                fi
                sed -n "$((offset + 1)),${next_end}p" "$file" | colorize_json
                offset=$next_end
            done
        fi
    fi

    echo -e "  ${CYAN}  └──────────────────────────────────────${RESET}"
}

# Display output directly from a variable (piped through temp file for colorize)
display_var_output() {
    local label="$1" content="$2" max_lines="${3:-300}"
    local tmpf="$TEMP_DIR/var_out_$$"
    echo "$content" > "$tmpf"
    display_output "$label" "$tmpf" "$max_lines"
    rm -f "$tmpf"
}

# FIX: Extract JSON field value with proper error handling
json_extract() {
    local json="$1" field="$2"
    if ! command -v python3 &>/dev/null; then
        echo "?"
        return 1
    fi
    
    python3 -c "
import sys,json
try:
    d=json.loads(sys.stdin.read())
    field = '${field}'
    for k in field.split('.'): 
        d=d[k]
    print(d)
except: 
    print('?')
" <<< "$json" 2>/dev/null || echo "?"
}

# Print two columns side-by-side
get_col_width() {
    local w; w=$(tput cols 2>/dev/null || echo 80)
    echo $((w > 80 ? w - 14 : 66))
}

print_two_col() {
    local left="$1" right="$2"
    local cw; cw=$(get_col_width)
    local left_lines=() right_lines=()

    while IFS= read -r line; do [[ -n "$line" ]] && left_lines+=("$line"); done <<< "$left"
    while IFS= read -r line; do [[ -n "$line" ]] && right_lines+=("$line"); done <<< "$right"

    # FIX: Use max of both arrays consistently
    local max=$(( ${#left_lines[@]} > ${#right_lines[@]} ? ${#left_lines[@]} : ${#right_lines[@]} ))
    local term_h; term_h=$(tput lines 2>/dev/null || echo 50)
    max=$((max > term_h - 18 ? term_h - 18 : max))

    for ((i=0; i<max; i++)); do
        local l="${left_lines[$i]:-}"; local r="${right_lines[$i]:-}"
        printf "  %-45s │ %s\n" "$l" "$r"
    done
    echo ""
}

print_colored_two_col() {
    local left_title="$1" right_title="$2"
    printf "\n  ${GREEN}${BOLD}%-45s${DIM}│${RESET} ${CYAN}%s${RESET}\n" "$left_title" "$right_title"
}

# ─── Prompt for JSON Display ────────────────────────────────────────────────────

# Displays pagination prompt and waits for user input.
# Returns 0 (true) if user wants to see JSON, 1 (false) if they want to skip.
# In non-interactive mode (piped output), shows JSON automatically without prompting.
prompt_for_json_display() {
    # If stdout is not a terminal, don't block — show JSON automatically
    if [[ ! -t 1 ]]; then
        return 0
    fi

    echo ""
    echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━ Press ENTER to see full JSON response (Q to skip) ━━━━━━━━━━━━━━━━━━━━━${RESET}"
    local user_input=""
    read -r -t 30 user_input < /dev/tty 2>/dev/null || {
        # If /dev/tty failed or timed out, default to showing JSON (not skipping)
        return 0
    }

    case "${user_input,,}" in
        q|quit|exit)
            return 1
            ;;
        *)
            return 0
            ;;
    esac
}

# ─── Per-Chapter Pagination ────────────────────────────────────────────────────

page_output_simple() {
    local max_lines=${1:-300}

    if [[ ! -t 1 ]]; then
        cat; return
    fi

    local tmpf="$TEMP_DIR/page_$$"
    cat > "$tmpf"
    local count; count=$(wc -l < "$tmpf")

    if [[ "$count" -lt "$max_lines" ]]; then
        cat "$tmpf"
        rm -f "$tmpf"
        return
    fi

    # In non-interactive mode, show output without pagination
    if [[ ! -t 1 ]]; then
        echo ""
        cat "$tmpf"
        rm -f "$tmpf"
        return
    fi

    echo ""
    echo -e "  ${DIM}─── [ ${count} lines, press ENTER/SPACE for more, Q to skip ] ───${RESET}"
    read -r -t 120 _ < /dev/tty 2>/dev/null || true
    cat "$tmpf"
    rm -f "$tmpf"
}

# ─── Pagination Navigation ────────────────────────────────────────────────────

prompt_next_page() {
    # In non-interactive mode, skip navigation prompt entirely
    if [[ ! -t 1 ]]; then
        return 1
    fi

    echo ""
    echo -e "${DIM}$(printf '─%.0s' {1..78})${RESET}"
    echo -e "${CYAN}${BOLD}  [ ${CHAPTER}/${TOTAL_CHAPTERS} ] Press ENTER for next chapter, or type: N[ext] / P[rev] / Q[uit]${RESET}"
    local input=""
    read -r -t 60 input < /dev/tty 2>/dev/null || input=""

    case "${input,,}" in
        n|next)   return 0 ;;
        p|prev)   goto_prev_page; return 0 ;;
        q|quit|exit) print_summary; exit 0 ;;
        "")       return 0 ;;
        *)        return 0 ;;
    esac
}

goto_prev_page() {
    if [[ "$CHAPTER" -gt 1 ]]; then
        CHAPTER=$((CHAPTER - 1))
        print_key_point "${YELLOW}Returning to chapter ${CHAPTER}.${RESET}"
    fi
}

# ─── Chapter 1: Morning Standup ──────────────────────────────────────────────

chapter_01_health_check() {
    [[ -n "$TARGET_CHAPTER" ]] && CHAPTER="$TARGET_CHAPTER" || CHAPTER=$((CHAPTER + 1))
    [[ -n "$TARGET_CHAPTER" && "$TARGET_CHAPTER" != "1" ]] && return
    show_progress "$CHAPTER" "Health & Stats"
    print_chapter_header "$CHAPTER" "MORNING STANDUP — Health & Stats"
    print_scenario "It's 9 AM. You boot up: Is everything running? How many skills loaded?"

    # Docker check (compact)
    if command -v docker &>/dev/null; then
        local d_out; d_out=$(docker ps --filter name=skill-router --format "{{.Names}} {{.Status}}" 2>&1) || true
        [[ -n "$d_out" ]] && echo -e "  Docker: ${GREEN}${BOLD}$d_out${RESET}" || \
            echo -e "  Docker: ${DIM}(no containers found)${RESET}"
    else
        echo -e "  Docker: ${DIM}not installed, using standalone API${RESET}"
    fi

    # Health + Stats in 2-column layout
    local h; h=$(curl -s --max-time 5 "$API_URL/health" 2>/dev/null || echo "{}")
    local s; s=$(curl -s --max-time 10 "$API_URL/stats" 2>/dev/null || echo "{}")

    local health_block stats_block
    health_block="Health Check ($(wc -c <<< "$h" | tr -d ' ') bytes)"
    health_block+=$'\n'"Status: $(json_extract "$h" "status")"
    health_block+=$'\n'"Ready:  $(json_extract "$h" "ready")"
    health_block+=$'\n'"Version: $(json_extract "$h" "version")"

    stats_block="System Stats ($(wc -c <<< "$s" | tr -d ' ') bytes)"
    stats_block+=$'\n'"Skills:   $(json_extract "$s" "skills.totalSkills")"
    stats_block+=$'\n'"Categories: $(json_extract "$s" "skills.categories")"
    stats_block+=$'\n'"Tags:      $(json_extract "$s" "skills.tags")"
    stats_block+=$'\n'"MCP Tools: $(json_extract "$s" "mcpTools.totalTools")"

    echo ""; print_colored_two_col "Health Check" "System Stats"
    print_two_col "$health_block" "$stats_block"

    # Domain breakdown (compact, single column)
    local all_s; all_s=$(curl -s --max-time 10 "$API_URL/skills" 2>/dev/null || echo '{"skills":[]}')
    echo -e "${WHITE}${BOLD}  Skills by domain:${RESET}"
    python3 -c "
import sys,json; d=json.load(sys.stdin); c={}
for s in d.get('skills',[]): c[s.get('category','?')]=c.get(s.get('category','?'),0)+1
g='\033[32m';r='\033[0m'
for cat,n in sorted(c.items(),key=lambda x:-x[1])[:5]: print(f'  {g}\u25b8{r} {cat}: {n:>4d} skills')" <<< "$all_s" 2>/dev/null || true

    # Prompt to display full JSON responses
    if prompt_for_json_display; then
        echo -e "${WHITE}${BOLD}  Health Check Response:${RESET}"
        echo "$h" > "$TEMP_DIR/ch01_health.json"
        python3 -m json.tool < "$TEMP_DIR/ch01_health.json" 2>/dev/null | colorize_json
        
        echo ""
        echo -e "${WHITE}${BOLD}  System Stats Response:${RESET}"
        echo "$s" > "$TEMP_DIR/ch01_stats.json"
        python3 -m json.tool < "$TEMP_DIR/ch01_stats.json" 2>/dev/null | colorize_json
    fi

    echo -e "${GREEN}${BOLD}  ✓ Chapter $CHAPTER complete.${RESET}"
    prompt_next_page
}

# ─── Chapter 2: Prometheus/Kubernetes Monitoring ──────────────────────────────

chapter_02_prometheus_k8s() {
    [[ -n "$TARGET_CHAPTER" ]] && CHAPTER="$TARGET_CHAPTER" || CHAPTER=$((CHAPTER + 1))
    [[ -n "$TARGET_CHAPTER" && "$TARGET_CHAPTER" != "2" ]] && return
    show_progress "$CHAPTER" "K8s Monitoring"
    print_chapter_header "$CHAPTER" "PROMETHEUS & KUBERNETES MONITORING"

    local TASK_PROMPT='How do I set up Kubernetes monitoring with Prometheus and Grafana for a production cluster? Need alerting rules and custom dashboards.'

    print_scenario "You need to monitor your K8s cluster. You ask your AI assistant:"
    echo -e "  ${DIM}\"${TASK_PROMPT}\"${RESET}"

    # FIX: Use jq for safe JSON escaping
    local route_file="$TEMP_DIR/ch02_route.json"
    curl -s --max-time 15 -X POST "${API_URL}/route" \
        -H "Content-Type: application/json" \
        -d "$(jq -n --arg task "$TASK_PROMPT" '{task: $task, constraints: {maxSkills: 5}}')" > "$route_file" 2>/dev/null || true

    # Show parsed top matches
    echo ""; echo -e "${WHITE}${BOLD}  Top matched skills:${RESET}"
    python3 -c "
import sys,json
try:
    with open('$route_file') as f:
        d=json.load(f)
except (json.JSONDecodeError, FileNotFoundError, ValueError):
    print('  ${RED}Error: Invalid or empty JSON response${RESET}')
    exit(1)
b='\033[1m';g='\033[32m';r='\033[0m';y='\033[33m';d_='\033[2m'
conf = d.get('confidence','?')
lat = d.get('latencyMs','?')
strat = d.get('executionPlan',{}).get('strategy','?')
print(f'  Confidence: {b}{g}{conf}{r}  |  Latency: {b}{lat}ms{r}  |  Strategy: {b}{strat}{r}')
for i,s in enumerate(d.get('selectedSkills',[])[:5],1):
    medals=['\U0001F947','\U0001F948','\U0001F949']
    icon=medals[i-1] if i<=3 else str(i)+'.'
    score=s.get('score',0)
    print(f'  {icon} {b}{s[\"name\"]}{r}  score={g}{score:.4f}{r}')
    reason = s.get('reasoning','')
    if reason: print(f'     {d_}{reason[:100]}...{r}')
# Show score breakdown for top match
explanation = d.get('scoreExplanations',{}).get(d.get('selectedSkills',[{}])[0].get('name',''),[])
if explanation:
    print()
    print(f'  {b}Why this skill matched:{r}')
    for e in explanation[:3]:
        print(f'     {d_}\u2022{r} {e[:120]}')
" 2>/dev/null || true

    # Prompt to display full JSON response
    if prompt_for_json_display; then
        display_output "Full /route Response" "$route_file" 400 45
    fi

    echo -e "${GREEN}${BOLD}  ✓ Chapter $CHAPTER complete.${RESET}"
    prompt_next_page
}

# ─── Chapter 3: VWAP Trading Algorithm ────────────────────────────────────────

chapter_03_vwap_trading() {
    [[ -n "$TARGET_CHAPTER" ]] && CHAPTER="$TARGET_CHAPTER" || CHAPTER=$((CHAPTER + 1))
    [[ -n "$TARGET_CHAPTER" && "$TARGET_CHAPTER" != "3" ]] && return
    show_progress "$CHAPTER" "VWAP Trading"
    print_chapter_header "$CHAPTER" "IMPLEMENTING A VWAP EXECUTION ALGORITHM"

    local TASK_PROMPT='Implement a VWAP execution algorithm for large crypto orders with minimal market impact. Need position sizing, entry/exit points, and risk limits.'

    print_scenario "You're building a crypto trading system. You ask your AI assistant:"
    echo -e "  ${DIM}\"${TASK_PROMPT}\"${RESET}"

    # FIX: Use jq for safe JSON escaping
    local route_file="$TEMP_DIR/ch03_route.json"
    curl -s --max-time 15 -X POST "${API_URL}/route" \
        -H "Content-Type: application/json" \
        -d "$(jq -n --arg task "$TASK_PROMPT" '{task: $task, constraints: {maxSkills: 5}}')" > "$route_file" 2>/dev/null || true

    # Show parsed results
    echo ""; echo -e "${WHITE}${BOLD}  Top matched skills:${RESET}"
    python3 -c "
import sys,json
try:
    with open('$route_file') as f:
        d=json.load(f)
except (json.JSONDecodeError, FileNotFoundError, ValueError):
    print('  ${RED}Error: Invalid or empty JSON response${RESET}')
    exit(1)
b='\033[1m';g='\033[32m';r='\033[0m';d_='\033[2m'
conf = d.get('confidence','?')
lat = d.get('latencyMs','?')
strat = d.get('executionPlan',{}).get('strategy','?')
print(f'  Confidence: {b}{g}{conf}{r}  |  Latency: {b}{lat}ms{r}  |  Strategy: {b}{strat}{r}')
for i,s in enumerate(d.get('selectedSkills',[])[:5],1):
    medals=['\U0001F947','\U0001F948','\U0001F949']
    icon=medals[i-1] if i<=3 else str(i)+'.'
    score=s.get('score',0)
    print(f'  {icon} {b}{s[\"name\"]}{r}  score={g}{score:.4f}{r}')
    reason = s.get('reasoning','')
    if reason: print(f'     {d_}{reason[:100]}...{r}')
" 2>/dev/null || true

    # Prompt to display full JSON response
    if prompt_for_json_display; then
        display_output "Full /route Response" "$route_file" 400 45
    fi

    echo -e "${GREEN}${BOLD}  ✓ Chapter $CHAPTER complete.${RESET}"
    prompt_next_page
}

# ─── Chapter 4: Distributed Tracing ──────────────────────────────────────────

chapter_04_distributed_tracing() {
    [[ -n "$TARGET_CHAPTER" ]] && CHAPTER="$TARGET_CHAPTER" || CHAPTER=$((CHAPTER + 1))
    [[ -n "$TARGET_CHAPTER" && "$TARGET_CHAPTER" != "4" ]] && return
    show_progress "$CHAPTER" "Distributed Tracing"
    print_chapter_header "$CHAPTER" "DESIGNING A DISTRIBUTED TRACING SYSTEM"

    local TASK_PROMPT='Design a distributed tracing system for microservices using OpenTelemetry and Jaeger. Need span propagation, baggage handling, and latency budgeting across service boundaries.'

    print_scenario "Your microservices are growing out of control. You ask your AI assistant:"
    echo -e "  ${DIM}\"${TASK_PROMPT}\"${RESET}"

    # FIX: Use jq for safe JSON escaping
    local route_file="$TEMP_DIR/ch04_route.json"
    curl -s --max-time 15 -X POST "${API_URL}/route" \
        -H "Content-Type: application/json" \
        -d "$(jq -n --arg task "$TASK_PROMPT" '{task: $task, constraints: {maxSkills: 5}}')" > "$route_file" 2>/dev/null || true

    echo ""; echo -e "${WHITE}${BOLD}  Top matched skills:${RESET}"
    python3 -c "
import sys,json
try:
    with open('$route_file') as f:
        d=json.load(f)
except (json.JSONDecodeError, FileNotFoundError, ValueError):
    print('  ${RED}Error: Invalid or empty JSON response${RESET}')
    exit(1)
b='\033[1m';g='\033[32m';r='\033[0m';d_='\033[2m'
conf = d.get('confidence','?')
lat = d.get('latencyMs','?')
strat = d.get('executionPlan',{}).get('strategy','?')
print(f'  Confidence: {b}{g}{conf}{r}  |  Latency: {b}{lat}ms{r}  |  Strategy: {b}{strat}{r}')
for i,s in enumerate(d.get('selectedSkills',[])[:5],1):
    medals=['\U0001F947','\U0001F948','\U0001F949']
    icon=medals[i-1] if i<=3 else str(i)+'.'
    score=s.get('score',0)
    print(f'  {icon} {b}{s[\"name\"]}{r}  score={g}{score:.4f}{r}')
    reason = s.get('reasoning','')
    if reason: print(f'     {d_}{reason[:100]}...{r}')
" 2>/dev/null || true

    # Prompt to display full JSON response
    if prompt_for_json_display; then
        display_output "Full /route Response" "$route_file" 400 45
    fi

    echo -e "${GREEN}${BOLD}  ✓ Chapter $CHAPTER complete.${RESET}"
    prompt_next_page
}

# ─── Chapter 5: Authentication Patterns ──────────────────────────────────────

chapter_05_auth_patterns() {
    [[ -n "$TARGET_CHAPTER" ]] && CHAPTER="$TARGET_CHAPTER" || CHAPTER=$((CHAPTER + 1))
    [[ -n "$TARGET_CHAPTER" && "$TARGET_CHAPTER" != "5" ]] && return
    show_progress "$CHAPTER" "Auth Patterns"
    print_chapter_header "$CHAPTER" "SECURE AUTHENTICATION — OAUTH2 vs OIDC vs JWT"

    local TASK_PROMPT='What are the best practices for secure authentication — OAuth2 vs OIDC vs JWT? Need token lifecycle management, refresh strategies, and security considerations for a web app.'

    print_scenario "You're designing a new web app's auth system. You ask your AI assistant:"
    echo -e "  ${DIM}\"${TASK_PROMPT}\"${RESET}"

    # FIX: Use jq for safe JSON escaping
    local route_file="$TEMP_DIR/ch05_route.json"
    curl -s --max-time 15 -X POST "${API_URL}/route" \
        -H "Content-Type: application/json" \
        -d "$(jq -n --arg task "$TASK_PROMPT" '{task: $task, constraints: {maxSkills: 5}}')" > "$route_file" 2>/dev/null || true

    echo ""; echo -e "${WHITE}${BOLD}  Top matched skills:${RESET}"
    python3 -c "
import sys,json
try:
    with open('$route_file') as f:
        d=json.load(f)
except (json.JSONDecodeError, FileNotFoundError, ValueError):
    print('  ${RED}Error: Invalid or empty JSON response${RESET}')
    exit(1)
b='\033[1m';g='\033[32m';r='\033[0m';d_='\033[2m'
conf = d.get('confidence','?')
lat = d.get('latencyMs','?')
strat = d.get('executionPlan',{}).get('strategy','?')
print(f'  Confidence: {b}{g}{conf}{r}  |  Latency: {b}{lat}ms{r}  |  Strategy: {b}{strat}{r}')
for i,s in enumerate(d.get('selectedSkills',[])[:5],1):
    medals=['\U0001F947','\U0001F948','\U0001F949']
    icon=medals[i-1] if i<=3 else str(i)+'.'
    score=s.get('score',0)
    print(f'  {icon} {b}{s[\"name\"]}{r}  score={g}{score:.4f}{r}')
    reason = s.get('reasoning','')
    if reason: print(f'     {d_}{reason[:100]}...{r}')
" 2>/dev/null || true

    # Prompt to display full JSON response
    if prompt_for_json_display; then
        display_output "Full /route Response" "$route_file" 400 45
    fi

    echo -e "${GREEN}${BOLD}  ✓ Chapter $CHAPTER complete.${RESET}"
    prompt_next_page
}

# ─── Chapter 6: Redis Streams ────────────────────────────────────────────────

chapter_06_redis_streams() {
    [[ -n "$TARGET_CHAPTER" ]] && CHAPTER="$TARGET_CHAPTER" || CHAPTER=$((CHAPTER + 1))
    [[ -n "$TARGET_CHAPTER" && "$TARGET_CHAPTER" != "6" ]] && return
    show_progress "$CHAPTER" "Redis Streams"
    print_chapter_header "$CHAPTER" "REDIS STREAMS — EXACTLY-ONCE MESSAGE PROCESSING"

    local TASK_PROMPT='How does Redis Streams handle exactly-once message processing with consumer groups? Need stream architecture, ack patterns, and dead letter queue handling for a production system.'

    print_scenario "Your event-driven architecture needs reliable messaging. You ask your AI assistant:"
    echo -e "  ${DIM}\"${TASK_PROMPT}\"${RESET}"

    # FIX: Use jq for safe JSON escaping
    local route_file="$TEMP_DIR/ch06_route.json"
    curl -s --max-time 15 -X POST "${API_URL}/route" \
        -H "Content-Type: application/json" \
        -d "$(jq -n --arg task "$TASK_PROMPT" '{task: $task, constraints: {maxSkills: 5}}')" > "$route_file" 2>/dev/null || true

    echo ""; echo -e "${WHITE}${BOLD}  Top matched skills:${RESET}"
    python3 -c "
import sys,json
try:
    with open('$route_file') as f:
        d=json.load(f)
except (json.JSONDecodeError, FileNotFoundError, ValueError):
    print('  ${RED}Error: Invalid or empty JSON response${RESET}')
    exit(1)
b='\033[1m';g='\033[32m';r='\033[0m';d_='\033[2m'
conf = d.get('confidence','?')
lat = d.get('latencyMs','?')
strat = d.get('executionPlan',{}).get('strategy','?')
print(f'  Confidence: {b}{g}{conf}{r}  |  Latency: {b}{lat}ms{r}  |  Strategy: {b}{strat}{r}')
for i,s in enumerate(d.get('selectedSkills',[])[:5],1):
    medals=['\U0001F947','\U0001F948','\U0001F949']
    icon=medals[i-1] if i<=3 else str(i)+'.'
    score=s.get('score',0)
    print(f'  {icon} {b}{s[\"name\"]}{r}  score={g}{score:.4f}{r}')
    reason = s.get('reasoning','')
    if reason: print(f'     {d_}{reason[:100]}...{r}')
" 2>/dev/null || true

    # Prompt to display full JSON response
    if prompt_for_json_display; then
        display_output "Full /route Response" "$route_file" 400 45
    fi

    echo -e "${GREEN}${BOLD}  ✓ Chapter $CHAPTER complete.${RESET}"
    prompt_next_page
}

# ─── Chapter 7: OpenCode Integration (Live Run) ──────────────────────────────

chapter_07_opencode_integration() {
    [[ -n "$TARGET_CHAPTER" ]] && CHAPTER="$TARGET_CHAPTER" || CHAPTER=$((CHAPTER + 1))
    [[ -n "$TARGET_CHAPTER" && "$TARGET_CHAPTER" != "7" ]] && return
    show_progress "$CHAPTER" "OpenCode Live Run"
    print_chapter_header "$CHAPTER" "LIVE OPENCODE EXECUTION — Like the 'ai' command"

    if [[ "${SKIP_OPENCODE:-false}" == "true" ]]; then
        echo -e "  ${YELLOW}⚠ Skipped (--skip-opencode flag set)${RESET}"
        echo -e "${GREEN}${BOLD}  ✓ Chapter $CHAPTER skipped.${RESET}"
        prompt_next_page
        return
    fi

    if ! command -v opencode &>/dev/null; then
        echo -e "  ${RED}✗ opencode not found. Skip with --skip-opencode.${RESET}"
        echo -e "${GREEN}${BOLD}  ✓ Chapter $CHAPTER skipped.${RESET}"
        prompt_next_page
        return
    fi

    local TASK_PROMPT='How does Redis Streams handle exactly-once message processing with consumer groups? Need stream architecture, ack patterns, and dead letter queue handling for a production system.'

    echo -e "${WHITE}${BOLD}  Launching OpenCode with MCP bridge...${RESET}"
    echo ""
    echo -e "  ${DIM}\"${TASK_PROMPT}\"${RESET}"
    echo ""

    # ─── Inline ai() mechanics: FIFO-based stderr streaming + glow rendering ───

    local session_dir="$HOME/.ai-sessions"
    mkdir -p "$session_dir"
    local session_file="$session_dir/shell-ch7-$$"

    if [[ "$(uname)" == "Darwin" ]]; then
        _ai_mktemp() { mktemp "${HOME}/tmp.XXXXXXXXXX"; }
        _ai_mktemp_u() { mktemp -u "${HOME}/tmp.XXXXXXXXXX"; }
    else
        _ai_mktemp() { mktemp -p "$HOME"; }
        _ai_mktemp_u() { mktemp -u -p "$HOME"; }
    fi

    local instructions="Be concise. Output to stdout only. Never create or modify files unless I explicitly ask to save."
    local outfile errfile fifo
    outfile=$(_ai_mktemp)
    errfile=$(_ai_mktemp_u)
    fifo=$(_ai_mktemp_u)
    mkfifo "$fifo"

    trap 'rm -f "$outfile" "$errfile" "$fifo"; unset -f _ai_mktemp _ai_mktemp_u 2>/dev/null; trap - INT RETURN' INT RETURN

    # Reader: streams stderr as a single repainting line on screen, also captures to errfile
    local reader_pid
    while IFS= read -r line; do
        echo -ne "\r\033[K\033[90m${line:0:80}\033[0m" 1>&2
        echo "$line" >> "$errfile"
    done < "$fifo" &
    reader_pid=$!

    # ─── Session persistence (matches ai() function behavior) ──────────────────
    local session_flag=()
    if [[ -f "$session_file" ]]; then
        session_flag=(--session "$(cat "$session_file")")
    fi

    # Run opencode — mirrors ai() command exactly:
    #   • Single --model flag (no conflict with -m)
    #   • No timeout wrapper (avoids FIFO race conditions)
    #   • Session persistence for multi-turn context
    # Pass --model only when explicitly specified via env var or CLI flag
    local opencode_cmd=("opencode" "run" "--print-logs")
    [[ -n "${MODEL:-}" ]] && opencode_cmd+=("--model" "$MODEL")
    opencode_cmd+=("${session_flag[@]}" "$instructions: $TASK_PROMPT")
    
    "${opencode_cmd[@]}" > "$outfile" 2> "$fifo"
    local rc=$?

    wait "$reader_pid" 2>/dev/null || true
    rm -f "$fifo"

    # Clear any spurious exit code from FIFO/reader handling (reader may already be dead)
    rc=0

    # Persist session ID for next run (matches ai() behavior)
    local sid
    sid=$(grep -o 'id=ses_[^ ]*' "$errfile" | head -1 | cut -d= -f2)
    if [[ -n "$sid" ]]; then
        echo "$sid" > "$session_file"
    fi

    # Clear the repainting status line
    echo -ne "\r\033[K" 1>&2

    # Render markdown response with glow (exactly like ai() function)
    if [[ -s "$outfile" ]]; then
        glow "$outfile"
    else
        echo -e "\n${DIM}(no stdout output)${RESET}" 1>&2
        tail -n 20 "$errfile" 1>&2
    fi

    rm -f "$outfile" "$errfile"
    unset -f _ai_mktemp _ai_mktemp_u
    trap - INT RETURN
    tput sgr0

    echo ""
    echo -e "${GREEN}${BOLD}  ✓ Chapter $CHAPTER complete.${RESET}"
    prompt_next_page
}

# ─── Chapter 8: Access Log Review ─────────────────────────────────────────────

chapter_08_access_log_review() {
    [[ -n "$TARGET_CHAPTER" ]] && CHAPTER="$TARGET_CHAPTER" || CHAPTER=$((CHAPTER + 1))
    [[ -n "$TARGET_CHAPTER" && "$TARGET_CHAPTER" != "8" ]] && return
    show_progress "$CHAPTER" "Access Log"
    print_chapter_header "$CHAPTER" "ROUTING HISTORY — What Was Matched Today?"

    local l; l=$(curl -s --max-time 10 "$API_URL/access-log" 2>/dev/null || echo '{"totalRequests":0,"entries":[]}')
    local access_file="$TEMP_DIR/ch08_access.json"
    echo "$l" > "$access_file"

    local total entries_count
    total=$(json_extract "$l" "totalRequests"); : "${total:=0}"
    entries_count=$(python3 -c "import sys,json; print(len(json.loads(sys.stdin.read()).get('entries',[])))" <<< "$l" 2>/dev/null || echo "0")

    echo -e "  Total requests: ${BOLD}${total}${RESET}  |  Entries: ${BOLD}${entries_count}${RESET}"
    echo ""

    if [[ "${entries_count:-0}" -gt 0 ]]; then
        # ─── SECTION 1: Recent routing decisions with pagination ─────────────────
        echo -e "${CYAN}${BOLD}  ┌─ SECTION 1: Recent Routing Decisions${RESET}"
        echo -e "${DIM}  │${RESET}"
        
        # Extract and paginate routing decisions
        local routing_data="$TEMP_DIR/routing_decisions.txt"
        python3 - "$access_file" > "$routing_data" << 'ENDPYTHON'
import sys,json
with open(sys.argv[1]) as f:
    d=json.load(f)
b='\033[1m';g='\033[32m';r='\033[0m';y='\033[33m';rd='\033[31m';d_='\033[2m'
entries=list(reversed(d.get('entries',[])))
for i,e in enumerate(entries):
    ts=e.get('timestamp','?')[:16]
    t=e.get('task','?')[:60]
    s=e.get('topSkill','?')
    c=e.get('confidence',0)
    m=e.get('totalMatches','?')
    icon='\u2713' if c>0.5 else ('\u26a0' if c>0.25 else '\u2717')
    col=g if c>0.5 else (y if c>0.25 else rd)
    output=f'  {icon} [{ts}] {col}{s}{r} conf={c:.2f} matches={m}\n'
    output+=f'      task: "{t}"...'
    print(output)
    if i < len(entries) - 1:
        print()
ENDPYTHON
        
        local route_lines; route_lines=$(wc -l < "$routing_data" 2>/dev/null || echo "0")
        
        # Show first 5 entries without pause
        head -n 10 "$routing_data" | colorize_json
        
        # If more than 8 entries, offer pagination
        if [[ "$route_lines" -gt 10 ]]; then
            echo ""
            if [[ ! -t 1 ]]; then
                # In non-interactive mode, show all routing data automatically
                tail -n +11 "$routing_data" | colorize_json
            else
                echo -e "  ${DIM}│ ▼ More routing decisions available (${route_lines} lines total)${RESET}"
                echo -e "  ${CYAN}  │ Press ENTER for more, Q to skip${RESET}"
                read -r -t 60 user_input < /dev/tty 2>/dev/null || user_input=""

                if [[ "${user_input,,}" != "q" ]]; then
                    echo ""
                    tail -n +11 "$routing_data" | colorize_json
                fi
            fi
        fi
        echo -e "  ${DIM}  │${RESET}"
        
        # ─── SECTION 2: Confidence distribution ──────────────────────────────────
        echo -e "${CYAN}${BOLD}  ├─ SECTION 2: Confidence Distribution${RESET}"
        echo -e "${DIM}  │${RESET}"
        python3 -c "
import sys,json
d=json.load(sys.stdin)
c=[e.get('confidence',0) for e in d.get('entries',[])]
if not c: print('  │ No entries.'); exit()
hi=sum(1 for x in c if x>0.5); mid=sum(1 for x in c if .25<x<=.5); lo=len(c)-hi-mid; n=len(c)
avg=sum(c)/n if n else 0
g='\033[32m';y='\033[33m';rd='\033[31m';r='\033[0m';d_='\033[2m'
print(f'  │ Total: {n} requests')
print(f'  │ High (>50%): {hi:>3d}/{n} ({hi/n*100:.0f}%)   {g}\u25cf{r}')
print(f'  │ Mid  (25-50%):    {mid:>3d}/{n} ({mid/n*100:.0f}%)   {y}\u25cf{r}')
print(f'  │ Low  (\u226425%):      {lo:>3d}/{n} ({lo/n*100:.0f}%)   {rd}\u25cf{r}')
print(f'  │ Average: {avg:.2f}')
" < "$access_file" 2>/dev/null || true
        echo -e "  ${DIM}  │${RESET}"
        
        # ─── SECTION 3: Top routed skills with pagination ───────────────────────
        echo -e "${CYAN}${BOLD}  ├─ SECTION 3: Top Routed Skills${RESET}"
        echo -e "${DIM}  │${RESET}"
        
        local skills_data="$TEMP_DIR/top_skills.txt"
        python3 - "$access_file" > "$skills_data" << 'ENDPYTHON'
import sys,json; from collections import Counter
with open(sys.argv[1]) as f:
    d=json.load(f)
b='\033[1m';r='\033[0m'
c=Counter(e.get('topSkill','?') for e in d.get('entries',[]))
for s,n in c.most_common(20):
    print(f'  {b}{s}{r}  {n:>3d}x')
ENDPYTHON
        
        local skills_lines; skills_lines=$(wc -l < "$skills_data" 2>/dev/null || echo "0")
        
        # Show first 5 skills
        head -n 5 "$skills_data" | colorize_json
        
        # If more than 8 skills, offer pagination
        if [[ "$skills_lines" -gt 5 ]]; then
            echo ""
            if [[ ! -t 1 ]]; then
                # In non-interactive mode, show all skills automatically
                tail -n +6 "$skills_data" | colorize_json
            else
                echo -e "  ${DIM}  │ ▼ More skills available (${skills_lines} total)${RESET}"
                echo -e "  ${CYAN}  │ Press ENTER to see all skills, Q to skip${RESET}"
                read -r -t 60 user_input < /dev/tty 2>/dev/null || user_input=""

                if [[ "${user_input,,}" != "q" ]]; then
                    echo ""
                    tail -n +6 "$skills_data" | colorize_json
                fi
            fi
        fi
        echo -e "  ${DIM}  │${RESET}"
        
        # ─── SECTION 4: Full JSON response with pagination ──────────────────────
        echo -e "${CYAN}${BOLD}  └─ SECTION 4: Full /access-log JSON Response${RESET}"
        echo ""
        display_output "Complete Access Log (JSON)" "$access_file" 400 45
        
        # Cleanup
        rm -f "$routing_data" "$skills_data"
    else
        echo -e "  ${YELLOW}⚠ No history yet — access log populates as the router is used.${RESET}"
    fi

    echo -e "${GREEN}${BOLD}  ✓ Chapter $CHAPTER complete.${RESET}"
    prompt_next_page
}

# ─── Chapter 9: Skill Compression Deep Dive ───────────────────────────────────

chapter_09_compression_deep_dive() {
    [[ -n "$TARGET_CHAPTER" ]] && CHAPTER="$TARGET_CHAPTER" || CHAPTER=$((CHAPTER + 1))
    [[ -n "$TARGET_CHAPTER" && "$TARGET_CHAPTER" != "9" ]] && return
    show_progress "$CHAPTER" "Compression Deep Dive"
    print_chapter_header "$CHAPTER" "SKILL COMPRESSION DEEP DIVE — Token Savings & Side-by-Side"
    print_scenario "How much context can you save? The router compresses skills on-the-fly. Let's see what's gained (and lost) at each compression level."

    LOCAL_SKILL_NAME="kubernetes-deployment"

    # 1) Fetch the skill at ALL three compression levels plus uncompressed
    print_key_point "Fetching '${LOCAL_SKILL_NAME}' at 4 compression levels..." "${CYAN}"
    
    local raw_file="$TEMP_DIR/ch09_raw.json"
    local brief_file="$TEMP_DIR/ch09_brief.json"
    local moderate_file="$TEMP_DIR/ch09_moderate.json"
    local detailed_file="$TEMP_DIR/ch09_detailed.json"
    local headers_file="$TEMP_DIR/ch09_headers.txt"

    # NO compression (default)
    curl -s --max-time 10 "$API_URL/skill/${LOCAL_SKILL_NAME}" > "$raw_file"
    # Brief compression  
    curl -s --max-time 10 -D "$TEMP_DIR/ch09_headers_brief.txt" "$API_URL/skill/${LOCAL_SKILL_NAME}?compression=brief" > "$brief_file"
    # Moderate compression
    curl -s --max-time 10 -D "$TEMP_DIR/ch09_headers_moderate.txt" "$API_URL/skill/${LOCAL_SKILL_NAME}?compression=moderate" > "$moderate_file"
    # Detailed compression
    curl -s --max-time 10 -D "$TEMP_DIR/ch09_headers_detailed.txt" "$API_URL/skill/${LOCAL_SKILL_NAME}?compression=detailed" > "$detailed_file"

    # 2) Show sizes and savings in a table
    local raw_size brief_size moderate_size detailed_size
    raw_size=$(wc -c < "$raw_file" | tr -d ' ')
    brief_size=$(wc -c < "$brief_file" | tr -d ' ')
    moderate_size=$(wc -c < "$moderate_file" | tr -d ' ')
    detailed_size=$(wc -c < "$detailed_file" | tr -d ' ')

    local brief_pct moderate_pct detailed_pct
    brief_pct=$(python3 -c "print(f'{(1 - ${brief_size}/${raw_size})*100:.0f}%')")
    moderate_pct=$(python3 -c "print(f'{(1 - ${moderate_size}/${raw_size})*100:.0f}%')")
    detailed_pct=$(python3 -c "print(f'{(1 - ${detailed_size}/${raw_size})*100:.0f}%')")

    echo ""
    print_colored_two_col "Compression Level" "Bytes | Token Savings | Headers"
    print_two_col \
"  none (raw)
  brief           
  moderate         
  detailed         " \
"  ${raw_size} bytes  —  0% saved    —  no headers
  ${brief_size} bytes  —  ${brief_pct} saved  —  X-Compression-*, X-Compression-Percent, X-Compression-Version
  ${moderate_size} bytes  —  ${moderate_pct} saved  —  X-Compression-*, X-Compression-Percent, X-Compression-Version
  ${detailed_size} bytes  —  ${detailed_pct} saved  —  X-Compression-*, X-Compression-Percent, X-Compression-Version"

    # 3) Extract and display compression headers for 'brief'
    echo ""
    print_key_point "Response headers for compression=brief:" "${YELLOW}"
    grep -i 'x-compression' "$TEMP_DIR/ch09_headers_brief.txt" 2>/dev/null || echo "  (no compression headers found)"
    echo ""
    print_key_point "Response headers for compression=moderate:" "${YELLOW}"
    grep -i 'x-compression' "$TEMP_DIR/ch09_headers_moderate.txt" 2>/dev/null || echo "  (no compression headers found)"
    echo ""
    print_key_point "Response headers for compression=detailed:" "${YELLOW}"
    grep -i 'x-compression' "$TEMP_DIR/ch09_headers_detailed.txt" 2>/dev/null || echo "  (no compression headers found)"

    # 4) Show the compression level table from COMPRESSION.md
    echo ""
    print_key_point "Compression Level Reference:" "${WHITE}"
    echo ""
    cat << 'COMPTABLE'
  Level | What Gets Removed              | Approx Savings
  ──────┼────────────────────────────────┼──────────────
  0     | No compression                 |  0%
  1     | Remove blank lines             |  5%
  2     | Remove When to Use section     | 12%
  3     | Remove When NOT to Use         | 18%
  4     | Collapse Core Workflow         | 28%
  5     | Remove related-skills table    | 35%
  6     | Remove markdown formatting     | 42%
  7     | Remove code examples           | 55%
  8     | Abbreviate section names       | 68%
  9     | Single block                   | 75%
  10+   | Summary only                   | 85%
COMPTABLE

    print_key_point "API mapping: detailed→level2 (conservative), moderate→level5 (balanced), brief→level8 (aggressive)" "${DIM}"

    # 5) Show actual content differences via diff
    echo ""
    print_key_point "What gets compressed away? (diff -u uncompressed vs brief):" "${YELLOW}"
    diff -u "$raw_file" "$brief_file" 2>/dev/null | head -40 || echo "  (diff not available)"
    
    # Show section headers present in raw vs brief
    echo ""
    print_key_point "Section headers preserved vs removed:" "${CYAN}"
    print_two_col \
"${BOLD}Raw (uncompressed) sections${RESET}" \
"${BOLD}Brief (compressed) sections${RESET}"
    # Extract section headers (## or ###) from each
    local raw_sections brief_sections
    raw_sections=$(grep -E '^## ' "$raw_file" 2>/dev/null || echo "  (none)")
    brief_sections=$(grep -E '^## ' "$brief_file" 2>/dev/null || echo "  (none)")
    paste <(echo "$raw_sections") <(echo "$brief_sections") 2>/dev/null | while IFS=$'\t' read -r r b; do
        if [ "$r" = "$b" ]; then
            printf "  \033[32m✓\033[0m %-40s │ \033[32m✓\033[0m %s\n" "$r" "$b"
        else
            printf "  \033[31m✗\033[0m %-40s │ \033[33m—\033[0m %s\n" "$r" "${b:-  (removed)}"
        fi
    done

    # Show tail of each (where content differs)
    echo ""
    print_key_point "Content body (last 10 lines of each):" "${CYAN}"
    print_two_col \
"${BOLD}uncompressed (tail)${RESET}" \
"${BOLD}brief (tail)${RESET}"
    paste <(tail -n 10 "$raw_file") <(tail -n 10 "$brief_file") | while IFS=$'\t' read -r r b; do
        printf "  %-45s │ %s\n" "$r" "$b"
    done

    # 6) Fetch /metrics to show compression stats
    echo ""
    print_key_point "Compression engine stats (GET /metrics):" "${CYAN}"
    local metrics_file="$TEMP_DIR/ch09_metrics.json"
    curl -s --max-time 10 "$API_URL/metrics" > "$metrics_file" 2>/dev/null || echo '{}' > "$metrics_file"

    python3 -c "
import sys,json
try:
    with open('$metrics_file') as f: d=json.load(f)
except: print('  Could not parse metrics'); exit(0)
c = d.get('compression',{})
b='\033[1m';g='\033[32m';r='\033[0m';y='\033[33m'
print(f'  {b}Total Operations:{r}       {c.get(\"totalOperations\",0)}')
op = c.get('totalOperations',0)
if op > 0:
    print(f'  {b}Successful:{r}            {g}{c.get(\"successfulCompressions\",0)}{r}')
    print(f'  {b}Failed:{r}               {y}{c.get(\"failedCompressions\",0)}{r}')
print(f'  {b}Cache Hits:{r}            {c.get(\"cacheHits\",0)}')
print(f'  {b}Cache Misses:{r}          {c.get(\"cacheMisses\",0)}')
print(f'  {b}Total Tokens Saved:{r}    {c.get(\"totalTokensSaved\",0)}')
print(f'  {b}Average Compression:{r}   {c.get(\"averageCompressionPercent\",0)}%')
print(f'  {b}Cache Size:{r}            {c.get(\"currentCacheSizeBytes\",0)}/{c.get(\"maxCacheSizeBytes\",0)} bytes')
" 2>/dev/null || true

    # Show full metrics JSON on request
    if prompt_for_json_display; then
        display_output "Full /metrics Response" "$metrics_file" 200
    fi

    echo ""
    print_key_point "Key takeaway: brief compression saved ${brief_pct} (${brief_size} vs ${raw_size} bytes). Use compression when injecting large skills into context windows to preserve tokens for the actual conversation." "${GREEN}"

    echo -e "${GREEN}${BOLD}  ✓ Chapter $CHAPTER complete.${RESET}"
    prompt_next_page
}

# ─── Chapter 10: Markdown Link Following & Web Content Extraction ─────────────

chapter_10_link_following() {
    [[ -n "$TARGET_CHAPTER" ]] && CHAPTER="$TARGET_CHAPTER" || CHAPTER=$((CHAPTER + 1))
    [[ -n "$TARGET_CHAPTER" && "$TARGET_CHAPTER" != "10" ]] && return
    show_progress "$CHAPTER" "Link Following"
    print_chapter_header "$CHAPTER" "MARKDOWN LINK FOLLOWING & WEB CONTENT EXTRACTION"
    print_scenario "Skills can embed web content via markdown links. The router resolves those URLs, fetches the content, compresses it, and injects it — turning documentation links into live context."

    # 1) Show current link-following config
    print_key_point "Current link-following configuration:" "${CYAN}"
    local cfg_file="$TEMP_DIR/ch10_config.json"
    curl -s --max-time 10 "$API_URL/config/link-following" > "$cfg_file" 2>/dev/null || echo '{}' > "$cfg_file"

    python3 -c "
import sys,json
try:
    with open('$cfg_file') as f: d=json.load(f)
except: print('  Could not parse config'); exit(0)
b='\033[1m';g='\033[32m';r='\033[0m';y='\033[33m';d_='\033[2m'
print(f'  {b}link_following_enabled:{r}  {g}{d.get(\"enabled\",\"?\")}{r}')
print(f'  {b}max_depth:{r}              {d.get(\"maxDepth\",\"?\")}')
print(f'  {b}allow_external_links:{r}   {d.get(\"allowExternalLinks\",\"?\")}')
print(f'  {b}max_external_size_kb:{r}   {d.get(\"maxExternalSizeKb\",\"?\")}')
print(f'  {b}resolution_mode:{r}        {y}{d.get(\"resolutionMode\",\"?\")}{r}')
print(f'  {b}compression_mode:{r}       {d.get(\"compressionMode\",\"?\")}')
print(f'  {b}semantic_top_k:{r}         {d.get(\"semanticTopK\",\"?\")}')
print(f'  {b}semantic_threshold:{r}     {d.get(\"semanticSimilarityThreshold\",\"?\")}')
print(f'  {b}js_rendering_enabled:{r}   {d.get(\"jsRenderingEnabled\",\"?\")}')
print(f'  {b}js_render_timeout:{r}      {d.get(\"jsRenderTimeoutMs\",\"?\")}ms')
" 2>/dev/null || true

    # Show full config on request
    if prompt_for_json_display; then
        display_output "Full Link-Following Config" "$cfg_file" 200
    fi

    # 2) Show the resolution modes
    echo ""
    print_key_point "Resolution modes:" "${WHITE}"
    cat << 'RESOLUTION'
  ┌─────────────────────────────────────────────────────────────────────┐
  │  Resolution Mode  │  Behavior                                       │
  ├───────────────────┼─────────────────────────────────────────────────┤
  │  inline           │  Fetch URL content and insert directly          │
  │  semantic         │  Fetch → chunk → embed → top-k most relevant   │
  │  compressed       │  Fetch → chunk → compress to brief (~2000 chars)│
  └───────────────────┴─────────────────────────────────────────────────┘
RESOLUTION

    # 3) Show the pipeline diagram
    echo ""
    print_key_point "Link-following pipeline:" "${CYAN}"
    cat << 'PIPELINE'
  [Markdown Link Resolver]
       │ resolves [text](url) URLs
       ▼
  [Content Fetcher]
       │ HTTPS GET (with optional Puppeteer JS rendering)
       ▼
  [HTML → Text Transformation]
       │ heading-aware chunking
       ▼
  [External Content Chunker]
       │ optional: chunk into headings + sections
       ▼
  [External Content Embedder]
       │ optional: semantic embedding + similarity search (top_k=10, threshold=0.5)
       ▼
  [Content Compressor]
       │ compress to ~2000 (brief) or ~5000 (moderate) chars
       ▼
  [Reference Section Injection]
       │ formatted as: ## References from <url>
PIPELINE

    # 4) Show path traversal protection
    echo ""
    print_key_point "Path traversal protection:" "${YELLOW}"
    cat << 'TRAVERSAL'
  isSafeLocalPath() ensures resolved paths stay within the skill's base directory.
  Symlinks are NOT followed. Any path containing ".." that escapes the skill root
  is rejected with a 403. This prevents malicious SKILL.md files from reading
  arbitrary filesystem paths via markdown link resolution.
TRAVERSAL

    # 5) Show current link-following stats from metrics
    echo ""
    print_key_point "Link-following metrics from /metrics:" "${CYAN}"
    local metrics_file="$TEMP_DIR/ch10_metrics.json"
    curl -s --max-time 10 "$API_URL/metrics" > "$metrics_file" 2>/dev/null || echo '{}' > "$metrics_file"
    
    python3 -c "
import sys,json
try:
    with open('$metrics_file') as f: d=json.load(f)
except: print('  Could not parse metrics'); exit(0)
# Try to extract link-following stats if they exist
lf = d.get('linkFollowing', d.get('link_following', {}))
if lf:
    for k,v in lf.items():
        print(f'  • {k}: {v}')
else:
    print('  (link-following metrics not tracked separately)')
    print('  Check /metrics for any link resolution data.')
" 2>/dev/null || true

    # 6) Optional: show demo of updating config
    echo ""
    print_key_point "Try it yourself — update a config field:" "${GREEN}"
    cat << 'UPDATECONFIG'
  curl -X POST http://localhost:3000/config/link-following \
    -H "Content-Type: application/json" \
    -d '{"max_depth": 5, "compression_mode": "brief"}'
UPDATECONFIG

    echo ""
    print_key_point "Key takeaway: The link-following system turns static documentation links into live, compressed, context-relevant content — automatically fetched, chunked, embedded, and injected into the skill's reference section." "${GREEN}"

    echo -e "${GREEN}${BOLD}  ✓ Chapter $CHAPTER complete.${RESET}"
    prompt_next_page
}

# ─── Summary ──────────────────────────────────────────────────────────────────

print_summary() {
    print_chapter_header "$CHAPTER" "ALL CHAPTERS COMPLETE"
    echo ""
    echo -e "${WHITE}${BOLD}  What we ran live:${RESET}\n"

    local chapters=(
        "Health & Stats      — docker ps, GET /health, stats with real numbers"
        "K8s Monitoring      — POST /route: Kubernetes + Prometheus + Grafana monitoring"
        "VWAP Trading        — POST /route: VWAP execution algorithm for crypto"
        "Distributed Tracing — POST /route: OpenTelemetry + Jaeger microservices"
        "Auth Patterns       — POST /route: OAuth2 vs OIDC vs JWT comparison"
        "Redis Streams       — POST /route: Exactly-once message processing"
        "OpenCode Live Run   — FIFO streaming logs + glow markdown rendering (ai() style)"
        "Access Log Review   — GET /access-log routing history and confidence stats"
        "Compression Demo     — GET /skill?compression=brief|moderate|detailed with savings"
        "Link Following       — GET /config/link-following pipeline and extraction flow"
    )

    for i in "${!chapters[@]}"; do
        if [[ $((i+1)) -le "$CHAPTER" ]]; then
            echo -e "  ${GREEN}✓${RESET} Chapter $((i+1)): ${chapters[$i]}"
        else
            echo -e "  ${DIM}○${RESET} Chapter $((i+1)): ${chapters[$i]} (not reached)"
        fi
    done

    echo ""
    [[ "$CHAPTER" -eq "$TOTAL_CHAPTERS" ]] && \
        print_key_point "${GREEN}${BOLD}All ${TOTAL_CHAPTERS} chapters executed with real live output!${RESET}" || \
        print_key_point "Ran ${CHAPTER}/${TOTAL_CHAPTERS}. Use --chapter N to jump ahead."

    echo ""
    echo -e "${BOLD}$(printf '═%.0s' {1..78})${RESET}"
    echo ""
    echo -e "${DIM}Navigation during walkthrough: [ENTER] next | [P] previous | [Q] quit${RESET}"
}

# ─── Main ──────────────────────────────────────────────────────────────────────

main() {
    echo ""
    echo -e "${CYAN}${BOLD}"
    echo "  ╔══════════════════════════════════════════════════════════════╗"
    echo "  ║   AGENT SKILL ROUTER — Using OpenCode as AI Assistant      ║"
    echo "  ║   Across Domains: K8s, Trading, Tracing, Auth, Redis       ║"
    echo "  ╚══════════════════════════════════════════════════════════════╝"
    echo -e "${RESET}"

    check_dependencies
    check_api

    # If targeting a single chapter, just run it and exit
    if [[ -n "$TARGET_CHAPTER" ]]; then
        case "$TARGET_CHAPTER" in
            1) chapter_01_health_check ;;
            2) chapter_02_prometheus_k8s ;;
            3) chapter_03_vwap_trading ;;
            4) chapter_04_distributed_tracing ;;
            5) chapter_05_auth_patterns ;;
            6) chapter_06_redis_streams ;;
            7) chapter_07_opencode_integration ;;
            8) chapter_08_access_log_review ;;
            9) chapter_09_compression_deep_dive ;;
            10) chapter_10_link_following ;;
        esac
        print_summary
        return 0
    fi

    # Full walkthrough with pagination
    chapter_01_health_check
    chapter_02_prometheus_k8s
    chapter_03_vwap_trading
    chapter_04_distributed_tracing
    chapter_05_auth_patterns
    chapter_06_redis_streams
    chapter_07_opencode_integration
    chapter_08_access_log_review
    chapter_09_compression_deep_dive
    chapter_10_link_following

    print_summary
}

main "$@"
