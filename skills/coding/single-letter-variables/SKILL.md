---
name: single-letter-variables
description: Analyzes variable names to detect ambiguous single-letter identifiers and recommends readable alternatives based on scope, context, and language conventions.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: single letter variables, naming conventions, code readability, variable names, a b c d x y z, ambiguous identifiers, code review
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: code-review, refactoring-legacy-code, dry-principles
---

# Single-Letter Variable Naming Conventions

Evaluates whether variable names are descriptive enough for their scope and context, flagging ambiguous single-letter identifiers that degrade readability while preserving legitimate shorthand uses in tight loops, math formulas, and iterators.

## TL;DR Checklist

- [ ] Flag every `a`, `b`, `x`, `y` used outside a loop header or math expression
- [ ] Check variable scope — names with function-level scope must be self-documenting
- [ ] Replace business-domain variables with meaningful nouns (e.g., `user_id` over `a`)
- [ ] Preserve `i`, `j`, `k` in nested loops, `x`, `y`, `z` in coordinate geometry, `e` in exception handling
- [ ] Verify parameter names describe intent, not just type (`amount_usd` vs `x`)
- [ ] Ensure multi-language codebases follow language-specific conventions (PEP 8, ESLint rules)

---

## When to Use

Use this skill when:

- Reviewing or writing functions where variables represent domain concepts (users, amounts, timestamps, statuses)
- Onboarding developers who use cryptic names like `a`, `b`, `x` for non-iterator values
- Auditing codebases with inconsistent naming across modules
- Setting up linter rules to auto-detect single-letter violations
- Refactoring legacy functions with deeply nested scopes and unclear variable names
- Writing function or method signatures that need to be readable at a glance

---

## When NOT to Use

Avoid flagging single letters when:

- **Iterator variables in tight loops**: `for i in range(10)`, `for (let i = 0; i < items.length; i++)`
- **Mathematical formulas**: `a * x**2 + b * x + c` (quadratic equations), `a² + b² = c²`
- **Coordinate geometry**: `x`, `y`, `z` for spatial positions in graphics or physics code
- **Exception handling**: `except Exception as e:` — the letter `e` is universally understood
- **Destructuring assignments with well-known patterns**: `const { x, y } = point;` (short-lived scope, common convention)
- **Callback parameters where meaning is clear from context**: `items.map((x) => x * 2)` (scope is a single expression)

---

## Core Workflow

1. **Scan for Single-Letter Identifiers** — Find every variable, parameter, or assignment using exactly one alphabetic character. **Checkpoint:** For each hit, note the surrounding scope: loop header, function body, or block-level usage.

2. **Classify by Context** — Categorize each finding into an acceptable pattern (iterator, math formula, coordinate) or a problematic use (business logic, domain entity, function parameter). **Checkpoint:** If you cannot confirm the context from one line of surrounding code, flag it for manual review rather than auto-correcting.

3. **Assess Scope Length** — Measure how many lines the variable is visible. A single letter used across 20+ lines is almost always a readability violation. **Checkpoint:** Variables spanning multiple logical blocks or nested conditionals must have descriptive names regardless of context.

4. **Generate Replacement Names** — Replace ambiguous identifiers with self-documenting names derived from the variable's actual purpose, not its type. `amount` is better than `a`; `user_created_at` is better than `b`. **Checkpoint:** The replacement name must be consistent across all call sites and match the naming conventions of the target language.

5. **Apply Language-Specific Rules** — Ensure replacements respect language conventions: PEP 8 for Python (`snake_case`), ESLint `camelCase` for JavaScript, Java/C# conventions for those languages. **Checkpoint:** Verify that any generated linter rule (e.g., `pylint`, `eslint`) is configured with an allowed list rather than a blanket ban.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Acceptable — Tight Loop Iterator

A single-letter iterator variable inside a loop header or expression where scope is one line is acceptable across all languages. Robert Martin's "Clean Code" explicitly calls `i`, `j`, `k` out as acceptable loop variables, and every major language convention endorses this pattern.

```python
# ✅ GOOD — Loop iterators are universally accepted
for i in range(len(items)):
    print(items[i])

for j in range(len(rows)):
    for k in range(len(cols)):
        matrix[j][k] = calculate(j, k)
```

```typescript
// ✅ GOOD — JavaScript/TypeScript loop iterators
for (let i = 0; i < users.length; i++) {
    console.log(users[i].name);
}
```

### Pattern 2: Acceptable — Mathematical Formula

Variables that directly map to mathematical notation are acceptable when the formula spans only a few lines. The single letters carry semantic meaning from mathematics itself.

```python
# ✅ GOOD — Quadratic formula coefficients
def evaluate_quadratic(a: float, b: float, c: float, x: float) -> float:
    """Evaluate ax^2 + bx + c at point x."""
    return a * x ** 2 + b * x + c

# ✅ GOOD — Vector/matrix operations with established notation
def dot_product(x: float, y: float, z: float) -> float:
    """Compute the dot product of vector [x, y, z] with itself."""
    return x ** 2 + y ** 2 + z ** 2
```

### Pattern 3: Unacceptable — Business Logic (BAD vs. GOOD)

This is the most common and damaging misuse. Variables representing business-domain concepts should never be single letters because the reader must trace through every line of the function to understand what `a` or `b` means. This directly violates Robert Martin's "Clean Code" principle that "readability is everything."

```python
# ❌ BAD — Impossible to understand without reading the entire function
def process_transaction(a, b, c):
    d = a * 1.08
    e = b - c
    if d > 500:
        f = d * 0.9
    else:
        f = d
    g = f + e
    return {
        "total": g,
        "tax": a * 0.08,
        "discount": e,
        "timestamp": c
    }

# ✅ GOOD — Each variable's purpose is clear from its name alone
def process_transaction(
    subtotal: float,
    coupon_amount: float,
    order_timestamp: str
) -> dict:
    """Process an order with tax calculation and coupon discount.

    Args:
        subtotal: The pre-tax order total
        coupon_amount: Discount value to apply
        order_timestamp: ISO-8601 timestamp of the order

    Returns:
        Dictionary with final total, tax amount, discount applied, and timestamp
    """
    tax_rate: float = 0.08
    tax_amount: float = subtotal * tax_rate
    subtotal_with_tax: float = subtotal + tax_amount
    discounted_total: float = subtotal_with_tax - coupon_amount

    if subtotal_with_tax > 500.0:
        loyalty_discount: float = subtotal_with_tax * 0.10
        discounted_total -= loyalty_discount

    final_total: float = discounted_total + tax_amount

    return {
        "total": round(final_total, 2),
        "tax": round(tax_amount, 2),
        "discount": round(coupon_amount, 2),
        "timestamp": order_timestamp
    }
```

### Pattern 4: Unacceptable — Function Parameters for Domain Entities (BAD vs. GOOD)

Function parameters are the public contract of a function. Using single letters hides intent and makes API usage confusing. This is especially important when the function is exported or documented as part of a public API, following SOLID's maintainability principles.

```python
# ❌ BAD — Parameter names reveal nothing about what values to pass
def calculate_shipping(a: float, b: float, c: str, d: bool) -> float:
    base = 5.00
    if d:
        base += a * 2.5
    else:
        base += a * 1.5
    if c == "overnight":
        base += 25.0
    elif c == "express":
        base += 12.0
    return round(base, 2)

# ✅ GOOD — Parameters describe their expected values at a glance
def calculate_shipping(
    package_weight_kg: float,
    distance_miles: float,
    shipping_method: str = "standard",
    insured: bool = False
) -> float:
    """Calculate shipping cost based on weight, distance, and method.

    Args:
        package_weight_kg: Weight of the package in kilograms
        distance_miles: Shipping distance in miles
        shipping_method: 'standard', 'express', or 'overnight'
        insured: Whether to add insurance surcharge

    Returns:
        Total shipping cost rounded to 2 decimal places
    """
    if not isinstance(shipping_method, str) or shipping_method not in ("standard", "express", "overnight"):
        raise ValueError(f"Invalid shipping method: {shipping_method}")
    if package_weight_kg <= 0:
        raise ValueError("Weight must be positive")
    if distance_miles < 0:
        raise ValueError("Distance cannot be negative")

    base_rate: float = 5.00
    weight_multiplier: float = 2.5 if insured else 1.5
    cost: float = base_rate + (package_weight_kg * weight_multiplier) + (distance_miles * 0.30)

    method_surcharge: dict[str, float] = {
        "standard": 0.0,
        "express": 12.0,
        "overnight": 25.0,
    }
    cost += method_surcharge[shipping_method]

    return round(cost, 2)
```

### Pattern 5: Acceptable — Exception Handling

The letter `e` for exception objects is a nearly universal convention. No major style guide (PEP 8, Google Style Guides, Airbnb JavaScript Style Guide) flags this as problematic.

```python
# ✅ GOOD — 'e' for exception is universal convention
try:
    result = int(user_input)
except ValueError as e:
    logger.error(f"Invalid input '{user_input}': {e}")
    return None

# ✅ GOOD — Even in nested handling, 'e' or 'err' is standard
try:
    data = json.loads(raw_json)
except (json.JSONDecodeError, TypeError) as err:
    log_error(err)
    return fallback_data
```

### Pattern 6: Language-Specific — JavaScript and TypeScript

JavaScript and TypeScript have different idioms. The `eslint` `no-single-var` rule is not recommended because it would flag too many acceptable cases. Instead, configure a more targeted rule using `allowed-array-short-vars`.

```javascript
// ✅ GOOD — JavaScript array iteration shorthand
items.forEach(item => process(item));  // 'item' is descriptive
[1, 2, 3].map(x => x * 2);  // Acceptable in single-expression callbacks

// ❌ BAD — Business logic variables in JS
function filterUsers(a, b) {
    const c = a.filter(user => user.age > b);
    return c.map(u => ({ name: u.name, id: u.id }));
}

// ✅ GOOD — Descriptive parameter names
function filterActiveUsersByAge(
    users: User[],
    minimumAge: number
): Omit<User, 'password'>[] {
    const eligibleUsers = users.filter(user => user.age > minimumAge);
    return eligibleUsers.map(({ name, id }) => ({ name, id }));
}
```

### Pattern 7: Language-Specific — Java and C#

Java and C# developers often face additional pressure from auto-generated code (ORM frameworks, serializers) that may use single-letter fields. The skill guides refactoring these while maintaining compatibility.

```java
// ✅ GOOD — Auto-generated field names are an exception; business logic must be descriptive
@Entity
public class Order {
    private Long id;           // OK: framework-generated identifier
    private String customerId; // Good: self-documenting
}

// ❌ BAD — Hand-written business logic with single-letter parameters
public BigDecimal processPayment(BigDecimal a, BigDecimal b) {
    return a.multiply(b);  // What are these? Amount? Rate? Tax?
}

// ✅ GOOD — Descriptive parameter names in Java
public BigDecimal calculateTotalWithTax(
    BigDecimal subtotal,
    BigDecimal taxRate
) {
    Objects.requireNonNull(subtotal, "Subtotal must not be null");
    if (taxRate.compareTo(BigDecimal.ZERO) < 0) {
        throw new IllegalArgumentException("Tax rate cannot be negative");
    }
    return subtotal.multiply(BigDecimal.ONE.add(taxRate));
}
```

---

## Constraints

### MUST DO

- **Require self-documenting names** for all variables with function-level scope or wider — if a reader needs to look at the variable's value assignments to understand it, the name is insufficient
- **Preserve legitimate shorthand** in loop headers (`i`, `j`, `k`), math expressions (`x`, `y`, `z` in coordinate contexts), and exception handlers (`e`)
- **Derive replacement names from purpose, not type** — `amount_usd` describes *what* the value is; `val1` describes nothing about intent
- **Configure linters with allowed lists**, not blanket bans — a global `no-single-var` rule creates noise by flagging acceptable iterator usage
- **Use typed signatures** on all functions reviewed or written under this skill to make parameter intent explicit at call sites
- **Check naming consistency across the entire scope** — if you rename `a` to `user_id`, ensure it is used consistently and not mixed with any remaining single-letter variables in the same function

### MUST NOT DO

- **Flag iterator variables in loop headers** (`for i in range(...)`), as this violates universal conventions documented in PEP 8, Google Style Guides, and every major style reference
- **Replace mathematical notation variables** (`x`, `y` in geometry; `a`, `b`, `c` in polynomial expressions) — the semantics come from the mathematical context, not the code
- **Use single-letter names for parameters of exported/public functions** — these are part of the API contract and must be readable without documentation
- **Create overlong descriptive names** that exceed 40 characters per variable (`customer_information_timestamp_recorded` is worse than `created_at`) — follow Clean Code's principle of concise but clear naming
- **Ignore language-specific conventions** — Python uses `snake_case`, JavaScript/TypeScript uses `camelCase`, Java/C# uses `PascalCase` for classes and `camelCase` for members; the naming style must match

---

## Output Template

When this skill is active, the model's output must contain:

1. **Violation Summary** — A numbered list of each single-letter identifier violation found, with file path, line number, variable name, and estimated scope (number of lines visible)
2. **Replacement Recommendation** — For each violation, provide a concrete replacement name with rationale explaining why the new name is more descriptive than the original
3. **Refactored Code Block** — A complete before/after code snippet showing the corrected function or method with all replacements applied consistently
4. **Lint Configuration Suggestion** — Recommended linter rule configuration (e.g., `.eslintrc`, `pyproject.toml`) to prevent future violations, including any `allowed-list` entries for acceptable shorthand
5. **Acceptable Exceptions** — Any single-letter variables in the scanned code that are correctly used and should not be changed, with justification

---

## Related Skills

| Skill | Purpose |
|---|---|
| `code-review` | Broader code quality methodology that includes naming conventions as one aspect of maintainability |
| `refactoring-legacy-code` | Techniques for incrementally renaming variables in legacy codebases without breaking tests or API contracts |
| `dry-principles` | Complementary principle — descriptive naming supports DRY by making extracted functions self-documenting and easier to reuse |

---

## Language-Specific Quick Reference

| Language | Loop Iterators | Exception Variables | Business Logic | Allowed Config |
|----------|---------------|--------------------|----------------|----------------|
| Python (PEP 8) | `i, j, k` | `e, err` | **Never** single letter | `pylint`: disable `W0622` for `iter`, `input`; enable naming rules via `pycodestyle` |
| JavaScript/TS (ESLint) | `i, j, k` | `err, error` | **Never** single letter | No native rule; use `eslint-plugin-no-single-var` with exceptions |
| Java (Sun/Oracle Style Guide) | `i, j, k` | `e` | **Never** single letter | `checkstyle`: `LocalVariableName` check — regex `^[a-z]([a-z0-9][a-zA-Z0-9]*)?$` |
| C# (Microsoft Guidelines) | `i, j, k` | `ex, e` | **Never** single letter | `StyleCop`: SA1311 — descriptive names required |

---

*This skill operationalizes Robert Martin's "Clean Code" chapter on variables: "The name of a variable, function, or class should answer all the big questions. It should tell you why it exists, what it does, and how it is used." Referenced standards include Clean Code (Martin, 2008), PEP 8 (Python Enhancement Proposal 8), SOLID principles (maintainability aspect), and DRY principle.*
