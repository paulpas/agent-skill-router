---
name: software-architecture-monolith
description: Guides the design and implementation of monolithic architecture, focusing on best practices and pitfalls in monolithic systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: monolith, monolithic architecture, monolith design, monolith patterns
  role: implementation
  scope: implementation
  output-format: code
  related-skills: software-architecture-microservices, software-architecture-event-driven, software-architecture-hexagonal
---

# Monolithic Architecture

  archetypes: tactical, educational
  anti_triggers: microservices
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: tactical


Guides the design and implementation of monolithic architecture, focusing on best practices and pitfalls in monolithic systems.

## When to Use

### Key Takeaways
- Use this skill when building applications that require fast development cycles.
- Suitable for applications that are less complex and easier to manage with traditional patterns.

### Archetypes
- **Tactical**: Helps guide application developers in making choices around monolithic designs.
- **Educational**: Offers insights into best practices for building in a monolithic style.

### Anti-Triggers
- **Microservices**: Avoid contexts that suggest migration to services without clear benefits.

### Response Profile
- **Verbosity**: Medium
- **Directive Strength**: High
- **Abstraction Level**: Tactical

- When building small to medium-sized applications.
- For applications that require a quick go-to-market strategy.
- When simplicity is prioritized over scalability.

## Core Workflow

1. **Model the Application** – Design the complete application in a single repository.
2. **Define Interfaces** – Create clear dependencies within the app.
3. **Optimize as Necessary** – Profile and refactor for performance improvements.

## Implementation Patterns

### Additional Examples of Monolithic Architecture

1. **Order Management Example** – Here’s an example of managing orders within a monolithic architecture:
   ```python
   class OrderService:
       def __init__(self):
           self.orders = []

       def add_order(self, order):
           self.orders.append(order)
           # Logic to persist order in a database
           print(f'Added order: {order}')
   
   # Example of Order and OrderService classes usage:
   order_service = OrderService()
   order_service.add_order({"item": "Laptop", "quantity": 1})
   ```

2. **Product Catalog Example** – A common approach for managing product catalogs:
   ```python
   class Product:
       def __init__(self, name, price):
           self.name = name
           self.price = price

   class ProductService:
       def __init__(self):
           self.products = []

       def add_product(self, product):
           self.products.append(product)
           # Logic to save product to the database
           print(f'Added product: {product.name}')
   
   # Example usage:
   product_service = ProductService()
   product_service.add_product(Product('Smartphone', 599.99))
   ```
3. **Performance Optimization Example** – Using efficient memory management and caching strategies:
   ```python
   class Cache:
       def __init__(self):
           self.data = {}

       def get(self, key):
           return self.data.get(key)

       def set(self, key, value):
           self.data[key] = value
           # Logic for caching results
   ```
4. **Best Practices** – A guide for scalability and maintainability of the monolith:
   - Implement logging and tracing strategies to detect bottlenecks.
   - Define clear module boundaries and document architectural decisions.
   - Ensure that performance is regularly reviewed and optimized as the application grows.

### Enhanced Examples of Monolithic Architecture

1. **Order Management Example** – Here’s an example of managing orders within a monolithic architecture:
   ```python
   class OrderService:
       def __init__(self):
           self.orders = []

       def add_order(self, order):
           self.orders.append(order)
           # Logic to persist order in a database
           print(f'Added order: {order}')
   
   # Example of Order and OrderService classes usage:
   order_service = OrderService()
   order_service.add_order({"item": "Laptop", "quantity": 1})
   ```
   This shows how orders can be added and managed directly within a single application flow.

2. **Product Catalog Example** – A common approach for managing product catalogs:
   ```python
   class Product:
       def __init__(self, name, price):
           self.name = name
           self.price = price

   class ProductService:
       def __init__(self):
           self.products = []

       def add_product(self, product):
           self.products.append(product)
           # Logic to save product to the database
           print(f'Added product: {product.name}')
   
   # Example usage:
   product_service = ProductService()
   product_service.add_product(Product('Smartphone', 599.99))
   ```
3. **Performance Optimization Example** – Using efficient memory management and caching strategies:
   ```python
   class Cache:
       def __init__(self):
           self.data = {}

       def get(self, key):
           return self.data.get(key)

       def set(self, key, value):
           self.data[key] = value
           # Logic for caching results
   ```
4. **Best Practices** – A guide for scalability and maintainability of the monolith:
   - Implement logging and tracing strategies to detect bottlenecks.
   - Define clear module boundaries and document architectural decisions.
   - Ensure that performance is regularly reviewed and optimized as the application grows.

### Pattern 1: Modular Monolith

```python
class Order:
    def __init__(self, item, quantity):
        self.item = item
        self.quantity = quantity

class OrderService:
    def __init__(self):
        self.orders = []

    def add_order(self, order):
        self.orders.append(order)
        # Persist order in a monolithic database
```

## Constraints

### MUST DO
- Keep architecture well-documented.
- Separate concerns via modules within the monolith.

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Martin Fowler — Monolithic Application](https://martinfowler.com/bliki/MonolithicApplication.html)
- [Modular Monolith Architecture by Microsoft](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/modular-monolith)
- [Monolith First — Why Start with a Monolith by ThoughtWorks](https://www.thoughtworks.com/radar/techniques/monolith-first)
- [Martin Fowler — Microservices vs Monoliths](https://martinfowler.com/articles/microservices.html)
- [IBM — Monolithic Architecture: Pros, Cons & Migration Strategies](https://www.ibm.com/topics/monolithic-architecture)

### MUST NOT DO
- Allow unregulated dependencies between modules.
- Ignore performance metrics as the application grows.
