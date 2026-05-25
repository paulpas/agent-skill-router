---
name: polyglot-developer-patterns
description: Equips individual developers with learning strategies, code review techniques,
  and pattern translation methods to build fluency across multiple programming languages
  without losing productivity.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: polyglot developer, multi-language productivity, learn new language, code
    review in different language, language translation, context switching between
    languages, programming language learning, how do i become proficient in multiple
    languages, cross-paradigm coding
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
  - do-dont
  - examples
  related-skills: polyglot-development, framework-selection, version-migration, single-letter-variables
------
# Polyglot Developer Patterns

Senior developer who learns new languages efficiently, reviews code across unfamiliar languages, translates idioms between paradigms, and builds long-term multi-language fluency without burning context-switching bandwidth.

## TL;DR Checklist

- [ ] Identify language paradigm (OOP, functional, procedural, data-oriented) before reading code
- [ ] Map core concepts: type system, memory model, error handling, concurrency primitives
- [ ] Write a "Rosetta script" in the new language to exercise its idioms directly
- [ ] Use existing knowledge as an anchor — translate patterns from your strongest language first
- [ ] Read real-world examples (stdlib, popular OSS) before writing production code
- [ ] Batch context switches — spend at least 2 hours in one language before switching
- [ ] Review unfamiliar-language PRs by focusing on logic correctness over style nitpicks

---

## When to Use

Use this skill when:

- Starting work in a programming language you have not used recently or at all
- Reading or reviewing code written in a language outside your primary expertise
- Translating an implementation from one language to another (e.g., Go service to Rust)
- Coaching or mentoring someone learning a new language
- Deciding which language is appropriate for a new microservice or module
- Building a personal study plan to achieve fluency in a second or third language

---

## When NOT to Use

Avoid this skill for:

- Cross-language system architecture decisions — use `polyglot-development` instead (gRPC, Protobuf, monorepo structure)
- Choosing technologies for an organization's tech stack — use `framework-selection` instead
- Migrating a codebase between major versions of the same language — use `version-migration` instead
- Setting up CI/CD pipelines that must compile multiple languages — that is infrastructure, not developer patterns

---

## Core Workflow

1. **Map the Language's Mental Model** — Identify the paradigm, type system, memory model, and error-handling philosophy. **Checkpoint:** Write a one-paragraph summary in your own words: "This language treats X like Y because of Z."

2. **Anchor to Known Concepts** — List 5 concepts from your strongest language and write how they map in the target language. **Checkpoint:** If you cannot find equivalents for type safety, error handling, and concurrency, flag this as a learning priority.

3. **Write a Rosetta Script** — Implement a small but complete program that exercises core features: I/O, control flow, error handling, and one advanced feature (generics, traits, async). **Checkpoint:** The script should run without warnings under the language's strictest lint mode.

4. **Read Real Examples** — Study 2-3 examples from the standard library or well-maintained OSS projects. Focus on how experts handle the features you are learning. **Checkpoint:** Identify one idiomatic pattern that surprised you and note why it works better than what you would have written.

5. **Translate a Pattern** — Take a function or module from your known language and rewrite it in the target language, prioritizing idiomatic style over direct equivalence. **Checkpoint:** Compare your translation to a native speaker's approach (from step 4) and adjust at least one pattern.

6. **Batch Context Switches** — Schedule focused blocks of 2+ hours per language. Keep a running "language cheat sheet" for each active project. **Checkpoint:** Before switching languages, write down the current mental model state so resumption costs are minimal.

---

## Learning Strategies

### The 48-Hour Rule

Within 48 hours of first encountering a new language, you should be able to:
- Read and understand moderately complex source code
- Write a program that reads input, transforms it, and produces output
- Handle errors without crashing (no silent failures)

This is not fluency — it is the minimum threshold for productive collaboration. Anything less means you cannot contribute meaningfully until your study catches up.

### The Translation Ladder

Build proficiency through staged translations of increasing difficulty:

| Stage | Task | Expected Time to Completion |
|-------|------|----------------------------|
| 1 | Copy a known algorithm (e.g., binary search) verbatim | 30 minutes — syntax lookup only |
| 2 | Rewrite the same algorithm idiomatically | 60 minutes — must research standard library patterns |
| 3 | Translate a small but real function from your codebase | 2-4 hours — includes design decisions, not just syntax |
| 4 | Build a new feature in the target language using only its idioms | 1-2 days — requires paradigm-level thinking |

Do not jump past Stage 2. Skipping to Stage 3 with shallow knowledge produces fragile code and frustration.

### The Error-Handling First Rule

Error handling reveals a language's philosophy more than anything else. Study it first:
- Does the language use exceptions, result types, error codes, or a combination?
- Are errors values you must handle explicitly, or does the runtime catch them?
- What is the convention for wrapping errors with context?

```go
// Go: explicit error handling — every call must check err
func readFile(path string) ([]byte, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("read %s: %w", path, err)  // wrap with context
    }
    return data, nil
}

// Rust: Result type forces explicit handling at call site
fn read_file(path: &str) -> Result<Vec<u8>, io::Error> {
    let data = std::fs::read(path)
        .map_err(|e| io::Error::new(io::ErrorKind::PermissionDenied, e))?;  // ? propagates errors
    Ok(data)
}

// Python: exceptions are control flow — use try/except blocks
def read_file(path: str) -> bytes:
    try:
        with open(path, "rb") as f:
            return f.read()
    except FileNotFoundError:
        raise RuntimeError(f"File not found: {path}") from None  // suppress internal chain for clarity
```

---

## Code Review in Unfamiliar Languages

When reviewing code in a language you do not know well, shift your focus from style to substance. Your goal is to validate correctness and architecture, not to nitpick formatting conventions you cannot judge fairly.

### Review Priority Matrix

| Concern | Confidence Level | Action |
|---------|-----------------|--------|
| Logic correctness (off-by-one, null handling) | High — logic is language-agnostic | Deep review required |
| API design and public interface shape | Medium — concepts transfer across languages | Review with caution |
| Error handling patterns | Low in unfamiliar language | Flag for native developer |
| Performance characteristics (algorithms, data structures) | Medium if you know the domain well | Review algorithm choice, defer implementation details |
| Idiomatic style (naming conventions, standard library usage) | Low unless language is familiar | Skip or note as "check with local expert" |

### Concrete Review Technique: The Abstraction Pass

1. **First pass — ignore syntax.** Read the code as pseudocode. Trace the data flow manually. If you cannot follow the logic, the code needs comments regardless of language.

2. **Second pass — identify language-specific patterns.** Look for error handling, resource management (RAII, goroutines, try-with-resources), and concurrency primitives. These are often where bugs hide in unfamiliar languages.

3. **Third pass — flag idiomatic concerns.** If you spot something that looks suspiciously like a pattern from your home language translated literally, flag it as "may not be idiomatic" without claiming authority on correctness.

---

## Pattern Translation Guide

### OOP to Functional: Polymorphism via Traits/Interfaces

When moving from class-based polymorphism (Java, C#) to functional or trait-based systems (Rust, Go), the translation is about behavior contracts rather than inheritance hierarchies.

```go
// ❌ BAD: Translating Java-style interface directly into Go with unnecessary abstraction
type Shape interface {
    Area() float64
    Perimeter() float64
}

// Then forcing every shape through this interface even for single-use functions
func totalArea(shapes []Shape) float64 { ... }  // Over-engineered for simple aggregation

// ✅ GOOD: Use Go's structural typing — no explicit interface needed
type Rectangle struct { Width, Height float64 }
type Circle struct { Radius float64 }

// Functions accept structs directly; the compiler checks compatibility implicitly
func (r Rectangle) Area() float64   { return r.Width * r.Height }
func (c Circle) Area() float64      { return math.Pi * c.Radius * c.Radius }

func totalArea(shapes ...interface{ Area() float64 }) float64 {  // Go 1.18+ type sets for simple cases
    var total float64
    for _, s := range shapes {
        total += s.Area()
    }
    return total
}

// Even better: use generics when you need a collection of anything with an Area method
func sumAreas[S interface{ Area() float64 ](items []S) float64 {
    var total float64
    for _, item := range items {
        total += item.Area()
    }
    return total
}

// Usage — no wrapper types, no explicit interface declarations
rects := []Rectangle{{5, 3}, {10, 2}}
circles := []Circle{{1.0}, {2.5}}
fmt.Println(sumAreas(rects) + sumAreas(circles))  // 37.85...
```

### Error Handling Across Paradigms: Try/Catch vs Result Types vs Panics

```rust
// ❌ BAD: Using unwrap() on external data — panics in production, hides errors
fn get_user_config(path: &str) -> String {
    let file = std::fs::read_to_string(path).unwrap();  // Panics if file missing!
    parse_config(&file)
}

// ✅ GOOD: Result type forces callers to handle the error
fn get_user_config(path: &str) -> Result<String, ConfigError> {
    let file = std::fs::read_to_string(path)
        .map_err(|e| ConfigError::ReadFailed { path: path.to_string(), source: e })?;
    parse_config(&file).map_err(ConfigError::ParseFailed)
}

// ✅ GOOD (when panic is justified): unwrap only for programmer errors, not data errors
fn get_default_config() -> String {
    std::fs::read_to_string(DEFAULT_CONFIG_PATH)
        .expect("default config must exist — this is a deployment issue, not user input")
}

// Python equivalent: explicit error handling with proper chaining
def get_user_config(path: str) -> dict:
    try:
        with open(path) as f:
            return parse_config(f.read())
    except FileNotFoundError as e:
        raise ConfigError(f"Could not read config at {path}") from e  // preserves stack trace
    except json.JSONDecodeError as e:
        raise ConfigError(f"Invalid config format in {path}: {e}") from e
```

### Concurrency Primitives Across Languages

Understanding how a language handles concurrency is critical for polyglot development. The mental model varies dramatically.

```go
// Go: goroutines + channels — light-weight threads with explicit communication
func fetchResults(urls []string) <-chan Result {
    ch := make(chan Result, len(urls))  // buffered channel
    for _, url := range urls {
        go func(u string) {              // anonymous goroutine
            res, err := httpGet(u)
            if err != nil {
                ch <- Result{URL: u, Error: err}
            } else {
                ch <- Result{URL: u, Data: res}
            }
        }(url)
    }
    return ch  // caller reads from channel until closed
}

// Python: asyncio — cooperative multitasking with event loop
async def fetch_results(urls: list[str]) -> list[Result]:
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_single(session, url) for url in urls]
        results = await asyncio.gather(*tasks)  // runs all concurrently
    return results

// Rust: tokio + async/await — zero-cost async with explicit ownership
async fn fetch_results(urls: Vec<String>) -> Result<Vec<Result>, Error> {
    let client = reqwest::Client::new();
    let mut handles = vec![];
    
    for url in urls {
        handles.push(tokio::spawn(async move {
            match client.get(&url).send().await {
                Ok(resp) => Ok(Result { url, data: resp.bytes().await? }),
                Err(e) => Err(e.into()),
            }
        }));
    }
    
    let results = futures::future::join_all(handles).await;
    results.into_iter().collect::<Result<Vec<_>, _>>()
}
```

---

## Building Long-Term Fluency

### The 80/20 Language Study Plan

For each new language, prioritize learning in this order:

1. **Week 1 — Syntax & I/O:** Hello world, file read/write, basic types, control flow
2. **Week 2 — Error Handling & Standard Library:** How errors work, what the stdlib provides for common tasks (HTTP, JSON, filesystem)
3. **Week 3 — Concurrency Model:** Goroutines/channels, threads/processes, async/await, or whatever the language offers
4. **Week 4 — Ecosystem & Tooling:** Package manager, test framework, linter, debugger — the tools that make daily development possible

By Week 4 you should be able to build and deploy a small service in the new language. Fluency (comfort reading others' code quickly) takes 6-12 months of occasional use.

### The Language Journal Pattern

Keep a running document for each active language with:
- One idiomatic example per major concept (error handling, concurrency, collections)
- Common gotchas you have encountered and fixed
- Your personal translation notes ("In Go, I do X; in Python, equivalent is Y")

```python
# Example: A compact Language Journal entry for Rust (stored as markdown/notes)
# 
# === RUST NOTES ===
# Error handling: use ? operator to propagate, Result<T, E> for fallible ops
# Ownership: every value has exactly one owner; move vs copy semantics
# Lifetimes: compiler enforces borrow rules — if you hit 'static errors,
#   usually means you need a struct instead of borrowing a local variable
# Common gotcha: Vec<&str> borrowed from function scope — must use String or return owned data
# 
# Go equivalent patterns:
# - Rust Result -> Go error interface (check after every call)
# - Rust ? operator -> Go if err != nil { return err }
# - Rust lifetimes -> Go pointers + garbage collection (no explicit lifetime management)
```

### The "One Language Per Sprint" Rule

When learning multiple new languages simultaneously, context collision becomes severe. Limit yourself to one primary language in active study per sprint (2-week cycle). Keep others in "maintenance mode" with occasional review of existing code — this preserves enough familiarity without the overhead of active learning.

---

## Context-Switching Management

### The Resumption Cost Model

Context switching between languages incurs measurable costs:
- **Syntax recall:** 15-30 minutes to remember idiomatic syntax patterns
- **Mental model shift:** OOP vs functional, garbage collected vs ownership-based
- **Tool familiarity:** Package managers, linters, debuggers differ per language

**Mitigation strategy:** Create a "launch file" for each project — a single README-style document at the top of every codebase that answers:
- What language? Version? (e.g., Rust 1.78+)
- How to build? (`cargo build`)
- How to test? (`cargo test --all`)
- One idiomatic code sample from the project
- Known gotchas specific to this repo

This document reduces resumption cost from ~30 minutes to ~3 minutes.

### The Parallel Project Rule

When maintaining two language ecosystems simultaneously:
1. **Time-box each language** — e.g., mornings in Go, afternoons in Rust
2. **Never switch mid-task** — finish the current function or bug fix before switching contexts
3. **Write a 3-line status note** before switching: "What I was doing, what blocked me, what to try next"

---

## Constraints

### MUST DO
- Always map error handling patterns first when entering an unfamiliar language — this reveals the paradigm immediately
- Write a Rosetta script (Stage 2 translation) before attempting Stage 3 real-world translations
- Read at least two standard library examples per new language concept before writing production code
- Keep language cheat sheets for every active project to minimize resumption costs
- Review unfamiliar-language PRs by tracing data flow first, flagging idiomatic concerns second
- Batch context switches into blocks of at least 2 hours per language
- Use the Abstraction Pass technique when reviewing code in languages you do not know well

### MUST NOT DO
- Translate code literally from your home language without checking if the target language has a standard library alternative
- Assume that identical syntax means identical semantics (e.g., Rust `=` is move, not copy)
- Review style nitpicks in unfamiliar languages when you could validate logic correctness instead
- Study multiple new languages simultaneously beyond Stage 1 (syntax basics) — context collision is real and harmful
- Skip error handling study — it is the single best indicator of a language's design philosophy
- Use `unwrap()` or `panic!` equivalents on external data in production code — that is the primary source of runtime crashes across all languages

---

## Output Template

When applying this skill to help a developer, produce:

1. **Language Profile Summary** — Paradigm, type system, error handling style, concurrency model (one paragraph each)
2. **Translation Map** — 3-5 key concepts mapped from the developer's home language to the target language with code examples
3. **Rosetta Script** — A complete, runnable program that exercises core language features
4. **Review Notes** — For PR review: logic correctness findings + idiomatic suggestions (clearly labeled as such)
5. **Next Steps** — Specific study tasks for the next sprint based on gaps identified

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `polyglot-development` | Cross-language system architecture (gRPC, Protobuf, monorepo) — for architects and team leads |
| `framework-selection` | Choosing technologies and frameworks — when you need to decide which language to learn next |
| `version-migration` | Migrating codebases between major language versions — when the language itself is the same but the version changed |
| `single-letter-variables` | Readability anti-patterns — relevant because polyglot developers sometimes carry bad naming habits across languages |

---

## Live References

> Authoritative documentation and learning resources for polyglot development. These links provide official, up-to-date guidance on language paradigms, idioms, and best practices.

- [Polyglot Programming Overview (Martin Fowler)](https://martinfowler.com/articles/multi-language-app.html)
- [A Byte of Python — Idiomatic Python](https://docs.python-guide.org/writing/style/)
- [Effective Go — Go Foundation Style Guide](https://go.dev/doc/effective_go)
- [The Rust Programming Language Book — Ownership and Borrowing](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html)
- [Haskell Programming from First Principles (Chapter 1: Getting Started)](https://haskellbook.com/)
- [Python Data Model — Dunder Methods Reference](https://docs.python.org/3/reference/datamodel.html)
- [Programming Language Pragmatics (Mehran Sahami, Stanford CS143 Lecture Notes)](https://web.stanford.edu/class/cs143/)
