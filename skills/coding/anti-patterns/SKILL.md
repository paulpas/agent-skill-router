---
name: anti-patterns
description: Catalogs and detects common software anti-patterns (god object, leaky
  abstraction, feature envy, shotgun surgery, cargo cult) to help developers recognize
  and refactor harmful code practices.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: anti-pattern, god object, leaky abstraction, feature envy, shotgun surgery,
    cargo cult, code smell, refactoring, bad design, harmful patterns
  archetypes:
  - educational
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: medium
    directive_strength: low
    abstraction_level: strategic
  role: review
  scope: review
  output-format: report
  content-types:
  - code
  - guidance
  - do-dont
  - examples
  related-skills: design-patterns-and-principles, refactoring, code-review, modular-design
------
# Anti-Pattern Catalog & Detector

Reviews codebases to identify harmful design anti-patterns, categorizes them by severity, and provides concrete refactoring directions. An anti-pattern is a commonly used solution that produces negative consequences — it works but degrades maintainability, testability, or performance over time.

## TL;DR Checklist

- [ ] Identify the anti-pattern type and its specific manifestation in the code
- [ ] Assess severity: blocking (blocks new development), nagging (slows work), or cosmetic (annoying but functional)
- [ ] Provide concrete BEFORE/AFTER code comparison showing the fix
- [ ] Recommend the specific pattern or technique that addresses the root cause
- [ ] Note any cascading anti-patterns created by the first one

---

## When to Use

Use this skill when:

- Reviewing a PR where you suspect architectural debt but can't pinpoint the exact problem
- Refactoring a legacy module that feels "hard to work with" and need help diagnosing why
- Mentoring junior developers who are introducing harmful patterns without recognizing them
- Auditing a codebase for systemic issues before starting a major feature or rewrite
- A team is stuck in "spiral of change" where every fix creates two new problems

---

## When NOT to Use

Avoid this skill for:

- One-off scripts, prototypes, or throwaway code — anti-patterns only matter when code lives and evolves
- Enforcing a single preferred style — an anti-pattern has measurable negative consequences, not personal preference
- Critiquing code that already works perfectly and has no extension needs — don't fix what isn't broken (YAGNI)
- Replacing actual design discussions with pattern-name dropping — describe the concrete problem, then name the pattern

---

## Core Workflow

1. **Scan for Symptoms** — Look for indicators: large files/functions, tight coupling, duplicated logic, confusing abstractions, magic numbers scattered everywhere, functions that grow indefinitely.
   **Checkpoint:** Document the specific code locations with symptoms observed before naming any anti-pattern.

2. **Identify the Anti-Pattern** — Match symptoms to known anti-pattern categories below. Be precise: "god object" is not the same as "feature envy," even though they often coexist.
   **Checkpoint:** Can you name the exact class, function, or module where this anti-pattern lives? Vague diagnoses produce vague fixes.

3. **Assess Severity** — Classify as blocking (prevents new features), nagging (slows every change), or cosmetic (annoying but not harmful yet).
   **Checkpoint:** Would removing this anti-pattern meaningfully improve developer velocity or system reliability? If no, deprioritize it.

4. **Recommend Refactoring** — Provide the concrete BEFORE/AFTER code comparison and name the positive pattern or technique that resolves it.
   **Checkpoint:** Can the suggested refactoring be done in a single focused PR without breaking existing tests?

---

## Anti-Pattern Reference Guide

### Category 1: Structural Anti-Patterns

#### God Object (God Class)

A class that knows too much or does too much. It grows organically over time until it becomes the central hub of the entire system, violating Single Responsibility Principle. Symptoms include: methods with names like `process`, `handle`, `doEverything`; a single file exceeding 500-1000 lines; new features added by appending more methods to this class.

```python
# ❌ BAD — God Object: DatabaseManager handles connections, queries, auth, logging, migrations
class DatabaseManager:
    def __init__(self, config):
        self.config = config
        self.pool = create_pool(config)
        self.logger = get_logger("db")
        self.auth_cache = {}
        self.migration_registry = {}

    def connect(self): ...
    def disconnect(self): ...
    def execute_query(self, sql, params): ...
    def authenticate_user(self, username, password): ...
    def log_operation(self, operation, details): ...
    def run_migration(self, migration_name): ...
    def optimize_tables(self): ...
    def backup_database(self, path): ...
    def restore_database(self, path): ...
    def validate_schema(self): ...

# ✅ GOOD — Split into focused modules using SRP and DIP
# db/connection_pool.py
class ConnectionPool:
    """Manages database connection pooling."""
    def __init__(self, config: DatabaseConfig): ...
    def acquire(self) -> Connection: ...
    def release(self, conn: Connection) -> None: ...

# db/query_executor.py  
class QueryExecutor:
    """Executes SQL queries with parameterization and result mapping."""
    def __init__(self, pool: ConnectionPool, mapper: ResultSetMapper): ...
    def execute(self, sql: str, params: Sequence[Any]) -> list[dict]: ...

# db/migration_runner.py
class MigrationRunner:
    """Manages schema migrations with rollback support."""
    def __init__(self, executor: QueryExecutor, migration_dir: Path): ...
    def run(self, target_revision: str | None = None) -> MigrationResult: ...
```

**Root Cause:** Adding features to a single class is the path of least resistance. The team avoids creating new modules because it feels like "more files."

**Fix:** Apply Single Responsibility Principle + Extract Class refactoring. Each module gets one reason to change.

---

#### Feature Envy

A method that accesses more data or methods from another class than from its own. The method's logic belongs in the other class, but was placed here due to convenience or organizational habits. Symptoms include: methods that call `other_obj.field1`, `other_obj.field2`, `other_obj.compute()`, `other_obj.validate()` extensively while barely using `self`.

```python
# ❌ BAD — Feature Envy: ShippingCalculator knows too much about Order internals
class ShippingCalculator:
    def calculate_shipping(self, order: Order) -> Decimal:
        # Accessing deeply nested fields of another object
        total_weight = 0
        for item in order.items:
            total_weight += item.product.weight * item.quantity
        
        is_overnight = order.shipping_preference == "overnight"
        destination_zone = self._get_zone(order.shipping_address.country)
        
        base_rate = self.get_base_rate(total_weight, destination_zone)
        
        if is_overnight:
            return base_rate * 2.5
        elif order.is_prime_member:
            return base_rate * 0.8
        else:
            return base_rate

# ✅ GOOD — Logic moved to the class that owns the data
class Order:
    def get_total_weight(self) -> Decimal:
        """Calculate total weight of all items in this order."""
        return sum(item.product.weight * item.quantity for item in self.items)

    @property
    def is_overnight_shipping(self) -> bool:
        return self.shipping_preference == "overnight"

class ShippingCalculator:
    def calculate_shipping(self, order: Order) -> Decimal:
        total_weight = order.get_total_weight()
        destination_zone = self._get_zone(order.shipping_address.country)
        
        base_rate = self.get_base_rate(total_weight, destination_zone)
        
        if order.is_overnight_shipping and order.is_prime_member:
            return base_rate * 2.0  # Overnight prime discount
        elif order.is_overnight_shipping:
            return base_rate * 2.5
        elif order.is_prime_member:
            return base_rate * 0.8
        else:
            return base_rate
```

**Root Cause:** Procedural thinking applied to objects — treating the order as a data bag and writing procedural logic "outside" of it.

**Fix:** Move the behavior to the class whose data it operates on (Tell Don't Ask principle).

---

#### Shotgun Surgery (Many-Hands Problem)

Making a single type of change requires modifying many different files or modules. Every time you need to add a new capability, you find yourself editing 8-12 scattered locations. Symptoms include: adding a new status requires edits in `models.py`, `validators.py`, `serializers.py`, `templates/`, `email_notifications.py`, `audit_log.py`; or adding a new payment method touching 10+ files.

```python
# ❌ BAD — Shotgun Surgery: Adding a "refunded" status touches 8 files
# models.py — add enum value
class OrderStatus(Enum):
    CREATED = "created"
    PAID = "paid"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    REFUNDED = "refunded"  # <-- edit here

# validators.py — add validation rule  
def validate_order_status(status: str):
    valid = ["created", "paid", "shipped", "delivered", "refunded"]  # <-- edit here
    if status not in valid:
        raise ValueError(f"Invalid status: {status}")

# serializers.py — update response schema
class OrderSerializer(serializers.ModelSerializer):
    class Meta:
        fields = ["id", "status", "total", ...]  # status validation updated

# templates/order.html — update UI rendering
{% if order.status == "refunded" %}
  <span class="badge-refunded">Refunded</span>
{% endif %}  # <-- edit here

# email_notifications.py — add notification
if order.status == "refunded":
    send_email(order.customer, "Your order has been refunded", ...)

# audit_log.py — log the action
if order.status == "refunded":
    log_action("order_refunded", order)

# permissions.py — restrict access
PERMISSIONS = {
    "refunded": ["admin", "finance"],  # <-- edit here
}

# api_router.py — update endpoint filter
@app.get("/orders/{id}/refund")  # new endpoint
def refund_order(order_id: str): ...
```

```python
# ✅ GOOD — State Pattern encapsulates each status's behavior
class OrderStatus(Enum):
    CREATED = "created"
    PAID = "paid"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    REFUNDED = "refunded"

class OrderStatusHandler(ABC):
    """Each concrete handler encapsulates all behavior for its status."""
    @abstractmethod
    def get_ui_badge_class(self) -> str: ...
    
    @abstractmethod
    def send_notifications(self, order: Order) -> None: ...
    
    @abstractmethod
    def get_permissions(self) -> set[str]: ...

class RefundedStatusHandler(OrderStatusHandler):
    def get_ui_badge_class(self) -> str:
        return "badge-refunded"
    
    def send_notifications(self, order: Order) -> None:
        send_email(order.customer, "Your order has been refunded", ...)
    
    def get_permissions(self) -> set[str]:
        return {"admin", "finance"}

# Registry pattern eliminates conditional checks everywhere
STATUS_HANDLERS: dict[OrderStatus, OrderStatusHandler] = {
    OrderStatus.CREATED: CreatedStatusHandler(),
    OrderStatus.PAID: PaidStatusHandler(),
    OrderStatus.REFUNDED: RefundedStatusHandler(),
}

class Order:
    def _get_status_handler(self) -> OrderStatusHandler:
        return STATUS_HANDLERS[self.status]

    @property
    def status_badge_class(self) -> str:
        return self._get_status_handler().get_ui_badge_class()

    def notify_status_change(self) -> None:
        self._get_status_handler().send_notifications(self)
```

**Root Cause:** Behavior tied to data values (enums, strings) rather than encapsulated in polymorphic objects. Each code location discovers the enum independently and adds its own conditional logic.

**Fix:** State pattern or strategy pattern — move behavior into classes that correspond to each variant. Use a registry to eliminate `if/elif` chains.

---

### Category 2: Abstraction Anti-Patterns

#### Leaky Abstraction

An abstraction exposes implementation details that should be hidden. Consumers of the API must know about internals (database schemas, network protocols, serialization formats) to use it correctly. Symptoms include: methods accepting `raw_sql: str`, configuration classes with fields like `db_connection_string_with_password`, wrapper functions that just call through to underlying libraries without adding value.

```python
# ❌ BAD — Leaky Abstraction: Repository exposes SQL and DB details
class UserRepository:
    def __init__(self, db_conn):  # Exposes raw connection object
        self.db = db_conn
    
    def get_user(self, user_id: int) -> dict:  # Returns raw dict, not a domain object
        cursor = self.db.cursor()  # Caller must know about cursors
        cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")  # Leaks SQL
        return cursor.fetchone()  # Leaks tuple-like access

    def find_active(self) -> list:  # Returns opaque list of dicts
        query = "SELECT * FROM users WHERE active = 1 AND deleted_at IS NULL"
        rows = self.db.raw_execute(query)
        return [{"id": r[0], "name": r[2]} for r in rows]  # Leaks column indices

# ✅ GOOD — Clean abstraction with domain objects and interface
class UserRepository:
    def __init__(self, connection_pool: ConnectionPool):  # Depends on abstraction
        self._pool = connection_pool
    
    def get_user(self, user_id: UserID) -> User | None:
        """Find a user by ID. Returns domain object or None."""
        sql = "SELECT id, name, email, created_at FROM users WHERE id = %s"
        row = self._pool.query_one(sql, [user_id.value])
        if row is None:
            return None
        return User(
            user_id=UserID(row["id"]),
            name=row["name"],
            email=row["email"],
            created_at=row["created_at"],
        )

    def find_active(self) -> Iterator[User]:
        """Find all active users. Returns an iterator of domain objects."""
        sql = "SELECT id, name, email, created_at FROM users WHERE active = 1"
        rows = self._pool.query_iter(sql)
        return (self._row_to_user(row) for row in rows)

    def _row_to_user(self, row: dict) -> User:
        return User(
            user_id=UserID(row["id"]),
            name=row["name"],
            email=row["email"],
            created_at=row["created_at"],
        )
```

**Root Cause:** Building thin wrappers instead of real abstractions — the wrapper adds a function call layer but doesn't define its own domain model.

**Fix:** Define a proper domain model with value objects and rich interfaces. Hide all implementation details behind well-typed boundaries.

---

#### Cargo Cult Programming

Following practices, patterns, or code structures without understanding why they exist. Copy-paste patterns from Stack Overflow or other codebases blindly. Symptoms include: try/except blocks that catch `Exception` and do nothing (or just `pass`), unused imports added because "it's needed for serialization," middleware or decorators applied everywhere regardless of relevance, configuration values copied from tutorials without reading the docs.

```python
# ❌ BAD — Cargo Cult Programming: Copied patterns without understanding
import json
import yaml  # Unused but copied from another file
from pathlib import Path
import hashlib  # Never used
import logging

class DataProcessor:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self._cache = {}  # Created but never populated
        self._lock = threading.Lock()  # Acquired and released without protecting anything
    
    def process(self, data):
        try:  # Catching all exceptions then ignoring them — classic cargo cult
            result = self._compute(data)
            return result
        except Exception:  # Bare except swallowing ALL errors
            pass  # Silent failure — no logging, no retry, no signal
    
    def save(self, data):
        with self._lock:  # Lock acquired but nothing shared is accessed inside
            filename = f"output_{datetime.datetime.now().isoformat()}.json"
            json.dump(data, open(filename, "w"))  # File handle never closed!
    
    def validate(self, data):
        # Regex copied from Stack Overflow with no understanding of what it does
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'  # Validates email? 
        return re.search(pattern, data)  # Returns None or match, caller doesn't know

# ✅ GOOD — Each component serves a clear purpose
import json
from pathlib import Path
import logging
from typing import Any

logger = logging.getLogger(__name__)

class DataProcessor:
    def __init__(self, output_dir: Path):
        self._output_dir = output_dir
        self._output_dir.mkdir(parents=True, exist_ok=True)
    
    def process(self, data: dict) -> dict:
        """Process input data and return transformed result.
        
        Raises:
            ProcessingError: If the transformation cannot complete.
        """
        try:
            return self._compute(data)
        except ValueError as exc:
            logger.error("Invalid input data: %s", exc)
            raise ProcessingError(f"Cannot process invalid input") from exc
        except KeyError as exc:
            logger.warning("Missing required field: %s", exc)
            raise ProcessingError(f"Data integrity issue: {exc}") from exc
    
    def _compute(self, data: dict) -> dict:
        """Core computation logic."""
        result = {}
        for key, value in data.items():
            if isinstance(value, str):
                result[key] = value.strip().lower()
            elif isinstance(value, (int, float)):
                result[key] = round(value, 2)
            else:
                result[key] = value
        return result
    
    def save(self, data: dict, filename: str) -> Path:
        """Save processed data to a JSON file. Returns the written path."""
        filepath = self._output_dir / f"{filename}.json"
        filepath.write_text(json.dumps(data, indent=2))
        logger.info("Saved %d records to %s", len(data), filepath)
        return filepath
    
    @staticmethod
    def is_valid_email(email: str) -> bool:
        """Validate email format using standard regex."""
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))
```

**Root Cause:** Copying code without reading or understanding it. "It worked in the other project" becomes the justification for every unused import and empty try/except block.

**Fix:** Read and understand every line of code you include. If a dependency, pattern, or idiom doesn't serve an obvious purpose in this context, remove it. Write tests that prove the behavior matters.

---

### Category 3: Organization Anti-Patterns

#### Spaghetti Code

Code with no clear structure — deeply nested conditionals, goto-like control flow (long `if/elif` chains or `switch` statements), functions that call each other in circular or unpredictable ways, variables whose purpose is unclear because they're assigned in multiple places. Symptoms include: cyclomatic complexity exceeding 15 on a single function, nesting depth deeper than 4 levels, functions that are both called by and calling other functions in tangled chains.

```python
# ❌ BAD — Spaghetti: Deeply nested conditionals, unclear control flow
def handle_request(request):
    if request.method == "POST":
        if request.body:
            data = json.loads(request.body)
            if "username" in data and "password" in data:
                user = get_user(data["username"])
                if user:
                    if check_password(user, data["password"]):
                        if user.is_active:
                            if user.role == "admin":
                                if request.headers.get("x-admin-key"):
                                    return handle_admin_action(user, data)
                                else:
                                    return error(403, "Missing admin key")
                            elif user.role == "moderator":
                                if check_moderation_permissions(user):
                                    return handle_moderator_action(user, data)
                                else:
                                    return error(403, "Insufficient permissions")
                            else:
                                return handle_user_action(user, data)
                        else:
                            return error(403, "Account suspended")
                    else:
                        return error(401, "Invalid password")
                else:
                    return error(404, "User not found")
            else:
                return error(400, "Missing required fields")
        else:
            return error(400, "Empty request body")
    elif request.method == "GET":
        if request.path == "/health":
            return ok({"status": "healthy"})
        elif request.path.startswith("/api/"):
            token = request.headers.get("Authorization", "").replace("Bearer ", "")
            if not token:
                return error(401, "Missing auth token")
            user = verify_token(token)
            if not user:
                return error(401, "Invalid token")
            return handle_api_request(user, request.path)
        else:
            return render_template("index.html")
    else:
        return error(405, "Method not allowed")

# ✅ GOOD — Guard clauses + routing table + single-responsibility handlers
from functools import wraps
from typing import Callable

def require_auth(handler: Callable) -> Callable:
    """Decorator that verifies Bearer token and injects user into request context."""
    @wraps(handler)
    def wrapper(request: Request) -> Response:
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return error(401, "Missing auth token")
        user = verify_token(auth[7:])
        if not user:
            return error(401, "Invalid token")
        request.user = user
        return handler(request)
    return wrapper

def require_role(*roles: str):
    """Decorator that checks user has one of the required roles."""
    def decorator(handler: Callable) -> Callable:
        @wraps(handler)
        def wrapper(request: Request) -> Response:
            if request.user.role not in roles:
                return error(403, f"Requires one of: {', '.join(roles)}")
            return handler(request)
        return wrapper
    return decorator

# Routing table — no nested conditionals
ROUTES: dict[str, Callable] = {
    "GET /health": lambda r: ok({"status": "healthy"}),
    "POST /login": login_handler,
    "GET /dashboard": require_auth(dashboard_handler),
}

def handle_request(request: Request) -> Response:
    """Dispatch request using routing table. Single level of control flow."""
    if request.method == "HEAD":
        return ok()
    
    # Guard clause for unsupported methods
    if request.method not in ("GET", "POST", "PUT", "DELETE"):
        return error(405, f"Method {request.method} not allowed")
    
    route_key = f"{request.method} {request.path}"
    handler = ROUTES.get(route_key)
    if handler is None:
        return error(404, "Route not found")
    
    return handler(request)
```

**Root Cause:** Adding conditions inline rather than extracting them into named functions or routing structures. Each new requirement adds another `if/elif` layer without restructuring.

**Fix:** Extract guard clauses to early returns, build explicit routing tables, and decompose large handlers into small focused functions with descriptive names. Target: no nesting deeper than 2 levels.

---

#### Callback Hell (Pyramid of Doom)

Heavily nested callback chains or sequential `await` calls that make the control flow impossible to follow horizontally. The code reads like a pyramid — each async operation nests deeper, making error handling and early returns impractical. Symptoms include: indentation extending past column 60, multiple levels of callbacks before reaching the actual business logic, separate error handlers repeated at every level.

```python
# ❌ BAD — Callback Hell: Nested async calls with duplicated error handling
async def process_user_order(user_id: str, product_id: str, quantity: int):
    try:
        user = await db.get_user(user_id)  # level 1
        if not user:
            return error(404, "User not found")
        
        try:
            product = await db.get_product(product_id)  # level 2
            if not product:
                return error(404, "Product not found")
            
            try:
                if product.stock < quantity:  # level 3
                    return error(400, "Insufficient stock")
                
                try:
                    total = product.price * quantity  # level 3
                    tax = await tax_service.calculate(user.address, total)  # level 3
                    final_total = total + tax  # level 3
                    
                    try:
                        order = Order(  # level 4
                            user_id=user.id,
                            product_id=product.id,
                            quantity=quantity,
                            total=final_total,
                            status="pending",
                        )
                        await db.save_order(order)  # level 4
                        
                        try:
                            payment = await payment_gateway.charge(  # level 5
                                user.payment_method, final_total
                            )
                            
                            try:
                                if payment.success:  # level 6
                                    order.status = "confirmed"
                                    await db.save_order(order)  # level 6
                                    
                                    try:
                                        await inventory.decrement(product_id, quantity)  # level 7
                                        await email_service.send_confirmation(user.email, order)  # level 7
                                        return ok({"order_id": order.id})
                                    except Exception as e:  # level 7
                                        return error(500, f"Failed to send confirmation: {e}")
                                else:
                                    return error(402, "Payment failed")
                            except Exception as e:  # level 5
                                return error(500, f"Payment error: {e}")
                        except Exception as e:  # level 4
                            return error(500, f"Order save error: {e}")
                    except Exception as e:  # level 3
                        return error(500, f"Tax calculation error: {e}")
                except Exception as e:  # level 2
                    return error(500, f"Stock check error: {e}")
            except Exception as e:  # level 1
                return error(500, f"Product error: {e}")
        except Exception as e:
            return error(500, f"User fetch error: {e}")
    except Exception as e:
        return error(500, f"Unexpected error: {e}")

# ✅ GOOD — Flat flow with guard clauses and dedicated step functions
async def process_user_order(user_id: str, product_id: str, quantity: int) -> dict:
    """Process an order with flat control flow. Each step is a single responsibility."""
    
    # Step 1: Validate user exists
    user = await _get_or_raise_user(user_id)
    
    # Step 2: Validate and fetch product
    product = await _get_or_raise_product(product_id)
    
    # Step 3: Check stock (guard clause)
    if product.stock < quantity:
        raise OrderError("Insufficient stock", code=400)
    
    # Step 4: Calculate total with tax
    subtotal = product.price * quantity
    tax = await _calculate_tax(user.address, subtotal)
    final_total = round(subtotal + tax, 2)
    
    # Step 5: Create and persist order
    order = Order(
        user_id=user.id,
        product_id=product.id,
        quantity=quantity,
        total=final_total,
        status="pending",
    )
    await db.save_order(order)
    
    # Step 6: Process payment
    payment = await _charge_payment(user.payment_method, final_total)
    if not payment.success:
        raise OrderError("Payment declined", code=402)
    
    # Step 7: Confirm and fulfill
    order.status = "confirmed"
    await db.save_order(order)
    
    # Fire-and-forget steps (non-critical to the happy path)
    await inventory.decrement(product_id, quantity)
    await email_service.send_confirmation(user.email, order)
    
    return {"order_id": order.id}

async def _get_or_raise_user(user_id: str) -> User:
    user = await db.get_user(user_id)
    if not user:
        raise OrderError("User not found", code=404)
    return user

async def _get_or_raise_product(product_id: str) -> Product:
    product = await db.get_product(product_id)
    if not product:
        raise OrderError("Product not found", code=404)
    return product

async def _calculate_tax(address: Address, amount: float) -> float:
    result = await tax_service.calculate(address, amount)
    return round(result, 2)

async def _charge_payment(payment_method: PaymentMethod, amount: float) -> PaymentResult:
    payment = await payment_gateway.charge(payment_method, amount)
    if not payment.success:
        logger.warning("Payment failed for %s: %s", payment_method.id, payment.error)
    return payment
```

**Root Cause:** Writing sequential async code as nested callbacks instead of using top-level awaits with early returns. The pyramid forms because each `await` was wrapped in its own `try/except` block rather than having shared error handling.

**Fix:** Use top-level `await` statements with guard clauses for error cases. Extract validation helpers that raise domain-specific errors. Keep business logic at one indentation level.

---

### Category 4: Data Anti-Patterns

#### Magic Numbers and Strings

Hardcoded values scattered throughout the codebase without explanation of what they represent. Changing a value in one place requires searching for it elsewhere, or worse — forgetting to update it in another place. Symptoms include: `if status == 3`, `timeout = 30000` with no unit annotation, `amount * 1.08` with no explanation of the 1.08 multiplier.

```python
# ❌ BAD — Magic Numbers everywhere
def calculate_shipping(weight: float) -> Decimal:
    base = 5.99
    if weight > 50:
        return Decimal(str(base + (weight - 50) * 0.15))
    elif weight > 20:
        return Decimal(str(base + (weight - 20) * 0.10))
    else:
        return Decimal(str(base))

def process_payment(amount: float, card: str) -> bool:
    if len(card) != 16:
        return False
    expiry_parts = card.split("/")
    exp_month = int(expiry_parts[1])
    if exp_month < 1 or exp_month > 12:
        return False
    
    import datetime
    now = datetime.datetime.now()
    max_age = 90 * 24 * 60 * 60  # seconds? days? unclear
    retries = 3
    timeout = 30000  # milliseconds? microseconds?
    
    for attempt in range(retries):
        result = gateway.charge(amount, card, timeout=timeout)
        if result.success:
            return True
        time.sleep(1.5)  # Why 1.5 seconds specifically?
    
    return False

# ✅ GOOD — Named constants with clear units and documentation
from decimal import Decimal
import datetime

# Shipping tier weights in kilograms
FREE_SHIPPING_TIER_KG = 0.5
STANDARD_SHIPPING_TIER_KG = 50.0
HEAVY_SHIPPING_TIER_KG = 20.0

SHIPPING_BASE_RATE_CENTS = 599  # $5.99 in cents
HEAVY_WEIGHT_SURCHARGE_PER_KG_CENTS = 15
STANDARD_WEIGHT_SURCHARGE_PER_KG_CENTS = 10

# Payment gateway configuration
MAX_CARD_LENGTH = 16
MIN_CARD_LENGTH = 13
VALID_EXPIRY_MONTHS = range(1, 13)

PAYMENT_MAX_RETRIES = 3
PAYMENT_TIMEOUT_MS = 30_000
PAYMENT_RETRY_DELAY_S = 1.5

def calculate_shipping(weight_kg: float) -> Decimal:
    """Calculate shipping cost based on weight tier."""
    if weight_kg >= HEAVY_SHIPPING_TIER_KG:
        excess_kg = weight_kg - HEAVY_SHIPPING_TIER_KG
        return Decimal(str(SHIPPING_BASE_RATE_CENTS + excess_kg * HEAVY_WEIGHT_SURCHARGE_PER_KG_CENTS))
    elif weight_kg >= STANDARD_SHIPPING_TIER_KG:
        excess_kg = weight_kg - STANDARD_SHIPPING_TIER_KG
        return Decimal(str(SHIPPING_BASE_RATE_CENTS + excess_kg * STANDARD_WEIGHT_SURCHARGE_PER_KG_CENTS))
    else:
        return Decimal(str(SHIPPING_BASE_RATE_CENTS))

def process_payment(amount_cents: int, card_number: str) -> bool:
    """Process payment with retry logic.
    
    Raises:
        PaymentError: If all retry attempts fail.
    """
    if not _is_valid_card_format(card_number):
        raise PaymentError("Invalid card format")
    
    for attempt in range(PAYMENT_MAX_RETRIES):
        try:
            result = gateway.charge(amount_cents, card_number, timeout_ms=PAYMENT_TIMEOUT_MS)
            return result.success
        except GatewayTimeoutError:
            if attempt == PAYMENT_MAX_RETRIES - 1:
                raise PaymentError("Payment gateway timed out after retries") from None
            time.sleep(PAYMENT_RETRY_DELAY_S * (attempt + 1))  # Exponential backoff
        except PaymentError:
            raise
    
    return False

def _is_valid_card_format(card_number: str) -> bool:
    """Validate basic card number format."""
    cleaned = card_number.replace(" ", "").replace("-", "")
    if not cleaned.isdigit():
        return False
    if not (MIN_CARD_LENGTH <= len(cleaned) <= MAX_CARD_LENGTH):
        return False
    return True
```

**Root Cause:** Writing code that works in the moment without investing in naming and documentation. Constants seem like "extra work" until you need to change them or explain them to someone else.

**Fix:** Replace every unexplained numeric or string literal with a `const`, `FQN_CONSTANT`, or `dataclass` field. Include units in constant names when applicable (`_MS`, `_S`, `_KG`, `_CENTS`). Group related constants in configuration classes or dataclasses.

---

## Severity Classification

### Blocking Anti-Patterns
These prevent new development and must be addressed before adding features:
- **God Object** — Adding any feature requires modifying a fragile, massive class
- **Spaghetti Code** — Control flow is too tangled to safely add branches
- **Shotgun Surgery** — Every change touches 8+ files with high risk of breaking things

### Nagging Anti-Patterns
These slow down development but don't block it entirely:
- **Feature Envy** — Working with the right data requires jumping between classes
- **Leaky Abstraction** — Understanding the API requires reading implementation details
- **Magic Numbers** — Reading code requires reverse-engineering what values mean

### Cosmetic Anti-Patterns
These are annoying but functionally harmless:
- **Cargo Cult Programming** (when unused code doesn't cause bugs)
- Minor naming issues or formatting inconsistencies

---

## Constraints

### MUST DO
- Always show BEFORE/AFTER code comparisons when diagnosing anti-patterns
- Name the specific positive pattern that resolves each anti-pattern
- Assess severity before recommending fixes — not all anti-patterns are equal
- Focus on the root cause, not just symptoms — fixing a symptom without addressing cause creates another anti-pattern

### MUST NOT DO
- Diagnose an anti-pattern based solely on file size or function length (large files can be legitimate for generated code, large datasets, etc.)
- Recommend refactoring that changes public API contracts without migration guidance
- Apply anti-pattern labels to code you don't understand — diagnose the actual problem first, name the pattern second
- Treat "anti-pattern" as a synonym for "I wouldn't do it this way" — there must be demonstrable negative consequences

---

## Output Template

When this skill is active, produce:

1. **Anti-Pattern Identified** — Name and category of the anti-pattern with code location
2. **Symptom Evidence** — Specific code snippets showing the symptoms (not just the label)
3. **Severity Assessment** — Blocking, nagging, or cosmetic classification with rationale
4. **Root Cause Analysis** — Why this pattern emerged in this context
5. **Refactoring Direction** — Concrete BEFORE/AFTER code comparison + recommended positive pattern

---

## Related Skills

| Skill | Purpose |
|---|---|
| `design-patterns-and-principles` | The positive patterns that replace these anti-patterns |
| `refactoring` | Step-by-step refactoring techniques and strategies |
| `code-review` | Broader code review methodology where this skill integrates |
| `modular-design` | Principles for modular structure that prevent many anti-patterns |
