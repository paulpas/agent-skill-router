---
name: personal-workflow-framework
description: Designs personalized development workflows by mapping task types to optimized
  process patterns, enabling developers to choose structured approaches that match
  project complexity and team size.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: agent
  triggers: personal workflow, developer workflow, structured approach, task methodology,
    how do i organize my work, development process, workflow customization, project
    methodology
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
  - do-dont
  related-skills: workflow-patterns, planning-with-files, closed-loop-delivery
---
# Personal Workflow Framework

Designs personalized development workflows by matching task types to optimized process patterns. Your workflow is not one-size-fits-all — it should adapt based on project complexity, team size, timeline pressure, and the specific nature of the work at hand. This skill helps you define, evaluate, and refine your own approach to software development.

## TL;DR Checklist

- [ ] Classify incoming task by complexity: trivial (single file), moderate (multi-file), or complex (architecture-level)
- [ ] Select workflow template from the three-tier framework based on classification
- [ ] Define a concrete first step that produces immediate output before diving deeper
- [ ] Identify the riskiest unknown in the task and plan to resolve it early
- [ ] Set a natural checkpoint where you can verify direction before investing more effort

---

## When to Use

Use this skill when:

- Starting a new development task and need to choose an approach that matches its scope
- Feeling stuck or overwhelmed by a task — the framework helps decompose it into manageable steps
- Adapting your process for a different project type (e.g., switching from bugfix to feature work)
- Onboarding onto a new team and evaluating whether to adopt their workflow or adapt your own
- A previous workflow failed (missed requirements, rework loops) and you need a more structured approach

---

## When NOT to Use

Avoid applying the full framework when:

- The task is trivial (fixing a typo, updating a single config value) — just do it
- You are in active debugging mode — raw exploration is faster than structured planning
- A team has an explicitly mandated workflow that conflicts with this framework — follow team process
- The deadline is extremely tight (< 1 hour) and the task is well-understood — use emergency mode (see below)

---

## Core Workflow

Your personal workflow follows a four-phase cycle: **Classify → Select → Execute → Reflect**. This is not rigid — experienced developers compress or skip phases based on context. The framework exists to prevent mistakes, not to slow you down.

### Phase 1: Classify the Task

Before choosing any process, determine what kind of work you are doing. Use this classification matrix:

| Dimension | Trivial | Moderate | Complex |
|-----------|---------|----------|---------|
| **Files touched** | 1–2 files | 3–10 files | 10+ files or new modules |
| **Requires research** | No — you know the answer | Yes, but scoped to a few sources | Yes, spanning multiple systems |
| **Risk of breaking** | Low — easy to revert | Medium — may need tests | High — requires staging validation |
| **Estimates** | < 30 minutes | 1–4 hours | Half-day or more |

**Checkpoint:** If you cannot classify the task confidently, assume it is moderate and add a discovery step before committing to a workflow.

### Phase 2: Select Workflow Template

Based on classification, choose one of three templates:

#### A) Rapid Fire (Trivial Tasks)

For tasks where you already know the answer. Minimize ceremony:

```
1. State what you will change in one line
2. Make the change
3. Run relevant tests/lint
4. Commit with descriptive message
```

**Example:** "Adding a null check to user profile lookup" → Edit file → `npm test` → `git commit -m "fix: add null check for missing user profiles"`

#### B) Structured (Moderate Tasks)

For multi-file changes where planning adds value. Follow these steps:

```
1. Write a one-sentence goal statement (what does done look like?)
2. Sketch the files you will touch and their relationships
3. Identify the riskiest assumption — plan to verify it first
4. Implement in small, verifiable increments (commit after each)
5. Run full test suite before considering "done"
```

**Example:** "Adding a new API endpoint for user search" → List files (routes.py, service.py, tests/) → Verify search library is available → Implement route → Add tests → Full suite run.

#### C) Architectural (Complex Tasks)

For tasks that change system behavior or introduce new components:

```
1. Write a brief design note (markdown): goal, constraints, proposed approach, alternatives considered
2. Identify integration points with existing systems — list them explicitly
3. Create the minimum viable change first (a "spike" that proves feasibility)
4. Iterate from the spike to full implementation
5. Review against original constraints before committing
6. Add documentation for any new public interface or behavior
```

### Phase 3: Execute with Guardrails

Regardless of template, apply these guardrails during execution:

**The First-Step Rule:** Your first step must produce a tangible output. Never start by "thinking about it." Start by writing something — even if that something is a comment describing what you plan to do.

```python
# BAD: Starting by reading documentation for an hour
# GOOD: Write the function signature first, then fill in logic

def process_user_upload(file_path: str) -> UploadResult:
    """Process an uploaded file and return structured result.
    
    TODO: Validate file format (supported: csv, json, xml)
    TODO: Parse content into normalized structure
    TODO: Return UploadResult with status and extracted data
    """
    pass  # Write this first, then implement between the TODOs
```

**The Risk-First Rule:** Identify what could go wrong before writing code. In your implementation notes, explicitly list:

```markdown
## Risks to Address
1. What if the input file is malformed? → Validate format before parsing (see pattern 2)
2. What if the upload is very large? → Stream processing instead of loading into memory
3. What if the database is unavailable? → Queue uploads for async processing
```

**The Checkpoint Rule:** Set at least one checkpoint where you verify your direction matches the goal:

```bash
# Checkpoint example after implementing the first component
git diff --stat                    # Verify which files changed
npm test -- --testNamePattern="upload"  # Run targeted tests only
code review against original goal statement  # Did I build what I said I would?
```

### Phase 4: Reflect and Improve

After completing a task, spend 2 minutes reflecting. This builds your personal process library over time:

```markdown
## Task Reflection Template

**Task:** [One-line description]
**Workflow used:** [Rapid / Structured / Architectural]
**Time spent vs estimated:** [Actual / Estimated]
**What went well:** [1-2 items]
**What to do differently:** [1 item — actionable improvement for next time]
**New pattern discovered:** [Any reusable solution? Document it if yes.]
```

---

## Workflow Adaptation Patterns

Different situations call for different workflow flavors. Learn to recognize these and adapt:

### Pattern 1: Emergency Mode (Time-Crushed)

When deadline pressure eliminates luxury of process but not rigor:

```bash
# Emergency mode checklist (must still apply, just faster)
1. State the fix in one line — no design docs
2. Make the smallest possible change that solves it
3. Verify with targeted test only (not full suite)
4. Commit and push immediately
5. Add a FIXME comment explaining what should be done properly later
```

### Pattern 2: Deep Research Mode

When the task requires learning before building:

```bash
# Phase 1 — Discovery (no code yet, just information)
1. List every question you need answered before coding
2. Create a research document with findings for each question
3. Identify unanswered questions — escalate or make explicit assumptions
4. Only start implementing once all critical questions are answered

# Example research document:
# ## API Integration Research
# Q: Does the API support bulk operations? A: Yes, /api/v2/bulk accepts array payloads
# Q: What is the rate limit? A: 100 req/min per tier, documented in /docs/rate-limits
# Q: How are errors reported? A: HTTP 4xx with { "error": { "code", "message" } } format
# Unanswered: Pagination behavior for > 1000 items — need to test
```

### Pattern 3: Pair Programming Mode

When working with another developer, the workflow shifts to a collaborative pattern:

```bash
# Driver-Navigator Workflow
1. Agree on task goal in one sentence before touching keyboard
2. Driver writes code, Navigator reviews each line as it's written
3. Switch roles every 20-30 minutes to prevent fatigue
4. Navigator focuses on: architecture alignment, edge cases, readability
5. Driver focuses on: implementation correctness, syntax, immediate logic
6. At natural breakpoints, both verify against the goal statement
```

---

## Workflow Decision Tree

Use this decision tree when unsure which approach to take:

```
Start
  │
  ├─ Can you solve it without looking at code? ──No──► Research Mode (Pattern 2)
  │     (you know the API, the pattern, the answer)
  │    Yes
  │     │
  │     ├─ Will this touch ≤ 2 files? ──Yes──► Rapid Fire (Template A)
  │     │    No
  │     │     │
  │     │     ├─ Is the deadline < 1 hour? ──Yes──► Emergency Mode (Pattern 1)
  │     │     │    No
  │     │     │     │
  │     │     │     └─ Working with a partner? ──Yes──► Pair Mode (Pattern 3)
  │     │     │                No
  │     │     │                 │
  │     │     │                  ▼
  │     │     │            Structured (Template B)
  │     │     │
  │     │     └─ Will this change > 10 files or add new modules? ──Yes──► Architectural (Template C)
  │     │                                              No
  │     │                                               │
  │     │                                               ▼
  │     │                                        Structured (Template B)
  │     │
  │     └─ Working with a partner? ──Yes──► Pair Mode (Pattern 3)
  │                                            No
  │                                             │
  │                                             ▼
  │                                      Rapid Fire (Template A)
  │
  └─ Apply chosen template, then check at each phase boundary
```

---

## Constraints

### MUST DO
- Always write a goal statement before implementing — even in emergency mode, one line is sufficient
- Set at least one checkpoint for every moderate or complex task
- Classify every task before starting — rushing into the wrong workflow template wastes more time than spending 2 minutes classifying
- Record new patterns discovered during tasks in your pattern library (see `developer-pattern-library`)
- Reference the `code-philosophy` skill when implementing: guide data flow naturally, fail fast on invalid states, use guard clauses

### MUST NOT DO
- Apply architectural workflow to trivial tasks — it creates overhead that slows you down more than helps
- Skip the goal statement and start coding with vague understanding — this causes rework loops
- Follow a rigid template without adapting to project context — a startup sprint needs different process than enterprise release cycle
- Use workflow as an excuse for analysis paralysis — if your classification takes longer than 10 minutes, you are overthinking it
- Ignore reflection after complex tasks — each unexamined task is a missed learning opportunity

---

## Output Template

When this skill is active and invoked on a task, produce:

1. **Task Classification** — Trivial / Moderate / Complex with justification
2. **Selected Workflow** — Which template (A, B, or C) and why
3. **Risk Assessment** — The top 2 risks and mitigation plan
4. **First Step** — The concrete first action (not "plan" but the actual file to edit or command to run)
5. **Checkpoint Plan** — Where you will verify direction before proceeding further

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `planning-with-files` | Creates structured plan files for complex tasks, complementing this workflow framework |
| `closed-loop-delivery` | Ensures tasks are fully delivered with tests and documentation, the natural endpoint of any workflow |
| `workflow-patterns` | Generic orchestration patterns — this skill is the personalized variant tailored to individual needs |

> 📖 skill(local cache): code-philosophy

## Live References

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [DevOps Research and Assessment (DORA) Reports](https://www.puppet.com/resources/whitepaper/devops-research-and-assessment-report) — Empirical research on high-performing development workflows and team structures
- [Kanban Method: Principles for Evolutionary Change](https://kanbanchi.com/blog/kanban-method-principles-for-evolutionary-change/) — Framework for iterative workflow improvement in software development
- [Structured Thinking in Software Development (Martin Fowler)](https://martinfowler.com/articles/bottlenecks.html) — Patterns for managing workflow complexity and team bottlenecks
- [Agile Estimation Techniques (Planning Poker, T-Shirt Sizing)](https://www.atlassian.com/agile/project-management/planning-poker) — Practical techniques for sizing and prioritizing development tasks
- [Flow Metrics for Software Delivery (DORA)](https://cloud.google.com/blog/products/application-development/measuring-software-delivery-performance) — Key metrics for measuring and improving developer workflow efficiency
