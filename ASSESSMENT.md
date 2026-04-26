# MCP Skill Router Benchmark Assessment
**Date:** 2026-04-26  
**Model:** llamacpp/qwen3-coder-next-8_0  
**Benchmark:** medium tier (9 exercises), opencode_compare.py

---

## Executive Summary

The MCP skill router is **actively harming benchmark performance** relative to running without it:
- **-4.2 percentage points** correctness (55.8% vs 60.0%)
- **+23% latency** increase on average
- **1 timeout failure** (900s) that wouldn't occur without MCP
- **Only 1/8 exercises** showed improvement with MCP enabled

The root cause is a **systemic stub skill epidemic**: 80.5% (1,433/1,778) of indexed skills are auto-generated template stubs with zero actionable content. These stubs consume context tokens, confuse the model, and in the worst case (Architecture Decision exercise) caused a **+204% token explosion** (17k → 54k tokens).

---

## Finding 1: The Stub Skill Crisis

**Scale of the problem by domain:**

| Domain      | Total | Real | Stubs | Stub% |
|-------------|-------|------|-------|-------|
| `trading`   | 83    | 83   | 0     | 0%    |
| `cncf`      | 365   | 149  | 216   | 59%   |
| `swe`       | 318   | 80   | 238   | 74%   |
| `agent`     | 222   | 29   | 193   | 86%   |
| `programming` | 790 | 4    | 786   | 99%   |
| **TOTAL**   | **1,778** | **345** | **1,433** | **80.5%** |

Every stub contains this identical, useless boilerplate:
```
## Core Workflow
1. Identify the specific use case
2. Apply the pattern or technique
3. Validate and test the implementation
4. Iterate based on results

## Key Patterns
- Implementation and architecture guidance
- Best practices and standards compliance
```

The 9 benchmark exercises map to the `coding/*` domain in their `required_skills` — but that domain doesn't exist in the local repository. The router serves the closest-matching stub from `agent/`, `swe/`, or `programming/` domains instead.

---

## Finding 2: Skills Served vs Skills Needed

### Exercise: Quality + Branching → 900s TIMEOUT with MCP

| Skills Served            | Size     | Assessment                           |
|--------------------------|----------|--------------------------------------|
| `workflows-git-workflow` | 1,415 B  | **STUB** — scored 1.0 primary; empty |
| `branching-strategies`   | 12,113 B | ✅ Real content (git flow workflows)  |
| `quality-policies`       | 11,435 B | ✅ Real content (ESLint, pylint)      |
| `pre-push`               | 1,362 B  | **STUB** — generic boilerplate        |
| `checklist`              | 1,289 B  | **STUB** — generic boilerplate        |

**Problem**: The primary skill `workflows-git-workflow` (score: 1.0) is a stub, but it triggers the model to try interpreting empty guidance. The combined injection of 5 skills = ~30KB context on top of a "write code directly" prompt. The model spent 900s in confused loops.

### Exercise: Architecture Decision → 229,009ms, 54K tokens

The router injected an architecture skills bundle so large it generated **+36,453 input tokens** — a 204% increase. This turned a simple 73s exercise into a 229s marathon. The model generated 161-line solutions (vs 39 lines without MCP) that passed 1/3 tests (vs 0/3 without MCP — but still worse overall on other metrics).

### Exercise: CVE Scanning → WITH MCP LOST

- Router served `security-dependencies` (1,540B stub)
- Model generated 120 SLOC with cyclomatic complexity 32 using `subprocess.run(["safety", ...])` — a real CVE scanning approach, but one that can't run in the test harness
- Without MCP: 25 SLOC, simple logic, passed 1/3 tests
- The stub triggered the model to "go big" rather than "stay simple"

### Exercise: Git Rebase → WITH MCP LOST

- Router served `advanced` (10,060B — **real content**)
- The real content was loaded ALONGSIDE noise stubs
- The model generated a more complex solution (63 SLOC vs 48) that failed all 3 tests (vs 1/3 without MCP)
- **Even good skills hurt when paired with stub noise**

---

## Finding 3: Two Skills That DO Work

The `branching-strategies` (12,113B) and `quality-policies` (11,435B) skills have real, actionable content:
- Working Git Flow bash commands
- ESLint/pylintrc configuration examples
- Complexity limits, test coverage thresholds
- Concrete "When to Use / When NOT to Use" guidance

When these were served (Git Branching Strategy exercise), the router **tied** (66.7% correctness both ways). The skill content is correct for its domain but is injected regardless of whether it matches the actual coding task — the mismatch is between reference documentation and Python function generation.

---

## Finding 4: The Instruction Conflict Problem

The benchmark constructs prompts with:
```
IMPORTANT: Do not use any tools. Do not search files. 
Do not call route_to_skill. Just write the code directly.
```

But the MCP injects `skill-router-api.md` which says:
```
At the start of EVERY task, call the route_to_skill MCP tool...
```

This conflict causes the model to spend extra thinking tokens resolving the contradiction. The consistent **+960 token overhead** seen in every WITH-MCP run is exactly the `skill-router-api.md` content (~775 tokens) plus skill name listings.

---

## Concrete Improvement Recommendations

### Rec 1: Purge Stubs from the Index (CRITICAL)

Stubs are identifiable by the sentinel string `"Implementing this specific pattern or feature"` in their content. Add a content quality gate to the router:

```typescript
const MIN_CONTENT_BYTES = 3000;
const STUB_SENTINEL = "Implementing this specific pattern or feature";

function isSkillUsable(content: string): boolean {
  return content.length >= MIN_CONTENT_BYTES 
      && !content.includes(STUB_SENTINEL);
}
```

This would eliminate 1,433 of 1,778 indexed skills from ever being served. The remaining 345 real skills would have dramatically higher precision.

### Rec 2: Rewrite `workflows-git-workflow` (HIGH — caused the timeout)

This skill is the primary router result for git/quality tasks and is empty. It needs real content: actual pre-commit hook code, git workflow decision trees, and integration patterns.

### Rec 3: Fix Exercise `required_skills` Domain Mismatch

The `required_skills` in exercises reference `coding-*` prefixed names that don't exist in the router. Either:
- Create the `coding/` domain skills with proper names, OR
- Update exercise `required_skills` to match the actual skill names in the router

### Rec 4: Cap Skills Per Request at 2 for Coding Tasks

Currently the router returns 5 skills per request. For coding-challenge exercises, 5 skills = 5× context noise. The router should serve only 1-2 high-confidence skills for code generation tasks.

### Rec 5: Add "TL;DR for Code Generation" Section to Real Skills

Real skills like `quality-policies` and `branching-strategies` contain git workflow documentation, but the benchmark task is to write a Python function. Skills need a condensed code-generation section:

```markdown
## TL;DR for Code Generation
- Use guard clauses: early return on invalid input
- Return simple types (bool, str, int) — not dicts
- Cyclomatic complexity ≤ 10 per function
- Handle edge cases: empty input, invalid types
- No subprocess calls in pure logic functions
```

### Rec 6: Separate `skill-router-api.md` from Tool Instructions

The "call route_to_skill at the start of every task" instruction creates a conflict in the benchmark. The injection should be conditional:
- If `route_to_skill` has already been called: suppress the reminder
- If the task starts with "IMPORTANT: Do not use any tools": suppress the reminder

---

## Skills Action Table

| Skill                    | Current State      | Action Needed                             |
|--------------------------|--------------------|-------------------------------------------|
| `workflows-git-workflow` | Stub (1,415B)      | **REWRITE** with real git workflow content    |
| `pre-push`               | Stub (1,362B)      | **REWRITE** with pre-commit hook examples     |
| `checklist`              | Stub (1,289B)      | **REWRITE** with code review checklist        |
| `validate`               | Stub (1,271B)      | **REWRITE** with lint/test commands           |
| `bugs`                   | Stub (1,342B)      | **REWRITE** with bug detection patterns       |
| `security-dependencies`  | Stub (1,540B)      | **REWRITE** with `pip-audit`/`safety` examples|
| `refactor-clean`         | Stub (1,490B)      | **REWRITE** with SOLID refactoring examples   |
| `architecture`           | Stub (1,368B)      | **REWRITE** with ADR patterns                 |
| `branching-strategies`   | Real (12,113B) ✅  | Add "TL;DR for Code Gen" section          |
| `quality-policies`       | Real (11,435B) ✅  | Trim to key patterns, add code-gen TL;DR  |
| `advanced` (git)         | Real (10,060B) ✅  | Good as-is; fix trigger matching          |
| `review` (receiving)     | Stub (1,173B)      | **WRONG SKILL** — triggers collide with code-reviewer |
| `full-review`            | Stub (1,236B)      | **DELETE** — ambiguous name, stub content     |

---

## Priority Order

1. **Router quality gate** (filter stubs) — systemic fix, immediate impact
2. **Rewrite `workflows-git-workflow`** — eliminates the timeout
3. **Cap skills per request to 2** — reduces noise injected per run
4. **Rewrite the 8 critical stubs** — improves skill relevance
5. **Add TL;DR sections to real skills** — improves code generation quality
6. **Fix exercise `required_skills` mapping** — aligns expected vs actual skill names
