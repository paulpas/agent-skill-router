---




name: blue-green-deployment
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: Implements blue-green deployment strategies with traffic switching, state
  management, and rollback capabilities to achieve zero-downtime releases.
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
  related-skills: deployment-philosophy,canary-deployment,state-management,rollback-strategy
  role: implementation
  scope: infrastructure
  triggers: blue green deployment, zero downtime, traffic switching, parallel environments,
    deployment switch, green environment, parallel deployment
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
# Blue-Green Deployment

Orchestrates parallel environment deployments with traffic switching, state management, and instant rollback to achieve zero-downtime releases. Maintains two identical environments and switches traffic between them.

## TL;DR Checklist

- [ ] Ensure both environments have identical configuration and schema
- [ ] Deploy new version to inactive (green) environment first
- [ ] Run health checks and smoke tests against green before switching traffic
- [ ] Switch traffic atomically via load balancer or router configuration
- [ ] Keep old (blue) environment warm for instant rollback

---

## When to Use

Use this skill when:

- **Zero-downtime is mandatory** — Users cannot tolerate any deployment-related service interruption
- **Instant rollback is required** — You need to revert to the previous version in seconds, not minutes
- **Database schema changes are involved** — Green can run new schema while blue runs old, with careful migration sequencing
- **A/B validation before full rollout** — You want to validate behavior in production environment before committing users

---

## When NOT to Use

Avoid this skill for:

- **Stateful services with local state** — Blue-green requires two full copies; local state doubles the storage requirement
- **Limited infrastructure budget** — Blue-green doubles resource consumption during deployment
- **Frequent small changes** — If you deploy 10 times per day, the overhead of maintaining two environments outweighs the benefit
- **Microservice architectures with many services** — Coordinating blue-green across 50+ services creates synchronization complexity; consider canary instead

---

## Core Workflow

### 1. Provision Parallel Environments

Create two identical environments: Blue (currently serving traffic) and Green (idle, ready for deployment). They must share the same database, DNS, and external service endpoints.

**Checkpoint:** Blue and Green are functionally identical — same OS, libraries, configuration format, and data access patterns.

### 2. Deploy to Green

Deploy the new version exclusively to the Green environment. Run all health checks, integration tests, and smoke tests against it while it is not receiving production traffic.

**Checkpoint:** Green passes all pre-switch validation. Health endpoint returns 200, smoke tests pass, and data access works correctly.

### 3. Switch Traffic Atomically

Switch the load balancer or traffic router to direct all production traffic to Green. This switch must be atomic — no gradual splitting — to avoid serving mixed versions.

**Checkpoint:** All traffic is now flowing to Green. Verify with traffic metrics that Blue is idle.

### 4. Monitor and Validate

Observe Green under real traffic for the agreed observation period. Monitor error rates, latency, and business metrics.

**Checkpoint:** No regression detected during observation window. All health signals within acceptable thresholds.

### 5. Prepare for Next Deployment

Once Green is confirmed healthy, it becomes Blue. The old environment is recycled for the next deployment cycle.

**Checkpoint:** Old environment is decommissioned or recycled. Green's logs and metrics are archived for audit.

---

## Implementation Patterns

### Pattern 1: Traffic Router Switch

Implement the atomic traffic switch that moves users from Blue to Green without splitting requests between versions.

#### ❌ BAD — Gradual Switch Without Version Awareness

```bash
# ❌ BAD: Gradually shifting traffic sends some users to Blue and some to Green
# This causes session inconsistencies and A/B testing contamination
kubectl patch service my-app -p '{"spec":{"selector":{"env":"blue"}}}'
# Slowly shifting weights over 5 minutes
kubectl patch ingress my-app -p '{"spec":{"rules":[{"http":{"paths":[{"path":"/","backend":{"service":{"name":"my-app-green","port":{"number":80}},"weight":10}}]}}]}}'
sleep 60
kubectl patch ingress my-app -p '{"spec":{"rules":[{"http":{"paths":[{"path":"/","backend":{"service":{"name":"my-app-green","port":{"number":80}},"weight":25}}]}}]}}'
sleep 60
kubectl patch ingress my-app -p '{"spec":{"rules":[{"http":{"paths":[{"path":"/","backend":{"service":{"name":"my-app-green","port":{"number":80}},"weight":50}}]}}]}}'
sleep 60
kubectl patch ingress my-app -p '{"spec":{"rules":[{"http":{"paths":[{"path":"/","backend":{"service":{"name":"my-app-green","port":{"number":80}},"weight":75}}]}}]}}'
sleep 60
kubectl patch ingress my-app -p '{"spec":{"rules":[{"http":{"paths":[{"path":"/","backend":{"service":{"name":"my-app-green","port":{"number":80}},"weight":100}}]}}]}}'
# Problem: during the 5-minute shift, users get split between versions
# Problem: session cookies may point to different versions
# Problem: no atomic switch — can't instantly revert
```

**What's wrong:**
- Mixed-version exposure causes session and cache inconsistencies
- No instant rollback — each weight adjustment is a separate operation
- Users experience different behavior mid-deployment
- Impossible to atomically revert if Green fails

#### ✅ GOOD — Atomic Traffic Switch

```bash
# ✅ GOOD: Atomic traffic switch between Blue and Green environments
# Uses a single configuration update — instant flip, no gradual shifting

# --- Configuration ---
APP_NAME="my-app"
STATE_FILE="/tmp/bluegreen-$(basename $APP_NAME).state"
HEALTH_ENDPOINT_GREEN="http://green:8080/health"
HEALTH_ENDPOINT_BLUE="http://blue:8080/health"

# Current active environment (default: blue)
CURRENT_ACTIVE="${ACTIVE_ENV:-blue}"

# --- State helpers ---
save_state() {
  echo "$1" > "$STATE_FILE"
}

get_active() {
  cat "$STATE_FILE" 2>/dev/null || echo "blue"
}

# --- Health check function ---
check_health() {
  local env=$1
  local endpoint
  [[ "$env" == "green" ]] && endpoint="$HEALTH_ENDPOINT_GREEN" || endpoint="$HEALTH_ENDPOINT_BLUE"

  # HTTP health check with timeout
  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$endpoint")
  [[ "$http_code" == "200" ]]
}

# --- Get error rate from metrics endpoint ---
get_error_rate() {
  local env=$1
  local metrics_endpoint
  [[ "$env" == "green" ]] && metrics_endpoint="http://green:9090/metrics" || metrics_endpoint="http://blue:9090/metrics"

  curl -s "$metrics_endpoint" \
    | jq -r '.error_rate // 0' 2>/dev/null || echo "0"
}

# --- Atomic traffic switch ---
switch_traffic() {
  local target_env=$1
  local observation_timeout=${2:-300}

  # Already active? No-op
  if [[ "$(get_active)" == "$target_env" ]]; then
    echo "Traffic already flowing to $target_env — no switch needed"
    return 0
  fi

  local source_env
  source_env=$(get_active)

  # Pre-switch validation
  echo "Validating $target_env before switch..."
  if ! check_health "$target_env"; then
    echo "ERROR: Pre-switch validation failed for $target_env"
    echo "Check health endpoint: $( [[ "$target_env" == "green" ]] && echo $HEALTH_ENDPOINT_GREEN || echo $HEALTH_ENDPOINT_BLUE )"
    return 1
  fi

  # Capture pre-switch metrics
  local pre_errors
  pre_errors=$(get_error_rate "$source_env")

  # Atomic switch — single kubectl command to update the service selector
  local switch_start
  switch_start=$(date +%s%N)

  kubectl patch service "$APP_NAME" \
    --type='json' \
    -p="[{'op':'replace','path':'/spec/selector','value':{'app':'$APP_NAME','env':'$target_env'}}]"

  local switch_end
  switch_end=$(date +%s%N)
  local duration_ms=$(( (switch_end - switch_start) / 1000000 ))

  # Verify the switch took effect
  local actual_selector
  actual_selector=$(kubectl get service "$APP_NAME" -o jsonpath='{.spec.selector.env}')
  if [[ "$actual_selector" != "$target_env" ]]; then
    echo "ERROR: Traffic switch failed — expected $target_env, got $actual_selector"
    return 1
  fi

  save_state "$target_env"

  # Post-switch monitoring
  local post_errors
  post_errors=$(get_error_rate "$target_env")

  echo "Traffic switched $source_env -> $target_env in ${duration_ms}ms"
  echo "Error rate: ${pre_errors}% -> ${post_errors}%"

  # Monitor for observation period
  if [[ $observation_timeout -gt 0 ]]; then
    echo "Monitoring $target_env for ${observation_timeout}s..."
    sleep "$observation_timeout"

    # Final health check after observation
    if ! check_health "$target_env"; then
      echo "ERROR: Health degraded during observation — triggering rollback"
      rollback
      return 1
    fi
  fi

  return 0
}

# --- Instant rollback ---
rollback() {
  local current
  current=$(get_active)
  local target
  [[ "$current" == "blue" ]] && target="green" || target="blue"

  echo "Rolling back traffic to $target..."
  switch_traffic "$target" 0
}

# --- Usage ---
# switch_traffic green 300   # Switch to green with 5-min observation
# rollback                    # Instant rollback to previous environment
```

### Pattern 2: Shared Database During Switch

When Blue and Green share a database during the switch, the schema must be backward-compatible with both versions.

```bash
# ✅ GOOD: Shared database migrations safe for blue-green deployment
# Follows additive-only principle — both old and new versions coexist safely

# --- Migration planning ---
# Blue-green requires additive-only schema changes:
#   ✅ ADD columns (safe — old code ignores new columns)
#   ✅ ADD tables (safe — old code never queries new tables)
#   ✅ ADD indexes (safe — old code ignores new indexes)
#   ❌ MODIFY columns (unsafe — old and new code may disagree on format)
#   ❌ DROP columns (unsafe — old code may still read them)

# Define migrations in a YAML/JSON file (migrations.json)
# [
#   {"name": "add_shipping_street", "type": "add_column", "table": "orders", "column": "shipping_street", "type": "VARCHAR(255)", "nullable": true},
#   {"name": "add_shipping_city", "type": "add_column", "table": "orders", "column": "shipping_city", "type": "VARCHAR(100)", "nullable": true}
# ]

validate_blue_green_migration() {
  local migration_file=$1

  # Check each migration is backward-compatible
  local count
  count=$(jq 'length' "$migration_file")

  for ((i=0; i<count; i++)); do
    local name migration_type table
    name=$(jq -r ".[$i].name" "$migration_file")
    migration_type=$(jq -r ".[$i].type" "$migration_file")
    table=$(jq -r ".[$i].table" "$migration_file")

    case "$migration_type" in
      add_column|add_table|add_index)
        echo "✅ $name ($migration_type on $table) — safe for blue-green"
        ;;
      drop_column|drop_table|modify_column)
        echo "❌ $name ($migration_type on $table) — NOT safe for blue-green"
        echo "   Blue-green requires additive-only schema changes"
        return 1
        ;;
      *)
        echo "⚠️  $name — unknown migration type, manual review required"
        return 1
        ;;
    esac
  done

  echo "All migrations validated for blue-green deployment"
  return 0
}

# --- Execute migrations safely ---
execute_migrations() {
  local migration_file=$1
  local db_host=$2
  local db_name=$3

  local count
  count=$(jq 'length' "$migration_file")

  for ((i=0; i<count; i++)); do
    local name migration_type table column column_type nullable
    name=$(jq -r ".[$i].name" "$migration_file")
    migration_type=$(jq -r ".[$i].type" "$migration_file")
    table=$(jq -r ".[$i].table" "$migration_file")
    column=$(jq -r ".[$i].column // empty" "$migration_file")
    column_type=$(jq -r ".[$i].type // empty" "$migration_file")
    nullable=$(jq -r ".[$i].nullable // true" "$migration_file")

    echo "Executing migration: $name"

    case "$migration_type" in
      add_column)
        local null_clause="NULL"
        [[ "$nullable" != "true" ]] && null_clause="NOT NULL"
        psql -h "$db_host" -d "$db_name" -c \
          "ALTER TABLE $table ADD COLUMN IF NOT EXISTS $column $column_type $null_clause"
        ;;
      add_table)
        local ddl
        ddl=$(jq -r ".[$i].ddl" "$migration_file")
        psql -h "$db_host" -d "$db_name" -c "$ddl"
        ;;
      add_index)
        psql -h "$db_host" -d "$db_name" -c \
          "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_${table}_${column} ON $table($column)"
        ;;
    esac
  done

  echo "All migrations executed successfully"
}

# --- Usage ---
# validate_blue_green_migration migrations.json && execute_migrations migrations.json db-host db-name
```

### Pattern 3: Green Warm-Up Validation

Validate the Green environment thoroughly before ever switching traffic to it.

#### ❌ BAD — Insufficient Green Validation

```bash
# ❌ BAD: Only checking if the process is alive, not if it works
# Process alive != correct behavior — need comprehensive validation
curl -s http://green:8080/health
# Returns 200 → process is alive → deployment proceeds
# But the app may have database connection issues, missing configs,
# or broken business logic — none of which /health catches
```

#### ✅ GOOD — Comprehensive Green Warm-Up

```bash
# ✅ GOOD: Comprehensive Green validation before traffic switch
# Runs a battery of checks verifying liveness, readiness, and correctness

# --- Configuration ---
APP_NAME="my-app"
GREEN_HOST="green"
GREEN_PORT="8080"
GREEN_ENDPOINT="http://${GREEN_HOST}:${GREEN_PORT}"
DB_HOST="db-primary"
DB_PORT="5432"
REDIS_HOST="redis-master"

# --- Health check functions ---
check_health_endpoint() {
  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${GREEN_ENDPOINT}/health")
  if [[ "$http_code" == "200" ]]; then
    echo "✅ health_endpoint: PASS"
    return 0
  else
    echo "❌ health_endpoint: FAIL (HTTP $http_code)"
    return 1
  fi
}

check_database_connection() {
  # Verify new version can connect to the shared database
  local result
  result=$(PGHOST="$DB_HOST" PGPORT="$DB_PORT" psql -U app_user -d app_db -c "SELECT 1" -t 2>&1)
  if [[ "$result" == *"1"* ]]; then
    echo "✅ database_connection: PASS"
    return 0
  else
    echo "❌ database_connection: FAIL ($result)"
    return 1
  fi
}

check_smoke_test() {
  # Run a minimal end-to-end smoke test against green
  local response
  response=$(curl -s --max-time 10 "${GREEN_ENDPOINT}/api/smoke" 2>&1)
  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${GREEN_ENDPOINT}/api/smoke")

  if [[ "$http_code" == "200" ]] && echo "$response" | jq -e '.ok' >/dev/null 2>&1; then
    echo "✅ smoke_test: PASS"
    return 0
  else
    echo "❌ smoke_test: FAIL (HTTP $http_code, response: $response)"
    return 1
  fi
}

check_dependency_connectivity() {
  # Verify connectivity to downstream services
  local deps=("redis:${REDIS_HOST}:6379" "rabbitmq:${GREEN_HOST}:5672")
  local all_ok=true

  for dep in "${deps[@]}"; do
    local host port
    host=$(echo "$dep" | cut -d: -f1)
    port=$(echo "$dep" | cut -d: -f2)
    if (echo > /dev/tcp/"$host"/"$port") 2>/dev/null; then
      echo "✅ dependency $host:$port: connected"
    else
      echo "❌ dependency $host:$port: FAILED"
      all_ok=false
    fi
  done

  $all_ok
}

# --- Validation runner ---
validate_green() {
  local env=$1
  local results=()
  local all_passed=true

  echo "Running validation checks for $env environment..."
  echo "---"

  for check_func in check_health_endpoint check_database_connection check_smoke_test check_dependency_connectivity; do
    if $check_func; then
      results+=("pass")
    else
      results+=("fail")
      all_passed=false
    fi
  done

  echo "---"

  if $all_passed; then
    echo "✅ ALL CHECKS PASSED — $env is ready for traffic"
    return 0
  else
    local failed_count
    failed_count=$(printf '%s\n' "${results[@]}" | grep -c "fail")
    echo "❌ VALIDATION FAILED — $failed_count check(s) failed"
    echo "$env is NOT ready for traffic"
    return 1
  fi
}

# --- Usage ---
# validate_green green   # Must pass all checks before switch_traffic green
```

---

## Configuration Examples

### Traffic Router Configuration

```yaml
# Traffic router configuration for blue-green deployment
traffic_router:
  switch_type: atomic  # atomic or gradual — blue-green requires atomic
  health_check_interval_ms: 1000
  rollback_on_error: true
  error_threshold: 0.05  # 5% error rate triggers rollback

environments:
  blue:
    role: active | standby
    health_endpoint: /health
    readiness_timeout_seconds: 60
  green:
    role: standby | active
    health_endpoint: /health
    readiness_timeout_seconds: 60

database:
  shared: true  # Blue and Green share the same database
  migration_strategy: additive_only  # Only additive schema changes allowed
```

---

## Constraints

### MUST DO

- **Keep both environments identical in configuration** — Only the application version should differ
- **Use atomic traffic switching** — Never gradually split traffic in blue-green; use a single flip
- **Validate Green before switching** — Run health checks, smoke tests, and data verification against Green while it's still idle
- **Maintain a shared database with additive-only migrations** — Both versions must be able to read/write simultaneously
- **Keep the old environment warm for 1+ deployment cycles** — Decommission only after confirming the new version is stable
- **Monitor the new environment intensively after switch** — The first hour of production traffic is the critical validation window

### MUST NOT DO

- **Never deploy to both Blue and Green simultaneously** — Only one environment receives the new version
- **Never use blue-green with local-only state** — Data in ephemeral storage doubles and creates inconsistency
- **Never switch traffic without pre-switch validation** — Unvalidated green is a deployment risk, not a deployment strategy
- **Never split traffic gradually during the switch** — Blue-green is an instant flip, not a canary
- **Never share application state between Blue and Green** — In-memory caches, session stores, and locks must be externalized

---

## Philosophy Alignment

This skill adheres to the **5 Laws of Elegant Defense**:

### Early Exit
- Green environment must pass ALL validation checks before traffic switch — any single failure exits immediately
- Traffic switch never proceeds if pre-switch validation fails

### Parse Don't Validate
- Traffic router state is parsed from a single source of truth — the router configuration
- Internal logic trusts the parsed active environment, never re-queries

### Atomic Predictability
- Traffic switch is a single atomic operation — same input (target_env) always produces same output (traffic routing)
- Rollback is the inverse of switch — mathematically symmetric

### Fail Fast
- Any failed health check aborts the deployment — no degradation into an uncertain state
- Post-switch error rate spike triggers immediate rollback

### Intentional Naming
- Environment names (`BLUE`, `GREEN`) communicate state clearly
- `switch_traffic()` vs `rollback_to_active()` — the action and direction are self-documenting

---

## Related Skills

| Skill Name | When to Use | Relationship |
|------------|------------|--------------|
| `deployment-philosophy` | Use **before** this skill to assess if blue-green is the right strategy for your risk profile | Prerequisite: strategy selection |
| `canary-deployment` | Use **instead** when you have canary infrastructure and want gradual exposure | Alternative: similar goal, different approach |
| `state-management` | Use **alongside** when deploying with database schema changes | Complementary: handles data consistency |
| `rollback-strategy` | Use **alongside** to design your rollback procedures for blue-green | Complementary: instant rollback is core to blue-green |

---

## Output Template

When applying this skill, your output should contain:

1. **Environment Status** — Current active (Blue) and standby (Green) environments
2. **Green Validation Report** — Results of pre-switch health checks
3. **Switch Command** — Atomic traffic switch action
4. **Post-Switch Monitoring** — Key metrics during observation window
5. **Rollback Plan** — Steps and estimated time to revert if needed

---

**Skill Version:** 1.0.0  
**Created:** 2026-05-15  
**Maturity:** stable  
**Completeness:** 95%
