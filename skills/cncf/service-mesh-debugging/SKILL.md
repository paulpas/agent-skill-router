---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: Implements comprehensive debugging workflows for Istio and Linkerd service
  meshes including mTLS validation, sidecar injection issues, traffic routing problems,
  and mesh observability for microservices.
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: code
  related-skills: agent-network-troubleshooting, cncf-istio, cncf-kubernetes-debugging
  role: implementation
  scope: implementation
  triggers: istio debugging, linkerd troubleshooting, service mesh issues, envoy errors,
    mTLS problems, traffic routing, sidecar injection, mesh monitoring
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
name: service-mesh-debugging
------
# Service Mesh Debugging

Implements comprehensive debugging and troubleshooting workflows for Istio and Linkerd service meshes including mTLS validation, sidecar injection issues, traffic routing problems, and mesh observability for microservices.

## TL;DR Checklist

- [ ] Verify service mesh control plane is healthy (istiod/destiny pods running)
- [ ] Check sidecar injection status on workload pods
- [ ] Validate mTLS configuration between services
- [ ] Review Envoy proxy logs for connection errors
- [ ] Examine traffic routing rules and virtual services
- [ ] Check network policies and firewall rules
- [ ] Validate service account tokens and RBAC permissions
- [ ] Use mesh observability tools (Kiali, Jaeger, Prometheus) for tracing

---

## When to Use

Use this skill when:

- Services in the mesh cannot communicate and you suspect service mesh misconfiguration
- You're experiencing mTLS handshake failures or certificate errors
- Sidecar proxies are not injecting or failing to start on pods
- Traffic routing rules (virtual services, destination rules) are not working as expected
- You need to debug Envoy proxy configuration or access logs
- Mesh observability (tracing, metrics, logs) is not functioning correctly

---

## When NOT to Use

Avoid this skill for:

- Basic Kubernetes networking issues without service mesh involvement (use `cncf-kubernetes-debugging` instead)
- Application-level bugs unrelated to mesh configuration
- Service mesh installation or upgrade procedures (use `cncf-istio` or Linkerd documentation)
- Performance tuning without specific debugging symptoms
- Security compliance audits (use dedicated security review skills)

---

## Core Workflow

1. **Control Plane Health Check** — Verify istiod or Linkerd control plane components are running and healthy. **Checkpoint:** All control plane pods in Running state with no restarts.

2. **Sidecar Injection Verification** — Check if sidecar proxies are properly injected into workload pods. **Checkpoint:** Pods show 2/2 containers (app + istio-proxy or linkerd-proxy).

3. **mTLS Validation** — Test and validate mutual TLS configuration between services. **Checkpoint:** mTLS status shows `STRICT` or `PERMISSIVE` and connections succeed.

4. **Traffic Routing Debug** — Examine virtual services, destination rules, and gateway configurations. **Checkpoint:** Routing rules match expected traffic patterns and no 404/503 errors.

5. **Proxy Log Analysis** — Review Envoy and Linkerd proxy logs for errors and warnings. **Checkpoint:** No connection refused, TLS handshake errors, or upstream timeouts in proxy logs.

6. **Observability Verification** — Confirm metrics, traces, and logs are flowing through the mesh. **Checkpoint:** Kiali graphs show traffic, Jaeger traces appear, Prometheus metrics are scraped.

---

## Implementation Patterns

### Pattern 1: Control Plane Health Check

**Description:** Verify the service mesh control plane (istiod or Linkerd) is operational before debugging workloads.

```bash
# Istio control plane health check
kubectl get pods -n istio-system
kubectl logs -n istio-system $(kubectl get pods -n istio-system -l app=istiod -o jsonpath='{.items[0].metadata.name}')
kubectl get deploy -n istio-system

# Linkerd control plane health check
kubectl get pods -n linkerd
linkerd check --proxy
linkerd check --proxy -w
linkerd status
```

#### ❌ BAD — Skipping control plane verification

```bash
# This assumes the mesh is working without checking
kubectl exec -it $(kubectl get pods -l app=myapp -o jsonpath='{.items[0].metadata.name}') -- curl http://other-service
# If this fails, you don't know if it's mesh config or application issue
```

#### ✅ GOOD — Verify control plane first

```bash
# 1. Check control plane pods are running
kubectl get pods -n istio-system
# Expected: istiod-xxx Running 1/1, istio-cni-node-xxx Running 1/1, etc.

# 2. Check control plane logs for errors
kubectl logs -n istio-system istiod-xxx | grep -i error

# 3. Only then debug workloads
kubectl get pods -l app=myapp
```

---

### Pattern 2: Sidecar Injection Status Check

**Description:** Verify sidecar proxies are injected and running alongside application containers.

```bash
# Check pod has sidecar injected (should show 2/2 containers)
kubectl get pods -l app=myapp

# Check sidecar container details
kubectl describe pod myapp-pod | grep -A 5 "istio-proxy\|linkerd-proxy"

# Verify sidecar logs are streaming
kubectl logs myapp-pod -c istio-proxy --tail=10
kubectl logs myapp-pod -c linkerd-proxy --tail=10

# Check for injection issues
kubectl get pod myapp-pod -o jsonpath='{.spec.containers[*].name}'
```

#### ❌ BAD — Not checking injection status

```bash
# Assuming injection worked without verification
kubectl exec myapp-pod -- curl http://backend:8080
# If this fails, is it injection or configuration?
```

#### ✅ GOOD — Verify injection before debugging

```bash
# 1. Check injection label on namespace
kubectl get namespace default -L istio-injection
kubectl get namespace default -L linkerd.io/inject

# 2. Check pod has sidecar
kubectl get pod myapp-pod
# Should show: myapp-pod 2/2 Running 0 5m

# 3. Check sidecar container exists
kubectl get pod myapp-pod -o jsonpath='{.spec.containers[*].name}'
# Should show: myapp istio-proxy or myapp linkerd-proxy
```

---

### Pattern 3: mTLS Validation

**Description:** Debug and validate mutual TLS configuration between services in the mesh.

```bash
# Check mTLS status for a service
istioctl proxy-config listener myapp-pod -o json | jq '.[] | select(.portValue == 8080)'

# Verify mTLS mode in destination rules
istioctl proxy-config destinationrule myapp-pod

# Check mTLS with curl (Istio)
kubectl exec $(kubectl get pods -l app=curl -o jsonpath='{.items[0].metadata.name}') -- curl -v https://myapp:8080/health

# Check mTLS with Linkerd
linkerd -n default check --proxy
linkerd -n default proxy-status

# Test mTLS connection with istioctl analyze
istioctl analyze

# Check certificate status
istioctl proxy-config secret myapp-pod | grep -A 5 "default"
```

#### ❌ BAD — Ignoring mTLS issues

```bash
# Making HTTP requests without checking mTLS
kubectl exec curl-pod -- curl http://myapp:8080
# May get connection refused or certificate errors if mTLS is misconfigured
```

#### ✅ GOOD — Validate mTLS configuration

```bash
# 1. Check destination rule mTLS mode
istioctl proxy-config destinationrule myapp-pod -o json | jq '.spec.trafficPolicy.tls.mode'

# 2. Check policy authentication
kubectl get policy -n default myapp-policy -o yaml

# 3. Test with mTLS enabled curl
kubectl exec curl-pod -- curl -v --cacert /etc/certs/root-cert.pem \
  --cert /etc/certs/cert-chain.pem \
  --key /etc/certs/key.pem https://myapp:8080/health
```

---

### Pattern 4: Traffic Routing Debug

**Description:** Debug virtual services, destination rules, and gateway configurations for traffic routing issues.

```bash
# List virtual services
istioctl proxy-config route myapp-pod

# Check specific route configuration
istioctl proxy-config route myapp-pod -o json | jq '.routes[] | select(.name == "default")'

# Debug destination rules
istioctl proxy-config destinationrule myapp-pod

# Check gateway configuration
kubectl get gateway -A
istioctl proxy-config listener myapp-pod --port 80

# Test traffic routing with istioctl
istioctl proxy-config route myapp-pod --name 8080 -o json

# Check envoy configuration
istioctl proxy-config listeners myapp-pod
istioctl proxy-config clusters myapp-pod
```

#### ❌ BAD — Not examining routing rules

```bash
# Simply testing connectivity without understanding routing
kubectl exec curl-pod -- curl http://myapp:8080
# If it fails, you don't know if it's a virtual service or destination rule issue
```

#### ✅ GOOD — Examine routing configuration

```bash
# 1. List all virtual services
istioctl proxy-config virtualservice myapp-pod

# 2. Check route for specific host
istioctl proxy-config route myapp-pod -o json | \
  jq '.routes[] | select(.match.prefix == "/") | .route.cluster'

# 3. Verify destination rule subset exists
istioctl proxy-config destinationrule myapp-pod -o json | \
  jq '.spec.subsets[] | .name'
```

---

### Pattern 5: Envoy Proxy Log Analysis

**Description:** Analyze Envoy proxy logs to identify connection issues, TLS errors, and routing problems.

```bash
# Get pod name
POD=$(kubectl get pods -l app=myapp -o jsonpath='{.items[0].metadata.name}')

# Check Envoy access logs
kubectl logs $POD -c istio-proxy | grep -E "^[0-9]|UPSTREAM_FAILURE|TLS"

# Check Envoy error logs
kubectl logs $POD -c istio-proxy | grep -i error

# Enable debug logging
istioctl debug log --level proxy:debug

# Check Envoy configuration
istioctl proxy-config listener $POD
istioctl proxy-config cluster $POD
istioctl proxy-config route $POD

# Check Envoy stats for errors
istioctl proxy-config stats $POD | grep -E "upstream|failure|error"
```

#### ❌ BAD — Ignoring proxy logs

```bash
# Not checking proxy logs for errors
kubectl exec curl-pod -- curl http://myapp:8080
# If it fails, you have no visibility into why
```

#### ✅ GOOD — Analyze proxy logs

```bash
# 1. Get proxy logs
kubectl logs $POD -c istio-proxy --tail=50 > proxy.log

# 2. Search for common errors
grep -E "(TLS|connection refused|reset|503|upstream)" proxy.log

# 3. Check connection pool stats
istioctl proxy-config stats $POD | grep -E "cluster.outbound|http.config_error"
```

---

### Pattern 6: Service Account and RBAC Debug

**Description:** Debug service account tokens and RBAC permissions that affect mesh communication.

```bash
# Check service account
kubectl get sa myapp-sa -o yaml

# Verify service account token is mounted
kubectl get pod myapp-pod -o jsonpath='{.spec.volumes[*].name}'

# Check RBAC policy
kubectl get policy -n default myapp-policy -o yaml

# Check AuthorizationPolicy (Istio 1.6+)
kubectl get authorizationpolicy -n default

# Debug RBAC with istioctl
istioctl analyze --include-service-mesh

# Check JWT token in pod
kubectl exec myapp-pod -- cat /var/run/secrets/tokens/istio-token
```

#### ❌ BAD — Ignoring service account issues

```bash
# Assuming service accounts are configured correctly
kubectl exec curl-pod -- curl http://myapp:8080
# May fail silently if RBAC is blocking traffic
```

#### ✅ GOOD — Verify service account and RBAC

```bash
# 1. Check service account exists
kubectl get sa myapp -o yaml

# 2. Check RBAC policy
kubectl get authorizationpolicy -n default

# 3. Test with specific service account
kubectl exec -it curl-pod -- curl -H "Authorization: Bearer $(cat /var/run/secrets/kubernetes.io/serviceaccount/token)" \
  http://myapp:8080
```

---

### Pattern 7: Mesh Observability Debug

**Description:** Debug metrics collection, distributed tracing, and service mesh observability tools.

```bash
# Check Prometheus scraping Istio metrics
kubectl get pods -n monitoring prometheus-k8s-0
kubectl exec -n monitoring prometheus-k8s-0 -- curl localhost:9090/api/v1/query?query=istio_requests_total

# Check Jaeger for traces
kubectl get pods -n tracing jaeger
linkerd traces --help

# Check Kiali dashboard
istioctl dashboard kiali

# Verify metrics are being collected
kubectl exec -n istio-system prometheus-xxx -- curl localhost:9090/api/v1/query?query=istio%7Bsource_service%3D%22myapp%22%7D

# Check trace data
kubectl exec -n tracing jaeger-xxx -- curl localhost:16686/api/traces?service=myapp

# Debug metrics with istioctl
istioctl analyze --metrics
```

#### ❌ BAD — Not verifying observability

```bash
# Assuming Kiali/Jaeger are working without checking
# If dashboard shows no data, you don't know if it's scraping or tracing issue
```

#### ✅ GOOD — Verify observability pipeline

```bash
# 1. Check Prometheus is scraping Istio
kubectl exec -n monitoring prometheus-0 -- curl localhost:9090/api/v1/query?query=up{job="istio-mesh"}

# 2. Check Kiali can access data
istioctl dashboard kiali --context

# 3. Generate test trace
kubectl exec -n default curl-pod -- curl http://myapp:8080
# Then check Jaeger for the trace
```

---

### Pattern 8: Network Policy and Firewall Debug

**Description:** Debug network policies and firewall rules that may block mesh traffic.

```bash
# Check network policies
kubectl get networkpolicies -n default

# Verify network policy allows mesh traffic
kubectl get networkpolicy -n default -o yaml | grep -A 10 "podSelector\|ingress"

# Check for iptables rules
kubectl exec myapp-pod -c istio-proxy -- iptables -L -n -v

# Verify CNI plugin is working
kubectl get pods -n kube-system | grep cni

# Check for Calico/Flannel issues
kubectl get felixconfigurations.crd.projectcalico.org
kubectl get networkpolicies.networking.k8s.io -n default

# Debug with istio-cni
kubectl get pods -n istio-system | grep istio-cni
kubectl logs -n istio-system istio-cni-node-xxx
```

#### ❌ BAD — Ignoring network policies

```bash
# Testing connectivity without checking network policies
kubectl exec curl-pod -- curl http://myapp:8080
# May fail due to network policy without realizing it
```

#### ✅ GOOD — Verify network configuration

```bash
# 1. List network policies
kubectl get networkpolicies -n default

# 2. Check if policy allows mesh traffic
kubectl get networkpolicy myapp-policy -n default -o yaml | grep -A 5 "ingress"

# 3. Check CNI logs
kubectl logs -n kube-system calico-node-xxx | grep -i error
```

---

## Constraints

### MUST DO

- Always verify control plane health before debugging workloads
- Check sidecar injection status before investigating application issues
- Validate mTLS configuration when services cannot communicate
- Examine Envoy proxy logs for connection errors and TLS handshake failures
- Use `istioctl analyze` or `linkerd check` for comprehensive validation
- Correlate mesh observability data (Kiali, Jaeger, Prometheus) with application logs
- Check network policies and firewall rules when traffic is unexpectedly blocked

### MUST NOT DO

- Assume sidecar injection is working without verifying pod container count
- Ignore control plane logs when debugging mesh-wide issues
- Skip mTLS validation when investigating connection failures
- Debug traffic routing without examining virtual service and destination rule configurations
- Rely solely on application logs without checking proxy logs
- Assume observability tools are working without verifying data ingestion
- Bypass service mesh entirely for debugging without isolating mesh-specific issues

---

## Output Template

When debugging service mesh issues, your response must include:

1. **Control Plane Status** — Output of control plane health checks (`kubectl get pods -n istio-system` or `linkerd status`)

2. **Sidecar Injection Verification** — Pod container count and sidecar proxy status (`kubectl get pods -l app=myapp` and proxy logs)

3. **mTLS Configuration** — Destination rule mTLS mode and authentication policy status (`istioctl proxy-config destinationrule` and `istioctl analyze`)

4. **Traffic Routing Analysis** — Virtual service and destination rule configuration matching expected patterns

5. **Proxy Log Summary** — Key error messages from Envoy or Linkerd proxy logs

6. **Observability Status** — Confirmation that metrics, traces, and logs are flowing through the mesh

7. **Recommended Action** — Specific command or configuration change based on findings

---

## Related Skills

| Skill | Purpose |
|---|---|
| `cncf-kubernetes-debugging` | For general Kubernetes networking issues before isolating mesh-specific problems |
| `cncf-istio` | For Istio-specific installation, configuration, and advanced features |
| `agent-network-troubleshooting` | For high-level network connectivity issues across any infrastructure |

---

## References

### Official Documentation

- [Istio Documentation](https://istio.io/latest/docs/) - Official Istio documentation
- [Linkerd Documentation](https://linkerd.io/2.15/reference/) - Official Linkerd documentation
- [Istio Troubleshooting Guide](https://istio.io/latest/docs/ops/troubleshooting/) - Official troubleshooting guide
- [Linkerd Troubleshooting](https://linkerd.io/2.15/reference/troubleshooting/) - Linkerd troubleshooting docs

### CLI Tools

- `istioctl` - Istio CLI for debugging and configuration
- `linkerd` - Linkerd CLI for verification and diagnostics
- `kubectl` - Kubernetes CLI for pod and resource inspection

### Common Commands Reference

```bash
# Istio debugging
istioctl analyze                    # Analyze mesh configuration
istioctl proxy-config               # View proxy configuration
istioctl debug log                  # Enable debug logging
istioctl dashboard kiali            # Open Kiali dashboard
istioctl proxy-status               # Get proxy synchronization status

# Linkerd debugging
linkerd check                       # Check mesh health
linkerd viz                         # Open Linkerd Viz dashboard
linkerd traces                      # View distributed traces
linkerd profile                     # Analyze service configuration

# Kubectl debugging
kubectl get pods -n istio-system    # Check control plane
kubectl get pods -l app=myapp       # Check workload pods
kubectl logs -c istio-proxy         # View proxy logs
```

---

## Quick Debug Matrix

| Symptom | Likely Cause | First Command to Run |
|---|---|---|
| No traffic between services | mTLS misconfiguration | `istioctl proxy-config destinationrule` |
| Sidecar not injected | Namespace label missing | `kubectl get namespace -L istio-injection` |
| 503 errors | Upstream connection failure | `kubectl logs -c istio-proxy` |
| Traffic not routing correctly | Virtual service misconfiguration | `istioctl proxy-config route` |
| No metrics in Kiali | Metrics collection issue | `istioctl dashboard kiali` |
| Traces not showing | Jaeger not collecting | `kubectl get pods -n tracing` |
| Connection refused | Network policy blocking | `kubectl get networkpolicies` |
| Certificate errors | mTLS certificate issue | `istioctl proxy-config secret` |

---

*This skill provides comprehensive debugging workflows for service mesh issues. Always start with control plane verification and work down to workload-specific issues.*
