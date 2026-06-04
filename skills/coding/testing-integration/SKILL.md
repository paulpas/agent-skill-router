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
