---




name: integration-testing-patterns
description: Implements integration testing strategies (database, HTTP API, event-driven, message queue) with test isolation, fixture management, and real infrastructure validation for production-quality software systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: integration testing, API testing, database integration, test container, fixture management, contract testing, system boundary testing, service integration
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  archetypes: [tactical, generation]
  anti_triggers: [brainstorming, pure unit testing, mock everything, black box testing]
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: testing-unit-integration-e2e, rest-api-testing, software-testing-strategy




---





# Integration Testing Patterns

Implements integration tests that exercise real system boundaries — databases, HTTP endpoints, message queues, and event-driven pipelines — using test containers, fixture factories, and deterministic teardown. Produces pytest-based suites with typed fixtures, explicit infrastructure lifecycle management, and isolated test data that prevents cross-test pollution.

## TL;DR Checklist

- [ ] Use testcontainers or in-memory alternatives for every external dependency (PostgreSQL, Redis, Kafka)
- [ ] Declare shared fixtures at the module scope — never spawn a new container per test function
- [ ] Seed fresh data inside each test via transaction rollback or dedicated cleanup hooks
- [ ] Assert on side effects (database rows written, messages published, HTTP callbacks received), not just return values
- [ ] Mark long-running integration tests with `pytest.mark.integration` for selective CI execution
- [ ] Verify container health checks pass before any test code executes against them

---

## When to Use

Use this skill when:

- Testing that a FastAPI endpoint correctly persists data through PostgreSQL — the real database must be involved, not an ORM mock
- Validating that a message consumer deserializes events from Kafka and writes results to both a database and a cache
- Verifying HTTP API interactions between two services in the same deployment (e.g., gateway → microservice → datastore)
- Building pre-deployment validation suites that run against real infrastructure replicas before releasing to staging
- Debugging a "works locally, fails in CI" issue that traces back to database constraints or race conditions

---

## When NOT to Use

Avoid this skill for:

- Pure unit testing of business logic without external dependencies — use `testing-unit-integration-e2e` instead
- Validating API response schemas against an OpenAPI spec — use `rest-api-testing` instead
- End-to-end browser automation (Selenium/Playwright) that simulates real user journeys — this skill covers programmatic system boundaries, not UI flows

---

## Core Workflow

1. **Identify System Boundaries** — Map every external dependency your component interacts with: databases, caches, message brokers, HTTP services. List each as a node in an ASCII diagram so you can scope the test suite precisely.
   **Checkpoint:** Confirm every boundary has either a real container image available or a documented fallback (e.g., SQLite for PostgreSQL).

2. **Set Up Test Infrastructure** — Configure testcontainers for each external dependency with deterministic networking. Use Docker Compose files when multiple containers share the same network namespace, so services can resolve each other by hostname. Spin up infrastructure once per module, not per test.
   **Checkpoint:** Run `docker inspect` on each container to verify it responds to health checks. Confirm ports are forwarded to host-visible addresses.

3. **Create Shared Fixtures** — Declare fixtures at module scope (`module` or `session` lifecycle) for resources that are expensive to create: database connections, container groups, HTTP clients pre-wired to the test network. Use autouse fixtures for setup/teardown logic that must run regardless of test outcome.
   **Checkpoint:** Verify fixture teardown runs even when a test fails — wrap cleanup in `try/finally` blocks.

4. **Seed and Isolate Test Data** — Each test starts with a clean slate. Use database transactions wrapped in `autouse` fixtures that rollback after each test, or truncate tables via dedicated cleanup functions. Never leave stale data between tests; cross-test contamination is the #1 cause of flaky integration suites.
   **Checkpoint:** Run two identical tests back-to-back — if the second one fails because of data left by the first, isolation is broken.

5. **Exercise System Boundaries** — Write test functions that call real endpoints or query real databases. For HTTP integration: create an ASGI/WSGI test client pointed at your app's root and fire real requests through the full middleware stack. For database integration: use your actual ORM (SQLAlchemy, Prisma) against the containerized database. Assert on observable side effects — row counts, event emissions, callback invocations.
   **Checkpoint:** Confirm each test would fail if a critical component was swapped out or removed.

6. **Validate Error Paths** — Every integration boundary must be tested with invalid inputs, timeout scenarios, and degraded service conditions. Mock downstream dependencies at the network layer (e.g., return 503 from a fake HTTP service) to verify your system's resilience behavior under failure.
   **Checkpoint:** Verify retry logic actually executes retries by counting calls to the mocked dependency.

7. **Teardown Infrastructure** — Ensure containers are destroyed, temporary files removed, and network namespaces cleaned up. Use pytest hooks (`pytest_unconfigure`) or a session-scoped autouse fixture with explicit cleanup. Never rely on garbage collection for resource teardown.
   **Checkpoint:** After running the full test suite, verify no orphaned containers remain: `docker ps --filter name=apptest` should return empty.

---

## Implementation Patterns

### Pattern 1: Database Integration Testing (testcontainers + SQLAlchemy)

Tests that your application layer correctly persists, queries, and transforms data against a real PostgreSQL database running in a testcontainer. Uses transaction-scoped fixtures so each test starts with a clean database state.

```python
# ❌ BAD — Using an in-memory SQLite for tests on a PostgreSQL production database
# This hides PostgreSQL-specific behavior: case-insensitive LIKE, UUID handling,
# JSONB operators, array types, and constraint enforcement differ between engines.

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session


@pytest.fixture()
def db_session_bad():
    engine = create_engine("sqlite:///:memory:")  # Wrong database entirely!
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    return session
```

```python
# ✅ GOOD — Real PostgreSQL in a testcontainer with transaction-scoped isolation
import pytest
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from testcontainers.postgres import PostgresContainer
from typing import Generator


Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id: int = Column(Integer, primary_key=True, autoincrement=True)
    email: str = Column(String(255), nullable=False, unique=True)
    display_name: str = Column(String(100))


@pytest.fixture(scope="module")
def postgres_container() -> Generator[PostgresContainer, None, None]:
    """Start a single PostgreSQL container shared across the test module."""
    container = PostgresContainer("postgres:16-alpine")
    container.start()
    yield container
    container.stop()


@pytest.fixture(scope="module")
def engine(postgres_container: PostgresContainer):
    """Create an engine pointing at the test PostgreSQL instance."""
    url = postgres_container.get_connection_url()
    eng = create_engine(url, pool_pre_ping=True)
    Base.metadata.create_all(eng)
    yield eng
    eng.dispose()


@pytest.fixture()
def db_session(engine: object) -> Generator[Session, None, None]:
    """Provide a transactional session that rolls back after each test."""
    SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
    session = SessionLocal()

    # Begin a transaction and create savepoints — rollback discards all changes
    conn = engine.connect()
    tx = conn.begin()
    session.begin_nested()

    yield session

    # Cleanup: rollback the nested transaction (discards test data),
    # then rollback the outer transaction, then close the connection.
    try:
        session.rollback()
        tx.rollback()
        conn.close()
    finally:
        session.close()


def test_create_user_persists_to_real_database(
    db_session: Session, postgres_container: PostgresContainer
) -> None:
    """Verify a user record is stored in the real PostgreSQL container."""
    from sqlalchemy import select

    new_user = User(email="alice@example.com", display_name="Alice")
    db_session.add(new_user)
    db_session.commit()

    result = db_session.execute(select(User).where(User.email == "alice@example.com"))
    fetched = result.scalar_one()

    assert fetched.display_name == "Alice"
    assert fetched.id is not None  # Confirms auto-increment worked on PostgreSQL
```

---

### Pattern 2: HTTP API Integration Testing (Real Endpoint, Not Mocked)

Tests a FastAPI application by firing real HTTP requests through its complete middleware stack — authentication, validation, serialization, database access — against test containers. No mock servers, no stubbed endpoints.

```python
# ❌ BAD — Mocking the entire FastAPI app or using a fake response generator
# This tests nothing about your actual routing, middleware, or database integration.

import pytest


@pytest.fixture()
def mock_api_client_bad():
    """Returns a dict instead of making real HTTP requests."""
    return {"status": 200, "body": {"id": 1}}


def test_get_user_bad(mock_api_client_bad):
    response = mock_api_client_bad
    assert response["status"] == 200  # Mocks don't catch broken routing
```

```python
# ✅ GOOD — Real ASGI test client against a running FastAPI app with real DB
import pytest
from fastapi import FastAPI, Depends, HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from testcontainers.postgres import PostgresContainer
from typing import Generator


Base = declarative_base()


class Item(Base):
    __tablename__ = "items"

    id: int = Column(Integer, primary_key=True, autoincrement=True)
    name: str = Column(String(100), nullable=False)
    price: float = Column(Float, nullable=False)


# --- Application code (what you're testing) ---

def get_db_session() -> Generator[Session, None, None]:
    """Dependency injection for the database session."""
    from app.db import SessionLocal
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


app = FastAPI()


@app.post("/items/", status_code=201)
def create_item(name: str, price: float, db: Session = Depends(get_db_session)):
    """Create a new item and persist it to the database."""
    item = Item(name=name, price=price)
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"id": item.id, "name": item.name, "price": item.price}


@app.get("/items/{item_id}")
def get_item(item_id: int, db: Session = Depends(get_db_session)):
    """Retrieve an existing item by ID."""
    item = db.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"id": item.id, "name": item.name, "price": item.price}


# --- Integration test fixtures ---

@pytest.fixture(scope="module")
def postgres_container() -> Generator[PostgresContainer, None, None]:
    container = PostgresContainer("postgres:16-alpine")
    container.start()
    yield container
    container.stop()


@pytest.fixture(scope="module")
def engine(postgres_container: PostgresContainer):
    url = postgres_container.get_connection_url()
    eng = create_engine(url, pool_pre_ping=True)
    Base.metadata.create_all(eng)
    yield eng
    eng.dispose()


@pytest.fixture()
def db_session(engine):
    SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
    session = SessionLocal()
    conn = engine.connect()
    tx = conn.begin()
    yield session
    try:
        session.rollback()
        tx.rollback()
        conn.close()
    finally:
        session.close()


@pytest.fixture()
def test_app(engine, db_session):
    """Override the database dependency for the FastAPI app under test."""
    from unittest.mock import patch

    def get_mock_db():
        yield db_session

    # Patch the dependency so the app uses our transactional DB fixture
    with patch("app.main.get_db_session", get_mock_db):
        yield app


# --- Integration tests ---

def test_create_item_via_http(test_app, db_session) -> None:
    """Fire a real POST request through FastAPI's middleware and assert DB side effects."""
    client = TestClient(test_app)
    response = client.post("/items/", json={"name": "Widget", "price": 9.99})

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Widget"
    assert body["price"] == 9.99
    assert body["id"] is not None

    # Verify side effect: item actually persisted in the real database
    from app.models import Item
    stored = db_session.get(Item, body["id"])
    assert stored is not None
    assert stored.name == "Widget"


def test_get_nonexistent_item_returns_404(test_app) -> None:
    """Assert proper HTTP error response for missing resources."""
    client = TestClient(test_app)
    response = client.get("/items/9999")

    assert response.status_code == 404
    body = response.json()
    assert "detail" in body
```

---

### Pattern 3: Event-Driven System Integration Testing

Tests that a producer correctly publishes messages to Kafka (or an equivalent broker), and a consumer deserializes, processes, and persists the results. Uses a real message broker in a testcontainer with deterministic event injection.

```python
# ❌ BAD — Mocking the message broker so no real serialization or delivery occurs
import pytest


class FakeProducer:
    def send(self, topic: str, key: str, value: dict) -> None:
        pass  # Does nothing — doesn't test actual message formatting or delivery


def test_order_placed_bad():
    producer = FakeProducer()
    producer.send("orders", "order-123", {"item": "book"})
    # No assertion possible — the fake swallows everything silently
```

```python
# ✅ GOOD — Real Kafka container with consumer group isolation and event verification
import json
import time
from typing import Generator

import pytest
from kafka import KafkaConsumer, KafkaProducer
from testcontainers.kafka import KafkaContainer


@pytest.fixture(scope="module")
def kafka_container() -> Generator[KafkaContainer, None, None]:
    """Start a single Kafka broker shared across the integration test module."""
    container = KafkaContainer("confluentinc/cp-kafka:7.6.0")
    container.start()
    yield container
    container.stop()


@pytest.fixture()
def producer(kafka_container: KafkaContainer):
    """Create a KafkaProducer connected to the test broker."""
    bootstrap = kafka_container.get_bootstrap_server()
    prod = KafkaProducer(
        bootstrap_servers=[bootstrap],
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        acks="all",  # Require all replicas to acknowledge — tests real delivery
    )
    yield prod
    prod.close()


@pytest.fixture()
def consumer(kafka_container: KafkaContainer):
    """Create a KafkaConsumer with an isolated group ID for deterministic polling."""
    bootstrap = kafka_container.get_bootstrap_server()
    consumer = KafkaConsumer(
        "orders",
        bootstrap_servers=[bootstrap],
        group_id=f"integration-test-group-{pytest.worker_id}",
        auto_offset_reset="earliest",
        value_deserializer=lambda m: json.loads(m.decode("utf-8")),
        enable_auto_commit=False,
    )
    yield consumer
    consumer.close()


def test_order_flow_end_to_end(
    producer: KafkaProducer,
    consumer: KafkaConsumer,
) -> None:
    """Verify an order message is published, delivered, and deserialized correctly."""
    # Arrange: define the event payload that a real application would produce
    order_payload = {
        "order_id": "ORD-2024-0042",
        "customer_email": "buyer@example.com",
        "items": [{"sku": "BOOK-123", "quantity": 2, "price": 14.99}],
        "total": 29.98,
    }

    # Act: publish the message and confirm it reaches the broker
    future = producer.send("orders", key="ORD-2024-0042", value=order_payload)
    record_metadata = future.get(timeout=10)  # Wait for broker acknowledgment

    # Assert: message was delivered to the correct partition
    assert record_metadata.topic == "orders"
    assert record_metadata.partition >= 0

    # Poll for the consumed message and verify deserialization
    messages = consumer.poll(timeout_ms=5000, max_records=1)

    # KafkaConsumer.poll() returns {topic: [RecordBatch]}
    batch = messages.get("orders", [])
    assert len(batch) == 1

    consumed_event = batch[0].value
    assert consumed_event["order_id"] == "ORD-2024-0042"
    assert consumed_event["total"] == 29.98
    assert len(consumed_event["items"]) == 1

    # Verify the consumer committed the offset (acknowledged processing)
    consumer.commit()


def test_producer_handles_serialization_error(kafka_container: KafkaContainer) -> None:
    """Confirm the producer raises on unserializable payloads — a common production bug."""
    prod = KafkaProducer(
        bootstrap_servers=[kafka_container.get_bootstrap_server()],
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        acks="all",
    )

    with pytest.raises(TypeError):
        # datetime objects are not JSON-serializable — this should fail before sending
        prod.send("orders", key="test", value={"timestamp": time.gmtime()})

    prod.close()
```

---

## Constraints

### MUST DO

- Use testcontainers or equivalent real infrastructure for every external dependency — never swap databases per environment
- Mark integration tests with `pytest.mark.integration` so CI can run them selectively on a separate schedule
- Scope expensive fixtures (containers, database connections) to `module`, never `function`
- Roll back or truncate all data after each test to prevent cross-test contamination
- Assert on observable side effects (database rows, published messages, HTTP callbacks), not just return values
- Use typed function signatures and docstrings for every test function and fixture
- Verify container health checks pass before any test code executes against them

### MUST NOT DO

- Mock an entire external dependency and then claim it is an "integration" test — that is a unit test in disguise
- Use `time.sleep()` to wait for infrastructure readiness — use explicit retries with exponential backoff or built-in health check polling
- Leave orphaned containers after the test suite runs — always implement teardown in fixture finalizers
- Share mutable state between tests through global variables or module-level side effects
- Test more than one logical boundary per test function (e.g., don't test database writes AND message publishing in the same assertion)
- Hardcode port numbers instead of letting containers assign them dynamically at runtime

---

## Output Template

When implementing integration tests for a system component, produce:

1. **Infrastructure Diagram** — ASCII art showing all external dependencies and their connections (e.g., `App → PostgreSQL` with container names)
2. **Fixture Hierarchy** — List every fixture with its scope (`function`, `module`, `session`) and which resources it creates or depends on
3. **Test Functions** — Typed test functions organized by boundary: one section for database integration, one for HTTP API, one for message queues. Each must include both a success path and an error path assertion
4. **Teardown Verification** — Confirmation that all containers are stopped, ports released, and no orphaned resources remain after suite completion

---

## Related Skills

| Skill | Purpose |
|---|---|
| `testing-unit-integration-e2e` | Comprehensive testing strategy covering the full test pyramid and when to use each layer |
| `rest-api-testing` | Deep focus on REST API endpoint testing including contract validation, idempotency checks, and schema verification |
| `software-testing-strategy` | Higher-level planning for test architecture, coverage goals, and CI pipeline design |

---

## Live References

> Authoritative documentation links for integration testing in Python. The model follows markdown links at load time to resolve external references and inline content.

- [testcontainers-python Documentation](https://testcontainers-python.readthedocs.io/en/latest/)
- [pytest Fixtures — Official Guide](https://docs.pytest.org/en/stable/explanation/fixtures.html)
- [FastAPI Test Client — API Reference](https://fastapi.tiangolo.com/#example-api-tests)
- [Kafka Python Library (kafka-python-ng)](https://kafka-python-ng.readthedocs.io/en/latest/)
- [SQLAlchemy 2.0 Core/ORM Tutorial](https://docs.sqlalchemy.org/en/20/core/tutorial.html)
- [Database Transaction Isolation Levels — PostgreSQL Docs](https://www.postgresql.org/docs/current/transaction-iso.html)
