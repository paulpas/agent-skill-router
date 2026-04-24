---
name: cncf-coredns
description: Coredns in Cloud-Native Engineering - CoreDNS is a DNS server that chains
  plugins
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: cncf
  role: reference
  scope: infrastructure
  output-format: manifests
  triggers: cloud-native, coredns, engineering, server
---


# Coredns in Cloud-Native Engineering

**Category:** cncf  
**Status:** Active  
**Stars:** 14,001  
**Last Updated:** 2026-04-21  
**Primary Language:** Go  
**Documentation:** [https://coredns.io/manual/](https://coredns.io/manual/)  

---

## Purpose and Use Cases

Coredns is a core component of the cloud-native ecosystem, serving as a DNS server and service discovery system that provides flexible, plugin-based architecture for Kubernetes DNS needs.

### What Problem Does It Solve?

Service discovery requirements in Kubernetes, including DNS-based service lookup, custom DNS zones, and integration with Kubernetes services and endpoints.

### When to Use This Project

Use CoreDNS when deploying Kubernetes clusters and need DNS-based service discovery. It's the default DNS server for most Kubernetes distributions.

### Key Use Cases


- Kubernetes DNS service discovery
- Custom DNS zones and records
- DNS-based service discovery
- Integration with Kubernetes endpoints and services
- Reverse DNS lookups


---

## Architecture Design Patterns

### Core Components


- **Server**: DNS server instance
- **Plugin Chain**: Ordered list of plugins that handle queries
- **Zones**: DNS zones served by the server
- **Caching**: Response caching for improved performance
- **Service Discovery**: Kubernetes plugin for DNS-based discovery
- **DNSSEC**: DNS security extensions support


### Component Interactions


1. **Client → CoreDNS**: DNS query
2. **CoreDNS → Plugin Chain**: Processes query through plugins
3. **Kubernetes Plugin → API Server**: Reads service/endpoint data
4. **Cache Plugin**: Caches responses
5. **Forward Plugin → Upstream DNS**: For external queries
6. **CoreDNS → Client**: Returns DNS response


### Data Flow Patterns


1. **DNS Query**: Query received → Plugin chain → Response returned
2. **Kubernetes Plugin**: Service query → API Server → Service/Endpoint data → DNS response
3. **Cache**: Query → Cache check → Backend lookup → Cache update → Response


### Design Principles


- **Plugin Architecture**: Flexible, composable functionality
- **DNS Standard Compliance**: Follows RFC specifications
- **Kubernetes Integration**: First-class Kubernetes support
- **Performance**: Optimized for speed and efficiency
- **Configuration as Code**: YAML-based configuration


---

## Integration Approaches

### Integration with Other CNCF Projects


- **Kubernetes**: Default DNS server integration
- **etcd**: Backend storage plugin
- **Prometheus**: Metrics export
- **CNI**: Network configuration


### API Patterns


- **DNS Protocol**: Standard DNS queries
- **GRPC Admin API**: Management interface
- **Health Check API**: Plugin health monitoring


### Configuration Patterns


- **Corefile**: Main configuration file
- **Plugin Directives**: Configuration per plugin
- **Kubernetes Config**: Cluster config


### Extension Mechanisms


- **Plugins**: Extend functionality
- **Custom Plugins**: Go plugin development
- **Configuration Blocks**: Per-zone config


---

## Common Pitfalls and How to Avoid Them

### Misconfigurations


- **Kubernetes Plugin**: Incorrect cluster domain
- **Plugin Order**: Incorrect plugin chain order
- **Cache Configuration**: Incorrect cache size
- **Forward Configuration**: Incorrect upstream DNS


### Performance Issues


- **Cache Misses**: Low cache hit rate
- **Query Latency**: Slow upstream DNS
- **Memory Usage**: Large cache size
- **Kubernetes API Calls**: Frequent API queries


### Operational Challenges


- **Service Discovery**: Kubernetes API rate limits
- **Cache Management**: Cache invalidation strategies
- **High Availability**: Multiple instances
- **Monitoring**: DNS metrics collection


### Security Pitfalls


- **DNS Tunneling**: Exfiltration through DNS
- **Access Control**: Open DNS resolver
- **Cache Poisoning**: Without DNSSEC
- **Query Logging**: Sensitive data in logs


---

## Coding Practices

### Idiomatic Configuration


- **Corefile**: One file per server
- **Plugin Blocks**: Organized plugin config
- **Kubernetes Config**: Integrated with K8s


### API Usage Patterns


- **dig/kdig**: DNS queries
- **CoreDNS CLI**: Server management
- **Admin API**: Configuration management


### Observability Best Practices


- **Metrics**: Query and latency metrics
- **Access Logs**: DNS query logs
- **Plugin Metrics**: Per-plugin stats
- **Debug Commands**: Server info


### Testing Strategies


- **Unit Tests**: Plugin tests
- **Integration Tests**: DNS behavior
- **Performance Tests**: Query throughput
- **Compatibility Tests**: DNS standards


### Development Workflow


- **Development**: CoreDNS development setup
- **Testing**: Go tests, plugin tests
- **Debugging**: CoreDNS debug commands
- **Deployment**: Helm, DaemonSet
- **CI/CD**: GitHub Actions, test coverage
- **Tools**: CoreDNS binary, kubectl


---

## Fundamentals

### Essential Concepts


- **Zone**: DNS zone served by CoreDNS
- **Plugin**: Functionality module
- **Chain**: Ordered list of plugins
- **Cache**: Response caching
- **Forward**: Query forwarding to upstream
- **Kubernetes Plugin**: Kubernetes integration
- **Service**: Kubernetes service
- **Endpoint**: Pod backing a service
- **TTL**: Time-to-live for DNS records
- **SRV**: Service discovery records


### Terminology Glossary


- **Zone**: DNS zone served
- **Plugin**: Functionality module
- **Chain**: Ordered plugin list
- **Cache**: Response cache
- **Forward**: Upstream forwarding
- **Service**: K8s service
- **Endpoint**: Pod backing service
- **TTL**: Record time-to-live
- **SRV**: Service record
- **Corefile**: Main config


### Data Models and Types


- **Zone Config**: Zone configuration
- **Plugin Config**: Plugin configuration
- **Service**: Service definition
- **Endpoint**: Endpoint definition
- **Cache Entry**: Cached DNS record
- **Forward Config**: Forwarder configuration


### Lifecycle Management


- **Query Lifecycle**: Receive → Process → Response
- **Cache Lifecycle**: Store → Expire → Invalidate
- **Plugin Lifecycle**: Configure → Execute → Handle
- **Service Discovery Lifecycle**: Watch → Update → Respond


### State Management


- **Cache State**: DNS records
- **Zone State**: Zone data
- **Service State**: Kubernetes services
- **Plugin State**: Per-plugin state


---

## Scaling and Deployment Patterns

### Horizontal Scaling


- **Replica Scaling**: Multiple CoreDNS pods
- **Cache Scaling**: Cache size configuration
- **Forward Pool Scaling**: Upstream DNS pools


### High Availability


- **Multiple Replicas**: Multiple CoreDNS pods
- **Service Load Balancing**: Kubernetes service load balancing
- **Cache HA**: Per-instance caching


### Production Deployments


- **Production Configuration**: Cluster-aware setup
- **Caching Strategy**: Cache size optimization
- **Load Balancing**: Service load balancing
- **Monitoring**: DNS query metrics
- **Security**: DNSSEC, rate limiting


### Upgrade Strategies


- **Plugin Upgrade**: Plugin version compatibility
- **Configuration Changes**: Zero-downtime config update
- **Rolling Update**: Pod rolling upgrade


### Resource Management


- **Cache Memory**: Cache size configuration
- **CPU Configuration**: Query processing threads
- **Query Rate Limiting**: Rate limiting configuration


---

## Additional Resources

- **Official Documentation:** [https://coredns.io/manual/](https://coredns.io/manual/)
- **GitHub Repository:** [github.com/coredns/coredns](https://github.com/coredns/coredns)
- **CNCF Project Page:** [cncf.io/projects/coredns/](https://www.cncf.io/projects/coredns/)
- **Community:** Check the GitHub repository for community channels
- **Versioning:** Refer to project's release notes for version-specific features

---

## Examples

### Basic Kubernetes Service Discovery

```yaml
# Corefile for Kubernetes service discovery
.:53 {
    errors
    health {
       lameduck 5s
    }
    ready
    kubernetes cluster.local in-addr.arpa ip6.arpa {
       pods insecure
       fallthrough in-addr.arpa ip6.arpa
       ttl 30
    }
    prometheus :9153
    forward . /etc/resolv.conf {
       max_concurrent 1000
    }
    cache 30
    loop
    reload
    loadbalance
}
```

### Custom DNS Records

```yaml
# Add custom A records
.:53 {
    errors
    health
    kubernetes cluster.local in-addr.arpa ip6.arpa {
       pods insecure
       fallthrough in-addr.arpa ip6.arpa
    }
    forward . /etc/resolv.conf
    cache 30
    loop
    reload
    loadbalance
    
    # Custom records
    rewrite continue {
      name regex (.*)\.internal\.example\.com {1}.svc.cluster.local
    }
    file /etc/coredns/zones/example.com.cluster.local {
      reload 5s
    }
}
```

### Conditional Forwarding

```yaml
# Forward specific domains to upstream DNS
.:53 {
    errors
    health
    kubernetes cluster.local in-addr.arpa ip6.arpa {
       pods insecure
       fallthrough in-addr.arpa ip6.arpa
    }
    
    # Conditional forwarders
    forward . /etc/resolv.conf
    forward . 8.8.8.8 8.8.4.4 {
       protocol prefer_udp
    }
    forward example.com 10.0.0.1
    
    cache 30
    loop
    reload
    loadbalance
}
```

## Tutorial

This tutorial will guide you through installing, configuring, and using CoreDNS for Kubernetes service discovery.

### Prerequisites

Before beginning, ensure you have:
- A running Kubernetes cluster (minikube, kind, EKS, GKE, AKS)
- `kubectl` configured with cluster-admin permissions
- Basic understanding of DNS and Kubernetes networking

Verify your setup:

```bash
# Check cluster connectivity
kubectl cluster-info

# Verify kubectl configuration
kubectl get nodes

# Check CoreDNS status (Kubernetes DNS)
kubectl -n kube-system get pods -l k8s-app=kube-dns
```

---

### 1. Installation

CoreDNS is typically installed as the default DNS server in Kubernetes clusters. This section covers installing CoreDNS as a standalone DNS server or modifying the existing Kubernetes DNS.

#### Method 1: Verify Kubernetes CoreDNS Installation

```bash
# Check if CoreDNS is running in kube-system
kubectl -n kube-system get pods -l k8s-app=kube-dns

# Check CoreDNS deployment
kubectl -n kube-system get deployment coredns

# Verify DNS service
kubectl -n kube-system get svc kube-dns
```

#### Method 2: Installing CoreDNS Standalone (Non-Kubernetes)

```bash
# Download CoreDNS binary
curl -L https://github.com/coredns/coredns/releases/download/v1.11.1/coredns_1.11.1_linux_amd64.tgz | tar xz

# Move to PATH
sudo mv coredns /usr/local/bin/

# Verify installation
coredns -version
```

#### Method 3: Install via Helm

```bash
# Add CoreDNS Helm repository
helm repo add coredns https://coredns.github.io/helm

# Update repositories
helm repo update

# Install CoreDNS
helm install coredns coredns/coredns \
  --namespace kube-system \
  --create-namespace \
  --wait

# Verify installation
helm list -n kube-system
kubectl -n kube-system get pods -l app=coredns
```

#### Method 4: Deploy to Kubernetes

```bash
# Generate CoreDNS manifest for Kubernetes
kubectl apply -f https://raw.githubusercontent.com/coredns/deployment/master/kubernetes/coredns.yaml.sed

# Or use the deployment script
curl -sSL https://coredns.io/deploy.sh | bash -s - 1.11.1

# Verify deployment
kubectl -n kube-system get pods -l k8s-app=kube-dns
```

---

### 2. Basic Configuration

#### Corefile Configuration

```yaml
# Default Corefile configuration for Kubernetes
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    .:53 {
        errors
        health {
           lameduck 5s
        }
        ready
        kubernetes cluster.local in-addr.arpa ip6.arpa {
           pods insecure
           fallthrough in-addr.arpa ip6.arpa
           ttl 30
        }
        prometheus :9153
        forward . /etc/resolv.conf
        cache 30
        loop
        reload
        loadbalance
    }
```

#### Custom DNS Zones

```bash
# Create custom CoreDNS configuration
cat > Corefile <<EOF
cluster.local:53 {
    errors
    health {
       lameduck 5s
    }
    kubernetes cluster.local in-addr.arpa ip6.arpa {
       pods insecure
       fallthrough in-addr.arpa ip6.arpa
    }
    prometheus :9153
    forward . /etc/resolv.conf
    cache 30
}

example.com:53 {
    file /etc/coredns/zones/example.com.db
}

.:53 {
    forward . 8.8.8.8:53
    cache 30
}
EOF

# Apply configuration
kubectl create configmap coredns-custom --from-file=Corefile -n kube-system
```

#### Plugin Configuration

```yaml
# CoreDNS with custom plugins
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    .:53 {
        errors
        health
        kubernetes cluster.local in-addr.arpa ip6.arpa {
           pods insecure
           fallthrough in-addr.arpa ip6.arpa
        }
        prometheus :9153
        forward . 8.8.8.8:53 8.8.4.4:53
        cache 30
        reload
        loadbalance
    }

# External plugin: rewrite
    rewrite name regex (.+)\.example\.com backend-{}.internal.local

# External plugin: auto
    auto {
        directory /etc/coredns/zones
        reload 10s
    }
EOF
```

---

### 3. Usage Examples

#### Basic DNS Queries

```bash
# Query a service in Kubernetes
kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup kubernetes.default

# Query a specific service
kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup my-service.default.svc.cluster.local

# Query external domain
kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup google.com

# Using dig
kubectl run -it --rm debug --image=busybox --restart=Never -- dig kubernetes.default.svc.cluster.local
```

#### Debugging DNS Issues

```bash
# Test DNS resolution from a pod
kubectl run -it --rm debug --image=busybox --restart=Never -- sh
# Inside pod:
# nslookup kubernetes.default
# nslookup my-service.default.svc.cluster.local

# Check CoreDNS logs
kubectl -n kube-system logs -l k8s-app=kube-dns

# Check endpoint slices
kubectl -n kube-system get endpointslices -l k8s-app=kube-dns

# Check service cluster IP
kubectl get svc kubernetes -o yaml | grep clusterIP
```

#### Testing Custom Zones

```bash
# Deploy a test pod with custom DNS
cat > test-pod.yaml <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: test-dns
spec:
  containers:
  - name: test
    image: busybox
    command: ["sleep", "3600"]
  dnsPolicy: "None"
  dnsConfig:
    nameservers:
    - 10.96.0.10
    searches:
    - svc.cluster.local
    - cluster.local
EOF

kubectl apply -f test-pod.yaml
kubectl exec -it test-dns -- nslookup kubernetes.default
```

#### Using CoreDNS Metrics

```bash
# Check CoreDNS metrics
kubectl -n kube-system port-forward svc/kube-dns 9153:9153

# Query metrics
curl http://localhost:9153/metrics | grep coredns_

# Prometheus query for DNS queries
curl -s 'http://localhost:9153/metrics' | grep 'coredns_dns_requests_total'
```

---

### 4. Common Operations

#### Monitoring CoreDNS

```bash
# Check pod status
kubectl -n kube-system get pods -l k8s-app=kube-dns

# Check resource usage
kubectl -n kube-system top pods -l k8s-app=kube-dns

# View metrics
kubectl -n kube-system logs -l k8s-app=kube-dns

# Check endpoints
kubectl -n kube-system get endpoints kube-dns
```

#### Scaling CoreDNS

```bash
# Scale CoreDNS deployment
kubectl -n kube-system scale deployment coredns --replicas=3

# Verify scaling
kubectl -n kube-system get pods -l k8s-app=kube-dns

# Check horizontal pod autoscaler
kubectl -n kube-system get hpa coredns
```

#### Updating CoreDNS Configuration

```bash
# Edit CoreDNS ConfigMap
kubectl -n kube-system edit configmap coredns

# Restart CoreDNS pods
kubectl -n kube-system rollout restart deployment coredns

# Verify update
kubectl -n kube-system rollout status deployment coredns

# Check CoreDNS pods
kubectl -n kube-system get pods -l k8s-app=kube-dns
```

#### Backing Up Configuration

```bash
# Backup CoreDNS config
kubectl -n kube-system get configmap coredns -o yaml > coredns-config-backup.yaml

# Backup zone files (if using custom zones)
kubectl -n kube-system exec -c coredns -l k8s-app=kube-dns -- tar czf /tmp/zones.tar.gz /etc/coredns/zones

# Download backup
kubectl -n kube-system cp kube-system/coredns-xxxxx:/tmp/zones.tar.gz ./zones-backup.tar.gz
```

---

### 5. Best Practices

#### Configuration Best Practices

1. **Use Default Kubernetes DNS**: Trust Kubernetes' managed CoreDNS for cluster DNS
2. **Configure Appropriate TTLs**: Set cache TTLs based on your update frequency
3. **Resource Limits**: Set CPU and memory limits for CoreDNS pods
4. **Zone Configuration**: Use explicit zone definitions for custom domains
5. **Forward Configuration**: Configure multiple upstream DNS servers for redundancy
6. **Logging Levels**: Configure appropriate log levels for debugging
7. **Separate Concerns**: Use separate instances for different purposes
8. **Version Management**: Keep CoreDNS updated with security patches

#### Performance Best Practices

1. **Caching**: Enable caching to reduce upstream queries
2. **Load Balancing**: Use loadbalance plugin for multiple upstreams
3. **Connection Pooling**: Configure upstream connection pool size
4. **Response Rate Limiting**: Use rate plugin to prevent abuse
5. **Worker Threads**: Configure worker threads based on CPU
6. **Memory Management**: Monitor and optimize memory usage
7. **DNS Response Size**: Configure maximum response size
8. **Negative Caching**: Configure appropriate negative cache TTL

#### Security Best Practices

1. **Enable DNSSEC**: Validate DNS responses with DNSSEC
2. **Network Policies**: Restrict DNS access with network policies
3. **Access Control**: Configure access control for admin API
4. **Log Sanitization**: Avoid logging sensitive query data
5. **Rate Limiting**: Implement rate limiting to prevent abuse
6. **Firewall Rules**: Restrict DNS traffic to expected ports
7. **Certificate Management**: Use secure certificates for TLS
8. **Audit Logging**: Enable audit logging for compliance

#### Troubleshooting Best Practices

1. **Check Pod Status**: Always verify CoreDNS pod health first
2. **Review Logs**: Check CoreDNS logs for errors
3. **Test Resolution**: Use test pods to verify DNS
4. **Endpoint Verification**: Check service endpoints
5. **Resource Monitoring**: Monitor CPU and memory usage
6. **Config Validation**: Validate Corefile syntax
7. **Network Policies**: Verify network policies aren't blocking
8. **Service Verification**: Ensure kube-dns service is running

**Cause:** CoreDNS not properly configured or pods not ready

**Solution:**

```bash
# Check CoreDNS pods status
kubectl -n kube-system get pods -l k8s-app=kube-dns

# Check endpoints
kubectl -n kube-system get endpoints kube-dns

# Restart CoreDNS
kubectl -n kube-system rollout restart deployment coredns

# Check DNS pod logs
kubectl -n kube-system logs -l k8s-app=kube-dns
```

### High DNS query latency

**Cause:** Cache misconfiguration or upstream DNS issues

**Solution:**

```bash
# Increase cache size
# In Corefile, increase cache TTL
cache 3600

# Check upstream DNS
# Test direct query
nslookup kubernetes.default.svc.cluster.local 10.96.0.10

# Monitor cache hit ratio
kubectl -n kube-system exec <coredns-pod> -- curl localhost:9153/metrics | grep dns_cache_hits_total
```

### DNS loop detected

**Cause:** Incorrect CoreDNS configuration causing infinite loops

**Solution:**

```bash
# Remove loop detection (if false positive)
# Add 'loop off' to Corefile
.:53 {
    errors
    health
    kubernetes cluster.local in-addr.arpa ip6.arpa
    forward . /etc/resolv.conf
    loop off  # Disable loop detection
    cache 30
    reload
}

# Or fix configuration to prevent actual loops
```

### External DNS resolution failing

**Cause:** Upstream DNS server issues or network policies

**Solution:**

```bash
# Check upstream DNS
kubectl -n kube-system exec -it <pod> -- nslookup google.com 8.8.8.8

# Configure specific upstream servers
forward . 8.8.8.8 1.1.1.1

# Check network policies
kubectl get networkpolicies --all-namespaces

# Test DNS from cluster
kubectl run -it --rm --image=busybox debug -- nslookup google.com
```

### CoreDNS crashes with OOM

**Cause:** Insufficient memory allocation

**Solution:**

```bash
# Increase memory limit in deployment
kubectl -n kube-system set resources deployment coredns   --limits=memory=256Mi   --requests=memory=128Mi

# Reduce cache size
cache 1800

# Limit concurrent queries
forward . /etc/resolv.conf {
   max_concurrent 500
}
```
*Content generated automatically. Verify against official documentation before production use.*

## Troubleshooting

### DNS queries returning NXDOMAIN for valid services

**Cause:** Kubernetes service not found, CoreDNS not watching correct namespace, or service endpoint missing

**Solution:** Verify service exists with `kubectl get svc`, check CoreDNS logs, and ensure endpoints exist for the service.


### DNS resolution timing out

**Cause:** Upstream DNS servers unreachable, CoreDNS not responding, or network issues between pods and CoreDNS

**Solution:** Test CoreDNS connectivity from pod, verify upstream DNS servers are reachable, and check network policies allowing DNS traffic.


### Incorrect DNS responses or stale data

**Cause:** Cache misconfiguration, CoreDNS not reloading configuration, or upstream DNS returning wrong data

**Solution:** Adjust cache TTL settings, force CoreDNS reload, and verify upstream DNS server responses.


### CoreDNS pods crashing or restarting

**Cause:** Configuration errors, resource constraints, or file descriptor limits

**Solution:** Validate Corefile syntax, check pod logs for errors, increase resource limits, and raise file descriptor limits.


### Service discovery not working for external domains

**Cause:** Forward plugin not configured, upstream DNS blocking requests, or firewall rules blocking DNS

**Solution:** Configure forward plugin for external domains, verify upstream DNS configuration, and ensure network allows DNS queries.

