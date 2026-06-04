---
name: advanced-patterns
description: Applies advanced Go patterns including generics, reflection, functional
  options, and metaprogramming for performance-critical and framework-level code.
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
  triggers: go generics, go reflection, go unsafe, go functional options, go option
    pattern, go compile time, go metaprogramming
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: best-practices, modular-design, concurrency-patterns, database-patterns
  maturity: stable
  completeness: 95
  exampleCount: 3
---
# Advanced Go Patterns

Senior Go engineer applying advanced language features for framework-level and performance-critical code. This skill covers generics, reflection, functional options, compile-time assertions, and safe metaprogramming.

## TL;DR Checklist

- [ ] Use generics for type-safe collections and algorithms — prefer over interfaces when possible
- [ ] Use the functional options pattern for constructors with many optional parameters
- [ ] Use `go:embed` for compile-time asset inclusion — never hardcode file paths
- [ ] Use `type _ interface{}` compile-time assertions to verify interface satisfaction
- [ ] Avoid reflection unless necessary — it bypasses the type system and is slow
- [ ] Never use `unsafe` unless you fully understand the memory layout and aliasing rules

---

## When to Use

Use this skill when:

- Building a framework or library that needs type-safe generic APIs
- Designing constructors with many optional parameters (functional options)
- Need compile-time asset embedding (`go:embed`)
- Writing performance-critical code where reflection overhead is unacceptable
- Creating compile-time assertions to catch interface violations at build time

---

## When NOT to Use

Avoid this skill for:

- Application business logic — simple code is better than clever code
- When a plain interface or struct method would solve the problem
- Any code where readability matters more than abstraction
- Code that will be maintained by developers unfamiliar with advanced Go patterns

---

## Core Workflow

1. **Choose the Right Abstraction** — Decide between interfaces, generics, or composition.
   **Checkpoint:** The abstraction adds value — it reduces code duplication or enables type safety.

2. **Implement the Pattern** — Write the generic function, option type, or reflection logic.
   **Checkpoint:** Code compiles with `go vet` — no type safety violations.

3. **Add Compile-Time Assertions** — Verify that types satisfy expected interfaces.
   **Checkpoint:** Compilation fails if the interface contract is violated.

4. **Benchmark Performance** — Ensure the pattern doesn't add unacceptable overhead.
   **Checkpoint:** Benchmark shows acceptable performance vs. the non-abstracted version.

5. **Document the Pattern** — Explain why the pattern was chosen and how to use it.
   **Checkpoint:** Usage examples are included in godoc comments.

---

## Implementation Patterns

### Pattern 1: Generics (❌ BAD vs ✅ GOOD)

Generics enable type-safe code without runtime type assertions.

#### ❌ BAD — Interface-Based Collection

```go
// ❌ BAD: interface{} requires runtime type assertions — unsafe and slow
type Stack struct {
	items []interface{}
}

func (s *Stack) Push(item interface{}) {
	s.items = append(s.items, item)
}

func (s *Stack) Pop() interface{} {
	if len(s.items) == 0 {
		return nil
	}
	item := s.items[len(s.items)-1]
	s.items = s.items[:len(s.items)-1]
	return item
}

// Usage requires type assertion — easy to get wrong
func processStack() {
	s := &Stack{}
	s.Push("hello")
	s.Push(42) // compiles — but wrong type!

	// Runtime type assertion — panics if type is wrong
	str := s.Pop().(string) // panics if the top item was 42
	fmt.Println(str)
}
```

**What's wrong:**
- `interface{}` accepts any type — `s.Push(42)` compiles but is semantically wrong
- `Pop().(string)` panics at runtime if the type is wrong
- No compile-time safety — type errors are runtime errors
- `interface{}` has allocation overhead — each value is boxed
- No documentation of the expected element type

#### ✅ GOOD — Generic Stack

```go
// Stack is a generic LIFO (last-in, first-out) data structure.
// The element type T is specified at construction time.
type Stack[T any] struct {
	items []T
}

// NewStack creates a new generic stack.
func NewStack[T any]() *Stack[T] {
	return &Stack[T]{items: make([]T, 0)}
}

// Push adds an item to the top of the stack.
func (s *Stack[T]) Push(item T) {
	s.items = append(s.items, item)
}

// Pop removes and returns the top item.
// Returns zero value of T and false if the stack is empty.
func (s *Stack[T]) Pop() (T, bool) {
	if len(s.items) == 0 {
		var zero T
		return zero, false
	}
	item := s.items[len(s.items)-1]
	s.items = s.items[:len(s.items)-1]
	return item, true
}

// Len returns the number of items in the stack.
func (s *Stack[T]) Len() int {
	return len(s.items)
}

// IsEmpty returns true if the stack has no items.
func (s *Stack[T]) IsEmpty() bool {
	return len(s.items) == 0
}

// Usage — type is enforced at compile time
func processStack() {
	// String stack
	strStack := NewStack[string]()
	strStack.Push("hello")
	strStack.Push("world")

	str, ok := strStack.Pop()
	if !ok {
		log.Fatal("stack is empty")
	}
	fmt.Println(str) // "world"

	// This would not compile — type is enforced:
	// strStack.Push(42) // ❌ cannot use 42 (int) as string

	// Int stack — separate type
	intStack := NewStack[int]()
	intStack.Push(42)
	intStack.Push(100)

	n, ok := intStack.Pop()
	if ok {
		fmt.Println(n) // 100
	}
}
```

**Why this works:**
- Type is specified at construction time — `NewStack[string]()` creates a string stack
- Compile-time enforcement — `strStack.Push(42)` does not compile
- No runtime type assertions — `Pop()` returns `(T, bool)` — zero value on empty
- No allocation overhead — values are stored directly, not boxed as `interface{}`
- Clear API — `IsEmpty()`, `Len()`, and the `(T, bool)` return make usage obvious

---

### Pattern 2: Functional Options (❌ BAD vs ✅ GOOD)

The functional options pattern provides a clean API for constructors with many optional parameters.

#### ❌ BAD — Many Optional Parameters

```go
// ❌ BAD: too many parameters — hard to use, easy to forget required ones
type Server struct {
	Addr      string
	Port      int
	Timeout   time.Duration
	CertFile  string
	KeyFile   string
	MaxConns  int
	KeepAlive bool
	ReadBuf   int
	WriteBuf  int
	Debug     bool
}

// Constructor with 10 parameters — 7 optional, 3 required
func NewServer(addr string, port int, timeout time.Duration,
	certFile string, keyFile string, maxConns int,
	keepAlive bool, readBuf int, writeBuf int, debug bool) *Server {
	// ...
}

// Usage — which parameters are optional? What are the defaults?
// Hard to read, easy to mess up
server := NewServer("0.0.0.0", 8080, 30*time.Second,
	"cert.pem", "key.pem", 100,
	true, 4096, 4096, false)
```

**What's wrong:**
- 10 parameters — impossible to remember which are required vs. optional
- No documentation of defaults — caller must guess
- Order matters — swapping `certFile` and `keyFile` is a silent bug
- Adding a new parameter breaks all callers
- Hard to set just one option without specifying all others

#### ✅ GOOD — Functional Options Pattern

```go
// Server provides an HTTP server with configurable options.
type Server struct {
	addr       string
	port       int
	timeout    time.Duration
	certFile   string
	keyFile    string
	maxConns   int
	keepAlive  bool
	readBuf    int
	writeBuf   int
	debug      bool
}

// Option configures a Server via functional options.
type Option func(*Server)

// WithAddr sets the server address. Default: "0.0.0.0".
func WithAddr(addr string) Option {
	return func(s *Server) {
		s.addr = addr
	}
}

// WithPort sets the server port. Default: 8080.
func WithPort(port int) Option {
	return func(s *Server) {
		s.port = port
	}
}

// WithTimeout sets the read/write timeout. Default: 30s.
func WithTimeout(timeout time.Duration) Option {
	return func(s *Server) {
		s.timeout = timeout
	}
}

// WithTLS sets TLS certificate and key files.
func WithTLS(certFile, keyFile string) Option {
	return func(s *Server) {
		s.certFile = certFile
		s.keyFile = keyFile
	}
}

// WithMaxConns sets the maximum number of connections. Default: 100.
func WithMaxConns(maxConns int) Option {
	return func(s *Server) {
		s.maxConns = maxConns
	}
}

// WithDebug enables debug logging. Default: false.
func WithDebug(enabled bool) Option {
	return func(s *Server) {
		s.debug = enabled
	}
}

// NewServer creates a Server with the given options.
// All options are optional — defaults are applied for unset values.
func NewServer(options ...Option) *Server {
	s := &Server{
		addr:     "0.0.0.0",
		port:     8080,
		timeout:  30 * time.Second,
		maxConns: 100,
		readBuf:  4096,
		writeBuf: 4096,
	}

	// Apply options in order — last one wins for conflicting options
	for _, opt := range options {
		opt(s)
	}

	return s
}

// Usage — clean, readable, only specify what you need
server := NewServer(
	WithPort(9090),
	WithTimeout(60*time.Second),
	WithTLS("cert.pem", "key.pem"),
	WithDebug(true),
)

// Minimal usage — all defaults
server := NewServer()

// Override a single default
server := NewServer(WithPort(443))
```

**Why this works:**
- Each option is a self-documenting function — `WithPort(9090)` is readable
- Order doesn't matter — options are applied sequentially in `NewServer`
- Adding options is easy — new `WithXxx` functions don't break existing callers
- Defaults are explicit in `NewServer` — caller knows what happens with no options
- Type-safe — `WithPort("abc")` doesn't compile

---

### Pattern 3: Compile-Time Assertions and go:embed (❌ BAD vs ✅ GOOD)

Compile-time assertions catch interface violations at build time. `go:embed` includes assets at compile time.

#### ❌ BAD — Runtime Interface Checking

```go
// ❌ BAD: interface satisfaction checked at runtime — too late
type Repository interface {
	Get(ctx context.Context, id string) (*User, error)
	Create(ctx context.Context, user *User) error
}

type MockRepository struct{}

func (m *MockRepository) Get(ctx context.Context, id string) (*User, error) {
	return nil, nil
}

// No compile-time check — if MockRepository doesn't implement Repository,
// the error surfaces only when the code is compiled (and only if someone
// tries to assign it)
func main() {
	// This would silently fail to compile if MockRepository is missing a method,
	// but only at the assignment site — no clear error message
	var repo Repository = &MockRepository{}
	_ = repo
}

// ❌ BAD: hardcoding asset paths — breaks if files move
func loadTemplate() string {
	data, err := os.ReadFile("templates/profile.html")
	if err != nil {
		log.Fatal(err)
	}
	return string(data)
}
```

**What's wrong:**
- No compile-time guarantee that `MockRepository` implements `Repository`
- If a method is added to the interface, the mock won't compile — but only at the usage site
- Hardcoded file paths — fragile, breaks on different machines/environments
- `os.ReadFile` at runtime — template loading happens on every call

#### ✅ GOOD — Compile-Time Assertions with go:embed

```go
// package: internal/user

// Compile-time interface assertion.
// This line will fail to compile if *MockRepository does NOT implement UserRepository.
var _ UserRepository = (*MockRepository)(nil)

// MockRepository implements UserRepository for testing.
type MockRepository struct {
	users map[string]*User
}

func NewMockRepository() *MockRepository {
	return &MockRepository{users: make(map[string]*User)}
}

func (m *MockRepository) Get(ctx context.Context, id string) (*User, error) {
	user, ok := m.users[id]
	if !ok {
		return nil, fmt.Errorf("user %s not found", id)
	}
	return user, nil
}

func (m *MockRepository) Create(ctx context.Context, user *User) error {
	if _, ok := m.users[user.ID]; ok {
		return fmt.Errorf("user %s already exists", user.ID)
	}
	m.users[user.ID] = user
	return nil
}

// Multiple interface assertions in one line
var (
	_ UserRepository = (*MockRepository)(nil)
	_ io.Reader      = (*MockRepository)(nil)
	_ io.Closer      = (*MockRepository)(nil)
)
```

```go
// package: web

//go:embed templates/*.html
var templateFS embed.FS

// templateCache holds pre-parsed templates.
var templateCache = sync.OnceValue(func() *template.Template {
	tmpl := template.Must(template.New("").ParseFS(templateFS, "templates/*.html"))
	return tmpl
})

// renderProfile renders the user profile page.
func renderProfile(w http.ResponseWriter, user *User) {
	tmpl := templateCache()
	if err := tmpl.ExecuteTemplate(w, "profile.html", user); err != nil {
		log.Printf("template error: %v", err)
		http.Error(w, "internal error", 500)
	}
}
```

**Directory structure:**
```
myapp/
├── cmd/
│   └── server/
│       └── main.go
├── internal/
│   ├── user/
│   │   └── repository.go      // UserRepository interface + MockRepository
│   └── web/
│       ├── handler.go         // renderProfile with go:embed
│       └── templates/
│           ├── profile.html
│           ├── list.html
│           └── error.html
├── go.mod
└── go.sum
```

**Why this works:**
- `var _ UserRepository = (*MockRepository)(nil)` — fails to compile if the mock doesn't implement the interface
- The nil pointer `(*MockRepository)(nil)` is never created at runtime — it's a compile-time only check
- `//go:embed` includes HTML templates in the binary at compile time — no runtime file reads
- `sync.OnceValue` (Go 1.23+) lazily parses templates once — zero overhead on first access, cached thereafter
- Template paths are relative to the source file — no hardcoded strings
- Templates are bundled in the binary — deployment is a single binary

---

## Constraints

### MUST DO

- **MUST** use generics for type-safe collections and algorithms — prefer over `interface{}` when the type is known at construction
- **MUST** use the functional options pattern for constructors with more than 3 optional parameters
- **MUST** use `//go:embed` for including static assets — never hardcode file paths
- **MUST** add compile-time interface assertions with `var _ Interface = (*Type)(nil)`
- **MUST** document generic type parameters with godoc comments (`// T is the element type`)
- **MUST** benchmark any code that uses reflection — ensure overhead is acceptable

### MUST NOT DO

- **MUST NOT** use reflection to access private fields — it bypasses the type system and is fragile
- **MUST NOT** use `unsafe` without a thorough understanding of memory layout and aliasing rules
- **MUST NOT** overuse generics — simple interfaces or concrete types are often clearer
- **MUST NOT** use functional options for constructors with fewer than 3 optional parameters — plain structs are simpler
- **MUST NOT** embed files with `go:embed` that change frequently — embedded files are baked into the binary at compile time
- **MUST NOT** use `type _ interface{}` assertions in production code without a clear reason — they add maintenance overhead

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `best-practices` | Go idioms and code organization |
| `modular-design` | Interface-based design that works with generics |
| `concurrency-patterns` | Generic concurrency utilities (channels, workers) |
| `database-patterns` | Generic repository patterns for type-safe data access |
