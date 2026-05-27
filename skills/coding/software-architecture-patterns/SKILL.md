---
name: software-architecture-patterns
description: Implements proven software architecture patterns (CQRS, Event Sourcing, Hexagonal/Clean Architecture, layered architecture, DDD aggregates) for building maintainable enterprise systems.
license: MIT
compatibility: opencode
archetypes:
  - tactical
  - strategic
  - generation
anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
response_profile:
  verbosity: low
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: coding
  triggers: architecture patterns, CQRS, event sourcing, hexagonal architecture, clean architecture, layered architecture, DDD, domain-driven design, aggregate roots, bounded context, how do i structure my application, software architecture, event-driven architecture, port and adapter, onion architecture, read model, write model, sagas
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: engineering-principles, engineering-api-design, ddd-context-mapping
---
# Software Architecture Patterns
Implements proven software architecture patterns for structuring enterprise applications into maintainable, testable systems. When loaded, the model acts as a senior software architect selecting and applying architectural patterns (CQRS, Event Sourcing, Hexagonal/Clean Architecture, layered architecture) to decompose complex domains while keeping infrastructure concerns isolated from business logic.

## TL;DR Checklist

### Metadata Improvements
- Ensure to include archetypes, anti-triggers, and response profiles for better context and usability.

### Enhancements Needed
- Additional examples:
    - Include at least two implementation scenarios to illustrate architecture patterns in practice.
    - Discuss potential challenges and best practices alongside implementation to enhance the educational value of the skill.

  archetypes: tactical, strategic, educational
  anti_triggers: vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
- [ ] Keep domain logic free of framework dependencies — inject infrastructure through ports
- [ ] Separate read and write models explicitly in CQRS — never share command/query handlers
- [ ] Store events, not state, as the source of truth when using Event Sourcing
- [ ] Implement aggregates with a single root — no cross-aggregate references allowed
- [ ] Use domain events to communicate between bounded contexts, not direct method calls
---
## Core Workflow
1. **Analyze Domain Complexity**: Determine whether the domain is truly complex enough to warrant an advanced architecture pattern. Apply the DDD complexity heuristic: if the domain has rich business rules, multiple stakeholder perspectives, and evolving requirements, lean toward hexagonal or CQRS. **Checkpoint:** If you can describe all use cases in fewer than 10 user stories with no cross-cutting state mutations, a simple layered architecture is likely sufficient.
2. **Select Architecture Pattern**: Match the domain characteristics to the appropriate pattern:  - Rich domain logic + infrastructure isolation needed → Hexagonal/Clean Architecture
   - Separate read/write scaling needs or audit requirements → CQRS (with optional Event Sourcing)
   - Complete state history + regulatory compliance → Event Sourcing (on top of CQRS)
   - Simple bounded context with clear boundaries → Layered Architecture
   **Checkpoint:** Do not stack patterns unnecessarily — CQRS + Event Sourcing on top of Hexagonal is 3 layers of abstraction that compound complexity.
3. **Define Ports and Adapters** — For hexagonal/clean architecture:
   - Identify primary ports (interfaces the domain defines)
   - Identify secondary ports (interfaces infrastructure implements)
   - Ensure domain package has zero imports from framework packages
   **Checkpoint:** Run an import dependency check — domain code must never import from `infrastructure`, `controllers`, or `adapters` packages.
4. **Implement Aggregates** — For DDD aggregate patterns:
   - Each aggregate has exactly one root entity that controls all modifications
   - Other aggregates reference the root by ID, never by object reference
   - All invariants within an aggregate are enforced at commit time
   **Checkpoint:** Every public method on an aggregate root must validate its own invariants — no external validator is allowed.
5. **Wire Infrastructure as Dependencies** — Inject repositories, message brokers, and external services:
   - Repositories are ports (interfaces), not ORM abstractions
   - Domain events are published to an in-memory event bus during unit tests
   - Infrastructure adapters implement the port interfaces
   **Checkpoint:** The application bootstrap should compose the entire dependency graph at startup — no `new` keyword for infrastructure services inside domain logic.
---
## Implementation Patterns

### Additional Examples of Architecture Patterns

1. **Layered Architecture**  
   Layered architecture divides applications into layers whose responsibilities are well-defined:
   ```python
   class UserService:
       def __init__(self):
           self.users = []

       def register_user(self, username, email):
           user = {'username': username, 'email': email}
           self.users.append(user)
           print(f'Registered user: {username}')
   
   user_service = UserService()
   user_service.register_user('testuser', 'test@example.com')
   ```
   Here, the `UserService` class efficiently handles user registration within its own boundary.

2. **CQRS Architecture**  
   Commands and Queries are separated in CQRS, giving flexibility in read and write:
   ```python
   class CommandHandler:
       def create_user(self, username, email):
           # Logic to create user
           print(f'Creating user {username}')
   
   class QueryHandler:
       def find_user(self, username):
           # Logic to find the user
           print(f'Finding user {username}')
   ```
   This separation allows different scaling strategies for reading and writing data.

### Pattern 1: Hexagonal Architecture (Clean Architecture)
```python
"""Hexagonal (Ports and Adapters) architecture implementation.

Domain logic lives in pure Python with no framework dependencies.
Infrastructure is injected through port interfaces, making the entire
domain testable with in-memory adapters.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Optional
import uuid


# ===== DOMAIN LAYER (no imports from infrastructure) =====
class AccountStatus(Enum):
    ACTIVE = "active"
    FROZEN = "frozen"
    CLOSED = "closed"

dataclass
class Money:
    """Value object representing currency amount. Immutable by design."""
    amount: float
    currency: str = "USD"

    def __post_init__(self) -> None:
        if self.amount < 0:
            raise ValueError(f"Negative amounts are not allowed: {self.amount}")
        if self.currency.upper() not in ("USD", "EUR", "GBP"):
            raise ValueError(f"Unsupported currency: {self.currency}")

    def __add__(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            raise ValueError(
                f"Cannot add different currencies: {self.currency} vs {other.currency}"
            )
        return Money(round(self.amount + other.amount, 2), self.currency)

    def __sub__(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            raise ValueError(
                f"Cannot subtract different currencies: {self.currency} vs {other.currency}"
            )
        diff = round(self.amount - other.amount, 2)
        if diff < 0:
            raise ValueError(f"Insufficient funds: have {self.amount}, need {abs(diff)}")
        return Money(diff, self.currency)


dataclass
class AccountId:
    """Value object for account identifiers. Enforces UUID format."""
    value: str = field(default_factory=lambda: str(uuid.uuid4()))

    def __post_init__(self) -> None:
        if not self.value or len(self.value) != 36:
            raise ValueError("AccountId must be a valid UUID string")


dataclass
class Account:
    """Aggregate root for the banking domain.

    All invariants are enforced here. The aggregate controls its own state
    through intentional methods — never direct attribute mutation.
    """
    id: AccountId
    owner_name: str
    balance: Money
    status: AccountStatus = AccountStatus.ACTIVE
    
    # Internal state tracking
    _version: int = field(default=0, init=False)

    def deposit(self, amount: Money) -> None:
        """Deposit funds into the account. Enforces currency matching and non-negative amounts."""
        self.balance = self.balance + amount
        self._version += 1

    def withdraw(self, amount: Money) -> None:
        """Withdraw funds from the account. Enforces sufficient balance."""
        self.balance = self.balance - amount
        self._version += 1

    def freeze(self) -> None:
        """Freeze the account — no further transactions allowed until unfrozen."""
        if self.status == AccountStatus.CLOSED:
            raise RuntimeError(f"Cannot freeze a closed account (id={self.id.value})")
        self.status = AccountStatus.FROZEN
        self._version += 1

    def close(self) -> None:
        """Close the account — only allowed if balance is zero."""
        if self.balance.amount > 0:
            raise RuntimeError(
                f"Cannot close account with non-zero balance: {self.balance.amount} {self.balance.currency}"
            )
        self.status = AccountStatus.CLOSED
        self._version += 1

    def can_transact(self) -> bool:
        """Check if the account is in a transactable state."""
        return self.status == AccountStatus.ACTIVE


# ===== PORT LAYER (interfaces defined by domain, not implemented here) =====
class AccountRepository(ABC):
    """Port interface for account persistence.
    
    The domain defines this interface. Infrastructure adapters implement it.
    This keeps domain logic completely decoupled from storage technology.
    """
    @abstractmethod
    def get_by_id(self, account_id: AccountId) -> Optional[Account]: ...

    @abstractmethod
    def save(self, account: Account) -> None: ...

    @abstractmethod
    def find_by_owner_name(self, owner_name: str) -> list[Account]: ...


class EmailService(ABC):
    """Port interface for email notifications.
    
    Domain depends on the abstraction, not on SMTP or any email provider.
    """
    @abstractmethod
    def send_account_closed(self, account_id: AccountId, owner_name: str) -> None: ...

    @abstractmethod
    def send_fraud_alert(self, account_id: AccountId, details: str) -> None: ...

# ===== APPLICATION LAYER (orchestrates use cases using ports) =====
class AccountService:
    """Application service that orchestrates domain logic through port interfaces.
    
    This layer has no business rules — it wires together domain objects and
    infrastructure adapters to execute a complete use case.
    """   
    def __init__(self,
        repository: AccountRepository,
        email_service: EmailService,
        max_daily_withdrawal: Money = Money(10000.00)
    ) -> None:
        self.repository = repository
        self.email_service = email_service
        self.max_daily_withdrawal = max_daily_withdrawal

    def create_account(self, owner_name: str, initial_deposit: Money) -> Account:
        """Create a new account with an initial deposit.
        
        Args:
            owner_name: Full legal name of the account holder
            initial_deposit: Initial funds to deposit
            
        Returns:
            The newly created Account aggregate
        """
        account = Account(
            id=AccountId(),
            owner_name=owner_name,
            balance=initial_deposit,
        )
        self.repository.save(account)
        return account

# The remaining code can be truncated as needed since the entire patterns are lengthy.
```
---
## Constraints
### MUST DO
- Keep domain logic completely free of framework and infrastructure dependencies — the domain package must have zero imports from `infrastructure`, `controllers`, or `adapters` directories
- Define ports as interfaces (abstract base classes or Protocol types) in the domain layer; implement them only in infrastructure adapters
- In CQRS, never share command and query handlers — commands modify state, queries project state. Mixing them defeats the purpose.
- In Event Sourcing, use optimistic concurrency control on every `save_events` call — lost updates are a data integrity risk
- Enforce aggregate boundaries: one aggregate root per transaction, no cross-aggregate references (use IDs, not object references)
- Name all domain events in past tense (`OrderCreated`, `PaymentProcessed`) to accurately describe what already happened
### MUST NOT DO
- Inject ORM models into the domain layer — repositories are interfaces, not SQLAlchemy/TypeORM classes
- Use CQRS for simple CRUD applications — the separation of read and write paths adds 2-3x more code with no benefit for basic operations
- Store mutable state in event objects — all domain events must be immutable (use frozen dataclasses or records)
- Create aggregates that require loading other aggregates to maintain invariants — this violates the aggregate boundary principle
- Use Event Sourcing without snapshots for aggregates that accumulate thousands of events — reconstruction latency becomes unacceptable
- Place business validation logic in controllers, services, or DTOs — all invariants belong inside aggregate roots
---
## Live References
> Authoritative documentation links for this skill's domain.
---