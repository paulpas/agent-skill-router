---
name: type-safety-enforcement
description: Enforces type safety across codebases using static analysis, runtime validation schemas, and strict typing patterns to prevent data flow errors.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: type safety, type narrowing, strict mode, type guards, static typing, runtime validation, mypy, pyright, typescript strict, zod schema
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: testing-error-handling, api-contract-testing
---

# Type Safety Enforcement

Enforces type safety across Python and TypeScript codebases by configuring strict static analyzers, defining runtime validation schemas at system boundaries, and applying discriminated unions with custom type guards throughout application logic. This skill prevents silent data corruption, implicit `any` proliferation, and unvalidated external inputs from reaching core business logic.

## TL;DR Checklist

- [ ] Enable strict mode flags in mypy.ini / tsconfig.json before writing new code
- [ ] Define Pydantic v2 or Zod schemas at every API boundary — no raw dicts past the perimeter
- [ ] Use discriminated unions with a literal `type`/`kind` field for multi-state data structures
- [ ] Implement custom type guards (`isX()` functions) before branching on union members
- [ ] Add type-check gates to CI (mypy, pyright, or tsc --noEmit) and treat errors as failures
- [ ] Never widen to `any` — fix the root cause or use a typed wrapper with explicit comments

---

## When to Use

Use this skill when:

- Configuring static type checking for a Python project (mypy, pyright) or TypeScript project (tsc strict mode)
- Adding API input validation to FastAPI, Express, or any HTTP endpoint that receives external data
- Modeling complex domain state with multiple variants (e.g., order states, event payloads) using discriminated unions
- Writing conditional logic over union types where the compiler cannot narrow automatically
- Performing a code review and spotting implicit `any`, missing boundary validation, or unguarded `.value` access on unions
- Setting up CI type-check gates for a greenfield or legacy migration project

---

## When NOT to Use

Avoid this skill for:

- One-off scripts or throwaway prototypes where type safety adds unnecessary overhead
- Dynamic DSLs or metaprogramming-heavy codebases where static types cannot express the domain (use runtime validation only)
- Reviewing performance-critical hot paths — focus on profiling and optimization first, add typing later
- Situations where the entire team has no interest in gradual typing — negotiate a phased adoption plan instead

---

## Core Workflow

1. **Configure Strict Static Analysis Baseline** — Set up mypy or TypeScript strict mode before writing business logic. Enable `strict = true` in mypy.ini, and enable all 7 strict flags in tsconfig.json (`strict`, `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitReturns`). **Checkpoint:** Run the analyzer on existing code; record baseline error count and decide which errors to fix vs. suppress with per-file `# type: ignore` comments.

2. **Define Runtime Schemas at Perimeter Boundaries** — At every external data boundary (HTTP request bodies, message queue payloads, file imports), define a validation schema using Pydantic v2 models (Python) or Zod schemas (TypeScript). Parse and validate raw input into a strongly-typed object before passing it deeper. **Checkpoint:** Confirm that every public function, route handler, and event listener has exactly one validated entry point with no raw `dict`, `Record<string, unknown>`, or `any` escaping the perimeter.

3. **Implement Discriminated Unions for Data Variants** — For data structures that have multiple variants (e.g., an Order that can be `pending`, `filled`, `cancelled`, `rejected`), use a discriminated union pattern with a required literal discriminant field (`type: "pending" | "filled" | "cancelled"`). This enables exhaustive switch/case analysis. **Checkpoint:** Verify the TypeScript compiler enforces exhaustiveness (using `never` check) or Python's structural pattern matching covers all cases.

4. **Apply Type Guards in Conditional Logic Branches** — Where the static analyzer cannot automatically narrow a union type (e.g., cross-module boundaries, runtime-typed data), implement custom type guard functions using TypeScript's `is T` predicate syntax or Python `typing.cast` with explicit assertion checks. **Checkpoint:** Confirm that every conditional branch accessing a union member starts with a type guard call — never access discriminated fields directly without narrowing.

5. **Enforce CI-Gated Type Checking** — Add the static analyzer to CI as a required step. Fail the pipeline on any type error in newly introduced files (use `--follow-imports=skip` for legacy code). Run mypy/pyright or tsc with strict mode flags and treat warnings as errors. **Checkpoint:** Verify the CI configuration includes `mypy --config-file=mypy.ini src/`, `pyright`, or `tsc --noEmit` in the type-check step and that it blocks merges on failure.

---

## Implementation Patterns

### Pattern 1: Static Analyzer Configuration

Configure strict type checking at the project level before writing application code. This establishes the safety baseline that all developers must follow.

**Python — mypy.ini (or pyproject.toml `[tool.mypy]`):**

```ini
[mypy]
python_version = 3.12
strict = true
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true
disallow_incomplete_defs = true
check_untyped_defs = true
disallow_untyped_decorators = true
no_implicit_optional = true
warn_redundant_casts = true
warn_unused_ignores = true
warn_unreachable = true

[mypy-plugins]
enabled = 1

[[mypy.plugins.pydantic]]
init_model_call = true
```

**TypeScript — tsconfig.json (strict mode flags):**

```json
{
  "compilerOptions": {
    "target": "ES2024",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": false,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

### Pattern 2: Runtime Validation at System Boundaries (BAD vs. GOOD)

External data — API request bodies, database queries, message queue payloads — must never enter core logic without validation. This is the perimeter defense that static analysis cannot provide because types are erased at runtime.

**❌ BAD: Raw dict unvalidated in Python**

```python
from fastapi import FastAPI, Request

app = FastAPI()

# ❌ NO VALIDATION — raw dict with implicit any escapes to business logic
@app.post("/orders")
async def create_order(request: Request):
    data = await request.json()  # type: ignore[assignment]
    order_id = data["order_id"]       # KeyError if missing, silent corruption if wrong type
    symbol = data["symbol"]            # Any string accepted, including "INVALID!!"
    quantity = data["quantity"]        # Could be a string, None, negative number
    price = data.get("price", 0.0)     # Silently defaults to 0.0 on missing

    # Business logic receives completely untrusted data
    return await process_order(order_id, symbol, quantity, price)
```

**✅ GOOD: Pydantic v2 model validates at the boundary in TypeScript**

```typescript
import { z } from "zod";

// Zod schema — validated at the API boundary
const CreateOrderSchema = z.object({
  order_id: z.string().uuid("order_id must be a valid UUID"),
  symbol: z.string().regex(/^[A-Z]{2,6}\/[A-Z]{2,6}$/, "symbol must be BASE/QUOTE format"),
  quantity: z.number().positive("quantity must be greater than zero"),
  price: z.number().positive("price must be greater than zero"),
  side: z.enum(["buy", "sell"]).optional().default("buy"),
});

type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

// Type-safe handler — TypeScript knows the shape, Zod guarantees it at runtime
async function createOrder(rawBody: unknown): Promise<CreateOrderInput> {
  const parsed = CreateOrderSchema.parse(rawBody);
  return parsed; // Fully typed and validated
}

// Usage in a route handler
app.post("/orders", async (req: Request, res: Response) => {
  try {
    const orderInput = await createOrder(req.body);
    // TypeScript knows orderInput.symbol is string matching the regex
    // Zod has already rejected invalid shapes before this point
    const order = await processOrder(orderInput);
    res.status(201).json({ order_id: order.order_id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors.map(e => e.message) });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});
```

**❌ BAD: Raw dict unvalidated in Python (continuation of Pattern 2)**

```python
from pydantic import BaseModel, Field
from typing import Literal

# ❌ Missing validators — schema accepts anything that happens to have these fields
class OrderInput(BaseModel):
    order_id: str          # No format check — accepts "abc" as well as valid UUIDs
    symbol: str            # Accepts "INVALID!!", "", or None-wrapped strings
    quantity: float        # Accepts negative numbers, NaN, infinity
    price: float = 0.0     # Silent default of 0.0 hides missing data bugs

# Still no validation — raw dict escapes the function
async def handle_order(raw_body: dict) -> OrderInput:
    return OrderInput(**raw_body)  # No schema.parse() — silently accepts garbage
```

**✅ GOOD: Pydantic v2 model with field constraints in Python**

```python
from pydantic import BaseModel, Field, field_validator
from typing import Literal
import uuid as uuid_module

class OrderInput(BaseModel):
    """Validated order input — all fields enforced at construction."""

    order_id: str = Field(
        description="UUID v4 identifier for the order"
    )
    symbol: str = Field(
        min_length=5,
        max_length=12,
        pattern=r"^[A-Z]{2,6}\/[A-Z]{2,6}$",
        description="Trading pair in BASE/QUOTE format (e.g., BTC/USDT)"
    )
    quantity: float = Field(
        gt=0.0,
        description="Order quantity — must be strictly positive"
    )
    price: float = Field(
        gt=0.0,
        description="Order price — must be strictly positive"
    )
    side: Literal["buy", "sell"] = Field(
        default="buy",
        description="Order side"
    )

    @field_validator("order_id")
    @classmethod
    def validate_uuid_format(cls, v: str) -> str:
        """Ensure order_id is a valid UUID."""
        try:
            uuid_module.UUID(v, version=4)
        except ValueError:
            raise ValueError("order_id must be a valid UUID v4")
        return v

    @field_validator("symbol")
    @classmethod
    def validate_symbol_format(cls, v: str) -> str:
        """Reject symbols with unusual characters or wrong case."""
        if v != v.upper():
            raise ValueError("symbol must be uppercase (e.g., BTC/USDT)")
        return v

# ✅ Schema.parse() — raises ValidationError with detailed field errors
async def handle_order(raw_body: dict) -> OrderInput:
    parsed = OrderInput.model_validate(raw_body)  # Pydantic v2 API
    # If we reach here, parsed is fully validated and typed
    return parsed
```

---

### Pattern 3: Discriminated Unions for Complex State Machines

Discriminated unions model state machines and multi-variant data structures with compile-time safety. The discriminant field (e.g., `type`, `kind`, `status`) enables exhaustive analysis across all branches.

**TypeScript — Discriminated Union with Exhaustiveness Checking:**

```typescript
// Order states as a discriminated union
type OrderState =
  | { type: "pending"; submitted_at: number; symbol: string; quantity: number }
  | { type: "filled"; filled_at: number; fill_price: number; symbol: string }
  | { type: "cancelled"; cancelled_at: number; reason: string }
  | { type: "rejected"; rejected_at: number; reason_code: string };

// ✅ Exhaustiveness check — TypeScript catches missing cases at compile time
function processOrderState(state: OrderState): string {
  switch (state.type) {
    case "pending":
      return `Order ${state.symbol} pending for ${state.quantity} units`;
    case "filled":
      return `Order ${state.symbol} filled at ${state.fill_price}`;
    case "cancelled":
      return `Order cancelled: ${state.reason}`;
    case "rejected":
      return `Order rejected with code ${state.rejected_code ?? state.rejected_at}`;
    // The `never` check below will cause a compile error if a new state is added
    const _exhaustiveCheck: never = state;
    return _exhaustiveCheck.type; // Error: Type '"pending" | "filled" | ...' is not assignable to type 'never'
  }
}

// Adding a new variant like { type: "partially_filled"; ... } automatically
// triggers a compile error in processOrderState — no forgotten branches possible
```

**Python — Structural Pattern Matching (3.10+) with Data Classes:**

```python
from dataclasses import dataclass
from typing import Literal, Union
from datetime import datetime, UTC


@dataclass(frozen=True)
class OrderPending:
    type: Literal["pending"] = "pending"
    submitted_at: datetime = None  # type: ignore[assignment]
    symbol: str = ""
    quantity: float = 0.0

    def __post_init__(self):
        if self.submitted_at is None:
            object.__setattr__(self, "submitted_at", datetime.now(UTC))


@dataclass(frozen=True)
class OrderFilled:
    type: Literal["filled"] = "filled"
    filled_at: datetime = None  # type: ignore[assignment]
    fill_price: float = 0.0
    symbol: str = ""

    def __post_init__(self):
        if self.filled_at is None:
            object.__setattr__(self, "filled_at", datetime.now(UTC))


@dataclass(frozen=True)
class OrderCancelled:
    type: Literal["cancelled"] = "cancelled"
    cancelled_at: datetime = None  # type: ignore[assignment]
    reason: str = ""

    def __post_init__(self):
        if self.cancelled_at is None:
            object.__setattr__(self, "cancelled_at", datetime.now(UTC))


@dataclass(frozen=True)
class OrderRejected:
    type: Literal["rejected"] = "rejected"
    rejected_at: datetime = None  # type: ignore[assignment]
    reason_code: str = ""

    def __post_init__(self):
        if self.rejected_at is None:
            object.__setattr__(self, "rejected_at", datetime.now(UTC))


OrderState = Union[OrderPending, OrderFilled, OrderCancelled, OrderRejected]


# ✅ Structural pattern matching — mypy infers narrowed types per branch
def process_order_state_python(state: OrderState) -> str:
    """Process an order state using structural pattern matching."""
    match state:
        case OrderPending(symbol=sym, quantity=qty):
            return f"Order {sym} pending for {qty} units"
        case OrderFilled(symbol=sym, fill_price=fp):
            return f"Order {sym} filled at {fp}"
        case OrderCancelled(reason=reason):
            return f"Order cancelled: {reason}"
        case OrderRejected(reason_code=code):
            return f"Order rejected with code {code}"
        # Python doesn't have a built-in exhaustive check like TypeScript's `never`
        # Use a runtime assertion to catch unhandled cases
    raise RuntimeError(f"Unhandled order state: {type(state).__name__}")


# Usage — fully typed, validated at construction
pending = OrderPending(symbol="BTC/USDT", quantity=0.5)
print(process_order_state_python(pending))  # "Order BTC/USDT pending for 0.5 units"
```

---

### Pattern 4: Custom Type Guards for Narrowing Union Types

When the static analyzer cannot automatically narrow a union type — such as when data crosses module boundaries, comes from JSON parsing, or is stored in generic containers — implement custom type guard functions to provide explicit narrowing.

**TypeScript — `is` Predicate Type Guards:**

```typescript
// Union type for API response that could be success or error
type ApiResponse =
  | { status: "success"; data: Record<string, unknown>; timestamp: number }
  | { status: "error"; code: number; message: string; timestamp: number };

// ❌ BAD: Accessing properties without narrowing — TypeScript errors
function badProcessResponse(resp: ApiResponse): string {
  // Error: Property 'data' does not exist on type 'ApiResponse'.
  return resp.data.someKey;
}

// ✅ GOOD: Custom type guard narrows the union
function isSuccessResponse(resp: ApiResponse): resp is Extract<ApiResponse, { status: "success" }> {
  return resp.status === "success";
}

function isErrorResponse(resp: ApiResponse): resp is Extract<ApiResponse, { status: "error" }> {
  return resp.status === "error";
}

// Type-safe processing — TypeScript knows the shape in each branch
function processResponse(resp: ApiResponse): string {
  if (isSuccessResponse(resp)) {
    // resp narrowed to { status: "success"; data: ... }
    const keys = Object.keys(resp.data);
    return `Success with ${keys.length} fields`;
  }

  if (isErrorResponse(resp)) {
    // resp narrowed to { status: "error"; code: number; message: string }
    return `Error ${resp.code}: ${resp.message}`;
  }

  // Exhaustive — TypeScript knows all cases are handled
  const _exhaustiveCheck: never = resp;
  return `Unhandled status: ${_exhaustiveCheck.status}`;
}

// ✅ GOOD: Type guard for custom class discrimination
interface Animal { kind: "dog" | "cat"; makeSound(): string }
interface Dog extends Omit<Animal, "kind"> { kind: "dog"; breed: string; bark(): void }
interface Cat extends Omit<Animal, "kind"> { kind: "cat"; meow(): void }

function isDog(animal: Animal): animal is Dog {
  return animal.kind === "dog";
}

// Safe access after guard — no type assertion needed
function interactWithAnimal(animal: Animal): string {
  if (isDog(animal)) {
    // TypeScript knows this is Dog — bark() and breed are available
    const breedInfo = animal.breed;   // OK
    animal.bark();                    // OK
    return `Dog (${breedInfo}) says woof`;
  }
  // TypeScript narrows to Cat here
  return "Cat says meow";
}
```

**Python — Runtime Type Guard Functions with assert_type:**

```python
from typing import Union, Literal, TypeGuard, Any
import json


# Union type for parsed JSON that could be a dict or list
ParsedJson = Union[dict[str, Any], list[Any]]


# ✅ GOOD: Type guard function using TypeGuard return annotation
def is_dict_json(value: ParsedJson) -> TypeGuard[dict[str, Any]]:
    """Narrow ParsedJson to dict at runtime."""
    return isinstance(value, dict)


def is_list_json(value: ParsedJson) -> TypeGuard[list[Any]]:
    """Narrow ParsedJson to list at runtime."""
    return isinstance(value, list)


# Usage — mypy/pyright narrow the type inside if branches
def process_json_value(value: ParsedJson) -> str:
    """Process parsed JSON with proper type narrowing."""
    if is_dict_json(value):
        # MyPy knows value is dict[str, Any] here
        keys = list(value.keys())
        return f"Dict with {len(keys)} keys"
    elif is_list_json(value):
        # MyPy knows value is list[Any] here
        return f"List with {len(value)} elements"
    else:
        # Exhaustive — mypy verifies all branches covered
        raise ValueError(f"Unhandled JSON type: {type(value)}")


# ✅ GOOD: Custom type guard for Pydantic model variants
from pydantic import BaseModel

class MarketData(BaseModel):
    symbol: str
    price: float
    volume: float

class OrderBookEntry(BaseModel):
    price: float
    quantity: float
    side: Literal["bid", "ask"]


def is_market_data(obj: Any) -> TypeGuard[MarketData]:
    """Check if an object is a MarketData model instance."""
    return isinstance(obj, MarketData)


def is_order_book_entry(obj: Any) -> TypeGuard[OrderBookEntry]:
    """Check if an object is an OrderBookEntry model instance."""
    return isinstance(obj, OrderBookEntry)


def handle_trading_event(event: Union[MarketData, OrderBookEntry]) -> str:
    """Handle trading events with proper type narrowing."""
    if is_market_data(event):
        # Pyright/mypy narrow to MarketData — price and volume accessible
        return f"{event.symbol}: ${event.price:.2f} (vol: {event.volume})"
    elif is_order_book_entry(event):
        # Narrowed to OrderBookEntry
        return f"{event.side.capitalize()} at {event.price} x {event.quantity}"
    raise TypeError(f"Unexpected event type: {type(event)}")
```

---

### Pattern 5: Strict Mode Migration Strategy (Gradual Adoption)

When adding type safety to a legacy codebase, use per-file pragmas and incremental migration rather than trying to fix everything at once.

**Python — mypy `# type: ignore` with rationale:**

```python
# src/legacy/payment_processor.py
from typing import Any, Dict

def process_payment(raw_data: Dict[str, Any]) -> bool:  # Legacy API — will be refactored
    """Process payment from raw dict data. TODO: Replace with Pydantic schema."""
    # type: ignore[misc]  # Legacy function — awaiting Pydantic v2 migration

    amount = raw_data.get("amount")          # Potentially None or wrong type
    currency = raw_data.get("currency")      # Should be "USD", "EUR", etc.

    if not amount or not isinstance(amount, (int, float)):
        raise ValueError(f"Invalid payment amount: {amount}")

    return True  # Simplified for migration example
```

**TypeScript — `// @ts-expect-error` with documented suppression:**

```typescript
// src/legacy/report-generator.ts
// Migration note: This module uses dynamic typing due to complex template engine.
// Plan to replace with Zod + TypeScript interfaces by Q3 2026.

export function generateReport(data: Record<string, unknown>): string {
  // @ts-expect-error — Legacy: template engine requires dynamic keys
  const template = data["template"];
  const context = data["context"] as Record<string, any>; // Known safe at this point
  return renderTemplate(template as string, context);
}
```

---

## Constraints

### MUST DO
- Enable `strict = true` in mypy and all 7 strict flags in tsconfig.json for every project
- Define a Pydantic v2 model (Python) or Zod schema (TypeScript) at every external data boundary — API endpoints, message consumers, file loaders, CLI argument parsers
- Use discriminated unions with a `type`/`kind` literal field for all multi-state data structures
- Implement custom type guard functions (`isX()`) before branching on union members that cross module boundaries
- Add static analysis to CI as a required gate — fail the pipeline on any type error
- Document every `# type: ignore` or `// @ts-expect-error` with a rationale and target migration date
- Use `Literal` types for constrained string sets (order sides, status enums, API versions)
- Apply field constraints (`gt`, `lt`, `pattern`, `min_length`) in Pydantic models instead of manual validation logic

### MUST NOT DO
- Use `any` or `unknown` as a permanent solution — if you must use `unknown`, narrow it immediately with a type guard or schema parse
- Bypass runtime validation at system boundaries by relying solely on static analysis — types are erased at runtime in both Python and TypeScript
- Skip exhaustiveness checks when adding new variants to discriminated unions — this is how bugs enter production
- Use bare `.value` or index access (`data["key"]`) on union types without first narrowing the type
- Suppress type errors with `# type: ignore` or `@ts-ignore` without documenting the rationale and a migration plan
- Mix untyped legacy interfaces with typed new code without a clear boundary adapter (wrapper function that validates at the boundary)

---

## Output Template

When applying this skill to a codebase, review, or implementation task, produce:

1. **Static Analyzer Status** — Current mypy/tsconfig strict mode configuration and baseline error count
2. **Boundary Validation Audit** — List of public API endpoints with their validation schemas (or missing schemas)
3. **Union Type Inventory** — Data structures using discriminated unions vs. those that should be migrated
4. **Type Guard Coverage** — Existing type guard functions and gaps where they are needed
5. **CI Gate Verification** — Whether type checking is enforced in the CI pipeline
6. **Remediation Plan** — Prioritized list of actions: fix strict errors, add missing schemas, implement type guards

---

## Related Skills

| Skill                   | Purpose                                                  |
| ----------------------- | -------------------------------------------------------- |
| `testing-error-handling` | Validates that runtime validation errors are properly caught and tested |
| `api-contract-testing`  | Ensures API input/output contracts match the validation schemas defined at boundaries |
| `software-error-handling` | Complementary skill for structured error propagation alongside type safety enforcement |

---

## Live References

> Authoritative documentation links for static analysis, runtime validation, and type safety tooling.

- [mypy Documentation](https://mypy.readthedocs.io/en/stable/)
- [Pyright Type Checker](https://microsoft.github.io/pyright/#/)
- [TypeScript Strict Mode Flags](https://www.typescriptlang.org/tsconfig#strict)
- [Zod Schema Validation Library](https://zod.dev/)
- [Pydantic v2 Documentation](https://docs.pydantic.dev/latest/)
- [Python PEP 695 — Type Parameter Syntax](https://peps.python.org/pep-0695/)
