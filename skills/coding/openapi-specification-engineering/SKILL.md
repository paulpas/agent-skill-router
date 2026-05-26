---
name: openapi-specification-engineering
description: Engineers production OpenAPI 3.x specifications including schema design, discriminator patterns, reusable components, parameter validation, response schemas, external documentation links, and automated code generation workflows for type-safe client and server implementations.
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
  triggers: openapi specification, openapi 3, swagger spec, API spec design, schema engineering, openapi codegen, how do i write an openapi spec
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, examples, do-dont]
  related-skills: api-contract-first-engineering, rest-api-patterns, graphql-schema-design
---

# OpenAPI Specification Engineering

Engineers production-ready OpenAPI 3.x specifications that serve as the single source of truth for API contract design. Covers schema engineering, discriminator patterns, reusable components, validation constraints, and automated code generation for type-safe client and server implementations.

## TL;DR Checklist

- [ ] Declare `openapi: 3.1.0` (or `3.0.x`) as the top-level document field
- [ ] Define all schemas in `components/schemas` using `$ref` — never inline complex types
- [ ] Include at least one authentication scheme in `components/securitySchemes`
- [ ] Add `discriminator` to polymorphic schemas for runtime type resolution
- [ ] Use `pattern`, `minLength`, `maxLength`, and `format` for input validation
- [ ] Generate client/server stubs from the spec using OpenAPI Generator or similar tooling

---

## When to Use

- Designing a new API from scratch (contract-first development)
- Creating or updating an existing OpenAPI specification for a REST API
- Setting up automated code generation for type-safe client SDKs or server stubs
- Documenting internal microservice APIs for cross-team consumption
- Establishing API contract standards across multiple services in a domain

---

## When NOT to Use

- Rapid prototyping where the API surface changes hourly — use ad-hoc documentation instead
- GraphQL APIs — use the GraphQL SDL instead (see `graphql-schema-design`)
- Simple CRUD backends without external consumers — internal-only APIs may not need formal specs
- When you cannot commit to schema stability — OpenAPI contracts create implicit promises to consumers

---

## Core Workflow

1. **Define API Metadata** — Set `info` object with title, description, version, and contact. Establish the API's namespace and lifecycle.
   **Checkpoint:** Version must follow semantic versioning (e.g., `v2.1.0`). Description should mention the authentication mechanism.

2. **Define Paths and Operations** — For each endpoint, declare `operationId`, summary, description, and request/response schemas. Group by resource path (e.g., `/users/{userId}`).
   **Checkpoint:** Every operation must have a unique `operationId` across the entire document. Use kebab-case with dot notation: `get-user`, `create-order`.

3. **Design Schema Components** — Define reusable `$ref` schemas in `components/schemas`. Apply validation constraints (`pattern`, `format`, `enum`). Use `allOf`/`oneOf`/`anyOf` for composition.
   **Checkpoint:** No schema should be longer than 50 lines without a comment explaining the composition pattern.

4. **Configure Authentication** — Add security schemes in `components/securitySchemes`. Reference them at operation or global level via `security` field.
   **Checkpoint:** At least one auth scheme must use OAuth2, OpenID Connect, or Bearer JWT — never Basic Auth in production specs.

5. **Add Discriminators for Polymorphism** — For union types and inheritance hierarchies, add `discriminator.propertyName` and `mapping` to enable runtime type resolution.
   **Checkpoint:** Every discriminated schema must have a required string property matching the discriminator name.

6. **Run Validation and Code Generation** — Validate the spec with `openapi-cli` or `spectral`. Generate client/server stubs to verify the spec is machine-processable.
   **Checkpoint:** If code generation fails, fix the spec issue before proceeding — the generator catches structural problems the linter misses.

---

## Implementation Patterns

### Pattern 1: Complete API Spec with OAuth2 + Bearer Auth

Full production specification demonstrating paths, parameters, request/response schemas, and dual authentication strategies.

```yaml
openapi: "3.1.0"
info:
  title: "Account Management API"
  description: |
    REST API for managing user accounts, profiles, and settings.
    Supports OAuth2 Authorization Code flow and Bearer JWT token auth.
  version: "2.1.0"
  contact:
    name: "API Platform Team"
    email: "api-team@example.com"
    url: "https://confluence.example.com/api-docs"
  license:
    name: "Apache 2.0"
    url: "https://www.apache.org/licenses/LICENSE-2.0.html"

servers:
  - url: https://api.example.com/v2
    description: Production server
  - url: https://staging-api.example.com/v2
    description: Staging server

security:
  - bearerAuth: []
  - oauth2:
      - read:accounts
      - write:accounts

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: >
        JWT access token issued by the OAuth2 authorization server.
        Obtain via the /oauth2/token endpoint using your client credentials.
    oauth2:
      type: oauth2
      flows:
        authorizationCode:
          authorizationUrl: https://auth.example.com/oauth2/authorize
          tokenUrl: https://auth.example.com/oauth2/token
          scopes:
            read:accounts: Read account profiles and settings
            write:accounts: Create, update, and delete accounts
            admin:accounts: Full administrative access to all accounts

  schemas:
    Account:
      type: object
      required:
        - email
        - status
      properties:
        id:
          type: string
          format: uuid
          readOnly: true
          description: >
            Unique identifier, assigned by the server. Generated using UUID v7
            for time-sortable ordering.
          example: "d290f1ee-6c54-4b01-90e6-d7ff1c39b140"
        email:
          type: string
          format: email
          minLength: 5
          maxLength: 254
          description: Primary account identifier and login credential
          example: "user@example.com"
        status:
          type: string
          enum: [active, suspended, pending_verification, deleted]
          description: Current lifecycle state of the account
          example: active
        created_at:
          type: string
          format: date-time
          readOnly: true
          description: ISO 8601 timestamp when account was created
        updated_at:
          type: string
          format: date-time
          readOnly: true
          description: ISO 8601 timestamp of last modification

    CreateAccountRequest:
      type: object
      required:
        - email
        - display_name
        - password_hash
      properties:
        email:
          type: string
          format: email
          minLength: 5
          maxLength: 254
          description: Email address for the new account
        display_name:
          type: string
          minLength: 1
          maxLength: 100
          pattern: "^[a-zA-Z0-9 \\-_']+$"
          description: Human-readable display name (alphanumeric + basic punctuation only)
        password_hash:
          type: string
          writeOnly: true
          minLength: 60
          maxLength: 72
          description: >
            BCrypt or Argon2 hashed password. Plain-text passwords are rejected.
            This field is write-only and never returned in responses.

    ErrorDetail:
      type: object
      required:
        - code
        - message
      properties:
        code:
          type: string
          pattern: "^[A-Z][A-Z0-9_]{2,30}$"
          description: Machine-readable error code (UPPER_SNAKE_CASE)
          example: VALIDATION_ERROR
        message:
          type: string
          minLength: 1
          maxLength: 500
          description: Human-readable error description
        field:
          type: string
          description: >
            Dot-notation path to the failing field (e.g., "email", "settings.theme").
            Omitted when the error is not field-specific.
        invalid_value:
          description: The value that failed validation, if applicable

    ErrorResponse:
      type: object
      required:
        - error
      properties:
        error:
          $ref: "#/components/schemas/ErrorDetail"
        request_id:
          type: string
          format: uuid
          readOnly: true
          description: Correlation ID for support ticket investigation

paths:
  /accounts:
    get:
      operationId: listAccounts
      summary: List all accounts with pagination
      description: Returns a paginated list of accounts matching optional filters.
      security:
        - oauth2: [read:accounts]
      parameters:
        - name: limit
          in: query
          required: false
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
        - name: offset
          in: query
          required: false
          schema:
            type: integer
            minimum: 0
            default: 0
        - name: status
          in: query
          required: false
          schema:
            type: string
            enum: [active, suspended, pending_verification]
      responses:
        "200":
          description: Successful response with paginated account list
          content:
            application/json:
              schema:
                type: object
                required:
                  - data
                  - pagination
                properties:
                  data:
                    type: array
                    items:
                      $ref: "#/components/schemas/Account"
                  pagination:
                    $ref: "#/components/schemas/PaginationMeta"
        "401":
          description: Unauthorized — invalid or missing token
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorResponse"
        "403":
          description: Forbidden — insufficient OAuth2 scopes
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorResponse"

    post:
      operationId: createAccount
      summary: Create a new user account
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateAccountRequest"
            example:
              email: "newuser@example.com"
              display_name: "Jane Smith"
              password_hash: "$2b$12$LJ3m4ys3Lg35kFhHnNjWu.LZsT7xV8qKzP9rX6yRtO0EaGxIjW2Oe"
      responses:
        "201":
          description: Account created successfully
          headers:
            Location:
              required: true
              schema:
                type: string
                format: uri
                example: "https://api.example.com/v2/accounts/d290f1ee-6c54-4b01-90e6-d7ff1c39b140"
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Account"
        "400":
          description: Validation error — missing or invalid fields
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorResponse"

  /accounts/{accountId}:
    get:
      operationId: getAccount
      summary: Retrieve a single account by ID
      parameters:
        - name: accountId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        "200":
          description: Account found
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Account"
        "404":
          description: Account not found

    patch:
      operationId: updateAccount
      summary: Partially update an account
      parameters:
        - name: accountId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              additionalProperties: false
              properties:
                email:
                  type: string
                  format: email
                display_name:
                  type: string
                  minLength: 1
                  maxLength: 100
      responses:
        "200":
          description: Account updated successfully
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Account"
```

### Pattern 2: Discriminator Patterns for Polymorphism

Proper discriminator usage enables runtime type resolution in strongly-typed code generation. This pattern covers both inheritance (allOf with discriminator) and union types (oneOf with discriminator).

```yaml
# === INHERITANCE PATTERN — Child types extend a base with a discriminator ===
components:
  schemas:
    PaymentMethod:
      type: object
      required:
        - type
        - is_default
      discriminator:
        propertyName: type
        mapping:
          credit_card: "#/components/schemas/CreditCardPayment"
          bank_transfer: "#/components/schemas/BankTransferPayment"
          crypto_wallet: "#/components/schemas/CryptoWalletPayment"
      properties:
        id:
          type: string
          format: uuid
        type:
          type: string
          enum: [credit_card, bank_transfer, crypto_wallet]
        is_default:
          type: boolean
          description: Whether this payment method is the default for checkout

    CreditCardPayment:
      allOf:
        - $ref: "#/components/schemas/PaymentMethod"
        - type: object
          required:
            - last_four
            - expiry_month
            - expiry_year
            - network
          properties:
            last_four:
              type: string
              pattern: "^[0-9]{4}$"
            expiry_month:
              type: integer
              minimum: 1
              maximum: 12
            expiry_year:
              type: integer
              minimum: 2024
              maximum: 2099
            network:
              type: string
              enum: [visa, mastercard, amex, discover]
            cardholder_name:
              type: string
              minLength: 2
              maxLength: 100

    BankTransferPayment:
      allOf:
        - $ref: "#/components/schemas/PaymentMethod"
        - type: object
          required:
            - bank_name
            - account_type
          properties:
            bank_name:
              type: string
              minLength: 2
              maxLength: 200
            account_type:
              type: string
              enum: [checking, savings]
            routing_number:
              type: string
              pattern: "^[0-9]{9}$"

    # === UNION PATTERN — oneOf with discriminator for disjoint types ===
    SearchRequest:
      type: object
      required:
        - query_type
      discriminator:
        propertyName: query_type
        mapping:
          text: "#/components/schemas/TextSearchRequest"
          geo: "#/components/schemas/GeoSearchRequest"
          facet: "#/components/schemas/FacetSearchRequest"
      properties:
        query_type:
          type: string
          enum: [text, geo, facet]
        page_size:
          type: integer
          minimum: 1
          maximum: 100
          default: 20
        offset:
          type: integer
          minimum: 0
          default: 0

    TextSearchRequest:
      allOf:
        - $ref: "#/components/schemas/SearchRequest"
        - type: object
          required: [keywords]
          properties:
            keywords:
              type: string
              minLength: 1
              maxLength: 500
            language:
              type: string
              pattern: "^[a-z]{2}(-[A-Z]{2})?$"

    GeoSearchRequest:
      allOf:
        - $ref: "#/components/schemas/SearchRequest"
        - type: object
          required: [latitude, longitude, radius_km]
          properties:
            latitude:
              type: number
              format: double
              minimum: -90
              maximum: 90
            longitude:
              type: number
              format: double
              minimum: -180
              maximum: 180
            radius_km:
              type: number
              format: double
              minimum: 0.1
              maximum: 500

    FacetSearchRequest:
      allOf:
        - $ref: "#/components/schemas/SearchRequest"
        - type: object
          required: [facet_field, values]
          properties:
            facet_field:
              type: string
              minLength: 1
              maxLength: 64
            values:
              type: array
              minItems: 1
              maxItems: 20
              items:
                type: string
```

### Pattern 3: Schema Components Library with Reusable Patterns

Build a shared component library using `$ref` patterns, validation constraints, and example annotations that can be reused across multiple API specifications.

```yaml
# Shared schema components — importable into any spec via $ref or $import
components:
  schemas:

    # --- IDENTITY SCHEMAS ---
    # Reusable identifier pattern for all entities
    EntityId:
      type: object
      description: >
        Standard entity wrapper containing a UUID v7 identifier and resource type.
        Used as the return value for create/update operations.
      required: [id, type]
      properties:
        id:
          type: string
          format: uuid
          example: "0193a2c6-4f8e-7d1a-b2a4-5e6f7c8d9e0f"
        type:
          type: string
          pattern: "^[a-z][a-z0-9]*$"
          example: account

    # Standard pagination metadata — include in every paginated list response
    PaginationMeta:
      type: object
      required: [total, page, page_size, has_more]
      properties:
        total:
          type: integer
          minimum: 0
          description: Total number of items across all pages
          example: 1247
        page:
          type: integer
          minimum: 1
          description: Current page number (1-indexed)
          example: 3
        page_size:
          type: integer
          minimum: 1
          maximum: 100
          default: 20
          description: Number of items per page
          example: 20
        has_more:
          type: boolean
          description: True if additional pages exist beyond the current one

    # --- VALIDATION CONSTRAINT PATTERNS ---
    # Email with RFC 5322 subset validation
    EmailField:
      type: string
      format: email
      minLength: 5
      maxLength: 254
      pattern: "^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$"

    # URL with scheme validation (http or https only)
    UrlField:
      type: string
      format: uri
      pattern: "^https?://"
      maxLength: 2048

    # ISO 8601 date-time (UTC)
    DateTimeUtc:
      type: string
      format: date-time
      pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\\.[0-9]+)?Z$"

    # Phone number using E.164 format
    PhoneNumber:
      type: string
      pattern: "^\\+[1-9]\\d{1,14}$"
      description: E.164 formatted phone number (e.g., +14155552671)

    # Non-negative integer money amount in smallest currency unit (cents)
    MoneyAmount:
      type: integer
      minimum: 0
      maximum: 999999999999
      description: Amount in cents. Use decimal fields only for forex conversions.

    # --- ENUMS WITH DESCRIPTIONS ---
    HTTPMethod:
      type: string
      enum: [GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS]
      description: Standard HTTP methods per RFC 9110

    LogLevel:
      type: string
      enum: [trace, debug, info, warn, error, fatal]
      description: Structured logging severity levels in ascending order

    # --- HATEOAS LINK SCHEMA ---
    # Reusable link object for HAL-like hypermedia responses
    Link:
      type: object
      required: [href, method]
      properties:
        href:
          $ref: "#/components/schemas/UrlField"
        method:
          $ref: "#/components/schemas/HTTPMethod"
        rel:
          type: string
          description: Relationship name (self, next, prev, create, etc.)
        title:
          type: string
          maxLength: 200
          description: Human-readable label for the link

    LinksCollection:
      type: object
      description: >
        Standard links object embedded in HAL-style responses.
        Keys are relationship names; values are Link objects.
      additionalProperties:
        $ref: "#/components/schemas/Link"

    # --- EXAMPLE ANNOTATIONS ---
    # Use examples at both the schema level and the field level for code generation
    UserSearchResponse:
      type: object
      required: [data, links]
      examples:
        - data:
            - id: "0193a2c6-4f8e-7d1a-b2a4-5e6f7c8d9e0f"
              email: "alice@example.com"
              status: active
          links:
            self:
              href: https://api.example.com/v2/users/0193a2c6-4f8e-7d1a-b2a4-5e6f7c8d9e0f
              method: GET
              rel: self
            next:
              href: https://api.example.com/v2/users?page=2&limit=20
              method: GET
              rel: next
      properties:
        data:
          type: array
          items:
            $ref: "#/components/schemas/EntityId"
        links:
          $ref: "#/components/schemas/LinksCollection"
```

---

### BAD vs. GOOD: Common OpenAPI Mistakes

#### ❌ BAD: Inline schemas everywhere (no component reuse)

Inline schemas make the spec impossible to maintain, prevent code generation from producing proper types, and force every endpoint to carry duplicated schema definitions.

```yaml
# ❌ BAD — response schema duplicated across every operation
paths:
  /users/{id}:
    get:
      responses:
        "200":
          description: Found
          content:
            application/json:
              schema:
                type: object
                required: [id, name]
                properties:
                  id: { type: string, format: uuid }
                  name: { type: string }

  /users/{id}/profile:
    get:
      responses:
        "200":
          description: Found
          content:
            application/json:
              schema:
                type: object                    # ← exact same shape, duplicated!
                required: [id, name]
                properties:
                  id: { type: string, format: uuid }
                  name: { type: string }
```

#### ✅ GOOD: Reusable $ref schemas in components

```yaml
# ✅ GOOD — single source of truth via $ref
components:
  schemas:
    UserResponse:
      type: object
      required: [id, name]
      properties:
        id: { type: string, format: uuid }
        name: { type: string, minLength: 1, maxLength: 200 }

paths:
  /users/{id}:
    get:
      responses:
        "200":
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/UserResponse"

  /users/{id}/profile:
    get:
      responses:
        "200":
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/UserResponse"
```

#### ❌ BAD: Discriminator with wrong property name or missing mapping

```yaml
# ❌ BAD — discriminator propertyName doesn't match any field, and mapping is incomplete
PaymentMethod:
  type: object
  discriminator:
    propertyName: method_type  # ← field doesn't exist in the schema!
  properties:
    type: { type: string }     # ← this is the actual field name but wrong in discriminator

# ❌ BAD — mapping references non-existent schemas
  mapping:
    credit_card: "#/components/schemas/CreditCard"      # exists ✓
    bank_transfer: "#/components/schemas/BankTransfer"   # exists ✓
    crypto_wallet: "#/components/schemas/CryptoPay"      # typo! schema is CryptoWalletPayment
```

#### ✅ GOOD: Correct discriminator with matching property and complete mapping

```yaml
# ✅ GOOD — propertyName matches a required enum field, all subtypes mapped
PaymentMethod:
  type: object
  required: [type]
  discriminator:
    propertyName: type
    mapping:
      credit_card: "#/components/schemas/CreditCardPayment"
      bank_transfer: "#/components/schemas/BankTransferPayment"
      crypto_wallet: "#/components/schemas/CryptoWalletPayment"
  properties:
    type:
      type: string
      enum: [credit_card, bank_transfer, crypto_wallet]
```

#### ❌ BAD: Parameter location specification errors

```yaml
# ❌ BAD — contentType in wrong place, required at wrong level
paths:
  /search:
    get:
      parameters:
        - name: q
          in: query
          # required is HERE — inside parameters array, which is valid but
          # the schema object placement is WRONG below
          schema:
            type: string
            required: true       # ← WRONG! "required" cannot be inside schema
```

#### ✅ GOOD: Parameter with correct structure

```yaml
# ✅ GOOD — required at parameter level, not inside schema
parameters:
  - name: q
    in: query
    required: true          # ← correct location
    schema:
      type: string
      minLength: 1
      maxLength: 500
```

---

## Constraints

### MUST DO
- Declare `openapi: "3.1.0"` or `"3.0.x"` at the document root — never use Swagger 2.0 (`swagger: "2.0"`) for new specs
- Place all reusable schemas in `components/schemas` and reference them with `$ref` — no inline complex types
- Add a `discriminator` with explicit `mapping` for every polymorphic schema hierarchy or union type
- Use `writeOnly: true` on sensitive fields (passwords, tokens) so code generators exclude them from response models
- Include at least one `example` per major schema to guide code generation and improve documentation quality
- Validate every spec with a linter (Spectral ruleset: `openapi-api-rules`) before merging

### MUST NOT DO
- Use `type: object` without defining properties — this is an untyped void that breaks all downstream consumers
- Place `required` array inside the `schema` block of a parameter — it belongs at the parameter level
- Use `$ref` to reference local file paths (`$ref: "./user.yaml"`) in specs consumed by code generators — inline everything or use `$import` (OpenAPI 3.1+)
- Define different response schemas for the same status code across operations without a clear reason — it breaks generated client types
- Omit the `description` field on any component schema, parameter, or security scheme — documentation generators will show empty entries

---

## Related Skills

| Skill | Purpose |
|---|---|
| `api-contract-first-engineering` | Broader contract-first methodology including API governance and change management processes |
| `rest-api-patterns` | REST design conventions that complement OpenAPI spec design (naming, versioning, error formats) |
| `graphql-schema-design` | GraphQL alternative for APIs where GraphQL is preferred over REST + OpenAPI |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [OpenAPI Specification 3.1.0 (Official)](https://spec.openapis.org/oas/v3.1.0)
- [OpenAPI Specification 3.0.3 (Stable)](https://spec.openapis.org/oas/v3.0.3)
- [Swagger Editor and Validator](https://editor.swagger.io/)
- [OpenAPI Generator Documentation](https://openapi-generator.tech/)
- [Spectral API Linting Rules for OpenAPI](https://meta.stoplight.io/docs/spectral/ZG9jOjExMTg2-openapi-rules)
- [JSON Schema Draft 2020-12 (Used by OpenAPI 3.1)](https://json-schema.org/draft/2020-12/json-schema-core)
- [RFC 9110 — HTTP Semantics](https://datatracker.ietf.org/doc/html/rfc9110)
