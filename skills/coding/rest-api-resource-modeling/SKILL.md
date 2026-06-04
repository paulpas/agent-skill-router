---




name: rest-api-resource-modeling
description: Implements REST resource modeling patterns including plural-noun URI conventions, HTTP method semantics, idempotency rules, HATEOAS hypermedia links, and parent-child relationships for predictable API surfaces.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: REST resource modeling, URI design, HTTP method semantics, idempotent methods, HATEOAS hypermedia links, resource naming conventions, plural nouns REST API, how do i design REST URIs
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  archetypes:
    - tactical
    - generation
  anti_triggers:
    - brainstorming
    - vague ideation
    - code golf
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: rest-api-error-handling, rest-api-pagination-filtering, rest-api-versioning-strategies




---





# REST Resource Model Designer

Designs predictable, consistent REST resource models using plural-noun URI conventions, proper HTTP method semantics per RFC 7231, idempotency classification, and HATEOAS hypermedia links for discoverable API navigation. When active, the model maps business entities to resource URIs, selects appropriate HTTP methods with correct status codes, classifies operations by safety and idempotency, designs owner-owned vs. sibling relationships, and adds state-driven link computation.

## TL;DR Checklist

- [ ] All resources use plural nouns in URI paths (`/users`, `/orders`, never `/user` or `/getUser`)
- [ ] GET returns 200, POST creates returning 201 with Location header, PUT/PATCH return 200, DELETE returns 204
- [ ] Every operation is classified as safe/idempotent/non-idempotent before implementation
- [ ] Owner-owned resources are nested under parent (`/users/{id}/orders`), independently queryable children are separate resources
- [ ] HATEOAS `_links` dict includes at least `self`, computed conditionally based on resource state and permissions
- [ ] Collection-level actions use POST with action verbs (`POST /users/bulk-delete`)
- [ ] URI is predictable — a client can guess URIs without documentation

---

## When to Use

Use this skill when:

- Designing the URI structure for a new REST API or refactoring an existing one
- Choosing between nested resources, sibling resources, and collection-level actions
- Adding HATEOAS hypermedia links to make the API self-descriptive
- Classifying HTTP methods (GET, POST, PUT, PATCH, DELETE) by idempotency and safety for each endpoint
- Writing FastAPI route definitions and ensuring method semantics are correct
- Reviewing an API spec for RESTful convention violations (verb-based URIs, wrong status codes)

---

## When NOT to Use

Avoid this skill for:

- **RPC-style APIs** that follow action-oriented patterns like `/api/getUser` or `/api/processPayment` — these are not REST resource models
- **GraphQL APIs** where the query language replaces URI design and HTTP method semantics
- **Real-time push scenarios** using WebSockets or Server-Sent Events — these don't use HTTP methods for resource access

---

## Core Workflow

1. **Identify Resources as Plural Nouns** — List every noun in the domain that represents an independently addressable entity. Convert to plural form and establish base URI patterns.
   **Checkpoint:** Every top-level resource must be accessible at a consistent path like `/api/v1/{resource-plural}`. No verbs should appear in resource URIs.

2. **Map HTTP Methods to Operations per RFC 7231** — For each resource, assign HTTP methods: GET for retrieval (safe, idempotent), POST for creation (unsafe, non-idempotent), PUT for full replacement (idempotent), PATCH for partial update (non-idempotent), DELETE for removal (idempotent).
   **Checkpoint:** Verify that every idempotent method can be retried without changing the result beyond the first call.

3. **Classify Each Operation by Idempotency and Safety** — Label every endpoint: safe (no state change, GET/HEAD/OPTIONS), unsafe (changes state, POST/PUT/PATCH/DELETE), idempotent (multiple identical calls produce same result, PUT/DELETE/GT).
   **Checkpoint:** POST must never be idempotent by default; if it needs to be, use an idempotency key pattern instead.

4. **Design Resource Relationships** — Determine ownership: owner-owned resources nest under the parent (`/users/{id}/orders`), sibling relationships stay at the same level (`/orders`, `/products` independently addressable), and collection-level actions use POST with verb paths (`POST /users/bulk-delete`).
   **Checkpoint:** A nested resource must not be queryable from a top-level collection endpoint — it belongs to its parent only.

5. **Add HATEOAS _links for Discoverable Navigation** — Compute `_links` dict dynamically based on the current resource state and the authenticated user's permissions. Always include `self`. Conditionally add `update`, `delete`, `orders`, `cancel`, etc.
   **Checkpoint:** Every response with a body must have a `_links.self.href` that matches the URI used to fetch the resource.

6. **Validate URI Predictability** — Read every URI aloud as a client would: "GET /api/v1/users/550e8400/orders" should feel natural. Ask: can I guess the URI for "list my orders" without looking at documentation?
   **Checkpoint:** If answering "no" to any endpoint, refactor the URI until the mental model aligns.

---

## Implementation Patterns

### Pattern 1: Resource Naming with Plural Nouns (BAD vs. GOOD)

REST resources should always use plural nouns as URI segments. Verb-based URIs (`/getUser`, `/deleteOrder`) describe actions rather than resources, which violates REST's core principle that the API surface is a collection of addressable resources.

```python
# ❌ BAD: Verb-based URIs — describes actions instead of resources
from fastapi import FastAPI, HTTPException

app = FastAPI()


@app.get("/getUser/{user_id}")
def get_user(user_id: str):
    """GET returns a user but the URI describes an action."""
    return {"id": user_id, "name": "Alice"}


@app.post("/createUser")
def create_user(body: dict):
    """POST creates without Location header — clients can't discover the new resource."""
    return {"id": "new-1", **body}


@app.delete("/deleteOrder/{order_id}")
def delete_order(order_id: str):
    """DELETE returns 200 with body instead of 204 No Content."""
    return {"deleted": True, "order_id": order_id}


# ✅ GOOD: Plural-noun resource URIs with correct HTTP method semantics
from fastapi import FastAPI, Response, Header
from fastapi.responses import JSONResponse
import uuid

app = FastAPI()


@app.get("/users", response_model=dict)
def list_users(
    offset: int = 0,
    limit: int = 20,
    authorization: str | None = Header(None),
):
    """GET /users — Retrieve a collection of users.

    Safe and idempotent. Multiple identical requests return the same result.
    Supports pagination via offset/limit query parameters.
    """
    # Implementation would paginate the database query here
    users = [{"id": str(uuid.uuid4()), "name": f"User {i}"} for i in range(offset, offset + limit)]
    links = {"self": "/users", "next": f"/users?offset={offset + limit}" if len(users) == limit else None}
    return {"items": users, "_links": links}


@app.get("/users/{user_id}")
def get_user(user_id: str):
    """GET /users/{user_id} — Retrieve a single user.

    Returns 404 Not Found if the user does not exist.
    Safe and idempotent.
    """
    # In production, query database; here we simulate
    return {
        "id": user_id,
        "name": "Alice",
        "email": "alice@example.com",
        "_links": {
            "self": f"/users/{user_id}",
            "orders": f"/users/{user_id}/orders",
        },
    }


@app.post("/users", status_code=201)
def create_user(body: dict):
    """POST /users — Create a new user.

    Returns 201 Created with Location header pointing to the new resource.
    Unsafe (changes state) and non-idempotent (multiple calls create multiple users).
    """
    new_id = str(uuid.uuid4())
    # In production: db.insert("users", body)
    response = JSONResponse(
        content={"id": new_id, **body},
        status_code=201,
    )
    response.headers["Location"] = f"/users/{new_id}"
    return response


@app.put("/users/{user_id}")
def update_user(user_id: str, body: dict):
    """PUT /users/{user_id} — Full replacement of a user resource.

    Idempotent: calling this endpoint multiple times with the same body
    produces the same result as calling it once.
    Returns 200 OK with the updated resource.
    """
    # In production: db.update("users", user_id, body)
    return {"id": user_id, **body}


@app.patch("/users/{user_id}")
def patch_user(user_id: str, body: dict):
    """PATCH /users/{user_id} — Partial update of a user resource.

    Non-idempotent: calling with different field subsets produces different results.
    Returns 200 OK with the updated resource.
    """
    # In production: db.patch("users", user_id, body)
    return {"id": user_id, **body}


@app.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: str):
    """DELETE /users/{user_id} — Remove a user resource.

    Idempotent: deleting an already-deleted user still returns 204 (or 404).
    Returns 204 No Content — no body in the response.
    """
    # In production: db.delete("users", user_id)
    return Response(status_code=204)


@app.delete("/orders/{order_id}", status_code=204)
def delete_order(order_id: str):
    """DELETE /orders/{order_id} — Remove an order resource.

    Idempotent and safe to retry on network errors.
    """
    return Response(status_code=204)
```

### Pattern 2: Resource Relationships — Nested, Sibling, and Collection Actions (BAD vs. GOOD)

Resource relationships follow three patterns: nested resources for owner-owned pairs (`/users/{id}/orders`), sibling resources for independently queryable entities (`/orders`, `/products`), and collection-level action endpoints using POST with verb paths (`POST /users/bulk-delete`).

```python
# ❌ BAD: No relationship clarity — orders accessible at two conflicting levels
from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import JSONResponse

app = FastAPI()


# Orders appear at both /orders (top-level collection) and /users/{id}/orders (nested),
# but there is no rule about which to use — clients are confused.
@app.get("/orders")
def list_all_orders():
    """Returns ALL orders across all users — no filtering possible."""
    return {"items": []}


@app.get("/users/{user_id}/orders")
def get_user_orders(user_id: str):
    """Returns user's orders but also accessible from top-level without context."""
    return {"items": []}


# ❌ BAD: Collection action uses wrong method — GET for a destructive operation
@app.get("/users/bulk-delete")
def bulk_delete_users():
    """GET for deletion violates HTTP method semantics — safe methods must not change state."""
    return {"deleted": True}


# ✅ GOOD: Clear relationship model with proper method selection
app = FastAPI()


# --- Nested Resource: Owner-Owned Pattern ---
# Users own orders. Orders are only accessible through their owner (or by an admin).
# The nested path communicates ownership semantics.

@app.get("/users/{user_id}/orders")
def list_user_orders(
    user_id: str,
    status: str | None = None,
):
    """GET /users/{user_id}/orders — List orders belonging to a specific user.

    The nested URI communicates that orders are owned by users.
    An admin might also access via GET /orders?user_id={user_id} as an alternative.
    Supports filtering by status (pending, shipped, delivered, cancelled).
    """
    # In production: db.query("SELECT * FROM orders WHERE user_id = $1", user_id)
    orders = []  # Would contain actual order data
    return {
        "items": orders,
        "_links": {
            "self": f"/users/{user_id}/orders",
            "parent_user": f"/users/{user_id}",
        },
    }


@app.post("/users/{user_id}/orders", status_code=201)
def create_order_for_user(
    user_id: str,
    body: dict,
):
    """POST /users/{user_id}/orders — Create an order for a specific user.

    The parent path ensures the user exists and is the owner.
    Returns 201 Created with Location header.
    Returns 404 if the user does not exist.
    """
    new_order = {"user_id": user_id, **body, "id": str(uuid.uuid4())}
    response = JSONResponse(content=new_order, status_code=201)
    response.headers["Location"] = f"/users/{user_id}/orders/{new_order['id']}"
    return response


# --- Sibling Resource: Independently Queryable Children ---
# Products exist independently. They are not owned by a single resource — they belong to the catalog.
# Access them at their own top-level URI.

@app.get("/products")
def list_products(category: str | None = None):
    """GET /products — Browse all products in the catalog.

    Filters optional by category. Products are not owned by users or orders.
    This is a sibling relationship, not nested under any parent.
    """
    return {"items": []}


@app.get("/orders")
def list_all_orders_admin(user_id: str | None = None):
    """GET /orders — Admin-level access to all orders.

    When an authenticated admin calls this without user_id, returns all orders.
    This is a sibling relationship — orders exist independently of users in the data model.
    The nested path (/users/{id}/orders) remains for ownership semantics and user-scoped views.
    """
    return {"items": []}


# --- Collection-Level Action Endpoint ---
# Bulk operations that don't fit natural resource semantics use POST with a verb path.

@app.post("/users/bulk-delete")
def bulk_delete_users(ids: list[str]):
    """POST /users/bulk-delete — Delete multiple users in one request.

    Uses POST (not DELETE) because the operation is non-idempotent:
    calling it twice might delete different sets of users.

    The verb path "bulk-delete" describes the action, not a resource.
    Returns 200 with a summary of results.
    """
    # In production: db.delete_many("users", ids)
    return {"deleted_count": len(ids), "deleted_ids": ids}


@app.post("/orders/{order_id}/cancel")
def cancel_order(order_id: str):
    """POST /orders/{order_id}/cancel — Cancel a specific order.

    This is not a state change via PATCH/PUT (which would require the caller
    to know the correct state transition). Instead, it's an explicit action.

    Returns 200 OK with the updated order in cancelled state.
    Returns 409 Conflict if the order cannot be cancelled (already shipped/delivered).
    """
    # In production: order = db.get("orders", order_id); validate cancellation; return result
    return {"id": order_id, "status": "cancelled"}
```

### Pattern 3: HATEOAS Dynamic Link Computation Based on State and Permissions (BAD vs. GOOD)

HATEOAS (Hypermedia as the Engine of Application State) means responses include links that guide the client to possible next actions. Links are computed dynamically based on the resource's current state and the authenticated user's permissions — not hardcoded.

```python
# ❌ BAD: Static links or no links at all
@app.get("/orders/{order_id}")
def get_order_static(order_id: str):
    """No _links — client must know URIs from documentation."""
    return {"id": order_id, "status": "pending"}


# ❌ BAD: Hardcoded links that don't respect state or permissions
@app.get("/orders/{order_id}")
def get_order_hardcoded(order_id: str):
    """Always returns all possible links regardless of user role or order state."""
    return {
        "id": order_id,
        "status": "pending",
        "_links": {
            "self": f"/orders/{order_id}",
            "update": f"/orders/{order_id}",  # Always present — even for cancelled orders
            "cancel": f"/orders/{order_id}/cancel",  # Always present — even for delivered orders
            "delete": f"/orders/{order_id}",  # Always present — admin-only action shown to all users
        },
    }


# ✅ GOOD: Dynamic link computation respecting state machine and RBAC
from fastapi import Depends, HTTPException, Header
from typing import Any

app = FastAPI()


# Permission model (simplified)
def get_current_user(authorization: str | None = Header(None)) -> dict[str, Any]:
    """Extract user from authorization header — in production, decode JWT and extract claims."""
    if not authorization or not authorization.startswith("Bearer "):
        return {"id": "anonymous", "roles": []}
    # In production: payload = jwt.decode(authorization[7:], secret, algorithms=["HS256"])
    return {"id": "user-1", "roles": ["customer"]}


def compute_order_links(
    order_id: str,
    status: str,
    current_user: dict[str, Any],
) -> dict[str, dict[str, str]]:
    """Compute HATEOAS _links based on order state and user permissions.

    The link computation follows these rules:
    - self is always present
    - update is present only if the user has 'admin' role AND order is not cancelled/delivered
    - cancel is present only if the user owns the order (customer role) AND status allows cancellation
    - delete is present only for admin users on non-delivered orders
    - refund is present only after shipment

    Args:
        order_id: The order identifier.
        status: Current order status.
        current_user: Authenticated user dict with 'id' and 'roles'.

    Returns:
        Dict of link names to link objects with 'href' keys.
    """
    links: dict[str, dict[str, str]] = {
        "self": {"href": f"/orders/{order_id}"},
        "parent_user": {"href": "/users/me"},  # Simplified — would use actual user_id from order
    }

    is_admin = "admin" in current_user.get("roles", [])

    # Cancellable states: pending, confirmed, shipped (before delivery)
    cancellable_states = {"pending", "confirmed", "shipped"}
    is_customer = "customer" in current_user.get("roles", [])

    if status in cancellable_states and is_customer:
        links["cancel"] = {"href": f"/orders/{order_id}/cancel"}

    # Update allowed for admin on non-terminal states
    terminal_states = {"delivered", "cancelled", "returned"}
    if is_admin and status not in terminal_states:
        links["update"] = {"href": f"/orders/{order_id}"}

    # Delete only for admin, only before delivery (idempotent operation)
    if is_admin and status != "delivered":
        links["delete"] = {"href": f"/orders/{order_id}"}

    # Refund available only after shipment
    if status == "delivered" and is_customer:
        links["refund"] = {"href": f"/orders/{order_id}/refund"}

    # Orders collection always available for browsing
    links["orders_collection"] = {"href": "/orders"}

    return links


@app.get("/orders/{order_id}")
def get_order_dynamic(
    order_id: str,
    current_user: dict = Depends(get_current_user),
):
    """GET /orders/{order_id} — Retrieve an order with dynamically computed HATEOAS links.

    The _links section tells the client what actions are available right now
    based on who they are and what state the order is in. This eliminates
    the need for the client to maintain its own copy of the API's URL space.
    """
    # In production: order = db.query("SELECT * FROM orders WHERE id = $1", order_id)
    order = {
        "id": order_id,
        "user_id": "user-1",
        "status": "pending",
        "total": 49.99,
        "items": [{"sku": "WIDGET", "qty": 2, "price": 24.99}],
    }

    order["_links"] = compute_order_links(order_id, order["status"], current_user)
    return order


# --- Resource with State Machine: Shipment Tracking ---
@app.get("/shipments/{shipment_id}")
def get_shipment(shipment_id: str, current_user: dict = Depends(get_current_user)):
    """GET /shipments/{shipment_id} — Retrieve shipment with state-aware links.

    Each state transition opens/closes different action links.
    """
    # In production: shipment = db.query(...)
    shipment = {
        "id": shipment_id,
        "status": "in_transit",
        "origin": "warehouse-a",
        "destination": "customer-address-1",
        "estimated_delivery": "2026-06-01",
    }

    links: dict[str, dict[str, str]] = {"self": {"href": f"/shipments/{shipment_id}"}}

    # Only delivered shipments can be confirmed as received
    if shipment["status"] == "delivered" and current_user.get("roles"):
        links["confirm_received"] = {"href": f"/shipments/{shipment_id}/confirm"}

    # Only in-transit shipments have tracking details available
    if shipment["status"] == "in_transit":
        links["tracking_events"] = {"href": f"/shipments/{shipment_id}/events"}

    shipment["_links"] = links
    return shipment
```

---

## Constraints

### MUST DO
- Use plural nouns for all resource URI segments (`/users`, not `/user`; `/order-items`, not `/order_item`)
- Classify every endpoint by idempotency (safe/idempotent, safe/non-idempotent, unsafe/idempotent, unsafe/non-idempotent) before writing implementation
- Return correct status codes: 200 for successful GET/PATCH/PUT, 201 Created with Location header for POST, 204 No Content for DELETE
- Compute HATEOAS `_links` dynamically — never hardcode links. At minimum include `self`; conditionally add action-specific links based on resource state and user permissions
- Use nested paths (`/users/{id}/orders`) only for owner-owned resources where the child has no meaning outside its parent's context
- Use collection-level action endpoints (`POST /users/bulk-delete`) only for operations that don't fit standard CRUD semantics
- Keep URI paths flat and predictable — a client should be able to guess `GET /users/{id}/orders` without reading documentation

### MUST NOT DO
- Use verb-based URIs like `/getUser`, `/deleteOrder`, `/createNewUser` — these describe actions, not resources
- Return HTTP 200 for DELETE responses — use 204 No Content (or 200 only if a body is strictly necessary)
- Make POST idempotent by default — POST creates new resources; each call should produce a distinct result unless an idempotency key is used
- Return the same `_links` dict for every resource regardless of state or permissions — links must be computed contextually
- Nest deeply more than one level (`/users/{id}/orders/{oid}/items`) — deep nesting makes URIs unwieldy and clients fragile
- Use query parameters for resource identification (`/users?id=123`) — use path segments (`/users/123`) for single-resource retrieval

---

## Output Template

When implementing or reviewing REST API resource models with this skill active, produce:

1. **Resource Inventory** — A table listing every resource with its plural URI, parent relationship (if any), and HTTP methods supported:

   | Resource | URI Path | Parent | Methods |
   |---|---|---|---|
   | User | `/users` | none | GET, POST |
   | Order | `/orders` | admin view | GET |
   | Order | `/users/{id}/orders` | User (owned) | GET, POST |

2. **Method Classification Matrix** — For each endpoint, list the HTTP method with its idempotency and safety classification:

   | Endpoint | Method | Safe? | Idempotent? | Status Code |
   |---|---|---|---|---|
   | `/users` | GET | yes | yes | 200 |
   | `/users` | POST | no | no | 201 |

3. **Relationship Diagram** — ASCII art showing resource relationships (owner-owned, sibling, collection action):

   ```
   /users/{id} ──owns──> /users/{id}/orders   (nested, owner-owned)
   /orders                                          (sibling, admin view)
   POST /users/bulk-delete                         (collection-level action)
   ```

4. **HATEOAS Link Specification** — For each resource, list which `_links` are always present and which are conditionally included based on state/permissions.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `rest-api-error-handling` | Structured error responses (RFC 7807) that accompany every resource endpoint |
| `rest-api-pagination-filtering` | Pagination and filtering patterns for collection endpoints (`/users`, `/orders`) |
| `rest-api-versioning-strategies` | Versioning the resource model without breaking existing client URIs |

---

## Live References

> Authoritative documentation links for REST API design. The model follows these references at load time to resolve external content.

- [RFC 9110 — HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html) — Official specification for HTTP methods, status codes, safe/idempotent classification
- [RFC 9112 — HTTP/1.1](https://www.rfc-editor.org/rfc/rfc9112.html) — HTTP/1.1 message framing and method semantics
- [REST API Design Rules (Zambrano)](https://restfulapi.net/resource-naming/) — Practical naming conventions for REST URIs
- [Fielding's REST Dissertation, Chapter 5](https://www.ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm) — Roy Fielding's original REST architectural constraints including HATEOAS
- [FastAPI Documentation](https://fastapi.tiangolo.com/) — Python framework documentation for implementing REST endpoints with typed signatures

> 📖 skill(local cache): rest-api-resource-modeling
