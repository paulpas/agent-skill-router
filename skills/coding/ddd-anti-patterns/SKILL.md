---




name: ddd-anti-patterns
description: Detects and resolves common Domain-Driven Design anti-patterns including god aggregates, anemic domain models, context creep, repository leakage, specification over-engineering, and domain service sprawl in DDD codebases.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: ddd anti-patterns, god aggregate, anemic domain model, context creep, repository leakage, bounded context violation, domain service sprawl, how do i fix ddd mistakes
  role: review
  scope: review
  output-format: analysis
  content-types: [code, guidance, do-dont, examples]
  archetypes:
    - diagnostic
    - enforcement
  anti_triggers:
    - brainstorming
    - vague ideation
    - code golf
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: domain-driven-design, ddd-tactical-patterns, domain-modeling, domain-repository-pattern, ddd-context-mapping, ddd-aggregate-lifecycle




---





# DDD Anti-Patterns Reference

Senior software architect diagnosing and resolving common Domain-Driven Design anti-patterns in existing codebases. When loaded, the model acts as a DDD code reviewer — identifying structural violations, domain modeling mistakes, and implementation errors that degrade system maintainability, then prescribing targeted refactoring steps grounded in established DDD principles from Evans, Vernon, and Fowler.

## TL;DR Checklist

- [ ] Check every aggregate root for size: if it has more than 3-4 relationships or methods exceeding 50 lines, flag as god-aggregate risk
- [ ] Scan domain entities for getter/setter-only behavior — zero business logic indicates an anemic model
- [ ] Verify no domain class imports infrastructure code (SQL, HTTP clients, ORM session factories)
- [ ] Ensure bounded contexts share NO entity classes — use DTOs or value objects for cross-context data transfer
- [ ] Confirm every aggregate constructor enforces at least one invariant check
- [ ] Audit Domain Services: if a single service has more than 10 methods or handles cross-aggregate coordination, flag as sprawl risk
- [ ] Check Specification objects: if used to wrap a single boolean expression with no composition, recommend inline condition instead

---

## When to Use

Use this skill when:

- Reviewing DDD codebases for structural violations and domain modeling mistakes before they compound
- A team is experiencing maintenance burden in their domain layer — changes cascade unexpectedly, making the system feel "heavy"
- New DDD practitioners are writing code that looks like DDD on the surface (aggregates, entities) but violates core principles underneath
- Refactoring a legacy system where someone attempted DDD patterns but got them wrong (thin aggregates, behavior in services, infrastructure in domain models)
- Conducting architectural reviews of systems claimed to be "DDD" but exhibiting symptoms like fragile abstractions, circular dependencies, or bloated context boundaries

---

## When NOT to Use

Avoid this skill for:

- Simple CRUD applications — anti-pattern analysis adds overhead when the system has no domain complexity
- Systems not yet implementing DDD patterns — apply `domain-driven-design` first, then use this skill during review cycles
- General code smell detection (naming, formatting, style) — focus exclusively on DDD structural and modeling violations
- Performance profiling or infrastructure optimization — these are separate concerns outside the DDD domain model scope

---

## Core Workflow

1. **Scan for God Aggregates** — Examine every class annotated as an aggregate root. Count relationships (direct fields referencing other domain objects), total methods, and constructor complexity. An aggregate with more than 5 direct dependencies or methods spanning three+ business concerns is a god-aggregate risk. **Checkpoint:** Verify each relationship crosses a genuine responsibility boundary — not just convenience accessors that leak context ownership.

2. **Detect Anemic Domain Models** — Search all entity classes for pure getter/setter methods with zero business logic. An anemic model is when entities store data but behavior lives in services, transaction scripts, or controllers. Flag any entity where the only methods are `get_X()` and `set_Y()`. **Checkpoint:** Confirm there is genuinely no domain behavior — sometimes simple DTOs in application layer legitimately have only getters/setters; the anti-pattern occurs when these live in the domain layer alongside entities that should carry behavior.

3. **Audit Infrastructure Leakage** — Search all files in the domain package for imports of infrastructure concerns: `sqlalchemy`, `django.db`, `redis`, `requests`, `httpx`, any ORM session factory, or database connection pool. Domain models must never depend on persistence mechanisms. **Checkpoint:** Run a full-text search for common infrastructure keywords across the domain directory — any hit requires immediate refactoring to repository interfaces defined in the domain layer.

4. **Evaluate Bounded Context Boundaries** — Check for shared entity classes across bounded contexts. When the same class (e.g., `User`, `Customer`) appears in multiple contexts with identical structure, it creates coupling and terminology drift. Each context must own its own copy of domain concepts. **Checkpoint:** Identify all cross-context imports or shared base classes — these are boundary violations that require introduction of context-specific value objects or DTOs as translation layers.

5. **Assess Domain Service Sprawl** — Locate all Domain Service classes. A single service with more than 8-10 methods typically indicates sprawl — the service has become a catch-all for logic that doesn't belong in any aggregate. Map each method to its responsible aggregate; if methods cluster around specific aggregates, they belong there. **Checkpoint:** For each cross-aggregate operation handled by a Domain Service, ask: "Could this be a domain event notification instead?" If yes, prefer choreography over orchestration.

6. **Check Specification Pattern Over-Engineering** — Find all classes implementing the Specification pattern. If a Specification wraps a single boolean check with no composition (`AND`, `OR`, `NOT`), it adds indirection without benefit. Simple conditions should remain inline. **Checkpoint:** Only promote to Specification when the same condition is evaluated across 3+ locations or requires composition of multiple rules.

---

## Anti-Pattern Catalog

### Anti-Pattern 1: God Aggregate

An aggregate root that is too large, managing too many relationships, enforcing too many invariants, and becoming a bottleneck for both developers (understanding) and databases (transaction scope). The aggregate has grown organically as new requirements were added without considering responsibility boundaries.

**Symptoms:**
- Constructor with 5+ parameters
- Methods that touch three or more distinct business concerns
- Other aggregates reference it frequently to access data they shouldn't need
- Database queries for this aggregate are slow due to size

```python
# ❌ BAD: God Aggregate — Order manages products, customers, payments, shipments, and inventory
class Order(AggregateRoot):
    def __init__(self, customer_id, items, shipping_address, payment_method, 
                 discount_code=None, warehouse_id=None, priority_level="standard"):
        self.id = generate_uuid()
        self.customer = Customer.from_id(customer_id)  # Direct dependency on another aggregate
        self.items = [OrderItem(i.product_id, i.quantity, i.price) for i in items]
        self.shipping_address = shipping_address
        self.payment = Payment(payment_method)  # Should NOT be inside Order aggregate
        self.warehouse = Warehouse.from_id(warehouse_id)  # Cross-context dependency
        self.priority_level = priority_level
        self._apply_discount(discount_code)

    def _apply_discount(self, code: str | None): ...
    def calculate_shipping(self): ...  # Shipping belongs in Shipment aggregate
    def process_payment(self): ...     # Payment belongs in Payment aggregate
    def update_inventory(self, warehouse_id): ...  # Inventory belongs in Inventory aggregate
    def assign_priority(self): ...
    def calculate_tax(self): ...
    def generate_invoice(self): ...

# ✅ GOOD: Split into focused aggregates with event-based coordination
class Order(AggregateRoot):
    """Order aggregate — owns order lifecycle, items, and pricing."""
    
    def __init__(self, customer_id: str, items: list[OrderItem], priority_level: str = "standard"):
        self.id = generate_uuid()
        self.customer_id = customer_id  # Reference only, no loaded entity
        self.items = items
        self.priority_level = priority_level
        self._validate_items()
        
    def add_item(self, product_id: str, quantity: int) -> None:
        """Add item with built-in validation."""
        if quantity <= 0:
            raise DomainError("Quantity must be positive")
        self.items.append(OrderItem(product_id, quantity))
        self._revalidate_totals()

    def calculate_total(self) -> Decimal:
        return sum(item.total for item in self.items)

    def _revalidate_totals(self): ...


# Application layer coordinates cross-aggregate operations
class OrderPlacingService:
    """Application service — orchestrates multi-aggregate operation via events."""
    
    def place_order(self, order_id: str, payment_method: PaymentMethod) -> OrderConfirmed:
        order = self.order_repo.load(order_id)
        order.confirm()  # Domain invariant check inside aggregate
        
        # Publish domain event instead of direct service calls
        events = order.commit_changes()
        
        for event in events:
            if isinstance(event, OrderConfirmed):
                self.payment_service.charge(event.total, payment_method)
                self.inventory_service.reserve(event.items)
                
        return event
```

### Anti-Pattern 2: Anemic Domain Model

Entities and aggregates that contain only data storage (getters/setters) with all business logic pushed into services, controllers, or transaction scripts. This is Martin Fowler's "Anemic Domain Model" anti-pattern — the most common DDD implementation mistake.

**Symptoms:**
- Entity classes are 80%+ getters and setters
- Business rules live in `*Service` classes or controllers
- Adding a new business rule requires touching multiple service files
- Domain entities look like DTOs or database row mappers

```python
# ❌ BAD: Anemic Domain Model — all logic lives in OrderService
class OrderEntity:
    def __init__(self, id, customer_id, items, status, total):
        self.id = id
        self.customer_id = customer_id
        self.items = items  # List of dicts: {"product_id": "p1", "qty": 2}
        self.status = status
        self.total = total

    # Only getters/setters — no behavior
    def get_items(self): return self.items
    def set_items(self, items): self.items = items
    def get_status(self): return self.status
    def set_status(self, status): self.status = status


class OrderService:
    """God service containing ALL business logic for orders."""
    
    def create_order(self, customer_id, item_data_list):
        # Business rules should be IN the entity, not here
        if not item_data_list:
            raise ValueError("Order must have items")
        
        total = 0
        for item in item_data_list:
            product = self.product_repo.find(item["product_id"])
            if product.price < 0:
                raise ValueError(f"Invalid price for {product.name}")
            total += product.price * item["qty"]
        
        order = OrderEntity(None, customer_id, item_data_list, "draft", total)
        self.order_repo.save(order)
        return order

    def cancel_order(self, order_id):
        order = self.order_repo.find(order_id)
        if order.status == "shipped":
            raise ValueError("Cannot cancel shipped order")
        order.status = "cancelled"  # Mutation without validation logic in entity
        self.order_repo.save(order)

    def apply_discount(self, order_id, discount_code):
        order = self.order_repo.find(order_id)
        discount = self.discount_repo.find(discount_code)
        if discount.expired():
            raise ValueError("Discount expired")
        if discount.valid_for_product(order.items):
            order.total *= (1 - discount.percentage)
        self.order_repo.save(order)

# ✅ GOOD: Behavior embedded in domain entities
class Order(AggregateRoot):
    """Order aggregate with embedded business rules."""
    
    def __init__(self, customer_id: str, items: list[OrderItem]):
        self.id = generate_uuid()
        self.customer_id = customer_id
        self.items = items  # Properly typed domain objects
        self.status = "draft"
        self._discount_applied: Decimal = Decimal("0")
        
    def add_item(self, product: Product, quantity: int) -> None:
        """Add item with built-in validation — business rule encapsulated."""
        if quantity <= 0:
            raise DomainError(f"Quantity must be positive, got {quantity}")
        if product.price < Decimal("0"):
            raise DomainError(f"Invalid price for product {product.id}")
        self.items.append(OrderItem(product.id, quantity, product.price))

    def cancel(self) -> None:
        """Cancel with invariant enforcement — status transition is domain knowledge."""
        if self.status == "shipped":
            raise StateError("Cannot cancel a shipped order")
        if self.status == "cancelled":
            raise StateError("Order already cancelled")
        self._apply_cancel_event()

    def apply_discount(self, discount: Discount) -> None:
        """Apply discount with validation embedded in the domain object."""
        if discount.expired():
            raise DomainError(f"Discount {discount.code} has expired")
        if not discount.valid_for_items(self.items):
            raise DomainError(f"Discount {discount.code} does not apply to these items")
        self._discount_applied = discount.calculate(self._subtotal())

    def calculate_total(self) -> Decimal:
        return self._subtotal() - self._discount_applied

    @property
    def _subtotal(self) -> Decimal:
        return sum(item.quantity * item.unit_price for item in self.items)


# Application layer now delegates to domain — orchestrates, doesn't dictate logic
class OrderService:
    """Application service — thin orchestration layer only."""
    
    def place_order(self, customer_id: str, product_ids: list[str], quantities: list[int]):
        product_repo = self._load_products(product_ids)
        items = [OrderItem(p.id, q, p.price) for p, q in zip(product_repo, quantities)]
        order = Order(customer_id, items)  # Validation happens inside aggregate
        self.order_repo.save(order)
        return order

    def cancel_order(self, order_id: str):
        order = self.order_repo.load(order_id)
        order.cancel()  # Business rule enforced inside the entity
        self.order_repo.save(order)
```

### Anti-Pattern 3: Repository Leakage

Infrastructure concerns (database queries, ORM session management, connection handling) leak into domain models. Domain classes import SQL libraries, reference database sessions, or expose persistence details in their interface.

```python
# ❌ BAD: Domain model directly uses SQLAlchemy
from sqlalchemy.orm import Session  # Infrastructure import!

class Order(AggregateRoot):
    def __init__(self, session: Session):
        self.session = session  # Repository pattern abandoned — direct DB access
        self.id = None
        
    def save(self) -> None:
        """This should NOT exist in a domain entity."""
        self.session.add(self)
        self.session.commit()

    @classmethod
    def find_by_customer(cls, customer_id: str, session: Session) -> list['Order']:
        """SQL query inside the domain model — infrastructure dependency!"""
        return self.session.query(Order).filter(
            Order.customer_id == customer_id
        ).all()  # Raw ORM usage in domain layer


# ✅ GOOD: Repository interface defined in domain layer, implemented in infrastructure
class OrderRepository(Protocol):
    """Domain-layer contract for order persistence — no infrastructure imports."""
    
    def load(self, order_id: str) -> 'Order': ...
    def save(self, order: 'Order') -> None: ...
    def find_by_customer(self, customer_id: str) -> list['Order']: ...


class Order(AggregateRoot):
    """Pure domain object — zero infrastructure dependencies."""
    
    def __init__(self, customer_id: str, items: list[OrderItem]):
        self.id = generate_uuid()
        self.customer_id = customer_id
        self.items = items
        # No session, no repository, no database references


class SQLAlchemyOrderRepository:
    """Infrastructure implementation — the only place with ORM imports."""
    
    def __init__(self, session_factory: SessionFactory):
        self.session_factory = session_factory
        
    def load(self, order_id: str) -> Order:
        with self.session_factory() as session:
            result = session.query(SQLAlchemyOrderModel).filter_by(id=order_id).first()
            return _map_to_domain(result)

    def save(self, order: Order) -> None:
        with self.session_factory() as session:
            model = _map_to_infrastructure(order)
            session.add(model)
            session.commit()


# Domain layer remains clean — infrastructure is injected at composition root
def configure_dependencies() -> tuple[OrderRepository, ApplicationService]:
    repo = SQLAlchemyOrderRepository(get_session_factory())
    service = ApplicationService(repo)  # Dependency injection from outside in
    return repo, service
```

### Anti-Pattern 4: Context Creep (Bounded Context Boundary Violation)

Domain concepts leak across bounded context boundaries. The same class name refers to different semantics in different contexts, or classes are shared between contexts creating tight coupling and terminology conflicts.

**Symptoms:**
- A `Customer` entity in the Sales context has different fields from the Support context's `Customer`
- Import statements cross context module boundaries directly (not through shared value objects)
- Database tables are shared between contexts instead of each context owning its data
- Renaming a field in one context breaks another context

```python
# ❌ BAD: Shared entity across bounded contexts creates coupling
# In sales_context/models.py AND support_context/models.py:
class Customer:  # Same class name, different semantics in each context
    def __init__(self, customer_id, name, email, credit_score):
        self.id = customer_id
        self.name = name
        self.email = email
        self.credit_score = credit_score  # Sales cares about this; Support doesn't

    def calculate_risk(self) -> str: ...  # Sales behavior — not relevant to Support


# In support_context/support_service.py:
from sales_context.models import Customer  # Direct cross-context import!

class SupportService:
    def get_customer_info(self, customer_id):
        customer = Customer.from_db(customer_id)
        return f"Name: {customer.name}, Email: {customer.email}"


# ✅ GOOD: Context-specific value objects with explicit translation layer
# In sales_context/models.py
@dataclass(frozen=True)
class SalesCustomerProfile:
    """Sales-context specific view of customer data."""
    id: str
    name: str
    email: str
    credit_score: int  # Sales-only concern
    
    def calculate_risk(self) -> str:
        if self.credit_score < 500:
            return "high"
        return "low"


# In support_context/models.py
@dataclass(frozen=True)
class SupportCustomerProfile:
    """Support-context specific view of customer data."""
    id: str
    name: str
    email: str
    tickets_open: int  # Support-only concern
    last_contact_date: date | None


# Explicit translation — no direct sharing, clear boundaries
class CustomerContextTranslator:
    """Maps between context representations — owns the translation rules."""
    
    @staticmethod
    def to_sales_profile(support_profile: SupportCustomerProfile) -> SalesCustomerProfile:
        """Translate support profile to sales profile — only shares agreed-upon fields."""
        return SalesCustomerProfile(
            id=support_profile.id,
            name=support_profile.name,
            email=support_profile.email,
            credit_score=0  # Unknown from support context — explicit gap
        )


# Each bounded context owns its own data models
class SalesService:
    def __init__(self, customer_repo):
        self.repo = customer_repo  # Repository scoped to sales context
        
    def assess_risk(self, customer_id: str) -> str:
        profile = self.repo.find_profile(customer_id)  # Returns SalesCustomerProfile
        return profile.calculate_risk()
```

### Anti-Pattern 5: Domain Service Sprawl

A Domain Service that grows unbounded — becoming a catch-all for all cross-aggregate logic. Instead of distributing coordination responsibilities, everything funnels through one giant service class that coordinates every multi-aggregate operation.

**Symptoms:**
- A single service has more than 10 public methods
- Methods handle operations across different bounded contexts
- Adding a new business feature requires modifying the Domain Service directly
- The service becomes difficult to test due to its many responsibilities

```python
# ❌ BAD: God Domain Service — everything goes here
class OrderDomainService:
    """Overloaded domain service handling ALL cross-aggregate operations."""
    
    def __init__(self, order_repo, payment_repo, inventory_repo, 
                 shipping_repo, notification_service, discount_repo):
        self.order_repo = order_repo
        self.payment_repo = payment_repo
        self.inventory_repo = inventory_repo
        self.shipping_repo = shipping_repo
        self.notification = notification_service
        self.discount_repo = discount_repo

    def place_order(self, customer_id, items, payment_method): ...      # Method 1
    def cancel_order(self, order_id): ...                              # Method 2
    def refund_order(self, order_id, amount): ...                      # Method 3
    def update_shipping(self, order_id, address): ...                  # Method 4
    def apply_promotion(self, order_id, promo_code): ...               # Method 5
    def generate_invoice(self, order_id): ...                          # Method 6
    def process_refund(self, order_id, reason): ...                    # Method 7
    def calculate_shipping_cost(self, order_id): ...                   # Method 8
    def assign_warehouse(self, order_id, warehouse): ...               # Method 9
    def notify_customer(self, order_id, message): ...                  # Method 10
    def handle_overstock(self, product_id): ...                        # Method 11
    def process_bulk_order(self, items): ...                           # Method 12


# ✅ GOOD: Split by responsibility — small focused services or event-driven coordination
class OrderPlacementService:
    """Coordinates order creation only — single responsibility."""
    
    def __init__(self, order_repo: OrderRepository, payment_service: PaymentService):
        self.order_repo = order_repo
        self.payment_service = payment_service
        
    def place_order(self, customer_id: str, items: list[OrderItem], 
                    payment_method: PaymentMethod) -> OrderId:
        order = Order(customer_id, items)
        order.confirm()  # Invariant enforced in aggregate
        self.order_repo.save(order)
        
        # Charge payment — event or direct call depending on consistency needs
        self.payment_service.charge(order.calculate_total(), payment_method)
        return order.id


class ShippingService:
    """Coordinates shipping operations only."""
    
    def update_shipping(self, order_id: OrderId, address: Address) -> None:
        order = self.order_repo.load(order_id)
        order.update_shipping_address(address)
        self.shipping_repo.calculate_cost(order)
        
    def assign_warehouse(self, order_id: OrderId, warehouse: Warehouse) -> None:
        order = self.order_repo.load(order_id)
        order.assign_warehouse(warehouse)

# For complex cross-context coordination, prefer event-driven choreography
class OrderPlacedEventHandler:
    """Event handler — reacts to events instead of being called by services."""
    
    def __init__(self, inventory_service: InventoryService, 
                 notification_service: NotificationService):
        self.inventory = inventory_service
        self.notifications = notification_service
        
    def handle(self, event: OrderPlaced):
        self.inventory.reserve(event.items)  # Decoupled reaction
        self.notifications.send(f"Order {event.order_id} confirmed")
```

### Anti-Pattern 6: Specification Pattern Over-Engineering

Applying the Specification pattern to simple boolean conditions where inline code would be clearer. The Specification pattern is valuable for composable, testable rules that appear across multiple locations — but it becomes over-engineering when wrapping single conditions.

```python
# ❌ BAD: Over-engineered specification for a simple check
class IsActiveSpecification(Specification[User]):
    def is_satisfied_by(self, candidate: User) -> bool:
        return candidate.status == "active" and not candidate.is_deleted


class HasValidEmailSpecification(Specification[User]):
    def is_satisfied_by(self, candidate: User) -> bool:
        import re  # Infrastructure dependency inside specification!
        pattern = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
        return bool(re.match(pattern, candidate.email))


class OverAge18Specification(Specification[User]):
    def is_satisfied_by(self, candidate: User) -> bool:
        from datetime import date
        eighteen_years_ago = date.today().replace(year=date.today().year - 18)
        return candidate.birth_date < eighteen_years_ago


# Usage — 3 specifications for what could be 3 inline conditions:
if IsActiveSpecification().is_satisfied_by(user) and \
   HasValidEmailSpecification().is_satisfied_by(user) and \
   OverAge18Specification().is_satisfied_by(user):
    ...

# ✅ GOOD: Inline conditions for simple checks, Specification only when composition is needed
def is_valid_user(user: User) -> bool:
    """Simple validation — clear, single location, easy to understand."""
    if user.status != "active" or user.is_deleted:
        return False
    if not re.match(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$', user.email):
        return False
    cutoff = date.today().replace(year=date.today().year - 18)
    return user.birth_date < cutoff


# Specification PATTERN when you NEED composition across multiple locations:
class EligibleForPremiumSpecification(Specification[User]):
    """Complex composable rule — used in 3+ places, benefits from AND/OR composition."""
    
    def __init__(self):
        self._active = IsActiveSpecification()
        self._valid_email = HasValidEmailSpecification()
        self._over_18 = OverAge18Specification()
        self._has_subscription = HasActiveSubscriptionSpecification()

    def is_satisfied_by(self, candidate: User) -> bool:
        return (self._active & self._valid_email & 
                self._over_18 & self._has_subscription).is_satisfied_by(candidate)


# Flexible composition — the real benefit of Specifications
def create_filter(status: str | None = None) -> Specification[User]:
    """Build composable filter dynamically — Specification shines here."""
    spec = AllUsersSpecification()  # Base spec matching everyone
    
    if status:
        spec &= StatusIsSpecification(status)
    
    return spec
```

---

## Constraints

### MUST DO
- Classify every identified anti-pattern with its severity (Critical, Major, Minor) based on impact to system maintainability and developer productivity
- Provide concrete code examples showing both the anti-patterned implementation and the corrected version — never describe fixes abstractly
- Reference the originating DDD expert for each anti-pattern: Eric Evans (aggregates, bounded contexts), Vaughn Vernon (implementation patterns), Martin Fowler (anemic domain model)
- Prioritize god-aggregate detection first — it causes cascading issues in other areas and is the most common symptom of misunderstanding DDD boundaries
- When suggesting fixes, recommend event-driven choreography over Domain Service orchestration for cross-bounded-context operations

### MUST NOT DO
- Recommend splitting aggregates smaller than a single database transaction can handle — tiny aggregates create consistency nightmares in distributed systems
- Flag simple DTOs in application or presentation layers as anemic models — they are not domain entities and should not carry behavior
- Suggest moving ALL cross-aggregate logic into aggregate methods — this creates god-aggregates, which is worse than using services for coordination
- Recommend shared entity classes across bounded contexts even for "simple" concepts like User or Address — each context must own its representation
- Use the Specification pattern when a simple function or property check suffices — over-engineering a specification is itself an anti-pattern

---

## Output Template

When this skill is active, your output must contain:

1. **Summary Table** — One row per identified anti-pattern with columns: Severity (Critical/Major/Minor), Pattern Name, Location (file path or class name), Brief Description
2. **Detailed Findings** — For each pattern: the code snippet showing the problem, explanation of why it is an anti-pattern, and the corrected code implementation
3. **Refactoring Priority Order** — Numbered list of recommended fix order with justification (e.g., "Fix god-aggregate first because its resolution cascades into improved service boundaries")
4. **Risk Assessment** — Estimate how many days of refactoring effort each fix requires and what regression testing should cover

---

## Related Skills

| Skill | Purpose |
|---|---|
| `domain-driven-design` | Core DDD tactical patterns (entities, value objects, aggregates) — use before anti-patterns to establish correct baseline |
| `ddd-tactical-patterns` | Specification pattern, domain services, aggregate factories — reference for proper implementations when fixing violations |
| `domain-modeling` | Strategic design and bounded context identification — helps prevent context creep by establishing correct boundaries first |
| `ddd-context-mapping` | Context mapping relationships (ACL, customer-supplier, conformist) — provides techniques for healthy cross-context communication |
| `ddd-aggregate-lifecycle` | Aggregate lifecycle management, persistence strategies, consistency patterns — deep dive into proper aggregate design |

---

## Live References

> Authoritative documentation and books on DDD anti-patterns from the field's leading experts.

- [Martin Fowler — Anemic Domain Model](https://martinfowler.com/bliki/AnemicDomainModel.html)
- [Eric Evans — Domain-Driven Design (2003)](https://domainlanguage.com/dd/)
- [Vaughn Vernon — Implementing Domain-Driven Design (1st ed. 2013)](https://vaughnvernon.co/?page_id=168)
- [Domain Language — Ubiquitous Language & Bounded Contexts](https://domainlanguage.com/ddd/reference-material/)

---
