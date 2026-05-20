---
name: skill-trigger-engineering
description: Designs and calibrates trigger keywords for OpenCode skill auto-loading using two-tier strategy combining technical precision with conversational language to maximize skill discoverability while minimizing false positives.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  triggers: skill triggers, trigger engineering, auto-loading, skill discovery, trigger calibration, keyword matching, how do i design triggers, conversational discovery, two-tier trigger strategy, trigger testing
  role: orchestration
  scope: orchestration
  output-format: analysis
  content-types: [guidance, examples, do-dont]
  related-skills: coding-skill-development-workflow, agent-confidence-based-selector, agent-task-routing
---

# Skill Trigger Engineering

Designs and calibrates trigger keywords that drive skill auto-loading in OpenCode. Applies a two-tier strategy combining technical precision with conversational accessibility to maximize skill discoverability while minimizing false-positive activations across all conversation contexts.

## TL;DR Checklist

- [ ] Triggers include 5–8 specific terms (3 minimum, 8 maximum)
- [ ] Primary product/concept name is always included as first trigger
- [ ] At least one technical term AND at least one conversational phrase present
- [ ] No ultra-generic single-word triggers like `code`, `data`, `risk`, `pattern`
- [ ] Trigger phrases sound like natural conversation — could they appear in a Slack message?
- [ ] Triggers follow domain-specific guidelines for the target domain
- [ ] Both hyphenated and non-hyphenated variants included where relevant

---

## When to Use

Use this skill when:

- Creating metadata.triggers for a new SKILL.md file
- Revamping underperforming triggers that cause too many or too few activations
- Auditing existing skills for trigger quality against the two-tier strategy
- Building a skill network where reciprocity requires matching trigger vocabularies
- Designing cross-domain triggers for skills that bridge multiple domains

---

## When NOT to Use

Avoid this skill for:

- Writing the main content of SKILL.md — use `coding-skill-development-workflow` instead
- Configuring routing thresholds or confidence scores — use `agent-confidence-based-selector` instead
- Generating code examples — triggers are metadata, not implementation logic
- Testing skill content quality — run `validate_skill.sh` for structural checks

---

## Core Workflow

1. **Identify the User Search Spectrum** — Map who will search for this skill and how they phrase their need. List at least three user personas: expert practitioner (technical vocabulary), working engineer (task-oriented language), and non-technical stakeholder (business/conversational phrasing). For each persona, write down the exact words or phrases they would type into a search box to find help with this topic.
   **Checkpoint:** You must have at least 3 distinct phrasings per persona covering technical, task, and business language.

2. **Build the Technical Tier** — Populate triggers with exact domain terminology used in official documentation, API references, and product names. Include standard abbreviations that practitioners commonly use (e.g., `PromQL` for Prometheus queries, `ATR` for Average True Range). Include both hyphenated and non-hyphenated variants of compound terms when both appear in real usage.
   **Checkpoint:** Every technical trigger must match an actual term found in the domain's official documentation or widely used by practitioners.

3. **Build the Conversational Tier** — Add natural-language phrases that non-technical users, managers, or learners would use when asking for help. Include "how do I..." variants for task-solving skills, "what is..." for concept-explaining skills, and "help with..." for operational concerns. These are your primary discovery hooks outside the expert audience.
   **Checkpoint:** Read each conversational trigger aloud — if it sounds like something you'd hear in a Slack message or standup meeting, keep it.

4. **Apply Domain-Specific Trigger Patterns** — Use the domain-specific templates from the Reference Guide below to add market context, risk language, operational tasks, or deployment patterns as appropriate for your skill's domain. Each domain has characteristic search vocabularies that differ significantly.
   **Checkpoint:** Verify all triggers match your domain's specific patterns before proceeding.

5. **Calibrate Trigger Count and Diversity** — Select the final 5–8 triggers by prioritizing: (1) Primary product/concept name, (2) Most common abbreviation if one exists, (3) 1–2 conversational variants matching typical user questions, (4) 1 "how do I..." variant for task skills, (5) 1 related operational task or adjacent concern. Remove any triggers that fail the precision test — if someone could search for that word but NOT need your skill, exclude it.
   **Checkpoint:** Exactly 5–8 distinct triggers remaining. No near-duplicates. Each trigger passes the "would they always need this skill?" question.

6. **Run Trigger Testing Matrix** — Validate triggers against four test categories: (a) Readability — do they sound like real user queries? (b) Coverage — do non-technical teammates recognize these words? (c) Precision — would every search for each trigger actually need this skill? (d) Diversity — is there at least one technical term, one conversational phrase, and one task-oriented term?
   **Checkpoint:** Pass all four tests before finalizing. Revise any failing triggers.

7. **Apply 5 Laws of Elegant Defense** — When designing the broader skill routing system that uses these triggers, guide data naturally through the trigger matching pipeline (Law 2: Parse at boundaries). Validate each trigger against the full skill index to ensure no dangerous overlaps (Law 4: Fail fast on ambiguous matches). Never let a false-positive trigger activation override explicit user intent (Law 5: Don't hide failures — log unexpected activations for analysis).
   **Checkpoint:** Review how trigger interactions affect the overall routing confidence scores and fallback chains.

---

## Trigger Design Reference Guide

### Two-Tier Strategy Framework

Every effective trigger set blends two complementary tiers of search language:

**Tier 1: Technical Terms (Expert Precision)**
- Exact product names from documentation: `kubernetes`, `PostgreSQL`, `PromQL`
- Standard abbreviations: `k8s`, `postgres`, `ATR`, `VWAP`
- Official API/endpoint names: `ServiceMonitor`, `ExecStartPre`
- Domain-standard terminology: `goroutine`, `context propagation`, `sentinel errors`

**Tier 2: Conversational Variants (Broad Discovery)**
- Natural questions: `how do i store data`, `how do i limit losses`
- Business language: `managed database`, `capital protection`, `cost savings`
- Operational tasks: `deploying apps`, `scaling infrastructure`, `monitoring systems`
- Problem descriptions: `high cpu usage`, `connection pool exhausted`

### Domain-Specific Trigger Patterns

#### Agent Skills (`agent/*`) — Orchestration & Routing Focus

| Pattern | Examples | Purpose |
|---------|----------|---------|
| Core concept | `task routing`, `skill selection`, `agent dispatch` | Primary skill identity |
| Decision language | `choose skill`, `route task`, `delegate work` | How users describe the action |
| Multi-step concepts | `workflow automation`, `pipeline orchestration`, `agent coordination` | Complex scenario searches |
| Operational phrasing | `how do i automate this`, `parallel execution`, `fallback handling` | Practical use cases |

```yaml
# Good trigger set for a task routing skill:
triggers: task routing, agent selection, orchestration, how do i automate tasks, workflow automation, agent dispatch, parallel delegation
```

#### CNCF Skills (`cncf/*`) — Infrastructure & Operations Focus

| Pattern | Examples | Purpose |
|---------|----------|---------|
| Product + category | `kubernetes, container orchestration` | Both exact and categorical searches |
| Operational tasks | `deploying`, `scaling`, `monitoring`, `logging` | Users think in tasks first |
| Deployment patterns | `managed`, `self-hosted`, `containerized`, `serverless` | Different deployment models |
| Adjacent tech bridge | `docker` (→ k8s skill), `grafana` (→ prometheus) | Cross-product discovery |

```yaml
# Good trigger set for a container management skill:
triggers: container orchestration, managing containers, deploying applications, scaling apps, kubernetes, k8s, docker integration
```

#### Trading Skills (`trading/*`) — Financial & Quantitative Focus

| Pattern | Examples | Purpose |
|---------|----------|---------|
| Technical terms | `stop loss`, `ATR`, `VWAP`, `trailing stop` | Practitioner vocabulary |
| Financial concepts | `capital protection`, `risk management`, `position control` | Business language |
| Market context | `crypto`, `forex`, `stocks`, `futures`, `options` | Market-specific searches |
| Risk/compliance | `drawdown control`, `loss prevention`, `risk limits` | Regulatory and risk manager vocabulary |

```yaml
# Good trigger set for a position sizing skill:
triggers: position sizing, portfolio allocation, risk management, how much should i trade, kelly criterion, capital protection, money management
```

#### Coding Skills (`coding/*`) — Implementation & Learning Focus

| Pattern | Examples | Purpose |
|---------|----------|---------|
| Design patterns | `code review`, `refactoring`, `testing` | Standard engineering terms |
| Learning variants | `learn how to`, `tutorial`, `best practices` | Junior engineer searches |
| Use cases | `unit test`, `mocking`, `vulnerability scanning` | Context-specific searches |
| Quality concerns | `performance optimization`, `debugging`, `security audit` | Non-functional focus |

```yaml
# Good trigger set for a testing skill:
triggers: unit testing, test automation, how do i test code, mocking, test coverage, tdd, continuous integration
```

### Trigger Calibration Heuristics

For each candidate trigger, apply these four questions in order:

1. **Plausibility Test:** "If someone says this exact word or phrase, would they plausibly need this skill?" → Include if YES, exclude if NO.

2. **Context Overlap Test:** "Is this word also heavily used in completely unrelated contexts?" → Exclude or be more specific if YES. Example: `deployment` appears in CI/CD, Kubernetes, and software releases — too ambiguous alone. Use `Kubernetes deployment` instead.

3. **Shorthand Recognition Test:** "Is this a well-known abbreviation or shorthand for the topic?" → Include if practitioners use it regularly in conversation. Example: `k8s` is universally understood as kubernetes shorthand.

4. **Internal Jargon Filter:** "Is this term used primarily internally (class name, function name, internal config key)?" → Exclude. Triggers should match publicly documented terms that users reference in searches.

### Trigger Count Strategy

You have 5–8 trigger slots. Prioritize ruthlessly:

**Non-negotiable (include these always):**
1. Primary product/concept name — the main hook everyone will search for
2. Most common abbreviation — power users type this

**Should include (pick based on domain context):**
3. 1–2 conversational variants matching your domain's typical user questions
4. 1 "how do I..." variant for task-solving skills
5. 1 operational task or adjacent concern relevant to the domain

**Optional (fill remaining slots if any):**
6. Common misspelling variant (only include high-frequency ones)
7. Business value phrase (only if it's a primary driver of usage)
8. One adjacent technology name (only if users frequently search for both)

### Worked Example: Building Triggers for a Python Error Handling Skill

**Raw candidates (12 terms — too many):**
```
error handling, exceptions, try except, error wrapping, sentinel errors, 
traceback analysis, how do i handle errors in python, custom exceptions, 
error propagation, debugging errors, log errors, best practices for errors
```

**Apply calibration heuristics:**
- "best practices for errors" → Exclude (fails precision test — could match any coding skill)
- "log errors" → Keep (adjacent operational concern, specific enough)
- All others → Keep (pass all 4 tests)

**Final selection (7 triggers):**
```yaml
triggers: error handling, try except, error wrapping, sentinel errors, how do i handle errors in python, custom exceptions, log errors
```

This captures technical terms (`error wrapping`, `sentinel errors`), conversational variant (`how do i handle errors in python`), and adjacent concern (`log errors`).

---

## Trigger Testing Matrix

Run all four tests before committing any new trigger set:

### Readability Test
Read each trigger aloud as a search query. Does it sound like something you'd type into Google or ask in Slack? Reject triggers that sound like internal documentation headings or class names.

**Good:** "how do i manage goroutines" → You'd say this when stuck on concurrency
**Bad:** "GoroutinePoolConfigurationParameters" → This is a config key, not a search term

### Coverage Test
Verify your trigger set reaches all three user personas:
- **Expert:** Would they find it via technical terms? (e.g., `PromQL`, `ServiceMonitor`)
- **Practitioner:** Would task-oriented searches match? (e.g., `metrics monitoring`, `deploying apps`)
- **Non-technical:** Would business language trigger the skill? (e.g., `how do i monitor systems`, `cost savings`)

If any persona has zero matching triggers, add a conversational variant for that perspective.

### Precision Test
For each individual trigger, ask: "If someone searched ONLY this term, would they always need this specific skill?" If the answer is "no" for 2 or more triggers, revise them to be more specific. Example: `testing` matches unit tests, integration tests, load tests, and smoke tests — too broad. Replace with `unit testing` or `test automation`.

### Diversity Test
Verify your trigger set contains at least one term from each category:
- ✅ At least 1 technical term (exact domain terminology)
- ✅ At least 1 conversational phrase (natural language question/statement)
- ✅ At least 1 task-oriented term (action verb + noun combination)
- ❌ NOT all technical OR NOT all conversational

---

## Constraints

### MUST DO
- Include exactly 5–8 triggers per skill (fewer is too narrow, more causes false positives)
- Always include the primary product/concept name as a trigger
- Blend technical terms with conversational variants in every trigger set
- Include at least one "how do I..." variant for task-solving skills
- Test triggers against all four categories: readability, coverage, precision, diversity
- Reference `code-philosophy` (5 Laws of Elegant Defense) when designing fallback routing

### MUST NOT DO
- Use ultra-generic single-word triggers like `code`, `data`, `risk`, `pattern`, `testing`, `security` alone
- Include triggers that only match internal class names, function names, or config keys
- Create more than 8 triggers — this dilutes signal quality and increases false activations
- Rely exclusively on technical jargon — you will miss non-technical users who need the skill most
- Use near-duplicate triggers (e.g., both `code review` and `peer code review` are too similar)

---

## Output Template

When designing or auditing triggers for a skill, produce:

1. **Persona Map** — List of 3+ user personas with their characteristic search phrasing
2. **Two-Tier Breakdown** — Which triggers belong to Technical Tier vs Conversational Tier
3. **Domain Pattern Verification** — Confirmation that all domain-specific patterns are applied
4. **Calibration Results** — Four-heuristic evaluation for each candidate trigger with pass/fail
5. **Testing Matrix Output** — Readability, Coverage, Precision, and Diversity test results
6. **Final Trigger Set** — The comma-separated trigger string ready for frontmatter

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-skill-development-workflow` | Full skill creation workflow that includes this trigger design as a sub-step |
| `agent-confidence-based-selector` | Uses trigger match scores to select and prioritize skills in routing decisions |
| `agent-task-routing` | Routes tasks between agents based on trigger match quality and confidence thresholds |
