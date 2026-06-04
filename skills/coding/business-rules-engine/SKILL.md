---




name: business-rules-engine
description: Implements a business rules engine using declarative configuration (JSON/YAML-based rule definitions, condition evaluation chains, and runtime rule execution) to replace hard-coded if/elif branches for frequently-changing domain validations.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: business rules engine, decision table, condition evaluation, declarative rules, rule validation, how do i evaluate complex rules, compliance rules, pricing rules
  archetypes:
    - tactical
    - generation
  anti_triggers:
    - brainstorming
    - vague ideation
    - code golf
    - over-engineering
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: domain-driven-design, input-validation-patterns, ddd-tactical-patterns, framework-requirements




---





# Business Rules Engine

Implements a business rules engine that evaluates declaratively configured rules at runtime. When loaded, the model acts as an application architect designing systems where business logic (eligibility checks, pricing tiers, compliance validations) lives in configuration files rather than hard-coded if/elif chains in service methods.

## TL;DR Checklist

- [ ] Define rules using JSON/YAML with conditions and actions — never hard-code rule logic in Python
- [ ] Build condition functions (AND, OR, NOT, field comparison, regex) as composable builders
- [ ] Use a dispatch table to map operator strings to callable handlers
- [ ] Wrap evaluation in an engine that returns structured results with pass/fail and violation details
- [ ] Support hot-reloading of rule definitions without restarting the application

---

## When to Use

- Business logic changes frequently (monthly pricing updates, compliance regulation shifts, marketing campaigns)
- Non-developers (product managers, compliance officers, ops teams) need to modify rules without code deployments
- Multiple services share the same business rules and need a single source of truth
- Complex eligibility chains with many conditions that would create unreadable nested if/elif blocks

## When NOT to Use

- Rules are static and rarely change — hard-coded logic is simpler and faster
- Each rule has only one condition and one action (simple validation) — use direct function calls instead
- Real-time trading or high-frequency systems where evaluation latency of 100µs+ matters
- Rules involve complex domain logic that requires calling repository services or external APIs

---

## Core Workflow

1. **Define the Rule Schema** — Design a JSON structure that captures: rule ID, name, priority, conditions (with operator and operands), actions (what to do on pass/fail), and metadata (version, effective dates).
   **Checkpoint:** Every rule must have a unique `id` and a `priority` for deterministic ordering when multiple rules match.

2. **Build the Condition Function Registry** — Create a dispatch table mapping operator names (e.g., `"field_eq"`, `"range_contains"`) to callable functions. Each condition function takes `(value, expected, context)` and returns `bool`.
   **Checkpoint:** Every registered condition must have a docstring explaining its signature, parameters, and return value.

3. **Implement the Rule Engine Core** — Create an engine class that loads rules from configuration, iterates through them in priority order, evaluates each condition set against the context, and returns structured results including violations with rule references.
   **Checkpoint:** Evaluation must short-circuit on the first failed mandatory rule (priority-based ordering matters).

4. **Wire Rule Sources** — Implement at least two sources: a file-based source (JSON/YAML) for development and a database-backed source for production. Support hot-reload via a refresh method.
   **Checkpoint:** File changes must trigger validation against the JSON schema before replacing the active rule set.

---

## Implementation Patterns

### Pattern 1: Rule Definition Schema — Declarative JSON Structure

Define rules as plain data structures (JSON objects) that describe conditions and actions without any code. Each rule contains a priority, a set of conditions to evaluate, and pass/fail actions. This separation means business analysts can edit the YAML/JSON files directly.

```python
from __future__ import annotations

import json
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional


class RulePriority(Enum):
    """Determines evaluation order. Higher priority rules are checked first."""

    CRITICAL = 100
    HIGH = 75
    MEDIUM = 50
    LOW = 25


@dataclass(frozen=True)
class Condition:
    """Single condition within a rule's AND-composed group.

    Conditions in the same `conditions` list are evaluated as AND.
    To use OR, wrap related conditions in a nested sub-group.
    """

    operator: str
    field_name: str
    expected_value: Any
    description: str = ""  # Human-readable label for violation messages


@dataclass(frozen=True)
class Action:
    """What to do when a rule's conditions are satisfied."""

    type: str  # "block", "warn", "set_field", "call_service"
    message: str
    field_name: Optional[str] = None
    target_value: Any = None


@dataclass(frozen=True)
class RuleDefinition:
    """Declarative rule definition loaded from JSON/YAML.

    This data class represents a single business rule as pure data.
    No logic lives here — all evaluation happens in the engine.
    """

    id: str
    name: str
    priority: RulePriority
    conditions: list[Condition]
    actions: list[Action] = field(default_factory=list)
    mandatory: bool = True  # If True, failure blocks the entire operation
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_json(self) -> str:
        """Serialize the rule to a JSON string for storage or API responses."""
        data = {
            "id": self.id,
            "name": self.name,
            "priority": self.priority.name,
            "conditions": [
                {"operator": c.operator, "field_name": c.field_name, "expected_value": c.expected_value}
                for c in self.conditions
            ],
            "mandatory": self.mandatory,
        }
        return json.dumps(data, indent=2)


# Example: JSON rule definition for a loan eligibility check
EXAMPLE_RULE_JSON = '''
{
  "id": "loan_income_minimum",
  "name": "Minimum Income Threshold",
  "priority": "HIGH",
  "conditions": [
    {
      "operator": "field_gte",
      "field_name": "annual_income",
      "expected_value": 30000,
      "description": "Annual income must be at least $30,000"
    }
  ],
  "mandatory": true,
  "actions": [
    {
      "type": "block",
      "message": "Application rejected: annual income below minimum threshold of $30,000"
    }
  ]
}
'''

# Example: Multi-condition rule with AND-composed checks
EXAMPLE_COMPLEX_RULE_JSON = '''
{
  "id": "premium_discount_eligibility",
  "name": "Premium Discount Qualification",
  "priority": "MEDIUM",
  "conditions": [
    {
      "operator": "field_gte",
      "field_name": "account_age_days",
      "expected_value": 365,
      "description": "Account must be at least 1 year old"
    },
    {
      "operator": "field_eq",
      "field_name": "payment_history_clean",
      "expected_value": true,
      "description": "Payment history must have no defaults"
    }
  ],
  "mandatory": false,
  "actions": [
    {
      "type": "set_field",
      "field_name": "discount_percent",
      "target_value": 15.0,
      "message": "Applied premium discount of 15%"
    }
  ]
}
'''


# ❌ BAD — Hard-coded if/elif chains that change with every business requirement
def bad_evaluate_eligibility(application: dict) -> dict:
    """Evaluates eligibility using tangled conditionals. Every new rule means
    editing this function, redeploying, and testing the whole chain."""
    if application.get("age", 0) < 18:
        return {"eligible": False, "reason": "Under age"}
    if application.get("income", 0) < 25000:
        # This threshold changes quarterly — why is it hardcoded here?
        return {"eligible": False, "reason": "Income too low"}
    if application.get("credit_score", 0) < 600:
        # Also hardcoded and never tested in isolation
        return {"eligible": False, "reason": "Credit score too low"}
    if application.get("employment_months", 0) < 12:
        return {"eligible": False, "reason": "Insufficient employment history"}
    return {"eligible": True}

# ✅ GOOD — Declarative rules loaded from JSON; engine evaluates them generically
def evaluate_with_engine(engine: RulesEngine, application: dict) -> EvaluationResult:
    """Evaluate an application against all registered rules via the engine."""
    result = engine.evaluate(application)
    if result.is_blocked():
        return {
            "eligible": False,
            "reasons": [v.message for v in result.violations],
        }
    # Apply field-setting actions from passing rules
    for action_result in result.action_results:
        application[action_result.field_name] = action_result.target_value
    return {"eligible": True}
```

### Pattern 2: Rule Engine Core — Dispatch Table Interpreter

The engine core loads rules, sorts them by priority, and evaluates each condition set through a dispatch table that maps operator names to callable handler functions. Results are returned as structured objects containing pass/fail status and detailed violation information.

```python
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Callable


@dataclass(frozen=True)
class Violation:
    """Describes a single rule evaluation failure."""

    rule_id: str
    rule_name: str
    message: str
    condition_index: int = 0


@dataclass
class ActionResult:
    """Result of an action executed by the engine on rule pass."""

    action_type: str
    field_name: Optional[str]
    target_value: Any
    message: str


@dataclass
class EvaluationResult:
    """Complete result of evaluating one context against all rules."""

    violations: list[Violation] = field(default_factory=list)
    action_results: list[ActionResult] = field(default_factory=list)

    @property
    def is_blocked(self) -> bool:
        """Return True if any mandatory rule was violated."""
        return len(self.violations) > 0


# Dispatch table mapping operator strings to callable condition handlers
ConditionHandler = Callable[[Any, Any, dict[str, Any]], bool]

CONDITION_REGISTRY: dict[str, ConditionHandler] = {}


def register_condition(name: str) -> Callable:
    """Decorator that registers a condition function in the dispatch table.

    Args:
        name: The operator name used in rule definitions (e.g., "field_eq").

    Returns:
        Decorator that adds the function to CONDITION_REGISTRY.

    Usage:
        @register_condition("field_gte")
        def handle_field_gte(value, expected, context):
            return float(value) >= float(expected)
    """
    def decorator(func: ConditionHandler) -> ConditionHandler:
        CONDITION_REGISTRY[name] = func
        return func
    return decorator


@register_condition("field_eq")
def handle_field_eq(value: Any, expected: Any, context: dict[str, Any]) -> bool:
    """Check if a field value equals the expected value.

    Args:
        value: The actual field value from the evaluation context.
        expected: The expected value from the rule definition.
        context: Full evaluation context (unused by this handler).

    Returns:
        True if value equals expected, False otherwise.
    """
    return value == expected


@register_condition("field_ne")
def handle_field_ne(value: Any, expected: Any, context: dict[str, Any]) -> bool:
    """Check if a field value does not equal the expected value.

    Args:
        value: The actual field value from the evaluation context.
        expected: The expected value from the rule definition.
        context: Full evaluation context (unused by this handler).

    Returns:
        True if value does not equal expected, False otherwise.
    """
    return value != expected


@register_condition("field_gte")
def handle_field_gte(value: Any, expected: Any, context: dict[str, Any]) -> bool:
    """Check if a numeric field value is greater than or equal to the threshold.

    Args:
        value: The actual numeric field value from the evaluation context.
        expected: The minimum acceptable value from the rule definition.
        context: Full evaluation context (unused by this handler).

    Returns:
        True if float(value) >= float(expected), False otherwise.
        Returns False if either value cannot be converted to float.
    """
    try:
        return float(value) >= float(expected)
    except (TypeError, ValueError):
        return False


@register_condition("field_lt")
def handle_field_lt(value: Any, expected: Any, context: dict[str, Any]) -> bool:
    """Check if a numeric field value is less than the threshold.

    Args:
        value: The actual numeric field value from the evaluation context.
        expected: The maximum acceptable value from the rule definition.
        context: Full evaluation context (unused by this handler).

    Returns:
        True if float(value) < float(expected), False otherwise.
    """
    try:
        return float(value) < float(expected)
    except (TypeError, ValueError):
        return False


@register_condition("field_contains")
def handle_field_contains(value: Any, expected: Any, context: dict[str, Any]) -> bool:
    """Check if a string or list field contains the expected substring/item.

    Args:
        value: The actual field value (str or list) from context.
        expected: The substring or item to search for.
        context: Full evaluation context (unused by this handler).

    Returns:
        True if expected is contained within value, False otherwise.
    """
    if isinstance(value, str):
        return expected in value
    if isinstance(value, (list, tuple)):
        return expected in value
    return False


@register_condition("field_matches_regex")
def handle_field_matches_regex(value: Any, expected: Any, context: dict[str, Any]) -> bool:
    """Check if a string field matches the given regular expression pattern.

    Args:
        value: The actual string field value from the evaluation context.
        expected: The regex pattern string from the rule definition.
        context: Full evaluation context (unused by this handler).

    Returns:
        True if the pattern matches anywhere in the value string.

    Raises:
        re.error: If the pattern is not a valid regular expression.
    """
    try:
        return bool(re.search(str(expected), str(value)))
    except re.error as e:
        raise ValueError(f"Invalid regex pattern '{expected}': {e}") from e


@register_condition("field_in_list")
def handle_field_in_list(value: Any, expected: Any, context: dict[str, Any]) -> bool:
    """Check if a field value is in an allowed list of values.

    The `expected` parameter is a pipe-delimited string (e.g., "active|pending|approved").

    Args:
        value: The actual field value from the evaluation context.
        expected: Pipe-delimited string of allowed values.
        context: Full evaluation context (unused by this handler).

    Returns:
        True if value is one of the allowed values, False otherwise.
    """
    allowed = [v.strip() for v in str(expected).split("|")]
    return str(value) in allowed


class RuleEngine:
    """Evaluates declarative rules against an arbitrary context.

    The engine loads rule definitions from a source (file, database),
    sorts them by priority, and evaluates each condition set through
    the dispatch table (CONDITION_REGISTRY). Results are collected
    into an EvaluationResult containing violations and actions.
    """

    def __init__(self) -> None:
        """Initialize an empty engine with no rules loaded."""
        self._rules: list[RuleDefinition] = []

    def load_rules(self, rules: list[RuleDefinition]) -> None:
        """Load or replace all rules in the engine.

        Rules are sorted by priority (CRITICAL first) after loading.
        Replaces any previously loaded rules entirely.

        Args:
            rules: List of RuleDefinition instances to evaluate.
        """
        self._rules = sorted(rules, key=lambda r: r.priority.value, reverse=True)

    def add_rule(self, rule: RuleDefinition) -> None:
        """Add a single rule and re-sort the priority queue.

        Args:
            rule: The RuleDefinition to add to the active rule set.
        """
        self._rules.append(rule)
        self._rules.sort(key=lambda r: r.priority.value, reverse=True)

    def evaluate(self, context: dict[str, Any]) -> EvaluationResult:
        """Evaluate all loaded rules against the provided context.

        Rules are evaluated in priority order (highest first).
        Short-circuits on any mandatory rule failure if configured.

        Args:
            context: Dictionary of field names to values representing
                     the data being validated (e.g., an application form).

        Returns:
            EvaluationResult with violations for failed rules and
            ActionResult entries for actions triggered by passed rules.
        """
        result = EvaluationResult()

        for rule in self._rules:
            rule_passed = self._evaluate_conditions(rule.conditions, context)

            if not rule_passed:
                # Rule failed — record violation
                cond_idx = self._find_failing_condition_index(rule.conditions, context)
                message = next(
                    (c.description for c in rule.conditions if c.description),
                    f"Rule '{rule.name}' validation failed",
                )
                result.violations.append(
                    Violation(
                        rule_id=rule.id,
                        rule_name=rule.name,
                        message=message,
                        condition_index=cond_idx,
                    )
                )

                # Mandatory rules block the entire evaluation
                if rule.mandatory:
                    return result

            else:
                # Rule passed — execute actions
                for action in rule.actions:
                    result.action_results.append(
                        ActionResult(
                            action_type=action.type,
                            field_name=action.field_name,
                            target_value=action.target_value,
                            message=action.message,
                        )
                    )

        return result

    def _evaluate_conditions(self, conditions: list[Condition], context: dict[str, Any]) -> bool:
        """Evaluate all conditions in a rule (AND-composed).

        All conditions in the same group must pass. Uses short-circuit
        evaluation: if any condition fails, remaining conditions are skipped.

        Args:
            conditions: List of Condition objects to evaluate.
            context: The evaluation context dictionary.

        Returns:
            True if all conditions pass, False as soon as one fails.
        """
        for condition in conditions:
            field_value = context.get(condition.field_name)
            handler = CONDITION_REGISTRY.get(condition.operator)

            if handler is None:
                raise KeyError(
                    f"Unknown operator '{condition.operator}' for rule '{conditions[0].field_name}'. "
                    f"Available: {list(CONDITION_REGISTRY.keys())}"
                )

            if not handler(field_value, condition.expected_value, context):
                return False

        return True

    def _find_failing_condition_index(
        self, conditions: list[Condition], context: dict[str, Any]
    ) -> int:
        """Find the index of the first failing condition in a rule.

        Used for violation reporting so users know which specific check failed.

        Args:
            conditions: List of Condition objects to test.
            context: The evaluation context dictionary.

        Returns:
            Index of the first condition that returns False, or -1 if all pass.
        """
        for i, condition in enumerate(conditions):
            field_value = context.get(condition.field_name)
            handler = CONDITION_REGISTRY.get(condition.operator)
            if handler and not handler(field_value, condition.expected_value, context):
                return i
        return -1

    def get_active_rules(self) -> list[RuleDefinition]:
        """Return the current active rules sorted by priority.

        Returns:
            Copy of the rule list in priority order.
        """
        return list(self._rules)

    def reload_from_source(self, source_rules: list[RuleDefinition]) -> None:
        """Atomically replace all rules from an external source.

        Validates that at least one rule is loaded before replacing.
        Prevents accidental rule-set deletion during hot-reload.

        Args:
            source_rules: New rules from a file or database source.
        """
        if not source_rules:
            raise ValueError("Cannot reload with empty rule set — would disable all rules")
        self.load_rules(source_rules)
```

---

## Constraints

### MUST DO
- Register every new condition operator in CONDITION_REGISTRY using the `@register_condition` decorator
- Make each condition function pure (no side effects, no I/O) — they must be deterministic
- Include a human-readable `description` on every Condition for meaningful violation messages
- Test rules independently: run individual rule evaluation before testing full engine behavior
- Validate incoming rule definitions against the schema before loading them into the active set

### MUST NOT DO
- Embed business logic directly in service methods using if/elif chains — move it to declarative rules
- Use condition functions that perform I/O, database lookups, or API calls — keep conditions pure and fast
- Skip priority ordering — rules without a defined priority will evaluate in unpredictable order
- Make mandatory rules optional after deployment — changing `mandatory` requires versioned rule updates
- Hard-code operator names as strings in evaluation code — always use CONDITION_REGISTRY dispatch

---

## Output Template

When implementing a business rules engine, the model's output must contain:

1. **Rule Definition** — A complete JSON/YAML rule definition with id, name, priority, conditions (with operators), actions, and metadata
2. **Condition Handlers** — All required condition functions registered in CONDITION_REGISTRY with docstrings
3. **Engine Integration** — Code showing how to load rules, create an engine instance, and call `evaluate()` with context
4. **Violation Response** — Handler code that processes EvaluationResult (block on violations, apply actions on pass)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `domain-driven-design` | DDD tactical patterns for structuring domain models that rules operate against |
| `input-validation-patterns` | Input validation as a complement to business rules (syntax vs. semantics) |
| `ddd-tactical-patterns` | Value objects, entities, and repositories that provide data for rule evaluation |
| `framework-requirements` | Requirements documentation patterns for capturing business rules in stakeholder language |

---

## Live References

> Authoritative documentation links for the business rules engine pattern.

- [JSON Schema Specification](https://json-schema.org/learn/getting-started-step-by-step)
- [Python dataclasses (PEP 557)](https://peps.python.org/pep-0557/)
- [Command Query Responsibility Segregation (CQRS)](https://docs.microsoft.com/en-us/azure/architecture/guide/architecture-styles/cqrs)
- [Decision Tables in Business Rules](https://en.wikipedia.org/wiki/Decision_table)
- [Python functools.singledispatch for condition dispatch](https://docs.python.org/3/library/functools.html#functools.singledispatch)