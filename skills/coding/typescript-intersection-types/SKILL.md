---
name: typescript-intersection-types
description: Implements TypeScript intersection type patterns (& operator) for merging
  props, mixins, generic constraints, utility types, and discriminated extensions
  with conflict resolution strategies.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: intersection types, ampersand type, type merging, TypeScript & operator,
    props merging, mixin pattern, type conflicts, keyof T & K, generic constraints,
    ComponentProps & custom
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
  related-skills: typescript-utility-types, typescript-generics-patterns, typescript-decorator-patterns
------
# TypeScript Intersection Types

When this skill is active, I act as a senior TypeScript engineer who uses the `&` (intersection) operator to compose types by merging their members. Intersection types create a type that has all properties of each constituent type simultaneously — it is the "AND" of TypeScript's type system, complementary to union types (`|`) which represent "OR". I apply intersections for React props composition, mixin class construction, generic constraint refinement, utility type building, and discriminated extension patterns, always considering how TypeScript resolves property conflicts between intersected types.

## TL;DR Checklist

- [ ] Use `&` when you need a type with ALL members from each constituent type
- [ ] Use `|` (union) instead when any one member from each type suffices
- [ ] When two intersected types have the same property with different types, expect `never` for incompatible primitives or intersection of the types for compatible ones
- [ ] Function intersections create overload-like behavior — calling code must satisfy all signatures
- [ ] Prefer `T extends A & B` over `T extends A` when you need both constraints simultaneously
- [ ] Use `keyof T & K` pattern internally in utility types to filter keys safely
- [ ] Avoid deep nesting of intersections (`A & B & C & D`) — use type aliases for readability

---

## When to Use

Use this skill when:

- Composing React component props by intersecting built-in component props (e.g., `ComponentProps<'div'> & { customProp: string }`)
- Building mixin patterns where you combine behaviors from multiple interfaces or classes
- Constraining generic parameters to satisfy multiple type requirements simultaneously (`T extends BaseInterface & { id: string }`)
- Implementing discriminated unions that extend a base type with variant-specific fields
- Constructing utility types internally (filtering keys, merging configs)
- Merging configuration objects where each source contributes different required properties

---

## When NOT to Use

Avoid this skill for:

- **When you want "either/or" semantics** — use union types (`|`) instead. `A | B` means the value conforms to at least one of A or B, whereas `A & B` requires both.
- **When property conflicts produce `never` unexpectedly** — if two types have the same string-keyed property with incompatible literal types (e.g., `"red" & "blue"`), the result is `never`. Use a union in these cases.
- **When you only need optional property extension** — use intersection to add, but be aware that required properties from both sides must be satisfied. Consider interface `extends` for class-level composition.
- **As a replacement for generics or inheritance** — intersections compose types at the type level without establishing runtime relationships. Use class inheritance or interfaces with `extends` when you need structural relationships.

---

## Core Workflow

### Step 1: Determine Intersection vs Union

Decide whether you need all members (`&`) or any member (`|`). Ask: "Does the resulting value need to satisfy both types simultaneously?" If yes, use intersection.

```typescript
// Need both — intersection
type AdminUser = User & { role: "admin"; permissions: string[] };
// Value must have name AND role AND permissions

// Need either — union
type Input = string | number;
// Value can be string OR number
```

**Checkpoint:** The value you produce must be assignable to BOTH constituent types independently. If it cannot satisfy both, intersection is wrong.

### Step 2: Identify Property Merging Strategy

When intersecting types that share property names, TypeScript resolves them according to these rules:
- Same key, same type → single merged property
- Same key, compatible types (e.g., both string) → union of types (`A & B` where A and B are subtypes)
- Same key, incompatible primitives → `never`
- Same key, function types → intersection (must satisfy both call signatures)

**Checkpoint:** Map every property name across all constituent types. Identify conflicts before constructing the intersection to avoid accidental `never` types.

### Step 3: Construct the Intersection

Build the intersection type using the `&` operator between two or more types. Use parenthesized groupings for clarity when combining three or more types.

```typescript
// Two-type intersection (most common)
type ExtendedConfig = BaseConfig & DeepPartial<BaseConfig>;

// Multi-type intersection (use parentheses for readability)
type RichComponent = 
  & React.HTMLAttributes<HTMLDivElement>
  & { customProp: string }
  & DataAttrs;
```

**Checkpoint:** Verify each constituent type contributes unique required properties. If a property is already declared in an earlier constituent, later declarations must be compatible.

### Step 4: Validate Assignability and Usage

Test that values of the intersection type are assignable to each component type and that operations on the merged type work as expected. Use `keyof` to inspect the resulting keys.

```typescript
type Merged = { a: string } & { b: number };

// This works — has both a and b
const valid: Merged = { a: "hello", b: 42 };

// This fails — missing required 'b'
const invalid: Merged = { a: "hello" }; // Error
```

**Checkpoint:** The constructed type must be assignable to each constituent. Run `tsc --noEmit` or equivalent to verify no unexpected type errors appear in usage sites.

### Step 5: Handle Function and Index Signature Intersections

When intersecting function types, the result requires satisfying all call signatures (overload-like). When intersecting object types with index signatures, the index signature types are intersected.

**Checkpoint:** For function intersections, verify that callers can invoke any of the overloaded signatures. For index signatures, ensure the resulting type is not overly restrictive.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Basic Type Merging — React Props Composition

The most common use case: extending built-in component props with custom properties using `ComponentProps` from React. This pattern eliminates manual prop copying and keeps types in sync with framework updates.

```typescript
import type { ComponentProps } from "react";

/**
 * Composes a button component that accepts all standard <button> props
 * plus a required icon name for visual decoration.
 */
type IconButtonProps = ComponentProps<"button"> & {
  /** Name of the icon to render before the label */
  iconName: string;
  /** Controls whether the icon is animated on hover */
  animateIcon?: "none" | "pulse" | "spin";
};

/**
 * Renders an IconButton that accepts all native button props
 * plus custom icon-related properties.
 */
function IconButton(props: IconButtonProps): React.ReactElement {
  const { iconName, animateIcon = "none", ...rest } = props;

  return (
    <button {...rest}>
      <span className={`icon-${animateIcon}`}>{iconName}</span>
      {rest.children}
    </button>
  );
}

// Usage — all standard button props are available AND iconName is required
<IconButton iconName="search" onClick={handleSearch} disabled={false}>
  Search
</IconButton>;
```

**Why this works:** `ComponentProps<"button">` resolves to `{ onClick?: MouseEventHandler; disabled?: boolean; type?: ButtonType; ... }`. The intersection adds `iconName` (required) and `animateIcon` (optional). The resulting type requires both the original props and the new ones.

---

### Pattern 2: Mixin Pattern — Composing Class Behaviors

Intersection types implement the mixin pattern by intersecting class types. Each mixin contributes methods/properties that the resulting class inherits. This is TypeScript's idiomatic alternative to multiple inheritance.

```typescript
/**
 * Base entity interface that all mixable entities must satisfy.
 */
interface Entity {
  id: string;
  createdAt: Date;
}

/**
 * Mixin that adds timestamp tracking capabilities.
 * Returns a class expression extending the base.
 */
function TimestampMixin<TBaseClass extends new (...args: never[]) => Entity>(
  Base: TBaseClass,
): new (...args: ConstructorParameters<TBaseClass>) => Entity & { updatedAt: Date } {
  return class extends Base {
    // Track last modification time
    private _updatedAt: Date = new Date();

    /** Returns the most recent update timestamp */
    get updatedAt(): Date {
      return this._updatedAt;
    }

    /** Records a modification and updates the timestamp */
    touch(): void {
      this._updatedAt = new Date();
    }
  };
}

/**
 * Mixin that adds soft-deletion capability.
 */
function SoftDeleteMixin<TBaseClass extends new (...args: never[]) => Entity>(
  Base: TBaseClass,
): new (...args: ConstructorParameters<TBaseClass>) => Entity & { deletedAt: Date | null; isDeleted: () => boolean } {
  return class extends Base {
    private _deletedAt: Date | null = null;

    get deletedAt(): Date | null {
      return this._deletedAt;
    }

    /** Marks the entity as soft-deleted */
    delete(): void {
      this._deletedAt = new Date();
    }

    /** Returns whether the entity has been soft-deleted */
    isDeleted(): boolean {
      return this._deletedAt !== null;
    }
  };
}

// Compose a fully-featured entity using intersection of all mixins
class BaseEntity implements Entity {
  constructor(
    public readonly id: string,
    public readonly createdAt: Date,
  ) {}
}

const TimestampedEntity = TimestampMixin(BaseEntity);
const SoftDeletedEntity = SoftDeleteMixin(TimestampedEntity);

/** Type of the final composed class — has id, createdAt, updatedAt, deletedAt, touch(), isDeleted() */
type FullEntity = InstanceType<typeof SoftDeletedEntity>;

// Usage: the entity has all properties from every mixin layer
const item: FullEntity = new SoftDeletedEntity("entity-1", new Date());
item.touch();
item.delete();
console.log(item.updatedAt); // Date — from TimestampMixin
console.log(item.isDeleted()); // true — from SoftDeleteMixin
```

**Why this works:** Each mixin returns `BaseClass & { additionalProperties }`. Nesting them creates a chain: `(Base & WithTimestamp) & WithSoftDelete`. The final type contains all properties from every layer.

---

### Pattern 3: Generic Constraints with Intersection

Use `T extends A & B` to constrain a generic parameter to satisfy multiple type requirements simultaneously. This is preferable to separate type parameters or complex conditional types.

```typescript
/**
 * Repository interface for entities that have a string ID and a timestamp.
 */
interface TimestampedEntity {
  id: string;
  createdAt: Date;
}

/**
 * Filterable interface — entities that can be filtered by a set of keys.
 */
interface Filterable {
  filters: Map<string, unknown>;
}

/**
 * Generic repository that works with any type satisfying both
 * TimestampedEntity AND Filterable constraints.
 *
 * The intersection constraint T extends TimestampedEntity & Filterable
 * ensures the generic has id, createdAt, and filters properties.
 */
class EntityRepository<T extends TimestampedEntity & Filterable> {
  private readonly store = new Map<string, T>();

  /** Finds an entity by its string ID */
  findById(id: string): T | undefined {
    return this.store.get(id);
  }

  /** Stores or updates an entity */
  save(entity: T): void {
    this.store.set(entity.id, entity);
  }

  /** Returns all entities older than the given threshold */
  findOlderThan(threshold: Date): T[] {
    return Array.from(this.store.values()).filter(
      (entity) => entity.createdAt < threshold && !entity.filters.has("archived"),
    );
  }

  /** Applies a filter and returns matching entities */
  applyFilter<K extends keyof T>(key: K, value: T[K]): T[] {
    return Array.from(this.store.values()).filter(
      (entity) => entity[key] === value,
    );
  }
}

/** Concrete entity that satisfies both constraints */
interface UserRecord extends TimestampedEntity, Filterable {
  username: string;
  email: string;
  role: "admin" | "user";
  filters: Map<string, unknown>; // Required by Filterable
}

const userRepository = new EntityRepository<UserRecord>();
userRepository.save({
  id: "user-1",
  createdAt: new Date("2024-01-01"),
  username: "alice",
  email: "alice@example.com",
  role: "admin",
  filters: new Map(),
});
```

**Why this works:** `T extends A & B` is equivalent to requiring T to satisfy all members of both A and B. TypeScript verifies this at the instantiation site (`EntityRepository<UserRecord>`), ensuring UserRecord has `id`, `createdAt`, and `filters`.

---

### Pattern 4: Utility Type Construction with `keyof T & K`

The `keyof T & K` pattern is the foundation of many utility types. It computes the intersection of keys from type T with a key literal or union K, effectively filtering keys to those that exist on both sides.

```typescript
/**
 * Filters an object type to only include properties whose keys
 * are present in the given key union K.
 * 
 * Uses keyof T & K internally to compute which properties survive.
 */
type PickKeysOf<T extends object, K extends keyof T> = {
  [P in keyof T as P & K]: T[P];
};

/**
 * Omit properties whose keys are NOT in the given key union K.
 * The intersection keyof T & K identifies which keys to keep.
 */
type KeepOnly<T extends object, K extends keyof T> = PickKeysOf<T, K>;

/**
 * RequiredIntersection — merges two types and ensures that any 
 * overlapping property names are present in both (no optional masking).
 */
type RequiredIntersection<A extends object, B extends object> = {
  [K in keyof A | keyof B]: K extends keyof A
    ? K extends keyof B
      ? A[K] & B[K] // Both have this key — intersect the types
      : A[K]          // Only A has this key
    : B[K];           // Only B has this key
};

// --- Usage Examples ---

interface UserBase {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
}

// Keep only displayable fields (excludes password, internal metadata)
type UserProfile = KeepOnly<UserBase, "id" | "name" | "email" | "createdAt">;
// Result: { id: string; name: string; email: string; createdAt: Date }

// Merge user data with preferences — overlapping key 'id' stays as string & string = string
interface UserPreferences {
  id: string;       // Same type as UserBase.id — safe intersection
  theme: "light" | "dark";
  notifications: boolean;
}

type MergedUser = RequiredIntersection<UserBase, UserPreferences>;
// Result: { id: string; name: string; email: string; password: string; createdAt: Date; theme: 'light' | 'dark'; notifications: boolean }
```

**Why this works:** `keyof T & K` computes which keys from K actually exist on T. If K is `"id" | "name"` and T has `{ id, name, email }`, then `keyof T & (K)` produces `"id" | "name"`. Keys not shared are silently excluded.

---

### Pattern 5: Conflict Resolution — Handling Property Name Collisions

When intersected types have properties with the same key but different types, TypeScript resolves them based on compatibility. Understanding these rules prevents accidental `never` types and unexpected type narrowing.

```typescript
// ============================================================
// Scenario A: Compatible property types — union of types
// ============================================================
type BaseConfig = { theme: "light" | "dark" };
type ExtendedConfig = { theme: "light" | "dark" | "auto" };

type MergedConfig = BaseConfig & ExtendedConfig;
// theme is: "light" | "dark"  (intersection of both types)
// The value must satisfy BOTH type constraints simultaneously

// Valid — "light" exists in both sets
const validTheme: MergedConfig = { theme: "light" };

// ❌ Invalid — "auto" is not in BaseConfig's type set
const invalidTheme: MergedConfig = { theme: "auto" }; // Type error!

// ============================================================
// Scenario B: Incompatible literal types — result is 'never'
// ============================================================
type ColorRed = { color: "red" };
type ColorBlue = { color: "blue" };

type ImpossibleColor = ColorRed & ColorBlue;
// color is: "red" & "blue" → never (no value can be both)

// This type alias warns developers: the combination is impossible
type _AssertNever<ImpossibleColor> = never; // Ensures we see the error

// ✅ GOOD: Use union when you want either color
type AnyColor = ColorRed | ColorBlue; // { color: "red" } | { color: "blue" }

// ============================================================
// Scenario C: Function type intersections — overload behavior
// ============================================================
type Printer = {
  print(text: string): void;
};

type Logger = {
  print(level: "info" | "error", text: string): void;
};

// Intersection of function types requires satisfying ALL call signatures
const loggerPrinter: Printer & Logger = {
  // This must accept both (text: string) AND (level: "info" | "error", text: string)
  print(textOrLevel: any, maybeText?: any): void {
    if (typeof textOrLevel === "string" && maybeText === undefined) {
      console.log(`[Printer]: ${textOrLevel}`);
    } else {
      console.log(`[${String(textOrLevel)}]: ${maybeText}`);
    }
  },
};

loggerPrinter.print("hello");                    // Printer signature
loggerPrinter.print("info", "started");         // Logger signature
```

**Why this works:** `A & B` for property types means the value must be assignable to both `A` and `B`. `"red" & "blue"` is `never` because no string literal can equal both simultaneously. Function intersections create an overload-like type where the implementation must handle all signatures.

---

### Pattern 6: Discriminated Extensions — Combining Base with Variant Types

Intersection types compose naturally with discriminated unions to build base-plus-variant type structures commonly used in state machines and event handling.

```typescript
/**
 * Base event that every event in the system shares.
 */
interface BaseEvent {
  id: string;
  timestamp: Date;
  source: string;
}

/**
 * Discriminated union of concrete event variants.
 * Each variant extends BaseEvent AND adds its own payload.
 * The 'kind' field discriminates between variants at runtime.
 */
type SystemEvent =
  | (BaseEvent & { kind: "startup"; version: string; duration: number })
  | (BaseEvent & { kind: "error"; errorCode: number; message: string; stack?: string })
  | (BaseEvent & { kind: "shutdown"; reason: string; gracePeriodMs: number });

/**
 * Processes a system event by first matching on the discriminated 'kind' field.
 * TypeScript narrows the type within each branch automatically.
 */
function handleSystemEvent(event: SystemEvent): string {
  switch (event.kind) {
    case "startup":
      // Narrowed to BaseEvent & { kind: "startup"; version: string; duration: number }
      return `Started v${event.version} in ${event.duration}ms`;

    case "error":
      // Narrowed to BaseEvent & { kind: "error"; errorCode: number; message: string; stack?: string }
      return `[${event.errorCode}] ${event.message}${event.stack ? `\n${event.stack}` : ""}`;

    case "shutdown":
      // Narrowed to BaseEvent & { kind: "shutdown"; reason: string; gracePeriodMs: number }
      return `Shutting down: ${event.reason} (${event.gracePeriodMs}ms grace)`;
  }
}

// All variants share base properties — accessible before narrowing
function logEventHeader(event: SystemEvent): void {
  // event is known to have id, timestamp, source (from BaseEvent) 
  // AND one of the variant fields
  console.log(`[${event.timestamp.toISOString()}] ${event.source}: ${event.kind} (${event.id})`);
}

// Usage with proper type safety
const startupEvent: SystemEvent = {
  id: "evt-001",
  timestamp: new Date(),
  source: "core",
  kind: "startup",
  version: "2.4.1",
  duration: 342,
};

console.log(handleSystemEvent(startupEvent)); // "Started v2.4.1 in 342ms"
```

**Why this works:** Each union member is `BaseEvent & { variantFields }`. Before narrowing, all members share `id`, `timestamp`, and `source` from BaseEvent. After narrowing via `event.kind`, TypeScript knows exactly which variant fields are available.

---

### Pattern 7: Intersection vs Union — Side-by-Side Comparison

Understanding the difference between `&` (intersection) and `|` (union) is critical for correct type design. They are fundamentally different operations with opposite semantics.

```typescript
// ============================================================
// INTERSECTION (&): "I need ALL of these"
// ============================================================
type HasId = { id: string };
type HasName = { name: string };

type UserWithBoth = HasId & HasName;
// Must have BOTH id AND name
const validUser: UserWithBoth = { id: "u1", name: "Alice" }; // ✅ OK
const onlyId: UserWithBoth = { id: "u1" };                     // ❌ Error — missing 'name'
const onlyName: UserWithBoth = { name: "Bob" };                // ❌ Error — missing 'id'

// ============================================================
// UNION (|): "I need ANY ONE of these"
// ============================================================
type WithIdOrName = HasId | HasName;
// Can have id OR name (or both)
const validEitherA: WithIdOrName = { id: "u1" };               // ✅ OK — has id
const validEitherB: WithIdOrName = { name: "Bob" };            // ✅ OK — has name
const validBoth: WithIdOrName = { id: "u1", name: "Alice" };  // ✅ OK — has both (still satisfies both types)

// ============================================================
// KEY DIFFERENCE in practice:
// ============================================================
function processUser(user: HasId & HasName): void {
  // TypeScript knows BOTH properties exist
  console.log(`${user.name} (${user.id})`); // No error — safe access
}

function processEither(entity: HasId | HasName): void {
  // TypeScript does NOT know which property exists — must narrow first
  if ("id" in entity) {
    console.log(entity.id); // OK — narrowed to HasId side
  } else {
    console.log(entity.name); // OK — narrowed to HasName side
  }
}
```

---

## Constraints

### MUST DO
- Verify that every property name across intersected types is compatible before constructing the intersection — check for accidental `never` types from incompatible literal conflicts
- Use `ComponentProps<'element'> & CustomProps` pattern for React component extension instead of manually listing props
- When constraining generics, prefer `T extends A & B` over separate type parameters `T1 extends A, T2 extends B` when the same concrete type should satisfy both constraints
- Document property conflict resolution in comments when intersecting types may have overlapping keys (e.g., "theme property is intersection of light/dark sets")
- Use parenthesized intersections for readability when combining three or more types: `(A & B) & C`
- Test assignability of your intersection type to each constituent type using `satisfies` operator or direct assignment in a test file
- When building utility types, use `keyof T & K` pattern to compute shared keys rather than assuming all keys exist on T

### MUST NOT DO
- Use intersection when union semantics are needed — `A & B` requires both, `A | B` requires one or the other. Confusing them causes subtle type errors at call sites.
- Intersect types with incompatible property types for shared keys (e.g., `{ x: "a" } & { x: "b" }`) — this produces `never` and breaks downstream code silently
- Nest intersections beyond 3 levels deep without creating a named type alias (`type Deep = A & B & C & D & E;`) — readability degrades rapidly
- Assume that required properties from one type become optional when intersected with another type that omits them — all required properties remain required
- Use `&` for conditional type composition where `extends` clauses would be clearer — intersections compose, they do not conditionally select types
- Intersect a class type with an interface that has a conflicting constructor signature — this produces errors rather than clean merges

---

## Output Template

When implementing or reviewing intersection type code, produce:

1. **Intersection Composition Plan** — List each constituent type and what properties it contributes to the merged result. Identify any property name conflicts upfront.
2. **Resulting Type Definition** — The complete intersection type with all resolved properties listed explicitly (not just `A & B`).
3. **Assignability Proof** — Show at least one value that is assignable to each constituent type AND to the intersection itself.
4. **Conflict Resolution Report** — For any overlapping property names, state how TypeScript resolves them (`never`, union, or no conflict).
5. **Alternative Comparison** — Briefly explain why intersection was chosen over union or interface extension for this use case.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `typescript-utility-types` | Complements intersections with built-in utility types (Partial, Required, Pick, Omit) and custom utility construction patterns |
| `typescript-generics-patterns` | Expands on generic constraints including intersection constraints (`T extends A & B`) and conditional types |
| `typescript-decorator-patterns` | Intersections are used in decorator type transformations where metadata must be merged with the target type |
