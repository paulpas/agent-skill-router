---
name: ampersand-operator
description: Implements bitwise AND operations, address/reference resolution, and memory pointer manipulation using & operator across C, C++, Rust, Python ctypes, and Go for low-level programming.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: "&, ampersand operator, bitwise AND, address of, flag checking, bitmask, pointer manipulation"
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: coding-bitwise-operations, coding-error-handling
---

# Ampersand (&) Operator Reference

This skill teaches how to correctly use the `&` (ampersand) operator across multiple programming languages for bitwise AND operations on integer types, address-of / reference binding in systems languages (C, C++, Rust), and set intersection in Python. When loaded, this skill makes the model produce correct, idiomatic code that respects language-specific semantics, avoids precedence pitfalls, and handles memory safety explicitly.

## TL;DR Checklist

- [ ] Distinguish bitwise AND (`&`) from logical AND (`&&` / `and`) before writing any expression
- [ ] Use parentheses around every `&` in mixed-operator expressions to avoid precedence bugs (e.g., `(flags & MASK) != 0`)
- [ ] For flag checking, compare the result against zero rather than against the flag constant itself
- [ ] Always pair address-of (`&var`) with a corresponding dereference (`*ptr`) and nil/NULL check before use
- [ ] In Rust, respect borrowing rules: immutable `&T` coexists freely; mutable `&mut T` requires exclusive access
- [ ] Validate that bitmask operations stay within the expected integer width (e.g., 8-bit, 16-bit, 32-bit) to avoid silent truncation
- [ ] For Python, remember `&` on sets performs intersection while `&` on ints performs bitwise AND — never mix types in a single expression

---

## When to Use

Use this skill when you are working on:

- Implementing flag or permission checking systems using bitwise AND on integer constants
- Constructing or parsing bitmasks for hardware registers, network protocols, or configuration values
- Passing variables by reference to functions using C-style pointers (`&variable`) or C++/Rust references
- Debugging memory layout by inspecting variable addresses with `printf("%p", &var)` or equivalent
- Performing set intersection operations in Python where `{a} & {b}` concisely replaces loop-based filtering
- Working with Rust's borrow checker using `&` for immutable borrows and `&mut` for exclusive mutable borrows
- Manipulating Go pointers via `&structVar` to avoid copying large structs and enable mutation across function boundaries
- Writing embedded systems firmware or kernel-level code where direct bit manipulation is required

---

## When NOT to Use

Avoid using the ampersand operator in these situations:

- **High-level languages with transparent references** — In Java, C#, Swift, or JavaScript, references are handled implicitly by the runtime. Using `&`-like constructs (e.g., Go pointers, Rust borrows) adds complexity without benefit.
- **Boolean logic on non-integer types** — Do not use bitwise AND (`&`) for logical conditions in Python, JavaScript, or other languages where `&&` / `and` exists. Bitwise AND on booleans may work as a workaround but is confusing and slow.
- **When the operand types are incompatible** — You cannot apply `&` between integers and floats, strings, or objects (except set intersection in Python). Attempting it raises errors or silently truncates values.
- **When you need short-circuit evaluation** — Use `&&` (C/C++/Go) or `and` (Python/Rust) for conditional checks where the second operand should not evaluate if the first is false. Bitwise `&` always evaluates both sides, which can cause side effects or unnecessary computation.

---

## Core Workflow

1. **Identify the operation category** — Determine whether the task requires bitwise AND on integers, address-of / reference binding, set intersection, or pointer manipulation. Each category has distinct semantics and rules.
   - Bitwise: operands must be integer types (or enums convertible to integers).
   - Address-of: operand must be an l-value (a modifiable memory location).
   - Set intersection: both operands must be sets (Python) or equivalent collection types.

2. **Choose the correct operator form** — Select `&` for bitwise AND, `&` for address-of, `&&` for logical short-circuit, or `and` / set operators where appropriate. Ensure you are not confusing these forms.
   - **Checkpoint:** Verify that the chosen operator matches the intended semantics by reviewing operand types and desired evaluation behavior (short-circuit vs eager).

3. **Apply precedence-aware grouping** — Wrap every `&` expression in parentheses when mixed with other operators like `==`, `!=`, `+`, `-`, `<`, `>`. The precedence of `&` is lower than comparison and arithmetic but higher than logical `&&` in most C-family languages.
   - **Checkpoint:** Test the expression mentally: does `(a & MASK) != 0` produce a different result than `a & MASK != 0`? They do — the latter parses as `a & (MASK != 0)` due to precedence rules.

4. **Validate memory safety for address-of / pointer operations** — After using `&` to obtain an address, ensure every dereference is guarded by a null/nil check or lifetime guarantee. In Rust, verify that borrows comply with borrowing rules (no aliasing mutable references).
   - **Checkpoint:** Confirm no dangling pointers exist — the referenced object must outlive the pointer. In Rust, confirm the borrow checker can prove lifetime safety at compile time.

5. **Test edge cases explicitly** — Verify behavior with zero operands, all-ones masks, boundary values (e.g., `INT_MAX`, `UINT_MIN`), empty sets, and nil pointers. For flag systems, test combinations of flags including unexpected ones that might be set by error.
   - **Checkpoint:** Run the code against a minimal test suite covering: (a) no bits set, (b) all expected bits set, (c) unexpected bits set, (d) zero/null inputs, (e) type mismatches if applicable.

---

## Implementation Patterns

### Pattern 1: Bitwise AND for Flag Checking (C/C++)

Define flag constants using power-of-two bit shifts and use bitwise AND to test, combine, or clear individual flags in a bitmask. This is the standard pattern for configuration flags, status bits, and permission systems.

```c
/* Define flag constants using bit shifts — each flag occupies exactly one bit */
#define FLAG_READ   (1 << 0)  /* 0b00000001 */
#define FLAG_WRITE  (1 << 1)  /* 0b00000010 */
#define FLAG_EXECUTE (1 << 2) /* 0b00000100 */
#define FLAG_DELETE (1 << 3)  /* 0b00001000 */

/* Check if a specific flag is set */
int has_permission(int flags, int flag) {
    return (flags & flag) != 0;  /* Compare result against zero, not the flag itself */
}

/* Check multiple flags simultaneously — all must be present */
int has_all_permissions(int flags, int required_flags) {
    return (flags & required_flags) == required_flags;
}

/* Clear a specific flag */
void clear_permission(int *flags, int flag) {
    *flags &= ~flag;  /* AND with the inverse of the flag to unset that bit */
}
```

**Explanation:** `(flags & FLAG_READ) != 0` evaluates to non-zero (true) only when the bit corresponding to `FLAG_READ` is set in `flags`. We compare against zero rather than against the flag constant because `(flags & FLAG_A)` may produce a non-zero value that equals the flag, but this is not guaranteed if multiple flags are combined. The comparison against zero is correct regardless of which bits are set.

To check two flags at once: `(flags & (FLAG_READ | FLAG_WRITE)) == (FLAG_READ | FLAG_WRITE)` ensures both bits are present. The `~` operator inverts all bits, so `~FLAG_DELETE` has a zero only at bit position 3, and `flags &= ~FLAG_DELETE` clears only that bit while preserving all others.

**BAD vs GOOD comparison:**

```c
/* ❌ BAD — comparing result directly to the flag constant */
if (flags & FLAG_READ) { /* Works by coincidence but is misleading */ }

/* ✅ GOOD — explicit comparison against zero for clarity and correctness */
if ((flags & FLAG_READ) != 0) { /* Unambiguous: true when bit is set */ }

/* ❌ BAD — missing parentheses, precedence bug */
int result = flags & FLAG_READ == FLAG_READ;
/* Parses as: flags & (FLAG_READ == FLAG_READ) → either 0 or flags itself */

/* ✅ GOOD — parentheses around the bitwise operation */
int result = (flags & FLAG_READ) == FLAG_READ;
```

---

### Pattern 2: Bitmask Construction and Validation (C / Python)

Build composite masks from individual flag constants, validate that constructed masks fall within expected bit ranges, and use common mask patterns for hardware registers or protocol parsing.

```c
/* C: Construct a composite mask from multiple flags */
int build_access_mask(int read, int write, int execute, int delete) {
    int mask = 0;

    if (read)      mask |= FLAG_READ;
    if (write)     mask |= FLAG_WRITE;
    if (execute)   mask |= FLAG_EXECUTE;
    if (delete)    mask |= FLAG_DELETE;

    return mask;
}

/* C: Validate that a mask only contains known flags */
int is_valid_mask(int mask) {
    /* ALLOWED_MASK has all known flag bits set. Any bit outside this range is invalid. */
    const int ALLOWED_MASK = FLAG_READ | FLAG_WRITE | FLAG_EXECUTE | FLAG_DELETE;
    return (mask & ~ALLOWED_MASK) == 0;  /* No unknown bits should be set */
}

/* C: Extract a field from a register value using a shift and mask */
#define REG_FIELD_OFFSET 4
#define REG_FIELD_WIDTH  4
#define REG_FIELD_MASK   ((1 << REG_FIELD_WIDTH) - 1)  /* 0b1111 = 15 */

int extract_reg_field(unsigned int reg_value) {
    return (reg_value >> REG_FIELD_OFFSET) & REG_FIELD_MASK;
}
```

**Explanation:** `build_access_mask` starts from zero and uses OR (`|=`) to set individual bits corresponding to each boolean parameter. The result is a composite bitmask representing the union of selected flags.

`is_valid_mask` checks for unknown bits by ANDing the mask with the inverted allowed mask (`~ALLOWED_MASK`). If any bit is set outside the known range, the result is non-zero, meaning the mask is invalid. This is a standard pattern for rejecting malformed configuration values.

The register extraction pattern `(reg_value >> OFFSET) & ((1 << WIDTH) - 1)` is ubiquitous in embedded programming. Shifting right moves the target field to bit position 0, and masking with `WIDTH` ones isolates exactly those bits.

```python
# Python: Bitmask construction and validation
def build_permission_mask(read: bool, write: bool, execute: bool) -> int:
    """Build a composite permission mask from boolean parameters."""
    FLAG_READ = 1 << 0
    FLAG_WRITE = 1 << 1
    FLAG_EXECUTE = 1 << 2

    mask = 0
    if read:      mask |= FLAG_READ
    if write:     mask |= FLAG_WRITE
    if execute:   mask |= FLAG_EXECUTE
    return mask

def is_valid_mask(mask: int, allowed_bits: int) -> bool:
    """Check that no unknown bits are set outside the allowed range."""
    return (mask & ~allowed_bits) == 0

# Common mask patterns for protocol parsing
HEADER_MASK = 0xFF00       # Upper byte
PAYLOAD_OFFSET = 8         # Bits 0-7 are payload, bits 8-15 are header

def parse_protocol_frame(frame: int) -> dict:
    """Extract header and payload from a packed frame value."""
    header = (frame >> PAYLOAD_OFFSET) & HEADER_MASK  # Shift then mask
    payload = frame & 0xFF                             # Mask lower byte only
    return {"header": header, "payload": payload}

# Validation with range checking
def validate_bit_depth(value: int, max_bits: int = 32) -> bool:
    """Ensure a value fits within the specified bit width."""
    if max_bits <= 0:
        raise ValueError("max_bits must be positive")
    return value >= 0 and value < (1 << max_bits)

# Usage
print(build_permission_mask(True, True, False))     # → 3  (binary: 0b011)
print(parse_protocol_frame(0x4210))                   # → {"header": 65280, "payload": 16}
print(validate_bit_depth(0xFFFFFFFF, 32))             # → True
print(validate_bit_depth(0x100000000, 32))            # → False (overflow)
```

**Explanation:** The Python version mirrors the C logic but benefits from dynamic typing. `validate_bit_depth` ensures a value fits within a specific number of bits by checking it is less than `2^max_bits`. The `parse_protocol_frame` function demonstrates extracting multiple fields from a packed integer, a common pattern in network protocol parsing and binary file formats.

---

### Pattern 3: Address-of & Pointer Operations (C/C++)

Obtain the memory address of a variable using `&`, pass it to functions expecting pointers, and use pointer dereferencing to read or modify the original value. This is fundamental for pass-by-reference semantics, dynamic memory allocation, and interfacing with hardware.

```c
#include <stdio.h>
#include <stdint.h>

/* Pass-by-value: function receives a copy; cannot modify caller's variable */
void increment_by_value(int x) {
    x += 1;  /* Only modifies the local copy */
}

/* Pass-by-pointer: function receives address; can modify caller's variable */
void increment_by_pointer(int *ptr) {
    if (ptr != NULL) {  /* Always check before dereferencing */
        (*ptr) += 1;    /* Dereference and modify the original */
    }
}

/* Get address of a local variable and pass it to a function */
int main(void) {
    int counter = 0;

    /* Pass by value — counter remains 0 */
    increment_by_value(counter);
    printf("After increment_by_value: %d\n", counter);  /* 0 */

    /* Pass address using & — counter becomes 1 */
    increment_by_pointer(&counter);
    printf("After increment_by_pointer: %d\n", counter); /* 1 */

    /* Print memory addresses for debugging */
    printf("Address of counter: %p\n", (void *)&counter);

    return 0;
}
```

**Explanation:** `&counter` evaluates to a pointer of type `int *` containing the memory address where `counter` is stored. When passed to `increment_by_pointer`, the function receives this address and dereferences it with `*ptr` to access and modify the original variable on the stack. The NULL check prevents undefined behavior if a null pointer is accidentally passed.

`(void *)&counter` casts the address to `void *` because `%p` in `printf` expects a `void *` argument. Printing addresses aids debugging by letting you verify that two different names (`ptr` and `&counter`) refer to the same memory location.

**BAD vs GOOD comparison:**

```c
/* ❌ BAD — dereferencing without NULL check; undefined behavior if null */
void bad_increment(int *ptr) {
    (*ptr) += 1;  /* Crashes if ptr is NULL */
}

/* ✅ GOOD — explicit NULL guard before dereference */
void good_increment(int *ptr) {
    if (ptr != NULL) {
        (*ptr) += 1;
    }
}

/* ❌ BAD — taking address of a temporary / literal (undefined behavior) */
int *p = &42;  /* Cannot take address of an rvalue */

/* ✅ GOOD — take address only of lvalues (modifiable variables) */
int value = 42;
int *p = &value;  /* Correct: 'value' is a modifiable lvalue */
```

---

### Pattern 4: Reference Operator in C++ and Rust

In C++, `&` creates an alias (reference) to an existing variable without copying it. In Rust, `&` creates an immutable borrow, and `&mut` creates a mutable exclusive borrow. Both languages use references for zero-cost abstractions, but Rust enforces lifetime rules at compile time while C++ relies on programmer discipline.

```cpp
// C++: Reference binding using &
#include <iostream>
#include <string>

void swap_values(int &a, int &b) {  /* References avoid copying */
    int temp = a;
    a = b;
    b = temp;
}

void modify_string(std::string &name) {  /* Modify caller's string in-place */
    name += " (modified)";
}

int main() {
    int x = 10, y = 20;
    swap_values(x, y);  /* No pointer syntax needed; compiler handles it */
    std::cout << "x=" << x << ", y=" << y << "\n";  /* x=20, y=10 */

    std::string greeting = "Hello";
    modify_string(greeting);
    std::cout << greeting << "\n";  /* "Hello (modified)" */
    return 0;
}
```

**Explanation:** In C++, `int &a` declares a reference parameter. When the caller passes `x`, the function parameter `a` becomes an alias for `x` — they refer to the exact same memory location. No pointer arithmetic or dereferencing is needed in the function body; the compiler automatically handles the indirection. This is safer than raw pointers because references must be initialized at declaration and cannot be reseated.

```rust
// Rust: Immutable and mutable borrows using & and &mut
fn read_first_item(items: &[i32]) -> Option<&i32> {
    /* Accepts a slice (borrowed array view) — no copying */
    if items.is_empty() {
        return None;
    }
    Some(&items[0])  /* Returns an immutable borrow of the first element */
}

fn add_item(items: &mut Vec<i32>, value: i32) {
    /* Exclusive mutable borrow — no other references allowed while this exists */
    items.push(value);
}

fn main() {
    let numbers = vec![1, 2, 3];

    // Immutable borrow: multiple & borrows coexist freely
    let first_a = read_first_item(&numbers);  /* &numbers creates an immutable borrow */
    let first_b = read_first_item(&numbers);  /* Still allowed — immutable borrows are shared */
    println!("First via a: {:?}, via b: {:?}", first_a, first_b);

    // Mutable borrow: requires exclusive access
    let mut data = vec![10];
    add_item(&mut data, 20);  /* &mut data grants exclusive mutable access */
    println!("Data after push: {:?}", data);  /* [10, 20] */

    // ❌ This would fail to compile — cannot borrow mutably while immutably borrowed:
    // let ref_a = &data;
    // add_item(&mut data, 30);  /* Error: cannot use `data` as mutable because it is also borrowed */
}
```

**Explanation:** `&numbers` creates an immutable borrow — the borrow checker guarantees that no code can modify `numbers` while the borrow is active, but multiple immutable borrows can coexist. `&mut data` creates a mutable (exclusive) borrow — the compiler ensures no other reference exists during the mutation, preventing data races at compile time. This is Rust's core ownership model in action.

**BAD vs GOOD comparison:**

```rust
// ❌ BAD — dangling reference: cannot return a reference to local data
fn bad_dangling_ref() -> &String {
    let s = String::from("temporary");
    &s  /* ERROR: 's' will be dropped at end of scope; returning dangling pointer */
}

// ✅ GOOD — return an owned value instead, or ensure the borrowed data outlives the reference
fn good_owned_return() -> String {
    let s = String::from("temporary");
    s  /* Owned value moved to caller; no dangling reference possible */
}

// ❌ BAD — attempt to create a mutable and immutable borrow simultaneously
fn bad_aliasing(data: &mut Vec<i32>) {
    let ref_immutable = &data[0];       /* Immutable borrow starts */
    data.push(42);                      /* ERROR: cannot push while immutable borrow is active */
}

// ✅ GOOD — end the immutable borrow before mutating
fn good_no_aliasing(data: &mut Vec<i32>) {
    let first = data[0];                /* Copy the value out (i32 implements Copy) */
    data.push(42);                      /* Safe: no borrows active anymore */
}
```

---

### Pattern 5: Python — Using `&` for Set Intersection and ctypes

In Python, `&` has two distinct meanings depending on operand types: bitwise AND for integers (inherited from C) and set intersection for `set` objects. This dual behavior requires careful attention to types to avoid `TypeError` or logic bugs.

```python
# --- Bitwise AND on integers (C-style semantics) ---

def check_permission_flags(flags: int, required_flag: int) -> bool:
    """Check if a permission flag is set in a bitmask using bitwise AND."""
    return (flags & required_flag) != 0

def clear_flag(flags: int, flag_to_clear: int) -> int:
    """Return a new integer with the specified flag bit cleared."""
    return flags & ~flag_to_clear

# Usage examples
PERMISSIONS = 0b1101  # Read + Write + Execute (bit 2), no Delete (bit 3)
READ_FLAG     = 1 << 0  # 0b0001
WRITE_FLAG    = 1 << 1  # 0b0010

print(check_permission_flags(PERMISSIONS, READ_FLAG))   # True  — bit 0 is set
print(check_permission_flags(PERMISSIONS, WRITE_FLAG))  # True  — bit 1 is set
print(check_permission_flags(PERMISSIONS, 1 << 3))      # False — bit 3 is not set

cleared = clear_flag(PERMISSIONS, READ_FLAG)
print(f"{bin(cleared)}")  # 0b1100 — read flag removed


# --- Set intersection using & on set objects ---

def find_common_elements(set_a: set, set_b: set) -> set:
    """Return the intersection of two sets — elements present in both."""
    return set_a & set_b

def filter_valid_users(valid_ids: set, candidate_ids: set) -> set:
    """Keep only candidates that are also in the valid list."""
    approved = valid_ids & candidate_ids
    return approved

# Usage examples
available_ports = {80, 443, 8080, 8443}
allowed_ports = {80, 443, 9090}
common = find_common_elements(available_ports, allowed_ports)
print(common)  # {80, 443}


# --- TypeError: & between incompatible types raises an error ---

def safe_bitwise_and(a: int, b: int) -> int:
    """Guard against type errors by validating inputs."""
    if not isinstance(a, int) or not isinstance(b, int):
        raise TypeError(
            f"Bitwise AND requires integer operands, got {type(a).__name__} and {type(b).__name__}"
        )
    return a & b

# This raises TypeError — mixing int with set:
# result = 42 & {1, 2, 3}  # TypeError: unsupported operand type(s) for &: 'int' and 'set'


# --- Alternative to address-of in Python: ctypes ---

import ctypes

def get_struct_address(my_struct) -> int:
    """Get the memory address of a ctypes structure — Python's closest equivalent to &struct."""
    return ctypes.addressof(my_struct)

# Define a simple C-compatible struct
class Point(ctypes.Structure):
    _fields_ = [("x", ctypes.c_int), ("y", ctypes.c_int)]

p = Point(10, 20)
addr = get_struct_address(p)
print(f"Address of Point struct: {hex(addr)}")
```

**Explanation:** Python's `&` operator dispatches to different special methods based on operand type. For `int`, it calls `__and__` for bitwise AND. For `set`, it calls `set.__and__` for set intersection (symmetric difference of the same operation). This dual behavior means `a & b` is safe but requires both operands to be of compatible types — mixing an `int` with a `set` raises `TypeError`. The `ctypes.addressof()` function is Python's equivalent of the C `&` operator for obtaining memory addresses of structured data.

---

### Pattern 6: Go — Address Operator for Pointers

Go uses `&` exclusively as the address-of operator. There are no references like C++ or Rust; all pass-by-reference semantics are achieved through pointers. Go also provides built-in `nil` checking and garbage collection, which simplifies (but does not eliminate) pointer safety concerns.

```go
package main

import "fmt"

// Pass a pointer to modify the caller's variable
func increment(n *int) {
	if n == nil {
		return // Guard against nil pointer dereference
	}
	*n += 1 // Dereference with *, modify original value
}

// Return a pointer to a struct to avoid copying large structs
type Config struct {
	Name    string
	Timeout int
	Retries int
	Flags   uint32
}

func newConfig(name string, timeout, retries int) *Config {
	cfg := &Config{ // & creates a pointer on the heap (or stack-escaped by compiler)
		Name:    name,
		Timeout: timeout,
		Retries: retries,
		Flags:   0,
	}
	return cfg
}

// Set a flag bit using bitwise AND and OR
func setFlag(cfg *Config, flag uint32) {
	if cfg == nil {
		return
	}
	cfg.Flags |= flag // Combine existing flags with the new one
}

// Check if a specific flag is set
func hasFlag(cfg *Config, flag uint32) bool {
	if cfg == nil {
		return false
	}
	return (cfg.Flags & flag) != 0
}

func main() {
	// Basic pointer usage
	value := 42
	ptr := &value // Address-of: ptr now holds the memory address of value

	fmt.Printf("Original value: %d\n", value)   // 42
	fmt.Printf("Address of value: %p\n", ptr)    // Memory address (e.g., 0xc0000160a0)
	fmt.Printf("Value via pointer: %d\n", *ptr)  // 42 — dereference with *

	increment(&value) // Pass address using &
	fmt.Printf("After increment: %d\n", value)  // 43

	// Struct pointer usage
	config := newConfig("myapp", 30, 3)

	setFlag(config, 1<<0) // Set FLAG_READ
	setFlag(config, 1<<2) // Set FLAG_EXECUTE

	fmt.Printf("Has read flag: %v\n", hasFlag(config, 1<<0))    // true
	fmt.Printf("Has delete flag: %v\n", hasFlag(config, 1<<3))  // false

	// Nil pointer handling
	var nilPtr *Config
	fmt.Printf("Nil check: %v\n", nilPtr == nil) // true
	fmt.Printf("Safe nil read: %v\n", hasFlag(nilPtr, 1<<0)) // false (guarded by nil check)
}
```

**Explanation:** In Go, `&variable` obtains a pointer to any addressable value. The pointer type is inferred from the operand's type (`&value` where `value` is `int` yields `*int`). Go has no references — all shared access goes through pointers. Every function that receives a pointer must check for `nil` before dereferencing, as there is no compile-time guarantee that the caller passed a valid address. The `newConfig` function demonstrates how `&struct{}` creates a heap-allocated struct and returns its address, a common Go pattern for avoiding expensive copies of large structs.

**BAD vs GOOD comparison:**

```go
// ❌ BAD — nil pointer dereference; panics at runtime
func bad_use() {
	var p *int        // p is nil by default
	*p = 100          /* PANIC: runtime error: invalid memory address or nil pointer */
}

// ✅ GOOD — check for nil before any dereference
func good_use() {
	var p *int
	if p != nil {
		*p = 100
	} else {
		// Handle the nil case gracefully
		fmt.Println("Pointer is nil, allocating new value")
		p = new(int) // Allocates and returns a pointer to zero-valued int
		*p = 100
	}
}

// ❌ BAD — taking address of a function-local variable that may not escape safely
func bad_address_of_temp() {
	x := computeValue()
	go func() {
		fmt.Println(x)  /* Correct: copies value, no pointer needed */
	}()
	// Don't need &x here — copying is safer and simpler in Go
}

// ✅ GOOD — use pointers only when mutation or avoiding copy is required
func good_address_of_temp() {
	result := computeValue()
	processByPointer(&result) // Pass address explicitly; caller retains ownership
}

func processByPointer(p *int) {
	if p == nil {
		return
	}
	fmt.Println(*p)
}
```

---

## Constraints

### MUST DO

1. **Always parenthesize `&` in mixed-operator expressions** — Write `(flags & MASK) != 0`, never `flags & MASK != 0`. The precedence of `&` varies across languages and mixing it with comparisons, arithmetic, or logical operators without parentheses produces subtle bugs that are difficult to diagnose.

2. **Compare bitwise results against zero, not against flag constants** — `(flags & FLAG) != 0` is the universally correct idiom. Comparing `(flags & FLAG) == FLAG` happens to work when only one flag could match but fails logically when multiple flags are set simultaneously, because `flags & (FLAG_A | FLAG_B)` may produce a value different from either constant individually.

3. **Guard all pointer dereferences with null/nil checks** — Every use of `*ptr` in C, Go, or any language supporting nullable pointers must be preceded by an explicit check that the pointer is not null/nil. In Rust, rely on the borrow checker at compile time; do not call `unwrap()` on a reference derived from raw pointers without validation.

4. **Use consistent bit numbering for flag definitions** — Start with `(1 << 0)` for the first flag and increment sequentially. Document which bit positions correspond to which flags in a comment or enum definition so that anyone reading the code can verify flag assignments are non-overlapping.

5. **Validate bitmask width before applying masks** — Ensure the mask value fits within the integer type's width. In C, unsigned types do not sign-extend on right shift (`>>`), but signed types may behave unpredictably depending on the implementation. Use `uint32_t` or `uint64_t` explicitly to avoid platform-dependent behavior.

6. **Use address-of only with l-values (modifiable locations)** — Never apply `&` to literals, temporary expressions, or function return values in C/C++. These are r-values with no persistent memory location. In Go, taking the address of a local variable is safe as the compiler may promote it to the heap automatically.

7. **In Rust, respect borrowing rules strictly** — Immutable borrows (`&T`) may coexist; mutable borrows (`&mut T`) require exclusive access. The borrow checker enforces this at compile time. Do not attempt to circumvent these rules with `unsafe` blocks unless absolutely necessary and fully justified with comments explaining why safe Rust cannot express the operation.

### MUST NOT DO

1. **Never confuse `&` with `&&` (logical AND)** — Bitwise AND operates on individual bits of integer operands. Logical AND (`&&`) evaluates boolean expressions with short-circuit semantics. Using `&` for conditionals is slower and evaluates both operands, potentially causing side effects or unnecessary computation.

2. **Never dereference a dangling pointer or stale reference** — Taking the address of a local variable in one function and returning it from another creates a dangling pointer because the stack frame is destroyed when the function returns. The behavior is undefined in C/C++ and can cause heap corruption or information leaks.

3. **Never mix `&` between incompatible types** — Do not apply bitwise AND to floats, strings, or objects (except Python's set intersection). Attempting it raises a `TypeError` (Python), compilation error (C/C++/Rust/Go), or silently truncates the value due to implicit conversion in permissive compilers.

4. **Never assume `&` has the same precedence across languages** — In C/C++, `&` has lower precedence than `==` but higher than `&&`. In Python, it is identical to C's precedence. In Rust, `&` for borrows is a prefix unary operator with no precedence conflicts. Always consult the language specification or use parentheses to be safe.

5. **Never create multiple simultaneous mutable borrows in Rust** — Having two `&mut T` references to the same data violates Rust's aliasing rules and will not compile. This rule prevents data races at compile time; do not attempt to bypass it with raw pointer casting (`&raw mut`) without full understanding of unsafe semantics.

6. **Never use `&` for address-of on a function call result in C/C++** — Expressions like `&malloc(sizeof(int))` are legal (because the returned value is an l-value after the call completes), but taking the address of a temporary or literal like `&42` is undefined behavior. Be explicit: assign to a variable first, then take its address.

7. **Never pass a raw pointer without documenting ownership semantics** — When a function receives a pointer (especially in Go and C), the caller must know whether the function takes ownership, borrows temporarily, or frees the pointed-to memory. Undocumented pointer usage leads to double-free bugs and memory leaks.

---

## Output Template

When this skill is active, the model's output should follow this structure:

1. **Language specification** — State which programming language the code targets (e.g., "C", "Python", "Go", "Rust", "C++"). If multiple languages are involved, specify each one clearly.

2. **Operation type classification** — Identify which category of `&` usage applies: bitwise AND for flag checking, bitmask construction/validation, address-of / pointer operations, reference binding, set intersection, or a combination.

3. **Complete, runnable code example** — Provide the full implementation with proper types, comments explaining each significant step, error handling for null/nil pointers, and test cases demonstrating both success and edge-case paths. Code must compile or run without errors.

4. **Explanation of correctness and safety** — Briefly explain why the code is correct (e.g., "parentheses ensure correct precedence", "nil check prevents dereference panic"), what memory or lifetime guarantees hold, and any gotchas specific to the chosen language's semantics.

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-bitwise-operations` | Broader bitwise operations beyond just AND (OR `|`, XOR `^`, NOT `~`, left/right shifts `<<`, `>>`) for complete bitmask manipulation |
| `coding-error-handling` | Safe memory error handling when using pointers/references — null checks, panic recovery in Go, Result types in Rust, and RAII patterns in C++ |
