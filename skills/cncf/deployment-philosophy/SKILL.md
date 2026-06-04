---
name: deployment-philosophy
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: Architects multi-stage deployment strategies that balance speed, safety,
  and reliability through systematic risk assessment and controlled change delivery.
license: MIT
maturity: stable
metadata:
  completeness: 95
  content-types:
  - guidance
  - examples
  - do-dont
  domain: cncf
  exampleCount: 3
  maturity: stable
  output-format: code
  related-skills: blue-green-deployment,canary-deployment,deployment-orchestration,state-management,rollback-strategy,environment-parity
  role: reference
  scope: infrastructure
  triggers: deployment philosophy, release strategy, change management, deployment
    planning, cloud deployment, production release, blast radius, progressive delivery
  archetypes:
  - educational
  anti_triggers:
  - brainstorming
  - vague ideation
  - non-containerized architecture
  response_profile:
    verbosity: medium
    directive_strength: medium
    abstraction_level: tactical
version: "1.0.0"
---
# Cloud Deployment Philosophy

Mental model for designing safe, reliable, and fast deployment systems. Treats every deployment as a risk management exercise: minimize blast radius, maximize feedback velocity, and maintain irreversible safety nets at every stage.

## TL;DR Checklist

- [ ] Define acceptable blast radius before choosing a deployment strategy
- [ ] Ensure every deployment stage has a verified rollback path
- [ ] Instrument health checks before, during, and after deployment
- [ ] Validate environment parity between staging and production
- [ ] Measure deployment frequency vs. incident rate to calibrate risk tolerance

---

## When to Use

Use this skill when:

- **Designing a new deployment strategy** — You need to choose between blue-green, canary, or rolling approaches and need a principled framework
- **Evaluating release risk** — A planned change carries unusual risk (database schema change, API contract change) and you need to assess blast radius
- **Reviewing existing deployment practices** — You're auditing current deployment processes for safety gaps or reliability issues
- **Onboarding to production releases** — You're new to a team's deployment process and need to understand the risk model
- **Deciding deployment frequency** — You're debating whether to increase or decrease deployment frequency based on risk tolerance

---

## When NOT to Use

Avoid this skill for:

- **Implementing a specific deployment tool** — Use `blue-green-deployment`, `canary-deployment`, or `deployment-orchestration` for tactical patterns instead
- **Writing application code** — This skill focuses on release mechanics, not feature implementation
- **Simple single-service deployments with no state** — A simple restart may suffice; over-engineering deployment strategy for trivial changes adds friction without benefit

---

## Core Workflow

### 1. Assess Change Risk Profile

Classify the change by its potential impact on users, data, and system stability.

**Checkpoint:** You can articulate the maximum possible user impact of this change.

### 2. Define Acceptable Blast Radius

Determine how much harm the system can tolerate during a failed deployment. This depends on the change type, user base size, and business criticality.

**Checkpoint:** You have a numeric or qualitative statement of acceptable damage (e.g., "no data loss for more than 5% of users").

### 3. Select Deployment Strategy

Match the strategy to the blast radius:

| Blast Radius | Strategy | Rationale |
|---|---|---|
| Small (config change, no schema) | Rolling update | Fast, low risk, minimal overhead |
| Medium (new endpoints, backward-compatible) | Canary deployment | Gradual exposure with automated rollback |
| Large (schema change, data migration) | Blue-green | Instant rollback, full validation before switchover |
| Critical (payment, identity, data integrity) | Blue-green + manual gate | Human approval + instant rollback |

**Checkpoint:** Your chosen strategy directly limits blast radius to the acceptable level defined in Step 2.

### 4. Design Feedback Loops

Define what signals you'll watch during deployment and the thresholds that trigger rollback.

**Checkpoint:** Every deployment has at least three health signals (error rate, latency, business metric) with defined rollback thresholds.

### 5. Verify Rollback Path

Ensure you can reverse the deployment within the acceptable recovery time objective (RTO).

**Checkpoint:** You have tested the rollback path within the last 30 days. Untested rollback is not a rollback path.

### 6. Execute with Observability

Deploy while watching the feedback loops. Move at the pace of understanding, not the pace of automation.

**Checkpoint:** You can see the impact of the deployment in real-time before proceeding to the next stage.

---

## Implementation Patterns

### Pattern 1: Blast Radius Assessment

Before choosing any deployment strategy, explicitly calculate the blast radius. This is the set of users, data, and services affected by a single failed deployment.

#### ❌ BAD — Implicit, Unassessed Blast Radius

```bash
# ❌ BAD: No risk assessment before deployment — just push and hope
# No assessment of who gets hit by failure
# No rollback plan
# No feedback loops defined
kubectl set image deployment/app app=app:v2.0.0
kubectl rollout restart deployment/app
echo "Deployed v2.0.0"
```

**What's wrong:**
- No assessment of user impact if the deployment fails
- No defined rollback mechanism
- No feedback to detect failure quickly
- No gate between deployment stages

#### ✅ GOOD — Explicit Blast Radius Assessment

```bash
# ✅ GOOD: Assess blast radius before deployment
# Classifies change risk and determines acceptable impact boundaries

# --- Configuration ---
CHANGE_FILE="/tmp/deployment-change.json"

# Input JSON describing the change:
# {
#   "affected_user_percentage": 0.05,
#   "has_schema_change": false,
#   "has_data_migration": false
# }

# --- Risk Classification ---
classify_risk() {
  local affected_pct schema_change data_migration risk
  affected_pct=$(jq -r '.affected_user_percentage' "$CHANGE_FILE")
  schema_change=$(jq -r '.has_schema_change' "$CHANGE_FILE")
  data_migration=$(jq -r '.has_data_migration' "$CHANGE_FILE")

  if [[ "$schema_change" == "true" || "$data_migration" == "true" ]]; then
    risk="CRITICAL"
  elif [[ "$(echo "$affected_pct > 0.5" | bc -l)" -eq 1 ]]; then
    risk="MEDIUM"
  else
    risk="LOW"
  fi

  echo "$risk"
}

# --- Blast Radius Calculator ---
assess_blast_radius() {
  local risk affected_pct
  risk=$(classify_risk)
  affected_pct=$(jq -r '.affected_user_percentage' "$CHANGE_FILE")

  case "$risk" in
    CRITICAL)
      echo "Risk: CRITICAL"
      echo "Max affected users: 1%"
      echo "Max data loss: 0 rows"
      echo "Max recovery: 5 minutes"
      echo "Manual gate: REQUIRED"
      # For critical changes, restrict canary to 1%
      jq '.canary_weight = 0.01 | .requires_manual_gate = true' "$CHANGE_FILE" \
        > "${CHANGE_FILE}.assessed"
      ;;
    MEDIUM)
      echo "Risk: MEDIUM"
      echo "Max affected users: 25%"
      echo "Max recovery: 30 minutes"
      echo "Manual gate: optional"
      jq '.canary_weight = 0.25 | .requires_manual_gate = false' "$CHANGE_FILE" \
        > "${CHANGE_FILE}.assessed"
      ;;
    *)
      echo "Risk: LOW"
      echo "Max affected users: ${affected_pct} (full impact)"
      echo "Max recovery: 60 minutes"
      echo "Manual gate: not required"
      jq '.canary_weight = 0.05 | .requires_manual_gate = false' "$CHANGE_FILE" \
        > "${CHANGE_FILE}.assessed"
      ;;
  esac
}

# --- Execute Assessment (must run before deployment) ---
assess_blast_radius

# --- Pre-deployment validation ---
DEPLOY_CHANGE=$(jq '.has_schema_change' "$CHANGE_FILE")
if [[ "$DEPLOY_CHANGE" == "true" ]]; then
  echo "ERROR: Schema change detected. Ensure rollback path is tested."
  echo "Run: ./scripts/test-rollback.sh --schema-change"
  exit 1
fi
```

### Pattern 2: Progressive Rollout Gates

Implement staged deployment gates that progressively increase exposure while monitoring health signals.

#### ✅ GOOD — Progressive Rollout with Gates

```bash
# ✅ GOOD: Progressive rollout with automated health-gated stages
# Each stage increases traffic exposure only if health signals pass

# --- Configuration ---
APP_NAME="my-service"
ROLLOUT_STATE="/tmp/rollout-$(basename $APP_NAME).state"
HEALTH_ENDPOINT="http://localhost:9090/metrics"

# Define rollout stages (bash array of "stage:traffic_pct:observation_min")
STAGES=(
  "canary:0.05:10"
  "early_adopters:0.25:15"
  "half_traffic:0.50:30"
  "full_traffic:1.0:0"
)

# --- State management ---
get_current_stage() {
  if [[ -f "$ROLLOUT_STATE" ]]; then
    jq -r '.current_stage_index' "$ROLLOUT_STATE" 2>/dev/null || echo "-1"
  else
    echo "-1"
  fi
}

save_state() {
  local stage_index=$1
  jq -n --argjson idx "$stage_index" \
    '{current_stage_index: $idx, app: "'$APP_NAME'", updated_at: now}' \
    > "$ROLLOUT_STATE"
}

# --- Health check function ---
check_health() {
  local stage=$1
  local success_rate p99_latency

  # Query metrics endpoint (Prometheus-style or app-specific)
  success_rate=$(curl -s "$HEALTH_ENDPOINT" \
    | jq -r --arg s "$stage" '.metrics[] | select(.name == "http_success_rate" and .stage == $s) | .value')
  p99_latency=$(curl -s "$HEALTH_ENDPOINT" \
    | jq -r --arg s "$stage" '.metrics[] | select(.name == "p99_latency_ms" and .stage == $s) | .value')

  # Gate thresholds per stage
  case "$stage" in
    canary)
      # Strictest: 99.9% success, 500ms latency
      [[ "$(echo "${success_rate:-0} >= 0.999" | bc -l)" -eq 1 ]] && \
      [[ "$(echo "${p99_latency:-9999} < 500" | bc -l)" -eq 1 ]]
      ;;
    early_adopters)
      # Slightly relaxed: 99.5% success, 800ms latency
      [[ "$(echo "${success_rate:-0} >= 0.995" | bc -l)" -eq 1 ]] && \
      [[ "$(echo "${p99_latency:-9999} < 800" | bc -l)" -eq 1 ]]
      ;;
    half_traffic)
      # Relaxed: 99% success, 1000ms latency
      [[ "$(echo "${success_rate:-0} >= 0.99" | bc -l)" -eq 1 ]] && \
      [[ "$(echo "${p99_latency:-9999} < 1000" | bc -l)" -eq 1 ]]
      ;;
    *)
      # Full traffic: 99% success
      [[ "$(echo "${success_rate:-0} >= 0.99" | bc -l)" -eq 1 ]]
      ;;
  esac
}

# --- Advance to next stage ---
advance_stage() {
  local current_idx next_idx next_stage next_traffic next_obs
  current_idx=$(get_current_stage)
  next_idx=$((current_idx + 1))

  # Already at full rollout?
  if [[ $next_idx -ge ${#STAGES[@]} ]]; then
    echo "Already at full rollout (100% traffic)"
    return 0
  fi

  IFS=':' read -r next_stage next_traffic next_obs <<< "${STAGES[$next_idx]}"

  echo "Checking health gate for stage: $next_stage (traffic: $((next_traffic * 100))%)"

  if check_health "$next_stage"; then
    echo "Health gate PASSED for $next_stage"
    save_state "$next_idx"

    # Apply new traffic weight to canary
    kubectl patch deployment "$APP_NAME" -p \
      "{\"spec\":{\"template\":{\"metadata\":{\"labels\":{\"canary-weight\":\"$next_idx\"}}}}}"

    if [[ $next_obs -gt 0 ]]; then
      echo "Observation period: ${next_obs} minutes. Waiting..."
      sleep $((next_obs * 60))
    fi

    return 0
  else
    echo "Health gate FAILED for $next_stage — rolling back"
    rollback
    return 1
  fi
}

# --- Rollback helper ---
rollback() {
  echo "Rolling back to previous stage..."
  local prev_idx
  prev_idx=$(get_current_stage)
  prev_idx=$((prev_idx > 0 ? prev_idx - 1 : 0))
  IFS=':' read -r stage traffic obs <<< "${STAGES[$prev_idx]}"
  kubectl patch deployment "$APP_NAME" \
    --type='json' -p="[{'op':'replace','path':'/spec/template/metadata/labels/canary-weight','value':'$prev_idx'}]"
  echo "Rolled back to $stage ($((traffic * 100))% traffic)"
}

# --- Main rollout loop ---
echo "Starting progressive rollout for $APP_NAME"
echo "Stages: ${STAGES[*]}"

while advance_stage; do
  current_idx=$(get_current_stage)
  if [[ $current_idx -ge $((${#STAGES[@]} - 1)) ]]; then
    echo "Rollout COMPLETE — all traffic on new version"
    break
  fi
  echo "Stage $current_idx complete. Advancing..."
  sleep 5  # Short delay between stage checks
done
```

### Pattern 3: Deployment Decision Matrix

A systematic decision framework for selecting deployment strategies based on change characteristics.

#### ✅ GOOD — Deployment Decision Matrix

```bash
# ✅ GOOD: Systematic deployment strategy selection based on change characteristics
# Matches strategy to risk, not to tooling preference or convenience

# --- Decision function ---
# Usage: select_strategy --schema-change --data-migration --user-facing --rollback-tested
#        select_strategy --user-facing --no-canary-infra
#        select_strategy --internal-change

select_deployment_strategy() {
  local has_schema=false has_data_migration=false user_facing=false
  local rollback_tested=false has_canary=false

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --schema-change)    has_schema=true; shift ;;
      --data-migration)   has_data_migration=true; shift ;;
      --user-facing)      user_facing=true; shift ;;
      --rollback-tested)  rollback_tested=true; shift ;;
      --canary-infra)     has_canary=true; shift ;;
      --internal-change)  user_facing=false; has_schema=false; shift ;;
      *) shift ;;
    esac
  done

  # Critical path: data integrity requires instant rollback capability
  if [[ "$has_schema" == true && "$has_data_migration" == true ]]; then
    if [[ "$rollback_tested" != true ]]; then
      echo "Strategy: blue-green"
      echo "Rationale: Data migration without tested rollback — blue-green ensures instant revert"
      echo "Manual gate: yes"
      echo "Estimated rollback: 30s"
      return
    fi
  fi

  # High-risk changes with canary infrastructure
  if [[ "$has_schema" == true && "$has_canary" == true ]]; then
    echo "Strategy: canary"
    echo "Rationale: Schema change with canary support — gradual exposure with automated rollback"
    echo "Manual gate: yes"
    echo "Estimated rollback: 120s"
    return
  fi

  # User-facing changes without canary infra
  if [[ "$user_facing" == true && "$has_canary" != true ]]; then
    echo "Strategy: blue-green"
    echo "Rationale: User-facing deployment without canary infrastructure — parallel environments for safe switching"
    echo "Manual gate: $([ "$rollback_tested" != true ] && echo 'yes' || echo 'no')"
    echo "Estimated rollback: 60s"
    return
  fi

  # Low-risk internal changes
  if [[ "$user_facing" != true && "$has_schema" != true ]]; then
    echo "Strategy: rolling"
    echo "Rationale: Low-risk internal change — rolling update minimizes deployment time"
    echo "Manual gate: no"
    echo "Estimated rollback: 300s"
    return
  fi

  # Default: conservative approach
  echo "Strategy: canary"
  echo "Rationale: Defaulting to canary — gradual exposure balances speed and safety"
  echo "Manual gate: $([ "$rollback_tested" != true ] && echo 'yes' || echo 'no')"
  echo "Estimated rollback: 120s"
}

# --- Example invocations ---
echo "=== Schema + data migration, untested rollback ==="
select_deployment_strategy --schema-change --data-migration --user-facing

echo ""
echo "=== User-facing, no canary infra, rollback tested ==="
select_deployment_strategy --user-facing --rollback-tested

echo ""
echo "=== Low-risk internal config change ==="
select_deployment_strategy --internal-change --rollback-tested

echo ""
echo "=== Schema change with canary infrastructure ==="
select_deployment_strategy --schema-change --user-facing --canary-infra --rollback-tested
```

---

## Constraints

### MUST DO

- **Always assess blast radius before choosing a deployment strategy** — Never deploy without knowing who and what could be harmed
- **Ensure every deployment has a tested rollback path** — An untested rollback is a liability, not a safety net
- **Instrument before deploying** — At minimum, track error rate, latency p99, and one business metric
- **Maintain environment parity** — If staging cannot reproduce production failure, your staging deployment is not a valid safety test
- **Define rollback thresholds before deployment** — Know what signal breach means "go back" before you go forward
- **Document the deployment decision** — Record the risk assessment, chosen strategy, and rationale for auditability

### MUST NOT DO

- **Never deploy without feedback loops** — Blind deployment is gambling, not engineering
- **Never bypass rollback testing** — "We've never needed to rollback" is a dangerous survivorship bias
- **Never assume staging == production parity** — Always verify environment parity before relying on staging tests
- **Never increase deployment frequency without proportional observability investment** — More deployments with same visibility = more incidents
- **Never use "recreate" strategy for stateful services** — Destroying pods with local state is data destruction

---

## Philosophy Alignment

This skill aligns with the **5 Laws of Elegant Defense** by treating deployment as a layered defense system:

### Early Exit
- Deployment is halted at the first health gate breach — no progression to later stages
- Risk assessment fails fast: if blast radius exceeds threshold, deployment never starts

### Parse Don't Validate
- Change metadata is parsed and classified at the boundary (schema change, data migration, user-facing)
- Internal deployment logic trusts parsed classifications, never re-validates

### Atomic Predictability
- Each deployment stage is independently testable: advance_stage, rollback, health_check are pure decisions
- Same health signals + same gate configuration = same decision, every time

### Fail Fast
- Any health signal below threshold immediately triggers rollback — no degradation into uncertain states
- Rollback is the default failure mode, not a manual afterthought

### Intentional Naming
- Strategy names (`ROLLING`, `CANARY`, `BLUE_GREEN`) describe the actual deployment behavior
- Gate names (`canary`, `early_adopters`, `half_traffic`) communicate intent, not implementation

---

## Related Skills

| Skill Name | When to Use | Relationship |
|------------|------------|--------------|
| `blue-green-deployment` | Use **after** this skill when choosing blue-green for your risk profile | Tactical: implements the blue-green strategy |
| `canary-deployment` | Use **after** this skill when choosing canary for your risk profile | Tactical: implements canary strategy with traffic splitting |
| `deployment-orchestration` | Use **after** this skill for multi-service deployment sequencing | Tactical: coordinates deployments across service boundaries |
| `state-management` | Use **alongside** for deployments involving schema or data changes | Complementary: handles the data consistency aspect |
| `rollback-strategy` | Use **before** this skill to define your rollback architecture | Prerequisite: your rollback capability constrains strategy choice |

---

## Output Template

When applying this skill, your output should contain:

1. **Change Classification** — Risk level (LOW/MEDIUM/HIGH/CRITICAL) with rationale
2. **Blast Radius** — Maximum acceptable impact, derived from change characteristics
3. **Strategy Recommendation** — Chosen deployment strategy with justification
4. **Health Gates** — Required signals and thresholds for each deployment stage
5. **Rollback Plan** — Verified rollback path with estimated recovery time

Example:
```
## Deployment Strategy Recommendation

**Change Classification:** HIGH (new endpoint + database index)
**Blast Radius:** 5% of users (canary stage), 100% (full rollout)
**Strategy:** Canary with progressive gates
**Health Gates:** success_rate > 99.9%, p99_latency < 500ms
**Rollback Plan:** Automated — traffic shifts back to v1.2.3 in < 30s

```

---

**Skill Version:** 1.0.0  
**Created:** 2026-05-15  
**Maturity:** stable  
**Completeness:** 95%
