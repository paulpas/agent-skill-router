---
name: api-versioning-strategies
description: Implements API versioning strategies (URL path, Accept header, query parameter, media type) to manage backward compatibility, deprecation timelines, and migration paths while maintaining stable contracts for consumers.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: api versioning, url path versioning, accept header, breaking changes, api deprecation, sunset header, backward compatibility, api migration, stripe api versioning, github api version, twilio api version, how do i version my api, rest api lifecycle, api contract stability
  role: implementation
  scope: implementation
  output-format: code
  related-skills: api-design, input-validation, code-review, security-review
---

# API Versioning Strategies

Manages the full API versioning lifecycle — choosing a versioning strategy, classifying breaking vs. compatible changes, deprecating old versions gracefully, and guiding consumers through migrations with zero downtime.

## TL;DR Checklist

- [ ] Choose URL path versioning for public APIs (most discoverable); Accept header for internal/B2B APIs
- [ ] Classify every change as BREAKING or COMPATIBLE before release
- [ ] Always include `Deprecation` and `Sunset` headers when serving deprecated versions
- [ ] Support dual-version operation during migration windows (minimum 90 days)
- [ ] Never remove a field from responses — mark it deprecated, keep returning it for the sunset period
- [ ] Never make an optional field required in an existing endpoint

---

## When to Use

Use this skill when:

- Designing versioning strategy for a new public or internal API
- Planning to introduce breaking changes to an existing API
- Deprecating old API versions and migrating consumers
- Classifying whether a proposed API change is breaking or compatible
- Building migration guides for API consumers
- Auditing an existing API for proper versioning and deprecation practices

## When NOT to Use

Avoid this skill for:

- Internal microservice communication (use gRPC schema evolution instead)
- GraphQL APIs (they have their own evolution model — see `coding-graphql-schema-design`)
- UI/frontend versioning (separate concern from API contracts)

---

## Core Workflow

1. **Select Versioning Strategy** — Match the strategy to your audience and constraints. URL path for public discoverability; Accept header for clean URLs and B2B clients; media type negotiation when you already use content negotiation.  **Checkpoint:** The chosen strategy must support all consumers without requiring SDK changes for compatible updates.
2. **Classify the Change** — Determine whether each proposed change is BREAKING or COMPATIBLE using the classification rules below.  **Checkpoint:** All breaking changes MUST go into a new version; compatible changes MAY be added to any version.
3. **Implement Versioned Endpoints** — Code the version-specific logic with typed signatures, docstrings, and consistent error handling.  **Checkpoint:** Each version returns exactly what its contract promises — nothing more, nothing less.
4. **Add Deprecation Signals** — Serve deprecated versions with `Deprecation: true` and `Sunset` headers. Provide migration guidance in response bodies.  **Checkpoint:** Clients receive at least 90 days' notice before a version is retired.
5. **Support Migration** — Run both old and new versions simultaneously during the migration window. Track adoption via analytics.  **Checkpoint:** No consumer is broken by the sunset date.

---

## Implementation Patterns / Reference Guide

### Strategy 1: URL Path Versioning (`/v1/`, `/v2/`)

Most common for public APIs. The version is part of the route, making it explicit, cacheable, and trivially discoverable.

**How it works:** Every endpoint is prefixed with a version segment. `GET /api/v1/users` and `GET /api/v2/users` are entirely separate routes.

**Pros:**
- Trivially discoverable — clients see the version in the URL
- Perfect cache isolation per version (CDN caches don't collide)
- No client SDK changes needed for compatible updates within a version
- Easy to A/B test different versions
- Every HTTP method, header, and query parameter works naturally

**Cons:**
- Version exposed in every URL (some consider it ugly)
- Route duplication if versions share logic
- Harder to enforce "only one version active"

**When to use:** Public APIs where discoverability matters most. Used by Stripe (`/v1/customers`), Google Cloud, many REST APIs.

**Real-world example — Stripe:**
```
GET https://api.stripe.com/v1/customers
GET https://api.stripe.com/v1/charges
POST https://api.stripe.com/v1/payment_intents
```

```python
from typing import Any
from fastapi import FastAPI, APIRouter, Request
from pydantic import BaseModel, Field


# --- V1: Legacy flat response structure ---
class UserResponseV1(BaseModel):
    """Legacy user model — flat structure returned by /v1 endpoints."""
    id: str
    name: str
    email: str
    created_at: str  # ISO 8601 string


# --- V2: Structured response with metadata (JSON:API inspired) ---
class UserAttributes(BaseModel):
    """Structured user attributes used in V2 responses."""
    name: str = Field(..., description="Full display name")
    email: str = Field(..., description="Primary email address")
    created_at: str = Field(..., description="Account creation timestamp in ISO 8601")


class UserLinks(BaseModel):
    """Hypermedia links for a user resource."""
    self: str = Field(..., description="Link to this resource")
    orders: str | None = Field(None, description="Link to user's order history")


class UserData(BaseModel):
    """V2 user response envelope with data and metadata."""
    data: UserAttributes
    links: UserLinks


app = FastAPI(title="Versioned API Example")

router_v1 = APIRouter(prefix="/api/v1", tags=["v1"])
router_v2 = APIRouter(prefix="/api/v2", tags=["v2"])


@router_v1.get("/users/{user_id}", response_model=UserResponseV1)
async def get_user_v1(user_id: str) -> UserResponseV1:
    """Retrieve a user by ID using the legacy flat structure.

    This endpoint returns a flat JSON object for backward compatibility
    with clients that expect the V1 response shape.

    Args:
        user_id: The unique identifier of the user.

    Returns:
        UserResponseV1 with id, name, email, created_at fields.

    Raises:
        HTTPException 404 if user not found.
    """
    # Simulated database lookup
    user = {"id": user_id, "name": "Alice Smith", "email": "alice@example.com", "created_at": "2024-01-15T08:30:00Z"}
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    return UserResponseV1(**user)


@router_v2.get("/users/{user_id}", response_model=UserData)
async def get_user_v2(user_id: str, request: Request) -> UserData:
    """Retrieve a user by ID using the structured V2 envelope.

    V2 wraps the response in a data/metadata envelope with hypermedia
    links, following JSON:API conventions for better discoverability.

    Args:
        user_id: The unique identifier of the user.
        request: FastAPI request object for generating self-link URLs.

    Returns:
        UserData with attributes (name, email, created_at) and links.

    Raises:
        HTTPException 404 if user not found.
    """
    from fastapi import HTTPException
    base_url = str(request.base_url).rstrip("/")
    user = {"id": user_id, "name": "Alice Smith", "email": "alice@example.com", "created_at": "2024-01-15T08:30:00Z"}
    if not user:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")

    return UserData(
        data=UserAttributes(
            name=user["name"],
            email=user["email"],
            created_at=user["created_at"],
        ),
        links=UserLinks(
            self=f"{base_url}/api/v2/users/{user_id}",
            orders=f"{base_url}/api/v2/users/{user_id}/orders",
        ),
    )


app.include_router(router_v1)
app.include_router(router_v2)
```

### Strategy 2: Accept Header Versioning (`Accept: application/vnd.myapi.v2+json`)

Uses the HTTP `Accept` header to negotiate which version of the response format to return. The URL stays clean and versionless.

**How it works:** The client specifies the desired API version in the `Accept` header. The server routes to the appropriate handler based on the vendor-specific media type.

**Pros:**
- Clean, stable URLs — no `/v1/` or `/v2/` prefixes
- Content negotiation is a well-understood HTTP mechanism (RFC 7231)
- Same endpoint can return different representations

**Cons:**
- Harder to debug — version not visible in the URL
- Caching complications: `Vary: Accept` means the CDN must cache multiple variants per URL
- Less discoverable — developers can't guess the endpoint structure from a browser visit
- Not all HTTP clients/proxies handle vendor media types well

**When to use:** Internal APIs, B2B partnerships where clean URLs matter, or when you already do content negotiation. Used by GitHub (`Accept: application/vnd.github.v3+json`).

**Real-world example — GitHub:**
```bash
# GitHub uses Accept header with date-based versioning
curl -H "X-GitHub-Api-Version: 2022-11-28" https://api.github.com/users/octocat
# Response includes: x-github-api-version-selected: 2022-11-28
```

```python
from typing import Any
from fastapi import FastAPI, APIRouter, Request, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel


app = FastAPI(title="Accept Header Versioning Example")


class UserV1(BaseModel):
    """Legacy flat user representation for Accept: application/vnd.myapi.v1+json."""
    id: str
    name: str
    email: str


class UserV2(BaseModel):
    """Structured user representation with metadata for Accept: application/vnd.myapi.v2+json."""
    data: dict[str, Any]
    meta: dict[str, str] = {
        "api_version": "2.0",
        "documentation": "https://api.example.com/docs/v2",
    }


SUPPORTED_VERSIONS = {
    "application/vnd.myapi.v1+json": UserV1,
    "application/vnd.myapi.v2+json": UserV2,
}

router_users = APIRouter(tags=["users"])


@router_users.get("/users/{user_id}")
async def get_user_with_accept_version(
    user_id: str,
    accept_header: str = Header(..., alias="Accept"),
):
    """Route to the correct version based on Accept header content negotiation.

    Clients specify the desired API version via the Accept header using
    vendor-specific media types. The server returns the matching schema.

    Supported versions:
        - application/vnd.myapi.v1+json (legacy flat structure)
        - application/vnd.myapi.v2+json (structured with metadata)

    Args:
        user_id: The unique identifier of the user.
        accept_header: The Accept header value from the request.

    Returns:
        JSONResponse with the matched version's schema.
    """
    # Simulated user data
    user_data = {
        "id": user_id,
        "name": "Alice Smith",
        "email": "alice@example.com",
        "created_at": "2024-01-15T08:30:00Z",
    }

    # Match Accept header to supported version
    for media_type, model in SUPPORTED_VERSIONS.items():
        if media_type in accept_header or "application/json" in accept_header and media_type == list(SUPPORTED_VERSIONS.keys())[-1]:
            if issubclass(model, UserV2):
                return JSONResponse(
                    content={
                        "data": user_data,
                        "meta": {"api_version": "2.0", "documentation": "https://api.example.com/docs/v2"},
                    }
                )
            else:
                return JSONResponse(
                    content={"id": user_data["id"], "name": user_data["name"], "email": user_data["email"]}
                )

    # No matching version — fall back to v1 as default
    return JSONResponse(
        content={
            "error": "Unsupported media type. Supported: application/vnd.myapi.v1+json, application/vnd.myapi.v2+json",
            "supported_versions": list(SUPPORTED_VERSIONS.keys()),
        },
        status_code=406,
    )


app.include_router(router_users)
```

### Strategy 3: Query Parameter Versioning (`?version=1`)

The version is passed as a query parameter. Simple but considered the least elegant approach.

**How it works:** `GET /api/users?version=1` vs `GET /api/users?version=2`. A single route handles all versions.

**Pros:**
- Extremely simple to implement — one route, version branching inside the handler
- No URL path duplication
- Easy to test different versions in a browser

**Cons:**
- Pollutes query parameters
- Same `Vary` problems as Accept header versioning for caching
- Not RESTful — version is not a resource attribute
- Harder to document (Swagger/OpenAPI struggles with dynamic routes)
- Most widely criticized approach by API designers

**When to use:** Internal tools, quick prototypes, or when you absolutely cannot change URLs. Rarely recommended for production public APIs.

### Strategy 4: Media Type / Content Negotiation (`Accept: application/json;version=1`)

Embeds version information in the media type itself, without vendor-specific subtypes.

**How it works:** `Accept: application/json; version=1` or `Accept: application/vnd.api+json;version=1`. Similar to Accept header versioning but uses the standard media type parameters.

**Pros:**
- Uses standard HTTP content negotiation (RFC 7231)
- Cleaner than query params
- Compatible with existing caching infrastructure if `Vary` is set properly

**Cons:**
- Media type parameters are rarely used in practice — most tools don't support them well
- OpenAPI/Swagger documentation struggles with media type parameters
- Harder to test and debug in browsers

**When to use:** When you want standard HTTP semantics and your tooling supports media type parameters. Less common than vendor-specific subtypes.

### Strategy 5: Date-Based Versioning (Stripe/GitHub approach)

Uses a date string as the version identifier rather than a number. `Stripe-Version: 2024-12-18.acacia` or `X-GitHub-Api-Version: 2022-11-28`.

**How it works:** The API endpoint itself is not versioned. Instead, the client sends a date-based header indicating which API "snapshot" to use. The server maps dates to API implementations internally.

**Pros:**
- URLs are completely clean — no `/v1/`, no vendor subtypes in Accept
- Backwards compatible by default — old dates keep working forever
- Natural migration path: upgrade the date header when you're ready
- Version is human-readable (you know exactly which era of the API it represents)

**Cons:**
- Requires SDK/client-side changes to update the version header
- Less discoverable — consumers must read docs to know which version string to use
- Harder to communicate "what changed between dates" without good changelogs
- The server must maintain backward compatibility indefinitely for old date headers

**When to use:** Mature, high-volume APIs where URL cleanliness matters and you have SDK support. Used by Stripe (`Stripe-Version` header) and GitHub (`X-GitHub-Api-Version` header).

**Real-world example — Stripe (2024-2025):**
```bash
# Stripe uses date-based versioning via custom header
curl -u sk_test_...: \
  -H "Stripe-Version: 2024-12-18.acacia" \
  https://api.stripe.com/v1/customers

# The /v1/ path is stable (never changes); the Stripe-Version header
# controls which feature set is active. This means the URL never changes,
# only the header does when you want new features.
```

**Real-world example — GitHub:**
```bash
# GitHub uses date-based versioning via X-GitHub-Api-Version header
curl -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/users/octocat

# Response confirms which version was selected:
# x-github-api-version-selected: 2022-11-28
```

---

## Breaking vs. Non-Breaking Changes

### Classification Rules

A **breaking change** is any modification that causes existing clients to fail — either by returning unexpected data shapes, changing semantics, or removing functionality. A **compatible (non-breaking) change** is one that existing clients will continue to process correctly without modification.

### Breaking Changes (MUST go into a new version)

| Change | Why It Breaks | Example |
|--------|---------------|---------|
| Removing an endpoint | Clients calling the URL get 404 | Deleting `/api/v1/legacy/reports` |
| Removing a response field | Parsers that read `.data.field` get `undefined` / `KeyError` | Removing `email` from user response |
| Renaming a field | Same as removing + adding — old names return null | `user_name` → `name` in response JSON |
| Changing a field type | Type coercion may fail or lose data | `age: int` → `age: string` |
| Making an optional field required | Existing requests without the field get 422 | Adding `phone_number: required` to POST /users |
| Changing error codes/messages (for coded errors) | Clients matching on `error.code` break | `INVALID_EMAIL` → `VALIDATION_EMAIL_INVALID` |
| Removing an enum value | Clients sending that value get 422 | Removing `"archived"` from `status` enum |
| Changing the base URL or domain | DNS/client config breaks entirely | Moving from `api.example.com` to `v2-api.example.com` |
| Changing HTTP method semantics | PUT clients calling POST endpoints fail | Converting `GET /users/{id}` to `DELETE` |

### Compatible Changes (MAY be added to any version)

| Change | Why It's Safe | Example |
|--------|---------------|---------|
| Adding a new endpoint | Existing routes unaffected | Adding `/api/v1/teams` when only `/api/v1/users` exists |
| Adding an optional request parameter | Existing requests without the param still work | Adding `?include_metadata=false` to list endpoints |
| Adding a response field | Parsers that ignore unknown fields are fine (JSON spec) | Adding `avatar_url` to user response |
| Adding an enum value | Existing clients don't send the new value | Adding `"suspended"` to `status` enum |
| Relaxing validation rules | Stricter→looser is always safe | Accepting both `"us"` and `"USA"` for country codes |
| Changing default sort order | Clients explicitly sorting are unaffected | Default from alphabetical → by creation date |
| Adding pagination parameters | Existing requests without pagination still return full results | Adding `?limit=100&cursor=...` to list endpoints |
| Returning more data in a response array | Array consumers iterate over all items | Adding new fields to each item in `/users` list response |

### Classification Decision Tree

```
Is the change to an existing endpoint's response shape?
├── YES → Is it adding a field (not required)?
│         ├── YES → COMPATIBLE ✓
│         └── NO  → Is it removing or renaming a field?
│                   ├── YES → BREAKING ✗
│                   └── NO  → Is it changing a field type?
│                             ├── YES → BREAKING ✗
│                             └── NO  → COMPATIBLE ✓

Is the change to an existing endpoint's request handling?
├── YES → Is it adding an optional parameter?
│         ├── YES → COMPATIBLE ✓
│         └── NO  → Is it making a required field?
│                   ├── YES → BREAKING ✗
│                   └── NO  → Is it removing validation constraints?
│                             ├── YES → COMPATIBLE ✓ (stricter→looser)
│                             └── NO  → BREAKING ✗

Is the change adding a new endpoint?
└── YES → COMPATIBLE ✓
```

### Real-World Examples of Breaking Changes

```python
# ❌ BREAKING — Removing a field from response
class UserResponseOLD(BaseModel):
    id: str
    name: str
    email: str          # ← REMOVED in V2

# Existing client code breaks:
#   user["email"]  → KeyError / undefined


# ✅ COMPATIBLE — Adding a new field to response
class UserResponseNew(BaseModel):
    id: str
    name: str
    email: str
    phone: str | None = None  # ← NEW optional field

# Existing client code still works — it just ignores the new field.


# ❌ BREAKING — Changing a field type
class OrderV1(BaseModel):
    total_cents: int        # ← integer, e.g., 1999

class OrderV2(BaseModel):
    total_cents: str         # ← STRING, e.g., "1999"

# Existing client that does: price = order["total_cents"] * 2
#   → TypeError: can't multiply sequence by int


# ✅ COMPATIBLE — Adding an optional request parameter
@router.post("/users")
async def create_user(
    body: CreateUserRequest,     # existing required fields
    notify_admin: bool = False,   # ← NEW optional parameter
):
    """Adding this parameter doesn't break any existing client."""
    ...
```

---

## Deprecation and Migration Patterns

### Standard HTTP Headers for Deprecation

The HTTP specification defines three headers specifically for API deprecation. Every deprecated endpoint should include these in its responses:

| Header | Purpose | Example Value |
|--------|---------|---------------|
| `Deprecation` | Signals the resource is deprecated | `true` or a timestamp |
| `Sunset` | Date after which the version will be unavailable | `Sat, 01 Jun 2027 00:00:00 GMT` |
| `Link` | Link to migration documentation or successor version | `<https://docs.example.com/migration/v1-to-v2>; rel="successor-version"` |

```python
from typing import Any
from datetime import datetime, timezone


def add_deprecation_headers(
    response: Any,
    sunset_date: datetime = datetime(2027, 6, 1, tzinfo=timezone.utc),
    migration_url: str = "https://docs.example.com/migration/v1-to-v2",
) -> None:
    """Attach standard deprecation headers to an API response.

    These headers inform HTTP clients that the served version is deprecated
    and provide a sunset date and migration guidance. Standard HTTP clients
    (curl, Postman, SDKs) should surface these warnings to developers.

    Args:
        response: The FastAPI Response object to modify in-place.
        sunset_date: The date after which this API version will return 410 Gone.
        migration_url: URL to the migration guide for consumers.
    """
    from fastapi import Response as FastAPIResponse
    if isinstance(response, FastAPIResponse):
        response.headers["Deprecation"] = "true"
        response.headers["Sunset"] = sunset_date.strftime("%a, %d %b %Y %H:%M:%S GMT")
        response.headers["Link"] = f'<{migration_url}>; rel="successor-version"'


# Usage in a FastAPI middleware or endpoint
from fastapi import FastAPI, Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

DEPRECATION_CONFIG = {
    "sunset_date": datetime(2027, 6, 1, tzinfo=timezone.utc),
    "migration_url": "https://docs.example.com/migration/v1-to-v2",
}


class DeprecationMiddleware(BaseHTTPMiddleware):
    """Automatically adds deprecation headers to v1 API responses."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        if "/api/v1/" in request.url.path:
            add_deprecation_headers(
                response,
                sunset_date=DEPRECATION_CONFIG["sunset_date"],
                migration_url=DEPRECATION_CONFIG["migration_url"],
            )

        return response


app = FastAPI()
app.add_middleware(DeprecationMiddleware)
```

### Sunset Timeline Best Practices

| Phase | Timeline | Action | Client Behavior |
|-------|----------|--------|-----------------|
| **Announcement** | Day 0 | Add `Deprecation` and `Sunset` headers; publish changelog | Clients see warnings in response headers |
| **Grace period** | Days 1–90 | Serve both old and new versions; log version usage | Clients have time to migrate without pressure |
| **Hard warning** | Day +60 | Add `Warning: 999` header with deprecation message | Clients get HTTP Warning header (RFC 7234) |
| **Sunset** | Day +90 | Return `410 Gone` for deprecated endpoints; remove from docs | Clients must migrate or update SDKs |

```python
from datetime import datetime, timezone


def check_sunset_status(
    sunset_date: datetime = datetime(2027, 6, 1, tzinfo=timezone.utc),
) -> dict[str, Any]:
    """Determine the current deprecation phase based on sunset date.

    Returns a status dict that can be used to conditionally add headers
    or modify responses based on how close the sunset date is.

    Args:
        sunset_date: The date after which the API version will return 410 Gone.

    Returns:
        Dict with 'phase', 'days_remaining', 'warning_header' keys.
    """
    now = datetime.now(timezone.utc)
    days_remaining = (sunset_date - now).days

    if days_remaining > 90:
        return {
            "phase": "deprecation_announced",
            "days_remaining": days_remaining,
            "warning_header": None,
            "headers": {"Deprecation": "true"},
        }
    elif days_remaining > 30:
        return {
            "phase": "migration_window",
            "days_remaining": days_remaining,
            "warning_header": f"999; url=\"https://docs.example.com/migration\"; msg=\"API v1 deprecated; sunset in {days_remaining} days\"",
            "headers": {"Deprecation": "true", "Warning": f"999 sunset-{sunset_date.strftime('%Y%m%d')} \"API v1 will be unavailable after {sunset_date.strftime('%b %d, %Y')}\""},
        }
    elif days_remaining > 0:
        return {
            "phase": "final_warning",
            "days_remaining": days_remaining,
            "warning_header": f"999; url=\"https://docs.example.com/migration\"; msg=\"URGENT: API v1 sunsetting in {days_remaining} days\"",
            "headers": {"Deprecation": "true", "Warning": f"999 sunset-{sunset_date.strftime('%Y%m%d')} \"CRITICAL: API v1 will be unavailable after {sunset_date.strftime('%b %d, %Y')}\""},
        }
    else:
        return {
            "phase": "sunsetting",
            "days_remaining": days_remaining,
            "warning_header": None,
            "headers": {},  # Return 410 Gone instead
        }


# Usage in endpoint to conditionally respond
async def get_user_v1_with_sunset(user_id: str):
    """V1 endpoint with dynamic sunset behavior."""
    status = check_sunset_status()

    if status["phase"] == "sunsetting":
        from fastapi import HTTPException
        raise HTTPException(
            status_code=410,
            detail={
                "error": {
                    "code": "API_VERSION_SUNSET",
                    "message": f"API v1 is no longer available. Please migrate to v2.",
                    "migration_url": "https://docs.example.com/migration/v1-to-v2",
                    "sunset_date": "2027-06-01T00:00:00Z",
                }
            },
        )

    # ... return user data with deprecation headers ...
    response = JSONResponse(content={"id": user_id, "name": "Alice"})
    add_deprecation_headers(response)
    if status.get("warning_header"):
        response.headers["Warning"] = status["warning_header"]
    return response
```

### Dual-Version Support During Migration

Run both versions simultaneously. This is the only safe migration path for public APIs.

```python
from typing import Any
from fastapi import FastAPI, APIRouter, Request
from pydantic import BaseModel


app = FastAPI(title="Dual-Version Migration Example")


class CreateUserRequest(BaseModel):
    """Shared request model — same contract across versions."""
    name: str
    email: str


class UserResponseV1(BaseModel):
    id: str
    name: str
    email: str
    created_at: str


class UserResponseV2(BaseModel):
    data: dict[str, Any]
    metadata: dict[str, str] = {"api_version": "2.0"}


router_v1 = APIRouter(prefix="/api/v1")
router_v2 = APIRouter(prefix="/api/v2")

# Shared business logic — both versions call the same service layer
async def create_user_service(data: CreateUserRequest) -> dict[str, Any]:
    """Core user creation logic shared across all API versions.

    This isolates business logic from version-specific response formatting.
    Both V1 and V2 routes call this function and format the result differently.

    Args:
        data: Validated create user request.

    Returns:
        Dictionary with id, name, email, created_at fields.
    """
    # Database insert would go here
    return {
        "id": "usr_abc123",
        "name": data.name,
        "email": data.email,
        "created_at": "2024-06-15T10:00:00Z",
    }


@router_v1.post("/users", response_model=UserResponseV1)
async def create_user_v1(body: CreateUserRequest) -> UserResponseV1:
    """V1: Returns flat response structure for backward compatibility."""
    user = await create_user_service(body)
    return UserResponseV1(**user)


@router_v2.post("/users", response_model=UserResponseV2)
async def create_user_v2(body: CreateUserRequest, request: Request) -> UserResponseV2:
    """V2: Returns structured envelope with metadata."""
    user = await create_user_service(body)
    return UserResponseV2(
        data=user,
        metadata={
            "api_version": "2.0",
            "documentation": str(request.base_url).rstrip("/") + "/docs",
            "migration_guide": "https://docs.example.com/migration/v1-to-v2",
        },
    )


app.include_router(router_v1)
app.include_router(router_v2)
```

### Migration Guide Template

Every deprecated version must have a corresponding migration guide.

```markdown
# Migration Guide: API v1 → v2

## What Changed

### Response Structure
- V1 returns flat objects; V2 wraps in `data` envelope with `metadata`
- All dates now use ISO 8601 format consistently (`2024-01-15T08:30:00Z`)

### Breaking Changes
- **None** — this migration is fully compatible at the data level
- The only change is response envelope shape; field values are identical

## Code Migration

### Before (v1)
```python
import requests
response = requests.get("https://api.example.com/api/v1/users/abc123")
user = response.json()  # {"id": "abc123", "name": "Alice", ...}
print(user["email"])
```

### After (v2)
```python
import requests
response = requests.get("https://api.example.com/api/v2/users/abc123")
user = response.json()  # {"data": {...}, "metadata": {...}}
print(user["data"]["email"])
```

## Timeline

| Date | Event |
|------|-------|
| 2025-06-01 | v1 deprecated — `Deprecation: true` header added |
| 2026-12-01 | v1 sunset — returns 410 Gone |

## Need Help?
- [Full API Reference](https://docs.example.com/api/v2)
- [SDK Migration Scripts](https://github.com/example/migration-tools)
"""
```

---

## BAD vs GOOD Examples

### ❌ BAD — No versioning, breaking changes deployed directly

```python
# ❌ BAD: Modifying existing endpoints without versioning
@app.route("/api/users/<user_id>", methods=["GET"])
def get_user_bad(user_id):
    """This endpoint works fine until you change the response format."""

    # Developer decides to add a new field...
    user = User.get(user_id)
    return jsonify({
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "avatar_url": user.avatar.url,  # ← NEW: existing clients don't expect this
        "profile": {                     # ← NEW NESTED OBJECT: breaks flat parsers
            "bio": user.bio,
            "location": user.location,
        }
    })

# Developer later decides to rename a field...
    return jsonify({
        "user_id": user.id,      # ← RENAMED from "id" — existing clients break
        "full_name": user.name,  # ← RENAMED from "name" — existing clients break
        "email_address": user.email,  # ← RENAMED from "email" — existing clients break
    })

# Developer removes a field...
    return jsonify({
        "user_id": user.id,
        "full_name": user.name,
        # "email_address" removed — clients that read this get undefined/KeyError
    })
```

### ✅ GOOD — Versioned endpoints with clean separation

```python
# ✅ GOOD: Each version has its own route and response model
from fastapi import FastAPI, APIRouter
from pydantic import BaseModel


app = FastAPI()


class UserFlat(BaseModel):
    """V1 response model — flat structure. Stable contract, never changes."""
    id: str
    name: str
    email: str


class UserNested(BaseModel):
    """V2 response model — structured with nested profile data."""
    id: str
    attributes: dict[str, str]
    links: dict[str, str]

    class Config:
        json_schema_extra = {
            "example": {
                "id": "usr_123",
                "attributes": {"name": "Alice", "email": "alice@example.com"},
                "links": {"self": "/api/v2/users/usr_123", "profile": "/api/v2/users/usr_123/profile"},
            }
        }


v1_router = APIRouter(prefix="/api/v1")
v2_router = APIRouter(prefix="/api/v2")


@v1_router.get("/users/{user_id}", response_model=UserFlat)
async def get_user_v1(user_id: str):
    """V1 endpoint — flat structure. Never add/remove/renamed fields here."""
    user = User.get(user_id)
    return UserFlat(id=user.id, name=user.name, email=user.email)


@v2_router.get("/users/{user_id}", response_model=UserNested)
async def get_user_v2(user_id: str):
    """V2 endpoint — structured with nested data and hypermedia links."""
    user = User.get(user_id)
    return UserNested(
        id=user.id,
        attributes={"name": user.name, "email": user.email},
        links={
            "self": f"/api/v2/users/{user_id}",
            "profile": f"/api/v2/users/{user_id}/profile",
        },
    )


app.include_router(v1_router)
app.include_router(v2_router)
```

### ❌ BAD — Deprecation without migration support

```python
# ❌ BAD: Adding a deprecation header but no sunset date or migration path
@app.after_request
def bad_deprecation(response):
    """Just adding 'Deprecation: true' is not enough."""
    if "/api/v1/" in request.path:
        response.headers["Deprecation"] = "true"
        # ← No Sunset header — clients don't know when it goes away
        # ← No Link to migration docs — consumers are stranded
    return response
```

### ✅ GOOD — Complete deprecation with actionable headers

```python
# ✅ GOOD: Full deprecation signal with sunset date and migration link
from datetime import datetime, timezone


@app.after_request
def good_deprecation(response):
    """Complete deprecation signal per HTTP best practices."""
    if "/api/v1/" in request.path:
        response.headers["Deprecation"] = "true"

        # Sunset date: give consumers 18 months to migrate
        sunset = datetime(2027, 6, 1, tzinfo=timezone.utc)
        response.headers["Sunset"] = sunset.strftime("%a, %d %b %Y %H:%M:%S GMT")

        # Link header pointing to migration documentation
        response.headers["Link"] = (
            '<https://docs.example.com/migration/v1-to-v2>; '
            'rel="successor-version"'
        )

        # Warning header for HTTP clients that parse RFC 7234 warnings
        days_left = (sunset - datetime.now(timezone.utc)).days
        response.headers["Warning"] = (
            f'999 sunset-20270601 "API v1 will be unavailable after June 1, 2027"'
        )

    return response
```

---

## Industry Practices (2024–2025)

### Stripe — Date-Based Versioning + Stable URLs

Stripe uses URL path (`/v1/`) for the stable API surface combined with a `Stripe-Version` header for feature control. The `/v1/` prefix never changes; only the date-based version header controls which features are active.

```bash
# The /v1/ path is permanent. Only the Stripe-Version header changes.
curl -H "Stripe-Version: 2024-12-18.acacia" \
  https://api.stripe.com/v1/customers

# Stripe's approach means:
# 1. URL structure never breaks (stable /v1/ prefix)
# 2. New features are opt-in via the version header
# 3. Old feature sets remain available indefinitely
# 4. SDKs manage version headers automatically
```

### GitHub — Accept Header with Date-Based Versions

GitHub uses `X-GitHub-Api-Version` header with date strings for API versioning. The response includes `x-github-api-version-selected` to confirm which version was active.

```bash
# Request with explicit API version
curl -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/owner/repo

# Response confirms the selected version
# x-github-api-version-selected: 2022-11-28
```

GitHub also uses `Deprecation` and `Sunset` headers for deprecated endpoints:
```bash
curl -I "https://api.github.com/repos/owner/repo/commits" 2>&1 | grep -iE "deprecat|sunset|warning"
# Deprecation: true
# Sunset: Sat, 05 Jul 2019 00:00:00 GMT
# Link: <https://docs.github.com/overview/changelog>; rel="successor-version"
```

### Twilio — Date-Based URL Versioning

Twilio embeds the date directly in the URL path. The API base is `https://api.twilio.com/{API_VERSION}/` where `{API_VERSION}` is a date like `2010-04-01`.

```bash
# Twilio's version IS part of the URL path
curl -u ACxxxx:auth_token \
  https://api.twilio.com/2010-04-01/Accounts/ACxxx/Messages.json

# This means the API_VERSION segment can be changed to migrate
# Old versions remain available but deprecated; new dates provide new features
```

### General Industry Consensus (2024–2025)

1. **URL path versioning** remains the most common for public REST APIs — it's the most discoverable and simplest to reason about
2. **Date-based versioning** is growing among mature APIs (Stripe, GitHub, Twilio) where SDKs handle version selection
3. **Accept header versioning** is standard in enterprise/B2B APIs where clean URLs matter
4. **Query parameter versioning** is increasingly avoided — most API designers consider it the least professional approach
5. **90-day minimum sunset periods** are now standard; many mature APIs offer 180–365 days
6. **No breaking changes after v1** is the dominant philosophy — most stable public APIs treat their initial version as "final" and add rather than change

---

## Constraints

### MUST DO
- Classify every API change as BREAKING or COMPATIBLE before release — never assume
- Use URL path versioning (`/api/vN/`) for public-facing APIs; Accept header for B2B/internal
- Include `Deprecation: true`, `Sunset` (RFC 1123 date), and `Link` headers on all deprecated endpoints
- Support at least two active versions simultaneously during migration windows
- Maintain a minimum 90-day sunset notice period before retiring any version
- Write OpenAPI/Swagger documentation for each API version separately — never maintain docs per-version in one file
- Use typed request/response models (Pydantic, zod, TypeScript interfaces) — never return untyped dicts
- Return consistent error envelopes across all versions: `{"error": {"code": "...", "message": "..."}}`
- Document breaking changes in a public changelog before each new version release
- Test deprecated endpoints through their entire sunset period — monitor that no consumer is broken on the sunset date

### MUST NOT DO
- Remove response fields without keeping them (nullable) until the version reaches 410 Gone
- Make optional request parameters required in an existing version
- Change enum values to different meanings — add new values, deprecate old ones
- Use query parameter versioning for production public APIs
- Deploy breaking changes to a currently-documented API version without creating a new version
- Set sunset dates less than 90 days out — this breaks consumer migration plans
- Return different error formats between versions — keep the error envelope consistent
- Remove deprecated endpoints before their Sunset date has passed — return 410 Gone instead
- Share response model classes between versions that have different fields — each version needs its own schema

---

## Output Template

When implementing or reviewing API versioning, produce:

1. **Versioning Strategy Recommendation** — Chosen approach with rationale (URL path / Accept header / date-based), compared against alternatives
2. **Change Classification Matrix** — Table of proposed changes classified as BREAKING or COMPATIBLE with rationale
3. **Versioned Endpoint Specifications** — HTTP method, path, request/response schemas, and status codes for each version
4. **Deprecation Plan** — Sunset timeline, header signals, and migration guide links
5. **Migration Guide** — Before/after code examples, SDK changes required, data mapping notes
6. **Cache Strategy** — How caching (CDN, browser, proxy) differs per version with `Vary` header recommendations

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `api-design` | General REST API design patterns — resource modeling, pagination, rate limiting |
| `input-validation` | Request validation strategies for typed APIs (Pydantic, zod, JSON Schema) |
| `code-review` | Review versioned API implementations for correctness and backward compatibility |
| `security-review` | Audit versioned endpoints for authZ/authN consistency across versions |

---

## References

- [RFC 7231 — Hypertext Transfer Protocol (HTTP/1.1): Semantics and Content](https://datatracker.ietf.org/doc/html/rfc7231#section-5.3.2)
- [Stripe API Reference — Versioning](https://stripe.com/docs/api/versioning)
- [GitHub Changelog — API Versioning](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api)
- [Google Cloud REST API Versioning](https://cloud.google.com/apis/design/versioning)
- [Microsoft REST API Guidelines — Versioning](https://github.com/Microsoft/api-guidelines/blob/vNext/Guidelines.md#712-versioning)
- [RFC 8043 — IANA Considerations for Media Type Registration](https://datatracker.ietf.org/doc/html/rfc8043)
