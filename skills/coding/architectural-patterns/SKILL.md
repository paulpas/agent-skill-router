---
name: architectural-patterns
description: Provides a thorough overview of software architectural patterns, including layers, microservices, event-driven architectures, and more.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: architectural patterns, microservices, event-driven, service-oriented architecture, layered architecture
  role: reference
  scope: implementation
  output-format: code
  related-skills: coding-design-principles, coding-software-engineering-basics
---

# Architectural Patterns Overview

  archetypes: tactical, strategic, educational
  anti_triggers: vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational

This skill outlines various software architectural patterns, offering guidelines for their implementation and use cases.

## TL;DR Checklist
- [ ] Understand the differences between architectural patterns.
- [ ] Identify scenarios to apply specific patterns.
- [ ] Know best practices for architectural implementation.

---

## When to Use

Use this skill when:
- Designing software architectures for new applications.
- Reviewing existing architectural choices.
- Exploring trade-offs between different patterns.

---

## Core Workflow

1. **Select an Architectural Pattern** — Assessing project requirements to choose the appropriate architecture.
2. **Document the Architecture** — Creating diagrams and documentation to illustrate how components interact.
3. **Implement and Review** — Building out the architecture with a focus on scalability, maintainability, and performance.

---

## Implementation Patterns

This section outlines examples of various software architectural patterns, their implementations:

### Layered Architecture
- Layered architecture separates concerns into different layers, allowing for easier maintenance and scalability.

```python
# Example of a layered architecture implementation in Python
class Service:
    def __init__(self, repository):
        self.repository = repository

    def get_data(self):
        return self.repository.get_data()
```

### Microservices Architecture
- Microservices architecture breaks applications down into smaller, independent services.

```javascript
// Example of a simple microservice using Node.js and Express
const express = require('express');
const app = express();

app.get('/api/data', (req, res) => {
    // Fetch data from service
    res.json({ message: 'Data from microservice' });
});
```

### Event-Driven Architecture
- Event-driven architecture enables services to react to real-time events for dynamic systems.

```go
// Example of an Event-Driven service in Go
package main

import (
    "fmt"
)

func main() {
    // Event handling logic
    fmt.Println("Event handled")
}
```

### Best Practices
- Always document your architectural choices thoroughly.
- Consider future scalability during the design phase.

### Layered Architecture

Layered architecture separates concerns into different layers, allowing for easier maintenance and scalability.

```python
# Example of a layered architecture implementation in Python
class Service:
    def __init__(self, repository):
        self.repository = repository

    def get_data(self):
        return self.repository.get_data()
```

---

### Microservices Architecture

Microservices architecture breaks applications down into smaller, independent services.

```javascript
// Example of a simple microservice using Node.js and Express
const express = require('express');
const app = express();

app.get('/api/data', (req, res) => {
    // Fetch data from service
    res.json({ message: 'Data from microservice' });
});
```

---

## Constraints

### MUST DO
- Always document architecture decisions and trade-offs made during design.
- Use interfaces for communication between components in microservices.

### MUST NOT DO
- Use a one-size-fits-all approach to architecture; always tailor to specific needs.

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Enterprise Architecture Patterns (Martin Fowler)](https://martinfowler.com/eaaDev/)
- [Software Architecture Patterns — GeeksforGeeks](https://www.geeksforgeeks.org/software-engineering-architectural-design-patterns-in-software-engineering-set-1/)
- [AWS Well-Architected Framework](https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html)
- [Microsoft Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/)
- [Fundamentals of Software Architecture (O'Reilly)](https://www.oreilly.com/library/view/fundamentals-of-software/9781492993457/)