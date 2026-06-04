---




name: software-architecture-hexagonal
description: Guides the implementation of hexagonal (ports and adapters) architecture, focusing on best practices for decoupling business logic from external concerns.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: hexagonal architecture, ports and adapters, hexagonal design patterns
  role: implementation
  scope: implementation
  output-format: code
  related-skills: software-architecture-microservices, software-architecture-monolith, software-architecture-event-driven




---





# Hexagonal Architecture

  archetypes: tactical, educational
  anti_triggers: tightly coupled design
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: tactical

Guides the implementation of hexagonal (ports and adapters) architecture, focusing on best practices for decoupling business logic from external concerns.

## When to Use

- When you need a flexible architecture that accommodates changes easily.
- For applications with complex domain logic.
- When you need to integrate multiple external systems.

## Core Workflow

1. **Define the Domain Model** – Centralize your core domain logic.
2. **Establish Ports** – Create interfaces for external services and applications.
3. **Implement Adapters** – Build adapters to connect the domain to outside technology.

## Implementation Patterns

### Enhanced Examples of Hexagonal Architecture
1. **Core Domain Logic Implementation**:
   ```python
   # Example demonstrating core domain logic separate from infrastructure
   class Account:
       def __init__(self, id, balance):
           self.id = id
           self.balance = balance

   class AccountService:
       def __init__(self, repository):
           self.repository = repository

       def create_account(self, id, initial_balance):
           account = Account(id, initial_balance)
           self.repository.save(account)
   ```

2. **Establishing Ports and Adapters**:
   ```python
   # Defining an Adapter for external service interactions
   class PaymentProcessor:
       def process_payment(self, account_id, amount):
           # Logic to process payment through an external API
           print(f'Processing payment of {amount} for account {account_id}')
   ```

3. **Integration Example**:
   ```yaml
   # Example showing integration with external services via adapters
   payments:
     url: http://payment-service/api
     description: Service to handle payment processing
   ```

### Real-World Applications
- Discuss examples of how organizations like Netflix and Uber implement hexagonal architecture for scalability and maintainability.
- Provide insights into trade-offs between hexagonal architecture and other architectural styles such as layered architecture or microservices.

### Pattern 1: Central Domain Logic

```python
class Product:
    def __init__(self, name, price):
        self.name = name
        self.price = price

class ProductService:
    def add_product(self, product):
        # Add logic for adding the product
        pass

# Adapter example
class ExternalServiceAdapter:
    def call_service(self):
        # Logic to interact with an external service
        pass
```

## Constraints

### MUST DO
- Ensure clear separations of concerns.
- Use automated tests to validate interactions.

### MUST NOT DO
- Allow direct dependencies from the domain to external services.
- Mix external framework concerns with core logic in the same layer.
