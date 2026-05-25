---
name: concurrency-patterns
description: Implements Go concurrency patterns including goroutines, channels, worker
  pools, context cancellation, and synchronization for high-performance applications.
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
  triggers: go concurrency, go goroutines, go channels, worker pool, go sync, context
    cancellation, fan out fan in
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: best-practices, cloud-development, advanced-patterns
  maturity: stable
  completeness: 95
  exampleCount: 3
------
# Go Concurrency Patterns

Senior concurrency engineer building high-performance Go applications with goroutines, channels, worker pools, and synchronization primitives. This skill covers safe concurrent data processing, context cancellation, and common concurrency anti-patterns.

## TL;DR Checklist

- [ ] Use channels to share memory — never share memory by communicating, communicate by sharing memory
- [ ] Always cancel goroutines with a context or done channel — never leak goroutines
- [ ] Use `sync.WaitGroup` for fan-out/fan-in patterns, not `time.Sleep` for synchronization
- [ ] Protect shared state with `sync.Mutex` or `sync.RWMutex` — never access without a lock
- [ ] Use `select` for all channel operations — never block indefinitely on a channel send/receive

---

## When to Use

Use this skill when:

- Building concurrent data processing pipelines
- Implementing worker pools for background job processing
- Designing fan-out/fan-in patterns for parallel API calls
- Managing long-running goroutines with cancellation support
- Implementing rate limiting or throttling with channels

---

## When NOT to Use

Avoid this skill for:

- Simple sequential operations that don't benefit from concurrency
- Code where the overhead of goroutine creation exceeds the benefit
- Critical sections that are better solved with a lock-free algorithm

---

## Core Workflow

1. **Identify Concurrency Boundaries** — Determine which operations can safely run in parallel.
   **Checkpoint:** Each goroutine has a clear, independent task with no shared mutable state.

2. **Design Channel Contracts** — Define what data flows through channels and in which direction.
   **Checkpoint:** Channel directions are explicit (`<-chan T` for receive-only, `chan<- T` for send-only).

3. **Implement Cancellation** — Use `context.Context` or done channels to shut down goroutine trees.
   **Checkpoint:** Every goroutine exits within a bounded time when cancelled.

4. **Synchronize Results** — Collect results from concurrent operations safely.
   **Checkpoint:** Use `sync.WaitGroup` or channel closure to signal completion — never `time.Sleep`.

5. **Test Concurrency** — Use `go test -race` to detect data races.
   **Checkpoint:** All tests pass with `-race` flag enabled — zero data races.

---

## Implementation Patterns

### Pattern 1: Worker Pool (❌ BAD vs ✅ GOOD)

Worker pools manage a fixed number of goroutines processing tasks from a shared queue.

#### ❌ BAD — Unbounded Goroutine Spawning

```go
// ❌ BAD: spawns a new goroutine for every task — no concurrency limit
func ProcessAll(items []Item) []Result {
	var results []Result

	for _, item := range items {
		// Spawns N goroutines for N items — can exhaust memory
		go func(i Item) {
			result := process(i)
			results = append(results, result) // DATA RACE: concurrent map/goroutine writes
		}(item)
	}

	// No synchronization — results may be incomplete
	// time.Sleep is a race condition — sometimes too short, sometimes wastes time
	time.Sleep(5 * time.Second)
	return results
}
```

**What's wrong:**
- Spawns unlimited goroutines — can exhaust memory and CPU under load
- `results` slice is written to concurrently — data race (use `go test -race` to detect)
- `time.Sleep` is a race condition — sometimes too short, sometimes wastes time
- No way to cancel processing if an error occurs
- No backpressure — fast producers overwhelm slow consumers

#### ✅ GOOD — Bounded Worker Pool with Context Cancellation

```go
// WorkerPool manages a fixed number of workers processing tasks from a channel.
// It supports context cancellation for graceful shutdown.
type WorkerPool struct {
	workerCount int
	tasks       chan Task
	results     chan Result
	wg          sync.WaitGroup
}

// NewWorkerPool creates a worker pool with the given number of workers.
func NewWorkerPool(workerCount int) *WorkerPool {
	return &WorkerPool{
		workerCount: workerCount,
		tasks:       make(chan Task, workerCount), // buffered to avoid blocking submitter
		results:     make(chan Result, workerCount),
	}
}

// Start launches the workers and returns a channel for collecting results.
// Call Done() when all tasks have been submitted.
func (p *WorkerPool) Start(ctx context.Context) <-chan Result {
	for i := 0; i < p.workerCount; i++ {
		p.wg.Add(1)
		go p.worker(ctx)
	}

	// Return results channel — close it when all workers are done
	go func() {
		p.wg.Wait()
		close(p.results)
	}()

	return p.results
}

// worker processes tasks from the tasks channel until the context is cancelled.
func (p *WorkerPool) worker(ctx context.Context) {
	defer p.wg.Done()

	for {
		select {
		case <-ctx.Done():
			return // cancelled — exit cleanly
		case task, ok := <-p.tasks:
			if !ok {
				return // channel closed — no more tasks
			}
			p.results <- processTask(ctx, task)
		}
	}
}

// Submit adds a task to the pool. Returns false if the pool is shutting down.
func (p *WorkerPool) Submit(ctx context.Context, task Task) bool {
	select {
	case p.tasks <- task:
		return true
	case <-ctx.Done():
		return false
	}
}

// Done signals that no more tasks will be submitted and waits for completion.
func (p *WorkerPool) Done() {
	close(p.tasks)
}

// ProcessAll processes items using a worker pool with bounded concurrency.
func ProcessAll(ctx context.Context, items []Item, workerCount int) ([]Result, error) {
	pool := NewWorkerPool(workerCount)
	resultsChan := pool.Start(ctx)

	// Submit all tasks
	for _, item := range items {
		if !pool.Submit(ctx, Task{Item: item}) {
			return nil, ctx.Err() // context cancelled during submission
		}
	}
	pool.Done() // signal no more tasks

	// Collect results
	var results []Result
	for result := range resultsChan {
		if result.Err != nil {
			// Log but continue processing other results
			log.Printf("task failed: %v", result.Err)
			continue
		}
		results = append(results, result)
	}

	return results, nil
}
```

**Why this works:**
- `workerCount` bounds the maximum concurrent goroutines
- `sync.WaitGroup` tracks worker completion — no `time.Sleep`
- `context.Context` enables cancellation — all goroutines exit promptly
- Buffered task channel (`workerCount` capacity) prevents submitter blocking
- `select` on `ctx.Done()` ensures no goroutine leaks
- Results channel is closed when all workers finish — clean iteration with `range`

---

### Pattern 2: Fan-Out / Fan-In (❌ BAD vs ✅ GOOD)

Fan-out spawns parallel operations; fan-in collects their results.

#### ❌ BAD — Sequential API Calls

```go
// ❌ BAD: fetches data from multiple APIs sequentially — slow
func GetAllData(ctx context.Context, endpoints []string) (map[string][]byte, error) {
	data := make(map[string][]byte)

	// Sequential — each API call blocks the next
	for _, endpoint := range endpoints {
		resp, err := http.Get(endpoint) // no context — no timeout
		if err != nil {
			return nil, fmt.Errorf("fetch %s: %w", endpoint, err)
		}
		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			return nil, fmt.Errorf("read %s: %w", endpoint, err)
		}

		data[endpoint] = body
	}

	return data, nil
}
```

**What's wrong:**
- Sequential API calls — total time is the sum of all individual latencies
- No context propagation — calls cannot be cancelled
- No timeout per call — a single slow endpoint blocks everything
- `defer resp.Body.Close()` in a loop — bodies are only closed at function return
- No concurrency — wastes network parallelism

#### ✅ GOOD — Parallel Fan-Out with Fan-In

```go
// fetchResult holds the result of a single API fetch.
type fetchResult struct {
	endpoint string
	data     []byte
	err      error
}

// fetchAllData fetches data from multiple endpoints in parallel and collects results.
// Uses fan-out (parallel fetches) and fan-in (channel collection).
func fetchAllData(ctx context.Context, endpoints []string) (map[string][]byte, error) {
	// Fan-out: create a goroutine for each endpoint
	results := make(chan fetchResult, len(endpoints)) // buffered to prevent goroutine leak

	for _, endpoint := range endpoints {
		go func(ep string) {
			result := fetchWithTimeout(ctx, ep, 10*time.Second)
			results <- fetchResult{
				endpoint: ep,
				data:     result,
			}
		}(endpoint)
	}

	// Fan-in: collect results from all goroutines
	data := make(map[string][]byte, len(endpoints))
	var firstErr error

	// Receive exactly len(endpoints) results
	for i := 0; i < len(endpoints); i++ {
		select {
		case <-ctx.Done():
			// If context is cancelled, close the channel to unblock goroutines
			close(results)
			return nil, ctx.Err()
		case res := <-results:
			if res.err != nil {
				if firstErr == nil {
					firstErr = fmt.Errorf("fetch %s: %w", res.endpoint, res.err)
				}
				continue
			}
			data[res.endpoint] = res.data
		}
	}

	// Return first error encountered (if any), along with partial results
	return data, firstErr
}

// fetchWithTimeout fetches data from an endpoint with a timeout.
func fetchWithTimeout(ctx context.Context, endpoint string, timeout time.Duration) ([]byte, error) {
	// Create a per-request context with timeout
	reqCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	req, err := http.NewRequestWithContext(reqCtx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("do request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status %d from %s", resp.StatusCode, endpoint)
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 10<<20)) // 10MB limit
	if err != nil {
		return nil, fmt.Errorf("read body: %w", err)
	}

	return body, nil
}
```

**Why this works:**
- Fan-out: goroutines run in parallel — total time is the slowest individual call
- Fan-in: `fetchResult` channel collects results in a single loop
- `buffered results channel` prevents goroutine leaks if the caller stops reading
- `http.NewRequestWithContext` propagates cancellation and timeout to each request
- `io.LimitReader` prevents memory exhaustion from large responses
- First error is tracked but processing continues — partial results are returned

---

### Pattern 3: Rate Limiting with Token Bucket (❌ BAD vs ✅ GOOD)

Rate limiting prevents overload of downstream services using a token bucket algorithm.

#### ❌ BAD — Naive Rate Limiting

```go
// ❌ BAD: no real rate limiting — just a sleep between requests
func fetchWithNaiveLimit() {
	for i := 0; i < 100; i++ {
		doRequest()
		time.Sleep(100 * time.Millisecond) // inaccurate, blocks the goroutine
	}
}
```

**What's wrong:**
- `time.Sleep` blocks the entire goroutine — wastes resources
- 100ms sleep ≠ 10 requests/second — actual rate depends on request duration
- No way to cancel — must wait for all requests to complete
- No burst handling — cannot allow quick bursts followed by slower steady rate
- No shared state — each goroutine needs its own counter

#### ✅ GOOD — Token Bucket Rate Limiter

```go
// RateLimiter implements a token bucket algorithm for rate limiting.
// Tokens are added at a fixed rate up to a maximum bucket size.
type RateLimiter struct {
	tokens     chan struct{}
	ticker     *time.Ticker
	maxTokens  int
	refillRate time.Duration
}

// NewRateLimiter creates a rate limiter with the given maximum tokens and refill rate.
// maxTokens is the burst capacity; refillRate controls the steady-state rate.
// Example: NewRateLimiter(10, 100*time.Millisecond) allows bursts of 10,
// then sustains 10 requests/second.
func NewRateLimiter(maxTokens int, refillRate time.Duration) *RateLimiter {
	rl := &RateLimiter{
		tokens:     make(chan struct{}, maxTokens),
		maxTokens:  maxTokens,
		refillRate: refillRate,
	}

	// Pre-fill the bucket
	for i := 0; i < maxTokens; i++ {
		rl.tokens <- struct{}{}
	}

	// Refill tokens at the configured rate
	rl.ticker = time.NewTicker(refillRate)
	go rl.refill()

	return rl
}

// refill periodically adds tokens to the bucket up to the maximum.
func (rl *RateLimiter) refill() {
	for range rl.ticker.C {
		select {
		case rl.tokens <- struct{}{}:
			// Token added — bucket not full
		default:
			// Bucket is full — discard token
		}
	}
}

// Wait blocks until a token is available or the context is cancelled.
func (rl *RateLimiter) Wait(ctx context.Context) error {
	select {
	case <-rl.tokens:
		return nil // token acquired
	case <-ctx.Done():
		return ctx.Err() // cancelled
	}
}

// Stop releases the rate limiter's resources.
func (rl *RateLimiter) Stop() {
	rl.ticker.Stop()
	close(rl.tokens)
}

// FetchWithRateLimiting fetches data while respecting a rate limit.
func FetchWithRateLimiting(ctx context.Context, urls []string, rl *RateLimiter) ([]Result, error) {
	var results []Result
	var mu sync.Mutex
	var wg sync.WaitGroup

	for _, url := range urls {
		// Wait for a token before starting each request
		if err := rl.Wait(ctx); err != nil {
			return nil, fmt.Errorf("rate limit wait: %w", err)
		}

		wg.Add(1)
		go func(u string) {
			defer wg.Done()

			result := doRequest(u)
			mu.Lock()
			results = append(results, result)
			mu.Unlock()
		}(url)
	}

	wg.Wait()
	return results, nil
}
```

**Why this works:**
- Token bucket allows controlled bursts (maxTokens) and steady rate (refillRate)
- `select` with context enables cancellation — no indefinite blocking
- Buffered channel (`maxTokens`) is the bucket itself — no separate counter
- `default` case in refill prevents goroutine blocking when bucket is full
- Thread-safe result collection with `sync.Mutex` and `sync.WaitGroup`
- Clean shutdown with `Stop()` — stops the ticker and closes the channel

---

## Constraints

### MUST DO

- **MUST** always cancel goroutines — use `context.Context` with a done signal or explicit channel close
- **MUST** use `sync.WaitGroup` for synchronization — never `time.Sleep` for waiting on goroutines
- **MUST** use `select` for all channel operations to avoid indefinite blocking
- **MUST** declare channel directions explicitly (`<-chan T`, `chan<- T`) in function signatures
- **MUST** use `go test -race` to verify no data races in concurrent code
- **MUST** protect shared mutable state with `sync.Mutex` or `sync.RWMutex`

### MUST NOT DO

- **MUST NOT** share memory by communicating — communicate by sharing memory (the wrong way)
- **MUST NOT** spawn unbounded goroutines — always bound concurrency with worker pools or semaphores
- **MUST NOT** use `time.Sleep` for synchronization between goroutines
- **MUST NOT** send on a closed channel — always close channels only from the sender
- **MUST NOT** receive from a nil channel — this blocks forever
- **MUST NOT** forget to stop `time.Ticker` or `time.Timer` — always call `Stop()` to release resources

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `best-practices` | Go idioms, error handling, and naming conventions |
| `cloud-development` | Graceful shutdown with context cancellation |
| `advanced-patterns` | Generics and functional options for reusable concurrency utilities |
