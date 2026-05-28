---
name: developer-pattern-library
description: Curates and maintains a personal library of validated code patterns,
  solutions, and anti-patterns accumulated through development experience, enabling
  faster problem-solving on future tasks.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  triggers: pattern library, developer patterns, reusable solutions, personal knowledge
    base, code patterns, anti-patterns, how do i organize my code snippets, solution
    catalog
  archetypes:
  - educational
  anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
  response_profile:
    verbosity: medium
    directive_strength: low
    abstraction_level: strategic
  role: reference
  scope: orchestration
  output-format: report
  content-types:
  - guidance
  - examples
  - do-dont
  related-skills: personal-workflow-framework, workflow-patterns, skill-creator
------
# Developer Pattern Library

Curates and maintains a personal library of validated code patterns, solutions, and anti-patterns accumulated through development experience. Your pattern library is your professional capital — every problem you solve that produces a reusable solution is an investment in your future self's speed and accuracy. This skill teaches you how to discover, document, categorize, and retrieve patterns systematically.

## TL;DR Checklist

- [ ] Document a pattern only after it has been tested in at least 2 real scenarios
- [ ] Include a concrete code example showing the GOOD implementation alongside the BAD alternative
- [ ] Tag each pattern with domain keywords that match how you would search for it later
- [ ] Organize patterns by problem category (not by language or framework) — "authentication" not "JWT vs sessions"
- [ ] Review and prune your library quarterly, removing outdated or superseded patterns

---

## When to Use

Use this skill when:

- Solving a recurring problem for the second time and want to capture the solution before forgetting details
- Onboarding onto a new project and encountering common patterns you should document as reusable knowledge
- Building a team's shared pattern library from individual developers' accumulated solutions
- Interview preparation — your documented patterns become interview talking points with real examples
- Mentoring junior developers — structured patterns are better teaching tools than scattered explanations

---

## When NOT to Use

Avoid creating a new pattern entry when:

- You have only encountered the problem once — wait for a second encounter to confirm it is truly recurring
- The solution is trivial (a single line of standard library code) — document in code comments, not a separate entry
- An established industry pattern already exists and covers your case — reference that instead of reinventing terminology
- Your library is already overloaded with similar patterns — merge duplicates before adding new ones

---

## Core Workflow

Building and maintaining your pattern library follows four phases: **Discover → Validate → Document → Index**. This is not a one-time setup but an ongoing discipline.

### Phase 1: Discover Patterns from Experience

Patterns emerge from recurring problems. Train yourself to recognize them in three situations:

**Situation A: Repeated Problems**
You solve the same type of problem more than once within a 3-month window. Examples:
- Writing custom pagination logic for an API three times across two projects
- Configuring CORS for different frontend-backend combinations
- Setting up database connection pooling with different pool sizes

**Situation B: Elegant Solutions**
You write code that is genuinely good — the kind you are proud of and want to reuse. Examples:
- A retry mechanism with exponential backoff that handles transient failures gracefully
- A validation function that catches edge cases others miss
- A data transformation pipeline that reads like a recipe

**Situation C: Costly Mistakes (Anti-Patterns)**
You make an error that costs significant time to debug. Documenting this prevents future repetition. Examples:
- N+1 query bug from lazy loading relationships in a loop
- Race condition from missing mutex on shared state
- Memory leak from unbounded cache growth

### Phase 2: Validate Before Documenting

Before writing any pattern entry, pass it through this validation filter:

```
Validation Checklist for Pattern Entry:
[ ] Tested in 2+ real scenarios (not just theoretical)
[ ] Can be described in one clear sentence
[ ] Has a concrete code example that works as-is
[ ] Solves a problem that recurs with frequency >= quarterly
[ ] Is distinct from existing patterns in the library
```

If any check fails, either refine the pattern or skip it. A pattern library is only valuable when its entries are genuinely useful — every stale entry erodes trust in the entire system.

### Phase 3: Document Using Standard Template

Every pattern entry follows this structure. Consistency makes the library scannable and searchable:

```markdown
## [Pattern Name]

**Category:** [problem-domain]
**Frequency:** [high/medium/low — how often you encounter it]
**Confidence:** [high/medium/low — how sure you are this is the right approach]

### Problem
One-paragraph description of the problem this pattern solves. Include what goes wrong without the pattern.

### Solution
One-sentence description of the solution approach.

```python
# GOOD implementation with full context
def good_example():
    """Documented, typed, working implementation."""
    pass  # Replace with actual code
```

```python
# BAD anti-pattern that this solves
def bad_example():
    """What NOT to do and why it fails."""
    pass  # Replace with actual code
```

### When to Use
- [ ] Specific situation 1
- [ ] Specific situation 2
- [ ] Specific situation 3

### When NOT to Use
- [ ] Situation where this pattern creates more problems than it solves
- [ ] Alternative pattern that is better suited (name it)

### Lessons Learned
- [Specific insight from real-world usage — what surprised you, what trade-offs exist]
```

### Phase 4: Index for Retrieval

A pattern library is useless if you cannot find patterns when you need them. Use this indexing strategy:

**Primary Tags (always include):**
1. **Problem type** — What category of problem does this solve? (e.g., "pagination", "authentication", "error-handling")
2. **Domain** — Which part of the system is affected? (e.g., "api", "database", "frontend", "deployment")
3. **Language/Stack** (if relevant) — Python, Go, React, PostgreSQL, etc.

**Secondary Tags (include if they add search value):**
4. **Complexity** — simple / moderate / complex
5. **Performance impact** — zero-cost / low overhead / compute-intensive

**Search Query Examples:**
```
# How you'd think of the problem:
"how do i handle rate limiting in api gateway" → searches tags: [rate-limiting, api, gateway]

# How you'd search by technology:
"go connection pool configuration" → searches tags: [connection-pooling, database, go]

# How you'd search by recent experience:
"pagination edge cases" → searches tags: [pagination, edge-cases, api]
```

---

## Pattern Categories and Examples

Organize your library using these problem-first categories. Do not organize by language or framework — those are implementation details, not the core problem being solved.

### Category 1: Data Access Patterns

| Pattern | Problem Solved | Recurrence |
|---------|---------------|------------|
| Cursor-based pagination | Offset pagination fails on large datasets with inserts/deletes | High |
| Connection pool sizing | Wrong pool size causes either wasted resources or request queuing | Medium |
| N+1 query prevention | Lazy loading in loops generates O(n) queries instead of O(1) | High |
| Write-ahead logging pattern | Ensuring durability before acknowledging success to client | Medium |

### Category 2: API Design Patterns

| Pattern | Problem Solved | Recurrence |
|---------|---------------|------------|
| Idempotency key header | Preventing duplicate processing of retry/replay requests | High |
| Graceful degradation headers | Telling clients which features are unavailable without full failure | Medium |
| Request validation at boundary | Parsing and validating inputs before they reach business logic | High |
| Error envelope standardization | Consistent error response format across all endpoints | High |

### Category 3: Concurrency Patterns

| Pattern | Problem Solved | Recurrence |
|---------|---------------|------------|
| Semaphore-based rate limiting | Throttling concurrent operations without blocking the event loop | Medium |
| Worker pool with context cancellation | Managing bounded parallelism with graceful shutdown | High |
| Read-write lock pattern | Allowing multiple readers but exclusive writers to shared data | Low |

### Category 4: Configuration Patterns

| Pattern | Problem Solved | Recurrence |
|---------|---------------|------------|
| Environment-specific config merging | Layering defaults → env vars → secrets → runtime overrides | High |
| Schema-validated config loading | Catching configuration errors at startup rather than at runtime | Medium |
| Feature flag rollout strategy | Gradual feature exposure with automated rollback on failure | Medium |

---

## Anti-Pattern Registry

Documenting anti-patterns (bad solutions you have witnessed or committed) is equally valuable. Use this template:

```markdown
## [Anti-Pattern Name] — The "X" Pattern

**Category:** [problem-domain]
**Cost:** [high/medium/low — how much time/money this wastes]

### What It Looks Like
```python
# The anti-pattern — recognizable code smell
def problematic_code():
    """Describe why this is bad."""
    pass
```

### Why It Is Wrong
- [Specific reason 1 — e.g., "Creates N+1 database queries"]
- [Specific reason 2 — e.g., "No way to handle partial failure gracefully"]
- [Specific reason 3 — e.g., ["Makes testing impossible without real dependencies"]]

### Better Alternative
Reference your positive pattern entry: see `[Pattern Name]` for the correct approach.
```

---

## Maintenance Schedule

A pattern library that is not maintained becomes a graveyard of stale entries. Follow this schedule:

**After Every Task (2 minutes):**
- Does the task produce a reusable solution? If yes, add it to your library.
- Did you encounter an anti-pattern worth documenting? If yes, add it.

**Weekly Review (15 minutes):**
- Scan recent additions for duplicates — merge with existing entries if needed
- Verify that code examples still work (run them or check imports)
- Check that tags are consistent and searchable

**Quarterly Cleanup (30 minutes):**
- Remove patterns superseded by newer approaches (e.g., "session-based auth" in a JWT-only world)
- Archive patterns you have not needed in the past 12 months (move to archive section)
- Re-evaluate confidence levels — did your understanding of this pattern deepen?

---

## Pattern Discovery Heuristics

Train yourself to spot patterns worth capturing with these mental prompts:

**The Second-Time Test:** "Have I dealt with something like this before?" If yes, check your library first. If the answer is "no," consider whether it will be a "before" next time.

**The Code Review Reflex:** When reviewing code (yours or others), ask: "Is there a pattern here that should be documented?" Good patterns deserve capture; bad ones deserve anti-pattern documentation.

**The Bug Post-Mortem Rule:** Every bug that took more than 30 minutes to debug produces at least one learnable pattern. Extract it. Examples:
- Debugging a race condition → "Concurrent state access patterns"
- Fixing a CORS issue → "Cross-origin configuration checklist"
- Resolving a type mismatch → "Strict typing boundary enforcement"

---

## Constraints

### MUST DO
- Document patterns only after validating they have been tested in 2+ scenarios
- Include both GOOD and BAD code examples for every pattern entry — the contrast teaches more than either alone
- Tag patterns with searchable problem-type keywords, not implementation details
- Organize by problem domain, not by language or framework
- Reference the `code-philosophy` skill when writing patterns: follow guard clauses, fail fast, use atomic predictability

### MUST NOT DO
- Create pattern entries for single-use solutions — this creates noise that drowns out genuine patterns
- Write vague descriptions without concrete code examples — "use retries" is not a pattern, "exponential backoff with jitter using these specific parameters" is
- Hoard patterns as personal knowledge without sharing when working on a team — the library's value multiplies when shared
- Let the library grow to 100+ entries without pruning — stale entries actively harm retrieval accuracy
- Organize patterns by language/framework first — this creates silos where "authentication in Python" and "authentication in Go" become separate entries instead of one unified pattern with implementation variants

---

## Output Template

When this skill is active and you want to document a new pattern or search existing ones, produce:

**For New Pattern Creation:**
1. **Pattern Name** — Clear, searchable title (not language-specific)
2. **Category & Tags** — Problem domain + searchable keywords
3. **Problem Description** — One paragraph with concrete consequences of NOT using this pattern
4. **Code Example** — Full working implementation with type annotations and docstring
5. **Anti-Pattern Counterexample** — The common wrong approach that led you to this pattern

**For Pattern Retrieval:**
1. **Best Matching Pattern** — Name, confidence level, and why it matches the current problem
2. **Relevant Variants** — Similar patterns that might be more appropriate depending on context
3. **Known Limitations** — What this pattern does NOT solve (important for setting expectations)

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Refactoring.Guru Design Patterns](<https://refactoring.guru/design-patterns>)
- [Clean Architecture (Robert C. Martin)](<https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html>)
- [SOLID Principles of OOP (Wikipedia)](<https://en.wikipedia.org/wiki/SOLID>)
- [Anti-Patterns in Software Engineering (Wikipedia)](<https://en.wikipedia.org/wiki/Anti-pattern>)
- [Software Design Patterns Catalog (GoF Book)](<https://en.wikipedia.org/wiki/Design_Patterns>)

## Related Skills

| Skill | Purpose |
|-------|---------|
| `personal-workflow-framework` | Your workflow framework tells you WHEN to work; your pattern library tells you HOW, drawing from accumulated experience |
| `workflow-patterns` | Generic orchestration patterns — your pattern library is the personalized version capturing your actual solutions |
| `skill-creator` | If your patterns are mature enough, they can be formalized into reusable OpenCode skills for broader distribution |

> 📖 skill(local cache): code-philosophy
