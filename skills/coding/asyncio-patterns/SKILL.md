---
name: asyncio-patterns
description: Implements Python asyncio patterns (TaskGroup, semaphores, queues, context management) with typed coroutines, proper error handling, and structured concurrency for production-grade async applications in Python 3.12+.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: asyncio, async await, coroutine, event loop, TaskGroup, async context manager, aiohttp, structured concurrency, python async, asyncio.timeout, gather as_completed
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: async-programming, automated-testing
---

# Python AsyncIO Patterns

Implements production-grade asyncio patterns for Python applications — structured concurrency with TaskGroup, bounded concurrency via semaphores and queues, typed coroutines with proper error propagation, and async resource management using context managers. This skill covers the full lifecycle from event loop setup to graceful shutdown in Python 3.12+.

## TL;DR Checklist

- [ ] Use `asyncio.TaskGroup` (Python 3.11+) for structured concurrency — never fire-and-forget with bare `create_task()`
- [ ] Set explicit timeouts on all external I/O calls using `asyncio.timeout()` or `asyncio.wait_for()`
- [ ] Wrap blocking operations in `loop.run_in_executor()` or use async-compatible libraries exclusively
- [ ] Aggregate errors across concurrent tasks — never suppress exceptions with bare `except Exception: pass`
- [ ] Use `async for` / `async with` patterns properly; ensure all resource cleanup happens in async context managers
- [ ] Profile event loop health with `loop.set_debug(True)` in development and check for long-running callbacks

---

## When to Use

Use this skill when:

- Building async web services or API clients using `aiohttp`, `httpx`, or FastAPI/Starlette routers
- Implementing data pipelines that fan out to multiple downstream sources concurrently (REST APIs, databases, queues)
- Writing background worker systems with bounded concurrency (email dispatch, file processing, report generation)
- Converting synchronous blocking code to async equivalents for improved I/O throughput
- Implementing rate-limited concurrent operations using semaphores or token buckets
- Managing database connections with async drivers (asyncpg, aiomysql, Motor for MongoDB)

## When NOT to Use

Avoid this skill for:

- CPU-bound computational workloads (image processing, numerical computation, encryption) — use `concurrent.futures.ProcessPoolExecutor` instead
- Simple sequential scripts that perform one or two operations — async adds complexity without benefit
- Codebases where all dependencies are purely synchronous with no async alternatives — the overhead of the event loop may outweigh benefits
- Real-time systems requiring microsecond-level deterministic latency — asyncio has non-deterministic scheduling

---

## Core Workflow

1. **Set Up the Event Loop Correctly** — Use `asyncio.run()` as the single entry point (Python 3.7+). Never manually create or manage the event loop with `get_event_loop()` or `new_event_loop()` in application code. **Checkpoint:** The entire async program runs within a single `asyncio.run(main())` call; no manual loop manipulation exists anywhere else in the codebase.

2. **Choose the Concurrency Primitive** — For bounded parallel I/O: use `asyncio.TaskGroup` (3.11+) for structured concurrency with automatic error aggregation. For rate limiting or resource limits: use `asyncio.Semaphore(n)`. For producer-consumer patterns: use `asyncio.Queue(maxsize=n)`. **Checkpoint:** Every concurrent unit has a defined lifecycle and a bounded maximum — no unbounded task creation.

3. **Implement Coroutines with Proper Signatures** — All async functions use `async def` with type hints for parameters and return types. Use `typing.Any` or specific dataclasses for complex return values. Every coroutine handles its own errors internally rather than propagating exceptions to the caller. **Checkpoint:** Static analysis (`mypy`) passes with no untyped await expressions; every `await` is on a valid awaitable.

4. **Apply Timeouts and Cancellation** — Wrap all external I/O calls with explicit timeouts: `asyncio.timeout(timeout_seconds)` for Python 3.11+ or `asyncio.wait_for(coro, timeout)`. Handle `asyncio.TimeoutError` explicitly at the call boundary. Propagate cancellation via `CancelledError` handling in async context managers. **Checkpoint:** No external call can hang indefinitely; every timeout is shorter than the parent's deadline.

5. **Aggregate Results and Errors** — Collect results from concurrent tasks using `TaskGroup`, `asyncio.gather()` with explicit error handling, or a shared `Queue`. Never use `return_exceptions=True` without a follow-up pass that surfaces errors to the caller. **Checkpoint:** The calling code can distinguish between successful results and failures; partial failure is handled gracefully.

6. **Manage Async Resources with Context Managers** — Use `class MyResource(AsyncContextManager)` or `@asynccontextmanager` for all external resources (connections, file handles, network sessions). Ensure cleanup runs even if an exception occurs inside the `async with` block. **Checkpoint:** Every acquired resource is released via `async with`, and manual `close()` calls are replaced by context manager usage.

---

## Implementation Patterns

### Pattern 1: Bounded Concurrency with TaskGroup (Python 3.11+)

The recommended pattern for structured concurrency — all tasks are tracked, awaited, and errors are aggregated on exit.

```python
import asyncio
from dataclasses import dataclass, field
from typing import Any


@dataclass
class FetchResult:
    """Structured result from a single HTTP fetch operation."""
    url: str
    status_code: int | None = None
    body_size: int | None = None
    error: str | None = None
    latency_ms: float = 0.0


async def fetch_url(
    session: "aiohttp.ClientSession",
    url: str,
    timeout: float = 5.0,
) -> FetchResult:
    """Fetch a single URL with timeout and structured error handling.

    Args:
        session: Active aiohttp ClientSession for connection reuse.
        url: The full URL to fetch.
        timeout: Maximum seconds to wait for the response.

    Returns:
        FetchResult with success data or error details.
    """
    start = asyncio.get_event_loop().time()

    try:
        async with asyncio.timeout(timeout):
            async with session.get(url) as response:
                body = await response.read()
                latency_ms = (asyncio.get_event_loop().time() - start) * 1000
                return FetchResult(
                    url=url,
                    status_code=response.status,
                    body_size=len(body),
                    latency_ms=latency_ms,
                )

    except asyncio.TimeoutError:
        return FetchResult(url=url, error=f"Timeout after {timeout}s")
    except aiohttp.ClientResponseError as e:
        return FetchResult(url=url, error=f"HTTP {e.status}: {e.message}")
    except aiohttp.ClientError as e:
        return FetchResult(url=url, error=f"Client error: {type(e).__name__}")


async def fetch_many(urls: list[str], max_concurrent: int = 50) -> list[FetchResult]:
    """Fetch multiple URLs with bounded concurrency using TaskGroup.

    Uses a semaphore to limit concurrent connections and TaskGroup for
    structured lifecycle management — all tasks complete or cancel together.
    """
    connector = aiohttp.TCPConnector(limit=max_concurrent, limit_per_host=10)
    async with aiohttp.ClientSession(connector=connector) as session:
        results: list[FetchResult] = []

        semaphore = asyncio.Semaphore(max_concurrent)

        async def fetch_with_limit(url: str) -> FetchResult:
            async with semaphore:  # Bounded concurrency gate
                return await fetch_url(session, url)

        task_map: dict[str, asyncio.Task[FetchResult]] = {}

        async with asyncio.TaskGroup() as tg:
            for url in urls:
                task = tg.create_task(fetch_with_limit(url))
                task_map[url] = task

        # All tasks completed; collect results
        for url in sorted(task_map.keys()):
            task = task_map[url]
            try:
                result = task.result()
                results.append(result)
            except Exception as e:
                # TaskGroup re-raises during creation; catch at collection
                results.append(FetchResult(url=url, error=f"Unhandled: {e}"))

    return results


async def main():
    """Entry point — demonstrates full structured concurrency lifecycle."""
    urls = [f"https://httpbin.org/delay/1/{i}" for i in range(20)]

    print(f"Fetching {len(urls)} URLs with bounded concurrency...")
    results = await fetch_many(urls)

    successes = [r for r in results if r.error is None]
    failures = [r for r in results if r.error is not None]

    print(f"Success: {len(successes)}/{len(results)}")
    print(f"Failed:  {len(failures)}/{len(results)}")

    latencies = [r.latency_ms for r in successes]
    if latencies:
        avg = sum(latencies) / len(latencies)
        p95 = sorted(latencies)[int(len(latencies) * 0.95)]
        print(f"Average latency: {avg:.1f}ms, P95: {p95:.1f}ms")


if __name__ == "__main__":
    asyncio.run(main())
```

### Pattern 2: Producer-Consumer with asyncio.Queue

Bounded queue pattern for decoupled work distribution with backpressure.

```python
import asyncio
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class WorkItem:
    """A single unit of work to be processed by consumer coroutines."""
    item_id: int
    payload: str


async def producer(
    queue: asyncio.Queue[WorkItem],
    items: list[str],
) -> None:
    """Produce work items and push them onto the bounded queue.

    The queue's maxsize provides natural backpressure — the producer
    blocks when consumers are slower than producers.
    """
    for idx, payload in enumerate(items):
        item = WorkItem(item_id=idx, payload=payload)
        await queue.put(item)  # Blocks if queue is full (backpressure)
        logger.debug("Produced item %d (%d bytes)", idx, len(payload))

    # Signal consumers that production is complete
    for _ in range(3):  # Same count as consumer tasks
        await queue.put(None)


async def consumer(
    queue: asyncio.Queue[WorkItem | None],
    consumer_id: int,
    delay: float = 0.1,
) -> list[WorkItem]:
    """Consume work items from the queue until a sentinel (None) is received."""
    processed: list[WorkItem] = []

    while True:
        item = await queue.get()  # Blocks if queue is empty

        if item is None:
            # Sentinel received — this consumer should shut down
            logger.info("Consumer %d received shutdown sentinel", consumer_id)
            break

        # Simulate processing work
        await asyncio.sleep(delay)
        processed.append(item)
        logger.debug("Consumer %d processed item %d", consumer_id, item.item_id)
        queue.task_done()

    return processed


async def run_producer_consumer(items: list[str]) -> list[list[WorkItem]]:
    """Run a bounded producer-consumer pipeline with 3 consumers."""
    queue: asyncio.Queue[WorkItem | None] = asyncio.Queue(maxsize=10)

    # Launch consumer tasks (bounded concurrency — fixed count)
    consumer_tasks = [
        asyncio.create_task(consumer(queue, i)) for i in range(3)
    ]

    # Run producer (single-threaded, drives the pipeline)
    await producer(queue, items)

    # Await all consumers to complete
    results = await asyncio.gather(*consumer_tasks)

    return list(results)


# Usage
async def main():
    payloads = [f"task-{i}-payload-data" for i in range(30)]
    distribution = await run_producer_consumer(payloads)
    total_processed = sum(len(group) for group in distribution)
    print(f"Total processed: {total_processed}/{len(payloads)}")
```

### Pattern 3: Async Resource Manager — BAD vs GOOD

Demonstrates proper async resource lifecycle management versus leak-prone patterns.

```python
# ❌ BAD — Manual connection management with leak paths and no timeout
import aiohttp
import asyncio


async def bad_http_calls(urls: list[str]) -> list[bytes]:
    """Fire-and-forget pattern: connections may never be closed on error."""
    session = aiohttp.ClientSession()  # Not in async with — leaks on exception!

    results = []
    for url in urls:
        try:
            resp = await session.get(url)  # No timeout — can hang forever
            data = await resp.read()
            results.append(data)
        except Exception:
            pass  # Silently swallows errors — caller has no idea what failed

    # May never reach here if an exception above re-raises
    await session.close()
    return results


# ✅ GOOD — Context manager ensures cleanup, explicit timeouts, error collection
import asyncio
from dataclasses import dataclass
from typing import Any


@dataclass
class SafeFetchResult:
    """Structured fetch result with guaranteed resource safety."""
    url: str
    success: bool = False
    body_size: int = 0
    status_code: int | None = None
    error: str | None = None


async def safe_fetch(
    session: aiohttp.ClientSession,
    url: str,
    timeout: float = 5.0,
) -> SafeFetchResult:
    """Single URL fetch with timeout and structured error handling."""
    try:
        async with asyncio.timeout(timeout):
            async with session.get(url) as resp:
                data = await resp.read()
                return SafeFetchResult(
                    url=url,
                    success=True,
                    body_size=len(data),
                    status_code=resp.status,
                )
    except asyncio.TimeoutError:
        return SafeFetchResult(url=url, error=f"Timeout after {timeout}s")
    except aiohttp.ClientResponseError as e:
        return SafeFetchResult(url=url, error=f"HTTP {e.status}")
    except aiohttp.ClientError as e:
        return SafeFetchResult(url=url, error=str(e))


async def safe_fetch_all(urls: list[str]) -> list[SafeFetchResult]:
    """Fetch multiple URLs with guaranteed connection cleanup."""
    connector = aiohttp.TCPConnector(limit=20)
    async with aiohttp.ClientSession(connector=connector) as session:
        # TaskGroup provides structured concurrency — all tasks tracked
        results: list[SafeFetchResult] = []

        async def collect(url: str, group: "asyncio.TaskGroup") -> None:
            result = await safe_fetch(session, url)
            results.append(result)

        async with asyncio.TaskGroup() as tg:
            for url in urls:
                tg.create_task(collect(url, tg))

    return results


# Usage with error analysis
async def main():
    urls = [
        "https://httpbin.org/status/200",
        "https://httpbin.org/status/404",
        "https://httpbin.org/status/500",
        "https://nonexistent.invalid/",
    ]

    for result in await safe_fetch_all(urls):
        if result.success:
            print(f"  ✅ {result.url} ({result.status_code}, {result.body_size} bytes)")
        else:
            print(f"  ❌ {result.url}: {result.error}")


if __name__ == "__main__":
    asyncio.run(main())
```

### Pattern 4: Rate-Limited API Client with Semaphore

Production pattern for respecting API rate limits while maximizing throughput.

```python
import asyncio
from dataclasses import dataclass


@dataclass
class RateLimitConfig:
    """Configuration for rate-limited async API access."""
    max_requests_per_second: float
    burst_size: int  # Maximum concurrent requests allowed
    retry_count: int = 3
    retry_base_delay: float = 1.0


async def rate_limited_request(
    session: "aiohttp.ClientSession",
    url: str,
    config: RateLimitConfig,
) -> dict[str, Any]:
    """Execute a single API request with rate limiting and exponential backoff retry."""
    semaphore = asyncio.Semaphore(config.burst_size)

    for attempt in range(1, config.retry_count + 1):
        async with semaphore:
            try:
                async with asyncio.timeout(10.0):
                    async with session.get(url) as resp:
                        if resp.status == 429:
                            # Rate limited — wait and retry with backoff
                            wait_time = config.retry_base_delay * (2 ** (attempt - 1))
                            await asyncio.sleep(wait_time)
                            continue

                        resp.raise_for_status()
                        return await resp.json()

            except asyncio.TimeoutError:
                if attempt == config.retry_count:
                    raise RuntimeError(f"Request to {url} timed out after {config.retry_count} attempts")
                await asyncio.sleep(config.retry_base_delay * (2 ** (attempt - 1)))

    # Should not reach here — retry loop always raises on final failure
    raise RuntimeError("Unexpected end of rate-limited request")


async def fetch_with_rate_limit(urls: list[str], config: RateLimitConfig) -> list[dict]:
    """Fetch multiple URLs respecting the specified rate limits."""
    connector = aiohttp.TCPConnector(limit=config.burst_size * 2)
    async with aiohttp.ClientSession(connector=connector) as session:

        async with asyncio.TaskGroup() as tg:
            tasks: dict[str, asyncio.Task[dict]] = {}
            for url in urls:
                tasks[url] = tg.create_task(rate_limited_request(session, url, config))

    results = []
    for url in sorted(tasks.keys()):
        results.append(tasks[url].result())

    return results
```

### Pattern 5: Async Context Manager for Custom Resources

Proper async resource lifecycle with cleanup guarantees.

```python
import asyncio
from contextlib import asynccontextmanager


class AsyncDatabaseConnection:
    """Simulated async database connection manager with proper lifecycle."""

    def __init__(self, host: str, pool_size: int = 10):
        self.host = host
        self.pool_size = pool_size
        self._connected = False

    async def __aenter__(self) -> "AsyncDatabaseConnection":
        """Acquire connection and validate it."""
        await asyncio.sleep(0.01)  # Simulate network handshake
        self._connected = True
        return self

    async def query(self, sql: str) -> list[dict]:
        """Execute a parameterized query safely."""
        if not self._connected:
            raise RuntimeError("Connection not established — use 'async with'")
        await asyncio.sleep(0.01)  # Simulate network round trip
        return [{"id": 1, "name": "sample"}]

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        """Release connection and clean up resources."""
        self._connected = False


# Usage — guaranteed cleanup even on exception
async def safe_query_example():
    """Demonstrates async context manager usage pattern."""
    try:
        async with AsyncDatabaseConnection("localhost") as conn:
            results = await conn.query("SELECT * FROM users WHERE active = true")
            return results
    # Connection is automatically cleaned up when exiting the 'async with' block,
    # even if an exception occurs during query()
```

### Pattern 6: Fan-Out / Fan-In with asyncio.gather

Parallel fetching pattern for aggregating results from multiple independent sources.

```python
import asyncio
from dataclasses import dataclass


@dataclass
class HealthCheckResult:
    """Result of checking a single service's health endpoint."""
    service_name: str
    healthy: bool = False
    response_time_ms: float = 0.0
    error: str | None = None


async def check_service_health(
    session: "aiohttp.ClientSession",
    name: str,
    url: str,
    timeout: float = 3.0,
) -> HealthCheckResult:
    """Check a single service's health with timing."""
    start = asyncio.get_event_loop().time()
    try:
        async with asyncio.timeout(timeout):
            async with session.head(url) as resp:
                elapsed_ms = (asyncio.get_event_loop().time() - start) * 1000
                return HealthCheckResult(
                    service_name=name,
                    healthy=resp.status < 500,
                    response_time_ms=elapsed_ms,
                )
    except asyncio.TimeoutError:
        elapsed_ms = (asyncio.get_event_loop().time() - start) * 1000
        return HealthCheckResult(
            service_name=name,
            error=f"Timeout after {timeout}s",
            response_time_ms=elapsed_ms,
        )
    except aiohttp.ClientError as e:
        elapsed_ms = (asyncio.get_event_loop().time() - start) * 1000
        return HealthCheckResult(
            service_name=name,
            error=str(e),
            response_time_ms=elapsed_ms,
        )


async def health_check_all(services: dict[str, str]) -> list[HealthCheckResult]:
    """Run parallel health checks on all registered services.

    Args:
        services: Mapping of service_name -> health_check_url.

    Returns:
        List of HealthCheckResult for each service (order matches input).
    """
    connector = aiohttp.TCPConnector(limit=30)
    async with aiohttp.ClientSession(connector=connector) as session:
        tasks: list[tuple[str, asyncio.Task[HealthCheckResult]]] = []

        async with asyncio.TaskGroup() as tg:
            for name, url in services.items():
                task = tg.create_task(check_service_health(session, name, url))
                tasks.append((name, task))

        return [task.result() for _, task in tasks]


# Usage — ordered health check dashboard
async def main():
    services = {
        "auth-api":     "https://auth.example.com/health",
        "user-service":  "https://users.example.com/health",
        "payment-gateway":"https://pay.example.com/health",
        "cache-layer":   "https://redis.example.com/ping",
    }

    results = await health_check_all(services)
    for r in results:
        status = "HEALTHY" if r.healthy else f"UNHEALTHY ({r.error})"
        print(f"  {r.service_name:<20} {status} ({r.response_time_ms:.0f}ms)")
```

---

## Constraints

### MUST DO

- Use `asyncio.run()` as the program entry point — never manually manage the event loop with `get_event_loop()`, `new_event_loop()`, or `run_forever()`
- Prefer `asyncio.TaskGroup` (Python 3.11+) over `asyncio.gather()` for structured concurrency — it guarantees all tasks complete and aggregates errors
- Wrap ALL external I/O calls in timeouts using `asyncio.timeout()` (3.11+) or `asyncio.wait_for()` — no call to an external service may hang indefinitely
- Use typed coroutine signatures (`async def func(param: str) -> int:`) with docstrings for all public async functions
- Handle `asyncio.TimeoutError`, `asyncio.CancelledError`, and application-specific exceptions at the boundaries — never let them propagate unhandled
- Use `async with` for all resources (aiohttp sessions, DB connections, file handles) to guarantee cleanup on exception paths
- Use `asyncio.Queue(maxsize=n)` for producer-consumer patterns — the maxsize provides natural backpressure
- Run `loop.set_debug(True)` during development to detect slow callbacks and event loop issues

### MUST NOT DO

- Launch bare `asyncio.create_task()` without storing the returned Task object or tracking it in a TaskGroup — fire-and-forget tasks leak resources
- Use synchronous blocking libraries (requests, psycopg2, mysqlclient) inside async code — they block the entire event loop
- Suppress exceptions with bare `except: pass` or `except Exception: pass` inside coroutines — errors are silently swallowed and hard to debug
- Share mutable state between concurrent coroutines without an asyncio-safe primitive (Queue, Event, Lock) — use channels via Queue instead of shared variables
- Call blocking functions like `time.sleep()` in async code — use `await asyncio.sleep()` instead
- Create unbounded task lists that grow with input size without a semaphore or pool limit — always cap concurrency
- Mix synchronous and asynchronous loops (e.g., `for` inside `async def` calling another `async def` without await) — this defeats the purpose of async

---

## Output Template

When implementing or reviewing asyncio code, produce:

1. **Concurrency Architecture** — Which primitive is used (TaskGroup, Queue, Semaphore) and why it matches the workload
2. **Timeout Strategy** — Explicit timeout values for each external call; hierarchy of parent/child deadlines
3. **Error Handling Design** — How errors from concurrent operations are collected, logged, and surfaced to the caller
4. **Resource Lifecycle** — List of all async resources (sessions, connections, files) with their `async with` scope boundaries
5. **Concurrency Limits** — Maximum concurrent tasks/connections; semaphore values; queue maxsizes with rationale
6. **Performance Notes** — Expected throughput characteristics and any known bottlenecks in the async implementation

---

## Live References

| Resource | URL |
|----------|-----|
| Python asyncio Documentation | https://docs.python.org/3/library/asyncio.html |
| Python 3.12 What's New (asyncio changes) | https://docs.python.org/3/whatsnew/3.12.html#asyncio |
| PEP 567 — Context Variables for asyncio | https://peps.python.org/pep-0567/ |
| aiohttp Client Session Documentation | https://docs.aiohttp.org/en/stable/client_reference.html |
| AsyncContextManager Protocol Docs | https://docs.python.org/3/library/contextlib.html#contextlib.asynccontextmanager |
| asyncio.TaskGroup API Reference | https://docs.python.org/3/library/asyncio-task.html#asyncio.TaskGroup |

---

## Related Skills

| Skill | Purpose |
|---|---|
| `async-programming` | Cross-language async patterns (Python + Go) — broader overview, this skill is Python-specific depth |
| `automated-testing` | Testing asyncio code with pytest-asyncio, mocking event loops, and race condition detection |
