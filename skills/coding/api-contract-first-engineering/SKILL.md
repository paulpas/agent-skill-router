---
name: api-contract-first-engineering
description: Implements contract-first API design using OpenAPI/Swagger specifications with schema validation, versioning strategies, backward-compatible changes, and automated code generation from contracts.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: openapi, swagger, contract first API, API specification, schema validation, API versioning, REST contract, how do i design an API spec
  archetypes:
    - tactical
    - orchestration
  anti_triggers:
    - internal-only endpoints
    - prototype hackathon APIs
    - gRPC service definition
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: api-design-principles, graphql-schema-design, api-versioning-strategies
---

# Contract-First API Engineering

Designs production APIs using a contract-first methodology where the OpenAPI/Swagger specification serves as the authoritative source of truth. When loaded, this skill makes the model act as an API architect who writes specifications before code, validates them with tooling, generates server and client stubs from contracts, and manages backward-compatible schema evolution across API versions. This approach ensures that frontend and backend teams can work in parallel while guaranteeing runtime compatibility between consumer expectations and server implementations.

## TL;DR Checklist

- [ ] Write the OpenAPI 3.0 specification defining all endpoints, schemas, parameters, and examples before any handler code
- [ ] Validate the spec with `spectral` or `oas-lint` — run rule sets for consistent naming, required fields, and status code conventions
- [ ] Share the contract with API consumers via Swagger UI or Redoc documentation pages hosted alongside the repository
- [ ] Generate server-side stubs from the OpenAPI spec using `openapi-generator-cli` or framework-level schema validation middleware
- [ ] Implement business logic only within generated handler stubs — never modify the spec during implementation
- [ ] Add runtime validation middleware (Ajv for Node.js, Pydantic for Python) that validates requests and responses against the schema in production

---

## When to Use

Use this skill when:

- Designing a new public or cross-team API where frontend and backend teams work independently and need a shared contract
- Migrating an existing code-first API to a contract-first approach to improve consumer experience and reduce breaking changes
- Establishing API standards across multiple services in a microservices architecture requiring consistent response shapes
- Building a client library generator pipeline where the OpenAPI spec is the single input for SDK generation in multiple languages
- Onboarding new team members who need clear, machine-readable documentation of endpoint contracts without reading handler code

---

## When NOT to Use

Avoid using this skill for:

- **Internal-only endpoints** with a single consumer — if only one team uses the API and they coordinate directly, code-first development is faster
- **Prototype or hackathon APIs** — when speed of iteration matters more than contract stability, start coding directly and extract the spec later
- **gRPC service definitions** — gRPC uses Protocol Buffers for interface definition; this skill covers REST/HTTP APIs with OpenAPI/Swagger
- **Real-time WebSocket endpoints** — WebSocket contracts use different tooling (e.g., AsyncAPI) rather than OpenAPI

---

## Core Workflow

1. **Draft the OpenAPI Specification First** — Define every endpoint with its HTTP method, path parameters, query parameters, request body schema, response status codes, and example payloads. Structure the spec under `paths/` for endpoints and `components/schemas/` for reusable types. Include at least one example per response to document expected shapes. **Checkpoint:** Every endpoint must have a unique operationId (e.g., `listUsers`, `createUser`, `getUserById`) following the `<verb><Resource>` naming convention. Run `spectral lint openapi.yaml` before sharing — no lint errors should exist in the shared spec.

2. **Validate with Linters and Rulesets** — Apply automated validation using Spectral rulesets to enforce organizational API conventions: consistent naming (`camelCase` for properties, `snake_case` for database columns), required HTTP status codes per operation, documented error responses, and proper use of pagination parameters. Use the built-in `oas3` ruleset as a baseline. **Checkpoint:** Zero lint errors across all Spectral rules before publishing the spec to the API portal.

3. **Share the Contract with Consumers** — Deploy documentation pages using Swagger UI (`swagger-ui-dist`) or Redoc (`@redocly/cli build`) from the same OpenAPI YAML file used for validation. Host these on a shared URL accessible to all consumer teams. Include the raw spec download link and an interactive "Try It Out" console where consumers can send test requests. **Checkpoint:** Every consumer team must acknowledge receipt of the contract and confirm they understand the required fields, constraints, and error response format before starting implementation.

4. **Generate Server-Side Stubs from the Spec** — Use `openapi-generator-cli` to generate type-safe server stubs: `openapi-generator-cli generate -i openapi.yaml -g python-flask -o ./generated-server/`. Alternatively, use framework-native validation middleware like Express with `express-openapi-validator` or FastAPI with automatic Pydantic schema validation. **Checkpoint:** The generated code must compile and start without errors. All handler functions should have the correct type signatures matching the OpenAPI operation definitions.

5. **Implement Business Logic in Generated Handlers** — Write business logic only inside the generated handler stub files (e.g., `api/handlers/users_handler.py`). Never modify auto-generated files or the OpenAPI spec during implementation — changes to contract must go through the spec-first workflow and be re-generated. Keep handlers thin: validate input, delegate to service layer, format response according to schema. **Checkpoint:** Every handler must return a response body matching the defined response schema exactly — no extra fields, no missing required fields.

6. **Add Runtime Validation Middleware** — Deploy Ajv (for Node.js/Express) or Pydantic (for Python/FastAPI) middleware that validates incoming requests and outgoing responses against the OpenAPI schemas at runtime in production. Log validation failures with detailed error messages including the failing field path and the violated constraint. **Checkpoint:** Production must reject any request that violates the schema — return 400 Bad Request with a structured error body listing all violations before the handler code executes.

---

## Implementation Patterns

### Pattern 1: Complete OpenAPI 3.0 Specification for a CRUD Resource

A production-ready OpenAPI specification defining a resource with full CRUD operations, consistent error responses, and pagination support. This YAML file serves as the source of truth from which all server and client code is generated.

```yaml
# openapi.yaml — Complete CRUD API spec for a "project" resource
openapi: "3.0.3"
info:
  title: Project Management API
  version: "1.0.0"
  description: REST API for managing projects and their tasks.
servers:
  - url: https://api.example.com/v1
    description: Production server

paths:
  /projects:
    get:
      operationId: listProjects
      summary: List all projects with pagination
      tags: [projects]
      parameters:
        - name: page
          in: query
          schema: { type: integer, minimum: 1, default: 1 }
        - name: per_page
          in: query
          schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
      responses:
        "200":
          description: Paginated list of projects
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/PaginatedProjects"
              example:
                data:
                  - id: 1
                    name: "Website Redesign"
                    status: "active"
                    created_at: "2024-06-15T10:30:00Z"
                pagination: { total: 142, page: 1, per_page: 20 }

    post:
      operationId: createProject
      summary: Create a new project
      tags: [projects]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateProjectRequest"
      responses:
        "201":
          description: Project created successfully
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Project"
        "400":
          description: Validation error
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorList"

  /projects/{id}:
    get:
      operationId: getProject
      summary: Retrieve a single project by ID
      tags: [projects]
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: integer }
      responses:
        "200":
          description: Project details
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Project"
        "404":
          description: Project not found
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorDetail"

    put:
      operationId: updateProject
      summary: Update an existing project (full replacement)
      tags: [projects]
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: integer }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/UpdateProjectRequest"
      responses:
        "200":
          description: Project updated
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Project"
        "404":
          description: Project not found

    delete:
      operationId: deleteProject
      summary: Delete a project permanently
      tags: [projects]
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: integer }
      responses:
        "204":
          description: Project deleted successfully
        "404":
          description: Project not found

components:
  schemas:
    Project:
      type: object
      required: [id, name, status, created_at]
      properties:
        id: { type: integer, example: 1 }
        name: { type: string, minLength: 1, maxLength: 200 }
        description: { type: string, maxLength: 5000, nullable: true }
        status:
          type: string
          enum: [active, archived, cancelled]
        created_at: { type: string, format: date-time }
        updated_at: { type: string, format: date-time, nullable: true }

    CreateProjectRequest:
      type: object
      required: [name]
      properties:
        name: { type: string, minLength: 1, maxLength: 200 }
        description: { type: string, maxLength: 5000 }

    UpdateProjectRequest:
      type: object
      properties:
        name: { type: string, minLength: 1, maxLength: 200 }
        description: { type: string, maxLength: 5000 }
        status: { type: string, enum: [active, archived, cancelled] }

    PaginatedProjects:
      type: object
      required: [data, pagination]
      properties:
        data:
          type: array
          items:
            $ref: "#/components/schemas/Project"
        pagination:
          $ref: "#/components/schemas/PaginationMeta"

    PaginationMeta:
      type: object
      required: [total, page, per_page]
      properties:
        total: { type: integer }
        page: { type: integer }
        per_page: { type: integer }

    ErrorDetail:
      type: object
      required: [error, message]
      properties:
        error: { type: string, example: "NOT_FOUND" }
        message: { type: string, example: "Project with id 42 not found" }
        resource: { type: string, example: "project" }
        resource_id: { type: integer, example: 42 }

    ErrorList:
      type: object
      required: [errors]
      properties:
        errors:
          type: array
          items:
            $ref: "#/components/schemas/ErrorDetail"
```

### Pattern 2: Backward-Compatible Schema Evolution

Demonstrates safe changes to the OpenAPI schema that do not break existing clients versus unsafe changes that introduce breaking changes. This diff pattern guides which modifications are allowed in minor version bumps and which require a major version bump.

```yaml
# --- BACKWARD-COMPATIBLE CHANGES (safe for v1.x minor updates) ---

# Change 1: Add an optional field to an existing response schema
# SAFE: existing clients ignore fields they don't know about
components:
  schemas:
    Project:
      type: object
      required: [id, name, status, created_at]
      properties:
        id: { type: integer }
        name: { type: string }
        description: { type: string, nullable: true }
        status: { type: string, enum: [active, archived, cancelled] }
        created_at: { type: string, format: date-time }
        # ✅ SAFE ADDITION: new optional field, not in 'required' list
        priority:
          type: string
          enum: [low, medium, high]
          nullable: true

# Change 2: Add a new endpoint under the same version path
# SAFE: existing clients never call endpoints they don't know about
paths:
  /projects/{id}/tags:
    get:
      operationId: listProjectTags
      summary: List tags for a project (new feature)
      responses:
        "200":
          description: List of tags
          content:
            application/json:
              schema:
                type: array
                items: { type: string }

# --- BREAKING CHANGES (require v2 major version bump) ---

# ❌ UNSAFE: Remove a required field from response — clients reading .name will crash
# components.schemas.Project.required stays [id, name, status, created_at] but server stops sending 'status'

# ❌ UNSAFE: Change a field type from integer to string — clients parsing parseInt(id) break
# id: { type: integer } → id: { type: string }

# ❌ UNSAFE: Remove an enum value that clients may depend on
# status enum: [active, archived, cancelled] → [active, archived]
# Clients with status === 'cancelled' comparisons will fail

# --- SAFE MIGRATION PATH FOR BREAKING CHANGES ---
# When a breaking change is unavoidable:
# 1. Introduce the new field as optional alongside the old one (e.g., user_id and userId)
# 2. Document deprecation in the OpenAPI spec with `deprecated: true` on the old field
# 3. Keep both fields for N major versions before removing the deprecated field
# 4. Update clients to use the new field during that grace period
```

### Pattern 3: Runtime Schema Validation Middleware (Express + Ajv)

Deploy runtime validation middleware using Ajv that validates all incoming request bodies and outgoing response bodies against the OpenAPI schemas. This catches contract violations before they reach business logic handlers and provides detailed error messages in production.

```javascript
/**
 * Pattern 3: Runtime schema validation middleware using Ajv for Express.
 * Validates requests against OpenAPI schemas before reaching route handlers,
 * and validates response shapes in production to catch implementation drift.
 */

const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const { getAjvInstance } = require("./schema-loader"); // Loads schemas from openapi.yaml

/**
 * Request body validation middleware factory.
 * Takes a schema key and validates the request body against it.
 * Returns 400 with structured errors on validation failure before handler runs.
 *
 * @param {string} schemaKey - The components/schemas/ key to validate against
 *   (e.g., "CreateProjectRequest", "UpdateProjectRequest")
 * @returns {Function} Express middleware function
 */
function validateBody(schemaKey) {
  const ajv = getAjvInstance();
  const validate = ajv.getSchema(`#/components/schemas/${schemaKey}`);

  if (!validate) {
    throw new Error(`No schema found for key: ${schemaKey}`);
  }

  return function validationMiddleware(req, res, next) {
    const isValid = validate(req.body);

    if (!isValid) {
      // Return structured error body matching the ErrorList schema
      const errors = validate.errors.map((err) => ({
        error: "VALIDATION_ERROR",
        message: err.message || "Field validation failed",
        field: err.instancePath.replace("/", "."),
        code: err.keyword,
        params: err.params,
      }));

      return res.status(400).json({ errors });
    }

    next();
  };
}

/**
 * Response body validation middleware (production only).
 * Validates the response object produced by a handler against the expected
 * schema. Catches implementation drift where handlers return wrong shapes.
 * Logs warnings in production but does not block responses.
 */
function validateResponse(schemaKey, isProduction) {
  if (!isProduction) {
    // Skip validation in development — it adds overhead
    return function passthrough(req, res, next) { next(); };
  }

  const ajv = getAjvInstance();
  const validate = ajv.getSchema(`#/components/schemas/${schemaKey}`);

  if (!validate) return function passthrough(req, res, next) { next(); };

  return function responseValidator(req, res, next) {
    // Intercept res.json() to validate before sending
    const originalJson = res.json.bind(res);
    res.json = function(body) {
      const isValid = validate(body);
      if (!isValid && validate.errors) {
        // Log the violation for debugging but still send response
        console.warn(
          `[RESPONSE VALIDATION FAILED] ${req.method} ${req.path}: ` +
          validate.errors.map((e) => e.message).join(", ")
        );
      }
      return originalJson(body);
    };
    next();
  };
}

// --- Usage in Express Routes ---

const express = require("express");
const router = express.Router();

router.post(
  "/projects",
  validateBody("CreateProjectRequest"),   // Validates req.body against CreateProjectRequest schema
  validateResponse("Project", true),       // Validates response body in production
  async (req, res) => {
    const project = await projectService.create(req.body);
    return res.status(201).json(project);
  }
);

router.get(
  "/projects/:id",
  validateResponse("Project", true),
  async (req, res) => {
    const project = await projectService.findById(parseInt(req.params.id));
    if (!project) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: `Project with id ${req.params.id} not found`,
        resource: "project",
        resource_id: parseInt(req.params.id),
      });
    }
    return res.json(project);
  }
);
```

```python
# Equivalent middleware for FastAPI — uses Pydantic models auto-generated from OpenAPI spec

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, ValidationError
from typing import List, Optional

app = FastAPI(title="Project Management API", version="1.0.0")


class Project(BaseModel):
    """Auto-generated from OpenAPI schema — ensures response shape matches spec."""
    id: int
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=5000)
    status: str = Field(..., pattern="^(active|archived|cancelled)$")
    created_at: str  # RFC 3339 datetime string
    updated_at: Optional[str] = None


class CreateProjectRequest(BaseModel):
    """Validates incoming request body against the OpenAPI schema at runtime."""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=5000)


@app.post("/projects", status_code=201, response_model=Project)
async def create_project(body: CreateProjectRequest):
    """Handler receives a validated Pydantic model — if the request body doesn't
    match the schema, FastAPI returns 422 automatically before this function runs."""
    project = await project_service.create(**body.model_dump())
    return project


@app.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: int):
    """The type annotation 'int' for project_id is auto-validated by FastAPI.
    If a non-integer is passed (e.g., /projects/abc), it returns 422 automatically."""
    project = await project_service.find_by_id(project_id)
    if not project:
        raise HTTPException(status_code=404, detail={
            "error": "NOT_FOUND",
            "message": f"Project with id {project_id} not found",
        })
    return project


@app.exception_handler(ValidationError)
async def validation_error_handler(request: Request, exc: ValidationError):
    """Custom error response matching the ErrorList schema from OpenAPI spec."""
    errors = []
    for err in exc.errors():
        errors.append({
            "error": "VALIDATION_ERROR",
            "message": err["msg"],
            "field": ".".join(str(p) for p in err.get("loc", [])),
            "code": err["type"],
        })
    return JSONResponse(status_code=400, content={"errors": errors})
```

---

## Constraints

### MUST DO

- Define the error response schema upfront for every endpoint — each must return a structured body with `error`, `message`, and contextual fields matching the `ErrorDetail` pattern. Never return plain text error messages in production APIs
- Use consistent HTTP status codes per RFC 7231: `200 OK` for successful GET/PUT, `201 Created` for POST creating resources, `204 No Content` for successful DELETE, `400 Bad Request` for validation failures, `404 Not Found` for missing resources, `422 Unprocessable Entity` for semantic validation errors (e.g., business rule violations), `500 Internal Server Error` for unexpected failures
- Include at least one example per response in the OpenAPI spec under `examples:` — examples serve as both documentation and test fixtures for client teams. Use realistic data that matches the schema constraints exactly
- Version URL paths for breaking changes (e.g., `/v1/projects/`, `/v2/projects/`) rather than using Accept header versioning. Path versioning is simpler to debug, caches independently, and works with all HTTP clients
- Add request/response examples under each endpoint's `responses` block — these are used by Swagger UI's "Try It Out" feature and by code generators for test data

### MUST NOT DO

- Write implementation code before finalizing the API spec — coding first defeats the entire purpose of contract-first design. The spec must be reviewed and accepted by consumers before any handler is written
- Return opaque error messages without structured error bodies — never return `{"error": "something went wrong"}` or plain-text errors. Every error must include a machine-readable code, human message, and contextual fields (resource, field name)
- Change response field types in existing endpoints — converting an integer field to a string or removing a required field is a breaking change that breaks all existing clients. Introduce new fields as optional and deprecate old ones instead
- Expose internal data structures directly as API responses — never use database ORM models as the response schema. Map entities to DTO schemas defined in the OpenAPI spec so the API contract is independent of internal implementation details

---

## Live References

- [OpenAPI Specification 3.0.3](https://spec.openapis.org/oas/v3.0.3) — Official W3C community group specification
- [Spectral API Linting Rules](https://stoplight.io/open-source/spectral/docs/reference/rules) — Linting rulesets for OpenAPI consistency and best practices
- [Ajv JSON Schema Validator](https://ajv.js.org/) — Fastest JSON Schema validator for runtime request/response validation in Node.js
- [OpenAPI Generator CLI](https://openapi-generator.tech/docs/installation) — Generate type-safe server stubs and client SDKs from OpenAPI specs
- [Pydantic v2 Validation Guide](https://docs.pydantic.dev/latest/concepts/validation/) — Pydantic models for runtime schema validation in Python/FastAPI
- [HTTP Status Code Reference (RFC 7231)](https://datatracker.ietf.org/doc/html/rfc7231#section-6) — Official RFC defining standard HTTP status codes
- [Backwards Compatible API Changes](https://swagger.io/docs/specification/versioning/) — Guidelines for safe schema evolution and versioning strategies

---

## Related Skills

| Skill | Purpose |
|---|---|
| `api-design-principles` | RESTful design principles, resource modeling, HATEOAS patterns, and API consistency standards |
| `graphql-schema-design` | GraphQL type system design, query optimization with DataLoader, and federation patterns for multi-service schemas |
| `api-versioning-strategies` | Versioning approaches (URL path, header, content negotiation), migration strategies, and deprecation policies for long-lived APIs |
