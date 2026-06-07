#!/usr/bin/env bash
# ============================================================================
# Agent Skill Router — Using OpenCode as an AI Coding Assistant Across Domains
# ============================================================================
# Demonstrates how a developer asks their AI assistant (OpenCode + skill router)
# to solve problems in DIFFERENT technical domains, showing real skill routing
# for each task. All prompts are purely hypothetical knowledge questions.
#
# Usage:
#   ./api-walkthrough.sh              Walk through all 8 pages
#   ./api-walkthrough.sh --chapter N  Jump to page N directly (1-8)
#   ./api-walkthrough.sh --skip-opencode   Skip the OpenCode integration chapter
# ============================================================================

set -euo pipefail

readonly API_URL="http://localhost:3000"
TEMP_DIR=$(mktemp -d)
CHAPTER=0
TOTAL_CHAPTERS=8
TARGET_CHAPTER=""
SKIP_OPCODE=false

trap 'rm -rf "$TEMP_DIR"' EXIT

# ─── ANSI Colors ─────────────────────────────────────────────────────────────

BOLD="\e[1m" RED="\e[31m" GREEN="\e[32m" YELLOW="\e[33m"
CYAN="\e[36m" DIM="\e[2m" WHITE="\e[97m"
BG_CYAN="\e[46m" BG_GREEN="\e[42m" RESET="\e[0m"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --skip-opencode) SKIP_OPCODE=true; shift ;;
        --chapter) TARGET_CHAPTER="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
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
# Shows first 20 lines without pausing, then offers to continue if >100 lines total.
display_output() {
    local label="$1" file="$2" max_lines="${3:-100}"
    echo ""

    # If file is empty (0 bytes), report immediately
    if [[ ! -s "$file" ]]; then
        printf "  ${CYAN}  ┌── %s (empty)${RESET}\n" "$label"
        echo -e "  ${DIM}  │ (empty response)${RESET}"
        echo -e "  ${CYAN}  └──────────────────────────────────────${RESET}"
        return
    fi

    # Normalize single-line JSON to multi-line for display and correct line counting
    if [[ "$(wc -l < "$file")" -eq 0 ]]; then
        python3 -m json.tool < "$file" > "${file}.norm" 2>/dev/null && mv "${file}.norm" "$file" || true
    fi

    local count; count=$(wc -l < "$file")
    printf "  ${CYAN}  ┌── %s (${count} lines)${RESET}\n" "$label"

    if [[ "$count" -eq 0 ]]; then
        echo -e "  ${DIM}  │ (empty response)${RESET}"
    else
        # Always show first min(20, count) lines without pausing
        local show_first=20
        if [[ "$count" -lt "$show_first" ]]; then
            show_first=$count
            head -n "$show_first" "$file" | colorize_json
        else
            head -n "$show_first" "$file" | colorize_json
        fi

        # For genuinely massive output (>100 lines), paginate the rest
        if [[ "$count" -gt "$max_lines" ]]; then
            echo ""
            local remaining=$((count - show_first))
            echo -e "  ${DIM}─── [ ${count} lines total — showing first 20 above. Press ENTER/SPACE for more, Q to skip ] ───${RESET}"
            read -r -t 30 _ < /dev/tty 2>/dev/null || true

            echo ""
            tail -n +"$((show_first + 1))" "$file" | colorize_json
        fi
    fi

    echo -e "  ${CYAN}  └──────────────────────────────────────${RESET}"
}

# Display output directly from a variable (piped through temp file for colorize)
display_var_output() {
    local label="$1" content="$2" max_lines="${3:-100}"
    local tmpf="$TEMP_DIR/var_out_$$"
    echo "$content" > "$tmpf"
    display_output "$label" "$tmpf" "$max_lines"
    rm -f "$tmpf"
}

# Extract a JSON field value using python3
json_extract() {
    local json="$1" field="$2"
    if command -v python3 &>/dev/null; then
        echo "$json" | python3 -c "
import sys,json
try:
    d=json.loads(sys.stdin.read())
    for k in '$field'.split('.'): d=d[k]
    print(d)
except: print('?')
" 2>/dev/null || echo "?"
    else
        echo "?"
    fi
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

    local max=$(( ${#left_lines[@]} > ${#right_lines[@]} ? ${#left_lines[@]} : ${#right_lines[@]} ))
    local term_h; term_h=$(tput lines 2>/dev/null || echo 50)
    max=$((max > term_h - 18 ? term_h - 18 : max))

    for ((i=0; i<max && i<${#right_lines[@]}; i++)); do
        local l="${left_lines[$i]:-}"; local r="${right_lines[$i]:-}"
        printf "  %-45s │ %s\n" "$l" "$r"
    done
    echo ""
}

print_colored_two_col() {
    local left_title="$1" right_title="$2"
    printf "\n  ${GREEN}${BOLD}%-45s${DIM}│${RESET} ${CYAN}%s${RESET}\n" "$left_title" "$right_title"
}

# ─── Per-Chapter Pagination ────────────────────────────────────────────────────

page_output_simple() {
    local max_lines=${1:-40}

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

    echo ""
    echo -e "  ${DIM}─── [ ${count} lines, press ENTER/SPACE for more, Q to skip ] ───${RESET}"
    read -r -t 120 _ < /dev/tty 2>/dev/null || true
    cat "$tmpf"
    rm -f "$tmpf"
}

# ─── Pagination Navigation ────────────────────────────────────────────────────

prompt_next_page() {
    echo ""
    echo -e "${DIM}$(printf '─%.0s' {1..78})${RESET}"
    echo -e "${CYAN}${BOLD}  [ ${CHAPTER}/${TOTAL_CHAPTERS} ] Press ENTER for next chapter, or type: N[ext] / P[rev] / Q[uit]${RESET}"
    local input=""
    read -r -t 60 input < /dev/tty 2>/dev/null || input=$(echo)

    case "${input,,}" in
        n|next)   return 0 ;;
        p|prev)   goto_prev_page ;;
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
    [[ -n "$TARGET_CHAPTER" && "$TARGET_CHAPTER" != "1" ]] && return
    CHAPTER=$((CHAPTER + 1)); show_progress "$CHAPTER" "Health & Stats"
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

    echo -e "${GREEN}${BOLD}  ✓ Chapter $CHAPTER complete.${RESET}"
    prompt_next_page
}

# ─── Chapter 2: Prometheus/Kubernetes Monitoring ──────────────────────────────

chapter_02_prometheus_k8s() {
    [[ -n "$TARGET_CHAPTER" && "$TARGET_CHAPTER" != "2" ]] && return
    CHAPTER=$((CHAPTER + 1)); show_progress "$CHAPTER" "K8s Monitoring"
    print_chapter_header "$CHAPTER" "PROMETHEUS & KUBERNETES MONITORING"

    local TASK_PROMPT='How do I set up Kubernetes monitoring with Prometheus and Grafana for a production cluster? Need alerting rules and custom dashboards.'

    print_scenario "You need to monitor your K8s cluster. You ask your AI assistant:"
    echo -e "  ${DIM}\"${TASK_PROMPT}\"${RESET}"

    # Route the query — capture output for parsing + display
    local route_file="$TEMP_DIR/ch02_route.json"
    curl -s --max-time 15 -X POST "${API_URL}/route" \
        -H "Content-Type: application/json" \
        -d "{\"task\":\"${TASK_PROMPT}\",\"constraints\":{\"maxSkills\":5}}" > "$route_file" 2>/dev/null || true

    # Show parsed top matches
    echo ""; echo -e "${WHITE}${BOLD}  Top matched skills:${RESET}"
    python3 -c "
import sys,json
with open('$route_file') as f: d=json.load(f)
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
        print(f'     {d_}\\u2022{r} {e[:120]}')
" 2>/dev/null || true

    # Show full colorized JSON response
    display_output "Full /route Response" "$route_file"

    echo -e "${GREEN}${BOLD}  ✓ Chapter $CHAPTER complete.${RESET}"
    prompt_next_page
}

# ─── Chapter 3: VWAP Trading Algorithm ────────────────────────────────────────

chapter_03_vwap_trading() {
    [[ -n "$TARGET_CHAPTER" && "$TARGET_CHAPTER" != "3" ]] && return
    CHAPTER=$((CHAPTER + 1)); show_progress "$CHAPTER" "VWAP Trading"
    print_chapter_header "$CHAPTER" "IMPLEMENTING A VWAP EXECUTION ALGORITHM"

    local TASK_PROMPT='Implement a VWAP execution algorithm for large crypto orders with minimal market impact. Need position sizing, entry/exit points, and risk limits.'

    print_scenario "You're building a crypto trading system. You ask your AI assistant:"
    echo -e "  ${DIM}\"${TASK_PROMPT}\"${RESET}"

    # Route the query
    local route_file="$TEMP_DIR/ch03_route.json"
    curl -s --max-time 15 -X POST "${API_URL}/route" \
        -H "Content-Type: application/json" \
        -d "{\"task\":\"${TASK_PROMPT}\",\"constraints\":{\"maxSkills\":5}}" > "$route_file" 2>/dev/null || true

    # Show parsed results
    echo ""; echo -e "${WHITE}${BOLD}  Top matched skills:${RESET}"
    python3 -c "
import sys,json
with open('$route_file') as f: d=json.load(f)
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

    # Show full colorized JSON response
    display_output "Full /route Response" "$route_file"

    echo -e "${GREEN}${BOLD}  ✓ Chapter $CHAPTER complete.${RESET}"
    prompt_next_page
}

# ─── Chapter 4: Distributed Tracing ──────────────────────────────────────────

chapter_04_distributed_tracing() {
    [[ -n "$TARGET_CHAPTER" && "$TARGET_CHAPTER" != "4" ]] && return
    CHAPTER=$((CHAPTER + 1)); show_progress "$CHAPTER" "Distributed Tracing"
    print_chapter_header "$CHAPTER" "DESIGNING A DISTRIBUTED TRACING SYSTEM"

    local TASK_PROMPT='Design a distributed tracing system for microservices using OpenTelemetry and Jaeger. Need span propagation, baggage handling, and latency budgeting across service boundaries.'

    print_scenario "Your microservices are growing out of control. You ask your AI assistant:"
    echo -e "  ${DIM}\"${TASK_PROMPT}\"${RESET}"

    local route_file="$TEMP_DIR/ch04_route.json"
    curl -s --max-time 15 -X POST "${API_URL}/route" \
        -H "Content-Type: application/json" \
        -d "{\"task\":\"${TASK_PROMPT}\",\"constraints\":{\"maxSkills\":5}}" > "$route_file" 2>/dev/null || true

    echo ""; echo -e "${WHITE}${BOLD}  Top matched skills:${RESET}"
    python3 -c "
import sys,json
with open('$route_file') as f: d=json.load(f)
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

    display_output "Full /route Response" "$route_file"

    echo -e "${GREEN}${BOLD}  ✓ Chapter $CHAPTER complete.${RESET}"
    prompt_next_page
}

# ─── Chapter 5: Authentication Patterns ──────────────────────────────────────

chapter_05_auth_patterns() {
    [[ -n "$TARGET_CHAPTER" && "$TARGET_CHAPTER" != "5" ]] && return
    CHAPTER=$((CHAPTER + 1)); show_progress "$CHAPTER" "Auth Patterns"
    print_chapter_header "$CHAPTER" "SECURE AUTHENTICATION — OAUTH2 vs OIDC vs JWT"

    local TASK_PROMPT='What are the best practices for secure authentication — OAuth2 vs OIDC vs JWT? Need token lifecycle management, refresh strategies, and security considerations for a web app.'

    print_scenario "You're designing a new web app's auth system. You ask your AI assistant:"
    echo -e "  ${DIM}\"${TASK_PROMPT}\"${RESET}"

    local route_file="$TEMP_DIR/ch05_route.json"
    curl -s --max-time 15 -X POST "${API_URL}/route" \
        -H "Content-Type: application/json" \
        -d "{\"task\":\"${TASK_PROMPT}\",\"constraints\":{\"maxSkills\":5}}" > "$route_file" 2>/dev/null || true

    echo ""; echo -e "${WHITE}${BOLD}  Top matched skills:${RESET}"
    python3 -c "
import sys,json
with open('$route_file') as f: d=json.load(f)
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

    display_output "Full /route Response" "$route_file"

    echo -e "${GREEN}${BOLD}  ✓ Chapter $CHAPTER complete.${RESET}"
    prompt_next_page
}

# ─── Chapter 6: Redis Streams ────────────────────────────────────────────────

chapter_06_redis_streams() {
    [[ -n "$TARGET_CHAPTER" && "$TARGET_CHAPTER" != "6" ]] && return
    CHAPTER=$((CHAPTER + 1)); show_progress "$CHAPTER" "Redis Streams"
    print_chapter_header "$CHAPTER" "REDIS STREAMS — EXACTLY-ONCE MESSAGE PROCESSING"

    local TASK_PROMPT='How does Redis Streams handle exactly-once message processing with consumer groups? Need stream architecture, ack patterns, and dead letter queue handling for a production system.'

    print_scenario "Your event-driven architecture needs reliable messaging. You ask your AI assistant:"
    echo -e "  ${DIM}\"${TASK_PROMPT}\"${RESET}"

    local route_file="$TEMP_DIR/ch06_route.json"
    curl -s --max-time 15 -X POST "${API_URL}/route" \
        -H "Content-Type: application/json" \
        -d "{\"task\":\"${TASK_PROMPT}\",\"constraints\":{\"maxSkills\":5}}" > "$route_file" 2>/dev/null || true

    echo ""; echo -e "${WHITE}${BOLD}  Top matched skills:${RESET}"
    python3 -c "
import sys,json
with open('$route_file') as f: d=json.load(f)
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

    display_output "Full /route Response" "$route_file"

    echo -e "${GREEN}${BOLD}  ✓ Chapter $CHAPTER complete.${RESET}"
    prompt_next_page
}

# ─── Chapter 7: OpenCode Integration (Live Run) ──────────────────────────────

chapter_07_opencode_integration() {
    [[ -n "$TARGET_CHAPTER" && "$TARGET_CHAPTER" != "7" ]] && return
    CHAPTER=$((CHAPTER + 1)); show_progress "$CHAPTER" "OpenCode Run"
    print_chapter_header "$CHAPTER" "LIVE OpenCode RUN — Full stdout/stderr Output"

    if [[ "${SKIP_OPCODE:-false}" == "true" ]]; then
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

    local healthy; healthy=$(curl -s --max-time 3 "$API_URL/health" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))") || true
    [[ "$healthy" != "healthy" ]] && {
        echo -e "  ${RED}✗ API unhealthy.${RESET}"
        echo -e "${GREEN}${BOLD}  ✓ Chapter $CHAPTER skipped.${RESET}"
        prompt_next_page
        return
    }

    # Use the same Redis Streams prompt as chapter 6 for consistency
    local TASK_TEXT='How does Redis Streams handle exactly-once message processing with consumer groups? Need stream architecture, ack patterns, and dead letter queue handling.'

    echo -e "${WHITE}${BOLD}  Launching OpenCode with MCP bridge...${RESET}"
    echo ""
    echo -e "  ${DIM}Task being routed:${RESET}"
    echo -e "  \"${TASK_TEXT}\""
    echo ""
    echo -e "${DIM}  timeout 25 opencode run --print-logs --log-level DEBUG\\${RESET}"
    echo -e "${DIM}    --dangerously-skip-permissions -m opencode/big-pickle '${TASK_TEXT}'${RESET}"

    # Run OpenCode — capture stdout and stderr separately
    local so="$TEMP_DIR/oc_stdout.txt" se="$TEMP_DIR/oc_stderr.txt"
    timeout 25 opencode run --print-logs --log-level DEBUG \
        --dangerously-skip-permissions -m opencode/big-pickle \
        "$TASK_TEXT" > "$so" 2> "$se" || true

    # ─── Display stderr (MCP/Opencode logs) with colored log levels ──────────
    echo ""
    echo -e "${WHITE}${BOLD}  MCP Bridge Logs (stderr):${RESET}"
    local log_lines; log_lines=$(wc -l < "$se" 2>/dev/null || echo "0")

    if [[ "$log_lines" -gt 0 ]]; then
        # Log level statistics
        local info_c debug_c warn_c error_c mcp_c tool_c skill_c loaded_skills=""
        info_c=$(grep -c '\[INFO\]' "$se" 2>/dev/null || echo "0")
        debug_c=$(grep -c '\[DEBUG\]' "$se" 2>/dev/null || echo "0")
        warn_c=$(grep -cE '\[WARN\]|\[WARNING\]' "$se" 2>/dev/null || echo "0")
        error_c=$(grep -cE '\[ERROR\]|\[FAIL' "$se" 2>/dev/null || echo "0")
        mcp_c=$(grep -ciE 'mcp|route_to_skill|tool_call' "$se" 2>/dev/null || echo "0")
        tool_c=$(grep -c '\[TOOL' "$se" 2>/dev/null || echo "0")
        skill_c=$(grep -ciE 'SKILL ACCESS|ON-DEMAND|skill.loaded' "$se" 2>/dev/null || echo "0")

        # Try to extract loaded skill names
        loaded_skills=$(grep -oP '"loaded":\s*\[\K[^\]]+' "$se" 2>/dev/null | head -1 || true)
        [[ -z "$loaded_skills" ]] && loaded_skills="(none found in stderr)"

        # Also check MCP bridge log file directly
        local mcp_log="$HOME/.config/opencode/skill-router-mcp.log"
        if [[ -f "$mcp_log" ]]; then
            local mc_ski; mc_ski=$(grep -c 'SKILL ACCESS' "$mcp_log" 2>/dev/null || echo "0")
            skill_c=$((skill_c + mc_ski))
        fi

        # Log level stats line
        echo -e "  ${DIM}Lines: ${log_lines} │ ${GREEN}INFO:${info_c}${RESET} ${DIM}DEBUG:${debug_c}${RESET} ${YELLOW}WARN:${warn_c}${RESET} ${RED}ERROR:${error_c}${RESET}"
        echo -e "  ${DIM}MCP refs:${mcp_c} │ Tools:${tool_c} │ Skill events:${skill_c} │ Loaded: ${loaded_skills}${RESET}"
        echo ""

        # Display stderr line by line with colored log levels
        local displayed=0
        while IFS= read -r line; do
            [[ -z "$line" ]] && continue
            if echo "$line" | grep -q '\[DEBUG\]'; then
                printf "  ${DIM}%s${RESET}\n" "$line"
            elif echo "$line" | grep -q '\[INFO\]'; then
                printf "  ${GREEN}%s${RESET}\n" "$line"
            elif echo "$line" | grep -qE '\[WARN\]|WARNING'; then
                printf "  ${YELLOW}%s${RESET}\n" "$line"
            elif echo "$line" | grep -qE '\[ERROR\]|\[FAIL'; then
                printf "  ${RED}%s${RESET}\n" "$line"
            else
                printf "  %s\n" "$line"
            fi
            displayed=$((displayed + 1))

            # Paginate if output is very large (>100 lines total)
            if [[ "$displayed" -eq 20 && "$log_lines" -gt 100 ]]; then
                echo ""
                local remaining=$((log_lines - displayed))
                echo -e "  ${DIM}─── [ ${remaining} more log lines — press ENTER for more, Q to skip ] ───${RESET}"
                read -r -t 30 _ < /dev/tty 2>/dev/null || true
            fi
        done < "$se"

        # Show sample skill loading events if any
        local skill_lines; skill_lines=$(grep -iE 'SKILL ACCESS|ON-DEMAND|skill.loaded' "$se" 2>/dev/null || true)
        if [[ -n "$skill_lines" ]]; then
            echo ""
            echo -e "${WHITE}${BOLD}  Skill loading events:${RESET}"
            echo "$skill_lines" | head -5 | while IFS= read -r line; do
                echo -e "    ${DIM}│${RESET} $line"
            done
        fi

        # Show sample tool call events if any
        local tool_lines; tool_lines=$(grep '\[TOOL' "$se" 2>/dev/null || true)
        if [[ -n "$tool_lines" ]]; then
            echo ""
            echo -e "${WHITE}${BOLD}  Tool calls:${RESET}"
            echo "$tool_lines" | head -3 | while IFS= read -r line; do
                echo -e "    ${DIM}│${RESET} $line"
            done
        fi
    else
        echo -e "  ${DIM}(no MCP logs — opencode may not have used the router)${RESET}"
    fi

    # ─── Display stdout (AI response) in full ────────────────────────────────
    local sc; sc=$(cat "$so" 2>/dev/null || echo "")
    if [[ -n "$sc" ]]; then
        local resp_file="$TEMP_DIR/oc_stdout_display.txt"
        echo "$sc" > "$resp_file"
        echo ""
        echo -e "${WHITE}${BOLD}  AI Response (stdout):${RESET}"
        display_output "AI Response" "$resp_file"
        rm -f "$resp_file"
    else
        echo -e "  ${DIM}(no stdout output)${RESET}"
    fi

    # Summary of the opencode run
    local total_skill_events=0; : "${total_skill_events:=0}"
    if [[ -f "$se" ]]; then
        local se_lines; se_lines=$(wc -l < "$se" 2>/dev/null || echo "0")
        echo ""
        echo -e "${WHITE}${BOLD}  OpenCode run summary:${RESET}"
        echo -e "    Total log lines: ${BOLD}${log_lines}${RESET}"
        echo -e "    Skill matching events: ${BOLD}${skill_c}${RESET}"
        echo -e "    Tool calls: ${BOLD}${tool_c}${RESET}"
        echo -e "    MCP interactions: ${BOLD}${mcp_c}${RESET}"
    fi

    rm -f "$so" "$se"
    echo -e "${GREEN}${BOLD}  ✓ Chapter $CHAPTER complete.${RESET}"
    prompt_next_page
}

# ─── Chapter 8: Access Log Review ─────────────────────────────────────────────

chapter_08_access_log_review() {
    [[ -n "$TARGET_CHAPTER" && "$TARGET_CHAPTER" != "8" ]] && return
    CHAPTER=$((CHAPTER + 1)); show_progress "$CHAPTER" "Access Log"
    print_chapter_header "$CHAPTER" "ROUTING HISTORY — What Was Matched Today?"

    local l; l=$(curl -s --max-time 10 "$API_URL/access-log" 2>/dev/null || echo '{"totalRequests":0,"entries":[]}')
    local access_file="$TEMP_DIR/ch08_access.json"
    echo "$l" > "$access_file"

    local total entries_count
    total=$(json_extract "$l" "totalRequests"); : "${total:=?}"
    entries_count=$(python3 -c "import sys,json; print(len(json.loads(sys.stdin.read()).get('entries',[])))" <<< "$l" 2>/dev/null || echo "0")

    echo -e "  Total requests: ${BOLD}${total}${RESET}  |  Entries: ${BOLD}${entries_count}${RESET}"
    echo ""

    if [[ "${entries_count:-0}" -gt 0 ]]; then
        # Recent routing decisions — compact table
        echo -e "${WHITE}${BOLD}  Recent routing decisions:${RESET}"
        python3 -c "
import sys,json
d=json.load(sys.stdin)
b='\033[1m';g='\033[32m';r='\033[0m';y='\033[33m';rd='\033[31m';d_='\033[2m'
for e in reversed(d.get('entries',[])[:8]):
    ts=e.get('timestamp','?')[:16]
    t=e.get('task','?')[:60]
    s=e.get('topSkill','?')
    c=e.get('confidence',0)
    m=e.get('totalMatches','?')
    icon='\u2713' if c>0.5 else ('\u26a0' if c>0.25 else '\u2717')
    col=g if c>0.5 else (y if c>0.25 else rd)
    print(f'  {icon} [{ts}] {col}{s}{r} conf={c:.2f} matches={m}')
    print(f'      task: \"{t}\"...')
" < "$access_file" 2>/dev/null || true

        # Confidence distribution
        echo ""
        echo -e "${WHITE}${BOLD}  Confidence distribution:${RESET}"
        python3 -c "
import sys,json
d=json.load(sys.stdin)
c=[e.get('confidence',0) for e in d.get('entries',[])]
if not c: print('  No entries.'); exit()
hi=sum(1 for x in c if x>0.5); mid=sum(1 for x in c if .25<x<=.5); lo=len(c)-hi-mid; n=len(c)
avg=sum(c)/n if n else 0
g='\033[32m';y='\033[33m';rd='\033[31m';r='\033[0m'
print(f'  Total: {n} requests')
print(f'  High (>50%): {hi:>3d}/{n} ({hi/n*100:.0f}%)   {g}\u25cf{r}')
print(f'  Mid  (25-50%):    {mid:>3d}/{n} ({mid/n*100:.0f}%)   {y}\u25cf{r}')
print(f'  Low  (\u226425%):      {lo:>3d}/{n} ({lo/n*100:.0f}%)   {rd}\u25cf{r}')
print(f'  Average: {avg:.2f}')
" < "$access_file" 2>/dev/null || true

        # Most-routed skills
        echo ""
        echo -e "${WHITE}${BOLD}  Top routed skills:${RESET}"
        python3 -c "
import sys,json; from collections import Counter
d=json.load(sys.stdin)
b='\033[1m';r='\033[0m'
c=Counter(e.get('topSkill','?') for e in d.get('entries',[]))
for s,n in c.most_common(8): print(f'  {b}{s}{r}  {n:>3d}x')
" < "$access_file" 2>/dev/null || true

        # Show full access-log JSON response (colorized)
        display_output "Full /access-log Response" "$access_file"
    else
        echo -e "  ${YELLOW}⚠ No history yet — access log populates as the router is used.${RESET}"
    fi

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
        "OpenCode Live Run   — Full opencode execution with colored stdout/stderr"
        "Access Log Review   — GET /access-log routing history and confidence stats"
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

    check_api

    # If targeting a single chapter, just run it and exit
    if [[ -n "$TARGET_CHAPTER" ]]; then
        CHAPTER=$((TARGET_CHAPTER - 1))  # Start before the target chapter
        case "$TARGET_CHAPTER" in
            1) chapter_01_health_check ;;
            2) chapter_02_prometheus_k8s ;;
            3) chapter_03_vwap_trading ;;
            4) chapter_04_distributed_tracing ;;
            5) chapter_05_auth_patterns ;;
            6) chapter_06_redis_streams ;;
            7) chapter_07_opencode_integration ;;
            8) chapter_08_access_log_review ;;
        esac
        print_summary
        return 0
    fi

    # Full walkthrough with pagination
    CHAPTER=0
    chapter_01_health_check
    chapter_02_prometheus_k8s
    chapter_03_vwap_trading
    chapter_04_distributed_tracing
    chapter_05_auth_patterns
    chapter_06_redis_streams
    chapter_07_opencode_integration
    chapter_08_access_log_review

    print_summary
}

main "$@"
