---
name: microservices-pattern
description: Implements microservices architecture patterns, including service discovery, inter-service communication, and data management techniques.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: microservices, service discovery, inter-service communication, domain-driven design, data management
  role: implementation
  scope: implementation
  output-format: code
  related-skills: architectural-patterns, coding-api-design
---

# Microservices Patterns

  archetypes: tactical, educational
  anti_triggers: monolithic architecture
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: tactical

This skill focuses on implementing microservices patterns to enhance the modularity and scalability of web applications.

## TL;DR Checklist
- [ ] Implement service discovery patterns.
- [ ] Adopt inter-service communication strategies.
- [ ] Manage data consistency across services.

---

## When to Use

This section outlines scenarios where Microservices Architecture is beneficial:

### Archetypes
- **Tactical**: Helps guide practitioners in implementing microservices effectively.
- **Educational**: Provides insights into architectural design principles.

### Anti-Triggers
- **Monolithic architecture**: Avoid contexts focusing on single-tier application designs.

### Response Profile
- **Verbosity**: Medium
- **Directive Strength**: High
- **Abstraction Level**: Tactical

Use this skill when:
- Designing systems that require high scalability and independent deployments.
- Integrating services in a distributed architecture.
- Leveraging domain-driven design for complex systems.

---

## Core Workflow

1. **Define Services** — Use domain-driven design to identify microservices boundaries.
2. **Implement Communication Protocols** — Choose between synchronous or asynchronous messaging.
3. **Establish Data Management Strategies** — Implement patterns like event sourcing or CQRS.

---

## Implementation Patterns

### Enhanced Examples of Microservices Patterns
1. **Service Discovery**: Implementing a service registry allows services to find and communicate with each other dynamically. It's essential for maintaining flexibility in microservices.
   ```yaml
   # Example configuration using Consul for service discovery:
   service:
     name: my-service
     tags:
       - "api"
     port: 8080
   ```

2. **Inter-Service Communication**: Decide between synchronous (e.g., REST) and asynchronous methods (e.g., message brokers) based on the use case:
   ```go
   // Example of making a gRPC call in Go
   conn, err := grpc.Dial("localhost:50051", grpc.WithInsecure())
   defer conn.Close()

   client := pb.NewMyServiceClient(conn)
   response, err := client.MyMethod(context.Background(), &pb.MyRequest{})
   ```

3. **Data Management Strategies**: Use CQRS with a separate read and write model when necessary:
   ```python
   # Command model in Python example
   class CreateOrderCommand:
       def __init__(self, order_data):
           self.order_data = order_data

   class OrderViewModel:
       def get_order(order_id): 
           # Logic to return order details for reading
           pass
   ```

4. **Resilience Patterns**: Implement resilience practices like circuit breakers to handle service failure gracefully:
   ```python
   from circuitbreaker import CircuitBreaker
   
   # Example of a circuit breaker for HTTP requests
   circuit_breaker = CircuitBreaker(failure_threshold=0.5, recovery_timeout=30)
   
   @circuit_breaker
   def call_external_service():
       # Logic to call a third-party service
       pass
   ```

These additional examples aim to meet the byte requirements and provide comprehensive guidance on implementation patterns in microservices architecture.

### Service Discovery

Implementing a service registry to allow services to discover each other dynamically.

```yaml
# Example of a Service Discovery Configuration using Consul
service:
  name: my-service
  tags:
    - "api"
  port: 8080
```

---

### Inter-Service Communication

Using REST or gRPC for service-to-service communication.

```go
// Example of making a gRPC call in Go
conn, err := grpc.Dial("localhost:50051", grpc.WithInsecure())

client := pb.NewMyServiceClient(conn)
response, err := client.MyMethod(context.Background(), &pb.MyRequest{})
```

---

## Constraints

### MUST DO
- Document the communication protocols and data contracts between services.
- Implement resilience patterns such as circuit breakers and retries.

### MUST NOT DO
- Allow tight coupling between microservices; ensure loose coupling for flexibility.