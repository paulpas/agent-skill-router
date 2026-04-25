---
name: patterns
description: '"Provides Software architecture patterns including MVC, MVVM, microservices,
  event-driven, CQRS, DDD, hexagonal architecture, layered architecture, and pattern"'
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  role: reference
  scope: implementation
  output-format: code
  triggers: architectural patterns, system design, architecture, microservices, design
    patterns, CQRS, DDD, hexagonal architecture
  related-skills: code-quality-policies
---




# Software Architecture Patterns

Reference guide for foundational architectural patterns used in software system design, including MVC, MVVM, microservices, event-driven, CQRS, Domain-Driven Design, hexagonal architecture, and layered patterns, with decision criteria for pattern selection.

## TL;DR Checklist

- [ ] Understand monolithic vs. distributed architecture tradeoffs
- [ ] Know when to apply MVC/MVVM vs. event-driven vs. microservices patterns
- [ ] Recognize bounded contexts in Domain-Driven Design for system decomposition
- [ ] Apply CQRS for read-heavy systems with complex queries
- [ ] Design hexagonal architecture to isolate business logic from frameworks
- [ ] Evaluate organizational structure and deployment constraints before choosing pattern

---

## When to Use This Skill

Use architecture patterns when:

- Designing new systems or major components from scratch
- Refactoring monoliths to improve testability or scalability
- Evaluating whether microservices are justified for your use case
- Teaching team members about system design tradeoffs
- Defining domain boundaries in complex business logic
- Choosing between read-write separation and traditional CRUD patterns
- Designing systems to isolate business logic from framework details

---

## When NOT to Use This Skill

Avoid pattern-driven design when:

- Building a simple CRUD application (standard framework patterns suffice)
- Team is unfamiliar with pattern concepts (complexity outweighs benefits)
- Timeline is tight and architectural debt is acceptable short-term
- Existing codebase has established patterns (consistency > perfection)
- System is prototype or proof-of-concept (avoid premature architecture)
- Team size and organizational structure don't match pattern complexity

---

## Architectural Pattern Matrix

| Pattern | Complexity | Scalability | Testing | Best For |
|---------|-----------|------------|---------|----------|
| **Layered** | Low | Medium | Medium | Traditional web apps, quick MVPs |
| **MVC** | Low-Medium | Medium | Medium | Web applications, forms-heavy |
| **MVVM** | Medium | Medium-High | High | Desktop apps, SPAs with rich state |
| **Hexagonal** | Medium | Medium | High | Complex business logic, plugin systems |
| **Event-Driven** | Medium-High | High | Medium | Real-time systems, event streams |
| **CQRS** | High | Very High | Medium | Read-heavy with complex queries |
| **Microservices** | Very High | Very High | High | Large teams, independent deployment |
| **DDD** | High | Varies | High | Complex business domains |

---

## Layered Architecture

### Structure

```
┌──────────────────────┐
│  Presentation Layer  │  (Web controllers, APIs)
├──────────────────────┤
│  Business Layer      │  (Use cases, validation)
├──────────────────────┤
│  Persistence Layer   │  (Database access)
├──────────────────────┤
│  Data Access Layer   │  (ORM, queries)
└──────────────────────┘
```

### Implementation Pattern

```python
# ❌ BAD — Mixed concerns
def process_order(order_id):
    db = connect_to_database()
    order = db.query("SELECT * FROM orders WHERE id = ?", order_id)
    
    if order.total > 1000:
        apply_discount(order, 0.1)
    
    db.execute("UPDATE orders SET status = 'processed'")
    send_email(order.customer_email)
    return render_response(order)

# ✅ GOOD — Clear layering
# Layer 1: Data Access
class OrderRepository:
    def get_by_id(self, order_id: int) -> Order:
        return db.query(Order).filter_by(id=order_id).first()
    
    def update(self, order: Order) -> None:
        db.session.commit()

# Layer 2: Business Logic
class OrderService:
    def __init__(self, repo: OrderRepository, notifier: Notifier):
        self.repo = repo
        self.notifier = notifier
    
    def process_order(self, order_id: int) -> Order:
        order = self.repo.get_by_id(order_id)
        
        if order.total > 1000:
            order.discount = 0.1
        
        order.status = "processed"
        self.repo.update(order)
        self.notifier.notify_customer(order)
        
        return order

# Layer 3: Presentation
@app.route('/orders/<int:order_id>/process', methods=['POST'])
def process_order_endpoint(order_id):
    service = OrderService(repo, notifier)
    order = service.process_order(order_id)
    return jsonify(order.to_dict())
```

---

## Hexagonal Architecture (Ports & Adapters)

### Structure

```
┌─────────────────────────────────────┐
│         External Systems            │
│  (HTTP, Database, Messaging)        │
└──────────────┬──────────────────────┘
               │
        ┌──────▼────────┐
        │ Adapter Layer │  (Database adapters, HTTP handlers)
        └──────┬────────┘
               │
┌──────────────▼───────────────────────┐
│    Business Logic (Domain Core)      │
│  ✓ No framework dependencies         │
│  ✓ Pure business rules               │
│  ✓ Independently testable            │
└──────────────┬───────────────────────┘
               │
        ┌──────▼────────┐
        │ Port Layer    │  (Abstract interfaces)
        └──────┬────────┘
               │
┌──────────────▼───────────────────────┐
│    External Services / Frameworks    │
└───────────────────────────────────────┘
```

### Implementation Pattern

```python
# Port: Abstract interface
from abc import ABC, abstractmethod

class PaymentPort(ABC):
    @abstractmethod
    def charge(self, amount: float, customer_id: str) -> bool:
        pass

# Domain: Pure business logic
class OrderDomain:
    def __init__(self, payment_port: PaymentPort):
        self.payment = payment_port
    
    def complete_order(self, order: Order) -> bool:
        # Business logic has NO knowledge of payment provider
        if not self._validate_order(order):
            return False
        
        if not self.payment.charge(order.total, order.customer_id):
            return False
        
        order.status = "paid"
        return True
    
    def _validate_order(self, order: Order) -> bool:
        return order.total > 0 and order.customer_id is not None

# Adapter: Concrete implementation (can be swapped)
class StripePaymentAdapter(PaymentPort):
    def charge(self, amount: float, customer_id: str) -> bool:
        try:
            stripe.Charge.create(amount=amount, customer=customer_id)
            return True
        except Exception:
            return False

# Alternative adapter (easily swappable)
class PaypalPaymentAdapter(PaymentPort):
    def charge(self, amount: float, customer_id: str) -> bool:
        # Paypal-specific implementation
        pass

# Injection: Use domain with any adapter
domain = OrderDomain(payment_port=StripePaymentAdapter())
success = domain.complete_order(order)
```

---

## Domain-Driven Design (DDD)

### Core Concepts

```
Ubiquitous Language
  ↓
Bounded Contexts
  ├─ Core Domain        (Competitive advantage)
  ├─ Supporting Domain  (Needed but generic)
  └─ Generic Domain     (Commodity, buy-off-shelf)
  
Domain Model
  ├─ Entities          (Identity-based)
  ├─ Value Objects     (Immutable, equality-based)
  ├─ Aggregates        (Consistency boundary)
  └─ Repositories      (Persistence abstraction)
```

### Implementation Pattern

```python
from dataclasses import dataclass
from typing import List
from enum import Enum

# Value Object: No identity, immutable
@dataclass(frozen=True)
class Money:
    amount: float
    currency: str
    
    def __post_init__(self):
        if self.amount < 0:
            raise ValueError("Money cannot be negative")

# Entity: Has identity, mutable
class Customer:
    def __init__(self, customer_id: str, name: str):
        self.id = customer_id
        self.name = name
        self.orders: List['Order'] = []
    
    def __eq__(self, other):
        # Identity-based equality
        return isinstance(other, Customer) and self.id == other.id

# Aggregate Root: Consistency boundary
class Order:
    def __init__(self, order_id: str, customer: Customer):
        self.id = order_id
        self.customer = customer
        self.items: List[LineItem] = []
        self.status = "pending"
    
    def add_item(self, product: str, quantity: int, price: Money):
        # Business rule: maintain consistency
        if self.status != "pending":
            raise Exception("Cannot add items to non-pending order")
        
        self.items.append(LineItem(product, quantity, price))
    
    def get_total(self) -> Money:
        total = sum(
            Money(item.price.amount * item.quantity, item.price.currency)
            for item in self.items
        )
        return total

# Repository: Abstract persistence
class OrderRepository:
    def save(self, order: Order) -> None:
        # Only aggregate roots are saved; contained objects are saved with it
        pass
    
    def get_by_id(self, order_id: str) -> Order:
        pass

# Service: Cross-aggregate operations
class OrderService:
    def __init__(self, order_repo: OrderRepository, payment_service):
        self.order_repo = order_repo
        self.payment_service = payment_service
    
    def checkout(self, order: Order) -> bool:
        # Service coordinates multiple aggregates
        total = order.get_total()
        
        if not self.payment_service.charge(order.customer.id, total):
            return False
        
        order.status = "paid"
        self.order_repo.save(order)
        
        return True
```

---

## CQRS (Command Query Responsibility Segregation)

### Structure

```
┌──────────────────┐
│   Write Model    │  (Commands: Create, Update, Delete)
│  (Transactional) │  → Updates normalized write DB
└────────┬─────────┘
         │
         ├─────────────────────────┐
         │  Event Store / Projections
         │
┌────────▼─────────┐
│   Read Model     │  (Queries: Complex aggregations)
│  (Denormalized)  │  → Optimized for fast reads
└──────────────────┘
```

### Implementation Pattern

```python
from typing import List, Dict
from enum import Enum

class OrderEvent(Enum):
    CREATED = "order_created"
    ITEM_ADDED = "item_added"
    PAID = "order_paid"
    SHIPPED = "order_shipped"

# Write side: Commands that modify state
class OrderCommandHandler:
    def __init__(self, event_store):
        self.event_store = event_store
    
    def create_order(self, order_id: str, customer_id: str):
        event = {
            'type': OrderEvent.CREATED.value,
            'order_id': order_id,
            'customer_id': customer_id,
            'timestamp': datetime.now()
        }
        self.event_store.append(event)
    
    def add_item(self, order_id: str, product: str, quantity: int):
        event = {
            'type': OrderEvent.ITEM_ADDED.value,
            'order_id': order_id,
            'product': product,
            'quantity': quantity,
            'timestamp': datetime.now()
        }
        self.event_store.append(event)

# Read side: Optimized queries
class OrderQueryRepository:
    def __init__(self, read_db):
        self.db = read_db  # Denormalized, pre-aggregated data
    
    def get_customer_order_total(self, customer_id: str) -> float:
        # Fast read from denormalized read model
        return self.db.query(
            "SELECT SUM(total) FROM orders WHERE customer_id = ?",
            customer_id
        ).scalar()
    
    def get_orders_by_status(self, status: str) -> List[Dict]:
        # Optimized for this specific query
        return self.db.query(
            "SELECT * FROM orders WHERE status = ?", status
        ).all()

# Projector: Updates read model from events
class OrderProjector:
    def __init__(self, event_store, read_db):
        self.event_store = event_store
        self.read_db = read_db
    
    def project(self):
        # Rebuild read model from events
        for event in self.event_store.get_all():
            if event['type'] == OrderEvent.CREATED.value:
                self.read_db.execute(
                    "INSERT INTO orders (id, customer_id) VALUES (?, ?)",
                    event['order_id'], event['customer_id']
                )
            elif event['type'] == OrderEvent.ITEM_ADDED.value:
                self.read_db.execute(
                    "INSERT INTO order_items (order_id, product, quantity) VALUES (?, ?, ?)",
                    event['order_id'], event['product'], event['quantity']
                )
```

---

## Event-Driven Architecture

### Structure

```
Components publish events
         ↓
Event Broker (Message Queue)
         ↓
Components subscribe and react
```

### Implementation Pattern

```python
from abc import ABC, abstractmethod
from typing import List, Callable

# Event definition
class OrderEvent:
    def __init__(self, order_id: str, data: dict):
        self.order_id = order_id
        self.data = data
        self.timestamp = datetime.now()

# Event publisher
class EventBus:
    def __init__(self):
        self.subscribers: Dict[str, List[Callable]] = {}
    
    def subscribe(self, event_type: str, handler: Callable):
        if event_type not in self.subscribers:
            self.subscribers[event_type] = []
        self.subscribers[event_type].append(handler)
    
    def publish(self, event_type: str, event: OrderEvent):
        if event_type in self.subscribers:
            for handler in self.subscribers[event_type]:
                handler(event)

# Decoupled components
class OrderService:
    def __init__(self, event_bus: EventBus):
        self.event_bus = event_bus
    
    def create_order(self, customer_id: str) -> str:
        order_id = generate_id()
        # Business logic...
        
        # Publish event (no knowledge of subscribers)
        self.event_bus.publish('order.created', OrderEvent(order_id, {
            'customer_id': customer_id,
            'timestamp': datetime.now()
        }))
        
        return order_id

class EmailNotificationService:
    def __init__(self, event_bus: EventBus):
        event_bus.subscribe('order.created', self.on_order_created)
    
    def on_order_created(self, event: OrderEvent):
        # Send email notification
        send_email(f"Order {event.order_id} created")

class InventoryService:
    def __init__(self, event_bus: EventBus):
        event_bus.subscribe('order.created', self.on_order_created)
    
    def on_order_created(self, event: OrderEvent):
        # Reserve inventory
        reserve_inventory(event.order_id)
```

---

## Microservices Architecture

### Decision Criteria

```
✓ USE MICROSERVICES when:
  - Team has 50+ engineers (Conway's Law)
  - Services need independent deployment
  - Different services have different tech stacks
  - Scaling needs differ by service
  - Different teams own different services
  - High availability required for individual components

✗ AVOID MICROSERVICES for:
  - Small teams (<10 engineers)
  - Tightly coupled business logic
  - Single deployment cadence
  - Limited budget for operational complexity
  - Prototype or MVP phase
```

### Service Boundaries

```python
# Domain-driven service boundary design
# Each service owns its data, exposes via API

class OrderService:
    """Service owns orders and orchestrates fulfillment"""
    
    def create_order(self, customer_id: str, items: List[Item]) -> Order:
        # Owns order persistence
        order = Order(customer_id, items)
        self.db.save(order)
        
        # Calls other services via REST/gRPC
        inventory = self.inventory_service.reserve(items)
        payment = self.payment_service.charge(customer_id, order.total)
        
        if not inventory or not payment:
            self.rollback(order)
            return None
        
        return order

class PaymentService:
    """Owns payment data and logic"""
    
    @app.route('/charge', methods=['POST'])
    def charge(self, customer_id: str, amount: float):
        # Only exposed API; database is private
        return self.process_payment(customer_id, amount)

class InventoryService:
    """Owns inventory and reservations"""
    
    @app.route('/reserve', methods=['POST'])
    def reserve(self, items: List[Item]):
        # Only exposed API; warehouse data is private
        return self.reserve_items(items)
```

---

## Constraints

### MUST DO

- Choose pattern based on team size and deployment constraints, not hype
- Start simple (layered) and evolve to complex patterns as needed
- Define clear boundaries between layers/services
- Make the domain language explicit in code (ubiquitous language for DDD)
- Test business logic independent of framework or infrastructure

### MUST NOT DO

- Never start with microservices for a new product (premature complexity)
- Never ignore organizational structure when choosing architecture
- Never mix patterns without clear separation (confusing to team)
- Never let framework drive architecture (architecture should drive framework choice)
- Never assume pattern scales without measuring (test with real load)

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-code-quality-policies` | Enforcement mechanisms for maintaining architectural boundaries |

