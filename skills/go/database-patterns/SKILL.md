---




name: database-patterns
description: Implements database access patterns in Go with connection pooling, transaction
  management, repository patterns, and migration strategies.
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
  triggers: go database, go sql, go transactions, go repository pattern, go migrations,
    go caching, go nosql
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: best-practices, cloud-development, modular-design, testing-strategies
  maturity: stable
  completeness: 95
  exampleCount: 3




---




# Go Database Patterns

Senior data engineer implementing robust database access in Go with connection pooling, transaction management, repository patterns, and migration strategies. This skill covers both SQL and NoSQL data stores.

## TL;DR Checklist

- [ ] Always configure `MaxOpenConns`, `MaxIdleConns`, and `ConnMaxLifetime` on `sql.DB`
- [ ] Use `*sql.DB` (pool) — never `*sql.Conn` for general access
- [ ] Wrap all SQL operations in `defer tx.Rollback()` unless committed
- [ ] Use `context.WithTimeout` for all database queries — never run unbounded queries
- [ ] Map database errors to domain errors (unique constraint → `ErrConflict`)
- [ ] Version migrations and make them idempotent

---

## When to Use

Use this skill when:

- Setting up database connections with proper connection pooling
- Implementing repository patterns for data access abstraction
- Managing transactions with proper rollback and error handling
- Designing database migrations for production deployments
- Caching database queries to reduce load

---

## When NOT to Use

Avoid this skill for:

- Simple in-memory data structures (no database needed)
- Read-heavy analytics workloads (use a data warehouse instead)
- Applications that only need simple file-based storage

---

## Core Workflow

1. **Configure Connection Pool** — Set pool parameters based on expected workload and database capacity.
   **Checkpoint:** Pool size matches the database's max connections — don't exhaust the DB.

2. **Implement Repository Interface** — Define repository interfaces in the domain package.
   **Checkpoint:** Repository methods accept and return domain types, not database rows.

3. **Handle Transactions Correctly** — Use `db.BeginTx()` with context for transactional operations.
   **Checkpoint:** Every transaction has a `defer tx.Rollback()` and explicit `tx.Commit()`.

4. **Map Database Errors to Domain Errors** — Translate DB-specific errors into domain error types.
   **Checkpoint:** `errors.Is()` works with domain error types for error checking.

5. **Manage Migrations** — Version and apply database schema changes with rollback support.
   **Checkpoint:** Migrations are idempotent and can be safely re-run.

---

## Implementation Patterns

### Pattern 1: Connection Pool Configuration (❌ BAD vs ✅ GOOD)

Proper connection pooling prevents resource exhaustion and ensures consistent performance.

#### ❌ BAD — Default Connection Pool

```go
// ❌ BAD: default connection pool — unlimited connections, no lifetime management
func main() {
	db, err := sql.Open("postgres", "postgres://localhost/myapp")
	if err != nil {
		log.Fatal(err)
	}
	// No pool configuration — unlimited open connections, connections never recycled
	// Under load, this can exhaust the database server's max_connections

	// Query without context — can hang forever
	row := db.QueryRow("SELECT * FROM users WHERE id = $1", 1)
}
```

**What's wrong:**
- Default pool has unlimited `MaxOpenConns` — can exhaust database connections
- No `ConnMaxLifetime` — dead connections accumulate, causing errors
- No `MaxIdleConns` — idle connections waste resources
- Query has no context/timeout — hangs forever on a slow query
- No error handling for `sql.Open` (which doesn't actually connect)

#### ✅ GOOD — Production-Ready Connection Pool

```go
// setupDB opens a database connection with production-ready pool configuration.
// Call db.Ping() to verify connectivity after opening.
func setupDB(ctx context.Context, dsn string) (*sql.DB, error) {
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}

	// Configure connection pool
	db.SetMaxOpenConns(25)           // max concurrent connections
	db.SetMaxIdleConns(10)           // idle connections to keep open
	db.SetConnMaxLifetime(5 * time.Minute) // recycle connections to avoid stale state
	db.SetConnMaxIdleTime(2 * time.Minute)  // close idle connections after 2 minutes

	// Verify connectivity (sql.Open doesn't actually connect)
	if err := db.PingContext(ctx); err != nil {
		db.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}

	return db, nil
}

// getUser retrieves a user by ID with proper timeout and error handling.
func getUser(ctx context.Context, db *sql.DB, id string) (*User, error) {
	// Always use context-aware query methods
	row := db.QueryRowContext(ctx,
		"SELECT id, name, email, created_at FROM users WHERE id = $1", id,
	)

	var user User
	var createdAt time.Time
	err := row.Scan(&user.ID, &user.Name, &user.Email, &createdAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("get user: user %s not found", id)
		}
		return nil, fmt.Errorf("get user: %w", err)
	}

	user.CreatedAt = createdAt
	return &user, nil
}
```

**Why this works:**
- `MaxOpenConns: 25` limits concurrent connections to a safe number
- `ConnMaxLifetime: 5m` recycles connections before they become stale
- `ConnMaxIdleTime: 2m` releases idle connections back to the pool
- `PingContext()` verifies actual connectivity at startup
- `QueryRowContext()` respects context timeout — no hung queries

---

### Pattern 2: Transaction Management (❌ BAD vs ✅ GOOD)

Transactions must be atomic, with proper rollback on any failure.

#### ❌ BAD — Manual Transaction Management

```go
// ❌ BAD: manual transaction management — easy to forget rollback, race conditions
func transferFunds(fromID, toID string, amount float64) error {
	// No context — transaction can hang forever
	tx, err := db.Begin() // auto-commit if not used
	if err != nil {
		return err
	}
	// No defer tx.Rollback() — if this function returns early, transaction leaks

	// Deduct from source
	_, err = tx.Exec("UPDATE accounts SET balance = balance - $1 WHERE id = $2", amount, fromID)
	if err != nil {
		return err // tx is never rolled back — connection leak!
	}

	// Credit destination
	_, err = tx.Exec("UPDATE accounts SET balance = balance + $1 WHERE id = $2", amount, toID)
	if err != nil {
		return err // tx is never rolled back — connection leak!
	}

	return tx.Commit() // only commits if both queries succeed
}
```

**What's wrong:**
- No `defer tx.Rollback()` — failed queries leave transactions open, leaking connections
- No context — transaction hangs forever on a slow query
- Errors are returned without rollback — data is in an inconsistent state
- No isolation level specified — default may not be appropriate
- No check for zero/negative amount — business logic bug

#### ✅ GOOD — Structured Transaction with Rollback

```go
// TransferFunds moves funds between two accounts atomically.
// Returns ErrInsufficientFunds if the source account lacks sufficient balance.
// Uses SERIALIZABLE isolation to prevent race conditions on balance checks.
func TransferFunds(ctx context.Context, db *sql.DB, fromID, toID string, amount float64) error {
	// Guard clauses
	if amount <= 0 {
		return fmt.Errorf("transfer funds: amount must be positive, got %f", amount)
	}
	if fromID == toID {
		return fmt.Errorf("transfer funds: from and to accounts must differ")
	}

	// Begin transaction with explicit isolation level
	tx, err := db.BeginTx(ctx, &sql.TxOptions{
		Isolation: sql.LevelSerializable,
	})
	if err != nil {
		return fmt.Errorf("transfer funds: begin transaction: %w", err)
	}
	// ALWAYS defer rollback — it's a no-op if already committed
	defer func() {
		if err != nil {
			_ = tx.Rollback() // ignore rollback error if commit already happened
		}
	}()

	// Deduct from source account (with SELECT FOR UPDATE to prevent races)
	var balance float64
	err = tx.QueryRowContext(ctx,
		"SELECT balance FROM accounts WHERE id = $1 FOR UPDATE", fromID,
	).Scan(&balance)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return fmt.Errorf("transfer funds: source account %s not found", fromID)
		}
		return fmt.Errorf("transfer funds: check source balance: %w", err)
	}

	if balance < amount {
		return fmt.Errorf("transfer funds: insufficient funds (have %.2f, need %.2f)", balance, amount)
	}

	// Deduct
	if _, err = tx.ExecContext(ctx,
		"UPDATE accounts SET balance = balance - $1 WHERE id = $2", amount, fromID,
	); err != nil {
		return fmt.Errorf("transfer funds: deduct from source: %w", err)
	}

	// Credit destination
	if _, err = tx.ExecContext(ctx,
		"UPDATE accounts SET balance = balance + $1 WHERE id = $2", amount, toID,
	); err != nil {
		return fmt.Errorf("transfer funds: credit destination: %w", err)
	}

	// Commit — if this fails, defer rollback runs
	if err = tx.Commit(); err != nil {
		return fmt.Errorf("transfer funds: commit: %w", err)
	}

	return nil
}
```

**Why this works:**
- `defer tx.Rollback()` ensures rollback on any return path (including errors)
- `BeginTx` with `LevelSerializable` prevents race conditions on concurrent transfers
- `SELECT ... FOR UPDATE` locks the row, preventing duplicate deductions
- Guard clauses validate input before touching the database
- Every step has a specific error message for debugging
- `ctx` propagates through all queries — transaction respects context timeout

---

### Pattern 3: Repository Pattern (❌ BAD vs ✅ GOOD)

The repository pattern abstracts database details behind an interface defined in the domain.

#### ❌ BAD — Direct Database Access

```go
// ❌ BAD: business logic contains raw SQL — mixed concerns, hard to test
type UserService struct {
	db *sql.DB
}

func (s *UserService) GetUser(ctx context.Context, id string) (*User, error) {
	// SQL query mixed into business logic
	row := s.db.QueryRowContext(ctx,
		"SELECT u.id, u.name, u.email, u.created_at, r.name as role_name "+
			"FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = $1", id,
	)

	var u User
	var role string
	var createdAt time.Time
	err := row.Scan(&u.ID, &u.Name, &u.Email, &createdAt, &role)
	if err != nil {
		return nil, err
	}
	u.CreatedAt = createdAt
	u.Role = role
	return &u, nil
}
```

**What's wrong:**
- SQL query is embedded in business logic — can't test without a real database
- Query joins multiple tables — changes require updating business logic
- No abstraction — repository method signature leaks SQL details
- Cannot substitute a mock for testing
- Error handling is minimal — `err` is returned without context

#### ✅ GOOD — Repository Abstraction

```go
// package: internal/user

// UserRepository defines the contract for user persistence.
// Implemented by infrastructure; consumed by domain logic.
type UserRepository interface {
	GetByID(ctx context.Context, id string) (*User, error)
	Create(ctx context.Context, user *User) error
	Update(ctx context.Context, user *User) error
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, page, limit int) ([]*User, error)
}

// Service uses the repository interface — never the database directly.
type Service struct {
	repo UserRepository
}

// GetUser retrieves a user by ID.
func (s *Service) GetUser(ctx context.Context, id string) (*User, error) {
	if id == "" {
		return nil, fmt.Errorf("get user: id must not be empty")
	}

	user, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get user: %w", err)
	}
	return user, nil
}

// package: internal/infrastructure/db/postgres

// userRepository implements user.UserRepository using PostgreSQL.
type userRepository struct {
	db *sql.DB
}

// NewUserRepository creates a PostgreSQL user repository.
func NewUserRepository(db *sql.DB) user.UserRepository {
	return &userRepository{db: db}
}

// GetByID retrieves a user by their ID from PostgreSQL.
func (r *userRepository) GetByID(ctx context.Context, id string) (*user.User, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT u.id, u.name, u.email, u.created_at, u.updated_at,
		        COALESCE(r.name, '') as role_name
		 FROM users u
		 LEFT JOIN roles r ON u.role_id = r.id
		 WHERE u.id = $1`, id,
	)

	var u user.User
	var createdAt, updatedAt time.Time
	var roleName string

	err := row.Scan(&u.ID, &u.Name, &u.Email, &createdAt, &updatedAt, &roleName)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("get user by id: user %s not found", id)
		}
		return nil, fmt.Errorf("get user by id: %w", err)
	}

	u.CreatedAt = createdAt
	u.UpdatedAt = updatedAt
	u.Role = roleName
	return &u, nil
}
```

**Why this works:**
- `UserRepository` interface is defined in the domain package — infrastructure implements it
- `Service` depends on the interface — testable with any `UserRepository` implementation
- SQL is encapsulated in the repository — business logic is database-agnostic
- Easy to test: create `mockUserRepository` that returns pre-defined data
- Error wrapping preserves the error chain from infrastructure to domain

---

## Constraints

### MUST DO

- **MUST** configure connection pool (`MaxOpenConns`, `MaxIdleConns`, `ConnMaxLifetime`) on every `sql.DB` instance
- **MUST** use `context.Context` for ALL database operations — never omit context
- **MUST** use `defer tx.Rollback()` on every transaction — it is safe to call after `Commit()`
- **MUST** use `db.BeginTx(ctx, &sql.TxOptions{Isolation: ...})` for transactional operations
- **MUST** map database-specific errors to domain error types (e.g., unique constraint → `ErrConflict`)
- **MUST** validate input before executing database queries (guard clauses)

### MUST NOT DO

- **MUST NOT** use `sql.Open` without calling `PingContext()` — open doesn't verify connectivity
- **MUST NOT** use string concatenation for SQL queries — always use parameterized queries
- **MUST NOT** store `*sql.DB` in global variables — pass it as a dependency
- **MUST NOT** use `tx.Exec()` without `defer tx.Rollback()`
- **MUST NOT** assume `sql.Open` succeeds — always check the returned error
- **MUST NOT** run queries without a context timeout in production

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `best-practices` | Error handling, naming, and Go idioms |
| `cloud-development` | Configuration management for database connection strings |
| `modular-design` | Repository pattern integration with clean architecture |
| `testing-strategies` | Testing database code with mocks and test containers |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Go SQLx Documentation](https://go.dev/sqlx)
- [Database/SQL Package Guide](https://pkg.go.dev/database/sql)
- [Go Database Connection Pooling](https://pkg.go.dev/database/sql#DB.SetMaxOpenConns)
- [GORM Object Relational Mapping](https://gorm.io/docs/)
- [Go SQL Best Practices](https://go.dev/blog/database)
