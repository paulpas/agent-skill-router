---




name: web-applications
description: Builds production Go web applications with HTTP handlers, routing, middleware,
  template rendering, and REST API design following idiomatic Go patterns.
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
  triggers: go web, go http, go router, go middleware, go rest api, go templates,
    go websocket
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: cloud-development, best-practices, database-patterns, modular-design
  maturity: stable
  completeness: 95
  exampleCount: 3




---




# Go Web Applications

Senior web engineer building production Go web applications with idiomatic HTTP handling, clean routing, reusable middleware, template rendering, and RESTful API design. This skill covers everything from basic handlers to WebSocket connections.

## TL;DR Checklist

- [ ] Handlers accept `(http.ResponseWriter, *http.Request)` — never store request globally
- [ ] Use explicit routers (chi, mux, or net/http.ServeMux) — never rely on DefaultServerMux in production
- [ ] Middleware composes cleanly using the `func(http.Handler) http.Handler` pattern
- [ ] JSON responses have consistent structure with status codes and error messages
- [ ] Template rendering uses `html/template` for XSS protection
- [ ] All external calls (DB, APIs) use context with deadlines

---

## When to Use

Use this skill when:

- Building a Go HTTP API or web application from scratch
- Designing RESTful endpoints with proper status codes and response formats
- Implementing middleware chains (auth, logging, recovery, rate limiting)
- Rendering server-side HTML templates with `html/template`
- Adding WebSocket support for real-time communication
- Refactoring a monolithic handler into a clean routing architecture

---

## When NOT to Use

Avoid this skill for:

- gRPC-based microservices (use the gRPC/protobuf patterns instead)
- Static file serving only (use a CDN or nginx directly)
- GraphQL APIs (use a dedicated GraphQL server like gqlgen)

---

## Core Workflow

1. **Define the Router** — Choose an explicit router and register all routes with typed handlers.
   **Checkpoint:** No routes use `http.DefaultServeMux` — all routes are explicitly registered.

2. **Build Middleware** — Compose handlers using the `func(http.Handler) http.Handler` pattern for reusability.
   **Checkpoint:** Each middleware is independent and can be reordered without side effects.

3. **Implement Handlers** — Each handler reads from the request, calls business logic, and writes a response.
   **Checkpoint:** Handlers never contain business logic — they delegate to service layers.

4. **Standardize Responses** — All API responses follow a consistent JSON structure with status codes.
   **Checkpoint:** Every handler returns the correct HTTP status code (200, 201, 400, 404, 500, etc.)

5. **Add Error Handling** — Centralized error recovery middleware catches panics and returns structured errors.
   **Checkpoint:** No panic reaches the production server — all recoverable errors are handled.

---

## Implementation Patterns

### Pattern 1: Handler and Router Setup (❌ BAD vs ✅ GOOD)

Explicit routing and clean handler delegation are the foundation of maintainable web apps.

#### ❌ BAD — Monolithic Handler with DefaultMux

```go
// ❌ BAD: all routes on DefaultServeMux, handlers contain business logic, no error handling
func main() {
	http.HandleFunc("/users", func(w http.ResponseWriter, r *http.Request) {
		// Handler does everything: parsing, business logic, DB access, response
		switch r.Method {
		case http.MethodGet:
			users, _ := db.Query("SELECT * FROM users") // error ignored
			json.NewEncoder(w).Encode(users)
		case http.MethodPost:
			var user User
			json.NewDecoder(r.Body).Decode(&user) // error ignored
			db.Exec("INSERT INTO users VALUES ($1, $2)", user.ID, user.Name) // error ignored
			w.WriteHeader(http.StatusCreated)
		}
	})

	// No middleware, no timeout, no graceful shutdown
	http.ListenAndServe(":8080", nil)
}
```

**What's wrong:**
- `DefaultServeMux` cannot match methods or paths with parameters
- Handler mixes parsing, business logic, and response writing
- All errors are silently ignored
- No request parsing validation
- No middleware chain (no auth, logging, recovery)

#### ✅ GOOD — Explicit Router with Clean Handler Architecture

```go
// setupRouter creates and configures the application router with middleware and handlers.
func setupRouter(cfg *Config, svc *UserService) http.Handler {
	mux := http.NewServeMux()

	// Apply middleware stack (outermost to innermost)
	var handler http.Handler = mux
	handler = loggingMiddleware(handler)
	handler = recoveryMiddleware(handler)
	handler = authMiddleware(cfg)
	handler = requestIDMiddleware(handler)

	// Register routes with method-based dispatch
	mux.HandleFunc("GET /api/health", healthHandler)
	mux.HandleFunc("GET /api/users", listUsersHandler(svc))
	mux.HandleFunc("POST /api/users", createUserHandler(svc))
	mux.HandleFunc("GET /api/users/{id}", getUserHandler(svc))
	mux.HandleFunc("PUT /api/users/{id}", updateUserHandler(svc))
	mux.HandleFunc("DELETE /api/users/{id}", deleteUserHandler(svc))

	return handler
}

// listUsersHandler returns an HTTP handler that lists all users.
func listUsersHandler(svc *UserService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Read and validate request parameters
		page := queryInt(r, "page", 1)
		limit := queryInt(r, "limit", 25)
		if limit < 1 || limit > 100 {
			limit = 25
		}

		// Delegate to service layer
		users, total, err := svc.ListUsers(r.Context(), page, limit)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}

		// Write structured response
		writeJSON(w, http.StatusOK, map[string]any{
			"users":  users,
			"total":  total,
			"page":   page,
			"limit":  limit,
		})
	}
}

// writeJSON encodes data as JSON and writes it to the response.
func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		// Response body write failure — connection likely closed
		log.Printf("failed to write response: %v", err)
	}
}

// writeError writes a structured JSON error response.
func writeError(w http.ResponseWriter, status int, err error) {
	writeJSON(w, status, map[string]any{
		"error": map[string]string{
			"message": err.Error(),
			"code":    http.StatusText(status),
		},
	})
}
```

**Why this works:**
- Explicit `ServeMux` with Go 1.22+ method-based routing (`"GET /api/users"`)
- Middleware composes cleanly: `handler = middleware(handler)`
- Handlers delegate to service layers — no business logic in HTTP code
- Structured JSON responses with consistent error format
- `writeJSON` and `writeError` are reusable helpers

---

### Pattern 2: Middleware Chain (❌ BAD vs ✅ GOOD)

Middleware should be composable, independent, and orderable.

#### ❌ BAD — Coupled Middleware

```go
// ❌ BAD: middleware has side effects and depends on global state
var requestCount int

func middleware1(w http.ResponseWriter, r *http.Request) {
	requestCount++ // global mutable state — not thread-safe

	if r.URL.Path == "/admin" {
		// Hardcoded auth check — cannot be reused
		if r.Header.Get("Authorization") != "secret-token" {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
	}

	// Calls next handler directly — cannot be composed
	nextHandler(w, r) // implicit next handler — where does it come from?
}
```

**What's wrong:**
- Global mutable state (`requestCount`) is not thread-safe
- Auth check is hardcoded — cannot be parameterized or disabled
- No composition pattern — each middleware must call the next explicitly
- Cannot be reordered — middleware1 always runs before middleware2
- Cannot be tested in isolation — depends on `nextHandler` global

#### ✅ GOOD — Composable Middleware

```go
// loggingMiddleware logs each request's method, path, status, and duration.
func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Wrap the response writer to capture the status code
		wrapper := &responseWriterWrapper{ResponseWriter: w, statusCode: http.StatusOK}

		next.ServeHTTP(wrapper, r)

		duration := time.Since(start)
		log.Printf("%s %s %d %s", r.Method, r.URL.Path, wrapper.statusCode, duration)
	})
}

// recoveryMiddleware recovers from panics and returns a 500 error.
func recoveryMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				log.Printf("panic recovered: %v\n%s", rec, debug.Stack())
				writeError(w, http.StatusInternalServerError, fmt.Errorf("internal server error"))
			}
		}()
		next.ServeHTTP(w, r)
	})
}

// authMiddleware validates the Authorization header and passes the user to the handler.
func authMiddleware(cfg *Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				writeError(w, http.StatusUnauthorized, errors.New("missing authorization header"))
				return
			}

			// Extract user from token (implementation detail delegated to auth service)
			token := strings.TrimPrefix(authHeader, "Bearer ")
			user, err := validateToken(cfg.JWTSecret, token)
			if err != nil {
				writeError(w, http.StatusUnauthorized, fmt.Errorf("invalid token: %w", err))
				return
			}

			// Attach user to context for downstream handlers
			ctx := context.WithValue(r.Context(), userContextKey, user)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// responseWriterWrapper captures the status code written by the handler.
type responseWriterWrapper struct {
	http.ResponseWriter
	statusCode int
}

func (w *responseWriterWrapper) WriteHeader(code int) {
	w.statusCode = code
	w.ResponseWriter.WriteHeader(code)
}
```

**Why this works:**
- Each middleware implements `func(http.Handler) http.Handler` — universal composition
- No global state — all configuration is passed as parameters
- `responseWriterWrapper` captures status codes without modifying `ResponseWriter` interface
- Middleware can be reordered or removed without affecting others
- Auth middleware parameterizes the JWT secret — easily configurable and testable

---

### Pattern 3: Template Rendering with Security (❌ BAD vs ✅ GOOD)

Server-side HTML rendering must protect against XSS using `html/template`.

#### ❌ BAD — Unsafe HTML Rendering

```go
// ❌ BAD: renders user input directly as HTML — XSS vulnerability
func renderProfile(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name") // unsanitized user input
	html := fmt.Sprintf(`<html><body><h1>Welcome, %s</h1></body></html>`, name)
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	fmt.Fprint(w, html) // user input injected directly into HTML
}
```

**What's wrong:**
- `name` is user-controlled input injected directly into HTML
- Attacker can send `?name=<script>alert('xss')</script>` to execute arbitrary JS
- `fmt.Sprintf` does no escaping — `html/template` is the safe alternative
- Content-Type header is set but the string is built unsafely

#### ✅ GOOD — Safe Template Rendering

```go
// profileTemplateCache caches parsed templates for performance.
var profileTemplate = template.Must(template.New("profile").Parse(`
<!DOCTYPE html>
<html>
<head><title>Welcome</title></head>
<body>
	<h1>Welcome, {{.Name}}</h1>
	<p>Email: {{.Email}}</p>
	<p>Joined: {{.Joined.Format "January 2, 2006"}}</p>
</body>
</html>
`))

// renderProfile renders the user profile page with safe HTML escaping.
func renderProfile(w http.ResponseWriter, r *http.Request) {
	// Extract user data from context (populated by auth middleware)
	user := r.Context().Value(userContextKey).(*User)

	// Prepare template data
	data := map[string]any{
		"Name":  user.Name,
		"Email": user.Email,
		"Joined": user.CreatedAt,
	}

	// html/template automatically escapes all output — XSS is impossible
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	if err := profileTemplate.Execute(w, data); err != nil {
		log.Printf("template execute error: %v", err)
		writeError(w, http.StatusInternalServerError, errors.New("template error"))
	}
}
```

**Why this works:**
- `html/template` automatically escapes all output — XSS is impossible even if templates are user-modified
- Template is parsed once at startup (`template.Must`) — no per-request parse cost
- Template data is a clean data structure, not string concatenation
- Error handling catches template execution failures gracefully

---

## Constraints

### MUST DO

- **MUST** use explicit `http.NewServeMux()` with Go 1.22+ method-based routing (`"GET /path"`) — never `http.DefaultServeMux`
- **MUST** compose middleware using `func(http.Handler) http.Handler` — universal composition pattern
- **MUST** use `html/template` (not `template`) for all HTML output — XSS protection is automatic
- **MUST** return appropriate HTTP status codes (200, 201, 204, 400, 401, 404, 405, 422, 500)
- **MUST** accept `context.Context` in all handlers and propagate it to downstream calls
- **MUST** use `context.WithTimeout` for all external I/O calls within handlers
- **MUST** set `Content-Type` header on all responses before writing the body

### MUST NOT DO

- **MUST NOT** use `fmt.Sprintf` or string concatenation to build HTML — always use `html/template`
- **MUST NOT** store `*http.Request` or `http.ResponseWriter` in global state
- **MUST NOT** ignore errors from `json.Encoder.Encode` or `template.Execute`
- **MUST NOT** call `http.ListenAndServe` without a timeout configuration
- **MUST NOT** use `http.HandleFunc` with `"/"` — this registers on `DefaultServeMux`
- **MUST NOT** write to the response after sending a header (e.g., after `WriteHeader` or `json.Encode`)

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `cloud-development` | Graceful shutdown, health checks, and configuration for production |
| `best-practices` | Error handling, naming, and Go idioms across the codebase |
| `database-patterns` | Repository patterns and transaction management for data access |
| `modular-design` | Package boundaries and service layer architecture |
