---
name: typescript-generics-types
description: Implements TypeScript generics, conditional types, mapped types, template
  literal types, and type-level programming patterns for compile-time type transformations.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: generics, type parameters, conditional types, infer keyword, mapped types,
    template literal types, keyof
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - examples
  - do-dont
  related-skills: typescript-intersection-types,type-safety-enforcement
---


# TypeScript Generics and Type-Level Programming

Implements generic type declarations, conditional types with `infer`, mapped types with key remapping, template literal types, and recursive type-level programming to create compile-time type transformations that enforce correctness before runtime.

## TL;DR for Code Generation

- [ ] Constrain type parameters with `<T extends Constraint>` so the compiler knows what properties are available on `T`
- [ ] Use `infer` in nested positions (e.g., `infer E[]`, `infer A, infer B`) to extract inner types from complex signatures
- [ ] Apply mapped types with `as KeyRemap` (`K extends Filter ? never : K`) for custom property filtering and renaming
- [ ] Use template literal types for compile-time string computation (event names, path segments, API route keys)
- [ ] Ensure recursive conditional types have a base case to prevent infinite expansion (check termination on primitives)

---

## When to Use

- Building reusable data access layers (repositories, DAOs) where entity shapes vary but operations are uniform
- Creating type-safe builders, factories, or adapters that accept different model shapes
- Implementing utility types (`Pick`, `Omit`, `DeepReadonly`) for internal APIs or shared type packages
- Defining event handler maps, route handlers, or message bus schemas with compile-time key enforcement
- Constraining generic parameters to union literals to ensure exhaustive handling (e.g., `K extends keyof T`)

---

## When NOT to Use

- Simple one-off functions with a single known type — generics add cognitive overhead when the type is fixed
- Runtime type checking or coercion — TypeScript types erase at runtime; use `io-ts`, `zod`, or `valibot` for that
- Deeply nested generic chains (`GenericA<GenericB<GenericC<GenericType>>>`) — they produce unreadable error messages and hurt IDE support
- When a plain interface or type alias solves the problem with zero loss of information

---

## Core Workflow

1. **Identify the invariant across varying shapes** — Determine what property or behavior is common across all types you want to parameterize. Is it an `id` field? A `data` payload shape? A method signature pattern?
2. **Declare type parameters with explicit constraints** — Write `<T extends YourConstraint>` so the compiler knows what properties are available. Never use unconstrained `T` when a narrower bound is known. **Checkpoint:** Verify every property accessed on `T` exists in the constraint without using `as any` or `// @ts-ignore`.
3. **Choose between mapped types and conditional types** — Use mapped types when transforming every key of an existing type (`{ [K in keyof T]: ... }`). Use conditional types when branching behavior depends on whether `T` matches a pattern (`T extends U ? X : Y`). **Checkpoint:** If you need to inspect the interior of a complex type (e.g., array element, function argument), use `infer`.
4. **Wire key remapping with template literal types** — When renaming keys or filtering them out, combine `[K in keyof T as K extends Filter ? never : K]` for exclusion, or `` `${Prefix}${K}` `` for prefixing. **Checkpoint:** Test your type against a union to verify distributive behavior if that is the intended outcome.
5. **Validate with concrete instantiations** — Write at least two concrete consumer examples showing the generic resolving correctly, and one example of an invalid instantiation that produces a compile error. **Checkpoint:** Run `tsc --noEmit` and confirm both valid consumers pass and the invalid one fails with a descriptive diagnostic.

---

## Implementation Patterns

### Pattern 1: Type Parameter Declaration & Constraints

Use constrained type parameters to enable property access on generic arguments without type assertions. This is the foundation of all reusable type-safe code in TypeScript.

```typescript
// ❌ BAD — unconstrained T cannot access .id without assertion
function getRecordId<T>(record: T): string {
  return record.id as any // Runtime error if record has no id
}

// ✅ GOOD — constraint guarantees .id exists
interface Identifiable {
  id: string
}

function getRecordId<T extends Identifiable>(record: T): string {
  return record.id // Type-safe, no assertion needed
}

// ❌ BAD — loose constraint using `object` loses all property information
function cloneEntity<T extends object>(entity: T): T {
  const copy = {} as T // "as any" workaround required
  Object.keys(entity).forEach(key => {
    ;(copy as Record<string, unknown>)[key] = (entity as Record<string, unknown>)[key]
  })
  return copy
}

// ✅ GOOD — Record<string, unknown> preserves property types in mapped form
function cloneEntity<T extends Record<string, unknown>>(entity: T): T {
  return structuredClone(entity) // Native deep clone preserves types
}

// Multiple type parameters with cross-parameter constraints
interface RepositoryQuery<Q, R> {
  query: Q
  result: R
}

// ✅ GOOD — constraint links query shape to result shape
function executeQuery<Q extends { table: string }, R>(
  config: RepositoryQuery<Extract<Q, { table: Extract<Q["table"], string>}>, R>
): R {
  // The compiler knows Q.table is a string here
  return {} as R
}

// Default type parameters for ergonomic API design
interface CacheEntry<V = unknown, K extends string = string> {
  key: K
  value: V
  ttlMs?: number
  createdAt: number
}

const stringCache: CacheEntry<string> = {
  key: "config",
  value: "{}",
  createdAt: Date.now()
}
// type is: { key: string, value: string, createdAt: number }
```

### Pattern 2: Conditional Types with `infer`

Conditional types enable branching logic at the type level. The `infer` keyword extracts inner types from complex signatures. They distribute over unions by default when the conditional operates on a naked type parameter.

```typescript
// ❌ BAD — no infer, cannot extract array element type
type OldElementType<T> = T extends Array<any> ? any : never
// Always returns 'any', loses the actual element type information

// ✅ GOOD — infer extracts the precise element type
type ElementType<T> = T extends (infer E)[] ? E : T
// ElementType<string[]>        → string
// ElementType<number[][]>      → number[]
// ElementType<string | number> → string | number

// Nested infer for tuple destructuring
type FirstTupleElement<T extends any[]> = T extends [infer Head, ...any[]] ? Head : never
// FirstTupleElement<[string, number, boolean]> → string
// FirstTupleElement<[]>                         → never

// Infer in function signatures — extract parameter and return types
type ExtractArgs<T> = T extends (...args: infer A) => any ? A : never
type ExtractReturn<T> = T extends (...args: any[]) => infer R ? R : never

interface ApiHandler {
  (req: { url: string; method: string }, ctx: { user?: string }): Promise<{ status: number; body: unknown }>
}

type HandlerArgs = ExtractArgs<ApiHandler>
// type is: [{ url: string; method: string }, { user?: string | undefined }]

type HandlerReturn = ExtractReturn<ApiHandler>
// type is: Promise<{ status: number; body: unknown }>

// Distributive conditional types — unions are mapped element-wise
type IsArray<T> = T extends any[] ? "array" : "not-array"
// IsArray<string[]>              → "array"
// IsArray<number[]>              → "array"
// IsArray<string[]> | IsArray<string> → "array" | "not-array"  (union expanded)

// Non-distributive by wrapping in tuple
type NonDistributiveIsArray<T> = [T] extends [any[]] ? "array" : "not-array"
// NonDistributiveIsArray<string[] | number[]> → "array" (single result, no distribution)

// Building Extract and Exclude from scratch
type MyExtract<T, U> = T extends U ? T : never
type MyExclude<T, U> = T extends U ? never : T

declare function pickFrom<T, U extends T>(arr: T[], filter: U): Exclude<T, U>[]
const nums = [1, 2, 3, "a", "b"] as const
// pickFrom(nums, 1) → number[] (1 is excluded from the result type)

// Infer with multiple parameters — extracting return type from a callback
type CallbackHandler<T> = T extends { onSuccess: (...args: infer A) => infer R } ? { args: A; result: R } : never

interface PaymentSuccess {
  amount: number
  currency: string
}

interface PaymentCallback {
  onSuccess: (data: PaymentSuccess, metadata: Record<string, unknown>) => void
}

type PaymentResult = CallbackHandler<PaymentCallback>
// type is: { args: [PaymentSuccess, Record<string, unknown>]; result: void }
```

### Pattern 3: Mapped Types & Key Remapping

Mapped types transform every property of an existing type. Combined with `keyof` and key remapping (`as`), they enable custom utility types that go beyond the built-in helpers.

```typescript
// ❌ BAD — manually writing out a modified copy of a type
interface User { id: string; name: string; email: string; role: string }
type UserSummary = { id: string; name: string; email: string }
// Fragile: breaks when User gains or loses properties

// ✅ GOOD — mapped type with key filtering via conditional remapping
type UserSummary<T extends { id: string; name: string }> = {
  [K in keyof T as K extends "id" | "name" ? K : never]: T[K]
}
// UserSummary<User> → { id: string; name: string }

// Generic Pick-like utility with custom exclusions
type Omit<T, K extends keyof T> = {
  [P in keyof T as P extends K ? never : P]: T[P]
}

interface Config { host: string; port: number; debug: boolean; timeout: number }
type SafeConfig = Omit<Config, "debug">
// type is: { host: string; port: number; timeout: number }

// Optional/required modifiers with mapped types
type PartialDeep<T> = {
  [P in keyof T]?: T[P] extends object ? PartialDeep<T[P]> : T[P]
}

interface NestedConfig {
  database: { host: string; port: number }
  cache: { enabled: boolean; ttlMs: number }
}

const partialConf: PartialDeep<NestedConfig> = {
  database: { host: "localhost" }
  // cache is fully optional, and so are all nested properties
}

// Key remapping with template literal prefixes
type WithPrefix<T, Prefix extends string> = {
  [K in keyof T as `${Prefix}${Extract<K, string>}`]: T[K]
}

interface RouteConfig { get: string; post: string; put: string }
type ApiRouteNames = WithPrefix<RouteConfig, "/api/">
// type is: { "/api/get": string; "/api/post": string; "/api/put": string }

// Removing optional modifiers (Required-like behavior)
type RequiredDeep<T> = {
  -readonly [P in keyof T]-?: T[P] extends object ? RequiredDeep<T[P]> : T[P]
}

type MutableNested = RequiredDeep<Partial<NestedConfig>>
// All properties required, all readonly removed, recursively

// Building Pick from mapped types (not using built-in Pick)
type MyPick<T, K extends keyof T> = {
  [P in K]: T[P]
}
// This is how the built-in Pick is actually defined internally
interface Product { sku: string; price: number; description: string; weight: number }
type MinimalProduct = MyPick<Product, "sku" | "price">
```

### Pattern 4: Template Literal Types

Template literal types compute string literals at compile time. They expand over union types automatically, making them ideal for event handler maps, route definitions, and API path builders.

```typescript
// ❌ BAD — manually listing every possible event name
type LegacyEventMap = {
  onClick: () => void
  onFocus: () => void
  onBlur: () => void
  // Must update this list every time a new event is added
}

// ✅ GOOD — template literal computes all on + event name combinations at compile time
type EventName = `on${Capitalize<string>}`
// Expands to: "onClick" | "onFocus" | "onBlur" | ... (all possible combos)

type EventHandlerMap = {
  [K in EventName]: () => void
}

// Capitalize and lowercase utilities for type-level string manipulation
type MyCapitalize<S extends string> = S extends `${infer First}${infer Rest}`
  ? `${Uppercase<First>}${Rest}`
  : S

type MyLowercase<S extends string> = S extends `${infer First}${infer Rest}`
  ? `${Lowercase<First>}${Rest}`
  : S

// ✅ GOOD — type-safe route builder from path segments
type RoutePath = `/${string}/${string}`
// Valid: "/users/list", "/api/v1/status"
// Invalid: "no-slash", "two/slashes/extra" — compile error

// Combining with conditional types for typed event handlers
interface EventHandlerDef<E extends string> {
  eventName: E
  payload: unknown
}

type RegisterEvent<
  E extends string,
  P = unknown
> = { [K in E]: (payload: P) => void }

type ClickEvent = RegisterEvent<"onClick", { x: number; y: number }>
// type is: { onClick: (payload: { x: number; y: number }) => void }

// Union expansion with template literal types — generates all combos at compile time
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE"
type HttpHeader = "Authorization" | "Content-Type" | "Accept"

type HeaderWithMethod = `${HttpMethod}-${HttpHeader}`
// Expands to: 12 combinations (4 × 3)
// "GET-Authorization" | "GET-Content-Type" | ... | "DELETE-Accept"

// Type-safe API endpoint builder
type ApiVersion = "v1" | "v2"
type ResourceType = "users" | "orders" | "products"

type ApiEndpoint = `/api/${ApiVersion}/${ResourceType}`
// Valid: "/api/v1/users" | "/api/v2/orders" | ... (6 endpoints)

// Constraining a handler to only known event types
interface EventRegistry {
  click: { x: number; y: number }
  submit: { formData: Record<string, string> }
  resize: { width: number; height: number }
}

type EventPayload<E extends keyof EventRegistry> = EventRegistry[E]

declare function on<E extends keyof EventRegistry>(
  event: E,
  handler: (payload: EventPayload<E>) => void
): void

on("click", (payload) => {
  // payload has type { x: number; y: number } — fully typed
  console.log(`Clicked at ${payload.x}, ${payload.y}`)
})

// ❌ BAD — runtime error, not caught by compiler if not constrained properly
// on("unknown_event", handler)  ← This would fail with E extends keyof EventRegistry
```

### Pattern 5: Generic Classes & Constrained Generics in Classes

Generic classes enable type-safe container patterns, repositories, and factories. Static methods on generic classes need their own type parameters to avoid inheriting the class's unresolved `T`.

```typescript
// ✅ GOOD — basic generic repository pattern with constraint
interface Entity { id: string }

class Repository<T extends Entity> {
  private store: Map<string, T> = new Map()

  add(entity: T): void {
    this.store.set(entity.id, entity)
  }

  findById(id: string): T | undefined {
    return this.store.get(id)
  }

  findAll(): readonly T[] {
    return Array.from(this.store.values())
  }

  deleteById(id: string): boolean {
    return this.store.delete(id)
  }
}

class UserRepository extends Repository<{ id: string; name: string; email: string }> {
  findByEmail(email: string): T | undefined {
    // T here is the constrained type from Repository
    return Array.from(this.store.values()).find(u => u.email === email)
  }
}

// Static methods need their own type parameters
class Result<T> {
  private constructor(
    private readonly value: T,
    private readonly error?: string
  ) {}

  static ok<U>(value: U): Result<U> {
    return new Result(value)
  }

  static err<E extends string>(error: E): Result<never> {
    return new Result(undefined as unknown as never, error)
  }

  isSuccess(): this is Result<T> & { value: T } {
    return !this.error
  }

  get valueOrThrow(): T {
    if (this.error) throw new Error(this.error)
    return this.value
  }
}

const success = Result.ok({ id: "1", name: "Alice" })
// TypeScript narrows: this is Result<{ id: string; name: string }> & { value: { id: string; name: string } }

if (success.isSuccess()) {
  // Inside the if block, 'value' is known to exist
  console.log(success.value.name) // Type-safe access
}

// Factory pattern with generic type parameters
class DataLoader<T extends Entity> {
  constructor(private repo: Repository<T>) {}

  loadWithDefaults(defaults: Partial<T>): T[] {
    return this.repo.findAll().map(entity => ({ ...defaults, ...entity }))
  }
}

// Generic constrained by union — enforces exhaustive handling
type SortDirection = "asc" | "desc"

function applySort<T extends Record<string, unknown>>(
  items: T[],
  field: keyof T,
  direction: SortDirection
): T[] {
  return [...items].sort((a, b) => {
    const aVal = a[field]
    const bVal = b[field]
    if (typeof aVal === "string" && typeof bVal === "string") {
      return direction === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    }
    return direction === "asc"
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number)
  })
}

// Type narrowing inside class methods using type predicates
class Box<T> {
  constructor(private value: T | null = null) {}

  isFilled(): this is Box<NonNullable<T>> {
    return this.value !== null
  }

  map<U>(fn: (v: NonNullable<T>) => U): Box<U> {
    if (!this.isFilled()) return new Box<U>()
    return new Box(fn(this.value))
  }

  flatMap<U>(fn: (v: NonNullable<T>) => Box<U>): Box<U> {
    if (!this.isFilled()) return new Box<U>()
    return fn(this.value)
  }
}

const emptyBox = new Box<string | null>(null)
const filledBox = new Box<string | null>("hello")

filledBox.map(v => v.toUpperCase()) // Box<string>
emptyBox.flatMap(_ => new Box(42))   // Box<number>
```

### Pattern 6: Advanced Patterns — Recursive Conditional Types & Utility Construction

Recursive conditional types handle arbitrarily nested structures. They require a base case to prevent infinite expansion, and the recursion must terminate on non-object types or primitive values.

```typescript
// DeepReadonly: recursively freezes all properties including nested objects
type DeepReadonly<T> = T extends object
  ? { readonly [P in keyof T]: DeepReadonly<T[P]> }
  : T

interface MutableConfig {
  database: { host: string; port: number; credentials: { user: string; password: string } }
  features: { darkMode: boolean; betaAccess?: boolean }
}

type ReadonlyConfig = DeepReadonly<MutableConfig>
// All properties at all nesting levels are readonly
// Attempting `config.database.host = "new"` produces a compile error

// DeepPartial from scratch (not using built-in Partial)
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object
    ? DeepPartial<T[P]>
    : T[P]
}

const minimalConfig: DeepPartial<MutableConfig> = {
  database: { credentials: { user: "admin" } }
  // Only need to specify the nested properties you want to override
}

// Building Pick and Omit from scratch using mapped + conditional types
type MyPick<T, K extends keyof T> = {
  [P in K as P]: T[P]
}

type MyOmit<T, K extends keyof T> = {
  [P in keyof T as P extends K ? never : P]: T[P]
}

// Extract and Exclude built from conditional types (these match the built-in utilities exactly)
type MyExtract<T, U> = T extends U ? T : never
type MyExclude<T, U> = T extends U ? never : T

declare const allTypes: "A" | "B" | "C" | "D"
type Filtered = MyExtract<typeof allTypes, "A" | "B">
// type is: "A" | "B"

// DeepRequired: opposite of DeepPartial — makes every nested property required
type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends undefined
    ? T[P]
    : T[P] extends object
      ? DeepRequired<Exclude<T[P], undefined>>
      : T[P]
}

// Utility: Extract function parameter types from an array of handler signatures
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never

type FlattenTypes<T extends any[]> = UnionToIntersection<T[number]>
// Converts a union type into an intersection, useful for merging overlapping shapes

// Practical example: typed middleware pipeline
type Middleware<Payload, Context> = (
  payload: Payload,
  ctx: Context
) => Context | Promise<Context>

class Pipeline<Payload, Context> {
  private handlers: Middleware<Payload, Context>[] = []

  use(middleware: Middleware<Payload, Context>): this {
    this.handlers.push(middleware)
    return this
  }

  async execute(payload: Payload, initialCtx: Context): Promise<Context> {
    let ctx = initialCtx
    for (const handler of this.handlers) {
      ctx = await handler(payload, ctx)
    }
    return ctx
  }
}

// Type-safe route handler registry using template literal types and conditional types
type RouteMethod = "get" | "post" | "put" | "delete"
type PathSegment = string

interface RouteRegistry {
  get: (path: `/${PathSegment}`, handler: () => unknown) => void
  post: (path: `/${PathSegment}`, handler: (body: unknown) => unknown) => void
}

// Constrained generic to enforce method-path combination validity
type RegisterRoute<Method extends RouteMethod, Path extends string> = {
  [K in Method]: (path: Path, handler: (...args: any[]) => unknown) => void
}[Method]
```

---

## Constraints

### MUST DO
- Always constrain type parameters with `<T extends Constraint>` when accessing properties on `T` — never use bare `T` for property access
- Use `infer` in nested positions inside conditional types to extract inner types from array, tuple, function, or promise signatures
- Test mapped type remapping patterns against union inputs to verify distributive vs non-distributive behavior matches intent
- Write at least two concrete consumer examples validating that the generic resolves correctly for different input shapes
- Use `-readonly` and `?`/`-?` modifiers explicitly in mapped types when building Partial, Required, or Readonly utilities
- Prefer explicit constraint over implicit `object` or `any` — `Record<string, unknown>` preserves more type information than bare `object`

### MUST NOT DO
- Chain more than 3 levels of generic nesting (`GenericA<GenericB<GenericC<GenericType>>>`) — it destroys IDE support and error message clarity
- Use `as any`, `as never`, or `// @ts-ignore` to work around type constraints — refactor the constraint instead
- Build conditional types that distribute over unions when you intend a single result — wrap the naked parameter in a tuple `[T] extends [U]` to suppress distribution
- Mix runtime type checks (`typeof x === "string"`) with type-level computation expecting them to flow into generics — TypeScript types do not flow from runtime values
- Use template literal types for arbitrary string matching — they compute all union combinations at compile time and can cause exponential expansion with large unions
- Implement utility types like `Partial`, `Pick`, or `Omit` from scratch in application code — use the built-in utilities unless you need custom filtering logic

---

## Output Template

When generating TypeScript generics-based code, produce:

1. **Constraint definition** — The base interface/type that all generic arguments must satisfy
2. **Generic declaration** — Function or class signature with explicit type parameters and constraints
3. **Implementation body** — Code that operates on `T` using only properties defined in the constraint
4. **Consumer examples** — At least two concrete instantiations showing correct type resolution, plus one invalid instantiation demonstrating the compile error
5. **Type verification comment** — A JSDoc `@type` comment or explicit `type __Check = ...` assertion confirming the resolved generic type

---

## Related Skills

| Skill | Purpose |
|---|---|
| `typescript-intersection-types` | Combines with generics to create complex composite types (intersection + union inside generics) |
| `type-safety-enforcement` | Runtime validation complement — uses zod/io-ts alongside compile-time generic constraints |

> 📖 skill(local cache): typescript-generics-types
