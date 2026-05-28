---
name: testing-end-to-end
description: Facilitates end-to-end testing of complete workflows, verifying entire systems operate as intended from a user's perspective.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: end-to-end testing, e2e tests, user journey, complete workflow
  role: implementation
  scope: implementation
  output-format: code
  related-skills: testing-unit, testing-integration, testing-contract
---

# End-to-End Testing

Implements end-to-end (E2E) testing strategies to verify that all components of a system work together from the user's perspective. Focus on complete workflows and user journeys.

## When to Use
- When deploying new features that significantly alter user experiences.
- To ensure that critical workflows function correctly after each deployment.
- When integrating new services or APIs into existing applications.

## Core Workflow
1. **Select a Testing Framework**  
   Choose an E2E testing framework that suits your tech stack (e.g., `Cypress`, `Selenium`).
   ```bash
   # For Cypress
   npm install cypress --save-dev
   ```
2. **Write Test Scenarios**  
   Develop scenarios that reflect user journeys.
   ```javascript
   describe('User Journey', () => {
       it('should complete a purchase', () => {
           cy.visit('/');
           cy.get('input[name=username]').type('User');
           cy.get('input[name=password]').type('Password');
           cy.get('button[type=submit]').click();
           cy.url().should('include', '/dashboard');
       });
   });
   ```
3. **Execute E2E Tests**  
   Run the tests to confirm they pass across the application stack.
   ```bash
   npx cypress open
   ```
4. **Review and Fix**  
   Investigate and fix any failing tests, ensuring end-to-end functionality.

## Implementation Patterns
### Pattern 1: Using Cypress for User Journeys
```javascript
describe('End-to-End Testing Example', () => {
    it('should allow a user to sign up and log in', () => {
        cy.visit('/signup');
        cy.get('input[name=email]').type('test@example.com');
        cy.get('input[name=password]').type('password');
        cy.get('form').submit();
        cy.url().should('include', '/welcome');
    });
});
```

## Constraints
### MUST DO
- Include tests for every major workflow in the application.
- Consider both happy paths and edge cases in your testing.

### MUST NOT DO
- Skip essential flows; every critical component must be validated through E2E tests.
- Neglect to keep test environments updated.

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Playwright Official Documentation](https://playwright.dev/)
- [Playwright Python API Reference](https://playwright.dev/python/docs/api/class-playwright)
- [Selenium WebDriver — Getting Started](https://www.selenium.dev/documentation/webdriver/)
- [Selenium Browser Automation Guide](https://www.selenium.dev/documentation/selenium_grid/)
- [End-to-End Testing Best Practices (Google)](https://web.dev/articles/e2e-testing-best-practices)