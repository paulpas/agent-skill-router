---
name: cicd-pipeline-troubleshooting
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Diagnoses and resolves CI/CD pipeline failures with actionable debugging
  commands for GitHub Actions, GitLab CI, and build optimization patterns.
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: code
  related-skills: cicd-pipeline-debugging, cncf-argocd, cncf-flux, cncf-tekton
  role: implementation
  scope: implementation
  triggers: ci cd troubleshooting, pipeline failure, build cache, parallel build,
    artifact resolution, github actions, gitlab ci, how do i debug pipelines
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  version: 1.0.0
------
# CI/CD Pipeline Troubleshooting

Debugs and resolves CI/CD pipeline failures with actionable diagnostics, cache optimization strategies, and build optimization techniques for GitHub Actions, GitLab CI, and other CI platforms.

## TL;DR Checklist

- [ ] Check job status and exit codes before assuming code issues
- [ ] Review cache hit/miss patterns and adjust cache keys appropriately
- [ ] Validate artifact paths and permissions before downstream jobs
- [ ] Compare build times across pipeline runs to identify bottlenecks
- [ ] Enable debug logging only when necessary to avoid log noise
- [ ] Verify runner availability and resource constraints
- [ ] Test pipeline locally with act or gitlab-runner before committing

---

## When to Use

Use this skill when:

- Pipeline job fails with cryptic error messages requiring diagnostic investigation
- Build times have increased significantly and optimization is needed
- Cache is not being utilized effectively, causing redundant downloads
- Artifacts are missing or inaccessible between pipeline stages
- Parallel builds are failing due to resource contention or race conditions
- Need to compare pipeline performance across different branches or commits

---

## When NOT to Use

Avoid this skill for:

- Code logic errors that don't involve CI infrastructure — use coding skills instead
- Pipeline configuration design from scratch — create a new pipeline first
- Security vulnerability remediation — use security-audit skill instead
- Workflow orchestration across multiple systems — use agent-orchestration skills

---

## Core Workflow

1. **Identify Failure Point** — Determine which job, stage, or step failed.
   **Checkpoint:** Note the exact error message, exit code, and timestamp before investigating.

2. **Review Pipeline Configuration** — Examine the YAML configuration for syntax errors or misconfiguration.
   **Checkpoint:** Validate YAML syntax with `yamllint` or platform-specific linter.

3. **Check Environment Variables** — Verify all required variables are set and have correct values.
   **Checkpoint:** Confirm variable scope (repository vs. organization vs. environment).

4. **Analyze Cache and Dependencies** — Assess cache hit rate and dependency installation patterns.
   **Checkpoint:** Compare cache key patterns with actual file paths and modification times.

5. **Evaluate Build Optimization** — Measure build times and identify slow steps or redundant work.
   **Checkpoint:** Determine if parallelization or caching improvements are feasible.

6. **Verify Artifact Resolution** — Confirm artifacts are created, stored, and accessible correctly.
   **Checkpoint:** Validate artifact retention period and download permissions.

---

## Implementation Patterns

### Pattern 1: GitHub Actions Debugging Commands

Debugging GitHub Actions pipelines requires specific commands to inspect logs, environment, and artifacts.

```bash
# Check recent workflow runs
gh run list --limit 10

# View detailed logs for a specific run
gh run view <run-number> --log

# Get job-level logs
gh run view <run-number> --job <job-id>

# Download artifacts from a run
gh run download <run-number> --dir ./artifacts

# List artifacts for a run
gh run list-artifacts <run-number>

# Get workflow run timing
gh run view <run-number> --json createdAt,startedAt,completedAt
```

```bash
# Check runner environment
gh run env

# View workflow file for a run
gh run view <run-number> --workflow

# Check job status in JSON format
gh run view <run-number> --json status,conclusion,startedAt,completedAt
```

#### BAD vs GOOD: Debugging Verbose Output

```yaml
# ❌ BAD: Too verbose, fills logs with noise
- name: Debug everything
  run: |
    set -x
    env
    pwd
    ls -la
    # This floods logs and slows execution
```

```yaml
# ✅ GOOD: Targeted debugging with cleanup
- name: Debug cache
  if: always()
  run: |
    echo "Cache key: ${{ env.CACHE_KEY }}"
    echo "Cache paths: ${{ env.CACHE_PATHS }}"
    # Only output what's needed
```

### Pattern 2: GitLab CI Debugging Commands

GitLab CI provides specific tools and commands for pipeline diagnosis and optimization.

```bash
# List recent pipeline runs
gitlab pipeline list --project-id <project-id> --limit 10

# Get pipeline details with jobs
gitlab pipeline get <pipeline-id> --project-id <project-id>

# List jobs in a pipeline
gitlab pipeline jobs <pipeline-id> --project-id <project-id>

# Get job logs
gitlab job trace <job-id> --project-id <project-id>

# Download job artifacts
gitlab job artifacts <job-id> --project-id <project-id> --path ./artifacts
```

```bash
# Check pipeline timing
gitlab pipeline get <pipeline-id> --project-id <project-id> --json

# View pipeline graph
gitlab pipeline graph <pipeline-id> --project-id <project-id>
```

#### BAD vs GOOD: GitLab CI Debugging

```yaml
# ❌ BAD: Using echo for everything, hard to parse
debug_job:
  script:
    - echo "Starting debug"
    - echo "ENV_VAR=$ENV_VAR"
    - echo "FILES:"
    - ls -la
    # This creates unstructured log output
```

```yaml
# ✅ GOOD: Using structured debug output
debug_job:
  script:
    - echo "::group::Debug Environment"
    - env | sort
    - echo "::endgroup::"
    - echo "::group::Directory Listing"
    - ls -la
    - echo "::endgroup::"
    # Creates collapsible sections in GitLab UI
```

### Pattern 3: Cache Optimization Commands

Proper cache management can reduce build times by 50% or more.

```bash
# Check cache hit rate in GitHub Actions
gh api repos/{owner}/{repo}/actions/caches --jq '.actions_caches[] | {key, size_in_bytes, created_at}'

# Delete specific cache by key
gh api repos/{owner}/{repo}/actions/caches --method DELETE \
  -f key=<cache-key>

# Clear all caches for a repository (use carefully!)
gh api repos/{owner}/{repo}/actions/caches --method DELETE \
  --jq '.actions_caches[].id' | while read id; do
    gh api repos/{owner}/{repo}/actions/caches/$id --method DELETE
  done
```

```bash
# For local cache testing (act)
act -n --cache-server-dir ./cache-test

# Check cache size locally
du -sh ~/.cache/act/*

# View act cache contents
act cache list
```

#### BAD vs GOOD: Cache Key Patterns

```yaml
# ❌ BAD: Static cache key never updates
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: npm-cache  # Always uses same key, never updates

# ✅ GOOD: Dynamic cache key with hash
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: npm-cache-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      npm-cache-
```

```yaml
# ❌ BAD: Too specific cache key misses hits
- uses: actions/cache@v4
  with:
    path: node_modules
    key: npm-${{ github.sha }}-${{ runner.os }}  # Unique per commit

# ✅ GOOD: Balanced cache key strategy
- uses: actions/cache@v4
  with:
    path: |
      node_modules
      .pnpm-store
    key: npm-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      npm-${{ runner.os }}-
```

### Pattern 4: Build Time Optimization Commands

Identifying and optimizing slow build steps is critical for CI efficiency.

```bash
# Measure GitHub Actions job timing
gh run view <run-number> --json jobs --jq '.jobs[] | {name, startedAt, completedAt}' | \
  jq -r '.[] | "\(.name): \(.completedAt - .startedAt)"'

# Get pipeline duration breakdown
gh run view <run-number> --json steps --jq '
  .steps | group_by(.name) | .[] | 
  {name: .[0].name, total: (map(.completedAt - .startedAt) | add)}
'
```

```bash
# For GitLab CI, check job durations
gitlab job get <job-id> --project-id <project-id> --json | \
  jq '{name, duration, started_at, finished_at}'

# Calculate total pipeline time
gitlab pipeline get <pipeline-id> --project-id <project-id> --json | \
  jq '.duration, .created_at, .finished_at'
```

```bash
# Analyze npm install times
npm install --timing

# View npm timing report
cat ~/.npm/_logs/*.log
```

#### BAD vs GOOD: Parallel Build Strategy

```yaml
# ❌ BAD: Sequential builds that could be parallel
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: npm install
      - run: npm run lint
      - run: npm run test
      - run: npm run build
      # Each step waits for previous
```

```yaml
# ✅ GOOD: Parallel build jobs
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - run: npm install
      - run: npm run lint
  test:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - run: npm install
      - run: npm run test
  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - run: npm install
      - run: npm run build
  # Lint and test can run in parallel
```

### Pattern 5: Artifact Resolution Debugging

Artifacts failing to upload or download is a common pipeline failure mode.

```bash
# List artifacts for a GitHub Actions run
gh run list-artifacts <run-number>

# Download specific artifact
gh run download <run-number> -n <artifact-name> -d ./download

# Check artifact size limits (GitHub: 10GB per artifact)
gh run view <run-number> --json artifacts --jq '.artifacts[] | {name, size_in_bytes}'
```

```bash
# Check GitLab artifact sizes
gitlab job get <job-id> --project-id <project-id> --json | \
  jq '.artifacts'

# Download large artifacts in chunks
gitlab job artifacts <job-id> --project-id <project-id> \
  --path <specific-path> --output <output-file>
```

```yaml
# ❌ BAD: Missing artifact retention and paths
- name: Upload artifacts
  uses: actions/upload-artifact@v4
  with:
    name: my-artifact
    # No path specified, may upload nothing
    retention-days: 1  # Too short for multi-day workflows
```

```yaml
# ✅ GOOD: Explicit artifact configuration
- name: Upload build artifacts
  uses: actions/upload-artifact@v4
  with:
    name: build-artifacts-${{ github.sha }}
    path: |
      dist/
      build/
      !dist/**/*.spec.js  # Exclude test files
    retention-days: 7
    if-no-files-found: warn
```

### Pattern 6: Environment and Dependency Debugging

Environment mismatches and dependency issues cause many pipeline failures.

```bash
# Check Node.js version in GitHub Actions
gh run view <run-number> --json steps --jq '
  .steps[] | select(.name == "Setup Node") | 
  {name, status, conclusion, outputs}
'

# Verify npm registry configuration
npm config list

# Check yarn registry
yarn config get registry
```

```bash
# Debug Python environment
python -c "import sys; print(sys.executable); print(sys.version)"
pip list | sort
conda list 2>/dev/null || true

# Check Ruby environment
ruby -v
gem env home
bundle exec which ruby
```

```bash
# Debug Docker build cache
docker buildx build --no-cache --progress=plain .

# View build cache details
docker buildx du --verbose

# Prune old build cache
docker buildx prune
```

#### BAD vs GOOD: Environment Setup

```yaml
# ❌ BAD: Not specifying runtime version
- name: Setup Node
  uses: actions/setup-node@v4
  with:
    node-version: 18  # No patch version, may vary
```

```yaml
# ✅ GOOD: Specific version and cache configuration
- name: Setup Node
  uses: actions/setup-node@v4
  with:
    node-version: '18.20.3'  # Exact patch version
    cache: 'npm'
    cache-dependency-path: '**/package-lock.json'
```

### Pattern 7: Network and Timeout Debugging

Network failures and timeouts are often misdiagnosed as code issues.

```bash
# Check network connectivity in GitHub Actions
- name: Test network
  run: |
    echo "Testing GitHub API connectivity..."
    curl -s -o /dev/null -w "%{http_code}" https://api.github.com
    echo ""
    echo "Testing npm registry..."
    curl -s -o /dev/null -w "%{http_code}" https://registry.npmjs.org
```

```bash
# Increase curl timeout for slow networks
curl --max-time 60 -f https://example.com || echo "Timed out"

# Test Docker registry connectivity
docker login registry.example.com -u user -p token
```

```yaml
# ❌ BAD: Hardcoded timeouts without retry
- name: Download dependencies
  run: npm ci
  timeout-minutes: 1  # Too short for large dependencies
```

```yaml
# ✅ GOOD: Retry logic with exponential backoff
- name: Download dependencies with retry
  uses: nick-fields/retry@v2
  with:
    timeout_minutes: 5
    max_attempts: 3
    command: npm ci
```

### Pattern 8: Parallel Build Optimization

Optimizing parallel builds requires understanding resource constraints.

```bash
# Check parallel job limits in GitHub Actions
gh run view <run-number> --json concurrency --jq '.concurrency'

# List running jobs on a runner
gh api repos/{owner}/{repo}/actions/runs --jq '.workflow_runs[] | select(.status == "in_progress")'

# Check runner status
gh api repos/{owner}/{repo}/actions/runners --jq '.runners[] | {name, status, busy}'
```

```bash
# For self-hosted runners, check CPU and memory
nproc
free -h
df -h

# Monitor resource usage during build
while true; do
  echo "CPU: $(top -bn1 | grep 'Cpu(s)' | awk '{print $2}')%"
  echo "Memory: $(free -m | grep Mem | awk '{print $3 "/" $2 "MB"}')"
  sleep 5
done
```

#### BAD vs GOOD: Parallel Strategy

```yaml
# ❌ BAD: All tests in single job, slow execution
test:
  runs-on: ubuntu-latest
  steps:
    - run: npm install
    - run: npm test
    # All tests run sequentially in one job
```

```yaml
# ✅ GOOD: Test matrix for parallel execution
test:
  runs-on: ubuntu-latest
  strategy:
    matrix:
      node-version: [16, 18, 20]
      os: [ubuntu-latest, windows-latest]
  steps:
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
    - run: npm install
    - run: npm test
```

---

## Constraints

### MUST DO
- Always check job exit codes and error messages before assuming code issues
- Use cache keys that include dependency hashes to ensure cache invalidation
- Implement retry logic for flaky network operations
- Set appropriate artifact retention periods (minimum 7 days for debugging)
- Use parallel builds to reduce total pipeline execution time
- Log cache operations (hits/misses) for optimization analysis
- Validate YAML syntax before committing pipeline changes

### MUST NOT DO
- Store secrets in cache keys or expose them in logs
- Use static cache keys that never update (causes stale dependencies)
- Set artifact retention below 3 days (makes debugging difficult)
- Run all tests sequentially in a single job
- Disable job timeouts (can hang pipelines indefinitely)
- Use `if: always()` without cleanup logic (leaks resources)
- Hardcode platform-specific paths without fallbacks

---

## TL;DR for Code Generation

- Use guard clauses — return early on network failures before proceeding
- Return structured error objects with code, message, and context
- Cache configuration should include version, OS, and dependency hashes
- Implement retry logic with exponential backoff for network operations
- Artifact paths must be absolute or relative to workspace root
- Test parallelization should use matrix strategy for OS and version combinations
- Never store secrets in cache keys or log them inadvertently

---

## Output Template

When debugging a CI/CD pipeline failure, produce:

1. **Failure Diagnosis** — Exact job, step, and error message with exit code
2. **Pipeline Configuration Review** — YAML validation results and potential issues
3. **Environment Analysis** — Runtime versions, dependency versions, and environment variables
4. **Cache Analysis** — Hit/miss rates, cache key patterns, and optimization recommendations
5. **Build Time Analysis** — Step-by-step timing with optimization suggestions
6. **Artifact Resolution** — Upload/download issues and path validation
7. **Recommended Fix** — Specific commands or configuration changes to resolve

---

## Related Skills

| Skill | Purpose |
|---|---|
| `cncf-tekton` | Kubernetes-native CI/CD pipelines for advanced orchestration |
| `cncf-argocd` | GitOps continuous delivery for Kubernetes applications |
| `cncf-flux` | GitOps operator for Kubernetes configuration management |

---

## References

- GitHub Actions Documentation: https://docs.github.com/en/actions
- GitLab CI/CD Documentation: https://docs.gitlab.com/ee/ci/
- GitHub CLI Documentation: https://cli.github.com/manual/
- GitLab CLI Documentation: https://docs.gitlab.com/ee/api/
- Cache Optimization Best Practices: https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows
- GitHub Actions Timeout Settings: https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions#jobsjob_idtimeout-minutes

---

*This skill provides actionable debugging commands and optimization patterns for CI/CD pipelines across multiple platforms.*
