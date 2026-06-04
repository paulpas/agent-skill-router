---




name: multi-stage-deployment
description: Designs multi-stage deployment pipelines that reduce risk through progressive
  disclosure, environment parity, and quality-gated stage transitions from development
  to production.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: cncf
  triggers: multi-stage deployment, deployment stages, environment parity, deployment
    pipeline, stage gates, dev staging pre-prod, deployment readiness, progressive
    delivery
  archetypes:
  - educational
  - diagnostic
  anti_triggers:
  - brainstorming
  - vague ideation
  - non-containerized architecture
  response_profile:
    verbosity: medium
    directive_strength: medium
    abstraction_level: tactical
  role: reference
  scope: infrastructure
  output-format: analysis
  content-types:
  - guidance
  - examples
  - do-dont
  related-skills: deployment-philosophy,blue-green-deployment,canary-deployment,state-management,rollback-strategy,deployment-orchestration




---




# Multi-Stage Deployment Pipeline

Architects deployment pipelines as a series of quality-gated stages, each with a distinct purpose and validation focus. Treats every stage boundary as a decision point that must earn the right to expose more users to the change.

## TL;DR Checklist

- [ ] Define the quality dimension each stage validates (correctness, integration, performance, production fit)
- [ ] Ensure environment parity exists where it matters most: staging must mirror production config and topology
- [ ] Write explicit gate criteria per stage — not "tests pass" but "what quality dimension is satisfied"
- [ ] Identify team handoff points at each stage boundary — who approves, who operates, who owns
- [ ] Calculate cost vs. safety tradeoff for each stage: is the gate worth the delay?
- [ ] Treat canary and blue-green as stage transitions (staging → pre-prod → prod), not standalone deployment patterns

---

## When to Use

Use this skill when:

- **Designing a deployment pipeline from scratch** — You need to define what stages exist, what each validates, and what gates control transitions
- **Auditing an existing pipeline** — You're evaluating whether current stages provide adequate risk reduction or have gaps
- **Debugging a production incident caused by a deployment** — You need to trace which stage should have caught the issue and why it was missed
- **Onboarding a team to a new release process** — You're establishing the multi-stage model for a team without one
- **Evaluating whether to add or remove stages** — You're debating pipeline overhead vs. risk coverage

---

## When NOT to Use

Avoid this skill for:

- **Implementing a specific CI/CD tool** — Use `deployment-orchestration` or the specific tool's skill (e.g., Jenkins, GitLab CI) for tactical implementation
- **Choosing a deployment strategy (canary, blue-green)** — Use `blue-green-deployment` or `canary-deployment` for those tactical decisions
- **Simple projects with minimal risk** — A single-stage deploy (dev → prod) may be appropriate for internal tools with zero user impact
- **Writing application code or tests** — This skill focuses on pipeline architecture and process, not code quality

---

## Core Workflow

### 1. Define the Stage Model

Determine the number and identity of stages in your pipeline. The canonical model has four stages:

```
  dev ──→ staging ──→ pre-prod ──→ prod
  │         │           │           │
  │         │           │           └─ Live user traffic
  │         │           └─ Production-like, limited real traffic
  │         └─ Integration validation, performance, security
  └─ Developer correctness, unit tests, local behavior
```

Each stage exists for one reason: **to catch a specific class of failure before it reaches the next wider audience.**

**Checkpoint:** You can state in one sentence what each stage's unique failure-catchment purpose is. If two stages have the same purpose, they should be merged.

### 2. Assign a Quality Dimension to Each Stage

Every stage validates one primary quality dimension. This prevents stages from becoming generic "test everything here" dumping grounds.

| Stage | Primary Quality Dimension | What It Answers |
|-------|--------------------------|-----------------|
| **Dev** | Correctness | Does the code do what its unit of work says it does? |
| **Staging** | Integration | Does the code work with all its dependencies in a realistic environment? |
| **Pre-Prod** | Production Fit | Does the code behave correctly under production load, data volumes, and failure modes? |
| **Prod** | User Impact | Does the code improve or maintain user experience in reality? |

**Checkpoint:** No stage exists solely for "running tests." Tests serve quality dimensions — correctness, integration, performance, reliability. Map each test suite to a dimension and a stage.

### 3. Define Gate Criteria by Quality Dimension

Gate criteria are not "do tests pass?" They answer: "Has this stage satisfied its quality dimension?"

```
  Stage      │ Gate Criteria (examples)
  ───────────┼────────────────────────────────────────────────────
  Dev        │ • Unit test coverage above threshold
              │   • Static analysis clean (no critical/high issues)
              │   • Code review completed and approved
              │   • No breaking contract changes without migration plan
  Staging    │ • Integration tests against all dependency contracts pass
              │   • Performance regression < 5% vs baseline
              │   • Security scan clean (SAST + DAST)
              │   • Data migration tested end-to-end
  Pre-Prod   │ • Load test meets SLO targets at 1.5x peak traffic
              │   • Chaos test: service recovers from failure within RTO
              │   • Rollback tested and verified within RTO
              │   • Observability: all required metrics, logs, traces present
  Prod       │ • Canary metrics stable for observation window
              │   • Error budget consumption within acceptable rate
              │   • No regression in key business metrics
              │   • Manual approval gate passed (for critical changes)
```

**Checkpoint:** Every gate criterion must be measurable and automatable where possible. "Code is well-tested" is not a gate. "Unit test coverage ≥ 80% and all critical paths covered" is.

### 4. Map Environment Parity

Not every aspect of an environment needs to be identical across stages. Parity matters where it affects behavior — and you must explicitly declare what differs.

```
  Aspect              │ Dev │ Staging │ Pre-Prod │ Prod │ Parity Required?
  ────────────────────┼─────┼─────────┼──────────┼──────┼─────────────────
  Code version        │  ✅  │    ✅    │    ✅    │  ✅  │ Always identical
  Schema              │  ✅  │    ✅    │    ✅    │  ✅  │ Always identical
  Dependencies        │  ⚠️  │    ✅    │    ✅    │  ✅  │ Yes (versions)
  Config format       │  ⚠️  │    ✅    │    ✅    │  ✅  │ Yes (structure)
  Infrastructure size │  ❌  │    ⚠️    │    ✅    │  ✅  │ Pre-prod ≈ Prod
  Data volume         │  ❌  │    ⚠️    │    ✅    │  ✅  │ Pre-prod ≈ Prod
  External services   │  ⚠️  │    ✅    │    ✅    │  ✅  │ Yes (interfaces)
  Network topology    │  ❌  │    ⚠️    │    ✅    │  ✅  │ Pre-prod = Prod
  Security policies   │  ❌  │    ✅    │    ✅    │  ✅  │ Yes
  Monitoring depth    │  ❌  │    ✅    │    ✅    │  ✅  │ Yes
  Team access         │  ✅  │    ✅    │    ✅    │  ⚠️   │ No (least privilege)
```

**Checkpoint:** If a configuration difference between staging and production has caused a bug, that aspect becomes a parity requirement. Maintain a "parities violated" log and close each item.

### 5. Define Team Handoff Points

Each stage boundary is a handoff where responsibility, authority, and information transfer occur.

```
  Dev ──→ Staging     │ Owner: Developer → QA/Platform
                        │ Approval: Developer PR + CI pass
                        │ Info: What changed, why, and how to verify
  Staging ──→ Pre-Prod│ Owner: QA/Platform → SRE/Release Manager
                        │ Approval: Staging gate + security sign-off
                        │ Info: Test results, performance baseline, rollback plan
  Pre-Prod ──→ Prod   │ Owner: SRE/Release Manager → On-Call Engineer
                        │ Approval: Pre-prod gate + change advisory (if applicable)
                        │ Info: Load test results, chaos results, rollback verified
  Prod (canary)       │ Owner: On-Call Engineer → Release Manager
                        │ Approval: Automated canary metrics gate
                        │ Info: Real-user metrics during canary window
```

**Checkpoint:** Every handoff has a named role on both sides, a clear approval criteria, and a minimum information package. If any of these is missing, the handoff will fail.

### 6. Treat Canary and Blue-Green as Stage Transitions

Canary and blue-green are not deployment strategies in isolation — they are **the mechanism for transitioning between pre-prod and prod stages.**

```
  Traditional model:  pre-prod ──┤─── instant full deploy ──┤── prod
                                           (high blast radius)

  Progressive model:  pre-prod ──┤── canary (1%) ──┤── canary (10%) ──┤── full prod
                             │                      │                      │
                       health gate              health gate            health gate
                       (metrics pass)           (metrics pass)         (metrics pass)

  Blue-green as transition:  pre-prod ──┤── green deployed ──┤── traffic flip ──┤── prod (green)
                                          │                   │                      │
                                    validate green      atomic switch             observe
```

**Checkpoint:** Canary is for gradual risk acceptance. Blue-green is for instant risk rejection. Choose based on your blast radius tolerance and rollback requirements. Both are stage transitions, not deployment patterns.

### 7. Establish Rollback vs. Forward-Fix Philosophy

When a deployment fails in production, the response must be deterministic — not debatable.

```
  Rollback triggers (automatic):
  ├─ Error rate exceeds threshold (e.g., > 1% 5xx responses)
  ├─ p99 latency exceeds SLO (e.g., > 500ms)
  ├─ Business metric drops below acceptable floor (e.g., checkout conversions < 95%)
  └─ Health check fails for observation window

  Forward-fix triggers (only when rollback is impossible or harmful):
  ├─ Data migration is partially applied and cannot be reversed
  ├─ Rollback would cause greater data corruption than the current issue
  └─ The "bug" is actually a desired change that was miscommunicated

  Rule: When in doubt, roll back. Forward-fix requires written justification.
```

**Checkpoint:** Your rollback mechanism must be faster than your detection. If you detect the failure in 10 minutes but rollback takes 30 minutes, your rollback is part of the problem.

### 8. Assess Cost vs. Safety at Each Stage

Every stage has an opportunity cost. The pipeline must balance speed against risk reduction.

```
  Stage       │ Cost (time, resources) │ Risk Reduction │ Cost/Benefit Assessment
  ────────────┼────────────────────────┼────────────────┼────────────────────────
  Dev         │ Low (parallel, fast)   │ High           │ Cheap gate: catch bugs before they leave developer machine
  Staging     │ Medium (queue wait,   │ High           │ Worth it: catches integration failures that dev misses
              │  shared env)           │                │   but could affect multiple services
  Pre-Prod    │ High (dedicated env,  │ Critical       │ Must have: only stage that can catch production-specific
              │  load/chaos testing)   │                │   failures before user impact
  Prod (canary)│ Low (partial traffic │ Variable       │ Tradeoff: canary catches some issues but lets others
              │  exposure)            │                │   through — is that acceptable for this change?
```

**Checkpoint:** If a stage consistently passes without catching any failures for 3 consecutive months, evaluate whether it is still providing value or has become overhead.

### 9. Define Deployment Readiness as a First-Class Property

Deployment readiness is not "all tests pass." It is a verifiable state that must be computed, not assumed.

```
  Deployment Readiness Checklist (computed, not manual):
  ├─ [ ] All gate criteria for current stage are met
  ├─ [ ] Deployment artifacts are immutable (pinned to exact image/tag/commit)
  ├─ [ ] Rollback procedure is tested and documented
  ├─ [ ] Observability coverage is verified (metrics, logs, traces)
  ├─ [ ] Feature flags for the change are in known state
  ├─ [ ] Team on-call is aware and accessible
  ├─ [ ] Change documentation is updated
  └─ [ ] Emergency contacts are verified

  Readiness score = sum of all checks (binary: pass/fail)
  Gate = readiness score == 8 (no partial readiness)
```

**Checkpoint:** Readiness must be machine-computable where possible. Manual checklists are fallbacks, not primary mechanisms.

---

## Implementation Patterns

### Pattern 1: Stage Gate Enforcer

A shell function that validates whether a stage's quality gates have been satisfied before allowing progression.

```bash
#!/usr/bin/env bash
# ✅ GOOD: Stage gate enforcement — each stage has explicit, measurable criteria
# Gates are computed, not assumed. Partial readiness is rejected.

set -euo pipefail

readonly STAGE_CONFIG="/tmp/stage-gate-config.json"
readonly READINESS_FILE="/tmp/deployment-readiness.json"

# --- Gate definitions per stage ---
# Each stage has a name and a list of gate checkers
# Usage: validate_stage <stage_name>

validate_stage() {
  local stage="$1"

  case "$stage" in
    dev)
      validate_dev_gates
      ;;
    staging)
      validate_staging_gates
      ;;
    preprod)
      validate_preprod_gates
      ;;
    prod)
      validate_prod_gates
      ;;
    *)
      echo "ERROR: Unknown stage: $stage" >&2
      return 1
      ;;
  esac
}

# --- Dev gates: correctness ---
validate_dev_gates() {
  local score=0
  local total=3
  local results=()

  echo "=== Dev Stage Gate: Correctness ==="

  # Gate 1: Unit test coverage
  local coverage
  coverage=$(jq -r '.unit_test_coverage' "$READINESS_FILE" 2>/dev/null || echo "0")
  if (( $(echo "$coverage >= 80" | bc -l) )); then
    results+=("unit_test_coverage: PASS ($coverage%)")
    ((score++))
  else
    results+=("unit_test_coverage: FAIL ($coverage% < 80% threshold)")
  fi

  # Gate 2: Static analysis
  local static_issues
  static_issues=$(jq -r '.static_analysis_critical_high' "$READINESS_FILE" 2>/dev/null || echo "999")
  if [[ "$static_issues" == "0" ]]; then
    results+=("static_analysis: PASS (0 critical/high issues)")
    ((score++))
  else
    results+=("static_analysis: FAIL ($static_issues critical/high issues)")
  fi

  # Gate 3: Code review
  local review_status
  review_status=$(jq -r '.code_review_status' "$READINESS_FILE" 2>/dev/null || echo "unreviewed")
  if [[ "$review_status" == "approved" ]]; then
    results+=("code_review: PASS")
    ((score++))
  else
    results+=("code_review: FAIL (status: $review_status)")
  fi

  # Output results
  echo "Dev gate score: $score/$total"
  for r in "${results[@]}"; do
    echo "  $r"
  done

  if [[ $score -eq $total ]]; then
    echo "✅ Dev stage: READY to advance"
    return 0
  else
    echo "❌ Dev stage: BLOCKED — $((total - score)) gate(s) failed"
    return 1
  fi
}

# --- Staging gates: integration ---
validate_staging_gates() {
  local score=0
  local total=4
  local results=()

  echo "=== Staging Stage Gate: Integration ==="

  # Gate 1: Integration test pass rate
  local integration_rate
  integration_rate=$(jq -r '.integration_test_pass_rate' "$READINESS_FILE" 2>/dev/null || echo "0")
  if (( $(echo "$integration_rate >= 100" | bc -l) )); then
    results+=("integration_tests: PASS ($integration_rate%)")
    ((score++))
  else
    results+=("integration_tests: FAIL ($integration_rate% < 100%)")
  fi

  # Gate 2: Performance regression check
  local perf_regression
  perf_regression=$(jq -r '.perf_regression_pct' "$READINESS_FILE" 2>/dev/null || echo "100")
  if (( $(echo "$perf_regression <= 5" | bc -l) )); then
    results+=("performance: PASS (regression: ${perf_regression}%)")
    ((score++))
  else
    results+=("performance: FAIL (regression: ${perf_regression}% > 5% threshold)")
  fi

  # Gate 3: Security scan
  local security_status
  security_status=$(jq -r '.security_scan_status' "$READINESS_FILE" 2>/dev/null || echo "fail")
  if [[ "$security_status" == "clean" ]]; then
    results+=("security_scan: PASS")
    ((score++))
  else
    results+=("security_scan: FAIL (status: $security_status)")
  fi

  # Gate 4: Data migration tested
  local migration_tested
  migration_tested=$(jq -r '.data_migration_tested' "$READINESS_FILE" 2>/dev/null || echo "false")
  if [[ "$migration_tested" == "true" ]]; then
    results+=("data_migration: PASS")
    ((score++))
  else
    results+=("data_migration: FAIL (not tested)")
  fi

  echo "Staging gate score: $score/$total"
  for r in "${results[@]}"; do
    echo "  $r"
  done

  if [[ $score -eq $total ]]; then
    echo "✅ Staging stage: READY to advance"
    return 0
  else
    echo "❌ Staging stage: BLOCKED — $((total - score)) gate(s) failed"
    return 1
  fi
}

# --- Pre-prod gates: production fit ---
validate_preprod_gates() {
  local score=0
  local total=4
  local results=()

  echo "=== Pre-Prod Stage Gate: Production Fit ==="

  # Gate 1: Load test
  local load_p99
  load_p99=$(jq -r '.load_test_p99_latency' "$READINESS_FILE" 2>/dev/null || echo "9999")
  local load_pass
  load_pass=$(jq -r '.load_test_p99_within_slo' "$READINESS_FILE" 2>/dev/null || echo "false")
  if [[ "$load_pass" == "true" ]]; then
    results+=("load_test: PASS (p99: ${load_p99}ms within SLO)")
    ((score++))
  else
    results+=("load_test: FAIL (p99: ${load_p99}ms exceeds SLO)")
  fi

  # Gate 2: Chaos test
  local chaos_recovery
  chaos_recovery=$(jq -r '.chaos_test_recovery_time' "$READINESS_FILE" 2>/dev/null || echo "9999")
  if (( $(echo "$chaos_recovery <= 300" | bc -l) )); then
    results+=("chaos_test: PASS (recovery: ${chaos_recovery}s <= 5min RTO)")
    ((score++))
  else
    results+=("chaos_test: FAIL (recovery: ${chaos_recovery}s > 5min RTO)")
  fi

  # Gate 3: Rollback tested
  local rollback_tested
  rollback_tested=$(jq -r '.rollback_tested' "$READINESS_FILE" 2>/dev/null || echo "false")
  local rollback_time
  rollback_time=$(jq -r '.rollback_time_seconds' "$READINESS_FILE" 2>/dev/null || echo "9999")
  if [[ "$rollback_tested" == "true" ]] && (( $(echo "$rollback_time <= 60" | bc -l) )); then
    results+=("rollback_test: PASS (${rollback_time}s <= 60s target)")
    ((score++))
  else
    results+=("rollback_test: FAIL (tested: $rollback_tested, time: ${rollback_time}s)")
  fi

  # Gate 4: Observability coverage
  local obs_coverage
  obs_coverage=$(jq -r '.observability_score' "$READINESS_FILE" 2>/dev/null || echo "0")
  if (( $(echo "$obs_coverage >= 90" | bc -l) )); then
    results+=("observability: PASS (score: $obs_coverage/100)")
    ((score++))
  else
    results+=("observability: FAIL (score: $obs_coverage/100 < 90 threshold)")
  fi

  echo "Pre-Prod gate score: $score/$total"
  for r in "${results[@]}"; do
    echo "  $r"
  done

  if [[ $score -eq $total ]]; then
    echo "✅ Pre-Prod stage: READY to advance"
    return 0
  else
    echo "❌ Pre-Prod stage: BLOCKED — $((total - score)) gate(s) failed"
    return 1
  fi
}

# --- Prod canary gates: user impact ---
validate_prod_gates() {
  local score=0
  local total=4
  local results=()
  local canary_weight="${CANARY_WEIGHT:-0.05}"

  echo "=== Prod Stage Gate: User Impact (canary: ${canary_weight}) ==="

  # Gate 1: Error rate
  local error_rate
  error_rate=$(jq -r '.prod_canary_error_rate' "$READINESS_FILE" 2>/dev/null || echo "1")
  if (( $(echo "$error_rate <= 0.01" | bc -l) )); then
    results+=("error_rate: PASS (${error_rate} <= 1%)")
    ((score++))
  else
    results+=("error_rate: FAIL (${error_rate} > 1% threshold)")
  fi

  # Gate 2: Latency SLO
  local latency_slo_met
  latency_slo_met=$(jq -r '.prod_canary_latency_slo_met' "$READINESS_FILE" 2>/dev/null || echo "false")
  if [[ "$latency_slo_met" == "true" ]]; then
    results+=("latency_slo: PASS")
    ((score++))
  else
    results+=("latency_slo: FAIL (p99 exceeds SLO)")
  fi

  # Gate 3: Business metric
  local business_metric_delta
  business_metric_delta=$(jq -r '.business_metric_delta_pct' "$READINESS_FILE" 2>/dev/null || echo "-100")
  if (( $(echo "$business_metric_delta >= -5" | bc -l) )); then
    results+=("business_metric: PASS (delta: ${business_metric_delta}%)")
    ((score++))
  else
    results+=("business_metric: FAIL (delta: ${business_metric_delta}% < -5% floor)")
  fi

  # Gate 4: Observation window
  local observation_met
  observation_met=$(jq -r '.canary_observation_met' "$READINESS_FILE" 2>/dev/null || echo "false")
  if [[ "$observation_met" == "true" ]]; then
    results+=("observation: PASS (required window passed)")
    ((score++))
  else
    results+=("observation: FAIL (required observation window not yet met)")
  fi

  echo "Prod canary gate score: $score/$total"
  for r in "${results[@]}"; do
    echo "  $r"
  done

  if [[ $score -eq $total ]]; then
    echo "✅ Prod canary: READY for next weight increase or full rollout"
    return 0
  else
    echo "❌ Prod canary: BLOCKED — $((total - score)) gate(s) failed"
    echo "ACTION: Roll back canary weight to previous level"
    return 1
  fi
}

# --- Main pipeline orchestrator ---
run_pipeline() {
  local stages="dev staging preprod prod"
  local current_stage=""
  local gate_failed=false

  echo "========================================="
  echo " Multi-Stage Deployment Pipeline"
  echo "========================================="

  for stage in $stages; do
    echo ""
    echo "▶ Entering stage: $stage"
    if ! validate_stage "$stage"; then
      gate_failed=true
      current_stage="$stage"
      break
    fi
  done

  echo ""
  echo "========================================="
  if $gate_failed; then
    echo "Pipeline BLOCKED at stage: $current_stage"
    echo "ACTION: Fix gate failures before retrying"
    exit 1
  else
    echo "Pipeline COMPLETE — deployment ready for production"
    exit 0
  fi
}
```

### Pattern 2: Environment Parity Validator

Validate that environments have the required parity before advancing to the next stage.

```bash
# ✅ GOOD: Environment parity validation
# Checks that critical aspects match between source and target environments
# Uses a declarative parity spec — what MUST match, what CAN differ

set -euo pipefail

# --- Parity specification ---
# Format: "aspect:source_env:target_env:tolerance"
# tolerance: "exact", "semver", "within_x%"
PARITY_SPEC=(
  "code_version:staging:preprod:exact"
  "code_version:preprod:prod:exact"
  "database_schema:staging:preprod:exact"
  "database_schema:preprod:prod:exact"
  "dependency_versions:staging:preprod:semver"
  "dependency_versions:preprod:prod:semver"
  "config_structure:staging:preprod:exact"
  "config_structure:preprod:prod:exact"
  "infrastructure_size:preprod:prod:within_20%"
  "network_topology:preprod:prod:exact"
  "security_policy:preprod:prod:exact"
)

# --- Fetch environment state (abstracted — could be kubectl, terraform, etc.) ---
get_env_value() {
  local env="$1"
  local aspect="$2"
  # In production, this would query: kubectl get configmap, terraform state, etc.
  # Here we simulate with a JSON state file
  local state_file="/tmp/env-state-${env}.json"
  jq -r --arg a "$aspect" '.environments[$env].aspects[$a] // "not_found"' "$state_file" 2>/dev/null || echo "not_found"
}

# --- Compare two values with tolerance ---
compare_with_tolerance() {
  local val1="$1"
  local val2="$2"
  local tolerance="$3"

  case "$tolerance" in
    exact)
      [[ "$val1" == "$val2" ]]
      ;;
    semver)
      # Both must be valid semver, major+minor must match
      local maj1 maj2 min1 min2
      maj1=$(echo "$val1" | cut -d. -f1)
      min1=$(echo "$val1" | cut -d. -f2)
      maj2=$(echo "$val2" | cut -d. -f1)
      min2=$(echo "$val2" | cut -d. -f2)
      [[ "$maj1" == "$maj2" && "$min1" == "$min2" ]]
      ;;
    within_*)
      local threshold="${tolerance#within_}"
      local ratio
      ratio=$(echo "if ($val1 > $val2) ($val2/$val1) else ($val1/$val2)" | bc -l)
      local min_ratio
      min_ratio=$(echo "1 - $threshold / 100" | bc -l)
      (( $(echo "$ratio >= $min_ratio" | bc -l) ))
      ;;
    *)
      echo "ERROR: Unknown tolerance: $tolerance" >&2
      return 1
      ;;
  esac
}

# --- Run parity validation ---
validate_parity() {
  local source_env="$1"
  local target_env="$2"

  echo "=== Environment Parity: $source_env → $target_env ==="

  local passed=0
  local failed=0
  local violations=()

  for spec in "${PARITY_SPEC[@]}"; do
    IFS=':' read -r aspect src trg tolerance <<< "$spec"

    # Only check relevant pairs
    if [[ "$src" != "$source_env" && "$src" != "$target_env" ]]; then
      continue
    fi

    local check_source="$src"
    local check_target="$trg"
    [[ "$src" == "$target_env" ]] && { check_source="$target_env"; check_target="$source_env"; }

    local val1 val2
    val1=$(get_env_value "$check_source" "$aspect")
    val2=$(get_env_value "$check_target" "$aspect")

    if compare_with_tolerance "$val1" "$val2" "$tolerance"; then
      echo "  ✅ $aspect: $val1 ≈ $val2 ($tolerance)"
      ((passed++))
    else
      echo "  ❌ $aspect: $val1 ≠ $val2 (tolerance: $tolerance)"
      violations+=("$aspect: $val1 vs $val2")
      ((failed++))
    fi
  done

  echo ""
  echo "Parity score: $passed passed, $failed failed"

  if [[ $failed -gt 0 ]]; then
    echo ""
    echo "Violations:"
    for v in "${violations[@]}"; do
      echo "  ⚠ $v"
    done
    echo ""
    echo "❌ Parity check FAILED — fix violations before advancing"
    return 1
  else
    echo "✅ All parity checks passed"
    return 0
  fi
}

# --- Usage ---
# validate_parity staging preprod
# validate_parity preprod prod
```

### Pattern 3: Deployment Readiness Scorecard

Compute a machine-readable deployment readiness score from gate results.

```bash
# ✅ GOOD: Deployment readiness computed from gate results
# Score is a percentage — gates with score < 100 block deployment
# Partial readiness is never accepted for production deployment

set -euo pipefail

readonly READINESS_FILE="/tmp/deployment-readiness.json"

# --- Readiness computation ---
compute_readiness() {
  local stage="$1"
  local score=0
  local total=0
  local checks=()

  case "$stage" in
    dev)
      # Dev readiness: 3 binary checks
      total=3
      for check in unit_test_coverage static_analysis code_review; do
        local status
        status=$(jq -r --arg c "$check" '.dev_gates[$c]' "$READINESS_FILE" 2>/dev/null || echo "false")
        if [[ "$status" == "true" ]]; then
          ((score++))
        fi
        checks+=("$check:$status")
      done
      ;;
    staging)
      # Staging readiness: 4 binary checks
      total=4
      for check in integration_tests performance security data_migration; do
        local status
        status=$(jq -r --arg c "$check" '.staging_gates[$c]' "$READINESS_FILE" 2>/dev/null || echo "false")
        if [[ "$status" == "true" ]]; then
          ((score++))
        fi
        checks+=("$check:$status")
      done
      ;;
    preprod)
      # Pre-prod readiness: 4 binary checks
      total=4
      for check in load_test chaos_test rollback_test observability; do
        local status
        status=$(jq -r --arg c "$check" '.preprod_gates[$c]' "$READINESS_FILE" 2>/dev/null || echo "false")
        if [[ "$status" == "true" ]]; then
          ((score++))
        fi
        checks+=("$check:$status")
      done
      ;;
    prod)
      # Prod canary readiness: 4 binary checks
      total=4
      for check in error_rate latency_slo business_metric observation; do
        local status
        status=$(jq -r --arg c "$check" '.prod_gates[$c]' "$READINESS_FILE" 2>/dev/null || echo "false")
        if [[ "$status" == "true" ]]; then
          ((score++))
        fi
        checks+=("$check:$status")
      done
      ;;
    *)
      echo "ERROR: Unknown stage: $stage" >&2
      return 1
      ;;
  esac

  local percentage
  percentage=$(( (score * 100) / total ))

  # Output structured readiness result
  echo "{
    \"stage\": \"$stage\",
    \"score\": $score,
    \"total\": $total,
    \"percentage\": $percentage,
    \"checks\": {$(printf '"%s": "%s",' "${checks[@]}")},
    \"ready\": $([ $score -eq $total ] && echo "true" || echo "false")
  }"
}

# --- Readiness report ---
readiness_report() {
  echo "========================================="
  echo "  Deployment Readiness Report"
  echo "========================================="

  for stage in dev staging preprod prod; do
    local result
    result=$(compute_readiness "$stage")
    local ready
    ready=$(echo "$result" | jq -r '.ready')

    if [[ "$ready" == "true" ]]; then
      echo "✅ $stage: READY ($(echo "$result" | jq -r '.score')/$(echo "$result" | jq -r '.total'))"
    else
      echo "❌ $stage: BLOCKED ($(echo "$result" | jq -r '.score')/$(echo "$result" | jq -r '.total'))"
      echo "    Failed: $(echo "$result" | jq -r 'to_entries[] | select(.value == "false") | .key')"'
    fi
  done

  echo "========================================="
}

# --- Gate enforcement: block if any stage is blocked ---
enforce_gates() {
  local blocked_stages
  blocked_stages=""

  for stage in dev staging preprod prod; do
    local result
    result=$(compute_readiness "$stage")
    local ready
    ready=$(echo "$result" | jq -r '.ready')

    if [[ "$ready" != "true" ]]; then
      blocked_stages="$blocked_stages $stage"
    fi
  done

  if [[ -n "$blocked_stages" ]]; then
    echo "❌ Deployment BLOCKED at:$blocked_stages"
    echo "ACTION: Resolve gate failures before proceeding"
    return 1
  else
    echo "✅ All stages READY — deployment permitted"
    return 0
  fi
}
```

### Pattern 4: Stage Transition with Handoff Protocol

Define the handoff protocol between stages — who approves, what information transfers.

```bash
# ✅ GOOD: Stage handoff protocol with structured information transfer
# Each handoff requires: approver role, information package, and confirmation

set -euo pipefail

# --- Handoff definitions ---
# Format: "source_stage:target_stage:approver_role:info_package"
declare -A HANDOFFS=(
  ["dev:staging"]="developer:PR diff, test summary, deployment instructions"
  ["staging:preprod"]="qa_lead:staging test report, performance baseline, security scan"
  ["preprod:prod"]="release_manager:load test results, chaos results, rollback verification"
  ["prod:prod_canary"]="on_call_engineer:canary metrics, business impact assessment"
)

# --- Handoff execution ---
execute_handoff() {
  local from_stage="$1"
  local to_stage="$2"
  local handoff_key="${from_stage}:${to_stage}"

  # Get handoff requirements
  local requirements="${HANDOFFS[$handoff_key]:-}"
  if [[ -z "$requirements" ]]; then
    echo "ERROR: No handoff defined for $from_stage → $to_stage" >&2
    return 1
  fi

  IFS=':' read -r approver info_package <<< "$requirements"

  echo "========================================="
  echo " Handoff: $from_stage → $to_stage"
  echo " Approver: $approver"
  echo " Info package: $info_package"
  echo "========================================="

  # Verify information package is complete
  local info_complete=true
  local missing_items=()

  # Check each required info item
  IFS=', ' read -ra items <<< "$info_package"
  for item in "${items[@]}"; do
    item=$(echo "$item" | xargs)  # trim whitespace
    # In production, verify the actual artifact exists
    # For simulation, check a file marker
    local marker_file="/tmp/handoff-${from_stage}-${to_stage}-${item}"
    if [[ -f "$marker_file" ]]; then
      echo "  ✅ $item: present"
    else
      echo "  ❌ $item: missing"
      missing_items+=("$item")
      info_complete=false
    fi
  done

  echo ""

  if ! $info_complete; then
    echo "❌ Handoff BLOCKED — missing: ${missing_items[*]}"
    return 1
  fi

  echo "✅ Information package complete"
  echo "▶ Awaiting approval from: $approver"

  # In production, this would check for approval from the named role
  # For simulation, we proceed
  echo "▶ Approval granted by: $approver"
  echo "✅ Handoff complete — $to_stage is now active"
  return 0
}

# --- Execute full handoff chain ---
run_handoffs() {
  local handoff_pairs=("dev:staging" "staging:preprod" "preprod:prod" "prod:prod_canary")
  local failed=false

  for pair in "${handoff_pairs[@]}"; do
    IFS=':' read -r from to <<< "$pair"
    if ! execute_handoff "$from" "$to"; then
      failed=true
      break
    fi
    echo ""
  done

  if $failed; then
    echo "❌ Handoff chain broken — pipeline halted"
    return 1
  else
    echo "✅ Full handoff chain complete — deployment ready"
    return 0
  fi
}
```

---

## Constraints

### MUST DO

- **Assign exactly one primary quality dimension to each stage** — Prevents stages from becoming generic test dumping grounds
- **Write gate criteria that map to quality dimensions** — "Unit tests pass" is not a gate criterion; "Integration test pass rate ≥ 100% against all dependency contracts" is
- **Make gate criteria machine-computable** — Manual checklists are fallbacks, not primary mechanisms
- **Validate environment parity between staging and pre-prod, and between pre-prod and prod** — Dev-to-staging parity is less critical
- **Document the team handoff at each stage boundary** — Named approver, required information, and approval criteria
- **Compute deployment readiness as a verifiable score** — Never assume readiness; always compute it from gate results
- **Treat canary and blue-green as stage transitions** — They connect pre-prod to prod with progressive or atomic risk management
- **Calculate cost vs. safety for each stage** — Every stage has an opportunity cost; justify it with risk reduction value

### MUST NOT DO

- **Never allow a stage to pass with partial readiness** — 7/8 gates is a blocked deployment, not a "mostly ready" one
- **Never skip the pre-prod stage to save time** — Pre-prod is the last defense before user impact; removing it is gambling
- **Never use identical gate criteria across multiple stages** — If staging and pre-prod check the same thing, you have redundant gates and a missing gate
- **Never assume dev environment parity with production** — Dev differs intentionally; don't force parity there
- **Never make rollback slower than detection** — If you detect a failure in 10 minutes but rollback takes 30 minutes, you have lost
- **Never replace automated gates with manual "trust" decisions** — Human judgment belongs at handoff approval, not gate evaluation
- **Never add stages without defining their quality dimension** — Every stage must earn its place by catching something others miss

---

## Philosophy Alignment

This skill aligns with the **5 Laws of Elegant Defense** by treating deployment stages as a layered defense system:

### Early Exit
- Deployment halts at the first stage gate failure — no progression beyond blocked stages
- Gate criteria fail fast: if any single check fails, the stage score drops and deployment is blocked

### Parse Don't Validate
- Readiness state is parsed from machine-computed results (JSON artifacts, metric queries)
- Internal gate logic trusts parsed readiness scores, never re-validates individual checks

### Atomic Predictability
- Same gate configuration + same readiness state = same decision, every time
- Gate evaluation is deterministic: 8/8 gates always means READY, 7/8 always means BLOCKED

### Fail Fast
- Any gate failure blocks deployment immediately — no progression into uncertain states
- Rollback is the default failure mode for prod gates, not a manual afterthought

### Intentional Naming
- Stage names (`dev`, `staging`, `preprod`, `prod`) communicate purpose clearly
- Gate names map to quality dimensions (`unit_test_coverage`, `chaos_test`, `error_rate`) — each describes what is being validated

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `deployment-philosophy` | Higher-level deployment strategy selection (canary vs blue-green vs rolling) — use before defining stage gates |
| `blue-green-deployment` | Tactical implementation of blue-green as a pre-prod → prod transition — use after defining stage model |
| `canary-deployment` | Tactical implementation of canary as a progressive pre-prod → prod transition — use after defining stage model |
| `state-management` | Handles database schema and data migrations across stages — use alongside for stateful deployments |
| `rollback-strategy` | Designs rollback procedures for each stage — use alongside to define rollback paths and RTOs |
| `deployment-orchestration` | Coordinates multi-service deployment sequencing across stages — use alongside for complex services |

---

## Output Template

When applying this skill, your output should contain:

1. **Stage Model** — Number of stages, names, and each stage's primary quality dimension
2. **Gate Criteria** — Measurable gate criteria per stage, mapped to quality dimensions
3. **Parity Map** — What aspects must match between adjacent stages and what can differ
4. **Handoff Protocol** — Approver roles, information packages, and approval criteria at each boundary
5. **Readiness Scorecard** — Computed readiness scores for each stage with pass/fail status
6. **Cost-Benefit Summary** — Estimated time cost per stage vs. risk reduction value
7. **Transition Strategy** — Canary or blue-green selection for prod transition with justification

Example:
```
## Multi-Stage Deployment Pipeline

**Stage Model:**
  dev (correctness) → staging (integration) → pre-prod (production fit) → prod (user impact)

**Gate Criteria:**
  dev: unit coverage ≥ 80%, 0 critical static issues, code review approved
  staging: 100% integration pass, perf regression ≤ 5%, security clean
  pre-prod: load test within SLO, chaos recovery ≤ 5min, rollback ≤ 60s
  prod: error rate ≤ 1%, latency SLO met, business metric ≤ -5% delta, 30min observation

**Transition Strategy:** Canary (1% → 10% → 50% → 100%) with automated metric gates

**Readiness Scores:**
  dev: 3/3 ✅ | staging: 4/4 ✅ | pre-prod: 3/4 ❌ | prod: N/A

**Blocked at:** pre-prod (chaos_test not passed)
```

---

**Skill Version:** 1.0.0  
**Created:** 2026-05-16  
**Maturity:** stable  
**Completeness:** 95%

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Primary Documentation](https://kubernetes.io/docs/concepts/workloads/controllers/deploy/#strategy)
- [API Reference or Getting Started](https://kubernetes.io/docs/tutorials/kubernetes-basics/update/update-intro/)
- [Configuration Guide](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#updating-a-deployment)
- [Best Practices](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#rolling-updates)
- [Common Patterns or Tutorials](https://kubernetes.io/docs/tutorials/kubernetes-basics/create-app/create-interactive/)

