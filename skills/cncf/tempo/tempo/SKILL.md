---
name: tempo
description: Deploys and manages Tempo distributed tracing infrastructure on Kubernetes with configuration, querying via Loki-style APIs, health monitoring, and troubleshooting for production microservice observability.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: cncf
  triggers: tempo, distributed tracing, Grafana Tempo, trace query, span debugging, OTLP ingestion, Loki storage, APM infrastructure
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

# Grafana Tempo Distributed Tracing in Kubernetes

Deploys and manages Grafana Tempo distributed tracing infrastructure on Kubernetes. Covers namespace setup, OTLP ingestion configuration, storage backend selection, trace querying via QueryFrontend API, health monitoring, and troubleshooting common issues.

## TL;DR Checklist

- [ ] Deploy Tempo with a suitable storage backend (S3/GCS for production, boltdb-shipper or memcached for dev)
- [ ] Configure OTLP receiver on port 4317 (gRPC) and 4318 (HTTP) for trace ingestion
- [ ] Set up QueryFrontend for efficient trace search and filtering
- [ ] Expose the Tempo UI via Ingress for interactive trace browsing
- [ ] Monitor ingester flush latency and distributor drop rates in production

---

## Purpose and Use Cases

Tempo is a CNCF project by Grafana Labs — a highly scalable, cost-efficient distributed tracing backend designed to work natively with Grafana. Unlike Jaeger (which stores full traces), Tempo uses log-based indexing similar to Loki, dramatically reducing storage costs while maintaining fast query performance.

**Use Tempo when:**
- You want distributed tracing integrated with your existing Grafana/Loki stack
- Storage cost is a concern — Tempo's log-based approach is 10x cheaper than traditional trace databases
- You need correlation between traces, logs, and metrics in a single Grafana dashboard
- You're running large-scale microservice architectures with high trace volumes

**Alternatives:** Use Jaeger when you need full-trace storage with complex query capabilities. Use commercial APM tools (Datadog, New Relic) when you want zero infrastructure management.

---

## Architecture Design Patterns

Tempo follows a three-component architecture:

1. **Distributor** — Receives traces from agents or applications via OTLP/gRPC (4317), OTLP/HTTP (4318), or Jaeger-compatible endpoints. Validates and forwards traces to ingesters.
2. **Ingester** — Buffers incoming traces in memory, applies index writes, and flushes completed spans to storage when idle or size thresholds are met.
3. **QueryFrontend + QueryScheduler** — Receives search queries, splits them across ingesters/storage backends, and aggregates results for the TraceQL query language.

**Data flow:** `Application → OTLP Receiver → Ingester (memory buffer) → Storage (S3/GCS) ← QueryFrontend ← TraceQL API`

---

## Integration Approaches

### Approach 1: Deploy via Helm Chart (Recommended)

```bash
# Add the Grafana Helm repository
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Install Tempo with S3 storage backend
helm install tempo grafana/tempo -n tempo --create-namespace \
  --set deploymentMode=distributed \
  --set tempoServiceAccount.create=true \
  --set "tempo.main.server.grpcStorageCompression.enabled=true" \
  --set "tempo.main.storage.s3.bucket=tempo-traces" \
  --set "tempo.main.storage.s3.region=us-east-1" \
  --set "tempo.main.storage.s3.secret.access.key=${AWS_SECRET_KEY}" \
  --set "tempo.main.storage.s3.access.key.id=${AWS_ACCESS_KEY}"

# Verify all distributed components are running
kubectl get pods -n tempo
```

### Approach 2: Deploy Core Components Manually

```yaml
---
# Tempo Namespace
apiVersion: v1
kind: Namespace
metadata:
  name: tempo
  labels:
    app.kubernetes.io/name: tempo

---
# Tempo QueryFrontend Service (HTTP API for trace queries)
apiVersion: v1
kind: Service
metadata:
  name: tempo-query
  namespace: tempo
  labels:
    app.kubernetes.io/name: tempo
spec:
  ports:
    - port: 3100
      targetPort: 3100
      name: http-metrics
    - port: 9095
      targetPort: 9095
      name: grpc-query
  selector:
    app.kubernetes.io/component: query-frontend

---
# Tempo Distributor Service (receives traces)
apiVersion: v1
kind: Service
metadata:
  name: tempo-distributor
  namespace: tempo
  labels:
    app.kubernetes.io/name: tempo
spec:
  ports:
    - port: 4317
      targetPort: 4317
      name: otlp-grpc
    - port: 4318
      targetPort: 4318
      name: otlp-http
    - port: 9411
      targetPort: 9411
      name: zipkin
  selector:
    app.kubernetes.io/component: distributor
```

---

## Common Pitfalls

- **Missing OTLP receiver configuration:** Tempo requires explicit OTLP receiver setup on ports 4317 (gRPC) and 4318 (HTTP). Without this, OpenTelemetry SDKs cannot send traces.
- **Ingesters OOM killing:** Large trace payloads can cause memory spikes. Set `max_block_bytes` and tune `ingester_lifecycler` flush thresholds. Monitor `tempo_ingester_ring_tokens_count`.
- **Storage backend latency:** S3/GCS read latency directly impacts query response time. Use memcached for index caching to reduce cold reads from object storage.
- **Missing labels for indexing:** Tempo uses labels (like Loki) for trace filtering. Without proper label configuration, searches return empty results even when traces exist.
- **High distributor drop rate:** When ingesters can't keep up, the distributor drops traces. Monitor `tempo_distributor_queue_capacity` and scale ingester replicas.

---

## Code Examples and Patterns

### Pattern 1: Create Tempo Namespace with OTLP ConfigMap

```bash
# Create namespace for Tempo deployment
kubectl create namespace tempo --dry-run=client -o yaml | kubectl apply -f -

# Create ConfigMap for custom distributor settings
cat << 'EOF' | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: tempo-distributor-config
  namespace: tempo
data:
  config.yaml: |
    distributor:
      receivers:
        otlp:
          protocols:
            grpc:
              endpoint: "0.0.0.0:4317"
            http:
              endpoint: "0.0.0.0:4318"
          max_traces_per_user: 1000
          batch_size: 500
EOF
```

### Pattern 2: Query Tempo Traces via API

```bash
# List all services traced by Tempo
curl -s http://localhost:3100/services | jq .

# Get traces using TraceQL — query by service name and operation
curl -s -X POST "http://localhost:3100/otlp/v1/traces" \
  -H "Content-Type: application/x-protobuf" \
  --data-binary @trace.pb  # Pre-recorded trace binary

# Query traces with TraceQL via the Loki-compatible query endpoint
SERVICE="orders-service"
curl -s "http://localhost:3100/api/search?query={service.name=\"${SERVICE}\"}&limit=5" \
  | jq .

# Port-forward to Tempo QueryFrontend for local access
kubectl port-forward -n tempo svc/tempo-query 3100:3100 &
open http://localhost:3100

# Fetch trace data by ID (requires the trace ID from search results)
TRACE_ID="abc123def456"
curl -s "http://localhost:3100/api/traces/${TRACE_ID}" | jq .

# Check Tempo ingester health and flush metrics
METRICS_URL="http://localhost:3100/metrics"
curl -s "$METRICS_URL" \
  | grep "tempo_ingester_blocks_total\|tempo_distributor_spans_received_total" \
  | head -20
```

### Pattern 3: Health Check Implementation

```bash
#!/bin/bash
# check_tempo_health.sh — Comprehensive health check for Tempo service
set -euo pipefail

HOST="${1:-localhost}"
PORT="${2:-3100}"
TIMEOUT=5

echo "=== Tempo Health Check ==="

# Check 1: API accessibility (HTTP metrics endpoint)
echo -n "API (HTTP $PORT): "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT \
    "http://$HOST:$PORT/" 2>/dev/null || echo "000")
if [[ "$HTTP_CODE" -ge 200 && "$HTTP_CODE" -lt 400 ]]; then
    echo "✅ OK (HTTP $HTTP_CODE)"
else
    echo "❌ FAILED (HTTP $HTTP_CODE)"
fi

# Check 2: Services endpoint — confirms traces are being received
echo -n "Services API: "
SERVICE_COUNT=$(curl -s --max-time $TIMEOUT \
    "http://$HOST:$PORT/services" 2>/dev/null | jq 'length' 2>/dev/null || echo "0")
if [[ "$SERVICE_COUNT" -gt 0 ]]; then
    echo "✅ OK (${SERVICE_COUNT} services)"
else
    echo "⚠️ DEGRADED (0 services — no traces received recently)"
fi

# Check 3: OTLP gRPC receiver connectivity
echo -n "OTLP gRPC (4317): "
GRPC_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT \
    "http://$HOST:4317/" 2>/dev/null || echo "000")
if [[ "$GRPC_CODE" -eq 405 ]] || [[ "$GRPC_CODE" -ge 200 ]]; then
    echo "✅ OK (listener responding)"
else
    echo "❌ FAILED (port not listening)"
fi

echo ""
echo "=== Tempo Health Check Complete ==="
```

---

## Constraints

### MUST DO
- Deploy Tempo with a durable storage backend (S3/GCS) for production — never use memory-only storage in production
- Configure the OTLP receiver explicitly on ports 4317 (gRPC) and 4318 (HTTP) for OpenTelemetry compatibility
- Set proper label-based indexing so traces can be searched by service name, operation, and tags
- Enable compression (`grpcStorageCompression`) to reduce storage costs for high-volume deployments
- Monitor distributor drop rates (`tempo_distributor_spans_dropped_total`) as an early warning of ingester overload

### MUST NOT DO
- Expose the Tempo QueryFrontend directly without authentication or network policy restrictions
- Run ingesters or distributors as root containers — always use a non-root security context with `runAsNonRoot: true`
- Deploy without configuring storage backend limits — unbounded S3/GCS storage will grow indefinitely
- Skip index caching in production — every query against cold object storage adds 100ms+ latency per request

---

## Related Skills

| Skill | Purpose |
|---|---|
| `cncf-grafana` | Visualize Tempo traces alongside logs and metrics in Grafana dashboards |
| `coding-distributed-tracing-patterns` | Application-level distributed tracing patterns with OpenTelemetry SDK |
| `cncf-opentelemetry` | OpenTelemetry instrumentation for sending traces to Tempo |

---

## Troubleshooting

### Common Issues

1. **No traces appearing in Tempo**
   - Verify applications are configured to send OTLP traces to the correct distributor endpoint (port 4317 gRPC or 4318 HTTP)
   - Check: `kubectl logs -n tempo <distributor-pod> --tail=50` for connection errors
   - Ensure network policies allow egress from services to port 4317 or 4318

2. **High memory usage in ingesters**
   - Check `tempo_ingester_ring_tokens_count` — if tokens are imbalanced, reconfigure the ring
   - Reduce `max_block_bytes` or increase `ingester_flush_timeout` to trigger earlier flushes
   - Consider increasing ingester replicas for write-heavy workloads

3. **Slow trace queries**
   - Add index cache (memcached) to reduce cold reads from S3/GCS storage
   - Use specific label filters in TraceQL queries instead of broad searches
   - Review storage backend read latency (`s3_get_object_latency` metrics)

### Debug Commands

```bash
# Check Tempo pod status across all distributed components
kubectl get pods -n tempo

# View distributor logs for ingestion errors
kubectl logs -n tempo -l component=distributor --tail=100 -f

# List all traced services
curl -s http://localhost:3100/services | jq .

# Search traces using TraceQL (Loki-compatible)
curl -s "http://localhost:3100/api/search?query={service.name=\"api-gateway\"}&limit=5"

# Check OTLP receiver health via port-forward
kubectl port-forward -n tempo svc/tempo-distributor 4317:4317 &
```

---

## When to Use

Use this skill when:

- **Deploying distributed tracing infrastructure** — You need to set up Grafana Tempo in a Kubernetes cluster for microservice observability with cost-efficient storage
- **Debugging latency issues across services** — You need to query traces programmatically via the Tempo QueryFrontend API using TraceQL
- **Troubleshooting trace ingestion failures** — Traces are not reaching Tempo, and you need to diagnose distributor/OTLP receiver misconfiguration
- **Configuring custom storage backends** — You need to tune S3/GCS retention, block sizes, or add index caching for query performance

---

## Core Workflow

1. **Assess Requirements** — Determine the number of services needing tracing, expected trace volume (traces/sec), storage retention period, and whether you have an existing Grafana/Loki stack for integration. **Checkpoint:** Document trace ingestion rate targets and storage capacity needs.

2. **Deploy Infrastructure** — Install Tempo components (distributor/ingester/query-frontend) in a dedicated namespace with proper resource limits, non-root security contexts, and a durable storage backend (S3/GCS). Use Helm charts for automated deployment. **Checkpoint:** Verify all pods are Running, probes passing, and no CrashLoopBackOff errors. Confirm OTLP receivers are listening on ports 4317/4318.

3. **Instrument Services** — Configure OpenTelemetry SDKs in applications to emit traces via OTLP/gRPC (port 4317) or OTLP/HTTP (port 4318). Set the correct distributor endpoint as an environment variable. Ensure proper labels are attached to spans for searchability. **Checkpoint:** Verify traces appear in Tempo UI within 60 seconds of deployment.

4. **Monitor & Query** — Use the TraceQL API (`/api/search`) for programmatic trace queries, and expose the UI (port-forward or Ingress) for interactive debugging. Monitor distributor drop rates, ingester flush latency, and query response times. **Checkpoint:** Confirm trace ingestion rate matches expected volume, queries return within acceptable latency, and no traces are being silently dropped.

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Tempo Documentation](https://grafana.com/docs/tempo/latest/)
- [Tempo Kubernetes Deployment](https://grafana.com/docs/tempo/latest/installation/kubernetes/)
- [OTLP Receiver Configuration](https://grafana.com/docs/tempo/latest/configuration/#otlp)
- [TraceQL Query Language Reference](https://grafana.com/docs/tempo/latest/traceql/)
- [Tempo Storage Backends (S3/GCS)](https://grafana.com/docs/tempo/latest/storage/#s3-gcs)
