---
name: testing-strategies
description: Implements comprehensive testing strategies for Go including unit tests,
  integration tests, benchmarks, table-driven tests, and mock patterns.
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
  triggers: go testing, go unit test, go benchmark, go mock, table driven test, go
    integration test, go fuzzing
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: best-practices, modular-design, database-patterns
  maturity: stable
  completeness: 95
  exampleCount: 3
------
# Go Testing Strategies

Senior QA engineer implementing comprehensive testing strategies for Go applications. This skill covers table-driven tests, mocking, benchmarks, integration testing, and fuzzing following Go's native testing conventions.

## TL;DR Checklist

- [ ] Every exported function has at least one test case (happy path + error path)
- [ ] Use table-driven tests for functions with multiple input/output combinations
- [ ] Mock interfaces — never mock concrete types
- [ ] Use `t.Parallel()` for independent tests that don't share state
- [ ] Run `go test -race` on all tests to detect data races
- [ ] Separate unit tests (fast, no I/O) from integration tests (slow, with I/O)

---

## When to Use

Use this skill when:

- Writing tests for Go packages and functions
- Setting up a testing strategy for a new project
- Creating mock implementations for interface-based dependencies
- Writing benchmarks to measure performance regressions
- Setting up integration tests with real databases or services

---

## When NOT to Use

Avoid this skill for:

- Testing auto-generated code (mocks, protobuf) — test the generator instead
- Testing simple getters/setters with no logic — the caller tests the logic
- Testing third-party packages — rely on their existing test coverage

---

## Core Workflow

1. **Identify Testable Units** — Determine what functions and methods need tests.
   **Checkpoint:** Every exported function has at least one test case.

2. **Write Table-Driven Tests** — Use tables for functions with multiple input/output scenarios.
   **Checkpoint:** Each table entry has a name, inputs, expected output, and optional error expectation.

3. **Create Mock Implementations** — Define interfaces and create mock implementations for testing.
   **Checkpoint:** Mocks implement the same interface as the real dependency.

4. **Write Integration Tests** — Test with real databases or services using test containers.
   **Checkpoint:** Integration tests are marked with `//go:build integration` tag.

5. **Add Benchmarks** — Write benchmarks for performance-critical code paths.
   **Checkpoint:** Benchmarks run long enough to get stable results (>1s wall time).

---

## Implementation Patterns

### Pattern 1: Table-Driven Tests (❌ BAD vs ✅ GOOD)

Table-driven tests are the Go convention for testing functions with multiple cases.

#### ❌ BAD — Separate Tests for Each Case

```go
// ❌ BAD: separate test functions for each case — code duplication, hard to add cases
func TestAdd_Positive(t *testing.T) {
	result := Add(2, 3)
	if result != 5 {
		t.Errorf("Add(2, 3) = %d; want 5", result)
	}
}

func TestAdd_Zero(t *testing.T) {
	result := Add(0, 0)
	if result != 0 {
		t.Errorf("Add(0, 0) = %d; want 0", result)
	}
}

func TestAdd_Negative(t *testing.T) {
	result := Add(-1, -2)
	if result != -3 {
		t.Errorf("Add(-1, -2) = %d; want -3", result)
	}
}

func TestAdd_Mixed(t *testing.T) {
	result := Add(-1, 5)
	if result != 4 {
		t.Errorf("Add(-1, 5) = %d; want 4", result)
	}
}
```

**What's wrong:**
- Code duplication: each test repeats the same `result := Add(a, b)` and `if result != want`
- Hard to add cases: must copy an entire function and modify it
- Test output is verbose: 4 separate test functions instead of one
- No clear relationship between test cases — they're scattered across functions
- Easy to forget edge cases because adding a new test requires boilerplate

#### ✅ GOOD — Table-Driven Tests

```go
// TestAdd tests the Add function with various input combinations.
func TestAdd(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		a, b int
		want int
	}{
		{"positive + positive", 2, 3, 5},
		{"zero + zero", 0, 0, 0},
		{"negative + negative", -1, -2, -3},
		{"mixed signs", -1, 5, 4},
		{"large positive", 1000000, 2000000, 3000000},
		{"overflow edge case", math.MaxInt32 - 1, 1, math.MaxInt32},
		{"negative overflow edge case", math.MinInt32 + 1, -1, math.MinInt32},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got := Add(tt.a, tt.b)
			if got != tt.want {
				t.Errorf("Add(%d, %d) = %d; want %d", tt.a, tt.b, got, tt.want)
			}
		})
	}
}
```

**Why this works:**
- Single test function with a table of cases — easy to add, remove, or modify cases
- `t.Run(tt.name, ...)` creates sub-tests — each case appears separately in test output
- `t.Parallel()` on sub-tests runs cases concurrently — faster test execution
- Error message includes the specific failing case name
- No code duplication between test cases

---

### Pattern 2: Mocking Interfaces (❌ BAD vs ✅ GOOD)

Mock interfaces, never concrete types. Go's interface-based design makes this natural.

#### ❌ BAD — Mocking Concrete Types

```go
// ❌ BAD: concrete type dependency — cannot be mocked, tight coupling
package service

import "myapp/internal/db"

type UserService struct {
	dbClient *db.Client // concrete type — impossible to mock
}

// Test without mocking — requires a real database connection
func TestCreateUser(t *testing.T) {
	// Must set up a real database — slow, fragile, not isolated
	dsn := "postgres://localhost/testdb"
	dbClient, err := db.NewClient(dsn)
	if err != nil {
		t.Fatalf("failed to connect to test database: %v", err)
	}
	defer dbClient.Close()

	// Flush test data
	dbClient.Exec("DELETE FROM users")

	svc := &UserService{dbClient: dbClient}
	user, err := svc.CreateUser(context.Background(), "test")
	if err != nil {
		t.Fatalf("CreateUser failed: %v", err)
	}

	if user.Name != "test" {
		t.Errorf("user name = %q; want %q", user.Name, "test")
	}
}
```

**What's wrong:**
- `*db.Client` is a concrete type — cannot substitute a mock
- Requires a real database connection — tests are slow and fragile
- Test data must be manually flushed — test interference
- Cannot test error paths (DB timeout, connection refused) without breaking the DB
- Test order matters — tests that modify shared DB state interfere with each other

#### ✅ GOOD — Interface-Based Mocking

```go
// package: internal/user

// UserRepository is the interface for user persistence.
// Defined in the domain package; implemented by infrastructure.
type UserRepository interface {
	Create(ctx context.Context, user *User) error
	GetByID(ctx context.Context, id string) (*User, error)
	Update(ctx context.Context, user *User) error
	Delete(ctx context.Context, id string) error
}

// Service depends on the UserRepository interface.
type Service struct {
	repo UserRepository
}

// CreateUser validates and creates a new user.
func (s *Service) CreateUser(ctx context.Context, name string) (*User, error) {
	if name == "" {
		return nil, fmt.Errorf("create user: name must not be empty")
	}

	user := &User{
		Name:  strings.TrimSpace(name),
		ID:    generateID(),
		State: UserStateActive,
	}

	if err := s.repo.Create(ctx, user); err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}

	return user, nil
}

// package: internal/user

// mockUserRepository is a test double for UserRepository.
// Embedded UserRepository ensures it implements the interface.
type mockUserRepository struct {
	UserRepository // embedded — satisfies interface
	createFn  func(ctx context.Context, user *User) error
	getFn     func(ctx context.Context, id string) (*User, error)
}

// newMockUserRepository creates a mock repository with optional callbacks.
func newMockUserRepository(createFn func(ctx context.Context, user *User) error,
	getFn func(ctx context.Context, id string) (*User, error),
) *mockUserRepository {
	return &mockUserRepository{
		createFn: createFn,
		getFn:    getFn,
	}
}

// Create implements UserRepository.Create with the provided callback.
func (m *mockUserRepository) Create(ctx context.Context, user *User) error {
	if m.createFn != nil {
		return m.createFn(ctx, user)
	}
	return nil
}

// GetByID implements UserRepository.GetByID with the provided callback.
func (m *mockUserRepository) GetByID(ctx context.Context, id string) (*User, error) {
	if m.getFn != nil {
		return m.getFn(ctx, id)
	}
	return nil, sql.ErrNoRows
}

// package: internal/user

// TestUserService_CreateUser tests user creation with a mock repository.
func TestUserService_CreateUser(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name        string
		inputName   string
		createErr   error
		wantErr     bool
		wantName    string
	}{
		{
			name:       "valid name",
			inputName:  "Alice",
			wantName:   "Alice",
			wantErr:    false,
		},
		{
			name:      "empty name",
			inputName: "",
			wantErr:   true,
		},
		{
			name:      "whitespace name",
			inputName: "   ",
			wantName:  "",
			wantErr:   true,
		},
		{
			name:      "database error",
			inputName: "Bob",
			createErr: fmt.Errorf("connection refused"),
			wantErr:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			mock := newMockUserRepository(
				func(ctx context.Context, user *User) error { return tt.createErr },
				nil, // getFn not needed for Create test
			)

			svc := NewService(mock)
			user, err := svc.CreateUser(context.Background(), tt.inputName)

			if tt.wantErr {
				if err == nil {
					t.Error("CreateUser returned nil error; want error")
				}
				return
			}

			if err != nil {
				t.Fatalf("CreateUser returned unexpected error: %v", err)
			}

			if user.Name != tt.wantName {
				t.Errorf("user.Name = %q; want %q", user.Name, tt.wantName)
			}
		})
	}
}
```

**Why this works:**
- `UserRepository` interface is mocked — tests run without a real database
- Mock callbacks control behavior: success, error, specific return values
- `embedded UserRepository` ensures the mock implements the interface
- `t.Run` with table-driven tests covers all cases from one function
- Test is fast, deterministic, and independent of external state

---

### Pattern 3: Benchmarks and Integration Tests (❌ BAD vs ✅ GOOD)

Benchmarks measure performance; integration tests verify correct behavior with real dependencies.

#### ❌ BAD — No Benchmarks or Integration Tests

```go
// ❌ BAD: no benchmarks, no integration tests — performance regressions go undetected
package search

func Search(query string, documents []Document) []Result {
	var results []Result
	for _, doc := range documents {
		if contains(doc.Content, query) {
			results = append(results, Result{Doc: doc, Score: score(doc, query)})
		}
	}
	return results
}

// No benchmark — performance is not measured
// No integration test — correctness with real data is not verified
```

**What's wrong:**
- No benchmark — performance regressions are invisible until they hit production
- No integration test — correctness with real data is unverified
- `contains()` is a simple string search — O(n*m) per document, very slow at scale
- No test coverage of the search ranking logic (`score()`)

#### ✅ GOOD — Benchmarks and Integration Tests

```go
// package: search

// BenchmarkSearch measures search performance with varying document counts.
func BenchmarkSearch(b *testing.B) {
	// Generate test data once (outside the loop)
	documents := make([]Document, 10000)
	for i := range documents {
		documents[i] = Document{
			ID:      fmt.Sprintf("doc-%d", i),
			Title:   fmt.Sprintf("Document %d", i),
			Content: generateContent(i),
		}
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		Search("Document", documents)
	}
}

// BenchmarkSearchIndex demonstrates the performance benefit of indexing.
func BenchmarkSearchIndex(b *testing.B) {
	documents := make([]Document, 10000)
	for i := range documents {
		documents[i] = Document{
			ID:      fmt.Sprintf("doc-%d", i),
			Title:   fmt.Sprintf("Document %d", i),
			Content: generateContent(i),
		}
	}

	// Build index once (outside the loop)
	idx := NewIndex()
	for _, doc := range documents {
		idx.Add(doc)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		idx.Search("Document")
	}
}

// package: search

//go:build integration

// TestSearchIntegration tests search against real data in a real Elasticsearch instance.
// Run with: go test -tags=integration ./search
func TestSearchIntegration(t *testing.T) {
	t.Skip("skip integration test unless -tags=integration is set")

	ctx := context.Background()
	es, err := NewClient("http://localhost:9200")
	if err != nil {
		t.Fatalf("failed to create Elasticsearch client: %v", err)
	}
	defer es.Close()

	// Setup: index test documents
	testDocs := []Document{
		{ID: "1", Title: "Go concurrency", Content: "Goroutines and channels"},
		{ID: "2", Title: "Go testing", Content: "Table-driven tests and benchmarks"},
		{ID: "3", Title: "Python asyncio", Content: "Async and await patterns"},
	}

	for _, doc := range testDocs {
		if err := es.Index(ctx, "docs", doc); err != nil {
			t.Fatalf("failed to index document: %v", err)
		}
	}

	// Refresh index to make documents searchable
	if err := es.Refresh(ctx, "docs"); err != nil {
		t.Fatalf("failed to refresh index: %v", err)
	}

	// Test: search for "Go"
	results, err := es.Search(ctx, "docs", "Go")
	if err != nil {
		t.Fatalf("search failed: %v", err)
	}

	if len(results) != 2 {
		t.Errorf("found %d results; want 2", len(results))
	}

	// Verify each result contains "Go" in title or content
	for _, r := range results {
		doc := r.Document.(Document)
		if !contains(doc.Title, "Go") && !contains(doc.Content, "Go") {
			t.Errorf("result document %q does not contain 'Go'", doc.ID)
		}
	}
}

// generateContent creates realistic test content for benchmarking.
func generateContent(seed int) string {
	words := []string{"the", "quick", "brown", "fox", "jumps", "over", "lazy", "dog"}
	var content strings.Builder
	for i := 0; i < 100; i++ {
		word := words[seed+i%len(words)]
		if i > 0 {
			content.WriteString(" ")
		}
		content.WriteString(word)
	}
	return content.String()
}
```

**Why this works:**
- `BenchmarkSearch` measures baseline linear search performance
- `BenchmarkSearchIndex` measures indexed search — the comparison shows the speedup
- `b.ResetTimer()` ensures warm-up time (index building) doesn't skew results
- `//go:build integration` tag excludes integration tests from normal test runs
- Integration test sets up real data, searches, and verifies results against expected count

---

## Constraints

### MUST DO

- **MUST** use table-driven tests for all functions with multiple input/output combinations
- **MUST** name test table entries descriptively (`"valid email"`, `"empty string"`, `"SQL injection"`)
- **MUST** use `t.Run(tt.name, ...)` to create sub-tests for each table entry
- **MUST** mock interfaces, never concrete types
- **MUST** use `go test -race` to verify no data races in all tests
- **MUST** separate integration tests with build tags (`//go:build integration`)
- **MUST** write benchmarks for all performance-critical code paths

### MUST NOT DO

- **MUST NOT** use `t.Fatal` in sub-tests — use `t.Error` instead (allows other sub-tests to run)
- **MUST NOT** share mutable state between parallel tests — each test must be independent
- **MUST NOT** skip tests with `t.Skip()` in CI — use build tags or environment checks instead
- **MUST NOT** use `time.Sleep` in tests — use channels, context cancellation, or test helpers
- **MUST NOT** test private (unexported) functions directly — test through exported interfaces

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `best-practices` | Go idioms, naming, and code organization for testable code |
| `modular-design` | Interface-based design that enables clean mocking |
| `database-patterns` | Repository patterns that work with mock implementations |
