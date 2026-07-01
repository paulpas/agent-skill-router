---
name: maintainability-first-code-review
description: Run a strict maintainability-first code review focused on file size limits, code structure, spaghetti detection, and code judo restructuring to prevent structural decay.
license: MIT
compatibility: opencode
archetypes:
  - tactical
  - diagnostic
anti_triggers:
  - brainstorming
  - vague ideation
  - aesthetic review
  - style preference
  - formatting nit
response_profile:
  verbosity: low
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: coding
  triggers: maintainability review, code structure review, spaghetti code detection, 1000 line rule, code judo, thin abstraction detection, layer integrity, ad-hoc conditionals
  role: implementation
  scope: implementation
  output-format: analysis
  content-types:
    - code
    - guidance
    - do-dont
    - examples
  related-skills: code-review, architectural-review, software-maintainability
---

# Maintainability-First Code Review

Acts as a strict maintainability gatekeeper during PR or diff reviews, identifying structural problems before they become technical debt. Evaluates code changes for file sprawl, spaghetti conditionals, thin abstractions, and layer violations, then recommends concrete restructurings that simplify the implementation while preserving behavior.

## TL;DR Checklist

- [ ] Verify no file exceeds ~1000 lines of code
- [ ] Verify no function exceeds ~50 lines or nesting depth > 4
- [ ] Search for ad-hoc conditionals and scattered special-case branches
- [ ] Flag thin wrappers and pass-through abstractions that add indirection without value
- [ ] Ensure feature logic does not leak into shared or core modules
- [ ] Identify at least one "code judo" restructuring opportunity per review

---

## When to Use

Use this skill when:

- Reviewing a diff or changed files for maintainability violations (file sprawl, spaghetti code, thin abstractions)
- A file or function has grown large or a new layer is being added without justification
- Feature logic appears to be leaking into shared, core, or framework code
- A rewrite is proposed and you need to judge whether it removes complexity or just moves it
- An automated agent wrote code fast and the question is whether anyone can maintain it

---

## When NOT to Use

Avoid this skill for:

- Cosmetic nits (whitespace, naming preferences) — use `code-review` instead
- Whether the code "works" functionally — use proving-claims or test verification instead
- Trivial, obvious edits with no effect on structure
- Security auditing — use `security-review` instead
- Strategic architecture planning across multiple modules — use `architectural-review` instead

---

## Core Workflow

1. **Scope Assessment** — Read the diff or changed files. Identify file sizes, LOC counts, and which module boundaries are touched. **Checkpoint:** If no file is > 200 lines and no new abstractions are introduced, the review scope is narrow — proceed efficiently.

2. **Code Structure Analysis** — Evaluate LOC thresholds. Flag files approaching 1000 lines, functions approaching 50 lines, and nesting exceeding 4 levels. **Checkpoint:** Record each threshold breach with the specific file and line number.

3. **Code Judo Analysis** — Identify restructuring opportunities that preserve behavior while simplifying the implementation. Look for flattening nested conditionals, eliminating redundant intermediate steps, extracting complex logic into domain functions, replacing if-else chains with strategy patterns, and removing pass-through wrappers. **Checkpoint:** For each restructure, verify the new version produces identical behavior.

4. **Spaghetti Pattern Detection** — Search for ad-hoc conditionals scattered across unrelated flows, feature-specific logic in shared code, silent fallbacks that hide unclear invariants, and type boundary violations (`any`, `unknown` without explicit types). **Checkpoint:** Distinguish between necessary complexity (domain logic) and accidental complexity (poor structure).

5. **Layer Integrity Verification** — Ensure canonical modules (auth, logging, routing) do not accumulate feature-specific logic. Verify dependencies only exist where they reduce complexity. **Checkpoint:** Every new dependency or import must justify itself by removing more complexity than it adds.

6. **Severity Scoring** — Classify findings as warning (maintainability concern), error (structural violation), or block (critical threat). **Checkpoint:** At least one actionable finding should be reported per review unless the code passes all checks.

7. **Deliver Findings** — Produce a structured review with: prioritized findings, suggested restructures, and a final verdict (APPROVED, NEEDS_CHANGES, or BLOCKED). **Checkpoint:** Every finding cites a specific location and a concrete fix, not a general feeling.

---

## Implementation Patterns

### Pattern 1: Maintainability Thresholds

Check code against measurable size and complexity thresholds. These are heuristics, not laws — but they should trigger a review whenever violated.

```python
# ✅ GOOD — code structure respects maintainability thresholds
MAX_FILE_LINES = 1000
MAX_FUNCTION_LINES = 50
MAX_NESTING_DEPTH = 4

def assess_file(file_path: str) -> list[str]:
    """Assess a file for maintainability violations.

    Returns a list of violation messages.
    """
    violations: list[str] = []

    with open(file_path) as f:
        lines = f.readlines()

    total_lines = len(lines)

    # File size check
    if total_lines > MAX_FILE_LINES:
        violations.append(
            f"BLOCK: File exceeds {MAX_FILE_LINES} lines "
            f"({total_lines} lines). Split into smaller modules."
        )

    # Function size check (simplified scan)
    for i, line in enumerate(lines, 1):
        if line.strip().startswith("def ") and "(" in line:
            func_start = i
            func_lines = 1
            for j in range(i, min(i + MAX_FUNCTION_LINES + 20, len(lines))):
                next_line = lines[j]
                if next_line.strip() and not next_line.startswith(" ") and not next_line.startswith("\t"):
                    break
                func_lines += 1
            if func_lines > MAX_FUNCTION_LINES:
                violations.append(
                    f"ERROR: Function at line {func_start} exceeds "
                    f"{MAX_FUNCTION_LINES} lines ({func_lines} lines)."
                )

    return violations
```

### Pattern 2: Spaghetti Conditionals Detection

Ad-hoc conditionals inserted into unrelated code paths are a primary source of spaghetti code. They grow incrementally with no architectural justification.

```python
# ❌ BAD — ad-hoc conditional scattered into an unrelated flow
def process_order(order: dict) -> dict:
    """Process an order — grows a conditional every time a new case appears."""
    # Original logic...
    result = calculate_pricing(order)

    # Ad-hoc: "we also need this check now"
    if order.get("channel") == "wholesale" and order.get("priority") == "rush":
        result["discount"] = 0.15
    elif order.get("channel") == "wholesale":
        result["discount"] = 0.10
    elif order.get("channel") == "retail" and order.get("is_vip"):
        result["discount"] = 0.20

    # More ad-hoc branches appear here over time...
    return result

# ✅ GOOD — logic extracted into a dedicated pricing policy
from enum import Enum
from dataclasses import dataclass


class Channel(str, Enum):
    WHOLESALE = "wholesale"
    RETAIL = "retail"
    DIRECT = "direct"


@dataclass
class OrderProfile:
    channel: Channel
    priority: str | None = None
    is_vip: bool = False


class PricingPolicy:
    """Determines discount based on order profile."""

    def get_discount(self, profile: OrderProfile) -> float:
        if profile.channel == Channel.WHOLESALE and profile.priority == "rush":
            return 0.15
        if profile.channel == Channel.WHOLESALE:
            return 0.10
        if profile.channel == Channel.RETAIL and profile.is_vip:
            return 0.20
        return 0.0


def process_order(order: dict) -> dict:
    profile = OrderProfile(
        channel=Channel(order["channel"]),
        priority=order.get("priority"),
        is_vip=order.get("is_vip", False),
    )
    discount = PricingPolicy().get_discount(profile)
    result = calculate_pricing(order)
    result["discount"] = discount
    return result
```

### Pattern 3: Code Judo — Flattening Nested Conditionals

Flatten deeply nested conditionals using guard clauses (early returns). Each nesting level adds cognitive load; reducing depth is the single highest-impact restructuring.

```python
# ❌ BAD — 4 levels of nesting, hard to follow control flow
def create_user_profile(request_data: dict) -> dict | None:
    if request_data.get("email"):
        if "@" in request_data["email"]:
            if len(request_data["email"]) < 256:
                if not is_email_taken(request_data["email"]):
                    profile = {
                        "email": request_data["email"],
                        "name": request_data.get("name", ""),
                    }
                    save_to_db(profile)
                    return profile
                else:
                    return {"error": "Email already taken"}
            else:
                return {"error": "Email too long"}
        else:
            return {"error": "Invalid email format"}
    else:
        return {"error": "Email required"}

# ✅ GOOD — flattened with guard clauses, 0 nesting depth
def create_user_profile(request_data: dict) -> dict:
    email = request_data.get("email")
    if not email:
        return {"error": "Email required"}
    if "@" not in email:
        return {"error": "Invalid email format"}
    if len(email) >= 256:
        return {"error": "Email too long"}
    if is_email_taken(email):
        return {"error": "Email already taken"}

    return {"email": email, "name": request_data.get("name", "")}
```

### Pattern 4: Thin Abstraction Detection

A thin abstraction (pass-through wrapper) adds indirection without introducing meaningful behavior. It obscures the call chain and makes refactoring harder.

```python
# ❌ BAD — thin wrappers that do nothing but forward parameters
class UserService:
    def get_user(self, user_id: int) -> dict:
        return self.repository.find_by_id(user_id)

    def get_user_by_email(self, email: str) -> dict:
        return self.repository.find_by_email(email)

    def create_user(self, data: dict) -> dict:
        return self.repository.insert(data)

    def update_user(self, user_id: int, data: dict) -> dict:
        return self.repository.update(user_id, data)

    def delete_user(self, user_id: int) -> None:
        self.repository.delete(user_id)

# Check if a wrapper is thin:
def is_thin_wrapper(func) -> bool:
    """Detect if a function merely forwards its arguments."""
    import inspect

    source = inspect.getsource(func)
    # Count parameter references in the body
    params = [p.name for p in inspect.signature(func).parameters.values()]
    references = sum(
        1 for param in params
        if param in source and source.count(param) <= 3
    )
    return references >= len(params) and "self.repository" in source
```

### Pattern 5: Layer Integrity — Feature Logic Leakage

Shared or canonical modules must not accumulate feature-specific logic. This is one of the most common forms of structural decay.

```python
# ❌ BAD — feature-specific logic leaked into shared auth module
# File: shared/auth_middleware.py
async def auth_middleware(request: Request) -> dict:
    token = request.headers.get("Authorization")
    user = validate_token(token)

    # Feature-specific: this belongs in the billing module, not here
    if user.get("tier") == "enterprise" and request.url.path.startswith("/api/reports"):
        request.state.allow_report_download = True

    # More feature logic accumulates...
    if user.get("tier") == "premium":
        request.state.rate_limit = 1000
    elif user.get("tier") == "free":
        request.state.rate_limit = 100

    return user

# ✅ GOOD — auth module handles only authentication; feature concerns are delegated
async def auth_middleware(request: Request) -> dict:
    token = request.headers.get("Authorization")
    user = validate_token(token)
    request.state.user = user
    return user


# Feature-specific logic lives in its own module
class AuthorizationPolicy:
    """Determines access based on user tier and requested resource."""

    def check_access(self, user: dict, request: Request) -> dict:
        checks = {
            "enterprise": self._enterprise_checks,
            "premium": self._premium_checks,
            "free": self._free_checks,
        }
        tier = user.get("tier", "free")
        return checks.get(tier, self._free_checks)(request)

    def _enterprise_checks(self, request: Request) -> dict:
        return {"rate_limit": 1000, "allow_report_download": True}

    def _premium_checks(self, request: Request) -> dict:
        return {"rate_limit": 1000}

    def _free_checks(self, request: Request) -> dict:
        return {"rate_limit": 100}
```

---

## Constraints

### MUST DO
- Evaluate file sizes and LOC counts before assessing code quality — size drives structure
- Search for code judo opportunities: find the simplest restructure that preserves behavior
- Treat ad-hoc conditionals as design problems, not stylistic nits — flag them prominently
- Check that new abstractions remove more complexity than they introduce — flag thin pass-throughs
- Verify feature logic does not leak into shared, core, or canonical modules
- Use explicit typed models or contracts at module boundaries instead of loosely-shaped objects
- Report findings with specific file paths and line numbers — never with vague impressions
- Recommend deletion over rearrangement when reducing complexity

### MUST NOT DO
- Flag cosmetic issues (whitespace, naming style, formatting) — these are not maintainability concerns
- Accept "it works" as justification for structural debt — functionality is the minimum bar
- Use `any` or `unknown` types at boundaries when a clearer type contract exists
- Create pass-through wrappers that merely forward parameters to underlying functions
- Let canonical modules (auth, logging, routing, error handling) accumulate feature-specific logic
- Add silent fallbacks that hide unclear invariants — make boundaries explicit instead
- Flag complexity that represents genuine domain logic as a code quality problem
- Use the 1000-line or 50-line thresholds as absolute laws — they are heuristics that trigger review

---

## Output Template

When applying this skill, produce the following structured review:

### 1. Summary
- Files reviewed: list of files with line counts
- Total new lines added / removed
- Structural health score: WARMING (minor concerns), HOT (violations present), CRITICAL (structural threats)

### 2. Findings (Ranked by Severity)
Each finding must include:
- **Location**: `file.py:line_number`
- **Violation**: What maintainability standard is at risk
- **Evidence**: Brief description of the problem
- **Suggested Fix**: Concrete restructuring, not a general principle
- **Severity**: WARN / ERROR / BLOCK

### 3. Code Judo Opportunities
- At least one specific restructuring suggestion per review
- Show the before/after with minimal diff context
- Explain why the restructure preserves behavior and reduces complexity

### 4. Verdict
- **APPROVED**: No structural violations found, or only warnings
- **NEEDS_CHANGES**: One or more errors present, restructurable
- **BLOCKED**: Critical structural threats (1k+ line files, severe layer violations, feature logic in shared code)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `code-review` | General PR review covering bugs, security, code smells — use alongside this skill for comprehensive coverage |
| `architectural-review` | Strategic architecture evaluation across multiple modules — use when structural issues span beyond a single PR |
| `software-maintainability` | Long-term maintainability strategy including refactoring cadences and complexity budgets — use for ongoing codebase health planning |

---

## Live References

> Authoritative documentation and research on maintainability-focused code review and structural quality.

- [Augment Code: Code Review Best Practices That Scale](https://www.augmentcode.com/guides/code-review-best-practices-that-scale)
- [Augment Code: Secure Code Review Checklist — OWASP-Aligned](https://www.augmentcode.com/guides/secure-code-review-checklist-owasp-aligned-framework)
- [OWASP Secure Agent Playbook: Security Code Review](https://github.com/OWASP/secure-agent-playbook/blob/main/plays/tier1-code-analysis/code-review-security.md)
- [OWASP Secure Agent Playbook: Securability Engineering Review](https://github.com/OWASP/secure-agent-playbook/blob/main/plays/tier1-code-analysis/securability-engineering-review.md)
- [OWASP Code Review Guide v2](https://owasp.org/www-project-code-review-guide/assets/OWASP_Code_Review_Guide_v2.pdf)
- [Nuclear-Grade Context Engineering: Code Review Command](https://github.com/flyfission/nuclear-grade-context-engineering/blob/main/commands/ng-code-review.md)
- [Cursor Thermo-Nuclear Code Quality Review Skill](https://github.com/cursor/plugins/blob/main/cursor-team-kit/skills/thermo-nuclear-code-quality-review/SKILL.md)
