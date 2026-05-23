---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent bash scripting with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: bash-scripting, bash scripting, how do i bash-scripting, orchestrate bash-scripting,
    automate bash-scripting, agent bash-scripting
  archetypes:
  - orchestration
  - strategic
  anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: tactical
  version: 1.0.0
name: bash-scripting
------
# Bash Scripting

Orchestrates intelligent skill selection and execution for bash scripting workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

## TL;DR Checklist

- [ ] Parse all inputs at boundary before processing (Law 2)
- [ ] Handle edge cases with early returns at function top (Law 1)
- [ ] Fail immediately with descriptive errors on invalid states (Law 4)
- [ ] Return new data structures, never mutate inputs (Law 3)
- [ ] Implement minimum 2-level fallback chain for all skill executions
- [ ] Log all skill selections with context for full audit trail
- [ ] Validate skill metadata and dependencies before selection
- [ ] Update confidence scores after each execution for learning


┌───────────────────────────────────────────────────────────────────────────────┐
│                              Orchestration Flow                                               │
└───────────────────────────────────────────────────────────────────────────────┘

  User Request
      ↓
┌─────────────────┐
│  Parse Request  │
│  & Extract      │
│  Features       │
└────────┬────────┘
         ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    Evaluate Available Skills                                │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Skill A      │  │ Skill B      │  │ Skill C      │              │
│  │ - Match Score│  │ - Match Score│  │ - Match Score│              │
│  │ - Confidence │  │ - Confidence │  │ - Confidence │              │
│  │ - History    │  │ - History    │  │ - History    │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                 │                       │
│         └─────────────────┴─────────────────┘                       │
│                          ↓                                          │
│                   Select Best Skill                               │
└─────────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────┐
│  Execute Skill  │
└────────┬────────┘
         ↓
┌─────────────────┐
│  Handle Result  │
└────────┬────────┘
         ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    Error Handling & Fallback                                  │
│                                                                     │
│  Success? ────────► Return Result                                  │
│                                                                     │
│  Fail? ────────┐                                                    │
│                ↓                                                    │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │               Fallback Chain                                    │      │
│  │                                                             │      │
│  │  1. Retry with adjusted parameters                          │      │
│  │  2. Try Alternative Skill (if available)                    │      │
│  │  3. Defer to Human Operator (if critical)                   │      │
│  │  4. Log & Return Error                                      │      │
│  └──────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘

## When to Use

Use this skill when:

- Orchestrating multi-step workflows that require skill delegation
- Implementing adaptive skill routing based on confidence scores
- Building fallback mechanisms for failed skill executions
- Creating intelligent task decomposition and parallel execution
- Designing skill dependency graphs with automatic resolution
- Implementing skill selection with historical performance weighting
- Building agent systems that need to self-organize around tasks

## When NOT to Use

Avoid this skill for:

- Direct task execution without orchestration needs - use individual skills instead
- High-frequency trading scenarios where latency must be minimized - the selection overhead may be prohibitive
- Simple linear workflows without branching or fallback requirements
- Cases where skill metadata is unavailable or unreliable


## Core Workflow

1. **Parse and Analyze Request** - Extract intent, entities, and constraints from user input.
   **Checkpoint:** All required parameters must be present and in valid format before proceeding.

2. **Score Available Skills** - Calculate match scores using multi-factor algorithm:
   - Text similarity between request and skill triggers
   - Historical success rate for similar tasks
   - Skill availability and health status
   - Required dependencies and their availability
   
   **Checkpoint:** Skip to fallback if no skill scores above threshold.

3. **Select Optimal Skill** - Choose skill with highest score that meets minimum confidence.
   **Checkpoint:** Verify skill has not been disabled or deprecated.

4. **Execute with Fallback** - Run skill execution wrapped in retry and fallback logic.
   **Checkpoint:** Log all execution attempts for audit trail.

5. **Return or Fallback** - Either return successful result or apply fallback chain:
   - Retry with adjusted parameters
   - Try alternative skill from `related-skills`
   - Defer to human operator for critical tasks
   
   **Checkpoint:** Record outcome with timing and confidence metadata.

## Implementation Patterns

### Pattern 1: Skill Selection Logic

```bash
#!/usr/bin/env bash
# Pattern 1: Bash Scripting with Early Exit & Input Validation
# Implements Law 1 (Early Exit) and Law 2 (Make Illegal States Unrepresentable)

set -euo pipefail
SCRIPT_NAME="$(basename "$0")"
LOG_FILE="/var/log/${SCRIPT_NAME}.log"

# Guard clause: Validate required arguments immediately (Law 1)
if [[ $# -lt 2 ]]; then
    echo "Usage: $SCRIPT_NAME <target_dir> <backup_prefix>" >&2
    exit 1
fi

TARGET_DIR="$1"
BACKUP_PREFIX="$2"

# Validate state: Ensure target exists and is a directory (Law 2)
if [[ ! -d "$TARGET_DIR" ]]; then
    echo "ERROR: Target directory '$TARGET_DIR' does not exist or is not a directory." >&2
    exit 2
fi

# Parse and sanitize inputs - create immutable state snapshot
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="${BACKUP_PREFIX}_${TIMESTAMP}.tar.gz"
BACKUP_PATH="${TARGET_DIR}/backups/${BACKUP_NAME}"

# Create backup directory if missing (atomic state transition)
mkdir -p "${TARGET_DIR}/backups"

# Execute core logic with strict error handling
echo "Starting backup of ${TARGET_DIR} to ${BACKUP_PATH}..."
if tar -czf "$BACKUP_PATH" -C "$(dirname "$TARGET_DIR")" "$(basename "$TARGET_DIR")"; then
    echo "SUCCESS: Backup completed at $(date)"
    # Log success with metadata for audit trail
    echo "$(date -Iseconds) | SUCCESS | ${BACKUP_NAME}" >> "$LOG_FILE"
else
    echo "ERROR: tar command failed with exit code $?" >&2
    exit 3
fi
```


### Pattern 2: Execution with Fallback

```bash
#!/usr/bin/env bash
# Pattern 2: Bash Execution with Fallback Chain & Retry Logic
# Implements Law 4 (Fail Fast, Fail Loud) and adaptive fallback routing

set -euo pipefail
MAX_RETRIES=3
RETRY_DELAY=2

# Function: Execute primary command with retry logic
execute_with_retry() {
    local cmd="$1"
    local attempt=0

    while (( attempt < MAX_RETRIES )); do
        if eval "$cmd"; then
            return 0
        fi
        attempt=$((attempt + 1))
        if (( attempt < MAX_RETRIES )); then
            echo "WARNING: Attempt $attempt failed. Retrying in ${RETRY_DELAY}s..." >&2
            sleep "$RETRY_DELAY"
        fi
    done
    return 1
}

# Fallback chain implementation
run_fallback_chain() {
    local primary_cmd="$1"
    local fallback_cmd="$2"
    local critical_task="$3"

    # Attempt primary execution
    if execute_with_retry "$primary_cmd"; then
        echo "Primary execution succeeded."
        return 0
    fi

    echo "Primary execution exhausted retries. Initiating fallback chain..." >&2

    # Level 1: Retry with adjusted parameters (e.g., reduced concurrency)
    local adjusted_cmd="${primary_cmd} --concurrency=1"
    if execute_with_retry "$adjusted_cmd"; then
        echo "Fallback Level 1 (adjusted parameters) succeeded."
        return 0
    fi

    # Level 2: Try alternative command/skill
    if [[ -n "$fallback_cmd" ]]; then
        if execute_with_retry "$fallback_cmd"; then
            echo "Fallback Level 2 (alternative command) succeeded."
            return 0
        fi
    fi

    # Level 3: Critical task failure - escalate to human operator
    if [[ "$critical_task" == "true" ]]; then
        echo "CRITICAL: All fallbacks exhausted. Escalating to human operator." >&2
        # Trigger alert mechanism
        curl -s -X POST "https://hooks.example.com/alert" \
            -H "Content-Type: application/json" \
            -d "{\"task\":\"$primary_cmd\",\"status\":\"failed\",\"escalated\":true}" || true
        return 2
    fi

    echo "ERROR: All fallbacks failed. Task aborted." >&2
    return 1
}

# Example usage
# run_fallback_chain "rsync -a /data /backup" "cp -r /data /backup" "false"
```

### MUST DO
- Always validate skill metadata before selection (Early Exit)
- Implement fallback chain with at least 2 levels (Fallback Skill + Human)
- Log all skill selections with full context for auditability
- Return new data structures instead of mutating inputs (Atomic Predictability)
- Fail immediately with descriptive errors on invalid states
- Update confidence scores after each execution for adaptive routing
- Reference `code-philosophy` (5 Laws of Elegant Defense) in all logic


### MUST NOT DO
- Select skills based on a single factor (e.g., only confidence score)
- Disable fallback mechanisms "temporarily" - this creates fragile systems
- Skip validation of skill dependencies before execution
- Return partial results - either complete success or clear failure
- Use magic numbers for confidence thresholds - make them configurable
- Cache skill selections without considering context changes


## TL;DR Checklist

- [ ] Parse all inputs at boundary before processing (Law 2)
- [ ] Handle edge cases with early returns at function top (Law 1)
- [ ] Fail immediately with descriptive errors on invalid states (Law 4)
- [ ] Return new data structures, never mutate inputs (Law 3)
- [ ] Implement minimum 2-level fallback chain for all skill executions
- [ ] Log all skill selections with context for full audit trail
- [ ] Validate skill metadata and dependencies before selection
- [ ] Update confidence scores after each execution for learning


## TL;DR for Code Generation

- Use guard clauses - return early on invalid input before doing work
- Return simple types (dict, str, int, bool, list) - avoid complex nested objects
- Cyclomatic complexity < 10 per function - split anything larger
- Handle null/empty cases explicitly at function top (Early Exit)
- Never mutate input parameters - return new dicts/objects
- Fail fast with descriptive errors - don't try to "patch" bad data
- Reference code-philosophy laws in comments for complex logic
- Include timing and confidence metadata in all return values


## Output Template

When applying this skill, produce:

1. **Selected Skills** - List of skill names with confidence scores
2. **Selection Rationale** - Why each skill was chosen (match score, history, availability)
3. **Execution Plan** - Order of execution with dependencies
4. **Fallback Strategy** - Which fallback skills will be tried and in what order
5. **Risk Assessment** - Any potential failure points and their impact
6. **Timing Estimates** - Expected latency including fallback scenarios


## Related Skills

| Skill | Purpose |
|