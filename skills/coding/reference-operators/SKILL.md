---
name: reference-operators
description: Implements reference (&) and address-of operators across C++, Rust, C#,
  and PHP for safe memory access, parameter passing, and pointer arithmetic.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: coding
  triggers: reference operator, address of, pass by reference, & operator, pointer,
    dangling reference, borrowed reference, mutable reference, C++ references, Rust
    lifetimes, PHP references, C# ref out, memory safety, rvalue reference
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
  related-skills: bitwise-masks,smart-pointers,lifetime-annotation
---
# Reference and Address-Of Operators

Implements reference (&) and address-of operators for safe memory access, parameter passing, and pointer arithmetic. These operators enable efficient data sharing across language boundaries while enforcing different safety guarantees depending on the target language.

## TL;DR Checklist

- [ ] Distinguish between `&` (reference/address-of), `*` (dereference), and `&&` (rvalue reference in C++)
- [ ] Prefer pass-by-reference (`const T&`) for large objects to avoid expensive copies
- [ ] Never return a reference to a local variable — this creates dangling references immediately
- [ ] In Rust: distinguish `&T` (immutable borrow) from `&mut T` (mutable borrow with exclusive access)
- [ ] In C++: use `const T&` for read-only access, non-const `T&` for intentional in-place modification

---

## When to Use

Use this skill when:

- Passing large objects (containers, strings, complex structs) by reference to avoid costly deep copies across function boundaries
- Implementing in-place modification of function arguments without returning new values from the function
- Accessing memory-mapped I/O regions or hardware registers via raw address calculations
- Building linked data structures (trees, graphs, linked lists) where nodes need mutable references to children
- Interfacing with C/C++ libraries that expect pointer or reference parameters for output values

---

## When NOT to Use

Avoid this skill for:

- Simple scalar types (int, float, bool, char) — passing by value is faster due to register allocation and eliminates aliasing concerns
- Situations where ownership semantics must be explicit — use smart pointers (`unique_ptr`, `shared_ptr`) or Rust's owned types instead
- Cross-thread data sharing without proper synchronization primitives — dangling references across threads cause undefined behavior
- Languages that do not support native references (Java uses object references, Python uses name binding, Go uses pointers with GC)

---

## Core Workflow

1. **Choose the Right Reference Variant** — Decide between immutable reference (`const T&` in C++, `&T` in Rust), mutable reference (`T&` / `&mut T`), or raw pointer when the target might be absent. Immutable references allow concurrent read access; mutable references guarantee exclusive write access.
   **Checkpoint:** Verify that every caller understands whether the reference grants read-only observation or permits in-place mutation of the underlying data.

2. **Declare the Reference Operator** — Place `&` before the parameter type or variable name. In C++: `void process(const std::string& input)`. In Rust: `fn transform(data: &mut Vec<i32>)`. In C#: `void Modify(ref int value)`.
   **Checkpoint:** Confirm that the referenced data's lifetime strictly exceeds all dereference operations within the function body.

3. **Handle Absence with Option/Pointer Types** — If the referenced value might not exist, use pointers (`T*`, `nullptr`) or Rust's `Option<&T>` instead of bare references. C++ and Rust references are guaranteed non-null by their type signatures.
   **Checkpoint:** Add explicit null checks (`if (ptr != nullptr)`) before dereferencing raw pointers, or pattern match on `Option` in Rust.

4. **Bind to Existing Memory with Address-Of** — Use the address-of operator (`&variable`) to obtain a reference to an existing variable on the stack or heap. In C++, you can also take the address of a temporary only through an rvalue reference (`T&&`).
   **Checkpoint:** Verify the source variable outlives every reference and pointer derived from it — no references may survive the death of their source.

5. **Dereference with Safety Guards** — Use `*reference` (C/C++) or Rust's auto-deref / `.as_ref()` to access underlying values. In Rust, the borrow checker enforces at compile time that you cannot hold a mutable reference and any other reference simultaneously.
   **Checkpoint:** Ensure no aliasing violations exist — in safe Rust, having `&mut T` invalidates all existing `&T` borrows of the same data before the mutation begins.

6. **Validate Lifetime Guarantees with Tools** — In C++, run AddressSanitizer (`-fsanitize=address`) and Valgrind to detect dangling references at runtime. In Rust, compile in release mode and run tests — the borrow checker catches most lifetime errors at compile time.
   **Checkpoint:** Exercise edge cases where objects might be destroyed early or go out of scope before all references are released.

---

## Implementation Patterns

### Pattern 1: C++ Reference Semantics

```cpp
#include <iostream>
#include <string>
#include <vector>
#include <algorithm>

// Immutable reference — read-only access, no copy overhead
void print_collection(const std::vector<int>& data) {
    for (const auto& item : data) {
        std::cout << item << " ";  // const auto& avoids copying each element during iteration
    }
    std::cout << "\n";
}

// Mutable reference — allows in-place modification of caller's data
void transform_values(std::vector<int>& data, int multiplier) {
    for (auto& item : data) {  // auto& gives mutable reference to each element
        item *= multiplier;     // Modifies the original vector directly
    }
}

// Reference parameters with structured defaults
struct Config {
    int timeout_ms;
    bool debug_mode;
};

void apply_config(Config& config, const Config& defaults) {
    // Merge: use default values only where caller's config is unset
    if (config.timeout_ms == 0) config.timeout_ms = defaults.timeout_ms;
}

// ❌ DANGEROUS — returning reference to a local stack variable creates a dangling reference
const std::string& bad_reference_return(int value) {
    std::string result = "Value: " + std::to_string(value);  // Local variable on stack
    return result;  // BUG: returns reference to an object destroyed when function exits
}

// ✅ SAFE — return by value (Small String Optimization may avoid heap allocation for short strings)
std::string safe_value_return(int value) {
    return "Value: " + std::to_string(value);
}

// Address-of operator usage with smart pointers
void process_data(std::unique_ptr<std::vector<int>>& data_ref) {
    if (data_ref) {
        // Dereference and modify through reference to unique_ptr
        data_ref->push_back(42);
    }
}

int main() {
    std::vector<int> numbers = {1, 2, 3, 4, 5};
    
    print_collection(numbers);           // Read-only via const& — no copy
    transform_values(numbers, 10);       // In-place mutation via & — efficient
    
    Config defaults{5000, false};
    Config user_config{0, true};
    apply_config(user_config, defaults); // Merges defaults via reference parameter
    
    // Compile with: g++ -std=c++17 -Wall -Wextra -fsanitize=address main.cpp
    return 0;
}
```

### Pattern 2: Rust Borrowing and Lifetime Rules

```rust
/// Demonstrate immutable borrows (&T) and mutable borrows (&mut T).
/// Rust's borrow checker enforces these compile-time rules:
///   - Any number of &T (immutable borrows) OR exactly one &mut T (mutable borrow)
///   - References must always point to valid data — no dangling references in safe Rust
///   - A mutable borrow invalidates all existing immutable borrows

struct Record {
    id: u64,
    name: String,
    score: f32,
}

// Immutable borrow — multiple callers can hold &Record simultaneously
fn get_name(record: &Record) -> &str {
    &record.name  // Returns a reference tied to the input's lifetime via elision
}

// Mutable borrow — exclusive access; no other references allowed while active
fn update_score(record: &mut Record, new_score: f32) {
    record.score = new_score;  // Compiler enforces this is the sole mutable access point
}

/// Lifetime elision: compiler infers that output reference lives as long as input.
/// The explicit signature would be: fn top_scoring<'a>(records: &'a [Record]) -> &'a Record
fn top_scoring(records: &[Record]) -> &Record {
    records.iter()
        .max_by(|a, b| a.score.partial_cmp(&b.score).unwrap())
        .expect("top_scoring requires a non-empty collection")
}

/// Explicit lifetime annotation when output could come from either input reference
fn longest_string<'a>(s1: &'a str, s2: &'a str) -> &'a str {
    if s1.len() >= s2.len() { s1 } else { s2 }
}

/// ✅ SAFE — Rust compiler prevents returning references to local data at compile time
fn create_record(id: u64, name: &str) -> Record {
    Record {
        id,
        name: name.to_string(),  // Ownership transfer: String owns the heap data
        score: 0.0,
    }
}

/// ✅ SAFE — Option<&T> pattern for references that may not exist
fn find_record_by_id(records: &[Record], target_id: u64) -> Option<&Record> {
    records.iter().find(|r| r.id == target_id)
}

// Safe borrowing exercise showing borrow checker enforcement:
fn demonstrate_borrowing() {
    let mut record = Record { id: 1, name: "Alice".to_string(), score: 95.5 };
    
    // Immutable borrows can coexist
    let name_ref = get_name(&record);      // &Record borrow starts
    println!("Name: {}", name_ref);
    drop(name_ref);                         // Explicit end of immutable borrow (not required, but shows concept)
    
    // Mutable borrow — no other references may exist
    update_score(&mut record, 98.0);       // &mut Record borrow, exclusive access
    
    // Find by ID returns Option<&Record> — handle absence with pattern matching
    match find_record_by_id(&[record.clone()], 1) {
        Some(found) => println!("Found: {} (score: {})", found.name, found.score),
        None => println!("Record not found"),
    }
}
```

### Pattern 3: C# ref and out Parameter Patterns

```csharp
using System;
using System.Collections.Generic;

class ReferencePatterns {
    
    // ref parameter — caller must initialize before passing; callee can read and modify
    static void Swap(ref int a, ref int b) {
        int temp = a;
        a = b;
        b = temp;
    }
    
    // out parameter — caller does NOT need to initialize; callee MUST assign before returning
    static bool TryParseScore(string input, out double score) {
        if (double.TryParse(input, out score)) {
            return true;
        }
        score = 0.0;  // Required: out parameters must always be assigned on every path
        return false;
    }
    
    // In-place list modification via reference to collection
    static void FilterScores(List<double> scores, double minThreshold) {
        scores.RemoveAll(s => s < minThreshold);  // Modifies caller's list directly
    }
    
    // Using ref for performance-critical value types (avoids copying large structs)
    struct Point2D {
        public float X, Y;
        
        public override string ToString() => $"({X}, {Y})";
    }
    
    static void Translate(ref Point2D point, float dx, float dy) {
        point.X += dx;  // Modifies caller's struct instance without copying the entire value type
        point.Y += dy;
    }
    
    // Nullable reference patterns using ? for possible-null objects
    static string GetOrDefault(List<string> items, int index, string defaultValue) {
        return index >= 0 && index < items.Count ? items[index] : defaultValue;
    }
}

// Usage examples demonstrating ref/out semantics:
class Program {
    static void Main() {
        // ref — must initialize before passing
        int x = 10, y = 20;
        ReferencePatterns.Swap(ref x, ref y);
        Console.WriteLine($"x={x}, y={y}");  // x=20, y=10
        
        // out — no initialization needed by caller
        if (ReferencePatterns.TryParseScore("95.5", out double score)) {
            Console.WriteLine($"Parsed score: {score}");  // Parsed score: 95.5
        }
        
        // ref with structs — avoids copying large value types
        Point2D pt = new Point2D { X = 1.0f, Y = 2.0f };
        ReferencePatterns.Translate(ref pt, 3.0f, 4.0f);
        Console.WriteLine(pt);  // (4, 6)
    }
}
```

### Pattern 4: Cross-Language Safety Anti-Patterns (BAD vs. GOOD)

```cpp
// ❌ BAD — returning a reference to a temporary string creates a dangling reference
const std::string& bad_dangling_temporary() {
    return std::string("hello world");  // Temporary destroyed at end of full expression
}

// ❌ BAD — iterator invalidation via erase inside loop causes undefined behavior
void bad_iterator_modification(std::vector<int>& vec) {
    for (auto it = vec.begin(); it != vec.end(); ++it) {
        if (*it % 2 == 0) {
            vec.erase(it);  // INVALID: erasing invalidates the iterator, loop continues with UB
        }
    }
}

// ❌ BAD — returning address of a stack-allocated array leaks dangling pointer
const int* bad_stack_pointer_return() {
    int local[] = {1, 2, 3};
    return local;  // UB: pointer to memory that is destroyed when function returns
}

// ✅ SAFE — ERASE IDIOM for safe in-place vector modification (C++11 and later)
void good_iterator_modification(std::vector<int>& vec) {
    vec.erase(
        std::remove_if(vec.begin(), vec.end(), [](int n){ return n % 2 == 0; }),
        vec.end()
    );
}

// ✅ SAFE — heap allocation with smart pointer for returned data ownership transfer
std::unique_ptr<int[]> good_heap_pointer_return() {
    auto data = std::make_unique<int[]>(3);
    data[0] = 1; data[1] = 2; data[2] = 3;
    return data;  // Ownership transferred via move semantics, memory managed automatically
}

// ✅ SAFE — Rust prevents returning references to local data at compile time (would not compile)
fn safe_owned_return(id: u64) -> Record {
    Record { id, name: "temp".to_string(), score: 0.0 }  // Returns owned value, no reference escaping
}

// ❌ BAD — Rust: attempting to mutate through an immutable borrow does not compile
fn bad_immutable_mutate(data: &Vec<i32>) -> Vec<i32> {
    let mut local_copy = data.clone();  // This clones the entire vector (expensive!)
    local_copy.push(42);
    return local_copy;  // Returns copy, original unchanged — defeats purpose of reference passing
}

// ✅ GOOD — Rust: mutable borrow for direct in-place modification of caller's data
fn good_mutable_borrow(data: &mut Vec<i32>) {
    data.push(42);  // Directly modifies the original vector through mutable reference
}
```

---

## Constraints

### MUST DO
- Always distinguish between immutable references (`const T&` in C++, `&T` in Rust) and mutable references (`T&` / `&mut T`) in documentation and function signatures
- Use smart pointers (`std::unique_ptr`, `std::shared_ptr`) instead of raw owning pointers when ownership transfer or automatic cleanup is needed
- In Rust: let the borrow checker enforce lifetime rules — avoid `unsafe` blocks for reference manipulation unless absolutely necessary for FFI or performance-critical code
- In C++: prefer `const T&` for read-only parameters to avoid copies while guaranteeing no modification; reserve non-const `T&` only for intentional in-place mutation
- Document which function parameters modify their arguments via reference so callers are not surprised by side effects

### MUST NOT DO
- Never return a reference or pointer to a local stack variable — the referenced memory is destroyed when the function returns, creating immediate undefined behavior
- Dereference a null or invalid reference without explicit validation — always check pointers against `nullptr` before `*ptr`, or use `Option` patterns in Rust
- Use references for trivially-copyable scalar types (`int`, `float`, `bool`, `char`) — pass-by-value is faster due to register allocation and eliminates all aliasing concerns
- Mix C-style raw pointer arithmetic with Rust's borrow checker expectations — this requires `unsafe` blocks and should only be used for FFI or specific zero-copy scenarios

---

## Output Template

When implementing or reviewing reference/pointer patterns, produce:

1. **Reference Type Selection** — immutable (`&T`, `const T&`) vs mutable (`&mut T`, `T&`) vs pointer (`*T`, `T*`), with justification based on whether the data is owned, borrowed, or may be absent
2. **Lifetime Analysis** — How long the referenced data lives relative to every point where the reference is dereferenced or used
3. **Null / Absence Handling Strategy** — How missing or invalid references are handled: `Option<&T>` in Rust, `nullptr` checks in C++, nullable types in C#
4. **Ownership Model Documentation** — Which entity owns the underlying data and which code paths merely borrow it temporarily
5. **Sanitizer and Testing Recommendations** — AddressSanitizer (`-fsanitize=address`) for C++, Miri or Clippy for Rust, Valgrind as a cross-platform fallback

---

## Related Skills

| Skill | Purpose |
|---|---|
| `bitwise-masks` | Low-level flag and permission bitmask operations using the & operator for state management |
| `smart-pointers` | Modern ownership patterns with unique_ptr, shared_ptr, and Box for safe heap memory management |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Wikipedia — Operator (Programming) Overview](https://en.wikipedia.org/wiki/Operator_(programming))
- [Cplusplus.com Tutorial — Operators Reference](https://www.cplusplus.com/doc/tutorial/operators/)
- [cppreference — C++ Reference & Address-of Operators](https://en.cppreference.com/w/cpp/language/operator_member_access)
- [Mozilla MDN Web Docs — JavaScript & and && Operators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_AND)
- [Rust Language Reference — References and Borrowing](https://doc.rust-lang.org/book/ch04-02-references-and-borrowing.html)
