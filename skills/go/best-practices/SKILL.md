---
name: best-practices
description: Enforces Go idioms and best practices including error handling, interface
  design, testing conventions, and code organization for maintainable applications.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: go
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - do-dont
  - examples
  triggers: go best practices, go idioms, golang conventions, go error handling, interface
    design, go naming, idiomatic go
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: modular-design, cloud-development, testing-strategies
  maturity: stable
  completeness: 95
  exampleCount: 3
---
# Go Best Practices

Senior engineer enforcing idiomatic Go conventions — writing clean, maintainable Go code that reads like well-structured English. This skill covers error handling, interface design, naming, package organization, and the conventions that make Go code predictable and reviewable.

## TL;DR Checklist

- [ ] Return errors explicitly; never ignore returned errors without intentional handling
- [ ] Design interfaces small and consumer-specific (interface segregation)
- [ ] Name packages after their purpose, not their type (e.g. `cache`, not `cachetypes`)
- [ ] Use `context.Context` for all operations that span request boundaries
- [ ] Write table-driven tests for every exported function
- [ ] Document exported symbols with `// Package doc` and `// Function doc` comments

---

## When to Use

Use this skill when:

- Writing new Go code and wanting to ensure idiomatic conventions
- Reviewing Go code for style, correctness, and adherence to community standards
- Onboarding a developer to a Go codebase with established conventions
- Refactoring legacy Go code to follow modern idioms (Go 1.21+)
- Establishing coding standards for a new Go project

---

## When NOT to Use

Avoid this skill for:

- Low-level systems code where performance overrides readability (use `unsafe` patterns instead)
- One-off scripts or throwaway programs where conventions add unnecessary overhead
- Learning Go from scratch without context (pair with a fundamentals reference first)

---

## Core Workflow

1. **Evaluate the Code Structure** — Check package organization, naming, and exported symbol visibility.
   **Checkpoint:** Every exported function and type has a godoc comment explaining its purpose.

2. **Enforce Error Handling** — Verify all errors are explicitly handled at call sites. No silent swallowing.
   **Checkpoint:** Every `err != nil` check has a meaningful action (return, log with context, retry).

3. **Review Interface Design** — Ensure interfaces are small, consumer-specific, and defined by consumers.
   **Checkpoint:** Interfaces should fit on one screen. If an interface has more than 3-4 methods, consider splitting.

4. **Check Naming Conventions** — Verify names follow Go's naming rules: short, precise, camelCase for exports.
   **Checkpoint:** Package names are lowercase, single words, no underscores.

5. **Validate Testing Coverage** — Ensure table-driven tests cover happy path, error paths, and edge cases.
   **Checkpoint:** Every exported function has at least one test case for normal input and one for error input.

---

## Implementation Patterns

### Pattern 1: Error Handling (❌ BAD vs ✅ GOOD)

Go's error handling must be explicit. Ignoring errors is a bug, not an optimization.

#### ❌ BAD — Silent Error Swallowing

```go
// ❌ BAD: ignoring an error silently — the caller has no way to know something failed
func ProcessFile(path string) error {
	data, err := os.ReadFile(path)
	// err is ignored — file might not exist, permissions denied, etc.
	_ = err

	content := strings.ToUpper(string(data))
	return nil
}
```

**What's wrong:**
- Error is explicitly discarded with `_ = err`, hiding failure from the caller
- The function claims success (`return nil`) even when the file read failed
- No way for the caller to distinguish between "processed 0 bytes" and "file not found"

#### ✅ GOOD — Explicit Error Propagation

```go
// ProcessFile reads a file, uppercases its content, and returns the result.
// Returns os.PathError if the file cannot be read.
func ProcessFile(path string) ([]byte, error) {
	if path == "" {
		return nil, fmt.Errorf("process file: path must not be empty")
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("process file: read %s: %w", path, err)
	}

	return bytes.ToUpper(data), nil
}
```

**Why this works:**
- Guard clause rejects invalid input early (Early Exit law)
- Error is wrapped with context using `%w` for error chain inspection
- Return type `([]byte, error)` makes success/failure explicit to the caller

---

### Pattern 2: Interface Design (❌ BAD vs ✅ GOOD)

Go interfaces should be small, consumer-defined, and focused.

#### ❌ BAD — Overly Broad Interface

```go
// ❌ BAD: interface defined by the implementer, not the consumer
// Forces consumers to depend on methods they don't use
type Service interface {
	// A service that does everything
	CreateUser(ctx context.Context, req CreateUserRequest) (*User, error)
	UpdateUser(ctx context.Context, id string, req UpdateUserRequest) error
	DeleteUser(ctx context.Context, id string) error
	GetUser(ctx context.Context, id string) (*User, error)
	ListUsers(ctx context.Context, filter ListFilter) ([]*User, error)
	SendEmail(ctx context.Context, to string, subject string, body string) error
	GenerateReport(ctx context.Context, format string) ([]byte, error)
}
```

**What's wrong:**
- Single huge interface violates interface segregation principle
- Consumers of just `GetUser` still depend on `SendEmail` and `GenerateReport`
- Impossible to mock without implementing all 7 methods
- Interface defined by the implementer, not by its consumers

#### ✅ GOOD — Small, Consumer-Specific Interfaces

```go
// UserRepository defines operations for user persistence.
// Implemented by concrete types; consumed by handlers and services.
type UserRepository interface {
	GetByID(ctx context.Context, id string) (*User, error)
	Create(ctx context.Context, user *User) error
	Update(ctx context.Context, user *User) error
	Delete(ctx context.Context, id string) error
}

// EmailService defines operations for sending email.
type EmailService interface {
	Send(ctx context.Context, msg EmailMessage) error
}

// ListableUsers is a constraint for types that support user listing.
type ListableUsers interface {
	ListUsers(ctx context.Context, filter ListFilter) ([]*User, error)
}
```

**Why this works:**
- Each interface is small and focused on a single responsibility
- Consumers only depend on what they actually need
- Easy to mock for testing — a mock needs only 3-4 methods max
- Interfaces are defined by consumers, not by the implementation

---

### Pattern 3: Context Usage (❌ BAD vs ✅ GOOD)

Context propagation is essential for cancellable, deadline-aware operations.

#### ❌ BAD — Ignoring Context

```go
// ❌ BAD: database query ignores context — cannot be cancelled or timed out
func GetUserByID(id string) (*User, error) {
	row := db.QueryRow("SELECT id, name, email FROM users WHERE id = $1", id)
	// no context — query runs forever if the DB is slow
	var user User
	err := row.Scan(&user.ID, &user.Name, &user.Email)
	if err != nil {
		return nil, fmt.Errorf("get user: %w", err)
	}
	return &user, nil
}
```

**What's wrong:**
- No context means the query cannot be cancelled on client disconnect
- No timeout — a slow query blocks the goroutine indefinitely
- Violates the principle that all operations spanning request boundaries accept context

#### ✅ GOOD — Context-Aware Operations

```go
// GetUserByID retrieves a user by their unique ID.
// The operation is cancellable via ctx and respects its deadline.
func GetUserByID(ctx context.Context, id string) (*User, error) {
	if id == "" {
		return nil, fmt.Errorf("get user by id: id must not be empty")
	}

	row := db.QueryRowContext(ctx,
		"SELECT id, name, email FROM users WHERE id = $1", id,
	)

	var user User
	if err := row.Scan(&user.ID, &user.Name, &user.Email); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("get user by id: user %s not found", id)
		}
		return nil, fmt.Errorf("get user by id: %w", err)
	}

	return &user, nil
}
```

**Why this works:**
- Context enables cancellation and timeout propagation
- `QueryRowContext` respects the deadline — no hung queries
- Error wrapping preserves the error chain for inspection
- Guard clause validates input before hitting the database

---

## Constraints

### MUST DO

- **MUST** return errors explicitly and wrap them with context using `%w`
- **MUST** define interfaces small (under 5 methods) and consumer-specific
- **MUST** document every exported function, type, and package with godoc comments
- **MUST** use `context.Context` for all operations that span request or request-like boundaries
- **MUST** name packages after their purpose in lowercase single words
- **MUST** write table-driven tests for all exported functions
- **MUST** use `errors.Is` and `errors.As` for error inspection instead of string comparison

### MUST NOT DO

- **MUST NOT** ignore returned errors — not even with `_ = err` or blank identifier
- **MUST NOT** define interfaces in the same package that implements them
- **MUST NOT** use `panic()` for error handling — only for truly unrecoverable conditions at startup
- **MUST NOT** use `interface{}` — use `any` (Go 1.18+) for untyped values
- **MUST NOT** embed large interfaces to create sub-interfaces — composition wins over inheritance
- **MUST NOT** name packages with underscores, hyphens, or plural forms

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `modular-design` | Designs package boundaries and dependency injection architecture |
| `cloud-development` | Cloud-native patterns (graceful shutdown, health checks, config) |
| `testing-strategies` | Table-driven tests, mocks, benchmarks, and integration testing |
| `error-handling` | Custom error types, retry patterns, and failure recovery strategies |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Effective Go Guide](https://go.dev/doc/effective_go)
- [Go Code Review Comments](https://github.com/golang/go/wiki/CodeReviewComments)
- [Go Proverbs](https://go-proverbs.github.io/)
- [Go Blog - Style Guidelines](https://go.dev/blog/gofmt)
- [Uber Go Style Guide](https://github.com/uber-go/guide/blob/master/style.md)
