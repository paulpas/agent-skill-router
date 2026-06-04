---
name: performance-testing
description: Measures application throughput, latency percentiles, and resource utilization
  under realistic load to identify bottlenecks before they reach production.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: coding
  triggers: performance testing, load testing, stress test, p95 latency, bottleneck
    detection, how do i measure system performance, k6, locust
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
  - do-dont
  - examples
  related-skills: coding-code-quality-policies, coding-debugging-profiling
---
# Performance Testing and Load Analysis

Measures application throughput, latency percentiles, and resource utilization under realistic load to identify bottlenecks before they reach production. Builds reproducible test harnesses that model real user behavior and produce actionable metrics including p50/p95/p99 latencies, requests per second (RPS), and error rates.

## TL;DR Checklist

- [ ] Define a clear performance hypothesis with baseline thresholds (e.g., "p99 latency < 200ms at 500 concurrent users")
- [ ] Model traffic patterns after real production metrics — do not use uniform load
- [ ] Collect p50/p95/p99 latencies and throughput, not just averages
- [ ] Profile CPU, memory, and I/O during the test to find bottlenecks
- [ ] Ramp up gradually (ramp-up phase) before holding steady-state load
- [ ] Run soak tests for 4–24 hours to detect memory leaks and connection pool exhaustion

---

## When to Use

Use this skill when:

- A team needs to establish a performance baseline before releasing a new service or major refactor
- Production incident reviews reveal that throughput or latency degraded under load
- You are designing capacity planning for an upcoming traffic spike (sale, campaign, launch)
- Code reviews flag potential O(n²) algorithms, unbounded caching, or blocking I/O in hot paths

## When NOT to Use

Avoid this skill for:

- One-off profiling of a single request (use `coding-debugging-profiling` instead — focus on CPU/ flamegraphs)
- Unit-level correctness testing (use standard unit tests; performance tests validate system behavior under load)
- Network-level troubleshooting (use packet captures and tracing tools instead)

---

## Core Workflow

1. **Define the Performance Hypothesis** — State what you will measure, under what load profile, and the pass/fail thresholds. Example: "At 500 concurrent users with a think-time of 2 seconds, p99 latency must stay below 300ms and error rate below 0.1%." **Checkpoint:** Every threshold must be traceable to an SLO or business requirement.

2. **Model Real Traffic Patterns** — Analyze production metrics (APM dashboards, access logs) to extract the distribution of request types, user paths, think-times, and peak-to-average ratios. Use this data to construct a weighted scenario model. **Checkpoint:** If no production data exists, run a short baseline capture first before building the test scenario.

3. **Build the Test Harness** — Write reproducible load scripts using an appropriate tool. Python + Locust for complex user workflows, k6 for developer-friendly JavaScript-based tests, or wrk/wrk2 for raw HTTP endpoint benchmarking. **Checkpoint:** Verify the harness generates realistic error behavior (authentication flows, session management) rather than simple GET requests.

4. **Execute in Stages** — Run a single-user smoke test first to verify correctness. Then ramp up to 1x expected load and hold for 5 minutes. Finally ramp to 2–3x expected load for the stress phase. Collect metrics at every stage. **Checkpoint:** If smoke test fails, stop and fix before running load tests — garbage in, garbage out.

5. **Analyze Metrics and Identify Bottlenecks** — Examine p50/p95/p99 latency curves, throughput (RPS), error rates, and resource utilization (CPU, memory, disk I/O, network). Look for inflection points where metrics degrade. Correlate with application logs and APM traces. **Checkpoint:** Every degradation point must have a hypothesized cause before proceeding to profiling.

6. **Profile and Fix** — Use profiling tools (cProfile, py-spy, pprof) on the bottleneck identified in Step 5. Profile under load conditions, not just idle — bottlenecks often differ between light and heavy traffic. **Checkpoint:** Re-run the load test after each fix to confirm improvement. Regression testing is mandatory.

---

## Implementation Patterns

### Pattern 1: Locust Load Test for API Endpoints

Python-based distributed load testing with realistic user behaviors, session management, and HTTP authentication flows.

```python
"""Locust performance test for a REST API under varying concurrency levels."""

import time
from locust import HttpUser, task, between, events
from typing import Dict, Optional


class ApiUser(HttpUser):
    """Simulates real API consumers with weighted request patterns and think time."""

    wait_time = between(1.0, 3.0)  # Random think time mimicking human interaction

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.auth_token: Optional[str] = None
        self.user_id: Optional[int] = None

    def on_start(self) -> None:
        """Authenticate once at the start of a user session."""
        assert self.client is not None
        login_payload = {"username": "perf_test_user", "password": "secure_password_123"}
        response = self.client.post("/api/v1/auth/login", json=login_payload)

        if response.status_code != 200:
            raise RuntimeError(f"Login failed with status {response.status_code}")

        token_data: Dict[str, str] = response.json()
        self.auth_token = token_data["access_token"]
        self.user_id = token_data["user_id"]
        self.client.headers.update({"Authorization": f"Bearer {self.auth_token}"})

    @task(3)  # Weighted: this task runs 3x more frequently than weight-1 tasks
    def get_user_profile(self) -> None:
        """Fetch current user profile — the most common API call in production."""
        assert self.client is not None and self.user_id is not None
        response = self.client.get(f"/api/v1/users/{self.user_id}/profile")

        # Custom event to track latency percentiles with context tags
        response_time_ms = response.elapsed.total_seconds() * 1000
        if response.status_code != 200:
            events.request.fire(
                request_type="GET", name=f"/api/v1/users/{self.user_id}/profile[FAIL]",
                response_time=response_time_ms, response_length=0, exception=None,
            )

    @task(1)  # Less frequent but resource-intensive write operation
    def update_profile(self) -> None:
        """Update user settings — heavier endpoint with database writes."""
        assert self.client is not None and self.user_id is not None
        payload = {
            "display_name": f"perf_test_{int(time.time())}",
            "theme": "dark",
            "notifications_enabled": True,
        }
        response = self.client.put(f"/api/v1/users/{self.user_id}/settings", json=payload)

        if response.status_code not in (200, 204):
            events.request.fire(
                request_type="PUT", name=f"/api/v1/users/{self.user_id}/settings[FAIL]",
                response_time=response.elapsed.total_seconds() * 1000,
                response_length=0, exception=None,
            )

    @task(1)
    def search_items(self) -> None:
        """Search endpoint — the likely bottleneck under load due to database queries."""
        assert self.client is not None
        params = {"q": f"perf_test_item_{int(time.time()) % 1000}", "page": 1, "limit": 50}
        response = self.client.get("/api/v1/items/search", params=params)

        if response.status_code != 200:
            events.request.fire(
                request_type="GET", name="/api/v1/items/search[FAIL]",
                response_time=response.elapsed.total_seconds() * 1000,
                response_length=0, exception=None,
            )


# Hook to produce a summary report after test completion
@events.test_stop.add_listener
def on_test_stop(environment, **kw) -> None:
    """Log performance summary statistics when the load test finishes."""
    stats = environment.runner.stats
    print("\n" + "=" * 60)
    print(f"{'Endpoint':<45} {'Requests':>8} {'Failures':>9} {'Avg (ms)':>10}")
    print("-" * 72)
    for key, stat in stats.entries.items():
        if key.startswith("/api/"):
            avg_ms = round(stat.avg_response_time, 1) if stat.avg_response_time else 0
            print(f"{key:<45} {stat.num_requests:>8} {stat.num_failures:>9} {avg_ms:>10}")
    print("=" * 60)
```

**Running Locust:**

```bash
# Single-node test: 20 users, ramp up over 30 seconds, run for 5 minutes
locust -f test_load.py --headless -u 20 --spawn-rate 1 -r 1 --run-time 5m \
    --host https://staging.example.com

# Distributed mode: master node orchestrates multiple worker nodes
# Worker nodes (start each in a separate terminal):
locust -f test_load.py --worker --master-host 10.0.0.50 -u 200 --spawn-rate 10

# Master node:
locust -f test_load.py --master --headless -u 1000 --spawn-rate 50 \
    --host https://staging.example.com
```

### Pattern 2: k6 Script for Developer-Friendly Performance Testing

JavaScript-based load testing integrated into CI/CD pipelines with built-in metrics and alerting.

```javascript
/**
 * k6 performance test script for HTTP API endpoints.
 * Uses a linear ramp-up model: start at 0 VUs, ramp to 100 over 2 minutes,
 * hold steady for 3 minutes, then ramp down.
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics for fine-grained tracking
const errorRate = new Rate('http_errors');
const searchLatency = new Trend('search_latency_ms');
const p95Threshold = 300; // milliseconds — p99 must stay below this

export const options = {
    stages: [
        { duration: '1m', target: 20 },    // Warm-up: ramp to 20 VUs in 1 min
        { duration: '2m', target: 100 },   // Load: ramp to 100 VUs over 2 min
        { duration: '5m', target: 100 },   // Steady-state: hold 100 VUs for 5 min
        { duration: '2m', target: 200 },   // Stress: spike to 200 VUs
        { duration: '3m', target: 200 },   // Sustained stress: hold 200 VUs
        { duration: '1m', target: 0 },     // Cool-down: ramp back to zero
    ],
    thresholds: {
        'http_req_duration': ['p(95)<300', 'p(99)<500'],  // p95 < 300ms, p99 < 500ms
        'http_req_failed': ['rate<0.01'],                    // Error rate < 1%
        'search_latency_ms': [`p(95)<${p95Threshold}`],     // Custom threshold for search
    },
};

const BASE_URL = __ENV.K6_BASE_URL || 'https://staging.example.com';
const AUTH_ENDPOINT = `${BASE_URL}/api/v1/auth/login`;
const PROFILE_ENDPOINT = `${BASE_URL}/api/v1/users/me/profile`;
const SEARCH_ENDPOINT = `${BASE_URL}/api/v1/items/search`;

// Shared state for authentication tokens (executed once per VU)
export function setup() {
    const loginPayload = JSON.stringify({
        username: 'perf_test_user',
        password: 'secure_password_123',
    });

    const params = { headers: { 'Content-Type': 'application/json' } };
    const response = http.post(AUTH_ENDPOINT, loginPayload, params);

    check(response, {
        'login status 200': (r) => r.status === 200,
    });

    return JSON.parse(response.body).access_token;
}

export default function (token) {
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    group('User Profile Operations', () => {
        // Most frequent operation — 3x the weight of others
        let response = http.get(PROFILE_ENDPOINT, { headers });

        check(response, {
            'profile status 200': (r) => r.status === 200,
            'profile p95 under threshold': (r) => r.timings.duration < p95Threshold,
            'response has required fields': (r) =>
                r.json('id') !== undefined && r.json('email') !== undefined,
        });

        sleep(Math.random() * 2 + 1); // Random think time between 1-3 seconds

        response = http.get(PROFILE_ENDPOINT, { headers });
        check(response, { 'profile repeat status 200': (r) => r.status === 200 });
        sleep(Math.random() * 2 + 1);
    });

    group('Search Operations', () => {
        // Search — the likely bottleneck; track latency separately
        const searchParams = {
            params: { q: `perf_test_${Math.floor(Math.random() * 1000)}`, page: 1, limit: 50 },
        };

        const t0 = Date.now();
        response = http.get(SEARCH_ENDPOINT, searchParams);
        const elapsed = Date.now() - t0;
        searchLatency.add(elapsed);

        errorRate.add(response.status !== 200);

        check(response, {
            'search status 200': (r) => r.status === 200,
            'search returns results': (r) => r.json('items') !== undefined || r.json('items').length > 0,
            'search p95 under threshold': (r) => r.timings.duration < p95Threshold,
        });

        sleep(Math.random() * 3 + 1); // Longer think time for search operations
    });
}

// Cleanup: report summary to CI/CD pipeline
export function handleSummary(data) {
    return {
        'stdout': textSummary(data, { indent: ' ', enableColors: true }),
        `./results/perf-report-${new Date().toISOString()}.json`: JSON.stringify(data),
    };
}

function textSummary(data, opts) {
    // Minimal summary — k6 provides rich built-in reporting by default
    const checks = data.metrics.checks ? data.metrics.checks.values : {};
    return `\nPerformance test completed at ${new Date().toISOString()}\n`;
}
```

**Running k6:**

```bash
# Run locally with detailed console output and summary
K6_BASE_URL=https://staging.example.com k6 run --summary-export=results.json test.js

# Output to InfluxDB for real-time dashboard visualization
k6 run --out influxdb=http://localhost:8086/k6_test_metrics test.js

# Integrate into CI/CD pipeline with failure threshold enforcement
K6_BASE_URL=https://staging.example.com k6 run --quiet test.js \
  || { echo "Performance thresholds failed!"; exit 1; }
```

### Pattern 3: wrk for Raw HTTP Endpoint Benchmarking

Minimal overhead HTTP benchmarking tool for comparing endpoint performance across configurations. Ideal for quick before/after comparisons after code changes.

```bash
# Baseline measurement — 4 threads, 20 connections, run for 30 seconds
wrk -t4 -c20 -d30s http://localhost:8080/api/v1/items/search?q=perf_test

# Comparison after optimization — same load profile on updated deployment
wrk -t4 -c20 -d30s http://staging.example.com/api/v1/items/search?q=perf_test \
    -H "Authorization: Bearer $TEST_TOKEN"

# Stress test with high concurrency to find the breaking point
wrk -t8 -c500 -d60s http://localhost:8080/api/v1/items/search?q=perf_test

# With custom POST request and JSON body
wrk -t4 -c20 -d30s -s scripts/post.lua \
    --latency \
    'http://localhost:8080/api/v1/users'

# Latency histogram output — shows distribution not just average
wrk -t4 -c20 -d30s --latency http://localhost:8080/api/v1/items/search?q=test
```

## Bottleneck Analysis Framework

When metrics degrade under load, follow this structured approach to root cause identification.

### Step 1: Classify the Symptom

| Symptom | Likely Cause | Tooling to Confirm |
|---------|-------------|-------------------|
| Latency increases linearly with RPS | Unbounded resource contention (DB locks, thread pool exhaustion) | Thread dumps, DB query logs |
| Throughput plateaus then drops | GC pauses, memory pressure, or connection pool saturation | GC logs, memory profiling (`memory_profiler`) |
| Intermittent errors under load | Race conditions, timeout cascades, circuit breaker trips | Distributed tracing (Jaeger, OpenTelemetry) |
| CPU stays flat but latency spikes | Disk I/O bottleneck or network saturation | `iostat`, `netstat`, `ss -s` |
| p99 much higher than p95 | Tail latency amplification (slow queries, cache misses) | Slow query logs, cache hit ratio monitoring |

### Step 2: Profile Under Load

```python
"""Profile a Flask endpoint under simulated concurrent load using py-spy and cProfile."""

import threading
import time
import cProfile
import pstats
from io import StringIO
from functools import wraps
from typing import Callable


def profile_endpoint(func: Callable) -> Callable:
    """Decorator that profiles an endpoint function and logs performance stats.
    
    Use during load testing, not in production. Resets state between calls.
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        pr = cProfile.Profile()
        pr.enable()
        
        try:
            result = func(*args, **kwargs)
        finally:
            pr.disable()
            
        # Output to string buffer for aggregation during load test
        stream = StringIO()
        stats = pstats.Stats(pr, stream=stream)
        stats.sort_stats('cumulative')
        stats.print_stats(20)  # Top 20 time-consuming calls
        
        return result
    
    return wrapper

# Example: Profile a database-heavy endpoint
@profile_endpoint
def get_user_orders(user_id: int, page: int = 1, per_page: int = 50) -> list[dict]:
    """Fetch paginated order history for a user — likely to have N+1 query issues."""
    from db import session, Order, Product
    
    orders = (
        session.query(Order)
        .filter(Order.user_id == user_id)
        .order_by(Order.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    
    # N+1 anti-pattern: loading products for each order individually
    result = []
    for order in orders:
        products = [p.name for p in order.products]  # Each access triggers a query!
        result.append({
            "order_id": order.id,
            "total": float(order.total),
            "products": products,
            "created_at": order.created_at.isoformat(),
        })
    
    return result
```

### Step 3: Fix and Re-Test

Apply fixes in priority order:
1. **Database** — Add missing indexes, batch joins to eliminate N+1 queries, use read replicas
2. **Caching** — Implement response caching (Redis) for cacheable endpoints; add cache warming strategy
3. **Async processing** — Offload non-critical operations to message queues (Celery, RabbitMQ)
4. **Connection pools** — Tune pool sizes based on load test results; verify timeout configs
5. **Code** — Replace O(n²) algorithms, reduce serialization overhead, eliminate blocking I/O

After each fix, re-run the full load test from Step 4 to confirm improvement and prevent regression.

## Constraints

### MUST DO
- Always state a quantitative performance hypothesis with pass/fail thresholds before running tests
- Collect p50/p95/p99 latencies — never rely on averages alone; they hide tail latency problems
- Ramp up gradually (ramp-up phase of 1–2 minutes) before holding steady-state load to avoid shock-loading services
- Run soak tests for at least 4 hours when evaluating memory leaks or connection pool exhaustion
- Profile under realistic load conditions — idle profiling misses lock contention and cache eviction patterns
- Correlate application metrics with system-level metrics (CPU, memory, disk I/O, network)
- Store results in a versioned format so regression is detectable over time

### MUST NOT DO
- Use uniform random load to model user traffic — real users have bursty, correlated behavior patterns
- Skip the single-user smoke test — running broken code under load wastes time and produces misleading data
- Set thresholds based on guesses — every threshold must be traceable to an SLO or business requirement
- Optimize for peak throughput alone — a system that handles 10,000 RPS but has 5-second p99 is not useful
- Ignore error rates during load tests — a 2% error rate at scale means thousands of affected users
- Run load tests against production without explicit approval and rollback plans

## Output Template

When applying this skill, produce:

1. **Performance Hypothesis** — Statement of what will be measured, the load model, and pass/fail thresholds
2. **Load Test Configuration** — Tool selection rationale, concurrency model, traffic pattern weights, ramp-up strategy
3. **Baseline Results** — Metrics collected during the baseline run (p50/p95/p99 latency, throughput, error rate)
4. **Degradation Analysis** — Where metrics degraded relative to thresholds, with hypothesized root causes
5. **Bottleneck Report** — Specific code paths, database queries, or configuration settings identified as bottlenecks
6. **Fix Recommendations** — Prioritized list of fixes with estimated impact and implementation effort

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-debugging-profiling` | Single-request profiling (CPU flamegraphs, memory leaks) for bottleneck investigation after load tests reveal issues |
| `coding-code-quality-policies` | Code quality standards that apply when writing test harnesses and production code targeted by performance tests |
