---
name: deployment-orchestration
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: Orchestrates complex multi-stage deployments with dependency management,
  sequencing rules, and failure handling across interconnected services.
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
  related-skills: deployment-philosophy,canary-deployment,blue-green-deployment,state-management
  role: implementation
  scope: infrastructure
  triggers: deployment orchestration, multi-stage deployment, deployment pipeline,
    service dependency, deployment sequencing, coordinated deployment
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
# Deployment Orchestration

Orchestrates coordinated multi-service deployments with dependency-aware sequencing, failure containment, and automatic rollback across service boundaries. Ensures that when multiple services deploy together, their compatibility constraints are respected.

## TL;DR Checklist

- [ ] Map service dependencies before defining deployment order
- [ ] Define deployment batches — groups of services that can deploy together
- [ ] Set health gates at each batch boundary
- [ ] Ensure rollback handles cross-service compatibility
- [ ] Validate API contract compatibility before deploying consumers

---

## When to Use

Use this skill when:

- **Multiple services deploy together** — A change spans 2+ services that must be deployed in coordination
- **Service dependencies exist** — Service A depends on Service B's API contract, and the change may break that contract
- **Database and application deploy together** — Schema changes in a database must be deployed alongside application code that uses it
- **Coordinated rollout is safer** — Deploying services independently risks incompatible versions running simultaneously

---

## When NOT to Use

Avoid this skill for:

- **Single-service deployments** — If only one service is changing, orchestration overhead is wasted
- **Services with no shared dependencies** — Independent services should deploy independently
- **Frequent independent updates** — If services deploy 10+ times per day independently, orchestration becomes a bottleneck

---

## Core Workflow

### 1. Map Service Dependencies

Document all inter-service dependencies: API contracts, shared data schemas, event streams, and configuration dependencies. Build a dependency graph.

**Checkpoint:** You have a complete dependency graph showing which services depend on which others.

### 2. Define Deployment Batches

Group services into batches based on dependency direction. Services with no mutual dependencies can deploy in parallel. Services that depend on each other must deploy sequentially.

**Checkpoint:** Each batch's internal order respects dependency constraints, and batches between each other can run in parallel.

### 3. Define Compatibility Windows

For each dependency pair, define the compatibility window: what versions of each service can coexist during the transition.

**Checkpoint:** You know the exact version compatibility matrix for every dependency pair.

### 4. Execute with Health Gates

Deploy each batch, wait for health gates, then proceed to the next batch. Parallel batches execute simultaneously when their health gates pass.

**Checkpoint:** All services in the batch pass health checks before the next batch starts.

### 5. Handle Failures

If any service in a batch fails its health check, stop all parallel batches, roll back the failed batch, and decide whether to retry or abort.

**Checkpoint:** Rollback order is the reverse of deployment order to maintain compatibility.

---

## Implementation Patterns

### Pattern 1: Dependency Graph and Batch Ordering

Build a dependency graph and compute deployment batches using topological sorting.

#### ❌ BAD — Linear Deployment Without Dependency Awareness

```bash
# ❌ BAD: Deploying services in arbitrary order ignores dependencies
# order-service depends on user-service API — deploying order first will fail
SERVICES=("payment-service" "user-service" "order-service" "notification-service")

for service in "${SERVICES[@]}"; do
  kubectl set image deployment/$service app=app:latest
  kubectl rollout status deployment/$service
done
# Problem: order-service might depend on user-service API
# Problem: notification-service might depend on order-service events
# Problem: payment-service might depend on both
# Deploying in this order risks incompatible versions running simultaneously
```

**What's wrong:**
- No dependency awareness — services deploy in arbitrary order
- Incompatible versions may run simultaneously during transition
- No rollback coordination across services
- Failure in one service leaves others in an inconsistent state

#### ✅ GOOD — Dependency-Aware Batch Deployment

```bash
# ✅ GOOD: Dependency-aware batch deployment with topological sort
# Services with no mutual dependencies deploy in parallel; dependent services deploy sequentially

# --- Dependency graph definition (JSON) ---
# {
#   "dependencies": {
#     "payment-service": ["user-service"],
#     "order-service": ["user-service", "payment-service"],
#     "notification-service": ["order-service"]
#   }
# }
DEPS_FILE="/tmp/dependency-graph.json"

# --- Topological sort using Kahn's algorithm ---
compute_batches() {
  local deps_file=$1
  local batch_dir
  batch_dir=$(mktemp -d)

  # Build adjacency list and in-degree count
  local all_services
  all_services=$(jq -r 'keys[]' "$deps_file")
  local service_count
  service_count=$(echo "$all_services" | wc -l)

  # Initialize in-degree for all services
  declare -A in_degree
  for svc in $all_services; do
    in_degree[$svc]=0
  done

  # Count in-degrees
  for svc in $all_services; do
    local deps
    deps=$(jq -r ".dependencies.\"$svc\" // [] | .[]" "$deps_file" 2>/dev/null)
    if [[ -n "$deps" ]]; then
      in_degree[$svc]=$(echo "$deps" | wc -l)
    fi
  done

  # Find initial zero in-degree services
  local batch_num=0
  local processed=0
  local remaining_services="$all_services"

  while [[ $processed -lt $service_count ]]; do
    local current_batch=()

    # Find services with in-degree 0
    for svc in $remaining_services; do
      if [[ ${in_degree[$svc]} -eq 0 ]]; then
        current_batch+=("$svc")
      fi
    done

    if [[ ${#current_batch[@]} -eq 0 ]]; then
      echo "❌ ERROR: Circular dependency detected among remaining services"
      echo "Remaining: $remaining_services"
      return 1
    fi

    # Record this batch
    local batch_id="batch-$batch_num"
    echo "${current_batch[*]}" > "$batch_dir/$batch_id"
    echo "  Batch $batch_num: ${current_batch[*]}"

    # Update in-degrees for next round
    for svc in "${current_batch[@]}"; do
      # Find services that depend on this one
      for other_svc in $remaining_services; do
        local deps
        deps=$(jq -r ".dependencies.\"$other_svc\" // [] | .[]" "$deps_file" 2>/dev/null)
        if echo "$deps" | grep -qx "$svc"; then
          in_degree[$other_svc]=$(( ${in_degree[$other_svc]} - 1 ))
        fi
      done
    done

    # Remove processed services
    remaining_services=$(echo "$remaining_services" | grep -v -x "$(printf '%s\n' "${current_batch[@]}")")
    processed=$((processed + ${#current_batch[@]}))
    batch_num=$((batch_num + 1))
  done

  # Output batch files
  echo "$batch_dir"
}

# --- Health check function ---
check_service_health() {
  local service=$1
  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" \
    --max-time 5 "http://${service}:8080/health" 2>/dev/null)
  [[ "$http_code" == "200" ]]
}

# --- Deploy a single service ---
deploy_service() {
  local service=$1 version=$2
  echo "  Deploying $service → $version"
  kubectl set image deployment/$service app=$version
  kubectl rollout status deployment/$service --timeout=120s
}

# --- Rollback a single service ---
rollback_service() {
  local service=$1
  echo "  Rolling back $service"
  kubectl rollout undo deployment/$service
}

# --- Main orchestration ---
orchestrate_deployment() {
  local version=$1
  echo "=== Multi-Service Deployment Orchestration ==="
  echo "Target version: $version"
  echo "Computing deployment batches..."
  echo ""

  # Compute batches
  local batch_dir
  batch_dir=$(compute_batches "$DEPS_FILE")
  echo ""

  # Deploy each batch sequentially
  local batch_num=0
  local batch_file="$batch_dir/batch-$batch_num"
  local deployment_results=()

  while [[ -f "$batch_file" ]]; do
    local batch_services
    read -r -a batch_services < "$batch_file"
    echo "--- Batch $batch_num: ${batch_services[*]} ---"

    local batch_success=true
    local failed_service=""

    # Deploy all services in batch
    for service in "${batch_services[@]}"; do
      if ! deploy_service "$service" "$version"; then
        batch_success=false
        failed_service=$service
        break
      fi
    done

    if [[ "$batch_success" != true ]]; then
      echo "❌ Deployment failed for $failed_service — rolling back"
      for service in "${batch_services[@]}"; do
        rollback_service "$service"
      done
      return 1
    fi

    # Health gate for all services in batch
    for service in "${batch_services[@]}"; do
      if ! check_service_health "$service"; then
        echo "❌ Health check failed for $service — rolling back batch"
        for svc in "${batch_services[@]}"; do
          rollback_service "$svc"
        done
        return 1
      fi
    done

    echo "✅ Batch $batch_num passed — all services healthy"
    deployment_results+=("batch-$batch_num:PASS")
    batch_num=$((batch_num + 1))
    batch_file="$batch_dir/batch-$batch_num"
  done

  echo ""
  echo "=== Deployment Complete ==="
  for result in "${deployment_results[@]}"; do
    echo "  $result"
  done
}

# --- Rollback in reverse order ---
rollback_deployment() {
  local batch_dir=$1
  echo "=== Rolling back deployment (reverse order) ==="
  local batch_num=$(( $(ls "$batch_dir" | sort -t'-' -k2 -n | tail -1 | cut -d'-' -f2) - 1 ))
  while [[ $batch_num -ge 0 ]]; do
    local batch_file="$batch_dir/batch-$batch_num"
    if [[ -f "$batch_file" ]]; then
      read -r -a batch_services < "$batch_file"
      echo "Rolling back batch $batch_num: ${batch_services[*]}"
      for service in "${batch_services[@]}"; do
        rollback_service "$service"
      done
    fi
    batch_num=$((batch_num - 1))
  done
}

# --- Usage ---
# orchestrate_deployment "app:v2.0.0"
```

### Pattern 2: Compatibility Window Manager

Track version compatibility windows to ensure safe transitions during deployment.

#### ✅ GOOD — Version Compatibility Validation

```bash
# ✅ GOOD: Validate version compatibility before deploying each service
# Checks that target version is compatible with currently running dependencies

# --- Compatibility windows (JSON) ---
# Defines which version combinations are safe for each service dependency pair
COMPLIANCE_FILE="/tmp/compatibility-windows.json"
# [
#   {
#     "provider": "user-service",
#     "consumer": "order-service",
#     "provider_min": "1.0.0",
#     "provider_max": "1.5.0",
#     "consumer_min": "2.0.0",
#     "consumer_max": "2.5.0"
#   }
# ]

# --- Version comparison (simple semver string comparison) ---
version_in_range() {
  local version=$1 min_ver=$2 max_ver=$3
  [[ "$version" > "$min_ver" || "$version" == "$min_ver" ]] && \
  [[ "$version" < "$max_ver" || "$version" == "$max_ver" ]]
}

# --- Validate a service deployment against compatibility windows ---
validate_deployment() {
  local service=$1 target_version=$2 running_versions_file=$3

  echo "Validating deployment: $service@$target_version"

  local violations=()

  # Check provider windows (service is the provider)
  while IFS= read -r window; do
    local provider consumer provider_min provider_max consumer_min consumer_max
    provider=$(echo "$window" | jq -r '.provider')
    consumer=$(echo "$window" | jq -r '.consumer')
    provider_min=$(echo "$window" | jq -r '.provider_min')
    provider_max=$(echo "$window" | jq -r '.provider_max')
    consumer_min=$(echo "$window" | jq -r '.consumer_min')
    consumer_max=$(echo "$window" | jq -r '.consumer_max')

    if [[ "$provider" == "$service" ]]; then
      local running_consumer
      running_consumer=$(jq -r ".\"$consumer\" // empty" "$running_versions_file")
      if [[ -n "$running_consumer" ]]; then
        if ! version_in_range "$target_version" "$provider_min" "$provider_max"; then
          violations+=("Deploying $service@$target_version incompatible with $consumer@$running_consumer (requires $consumer@$consumer_min-$consumer_max)")
        fi
      fi
    fi

    # Check consumer windows (service is the consumer)
    if [[ "$consumer" == "$service" ]]; then
      local running_provider
      running_provider=$(jq -r ".\"$provider\" // empty" "$running_versions_file")
      if [[ -n "$running_provider" ]]; then
        if ! version_in_range "$target_version" "$consumer_min" "$consumer_max"; then
          violations+=("Deploying $service@$target_version incompatible with $provider@$running_provider (requires $provider@$provider_min-$provider_max)")
        fi
      fi
    fi
  done < <(jq -c '.[]' "$COMPLIANCE_FILE")

  if [[ ${#violations[@]} -gt 0 ]]; then
    echo "❌ Compatibility violations:"
    for v in "${violations[@]}"; do
      echo "   - $v"
    done
    return 1
  else
    echo "✅ Compatible with all running services"
    return 0
  fi
}

# --- Get running versions from cluster ---
get_running_versions() {
  local services=$@
  local versions_json="{}"

  for service in $services; do
    local version
    version=$(kubectl get deployment "$service" -o jsonpath='{.spec.template.metadata.labels.version}' 2>/dev/null)
    if [[ -n "$version" ]]; then
      versions_json=$(echo "$versions_json" | jq --arg s "$service" --arg v "$version" '. + {($s): $v}')
    fi
  done

  echo "$versions_json"
}

# --- Usage ---
# running=$(get_running_versions user-service order-service payment-service notification-service)
# echo "$running" > /tmp/running-versions.json
# validate_deployment order-service "2.1.0" /tmp/running-versions.json
```

### Pattern 3: Deployment State Machine

Track the state of a multi-service deployment for observability and recovery.

#### ✅ GOOD — File-Based Deployment State Tracking

```bash
# ✅ GOOD: Track multi-service deployment state for observability and recovery
# Uses file-based state machine for crash recovery and audit trail

# --- State file configuration ---
DEPLOYMENT_ID="deploy-$(date +%Y%m%d-%H%M%S)"
STATE_DIR="/tmp/deployment-state/$DEPLOYMENT_ID"
STATE_FILE="$STATE_DIR/state.json"
HISTORY_FILE="$STATE_DIR/history.json"

# --- Initialize state ---
init_state() {
  local total_batches=$1
  mkdir -p "$STATE_DIR"

  jq -n \
    --arg id "$DEPLOYMENT_ID" \
    --arg phase "planning" \
    --argjson total "$total_batches" \
    --arg started "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '{
      deployment_id: $id,
      phase: $phase,
      current_batch: "",
      total_batches: $total,
      completed_batches: 0,
      failed_service: "",
      error: "",
      started_at: $started,
      completed_at: null
    }' > "$STATE_FILE"

  echo "[]" > "$HISTORY_FILE"
}

# --- Record state transition ---
record_state() {
  local phase=$1 batch_id=${2:-}
  local timestamp
  timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  # Update main state
  local state
  state=$(cat "$STATE_FILE")
  state=$(echo "$state" | jq --arg p "$phase" --arg b "$batch_id" '.phase = $p | .current_batch = $b')

  # Add to history
  local history
  history=$(cat "$HISTORY_FILE")
  jq --arg ts "$timestamp" --argjson s "$state" \
    '. + [{timestamp: $ts, state: $s}]' "$HISTORY_FILE" > "${HISTORY_FILE}.tmp"
  mv "${HISTORY_FILE}.tmp" "$HISTORY_FILE"

  echo "$state" > "$STATE_FILE"
}

# --- Advance batch ---
advance_batch() {
  local batch_id=$1

  local state
  state=$(cat "$STATE_FILE")
  local completed
  completed=$(echo "$state" | jq -r '.completed_batches')

  echo "Advancing batch: $batch_id (completed: $((completed + 1)))"
  jq --arg b "$batch_id" '.current_batch = $b | .completed_batches += 1 | .phase = "verifying"' \
    "$STATE_FILE" > "${STATE_FILE}.tmp"
  mv "${STATE_FILE}.tmp" "$STATE_FILE"

  record_state "verifying" "$batch_id"
}

# --- Verify complete ---
verify_complete() {
  echo "Verification phase complete"
  jq '.phase = "deploying"' "$STATE_FILE" > "${STATE_FILE}.tmp"
  mv "${STATE_FILE}.tmp" "$STATE_FILE"
  record_state "deploying"
}

# --- Mark failure ---
mark_failed() {
  local service=$1 error=$2
  local timestamp
  timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  jq --arg s "$service" --arg e "$error" --arg t "$timestamp" \
    '.phase = "failed" | .failed_service = $s | .error = $e | .completed_at = $t' \
    "$STATE_FILE" > "${STATE_FILE}.tmp"
  mv "${STATE_FILE}.tmp" "$STATE_FILE"

  record_state "failed"
}

# --- Mark rollback ---
mark_rollback() {
  echo "Beginning rollback phase"
  jq '.phase = "rolling_back"' "$STATE_FILE" > "${STATE_FILE}.tmp"
  mv "${STATE_FILE}.tmp" "$STATE_FILE"
  record_state "rolling_back"
}

# --- Mark complete ---
mark_complete() {
  local timestamp
  timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  jq --arg t "$timestamp" '.phase = "complete" | .completed_at = $t' \
    "$STATE_FILE" > "${STATE_FILE}.tmp"
  mv "${STATE_FILE}.tmp" "$STATE_FILE"

  record_state "complete"
}

# --- Get state ---
get_state() {
  cat "$STATE_FILE" 2>/dev/null || echo "{}"
}

get_progress() {
  local state
  state=$(get_state)
  local total completed
  total=$(echo "$state" | jq -r '.total_batches')
  completed=$(echo "$state" | jq -r '.completed_batches')
  if [[ "$total" -eq 0 ]]; then
    echo "0%"
  else
    echo "$(( (completed * 100) / total ))%"
  fi
}

# --- Usage ---
# init_state 3
# advance_batch "batch-0"
# verify_complete
# mark_complete
# get_state | jq .    # View current state
# cat "$HISTORY_FILE" | jq .  # View state history
```

---

## Configuration Examples

### Deployment Configuration

```yaml
deployment:
  strategy: batch_with_gates
  parallel_limit: 3  # Max services deploying simultaneously
  health_gate:
    min_healthy_instances: 0.8
    error_rate_threshold: 0.01
    latency_p99_threshold_ms: 500
  rollback:
    auto_rollback: true
    on_failure: all_previous_batches
    order: reverse_topological
  compatibility:
    require_validation: true
    window_timeout_hours: 24
```

---

## Constraints

### MUST DO

- **Always map dependencies before deployment** — Unknown dependencies are the most dangerous kind
- **Compute deployment order from the dependency graph** — Never guess deployment order
- **Validate compatibility before each batch** — Check version compatibility between running and deploying versions
- **Use reverse topological order for rollback** — Rollback must undo dependencies before dependents
- **Track deployment state for recovery** — If a deployment crashes mid-way, you need to know where it stopped
- **Define health gates for every batch** — No batch proceeds without health verification

### MUST NOT DO

- **Never deploy dependent services in the same batch** — If service B depends on service A, they must be in different batches
- **Never skip health gates to "save time"** — Fast failures are good; unverified deployments are liabilities
- **Never assume backward compatibility without checking** — Explicitly document and validate compatibility windows
- **Never deploy more services in a batch than necessary** — Larger batches = larger blast radius
- **Never deploy without a rollback plan** — If you can't rollback, you can't deploy

---

## Philosophy Alignment

This skill adheres to the **5 Laws of Elegant Defense**:

### Early Exit
- Deployment halts at the first health gate failure — no progression to subsequent batches
- Compatibility validation fails fast — incompatible versions never reach deployment

### Parse Don't Validate
- Dependency graph is parsed and computed once at the start
- Internal logic trusts the topological sort result, never re-validates

### Atomic Predictability
- Batch deployment is independently testable: same dependencies + same versions = same batch order
- Compatibility check is a pure function — same inputs always produce same result

### Fail Fast
- Any service health failure stops all parallel batches immediately
- Compatibility violation halts deployment before any service is deployed

### Intentional Naming
- `DependencyGraph`, `ServiceBatch`, `CompatibilityWindow` — names describe domain concepts
- `rollback_order()` vs `compute_batches()` — operations are self-documenting

---

## Related Skills

| Skill Name | When to Use | Relationship |
|------------|------------|--------------|
| `deployment-philosophy` | Use **before** this skill to determine if multi-service orchestration is needed | Prerequisite: strategy assessment |
| `canary-deployment` | Use **alongside** when individual services within a batch use canary | Complementary: canary within orchestration |
| `blue-green-deployment` | Use **alongside** when services use blue-green for zero-downtime | Complementary: blue-green within orchestration |
| `state-management` | Use **alongside** when database/schema changes coordinate with application deployment | Complementary: data + code coordination |

---

## Output Template

When applying this skill, your output should contain:

1. **Dependency Graph** — Service dependencies and deployment batches
2. **Compatibility Windows** — Version compatibility for each dependency pair
3. **Deployment Sequence** — Ordered list of batches with parallel groups
4. **Health Gates** — Per-batch health check criteria
5. **Rollback Plan** — Reverse-order rollback with compatibility verification

---

**Skill Version:** 1.0.0  
**Created:** 2026-05-15  
**Maturity:** stable  
**Completeness:** 95%
