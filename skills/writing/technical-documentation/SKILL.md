---




name: technical-documentation
description: Writes clear, structured technical documentation including READMEs, API
  docs, getting-started guides, and architectural overviews following industry conventions
  and developer experience best practices.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: writing
  triggers: technical documentation, how do i write docs, README, API documentation, getting started guide, architecture overview, developer experience, docs-as-code getting started guide
  archetypes:
  - educational
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: medium
    directive_strength: low
    abstraction_level: strategic
  role: reference
  scope: implementation
  output-format: report
  content-types:
  - guidance
  - examples
  - do-dont
  related-skills: humanizer




---




# Technical Documentation Writer

Writes clear, structured, and actionable technical documentation that helps developers understand, adopt, and use software effectively. Covers READMEs, API references, getting-started guides, and architectural overviews using proven conventions.

## TL;DR Checklist

- [ ] Lead with the "why" — users need to know what this project does before how it works
- [ ] Use progressive disclosure: basics first, advanced topics behind links or in separate pages
- [ ] Every code example must be complete enough to copy-paste and run (or clearly indicate what's omitted)
- [ ] Include both "quick start" (5 minutes) and "deep dive" sections
- [ ] Cross-reference related concepts within the docs rather than expecting users to search elsewhere
- [ ] Use consistent terminology — don't swap between "server", "backend", "API endpoint", and "service" for the same thing

---

## When to Use

Use this skill when:

- Writing a project README from scratch or revamping an existing one
- Documenting API endpoints, methods, classes, or interfaces for a codebase
- Creating onboarding or getting-started guides for new developers joining a project
- Writing architectural decision records (ADRs) or system design documentation
- Converting verbal explanations or meeting notes into structured technical docs
- Improving an existing document that developers find confusing or incomplete

## When NOT to Use

Avoid this skill for:

- Writing marketing copy, blog posts, or release announcements — use writing/style-guide instead
- Creating user-facing help articles or end-user manuals — those need a different tone and structure
- Translating AI-written text into natural language — use the humanizer skill for that
- Updating code comments inline with docstrings — those follow language-specific conventions

---

## Core Workflow

1. **Identify the Audience and Purpose** — Before writing a single word, determine:
   - Who is reading this? (new developers, API consumers, team members, contributors)
   - What should they be able to do after reading? (install, integrate, understand architecture)
   - What prior knowledge can you assume? (Do they know the framework? The domain?)

2. **Choose the Document Type** — Match structure to purpose:
   - README → Project overview + quick start + key concepts + contribution guidelines
   - API Reference → Endpoint/method name + parameters + return types + examples + error codes
   - Getting Started → Prerequisites + installation + first working example (not "hello world", but a real use case)
   - Architecture Overview → System diagram description + component roles + data flow + tech stack rationale

3. **Draft the Content** — Follow the structure for your document type:
   - Start with a one-sentence summary that stands alone (users often never read past it)
   - Use headings as a navigational outline — a user should understand the doc just by reading headings
   - Write code examples in context, not as isolated blocks that require external explanation

4. **Review for Developer Experience** — Apply these lenses:
   - The "Time to Hello World" test — how many steps until a user gets something working?
   - The "missing assumption" check — what did you assume they already know that they don't?
   - The "broken link" audit — do all cross-references work and point to current content?

5. **Format for Readability** — Apply consistent formatting:
   - Use tables for parameters with columns: Name | Type | Required | Description
   - Use inline code (backticks) for file paths, config values, CLI commands
   - Use fenced code blocks (with language) for multi-line examples
   - Use callout boxes (note/warning/tip) sparingly — they only work if you use them rarely

---

## Implementation Patterns / Reference Guide

### Pattern 1: README Structure

A good README answers these questions in order: What is this? Why should I care? How do I use it? How do I contribute?

```markdown
# Project Name

One-sentence description that a stranger can understand. No jargon without explanation.

## Quick Start

Three to five commands or steps that get a developer from zero to "it works." 
This section should be copy-paste executable for most users.

```bash
git clone https://github.com/owner/repo.git
cd repo
pip install -e .
# Run the example
python examples/basic.py
```

## Table of Contents

- [Installation](#installation) — Prerequisites, setup for different environments
- [Usage](#usage) — Common use cases with code examples
- [API Reference](#api-reference) — Link to full API docs (or embed if small)
- [Configuration](#configuration) — Environment variables, config files, defaults
- [Development](#development) — How to run tests, linting, contributing guidelines

## Installation

### Prerequisites

- Python 3.10+
- PostgreSQL 14+
- Redis 7+

```bash
# Install from source
git clone https://github.com/owner/repo.git && cd repo
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

### Configuration

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
# Edit .env with your database credentials, API keys, etc.
```

## Usage

### Basic Example

```python
from myproject import Client

client = Client(api_key="your-key")
result = client.query("select count(*) from users")
print(result)
```

### Advanced: Streaming Results

For large result sets, use streaming to avoid loading everything into memory:

```python
with client.stream_query(
    "SELECT * FROM events WHERE date > '2024-01-01'",
    batch_size=1000
) as stream:
    for batch in stream:
        process_batch(batch)
```

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting pull requests.
```

### Pattern 2: API Reference Documentation (BAD vs GOOD)

API documentation should answer every question a consumer might have before they need to ask.

```markdown
<!-- ❌ BAD: Sparse, assumes too much knowledge -->

## Methods

### query(sql)

Executes SQL against the database. Returns results.

**Parameters:**
- `sql` — The SQL string

**Returns:** Results

---

<!-- ✅ GOOD: Complete, copy-paste ready, with edge cases covered -->

## Methods

### `query(sql: str) -> QueryResult`

Executes a SQL query against the connected database and returns structured results.

This method handles connection pooling automatically and supports both synchronous
and asynchronous execution contexts.

**Parameters:**

| Parameter | Type   | Required | Description                          |
|-----------|--------|----------|--------------------------------------|
| `sql`     | `str`  | Yes      | SQL query string to execute          |
| `params`  | `list` | No       | Positional parameters for prepared statements |
| `timeout` | `int`  | No       | Query timeout in seconds (default: 30) |

**Returns:**

`QueryResult` object containing:

| Attribute   | Type          | Description                        |
|-------------|---------------|------------------------------------|
| `rows`      | `list[dict]`  | Result rows as dictionaries        |
| `columns`   | `list[str]`   | Column names in order              |
| `row_count` | `int`         | Number of rows returned            |
| `affected`  | `int`         | Rows affected (for INSERT/UPDATE)  |

**Example:**

```python
result = client.query(
    "SELECT id, name FROM users WHERE active = ?",
    params=[True],
    timeout=10
)

for row in result.rows:
    print(f"{row['id']}: {row['name']}")
```

**Error Handling:**

| Error Type           | When Raised                          | Recovery                    |
|---------------------|--------------------------------------|-----------------------------|
| `ConnectionError`   | Database unavailable                 | Retry with exponential backoff |
| `QueryTimeoutError` | Query exceeded timeout limit         | Simplify query or increase timeout |
| `ParseError`        | SQL syntax error                     | Validate SQL before execution |

**Notes:**

- For large result sets (>100K rows), prefer `stream_query()` to avoid memory pressure
- Parameterized queries (`params`) are required for user-supplied input to prevent SQL injection
- Connection pooling is handled transparently — no manual connection management needed
```

### Pattern 3: Getting Started Guide Structure

A getting started guide should take a developer from "never heard of this" to "building something real" in under 15 minutes.

```markdown
# Getting Started with [Project Name]

This guide walks you through your first working integration in about 10 minutes.

## What You'll Build

By the end of this guide, you'll have a running application that:

1. Connects to [Service/API/Database]
2. Performs a real operation (not "hello world")
3. Handles errors gracefully

**Prerequisites:**

- Python 3.10+ installed (`python --version` should show 3.10 or higher)
- An active [Account Type] with your API key from the [Dashboard URL]
- At least 500MB of free disk space

## Step 1: Install the SDK

```bash
pip install project-sdk
```

Verify the installation:

```bash
python -c "import project_sdk; print(project_sdk.__version__)"
# Should print something like: 2.4.1
```

If you see `ModuleNotFoundError`, ensure your virtual environment is activated:

```bash
source .venv/bin/activate  # On macOS/Linux
# or
.venv\Scripts\activate     # On Windows
```

## Step 2: Configure Your API Key

Create a file called `config.yaml` in your project root:

```yaml
api_key: "your-api-key-here"
environment: "development"
timeout: 30
```

> **⚠️ Security Note:** Never commit your API key to version control. Add `config.yaml` to your `.gitignore`.

## Step 3: Write Your First Query

Create `main.py`:

```python
from project_sdk import Client, ConfigError

try:
    client = Client.from_config("config.yaml")
    
    # This is a real query — not "hello world"
    response = client.list_resources(limit=10)
    
    for resource in response.items:
        print(f"{resource.id}: {resource.name} ({resource.status})")
        
except ConfigError as e:
    print(f"Configuration error: {e}")
    print("Check that config.yaml exists and contains a valid api_key.")
except ConnectionError as e:
    print(f"Connection failed: {e}")
    print("Verify your API key is correct and the service is reachable.")
```

Run it:

```bash
python main.py
# Expected output:
# abc123: My Resource (active)
# def456: Another Resource (pending)
# ...
```

## Step 4: What's Next?

- [API Reference](./api-reference.md) — Full documentation of all methods and classes
- [Advanced Patterns](./advanced-patterns.md) — Streaming, batch operations, error handling strategies
- [Troubleshooting](./troubleshooting.md) — Common issues and solutions
- [Examples Repository](https://github.com/owner/project-examples) — Real-world usage examples

## Need Help?

- 🐛 Report bugs: [GitHub Issues](https://github.com/owner/project/issues)
- 💬 Ask questions: [Discord Community](https://discord.gg/example)
- 📧 Email support: support@example.com (response within 24 hours on business days)
```

### Pattern 4: Architecture Overview

An architecture overview explains the "why" behind system design decisions without drowning readers in implementation details.

```markdown
# System Architecture

This document describes the high-level architecture of [Project Name], including component responsibilities, data flow, and technology choices.

## High-Level Overview

[Project Name] follows a **service-oriented architecture** with three primary tiers:

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│  Client App │────▶│   API Layer  │────▶│  Data Services   │
│  (Web/Mobile)│    │  (FastAPI)   │     │  (PostgreSQL +   │
│              │◀────│              │◀────│   Redis Cache)   │
└─────────────┘     └──────┬───────┘     └──────────────────┘
                           │
                    ┌──────▼───────┐
                    │  Background  │
                    │  Workers     │
                    │  (Celery)    │
                    └──────────────┘
```

**Key Design Decisions:**

1. **API Gateway Pattern** — All external traffic routes through a single FastAPI entry point for authentication, rate limiting, and request validation before reaching business logic.

2. **CQRS Separation** — Read operations use Redis-cached queries (fast path). Write operations go through the command pipeline with event sourcing for audit trails.

3. **Async Workers** — CPU-intensive tasks (report generation, data processing) are offloaded to Celery workers, keeping the API layer responsive.

## Component Responsibilities

### API Layer (FastAPI)

The public-facing entry point. Handles:
- Request/response serialization (Pydantic models)
- Authentication via JWT tokens
- Input validation and sanitization
- Rate limiting (100 req/min per API key)
- Structured logging (JSON format, correlation IDs)

**Not its responsibility:** Business logic, data persistence, or background processing.

### Data Services

**PostgreSQL** — Primary data store for:
- User accounts and profiles
- Transaction records (immutable audit trail)
- Configuration and metadata

**Redis** — Cache layer for:
- Session storage (TTL-based expiration)
- Query result caching (5-minute default TTL)
- Distributed rate limiting counters

### Background Workers

Celery workers consume from RabbitMQ queues:
- `high_priority` — Time-sensitive operations (webhooks, real-time notifications)
- `standard` — Report generation, data syncs, batch processing
- `low_priority` — Analytics aggregation, cleanup tasks

Each queue has configurable concurrency limits to prevent resource contention.

## Data Flow Example: Creating a Resource

1. **Client** sends POST `/resources` with JSON body and JWT token
2. **API Layer** validates the token, deserializes the request into a Pydantic model
3. **Business Logic** creates the record in PostgreSQL within a database transaction
4. **Event Emitter** publishes a `resource.created` event to RabbitMQ
5. **Worker** consumes the event and triggers downstream processes (notifications, cache invalidation)
6. **Response** returns HTTP 201 with the created resource representation

## Technology Rationale

| Component | Choice | Why | Alternative Considered |
|-----------|--------|-----|----------------------|
| API Framework | FastAPI | Native async support, automatic OpenAPI docs, Pydantic integration | Django REST Framework, Flask + Marshmallow |
| Database | PostgreSQL | ACID compliance, JSONB for flexible schemas, mature ORM support | MySQL, MongoDB |
| Cache | Redis | In-memory speed, pub/sub for real-time updates, native TTL | Memcached, local LRU cache |
| Task Queue | Celery + RabbitMQ | Battle-tested at scale, retry semantics, priority queues | RQ, Airflow (too heavy), Temporal (overkill) |

## Scaling Considerations

- **Read-heavy workloads:** Redis cache hit ratio typically 85-92%, reducing PostgreSQL load by ~60%
- **Write scaling:** PostgreSQL read replicas serve 40% of queries; primary handles all writes
- **Horizontal scaling:** API layer and workers are stateless — add instances behind a load balancer
- **Bottlenecks to watch:** Redis memory usage (maxmemory policy: `allkeys-lru`), RabbitMQ queue depth (>10K items triggers alert)
```

---

## Constraints

### MUST DO
- Write for the "busy developer" — they scan first, read selectively. Make skimmable information (headings, bold key terms, code snippets) easy to find
- Every code example must include the import statement and any setup required to run it standalone
- Use consistent naming across all docs — if you call something a "resource" in one section, don't call it an "entity" or "object" elsewhere
- Link related documents to each other — users should never have to guess what to read next
- Include error handling in examples — production code fails, and your docs should show how to handle failures gracefully

### MUST NOT DO
- Do NOT write documentation that requires reading a separate document to understand the example (everything self-contained)
- Do NOT use vague language like "easily," "seamlessly," or "powerfully" — these add no information
- Do NOT include internal implementation details in user-facing docs (save those for architecture docs or code comments)
- Do NOT mix first-person ("I recommend...") and second-person ("you should...") voice in the same document
- Do NOT assume knowledge of acronyms on first use — spell them out once, then use the abbreviation

---

## Output Template

When writing or reviewing technical documentation, produce:

1. **Document Type Assessment** — Identify what kind of document is needed (README, API reference, getting-started guide, architecture overview) and why
2. **Audience Analysis** — Describe who this is for and what they already know
3. **Content Outline** — Provide a heading-based outline before writing full content
4. **Draft Document** — Complete markdown document following the structure appropriate to its type
5. **Code Examples** — All examples must be complete, copy-paste executable, with language tags
6. **Review Checklist** — Note any areas that need verification (API endpoint URLs, configuration values, version numbers)

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `humanizer` | Detects and removes AI writing patterns after drafting docs to produce natural, human-sounding prose |
