---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: Manages application state across deployment stages including database
  migrations, cache invalidation, and data consistency during rolling updates.
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
  related-skills: deployment-philosophy,blue-green-deployment,rollback-strategy,deployment-orchestration
  role: implementation
  scope: infrastructure
  triggers: state management, database migration, deployment state, data migration,
    cache invalidation, schema migration, data consistency, backward compatible migration
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
name: state-management
------
# State Management

Manages application state — database schemas, cached data, and persisted state — across deployment stages. Ensures data consistency when old and new versions of a service coexist during deployment transitions.

## TL;DR Checklist

- [ ] Design all schema changes to be backward-compatible with both old and new versions
- [ ] Run read migrations before deploying new code (backfill old readers)
- [ ] Deploy new code that reads and writes new format
- [ ] Run write migrations to convert remaining old-format data
- [ ] Remove old code references only after all data is migrated
- [ ] Invalidate caches at the right transition points

---

## When to Use

Use this skill when:

- **Database schema changes accompany deployments** — Adding columns, tables, or indexes that both old and new code versions may access
- **Data format changes are required** — New code needs data in a different format than old code
- **Cache consistency must be maintained** — Deploying new code that interprets cached data differently
- **Stateful services are being deployed** — Services with local state, queues, or persisted configuration

---

## When NOT to Use

Avoid this skill for:

- **Purely additive schema changes with no code change** — Adding an index or column that no code reads/writes yet needs no state management
- **Stateless microservices with no persistent data** — No database, no cache, no local state = no state management needed
- **Full database replacement** — Migrating to a completely new database system is a data migration project, not a deployment state pattern

---

## Core Workflow

### 1. Classify the State Change

Determine what type of state change is happening: schema addition, schema modification, data format change, or cache invalidation. Each type requires a different migration sequence.

**Checkpoint:** You know whether the change is additive, transitional, or destructive.

### 2. Design Backward-Compatible Schema

Ensure the new schema works with both old and new code versions. The old code must be able to read and write without errors.

**Checkpoint:** Both old and new code can coexist against the new schema without data loss or corruption.

### 3. Execute Read Migration

Add new columns or tables without changing existing ones. Old code ignores new columns (they're NULL/default), new code uses them.

**Checkpoint:** Database is safe for both versions to read and write simultaneously.

### 4. Deploy New Code

Deploy the new version that reads and writes the new schema. Both old and new code are now running against the new schema.

**Checkpoint:** New code works correctly with the new schema.

### 5. Execute Write Migration

Convert any remaining old-format data to the new format. This can happen gradually since new code is already writing new format.

**Checkpoint:** All data is in the new format (or old format is no longer needed).

### 6. Clean Up

Remove old columns, tables, or code references. This is the final cleanup that breaks backward compatibility.

**Checkpoint:** No old code is still running. All old schema elements are removed.

---

## Implementation Patterns

### Pattern 1: Backward-Compatible Schema Migration

Implement schema changes that are safe during blue-green or canary deployments where old and new versions coexist.

#### ❌ BAD — Breaking Schema Change During Deployment

```bash
# ❌ BAD: Modifying a column in a way that breaks old code
# Old code is still running and tries to read/write shipping_address — will crash
psql -h db-primary -d app_db -c "ALTER TABLE orders DROP COLUMN shipping_address"
psql -h db-primary -d app_db -c "ALTER TABLE orders ADD COLUMN shipping_street VARCHAR(255)"
psql -h db-primary -d app_db -c "ALTER TABLE orders ADD COLUMN shipping_city VARCHAR(100)"
# Problem: old code is still running and tries to read/write shipping_address
# Problem: old code's INSERT/SELECT statements fail immediately
# Problem: during blue-green, old version is serving users who hit these errors
# Problem: this is a breaking change — requires all instances to restart simultaneously
```

**What's wrong:**
- Old code crashes immediately when it tries to access the dropped column
- During blue-green deployment, old version serves users who hit errors
- No graceful transition period
- Requires downtime for all instances to restart

#### ✅ GOOD — Additive Migration with Dual-Write

```bash
# ✅ GOOD: Backward-compatible schema migration using expand/contract pattern
# Phase 1 (Expand): Add new columns, write to both old and new
# Phase 2 (Contract): Read from new, drop old columns

# --- Configuration ---
DB_HOST="db-primary"
DB_NAME="app_db"
DB_USER="app_user"
TABLE="orders"
DRY_RUN=false

# --- Phase 1: Add new column (backward-compatible — old code ignores it) ---
phase_add_column() {
  local table=$1 new_column=$2 column_type=$3
  local null_clause="NULL"  # Nullable for backward compatibility

  if [[ "$DRY_RUN" == true ]]; then
    echo "[DRY RUN] ALTER TABLE $table ADD COLUMN $new_column $column_type $null_clause"
  else
    echo "Phase 1: Adding $new_column to $table as nullable"
    psql -h "$DB_HOST" -d "$DB_NAME" -U "$DB_USER" -c \
      "ALTER TABLE $table ADD COLUMN IF NOT EXISTS $new_column $column_type $null_clause"
  fi
}

# --- Phase 2: Set up dual-write (app-level, not SQL) ---
# This is an application code change, not a database migration.
# The new code version writes to BOTH old_column and new_column:
#
#   INSERT INTO orders (old_column, new_column) VALUES (?, ?);
#   -- Old code writes: INSERT INTO orders (old_column) VALUES (?);
#   -- New code writes: INSERT INTO orders (old_column, new_column) VALUES (?, ?);
#
# This ensures both columns stay in sync during the transition.
phase_dual_write() {
  cat <<EOF
Phase 2: Enable dual-write at the application level
  - Old code writes to old_column only (unchanged)
  - New code writes to BOTH old_column and new_column
  - Both columns stay in sync via application logic
  - Deploy new code that reads from new_column
EOF
}

# --- Phase 3: Deploy new code (reads from new column) ---
phase_read_new() {
  echo "Phase 3: Deploy new code that reads from new_column"
  echo "  - Old code continues reading old_column (unchanged)"
  echo "  - New code reads from new_column"
  echo "  - Both columns contain the same data (dual-write ensured this)"
  echo "  - Deploy with rolling update"
  # kubectl set image deployment/orders app=orders:v2.0.0
  # kubectl rollout status deployment/orders --timeout=120s
}

# --- Phase 4: Drop old column (contraction — only after old code is gone) ---
phase_drop_old() {
  local table=$1 old_column=$2 new_column=$3

  # Verification: ensure new column has data for all rows
  echo "Verifying $new_column has data for all rows..."
  local null_count
  null_count=$(psql -h "$DB_HOST" -d "$DB_NAME" -U "$DB_USER" -t \
    -c "SELECT COUNT(*) FROM $table WHERE $new_column IS NULL" | tr -d ' ')

  if [[ "$null_count" != "0" ]]; then
    echo "ERROR: $new_column has $null_count NULL values — cannot drop $old_column yet"
    echo "Run backfill first: UPDATE $table SET $new_column = <computed_value> WHERE $new_column IS NULL"
    return 1
  fi

  echo "Verification passed. Dropping $old_column..."
  if [[ "$DRY_RUN" != true ]]; then
    psql -h "$DB_HOST" -d "$DB_NAME" -U "$DB_USER" -c \
      "ALTER TABLE $table DROP COLUMN IF EXISTS $old_column"
  fi
}

# --- Full migration execution ---
run_migration() {
  echo "=== Backward-Compatible Schema Migration ==="
  echo "Table: $TABLE"
  echo "DRY_RUN: $DRY_RUN"
  echo "---"

  # Step 1: Add new column (non-destructive)
  phase_add_column "$TABLE" "shipping_street" "VARCHAR(255)"
  phase_add_column "$TABLE" "shipping_city" "VARCHAR(100)"

  echo ""

  # Step 2: Deploy dual-write application code
  phase_dual_write

  echo ""

  # Step 3: Deploy new code
  phase_read_new

  echo ""

  # Step 4: After confirming new code works, drop old column
  phase_drop_old "$TABLE" "shipping_address" "shipping_city"

  echo "=== Migration Complete ==="
}

# --- Usage ---
# run_migration  # Execute with actual DB changes
# DRY_RUN=true run_migration  # Preview without executing
```

### Pattern 2: Cache Invalidation Strategy

Manage cache invalidation during deployments to prevent stale or corrupted cache entries.

#### ❌ BAD — No Cache Invalidation

```bash
# ❌ BAD: Deploying new code that interprets cache differently, without invalidation
# Old cache entries: {"order:{id}": order_data}
# New cache entries: {"v2:order:{id}": order_data_with_new_fields}
# Old entries are never invalidated — new code reads stale, old-format data
# Result: new code sees corrupted or incomplete data from old cache entries

# Deploy new code without cleaning cache — users see mixed old/new data formats
kubectl set image deployment/orders app=orders:v2.0.0
kubectl rollout status deployment/orders
# New code runs but reads stale v1-format entries from cache
```

#### ✅ GOOD — Versioned Cache with Clean Invalidation

```bash
# ✅ GOOD: Versioned cache keys with safe invalidation during deployment
# Version-prefixed keys prevent old/new format collisions

# --- Configuration ---
REDIS_HOST="redis-master"
REDIS_PORT="6379"
CACHE_NAMESPACE="app"
CACHE_VERSION="v2"

# --- Versioned cache key generation ---
# Old format: "app:order:{order_id}"
# New format: "v2:order:{hash_of_resource_id}"
make_cache_key() {
  local resource_type=$1 resource_id=$2
  local key_hash
  key_hash=$(echo -n "${CACHE_NAMESPACE}:${resource_type}:${resource_id}" \
    | sha256sum | cut -c1-16)
  echo "${CACHE_VERSION}:${resource_type}:${key_hash}"
}

# --- Cache invalidation functions ---
# Invalidate entries for a specific resource type at current version
invalidate_version() {
  local resource_type=$1
  local pattern="${CACHE_VERSION}:${resource_type}:*"

  echo "Invalidating cache pattern: $pattern"
  local count
  count=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" KEYS "$pattern" | wc -l)
  redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" DEL $(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" KEYS "$pattern") 2>/dev/null
  echo "  Invalidated $count keys for $resource_type@$CACHE_VERSION"
}

# Invalidate ALL cache entries for a resource type, regardless of version
invalidate_all_versions() {
  local resource_type=$1
  local pattern="*:${resource_type}:*"

  echo "Invalidating ALL versions for resource type: $resource_type"
  local count
  count=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" KEYS "$pattern" | wc -l)
  redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" DEL $(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" KEYS "$pattern") 2>/dev/null
  echo "  Invalidated $count keys (all versions)"
}

# --- Safe deployment with cache invalidation ---
deploy_with_cache_invalidation() {
  local changed_resource_types=$@
  local cache_version_changed=false

  echo "=== Cache Invalidation Before Deployment ==="

  for resource_type in $changed_resource_types; do
    if [[ "$cache_version_changed" == true ]]; then
      invalidate_all_versions "$resource_type"
    else
      invalidate_version "$resource_type"
    fi
  done

  echo ""
  echo "Cache invalidated. Proceeding with deployment..."
  # kubectl set image deployment/app app=app:v2.0.0
  # kubectl rollout status deployment/app
}

# --- Usage ---
# deploy_with_cache_invalidation "order" "user" "product"
# deploy_with_cache_invalidation "order" "user" "product"  # If cache format changed:
# deploy_with_cache_invalidation() { deploy_with_cache_invalidation "order" "user"; invalidate_all_versions "order"; invalidate_all_versions "user"; }
```

### Pattern 3: State Transition Validator

Validate that state transitions during deployment are safe and reversible.

#### ✅ GOOD — File-Based State Transition Validation

```bash
# ✅ GOOD: Validate state transitions using file-based state management
# Each deployment has a state file that tracks current and target states

# --- State file configuration ---
STATE_DIR="/tmp/state-machine"
STATE_FILE="$STATE_DIR/state.json"

# --- Initialize state machine ---
init_state() {
  local initial_state=$1
  mkdir -p "$STATE_DIR"
  jq -n --arg s "$initial_state" --arg t "t '$initial_state" --argjson step 0 \
    '{current_state: $s, target_state: null, step: $step, updated_at: now}' \
    > "$STATE_FILE"
}

# --- Allowed transitions (JSON) ---
# Define which state transitions are permitted per service
TRANSITIONS_FILE="/tmp/allowed-transitions.json"
# {
#   "database": {
#     "migrating": ["ready", "rollback"],
#     "ready": ["migrating"],
#     "rollback": ["ready"]
#   },
#   "cache": {
#     "invalidating": ["ready"],
#     "ready": ["invalidating"]
#   }
# }

# --- Validate transition ---
validate_transition() {
  local service=$1 from_state=$2 to_state=$3

  # Check if this transition is allowed
  local allowed
  allowed=$(jq -r --arg svc "$service" --arg from "$from_state" \
    '.[$svc][$from] // [] | map(select(. == $to_state)) | length' \
    "$TRANSITIONS_FILE")

  if [[ "$allowed" -eq 0 ]]; then
    echo "❌ BLOCKED: $service $from_state → $to_state is not allowed"
    echo "   Allowed transitions from $from_state:"
    jq -r --arg svc "$service" --arg from "$from_state" \
      '.[$svc][$from] // [] | .[] | "   - \(.)"' "$TRANSITIONS_FILE"
    return 1
  fi

  echo "✅ ALLOWED: $service $from_state → $to_state"
  return 0
}

# --- Execute transition with validation ---
execute_transition() {
  local service=$1 from_state=$2 to_state=$3 action_fn=$4

  # Validate the transition
  if ! validate_transition "$service" "$from_state" "$to_state"; then
    return 1
  fi

  # Execute the action
  echo "Executing: $service $from_state → $to_state"
  if $action_fn; then
    # Update state file
    local state
    state=$(cat "$STATE_FILE")
    jq --arg svc "$service" --arg from "$from_state" --arg to "$to_state" \
      --argjson step $(( $(echo "$state" | jq -r '.step') + 1 )) \
      '.current_state = $to | .target_state = null | .step = $step | .updated_at = now' \
      "$STATE_FILE" > "${STATE_FILE}.tmp"
    mv "${STATE_FILE}.tmp" "$STATE_FILE"
    echo "✅ Transition complete for $service"
    return 0
  else
    echo "❌ Action failed for $service"
    return 1
  fi
}

# --- State queries ---
get_current_state() {
  local service=$1
  if [[ -f "$STATE_FILE" ]]; then
    jq -r --arg s "$service" '.current_state // "unknown"' "$STATE_FILE"
  else
    echo "unknown"
  fi
}

get_transition_history() {
  if [[ -f "$STATE_FILE" ]]; then
    echo "=== Deployment State History ==="
    jq -r '"\(.updated_at) | \(.current_state) (step \(.step))"' "$STATE_FILE"
  else
    echo "No state history found"
  fi
}

# --- Usage ---
# init_state "ready"
# execute_transition "database" "ready" "migrating" "psql -c 'ALTER TABLE ...'"
# execute_transition "cache" "ready" "invalidating" "redis-cli FLUSHDB"
# get_transition_history
```

---

## Configuration Examples

### Migration Configuration

```yaml
migration:
  strategy: backward_compatible
  phases:
    - name: expand
      actions: [add_column, add_index, add_table]
      safety: additive_only
    - name: dual_write
      actions: [dual_write, backfill]
      safety: write_both
    - name: read_new
      actions: [deploy_new_code, read_new_column]
      safety: read_new
    - name: contract
      actions: [drop_old_column, drop_old_table, remove_dual_write]
      safety: remove_old
  cache:
    invalidate_before_deploy: true
    invalidate_on_format_change: true
    version_prefix: true
```

---

## Constraints

### MUST DO

- **Always design additive-first schema changes** — Add columns/tables before removing old ones
- **Run read migrations before deploying new code** — New code must be able to read both old and new format during transition
- **Dual-write during deployment** — New code must write to both old and new formats simultaneously
- **Validate data completeness before dropping old schema** — Never drop a column without verifying the new one has all data
- **Invalidate cache before deploying code that changes cache format** — Stale cache entries are a deployment risk
- **Test rollback of schema changes** — Schema rollback is harder than code rollback; test it first

### MUST NOT DO

- **Never drop or modify existing columns during deployment** — Old code will crash; use additive-only changes
- **Never deploy new code that reads a different cache format without invalidation** — Stale cache = corrupted data
- **Never skip the dual-write phase** — Going straight from old to new format creates a data gap
- **Never remove old code while old schema is still in use** — Both must be retired in the correct order
- **Never run a destructive migration on production without a tested rollback** — Destructive = irreversible by definition

---

## Philosophy Alignment

This skill adheres to the **5 Laws of Elegant Defense**:

### Early Exit
- Schema changes that aren't additive exit early — the migration is rejected before execution
- Cache invalidation fails fast — if invalidation can't complete, deployment is blocked

### Parse Don't Validate
- Migration steps are parsed from a declarative configuration
- Internal validation trusts parsed migration order, never re-validates sequencing

### Atomic Predictability
- Each migration phase is independently verifiable: expand, dual_write, read_new, contract
- Cache key generation is deterministic — same inputs always produce same keys

### Fail Fast
- Any validation failure blocks the transition — no partial state changes
- Cache version mismatch is treated as a cache miss, not a data error

### Intentional Naming
- Migration phases (`expand`, `dual_write`, `read_new`, `contract`) describe the actual state change
- `invalidate_version()` vs `invalidate_all_versions()` — scope is explicit

---

## Related Skills

| Skill Name | When to Use | Relationship |
|------------|------------|--------------|
| `deployment-philosophy` | Use **before** this skill to assess if state changes are involved in your deployment | Prerequisite: change risk assessment |
| `blue-green-deployment` | Use **alongside** when deploying with database schema changes | Complementary: schema + deployment coordination |
| `rollback-strategy` | Use **alongside** for data-aware rollback procedures | Complementary: rollback must handle state changes |
| `deployment-orchestration` | Use **alongside** for multi-service deployments with shared data | Complementary: coordinates data + code deployment |

---

## Output Template

When applying this skill, your output should contain:

1. **State Change Classification** — Type of state change (schema, cache, data format)
2. **Migration Steps** — Phase-by-phase migration plan with SQL/config
3. **Compatibility Matrix** — Which code versions can read/write which schema
4. **Cache Invalidation Plan** — What to invalidate and when
5. **Rollback Plan** — How to reverse each migration step

---

**Skill Version:** 1.0.0  
**Created:** 2026-05-15  
**Maturity:** stable  
**Completeness:** 95%
