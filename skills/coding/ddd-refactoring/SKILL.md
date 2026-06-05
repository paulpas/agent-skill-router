---




name: ddd-refactoring
description: Refactors monolithic codebases toward DDD — extracts bounded contexts,
  splits god objects into aggregates, replaces primitive obsession with value objects,
  and creates anticorruption layers.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: ddd refactoring, extract bounded context, split aggregate, god object
    refactor, primitive obsession, anticorruption layer, how do i move to ddd, legacy
    code to ddd
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
  related-skills: domain-driven-design, ddd-context-mapping, ddd-tactical-patterns




---




# DDD Refactoring Patterns

Refactors existing non-DDD codebases toward proper Domain-Driven Design by extracting bounded contexts from monoliths, splitting god objects into focused aggregates, introducing value objects to replace primitive obsession, and creating anticorruption layers around legacy integrations. Provides step-by-step migration patterns for controller/service layers into domain models with working before/after code examples.

## TL;DR Checklist

- [ ] Identify bounded context boundaries by analyzing existing module responsibilities, not class names
- [ ] Extract one bounded context at a time — do not refactor everything simultaneously
- [ ] Split god objects by grouping methods that operate on the same data into separate aggregates
- [ ] Replace string/integer type parameters with typed value objects (Email, Money, OrderId)
- [ ] Create an Anticorruption Layer for every external or legacy system dependency
- [ ] Write domain tests for extracted aggregates before refactoring the next context

---

## When to Use

- A monolithic application with a single database schema and one large service layer that handles multiple business domains (orders, payments, inventory, customers)
- Legacy code where entities are "god objects" with 50+ methods handling unrelated responsibilities
- Primitive obsession throughout the domain: `order.customer_email`, `order.shipping_address`, `order.total_amount` as raw strings and floats instead of typed value objects
- Integrating with legacy systems whose models conflict with your domain terminology (e.g., legacy "cust_id" vs. domain "CustomerId")
- A codebase that works but is hard to extend because changing one feature requires touching dozens of unrelated modules

---

## When NOT to Use

- Greenfield projects with no existing code — start with DDD patterns from the beginning, there is nothing to refactor toward
- Applications where the team does not understand the domain well enough to identify bounded context boundaries — learn the domain first through event storming or domain expert interviews
- Small applications (< 20k LOC) where the complexity does not justify the refactoring overhead
- When a rewrite is more appropriate than incremental refactoring — if the codebase is fundamentally broken, consider Strangler Fig pattern for gradual replacement instead

---

## Core Workflow

1. **Map Existing Responsibilities to Potential Bounded Contexts** — Inventory all service classes, controller endpoints, and database tables. Group them by business domain responsibility: order management, payment processing, customer data, inventory tracking. Draw a rough context map showing which domains depend on which. **Checkpoint:** Each group must have its own set of nouns and verbs that form a coherent subdomain. If one group contains "order" and "inventory," ask whether these belong in separate contexts with different meanings for "available quantity."

2. **Extract the Smallest Viable Bounded Context** — Choose the context with the clearest boundaries and fewest dependencies on other parts of the system. Typically this is a supporting subdomain like notifications, reporting, or a feature with well-defined inputs and outputs. Create the new context directory structure with domain models, repositories interfaces, and application services. **Checkpoint:** The extracted context must compile and pass all existing tests independently — if it cannot, the boundary is too wide and needs to be narrowed.

3. **Migrate Data Access Behind Repository Interfaces** — For each entity being moved into the new bounded context, define a repository interface in the domain layer (e.g., `OrderRepository` with `save`, `find_by_id`, `find_by_customer`). Implement these repositories in the infrastructure layer using the existing database code. Keep the old data access code running in parallel until all callers are migrated. **Checkpoint:** After migration, every caller of the new repository uses only the interface — no direct imports of database models or SQL queries from the domain layer.

4. **Split God Objects into Focused Aggregates** — For each large class that grew to handle multiple responsibilities (e.g., an `OrderManager` with 80 methods), identify groups of methods that operate on the same data and form cohesive business concepts. Extract each group into a separate aggregate root. The original god object should be removed or reduced to a thin facade during this process. **Checkpoint:** After splitting, no aggregate has more than 5-10 public methods — if it does, consider whether those methods belong together or represent additional aggregates.

5. **Replace Primitive Obsession with Value Objects** — Scan the domain model for string and integer fields that carry domain meaning (email addresses, order IDs, monetary amounts, phone numbers). Replace each with a typed value object class that encodes validation rules and provides meaningful operations. Update all callers to construct these value objects explicitly at their boundaries. **Checkpoint:** After replacement, no raw strings or integers appear in aggregate constructors or domain method signatures — only value objects and entities.

6. **Create Anticorruption Layers for Legacy Dependencies** — For every external system, legacy API, or third-party library that the new domain depends on, create a translation layer. This layer converts between the foreign model (with its confusing field names, inconsistent types, and quirky business rules) and your clean domain model. The domain layer never imports anything from the legacy system directly. **Checkpoint:** Run an import analysis on all domain files — if any domain file imports from a legacy module, database adapter, or third-party SDK, move that dependency into the ACL implementation layer.

7. **Write Domain Tests for Each Extracted Aggregate** — Before starting work on the next bounded context, write comprehensive tests for the extracted aggregates: invariant tests for value objects, whole-unit mutation tests for aggregates, and event publishing tests. This confirms the refactoring preserved all business logic correctly. **Checkpoint:** All domain tests must pass before proceeding to the next context extraction — failing tests indicate a broken boundary or lost business rule.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Extracting a Bounded Context from a Monolith

When an application handles orders, payments, and inventory in one massive `ServiceLayer` class, you need to extract each concern into its own bounded context. The key is to create new context directories with clean separation while keeping the old code working during migration.

```python
# ── BEFORE: God service handling multiple domains ───────────────────────

class OrderService:
    """Monolithic service that handles orders, payments, and inventory — a clear bounded context violation."""

    def __init__(self, db_session, email_service, payment_gateway, inventory_client):
        self.db = db_session
        self.email = email_service
        self.payments = payment_gateway
        self.inventory = inventory_client

    def create_order(self, customer_id, items, shipping_address):
        # Order logic mixed with inventory checks and payment processing
        order = Order(
            customer_id=customer_id,
            items=items,  # list of dicts: [{"product_id": "P1", "qty": 2, "price": 29.99}]
            shipping_address=shipping_address,
            total=sum(i["qty"] * i["price"] for i in items),  # raw float calculation
        )
        self.db.add(order)

        # Inventory check mixed into order creation
        for item in items:
            available = self.inventory.check_stock(item["product_id"], item["qty"])
            if not available:
                raise RuntimeError(f"Insufficient stock for {item['product_id']}")

        # Payment processing mixed into order creation
        payment_result = self.payments.charge(customer_id, order.total)
        if not payment_result.success:
            self.db.rollback()
            raise RuntimeError(f"Payment failed: {payment_result.message}")

        # Email notification mixed in too
        self.email.send("order_confirmation", customer_id, {"order_id": order.id})
        self.db.commit()
        return order

    def cancel_order(self, order_id, reason):
        """Another responsibility — order cancellation. Totally separate from create but in the same class."""
        order = self.db.query(Order).get(order_id)
        if order.status == "shipped":
            raise RuntimeError("Cannot cancel shipped orders")
        order.status = "cancelled"

        # Refund payment
        self.payments.refund(order.payment_id)

        # Restore inventory
        for item in order.items:
            self.inventory.restore(item["product_id"], item["qty"])

        self.email.send("order_cancelled", order.customer_id, {"order_id": order_id})
        self.db.commit()

    def process_shipment(self, order_id, tracking_number):
        """Third responsibility — shipping. Still in the same class."""
        order = self.db.query(Order).get(order_id)
        if order.status != "confirmed":
            raise RuntimeError("Only confirmed orders can be shipped")
        order.status = "shipped"
        order.tracking_number = tracking_number
        self.email.send("order_shipped", order.customer_id, {
            "order_id": order_id, "tracking": tracking_number
        })
        self.db.commit()

    # ... 30+ more methods handling related-but-different responsibilities


# ── AFTER: Cleanly separated bounded contexts ───────────────────────────

# ── Context: OrderContext (domain models) ──────────────────────────────

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum, auto
from uuid import UUID, uuid4


class OrderStatus(Enum):
    DRAFT = auto()
    CONFIRMED = auto()
    SHIPPED = auto()
    CANCELLED = auto()


@dataclass(frozen=True, slots=True)
class Money:
    """Value object replacing raw float — encodes currency and prevents accidental mixing."""
    amount: float
    currency: str = "USD"

    def __post_init__(self) -> None:
        if self.amount < 0:
            raise ValueError("Money cannot be negative")

    def add(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            raise ValueError(f"Currency mismatch: {self.currency} vs {other.currency}")
        return Money(round(self.amount + other.amount, 2), self.currency)


@dataclass(frozen=True, slots=True)
class OrderItem:
    product_id: str
    quantity: int
    unit_price: Money

    @property
    def line_total(self) -> Money:
        """Returns the total for this line item as a Money value object."""
        return Money(round(self.quantity * self.unit_price.amount, 2), self.unit_price.currency)


@dataclass(frozen=True, slots=True)
class ShippingAddress:
    street: str
    city: str
    state: str
    postal_code: str
    country: str = "US"

    def __post_init__(self) -> None:
        if not self.street or not self.city:
            raise ValueError("Street and city are required")


class OrderAggregateError(Exception):
    """Domain exception for order invariant violations."""


@dataclass
class Order:
    """Aggregate root — replaces the raw Order model with behavioral domain logic.

    Invariants enforced in constructors and methods:
    - Must have at least one item to confirm
    - Total is always calculated from items (no separate total field)
    - Status transitions follow a fixed state machine
    - Cannot modify items after confirmation
    """

    order_id: UUID = field(default_factory=lambda: uuid4())
    customer_id: UUID = field(default_factory=lambda: uuid4())
    _items: list[OrderItem] = field(default_factory=list)
    status: OrderStatus = OrderStatus.DRAFT
    shipping_address: ShippingAddress | None = None
    tracking_number: str | None = None
    _domain_events: list[object] = field(default_factory=list, repr=False)

    @property
    def items(self) -> tuple[OrderItem, ...]:
        return tuple(self._items)

    @property
    def total(self) -> Money:
        """Total is computed from items — never stored separately."""
        if not self._items:
            return Money(0.0)
        first_currency = self._items[0].unit_price.currency
        total_amount = sum(item.line_total.amount for item in self._items)
        return Money(round(total_amount, 2), first_currency)

    def add_item(self, product_id: str, quantity: int, unit_price: Money) -> None:
        """Add item only in DRAFT status."""
        if self.status != OrderStatus.DRAFT:
            raise OrderAggregateError(
                f"Cannot add items to order in {self.status.name} state"
            )
        self._items.append(OrderItem(product_id, quantity, unit_price))

    def set_shipping_address(self, address: ShippingAddress) -> None:
        if self.status != OrderStatus.DRAFT:
            raise OrderAggregateError("Cannot change shipping on non-draft order")
        self.shipping_address = address

    def confirm(self) -> None:
        """Transition to confirmed. Requires items and shipping address."""
        if self.status != OrderStatus.DRAFT:
            raise OrderAggregateError(f"Cannot confirm order in {self.status.name}")
        if not self._items:
            raise OrderAggregateError("Order must have at least one item")
        if self.shipping_address is None:
            raise OrderAggregateError("Order requires a shipping address")
        previous_status = self.status
        self.status = OrderStatus.CONFIRMED

    def ship(self, tracking_number: str) -> None:
        """Transition to shipped. Only confirmed orders can be shipped."""
        if self.status != OrderStatus.CONFIRMED:
            raise OrderAggregateError(f"Cannot ship order in {self.status.name}")
        if not tracking_number:
            raise ValueError("Tracking number required for shipment")
        self.status = OrderStatus.SHIPPED
        self.tracking_number = tracking_number

    def cancel(self) -> None:
        """Cancel the order. Cannot cancel shipped or already-cancelled orders."""
        if self.status == OrderStatus.CANCELLED:
            raise OrderAggregateError("Order is already cancelled")
        if self.status == OrderStatus.SHIPPED:
            raise OrderAggregateError("Cannot cancel shipped orders — initiate return instead")
        previous_status = self.status
        self.status = OrderStatus.CANCELLED

    @property
    def domain_events(self) -> list[object]:
        """Expose recorded events for the application service to process."""
        return list(self._domain_events)


# ── Context: OrderContext (repository interface in domain layer) ───────

from abc import ABC, abstractmethod


class OrderRepository(ABC):
    """Domain-layer interface — no database knowledge. Implemented in infrastructure layer."""

    @abstractmethod
    def save(self, order: Order) -> None: ...

    @abstractmethod
    def find_by_id(self, order_id: UUID) -> Order | None: ...

    @abstractmethod
    def find_by_customer(self, customer_id: UUID) -> list[Order]: ...


# ── Context: OrderApplicationService (orchestrates the bounded context) ─

class OrderPlacingService:
    """Application service for the Order bounded context.

    This is NOT a god object — it only handles order creation flow.
    Payment, shipping, and cancellation have their own application services.
    """

    def __init__(
        self,
        order_repo: OrderRepository,
        payment_service: "PaymentService",
        notification_service: "NotificationService",
    ) -> None:
        self._order_repo = order_repo
        self._payment = payment_service
        self._notification = notification_service

    def place_order(
        self,
        customer_id: UUID,
        items: list[dict],  # External API shape — converted inside the service
        shipping_address: dict,
    ) -> Order:
        """Convert external input into domain objects, then apply domain behavior."""
        # Convert primitive dicts to value objects at the boundary
        money_items = []
        for item in items:
            price = Money(item["price"], item.get("currency", "USD"))
            money_items.append((item["product_id"], item["quantity"], price))

        address = ShippingAddress(
            street=shipping_address["street"],
            city=shipping_address["city"],
            state=shipping_address["state"],
            postal_code=shipping_address["postal_code"],
            country=shipping_address.get("country", "US"),
        )

        # Create aggregate and apply domain behavior
        order = Order(customer_id=customer_id, shipping_address=address)
        for product_id, quantity, unit_price in money_items:
            order.add_item(product_id, quantity, unit_price)

        # Confirm the order (enforces all invariants)
        order.confirm()

        # Persist first — then handle external concerns
        self._order_repo.save(order)

        # External concerns are handled separately, not mixed into domain logic
        self._payment.process_payment(customer_id, order.total)
        self._notification.send_order_confirmation(customer_id, order.order_id)

        return order


# ── Context: ShipmentService (separate application service) ────────────

class ShipmentService:
    """Application service for shipping — completely separate from order creation."""

    def __init__(self, order_repo: OrderRepository, tracking_service: object) -> None:
        self._order_repo = order_repo
        self._tracking = tracking_service

    def ship_order(self, order_id: UUID, tracking_number: str) -> None:
        order = self._order_repo.find_by_id(order_id)
        if order is None:
            raise ValueError(f"Order {order_id} not found")

        # Domain behavior
        order.ship(tracking_number)

        # Persistence
        self._order_repo.save(order)

        # External concern (separate from domain logic)
        self._tracking.register_shipment(order_id, tracking_number)
```

**Key refactoring steps applied:**
1. Split the monolithic `OrderService` into three focused application services (`OrderPlacingService`, `ShipmentService`, and a separate cancellation service not shown)
2. Replaced raw floats with `Money` value objects throughout
3. Replaced dict-based items with typed `OrderItem` value objects
4. Extracted domain aggregate `Order` from the data model — it now has behavioral methods (`confirm`, `ship`, `cancel`) that enforce invariants
5. Created a repository interface in the domain layer, separating domain logic from persistence
6. Moved external concerns (payment, notification) out of domain logic into application service orchestration

---

### Pattern 2: Splitting God Objects into Aggregates

When you find a class with 50+ methods handling different responsibilities, extract focused aggregates by grouping methods that operate on the same data and represent cohesive business concepts. Use this concrete before/after example.

```python
# ── BEFORE: God object with 6 unrelated responsibilities ────────────────

class ProductService:
    """God object — handles product catalog, pricing, inventory, reviews,
    search, and supplier management all in one class."""

    def __init__(self, db_session):
        self.db = db_session

    # ── Responsibility 1: Catalog management ────────────────────────────
    def create_product(self, name, description, category, base_price):
        product = Product(name=name, description=description,
                         category=category, price=base_price)
        self.db.add(product)
        self.db.commit()
        return product

    def update_product(self, product_id, **kwargs):
        product = self.db.query(Product).get(product_id)
        for key, value in kwargs.items():
            setattr(product, key, value)
        self.db.commit()

    # ── Responsibility 2: Pricing rules ─────────────────────────────────
    def apply_discount(self, product_id, discount_pct):
        product = self.db.query(Product).get(product_id)
        if discount_pct < 0 or discount_pct > 100:
            raise ValueError("Discount must be between 0 and 100")
        product.price = product.price * (1 - discount_pct / 100)
        self.db.commit()

    def get_promotional_price(self, product_id):
        """Complex pricing logic mixed into product management."""
        product = self.db.query(Product).get(product_id)
        if product.category == "electronics":
            return product.price * 0.9
        elif product.category == "clothing":
            return product.price * 0.85
        return product.price

    # ── Responsibility 3: Inventory management ──────────────────────────
    def add_stock(self, product_id, quantity, warehouse_id):
        product = self.db.query(Product).get(product_id)
        product.stock += quantity
        self.db.commit()

    def check_availability(self, product_id):
        return self.db.query(Product).get(product_id).stock > 0

    def reserve_stock(self, product_id, quantity):
        """This method is called during order placement — a clear cross-context operation."""
        product = self.db.query(Product).get(product_id)
        if product.stock < quantity:
            raise RuntimeError(f"Only {product.stock} units available")
        product.stock -= quantity
        self.db.commit()

    # ── Responsibility 4: Product reviews ───────────────────────────────
    def add_review(self, product_id, rating, comment, reviewer_name):
        review = Review(product_id=product_id, rating=rating,
                        comment=comment, reviewer_name=reviewer_name)
        self.db.add(review)
        self.db.commit()

    def get_average_rating(self, product_id):
        reviews = self.db.query(Review).filter_by(product_id=product_id).all()
        if not reviews:
            return 0.0
        return sum(r.rating for r in reviews) / len(reviews)

    # ── Responsibility 5: Search ────────────────────────────────────────
    def search_products(self, query, category=None):
        results = self.db.query(Product).filter(
            Product.name.ilike(f"%{query}%")
        )
        if category:
            results = results.filter(Product.category == category)
        return results.all()

    # ── Responsibility 6: Supplier management ───────────────────────────
    def assign_supplier(self, product_id, supplier_id, unit_cost):
        product = self.db.query(Product).get(product_id)
        product.supplier_id = supplier_id
        product.cost_price = unit_cost
        self.db.commit()

    def get_supplier_costs(self, supplier_id):
        return self.db.query(Product).filter_by(supplier_id=supplier_id).all()


# ── AFTER: Split into focused aggregates ────────────────────────────────

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from decimal import Decimal


# ── Aggregate 1: Product (catalog + pricing) ───────────────────────────

@dataclass(frozen=True, slots=True)
class Money:
    amount: Decimal
    currency: str = "USD"

    def apply_discount(self, percentage: Decimal) -> "Money":
        if not (Decimal("0") <= percentage <= Decimal("100")):
            raise ValueError("Discount must be between 0 and 100 percent")
        return Money(round(self.amount * (1 - percentage / Decimal("100")), 2), self.currency)

    def __gt__(self, other: "Money") -> bool:
        if self.currency != other.currency:
            raise ValueError("Currency mismatch for comparison")
        return self.amount > other.amount


class ProductAggregateError(Exception): ...


@dataclass
class Product:
    """Focused aggregate for product catalog and pricing.

    Removed inventory, reviews, search, and supplier logic — each is a separate concern.
    """
    product_id: str
    name: str
    description: str
    category: str
    base_price: Money
    cost_price: Money | None = None  # Optional — not all products have cost tracking

    def apply_promotional_discount(self, discount_pct: Decimal) -> Money:
        """Apply a promotional discount and return the new price.

        Different categories get different discounts — this is pricing logic,
        not inventory or review logic.
        """
        if self.category == "electronics":
            percentage = Decimal("10")
        elif self.category == "clothing":
            percentage = Decimal("15")
        else:
            percentage = discount_pct

        return self.base_price.apply_discount(percentage)


# ── Aggregate 2: Inventory (stock management) ───────────────────────────

class StockReservationError(Exception): ...


@dataclass
class Inventory:
    """Inventory aggregate — handles stock levels, availability checks, and reservations.

    Completely separate from product catalog. Does not know about pricing or reviews.
    """
    inventory_id: str
    product_id: str
    warehouse_id: str
    quantity_on_hand: int

    def add_stock(self, quantity: int) -> None:
        if quantity <= 0:
            raise ValueError("Quantity must be positive")
        self.quantity_on_hand += quantity

    def check_availability(self, requested_quantity: int) -> bool:
        return self.quantity_on_hand >= requested_quantity

    def reserve_stock(self, quantity: int) -> None:
        """Reserve stock for an order. Raises if insufficient."""
        if not self.check_availability(quantity):
            raise StockReservationError(
                f"Cannot reserve {quantity} units — only {self.quantity_on_hand} available"
            )
        self.quantity_on_hand -= quantity


# ── Aggregate 3: ProductReview (reviews and ratings) ───────────────────

class InvalidRatingError(Exception): ...


@dataclass(frozen=True, slots=True)
class Review:
    review_id: str
    product_id: str
    rating: int
    comment: str
    reviewer_name: str

    def __post_init__(self) -> None:
        if not (1 <= self.rating <= 5):
            raise InvalidRatingError(f"Rating must be between 1 and 5, got {self.rating}")


class ProductReviewAggregate:
    """Aggregate for managing product reviews and computing average ratings."""

    def __init__(self) -> None:
        self._reviews: list[Review] = []

    def add_review(self, review_id: str, product_id: str, rating: int,
                   comment: str, reviewer_name: str) -> Review:
        review = Review(review_id, product_id, rating, comment, reviewer_name)
        self._reviews.append(review)
        return review

    def average_rating(self) -> float:
        if not self._reviews:
            return 0.0
        return sum(r.rating for r in self._reviews) / len(self._reviews)

    def count(self) -> int:
        return len(self._reviews)


# ── Repository interfaces (domain layer) ───────────────────────────────

class ProductRepository(ABC):
    @abstractmethod
    def save(self, product: Product) -> None: ...
    @abstractmethod
    def find_by_id(self, product_id: str) -> Product | None: ...


class InventoryRepository(ABC):
    @abstractmethod
    def find_by_product(self, product_id: str) -> Inventory | None: ...
    @abstractmethod
    def save(self, inventory: Inventory) -> None: ...


class ReviewRepository(ABC):
    @abstractmethod
    def add(self, review: Review) -> None: ...
    @abstractmethod
    def by_product(self, product_id: str) -> ProductReviewAggregate: ...
```

**Key principles for splitting god objects:**
- Group methods by the data they operate on — methods that read/write the same fields belong together
- Each extracted aggregate should have a single responsibility describable in one sentence
- After extraction, the original class should either be deleted or reduced to a thin facade that delegates to the new aggregates
- Repository interfaces define the boundary between domain logic and persistence for each aggregate

---

### Pattern 3: Value Object Refactoring — Replacing Primitive Obsession

Primitive obsession occurs when string, integer, or float fields carry domain meaning but are not protected by type safety. This pattern shows how to introduce value objects progressively without breaking existing callers.

```python
# ── BEFORE: Primitive obsession throughout the domain ───────────────────

from dataclasses import dataclass


@dataclass
class Customer:
    """Customer entity with primitive fields — no validation, no type safety."""
    customer_id: str          # Is this a UUID? An email? A name? Ambiguous.
    email: str               # Any string is accepted — no format validation
    phone: str = ""          # "555-1234", "+1 555 123 4567", "abc" — all valid
    address_line1: str
    address_line2: str = ""
    city: str
    state: str
    zip_code: str            # "12345", "12345-6789", "ABCDE" — all accepted
    total_spent: float       # Raw float — no currency, can be negative accidentally


@dataclass
class Order:
    """Order with primitive fields and weakly-typed relationships."""
    order_id: str
    customer_id: str         # Just a string — no guarantee it's a valid customer ID
    items: list[dict]        # Dict instead of typed objects
    total_amount: float      # Raw float, no currency context
    shipping_address: dict   # Dict of strings — no validation
    status: str = "draft"    # Any string accepted — "pending", "DRAFT", "Draft"?


# ── Step 1: Introduce value objects one at a time ───────────────────────

from dataclasses import dataclass, field
from decimal import Decimal
import re
from uuid import UUID


@dataclass(frozen=True, slots=True)
class Email:
    """Value object for email addresses — validates format at construction."""

    value: str

    def __post_init__(self) -> None:
        pattern = r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$"
        if not re.match(pattern, self.value):
            raise ValueError(f"Invalid email address: {self.value!r}")

    def __str__(self) -> str:
        return self.value


@dataclass(frozen=True, slots=True)
class Money:
    """Value object for monetary amounts — prevents accidental mixing of currencies."""
    amount: Decimal
    currency: str = "USD"

    def __post_init__(self) -> None:
        if self.amount < 0:
            raise ValueError("Money cannot be negative")

    def add(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            raise ValueError(f"Cannot add {other.currency} to {self.currency}")
        return Money(round(self.amount + other.amount, 2), self.currency)


@dataclass(frozen=True, slots=True)
class ZipCode:
    """Value object for US zip codes — validates format."""
    value: str

    def __post_init__(self) -> None:
        if not re.match(r"^\d{5}(-\d{4})?$", self.value):
            raise ValueError(f"Invalid US zip code: {self.value!r}")


@dataclass(frozen=True, slots=True)
class ShippingAddress:
    """Value object for shipping addresses — validates required fields."""
    street: str
    city: str
    state: str
    zip_code: ZipCode
    country: str = "US"

    def __post_init__(self) -> None:
        if not self.street or not self.city or not self.state:
            raise ValueError("Street, city, and state are required")


@dataclass(frozen=True, slots=True)
class CustomerId:
    """Value object for customer identity — enforces UUID format."""

    value: UUID

    def __str__(self) -> str:
        return str(self.value)


# ── Step 2: Refactored entities using value objects ─────────────────────

@dataclass
class CustomerNew:
    """Refactored customer — uses value objects for typed, validated fields."""
    customer_id: CustomerId
    email: Email
    phone: str = ""
    address_line1: str = ""
    address_line2: str = ""
    city: str = ""
    state: str = ""
    zip_code: str = ""  # In production, this would be ZipCode; kept as str for migration step
    total_spent: Decimal = Decimal("0")  # Decimal instead of float

    @classmethod
    def from_primitives(
        cls,
        customer_id: str,
        email: str,
        phone: str = "",
        address_line1: str = "",
        city: str = "",
        state: str = "",
        zip_code: str = "",
        total_spent: float = 0.0,
    ) -> "CustomerNew":
        """Factory method at the boundary — converts primitives to value objects."""
        try:
            id_uuid = UUID(customer_id)
        except ValueError:
            raise ValueError(f"Invalid customer ID format: {customer_id!r}")

        return cls(
            customer_id=CustomerId(id_uuid),
            email=Email(email),
            phone=phone,
            address_line1=address_line1,
            city=city,
            state=state,
            zip_code=zip_code,
            total_spent=Decimal(str(total_spent)),
        )


# ── Step 3: Refactored order using value objects ────────────────────────

@dataclass(frozen=True, slots=True)
class OrderItemNew:
    product_id: str
    quantity: int
    unit_price: Money

    @property
    def line_total(self) -> Money:
        return Money(
            round(self.quantity * self.unit_price.amount, 2),
            self.unit_price.currency,
        )


class OrderStatus:
    """Enum replaces raw string status field."""
    DRAFT = "draft"
    CONFIRMED = "confirmed"
    SHIPPED = "shipped"
    CANCELLED = "cancelled"


@dataclass
class OrderNew:
    """Refactored order — uses value objects and enum for typed fields."""
    order_id: str  # UUID in production
    customer_id: CustomerId  # Typed identity instead of raw string
    items: list[OrderItemNew] = field(default_factory=list)
    total_amount: Money = field(default_factory=lambda: Money(Decimal("0")))
    shipping_address: ShippingAddress | None = None
    status: str = OrderStatus.DRAFT

    @property
    def computed_total(self) -> Money:
        """Total is always derived from items — no separate stored value."""
        if not self.items:
            return Money(Decimal("0"))
        first_currency = self.items[0].unit_price.currency
        total_amount = sum(item.line_total.amount for item in self.items)
        return Money(round(total_amount, 2), first_currency)

    @classmethod
    def from_external_data(
        cls,
        order_id: str,
        customer_id: str,
        items: list[dict],
        shipping_address: dict,
    ) -> "OrderNew":
        """Factory at the boundary — converts external dict format to value objects."""
        # Convert customer ID
        try:
            cid = CustomerId(UUID(customer_id))
        except ValueError:
            raise ValueError(f"Invalid customer ID: {customer_id!r}")

        # Convert items
        order_items = []
        for item in items:
            price = Money(Decimal(str(item["price"])), item.get("currency", "USD"))
            order_items.append(OrderItemNew(item["product_id"], item["quantity"], price))

        # Convert shipping address
        address_data = {
            k: v for k, v in shipping_address.items()
            if v is not None and v != ""
        }
        try:
            address = ShippingAddress(
                street=address_data.get("street", ""),
                city=address_data.get("city", ""),
                state=address_data.get("state", ""),
                zip_code=ZipCode(address_data.get("zip_code", "")),
                country=address_data.get("country", "US"),
            )
        except ValueError as e:
            raise ValueError(f"Invalid shipping address: {e}")

        order = cls(
            order_id=order_id,
            customer_id=cid,
            items=order_items,
            shipping_address=address,
        )
        # Recompute total from items (not trusting external data)
        object.__setattr__(order, "total_amount", order.computed_total)
        return order
```

**Key principles for value object refactoring:**
- Introduce value objects one at a time — start with the most impactful primitives (Money, Email) and work through less critical ones
- Create factory methods at the boundary that convert raw inputs to value objects — this localizes the conversion logic
- Use `frozen=True` dataclasses for true immutability — once created, value objects cannot be modified
- Compute derived values from components (e.g., `total_amount` from `items`) rather than storing them separately

---

### Pattern 4: Anticorruption Layer for Legacy System Integration

When integrating with a legacy system that uses confusing field names, inconsistent types, or different business rules, create an ACL that translates between the foreign model and your clean domain model. The domain layer never imports anything from the legacy system.

```python
# ── BEFORE: Direct dependency on legacy system — no translation layer ──

from dataclasses import dataclass


@dataclass
class LegacyCustRecord:
    """Legacy customer record from the old ERP system."""
    cust_id: int         # Confusing naming — "cust" instead of "customer"
    fname: str           # Abbreviated field names throughout
    lname: str
    email_addr: str      # Different naming convention than domain
    phone_num: str
    addr1: str
    city_town: str       # Inconsistent naming — "town" vs "city" in other records
    state_abbr: str      # Only 2-letter codes, no validation
    zip_cd: str
    tier_code: int       # Integer magic numbers for customer tiers — unclear meaning
    active_yn: str       # 'Y' or 'N' instead of boolean


@dataclass
class LegacyOrderRecord:
    """Legacy order from the old system."""
    ord_id: int
    cust_id: int         # References legacy customer, not our CustomerId
    items: list[dict]    # Dict with keys like "prod_cd", "qty_ord", "unit_cost"
    total_amt: float     # No currency field — assumed USD everywhere
    status_cd: int       # 1=draft, 2=confirmed, 3=shipped, 4=cancelled (magic numbers)
    ship_dt: str | None  # Date string in MM/DD/YYYY format
    notes: str | None


# ── Domain models (clean, no legacy contamination) ─────────────────────

@dataclass(frozen=True, slots=True)
class CustomerTier:
    """Domain concept with clear names — replaces integer magic numbers."""
    code: int  # Internal mapping key
    name: str
    discount_pct: float

    @classmethod
    def from_legacy_code(cls, code: int) -> "CustomerTier":
        """Maps legacy tier codes to domain concepts."""
        mapping = {
            1: cls(1, "Standard", 0.0),
            2: cls(2, "Silver", 5.0),
            3: cls(3, "Gold", 10.0),
            4: cls(4, "Platinum", 15.0),
        }
        return mapping[code]


# ── Anticorruption Layer — Translation between legacy and domain models ─

class CustomerTierMapper:
    """Translates legacy tier codes to domain CustomerTier objects."""

    @staticmethod
    def from_legacy(tier_code: int) -> CustomerTier:
        if tier_code not in (1, 2, 3, 4):
            raise ValueError(f"Unknown customer tier code: {tier_code}")
        return CustomerTier.from_legacy_code(tier_code)

    @staticmethod
    def to_legacy(tier: CustomerTier) -> int:
        return tier.code


class LegacyCustomerConverter:
    """Converts between legacy ERP customer records and domain Customer model."""

    TIER_MAPPER = CustomerTierMapper()

    @classmethod
    def to_domain(cls, record: LegacyCustRecord) -> dict:
        """Translate a legacy customer record into domain-compatible data."""
        tier = cls.TIER_MAPPER.from_legacy(record.tier_code)
        return {
            "customer_id": str(record.cust_id),  # Stringify for consistency
            "first_name": record.fname,
            "last_name": record.lname,
            "email": record.email_addr,           # Renamed to domain convention
            "phone": record.phone_num,
            "address_line1": record.addr1,
            "city": record.city_town,             # Normalized to "city"
            "state": record.state_abbr.upper(),   # Ensure uppercase
            "zip_code": record.zip_cd,
            "tier": tier,                         # Domain object, not magic number
            "is_active": record.active_yn == "Y", # Boolean, not 'Y'/'N' string
        }

    @classmethod
    def from_domain(cls, customer_id: int, name: str, email: str) -> LegacyCustRecord:
        """Translate domain data back into legacy format for write operations."""
        return LegacyCustRecord(
            cust_id=customer_id,
            fname=name.split()[0] if name else "",  # Truncate to first word for legacy field
            lname=name.split()[-1] if name else "",
            email_addr=email,
            phone_num="",                           # Not provided in domain model
            addr1="",
            city_town="",
            state_abbr="US",
            zip_cd="",
            tier_code=1,                            # Default to standard tier
            active_yn="Y",
        )


class LegacyOrderConverter:
    """Converts between legacy order records and domain Order model."""

    STATUS_MAP = {
        1: "draft",
        2: "confirmed",
        3: "shipped",
        4: "cancelled",
    }
    REVERSE_STATUS = {v: k for k, v in STATUS_MAP.items()}

    @classmethod
    def to_domain(cls, record: LegacyOrderRecord) -> dict:
        """Translate a legacy order into domain-compatible data."""
        status = cls.STATUS_MAP.get(record.status_cd, "draft")
        items = [
            {
                "product_id": item["prod_cd"],     # Rename to domain convention
                "quantity": item["qty_ord"],        # Rename for clarity
                "price": item["unit_cost"],         # Rename to standard term
            }
            for item in (record.items or [])
        ]
        return {
            "order_id": str(record.ord_id),
            "customer_id": str(record.cust_id),
            "items": items,
            "total_amount": record.total_amt,
            "status": status,                     # String name, not magic number
            "ship_date": cls._parse_legacy_date(record.ship_dt),
        }

    @classmethod
    def to_legacy(cls, order) -> LegacyOrderRecord:
        """Translate a domain order into legacy format for persistence."""
        return LegacyOrderRecord(
            ord_id=int(order.order_id),
            cust_id=int(order.customer_id),
            status_cd=cls.REVERSE_STATUS.get(order.status, 1),
            total_amt=float(order.total_amount) if hasattr(order, "total_amount") else 0.0,
            items=[
                {"prod_cd": item.product_id, "qty_ord": item.quantity,
                 "unit_cost": float(item.unit_price.amount)}
                for item in (order.items or [])
            ],
            ship_dt=cls._format_legacy_date(order.ship_date) if hasattr(order, "ship_date") else None,
            notes="",
        )

    @staticmethod
    def _parse_legacy_date(date_str: str | None) -> str | None:
        """Convert MM/DD/YYYY format to ISO 8601."""
        if not date_str:
            return None
        parts = date_str.split("/")
        if len(parts) == 3:
            month, day, year = parts
            return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
        return date_str

    @staticmethod
    def _format_legacy_date(iso_date: str | None) -> str | None:
        """Convert ISO 8601 to MM/DD/YYYY for legacy system."""
        if not iso_date:
            return None
        # Simplified — in production use datetime module
        parts = iso_date.split("-")
        if len(parts) == 3:
            return f"{parts[1]}/{parts[2]}/{parts[0]}"
        return iso_date


# ── Repository using ACL (domain layer stays clean) ─────────────────────

from abc import ABC, abstractmethod


class CustomerRepository(ABC):
    """Domain-layer interface — no knowledge of legacy system."""
    @abstractmethod
    def find_by_id(self, customer_id: str) -> dict | None: ...
    @abstractmethod
    def save(self, customer_data: dict) -> str: ...


class LegacyCustomerRepository(CustomerRepository):
    """Infrastructure-layer implementation — contains ALL legacy knowledge.

    This is the ACL: it translates between legacy format and domain format.
    The domain layer never imports LegacyCustRecord or knows about 'cust_id'.
    """

    def __init__(self, legacy_db: object) -> None:
        self._legacy_db = legacy_db

    def find_by_id(self, customer_id: str) -> dict | None:
        # Domain asks for customer by string ID
        record = self._legacy_db.fetch_customer(int(customer_id))
        if record is None:
            return None
        # ACL converts legacy format to domain format
        return LegacyCustomerConverter.to_domain(record)

    def save(self, customer_data: dict) -> str:
        # Domain provides data in domain format
        # ACL converts to legacy format for persistence
        legacy_record = LegacyCustomerConverter.from_primitives(
            int(customer_data["customer_id"]),
            customer_data.get("first_name", "") + " " + customer_data.get("last_name", ""),
            customer_data.get("email", ""),
        )
        self._legacy_db.save_customer(legacy_record)
        return str(legacy_record.cust_id)
```

**Key principles for Anticorruption Layers:**
- The domain layer MUST never import from the legacy system — verify with an import analysis
- All translation logic lives in dedicated converter classes (`LegacyCustomerConverter`, `LegacyOrderConverter`)
- Mapper classes convert between incompatible representations (status codes, dates, boolean encodings)
- The repository implementation is the only place where legacy format touches domain format
- Update converters when either the legacy system OR the domain model changes — never both at once

---

## Constraints

### MUST DO
- Extract one bounded context at a time — do not refactor the entire codebase simultaneously; this guarantees you can always roll back to working code
- After each extraction, run all existing tests to verify nothing was broken — failing tests indicate a lost business rule or incorrect boundary
- Create repository interfaces in the domain layer before implementing persistence — this enforces clean separation between domain logic and data access
- Introduce value objects progressively — start with Money and Email (highest impact), then work through less critical primitives
- Name converters and mappers explicitly as "LegacyXConverter" or "AnticorruptionLayer" so future developers can trace translation logic
- Document the mapping between legacy field names and domain terms in each converter class

### MUST NOT DO
- Do not extract multiple bounded contexts simultaneously — overlapping changes will cause merge conflicts and lost business rules
- Do not keep any direct imports from legacy systems in the domain layer — this is the primary mechanism for anticorruption; bypassing it defeats the purpose
- Do not refactor all primitive fields at once — introduce value objects incrementally, testing after each change
- Do not remove the original god object class until all its methods have been migrated to new aggregates — premature deletion breaks callers
- Do not mix application-layer concerns (HTTP handling, database transactions) into domain method implementations during refactoring

---

## Related Skills

| Skill | Purpose |
|---|---|
| `domain-driven-design` | Core DDD patterns — value objects, entities, aggregates, bounded contexts |
| `ddd-context-mapping` | Context mapping patterns — anticorruption layers, shared kernel, published language |
| `ddd-tactical-patterns` | Supporting patterns — specifications, domain services, factories |

---

## Live References

> Authoritative documentation links for DDD refactoring patterns.

- [Martin Fowler: Anticorruption Layer](https://martinfowler.com/bliki/AntiCorruptionLayer.html) — Original description of the ACL pattern
- [Martin Fowler: Refactoring to Subdomains](https://martinfowler.com/articles/201901-refactoring-to-subdomains.html) — Step-by-step domain decomposition
- [Refactoring.Guru: God Object](https://refactoring.guru/smells/god-object) — Identifying and splitting god objects
