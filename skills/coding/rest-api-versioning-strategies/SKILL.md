---
name: rest-api-versioning-strategies
description: Implements API versioning strategies including URL path versioning, Accept header media type versioning, deprecation headers with Sunset and Deprecation, and backward-compatible contract evolution for REST APIs.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: API versioning, URL path versioning, Accept header versioning, API deprecation, Sunset header, Deprecation header, REST API backward compatibility, how do i version an API, API evolution strategy, breaking changes API
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  archetypes:
    - tactical
    - strategic
  anti_triggers:
    - brainstorming
    - vague ideation
    - code golf
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: rest-api-resource-modeling, rest-api-pagination-filtering
---

# API Versioning Strategist

Designs and implements backward-compatible REST API versioning strategies including URL path versioning for public APIs, Accept header versioning for machine clients, deprecation headers with Sunset dates, and migration paths between versions. When active, the model selects the appropriate versioning strategy based on the API's audience, isolates version-specific route modules, adds deprecation signaling on responses, and enforces the golden rule of backward-compatible contract evolution.

## TL;DR Checklist

- [ ] Choose versioning strategy: URL path for public APIs, Accept header for machine-only clients
- [ ] Isolate routes per version using separate router modules with `/api/v1/` and `/api/v2/` prefixes
- [ ] Add Deprecation: true and Sunset headers to every response from a deprecated version
- [ ] Never make breaking changes in minor releases — new fields must be optional for at least one full version cycle
- [ ] Document migration paths between versions with specific field-level change descriptions
- [ ] Set a public sunset date (minimum 6 months) before removing a deprecated version

---

## When to Use

Use this skill when:

- Designing the versioning strategy for a new public-facing REST API
- Planning breaking changes that require a new API version
- Deprecating an old API version and communicating the sunset timeline to consumers
- Evolving an existing API while maintaining backward compatibility for current clients
- Deciding between URL path versioning, Accept header versioning, or other strategies

---

## When NOT to Use

Avoid this skill for:

- **Internal microservice-to-microservice APIs** — these can evolve freely using contract testing instead of formal versioning
- **APIs that are still in active development (alpha/beta)** — use a single version and enforce breaking-change discipline instead of managing multiple versions
- **Feature-flag-driven changes** — if the change is gated behind a flag and doesn't alter the API contract, no new version is needed

---

## Core Workflow

1. **Choose Versioning Strategy Based on Audience** — For public APIs consumed by third parties: use URL path versioning (`/api/v1/resource`) for maximum discoverability and client clarity. For machine-to-machine APIs where clients can dynamically negotiate content types: use Accept header versioning (`Accept: application/vnd.myapi.v2+json`).
   **Checkpoint:** If external developers or mobile apps consume the API, use URL path versioning — it's the most universally supported approach across HTTP clients, SDKs, and API gateways.

2. **Implement Router-Level Isolation Between Versions** — Create separate route modules per major version. Each version gets its own FastAPI router with a unique path prefix (`/api/v1`, `/api/v2`). Route handlers in each version are independent — changes to v2 must never affect v1 behavior.
   **Checkpoint:** Every endpoint accessible at `/api/v1/X` must return the same shape and data regardless of what exists at `/api/v2/X`.

3. **Add Deprecation Headers When Releasing a New Major Version** — When launching v2, add `Deprecation: true` and `Sunset: <date>` headers to every v1 response. The Sunset date must be at least 6 months in the future to give consumers adequate migration time.
   **Checkpoint:** Every deprecated version's responses must include both Deprecation and Sunset headers — missing either breaks the deprecation signaling contract.

4. **Enforce the Golden Rule: New Fields Are Optional** — When adding new fields to response objects, they MUST be optional in at least one full version cycle. Never remove or rename a field without first making it deprecated (still present but undocumented) for a full version cycle, then removing it in the next major release.
   **Checkpoint:** No client should ever fail because of an additional field in a response body. Fields can be added freely; removal requires a major version bump.

5. **Document Migration Paths Between Versions** — Create a migration guide listing every breaking change between versions: removed fields, renamed fields, changed data types, altered status codes, new required parameters. Each migration must include the old behavior and the corresponding new behavior with code examples.
   **Checkpoint:** A consumer upgrading from v1 to v2 should be able to update their integration using only the migration guide — no trial-and-error debugging required.

---

## Implementation Patterns

### Pattern 1: URL Path Versioning with Router Isolation (BAD vs. GOOD)

URL path versioning embeds the API version in the URI (`/api/v1/users`, `/api/v2/users`). Each version has its own router module, ensuring complete isolation between versions — changes to v2 cannot affect v1 behavior.

```python
# ❌ BAD: Single router with breaking changes mixed into one endpoint
from fastapi import FastAPI

app = FastAPI()


@app.get("/users/{user_id}")
def get_user_broken(user_id: str):
    """Mixes v1 and v2 logic in one handler — no version isolation."""
    # If a client wants v1 behavior but gets v2 response, there's no way to opt out.
    # Breaking changes (new required fields, renamed properties) silently break existing clients.
    return {
        "id": user_id,
        "name": "Alice",
        "email": "alice@example.com",
        "created_at": "2025-01-15T10:30:00Z",  # New in v2 — breaks clients expecting only id/name
        "address": {"street": "123 Main St", "city": "Springfield"},  # Nested object added
        "_links": {  # HATEOAS links added in v2 — not present in v1
            "self": f"/users/{user_id}",
            "orders": f"/users/{user_id}/orders",
        },
    }


# ❌ BAD: Version as query parameter — hard to cache, inconsistent routing
@app.get("/users")
def get_users_query_param(version: str = "v1"):
    """Query param versioning is fragile — proxies may drop unknown params."""
    if version == "v2":
        return {"data": [], "_meta": {"api_version": "v2"}}
    return {"data": []}


# ✅ GOOD: Separate routers per version with path prefix isolation
from fastapi import FastAPI, APIRouter

app = FastAPI(title="My API", version="1.0.0")

# --- V1 Router (current stable) ---
v1_router = APIRouter(prefix="/api/v1", tags=["users-v1"])


@v1_router.get("/users/{user_id}", summary="Get user by ID (v1)")
def get_user_v1(user_id: str):
    """GET /api/v1/users/{user_id} — V1 response shape.

    Contains only fields defined in the v1 specification.
    No HATEOAS links, no nested objects beyond what was in v1.
    Clients consuming v1 should never see additional fields from v2.
    """
    # In production: user = db.get_user(user_id)
    return {
        "id": user_id,
        "name": "Alice",
        "email": "alice@example.com",
    }


@v1_router.get("/users", summary="List users (v1)")
def list_users_v1():
    """GET /api/v1/users — V1 collection endpoint."""
    return {"items": []}


# --- V2 Router (new version, v1 still active) ---
v2_router = APIRouter(prefix="/api/v2", tags=["users-v2"])


@v2_router.get("/users/{user_id}", summary="Get user by ID (v2)")
def get_user_v2(user_id: str):
    """GET /api/v2/users/{user_id} — V2 response shape with new fields.

    Adds HATEOAS links, address field, and created_at timestamp.
    These are additional fields — v1 clients remain unaffected because they
    access /api/v1/..., not /api/v2/.
    """
    return {
        "id": user_id,
        "name": "Alice",
        "email": "alice@example.com",
        "created_at": "2025-01-15T10:30:00Z",
        "address": {"street": "123 Main St", "city": "Springfield"},
        "_links": {
            "self": f"/api/v2/users/{user_id}",
            "orders": f"/api/v2/users/{user_id}/orders",
        },
    }


@v2_router.get("/users", summary="List users (v2)")
def list_users_v2():
    """GET /api/v2/users — V2 collection endpoint with pagination."""
    return {"items": [], "_links": {"self": "/api/v2/users"}}


# --- Mount both routers on the main app ---
app.include_router(v1_router)
app.include_router(v2_router)

# Both endpoints are accessible:
#   GET /api/v1/users/550e8400 → v1 shape (id, name, email)
#   GET /api/v2/users/550e8400 → v2 shape (id, name, email, created_at, address, _links)
```

### Pattern 2: Accept Header Versioning for REST-Pure APIs

Accept header versioning uses vendor-specific media types (`application/vnd.myapi.v1+json`) to negotiate the response format. This keeps URIs clean and purely resource-based but requires clients to understand HTTP content negotiation. Best suited for machine-to-machine APIs where clients are well-maintained SDKs or internal services.

```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import re

app = FastAPI(title="My API (Accept Header Versioning)", version="1.0.0")


# --- Content negotiation middleware for Accept header versioning ---

def parse_accept_version(accept_header: str) -> str:
    """Parse the API version from the Accept header.

    Supports vendor-specific media types like:
      - application/vnd.myapi.v1+json  → v1
      - application/vnd.myapi.v2+json  → v2
      - application/json               → defaults to latest stable (v1)

    Args:
        accept_header: The value of the Accept request header.

    Returns:
        Version string like 'v1', 'v2', or None for default.
    """
    # Match vendor-specific API version in Accept header
    match = re.search(r'application/vnd\.myapi\.v(\d+)\+json', accept_header)
    if match:
        return f"v{match.group(1)}"

    # Default to v1 for standard JSON clients
    if "application/json" in accept_header:
        return "v1"

    # Unknown content type — reject
    return None


def build_response_for_version(data: dict, version: str) -> dict:
    """Return the response shaped for the requested API version.

    V1 returns the minimal shape (id, name, email).
    V2 adds HATEOAS links and address information.
    Each additional field is additive — never removing or renaming fields between versions.
    """
    base = {
        "id": data["id"],
        "name": data["name"],
        "email": data["email"],
    }

    if version == "v2":
        base["created_at"] = data.get("created_at")
        base["address"] = data.get("address")
        base["_links"] = {
            "self": f"/api/users/{data['id']}",
            "orders": f"/api/users/{data['id']}/orders",
        }

    return base


# --- Middleware that applies Accept header versioning ---

@app.middleware("http")
async def accept_version_middleware(request: Request, call_next):
    """Intercept every request to determine API version from Accept header.

    Routes the response through version-shaping logic before sending.
    Returns 406 Not Acceptable if the client requests an unsupported version.
    """
    accept_header = request.headers.get("accept", "application/json")
    version = parse_accept_version(accept_header)

    if version is None:
        return JSONResponse(
            status_code=406,
            content={
                "type": "https://api.example.com/errors/not-acceptable",
                "title": "Not Acceptable",
                "status": 406,
                "detail": (
                    "The Accept header must include a supported API version. "
                    "Use 'application/vnd.myapi.v1+json' or 'application/vnd.myapi.v2+json'."
                ),
            },
        )

    # Process the request normally
    response = await call_next(request)

    # Shape the response body according to the negotiated version
    if response.status_code == 200 and response.headers.get("content-type") == "application/json":
        body_content = b""
        async for chunk in response.body_iterator:
            body_content += chunk
        data = __import__("json").loads(body_content)
        shaped_data = build_response_for_version(data, version)

        # Return new response with versioned shape
        return JSONResponse(
            content=shaped_data,
            status_code=response.status_code,
            headers={k: v for k, v in response.headers.items() if k.lower() != "content-length"},
        )

    return response


# --- Version-agnostic route handlers (data fetching only) ---

@app.get("/users/{user_id}")
def get_user_agnostic(user_id: str):
    """Fetch user data without version shaping — middleware handles versioning.

    The handler returns the complete data set. Middleware reshapes it
    to the client's negotiated version before sending the response.
    """
    # In production: query database for full user record
    return {
        "id": user_id,
        "name": "Alice",
        "email": "alice@example.com",
        "created_at": "2025-01-15T10:30:00Z",
        "address": {"street": "123 Main St", "city": "Springfield"},
    }


# --- Usage example ---

# Client A (v1 consumer):
#   GET /users/550e8400
#   Accept: application/json  → receives {id, name, email}
#
# Client B (v2 consumer):
#   GET /users/550e8400
#   Accept: application/vnd.myapi.v2+json  → receives {id, name, email, created_at, address, _links}
#
# Client C (unsupported version):
#   GET /users/550e8400
#   Accept: application/vnd.myapi.v3+json  → receives 406 Not Acceptable
```

### Pattern 3: Deprecation Headers on Responses (BAD vs. GOOD)

When a new major version is released, the old version must be deprecated with proper HTTP headers that inform consumers when to migrate and by when. The `Deprecation` header signals intent; the `Sunset` header provides a concrete deadline; the `Link` header points to migration documentation.

```python
# ❌ BAD: No deprecation notice — consumers have no warning before the API disappears
from fastapi import FastAPI, Response

app = FastAPI()


@app.get("/users/{user_id}")
def get_user_no_deprecation(user_id: str):
    """V1 endpoint with no deprecation headers — existing clients won't know when to migrate."""
    return {"id": user_id, "name": "Alice"}


# This will break silently when the endpoint is removed without warning.
# Mobile apps with 6-week update cycles may have broken installations.
# Web consumers caching API specs won't discover the migration path.


# ✅ GOOD: Deprecation headers on every v1 response with migration documentation

from fastapi import FastAPI, Response
from datetime import datetime, timezone, timedelta
import re

app = FastAPI()


# Configuration for deprecated versions
DEPRECATED_VERSIONS = {
    "v1": {
        "deprecation_date": datetime(2026, 1, 1, tzinfo=timezone.utc),
        "sunset_date": datetime(2026, 7, 1, tzinfo=timezone.utc),  # 6-month minimum notice
        "migration_url": "https://docs.example.com/migration/v1-to-v2",
    },
}


def add_deprecation_headers(response: Response, path: str) -> None:
    """Add deprecation headers to responses from deprecated API versions.

    Sets Deprecation: true, Sunset date in HTTP-date format, and Link to migration docs.
    Only applies if the request path matches a deprecated version prefix.

    Per RFC 8594, the Sunset header uses the HTTP-date format (RFC 7231 §7.1.1.2).
    """
    # Check if this request targets a deprecated version
    for version, config in DEPRECATED_VERSIONS.items():
        prefix = f"/api/{version}"
        if path.startswith(prefix):
            response.headers["Deprecation"] = "true"

            # Sunset date in HTTP-date format: Sun, 01 Jun 2026 00:00:00 GMT
            sunset_str = config["sunset_date"].strftime("%a, %d %b %Y %H:%M:%S GMT")
            response.headers["Sunset"] = sunset_str

            # Link header pointing to migration documentation (RFC 5988 format)
            response.headers["Link"] = (
                f'<{config["migration_url"]}>; rel="deprecation"; '
                f'title="Migration guide from {version} to v2"'
            )

            return


@app.middleware("http")
async def deprecation_middleware(request: Request, call_next):
    """Add deprecation headers to every response for deprecated API versions."""
    response = await call_next(request)

    # Only add headers to successful responses from deprecated versions
    if 200 <= response.status_code < 300:
        add_deprecation_headers(response, request.url.path)

    return response


# --- V1 endpoint (deprecated) with automatic deprecation headers ---
@app.get("/api/v1/users/{user_id}")
def get_user_v1_deprecated(user_id: str):
    """GET /api/v1/users/{user_id} — Deprecated v1 endpoint.

    Still functional but will be removed on the Sunset date.
    Clients see Deprecation: true, Sunset, and Link headers in every response.
    """
    return {"id": user_id, "name": "Alice"}


@app.get("/api/v1/users")
def list_users_v1_deprecated():
    """GET /api/v1/users — Deprecated v1 endpoint."""
    return {"items": []}


# --- V2 endpoint (current, no deprecation headers) ---
@app.get("/api/v2/users/{user_id}")
def get_user_v2(user_id: str):
    """GET /api/v2/users/{user_id} — Current stable version.

    No deprecation headers because this is the active version.
    """
    return {
        "id": user_id,
        "name": "Alice",
        "email": "alice@example.com",
        "_links": {"self": f"/api/v2/users/{user_id}"},
    }


# --- Example response headers for a v1 request ---

"""
GET /api/v1/users/550e8400 HTTP/1.1
Host: api.example.com

HTTP/1.1 200 OK
Content-Type: application/json
Deprecation: true
Sunset: Sun, 01 Jun 2026 00:00:00 GMT
Link: <https://docs.example.com/migration/v1-to-v2>; rel="deprecation"; title="Migration guide from v1 to v2"

{"id": "550e8400", "name": "Alice"}
"""


# --- Example response headers for a v2 request (no deprecation) ---

"""
GET /api/v2/users/550e8400 HTTP/1.1
Host: api.example.com

HTTP/1.1 200 OK
Content-Type: application/json

{"id": "550e8400", "name": "Alice", "email": "alice@example.com"}
"""
```

---

## Constraints

### MUST DO
- **Isolate versions at the router level** — each major version must have its own FastAPI APIRouter with a unique prefix (`/api/v1`, `/api/v2`). Changes to one version must never affect another.
- **Add deprecation headers on every response from a deprecated version** — include `Deprecation: true`, `Sunset` (HTTP-date format, at least 6 months in the future), and `Link` to migration documentation for every v1 response after v2 launches.
- **Never remove fields without a full deprecation cycle** — before removing or renaming a response field, it must be deprecated (present but undocumented) for one full version cycle, then removed in the next major release.
- **Always add new fields as optional** — every new response field must not break existing clients. Clients that don't know about the field should continue functioning normally.
- **Document migration paths between versions** — provide a migration guide listing all breaking changes (removed fields, renamed fields, type changes, altered behavior) with old-to-new code examples.

### MUST NOT DO
- **Mix v1 and v2 logic in a single route handler** — conditional version checks inside handlers (`if version == "v2":`) create maintenance debt and risk of inconsistency between versions.
- **Use query parameter versioning for public APIs** (`/users?api_version=v2`) — proxies, CDNs, and API gateways may drop or cache these differently across versions, causing unpredictable behavior.
- **Remove a deprecated version before the Sunset date has passed** — consumers using older SDKs, cached responses, or infrequent cron jobs may still need access past the deprecation announcement.
- **Make breaking changes in minor/patch versions** — semantic versioning rules: MAJOR for breaking changes, MINOR for additive (backward-compatible) changes, PATCH for fixes only.

---

## Output Template

When implementing or reviewing API versioning with this skill active, produce:

1. **Versioning Strategy Decision** — State the chosen strategy (URL path vs. Accept header) with justification based on the API's audience and client capabilities.

2. **Router Isolation Map** — List every router module, its path prefix, and which version of each endpoint it serves:

   | Router | Prefix | Endpoints |
   |---|---|---|
   | `v1_router` | `/api/v1/` | GET /users/{id}, GET /users |
   | `v2_router` | `/api/v2/` | GET /users/{id} (with _links), GET /users, POST /users |

3. **Deprecation Header Configuration** — For each deprecated version: deprecation date, Sunset date (HTTP-date format), and migration documentation URL.

4. **Migration Guide Skeleton** — Outline of breaking changes between versions with before/after examples for each field change.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `rest-api-resource-modeling` | The resource model that is being versioned — versioning decisions should consider the URI structure and HATEOAS link stability across versions |
| `rest-api-pagination-filtering` | Pagination and filtering may differ between API versions; each version needs its own pagination envelope specification |

---

## Live References

> Authoritative documentation links for API versioning strategies. The model follows these references at load time to resolve external content.

- [RFC 9110 §12.5.3 — 406 Not Acceptable](https://www.rfc-editor.org/rfc/rfc9110.html#section-12.5.3) — HTTP status code for when the server cannot produce a response matching the Accept header
- [RFC 8594 — Deprecation Reporting via HTTP](https://www.rfc-editor.org/rfc/rfc8594.html) — Standard for Deprecation, Sunset, and Link headers in API responses
- [RFC 5988 — Web Linking](https://www.rfc-editor.org/rfc/rfc5988.html) — Defines the Link header format with rel="deprecation" for pointing to migration guides
- [REST API Versioning Best Practices (Microsoft)](https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design#version-the-api) — Microsoft's guidance on versioning strategies including URL path, query param, and header approaches
- [FastAPI Router Organization](https://fastapi.tiangolo.com/tutorial/bigger-applications/) — How to organize multiple APIRouter instances in a FastAPI application

> 📖 skill(local cache): rest-api-versioning-strategies
