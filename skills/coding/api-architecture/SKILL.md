---
name: api-architecture
description: Designs and implements production API architectures (RESTful, GraphQL, gRPC) with proper versioning, authentication, rate limiting, error handling, and OpenAPI documentation for scalable service interfaces.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: api architecture, RESTful API, GraphQL, gRPC, API versioning, OpenAPI specification, authentication patterns, how do i design an API
  archetypes:
    - tactical
    - generation
    - strategic
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
  content-types: [code, guidance, do-dont, examples]
  related-skills: microservices-architecture,event-driven-architecture,architecture-decision-records,security-architecture
---

# API Architecture Guide

I provide actionable design decisions and concrete implementations for building production-grade APIs — RESTful resources, GraphQL schemas, gRPC services, with versioning, authentication, rate limiting, standardized error handling, and OpenAPI documentation baked in from day one.

## TL;DR Checklist

- [ ] Define resource hierarchy using noun-based URI paths before writing any endpoint
- [ ] Choose a versioning strategy (URL path, header, or content negotiation) and commit to it
- [ ] Implement structured error responses with machine-readable error codes and correlation IDs
- [ ] Add pagination to every list endpoint — cursor-based for large datasets, offset-only for bounded results under 10k rows
- [ ] Document all endpoints with OpenAPI 3.x before implementation begins
- [ ] Enforce rate limiting at the gateway layer with token bucket algorithm
- [ ] Design authentication flow (OAuth 2.0 / JWT) and authorization middleware early

---

## When to Use

Use this skill when:

- Designing a new API from scratch or re-architecting an existing one
- Deciding between REST, GraphQL, or gRPC for a specific service boundary
- Implementing API versioning without breaking existing consumers
- Adding rate limiting, authentication, or pagination to an existing API
- Writing OpenAPI specifications that serve as the single source of truth

---

## When NOT to Use

Avoid this skill for:

- Internal-only scripts or one-off automation — use simple HTTP endpoints or direct function calls instead
- High-frequency trading systems where microsecond latency matters — prefer gRPC with custom serialization over REST
- Simple CRUD apps that fit within a framework's conventions (e.g., Django REST Framework scaffolding) — the overhead of architectural decisions outweighs benefits

---

## Core Workflow

1. **Establish resource hierarchy using noun-based URI paths.** Map domain entities to URI structures: `/api/v1/users/{id}/orders` for nested resources, never use verbs in URIs. Define the complete resource tree before any code is written. **Checkpoint:** All resource paths follow `/api/{version}/{resource}/{id}/{sub-resource}` pattern with no action verbs.

2. **Define versioning strategy before any endpoint is designed.** Choose URL path versioning (`/api/v1/resource`) for maximum transparency and caching control, or header versioning (`API-Version: 2024-01-01`) for client-driven negotiation. Document the chosen approach in an Architecture Decision Record (ADR). **Checkpoint:** Versioning strategy is documented and applied consistently across all resource definitions.

3. **Design HTTP method semantics per RFC 7231.** GET retrieves without side effects, POST creates new resources, PUT replaces entire representations (idempotent), PATCH applies partial modifications, DELETE removes resources. Map each domain operation to the correct method. **Checkpoint:** Every endpoint uses exactly one HTTP method with semantically correct behavior; POST is never used for retrieval.

4. **Implement structured error responses with a unified schema.** Every endpoint returns `{ "error": { "code": "RESOURCE_NOT_FOUND", "message": "User not found", "details": {...}, "correlation_id": "uuid" } }` using RFC 7807 Problem Details format as the baseline. Include correlation IDs from request headers (`X-Correlation-ID`) for tracing. **Checkpoint:** Error codes are machine-parseable, human-readable, and consistently present across all responses including 5xx.

5. **Add pagination middleware before any list endpoint is exposed.** For datasets under 10k rows, offset-based pagination with `limit`/`offset` parameters suffices. For larger datasets or real-time data, implement cursor-based pagination using monotonic keys (created_at + id). Set default page size to 25 with maximum of 100. **Checkpoint:** All list endpoints return `{ "data": [...], "pagination": { "total", "page", "has_more" } }` or cursor equivalents.

6. **Generate OpenAPI specification from code and validate against schema.** Use FastAPI's automatic generation, Redoc for visualization, and ensure all paths, parameters, request bodies, and response schemas are documented before the first release. Include security schemes and rate limit headers in the spec. **Checkpoint:** `openapi.json` validates without errors, all endpoints have descriptions and examples, and the spec renders cleanly in Swagger UI or Redoc.

---

## API Design Patterns

### Pattern 1: RESTful Resource Naming and HTTP Semantics

Proper REST design maps domain resources to noun-based URI paths and uses HTTP methods semantically. GET must be safe (no side effects) and cacheable. POST creates, PUT replaces entirely, PATCH modifies partially, DELETE removes. Status codes must accurately reflect the outcome — 201 for created, 204 for no content after delete, 409 for conflicts, 422 for validation failures.

```python
# FastAPI: Proper resource naming and HTTP method semantics
from fastapi import FastAPI, HTTPException, status, Query
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
import uuid

app = FastAPI(title="User Orders API", version="1.0.0")

class OrderCreate(BaseModel):
    product_id: str = Field(..., description="Unique product identifier")
    quantity: int = Field(..., ge=1, le=1000, description="Order quantity")
    shipping_address_id: str = Field(..., description="Address to ship to")

class OrderUpdate(BaseModel):
    quantity: Optional[int] = Field(None, ge=1, le=1000)

class OrderResponse(BaseModel):
    id: str
    user_id: str
    product_id: str
    quantity: int
    status: str = "pending"
    created_at: datetime
    updated_at: Optional[datetime] = None

class ErrorResponse(BaseModel):
    code: str
    message: str
    details: Optional[dict] = None
    correlation_id: str

# In-memory store for demonstration (replace with database)
orders_db: dict[str, OrderResponse] = {}

@app.post(
    "/api/v1/users/{user_id}/orders",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
    responses={422: {"model": ErrorResponse}},
)
def create_order(user_id: str, order: OrderCreate):
    """Create a new order for a user. Uses POST because this creates a new resource."""
    if not user_id or len(user_id) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=ErrorResponse(
                code="INVALID_USER_ID",
                message=f"User ID must be at least 8 characters, got '{user_id}'"
            )
        )

    order_id = str(uuid.uuid4())
    now = datetime.utcnow()
    order_response = OrderResponse(
        id=order_id,
        user_id=user_id,
        product_id=order.product_id,
        quantity=order.quantity,
        created_at=now,
        updated_at=now,
    )
    orders_db[order_id] = order_response
    return order_response

@app.get(
    "/api/v1/users/{user_id}/orders/{order_id}",
    response_model=OrderResponse,
    responses={404: {"model": ErrorResponse}},
)
def get_order(user_id: str, order_id: str):
    """Retrieve a single order. Uses GET — safe and cacheable."""
    order = orders_db.get(order_id)
    if not order or order.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="ORDER_NOT_FOUND",
                message=f"Order '{order_id}' not found for user '{user_id}'",
                correlation_id=""
            )
        )
    return order

@app.patch(
    "/api/v1/users/{user_id}/orders/{order_id}",
    response_model=OrderResponse,
    responses={404: {"model": ErrorResponse}},
)
def update_order(user_id: str, order_id: str, patch: OrderUpdate):
    """Partially update an order. Uses PATCH because we modify specific fields."""
    order = orders_db.get(order_id)
    if not order or order.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(code="ORDER_NOT_FOUND", message=f"Order '{order_id}' not found")
        )

    update_data = patch.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(order, field, value)
    order.updated_at = datetime.utcnow()
    orders_db[order_id] = order
    return order

@app.delete(
    "/api/v1/users/{user_id}/orders/{order_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={404: {"model": ErrorResponse}},
)
def delete_order(user_id: str, order_id: str):
    """Delete an order. Uses DELETE; returns 204 No Content."""
    order = orders_db.get(order_id)
    if not order or order.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(code="ORDER_NOT_FOUND", message=f"Order '{order_id}' not found")
        )
    del orders_db[order_id]
```

### Pattern 2: Pagination Strategies

Two pagination strategies exist for production APIs. **Offset-based** uses `limit` and `offset` parameters — simple and SEO-friendly but suffers from the "skimming problem" where rows inserted/deleted between requests shift results. **Cursor-based** uses a monotonic key (composite of `created_at` + `id`) to paginate through data without missing or duplicating rows, making it ideal for real-time datasets.

```python
from fastapi import Query
from typing import Generic, TypeVar, Optional
from dataclasses import dataclass

T = TypeVar("T")

@dataclass
class OffsetPagination:
    """Offset-based pagination for bounded result sets (< 10k rows)."""
    total: int
    page: int
    limit: int

    @property
    def has_more(self) -> bool:
        return (self.page * self.limit) < self.total

@dataclass
class CursorPagination:
    """Cursor-based pagination for unbounded or real-time datasets."""
    total: int
    cursor: Optional[str]  # Opaque encoded key
    limit: int
    has_more: bool

class PaginationResponse(BaseModel, Generic[T]):
    data: list[T]
    pagination: dict

def offset_paginate(items: list, page: int = 1, limit: int = 25) -> dict:
    """Apply offset pagination and return paginated result."""
    total = len(items)
    start = (page - 1) * limit
    end = start + limit
    page_items = items[start:end]

    return PaginationResponse(
        data=page_items,
        pagination={
            "total": total,
            "page": page,
            "limit": limit,
            "has_more": end < total,
        }
    ).model_dump()

def cursor_paginate(items: list[str], last_cursor: Optional[str] = None,
                    limit: int = 25) -> dict:
    """Apply cursor-based pagination using position as the cursor."""
    # In production, encode actual monotonic keys (e.g., f"{created_at}:{id}")
    start_index = 0
    if last_cursor:
        try:
            start_index = int(last_cursor)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid cursor format")

    page_items = items[start_index : start_index + limit]
    next_cursor = str(start_index + limit) if len(items) > start_index + limit else None

    return PaginationResponse(
        data=page_items,
        pagination={
            "total": len(items),
            "cursor": next_cursor,
            "limit": limit,
            "has_more": next_cursor is not None,
        }
    ).model_dump()
```

### Pattern 3: API Versioning Strategies

Three versioning approaches exist with distinct tradeoffs. **URL path versioning** (`/api/v1/resource`, `/api/v2/resource`) provides maximum transparency — the version is visible in logs, caches, and link headers, making it easy for clients to control. **Header versioning** sends `API-Version: 2024-01-01` or `Accept: application/vnd.api.v2+json`, keeping URIs clean but hiding the version from intermediate proxies. **Content negotiation** uses `Accept` headers with vendor-specific MIME types, offering the most semantic flexibility but highest client complexity.

```python
from fastapi import Request, Header
import re

# Strategy 1: URL Path Versioning (Recommended for public APIs)
@app.get("/api/v1/users/{user_id}", tags=["v1"])
def get_user_v1(user_id: str):
    """Versioned via URL path — visible in all logs and caches."""
    return {"version": "v1", "user_id": user_id}

@app.get("/api/v2/users/{user_id}", tags=["v2"])
def get_user_v2(request: Request, user_id: str):
    """V2 with additional fields — URL path makes version explicit to proxies."""
    # V2 adds email and profile fields not present in v1
    return {
        "version": "v2",
        "user_id": user_id,
        "email": f"user{user_id}@example.com",
        "profile": {"display_name": f"User {user_id}"},
    }

# Strategy 2: Header Versioning (Good for internal microservice APIs)
@app.get("/internal/users/{user_id}")
def get_user_header_versioned(
    user_id: str,
    api_version: Optional[str] = Header(None, alias="API-Version"),
):
    """Version negotiated via custom header — URIs stay clean."""
    version = api_version or "v1"  # Default to v1 if no header sent

    if not re.match(r"^v\d+$", version):
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_API_VERSION", "message": f"Version '{version}' does not match pattern 'v\\d+'"}
        )

    return {"version": version, "user_id": user_id}

# Strategy 3: Content Negotiation (Best for complex media type needs)
@app.get("/negotiated/users/{user_id}")
def get_user_content_negotiation(
    user_id: str,
    accept: str = Header("application/json"),
):
    """Version via Accept header content negotiation."""
    if "v2" in accept and "json" in accept:
        return {"version": "v2", "user_id": user_id, "full": True}
    elif "v1" in accept or "json" in accept:
        return {"version": "v1", "user_id": user_id}

    raise HTTPException(
        status_code=406,
        detail={"code": "UNSUPPORTED_MEDIA_TYPE", "message": "Accept header must include 'application/json' with optional version"}
    )

# Decision table for choosing versioning strategy:
# | Factor              | URL Path     | Header        | Content Neg.  |
# |---------------------|-------------|---------------|---------------|
# | Cache control       | ✅ Excellent | ⚠️ Proxy may miss | ❌ Complex     |
# | Client transparency | ✅ Visible   | 🔍 Hidden     | ⚠️ In headers  |
# | URI simplicity      | ❌ Duplicates | ✅ Clean      | ✅ Clean       |
# | Browser testing     | ✅ Works     | ❌ Needs tools| ❌ Needs tools |
# | Recommended for:    | Public APIs  | Internal APIs | Complex media  |
```

### Pattern 4: Structured Error Responses

All error responses follow RFC 7807 Problem Details format extended with machine-readable error codes and correlation IDs. This enables API consumers to programmatically handle errors (retry on 429, escalate on 5xx, show user-friendly messages for 4xx) while giving operations teams traceable request IDs through the full stack.

```python
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
import uuid
import traceback

class ProblemDetailError:
    """RFC 7807 Problem Details extended with domain error codes."""
    def __init__(self, status_code: int, code: str, message: str,
                 correlation_id: Optional[str] = None,
                 details: Optional[dict] = None):
        self.status_code = status_code
        self.code = code
        self.message = message
        self.correlation_id = correlation_id or str(uuid.uuid4())
        self.details = details or {}

    def to_dict(self) -> dict:
        return {
            "error": {
                "code": self.code,
                "message": self.message,
                "details": self.details,
                "correlation_id": self.correlation_id,
            }
        }

# Predefined error codes for consistency across all endpoints
ERROR_CODES = {
    # Client errors (4xx)
    "INVALID_REQUEST": 400,
    "UNAUTHORIZED": 401,
    "FORBIDDEN": 403,
    "RESOURCE_NOT_FOUND": 404,
    "METHOD_NOT_ALLOWED": 405,
    "VALIDATION_FAILED": 422,
    "RATE_LIMITED": 429,

    # Server errors (5xx)
    "INTERNAL_ERROR": 500,
    "SERVICE_UNAVAILABLE": 503,
}

def error_response(code: str, message: str, status_code: Optional[int] = None,
                   details: Optional[dict] = None, request: Optional[Request] = None) -> JSONResponse:
    """Create a standardized Problem Details response."""
    if status_code is None:
        status_code = ERROR_CODES.get(code, 500)

    correlation_id = ""
    if request and request.headers.get("X-Correlation-ID"):
        correlation_id = request.headers["X-Correlation-ID"]
    elif request:
        correlation_id = str(uuid.uuid4())

    problem = ProblemDetailError(
        status_code=status_code,
        code=code,
        message=message,
        correlation_id=correlation_id,
        details=details,
    )

    return JSONResponse(
        status_code=status_code,
        content=problem.to_dict(),
        headers={"X-Correlation-ID": correlation_id},
    )

# FastAPI exception handler — catches all HTTPExceptions and formats uniformly
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Transform FastAPI's default error format into Problem Details."""
    if isinstance(exc.detail, dict) and "error" in exc.detail:
        # Already a ProblemDetailError — pass through
        return JSONResponse(
            status_code=exc.status_code,
            content=exc.detail,
            headers={"X-Correlation-ID": exc.detail["error"].get("correlation_id", "")},
        )

    # Wrap non-standard errors in Problem Details format
    problem = ProblemDetailError(
        status_code=exc.status_code,
        code="VALIDATION_FAILED" if exc.status_code == 422 else "INVALID_REQUEST",
        message=str(exc.detail) if isinstance(exc.detail, str) else "The request could not be processed.",
        correlation_id=request.headers.get("X-Correlation-ID", str(uuid.uuid4())),
    )
    return JSONResponse(status_code=exc.status_code, content=problem.to_dict())

# Usage in an endpoint:
async def handle_order(request: Request, order_id: str):
    if not order_id:
        raise HTTPException(
            status_code=400,
            detail=ProblemDetailError(
                status_code=400,
                code="INVALID_REQUEST",
                message="order_id is required",
                correlation_id=request.headers.get("X-Correlation-ID"),
            ).to_dict()
        ) from None
```

---

## GraphQL Architecture Considerations

GraphQL shifts API design from endpoint definitions to schema design. Use the **Resource-Oriented Schema** pattern where types represent domain resources and fields represent relationships. The **N+1 problem** is the most common GraphQL performance pitfall — solved with DataLoader batching, which coalesces individual field resolutions into batched database queries.

Always enforce **query depth limiting** (max 10 levels) and **query complexity analysis** to prevent DoS through deeply nested or expensive queries. Use `@cacheControl(maxAge: 60)` directives for caching-sensitive fields.

```graphql
# GraphQL Schema: Resource-Oriented Pattern
schema {
  query: Query
  mutation: Mutation
  subscription: Subscription
}

type Query {
  # Singular resource by ID — efficient, cacheable
  user(id: ID!): User
  # Plural with pagination — cursor-based
  users(first: Int = 25, after: String): UserConnection!
  # Search with filters
  searchUsers(query: String!, filters: UserFilter): [User!]!
}

type Mutation {
  createUser(input: CreateUserInput!): CreateUserPayload!
  updateUser(id: ID!, input: UpdateUserInput!): UpdateUserPayload!
  deleteUser(id: ID!): DeleteUserPayload!
}

type Subscription {
  # Real-time event stream
  userCreated: User!
  orderStatusChanged(orderId: ID!): OrderStatusEvent!
}

# Resource type with explicit field types — never nullable for required fields
type User {
  id: ID!
  email: String!
  displayName: String!
  createdAt: DateTime!
  # Relationship — use edge pattern for pagination support
  orders(first: Int = 10, after: String): OrderConnection!
  # Avoid deep nesting — max recommended depth is 3 levels per field
}

type Order {
  id: ID!
  product: Product!
  quantity: Int!
  status: OrderStatus!
  totalAmount: Money!
  createdAt: DateTime!
}

# Connection type for cursor-based pagination (Relay spec)
type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
}

type UserEdge {
  node: User!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

# Input types for mutations — never reuse query types as inputs
input CreateUserInput {
  email: String!
  displayName: String!
  password: String! @deprecated(reason: "Use separate registration mutation")
}

input UserFilter {
  createdAtGte: DateTime
  role: UserRole
  hasOrders: Boolean
}

enum OrderStatus {
  PENDING
  CONFIRMED
  SHIPPED
  DELIVERED
  CANCELLED
}

scalar DateTime
scalar Money

type CreateUserPayload {
  user: User
  errors: [FieldError!]
}

type FieldError {
  field: String!
  message: String!
}
```

**Key GraphQL patterns:**

- **DataLoader for N+1 prevention**: Batch all database calls within a single resolver execution. Group all `user.orders` calls into one SQL `WHERE id IN (...)` query rather than firing one query per user.
- **Query depth limiting**: Set max depth to 10 in your GraphQL server middleware. Reject queries exceeding this depth before execution.
- **Complexity analysis**: Assign costs to fields based on their database operations (scalar: cost 1, relationship with pagination: cost 10). Reject queries where total estimated cost exceeds threshold (e.g., 1000).

---

## gRPC Architecture Patterns

gRPC uses Protocol Buffers for strongly-typed contract definitions and HTTP/2 for transport. It excels in **microservice-to-microservice communication** where performance matters — binary serialization, multiplexed streams, and code generation produce significantly lower latency than REST+JSON. Use gRPC when all consumers are internal services. Prefer REST or GraphQL when external clients need browser access.

```protobuf
// Protocol Buffers: Service definition with all RPC patterns
syntax = "proto3";

package orders.v1;

option go_package = "github.com/example/orders-service/api/v1;orderspb";

// Request/Response message types
message CreateOrderRequest {
  string user_id = 1;
  string product_id = 2;
  int32 quantity = 3;
  string shipping_address_id = 4;
}

message Order {
  string id = 1;
  string user_id = 2;
  string product_id = 3;
  int32 quantity = 4;
  string status = 5;
  google.protobuf.Timestamp created_at = 6;
  google.protobuf.Timestamp updated_at = 7;
}

message Empty {}

// Service interface with multiple RPC patterns
service OrderService {
  // Unary: standard request-response (most common)
  rpc CreateOrder(CreateOrderRequest) returns (Order);
  rpc GetOrder(GetOrderRequest) returns (Order);

  // Server-streaming: server sends multiple responses for one request
  // Use for: real-time order status updates, live feeds
  rpc StreamOrderUpdates(GetOrderRequest) returns (stream OrderStatusUpdate);

  // Client-streaming: client sends multiple requests for one response
  // Use for: batch operations, file upload with metadata
  rpc BatchCreateOrders(stream CreateOrderRequest) returns (BatchCreateResponse);

  // Bidirectional streaming: both sides stream independently
  // Use for: chat, real-time collaboration, live dashboards
  rpc TrackOrders(stream OrderQuery) returns (stream OrderStatusUpdate);
}

message GetOrderRequest {
  string order_id = 1;
  bool include_history = 2;
}

message OrderStatusUpdate {
  string order_id = 1;
  string status = 2;
  google.protobuf.Timestamp updated_at = 3;
}

message OrderQuery {
  string user_id = 1;
  bool stream_only = 2;
}

message BatchCreateResponse {
  repeated Order orders = 1;
  int32 success_count = 2;
  int32 failed_count = 3;
}
```

**When to use gRPC vs REST:**

| Factor | Use gRPC | Use REST |
|--------|----------|----------|
| Consumer type | Internal microservices | External clients, browsers |
| Performance need | < 10ms latency, high throughput | Moderate latency acceptable |
| Language ecosystem | Polyglot services | Any language including JS/Python |
| Caching needs | No HTTP caching needed | Browser/cdn cacheable responses |
| Debugging ease | Requires gRPC-Web proxy or grpcurl | Browser DevTools works directly |
| Versioning | Breaking changes require new proto package | Easy backward-compatible field additions |

---

## Authentication and Authorization Patterns

APIs require layered authentication. **OAuth 2.0** provides the authorization framework — use Authorization Code flow with PKCE for web/mobile apps, Client Credentials for service-to-service communication. **JWT tokens** carry identity claims after authentication; keep them short-lived (15 minutes) with refresh tokens for session continuation. **API keys** are simpler but less secure — suitable for machine-to-machine auth where OAuth is overkill.

```python
from datetime import datetime, timedelta, timezone
import hmac
import hashlib
import secrets
from typing import Optional

# JWT Token Structure and Best Practices
class JWTToken:
    """JWT token with proper claims for API authentication."""

    ACCESS_TOKEN_EXPIRY_MINUTES = 15
    REFRESH_TOKEN_EXPIRY_DAYS = 7

    @staticmethod
    def encode(payload: dict, secret_key: str) -> str:
        """Create a signed JWT token (simplified — use PyJWT in production)."""
        header = {"alg": "HS256", "typ": "JWT"}
        import json, base64

        def b64encode(data: dict) -> str:
            return base64.urlsafe_b64encode(
                json.dumps(data, separators=(",", ":")).encode()
            ).rstrip(b"=").decode()

        header_b64 = b64encode(header)
        payload_with_expiry = {**payload, "exp": datetime.now(timezone.utc) + timedelta(minutes=JWTToken.ACCESS_TOKEN_EXPIRY_MINUTES)}
        payload_b64 = b64encode(payload_with_expiry)
        signing_input = f"{header_b64}.{payload_b64}"
        signature = hmac.new(
            secret_key.encode(), signing_input.encode(), hashlib.sha256
        ).digest()
        signature_b64 = base64.urlsafe_b64encode(signature).rstrip(b"=").decode()

        return f"{signing_input}.{signature_b64}"

    @staticmethod
    def decode(token: str, secret_key: str) -> dict:
        """Validate and decode a JWT token. Returns payload or raises."""
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("Invalid token format")
        header_b64, payload_b64, signature_b64 = parts

        import json, base64
        def b64decode(s: str) -> dict:
            padding = "=" * (4 - len(s) % 4)
            return json.loads(base64.urlsafe_b64decode(s + padding))

        signing_input = f"{header_b64}.{payload_b64}"
        expected_sig = hmac.new(
            secret_key.encode(), signing_input.encode(), hashlib.sha256
        ).digest()
        actual_sig = base64.urlsafe_b64decode(signature_b64 + "=" * (4 - len(signature_b64) % 4))

        if not hmac.compare_digest(expected_sig, actual_sig):
            raise ValueError("Invalid signature")

        payload = b64decode(payload_b64)
        exp = datetime.fromtimestamp(payload.get("exp", 0), tz=timezone.utc)
        if datetime.now(timezone.utc) > exp:
            raise ValueError("Token expired")

        return payload


# OAuth 2.0 PKCE flow for public clients (web/mobile apps)
class OAuth2PKCE:
    """OAuth 2.0 Authorization Code flow with PKCE for security."""

    def __init__(self, client_id: str, client_secret: str,
                 authorization_url: str, token_url: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.authorization_url = authorization_url
        self.token_url = token_url

    @staticmethod
    def generate_code_verifier() -> str:
        """Generate a 43-128 character random string as PKCE code verifier."""
        return secrets.token_urlsafe(96)

    @staticmethod
    def generate_code_challenge(verifier: str) -> str:
        """Derive code challenge from verifier using SHA-256 (S256 method)."""
        import hashlib, base64
        digest = hashlib.sha256(verifier.encode()).digest()
        return base64.urlsafe_b64encode(digest).rstrip(b"=").decode()

    # PKCE flow: verifier → challenge → authorization → token exchange
    # 1. Client generates code_verifier (random) and code_challenge (SHA-256 hashed)
    # 2. Client requests authorization with code_challenge in query params
    # 3. Authorization server redirects back with authorization_code
    # 4. Client exchanges authorization_code + original code_verifier for tokens
    # This prevents authorization code interception attacks


# API Key management pattern
class APIKeyManager:
    """Secure API key generation and validation."""

    @staticmethod
    def generate_key(prefix: str = "ak") -> str:
        """Generate a 32-byte random API key with prefix."""
        raw = secrets.token_hex(32)
        return f"{prefix}_{raw}"

    @staticmethod
    def hash_key(api_key: str, salt: Optional[bytes] = None) -> tuple[bytes, str]:
        """Hash an API key for storage. Returns (salt, hashed_key)."""
        if salt is None:
            salt = secrets.token_bytes(16)

        # Use SHA-256 with salt — in production, use bcrypt or Argon2
        hashed = hashlib.sha256(salt + api_key.encode()).digest()
        return salt, hashed.hex()

    @staticmethod
    def verify_stored_key(input_key: str, stored_hashed: str, stored_salt: bytes) -> bool:
        """Verify an input key against a stored hash."""
        _, computed = APIKeyManager.hash_key(input_key, stored_salt)
        return hmac.compare_digest(computed, stored_hashed)


# Rate limit header constants for client feedback
RATE_LIMIT_HEADERS = {
    "X-RateLimit-Limit": "Maximum requests allowed in the window",
    "X-RateLimit-Remaining": "Requests remaining in current window",
    "X-RateLimit-Reset": "Unix timestamp when the window resets",
    "Retry-After": "Seconds to wait before retrying (only on 429 responses)",
}

# Usage: Attach rate limit headers to every response
# Headers added automatically by middleware:
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 42
# X-RateLimit-Reset: 1716547200
```

---

## Rate Limiting Patterns

Rate limiting prevents API abuse and protects backend capacity. The **token bucket algorithm** is preferred over fixed-window counters because it allows controlled burst traffic while enforcing long-term throughput limits. Implement rate limiting at the API gateway layer (Kong, Envoy, Nginx) for global enforcement, with per-user/per-IP overrides in application middleware.

```python
import time
import threading
from collections import defaultdict

class TokenBucket:
    """Token bucket rate limiter. Allows bursts up to capacity, then enforces steady-state rate."""

    def __init__(self, capacity: int, refill_rate: float):
        """
        Args:
            capacity: Maximum tokens (burst size). Set to 2x the steady-state for reasonable burst allowance.
            refill_rate: Tokens added per second. Matches your target sustained throughput.
        """
        self.capacity = capacity
        self.refill_rate = refill_rate
        self.tokens: dict[str, float] = {}  # key -> current token count
        self.last_refill: dict[str, float] = {}  # key -> last refill timestamp
        self.lock = threading.Lock()

    def _refill(self, key: str) -> None:
        """Refill tokens based on elapsed time."""
        now = time.monotonic()
        last = self.last_refill.get(key, now)
        elapsed = now - last
        new_tokens = elapsed * self.refill_rate
        self.tokens[key] = min(self.capacity, self.tokens.get(key, self.capacity) + new_tokens)
        self.last_refill[key] = now

    def consume(self, key: str, tokens: int = 1) -> tuple[bool, dict]:
        """
        Attempt to consume tokens for a given key.

        Returns:
            (allowed, headers_dict) — headers_dict contains rate limit feedback headers
        """
        with self.lock:
            self._refill(key)

            current = self.tokens.get(key, 0)
            if current >= tokens:
                self.tokens[key] = current - tokens
                reset_time = time.time() + ((self.capacity - self.tokens[key]) / self.refill_rate) if self.refill_rate > 0 else 0

                return True, {
                    "X-RateLimit-Limit": str(self.capacity),
                    "X-RateLimit-Remaining": str(int(self.tokens[key])),
                    "X-RateLimit-Reset": str(int(reset_time)),
                }
            else:
                # Calculate wait time until enough tokens are available
                deficit = tokens - current
                retry_after = int(deficit / self.refill_rate) + 1

                return False, {
                    "X-RateLimit-Limit": str(self.capacity),
                    "X-RateLimit-Remaining": "0",
                    "Retry-After": str(retry_after),
                }


# Rate limiting tiers for different consumer types
RATE_LIMIT_TIERS = {
    "free": {"capacity": 60, "refill_rate": 1.0},      # 60 req/min, burst to 60
    "basic": {"capacity": 300, "refill_rate": 5.0},     # 300 req/min (5/sec), burst to 300
    "premium": {"capacity": 1200, "refill_rate": 20.0}, # 1200 req/min (20/sec), burst to 1200
    "internal": {"capacity": 10000, "refill_rate": 200.0}, # 10k/min for service-to-service
}

# Per-user rate limiting middleware pattern (FastAPI example)
async def rate_limit_middleware(request: Request, call_next):
    """Apply per-user rate limiting via API key or JWT sub claim."""
    # Extract client identifier
    api_key = request.headers.get("X-API-Key")
    token = request.headers.get("Authorization", "").replace("Bearer ", "")

    if api_key:
        client_id = f"apikey:{api_key}"
    elif token:
        try:
            payload = JWTToken.decode(token, secret_key="CHANGE-ME-IN-PRODUCTION")
            client_id = f"user:{payload.get('sub', 'unknown')}"
        except ValueError:
            client_id = f"ip:{request.client.host}"
    else:
        client_id = f"ip:{request.client.host}"

    # Select rate limit tier from stored user profile (not shown)
    tier_name = "free"  # Lookup from database based on client_id
    tier = RATE_LIMIT_TIERS.get(tier_name, RATE_LIMIT_TIERS["free"])
    limiter = TokenBucket(capacity=tier["capacity"], refill_rate=tier["refill_rate"])

    allowed, headers = limiter.consume(client_id)
    response = await call_next(request)

    for key, value in headers.items():
        response.headers[key] = value

    if not allowed:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=429,
            content={
                "error": {
                    "code": "RATE_LIMITED",
                    "message": "Too many requests. Please retry after the indicated time.",
                    "details": {"tier": tier_name},
                }
            },
            headers={"Retry-After": headers.get("Retry-After", "60")},
        )

    return response
```

---

## OpenAPI/Swagger Documentation Standards

OpenAPI 3.x is the industry standard for machine-readable API documentation. Generate it directly from code annotations (FastAPI does this automatically) and maintain a hand-authored `openapi.yaml` as the source of truth. Include path parameters, request bodies, response schemas, security requirements, and example values for every endpoint.

```yaml
# OpenAPI 3.x specification example
openapi: "3.0.3"
info:
  title: Order Management API
  description: RESTful API for managing user orders with full CRUD operations.
    Supports cursor-based pagination, rate limiting, and structured error responses.
  version: "1.2.0"
  contact:
    name: API Engineering Team
    email: api-engineering@example.com
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT

servers:
  - url: https://api.example.com/api/v1
    description: Production server
  - url: https://staging-api.example.com/api/v1
    description: Staging server

security:
  - BearerAuth: []
  - ApiKeyAuth: []

paths:
  /users/{user_id}/orders:
    get:
      summary: List orders for a user
      operationId: listUserOrders
      tags:
        - Orders
      parameters:
        - name: user_id
          in: path
          required: true
          description: The unique identifier for the user
          schema:
            type: string
            pattern: "^[a-f0-9-]{36}$"
          example: "550e8400-e29b-41d4-a716-446655440000"
        - name: limit
          in: query
          required: false
          description: Maximum number of orders to return (default: 25, max: 100)
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 25
        - name: cursor
          in: query
          required: false
          description: Opaque cursor for pagination (omit for first page)
          schema:
            type: string
        - name: status
          in: query
          required: false
          description: Filter by order status
          schema:
            type: string
            enum: [pending, confirmed, shipped, delivered, cancelled]
      responses:
        "200":
          description: A paginated list of orders
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/PaginatedOrders"
              examples:
                default:
                  value:
                    data:
                      - id: "ord_abc123"
                        product_id: "prod_xyz789"
                        quantity: 2
                        status: pending
                        created_at: "2024-06-15T10:30:00Z"
                    pagination:
                      total: 150
                      cursor: "eyJpZCI6Im9yZF8xMjMifQ=="
                      limit: 25
                      has_more: true
        "401":
          $ref: "#/components/responses/UnauthorizedError"
        "429":
          description: Rate limit exceeded
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ProblemDetail"

    post:
      summary: Create a new order
      operationId: createUserOrder
      tags:
        - Orders
      parameters:
        - name: user_id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/OrderCreate"
            examples:
              standard_order:
                summary: Standard order creation
                value:
                  product_id: "prod_xyz789"
                  quantity: 1
                  shipping_address_id: "addr_def456"
      responses:
        "201":
          description: Order created successfully
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/OrderResponse"
        "422":
          $ref: "#/components/responses/ValidationError"

  /users/{user_id}/orders/{order_id}:
    get:
      summary: Get a specific order
      operationId: getUserOrder
      tags:
        - Orders
      parameters:
        - name: user_id
          in: path
          required: true
          schema:
            type: string
        - name: order_id
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Order details
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/OrderResponse"
        "404":
          $ref: "#/components/responses/NotFoundError"

components:
  schemas:
    OrderCreate:
      type: object
      required: [product_id, quantity, shipping_address_id]
      properties:
        product_id:
          type: string
          description: Unique product identifier
          example: "prod_xyz789"
        quantity:
          type: integer
          minimum: 1
          maximum: 1000
          description: Number of items to order
          example: 2
        shipping_address_id:
          type: string
          description: Destination address identifier
          example: "addr_def456"

    OrderResponse:
      type: object
      required: [id, user_id, product_id, quantity, status, created_at]
      properties:
        id:
          type: string
          format: uuid
        user_id:
          type: string
        product_id:
          type: string
        quantity:
          type: integer
        status:
          type: string
          enum: [pending, confirmed, shipped, delivered, cancelled]
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time
          nullable: true

    PaginatedOrders:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: "#/components/schemas/OrderResponse"
        pagination:
          $ref: "#/components/schemas/CursorPagination"

    CursorPagination:
      type: object
      properties:
        total:
          type: integer
          example: 150
        cursor:
          type: string
          nullable: true
        limit:
          type: integer
        has_more:
          type: boolean

    ProblemDetail:
      type: object
      required: [error]
      properties:
        error:
          type: object
          required: [code, message]
          properties:
            code:
              type: string
              example: "ORDER_NOT_FOUND"
            message:
              type: string
              example: "Order not found"
            details:
              type: object
            correlation_id:
              type: string
              format: uuid

  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: OAuth 2.0 Bearer token with JWT format
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
      description: API key for service-to-service authentication

  responses:
    UnauthorizedError:
      description: Authentication required
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/ProblemDetail"
    NotFoundError:
      description: Resource not found
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/ProblemDetail"
    ValidationError:
      description: Request validation failed
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/ProblemDetail"

tags:
  - name: Orders
    description: Order management operations
```

---

## Constraints

### MUST DO

- Use noun-based URI paths exclusively — never embed verbs (use `GET /users` not `GET /getUsers`)
- Define versioning strategy in an Architecture Decision Record before implementation begins and document the rationale for the chosen approach
- Return structured error responses using RFC 7807 Problem Details format with machine-readable error codes on every endpoint, including 5xx
- Include OpenAPI specification as the source of truth — generate from code but edit the YAML to add descriptions, examples, and correct schema definitions
- Apply cursor-based pagination for any list endpoint that could return more than 100 rows; use offset-based only for bounded datasets
- Enforce rate limiting at the gateway layer with per-user tokens; expose rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`) on all responses
- Use correlation IDs from `X-Correlation-ID` request headers (or generate one if missing) and echo them in response headers for full request tracing

### MUST NOT DO

- Never use HTTP methods semantically incorrectly — never use POST for data retrieval, PUT for partial updates, or DELETE that returns a body (return 204 No Content)
- Never expose internal field names, database column names, or implementation details in API responses (e.g., `_deleted_at`, `user__email`, internal UUIDs to other services)
- Never return raw database errors, stack traces, or SQL queries in API responses — always wrap in the structured error format with safe error messages
- Never skip input validation on any endpoint — validate all path parameters, query parameters, request body fields, and headers at the boundary using schema validation (Pydantic, Zod)
- Never allow unlimited pagination depth — set hard limits on list sizes (max 100), query nesting depth (max 10 in GraphQL), and concurrent streaming connections per client

---

## Output Template

When this skill is active, produce:

1. **Architecture Decision** — Identify the API type (REST/GraphQL/gRPC) and justify the choice based on consumer type, performance needs, and caching requirements
2. **Resource Schema or Protobuf Definition** — Complete type definitions with field types, constraints, and relationships
3. **Endpoint Specifications** — HTTP method, URI path, parameters, request body schema, response schema, status codes, and error handling for each endpoint
4. **OpenAPI Fragment or Full Spec** — Machine-readable documentation matching the implemented endpoints
5. **Security Configuration** — Authentication flow selection, token expiry settings, and rate limit tier assignments
6. **Error Response Format** — Problem Details template with domain-specific error codes applicable to the API

---

## Related Skills

| Skill | Purpose |
|---|---|
| `microservices-architecture` | Service boundary design, inter-service communication patterns, service mesh integration |
| `event-driven-architecture` | Event sourcing, CQRS patterns, message queue integration for async API workflows |
| `security-architecture` | OWASP API Security Top 10, threat modeling, secret management, encryption at rest and in transit |
| `architecture-decision-records` | ADR templates, decision documentation workflow, architecture review process |

---

## Live References

1. **RFC 7807 — Problem Details for HTTP APIs**: https://datatracker.ietf.org/doc/html/rfc7807
2. **OpenAPI Specification 3.0.3**: https://spec.openapis.org/oas/v3.0.3
3. **FastAPI Documentation**: https://fastapi.tiangolo.com/
4. **GraphQL Specification**: https://graphql.org/learn/
5. **gRPC Concepts and Best Practices**: https://grpc.io/docs/what-is-grpc/core-concepts/
6. **OAuth 2.0 (RFC 6749)**: https://datatracker.ietf.org/doc/html/rfc6749
7. **RESTful API Design Guidelines (Microsoft)**: https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design
