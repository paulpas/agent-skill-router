---
name: mcp-tool-design-patterns
description: Designs effective MCP tools and resources following best practices including clear descriptions, bounded inputs/outputs, proper annotations (readOnlyHint, destructiveHint, idempotentHint), hierarchical resource templates, progressive discovery patterns, and avoiding anti-patterns like tool bloat, vague contracts, and unbounded responses.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  role: implementation
  scope: implementation
  output-format: code
  triggers: mcp tool design, resource design, tool descriptions, mcp schema, idempotent hint, resource templates, bounded responses
  related-skills: mcp-server-fastmcp-python, mcp-client-integration
  archetypes: tactical, strategic
  anti_triggers: brainstorming, vague ideation
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
---

# MCP Tool Design Patterns

Designs effective Model Context Protocol (MCP) tools and resources that enable AI models to interact with external systems reliably and safely.

## TL;DR Checklist

- [ ] **Progressive Discovery:** Core tools only (5–10), add depth via resources and templates
- [ ] **Strict Schemas:** Use Pydantic models with constraints, not open dicts
- [ ] **Clear Descriptions:** Every tool and resource must be unambiguous (not "Get data")
- [ ] **Bounded Responses:** Paginate lists, limit array sizes, define max response sizes
- [ ] **Annotations:** Mark tools with readOnlyHint, destructiveHint, idempotentHint where applicable
- [ ] **Hierarchical Resources:** Organize by parent/child relationships (DNS-like URIs)
- [ ] **Avoid Tool Bloat:** > 15 tools reduces model accuracy; use resources instead

---

## When to Use

Use this skill when:

- Designing a new MCP server with tools and resources
- Creating tool schemas that AI models will call
- Building resource hierarchies for progressive discovery
- Reviewing existing tools for anti-patterns
- Planning how to expose system functionality via MCP
- Setting up pagination, filtering, or streaming patterns

---

## When NOT to Use

Avoid this skill for:

- Implementing MCP client-side integration (use `mcp-client-integration` instead)
- Setting up MCP server frameworks (use `mcp-server-fastmcp-python` instead)
- Debugging protocol-level MCP issues
- Tasks that don't involve tool/resource design

---

## Core Concepts

### Tool Anatomy

Every MCP tool is a callable unit of work with:

1. **Name** — Lowercase, kebab-case, descriptive (not `get_stuff`, use `fetch-customer-invoice`)
2. **Description** — 1–2 sentences, specific and unambiguous
3. **Input Schema** — Pydantic BaseModel with strict field constraints
4. **Annotations** — Hints about tool behavior (readOnly, destructive, idempotent)
5. **Output** — Structured, bounded response (never unbounded arrays)

### Resource Anatomy

Resources expose data that can be accessed via URIs:

1. **URI Template** — Hierarchical path like `dns://api.example.com/users/{id}/settings`
2. **Description** — What the resource exposes and how to filter/paginate
3. **MIME Type** — Expected format (`text/plain`, `application/json`, `text/html`)
4. **Read-Only Hint** — Indicates if resource can be modified

### Tool vs Resource Decision Tree

```
Does it accept input and perform an action?
  → Tool (call `search-users`, `send-email`, `create-invoice`)

Does it represent structured data accessible via a URI?
  → Resource (access `dns://api.example.com/users/{id}`)

Is it mostly discovery (listing possibilities)?
  → Resource template (let client explore `dns://api.example.com/users`)

Is it a long-running operation?
  → Tool (tools can include status polling hints)

Should the model explore it progressively?
  → Resource + Resource Template (start with core tools, add depth via templates)
```

---

## Design Pattern 1: Progressive Discovery

Start with 5–10 core tools. Use resources and templates to enable the model to discover additional functionality as needed.

**Why?** AI models perform better with focused tool sets. Too many tools → lower accuracy and higher latency.

### Pattern Structure

```
Core Tools (5–10)
  ↓
  Resource Templates
    ↓
    (Model explores templates as needed)
```

### Example: Customer Management System

**Core Tools:**
- `search-customers` — Find customers by name or ID
- `fetch-customer-details` — Get full profile for a specific customer
- `create-invoice` — Generate an invoice
- `send-email` — Send notification emails

**Resource Templates:**
- `dns://crm.example.com/customers` — List all customers (auto-discovery)
- `dns://crm.example.com/customers/{customer_id}` — Specific customer data
- `dns://crm.example.com/customers/{customer_id}/invoices` — Customer's invoices
- `dns://crm.example.com/customers/{customer_id}/settings` — Customer preferences

**Model Interaction:**
```
1. Model calls search-customers
2. Gets customer ID from result
3. Model discovers resource template: dns://crm.example.com/customers/{customer_id}/invoices
4. Model reads invoices via resource (no additional tool call needed)
```

---

## Design Pattern 2: Hierarchical Resource Organization

Organize resources using DNS-like hierarchies to reflect the data model:

```
dns://api.example.com/
  /users/{id}/
    /settings
    /notifications
    /billing/
      /invoices/{invoice_id}
      /payments/{payment_id}
  /teams/{team_id}/
    /members
    /projects/{project_id}
      /issues/{issue_id}
```

**Benefits:**
- Predictable naming — models can guess resource URIs
- Clear relationships — `/users/{id}/settings` clearly belongs to a user
- Composable — tools and resources work together naturally
- Discoverable — templates enable progressive exploration

---

## Design Pattern 3: Bounded Responses with Pagination

Never return unbounded arrays. Always paginate and limit sizes.

### Pattern: Cursor-Based Pagination

```python
from pydantic import BaseModel, Field
from typing import List, Optional

class PaginatedResponse(BaseModel):
    """Paginated results with cursor for next batch."""
    items: List[dict] = Field(..., max_items=100)
    next_cursor: Optional[str] = Field(None, description="Cursor for next page")
    has_more: bool = Field(False, description="Whether more results exist")
```

### Tool Example: List Customers with Pagination

```python
from pydantic import BaseModel, Field
from typing import Optional

class ListCustomersInput(BaseModel):
    """List customers with pagination."""
    limit: int = Field(10, ge=1, le=100, description="Max results per page")
    cursor: Optional[str] = Field(None, description="Pagination cursor from previous response")
    filter_status: Optional[str] = Field(None, description="Filter by status: active, inactive, trial")

class ListCustomersOutput(BaseModel):
    """Paginated customer list."""
    customers: List[dict] = Field(..., description="Up to 'limit' customers")
    next_cursor: Optional[str] = Field(None, description="Pass to next call for more results")
    total_available: int = Field(..., description="Approximate total count")

async def list_customers(input: ListCustomersInput) -> ListCustomersOutput:
    """
    List customers with optional filtering and pagination.
    
    Always limits results to prevent response bloat.
    Use cursor for pagination, not offset (more efficient).
    """
    # Enforce max limit even if client requests more
    safe_limit = min(input.limit, 100)
    
    # Fetch one extra to detect if more results exist
    results = await db.query(
        "SELECT * FROM customers WHERE status = ?",
        input.filter_status or "active",
        limit=safe_limit + 1,
        offset_cursor=input.cursor
    )
    
    has_more = len(results) > safe_limit
    items = results[:safe_limit]
    
    next_cursor = None
    if has_more:
        next_cursor = items[-1]['id']  # Use last item's ID as cursor
    
    return ListCustomersOutput(
        customers=items,
        next_cursor=next_cursor,
        total_available=await db.count("SELECT COUNT(*) FROM customers")
    )
```

---

## Design Pattern 4: Strict Input Schemas with Constraints

Use Pydantic to enforce constraints at the boundary. Never accept open-ended dicts.

### ❌ BAD: Unbounded Input

```python
# ❌ NEVER DO THIS
class SearchInput(BaseModel):
    filters: dict  # Anything goes — model doesn't know constraints
    options: dict  # Unbounded — server must validate everything

# Problems:
# - Model can pass invalid filters
# - Server has to guess what's allowed
# - No IDE autocomplete or documentation
```

### ✅ GOOD: Constrained Input

```python
from pydantic import BaseModel, Field
from enum import Enum

class CustomerStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    TRIAL = "trial"

class SearchCustomersInput(BaseModel):
    """Search and filter customers."""
    name: Optional[str] = Field(
        None, 
        min_length=2, 
        max_length=100,
        description="Customer name to search for (partial match OK)"
    )
    status: CustomerStatus = Field(
        CustomerStatus.ACTIVE,
        description="Filter by account status"
    )
    country_code: Optional[str] = Field(
        None,
        regex="^[A-Z]{2}$",
        description="2-letter ISO country code (US, UK, FR, etc)"
    )
    limit: int = Field(
        10,
        ge=1,
        le=100,
        description="Results per page (1-100)"
    )

async def search_customers(input: SearchCustomersInput) -> List[dict]:
    """
    Search customers with strict, validated filters.
    
    Benefits:
    - Model knows exactly what's allowed
    - Constraints enforced before DB call
    - Clear error messages if invalid
    """
    # All input is already validated by Pydantic
    # No defensive checks needed
    results = await db.search_customers(
        name=input.name,
        status=input.status,
        country=input.country_code,
        limit=input.limit
    )
    return results
```

---

## Design Pattern 5: Tool Annotations (Hints)

Use annotations to communicate tool behavior to the model:

### readOnlyHint

Indicates a tool doesn't mutate server state.

```python
from mcp.server.models import Tool

read_only_tool = Tool(
    name="fetch-customer-profile",
    description="Retrieve customer profile information",
    inputSchema={...},
    readOnlyHint=True  # ← Tells model this is safe to call multiple times
)
```

**When to use:**
- Query/search tools
- Read-only data fetches
- Status checks
- Analytics/reporting tools

**Effect:** Models can call these freely without worrying about side effects.

---

### destructiveHint

Indicates a tool makes irreversible changes.

```python
destroy_tool = Tool(
    name="delete-customer-account",
    description="Permanently delete a customer account and all associated data",
    inputSchema={...},
    destructiveHint=True  # ← Tells model this requires careful reasoning
)
```

**When to use:**
- Delete operations
- Account closures
- Data purges
- Billing cancellations

**Effect:** Models treat these with extra caution, may ask for confirmation.

---

### idempotentHint

Indicates a tool is safe to retry.

```python
idempotent_tool = Tool(
    name="create-invoice",
    description="Create an invoice. Safe to retry with same inputs.",
    inputSchema={...},
    idempotentHint=True  # ← Tells model retries are safe
)
```

**When to use:**
- Operations where duplicate calls produce the same result
- Tools that check for existing resources before creating
- Upsert operations (create or update)
- Idempotent state transitions

**Example Implementation:**

```python
async def create_invoice(input: CreateInvoiceInput) -> CreateInvoiceOutput:
    """
    Create or fetch an invoice.
    
    Idempotent: calling twice with same input returns same invoice_id.
    Model can safely retry on transient errors.
    """
    # Check if invoice already exists
    existing = await db.query(
        "SELECT id FROM invoices WHERE customer_id = ? AND reference_id = ?",
        input.customer_id,
        input.reference_id
    )
    
    if existing:
        return CreateInvoiceOutput(invoice_id=existing[0]['id'], created=False)
    
    # Create new invoice
    new_id = await db.insert("invoices", {...})
    return CreateInvoiceOutput(invoice_id=new_id, created=True)
```

---

### openWorldHint

Indicates a tool or resource supports unbounded discovery.

```python
# Use for resource templates that can explore many possibilities
list_resource = ResourceTemplate(
    uriTemplate="dns://api.example.com/items",
    description="List all items. Supports dynamic filtering.",
    mimeType="application/json",
    openWorldHint=True  # ← Model can explore unknown items dynamically
)
```

**When to use:**
- Resources that support arbitrary filtering
- APIs with unknown/dynamic data
- Exploration-heavy workflows

---

## Design Pattern 6: Stateless vs Stateful Tools

### Stateless Tool (Preferred)

Returns complete results without requiring previous context.

```python
# ✅ GOOD: Stateless, self-contained
class FetchInvoiceInput(BaseModel):
    invoice_id: str

class FetchInvoiceOutput(BaseModel):
    id: str
    customer_id: str
    total: float
    status: str
    items: List[dict]

async def fetch_invoice(input: FetchInvoiceInput) -> FetchInvoiceOutput:
    """Fetch full invoice details. Works regardless of call history."""
    return await db.fetch_invoice(input.invoice_id)
```

**Advantages:**
- Can be called in any order
- Result is always the same
- Easier for models to reason about
- Composable with other tools

---

### Stateful Tool (Use Rarely)

Maintains context from previous calls (conversational flow).

```python
# ⚠️ ONLY if necessary: Stateful, context-dependent
class UpdateInvoiceInput(BaseModel):
    invoice_id: str = None  # Optional if using context
    field: str  # Which field to update
    value: str  # New value

async def update_invoice(input: UpdateInvoiceInput, context: Dict) -> dict:
    """Update invoice. Depends on 'current_invoice' in context."""
    invoice_id = input.invoice_id or context.get('current_invoice')
    if not invoice_id:
        raise ValueError("No current invoice in context")
    
    # Update...
```

**When Stateful is OK:**
- Multi-step workflows with required sequence
- Tools that operate on "current selection"
- Interactive UIs or terminal-like interfaces

**Better Alternative:** Use tool parameters instead of context.

---

## Anti-Patterns & Fixes

### Anti-Pattern 1: Tool Bloat (>15 Tools)

**Problem:** Having 20+ tools in a single server

```python
# ❌ BAD: Too many tools
tools = [
    "get_user",
    "get_users",
    "search_users",
    "create_user",
    "update_user",
    "update_user_profile",
    "update_user_settings",
    "delete_user",
    "ban_user",
    "get_user_invoices",
    "get_user_payments",
    # ... 10 more ...
]
# Model gets confused about which tool to use
# Token usage explodes with tool descriptions
# Response time suffers
```

**Solution:** Use Progressive Discovery

```python
# ✅ GOOD: Core tools only (5–10)
tools = [
    "search_users",        # Find users
    "fetch_user_details",  # Get full profile
    "create_user",         # Create new user
    "update_user",         # Update user (generic)
]

# Add depth via resources
resources = [
    "dns://api.example.com/users/{id}",              # User details
    "dns://api.example.com/users/{id}/invoices",     # Invoices
    "dns://api.example.com/users/{id}/payments",     # Payments
    "dns://api.example.com/users/{id}/settings",     # Settings
]

# Model can discover and navigate the hierarchy
```

**Impact:**
- Better model reasoning (fewer options)
- Faster responses (less to evaluate)
- Clearer user intent

---

### Anti-Pattern 2: Vague Descriptions

**Problem:** Unclear tool purposes

```python
# ❌ BAD: Ambiguous descriptions
Tool(
    name="get_data",
    description="Get data from the system"  # What data? Which system?
)

Tool(
    name="process",
    description="Process something"  # Process what? How?
)

Tool(
    name="search",
    description="Search"  # Search where? What fields?
)
```

**Solution:** Specific, Actionable Descriptions

```python
# ✅ GOOD: Clear intent and usage
Tool(
    name="fetch_customer_invoices",
    description="Retrieve all invoices for a specific customer, optionally filtered by date range and status"
)

Tool(
    name="create_invoice_from_order",
    description="Generate an invoice from an existing order. Links the invoice to the order and sends payment notification"
)

Tool(
    name="search_customers_by_email",
    description="Search customer database by email address. Returns up to 10 matching customers"
)
```

**Impact:**
- Model knows exactly what each tool does
- Fewer wrong tool selections
- Better first-try success rate

---

### Anti-Pattern 3: Unbounded Response Arrays

**Problem:** Returning unlimited results

```python
# ❌ BAD: No size limit
class SearchInput(BaseModel):
    query: str

class SearchOutput(BaseModel):
    results: List[dict]  # Could be millions of items!

async def search(input: SearchInput) -> SearchOutput:
    """Search without pagination — response could be massive."""
    all_results = await db.query("SELECT * WHERE ...")
    return SearchOutput(results=all_results)  # Disaster!
```

**Solution:** Always Paginate

```python
# ✅ GOOD: Bounded, paginated responses
class SearchInput(BaseModel):
    query: str
    limit: int = Field(50, ge=1, le=100)
    cursor: Optional[str] = None

class SearchOutput(BaseModel):
    results: List[dict] = Field(..., max_items=100)
    next_cursor: Optional[str]
    total_available: int

async def search(input: SearchInput) -> SearchOutput:
    """Search with pagination — bounded response size."""
    safe_limit = min(input.limit, 100)
    results = await db.query(
        "SELECT * WHERE ... LIMIT ?",
        safe_limit + 1,
        cursor=input.cursor
    )
    has_more = len(results) > safe_limit
    return SearchOutput(
        results=results[:safe_limit],
        next_cursor=results[-1]['id'] if has_more else None,
        total_available=total_count
    )
```

**Impact:**
- Predictable response sizes
- No memory exhaustion
- Better model performance

---

### Anti-Pattern 4: Too Many Resource Templates

**Problem:** Explosion of discovery options

```python
# ❌ BAD: 30+ resource templates → discovery chaos
templates = [
    "dns://api.example.com/users",
    "dns://api.example.com/users/{id}",
    "dns://api.example.com/users/{id}/profile",
    "dns://api.example.com/users/{id}/profile/name",  # Too granular
    "dns://api.example.com/users/{id}/profile/email",
    "dns://api.example.com/users/{id}/profile/phone",
    # ... many more micro-templates ...
]
# Model gets lost trying to navigate
```

**Solution:** Organize by Natural Hierarchy

```python
# ✅ GOOD: Grouped, hierarchical templates
templates = [
    "dns://api.example.com/users",                      # List all
    "dns://api.example.com/users/{id}",                 # User details
    "dns://api.example.com/users/{id}/invoices",        # Related data
    "dns://api.example.com/users/{id}/settings",        # Configuration
]

# Client fetches /users/{id} which includes profile info
# No need for micro-templates
```

**Impact:**
- Clear navigation paths
- Fewer discovery dead-ends
- Faster model reasoning

---

## Constraints

### MUST DO

- **Write specific, actionable descriptions** — "Fetch customer invoice by invoice_id" not "Get data"
- **Use Pydantic models for all inputs/outputs** — Enable validation and IDE support
- **Paginate all list responses** — Never return unbounded arrays
- **Organize resources hierarchically** — Parent/child relationships clear from URI
- **Annotate tools appropriately** — readOnlyHint, destructiveHint, idempotentHint where applicable
- **Start with 5–10 core tools** — Add depth via resources, not more tools
- **Constrain all numeric/string fields** — min/max lengths, value ranges, regex patterns
- **Test tool behavior under edge cases** — Empty lists, null values, rate limiting

### MUST NOT DO

- Create tools with open-ended dict inputs/outputs
- Return unbounded arrays or lists
- Mix multiple responsibilities in one tool
- Use vague names like `get_data` or `process`
- Create tools that depend on hidden context
- Add tools without clear use cases (avoid speculative tools)
- Skip descriptions or use placeholder text
- Design tools that require specific call ordering (stateful sequences)
- Return raw database objects without transformation
- Ignore error cases — always handle and return descriptive errors

---

## Output Template

When designing MCP tools and resources, your output must include:

1. **Tool Inventory** — List of 5–10 core tools with names and brief descriptions
2. **Resource Hierarchy** — ASCII diagram showing parent/child relationships
3. **Tool Schema Examples** — 2–3 complete Pydantic schemas (input + output)
4. **Annotation Strategy** — Which tools get readOnlyHint, destructiveHint, idempotentHint
5. **Progressive Discovery Flow** — How models discover and use resources after tools
6. **Bounded Responses Plan** — Pagination strategy for list endpoints
7. **Anti-Pattern Review** — Checklist of patterns avoided (no tool bloat, vague descriptions, etc.)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `mcp-server-fastmcp-python` | Implement MCP server with FastMCP framework |
| `mcp-client-integration` | Integrate MCP clients to call tools and read resources |
