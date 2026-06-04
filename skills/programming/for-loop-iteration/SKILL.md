---
name: for-loop-iteration
description: Teaches idiomatic for loop patterns across Python, JavaScript, Go, C/C++,
  Rust, and shell scripting with anti-patterns, common pitfalls, and best practices.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: programming
  triggers: for loop, iteration, loop patterns, enumerate, range, iterator, list comprehension,
    index-based loop, how do i iterate over a collection
  archetypes:
  - educational
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: medium
    directive_strength: medium
    abstraction_level: tactical
  role: reference
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - examples
  - diagrams
  related-skills: algorithms, sorting-algorithms
---
# For Loop Iteration Patterns

Teaches idiomatic for loop iteration patterns across multiple programming languages, helping you choose the right iteration style for each language and problem. Covers index-based loops, range-based iteration, iterator protocols, list comprehensions, and shell scripting loops — with BAD vs GOOD comparisons and language-specific anti-patterns.

## TL;DR Checklist

- [ ] Choose the most idiomatic loop construct for the target language (e.g., `for...of` in JS, `range()` in Python)
- [ ] Prefer iterating over values directly instead of indices when index is not needed
- [ ] Avoid modifying a collection while iterating — collect changes and apply after
- [ ] Guard against off-by-one errors by verifying boundary conditions explicitly
- [ ] Use language-native iterators (enumerate, zip, range, iterators) before manual counters

---

## When to Use

Use this skill when:

- Implementing iteration logic over arrays, slices, maps, or collections in any language
- Choosing between index-based loops, iterator-based loops, and functional patterns (comprehensions, map/filter)
- Converting loop logic from one language to another and seeking idiomatic equivalents
- Debugging common iteration bugs: off-by-one errors, modifying collections mid-loop, iterator invalidation
- Writing performance-sensitive loops where the iteration pattern affects cache locality or allocation
- Building data transformation pipelines that process elements sequentially

---

## When NOT to Use

Avoid for loop patterns in these situations:

- **Stream/async iteration** — use async iterators, generators, or reactive streams instead of blocking for loops
- **Event-driven processing** — use callbacks, event emitters, or message queues rather than polling loops
- **Infinite polling with busy-wait** — use sleep/yield between polls or observables to avoid CPU spinning
- **Complex nested iteration** — consider declarative data structures (join on maps/dicts) instead of O(n²) nested loops

---

## Core Workflow

1. **Identify the iteration goal** — Determine whether you need indices, values, both, keyed access, or parallel iteration. **Checkpoint:** If you only need values, skip index-based patterns and use native iterators (enumerate, for...of, range, direct iterator).

2. **Select the language-native construct** — Each language has one most-idiomatic approach:
   - Python: `for item in iterable` or list comprehensions
   - JavaScript: `for...of` over arrays; avoid `for...in` on arrays
   - Go: single `for` with `range` over slices, maps, channels
   - C/C++: range-based for (C++) or index-based loop with bounds checking
   - Rust: immutable `.iter()`, mutable `.iter_mut()`, or `.into_iter()`
   - Shell: `for item in list` or C-style `for ((i=0; i<n; i++))`

3. **Implement the iteration body** — Write the core logic inside the loop. **Checkpoint:** Verify the loop body does not mutate the collection being iterated over unless using a deliberate safe pattern (see anti-patterns below).

4. **Handle edge cases** — Empty collections, single-element collections, and boundary conditions. **Checkpoint:** Add a guard clause or assert for empty input when the semantics require at least one element.

5. **Choose aggregation style** — Decide whether to accumulate results via append/collect, use a list/dict comprehension, or apply functional transforms (map/filter/fold). **Checkpoint:** Prefer declarative comprehensions when transforming an entire collection without early exit conditions.

6. **Verify correctness** — Test with empty input, single element, typical data, and boundary values. **Checkpoint:** For index-based loops, manually trace first, middle, and last iterations to confirm bounds are correct.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Python for Loop

Python offers multiple iteration idioms. The core principle is "iterate over values directly; reach for indices only when you actually need them."

```python
from typing import Any

# ✅ GOOD — iterate over values directly (most Pythonic)
def print_items(items: list[str]) -> None:
    """Print each item in the collection."""
    for item in items:
        print(item)


# ✅ GOOD — when index is needed, use enumerate
def indexed_display(items: list[str]) -> list[tuple[int, str]]:
    """Return a list of (index, value) pairs."""
    return [(i, item) for i, item in enumerate(items)]


# ✅ GOOD — range-based iteration (useful for step or index math)
def every_second_element(values: list[float]) -> list[float]:
    """Return elements at even indices using range with a step."""
    result: list[float] = []
    for i in range(0, len(values), 2):
        result.append(values[i])
    return result


# ✅ GOOD — list comprehension (preferred over explicit loop for transforms)
def squared_positive(numbers: list[float]) -> list[float]:
    """Return squared values, filtering out negatives."""
    return [n ** 2 for n in numbers if n >= 0]


# ❌ BAD — index-based loop when value iteration suffices
def bad_print_items(items: list[str]) -> None:
    for i in range(len(items)):      # Unnecessary len() call
        print(items[i])               # Double indexing instead of direct access


# ❌ BAD — modifying collection while iterating (RuntimeError or undefined behavior)
def bad_remove_evens(values: list[int]) -> list[int]:
    for v in values:                  # Modifying 'values' during iteration is unsafe
        if v % 2 == 0:
            values.remove(v)          # RuntimeError or skipped elements
    return values
```

**Key Python principles:**
- Prefer `for item in collection` over `range(len(collection))` — it avoids double indexing and works with any iterable (not just sequences)
- Use `enumerate()` when both index and value are needed
- Use list/dict comprehensions for simple transforms — they are faster than explicit `for` + `append`
- Never modify a list while iterating over it; use filtering instead: `[x for x in lst if condition(x)]`

---

### Pattern 2: JavaScript for Loop

JavaScript has three loop constructs for iteration. The modern standard favors `for...of` and array methods over the classic C-style loop.

```javascript
// ✅ GOOD — for...of iterates over values (arrays, strings, Maps, Sets)
function printItems(items) {
    for (const item of items) {
        console.log(item);
    }
}


// ✅ GOOD — for...of with destructuring (array of objects)
function logNames(users) {
    for (const { name, role } of users) {
        console.log(`${name}: ${role}`);
    }
}


// ✅ GOOD — traditional C-style for when you need the index
function doubleEveryOther(numbers) {
    const result = [];
    for (let i = 0; i < numbers.length; i++) {
        if (i % 2 === 1) {
            result.push(numbers[i] * 2);
        } else {
            result.push(numbers[i]);
        }
    }
    return result;
}


// ✅ GOOD — for...of with break/continue for early exit
function findFirstEven(items) {
    for (const item of items) {
        if (item % 2 === 0) {
            return item;       // Early exit on first match
        }
    }
    return null;               // No even number found
}


// ❌ BAD — for...in iterates over enumerable property keys, NOT array values
function bad_forInLoop(items) {
    const results = [];
    for (const index in items) {       // Iterates over "0", "1", "2" as strings
        results.push(items[index] * 2);   // index is a string! Unexpected behavior
    }
    return results;
}

// ❌ BAD — modifying array during for...of iteration (skipped elements)
function bad_removeFalsy(arr) {
    for (const val of arr) {           // Modifying arr during iteration skips items
        if (!val) {
            arr = arr.filter(v => v);  // Creates new array, but loop still runs on old state conceptually
        }
    }
}


// ✅ GOOD — use array methods instead of loops for common transforms
function filterActiveUsers(users) {
    return users.filter(user => user.active);
}

function transformPrices(prices, taxRate) {
    return prices.map(price => price * (1 + taxRate));
}
```

**Key JavaScript principles:**
- `for...of` iterates over **values** — use this for arrays, strings, Maps, Sets
- `for...in` iterates over **enumerable property keys** — NEVER use it on arrays; only on plain objects
- C-style `for` is fine when you need the index or a custom step
- Modern JS: prefer `Array.prototype.map`, `.filter()`, `.reduce()` for collection transforms
- Use `const` instead of `let` in `for...of` since the variable is re-assigned each iteration

---

### Pattern 3: Go for Loop

Go has only one loop construct: `for`. Its flexibility comes from `range` over slices, maps, channels, and strings.

```go
package main

import "fmt"

// ✅ GOOD — range over slice with index and value
func printItems(items []string) {
    for i, item := range items {
        fmt.Printf("%d: %s\n", i, item)
    }
}


// ✅ GOOD — ignore unused index variable with blank identifier
func sumValues(numbers []int) int {
    total := 0
    for _, val := range numbers {    // '_' discards the index
        total += val
    }
    return total
}


// ✅ GOOD — range over map (key-value pairs)
func printMapEntries(entries map[string]int) {
    for key, value := range entries {
        fmt.Printf("%s = %d\n", key, value)
    }
}


// ✅ GOOD — C-style for loop when you need custom control (step, reverse iteration)
func doubleEvenIndices(numbers []int) []int {
    result := make([]int, len(numbers))
    for i := 0; i < len(numbers); i += 2 {  // Step of 2
        result[i] = numbers[i] * 2
    }
    return result
}


// ✅ GOOD — range over channel (reads until closed)
func sumFromChannel(ch <-chan int) int {
    total := 0
    for val := range ch {       // Reads until channel is closed
        total += val
    }
    return total
}


// ❌ BAD — using index-based access when range provides values directly
func bad_printItems(items []string) {
    for i := 0; i < len(items); i++ {      // Unnecessary manual indexing
        fmt.Println(items[i])               // Double lookup instead of direct value
    }
}


// ❌ BAD — not handling empty slice gracefully
func bad_maxValue(numbers []int) int {
    maxVal := numbers[0]                    // Panic on empty slice!
    for _, val := range numbers {
        if val > maxVal {
            maxVal = val
        }
    }
    return maxVal
}


// ✅ GOOD — handle empty input defensively
func safeMaxValue(numbers []int) (int, error) {
    if len(numbers) == 0 {
        return 0, fmt.Errorf("cannot find max of empty slice")
    }
    maxVal := numbers[0]
    for _, val := range numbers[1:] {
        if val > maxVal {
            maxVal = val
        }
    }
    return maxVal, nil
}
```

**Key Go principles:**
- Go's `for` is the only loop construct — no `while`, `do...while`, or `foreach`
- `for i, v := range slice` gives you both index and value; use `_` to discard unused ones
- `for range ch` reads from a channel until it closes
- C-style `for` is idiomatic when you need custom increment steps (e.g., iterating by 2, reversing)
- Always handle empty slices before accessing by index to avoid panics

---

### Pattern 4: C/C++ for Loop

C uses the classic C-style loop exclusively. C++ adds range-based for loops and STL iterators.

```cpp
// === C-Style (C and C++) ===

// ✅ GOOD — traditional index-based loop with bounds checking
void print_array(const int* arr, size_t len) {
    if (arr == nullptr || len == 0) {
        return;  // Guard against null/empty
    }
    for (size_t i = 0; i < len; ++i) {   // Use size_t to avoid signedness warnings
        printf("%d\n", arr[i]);
    }
}


// ✅ GOOD — reverse iteration (common pattern in C/C++)
void process_in_reverse(const double* data, size_t len) {
    for (size_t i = len; i > 0; --i) {   // Post-decrement stops at 0 safely
        printf("%.2f\n", data[i - 1]);   // Adjust index since loop ends at 1
    }
}


// === C++ with STL Containers ===

#include <vector>
#include <string>
#include <map>
#include <algorithm>

// ✅ GOOD — range-based for (C++11+) iterates over values directly
void print_names(const std::vector<std::string>& names) {
    for (const auto& name : names) {     // const ref avoids copy
        std::cout << name << '\n';
    }
}


// ✅ GOOD — range-based for with structured binding (C++17+)
void print_scores(const std::map<std::string, int>& scores) {
    for (const auto& [name, score] : scores) {  // Structured binding
        std::cout << name << ": " << score << '\n';
    }
}


// ✅ GOOD — modifying elements requires mutable reference
void double_scores(std::vector<int>& scores) {
    for (int& score : scores) {           // Non-const ref allows modification
        score *= 2;
    }
}


// ✅ GOOD — iterator-based loop for STL containers (useful with erase-if pattern)
void remove_negatives(std::vector<int>& values) {
    auto it = values.begin();
    while (it != values.end()) {
        if (*it < 0) {
            it = values.erase(it);       // erase returns next valid iterator
        } else {
            ++it;
        }
    }
}


// ❌ BAD — using index on vector when range-based for suffices
void bad_print_vec(const std::vector<int>& vec) {
    for (size_t i = 0; i < vec.size(); ++i) {  // Unnecessary indexing
        std::cout << vec[i] << '\n';             // Random access overhead
    }
}


// ❌ BAD — erase during range-based for loop (iterator invalidation!)
void bad_remove_zeros(std::vector<int>& values) {
    for (auto val : values) {           // Copy, not iterator
        if (val == 0) {
            values.erase(/* ??? */);    // Cannot safely erase here — iterators invalidated
        }
    }
}


// ❌ BAD — signed/unsigned comparison warning
void bad_signed_loop(const std::vector<int>& data) {
    for (int i = 0; i < data.size(); ++i) {  // int vs size_t comparison!
        printf("%d\n", data[i]);
    }
}
```

**Key C/C++ principles:**
- In C, the `for` loop is your only iteration tool — manage bounds and increments manually
- Always use `size_t` for indices into arrays/vectors (avoid signed/unsigned mismatch)
- C++ range-based for loops (`for (const auto& x : container)`) are idiomatic and avoid manual indexing
- When erasing from a vector, use the iterator pattern (Erase–Remove Idiom or explicit iterator tracking) — never erase during a range-based loop
- Use `const auto&` in range-for to avoid copying large objects

---

### Pattern 5: Rust for Loop

Rust provides multiple iteration strategies with different ownership semantics. Choosing the right one prevents unnecessary allocations and borrow checker errors.

```rust
// ✅ GOOD — immutable iteration via .iter() (borrows elements)
fn print_items(items: &[String]) {
    for item in items.iter() {           // Borrows each element immutably
        println!("{item}");
    }
}


// ✅ GOOD — concise range-based iteration (Rust auto-delegates to .into_iter())
fn sum_numbers(numbers: &[i32]) -> i32 {
    let mut total = 0;
    for &num in numbers {                 // Destructures by value (i32 is Copy)
        total += num;
    }
    total
}


// ✅ GOOD — mutable iteration via .iter_mut()
fn double_values(values: &mut Vec<i32>) {
    for val in values.iter_mut() {       // Borrows each element mutably
        *val *= 2;
    }
}


// ✅ GOOD — enumerate (index + value) with proper destructuring
fn indexed_display(items: &[String]) -> Vec<(usize, &String)> {
    items.iter().enumerate().collect()   // Returns [(0, &"a"), (1, &"b"), ...]
}


// ✅ GOOD — zip combines two iterables side by side
fn add_vectors(a: &[f64], b: &[f64]) -> Vec<f64> {
    a.iter().zip(b.iter())
        .map(|(&x, &y)| x + y)
        .collect()
}


// ✅ GOOD — into_iter() consumes the collection (moves elements out)
fn consume_and_uppercase(list: Vec<String>) -> Vec<String> {
    let mut result = Vec::new();
    for mut s in list.into_iter() {       // Takes ownership of each String
        s.make_ascii_uppercase();         // Can mutate since we own the string
        result.push(s);
    }
    result
}


// ✅ GOOD — iterator chain with filter and map (functional style)
fn positive_squares(numbers: &[i32]) -> Vec<i32> {
    numbers.iter()
        .filter(|&&n| n > 0)             // Filter out negatives
        .map(|&n| n * n)                 // Square each remaining value
        .collect()                       // Collect into Vec<i32>
}


// ❌ BAD — indexing in a loop when iteration suffices (panics on out-of-bounds!)
fn bad_print_items(items: &[String]) {
    for i in 0..items.len() {             // Unsafe index access
        println!("{}", items[i]);         // Can panic if len == 0 and we access beyond
    }
}


// ❌ BAD — collecting into a new Vec inside an explicit loop when iterator methods exist
fn bad_double_values(values: &[i32]) -> Vec<i32> {
    let mut result = Vec::new();
    for i in 0..values.len() {            // Index-based with manual accumulation
        result.push(values[i] * 2);       // Unnecessary allocation overhead
    }
    result
}
```

**Key Rust principles:**
- `.iter()` — borrows elements immutably (most common, most flexible)
- `.iter_mut()` — borrows elements mutably (use when you need to modify in place)
- `.into_iter()` — takes ownership (move semantics), consumes the collection
- For primitive `Copy` types (`i32`, `f64`, bool), `for val in slice` automatically moves/copies values
- Use iterator adapters (`.map()`, `.filter()`, `.zip()`, `.enumerate()`) for composable, zero-cost-abstraction pipelines
- Indexing with `[i]` can panic; prefer iterators unless you specifically need random access

---

### Pattern 6: Shell Scripting for Loop

Shell `for` loops iterate over word-split lists. They handle files, variables, and command output. Understanding word splitting is critical for correctness.

```bash
#!/usr/bin/env bash
# Shell for-loop patterns — POSIX-compatible with bash extensions noted

# ✅ GOOD — iterating over a glob pattern (filenames)
function list_text_files() {
    local directory="${1:-.}"
    for filepath in "$directory"/*.txt; do     # Quotes protect spaces in filenames
        if [[ -f "$filepath" ]]; then           # Guard against empty glob (literal "*.txt")
            echo "Found: $filepath"
        fi
    done
}


# ✅ GOOD — iterating over a list of items (word-split safely)
function process_items() {
    local items=("alpha" "beta" "gamma")
    for item in "${items[@]}"; do              # Array expansion preserves each element
        echo "Processing: $item"
    done
}


# ✅ GOOD — iterating over command output (read line by line)
function count_lines_in_files() {
    local directory="${1:-.}"
    while IFS= read -r filepath; do            # Read avoids word splitting and trailing newlines
        if [[ -f "$filepath" ]]; then
            wc -l < "$filepath" | xargs echo "  Lines:" "$filepath"
        fi
    done < <(find "$directory" -maxdepth 1 -name "*.txt" -type f)
}


# ✅ GOOD — C-style arithmetic loop (bash-specific with double parentheses)
function sum_range() {
    local limit="${1:-10}"
    local total=0
    for (( i = 1; i <= limit; i++ )); do       # Integer arithmetic, no subshell needed
        (( total += i ))
    done
    echo "$total"
}


# ✅ GOOD — iterating over range in bash 4.0+ (brace expansion)
function print_numbers() {
    local start="${1:-1}"
    local end="${2:-5}"
    for i in $(seq "$start" "$end"); do        # seq generates the sequence
        echo "$i"
    done
}


# ❌ BAD — unquoted variable expansion (word splitting breaks on spaces!)
function bad_process_names() {
    local name="John Doe"
    for word in $name; do                      # Splits "John Doe" into "John" and "Doe"!
        echo "Name: $word"                     # Outputs two lines instead of one
    done
}


# ❌ BAD — iterating over glob without checking for no-match (literal pattern)
function bad_list_files() {
    for filepath in /nonexistent/*.xyz; do     # If no match, loop runs once with literal string
        echo "File: $filepath"                 # Outputs: "File: /nonexistent/*.xyz"
    done
}


# ✅ GOOD — handle no-match glob explicitly
function safe_list_files() {
    local pattern="/nonexistent/*.xyz"
    shopt -s nullglob                          # Disable literal expansion on no match
    for filepath in $pattern; do
        echo "File: $filepath"
    done
    shopt -u nullglob                          # Restore default behavior
}
```

**Key Shell principles:**
- Always quote variables in `for` loops: `"$var"` not `$var` — unquoted variables undergo word splitting and glob expansion
- Use `"${array[@]}"` to iterate over array elements without splitting
- Globs that match nothing expand to the literal pattern string — use `nullglob` or check file existence with `[[ -f ]]`
- C-style `for (( ))` is a bash extension, not POSIX; it handles integer arithmetic natively
- For command output, prefer `while read -r line` over `for line in $(command)` to handle spaces and newlines correctly

---

## Constraints

### MUST DO
- Always prefer iterating over values directly rather than using manual index counters when the index is not needed
- Guard against empty collections before accessing elements by index (add null/empty checks)
- Use language-native iterator constructs (enumerate, for...of, range, .iter(), "${array[@]}") instead of manual counter loops
- When erasing or removing elements from a collection during iteration, use the safe pattern: collect deletions first, then remove; or use the language's built-in filter/retain methods
- Use `const` / `final` / immutable bindings in loop variables when the value should not be reassigned
- Handle the no-match case for glob patterns in shell scripts (use `nullglob` or test existence)

### MUST NOT DO
- Modify a collection while iterating over it with a forward loop — this causes skipped elements, double-processing, or crashes depending on the language
- Use index-based loops to access every element when value iteration is available — it doubles the work (length calculation + indexing) and introduces off-by-one risks
- Use `for...in` on JavaScript arrays — it iterates over enumerable property keys (including inherited ones), not array values
- Access elements by index in Rust without bounds checking (`[i]` panics; use `.get(i)` for safe access or prefer iterators)
- Loop over `$(command_output)` in shell when filenames may contain spaces — use `while read -r` instead
- Use `range(len(...))` in Python when you only need values — it generates unnecessary integer objects and forces double lookup
- Ignore the return value of iterator operations that can fail (e.g., Rust's `.get()`, Go's map access with two-return syntax)

---

## Output Template

When helping with loop-related questions, produce output following this structure:

1. **Language Context** — Identify the programming language and version constraints (e.g., "Python 3.9+", "JavaScript ES6+"). State whether there are any compatibility concerns (e.g., bash `for (( ))` is not POSIX).

2. **Iteration Style** — Recommend the most idiomatic iteration pattern for the problem, explaining why it is preferred over alternatives. Include reasoning about readability, performance, and safety.

3. **Code Example** — Provide a complete, working code example using proper typing (where applicable), meaningful variable names, and docstrings/comments. Include both the primary pattern and the BAD anti-pattern to contrast.

4. **Edge Cases** — List notable gotchas specific to this language and pattern:
   - Empty collection behavior
   - Mutating during iteration safety
   - Off-by-one boundary conditions
   - Shell-specific concerns (word splitting, glob no-match)
   - Iterator invalidation risks (C++/Rust)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `algorithms` | Algorithm complexity analysis for loop-heavy code |
| `sorting-algorithms` | Common sorting implementations use nested loops |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links to resolve external references and inline content.

- [Wikipedia — For Loop](https://en.wikipedia.org/wiki/For_loop)
- [Python for Loops — Official Docs](https://docs.python.org/3/tutorial/controlflow.html#for-statements)
- [Effective Python: Iteration Best Practices](https://realpython.com/python-for-loop/)
- [MDN Web Docs — JavaScript Looping](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Loops_and_iteration)
- [Go for Range Documentation](https://go.dev/ref/spec#For_statements)
