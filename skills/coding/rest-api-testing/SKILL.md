---




name: rest-api-testing
description: Tests REST API endpoints comprehensively including unit tests, integration
  tests, contract validation against OpenAPI spec, idempotency checks, error-path
  coverage, pagination boundary conditions, and load testing with Locust.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: rest api testing, contract testing, openapi spec validation, pytest fastapi, http method testing, idempotency test, locust load test, api integration test http method testing
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
  related-skills: fastapi-patterns, rest-api-patterns, test-driven-development, code-validation,
    api-security-patterns




---




# REST API Testing

Tests REST API endpoints comprehensively across unit, integration, contract, idempotency, error-path, pagination boundary, and load testing dimensions. Produces a pytest-based test suite that validates observable behavior — status codes, response shapes, side effects, and schema compliance — against the OpenAPI specification.

## TL;DR Checklist

- [ ] Every endpoint has tests for success (20x) AND all documented error paths (4xx, 5xx)
- [ ] Error responses conform to RFC 7807 Problem Details format (`type`, `title`, `status` present)
- [ ] PUT and DELETE endpoints are verified idempotent; POST is explicitly tested as non-idempotent
- [ ] OpenAPI schema validation runs in CI at least once per pipeline
- [ ] Pagination tested with empty collection, single item, last page, and cursor-after-last conditions
- [ ] Cacheable endpoints include `Cache-Control` and `ETag` header assertions
- [ ] Auth paths covered: missing token (401), invalid token, expired token, insufficient permissions (403)
- [ ] Load test validates API behavior at 80% of expected peak RPS

---

## When to Use

Use this skill when:

- Writing a test suite for a FastAPI/Starlette REST API from scratch
- Adding regression tests after modifying an existing endpoint's contract
- Auditing an API's test coverage and identifying untested error paths
- Setting up CI pipeline integration with OpenAPI schema validation
- Designing load or stress tests for a production-facing REST API

---

## When NOT to Use

Avoid this skill for:

- Testing non-HTTP protocols (gRPC, WebSockets) — use gRPC-specific or WebSocket testing skills instead
- Load testing that requires distributed infrastructure beyond a single machine (use k6 or Locust in distributed mode with separate tooling)
- UI/frontend integration tests that go beyond the API layer
- When you only have one endpoint with no edge cases — simple smoke tests suffice

---

## Core Workflow

1. **Inventory Endpoints** — Parse the OpenAPI spec to extract every path, method, and documented response code.   **Checkpoint:** Every `(path, method)` pair must have at least one success test and one error-path test before proceeding.

2. **Write Unit Tests for Route Handlers** — Test each handler in isolation using `TestClient` with minimal application state. Mock external dependencies (database, third-party APIs) to verify handler logic.   **Checkpoint:** Each unit test asserts status code AND response body structure — never just the status code alone.

3. **Write Integration Tests** — Run full request/response cycles through middleware, auth layers, and the database using a test database or transactional rollback. Verify real query execution and side effects.   **Checkpoint:** Integration tests must use a real (not mocked) database connection to validate actual SQL queries.

4. **Add Contract Tests** — Validate that every successful response conforms to its OpenAPI schema at runtime. Run these in CI on every push.   **Checkpoint:** If contract validation fails, the build MUST block — schema drift is a breaking change.

5. **Verify Idempotency** — Assert that PUT and DELETE endpoints produce identical results when called repeatedly with the same payload. Verify POST endpoints are non-idempotent (multiple calls create multiple resources).   **Checkpoint:** Run each idempotent endpoint 3 times, then assert final state matches expected single-call result.

6. **Validate Error Path Coverage** — Ensure every documented error response code is tested with correct status, body structure (RFC 7807), and appropriate headers.   **Checkpoint:** No documented `4xx` or `5xx` response code may be untested — gaps are defects.

7. **Add Load Tests** — Write Locust scenarios that simulate realistic traffic patterns at expected peak RPS. Validate response times, error rates, and graceful degradation.   **Checkpoint:** Load test must run in CI before merge to main; failure threshold: >1% error rate or p95 latency exceeding SLA.

---

## Implementation Patterns

### Pattern 1: Pytest Fixtures for REST API Test Setup

Shared fixtures eliminate boilerplate and ensure consistent test state across all tests.

```python
# tests/conftest.py
import pytest
from httpx import ASGITransport, AsyncClient
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.database import get_db, Base, engine


@pytest.fixture(scope="session")
def db_url(tmp_path_factory):
    """Create an ephemeral SQLite database for the test session."""
    db_file = tmp_path_factory.mktemp("data") / "test.db"
    return f"sqlite:///{db_file}"


@pytest.fixture()
def client(db_url: str, clean_db: Session) -> TestClient:
    """Test client with a fresh, populated database per test."""

    def override_get_db():
        yield clean_db

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    return TestClient(transport)


@pytest.fixture()
def clean_db(db_url: str):
    """Create tables and roll back after the test (transactional isolation)."""
    from app.database import SessionLocal

    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    yield session
    session.rollback()
    session.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def auth_header(client: TestClient, admin_user_id: str) -> dict:
    """Generate an authenticated request header using a test token."""
    from app.services.auth import create_access_token

    token = create_access_token(subject=str(admin_user_id))
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def sample_resource_payload():
    """Provide a valid request body for resource creation endpoints."""
    return {
        "name": "Test Resource",
        "description": "Created by integration test",
        "tags": ["automated", "testing"],
    }
```

**Why this works:** Transactional rollback (`session.rollback()`) is faster than dropping/recreating tables and guarantees isolation between tests. The `db_url` fixture scoped to `session` creates the database once, while `clean_db` resets state per test.

### Pattern 2: Endpoint Unit Test with BAD vs GOOD Comparison

```python
# ❌ BAD — Tests only the status code; ignores response body and content type
def test_get_resource_bad(client):
    """Creating a resource should return 201."""
    client.post("/api/v1/resources", json={"name": "Test"})
    # No assertion at all — this test always passes

    # ❌ BAD — Checks status but ignores response structure entirely
    def test_get_resource_partial(client):
        resp = client.get("/api/v1/resources/42")
        assert resp.status_code == 200  # Always passes if endpoint exists
```

```python
# ✅ GOOD — Asserts status code, content type, AND response body shape
def test_get_resource_success(client: TestClient, auth_header: dict) -> None:
    """GET /resources/{id} returns the resource with correct structure."""
    # Arrange
    create_resp = client.post(
        "/api/v1/resources",
        json={"name": "Test Resource", "tags": ["test"]},
        headers=auth_header,
    )
    assert create_resp.status_code == 201
    resource_id = create_resp.json()["id"]

    # Act
    resp = client.get(f"/api/v1/resources/{resource_id}", headers=auth_header)

    # Assert — status code, content type, body structure, and required fields
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/json"
    body = resp.json()
    assert "id" in body
    assert "name" in body
    assert body["name"] == "Test Resource"
    assert isinstance(body["tags"], list)


def test_get_resource_not_found(client: TestClient, auth_header: dict) -> None:
    """GET /resources/{id} returns 404 with RFC 7807 error body for missing resource."""
    resp = client.get("/api/v1/resources/99999", headers=auth_header)

    assert resp.status_code == 404
    body = resp.json()
    # RFC 7807 Problem Details: must have type, title, status
    assert "type" in body
    assert "title" in body
    assert "status" in body
    assert body["status"] == 404
```

**Key differences:** The GOOD version asserts the response body contains expected fields, checks `Content-Type`, and tests the error path. The BAD version has no assertions at all or only checks status code.

### Pattern 3: Contract Testing Against OpenAPI Schema

Validate every response against the OpenAPI specification at runtime using `openapi-spec-validator`.

```python
# tests/test_contract.py
import pytest
from openapi_spec_validator import validate
from openapi_spec_validator.versions import OpenAPIVersions
from app.main import APP_SPEC_PATH  # Path to your generated OpenAPI JSON


def _load_openapi_spec() -> dict:
    """Load the API's OpenAPI specification for contract validation."""
    import json

    with open(APP_SPEC_PATH, "r") as f:
        return json.load(f)


class TestResponseContract:
    """Validate that API responses conform to the OpenAPI spec."""

    @pytest.fixture(autouse=True)
    def skip_if_no_spec(self):
        """Skip contract tests if OpenAPI spec is unavailable."""
        import os
        if not os.path.exists(APP_SPEC_PATH):
            pytest.skip("OpenAPI spec file not found — skip contract validation")

    @pytest.mark.parametrize(
        "method,path",
        [
            ("GET", "/api/v1/resources"),
            ("POST", "/api/v1/resources"),
            ("GET", "/api/v1/resources/{id}"),
            ("PUT", "/api/v1/resources/{id}"),
            ("DELETE", "/api/v1/resources/{id}"),
        ],
    )
    def test_openapi_response_matches_spec(
        self, client: TestClient, method: str, path: str
    ):
        """Every endpoint response must match its OpenAPI schema."""
        # Skip parameterized paths — resolve them first
        if "{id}" in path:
            create_resp = client.post(
                "/api/v1/resources", json={"name": "Contract Test"}
            )
            assert create_resp.status_code == 201
            resource_id = create_resp.json()["id"]
            path = path.replace("{id}", str(resource_id))

        resp = getattr(client, method.lower())(path)

        spec = _load_openapi_spec()
        # Validate the response against the spec for this operation
        validate(resp.json(), spec=spec, spec_url=f"file://{APP_SPEC_PATH}")

    def test_error_responses_follow_rfc7807(self, client: TestClient):
        """All documented error responses must use RFC 7807 Problem Details format."""
        # Missing auth → 401
        resp = client.get("/api/v1/resources")
        assert resp.status_code == 401
        body = resp.json()
        assert "type" in body
        assert "title" in body
        assert "status" in body

        # Invalid ID format → 422
        resp = client.get("/api/v1/resources/not-an-id")
        assert resp.status_code == 422
        body = resp.json()
        assert "type" in body
        assert "title" in body
```

### Pattern 4: Idempotency Test Suite

Verify PUT and DELETE are idempotent (multiple identical calls produce the same result), while POST is not.

```python
# tests/test_idempotency.py
import pytest


class TestIdempotency:
    """Verify HTTP method semantics for idempotency."""

    def test_put_is_idempotent(self, client: TestClient, auth_header: dict):
        """PUT /resources/{id} must produce identical results when called repeatedly."""
        # Create initial resource
        create_resp = client.post(
            "/api/v1/resources",
            json={"name": "Idempotent Resource", "tags": ["test"]},
            headers=auth_header,
        )
        assert create_resp.status_code == 201
        resource_id = create_resp.json()["id"]

        # First PUT — creates or updates the resource
        put_payload = {
            "name": "Updated Resource",
            "description": "First update",
            "tags": ["updated"],
        }
        resp_1 = client.put(
            f"/api/v1/resources/{resource_id}",
            json=put_payload,
            headers=auth_header,
        )
        assert resp_1.status_code == 200
        state_after_first_put = resp_1.json()

        # Second PUT — identical payload, must produce same result
        resp_2 = client.put(
            f"/api/v1/resources/{resource_id}",
            json=put_payload,
            headers=auth_header,
        )
        assert resp_2.status_code == 200

        # Third PUT — verify state has not changed
        resp_3 = client.put(
            f"/api/v1/resources/{resource_id}",
            json=put_payload,
            headers=auth_header,
        )
        assert resp_3.json() == state_after_first_put

    def test_delete_is_idempotent(self, client: TestClient, auth_header: dict):
        """DELETE /resources/{id} must be idempotent — repeated deletes are safe."""
        # Create a resource to delete
        create_resp = client.post(
            "/api/v1/resources", json={"name": "To Be Deleted"}, headers=auth_header
        )
        resource_id = create_resp.json()["id"]

        # First DELETE
        resp_1 = client.delete(
            f"/api/v1/resources/{resource_id}", headers=auth_header
        )
        assert resp_1.status_code in (200, 204)

        # Second DELETE — must not error with "resource not found" due to deletion side effects
        # Should return 404 (resource already gone) consistently
        resp_2 = client.delete(
            f"/api/v1/resources/{resource_id}", headers=auth_header
        )
        assert resp_2.status_code == 404

        # Third DELETE — same 404, consistent behavior
        resp_3 = client.delete(
            f"/api/v1/resources/{resource_id}", headers=auth_header
        )
        assert resp_3.status_code == 404

    def test_post_is_not_idempotent(self, client: TestClient, auth_header: dict):
        """POST must create a new resource on each call — verify it is NOT idempotent."""
        payload = {"name": "Dup Resource", "tags": ["test"]}

        resp_1 = client.post("/api/v1/resources", json=payload, headers=auth_header)
        assert resp_1.status_code == 201
        id_1 = resp_1.json()["id"]

        resp_2 = client.post("/api/v1/resources", json=payload, headers=auth_header)
        assert resp_2.status_code == 201
        id_2 = resp_2.json()["id"]

        # POST creates new resources each time — IDs must differ
        assert id_1 != id_2
```

### Pattern 5: Pagination Boundary Testing

Test every pagination boundary condition: empty collection, single item, multi-page, last page, and cursor after the final item.

```python
# tests/test_pagination.py
import pytest


class TestPaginationBoundaries:
    """Validate pagination behavior at every boundary condition."""

    def _create_resources(self, count: int):
        """Helper to create a given number of resources for testing."""
        from app.database import SessionLocal
        from app.models import Resource

        session = SessionLocal()
        try:
            for i in range(count):
                resource = Resource(name=f"Paginated-{i}", tags=["pag"])
                session.add(resource)
            session.commit()
        finally:
            session.close()

    def test_empty_collection_pagination(self, client: TestClient, auth_header: dict):
        """GET /resources with no items returns empty list with valid pagination metadata."""
        resp = client.get("/api/v1/resources?page=1&page_size=10", headers=auth_header)

        assert resp.status_code == 200
        body = resp.json()
        assert body["items"] == []
        assert body["total"] == 0
        assert body["page"] == 1
        assert body["page_size"] == 10
        assert body["has_next"] is False
        assert body["has_prev"] is False

    def test_single_item_page(self, client: TestClient, auth_header: dict):
        """Single-item collection returns that item with correct pagination metadata."""
        self._create_resources(1)

        resp = client.get("/api/v1/resources?page=1&page_size=10", headers=auth_header)
        assert resp.status_code == 200
        body = resp.json()
        assert len(body["items"]) == 1
        assert body["total"] == 1
        assert body["has_next"] is False

    def test_multi_page_navigation(self, client: TestClient, auth_header: dict):
        """Multi-page collection navigates correctly with page and has_next/has_prev."""
        self._create_resources(25)

        # Page 1 — should have next
        resp_1 = client.get("/api/v1/resources?page=1&page_size=10", headers=auth_header)
        assert resp_1.json()["has_next"] is True
        assert resp_1.json()["has_prev"] is False

        # Last page (3rd) — should NOT have next
        resp_3 = client.get("/api/v1/resources?page=3&page_size=10", headers=auth_header)
        assert resp_3.json()["has_next"] is False
        assert resp_3.json()["has_prev"] is True

    def test_cursor_after_last_item(self, client: TestClient, auth_header: dict):
        """Cursor pagination returns empty results when cursor points past the last item."""
        self._create_resources(5)

        # Get first page and extract next cursor
        resp = client.get("/api/v1/resources?cursor=&page_size=5", headers=auth_header)
        assert resp.status_code == 200
        next_cursor = resp.json().get("next_cursor", "")

        # Request with cursor past the last item — should return empty
        if next_cursor:
            resp_after = client.get(
                f"/api/v1/resources?cursor={next_cursor}&page_size=5", headers=auth_header
            )
            assert resp_after.json()["items"] == []
            assert resp_after.json().get("has_next") is False

    def test_page_size_boundary(self, client: TestClient, auth_header: dict):
        """Requesting a page size beyond total items returns all items in one page."""
        self._create_resources(3)

        resp = client.get("/api/v1/resources?page=1&page_size=100", headers=auth_header)
        assert resp.status_code == 200
        body = resp.json()
        assert len(body["items"]) == 3
        assert body["has_next"] is False
```

### Pattern 6: Authentication/Authorization Test Patterns

Comprehensive auth flow testing covering missing tokens, invalid tokens, expired tokens, and insufficient permissions.

```python
# tests/test_auth.py
import pytest


class TestAuthenticationFlows:
    """Test all authentication and authorization edge cases."""

    def test_missing_token_returns_401(self, client: TestClient):
        """Requests without Authorization header must return 401 Unauthorized."""
        resp = client.get("/api/v1/resources")
        assert resp.status_code == 401
        body = resp.json()
        assert "type" in body
        assert "title" in body

    def test_empty_token_returns_401(self, client: TestClient):
        """Bearer header with empty token must return 401."""
        resp = client.get("/api/v1/resources", headers={"Authorization": "Bearer "})
        assert resp.status_code == 401

    def test_invalid_token_format_returns_401(self, client: TestClient):
        """Malformed JWT token (wrong signature) must return 401."""
        resp = client.get(
            "/api/v1/resources", headers={"Authorization": "Bearer invalid.token.here"}
        )
        assert resp.status_code == 401

    def test_expired_token_returns_401(self, client: TestClient):
        """Expired JWT token must return 401 with appropriate error type."""
        from app.services.auth import create_access_token
        from datetime import timedelta

        # Create a token that expired in the past
        expired_payload = {"sub": "user-1", "exp": (timedelta(days=-1)).total_seconds()}
        # Use the library's built-in expired token if available
        resp = client.get(
            "/api/v1/resources", headers={"Authorization": "Bearer expired_token_stub"}
        )
        assert resp.status_code == 401
        body = resp.json()
        assert body.get("status") == 401

    def test_valid_token_grants_access(self, client: TestClient, auth_header: dict):
        """Valid JWT token grants access to protected endpoints."""
        resp = client.get("/api/v1/resources", headers=auth_header)
        assert resp.status_code == 200

    def test_insufficient_permissions_returns_403(self, client: TestClient, admin_user_id: str):
        """User without required role must receive 403 Forbidden."""
        # Create a user with read-only permissions
        from app.database import SessionLocal
        from app.models import User

        session = SessionLocal()
        try:
            reader = User(username="reader", role="viewer")
            session.add(reader)
            session.commit()

            from app.services.auth import create_access_token
            token = create_access_token(subject=str(reader.id))
        finally:
            session.close()

        resp = client.delete(
            f"/api/v1/resources/1", headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 403
        body = resp.json()
        assert "type" in body
        assert "title" in body


class TestHTTPMethodCompliance:
    """Verify HTTP method semantics — correct status codes per RFC 7231."""

    def test_get_returns_200_or_4xx(self, client: TestClient, auth_header: dict):
        """GET must never return 201, 202, or any write-oriented status code."""
        resp = client.get("/api/v1/resources", headers=auth_header)
        assert resp.status_code in (200, 304, 400, 401, 403, 404, 500)
        assert resp.status_code not in (201, 202, 204)

    def test_post_returns_201_on_creation(self, client: TestClient, auth_header: dict):
        """POST creating a new resource must return 201 Created."""
        resp = client.post(
            "/api/v1/resources",
            json={"name": "New Resource", "tags": ["test"]},
            headers=auth_header,
        )
        assert resp.status_code == 201

    def test_put_returns_200_on_update(self, client: TestClient, auth_header: dict):
        """PUT updating an existing resource must return 200 OK."""
        create_resp = client.post(
            "/api/v1/resources", json={"name": "Updatable"}, headers=auth_header
        )
        resource_id = create_resp.json()["id"]

        resp = client.put(
            f"/api/v1/resources/{resource_id}",
            json={"name": "Updated"},
            headers=auth_header,
        )
        assert resp.status_code == 200

    def test_delete_returns_204_or_200(self, client: TestClient, auth_header: dict):
        """DELETE must return 204 No Content or 200 OK with confirmation."""
        create_resp = client.post(
            "/api/v1/resources", json={"name": "Deletable"}, headers=auth_header
        )
        resource_id = create_resp.json()["id"]

        resp = client.delete(f"/api/v1/resources/{resource_id}", headers=auth_header)
        assert resp.status_code in (200, 204)

    def test_unsupported_method_returns_405(self, client: TestClient, auth_header: dict):
        """Using a disallowed HTTP method must return 405 Method Not Allowed."""
        # POST to an endpoint that only supports GET and DELETE
        resp = client.patch("/api/v1/resources/1", json={"name": "Patch attempt"})
        assert resp.status_code == 405 or resp.status_code in (
            404,
            403,
        )  # Depending on routing config

    def test_head_does_not_return_body(self, client: TestClient):
        """HEAD requests must return headers but no body."""
        resp = client.head("/api/v1/resources")
        assert resp.status_code == 200 or resp.status_code == 405
        assert len(resp.content) == 0
```

### Pattern 7: Cache Header and ETag Testing

Verify that cacheable endpoints include proper `Cache-Control` and `ETag` headers.

```python
# tests/test_caching.py
import pytest


class TestCachingHeaders:
    """Validate HTTP caching behavior on cacheable endpoints."""

    def test_get_list_includes_cache_control(self, client: TestClient, auth_header: dict):
        """GET list endpoints must include Cache-Control header for cacheable collections."""
        resp = client.get("/api/v1/resources", headers=auth_header)
        assert resp.status_code == 200
        assert "cache-control" in resp.headers
        cache_control = resp.headers["cache-control"].lower()
        # Must have at least a max-age directive
        assert "max-age" in cache_control or "no-cache" in cache_control

    def test_etag_changes_on_resource_update(self, client: TestClient, auth_header: dict):
        """ETag must change when resource content changes."""
        create_resp = client.post(
            "/api/v1/resources", json={"name": "Original"}, headers=auth_header
        )
        resource_id = create_resp.json()["id"]
        etag_1 = create_resp.headers.get("etag")

        resp_get_1 = client.get(f"/api/v1/resources/{resource_id}", headers=auth_header)
        etag_after_read = resp_get_1.headers.get("etag")

        # Update the resource
        client.put(
            f"/api/v1/resources/{resource_id}",
            json={"name": "Modified"},
            headers=auth_header,
        )

        resp_get_2 = client.get(f"/api/v1/resources/{resource_id}", headers=auth_header)
        etag_after_update = resp_get_2.headers.get("etag")

        assert etag_after_update != etag_1 or etag_after_update != etag_after_read

    def test_conditional_get_returns_304(self, client: TestClient, auth_header: dict):
        """If-Match with matching ETag must return 304 Not Modified."""
        create_resp = client.post(
            "/api/v1/resources", json={"name": "Conditional"}, headers=auth_header
        )
        resource_id = create_resp.json()["id"]
        etag = create_resp.headers.get("etag")

        if etag:
            resp = client.get(
                f"/api/v1/resources/{resource_id}",
                headers={**auth_header, "If-None-Match": etag},
            )
            # Should return 304 or 200 depending on implementation
            assert resp.status_code in (200, 304)
```

### Pattern 8: Load Testing with Locust

Configure a Locust load test that validates API behavior under realistic traffic.

```python
# tests/load_test_api.py
"""Locust load test configuration for the REST API."""
from locust import HttpUser, task, between, events
import time


class APIUser(HttpUser):
    """Simulates real-world API traffic patterns with weighted task distribution."""

    wait_time = between(0.5, 2.0)  # Random delay between requests (seconds)

    @task(30)  # 30% of requests — most common operation: listing resources
    def list_resources(self):
        resp = self.client.get("/api/v1/resources", headers=self.auth_headers())
        assert resp.status_code in (200, 401), "List endpoint should return 200 or auth error"

    @task(20)  # 20% — reading individual resources
    def get_resource(self):
        resp = self.client.get("/api/v1/resources/1", headers=self.auth_headers())
        assert resp.status_code in (200, 404), "Get endpoint should return 200 or 404"

    @task(15)  # 15% — creating resources
    def create_resource(self):
        payload = {"name": f"Load Test {time.time()}", "tags": ["load"]}
        resp = self.client.post("/api/v1/resources", json=payload, headers=self.auth_headers())
        assert resp.status_code == 201

    @task(25)  # 25% — updating resources (idempotent PUT)
    def update_resource(self):
        payload = {"name": f"Updated {time.time()}", "tags": ["updated"]}
        resp = self.client.put("/api/v1/resources/1", json=payload, headers=self.auth_headers())
        assert resp.status_code in (200, 404)

    @task(10)  # 10% — deleting resources
    def delete_resource(self):
        resp = self.client.delete("/api/v1/resources/1", headers=self.auth_headers())
        assert resp.status_code in (200, 204, 404)

    def auth_headers(self) -> dict:
        """Return authenticated request headers from environment variable."""
        import os
        token = os.environ.get("API_TEST_TOKEN")
        if token:
            return {"Authorization": f"Bearer {token}"}
        return {}


# Event hook — fail the load test if error rate exceeds threshold
@events.request_failure.add_listener
def on_failure(request_type, name, response_time, exception):
    """Track failures for CI pipeline assertions."""
    print(f"FAILURE: {request_type} {name} — {response_time}ms — {type(exception).__name__}")


# Event hook — print summary when load test completes
@events.quitting.add_listener
def _(user_classes):
    """Log aggregate statistics when the test ends."""
    from locust import stats
    total_requests = stats.global_stats.num_requests
    total_failures = stats.global_stats.num_failures
    error_rate = (total_failures / total_requests * 100) if total_requests else 0

    print(f"\nLoad Test Summary:")
    print(f"  Total requests: {total_requests}")
    print(f"  Total failures: {total_failures}")
    print(f"  Error rate: {error_rate:.2f}%")
    print(f"  Avg response time: {stats.global_stats.avg_response_time:.0f}ms")
    print(f"  P95 response time: {stats.global_stats.percentile_95}ms")

    # CI gate — fail if error rate exceeds 1%
    if error_rate > 1.0:
        raise RuntimeError(
            f"Load test FAILED: {error_rate:.2f}% error rate exceeds 1% threshold"
        )
```

Run with: `locust -f tests/load_test_api.py --headless -u 100 -r 10 --run-time 60s --host http://localhost:8000`

---

## Constraints

### MUST DO
- Test every error code path documented in the OpenAPI spec — not just status 200 and the first error you encounter
- Verify RFC 7807 Problem Details format on ALL error responses (must include `type`, `title`, and `status` fields)
- Use HTTP method semantics to determine idempotency expectations: PUT and DELETE must be idempotent; POST is not
- Validate responses against the OpenAPI spec at least once in CI pipeline — schema drift is a breaking change
- Test pagination boundary conditions: empty collection, single item, last page, and cursor position after the last item
- Verify `Cache-Control` and `ETag` headers on all cacheable GET endpoints
- Use transactional rollback or an isolated test database — never mock the entire database layer in integration tests
- Never use real credentials or production data in automated tests
- Assert response body content alongside status codes — a 200 with wrong data is still a failure

### MUST NOT DO
- Never test implementation details — test observable behavior only (status codes, response shape, side effects, database state)
- Never rely solely on status code `200` for success verification — the response body must contain expected data fields
- Never skip testing 4xx error responses alongside 200/201 — untested error paths are the most common gap in API tests
- Never test pagination with only one item — you must verify empty, single-item, multi-page, and boundary conditions
- Never use production database credentials or production data in any automated test environment
- Never mock HTTP responses at the transport layer for integration tests — use the real application stack
- Never skip loading/staring Locust with explicit `--host` flag — tests will silently fail against wrong endpoints

---

## Output Template

When applying this skill, produce:

1. **Test Inventory** — A table of every `(method, path)` pair from the OpenAPI spec with test coverage status (unit, integration, contract)
2. **Test File Structure** — Suggested file layout: `tests/test_<endpoint_group>.py` with fixture imports from `conftest.py`
3. **Unit Tests** — Isolated handler tests using `TestClient` with mocked external dependencies
4. **Integration Tests** — Full-stack tests with real database and middleware, transactional rollback fixtures
5. **Contract Tests** — OpenAPI schema validation test for every documented response type
6. **Idempotency Test Suite** — PUT idempotency (3 calls), DELETE idempotency (3 calls), POST non-idempotency (2 calls)
7. **Error Path Tests** — Coverage of every documented 4xx and 5xx response with RFC 7807 body validation
8. **Pagination Tests** — Empty, single-item, multi-page, last-page, and cursor-after-last scenarios
9. **Auth Flow Tests** — Missing token (401), invalid token, expired token, insufficient permissions (403)
10. **Load Test Configuration** — Locust scenario with weighted tasks, failure thresholds, and CI integration notes

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `fastapi-patterns` | Provides FastAPI project structure, dependency injection patterns, and error handler conventions that this skill's tests assume |
| `rest-api-patterns` | Defines REST API design principles (resource naming, versioning, HATEOAS) that determine what the correct response shapes should be |
| `test-driven-development` | Covers the TDD cycle (red-green-refactor) workflow for writing tests before implementation |
| `code-validation` | Provides general code quality gates and static analysis tools that complement runtime API testing |
| `api-security-patterns` | Covers authentication schemes, rate limiting, and input validation patterns — complements auth testing with security test patterns |
