---
name: karpathy-goal-driven-execution
description: Drives implementation through verifiable success criteria — transform vague tasks into testable goals, write reproduction tests before fixes, loop until criteria pass, checkpoint after every significant step, and declare uncertainty explicitly rather than silently proceeding.
license: MIT
compatibility: opencode
archetypes:
  - tactical
  - diagnostic
  - enforcement
anti_triggers:
  - brainstorming
  - vague ideation
  - long-form architecture
  - design documents
response_profile:
  verbosity: medium
  directive_strength: high
  abstraction_level: tactical
metadata:
  version: "1.0.0"
  domain: coding
  triggers: goal-driven execution, success criteria, test-driven, verification loop, checkpoint, fail loud, reproduce bug first, test intent
  role: implementation
  scope: implementation
  output-format: code
  content-types:
    - code
    - guidance
    - do-dont
    - examples
  related-skills: karpathy-coding-mindset, karpathy-surgical-changes, test-driven-development, debugging-methodology
---

# Karpathy Goal-Driven Execution

Senior engineer applying verification-driven execution: transform every task into a testable goal, write reproduction tests before fixing bugs, loop until all criteria pass, commit after each verified step, and declare uncertainty explicitly — never silently proceed when results are ambiguous.

Derived from [Andrej Karpathy's observations](https://x.com/karpathy/status/2015883857489522876) on LLM coding pitfalls — specifically that models proceed without verifying outcomes, leading to undetected failures and silent incorrectness.

---

## TL;DR Checklist

- [ ] Transform "make it work" into specific, testable success criteria before writing code
- [ ] Write a failing test that reproduces the bug BEFORE attempting a fix
- [ ] State a brief plan with verification checkpoints for any multi-step task
- [ ] Verify each checkpoint is passing before moving to the next step
- [ ] Commit or save after every significant verified step — do not batch changes
- [ ] If you cannot verify a step definitively, say so — do not pretend it worked
- [ ] Tests must assert what the code SHOULD do, not just what it currently does

---

## When to Use

Use this skill when:

- Fixing a bug — write the reproduction test before the fix
- Implementing a new feature with clear acceptance criteria
- Refactoring — ensure existing behavior is preserved through passing tests
- Any task where success is ambiguous without explicit verification
- Working on production code where silent failures have real consequences
- Mentoring or pair programming to model verification-first discipline

---

## When NOT to Use

Avoid this skill for:

- Exploratory coding or prototyping where rapid iteration trumps verification
- Writing documentation or specifications (no code to verify)
- Code review of others' work — use `karpathy-surgical-changes` or `code-review` instead
- Trivial one-line changes where verification overhead exceeds change cost
- Creative work where success criteria are inherently subjective

---

## Core Workflow

1. **Define Verifiable Success Criteria** — Transform the vague request into specific, testable outcomes. Replace "make it work" with "function returns correct value for these 5 inputs." Replace "fix the bug" with "write a test that reproduces the failure, then make it pass." **Checkpoint:** Each criterion must be objectively verifiable — either it passes or it doesn't. If you can't define a test, you don't understand the requirement well enough.

2. **State Your Plan with Checkpoints** — For multi-step tasks, write a brief numbered plan where each step ends with a verification checkpoint. Example:
   ```
   1. Add validation function → verify: test catches missing fields
   2. Implement the core logic → verify: all existing tests pass
   3. Handle edge cases → verify: empty input returns expected default
   4. Clean up orphans → verify: no unused imports or variables
   ```
   **Checkpoint:** Review the plan with the user before executing if the task is complex or ambiguous.

3. **Write the Failing Test First (for fixes)** — Before touching implementation code, write a test that reproduces the bug or validates the desired behavior. Run it and confirm it fails. This test becomes your success criterion. **Checkpoint:** `pytest tests/test_module.py -k "test_bug_name"` must fail with the exact error described in the bug report.

4. **Implement Until Tests Pass** — Write the minimum implementation code needed to make the failing test pass. Run the test suite after each significant change. Do not add speculative features — only code that moves the test from red to green. **Checkpoint:** All tests (new and existing) must pass. If existing tests broke, your implementation has unintended side effects — revert and reconsider.

5. **Checkpoint and Commit** — After each verified step, commit your changes with a descriptive message. If you cannot verify a step definitively (e.g., the test framework isn't working, or the environment is inconsistent), stop and declare it. Do not proceed to the next step with unverified work behind you. **Checkpoint:** `git log --oneline` should show clear, verified steps — not monolithic batches of unverified changes.

6. **Loop Until Complete** — If verification at any checkpoint fails, do not proceed. Debug, fix, re-verify, then continue. If you cannot make a checkpoint pass after reasonable effort, surface the blockage explicitly rather than working around it. **Checkpoint:** The final state must have all success criteria verified, either through automated tests or explicit manual verification steps.

---

## Implementation Patterns

### Pattern 1: Reproduction Test Before Fix

```python
# ❌ BAD — fixes the bug without a reproduction test, may not actually fix it

def fix_discount_calculation():
    # "Fixed" the discount logic — but was it actually broken? Is it actually fixed?
    # Without a test, we can't be sure.
    pass

# ✅ GOOD — reproduction test first, then fix

# Step 1: Write the failing test first
def test_discount_calculation_edge_cases():
    """Reproduction test for discount calculation bug.

    Bug report: When quantity > 100 and coupon is applied,
    discount percentage exceeds 100% because both discounts
    are additive instead of multiplicative.
    """
    from pricing import calculate_discount

    # Normal case — single discount
    assert calculate_discount(quantity=5, coupon=None) == 0.0

    # Bug reproduction — quantity + coupon should stack multiplicatively
    result = calculate_discount(quantity=101, coupon="SAVE20")
    assert result < 1.0, f"Expected discount < 100%, got {result*100}%"
    # This test fails before the fix — confirming the bug exists

# Step 2: Fix the implementation
def calculate_discount(quantity: int, coupon: str | None) -> float:
    """Calculate discount as multiplicative stack of applicable discounts."""
    discount = 0.0

    if quantity > 100:
        discount += 0.15  # bulk discount

    if coupon == "SAVE20":
        discount += 0.20  # coupon discount

    # BUG: discounts were additive (0.15 + 0.20 = 0.35)
    # FIX: apply multiplicatively
    bulk_discount = 0.15 if quantity > 100 else 0.0
    coupon_discount = 0.20 if coupon == "SAVE20" else 0.0

    # Multiplicative stacking: 1 - (1 - bulk) * (1 - coupon)
    total = 1.0 - (1.0 - bulk_discount) * (1.0 - coupon_discount)
    return total

# Step 3: Run test — it passes, confirming the fix
```

### Pattern 2: Multi-Step Plan with Checkpoints

```python
# ❌ BAD — monolithic implementation with no verification between steps

def implement_user_management():
    # Wrote 500 lines of user CRUD, auth, and profile management
    # in one shot. First test run: 47 failures across all modules.
    # Cannot tell which part is broken. Debugging takes hours.
    pass

# ✅ GOOD — steps with checkpoints, each verified before proceeding

"""
Plan for user management feature:

Step 1: Define User model and database schema
  → Verify: migration creates table, model can save/retrieve
Step 2: Implement create + read operations
  → Verify: test_create_user and test_get_user pass
Step 3: Implement update + delete operations
  → Verify: test_update_user and test_delete_user pass
Step 4: Add email validation on create
  → Verify: test_invalid_email_rejected passes
Step 5: Clean up orphans (unused imports from refactoring)
  → Verify: no lint warnings for unused imports
"""

# Step 1 implementation
def test_user_model_persistence():
    """Verify User model can save and retrieve from database."""
    user = User(name="Test", email="test@example.com")
    user.save()

    retrieved = User.get_by_id(user.id)
    assert retrieved.name == "Test"
    assert retrieved.email == "test@example.com"

# Step 2 implementation
def test_create_user():
    user = create_user(name="Alice", email="alice@example.com")
    assert user.id is not None
    assert user.name == "Alice"

def test_get_user():
    created = create_user(name="Bob", email="bob@example.com")
    fetched = get_user(created.id)
    assert fetched.name == "Bob"

# Step 3 — only implemented after Step 2 tests pass
def test_update_user():
    user = create_user(name="Old", email="old@example.com")
    update_user(user.id, name="Updated")
    fetched = get_user(user.id)
    assert fetched.name == "Updated"

# Each step implemented only after previous step's tests verified
```

### Pattern 3: Failing Loud vs. Silent Proceeding

```python
# ❌ BAD — silently assumes success, continues despite ambiguity

def deploy_and_verify():
    deploy_application()  # Returns {"status": "deployed"} — but did it?
    # No verification. Assumes success. Proceeds to next step.
    run_smoke_tests()  # Tests may pass against old version

# ✅ GOOD — explicit verification, fails loud on ambiguity

def deploy_and_verify():
    """Deploy and verify. Blocks on any verification failure."""
    import requests

    # Deploy
    result = deploy_application()

    # Verify deployment actually took effect
    try:
        health = requests.get("https://app.example.com/health", timeout=10)
        assert health.status_code == 200, f"Health check returned {health.status_code}"
        assert health.json().get("version") == result["version"], \
            f"Expected version {result['version']}, got {health.json().get('version')}"
    except (requests.ConnectionError, AssertionError, KeyError) as e:
        # FAIL LOUD — do NOT proceed silently
        raise RuntimeError(
            f"Deployment verification FAILED: {e}. "
            f"Do not proceed to smoke tests. Manual investigation required."
        )

    # Only proceed if verification passed
    run_smoke_tests()
```

### Pattern 4: Checkpointing Work

```python
# ❌ BAD — monolithic batch of unverified changes

"""
Commit log (one commit for the entire feature):
  "Implemented user management"

What's in it? 500 lines across 8 files.
Which parts work? Unknown. Cannot roll back partial work.
"""

# ✅ GOOD — checkpoint after each verified step

"""
Commit log (clear, verified, reversible):
  1. "Add User model and database migration"
  2. "Implement user CRUD operations"
  3. "Add email validation to user creation"
  4. "Remove unused imports from refactoring"

Each commit is ~50-100 lines, independently verified,
and can be rolled back without affecting other steps.
"""
```

---

## Constraints

### MUST DO
- Transform every task into testable success criteria before writing implementation code
- Write a reproduction test that fails before fixing a bug — confirm the bug exists first
- State a plan with verification checkpoints for any task spanning multiple steps
- Verify each checkpoint passes before starting the next step
- Commit or save after each verified step — do not batch unverified changes into one commit
- Declare uncertainty explicitly — if you cannot verify a step, say so rather than proceeding
- Tests must assert what the code SHOULD do, not just what it currently does — avoid tautological tests

### MUST NOT DO
- Proceed to the next step when current step's verification fails — stop and fix first
- Batch multiple unverified changes into a single commit or deployment
- Assume an operation succeeded without verification (deployment, API call, database write)
- Write tests that only assert current behavior without verifying correctness
- Ignore test failures by marking them as "expected" or "known issue" without a plan to fix

---

## Related Skills

| Skill | Purpose |
|---|---|
| `karpathy-coding-mindset` | Pre-implementation discipline — think before coding, keep it simple |
| `karpathy-surgical-changes` | Editing existing code — minimal change surface, match conventions |
| `test-driven-development` | Red-green-refactor cycle for test-first development |
| `debugging-methodology` | Systematic debugging when verification reveals failures |
