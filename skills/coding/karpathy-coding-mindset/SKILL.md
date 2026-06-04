---
name: karpathy-coding-mindset
description: Applies Karpathy's pre-implementation discipline — state assumptions explicitly, surface tradeoffs instead of hiding them, push back on unnecessary complexity, and write minimum code that solves the problem with no speculative features or premature abstractions.
license: MIT
compatibility: opencode
archetypes:
  - tactical
  - generation
anti_triggers:
  - brainstorming
  - vague ideation
  - long-form architecture
  - design documents
response_profile:
  verbosity: low
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: coding
  triggers: coding mindset, think before coding, simplicity first, overengineering, yagni, premature optimization, assumptions, tradeoffs
  role: implementation
  scope: implementation
  output-format: code
  content-types:
    - code
    - guidance
    - do-dont
    - examples
  related-skills: karpathy-surgical-changes, karpathy-goal-driven-execution, yagni, kiss-principle
---

# Karpathy Coding Mindset

Senior engineer applying pre-implementation cognitive discipline: state assumptions before coding, surface tradeoffs explicitly, push back on complexity, and deliver minimum code that solves exactly the problem asked — nothing more, nothing speculative.

Derived from [Andrej Karpathy's observations](https://x.com/karpathy/status/2015883857489522876) on LLM coding pitfalls and behavioral guidelines to reduce over-engineering.

---

## TL;DR Checklist

- [ ] State your assumptions explicitly *before* writing any code — don't hide confusion
- [ ] Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify
- [ ] Count the lines: if you wrote 200 and it could be 50, rewrite it now
- [ ] Challenge every abstraction: is it needed for the current requirement, or speculative?
- [ ] When uncertain about intent, stop and ask — don't silently pick an interpretation
- [ ] If a simpler approach exists, surface it and let the user decide

---

## When to Use

Use this skill when:

- Starting a new implementation task — before writing the first line of code
- You feel the urge to add "flexibility" or "configurability" that wasn't requested
- Reviewing your own code and suspecting it's more complex than needed
- A requirement has multiple possible interpretations that need disambiguation
- You catch yourself planning for hypothetical future scenarios
- You are about to add an abstraction layer for what is currently single-use code

---

## When NOT to Use

Avoid this skill for:

- Debugging or troubleshooting existing failures — use a diagnostic skill instead
- Performance optimization where complexity is justified by measured bottlenecks
- Greenfield architecture planning where some upfront design is appropriate
- Tasks where the requirements explicitly call for extensibility or configurability
- Code review of others' work — use `karpathy-surgical-changes` for editing existing code

---

## Core Workflow

1. **Clarify Intent** — Read the request carefully. Identify ambiguous terms, unstated assumptions, and implicit requirements. Write down your understanding in 1-2 sentences. **Checkpoint:** If you cannot state the goal clearly in one sentence, stop and ask for clarification.

2. **Surface Assumptions** — List the assumptions you're making about the problem: input formats, error conditions, performance expectations, integration points. If any assumption feels uncertain, flag it explicitly rather than coding around it defensively. **Checkpoint:** Each uncertain assumption must be either confirmed or made visible to the user before implementation proceeds.

3. **Resist Speculative Complexity** — For each feature, abstraction, or parameter you're tempted to add, ask: "Is this required by the current specification?" If the answer is no, delete it. Configurability for hypothetical future use cases is the primary source of over-engineered code. **Checkpoint:** Scan your implementation for any code path that cannot be exercised by the current requirements — if found, remove it.

4. **Choose the Simplest Correct Approach** — Before implementing, enumerate 2-3 approaches briefly and pick the simplest one that satisfies all *current* requirements. Document the runner-up only if the choice is non-obvious. **Checkpoint:** The final implementation must be the minimum code that solves the stated problem.

5. **Write Minimal Implementation** — Implement with no speculative error handling, no premature abstractions, no unused parameters, no dead code paths. Every line must trace to a current requirement. **Checkpoint:** Count source lines. If a function is over 50 lines or a module over 200, consider whether it can be split or simplified further.

6. **Review Against Requirements** — Re-read the original request. Verify each requirement is met exactly once. Flag any behavior you added that wasn't asked for. **Checkpoint:** You should be able to point at specific lines for each requirement — anything extra is speculative and should be removed.

---

## Implementation Patterns

### Pattern 1: Explicit Assumptions vs. Silent Interpretation

```python
# ❌ BAD — silently assumes data format, hides confusion
def process_sales_data(raw_data: list[dict]) -> dict:
    """Process sales data and return summary."""
    # What if columns are missing? What if there are zero rows?
    # What currency? What date format? All silently assumed.
    total = sum(item["revenue"] for item in raw_data)
    return {"total_revenue": total, "transaction_count": len(raw_data)}

# ✅ GOOD — surfaces assumptions, validates inputs, no speculation
def process_sales_data(
    raw_data: list[dict],
    currency: str = "USD"
) -> dict:
    """Process sales data and return summary with explicit assumptions.

    Assumptions (must verify before calling):
    - Each dict has 'revenue' as float in `currency`
    - Empty list returns zero total
    - Timestamps are naive UTC ISO-8601 strings
    """
    if not raw_data:
        return {"total_revenue": 0.0, "transaction_count": 0, "currency": currency}

    required_keys = {"revenue", "timestamp", "product_id"}
    if not required_keys.issubset(raw_data[0].keys()):
        missing = required_keys - raw_data[0].keys()
        raise ValueError(f"Missing required columns: {missing}")

    total = sum(item["revenue"] for item in raw_data)
    return {
        "total_revenue": round(total, 2),
        "transaction_count": len(raw_data),
        "currency": currency,
    }
```

### Pattern 2: Minimum Viable vs. Over-Engineered

```python
# ❌ BAD — speculative abstractions, config, future-proofing
class DataProcessor:
    """Generic data processing pipeline — currently only does CSV exports."""

    def __init__(
        self,
        input_format: str = "csv",
        output_format: str = "json",
        encoding: str = "utf-8",
        batch_size: int = 1000,
        enable_caching: bool = False,
        retry_on_failure: bool = True,
        max_retries: int = 3,
        log_level: str = "INFO",
        # ... 8 more parameters for hypothetical future formats
    ):
        self.input_format = input_format
        self.output_format = output_format
        # ... all stored but only csv→json is ever used
        self._init_logging(log_level)

    def process(self, filepath: str) -> dict:
        if self.input_format != "csv":
            raise NotImplementedError("Only CSV is supported")  # Never used
        # ... 80 lines of actual processing
```

```python
# ✅ GOOD — exactly what's needed, nothing more
def convert_csv_to_json(filepath: str) -> list[dict]:
    """Read a CSV file and return its contents as a list of dicts.

    This is a direct implementation. No abstractions, no config,
    no batching, no retry. If those are needed later, they will
    be added at that point based on actual requirements.
    """
    import csv

    with open(filepath, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return [dict(row) for row in reader]
```

### Pattern 3: Surfacing Tradeoffs vs. Silent Selection

```python
# ❌ BAD — silently picks an approach, hides tradeoffs
def cache_key(prefix: str, query: str) -> str:
    # Uses MD5 silently — no consideration of collisions, speed, or purpose
    import hashlib
    return f"{prefix}:{hashlib.md5(query.encode()).hexdigest()}"

# ✅ GOOD — surfaces the tradeoff when the choice matters
def cache_key(prefix: str, query: str) -> str:
    """Generate cache key for a query string.

    Uses MD5 for speed — suitable for non-security cache keys where
    accidental collisions are acceptable (~2^-64 collision prob).

    If this cache is used for security-sensitive data, switch to SHA-256.
    If deterministic keys across restarts are not needed, use a faster
    hash like xxhash or built-in hash().
    """
    import hashlib
    return f"{prefix}:{hashlib.md5(query.encode()).hexdigest()}"
```

---

## Constraints

### MUST DO
- State all assumptions explicitly before writing implementation code — write them as comments or docstrings
- Challenge every abstraction: "Is this required by the current specification?" If no, remove it
- Surface tradeoffs when there are multiple valid approaches — let the user decide
- If uncertain about any requirement, stop and ask before proceeding
- Measure code against the requirement: every line must trace to a current (not hypothetical) need

### MUST NOT DO
- Add speculative parameters, configuration knobs, or abstractions "for future use"
- Hide confusion by silently picking one interpretation of an ambiguous requirement
- Implement error handling for scenarios that cannot occur in the current system
- Add "flexibility" for use cases that nobody has asked for yet
- Assume input formats, data quality, or performance characteristics without verification

---

## Related Skills

| Skill | Purpose |
|---|---|
| `karpathy-surgical-changes` | When editing existing code — touch only what must change |
| `karpathy-goal-driven-execution` | When verification and success criteria are needed |
| `yagni` | You Aren't Gonna Need It — complementary principle for avoiding speculative features |
| `kiss-principle` | Keep It Simple, Stupid — simplicity-focused design philosophy |
