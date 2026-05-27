---
name: domain-driven-design
description: Implements Domain-Driven Design patterns (aggregates, value objects, entities, bounded contexts, domain events) to model complex business logic and align software architecture with domain expertise.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: domain driven design, ddd, bounded context, aggregate root, entity, value object, strategic design, tactical patterns
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
  content-types:
  - code
  - guidance
  - do-dont
  - examples
  related-skills: design-patterns-architecture, software-design-principles, event-driven-architecture
------
# Domain-Driven Design Patterns
Implements tactical and strategic DDD patterns to model complex business domains where software structure must reflect domain expertise. Produces value objects, entities, aggregates, domain events, and bounded context boundaries that enforce invariants at the domain layer.

## TL;DR Checklist

### Key Takeaways
- [ ] Understand the differences between architectural patterns.
- [ ] Identify scenarios to apply specific patterns via established models.
- [ ] Keep the communication clear and consistent among bounded contexts by maintaining the ubiquitous language.
- [ ] Ensure that all classes reference established contracts via interfaces or ports, keeping domain logic decoupled from infrastructure.<br> - [ ] Collaborate effectively across development teams to align on architectural choices and their implications, ensuring long-term maintainability.
- [ ] Identify bounded contexts by separating ubiquitous language from shared infrastructure concerns
- [ ] Model value objects as immutable types with value-based equality (no identity field)
- [ ] Model entities with stable identity, protected through constructor validation and invariant checks
- [ ] Enforce all business invariants inside aggregate root constructors — never allow invalid state
- [ ] Publish domain events as immutable records after state transitions, not before
- [ ] Keep aggregates small (one primary key per transaction) to avoid distributed consistency problems
- [ ] Separate domain layer from infrastructure — no ORM annotations, no SQL strings in domain models
---
## Core Workflow

This section outlines the processes involved in applying Domain-Driven Design:

### Core Workflows and Examples
1. **Elicit Ubiquitous Language**: Interview domain experts, extract key nouns and verbs, resolve conflicting terminology.
   **Example**: In a banking domain, use consistent terminology for 

This section outlines the processes involved in applying Domain-Driven Design:

### Archetypes
- **Tactical**: Provides a step-by-step approach to applying DDD patterns.
- **Educational**: Offers insights into best practices and potential pitfalls.

### Anti-Triggers
- **Vague specifications**: Prevent invocation when the design lacks clarity.

### Response Profile
- **Verbosity**: Medium
- **Directive Strength**: High
- **Abstraction Level**: Tactical


1. **Elicit Ubiquitous Language**: Interview domain experts, extract key nouns and verbs, resolve conflicting terminology. **Checkpoint:** Every concept in the model must have a single term agreed upon by all stakeholders. If "order" means two different things to two teams, that is a bounded context boundary.; 
2. **Identify Bounded Contexts**: Partition the system by responsibility. Each bounded context owns its own models and terminology. Draw context maps showing relationships: `Ours ↔ Theirs`, `Customer ↔ Supplier`, `Conformist`, `Anticorruption Layer`. **Checkpoint:** No concept should appear in two contexts with different semantics without an explicit translation layer.; 
3. **Model Tactical Elements**: Inside each bounded context, define value objects (immutable, equality by value), entities (identity-based, lifecycle-aware), aggregate roots (consistency boundary), and domain events (state change records). **Checkpoint:** Every aggregate root must have at least one invariant check in its constructor. No aggregate should be larger than a single database transaction can reasonably update.; 
4. **Enforce Invariants in Constructors**: Every factory method or constructor validates all business rules. Invalid state is impossible to represent. Raise explicit domain exceptions (`ValueError` with descriptive messages) rather than returning error codes. **Checkpoint:** After construction, the object must be guaranteed valid — no getters that return partial/invalid data.; 
5. **Publish Domain Events After State Changes**: Mutate state first, then record events. Do not modify state based on incoming events in the same transaction unless using CQRS/event sourcing with a proven materialized view pattern. **Checkpoint:** Event handlers must be idempotent and handle out-of-order delivery.; 
6. **Separate Domain from Infrastructure**: Domain models must never import database drivers, message brokers, or HTTP clients. Use repository interfaces defined in the domain layer, implemented in infrastructure. **Checkpoint:** Run `import` analysis on all domain files — if any import references `sqlalchemy`, `django.db`, `redis`, or network code, refactor immediately.
---
## Implementation Patterns

This section outlines the processes involved in applying Domain-Driven Design:

### Key Implementation Patterns

1. **Elicit Ubiquitous Language** — Interview domain experts and extract key nouns and verbs. Resolve conflicting terminology to maintain clarity.
2. **Identify Bounded Contexts** — Use context mapping techniques to separate different aspects of the business logic with clear ownership.
3. **Model Tactical Elements** — Identify aggregates, entities, and value objects based on the defined language and contexts to ensure validity in business rules.
4. **Enforce Invariants** — Validate invariants in constructors, ensuring only valid states are created.
5. **Publish Domain Events** — Record changes in the model through events, ensuring all consumers are efficiently notified.

### Example of Aggregate Pattern
```python
class Order:
    def __init__(self, items):
        if not items:
            raise ValueError('An order must have items.');
        self.items = items
    def add_item(self, item):
        self.items.append(item)
    
class OrderEvent:
    def __init__(self, order):
        self.order = order;
        self.timestamp = datetime.now();

```
### Pattern 1: Value Object — Identity by Value, Immutability
Value objects are defined entirely by their attributes. Two value objects with the same attribute values are equal. They are immutable and have no identity field. Use for amounts, dates, addresses, identifiers that carry meaning beyond a database key.
```python
from __future__ import annotations
from dataclasses import dataclass, fields
from decimal import Decimal
from typing import Final

@dataclass(frozen=True, slots=True)
class Money:
    """Immutable monetary value with currency. Equality is based on value, not identity."""
    amount: Decimal
    currency: str

    def __post_init__(self) -> None:
        if self.amount < 0:
            raise ValueError("Money cannot represent negative amounts; use a separate Debt type")
        if len(self.currency) != 3 or not self.currency.isalpha():
            raise ValueError(f"Invalid ISO 4217 currency code: {self.currency!r}")

    def add(self, other: Money) -> Money:
        """Return a new Money with the summed amount. Raises on currency mismatch."""
        if self.currency != other.currency:
            raise ValueError(f"Cannot add different currencies: {self.currency} vs {other.currency}")
        return Money(self.amount + other.amount, self.currency)

    def __repr__(self) -> str:
        return f"{self.amount:.2f} {self.currency}"  # Custom string format for convenience
```
---
## Constraints
### MUST DO
- Identify bounded contexts by separating ubiquitous language from shared infrastructure concerns
- Model value objects as immutable types with value-based equality (no identity field)
- Model entities with stable identity, protected through constructor validation and invariant checks
- Enforce all business invariants inside aggregate root constructors — never allow invalid state
- Publish domain events as immutable records after state transitions, not before
- Keep aggregates small (one primary key per transaction) to avoid distributed consistency problems
- Separate domain layer from infrastructure — no ORM annotations, no SQL strings in domain models
### MUST NOT DO
- Inject ORM models into the domain layer — repositories are interfaces, not SQLAlchemy/TypeORM classes
- Use CQRS for simple CRUD applications — the separation of read and write paths adds 2-3x more code with no benefits for basic operations
- Create aggregates that require loading other aggregates to maintain invariants — this violates the aggregate boundary principle
- Use Event Sourcing without snapshots for aggregates that accumulate thousands of events — reconstruction latency becomes unacceptable
- Place business validation logic in controllers, services, or DTOs — all invariants belong inside aggregate roots

---
## Live References
- [Domain-Driven Design Reference by Eric Evans](https://domainlanguage.com/ddd/reference/)
- [Event Sourcing Documentation by AxonIQ](https://docs.axoniq.io/reference-guide/)