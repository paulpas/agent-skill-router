#!/usr/bin/env bash
# ============================================================================
# Agent Skill Router — A Day Using the System (Narrative Walkthrough)
# ============================================================================
# One continuous story: a developer's actual day using the skill-router in prod.
# Each chapter runs live commands and shows real stdout/stderr output on screen.
# No hypotheticals — everything captured from what IS there right now.
#
# Usage:
#   ./api-walkthrough.sh              Walk through all 8 pages (press Enter between each)
#   ./api-walkthrough.sh --chapter N  Jump to page N directly (1-8)
#   ./api-walkthrough.sh --skip-opencode   Skip the OpenCode integration page
# ============================================================================

set -euo pipefail

readonly API_URL="http://localhost:3000"
TEMP_DIR=$(mktemp -d)
CHAPTER=0
TOTAL_CHAPTERS=8
TARGET_CHAPTER=""

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

# ─── Helpers ──────────────────────────────────────────────────────────────────

show_progress() {
    printf "\r${DIM}  [%d/%d]${RESET} ${CYAN}${BOLD}%s${RESET}" "$1" "$TOTAL_CHAPTERS" "$2"
}

print_chapter_header() {
    echo ""
    echo -e "${CYAN}${BOLD}  CHAPTER $1 — $2${RESET}"
    echo -e "${DIM}$(printf '═%.0s' {1..78})${RESET}"
}

print_scenario() { echo ""; echo -e "${WHITE}${BOLD}  📖 Scenario:${RESET} ${DIM}$1${RESET}"; }

print_output_box() {
    local label="$1" content="$2" max_lines="${3:-50}"
    echo ""
    printf "  ${CYAN}  ┌── %s ($(wc -c <<< "$content" | tr -d ' ') bytes)${RESET}\n" "$label"
    if command -v python3 &>/dev/null && [[ ${#content} -gt 10 ]]; then
        echo "$content" | head -n "$max_lines" | python3 -c "
import sys, json, re
raw = sys.stdin.read()
try:
    data = json.loads(raw)
    def col(obj, indent=0):
        sp = '  ' * indent
        if isinstance(obj, dict):
            items = list(obj.items())
            if not items: print(f'{sp}{{}}'); return
            for i,(k,v) in enumerate(items):
                comma = ',' if i < len(items)-1 else ''
                if isinstance(v, (dict,list)):
                    print(f'{sp}\x1b[33m\"{k}\"\x1b[0m:')
                    col(v, indent+1)
                elif isinstance(v, bool):
                    print(f'{sp}\x1b[33m\"{k}\"\x1b[0m: \x1b[32m{str(v).lower()}\x1b[0m{comma}')
                elif isinstance(v, (int,float)):
                    print(f'{sp}\x1b[33m\"{k}\"\x1b[0m: \x1b[32m{v}\x1b[0m{comma}')
                else:
                    s = json.dumps(str(v))
                    if len(s) > 70: s = s[:67]+'...\"'
                    print(f'{sp}\x1b[33m\"{k}\"\x1b[0m: \x1b[32m{s}\x1b[0m{comma}')
        elif isinstance(obj, list):
            if not obj: print(f'{sp}[]'); return
            for i,item in enumerate(obj):
                comma = ',' if i<len(obj)-1 else ''
                if isinstance(item,(dict,list)): col(item, indent+1)
                elif isinstance(item,bool): print(f'{sp}\x1b[32m{str(item).lower()}\x1b[0m{comma}')
                elif isinstance(item,(int,float)): print(f'{sp}\x1b[32m{item}\x1b[0m{comma}')
                else: s=str(item); print(f'{sp}\x1b[2m\"{s[:80]}\x1b[0m{comma}') if len(s)>80 else print(f'{sp}\x1b[2m\"{s}\"{comma}')
        else: print(f'{sp}\x1b[2m{json.dumps(obj)}\x1b[0m')
    col(data)
except json.JSONDecodeError:
    for line in raw.strip().split('\n'):
        m = re.match(r'^(\s*)\[(DEBUG|INFO|WARN|ERROR)\]', line)
        if m:
            lvl, prefix = m.group(2), m.group(1)
            colors = {'DEBUG': '\x1b[2m', 'INFO': '\x1b[32m', 'WARN': '\x1b[33m', 'ERROR': '\x1b[31m'}
            print(f'{colors.get(lvl,"")}{line}\x1b[0m')
        else: print(line)
" 2>/dev/null || echo "$content" | head -n "$max_lines" | while IFS= read -r line; do echo "  ${DIM}  │${RESET} $line"; done
    else
        echo "$content" | head -n "$max_lines" | while IFS= read -r line; do echo "  ${DIM}  │${RESET} $line"; done
    fi
    echo -e "${CYAN}  └──────────────────────────────────────${RESET}"
}

print_key_point() { local color="${2:-$GREEN}"; echo -e "  ${color}►${RESET} $1"; }

json_extract() {
    local json="$1" field="$2"
    if command -v python3 &>/dev/null; then
        echo "$json" | python3 -c "
import sys,json
d=json.loads(sys.stdin.read())
for k in '$field'.split('.'): d=d[k]
print(d)
" 2>/dev/null || echo "?"
    else
        echo "?"
    fi
}

curl_get() {
    local path="$1"; shift
    echo ""; echo -e "  ${DIM}  ─── GET ${API_URL}${path} ───${RESET}"
    local f="$TEMP_DIR/c_$$"
    curl -s --max-time 10 "${API_URL}${path}" > "$f" 2>/dev/null || true
    local c; c=$(cat "$f"); rm -f "$f"
    if [[ ${#c} -gt 3 ]]; then
        # Truncate massive responses for display (keep byte count accurate)
        [[ ${#c} -gt 50000 ]] && print_output_box "Response (${#c} bytes, truncated)" "${c:0:50000}..." 40 || \
            print_output_box "Response (${#c} bytes)" "$c"
    else
        echo ""; echo -e "  ${RED}✗ No response${RESET}"
    fi
}

curl_post() {
    local path="$1" body="$2"; shift 2
    echo ""; echo -e "  ${DIM}  ─── POST ${API_URL}${path} ───${RESET}"
    local f="$TEMP_DIR/c_$$"
    echo "$body" | curl -s --max-time 15 -X POST -H "Content-Type: application/json" \
        "${API_URL}${path}" > "$f" 2>/dev/null || true
    local c; c=$(cat "$f"); rm -f "$f"
    if [[ ${#c} -gt 3 ]]; then
        [[ ${#c} -gt 50000 ]] && print_output_box "Response (${#c} bytes, truncated)" "${c:0:50000}..." 40 || \
            print_output_box "Response (${#c} bytes)" "$c"
    else
        echo ""; echo -e "  ${RED}✗ No response${RESET}"
    fi
}

check_api() {
    curl -s --max-time 3 "$API_URL/health" &>/dev/null || {
        echo ""; echo -e "  ${RED}✗ API not available at ${API_URL}${RESET}"
        print_key_point "Start: $(pwd)/scripts/start-skill-router.sh" "${YELLOW}"
        exit 1
    }
}

# ─── Terminal Dimensions & 2-Column Layout ─────────────────────────────────────

get_term_width() {
    local w; w=$(tput cols 2>/dev/null || echo 80)
    echo $((w > 80 ? w - 14 : 66))
}

# Shared COL_WIDTH (calculated once at startup, but we keep it dynamic for functions)
_col_width_cache=""
get_col_width() {
    if [[ -z "$_col_width_cache" ]]; then
        _col_width_cache=$(( $(get_term_width) / 2 ))
    fi
    echo "$_col_width_cache"
}

# Print two columns side-by-side. Each arg is "TITLE\nline1\nline2..."
print_two_col() {
    local left="$1" right="$2"
    local cw; cw=$(get_col_width)
    local left_lines=() right_lines=()
    
    while IFS= read -r line; do [[ -n "$line" ]] && left_lines+=("$line"); done <<< "$left"
    while IFS= read -r line; do [[ -n "$line" ]] && right_lines+=("$line"); done <<< "$right"
    
    local max=$(( ${#left_lines[@]} > ${#right_lines[@]} ? ${#left_lines[@]} : ${#right_lines[@]} ))
    # Cap display to terminal height minus header/footer (~20 lines)
    local term_h; term_h=$(tput lines 2>/dev/null || echo 50)
    max=$((max > term_h - 18 ? term_h - 18 : max))
    
    for ((i=0; i<max && i<max; i++)); do
        local l="${left_lines[$i]:-}"; local r="${right_lines[$i]:-}"
        printf "  %-45s │ %s\n" "$l" "$r"
    done
    echo ""
}

# Print two columns with colored titles (GREEN left, CYAN right)
print_colored_two_col() {
    local left_title="$1" right_title="$2"
    printf "\n  ${GREEN}${BOLD}%-45s${DIM}│${RESET} ${CYAN}%s${RESET}\n" "$left_title" "$right_title"
}

# ─── Per-Chapter Pagination ────────────────────────────────────────────────────

page_output_simple() {
    # Paginates content if it exceeds max_lines. Uses simple read prompt (no less dependency).
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

chapter_01_morning_standup() {
    [[ -n "$TARGET_CHAPTER" && "$TARGET_CHAPTER" != "1" ]] && return
    CHAPTER=$((CHAPTER + 1)); show_progress "$CHAPTER" "Morning Standup"
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
    echo "$all_s" | python3 -c "
import sys,json; d=json.load(sys.stdin); c={}
for s in d.get('skills',[]): c[s.get('category','?')]=c.get(s.get('category','?'),0)+1
for cat,n in sorted(c.items(),key=lambda x:-x[1])[:5]: print(f'  {GREEN}►{RESET} {cat}: {n:>4d} skills')" 2>/dev/null || true

    echo -e "${GREEN}${BOLD}  ✓ Chapter $CHAPTER complete.${RESET}"
    prompt_next_page
}

# ─── Chapter 2: Onboarding a New Developer ────────────────────────────────────

chapter_02_onboarding() {
    [[ -n "$TARGET_CHAPTER" && "$TARGET_CHAPTER" != "2" ]] && return
    CHAPTER=$((CHAPTER + 1)); show_progress "$CHAPTER" "Onboarding"
    print_chapter_header "$CHAPTER" "ONBOARDING — Skill Discovery for a New Developer"
    print_scenario 'A new teammate: "Show me what the router can do."'

    local all_s; all_s=$(curl -s --max-time 10 "$API_URL/skills" 2>/dev/null || echo '{"skills":[]}')

    # Coding skills — compact list (name only, no description preview)
    echo -e "${WHITE}${BOLD}  Coding domain skills (${all_s}: first 5):${RESET}"
    echo "$all_s" | python3 -c "
import sys,json; d=json.load(sys.stdin)
coding=[s for s in d.get('skills',[]) if s.get('category')=='coding']
print(f'  Total coding skills: {len(coding)}\n')
for s in coding[:5]: print(f'  {GREEN}•{RESET} {BOLD}{s[\"name\"]}${RESET}')" 2>/dev/null || true

    # Pick a real skill to open
    local demo_skill="risk-management"
    for candidate in "kubernetes-deployment" "agent-task-routing" "$demo_skill"; do
        local bytes; bytes=$(curl -s --max-time 3 "${API_URL}/skill/${candidate}" 2>/dev/null | wc -c)
        [[ "$bytes" -gt 1000 ]] && demo_skill="$candidate" && break
    done

    # Open skill content with pagination if large
    local f="$TEMP_DIR/skill_$$"; curl -s --max-time 5 "${API_URL}/skill/${demo_skill}" > "$f" 2>/dev/null || true
    local content; content=$(cat "$f"); rm -f "$f"

    if [[ ${#content} -gt 1000 ]]; then
        echo -e "${WHITE}${BOLD}  Skill: ${demo_skill} ($(wc -c <<< "$content" | tr -d ' ') bytes)${RESET}"

        # Show with pagination if > 35 lines
        local line_count; line_count=$(echo "$content" | wc -l)
        if [[ "$line_count" -gt 35 ]]; then
            echo -e "${DIM}  [ ${line_count} lines — paginating... ]${RESET}"
            echo "$content" | page_output_simple 35
        else
            print_output_box "SKILL.md ($(wc -c <<< "$content" | tr -d ' ') bytes)" "$content" 40
        fi

        # Compact skill breakdown
        local cb h1 trig
        cb=$(( $(echo "$content" | grep -c '```' || echo "0") / 2 ))
        h1=$(echo "$content" | grep -c '^# ' || echo "0")
        trig=$(echo "$content" | python3 -c "
import sys,re; c=sys.stdin.read(); fm=c.split('---')[1] if '---' in c else ''
m=re.search(r'triggers:\s*(.*?)(?:\n\s*\w|\n---)',fm,re.DOTALL)
print(m.group(1).strip().replace('\n  ',' ')[:120])" 2>/dev/null || true)

        echo -e "  Sections: ${BOLD}${h1}${RESET} | Code blocks: ${BOLD}${cb}${RESET}"
        [[ -n "$trig" ]] && echo -e "  Triggers: ${DIM}${trig}...${RESET}"
    else
        echo -e "  ${YELLOW}⚠ Minimal content for '${demo_skill}'${RESET}"
    fi

    echo -e "${GREEN}${BOLD}  ✓ Chapter $CHAPTER complete.${RESET}"
    prompt_next_page
}

# ─── Chapter 3: A Real Task Comes In (Routing) ───────────────────────────────

chapter_03_real_task_routing() {
    [[ -n "$TARGET_CHAPTER" && "$TARGET_CHAPTER" != "3" ]] && return
    CHAPTER=$((CHAPTER + 1)); show_progress "$CHAPTER" "Real Task Routing"
    print_chapter_header "$CHAPTER" "A REAL TASK COMES IN — POST /route"
    print_scenario 'Jira ticket: "My Kubernetes pod keeps crashing after deployment." Engineer needs help.'

    # First query
    local r; r=$(curl -s --max-time 15 -X POST "${API_URL}/route" \
        -H "Content-Type: application/json" \
        -d '{"task":"My Kubernetes pod keeps crashing after deployment","constraints":{"maxSkills":5}}' 2>/dev/null || echo "{}")

    # Compact stats display
    local confidence latency strategy
    confidence=$(json_extract "$r" "confidence"); : "${confidence:=?}"
    latency=$(json_extract "$r" "latencyMs"); : "${latency:=?}"
    strategy=$(json_extract "$r" "executionPlan.strategy"); : "${strategy:=?}"

    echo -e "${WHITE}${BOLD}  Scorer results:${RESET}"
    echo -e "  Confidence: ${BOLD}${confidence}${RESET}  |  Latency: ${BOLD}${latency}ms${RESET}  |  Strategy: ${BOLD}${strategy}${RESET}"

    # Matched skills — compact (name + score only)
    echo ""; echo -e "${WHITE}${BOLD}  Ranked matches:${RESET}"
    echo "$r" | python3 -c "
import sys,json; d=json.load(sys.stdin); medals=['🥇','🥈','🥉']
for i,s in enumerate(d.get('selectedSkills',[])[:5],1):
    icon=medals[i-1] if i<=3 else f'{i}.'
    print(f'  {icon} {BOLD}{s[\"name\"]}${RESET} score={GREEN}{s.get(\"score\",0):.3f}${RESET}')" 2>/dev/null || true

    # Reasoning (compact)
    local reason; reason=$(json_extract "$r" "reasoningSummary"); : "${reason:=?}"
    [[ "$reason" != "?" ]] && echo -e "  ${DIM}Reasoning: ${reason:0:120}...${RESET}"

    # Bonus query
    echo ""; echo -e "${DIM}  ─── BONUS: Different task → different results ───${RESET}"
    local r2; r2=$(curl -s --max-time 15 -X POST "${API_URL}/route" \
        -H "Content-Type: application/json" \
        -d '{"task":"Implement ATR-based stop loss for crypto trading","constraints":{"maxSkills":3}}' 2>/dev/null || echo "{}")

    echo "$r2" | python3 -c "
import sys,json; d=json.load(sys.stdin); medals=['🥇','🥈','🥉']
for i,s in enumerate(d.get('selectedSkills',[])[:3],1):
    icon=medals[i-1] if i<=3 else f'{i}.'
    print(f'  {icon} {BOLD}{s[\"name\"]}${RESET} score={GREEN}{s.get(\"score\",0):.3f}${RESET}')" 2>/dev/null || true

    echo -e "${GREEN}${BOLD}  ✓ Chapter $CHAPTER complete.${RESET}"
    prompt_next_page
}

# ─── Chapter 4: Execute the Work ─────────────────────────────────────────────

chapter_04_execute_work() {
    [[ -n "$TARGET_CHAPTER" && "$TARGET_CHAPTER" != "4" ]] && return
    CHAPTER=$((CHAPTER + 1)); show_progress "$CHAPTER" "Execute the Work"
    print_chapter_header "$CHAPTER" "EXECUTE THE WORK — Running Routed Tasks via MCP Tools"
    print_scenario 'Engineer loaded kubernetes-deployment. Now they want results.'

    # Route vs Execute compact display
    echo -e "  ${CYAN}POST /route${RESET}     → Skill suggestions with confidence scores"
    echo -e "  ${CYAN}POST /execute${RESET}   → Runs MCP tools, returns results directly"

    # Execute demo
    local e; e=$(curl -s --max-time 15 -X POST "${API_URL}/execute" \
        -H "Content-Type: application/json" \
        -d '{"task":"List scripts","skills":["run_shell_command"],"inputs":{"command":"ls /home/paulpas/git/agent-skill-router/scripts/*.sh | head -10"}}' 2>/dev/null || echo "{}")

    local taskId status
    taskId=$(json_extract "$e" "taskId"); : "${taskId:=?}"
    status=$(json_extract "$e" "status"); : "${status:=?}"
    echo ""; echo -e "  Task: ${BOLD}${taskId}${RESET}  |  Status: ${BOLD}${status}${RESET}"

    # Show response content if available and compact
    local resp; resp=$(json_extract "$e" "result.stdout") 2>/dev/null || true
    if [[ -n "$resp" && "$resp" != "?" ]]; then
        echo -e "${WHITE}${BOLD}  Output:${RESET}"
        echo "$resp" | head -10 | while IFS= read -r l; do echo "  ${DIM}│${RESET} $l"; done
    fi

    echo -e "${GREEN}${BOLD}  ✓ Chapter $CHAPTER complete.${RESET}"
    prompt_next_page
}

# ─── Chapter 5: Audit Trail ──────────────────────────────────────────────────

chapter_05_audit_trail() {
    [[ -n "$TARGET_CHAPTER" && "$TARGET_CHAPTER" != "5" ]] && return
    CHAPTER=$((CHAPTER + 1)); show_progress "$CHAPTER" "Audit Trail"
    print_chapter_header "$CHAPTER" "AUDIT TRAIL — What Was Routed Today?"
    print_scenario "Post-meeting: 'How well are routing matches landing?'"

    local l; l=$(curl -s --max-time 10 "$API_URL/access-log" 2>/dev/null || echo '{"totalRequests":0,"entries":[]}')

    local total entries_count
    total=$(json_extract "$l" "totalRequests"); : "${total:=?}"
    entries_count=$(echo "$l" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('entries',[])))" 2>/dev/null || echo "0")

    echo -e "  Total requests: ${BOLD}${total}${RESET}  |  Entries: ${BOLD}${entries_count}${RESET}"

    if [[ "${entries_count:-0}" -gt 0 ]]; then
        # Recent decisions — compact table
        local recent_block; recent_block=$(echo "$l" | python3 -c "
import sys,json; d=json.load(sys.stdin)
print(f'Recent routing decisions ({len(d.get(\"entries\",[]))} entries):')
for e in reversed(d.get('entries',[])[:5]):
    ts=e.get('timestamp','?')[:16]; t=e.get('task','?')[:50]
    s=e.get('topSkill','?'); c=e.get('confidence',0); m=e.get('totalMatches','?')
    icon='✓' if c>0.6 else ('⚠' if c>0.3 else '✗')
    print(f'  {icon} [{ts}] {s:<40s} conf={c:.2f} matches={m}')
    print(f'     task: \"{t}\"...')" 2>/dev/null || true)

        # Confidence distribution
        local dist_block; dist_block=$(echo "$l" | python3 -c "
import sys,json; d=json.load(sys.stdin); c=[e.get('confidence',0) for e in d.get('entries',[])]
if not c: print('  No entries.'); exit()
hi=sum(1 for x in c if x>0.6); mid=sum(1 for x in c if .3<x<=.6); lo=len(c)-hi-mid; n=len(c)
print(f'Confidence distribution ({n} total):')
print(f'  High (>{60:.0f}%): {hi:>3d}/{n} ({hi/n*100:.0f}%)')
print(f'  Mid  (30-60%):    {mid:>3d}/{n} ({mid/n*100:.0f}%)')
print(f'  Low  (≤30%):      {lo:>3d}/{n} ({lo/n*100:.0f}%)')
print(f'  Average: {sum(c)/len(c):.2f}')" 2>/dev/null || true)

        # Most-routed skills — compact
        local top_block; top_block=$(echo "$l" | python3 -c "
import sys,json; from collections import Counter
d=json.load(sys.stdin); c=Counter(e.get('topSkill','?') for e in d.get('entries',[]))
print(f'Top routed skills:')
for s,n in c.most_common(5): print(f'  {s:<40s} {n:>2d}x')" 2>/dev/null || true)

        # Display with 2-col layout where possible, paginate if large
        local combined; combined="$(echo "$recent_block"; echo ""; echo "$dist_block")"
        local combined_lines; combined_lines=$(echo "$combined" | wc -l)
        
        if [[ "$combined_lines" -gt 40 ]]; then
            echo "$combined" | page_output_simple 40
            echo "$top_block" | page_output_simple 35
        else
            echo ""
            echo -e "${WHITE}${BOLD}  Recent decisions & stats:${RESET}"
            echo "$combined"
            echo -e "${WHITE}${BOLD}  Top skills:${RESET}"
            echo "$top_block"
        fi

    else
        echo -e "  ${YELLOW}⚠ No history yet — access log populates as the router is used.${RESET}"
    fi

    echo -e "${GREEN}${BOLD}  ✓ Chapter $CHAPTER complete.${RESET}"
    prompt_next_page
}

# ─── Chapter 6: After a Code Change (Reload + Metrics) ───────────────────────

chapter_06_reload_and_metrics() {
    [[ -n "$TARGET_CHAPTER" && "$TARGET_CHAPTER" != "6" ]] && return
    CHAPTER=$((CHAPTER + 1)); show_progress "$CHAPTER" "Reload + Metrics"
    print_chapter_header "$CHAPTER" "AFTER A CODE CHANGE — Reload & Metrics"
    print_scenario 'SKILL.md updated. Need it picked up now, not wait for hourly sync.'

    # Pre-reload metrics
    local m; m=$(curl -s --max-time 10 "$API_URL/metrics" 2>/dev/null || echo "{}")
    local hits misses tokens saved
    hits=$(json_extract "$m" "compression.cacheHits"); : "${hits:=?}"
    misses=$(json_extract "$m" "compression.cacheMisses"); : "${misses:=?}"
    tokens=$(json_extract "$m" "compression.totalTokensSaved"); : "${tokens:=?}"
    local avg_comp; avg_comp=$(json_extract "$m" "compression.averageCompressionPercent"); : "${avg_comp:=?}"

    echo -e "${WHITE}${BOLD}  Compression cache (before reload):${RESET}"
    echo -e "  Hits: ${BOLD}${hits}${RESET}  |  Misses: ${BOLD}${misses}${RESET}  |  Tokens saved: ${BOLD}${tokens}${RESET}  |  Avg: ${BOLD}${avg_comp}%${RESET}"

    # Trigger reload
    echo -e "${WHITE}${BOLD}  Triggering reload — git fetch + reset + re-index...${RESET}"
    local rl; rl=$(curl -s --max-time 30 -X POST "${API_URL}/reload" 2>/dev/null || echo "{}")

    if [[ ${#rl} -gt 10 ]]; then
        local status reload_skills
        status=$(json_extract "$rl" "status"); : "${status:=?}"
        reload_skills=$(json_extract "$rl" "skills.totalSkills"); : "${reload_skills:=?}"
        echo -e "  Status: ${GREEN}${BOLD}${status}${RESET}  |  Skills: ${BOLD}${reload_skills}${RESET}"
    else
        echo -e "  ${YELLOW}⚠ Reload still in progress...${RESET}"
    fi

    # Post-reload metrics
    local pm; pm=$(curl -s --max-time 10 "$API_URL/metrics" 2>/dev/null || echo "{}")
    local hits_after misses_after
    hits_after=$(json_extract "$pm" "compression.cacheHits"); : "${hits_after:=?}"
    misses_after=$(json_extract "$pm" "compression.cacheMisses"); : "${misses_after:=?}"

    # 2-col layout: before vs after
    print_colored_two_col "Before Reload" "After Reload"
    local before_block after_block
    before_block="Cache hits:   ${hits}
Cache misses: ${misses}
Tokens saved: ${tokens}"
    after_block="Cache hits:   ${hits_after} (reset)
Cache misses: ${misses_after} (fresh compressing)"
    print_two_col "$before_block" "$after_block"

    echo -e "${GREEN}${BOLD}  ✓ Chapter $CHAPTER complete.${RESET}"
    prompt_next_page
}

# ─── Chapter 7: Production Run (OpenCode Integration) ────────────────────────

chapter_07_production_run() {
    [[ -n "$TARGET_CHAPTER" && "$TARGET_CHAPTER" != "7" ]] && return
    CHAPTER=$((CHAPTER + 1)); show_progress "$CHAPTER" "Production Run"
    print_chapter_header "$CHAPTER" "PRODUCTION RUN — OpenCode Integration"

    if [[ "${SKIP_OPCODE:-false}" == "true" ]]; then
        echo -e "  ${YELLOW}⚠ Skipped (--skip-opencode flag set)${RESET}"; return
    fi

    if ! command -v opencode &>/dev/null; then
        echo -e "  ${RED}✗ opencode not found. Skip with --skip-opencode.${RESET}"; return
    fi

    local healthy; healthy=$(curl -s --max-time 3 "$API_URL/health" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))") || true
    [[ "$healthy" != "healthy" ]] && { echo -e "  ${RED}✗ API unhealthy.${RESET}"; return; }

    echo -e "${WHITE}${BOLD}  Launching OpenCode with MCP bridge...${RESET}"
    echo -e "${DIM}  timeout 20 opencode run --print-logs --log-level DEBUG\\${RESET}"
    echo -e "${DIM}    --dangerously-skip-permissions -m opencode/big-pickle 'explain files in src/'${RESET}"

    local so="$TEMP_DIR/oc_stdout.txt" se="$TEMP_DIR/oc_stderr.txt"
    timeout 20 opencode run --print-logs --log-level DEBUG \
        --dangerously-skip-permissions -m opencode/big-pickle \
        "explain what files are in src/" > "$so" 2> "$se" || true

    local sc="" ec=""; sc=$(cat "$so" 2>/dev/null || echo ""); ec=$(cat "$se" 2>/dev/null || echo "")

    # Log stats — compact
    if [[ -n "$ec" ]]; then
        local log_lines info_c debug_c warn_c error_c mcp_c tool_c skill_c
        log_lines=$(echo "$ec" | wc -l)
        info_c=$(echo "$ec" | grep -c '\[INFO\]' 2>/dev/null || echo "0")
        debug_c=$(echo "$ec" | grep -c '\[DEBUG\]' 2>/dev/null || echo "0")
        warn_c=$(echo "$ec" | grep -c '\[WARN\]\|\[WARNING\]' 2>/dev/null || echo "0")
        error_c=$(echo "$ec" | grep -c '\[ERROR\]\|\[FAIL' 2>/dev/null || echo "0")
        mcp_c=$(echo "$ec" | grep -ci 'mcp\|route_to_skill\|tool_call' 2>/dev/null || echo "0")
        tool_c=$(echo "$ec" | grep -c '\[TOOL' 2>/dev/null || echo "0")
        skill_c=$(echo "$ec" | grep -ci 'SKILL\|skill.load\|ON-DEMAND' 2>/dev/null || echo "0")

        echo ""; echo -e "${WHITE}${BOLD}  Log stats:${RESET}"
        echo -e "  Lines: ${BOLD}${log_lines}${RESET} | INFO: ${BOLD}${info_c}${RESET} DEBUG: ${BOLD}${debug_c}${RESET} WARN: ${BOLD}${warn_c}${RESET} ERROR: ${BOLD}${error_c}${RESET}"
        echo -e "  MCP: ${BOLD}${mcp_c}${RESET} Tools: ${BOLD}${tool_c}${RESET} Skills: ${BOLD}${skill_c}${RESET}"

        # Recent log lines with pagination if large
        local recent_logs; recent_logs=$(echo "$ec" | tail -n 20)
        local recent_lines; recent_lines=$(echo "$recent_logs" | wc -l)
        echo ""; echo -e "${WHITE}${BOLD}  Recent logs:${RESET}"
        if [[ "$recent_lines" -gt 35 ]]; then
            echo "$recent_logs" | page_output_simple 35
        else
            print_output_box "Last 20 log lines" "$recent_logs" 22
        fi
    fi

    # AI response with pagination
    if [[ -n "$sc" ]]; then
        local resp_lines; resp_lines=$(echo "$sc" | wc -l)
        echo ""; echo -e "${WHITE}${BOLD}  AI Response:${RESET}"
        if [[ "$resp_lines" -gt 35 ]]; then
            echo "$sc" | page_output_simple 35
        else
            print_output_box "AI Response" "$sc" 20
        fi
    elif [[ -z "$ec" ]]; then
        echo -e "  ${YELLOW}⚠ Both streams empty — model may be unavailable or timed out${RESET}"
    fi

    rm -f "$so" "$se"
    echo -e "${GREEN}${BOLD}  ✓ Chapter $CHAPTER complete.${RESET}"
    prompt_next_page
}

# ─── Chapter 8: Capturing Everything ────────────────────────────────────────

chapter_08_capturing_output() {
    [[ -n "$TARGET_CHAPTER" && "$TARGET_CHAPTER" != "8" ]] && return
    CHAPTER=$((CHAPTER + 1)); show_progress "$CHAPTER" "Capturing Output"
    print_chapter_header "$CHAPTER" "CAPTURING EVERYTHING — The tee Pattern"
    print_scenario 'Need this output for a report or to share with someone.'

    # Demo: 2>&1 | tee (compact)
    local cap="/tmp/sr-cap-$$"
    curl -s --max-time 5 "$API_URL/health" 2>&1 | tee "$cap" > /dev/null || true
    [[ -f "$cap" ]] && { echo -e "  Captured: ${BOLD}${cap}${RESET}"; cat "$cap"; }
    rm -f "$cap"

    # Demo: separate streams (inline)
    local ds="$TEMP_DIR/ds.log" de="$TEMP_DIR/de.log"
    (echo "This is STDOUT"; echo "This is STDERR" >&2; echo "Another output line"; echo "Another error" >&2) > "$ds" 2> "$de"

    echo -e "\n${WHITE}${BOLD}  Separate streams:${RESET}"
    echo -e "  ${GREEN}stdout:${RESET} $(cat "$ds" | tr '\n' ' | ')"
    echo -e "  ${YELLOW}stderr:${RESET} $(cat "$de" | tr '\n' ' | ')"
    rm -f "$ds" "$de"

    # Compact capture modes table (2-col)
    print_colored_two_col "Command" "Purpose"
    local left_block right_block
    left_block="cmd 2>&1 | tee output.log
cmd > out.log 2> err.log
cmd > response.txt 2>/dev/null
cat full.log | grep [ERROR]
cmd 2>&1 | tee >(cat >&2) | grep pattern"

    right_block="Record sessions
Debug (separate streams)
Clean reports only
Post-mortem analysis
Capture + filter (advanced)"

    print_two_col "$left_block" "$right_block"

    echo -e "${GREEN}${BOLD}  ✓ Chapter $CHAPTER complete.${RESET}"
    prompt_next_page
}

# ─── Summary ──────────────────────────────────────────────────────────────────

print_summary() {
    print_chapter_header "$CHAPTER" "ALL CHAPTERS COMPLETE"
    echo ""
    echo -e "${WHITE}${BOLD}  What we ran live:${RESET}\n"

    local chapters=(
        "Morning Standup     — docker ps, GET /health, stats with real numbers"
        "Onboarding          — GET /skills catalog browse, open a real SKILL.md"
        "Real Task Routing   — POST /route with live queries, parsed matched skills"
        "Execute the Work    — POST /execute running MCP tool commands via API"
        "Audit Trail         — GET /access-log with session review and confidence stats"
        "Reload + Metrics    — GET/POST /metrics and /reload showing cache state changes"
        "Production Run      — Live OpenCode run with full stdout/stderr captured"
        "Capturing Output    — 2>&1 | tee patterns for recording sessions"
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

   echo "" && echo -e "${BOLD}$(printf '═%.0s' {1..78})${RESET}"
    echo ""
    echo -e "${DIM}Navigation during walkthrough: [ENTER] next | [P] previous | [Q] quit${RESET}"
}

# ─── Main ──────────────────────────────────────────────────────────────────────

main() {
    echo ""
    echo -e "${CYAN}${BOLD}"
    echo "  ╔══════════════════════════════════════════════════════════════╗"
    echo "  ║   AGENT SKILL ROUTER — A Day Using the System              ║"
    echo "  ║   One continuous story. Real commands. Live output.        ║"
    echo "  ╚═══════════════════════════════════════════════════���══════╝"
    echo -e "${RESET}"

    check_api

    # If targeting a single chapter, just run it and exit
    if [[ -n "$TARGET_CHAPTER" ]]; then
        CHAPTER=$((TARGET_CHAPTER - 1))  # Start before the target chapter
        case "$TARGET_CHAPTER" in
            1) chapter_01_morning_standup ;;
            2) chapter_02_onboarding ;;
            3) chapter_03_real_task_routing ;;
            4) chapter_04_execute_work ;;
            5) chapter_05_audit_trail ;;
            6) chapter_06_reload_and_metrics ;;
            7) chapter_07_production_run ;;
            8) chapter_08_capturing_output ;;
        esac
        print_summary
        return 0
    fi

    # Full walkthrough with pagination
    CHAPTER=0
    chapter_01_morning_standup
    chapter_02_onboarding
    chapter_03_real_task_routing
    chapter_04_execute_work
    chapter_05_audit_trail
    chapter_06_reload_and_metrics
    chapter_07_production_run
    chapter_08_capturing_output

    print_summary
}

main "$@"
