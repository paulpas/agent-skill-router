---




name: canary-deployment
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: Orchestrates canary deployment strategies with gradual traffic promotion,
  automated health monitoring, and rollback triggers for progressive risk management.
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
  related-skills: deployment-philosophy,blue-green-deployment,deployment-orchestration
  role: implementation
  scope: infrastructure
  triggers: canary deployment, gradual rollout, progressive delivery, traffic splitting,
    automated rollback, metrics-driven deployment, progressive rollout
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
version: "1.0.0"




---



---
# Canary Deployment

Orchestrates gradual traffic promotion through a series of health-gated stages, automatically rolling back if any stage's metrics breach defined thresholds. Enables progressive risk management with minimal manual intervention.

## TL;DR Checklist

- [ ] Define canary stages with increasing traffic percentages
- [ ] Set health thresholds for each stage (error rate, latency, business metrics)
- [ ] Enable automated rollback on any threshold breach
- [ ] Run comparison tests between canary and baseline during each stage
- [ ] Monitor for the full observation period before advancing

---

## When to Use

Use this skill when:

- **Gradual risk exposure is preferred** — You want to limit the blast radius of each deployment stage
- **Automated rollback based on metrics** — You want health signals to drive deployment progression, not manual gates
- **A/B metric comparison is valuable** — You want to compare canary vs baseline metrics (latency, error rate, conversion)
- **Traffic splitting infrastructure is available** — You have a router or load balancer that supports weighted traffic distribution

---

## When NOT to Use

Avoid this skill for:

- **Database schema changes requiring instant rollback** — Canary's gradual nature means rollback takes time; use blue-green instead
- **No traffic splitting infrastructure** — Canary requires the ability to route different percentages of traffic to different versions
- **Deployments with long observation requirements** — If each stage needs hours of observation, canary becomes impractically slow
- **Single-instance deployments** — Canary requires at least two instances to split traffic between

---

## Core Workflow

### 1. Define Canary Stages

Design the rollout stages: traffic percentages, observation windows, and health thresholds for each stage. More critical services get more, finer-grained stages.

**Checkpoint:** Each stage has a clear advancement criterion and a clear rollback trigger.

### 2. Deploy Canary Instance

Deploy the new version to a subset of instances or a separate pool that the traffic router can direct a percentage of traffic to.

**Checkpoint:** Canary instance is healthy and receiving the defined initial traffic percentage.

### 3. Monitor and Compare

During each stage, compare canary metrics against the baseline (previous version). Look for regressions in error rate, latency, and business metrics.

**Checkpoint:** Canary metrics are within acceptable thresholds compared to baseline for the full observation window.

### 4. Advance or Rollback

If metrics pass: advance to the next stage with higher traffic percentage. If any metric breaches a threshold: immediately rollback all traffic to the baseline version.

**Checkpoint:** Decision is automated — no manual approval needed for advancement or rollback within defined thresholds.

### 5. Full Rollout

Once the final stage passes, all traffic flows to the new version. Decommission old instances.

**Checkpoint:** All baseline instances are decommissioned. Canary version is now the sole active version.

---

## Implementation Patterns

### Pattern 1: Canary Stage Manager

Implement a canary controller that manages stage progression with automated health-based decisions.

#### ❌ BAD — Manual Stage Management

```bash
# ❌ BAD: Manual stage management is slow, error-prone, and inconsistent
# No automation, no safety, no health checks between stages
kubectl patch ingress my-app -p '{"spec":{"rules":[{"http":{"paths":[{"path":"/","backend":{"service":{"name":"my-app-canary","port":{"number":80}},"weight":5}}]}}]}}'
sleep 300  # Wait 5 minutes — what if error rate spiked? Nobody noticed.

kubectl patch ingress my-app -p '{"spec":{"rules":[{"http":{"paths":[{"path":"/","backend":{"service":{"name":"my-app-canary","port":{"number":80}},"weight":25}}]}}]}}'
sleep 300  # What if p99 latency doubled? Still nobody noticed.

kubectl patch ingress my-app -p '{"spec":{"rules":[{"http":{"paths":[{"path":"/","backend":{"service":{"name":"my-app-canary","port":{"number":80}},"weight":50}}]}}]}}'
sleep 600  # Too late — half the users are on a potentially broken version

kubectl patch ingress my-app -p '{"spec":{"rules":[{"http":{"paths":[{"path":"/","backend":{"service":{"name":"my-app-canary","port":{"number":80}},"weight":100}}]}}]}}'
# What if the final stage failed? Now all users are on the broken version.
```

**What's wrong:**
- No automated health checks — failures go undetected until users complain
- No rollback — once traffic shifts forward, it never goes back
- No comparison — canary metrics are never compared to baseline
- Human fatigue — manual timing leads to inconsistent observation periods

#### ✅ GOOD — Automated Canary with Health Gates

```bash
# ✅ GOOD: Automated canary with health-gated stage progression
# Each stage validated against thresholds — any breach triggers immediate rollback

# --- Configuration ---
APP_NAME="my-app"
METRICS_ENDPOINT="http://prometheus:9090/api/v1/query"
CANARY_WEIGHTS_FILE="/tmp/canary-weights.json"
CANARY_STATE="/tmp/canary-state.json"
CANARY_VERSION="v2.0.0"
BASELINE_VERSION="v1.9.0"

# Define stages: name:traffic_pct:observation_seconds
STAGES=(
  "initial:5:300"
  "early_adopters:25:600"
  "half_traffic:50:900"
  "full:100:0"
)

# Define thresholds per stage (stored as JSON for jq queries)
THRESHOLDS='{
  "initial": {
    "error_rate": {"max": 0.01},
    "p99_latency_ms": {"max": 1000}
  },
  "early_adopters": {
    "error_rate": {"max": 0.02},
    "p99_latency_ms": {"max": 800},
    "conversion_rate": {"min": 0.04}
  },
  "half_traffic": {
    "error_rate": {"max": 0.02},
    "p99_latency_ms": {"max": 700}
  },
  "full": {
    "error_rate": {"max": 0.02}
  }
}'

# --- State management ---
init_state() {
  local stage_idx=$1
  local start_time
  start_time=$(date +%s)
  jq -n --argjson idx "$stage_idx" --argjson start "$start_time" \
    '{current_stage: $idx, stage_start_time: $start, status: "running"}' \
    > "$CANARY_STATE"
}

get_state() {
  jq '.' "$CANARY_STATE" 2>/dev/null
}

get_current_stage_idx() {
  jq -r '.current_stage' "$CANARY_STATE" 2>/dev/null || echo "0"
}

get_elapsed_seconds() {
  local stage_idx=$1
  local start_time current_time
  start_time=$(jq -r ".stage_start_times[$stage_idx] // empty" "$CANARY_STATE" 2>/dev/null)
  if [[ -z "$start_time" ]]; then
    start_time=$(jq -r '.stage_start_time' "$CANARY_STATE")
  fi
  current_time=$(date +%s)
  echo $((current_time - start_time))
}

# --- Metrics query function ---
get_metric() {
  local version=$1 metric_name=$2
  local query="rate(http_requests_total{version=\"$version\",job=\"app\"}[5m])"
  curl -s "${METRICS_ENDPOINT}?query=${query}" \
    | jq -r '.data.result[0].value[1] // "0"' 2>/dev/null
}

# --- Threshold checking ---
check_thresholds() {
  local stage_name=$1 canary_error_rate=$2 canary_latency=$3 canary_conversion=$4

  local max_error max_latency min_conversion
  max_error=$(jq -r --arg s "$stage_name" '.[$s].error_rate.max // 1' <<< "$THRESHOLDS")
  max_latency=$(jq -r --arg s "$stage_name" '.[$s].p99_latency_ms.max // 9999' <<< "$THRESHOLDS")
  min_conversion=$(jq -r --arg s "$stage_name" '.[$s].conversion_rate.min // 0' <<< "$THRESHOLDS")

  # Check error rate
  if [[ "$(echo "$canary_error_rate >= $max_error" | bc -l 2>/dev/null)" == "1" ]]; then
    echo "FAIL: error_rate ${canary_error_rate} >= max ${max_error}"
    return 1
  fi

  # Check latency
  if [[ "$(echo "$canary_latency >= $max_latency" | bc -l 2>/dev/null)" == "1" ]]; then
    echo "FAIL: p99_latency ${canary_latency}ms >= max ${max_latency}ms"
    return 1
  fi

  # Check conversion (only if defined for this stage)
  if [[ "$min_conversion" != "0" ]]; then
    if [[ "$(echo "$canary_conversion < $min_conversion" | bc -l 2>/dev/null)" == "1" ]]; then
      echo "FAIL: conversion_rate ${canary_conversion} < min ${min_conversion}"
      return 1
    fi
  fi

  echo "PASS"
  return 0
}

# --- Collect canary metrics ---
collect_canary_metrics() {
  local canary_error_rate canary_latency canary_conversion

  canary_error_rate=$(get_metric "$CANARY_VERSION" "error_rate")
  canary_latency=$(get_metric "$CANARY_VERSION" "p99_latency_ms")
  canary_conversion=$(get_metric "$CANARY_VERSION" "conversion_rate")

  echo "${canary_error_rate:-0} ${canary_latency:-0} ${canary_conversion:-0}"
}

# --- Update traffic weights ---
set_canary_weight() {
  local canary_weight=$1
  local baseline_weight
  baseline_weight=$(echo "100 - $canary_weight" | bc)

  echo "Setting canary weight: ${canary_weight}% canary, ${baseline_weight}% baseline"
  jq -n --argjson c "$canary_weight" --argjson b "$baseline_weight" \
    "{\"canary\": $c, \"baseline\": $b}" > "$CANARY_WEIGHTS_FILE"

  # Apply via ingress controller (nginx-style)
  kubectl patch ingress "$APP_NAME" -p "$(jq -n --argjson w "$canary_weight" \
    '{spec:{rules:[{http:{paths:[{path:"/",backend:{service:{name:"my-app-canary",port:{number:80}},weight:$w}}]}}]}}')"
}

# --- Rollback ---
rollback_canary() {
  echo "🔄 ROLLING BACK canary — routing 100% to baseline"
  set_canary_weight 0
  jq '.status = "rolled_back"' "$CANARY_STATE" > "${CANARY_STATE}.tmp" && mv "${CANARY_STATE}.tmp" "$CANARY_STATE"
}

# --- Advance to next stage ---
advance_canary() {
  local current_idx next_idx next_stage next_traffic next_obs
  current_idx=$(get_current_stage_idx)
  next_idx=$((current_idx + 1))

  # Already at full rollout?
  if [[ $next_idx -ge ${#STAGES[@]} ]]; then
    echo "✅ Canary COMPLETE — all traffic on $CANARY_VERSION"
    jq '.status = "complete"' "$CANARY_STATE" > "${CANARY_STATE}.tmp" && mv "${CANARY_STATE}.tmp" "$CANARY_STATE"
    return 0
  fi

  IFS=':' read -r next_stage next_traffic next_obs <<< "${STAGES[$next_idx]}"

  echo "Checking stage: $next_stage (traffic: ${next_traffic}%)"

  # Collect metrics
  local metrics canary_error canary_latency canary_conversion
  metrics=$(collect_canary metrics)
  IFS=' ' read -r canary_error canary_latency canary_conversion <<< "$metrics"

  # Check thresholds
  local check_result
  check_result=$(check_thresholds "$next_stage" "$canary_error" "$canary_latency" "$canary_conversion")

  if [[ "$check_result" == "PASS" ]]; then
    echo "✅ Health gate passed for $next_stage"

    # Update traffic weight
    set_canary_weight "$next_traffic"

    # Update state
    local now
    now=$(date +%s)
    jq --argjson idx "$next_idx" --argjson now "$now" \
      '.current_stage = $idx | .stage_start_times[$idx] = $now | .status = "advancing"' \
      "$CANARY_STATE" > "${CANARY_STATE}.tmp" && mv "${CANARY_STATE}.tmp" "$CANARY_STATE"

    # Observe
    if [[ $next_obs -gt 0 ]]; then
      echo "Observation period: ${next_obs}s. Monitoring..."
      sleep "$next_obs"
    fi

    return 0
  else
    echo "❌ Health gate FAILED for $next_stage: $check_result"
    rollback_canary
    return 1
  fi
}

# --- Main loop ---
echo "Starting canary deployment for $APP_NAME → $CANARY_VERSION"
init_state 0

while true; do
  advance_canary || break
  current_idx=$(get_current_stage_idx)
  if [[ $current_idx -ge $((${#STAGES[@]} - 1)) ]]; then
    break
  fi
  sleep 10
done

### Pattern 2: Metric Comparison Engine

Compare canary metrics against baseline with statistical significance checking.

#### ✅ GOOD — Canary vs Baseline Metric Comparison

```bash
# ✅ GOOD: Compare canary metrics against baseline with statistical analysis
# Uses Prometheus queries to fetch both versions' metrics, computes deltas

# --- Configuration ---
PROMETHEUS_URL="http://prometheus:9090"
CANARY_VERSION="v2.0.0"
BASELINE_VERSION="v1.9.0"
MIN_SAMPLE_SIZE=100

# --- Query functions ---
query_metric() {
  local version=$1 metric_expr=$2
  local encoded_expr
  encoded_expr=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$metric_expr'))")
  curl -s "${PROMETHEUS_URL}/api/v1/query" \
    --data-urlencode "query=${metric_expr}" \
    | jq -r ".data.result[0].value[1] // \"0\"" 2>/dev/null
}

query_rate() {
  local version=$1 metric_name=$2 window=$3
  query_metric "$version" "rate(${metric_name}{version=\"$version\"}[$window])"
}

# --- Metric comparison function ---
compare_metrics() {
  local metric_name=$1 canary_expr=$2 baseline_expr=$3
  local min_sample_size=${4:-$MIN_SAMPLE_SIZE}

  # Fetch canary metrics
  local canary_val canary_count canary_std
  canary_val=$(query_rate "$CANARY_VERSION" "$canary_expr" "5m")
  canary_count=$(query_metric "$CANARY_VERSION" "sum(rate(http_requests_total{version=\"$CANARY_VERSION\"}[5m]))")
  canary_std=$(query_metric "$CANARY_VERSION" "stddev_over_time(${canary_expr}[5m])")

  # Fetch baseline metrics
  local baseline_val baseline_count baseline_std
  baseline_val=$(query_rate "$BASELINE_VERSION" "$baseline_expr" "5m")
  baseline_count=$(query_metric "$BASELINE_VERSION" "sum(rate(http_requests_total{version=\"$BASELINE_VERSION\"}[5m]))")
  baseline_std=$(query_metric "$BASELINE_VERSION" "stddev_over_time(${baseline_expr}[5m])")

  # Calculate delta
  local delta_pct direction
  delta_pct=$(awk "BEGIN {
    cv = ${canary_val:-0}; bv = ${baseline_val:-0};
    if (bv == 0) { print (cv == 0 ? 0 : 999); }
    else { printf \"%.2f\", ((cv - bv) / bv) * 100 }
  }")

  # Determine direction
  local delta_abs
  delta_abs=$(awk "BEGIN { v = $delta_pct; print (v < 0 ? -v : v) }")
  if [[ "$(echo "$delta_abs < 1" | bc -l)" == "1" ]]; then
    direction="unchanged"
  elif [[ "$(echo "$delta_pct < 0" | bc -l)" == "1" ]]; then
    direction="improved"
  else
    direction="degraded"
  fi

  # Output comparison as JSON
  jq -n \
    --arg name "$metric_name" \
    --argjson cv "${canary_val:-0}" \
    --argjson bv "${baseline_val:-0}" \
    --argjson dp "$delta_pct" \
    --arg dir "$direction" \
    '{
      metric_name: $name,
      canary_value: $cv,
      baseline_value: $bv,
      delta_pct: $dp,
      direction: $dir
    }'
}

# --- Full comparison report ---
generate_comparison_report() {
  echo "=== Canary vs Baseline Metric Comparison ==="
  echo "Canary: $CANARY_VERSION | Baseline: $BASELINE_VERSION"
  echo "---"

  # Error rate comparison
  compare_metrics "error_rate" \
    "http_requests_total{status=~\"5..\"}" \
    "http_requests_total{status=~\"5..\"}"

  # Latency comparison
  compare_metrics "p99_latency_ms" \
    "histogram_quantile(0.99, rate(http_request_duration_ms_bucket{version=\"$CANARY_VERSION\"}[5m]))" \
    "histogram_quantile(0.99, rate(http_request_duration_ms_bucket{version=\"$BASELINE_VERSION\"}[5m]))"

  # Throughput comparison
  compare_metrics "requests_per_second" \
    "http_requests_total" \
    "http_requests_total"

  echo "---"
  echo "Report complete. Review each metric for threshold breaches."
}

# --- Usage ---
# generate_comparison_report  # Outputs JSON report for each metric
```

### Pattern 3: Traffic Weight Manager

Manage traffic weights for canary routing with atomic updates.

#### ✅ GOOD — Traffic Weight Management

```bash
# ✅ GOOD: Atomic traffic weight management for canary deployment
# Weights always sum to 100% — canary weight auto-calculates baseline

# --- Configuration ---
APP_NAME="my-app"
CANARY_SERVICE="my-app-canary"
BASELINE_SERVICE="my-app-baseline"
INGRESS_NAME="my-app-ingress"
WEIGHTS_FILE="/tmp/canary-weights.json"

# --- Traffic weight functions ---
set_canary_weight() {
  local canary_weight=$1

  # Validate weight
  if [[ $(echo "$canary_weight < 0 || $canary_weight > 100" | bc -l) -eq 1 ]]; then
    echo "ERROR: Canary weight must be between 0 and 100, got $canary_weight"
    return 1
  fi

  # Calculate baseline weight (auto-balanced to 100%)
  local baseline_weight
  baseline_weight=$(echo "100 - $canary_weight" | bc)

  echo "Setting traffic weights: ${canary_weight}% canary, ${baseline_weight}% baseline"

  # Apply via Nginx ingress weights (atomic single update)
  kubectl patch ingress "$INGRESS_NAME" -p "$(jq -n --argjson c "$canary_weight" --argjson b "$baseline_weight" '{
    spec: {
      rules: [{
        http: {
          paths: [{
            path: "/",
            pathType: "Prefix",
            backend: {
              service: {
                name: $c == 0 ? "my-app-baseline" : "my-app-canary",
                port: { number: 80 }
              },
              weight: $c
            }
          }, {
            path: "/",
            pathType: "Prefix",
            backend: {
              service: {
                name: $c == 100 ? "my-app-canary" : "my-app-baseline",
                port: { number: 80 }
              },
              weight: $b
            }
          }]
        }
      }]
    }
  }')"

  # Save weights state
  jq -n --argjson c "$canary_weight" --argjson b "$baseline_weight" \
    '{"canary": $c, "baseline": $b, "updated_at": now}' > "$WEIGHTS_FILE"

  # Verify the update
  local actual
  actual=$(kubectl get ingress "$INGRESS_NAME" -o jsonpath='{.spec.rules[0].http.paths[*].backend.weight}' 2>/dev/null)
  echo "Weights applied. Active backends: $actual"
}

# --- Rollback to baseline ---
rollback_to_baseline() {
  echo "🔄 Rolling back: 0% canary, 100% baseline"
  set_canary_weight 0
}

# --- Promote canary to full ---
promote_to_full() {
  echo "🚀 Promoting canary to 100% traffic"
  set_canary_weight 100
}

# --- Get current weights ---
get_current_weights() {
  if [[ -f "$WEIGHTS_FILE" ]]; then
    echo "Current weights:"
    jq '.' "$WEIGHTS_FILE"
  else
    echo "No weights file found — checking live ingress..."
    kubectl get ingress "$INGRESS_NAME" -o json | \
      jq '.spec.rules[0].http.paths[] | {service: .backend.service.name, weight: .backend.weight}'
  fi
}

# --- Usage ---
# set_canary_weight 5      # 5% canary, 95% baseline
# set_canary_weight 25     # 25% canary, 75% baseline
# rollback_to_baseline      # 0% canary, 100% baseline
# promote_to_full           # 100% canary, 0% baseline
# get_current_weights       # Show current state
```

---

## Configuration Examples

### Canary Stage Configuration

```yaml
canary:
  stages:
    - name: initial
      traffic_pct: 0.05
      observation_seconds: 300
      thresholds:
        error_rate: {max: 0.01}
        p99_latency_ms: {max: 1000}
    - name: early_adopters
      traffic_pct: 0.25
      observation_seconds: 600
      thresholds:
        error_rate: {max: 0.02}
        p99_latency_ms: {max: 800}
        conversion_rate: {min: 0.04}
    - name: half_traffic
      traffic_pct: 0.50
      observation_seconds: 900
      thresholds:
        error_rate: {max: 0.02}
        p99_latency_ms: {max: 700}
    - name: full
      traffic_pct: 1.0
  auto_rollback: true
  min_sample_size: 100
```

---

## Constraints

### MUST DO

- **Define thresholds before deploying** — Every stage must have clear pass/fail criteria
- **Monitor both canary and baseline simultaneously** — Comparison is the entire value proposition of canary
- **Automate rollback on threshold breach** — Manual rollback after breach is too late for some users
- **Ensure minimum sample size before comparing** — Statistical comparison with < 100 samples is noise
- **Use incremental stage sizes** — Don't jump from 5% to 95%; use graduated steps

### MUST NOT DO

- **Never deploy canary without baseline comparison** — A canary without a baseline is just a random instance
- **Never skip observation time** — Even if metrics look good at 30s, wait the full observation window
- **Never set canary threshold too permissive** — If your error rate threshold is 50%, your canary is not a canary
- **Never share state between canary and baseline** — Local caches, session stores, and in-memory state must be version-aware
- **Never use canary for schema-breaking changes** — Use blue-green where instant rollback is available

---

## Philosophy Alignment

This skill adheres to the **5 Laws of Elegant Defense**:

### Early Exit
- Any threshold breach at any stage immediately halts progression and triggers rollback
- Insufficient sample sizes cause an early exit from comparison (no decision, not a wrong decision)

### Parse Don't Validate
- Metrics are parsed from the monitoring system as typed snapshots
- Threshold configuration is parsed once and trusted throughout the comparison

### Atomic Predictability
- `set_canary_weight()` always results in a deterministic weight split — same weight = same traffic distribution
- Threshold checks are pure functions — same metrics + same thresholds = same pass/fail result

### Fail Fast
- Threshold breach triggers rollback immediately — no "wait and see" degradation
- Invalid weight values raise ValueError before any routing change

### Intentional Naming
- Stage names (`initial`, `early_adopters`, `half_traffic`) communicate intent
- `CanaryStatus.ROLLED_BACK` vs `CanaryStatus.COMPLETE` — status is self-documenting

---

## Related Skills

| Skill Name | When to Use | Relationship |
|------------|------------|--------------|
| `deployment-philosophy` | Use **before** this skill to assess if canary fits your risk profile | Prerequisite: strategy selection |
| `blue-green-deployment` | Use **instead** when instant rollback is more important than gradual exposure | Alternative: similar goal, different approach |
| `deployment-orchestration` | Use **alongside** when deploying multiple services with canary | Complementary: coordinates multi-service canaries |

---

## Output Template

When applying this skill, your output should contain:

1. **Stage Configuration** — Stages, traffic percentages, thresholds, observation times
2. **Current Metrics** — Canary vs baseline comparison for each monitored metric
3. **Stage Decision** — Advance, hold, or rollback with rationale
4. **Next Action** — What happens next (advance to next stage, rollback, or complete)

---

**Skill Version:** 1.0.0  
**Created:** 2026-05-15  
**Maturity:** stable  
**Completeness:** 95%
