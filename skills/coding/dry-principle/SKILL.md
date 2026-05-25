---
name: dry-principle
description: Refactors code to eliminate duplicate logic and knowledge by applying targeted abstraction techniques while balancing YAGNI to prevent over-engineering.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: dry principle, don't repeat yourself, duplicate code, remove duplication, refactor, abstraction tradeoffs, yagni balance
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: coding-abstraction-design-patterns, coding-refactoring-techniques, coding-clean-architecture
  archetypes:
    - tactical
    - diagnostic
  anti_triggers:
    - brainstorming
    - vague ideation
    - code golf
    - over-engineering
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
---

# DRY Principle in Software Engineering

Applies the Don't Repeat Yourself (DRY) principle to eliminate duplicate code and architectural knowledge by selecting the correct abstraction pattern, while evaluating whether duplication is actually safer than premature abstraction. When loaded, this skill makes the model act as a senior engineer performing targeted refactoring — distinguishing between safe copy-paste duplication and dangerous semantic duplication, then extracting abstractions only where the Rule of Three justifies them.

## TL;DR Checklist

- [ ] Classify duplication as code-level (syntactic similarity) vs knowledge-level (same business rule in multiple places) before choosing an abstraction pattern
- [ ] Apply the Rule of Three — defer abstraction until the pattern appears 3+ times across independent contexts
- [ ] Map duplication type to refactoring pattern: code → Extract Method; behavior → Strategy/Template Method; structure/configuration → Composition or config-driven logic
- [ ] Verify semantic equivalence after refactoring — runtime behavior must not change, verified by tests
- [ ] Audit for over-abstraction: if >20% of the new abstraction is unused by current callers, collapse it back (YAGNI)
- [ ] Keep abstractions narrow and focused on a single changing factor; avoid universal or generic interfaces

---

## When to Use

Use this skill when:

- Reviewing code with copy-paste blocks that perform the same validation, formatting, or business calculation
- Two or more functions share identical branching logic for different data types (behavior duplication)
- Business rules (discounts, pricing tiers, eligibility checks) appear scattered across multiple modules
- A new team member asks "why does this exist in three places?" during code review
- Technical debt backlog includes repeated refactoring of the same pattern across releases

## When NOT to Use

Avoid applying DRY aggressively when:

- The duplicated logic serves fundamentally different purposes — syntactic similarity without semantic overlap should not be merged (e.g., two functions named `validate` that check entirely different domains)
- Extracting would introduce a dependency between previously independent modules — sometimes duplication preserves encapsulation
- Only one or two call sites exist — the Rule of Three has not been met; premature abstraction creates indirection cost with no payoff
- The "duplication" is actually intentional variation — separate implementations for performance, platform compatibility, or compliance reasons

---

## Core Workflow

1. **Detect and Classify Duplication** — Walk the codebase looking for repeated code blocks (same lines, same structure) and repeated logic patterns (same branching, same business rules). Distinguish between trivial copy-paste duplication and semantic duplication where different code expresses the same intent. Checkpoint: Ask whether the duplicated logic is changing for different reasons. If yes, it's not a candidate for merging.

2. **Evaluate Abstraction Readiness** — Apply the Rule of Three. Has the pattern appeared at least three times across independently maintained files or modules? If fewer than three, defer refactoring and leave the duplication — it is cheaper to copy-paste fix twice than to maintain an abstraction that may never converge. Checkpoint: Confirm the duplication is stable and recurring, not a transient development artifact.

3. **Select Refactoring Pattern** — Map the duplication type to the correct extraction pattern:
   - Code-level (identical or near-identical lines) → Extract Method or utility function
   - Behavior-level (same structure, different implementation details) → Strategy pattern or Template Method
   - Structural/configuration-level (rules scattered across modules) → Centralized policy/rule engine or configuration-driven dispatch
   Checkpoint: Ensure the single responsibility boundary of the new abstraction aligns with what is actually changing.

4. **Implement Abstraction** — Write the extracted code with explicit type signatures and docstrings. Replace all call sites to use the new abstraction. Maintain semantic equivalence — every existing behavior must still be testable through the abstraction. Checkpoint: Run the full test suite; any regression means the extraction altered behavior and must be reverted or fixed.

5. **Audit for Over-Abstraction (DRY vs YAGNI)** — Review the new abstraction against YAGNI principles. Count lines of code in the abstraction that are never exercised by current callers. If >20% is dead code, remove the unneeded generics, conditionals, and optional parameters. Checkpoint: The abstraction should be simple enough that a developer can understand it by reading its signature and first 5 lines of body.

---

## Implementation Patterns

### Pattern 1: Code-Level Duplication → Extract Method

**Problem:** Identical or near-identical code blocks duplicated across multiple functions. The classic copy-paste problem.

```python
# ❌ BAD: Email validation duplicated across three handlers
def create_user_handler(request: dict) -> dict:
    email = request.get("email", "")
    if not email or "@" not in email:
        return {"error": "Invalid email"}
    if len(email) > 254:
        return {"error": "Email too long"}

def update_profile_handler(request: dict) -> dict:
    email = request.get("email", "")
    if not email or "@" not in email:
        return {"error": "Invalid email"}
    if len(email) > 254:
        return {"error": "Email too long"}

def export_user_handler(request: dict) -> dict:
    email = request.get("email", "")
    if not email or "@" not in email:
        return {"error": "Invalid email"}
    if len(email) > 254:
        return {"error": "Email too long"}
```

```python
# ✅ GOOD: Extracted into a single validation helper with clear contract
def validate_email(email: str | None) -> tuple[bool, str]:
    """Validate an email address and return (is_valid, error_message).

    Args:
        email: The email string to validate, may be None.

    Returns:
        Tuple of (success flag, error message on failure or empty string).
    """
    if not email:
        return False, "Email is required"
    if "@" not in email:
        return False, "Email must contain @"
    if len(email) > 254:
        return False, "Email exceeds maximum length of 254 characters"
    return True, ""


def create_user_handler(request: dict) -> dict:
    is_valid, error = validate_email(request.get("email"))
    if not is_valid:
        return {"error": error}
    # ... proceed with user creation

def update_profile_handler(request: dict) -> dict:
    is_valid, error = validate_email(request.get("email"))
    if not is_valid:
        return {"error": error}
    # ... proceed with profile update

def export_user_handler(request: dict) -> dict:
    is_valid, error = validate_email(request.get("email"))
    if not is_valid:
        return {"error": error}
    # ... proceed with export
```

**Key insight:** Code-level duplication is the lowest-risk refactoring. Extracting a function has no architectural consequences — call sites simply delegate to a shared helper. This is always safe when semantic equivalence is preserved.

---

### Pattern 2: Behavior Duplication → Strategy Pattern

**Problem:** Multiple functions share the same control flow (calculate → validate → apply) but implement different business rules for each variant. Copy-pasting the algorithm structure with swapped logic creates brittle duplication.

```python
# ❌ BAD: Pricing logic duplicated with branching — adding a new discount type
# requires editing every function and risks missing one call site
def calculate_subscription_discount(price: float, user: User) -> float:
    if user.premium:
        return price * 0.85  # 15% off for premium
    if user.youth:
        return price * 0.90  # 10% off for youth
    if user.loyalty_years > 3:
        return price * 0.95  # 5% off for loyalty
    return price

def calculate_promo_discount(price: float, promo_code: str) -> float:
    if promo_code == "SUMMER24":
        return price * 0.80  # 20% summer sale
    elif promo_code == "WELCOME10":
        return price * 0.90  # 10% new user
    elif promo_code == "BULK50":
        return price * 0.50  # 50% bulk order
    return price

def calculate_partner_discount(price: float, partner: Partner) -> float:
    if partner.tier == "gold":
        return price * 0.75  # 25% for gold partners
    elif partner.tier == "silver":
        return price * 0.85  # 15% for silver partners
    return price
```

```python
# ✅ GOOD: Strategy pattern — each discount is a pluggable, testable unit
from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class User:
    premium: bool = False
    youth: bool = False
    loyalty_years: int = 0


@dataclass
class Partner:
    tier: str = "bronze"


class DiscountStrategy(ABC):
    """Abstract base for discount calculation strategies."""

    @abstractmethod
    def calculate(self, price: float) -> float:
        """Return the discounted price."""
        ...


class PremiumDiscount(DiscountStrategy):
    def calculate(self, price: float) -> float:
        return price * 0.85


class YouthDiscount(DiscountStrategy):
    def calculate(self, price: float) -> float:
        return price * 0.90


class LoyaltyDiscount(DiscountStrategy):
    def __init__(self, years: int) -> None:
        self.years = years

    def calculate(self, price: float) -> float:
        if self.years > 3:
            return price * 0.95
        return price


class PromocodeDiscount(DiscountStrategy):
    _CODES: dict[str, float] = {
        "SUMMER24": 0.80,
        "WELCOME10": 0.90,
        "BULK50": 0.50,
    }

    def __init__(self, code: str) -> None:
        self.code = code

    def calculate(self, price: float) -> float:
        if self.code not in self._CODES:
            return price
        return price * self._CODES[self.code]


class PartnerDiscount(DiscountStrategy):
    _TIERS: dict[str, float] = {
        "gold": 0.75,
        "silver": 0.85,
    }

    def __init__(self, tier: str) -> None:
        self.tier = tier

    def calculate(self, price: float) -> float:
        return price * self._TIERS.get(self.tier, 1.0)


# Caller composes the strategy — no branching logic in the handler
def apply_best_discount(price: float, user: User) -> float:
    strategies = [
        PremiumDiscount() if user.premium else None,
        YouthDiscount() if user.youth else None,
        LoyaltyDiscount(user.loyalty_years) if user.loyalty_years > 3 else None,
    ]
    valid = [s for s in strategies if s is not None]
    if not valid:
        return price
    # Return the strategy yielding the lowest price
    return min(s.calculate(price) for s in valid)
```

**Key insight:** Strategy pattern replaces conditional branching with polymorphism. Adding a new discount type requires creating one new class and registering it — no existing function needs to change (Open/Closed Principle). This pays off at the third variant; the first two variants may not justify the abstraction.

---

### Pattern 3: Knowledge Duplication → Configuration / Composition

**Problem:** Business rules (eligibility, compliance, pricing tiers) are duplicated across modules as if-elif chains. Each module re-implements the same rule with slight variations, making it impossible to update a rule in one place.

```python
# ❌ BAD: Eligibility rules duplicated across three separate modules
# Every time the business changes a rule, all three must be found and updated

# --- orders/fulfillment.py ---
def check_order_eligibility(order: Order) -> bool:
    if order.amount > 10000:
        return False  # exceeds single-order limit
    if not order.shipping_address.country in ("US", "CA", "MX"):
        return False  # shipping region restricted
    if any(item.category == "restricted" for item in order.items):
        return False  # restricted category
    return True

# --- orders/returns.py ---
def check_return_eligibility(return_req: ReturnRequest) -> bool:
    if return_req.amount > 10000:
        return False  # exceeds single-order limit
    if not return_req.shipping_address.country in ("US", "CA", "MX"):
        return False  # shipping region restricted
    if any(item.category == "restricted" for item in return_req.items):
        return False  # restricted category
    return True

# --- orders/exports.py ---
def check_export_eligibility(order: Order) -> bool:
    if order.amount > 10000:
        return False  # exceeds single-order limit
    if not order.shipping_address.country in ("US", "CA", "MX"):
        return False  # shipping region restricted
    if any(item.category == "restricted" for item in order.items):
        return False  # restricted category
    return True
```

```python
# ✅ GOOD: Centralized policy engine — rules defined once, applied everywhere
from dataclasses import dataclass, field
from typing import Protocol


@dataclass(frozen=True)
class Address:
    country: str


@dataclass
class OrderItem:
    category: str


@dataclass
class OrderBase(Protocol):
    amount: float
    shipping_address: Address
    items: list[OrderItem]


# Rules are data, not code — easy to inspect, test, and modify
RESTRICTED_COUNTRIES = frozenset({"US", "CA", "MX"})
MAX_ORDER_AMOUNT = 10_000.0
RESTRICTED_CATEGORIES = frozenset({"restricted"})


class EligibilityRule(Protocol):
    """A single eligibility check that returns True if the order passes."""

    def passes(self, order: OrderBase) -> bool: ...


class MaxAmountRule:
    def __init__(self, limit: float = MAX_ORDER_AMOUNT) -> None:
        self.limit = limit

    def passes(self, order: OrderBase) -> bool:
        return order.amount <= self.limit


class CountryRule:
    def __init__(self, allowed: frozenset[str] = RESTRICTED_COUNTRIES) -> None:
        self.allowed = allowed

    def passes(self, order: OrderBase) -> bool:
        return order.shipping_address.country in self.allowed


class CategoryRule:
    def __init__(self, restricted: frozenset[str] = RESTRICTED_CATEGORIES) -> None:
        self.restricted = restricted

    def passes(self, order: OrderBase) -> bool:
        return not any(item.category in self.restricted for item in order.items)


# Policy composes rules — adding a new rule is adding a class, editing none
class EligibilityPolicy:
    """Applies all registered rules; an order passes only if every rule passes."""

    def __init__(self, rules: list[EligibilityRule] | None = None) -> None:
        self.rules: list[EligibilityRule] = rules or [
            MaxAmountRule(),
            CountryRule(),
            CategoryRule(),
        ]

    def passes(self, order: OrderBase) -> bool:
        return all(rule.passes(order) for rule in self.rules)


# Every module imports the same policy — zero duplication of business knowledge
default_policy = EligibilityPolicy()


def check_order_eligibility(order: OrderBase) -> bool:
    return default_policy.passes(order)


def check_return_eligibility(return_req: OrderBase) -> bool:
    return default_policy.passes(return_req)


def check_export_eligibility(order: OrderBase) -> bool:
    return default_policy.passes(order)


# To add a new rule, you add one class and register it once — no search-and-replace across modules
class ComplianceRule:
    """Example: additional rule that doesn't require changing any existing code."""

    def passes(self, order: OrderBase) -> bool:
        return not any(
            item.category == "compliance-flagged" for item in order.items
        )


# One-time registration — policy now applies everywhere automatically
default_policy.rules.append(ComplianceRule())
```

**Key insight:** Knowledge duplication (business rules scattered as code) is the most dangerous form. It creates an illusion of correctness — each module looks right individually, but changing a rule requires finding every instance. The configuration/composition pattern treats rules as data objects that can be composed, tested independently, and updated in one place.

---

## Constraints

### MUST DO

- Apply the Rule of Three before extracting any abstraction — wait until duplication appears three times across independent contexts
- Verify semantic equivalence after refactoring by running the full test suite; behavior must not change
- Keep abstractions narrow and focused on a single changing factor; a function or class with more than two responsibilities is over-abstracted
- Document why duplication existed (and was kept) if collapsing it would break encapsulation between independent modules
- Use typed signatures and docstrings in all extracted functions to make the abstraction discoverable

### MUST NOT DO

- Abstract code that has appeared fewer than three times independently — premature abstraction creates maintenance overhead with no benefit
- Create "universal" abstractions with generic type parameters or conditional branching to solve hypothetical future duplication (violates YAGNI)
- Extract methods solely to reduce file length, line counts, or satisfy linter metrics — DRY is about knowledge, not aesthetics
- Hide business logic behind excessive indirection layers just to eliminate copy-paste — readability tracts abstraction depth

---

## Live References

> Authoritative documentation links for the DRY principle, refactoring patterns, and Clean Code. These links are resolved at load time by the markdown link following feature.

- [DRY Principle — Wikipedia](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself) — Overview of the principle and its origins
- [Clean Code Chapter 3: Functions — Robert C. Martin](https://www.oreilly.com/library/view/clean-code/9780132350884/) — Principles for writing functions that are short, focused, and reusable
- [Refactoring.guru — Extract Method](https://refactoring.guru/refactoring/extract-method) — Step-by-step guide to the most fundamental refactoring technique
- [Refactoring.guru — Strategy Pattern](https://refactoring.guru/replace-conditionals-with-strategy) — How to replace conditional branching with pluggable strategies
- [The Rule of Three — Robert C. Martin, Clean Code Talks](https://blog.cleancoder.com/uncle-bob/2017/05/30/TheRuleOfThree.html) — Uncle Bob's clarification: wait for the third occurrence before abstracting
- [Refactoring.guru — Template Method Pattern](https://refactoring.guru/replace-inheritance-with-delegation) — When inheritance-based duplication should be replaced with composition
- [Don't Repeat Yourself (DRY) Principle — Martin Fowler, Refactoring.com](https://martinfowler.com/bliki/DRY.html) — Fowler's nuanced take on DRY including the distinction between duplication of knowledge vs. duplication of structure

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-abstraction-design-patterns` | Covers when and how to choose between different abstraction patterns (Strategy, Template Method, Factory, etc.) beyond just DRY extraction |
| `coding-refactoring-techniques` | Provides the broader refactoring toolkit — Extract Variable, Rename, Introduce Parameter Object — that complements DRY refactoring |
| `coding-clean-architecture` | Architectural guidance on separation of concerns and dependency management — related because clean architecture naturally reduces duplication at the design level |

---

## Anti-Patterns to Avoid

**Fake DRY (DRY done badly):** Merging two similar-but-different code paths into a single function with flags and conditionals. This creates coupling between formerly independent concerns and makes the code harder to read than the original duplication.

```python
# ❌ FAKE DRY: Merged validation with a flag — couples two independent concerns
def validate_entity(data: dict, entity_type: str, strict_mode: bool = False) -> bool:
    errors = []
    # Entity-specific checks mixed with shared logic via flags
    if entity_type == "user":
        if not data.get("email"):
            errors.append("Email required")
        if strict_mode and not data.get("phone"):
            errors.append("Phone required in strict mode")
    elif entity_type == "admin":
        if not data.get("email"):
            errors.append("Email required")
        if strict_mode:
            if not data.get("badge_id"):
                errors.append("Badge ID required")

    # This is DRY in name only — the branching makes it harder to understand than separate functions
    return len(errors) == 0
```

**Solution:** Keep separate validation functions and extract only what is genuinely shared (e.g., a helper that checks email format, applied from both validators).

---

## DRY vs YAGNI Decision Framework

When uncertain whether to abstract duplicated code, walk through this decision tree:

1. **Does the duplication share the same business intent?** If different purposes → keep separate.
2. **Has it appeared 3+ times across independent files?** If fewer → defer.
3. **Would extracting create a new module-level dependency between previously independent modules?** If yes and no clear caller needs both → keep separate.
4. **Is the extracted abstraction simpler than the duplication it replaces?** If the abstraction adds more complexity (generic types, conditional dispatch, configuration) than it removes → don't extract yet.
5. **Is >20% of the abstraction unused by current callers?** If yes → collapse unused parameters back into caller-specific functions.

If you answer YES to steps 1 and 2, AND NO to steps 3 and 4 → proceed with extraction. Step 5 is a safety net: if the result is bloated, abort and accept the duplication temporarily.
