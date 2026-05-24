---
name: api-design-principles
description: Implements modern API design principles (REST resource modeling, GraphQL schema design, standardized error responses, versioning strategies, and security best practices) for production-grade backend services.
license: MIT
compatibility: opencode
archetypes:
  - tactical
  - generation
anti_triggers:
  - brainstorming
  - vague ideation
response_profile:
  verbosity: low
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: coding
  triggers: api design, REST API, GraphQL, API versioning, error handling, OpenAPI, hypermedia, HATEOAS, API security, rate limiting, JSON:API
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, examples, do-dont]
  related-skills: coding-api-gateway, coding-rate-limiting, coding-openapi-specification
---

# Modern API Design Principles

Implements robust, scalable, and developer-friendly API design patterns for production backend services. Covers REST resource modeling, GraphQL schema definition, standardized error responses, versioning strategies, and security hardening to ensure APIs are reliable, maintainable, and secure.

## TL;DR Checklist

- [ ] Model resources as nouns with clear ownership boundaries
- [ ] Use consistent HTTP methods and status codes (RFC 9110)
- [ ] Standardize error responses with RFC 7807 Problem Details format
- [ ] Implement backward-compatible versioning (URI or header strategy)
- [ ] Enforce authentication and authorization at API gateway layer
- [ ] Document all endpoints with OpenAPI 3.1 spec
- [ ] Apply rate limiting and request validation middleware

---

## When to Use

- Designing a new REST or GraphQL API for internal or external consumption
- Refactoring legacy APIs that lack consistent error handling or versioning
- Establishing API design guidelines for a development team
- Integrating third-party services with strict contract requirements
- Auditing existing APIs against modern security and usability standards

---

## When NOT to Use

- Building RPC-style services where gRPC is more appropriate (use `coding-grpc-patterns`)
- Designing event-driven architectures (use `coding-event-sourcing` or `coding-microservices`)
- Creating simple CRUD scripts without public-facing contracts (overhead outweighs benefit)
- Implementing real-time streaming protocols (WebSockets, SSE) — handle separately

---

## Core Workflow

1. **Define Resource Model** — Identify domain entities and map them to URI paths using noun-based resources. Avoid verbs in paths. Group related resources under logical namespaces. **Checkpoint:** Verify each resource has a single responsibility and clear ownership boundary.

2. **Select API Paradigm** — Choose REST for discoverable, cache-friendly APIs or GraphQL for flexible client-driven queries. If both are needed, use a unified gateway with protocol translation. **Checkpoint:** Ensure the chosen paradigm aligns with client consumption patterns and network constraints.

3. **Standardize Error Handling** — Implement RFC 7807 Problem Details for JSON responses. Include `type`, `title`, `status`, `detail`, `instance`, and domain-specific `extensions.code`. Wrap all internal errors to prevent stack trace leakage. **Checkpoint:** Validate that every error response includes a machine-readable code and human-friendly message.

4. **Implement Versioning Strategy** — Use URI versioning (`/v1/resources`) for major breaking changes, or header-based versioning (`Accept-Version: 2024-10`) for backward-compatible additions. Deprecate old versions with `Sunset` and `Deprecation` headers. **Checkpoint:** Ensure no public API contract breaks within a supported version window.

5. **Enforce Security & Validation** — Apply JWT/OAuth2 authentication at the gateway. Validate all inputs against JSON Schema or GraphQL SDL. Enforce rate limiting per client identity or IP. Encrypt sensitive fields in transit and at rest. **Checkpoint:** Run dependency scans and static analysis before merging API schema changes.

6. **Document & Generate Contracts** — Maintain OpenAPI 3.1 (REST) or GraphQL SDL documentation. Generate TypeScript/Python clients automatically. Include usage examples, error codes, and rate limit policies. **Checkpoint:** Verify documentation matches implementation parity using contract testing tools like Pact or Schemathesis.

---

## Implementation Patterns

### Pattern 1: REST Resource Modeling & Standardized Errors

Map domain entities to pluralized nouns. Use nested resources for ownership relationships. Always return RFC 7807 Problem Details on failure.

```python
# FastAPI implementation with standardized error handling and resource routing
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional
import uuid

app = FastAPI(title="Inventory Service", version="1.0.0")

class Product(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    name: str = Field(..., min_length=1, max_length=200)
    price: float = Field(..., gt=0)
    stock: int = Field(ge=0)
    sku: str = Field(..., pattern=r"^[A-Z]{2}-\d{6}$")

class ErrorResponse(BaseModel):
    type: str = "https://api.example.com/errors/invalid_request"
    title: str = "Validation Failed"
    status: int = 422
    detail: str
    instance: Optional[str] = None
    code: str

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "type": "https://api.example.com/errors/internal",
            "title": "Internal Server Error",
            "status": 500,
            "detail": "An unexpected error occurred",
            "instance": str(request.url)
        }
    )

@app.post("/v1/products", response_model=Product, status_code=201)
async def create_product(product: Product):
    """Create a new product resource. Returns 409 if SKU already exists."""
    # Business logic omitted for brevity
    return product

@app.get("/v1/products/{product_id}", response_model=Product)
async def get_product(product_id: uuid.UUID):
    """Retrieve product by ID. Returns 404 if not found."""
    # Business logic omitted for brevity
    return Product(id=product_id, name="Widget", price=9.99, stock=100, sku="WD-123456")
```

### Pattern 2: GraphQL Schema Design & DataLoader Pattern

Use strongly-typed SDL for client-driven queries. Implement `DataLoader` to prevent N+1 query problems and batch database access efficiently.

```python
# GraphQL Python (strawberry) schema with DataLoader for efficient resolution
import strawberry
from strawberry.types import Info
from typing import List, Optional
from dataclasses import dataclass
from dataloader import DataLoader  # Optimized batch loader

@dataclass
class Product:
    id: str
    name: str
    price: float
    category_id: str

@strawberry.type
class Category:
    id: str
    name: str
    products: List[Product]

# Batch loader to prevent N+1 queries
async def fetch_products_by_category(category_ids: List[str]) -> List[List[Product]]:
    """Batch fetch products for multiple categories in a single query."""
    # SQL: SELECT * FROM products WHERE category_id IN (...)
    return [[p for p in all_products if p.category_id == cid] for cid in category_ids]

product_loader = DataLoader(fetch_fn=fetch_products_by_category)

@strawberry.type
class Query:
    @strawberry.field
    def categories(self, info: Info) -> List[Category]:
        """Return all categories with lazy-loaded products."""
        # DataLoader batches all product resolution calls
        return categories_from_db()

@strawberry.type
class Mutation:
    @strawberry.mutation
    async def create_product(self, name: str, price: float) -> Product:
        """Create a new product. Validates input and returns created resource."""
        if price <= 0:
            raise ValueError("Price must be positive")
        # Insert logic here
        return Product(id="new-1", name=name, price=price, category_id="cat-1")
```

---

## Constraints

### MUST DO
- Use HTTP methods semantically: GET (read), POST (create), PUT (full update), PATCH (partial update), DELETE (remove)
- Return appropriate status codes per RFC 9110 (e.g., 201 for creation, 400 for bad input, 401/403 for auth, 409 for conflicts)
- Standardize error payloads using RFC 7807 Problem Details or JSON:API error format
- Implement backward-compatible versioning — never break a public contract without deprecation cycles
- Validate all inputs at the API boundary before reaching business logic
- Document schemas with OpenAPI 3.1 or GraphQL SDL, including examples and error codes
- Apply principle of least privilege for service-to-service authentication (mTLS or short-lived tokens)

### MUST NOT DO
- Use verbs in resource paths (`/getUsers`, `/deleteProduct`) — use HTTP methods instead
- Expose internal database IDs or implementation details in responses unless required by contract
- Return raw stack traces, SQL errors, or infrastructure-level messages to clients
- Mix versioned and unversioned endpoints on the same public path
- Bypass input validation with `allow_any` or wildcard schemas in production
- Store or log sensitive data (PII, tokens, credentials) in request/response bodies
- Use synchronous blocking calls for external API calls without timeout and circuit breaker patterns

---

## Output Template

When designing or auditing an API, provide the following:

1. **Resource Model Diagram** — ASCII or mermaid diagram showing entity relationships and URI paths
2. **Schema Definition** — OpenAPI YAML or GraphQL SDL with all types, queries, mutations, and error schemas
3. **Error Handling Standard** — Mapping of business errors to RFC 7807 Problem Details codes
4. **Versioning Strategy** — Documented deprecation policy, migration path, and header/URI conventions
5. **Security Checklist** — Authentication method, rate limiting thresholds, input validation rules, and encryption requirements

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-api-gateway` | API gateway patterns for routing, authentication, and rate limiting |
| `coding-rate-limiting` | Token bucket, sliding window, and leaky bucket algorithms for API throttling |
| `coding-openapi-specification` | OpenAPI 3.1 specification authoring, validation, and client generation |

---

## Live References

> Authoritative documentation links for API design best practices and RFC standards.

- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110)
- [RFC 7807: Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc7807)
- [JSON:API Specification](https://jsonapi.org/format/)
- [OpenAPI Specification 3.1](https://spec.openapis.org/oas/v3.1.0)
- [GraphQL Specification (2024)](https://graphql.github.io/spec/)
- [OWASP API Security Top 10](https://owasp.org/API-Security/)
