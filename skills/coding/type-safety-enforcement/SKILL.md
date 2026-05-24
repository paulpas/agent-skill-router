---
name: type-safety-enforcement
description: Enforces strong type safety across software systems using static typing, generics, custom types, strict null checking, and compile-time validation to eliminate entire categories of runtime errors.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: type safety, static typing, strict null check, generics, type annotations, type checking, mypy, TypeScript, how do i enforce types, compile-time errors, nominal typing, structural typing
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
  related-skills: engineering-principles, software-documentation, testing-unit-integration-e2e, static-analysis-tools
---

# Type Safety Enforcement

Enforces strong type safety across software systems using static typing, generics, custom types, strict null checking, and compile-time validation. This skill makes the model write code where entire categories of bugs — null references, invalid state transitions, wrong argument types — are caught at compile time rather than causing runtime failures in production.

## TL;DR Checklist

- [ ] All function signatures include typed parameters and return types with no `any` or `object` bypasses
- [ ] Enable strict mode: TypeScript `strict: true`, Python `mypy --strict`, or equivalent compiler flags
- [ ] Use discriminated unions (TypeScript) or tagged unions to model finite state machines at the type level
- [ ] Replace `boolean` flags with descriptive enum types for multi-value options
- [ ] Validate external data at system boundaries using runtime type checkers (Pydantic, Zod, io-ts) before it enters application logic
- [ ] No bare `any` — use `unknown` when type is uncertain, narrow it before use

---

## When to Use

Use this skill when:

- Setting up type safety for a new project or migrating an untyped codebase
- Designing data models that must guarantee valid state transitions at the type level
- Building APIs where request/response shapes need compile-time validation
- Refactoring legacy code to eliminate `null`/`None` crashes and type coercion bugs
- Creating library interfaces where callers should get compiler feedback for incorrect usage

---

## When NOT to Use

Avoid this skill for:
- Quick prototypes or proof-of-concepts where speed outweighs correctness guarantees
- Dynamic metaprogramming scenarios where types are generated at runtime (still validate at boundaries)
- Scripting tasks with one-off execution — add typing once the script becomes reusable infrastructure

---

## Core Workflow

1. **Establish Type Boundaries** — Identify system entry points (API endpoints, CLI args, file reads, database queries) where external data enters. Every boundary must have a runtime type validator that narrows `unknown` to your internal types.
   **Checkpoint:** No untyped data crosses a boundary — the compiler rejects anything annotated as `any`.

2. **Define Domain Types** — Create explicit types for each domain concept. Replace loose dictionaries with structured records. Use discriminated unions to model mutually exclusive states.
   **Checkpoint:** Every type expresses valid invariants — e.g., a `Money` type stores cents as integers, not floats.

3. **Enforce Null Safety** — Enable strict null checking in the compiler. Replace nullable fields with `Option`/`Maybe` types or default values. Use the non-null assertion operator only after exhaustive verification.
   **Checkpoint:** The compiler rejects all dereferences of potentially-null references without explicit handling.

4. **Apply Generics for Reusable Components** — When writing functions, classes, or interfaces that operate on multiple data shapes, parameterize them with generic type variables constrained to the necessary capabilities.
   **Checkpoint:** Generic constraints are as tight as possible — never use unconstrained `T` when a specific interface suffices.

5. **Configure Type Checkers in CI** — Add static type checking as a mandatory CI gate. Run with strictest flags and fail on any type error. Configure IDE integration so developers catch issues before committing.
   **Checkpoint:** The CI pipeline fails before merge if any file violates the configured type rules.

---

## Implementation Patterns

### Pattern 1: Discriminated Unions for State Machines

```typescript
// TypeScript — model an order's lifecycle as a type-safe state machine
// Invalid transitions are caught at compile time

type OrderState =
  | { status: "draft"; items: LineItem[]; total?: number }
  | { status: "confirmed"; items: LineItem[]; total: number; confirmedAt: string }
  | { status: "shipped"; items: LineItem[]; total: number; trackingNumber: string; shippedAt: string }
  | { status: "delivered"; items: LineItem[]; total: number; deliveredAt: string }
  | { status: "cancelled"; items: LineItem[]; total: number; cancelledAt: string; refundAmount?: number };

// ✅ GOOD — the compiler knows which fields exist based on the current state
function calculateShipping(order: OrderState): string | null {
  switch (order.status) {
    case "draft":
      return null; // Not yet ready to ship
    
    case "confirmed":
    case "shipped":
      return "Standard — 5 business days"; // Both have items and total
    
    case "delivered":
      return "Already delivered";
    
    case "cancelled":
      return "Order was cancelled";
  }
  // Exhaustive check: TypeScript errors if a case is missing
}

// ❌ BAD — using a string for status allows invalid transitions at runtime
type BadOrder = {
  status: string;           // Can be "draft", "confirmed", "shipped", or literally "banana"
  total?: number;           // Optional when it should always exist after confirmation
};

// The compiler cannot help you:
function badCalculateShipping(order: BadOrder): string {
  if (order.status === "draft") return null;       // No error for missing other cases
  if (order.status === "shipped") return "checking tracking...";
  // What about confirmed, delivered, cancelled? Compiler doesn't enforce exhaustiveness.
  return "unknown status";
}
```

### Pattern 2: Runtime Validation at System Boundaries

```python
# Python — validate external data at boundaries using Pydantic v2
# This converts untyped JSON from API requests into strictly typed domain objects

from pydantic import (
    BaseModel, Field, EmailStr, field_validator, model_validator,
    ValidationError
)
from typing import Optional
from datetime import datetime


class PaymentItem(BaseModel):
    """A single line item in a payment request. Validates at parse time."""
    product_id: str = Field(..., min_length=1, max_length=64, pattern=r"^[a-zA-Z0-9_-]+$")
    quantity: int = Field(..., ge=1, le=9999)
    unit_price_cents: int = Field(..., ge=0, description="Price in smallest currency unit")

    @field_validator("unit_price_cents")
    @classmethod
    def round_to_nearest_cent(cls, v: int) -> int:
        """Reject fractional cent values at parse time."""
        if v % 1 != 0:
            raise ValueError("Price must be a whole number of cents")
        return v


class PaymentRequest(BaseModel):
    """Validated payment request from an external API consumer."""
    order_id: str = Field(..., description="External order identifier")
    items: list[PaymentItem] = Field(..., min_length=1, max_length=100)
    currency: str = Field(default="USD", pattern=r"^[A-Z]{3}$")
    idempotency_key: Optional[str] = Field(
        default=None,
        description="Client-provided key to prevent duplicate payments"
    )

    @model_validator(mode="after")
    def validate_total(self) -> "PaymentRequest":
        """Ensure all items have valid prices after parsing."""
        total = sum(item.unit_price_cents * item.quantity for item in self.items)
        if total == 0:
            raise ValueError("Total payment amount must be greater than zero")
        return self


def handle_payment_request(raw_json: dict) -> PaymentRequest:
    """Entry point: validates external JSON and returns a typed domain object.
    
    Raises ValidationError with detailed field-level errors for each violation.
    """
    try:
        return PaymentRequest.model_validate(raw_json)
    except ValidationError as e:
        # Map Pydantic errors to HTTP 422 response
        errors = [
            {
                "field": error["loc"][0] if error["loc"] else None,
                "code": error["type"],
                "message": error["msg"],
            }
            for error in e.errors()
        ]
        raise ValidationError.from_exception_data(
            title="PaymentRequest validation failed", line_errors=errors
        )


# ✅ GOOD — type checker knows the exact shape after validation
def process_payment(request: PaymentRequest) -> None:
    # These are all guaranteed to exist and be valid types:
    order_id: str = request.order_id
    items: list[PaymentItem] = request.items
    for item in items:
        # item.unit_price_cents is int (validated), never float or string
        line_total = item.unit_price_cents * item.quantity  # Type-safe multiplication


# ❌ BAD — untyped dict from JSON, everything is a guess at runtime
def bad_process_payment(data: dict) -> None:
    order_id = data.get("order_id")           # Could be None, string, or anything
    items = data.get("items", [])              # Could be None, string, or wrong shape
    for item in items:                         # Runtime crash if item is not a mapping
        price = item["unit_price_cents"]       # KeyError if key missing, TypeError if wrong type
        total = price * item["quantity"]       # Could multiply string * string → silent bug
```

### Pattern 3: Generic Constraints for Reusable Components

```typescript
// TypeScript — generic repository pattern with tight constraints
// The constraint ensures only entities with required fields work with this repo

interface Entity {
  id: string;                    // Every entity must have a string ID
  createdAt: Date;              // And a creation timestamp
}

interface HasName {
  name: string;                  // Optional capability for named entities
}

// ✅ GOOD — T must satisfy the Entity constraint, but can also mix in HasName
class Repository<T extends Entity> {
  constructor(private db: Database) {}

  async findById(id: string): Promise<T | null> {
    const result = await this.db.query<T>("SELECT * FROM table WHERE id = $1", [id]);
    return result?.[0] ?? null;
  }

  // Generic method with additional constraint for named entities
  async findByName(
    name: string,
  ): Promise<T extends HasName ? T[] : never> {
    if (!("name" in {} as T)) {
      return [] as never;  // Compile-time guarantee that only HasName entities reach here
    }
    const results = await this.db.query<T>(
      "SELECT * FROM table WHERE name LIKE $1", [`%${name}%`]
    );
    return results ?? [];
  }

  async findAll(): Promise<T[]> {
    return (await this.db.query<T>("SELECT * FROM table")) ?? [];
  }
}

// Concrete entity definitions
interface User extends Entity, HasName {
  email: string;
  role: "admin" | "user";      // Literal union — only these two values allowed
}

interface AuditLog extends Entity {
  action: string;              // No name field — findByName returns `never` at compile time
  severity: "low" | "medium" | "high";
}

// Usage — the type system guides correct usage:
const userRepository = new Repository<User>(db);
const user = await userRepository.findById("abc");
if (user !== null) {
  // Type checker knows user.role is "admin" | "user" — no runtime check needed
  if (user.role === "admin") {
    // Safe to proceed
  }
}

// AuditLog doesn't have `name` — compiler errors on findByName:
const logRepository = new Repository<AuditLog>(db);
// @ts-expect-error — findByName returns never for non-HasName entities
await logRepository.findByName("something"); // Compile error!
```

---

## Constraints

### MUST DO
- Enable strict mode in all language compilers (TypeScript `strict: true`, Python `mypy --strict`, Rust `#![deny(warnings)]`)
- Replace every `any` or untyped parameter with either a specific type or `unknown` followed by runtime validation
- Use discriminated/tagged unions for state modeling — never use string flags or boolean combinations
- Validate all external data at system boundaries using runtime type checkers (Pydantic, Zod, io-ts) before it enters application logic
- Constrain generics tightly — prefer `T extends SpecificInterface` over unconstrained `T`
- Use literal unions instead of string enums for finite sets of values (`"pending" | "shipped" | "delivered"` over enum)

### MUST NOT DO
- Use `any` as a shortcut to suppress type errors — use `unknown` and narrow explicitly, or fix the underlying design
- Store monetary values as floating-point numbers — use integer cents or decimal types to avoid precision errors
- Mix null/undefined with typed fields — use Optional/Maybe types or provide sensible defaults
- Rely on duck typing in statically-typed languages — explicit interfaces are more maintainable than implicit compatibility
- Bypass type checking with `@ts-ignore` or `# type: ignore` without documenting the reason and tracking it for remediation

---

## Output Template

When enforcing type safety with this skill active, the output must contain:

1. **Type Definitions** — Domain types with proper constraints (discriminated unions, literal unions, generic bounds)
2. **Boundary Validators** — Runtime type checkers at system entry points converting untyped data to typed domain objects
3. **Generic Components** — Reusable abstractions with tight type constraints demonstrating the pattern
4. **Compiler Configuration** — Strict mode flags for the language's type checker (tsconfig.json, pyproject.toml mypy section)
5. **Before/After Examples** — Clear BAD vs. GOOD comparisons showing how type safety prevents runtime errors

---

## Related Skills

| Skill | Purpose |
|---|---|
| `engineering-principles` | SOLID, DRY principles that inform how types should be structured and composed |
| `software-documentation` | Generating accurate type stubs and API reference docs from the type system |
| `testing-unit-integration-e2e` | Testing strategies to verify type boundaries catch invalid data correctly |
| `static-analysis-tools` | Additional static analysis beyond typing (complexity metrics, unused code detection) |

---

## Live References

> Authoritative documentation links for type safety enforcement. The model follows markdown links at load time to resolve external references and inline content.

- [TypeScript Strict Mode Documentation](https://www.typescriptlang.org/tsconfig#strict)
- [Pydantic v2 Documentation](https://docs.pydantic.dev/latest/)
- [Python PEP 484 — Type Hints](https://peps.python.org/pep-0484/)
- [Discriminated Unions in TypeScript](https://www.typescriptlang.org/docs/handbook/unions-and-intersections.html#discriminating-unions)
- [Mypy Strict Mode Configuration](https://mypy.readthedocs.io/en/stable/config_file.html#confval-strict)
