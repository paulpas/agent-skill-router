---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: Implements comprehensive health check patterns for cloud-native applications
  including Kubernetes probes, HTTP health endpoints, database checks, and circuit
  breaker patterns
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: code
  related-skills: agent-docker-debugging, cncf-kubernetes-debugging, coding-fastapi-patterns
  role: implementation
  scope: implementation
  triggers: health checks, liveness probes, readiness probes, health monitoring, health
    endpoint, service health, health check implementation, health check testing
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  - non-containerized architecture
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  version: 1.0.0
name: health-check-patterns
------
# Health Check Patterns

Comprehensive health check patterns for cloud-native applications, implementing Kubernetes probes (liveness, readiness, startup), HTTP health endpoints, database connectivity checks, external service monitoring, and circuit breaker patterns to ensure application reliability and service availability.

## TL;DR Checklist

- [ ] Implement separate liveness and readiness probes with distinct purposes
- [ ] Configure appropriate probe timeouts and thresholds for slow-starting applications
- [ ] Add database connection health checks with connection pool metrics
- [ ] Implement HTTP health endpoint with structured JSON response
- [ ] Monitor external service dependencies with timeout and retry logic
- [ ] Add circuit breaker patterns for failing external dependencies
- [ ] Test health checks in isolation before deployment
- [ ] Set up alerting based on health check failures with appropriate thresholds

---

## When to Use

Use health check patterns when:

- Deploying applications to Kubernetes or other container orchestration platforms
- Building microservices that need to expose health status for load balancers
- Implementing distributed systems with multiple external dependencies
- Creating resilient applications that must fail gracefully when dependencies fail
- Setting up CI/CD pipelines with automated health verification
- Designing service mesh configurations that depend on health status

---

## When NOT to Use

Avoid these patterns for:

- **Simple standalone scripts** — Use basic exit codes instead of complex health endpoints
- **Single-process applications without dependencies** — Health checks may add unnecessary overhead
- **Real-time systems with strict timing requirements** — Health check overhead may impact performance
- **Local development without orchestration** — Use simpler logging and error handling

---

## Core Workflow

1. **Design Health Strategy** — Define what "healthy" means for your application (database, cache, external services). **Checkpoint:** Document all dependencies and their health impact on service availability.

2. **Implement Kubernetes Probes** — Create separate liveness, readiness, and startup probes with appropriate configurations. **Checkpoint:** Verify probe endpoints respond correctly with correct HTTP status codes.

3. **Build HTTP Health Endpoint** — Create a standardized health endpoint that aggregates all dependency checks. **Checkpoint:** Test endpoint returns 200 OK when healthy and 503 Service Unavailable when degraded.

4. **Add Database Health Checks** — Implement connection pool monitoring with configurable timeout thresholds. **Checkpoint:** Verify health check fails gracefully when database is unreachable.

5. **Monitor External Services** — Create health checks for all external service dependencies with circuit breaker patterns. **Checkpoint:** Confirm circuit breaker opens when external service fails repeatedly.

6. **Set Up Testing and Validation** — Implement automated health check testing in CI/CD pipeline. **Checkpoint:** Run health check tests in staging environment matching production configuration.

---

## Implementation Patterns

### Pattern 1: Kubernetes Liveness Probes

Liveness probes determine if a container should be restarted. They should check internal application state, not external dependencies.

```yaml
# ❌ BAD — liveness probe checking external dependency (should not depend on database)
livenessProbe:
  httpGet:
    path: /health/live
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 10
  timeoutSeconds: 2
  failureThreshold: 3

# ✅ GOOD — simple liveness probe checking application is still running
livenessProbe:
  exec:
    command:
      - /bin/sh
      - -c
      - "python -c 'import socket; s=socket.socket(); s.connect((\"localhost\", 8080)); s.close()'"
  initialDelaySeconds: 15
  periodSeconds: 20
  timeoutSeconds: 5
  failureThreshold: 3
```

**Best Practice:** Liveness probes should only check if the application process is responding, not if it's fully functional. Use external dependencies only for readiness probes.

### Pattern 2: Kubernetes Readiness Probes

Readiness probes determine if a pod should receive traffic. They should check all critical dependencies.

```yaml
# ✅ GOOD — readiness probe checking all dependencies
readinessProbe:
  httpGet:
    path: /health/ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 3
  successThreshold: 1
  failureThreshold: 3

# ❌ BAD — readiness probe with incorrect thresholds
readinessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 0  # Too aggressive, starts receiving traffic before ready
  periodSeconds: 1  # Too frequent, creates overhead
  timeoutSeconds: 1  # Too short, may timeout on slow dependencies
```

### Pattern 3: Kubernetes Startup Probes

Startup probes are for slow-starting applications that need more time to initialize.

```yaml
# ✅ GOOD — startup probe for application with slow initialization
startupProbe:
  httpGet:
    path: /health/started
    port: 8080
  failureThreshold: 30
  periodSeconds: 10
  timeoutSeconds: 5

# ❌ BAD — startup probe missing, relying only on initialDelaySeconds
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 300  # Long delay but no startup probe
```

**Configuration Example:**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: slow-start-app
spec:
  containers:
  - name: app
    image: my-app:latest
    ports:
    - containerPort: 8080
    startupProbe:
      httpGet:
        path: /health/started
        port: 8080
      failureThreshold: 60
      periodSeconds: 5
    livenessProbe:
      httpGet:
        path: /health/live
        port: 8080
      initialDelaySeconds: 60
      periodSeconds: 10
    readinessProbe:
      httpGet:
        path: /health/ready
        port: 8080
      initialDelaySeconds: 10
      periodSeconds: 5
```

### Pattern 4: HTTP Health Endpoint with Structured Response

Create a standardized health endpoint that returns comprehensive status information. Use `curl` for testing and YAML for configuration.

```bash
# ❌ BAD — simple health check without structured response
curl -s http://localhost:8080/health | jq .
# Returns: {"status": "ok"}  — no dependency details

# ✅ GOOD — comprehensive health check with all dependency checks
# Test liveness endpoint
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health/live

# Test readiness endpoint with full JSON response
curl -s http://localhost:8080/health/ready | jq .

# Test comprehensive health endpoint
curl -s http://localhost:8080/health | jq '
  .status,
  (.checks | keys),
  .timestamp
'

# Verify response structure contains all expected fields
curl -s http://localhost:8080/health | jq '
  if .status == "healthy" and (.checks | has("database")) and (.checks | has("redis"))
  then "✅ Health check structure valid"
  else "❌ Health check structure invalid"
  end
'

# Example structured response from healthy endpoint:
# {
#   "status": "healthy",
#   "checks": {
#     "database": { "status": "healthy", "latency_ms": 15 },
#     "redis": { "status": "healthy", "latency_ms": 5 }
#   },
#   "timestamp": "2025-01-15T10:30:00Z"
# }
```

### Pattern 5: Database Health Checks with Connection Pool Metrics

Monitor database health with connection pool statistics for proactive issue detection. Use CLI tools for database health checks.

```bash
# ❌ BAD — basic database health check without metrics
pg_isready -h localhost -U app -d app
# Returns only: "localhost:5432 - accepting connections"

# ✅ GOOD — comprehensive database health check with metrics using psql
# Single query to check database connectivity with timing
psql -h localhost -U app -d app -c "
  SELECT 
    current_timestamp as check_time,
    pg_postmasters() AS pid,
    pg_conf_load_time() AS config_reload_time
  \\gset
"

# Check PostgreSQL connection pool metrics
psql -h localhost -U app -d app -c "
  SELECT 
    count(*) AS total_connections,
    count(*) FILTER (WHERE state = 'active') AS active_connections,
    count(*) FILTER (WHERE state = 'idle') AS idle_connections,
    count(*) FILTER (WHERE state = 'idle in transaction') AS idle_in_transaction,
    max(state_change) AS last_state_change
  FROM pg_stat_activity
  WHERE datname = 'app';
"

# Check connection pool saturation (returns 1 if >80% utilized)
psql -h localhost -U app -d app -c "
  SELECT 
    CASE 
      WHEN max_connections > 0 THEN 
        round(count(*)::numeric / max_connections * 100, 1)
      ELSE 0 
    END AS utilization_pct
  FROM pg_stat_activity;
  SELECT CASE WHEN count(*) * 100 / (SELECT setting FROM pg_settings WHERE name = 'max_connections') > 80 
    THEN '⚠️ POOL SATURATED' ELSE '✅ Pool healthy' END AS pool_status
  FROM pg_stat_activity;
"

# Check database replication lag (for read replicas)
psql -h localhost -U app -d app -c "
  SELECT 
    client_addr,
    state,
    sent_lsn,
    write_lsn,
    flush_lsn,
    replay_lsn,
    pg_wal_lsn_diff(sent_lsn, replay_lsn) AS replication_lag_bytes
  FROM pg_stat_replication;
"

# Check for long-running queries (>30s)
psql -h localhost -U app -d app -c "
  SELECT pid, now() - pg_stat_activity.query_start AS duration, query
  FROM pg_stat_activity
  WHERE (now() - pg_stat_activity.query_start) > interval '30 seconds'
    AND state != 'idle'
  ORDER BY duration DESC;
"
```

```yaml
# ✅ GOOD — Prometheus export of database metrics for monitoring
# Add to application /metrics endpoint or use pg_exporter
# Metrics exposed:
# pg_stat_activity_count{datname="app"}
# pg_stat_activity_max_tx_duration{datname="app"}
# pg_up{instance="localhost:5432"}

# Grafana query for database connection pool monitoring:
# avg(rate(pg_stat_activity_count{datname="app"}[5m])) by (state)
# max(pg_settings_max_connections{instance="localhost:5432"})
```

### Pattern 6: External Service Health Checks with Circuit Breaker

Implement circuit breaker patterns for external service dependencies to prevent cascading failures. Use CLI-based health checking with retry and backoff logic.

```bash
# ❌ BAD — no circuit breaker, repeated failures overwhelm external service
curl -s https://api.example.com/data

# ✅ GOOD — health check with circuit breaker pattern via curl + shell state
#!/bin/bash
# circuit_breaker_check.sh — Circuit breaker for external service health checks

API_URL="https://api.example.com"
CIRCUIT_BREAKER_STATE_FILE="/tmp/circuit_breaker_state.json"
FAILURE_THRESHOLD=5
RECOVERY_TIMEOUT=30
MAX_RETRIES=3
BASE_DELAY=1

# Initialize circuit breaker state file if it doesn't exist
init_state() {
    if [[ ! -f "$CIRCUIT_BREAKER_STATE_FILE" ]]; then
        echo '{"state":"closed","failure_count":0,"last_failure":0}' > "$CIRCUIT_BREAKER_STATE_FILE"
    fi
}

# Read current circuit breaker state
get_state() {
    jq -r '.state' "$CIRCUIT_BREAKER_STATE_FILE"
}

# Check if request is allowed based on circuit state
is_allowed() {
    local state
    state=$(get_state)
    
    case "$state" in
        closed)
            return 0  # Allow
            ;;
        open)
            local last_failure
            last_failure=$(jq -r '.last_failure' "$CIRCUIT_BREAKER_STATE_FILE")
            local now
            now=$(date +%s)
            local elapsed=$((now - last_failure))
            
            if (( elapsed >= RECOVERY_TIMEOUT )); then
                # Transition to half-open
                echo '{"state":"half_open","failure_count":0,"last_failure":0}' > "$CIRCUIT_BREAKER_STATE_FILE"
                return 0
            fi
            echo "❌ Circuit breaker OPEN — rejecting request"
            return 1
            ;;
        half_open)
            return 0  # Allow limited requests to test recovery
            ;;
    esac
}

# Record success
record_success() {
    local current_state
    current_state=$(get_state)
    
    if [[ "$current_state" == "half_open" ]]; then
        # Successfully recovered — close circuit
        echo '{"state":"closed","failure_count":0,"last_failure":0}' > "$CIRCUIT_BREAKER_STATE_FILE"
        echo "✅ Circuit breaker CLOSED — service recovered"
    else
        # Reset failure count
        local current
        current=$(cat "$CIRCUIT_BREAKER_STATE_FILE")
        echo "$current" | jq '.failure_count = 0' > "$CIRCUIT_BREAKER_STATE_FILE"
    fi
}

# Record failure
record_failure() {
    local current
    current=$(cat "$CIRCUIT_BREAKER_STATE_FILE")
    local failure_count
    failure_count=$(echo "$current" | jq '.failure_count')
    failure_count=$((failure_count + 1))
    local now
    now=$(date +%s)
    
    # Update state
    echo "{\"state\":\"$current_state\",\"failure_count\":${failure_count},\"last_failure\":${now}}" > "$CIRCUIT_BREAKER_STATE_FILE"
    
    if [[ "$current_state" == "closed" ]] && (( failure_count >= FAILURE_THRESHOLD )); then
        echo '{"state":"open","failure_count":'"${failure_count}"',"last_failure":'"${now}"'}' > "$CIRCUIT_BREAKER_STATE_FILE"
        echo "❌ Circuit breaker OPEN — failure threshold reached (${failure_count}/${FAILURE_THRESHOLD})"
    fi
}

# Check external service with circuit breaker protection
check_service() {
    local attempt=0
    
    # Check circuit breaker state
    if ! is_allowed; then
        return 1
    fi
    
    while (( attempt < MAX_RETRIES )); do
        local http_code
        http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${API_URL}/data" 2>/dev/null || echo "000")
        
        if [[ "$http_code" -ge 200 && "$http_code" -lt 500 ]]; then
            record_success
            echo "✅ Service healthy (HTTP ${http_code})"
            return 0
        fi
        
        record_failure
        echo "⚠️ Service check failed (HTTP ${http_code}), attempt $((attempt + 1))/${MAX_RETRIES}"
        
        # Exponential backoff with jitter
        local delay=$((BASE_DELAY * (2 ** attempt)))
        local jitter=$((RANDOM % 100))
        sleep "${delay}.${jitter}"
        
        ((attempt++))
    done
    
    return 1
}

# Main
init_state
check_service
```

### Pattern 7: Health Check Testing with Docker Compose

Create comprehensive health check tests that validate all endpoints and dependencies.

```bash
# ❌ BAD — basic health check test without dependency validation
curl -f http://localhost:8080/health || exit 1

# ✅ GOOD — comprehensive health check test suite
#!/bin/bash
set -e

HEALTH_ENDPOINT="http://localhost:8080"
EXPECTED_RESPONSE_CODE=200

echo "=== Health Check Test Suite ==="

# Test 1: Basic health endpoint responds
echo "Test 1: Basic health endpoint"
RESPONSE=$(curl -s -w "\n%{http_code}" "$HEALTH_ENDPOINT/health")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
    echo "FAIL: Expected HTTP 200, got $HTTP_CODE"
    echo "Body: $BODY"
    exit 1
fi
echo "PASS: Health endpoint returns 200"

# Test 2: Liveness endpoint responds
echo "Test 2: Liveness endpoint"
LIVENESS_RESPONSE=$(curl -s -w "\n%{http_code}" "$HEALTH_ENDPOINT/health/live")
LIVENESS_CODE=$(echo "$LIVENESS_RESPONSE" | tail -1)

if [ "$LIVENESS_CODE" != "200" ]; then
    echo "FAIL: Liveness endpoint returned $LIVENESS_CODE"
    exit 1
fi
echo "PASS: Liveness endpoint returns 200"

# Test 3: Readiness endpoint responds
echo "Test 3: Readiness endpoint"
READINESS_RESPONSE=$(curl -s -w "\n%{http_code}" "$HEALTH_ENDPOINT/health/ready")
READINESS_CODE=$(echo "$READINESS_RESPONSE" | tail -1)

if [ "$READINESS_CODE" != "200" ]; then
    echo "FAIL: Readiness endpoint returned $READINESS_CODE"
    exit 1
fi
echo "PASS: Readiness endpoint returns 200"

# Test 4: JSON response structure validation
echo "Test 4: JSON response structure"
if ! echo "$BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); assert 'status' in d" 2>/dev/null; then
    echo "FAIL: Missing 'status' field in response"
    exit 1
fi
echo "PASS: JSON structure valid"

# Test 5: Health endpoint with database dependency
echo "Test 5: Database dependency check"
if ! echo "$BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); assert 'checks' in d and 'database' in d['checks']" 2>/dev/null; then
    echo "FAIL: Database check not included in response"
    exit 1
fi
echo "PASS: Database check included"

echo "=== All Tests Passed ==="
```

### Pattern 8: Kubernetes Health Check Debugging Commands

Debugging health check issues with kubectl commands and log analysis.

### Pattern 9: Health Check with livenessProbe/readinessProbe Using kubectl

Using `kubectl` and shell scripts for Kubernetes-native health monitoring.

```bash
# ✅ GOOD — Comprehensive health check using kubectl probe simulation
#!/bin/bash
# k8s_health_check.sh — Health checks matching Kubernetes probe behavior

NAMESPACE="${NAMESPACE:-default}"
POD_NAME="${POD_NAME:-my-app}"

# Simulate liveness probe (exec command check)
check_liveness() {
    echo "=== Liveness Probe (exec) ==="
    
    # Execute command inside container
    kubectl exec -n "$NAMESPACE" "$POD_NAME" -- /bin/sh -c "
        if python -c 'import socket; s=socket.socket(); s.settimeout(2); s.connect((\"localhost\", 8080)); s.close()' 2>/dev/null; then
            echo 'LIVE: Application socket responding'
            exit 0
        else
            echo 'LIVE: Application socket NOT responding'
            exit 1
        fi
    " 2>&1
}

# Simulate readiness probe (HTTP GET check)
check_readiness() {
    echo "=== Readiness Probe (HTTP GET) ==="
    
    # Get pod IP and check readiness endpoint
    POD_IP=$(kubectl get pod -n "$NAMESPACE" "$POD_NAME" -o jsonpath='{.status.podIP}')
    
    curl -sf --max-time 3 "http://${POD_IP}:8080/health/ready" 2>/dev/null
    local exit_code=$?
    
    if [[ $exit_code -eq 0 ]]; then
        echo "READY: Readiness endpoint responding"
        curl -s "http://${POD_IP}:8080/health/ready" | jq '.'
    else
        echo "NOT READY: Readiness endpoint failed (exit code: ${exit_code})"
    fi
}

# Simulate startup probe (extended readiness check)
check_startup() {
    echo "=== Startup Probe ==="
    
    local max_attempts=30
    local attempt=1
    
    while (( attempt <= max_attempts )); do
        if curl -sf --max-time 3 "http://${POD_IP}:8080/health/started" 2>/dev/null; then
            echo "STARTED: Application fully initialized after $((attempt * 5))s"
            return 0
        fi
        echo "  Attempt ${attempt}/${max_attempts} — not yet ready..."
        sleep 5
        ((attempt++))
    done
    
    echo "FAILED: Application failed to start within ${max_attempts} attempts"
    return 1
}

# Run all checks
check_liveness
check_readiness
check_startup
```

```yaml
# ✅ GOOD — Kubernetes probe configuration matching health check patterns
apiVersion: v1
kind: Pod
metadata:
  name: app
  namespace: default
spec:
  containers:
  - name: app
    image: my-app:latest
    ports:
    - containerPort: 8080
    # Liveness: quick check, restart if stuck
    livenessProbe:
      httpGet:
        path: /health/live
        port: 8080
      initialDelaySeconds: 15
      periodSeconds: 20
      timeoutSeconds: 5
      failureThreshold: 3
    # Readiness: full dependency check, remove from service if failing
    readinessProbe:
      httpGet:
        path: /health/ready
        port: 8080
      initialDelaySeconds: 10
      periodSeconds: 5
      timeoutSeconds: 3
      failureThreshold: 3
    # Startup: generous timeout for slow initialization
    startupProbe:
      httpGet:
        path: /health/started
        port: 8080
      failureThreshold: 30
      periodSeconds: 5
```

### Pattern 10: Go Health Check with net/http

Go implementation of health checks using standard library.

```go
// ✅ GOOD — Go health check implementation
package main

import (
    "context"
    "encoding/json"
    "log"
    "net/http"
    "os"
    "time"
    
    "github.com/go-redis/redis/v8"
)

type HealthStatus struct {
    Status     string            `json:"status"`
    Checks     map[string]Check  `json:"checks"`
    Timestamp  string            `json:"timestamp"`
}

type Check struct {
    Status  string `json:"status"`
    Error   string `json:"error,omitempty"`
    Latency string `json:"latency,omitempty"`
}

func checkDatabase(ctx context.Context) Check {
    start := time.Now()
    // Database connection logic here
    duration := time.Since(start)
    
    return Check{
        Status:  "healthy",
        Latency: duration.String(),
    }
}

func checkRedis(ctx context.Context, client *redis.Client) Check {
    start := time.Now()
    err := client.Ping(ctx).Err()
    duration := time.Since(start)
    
    if err != nil {
        return Check{
            Status: "unhealthy",
            Error:  err.Error(),
        }
    }
    
    return Check{
        Status:  "healthy",
        Latency: duration.String(),
    }
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
    ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
    defer cancel()
    
    checks := make(map[string]Check)
    
    // Run checks
    checks["database"] = checkDatabase(ctx)
    
    redisClient := redis.NewClient(&redis.Options{
        Addr: "localhost:6379",
    })
    checks["redis"] = checkRedis(ctx, redisClient)
    
    // Determine overall status
    status := "healthy"
    for _, check := range checks {
        if check.Status != "healthy" {
            status = "unhealthy"
            break
        }
    }
    
    if status != "healthy" {
        w.WriteHeader(http.StatusServiceUnavailable)
    }
    
    response := HealthStatus{
        Status:    status,
        Checks:    checks,
        Timestamp: time.Now().UTC().Format(time.RFC3339),
    }
    
    json.NewEncoder(w).Encode(response)
}

func main() {
    http.HandleFunc("/health", healthHandler)
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

### Pattern 11: Node.js Health Check with Express

Node.js implementation with Express framework.

```javascript
// ✅ GOOD — Node.js Express health check
const express = require('express');
const { Pool } = require('pg');
const redis = require('redis');
const app = express();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'app',
    user: process.env.DB_USER || 'app',
    password: process.env.DB_PASSWORD || 'secret',
    connectionTimeoutMillis: 3000
});

const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: { timeout: 3000 }
});

async function checkDatabase() {
    try {
        const start = Date.now();
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        const latency = Date.now() - start;
        
        return { status: 'healthy', latency_ms: latency };
    } catch (error) {
        return { status: 'unhealthy', error: error.message };
    }
}

async function checkRedis() {
    try {
        const start = Date.now();
        await redisClient.ping();
        const latency = Date.now() - start;
        
        return { status: 'healthy', latency_ms: latency };
    } catch (error) {
        return { status: 'unhealthy', error: error.message };
    }
}

app.get('/health', async (req, res) => {
    const checks = {};
    
    try {
        const [dbResult, redisResult] = await Promise.all([
            checkDatabase(),
            checkRedis()
        ]);
        
        checks.database = dbResult;
        checks.redis = redisResult;
        
        const allHealthy = Object.values(checks).every(c => c.status === 'healthy');
        
        res.status(allHealthy ? 200 : 503).json({
            status: allHealthy ? 'healthy' : 'degraded',
            checks,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            checks,
            error: error.message
        });
    }
});

// Separate liveness endpoint
app.get('/health/live', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Separate readiness endpoint
app.get('/health/ready', async (req, res) => {
    try {
        const results = await Promise.all([
            checkDatabase(),
            checkRedis()
        ]);
        
        const allHealthy = results.every(r => r.status === 'healthy');
        res.status(allHealthy ? 200 : 503).json({
            status: allHealthy ? 'healthy' : 'unhealthy',
            checks: { database: results[0], redis: results[1] }
        });
    } catch (error) {
        res.status(503).json({ status: 'unhealthy', error: error.message });
    }
});

app.listen(8080, () => {
    console.log('Health check server running on port 8080');
});
```

### Pattern 12: Java Spring Boot Health Check

Spring Boot implementation with Actuator.

```java
// ✅ GOOD — Spring Boot Actuator health check
package com.example.health;

import org.springframework.boot.actuate.health.*;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;

@Component
public class CustomHealthIndicator implements HealthIndicator {
    
    @Autowired
    private DataSource dataSource;
    
    @Autowired
    private RedisTemplate<String, Object> redisTemplate;
    
    @Override
    public Health health() {
        Map<String, Object> details = new HashMap<>();
        
        Health databaseHealth = checkDatabase(details);
        Health redisHealth = checkRedis(details);
        
        Health.Builder builder = Health.status(databaseHealth.getStatus().getCode());
        if (databaseHealth.getStatus() != Status.UP || redisHealth.getStatus() != Status.UP) {
            builder = Health.down();
        }
        
        return builder
            .withDetails(details)
            .withDetail("timestamp", System.currentTimeMillis())
            .build();
    }
    
    private Health checkDatabase(Map<String, Object> details) {
        try {
            long start = System.currentTimeMillis();
            try (Connection conn = dataSource.getConnection()) {
                if (conn.isValid(3)) {
                    long latency = System.currentTimeMillis() - start;
                    details.put("database", Map.of(
                        "status", "healthy",
                        "latency_ms", latency
                    ));
                    return Health.up().build();
                }
            }
        } catch (SQLException e) {
            details.put("database", Map.of(
                "status", "unhealthy",
                "error", e.getMessage()
            ));
            return Health.down(e).build();
        }
        
        details.put("database", Map.of("status", "unhealthy", "error", "Connection invalid"));
        return Health.down().withDetail("error", "Database connection invalid").build();
    }
    
    private Health checkRedis(Map<String, Object> details) {
        try {
            long start = System.currentTimeMillis();
            String ping = redisTemplate.execute(RedisConnection::ping);
            long latency = System.currentTimeMillis() - start;
            
            if ("PONG".equals(ping)) {
                details.put("redis", Map.of(
                    "status", "healthy",
                    "latency_ms", latency
                ));
                return Health.up().build();
            }
        } catch (Exception e) {
            details.put("redis", Map.of(
                "status", "unhealthy",
                "error", e.getMessage()
            ));
            return Health.down(e).build();
        }
        
        details.put("redis", Map.of("status", "unhealthy", "error", "Redis ping failed"));
        return Health.down().withDetail("error", "Redis ping failed").build();
    }
}
```

### Pattern 13: Health Check Metrics with Prometheus

Exporting health check metrics for monitoring. Use `promtool` and Prometheus queries for metric validation.

```bash
# ✅ GOOD — Health check metrics via Prometheus query interface
# Query database health check duration
curl -s "http://prometheus:9090/api/v1/query" \
  --data-urlencode 'query=health_check_duration_seconds{check_name="database"}' | jq '.data.result[] | {metric, value}'

# Query unhealthy health check count
curl -s "http://prometheus:9090/api/v1/query" \
  --data-urlencode 'query=health_check_total{status="unhealthy"}' | jq '.data.result[] | {metric, value}'

# Check live health gauge (1 = healthy, 0 = unhealthy)
curl -s "http://prometheus:9090/api/v1/query" \
  --data-urlencode 'query=health_check_live' | jq '.data.result[]'

# Alert rule for unhealthy checks (Prometheus rule file)
cat << 'EOF' > /etc/prometheus/rules/health_alerts.yaml
groups:
  - name: health-check-alerts
    rules:
      - alert: HealthCheckUnhealthy
        expr: health_check_total{status="unhealthy"} > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Health check failing for {{ $labels.check_name }}"
          description: "Check {{ $labels.check_name }} has been unhealthy for >5 minutes"
EOF

# Validate alert rules with promtool
promtool check rules /etc/prometheus/rules/health_alerts.yaml

# Check metrics endpoint directly from the application
curl -s http://localhost:9090/metrics | grep "health_check_" | head -20
```

```yaml
# ✅ GOOD — Prometheus scrape configuration for health checks
# prometheus-scrape-config.yaml
- job_name: 'health-checks'
  metrics_path: '/metrics'
  scrape_interval: 15s
  scrape_timeout: 5s
  static_configs:
    - targets: ['app:9090']
      labels:
        environment: 'production'
```

### Pattern 14: Health Check with Retry Logic

Implementing retry logic with exponential backoff and jitter for transient failures.

```bash
# ✅ GOOD — Health check with exponential backoff retry in bash
#!/bin/bash
# health_check_retry.sh — Retry logic with exponential backoff

HEALTH_ENDPOINT="http://localhost:8080/health"
MAX_RETRIES=3
BASE_DELAY=1    # seconds
MAX_DELAY=10    # seconds

check_with_retry() {
    local endpoint=$1
    local attempt=0
    
    while (( attempt < MAX_RETRIES )); do
        local http_code
        http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$endpoint" 2>/dev/null || echo "000")
        
        if [[ "$http_code" -ge 200 && "$http_code" -lt 400 ]]; then
            echo "✅ Health check passed (HTTP ${http_code}) after ${attempt} retry attempt(s)"
            return 0
        fi
        
        echo "⚠️ Health check failed (HTTP ${http_code}), attempt $((attempt + 1))/${MAX_RETRIES}"
        
        ((attempt++))
        
        if (( attempt < MAX_RETRIES )); then
            # Exponential backoff with jitter
            local delay=$((BASE_DELAY * (2 ** (attempt - 1))))
            # Cap at max_delay
            if (( delay > MAX_DELAY )); then
                delay=$MAX_DELAY
            fi
            # Add jitter (0 to delay/10)
            local jitter=$((RANDOM % (delay / 10 + 1)))
            local total_delay=$((delay + jitter))
            
            echo "  Backing off for ${total_delay}s before retry..."
            sleep "$total_delay"
        fi
    done
    
    echo "❌ Health check failed after ${MAX_RETRIES} attempts"
    return 1
}

# Check multiple endpoints with independent retry
check_with_retry "$HEALTH_ENDPOINT/health/live"
check_with_retry "$HEALTH_ENDPOINT/health/ready"
check_with_retry "$HEALTH_ENDPOINT/health"
```

```bash
# ✅ GOOD — Retry logic using the `retry` utility (GNU coreutils)
# Simple retry with fixed delay
retry --delay 2 --attempts 5 curl -sf http://localhost:8080/health || echo "Failed"

# Retry with exponential backoff using wait (macOS/BSD)
# or sleep with exponential calculation (Linux)
for i in $(seq 1 5); do
    if curl -sf http://localhost:8080/health > /dev/null 2>&1; then
        echo "✅ Service healthy on attempt $i"
        exit 0
    fi
    echo "⚠️ Attempt $i failed, retrying..."
    sleep $((2 ** i))
done
echo "❌ All retries exhausted"
```

### Pattern 15: Health Check in Docker Container

Docker container health check configuration.

```dockerfile
# ✅ GOOD — Docker health check configuration
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY app.py .

# Health check with curl
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health/live || exit 1

EXPOSE 8080

CMD ["python", "app.py"]
```

```yaml
# Alternative: Docker Compose health check
version: '3.8'

services:
  app:
    image: my-app:latest
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    ports:
      - "8080:8080"
  
  db:
    image: postgres:15
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    environment:
      POSTGRES_PASSWORD: secret
```

### Pattern 16: Health Check with Graceful Degradation

Implementing graceful degradation for non-critical dependencies using classification tiers.

```bash
# ✅ GOOD — Health check with dependency tier classification
#!/bin/bash
# graceful_degradation_check.sh — Tiered health checks

declare -A DEPENDENCY_TIERS
DEPENDENCY_TIERS[database]="critical"
DEPENDENCY_TIERS[cache]="optional"
DEPENDENCY_TIERS[metrics]="non_critical"
DEPENDENCY_TIERS[external_api]="non_critical"

declare -A CHECK_RESULTS

check_database() {
    if curl -sf --max-time 3 http://localhost:8080/db/ping > /dev/null 2>&1; then
        CHECK_RESULTS[database]="healthy"
    else
        CHECK_RESULTS[database]="unhealthy"
    fi
}

check_cache() {
    if redis-cli -h localhost ping 2>/dev/null | grep -q PONG; then
        CHECK_RESULTS[cache]="healthy"
    else
        CHECK_RESULTS[cache]="unhealthy"
    fi
}

check_metrics() {
    if curl -sf --max-time 3 http://localhost:9090/metrics > /dev/null 2>&1; then
        CHECK_RESULTS[metrics]="healthy"
    else
        CHECK_RESULTS[metrics]="unhealthy"
    fi
}

check_external_api() {
    if curl -sf --max-time 3 https://api.example.com/status > /dev/null 2>&1; then
        CHECK_RESULTS[external_api]="healthy"
    else
        CHECK_RESULTS[external_api]="unhealthy"
    fi
}

# Run all checks
check_database
check_cache
check_metrics
check_external_api

# Determine overall status with graceful degradation
has_critical_failure=false
has_optional_failure=false

for check_name in "${!CHECK_RESULTS[@]}"; do
    tier="${DEPENDENCY_TIERS[$check_name]}"
    result="${CHECK_RESULTS[$check_name]}"
    
    if [[ "$result" == "unhealthy" ]]; then
        echo "⚠️ $check_name ($tier): unhealthy"
        if [[ "$tier" == "critical" ]]; then
            has_critical_failure=true
        elif [[ "$tier" == "optional" ]]; then
            has_optional_failure=true
        fi
    else
        echo "✅ $check_name ($tier): healthy"
    fi
done

# Determine HTTP response code
if $has_critical_failure; then
    HTTP_STATUS=503
    OVERALL="unhealthy"
elif $has_optional_failure; then
    HTTP_STATUS=200  # Still serving, but degraded
    OVERALL="degraded"
else
    HTTP_STATUS=200
    OVERALL="healthy"
fi

echo ""
echo "=== Overall Status: $OVERALL (HTTP $HTTP_STATUS) ==="
echo "Critical failures: $has_critical_failure"
echo "Optional failures: $has_optional_failure"
```

```yaml
# ✅ GOOD — Kubernetes annotations for graceful degradation
# Service configuration with health check awareness
apiVersion: v1
kind: Service
metadata:
  name: my-app
  annotations:
    # Health check classification for service mesh
    healthcheck.tier: "critical"
    healthcheck.graceful-degradation: "true"
    # Service mesh will route around degraded pods
    sidecar.istio.io/inject: "true"
spec:
  selector:
    app: my-app
  ports:
  - port: 80
    targetPort: 8080
```

### Pattern 17: Health Check with Rate Limiting

Implementing rate limiting on health check endpoints.

```bash
# ✅ GOOD — Rate limiting with curl and NGINX configuration
# NGINX rate limiting for health endpoints
cat << 'EOF' > /etc/nginx/conf.d/health-rate-limit.conf
limit_req_zone $binary_remote_addr zone:health_limit:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone:liveness_limit:10m rate=100r/m;
limit_req_zone $binary_remote_addr zone:ready_limit:10m rate=30r/m;
limit_req_zone $binary_remote_addr zone:metrics_limit:10m rate=5r/m;

server {
    location /health { limit_req zone=health_limit burst=5 nodelay; proxy_pass http://app:8080/health; }
    location /health/live { limit_req zone=liveness_limit burst=20 nodelay; proxy_pass http://app:8080/health/live; }
    location /health/ready { limit_req zone=ready_limit burst=10 nodelay; proxy_pass http://app:8080/health/ready; }
    location /health/metrics { limit_req zone=metrics_limit burst=2 nodelay; proxy_pass http://app:8080/health/metrics; }
}
EOF
nginx -t && nginx -s reload

# ✅ GOOD — Test rate limiting with curl
for i in $(seq 1 15); do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health)
    echo "Request $i: HTTP $HTTP_CODE"
    [[ "$HTTP_CODE" == "429" ]] && { echo "Rate limited"; break; }
done
```

### Pattern 18: Health Check with Cache

Caching health check results to reduce load on dependencies. Use Redis/TTL or file-based caching.

```bash
# ✅ GOOD — Health check with TTL-based caching
#!/bin/bash
# cached_health_check.sh — Health checks with result caching

CACHE_DIR="/tmp/health-check-cache"
CACHE_TTL=5  # seconds
HEALTH_ENDPOINT="http://localhost:8080/health"

# Initialize cache directory
mkdir -p "$CACHE_DIR"

# Check if cached result is still valid
is_cache_valid() {
    local check_name=$1
    local cache_file="${CACHE_DIR}/${check_name}"
    
    if [[ -f "$cache_file" ]]; then
        local cache_time
        cache_time=$(stat -c %Y "$cache_file" 2>/dev/null || stat -f %m "$cache_file" 2>/dev/null)
        local now
        now=$(date +%s)
        local age=$((now - cache_time))
        
        if (( age < CACHE_TTL )); then
            return 0  # Cache valid
        fi
    fi
    return 1  # Cache expired or missing
}

# Get cached result
get_cached_result() {
    local check_name=$1
    local cache_file="${CACHE_DIR}/${check_name}"
    
    if is_cache_valid "$check_name"; then
        cat "$cache_file"
        return 0
    fi
    return 1
}

# Save result to cache
save_to_cache() {
    local check_name=$1
    local result=$2
    local cache_file="${CACHE_DIR}/${check_name}"
    
    echo "$result" > "$cache_file"
}

# Perform health check with caching
check_health() {
    local check_name=$1
    
    # Try cached result first
    if cached_result=$(get_cached_result "$check_name"); then
        echo "✅ Cached result ($check_name): $cached_result"
        return 0
    fi
    
    # Perform fresh check
    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$HEALTH_ENDPOINT" 2>/dev/null || echo "000")
    
    local result
    if [[ "$http_code" -ge 200 && "$http_code" -lt 400 ]]; then
        result="healthy"
        echo "✅ Fresh check ($check_name): healthy (HTTP ${http_code})"
    else
        result="unhealthy"
        echo "❌ Fresh check ($check_name): unhealthy (HTTP ${http_code})"
    fi
    
    # Save to cache
    save_to_cache "$check_name" "$result"
}

# Run checks
check_health "database"
check_health "cache"
check_health "external_api"
```

```yaml
# ✅ GOOD — Redis-based health check cache configuration
# Cache health check results in Redis for distributed systems
apiVersion: v1
kind: ConfigMap
metadata:
  name: health-check-cache-config
data:
  # TTL for health check cache in seconds
  cache_ttl: "5"
  # Redis connection info
  redis_host: "redis-master"
  redis_port: "6379"
  # Cache key pattern: health:{service}:{check_name}
  cache_key_pattern: "health:{service}:{check_name}"
```

### Pattern 19: Health Check with Circuit Breaker States

Visualizing circuit breaker states using `curl` and shell scripts.

```bash
# ✅ GOOD — Circuit breaker state visualization via curl
# Query health endpoint for circuit breaker states
curl -s http://localhost:8080/health | jq '
  .checks | to_entries[] | {
    name: .key,
    status: .value.status,
    circuit_state: .value.circuit_state,
    failure_count: .value.failure_count,
    allowing: .value.allowing_requests
  }
'

# Example response with circuit breaker states:
# [
#   {
#     "name": "database",
#     "status": "circuit_open",
#     "circuit_state": "open",
#     "failure_count": 5,
#     "allowing": false
#   },
#   {
#     "name": "redis",
#     "status": "healthy",
#     "circuit_state": "closed",
#     "failure_count": 0,
#     "allowing": true
#   }
# ]

# ✅ GOOD — Shell-based circuit breaker state management
#!/bin/bash
# cb_state_manager.sh — Manage circuit breaker states with files

CB_DIR="/tmp/circuit-breakers"
mkdir -p "$CB_DIR"

# Initialize circuit breakers
init_cb() {
    local name=$1
    local threshold=${2:-5}
    local timeout=${3:-30}
    
    echo "{\"name\":\"$name\",\"state\":\"closed\",\"failures\":0,\"threshold\":$threshold,\"timeout\":$timeout,\"last_failure\":0}" > "${CB_DIR}/${name}.json"
}

# Check and update circuit breaker state
check_cb() {
    local name=$1
    local cb_file="${CB_DIR}/${name}.json"
    
    if [[ ! -f "$cb_file" ]]; then
        echo "ERROR: Circuit breaker $name not initialized"
        return 1
    fi
    
    local state
    state=$(jq -r '.state' "$cb_file")
    
    case "$state" in
        closed)
            echo "🟢 $name: CLOSED (normal operation)"
            return 0
            ;;
        open)
            local last_failure
            last_failure=$(jq -r '.last_failure' "$cb_file")
            local now
            now=$(date +%s)
            local elapsed=$((now - last_failure))
            local timeout
            timeout=$(jq -r '.timeout' "$cb_file")
            
            if (( elapsed >= timeout )); then
                # Transition to half-open
                jq '.state = "half_open"' "$cb_file" > "${cb_file}.tmp" && mv "${cb_file}.tmp" "$cb_file"
                echo "🟡 $name: HALF_OPEN (testing recovery, ${elapsed}s / ${timeout}s elapsed)"
                return 0
            else
                echo "🔴 $name: OPEN (tripped, ${elapsed}s / ${timeout}s elapsed)"
                return 1
            fi
            ;;
        half_open)
            echo "🟡 $name: HALF_OPEN (testing recovery)"
            return 0
            ;;
    esac
}

# Record success or failure
record_cb_result() {
    local name=$1
    local result=$2  # "success" or "failure"
    local cb_file="${CB_DIR}/${name}.json"
    
    case "$result" in
        success)
            if [[ "$(jq -r '.state' "$cb_file")" == "half_open" ]]; then
                # Recovered — close circuit
                jq '.state = "closed" | .failures = 0 | .last_failure = 0' "$cb_file" > "${cb_file}.tmp" && mv "${cb_file}.tmp" "$cb_file"
                echo "✅ $name recovered — circuit CLOSED"
            else
                jq '.failures = 0' "$cb_file" > "${cb_file}.tmp" && mv "${cb_file}.tmp" "$cb_file"
            fi
            ;;
        failure)
            local failures
            failures=$(jq -r '.failures' "$cb_file")
            failures=$((failures + 1))
            local now
            now=$(date +%s)
            
            if [[ "$(jq -r '.state' "$cb_file")" == "half_open" ]]; then
                jq ".state = \"open\" | .last_failure = $now" "$cb_file" > "${cb_file}.tmp" && mv "${cb_file}.tmp" "$cb_file"
                echo "❌ $name failed during half-open test — circuit OPEN"
            elif (( failures >= $(jq -r '.threshold' "$cb_file") )); then
                jq ".failures = $failures | .state = \"open\" | .last_failure = $now" "$cb_file" > "${cb_file}.tmp" && mv "${cb_file}.tmp" "$cb_file"
                echo "❌ $name threshold reached ($failures) — circuit OPEN"
            else
                jq ".failures = $failures | .last_failure = $now" "$cb_file" > "${cb_file}.tmp" && mv "${cb_file}.tmp" "$cb_file"
                echo "⚠️ $name failure $failures (threshold: $(jq -r '.threshold' "$cb_file"))"
            fi
            ;;
    esac
}

# Usage examples
init_cb "database" 5 30
init_cb "redis" 3 10

check_cb "database"
check_cb "redis"
```

### Pattern 20: Health Check with Dependency Graph

Visualizing dependency relationships in health check response.

```bash
# ✅ GOOD — Dependency graph visualization using curl and JSON
# Query dependency graph from health endpoint
curl -s http://localhost:8080/health/dependencies | jq '.dependencies | to_entries[] | {name: .key, status: .value.status, depends_on: .value.depends_on}'

# Example dependency graph response:
# {
#   "status": "healthy",
#   "dependencies": {
#     "postgresql": {"status": "healthy", "depends_on": []},
#     "database": {"status": "healthy", "depends_on": ["postgresql"]},
#     "memory_cache": {"status": "healthy", "depends_on": []},
#     "redis": {"status": "healthy", "depends_on": ["memory_cache"]},
#     "api_service": {"status": "healthy", "depends_on": ["database", "redis"]}
#   }
# }

# ✅ GOOD — Shell-based dependency graph traversal
#!/bin/bash
# dependency_graph_check.sh — Traverse dependency graph

declare -A DEPENDENCY_MAP
DEPENDENCY_MAP[postgresql]=""
DEPENDENCY_MAP[database]="postgresql"
DEPENDENCY_MAP[memory_cache]=""
DEPENDENCY_MAP[redis]="memory_cache"
DEPENDENCY_MAP[api_service]="database redis"

declare -A CHECK_RESULTS

# Check each dependency (leaf nodes first)
check_dependency() {
    local name=$1
    local deps="${DEPENDENCY_MAP[$name]}"
    
    # Check sub-dependencies first
    for dep in $deps; do
        if [[ "${CHECK_RESULTS[$dep]}" != "healthy" ]]; then
            CHECK_RESULTS[$name]="unhealthy"
            return
        fi
    done
    
    # Check this dependency
    case "$name" in
        postgresql)
            if pg_isready -h localhost -U app > /dev/null 2>&1; then
                CHECK_RESULTS[$name]="healthy"
            else
                CHECK_RESULTS[$name]="unhealthy"
            fi
            ;;
        memory_cache)
            if redis-cli ping > /dev/null 2>&1; then
                CHECK_RESULTS[$name]="healthy"
            else
                CHECK_RESULTS[$name]="unhealthy"
            fi
            ;;
        database)
            if curl -sf --max-time 3 http://localhost:8080/db/ping > /dev/null 2>&1; then
                CHECK_RESULTS[$name]="healthy"
            else
                CHECK_RESULTS[$name]="unhealthy"
            fi
            ;;
        redis)
            if redis-cli ping > /dev/null 2>&1; then
                CHECK_RESULTS[$name]="healthy"
            else
                CHECK_RESULTS[$name]="unhealthy"
            fi
            ;;
        api_service)
            if curl -sf --max-time 3 http://localhost:8080/health/live > /dev/null 2>&1; then
                CHECK_RESULTS[$name]="healthy"
            else
                CHECK_RESULTS[$name]="unhealthy"
            fi
            ;;
    esac
}

# Run all checks (leaf nodes first)
check_dependency "postgresql"
check_dependency "memory_cache"
check_dependency "database"
check_dependency "redis"
check_dependency "api_service"

# Print dependency graph status
echo "=== Dependency Graph ==="
for name in "${!CHECK_RESULTS[@]}"; do
    deps="${DEPENDENCY_MAP[$name]}"
    if [[ -n "$deps" ]]; then
        echo "$name (${CHECK_RESULTS[$name]}) -> depends on: $deps"
    else
        echo "$name (${CHECK_RESULTS[$name]}) -> [root]"
    fi
done
```

```yaml
# ✅ GOOD — Kubernetes service dependency annotations
apiVersion: v1
kind: Service
metadata:
  name: api-service
  annotations:
    healthcheck.dependencies: "database,redis"
    healthcheck.dependency-order: "database->postgresql, redis->memory_cache"
spec:
  selector:
    app: api-service
  ports:
  - port: 80
    targetPort: 8080
```

### Pattern 21: Health Check with SLA Metrics

Tracking health check SLA compliance using Prometheus queries and shell scripts.

```bash
# ✅ GOOD — SLA compliance checking with Prometheus
# Query p95 latency for health checks
curl -s "http://prometheus:9090/api/v1/query" \
  --data-urlencode 'query=histogram_quantile(0.95, rate(health_check_duration_seconds_bucket{check_name="database"}[5m]))' | \
  jq '.data.result[] | {check: .metric.check_name, p95_latency_ms: (.value[1] | tonumber * 1000)}'

# Query failure rate over 5-minute window
curl -s "http://prometheus:9090/api/v1/query" \
  --data-urlencode 'query=rate(health_check_total{status="unhealthy"}[5m]) / rate(health_check_total[5m])' | \
  jq '.data.result[] | {check: .metric.check_name, failure_rate: (.value[1] | tonumber * 100 | floor)}'

# Check SLA compliance status
cat << 'EOF' | curl -s -X POST "http://prometheus:9090/api/v1/query" -d @- --data-urlencode 'query=health_check_total{status="unhealthy"}' | jq '.data.result | length'
# Returns count of unhealthy checks — 0 = SLA compliant
EOF

# ✅ GOOD — SLA compliance report using shell script
#!/bin/bash
# sla_report.sh — Generate SLA compliance report

PROMETHEUS_URL="${PROMETHEUS_URL:-http://prometheus:9090}"
SLA_WINDOW="5m"
MAX_P95_LATENCY_MS=100
MAX_FAILURE_RATE=0.01

echo "=== SLA Compliance Report ==="
echo "Window: ${SLA_WINDOW}"
echo "Max p95 Latency: ${MAX_P95_LATENCY_MS}ms"
echo "Max Failure Rate: $(echo "$MAX_FAILURE_RATE * 100" | bc)%"
echo ""

# Get all health check metrics
metrics=$(curl -s "${PROMETHEUS_URL}/api/v1/query" \
  --data-urlencode "query=health_check_duration_seconds_count[${SLA_WINDOW}]")

# Check each check type
echo "$metrics" | jq -r '.data.result[] | .metric.check_name' | sort -u | while read check_name; do
    # Get p95 latency
    p95=$(curl -s "${PROMETHEUS_URL}/api/v1/query" \
      --data-urlencode "query=histogram_quantile(0.95, rate(health_check_duration_seconds_bucket{check_name=\"${check_name}\"}[$SLA_WINDOW]))" | \
      jq -r '.data.result[0].value[1] // "0"')
    
    # Get failure rate
    failure_rate=$(curl -s "${PROMETHEUS_URL}/api/v1/query" \
      --data-urlencode "query=rate(health_check_total{check_name=\"${check_name}\",status=\"unhealthy\"}[$SLA_WINDOW]) / rate(health_check_total{check_name=\"${check_name}\"}[$SLA_WINDOW])" | \
      jq -r '.data.result[0].value[1] // "0"')
    
    # Evaluate compliance
    p95_compliant=$(echo "$p95 * 1000 <= $MAX_P95_LATENCY_MS" | bc -l)
    failure_compliant=$(echo "$failure_rate <= $MAX_FAILURE_RATE" | bc -l)
    
    if [[ "$p95_compliant" -eq 1 && "$failure_compliant" -eq 1 ]]; then
        echo "✅ ${check_name}: COMPLIANT (p95: $(echo "$p95 * 1000" | bc)ms, failure_rate: $(echo "$failure_rate * 100" | bc)%)"
    else
        echo "❌ ${check_name}: NON-COMPLIANT"
        [[ "$p95_compliant" -ne 1 ]] && echo "  ⚠️ p95 latency: $(echo "$p95 * 1000" | bc)ms > ${MAX_P95_LATENCY_MS}ms"
        [[ "$failure_compliant" -ne 1 ]] && echo "  ⚠️ failure rate: $(echo "$failure_rate * 100" | bc)% > $(echo "$MAX_FAILURE_RATE * 100" | bc)%"
    fi
done

echo ""
echo "=== End of Report ==="
```

```yaml
# ✅ GOOD — Prometheus alerting rules for SLA violations
apiVersion: v1
kind: ConfigMap
metadata:
  name: sla-alerts
  namespace: monitoring
data:
  sla-rules.yaml: |
    groups:
      - name: sla-violations
        rules:
          - alert: HealthCheckP95LatencyHigh
            expr: histogram_quantile(0.95, rate(health_check_duration_seconds_bucket[5m])) > 0.1
            for: 5m
            labels:
              severity: warning
            annotations:
              summary: "Health check p95 latency above SLA"
          - alert: HealthCheckFailureRateHigh
            expr: rate(health_check_total{status="unhealthy"}[5m]) / rate(health_check_total[5m]) > 0.01
            for: 5m
            labels:
              severity: critical
            annotations:
              summary: "Health check failure rate above SLA"
```

### Pattern 22: Health Check with Tracing Integration

Integrating health checks with distributed tracing.

```bash
# ✅ GOOD — Health check with distributed tracing via Jaeger/Zipkin
# Query health check spans from Jaeger API
curl -s "http://jaeger-query:16686/api/traces?service=myapp&operation=/health&limit=10&minDuration=0" |   jq '.data[] | {traceID, operations: [.spans[] | {operationName, tags}]}'

# Query health check spans filtered by status
curl -s "http://jaeger-query:16686/api/traces?service=myapp&operation=health.check.database&tags=health.status:healthy" |   jq '.data[].spans[] | {spanID, operationName, tags}'

# ✅ GOOD — Trace health check with curl and OpenTelemetry Collector
# Health check with trace ID propagation
TRACE_ID=$(openssl rand -hex 16)
curl -s -H "X-Trace-Id: $TRACE_ID" -H "X-Span-Id: $(openssl rand -hex 8)"   http://localhost:8080/health | jq '. + {"trace_id": "'"$TRACE_ID"'"}'

# ✅ GOOD — OpenTelemetry Collector configuration for health checks
cat << 'EOF' > /etc/otel-collector/otel-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

exporters:
  jaeger:
    endpoint: "jaeger:14250"
    tls:
      insecure: true
  prometheus:
    endpoint: "0.0.0.0:8889"

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [jaeger]
    metrics:
      receivers: [otlp]
      exporters: [prometheus]
EOF
otelcol --config /etc/otel-collector/otel-config.yaml
```

```yaml
# ✅ GOOD — Kubernetes annotations for tracing health checks
apiVersion: v1
kind: ConfigMap
metadata:
  name: tracing-config
data:
  otel-traces: |
    # Health check spans will be exported with these attributes:
    # health.check.database -> health.status, health.latency_ms
    # health.check.redis -> health.status, health.latency_ms
    # health.check.composite -> health.overall
    # component: health-check
```

### Pattern 23: Health Check with Fallback Strategy

Implementing fallback responses for critical health checks.

```bash
# ✅ GOOD — Health check with fallback strategy using curl + kubectl
#!/bin/bash
# health_fallback_check.sh — Health checks with Kubernetes fallback

HEALTH_ENDPOINT="http://localhost:8080/health"
NAMESPACE="${NAMESPACE:-default}"

check_database_primary() {
    # Primary: Direct database connectivity check
    if curl -sf --max-time 5 "$HEALTH_ENDPOINT/db/ping" > /dev/null 2>&1; then
        echo '{"status":"healthy","source":"primary","latency_ms":15}'
        return 0
    fi
    return 1
}

check_database_fallback() {
    # Fallback: Check if database pod is running in Kubernetes
    if kubectl -n "$NAMESPACE" get pod postgres-0 > /dev/null 2>&1; then
        echo '{"status":"healthy","source":"fallback","warning":"Using Kubernetes pod status"}'
        return 0
    fi
    echo '{"status":"unhealthy","source":"none"}'
    return 1
}

check_health_with_fallback() {
    local check_name=$1
    
    # Try primary check first
    if primary_result=$(check_database_primary); then
        echo "✅ Primary check passed for $check_name"
        echo "$primary_result" | jq '.'
        return 0
    fi
    
    echo "⚠️ Primary check failed for $check_name, trying fallback..."
    
    # Try fallback check
    if fallback_result=$(check_database_fallback); then
        echo "✅ Fallback check passed for $check_name"
        echo "$fallback_result" | jq '.'
        return 0
    fi
    
    echo "❌ All checks failed for $check_name"
    echo '{"status":"unhealthy","error":"All health checks failed","checked_sources":["primary","fallback"]}'
    return 1
}

# Run checks
check_health_with_fallback "database"
check_health_with_fallback "cache"
```

```bash
# ✅ GOOD — kubectl-based health check fallback
kubectl exec -n default my-app -- curl -sf http://localhost:8080/health/live || kubectl exec -n default my-app -- wget -q -O- http://localhost:8080/health/live
```

### Pattern 24: Health Check with Dependency Priority

Weighting health checks by dependency priority.

```bash
# ✅ GOOD — Health check with dependency priority using curl + jq
#!/bin/bash
# prioritized_health_check.sh — Priority-weighted health checks

declare -A PRIORITIES
PRIORITIES[database]=4      # CRITICAL
PRIORITIES[redis]=3         # HIGH
PRIORITIES[cache]=2         # MEDIUM
PRIORITIES[external_api]=1  # LOW

declare -A CHECK_RESULTS

check_all() {
    for dep in "${!PRIORITIES[@]}"; do
        case "$dep" in
            database)   curl -sf --max-time 5 http://localhost:8080/db/ping >/dev/null 2>&1 && CHECK_RESULTS[$dep]="healthy" || CHECK_RESULTS[$dep]="unhealthy" ;;
            redis)      redis-cli ping >/dev/null 2>&1 && CHECK_RESULTS[$dep]="healthy" || CHECK_RESULTS[$dep]="unhealthy" ;;
            cache)      curl -sf --max-time 3 http://localhost:8080/cache/ping >/dev/null 2>&1 && CHECK_RESULTS[$dep]="healthy" || CHECK_RESULTS[$dep]="unhealthy" ;;
            external_api) curl -sf --max-time 5 https://api.example.com/status >/dev/null 2>&1 && CHECK_RESULTS[$dep]="healthy" || CHECK_RESULTS[$dep]="unhealthy" ;;
        esac
    done
}

calculate_priority_score() {
    local total_priority=0 weighted_score=0 weighted_status="healthy"
    
    for dep in "${!PRIORITIES[@]}"; do
        local priority=${PRIORITIES[$dep]}
        total_priority=$((total_priority + priority))
        if [[ "${CHECK_RESULTS[$dep]}" == "healthy" ]]; then
            weighted_score=$((weighted_score + priority))
        else
            [[ $priority -ge 4 ]] && weighted_status="unhealthy"
            [[ $priority -ge 3 && "$weighted_status" != "unhealthy" ]] && weighted_status="degraded"
        fi
    done
    
    echo "{"status":"$weighted_status","score":$((weighted_score * 100 / total_priority))}"
}

check_all
calculate_priority_score | jq '.'
```

```bash
# Query priority scores via API
curl -s http://localhost:8080/health/prioritized | jq '.checks | to_entries[] | {name: .key, status: .value.status, priority: .value.priority}'
```

### Pattern 25: Health Check with Dependency Health Thresholds

Configurable thresholds for health check acceptance.

```bash
# ✅ GOOD — Health check with configurable thresholds using Prometheus
# Check database health against configured thresholds
curl -s "http://prometheus:9090/api/v1/query"   --data-urlencode 'query=health_check_duration_seconds_bucket{check_name="database",le="0.1"}' |   jq '.data.result[0].value[1] | tonumber * 1000'

# Threshold configuration via ConfigMap
cat << 'EOF' > /etc/health-check-thresholds.yaml
database:
  max_latency_ms: 50.0
  max_error_rate: 0.001
  max_consecutive_failures: 3
redis:
  max_latency_ms: 10.0
  max_error_rate: 0.005
  max_consecutive_failures: 2
EOF

# Threshold checking script
#!/bin/bash
# threshold_check.sh — Check health against thresholds

LATENCY_THRESHOLD_MS=50
ERROR_RATE_THRESHOLD=0.001
CONSECUTIVE_FAILURE_THRESHOLD=3

# Check latency against threshold
check_latency() {
    local latency_ms=$1
    if (( $(echo "$latency_ms > $LATENCY_THRESHOLD_MS" | bc -l) )); then
        echo "⚠️ Latency ${latency_ms}ms exceeds threshold ${LATENCY_THRESHOLD_MS}ms"
        return 1
    fi
    echo "✅ Latency ${latency_ms}ms within threshold"
    return 0
}

# Check error rate against threshold
check_error_rate() {
    local error_rate=$1
    if (( $(echo "$error_rate > $ERROR_RATE_THRESHOLD" | bc -l) )); then
        echo "⚠️ Error rate ${error_rate} exceeds threshold ${ERROR_RATE_THRESHOLD}"
        return 1
    fi
    echo "✅ Error rate ${error_rate} within threshold"
    return 0
}

# Check Prometheus metrics against thresholds
check_prometheus_thresholds() {
    local check_name=$1
    
    # Get p95 latency
    local p95=$(curl -s "http://prometheus:9090/api/v1/query"       --data-urlencode "query=histogram_quantile(0.95, rate(health_check_duration_seconds_bucket{check_name="${check_name}"}[5m]))" |       jq -r '.data.result[0].value[1] // "0"')
    
    # Get error rate
    local error_rate=$(curl -s "http://prometheus:9090/api/v1/query"       --data-urlencode "query=rate(health_check_total{check_name="${check_name}",status="unhealthy"}[5m]) / rate(health_check_total{check_name="${check_name}"}[5m])" |       jq -r '.data.result[0].value[1] // "0"')
    
    local issues=0
    
    check_latency "$(echo "$p95 * 1000" | bc)" || ((issues++))
    check_error_rate "$error_rate" || ((issues++))
    
    if [[ $issues -ge 2 ]]; then
        echo "❌ $check_name: UNHEALTHY"
    elif [[ $issues -ge 1 ]]; then
        echo "⚠️ $check_name: DEGRADED"
    else
        echo "✅ $check_name: HEALTHY"
    fi
}

# Check all services
check_prometheus_thresholds "database"
check_prometheus_thresholds "redis"
```

```yaml
# Prometheus alerting rules for threshold breaches
apiVersion: v1
kind: ConfigMap
metadata:
  name: threshold-alerts
data:
  rules.yaml: |
    groups:
      - name: threshold-alerts
        rules:
          - alert: HealthCheckLatencyThreshold
            expr: histogram_quantile(0.95, rate(health_check_duration_seconds_bucket[5m])) > 0.05
            for: 5m
            labels: { severity: warning }
            annotations:
              summary: "Health check p95 latency exceeds 50ms threshold"
          - alert: HealthCheckErrorRateThreshold
            expr: rate(health_check_total{status="unhealthy"}[5m]) / rate(health_check_total[5m]) > 0.001
            for: 5m
            labels: { severity: critical }
            annotations:
              summary: "Health check error rate exceeds 0.1% threshold"
```

### Pattern 26: Health Check with Dependency Health Scoring

Calculating an overall health score from multiple dependencies.

```bash
# ✅ GOOD — Health scoring using Prometheus and jq
# Query overall health score from Prometheus
curl -s "http://prometheus:9090/api/v1/query"   --data-urlencode 'query=health_check_score{service="main"}' |   jq '.data.result[0].value[1]'

# Calculate health score from Prometheus metrics
#!/bin/bash
# health_score.sh — Calculate weighted health score

# Priority weights
WEIGHT_CRITICAL=40  # database
WEIGHT_HIGH=30      # redis
WEIGHT_MEDIUM=20    # cache
WEIGHT_LOW=10       # metrics
TOTAL_WEIGHT=100

# Get health scores from Prometheus for each service
get_service_score() {
    local service=$1
    local score=$(curl -s "http://prometheus:9090/api/v1/query"       --data-urlencode "query=health_check_duration_seconds_bucket{check_name="${service}",le="0.05"}" |       jq -r '.data.result[0].value[1] // "0"')
    # Convert to 0-100 score (1.0 = 100, 0.0 = 0)
    echo "$score" | awk '{printf "%.0f", $1 * 100}'
}

# Calculate weighted score
calculate_score() {
    local db_score=$(get_service_score "database")
    local redis_score=$(get_service_score "redis")
    local cache_score=$(get_service_score "cache")
    local metrics_score=$(get_service_score "metrics")
    
    local weighted_score=$((
        db_score * WEIGHT_CRITICAL / 100 +
        redis_score * WEIGHT_HIGH / 100 +
        cache_score * WEIGHT_MEDIUM / 100 +
        metrics_score * WEIGHT_LOW / 100
    ))
    
    # Determine rating
    local rating="critical"
    if [[ $weighted_score -ge 95 ]]; then rating="excellent"
    elif [[ $weighted_score -ge 85 ]]; then rating="good"
    elif [[ $weighted_score -ge 70 ]]; then rating="fair"
    elif [[ $weighted_score -ge 50 ]]; then rating="poor"
    fi
    
    echo "{"score":$weighted_score,"rating":"$rating","dependencies":{"database":$db_score,"redis":$redis_score,"cache":$cache_score,"metrics":$metrics_score}}"
}

calculate_score | jq '.'
```

```bash
# ✅ GOOD — Health score visualization
# Query and visualize health scores
curl -s http://localhost:8080/health/score | jq '.dependencies | to_entries[] | 
  {name: .key, score: .value.score, 
   bar: ("█" * (.value.score / 10 | floor))}'
```

### Pattern 27: Health Check with Dependency Health Trends

Tracking health check trends over time for predictive monitoring.

```bash
# ✅ GOOD — Health check trend analysis using Prometheus
# Query health check trend from Prometheus
curl -s "http://prometheus:9090/api/v1/query_range"   --data-urlencode 'query=rate(health_check_duration_seconds_sum{check_name="database"}[5m]) / rate(health_check_duration_seconds_count{check_name="database"}[5m])'   --data-urlencode 'start=now-10m'   --data-urlencode 'end=now'   --data-urlencode 'step=1m' |   jq '.data.result[] | {timestamp: .values[0][0], avg_latency_ms: (.values[0][1] | tonumber * 1000)}'

# ✅ GOOD — Trend analysis using shell script with Prometheus
#!/bin/bash
# trend_analysis.sh — Analyze health check trends

PROMETHEUS_URL="${PROMETHEUS_URL:-http://prometheus:9090}"
Trend_THRESHOLD=0.1  # 10% change is significant

get_avg_latency() {
    local check_name=$1
    local window=$2
    
    curl -s "${PROMETHEUS_URL}/api/v1/query"       --data-urlencode "query=histogram_quantile(0.5, rate(health_check_duration_seconds_bucket{check_name="${check_name}"}[$window]))" |       jq -r '.data.result[0].value[1] // "0" | tonumber * 1000'
}

analyze_trend() {
    local check_name=$1
    
    local first_half=$(get_avg_latency "$check_name" "10m")
    local second_half=$(get_avg_latency "$check_name" "5m")
    
    if (( $(echo "$first_half > 0" | bc -l) )); then
        local change_pct=$(echo "scale=2; ($second_half - $first_half) / $first_half * 100" | bc)
        
        if (( $(echo "$change_pct > $Trend_THRESHOLD * 100" | bc -l) )); then
            echo "📈 ${check_name}: INCREASING (${change_pct}%)"
        elif (( $(echo "$change_pct < -$Trend_THRESHOLD * 100" | bc -l) )); then
            echo "📉 ${check_name}: DECREASING (${change_pct}%)"
        else
            echo "➡️ ${check_name}: STABLE (${change_pct}%)"
        fi
    else
        echo "➡️ ${check_name}: STABLE (insufficient data)"
    fi
}

# Analyze all services
analyze_trend "database"
analyze_trend "redis"
analyze_trend "cache"
```

```bash
# Query trend data from health endpoint
curl -s http://localhost:8080/health/trends | jq '.trend'
```

### Pattern 28: Health Check with Dependency Health History

Maintaining health check history for debugging and analysis.

```bash
# ✅ GOOD — Health check history tracking using Prometheus
# Query health check history from Prometheus
curl -s "http://prometheus:9090/api/v1/query_range"   --data-urlencode 'query=health_check_total{check_name="database"}'   --data-urlencode 'start=now-1h'   --data-urlencode 'end=now'   --data-urlencode 'step=1m' |   jq '.data.result[0].values[] | {timestamp: .[0], value: (.[1] | tonumber)}'

# ✅ GOOD — History tracking using shell script
#!/bin/bash
# health_history.sh — Track and report health check history

PROMETHEUS_URL="${PROMETHEUS_URL:-http://prometheus:9090}"
CHECK_NAME="database"
HISTORY_WINDOW="5m"

# Get recent check history
get_check_history() {
    local check_name=$1
    local window=$2
    
    curl -s "${PROMETHEUS_URL}/api/v1/query_range"       --data-urlencode "query=health_check_total{check_name="${check_name}"}[$window]" |       jq -r '.data.result[0].values[] | .[1] | tonumber' | wc -l
}

# Get failure count in window
get_failure_count() {
    local check_name=$1
    local window=$2
    
    curl -s "${PROMETHEUS_URL}/api/v1/query"       --data-urlencode "query=rate(health_check_total{check_name="${check_name}",status="unhealthy"}[$window])" |       jq '.data.result[0].value[1] // "0" | tonumber'
}

# Get average latency
get_avg_latency() {
    local check_name=$1
    local window=$2
    
    curl -s "${PROMETHEUS_URL}/api/v1/query"       --data-urlencode "query=histogram_quantile(0.5, rate(health_check_duration_seconds_sum{check_name="${check_name}"}[$window]) / rate(health_check_duration_seconds_count{check_name="${check_name}"}[$window]))" |       jq -r '.data.result[0].value[1] // "0" | tonumber * 1000'
}

# Get max latency
get_max_latency() {
    local check_name=$1
    local window=$2
    
    curl -s "${PROMETHEUS_URL}/api/v1/query"       --data-urlencode "query=histogram_quantile(0.99, rate(health_check_duration_seconds_bucket{check_name="${check_name}"}[$window]))" |       jq -r '.data.result[0].value[1] // "0" | tonumber * 1000'
}

# Generate history report
echo "=== Health Check History: ${CHECK_NAME} ==="
echo "Window: ${HISTORY_WINDOW}"
echo "Total checks: $(get_check_history "$CHECK_NAME" "$HISTORY_WINDOW")"
echo "Avg latency: $(get_avg_latency "$CHECK_NAME" "$HISTORY_WINDOW")ms"
echo "Max latency: $(get_max_latency "$CHECK_NAME" "$HISTORY_WINDOW")ms"
echo "Failure rate: $(get_failure_count "$CHECK_NAME" "$HISTORY_WINDOW")"
```

```bash
# Query health history via API
curl -s http://localhost:8080/health/history | jq '.history'
```

### Pattern 29: Health Check with Dependency Health Aggregation

Aggregating health checks for complex dependency graphs.

```bash
# ✅ GOOD — Health check with dependency aggregation
#!/bin/bash
# dependency_aggregation.sh — Aggregate health checks by strategy

declare -A DEPENDENCIES
DEPENDENCIES[shard_1]="database_1"
DEPENDENCIES[shard_2]="database_2"
DEPENDENCIES[shard_3]="database_3"
DEPENDENCIES[api_service]="shard_1 shard_2 shard_3"

declare -A CHECK_RESULTS

check_all() {
    # Check leaf dependencies
    curl -sf --max-time 3 http://localhost:8080/db1/ping > /dev/null 2>&1 && CHECK_RESULTS[database_1]="healthy" || CHECK_RESULTS[database_1]="unhealthy"
    curl -sf --max-time 3 http://localhost:8080/db2/ping > /dev/null 2>&1 && CHECK_RESULTS[database_2]="healthy" || CHECK_RESULTS[database_2]="unhealthy"
    curl -sf --max-time 3 http://localhost:8080/db3/ping > /dev/null 2>&1 && CHECK_RESULTS[database_3]="healthy" || CHECK_RESULTS[database_3]="unhealthy"
    
    # Check derived dependencies
    for dep in shard_1 shard_2 shard_3; do
        local sub_dep="${DEPENDENCIES[$dep]}"
        CHECK_RESULTS[$dep]="${CHECK_RESULTS[$sub_dep]}"
    done
    
    # API service depends on all shards
    local all_healthy=true
    for shard in shard_1 shard_2 shard_3; do
        [[ "${CHECK_RESULTS[$shard]}" != "healthy" ]] && all_healthy=false
    done
    $all_healthy && CHECK_RESULTS[api_service]="healthy" || CHECK_RESULTS[api_service]="degraded"
}

# Aggregate with AND (all must be healthy)
aggregate_and() {
    local all_healthy=true
    for dep in "${!CHECK_RESULTS[@]}"; do
        [[ "${CHECK_RESULTS[$dep]}" != "healthy" ]] && all_healthy=false
    done
    $all_healthy && echo "HEALTHY" || echo "UNHEALTHY"
}

# Aggregate with OR (at least one must be healthy)
aggregate_or() {
    local any_healthy=false
    for dep in "${!CHECK_RESULTS[@]}"; do
        [[ "${CHECK_RESULTS[$dep]}" == "healthy" ]] && any_healthy=true
    done
    $any_healthy && echo "HEALTHY" || echo "UNHEALTHY"
}

# Aggregate with MAJORITY (more than half must be healthy)
aggregate_majority() {
    local total=${#CHECK_RESULTS[@]}
    local healthy_count=0
    for dep in "${!CHECK_RESULTS[@]}"; do
        [[ "${CHECK_RESULTS[$dep]}" == "healthy" ]] && ((healthy_count++))
    done
    [[ $healthy_count -gt $total / 2 ]] && echo "HEALTHY" || echo "UNHEALTHY"
}

# Run checks and report
check_all
echo "=== Dependency Aggregation ==="
echo "Strategy: MAJORITY"
echo "Aggregated: $(aggregate_majority)"
echo ""
echo "Individual status:"
for dep in "${!CHECK_RESULTS[@]}"; do
    echo "  $dep: ${CHECK_RESULTS[$dep]}"
done
```

```bash
# Query aggregated health
curl -s http://localhost:8080/health/aggregated | jq '.aggregation'
```

### Pattern 30: Health Check with Dependency Health Threshold Busting

Detecting and alerting on threshold breaches.

```bash
# ✅ GOOD — Threshold breach detection using Prometheus alerts
# Prometheus threshold breach configuration
cat << 'EOF' > /etc/prometheus/rules/threshold-breach.yaml
groups:
  - name: threshold-breaches
    rules:
      - alert: DatabaseLatencyWarning
        expr: histogram_quantile(0.95, rate(health_check_duration_seconds_bucket{check_name="database"}[5m])) > 0.05
        for: 5m
        labels: { severity: warning, threshold: database_latency }
        annotations:
          summary: "Database latency above warning threshold (50ms)"
      
      - alert: DatabaseLatencyCritical
        expr: histogram_quantile(0.95, rate(health_check_duration_seconds_bucket{check_name="database"}[5m])) > 0.1
        for: 1m
        labels: { severity: critical, threshold: database_latency }
        annotations:
          summary: "Database latency above critical threshold (100ms)"
      
      - alert: RedisLatencyWarning
        expr: histogram_quantile(0.95, rate(health_check_duration_seconds_bucket{check_name="redis"}[5m])) > 0.01
        for: 5m
        labels: { severity: warning, threshold: redis_latency }
        annotations:
          summary: "Redis latency above warning threshold (10ms)"
      
      - alert: RedisLatencyCritical
        expr: histogram_quantile(0.95, rate(health_check_duration_seconds_bucket{check_name="redis"}[5m])) > 0.03
        for: 1m
        labels: { severity: critical, threshold: redis_latency }
        annotations:
          summary: "Redis latency above critical threshold (30ms)"
EOF

# Validate rules
promtool check rules /etc/prometheus/rules/threshold-breach.yaml

# Query breach history from Prometheus
curl -s "http://prometheus:9090/api/v1/query"   --data-urlencode 'query=ALERTS{alertname=~"DatabaseLatency.*|RedisLatency.*"}' |   jq '.data.result[] | {alert: .metric.alertname, state: .metric.alertstate, severity: .metric.severity}'

# Query breach history for specific dependency
curl -s "http://prometheus:9090/api/v1/query_range"   --data-urlencode 'query=rate(ALERTS{alertstate="firing"}[1h])'   --data-urlencode 'start=now-24h'   --data-urlencode 'end=now'   --data-urlencode 'step=1h' |   jq '.data.result[] | {alert: .metric.alertname, breach_count: (length)}'
```

```bash
# Query threshold breaches via API
curl -s http://localhost:8080/health/breaches | jq '.breach_check'
```

### Pattern 31: Health Check with Dependency Health Escalation

Implementing escalation based on health status.

```bash
# ✅ GOOD — Health check escalation using Prometheus alert rules
# Escalation alert rules
cat << 'EOF' > /etc/prometheus/rules/escalation-alerts.yaml
groups:
  - name: health-escalation
    rules:
      - alert: HealthCheckWarning
        expr: sum(health_check_total{status="healthy"}) / sum(health_check_total) * 100 < 95
        for: 5m
        labels: { severity: warning, escalation: "monitor" }
        annotations:
          summary: "System degraded - monitor closely ({{ $value | printf %.1f }}% healthy)"
      
      - alert: HealthCheckCritical
        expr: sum(health_check_total{status="healthy"}) / sum(health_check_total) * 100 < 80
        for: 5m
        labels: { severity: critical, escalation: "immediate" }
        annotations:
          summary: "System critical - immediate action required ({{ $value | printf %.1f }}% healthy)"
      
      - alert: HealthCheckImmediateCritical
        expr: sum(health_check_total{status="healthy"}) / sum(health_check_total) * 100 < 50
        labels: { severity: critical, escalation: "page" }
        annotations:
          summary: "System severely degraded ({{ $value | printf %.1f }}% healthy)"
EOF

promtool check rules /etc/prometheus/rules/escalation-alerts.yaml

# Query escalation status
curl -s "http://prometheus:9090/api/v1/query"   --data-urlencode 'query=sum(health_check_total{status="healthy"}) / sum(health_check_total) * 100' |   jq '.data.result[0].value[1] | tonumber' |   awk '{
    pct = $1;
    if (pct >= 95) { level = "NONE"; msg = "System healthy (" pct "%)" }
    else if (pct >= 80) { level = "WARNING"; msg = "System degraded (" pct "% healthy) - monitor closely" }
    else if (pct >= 50) { level = "CRITICAL"; msg = "System critical (" pct "% healthy) - immediate action required" }
    else { level = "CRITICAL"; msg = "System severely degraded (" pct "% healthy) - page on-call" }
    print "Escalation level:", level
    print "Message:", msg
  }'
```

```bash
# Query escalation info via API
curl -s http://localhost:8080/health/escalation | jq '.escalation'
```

### Pattern 32: Health Check with Dependency Health Retries

Implementing intelligent retry logic for health checks.

```bash
# ✅ GOOD — Health check with intelligent retries in shell
#!/bin/bash
# intelligent_retry.sh — Health checks with configurable retry strategies

MAX_RETRIES=3
BASE_DELAY=0.5
MAX_DELAY=10
STRATEGY="exponential"  # fixed, linear, exponential, random

calculate_delay() {
    local attempt=$1
    case "$STRATEGY" in
        fixed) echo "$BASE_DELAY" ;;
        linear) echo "$BASE_DELAY * ($attempt + 1)" | bc ;;
        exponential)
            local delay=$(echo "$BASE_DELAY * 2 ^ $attempt" | bc)
            [[ $(echo "$delay > $MAX_DELAY" | bc -l) -eq 1 ]] && echo "$MAX_DELAY" || echo "$delay"
            ;;
        random)
            local base=$(echo "$BASE_DELAY * 2 ^ $attempt" | bc)
            local jitter=$(echo "scale=2; $base * (0.5 + $((RANDOM % 100) / 100.0))" | bc)
            [[ $(echo "$jitter > $MAX_DELAY" | bc -l) -eq 1 ]] && echo "$MAX_DELAY" || echo "$jitter"
            ;;
    esac
}

check_with_retry() {
    local check_name=$1
    local check_cmd=$2
    local attempt=0
    local last_error=""
    local last_failure=0
    
    while (( attempt <= MAX_RETRIES )); do
        if eval "$check_cmd" > /dev/null 2>&1; then
            echo "✅ ${check_name} passed on attempt $attempt"
            return 0
        fi
        
        last_error=$?
        ((attempt++))
        
        if (( attempt <= MAX_RETRIES )); then
            local delay=$(calculate_delay $((attempt - 1)))
            echo "⚠️ ${check_name} failed (attempt $attempt/${MAX_RETRIES}), retrying in ${delay}s..."
            sleep "$delay"
        fi
    done
    
    last_failure=$(date +%s)
    echo "❌ ${check_name} failed after ${MAX_RETRIES} retries"
    echo "{"status":"unhealthy","error":"${check_name} failed after ${MAX_RETRIES} retries","retry_info":{"success":false,"last_failure":${last_failure},"seconds_since_last_failure":0}}"
    return 1
}

# Example usage
check_with_retry "database" "curl -sf --max-time 5 http://localhost:8080/db/ping"
check_with_retry "redis" "redis-cli ping"
```

```bash
# Query retry info via API
curl -s http://localhost:8080/health/retry | jq '.retry_info'

# Configure retry strategy via curl
curl -s -X POST http://localhost:8080/health/retry/config   -H "Content-Type: application/json"   -d '{"max_retries":5,"base_delay":1.0,"strategy":"exponential","max_delay":30}'
```

---

## Constraints

### MUST DO

- Implement separate liveness and readiness probes with distinct purposes
- Configure probe timeouts longer than expected response times (include slow dependencies)
- Use exec-based liveness probes when possible to avoid HTTP overhead
- Return HTTP 503 for readiness probe failures, HTTP 200 for liveness probe failures
- Include database and external service dependency checks in readiness probes
- Set appropriate initialDelaySeconds for slow-starting applications using startup probes
- Log health check failures with context for debugging
- Implement circuit breaker patterns for external service dependencies
- Test health checks in staging environment matching production configuration
- Configure alerting on health check failure counts with appropriate thresholds
- Add retry logic for transient failures with exponential backoff
- Implement graceful degradation for non-critical dependencies
- Track health check trends over time for predictive monitoring
- Use structured JSON responses with dependency health details
- Export health check metrics to Prometheus for monitoring

### MUST NOT DO

- Use external dependencies (database, cache, APIs) in liveness probes — only for readiness
- Set probe timeouts too short — they may fail during normal network latency
- Disable health checks in production — they're critical for reliability
- Use generic health check paths like `/health` without versioning or structured response
- Ignore probe failure logs — they indicate real issues needing attention
- Use the same endpoint for liveness and readiness without clear separation
- Set failureThreshold too low — may cause unnecessary restarts during transient issues
- Forget to configure startup probes for applications with slow initialization
- Hardcode database passwords in health check code
- Use blocking I/O in health check endpoints — use async/await
- Return different status codes for liveness vs readiness failures
- Forget to test health checks in the target environment before deployment
- Ignore circuit breaker state in health check response
- Not implement health check history tracking for debugging

---

## Output Template

When implementing health check patterns, your output must contain:

1. **Probe Configuration** — Complete Kubernetes probe YAML with all parameters (liveness, readiness, startup)

2. **Health Endpoint Implementation** — Full HTTP endpoint code with dependency checks and structured response

3. **Dependency Health Check Functions** — Individual functions for each dependency (database, cache, external services)

4. **Circuit Breaker Configuration** — Circuit breaker implementation with threshold settings

5. **Testing Scripts** — Health check test scripts for CI/CD and manual validation

6. **Debugging Commands** — kubectl commands for troubleshooting health check issues

7. **Metrics Export** — Prometheus metrics for health check monitoring

8. **Retry Logic** — Exponential backoff retry implementation

9. **Graceful Degradation** — Non-critical dependency handling

10. **Circuit Breaker States** — Visualization of circuit breaker states in health response

---

## Related Skills

| Skill | Purpose |
|---|---|
| `cncf-kubernetes-debugging` | General Kubernetes debugging patterns and troubleshooting techniques |
| `agent-docker-debugging` | Docker container debugging including health check verification |
| `coding-fastapi-patterns` | FastAPI-specific health check patterns and response formatting |
| `cncf-prometheus` | Monitoring and alerting based on health check metrics |
| `trading-risk-kill-switches` | Emergency shutdown patterns for trading systems |
| `cncf-service-mesh` | Service mesh health check integration (Istio, Linkerd) |

---

## References

- [Kubernetes Probes Documentation](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#container-probes)
- [Kubernetes Best Practices: Pod Disruption](https://cloud.google.com/blog/products/containers-kubernetes/kubernetes-best-practices-pod-disruption)
- [Circuit Breaker Pattern](https://docs.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker)
- [Health Check Response Format](https://tools.ietf.org/html/draft-inadarei-api-health-check-05)
- [Kubernetes Signal Handling](https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/)
- [CNCF Health Check Guidelines](https://github.com/cncf/tag-app-delivery/blob/main/health-checks/health-checks-overview.md)
- [OpenTelemetry Health Checks](https://opentelemetry.io/docs/instrumentation/python/automatic/)
- [FastAPI Health Checks](https://fastapi.tiangolo.com/advanced/health-checks/)

---

*This skill provides comprehensive health check patterns for cloud-native applications. All code examples follow Python typing conventions and include proper error handling.*


```bash
# ❌ BAD — basic pod status without health check details
kubectl get pods

# ✅ GOOD — comprehensive health check debugging commands

# 1. Check pod status and events
kubectl get pods -o wide
kubectl describe pod <pod-name>

# 2. Get detailed probe configuration
kubectl get pod <pod-name> -o jsonpath='{.spec.containers[0].livenessProbe}' && echo
kubectl get pod <pod-name> -o jsonpath='{.spec.containers[0].readinessProbe}' && echo

# 3. Check container logs for health check failures
kubectl logs <pod-name> --tail=100

# 4. Execute inside container to test health endpoint
kubectl exec -it <pod-name> -- curl -v http://localhost:8080/health

# 5. Check if probe endpoint is accessible from inside pod
kubectl exec <pod-name> -- wget -q -O- http://localhost:8080/health/live

# 6. Monitor pod restarts (indicates liveness probe failures)
kubectl get pods -w

# 7. Check resource constraints affecting probe timing
kubectl top pods

# 8. Validate probe configuration in deployment
kubectl get deployment <deployment-name> -o yaml | grep -A 10 "livenessProbe"

# 9. Check service mesh integration (for Istio/Linkerd)
kubectl exec <pod-name> -- curl -v http://localhost:15000/ready

# 10. View all events in namespace
kubectl get events --sort-by=.metadata.creationTimestamp

# Health Check Troubleshooting Script
#!/bin/bash
# debug-health-checks.sh

POD_NAME=$1

if [ -z "$POD_NAME" ]; then
    echo "Usage: $0 <pod-name>"
    exit 1
fi

echo "=== Health Check Debug for $POD_NAME ==="

echo -e "\n1. Pod Status:"
kubectl get pod $POD_NAME -o wide

echo -e "\n2. Pod Events:"
kubectl describe pod $POD_NAME | grep -A 20 "Events:"

echo -e "\n3. Liveness Probe Config:"
kubectl get pod $POD_NAME -o jsonpath='{.spec.containers[0].livenessProbe}' | python3 -m json.tool

echo -e "\n4. Readiness Probe Config:"
kubectl get pod $POD_NAME -o jsonpath='{.spec.containers[0].readinessProbe}' | python3 -m json.tool

echo -e "\n5. Recent Logs:"
kubectl logs $POD_NAME --tail=50

echo -e "\n6. Test Health Endpoint:"
kubectl exec $POD_NAME -- curl -s http://localhost:8080/health/live
echo

echo -e "\n7. Container Resource Usage:"
kubectl top pod $POD_NAME
```

---

## Constraints

### MUST DO

- Implement separate liveness, readiness, and startup probes with distinct purposes
- Configure probe timeouts longer than expected response times (include slow dependencies)
- Use exec-based liveness probes when possible to avoid HTTP overhead
- Return HTTP 503 for readiness probe failures, HTTP 200 for liveness probe failures
- Include database and external service dependency checks in readiness probes
- Set appropriate initialDelaySeconds for slow-starting applications using startup probes
- Log health check failures with context for debugging
- Implement circuit breaker patterns for external service dependencies
- Test health checks in staging environment matching production configuration
- Configure alerting on health check failure counts with appropriate thresholds

### MUST NOT DO

- Use external dependencies (database, cache, APIs) in liveness probes — only for readiness
- Set probe timeouts too short — they may fail during normal network latency
- Disable health checks in production — they're critical for reliability
- Use generic health check paths like `/health` without versioning or structured response
- Ignore probe failure logs — they indicate real issues needing attention
- Use the same endpoint for liveness and readiness without clear separation
- Set failureThreshold too low — may cause unnecessary restarts during transient issues
- Forget to configure startup probes for applications with slow initialization

---

## Output Template

When implementing health check patterns, your output must contain:

1. **Probe Configuration** — Complete Kubernetes probe YAML with all parameters (liveness, readiness, startup)

2. **Health Endpoint Implementation** — Full HTTP endpoint code with dependency checks and structured response

3. **Dependency Health Check Functions** — Individual functions for each dependency (database, cache, external services)

4. **Circuit Breaker Configuration** — Circuit breaker implementation with threshold settings

5. **Testing Scripts** — Health check test scripts for CI/CD and manual validation

6. **Debugging Commands** — kubectl commands for troubleshooting health check issues

---

## Related Skills

| Skill | Purpose |
|---|---|
| `cncf-kubernetes-debugging` | General Kubernetes debugging patterns and troubleshooting techniques |
| `agent-docker-debugging` | Docker container debugging including health check verification |
| `coding-fastapi-patterns` | FastAPI-specific health check patterns and response formatting |
| `cncf-prometheus` | Monitoring and alerting based on health check metrics |
| `trading-risk-kill-switches` | Emergency shutdown patterns for trading systems |

---

## References

- [Kubernetes Probes Documentation](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#container-probes)
- [Kubernetes Best Practices: Pod Disruption](https://cloud.google.com/blog/products/containers-kubernetes/kubernetes-best-practices-pod-disruption)
- [Circuit Breaker Pattern](https://docs.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker)
- [Health Check Response Format](https://tools.ietf.org/html/draft-inadarei-api-health-check-05)
- [Kubernetes Signal Handling](https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/)
- [CNCF Health Check Guidelines](https://github.com/cncf/tag-app-delivery/blob/main/health-checks/health-checks-overview.md)

---

*This skill provides comprehensive health check patterns for cloud-native applications. All code examples follow Python typing conventions and include proper error handling.*
