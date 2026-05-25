---
name: monolith-refactoring
description: Refactors legacy monolithic "big ball of mud" codebases into cleanly
  bounded modules using dependency analysis, hexagonal port isolation, strangler fig
  extraction, and database splitting strategies to prepare for eventual service decomposition.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: monolith refactoring, big ball of mud, how do i untangle legacy code,
    spaghetti code cleanup, module extraction, strangler fig pattern, codebase restructuring,
    technical debt refactoring, god class decomposition, dependency analysis
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
  related-skills: monolith-architecture,microservices-architecture,anti-corruption-layer,domain-driven-design,technical-debt-management
------
# Monolith Refactoring Guide

Senior software architect untangling legacy monolithic "big ball of mud" codebases into cleanly bounded, independently extractable modules. Analyzes dependency graphs, isolates cross-cutting concerns, applies hexagonal ports to define service boundaries, and orchestrates incremental strangler fig extraction — transforming unstructured spaghetti code into a modular architecture ready for eventual microservice decomposition.

## TL;DR Checklist

- [ ] Map the current dependency graph with real call-site analysis (not guesswork)
- [ ] Identify the top 3 most tightly coupled modules that create the highest risk during extraction
- [ ] Isolate each target module behind explicit port interfaces before extracting any code
- [ ] Apply strangler fig pattern: route traffic for one feature at a time to new boundaries
- [ ] Split the database by implementing dual-write + read-side reconciliation per extracted module
- [ ] Verify zero behavioral regression with integration tests covering the extracted boundary

---

## When to Use

Use this skill when:

- A production codebase has grown into an unstructured monolith where changes cascade across unrelated modules
- You need to extract a specific domain capability (e.g., payments, shipping) into an independent service but the current code is too entangled to split safely
- Multiple teams are blocked by merge conflicts in shared files because the code lacks module boundaries
- A legacy application must support incremental modernization without full rewrite or extended downtime
- You are preparing for microservice decomposition and need clean extraction boundaries first
- Technical debt from "quick fixes" has created circular dependencies, god classes, and spaghetti import chains

## When NOT to Use

Avoid this approach when:

- **The codebase is already well-structured** — if modules have clear boundaries, explicit interfaces, and unidirectional dependencies, use `monolith-architecture` patterns instead of refactoring
- **You are in active feature development with no stabilization window** — heavy refactoring during peak feature delivery causes regression risk; schedule refactoring sprints separately
- **The system will be decommissioned within 6–12 months** — invest minimal effort in extraction when the lifecycle is short
- **There are zero automated tests and no budget to write them first** — refactoring without a safety net guarantees breakage. Write integration tests at boundaries before touching internal structure

---

## Core Workflow

### Phase 0: Establish Safety Net (Prerequisite)

Before any structural changes, ensure you have test coverage that can detect behavioral regressions.

1. **Identify High-Risk Entry Points** — List the top 10 most frequently called functions/endpoints by analyzing production access logs or APM data (e.g., Datadog, New Relic). These are your highest-priority regression risks.
   **Checkpoint:** You must have integration tests that exercise at least these 10 entry points. If coverage is below 50%, write tests first — do not proceed to refactoring until you can verify behavior after every structural change.

2. **Create a Golden Master Baseline** — For each high-risk endpoint, capture the complete request/response pair from production traffic (anonymized PII) and store them as regression test fixtures.
   **Checkpoint:** All baseline responses must be captured under realistic load conditions, not just happy-path manual testing. Edge cases in error handling are where refactoring breaks most often.

### Phase 1: Dependency Discovery and Mapping

Understand the actual dependency structure of the codebase — not what the documentation says it is, but what the imports and call sites actually show.

3. **Run Static Dependency Analysis** — Use language-specific tools to produce a real call graph. For Python, run `pipdeptree` for package dependencies and `pydeps` or `mypy --no-error-summary` with import analysis for intra-module calls. For Java, use ArchUnit; for TypeScript, use `madge`.
   **Checkpoint:** The output must show every file importing from every other file. Look for the "star graph" pattern — a single central file that imports or is imported by 50%+ of all modules. That central file is your first extraction target (typically a god class or shared utility).

4. **Classify Each Dependency** — Tag every identified dependency as one of:
   - **Vertical (domain)** — A legitimate business relationship between adjacent bounded contexts
   - **Horizontal (cross-cutting)** — Logging, configuration, authentication that spans all modules
   - **Cyclic** — A or B imports B and B imports A. These are the highest-priority targets for breaking.
   **Checkpoint:** Every cyclic dependency must be documented with its cycle path before you attempt to break it. Cycles hide in subtle chains: ModuleA → ModuleB → ModuleC → ModuleA.

5. **Build a Dependency Heat Map** — Create a matrix showing coupling strength (number of direct import edges) between every pair of modules. Rank modules by total coupling score (sum of all outgoing + incoming edges).
   **Checkpoint:** The top 3 most coupled modules account for approximately 40%+ of all dependency edges in the graph. These are your Phase 2 extraction targets.

### Phase 2: Boundary Isolation

Before extracting any code, define clean interfaces that other parts of the system will use to interact with the extracted module. This prevents downstream breakage during extraction.

6. **Extract Port Interfaces for Target Module** — For each high-coupling module identified in Step 5, create an ABC or Protocol that declares every method and attribute that external modules depend on. Copy the method signatures exactly as they exist; do not change behavior yet.
   **Checkpoint:** Every module that currently imports from the target must be updated to import the port instead. Run the test suite after each port extraction — if any test fails, either the port is incomplete or the behavior has changed unexpectedly.

7. **Apply Dependency Inversion** — Replace all direct imports of the target module's implementation with imports of its port interface. Use constructor injection or a dependency registry to wire concrete implementations at startup time.
   **Checkpoint:** After this step, zero external modules should import from the target module's implementation files (`services.py`, `handlers.py`, etc.). All imports must go through `ports.py` only. Verify with an import-linter check or equivalent static analysis.

8. **Extract Cross-Cutting Concerns** — Identify shared utilities (logging setup, config loading, error formatting, authentication middleware) that are duplicated or inconsistently applied across modules. Consolidate each into a dedicated `shared/` package and update all importing modules to use the centralized version.
   **Checkpoint:** Each cross-cutting concern must now exist in exactly one location. If any module still has its own copy of the same logic (even if slightly different), consolidate it.

### Phase 3: Incremental Extraction (Strangler Fig Pattern)

Extract one bounded context at a time using the strangler fig pattern — gradually replace functionality behind the extracted boundary while keeping the rest of the system running.

9. **Select the First Extraction Target** — Choose the module with the highest coupling score that also has the clearest domain boundary and the most testable behavior. Prefer modules that own their own data (database tables) rather than modules that share data access across multiple domains.
   **Checkpoint:** The target must have a well-defined set of public APIs, owned data, and at least 60% integration test coverage for its entry points.

10. **Set Up the Extraction Infrastructure** — Create the new service or module package. Deploy it to staging with the same configuration shape as the existing code. Implement a feature toggle that allows routing requests between old and new locations.
    **Checkpoint:** The strangler proxy must support percentage-based traffic splitting so you can validate behavior with increasing confidence before full cutover.

11. **Extract One Feature at a Time** — Pick a single endpoint or domain operation. Update the strangler proxy to route this request to the new boundary while leaving all other requests on the old path. Run the full regression suite against the extracted feature.
    **Checkpoint:** After extraction of each feature, the system must pass 100% of integration tests with zero behavioral difference from baseline. If any test fails, compare the response diff line by line — even whitespace changes can indicate subtle bugs in JSON serialization or error formatting.

### Phase 4: Database Splitting

Once a module's code boundary is clean and tested, split its database tables into an independent schema or database. This is the highest-risk step because it involves data migration with zero downtime.

12. **Implement Dual-Write Pattern** — Before dropping reads from the shared database, update all write paths to write to both the old table (legacy) and the new table (extracted). Use a transactional outbox pattern to guarantee consistency between writes.
    ```python
    class DualWriteRepository:
        """Writes to both legacy and extracted databases simultaneously."""
        
        def __init__(self, legacy_repo: "LegacyRepository", extracted_repo: "ExtractedRepository"):
            self.legacy = legacy_repo
            self.extracted = extracted_repo
        
        async def create_order(self, order_data: dict) -> str:
            """Dual-write: persists to both databases in a single logical transaction."""
            order_id = order_data["id"]
            
            # Write to legacy first (backward compatible)
            await self.legacy.create(order_data)
            
            # Write to extracted database (new boundary)
            await self.extracted.create(serialize_for_extracted(order_data))
            
            return order_id
        
        async def update_order(self, order_id: str, updates: dict) -> None:
            """Update both databases atomically using outbox pattern."""
            # Perform the update in a single database transaction on the extracted side
            await self.extracted.update(order_id, serialize_for_extracted(updates))
            
            # Publish to outbox — ensures the legacy write is acknowledged
            await self.legacy.update(order_id, updates)
    ```

13. **Run Read-Side Reconciliation** — Implement a background job that periodically compares data between the old and new tables. Report any divergences immediately with exact row-level diffs.
    ```python
    import asyncio
    from datetime import datetime
    from typing import Optional
    
    async def reconcile_orders(
        legacy_repo: "LegacyRepository",
        extracted_repo: "ExtractedRepository",
        batch_size: int = 1000,
    ) -> dict[str, int]:
        """Compare data between legacy and extracted databases.
        
        Returns a summary with counts of matches, divergences, and missing rows.
        """
        stats = {"matches": 0, "divergences": 0, "missing_in_legacy": 0, "missing_in_extracted": 0}
        
        # Fetch all orders from extracted database (authoritative source after dual-write)
        async for batch in extracted_repo.fetch_all_batches(batch_size):
            for record in batch:
                legacy_record = await legacy_repo.find_by_id(record.id)
                
                if legacy_record is None:
                    stats["missing_in_legacy"] += 1
                    continue
                
                # Compare all fields except timestamps (which may differ slightly)
                comparison_fields = {k: v for k, v in record.__dict__.items() 
                                     if k not in ("created_at", "updated_at")}
                legacy_fields = {k: v for k, v in legacy_record.__dict__.items() 
                                 if k not in ("created_at", "updated_at")}
                
                if comparison_fields == legacy_fields:
                    stats["matches"] += 1
                else:
                    stats["divergences"] += 1
                    # Log divergence for investigation — include specific field diffs
                    divergent_fields = {
                        k: (comparison_fields[k], legacy_fields[k])
                        for k in comparison_fields 
                        if comparison_fields[k] != legacy_fields.get(k)
                    }
                    print(f"Divergence in order {record.id}: {divergent_fields}")
        
        return stats
    
    # Run reconciliation every 5 minutes during migration window
    async def run_reconciliation_loop(legacy: "LegacyRepository", extracted: "ExtractedRepository"):
        while True:
            result = await reconcile_orders(legacy, extracted)
            print(f"Reconciliation complete: {result}")
            
            # Alert if divergence rate exceeds threshold
            total_compared = result["matches"] + result["divergences"]
            if total_compared > 0:
                divergence_rate = result["divergences"] / total_compared
                if divergence_rate > 0.001:  # 0.1% threshold
                    await send_alert(f"Reconciliation divergence rate {divergence_rate:.2%} exceeds threshold")
            
            await asyncio.sleep(300)  # 5 minutes
    ```

14. **Switch Reads to Extracted Database** — After reconciliation shows zero divergences over at least 48 hours of dual-write operation, update all read paths to query the extracted database instead of the shared table.
    **Checkpoint:** Monitor error rates and response latency for 24 hours after switching reads. Any spike indicates either a data format mismatch or a missing record in the extracted database that was never written during dual-write.

15. **Drop Dual-Write and Legacy Tables** — Once all read and write paths point exclusively to the extracted database, remove the dual-write wrapper. Delete the legacy tables after confirming no other systems (reporting dashboards, batch jobs) reference them.
    **Checkpoint:** Run a full query audit on the codebase and all external tools (BI dashboards, ETL pipelines) to confirm nothing references the legacy tables before deletion.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Breaking Circular Dependencies with Event Bus

Circular dependencies arise when Module A needs data from Module B while Module B also needs data from Module A. The fix is a shared in-process event bus that decouples the data flow into a unidirectional chain.

```python
# ─── BEFORE — Circular dependency: Orders ↔ Inventory ───
from inventory.models import StockItem
from orders.models import Order

class OrderService:
    def create_order(self, customer_id: str, items: list[dict]) -> Order:
        order = Order(customer_id=customer_id, items=items)
        # Directly queries inventory — creates circular import with inventory module
        for item in items:
            stock = StockItem.find_by_product_id(item["product_id"])
            if stock.quantity < item["quantity"]:
                raise ValueError(f"Insufficient stock for {item['product_id']}")
            stock.quantity -= item["quantity"]  # Mutates shared state
        return order


# ─── AFTER — Event bus breaks the cycle ───

from dataclasses import dataclass, field
from datetime import datetime
from typing import Callable, Dict, List
from abc import ABC, abstractmethod


@dataclass(frozen=True)
class OrderCreatedEvent:
    """Immutable event that carries only what listeners need — nothing more."""
    order_id: str
    customer_id: str
    items: list[dict]  # Simplified: [{product_id, quantity}]
    occurred_at: datetime = field(default_factory=datetime.utcnow)


class EventBus(ABC):
    """Abstract event bus interface — enables swapping in-process vs. broker-backed implementations."""
    
    @abstractmethod
    def publish(self, event: object) -> None: ...
    
    @abstractmethod
    def subscribe(self, event_type: type, handler: Callable[[object], None]) -> None: ...


class InProcessEventBus(EventBus):
    """Lightweight in-memory dispatcher for single-process applications."""
    
    def __init__(self) -> None:
        self._handlers: Dict[type, List[Callable]] = {}
    
    def publish(self, event: object) -> None:
        event_type = type(event)
        for handler in self._handlers.get(event_type, []):
            try:
                handler(event)
            except Exception as e:
                # Log but don't rethrow — a failing subscriber shouldn't destroy the publisher
                print(f"Event handler failed for {type(event).__name__}: {e}")
    
    def subscribe(self, event_type: type, handler: Callable[[object], None]) -> None:
        self._handlers.setdefault(event_type, []).append(handler)


# OrderService publishes events but knows nothing about inventory
class OrderService:
    def __init__(self, event_bus: EventBus):
        self.bus = event_bus
    
    async def create_order(self, customer_id: str, items: list[dict]) -> dict:
        order = await self._persist_order(customer_id, items)
        
        # Publish — the handler in InventoryModule will consume this asynchronously
        self.bus.publish(OrderCreatedEvent(
            order_id=order["id"],
            customer_id=customer_id,
            items=items,
        ))
        
        return order


# InventoryModule listens for events instead of being called by Orders
class InventorySubscriber:
    def __init__(self, inventory_repo, event_bus: EventBus):
        # Subscribe once at startup — the subscription is discovered, not called directly
        event_bus.subscribe(OrderCreatedEvent, self.on_order_created)
        self.repo = inventory_repo
    
    async def on_order_created(self, event: OrderCreatedEvent) -> None:
        """Handle order creation by reserving stock for each item."""
        for item in event.items:
            await self.repo.reserve_stock(
                product_id=item["product_id"],
                quantity=item["quantity"],
                order_id=event.order_id,  # Used for rollback tracking
            )


# Wiring at application startup
event_bus = InProcessEventBus()
order_service = OrderService(event_bus)
inventory_subscriber = InventorySubscriber(inventory_repo, event_bus)
```

### Pattern 2: God Class Decomposition with Extracted Port Interfaces

A "god class" is a single module or class that knows and does too much — it couples dozens of unrelated concerns. The fix is to extract each responsibility into its own bounded module behind an explicit interface.

```python
# ─── BEFORE — God class handling everything ───
class ApplicationService:
    """Handles orders, payments, inventory, notifications, analytics, and reporting.
    
    This class has grown over 18 months to include every business operation.
    It imports from 23 other modules and is referenced by 40+ call sites.
    """
    
    def create_order(self, customer_id, items): ...        # Order management
    def process_payment(self, order_id, amount, method): ...  # Payment processing  
    def send_confirmation(self, customer_email, order_id): ...  # Email notifications
    def update_analytics(self, order_id, total): ...         # Analytics tracking
    def generate_invoice(self, order_id): ...                # Billing/invoicing
    def check_compliance(self, customer_id, order_total): ...  # Regulatory checks
    def notify_slack(self, message): ...                     # Team notifications
    def update_dashboard_metrics(self): ...                  # Internal metrics
    
    # No testability — every method requires all its dependencies


# ─── AFTER — Each responsibility is a separate module with explicit port ───

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True)
class OrderCreatedPayload:
    order_id: str
    customer_id: str
    total_amount: float
    items: list[str]


# Port 1: Payment processing — extracted from god class
class PaymentGatewayPort(ABC):
    @abstractmethod
    async def process_payment(self, order_id: str, amount: float, method: str) -> bool: ...
    
    @abstractmethod
    async def refund(self, order_id: str, amount: float) -> bool: ...


# Port 2: Notification — extracted from god class
class NotificationGatewayPort(ABC):
    @abstractmethod
    async def send_confirmation_email(self, customer_email: str, order_id: str) -> None: ...
    
    @abstractmethod
    async def send_slack_alert(self, channel: str, message: str) -> None: ...


# Port 3: Analytics — extracted from god class  
class AnalyticsPort(ABC):
    @abstractmethod
    async def track_order_created(self, order_id: str, total: float, items: list[str]) -> None: ...


# The slimmed ApplicationService now only orchestrates — it delegates to ports
class OrderOrchestrator:
    """Coordinates order creation by delegating to extracted modules through port interfaces."""
    
    def __init__(
        self,
        payment_gateway: PaymentGatewayPort,
        notifications: NotificationGatewayPort,
        analytics: AnalyticsPort,
    ):
        self.payment = payment_gateway
        self.notifications = notifications
        self.analytics = analytics
    
    async def create_order(self, customer_id: str, items: list[dict]) -> dict:
        # Step 1: Create the order in the Orders module (already extracted)
        order = await self._order_service.create(customer_id, items)
        
        # Step 2: Process payment via extracted port
        success = await self.payment.process_payment(
            order["id"], 
            order["total_amount"], 
            "credit_card"
        )
        if not success:
            raise RuntimeError(f"Payment failed for order {order['id']}")
        
        # Step 3: Send notification via extracted port
        await self.notifications.send_confirmation_email(
            _get_customer_email(customer_id),
            order["id"],
        )
        
        # Step 4: Track analytics via extracted port
        await self.analytics.track_order_created(
            order["id"], order["total_amount"], [item["product_id"] for item in items]
        )
        
        return order
    
    async def _order_service(self, customer_id: str, items: list[dict]) -> dict:
        """Internal method — the actual OrderService is injected at startup."""
        ...
```

### Pattern 3: Strangler Proxy for Incremental Traffic Routing

The strangler proxy sits between existing clients and the application, routing individual endpoints to new boundaries while keeping everything else on the old path. This enables incremental extraction with zero client-side changes.

```python
import json
from typing import Optional
from http.server import BaseHTTPRequestHandler


class StranglerProxy(BaseHTTPRequestHandler):
    """Routes requests to either legacy handlers or extracted module endpoints.
    
    Configuration-driven: each route maps to a version (legacy or v1/v2/...).
    Feature toggles control percentage-based routing for gradual rollout.
    """
    
    # Route configuration — loaded from environment or config file
    ROUTE_MAP = {
        "GET": {
            "/api/orders/{order_id}": {"version": "v1", "extracted_module": "orders_service"},
            "/api/products": {"version": "legacy"},
            "/api/customers": {"version": "legacy"},
        },
        "POST": {
            "/api/orders": {"version": "v1", "extracted_module": "orders_service"},
            "/api/payments": {"version": "v1", "extracted_module": "payment_service"},
            "/api/products": {"version": "legacy"},
        },
    }
    
    # Feature toggle percentages (0-100) — loaded from config/database
    feature_toggles: dict[str, int] = {
        "orders_extract_percentage": 100,   # 100% of orders traffic goes to extracted service
        "payments_extract_percentage": 25,  # 25% of payments traffic goes to extracted service
    }
    
    def route_request(self, method: str, path: str) -> Optional[dict]:
        """Determine where to send this request based on route map and feature toggles."""
        routes = self.ROUTE_MAP.get(method, {})
        
        # Pattern-match the path against registered routes
        for pattern, config in routes.items():
            if self._matches_pattern(path, pattern):
                # Check feature toggle for percentage-based routing
                toggle_key = f"{config['extracted_module']}_extract_percentage"
                percentage = self.feature_toggles.get(toggle_key, 0)
                
                import random
                if percentage > 0 and random.randint(1, 100) <= percentage:
                    return {
                        "target": config["extracted_module"],
                        "version": config["version"],
                        "path": path,
                    }
                else:
                    return {"target": "legacy", "version": "legacy", "path": path}
        
        # Default: send to legacy
        return {"target": "legacy", "version": "legacy", "path": path}
    
    def _matches_pattern(self, path: str, pattern: str) -> bool:
        """Simple wildcard matching for route patterns."""
        path_parts = path.rstrip("/").split("/")
        pattern_parts = pattern.rstrip("/").split("/")
        
        if len(path_parts) != len(pattern_parts):
            return False
        
        for pp, pat in zip(path_parts, pattern_parts):
            if pat.startswith("{") and pat.endswith("}"):
                continue  # Path parameter — matches anything
            if pp != pat:
                return False
        
        return True
    
    def do_GET(self):
        route = self.route_request("GET", self.path)
        if route["target"] == "legacy":
            self._forward_to_legacy(self.path)
        else:
            # Forward to extracted microservice
            target_url = f"http://localhost:{self._get_service_port(route['target'])}{self.path}"
            self._forward_to(target_url)
    
    def do_POST(self):
        route = self.route_request("POST", self.path)
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length) if content_length > 0 else b""
        
        if route["target"] == "legacy":
            self._forward_to_legacy(self.path, body)
        else:
            target_url = f"http://localhost:{self._get_service_port(route['target'])}{self.path}"
            self._forward_to(target_url, body)
    
    def _forward_to(self, url: str, body: bytes = b""):
        """Forward request to the extracted service."""
        import urllib.request
        req = urllib.request.Request(url, data=body if body else None, method=self.command)
        # Copy relevant headers
        for header in ["Content-Type", "Authorization", "X-Request-ID"]:
            if self.headers.get(header):
                req.add_header(header, self.headers[header])
        
        with urllib.request.urlopen(req, timeout=5) as response:
            self.send_response(response.status)
            for key, value in response.getheaders():
                self.send_header(key, value)
            self.end_headers()
            self.wfile.write(response.read())
    
    def _get_service_port(self, module_name: str) -> int:
        """Map module names to local service ports."""
        port_map = {
            "orders_service": 8001,
            "payment_service": 8002,
            "inventory_service": 8003,
        }
        return port_map.get(module_name, 8000)  # Default to legacy port
    
    def _forward_to_legacy(self, path: str, body: bytes = b""):
        """Forward request to the original monolith."""
        url = f"http://localhost:8000{path}"
        self._forward_to(url, body)
    
    # Suppress default logging
    def log_message(self, format, *args):
        pass
```

---

## Architecture Decision Matrix

| Refactoring Approach | When to Use | Effort | Risk | Best For |
|---|---|---|---|---|
| **Strangler Fig** | Production system with active traffic; need zero-downtime migration | High (sustained over weeks/months) | Low (gradual verification) | Large monoliths (>100k LOC) that must stay operational |
| **Big Bang Extract** | System in maintenance mode; no active users during window | Medium (one-time burst) | High (full regression risk) | Internal tools with defined maintenance windows |
| **Dual-Write + Reconcile** | Database splitting with zero data loss requirements | High (dual-write infrastructure) | Low (data integrity verified) | Any extraction involving database boundary changes |
| **Parallel Run** | Validating new implementation before cutover | Medium (run both simultaneously) | Low (comparison proves equivalence) | Complex business logic that is hard to unit test |
| **Feature Toggle Rollout** | Gradual user-facing extraction with canary validation | Medium (toggle infrastructure) | Low (rollback is instant) | User-facing features where A/B testing applies |

---

## Constraints

### MUST DO

- Always run dependency analysis on the actual codebase — never assume module boundaries based on directory structure or documentation
- Extract port interfaces before changing any implementation — other modules should depend on contracts, not concrete types
- Apply strangler fig pattern with percentage-based routing for production systems — never switch 100% of traffic without gradual verification
- Maintain dual-write during database splitting until reconciliation proves zero divergences for at least 48 continuous hours
- Keep the original module in place during extraction and only decommission after all callers have been migrated
- Write integration tests that cover the full call path across extracted boundaries before and after each refactoring step
- Document every dependency cycle you break with an ADR explaining the cycle path, why it existed, and how it was resolved
- Run import-linter or equivalent static analysis after each extraction to verify no new cyclic dependencies were introduced

### MUST NOT DO

- Never extract a module that lacks owned data — shared database tables are the number one cause of failed extractions
- Never perform big-bang refactoring on a production system with active users — the regression risk is unacceptable
- Never change business logic and restructure code simultaneously — isolate structural changes from behavior changes
- Never leave cross-cutting concerns duplicated across modules during extraction — consolidate shared utilities before extracting their consumers
- Never delete legacy tables or code until you've audited all downstream consumers including reporting dashboards, batch jobs, and third-party integrations
- Never extract without a strangler proxy or equivalent routing layer in production — direct call-site changes will cause cascading breakage

---

## Output Template

When applying this skill to analyze and refactor a legacy monolith, produce:

1. **Dependency Analysis Report** — Actual import graph with coupling scores per module, identified cyclic dependency chains, and the top 3 extraction candidates ranked by coupling + testability
2. **Port Interface Specifications** — ABC/Protocol definitions for every extracted module's public contract, including all method signatures, parameter types, and return types
3. **Extraction Plan** — Phased plan listing which module to extract first, second, third, with estimated effort per phase and dependency ordering constraints
4. **Strangler Route Configuration** — JSON or YAML map of existing endpoints to their routing targets (legacy vs. extracted) with feature toggle percentages per phase
5. **Database Migration Strategy** — Schema mapping between legacy tables and extracted schemas, dual-write implementation plan, reconciliation job schedule, and rollback procedure
6. **Risk Assessment** — Identified regression risks per extracted boundary with recommended test coverage thresholds and monitoring alerts to configure during migration

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `monolith-architecture` | Designing well-structured modular monoliths from scratch — complementary when starting a greenfield project |
| `microservices-architecture` | Design patterns for the extracted services once boundaries are clean and ready for independent deployment |
| `anti-corruption-layer` | Translation patterns for integrating extracted modules with legacy systems during migration |
| `domain-driven-design` | Bounded context mapping and aggregate design that informs which parts of the monolith should be extracted together |
| `technical-debt-management` | Prioritization frameworks for deciding which refactoring work to tackle first when facing multiple legacy pain points |
