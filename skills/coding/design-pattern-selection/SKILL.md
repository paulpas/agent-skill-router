---
name: design-pattern-selection
description: Evaluates software problems against the GoF pattern catalog to select
  optimal design patterns based on structural requirements, complexity constraints,
  and runtime performance characteristics.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: design pattern, GoF pattern, factory method, strategy pattern, decorator
    pattern, observer pattern, how do i choose a pattern, structural pattern
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
  related-skills: modular-design, refactoring-techniques, dependency-inversion-principle
------
# Design Pattern Selection Guide

Selects optimal design patterns for code-level problems by analyzing structural requirements, evaluating trade-offs between complexity and flexibility, and implementing solutions with idiomatic Go. This skill makes the model classify problems against the Gang of Four (GoF) pattern catalog — Creational, Structural, or Behavioral — then produce concrete implementations that respect SOLID principles, avoid premature abstraction, and align with Go effective_go conventions.

## TL;DR Checklist

- [ ] Classify problem into exactly one GoF family: Creational (object creation), Structural (object composition), Behavioral (object interaction)
- [ ] Identify what changes independently in your system — that is the seam where a pattern belongs
- [ ] Evaluate trade-offs: complexity gain vs. runtime overhead for each candidate pattern
- [ ] Prefer composition and interfaces over inheritance; use struct embedding only for augmentation
- [ ] Verify selection does not violate SOLID principles, especially LSP and Open/Closed
- [ ] Implement with real Go idioms: interface{} contracts, explicit error handling, context propagation

---

## When to Use

Use this skill when:

- Starting a new module or service where structural decisions need documentation and justification
- Refactoring legacy code that exhibits tight coupling, God objects (>300 lines), or fragile hierarchies
- Designing extension points for a plugin system, transport layer, or serialization pipeline
- Implementing behavior that must vary at runtime (payment processors, notification channels, auth providers)
- Adding non-functional concerns (logging, caching, authentication) to existing interfaces without modifying them
- Optimizing hot paths where pattern overhead would create unacceptable latency

## When NOT to Use

Avoid this skill for:

- **Simple scripts with a single execution path** — Direct code is clearer; patterns add indirection without benefit
- **Trivial problems solvable by composition alone** — If two behaviors fit in a struct, don't introduce interfaces and strategy objects
- **Performance-critical inner loops** — Pattern overhead (interface dispatch, heap allocation for interface values) matters at microsecond scale; measure with `go test -benchmem` first
- **When dependency injection solves the problem** — DI is simpler than Factory Method when the caller controls construction

---

## Core Workflow

### Step 1: Classify the Problem Domain

Determine which GoF family your problem belongs to by asking what aspect of your system changes most independently:

- **Creational** — If the concrete type being instantiated varies (e.g., database drivers, message brokers, HTTP clients), you need a Creational pattern.
- **Structural** — If you need to add behavior or responsibilities to existing objects without subclassing (e.g., logging wrappers, auth middleware, compression layers), you need a Structural pattern.
- **Behavioral** — If the algorithm or communication flow between objects must vary at runtime (e.g., payment strategies, notification channels, sorting algorithms), you need a Behavioral pattern.

**Checkpoint:** Write down what changes independently in your system. Every change should map to exactly one family. If it maps to multiple families, decompose the problem further.

### Step 2: Enumerate Candidate Patterns

For the identified GoF family, list all applicable patterns. For each candidate, note:
- What problem it solves (concrete, not abstract)
- What interfaces/types it introduces
- Where in the call graph it sits

**Common candidates by family:**

| Family | Common Candidates | Best When |
|---|---|---|
| Creational | Factory Method, Abstract Factory, Builder, Singleton | Unknown subtype, complex setup, single shared instance |
| Structural | Adapter, Decorator, Proxy, Facade | Add behavior without changing interface, simplify complex subsystems |
| Behavioral | Strategy, Observer, Template Method, Chain of Responsibility | Runtime algorithm selection, event broadcasting, step-by-step processing |

**Checkpoint:** Do not proceed to implementation until you have at least 2 candidate patterns. If only one pattern fits, verify you are not oversimplifying the problem.

### Step 3: Evaluate Trade-off Matrix

Score each candidate across four dimensions. Use a consistent scale (1-5) and record justification for each score.

| Dimension | What It Measures | Weight |
|---|---|---|
| Complexity | Lines of boilerplate, cognitive load, number of new types | 30% |
| Runtime Overhead | Interface dispatch cost, heap allocations, indirection depth | 25% |
| Flexibility | How easily new variants can be added without modifying existing code | 25% |
| Testability | How easy it is to mock or substitute the pattern's abstractions in tests | 20% |

**Scoring guidance:**
- Complexity: 1 = "one struct, no interfaces needed", 5 = "four new types and a factory"
- Runtime Overhead: 1 = "zero overhead, same as direct code", 5 = "three levels of interface indirection with heap allocation"
- Flexibility: 1 = "adding a variant requires modifying existing code", 5 = "new variant is a single type with zero changes elsewhere"
- Testability: 1 = "hard to test without real dependencies", 5 = "trivial to mock via interfaces"

**Checkpoint:** The winning pattern must score >= 3 on all dimensions. A pattern that scores 1 on Runtime Overhead in a hot path is unacceptable regardless of other scores.

### Step 4: Verify Against Constraints

Before implementing, verify the selected pattern against these constraints:
- Does it violate SOLID? (Common violation: LSP broken by overriding methods to return defaults)
- Does it introduce more types than it solves problems for? (If a new variant needs 3+ type changes, reconsider)
- Can every interface be tested independently? If not, the abstraction is too coarse.
- Is the pattern aligned with Go conventions? (No inheritance hierarchies, prefer struct embedding, use error wrapping)

**Checkpoint:** If any constraint fails, return to Step 2 with a different candidate. Do not proceed with a pattern that violates constraints.

### Step 5: Implement with Go Idioms

Apply the selected pattern using idiomatic Go:
- Use interfaces (or `type` aliases where appropriate) for behavior contracts — define only what the consumer needs, nothing more
- Use error wrapping with `%w` and sentinel errors for failure modes
- Use struct embedding only for augmentation (adding capabilities), not inheritance simulation
- Accept `context.Context` as the first parameter on all public functions
- Return concrete types from constructors; return interface types from factory methods

**Checkpoint:** A new developer should be able to implement a correct consumer of any public interface without reading internal code.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Factory Method (Creational) — Transport Router

Use the Factory Method when you need to create objects whose concrete type depends on runtime configuration or environment, and callers must never depend on concrete types directly. This example routes transport requests through a configurable factory that selects SMTP, Twilio SMS, or Slack based on channel preference.

```go
package transport

import (
	"context"
	"fmt"
)

// Message represents an outgoing notification message.
type Message struct {
	To      string
	Subject string
	Body    string
}

// Transport is the interface that all transport backends implement.
type Transport interface {
	Send(ctx context.Context, msg Message) error
	Name() string
}

// TransportFactory creates transports based on a channel type string.
type TransportFactory struct {
	backends map[string]func() Transport
}

// NewTransportFactory constructs a factory with all registered transport types.
func NewTransportFactory() *TransportFactory {
	f := &TransportFactory{backends: make(map[string]func() Transport)}
	// Register all available backends — callers cannot access concrete types directly.
	f.backends["smtp"] = func() Transport { return &SMTPTransport{} }
	f.backends["sms"] = func() Transport { return &SMSGateway{} }
	f.backends["slack"] = func() Transport { return &SlackChannel{} }
	return f
}

// Get returns the transport for the given channel. Returns an error if the
// channel type is not registered, protecting callers from nil dereferences.
func (f *TransportFactory) Get(ctx context.Context, channel string) (Transport, error) {
	if ch, ok := f.backends[channel]; ok {
		return ch(), nil
	}
	return nil, fmt.Errorf("transport: unsupported channel %q", channel)
}

// SMTPTransport sends notifications via email.
type SMTPTransport struct {
	host string
	port int
}

func (s *SMTPTransport) Send(ctx context.Context, msg Message) error {
	if ctx.Err() != nil {
		return fmt.Errorf("smtp: context cancelled before send: %w", ctx.Err())
	}
	// Real implementation would connect to SMTP server here.
	return nil
}

func (s *SMTPTransport) Name() string { return "smtp" }

// SMSGateway sends notifications via SMS provider.
type SMSGateway struct {
	apiKey string
}

func (s *SMSGateway) Send(ctx context.Context, msg Message) error {
	if ctx.Err() != nil {
		return fmt.Errorf("sms: context cancelled before send: %w", ctx.Err())
	}
	// Real implementation would call SMS API here.
	return nil
}

func (s *SMSGateway) Name() string { return "sms" }

// SlackChannel sends notifications to a Slack channel.
type SlackChannel struct {
	webhookURL string
}

func (s *SlackChannel) Send(ctx context.Context, msg Message) error {
	if ctx.Err() != nil {
		return fmt.Errorf("slack: context cancelled before send: %w", ctx.Err())
	}
	// Real implementation would POST to Slack webhook.
	return nil
}

func (s *SlackChannel) Name() string { return "slack" }
```

#### Factory Method: BAD vs GOOD

```go
// ❌ BAD — Caller knows concrete types; cannot swap transport without changing code.
func sendEmail(ctx context.Context, to, subject, body string) error {
	client := &SMTPTransport{host: "smtp.example.com", port: 587} // Concrete type leak
	return client.Send(ctx, Message{To: to, Subject: subject, Body: body})
}

// ✅ GOOD — Factory hides concrete types; caller only knows Transport interface.
func Send(ctx context.Context, factory *TransportFactory, channel, to, subject, body string) error {
	transport, err := factory.Get(ctx, channel)
	if err != nil {
		return fmt.Errorf("send: %w", err)
	}
	return transport.Send(ctx, Message{To: to, Subject: subject, Body: body})
}

// Usage — no concrete types exposed to the caller.
func notifyAdmins(ctx context.Context, f *TransportFactory) error {
	return Send(ctx, f, "slack", "admin@example.com", "Alert", "System recovered")
}
```

**When to use:** You need callers to remain decoupled from concrete implementation types, and the type selection depends on configuration, environment, or user input.

**When NOT to use:** All instances of the product are identical (use a simple constructor) or you need families of related objects (use Abstract Factory instead).

---

### Pattern 2: Strategy Pattern (Behavioral) — Payment Processing

Use the Strategy pattern when an algorithm's implementation must vary at runtime and callers should be able to swap strategies without conditional logic. This example handles different payment processors (Stripe, PayPal, manual bank transfer) through a unified interface.

```go
package payment

import (
	"context"
	"fmt"
	"time"
)

// Transaction represents a payment transaction request.
type Transaction struct {
	Amount    float64
	Currency  string
	CustomerID string
	Metadata   map[string]string
}

// Result contains the outcome of a payment attempt.
type Result struct {
	Success       bool
	TransactionID string
	Provider      string
	Message       string
	RetriedAt     time.Time
}

// Processor is the strategy interface that all payment providers implement.
type Processor interface {
	Name() string
	Process(ctx context.Context, txn Transaction) (*Result, error)
	CanRetry() bool
}

// ProcessorRegistry holds available payment processors and selects one by name.
type ProcessorRegistry struct {
	processors map[string]Processor
}

// NewProcessorRegistry creates a registry with all registered processors.
func NewProcessorRegistry() *ProcessorRegistry {
	r := &ProcessorRegistry{processors: make(map[string]Processor)}
	r.register(&StripeProcessor{})
	r.register(&PayPalProcessor{})
	r.register(&ManualTransferProcessor{})
	return r
}

func (r *ProcessorRegistry) register(p Processor) {
	r.processors[p.Name()] = p
}

// Get returns the processor for the given name. Callers never see concrete types.
func (r *ProcessorRegistry) Get(name string) (Processor, error) {
	p, ok := r.processors[name]
	if !ok {
		return nil, fmt.Errorf("payment: unknown processor %q", name)
	}
	return p, nil
}

// Process delegates to the selected strategy — no conditional logic in caller.
func (r *ProcessorRegistry) Process(ctx context.Context, name string, txn Transaction) (*Result, error) {
	processor, err := r.Get(name)
	if err != nil {
		return nil, fmt.Errorf("payment: select processor: %w", err)
	}
	result, err := processor.Process(ctx, txn)
	if err != nil && processor.CanRetry() {
		result = &Result{
			Success:       false,
			TransactionID: "",
			Provider:      name,
			Message:       "retryable failure",
			RetriedAt:     time.Now(),
		}
		return result, fmt.Errorf("payment: %w (will retry)", err)
	}
	if err != nil {
		return result, fmt.Errorf("payment: %w", err)
	}
	result.Provider = name
	return result, nil
}

// StripeProcessor implements payment via Stripe API.
type StripeProcessor struct{}

func (*StripeProcessor) Name() string { return "stripe" }

func (*StripeProcessor) Process(ctx context.Context, txn Transaction) (*Result, error) {
	if txn.Amount <= 0 {
		return nil, fmt.Errorf("stripe: amount must be positive, got %f", txn.Amount)
	}
	// Real implementation: POST /v1/charges to Stripe API.
	return &Result{
		Success:       true,
		TransactionID: "stripe_" + txn.CustomerID + "_" + fmt.Sprintf("%d", time.Now().Unix()),
		Message:       "charged via Stripe",
	}, nil
}

func (*StripeProcessor) CanRetry() bool { return true }

// PayPalProcessor implements payment via PayPal API.
type PayPalProcessor struct{}

func (*PayPalProcessor) Name() string { return "paypal" }

func (*PayPalProcessor) Process(ctx context.Context, txn Transaction) (*Result, error) {
	if txn.Currency != "USD" {
		return nil, fmt.Errorf("paypal: only USD supported, got %q", txn.Currency)
	}
	// Real implementation: PayPal REST API checkout.
	return &Result{
		Success:       true,
		TransactionID: "paypal_" + txn.CustomerID,
		Message:       "paid via PayPal",
	}, nil
}

func (*PayPalProcessor) CanRetry() bool { return false }

// ManualTransferProcessor records a bank transfer as manual.
type ManualTransferProcessor struct{}

func (*ManualTransferProcessor) Name() string { return "manual" }

func (*ManualTransferProcessor) Process(ctx context.Context, txn Transaction) (*Result, error) {
	// Bank transfers require human verification — always "pending" initially.
	return &Result{
		Success:       false,
		TransactionID: "",
		Message:       "manual transfer awaiting reconciliation",
	}, nil
}

func (*ManualTransferProcessor) CanRetry() bool { return false }
```

#### Strategy Pattern: BAD vs GOOD

```go
// ❌ BAD — Conditional dispatch couples caller to every concrete processor type.
func ProcessPayment(name string, txn Transaction) (*Result, error) {
	switch name {
	case "stripe":
		p := &StripeProcessor{} // Concrete type leak, hard to test
		return p.Process(context.Background(), txn)
	case "paypal":
		p := &PayPalProcessor{}
		return p.Process(context.Background(), txn)
	default:
		return nil, fmt.Errorf("unknown payment method")
	}
}

// ✅ GOOD — Strategy interface abstracts the algorithm; registry manages selection.
func ProcessPayment(ctx context.Context, registry *ProcessorRegistry, name string, txn Transaction) (*Result, error) {
	// Registry.Get + CanRetry handles all dispatch logic.
	return registry.Process(ctx, name, txn)
}

// Adding a new processor requires only: registering it with NewProcessorRegistry().
// No changes to ProcessPayment or any caller code. Open/Closed Principle satisfied.
```

**When to use:** You have multiple algorithms that solve the same problem and you need to swap them at runtime without modifying client code. Each algorithm has different invariants (e.g., PayPal requires USD, Stripe accepts multi-currency).

**When NOT to use:** If there is only one implementation today and no foreseeable variants, use direct calls. The Strategy pattern adds three types (interface + registry + implementations) per strategy — count the cost before applying it.

---

### Pattern 3: Decorator Pattern (Structural) — HTTP Middleware Pipeline

Use the Decorator pattern when you need to add responsibilities to individual objects dynamically without modifying their source code or creating a parallel class hierarchy. This example implements HTTP request middleware (auth, logging, rate limiting) as composable decorators.

```go
package middleware

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"time"
)

// Handler is the base interface that all HTTP handlers implement.
type Handler interface {
	ServeHTTP(ctx context.Context, w http.ResponseWriter, r *http.Request) error
}

// Middleware wraps a Handler to add cross-cutting concerns.
type Middleware func(Handler) Handler

// LoggingMiddleware logs every request with duration and status.
func LoggingMiddleware(logger *slog.Logger) Middleware {
	return func(next Handler) Handler {
		return &loggingDecorator{next: next, logger: logger}
	}
}

type loggingDecorator struct {
	next   Handler
	logger *slog.Logger
}

func (d *loggingDecorator) ServeHTTP(ctx context.Context, w http.ResponseWriter, r *http.Request) error {
	start := time.Now()
	err := d.next.ServeHTTP(ctx, w, r)
	duration := time.Since(start)
	level := slog.LevelInfo
	if err != nil {
		level = slog.LevelError
	}
	d.logger.Log(ctx, level, "request",
		"method", r.Method,
		"path", r.URL.Path,
		"duration", duration,
		"error", err,
	)
	return err
}

// AuthMiddleware verifies a Bearer token before delegating to the next handler.
func AuthMiddleware(secret string) Middleware {
	return func(next Handler) Handler {
		return &authDecorator{next: next, secret: secret}
	}
}

type authDecorator struct {
	next   Handler
	secret string
}

func (d *authDecorator) ServeHTTP(ctx context.Context, w http.ResponseWriter, r *http.Request) error {
	token := r.Header.Get("Authorization")
	if token == "" {
		http.Error(w, "missing authorization header", http.StatusUnauthorized)
		return fmt.Errorf("auth: missing authorization header")
	}
	// Strip "Bearer " prefix for comparison.
	if len(token) > 7 && token[:7] == "Bearer " && token[7:] == d.secret {
		return d.next.ServeHTTP(ctx, w, r)
	}
	http.Error(w, "invalid authorization", http.StatusUnauthorized)
	return fmt.Errorf("auth: invalid token")
}

// RateLimitMiddleware enforces a maximum number of requests per window.
func RateLimitMiddleware(maxPerWindow int, window time.Duration) Middleware {
	return func(next Handler) Handler {
		return &rateLimitDecorator{
			next:      next,
			maxPerWindow: maxPerWindow,
			window:    window,
		}
	}
}

type rateLimitDecorator struct {
	next         Handler
	maxPerWindow int
	window       time.Duration
	count        int
	windowStart  time.Time
}

func (d *rateLimitDecorator) ServeHTTP(ctx context.Context, w http.ResponseWriter, r *http.Request) error {
	now := time.Now()
	if now.Sub(d.windowStart) > d.window {
		d.count = 0
		d.windowStart = now
	}
	d.count++
	if d.count > d.maxPerWindow {
		http.Error(w, "rate limit exceeded", http.StatusTooManyRequests)
		return fmt.Errorf("middleware: rate limit exceeded (%d/%d in %v)", d.count, d.maxPerWindow, d.window)
	}
	return d.next.ServeHTTP(ctx, w, r)
}

// Compose applies middlewares in reverse order so the first middleware in the list
// executes last (innermost) — matching typical HTTP middleware stack semantics.
func Compose(h Handler, middlewares ...Middleware) Handler {
	for i := len(middlewares) - 1; i >= 0; i-- {
		h = middlewares[i](h)
	}
	return h
}
```

#### Decorator Pattern: BAD vs GOOD

```go
// ❌ BAD — Adding logging to every handler requires duplicating log statements.
type UserHandler struct{}

func (h *UserHandler) Handle(w http.ResponseWriter, r *http.Request) {
	start := time.Now() // Logged in every handler — duplication everywhere
	// ... user logic ...
	duration := time.Since(start)
	fmt.Printf("request took %v\n", duration) // No structured logging, no levels
}

// ✅ GOOD — Logging is a single middleware that decorates any Handler.
// The UserHandler has zero logging code; logging behavior is composed at wiring time.
userHandler := &UserHandler{}
handler := Compose(
	userHandler,
	LoggingMiddleware(slog.Default()),
	AuthMiddleware(os.Getenv("API_SECRET")),
	RateLimitMiddleware(100, time.Minute),
)

// Adding a new middleware (e.g., caching) requires one line of code and zero
// changes to existing handlers. Each decorator is independently testable.
```

**When to use:** You need to add cross-cutting concerns (auth, logging, metrics, retries) to many handlers without modifying each handler's source code or creating a parallel inheritance hierarchy.

**When NOT to use:** If only one handler needs the concern and it will never change, inline it directly. Decorator indirection has measurable overhead: each decoration adds a method call and an interface dispatch. In hot paths with >10k requests/sec, profile before adding layers.

---

## Trade-off Analysis

The following table compares common GoF patterns across key dimensions to aid selection decisions. Scores are relative (1 = minimal concern, 5 = significant concern).

| Pattern | Complexity (1-5) | Runtime Overhead (1-5) | Flexibility (1-5) | Testability (1-5) | When It Wins |
|---|---|---|---|---|---|
| Factory Method | 3 | 2 | 4 | 4 | Unknown subtype at compile time |
| Strategy | 3 | 2 | 5 | 5 | Runtime algorithm selection |
| Decorator | 3 | 3 | 4 | 4 | Add behavior without changing interface |
| Observer | 4 | 2 | 4 | 3 | Event broadcasting with dynamic subscribers |
| Singleton | 1 | 1 | 1 | 5 | Shared immutable resource (rare) |
| Adapter | 2 | 1 | 2 | 3 | Integrate incompatible interfaces |
| Proxy | 3 | 3 | 3 | 4 | Control access to expensive objects |

**Decision heuristics:**

- **Runtime overhead is the primary filter for hot paths.** Any pattern adding interface indirection (Strategy, Decorator, Factory Method) adds approximately 2-5ns per call due to dynamic dispatch. In loops with >1M iterations, benchmark before applying.
- **Flexibility should be weighted higher for library code.** If your code is a package consumed by others, the flexibility score matters more — consumers benefit from being able to substitute implementations.
- **Testability is a proxy for abstraction quality.** If a pattern's interface cannot be tested in isolation, it is too coarse-grained or too fine-grained. The sweet spot is an interface with 2-5 methods that fully describe one capability.

---

## Constraints

### MUST DO

- Classify every problem into exactly one GoF family before evaluating patterns — do not mix families at the same level
- Define interfaces using structural typing (duck typing via `interface{}`) — only include methods that callers actually invoke, never methods the implementor needs
- Use error wrapping with `%w` for all errors returned across abstraction boundaries; use sentinel errors (e.g., `ErrUnsupportedChannel`) for known failure modes checkable with `errors.Is()`
- Accept `context.Context` as the first parameter on every public method that performs I/O or can take >100ms
- Use struct embedding only for capability augmentation (adding methods to an existing type), never to simulate inheritance — Go has no inheritance
- Verify LSP compliance: subtype behavior must be a strict strengthening, never weakening, of the supertype contract
- Document every public interface with its preconditions, postconditions, and error contract in godoc comments

### MUST NOT DO

- Use inheritance hierarchies to share code between unrelated types — extract shared logic into standalone helper functions or use composition via interfaces
- Create interfaces with a single method without justification — prefer explicit function signatures or small structs for simple contracts
- Implement Singleton for shared mutable state — it creates hidden dependencies and makes testing impossible; use dependency injection instead
- Add pattern boilerplate before a second concrete implementation exists — premature abstraction is the most common Go anti-pattern
- Return interface types from constructors that create internal objects — only factories and dependency injection points should return interfaces
- Use `panic` for error handling in library code — return errors and let callers decide how to handle them

---

## Output Template

When this skill is active, produce the following output:

1. **Problem Classification** — State the GoF family (Creational/Structural/Behavioral) and one-sentence rationale based on what changes independently
2. **Candidate Patterns** — List 2-3 candidate patterns with a brief "why" for each, referencing the specific problem aspect it addresses
3. **Trade-off Table** — Score each candidate on Complexity, Runtime Overhead, Flexibility, and Testability (1-5) with one-sentence justification per score
4. **Recommended Pattern** — Name the selected pattern and state which constraint(s) made it win over alternatives
5. **Interface Definition** — Go interface block with godoc comments describing preconditions and error contract
6. **Implementation Skeleton** — Complete, compilable Go code implementing the pattern with proper error wrapping and context propagation
7. **Usage Example** — One concrete usage showing the pattern in action with no concrete types leaked to the caller

---

## Related Skills

| Skill | Purpose |
|---|---|
| `modular-design` | Determines module boundaries and dependency direction before selecting patterns for internal structure |
| `refactoring-techniques` | Applies systematic refactoring to existing code that is too tightly coupled for direct pattern application |
| `dependency-inversion-principle` | Enforces the DIP layer that makes Factory Method and Strategy patterns effective in practice |
| `behavioral-design-patterns` | Deep reference for all Behavioral patterns beyond Strategy (Observer, Template Method, Chain of Responsibility) |

---

## Pattern Selection Decision Tree

```
What changes independently?
│
├─ The concrete type to instantiate ──→ Creational Family
│   ├─ Single product type with unknown subtype ──→ Factory Method
│   ├─ Families of related products ───────────────→ Abstract Factory
│   ├─ Complex multi-step construction ────────────→ Builder
│   └─ Shared single instance needed ──────────────→ Singleton (prefer DI)
│
├─ The behavior or responsibility ─────────────────→ Structural Family
│   ├─ Add behavior dynamically, per object ───────→ Decorator
│   ├─ Bridge incompatible interfaces ─────────────→ Adapter
│   ├─ Control access to expensive object ─────────→ Proxy
│   └─ Simplify complex subsystem interface ───────→ Facade
│
└─ The interaction or algorithm ──────────────────→ Behavioral Family
    ├─ Algorithm must be swappable at runtime ─────→ Strategy
    ├─ Notify multiple objects of state change ────→ Observer
    ├─ Define algorithm skeleton with variable steps → Template Method
    └─ Chain handlers until one processes ─────────→ Chain of Responsibility
```
