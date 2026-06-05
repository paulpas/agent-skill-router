---




name: polyglot-development
description: Implements language selection heuristics, polyglot monorepo patterns,
  and cross-language communication protocols for multi-language software systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: polyglot, multi-language, language selection, go vs typescript, rust vs python, monorepo build, cross-language communication, protocol buffer python
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
  related-skills: framework-selection, system-architecture, data-encoding, design-patterns-and-principles




---




# Polyglot Development — Language Selection and Cross-Language Integration

Architects and engineers applying language selection heuristics to assign the optimal programming language to each component of a multi-language system, then implementing robust cross-language communication patterns (gRPC/Protobuf, REST/JSON, message queues) between those components. When loaded, this skill makes the model produce a language assignment rationale and working integration code for every inter-component boundary.

## TL;DR Checklist

- [ ] Assign each component a primary language based on its workload characteristics
- [ ] Document the rationale using the strength matrix (Table 1) for every choice
- [ ] Define inter-component contracts with Protobuf or JSON Schema before writing implementation code
- [ ] Implement a language-agnostic error propagation pattern across all boundaries
- [ ] Configure the build system to compile and test all language targets in one command

---

## When to Use

Use this skill when:

- Architecting a new system that requires multiple programming languages (e.g., Rust for a performance-critical data pipeline, Python for ML inference, TypeScript for the API gateway)
- Migrating a monolith to polyglot microservices and deciding which language each service should use
- Integrating two existing services written in different languages and need a stable communication pattern
- Setting up a polyglot monorepo with shared code generation (Protobuf, GraphQL schemas, Thrift definitions)
- The team has expertise across multiple languages and wants to leverage the best tool for each job

---

## When NOT to Use

Avoid this skill for:

- Small projects where a single language covers all requirements — the coordination overhead of polyglot development outweighs benefits (use `framework-selection` within one language instead)
- Teams with only junior developers unfamiliar with multiple languages — cognitive load and context-switching penalties hurt velocity
- Projects where regulatory or compliance constraints mandate a single audited language stack

---

## Core Workflow

1. **Classify Each Component's Workload** — For every module, service, or boundary, characterize the workload: CPU-bound computation, I/O-bound networking, data transformation, real-time processing, scripting/automation, UI rendering. Record the dominant characteristic and secondary constraints (latency SLO, memory ceiling, concurrency model). **Checkpoint:** Every component has exactly one dominant workload classification; if a component serves two equal workloads, consider splitting it.

2. **Apply Language Assignment Rules** — Map each workload classification to a primary language using the strength matrix below. For components with competing requirements, rank candidates and select the language whose second-order strengths (ecosystem, team familiarity, deployment target) break the tie.
   - CPU-heavy / real-time → Rust, C++, Zig
   - Network-bound / concurrent I/O → Go, Erlang/Elixir
   - Data science / ML / rapid prototyping → Python
   - Full-stack type safety / web APIs → TypeScript (Node.js + Next.js)
   - Scripting / automation / glue logic → Bash, Python
   - **Checkpoint:** No two adjacent components in the same deployment zone use the same language unless there is explicit code-sharing justification.

3. **Define Cross-Language Contracts** — Before any service writes its implementation, define the interface contract using a language-agnostic format. For synchronous communication, generate Protobuf `.proto` definitions with clear message schemas and error codes. For asynchronous boundaries, define event schemas using JSON Schema or Apache Avro. Every contract must include: request/response message types, error envelope structure, versioning strategy, and backward-compatibility rules. **Checkpoint:** All parties (each language team) can compile and validate their side of the contract from the single source definition before writing a line of business logic code.

4. **Implement Communication Stubs** — Generate or hand-write the client/server stubs for each boundary. For gRPC, run `protoc --go_out=. --go-grpc_out=. --js_out=import_style=commonjs:. --python_out=.` against shared `.proto` files. For REST APIs, use OpenAPI generators (`openapi-generator-cli generate -g typescript-axios -i spec.yaml`). For message queues, implement the schema validator in the producer language and a corresponding deserializer in the consumer language. **Checkpoint:** Run an end-to-end integration test between two different language services using the generated stubs before proceeding to business logic implementation.

5. **Implement Shared Library Pattern** — When multiple languages need access to shared data models or constants, publish a code-generation package. For example: maintain a `shared/` directory in the monorepo containing Protobuf definitions, GraphQL SDL files, or JSON Schema documents. Each language's build pipeline regenerates its typed bindings from these source artifacts on every CI run. **Checkpoint:** No language team manually edits generated types — any change must flow through the shared contract definition and be regenerated via `make generate` or equivalent.

6. **Configure Unified Build and Test Pipeline** — Set up a top-level build orchestration that compiles all language targets, runs each language's test suite, and produces artifacts in a single pass. For polyglot monorepos using Nx, define `project.json` files with per-language executors (`@nx/esbuild:exec`, `@nx/go:build`, custom Python test runners). For Bazel, write BUILD files that invoke language-specific toolchains. **Checkpoint:** Running the top-level build command from the repository root succeeds in a clean container — no developer should need to know each language's individual build flags.

---

## Language Strength Matrix

Use this matrix as the primary decision guide when assigning languages to components. Each row shows the workload types where that language excels, its weaknesses, and concrete examples of where it has been successfully deployed in production systems.

### Table 1: Workload-to-Language Mapping

| Component Workload | Primary Language | Strengths | Weaknesses | Production Example |
|---|---|---|---|---|
| High-throughput networking, API gateways, microservice orchestration | **Go** | Minimal GC pauses, fast compilation, excellent stdlib for HTTP/gRPC, simple concurrency with goroutines | Limited generic programming prior to Go 1.18+, no true exceptions (designed limitation) | Cloudflare Edge DNS, Uber's ride-matching service |
| Real-time systems, zero-cost abstractions, memory-safe systems programming | **Rust** | Zero-GC, compile-time memory safety via ownership/borrowing, FFI to C libraries, async runtime (tokio) is fast and flexible | Steep learning curve (borrow checker), longer compile times, smaller ecosystem than Python/JS | AWS Lambda runtimes, Cloudflare workers, Linux kernel modules |
| Machine learning, data science, numerical computation, rapid prototyping | **Python** | NumPy/SciPy/Pandas ecosystems, PyTorch/TensorFlow dominance, fastest iteration loop for experiments | Global interpreter lock (GIL) limits CPU parallelism, slower execution (~10-50x vs C/Rust), memory overhead | Netflix recommendation engine, Stripe ML fraud detection |
| Full-stack web apps, type-safe APIs, unified TypeScript codebase | **TypeScript** | Single language from browser to backend, excellent tooling (ESLint, Prettier, ts-node), npm ecosystem | Runtime overhead compared to compiled languages, type erasure at runtime limits some generic patterns | Microsoft Teams, VS Code server, Slack web app |
| Concurrent event processing, fault-tolerant distributed systems | **Elixir/Erlang** | Actor model built into the VM, hot code reloading, 99.999% uptime track record (WhatsApp's backend) | Smaller ecosystem, limited UI/framework options, niche hiring pool | WhatsApp messaging platform, Discord real-time features |
| Scripting, DevOps automation, glue logic between services | **Bash/Python** | Ubiquitous on Linux, minimal dependencies, perfect for sequential task orchestration | Poor error handling in bash, no package management natively (bash), Python too heavy for simple one-liners | CI/CD scripts, Kubernetes operators, log processing pipelines |
| WebAssembly modules, browser-side compute | **Rust** (via wasm32) or **C/C++** | Near-native performance in the browser, safe memory model vs C, growing WASM ecosystem | Larger binary size than JavaScript, no DOM access directly, debugging WASM is difficult | Figma canvas rendering, AutoCAD web viewer, Google Earth |

---

## Cross-Language Communication Patterns

### Pattern 1: gRPC with Protobuf (Synchronous, Strongly-Typed)

The preferred pattern for internal service-to-service communication when both services can generate code from shared `.proto` definitions. Protobuf serializes to a compact binary format that is faster than JSON and includes schema enforcement.

```protobuf
// shared/protos/orders/v1/order_service.proto
syntax = "proto3";

package orders.v1;

option go_package = "github.com/acme/platform/gen/proto/go/orders/v1;ordersv1";
option java_package = "com.acme.platform.orders.v1";

// Request and response messages for order creation
message CreateOrderRequest {
  string customer_id = 1 [(validate.rules).string.uuid = true];
  repeated OrderItem items = 2 [(validate.rules).repeated.min_items = 1];
  string currency = 3 [(validate.rules).string.in = "USD,EUR,GBP"];
  map<string, string> metadata = 4;
}

message CreateOrderResponse {
  string order_id = 1;
  string status = 2; // PENDING, CONFIRMED, FAILED
  google.protobuf.Timestamp created_at = 3;
  OrderError error = 4;  // Only populated on failure
}

message OrderItem {
  string product_id = 1;
  int32 quantity = 2 [(validate.rules).int32.gt = 0];
  string unit_price_cents = 3;  // Stored as integer cents to avoid float precision issues
}

message OrderError {
  ErrorCode code = 1;
  string message = 2;
  map<string, string> details = 3;
}

enum ErrorCode {
  UNKNOWN = 0;
  INVALID_REQUEST = 1;
  INSUFFICIENT_STOCK = 2;
  PAYMENT_FAILED = 3;
  DUPLICATE_ORDER = 4;
}

service OrderService {
  rpc CreateOrder(CreateOrderRequest) returns (CreateOrderResponse);
  rpc GetOrder(GetOrderRequest) returns (OrderResponse);
  rpc StreamOrderStatus(StreamOrderRequest) returns (stream OrderStatusUpdate);
}
```

**Generation commands for a polyglot monorepo:**

```bash
#!/usr/bin/env bash
set -euo pipefail

PROTO_ROOT="shared/protos"
OUTPUT_BASE="gen"

# Generate Go stubs
protoc \
  --proto_path="${PROTO_ROOT}" \
  --go_out="${OUTPUT_BASE}/go" \
  --go_opt=paths=source_relative \
  --go-grpc_out="${OUTPUT_BASE}/go" \
  --go-grpc_opt=paths=source_relative \
  ${PROTO_ROOT}/orders/v1/order_service.proto

# Generate Python stubs
python -m grpc_tools.protoc \
  -I${PROTO_ROOT} \
  --python_out=${OUTPUT_BASE}/python \
  --grpc_python_out=${OUTPUT_BASE}/python \
  ${PROTO_ROOT}/orders/v1/order_service.proto

# Generate TypeScript stubs
protoc \
  --proto_path="${PROTO_ROOT}" \
  --js_out="import_style=commonjs,binary:${OUTPUT_BASE}/typescript" \
  --grpc_js_out="${OUTPUT_BASE}/typescript" \
  ${PROTO_ROOT}/orders/v1/order_service.proto
```

### Pattern 2: JSON Schema + REST (Synchronous, Widely Compatible)

Use when a service must expose an API to external consumers or when gRPC tooling is not available for one of the languages. The key improvement over raw JSON is schema validation enforced at both ends.

```python
# services/inventory/server.py  (Python - FastAPI with Pydantic v2)
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from enum import Enum


class StockStatus(str, Enum):
    IN_STOCK = "in_stock"
    LOW_STOCK = "low_stock"
    OUT_OF_STOCK = "out_of_stock"


class InventoryItem(BaseModel):
    model_config = ConfigDict(extra="forbid")  # Reject unknown fields

    product_id: str = Field(..., pattern=r"^[A-Z]{2}-\d{6}$")
    sku: str = Field(..., min_length=10, max_length=50)
    quantity_available: int = Field(..., ge=0)
    reserved_quantity: int = Field(..., ge=0)
    status: StockStatus
    warehouse_location: Optional[str] = None


class InventoryResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[InventoryItem] = Field(max_length=1000)
    total_count: int
    page: int
    page_size: int


# ❌ BAD: No schema validation — accepts any shape of JSON, leading to downstream errors
class BadInventoryResponse(BaseModel):
    data = None  # No type annotation, no constraints, allows anything

# ✅ GOOD: Strict schema with field constraints and extra-field rejection
def validate_inventory_response(payload: dict) -> InventoryResponse:
    """Parse and validate an inventory API response. Raises pydantic.ValidationError on invalid input."""
    return InventoryResponse.model_validate(payload)
```

### Pattern 3: Async Event Bus (Asynchronous, Decoupled)

For event-driven boundaries where services publish events to a shared message broker (Kafka, RabbitMQ, NATS). The contract lives in the schema registry, not in service code.

```typescript
// shared/events/order.events.ts  (TypeScript - consumer side)
import { z } from "zod";

// Event schema definition — source of truth for all event consumers
export const OrderCreatedEventSchema = z.object({
  event_id: z.string().uuid(),
  event_type: z.literal("order.created"),
  event_version: z.literal(1),
  timestamp: z.coerce.number().int(),
  aggregate_id: z.string().uuid(), // order_id
  payload: z.object({
    customer_id: z.string().uuid(),
    total_amount_cents: z.number().int().positive(),
    currency: z.enum(["USD", "EUR", "GBP"]),
    item_count: z.number().int().positive(),
    payment_method: z.enum(["credit_card", "debit_card", "bank_transfer"]),
  }),
  metadata: z.record(z.string()).optional(),
});

export type OrderCreatedEvent = z.infer<typeof OrderCreatedEventSchema>;

// Consumer implementation — validates events at runtime before processing
export async function handleOrderCreated(event: unknown): Promise<void> {
  const parsed = OrderCreatedEventSchema.parse(event); // throws on invalid events

  // Deduplication check (idempotency)
  const hasBeenProcessed = await eventStore.hasProcessed(parsed.event_id);
  if (hasBeenProcessed) {
    return; // Silently acknowledge — we've already handled this event
  }

  // Process the order notification (e.g., send confirmation email, update analytics)
  await processOrderNotification(parsed.payload);
  await eventStore.markAsProcessed(parsed.event_id);
}

// ❌ BAD: No validation — if the producer sends an unexpected field shape, processing fails silently
async function badConsumer(event: unknown): void {
  const data = event as any; // type assertion without validation
  console.log(`Order by ${data.payload.customer_id}`); // crashes if payload is missing
}

// ✅ GOOD: Schema validation at the boundary, then deterministic processing with deduplication
```

---

## Polyglot Monorepo Structure

A well-structured polyglot monorepo keeps shared artifacts in a top-level `shared/` directory and language-specific code in versioned service directories. This pattern prevents language contamination while enabling cross-language code generation.

```
monorepo-root/
├── Makefile                        # Top-level build orchestration
├── nx.json or .bazelversion        # Build system config (Nx or Bazel)
├── shared/                         # Language-agnostic shared artifacts
│   ├── protos/                     # Protobuf definitions (source of truth for gRPC)
│   │   └── orders/v1/
│   │       └── order_service.proto
│   ├── schemas/                    # JSON Schema / Avro definitions for async events
│   │   └── order-events.jsonschema
│   ├── graphql/                    # GraphQL SDL files (alternative to Protobuf)
│   │   └── schema.graphql
│   └── openapi/                    # OpenAPI 3.x specs for REST boundaries
│       └── inventory-api.yaml
├── gen/                            # Generated code (gitignored, built by CI)
│   ├── go/github.com/acme/gen/proto/go/orders/v1/
│   ├── python/gen/proto/python/orders/v1/
│   └── typescript/gen/proto/ts/orders/v1/
├── services/                       # Service implementations by language
│   ├── order-service-go/           # Go service — uses Protobuf-generated stubs
│   │   ├── cmd/server/main.go
│   │   ├── internal/order/
│   │   ├── go.mod
│   │   └── Makefile
│   ├── inventory-service-python/   # Python service — validates against Pydantic schemas
│   │   ├── app/inventory/
│   │   ├── pyproject.toml
│   │   └── Makefile
│   ├── api-gateway-typescript/     # TypeScript gateway — aggregates calls to Go + Python services
│   │   ├── src/routes/
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── event-processor-elixir/     # Elixir consumer — reads from Kafka with Avro schemas
│       ├── lib/order_events.ex
│       └── mix.exs
├── scripts/                        # Shared tooling across languages
│   ├── lint-all.sh                 # Runs golangci-lint, ruff, eslint in sequence
│   ├── test-all.sh                 # Runs go test, pytest, jest in parallel
│   └── generate.sh                 # Regenerates all stubs from shared/ definitions
└── .github/workflows/ci.yaml       # Single CI pipeline that builds and tests everything
```

---

## Cross-Language Error Propagation

Errors must be translated at every boundary. A `ValidationError` in Python means nothing to a Go consumer. Define a canonical error envelope that every language maps to.

```python
# shared/errors/envelope.py  (Python - shared error model)
from dataclasses import dataclass, field
from typing import Optional


@dataclass(frozen=True)
class CanonicalError:
    """Language-agnostic error envelope used in all cross-language communication."""
    code: str                      # Machine-readable error code (e.g., "ORDER_NOT_FOUND")
    message: str                   # Human-readable description
    details: dict = field(default_factory=dict)  # Optional structured additional info

    def to_grpc_status(self) -> tuple[int, str]:
        """Convert to gRPC status code and detail string for Go/TS consumers."""
        mapping = {
            "VALIDATION": (13, "INVALID_ARGUMENT"),
            "NOT_FOUND": (5, "NOT_FOUND"),
            "UNAVAILABLE": (14, "UNAVAILABLE"),
            "INTERNAL": (13, "INTERNAL"),
        }
        category = self.code.split("_")[0] if "_" in self.code else "INTERNAL"
        grpc_code, detail = mapping.get(category, (13, "INTERNAL"))
        return grpc_code, f"{self.code}: {self.message}"

    def to_http_status(self) -> tuple[int, dict]:
        """Convert to HTTP status code and response body."""
        mapping = {
            "VALIDATION": 400,
            "NOT_FOUND": 404,
            "UNAVAILABLE": 503,
            "INTERNAL": 500,
            "CONFLICT": 409,
            "UNAUTHORIZED": 401,
        }
        category = self.code.split("_")[0] if "_" in self.code else "INTERNAL"
        status_code = mapping.get(category, 500)
        return status_code, {
            "error": {"code": self.code, "message": self.message, **self.details},
        }


# ❌ BAD: Returning language-specific exception types across boundaries
def bad_error_handler(error: Exception) -> dict:
    # Go consumer gets a string like "pydantic.ValidationError:..." which is meaningless
    return {"error": str(error)}

# ✅ GOOD: Canonical envelope — every language team implements the same mapping logic
def good_error_handler(error: Exception) -> CanonicalError:
    if isinstance(error, ValueError):
        return CanonicalError(
            code="VALIDATION_ERROR",
            message=str(error),
            details={"field": getattr(error, "field", None)},
        )
    if isinstance(error, FileNotFoundError):
        return CanonicalError(
            code="NOT_FOUND",
            message=f"Resource not found: {error.filename}",
        )
    return CanonicalError(
        code="INTERNAL_ERROR",
        message="An unexpected error occurred. Contact support.",
    )
```

---

## Constraints

### MUST DO
- Define the cross-language contract (Protobuf, OpenAPI, or JSON Schema) BEFORE implementing either service
- Use a canonical error envelope (`CanonicalError`) on every inter-service boundary — never leak language-specific exception types
- Generate all stubs from shared definitions in CI; never manually maintain type bindings in any language
- Document the rationale for each language assignment using the strength matrix before committing to the architecture
- Run end-to-end integration tests between at least two different-language services in every CI pipeline run

### MUST NOT DO
- Split a component into multiple languages just because the team knows multiple languages — co-location reduces cognitive load and coupling
- Write custom serialization logic (hand-written JSON parsers, format string builders) for inter-service communication — always use a codegen tool
- Put service-specific imports in `shared/` directories — shared artifacts must be language-agnostic and free of any service's business logic
- Use different field names or types across languages for the same Protobuf/JSON Schema definition — all mappings must preserve exact semantics
- Run language builds sequentially in CI when they are independent — parallelize per-language targets to keep pipeline time low

---

## Output Template

When implementing a polyglot architecture, produce:

1. **Language Assignment Table** — For each component, state the assigned language and the workload classification that drove the decision (reference the strength matrix).
2. **Contract Definition File** — The `.proto`, OpenAPI YAML, or JSON Schema file that defines the boundary contract between every pair of components.
3. **Generation Commands** — The exact `protoc` / `openapi-generator-cli` / schema validation commands needed to produce stubs for each language from the contract file.
4. **Error Mapping Implementation** — The `CanonicalError`-equivalent type and mapping functions in each involved language.
5. **Build Orchestration File** — The top-level Makefile or CI YAML that triggers all language builds and tests in a single command.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `framework-selection` | Choose frameworks within a selected language after the language decision is made |
| `system-architecture` | Broader architectural analysis that includes service decomposition and technology placement |
| `data-encoding` | Serialization formats (JSON, XML, CSV, Protocol Buffers) — complements this skill's contract patterns |
| `design-patterns-and-principles` | Design pattern catalog — applies to implementation within each language boundary |
| `api-design` | API design principles for REST and GraphQL boundaries within a polyglot system |

---

## Live References

> Authoritative documentation links for polyglot development, cross-language communication, and monorepo build orchestration. The model follows markdown links at load time to resolve external references and inline content.

- [Protocol Buffers Language Guide](https://protobuf.dev/programming-guides/proto3/) — Official Protobuf 3 syntax reference for defining language-agnostic contracts
- [gRPC Overview](https://grpc.io/docs/what-is-grpc/core-concepts/) — gRPC architecture, transport model, and code generation workflows
- [Nx Polyglot Monorepo Guide](https://nx.dev/getting-started/intro#learn-more) — Nx's approach to managing multiple language targets in one monorepo
- [Bazel Remote Caching](https://bazel.build/remote/caching) — Bazel's build caching and remote execution for fast polyglot CI pipelines
- [FastAPI Pydantic v2 Models](https://docs.pydantic.dev/latest/) — Pydantic v2 schema validation patterns for Python-based API boundaries
- [Tokio Rust Async Runtime](https://tokio.rs/tokio/tutorial) — Tokio's async model for Rust-based high-performance services
