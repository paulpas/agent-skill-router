---
name: atomic-skills-spec
description: Defines criteria, thresholds, and migration patterns for splitting monolithic skills into focused atomic skills — including split heuristics, trigger engineering for new sub-skills, and gradual migration strategy.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: atomic skills, skill granularity, monolithic skill, skill splitting, refactoring skills, trigger calibration, skill architecture
  archetypes:
    - strategic
    - orchestration
  anti_triggers:
    - immediate restructure
    - breaking change
    - delete existing
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: tactical
  role: reference
  scope: orchestration
  output-format: analysis
---

# Atomic Skills Specification

Defines the rules for when and how to split monolithic skills into focused atomic ones. This is a governance skill — it doesn't generate code or implement patterns, it governs how the skill ecosystem evolves.

## TL;DR Checklist

- [ ] A single skill covering 5+ distinct patterns/concepts → candidate for split
- [ ] Description uses "Implements X, Y, Z" listing distinct topics → strong signal to split
- [ ] Each new sub-skill must be independently useful — not a fragment that requires the parent
- [ ] Existing skills stay intact during gradual migration — no breaking changes
- [ ] Trigger count stays 3-8 terms per the standard skill spec
- [ ] Reciprocal related-skills links maintained across all resulting skills

---

## When to Use

Use this skill when:

- Reviewing a new or existing skill and determining its appropriate granularity
- A monolithic skill has been identified (see "Identifying Monoliths" below)
- Designing a group of related sub-skills from an existing broad skill
- Evaluating whether a proposed skill split creates independently useful boundaries
- Adding triggers to a new sub-skill and calibrating them for auto-discovery

## When NOT to Use

Avoid splitting when:

- All patterns in the skill are tightly coupled and form a single coherent workflow (e.g., a complete trading strategy with entry, exit, position sizing, and risk management as one unit)
- The skill is already under 15KB of content
- Splitting would create skills smaller than 3,000 bytes (zero-tolerance stub threshold)
- The parent skill serves as a useful catalog/overview that points to deeper sub-skills

---

## Identifying Monoliths — Detection Heuristics

A skill is a monolith when ANY of these conditions are met:

### Primary Signals (strong indicators)

1. **"Implements X, Y, Z" description** — The frontmatter description lists 5+ distinct patterns, concepts, or features separated by commas or parentheses. This directly signals multiple topics masquerading as one skill.
   - Example: `description: Implements production reliability patterns (circuit breakers, retry with exponential backoff, bulkhead isolation, health checks, graceful degradation, distributed tracing)` → 6 distinct patterns
   - Example: `description: Comprehensive catalog of all 23 GoF design patterns... covering creational, structural, and behavioral` → 23 patterns in one skill

2. **5+ independent "Pattern N:" or section headings** — The Core Content covers 5+ clearly separable topics that each have their own implementation code and explanation.

3. **"Implements X, Y, Z" + 15KB+** — A broad description combined with large file size (over 15KB) means the monolith is storing significant duplicated content.

### Secondary Signals

4. **Related-skills already exists for sub-topics** — If `related-skills` lists skills that cover individual topics from this skill, the parent is likely over-scoped.

5. **Multiple archetypes declared** — A skill declaring both `tactical` and `educational` and `orchestration` may be doing too many different things for one audience.

6. **Trigger overlap with sub-skills** — If triggers include specific pattern names that could each justify their own skill (e.g., "factory method", "strategy pattern", "decorator pattern" all in one trigger list).

### Monolith Severity Matrix

| Condition | Severity | Action |
|-----------|----------|--------|
| 3-4 patterns, under 15KB | LOW | Monitor — note as candidate but don't rush split |
| 5+ patterns OR "Implements X, Y, Z" + 20KB+ | HIGH | Plan split in next cycle |
| 10+ patterns (e.g., full GoF catalog) | CRITICAL | Split immediately — this is the highest-priority category |
| Template-generated trading skill with generic triggers | HIGH | Fix triggers during split |

---

## Split Criteria — Rules for Creating Sub-Skills

### Rule 1: Each sub-skill must be independently useful

A split is valid only if each resulting skill can stand alone. If a user loads the sub-skill, they should get complete, actionable guidance without needing to also load another skill.

**Valid:** `coding-circuit-breaker` covers circuit breakers end-to-end — concept, implementation, configuration, pitfalls.
**Invalid:** `coding-breaker-states` only covers CLOSED/OPEN/HALF_OPEN states — requires `coding-circuit-breaker` context.

### Rule 2: Boundaries follow change frequency, not just topic similarity

Patterns that change for different reasons belong in different skills. If one pattern evolves independently of another, they should be separate.

**Example:** Circuit breakers (change when failure thresholds shift) vs bulkhead isolation (change when thread pool sizes shift) have independent evolution cycles → split.
**Counter-example:** Health checks and graceful degradation always change together during deployment strategy shifts → can stay together.

### Rule 3: Keep trigger count to 3-8 terms per sub-skill

After splitting, each new skill gets its own carefully calibrated trigger set of 3-8 terms (technical + conversational variants). Don't inherit all parent triggers.

**Example:** `gof-design-patterns-catalog` has 14 triggers. After split:
- `coding-creational-patterns`: `factory method, abstract factory, builder, prototype, singleton, how do i create objects, object creation` (7 terms)
- `coding-structural-patterns`: `adapter, bridge, composite, decorator, facade, proxy, flyweight, structural patterns` (8 terms)
- `coding-behavioral-patterns`: `observer, strategy, state, command, mediator, chain of responsibility, behavioral patterns` (7 terms)

### Rule 4: Related-skills must be reciprocal

If A lists B as related, B must list A. After a split:
- Each child skill lists all siblings as related
- The parent (if kept as catalog) lists all children as related
- Existing external related-skills are preserved

### Rule 5: Preserve existing skills during gradual migration

**This is NOT a breaking change.** Existing monolithic skills remain in place. New atomic skills are added alongside them. Users benefit gradually:

1. Atomic skills are published first — router naturally routes to them for specific queries due to better trigger precision
2. Monolithic skills continue working as before
3. Documentation (AGENTS.md, skill catalog) is updated to recommend atomic skills for new work
4. Eventually (optional): monolithic skills can be deprecated or converted to overview/catalog entries

This avoids: forced refactoring, breaking existing workflows, losing content during migration, coordination overhead across teams.

---

## Split Patterns — Common Approaches

### Pattern A: Topic Decomposition (most common)

The monolith covers N distinct topics. Each topic becomes its own skill.

```
Before: coding/system-reliability-architecture (6 topics)
  circuit breakers, retry/backoff, bulkhead isolation, health checks, graceful degradation, distributed tracing

After: 5 skills
  coding/circuit-breaker          — circuit breakers only
  coding/retry-strategies         — exponential backoff + jitter
  coding/bulkhead-isolation       — thread pool isolation
  coding/health-checks-degradation — health checks + graceful degradation (closely coupled)
  coding/observability-foundation — metrics, logging, OpenTelemetry tracing
```

### Pattern B: Category Split

The monolith covers patterns from multiple categories. Each category becomes its own skill.

```
Before: coding/gof-design-patterns-catalog (23 patterns across 3 families)
After: 3 skills
  coding/creational-patterns      — Factory Method, Abstract Factory, Builder, Prototype, Singleton
  coding/structural-patterns      — Adapter, Bridge, Composite, Decorator, Facade, Proxy, Flyweight
  coding/behavioral-patterns       — Observer, State, Strategy, Command, Template Method, Mediator, Chain of Responsibility, Iterator, Visitor, Memento, Interpreter
```

### Pattern C: Depth Layering

The monolith covers both "how to" implementation AND "why" architecture/design principles. Split into tactical and strategic layers.

```
Before: coding/security-engineering (5 domains, each with theory + implementation)
After: 
  coding/threat-modeling          — STRIDE/DREAD methodology, attack surface analysis (reference)
  coding/owasp-prevention         — OWASP Top 10 secure coding patterns (implementation)
  coding/security-pipeline        — SAST/DAST/secret scanning CI integration (implementation)
  coding/architectural-security   — zero-trust, least-privilege networking (strategic)
```

### Pattern D: Domain Narrowing

The monolith covers a pattern applied across many contexts. Split by primary context.

```
Before: trading/risk-kill-switches (4 layers: account, strategy, market, infrastructure)
After: 4 skills
  trading/account-kill-switch     — account-level drawdown limits
  trading/strategy-kill-switch    — per-strategy circuit breakers
  trading/market-kill-switch      — market-wide halt conditions
  trading/infra-kill-switch       — infrastructure health monitors
```

---

## Migration Guidance — How to Handle Existing Monoliths

### For New Skills (prevention)

When creating a new skill:

1. Write the description FIRST, then apply the "Implements X, Y, Z" test
2. If the description lists 5+ distinct patterns, STOP — split before writing content
3. Keep the initial scope tight: one core concept, one workflow, 2-3 code examples
4. Add related-skills for adjacent concepts that could become sub-skills later

### For Existing Skills (gradual migration)

When you identify a monolith:

1. **Create the atomic skills first** — write complete SKILL.md files for each sub-skill
2. **Update related-skills on the parent** — point to the new atomic skills
3. **Add triggers to atomic skills** — carefully calibrated, domain-specific terms
4. **Update AGENTS.md section references if needed** — document that atomic skills are preferred
5. **Let the router do the work** — specific queries will naturally route to atomic skills due to better trigger precision

### For Monolith Content During Migration

When creating an atomic skill from a monolith:

1. **Extract the relevant section** from the monolith as starting material
2. **Expand it** — the monolith's coverage of one topic is often abbreviated; the atomic skill should have complete depth (equivalent to what the monolith devotes to ALL topics combined)
3. **Create standalone examples** — don't reference "see also: Pattern 3 in parent"
4. **Write independent triggers** — derive from the specific domain terms of this sub-skill

---

## Trigger Engineering for Sub-Skills

When splitting a monolith, each new skill gets a fresh trigger set of 3-8 terms. Derive these by:

1. **Extract technical terms** used in the sub-skill's content (pattern names, algorithms, tools)
2. **Add conversational variants** — "how do I [do X]" where X is the sub-skill's core capability
3. **Include 1 adjacent term** that practitioners naturally search alongside this topic

**Example: Splitting `coding/system-reliability-architecture`**

Original triggers (broad, 8 terms): `system reliability, circuit breaker, bulkhead isolation, distributed tracing, chaos engineering, fault tolerance, how do i make my system resilient, graceful degradation`

For `coding/circuit-breaker`:
```yaml
triggers: circuit breaker, three-state breaker, failure threshold, half-open state, cascade prevention, how do i prevent cascading failures, resilience pattern
```

For `coding/retry-strategies`:
```yaml
triggers: retry strategy, exponential backoff, jitter, retry storm prevention, transient error handling, how do i retry failed requests, backoff calculator
```

Notice: each set is 7 terms, technically precise, includes a "how do I" variant, and doesn't overlap with sibling trigger sets.

---

## Quality Checklist for Split Skills

When validating a split skill, check:

### Anti-Stub (REQUIRED)
- [ ] File is ≥ 3,000 bytes of content
- [ ] Contains at least 2 real code blocks with actual implementations
- [ ] Core Workflow has domain-specific steps (not generic "identify → apply → validate")
- [ ] `metadata.triggers` has 5-8 meaningful terms

### Scope Verification
- [ ] Covers exactly ONE coherent topic or category (not multiple unrelated patterns)
- [ ] Is independently useful — a user loading this skill alone gets complete guidance
- [ ] Description passes the "Implements X, Y, Z" test (lists at most 3 related aspects of the same concept)
- [ ] Size is proportional to scope (15-40KB for implementation skills covering one pattern family)

### Relationship Integrity
- [ ] Related-skills lists all sibling skills from the split
- [ ] Parent skill (if kept) lists this as a child
- [ ] Reciprocal links verified with all related skills

---

## Prioritized Split Queue

The following monoliths are identified as highest-priority split candidates, based on pattern count, file size, and description signals:

### CRITICAL Priority (>10 patterns or massive overlap)

| Domain | Skill | Patterns | Proposed Split |
|--------|-------|----------|----------------|
| `coding` | `gof-design-patterns-catalog` | 23 GoF patterns | → 3 skills (creational, structural, behavioral) |

### HIGH Priority (5+ patterns, "Implements X, Y, Z" description)

| Domain | Skill | Patterns | Proposed Split |
|--------|-------|----------|----------------|
| `coding` | `system-reliability-architecture` | 6 reliability patterns | → 5 skills (circuit breaker, retry, bulkhead, health checks+degradation, observability) |
| `coding` | `modern-architecture-patterns` | 6 architecture patterns | → 5-6 skills (hexagonal arch, BFF, feature flags, CQRS/event sourcing, sidecar) |
| `coding` | `security-engineering` | 5 security domains | → 4 skills (threat modeling, OWASP prevention, supply chain security, pipeline integration) |
| `trading` | `risk-kill-switches` | 4 kill switch layers | → 4 skills (account, strategy, market, infrastructure) |
| `trading` | `execution-slippage-modeling` | 5 slippage models | → 4 skills (estimation, simulation paths, fee modeling, partial fills) |

### MODERATE Priority (3-4 patterns or template-generated broad scope)

| Domain | Skill | Patterns | Proposed Action |
|--------|-------|----------|-----------------|
| `coding` | `design-systems-atomic` | 5 topics | → 4 skills (atomic design, tokens, Storybook, accessibility) |
| `trading` | `backtest-lookahead-bias` | 5 bias tests | → 4 skills (causality validation, delay detection, walk-forward, survivorship bias) |
| `coding` | `data-deduplication` | 5 dedup layers | → 3-4 skills (schema dedup, ETL dedup, API dedup) |
| `trading` | `paper-realistic-simulation` | 5 sub-models | Review + fix triggers during potential split |

---

## Output Template

When reviewing a skill for atomic compliance, produce:

1. **Monolith Assessment** — Score the skill on the severity matrix (LOW/MEDIUM/HIGH/CRITICAL) with justification referencing specific detection heuristics.
2. **Proposed Split** — If splitting is recommended, list the sub-skills with their proposed scope boundaries and trigger sets.
3. **Migration Path** — Step-by-step migration plan following the gradual migration strategy (atomic skills first, parent preserved).
4. **Related-Skill Matrix** — Table showing all reciprocal relationships between the resulting skills.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-code-review` | Reviews individual skills for quality, stub detection, and trigger calibration |
| `trading-risk-stop-loss` | Example of a well-scoped atomic skill (single pattern family) |
| `coding-security-engineering` | Current monolith candidate for splitting (see Prioritized Split Queue) |
