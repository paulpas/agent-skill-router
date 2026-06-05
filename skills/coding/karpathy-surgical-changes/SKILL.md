---




name: karpathy-surgical-changes
description: Enforces surgical code modification discipline — touch only what the request requires, read full context before editing, match existing codebase conventions, clean up only your own orphans, and never refactor adjacent code that isn't broken.
license: MIT
compatibility: opencode
archetypes:
  - tactical
  - diagnostic
anti_triggers:
  - brainstorming
  - long-form architecture
  - greenfield development
  - vague ideation
response_profile:
  verbosity: low
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: coding
  triggers: surgical changes, minimal edits, code modification, editing existing code, refactoring discipline, touch only what you must, read before you write, codebase conventions
  role: implementation
  scope: implementation
  output-format: code
  content-types:
    - code
    - guidance
    - do-dont
    - examples
  related-skills: karpathy-coding-mindset, karpathy-goal-driven-execution, code-review, refactoring-techniques




---





# Karpathy Surgical Changes

Senior engineer applying surgical modification discipline: read the full context before editing, change only what the request demands, match existing codebase conventions even when you disagree, clean up only the orphans your changes create, and never refactor adjacent code that is not broken.

Derived from [Andrej Karpathy's observations](https://x.com/karpathy/status/2015883857489522876) on LLM coding pitfalls — specifically the tendency to make sweeping changes when minimal edits are requested.

---

## TL;DR Checklist

- [ ] Read the full file before making any edit — understand imports, dependencies, patterns
- [ ] Ask: "Does this change trace directly to the user's request?" If not, revert it
- [ ] Match existing code style, naming conventions, and patterns — even if you'd do it differently
- [ ] Remove imports, variables, and functions that YOUR changes made unused — but not pre-existing dead code
- [ ] Do NOT "improve" adjacent code, comments, formatting, or structure unless specifically asked
- [ ] If you notice unrelated dead code, mention it in a comment — do not delete it
- [ ] Every changed line must be necessary for the requested feature or fix

---

## When to Use

Use this skill when:

- Modifying existing code — adding a feature, fixing a bug, or updating behavior
- Reviewing your own diff before submitting — checking for scope creep in your changes
- Working in a legacy codebase where preserving existing patterns is critical
- Making hotfixes or patches where minimal change surface reduces risk
- Contributing to a project with established coding conventions different from your preferences
- Pair programming or code review where the reviewer values minimal diffs

---

## When NOT to Use

Avoid this skill for:

- Greenfield development or creating new files — use `karpathy-coding-mindset` instead
- Large-scale refactoring initiatives where sweeping changes are intentional
- Security fixes where defensive changes to adjacent code are justified
- Performance optimization where changes to data structures affect multiple callers
- Projects in early development where conventions are still being established

---

## Core Workflow

1. **Read Before You Write** — Open the file(s) you need to modify. Read the entire file top to bottom. Understand the module's imports, function signatures, naming conventions, error handling patterns, and data flow. **Checkpoint:** Before writing any code, you should be able to describe the file's structure and conventions from memory.

2. **Define the Minimal Change Set** — List every file and function you plan to touch. For each change, state in one sentence how it traces to the user's request. If a change cannot be directly traced, remove it from the plan. **Checkpoint:** The union of all planned changes should exactly equal the user's request — no more, no less.

3. **Match Existing Conventions** — Identify the codebase's existing patterns for: naming (snake_case vs camelCase), imports (absolute vs relative), error handling (exceptions vs returns), formatting (line length, indentation), and testing style. Apply these conventions in your changes — even if you prefer a different style. **Checkpoint:** Your diff should be indistinguishable from code written by the project's existing authors.

4. **Make the Surgical Edit** — Implement exactly the changes from your plan. Do not reformat adjacent lines, do not update comments unless they refer to your changed code, do not add blank lines or remove them unless it's part of your change. **Checkpoint:** Run `git diff` and verify each changed line traces to the request.

5. **Clean Up Your Orphans** — Scan for imports, variables, or functions that YOUR edits made unused. Remove them. Do NOT touch pre-existing dead code — if you find any, leave a comment like `# TODO: unused — pre-existing, not part of this change` rather than deleting it. **Checkpoint:** The only deletions in your diff should be orphans created by your additions.

6. **Verify No Scope Creep** — Re-read the diff one final time. Classify every change as: (a) required by the request, (b) orphan cleanup from your changes, or (c) anything else. If category (c) is non-empty, revert those changes immediately. **Checkpoint:** Category (c) must be empty.

---

## Implementation Patterns

### Pattern 1: Surgical vs. Sweeping Change

```python
# ❌ BAD — sweeping change: reformats, renames, refactors adjacent code

# Before: original file
def calc(a, b):
    # Old calculation
    res = a + b
    return res

# After: "improved" version — renamed, reformatted, adjacent code changed
def calculate_total(value_one: float, value_two: float) -> float:
    """Calculate the total of two values.

    This function was renamed from calc to be more descriptive.
    Parameters were renamed from a,b to value_one,value_two.
    Added type hints. Reformatted docstring. Changed return style.
    None of these changes were requested.
    """
    result_value = value_one + value_two

    return result_value

# ✅ GOOD — surgical change: only what was requested

# Before: original file
def calc(a, b):
    res = a + b
    return res

# Request: handle negative numbers by returning 0
def calc(a, b):
    res = a + b
    # Handle negative results per request
    if res < 0:
        return 0
    return res
# Changed lines: 3 lines added. Everything else preserved.
```

### Pattern 2: Orphan Cleanup — Yours vs. Pre-existing

```python
# ❌ BAD — deletes pre-existing dead code, misses own orphans

# Before: when adding a new function, you deleted unrelated dead code
import os             # ← your code doesn't use os anymore, but it was unused before your change
import json           # ← your code doesn't use json, pre-existing but should stay
from utils import old_helper, new_helper  # old_helper was pre-existing dead code — you deleted it

def process(data):
    # Your new implementation using new_helper
    result = new_helper(data)
    return result
    # You forgot to remove the import of old_helper that YOUR change made unnecessary

# ✅ GOOD — removes own orphans, leaves pre-existing alone

import os             # pre-existing, not touched
import json           # pre-existing, not touched
from utils import old_helper, new_helper  # old_helper was needed before, not touched

def process(data):
    # Your new implementation using new_helper
    result = new_helper(data)
    return result
# Note: old_helper is still imported and that's fine — it was used elsewhere before
```

### Pattern 3: Convention Matching

```python
# ❌ BAD — imposing your style on an existing codebase

# Project convention: 2-space indentation, no type hints, exceptions for errors
# What you wrote:
def fetch_user(user_id: int) -> User | None:
    """Fetch user by ID from the database.

    Args:
        user_id: The user's unique identifier

    Returns:
        User object if found, None otherwise
    """
    try:
        return database.query(User).filter_by(id=user_id).first()
    except DatabaseError:
        return None

# ✅ GOOD — matches existing conventions

# Project convention: 2-space indentation, no type hints, exceptions for errors
# What you wrote (matching project style):
def fetch_user(user_id):
  """Fetch user by ID, raises on DB error, returns None if not found."""
  return database.query(User).filter_by(id=user_id).first()
```

### Pattern 4: Resist the Urge to "Improve"

```python
# ❌ BAD — "improving" adjacent code while making requested change

# Request: "Add validation that email is not empty"
def create_user(name, email):
    # You noticed the variable name is vague so you "improved" it
    # You also reformatted the docstring
    # You also added type hints (not in project style)
    # You also fixed a typo in a comment on line 3
    # None of these were requested

    # Create new user with provided name and emial  ← typo existed, you didn't touch it
    user = User(name=name, email=email)  # ← you changed 'name' to 'user_name' here
    user.save()
    return user

# ✅ GOOD — only the requested change, nothing else

# Request: "Add validation that email is not empty"
def create_user(name, email):
    # Create new user with provided name and emial  ← pre-existing typo, not touched
    if not email:  # ← only addition, per request
        raise ValueError("Email is required")
    user = User(name=name, email=email)
    user.save()
    return user
```

---

## Constraints

### MUST DO
- Read the entire file you're editing before making any changes — understand context first
- Match the codebase's existing naming, formatting, and error-handling conventions
- Clean up imports, variables, and functions that YOUR changes made unused
- Verify every changed line traces directly to the user's request using `git diff`
- Mention pre-existing dead code in a comment if you discover it — do not delete it

### MUST NOT DO
- Refactor, rename, reformat, or "improve" adjacent code that isn't part of the request
- Delete pre-existing dead code unless specifically asked to do so
- Add type hints, docstrings, or error handling that don't match the project's existing patterns
- Change indentation, line spacing, or comment style in unrelated sections
- Fix typos or style issues in code you weren't asked to touch

---

## Related Skills

| Skill | Purpose |
|---|---|
| `karpathy-coding-mindset` | Pre-implementation discipline for new code — state assumptions, keep it simple |
| `karpathy-goal-driven-execution` | Post-implementation verification — define success criteria and verify |
| `code-review` | Reviewing diffs for quality and correctness |
| `refactoring-techniques` | When intentional, large-scale refactoring is the goal (not this skill) |
