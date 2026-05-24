---
name: yagni-principle
description: Applies the YAGNI principle to prevent over-engineering by eliminating premature abstractions, unused features, and speculative complexity from codebases.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: yagni, you aren't gonna need it, don't build it now, over-engineering, premature abstraction, speculative features, remove unused code, kill dead code
  archetypes:
    - tactical
    - diagnostic
  anti_triggers:
    - brainstorming
    - vague ideation
    - over-engineering
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: kiss-principle, technical-debt-management, refactoring-techniques, engineering-principles
---

# YAGNI Principle — Preventing Over-Engineering

Applies the YAGNI (You Aren't Gonna Need It) principle from Extreme Programming to detect and eliminate premature abstractions, unused feature paths, dead code, and speculative complexity. When reviewing or writing code, the model identifies features built for hypothetical future requirements and refactors them down to what is actually needed today — without confusing YAGNI with having no design at all.

## TL;DR Checklist

- [ ] Every interface, factory, or abstract class must have ≥ 2 concrete callers OR a documented immediate second implementation
- [ ] Flag any feature flag that has been active for > 30 days as dead code — remove it, keep only flags actively gating unfinished work
- [ ] Remove unused parameters from public APIs; replace with separate functions if the parameter is only needed in one call site
- [ ] Audit every "pluggable" or "configurable" component: if only one value exists in production, bake it as a constant
- [ ] When writing new code, ask "what is the absolute minimum that works?" — then implement that, and nothing more
- [ ] Distinguish YAGNI from lazy design: use patterns when an actual requirement demands them, not when a book says you should
- [ ] Track speculative complexity as technical debt with `technical-debt-management` if removal would break something in flight

---

## When to Use

Use this skill when:

- Reviewing code where a class has an interface with only one implementation and no second one on the roadmap
- Spotting factory patterns, strategy enums, or plugin systems built for "future extensibility" that doesn't exist yet
- Finding feature flags that gate code nobody can ever turn off (the feature was shipped months ago)
- Encountering generic helper classes like `StringFormatterUtil` with 50 methods used from only three call sites
- Writing new code and a developer proposes an abstraction for "what if we need X later"
- Auditing a codebase for dead code paths, unused branches, or speculative APIs documented but never called
- Refactoring legacy code where multiple implementation variants exist but only one is ever invoked

---

## When NOT to Use

Avoid applying YAGNI when:

- Building a library or SDK where forward compatibility and API stability are explicit requirements — here, genericity is a feature, not speculation
- Implementing a plugin architecture that the product roadmap has already approved with concrete vendor integrations in progress
- Writing framework code where the abstraction serves hundreds of third-party callers (the "users" are external consumers)
- The codebase is an internal tool used by exactly one team — simplicity within that team's workflow matters more than generic extensibility
- An abstraction exists to satisfy a legal or compliance constraint (e.g., data residency requiring pluggable storage backends for regulatory reasons)

---

## Core Workflow

1. **Identify Speculative Abstractions** — Scan for interfaces, abstract base classes, and factory patterns. Count concrete implementations and distinct call sites. If an interface has exactly one implementation and no second is scheduled within the current quarter, flag it for removal. **Checkpoint:** Verify no reflection-based or configuration-driven dispatch uses this abstraction at runtime before removing.

2. **Audit Feature Flags** — List every feature flag in the codebase. Cross-reference with deployment history: flags active > 30 days past their target date are dead. Flags where the `if` body has been true for every release since inception are also dead — the conditional should become unconditional. **Checkpoint:** Confirm the flag is not used in A/B tests or canary deployments before removal.

3. **Trace Unused Code Paths** — Use static analysis or IDE navigation to find functions, classes, or modules with zero callers. Check git blame to confirm no one has called it in the last 6 months. Also check for `# type: ignore` blocks that guard unreachable exception handlers. **Checkpoint:** For each dead function, verify the git history doesn't show recent activity that suggests it will be needed again (e.g., a recently rewritten integration).

4. **Simplify Parameterized APIs** — Identify public functions or methods with boolean flags, optional enum parameters, or `null`-able types used in only one branch. Extract them into separate named functions instead of parameterizing one function for two behaviors. **Checkpoint:** The new split functions must have distinct, meaningful names — not just `func_with_flag=True/False`.

5. **Collapse Over-Abstracted Layers** — When a code path flows through Interface → ImplA → ImplB → RealDB, count the indirection hops. If each layer adds fewer than three lines of unique logic, collapse it into a single function or class. **Checkpoint:** After collapsing, verify all import statements and type annotations still resolve correctly.

6. **Document Remaining Abstractions** — For abstractions you keep, add a comment documenting the actual second use case that justifies them. If you cannot write one in plain English within 15 seconds, remove it. **Checkpoint:** The justification comment must name the second caller or concrete upcoming requirement, not "extensibility."

---

## Implementation Patterns / Reference Guide

### Pattern 1: Kill Premature Interface (BAD vs GOOD)

```python
# ❌ BAD — interface created before a second implementation exists
# File: payment/interface.py
from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class TransactionResult:
    transaction_id: str
    status: str
    amount: float


class PaymentGateway(ABC):
    """Abstract payment gateway for future multi-provider support."""

    @abstractmethod
    def charge(self, amount: float, currency: str) -> TransactionResult: ...


class StripeGateway(PaymentGateway):
    """Currently the only payment provider. No second provider on any roadmap."""

    def charge(self, amount: float, currency: str) -> TransactionResult:
        # ... stripe SDK call ...
        return TransactionResult(
            transaction_id="txn_abc123", status="succeeded", amount=amount
        )


class PaymentService:
    """Depends on the abstraction — but only ever receives StripeGateway."""

    def __init__(self, gateway: PaymentGateway) -> None:
        self.gateway = gateway  # Single dependency injection for zero polymorphism

    def process(self, amount: float, currency: str) -> TransactionResult:
        return self.gateway.charge(amount, currency)  # Pure pass-through


# Usage — unnecessarily complex wiring for a single provider:
# service = PaymentService(StripeGateway())
# result = service.process(100.0, "usd")


# ✅ GOOD — direct function, no abstraction overhead
from dataclasses import dataclass


@dataclass
class TransactionResult:
    transaction_id: str
    status: str
    amount: float


def process_stripe_payment(
    amount: float,
    currency: str,
) -> TransactionResult:
    """Process a payment via Stripe.

    Simple function for the current single-provider setup. If a second provider
    is added and multiple callers need polymorphic dispatch, an abstraction can
    be introduced at that point — not before.
    """
    # ... direct stripe SDK call ...
    return TransactionResult(
        transaction_id="txn_abc123", status="succeeded", amount=amount
    )


# Usage — clear and direct:
result = process_stripe_payment(100.0, "usd")
```

### Pattern 2: Remove Dead Feature Flag (BAD vs GOOD)

```python
# ❌ BAD — feature flag for a shipped feature that's been active for 8 months
class OrderProcessor:
    def calculate_total(self, order: Order) -> Decimal:
        total = sum(item.price * item.qty for item in order.items)

        # Feature was shipped on 2025-09-01 with flag ENABLED. Still here.
        if settings.FEATURE_FLAG_NEW_TAX_CALCULATION:
            tax = self._calculate_new_tax(order)
        else:
            tax = self._calculate_legacy_tax(order)

        return total + tax

    def _calculate_legacy_tax(self, order: Order) -> Decimal:
        """Legacy tax logic — never called since flag was flipped."""
        return sum(
            item.price * item.qty * 0.08 for item in order.items if item.taxable
        )

    def _calculate_new_tax(self, order: Order) -> Decimal:
        """New tax logic with proper jurisdiction-aware rates."""
        tax_rate = self._get_jurisdiction_tax_rate(order.shipping_address)
        return sum(
            item.price * item.qty * tax_rate for item in order.items if item.taxable
        )


# ✅ GOOD — dead flag removed, conditional replaced with the active implementation
class OrderProcessor:
    def calculate_total(self, order: Order) -> Decimal:
        total = sum(item.price * item.qty for item in order.items)
        tax_rate = self._get_jurisdiction_tax_rate(order.shipping_address)
        tax = sum(
            item.price * item.qty * tax_rate
            for item in order.items
            if item.taxable
        )
        return total + tax

    def _get_jurisdiction_tax_rate(self, address: Address) -> Decimal:
        """Look up the tax rate for the given jurisdiction."""
        # ... database or config lookup ...
        return Decimal("0.08")  # Placeholder for actual lookup logic
```

### Pattern 3: Collapse Over-Abstracted Factory (BAD vs GOOD)

```python
# ❌ BAD — factory pattern when a simple dict dispatch suffices
from abc import ABC, abstractmethod
from enum import Enum
from typing import Protocol


class FormatterType(Enum):
    JSON = "json"
    CSV = "csv"


class DataFormatter(Protocol):
    def format(self, data: list[dict]) -> str: ...


class JsonFormatter:
    def format(self, data: list[dict]) -> str:
        import json

        return json.dumps(data, indent=2)


class CsvFormatter:
    def format(self, data: list[dict]) -> str:
        if not data:
            return ""
        import csv
        import io

        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)
        return output.getvalue()


class FormatterFactory:
    """Creates formatters based on type enum."""

    @staticmethod
    def create(formatter_type: FormatterType) -> DataFormatter:
        if formatter_type == FormatterType.JSON:
            return JsonFormatter()
        elif formatter_type == FormatterType.CSV:
            return CsvFormatter()
        raise ValueError(f"Unknown formatter: {formatter_type}")


# Consumer code — three extra layers of indirection for two concrete types:
fmt = FormatterFactory.create(FormatterType.JSON)
output = fmt.format(data)


# ✅ GOOD — flat dispatch table, no factory, no protocol
from typing import Callable


def _format_json(data: list[dict]) -> str:
    """Format data as JSON."""
    import json

    return json.dumps(data, indent=2)


def _format_csv(data: list[dict]) -> str:
    """Format data as CSV."""
    if not data:
        return ""
    import csv
    import io

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=data[0].keys())
    writer.writeheader()
    writer.writerows(data)
    return output.getvalue()


_FORMATTERS: dict[str, Callable[[list[dict]], str]] = {
    "json": _format_json,
    "csv": _format_csv,
}


def format_data(
    data: list[dict],
    fmt: str,
) -> str:
    """Format data using the requested formatter.

    Args:
        data: List of row dictionaries to format.
        fmt: One of 'json' or 'csv'.

    Returns:
        Formatted string output.

    Raises:
        ValueError: If fmt is not a supported format key.
    """
    formatter = _FORMATTERS.get(fmt)
    if formatter is None:
        raise ValueError(f"Unknown format '{fmt}'. Supported: {list(_FORMATTERS.keys())}")
    return formatter(data)


# Usage — direct, no factory, no protocol:
output = format_data(data, "json")
```

### Pattern 4: Eliminate Speculative Multi-Return API (BAD vs GOOD)

```python
# ❌ BAD — returning data structures for use cases that don't exist yet
class ReportGenerator:
    def generate_report(
        self,
        start_date: str,
        end_date: str,
        *,
        include_charts: bool = False,
        include_summary: bool = True,
        export_format: str = "json",
        timezone: str = "UTC",
    ) -> dict:
        """Generate a report with many optional parameters.

        include_charts — only used by the dashboard team (not built yet)
        export_format — only JSON is supported; 'pdf' and 'xlsx' are stubs
        timezone — always falls back to UTC in production
        """
        data = self._fetch_data(start_date, end_date, timezone)

        result: dict = {"data": data}

        if include_summary:
            result["summary"] = self._compute_summary(data)

        # Speculative: charts API not implemented
        if include_charts:
            result["charts"] = []  # Always empty list — no chart data exists

        # Speculative: export_format is always "json" at this point
        if export_format == "pdf":
            raise NotImplementedError("PDF export not implemented")
        elif export_format == "xlsx":
            raise NotImplementedError("XLSX export not implemented")

        return result


# ✅ GOOD — split into focused functions, each with a real caller
class ReportService:
    def get_report_data(
        self,
        start_date: str,
        end_date: str,
        timezone: str = "UTC",
    ) -> dict:
        """Fetch raw report data for the given date range."""
        return self._fetch_data(start_date, end_date, timezone)

    def get_report_summary(
        self,
        report_data: dict,
    ) -> dict:
        """Compute summary statistics from report data."""
        return self._compute_summary(report_data["data"])

    def get_full_report(
        self,
        start_date: str,
        end_date: str,
        timezone: str = "UTC",
    ) -> dict:
        """Generate a complete report with data and summary.

        This is the only function that needs both data and summary.
        """
        data = self._fetch_data(start_date, end_date, timezone)
        return {
            "data": data,
            "summary": self._compute_summary(data),
        }
```

---

## Constraints

### MUST DO
- Remove every abstraction that serves fewer than two concrete callers or has no documented second use case
- Replace dead feature flags with unconditional code — the flag's `if` body becomes the only branch
- Split functions overloaded with optional parameters into separate named functions, one per behavior
- Collapse factory patterns into simple dispatch tables or direct function calls when there are ≤ 3 implementations
- Comment any kept abstraction with the specific second use case that justifies it — not "for extensibility"
- Treat unused code as a fire hazard — delete it immediately; git history preserves what you need

### MUST NOT DO
- Remove abstractions that genuinely serve ≥ 2 callers with independent implementations
- Confuse YAGNI with having zero architecture — build the simplest thing that works for the requirement today
- Keep dead code "just in case" — if you need it, recover it from version control
- Use YAGNI to justify leaving a clearly broken or unmaintainable implementation in place
- Remove feature flags that gate active A/B tests or canary deployments without confirming they are complete
- Factor out commonality at 2x similarity — duplicate first, generalize at 3x (see `kiss-principle` Rule of Three)

---

## Anti-Patterns Quick Reference

| Anti-Pattern | What It Looks Like | YAGNI Fix |
|---|---|---|
| **Protocol for one impl** | `class MyInterface(Protocol): ... class MyImpl(MyInterface): ...` with no second implementation in sight | Replace the protocol + impl pair with a simple function or class |
| **Factory for two items** | `class Factory: def create(type): if type == A: return A() elif type == B: return B()` | Replace with a dict dispatch table or direct calls |
| **Feature flag staleness** | `if settings.FLAG_OLD_FEATURE:` guarding code shipped 6 months ago | Remove the flag; inline the active branch's body |
| **Utility class sprawl** | `class StringUtils: @staticmethod def trim() ... @staticmethod def slugify() ...` with 30 methods called from 1 site each | Move each method to its single call site, or keep only what is used |
| **Null-flagged parameters** | `def process(data, use_cache=True): if use_cache: return self._cache.get(data)` | Split into `process_from_cache()` and `process_direct()` — each with a real name and a real caller |

---

## Metrics for YAGNI Compliance

Use these quantitative measures to verify YAGNI compliance during code reviews:

### Abstraction Count
- Count interfaces/protocols per module. Target: ≤ 1 interface per 5 concrete implementations, or zero if all are single-use.
- Action threshold: any interface with exactly one implementation triggers immediate review.

### Feature Flag Age
- Every feature flag older than 30 days past its target ship date should be audited.
- Flags where the active branch has been taken on every release are dead code.

### Parameter Bloat Index
- For each public function, count boolean flags and `Optional`/`None` default parameters.
- Target: ≤ 1 optional parameter per function. If a function has ≥ 3 optionals that gate different behaviors, split it.

### Dead Code Ratio
- Measure the ratio of functions with zero callers to total functions in a module.
- Target: ≤ 5%. Action threshold: > 10% — run a dead code sweep.

---

## Output Template

When applying YAGNI analysis or refactoring, produce:

1. **Violation Type** — Which YAGNI anti-pattern was found (premature abstraction, dead flag, speculative API, unused code path)
2. **Location** — File path and line numbers of the violating code
3. **Evidence** — Concrete proof that the feature is not needed yet (e.g., "single implementation", "flag active 180 days", "zero callers in 90 days")
4. **Refactored Code** — Complete replacement code showing what to write instead
5. **Removal Risk Assessment** — One sentence confirming no other code depends on the removed abstraction
6. **Next Step** — Whether to remove immediately (safe) or schedule for a future refactor (requires coordination with an active feature)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `kiss-principle` | Partner principle — KISS handles general simplicity; YAGNI targets speculative features specifically |
| `technical-debt-management` | Classifies premature abstractions as technical debt and plans their systematic removal |
| `refactoring-techniques` | Provides the mechanical refactoring steps (extract, inline, rename) needed to remove YAGNI violations safely |
| `engineering-principles` | Broader context of engineering trade-offs — when YAGNI applies and when it conflicts with other principles |

---

## Live References

> Authoritative documentation links for the YAGNI principle and related engineering practices. The model follows markdown links at load time to resolve external references and inline content.

- [Extreme Programming Installed — YAGNI Principle](https://www.agilealliance.org/glossary/yagni/)
- [The Pragmatic Programmer — "Don't Start Here" / Just build what you need](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition-2/)
- [Martin Fowler — Two Hard Things (Naming)](https://martinfowler.com/bliki/TwoHardThings.html)
- [Kent Beck's Original YAGNI Description](https://www.thoughtworks.com/radar/techniques/you-arent-gonna-need-it)
- [Refactoring.com — Remove Dead Code](https://www.refactoring.com/catalog/removeDeadCode.html)
