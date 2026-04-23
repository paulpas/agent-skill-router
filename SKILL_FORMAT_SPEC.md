# OpenCode Skill Format Specification

> **Audience:** LLMs writing, auditing, or migrating skills in this repository.
> **Purpose:** Defines the canonical structure for every `SKILL.md` file so that OpenCode can load, route, and apply skills consistently.

---

## Table of Contents

1. [Overview](#1-overview)
2. [YAML Frontmatter Specification](#2-yaml-frontmatter-specification)
3. [Domain Defaults Table](#3-domain-defaults-table)
4. [Content Structure](#4-content-structure)
5. [Triggers Guidelines](#5-triggers-guidelines)
6. [Quality Checklist](#6-quality-checklist)
7. [Complete Annotated Example](#7-complete-annotated-example)

---

## 1. Overview

### What Skills Are

A **skill** is a self-contained Markdown document that injects specialized behavior, knowledge, and constraints into an OpenCode AI agent session. When loaded, the skill's full content becomes part of the model's active context, shaping how it responds to the current task.

Skills live at:

```
<skills-root>/
  <domain>-<topic>/
    SKILL.md          ← the only required file
    references/       ← optional: referenced sub-documents
    scripts/          ← optional: helper scripts
```

### How OpenCode Uses Skills

OpenCode loads skills in two ways:

| Loading Mode | Mechanism | When It Fires |
|---|---|---|
| **Manual** | User runs `/skill <name>` | Explicitly requested |
| **Auto-load** | `metadata.triggers` keyword match | Detected in conversation context |

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

Skill directories follow strict kebab-case: `<domain>-<topic>`.

| Valid | Invalid |
|---|---|
| `trading-risk-stop-loss` | `TradingRiskStopLoss` |
| `cncf-prometheus` | `cncf_prometheus` |
| `coding-code-review` | `coding_codeReview` |
| `agent-confidence-based-selector` | `agentConfidenceSelector` |

The `name` field in frontmatter **must exactly match** the directory name.

**Known domains:**

| Prefix | Category |
|---|---|
| `agent-` | AI agent orchestration patterns |
| `cncf-` | CNCF cloud native projects |
| `coding-` | General coding patterns and practices |
| `trading-` | Algorithmic trading implementation |
| `programming-` | Language/algorithm reference material |

---

## 2. YAML Frontmatter Specification

Every `SKILL.md` begins with a YAML frontmatter block delimited by `---`.

### Required Fields

These two fields are **mandatory**. A skill without them will not load correctly.

| Field | Type | Rules |
|---|---|---|
| `name` | string | Must exactly match the directory name in kebab-case |
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

| Field | Value | Purpose |
|---|---|---|
| `license` | `MIT` | Signals the skill is freely redistributable |
| `compatibility` | `opencode` | Confirms this skill follows OpenCode format conventions |

### The `metadata` Block

The `metadata` block enables auto-loading, categorization, and skill discovery. It is **strongly recommended** for all skills.

| Field | Type | Values / Rules |
|---|---|---|
| `metadata.version` | string | Semantic version: `"1.0.0"` |
| `metadata.domain` | string | One of: `agent`, `cncf`, `coding`, `trading`, `programming` |
| `metadata.triggers` | string | Comma-separated keywords (3–8 terms). Drives auto-loading. |
| `metadata.role` | string | One of: `implementation`, `reference`, `orchestration`, `review` |
| `metadata.scope` | string | One of: `implementation`, `infrastructure`, `orchestration`, `review` |
| `metadata.output-format` | string | One of: `code`, `manifests`, `analysis`, `report` |
| `metadata.related-skills` | string | Comma-separated skill names (e.g. `trading-risk-kill-switches, coding-event-bus`) |
| `metadata.author` | string | GitHub URL — **only for externally-sourced skills** |
| `metadata.source` | string | Source repo URL — **only for externally-sourced skills** |

### Complete Frontmatter Examples by Domain

#### `agent-*` Skill

```yaml
---
name: agent-confidence-based-selector
description: Selects and executes the most appropriate skill based on confidence scores and relevance metrics, enabling intelligent skill routing for dynamic task resolution.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  triggers: confidence scoring, skill routing, skill selection, task routing, adaptive selection, agent dispatch
  role: orchestration
  scope: orchestration
  output-format: analysis
  related-skills: agent-dependency-graph-builder, agent-parallel-skill-runner, agent-dynamic-replanner
---
```

#### `cncf-*` Skill

```yaml
---
name: cncf-prometheus
description: Prometheus architecture, PromQL patterns, alerting rules, ServiceMonitor configuration, and Kubernetes integration for cloud-native observability.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: cncf
  triggers: prometheus, promql, alerting rules, metrics scraping, kube-state-metrics, monitoring stack, time-series database
  role: reference
  scope: infrastructure
  output-format: manifests
  related-skills: cncf-grafana, cncf-alertmanager, cncf-opentelemetry, cncf-thanos
---
```

#### `coding-*` Skill

```yaml
---
name: coding-code-review
description: Analyzes code diffs and files to identify bugs, security vulnerabilities, code smells, and architectural concerns, producing a structured review report with prioritized, actionable feedback.
license: MIT
compatibility: opencode
metadata:
  version: "1.1.0"
  domain: coding
  triggers: code review, pull request, PR review, security audit, code quality, architectural review, OWASP
  role: review
  scope: review
  output-format: report
  related-skills: coding-security-review, coding-test-driven-development
  author: https://github.com/Jeffallan
  source: https://github.com/farmage/opencode-skills
---
```

#### `trading-*` Skill

```yaml
---
name: trading-risk-stop-loss
description: Implements stop-loss strategies (fixed percentage, ATR-based, trailing, support/resistance, volatility-adjusted) to limit position losses in algorithmic trading systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: trading
  triggers: stop loss, trailing stop, ATR stop, risk management, position protection, stop placement, emergency stop
  role: implementation
  scope: implementation
  output-format: code
  related-skills: trading-risk-position-sizing, trading-risk-kill-switches, trading-risk-drawdown-control
---
```

#### `programming-*` Skill

```yaml
---
name: programming-algorithms
description: Reference guide for common algorithms (sorting, search, graph traversal, dynamic programming) with complexity analysis and Python implementation patterns.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: programming
  triggers: algorithms, big O, sorting, binary search, graph traversal, dynamic programming, time complexity
  role: reference
  scope: implementation
  output-format: code
  related-skills: coding-test-driven-development
---
```

---

## 3. Domain Defaults Table

When the appropriate `metadata.role`, `metadata.scope`, and `metadata.output-format` values are not obvious, use domain defaults as a starting point. Override when the specific skill warrants it.

| Domain | Default Role | Default Scope | Default Output Format | Typical Content |
|---|---|---|---|---|
| `agent` | `orchestration` | `orchestration` | `analysis` | Routing flows, confidence scoring, fallback logic |
| `cncf` | `reference` | `infrastructure` | `manifests` | YAML manifests, PromQL, architecture diagrams |
| `coding` | `implementation` | `implementation` | `code` | Code patterns, checklists, good/bad examples |
| `trading` | `implementation` | `implementation` | `code` | Python classes, risk constraints, APEX patterns |
| `programming` | `reference` | `implementation` | `code` | Algorithm pseudocode, complexity tables |

**Override examples:**

- `coding-code-review` → role `review`, output-format `report` (not the coding default)
- `trading-risk-stress-testing` → role `reference` (analysis-heavy, not pure implementation)
- `agent-goal-to-milestones` → output-format `analysis` (produces plans, not code)

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

| Skill | Purpose |
|---|---|
| `skill-name` | Why you'd use this instead or alongside |
| `skill-name` | Complementary capability |
```

### Section-by-Section Guidance

#### H1 Title

Use a human-readable title, not the kebab-case name.

```markdown
# ✅ Stop Loss Manager
# ✅ Confidence-Based Selector (Agent Skill Selection)
# ✅ Prometheus in Cloud-Native Engineering

# ❌ trading-risk-stop-loss
# ❌ agent-confidence-based-selector
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

#### Constraints (MUST DO / MUST NOT DO)

Short, imperative sentences. No explanations needed here — those belong in the workflow. These are the non-negotiable rules.

---

### Category-Specific Guidance

#### `agent-*` Skills

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

#### `cncf-*` Skills

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

#### `coding-*` Skills

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

#### `trading-*` Skills

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

---

## 5. Triggers Guidelines

### What Triggers Do

The `metadata.triggers` field contains comma-separated keywords that OpenCode matches against the active conversation. When a match is found, the skill is automatically injected into context — no `/skill` command required.

**Auto-loading is the primary way skills get used.** A skill with no triggers relies entirely on users knowing to load it manually.

### Rules for Good Triggers

| Rule | Explanation |
|---|---|
| **3–8 terms** | Fewer than 3 is too narrow. More than 8 dilutes signal and causes false positives. |
| **Include the core topic name** | Always include the primary name: `prometheus`, `stop loss`, `code review` |
| **Include abbreviations** | `ATR`, `PromQL`, `VWAP`, `TDD` — models use these in conversation |
| **Include hyphenated variants** | `stop-loss` alongside `stop loss` |
| **Include common adjacent terms** | What words appear in conversation when someone needs this skill? |
| **Avoid ultra-generic terms** | `risk`, `code`, `data` will trigger on nearly everything |

### Good and Bad Trigger Examples

#### `trading-risk-stop-loss`

```yaml
# ✅ GOOD
triggers: stop loss, trailing stop, ATR stop, stop placement, position protection, emergency stop, stop-loss

# ❌ TOO BROAD — will fire on nearly any trading conversation
triggers: risk, trading, loss, price

# ❌ TOO NARROW — misses most natural phrasings
triggers: StopLossManager
```

#### `cncf-prometheus`

```yaml
# ✅ GOOD
triggers: prometheus, promql, alerting rules, metrics scraping, kube-state-metrics, servicemonitor, time-series database

# ❌ TOO BROAD — fires whenever anyone mentions monitoring anything
triggers: monitoring, metrics, alerts, kubernetes

# ❌ MISSES ABBREVIATIONS — PromQL is very common in conversation
triggers: prometheus, prometheus operator, alertmanager
```

#### `coding-code-review`

```yaml
# ✅ GOOD
triggers: code review, pull request, PR review, code quality, security audit, OWASP, architectural review

# ❌ TOO BROAD — fires on any coding conversation
triggers: code, review, bugs, security

# ❌ MISSES NATURAL PHRASING — "review this PR" would not match
triggers: code-review, code_review
```

#### `agent-confidence-based-selector`

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

### Frontmatter

- [ ] `name` exactly matches the directory name (kebab-case)
- [ ] `description` clearly states what the skill makes the model do in one sentence
- [ ] `description` leads with an active verb and includes 1–2 domain-specific terms
- [ ] `license: MIT` is present
- [ ] `compatibility: opencode` is present
- [ ] `metadata.version` is present (format: `"1.0.0"`)
- [ ] `metadata.domain` matches the directory name prefix (`agent`, `cncf`, `coding`, `trading`, `programming`)
- [ ] `metadata.triggers` is set with 3–8 meaningful, specific terms
- [ ] `metadata.role` is set to one of: `implementation`, `reference`, `orchestration`, `review`
- [ ] `metadata.scope` is set to one of: `implementation`, `infrastructure`, `orchestration`, `review`
- [ ] `metadata.output-format` is set to one of: `code`, `manifests`, `analysis`, `report`
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

### Domain-Specific

**For `agent-*`:**
- [ ] Orchestration flow diagram (ASCII) is present
- [ ] Fallback/error routing is explicitly described
- [ ] References `code-philosophy` (5 Laws of Elegant Defense)

**For `cncf-*`:**
- [ ] Purpose and Use Cases section present
- [ ] Architecture Design Patterns section present
- [ ] Integration Approaches section present
- [ ] Common Pitfalls section present
- [ ] At least one complete working YAML manifest example

**For `coding-*`:**
- [ ] At least one BAD/GOOD code example pair
- [ ] References a relevant standard (OWASP, SOLID, DRY, etc.)
- [ ] MUST DO / MUST NOT DO constraints present

**For `trading-*`:**
- [ ] Python implementation with typed signatures
- [ ] Risk constraints explicitly stated
- [ ] File path conventions follow APEX platform layout

---

## 7. Complete Annotated Example

The following is a complete, annotated `SKILL.md` for `trading-risk-stop-loss`. Inline comments (`<!-- -->`) explain each structural choice. In a real skill, remove all comments.

```markdown
---
# ↓ REQUIRED: Must exactly match the directory name
name: trading-risk-stop-loss

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

  # ↓ Must match directory prefix
  domain: trading

  # ↓ 3–8 terms. Natural phrases users say when they need this skill.
  #   Includes: core topic, abbreviations, common adjacent concepts
  triggers: stop loss, trailing stop, ATR stop, stop placement, stop-loss, position protection, emergency stop, volatility stop

  # ↓ trading-* defaults to implementation
  role: implementation
  scope: implementation
  output-format: code

  # ↓ Comma-separated. Skills that complement or are often used with this one.
  related-skills: trading-risk-position-sizing, trading-risk-kill-switches, trading-risk-drawdown-control
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

- For portfolio-level drawdown control — use `trading-risk-drawdown-control` instead
- For position sizing decisions — use `trading-risk-position-sizing` instead
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
- Use stop type from `trading-risk-stop-loss` as the *only* risk control layer
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

| Skill | Purpose |
|---|---|
| `trading-risk-position-sizing` | Size the position before setting the stop |
| `trading-risk-kill-switches` | System-level circuit breakers — a layer above stops |
| `trading-risk-drawdown-control` | Portfolio drawdown limits — coordinates across positions |
| `trading-risk-value-at-risk` | Statistical risk quantification to guide stop placement |
```

---

## Quick Reference: Common Mistakes

| Mistake | Problem | Fix |
|---|---|---|
| `description: Stop loss` | Too vague — model may skip the skill | Add active verb + domain terms + scope |
| Missing `triggers` | Skill never auto-loads | Add 3–8 specific keywords |
| `triggers: risk, code, data` | Fires on everything | Use domain-specific phrases |
| `name: trading_risk_stop_loss` | Wrong format | Use kebab-case matching directory name |
| Missing "When NOT to Use" | Model applies skill inappropriately | Always add exclusion cases |
| Code without typing | Ambiguous signatures | Add Python type hints and docstrings |
| Links to `example.com` | Broken references | Use real URLs or omit the link |
| H1 = directory name | Unreadable | Use human-readable title |

---

*This spec applies to all skills in this repository. When in doubt, favor specificity over brevity — skills read by LLMs benefit from explicit, concrete guidance over terse descriptions.*
