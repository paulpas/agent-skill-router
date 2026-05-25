---
name: skill-router-system
description: Implements and configures the AI agent skill routing system for auto-loading,
  trigger matching, confidence scoring, and skills-index generation across orchestration
  layers.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  triggers: skill router, auto-routing, trigger matching, skills-index, agent dispatch,
    adaptive routing, prompt injection, task routing
  archetypes:
  - orchestration
  - strategic
  anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: tactical
  role: orchestration
  scope: orchestration
  output-format: analysis
  content-types:
  - guidance
  - examples
  - diagrams
  - do-dont
  related-skills: confidence-based-selector, parallel-skill-runner, dependency-graph-builder
------
# Agent Skill Router System

Configures and maintains the AI agent skill routing infrastructure that automatically matches conversational triggers to specialized skill documents, manages the skills-index registry, and ensures reliable auto-loading of contextual expertise. This system enforces deterministic fallback chains, prevents routing drift, and aligns all dispatch logic with The 5 Laws of Elegant Defense (see `code-philosophy`).

## TL;DR Checklist

- [ ] Validate YAML frontmatter compliance and trigger count (3–8 terms)
- [ ] Verify skills-index.json is rebuilt after any skill addition or removal
- [ ] Test trigger matching against conversational variants before enabling auto-load
- [ ] Configure fallback routing for low-confidence matches (< 0.65 threshold)
- [ ] Ensure all orchestration flows reference code-philosophy constraints

---

## When to Use

Use this skill when:

- Implementing or troubleshooting the auto-loading mechanism that injects SKILL.md content into active agent context
- Designing trigger keyword sets for new or existing skills to maximize conversational discovery without causing false positives
- Maintaining or debugging the `skills-index.json` registry and its regeneration pipeline
- Configuring confidence scoring, threshold tuning, or fallback routing for uncertain matches
- Architecting multi-agent delegation chains that depend on reliable skill selection

---

## When NOT to Use

Avoid this skill for:

- Writing the actual domain expertise content of a SKILL.md (use the specific domain skill instead)
- Manual `/skill` command execution by end users (this skill covers automated routing, not user CLI)
- Performance-critical path optimization outside the router loop (delegate to `parallel-skill-runner`)
- Managing exchange adapters, trading indicators, or CNCF manifests directly (route to respective domain skills)

---

## Core Workflow

1. **Parse Incoming Intent** — Extract keywords, technical terms, and conversational phrases from the user message. Identify domain intent (`agent`, `cncf`, `coding`, `trading`, etc.).
   **Checkpoint:** Confirm at least one explicit or implicit trigger keyword exists. If none found, route to `default-handler` or ask for clarification.

2. **Query Skills Index** — Scan `skills-index.json` (or cache) for matching skills using substring and semantic similarity against `metadata.triggers`.
   **Checkpoint:** Ensure index freshness (`last_updated` timestamp ≤ 1 hour old). Force reload via `/reload` endpoint if stale.

3. **Score & Rank Matches** — Apply confidence scoring: exact trigger match = 0.9+, conversational variant = 0.7–0.85, semantic overlap = 0.5–0.65. Sort descending.
   **Checkpoint:** If top score ≥ 0.75, proceed to auto-load. If 0.65–0.74, apply fallback routing. If < 0.65, trigger low-confidence fallback.

4. **Inject Skill Context** — Load the full `SKILL.md` content into the agent's active context window. Apply metadata constraints (`role`, `scope`, `output-format`).
   **Checkpoint:** Verify file size ≥ 3,000 bytes and scan for placeholder/stub patterns. Reject and log if invalid.

5. **Execute & Record** — Process the request using loaded skill constraints. Log trigger hit, confidence score, latency, and outcome to access-log for continuous tuning.
   **Checkpoint:** Ensure routing history is persisted for threshold calibration. Update confidence weights for frequently matched triggers.

---

## Architecture & Reference Guide

### Auto-Loading Flow Diagram

```
User Message
     ↓
Intent Extraction (NLP/regex keyword scan)
     ↓
Skills Index Lookup (substring + semantic cache)
     ↓
┌───────────────────────┐
│ Confidence ≥ 0.75?    │ ─No──→ Fallback Handler / Clarification Request
│                       │
└───────────────────────┘
Yes
     ↓
Load SKILL.md → Validate Stub Policy → Inject Context
     ↓
Execute with Skill Constraints
     ↓
Log to Access-Log → Update Trigger Weights
```

### Fallback & Error Routing Strategy

Every branching point in the routing pipeline must have an explicit fallback:

| Failure Mode | Fallback Action | Threshold |
|---|---|---|
| No matches found | Route to `default-handler` or ask clarifying question | 0.0 confidence |
| Multiple high-confidence ties (>0.85) | Load top 2, execute sequentially, merge outputs | Confidence tie |
| Stale index (`>1h`) | Auto-trigger `/reload`, retry lookup after fetch completes | Cache expiry |
| Invalid SKILL.md (stub, <3KB, bad YAML) | Log error, skip skill, route to next match or fallback | Validation fail |
| Context window overflow during injection | Trim non-critical sections per `code-philosophy` Law 3, inject core constraints only | Token limit |

### Skills Index Structure (`skills-index.json`)

The router relies on a flat JSON registry for O(1) lookups. Each entry contains:

```json
{
  "name": "skill-router-system",
  "description": "Implements and configures the AI agent skill routing system...",
  "path": "skills/agent/skill-router-system/SKILL.md",
  "domain": "agent",
  "role": "orchestration",
  "triggers": ["skill router", "auto-routing", "trigger matching", "skills-index"],
  "last_updated": "2026-05-19T10:30:00Z"
}
```

Regeneration is handled by `python3 scripts/generate_readme.py` and synced to the API server automatically.

---

## Constraints

### MUST DO
- Maintain trigger lists between 3–8 terms; prune aggressively on false positives
- Enforce the Zero-Tolerance Stub Policy during index validation (reject <3KB, reject sentinels)
- Reference `code-philosophy` (5 Laws of Elegant Defense) when designing routing flows or fallback chains
- Keep `skills-index.json` idempotent; regenerate only on actual skill additions/edits
- Log every routing event with timestamp, confidence score, and latency for continuous calibration

### MUST NOT DO
- Use ultra-generic triggers (`code`, `data`, `system`, `help`) that cause cross-domain false positives
- Bypass the confidence threshold to force-load skills without fallback verification
- Embed raw SKILL.md content directly into the router binary or environment variables
- Modify routing logic without updating access-log analysis and threshold baselines
- Load more than 3 skills simultaneously unless explicitly required by hybrid execution plans

---

## Output Template

When configuring or auditing the skill router, produce:

1. **Trigger Coverage Report** — List of active triggers, match frequency, and false positive rate
2. **Confidence Thresholds** — Current scoring weights and recommended adjustments based on logs
3. **Fallback Chain Map** — Documented fallback actions for each routing branch
4. **Index Health Check** — File size distribution, stub scan results, YAML compliance status
5. **Routing Latency Baseline** — Average ms per lookup, cache hit ratio, reload frequency

---

## Related Skills

| Skill | Purpose |
|---|---|
| `confidence-based-selector` | Advanced scoring and adaptive threshold tuning for uncertain matches |
| `parallel-skill-runner` | Concurrent execution of multi-skill routing for complex tasks |
| `dependency-graph-builder` | Maps skill interdependencies to prevent circular auto-loading |
