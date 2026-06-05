---




name: testing-contract
description: Validates external APIs and service contracts, ensuring that your application correctly consumes and produces expected data structures.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: contract testing, service contracts, API contracts, contract validation
  role: implementation
  scope: implementation
  output-format: code
  related-skills: testing-unit, testing-integration, testing-end-to-end




---





# Contract Testing

Implements contract testing methods to validate the agreements between application services and external APIs. Ensure both the consumer and provider follow specified contracts like data formats and structures.

## When to Use
- When your application relies on third-party services.
- To ensure that changes in API specifications do not break your application.
- Before deployment to avoid runtime issues caused by contract violations.

## Core Workflow
1. **Choose Contract Testing Tool**  
   Select a framework tailored for contract testing (e.g., `Pact`, `Hoverfly`).
   ```bash
   # For JavaScript
   npm install @pact-foundation/pact
   ```
2. **Define Consumer and Provider Contracts**  
   Define what your service expects from external APIs.
   ```javascript
   const { Pact } = require('@pact-foundation/pact');
   const provider = new Pact({
       consumer: "YourService",
       provider: "ExternalAPI"
   });
   provider
       .uponReceiving('a request for data')
       .withRequest('GET', '/data')
       .willRespondWith({
           status: 200,
           body: { message: "Success" }
       });
   ```
3. **Run Contract Tests**  
   Execute the contract tests and ensure compliance with expectations.
   ```bash
   npm test
   ```
4. **Handle Contract Violations**  
   Repair code or update your contracts as necessary based on your test results.

## Implementation Patterns
### Pattern 1: Using Pact for Consumer-Driven Contracts
```javascript
const { Pact } = require('@pact-foundation/pact');

describe('Pact with Our API', () => {
    const provider = new Pact({
        consumer: 'Consumer',
        provider: 'APIProvider',
    });
    
    beforeAll(() => provider.setup());
    
    it('it should return a successful response', async () => {
        // Arrange
        await provider.addInteraction({
            state: 'data exists',
            uponReceiving: 'a request for data',
            withRequest: { method: 'GET', path: '/data' },
            willRespondWith: { status: 200, body: { message: 'Success' } },
        });
        
        // Act
        const response = await fetch('http://localhost:3000/data');
        const body = await response.json();

        // Assert
        expect(body.message).toEqual('Success');
    });

    afterAll(() => provider.finalize());
});
```

## Constraints
### MUST DO
- Regularly update contracts and documentation to reflect changes.
- Ensure that the API service is functional before running contract tests.

### MUST NOT DO
- Bypass contract tests; they are essential for integration continuity.
- Assume defaults; always explicitly define contracts.