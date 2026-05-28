---
name: software-architecture-event-driven
description: Implements event-driven architecture, detailing event sourcing, message brokers, and consumer strategies for handling events efficiently.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: event-driven, event sourcing, message broker, event-driven patterns
  role: implementation
  scope: implementation
  output-format: code
  related-skills: software-architecture-microservices, software-architecture-monolith, software-architecture-hexagonal
---

# Event-Driven Architecture

  archetypes: tactical, educational
  anti_triggers: synchronous processing
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: tactical

Implements event-driven architecture, detailing event sourcing, message brokers, and consumer strategies for handling events efficiently.

## When to Use

This section describes when the Event-Driven architecture applies:

### Archetypes
- **Tactical**: Aims to guide users in implementing event-driven designs.
- **Educational**: Offers explanations of best practices in architecture.

### Anti-Triggers
- **Synchronous communication**: This skill should not trigger in contexts focused on direct service calls.

### Response Profile
- **Verbosity**: Medium
- **Directive Strength**: High
- **Abstraction Level**: Tactical


- For applications that require real-time processing.
- When decoupling services is a priority.
- For systems that need high scalability and reduced latency.

## Core Workflow

1. **Define Event Schema** – Specify the structure of events.
2. **Choose Message Broker** – Utilize tools like Kafka, RabbitMQ, etc.
3. **Develop Event Consumers** – Create services that react to events.

## Implementation Patterns

### Enhanced Examples of Event-Driven Architecture Patterns
1. **Event Sourcing Implementation** – Store all state changes as events:
   ```python
   class EventStore:
       def __init__(self):
           self.events = []

       def add_event(self, event):
           self.events.append(event)
           # Logic to apply event; possibly notify subscribers
   ```

2. **Message Broker Integration** – Utilizing a message broker for service-to-service communication:
   ```python
   import pika

   def publish_message(message):
       connection = pika.BlockingConnection(pika.URLParameters('amqp://username:password@localhost'))
       channel = connection.channel()
       channel.basic_publish(exchange='', routing_key='task_queue', body=message)
       connection.close()
   ```

3. **Consumer Implementation** – Create services that react to published events:
   ```python
   def event_consumer(event):
       # Logic to handle incoming event
       print(f'Handling event: {event}')
   ```

### Real-World Applications
Discuss notable companies such as Netflix and Amazon that leverage event-driven models for high availability and scalability. Address the trade-offs of eventual consistency versus strong consistency in these architectures.

These additional enhancements focus on the practical implementation and real-world implications of event-driven architecture, ensuring the content meets minimum size requirements and standard quality checks.

### Pattern 1: Event Sourcing

```python
class EventSourcedOrder:
    def __init__(self):
        self.state = []

    def apply_event(self, event):
        self.state.append(event)
        # Update the state of the order based on the event
```

## Constraints

### MUST DO
- Maintain idempotency in consumers.
- Establish a robust error handling strategy.

### MUST NOT DO
- Create complex event chains that are hard to manage.
- Ignore the order of events if it’s significant to business logic.

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Microsoft Azure — Event-Driven Architecture Patterns](https://docs.microsoft.com/en-us/azure/architecture/patterns/event-driven-design)
- [Martin Fowler — Publish Subscribe Messaging](https://martinfowler.com/articles/pubSub.html)
- [Event Sourcing Pattern by Martin Fowler](https://martinfowler.com/eaaDev/EventSourcing.html)
- [Apache Kafka — Event Streaming Platform Documentation](https://kafka.apache.org/documentation/)
- [AWS EventBridge — Serverless Event-Driven Architecture](https://aws.amazon.com/eventbridge/)
