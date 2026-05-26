---
name: graphql-schema-design
description: Implements GraphQL schema design with SDL-first types, input objects,
  interfaces, unions, custom scalars, and deprecation directives for type-safe API
  contracts in Python and Strawberry.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: graphql schema design, SDL, type system, strawberry-graphql, interface,
    union type, graphql-input-object, graphql-deprecation
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
  related-skills: graphql-dataloader-pattern, graphql-error-handling-validation, graphql-federation, graphql-subscriptions
------
# GraphQL Schema Design

Implements production-grade GraphQL schema design patterns using the Strawberry Python framework. Models domain entities as SDL-first type systems with proper input objects, interfaces, unions, custom scalars, and deprecation directives to create type-safe, maintainable API contracts.

## TL;DR Checklist

- [ ] Define every entity as a `@strawberry.type` or `@strawberry.input` dataclass with explicit field types (no bare `Any`)
- [ ] Use `@strawberry.interface` for shared field contracts across concrete types, not unions
- [ ] Group mutation arguments into dedicated `@strawberry.input` objects — never spread scalar args on the root mutation
- [ ] Implement opaque global IDs via base64-encoded `"ModelType:123"` format instead of exposing raw database keys
- [ ] Create custom scalar classes for domain concepts (Email, URL, CurrencyAmount, DateTime) rather than using `str` or `float`
- [ ] Add docstrings to every type and field — they feed into schema introspection and auto-generated API docs
- [ ] Apply `@deprecated(reason="...")` before removing any public field; never remove without a deprecation period

---

## When to Use

Use this skill when:

- Designing a new GraphQL API from scratch or migrating an existing REST API to GraphQL
- Refactoring a schema that uses raw scalar arguments on mutations (e.g., `createUser(name: String!, email: String!, age: Int!)`)
- Deciding between `interface` and `union` for polymorphic types in your type system
- Building a shared SDL contract that multiple clients (web, mobile, internal services) consume
- Evolving an existing schema and needing to deprecate fields without breaking API consumers

---

## When NOT to Use

Avoid this skill for:

- Implementing resolver logic or data fetching — use `graphql-dataloader-pattern` for N+1 optimization
- Handling runtime errors, input validation failures, or exception middleware — use `graphql-error-handling-validation`
- Generating client SDKs or TypeScript types from SDL — that is a code-generation concern, not schema design

---

## Core Workflow

### 1. Model the Domain as a Graph — Not REST Resource Endpoints

Rest APIs model resources (`GET /users`, `POST /orders`). GraphQL models the **domain graph**: users have orders, orders contain items, items reference products. Start by enumerating domain entities and their relationships, not HTTP verbs.

**Checkpoint:** Every type in your schema represents a real domain concept. Every relationship field should answer "who or what does this entity belong to or contain?" If you can't name the business meaning of a field, it doesn't belong in the schema.

### 2. Choose Type System Elements — Types vs Interfaces vs Unions

Use the correct GraphQL type construct for each situation:

- **`type`** — Concrete entities with unique fields (`User`, `Order`, `Product`)
- **`interface`** — Shared behavior across related types where callers can query common fields (`Node`, `NotificationChannel`)
- **`union`** — Polymorphic return values where types share no common fields (`SearchResult = User | Product | Order`)
- **`input`** — Mutation arguments grouped logically (`CreateOrderInput`, `UpdateProfileInput`)

**Checkpoint:** If callers can query the same field on multiple types, it's an interface. If types have no shared fields but appear together as a return type, it's a union. Do not use unions for related types that share behavior.

### 3. Define Input Objects for Mutations — Not Multiple Scalar Arguments

Every mutation that accepts more than one argument must use a dedicated `@strawberry.input` dataclass. This groups related parameters under a single logical unit, enables field-level documentation, and makes schema evolution additive-only (you can add new fields to the input without breaking existing calls).

**Checkpoint:** No mutation root field should have more than one non-scalar argument. If you see `createUser(name: String!, email: String!, age: Int!)`, refactor to `createUser(input: CreateUserInput!)`.

### 4. Add Documentation to Every Field and Type

Every `type`, `input`, `interface`, and field should have a docstring. Strawberry uses these for introspection, which feeds directly into GraphQL Playground, Apollo Studio, and auto-generated documentation. Docstrings are your API's built-in documentation — don't treat them as optional.

**Checkpoint:** Run `python -c "import schema; print(schema.schema)"` or query `__schema { types { name fields { name description } } }` and verify every field has a non-empty description.

### 5. Apply Deprecation Directives Instead of Removing Fields

When evolving a schema, never remove a field directly. Mark it `@deprecated(reason="...")` first, communicate the timeline to consumers, then remove in a future major version. Strawberry's `deprecation_reason` parameter applies the GraphQL-standard `@deprecated` directive.

**Checkpoint:** Every deprecated field has a reason explaining what to use instead. No deprecated fields remain marked for more than two minor release cycles without action.

### 6. Generate SDL from Code or Code from SDL (Bidirectional)

Strawberry generates SDL from your Python type definitions automatically via `schema.as_str()`. This means your code IS the source of truth — there is no separate `.graphql` file that can drift out of sync. Run schema validation as part of CI to ensure generated SDL is valid and complete.

**Checkpoint:** The generated SDL contains all types, interfaces, unions, inputs, and custom scalars. No type is defined in code but absent from the SDL, and vice versa.

---

## Implementation Patterns

### Pattern 1: Proper Input Object Types for Mutations

Mutations with multiple arguments should use dedicated `@strawberry.input` dataclasses instead of spreading scalars on the root mutation. This provides field-level validation hooks, descriptive docstrings, and additive-only schema evolution.

```python
# ✅ GOOD — Input object groups related parameters logically
import strawberry
from datetime import datetime
from typing import List, Optional


@strawberry.input(description="Parameters for creating a new order")
class CreateOrderInput:
    """All required fields for order creation grouped in one input."""

    customer_id: strawberry.ID
    items: List[strawberry.input(description="An order line item") "OrderItemInput"]
    shipping_address: AddressInput
    coupon_code: Optional[str] = None
    notes: Optional[str] = strawberry.field(
        default=None,
        description="Internal notes visible to support staff only",
    )


@strawberry.input(description="A single line item within an order")
class OrderItemInput:
    product_id: strawberry.ID
    quantity: int = strawberry.field(
        description="Number of units to order, must be positive",
    )

    @strawberry.validator(field="quantity")
    def ensure_positive_quantity(self) -> None:
        if self.quantity <= 0:
            raise ValueError("Quantity must be greater than zero")


@strawberry.type(description="Shipping address for delivery")
class AddressInput:
    street: str
    city: str
    state: str
    postal_code: str
    country: str = strawberry.field(
        default="US",
        description="ISO 3166-1 alpha-2 country code",
    )


# ❌ BAD — Scattered scalar arguments on mutation root, no grouping, hard to evolve
@strawberry.type
class BadMutation:
    @strawberry.mutation(description="Creates an order with individual args")
    async def create_order(
        self,
        customer_id: strawberry.ID,
        product_id_1: strawberry.ID,
        quantity_1: int,
        product_id_2: Optional[strawberry.ID] = None,
        quantity_2: Optional[int] = None,
        shipping_street: str,
        shipping_city: str,
        shipping_state: str,
        shipping_zip: str,
        coupon: Optional[str] = None,
    ) -> "Order":
        """This mutation has 10 arguments. Adding a new field breaks every caller."""
        ...


# ✅ GOOD — Mutation uses single input object; schema evolves additively
@strawberry.type
class GoodMutation:
    @strawberry.mutation(description="Creates a new order from the provided input")
    async def create_order(self, info, input: CreateOrderInput) -> "Order":
        # All parameters are structured, documented, and validated as a unit
        return await resolve_create_order(input)
```

### Pattern 2: Interface vs Union — When to Use Which

Interfaces share common fields across types. Unions express polymorphic returns where types share no common structure. This is one of the most commonly confused decisions in GraphQL schema design.

**Rule of thumb:** If a client can query the same field name across multiple return types, use an `interface`. If return types have completely different fields, use a `union`.

```python
import strawberry
from typing import Union


# ✅ GOOD — Interface when types share common fields clients want to query
@strawberry.interface(description="Base for all notification channels")
class NotificationChannel:
    """All notification channels share id and name. Clients can query these
    regardless of whether it's email, SMS, or push."""

    id: strawberry.ID
    name: str
    is_active: bool = True

    @strawberry.field(description="Human-readable label for this channel")
    def label(self) -> str:
        return self.name


@strawberry.type(description="Email notification channel")
class EmailChannel(NotificationChannel):
    address: str
    verified_at: Optional[datetime] = None

    @strawberry.field(description="Primary email address for notifications")
    def contact_point(self) -> str:
        return self.address


@strawberry.type(description="SMS notification channel")
class SMSChannel(NotificationChannel):
    phone_number: str
    carrier: Optional[str] = None


# ❌ BAD — Union when types share fields that callers would want to query together
@strawberry.type
class BadNotificationResult1:
    id: strawberry.ID
    name: str
    address: str  # Only for email


@strawberry.type
class BadNotificationResult2:
    id: strawberry.ID
    name: str
    phone_number: str  # Only for SMS


# A union of these forces clients to use inline fragments for EVERY shared field,
# which defeats the purpose. Use an interface instead.


# ✅ GOOD — Union when types share NO common fields
@strawberry.type(description="A product from catalog search")
class SearchResultProduct:
    id: strawberry.ID
    name: str
    price_cents: int
    in_stock: bool


@strawberry.type(description="A user from directory search")
class SearchResultUser:
    id: strawberry.ID
    display_name: str
    avatar_url: Optional[str] = None
    role: "UserRole"


@strawberry.type(description="An order from recent activity search")
class SearchResultOrder:
    id: strawberry.ID
    total_cents: int
    status: "OrderStatus"
    created_at: datetime


# Union is correct here because these types have no common fields a client
# could query without inline fragments. Each type stands alone.
SearchResult = Union[SearchResultProduct, SearchResultUser, SearchResultOrder]


@strawberry.type
class Query:
    @strawberry.field(description="Search across all entities")
    async def search(self, info, query: str) -> List[SearchResult]:
        return await search_all_entities(query)
```

### Pattern 3: Opaque Global IDs with Type Prefix

Never expose raw database IDs (sequential integers or UUIDs) directly. Encode them as base64-prefixed strings like `"User:dXNlcjoxMjM="` (which decodes to `"User:123"`). This prevents enumeration attacks, allows ID format changes without breaking the API, and enables type-safe casting from the ID alone.

```python
import base64
import strawberry
from typing import Generic, Optional, TypeVar


T = TypeVar("T")


def encode_global_id(type_name: str, identifier: str) -> str:
    """Encode a type-prefixed identifier into an opaque global ID.

    Format: <Base64-encoded "TypeName:id">

    Examples:
        >>> encode_global_id("User", "123")
        'VXNlcjoxMjM='   # base64 of "User:123"
        >>> encode_global_id("Order", "a1b2c3d4")
        'T3JkZXI6YTFiMmMzZDQ='  # base64 of "Order:a1b2c3d4"

    Args:
        type_name: The GraphQL type name (e.g., "User", "Order").
        identifier: The database primary key or UUID string.

    Returns:
        Base64-encoded opaque cursor string safe for URL/query params.
    """
    raw = f"{type_name}:{identifier}"
    return base64.b64encode(raw.encode("utf-8")).decode("ascii")


def decode_global_id(global_id: str) -> tuple[str, str]:
    """Decode an opaque global ID back to (type_name, identifier).

    Args:
        global_id: A base64-encoded "TypeName:id" string from a query argument.

    Returns:
        Tuple of (type_name, identifier).

    Raises:
        ValueError: If the global ID format is invalid or decoding fails.
    """
    try:
        decoded = base64.b64decode(global_id.encode("ascii")).decode("utf-8")
    except Exception as exc:
        raise ValueError(f"Invalid global ID encoding: {global_id}") from exc

    if ":" not in decoded:
        raise ValueError(
            f"Global ID missing type prefix. Expected format 'TypeName:id', got '{decoded}'"
        )

    type_name, identifier = decoded.split(":", 1)
    return type_name, identifier


# ✅ GOOD — Resolver validates global ID type before fetching from database
@strawberry.type
class Query:
    @strawberry.field(description="Fetch a user by their global ID")
    async def node(self, info, id: strawberry.ID) -> Optional["Node"]:
        """Global Node interface resolver — supports any type."""
        type_name, identifier = decode_global_id(str(id))

        # Type-safe dispatch based on decoded type prefix
        if type_name == "User":
            return await fetch_user_by_id(identifier)
        elif type_name == "Order":
            return await fetch_order_by_id(identifier)
        else:
            raise ValueError(f"Unknown node type: {type_name}")


# ❌ BAD — Exposing raw database UUID directly to the client
@strawberry.type
class BadQuery:
    @strawberry.field(description="Fetch user by raw ID")
    async def get_user(self, info, user_id: str) -> "User":
        """Client can enumerate: try '1', '2', '3'... or guess UUID format."""
        return await fetch_user_by_id(user_id)  # No type safety, no prefix check

```

### Pattern 4: Custom Scalars for Domain Concepts

Using `str` or `float` for domain concepts loses semantic meaning and validation. Custom scalars encode the domain vocabulary directly into the type system and enable centralized validation logic.

```python
import email_validator
import strawberry
from datetime import datetime, timezone
from typing import Any


# ✅ GOOD — Email scalar validates format at parse time
class Email:
    """Custom scalar for validated email addresses.

    Rejects invalid emails during query/mutation argument parsing,
    before the resolver even executes. This moves validation from
    resolver-level to schema-level.
    """

    @staticmethod
    def serialize(value: str) -> str:
        return value.lower()  # Emails are case-insensitive in the local part

    @staticmethod
    def parse_value(value: Any) -> str:
        if not isinstance(value, str):
            raise TypeError(f"Email must be a string, got {type(value).__name__}")
        try:
            email_validator.validate_email(value, check_deliverability=False)
        except email_validator.EmailNotValidError as exc:
            raise ValueError(f"Invalid email address: {exc}") from exc
        return value.strip().lower()


# ✅ GOOD — URL scalar validates RFC 3986 structure
class URL:
    """Custom scalar for validated absolute URLs."""

    @staticmethod
    def serialize(value: str) -> str:
        return value

    @staticmethod
    def parse_value(value: Any) -> str:
        if not isinstance(value, str):
            raise TypeError(f"URL must be a string, got {type(value).__name__}")
        if not value.startswith(("http://", "https://")):
            raise ValueError("URL must be an absolute HTTP(S) URL")
        # Additional validation: length limit, allowed characters
        if len(value) > 2048:
            raise ValueError("URL exceeds maximum length of 2048 characters")
        return value


# ✅ GOOD — CurrencyAmount scalar prevents float precision issues
@strawberry.scalar(
    description="Monetary amount in smallest currency unit (cents, pence, etc.)",
)
class CurrencyAmount:
    """Represents a monetary value as an integer to avoid floating-point errors.

    Clients send and receive values in cents (e.g., 1999 = $19.99).
    This eliminates the classic `0.1 + 0.2 != 0.3` problem entirely.
    """

    @staticmethod
    def serialize(value: int) -> int:
        if value < -999_999_999_999 or value > 999_999_999_999:
            raise ValueError("Currency amount out of range")
        return value

    @staticmethod
    def parse_value(value: Any) -> int:
        if isinstance(value, float):
            # Rounding floats to cents is lossy — prefer integer input
            raise TypeError(
                "CurrencyAmount must be an integer (cents), not a float. "
                "Use 1999 for $19.99, not 19.99."
            )
        if not isinstance(value, int):
            raise TypeError(f"CurrencyAmount must be an int, got {type(value).__name__}")
        return value


# ✅ GOOD — DateTime scalar with timezone awareness and format enforcement
@strawberry.scalar(description="ISO 8601 datetime string with timezone (UTC)")
class ISODateTime:
    """Custom scalar for timezone-aware ISO 8601 datetimes.

    Accepts only strings in RFC 3339 / ISO 8601 format with UTC offset or Z suffix.
    Rejects naive datetimes, non-ISO formats, and arbitrary string values.
    """

    @staticmethod
    def serialize(value: datetime) -> str:
        if value.tzinfo is None:
            raise TypeError("DateTime must be timezone-aware (UTC)")
        return value.isoformat()

    @staticmethod
    def parse_value(value: Any) -> datetime:
        if not isinstance(value, str):
            raise TypeError(f"DateTime must be an ISO 8601 string, got {type(value).__name__}")
        try:
            parsed = datetime.fromisoformat(value)
        except ValueError as exc:
            raise ValueError(
                f"Invalid ISO 8601 datetime: '{value}'. "
                f"Expected format: '2025-06-15T14:30:00+00:00' or '2025-06-15T14:30:00Z'"
            ) from exc

        if parsed.tzinfo is None:
            raise ValueError("DateTime must include timezone information")
        return parsed


# ❌ BAD — Using plain str for email, float for money, no validation at all
@strawberry.type
class BadTypes:
    @strawberry.field(description="Send notification")
    async def send_notification(
        self,
        to_email: str,          # Accepts "not-an-email" or "UPPERCASE@DOMAIN.COM"
        amount: float,           # Prone to 0.1 + 0.2 = 0.30000000000000004
        callback_url: str,       # Accepts "javascript:alert(1)" or relative paths
    ) -> bool:
        """No type-level validation — every resolver must manually check."""
        return True


# ✅ GOOD — All domain concepts have dedicated scalar types with built-in validation
@strawberry.type
class GoodTypes:
    @strawberry.mutation(description="Send a payment notification")
    async def send_payment_notification(
        self,
        to_email: Email,           # Invalid emails rejected at parse time
        amount_cents: CurrencyAmount,  # Integer only — no float precision issues
        webhook_url: URL,          # Must be absolute http(s):// URL
    ) -> bool:
        """Types are validated by the GraphQL engine before this resolver runs."""
        return True
```

### Pattern 5: Schema Evolution with Deprecation Directives

When removing or replacing fields, apply `@deprecated` first and maintain backward compatibility during a transition period. Strawberry's `deprecation_reason` parameter on `strawberry.field()` generates the standard GraphQL `@deprecated` directive in the SDL.

```python
import strawberry
from typing import Optional


@strawberry.type(description="User profile data")
class User:
    id: strawberry.ID
    email: str
    display_name: str

    # Deprecated field — clients should migrate to 'full_name'
    first_name: Optional[str] = strawberry.field(
        default=None,
        deprecation_reason="Use 'full_name' instead. This field will be removed in v3.0.",
        description="Legacy first name field (deprecated)",
    )

    # Deprecated field — replaced by the new avatar relationship
    profile_picture_url: Optional[str] = strawberry.field(
        default=None,
        deprecation_reason="Use 'avatar.url' field instead. Supports multiple sizes and CDN optimization.",
        description="Legacy profile picture URL (deprecated)",
    )

    # New replacement fields
    full_name: str = strawberry.field(description="Complete display name")

    @strawberry.field(description="Avatar image with size variants")
    async def avatar(self) -> "Avatar":
        return await fetch_avatar_for_user(str(self.id))


# SDL output for the deprecated field (via schema.as_str()):
#   firstName: String @deprecated(reason: "Use 'full_name' instead. This field will be removed in v3.0.")

# Clients querying with introspection see:
# {
#   user(id: "VXNlcjoxMjM=") {
#     fullName
#     firstName    # Still works but clients get a deprecation warning in Apollo Studio
#   }
# }
```

---

## Constraints

### MUST DO

1. **Use `ID!` (non-null) for all primary key identifiers** — Nullable IDs violate the GraphQL spec's contract that `ID` represents a unique identifier. Every type's `id` field should be `strawberry.ID` with `required=True`.

2. **Group mutation arguments into `@strawberry.input` objects** — Never spread more than one non-scalar argument on a root mutation field. Each input type should group logically related parameters and include field-level docstrings.

3. **Use `interface` when types share fields that callers query together** — If three or more return types share the same field name and callers want to query that field without inline fragments, model it as an interface. This reduces client-side complexity significantly.

4. **Encode global IDs with type prefixes** — Always use `"TypeName:identifier"` format before base64 encoding. This enables type-safe dispatch in `node(id)` resolvers and prevents ID format changes from breaking API consumers.

5. **Add docstrings to every type, interface, input, union member, and field** — Strawberry uses Python docstrings as the source for GraphQL descriptions. Fields without descriptions produce empty strings in introspection queries, making your API unusable for tooling like Apollo Studio Explorer.

### MUST NOT DO

1. **Never expose raw database IDs directly to clients** — Sequential integers enable enumeration attacks. UUIDs are predictable in format. Always use opaque base64-encoded `"Type:id"` global IDs that hide internal identifier schemes.

2. **Never use unions for types that share common fields** — Unions force callers to use inline fragments (`... on TypeA { field }`) for every shared field. If types share structure, use an interface instead.

3. **Never remove a field without deprecating it first** — Direct removal breaks all existing clients. Always apply `@deprecated(reason="migration path")`, announce the timeline, and remove after at least two minor versions.

4. **Never use `str`, `float`, or `Any` for domain concepts that have semantic meaning** — Email addresses, URLs, currency amounts, and dates each carry domain-specific validation rules. Custom scalars encode these constraints at parse time rather than pushing them into resolver logic.

5. **Never define a type without specifying nullability explicitly** — `str` means the field can be null. `strawberry.ID` with required means non-null. Confusing these leads to incorrect client expectations and broken GraphQL contracts.

---

## Output Template

When implementing or reviewing a GraphQL schema, produce:

1. **Type Definitions** — Complete `@strawberry.type`, `@strawberry.interface`, `@strawberry.input`, `@strawberry.union`, and custom scalar class definitions with full type annotations and docstrings
2. **Query/Mutation Root** — Root types enumerating all entry points, each using input objects for mutations and returning properly paginated lists
3. **Global ID Encoding Map** — A table listing every entity type, its prefix string, and example encoded IDs (e.g., `User → "VXNlcjoxMjM="`)
4. **Deprecation Inventory** — List of all deprecated fields with their replacement field, deprecation reason, and planned removal version
5. **Custom Scalar Registry** — Table of all custom scalars, their Python class names, serialization logic, and validation constraints

---

## Related Skills

| Skill | Purpose |
|---|---|
| `graphql-dataloader-pattern` | Optimize resolver data fetching to eliminate N+1 queries after schema is designed |
| `graphql-error-handling-validation` | Handle runtime errors and input validation failures that occur during execution |
| `graphql-federation` | Split a well-designed schema into federated subgraphs with entity sharing via `@key` directives |
| `graphql-subscriptions` | Add real-time event streaming to the schema by defining Subscription root type fields |

---

## References

- **GraphQL Specification** (latest): https://spec.graphql.org/ — The canonical reference for scalar types, interfaces, unions, directives, deprecation, and the introspection system
- **Strawberry GraphQL Documentation**: https://strawberry.rocks/ — Python-first GraphQL framework with native type-hint support, custom scalars, input validation decorators, and SDL generation from code
- **Relay Global Object Identification Spec**: https://relay.dev/docs/guides/graphql/object-identification/ — Cursor-based global ID encoding pattern adopted by Strawberry's `strawberry.ID` type
- **API Design Guidelines (Stripe)**: https://stripe.com/docs/api — Industry best practices for API field naming, nullability conventions, and deprecation strategies applied to GraphQL
