---
name: async-programming
description: Implements asynchronous programming patterns (asyncio task groups, goroutine pools, cancellation scopes, structured concurrency) to build high-throughput, non-blocking systems across Python and Go runtimes.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: asynchronous programming, async await, asyncio, goroutine pool, concurrency patterns, event loop, structured concurrency, cancellation scope, parallel execution, race condition prevention, non-blocking I/O
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: api-design, automated-testing
---

# Async Programming Engineer

I design and implement high-throughput asynchronous systems using structured concurrency, bounded worker pools, and proper cancellation semantics across Python's asyncio and Go's goroutine model. When I am active, I ensure concurrent code is safe from race conditions, resource leaks, and unhandled errors while delivering measurable latency and throughput improvements over synchronous equivalents.

## TL;DR Checklist

- [ ] Match the concurrency model to the workload: asyncio/goroutines for I/O-bound workloads, multiprocessing/cargo for CPU-bound workloads
- [ ] Never launch fire-and-forget tasks or goroutines — always track them in a bounded group, semaphore pool, or WaitGroup
- [ ] Propagate cancellation via context upstream; set explicit deadlines on all external calls (HTTP, DB, cache)
- [ ] Aggregate errors across await boundaries using `asyncio.TaskGroup`, Go `errgroup.Group`, or collector patterns — never swallow exceptions silently
- [ ] Protect shared mutable state with mutexes, channels, or actor-pattern message passing — race detector must run clean
- [ ] Benchmark async code against its synchronous baseline and verify ≥2x improvement for I/O-bound workloads

---

## When to Use

Use this skill when:

- Building a high-throughput HTTP server that needs to handle thousands of concurrent connections efficiently
- Implementing data pipelines that fetch from multiple external sources in parallel (APIs, databases, queues)
- Designing background worker systems with bounded concurrency (email dispatch, report generation, media processing)
- Writing event-driven microservices where requests fan out to several downstream services
- Refactoring a synchronous, blocking codebase to use non-blocking I/O for improved latency
- Implementing retry logic with exponential backoff across concurrent operations

## When NOT to Use

Avoid this skill for:

- CPU-bound computational workloads (matrix multiplication, image encoding, cryptographic hashing) — use multiprocessing or native extensions instead
- Simple scripts that perform one sequential task — async adds complexity without benefit for linear workflows
- Code where all dependencies are synchronous and non-overridable with async counterparts — wrapping blocking calls in `run_in_executor` adds overhead

---

## Core Workflow

1. **Choose Concurrency Model** — Pick asyncio for Python (I/O-bound, event-loop driven) or goroutines + channels for Go (lightweight, M:N scheduler). For CPU-bound tasks, use Python's `multiprocessing` or Go's `worker pool + sync.WaitGroup`. **Checkpoint:** Confirm all blocking calls are removed from the hot path; every blocking operation is wrapped in an executor or replaced with its async counterpart.

2. **Structure with Task Groups / WaitGroups** — Never launch fire-and-forget goroutines or tasks. Use bounded task groups (`asyncio.TaskGroup`), semaphore pools, or `sync.WaitGroup` to track and await all concurrent units of work. **Checkpoint:** Every launched unit has a defined lifecycle: creation → execution → completion → resource cleanup. No orphaned goroutines or zombie tasks.

3. **Implement Cancellation & Timeouts** — Propagate cancellation context upstream from the top-level entry point. Set explicit deadlines on all external calls (HTTP, database queries, cache lookups). Use `context.WithTimeout` and `asyncio.wait_for`. **Checkpoint:** When the parent context is cancelled or times out, all child tasks receive the signal within a bounded delay (<100ms) and release their resources.

4. **Handle Errors Across Await Boundaries** — Collect errors without crashing the parent coroutine or goroutine. Use `asyncio.TaskGroup` error aggregation (Python 3.11+), Go `errgroup.Group`, or fan-out/fan-in with an error channel. **Checkpoint:** No unhandled exceptions leak to the event loop or main goroutine; every failure path is either recovered from or collected for downstream handling.

5. **Protect Shared State** — Use mutexes (`sync.Mutex`), channels, or actor-pattern message passing. Never share mutable state between concurrent units without explicit synchronization. Run the race detector on all tests. **Checkpoint:** `go test -race ./...` passes clean; Python code avoids shared mutable globals in favor of channel-based communication or async-safe data structures.

6. **Benchmark & Profile Async Code** — Measure throughput (requests/sec), latency (p50, p95, p99), and memory usage under load with tools like `wrk`, `hey`, or Go's `testing.B`. Compare against the synchronous baseline. **Checkpoint:** The async version shows ≥2x improvement over sync for I/O-bound workloads; memory usage does not grow linearly with concurrency level.

---

## Implementation Patterns

### Pattern 1: Python asyncio TaskGroup with Timeout & Error Aggregation

Python 3.11+ `asyncio.TaskGroup` provides structured concurrency — all tasks are awaited and errors are aggregated when the group exits.

```python
# ❌ BAD — fire-and-forget tasks, swallowed exceptions, no cancellation
import aiohttp
import asyncio

async def fetch_all_users_bad():
    """Launches unbounded requests with no error handling or cancellation."""
    session = aiohttp.ClientSession()
    tasks = []

    for org_id in range(100):
        async def fetch(org=org_id):  # Closure trap — all use same org_id!
            resp = await session.get(f"https://api.example.com/orgs/{org}/users")
            return await resp.json()

        tasks.append(asyncio.create_task(fetch()))  # Fire-and-forget, no tracking

    # No timeout, no cancellation propagation
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Exceptions are swallowed in return_exceptions — caller never knows what failed
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            print(f"Task {i} failed: {result}")  # Logged but not collected
        else:
            print(f"Got {len(result)} users from org {i}")

    await session.close()  # May never run if an exception above re-raises


# ✅ GOOD — TaskGroup with timeout, error aggregation, and structured cleanup
import asyncio
from dataclasses import dataclass, field
from typing import Any


@dataclass
class FetchResult:
    """Result from a single org fetch — success or failure."""
    org_id: int
    success: bool
    user_count: int | None = None
    error: str | None = None
    latency_ms: float = 0.0


async def fetch_org_users(
    session: aiohttp.ClientSession,
    org_id: int,
    timeout: float = 5.0,
) -> FetchResult:
    """Fetch users for a single org with timeout and structured error handling."""
    start = asyncio.get_event_loop().time()

    try:
        async with asyncio.timeout(timeout):
            async with session.get(
                f"https://api.example.com/orgs/{org_id}/users",
                headers={"Accept": "application/json"},
            ) as resp:
                resp.raise_for_status()
                data = await resp.json()
                latency_ms = (asyncio.get_event_loop().time() - start) * 1000
                return FetchResult(
                    org_id=org_id,
                    success=True,
                    user_count=len(data),
                    latency_ms=latency_ms,
                )

    except asyncio.TimeoutError:
        latency_ms = (asyncio.get_event_loop().time() - start) * 1000
        return FetchResult(
            org_id=org_id, success=False, error=f"Timeout after {timeout}s",
            latency_ms=latency_ms,
        )
    except aiohttp.ClientResponseError as e:
        return FetchResult(
            org_id=org_id, success=False,
            error=f"HTTP {e.status}: {e.message}",
        )
    except aiohttp.ClientError as e:
        return FetchResult(org_id=org_id, success=False, error=str(e))


async def fetch_all_users_good() -> list[FetchResult]:
    """Structured concurrency with TaskGroup — all tasks tracked and errors aggregated."""
    connector = aiohttp.TCPConnector(limit=50, limit_per_host=10)  # Bounded connections
    async with aiohttp.ClientSession(connector=connector) as session:
        results: list[FetchResult] = []

        async with asyncio.TaskGroup() as tg:
            task_results: dict[int, asyncio.Task[FetchResult]] = {}

            for org_id in range(100):
                # Each task is tracked in a dict keyed by org_id
                task = tg.create_task(fetch_org_users(session, org_id))
                task_results[org_id] = task

        # After TaskGroup exits, all tasks have completed (success or error)
        for org_id, task in sorted(task_results.items()):
            try:
                result = task.result()
                results.append(result)
            except Exception as e:
                # TaskGroup swallows errors during execution; we catch at collection
                results.append(FetchResult(
                    org_id=org_id, success=False, error=f"Unhandled: {type(e).__name__}: {e}",
                ))

    return results


# Usage — collect metrics and handle partial failures
async def main():
    results = await fetch_all_users_good()

    successful = [r for r in results if r.success]
    failed = [r for r in results if not r.success]

    print(f"Success: {len(successful)}/{len(results)}")
    print(f"Failed:  {len(failed)}/{len(results)}")

    # Analyze latency distribution
    latencies = [r.latency_ms for r in successful]
    if latencies:
        avg_latency = sum(latencies) / len(latencies)
        p95_latency = sorted(latencies)[int(len(latencies) * 0.95)]
        print(f"Average latency: {avg_latency:.1f}ms, P95: {p95_latency:.1f}ms")

    # Process failures with retry or alerting
    for f in failed[:5]:  # Log first 5 failures
        print(f"  ❌ Org {f.org_id}: {f.error}")
```

### Pattern 2: Go Goroutine Pool with Context Cancellation & Semaphore Limiting

Bounded worker pool using a semaphore channel pattern with context propagation for clean cancellation.

```go
package main

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"
)

// FetchResult holds the outcome of a single org user fetch.
type FetchResult struct {
	OrgID    int       `json:"org_id"`
	Success  bool      `json:"success"`
	UserCount int     `json:"user_count,omitempty"`
	Error    string    `json:"error,omitempty"`
	LatencyMs float64  `json:"latency_ms,omitempty"`
}

// WorkerPool manages a bounded set of goroutines with context-aware cancellation.
type WorkerPool struct {
	sem      chan struct{}   // Semaphore channel — limits concurrency
	wg       sync.WaitGroup  // Tracks in-flight workers
	results  chan FetchResult // Channel for collecting results
	ctx      context.Context
	cancel   context.CancelFunc
}

// NewWorkerPool creates a pool with maxConcurrency simultaneous goroutines.
func NewWorkerPool(maxConcurrency int, ctx context.Context) *WorkerPool {
	ctx, cancel := context.WithCancel(ctx)
	return &WorkerPool{
		sem:     make(chan struct{}, maxConcurrency),
		results: make(chan FetchResult, 1024), // Buffered to prevent goroutine leak
		ctx:     ctx,
		cancel:  cancel,
	}
}

// Start launches the result collector goroutine that drains the results channel.
func (wp *WorkerPool) Start() <-chan FetchResult {
	return wp.results
}

// Submit enqueues a fetch job. Returns false if the pool is already done.
func (wp *WorkerPool) Submit(orgID int) bool {
	select {
	case wp.sem <- struct{}{}: // Acquire semaphore
	case <-wp.ctx.Done():
		return false
	default:
		return false
	}

	wp.wg.Add(1)
	go func() {
		defer func() {
			<-wp.sem     // Release semaphore
			wp.wg.Done()  // Signal completion
		}()

		result := fetchOrgUsers(wp.ctx, orgID)
		select {
		case wp.results <- result:
		case <-wp.ctx.Done():
			// Pool cancelled — discard result
		}
	}()

	return true
}

// Wait blocks until all submitted jobs complete or context is cancelled.
func (wp *WorkerPool) Wait() {
	wp.wg.Wait()
	close(wp.results) // Close results channel after all workers finish
}

// Stop cancels the pool context and waits for all workers to finish.
func (wp *WorkerPool) Stop() {
	wp.cancel()       // Signal cancellation to all in-flight goroutines
	wp.Wait()         // Wait for graceful shutdown
}

// fetchOrgUsers performs an HTTP GET with context timeout.
func fetchOrgUsers(ctx context.Context, orgID int) FetchResult {
	start := time.Now()
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "GET",
		fmt.Sprintf("https://api.example.com/orgs/%d/users", orgID), nil)
	if err != nil {
		return FetchResult{OrgID: orgID, Success: false, Error: fmt.Sprintf("request build: %v", err)}
	}

	req.Header.Set("Accept", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			return FetchResult{OrgID: orgID, Success: false, Error: "timeout after 5s"}
		}
		return FetchResult{OrgID: orgID, Success: false, Error: fmt.Sprintf("request failed: %v", err)}
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return FetchResult{OrgID: orgID, Success: false, Error: fmt.Sprintf("read body: %v", err)}
	}

	userCount := len(body) // Simplified; in production parse JSON
	return FetchResult{
		OrgID:    orgID,
		Success:  true,
		UserCount: userCount,
		LatencyMs: float64(time.Since(start).Milliseconds()),
	}
}

// --- Usage ---
func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	pool := NewWorkerPool(20, ctx) // Max 20 concurrent goroutines
	results := pool.Start()

	// Submit work — each org gets a bounded goroutine
	for orgID := 0; orgID < 100; orgID++ {
		if !pool.Submit(orgID) {
			fmt.Printf("Pool cancelled, stopping submissions at org %d\n", orgID)
			break
		}
	}

	// Wait for all workers to finish, then drain results
	go pool.Wait()

	var successful, failed int
	for result := range results {
		if result.Success {
			successful++
		} else {
			failed++
			if failed <= 5 { // Log first 5 failures
				fmt.Printf("  ❌ Org %d: %s\n", result.OrgID, result.Error)
			}
		}
	}

	pool.Stop()
	fmt.Printf("\nSuccess: %d/%d | Failed: %d/%d\n", successful, successful+failed, failed, successful+failed)
}
```

### Pattern 3: Structured Concurrency — BAD vs GOOD

Demonstrating the difference between fire-and-forget concurrency and parent-child lifecycle management.

```python
# ❌ BAD — Fire-and-forget goroutine/task with no lifecycle management
import asyncio
import aiohttp


async def process_payment_bad(user_id: int, payment: dict):
    """Launches background tasks that can outlive the request handler."""

    async def send_receipt():
        """Background task — if user cancels request, this still runs!"""
        async with aiohttp.ClientSession() as session:
            await session.post(
                "https://api.example.com/receipts",
                json={"user_id": user_id, "payment": payment},
            )

    async def update_analytics():
        """Another background task — no way to cancel from the caller."""
        await asyncio.sleep(0.1)  # Simulate work
        await fetch_and_store_metrics(payment)

    # Fire-and-forget: these run until completion regardless of what happens to the parent
    asyncio.create_task(send_receipt())
    asyncio.create_task(update_analytics())
    # Handler returns immediately — but background tasks still consume resources


# ✅ GOOD — Structured concurrency with parent-child lifecycle and cancellation
import asyncio
from contextlib import asynccontextmanager


@asynccontextmanager
async def managed_workers(ctx: asyncio.CancelledError | None = None):
    """Context manager that manages a group of child tasks.

    When the context exits (normally or via cancellation), all child tasks
    are cancelled and awaited for cleanup. This is structured concurrency.
    """
    children: list[asyncio.Task] = []

    try:
        yield children  # Caller spawns child tasks here
    finally:
        # Guarantee: cancel any remaining children and wait for their cleanup
        for task in children:
            if not task.done():
                task.cancel()

        # Wait for all tasks to finish (including cancellation handlers)
        if children:
            await asyncio.gather(*children, return_exceptions=True)


async def process_payment_good(user_id: int, payment: dict):
    """Background work runs within a structured scope — cancellable on exit."""

    async def send_receipt():
        try:
            async with aiohttp.ClientSession() as session:
                await session.post(
                    "https://api.example.com/receipts",
                    json={"user_id": user_id, "payment": payment},
                    timeout=aiohttp.ClientTimeout(total=10),
                )
        except asyncio.CancelledError:
            # Cleanup on cancellation — close the session properly
            print(f"[receipt] Cancelled for user {user_id}")
            raise

    async def update_analytics():
        try:
            await fetch_and_store_metrics(payment)
        except asyncio.CancelledError:
            print(f"[analytics] Cancelled for user {user_id}")
            raise

    # All children are managed by the context manager — they share the parent's lifespan
    async with managed_workers() as children:
        children.append(asyncio.create_task(send_receipt()))
        children.append(asyncio.create_task(update_analytics()))

        # If this coroutine is cancelled (e.g., client disconnects),
        # both send_receipt and update_analytics are cancelled automatically


# Alternative Go pattern: context.WithCancel for parent-child lifecycle
"""
func processPaymentGood(ctx context.Context, userID int, payment Payment) error {
    // Create a cancellable child context for background work
    bgCtx, cancel := context.WithCancel(ctx)
    defer cancel() // Guaranteed cleanup

    var wg sync.WaitGroup
    var mu sync.Mutex
    var errors []error

    // Worker 1: Send receipt
    wg.Add(1)
    go func() {
        defer wg.Done()
        if err := sendReceipt(bgCtx, userID, payment); err != nil {
            mu.Lock()
            errors = append(errors, fmt.Errorf("receipt: %w", err))
            mu.Unlock()
        }
    }()

    // Worker 2: Update analytics
    wg.Add(1)
    go func() {
        defer wg.Done()
        if err := updateAnalytics(bgCtx, payment); err != nil {
            mu.Lock()
            errors = append(errors, fmt.Errorf("analytics: %w", err))
            mu.Unlock()
        }
    }()

    // Wait for both workers; ctx cancellation cancels both via bgCtx
    wg.Wait()

    if len(errors) > 0 {
        return fmt.Errorf("background tasks failed (%d errors)", len(errors))
    }
    return nil
}
"""
```

---

## Constraints

### MUST DO

- Match the concurrency model to the workload: use asyncio/goroutines for I/O-bound workloads, multiprocessing for CPU-bound workloads
- Always launch concurrent units within a bounded structure — `asyncio.TaskGroup`, semaphore pools, or `sync.WaitGroup` — never fire-and-forget
- Propagate cancellation from the top-level entry point through every async layer using contexts (`context.Context` in Go, `asyncio.CancelledError` + context managers in Python)
- Set explicit timeouts on all external calls (HTTP requests, database queries, cache operations) to prevent indefinite hangs
- Aggregate errors across await boundaries — collect failures without crashing the parent task; never swallow exceptions silently
- Run race condition detectors (`go test -race`, `pytest-asyncio --strict`) on all async code before merging
- Benchmark async code against synchronous baselines and document throughput/latency improvements

### MUST NOT DO

- Launch goroutines or tasks that capture loop variables in closures without creating per-iteration copies (Go closure trap)
- Share mutable state between concurrent units without explicit synchronization — use channels, mutexes, or actor patterns
- Use `asyncio.create_task()` without tracking the returned task object anywhere in the codebase
- Catch and silently suppress exceptions (`except Exception: pass` or `defer recover()` without logging)
- Block on async operations using `.result()` with no timeout (can deadlock the event loop)
- Create unbounded worker pools — always limit concurrency with semaphores, buffered channels, or pool size parameters
- Mix blocking I/O calls (e.g., `requests.get()`, `http.Get()`) in the same event loop that handles async work — use async-compatible libraries

---

## Output Template

When implementing or reviewing async code, produce:

1. **Concurrency Architecture** — Diagram or description of the concurrency model chosen (asyncio TaskGroup, goroutine pool, etc.) and why it matches the workload type
2. **Bounded Concurrency Plan** — Maximum concurrency level, semaphore/pool configuration, and backpressure strategy when limits are reached
3. **Cancellation & Timeout Strategy** — Context propagation chain, timeout values for each external call, and cancellation cleanup procedures
4. **Error Aggregation Design** — How failures from concurrent units are collected, logged, and whether they trigger retries or alerts
5. **Shared State Protection Plan** — Which synchronization primitives protect which data structures; evidence that race detector runs clean
6. **Benchmark Results** — Throughput (req/s), latency percentiles (p50/p95/p99), and memory usage comparing async vs sync baselines

---

## Live References

| Resource | URL |
|----------|-----|
| Python asyncio Documentation | https://docs.python.org/3/library/asyncio.html |
| Go context Package Documentation | https://pkg.go.dev/context |
| Structured Concurrency Paper (Harrison) | https://vorpus.org/blog/notes-on-structured-concurrency-or-go-statement-considered-harmful/ |
| Go errgroup Package | https://pkg.go.dev/golang.org/x/sync/errgroup |
| Python Race Detection & asyncio Testing | https://pytest-asyncio.readthedocs.io/en/latest/ |

---

## Related Skills

| Skill | Purpose |
|---|---|
| `api-design` | Build async I/O into API handlers for high-throughput endpoint serving |
| `automated-testing` | Write tests for async code including race detection, timeout validation, and concurrent stress tests |
