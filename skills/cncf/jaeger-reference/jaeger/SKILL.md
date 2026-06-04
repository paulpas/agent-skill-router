---
name: jaeger
description: Deploys and manages Jaeger distributed tracing infrastructure on Kubernetes with configuration, querying, health monitoring, and troubleshooting for production microservice observability.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: cncf
  triggers: jaeger, distributed tracing, kubernetes deployment, trace query, span debugging, collector configuration, hotrod demo, APM infrastructure
  role: reference
  scope: infrastructure
  output-format: manifests
  content-types: [guidance, examples, config, do-dont]
  archetypes: [tactical, orchestration]
  anti_triggers: [brainstorming, vague ideation, long-form architecture planning]
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
---

# Jaeger Distributed Tracing in Kubernetes

Deploys and manages Jaeger distributed tracing infrastructure on Kubernetes. Covers namespace setup, collector configuration, query service deployment, health monitoring, trace querying via API, and troubleshooting common issues.

## TL;DR Checklist

- [ ] Deploy Jaeger in a dedicated namespace with resource limits
- [ ] Configure the collector to receive traces from instrumented services (OTLP/gRPC on 14250, HTTP on 14268)
- [ ] Expose the Query UI for debugging via port-forward or Ingress
- [ ] Use the Jaeger API (`/api/traces`, `/api/services`) to query traces programmatically
- [ ] Monitor collector health and trace ingestion rate in production

---

## Purpose and Use Cases

Jaeger is an open-source distributed tracing system from CNCF. It helps track requests as they flow through microservices, identifying bottlenecks, failures, and latency issues across service boundaries.

**Use Jaeger when:**
- You need end-to-end visibility into request flows across microservices
- Debugging latency spikes by analyzing trace spans
- Tracing errors that cascade between services
- Measuring service dependency maps and call patterns

**Alternatives:** For simpler setups, consider OpenTelemetry with Zipkin or commercial APM tools (Datadog, New Relic). Use Jaeger when you need a self-hosted CNCF-native tracing solution.

---

## Architecture Design Patterns

Jaeger follows a three-component architecture:

1. **Agent** — Lightweight daemon (sidecar or daemonset) that collects traces from applications via UDP and forwards them to collectors. Uses the OpenTracing/OTLP protocol.
2. **Collector** — Receives traces from agents or directly from applications, processes them (batching, enrichment), and writes them to storage backends.
3. **Query/UI** — Serves a web UI for browsing and inspecting traces, plus a REST API for programmatic trace queries.

**Data flow:** `Application → Agent/Collector → Storage (Cassandra/Elasticsearch/Memory) → Query → Dashboard`

---

## Integration Approaches

### Approach 1: Deploy via Jaeger Operator (Recommended)

```bash
# Install the Jaeger Operator from Helm
helm repo add jaegertracing https://jaegertracing.github.io/helm-charts
helm repo update
helm install jaeger jaegertracing/jaeger -n jaeger --create-namespace \
  --set installAllComponents=true \
  --set storage.type=elasticsearch \
  --set storage.elasticsearch.host=elasticsearch-master \
  --set storage.elasticsearch.port=9200

# Verify all components are running
kubectl get pods -n jaeger
```

### Approach 2: Deploy Components Manually

```yaml
---
# Jaeger Namespace
apiVersion: v1
kind: Namespace
metadata:
  name: jaeger
  labels:
    app.kubernetes.io/name: jaeger

---
# Jaeger Query Service (for programmatic access)
apiVersion: v1
kind: Service
metadata:
  name: jaeger-query
  namespace: jaeger
  labels:
    app.kubernetes.io/name: jaeger
spec:
  ports:
    - port: 16686
      targetPort: 16686
      name: ui
    - port: 14269
      targetPort: 14269
      name: grpc-query
  selector:
    app.kubernetes.io/name: jaeger
    component: query

---
# Jaeger Collector Service (receives traces)
apiVersion: v1
kind: Service
metadata:
  name: jaeger-collector
  namespace: jaeger
  labels:
    app.kubernetes.io/name: jaeger
spec:
  ports:
    - port: 14250
      targetPort: 14250
      name: grpc
    - port: 14268
      targetPort: 14268
      name: http-ingest
    - port: 9411
      targetPort: 9411
      name: zipkin
  selector:
    app.kubernetes.io/name: jaeger
    component: collector

---
# Jaeger Agent DaemonSet (sidecar-style trace collection)
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: jaeger-agent
  namespace: jaeger
  labels:
    app.kubernetes.io/name: jaeger
spec:
  selector:
    matchLabels:
      name: jaeger-agent
  template:
    metadata:
      labels:
        name: jaeger-agent
    spec:
      containers:
      - name: jaeger-agent
        image: jaegertracing/jaeger-agent:latest
        args:
          - "--collector.host-port=jaeger-collector:14267"
          - "--reporter.grpc.parent-based=true"
          - "--reporter.grpc.timeout=1s"
        ports:
          - containerPort: 5778
            name: config-rest
          - containerPort: 6831
            protocol: UDP
            name: jg-compact-compact
          - containerPort: 6832
            protocol: UDP
            name: jg-binary-binary
          - containerPort: 5779
            name: admin-http
        resources:
          requests:
            cpu: 100m
            memory: 100Mi
          limits:
            cpu: 200m
            memory: 200Mi
```

---

## Common Pitfalls

- **Missing trace data:** Verify the collector service is reachable on port 14268 (HTTP) or 14250 (gRPC). Check network policies blocking egress from instrumented services.
- **High memory usage in collector:** Set `COLLECTOR_QUEUE_SIZE_MAX` and enable batch processing. Monitor queue depth metrics.
- **Storage backend bottlenecks:** Elasticsearch can become a bottleneck at high trace ingestion rates. Use retention policies, index lifecycle management, and consider Cassandra for write-heavy workloads.
- **Agent UDP packet loss:** At very high trace volumes, UDP agents may drop packets. Switch to gRPC reporters in production for reliable delivery.
- **Query latency with large datasets:** Query performance degrades with millions of spans. Use span filters, time-range limits, and service-specific queries in the API.

---

## Code Examples and Patterns

### Pattern 1: Create Jaeger Namespace and ConfigMap

```bash
# Create namespace for Jaeger deployment
kubectl create namespace jaeger --dry-run=client -o yaml | kubectl apply -f -

# Create a ConfigMap for custom collector settings
cat << 'EOF' | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: jaeger-collector-config
  namespace: jaeger
data:
  collector.yaml: |
    queue_size: 2000
    batch_size: 100
    processor:
      tracing_spans:
        workers: 10
EOF
```

### Pattern 2: Query Jaeger Traces via API

```bash
# List all services traced by Jaeger
curl -s http://localhost:16686/api/services | jq .

# Get traces for a specific service within a time range
SERVICE="orders-service"
TRACE_ID=$(curl -s "http://localhost:16686/api/traces?service=${SERVICE}&limit=1&lookback=1h" \
  | jq -r '.data[0].traceID // empty')

if [[ -n "$TRACE_ID" ]]; then
    echo "Found trace ID: $TRACE_ID"
    curl -s "http://localhost:16686/api/traces/${TRACE_ID}" | jq .
else
    echo "No traces found for service: $SERVICE in the last hour"
fi

# Query spans by operation name across all services
curl -s "http://localhost:16686/api/services" \
  | jq -r '.data[]' > /tmp/all_services.txt

for service in $(cat /tmp/all_services.txt); do
    curl -s "http://localhost:16686/api/traces?service=${service}&operation=processOrder&limit=5&lookback=30m" \
      | jq ".data[]?.traceID" 2>/dev/null
done

# Port-forward to Jaeger query service for local access
kubectl port-forward -n jaeger svc/jaeger-query 16686:16686 &
open http://localhost:16686
```

### Pattern 3: Health Check Implementation

```bash
#!/bin/bash
# check_jaeger_health.sh — Comprehensive health check for Jaeger service
set -euo pipefail

HOST="${1:-localhost}"
PORT="${2:-16686}"
TIMEOUT=5

echo "=== Jaeger Health Check ==="

# Check 1: UI accessibility
echo -n "UI (HTTP $PORT): "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT \
    "http://$HOST:$PORT/" 2>/dev/null || echo "000")
if [[ "$HTTP_CODE" -ge 200 && "$HTTP_CODE" -lt 400 ]]; then
    echo "✅ OK (HTTP $HTTP_CODE)"
else
    echo "❌ FAILED (HTTP $HTTP_CODE)"
fi

# Check 2: API health
echo -n "API (/healthz): "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT \
    "http://$HOST:$PORT/healthz" 2>/dev/null || echo "000")
if [[ "$HTTP_CODE" -eq 200 ]]; then
    echo "✅ OK (HTTP $HTTP_CODE)"
else
    echo "❌ FAILED (HTTP $HTTP_CODE)"
fi

# Check 3: Services endpoint
echo -n "Services API: "
SERVICE_COUNT=$(curl -s --max-time $TIMEOUT \
    "http://$HOST:$PORT/api/services" 2>/dev/null | jq '.data | length' 2>/dev/null || echo "0")
if [[ "$SERVICE_COUNT" -gt 0 ]]; then
    echo "✅ OK (${SERVICE_COUNT} services)"
else
    echo "⚠️ DEGRADED (0 services — no traces received recently)"
fi

echo ""
echo "=== Jaeger Health Check Complete ==="
```

---

## Constraints

### MUST DO
- Deploy Jaeger with resource limits (CPU and memory) to prevent OOM kills in shared clusters
- Use the Collector's gRPC endpoint (14250) over HTTP for production trace ingestion — it's more reliable
- Expose the Query UI via Ingress with authentication in production environments
- Set appropriate retention policies on your storage backend to manage disk usage
- Monitor collector queue depth and processing latency metrics in production

### MUST NOT DO
- Expose the Jaeger Query UI directly without authentication or network policy restrictions
- Run the Collector or Query as root containers — always use a non-root security context
- Use memory storage in production — it loses all traces on pod restart
- Deploy agents without setting `COLLECTOR_HOST_PORT` correctly — traces will be silently dropped

---

## Related Skills

| Skill | Purpose |
|---|---|
| `cncf-opentelemetry` | OpenTelemetry instrumentation for sending traces to Jaeger |
| `cncf-grafana` | Visualize Jaeger metrics alongside other observability data |
| `coding-distributed-tracing-patterns` | Application-level distributed tracing patterns with OpenTelemetry SDK |

---

## Troubleshooting

### Common Issues

1. **No traces appearing in Jaeger**
   - Verify the service is configured to send traces to the correct Jaeger collector endpoint
   - Check: `kubectl logs -n jaeger <collector-pod> --tail=50` for ingestion errors
   - Ensure network policies allow egress from services to port 14268 (HTTP) or 14250 (gRPC)

2. **Collector high memory usage**
   - Check `jaeger_collector_queue_size` metric — if consistently near max, increase batch size
   - Verify storage backend is keeping up with ingestion rate
   - Consider increasing collector replicas for write-heavy workloads

3. **Slow trace queries**
   - Reduce time range in API queries to limit data scanned
   - Filter by specific service or operation name before querying
   - Review storage backend performance (Elasticsearch shard count, index lifecycle)

### Debug Commands

```bash
# Check Jaeger pod status
kubectl get pods -n jaeger

# View collector logs for ingestion errors
kubectl logs -n jaeger -l component=collector --tail=100 -f

# List all traced services
curl -s http://localhost:16686/api/services | jq .

# Query recent traces for a specific service and operation
curl -s "http://localhost:16686/api/traces?service=my-service&operation=getUser&limit=3&lookback=1h"

# Check Jaeger storage health (Elasticsearch)
kubectl exec -n jaeger deploy/jaeger-query -- curl -sf http://jaeger-collector:14269/healthz
```

---

## When to Use

Use this skill when:

- **Deploying distributed tracing infrastructure** — You need to set up Jaeger in a Kubernetes cluster for microservice observability
- **Debugging latency issues across services** — You need to query traces programmatically via the Jaeger API or UI
- **Troubleshooting trace ingestion failures** — Traces are not reaching Jaeger, and you need to diagnose collector/agent misconfiguration
- **Configuring custom collectors** — You need to tune batch sizes, queue depths, or switch storage backends

---

## Core Workflow

1. **Assess Requirements** — Determine the number of services needing tracing, expected trace volume (traces/sec), and retention period. **Checkpoint:** Document trace ingestion rate targets and storage capacity needs.

2. **Deploy Infrastructure** — Install Jaeger components (agent/collector/query) in a dedicated namespace with proper resource limits and security contexts. Use Helm charts or the Jaeger Operator for automated deployment. **Checkpoint:** Verify all pods are Running, probes passing, and no CrashLoopBackOff errors.

3. **Instrument Services** — Configure applications to emit traces via OTLP/gRPC or HTTP endpoints. Set the correct collector endpoint in application config or via environment variables. **Checkpoint:** Verify traces appear in Jaeger UI within 60 seconds of deployment.

4. **Monitor & Query** — Use the Jaeger API (`/api/traces`, `/api/services`) for programmatic access, and expose the UI (port-forward or Ingress) for interactive debugging. Set up health checks for collector and query services. **Checkpoint:** Confirm trace ingestion rate matches expected volume, and queries return within acceptable latency.

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Jaeger Documentation](https://www.jaegertracing.io/docs/latest/)
- [Jaeger Kubernetes Deployment Guide](https://www.jaegertracing.io/docs/latest/deployment/)
- [Jaeger Collector Configuration](https://www.jaegertracing.io/docs/latest/configuration/)
- [OpenTelemetry to Jaeger Integration](https://opentelemetry.io/docs/languages/java/exporters/jaeger/)
- [Jaeger REST API Reference](https://www.jaegertracing.io/docs/latest/api/)
