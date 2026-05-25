---
name: modular-design
description: Designs modular Go applications with clean architecture, dependency injection,
  package boundaries, and interface-based design for maintainable codebases.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: go
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - do-dont
  - examples
  triggers: go modular, go dependency injection, go clean architecture, go interface,
    go package boundaries, go hexagonal
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: best-practices, cloud-development, database-patterns, advanced-patterns
  maturity: stable
  completeness: 95
  exampleCount: 3
------
# Modular Go Design

Senior architect designing clean, modular Go applications using dependency injection, interface boundaries, and clean architecture principles. This skill covers package organization, inversion of control, and scalable codebase structure.

## TL;DR Checklist

- [ ] Business logic is in `domain/` or `internal/` packages — independent of infrastructure
- [ ] Dependencies flow inward — outer layers depend on inner layers via interfaces
- [ ] Dependency injection at the composition root (`main`) — never use `new()` in business logic
- [ ] Each package has a single responsibility and exports only what's needed
- [ ] Interfaces are defined where they are consumed, not where they are implemented
- [ ] No circular imports — if two packages import each other, extract the shared types

---

## When to Use

Use this skill when:

- Designing the package structure for a new Go application
- Refactoring a monolithic package into a modular architecture
- Setting up dependency injection to enable testing and flexibility
- Establishing boundaries between business logic and infrastructure
- Scaling a codebase where teams need to work on independent modules

---

## When NOT to Use

Avoid this skill for:

- Single-file scripts or CLI tools (< 500 lines total)
- Prototypes and PoCs where speed matters more than structure
- Libraries that expose a single type or function (no modularity needed)

---

## Core Workflow

1. **Define the Domain Model** — Identify core entities, value objects, and domain behaviors.
   **Checkpoint:** Domain types have no external dependencies — no imports from `infra`, `api`, or `config`.

2. **Define Interface Boundaries** — Identify what the domain needs from external services (repositories, gateways).
   **Checkpoint:** Interfaces are defined in the domain package, implemented in the infrastructure package.

3. **Set Up Dependency Injection** — Create a composition root where all dependencies are wired together.
   **Checkpoint:** `main()` constructs the full dependency graph and passes it to the application entry point.

4. **Organize Packages by Layer** — Group code by architectural layer, not by technical type.
   **Checkpoint:** Each package depends only on inner layers — never outward.

5. **Verify No Circular Dependencies** — Run `go list -deps` and review import cycles.
   **Checkpoint:** `go mod graph` shows no circular import chains.

---

## Implementation Patterns

### Pattern 1: Clean Architecture Package Structure (❌ BAD vs ✅ GOOD)

Go packages should be organized by domain layer, not by technical type.

#### ❌ BAD — Technical Package Organization

```
myapp/
├── handlers/          # All HTTP handlers mixed together
├── services/          # All business logic mixed together
├── models/            # All data structures mixed together
├── repositories/      # All DB access mixed together
├── utils/             # All helper functions mixed together
└── main.go
```

**What's wrong:**
- Code is organized by technical type, not by domain concern
- A feature spans all 5 directories — hard to find related code
- `utils/` becomes a dumping ground for unrelated helper functions
- No separation between domain logic and infrastructure
- Adding a feature requires touching files in all 5 directories

#### ✅ GOOD — Domain-Based Package Organization

```
myapp/
├── cmd/
│   └── server/
│       └── main.go            # Composition root: wires all dependencies
├── internal/
│   ├── user/                  # User domain module
│   │   ├── domain/
│   │   │   ├── user.go        # User entity/value object
│   │   │   └── errors.go      # Domain-specific errors
│   │   ├── repository.go      # Interface: UserRepository (defined here)
│   │   ├── service.go         # Service: uses repository, contains business logic
│   │   └── usecase/
│   │       └── create_user.go # Specific use case implementation
│   │
│   ├── order/                 # Order domain module
│   │   ├── domain/
│   │   ├── repository.go
│   │   └── service.go
│   │
│   └── infrastructure/
│       ├── db/
│       │   └── postgres/
│       │       └── user_repository.go  # Implements user.Repository
│       └── api/
│           └── http/
│               ├── handlers.go     # HTTP handlers (thin layer)
│               └── middleware.go
│
├── go.mod
└── go.sum
```

**Why this works:**
- Each domain module (`user/`, `order/`) is self-contained
- Domain types are in `domain/` — no external dependencies
- Interfaces are defined in the module root (`repository.go`) — consumed where needed
- Infrastructure implementations are in `infrastructure/` — depends on domain interfaces
- Adding a new feature means adding a new directory, touching no existing files

---

### Pattern 2: Dependency Injection (❌ BAD vs ✅ GOOD)

Dependency injection at the composition root enables testability and flexibility.

#### ❌ BAD — Tight Coupling with Direct Instantiation

```go
// ❌ BAD: service creates its dependencies directly — impossible to mock
package service

import "myapp/internal/infrastructure/db/postgres"

type UserService struct {
	// Direct concrete type — cannot substitute a mock or alternate implementation
	db *postgres.Client
}

func NewUserService() *UserService {
	// Creates a real database connection — no way to inject a test DB
	client := postgres.NewClient("postgres://localhost/myapp")
	return &UserService{db: client}
}

// CreateUser depends on a real database — cannot be tested in isolation
func (s *UserService) CreateUser(ctx context.Context, name string) (*User, error) {
	user := &User{Name: name, ID: uuid.New()}
	if err := s.db.InsertUser(ctx, user); err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}
	return user, nil
}
```

**What's wrong:**
- `UserService` creates its own database connection — no testability
- Cannot substitute a mock `postgres.Client` for unit tests
- `NewUserService()` has a side effect (opens a DB connection)
- Hardcoded connection string — no configuration flexibility
- Package imports `infrastructure/db/postgres` — domain depends on infrastructure (violates dependency rule)

#### ✅ GOOD — Interface-Based Dependency Injection

```go
// package: internal/user
//
// Repository interface defined in the domain package.
// Infrastructure implements it, domain consumes it.
type Repository interface {
	Create(ctx context.Context, user *User) error
	GetByID(ctx context.Context, id string) (*User, error)
	Update(ctx context.Context, user *User) error
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, page, limit int) ([]*User, error)
}

// Service contains business logic for the user domain.
// All dependencies are injected — no direct instantiation of infrastructure.
type Service struct {
	repo   Repository
	logger Logger
}

// NewService creates a user service with the given dependencies.
func NewService(repo Repository, logger Logger) *Service {
	return &Service{
		repo:   repo,
		logger: logger,
	}
}

// CreateUser validates and creates a new user via the repository.
func (s *Service) CreateUser(ctx context.Context, name string) (*User, error) {
	if name == "" {
		return nil, fmt.Errorf("create user: name must not be empty")
	}

	user := &User{
		Name:  strings.TrimSpace(name),
		ID:    uuid.New().String(),
		State: UserStateActive,
	}

	if err := s.repo.Create(ctx, user); err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}

	s.logger.Info("user created", "id", user.ID)
	return user, nil
}
```

**Composition root — cmd/server/main.go:**

```go
// main constructs the full dependency graph and starts the server.
func main() {
	ctx := context.Background()

	// Infrastructure: create real dependencies
	db := postgres.NewClient(ctx, dbConfig)
	logger := zerolog.New(os.Stdout).With().Timestamp().Logger()
	cache := redis.NewClient(redisConfig)

	// Domain: inject infrastructure into services
	userRepo := postgres.NewUserRepository(db)
	userService := user.NewService(userRepo, logger)
	orderService := order.NewService(orderRepo, userRepo, logger)

	// API: inject services into handlers
	handler := api.NewHandler(userService, orderService, logger)

	// Server: inject handlers
	server := cloud.NewServer(cfg, handler)
	if err := server.Run(ctx); err != nil {
		log.Fatal(err)
	}
}
```

**Why this works:**
- `UserService` depends on `Repository` interface — not `postgres.Client`
- `NewService()` has no side effects — no DB connection opened
- Testability: pass a mock `Repository` to `NewService()`
- Composition root (`main.go`) is the single place where infrastructure is created
- Domain package has no import of infrastructure — clean dependency flow inward

---

### Pattern 3: Error Types by Domain (❌ BAD vs ✅ GOOD)

Domain-specific error types enable precise error handling at the composition root.

#### ❌ BAD — Flat Error Handling

```go
// ❌ BAD: string-based errors — hard to pattern match, impossible to wrap meaningfully
func (s *Service) CreateUser(ctx context.Context, name string) (*User, error) {
	if name == "" {
		return nil, errors.New("name cannot be empty") // flat error — no context
	}

	if len(name) > 100 {
		return nil, errors.New("name too long") // another flat error
	}

	user := &User{Name: name}
	if err := s.db.Insert(ctx, user); err != nil {
		// Generic DB error — caller can't distinguish unique constraint from connection error
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return user, nil
}
```

**What's wrong:**
- String-based errors are fragile — changing a message breaks error checks
- Caller must use `strings.Contains` to match errors — brittle and slow
- No way to distinguish "validation error" from "database error" programmatically
- Error wrapping with `%w` loses the domain context (validation vs. DB)

#### ✅ GOOD — Domain-Specific Error Types

```go
// package: internal/user/domain

// AppError is a domain-specific error with a code and message.
type AppError struct {
	Code    string
	Message string
	Details map[string]string
}

func (e *AppError) Error() string {
	return e.Message
}

func (e *AppError) Is(target error) bool {
	_, ok := target.(*AppError)
	return ok
}

// Sentinel errors for common domain conditions.
var (
	ErrNotFound      = &AppError{Code: "NOT_FOUND", Message: "resource not found"}
	ErrValidationError = &AppError{Code: "VALIDATION_ERROR", Message: "invalid input"}
	ErrConflict      = &AppError{Code: "CONFLICT", Message: "resource already exists"}
)

// NewValidationError creates a validation error with field details.
func NewValidationError(field, message string) *AppError {
	return &AppError{
		Code:    "VALIDATION_ERROR",
		Message: message,
		Details: map[string]string{field: message},
	}
}

// IsAppError checks if an error is an AppError (or wraps one).
func IsAppError(err error) bool {
	var appErr *AppError
	return errors.As(err, &appErr)
}

// package: internal/user

// CreateUser validates input and creates the user.
// Returns domain-specific errors that the caller can handle appropriately.
func (s *Service) CreateUser(ctx context.Context, name string) (*User, error) {
	// Validation errors use domain types
	if name == "" {
		return nil, NewValidationError("name", "name must not be empty")
	}
	if len(name) > 100 {
		return nil, NewValidationError("name", "name must be 100 characters or less")
	}

	user := &User{Name: strings.TrimSpace(name), ID: uuid.New().String()}
	if err := s.repo.Create(ctx, user); err != nil {
		// Check for unique constraint violation — map to domain error
		if isDuplicateKeyError(err) {
			return nil, ErrConflict
		}
		return nil, fmt.Errorf("create user: %w", err)
	}

	return user, nil
}

// package: cmd/server

// handleCreateUser is an HTTP handler that converts domain errors to HTTP responses.
func (h *Handler) handleCreateUser(w http.ResponseWriter, r *http.Request) {
	// ... parse request ...

	user, err := h.userService.CreateUser(r.Context(), name)
	if err != nil {
		// Handle domain errors with appropriate HTTP status codes
		if appErr, ok := err.(*user.AppError); ok {
			switch appErr.Code {
			case "VALIDATION_ERROR":
				http.Error(w, appErr.Message, http.StatusBadRequest)
				return
			case "CONFLICT":
				http.Error(w, appErr.Message, http.StatusConflict)
				return
			case "NOT_FOUND":
				http.Error(w, appErr.Message, http.StatusNotFound)
				return
			}
		}

		// Non-domain errors are internal server errors
		log.Printf("unexpected error: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	// Success — write response
	writeJSON(w, http.StatusCreated, user)
}
```

**Why this works:**
- Domain errors are typed — `IsAppError()` enables programmatic error handling
- `errors.As()` works with domain errors — no string matching needed
- Validation errors carry field-level details for client-side feedback
- HTTP handler maps domain error codes to appropriate status codes
- Infrastructure errors are wrapped but not converted — preserving the error chain

---

## Constraints

### MUST DO

- **MUST** organize packages by domain module — not by technical type
- **MUST** define interfaces in the consuming package (domain), implement in the providing package (infrastructure)
- **MUST** inject all dependencies through constructors — never use `new()` or `&Type{}` in business logic
- **MUST** keep the composition root (`main.go`) as the single place where infrastructure types are created
- **MUST** ensure domain packages have zero imports from infrastructure, API, or config packages
- **MUST** define domain-specific error types for all business rules and use `errors.As` to check them

### MUST NOT DO

- **MUST NOT** create circular dependencies between packages — extract shared types into a separate package if needed
- **MUST NOT** use global variables for dependency storage (no `var db *Client` at package level)
- **MUST NOT** implement interfaces in the same package that defines them (interface segregation)
- **MUST NOT** import infrastructure packages into domain packages (dependency inversion violation)
- **MUST NOT** use `new()` in business logic — always accept dependencies as parameters

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `best-practices` | Go idioms, naming, and error handling conventions |
| `cloud-development` | Cloud-native patterns for modular services (shutdown, config, health) |
| `database-patterns` | Repository patterns and data access layer design |
| `advanced-patterns` | Functional options and generics for flexible dependency injection |
