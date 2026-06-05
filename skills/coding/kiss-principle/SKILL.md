---




name: kiss-principle
description: Detects and prevents over-engineering by enforcing the KISS principle (Keep It Simple, Stupid) through code simplification, abstraction reduction, and preference for straightforward solutions.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: kiss principle, keep it simple stupid, over-engineering, simplicity, avoid complexity, unnecessary abstraction, how do i simplify my code, reduce boilerplate
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: yagni, dry-principles, single-responsibility, open-closed-principle, abstraction-design-patterns
  archetypes:
    - tactical
    - diagnostic
  anti_triggers:
    - brainstorming
    - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational




---





# KISS Principle — Keep It Simple, Stupid

Enforces simplicity by detecting over-engineering, reducing unnecessary abstractions, and preferring straightforward solutions. When reviewing or writing code, the model evaluates whether complexity is justified by actual requirements rather than speculative needs, and refactors toward simpler alternatives that preserve correctness and readability.

## TL;DR Checklist

- [ ] Prefer `if/else` chains over state machines when cases ≤ 3
- [ ] Remove abstractions that exist only for hypothetical future use
- [ ] Choose composition over inheritance when both solve the problem equally well
- [ ] Use built-in language features instead of custom implementations
- [ ] Name functions after what they do, not how they are abstracted
- [ ] Question every generic type parameter — is it actually used polymorphically?
- [ ] One-level-deep indentation rule: if nesting exceeds 3 levels, extract a function

---

## When to Use

Use this skill when:

- Reviewing code that feels overly complex for what it accomplishes
- A design uses multiple abstraction layers (interfaces → implementations → factories → decorators) for a single-purpose module
- Code has generic type parameters or wrapper classes with no real polymorphic behavior
- A new developer is proposing "future-proof" abstractions for requirements that don't exist yet
- Refactoring code where simplicity would improve readability without sacrificing correctness
- The codebase is growing harder to navigate due to indirection rather than solving a scale problem

## When NOT to Use

Avoid this skill for:

- Domain models that genuinely require polymorphic behavior across many implementations (use `open-closed-principle` instead)
- Systems with real, proven scale requiring distributed complexity (microservices, event sourcing)
- API contracts where abstraction is mandated by external constraints (frameworks, protocol specs)
- Cases where "simple" means hiding important complexity that users need to control

---

## Core Workflow

1. **Measure Actual vs Speculated Complexity** — Count the number of concrete implementations for each abstraction. If an interface has exactly one implementation and no evidence of a second imminent, flag it for removal. **Checkpoint:** Verify that removing the abstraction would not break existing polymorphic call sites.

2. **Trace the Indirection Depth** — Follow a single logical operation through the codebase counting layer hops: entry point → controller → service → repository → database. If more than 3 layers exist for an operation under 50 lines of actual logic, each intermediate layer must justify its existence with unique behavior beyond pass-through. **Checkpoint:** Each intermediate layer should have ≥ 2 meaningful lines of business logic, not just delegation.

3. **Apply the Rule of Three** — Before creating a generic abstraction (function, class, module), identify three distinct use cases that share the same structure. Two similar use cases should be handled by copying and slight modification; only at three do you factor out commonality. **Checkpoint:** The proposed abstraction must serve ≥ 3 callers with genuinely different parameterizations, not just 2 nearly identical ones.

4. **Prefer Explicit Over Implicit** — Replace magic configuration, metaprogramming, reflection-based dispatch, and dynamic method generation with explicit control flow (if/elif/else, match/case, dispatch tables). Readable branching beats invisible routing. **Checkpoint:** Every implicit behavior must have a corresponding explicit alternative that is equally short.

5. **Evaluate Built-in First** — Before writing custom sorting, parsing, caching, retry logic, or error handling, check if the standard library or a well-tested third-party package already provides it. `std::sort`, `collections.defaultdict`, `functools.lru_cache` beat hand-rolled alternatives every time. **Checkpoint:** The built-in solution must cover ≥ 90% of use cases without workarounds.

6. **Simplify Refactor** — When presenting a simpler alternative, show the original code and the simplified version side by side with specific lines removed or merged. Do not just describe the change — demonstrate it. **Checkpoint:** The refactored version must have ≤ 75% of the original line count while preserving all behavior.

---

## Implementation Patterns

### Pattern 1: Kill the Unnecessary Interface (BAD vs GOOD)

```python
# ❌ BAD — interface with one implementation, zero polymorphic usage
class PaymentProcessorInterface(Protocol):
    def process(self, amount: float, currency: str) -> TransactionResult: ...

class StripePaymentProcessor(PaymentProcessorInterface):
    def process(self, amount: float, currency: str) -> TransactionResult:
        return stripe.charges.create(amount=amount, currency=currency)

# Another module just wraps it further — double indirection
class PaymentFacade:
    def __init__(self) -> None:
        self._processor: PaymentProcessorInterface = StripePaymentProcessor()

    def charge(self, amount: float, currency: str) -> TransactionResult:
        return self._processor.process(amount, currency)  # pass-through


# ✅ GOOD — direct function, no unnecessary abstraction layers
def process_stripe_payment(
    amount: float,
    currency: str,
    *,
    api_key: str | None = None,
) -> TransactionResult:
    """Process a payment via Stripe.

    Simple function that does one thing. If a second provider is needed later,
    an abstraction can be introduced with three callers already in place.
    """
    return stripe.charges.create(
        amount=amount,
        currency=currency,
        api_key=api_key or os.environ["STRIPE_KEY"],
    )

# Usage — explicit, no indirection:
result = process_stripe_payment(100.0, "usd")
```

### Pattern 2: Replace Over-Abstracted Factory with Direct Call (BAD vs GOOD)

```python
# ❌ BAD — factory hierarchy for two concrete types
class BaseHandler(ABC):
    @abstractmethod
    def handle(self, request: Request) -> Response: ...

class LoginHandler(BaseHandler):
    def handle(self, request: Request) -> Response:
        return _authenticate(request.body["user"], request.body["pass"])

class LogoutHandler(BaseHandler):
    def handle(self, request: Request) -> Response:
        return _invalidate_session(request.cookies["session_id"])

class HandlerFactory(ABC):
    @abstractmethod
    def create(self, handler_type: str) -> BaseHandler: ...

class ConcreteHandlerFactory(HandlerFactory):
    def create(self, handler_type: str) -> BaseHandler:
        if handler_type == "login":
            return LoginHandler()
        if handler_type == "logout":
            return LogoutHandler()
        raise ValueError(f"Unknown handler: {handler_type}")


# ✅ GOOD — simple dispatch table or direct routing
HANDLERS: dict[str, Callable[[Request], Response]] = {
    "login": _handle_login,
    "logout": _handle_logout,
}

def route_request(handler_key: str, request: Request) -> Response:
    handler = HANDLERS.get(handler_key)
    if handler is None:
        raise ValueError(f"Unknown handler: {handler_key}")
    return handler(request)


def _handle_login(request: Request) -> Response:
    return _authenticate(request.body["user"], request.body["pass"])

def _handle_logout(request: Request) -> Response:
    return _invalidate_session(request.cookies["session_id"])
```

### Pattern 3: Simplify Nested Conditionals (BAD vs GOOD)

```python
# ❌ BAD — deep nesting, hard to follow control flow
def calculate_discount(order: Order) -> float:
    total = order.total()
    if order.user.is_premium:
        if total > 100:
            if order.items[0].category != "electronics":
                return total * 0.20
            else:
                return total * 0.10
        else:
            return total * 0.05
    elif total > 50:
        return total * 0.05
    else:
        return 0.0


# ✅ GOOD — guard clauses, single level of nesting via early returns
def calculate_discount(order: Order) -> float:
    """Calculate discount based on membership and cart value."""
    if not order.user.is_premium and order.total() <= 50:
        return 0.0

    total = order.total()
    base_rate = 0.05 if total > 50 else 0.10

    if order.user.is_premium and total > 100:
        electronics_first = order.items[0].category == "electronics"
        return total * (0.20 if not electronics_first else 0.10)

    return total * base_rate
```

### Pattern 4: Prefer Standard Library Over Custom Utilities (BAD vs GOOD)

```python
import os
from pathlib import Path
import json
from typing import Any


# ❌ BAD — custom JSON file I/O wrapper for what stdlib handles directly
class FileCache:
    def __init__(self, path: str) -> None:
        self._path = path

    def read(self) -> dict[str, Any]:
        if not os.path.exists(self._path):
            return {}
        with open(self._path, "r") as f:
            return json.load(f)

    def write(self, data: dict[str, Any]) -> None:
        with open(self._path, "w") as f:
            json.dump(data, f, indent=2)


# ✅ GOOD — use pathlib + json directly; if wrapping is needed, do it minimally
def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text()) if path.exists() else {}

def write_json(path: Path, data: dict[str, Any]) -> None:
    path.write_text(json.dumps(data, indent=2))


# Usage — clear and direct:
cache_file = Path("/tmp/config.json")
config = read_json(cache_file) or {}
write_json(cache_file, {"key": "value"})
```

---

## Constraints

### MUST DO
- Always ask "how many concrete implementations exist?" before accepting an abstraction as necessary
- Measure actual complexity (cyclomatic complexity, nesting depth, indirection hops) against claimed simplicity
- Prefer code duplication over the wrong abstraction — copy at 2x similarity, factor at 3x
- Use early returns and guard clauses to flatten nested conditionals
- Name functions and classes after their concrete behavior, not abstract concepts ("ProcessPayment" not "PaymentStrategyExecutor")
- Show before/after examples when suggesting simplifications

### MUST NOT DO
- Remove abstractions that genuinely serve ≥ 3 polymorphic callers
- Favor simplicity over correctness — a simple bug is still a bug
- Introduce complexity for code golf or micro-optimizations that hurt readability
- Use KISS to justify leaving dead, unmaintained "simple" code in place — remove it instead
- Assume the first solution is always simplest; sometimes the simplest path requires choosing the right tool/library

---

## Anti-Patterns Quick Reference

| Anti-Pattern | What It Looks Like | Simple Fix |
|---|---|---|
| **Premature Genericity** | `class Manager<T, U, V>` with no evidence all 3 type params will ever vary independently | Remove generic params one at a time until compilation still passes |
| **Facade Anti-Pattern** | Service → Repository → DAO → Adapter — four layers doing pass-through | Collapse to two: Service → Database (or whichever layer has real logic) |
| **Callback Hell** | Nested `.then().then().then()` or deeply nested callbacks | Use `async/await`, top-level promises, or a flat chain |
| **Configuration Overload** | 20+ config flags for a feature used at one setting | Bake defaults that match the common case; expose only exceptions |
| **Enum Hell** | Enums with 15+ values where most are dead code | Split into focused enums or replace with booleans/flags |

---

## Metrics for Simplicity

Use these quantitative measures to verify KISS compliance:

### Cyclomatic Complexity
- Target: ≤ 5 per function
- Action threshold: ≥ 10 — refactor immediately
- Acceptable maximum: ≤ 7 with guard clauses and clear naming

### Nesting Depth
- Target: ≤ 2 levels of indentation (if/elif/else inside function body)
- Action threshold: ≥ 3 — extract functions or use guard clauses
- Use the "one-level-deep" rule: each conditional should be one level; if it nests, consider extracting

### Indirection Hops
- Target: ≤ 2 hops from public API to actual implementation
- Action threshold: ≥ 4 — audit each hop for necessity
- Count: entry → (each intermediate function/call) → final implementation line

### File Size
- Target: ≤ 300 lines per file
- Action threshold: ≥ 500 — split by responsibility, not just by cutting in half
- A file with 200 lines of tests + 100 lines of code is acceptable; 300 lines of code is not

---

## Output Template

When applying the KISS principle review or simplification:

1. **Original Code Snippet** — The specific section being reviewed (with line context)
2. **Complexity Diagnosis** — Which KISS violation(s) apply (premature abstraction, indirection depth, nesting, etc.) with metric values
3. **Simplified Version** — Complete refactored code that is ≤ 75% of original lines
4. **Behavioral Parity Confirmation** — Brief statement confirming the simplified version produces identical outputs for all inputs
5. **Refactoring Rationale** — One sentence explaining why this simplification is safe (e.g., "single implementation, no polymorphic callers")

---

## Related Skills

| Skill | Purpose |
|---|---|
| `yagni` | Prevents building features nobody needs — KISS's partner in anti-over-engineering |
| `dry-principles` | DRY can conflict with KISS; this skill clarifies when duplication is the simpler choice |
| `single-responsibility` | SRP and KISS reinforce each other when classes do too many things at once |
| `abstraction-design-patterns` | Shows how to design abstractions that stay simple rather than growing complex |
| `open-closed-principle` | OCP sometimes requires more abstraction; KISS helps decide when it's worth it |

---

## Live References

- [The Pragmatic Programmer (KISS in practice)](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition-2/)
- [PEP 20 — The Zen of Python](https://peps.python.org/pep-0020/) ("Simple is better than complex")
- [Robert C. Martin on Simplicity (Clean Code)](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)
- [Martin Fowler — Two Hard Things](https://martinfowler.com/bliki/TwoHardThings.html) ("naming and cache invalidation")
- [Cyclomatic Complexity (McCabe, 1976)](https://en.wikipedia.org/wiki/Cyclomatic_complexity)
