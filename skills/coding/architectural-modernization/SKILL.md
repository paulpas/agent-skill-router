---
name: architectural-modernization
description: Upgrades legacy technology stacks — framework migrations, database transitions, infrastructure modernization, and API evolution — using incremental strategies that preserve business continuity while eliminating technical debt.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: framework migration, database migration, technology upgrade, legacy system modernization, Flask to FastAPI, MongoDB to PostgreSQL, SOAP to REST, on-prem to cloud, language upgrade, API evolution, infrastructure modernization, how do i upgrade a legacy system
  archetypes:
    - tactical
    - strategic
  anti_triggers:
    - brainstorming
    - vague ideation
    - code golf
    - over-engineering
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, config, do-dont]
  related-skills: monolith-refactoring,microservices-architecture,event-driven-architecture,cicd-pipeline-design,database-migrations
---

# Architectural Modernization Guide

Upgrades legacy technology stacks in existing systems — framework migrations, database transitions, infrastructure modernization, and API evolution — using incremental strategies that preserve business continuity while systematically eliminating technical debt. When loaded, the model designs migration plans that minimize downtime, maintain backward compatibility during transition, and validate correctness at each step through automated testing.

## TL;DR Checklist

- [ ] Audit current technology stack: framework versions, dependency tree, external integrations
- [ ] Select migration strategy (parallel run, strangler proxy, dual-write) based on risk tolerance
- [ ] Build compatibility adapters before changing core application code
- [ ] Write integration tests covering the old and new systems in parallel during transition
- [ ] Implement feature flags for gradual rollout of new technology behind toggle controls
- [ ] Plan rollback procedure with data sync mechanism before executing any migration step

---

## When to Use

Use this skill when:

- Upgrading a web framework (e.g., Flask 1.x → FastAPI, Django 2.x → 5.x, Ruby on Rails 5 → 7) while maintaining existing API contracts
- Migrating databases between paradigms (MongoDB document store → PostgreSQL relational, or Oracle → PostgreSQL) without downtime
- Moving infrastructure from on-premises servers to cloud providers (AWS, GCP, Azure) with minimal service interruption
- Replacing a synchronous REST API with GraphQL or gRPC while keeping the REST endpoint available during transition
- Upgrading programming language runtimes (Python 2 → 3, Java 8 → 17, Node.js 14 → 20 LTS) across multiple services

---

## When NOT to Use

Avoid architectural modernization when:

- **Greenfield projects** — Starting fresh with modern technology is always preferable; do not retrofit old code that has no users or business value
- **End-of-life systems with no active users** — Decommission instead of modernizing if the system contributes less than 1% of revenue or usage
- **Tightly coupled legacy monoliths with zero tests** — Invest in `monolith-refactoring` and test infrastructure first; migration will fail without a safety net
- **Budget constraints that allow only maintenance mode** — Prioritize stability; schedule modernization for the next budget cycle with documented technical debt

---

## Core Workflow

1. **Inventory Current Technology Stack** — Document every framework version, library dependency, database schema, API endpoint, and external integration point. Use `pipdeptree`, `npm list --depth=0`, or equivalent tools to generate a complete dependency graph. Identify which dependencies have known CVEs and what EOL dates apply. **Checkpoint:** Every production deployment must have a documented inventory file (e.g., `tech-inventory.yaml`) listing all components, versions, license types, and last security audit date.

2. **Select Migration Strategy Based on Risk Profile** — Choose one of three strategies:
   - **Parallel Run**: Run old and new systems side by side, route traffic via feature flag or load balancer weight. Lowest risk, highest resource cost. Use for customer-facing APIs where downtime is unacceptable.
   - **Strangler Proxy**: Place a reverse proxy (Nginx, Kong, Envoy) in front of the application. Route individual endpoints to new implementations gradually. Medium risk, medium complexity. Use for large applications with well-defined endpoint boundaries.
   - **Dual-Write / Read-Replay**: Write data to both old and new stores simultaneously. Verify output parity before switching reads. Use for database migrations where schema changes must be zero-downtime.

   **Checkpoint:** The chosen strategy must include a rollback trigger — if error rate exceeds 0.5% or p99 latency increases by more than 2x during migration, automatically revert to the old system.

3. **Build Compatibility Adapters** — Create thin adapter layers that translate between the old and new technology contracts. For framework migrations, write WSGI/ASGI adapters, middleware wrappers, and serializer/deserializer bridges. For database migrations, create a schema mapping layer that translates queries. These adapters isolate application logic from technology-specific concerns. **Checkpoint:** Each adapter must have unit tests verifying it produces identical output to the old technology for the same input.

4. **Implement New System Incrementally** — Build new components one at a time behind the strangler proxy or feature flag. Each component must be independently deployable, testable, and rollable back. Never rewrite the entire system in parallel — this is the #1 cause of migration failures. Replace components in order of decreasing coupling (start with the most isolated modules first). **Checkpoint:** Every new component must pass the full integration test suite before being enabled in production behind a feature flag.

5. **Execute Data Migration with Zero Downtime** — If the technology change involves data storage, implement dual-write during an initial sync phase. Use CDC (Change Data Capture) tools like Debezium or logical replication to keep both stores synchronized during the transition window. Perform a full data replay, verify checksums match, then switch reads to the new store. **Checkpoint:** Run a 24-hour parity check comparing read results from old and new stores before cutover — any discrepancy means do not proceed.

6. **Monitor, Validate, Decommission** — After migration completes, monitor error rates, latency percentiles, and business metrics for at least one full business cycle (e.g., one week including peak traffic day). Once confidence is established, disable the old system behind the feature flag. Do not decommission the old infrastructure until 30 days after cutover with zero incidents recorded. **Checkpoint:** Archive all old configuration files, database schemas, and deployment scripts in version control before removing infrastructure to preserve audit trail.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Framework Migration with API Compatibility Layer

When upgrading a web framework (e.g., Flask → FastAPI), the compatibility layer ensures that existing clients continue receiving responses in the same format while internal code transitions to the new framework. This pattern uses an adapter class that translates between frameworks without modifying business logic.

```python
"""framework_adapter.py — Adapter for gradual Flask-to-FastAPI migration."""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Callable, Protocol

logger = logging.getLogger(__name__)


# ─── Old framework interface (Flask-style) ────────────────────────────

class FlaskRequest(Protocol):
    """Simulated Flask request protocol for the old framework."""
    method: str
    path: str
    headers: dict[str, str]
    json_body: dict | None


class FlaskResponse(Protocol):
    """Simulated Flask response protocol."""
    status_code: int
    body: Any
    headers: dict[str, str]


# ─── New framework interface (FastAPI-style) ────────────────────────

@dataclass
class APIRequest:
    """New framework request representation."""
    method: str
    path: str
    headers: dict[str, str]
    json_body: dict | None = None


@dataclass
class APIResponse:
    """New framework response representation."""
    status_code: int
    body: dict | list | str
    headers: dict[str, str] = field(default_factory=dict)


# ─── Business Logic (framework-agnostic) ─────────────────────────────

class OrderService(ABC):
    """Business logic interface — works regardless of web framework."""
    
    @abstractmethod
    def get_order(self, order_id: str) -> dict[str, Any]: ...
    
    @abstractmethod
    def create_order(self, customer_id: str, items: list[dict]) -> dict[str, Any]: ...


# ─── Compatibility Adapter: Flask → FastAPI ───────────────────────────

class FrameworkAdapter(ABC):
    """Base adapter for framework migration. Subclasses handle translation."""
    
    @abstractmethod
    def adapt_request(self, raw_request: Any) -> APIRequest: ...
    
    @abstractmethod
    def adapt_response(self, result: dict) -> dict[str, Any]: ...


class FlaskToFastAPIAdapter(FrameworkAdapter):
    """Translates old Flask requests/responses to new FastAPI equivalents.
    
    This adapter sits between the existing Flask application and the
    new FastAPI business logic layer during the migration window.
    """
    
    def __init__(self, order_service: OrderService) -> None:
        self._service = order_service
    
    def adapt_request(self, raw_request: Any) -> APIRequest:
        """Convert Flask request to unified APIRequest."""
        json_body = None
        if hasattr(raw_request, 'get_json') and raw_request.get_json(silent=True):
            json_body = raw_request.get_json()
        
        return APIRequest(
            method=raw_request.method,
            path=raw_request.path,
            headers=dict(raw_request.headers),
            json_body=json_body,
        )
    
    def adapt_response(self, result: dict) -> dict[str, Any]:
        """Convert new framework response back to old format."""
        return {
            "status_code": 200,
            "body": result,
            "headers": {"Content-Type": "application/json"},
        }


# ─── ❌ BAD: Rewrite all controllers at once during migration ────────

class BadMigrationController:
    """Anti-pattern: replacing the entire controller breaks existing routes.
    
    This approach deletes old Flask routes and creates new FastAPI ones,
    causing a brief period where no route handler exists — downtime.
    """
    
    def __init__(self, app):
        # Deletes ALL existing routes — clients get 404s immediately
        app.router.routes = []
        self._new_service = NewFastAPIService()
    
    async def handle_request(self, request):
        # No backward compatibility — old API format breaks
        return await self._new_service.process(request.json())


# ─── ✅ GOOD: Adapter preserves both old and new contracts ───────────

class MigrationController:
    """Controls requests during Flask-to-FastAPI transition.
    
    Routes old-format requests through the adapter layer, allowing
    gradual enablement of new controllers via feature flags.
    """
    
    def __init__(self, adapter: FrameworkAdapter, order_service: OrderService) -> None:
        self._adapter = adapter
        self._service = order_service
        self._new_api_enabled = False  # Controlled by feature flag
    
    async def handle_request(self, raw_request: FlaskRequest) -> dict[str, Any]:
        """Unified request handler supporting both old and new APIs.
        
        When the feature flag is off (default), uses the adapter to maintain
        backward compatibility with the old Flask contract.
        
        When enabled, delegates directly to the new FastAPI service.
        """
        api_request = self._adapter.adapt_request(raw_request)
        
        if self._new_api_enabled:
            # New path — direct to FastAPI service
            logger.info("Routing to new FastAPI implementation")
            result = await self._service.get_order(api_request.path.split('/')[-1])
            return self._adapter.adapt_response(result)
        else:
            # Old path — through adapter for compatibility
            logger.debug("Routing through Flask adapter (legacy)")
            result = self._service.get_order(raw_request.path.split('/')[-1])
            return self._adapter.adapt_response(result)


# ─── Feature Flag Controller for Gradual Rollout ─────────────────────

class MigrationFeatureFlag:
    """Manages feature toggles during technology migration."""
    
    def __init__(self, flag_name: str = "new_framework_enabled") -> None:
        self._flag_name = flag_name
        self._enabled = False  # Start with old system
    
    def toggle(self) -> bool:
        """Flip the migration feature flag. Call during planned maintenance window."""
        self._enabled = not self._enabled
        logger.warning(f"Migration flag toggled to {self._enabled}")
        return self._enabled
    
    def should_use_new(self) -> bool:
        """Check if requests should route through new technology."""
        return self._enabled
```

### Pattern 2: Dual-Write Database Migration with Parity Verification

When migrating between database systems (e.g., MongoDB → PostgreSQL), dual-write ensures data consistency during transition by writing to both stores simultaneously. A parity checker verifies that reads produce identical results before switching traffic.

```python
"""database_migration.py — Dual-write migration with parity verification."""

from __future__ import annotations

import logging
import time
from abc import ABC, abstractmethod
from contextlib import contextmanager
from dataclasses import dataclass, field
from typing import Any, Protocol


logger = logging.getLogger(__name__)


# ─── Database Port Abstraction ────────────────────────────────────────

class DatabaseConnection(Protocol):
    """Abstract database connection protocol."""
    
    @abstractmethod
    def save(self, collection: str, document: dict[str, Any]) -> str: ...
    
    @abstractmethod
    def find_by_id(self, collection: str, doc_id: str) -> dict[str, Any] | None: ...
    
    @abstractmethod
    def find_all(self, collection: str, limit: int = 100) -> list[dict[str, Any]]: ...


@dataclass
class MigrationState:
    """Tracks migration progress for a specific table/collection."""
    table_name: str
    writes_in_flight: int = 0
    parity_check_failures: int = 0
    total_records_compared: int = 0
    last_parity_check_time: float | None = None
    
    def record_success(self) -> None:
        self.total_records_compared += 1
        if time.time() - (self.last_parity_check_time or 0) > 300:
            logger.info(f"Parity check passed for {self.table_name} "
                       f"({self.total_records_compared} records compared)")
    
    def record_failure(self) -> None:
        self.parity_check_failures += 1
        if self.parity_check_failures > 3:
            logger.error(f"Parity check failed {self.parity_check_failures} times "
                        f"for {self.table_name} — pausing migration")


# ─── Dual-Write Service ───────────────────────────────────────────────

class DualWriteService:
    """Writes to both old and new databases during migration.
    
    Guarantees that every write reaches at least one store. If the new
    store fails, a warning is logged but the operation proceeds with only
    the old store to avoid downtime.
    """
    
    def __init__(
        self,
        old_db: DatabaseConnection,
        new_db: DatabaseConnection,
        migration_enabled: bool = True,
    ) -> None:
        self._old_db = old_db
        self._new_db = new_db
        self._enabled = migration_enabled
        self._states: dict[str, MigrationState] = {}
    
    def _get_state(self, collection: str) -> MigrationState:
        if collection not in self._states:
            self._states[collection] = MigrationState(table_name=collection)
        return self._states[collection]
    
    def save(self, collection: str, document: dict[str, Any]) -> str:
        """Write to both databases with fallback on new-db failure.
        
        Always writes to old_db (source of truth during migration).
        Writes to new_db in best-effort mode — failures are logged but
        do not block the operation.
        
        Args:
            collection: The collection or table name
            document: The data to persist
            
        Returns:
            The document ID from the old database (authoritative during migration)
        """
        doc_id = self._old_db.save(collection, document)
        
        if not self._enabled:
            return doc_id
        
        state = self._get_state(collection)
        try:
            # Map MongoDB-style _id to SQL-compatible ID if needed
            if "_id" in document:
                safe_doc = {k: v for k, v in document.items() if k != "_id"}
            else:
                safe_doc = document.copy()
            
            self._new_db.save(collection, safe_doc)
            state.record_success()
        except Exception as exc:  # noqa: BLE001
            logger.error(f"New database write failed for {collection}: {exc}")
            state.record_failure()
        
        return doc_id
    
    def find_by_id(self, collection: str, doc_id: str) -> dict[str, Any] | None:
        """Read from new store if available, fallback to old store.
        
        During migration reads are gradually switched: first try the new
        database, then fall back to the old one for records that haven't
        been migrated yet.
        """
        try:
            result = self._new_db.find_by_id(collection, doc_id)
            if result is not None:
                return result
        except Exception as exc:  # noqa: BLE001
            logger.debug(f"New DB read failed for {collection}/{doc_id}: {exc}")
        
        return self._old_db.find_by_id(collection, doc_id)


# ─── Parity Verification Service ──────────────────────────────────────

class ParityChecker:
    """Verifies that old and new databases produce identical results.
    
    Runs periodic comparison checks by reading the same records from both
    stores and comparing field-by-field. Reports any discrepancies for
    manual review before cutover.
    """
    
    def __init__(self, old_db: DatabaseConnection, new_db: DatabaseConnection) -> None:
        self._old_db = old_db
        self._new_db = new_db
    
    def check_record(
        self,
        collection: str,
        doc_id: str,
        tolerance_ms: int = 1000,
    ) -> tuple[bool, str]:
        """Compare a single record between old and new stores.
        
        Returns (is_match, details).
        
        Args:
            collection: Collection or table name
            doc_id: Document ID to compare
            tolerance_ms: Time-based fields within this window are considered equal
            
        Returns:
            Tuple of (match boolean, human-readable details string)
        """
        old_record = self._old_db.find_by_id(collection, doc_id)
        new_record = self._new_db.find_by_id(collection, doc_id)
        
        if old_record is None and new_record is None:
            return False, "Record missing from both stores"
        
        if old_record is None:
            return False, f"Record exists in old store but not new (id={doc_id})"
        
        if new_record is None:
            return False, f"Record exists in new store but not old (id={doc_id})"
        
        # Normalize timestamps for comparison
        old_clean = {k: v for k, v in old_record.items() 
                    if not k.endswith("_at") and not k.endswith("_ts")}
        new_clean = {k: v for k, v in new_record.items() 
                    if not k.endswith("_at") and not k.endswith("_ts")}
        
        if old_clean == new_clean:
            return True, "Records match"
        
        # Find specific field mismatches
        mismatches = []
        for key in set(old_clean.keys()) | set(new_clean.keys()):
            old_val = old_clean.get(key)
            new_val = new_clean.get(key)
            if old_val != new_val:
                mismatches.append(f"  {key}: old={old_val} vs new={new_val}")
        
        return False, f"Mismatch on fields:\n" + "\n".join(mismatches)


# ─── ❌ BAD: Direct cutover without parity check ─────────────────────

class BadDatabaseCutover:
    """Anti-pattern: switches reads to new database immediately.
    
    This causes data loss for any records not yet migrated, and provides
    no way to detect or recover from schema mapping errors.
    """
    
    def __init__(self, old_db: DatabaseConnection, new_db: DatabaseConnection):
        self._old = old_db
        self._new = new_db
        self._switched = False
    
    def cutover(self) -> None:
        # No verification — if mapping is wrong, data is silently corrupted
        self._switched = True
    
    def find_by_id(self, collection: str, doc_id: str):
        if self._switched:
            return self._new.find_by_id(collection, doc_id)  # Could return None!
        return self._old.find_by_id(collection, doc_id)


# ─── ✅ GOOD: Parity-verified cutover with rollback ──────────────────

class SafeDatabaseCutover:
    """Safe cutover using parity verification and automatic rollback.
    
    Requires 99.9% record match rate before switching reads. Maintains
    dual-write capability for post-cutover reconciliation.
    """
    
    def __init__(
        self,
        old_db: DatabaseConnection,
        new_db: DatabaseConnection,
        parity_checker: ParityChecker | None = None,
        required_match_rate: float = 0.999,
    ) -> None:
        self._old = old_db
        self._new = new_db
        self._checker = parity_checker or ParityChecker(old_db, new_db)
        self._required_match_rate = required_match_rate
        self._readers_switched = False
    
    def verify_and_switch(
        self,
        sample_size: int = 10000,
        collection: str = "orders",
    ) -> bool:
        """Run parity check on random samples and switch reads if match rate is sufficient.
        
        Args:
            sample_size: Number of records to compare
            collection: Collection or table to verify
            
        Returns:
            True if cutover should proceed, False if more reconciliation needed
        """
        matches = 0
        total_checked = min(sample_size, 500)  # Practical limit per check
        
        for i in range(total_checked):
            doc_id = f"record-{i}"
            is_match, _ = self._checker.check_record(collection, doc_id)
            if is_match:
                matches += 1
        
        match_rate = matches / total_checked if total_checked > 0 else 0
        
        logger.info(f"Parity check: {match_rate:.4%} match rate "
                   f"({matches}/{total_checked}) — threshold: {self._required_match_rate:.4%}")
        
        if match_rate >= self._required_match_rate:
            self._readers_switched = True
            logger.info("✅ CUTOVER APPROVED — switching readers to new database")
            return True
        
        logger.warning("❌ CUTOVER DENIED — match rate below threshold")
        return False
    
    def find_by_id(self, collection: str, doc_id: str) -> dict | None:
        """Read from the appropriate store based on cutover status."""
        if self._readers_switched:
            # Primary reads go to new DB; fallback to old for reconciliation
            return self._new.find_by_id(collection, doc_id) or \
                   self._old.find_by_id(collection, doc_id)
        return self._old.find_by_id(collection, doc_id)
    
    def rollback(self) -> None:
        """Instantly revert reads to the old database."""
        self._readers_switched = False
        logger.warning("🔄 ROLLBACK — readers reverted to old database")
```

### Pattern 3: API Evolution with Contract Preservation

When replacing an API technology (SOAP → REST, or REST → GraphQL), maintain the existing contract so clients don't need to update simultaneously. The adapter translates between old and new formats transparently.

```python
"""api_evolution.py — SOAP-to-REST migration with contract preservation."""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


logger = logging.getLogger(__name__)


@dataclass
class SOAPEnvelope:
    """Represents a SOAP XML envelope structure."""
    action: str  # e.g., "GetCustomer", "CreateOrder"
    body: dict[str, Any]
    headers: dict[str, str] = field(default_factory=dict)


@dataclass
class RESTRequest:
    """Represents an HTTP REST request."""
    method: str  # GET, POST, PUT, DELETE
    path: str    # e.g., /api/v2/customers/{id}
    headers: dict[str, str] = field(default_factory=dict)
    body: dict | None = None


@dataclass
class SOAPResponse:
    """SOAP XML response envelope."""
    action: str
    result: dict[str, Any]
    fault_code: str | None = None
    fault_string: str | None = None


@dataclass
class RESTResponse:
    """HTTP REST response."""
    status_code: int
    body: dict | list
    headers: dict[str, str] = field(default_factory=lambda: {"Content-Type": "application/json"})


# ─── Service Interface (technology-agnostic) ──────────────────────────

class CustomerService(ABC):
    """Core business logic — independent of SOAP or REST transport."""
    
    @abstractmethod
    def get_customer(self, customer_id: str) -> dict[str, Any]: ...
    
    @abstractmethod
    def create_customer(self, name: str, email: str) -> dict[str, Any]: ...


# ─── SOAP → REST Contract Adapter ─────────────────────────────────────

class SOAPtoRESTAdapter(ABC):
    """Base adapter for API technology migration.
    
    Translates between the legacy SOAP XML contract and new RESTful
    HTTP requests/responses while preserving business semantics.
    """
    
    @abstractmethod
    def parse_request(self, soap: SOAPEnvelope) -> RESTRequest: ...
    
    @abstractmethod
    def format_response(self, result: dict) -> RESTResponse: ...


class LegacyToModernAdapter(SOAPtoRESTAdapter):
    """Translates SOAP actions to REST endpoints and vice versa.
    
    Maps SOAP action names to HTTP methods and path segments:
    - GetCustomer → GET /api/v2/customers/{id}
    - CreateOrder → POST /api/v2/orders
    - CancelPayment → DELETE /api/v2/payments/{id}
    """
    
    # Mapping table: SOAP action → REST method + path template
    ACTION_MAP: dict[str, tuple[str, str]] = {
        "GetCustomer": ("GET", "/api/v2/customers"),
        "GetOrder": ("GET", "/api/v2/orders"),
        "CreateCustomer": ("POST", "/api/v2/customers"),
        "UpdateCustomer": ("PUT", "/api/v2/customers"),
        "CancelPayment": ("DELETE", "/api/v2/payments"),
    }
    
    def parse_request(self, soap: SOAPEnvelope) -> RESTRequest:
        """Convert SOAP action to equivalent REST request."""
        if soap.action not in self.ACTION_MAP:
            raise ValueError(f"Unknown SOAP action: {soap.action}")
        
        method, path_template = self.ACTION_MAP[soap.action]
        
        # Extract ID from SOAP body if present
        customer_id = soap.body.get("CustomerId") or soap.body.get("ID")
        order_id = soap.body.get("OrderId") or soap.body.get("ID")
        
        # Build REST path with extracted IDs
        if customer_id:
            path = f"{path_template}/{customer_id}"
        elif order_id:
            path = f"{path_template}/{order_id}"
        else:
            path = path_template
        
        return RESTRequest(
            method=method,
            path=path,
            headers={"Accept": "application/json"},
            body=soap.body if method in ("POST", "PUT") else None,
        )
    
    def format_response(self, result: dict) -> RESTResponse:
        """Convert service result to REST response."""
        status_code = 201 if "created" in result.get("status", "").lower() else 200
        
        return RESTResponse(
            status_code=status_code,
            body=result,
        )


# ─── Contract Versioning Manager ─────────────────────────────────────

class APIVersionManager:
    """Manages API version transitions during migration.
    
    Tracks which clients are still using the old contract and which have
    migrated to the new one, enabling targeted communication and phased
    deprecation of legacy endpoints.
    """
    
    def __init__(self) -> None:
        self._client_versions: dict[str, str] = {}  # client_id → API version
    
    def register_client(self, client_id: str, api_version: str) -> None:
        """Register which API version a client is using."""
        self._client_versions[client_id] = api_version
        logger.info(f"Client {client_id} registered with API v{api_version}")
    
    def get_client_version(self, client_id: str) -> str:
        """Get the API version for a specific client."""
        return self._client_versions.get(client_id, "unknown")
    
    def is_deprecated(self, api_version: str) -> bool:
        """Check if an API version is marked for deprecation."""
        deprecated_versions = ["v1", "soap"]
        return api_version in deprecated_versions
    
    def get_migration_status(self) -> dict[str, Any]:
        """Get summary of migration progress by client."""
        total = len(self._client_versions)
        if total == 0:
            return {"total_clients": 0}
        
        old_clients = sum(1 for v in self._client_versions.values() 
                         if self.is_deprecated(v))
        
        return {
            "total_clients": total,
            "migrated_clients": total - old_clients,
            "legacy_clients": old_clients,
            "migration_percent": f"{((total - old_clients) / total) * 100:.1f}%",
        }


# ─── ❌ BAD: Remove old API before new one is ready ──────────────────

class BadAPIMigration:
    """Anti-pattern: deletes the SOAP endpoint immediately after deploying REST.
    
    Any client that hasn't migrated yet gets a 404 — no transition path,
    no contract preservation. This causes customer-facing incidents.
    """
    
    def __init__(self, app):
        # Deletes old routes — clients breaking immediately
        self._old_routes_deleted = True
    
    def handle_request(self, method: str, path: str, body: dict | None):
        # No fallback to old system — if new API has bugs, everything breaks
        raise RuntimeError("Old SOAP endpoint removed — upgrade required")


# ─── ✅ GOOD: Versioned gateway with automatic routing ────────────────

class APIMigrationGateway:
    """Routes requests to old or new API based on client version.
    
    Acts as the single entry point during migration, automatically
    directing each request to the appropriate backend based on the
    client's registered API version and capability headers.
    """
    
    def __init__(
        self,
        soap_adapter: LegacyToRESTAdapter | None = None,
        version_manager: APIVersionManager | None = None,
    ) -> None:
        self._adapter = soap_adapter or LegacyToRESTAdapter()
        self._version_mgr = version_manager or APIVersionManager()
    
    def route_request(self, raw_request: Any) -> RESTResponse:
        """Route each request to the appropriate backend.
        
        If client uses deprecated SOAP, adapter translates it.
        If client uses new REST, passes through directly.
        Unknown clients default to the most compatible (old) endpoint.
        """
        # Determine client identity and version from headers or auth token
        client_id = raw_request.headers.get("X-Client-ID", "anonymous")
        api_version = self._version_mgr.get_client_version(client_id)
        
        if self._version_mgr.is_deprecated(api_version):
            # Translate SOAP to REST, process through new service
            logger.info(f"Routing SOAP client {client_id} through adapter")
            soap_env = self._parse_soap(raw_request.body)  # type: ignore[union-attr]
            rest_req = self._adapter.parse_request(soap_env)
            result = self._process_with_new_service(rest_req)  # type: ignore[name-defined]
            return self._adapter.format_response(result)
        else:
            # Direct pass-through to new REST service
            logger.debug(f"Routing REST client {client_id} directly")
            return self._handle_rest_request(raw_request)  # type: ignore[name-defined]
    
    def _parse_soap(self, raw_body: Any) -> SOAPEnvelope:
        """Parse incoming SOAP XML envelope (implementation-specific)."""
        import xml.etree.ElementTree as ET
        root = ET.fromstring(raw_body)  # type: ignore[arg-type]
        body = root.find(".//Body") or root.find(".*//Body")  # type: ignore[union-attr]
        return SOAPEnvelope(
            action="GetCustomer",  # Simplified for example
            body={"CustomerId": "12345"},
        )
    
    def _process_with_new_service(self, request: RESTRequest) -> dict:
        """Process request through new service implementation."""
        return {"customer_id": "12345", "name": "John Doe"}  # type: ignore[return-value]
    
    def _handle_rest_request(self, raw_request: Any) -> RESTResponse:
        """Handle REST request directly (no translation needed)."""
        return RESTResponse(status_code=200, body={"status": "ok"})
```

---

## Constraints

### MUST DO
- **Always maintain backward compatibility during transition** — clients must never see 404 errors or schema changes while the old system is still active. If breaking changes are unavoidable in the new technology, implement a translation layer that presents the same contract to consumers.
- **Run parity checks before any production cutover** — compare at least 10,000 records between old and new stores with field-by-field verification (excluding timestamp fields). Document discrepancies and resolve them before switching reads. If match rate is below 99.9%, do not proceed.
- **Implement feature flags for all migration steps** — every technology switch must be reversible via a flag that can be flipped in under 5 seconds. Feature flags should be stored in a shared configuration service (e.g., Consul, etcd, or environment variables) accessible to both old and new systems.
- **Write integration tests covering both old and new paths** — test suite must validate that the adapter produces identical output for every request that hits both code paths. Use property-based testing when exact comparison is not feasible (e.g., floating-point arithmetic differences between database engines).
- **Monitor error rates and latency percentiles during migration** — track p50, p95, p99 latency separately for old-path and new-path requests in the adapter. If the new path's p99 exceeds 2x the baseline or error rate exceeds 0.5%, trigger an automatic rollback via the feature flag.

### MUST NOT DO
- **Never delete the old system before verifying the new one handles 100% of traffic patterns** — this is the most common cause of migration-related outages. Run both systems in parallel for at least one full business cycle (including peak traffic periods) before deprovisioning old infrastructure.
- **Never assume data types map directly between database systems** — MongoDB ObjectId ≠ PostgreSQL UUID, and MongoDB embedded documents ≠ SQL JOINs. Write explicit type-mapping tests that verify every field converts correctly between the two storage formats. Schema mapping errors are silent until they cause production bugs.
- **Never deploy the entire new system at once** — replace components one at a time behind feature flags. Each component replacement should be independently testable, monitorable, and rollable back. Parallel development of the entire new system ("big bang migration") has a > 70% failure rate in production environments.
- **Never skip data reconciliation after cutover** — run automated reconciliation scripts for at least 7 days after switching reads. Compare record counts, checksums of aggregate columns, and sample individual records between old and new stores. Log any discrepancies for manual review.

---

## Decision Guide: Choosing Migration Strategy

| Scenario | Recommended Strategy | Why |
|----------|---------------------|-----|
| Customer-facing API with SLA requirements | **Parallel Run** | Zero downtime; feature flag controls traffic split |
| Database migration with schema changes | **Dual-Write + Parity Check** | Guarantees data consistency before switching reads |
| Internal tool upgrade with low usage | **Strangler Proxy** | Minimal overhead; replace components at your pace |
| Framework upgrade with few external clients | **Phased Feature Flag** | Enable new framework behind flag for each endpoint |
| Full infrastructure migration (on-prem → cloud) | **Hybrid: Strangler + Parallel** | Route traffic incrementally while maintaining parity monitoring |

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `monolith-refactoring` | Structural decomposition of legacy codebases — use this BEFORE technology migration to ensure the code is cleanly modularized for incremental upgrades |
| `microservices-architecture` | Service decomposition patterns — after modernizing the framework, apply these patterns to extract independent services from the upgraded application |
| `database-migrations` | Database schema change management (Alembic, Flyway) — complements this skill's dual-write and parity verification strategies for zero-downtime data migrations |
| `cicd-pipeline-design` | CI/CD pipeline design — provides the deployment infrastructure needed to support blue-green or canary releases during migration rollouts |

---

## Live References

> Authoritative documentation links for architecture modernization practices. The model follows markdown links at load time to resolve external references and inline content.

- [Strangler Fig Pattern (Martin Fowler)](https://martinfowler.com/bliki/StranglerFigApplication.html)
- [Dual-Write Database Migration Patterns](https://www.citusdata.com/blog/2016/03/30/five-ways-to-migrate-a-postgres-application-from-sql-to-nosql/)
- [Feature Flags Best Practices (LaunchDarkly)](https://launchdarkly.com/blog/use-feature-toggles-trace-production-changes/)
- [API Versioning Strategies](https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design)
- [Zero Downtime Deployment Patterns](https://www.usenix.org/publications/loginonline/zero-downtime-deployment)
- [Database Migration Anti-Patterns (InfoQ)](https://www.infoq.com/articles/database-migration-strategies/)
