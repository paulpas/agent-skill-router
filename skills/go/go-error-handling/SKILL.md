---
name: go-error-handling
description: Designs robust error handling in Go with custom error types, error wrapping,
  retry patterns, and failure recovery strategies for resilient applications.
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
  triggers: go error handling, go custom errors, go error wrapping, go retry, go sentinel
    errors, go error categories
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: best-practices, concurrency-patterns, cloud-development
  maturity: stable
  completeness: 95
  exampleCount: 3
---
# Go Error Handling

Senior engineer designing robust error handling in Go with custom error types, error wrapping, retry patterns, and failure recovery. This skill covers creating meaningful error hierarchies and implementing resilience patterns.

## TL;DR Checklist

- [ ] Return errors explicitly — never ignore returned errors
- [ ] Wrap errors with context using `fmt.Errorf("...: %w", err)`
- [ ] Define sentinel errors for expected conditions using `var ErrX = errors.New("...")`
- [ ] Use `errors.Is()` and `errors.As()` for error inspection — never string comparison
- [ ] Implement retry with exponential backoff for transient failures
- [ ] Distinguish transient errors (retry) from permanent errors (fail fast)

---

## When to Use

Use this skill when:

- Designing an error hierarchy for a Go application
- Implementing retry logic for network or database operations
- Creating custom error types with structured information
- Building resilience patterns (retry, circuit breaker, fallback)
- Defining error categories for observability (metrics, logging)

---

## When NOT to Use

Avoid this skill for:

- One-off error checks with a single error type
- Error handling in short-lived scripts where simplicity matters more
- Cases where `panic()` is appropriate (e.g., configuration that cannot be recovered from)

---

## Core Workflow

1. **Define Error Categories** — Identify the types of errors your application produces.
   **Checkpoint:** Each error category has a sentinel error and a structured error type.

2. **Implement Error Wrapping** — Wrap errors at each layer with contextual information.
   **Checkpoint:** Error chains are inspectable with `errors.Is()` and `errors.As()`.

3. **Build Retry Logic** — Implement retry with exponential backoff for transient errors.
   **Checkpoint:** Retry distinguishes transient (retryable) from permanent (not retryable) errors.

4. **Add Failure Recovery** — Implement circuit breakers and fallbacks for critical paths.
   **Checkpoint:** Failed operations don't cascade — they fail gracefully with fallback behavior.

5. **Propagate Errors Up** — Wrap errors as they cross layer boundaries.
   **Checkpoint:** Each layer adds context without losing the underlying error.

---

## Implementation Patterns

### Pattern 1: Custom Error Types and Wrapping (❌ BAD vs ✅ GOOD)

Custom error types enable precise error handling across layer boundaries.

#### ❌ BAD — Flat String Errors

```go
// ❌ BAD: string-based errors — impossible to pattern match, no context
func GetUser(id string) (*User, error) {
	if id == "" {
		return nil, errors.New("user id cannot be empty")
	}

	row := db.QueryRow("SELECT * FROM users WHERE id = $1", id)
	var user User
	if err := row.Scan(&user.ID, &user.Name); err != nil {
		// Generic error — caller can't distinguish "not found" from "connection error"
		return nil, fmt.Errorf("query failed: %v", err)
	}

	return &user, nil
}
```

**What's wrong:**
- String comparison is fragile — changing a message breaks error checks
- No way to distinguish "not found" from "database error" programmatically
- Error message `"query failed"` adds no useful context
- Caller must use `strings.Contains()` — brittle and slow
- No error chain — underlying error is lost in the wrapper

#### ✅ GOOD — Error Types with Wrapping

```go
// package: internal/user

// Sentinel errors for common user-related conditions.
var (
	// ErrUserNotFound is returned when a user does not exist.
	ErrUserNotFound = errors.New("user not found")

	// ErrUserDuplicate is returned when a user with the same identifier already exists.
	ErrUserDuplicate = errors.New("user already exists")

	// ErrUserInvalid is returned when user input fails validation.
	ErrUserInvalid = errors.New("invalid user input")
)

// UserError is a structured error with a code and field information.
type UserError struct {
	Code    string            // error code for observability
	Message string            // human-readable message
	Fields  map[string]string // field-level error details
	Err     error             // underlying error (if any)
}

func (e *UserError) Error() string {
	return e.Message
}

// Unwrap returns the underlying error for errors.Is/As support.
func (e *UserError) Unwrap() error {
	return e.Err
}

// Is implements errors.Is for sentinel error matching.
func (e *UserError) Is(target error) bool {
	_, ok := target.(*UserError)
	return ok
}

// NewUserValidationError creates a validation error with field details.
func NewUserValidationError(field, message string) error {
	return &UserError{
		Code:    "VALIDATION",
		Message: fmt.Sprintf("user validation: %s: %s", field, message),
		Fields:  map[string]string{field: message},
	}
}

// GetUser retrieves a user by ID with proper error categorization.
func GetUser(ctx context.Context, id string) (*User, error) {
	if id == "" {
		return nil, fmt.Errorf("get user: %w", ErrUserInvalid)
	}

	row := db.QueryRowContext(ctx, "SELECT id, name, email FROM users WHERE id = $1", id)
	var user User
	if err := row.Scan(&user.ID, &user.Name, &user.Email); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("get user %s: %w", id, ErrUserNotFound)
		}
		return nil, fmt.Errorf("get user %s: query: %w", id, err)
	}

	return &user, nil
}

// CreateUser validates input and creates a new user.
func CreateUser(ctx context.Context, name, email string) (*User, error) {
	var validationErrs []error

	if name == "" {
		validationErrs = append(validationErrs, NewUserValidationError("name", "name is required"))
	}
	if name != "" && len(name) > 100 {
		validationErrs = append(validationErrs, NewUserValidationError("name", "name must be 100 characters or less"))
	}
	if email == "" {
		validationErrs = append(validationErrs, NewUserValidationError("email", "email is required"))
	}

	if len(validationErrs) > 0 {
		// Return a compound validation error
		return nil, fmt.Errorf("create user: %v", multiError(validationErrs))
	}

	user := &User{
		Name:  strings.TrimSpace(name),
		Email: strings.TrimSpace(email),
		ID:    generateID(),
	}

	if err := db.InsertUser(ctx, user); err != nil {
		if isDuplicateKeyError(err) {
			return nil, fmt.Errorf("create user: %w", ErrUserDuplicate)
		}
		return nil, fmt.Errorf("create user: %w", err)
	}

	return user, nil
}
```

**Why this works:**
- Sentinel errors (`ErrUserNotFound`) are inspectable with `errors.Is()`
- `UserError` provides structured information (code, fields, underlying error)
- `Unwrap()` enables `errors.Is()` to traverse the error chain
- Each layer adds context: `"get user %s: query: %w"` → `"create user: %w"`
- Validation errors carry field-level details for client-side feedback

---

### Pattern 2: Retry with Exponential Backoff (❌ BAD vs ✅ GOOD)

Retry logic should be automatic, bounded, and error-aware.

#### ❌ BAD — Manual Retry with Fixed Delay

```go
// ❌ BAD: manual retry — no exponential backoff, no error classification
func fetchWithRetry(url string) ([]byte, error) {
	var lastErr error

	// Fixed 3 retries with fixed 1-second delay
	for i := 0; i < 3; i++ {
		resp, err := http.Get(url)
		if err == nil {
			defer resp.Body.Close()
			body, _ := io.ReadAll(resp.Body)
			return body, nil
		}
		lastErr = err
		time.Sleep(1 * time.Second) // fixed delay — doesn't adapt
	}

	return nil, fmt.Errorf("fetch %s: all 3 retries failed: %w", url, lastErr)
}
```

**What's wrong:**
- Fixed delay — doesn't adapt to the severity of the failure
- No error classification — retries permanent errors (404) unnecessarily
- `defer resp.Body.Close()` in a loop — bodies are never closed until the function returns
- No context support — cannot cancel in-progress retries
- No jitter — all retry clients hammer the server at the same time (thundering herd)
- Hardcoded retry count and delay — not configurable

#### ✅ GOOD — Configurable Retry with Exponential Backoff

```go
// RetryConfig holds retry configuration.
type RetryConfig struct {
	MaxAttempts  int           // maximum number of attempts (default: 3)
	InitialDelay time.Duration // delay before first retry (default: 100ms)
	MaxDelay     time.Duration // maximum delay between retries (default: 30s)
	Jitter       bool          // add random jitter to delays (default: true)
	Retryable    func(error) bool // function to classify errors as retryable
}

// DefaultRetryConfig returns a retry config suitable for HTTP requests.
func DefaultRetryConfig() RetryConfig {
	return RetryConfig{
		MaxAttempts:  3,
		InitialDelay: 100 * time.Millisecond,
		MaxDelay:     30 * time.Second,
		Jitter:       true,
		Retryable:    isTransientError,
	}
}

// Retry executes fn with exponential backoff until it succeeds or MaxAttempts is reached.
func Retry(ctx context.Context, cfg RetryConfig, fn func(ctx context.Context) error) error {
	if cfg.MaxAttempts <= 0 {
		cfg.MaxAttempts = 3
	}
	if cfg.InitialDelay == 0 {
		cfg.InitialDelay = 100 * time.Millisecond
	}

	var lastErr error
	for attempt := 0; attempt < cfg.MaxAttempts; attempt++ {
		if attempt > 0 {
			// Calculate delay with exponential backoff and jitter
			delay := cfg.InitialDelay * time.Duration(1<<uint(attempt-1))
			if delay > cfg.MaxDelay {
				delay = cfg.MaxDelay
			}
			if cfg.Jitter {
				delay = time.Duration(rand.Int63n(int64(delay)/2) + int64(delay)/4)
			}

			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(delay):
			}
		}

		lastErr = fn(ctx)
		if lastErr == nil {
			return nil // success
		}

		// Check if the error is retryable
		if !cfg.Retryable(lastErr) {
			return lastErr // permanent error — don't retry
		}
	}

	return fmt.Errorf("all %d attempts failed: %w", cfg.MaxAttempts, lastErr)
}

// isTransientError classifies HTTP errors as transient (retryable) or permanent.
func isTransientError(err error) bool {
	// Network errors are always retryable
	if netErr, ok := err.(interface{ Temporary() bool }); ok && netErr.Temporary() {
		return true
	}

	// HTTP status codes
	var httpErr *httpError
	if errors.As(err, &httpErr) {
		switch httpErr.StatusCode {
		case 429: // Too Many Requests — retry with backoff
			return true
		case 500, 502, 503, 504: // Server errors — retry
			return true
		case 400, 401, 403, 404, 405: // Client errors — don't retry
			return false
		default:
			return false
		}
	}

	return false
}

// httpError wraps an HTTP error with its status code.
type httpError struct {
	StatusCode int
	Body       string
}

func (e *httpError) Error() string {
	return fmt.Sprintf("HTTP %d: %s", e.StatusCode, e.Body)
}

// fetchWithRetry fetches a URL with automatic retry for transient errors.
func fetchWithRetry(ctx context.Context, url string) ([]byte, error) {
	cfg := DefaultRetryConfig()

	var body []byte
	err := Retry(ctx, cfg, func(ctx context.Context) error {
		reqCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
		defer cancel()

		req, err := http.NewRequestWithContext(reqCtx, http.MethodGet, url, nil)
		if err != nil {
			return fmt.Errorf("create request: %w", err)
		}

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			return fmt.Errorf("request: %w", err)
		}
		defer resp.Body.Close()

		respBody, err := io.ReadAll(io.LimitReader(resp.Body, 10<<20))
		if err != nil {
			return fmt.Errorf("read body: %w", err)
		}

		if resp.StatusCode >= 500 {
			return &httpError{StatusCode: resp.StatusCode, Body: string(respBody)}
		}
		if resp.StatusCode != 200 {
			return nil // non-retryable error
		}

		body = respBody
		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("fetch %s: %w", url, err)
	}

	return body, nil
}
```

**Why this works:**
- Exponential backoff increases delay with each attempt — gives the server time to recover
- `Jitter` adds randomness — prevents thundering herd when many clients retry simultaneously
- `Retryable` function classifies errors — only retries transient failures
- Context propagation allows cancellation — retries can be stopped
- `MaxDelay` caps the maximum wait — prevents extremely long delays
- Configurable — each caller can adjust retry behavior for their use case

---

### Pattern 3: Error Categories for Observability (❌ BAD vs ✅ GOOD)

Error categorization enables effective monitoring, alerting, and debugging.

#### ❌ BAD — All Errors Look the Same

```go
// ❌ BAD: no error categories — all errors are just strings
func handleRequest(w http.ResponseWriter, r *http.Request) {
	result, err := process(r)
	if err != nil {
		// No way to distinguish error types in monitoring
		log.Printf("error: %v", err)
		http.Error(w, "internal error", 500)
	}
}
```

**What's wrong:**
- All errors are logged identically — no way to filter by type
- Monitoring systems see only `"error: ..."` — no error categorization for alerting
- HTTP 500 for every error — even 400-level errors become 500
- No error rate metrics — cannot create alerts for specific error types
- Debugging is difficult — no structured error information

#### ✅ GOOD — Categorized Errors with Observability

```go
// package: api

// ErrorCategory classifies errors for monitoring and alerting.
type ErrorCategory string

const (
	CategoryValidation ErrorCategory = "validation"
	CategoryNotFound   ErrorCategory = "not_found"
	CategoryConflict   ErrorCategory = "conflict"
	CategoryAuth       ErrorCategory = "auth"
	CategoryInternal   ErrorCategory = "internal"
	CategoryTimeout    ErrorCategory = "timeout"
	CategoryExternal   ErrorCategory = "external"
)

// ErrorWithCategory wraps an error with a category for observability.
type ErrorWithCategory struct {
	Category   ErrorCategory
	StatusCode int
	Err        error
}

func (e *ErrorWithCategory) Error() string {
	return e.Err.Error()
}

func (e *ErrorWithCategory) Unwrap() error {
	return e.Err
}

// NewErrorWithCategory creates a categorized error.
func NewErrorWithCategory(cat ErrorCategory, statusCode int, err error) *ErrorWithCategory {
	return &ErrorWithCategory{
		Category:   cat,
		StatusCode: statusCode,
		Err:        err,
	}
}

// HandleError writes an appropriate HTTP response based on the error category.
func HandleError(w http.ResponseWriter, err error) {
	// Extract category from error chain
	var catErr *ErrorWithCategory
	if errors.As(err, &catErr) {
		// Log with category for monitoring
		log.WithFields(log.Fields{
			"category":   catErr.Category,
			"status":     catErr.StatusCode,
			"error":      err.Error(),
		}).Error("request error")

		// Write appropriate HTTP status
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(catErr.StatusCode)
		json.NewEncoder(w).Encode(map[string]string{
			"error": err.Error(),
		})
		return
	}

	// Default: treat unknown errors as internal
	log.WithFields(log.Fields{"error": err.Error()}).Error("unknown error")
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusInternalServerError)
	json.NewEncoder(w).Encode(map[string]string{
		"error": "internal server error",
	})
}

// CategoryFromError determines the error category from an error.
func CategoryFromError(err error) (ErrorCategory, int) {
	switch {
	case errors.Is(err, user.ErrUserNotFound):
		return CategoryNotFound, http.StatusNotFound
	case errors.Is(err, user.ErrUserDuplicate):
		return CategoryConflict, http.StatusConflict
	case errors.Is(err, user.ErrUserInvalid):
		return CategoryValidation, http.StatusBadRequest
	case errors.Is(err, auth.ErrUnauthorized):
		return CategoryAuth, http.StatusUnauthorized
	case errors.Is(err, context.DeadlineExceeded):
		return CategoryTimeout, http.StatusGatewayTimeout
	default:
		return CategoryInternal, http.StatusInternalServerError
	}
}

// handleRequest processes a request with categorized error handling.
func handleRequest(w http.ResponseWriter, r *http.Request) {
	result, err := process(r.Context())
	if err != nil {
		cat, statusCode := CategoryFromError(err)
		HandleError(w, NewErrorWithCategory(cat, statusCode, err))
		return
	}

	writeJSON(w, http.StatusOK, result)
}
```

**Why this works:**
- Error categories enable monitoring: `"category=validation"`, `"category=timeout"`, etc.
- `CategoryFromError` maps error types to categories — centralized classification
- `HandleError` writes the correct HTTP status code based on error type
- Structured logging includes category — easy to filter and alert on
- Unknown errors default to 500 — explicit handling for each known case

---

## Constraints

### MUST DO

- **MUST** use `fmt.Errorf("context: %w", err)` to wrap errors — never lose the underlying error
- **MUST** use `errors.Is()` and `errors.As()` for error inspection — never string comparison
- **MUST** define sentinel errors (`var ErrX = errors.New("...")`) for expected conditions
- **MUST** implement `Unwrap()` on custom error types to support `errors.Is()` and `errors.As()`
- **MUST** distinguish transient errors (retry) from permanent errors (fail fast)
- **MUST** add error categories for all errors that cross layer boundaries (API, service, repository)

### MUST NOT DO

- **MUST NOT** use `panic()` for error handling — only for truly unrecoverable conditions at startup
- **MUST NOT** ignore returned errors — every `err` must be checked
- **MUST NOT** use `strings.Contains(err.Error(), "...")` for error matching
- **MUST NOT** return nil errors with non-nil data — always return both or neither
- **MUST NOT** leak sensitive information in error messages (passwords, tokens, keys)
- **MUST NOT** retry permanent errors (4xx status codes, validation errors)

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `best-practices` | Go error handling conventions and naming |
| `concurrency-patterns` | Context cancellation and goroutine error handling |
| `cloud-development` | Error handling in distributed systems with circuit breakers |
