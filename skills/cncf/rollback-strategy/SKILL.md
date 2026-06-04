---
name: rollback-strategy
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: Designs and implements rollback strategies with data-aware rollback procedures,
  partial rollback capabilities, and automated rollback triggers for safe deployment
  recovery.
license: MIT
maturity: stable
metadata:
  completeness: 95
  content-types:
  - code
  - guidance
  - config
  - do-dont
  domain: cncf
  exampleCount: 3
  maturity: stable
  output-format: code
  related-skills: deployment-philosophy,blue-green-deployment,canary-deployment,state-management
  role: implementation
  scope: infrastructure
  triggers: rollback strategy, deployment rollback, release rollback, rollback automation,
    data rollback, partial rollback, rollback trigger, rollback procedure
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  - non-containerized architecture
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  version: 1.0.0
------
# Rollback Strategy

Designs and implements safe, data-aware rollback procedures for deployment recovery. Handles partial rollbacks, data consistency during rollback, and automated rollback triggers based on health signals.

## TL;DR Checklist

- [ ] Define rollback triggers for each deployment health signal
- [ ] Ensure rollback is tested at least once per quarter
- [ ] Plan data rollback before deployment — can you reverse the migration?
- [ ] Implement partial rollback for multi-service deployments
- [ ] Document rollback RTO (recovery time objective) and test against it

---

## When to Use

Use this skill when:

- **Designing rollback procedures for a new deployment strategy** — You need to know what happens when things go wrong
- **Implementing automated rollback triggers** — Health signals should trigger rollback without human intervention
- **Planning a high-risk deployment** — Database migration, data format change, or API contract change
- **Investigating a failed deployment** — You need to understand rollback options for the current situation
- **Auditing existing rollback capabilities** — You're reviewing whether your rollback procedures are adequate

---

## When NOT to Use

Avoid this skill for:

- **Simple deployments with instant rollback available** — If blue-green gives you instant rollback, detailed strategy is less critical
- **Stateless deployments with no data changes** — Replacing all instances with a previous version is sufficient
- **When the deployment has no known failure mode** — If nothing can go wrong, you don't need a rollback strategy

---

## Core Workflow

### 1. Identify Rollback Scope

Determine what needs to be rolled back: application code, database schema, cached data, configuration, or a combination.

**Checkpoint:** You know the full scope of what must revert to the previous state.

### 2. Define Rollback Triggers

For each health signal, define the threshold that triggers automatic rollback. Prioritize signals that indicate real user impact over cosmetic issues.

**Checkpoint:** Every deployment has at least one automated rollback trigger and one manual rollback gate.

### 3. Design Data Rollback Path

For any data change during deployment, define how to reverse it. Data rollback is harder than code rollback because it may involve partial writes, partial migrations, or corrupted data.

**Checkpoint:** You have a tested procedure for reversing every data change that the deployment introduces.

### 4. Implement Partial Rollback

For multi-service deployments, define what happens when only one service needs rollback. Other services must handle the version downgrade gracefully.

**Checkpoint:** Each service can handle being one version behind its dependencies.

### 5. Execute and Validate

When rollback is triggered, execute it and validate that the system is back to a known good state. Monitor for 5+ minutes post-rollback.

**Checkpoint:** All health signals return to baseline levels after rollback.

---

## Implementation Patterns

### Pattern 1: Automated Rollback Trigger System

Implement automated rollback based on health signal thresholds.

#### ❌ BAD — Manual Rollback Decision

```bash
# ❌ BAD: Waiting for human to notice and decide to rollback
# No automated health checks, no rollback triggers, no error monitoring
kubectl set image deployment/app app=app:v2.0.0
kubectl rollout status deployment/app
# If this breaks, someone has to:
# 1. Notice the error (users complain, or on-call gets paged)
# 2. Decide it's the deployment (could be anything)
# 3. Decide to rollback (not just restart, which loses state)
# 4. Execute the rollback (which takes minutes to hours)
# By then, hundreds of users are affected.
```

**What's wrong:**
- No automated detection of deployment failure
- No automated rollback — human decision latency adds minutes of user impact
- No signal correlation — can't distinguish deployment failure from unrelated outage
- No rollback validation — nobody confirms the rollback actually worked

#### ✅ GOOD — Automated Rollback with Signal Correlation

```bash
# ✅ GOOD: Automated rollback with health signal evaluation and cooldown
# Triggers evaluated continuously — any breach causes immediate rollback

# --- Configuration ---
APP_NAME="my-app"
PROMETHEUS_URL="http://prometheus:9090"
ROLLBACK_STATE="/tmp/rollback-state.json"
STATE_DIR="/tmp/rollback-tracker"

# Define rollback triggers (JSON)
# Each trigger has a metric, threshold, and action
TRIGGERS_FILE="/tmp/rollback-triggers.json"
# [
#   {"name": "error_rate", "metric": "http_errors_per_second", "threshold_fn": "v > 10", "cooldown": 60},
#   {"name": "latency", "metric": "request_latency_p99_ms", "threshold_fn": "v > 2000", "cooldown": 60},
#   {"name": "health_check", "metric": "health_check_status", "threshold_fn": "v != 200", "cooldown": 30}
# ]

# --- State management ---
init_state() {
  mkdir -p "$STATE_DIR"
  jq -n '{last_trigger_time: 0, rollback_count: 0, triggers_enabled: true}' > "$ROLLBACK_STATE"
}

get_cooldown_remaining() {
  local cooldown=$1
  local state
  state=$(cat "$ROLLBACK_STATE")
  local last_time elapsed remaining
  last_time=$(echo "$state" | jq -r '.last_trigger_time')
  elapsed=$(($(date +%s) - last_time))
  remaining=$((cooldown - elapsed))
  [[ $remaining -gt 0 ]] && echo "$remaining" || echo "0"
}

mark_trigger_fired() {
  jq '.last_trigger_time = now | .rollback_count += 1' "$ROLLBACK_STATE" > "${ROLLBACK_STATE}.tmp"
  mv "${ROLLBACK_STATE}.tmp" "$ROLLBACK_STATE"
}

# --- Get metric value from Prometheus ---
get_metric() {
  local metric_name=$1
  curl -s "${PROMETHEUS_URL}/api/v1/query" \
    --data-urlencode "query=${metric_name}" \
    | jq -r '.data.result[0].value[1] // "0"' 2>/dev/null
}

# --- Evaluate triggers ---
evaluate_triggers() {
  local state
  state=$(cat "$ROLLBACK_STATE")
  local triggers_enabled
  triggers_enabled=$(echo "$state" | jq -r '.triggers_enabled')

  if [[ "$triggers_enabled" != "true" ]]; then
    echo "Rollback triggers disabled — skipping evaluation"
    return 0
  fi

  local trigger_count
  trigger_count=$(jq 'length' "$TRIGGERS_FILE")

  for ((i=0; i<trigger_count; i++)); do
    local name metric threshold_fn cooldown
    name=$(jq -r ".[$i].name" "$TRIGGERS_FILE")
    metric=$(jq -r ".[$i].metric" "$TRIGGERS_FILE")
    threshold_fn=$(jq -r ".[$i].threshold_fn" "$TRIGGERS_FILE")
    cooldown=$(jq -r ".[$i].cooldown" "$TRIGGERS_FILE")

    # Check cooldown
    local remaining
    remaining=$(get_cooldown_remaining "$cooldown")
    if [[ "$remaining" != "0" ]]; then
      echo "  $name: cooldown active (${remaining}s remaining)"
      continue
    fi

    # Get metric value
    local value
    value=$(get_metric "$metric")
    value=${value:-0}

    # Evaluate threshold (using bash arithmetic or bc)
    local breached=false
    case "$metric" in
      *status*)
        [[ "$value" != "200" ]] && breached=true
        ;;
      *)
        # Numeric comparison
        local result
        result=$(echo "$value $threshold_fn" | bc -l 2>/dev/null)
        [[ "$result" == "1" ]] && breached=true
        ;;
    esac

    if [[ "$breached" == true ]]; then
      echo "🚨 ROLLBACK TRIGGER: $name ($metric=$value, $threshold_fn)"
      mark_trigger_fired
      execute_rollback "$name" "$metric" "$value"
      return 0
    else
      echo "  $name: OK ($metric=$value, $threshold_fn)"
    fi
  done

  echo "All triggers within thresholds"
  return 0
}

# --- Execute rollback ---
execute_rollback() {
  local triggered_by=$1 metric=$2 current_value=$3

  echo ""
  echo "=== AUTOMATED ROLLBACK INITIATED ==="
  echo "Triggered by: $triggered_by"
  echo "Metric: $metric = $current_value"
  echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo ""

  # Rollback: undo the deployment
  kubectl rollout undo deployment/"$APP_NAME"

  # Wait for rollback to complete
  kubectl rollout status deployment/"$APP_NAME" --timeout=120s

  # Verify rollback
  local new_status
  new_status=$(get_metric "health_check_status")
  if [[ "$new_status" == "200" ]]; then
    echo "✅ Rollback verified — health check restored"
  else
    echo "⚠️  Rollback completed but health check still failing ($new_status)"
  fi

  echo "=== ROLLBACK COMPLETE ==="
}

# --- Main monitoring loop ---
monitor_and_rollback() {
  local app=$1
  APP_NAME=$app
  init_state

  echo "Starting monitoring and auto-rollback for $APP_NAME"
  echo "Triggers: $(jq -r '.[].name' "$TRIGGERS_FILE" | tr '\n' ', ')"
  echo "---"

  while true; do
    evaluate_triggers
    sleep 10  # Check every 10 seconds
  done
}

# --- Usage ---
# monitor_and_rollback my-app  # Runs continuously until stopped
```

### Pattern 2: Data-Aware Rollback

Handle data changes during rollback — reversing migrations, cleaning up partial writes, and maintaining data consistency.

#### ✅ GOOD — Data-Aware Rollback Procedures

```bash
# ✅ GOOD: Data-aware rollback with idempotent steps and approval gates
# Handles schema changes, data migrations, and cache invalidation safely

# --- Configuration ---
DB_HOST="db-primary"
DB_NAME="app_db"
DB_USER="app_user"
DRY_RUN=false
APPROVED=false

# --- Data rollback step definitions (JSON) ---
# Each step defines the SQL, idempotency, and approval requirements
ROLLBACK_STEPS_FILE="/tmp/data-rollback-steps.json"
# [
#   {"name": "drop_backfilled_columns", "sql": "ALTER TABLE orders DROP COLUMN IF EXISTS shipping_street", "idempotent": true, "requires_approval": false},
#   {"name": "revert_data_format", "sql": "UPDATE orders SET address = old_address WHERE address IS NOT NULL", "idempotent": false, "requires_approval": true}
# ]

# --- Execute rollback steps in reverse order ---
execute_data_rollback() {
  local steps_file=$1
  local dry_run=$2
  local approved=$3

  echo "=== Data Rollback Execution ==="
  local total
  total=$(jq 'length' "$steps_file")
  echo "Total steps: $total"
  echo "Dry run: $dry_run | Approved: $approved"
  echo "---"

  local executed=()
  local skipped=()
  local completed_ids=()

  # Execute in reverse order (undo last change first)
  for ((i=total-1; i>=0; i--)); do
    local name sql idempotent requires_approval
    name=$(jq -r ".[$i].name" "$steps_file")
    sql=$(jq -r ".[$i].sql" "$steps_file")
    idempotent=$(jq -r ".[$i].idempotent" "$steps_file")
    requires_approval=$(jq -r ".[$i].requires_approval" "$steps_file")

    # Skip already-executed idempotent steps
    if [[ "$idempotent" == "true" ]]; then
      local already_done=false
      for done_id in "${completed_ids[@]}"; do
        if [[ "$done_id" == "$name" ]]; then
          already_done=true
          break
        fi
      done
      if $already_done; then
        echo "[SKIPPED] $name (already executed, idempotent)"
        skipped+=("$name")
        continue
      fi
    fi

    # Skip unapproved steps
    if [[ "$requires_approval" == "true" && "$approved" != "true" ]]; then
      echo "[SKIPPED] $name (requires manual approval)"
      skipped+=("$name")
      continue
    fi

    if [[ "$dry_run" == true ]]; then
      echo "[DRY RUN] $name: $sql"
      executed+=("$name")
      if [[ "$idempotent" == "true" ]]; then
        completed_ids+=("$name")
      fi
    else
      echo "[EXECUTING] $name: $sql"
      if psql -h "$DB_HOST" -d "$DB_NAME" -U "$DB_USER" -c "$sql" 2>&1; then
        echo "  ✅ Executed successfully"
        executed+=("$name")
        if [[ "$idempotent" == "true" ]]; then
          completed_ids+=("$name")
        fi
      else
        echo "  ❌ Failed — stopping rollback"
        return 1
      fi
    fi
  done

  echo "---"
  echo "Executed: ${executed[*]}"
  echo "Skipped: ${skipped[*]}"
  echo "=== Data Rollback Complete ==="
}

# --- Create rollback steps for schema changes ---
create_schema_rollback() {
  local table=$1 migration_backfilled=$2

  if [[ "$migration_backfilled" == true ]]; then
    # Columns were backfilled — safe to drop
    cat <<EOF
[{"name": "drop_backfilled_columns", "sql": "ALTER TABLE $table DROP COLUMN IF EXISTS new_column", "idempotent": true, "requires_approval": false}]
EOF
  else
    # Columns were NOT backfilled — requires approval
    cat <<EOF
[
  {"name": "warn_no_data_rollback", "sql": "-- WARNING: dropping unbackfilled columns loses data", "idempotent": false, "requires_approval": true},
  {"name": "drop_columns", "sql": "ALTER TABLE $table DROP COLUMN IF EXISTS new_column", "idempotent": true, "requires_approval": true}
]
EOF
  fi
}

# --- Create rollback steps for data migrations ---
create_data_migration_rollback() {
  local source_format=$1 target_format=$2 backfill_complete=$3

  if [[ "$backfill_complete" == true ]]; then
    # All data is in new format — safe to revert
    echo "[{\"name\": \"revert_data_format\", \"sql\": \"-- Revert from $target_format to $source_format\", \"idempotent\": false, \"requires_approval\": false}]"
  else
    # Not all data migrated — old code must handle both formats
    echo "[{\"name\": \"dual_format_read\", \"sql\": \"-- Ensure both $source_format and $target_format are readable\", \"idempotent\": true, \"requires_approval\": false}]"
  fi
}

# --- Usage ---
# create_schema_rollback "orders" true | jq . > "$ROLLBACK_STEPS_FILE"
# execute_data_rollback "$ROLLBACK_STEPS_FILE" false true
# create_data_migration_rollback "old_format" "new_format" true > "$ROLLBACK_STEPS_FILE"
```

### Pattern 3: Partial Rollback for Multi-Service Deployments

Handle partial rollback when only some services in a deployment need to revert.

#### ❌ BAD — All-or-Nothing Rollback

```bash
# ❌ BAD: Rolling back ALL services even when only one failed
# Unnecessary rollback of working services increases blast radius
SERVICES=("payment-service" "user-service" "order-service" "notification-service")
for service in "${SERVICES[@]}"; do
  kubectl rollout undo deployment/$service
done
# Problem: services that deployed successfully are needlessly rolled back
# Problem: other services that work fine lose their new features
# Problem: the rollback takes longer because more services revert
# Problem: more services in flux = higher chance of new failures
```

#### ✅ GOOD — Partial Rollback with Dependency Safety

```bash
# ✅ GOOD: Partial rollback — only rollback failed services
# Keep working services running, verify compatibility between mixed versions

# --- Configuration ---
STATE_FILE="/tmp/deployment-state/rolling.json"
COMPAT_FILE="/tmp/compatibility-windows.json"
PREVIOUS_VERSIONS_FILE="/tmp/previous-versions.json"

# --- Get service versions from cluster ---
get_service_versions() {
  local services=$@
  local versions="{}"
  for service in $services; do
    local version
    version=$(kubectl get deployment "$service" -o jsonpath='{.spec.template.metadata.labels.version}' 2>/dev/null)
    if [[ -n "$version" ]]; then
      versions=$(echo "$versions" | jq --arg s "$service" --arg v "$version" '. + {($s): $v}')
    fi
  done
  echo "$versions"
}

# --- Get previous versions from deployment history ---
get_previous_version() {
  local service=$1
  local previous
  previous=$(jq -r --arg s "$service" '.[$s] // "unknown"' "$PREVIOUS_VERSIONS_FILE")
  echo "$previous"
}

# --- Check version compatibility ---
check_compatibility() {
  local service=$1 current_version=$2 healthy_service=$3 healthy_version=$4

  local compatible
  compatible=$(jq -r --arg svc "$service" --arg ver "$current_version" \
    --arg hsvc "$healthy_service" --arg hver "$healthy_version" \
    '.[] | select(.provider == $svc and .consumer == $hsvc) |
       if (.provider_min <= $ver and $ver <= .provider_max and
           .consumer_min <= $hver and $hver <= .consumer_max) then "yes" else "no" end' \
    "$COMPAT_FILE" 2>/dev/null)

  [[ "$compatible" == "yes" ]]
}

# --- Plan partial rollback ---
plan_partial_rollback() {
  local failed_services=$@
  local current_versions
  current_versions=$(get_service_versions $failed_services)

  echo "=== Partial Rollback Plan ==="
  echo "Failed services: $failed_services"
  echo "---"

  for service in $failed_services; do
    local current_version target_version
    current_version=$(echo "$current_versions" | jq -r ".\"$service\" // \"unknown\"")
    target_version=$(get_previous_version "$service")

    if [[ "$current_version" == "$target_version" ]]; then
      echo "  $service: already on previous version ($target_version) — no rollback needed"
      continue
    fi

    # Check compatibility with healthy services
    local healthy_services
    healthy_services=$(echo "$current_versions" | jq -r 'keys[]' | grep -v "^${service}$")
    local needs_additional=()

    for healthy in $healthy_services; do
      local healthy_version
      healthy_version=$(echo "$current_versions" | jq -r ".\"$healthy\"")
      if ! check_compatibility "$service" "$current_version" "$healthy" "$healthy_version"; then
        needs_additional+=("$healthy")
      fi
    done

    if [[ ${#needs_additional[@]} -gt 0 ]]; then
      echo "  $service: $current_version → $target_version"
      echo "    ⚠️  Additional rollbacks needed for compatibility: ${needs_additional[*]}"
    else
      echo "  $service: $current_version → $target_version ✅"
    fi
  done
}

# --- Execute partial rollback ---
execute_partial_rollback() {
  local failed_services=$@

  echo "=== Executing Partial Rollback ==="

  for service in $failed_services; do
    local previous_version
    previous_version=$(get_previous_version "$service")

    echo "Rolling back $service: current → $previous_version"
    kubectl rollout undo deployment/$service --to-version="$previous_version" 2>/dev/null || \
    kubectl rollout undo deployment/$service

    # Verify rollback
    sleep 10
    local health_code
    health_code=$(curl -s -o /dev/null -w "%{http_code}" \
      --max-time 5 "http://${service}:8080/health" 2>/dev/null)

    if [[ "$health_code" == "200" ]]; then
      echo "  ✅ $service rollback verified"
    else
      echo "  ❌ $service health check failed after rollback (HTTP $health_code)"
    fi
  done

  echo "=== Partial Rollback Complete ==="
}

# --- Full rollback workflow ---
rollback_deployment() {
  local all_services=$@
  local failed_services=""

  # Step 1: Detect failed services via health checks
  echo "=== Health Check Phase ==="
  for service in $all_services; do
    local health_code
    health_code=$(curl -s -o /dev/null -w "%{http_code}" \
      --max-time 5 "http://${service}:8080/health" 2>/dev/null)
    if [[ "$health_code" != "200" ]]; then
      failed_services="$failed_services $service"
      echo "  ❌ $service: UNHEALTHY (HTTP $health_code)"
    else
      echo "  ✅ $service: healthy"
    fi
  done

  if [[ -z "$failed_services" ]]; then
    echo "All services healthy — no rollback needed"
    return 0
  fi

  # Step 2: Plan partial rollback
  plan_partial_rollback $failed_services

  # Step 3: Execute
  echo ""
  execute_partial_rollback $failed_services
}

# --- Usage ---
# rollback_deployment "payment-service" "user-service" "order-service" "notification-service"
```

---

## Configuration Examples

### Rollback Configuration

```yaml
rollback:
  auto_rollback:
    enabled: true
    cooldown_seconds: 60
    max_rollbacks_per_hour: 3
  triggers:
    - name: error_rate
      type: error_rate
      metric: http_errors_per_second
      threshold_fn: "lambda v: v > 10"
      cooldown: 60
    - name: latency
      type: latency_p99
      metric: request_latency_p99_ms
      threshold_fn: "lambda v: v > 2000"
      cooldown: 60
    - name: health_check
      type: health_check
      metric: health_check_status
      threshold_fn: "lambda v: v != 200"
      cooldown: 30
  data_rollback:
    require_approval_for_destructive: true
    idempotent_only: true
    max_rollback_time_minutes: 30
  partial_rollback:
    enabled: true
    check_compatibility: true
    rollback_affected_dependents: true
```

---

## Constraints

### MUST DO

- **Define automated rollback triggers before every deployment** — Manual rollback is too slow for user-facing failures
- **Test rollback procedures quarterly** — Untested rollback procedures are false confidence
- **Plan data rollback before deployment** — If you can't reverse the data change, you can't safely rollback
- **Implement partial rollback for multi-service deployments** — Don't rollback working services
- **Verify rollback completeness** — Monitor for 5+ minutes after rollback to confirm full recovery
- **Document rollback RTO and validate against it** — Know your recovery time objective

### MUST NOT DO

- **Never deploy without a rollback plan** — Deployment without rollback is not engineering
- **Never use non-idempotent rollback on production** — Retrying a failed rollback may cause data corruption
- **Never rollback data without verifying old code can read it** — Rolling back code that can't read the data is useless
- **Never skip cooldown between automatic rollbacks** — Rollback storms amplify failures
- **Never assume rollback is free** — Rollback has performance cost during data migration; plan for it

---

## Philosophy Alignment

This skill adheres to the **5 Laws of Elegant Defense**:

### Early Exit
- Rollback triggers evaluated continuously — any breach exits deployment immediately
- Non-idempotent rollback steps require manual approval — safety gate before execution

### Parse Don't Validate
- Rollback steps are parsed from declarative configuration
- Compatibility checking uses pre-parsed version pairs

### Atomic Predictability
- Each rollback step is independently testable
- Partial rollback decisions are pure functions — same failed services + same compatibility matrix = same rollback plan

### Fail Fast
- Any health trigger breach initiates rollback immediately — no waiting
- Cooldown prevents rollback storms — failure cascades are blocked early

### Intentional Naming
- `RollbackController`, `DataRollbackManager`, `PartialRollbackEngine` — names communicate scope
- `execute_partial_rollback()` vs `plan_rollback()` — planning vs execution is explicit

---

## Related Skills

| Skill Name | When to Use | Relationship |
|------------|------------|--------------|
| `deployment-philosophy` | Use **before** this skill to assess rollback requirements for your risk profile | Prerequisite: risk assessment |
| `blue-green-deployment` | Use **alongside** for instant rollback capabilities | Complementary: blue-green's instant switch is the simplest rollback |
| `canary-deployment` | Use **alongside** for automated rollback during canary stages | Complementary: canary's health gates trigger rollback |
| `state-management` | Use **alongside** for data-aware rollback procedures | Complementary: data rollback is the hardest part |

---

## Output Template

When applying this skill, your output should contain:

1. **Rollback Triggers** — Automated and manual triggers with thresholds
2. **Rollback Scope** — What needs to rollback (code, data, cache, config)
3. **Rollback Plan** — Step-by-step rollback procedure with ordering
4. **Data Rollback Strategy** — How to reverse data changes safely
5. **RTO Validation** — Estimated and actual recovery time

---

**Skill Version:** 1.0.0  
**Created:** 2026-05-15  
**Maturity:** stable  
**Completeness:** 95%
