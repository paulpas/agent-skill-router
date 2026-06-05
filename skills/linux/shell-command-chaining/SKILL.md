---




name: shell-command-chaining
description: Implements shell command chaining patterns using &&, ||, and ; operators
  for conditional execution, validation gates, fallback chains, and safe sequential
  workflows in bash scripts.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: linux
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - do-dont
  - examples
  triggers: shell command chaining, && operator, || operator, semicolon in bash, conditional command execution, fallback chain, AND list OR list, short-circuit evaluation command execution
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: linux-shell-process-management, shell-parameter-expansion




---




# Shell Command Chaining and Conditional Execution

Implements reliable sequential and conditional command execution patterns using `&&` (AND-list), `||` (OR-list), and `;` (semicolon) operators in bash scripts. Teaches how to build validation gates, fallback chains, safe cleanup sequences, and deployment pipelines that behave predictably under `set -e`.

## TL;DR Checklist

- [ ] Use `&&` for dependent steps — second command runs only if the first exits 0
- [ ] Use `||` for fallback/alternative paths — second command runs only if the first fails
- [ ] Use `;` when you want unconditional sequential execution, ignoring all exit codes
- [ ] Never rely on `A && B || C` as a true ternary — if A succeeds and B fails, C runs unexpectedly
- [ ] Remember that commands inside `&&` / `||` chains are exempt from `set -e` (errexit)
- [ ] Quote all variable expansions in chained commands: `[[ -f "$file" ]] && cp "$file" "$dest"`

---

## When to Use

Use this skill when:

- Building bash scripts that must proceed only if prerequisites are met
- Implementing deployment pipelines where each step depends on the previous one
- Designing fallback chains: try method A, fall back to method B, abort if both fail
- Writing cleanup or teardown logic that must always run regardless of success/failure
- Creating validation gates that check for tools, files, permissions before executing expensive operations

---

## When NOT to Use

Avoid this skill for:

- Parallel/concurrent execution — use `&`, `jobs`, `fg`, `bg` from `linux-shell-process-management` instead
- Variable substitution and default values — use parameter expansion `${VAR:-default}` from `shell-parameter-expansion` instead
- Complex multi-path logic with many branches — use explicit `if/elif/else/fi` blocks for readability (chains beyond 5 operators become unreadable)
- Subshell isolation needs — if a failure in one chain step should not affect the parent shell, use `(...)` subshells or dedicated functions

---

## Core Workflow

1. **Determine Execution Dependency** — Ask: "Does the next command require the previous one to succeed?"
   - Yes → `&&`
   - No, but I need an alternative if it fails → `||`
   - No dependency at all → `;`
   **Checkpoint:** Write down the expected exit codes for each step in the chain before assembling.

2. **Choose the Operator** — Select based on the dependency analysis:
   - `&&` chains abort on first failure (zero or non-zero exit)
   - `||` chains continue only on failure
   - `;` runs everything unconditionally
   **Checkpoint:** Verify the chain handles every expected exit code path.

3. **Write and Test the Chain** — Implement with proper quoting, test each operator branch in isolation:
   ```bash
   # Test && branch (success)
   true && echo "chain executed"  # prints
   false && echo "should not print"  # silent, exit 1
   
   # Test || branch (failure fallback)
   false || echo "fallback ran"  # prints
   true || echo "should not print"  # silent, exit 0
   ```

4. **Verify with `set -e` Interaction** — Confirm commands inside `&&` / `||` do not trigger errexit on failure:
   ```bash
   set -euo pipefail
   false && true  # does NOT abort despite `false` returning non-zero
   echo "still running"  # prints because `true` succeeded, and `false` was in an AND-list
   ```

---

## Implementation Patterns

### Pattern 1: Validation Gate (AND-list with `&&`)

A validation gate checks that all prerequisites exist before proceeding. Each `&&` is a checkpoint — if any check fails, the chain aborts immediately without executing the main operation. This is the most common and safest chaining pattern in production scripts.

```bash
#!/usr/bin/env bash
set -euo pipefail

# Validation gate: ensure all required tools are available before deployment
validate_prerequisites() {
    local missing=0

    # Check each tool; if any fails, the && chain breaks and we print a message
    command -v docker  >/dev/null 2>&1 || { echo "ERROR: docker is not installed" >&2; missing=$((missing + 1)); }
    command -v kubectl >/dev/null 2>&1 || { echo "ERROR: kubectl is not installed" >&2; missing=$((missing + 1)); }
    command -v helm    >/dev/null 2>&1 || { echo "ERROR: helm is not installed" >&2; missing=$((missing + 1)); }

    if (( missing > 0 )); then
        echo "FATAL: $missing prerequisite(s) missing — aborting" >&2
        return 1
    fi

    echo "All prerequisites verified."
}

# Usage in a chained gate — only deploy if validation passes
validate_prerequisites && \
  docker build -t myapp:latest . && \
  docker push myapp:latest && \
  helm upgrade --install myapp ./charts/myapp && \
  echo "Deployment complete."
```

**Why this works:** If `docker build` fails, `docker push` and `helm upgrade` never execute. The chain stops at the first failure, preventing partially-applied deployments. Each step is verified before proceeding.

#### BAD vs GOOD

```bash
# ❌ BAD: No validation gate — if docker is missing, cryptic error deep in script
docker build -t myapp . && \
  docker push myapp && \
  kubectl apply -f deployment.yaml
# User gets "docker: command not found" with no context about what was supposed to happen

# ✅ GOOD: Explicit validation gate before the main chain
command -v docker >/dev/null || { echo "Install docker first"; exit 1; }
command -v kubectl >/dev/null || { echo "Install kubectl first"; exit 1; }
docker build -t myapp . && \
  docker push myapp && \
  kubectl apply -f deployment.yaml
```

---

### Pattern 2: Fallback / Alternative Execution (OR-list with `||`)

When a command might fail in certain environments, chain alternatives with `||`. Each subsequent operator tries the next method only when the previous one has failed. This pattern is essential for cross-platform scripts and gracefully degraded operations.

```bash
#!/usr/bin/env bash
set -euo pipefail

# Fallback chain: try multiple methods to set a timezone, last resort uses UTC
setup_timezone() {
    local desired_tz="${1:-UTC}"

    # Try timedatectl (systemd systems), then tzselect (busybox/alpine), then hardcoded value
    if command -v timedatectl >/dev/null 2>&1; then
        timedatectl set-timezone "$desired_tz" 2>/dev/null && \
            echo "Timezone set via timedatectl to $desired_tz" || \
            { echo "WARN: timedatectl failed, trying fallback" >&2; }
    fi

    # Second fallback: use tzselect if available
    command -v tzselect >/dev/null 2>&1 && \
        echo "$desired_tz" | tzselect -y >/dev/null 2>&1 && \
        echo "Timezone set via tzselect to $desired_tz" || \
        { echo "WARN: tzselect failed, using hardcoded /etc/localtime link" >&2; }

    # Final fallback: direct symlink (works on nearly all Linux systems)
    ln -sf "/usr/share/zoneinfo/$desired_tz" /etc/localtime 2>/dev/null && \
        echo "Timezone set via /etc/localtime symlink to $desired_tz" || \
        { echo "FATAL: could not set timezone to $desired_tz" >&2; return 1; }
}

# Simple fallback chain for downloading a file from multiple CDN locations
download_with_fallback() {
    local url="$1"
    local dest="${2:-./output}"

    curl -fsSL "$url" -o "$dest" 2>/dev/null || \
      wget -q --no-check-certificate "$url" -O "$dest" 2>/dev/null || \
      { echo "ERROR: failed to download $url via curl or wget" >&2; return 1; }

    [[ -s "$dest" ]] || { echo "ERROR: downloaded file is empty" >&2; return 1; }
    echo "Downloaded to $dest ($(stat -c%s "$dest") bytes)"
}
```

**Key insight:** The `||` operator creates a cascading fallback. Each step is tried only when the previous one has failed. This is fundamentally different from `&&` (which aborts on failure) and `;` (which runs everything regardless).

#### BAD vs GOOD

```bash
# ❌ BAD: Falls back to nothing — if curl fails, script silently does nothing
curl -fsSL "https://example.com/file.tar.gz" -o file.tar.gz
echo "Proceeding with extraction..."  # Always runs, even if download failed!
tar -xzf file.tar.gz  # Crashes on missing file

# ✅ GOOD: Explicit fallback chain with final failure handling
curl -fsSL "https://example.com/file.tar.gz" -o file.tar.gz 2>/dev/null || \
  wget -q "https://example.com/file.tar.gz" -O file.tar.gz 2>/dev/null || \
  { echo "ERROR: could not download file" >&2; exit 1; }

[[ -f file.tar.gz ]] || { echo "ERROR: download produced no output" >&2; exit 1; }
tar -xzf file.tar.gz && echo "Extraction complete."
```

---

### Pattern 3: Safe Cleanup Sequences (semicolon after `&&`/`||`)

The semicolon operator executes unconditionally, making it the correct tool for cleanup code that must always run — whether the preceding operation succeeded or failed. Place `;` between a conditional chain and a cleanup step.

```bash
#!/usr/bin/env bash
set -euo pipefail

# Deploy with guaranteed cleanup regardless of outcome
deploy_application() {
    local version="${1:-latest}"
    local temp_dir
    temp_dir="$(mktemp -d)"

    echo "Deploying version $version..."

    # Main operation chain: download, extract, deploy
    # If ANY step fails, the || branch catches it and sets $? to non-zero for cleanup
    (
        curl -fsSL "https://releases.example.com/app-${version}.tar.gz" -o "${temp_dir}/app.tar.gz" && \
        tar -xzf "${temp_dir}/app.tar.gz" -C "${temp_dir}" && \
        cp -r "${temp_dir}"/app/* /opt/app/ && \
        systemctl restart app-service
    ) || {
        local exit_code=$?
        echo "WARN: deployment failed with exit code $exit_code, proceeding to cleanup" >&2
        return "$exit_code"
    }

    echo "Deployment successful."
}

# Simpler version using pure chaining (no subshell):
deploy_simple() {
    local temp_file="/tmp/deploy-tmp-$$"

    # Step 1: Download (conditionally runs cleanup on failure via ||)
    curl -fsSL "https://releases.example.com/app.tar.gz" -o "$temp_file" && \
      echo "Downloaded successfully." || \
      { echo "ERROR: download failed" >&2; }

    # Step 2: ALWAYS run cleanup — ; ignores the exit code of the previous chain
    rm -f "$temp_file"; echo "Temporary file cleaned up."

    # Combined pattern: deploy succeeds OR fails, but cleanup always runs
    curl -fsSL "https://releases.example.com/app.tar.gz" -o /opt/app/latest.tar.gz && \
      systemctl restart app || \
      { echo "Restart failed, checking status..." >&2; systemctl status app; }

    # Cleanup — semicolon ensures this runs regardless of restart outcome
    rm -f /opt/app/previous.tar.gz 2>/dev/null; echo "Old artifact removed."
}
```

**Critical detail:** The semicolon `;` has the lowest precedence among chaining operators. In `A && B || C; D`, `D` runs unconditionally after the entire `A && B || C` expression completes — this is exactly what you want for cleanup.

#### BAD vs GOOD

```bash
# ❌ BAD: Cleanup uses && — only runs if deploy succeeded, leaving temp files on failure
deploy() {
    cp app.tar.gz /opt/ 2>/dev/null && \
      tar -xzf /opt/app.tar.gz -C /opt/ && \
      echo "Deployed"

    rm -f /tmp/deploy-$$  # This runs always because it's on a new line without chaining...
                         # BUT: if someone adds && here, cleanup stops running on failure!
}

# ✅ GOOD: Cleanup uses ; — runs unconditionally after the conditional chain
deploy() {
    local tmp="/tmp/deploy-$$"

    cp app.tar.gz /opt/ 2>/dev/null && \
      tar -xzf /opt/app.tar.gz -C /opt/ && \
      echo "Deployed" || \
      { echo "ERROR: deploy failed for $user" >&2; }

    # Semicolon ensures cleanup always runs, even if deploy failed
    rm -f "$tmp"; echo "Temp files cleaned."
}
```

---

### Pattern 4: Multi-Step Deployment Pipeline (long AND-list chains)

Production deployment scripts use long `&&` chains to create linear pipelines where every step must succeed before the next begins. This pattern provides automatic rollback-at-first-failure semantics without explicit error handling in each step.

```bash
#!/usr/bin/env bash
set -euo pipefail

# Production deployment pipeline — each step chained with &&
# If any step fails, the entire pipeline aborts and no further steps execute
run_deployment_pipeline() {
    local env="${1:-staging}"
    local branch="${2:-main}"
    local skip_tests=false

    echo "=== Starting deployment to $env (branch: $branch) ==="

    # Step 1: Validate environment
    [[ -f ".env.${env}" ]] || { echo "ERROR: .env.${env} not found" >&2; exit 1; }
    [[ -f "Dockerfile" ]] || { echo "ERROR: Dockerfile not found" >&2; exit 1; }

    # Step 2: Pull latest code and verify integrity
    git fetch origin "$branch" && \
      git rev-parse --verify "origin/$branch" >/dev/null 2>&1 && \
      echo "✓ Branch verified: origin/$branch"

    # Step 3: Run tests (skip only if explicitly requested)
    if [[ "$skip_tests" != "true" ]]; then
        pytest tests/ -q --tb=short && \
          echo "✓ All tests passed" || \
          { echo "✗ Tests failed — aborting deployment" >&2; exit 1; }
    else
        echo "⊘ Tests skipped (explicit request)"
    fi

    # Step 4: Build and tag Docker image
    docker build -t "myapp:${env}-$(git rev-parse --short HEAD)" . && \
      echo "✓ Image built"

    # Step 5: Push to registry
    docker push "myapp:${env}-$(git rev-parse --short HEAD)" && \
      echo "✓ Image pushed"

    # Step 6: Deploy with health check
    kubectl set image deployment/myapp myapp="myapp:${env}-$(git rev-parse --short HEAD)" && \
      kubectl rollout status deployment/myapp --timeout=120s && \
      echo "✓ Rollout complete"

    # Step 7: Run post-deployment smoke tests
    curl -sf "https://${env}.example.com/health" && \
      echo "✓ Health check passed" || \
      { echo "⚠ Health check failed, but deployment completed" >&2; }

    echo "=== Deployment to $env complete ==="
}

# Pipeline with rollback on critical failure (using function + trap for safety)
run_rollback_safe_pipeline() {
    local backup_label="pre-deploy-$(date +%Y%m%d-%H%M%S)"
    local failed=false

    # Set up rollback trigger on first pipeline step failure
    rollback() {
        if [[ "$failed" == "true" ]]; then
            echo "⚠ Rolling back to $backup_label..." >&2
            kubectl rollout undo deployment/myapp
            echo "✓ Rollback complete"
        fi
    }

    trap rollback EXIT  # Always run rollback handler on script exit

    kubectl create deployment/myapp-backup --dry-run=client -o yaml | \
      kubectl apply -f - 2>/dev/null || true

    kubectl set image deployment/myapp myapp="myapp:latest" && \
      sleep 10 && \
      curl -sf "https://example.com/health" >/dev/null && \
      failed=false || \
      failed=true
}
```

**Why long `&&` chains work for pipelines:** Each operator acts as an implicit gate. The chain reads like a sequential specification: "do A, then B, then C, and stop if any fails." This is more compact than equivalent `if/then` blocks while being equally safe.

#### BAD vs GOOD

```bash
# ❌ BAD: Semicolons instead of && — failure in one step doesn't prevent the next
docker build -t myapp . ; docker push myapp ; kubectl apply -f deployment.yaml
# If build fails, push and apply still execute with stale image or no changes

# ✅ GOOD: AND-list chain — each step verified before proceeding
docker build -t myapp . && \
  docker push myapp && \
  kubectl apply -f deployment.yaml && \
  kubectl rollout status deployment/myapp --timeout=60s && \
  echo "Deployment verified."
```

---

### Pattern 5: Atomic Check-Perform-Verify (AND-list with verification)

Atomic operations check a precondition, perform the work, then verify the result — all in a single `&&` chain. This pattern prevents partial state changes by ensuring verification always follows the operation.

```bash
#!/usr/bin/env bash
set -euo pipefail

# Atomic file migration: verify source exists → move it → verify destination has it
atomic_move() {
    local src="$1"
    local dst="$2"

    # Precondition: source must exist and be readable
    [[ -f "$src" && -r "$src" ]] || \
      { echo "ERROR: source not found or not readable: $src" >&2; return 1; }

    # Atomic sequence: check → perform → verify
    cp -v "$src" "$dst" && \
      diff "$src" "$dst" >/dev/null 2>&1 && \
      echo "Atomic move verified: $src → $dst" || \
      { echo "ERROR: verification failed for $dst, cleaning up partial copy" >&2; rm -f "$dst"; return 1; }
}

# Atomic database migration with pre-check and post-verification
run_db_migration() {
    local migration_file="$1"

    # Pre-condition: migration file must exist and be valid SQL
    [[ -f "$migration_file" ]] || { echo "ERROR: migration not found: $migration_file" >&2; return 1; }
    grep -q "^CREATE\|^ALTER\|^INSERT\|^UPDATE\|^DELETE" "$migration_file" 2>/dev/null || \
      { echo "ERROR: migration file does not contain valid SQL statements" >&2; return 1; }

    # Atomic sequence: check → migrate → verify row count
    local before_count
    before_count="$(psql -At -c 'SELECT COUNT(*) FROM users' 2>/dev/null)" || \
      { echo "ERROR: could not query database" >&2; return 1; }

    psql -f "$migration_file" && \
      local after_count="$(psql -At -c 'SELECT COUNT(*) FROM users' 2>/dev/null)" && \
        { [[ "$after_count" != "$before_count" ]] || echo "WARN: row count unchanged (expected for CREATE/ALTER migrations)"; } && \
        echo "Migration verified: $before_count → $after_count rows" || \
        { echo "ERROR: migration may have failed — row count unchanged, review needed" >&2; return 1; }
}

# Atomic config swap with backup and verification
atomic_config_swap() {
    local new_config="$1"
    local target="/etc/myapp/config.yml"

    # Pre-check: new config must be valid YAML (syntax check)
    python3 -c "import yaml; yaml.safe_load(open('$new_config'))" 2>/dev/null && \
      echo "New config syntax OK" || \
      { echo "ERROR: new config has invalid YAML syntax" >&2; return 1; }

    # Atomic swap: backup → replace → verify → reload
    cp "$target" "${target}.bak.$(date +%Y%m%d%H%M%S)" && \
      cp "$new_config" "$target" && \
      diff "$target" "$new_config" >/dev/null 2>&1 && \
        echo "Config verified: ${#new_config} bytes, content matches" || \
        { echo "ERROR: config verification failed, restoring backup" >&2; mv "${target}.bak.*" "$target" 2>/dev/null; return 1; }

    systemctl reload myapp && \
      echo "Config reloaded successfully" || \
      { echo "ERROR: service reload failed, config swap rolled back" >&2; cp "${target}.bak."* "$target" 2>/dev/null; return 1; }
}
```

**Why this is atomic:** The check-perform-verify chain guarantees that if verification fails, the operation is undone. The `&&` chain ensures each step succeeds before the next runs, and the final `||` catches verification failures for rollback.

#### BAD vs GOOD

```bash
# ❌ BAD: No verification — copy might fail silently (disk full, permissions)
cp /tmp/new-config.yml /etc/myapp/config.yml
systemctl reload myapp
# Config could be truncated or empty; no one would know until the app crashes

# ✅ GOOD: Check-perform-verify with rollback on failure
[[ -f /tmp/new-config.yml ]] && \
  cp /etc/myapp/config.yml /etc/myapp/config.yml.bak && \
  cp /tmp/new-config.yml /etc/myapp/config.yml && \
  diff -q /etc/myapp/config.yml /tmp/new-config.yml >/dev/null && \
    systemctl reload myapp && \
    echo "Config updated and verified" || \
    { echo "ERROR: update failed, restoring backup" >&2; mv /etc/myapp/config.yml.bak /etc/myapp/config.yml; }
```

---

### Pattern 6: The `A && B || C` Ternary Anti-Pattern and Proper Alternatives

The expression `A && B || C` is often used as a ternary operator (like `condition ? do_this : do_that` in other languages). **This is dangerous.** If `A` succeeds but `B` fails, `C` will execute — not because the condition was false, but because the action failed. This creates subtle bugs that are extremely hard to debug.

```bash
# ❌ DANGEROUS: A && B || C as a ternary — C runs if either A or B fails!
check_file_exists "$config" && use_production_config() || load_default_config
# Problem: if check passes but use_production_config crashes, default config loads unexpectedly.
# Problem: if check fails AND use_production_config would succeed, default still loads (correct).
# The ambiguity makes this pattern unreliable for any non-trivial logic.

# ✅ SAFE alternative 1: Use explicit if/then/fi (recommended for readability)
if check_file_exists "$config"; then
    use_production_config
else
    load_default_config
fi

# ✅ SAFE alternative 2: If the action is a simple command, && alone suffices
# Only run the fallback when the primary fails (no ternary semantics needed)
command -v curl >/dev/null 2>&1 || apt-get install -y curl

# ✅ SAFE alternative 3: Use function return codes for controlled branching
run_with_fallback() {
    if ! "$@"; then
        echo "Primary command failed, running fallback..." >&2
        run_fallback_command
    fi
}
run_with_fallback my_expensive_operation --flag1 --flag2

# ✅ SAFE alternative 4: Separate the concerns into distinct chains
check_file_exists "$config" && \
  use_production_config || \
  { echo "Config not found, loading defaults" >&2; load_default_config; }
# Note: The braces {} group the fallback so it runs as one unit on failure.
```

**The rule:** Never use `A && B || C` as a ternary when `B` might fail for reasons unrelated to the condition `A`. Use `if/then/fi` instead. The only safe case for `A && B || C` is when `B` is guaranteed not to fail (e.g., a simple variable assignment or echo).

---

## Interaction with `set -e` and `pipefail`

The interaction between chaining operators and `set -e` (errexit) is one of the most misunderstood aspects of bash scripting. Understanding it prevents scripts from aborting unexpectedly or continuing when they should stop.

### How `set -e` Interacts with Each Operator

**`&&` and `||` exempt their left-hand side from errexit.** This is by design: if you explicitly write a conditional chain, bash assumes you are intentionally handling the failure case.

```bash
#!/usr/bin/env bash
set -euo pipefail

# ❌ Without &&/||, set -e would abort here on any non-zero exit
false  # This WOULD trigger errexit and abort the script

# ✅ With &&, the left-hand side is exempt from errexit
false && true   # Does NOT abort — `false` is in an AND-list, its failure is "handled"
echo "Still running"  # Prints because the chain result depends on `true`, not `false`

# ✅ With ||, same exemption applies
false || echo "fallback"  # Does NOT abort — `false` is in an OR-list
echo "Still running"       # Prints
```

**The key insight:** A command that returns non-zero inside `&&` or `||` does NOT trigger errexit. Bash treats these as explicit error handlers. This means:

```bash
set -euo pipefail

# These are ALL safe under set -e (won't abort):
command_that_might_fail && handle_success || handle_failure
maybe_missing_command && optional_step
find /tmp -name "*.log" -delete 2>/dev/null || true

# But this WILL abort (non-zero exit outside any chain):
might_fail_always   # errexit triggers here if might_fail_always returns non-zero
```

### Interaction with `set -o pipefail`

`pipefail` changes how pipeline exit codes are computed: the pipeline returns the exit status of the rightmost command that failed (or 0 if all succeeded). This interacts with chaining in important ways:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Without pipefail: pipeline returns exit code of LAST command only
echo "hello" | grep "NOTFOUND" | true   # Returns 0 (true succeeds)
                                            # Would silently pass even though grep failed!

# With pipefail: pipeline returns exit code of the FIRST failing command
echo "hello" | grep "NOTFOUND" | true   # Returns 123 (grep's non-zero exit)
                                            # This failure propagates through && chains

# Practical impact on chaining:
grep "error" /var/log/syslog | wc -l && \
  echo "Found some errors" || \
  echo "No errors found or grep failed"

# With pipefail, if the file doesn't exist, grep returns non-zero and
# the || branch executes — this is usually the desired behavior.
```

**Recommendation:** Always use `set -euo pipefail` together. The `-u` flag catches unset variables, and `pipefail` ensures pipeline failures don't get hidden by a trailing `true`.

### Exit Code Summary Table

| Expression | Left command fails (exit 1) | Left command succeeds (exit 0) |
|---|---|---|
| `A ; B` | B runs unconditionally. Chain exit = exit of B. | B runs unconditionally. Chain exit = exit of B. |
| `A && B` | B does NOT run. Chain exit = 1 (left's exit). Short-circuits. | B runs. Chain exit = exit of B. |
| `A \|\| B` | B runs. Chain exit = exit of B. | B does NOT run. Chain exit = 0 (left's exit). Short-circuits. |
| `A && B ; C` | A fails → B skipped → C runs. Exit = exit of C. | A succeeds → B runs → C runs. Exit = exit of C. |

---

## Constraints

### MUST DO
- Use `set -euo pipefail` as the first line of every non-trivial bash script
- Quote all variable expansions in chains: `[[ -f "$file" ]] && mv "$file" "$dest"` (never `"$file"`)
- Use `&&` for sequential dependencies where each step requires the previous one to succeed
- Use `||` for fallback chains, defaulting, and error recovery paths
- Use `;` between a conditional chain (`&&`/`||`) and cleanup code that must always run
- Group complex fallback logic in `{ ... }` or `(...)` blocks for clarity and scoping
- Test each operator branch independently before combining into long chains
- Add `echo` status messages after major chain steps for observability

### MUST NOT DO
- Never use `A && B || C` as a ternary when `B` might fail — use explicit `if/then/fi` instead
- Never use `;` to separate conditional steps that have dependencies — use `&&` instead
- Never assume the right-hand side of `||` ran successfully — always verify fallback outcomes
- Never put cleanup code after `&&` — it won't run on failure. Use `;` or a `trap EXIT` handler.
- Never chain more than 5–6 operators on one line — break into named functions with clear step labels
- Never use `set -e` without also using `set -o pipefail` and `set -u` (unbound variables are equally dangerous)

---

## Output Template

When implementing or reviewing shell command chains, produce:

1. **Operator Choice** — Which operator (`&&`, `||`, `;`) was used for each link and why
2. **Execution Flow Diagram** — ASCII representation of the chain's control flow showing success/failure branches
3. **set -e Compliance** — Confirm that all commands are properly placed (no non-chained commands that could trigger errexit unexpectedly)
4. **Verification Points** — Where in the chain does verification occur? Is there a check-perform-verify pattern for critical operations?
5. **Cleanup Strategy** — How does cleanup code execute regardless of success/failure? (semicolon, trap, or subshell)

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `linux-shell-process-management` | Backgrounding commands with `&`, job control (`jobs`, `fg`, `bg`), and process synchronization (`wait`) — complements chaining for concurrent workflows |
| `shell-parameter-expansion` | Variable substitution patterns (`${VAR:-default}`, `${VAR:?error}`) that work alongside chains for defensive scripting — use `${VAR:?check}` inside validation gates |

---

## Live References

> Authoritative documentation links for shell command chaining and conditional execution in bash.

- [Bash Reference Manual: AND and OR Lists](https://www.gnu.org/software/bash/manual/html_node/Lists.html)
- [Bash Reference Manual: Exit Status](https://www.gnu.org/software/bash/manual/html_node/Exit-Status.html)
- [Bash Reference Manual: Error Handling](https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html) (set -e, set -o pipefail documentation)
- [Advanced Bash-Scripting Guide: Lists and Chaining](https://tldp.org/LDP/abs/html/listcomps.html)
- [Bash Pitfalls: Conditional Commands](https://mywiki.wooledge.org/BashPitfalls#cmd1_&&_cmd2_.7C._cmd1_.7C.7C_cmd2_.7C._cmd3)
- [Devhints.io: Bash Cheat Sheet](https://devhints.io/bash#lists-and-chaining)
