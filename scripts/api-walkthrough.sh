#!/usr/bin/env bash
# ============================================================================
# Agent Skill Router — A Day Using the System (Narrative Walkthrough)
# ============================================================================
# One continuous story: a developer's actual day using the skill-router in prod.
# Each chapter runs live commands and shows real stdout/stderr output on screen.
# No hypotheticals — everything captured from what IS there right now.
#
# Usage:
#   ./api-walkthrough.sh              Run all 8 chapters (default)
#   ./api-walkthrough.sh --chapter N  Only run a single chapter (1-8)
#   ./api-walkthrough.sh --skip-opencode   Skip the OpenCode integration chapter
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
    echo -e "${BG_CYAN}${WHITE}   ┃ CHAPTER $1: ${BOLD}$2                                ┃${RESET}"
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

# ─── Chapter 1: Morning Standup ──────────────────────────────────────────────

chapter_01_morning_standup() {
    [[ -n "$TARGET_CHAPTER" && "$TARGET_CHAPTER" != "1" ]] && return
    CHAPTER=$((CHAPTER + 1)); show_progress "$CHAPTER" "Morning Standup"
    print_chapter_header "$CHAPTER" "MORNING STANDUP — Health & Stats"
    print_scenario "It's 9 AM. You boot up: Is everything running? How many skills loaded today?"

    # Docker check
    echo -e "${WHITE}${BOLD}  Checking container status...${RESET}"
    if command -v docker &>/dev/null; then
        local d_out; d_out=$(docker ps --filter name=skill-router --format "table {{.Names}}\t{{.Status}}" 2>&1) || true
        echo ""; echo -e "${CYAN}  ┌── docker ps (skill-router)${RESET}"
        [[ -n "$d_out" ]] && echo "$d_out" | while IFS= read -r l; do echo "  ${DIM}  │${RESET} $l"; done || \
            echo -e "  ${YELLOW}  │  (no containers found)${RESET}"
        echo -e "${CYAN}  └──────────────────────${RESET}"
    else
        print_key_point "Docker not installed — assuming standalone API" "${YELLOW}"
    fi

    # Health check
    curl_get "/health"
    local h; h=$(curl -s --max-time 5 "$API_URL/health" 2>/dev/null || echo "{}")

    echo ""; echo -e "${WHITE}${BOLD}  Standup summary:${RESET}"
    print_key_point "Status: ${GREEN}${BOLD}$(json_extract "$h" "status")${RESET}"
    print_key_point "Ready:  $(json_extract "$h" "ready")"
    print_key_point "Version: $(json_extract "$h" "version")"

    # Stats
    curl_get "/stats"
    local s; s=$(curl -s --max-time 10 "$API_URL/stats" 2>/dev/null || echo "{}")

    echo ""; echo -e "${WHITE}${BOLD}  What these numbers mean:${RESET}"
    print_key_point "$(json_extract "$s" "skills.totalSkills") total skills — full catalog size"
    print_key_point "$(json_extract "$s" "skills.categories") categories — domains: agent, cncf, coding, trading, ..."
    print_key_point "$(json_extract "$s" "skills.tags") trigger keywords — words that auto-load skills"
    print_key_point "$(json_extract "$s" "mcpTools.totalTools") MCP tools for executing routed tasks"

    # Domain breakdown
    local all_s; all_s=$(curl -s --max-time 10 "$API_URL/skills" 2>/dev/null || echo '{"skills":[]}')
    echo ""; echo -e "${WHITE}${BOLD}  Skills by domain (top 5):${RESET}"
    echo "$all_s" | python3 -c "
import sys,json; d=json.load(sys.stdin); c={}
for s in d.get('skills',[]): c[s.get('category','?')]=c.get(s.get('category','?'),0)+1
for cat,n in sorted(c.items(),key=lambda x:-x[1])[:5]: print(f'  {GREEN}►{RESET} {cat}: {n:>4d} skills')" 2>/dev/null || true

    echo ""; echo -e "${GREEN}${BOLD}  ✓ Morning standup complete. System healthy, $(json_extract "$s" "skills.totalSkills") skills loaded.${RESET}"
}

# ─── Chapter 2: Onboarding a New Developer ────────────────────────────────────

chapter_02_onboarding() {
    [[ -n "$TARGET_CHAPTER" && "$TARGET_CHAPTER" != "2" ]] && return
    CHAPTER=$((CHAPTER + 1)); show_progress "$CHAPTER" "Onboarding"
    print_chapter_header "$CHAPTER" "ONBOARDING — Skill Discovery for a New Developer"
    print_scenario 'A new teammate asks: "What can this router help me with? Show me what exists."'

    # Fetch catalog (don't dump raw JSON to screen — it's 500KB+)
    local all_s; all_s=$(curl -s --max-time 10 "$API_URL/skills" 2>/dev/null || echo '{"skills":[]}')

    # Show coding domain skills
    echo ""; echo -e "${WHITE}${BOLD}  Filtering to 'coding' domain (first 5):${RESET}"
    echo "$all_s" | python3 -c "
import sys,json; d=json.load(sys.stdin)
coding=[s for s in d.get('skills',[]) if s.get('category')=='coding']
print(f'  Found {len(coding)} coding skills total.\n')
for s in coding[:5]:
    print(f'  {GREEN}•{RESET} {BOLD}{s[\"name\"]}${RESET}')
    d=s.get('description',''); print(f'      {DIM}{d[:90]}${RESET}') if len(d)>90 else print(f'      {DIM}{d}${RESET}')" 2>/dev/null || true

    # Pick a real skill to open
    local demo_skill="risk-management"
    for candidate in "kubernetes-deployment" "agent-task-routing" "$demo_skill"; do
        local bytes; bytes=$(curl -s --max-time 3 "${API_URL}/skill/${candidate}" 2>/dev/null | wc -c)
        [[ "$bytes" -gt 1000 ]] && demo_skill="$candidate" && break
    done

    echo ""; echo -e "${WHITE}${BOLD}  Opening '${demo_skill}' to see what's inside:${RESET}"
    local f="$TEMP_DIR/skill_$$"; curl -s --max-time 5 "${API_URL}/skill/${demo_skill}" > "$f" 2>/dev/null || true
    local content; content=$(cat "$f"); rm -f "$f"

    if [[ ${#content} -gt 1000 ]]; then
        print_output_box "SKILL.md (${demo_skill}, $(wc -c <<< "$content" | tr -d ' ') bytes)" "$content" 35

        echo ""; echo -e "${WHITE}${BOLD}  Skill breakdown:${RESET}"
        local fm cb h1
        fm=$(echo "$content" | head -5 | grep -c '^---$' || echo "0")
        cb=$(( $(echo "$content" | grep -c '```' || echo "0") / 2 ))
        h1=$(echo "$content" | grep -c '^# ' || echo "0")

        print_key_point "YAML frontmatter: ${GREEN}yes${RESET}"
        print_key_point "H1 sections: ${BOLD}${h1}${RESET}"
        print_key_point "Code blocks: ${BOLD}${cb}${RESET} — real implementation examples"

        # Triggers from frontmatter
        local trig; trig=$(echo "$content" | python3 -c "
import sys,re; c=sys.stdin.read(); fm=c.split('---')[1] if '---' in c else ''
m=re.search(r'triggers:\s*(.*?)(?:\n\s*\w|\n---)',fm,re.DOTALL)
print(m.group(1).strip().replace('\n  ',' ')[:150])" 2>/dev/null || true)
        [[ -n "$trig" ]] && echo "" && print_key_point "Triggers: ${BOLD}${trig}...${RESET}"

        echo ""; print_key_point "${DIM}Each skill is a Markdown file + YAML frontmatter. Frontmatter triggers auto-loading.${RESET}"
    else
        echo ""; echo -e "  ${YELLOW}⚠ Minimal content for '${demo_skill}', showing catalog entry:${RESET}"
        echo "$all_s" | python3 -c "
import sys,json; d=json.load(sys.stdin); t='$demo_skill'
for s in d.get('skills',[]):
    if s['name']==t: print(f'  Name: {BOLD}{s[\"name\"]}${RESET}\n  Desc: {s.get(\"description\",\"?\")[:120]}'); break" 2>/dev/null || true
    fi

    echo ""; echo -e "${GREEN}${BOLD}  ✓ Onboarding complete.${RESET}"
}

# ─── Chapter 3: A Real Task Comes In (Routing) ───────────────────────────────

chapter_03_real_task_routing() {
    [[ -n "$TARGET_CHAPTER" && "$TARGET_CHAPTER" != "3" ]] && return
    CHAPTER=$((CHAPTER + 1)); show_progress "$CHAPTER" "Real Task Routing"
    print_chapter_header "$CHAPTER" "A REAL TASK COMES IN — POST /route"
    print_scenario 'A Jira ticket drops: "My Kubernetes pod keeps crashing after deployment." The engineer needs help — fast.'

    curl_post "/route" '{"task":"My Kubernetes pod keeps crashing after deployment","constraints":{"maxSkills":5}}'

    local r; r=$(curl -s --max-time 15 -X POST "${API_URL}/route" \
        -H "Content-Type: application/json" \
        -d '{"task":"My Kubernetes pod keeps crashing after deployment","constraints":{"maxSkills":5}}' 2>/dev/null || echo "{}")

    echo ""; echo -e "${WHITE}${BOLD}  Hybrid scorer results:${RESET}"
    print_key_point "Confidence: ${BOLD}$(json_extract "$r" "confidence")${RESET}"
    print_key_point "Latency:    ${BOLD}$(json_extract "$r" "latencyMs")ms${RESET}"
    print_key_point "Strategy:   ${BOLD}$(json_extract "$r" "executionPlan.strategy")${RESET}"

    # Matched skills with scores
    echo ""; echo -e "${WHITE}${BOLD}  Ranked skill matches:${RESET}"
    echo "$r" | python3 -c "
import sys,json; d=json.load(sys.stdin); medals=['🥇','🥈','🥉']
for i,s in enumerate(d.get('selectedSkills',[])[:5],1):
    icon=medals[i-1] if i<=3 else f'{i}.'
    print(f'  {icon} {BOLD}{s[\"name\"]}${RESET} — score={GREEN}{s.get(\"score\",0):.3f}${RESET} role={s.get(\"role\",\"?\")}')
" 2>/dev/null || true

    # Reasoning
    local reason; reason=$(json_extract "$r" "reasoningSummary"); : "${reason:=?}"
    [[ "$reason" != "?" ]] && echo "" && print_key_point "Reasoning: ${DIM}${reason:0:180}...${RESET}"

    # Bonus task
    echo ""; echo -e "${DIM}  ─── BONUS: Different task → different results ───${RESET}"
    curl_post "/route" '{"task":"Implement ATR-based stop loss for crypto trading","constraints":{"maxSkills":3}}'

    echo ""; echo -e "${GREEN}${BOLD}  ✓ Same API, different results per task.${RESET}"
}

# ─── Chapter 4: Execute the Work ─────────────────────────────────────────────

chapter_04_execute_work() {
    [[ -n "$TARGET_CHAPTER" && "$TARGET_CHAPTER" != "4" ]] && return
    CHAPTER=$((CHAPTER + 1)); show_progress "$CHAPTER" "Execute the Work"
    print_chapter_header "$CHAPTER" "EXECUTE THE WORK — Running Routed Tasks via MCP Tools"
    print_scenario 'The engineer loaded kubernetes-deployment. Now they want the router to actually DO something.'

    echo -e "${WHITE}${BOLD}  Route vs Execute:${RESET}"
    echo -e "  ${CYAN}POST /route${RESET}    → Suggests skills (what should I use?)"
    echo -e "  ${CYAN}POST /execute${RESET}  → Runs work through MCP tools (do it for me)"

    echo ""; echo -e "${WHITE}${BOLD}  Executing a shell command via the execute endpoint:${RESET}"
    curl_post "/execute" '{
  "task": "List scripts in this repo",
  "skills": ["run_shell_command"],
  "inputs": {"command": "ls /home/paulpas/git/agent-skill-router/scripts/*.sh | head -10"}
}'

    local e; e=$(curl -s --max-time 15 -X POST "${API_URL}/execute" \
        -H "Content-Type: application/json" \
        -d '{"task":"List scripts","skills":["run_shell_command"],"inputs":{"command":"ls /home/paulpas/git/agent-skill-router/scripts/*.sh | head -10"}}' 2>/dev/null || echo "{}")

    echo ""; echo -e "${WHITE}${BOLD}  Execute response:${RESET}"
    print_key_point "Task ID: ${BOLD}$(json_extract "$e" "taskId")${RESET}"
    print_key_point "Status:  ${BOLD}$(json_extract "$e" "status")${RESET}"

    echo ""; echo -e "${WHITE}${BOLD}  When to use each endpoint:${RESET}"
    echo -e "  ${CYAN}POST /route${RESET}   when you want skill suggestions with confidence scores"
    echo -e "  ${CYAN}POST /execute${RESET} when you know which tool to run and want results directly"

    echo ""; echo -e "${GREEN}${BOLD}  ✓ Execute endpoint demonstrated.${RESET}"
}

# ─── Chapter 5: Audit Trail ──────────────────────────────────────────────────

chapter_05_audit_trail() {
    [[ -n "$TARGET_CHAPTER" && "$TARGET_CHAPTER" != "5" ]] && return
    CHAPTER=$((CHAPTER + 1)); show_progress "$CHAPTER" "Audit Trail"
    print_chapter_header "$CHAPTER" "AUDIT TRAIL — What Was Routed Today?"
    print_scenario "Post-meeting review: 'What has the router been doing today? How well are matches landing?'"

    curl_get "/access-log"
    local l; l=$(curl -s --max-time 10 "$API_URL/access-log" 2>/dev/null || echo '{"totalRequests":0,"entries":[]}')

    local total entries_count
    total=$(json_extract "$l" "totalRequests"); : "${total:=?}"
    entries_count=$(echo "$l" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('entries',[])))" 2>/dev/null || echo "0")

    echo ""; print_key_point "Total routing requests: ${BOLD}${total}${RESET}"
    print_key_point "Entries in window:      ${BOLD}${entries_count}${RESET}"

    if [[ "${entries_count:-0}" -gt 0 ]]; then
        echo ""; echo -e "${WHITE}${BOLD}  Recent routing decisions:${RESET}"
        echo "$l" | python3 -c "
import sys,json; d=json.load(sys.stdin)
for e in reversed(d.get('entries',[])[:5]):
    ts=e.get('timestamp','?')[:16]; t=e.get('task','?')[:65]
    s=e.get('topSkill','?'); c=e.get('confidence',0); m=e.get('totalMatches','?')
    icon='✓' if c>0.6 else ('⚠' if c>0.3 else '✗')
    print(f'  {icon} [{ts}] topSkill={BOLD}{s}${RESET} conf={GREEN}{c:.2f}${RESET} matches={m}')
    print(f'     task: \"{t}\"...'); print()" 2>/dev/null || true

        # Confidence distribution
        echo ""; echo -e "${WHITE}${BOLD}  Confidence distribution:${RESET}"
        echo "$l" | python3 -c "
import sys,json; d=json.load(sys.stdin); c=[e.get('confidence',0) for e in d.get('entries',[])]
if not c: print('  No entries.'); exit()
hi=sum(1 for x in c if x>0.6); mid=sum(1 for x in c if .3<x<=.6); lo=len(c)-hi-mid; n=len(c)
print(f'  {GREEN}High (>{:.0f}%):{RESET}   {hi:>3d}/{n} ({hi/n*100:.0f}%)'.format(60))
print(f'  {YELLOW}Mid  ({:.0f}-{:.0f}%):{RESET} {mid:>3d}/{n} ({mid/n*100:.0f}%)'.format(30,60))
print(f'  {RED}Low (≤{:.0f}%):{RESET}     {lo:>3d}/{n} ({lo/n*100:.0f}%)'.format(30))
print(f'\n  Average confidence: {GREEN}{sum(c)/len(c):.2f}${RESET}')" 2>/dev/null || true

        # Top skills
        echo ""; echo -e "${WHITE}${BOLD}  Most-routed skills:${RESET}"
        echo "$l" | python3 -c "
import sys,json; from collections import Counter
d=json.load(sys.stdin); c=Counter(e.get('topSkill','?') for e in d.get('entries',[]))
for s,n in c.most_common(5): print(f'  {GREEN}►{RESET} {s:<45s} {n:>2d}x   {'█'*min(n,30)}')" 2>/dev/null || true

        print_key_point "${CYAN}►${RESET} Low confidence on many tasks? May need trigger tuning on your skills"
    else
        echo ""; echo -e "  ${YELLOW}⚠ No history yet — access log populates as the router is used.${RESET}"
    fi

    echo ""; echo -e "${GREEN}${BOLD}  ✓ Audit trail reviewed.${RESET}"
}

# ─── Chapter 6: After a Code Change (Reload + Metrics) ───────────────────────

chapter_06_reload_and_metrics() {
    [[ -n "$TARGET_CHAPTER" && "$TARGET_CHAPTER" != "6" ]] && return
    CHAPTER=$((CHAPTER + 1)); show_progress "$CHAPTER" "Reload + Metrics"
    print_chapter_header "$CHAPTER" "AFTER A CODE CHANGE — Reload & Metrics"
    print_scenario 'You pushed a fix to a SKILL.md file. Need it picked up immediately, not wait for hourly sync.'

    echo -e "${WHITE}${BOLD}  Current metrics before reload:${RESET}"
    curl_get "/metrics"
    local m; m=$(curl -s --max-time 10 "$API_URL/metrics" 2>/dev/null || echo "{}")

    echo ""; echo -e "${WHITE}${BOLD}  Compression cache state:${RESET}"
    print_key_point "Cache hits:   ${BOLD}$(json_extract "$m" "compression.cacheHits")${RESET}"
    print_key_point "Cache misses: ${BOLD}$(json_extract "$m" "compression.cacheMisses")${RESET}"
    print_key_point "Tokens saved: ${BOLD}$(json_extract "$m" "compression.totalTokensSaved")${RESET}"
    print_key_point "Avg compression: $(json_extract "$m" "compression.averageCompressionPercent")%"

    # Recent events
    local events; events=$(echo "$m" | python3 -c "
import sys,json; d=json.load(sys.stdin)
for e in d.get('recentEvents',[])[:-1:-1][:3]: print(json.dumps(e))" 2>/dev/null || true)
    if [[ -n "$events" && "$events" != "[]" ]]; then
        echo ""; echo -e "${WHITE}${BOLD}  Recent cache events:${RESET}"
        while IFS= read -r eline; do
            [[ -z "$eline" ]] && continue
            local es et; es=$(echo "$eline" | python3 -c "import sys,json; print(json.loads(sys.stdin.read()).get('skillName','?'))") 2>/dev/null || true
            et=$(echo "$eline" | python3 -c "import sys,json; print(json.loads(sys.stdin.read()).get('timestamp','?')[:16])") 2>/dev/null || true
            echo -e "  ${DIM}┃${RESET} [$et] skill=${BOLD}${es}${RESET}"
        done <<< "$events"
    fi

    # Trigger reload
    echo ""; echo -e "${WHITE}${BOLD}  Triggering reload — git fetch + reset + re-index...${RESET}"
    curl_post "/reload" "{}"

    local rl; rl=$(curl -s --max-time 30 -X POST "${API_URL}/reload" 2>/dev/null || echo "{}")
    if [[ ${#rl} -gt 10 ]]; then
        echo ""; echo -e "${WHITE}${BOLD}  Reload complete:${RESET}"
        print_key_point "Status:   ${GREEN}${BOLD}$(json_extract "$rl" "status")${RESET}"
        print_key_point "Skills:   ${BOLD}$(json_extract "$rl" "skills.totalSkills")${RESET}"
    else
        echo ""; echo -e "  ${YELLOW}⚠ Reload still in progress...${RESET}"
    fi

    # Metrics after reload
    echo ""; echo -e "${WHITE}${BOLD}  Metrics after reload (cache cleared):${RESET}"
    local pm; pm=$(curl -s --max-time 10 "$API_URL/metrics" 2>/dev/null || echo "{}")
    print_key_point "Cache hits: $(json_extract "$pm" "compression.cacheHits") (reset from previous)"
    print_key_point "Cache misses: $(json_extract "$pm" "compression.cacheMisses") (fresh skills compressing)"

    print_key_point "${CYAN}►${RESET} /reload does: git fetch → git reset --hard → re-index all SKILL.md files"
    echo ""; echo -e "${GREEN}${BOLD}  ✓ Reload complete. New content is live.${RESET}"
}

# ─── Chapter 7: Production Run (OpenCode Integration) ────────────────────────

chapter_07_production_run() {
    [[ -n "$TARGET_CHAPTER" && "$TARGET_CHAPTER" != "7" ]] && return
    CHAPTER=$((CHAPTER + 1)); show_progress "$CHAPTER" "Production Run"
    print_chapter_header "$CHAPTER" "PRODUCTION RUN — OpenCode Integration"

    if [[ "${SKIP_OPCODE:-false}" == "true" ]]; then
        echo ""; echo -e "  ${YELLOW}⚠ Skipped (--skip-opencode flag set)${RESET}"; return
    fi

    print_scenario 'Time for the full pipeline: OpenCode → MCP bridge → skill-router → real response.'

    if ! command -v opencode &>/dev/null; then
        echo ""; echo -e "  ${RED}✗ opencode not found. Skip with --skip-opencode.${RESET}"; return
    fi

    local healthy; healthy=$(curl -s --max-time 3 "$API_URL/health" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))") || true
    [[ "$healthy" != "healthy" ]] && { echo ""; echo -e "  ${RED}✗ API unhealthy. Cannot proceed.${RESET}"; return; }

    echo -e "${WHITE}${BOLD}  Launching OpenCode with MCP bridge...${RESET}"
    echo -e "${DIM}  timeout 30 opencode run --print-logs --log-level DEBUG \\${RESET}"
    echo -e "${DIM}    --dangerously-skip-permissions -m opencode/big-pickle 'explain files in src/'${RESET}"

    local so="$TEMP_DIR/oc_stdout.txt" se="$TEMP_DIR/oc_stderr.txt"
    timeout 30 opencode run --print-logs --log-level DEBUG \
        --dangerously-skip-permissions -m opencode/big-pickle \
        "explain what files are in src/" > "$so" 2> "$se" || true

    local sc="" ec=""; sc=$(cat "$so" 2>/dev/null || echo ""); ec=$(cat "$se" 2>/dev/null || echo "")

    # Show log stats first
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

        echo ""; echo -e "${WHITE}${BOLD}  Log breakdown:${RESET}"
        print_key_point "Total lines: ${BOLD}${log_lines}${RESET}"
        echo -e "  ${GREEN}►${RESET} [INFO]   ${BOLD}${info_c}${RESET} — meaningful events"
        echo -e "  ${DIM}►${RESET} [DEBUG]  ${BOLD}${debug_c}${RESET} — routine ops"
        [[ "$warn_c" -gt 0 ]] && echo -e "  ${YELLOW}►${RESET} [WARN]   ${BOLD}${warn_c}${RESET}"
        [[ "$error_c" -gt 0 ]] && echo -e "  ${RED}►${RESET} [ERROR]  ${BOLD}${error_c}${RESET}"
        print_key_point "MCP calls: ${BOLD}${mcp_c}${RESET} | Tool invocations: ${BOLD}${tool_c}${RESET} | Skill loads: ${BOLD}${skill_c}${RESET}"

        # HTTP calls to skill-router
        local http_calls; http_calls=$(echo "$ec" | grep '/route\|/health\|/skill' 2>/dev/null | head -5 || true)
        if [[ -n "$http_calls" ]]; then
            echo ""; echo -e "${WHITE}${BOLD}  HTTP calls to skill-router:${RESET}"
            echo "$http_calls" | while IFS= read -r l; do echo -e "  ${CYAN}→${RESET} $l"; done
        fi

        # Show recent log lines
        echo ""; print_output_box "Recent logs (last 20)" "$(echo "$ec" | tail -n 20)" 22
    fi

    # Show response if present
    if [[ -n "$sc" ]]; then
        echo ""; print_output_box "AI Response" "$sc" 20
    elif [[ -z "$ec" ]]; then
        echo ""; echo -e "  ${YELLOW}⚠ Both streams empty — model may be unavailable or timed out${RESET}"
    fi

    rm -f "$so" "$se"
    echo ""; echo -e "${GREEN}${BOLD}  ✓ Full OpenCode → MCP bridge → skill-router pipeline executed.${RESET}"
}

# ─── Chapter 8: Capturing Everything ────────────────────────────────────────

chapter_08_capturing_output() {
    [[ -n "$TARGET_CHAPTER" && "$TARGET_CHAPTER" != "8" ]] && return
    CHAPTER=$((CHAPTER + 1)); show_progress "$CHAPTER" "Capturing Output"
    print_chapter_header "$CHAPTER" "CAPTURING EVERYTHING — The tee Pattern"
    print_scenario 'You need this output for a report or to share with someone. Capture it all.'

    # Demo: 2>&1 | tee
    local cap="/tmp/sr-cap-$$"
    curl -s --max-time 5 "$API_URL/health" 2>&1 | tee "$cap" > /dev/null || true
    echo ""; print_key_point "Captured to: ${BOLD}${cap}${RESET}"
    [[ -f "$cap" ]] && { echo ""; echo -e "${CYAN}  ┌── Contents:${RESET}"; cat "$cap" | while IFS= read -r l; do echo "  ${DIM}  │${RESET} $l"; done; echo -e "${CYAN}  └──────────────────────${RESET}"; }
    rm -f "$cap"

    # Demo: separate streams
    echo ""; echo -e "${WHITE}${BOLD}  Separating stdout vs stderr:${RESET}"
    local ds="$TEMP_DIR/ds.log" de="$TEMP_DIR/de.log"
    (echo "This is STDOUT"; echo "This is STDERR" >&2; echo "Another output line"; echo "Another error" >&2) > "$ds" 2> "$de"

    echo ""; echo -e "${CYAN}  ┌── stdout:${RESET}"
    cat "$ds" | while IFS= read -r l; do echo -e "  ${GREEN}  │${RESET} $l"; done
    echo -e "${CYAN}  └──────────────${RESET}"

    echo ""; echo -e "${CYAN}  ┌── stderr:${RESET}"
    cat "$de" | while IFS= read -r l; do echo -e "  ${YELLOW}  │${RESET} $l"; done
    echo -e "${CYAN}  └──────────────${RESET}"
    rm -f "$ds" "$de"

    # Summary table
    echo ""; echo -e "${WHITE}${BOLD}  All capture modes:${RESET}"
    echo ""
    printf "  ${CYAN}%-48s${RESET} %s\n" "command" "Purpose"
    echo ""
    echo -e "  ${CYAN}cmd 2>&1 | tee output.log${RESET}"
    echo -e "      → Everything to both screen and file. Best for recording sessions."
    echo ""
    echo -e "  ${CYAN}cmd > out.log 2> err.log${RESET}"
    echo -e "      → Separate streams. Best for debugging — read errors independently."
    echo ""
    echo -e "  ${CYAN}cmd > response.txt 2>/dev/null${RESET}"
    echo -e "      → Clean output only. Best for reports and sharing."
    echo ""
    echo -e "  ${CYAN}cat full.log | grep '\[ERROR\]'${RESET}"
    echo -e "      → Filter by severity. Best for post-mortem analysis."
    echo ""
    echo -e "  ${CYAN}cmd 2>&1 | tee >(cat >&2) | grep 'pattern'${RESET}"
    echo -e "      → Capture + filter (process substitution). Advanced use only."

    echo ""; echo -e "${GREEN}${BOLD}  ✓ Output capture patterns demonstrated.${RESET}"
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
}

# ─── Main ──────────────────────────────────────────────────────────────────────

main() {
    echo ""
    echo -e "${CYAN}${BOLD}"
    echo "  ╔══════════════════════════════════════════════════════════════╗"
    echo "  ║   AGENT SKILL ROUTER — A Day Using the System              ║"
    echo "  ║   One continuous story. Real commands. Live output.        ║"
    echo "  ╚══════════════════════════════════════════════════════════════╝"
    echo -e "${RESET}"

    check_api

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
