---
name: build-performance-optimization
description: Optimizes CI/CD build times through dependency caching strategies, incremental compilation, build parallelization, artifact reuse, and runner infrastructure tuning for production pipelines.
license: MIT
compatibility: opencode
archetypes:
  - tactical
  - diagnostic
anti_triggers:
  - brainstorming
  - vague ideation
  - quick hack
response_profile:
  verbosity: low
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: coding
  triggers: build optimization, build cache, incremental build, dependency caching, parallel builds, how do i make my build faster
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, config, do-dont]
  related-skills: ci-cd-pipeline-design, monorepo-workspace-patterns
---

# Build Performance Optimization

Optimizes CI/CD pipeline build times through dependency caching strategies, incremental compilation, build parallelization, artifact reuse, and runner infrastructure tuning. When loaded, the model measures current build bottlenecks, profiles individual pipeline stages, and produces concrete optimizations with measurable time savings for production CI/CD pipelines.

## TL;DR Checklist

- [ ] Profile each pipeline stage to identify the longest-running steps
- [ ] Enable dependency caching keyed by lockfile hash (not just directory)
- [ ] Use incremental builds — skip unchanged modules/packages in monorepos
- [ ] Parallelize independent test suites and build jobs across matrix strategy
- [ ] Cache compiled artifacts and intermediate build outputs between stages

---

## When to Use

Use this skill when:

- Build times exceed 15 minutes and are impacting developer productivity
- Adding new services/modules causes linear growth in CI pipeline duration
- Team wants to reduce cloud compute costs tied to runner minutes
- Migrating from monolithic builds to incremental/bazel-style builds
- Evaluating whether to invest in build infrastructure optimization vs. adding more runners

---

## When NOT to Use

Avoid this skill for:

- Setting up the overall CI/CD pipeline structure — use `ci-cd-pipeline-design` instead
- Designing deployment strategies (canary, blue-green) — handled by CI/CD design skill
- Setting up infrastructure provisioning pipelines — use `iac-engineering` instead
- Debugging flaky tests or build failures — use debugging/troubleshooting skills first

---

## Core Workflow

1. **Profile Current Build** — Run builds with timing instrumentation on each step. Identify which stages consume 80%+ of total time. Categorize as: dependency installation, compilation, testing, linting/formatting, or artifact packaging.
   **Checkpoint:** You have a timing breakdown showing the top 3 bottlenecks by percentage of total build time.

2. **Implement Dependency Caching** — Cache node_modules/.venv/.gradle/etc. keyed by lockfile hash (package-lock.json, Pipfile.lock, etc.). Use `actions/cache@v4` or equivalent with a cache miss → rebuild pattern. Never cache based on branch name alone.
   **Checkpoint:** Subsequent builds with unchanged dependencies restore cache in <30 seconds instead of re-downloading.

3. **Enable Incremental Builds** — For projects using Bazel, Turborepo, Nx, or Gradle incremental: configure task dependency graphs so only affected modules rebuild. Skip tests for unchanged packages in monorepo workspaces.
   **Checkpoint:** Adding a change to one module triggers rebuild of only that module and its dependents, not the entire workspace.

4. **Parallelize Workloads** — Use CI matrix strategies to distribute test suites across multiple runners. Split large test files by category (unit/integration/e2e) or file path hash. Ensure each parallel job is self-contained with its own dependencies.
   **Checkpoint:** Total wall-clock time for parallel stages is <70% of sequential execution time, accounting for runner startup overhead.

5. **Optimize Runner Infrastructure** — Select appropriate runner types (container vs VM vs dedicated). Use containerized runners with pre-baked base images containing language runtimes. Pin to specific runner versions for reproducibility.
   **Checkpoint:** Runner startup time is <60 seconds. Base image layers are cached across pipeline runs.

---

## Implementation Patterns

### Pattern 1: Dependency Caching with Lockfile Hashing

Cache keys must be scoped to the lockfile, not the entire repository or branch name. A proper cache key pattern uses a primary key from the lockfile hash and restore-keys for partial fallback matches.

```yaml
# ❌ BAD — Cache key too broad, invalidates on every code change
- name: Cache dependencies
  uses: actions/cache@v4
  with:
    path: node_modules
    key: deps-${{ runner.os }}-${{ hashFiles('**') }}

- name: Cache Python dependencies  
  uses: actions/cache@v4
  with:
    path: .venv
    key: python-deps-${{ hashFiles('.github/workflows/*.yml') }}

# ✅ GOOD — Lockfile-specific cache keys preserve cache across code changes
- name: Cache Node.js dependencies
  uses: actions/cache@v4
  with:
    path: |
      node_modules
      ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-

- name: Cache Python dependencies
  uses: actions/cache@v4
  with:
    path: .venv
    key: ${{ runner.os }}-python-${{ hashFiles('poetry.lock') }}
    restore-keys: |
      ${{ runner.os }}-python-

# ✅ GOOD — Gradle build cache for incremental compilation
- name: Setup Gradle with build cache
  uses: gradle/actions/setup-gradle@v4
  with:
    gradle-home-cache-cleanup: true
```

**Key principles:**
- Use `restore-keys` to fall back to partial matches — even a prefix match saves re-downloading most dependencies
- Cache both the dependency directory AND the package manager's global cache (e.g., `~/.npm`) for maximum reuse
- For Go projects, use the dedicated `actions/setup-go` action which handles module caching automatically

### Pattern 2: Monorepo Incremental Builds with Turborepo

Monorepos are especially prone to full-rebuild waste. Task-level incremental build tools (Turborepo, Nx, Bazel) track file-level dependency graphs and cache task outputs by content hash.

```python
# ❌ BAD — Building everything, no incremental detection
# turbo.json missing task definitions or dependencies field
{
  "pipeline": {
    "build": {},
    "test": {}
  }
}

# ✅ GOOD — Full Turborepo configuration with dependency graphs and caching
{
  "ui": "stream",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**", "build/**"],
      "cache": true
    },
    "test": {
      "dependsOn": ["build"],
      "inputs": ["src/**/*.ts", "src/**/*.tsx", "tests/**/*.ts"],
      "outputs": []
    },
    "lint": {
      "inputs": ["src/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  },
  "globalDependencies": [
    "tsconfig.json",
    "package.json"
  ]
}
```

**Key principles:**
- `dependsOn: ["^build"]` means "run build in all dependency packages first" — the `^` prefix is critical for correct topological ordering
- `outputs` defines which files to cache. Only include deterministic outputs (not `node_modules`)
- `inputs` can be restricted to specific file globs if a task only reads certain sources
- Mark non-deterministic tasks (like `dev`) with `"cache": false`

For Nx-based workspaces, the equivalent configuration uses `nx.json`:

```json
{
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "production": [
      "default",
      "!{projectRoot}/.eslintrc.json",
      "!{projectRoot}/src/test-setup.*",
      "!{projectRoot}/**/*.stories.@(js|jsx|ts|tsx|mdx)",
      "!{projectRoot}/tsconfig.spec.json",
      "!{projectRoot}/jest.config.ts"
    ]
  },
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["production", "^production"],
      "cache": true
    }
  }
}
```

### Pattern 3: Test Parallelization Strategy

Test suites are often the single largest contributor to CI duration. Parallelization reduces wall-clock time but must be balanced against runner startup overhead.

```python
# ❌ BAD — Single test process for all tests
# .github/workflows/ci.yml runs pytest with no parallelism
- run: pytest tests/ --cov=src

# ✅ GOOD — Split tests by category and parallelize with xdist + matrix strategy
# In workflow:
# jobs:
#   test-unit:
#     steps:
#       - run: pytest tests/unit/ -n auto --dist=loadfile
#   test-integration:
#     steps:
#       - run: pytest tests/integration/ -n auto --dist=loadfile
#       # Requires database setup step before this job

# Parallel test distribution with pytest-xdist configuration:
# conftest.py
import pytest

def pytest_xdist_auto_count():
    """Auto-detect CPU cores for optimal parallelism."""
    import os
    return max(1, os.cpu_count() or 1) - 1  # Leave one core free

# ✅ GOOD — Shard tests across multiple runners in CI
# For very large suites, split by file hash:
import hashlib

def pytest_collect_modifyitems(session, config, items):
    """Split test items for parallel runner sharding."""
    shard_total = int(config.getoption("--shard-total", default=4))
    shard_index = int(config.getoption("--shard-index", default=0))
    
    # Deterministic distribution based on file path
    items[:] = [
        item for i, item in enumerate(sorted(items, key=lambda x: x.nodeid))
        if i % shard_total == shard_index
    ]
```

**Key principles:**
- `-n auto` with pytest-xdist auto-scales to available CPU cores
- Separate integration/e2e tests into their own jobs — they have different dependencies (databases, services) and longer runtime
- Use file-path-based sharding for deterministic distribution across CI runners
- Aim for each parallel shard to take similar wall-clock time; balance is more important than raw parallelism count

### Pattern 4: Build Artifact Caching Between Pipeline Stages

When pipeline stages share artifacts (compiled binaries, bundled assets), cache them between stages instead of regenerating.

```yaml
# ✅ GOOD — Cache compiled TypeScript between build and test stages
- name: Build project
  run: npm run build
  
- name: Cache build artifacts
  uses: actions/cache@v4
  with:
    path: |
      dist/
      .next/
    key: ${{ runner.os }}-build-${{ github.sha }}
    # No restore-keys for exact-match only — we always rebuild from source

# In the test stage:
- name: Restore build artifacts
  uses: actions/cache@v4
  with:
    path: |
      dist/
      .next/
    key: ${{ runner.os }}-build-${{ github.sha }}

- name: Run tests against built output
  run: npm test
```

**Key principles:**
- Cache artifact keys by `github.sha` (exact commit) — never reuse artifacts from a different commit
- Always regenerate artifacts when source code changes; never cache build outputs as a substitute for proper dependency caching
- Use separate caches for each pipeline stage's intermediate outputs to avoid cross-stage contamination

---

## Constraints

### MUST DO
- Profile before optimizing — measure actual build times to identify real bottlenecks rather than guessing where time is spent
- Use lockfile hash (not directory content) as the primary cache key for dependency caches, ensuring cache persists across code-only changes
- Set explicit cache TTL and maximum cache size to prevent unbounded storage growth on CI infrastructure
- Parallelize independent stages at the CI workflow level AND within single jobs (e.g., pytest-xdist) for maximum throughput
- Cache intermediate build outputs (compiled artifacts, generated code) between pipeline stages when regeneration is expensive

### MUST NOT DO
- Cache based on `git ref` or branch name — this invalidates cache for every push and defeats the purpose of caching
- Disable cache restore fallback with `restore-keys` — partial matches save re-downloads even when the exact lockfile changed slightly
- Run linting/formatting in parallel with tests that share the same dependency installation step — use separate jobs to avoid filesystem lock contention
- Assume more parallelism is always better — each parallel runner has startup overhead (~30–60s) that must be amortized over enough work to justify it
- Cache generated artifacts with mutable paths or non-deterministic content — this silently produces incorrect results

---

## Output Template

When optimizing a CI/CD pipeline's build performance, the output must contain:

1. **Current Build Profile** — Timing breakdown of each stage with percentages and absolute times (e.g., `Dependency install: 4m32s (45%)`, `Tests: 3m10s (32%)`)
2. **Optimization Plan** — Prioritized list of changes ranked by expected time savings (minutes saved per change), ordered from highest to lowest impact
3. **Configuration Changes** — Complete YAML/JSON diffs for cache keys, task graphs, and parallelization settings ready to apply
4. **Expected Results** — Before/after comparison showing estimated build time reduction percentage and the new total wall-clock duration

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [GitHub Actions Caching](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows)
- [Turborepo Task Configuration](https://turbo.build/repo/docs/core-concepts/monorepo-run-file-based-tasks)
- [Gradle Build Cache](https://docs.gradle.org/current/userguide/build_cache.html)
- [Bazel Remote Caching](https://bazel.build/remote/caching)
- [Nx Distributed Tasks](https://nx.dev/features/enforce-distributed-caching)
