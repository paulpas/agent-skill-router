---
name: ampersand-operator
description: Implements correct usage patterns for the ampersand (&) operator across programming languages — bitwise AND, logical AND short-circuit evaluation, type intersections, references, and address-of operations.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: ampersand, & operator, bitwise AND, logical AND, short-circuit evaluation, intersection types, Rust borrowing, shell backgrounding, address-of
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: bitwise-operations, type-systems, memory-management
---

# Ampersand Operator Across Languages

The ampersand (&) carries completely different meanings depending on language context — bitwise AND in C-family languages, short-circuit logical evaluation with &&, type intersections in TypeScript, immutable borrowing references in Rust, background process execution in shells, and address-of operations in C/C++. This skill ensures correct pattern selection and prevents costly semantic confusion between these distinct uses.

## TL;DR Checklist

- [ ] Identify the language context before interpreting & (bitwise vs logical vs reference vs type)
- [ ] Use & only for bitwise AND with integer types — never with booleans in C-family languages
- [ ] Use && (double ampersand) for short-circuit logical AND in C-family languages and JavaScript/TypeScript
- [ ] Apply TypeScript intersection types with & to combine interface requirements into one type
- [ ] In Rust, understand that & borrows immutably and &mut borrows mutably — no implicit copies
- [ ] Use shell & after a command for background execution — always redirect stdout/stderr to avoid terminal noise
- [ ] Use & only as address-of unary operator in C/C++ when you explicitly need a pointer

---

## When to Use

- Performing bit manipulation, flag masking, or permission bit operations in C, C++, Go, Java, or JavaScript
- Implementing short-circuit conditional evaluation where the second operand should not evaluate if the first is falsy/false
- Combining multiple TypeScript interfaces into a single type that satisfies all of them simultaneously
- Working with Rust ownership and borrowing rules — creating references without transferring ownership
- Running shell commands asynchronously in the background without blocking the calling script
- Obtaining memory addresses for pointer operations, FFI calls, or low-level memory manipulation in C/C++

---

## When NOT to Use

- For boolean logic in C-family languages — use && (logical AND) instead of & (bitwise AND); & evaluates both operands which can cause side effects and performance issues
- In PHP for variable aliasing — PHP uses =& for reference assignment, not just &
- In HTML/XML content — always use &amp; entity escape sequence instead of raw & characters to avoid well-formedness errors
- For creating type unions in TypeScript — use | (union) instead of & (intersection); & requires ALL types to be satisfied while | requires ANY

---

## Core Workflow

1. **Identify Language Context** — Determine which programming language (or shell) you are working with and whether the context suggests bitwise operations, conditional logic, type definitions, references, process management, or pointer arithmetic.
   **Checkpoint:** Confirm you understand which of the five distinct & semantics applies before proceeding.

2. **Select the Correct Pattern** — Choose from: bitwise AND (C-family integers), logical short-circuit && (boolean evaluation), intersection types (& in TypeScript), Rust borrowing references (& and &mut), shell backgrounding (command + &), or address-of operator (unary &).
   **Checkpoint:** Verify your selected pattern matches the intended semantic behavior.

3. **Implement with Language Rules** — Apply the pattern following language-specific type rules, borrow checker constraints, and operator precedence.
   **Checkpoint:** Ensure integer types for bitwise AND, boolean types for logical &&, valid type intersections in TypeScript, and proper borrow lifetime in Rust.

4. **Verify Safety and Correctness** — Run static analysis, check for borrow checker violations, verify type compatibility, or test shell process management depending on the context.
   **Checkpoint:** Confirm no dangling pointers, no borrow checker errors, no type errors, and no unexpected shell behavior.

---

## Implementation Patterns

### Pattern 1: Bitwise AND (C-family Languages)

The & operator performs a bitwise AND between two integer operands. Each bit of the result is 1 only if both corresponding bits of the operands are 1. This is fundamental for flag checking, permission masking, and bit manipulation.

```go
// ✅ GOOD: Checking specific permission flags using bitwise AND
const (
		ReadPerm  = 1 << iota // 1 (binary: 001)
		WritePerm             // 2 (binary: 010)
		ExecutePerm           // 4 (binary: 100)
)

func hasPermission(userPerms int, requiredPerm int) bool {
	return (userPerms & requiredPerm) == requiredPerm
}

// Usage: check if user has WritePerm (2 = binary 010)
if hasPermission(5, WritePerm) { // 5 = binary 101, has Read + Execute but NOT Write
	fmt.Println("User can write")
} else {
	fmt.Println("User cannot write") // This prints: user cannot write
}
```

```go
// ❌ BAD: Using & instead of && in a conditional — evaluates both sides always
func badCheck(id int, name string) bool {
	if id > 0 & strings.HasPrefix(name, "user_") { // Bug: & is bitwise on ints, not boolean AND
		return true
	}
	return false
}

// ✅ GOOD: Use && for logical short-circuit evaluation in Go/Java/C-family
func goodCheck(id int, name string) bool {
	if id > 0 && strings.HasPrefix(name, "user_") { // Correct: short-circuits if id <= 0
		return true
	}
	return false
}
```

### Pattern 2: Short-Circuit Logical AND (JavaScript / TypeScript)

In JavaScript and TypeScript, && is used for short-circuit logical AND. It evaluates left to right and returns the first falsy value or the last value if all are truthy. This enables safe property access, default values, and guarded execution.

```javascript
// ✅ GOOD: Short-circuit evaluation for safe nested property access
function getUserName(user: { profile?: { name?: string } } | null): string {
	return user?.profile?.name ?? "Anonymous";
}

// Short-circuit with function calls — second argument only evaluated if first passes
async function validateAndFetch(token: string, userId: number) {
	// If !isValidToken() returns true (token invalid), fetchUser is never called
	if (!isValidToken(token) && await fetchUser(userId)) {
		console.log("User found");
	}
}
```

```javascript
// ❌ BAD: Using & for logical comparison — evaluates both sides, can cause errors
function badGetValue(obj: any): string {
	// & is bitwise in JS — this coerces booleans to numbers and does bitwise AND
	if (obj.value & typeof obj.value === "string") { // Nonsensical: 1 & 0 or 1 & 1 as bitwise
		return obj.value;
	}
}

// ✅ GOOD: Use && for logical short-circuit — second expression only runs if first is truthy
function goodGetValue(obj: any): string {
	if (obj.value !== undefined && typeof obj.value === "string") {
		return obj.value;
	}
	return "";
}
```

### Pattern 3: TypeScript Intersection Types

In TypeScript, & creates an intersection type that combines multiple types. The resulting type must satisfy ALL of the intersected types simultaneously. This is the opposite of union (|), which requires satisfying only one.

```typescript
// ✅ GOOD: Combining interface contracts with intersection types
interface HasId {
	id: string;
}

interface HasName {
	name: string;
}

interface HasEmail {
	email: string;
}

// UserAccount requires ALL three interfaces — must have id, name, and email
type UserAccount = HasId & HasName & HasEmail;

function createFullUser(input: Partial<UserAccount>): UserAccount {
	return {
		id: input.id ?? crypto.randomUUID(),
		name: input.name ?? "Unknown",
		email: input.email ?? "unknown@example.com"
	};
}
```

```typescript
// ❌ BAD: Confusing intersection (&) with union (|) — opposite semantics
interface CanFly {
	fly(): void;
}

interface CanSwim {
	swim(): void;
}

// Union type means EITHER CanFly OR CanSwim or both
type FlyingThing = CanFly | CanSwim;

function badProcessThing(thing: FlyingThing) {
	thing.fly(); // Error! TypeScript doesn't know this has fly() — it might only have swim()
	thing.swim(); // Same error here
}

// ✅ GOOD: Use intersection (&) when you need BOTH capabilities
type Duck = CanFly & CanSwim; // Must implement both fly() and swim()

function goodProcessDuck(duck: Duck) {
	duck.fly(); // Safe — Duck has fly()
	duck.swim(); // Safe — Duck has swim()
}
```

### Pattern 4: Rust Borrow References (& and &mut)

In Rust, & creates an immutable borrow reference — the borrowed data cannot be modified through the reference. &mut creates a mutable borrow. The borrow checker enforces that you can have either ONE mutable borrow OR any number of immutable borrows at a time.

```rust
// ✅ GOOD: Immutable borrowing with & — read-only access without taking ownership
fn calculate_total(scores: &[i32]) -> i32 {
	scores.iter().sum() // borrows the slice, doesn't take ownership
}

fn print_greeting(name: &str) {
	println!("Hello, {}!", name); // borrows string slice immutably
}

fn main() {
	let data = vec![10, 20, 30, 40];
	let total = calculate_total(&data); // &data passes a reference (immutable borrow)
	println!("Total: {}", total);

	let name = String::from("Rustacean");
	print_greeting(&name); // borrows the String as &str
	// name is still valid here — ownership was NOT transferred

	let mut counter = 42;
	modify_counter(&mut counter); // &mut passes a mutable borrow
	println!("Counter: {}", counter); // mutable borrow has ended, safe to read
}

fn modify_counter(value: &mut i32) {
	*value += 1; // dereference and mutate through the mutable reference
}
```

```rust
// ❌ BAD: Forgetting mut keyword on variable when taking &mut reference
fn bad_borrow() {
	let x = String::from("hello");
	let y = &mut x; // ERROR: cannot borrow `x` as mutable, it is not declared as mutable
}

// ❌ BAD: Holding both mutable and immutable borrows simultaneously — violates borrowing rules
fn bad_concurrent_borrows() {
	let mut data = vec![1, 2, 3];

	let immut_ref = &data; // immutable borrow starts here
	let mut_ref = &mut data; // ERROR: cannot borrow as mutable because immutable borrow is active

	println!("Immutable: {:?}", immut_ref); // ERROR: immutable borrow used after mutable borrow
}

// ✅ GOOD: Separate scopes for mutable and immutable borrows
fn good_separate_borrows() {
	let mut data = vec![1, 2, 3];

	// Mutable borrow — scope ends at closing brace
	{
		data.push(4);
	}

	// Immutable borrow — safe now because mutable borrow has ended
	println!("Data: {:?}", &data);
}
```

### Pattern 5: Shell Background Processes

In bash and other POSIX shells, placing & after a command runs it asynchronously in the background. This is useful for long-running tasks, parallel processing, and keeping scripts responsive. Always redirect output to avoid terminal pollution.

```bash
# ✅ GOOD: Running tasks in background with proper output redirection
#!/usr/bin/env bash
set -euo pipefail

readonly LOG_FILE="/tmp/long_task.log"

# Run long task in background, capture PID for later management
python3 process_large_dataset.py --input data.csv --output results.json > "$LOG_FILE" 2>&1 &
TASK_PID=$!

echo "Background task started with PID $TASK_PID"

# Continue doing other work while the background task runs
echo "Processing metadata..."
python3 generate_metadata.py

# Wait for the background task to finish and check its exit status
if wait "$TASK_PID"; then
	echo "Background task completed successfully. Results in results.json"
else
	echo "Background task failed. Check $LOG_FILE for details" >&2
	exit 1
fi
```

### Pattern 6: C/C++ Address-Of Operator

In C and C++, the unary & operator returns the memory address of a variable, producing a pointer. This is fundamental for functions that need to modify their arguments (pass-by-reference simulation), dynamic allocation, and low-level memory manipulation.

```c
// ✅ GOOD: Using & to pass addresses for in-place modification
void swap(int *a, int *b) {
	int temp = *a;
	*a = *b;
	*b = temp;
}

void read_user_input(int *result) {
	printf("Enter a number: ");
	scanf("%d", result); // pass pointer so scanf can modify the caller's variable
}

int main(void) {
	int x = 10, y = 20;
	swap(&x, &y); // &x and &y pass addresses of x and y
	printf("x=%d, y=%d\n", x, y); // x=20, y=10

	int value;
	read_user_input(&value); // passes address so scanf writes to value
	return 0;
}
```

---

## Constraints

### MUST DO
- Use & only for bitwise AND between integer types — never use & with boolean operands in C-family languages (use && instead)
- Use && (double ampersand) for short-circuit logical AND in C-family languages, JavaScript, and TypeScript to avoid evaluating the second operand unnecessarily
- In Rust, respect borrow checker rules: one &mut reference OR any number of & references at a time — never mix them simultaneously
- Ensure TypeScript intersection types produce compatible results — conflicting property types between intersected interfaces cause compile errors
- Always redirect stdout/stderr when using shell backgrounding to prevent terminal output from interfering with the foreground process

### MUST NOT DO
- Use & for boolean logic in C-family languages (C, C++, Go, Java) — & evaluates both operands without short-circuiting, causing potential side effects and bugs
- Create dangling references or pointers by returning addresses of local variables from functions
- In Rust, attempt to mutate data through an immutable & reference — the borrow checker will reject this at compile time
- Confuse TypeScript intersection (&) with union (|) types — intersection requires ALL type members, union requires ANY one

---

## Output Template

When implementing or reviewing ampersand-related code, produce:

1. **Context Identification** — State which language and which & semantics (bitwise, logical short-circuit, type intersection, reference borrowing, backgrounding, or address-of) applies
2. **Code Example** — Provide the correct implementation with proper typing, comments, and safety checks
3. **Common Mistake Warning** — Note the most likely error for this context (e.g., using & instead of && in C-family boolean logic)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `bitwise-operations` | Deeper coverage of all bitwise operators (|, ^, ~, <<, >>) beyond just & |
| `type-systems` | TypeScript union types, generics, and advanced type-level programming |
| `memory-management` | Rust ownership patterns, lifetime annotations, and safe pointer usage |
