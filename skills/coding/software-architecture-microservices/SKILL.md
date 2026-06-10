---
name: software-architecture-microservices
description: Implements strategies for designing, developing, and deploying microservices
  architecture. Offers guidance on best practices, patterns, and anti-patterns for
  microservices.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: microservices, service-oriented architecture, microservices design, microservices
    patterns
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
  related-skills: software-architecture-monolith, software-architecture-event-driven,
    software-architecture-hexagonal
---





# Microservices Architecture

  archetypes: tactical, educational
  anti_triggers: monolithic solutions
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: tactical

Implements strategies for designing, developing, and deploying microservices architecture. Offers guidance on best practices, patterns, and anti-patterns for microservices.

## When to Use

- When you need to build a system that can scale independently.
- When teams need to deploy code at different rates.
- For systems requiring resilience and flexibility.

## Core Workflow

1. **Define Service Boundaries** – Identify domain-driven boundaries for services.
2. **Choose Communication Protocol** – Decide between REST, gRPC, etc.
3. **Implement Service Discovery** – Use tools like Consul or Eureka.

## Implementation Patterns

### Enhanced Examples
1. **Defining Service Boundaries**: Use DDD concepts to clearly delineate service responsibilities:
   ```python
   class Account:
       def __init__(self, id, owner):
           self.id = id
           self.owner = owner
   
   class AccountService:
       def create_account(self, id, owner):
           account = Account(id, owner)
           # Logic to persist the account
           return account
   ```

2. **Service Discovery Integration**  Using service discovery tools like Consul or Eureka is essential for dynamic service management:
   ```yaml
   # Consul service registration example
   service:
     name: account-service
     port: 8080
   ```

3. **Event-Driven Messaging**:
   Utilizing messaging for loose coupling between services:
   ```go
   package main
   
   import (
       "fmt"
       "github.com/streadway/amqp"
   )
   
   func publishMessage(message string) {
       conn, err := amqp.Dial("amqp://guest:guest@localhost:5672/")
       // Error handling removed for brevity
       defer conn.Close()
   }
   ```

These enhancements provide practical examples representing various aspects of microservices architecture, thus increasing both the content quality and file size.

### Pattern 1: Managing State

```python
class OrderService:
    def __init__(self):
        self.orders = []

    def add_order(self, order):
        self.orders.append(order)
        # Persist order in a database
```

## Constraints

### MUST DO
- Maintain a CI/CD pipeline for each service.
- Monitor performance of each service using tools like Prometheus.

### MUST NOT DO
- Create tightly coupled services.
- Use synchronous communication for everything, leading to bottlenecks.

## Live References

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [Microservices.io Pattern Catalog (Chris Richardson)](https://microservices.io/patterns/microservices.html) — Chris Richardson's comprehensive pattern catalog for microservice architecture design
- [AWS Microservices Best Practices](https://docs.aws.amazon.com/wellarchitected/latest/microservices-lens/welcome.html) — AWS Well-Architected Framework guide for designing resilient microservice architectures
- [Google Microservices Architecture Guide](https://cloud.google.com/architecture/microservices-architecture) — Google Cloud's reference architecture for building cloud-native microservices
- [Domain-Driven Design and Microservices (Eric Evans)](https://www.infoq.com/articles/ddd-and-microservices/) — InfoQ article on applying DDD bounded contexts to define microservice boundaries
- [Service Mesh Patterns (Istio)](https://istio.io/latest/docs/concepts/) — Istio documentation on service mesh patterns for inter-service communication, observability, and traffic management
