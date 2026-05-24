---
name: clean-architecture
description: Designs software using Robert C. Martin's Clean Architecture concentric layers (Entities, Use Cases, Interface Adapters, Frameworks) with strict dependency rules and boundary contracts for framework-independent business logic.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: clean architecture, robert martin, uncle bob, entity layer, use case layer, interface adapter, dependency rule, framework independence, hexagonal vs clean, bounded entities, port architecture
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, config, do-dont, diagrams]
  related-skills: hexagonal-architecture, ports-patterns, dependency-inversion-principle, domain-driven-design, architectural-review
  archetypes:
    - strategic
    - tactical
  anti_triggers:
    - brainstorming
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
---

# Clean Architecture — Robert C. Martin's Layered Design

Designs software using four concentric layers (Entities, Use Cases, Interface Adapters, Frameworks & Drivers) with strict inward-only dependency rules. Business logic in the inner layers never depends on frameworks, databases, or UI — making tests fast, deployments flexible, and domain models long-lived.

## TL;DR Checklist

- [ ] Verify every dependency arrow points inward: outer → inner, never outer ← inner
- [ ] Entities contain enterprise-wide business rules with no framework dependencies
- [ ] Use Cases encode application-specific business rules and orchestrate workflows
- [ ] Interface Adapters convert data between inner-layer formats and outer-framework formats
- [ ] Frameworks layer contains only frameworks (Web, DB, UI) — zero domain logic here
- [ ] Each layer communicates with the next-inner layer through abstract interfaces defined in that inner layer
- [ ] Unit tests for Use Cases mock Interface Adapter ports and run without database or network

---

## When to Use

Use this skill when:

- Architecting a new application from scratch where long-term maintainability matters more than quick time-to-market
- Refactoring a tightly coupled codebase where business logic is mixed with framework concerns
- A team needs a clear blueprint for who owns which files and directories
- Migrating between frameworks (e.g., Flask → FastAPI, Django → Express) without rewriting business logic
- Setting up test infrastructure where domain logic must be testable in isolation

## When NOT to Use

Avoid this skill for:

- Scripts or one-off automation tools with no lasting lifespan — over-engineering kills productivity here
- Simple CRUD apps with 1–2 endpoints and no complex business rules (use `yagni` instead)
- Real-time game engines, GUI-heavy applications, or data processing pipelines where the "framework" IS the domain
- Teams unwilling to invest in upfront architecture design before writing code

---

## Core Workflow

1. **Identify Entities** — Scan the domain for concepts that carry business rules regardless of application. These are objects with identity, lifecycle, and invariant enforcement (e.g., `Account`, `Order`, `Patient`). They contain ZERO framework imports. **Checkpoint:** Every entity method must be testable with only primitive arguments and return types — no DB connections, no HTTP clients, no external services.

2. **Identify Use Cases** — Enumerate every interaction the system supports (place order, cancel subscription, generate report). Each use case is a single-use function or class that orchestrates entities and validates application-level rules. **Checkpoint:** Each use case must be independently testable by mocking only its entity dependencies — no database, no web server, no message queue needed.

3. **Define Interface Adapter Ports** — For each boundary crossing (database, HTTP API, external service), define an abstract interface in the Use Case or Entity layer that describes what data is needed and produced. The outer layer implements these ports. **Checkpoint:** Every port must be a pure protocol or abstract class with no framework imports — only primitives, entity types, or use case return types.

4. **Wire Interface Adapters** — Implement concrete adapters (controllers, presenters, gateway classes) that convert framework-specific request/response formats into entity/use case inputs and back. Place all web controllers, serializers, and ORM mappings here. **Checkpoint:** The adapter layer must be a thin conversion boundary — if you find business logic in a controller or serializer, move it to the Use Case layer.

5. **Apply Dependency Rule** — Audit every import statement across all layers. No inner-layer file may `import` from an outer-layer file. Inner layers define interfaces; outer layers implement them and depend on them. **Checkpoint:** Run `grep -r "^from.*outer_layer\|^import.*outer_layer` against each inner layer directory — zero results should appear.

6. **Structure the Project** — Organize files in a directory layout that mirrors the architectural layers:

   ```
   src/
     entities/           # Business concepts (no imports from other layers)
     use_cases/          # Application workflows (imports only entities/)
     interface_adapters/ # Controllers, presenters, gateways (imports entities/ and use_cases/)
     frameworks/         # Web framework, DB drivers, UI code (imports everything above)
   ```

   **Checkpoint:** Each directory's `__init__.py` or module declarations must not create circular import paths.

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────┐
│              Frameworks & Drivers Layer               │
│  (Web Servers, DB Drivers, UI Frameworks, MQ Clients) │
│           depends on → Interface Adapters             │
├──────────────────────────────────────────────────────┤
│              Interface Adapters Layer                 │
│  (Controllers, Presenters, Gateway Implementations)   │
│           depends on → Use Cases                      │
├──────────────────────────────────────────────────────┤
│                  Use Cases Layer                      │
│  (Application Business Rules, Workflow Orchestration) │
│           depends on → Entities                       │
├──────────────────────────────────────────────────────┤
│                   Entities Layer                      │
│  (Enterprise Business Rules, Domain Objects)          │
│           depends on nothing internal                 │
└──────────────────────────────────────────────────────┘

Dependency Rule: All arrows point inward. Outer layers depend on inner layers.
Inner layers define interfaces; outer layers implement them.
```

---

## Implementation Patterns

### Pattern 1: Entity Layer (Pure Business Objects)

```python
"""src/entities/order.py — Pure business entity, no external imports."""

from dataclasses import dataclass, field
from datetime import date
from enum import Enum
from typing import Optional


class OrderStatus(Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    SHIPPED = "shipped"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


@dataclass
class OrderItem:
    product_id: str
    quantity: int
    unit_price: float

    @property
    def total_price(self) -> float:
        return self.quantity * self.unit_price


@dataclass
class Order:
    """Core business entity representing a customer order.

    Contains all invariants and business rules for the Order domain.
    No dependencies on databases, APIs, or frameworks.
    """
    order_id: str
    customer_id: str
    items: list[OrderItem] = field(default_factory=list)
    status: OrderStatus = OrderStatus.PENDING
    created_at: date = field(default_factory=date.today)

    @property
    def total(self) -> float:
        return sum(item.total_price for item in self.items)

    def add_item(self, item: OrderItem) -> None:
        """Add an item — enforces business rule: items must have positive quantity."""
        if item.quantity <= 0:
            raise ValueError(f"Quantity must be positive, got {item.quantity}")
        self.items.append(item)

    def confirm(self) -> None:
        """Transition from PENDING to CONFIRMED — only allowed for pending orders."""
        if self.status != OrderStatus.PENDING:
            raise RuntimeError(
                f"Cannot confirm order in state {self.status.value}. "
                f"Allowed transitions: PENDING → CONFIRMED"
            )
        self.status = OrderStatus.CONFIRMED

    def cancel(self) -> None:
        """Cancel an order — only allowed before shipping."""
        if self.status == OrderStatus.SHIPPED:
            raise RuntimeError("Cannot cancel a shipped order. Process refund instead.")
        self.status = OrderStatus.CANCELLED
```

### Pattern 2: Use Case Layer (Application Workflow Orchestration)

```python
"""src/use_cases/place_order.py — Application use case, depends only on entities."""

from src.entities.order import Order, OrderItem
from src.interface_adapters.port.order_gateway import OrderGatewayProtocol


class PlaceOrderUseCase:
    """Orchestrates the business workflow for placing a new order.

    This is NOT the entity logic — it handles application-level rules:
    - Validate cart contents against inventory
    - Calculate taxes (via gateway)
    - Persist the order
    - Trigger downstream events
    """

    def __init__(self, order_gateway: OrderGatewayProtocol) -> None:
        self._gateway = order_gateway

    def execute(
        self,
        customer_id: str,
        items: list[dict[str, object]],
    ) -> dict[str, object]:
        """Place a new order and return the confirmed order details.

        Args:
            customer_id: The customer placing the order.
            items: List of dicts with keys 'product_id', 'quantity', 'unit_price'.

        Returns:
            Dict with 'order_id', 'total', 'status', 'items' for the placed order.
        """
        # Step 1: Build entity from input
        order_items = [
            OrderItem(
                product_id=item["product_id"],
                quantity=int(item["quantity"]),
                unit_price=float(item["unit_price"]),
            )
            for item in items
        ]

        order = Order(customer_id=customer_id, items=order_items)

        # Step 2: Apply application-level rules (not entity invariants)
        if not order.items:
            raise ValueError("Order must contain at least one item")
        if order.total < 0:
            raise ValueError("Order total cannot be negative")

        # Step 3: Persist via gateway (outer layer implementation)
        confirmed_order = self._gateway.save(order)

        # Step 4: Return application response DTO
        return {
            "order_id": confirmed_order.order_id,
            "total": confirmed_order.total,
            "status": confirmed_order.status.value,
            "items": [
                {"product_id": i.product_id, "quantity": i.quantity, "unit_price": i.unit_price}
                for i in confirmed_order.items
            ],
        }
```

### Pattern 3: Interface Adapter — Port Definition and Implementation (BAD vs GOOD)

```python
# ✅ GOOD — Port defined in inner layer, implemented in outer layer

# src/interface_adapters/port/order_gateway.py (inner layer port definition)
from abc import ABC, abstractmethod
from typing import Protocol


class OrderGatewayProtocol(Protocol):
    """Port: defines what the Use Case needs from the persistence layer."""

    @abstractmethod
    def save(self, order: "Order") -> "Order": ...

    @abstractmethod
    def find_by_id(self, order_id: str) -> "Order | None": ...


# src/interface_adapters/order_gateway_sql.py (outer layer implementation)
"""Concrete SQL implementation — imports the port from inner layer."""

import sqlite3
from dataclasses import asdict
from typing import Optional

from src.entities.order import Order
from src.interface_adapters.port.order_gateway import OrderGatewayProtocol


class SqlOrderGateway(OrderGatewayProtocol):
    """Persists orders to a SQL database.

    Converts between entity objects and database rows.
    Zero business logic — pure data conversion and persistence.
    """

    def __init__(self, db_path: str = "orders.db") -> None:
        self._connection_str = db_path

    def save(self, order: Order) -> Order:
        conn = sqlite3.connect(self._connection_path)
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO orders (order_id, customer_id, status, total, items_json)
               VALUES (?, ?, ?, ?, ?)""",
            (
                order.order_id,
                order.customer_id,
                order.status.value,
                order.total,
                _serialize_items(order.items),
            ),
        )
        conn.commit()
        return order

    def find_by_id(self, order_id: str) -> Optional[Order]:
        # ... query and deserialize to Order entity
        pass


def _serialize_items(items) -> str:
    import json
    return json.dumps([{"product_id": i.product_id, "quantity": i.quantity} for i in items])


# ❌ BAD — Port and implementation mixed; business logic leaks into adapter
class BadOrderGateway:
    def __init__(self):
        self.db = sqlite3.connect("orders.db")

    # Mixes business rules with data persistence — VIOLATES dependency rule
    def save(self, order):  # type: ignore
        if not order.customer_id.startswith("CUST-"):
            raise ValueError("Invalid customer ID format")  # validation belongs in Use Case
        if len(order.items) == 0:
            return None  # silent failure instead of raising
        # ... persistence logic here mixed with domain validation
        pass
```

### Pattern 4: Framework Layer — Web Controller (Thin Conversion Boundary)

```python
"""src/frameworks/rest/order_controller.py — Thin web controller, zero business logic."""

from flask import Flask, jsonify, request

from src.interface_adapters.port.order_gateway import OrderGatewayProtocol
from src.use_cases.place_order import PlaceOrderUseCase

app = Flask(__name__)

# Wire use case with concrete gateway at application startup
gateway: OrderGatewayProtocol  # injected from composition root
use_case = PlaceOrderUseCase(gateway)


@app.route("/api/orders", methods=["POST"])
def create_order():
    """REST endpoint — converts HTTP request to use case call.

    This controller does NOT contain business logic.
    It only: parses the HTTP body, calls the Use Case, formats the response.
    All business rules live in PlaceOrderUseCase and Order entities.
    """
    data = request.get_json()

    if "customer_id" not in data or "items" not in data:
        return jsonify({"error": "Missing customer_id or items"}), 400

    result = use_case.execute(
        customer_id=data["customer_id"],
        items=data["items"],
    )

    return jsonify({"order": result}), 201


@app.route("/api/orders/<order_id>", methods=["GET"])
def get_order(order_id: str):
    """REST endpoint — reads order by ID."""
    # Gateway find_by_id returns Order entity, presenter formats it
    order = gateway.find_by_id(order_id)
    if order is None:
        return jsonify({"error": "Order not found"}), 404

    return jsonify({
        "order_id": order.order_id,
        "total": order.total,
        "status": order.status.value,
    }), 200
```

---

## Constraints

### MUST DO
- Define all ports and interfaces in the innermost layer that needs them (Entities or Use Cases)
- Keep Entities completely free of framework imports — only stdlib and data structures
- Make each Use Case independently testable with mock dependencies and no database
- Place all web controllers, CLI handlers, and UI components in the Frameworks layer
- Document the dependency graph for every new file added to the codebase
- Use dependency injection at composition root (application startup) to wire concrete implementations into abstract ports

### MUST NOT DO
- Import from an outer layer into an inner layer — this breaks the dependency rule irreversibly
- Put business logic in controllers, serializers, or database models
- Share DTOs between the API and domain layers — use entity objects directly across boundaries
- Create more than 4 layers — Clean Architecture has exactly four concentric circles
- Mix hexagonal architecture ports with Clean Architecture interfaces — choose one pattern per boundary

---

## Comparison: Clean Architecture vs Hexagonal Architecture

| Aspect | Clean Architecture (Martin) | Hexagonal / Ports & Adapters |
|---|---|---|
| **Primary concern** | Dependency direction and layer boundaries | Application core isolation from frameworks |
| **Layer model** | 4 concentric circles: Entities → Use Cases → Interface Adapters → Frameworks | Inner core (domain) surrounded by ports and adapters |
| **Naming convention** | Entities, Use Cases, Interface Adapters, Frameworks | Driving ports, driven ports, application core, adapters |
| **Dependency rule** | Strict inward-only dependencies | Dependencies point from adapters to the core |
| **Test philosophy** | Unit tests for Use Cases with mocked gateways | Tests on the application core with mock adapters |
| **Best for** | Enterprise apps, long-lifecycle systems, team scaling | Microservices, API-first products, framework migration |

Both achieve the same architectural goals. Clean Architecture provides a more prescriptive layer breakdown; hexagonal focuses on port/adapter terminology. In practice they complement each other well — use Clean Architecture's layer model with hexagonal architecture's port definitions.

---

## Project Structure Template

```
src/
├── entities/
│   ├── __init__.py
│   ├── order.py           # Order, OrderItem, OrderStatus
│   └── customer.py        # Customer entity
├── use_cases/
│   ├── __init__.py
│   ├── place_order.py     # PlaceOrderUseCase
│   ├── cancel_order.py    # CancelOrderUseCase
│   └── list_orders.py     # ListOrdersUseCase
├── interface_adapters/
│   ├── __init__.py
│   ├── port/
│   │   ├── order_gateway.py       # OrderGatewayProtocol (inner-layer port)
│   │   └── notification_service.py # NotificationServiceProtocol
│   ├── order_controller.py        # HTTP → Use Case conversion
│   └── order_gateway_sql.py       # SQL implementation of OrderGatewayProtocol
├── frameworks/
│   ├── __init__.py
│   ├── rest_app.py                # Flask/FastAPI application setup
│   └── db_setup.py               # Database connection initialization
└── composition_root.py             # Wires all concrete implementations together
```

---

## Testing Strategy

### Unit Tests for Use Cases (Fast — No DB, No Network)

```python
"""tests/unit/test_place_order_use_case.py"""

from unittest.mock import MagicMock

import pytest

from src.entities.order import Order, OrderItem
from src.interface_adapters.port.order_gateway import OrderGatewayProtocol
from src.use_cases.place_order import PlaceOrderUseCase


class TestPlaceOrderUseCase:
    """Tests for PlaceOrderUseCase — mocks all outer-layer dependencies."""

    @pytest.fixture
    def mock_gateway(self) -> MagicMock:
        gateway = MagicMock(spec=OrderGatewayProtocol)
        # Return a saved order that mirrors the input
        gateway.save.side_effect = lambda order: order  # passthrough for test simplicity
        return gateway

    @pytest.fixture
    def use_case(self, mock_gateway: MagicMock) -> PlaceOrderUseCase:
        return PlaceOrderUseCase(mock_gateway)

    def test_place_order_returns_result(self, use_case: PlaceOrderUseCase) -> None:
        items = [
            {"product_id": "PROD-1", "quantity": 2, "unit_price": 25.0},
            {"product_id": "PROD-2", "quantity": 1, "unit_price": 40.0},
        ]
        result = use_case.execute(customer_id="CUST-001", items=items)

        assert result["total"] == 90.0
        assert result["status"] == "pending"
        assert len(result["items"]) == 2
        use_case._gateway.save.assert_called_once()

    def test_place_order_empty_items_raises(self, use_case: PlaceOrderUseCase) -> None:
        with pytest.raises(ValueError, match="at least one item"):
            use_case.execute(customer_id="CUST-001", items=[])
```

### Integration Tests for Gateways (Slow — Requires DB Setup)

```python
"""tests/integration/test_order_gateway_sql.py"""

import sqlite3
import tempfile
from pathlib import Path

import pytest

from src.entities.order import Order, OrderItem, OrderStatus
from src.interface_adapters.order_gateway_sql import SqlOrderGateway


@pytest.fixture
def db_path(tmp_path: Path) -> str:
    return str(tmp_path / "test.db")


@pytest.fixture
def gateway(db_path: str) -> SqlOrderGateway:
    return SqlOrderGateway(db_path)


def test_save_and_find(gateway: SqlOrderGateway, db_path: str) -> None:
    order = Order(
        order_id="ORD-001",
        customer_id="CUST-001",
        items=[OrderItem(product_id="PROD-1", quantity=1, unit_price=29.99)],
    )

    saved = gateway.save(order)
    found = gateway.find_by_id("ORD-001")

    assert found is not None
    assert found.order_id == "ORD-001"
    assert found.status == OrderStatus.PENDING
    assert found.total == 29.99
```

---

## Output Template

When designing or reviewing a system using Clean Architecture:

1. **Layer Assignment** — List each class/file and which layer it belongs to (Entities, Use Cases, Interface Adapters, Frameworks)
2. **Dependency Audit** — Document all import relationships between layers with a simple arrow diagram
3. **Port Identification** — For each outer-to-inner crossing, state the port interface and its concrete implementation
4. **Test Plan** — Specify which use cases are unit-tested (fast) vs which gateways need integration tests (slow)
5. **Violation Report** — If any dependency rule is violated, show the exact import statement and how to fix it

---

## Related Skills

| Skill | Purpose |
|---|---|
| `hexagonal-architecture` | Alternative naming/convention for similar goals; complement when choosing architecture style |
| `ports-patterns` | Deep dive on Python Port interface definitions (Protocol vs ABC) used in Clean Architecture boundaries |
| `dependency-inversion-principle` | DIP is the underlying principle that enables Clean Architecture's inward dependency rule |
| `domain-driven-design` | DDD provides domain modeling techniques that feed into Clean Architecture's Entity and Use Case layers |
| `architectural-review` | Audit an existing codebase for Clean Architecture compliance after implementation |

---

## Live References

- [Clean Architecture: A Craftsman's Guide to Software Structure](https://www.amazon.com/Clean-Architecture-Craftsmans-Software-Structure/dp/0134494164) — Robert C. Martin (Uncle Bob), 2017
- [Dependency Rule Explanation (blog.cleancoder.com)](http://blog.cleancoder.com/robert-c-martin/2021/05/the-dependency-rule.html) — Uncle Bob's canonical explanation of the inward-only dependency rule
- [Clean Architecture vs Hexagonal Architecture Comparison](https://dev.to/michi/clean-architecture-vs-hexagonal-architecture-4g96) — Practical comparison for practitioners
- [Python Protocol Type Hinting (PEP 544)](https://peps.python.org/pep-0544/) — Language feature used to define Clean Architecture ports in Python
- [Dependency Injection in Python](https://realpython.com/python-dependency-injection-libraries/) — Practical DI approaches for wiring Clean Architecture layers
