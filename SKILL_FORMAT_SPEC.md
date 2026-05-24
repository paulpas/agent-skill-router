# OpenCode Skill Format Specification

> **Audience:** LLMs writing, auditing, or migrating skills in this repository.
> **Purpose:** Defines the canonical structure for every `SKILL.md` file so that OpenCode can load, route, and apply skills consistently.

---

## Table of Contents

1. [Overview](#1-overview)
2. [YAML Frontmatter Specification](#2-yaml-frontmatter-specification)
3. [Domain Defaults Table](#3-domain-defaults-table)
4. [Content Structure](#4-content-structure)
5. [Skill Granularity and Atomic Design](#5-skill-granularity-and-atomic-design)
6. [Triggers Guidelines](#6-triggers-guidelines)
7. [Quality Checklist](#7-quality-checklist)
8. [Complete Annotated Example](#8-complete-annotated-example)

---

## 1. Overview

### What Skills Are

A **skill** is a self-contained Markdown document that injects specialized behavior, knowledge, and constraints into an OpenCode AI agent session. When loaded, the skill's full content becomes part of the model's active context, shaping how it responds to the current task.

Skills live at:

```
<skills-root>/
  <domain>/<topic>/
    SKILL.md          ← the only required file
    references/       ← optional: referenced sub-documents
    scripts/          ← optional: helper scripts
```

### How OpenCode Uses Skills

OpenCode loads skills in two ways:

| Loading Mode | Mechanism                       | When It Fires                    |
| ------------ | ------------------------------- | -------------------------------- |
| **Manual**       | User runs `/skill <name>`         | Explicitly requested             |
| **Auto-load**    | `metadata.triggers` keyword match | Detected in conversation context |

**Critical:** The model reads `description` to decide whether a skill is relevant before loading it. A vague or incomplete description causes the model to skip the skill even when it would help.

**Auto-loading flow:**

```
User message contains trigger keyword
        ↓
OpenCode scans metadata.triggers fields of all installed skills
        ↓
Match found → skill content injected into context
        ↓
Model reads skill and applies its constraints
```

### Naming Convention

Skill directories follow strict kebab-case: `<domain>/<topic>`.

| Valid                           | Invalid                 |
| ------------------------------- | ----------------------- |
| `trading/stop-loss`               | `TradingStopLoss`         |
| `cncf/prometheus`                 | `cncf_prometheus`         |
| `coding/code-review`              | `coding_codeReview`         |
| `agent/confidence-selector`       | `agentConfidenceSelector` |

The `name` field in frontmatter **must exactly match** the directory name.

**Known domains:**

| Prefix       | Category                              |
| ------------ | ------------------------------------- |
| `agent/`       | AI agent orchestration patterns       |
| `cncf/`        | CNCF cloud native projects            |
| `coding/`      | General coding patterns and practices |
| `go/`          | Go programming language skills        |
| `linux/`       | Linux system engineering              |
| `trading/`     | Algorithmic trading implementation    |
| `programming/` | Language/algorithm reference material |
| `writing/`     | Writing and style guidance            |

---

## 2. YAML Frontmatter Specification

Every `SKILL.md` begins with a YAML frontmatter block delimited by `---`.

### Required Fields

These two fields are **mandatory**. A skill without them will not load correctly.

| Field       | Type   | Rules                                                                                                           |
| ----------- | ------ | --------------------------------------------------------------------------------------------------------------- |
| `name`        | string | Must exactly match the directory name in kebab-case                                                             |
| `description` | string | Single line. This is what the model reads to decide whether to load the skill. Be specific and action-oriented. |

**Description writing rules:**
- State *what the skill does*, not what it is about
- Lead with an active verb: "Implements…", "Selects…", "Analyzes…", "Detects…"
- Include 1–2 key domain terms that distinguish this skill from similar ones
- Maximum ~200 characters — model scans this fast

```yaml
# ❌ BAD — too vague
description: Stop loss for trading

# ❌ BAD — describes the topic instead of the skill's action
description: Information about Prometheus monitoring

# ✅ GOOD — specific action + domain context
description: Implements stop-loss strategies (fixed percentage, ATR-based, trailing, volatility-adjusted) for position risk management in algorithmic trading systems

# ✅ GOOD — for reference skills
description: Prometheus architecture, PromQL patterns, alerting rules, and Kubernetes integration for cloud-native observability
```

### Recommended Fields

These fields are strongly encouraged. Skills missing them are incomplete but functional.

| Field         | Value    | Purpose                                                 |
| ------------- | -------- | ------------------------------------------------------- |
| `license`       | `MIT`      | Signals the skill is freely redistributable             |
| `compatibility` | `opencode` | Confirms this skill follows OpenCode format conventions |

### The `metadata` Block

The `metadata` block enables auto-loading, categorization, and skill discovery. It is **strongly recommended** for all skills.

| Field                   | Type   | Values / Rules                                                                  |
| ----------------------- | ------ | ------------------------------------------------------------------------------- |
| `metadata.version`        | string | Semantic version: `"1.0.0"`                                                       |
| `metadata.domain`         | string | One of: `agent`, `cncf`, `coding`, `go`, `linux`, `trading`, `programming`, `writing`          |
| `metadata.triggers`       | string | Comma-separated keywords (3–8 terms). Drives auto-loading.                      |
| `metadata.role`           | string | One of: `implementation`, `reference`, `orchestration`, `review`                |
| `metadata.scope`          | string | One of: `implementation`, `infrastructure`, `orchestration`, `review`           |
| `metadata.output-format`  | string | One of: `code`, `manifests`, `analysis`, `report`                               |
| `metadata.content-types`  | array  | Array of content types: `code`, `guidance`, `do-dont`, `config`, `examples`, `diagrams` |
| `metadata.related-skills` | string | Comma-separated skill names (e.g. `trading/risk/kill-switches, coding/code-review`) |
| `metadata.author`         | string | GitHub URL — **only for externally-sourced skills**                             |
| `metadata.source`         | string | Source repo URL — **only for externally-sourced skills**                        |
| `metadata.maturity`       | string | One of: `draft`, `beta`, `stable`                                               |
| `metadata.completeness`   | number | 0–100 quality completeness score                                                |
| `metadata.exampleCount`   | number | Number of code examples included                                                |

### Advanced Routing Fields (Optional)

These fields enhance the router's intent-aware skill selection. Skills that include them enable more precise routing through archetype matching, anti-trigger penalties, and response profile scoring.

| Field | Type | Purpose |
|---|---|---|
| `metadata.archetypes` | string or YAML array | Comma-separated or list of archetypes the skill serves. Values: `tactical`, `strategic`, `diagnostic`, `orchestration`, `educational`, `enforcement`, `generation`. Helps router match query intent to skill purpose. |
| `metadata.anti_triggers` | string or YAML array | Comma-separated or list of terms that indicate the skill should be penalized for certain queries. Prevents generic skills from dominating specific task queries. |
| `metadata.response_profile.verbosity` | string | One of: `low`, `medium`, `high`. Indicates how concise the skill's output is. |
| `metadata.response_profile.directive_strength` | string | One of: `low`, `medium`, `high`. How strongly directive/procedural the skill is. |
| `metadata.response_profile.abstraction_level` | string | One of: `operational`, `tactical`, `strategic`. Whether the skill operates at implementation level or planning level. |

#### Example with All Fields

```yaml
---
name: risk-stop-loss
description: Implements stop-loss strategies to limit position losses in algorithmic trading systems.
archetypes:
  - tactical
  - diagnostic
anti_triggers:
  - brainstorming
  - vague ideation
response_profile:
  verbosity: low
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: trading
  triggers: stop loss, trailing stop, ATR stop, stop placement, position protection, emergency stop, stop-loss
  role: implementation
  scope: implementation
  output-format: code
---
```

#### How Archetypes Affect Routing

The router uses archetype matching to boost or penalize skills during ranking:

| Match Level | Scoring Effect |
|---|---|
| **Full match** (all query archetypes found in skill) | +30% score boost |
| **Partial match** (at least one overlap) | +10% score boost |
| **No overlap** | Neutral (1.0x factor) |
| **Mismatch penalty** (tactical query on purely educational/strategic skills) | -20% |

#### How Anti-Triggers Work

When a query contains terms listed in a skill's `anti_triggers`, that skill receives a ranking penalty of **-0.15 per match** (cumulative, max -0.5). This prevents large generic skills from dominating specific task queries.

Example: If a skill has `anti_triggers: brainstorming, vague ideation` and the query contains "brainstorming", that skill is penalized by 0.15 points in its final ranking score.

#### How Response Profile Affects Scoring

The router analyzes conciseness and directiveness to match skills with query intent:

| Profile | Preferred For |
|---|---|
| Low verbosity + high directive strength | Tactical queries, implementation tasks |
| High verbosity + low directive strength | Strategic/educational queries, planning |
| Medium across all dimensions | General-purpose queries |

Skills whose response profile matches the inferred query intent receive a ranking boost. Skills with mismatched profiles are deprioritized.

---

### Complete Frontmatter Examples by Domain

#### `agent/*` Skill

```yaml
---
name: confidence-based-selector
description: Selects and executes the most appropriate skill based on confidence scores and relevance metrics, enabling intelligent skill routing.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  triggers: confidence scoring, skill routing, skill selection, task routing, adaptive selection, agent dispatch
  role: orchestration
  scope: orchestration
  output-format: analysis
  content-types: [guidance, examples, do-dont]
  related-skills: dependency-graph-builder, parallel-skill-runner, dynamic-replanner
---
```

#### `cncf/*` Skill

```yaml
---
name: prometheus
description: Prometheus architecture, PromQL patterns, alerting rules, ServiceMonitor configuration, and Kubernetes integration.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: cncf
  triggers: prometheus, promql, alerting rules, metrics scraping, kube-state-metrics, monitoring stack, time-series database
  role: reference
  scope: infrastructure
  output-format: manifests
  content-types: [guidance, examples, do-dont, config]
  related-skills: grafana, alertmanager, opentelemetry, thanos
---
```

#### `coding/*` Skill

```yaml
---
name: code-review
description: Analyzes code diffs and files to identify bugs, security vulnerabilities, code smells, and architectural concerns with prioritized feedback.
license: MIT
compatibility: opencode
metadata:
  version: "1.1.0"
  domain: coding
  triggers: code review, pull request, PR review, security audit, code quality, architectural review, OWASP
  role: review
  scope: review
  output-format: report
  content-types: [code, guidance, do-dont, examples]
  related-skills: security-review, test-driven-development
  author: https://github.com/Jeffallan
  source: https://github.com/farmage/opencode-skills
---
```

#### `trading/*` Skill

```yaml
---
name: risk-stop-loss
description: Implements stop-loss strategies (fixed percentage, ATR-based, trailing, support/resistance, volatility-adjusted) to limit position losses.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: trading
  triggers: stop loss, trailing stop, ATR stop, risk management, position protection, stop placement, emergency stop
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, config, do-dont]
  related-skills: risk-position-sizing, risk-kill-switches, risk-drawdown-control
---
```

#### `go/*` Skill

```yaml
---
name: concurrency-patterns
description: Implements Go concurrency patterns including worker pools, context propagation, semaphore-based rate limiting, and graceful shutdown for production services.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: go
  triggers: goroutine, context, worker pool, concurrency, channels, race condition, graceful shutdown
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: error-handling, modular-design
---
```

#### `linux/*` Skill

```yaml
---
name: linux-security
description: Implements Linux security hardening including file permissions, systemd sandboxing, firewall rules (nftables), SELinux policies, and audit logging for production servers.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: linux
  triggers: linux security, hardening, permissions, firewall, nftables, SELinux, audit logging, systemd sandbox
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, config, do-dont]
  related-skills: linux-services, networking
---
```

#### `programming/*` Skill

```yaml
---
name: algorithms
description: Reference guide for common algorithms (sorting, search, graph traversal, dynamic programming) with complexity analysis.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: programming
  triggers: algorithms, big O, sorting, binary search, graph traversal, dynamic programming, time complexity
  role: reference
  scope: implementation
  output-format: code
  content-types: [code, guidance, examples, diagrams]
  related-skills: test-driven-development
---
```

#### `writing/*` Skill

```yaml
---
name: style-guide
description: Provides technical writing style guidelines covering clarity, consistency, readability, and tone for documentation.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: writing
  triggers: style guide, writing, documentation, readability, consistency, tone, technical writing
  role: reference
  scope: implementation
  output-format: guidance
  content-types: [guidance, examples, do-dont]
---
```

---

## 3. Domain Defaults Table

When the appropriate `metadata.role`, `metadata.scope`, and `metadata.content-types` values are not obvious, use domain defaults as a starting point. Override when the specific skill warrants it.

| Domain      | Default Role   | Default Scope  | Default Content Types                          | Typical Content                                   |
| ----------- | -------------- | -------------- | ---------------------------------------------- | ------------------------------------------------- |
| `agent`       | `orchestration`  | `orchestration`  | `guidance, examples, do-dont`        | Routing flows, confidence scoring, fallback logic |
| `cncf`        | `reference`      | `infrastructure` | `guidance, examples, do-dont, config`  | YAML manifests, PromQL, architecture diagrams     |
| `coding`      | `implementation` | `implementation` | `code, guidance, do-dont, examples`    | Code patterns, checklists, good/bad examples      |
| `go`          | `implementation` | `implementation` | `code, guidance, do-dont, examples`    | Go idioms, concurrency patterns, error handling   |
| `linux`       | `implementation` | `implementation` | `code, guidance, config, do-dont`      | Shell scripts, systemd units, kernel tuning, config |
| `trading`     | `implementation` | `implementation` | `code, guidance, config, do-dont`      | Python classes, risk constraints, APEX patterns   |
| `programming` | `reference`      | `implementation` | `code, guidance, examples, diagrams`   | Algorithm pseudocode, complexity tables           |
| `writing`     | `reference`      | `implementation` | `guidance, examples, do-dont`        | Style guidelines, before/after comparisons        |

**Override examples:**

- `coding/code-review` → role `review`, output-format `report` (not the coding default)
- `trading/risk-stress-testing` → role `reference` (analysis-heavy, not pure implementation)
- `agent/goal-to-milestones` → output-format `analysis` (produces plans, not code)

---

## 4. Content Structure

### Minimum Required Sections (All Skills)

Every skill, regardless of domain or complexity, must have these four elements:

1. **H1 Title** — The skill's human-readable name (not the kebab-case identifier)
2. **Role/purpose paragraph** — 1–3 sentences explaining what this skill makes the model do
3. **When to Use** — Bulleted list of situations where this skill applies
4. **Core Workflow or Constraints** — The primary instructions the model must follow

### Recommended Full Structure

Use this template as a starting point. Remove sections that don't apply, but do not add sections that are absent from this template without good reason.

```markdown
# Skill Title

Brief role description — 1–3 sentences. What does loading this skill make the model do?

## TL;DR Checklist

- [ ] Step or check 1
- [ ] Step or check 2
- [ ] Step or check 3

---

## When to Use

Use this skill when:

- Concrete situation 1
- Concrete situation 2
- Concrete situation 3

---

## When NOT to Use

Avoid this skill for:

- Anti-pattern 1 (use X instead)
- Anti-pattern 2
- Situation where overhead outweighs benefit

---

## Core Workflow

1. **Step name** — Description. **Checkpoint:** What to verify before proceeding.
2. **Step name** — Description.
3. **Step name** — Description.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Pattern Name

Brief description.

```python
# Good example
```

### Pattern 2: Pattern Name

Brief description.

```python
# ❌ BAD — reason
bad_code_here()

# ✅ GOOD — reason  
good_code_here()
```

---

## Constraints

### MUST DO
- Constraint 1
- Constraint 2

### MUST NOT DO
- Anti-pattern 1
- Anti-pattern 2

---

## Output Template

Describe what the model's output must contain when this skill is active.

1. **Section 1** — Description
2. **Section 2** — Description

---

## Related Skills

| Skill      | Purpose                                 |
| ---------- | --------------------------------------- |
| `skill-name` | Why you'd use this instead or alongside |
| `skill-name` | Complementary capability                |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Primary Documentation](https://example.com/docs)
- [API Reference](https://example.com/api)
```

### Section-by-Section Guidance

#### H1 Title

Use a human-readable title, not the kebab-case name.

```markdown
# ✅ Stop Loss Manager
# ✅ Confidence-Based Selector (Agent Skill Selection)
# ✅ Prometheus in Cloud-Native Engineering

# ❌ trading/risk/stop-loss
# ❌ agent/confidence-selector
```

#### Role/Purpose Paragraph

Write from the model's perspective: what role does it take on?

```markdown
# ✅ Good
Senior engineer conducting thorough, constructive code reviews that improve quality and share knowledge.

# ✅ Good
Implements stop loss mechanisms to limit losses and protect capital in algorithmic trading systems.

# ❌ Too abstract
This skill is for stop losses.
```

#### TL;DR Checklist

Actionable checklist an LLM uses as a quick reminder when already familiar with the skill. Each item should be a concrete action or verification, not a topic heading.

```markdown
# ✅ Good
- [ ] Calculate ATR before placing stops
- [ ] Verify stop is beyond obvious support/resistance levels
- [ ] Test emergency stop triggers at extreme moves

# ❌ Too vague
- [ ] Stop losses
- [ ] Risk management
```

#### When to Use / When NOT to Use

Be specific. "When NOT to Use" is just as important — it prevents the model from applying a skill in situations where it creates overhead without benefit.

#### Core Workflow

Number the steps. Add **Checkpoint** notes after steps where the model must verify something before continuing. Reference related sections.

### Role-Based Section Requirements

Not every section is needed for every skill. Use this table to determine which sections apply based on your skill's `role` field.

| Section | `implementation` | `reference` | `orchestration` | `review` |
|---|---|---|---|---|
| H1 Title | Required | Required | Required | Required |
| Role/purpose paragraph | Required | Required | Required | Required |
| TL;DR Checklist | Required | Optional | Optional | Optional |
| When to Use / When NOT to Use | Required | Recommended | Recommended | Recommended |
| Core Workflow | Required | Optional | Required | Required |
| Implementation Patterns | **Required** (≥2 code blocks) | N/A | N/A | N/A |
| Constraints (MUST/MUST NOT DO) | **Required** | Optional | Recommended | **Required** |
| Output Template | Optional | N/A | N/A | **Required** |
| Related Skills | Recommended | Recommended | **Required** | Recommended |

**Key rule:** Only `role = implementation` skills require code examples and the "Implementation Patterns" section. Reference, orchestration, and review skills use prose, diagrams, and structured guidance instead. A reference skill with zero code examples is not a stub — it's doing its job correctly.

#### Constraints (MUST DO / MUST NOT DO)

Short, imperative sentences. No explanations needed here — those belong in the workflow. These are the non-negotiable rules.

#### Live References

Include 5-7 authoritative documentation links specific to the skill's domain. These links are resolved at load time by the markdown link following feature.

```markdown
## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Kubernetes API Reference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.32/)
- [Kubernetes Concepts](https://kubernetes.io/docs/concepts/)
```

**Guidelines:**
- Include official project documentation first
- Include API/reference docs if applicable
- Include architecture or concepts pages
- Include operational guides (deployment, configuration)
- Include security or best practices guides
- 5-7 links is the target range
- All links must be real, stable URLs (no `example.com`)

---

### Category-Specific Guidance

#### `agent/*` Skills

Agent skills describe orchestration patterns — how to route, decompose, select, and coordinate tasks.

**Required:**
- ASCII flow diagram showing the orchestration logic
- Explicit fallback/error routing for every branching point
- Reference to `code-philosophy` (5 Laws of Elegant Defense)

**Example flow diagram:**

```
User Task
    ↓
Extract features
    ↓
Score all available skills ──→ No skill meets threshold ──→ FallbackSkill
    ↓ (threshold met)
Select best skill
    ↓
Execute
    ↓
Record result → Update confidence scores
```

**Anti-patterns to call out:**
- Fixed thresholds without adaptive tuning
- Not handling low-confidence fallback
- Ignoring execution history

#### `cncf/*` Skills

CNCF skills describe cloud-native projects — their architecture, integration patterns, and operational concerns.

**Required sections:**
1. **Purpose and Use Cases** — Problem solved + when to use vs. alternatives
2. **Architecture Design Patterns** — Core components, component interactions, data flow
3. **Integration Approaches** — How it integrates with other CNCF projects and Kubernetes
4. **Common Pitfalls** — Misconfiguration, performance issues, operational challenges, security

**Formatting notes:**
- Lead with project metadata (category, stars, language, docs URL) for context
- Include at least one complete working manifest example (YAML)
- Note when content is auto-generated vs. manually verified

#### `coding/*` Skills

Coding skills teach implementation patterns. Code examples are the primary content.

**Required:**
- At least one "BAD vs. GOOD" code example pair
- Reference to a relevant standard (OWASP, SOLID, KISS, DRY, etc.)
- Constraints section (MUST DO / MUST NOT DO)

**Code example format:**

```python
# BAD: string interpolation in query
cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")

# GOOD: parameterized query
cursor.execute("SELECT * FROM users WHERE id = %s", [user_id])
```

**Review-category skills** (role=`review`) must also include an output template specifying the exact structure of the review report.

#### `go/*` Skills

Go skills teach Go-specific patterns and idioms. The language emphasizes simplicity, explicit error handling, and concurrency.

**Required:**
- Idiomatic Go code with proper error handling patterns (wrap errors with `%w`, use sentinel errors)
- At least one "BAD vs. GOOD" code example pair
- Reference to Go idioms (e.g., `golang.org/doc/effective_go`)
- Constraints section (MUST DO / MUST NOT DO)
- Goroutine lifecycle management guidelines (context propagation, cancellation)

**Code example format:**

```go
// ❌ BAD — ignoring error, no context propagation
func fetchData(url string) ([]byte, error) {
    resp, _ := http.Get(url)  // error ignored
    defer resp.Body.Close()
    return io.ReadAll(resp.Body)
}

// ✅ GOOD — proper error wrapping and context
func fetchData(ctx context.Context, url string) ([]byte, error) {
    req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
    if err != nil {
        return nil, fmt.Errorf("create request: %w", err)
    }
    resp, err := client.Do(req)
    if err != nil {
        return nil, fmt.Errorf("fetch %s: %w", url, err)
    }
    defer resp.Body.Close()
    data, err := io.ReadAll(resp.Body)
    if err != nil {
        return nil, fmt.Errorf("read body: %w", err)
    }
    return data, nil
}
```

**Anti-patterns to call out:**
- Ignoring errors (no bare `if err != nil { return err }`)
- Goroutine leaks — launching goroutines without context cancellation
- Using `panic` for error handling instead of returning errors
- Not using `errors.Is` / `errors.As` for error inspection
- Overusing interfaces — prefer explicit types until composition needs abstraction

#### `linux/*` Skills

Linux skills cover system administration, kernel tuning, networking, services, and infrastructure automation on Linux systems.

**Required:**
- Shell scripts or systemd unit files with proper error handling (`set -euo pipefail`)
- Security considerations (least privilege, file permissions, SELinux/AppArmor)
- Configuration management patterns (idempotent operations, backup before modify)
- Constraints section (MUST DO / MUST NOT DO)
- Reference to relevant standards (FHS, LSB, CIS benchmarks where applicable)

**Code example format:**

```bash
# ❌ BAD — no error handling, no quoting
function deploy() {
    cp $1 /opt/app/
    systemctl restart myapp
}

# ✅ GOOD — safe, idempotent, auditable
#!/usr/bin/env bash
set -euo pipefail

readonly APP_DIR="/opt/app"
readonly BACKUP_DIR="${APP_DIR}/.backups"

deploy() {
    local source="$1"

    # Validate input
    [[ -f "$source" ]] || { echo "Error: source file not found: $source" >&2; return 1; }

    # Backup current state
    mkdir -p "$BACKUP_DIR"
    cp -a "$APP_DIR/." "$BACKUP_DIR/$(date +%Y%m%d%H%M%S)"

    # Deploy with correct ownership
    cp "$source" "${APP_DIR}/"
    chown -R appuser:appgroup "$APP_DIR"
    chmod 640 "${APP_DIR}"/*.conf

    # Restart service
    systemctl restart myapp
    systemctl is-active --quiet myapp || return 1
}
```

**Anti-patterns to call out:**
- Running services as root when a dedicated user suffices
- Hardcoding paths — use variables or configuration files
- Using `rm -rf /` or unsafe glob patterns
- Not backing up state before modifications
- Missing `set -euo pipefail` in shell scripts
- Ignoring systemd best practices (no `ExecStartPre` validation, missing `Restart=` policies)

#### `trading/*` Skills

Trading skills implement components for algorithmic trading systems. Python is the primary language.

**Required:**
- Python implementation code block with typed signatures and docstrings
- Risk constraints section — what must never be bypassed
- File path conventions matching the APEX platform layout:
  - `risk_engine/` — risk management modules
  - `data_pipeline/` — data processing
  - `execution/` — order execution
  - `tests/` — test files

**Risk constraint example:**

```python
# ALWAYS validate stop is below entry price for long positions
assert stop_price < entry_price, f"Stop {stop_price} must be below entry {entry_price}"

# NEVER disable emergency stops
if emergency_stop_active:
    raise RuntimeError("Emergency stop active — manual review required")
```

#### `writing/*` Skills

Writing skills provide style guidance and clarity improvements.

**Required:**
- Before/after text comparisons showing improvements
- Specific style rules with reasoning
- Tone and voice guidelines

**Example format:**

```markdown
### ❌ Before — Wordy and unclear

The implementation of the feature was done by the team in order to make sure that the users could use it.

### ✅ After — Concise and clear

The team implemented this feature for user access.
```

---

## 5. Skill Granularity and Atomic Design

Skills should be atomic: each skill covers ONE coherent topic that can stand alone when loaded. Monolithic skills covering multiple distinct patterns confuse the router and dilute the guidance provided to the model.

### Identifying Monoliths

A skill is a monolith (and should be split) when ANY of these conditions are met:

1. **The frontmatter `description` lists 5+ distinct patterns, concepts, or features** separated by commas, parentheses, or "and". Example: `Implements circuit breakers, retry strategies, bulkhead isolation, health checks, graceful degradation, distributed tracing` → 6 distinct patterns in one skill.

2. **The Core Content has 5+ independent "Pattern N:" or similarly headed sections** each with their own implementation code and explanation — topics that could stand alone.

3. **"Implements X, Y, Z" description + file size over 15KB** — broad scope combined with large content volume means the skill is storing significant duplicated material across multiple topics.

4. **`related-skills` lists skills for sub-topics already covered by this skill** — if siblings exist for individual patterns within the parent, the parent is likely over-scoped.

### Monolith Severity Matrix

| Condition | Severity | Action |
|-----------|----------|--------|
| 3–4 patterns, under 15KB | LOW | Monitor — note as candidate but don't rush split |
| 5+ patterns OR "Implements X, Y, Z" + 20KB+ | HIGH | Plan split in next cycle |
| 10+ patterns (e.g., full GoF catalog) | CRITICAL | Split immediately |
| Template-generated skill with generic triggers (e.g. "management", "systems") | HIGH | Fix triggers during any review |

### Split Criteria

When creating sub-skills from a monolith, enforce these rules:

- **Each sub-skill must be independently useful** — loading it alone should provide complete guidance for its topic. A fragment that requires the parent to make sense is not a valid sub-skill.
- **Boundaries follow change frequency** — patterns that evolve independently belong in different skills. If one changes when another doesn't, split them.
- **Each new skill gets 3–8 carefully calibrated triggers** — do not inherit all parent triggers. Derive fresh ones specific to the sub-skill's domain terms.
- **Related-skills must be reciprocal** — if A lists B as related, B must list A. Siblings from a split list each other; the parent (if kept as catalog) lists all children.

### Split Patterns

Four common approaches for splitting monoliths:

1. **Topic Decomposition** — The skill covers N distinct topics. Each becomes its own skill.
   Example: `system-reliability-architecture` (circuit breakers, retry, bulkhead, health checks, degradation, tracing) → 5 focused skills.

2. **Category Split** — Patterns from multiple categories. Each category becomes its own skill.
   Example: GoF catalog (23 patterns across 3 families) → `creational-patterns`, `structural-patterns`, `behavioral-patterns`.

3. **Depth Layering** — The skill covers both "how to" implementation AND "why" design principles. Split into tactical and strategic layers.
   Example: `security-engineering` (threat modeling + OWASP prevention + supply chain security + pipeline integration) → separate reference, implementation, and orchestration skills.

4. **Domain Narrowing** — The skill covers a pattern applied across many contexts. Split by primary context.
   Example: `risk-kill-switches` (account-level, strategy-level, market-level, infrastructure-level) → 4 focused skills.

### Gradual Migration Strategy

When you identify a monolith to split:

1. **Create the atomic skills first** — write complete SKILL.md files for each sub-skill with full depth (not abbreviated versions of the monolith content).
2. **Update related-skills on the parent** — point to the new atomic skills.
3. **Add triggers to atomic skills** — carefully calibrated, domain-specific terms.
4. **Existing monoliths stay intact** — no breaking changes. Users benefit gradually as the router routes specific queries to better-scoped atomic skills via trigger precision.

**Do NOT delete or modify existing monolithic skills during migration.** The goal is additive improvement, not forced refactoring. Eventually (optional): monoliths can be deprecated or converted to overview/catalog entries once atomic skills have matured.

### Preventing New Monoliths

When creating a new skill:

- Write the `description` first, then check: does it list 5+ distinct patterns? If yes, stop and split before writing content.
- Keep the initial scope tight: one core concept, one workflow, 2–3 code examples.
- Add related-skills for adjacent concepts that could become sub-skills later.

### Quality Checklist for Split Skills

When validating a skill created from a monolith split:

- [ ] Covers exactly ONE coherent topic or category (not multiple unrelated patterns)
- [ ] Is independently useful — loading alone provides complete guidance
- [ ] Description passes the "Implements X, Y, Z" test (lists at most 3 related aspects of the same concept)
- [ ] File is ≥ 3,000 bytes
- [ ] Contains sufficient depth for its scope (15–40KB for implementation skills covering one pattern family; less for reference/orchestration skills)
- [ ] Has its own trigger set of 3–8 terms derived from this sub-skill's specific domain
- [ ] Related-skills lists all sibling skills from the split

---

## 6. Triggers Guidelines

### What Triggers Do

The `metadata.triggers` field contains comma-separated keywords that OpenCode matches against the active conversation. When a match is found, the skill is automatically injected into context — no `/skill` command required.

**Auto-loading is the primary way skills get used.** A skill with no triggers relies entirely on users knowing to load it manually.

### Rules for Good Triggers

| Rule                          | Explanation                                                                        |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| **3–8 terms**                     | Fewer than 3 is too narrow. More than 8 dilutes signal and causes false positives. |
| **Include the core topic name**   | Always include the primary name: `prometheus`, `stop loss`, `code review`                |
| **Include abbreviations**         | `ATR`, `PromQL`, `VWAP`, `TDD` — models use these in conversation                          |
| **Include hyphenated variants**   | `stop-loss` alongside `stop loss`                                                      |
| **Include common adjacent terms** | What words appear in conversation when someone needs this skill?                   |
| **Avoid ultra-generic terms**     | `risk`, `code`, `data` will trigger on nearly everything                                 |

### Good and Bad Trigger Examples

#### `trading/risk/stop-loss`

```yaml
# ✅ GOOD
triggers: stop loss, trailing stop, ATR stop, stop placement, position protection, emergency stop, stop-loss

# ❌ TOO BROAD — will fire on nearly any trading conversation
triggers: risk, trading, loss, price

# ❌ TOO NARROW — misses most natural phrasings
triggers: StopLossManager
```

#### `cncf/prometheus`

```yaml
# ✅ GOOD
triggers: prometheus, promql, alerting rules, metrics scraping, kube-state-metrics, servicemonitor, time-series database

# ❌ TOO BROAD — fires whenever anyone mentions monitoring anything
triggers: monitoring, metrics, alerts, kubernetes

# ❌ MISSES ABBREVIATIONS — PromQL is very common in conversation
triggers: prometheus, prometheus operator, alertmanager
```

#### `coding/code-review`

```yaml
# ✅ GOOD
triggers: code review, pull request, PR review, code quality, security audit, OWASP, architectural review

# ❌ TOO BROAD — fires on any coding conversation
triggers: code, review, bugs, security

# ❌ MISSES NATURAL PHRASING — "review this PR" would not match
triggers: code-review, code_review
```

#### `agent/confidence-selector`

```yaml
# ✅ GOOD
triggers: confidence scoring, skill routing, skill selection, task routing, adaptive selection, agent dispatch

# ❌ TOO NARROW — "confidence" alone appears in too many other contexts
triggers: confidence

# ❌ TOO BROAD — "agent" would fire on any agent discussion
triggers: agent, selection, routing
```

### Trigger Calibration Heuristic

Ask these questions for each trigger candidate:

1. **If someone says this word/phrase, would they plausibly need this skill?** → Include it
2. **Is this word used heavily in other unrelated contexts?** → Exclude or be more specific
3. **Is this a natural abbreviation or shorthand for the topic?** → Include it
4. **Is this only used internally (class name, file name)?** → Exclude it

---

## 6. Quality Checklist

Use this checklist when writing a new skill or auditing an existing one.

### Skill Granularity

- [ ] Description does NOT list 5+ distinct patterns, concepts, or features (use "Implements X, Y, Z" as a detection heuristic — if you see it, split)
- [ ] Skill covers one coherent topic that stands alone when loaded (not a fragment requiring another skill for context)
- [ ] If `role = implementation`: file has ≥ 2 code blocks with real implementations (not placeholder/pseudocode)
- [ ] If `role = reference` or `orchestration`: zero code examples is acceptable — not a stub indicator
- [ ] Related-skills lists all sibling skills from any split, and reciprocal links verified

### Frontmatter

- [ ] `name` exactly matches the directory name (kebab-case)
- [ ] `description` clearly states what the skill makes the model do in one sentence
- [ ] `description` leads with an active verb and includes 1–2 domain-specific terms
- [ ] `license: MIT` is present
- [ ] `compatibility: opencode` is present
- [ ] `metadata.version` is present (format: `"1.0.0"`)
- [ ] `metadata.domain` matches the directory domain prefix (`agent`, `cncf`, `coding`, `go`, `linux`, `trading`, `programming`, `writing`)
- [ ] `metadata.triggers` is set with 3–8 meaningful, specific terms
- [ ] `metadata.role` is set to one of: `implementation`, `reference`, `orchestration`, `review`
- [ ] `metadata.scope` is set to one of: `implementation`, `infrastructure`, `orchestration`, `review`
- [ ] `metadata.output-format` is set to one of: `code`, `manifests`, `analysis`, `report`
- [ ] `metadata.content-types` is set (or falls back to domain defaults)
- [ ] `metadata.related-skills` lists adjacent skills (if any exist)
- [ ] `metadata.author` and `metadata.source` are present **only** if externally sourced

### Content

- [ ] H1 title is present and human-readable (not the kebab-case name)
- [ ] Role/purpose paragraph is present (1–3 sentences, model-perspective)
- [ ] "When to Use" section is present with specific, concrete bullet points
- [ ] "When NOT to Use" section is present (for complex skills)
- [ ] Core Workflow or Constraints section is present
- [ ] Code examples are present if `role = implementation` or `role = review`
- [ ] At least one BAD vs. GOOD example pair if `domain = coding` or `domain = trading`
- [ ] Output Template is present if `role = review`
- [ ] Related Skills table is present if `metadata.related-skills` is non-empty
- [ ] No debug statements or placeholder text (e.g. "TODO", "FIXME", "example.com" links)
- [ ] External links point to real, stable URLs (not placeholder `example.com`)
- [ ] `## Live References` section present with 5-7 authoritative documentation links
- [ ] Live References include official project docs, API reference, and operational guides
- [ ] All Live References links are real, stable URLs (no `example.com`)

### Domain-Specific

**For `agent/*`:**
- [ ] Orchestration flow diagram (ASCII) is present
- [ ] Fallback/error routing is explicitly described
- [ ] References `code-philosophy` (5 Laws of Elegant Defense)

**For `cncf/*`:**
- [ ] Purpose and Use Cases section present
- [ ] Architecture Design Patterns section present
- [ ] Integration Approaches section present
- [ ] Common Pitfalls section present
- [ ] At least one complete working YAML manifest example

**For `coding/*`:**
- [ ] At least one BAD/GOOD code example pair
- [ ] References a relevant standard (OWASP, SOLID, DRY, etc.)
- [ ] MUST DO / MUST NOT DO constraints present

**For `trading/*`:**
- [ ] Python implementation with typed signatures
- [ ] Risk constraints explicitly stated
- [ ] File path conventions follow APEX platform layout

**For `writing/*`:**
- [ ] Before/after text comparisons present
- [ ] Style rules with specific reasoning
- [ ] Tone and voice guidelines included

**For `go/*`:**
- [ ] Idiomatic Go code with proper error wrapping (`%w`)
- [ ] At least one BAD vs. GOOD code example pair
- [ ] Goroutine lifecycle management with context propagation
- [ ] MUST DO / MUST NOT DO constraints present
- [ ] No bare error ignores or misuse of `panic`

**For `linux/*`:**
- [ ] Shell scripts use `set -euo pipefail`
- [ ] Security considerations (least privilege, permissions)
- [ ] Configuration management is idempotent
- [ ] MUST DO / MUST NOT DO constraints present
- [ ] No unsafe glob patterns or hardcoded root-level paths

---

## 7. Complete Annotated Example

The following is a complete, annotated `SKILL.md` for `trading/risk/stop-loss`. Inline comments (`<!-- -->`) explain each structural choice. In a real skill, remove all comments.

```markdown
---
# ↓ REQUIRED: Must exactly match the directory name
name: risk-stop-loss

# ↓ REQUIRED: Single sentence. Active verb. Domain-specific terms.
#   Model reads this to decide whether to load the skill.
#   Bad: "Stop losses for trading"
#   Good: action + scope + platform context
description: Implements stop-loss strategies (fixed percentage, ATR-based, trailing, support/resistance, volatility-adjusted) to limit position losses in algorithmic trading systems.

# ↓ RECOMMENDED: Signals redistributability
license: MIT

# ↓ RECOMMENDED: Confirms skill follows OpenCode conventions
compatibility: opencode

metadata:
  # ↓ Use semantic versioning. Increment minor on new patterns, major on breaking changes.
  version: "1.0.0"

  # ↓ Must match directory domain
  domain: trading

  # ↓ 3–8 terms. Natural phrases users say when they need this skill.
  #   Includes: core topic, abbreviations, common adjacent concepts
  triggers: stop loss, trailing stop, ATR stop, stop placement, stop-loss, position protection, emergency stop, volatility stop

  # ↓ trading/* defaults to implementation
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, config, do-dont]

  # ↓ Comma-separated. Skills that complement or are often used with this one.
  related-skills: risk-position-sizing, risk-kill-switches, risk-drawdown-control
---

<!-- H1 TITLE: Human-readable, not kebab-case. -->
# Stop Loss Manager

<!-- ROLE PARAGRAPH: 1–3 sentences from the model's perspective.
     What does the model do when this skill is loaded?
     Don't describe the topic — describe the role the model takes on. -->
Implements stop loss mechanisms to limit losses and protect capital.
Stop losses are not just price levels — they are adaptive risk management tools that respond to market conditions, position age, and volatility regime.

<!-- TL;DR CHECKLIST: Quick self-check for the model.
     Concrete, actionable items. Not topic headings. -->
## TL;DR Checklist

- [ ] Select stop type appropriate to market regime (trending vs. ranging)
- [ ] Calculate ATR over 14 periods before placing any ATR-based stop
- [ ] Verify stop placement avoids round numbers and obvious liquidity pools
- [ ] Confirm trailing stop distance adapts to volatility (not fixed pct)
- [ ] Implement emergency stop as an independent layer, not conditional on other stops
- [ ] Track stop trigger rate for strategy performance analysis

---

<!-- WHEN TO USE: Specific situations, not abstract concepts. -->
## When to Use

- Implementing position risk controls for any long or short position
- Designing or reviewing a stop loss strategy for a new trading algorithm
- Choosing between stop types for a specific market condition
- Integrating emergency stops into an existing risk engine
- Building trailing stop logic for trend-following strategies

---

<!-- WHEN NOT TO USE: Explicit exclusions prevent inappropriate application. -->
## When NOT to Use

- For portfolio-level drawdown control — use `risk-drawdown-control` instead
- For position sizing decisions — use `risk-position-sizing` instead
- As the sole risk control — always combine with kill switches and position limits

---

<!-- CORE WORKFLOW: Numbered, with checkpoints where verification is critical. -->
## Core Workflow

1. **Assess Market Regime** — Determine if market is trending, ranging, or high-volatility.
   **Checkpoint:** Use ATR (14-period) as the baseline volatility measure before choosing stop type.

2. **Select Stop Type** — Choose the appropriate stop strategy for the regime:
   - Trending → trailing stop or ATR-based
   - Ranging → support/resistance-based
   - High volatility → volatility-adjusted ATR (wider multiplier)
   - All regimes → layer an emergency stop on top

3. **Calculate Stop Level** — Apply the selected formula (see Implementation Patterns below).
   **Checkpoint:** Stop must be beyond obvious support/resistance levels to avoid stop hunting.

4. **Place Stop** — Submit stop order or register with stop manager.
   **Checkpoint:** Verify stop is below entry price for longs, above for shorts.

5. **Monitor and Adjust** — Update trailing stops as price moves in favor.
   Track `highest_price` for longs, `lowest_price` for shorts.

6. **Record Trigger Events** — Log every stop trigger with: symbol, stop type, entry price, stop price, exit price, P&L.

---

<!-- IMPLEMENTATION PATTERNS: Actual code the model should produce.
     Use typed signatures and docstrings. -->
## Implementation Patterns

### Pattern 1: ATR-Based Stop

```python
def atr_stop(
    current_price: float,
    atr: float,
    atr_multiplier: float = 2.0
) -> float:
    """Calculate ATR-based stop loss level for a long position.
    
    Uses Average True Range to set a volatility-adjusted stop.
    Wider ATR multiplier = more room for price to breathe.
    
    Args:
        current_price: Current market price of the asset
        atr: 14-period Average True Range
        atr_multiplier: Distance multiplier (2.0 = 2x ATR below price)
    
    Returns:
        Stop loss price level
    """
    return current_price - (atr * atr_multiplier)
```

### Pattern 2: Trailing Stop (BAD vs. GOOD)

```python
# ❌ BAD: Fixed trailing distance ignores volatility — stops get hit in normal fluctuation
def bad_trailing_stop(current_price: float) -> float:
    FIXED_TRAIL = 50.0  # Magic number, never adapts
    return current_price - FIXED_TRAIL

# ✅ GOOD: ATR-adjusted trailing distance respects market conditions
def trailing_stop(
    current_price: float,
    highest_price: float,
    atr: float,
    atr_multiplier: float = 2.0
) -> float:
    """Calculate trailing stop that locks in profits as price advances.
    
    Trail distance adapts to volatility via ATR, preventing premature exits
    in volatile markets while tightening in calm conditions.
    """
    trail_distance = atr * atr_multiplier
    return highest_price - trail_distance
```

### Pattern 3: Emergency Stop (independent layer)

```python
def check_emergency_stop(
    current_price: float,
    entry_price: float,
    max_loss_pct: float = 0.15
) -> bool:
    """Return True if emergency stop should trigger immediately.
    
    Emergency stop is always active, regardless of other stop types.
    It prevents catastrophic losses from extreme adverse moves.
    """
    max_loss = entry_price * max_loss_pct
    return current_price < entry_price - max_loss
```

---

<!-- CONSTRAINTS: Short, imperative. Non-negotiable rules. -->
## Constraints

### MUST DO
- Layer an emergency stop on top of every other stop type
- Base trailing stop distance on ATR, not a fixed price or percentage
- Place stops beyond obvious liquidity levels (round numbers, prior highs/lows)
- Track and log every stop trigger event for strategy analysis
- Test emergency stop triggers under simulated extreme conditions

### MUST NOT DO
- Use stop type from `risk-stop-loss` as the *only* risk control layer
- Disable or bypass stops "temporarily" — this is how catastrophic losses happen
- Set stops at round numbers (e.g. exactly $100.00) — they attract stop hunting
- Reuse the same ATR multiplier across all market regimes without adjustment

---

<!-- OUTPUT TEMPLATE: What the model produces when this skill is applied.
     Not required for all skills, but helpful for review/analysis roles. -->
## Output Template

When implementing or reviewing stop loss logic, produce:

1. **Selected Stop Type** — Which strategy and why (market regime rationale)
2. **Calculated Stop Level** — The actual price level with formula shown
3. **ATR Basis** — The ATR value and period used
4. **Emergency Stop** — Confirmed present and independent of primary stop
5. **Risk/Reward Check** — Estimated R:R ratio with this stop placement

---

<!-- RELATED SKILLS TABLE: Makes skill discovery easier. -->
## Related Skills

| Skill                          | Purpose                                                  |
| ------------------------------ | -------------------------------------------------------- |
| `risk-position-sizing`         | Size the position before setting the stop                |
| `risk-kill-switches`           | System-level circuit breakers — a layer above stops      |
| `risk-drawdown-control`        | Portfolio drawdown limits — coordinates across positions |
| `risk-value-at-risk`           | Statistical risk quantification to guide stop placement  |
```

---

## Quick Reference: Common Mistakes

| Mistake                      | Problem                              | Fix                                    |
| ---------------------------- | ------------------------------------ | -------------------------------------- |
| `description: Stop loss`       | Too vague — model may skip the skill | Add active verb + domain terms + scope |
| Missing `triggers`             | Skill never auto-loads               | Add 3–8 specific keywords              |
| `triggers: risk, code, data`   | Fires on everything                  | Use domain-specific phrases            |
| `name: trading/risk/stop_loss` | Wrong format                         | Use kebab-case matching directory name |
| Missing "When NOT to Use"    | Model applies skill inappropriately  | Always add exclusion cases             |
| Code without typing          | Ambiguous signatures                 | Add Python type hints and docstrings   |
| Links to `example.com`         | Broken references                    | Use real URLs or omit the link         |
| H1 = directory name          | Unreadable                           | Use human-readable title               |
| No `content-types` specified | Validation defaults may be wrong     | Explicitly declare content-types       |
| `description` lists 5+ patterns | Monolithic skill — confuses router, dilutes guidance | Split into atomic skills; each covers one coherent topic |

---

*This spec applies to all skills in this repository. When in doubt, favor specificity over brevity — skills read by LLMs benefit from explicit, concrete guidance over terse descriptions.*
