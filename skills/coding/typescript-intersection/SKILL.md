---
name: typescript-intersection
description: Composes TypeScript types using the & intersection operator, combining interfaces, utility types, and object shapes while managing type compatibility, variance, and never-type pitfalls.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: typescript intersection, & type operator, intersection types, TypeScript type composition, never type conflict, TypeScript extends vs intersection, combining types
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: typescript-utility-types, typescript-generics, typescript-pattern-matching
  archetypes:
    - tactical
    - generation
  anti_triggers:
    - brainstorming
    - vague ideation
    - code golf
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
---

# TypeScript Intersection Type Patterns

Composes and combines TypeScript types using the `&` intersection operator to create unified types from orthogonal concerns. When loaded, this skill makes the model design type-safe compositions — merging configuration defaults with user overrides, enriching event types with handler metadata, combining trait interfaces for rich domain models, and avoiding silent `never` type production that causes runtime failures.

## TL;DR Checklist

- [ ] Use `&` only for orthogonal/unrelated type concerns — prefer `extends` for subtyping relationships
- [ ] Verify no property conflicts would produce `never` types in the intersection
- [ ] Prefer union `|` for mutually exclusive alternatives, not intersection `&`
- [ ] Check `readonly` and optional property interactions before combining types
- [ ] Limit intersection depth to 2–3 levels maximum — create intermediate type aliases for readability

---

## When to Use

Use this skill when:

- Combining unrelated type traits into a richer composite (e.g., `Auditable & Editable & Serializable = FullRecord`)
- Merging configuration objects where defaults are combined with user-supplied partial overrides
- Composing event handler signatures that add metadata or context to existing event types
- Building enriched return types from utility functions that wrap, transform, or augment domain data
- Creating DTOs (Data Transfer Objects) that aggregate multiple source interfaces into a single response shape

## When NOT to Use

Avoid this skill for:

- Subtyping relationships where one type is a specialization of another — use `interface X extends Y` instead
- Mutually exclusive alternatives — use union `|` (`string | number`, not `string & number`)
- Combining more than 3–4 types in a single intersection — the resulting type becomes unreadable and hard to debug
- Intersecting types with known property name conflicts (same key, incompatible required types) — this silently produces `never`

---

## Core Workflow

1. **Determine Relationship Between Types** — Classify whether the relationship is subtyping (is-a) or orthogonal composition (has-traits-of). Use `extends` for inheritance chains and `&` for independent trait composition.
   ```typescript
   // ✅ Subtyping: AdminUser IS-A ExtendedUser which IS-A BaseUser
   interface BaseUser { id: string; name: string; email: string; }
   interface ExtendedUser extends BaseUser { role: 'admin' | 'user'; permissions: string[]; }

   // ✅ Composition: FullRecord HAS BOTH auditing and editing traits independently
   interface Auditable { createdAt: Date; createdBy: string; }
   interface Editable { updatedAt?: Date; updatedBy?: string; }
   type FullRecord = Auditable & Editable;
   // Result: { createdAt: Date; createdBy: string; updatedAt?: Date; updatedBy?: string }

   // ✅ Composition: Serializable has nothing to do with Auditable or Editable
   interface Serializable { toJSON(): string; fromJSON(json: string): void; }
   type PersistentRecord = FullRecord & Serializable;
   ```
   **Checkpoint:** Ask "Does type B inherit from type A, or does the result need traits from both independently?" If independent — use `&`. If specialization — use `extends`.

2. **Validate Property Compatibility** — Check each property across all participating types. The TypeScript compiler silently produces `never` when required properties with incompatible types intersect:
   ```typescript
   // ✅ Compatible: same name + compatible types → result has the unified type
   type A = { id: string; status: 'active' | 'inactive'; };
   type B = { id: string; priority: number };
   type Combined1 = A & B;
   // Result: { id: string; status: 'active' | 'inactive'; priority: number }

   // ❌ Conflict: same required property with incompatible primitive types → never
   type Bad = { x: string } & { x: number };
   // Result: { x: never } — compiles but is impossible to construct!

   // ✅ Optional + Required conflict: required type wins, no never produced
   type Safe1 = { x: string } & { x?: number };
   // Result: { x: string } — the required `string` satisfies the optional `number` too

   // ❌ Readonly + mutable conflict with incompatible types → readonly never
   type Bad2 = { x: string } & { readonly x: number };
   // Result: { readonly x: never } — most dangerous pattern!
   ```
   **Checkpoint:** Run `tsc --noEmit` and inspect inferred types using IDE hover or `type X = ...` exploration in a `.ts` file. Hover over the type alias to verify no hidden `never` appears.

3. **Compose Using Intersection** — Apply the `&` operator with compatible types. For configuration merging patterns, intersect concrete defaults with `Partial<UserConfig>`:
   ```typescript
   interface DefaultConfig {
     timeout: number;
     retries: number;
     debug: boolean;
     logLevel: 'info' | 'warn' | 'error';
     maxConnections: number;
   }

   interface UserConfig {
     timeout?: number;
     apiKey?: string;
     debug?: false;
     customTimeoutBehavior?: 'retry' | 'fail-fast';
   }

   // Combine defaults with user-supplied partial config via intersection
   type AppConfig = DefaultConfig & Partial<UserConfig>;

   function createAppConfig(overrides: UserConfig): AppConfig {
     const defaults: DefaultConfig = {
       timeout: 30,
       retries: 3,
       debug: false,
       logLevel: 'info',
       maxConnections: 100,
     };

     // Build final config: spread defaults, then apply defined overrides
     const entries = Object.entries(overrides).filter(([, v]) => v !== undefined);
     const userPart = Object.fromEntries(entries) as Partial<UserConfig>;

     return {
       ...defaults,
       ...userPart,
     } as AppConfig;
   }

   // Usage — type-safe overrides enforced by the compiler
   const config: AppConfig = createAppConfig({
     timeout: 60,           // overrides default 30
     apiKey: "secret-key",  // adds new property from UserConfig
     debug: false,          // explicit override of boolean default
   });
   // config has ALL properties: { timeout: 60, retries: 3, debug: false, logLevel: 'info',
   //                              maxConnections: 100, apiKey: "secret-key" }
   ```
   **Checkpoint:** Verify the combined type signature matches your mental model. Use `type Keys = keyof AppConfig;` and inspect — every property from both sides should appear.

4. **Handle Readonly and Variance Interactions** — Check how readonly modifiers interact across intersection members. A readonly property from one side carries through even if another side declares it mutable. Combine this with type conflicts for the most dangerous `never` pattern:
   ```typescript
   interface MutableProp { x: number; }
   interface ReadOnlyProp { readonly x: string; }

   // ❌ DANGEROUS — Readonly wins AND types conflict → readonly never (deadlock)
   type Deadlock = MutableProp & ReadOnlyProp;
   // Result: { readonly x: never } — compiles successfully but CANNOT be instantiated!

   // ✅ GOOD — Ensure property names do not overlap between mutable/readonly interfaces
   interface Auditable {
     readonly createdAt: Date;
     createdBy: string;
   }
   interface Editable {
     updatedAt?: Date;
     updatedBy?: string;
   }
   type FullRecord = Auditable & Editable;
   // Result: { readonly createdAt: Date; createdBy: string; updatedAt?: Date; updatedBy?: string }
   // ✅ No conflicts — different property names, no never produced

   // ✅ GOOD — Explicitly annotate mutability when combining
   interface ReadOnlyConfig {
     readonly version: number;
     readonly buildId: string;
   }
   interface WritableDefaults {
     timeout: number;
     debug: boolean;
   }
   type StableConfig = ReadOnlyConfig & WritableDefaults;
   // Result: { readonly version: number; readonly buildId: string; timeout: number; debug: boolean }
   ```

---

## Implementation Patterns

### Pattern 1: Configuration Merge (Defaults + Partial Overrides)

```typescript
interface DefaultOptions {
  retryCount: number;
  timeoutMs: number;
  loggingLevel: 'info' | 'warn' | 'error';
  maxRetries: number;
  sslEnabled: boolean;
}

interface UserOptions {
  retryCount?: number;
  timeoutMs?: number;
  loggingLevel?: 'debug' | 'info' | 'warn' | 'error';
  customHeader?: string;
  sslEnabled?: boolean;
}

// Intersection of concrete defaults with partial user config
type ResolvedOptions = DefaultOptions & Partial<UserOptions>;

function resolveUserOptions(userOpts: UserOptions): ResolvedOptions {
  const defaults: DefaultOptions = {
    retryCount: 3,
    timeoutMs: 5000,
    loggingLevel: 'info',
    maxRetries: 5,
    sslEnabled: true,
  };

  // Extract only defined values from user config to avoid overwriting with undefined
  const validEntries = Object.entries(userOpts).filter(([, v]) => v !== undefined);
  const userPart = Object.fromEntries(validEntries) as Partial<UserOptions>;

  return { ...defaults, ...userPart };
}

// Type-safe usage — compiler enforces only known keys are accepted
const opts = resolveUserOptions({
  retryCount: 5,                      // overrides default 3
  customHeader: 'x-api-key',          // adds new property from UserOptions
  loggingLevel: 'debug',              // uses extended union type
});
// Inferred ResolvedOptions: { retryCount: 5, timeoutMs: 5000, loggingLevel: 'debug',
//                              maxRetries: 5, sslEnabled: true, customHeader: 'x-api-key' }
```

### Pattern 2: Event Handler Composition with Enrichment

```typescript
// Base event structure used across the application
interface BaseEvent {
  id: string;
  timestamp: number;
  source: string;
  metadata: Record<string, unknown>;
}

// Mouse-specific event — extends base with mouse properties
interface MouseEvent extends BaseEvent {
  type: 'click' | 'dblclick' | 'contextmenu';
  x: number;
  y: number;
  button: 0 | 1 | 2;
  ctrlKey: boolean;
}

// Keyboard-specific event — extends base with keyboard properties
interface KeyboardEvent extends BaseEvent {
  type: 'keydown' | 'keyup' | 'keypress';
  key: string;
  code: string;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}

// Handler metadata — orthogonal trait, unrelated to event specifics
type EnrichedEvent = BaseEvent & {
  handlerName: string;
  processedAt: number;
  processingDurationMs: number;
};

function wrapMouseEvent(event: MouseEvent): EnrichedEvent {
  return {
    ...event,
    handlerName: 'gesture-handler',
    processedAt: Date.now(),
    processingDurationMs: 0, // populated after processing
  };
}

function wrapKeyboardEvent(event: KeyboardEvent): EnrichedEvent {
  const start = Date.now();
  const enriched: EnrichedEvent = {
    ...event,
    handlerName: 'input-handler',
    processedAt: start,
    processingDurationMs: 0,
  };
  // Access both base and keyboard-specific properties safely
  if (enriched.shiftKey || enriched.altKey || enriched.metaKey) {
    enriched.metadata.modifiers = [
      enriched.shiftKey && 'shift',
      enriched.altKey && 'alt',
      enriched.metaKey && 'meta',
    ].filter(Boolean) as string[];
  }
  enriched.processingDurationMs = Date.now() - start;
  return enriched;
}

// Generic dispatch — works with ANY EnrichedEvent regardless of base type
function dispatchEnriched(event: EnrichedEvent): void {
  console.log(
    `[${event.handlerName}] ${event.id} @ ${new Date(event.timestamp).toISOString()}` +
    ` (${event.processingDurationMs}ms)`
  );
}

// Type inference preserves all properties — no casting needed
const mouseEnriched = wrapMouseEvent({
  id: 'evt-001',
  timestamp: Date.now(),
  source: 'canvas',
  metadata: {},
  type: 'click',
  x: 120,
  y: 340,
  button: 0,
  ctrlKey: false,
});
dispatchEnriched(mouseEnriched); // ✅ Full type safety
```

### Pattern 3: Interface Extension vs Intersection (BAD vs GOOD)

```typescript
// ❌ BAD — Using & for subtyping creates confusing and inconsistent relationships
interface Animal { name: string; }
type Dog = Animal & { bark(): void };        // Dog "is-a" Animal but uses &? Confusing.
type Cat = Animal & { meow(): void };         // Inconsistent with extends pattern elsewhere

// ❌ BAD — Deep intersection chains are unreadable and hard to debug
type A = { a: string };
type B = { b: number };
type C = { c: boolean };
type D = { d: Date };
type E = { e: string[] };
type F = { f: Record<string, unknown> };
type SuperType = A & B & C & D & E & F;     // Which properties come from where? Nightmare.

// ✅ GOOD — Use interface extension for true subtyping relationships
interface Animal { name: string; }
interface Dog extends Animal { bark(): void; }
interface Cat extends Animal { meow(): void; }

// ✅ GOOD — Create intermediate type aliases for readability
type CoreFeatures = A & B & C;              // First grouping of related traits
type ExtendedFeatures = CoreFeatures & D & E; // Add more traits incrementally
type FinalType = ExtendedFeatures & F;        // Clear hierarchy of composition
```

### Pattern 4: Discriminated Union with Intersection (Advanced)

```typescript
// Combining discriminated unions with intersection for rich type-safe patterns
type ActionKind = 'create' | 'update' | 'delete';

interface CreatePayload {
  kind: 'create';
  data: Record<string, unknown>;
}

interface UpdatePayload {
  kind: 'update';
  id: string;
  data: Partial<Record<string, unknown>>;
}

interface DeletePayload {
  kind: 'delete';
  id: string;
  softDelete?: boolean;
}

// Intersection with discriminated union — powerful composition pattern
type Action = BaseEvent & (CreatePayload | UpdatePayload | DeletePayload);

function processAction(action: Action): string {
  switch (action.kind) {
    case 'create':
      // TypeScript narrows: action has data, kind === 'create'
      return `Created entity with ${Object.keys(action.data).length} fields`;
    case 'update':
      // TypeScript narrows: action has id and partial data
      return `Updated entity ${action.id} with ${Object.keys(action.data).length} changes`;
    case 'delete':
      // TypeScript narrows: action has id, optional softDelete
      const method = action.softDelete ? 'soft delete' : 'hard delete';
      return `${method} entity ${action.id}`;
  }
}

// Usage — full type safety with discriminator narrowing
const createAction: Action = {
  id: 'act-001',
  timestamp: Date.now(),
  source: 'api',
  metadata: {},
  kind: 'create',
  data: { name: 'new-resource', tags: ['production'] },
};

processAction(createAction); // ✅ TypeScript knows action.data exists here
```

---

## Constraints

### MUST DO
- Always verify property compatibility before combining types with `&` — conflicting required properties silently produce `never` which compiles but fails at runtime
- Use interface `extends` for subtyping (is-a relationships) and intersection `&` for orthogonal composition (has-traits-of)
- Add JSDoc comments explaining why a particular type was composed via intersection, especially when spanning 3+ types or using advanced patterns
- Test inferred types with TypeScript IDE hover / Go-to-Definition to catch silent `never` production before it reaches production
- Use `Partial<T>` on user-facing config interfaces to prevent conflicts with required default properties

### MUST NOT DO
- Use `&` for mutually exclusive alternatives — use union `|` instead (e.g., `'open' | 'closed'`, never `'open' & 'closed'`)
- Create intersection chains deeper than 3 levels without intermediate type aliases (`type Step1 = A & B; type Step2 = Step1 & C;`)
- Combine types with known property name conflicts (same key, incompatible required types) — this produces `never` silently and is the #1 cause of phantom type errors
- Confuse `&` (intersection/composition) with `extends` (subtype constraint) in function signatures and generic bounds — they have fundamentally different meanings

---

## Common Pitfalls

### Silent never Type Production
```typescript
// ❌ DANGEROUS — Produces { x: never } which compiles but is impossible to instantiate
type NeverTrap = { x: string } & { x: number };
// NeverTrap is a valid type alias, but you CANNOT create an object of this type!
const obj: NeverTrap = { x: "hello" };   // Error: Type 'string' is not assignable to type 'never'

// ✅ GOOD — Use union for mutually exclusive variants instead
type SafeAlternative =
  | { mode: 'text'; value: string }
  | { mode: 'numeric'; value: number };

const textObj: SafeAlternative = { mode: 'text', value: "hello" };   // ✅ Works
const numObj: SafeAlternative = { mode: 'numeric', value: 42 };      // ✅ Works
```

### Optional vs Required Interaction
```typescript
// Optional property does NOT conflict with required — the required type wins cleanly
interface HasOptionalX { x?: string; extra: boolean; }
interface HasRequiredX { x: number; other: string; }

type Combined = HasOptionalX & HasRequiredX;
// Result: { x: number; extra: boolean; other: string }
// The required `number` overrides the optional `string` — no conflict, no never!
// This is safe and intentional: the combined type demands a number for `x`.
```

### Readonly Conflicts with Type Mismatch
```typescript
interface MutableProp { value: string; }
interface ReadOnlyProp { readonly value: number; }

type Conflict = MutableProp & ReadOnlyProp;
// Result: { readonly value: never } — both readonly modifier AND type conflict combine
// This is the MOST dangerous pattern because:
// 1. It compiles without errors (no syntax or semantic error)
// 2. You cannot construct any object of this type at runtime
// 3. The `never` may propagate silently to dependent types

// ✅ Mitigation: Use TypeScript's `satisfies` operator or explicit checking
interface SafeMutable { value: number; }     // Make types compatible first
type ConflictFree = SafeMutable & ReadOnlyProp;
// Result: { readonly value: number } — works perfectly!
```

---

## Output Template

When composing types with intersection, produce:

1. **Individual base types** — Show each participating type/interface with its documented purpose and property list
2. **Compatibility analysis** — Note which properties overlap between types and how conflicts (if any) are resolved
3. **Intersection definition** — The `&` composition statement with the full resulting type signature shown as a comment
4. **Instantiation example** — A concrete usage showing the combined type being constructed and accessed, proving all properties are available
5. **Variance check** — Confirm readonly, optional, and generic variance interactions do not produce unexpected `never` types

---

## Live References

- [TypeScript Handbook — Intersection Types](https://www.typescriptlang.org/docs/handbook/2/objects.html#intersection-types)
- [TypeScript Deep Dive — Intersection Types](https://basarat.gitbook.io/typescript/type-system/intersectiontypes)
- [TypeScript GitHub Issues — Intersection Never Type](https://github.com/microsoft/TypeScript/issues/15340)
- [TypeScript Handbook — Type Aliases](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-aliases)
- [TypeScript Deep Dive — Utility Types](https://basarat.gitbook.io/typescript/type-system/utility-types)
- [TypeScript Deep Dive — Discriminated Unions](https://basarat.gitbook.io/typescript/type-system/discriminated-unions)
