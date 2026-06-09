---




name: testing-integration
description: Executes integration tests to validate combined components and their interactions in a system, ensuring workflows operate seamlessly.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: integration testing, integration tests, system testing, workflows
  role: implementation
  scope: implementation
  output-format: code
  related-skills: testing-unit, testing-contract, testing-end-to-end
  archetypes: tactical, diagnostic
  anti_triggers: unit testing, manual testing, load testing
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: tactical




---





# Integration Testing

Implement integration testing to ensure that different modules or services within an application work together as expected. Focus on testing the flow of data and control between modules.

## When to Use
- When multiple components or services interact.
- To validate interactions between third-party services and your application.
- Before deploying to production environments as a safeguard for feature integrations.

## Core Workflow
1. **Select Integration Testing Framework**  
   Use a testing framework suitable for integration tests (e.g., `Postman` for APIs, `Jest` for Node.js).
   ```bash
   # For Node.js
   npm install jest --save-dev
   ```
2. **Create Test Suites**  
    Develop suites that define the interactions to be tested.
    ```javascript
    const request = require('supertest');
    const app = require('../app');
    
    describe('API Integration Tests', () => {
        it('should return 200 on valid request', async () => {
            const response = await request(app).get('/api/data');
            expect(response.statusCode).toBe(200);
        });
    });
    ```
3. **Run Tests and Analyze Results**  
   Execute integration tests and review results for accuracy and performance.
   ```bash
   npm test
   ```
4. **Fix Integration Issues**  
   If any tests fail, modify your code or configurations to resolve issues, then re-test.

## Implementation Patterns
### Pattern 1: Using Jest for API Testing  
```javascript
const request = require('supertest');
const app = require('../app');

describe('GET /api/users', () => {
    it('responds with json', async () => {
        const res = await request(app)
            .get('/api/users')
            .expect('Content-Type', /json/)
            .expect(200);
        expect(res.body).toHaveProperty('users');
    });
});
```

---

## TL;DR for Code Generation

- **Test real dependencies, not mocks** — Integration tests should exercise actual databases, APIs, and message queues. Mock only external third-party services you don't control.
- **Use transactions for database isolation** — Wrap each integration test in a database transaction and roll back after the test to keep state clean between runs.
- **Prefer HTTP-level API testing** — Send real HTTP requests (using `httpx` or `supertest`) rather than calling controller functions directly — this validates routing, middleware, and serialization.
- **Cover error paths too** — Test what happens when a service returns 500, a database times out, or a message queue is unreachable.
- **Keep integration tests separate from unit tests** — Use distinct directories (`tests/integration/` vs `tests/unit/`) and separate CI jobs to run them at different cadences.

---

## Implementation Patterns

### Pattern 2: Using Pytest with HTTPX for API Integration Tests

Python's `httpx` library pairs naturally with pytest for HTTP-level integration testing:

```python
import pytest
import httpx

BASE_URL = "http://localhost:8000"

@pytest.fixture
async def client():
    """Provide an async HTTP client for integration tests."""
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        yield client

@pytest.mark.asyncio
async def test_get_users_returns_200(client: httpx.AsyncClient):
    """Verify GET /api/users returns a list of users."""
    response = await client.get("/api/users")
    
    assert response.status_code == 200
    data = response.json()
    assert "users" in data
    assert isinstance(data["users"], list)

@pytest.mark.asyncio
async def test_create_user_persists_data(client: httpx.AsyncClient):
    """Verify POST /api/users creates and returns a new user."""
    payload = {"name": "Alice", "email": "alice@example.com"}
    response = await client.post("/api/users", json=payload)
    
    assert response.status_code == 201
    created = response.json()
    assert created["name"] == "Alice"
    assert created["id"] is not None

@pytest.mark.asyncio
async def test_get_nonexistent_user_returns_404(client: httpx.AsyncClient):
    """Verify 404 for a non-existent user ID."""
    response = await client.get("/api/users/99999")
    assert response.status_code == 404
```

## Constraints
### MUST DO
- Ensure that all modules are tested in isolation before integration.
- Validate that all expected data formats and states are handled appropriately.

### MUST NOT DO
- Combine too many tests into one suite to avoid confusion.
- Neglect to test error scenarios along with successful workflows.

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [pytest Documentation — Integration Testing](https://docs.pytest.org/en/stable/usage.html#integration-testing)
- [pytest Fixtures for Test Setup](https://docs.pytest.org/en/stable/explanation/fixtures.html)
- [Integration Testing Best Practices (Guru99)](https://www.guru99.com/integration-testing.html)
- [Pytest HTTPX for API Integration Tests](https://docs.pytest.org/en/stable/how-to/asyncio.html)
- [Testing Microservices — End-to-End vs Integration](https://www.testim.io/blog/the-difference-between-unit-integration-and-e2e-tests/)
