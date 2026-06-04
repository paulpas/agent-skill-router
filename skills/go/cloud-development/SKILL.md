---
name: cloud-development
description: Develops cloud-native Go applications with context propagation, graceful
  shutdown, health checks, and configuration management for production.
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
  triggers: go cloud, cloud native go, go http server, graceful shutdown, go context,
    health check, cloud deployment, go configuration
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: best-practices, web-applications, modular-design, deployment-patterns
  maturity: stable
  completeness: 95
  exampleCount: 3
---
# Cloud-Native Go Development

Senior cloud engineer building production-grade Go services that start, serve, and stop cleanly in containerized environments. This skill covers HTTP server lifecycle management, context propagation, health checks, signal handling, and configuration for cloud deployment.

## TL;DR Checklist

- [ ] Server accepts `SIGINT` and `SIGTERM`, draining connections before exit
- [ ] All HTTP handlers accept `context.Context` as first parameter
- [ ] Health and readiness endpoints are separate and meaningful
- [ ] Configuration loads from env vars with sensible defaults and validation
- [ ] Request tracing (correlation IDs) propagates through all service boundaries
- [ ] Server uses `http.Server` with explicit timeouts (read, write, idle)

---

## When to Use

Use this skill when:

- Building a Go HTTP service intended for Kubernetes or cloud deployment
- Implementing graceful shutdown logic for a long-running server
- Designing health check endpoints for load balancer integration
- Setting up configuration management with environment variable hierarchy
- Adding request tracing and structured logging to a service

---

## When NOT to Use

Avoid this skill for:

- CLI applications that run to completion and exit (no lifecycle management needed)
- Short-lived batch jobs or workers without HTTP exposure
- Simple scripts or utilities that don't need cloud integration patterns

---

## Core Workflow

1. **Design the Server Lifecycle** — Define startup, serving, and shutdown phases with explicit lifecycle management.
   **Checkpoint:** Server can be started, stopped, and restarted without resource leaks.

2. **Implement Graceful Shutdown** — Handle `SIGINT`/`SIGTERM` to drain in-flight requests and close connections.
   **Checkpoint:** Shutdown completes within a configured deadline; stuck requests are cancelled.

3. **Add Health and Readiness Probes** — Separate liveness (is the process alive?) from readiness (can it serve traffic?).
   **Checkpoint:** Liveness checks are fast and never block; readiness depends on dependency health.

4. **Propagate Context Through All Layers** — Every function that does I/O or spans a timeout accepts `context.Context`.
   **Checkpoint:** No goroutine outlives its parent context without explicit detachment.

5. **Configure with Environment Hierarchy** — Load defaults → file → env vars → override, validate before starting.
   **Checkpoint:** Invalid configuration causes immediate startup failure with a clear error message.

---

## Implementation Patterns

### Pattern 1: Graceful Shutdown (❌ BAD vs ✅ GOOD)

Proper shutdown is critical for zero-downtime deployments and rolling restarts.

#### ❌ BAD — Abrupt Exit on Signal

```go
// ❌ BAD: server panics on interrupt signal, dropping all in-flight requests
func main() {
	http.HandleFunc("/api/data", handleData)

	server := &http.Server{
		Addr: ":8080",
	}

	// Signal handler panics — no graceful drain
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh
	panic("shutting down") // kills everything instantly
}
```

**What's wrong:**
- Panic terminates all goroutines instantly — no request drainage
- Load balancer still routes traffic to the dying pod
- Database connections and other resources are never closed
- Rolling restarts cause connection errors and dropped requests

#### ✅ GOOD — Structured Graceful Shutdown

```go
// runServer starts the HTTP server and handles graceful shutdown on signals.
// It drains in-flight requests and closes all resources before exiting.
func runServer(ctx context.Context, srv *http.Server, addr string) error {
	// Run server in a goroutine so we can wait for shutdown signal
	serverDone := make(chan struct{})
	go func() {
		defer close(serverDone)

		// ListenAndServe blocks until the server is shut down
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("server error: %v", err)
		}
	}()

	// Wait for interrupt or shutdown signal
	select {
	case <-ctx.Done():
		log.Println("shutdown signal received")
	case sig := <-sigChannel():
		log.Printf("received signal %v, initiating shutdown", sig)
	}

	// Create a deadline for graceful shutdown (drain in-flight requests)
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("server shutdown: %w", err)
	}

	<-serverDone
	log.Println("server stopped gracefully")
	return nil
}

// sigChannel returns a channel that receives SIGINT and SIGTERM.
func sigChannel() chan os.Signal {
	ch := make(chan os.Signal, 1)
	signal.Notify(ch, syscall.SIGINT, syscall.SIGTERM)
	return ch
}
```

**Why this works:**
- `srv.Shutdown()` stops accepting new connections and waits for in-flight requests
- Timeout prevents hanging forever on stuck requests
- Separate goroutine for `ListenAndServe` allows signal-based control
- Server exits cleanly after all resources are released

---

### Pattern 2: Health and Readiness Endpoints (❌ BAD vs ✅ GOOD)

Separate liveness (is the process alive?) from readiness (can it handle traffic?).

#### ❌ BAD — Single Health Endpoint

```go
// ❌ BAD: single endpoint checks everything — slow checks kill liveness probes
func handleHealth(w http.ResponseWriter, r *http.Request) {
	// Blocking database check in liveness probe
	rows, err := db.Query("SELECT 1")
	if err != nil {
		http.Error(w, "unhealthy", http.StatusServiceUnavailable)
		return
	}
	defer rows.Close()

	// Checks cache, message queue, external APIs — too many blocking calls
	w.WriteHeader(http.StatusOK)
	fmt.Fprintln(w, "ok")
}
```

**What's wrong:**
- Database query blocks the liveness probe — Kubernetes kills the pod if DB is slow
- Single endpoint conflates two different concerns
- Multiple blocking checks make the endpoint slow and unreliable
- Pod is killed (liveness fail) when it's actually healthy and could serve traffic

#### ✅ GOOD — Separated Health and Readiness

```go
// healthChecker reports whether the process is alive (fast, never blocks).
func healthHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Liveness: just check if we can reach the database at all
		// Uses a very short timeout — should never block
		ctx, cancel := context.WithTimeout(r.Context(), 1*time.Second)
		defer cancel()

		if err := db.PingContext(ctx); err != nil {
			http.Error(w, "not alive", http.StatusServiceUnavailable)
			return
		}

		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, "alive")
	}
}

// readinessHandler reports whether the service can accept traffic.
// Checks all dependencies that are required for normal operation.
func readinessHandler(db *sql.DB, cache *cache.Client, mq *mq.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()

		// Check each dependency; if ANY critical dep fails, we're not ready
		if err := db.PingContext(ctx); err != nil {
			http.Error(w, "not ready: db unavailable", http.StatusServiceUnavailable)
			return
		}
		if !cache.Ping(ctx) {
			http.Error(w, "not ready: cache unavailable", http.StatusServiceUnavailable)
			return
		}
		if err := mq.Connected(ctx); err != nil {
			http.Error(w, "not ready: mq unavailable", http.StatusServiceUnavailable)
			return
		}

		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, "ready")
	}
}
```

**Why this works:**
- Liveness probe is fast (1s timeout) and never blocks the process
- Readiness probe checks all dependencies — traffic is only routed when fully healthy
- Kubernetes can restart a "live but not ready" pod without dropping requests
- Each check has a clear error message for debugging

---

### Pattern 3: Configuration with Validation (❌ BAD vs ✅ GOOD)

Configuration should be explicit, validated, and impossible to misconfigure.

#### ❌ BAD — Implicit, Unvalidated Configuration

```go
// ❌ BAD: configuration loaded lazily, never validated, defaults hidden
var (
	dbHost     string
	dbPort     int
	apiKey     string
	logLevel   string
)

func init() {
	// init() is called at package load time — no error handling possible
	dbHost = os.Getenv("DB_HOST")      // "" if not set
	dbPort = 5432                       // magic number, not documented
	apiKey = os.Getenv("API_KEY")       // "" if not set — no validation
	logLevel = os.Getenv("LOG_LEVEL")   // invalid values accepted
}

func main() {
	// Bug surfaces hours later when a query fails with empty credentials
	runServer()
}
```

**What's wrong:**
- Configuration is global mutable state — race conditions in tests
- `init()` cannot return errors — failures are silent and hard to debug
- No validation — empty `API_KEY` is accepted, causing runtime failures
- Defaults are magic numbers with no documentation
- Configuration is loaded at package load time, not startup time

#### ✅ GOOD — Structured Configuration with Validation

```go
// Config holds all application configuration. Zero values are invalid —
// all fields must be explicitly set via LoadConfig.
type Config struct {
	Server ServerConfig
	Database DatabaseConfig
	Logging LoggingConfig
	API    APIConfig
}

// ServerConfig holds HTTP server configuration.
type ServerConfig struct {
	Addr    string
	Port    int
	ReadTimeout  time.Duration
	WriteTimeout time.Duration
	IdleTimeout  time.Duration
}

// DatabaseConfig holds database connection settings.
type DatabaseConfig struct {
	Host     string
	Port     int
	Name     string
	User     string
	Password string
	MaxConns int
}

// LoadConfig reads configuration from environment and validates it.
// Returns an error if required fields are missing or invalid.
func LoadConfig() (*Config, error) {
	cfg := &Config{}

	// Load with explicit defaults
	cfg.Server.Addr = envOr("SERVER_ADDR", "0.0.0.0")
	cfg.Server.Port = envIntOr("SERVER_PORT", 8080)
	cfg.Server.ReadTimeout = envDurationOr("READ_TIMEOUT", 15*time.Second)
	cfg.Server.WriteTimeout = envDurationOr("WRITE_TIMEOUT", 30*time.Second)
	cfg.Server.IdleTimeout = envDurationOr("IDLE_TIMEOUT", 120*time.Second)

	cfg.Database.Host = envOr("DB_HOST", "")
	cfg.Database.Port = envIntOr("DB_PORT", 5432)
	cfg.Database.Name = envOr("DB_NAME", "")
	cfg.Database.User = envOr("DB_USER", "")
	cfg.Database.Password = envOr("DB_PASSWORD", "")
	cfg.Database.MaxConns = envIntOr("DB_MAX_CONNS", 25)

	cfg.Logging.Level = envOr("LOG_LEVEL", "info")
	cfg.API.Key = envOr("API_KEY", "")

	// Validate required fields — fail fast at startup
	if err := cfg.Validate(); err != nil {
		return nil, fmt.Errorf("configuration validation: %w", err)
	}

	return cfg, nil
}

// Validate checks that all required configuration is present and valid.
func (c *Config) Validate() error {
	var errs []error

	if c.Database.Host == "" {
		errs = append(errs, errors.New("DB_HOST is required"))
	}
	if c.Database.Name == "" {
		errs = append(errs, errors.New("DB_NAME is required"))
	}
	if c.Database.User == "" {
		errs = append(errs, errors.New("DB_USER is required"))
	}
	if c.Database.Password == "" {
		errs = append(errs, errors.New("DB_PASSWORD is required"))
	}
	if c.API.Key == "" {
		errs = append(errs, errors.New("API_KEY is required"))
	}
	if c.Server.Port < 1 || c.Server.Port > 65535 {
		errs = append(errs, fmt.Errorf("SERVER_PORT must be 1-65535, got %d", c.Server.Port))
	}

	if len(errs) > 0 {
		return multiError(errs)
	}
	return nil
}

// envOr returns the environment variable value or the default.
func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

// multiError collects multiple validation errors into one.
type multiError []error

func (e multiError) Error() string {
	var msgs []string
	for _, err := range e {
		msgs = append(msgs, err.Error())
	}
	return strings.Join(msgs, "; ")
}
```

**Why this works:**
- `LoadConfig` returns an error — startup fails immediately with a clear message
- `Validate()` checks all required fields in one pass
- Struct types make configuration self-documenting
- Defaults are explicit and documented as parameters
- Testability — `LoadConfig` can be unit tested with explicit env var manipulation

---

## Constraints

### MUST DO

- **MUST** always shut down the HTTP server gracefully using `srv.Shutdown(ctx)` — never call `srv.Close()` directly
- **MUST** set explicit timeouts on all HTTP servers (`ReadTimeout`, `WriteTimeout`, `IdleTimeout`)
- **MUST** use `context.WithTimeout` for all database and external API calls within handlers
- **MUST** separate health (liveness) and readiness endpoints — never conflate them
- **MUST** validate all configuration before starting the server — fail fast at startup
- **MUST** propagate `context.Context` through all function boundaries that perform I/O

### MUST NOT DO

- **MUST NOT** use `http.ListenAndServe` without a timeout — it can block forever
- **MUST NOT** use `http.DefaultServeMux` in production — always use explicit routers
- **MUST NOT** use `panic()` for error handling — use structured error propagation
- **MUST NOT** store `*http.Request` or `http.ResponseWriter` in global state
- **MUST NOT** call `srv.Close()` — it doesn't drain in-flight requests, use `srv.Shutdown()` instead

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `best-practices` | Go idioms, naming, and error handling conventions |
| `web-applications` | HTTP handlers, routing, middleware, and REST API design |
| `modular-design` | Clean architecture and dependency injection for services |
| `deployment-patterns` | Multi-stage Docker builds and binary optimization |
