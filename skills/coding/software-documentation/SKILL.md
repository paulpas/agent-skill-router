---
name: software-documentation
description: Writes authoritative technical documentation (API references, inline
  docstrings, READMEs, developer guides) using modern standards like OpenAPI 3.1,
  Google/NumPy docstring formats, and MkDocs/Docusaurus static site generators.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: software documentation, API docs, docstrings, README writing, developer
    guides, OpenAPI, MkDocs, Docusaurus, technical writing for developers, how do
    i document code, Sphinx, type stubs, mypy stubs, py.typed
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
  - examples
  - do-dont
  - config
  related-skills: coding-api-design, coding-code-review, coding-type-safety-enforcement,
    coding-static-analysis-tools
------
# Technical Documentation for Software

Writes authoritative technical documentation that developers actually read and rely on. This skill produces API references with typed signatures, inline docstrings following Google/NumPy conventions, README files with usage examples, and developer guides structured for discoverability — all aligned to current 2025-2026 tooling standards.

## TL;DR Checklist

- [ ] Every public function has a docstring with typed parameters, return type, and exceptions
- [ ] API documentation uses OpenAPI 3.1 spec with security schemes and example responses
- [ ] README includes quick start section runnable in under 5 minutes
- [ ] Developer guides use "how-to" structure: problem - solution - code - explanation
- [ ] Inline comments explain why, not what - the code expresses what
- [ ] Cross-reference all docstring Args, Returns, and Raises sections with actual signatures
- [ ] Use consistent terminology across README, API docs, and inline documentation

---

## When to Use

Use this skill when:

- Writing or auditing documentation for a public API (REST, GraphQL, gRPC, CLI tools)
- Creating README.md files for libraries, frameworks, or internal tooling
- Adding inline docstrings to Python functions, classes, or modules
- Structuring developer guides that explain how to integrate with your software
- Setting up documentation generation pipelines with MkDocs, Sphinx, Docusaurus, or typedoc
- Reviewing existing documentation for accuracy against current code

## When NOT to Use

Avoid this skill for:

- Writing user-facing marketing pages or product landing pages - use a CMS instead
- Creating API reference docs for GraphQL schemas that already have auto-generated Playground docs - use the schema introspection directly
- Documenting internal implementation details that should be obvious from well-named functions and modular architecture - refactoring the code is more valuable

---

## Core Workflow

1. **Inventory Public Interfaces** - List every public function, class, endpoint, CLI command, or configuration key that external consumers interact with. For Python: any name not starting with _. For APIs: all routes in openapi.json or framework route tables.
   **Checkpoint:** Every documented interface must appear in the inventory. If you cannot find its definition in source code, mark it as undocumented and prioritize it.

2. **Choose Documentation Format per Interface Type** - Match the format to the consumer toolchain:
   - Python public APIs - Google or NumPy docstring style (pick one project-wide)
   - REST APIs - OpenAPI 3.1 YAML with security definitions, example requests/responses
   - Libraries - README.md with quick-start runnable example plus installation section
   - Developer guides - MkDocs/MkPages structure with sidebar navigation and search
   - TypeScript libraries - typedoc JSDoc comments with @example tags

3. **Write Docstrings for Every Public Symbol** - Include the signature line, one-sentence summary, parameter descriptions with types, return type, exceptions raised, and at least one usage example in a code block. For Google style: use Args: section followed by Returns: and Raises:.
   **Checkpoint:** Run pydocstyle --convention=google or equivalent lint check - every public symbol must pass with zero violations.

4. **Generate API Reference from Code** - Extract signatures from source using introspection tools (inspect module, Sphinx autodoc, typedoc) rather than writing reference docs manually. Manual copies of signatures diverge from reality within days.
   **Checkpoint:** Cross-check 3 randomly selected docstrings against actual function signatures in the source file. Any mismatch means the generation pipeline needs fixing.

5. **Write README.md with Quick-Start Section** - The first 20 lines of the README must answer: What is this? How do I install it? How do I use it in 3 commands? Use a runnable code example as the centerpiece, not abstract descriptions.
   **Checkpoint:** Can a developer copy-paste the quick-start section and get a working result without reading further? If no, add missing dependency installation steps or environment setup notes.

6. **Build Developer Guides with Task-Based Structure** - Each guide answers "How do I accomplish X?" using this template: short problem description - prerequisites - step-by-step code - expected output - troubleshooting tips.
   **Checkpoint:** Every section must be independently skimmable. A developer should find their answer by scanning headings in under 15 seconds.

7. **Set Up Documentation Generation Pipeline** - Configure mkdocs.yml (MkDocs), conf.py (Sphinx), or docusaurus.config.js to automatically regenerate docs from source on every CI run. Include a pre-commit hook that runs docstring linting.
   **Checkpoint:** make docs or npm run docs must produce a complete, buildable documentation site with no warnings or dead links.

---

## Implementation Patterns

### Pattern 1: Google-Style Docstrings (Python)

Google style is the most widely adopted Python docstring convention. It uses clear section headers (Args:, Returns:, Raises:) that are parsed by Sphinx, pydoc, and IDE tooling.

```python
def fetch_user_profiles(
    user_ids: list[int],
    include_metadata: bool = True,
    cache_ttl_seconds: int = 300
) -> dict[int, dict[str, str | None]]:
    """Fetch profile data for a batch of users with optional metadata.

    Retrieves user profile information from the database or cache layer.
    Results are cached for cache_ttl_seconds to reduce database load.
    When include_metadata is True, each profile includes extra fields
    like last_login and signup_source.

    Args:
        user_ids: Non-empty list of unique user identifiers. Raises
            ValueError if the list is empty or contains duplicates.
        include_metadata: Whether to fetch additional profile metadata.
            Defaults to True for backward compatibility.
        cache_ttl_seconds: Seconds to keep cached results. Must be between
            60 and 86400. Defaults to 300 (5 minutes).

    Returns:
        Dictionary mapping user IDs to their profile dictionaries. Each
        profile dict contains 'name' and optionally 'email', 'avatar_url',
        'last_login', and 'signup_source'. Users not found are omitted.

    Raises:
        ValueError: If user_ids is empty or contains duplicates.
        ConnectionError: If the cache layer is unreachable and database
            fallback also fails.

    Example:
        >>> profiles = fetch_user_profiles([1, 2, 3])
        >>> {uid: p['name'] for uid, p in profiles.items()}
        {1: 'Alice', 2: 'Bob', 3: 'Charlie'}
    """
    if not user_ids:
        raise ValueError("user_ids must contain at least one ID")
    if len(user_ids) != len(set(user_ids)):
        raise ValueError("user_ids contains duplicate IDs")

    profiles = {}
    for uid in user_ids:
        cached = _cache.get(f"profile:{uid}")
        if cached is not None:
            profiles[uid] = cached
            continue
        record = _db.query_user(uid)
        if record is None:
            continue
        if include_metadata:
            meta = _db.query_user_metadata(uid)
            record["last_login"] = meta.get("last_login")
            record["signup_source"] = meta.get("source")
        profiles[uid] = record
        _cache.set(f"profile:{uid}", record, ttl=cache_ttl_seconds)

    return profiles
```

### Pattern 2: OpenAPI 3.1 API Documentation

OpenAPI 3.1 is the current standard for REST API documentation. It supports JSON Schema draft 2020-12, security schemes, and example objects - all required for modern API consumer tooling like Orval, OpenAPI Generator, and Redocly.

```yaml
openapi: 3.1.0
info:
  title: User Management API
  version: 2.1.0
  description: RESTful API for managing user profiles and team memberships.
  contact:
    name: API Support
    email: api-support@example.com

servers:
  - url: https://api.example.com/v2
    description: Production
  - url: https://staging-api.example.com/v2
    description: Staging

security:
  - BearerAuth: []

paths:
  /users:
    get:
      summary: List all users with pagination
      operationId: listUsers
      tags: [Users]
      parameters:
        - name: page
          in: query
          required: false
          schema:
            type: integer
            minimum: 1
            default: 1
          description: Page number for pagination (1-indexed).
        - name: limit
          in: query
          required: false
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
          description: Number of results per page. Maximum 100.
      responses:
        "200":
          description: A paginated list of user profiles.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/PaginatedUserList"
              example:
                data:
                  - id: 42
                    name: Alice Chen
                    email: alice@example.com
                meta:
                  page: 1
                  limit: 20
                  total: 150
        "401":
          $ref: "#/components/responses/Unauthorized"

    post:
      summary: Create a new user profile
      operationId: createUser
      tags: [Users]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateUserRequest"
            example:
              name: "Bob Martinez"
              email: "bob@example.com"
              role: "developer"
      responses:
        "201":
          description: User created successfully.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/UserProfile"
        "409":
          $ref: "#/components/responses/Conflict"

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    CreateUserRequest:
      type: object
      required: [name, email]
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 200
          description: Full legal name of the user.
        email:
          type: string
          format: email
          description: Primary email address (must be unique).
        role:
          type: string
          enum: [admin, developer, viewer]
          default: viewer
          description: Default role assigned on creation.

    UserProfile:
      type: object
      required: [id, name, email]
      properties:
        id:
          type: integer
          format: int64
          readOnly: true
        name:
          type: string
        email:
          type: string
          format: email
        role:
          $ref: "#/components/schemas/CreateUserRequest/properties/role"
        created_at:
          type: string
          format: date-time
          readOnly: true

  responses:
    Unauthorized:
      description: Authentication credentials are missing or invalid.
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: string
                example: "Invalid or expired bearer token"
    Conflict:
      description: A resource with the same unique constraint already exists.
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: string
                example: "User with this email already exists"
```

### Pattern 3: README.md Structure

A well-structured README follows a descending information hierarchy - broad overview first, then increasingly specific details. The quick-start section is the most important part and should be copy-paste runnable.

```markdown
# DataPipe - Batch ETL Framework

> Lightweight Python framework for building, testing, and monitoring batch ETL pipelines with declarative YAML configuration.

## Quick Start

Install and run your first pipeline in under 2 minutes:

```bash
pip install datapipe

cat > etl.yaml <<EOF
source:
  type: csv
  path: data/input.csv

transform:
  - filter: age > 18
    rename_fields:
      full_name: name
      email_address: email

sink:
  type: postgres
  connection: "postgresql://localhost:5432/etl_output"
  table: processed_users
EOF

datapipe run etl.yaml
```

## Installation

```bash
pip install datapipe
pip install datapipe[postgres]  # optional extras
pip install datapipe[dev]       # development dependencies
```

## Configuration Reference

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| source | Yes | object | Input data source configuration |
| sink | Yes | object | Output destination configuration |
| transform | No | list | Ordered list of transformation steps |

See [Configuration Guide](docs/config-reference.md) for full field options.

## Contributing

1. Fork the repository and create a feature branch
2. Run tests: `pytest -v`
3. Ensure linting passes: `ruff check . && mypy src/`
4. Submit a pull request with a descriptive title
```

---

## Constraints

### MUST DO
- Write docstrings for every public function and class - never skip them with pass or bare implementations
- Use Google-style or NumPy-style consistently across the entire project (pick one in team conventions, not per-function)
- Include at least one runnable code example in every README.md quick-start section
- Document every API endpoint with request schema, response schema, and at least one example request/response pair
- Cross-reference docstring types with actual function signatures - Args: name (str) must match the real parameter type
- Use MkDocs-Material or equivalent theme for developer guides, including search and copy-buttons on code blocks
- Keep README.md under 150 lines; move detailed content to separate guide pages linked from the nav

### MUST NOT DO
- Write documentation that describes what the code does - describe why it exists and how to use it
- Hardcode internal implementation details (class names, method signatures) in user-facing guides that change frequently
- Use passive voice extensively (write "Note that..." instead of "It should be noted that...")
- Include documentation-only files with content older than the current release - stale docs are worse than no docs
- Write OpenAPI examples with fake data like user1@example.com or John Doe - use realistic, anonymized production-like data
- Document private/internal APIs as if they were public contracts - prefix internal interfaces with _ and exclude them from generated reference docs

---

## Output Template

When creating or reviewing software documentation, produce:

1. **Documentation Gap Report** - List of undocumented public symbols with their file paths, function signatures, and recommended docstring format
2. **Docstring Drafts** - Complete Google/NumPy-style docstrings for each uncovered symbol, including typed parameters, return types, exceptions, and examples
3. **API Reference Update** - OpenAPI 3.1 YAML snippets for any undocumented or mis-documented endpoints
4. **README Audit** - Checklist of required README sections (quick-start, installation, configuration, contributing) with pass/fail per section
5. **Developer Guide Review** - Assessment of existing guides against task-based structure; rewritten sections where the current version is procedural instead of task-oriented

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-api-design` | Design the API contract before documenting it - routes, error codes, versioning strategy |
| `coding-code-review` | Review documentation for accuracy during pull requests alongside code review |
| `coding-type-safety-enforcement` | Ensures docstring type annotations match actual enforced types via static analysis |
| `coding-static-analysis-tools` | Runs pydocstyle, sphinx-build, and markdown linters in CI as part of the documentation pipeline |

---

## Live References

> Authoritative documentation and tools for modern software documentation practices as of 2026. The model follows these links at load time to resolve external references.

- [Google Python Style Guide - Docstrings](https://google.github.io/styleguide/pyguide.html#38-comments-and-docstrings) - Official docstring conventions
- [OpenAPI Specification 3.1.0](https://spec.openapis.org/oas/v3.1.0) - Current REST API documentation standard
- [MkDocs Material Documentation](https://squidfunk.github.io/mkdocs-material/) - Most popular MkDocs theme with search, tabs, and admonitions
- [Sphinx autodoc Extension](https://www.sphinx-doc.org/en/master/usage/extensions/autodoc.html) - Auto-generate reference docs from docstrings
- [NumPy Docstring Standard](https://numpydoc.readthedocs.io/en/latest/format.html) - Alternative docstring format used in scientific Python
- [Redocly OpenAPI Linter](https://redocly.com/docs/cli/commands/lint/) - Automated validation of OpenAPI documents
