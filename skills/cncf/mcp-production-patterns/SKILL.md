---
name: mcp-production-patterns
description: Implements production-grade MCP deployments with patterns for latency optimization (stdio vs HTTP transports), stateful session management, caching strategies, observability (tracing, metrics), rate limiting, graceful degradation, and lessons from production evidence (Smartsheet, Rippling, Chronograph deployments).
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: cncf
  role: implementation
  scope: infrastructure
  output-format: code
  triggers: mcp production, mcp deployment, mcp performance, mcp observability, mcp monitoring, http streamable, stateful session pattern
  related-skills: mcp-server-fastmcp-python, mcp-client-integration, mcp-security-authorization
  archetypes: tactical, strategic
  anti_triggers: brainstorming, vague ideation
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
---

# MCP Production Patterns

Implements production-grade Model Context Protocol deployments with proven patterns for transport optimization, session management, caching, observability, and graceful degradation based on real-world evidence from Smartsheet, Rippling, and Chronograph deployments.

## TL;DR Checklist

- [ ] Choose transport: stdio (0.01ms local) vs HTTP/Streamable (0.39ms loopback, 2.5s coldstart)
- [ ] Apply one of five core server patterns: Resource Gateway, Tool Orchestrator, Stateful Session, Proxy Aggregator, Domain-Specific Adapter
- [ ] Implement caching for tool results and resource listings (avoid cache stampedes)
- [ ] Add distributed tracing (OpenTelemetry) and structured metrics
- [ ] Implement rate limiting (token bucket with adaptive backoff)
- [ ] Add circuit breaker for failing backends
- [ ] Test graceful degradation: timeouts, fallbacks, partial responses

---

## When to Use

Use this skill when:

- Deploying MCP servers to production or high-traffic environments
- Optimizing for latency-sensitive applications (sub-100ms response requirement)
- Building multi-tenant MCP deployments (Rippling pattern)
- Aggregating resources from multiple backend systems (Proxy Aggregator)
- Implementing stateful conversation context across multiple MCP calls
- Adding observability (tracing, metrics, structured logging) to MCP infrastructure
- Designing rate limiting or graceful degradation strategies
- Choosing between stdio, HTTP, or Streamable transports based on deployment topology

---

## When NOT to Use

Avoid this skill for:

- Simple, local MCP servers (use default patterns)
- Single-use development/testing servers
- Deployments with <10 QPS traffic
- Scenarios where you don't need cross-call state management
- When native MCP transport defaults are sufficient (not performance-constrained)

---

## Transport Selection: Latency Profile & Trade-offs

### Latency Characteristics

| Transport | Latency | Cold Start | Best For | Trade-off |
|-----------|---------|-----------|----------|-----------|
| **stdio** | 0.01ms (local process) | Instant | Single-machine, local LLM agents | Limited to same machine; hard to scale |
| **HTTP/REST** | 0.39ms (loopback), ~5-50ms (network) | Instant | Distributed deployments, cloud native | Network overhead; connection pooling critical |
| **Streamable (SSE-based)** | 0.39ms (loopback), 2.5s (cold connection) | 2.5s | Long-lived connections, real-time updates | Higher memory per connection; reconnect storms |

### Selection Logic

```
Is the LLM agent on the same machine?
  → YES: Use stdio (simplest, fastest)
  → NO: Is real-time streaming required?
    → YES: Use Streamable (handle reconnection storms)
    → NO: Use HTTP/REST (standard, cloud-native, easiest load balancing)
```

### HTTP-Specific Tuning

For HTTP deployments, always implement:

1. **Connection pooling**: Reuse TCP connections
2. **Keep-Alive headers**: `Connection: keep-alive`
3. **Graceful shutdown**: Drain in-flight requests before closing
4. **Load balancing**: Distribute across multiple server instances
5. **Circuit breaker**: Fail fast if backend is overloaded

---

## Five Core Server Patterns

### Pattern 1: Resource Gateway

**Purpose:** Expose read-only resources from multiple backend systems. Delegate tool invocation to backend-specific servers.

**Real-world example:** Smartsheet MCP integration — expose sheets, rows, columns as resources; delegate writes to specialized tool server.

**When to use:**
- Resources are expensive to compute but stable (low churn)
- Tools require separate authorization or backend delegation
- You want to cache resource listings aggressively

**Implementation:**
```python
from mcp.server import Server
from mcp.types import Resource, ResourceTemplate, ListResourcesRequest

server = Server("resource-gateway")

# Cache resource listings (30-second TTL)
_resource_cache = {}
_cache_ttl = 30

@server.list_resources()
async def list_resources_handler(request: ListResourcesRequest) -> list[Resource]:
    """Expose resources from multiple backends."""
    now = time.time()
    
    # Check cache first
    cache_key = f"resources:{request.cursor or 'root'}"
    if cache_key in _resource_cache:
        cached, cached_at = _resource_cache[cache_key]
        if now - cached_at < _cache_ttl:
            return cached  # Cache hit
    
    # Cache miss: fetch from backends
    resources = []
    
    # Backend 1: Smartsheet API
    smartsheet_resources = await fetch_smartsheet_resources()
    resources.extend(smartsheet_resources)
    
    # Backend 2: Airtable API
    airtable_resources = await fetch_airtable_resources()
    resources.extend(airtable_resources)
    
    # Cache the result
    _resource_cache[cache_key] = (resources, now)
    
    return resources

@server.call_tool()
async def call_tool_handler(name: str, arguments: dict) -> list:
    """Delegate tool execution to specialized servers."""
    if name.startswith("smartsheet_"):
        # Route to Smartsheet tool server
        return await smartsheet_tool_server.call_tool(name, arguments)
    elif name.startswith("airtable_"):
        # Route to Airtable tool server
        return await airtable_tool_server.call_tool(name, arguments)
    else:
        raise ValueError(f"Unknown tool: {name}")
```

**Trade-offs:**
- ✅ Clean separation: read-only gateway + write-capable tool servers
- ✅ Resource listing is cached and fast
- ❌ Tool invocation adds hop latency
- ❌ Gateway must know about all backends

---

### Pattern 2: Tool Orchestrator

**Purpose:** Receive multi-step tool requests, route them to appropriate backend servers, and return aggregated results.

**Real-world example:** Rippling multi-tenant integration — route HRIS calls to Rippling, payroll calls to ADP, benefit calls to Guidepoint.

**When to use:**
- Tools map to different backend systems
- Tool invocation logic depends on user tenant/organization
- You want a single MCP endpoint that routes to many backends

**Implementation:**
```python
@server.call_tool()
async def call_tool_handler(name: str, arguments: dict) -> list:
    """Multi-tenant tool orchestrator."""
    tenant_id = arguments.get("tenant_id")
    if not tenant_id:
        raise ValueError("tenant_id is required")
    
    # Route based on tool name and tenant
    if name == "get_employee":
        backend = get_tenant_backend(tenant_id, "hris")
        return await backend.call_tool(name, arguments)
    
    elif name == "update_payroll":
        backend = get_tenant_backend(tenant_id, "payroll")
        # Add circuit breaker for resilience
        try:
            return await circuit_breaker.call(
                backend.call_tool,
                name,
                arguments,
                timeout=5.0
            )
        except CircuitBreakerOpen:
            return [{"error": "Payroll service temporarily unavailable"}]
    
    else:
        raise ValueError(f"Unknown tool: {name}")
```

**Trade-offs:**
- ✅ Single endpoint for all tools
- ✅ Easy to add new backends
- ❌ Requires tenant/org context in every call
- ❌ Error in one backend doesn't affect others (good for resilience, bad for atomicity)

---

### Pattern 3: Stateful Session

**Purpose:** Maintain conversation state across multiple tool calls. Store state server-side with session ID.

**Real-world example:** Chronograph time-series database — maintain query context (selected metrics, time range) across multiple tool invocations.

**When to use:**
- Tools need context from previous calls
- You want to reduce redundant data transfer
- Multi-step workflows where state builds up

**Implementation:**
```python
from dataclasses import dataclass
import uuid

@dataclass
class SessionState:
    """Conversation state tied to a session ID."""
    session_id: str
    selected_metrics: list[str] = None
    time_range: tuple[int, int] = None
    selected_tags: dict = None
    created_at: float = None
    last_accessed_at: float = None

# In-memory session store (use Redis for distributed deployments)
_sessions: dict[str, SessionState] = {}
_session_timeout = 3600  # 1 hour

def get_or_create_session(session_id: str = None) -> SessionState:
    """Get existing session or create new one."""
    if session_id and session_id in _sessions:
        session = _sessions[session_id]
        session.last_accessed_at = time.time()
        return session
    
    # Create new session
    new_id = session_id or str(uuid.uuid4())
    session = SessionState(
        session_id=new_id,
        selected_metrics=[],
        time_range=(None, None),
        selected_tags={},
        created_at=time.time(),
        last_accessed_at=time.time()
    )
    _sessions[new_id] = session
    return session

@server.call_tool()
async def call_tool_handler(name: str, arguments: dict) -> list:
    """Tool handler with session state management."""
    session_id = arguments.pop("session_id", None)
    session = get_or_create_session(session_id)
    
    if name == "select_metrics":
        # Update session state
        session.selected_metrics = arguments.get("metrics", [])
        return [{"session_id": session.session_id, "status": "ok"}]
    
    elif name == "select_time_range":
        session.time_range = (
            arguments.get("start_unix_ts"),
            arguments.get("end_unix_ts")
        )
        return [{"session_id": session.session_id, "status": "ok"}]
    
    elif name == "query_metrics":
        # Use session state if not overridden
        metrics = arguments.get("metrics") or session.selected_metrics
        start, end = arguments.get("time_range") or session.time_range
        
        results = await query_backend(
            metrics=metrics,
            start_ts=start,
            end_ts=end
        )
        return [{"session_id": session.session_id, "data": results}]
    
    else:
        raise ValueError(f"Unknown tool: {name}")

# Background task: clean up expired sessions
async def cleanup_expired_sessions():
    """Remove sessions older than timeout."""
    now = time.time()
    expired = [
        sid for sid, session in _sessions.items()
        if now - session.last_accessed_at > _session_timeout
    ]
    for sid in expired:
        del _sessions[sid]
```

**Trade-offs:**
- ✅ Reduced latency: state is pre-computed and cached
- ✅ Cleaner UX: users don't repeat context
- ❌ State divergence: if client has stale session ID
- ❌ Memory overhead: session store grows with number of active conversations

---

### Pattern 4: Proxy Aggregator

**Purpose:** Fan out to multiple backend servers in parallel, merge results, return unified response.

**Real-world example:** Smartsheet + Airtable query aggregator — search for records in both systems, return combined results sorted by relevance.

**When to use:**
- You need to combine data from multiple backends
- Backends can be queried in parallel (no ordering dependency)
- Result merging is deterministic

**Implementation:**
```python
import asyncio
from typing import Any

@server.call_tool()
async def call_tool_handler(name: str, arguments: dict) -> list[dict]:
    """Fan-out to multiple backends, merge results."""
    
    if name == "search_records":
        query = arguments.get("query")
        
        # Parallel queries to multiple backends
        tasks = [
            query_smartsheet(query),
            query_airtable(query),
            query_notion(query)
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Handle failures gracefully (partial results OK)
        merged = []
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Backend query failed: {result}")
                continue  # Skip failed backend
            merged.extend(result)
        
        # Sort merged results by relevance score
        merged.sort(key=lambda x: x.get("relevance_score", 0), reverse=True)
        
        return merged[:100]  # Limit to top 100
    
    else:
        raise ValueError(f"Unknown tool: {name}")

async def query_smartsheet(query: str) -> list[dict]:
    """Query Smartsheet with timeout."""
    try:
        return await asyncio.wait_for(
            smartsheet_client.search(query),
            timeout=2.0
        )
    except asyncio.TimeoutError:
        logger.warning("Smartsheet query timed out")
        return []

async def query_airtable(query: str) -> list[dict]:
    """Query Airtable with timeout."""
    try:
        return await asyncio.wait_for(
            airtable_client.search(query),
            timeout=2.0
        )
    except asyncio.TimeoutError:
        logger.warning("Airtable query timed out")
        return []

async def query_notion(query: str) -> list[dict]:
    """Query Notion with timeout."""
    try:
        return await asyncio.wait_for(
            notion_client.search(query),
            timeout=2.0
        )
    except asyncio.TimeoutError:
        logger.warning("Notion query timed out")
        return []
```

**Trade-offs:**
- ✅ Unified query interface across multiple backends
- ✅ Parallel execution: total latency = max(backend latencies), not sum
- ❌ Result merging can be complex (ranking, deduplication)
- ❌ One slow backend affects overall latency

**Optimization:** Set per-backend timeout and include partial results from faster backends while slower ones still run.

---

### Pattern 5: Domain-Specific Adapter

**Purpose:** Implement specialized business logic on top of MCP. Example: Chronograph real-time time-series adapter.

**Real-world example:** Chronograph — expose time-series metrics as resources with automatic aggregation, downsampling, and real-time subscription support.

**When to use:**
- You need custom business logic beyond simple CRUD
- The adapter serves a specific use case (time-series, geospatial, graph queries)
- You want rich domain semantics in resource URIs

**Implementation:**
```python
from mcp.types import Resource, ReadResourceRequest

@server.list_resources()
async def list_resources_handler(request: ListResourcesRequest) -> list[Resource]:
    """Chronograph: Time-series metrics as resources."""
    
    # Resource URI format: metric://namespace/metric_name?resolution=1m&aggregate=sum
    resources = []
    
    # Fetch available metrics from backend
    for metric in await chronograph_backend.list_metrics():
        # High-resolution resource (raw data)
        resources.append(Resource(
            uri=f"metric://{metric.namespace}/{metric.name}?resolution=raw",
            name=f"{metric.name} (raw)",
            description=f"Raw time-series data for {metric.name}",
            mimeType="application/json"
        ))
        
        # Downsampled resources (pre-aggregated for performance)
        for resolution in ["1m", "5m", "1h"]:
            resources.append(Resource(
                uri=f"metric://{metric.namespace}/{metric.name}?resolution={resolution}&aggregate=avg",
                name=f"{metric.name} ({resolution} avg)",
                description=f"Downsampled to {resolution}, average aggregation",
                mimeType="application/json"
            ))
    
    return resources

@server.read_resource()
async def read_resource_handler(request: ReadResourceRequest) -> str:
    """Read time-series data with query parameter parsing."""
    
    uri = request.uri
    # Parse: metric://namespace/metric_name?resolution=1m&aggregate=sum
    
    if not uri.startswith("metric://"):
        raise ValueError(f"Unknown resource type: {uri}")
    
    # Extract parts
    parts = uri.split("?")
    path = parts[0].replace("metric://", "")
    namespace, metric_name = path.split("/")
    
    # Parse query parameters
    params = {}
    if len(parts) > 1:
        for param in parts[1].split("&"):
            k, v = param.split("=")
            params[k] = v
    
    resolution = params.get("resolution", "raw")
    aggregate = params.get("aggregate", "sum")
    
    # Fetch and process
    data = await chronograph_backend.query(
        namespace=namespace,
        metric_name=metric_name,
        resolution=resolution,
        aggregate_fn=aggregate
    )
    
    return json.dumps(data)

@server.call_tool()
async def call_tool_handler(name: str, arguments: dict) -> list:
    """Domain-specific tools: anomaly detection, alerting, etc."""
    
    if name == "detect_anomalies":
        metric_uri = arguments.get("metric_uri")
        threshold_std = arguments.get("threshold_std", 2.0)
        
        # Parse resource URI
        data = await read_resource_handler(
            ReadResourceRequest(uri=metric_uri)
        )
        
        # Anomaly detection logic
        anomalies = detect_statistical_outliers(
            json.loads(data),
            threshold=threshold_std
        )
        
        return [{"anomalies": anomalies}]
    
    else:
        raise ValueError(f"Unknown tool: {name}")
```

**Trade-offs:**
- ✅ Rich domain semantics (resource URIs carry query logic)
- ✅ Efficient: pre-aggregated resources reduce bandwidth
- ❌ Resource URI design impacts discovery performance
- ❌ Custom query parsing adds complexity

---

## Performance Tuning

### Caching Strategies

#### ❌ BAD: Cache stampede vulnerability

```python
# Dangerous: all requests wait for one slow query
_cache = {}

@server.call_tool()
async def call_tool_handler(name: str, arguments: dict) -> list:
    cache_key = f"expensive_query:{arguments}"
    
    if cache_key in _cache:
        return _cache[cache_key]
    
    # All concurrent requests block here waiting for this slow query
    result = await expensive_query()
    _cache[cache_key] = result
    return result
```

**Problem:** If cache expires while multiple requests arrive, all wait for one query to complete (thundering herd).

#### ✅ GOOD: Probabilistic early expiration + locking

```python
import asyncio
from datetime import datetime, timedelta

@dataclass
class CachedValue:
    data: Any
    expires_at: datetime
    is_refreshing: bool = False
    refresh_lock: asyncio.Lock = None

_cache: dict[str, CachedValue] = {}
_cache_ttl = 30  # seconds

async def get_cached(cache_key: str, fetch_fn) -> Any:
    """Fetch with probabilistic early refresh."""
    now = datetime.now()
    
    if cache_key not in _cache:
        # Cache miss: fetch and cache
        cached = CachedValue(
            data=await fetch_fn(),
            expires_at=now + timedelta(seconds=_cache_ttl),
            refresh_lock=asyncio.Lock()
        )
        _cache[cache_key] = cached
        return cached.data
    
    cached = _cache[cache_key]
    
    # If expired, refresh (with locking to prevent stampede)
    if now >= cached.expires_at:
        if not cached.is_refreshing:
            cached.is_refreshing = True
            try:
                cached.data = await fetch_fn()
                cached.expires_at = now + timedelta(seconds=_cache_ttl)
            finally:
                cached.is_refreshing = False
        else:
            # Another request is already refreshing; wait and use stale data
            await cached.refresh_lock.acquire()
            cached.refresh_lock.release()
    
    return cached.data

# Usage
@server.call_tool()
async def call_tool_handler(name: str, arguments: dict) -> list:
    cache_key = f"expensive_query:{arguments}"
    result = await get_cached(cache_key, expensive_query)
    return result
```

**Benefits:**
- ✅ Single refresh request even if multiple arrive during refresh
- ✅ Probabilistic early expiration prevents simultaneous expirations
- ✅ Stale-while-revalidate improves perceived performance

### Batching Tool Calls

```python
@server.call_tool()
async def call_tool_handler(name: str, arguments: dict) -> list:
    """Batch multiple tool calls into single backend request."""
    
    if name == "batch_get_records":
        record_ids = arguments.get("record_ids", [])
        
        # Instead of sequential queries, batch into one backend call
        results = await backend.batch_get(record_ids)
        
        return [{"records": results}]
    
    else:
        raise ValueError(f"Unknown tool: {name}")
```

### Connection Pooling (HTTP Transport)

```python
import aiohttp

# Global session pool (reuse TCP connections)
_http_session = None

def get_http_session() -> aiohttp.ClientSession:
    """Get or create HTTP session for connection pooling."""
    global _http_session
    if _http_session is None:
        connector = aiohttp.TCPConnector(
            limit=100,  # Max connections
            limit_per_host=10,  # Per-host limit
            ttl_dns_cache=300,  # DNS cache 5 min
            ssl=True
        )
        _http_session = aiohttp.ClientSession(connector=connector)
    return _http_session
```

---

## Observability

### Distributed Tracing (OpenTelemetry)

```python
from opentelemetry import trace, metrics
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

# Initialize tracer
tracer_provider = TracerProvider()
tracer_provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
trace.set_tracer_provider(tracer_provider)
tracer = trace.get_tracer(__name__)

@server.call_tool()
async def call_tool_handler(name: str, arguments: dict) -> list:
    """Tool handler with distributed tracing."""
    
    with tracer.start_as_current_span(f"tool.{name}") as span:
        span.set_attribute("tool.name", name)
        span.set_attribute("tool.arguments", str(arguments))
        
        try:
            result = await execute_tool(name, arguments)
            span.set_attribute("tool.status", "success")
            return result
        except Exception as e:
            span.set_attribute("tool.status", "error")
            span.set_attribute("tool.error", str(e))
            raise
```

### Structured Metrics

```python
from opentelemetry import metrics as otel_metrics

meter = otel_metrics.get_meter(__name__)

# Create meters for key metrics
tool_call_latency = meter.create_histogram(
    "mcp.tool.call.latency_ms",
    description="Tool call latency in milliseconds"
)

tool_call_errors = meter.create_counter(
    "mcp.tool.call.errors",
    description="Tool call error count"
)

cache_hits = meter.create_counter(
    "mcp.cache.hits",
    description="Cache hit count"
)

@server.call_tool()
async def call_tool_handler(name: str, arguments: dict) -> list:
    """Tool handler with metrics."""
    
    start = time.time()
    try:
        result = await execute_tool(name, arguments)
        latency_ms = (time.time() - start) * 1000
        tool_call_latency.record(latency_ms, {"tool": name, "status": "success"})
        return result
    except Exception as e:
        tool_call_errors.add(1, {"tool": name, "error_type": type(e).__name__})
        raise
```

### Structured Logging

```python
import structlog

logger = structlog.get_logger(__name__)

@server.call_tool()
async def call_tool_handler(name: str, arguments: dict) -> list:
    """Tool handler with structured logging."""
    
    logger.info(
        "tool.call.start",
        tool_name=name,
        arguments=arguments,
        timestamp=datetime.now().isoformat()
    )
    
    try:
        result = await execute_tool(name, arguments)
        logger.info(
            "tool.call.success",
            tool_name=name,
            result_size=len(str(result))
        )
        return result
    except Exception as e:
        logger.error(
            "tool.call.error",
            tool_name=name,
            error=str(e),
            error_type=type(e).__name__
        )
        raise
```

---

## Rate Limiting & Graceful Degradation

### Token Bucket Rate Limiter

```python
import asyncio
from dataclasses import dataclass
from datetime import datetime, timedelta

@dataclass
class RateLimiter:
    """Token bucket rate limiter with adaptive backoff."""
    capacity: int  # Max tokens
    refill_rate: float  # Tokens per second
    tokens: float = None
    last_refill: datetime = None
    
    def __post_init__(self):
        self.tokens = float(self.capacity)
        self.last_refill = datetime.now()
    
    async def acquire(self, tokens: int = 1, timeout: float = 5.0) -> bool:
        """Try to acquire tokens; backoff if unavailable."""
        start = time.time()
        
        while True:
            # Refill tokens based on elapsed time
            now = datetime.now()
            elapsed = (now - self.last_refill).total_seconds()
            self.tokens = min(
                self.capacity,
                self.tokens + elapsed * self.refill_rate
            )
            self.last_refill = now
            
            if self.tokens >= tokens:
                self.tokens -= tokens
                return True
            
            # Backoff and retry
            if time.time() - start >= timeout:
                return False  # Timeout: could not acquire tokens
            
            await asyncio.sleep(0.01)  # 10ms backoff

# Global limiter: 100 tool calls per second
_tool_rate_limiter = RateLimiter(capacity=100, refill_rate=100.0)

@server.call_tool()
async def call_tool_handler(name: str, arguments: dict) -> list:
    """Rate-limited tool handler."""
    
    if not await _tool_rate_limiter.acquire(tokens=1, timeout=2.0):
        raise Exception("Rate limit exceeded; try again later")
    
    return await execute_tool(name, arguments)
```

### Circuit Breaker for Failing Backends

```python
from enum import Enum

class CircuitState(Enum):
    CLOSED = "closed"  # Normal operation
    OPEN = "open"      # Failing; reject requests
    HALF_OPEN = "half_open"  # Testing recovery

@dataclass
class CircuitBreaker:
    """Circuit breaker for resilience."""
    failure_threshold: int = 5
    success_threshold: int = 2
    timeout_seconds: float = 60.0
    
    failures: int = 0
    successes: int = 0
    state: CircuitState = CircuitState.CLOSED
    opened_at: datetime = None
    
    async def call(self, fn, *args, **kwargs):
        """Execute function with circuit breaker."""
        
        if self.state == CircuitState.OPEN:
            # Check if timeout expired
            if datetime.now() - self.opened_at > timedelta(seconds=self.timeout_seconds):
                self.state = CircuitState.HALF_OPEN
                self.successes = 0
            else:
                raise Exception("Circuit breaker is open; service unavailable")
        
        try:
            result = await fn(*args, **kwargs)
            
            if self.state == CircuitState.HALF_OPEN:
                self.successes += 1
                if self.successes >= self.success_threshold:
                    # Recovered; close circuit
                    self.state = CircuitState.CLOSED
                    self.failures = 0
            
            return result
        
        except Exception as e:
            self.failures += 1
            if self.failures >= self.failure_threshold:
                # Too many failures; open circuit
                self.state = CircuitState.OPEN
                self.opened_at = datetime.now()
                logger.error(f"Circuit breaker opened: {e}")
            raise

_backend_cb = CircuitBreaker()

@server.call_tool()
async def call_tool_handler(name: str, arguments: dict) -> list:
    """Tool handler with circuit breaker."""
    
    try:
        return await _backend_cb.call(
            backend.call_tool,
            name,
            arguments
        )
    except Exception as e:
        # Graceful degradation: return cached response or default
        logger.warning(f"Backend call failed: {e}")
        return [{"error": "Service temporarily unavailable", "cached": True}]
```

---

## Constraints

### MUST DO

- **Use appropriate transport**: stdio for local, HTTP for distributed
- **Implement caching** with cache-busting (TTL, versioning) to prevent stale data
- **Add distributed tracing** to every production MCP server (OpenTelemetry)
- **Implement rate limiting** to protect backends from overload
- **Test graceful degradation**: timeouts, fallbacks, partial responses
- **Monitor metrics**: tool call latency, error rates, cache hit ratios
- **Use connection pooling** for HTTP backends (reuse TCP connections)
- **Implement circuit breakers** for failing backend services
- **Add structured logging** with contextual information (session ID, tenant ID)

---

### MUST NOT DO

- **Don't block on single backend**: Use timeouts and partial results from multiple backends
- **Don't cache without TTL**: Stale data is worse than no data
- **Don't trust unvalidated input**: Always validate tool arguments and session state
- **Don't ignore errors in non-critical paths**: Log them (for observability) but return graceful defaults
- **Don't scale cache size unbounded**: Set explicit limits (max entries, max memory)
- **Don't use stdio for distributed deployments**: Use HTTP or Streamable
- **Don't synchronously wait for all backends**: Fan out and wait for faster ones with timeout
- **Don't expose internal error details**: Return generic error to clients, log details server-side

---

## Related Skills

| Skill | Purpose |
|---|---|
| `mcp-server-fastmcp-python` | FastMCP framework for building MCP servers with Python |
| `mcp-client-integration` | Client-side MCP integration patterns and best practices |
| `mcp-security-authorization` | Authorization, authentication, and multi-tenant security in MCP |
