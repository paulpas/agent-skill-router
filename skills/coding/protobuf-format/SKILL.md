---
name: protobuf-format
description: Designs protocol buffer proto3 schemas for data serialization covering well-known types, field behavior annotations, schema evolution strategies, and Buf CLI tooling for type contracts.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: protocol buffers, proto3 schema, protobuf serialization, buf cli, well-known types, wrapper types, schema evolution, how do i design proto schemas
  archetypes:
    - tactical
    - generation
  anti_triggers:
    - brainstorming
    - vague ideation
    - code golf
    - over-engineering
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: grpc-patterns, data-encoding, event-schema-versioning
---

# Protocol Buffers Schema Design (proto3)

Designs protocol buffer proto3 schemas for data serialization as a standalone type contract format. Focuses on message schema engineering — field types, well-known types, wrapper types, field behavior annotations, map fields, schema evolution, and Buf CLI tooling. This skill covers the `.proto` file as a data contract, not gRPC transport.

## TL;DR Checklist

- [ ] Use `optional` keyword for sparse fields in proto3 (not `google.protobuf.*Value` wrapper types)
- [ ] Select well-known types correctly: `Timestamp` for time, `Duration` for spans, `Struct` for dynamic JSON-like data
- [ ] Apply `google.api.field_behavior` annotations to REQUIRED and IMMUTABLE fields for code generation contracts
- [ ] Reserve all removed field numbers — never reuse a deleted field's number
- [ ] Add `.deprecated = true` to every field you intend to remove in the next schema version
- [ ] Use `map<key_type, value_type>` when you need dictionary semantics; remember maps cannot be repeated
- [ ] Configure Buf lint and breaking detection rules in `buf.yaml` before publishing a module

---

## When to Use

Use this skill when:

- Designing or reviewing a `.proto` file for data serialization between services
- Choosing between well-known types (`Timestamp`, `Duration`, `Any`, `Struct`, `Value`) and custom messages
- Deciding whether to use `optional string` vs `google.protobuf.StringValue` in modern proto3 (2025+)
- Planning schema evolution strategies: adding, deprecating, or removing fields safely
- Selecting appropriate field types for IDs (`int64` vs `string`), monetary amounts, and enumerations
- Setting up Buf CLI tooling (`buf.yaml`, lint rules, breaking detection) as the modern protoc alternative
- Defining map fields with specific key/value type constraints

---

## When NOT to Use

Avoid this skill for:

- Designing gRPC service definitions or transport-layer contracts (use `grpc-patterns` instead)
- Implementing gRPC client/server code in Go, Python, or other languages
- Deciding between REST, JSON, XML, or Avro as a wire format — this skill assumes protobuf is chosen
- Learning basic Protobuf syntax basics if you already have 2+ years of proto3 experience and need quick lookups

---

## Core Workflow

1. **Define the package namespace** — Choose a unique reverse-DNS package name that reflects ownership, not product name.
   **Checkpoint:** The package must be namespaced to avoid collisions with third-party WKT imports and other teams' schemas.

2. **Select message structure** — Enumerate the top-level messages and their relationships (nested, oneof, map).
   **Checkpoint:** Every field in every message must have a concrete type — no `bytes` for data that should be `string`, and no repeated primitives without a named wrapper message.

3. **Choose field types wisely** — For each field, select the most specific proto3 scalar or well-known type. Use `optional` for nullable fields in proto3; do not use `google.protobuf.*Value` wrappers unless you must interoperate with legacy code that expects JSON `"value": null`.
   **Checkpoint:** After typing every field, review: are any `int64` IDs better as `string`? Are monetary values stored as integers in smallest units?

4. **Add semantic annotations** — Apply `google.api.field_behavior` and `google.api.resource` annotations to enforce contracts at the code generation layer.
   **Checkpoint:** Every REQUIRED field must have `FIELD_BEHAVIOR_REQUIRED`; every immutable identifier must have `FIELD_BEHAVIOR_IMMUTABLE`.

5. **Plan for schema evolution** — Document which fields might change, reserve numbers before removing any field, and use `.deprecated = true` as a two-phase removal strategy.
   **Checkpoint:** No removed field number may be reused within the same package scope. Check the reserved list is complete.

6. **Configure Buf tooling** — Create `buf.yaml` with lint rules, breaking detection rules, and plugin targets. Validate before merging changes.
   **Checkpoint:** Run `buf lint` and `buf breaking` locally before every commit to `.proto` files.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Well-Known Types — When to Use Each WKT

Proto3 includes 14 well-known types that map to native language types in generated code. Choosing the right WKT matters for both serialization size and developer ergonomics.

```protobuf
// protos/shared/v1/common.proto
// Demonstrates correct selection of well-known types with JSON serialization differences.

syntax = "proto3";

package shared.v1;

import "google/protobuf/timestamp.proto";
import "google/protobuf/duration.proto";
import "google/protobuf/struct.proto";
import "google/protobuf/field_mask.proto";
import "google/protobuf/any.proto";

// ✅ GOOD: Timestamp for point-in-time — serializes to ISO 8601 JSON string "2025-01-15T10:30:00Z"
message Order {
  string order_id = 1;
  google.protobuf.Timestamp created_at = 2;        // {"created_at": "2025-01-15T10:30:00Z"}
  google.protobuf.Timestamp updated_at = 3;

  // ✅ GOOD: Duration for time spans — serializes to JSON string "3600.000000001s"
  google.protobuf.Duration cancellation_window = 4;  // {"cancellation_window": "3600s"}

  // ❌ BAD: Using int64 seconds since epoch loses timezone info and requires client-side parsing
  // int64 created_at_epoch = 4;  // Don't do this — use Timestamp instead

  // ✅ GOOD: FieldMask for partial update specification — serializes as JSON array of field paths
  google.protobuf.FieldMask update_mask = 5;        // {"update_mask": ["email", "display_name"]}

  // ✅ GOOD: Struct for arbitrary key-value data when schema is unknown at design time
  map<string, google.protobuf.Value> metadata = 6;  // Dynamic JSON-like payload

  // ⚠️ CAUTION: Any for wrapping heterogeneous messages — loses type safety in serialization
  // Use only when you genuinely need to embed one proto message inside another and know the
  // concrete type at runtime via type_url. For same-package messages, prefer direct nesting.
  google.protobuf.Any attachment = 7;
}
```

**Well-Known Type Selection Guide:**

| Scenario | Choose | JSON Serialization | Why |
|----------|--------|--------------------|-----|
| UTC date-time | `google.protobuf.Timestamp` | `"2025-01-15T10:30:00Z"` | ISO 8601 with timezone; native datetime in generated code |
| Time span | `google.protobuf.Duration` | `"3600.5s"` | Human-readable with nanosecond precision |
| Dynamic key-value | `google.protobuf.Struct` + `Value` | `{"key": "value", "num": 42}` | Full JSON type mapping; use sparingly — loses schema enforcement |
| Partial update fields | `google.protobuf.FieldMask` | `["field_a", "nested.field_b"]` | Standardized for PATCH operations |
| Wrap unknown message | `google.protobuf.Any` | `{"@type": "...", "field": "val"}` | Type URL + serialized payload; expensive and loses type safety |
| Empty placeholder | `google.protobuf.Empty` | `{}` (empty object) | Method return type when no data needed |

### Pattern 2: Wrapper Types vs `optional` — Modern 2025+ Guidance

The old pattern of using `google.protobuf.StringValue`, `google.protobuf.Int32Value`, etc. for nullable fields is **deprecated for new APIs**. Proto3 introduced the `optional` keyword (since protoc 3.12+) which generates cleaner code and simpler JSON.

```protobuf
// protos/shared/v1/user.proto
// Demonstrates modern optional vs deprecated wrapper types.

syntax = "proto3";

package shared.v1;

import "google/api/field_info.proto";

message UserProfile {
  string id = 1 [(google.api.field_info).format = "UUID"];

  // ✅ GOOD (2025+): Use `optional` keyword — cleaner code, simpler JSON, native nullable types
  optional string display_name = 2;
  optional string email = 3;
  optional int64 age = 4;
  optional bool newsletter_opt_in = 5;

  // ❌ BAD (legacy pattern): google.protobuf.StringValue wrappers — deprecated for new APIs
  // These generate boxed types in most language clients and serialize to JSON as:
  //   {"email": "alice@example.com"}  when present
  //   {}                              when absent (no key emitted)
  // vs optional which emits:
  //   {"email": null}                 when absent (key present, value is null)
  //
  // google.protobuf.StringValue display_name = 6;
  // google.protobuf.StringValue email = 7;

  // ✅ GOOD: Wrapper types are acceptable ONLY when interoperating with legacy JSON APIs
  // that expect `null` to be omitted entirely (not emitted as a key). In that specific case,
  // the wrapper type's "no-key-on-absent" behavior matches the external contract.
}
```

**Key differences — `optional` vs wrapper types:**

| Property | `optional string name = 2;` | `google.protobuf.StringValue name = 2;` |
|----------|-----------------------------|----------------------------------------|
| Generated code type | `name: Optional[str]` (Python) / `*string` (Go) / `String?` (TypeScript) | `StringValue` message instance / pointer to wrapped value |
| JSON when set | `{"name": "Alice"}` | `{"name": "Alice"}` |
| JSON when unset | `{"name": null}` or omitted (language-dependent) | Key **omitted entirely** |
| Wire format when unset | No bytes emitted (same as absent field) | `Empty` message serialized (tiny overhead) |
| Code complexity | Native nullable type | Message wrapping/unwrapping required |
| Recommended for new APIs? | **Yes** — since protoc 3.12+ | **No** — deprecated pattern |

### Pattern 3: Field Behavior Annotations + Deprecation Patterns

Field behavior annotations from `google.api.field_behavior.proto` provide semantic meaning that code generators can enforce. Combined with deprecation, they form the schema evolution contract layer.

```protobuf
// protos/accounts/v1/account.proto
// Demonstrates field behavior annotations and schema evolution through deprecation.

syntax = "proto3";

package accounts.v1;

import "google/api/field_behavior.proto";
import "google/api/resource.proto";
import "google/protobuf/timestamp.proto";
import "google/protobuf/field_mask.proto";

// ✅ GOOD: Resource annotation provides a canonical resource type name
// Used by Google Cloud APIs and gnostic tooling for resource reference resolution.
message Account {
  option (google.api.resource) = {
    type: "accounts.example.com/Account"
    pattern: "accounts/{account}"
    singular: "account"
    plural: "accounts"
  };

  // ✅ GOOD: REQUIRED annotation signals this field must be set before persistence.
  // Code generators and validation libraries can enforce this at the serialization layer.
  string account_id = 1 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.field_behavior) = IMMUTABLE
  ];

  // ✅ GOOD: INPUT_ONLY — never returned in responses. Use for passwords or tokens.
  string password_hash = 2 [(google.api.field_behavior) = INPUT_ONLY];

  // ✅ GOOD: OUTPUT_ONLY — set by the server, ignored on write.
  google.protobuf.Timestamp created_at = 3 [(google.api.field_behavior) = OUTPUT_ONLY];
  google.protobuf.Timestamp deleted_at = 4 [(google.api.field_behavior) = OUTPUT_ONLY];

  // ✅ GOOD: IMMUTABLE after creation — code generators can reject updates to this field.
  string account_type = 5 [
    (google.api.field_behavior) = IMMUTABLE,
    (google.api.field_behavior) = REQUIRED
  ];

  // ✅ GOOD: UNORDERED_LIST indicates set semantics — server should treat as a set, not an ordered sequence.
  repeated string permissions = 6 [(google.api.field_behavior) = UNORDERED_LIST];

  // ⚠️ DEPRECATED: First phase of removal. Keep for 2+ major versions after marking deprecated.
  // Clients receive the field value but should stop sending it. Servers ignore it on input.
  string legacy_email = 7 [
    (google.api.field_behavior) = INPUT_ONLY,
    deprecated = true  // ✅ CRITICAL: Always add .deprecated with any removed field
  ];

  // Reserved numbers from previously deleted fields — NEVER reuse these.
  reserved 8, 9, 10;
  reserved "temp_field_a", "temp_field_b";  // Also reserve former field names for clarity
}

// ✅ GOOD: UpdateAccount request uses FieldMask for partial updates with explicit constraints.
message UpdateAccountRequest {
  Account account = 1 [(google.api.field_behavior) = REQUIRED];
  google.protobuf.FieldMask update_mask = 2 [
    (google.api.field_behavior) = REQUIRED,
    // The mask must only reference OUTPUT_ONLY fields that are allowed to change
  ];
}
```

**Wire format impact of annotations:**
- `field_behavior` annotations have **zero wire format impact** — they exist only in the `.proto` source and are consumed by code generation tools.
- `deprecated = true` also has zero wire format impact — the field still serializes/deserializes normally.
- The actual enforcement of REQUIRED/IMMUTABLE semantics happens in generated code validators, not at the protobuf serialization layer.

### Pattern 4: Map Fields and Type Selection Guide

Map fields provide dictionary semantics in proto3 with specific type constraints and limitations you must know before using them.

```protobuf
// protos/shared/v1/types.proto
// Demonstrates map fields, id selection patterns, monetary handling, and oneof alternatives.

syntax = "proto3";

package shared.v1;

import "google/protobuf/timestamp.proto";
import "google/protobuf/struct.proto";

message Transaction {
  // ✅ GOOD: String IDs for external-facing identifiers — stable across system migrations
  // Use string when the ID comes from an external source (UUID, SKU, email) that you don't control.
  string transaction_id = 1;

  // ✅ GOOD: int64 for internal sequential/monotonic IDs — compact wire format (varint-encoded)
  // Use int64 for internally generated, system-owned identifiers where size matters.
  int64 sequence_number = 2;

  // ❌ BAD: Storing monetary values as double — floating point imprecision loses cents
  // double amount = 3;  // 0.1 + 0.2 == 0.30000000000000004 in binary floating point

  // ✅ GOOD: Monetary amounts in smallest currency unit (cents, satoshis, etc.) as int64
  // Client code divides by 10^precision to display; server stores exact integer.
  int64 amount_micros = 4;       // Amount in millionths of a unit (e.g., $12.345678)
  string currency_code = 5;      // ISO 4217 code: "USD", "EUR", "BTC"

  // ✅ GOOD: Map fields for fixed-key lookup semantics
  // Key type must be integral or string (no floats, enums, or messages).
  // Maps are unordered on the wire — iteration order is not guaranteed.
  map<string, int64> balances_by_currency = 6;

  // ⚠️ Map limitation: proto3 does NOT support `repeated map<key, value>`
  // ❌ repeated map<string, int64> multi_balances = 7;  // SYNTAX ERROR — not allowed

  // ✅ ALTERNATIVE: For multiple sets of key-value data, use a repeated message wrapper.
  repeated CurrencyBalance balances = 7;

  // ✅ GOOD: oneof for mutually exclusive field groups — only one can be set at wire level
  // Wire format is efficient: only the selected field's number and value are serialized.
  oneof transfer_type {
    // Only one of these can be present in any single message instance
    AccountRef source_account = 8;
    ExternalPayment external_ref = 9;
  }

  // ✅ GOOD: Nested repeated message as a clean alternative to maps for complex values
  repeated string tags = 10;
}

// Wrapper for multi-currency balances (repeated-map alternative)
message CurrencyBalance {
  string currency_code = 1;
  int64 balance_micros = 2;
}

// oneof variant reference types — avoids circular dependencies with message nesting.
message AccountRef {
  string account_id = 1;
}

message ExternalPayment {
  // Use Struct when the external payment system has arbitrary metadata you can't model statically
  map<string, google.protobuf.Value> extra_fields = 1;
  string provider_ref = 2;
}
```

**Type Selection Quick Reference:**

| Data | Best Type | Reason |
|------|-----------|--------|
| UUIDs, SKUs, email addresses | `string` | External sources are strings; varint-encoding doesn't help |
| Internal sequential IDs | `int64` | Compact varint encoding; monotonically increasing |
| Monetary amounts | `int64` (smallest unit) | Exact precision; no floating point issues |
| Booleans | `bool` | Single bit on wire |
| Counts, quantities | `int32` unless exceeding ±2B | Smaller wire size than int64 |
| Large counters, timestamps in seconds | `int64` | Exceeds int32 range; 64-bit varint is still efficient for small values |
| Enumerated categories | `enum` | Self-documenting, compact (0-based integer on wire) |

### Pattern 5: Nested Messages and Depth Guidelines

Excessive nesting increases schema complexity and generated code verbosity. Apply depth limits and reuse patterns.

```protobuf
// protos/shared/v1/address.proto
// Demonstrates nesting depth control and cross-message reuse.

syntax = "proto3";

package shared.v1;

message Address {
  string street_line_1 = 1;
  string street_line_2 = 2;       // Optional second line
  string city = 3;
  string administrative_area = 4; // State/province code
  string postal_code = 5;
  string country_code = 6;        // ISO 3166-1 alpha-2

  // ✅ GOOD: Reusable message used across multiple parent schemas
  // Address appears in Account, Order, and Contact — defined once, referenced everywhere.
}

message Account {
  string account_id = 1;
  string display_name = 2;

  // ✅ GOOD: Direct field reference to a top-level reusable message
  // One level of nesting via field — clean and shallow.
  Address billing_address = 3;
  Address shipping_address = 4;

  // ❌ BAD: Deep nesting (3+ levels) — generated code becomes unwieldy,
  //          e.g., msg.account.billing.address.city requires deep accessor chains.
  // message NestedOrder {
  //   message LineItem {
  //     message Pricing {
  //       double unit_price = 1;  // Too deep!
  //     }
  //     Pricing pricing = 1;
  //   }
  //   LineItem item = 1;
  // }

  // ✅ GOOD: Flat alternative — extract deeply nested structures to top-level messages.
  repeated OrderLineItem order_items = 5;
}

// Extracted flat message replaces nested structure
message OrderLineItem {
  string product_id = 1;
  int32 quantity = 2;
  UnitPrice pricing = 3;    // Top-level, shallow reference
}

message UnitPrice {
  int64 amount_micros = 1;
  string currency_code = 2;
}
```

**Nesting depth guidelines:**
- **Maximum recommended depth: 2 levels** (e.g., `account.billing_address.city`). Beyond that, extract to top-level messages.
- **Reuse over nest**: Define shared structures (`Address`, `Money`, `PhoneNumber`) at the package root and reference them by field rather than nesting inline.
- **`oneof` depth**: A `oneof` can contain nested messages, but prefer flat references for readability.

---

## Constraints

### MUST DO
- Use `optional` keyword for sparse/nullable fields in proto3; do not use `google.protobuf.*Value` wrapper types for new APIs
- Reserve field numbers of removed/deleted fields with `reserved N;` — never reuse a deleted number within the same package
- Add `deprecated = true` to every field before removing it from the schema; keep deprecated fields for at least 2 major versions
- Apply `FIELD_BEHAVIOR_REQUIRED` to all fields that must be set before the message can be persisted
- Apply `FIELD_BEHAVIOR_IMMUTABLE` to identifiers and keys that cannot change after creation
- Store monetary values as integer types in the smallest currency unit (micros, cents, satoshis) — never use float or double
- Validate map key types are integral (`int32`, `int64`, `uint32`, `uint64`, `bool`, `string`) — no enums, floats, or messages as keys
- Configure Buf lint rules (`buf.yaml`) and breaking detection before publishing a module version
- Use reverse-DNS package names (e.g., `accounts.v1`, `payments.v2`) to prevent type collisions

### MUST NOT DO
- Define gRPC service or transport-layer definitions in `.proto` files that are managed by this skill — use `grpc-patterns` for RPC and service layer design
- Reuse a field number after deleting it, even if the new field has a different type and meaning
- Nest messages more than 2 levels deep — extract to top-level package messages instead
- Use `bytes` fields for data that should be `string` — protobuf does not validate encoding at the wire level
- Store timestamps as `int64` epoch seconds or milliseconds — use `google.protobuf.Timestamp` for timezone safety
- Put business logic validation rules (e.g., "email must contain @") in proto annotations — proto3 has no built-in value validation; use application-level validators or protoc plugins like `protoc-gen-validate`

---

## Live References

> Authoritative documentation links for Protocol Buffers schema design and tooling.

- [Protocol Buffers Language Guide (proto3)](https://protobuf.dev/reference/protobuf/proto3/) — Official proto3 language reference covering all syntax elements
- [Well-Known Types Reference](https://protobuf.dev/reference/protobuf/googleapis/) — Complete reference for `google.protobuf.*` types with JSON mapping tables
- [Google API Annotations](https://github.com/googleapis/google-api-common-protos) — Field behavior, resource, and custom option annotations used in production schemas
- [Buf CLI Documentation](https://docs.buf.build/cli-documentation) — Modern Protobuf build tool: `buf lint`, `buf breaking`, `buf generate`
- [Buf Schema Registry (BSR)](https://docs.buf.build/bscan/introduction) — Centralized registry for versioning, sharing, and distributing `.proto` modules
- [protoc-gen-validate](https://github.com/bufbuild/protoc-gen-validate) — Validation library for proto3 with declarative constraints on fields
- [Protocol Buffers Best Practices (Google)](https://protobuf.dev/programming-guides/api/) — Google's own guidance on API design with Protobuf, including naming and evolution conventions

---

## Related Skills

| Skill | Purpose |
|---|---|
| `grpc-patterns` | Designs gRPC service definitions and transport-layer contracts using the same `.proto` files — use together when building a full client-server system |
| `data-encoding` | Covers protobuf binary vs JSON wire format selection, encoding variants, and serialization boundaries — complements this skill's schema design |
| `event-schema-versioning` | Event-driven architecture patterns for evolving schemas in pub/sub systems — applies proto3 evolution strategies to event streams |
