---
name: supabase-sdk
description: Integrates Supabase using supabase-py 2.x with patterns for database
  queries (PostgREST), auth management, storage operations, real-time subscriptions,
  and Edge Functions.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: coding
  triggers: supabase, supabase-py, postgrest, supabase auth, supabase storage, how
    do i use supabase from python, supabase realtime, edge functions
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
  content-types:
  - code
  - guidance
  - do-dont
  - examples
  related-skills: coding-postgresql-sdk, coding-firebase-sdk, coding-authentication-patterns
---
# Supabase Python SDK Integration

Integrates Supabase using `supabase-py` 2.x with patterns for PostgREST database queries, Row-Level Security (RLS), user authentication (email, OAuth, magic link), file storage, real-time subscriptions, and Edge Functions invocation.

## TL;DR Checklist

- [ ] Use `create_client()` with Supabase URL and anon/service role key to initialize
- [ ] Use `supabase.table()` for PostgREST queries — supports `select`, `insert`, `update`, `delete`
- [ ] Use `supabase.auth` for user management — sign up, sign in, session handling
- [ ] Use `supabase.storage` for file uploads and downloads from Supabase Storage
- [ ] Use `supabase.realtime` for subscribing to database changes and broadcast events
- [ ] Use `supabase.functions` for invoking Edge Functions
- [ ] Use RLS policies in Supabase dashboard — never use service_role key in client-side code

---

## When to Use

Use this skill when:

- Building full-stack applications with Supabase as the backend (database + auth + storage)
- Implementing user authentication flows (email/password, OAuth, magic link, phone)
- Querying PostgreSQL through Supabase's PostgREST API with filtering and pagination
- Uploading and serving files through Supabase Storage with public/private buckets
- Building real-time features with database change subscriptions and presence
- Deploying serverless Edge Functions for custom backend logic
- Implementing Row-Level Security policies for multi-tenant applications

---

## When NOT to Use

- For direct PostgreSQL access without the Supabase layer (use psycopg2/asyncpg directly)
- When you need complex multi-table transactions (use raw SQL through Supabase's SQL API)
- For applications that don't need auth, storage, or real-time features (use psycopg2 directly)
- For high-throughput real-time messaging at scale (use dedicated WebSocket infrastructure)
- When you need full control over the PostgreSQL connection pool (use asyncpg directly)

---

## Core Workflow

### 1. Initialize Supabase Client

```python
from supabase import create_client, Client
from supabase.lib.client_options import ClientOptions
import os

supabase: Client = create_client(
    supabase_url=os.environ["SUPABASE_URL"],      # https://xyz.supabase.co
    supabase_key=os.environ["SUPABASE_ANON_KEY"],  # anon public key
    options=ClientOptions(
        postgrest_client_timeout=30,
        storage_client_timeout=30,
        schema="public",
        auto_refresh_token=True,
        persist_session=True,
    ),
)
```

**Checkpoint:** Verify connectivity by calling `supabase.auth.get_session()` or querying a simple table. The anon key is safe for client-side use as long as RLS is properly configured.

### 2. Database Queries via PostgREST

```python
def list_public_articles(
    supabase: Client,
    category: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    """Query articles with filtering, pagination, and sorting."""
    query = (
        supabase.table("articles")
        .select("id, title, excerpt, category, created_at, author:author_id(name, avatar_url)")
        .eq("published", True)
        .order("created_at", desc=True)
        .range((page - 1) * page_size, page * page_size - 1)
    )

    if category:
        query = query.eq("category", category)

    response = query.execute()
    return {
        "data": response.data,
        "count": response.count if hasattr(response, 'count') else len(response.data),
    }

def create_article(supabase: Client, article_data: dict) -> dict:
    """Insert a new article. RLS must allow insert for the authenticated user."""
    response = supabase.table("articles").insert(article_data).execute()
    return response.data[0] if response.data else {}
```

**Checkpoint:** Always filter with `.eq()`, `.gte()`, `.ilike()` etc. — never fetch all rows and filter in Python. Use `.range()` for pagination instead of `.limit()` alone. Use `.single()` when expecting exactly one row.

### 3. User Authentication

```python
def sign_up_user(supabase: Client, email: str, password: str, metadata: dict | None = None) -> dict:
    """Register a new user with email and password."""
    response = supabase.auth.sign_up({
        "email": email,
        "password": password,
        "options": {"data": metadata or {}},
    })
    return {
        "user": response.user,
        "session": response.session,
    }

def sign_in_user(supabase: Client, email: str, password: str) -> dict:
    """Authenticate a user and get session tokens."""
    response = supabase.auth.sign_in_with_password({
        "email": email,
        "password": password,
    })
    return {
        "access_token": response.session.access_token,
        "refresh_token": response.session.refresh_token,
        "user": response.user,
    }

def get_current_user(supabase: Client) -> dict | None:
    """Get the currently authenticated user."""
    response = supabase.auth.get_user()
    return response.user if response else None

def sign_out(supabase: Client) -> None:
    """Sign out the current user and invalidate session."""
    supabase.auth.sign_out()
```

**Checkpoint:** Always verify the session is valid with `get_user()` before accessing user-specific data. Handle `AuthApiError` for invalid credentials. Store refresh tokens securely to persist sessions.

### 4. File Storage Operations

```python
def upload_avatar(
    supabase: Client,
    bucket: str,
    file_path: str,
    file_content: bytes,
    content_type: str = "image/png",
) -> str:
    """Upload a file to Supabase Storage and return its public URL."""
    response = supabase.storage.from_(bucket).upload(
        path=file_path,
        file=file_content,
        file_options={"content-type": content_type},
    )
    # Get public URL
    public_url = supabase.storage.from_(bucket).get_public_url(file_path)
    return public_url

def list_storage_files(supabase: Client, bucket: str, folder: str = "") -> list[dict]:
    """List files in a storage bucket folder."""
    files = supabase.storage.from_(bucket).list(folder)
    return [{"name": f["name"], "updated_at": f["updated_at"], "size": f["metadata"]["size"]} for f in files]
```

**Checkpoint:** Buckets must be created in the Supabase dashboard first. Public buckets are accessible without authentication. Private buckets require a valid access token. Use signed URLs for temporary access to private files.

---

## Implementation Patterns

### Pattern 1: Real-Time Subscriptions

```python
def subscribe_to_channel(supabase: Client, channel: str, table: str, filter_str: str | None = None):
    """Subscribe to real-time database changes."""
    channel_obj = supabase.channel(channel)

    def handle_insert(payload):
        print(f"New record: {payload}")

    channel_obj.on(
        event="INSERT",
        schema="public",
        table=table,
        filter=filter_str,
        callback=handle_insert,
    ).subscribe()

    return channel_obj  # Keep reference to unsubscribe later
```

### Pattern 2: Invoke Edge Function

```python
def invoke_process_payment(supabase: Client, payment_data: dict) -> dict:
    """Invoke a Supabase Edge Function for payment processing."""
    response = supabase.functions.invoke(
        function_name="process-payment",
        invoke_options={"body": payment_data},
    )
    return response.data
```

### Pattern 3: Row-Level Security Helper

```python
# Execute as authenticated user by setting the access token
def query_user_orders(supabase: Client, user_id: str) -> list[dict]:
    """Query orders filtered by RLS (user_id must match auth.uid())."""
    response = (supabase.table("orders")
        .select("id, total, status, created_at")
        .order("created_at", desc=True)
        .execute())
    return response.data

# Execute with admin privileges (bypass RLS) — use service_role key
from supabase import create_client

admin_client = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"],  # Keep secret!
)
admin_response = (admin_client.table("profiles")
    .select("*")
    .execute())
```

**Checkpoint:** Never expose the `service_role` key to client-side code. It bypasses all RLS policies. Use it only in trusted server environments.

### BAD vs GOOD: Query Pattern

```python
# ❌ BAD — Fetch all and filter in Python
def find_by_category_bad(supabase, category):
    all_articles = supabase.table("articles").select("*").execute()
    return [a for a in all_articles.data if a["category"] == category]

# ✅ GOOD — Server-side filter
def find_by_category_good(supabase: Client, category: str):
    return supabase.table("articles").select("*").eq("category", category).execute()
```

### BAD vs GOOD: Auth Session Handling

```python
# ❌ BAD — Storing session in a global variable
session = None
def login_bad(supabase, email, password):
    global session
    session = supabase.auth.sign_in_with_password({"email": email, "password": password})

# ✅ GOOD — Use supabase-py session persistence and refresh
def login_good(supabase: Client, email: str, password: str) -> None:
    response = supabase.auth.sign_in_with_password({"email": email, "password": password})
    # Session is automatically stored in-memory; call get_session() to verify
    assert supabase.auth.get_session(), "Session not established"
```

---

## Constraints

### MUST DO
- Use RLS policies for data access control — never rely solely on client-side filtering
- Use the `anon` key for client-side applications and `service_role` key only in trusted servers
- Prefer `.eq()`, `.gte()`, `.in_()` filters over fetching all rows
- Use `.range()` for pagination — it maps directly to SQL `OFFSET`/`LIMIT`
- Use `supabase.auth.get_session()` before every user operation to verify valid auth state
- Store refresh tokens securely to persist user sessions across restarts
- Use `execute()` to run queries — without it, no request is sent

### MUST NOT DO
- Never expose the `service_role` key to client or browser code
- Do not use string formatting for query values — use `.eq()`, `.gte()` etc. for SQL injection safety
- Avoid selecting `*` in production — specify columns explicitly for performance
- Do not store Supabase credentials in version control — use environment variables
- Never process database records without checking `response.data` for None/empty
- Do not ignore `AuthApiError` — handle invalid credentials, expired tokens, and rate limits

---

## Output Template

When writing Supabase integration code, structure your output as:

1. **Client Initialization** — create_client() with URL, API key, and client options
2. **Authentication** — Auth call (sign up, sign in, session refresh) with error handling
3. **Database Operation** — PostgREST query with filters, pagination, and ordering
4. **RLS Consideration** — Document whether the operation uses anon (RLS) or service_role (admin) key
5. **Response Processing** — Extract .data, handle empty responses, check for errors

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-postgresql-sdk` | Direct PostgreSQL access with psycopg2/asyncpg |
| `coding-firebase-sdk` | Firebase BaaS patterns (alternative to Supabase) |
| `coding-authentication-patterns` | Auth flow patterns (JWTs, sessions, OAuth) |

---

## Live References

- [Supabase Python SDK Docs](https://supabase.com/docs/reference/python/) — Official supabase-py reference
- [Supabase Database API](https://supabase.com/docs/guides/database) — PostgREST query patterns
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth) — Authentication, RLS, and user management
- [Supabase Storage API](https://supabase.com/docs/guides/storage) — File upload, download, and CDN
- [Supabase Realtime](https://supabase.com/docs/guides/realtime) — WebSocket subscriptions and broadcast
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions) — Deno-based serverless functions
- [supabase-py GitHub](https://github.com/supabase/supabase-py) — Source code and release notes
