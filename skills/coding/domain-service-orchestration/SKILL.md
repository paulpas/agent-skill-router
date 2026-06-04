---
name: domain-service-orchestration
description: Implements domain service orchestration for cross-aggregate business operations in DDD — coordinating multiple aggregate roots while preserving encapsulation, handling compensation on failure, and maintaining transaction boundaries without leaking coordination logic into domain models.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: domain service, cross-aggregate orchestration, aggregate coordination, how do i coordinate multiple aggregates, saga compensation, distributed transaction, domain orchestrator, business process coordination
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
  related-skills: ddd-command-pattern, cross-domain-workflow-sagas, domain-driven-design, domain-repository-pattern, ddd-aggregate-lifecycle
---

# Domain Service Orchestration

Implements domain services that coordinate multi-aggregate business operations while preserving encapsulation boundaries. When loaded, the model acts as a DDD architect designing orchestrations where each aggregate root maintains its own invariants and the domain service coordinates the sequence without becoming a God object.

## TL;DR Checklist

- [ ] Define domain services as ABCs that coordinate aggregates via repository interfaces — never directly call other domains
- [ ] Implement compensation actions for every irreversible operation (undo pattern)
- [ ] Use explicit transaction boundaries with commit/rollback in the orchestration flow
- [ ] Decide between orchestration (domain service) vs. choreography (events) based on coupling and visibility requirements
- [ ] Keep each domain service focused on a single business process — extract if it handles more than 3 aggregate types

---

## When to Use

- A business operation spans multiple aggregate roots (e.g., transfer funds between accounts, place an order that creates Order + reserves Inventory + charges PaymentMethod)
- The operation has explicit compensation logic required on failure (undo a debit, release a reservation, refund a charge)
- You need deterministic, synchronous coordination of multiple domain models within one business transaction
- Auditing requirements demand logging the entire orchestration flow as a single trace

## When NOT to Use

- The operation involves only one aggregate root — put the logic in the aggregate itself
- Cross-bounded-context communication that crosses organizational/team boundaries — use `cross-domain-workflow-sagas` instead
- Long-running processes (hours/days) that require persistence between steps — these are sagas, not domain services
- Simple read operations or queries — use a CQRS read model / query handler instead

---

## Core Workflow

1. **Identify the Business Process Boundary** — Determine which aggregate roots participate in this operation and what each one must do. Draw the flow: AccountA.debit() → PaymentService.charge() → Inventory.reserve() → Order.create().
   **Checkpoint:** Each step should be independently completable or compensable. If any step cannot be undone, you need a saga pattern instead.

2. **Define the Domain Service ABC** — Create an abstract interface for the orchestration that declares the business operation as a single method (e.g., `transfer_funds`). The service depends on repository interfaces, not concrete implementations.
   **Checkpoint:** Verify the ABC has no imports from infrastructure packages — it must be domain-pure.

3. **Implement Compensation Actions** — For every irreversible operation in the flow, define a compensating action that reverses it (e.g., `credit_account` to undo `debit_account`). Store them in a list so they can be executed in reverse order on failure.
   **Checkpoint:** Each compensating action must have its own error handling — a failed compensation should be logged and escalated, not silently swallowed.

4. **Write the Concrete Service Implementation** — Execute operations sequentially, collecting compensations. On success, commit all changes. On failure, execute compensations in reverse order, then raise.
   **Checkpoint:** Ensure no state is modified between repository calls if atomicity is required — use a Unit of Work (see `domain-repository-pattern`).

5. **Apply Orchestration vs. Choreography Decision** — Before finalizing, evaluate whether events-driven choreography would work better. Use orchestration when you need synchronous guarantees and deterministic ordering; use choreography for loose coupling across bounded contexts.
   **Checkpoint:** If the process crosses team-owned bounded contexts, default to choreography with sagas.

---

## Implementation Patterns

### Pattern 1: Domain Service Interface — ABC-Based Orchestration

Domain services are defined as abstract base classes that declare business operations spanning multiple aggregates. The service depends on repository interfaces and communicates with aggregates through their public domain methods only. No infrastructure concerns leak into the service interface.

```python
from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Callable, Optional


@dataclass(frozen=True)
class TransferRequest:
    """Immutable request object for a fund transfer operation."""

    from_account_id: uuid.UUID
    to_account_id: uuid.UUID
    amount: float
    currency: str = "USD"
    reference: Optional[str] = None


@dataclass(frozen=True)
class TransferResult:
    """Result of a completed transfer with all side-effect details."""

    success: bool
    from_account_balance_after: float
    to_account_balance_after: float
    transaction_id: uuid.UUID
    compensation_performed: bool = False


class DomainService(ABC):
    """Base class for domain services that coordinate cross-aggregate operations.

    Each concrete implementation represents one business process that spans
    multiple aggregate roots. The service handles orchestration logic,
    compensation on failure, and transaction boundaries — while each
    aggregate root remains responsible only for its own invariants.
    """

    @abstractmethod
    async def transfer_funds(self, request: TransferRequest) -> TransferResult:
        """Execute a fund transfer between two accounts.

        This is the primary orchestration method. It coordinates debit
        from the source account and credit to the destination account,
        handling compensation if any step fails.

        Args:
            request: The immutable transfer parameters.

        Returns:
            TransferResult with final balances and transaction details.

        Raises:
            InsufficientFundsError: If source account lacks sufficient balance.
            AccountNotFoundError: If either account does not exist.
            ValueError: If amount is non-positive or accounts are identical.
        """


class CompensationStep:
    """Wraps an operation and its compensating action for undo-on-failure.

    Usage in orchestration:
        compensation_steps = [
            CompensationStep(
                action=lambda: account_a.debit(amount),
                compensate=lambda: account_b.credit(amount),
            )
        ]

    On success, `action` executes and the step is discarded.
    On failure, all previously executed steps' `compensate` methods run in reverse order.
    """

    def __init__(
        self,
        action: Callable[[], None],
        compensate: Callable[[], None],
        description: str = "",
    ) -> None:
        """Initialize a compensable operation step.

        Args:
            action: The primary operation to execute (e.g., debit account).
            compensate: The undo operation if the primary fails later in the flow.
            description: Human-readable label for audit logging.
        """
        self._action = action
        self._compensate = compensate
        self._description = description
        self._executed = False

    @property
    def executed(self) -> bool:
        """Return True if this step's action has been executed."""
        return self._executed

    async def execute_action(self) -> None:
        """Execute the primary operation and mark as done.

        Raises:
            Exception: Propagates from the action callable.
        """
        try:
            if callable(self._action):
                result = self._action()
                if result is not None and hasattr(result, "__await__"):
                    await result
            elif isinstance(self._action, object) and hasattr(self._action, "commit"):
                self._action.commit()  # type: ignore[attr-defined]
            self._executed = True
        except Exception:
            self._executed = False
            raise

    async def execute_compensate(self) -> None:
        """Execute the compensating (undo) action for this step.

        Raises:
            Exception: If compensation fails, logs and re-raises.
                     A failed compensation should be handled by the caller
                     (escalation to manual review).
        """
        if not self._executed:
            return  # Nothing to compensate

        try:
            if callable(self._compensate):
                result = self._compensate()
                if result is not None and hasattr(result, "__await__"):
                    await result
        except Exception as exc:
            raise CompensationError(
                f"Compensation failed for step '{self._description}': {exc}"
            ) from exc


class CompensationError(Exception):
    """Raised when a compensating action fails during rollback."""

    pass


# ❌ BAD — God object service that does everything and leaks infrastructure concerns
class BadAccountService:
    """This is what NOT to do: a God service with hardcoded logic,
    direct DB connections mixed in, and no compensation pattern."""

    def __init__(self):
        # Infrastructure leak — domain code should not import database drivers
        from sqlalchemy.orm import Session
        self.db = Session()

    def transfer_money(self, from_id, to_id, amount, user_id):
        # No type hints, no docstring, mixed concerns
        account1 = self.db.query(Account).get(from_id)
        account2 = self.db.query(Account).get(to_id)
        if account1.balance < amount:
            return False
        # If this fails, money is gone with no compensation!
        account1.balance -= amount
        account2.balance += amount
        self.db.commit()
        return True

# ✅ GOOD — Clean domain service with explicit compensation and pure domain dependencies
class FundTransferService(DomainService):
    """Coordinates fund transfers between two accounts using the compensation pattern.

    Each operation is wrapped in a CompensationStep so that if any step fails,
    previous operations are undone in reverse order. The service depends on
    repository interfaces for aggregate access, not direct database calls.
    """

    def __init__(
        self,
        account_repo,  # Repository[Account] — injected at construction
        transaction_id_factory: Callable[[], uuid.UUID] | None = None,
    ) -> None:
        """Initialize the transfer service with its dependencies.

        Args:
            account_repo: Repository for Account aggregate instances.
            transaction_id_factory: Optional callable to generate UUIDs; defaults to uuid.uuid4.
        """
        self._account_repo = account_repo
        self._tx_id_factory = transaction_id_factory or uuid.uuid4

    async def transfer_funds(self, request: TransferRequest) -> TransferResult:
        """Execute a fund transfer with full compensation on failure.

        The orchestration flow is:
          1. Load both accounts (validates existence)
          2. Validate amounts and business rules
          3. Debit source account
          4. Credit destination account
          5. If step 4 fails, compensate by crediting back the source

        Args:
            request: The transfer parameters including IDs, amount, currency.

        Returns:
            TransferResult with final balances and compensation status.

        Raises:
            ValueError: If accounts are identical or amount is invalid.
        """
        if request.from_account_id == request.to_account_id:
            raise ValueError("Cannot transfer funds to the same account")
        if request.amount <= 0:
            raise ValueError(f"Transfer amount must be positive, got {request.amount}")

        # Step 1: Load accounts (domain validation happens in aggregate methods)
        from_account = self._account_repo.get_by_id(request.from_account_id)
        to_account = self._account_repo.get_by_id(request.to_account_id)

        if from_account is None or to_account is None:
            raise AccountNotFoundError(
                f"Account not found: from={from_account is None}, to={to_account is None}"
            )

        compensation_steps: list[CompensationStep] = []
        transaction_id = self._tx_id_factory()
        compensation_performed = False

        try:
            # Step 2: Debit source account — wrap with compensation
            debit_action = lambda: from_account.debit(
                request.amount, currency=request.currency, reference=request.reference
            )
            compensate_debit = lambda: to_account.credit(
                request.amount, currency=request.currency, reference=f"refund_{request.reference}"
            )

            step = CompensationStep(
                action=debit_action,
                compensate=compensate_debit,
                description=f"Debit {request.from_account_id} for {request.amount}",
            )
            compensation_steps.append(step)
            await step.execute_action()

            # Step 3: Credit destination account
            credit_action = lambda: to_account.credit(
                request.amount, currency=request.currency, reference=request.reference
            )
            compensate_credit = lambda: from_account.debit(
                request.amount, currency=request.currency, reference=f"chargeback_{request.reference}"
            )

            step = CompensationStep(
                action=credit_action,
                compensate=compensate_credit,
                description=f"Credit {request.to_account_id} for {request.amount}",
            )
            compensation_steps.append(step)
            await step.execute_action()

            # Success — save both accounts (via Unit of Work in production)
            self._account_repo.add(from_account)  # type: ignore[attr-defined]
            self._account_repo.add(to_account)  # type: ignore[attr-defined]

            return TransferResult(
                success=True,
                from_account_balance_after=from_account.balance,
                to_account_balance_after=to_account.balance,
                transaction_id=transaction_id,
                compensation_performed=False,
            )

        except Exception as exc:
            # Execute compensations in reverse order
            for step in reversed(compensation_steps):
                try:
                    await step.execute_compensate()
                except CompensationError:
                    raise  # Escalate — requires manual review

            compensation_performed = True
            raise TransferFailedError(
                f"Transfer failed after compensations: {exc}"
            ) from exc


class AccountNotFoundError(ValueError):
    """Raised when a requested account does not exist."""

    pass


class TransferFailedError(RuntimeError):
    """Raised when a transfer operation fails, potentially after compensation."""

    pass
```

### Pattern 2: Compensation Pattern — Saga-Style Rollback in Domain Services

The compensation pattern ensures that if any step in an orchestration flow fails, all previously executed steps are undone. Unlike traditional database transactions (which use ACID rollback), this pattern works even when different aggregates live in different databases or message queues.

```python
from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Optional


logger = logging.getLogger(__name__)


class OrchestrationOutcome(Enum):
    """Tracks the final state of an orchestration flow."""

    COMPLETED_SUCCESSFULLY = "completed_successfully"
    COMPLETED_WITH_COMPENSATION = "completed_with_compensation"
    FAILED_PERMANENT = "failed_permanent"


@dataclass
class OrchestrationContext:
    """Holds transient state for a single orchestration execution.

    This context is created at the start of each orchestration call and
    discarded when the method returns. It does NOT persist to any database.
    """

    outcome: OrchestrationOutcome = OrchestrationOutcome.COMPLETED_SUCCESSFULLY
    compensation_errors: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


class CompensableStep(ABC):
    """Abstract base for steps that have both forward and compensating actions.

    Subclasses implement execute() for the primary action and compensate()
    for the undo action. The base class handles execution state tracking
    and error propagation.
    """

    @abstractmethod
    async def execute(self) -> None:
        """Execute the primary business operation.

        Raises:
            Exception: If the operation fails, triggering compensation of prior steps.
        """
        ...

    @abstractmethod
    async def compensate(self) -> None:
        """Undo the effect of this step's execute().

        This must be idempotent — calling it multiple times should have the
        same effect as calling it once (safe to retry).

        Raises:
            CompensationError: If compensation cannot complete.
        """
        ...


class CompositeStep(CompensableStep):
    """A step that wraps multiple sub-steps executed sequentially.

    If any sub-step fails, the composite's compensate() method undoes all
    sub-steps that were successfully executed up to the failure point.

    Usage:
        order_step = CompositeStep("create_order", [
            SaveOrderStep(order),
            ReserveInventoryStep(inventory_items),
        ])
    """

    def __init__(self, name: str, sub_steps: list[CompensableStep]) -> None:
        """Initialize a composite step with its sub-steps.

        Args:
            name: Human-readable name for logging and debugging.
            sub_steps: List of CompensableStep instances to execute sequentially.
        """
        self._name = name
        self._sub_steps = sub_steps
        self._executed_indices: list[int] = []

    @property
    def name(self) -> str:
        return self._name

    async def execute(self) -> None:
        """Execute sub-steps sequentially. On failure, re-raises with context.

        Tracks which sub-steps completed successfully so that compensate()
        can undo exactly those steps on failure.
        """
        for i, step in enumerate(self._sub_steps):
            try:
                await step.execute()
                self._executed_indices.append(i)
            except Exception as exc:
                raise OrchestrationStepError(
                    f"Step '{self._name}' sub-step {i} ({step.__class__.__name__}) failed: {exc}"
                ) from exc

    async def compensate(self) -> None:
        """Undo all executed sub-steps in reverse order.

        Each sub-step's compensate() is called from last-executed to first,
        matching the reverse of execute()'s forward progression. Failed
        compensations are logged but not raised — they require manual review.
        """
        for idx in reversed(self._executed_indices):
            step = self._sub_steps[idx]
            try:
                await step.compensate()
            except Exception as exc:
                logger.error(
                    "Compensation failed for %s sub-step %d (%s): %s",
                    self._name,
                    idx,
                    step.__class__.__name__,
                    exc,
                )


# ❌ BAD — Manual compensation logic duplicated across every service method
def bad_transfer_with_manual_compensation(from_account, to_account, amount):
    """Each new orchestration repeats the same compensation pattern manually."""
    try:
        from_account.withdraw(amount)
        to_account.deposit(amount)
    except Exception:
        # What if deposit succeeded but withdraw fails? Reverse order matters!
        to_account.withdraw(amount)  # Hope this doesn't fail too
        from_account.deposit(amount)  # Hope the original withdraw was caught


# ✅ GOOD — Centralized orchestration engine with automatic reverse compensation
class OrchestrationEngine:
    """Coordinates a sequence of compensable steps with automatic rollback.

    Usage:
        engine = OrchestrationEngine()
        result = await engine.run([
            StepA(...),
            StepB(...),
            StepC(...),
        ])

    On any step failure, Compensate is called on Steps A and B in reverse
    order (B first, then A). The result includes details about what was
    compensated.
    """

    def __init__(self) -> None:
        """Initialize the engine with an empty context tracker."""
        self._context = OrchestrationContext()

    async def run(self, steps: list[CompensableStep]) -> OrchestrationResult:
        """Execute all steps sequentially with compensation on failure.

        Args:
            steps: List of compensable operations to execute in order.

        Returns:
            OrchestrationResult detailing success/failure and any compensation performed.
        """
        completed_steps: list[CompensableStep] = []

        try:
            for step in steps:
                await step.execute()
                completed_steps.append(step)
        except Exception as exc:
            self._context.outcome = OrchestrationOutcome.COMPLETED_WITH_COMPENSATION

            # Compensate in reverse order of execution
            for step in reversed(completed_steps):
                try:
                    await step.compensate()
                except Exception as comp_exc:
                    self._context.compensation_errors.append(
                        f"Compensation failed for {step.__class__.__name__}: {comp_exc}"
                    )
                    logger.error("Failed to compensate %s: %s", step.name, comp_exc)

            self._context.outcome = OrchestrationOutcome.FAILED_PERMANENT
            raise

        return OrchestrationResult(
            context=self._context,
            steps_executed=len(completed_steps),
            total_steps=len(steps),
        )


@dataclass
class OrchestrationResult:
    """Summarizes the outcome of an orchestration execution."""

    context: OrchestrationContext
    steps_executed: int
    total_steps: int

    @property
    def is_successful(self) -> bool:
        return self.context.outcome == OrchestrationOutcome.COMPLETED_SUCCESSFULLY

    @property
    def compensation_errors_count(self) -> int:
        return len(self.context.compensation_errors)


class OrchestrationStepError(RuntimeError):
    """Raised when a compensable step fails during execution."""

    pass
```

### Pattern 3: Orchestration vs. Choreography Decision Framework

Use this decision framework to determine whether a domain service (orchestration) or event-driven choreography is the right approach for coordinating business operations across aggregates.

```python
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass
class OrchestrationDecision:
    """Structured decision output from the orchestration/choreography evaluation.

    Attributes:
        recommended_pattern: Either "orchestration" or "choreography".
        reasoning: Human-readable explanation of why this pattern was selected.
        tradeoffs: List of considerations to evaluate before committing.
    """

    recommended_pattern: str  # "orchestration" or "choreography"
    reasoning: str
    tradeoffs: list[str]


def decide_orchestration_vs_choreography(
    *,
    spans_multiple_bounded_contexts: bool,
    requires_synchronous_guarantee: bool,
    involves_compensation_logic: bool,
    business_owners_same_team: bool,
    process_duration_seconds: float,
) -> OrchestrationDecision:
    """Evaluate whether to use domain service orchestration or event choreography.

    This function implements a decision matrix that considers the key factors
    driving the choice between centralized orchestration (domain service) and
    decentralized choreography (event-driven).

    Args:
        spans_multiple_bounded_contexts: True if aggregates belong to different
            bounded contexts (different teams/domains).
        requires_synchronous_guarantee: True if the operation must complete
            atomically and return immediately.
        involves_compensation_logic: True if failed steps need undo operations.
        business_owners_same_team: True if all participating aggregates share
            the same team owner.
        process_duration_seconds: Expected maximum duration of the entire process.

    Returns:
        OrchestrationDecision with recommended pattern and reasoning.

    Decision matrix:
        - Same team + short-lived + needs sync guarantee → ORCHESTRATION (domain service)
        - Different teams + long-running + loose coupling needed → CHOREOGRAPHY (sagas)
        - Needs compensation + synchronous → ORCHESTRATION with compensation pattern
        - Event sourcing + eventual consistency OK → CHOREOGRAPHY with saga pattern
    """
    tradeoffs: list[str] = []

    if spans_multiple_bounded_contexts and not business_owners_same_team:
        reasoning = (
            "Cross-team bounded contexts benefit from event-driven choreography to avoid tight coupling. "
            "Use saga patterns with outbox for reliable event publication."
        )
        tradeoffs.extend([
            "Events may arrive out of order — implement idempotency keys",
            "Debugging requires distributed tracing across services",
            "Compensation is harder — prefer saga pattern over domain service",
            "Latency is higher due to async event processing",
        ])
        return OrchestrationDecision(
            recommended_pattern="choreography",
            reasoning=reasoning,
            tradeoffs=tradeoffs,
        )

    if requires_synchronous_guarantee and not spans_multiple_bounded_contexts:
        reasoning = (
            "Synchronous guarantees within a single bounded context are best served by "
            "domain service orchestration with compensation. All aggregates share the same "
            "transaction boundary."
        )
        tradeoffs.extend([
            "Tight coupling between participating aggregates — changes require coordinated updates",
            "Single point of failure in the domain service itself",
            "Domain service can become a God object if not kept focused",
            "Scaling requires replicating the entire service (not just individual aggregates)",
        ])
        return OrchestrationDecision(
            recommended_pattern="orchestration",
            reasoning=reasoning,
            tradeoffs=tradeoffs,
        )

    if involves_compensation_logic and process_duration_seconds < 30:
        reasoning = (
            "Short processes with compensation requirements should use domain service "
            "orchestration. Compensation can be executed synchronously in the same request."
        )
        tradeoffs.extend([
            "Failed compensations require immediate escalation to manual review",
            "Request timeout limits process complexity — extract if it grows beyond ~5 steps",
        ])
        return OrchestrationDecision(
            recommended_pattern="orchestration",
            reasoning=reasoning,
            tradeoffs=tradeoffs,
        )

    if process_duration_seconds > 300 or spans_multiple_bounded_contexts:
        reasoning = (
            f"Long-running processes ({process_duration_seconds:.0f}s+) or cross-context "
            "operations should use event choreography with a saga manager. The saga persists "
            "state between steps and handles long-duration compensation windows."
        )
        tradeoffs.extend([
            "Requires saga persistence store for crash recovery",
            "Compensation may happen minutes or hours after the triggering event",
            "Complex state machine management in the saga coordinator",
        ])
        return OrchestrationDecision(
            recommended_pattern="choreography",
            reasoning=reasoning,
            tradeoffs=tradeoffs,
        )

    # Default: favor orchestration for simplicity when uncertain
    reasoning = (
        "When the decision is unclear, prefer orchestration for simpler debugging and "
        "deterministic flow. Choreography should be chosen intentionally for cross-context "
        "decoupling, not as a default."
    )
    tradeoffs.extend([
        "Start with orchestration — migrate to choreography if coupling becomes problematic",
        "Domain services provide better observability (single trace vs. distributed events)",
    ])
    return OrchestrationDecision(
        recommended_pattern="orchestration",
        reasoning=reasoning,
        tradeoffs=tradeoffs,
    )


# Example: Using the decision framework for a specific business process
def evaluate_order_process():
    """Evaluate whether order placement should use orchestration or choreography."""
    decision = decide_orchestration_vs_choreography(
        spans_multiple_bounded_contexts=False,  # All aggregates in Orders context
        requires_synchronous_guarantee=True,  # Customer expects immediate confirmation
        involves_compensation_logic=True,  # Must refund inventory reservation on failure
        business_owners_same_team=True,  # Same team owns Order, Inventory, Payment
        process_duration_seconds=2.0,  # Typically completes in under 2 seconds
    )
    return decision


# ❌ BAD — No decision framework; teams pick patterns arbitrarily
class BadOrderProcessor:
    """Uses domain service for a cross-context operation it shouldn't handle."""

    def __init__(self):
        # Directly importing from another bounded context = tight coupling
        from orders.infrastructure.repositories import OrderRepository
        from shipping.external_api import ShippingClient  # External team's API!

# ✅ GOOD — Decision made explicitly; pattern matches the requirements
def process_order_decided():
    """Order processing uses orchestration because it stays within one bounded context."""
    decision = evaluate_order_process()
    assert decision.recommended_pattern == "orchestration"
    # Proceed with domain service implementation (Pattern 1)

---

---

## Constraints

### MUST DO
- Validate all inputs at function boundaries before processing — guard clauses should fail early with descriptive errors
- Implement proper error handling that distinguishes between recoverable and unrecoverable failures
- Add comprehensive logging with structured context (correlation IDs, operation names, timing) for debugging and monitoring
- Write unit tests covering normal operations, edge cases, and error conditions before integrating the component

### MUST NOT DO
- Do not silently swallow exceptions — always log or propagate errors with meaningful context
- Avoid unbounded resource allocation without limits (connection pools, memory buffers, thread counts)
- Never use hardcoded credentials, API keys, or secrets in source code
- Do not bypass input validation for perceived performance gains


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Orchestration vs Choreography (Martin Fowler)](https://martinfowler.com/articles/orchestrationOrchestratorVsChoreography.html)
- [Saga Pattern (Microsoft Azure Architecture Center)](https://learn.microsoft.com/en-us/azure/architecture/reference-architectures/saga/saga)
- [Microservice Orchestration Patterns](https://docs.microservices.com/patterns/orchestration/)
- [Axway — Orchestrator vs Choreography in Microservices](https://www.axway.com/blog/microservices-orchestration-vs-choreography)
- [Event-Driven Architecture with CQRS (Microsoft Docs)](https://docs.microsoft.com/en-us/azure/architecture/patterns/cqrs)