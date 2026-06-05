#!/usr/bin/env bash
# Validates a SKILL.md file against stub detection rules and structural
# compliance requirements.
#
# Usage:
#   ./scripts/validate_skill.sh skills/coding/my-skill/SKILL.md        # structural + static checks
#   ./scripts/validate_skill.sh --llm skills/coding/my-skill/SKILL.md  # + LLM quality check
#
# Exit codes: 0=PASS, 1=FAIL
#
# Two-phase validation:
#   Phase 1 (Python) — structural checks via yaml.safe_load
#   Phase 2 (Bash)   — existing stub-detection checks

set -euo pipefail

LLM_CHECK=false
SKILL_FILE=""

for arg in "$@"; do
    case "$arg" in
        --llm) LLM_CHECK=true ;;
        *) SKILL_FILE="$arg" ;;
    esac
done

if [ -z "$SKILL_FILE" ]; then
    echo "Usage: validate_skill.sh [--llm] <path/to/SKILL.md>" >&2
    exit 1
fi

if [ ! -f "$SKILL_FILE" ]; then
    echo "❌ File not found: $SKILL_FILE" >&2
    exit 1
fi

# ── PHASE 1: Structural checks (Python) ─────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Capture both stdout and stderr, and get the real exit code.
# set -e is temporarily disabled so we can inspect the result.
set +e
STRUCT_RESULT=$("$SCRIPT_DIR/validate_skill_yaml.py" "$SKILL_FILE" 2>&1)
STRUCT_EXIT=$?
set -e

if [ $STRUCT_EXIT -ne 0 ]; then
    echo "❌ FAIL: $SKILL_FILE (structural checks)" >&2
    echo "$STRUCT_RESULT" | grep '^✗' >&2
    echo "" >&2
    echo "   See SKILL_FORMAT_SPEC.md for requirements." >&2
    exit 1
fi

# If we get here, structural checks passed. Show brief status.
echo "✅ Structural checks passed: $(echo "$STRUCT_RESULT" | grep 'RESULT: PASS' || true)"
echo ""

# ── PHASE 2: Existing stub-detection checks (bash, unchanged) ────────────────
PASS=true
REASONS=()

# Stub sentinel
if grep -qF "Implementing this specific pattern or feature" "$SKILL_FILE"; then
    PASS=false
    REASONS+=("Stub sentinel string found: 'Implementing this specific pattern or feature'")
fi

# File size
content_bytes=$(wc -c < "$SKILL_FILE")
if [ "$content_bytes" -lt 3000 ]; then
    PASS=false
    REASONS+=("File too small: ${content_bytes} bytes (minimum 3000)")
fi

# Code blocks for implementation skills
if grep -q "role: implementation" "$SKILL_FILE" 2>/dev/null; then
    # Use awk to count fenced code block markers; safe with set -e (no exit on no matches)
    code_block_count=$(grep -E '^\s*```' "$SKILL_FILE" 2>/dev/null | wc -l || true)
    code_block_count="${code_block_count//[[:space:]]/}"
    # Each code block has opening + closing fence = 2 lines per block; need >= 2 blocks = >= 4 lines
    if [ "${code_block_count:-0}" -lt 4 ]; then
        PASS=false
        block_pairs=$(( ${code_block_count:-0} / 2 ))
        REASONS+=("Implementation skill has fewer than 2 code blocks (found ${block_pairs})")
    fi
fi

# Generic Core Workflow detection
generic_patterns=("Identify the specific use case" "Apply the pattern or technique" "Validate and test the implementation" "Iterate based on results")
generic_count=0
for pattern in "${generic_patterns[@]}"; do
    if grep -qiF "$pattern" "$SKILL_FILE" 2>/dev/null; then
        ((generic_count++)) || true
    fi
done
if [ "$generic_count" -ge 2 ]; then
    PASS=false
    REASONS+=("Generic Core Workflow detected (${generic_count}/4 stub phrases found)")
fi

# Advanced routing metadata presence
if ! grep -q "archetypes:" "$SKILL_FILE" 2>/dev/null; then
    PASS=false
    REASONS+=("Missing archetypes in metadata — required for intent-aware skill selection")
fi

if ! grep -q "anti_triggers:" "$SKILL_FILE" 2>/dev/null; then
    PASS=false
    REASONS+=("Missing anti_triggers in metadata — required to prevent generic skill dominance")
fi

if ! grep -q "response_profile:" "$SKILL_FILE" 2>/dev/null; then
    PASS=false
    REASONS+=("Missing response_profile in metadata — required for output quality matching")
fi

# Report bash check results
if [ "$PASS" = false ]; then
    echo "❌ FAIL: $SKILL_FILE (static checks)" >&2
    for reason in "${REASONS[@]}"; do
        echo "   • $reason" >&2
    done
    echo "" >&2
    echo "   See SKILL_FORMAT_SPEC.md for requirements (routing metadata is mandatory)." >&2
    exit 1
fi

# ── PHASE 3: LLM quality check (optional, unchanged) ────────────────────────
if [ "$LLM_CHECK" = true ]; then
    OPENCODE="${OPENCODE_BIN:-$HOME/.opencode/bin/opencode}"

    if [ ! -x "$OPENCODE" ]; then
        echo "⚠️  opencode not found at $OPENCODE — skipping LLM check" >&2
        echo "✅ PASS (structural + static — stub-free, routing-metadata present): $SKILL_FILE"
        exit 0
    fi

    VALIDATION_PROMPT="You are validating a SKILL.md file. Respond with EXACTLY ONE LINE — nothing else.

FAIL this skill if ANY are true:
1. Core Workflow section has only vague steps with no real commands, file paths, or code
2. MUST DO / MUST NOT DO section is absent or contains only generic advice like 'follow best practices'
3. Code examples are empty pseudocode with no real implementation (e.g., 'your code here', 'implement logic')
4. Triggers are only ultra-generic single words with no domain-specific phrases

PASS the skill if it has: real working code, specific command-line steps, and domain-specific constraints.

Respond with EXACTLY one of:
PASS
FAIL: <one sentence naming the specific problem>"

    echo "🤖 Running LLM quality check on $SKILL_FILE..."

    llm_verdict=$("$OPENCODE" run \
        --pure \
        --format json \
        --model "llamacpp/qwen3-coder-next-8_0" \
        -f "$SKILL_FILE" \
        "$VALIDATION_PROMPT" 2>/dev/null | \
        python3 -c "
import sys, json
last_text = ''
for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        event = json.loads(line)
    except json.JSONDecodeError:
        continue
    if event.get('type') == 'text':
        text = event.get('part', {}).get('text', '')
        if text:
            last_text = text
# Get only the first line of the response (verdict line)
verdict = last_text.strip().split('\n')[0].strip()
print(verdict)
" 2>/dev/null || echo "UNKNOWN")

    if echo "$llm_verdict" | grep -qE "^FAIL:"; then
        echo "❌ LLM FAIL: $SKILL_FILE" >&2
        echo "   $llm_verdict" >&2
        echo "" >&2
        echo "   See SKILL_FORMAT_SPEC.md for requirements (routing metadata is mandatory)." >&2
        exit 1
    elif echo "$llm_verdict" | grep -qE "^PASS"; then
        echo "✅ PASS (structural + static + LLM — stub-free, routing-metadata present): $SKILL_FILE"
    else
        echo "⚠️  LLM verdict unclear ('$llm_verdict') — treating as PASS" >&2
        echo "✅ PASS (structural + static, LLM unclear — stub-free, routing-metadata present): $SKILL_FILE"
    fi
else
    echo "✅ PASS (structural + static — stub-free, routing-metadata present): $SKILL_FILE"
fi

exit 0
