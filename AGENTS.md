# Agents Guide — Adding New Skills

This guide explains how to create new skills for the agent-skill-router repository.

> **Quick Reference:** Skills are self-contained documentation files that provide specialized expertise to AI agents. Each skill lives in `skills/<domain>-<topic>/SKILL.md` and follows a strict format.

---

## Table of Contents

- [Overview](#overview)
- [Skill Repository Structure](#skill-repository-structure)
- [Domain Categories](#domain-categories)
- [Creating a New Skill](#creating-a-new-skill)
- [Frontmatter Requirements](#frontmatter-requirements)
- [Content Structure](#content-structure)
- [Naming Conventions](#naming-conventions)
- [Triggers Guidelines](#triggers-guidelines)
- [Trigger Engineering for Conversational Discovery](#trigger-engineering-for-conversational-discovery)
- [Choosing Related Skills](#choosing-related-skills)
- [Workflow to Add a Skill](#workflow-to-add-a-skill)
- [Utility Scripts and Automation](#utility-scripts-and-automation)
- [Common Mistakes to Avoid](#common-mistakes-to-avoid)
- [Quality Checklist](#quality-checklist)
- [Related Documentation](#related-documentation)

---

## Overview

### What Skills Are

A **skill** is a self-contained Markdown document that injects specialized behavior, knowledge, and constraints into an OpenCode AI agent session. When loaded, the skill's full content becomes part of the model's active context, shaping how it responds to the current task.

Skills enable auto-routing: when the skill-router detects trigger keywords in conversation, the appropriate skill is automatically loaded and injected into context — no manual `/skill` commands required.

### How Skills Are Used

OpenCode loads skills in two ways:

| Loading Mode | Mechanism | When It Fires |
|---|---|---|
| **Manual** | User runs `/skill <name>` | Explicitly requested |
| **Auto-load** | `metadata.triggers` keyword match | Detected in conversation context |

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

---

## Skill Repository Structure

```
skills/
├── agent-*/          ← Agent orchestration, routing, analysis skills
├── cncf-*/           ← CNCF cloud-native project reference skills
├── coding-*/         ← Software engineering patterns skills
├── trading-*/        ← Algorithmic trading implementation skills
└── programming-*/    ← CS fundamentals, algorithms reference skills
    └── <skill-name>/
        ├── SKILL.md          ← Required: skill documentation
        ├── references/       ← Optional: referenced sub-documents
        └── scripts/          ← Optional: helper scripts
```

**Current Statistics:**
- **266 skills** across 5 domains
- **5 domain categories**: agent, cncf, coding, trading, programming

---

## Domain Categories

Each domain has a prefix and default metadata values:

| Domain Prefix | Category | Default Role | Default Scope | Default Output Format |
|---|---|---|---|---|
| `agent-` | AI agent orchestration patterns | `orchestration` | `orchestration` | `analysis` |
| `cncf-` | CNCF cloud-native projects | `reference` | `infrastructure` | `manifests` |
| `coding-` | Software engineering patterns | `implementation` | `implementation` | `code` |
| `trading-` | Algorithmic trading implementation | `implementation` | `implementation` | `code` |
| `programming-` | CS fundamentals, algorithms | `reference` | `implementation` | `code` |

**Note:** These defaults can be overridden for specific skills that don't fit the typical pattern.

---

## Creating a New Skill

### Step 1: Create the Directory

Create a new directory under `skills/` using kebab-case naming:

```
skills/<domain>-<topic>/
```

Examples:
- `skills/trading-risk-stop-loss/`
- `skills/coding-code-review/`
- `skills/agent-task-decomposition-engine/`
- `skills/cncf-prometheus/`

### Step 2: Create SKILL.md

Inside the new directory, create `SKILL.md` with the required YAML frontmatter and content sections.

---

## Frontmatter Requirements

Every `SKILL.md` must begin with a YAML frontmatter block delimited by `---`.

### Required Fields

| Field | Type | Rules |
|---|---|---|
| `name` | string | Must exactly match the directory name in kebab-case |
| `description` | string | Single line. State what the skill does, not what it is about. Use an active verb. Max ~200 characters. |

**Description Writing Rules:**
- State *what the skill makes the model do*
- Lead with an active verb: `Implements…`, `Selects…`, `Analyzes…`, `Detects…`
- Include 1–2 key domain terms that distinguish this skill from similar ones
- Examples:
  ```yaml
  # ❌ BAD — too vague
  description: Stop loss for trading
  
  # ❌ BAD — describes the topic instead of the skill's action
  description: Information about Prometheus monitoring
  
  # ✅ GOOD — specific action + domain context
  description: Implements stop-loss strategies (fixed percentage, ATR-based, trailing, volatility-adjusted) for position risk management in algorithmic trading systems
  ```

### Recommended Fields

| Field | Value | Purpose |
|---|---|---|
| `license` | `MIT` | Signals the skill is freely redistributable |
| `compatibility` | `opencode` | Confirms this skill follows OpenCode format conventions |

### The `metadata` Block

The `metadata` block enables auto-loading, categorization, and skill discovery.

| Field | Type | Values / Rules |
|---|---|---|
| `metadata.version` | string | Semantic version: `"1.0.0"` |
| `metadata.domain` | string | One of: `agent`, `cncf`, `coding`, `trading`, `programming` |
| `metadata.role` | string | One of: `implementation`, `reference`, `orchestration`, `review` |
| `metadata.scope` | string | One of: `implementation`, `infrastructure`, `orchestration`, `review` |
| `metadata.output-format` | string | One of: `code`, `manifests`, `analysis`, `report` |
| `metadata.triggers` | string | Comma-separated keywords (3–8 terms). **Drives auto-loading.** |
| `metadata.related-skills` | string | Comma-separated skill names (e.g. `trading-risk-kill-switches`) |
| `metadata.author` | string | GitHub URL — **only for externally-sourced skills** |
| `metadata.source` | string | Source repo URL — **only for externally-sourced skills** |

---

## Content Structure

### Minimum Required Sections

Every skill must have these four elements:

1. **H1 Title** — Human-readable name (not the kebab-case identifier)
2. **Role/purpose paragraph** — 1–3 sentences explaining what this skill makes the model do
3. **When to Use** — Bulleted list of situations where this skill applies
4. **Core Workflow or Constraints** — The primary instructions the model must follow

### Recommended Full Structure

Use this template as a starting point:

```markdown
# Skill Title (Human-Readable)

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

---

## Naming Conventions

### Directory Names

**Must be kebab-case:** lowercase with hyphens between words.

| Valid | Invalid |
|---|---|
| `trading-risk-stop-loss` | `TradingRiskStopLoss` |
| `cncf-prometheus` | `cncf_prometheus` |
| `coding-code-review` | `coding_codeReview` |
| `agent-confidence-based-selector` | `agentConfidenceSelector` |

### Frontmatter `name` Field

The `name` field in frontmatter **must exactly match** the directory name.

```yaml
# Directory: skills/trading-risk-stop-loss/
---
name: trading-risk-stop-loss  # ✅ Must match directory name
# ❌ name: trading_risk_stop_loss  (wrong format)
# ❌ name: trading-risk-stopLoss  (wrong case)
---
```

### H1 Title

Use a human-readable title, not the kebab-case name.

```markdown
# ✅ Stop Loss Manager
# ✅ Confidence-Based Selector (Agent Skill Selection)
# ✅ Prometheus in Cloud-Native Engineering

# ❌ trading-risk-stop-loss
# ❌ agent-confidence-based-selector
```

---

## Triggers Guidelines

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

### Good vs Bad Trigger Examples

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

### Trigger Calibration Heuristic

Ask these questions for each trigger candidate:

1. **If someone says this word/phrase, would they plausibly need this skill?** → Include it
2. **Is this word used heavily in other unrelated contexts?** → Exclude or be more specific
3. **Is this a natural abbreviation or shorthand for the topic?** → Include it
4. **Is this only used internally (class name, file name)?** → Exclude it

---

## Trigger Engineering for Conversational Discovery

Expert trigger design makes skills discoverable through **natural conversation language**, not just technical jargon. This section teaches a two-tier strategy for triggers that match how real users search for help.

### The Two-Tier Trigger Strategy

Effective triggers combine **technical precision** with **conversational accessibility**. Use two complementary tiers:

**Tier 1: Technical Terms** — Exact domain terminology
- Used by practitioners, documentation, official product names
- Examples: `kubernetes`, `EC2`, `PostgreSQL`, `ATR`, `PromQL`

**Tier 2: Conversational Variants** — How non-technical users or the business would phrase their need
- Natural language questions: "how do I...", "what is...", "help with..."
- Business language: "cost savings", "security", "compliance", "performance"
- Everyday terms: "cloud server" (→ EC2), "database" (→ PostgreSQL), "container" (→ Kubernetes)

**Example: Kubernetes Skill**

```
Technical Tier: kubernetes, k8s, container orchestration, pod management, deployment, statefulset
Conversational Tier: managing containers, deploying applications, scaling apps, orchestration, how do i run containers
```

By blending tiers, your skill matches:
- ✅ Expert typing `k8s pod management`
- ✅ Business user typing `how do i scale my apps`
- ✅ Manager typing `container deployment`
- ✅ Learner typing `kubernetes tutorial`

### User-Friendly Trigger Patterns

When designing triggers, use these conversational patterns as templates:

| Pattern | Example Trigger | Use Case | When to Use |
|---------|-----------------|----------|------------|
| **Core Name** | `kubernetes`, `postgresql`, `stop loss` | Primary search term | Always include; this is your main hook |
| **Abbreviation** | `k8s`, `postgres`, `ATR` | Power users, common shorthand | Include if widely known in the domain |
| **"how do I..."** | `how do i run a server`, `how do i store data`, `how do i deploy apps` | Questions non-technical users ask | At least 1 per skill; top priority for discovery |
| **"what is..."** | `what is kubernetes`, `what is load balancing` | Learning/clarification questions | Include if skill explains a concept |
| **"help with..."** | `help with container management`, `help with backups` | Request-style phrasing | Use for operational concerns |
| **Common colloquialisms** | `cloud server` (EC2), `database` (PostgreSQL), `app hosting` | Everyday business language | Match how non-engineers describe the problem |
| **Related tech** | `docker` (→ Kubernetes skill), `yaml` (→ Kubernetes skill), `ssl` (→ security skill) | Adjacent concerns | 1-2 adjacent terms users might search |
| **Operational tasks** | `scaling`, `monitoring`, `backup`, `encryption`, `replication` | Action-oriented phrases | Essential for infrastructure skills |
| **Misspellings/variants** | `postgres` (→ postgresql), `elastic search` (→ opensearch), `k8` (→ k8s) | Common user errors | Include only high-frequency variants |
| **Business value phrases** | `cost savings`, `faster deployment`, `secure storage`, `compliance` | Business/management language | Use when business value is a primary driver |

**Real Example: PostgreSQL Skill**

This skill needs to match queries from:
- DBAs: `postgresql replication`, `postgres backups`, `pg_replication_slots`
- Developers: `sql database`, `how do i store data`, `postgres connection pooling`
- Managers: `managed database`, `database performance`, `reliable data storage`

**Effective Triggers:**
```yaml
triggers: postgresql, postgres, managed database, relational database, how do i store data, backups, replication
```

This hits:
- Technical: `postgresql`, `postgres`, `replication`
- Conversational: `managed database`, `how do i store data`
- Business: `reliable data storage` (implied in "managed database")

### Domain-Specific Trigger Guidelines

Each domain's user base searches differently. Tailor your triggers to their vocabulary:

#### CNCF Skills (Cloud Infrastructure)

**Characteristics:**
- Mixed audience: SREs (technical), DevOps engineers, platform teams
- High operational focus — users search by task, not just product
- Cross-product ecosystem — users often search for multiple solutions

**Trigger Strategy:**

1. **Include both product name AND category name**
   - Good: `kubernetes, container orchestration`
   - Bad: just `kubernetes` (misses "orchestration" searches)

2. **Add operational tasks**
   - Examples: `deploying`, `scaling`, `monitoring`, `logging`, `alerting`, `networking`
   - Why: Users think in tasks first ("how do I scale?"), product second

3. **Add deployment patterns**
   - Examples: `managed`, `self-hosted`, `containerized`, `serverless`
   - Why: Different users search based on deployment model

4. **Add adjacent tech bridge terms**
   - Examples: For Kubernetes: `docker`, `helm`, `istio`; for Prometheus: `grafana`, `alertmanager`
   - Why: Users often know related tools but may not know this one

**Template for CNCF Skills:**
```
primary-product, product-abbreviation, product-category, how-do-i-[task], [deployment-pattern], adjacent-product
```

**Concrete Examples:**

```yaml
# PostgreSQL
triggers: postgresql, postgres, managed database, relational database, how do i store data, backups, replication

# Kubernetes
triggers: kubernetes, k8s, container orchestration, managing containers, deploying applications, scaling apps, helm

# Prometheus
triggers: prometheus, promql, time-series database, metrics monitoring, how do i monitor systems, alerting, grafana
```

#### Trading Skills (Algorithmic & Quantitative)

**Characteristics:**
- Audience: Quants, algo traders, risk managers, portfolio engineers
- Two languages: technical (Python, financial math) + financial (Greeks, risk metrics)
- Regulatory concern — risk compliance vocabulary matters

**Trigger Strategy:**

1. **Include both technical terms AND financial concepts**
   - Technical: `stop loss`, `ATR`, `trailing stop`
   - Financial: `capital protection`, `risk management`, `position control`

2. **Add market context**
   - Examples: `options`, `crypto`, `forex`, `stocks`, `futures`, `equities`
   - Why: Same strategy applies across markets; users search for their market

3. **Add execution concepts**
   - Examples: `entry points`, `exit strategy`, `position sizing`, `portfolio rebalancing`
   - Why: Execution is how traders think about algorithms

4. **Add risk/compliance language**
   - Examples: `risk limits`, `regulatory limits`, `drawdown control`, `loss prevention`
   - Why: Risk managers use this vocabulary

**Template for Trading Skills:**
```
technical-term, financial-concept, how-do-i-[task], market-context, risk-language
```

**Concrete Examples:**

```yaml
# Stop Loss
triggers: stop loss, risk management, capital protection, trading strategy, how do i limit losses, exit points, volatility

# Position Sizing
triggers: position sizing, portfolio allocation, risk management, money management, how much should i trade, kelly criterion

# VWAP Execution
triggers: vwap, volume-weighted average price, execution algorithm, order execution, how do i execute large orders, minimal market impact
```

#### Coding Skills (Implementation & Patterns)

**Characteristics:**
- Audience: Software engineers at all levels (juniors need "how to"; seniors search by pattern)
- Learning angle matters — documentation + tutorials are valuable
- Quality concepts (testing, security, performance) drive searches

**Trigger Strategy:**

1. **Include design patterns AND implementation approach**
   - Pattern: `code review`, `testing`, `refactoring`
   - Approach: `unit testing`, `integration testing`, `peer review`

2. **Add learning variants**
   - Examples: `learn how to`, `tutorial`, `example`, `best practices`, `guide`
   - Why: Junior engineers search this way; valuable for skill discovery

3. **Add use cases**
   - Examples: For testing: `unit test`, `integration test`, `mocking`; for security: `vulnerability`, `injection`, `OWASP`
   - Why: Context matters; same skill applies in different contexts

4. **Add quality/non-functional concerns**
   - Examples: `performance optimization`, `debugging`, `profiling`, `security`, `accessibility`
   - Why: Quality-focused developers search by concern, not pattern name

**Template for Coding Skills:**
```
pattern-name, how-do-i-[implement], use-case, quality-concern, best-practices
```

**Concrete Examples:**

```yaml
# Code Review
triggers: code review, pull request, quality checks, security review, peer review, how do i review code, testing standards

# Refactoring
triggers: refactoring, code quality, technical debt, how do i improve code, legacy code, performance optimization

# Testing
triggers: unit testing, test automation, how do i test code, mocking, test coverage, tdd, continuous integration
```

#### Agent Skills (Orchestration & Routing)

**Characteristics:**
- Audience: System designers, orchestration engineers, automation developers
- Multi-step workflows — users think about routing and fallback
- Decision-making language is key

**Trigger Strategy:**

1. **Include routing/selection concepts**
   - Examples: `routing`, `selection`, `dispatch`, `orchestration`, `delegation`

2. **Add decision-making language**
   - Examples: `choose`, `select`, `route`, `delegate`, `assign`

3. **Add multi-step concepts**
   - Examples: `workflow`, `pipeline`, `orchestration`, `automation`, `agent coordination`

4. **Add operational language**
   - Examples: `how do i automate this`, `parallel execution`, `error handling`, `fallback`

**Template for Agent Skills:**
```
core-concept, routing-term, orchestration-term, how-do-i-[automate], multi-step-pattern
```

**Concrete Examples:**

```yaml
# Task Routing
triggers: task routing, agent selection, orchestration, how do i automate this, workflow automation, agent dispatch

# Parallel Execution
triggers: parallel execution, agent coordination, concurrent tasks, workflow orchestration, how do i run tasks in parallel
```

#### Programming Skills (Reference & Fundamentals)

**Characteristics:**
- Audience: Computer Science students, algorithm enthusiasts, interview prep
- Implementation understanding + problem-solving
- Learning and reference both important

**Trigger Strategy:**

1. **Include algorithm names AND problem categories**
   - Algorithm: `quicksort`, `mergesort`, `dijkstra`
   - Category: `sorting algorithms`, `graph algorithms`, `dynamic programming`

2. **Add learning variants**
   - Examples: `how to implement`, `understand`, `learn`, `tutorial`

3. **Add problem context**
   - Examples: `sorting`, `searching`, `pathfinding`, `optimization`

4. **Add complexity concerns**
   - Examples: `time complexity`, `space complexity`, `efficiency`, `optimization`

**Template for Programming Skills:**
```
algorithm-name, problem-category, how-to-implement, complexity-concern
```

**Concrete Examples:**

```yaml
# Sorting Algorithms
triggers: sorting algorithms, quicksort, mergesort, how do i sort data efficiently, algorithm optimization, time complexity

# Graph Traversal
triggers: graph algorithms, dfs, bfs, how do i traverse a graph, pathfinding, tree traversal
```

### The 5-8 Term Limit Strategy

You have 5-8 terms total. Prioritize ruthlessly:

**MUST INCLUDE (non-negotiable):**
1. Primary product/concept name (e.g., "Kubernetes", "PostgreSQL", "Code Review")
2. Most common abbreviation if one exists (e.g., "k8s", "postgres", "PR")

**SHOULD INCLUDE (based on domain):**
1. 1-2 conversational variants matching your domain's typical user questions
2. 1 "how do I..." variant if your skill solves a task
3. 1 related operational task or adjacent concern

**COULD INCLUDE (if space allows — 7-8 terms):**
1. Alternative spelling or common misspelling (only high-frequency variants)
2. Business value phrase (only if it's a primary driver)
3. One adjacent technology name (only if users often search for both)

**Worked Example: Stop Loss Skill (Trading)**

Starting candidates (11 terms — too many):
```
stop loss, trailing stop, ATR stop, fixed percentage, volatility stop, 
stop placement, position protection, emergency stop, risk management, 
how do i limit losses, capital protection, stop-loss
```

Prioritize:
```
MUST: stop loss, trailing stop            (core concepts)
SHOULD: ATR stop, position protection,    (domain-specific operational task)
        how do i limit losses              (conversational variant)
COULD: emergency stop, stop-loss          (variant + risk context)
```

Final 7 terms (fits 5-8 limit):
```yaml
triggers: stop loss, trailing stop, ATR stop, stop placement, position protection, how do i limit losses, emergency stop
```

This captures:
- ✅ Technical: `stop loss`, `ATR stop`, `trailing stop`
- ✅ Conversational: `how do i limit losses`, `position protection`
- ✅ Operational: `stop placement`
- ✅ Emergency context: `emergency stop`

### Testing Your Triggers

Before committing a skill, validate your triggers:

**Readability Test:**
- [ ] Read triggers aloud — do they sound like questions you'd hear in Slack or Stack Overflow?
- [ ] Could you imagine each trigger in a real user message?

**Coverage Test:**
- [ ] Ask non-technical teammates — would they use these words?
- [ ] Search for similar skills — do your triggers overlap dangerously?
- [ ] Think of edge cases — what legitimate need might miss your triggers?

**Precision Test:**
- [ ] For each trigger, ask: "If someone searched this, would they always need this skill?"
- [ ] If the answer is "no" for 2+ triggers, revise them

**Diversity Test:**
- [ ] Do your triggers include at least one technical term?
- [ ] Do your triggers include at least one conversational/user phrase?
- [ ] Is there at least one task-oriented term?

### Common Trigger Mistakes to Avoid

| Mistake | Problem | Example | Fix |
|---------|---------|---------|-----|
| **Only technical terms** | Won't match user search language | `kubernetes, k8s, deployment, orchestration` | Add "how do i run containers", "managing containers" |
| **Internal jargon only** | Team-specific vocabulary, not user-facing | `DeploymentController, KubeletConfig` | Use publicly documented terms |
| **Triggers too broad** | Matches irrelevant conversations | `database` (matches every DB) | Be specific: `PostgreSQL`, `managed database` |
| **Triggers too narrow** | Misses natural phrasings | `DatabaseReplicationWithStreamingBinaryLogging` | Simplify to "replication", "backups" |
| **Abbreviations only** | Non-technical users don't know them | `RLS, RBAC, IAM` | Include spelled-out: "role-based access control" |
| **No business language** | Misses business/manager searches | `kubernetes, k8s, containerization, orchestration` | Add "scaling apps", "managing infrastructure" |
| **Missing conversational variants** | Loses discovery opportunities | `code-review, code_review, codereview` | Include `"how do i review code"`, `"pull request"` |
| **Confusing hyphenation** | Different hyphenation = no match | `"stop loss"` but user searches `"stop-loss"` | Include both variants if common |

---

## Choosing Related Skills

The `metadata.related-skills` field helps users discover complementary skills and prevents skill overlap.

### What Makes a Skill "Related"?

Two skills are related if using one naturally leads to needing the other:

**Strong Relationships (definitely related):**
- Layering: `trading-risk-stop-loss` ↔ `trading-risk-kill-switches` (emergency layer on top)
- Sequencing: `cncf-kubernetes` ↔ `cncf-helm` (install K8s, then manage charts)
- Complementary: `cncf-prometheus` ↔ `cncf-alertmanager` (metrics + alerts)
- Variants: `coding-code-review` ↔ `coding-security-review` (both review practices)

**Weak Relationships (avoid listing):**
- Tangential: `kubernetes` ↔ `docker` (overlapping, but separate skills)
- Too broad: `trading-risk-stop-loss` ↔ `trading-strategy-bollinger-bands` (unrelated strategies)
- Obvious: `kubernetes` ↔ `containers` (container orchestration is about containers)

### How Many Related Skills Should You List?

**Recommend: 2–4 related skills**

- **0–1**: Skill is very standalone (OK, but less discoverable)
- **2–4**: Goldilocks zone — users find complementary skills without overwhelming choice
- **5+**: Too many; dilutes focus and suggests poor boundary design

### Should Relationships Be Reciprocal?

**Yes, always.** If A lists B as related, B should list A.

Example:
```yaml
# trading-risk-stop-loss skill
metadata:
  related-skills: trading-risk-kill-switches, trading-risk-position-sizing

# trading-risk-kill-switches skill must include:
metadata:
  related-skills: trading-risk-stop-loss, ...
```

Without reciprocity, users miss the full skill network.

### Building a Skill Network

When designing a group of related skills, think about the **user journey**:

```
User starts with: "I need risk management"
      ↓
Loads: trading-risk-position-sizing (how much to trade?)
      ↓
Related skills show: trading-risk-stop-loss, trading-risk-kill-switches
      ↓
User loads: trading-risk-stop-loss (where to exit?)
      ↓
Related skills show: trading-risk-position-sizing, trading-risk-kill-switches
```

**Good Network Design:**
- Each skill is a stepping stone to the next
- No isolated skills (always 2+ connections)
- Hierarchical: foundational skills (positioning) → tactical skills (stops) → emergency skills (kill switches)

---

## Workflow to Add a Skill

1. **Create directory**: `skills/<name>/`

2. **Create SKILL.md**: Write YAML frontmatter + content

3. **Run reformat script**: `python3 reformat_skills.py`
   - This fills in any missing frontmatter fields from templates
   - Validates format compliance

4. **Update index**: `python3 generate_index.py`
   - This regenerates `skills-index.json` with the new skill
   - The skill-router reads this file for routing decisions
   - Without this step, the new skill won't be routable

5. **Commit and push**:
    ```bash
    git add -A
    git commit -m "feat: add <name> skill"
    git push
    ```

6. **Validate triggers for conversational discovery**:
    - Run: `python3 scripts/generate_readme.py` — verifies triggers appear in auto-generated index
    - Check: Do the triggers match how users would search for this skill?
    - Review: Are both technical AND conversational variants present?
    - Test: Would non-technical teammates use these words in conversation?

7. **Verify auto-discovery** (takes up to 1 hour by default):
     - The skill-router automatically fetches updated `skills-index.json` every `SKILL_SYNC_INTERVAL` seconds (default: 1 hour)
     - For immediate pickup: `curl -X POST http://localhost:3000/reload`

---

## Utility Scripts and Automation

This repository includes automation scripts to maintain the skill catalog and improve trigger quality. These scripts eliminate manual catalog maintenance and ensure consistency across all skills.

### 1. generate_readme.py

**Purpose:** Auto-generates the skills catalog in the README with zero manual effort.

**Location:** `scripts/generate_readme.py`

**What it does:**
- Reads all skill directories and extracts metadata (name, description, domain, role, triggers)
- Organizes skills into three auto-generated sections:
  - **Skills by Domain** — Table grouped by domain category (agent, cncf, coding, trading, programming)
  - **Skills by Role** — Table grouped by skill role (implementation, reference, orchestration, review)
  - **Complete Skills Index** — Alphabetical table of all 463+ skills with descriptions, domains, and roles
- Inserts content between `<!-- AUTO-GENERATED SKILLS INDEX START/END -->` markers
- Preserves all existing README content outside the markers
- Includes generation timestamp and skill count

**Usage:**
```bash
# Update README.md in-place
python3 scripts/generate_readme.py

# Generate custom output file
python3 scripts/generate_readme.py --output custom_skills.md

# Specify custom repository root
python3 scripts/generate_readme.py --repo-root /path/to/repo
```

**Features:**
- ✅ 696+ hyperlinks to all 239+ skills (clickable links to SKILL.md)
- ✅ Smart description truncation at word boundaries
- ✅ Organized tables by Domain, Role, and Alphabetical Index
- ✅ Automatic timestamp and skill count
- ✅ Zero LLM involvement needed for catalog updates

**When to use:**
- After adding new skills to the repository
- After modifying skill metadata (description, triggers, domain, role)
- Before committing changes to ensure README is up-to-date
- As part of CI/CD pipeline for automatic catalog maintenance

---

### 2. enhance_triggers.py

**Purpose:** Adds user-friendly, conversational triggers to skills for improved discoverability.

**Location:** `scripts/enhance_triggers.py`

**What it does:**
- Scans all 239+ skills in the repository
- Identifies skills that could benefit from additional conversational triggers
- Adds user-friendly variants like:
  - "how do I..." questions
  - "what is..." clarifications
  - Common colloquialisms and business language
  - Related technology names
  - Operational task language
- Maintains the 5-8 term trigger limit per skill
- Generates detailed report in `TRIGGER_ENHANCEMENTS.md`
- Preserves YAML formatting and existing content

**Usage:**
```bash
# Enhance all skills and generate report
python3 scripts/enhance_triggers.py
```

**Output:**
- Updates all SKILL.md files with improved triggers
- Generates `TRIGGER_ENHANCEMENTS.md` report showing:
  - All enhanced skills (before/after comparison)
  - Enhancement statistics by domain
  - Quality assurance metrics

**When to use:**
- After reviewing existing skill triggers for quality
- When skills need better user discovery
- After adding new skill categories
- To ensure triggers match both technical AND conversational language

**Example enhancements:**
```yaml
# Before
triggers: kubernetes, k8s, container orchestration, pod management

# After (with user-friendly variants added)
triggers: kubernetes, k8s, managing containers, deploying apps, how do i run containers
```

---

### 3. reformat_skills.py

**Purpose:** Validates and normalizes YAML frontmatter across all skills.

**Location:** `scripts/reformat_skills.py` (maintained by repository)

**What it does:**
- Validates YAML syntax in all skill frontmatter
- Normalizes formatting (indentation, field order)
- Fills in missing optional metadata fields from templates
- Reports errors and validation failures
- Ensures consistency across all skills

**Usage:**
```bash
python3 scripts/reformat_skills.py
```

**Error reporting:**
- Lists all skills with invalid YAML
- Identifies missing required fields
- Suggests corrections for common issues

---

### 4. generate_index.py

**Purpose:** Regenerates the skill-router index for skill discovery.

**Location:** `scripts/generate_index.py` (maintained by repository)

**What it does:**
- Reads all skill metadata from SKILL.md files
- Generates `skills-index.json` for skill-router consumption
- Enables auto-loading of skills based on triggers
- Updates skill statistics and categorization
- Indexes trigger keywords for fast matching

**Usage:**
```bash
python3 scripts/generate_index.py
```

**Output:**
- `skills-index.json` — Complete skill registry with metadata
- Statistics on skills per domain, role, and trigger
- Validation of all trigger keywords

---

## Recommended Workflow

When adding or modifying skills, follow this step-by-step process:

### 1. Create or Edit Skill

Create a new skill directory and SKILL.md file:
```bash
mkdir -p skills/<skill-name>/
# Edit skills/<skill-name>/SKILL.md
# Follow skill schema from this document
```

Ensure your SKILL.md includes:
- ✅ Proper YAML frontmatter with all required fields
- ✅ H1 title (human-readable)
- ✅ When to Use section
- ✅ When NOT to Use section
- ✅ Core content (Purpose, Patterns, etc.)
- ✅ 5-8 specific triggers (both technical and conversational)

### 2. Validate YAML

Run the reformatter to validate your frontmatter:
```bash
python3 scripts/reformat_skills.py
```

**Check output:** Are there any errors for your skill? Fix any YAML syntax issues before proceeding.

### 3. Enhance Triggers (Optional)

If you want to add more conversational triggers:
```bash
python3 scripts/enhance_triggers.py
```

Review the `TRIGGER_ENHANCEMENTS.md` report to see suggested triggers. Manually edit your skill's triggers if desired.

### 4. Regenerate Router Index

Update the skill-router index:
```bash
python3 scripts/generate_index.py
```

This makes your skill discoverable via skill-router triggers.

### 5. Update README Catalog

Regenerate the README with your new/modified skill:
```bash
python3 scripts/generate_readme.py
```

**Verify:** Check that your skill appears in the README with correct name, description, and hyperlink.

### 6. Commit and Push

Commit all changes:
```bash
git add -A
git commit -m "feat: add [skill-name] skill

- New skill directory: skills/[skill-name]/
- Description: [your description]
- Triggers: [list key triggers]
- Updated skill catalog and router index"
git push origin main
```

---

## Automation One-Liner

To run all scripts in sequence (recommended for new skills):

```bash
python3 scripts/reformat_skills.py && \
python3 scripts/enhance_triggers.py && \
python3 scripts/generate_index.py && \
python3 scripts/generate_readme.py && \
echo "✅ All automation complete!"
```

This ensures:
1. ✅ YAML is valid
2. ✅ Triggers are enhanced
3. ✅ Router index is updated
4. ✅ README catalog is refreshed

---

## CI/CD Integration

For automated skill maintenance, run these commands in your CI/CD pipeline:

```bash
#!/bin/bash
# Validate all skills
python3 scripts/reformat_skills.py || exit 1

# Update indices
python3 scripts/generate_index.py || exit 1

# Regenerate documentation
python3 scripts/generate_readme.py || exit 1

# Verify all skills are valid
git diff --exit-code || {
  echo "⚠ Skills need updates. Please run automation scripts."
  exit 1
}
```

---

## Troubleshooting

### SKILL.md not found
**Problem:** Script skips a skill because SKILL.md is missing.  
**Solution:** Ensure your skill directory contains a SKILL.md file in the root.

### YAML parsing error
**Problem:** `reformat_skills.py` reports invalid YAML.  
**Solution:** 
- Check for missing quotes around strings with colons
- Ensure proper indentation (2 spaces, no tabs)
- Validate YAML at https://www.yamllint.com/

### Triggers not updated
**Problem:** `enhance_triggers.py` doesn't modify your skill.  
**Solution:** Your triggers may already be comprehensive. Run the script to generate the report (`TRIGGER_ENHANCEMENTS.md`) to see what it recommends.

### README not updating
**Problem:** Your skill doesn't appear in the generated README.  
**Solution:** 
- Check that SKILL.md has valid YAML frontmatter
- Ensure `name` field is present and matches directory name
- Ensure `description` field is present
- Run `reformat_skills.py` first to fix any YAML issues

---

## Common Mistakes to Avoid

| Mistake | Problem | Fix |
|---|---|---|
| Directory name uses underscores | Skill may not be found | Use kebab-case: `trading-risk-stop-loss`, not `trading_risk_stop_loss` |
| `name` in frontmatter doesn't match directory | Validation fails | Make them exactly match (case-sensitive) |
| Missing `triggers` field | Skill never auto-loads | Add 3–8 specific keywords |
| Generic triggers (`code`, `data`, `risk`) | Fires on nearly everything | Use domain-specific phrases |
| Skipping `generate_index.py` | Skill not routable | Always run this after adding a skill |
| H1 title equals kebab-case name | Unreadable | Use human-readable title |
| Missing "When NOT to Use" section | Model applies skill inappropriately | Always include exclusion cases for complex skills |
| Code without typing | Ambiguous signatures | Add Python type hints and docstrings |
| Links to placeholder URLs | Broken references | Use real URLs or omit the link |

---

## Quality Checklist

Use this checklist when writing a new skill or auditing an existing one.

### Frontmatter

- [ ] `name` exactly matches the directory name (kebab-case)
- [ ] `description` clearly states what the skill makes the model do in one sentence
- [ ] `description` leads with an active verb and includes 1–2 domain-specific terms
- [ ] `license: MIT` is present
- [ ] `compatibility: opencode` is present
- [ ] `metadata.version` is present (format: `"1.0.0"`)
- [ ] `metadata.domain` matches the directory name prefix
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

### Triggers

- [ ] `metadata.triggers` includes both technical terms AND conversational variants
- [ ] `metadata.triggers` includes at least one "how do I..." variant (if skill solves a task)
- [ ] `metadata.triggers` includes at least one phrase non-technical users would actually say
- [ ] All 5-8 triggers are distinct and meaningful (no near-duplicates)
- [ ] Triggers follow domain-specific guidelines (see "Domain-Specific Trigger Guidelines" section)
- [ ] Triggers avoid ultra-generic terms that would match irrelevant conversations

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

## Related Documentation

- [SKILL_FORMAT_SPEC.md](./SKILL_FORMAT_SPEC.md) — Complete format specification with examples
- [README.md](./README.md) — Quick start and overview
- [agent-skill-routing-system/README.md](./agent-skill-routing-system/README.md) — Complete router documentation

---

## Examples

### Simple Skill Template

```markdown
---
name: trading-risk-stop-loss
description: Implements stop-loss strategies (fixed percentage, ATR-based, trailing, support/resistance, volatility-adjusted) to limit position losses in algorithmic trading systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: trading
  triggers: stop loss, trailing stop, ATR stop, stop placement, position protection, emergency stop, stop-loss
  role: implementation
  scope: implementation
  output-format: code
  related-skills: trading-risk-position-sizing, trading-risk-kill-switches
---

# Stop Loss Manager

Implements stop loss mechanisms to limit losses and protect capital.

## When to Use

- Implementing position risk controls for any long or short position
- Designing or reviewing a stop loss strategy for a new trading algorithm
- Choosing between stop types for a specific market condition

## Core Workflow

1. **Assess Market Regime** — Determine if market is trending, ranging, or high-volatility.
2. **Select Stop Type** — Choose the appropriate stop strategy for the regime.
3. **Calculate Stop Level** — Apply the selected formula.

## Implementation Patterns

### Pattern 1: ATR-Based Stop

```python
def atr_stop(current_price: float, atr: float, multiplier: float = 2.0) -> float:
    """Calculate ATR-based stop loss level."""
    return current_price - (atr * multiplier)
```

## Constraints

### MUST DO
- Layer an emergency stop on top of every other stop type
- Base trailing stop distance on ATR, not a fixed price

### MUST NOT DO
- Use stop type as the only risk control layer
- Disable or bypass stops "temporarily"
```

---

*This guide applies to all skills in the agent-skill-router repository. When in doubt, favor specificity over brevity — skills read by LLMs benefit from explicit, concrete guidance.*
