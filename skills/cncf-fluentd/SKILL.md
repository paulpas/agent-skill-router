---
name: cncf-fluentd
description: Fluentd unified logging layer for collecting, transforming, and routing log data in cloud-native environments
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: cncf
  role: reference
  scope: infrastructure
  output-format: manifests
  triggers: fluentd, log collection, logging, unified logging, log routing
---

## Tutorial

This tutorial will guide you through installing, configuring, and using Fluentd for centralized logging collection.

### Prerequisites

Before beginning, ensure you have:
- A running Kubernetes cluster (minikube, kind, EKS, GKE, AKS)
- `kubectl` configured to access your cluster
- Basic understanding of logging concepts and Kubernetes architecture
- A logging destination (Elasticsearch, Fluentd, S3, etc.)

Verify your setup:

```bash
# Check cluster connectivity
kubectl cluster-info

# Verify kubectl configuration
kubectl get nodes

# Check cluster version
kubectl version --client --short
```

---

### 1. Installation

Fluentd can be installed in various ways depending on your environment and requirements.

#### Method 1: Using Helm (Recommended for Kubernetes)

```bash
# Add the Fluentd Helm repository
helm repo add fluent-stable https://fluent.github.io/helm-charts
helm repo add fluentd https://fluent.github.io/helm-charts

# Update repositories
helm repo update

# Install Fluentd with default configuration
helm install fluentd fluent-stable/fluentd \
  --namespace logging \
  --create-namespace \
  --wait

# Install with custom values
helm install fluentd fluent-stable/fluentd \
  --namespace logging \
  --create-namespace \
  --set fluentd.conf.type="s3" \
  --set output.host="elasticsearch.logging.svc.cluster.local"

# Verify installation
helm list -n logging
kubectl -n logging get pods
```

#### Method 2: Using kubectl apply (Direct Manifests)

```bash
# Download the Fluentd manifest
curl -O https://raw.githubusercontent.com/fluent/fluentd-kubernetes-daemonset/master/fluentd-daemonset-kubernetes-1.16.yaml

# Or use the simplified version
kubectl apply -f https://raw.githubusercontent.com/fluent/fluentd-kubernetes-daemonset/master/fluentd-daemonset-elasticsearch.yaml

# Verify deployment
kubectl get daemonset fluentd -n kube-system
kubectl get pods -n kube-system -l app=fluentd
```

#### Method 3: Installing Fluentd on Bare Metal

```bash
# Install Fluentd using RubyGems
gem install fluentd --no-document

# Or use td-agent (Fluentd's distribution)
# For Ubuntu/Debian
curl -fsSL https://toolbelt.treasuredata.com/sh/install-ubuntu-focal-td-agent4.sh | sh

# For CentOS/RHEL
curl -fsSL https://toolbelt.treasuredata.com/sh/install-redhat-centos-td-agent4.sh | sh

# Verify installation
td-agent --version
fluentd --version
```

#### Method 4: Using Docker

```bash
# Pull the Fluentd Docker image
docker pull fluent/fluentd:v1.16

# Run Fluentd with custom configuration
docker run -d \
  -p 24224:24224 \
  -v /path/to/fluent.conf:/fluentd/etc/fluent.conf \
  -v /var/log:/fluentd/log \
  fluent/fluentd:v1.16

# Verify container is running
docker ps | grep fluentd
```

---

### 2. Basic Configuration

#### Fluentd Configuration File Structure

```yaml
# fluent.conf - Basic configuration
<system>
  log_level info
  suppress_config_dump true
</system>

# Source: Kubernetes container logs
<source>
  @type tail
  path /var/log/containers/*.log
  pos_file /var/log/fluentd-containers.log.pos
  tag kubernetes.*
  read_from_head true
  <parse>
    @type json
    time_key time
    time_format %Y-%m-%dT%H:%M:%S.%NZ
  </parse>
</source>

# Filter: Enrich logs with Kubernetes metadata
<filter kubernetes.**>
  @type kubernetes_metadata
  kubernetes_url https://kubernetes.default.svc
  verify_ssl false
</filter>

# Match: Send logs to Elasticsearch
<match **>
  @type elasticsearch
  host elasticsearch.logging.svc.cluster.local
  port 9200
  logstash_format true
  logstash_prefix kubernetes
  flatten_hashes true
  <buffer>
    @type file
    path /var/log/fluentd/buffer
    flush_interval 5s
    flush_thread_count 2
    retry_type exponential_backoff
  </buffer>
</match>
```

#### Environment Variables for Configuration

```bash
# Set environment variables for runtime configuration
export FLUENTD_CONF=fluent.conf
export FLUENTD_ARGS=--no-config-autoreload

# Kubernetes environment variables (for kubernetes_metadata filter)
export KUBERNETES_SERVICE_HOST=kubernetes.default.svc
export KUBERNETES_SERVICE_PORT=443
```

#### ConfigMap for Kubernetes

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
  namespace: logging
data:
  fluent.conf: |
    <system>
      log_level info
    </system>
    
    <source>
      @type forward
      port 24224
      bind 0.0.0.0
    </source>
    
    <match **>
      @type file
      path /var/log/fluentd/output
      append true
      <format>
        @type json
      </format>
      <buffer>
        @type file
        path /var/log/fluentd/buffer
        flush_interval 1s
      </buffer>
    </match>
  
  parsers.conf: |
    <parse>
      @type json
      time_key time
      time_format %Y-%m-%dT%H:%M:%S.%NZ
    </parse>
```

---

### 3. Usage Examples

#### Viewing Fluentd Logs

```bash
# View Fluentd logs in Kubernetes
kubectl -n logging logs -f deployment/fluentd

# Follow Fluentd logs with timestamp
kubectl -n logging logs -f deployment/fluentd --timestamps

# View logs from a specific pod
kubectl -n logging logs fluentd-xyz123 -f

# Check Fluentd pod status
kubectl -n logging get pods -l app=fluentd
```

#### Testing Log Collection

```bash
# Create a test pod to generate logs
kubectl run test-logger --image=busybox --restart=Never -- tail -f /dev/null

# In another terminal, send a test log
kubectl exec test-logger -- sh -c 'echo '{"level":"info","message":"Test log message"}' | fluent-cat test.tag'

# Verify the log was collected
kubectl -n logging logs -l app=fluentd | grep "Test log"
```

#### Loading Configuration from ConfigMap

```bash
# Create ConfigMap from fluent.conf
kubectl create configmap fluentd-config \
  --from-file=fluent.conf \
  --namespace=logging

# Or update existing ConfigMap
kubectl create configmap fluentd-config \
  --from-file=fluent.conf \
  --namespace=logging \
  --dry-run=client \
  -o yaml | kubectl apply -f -

# Verify ConfigMap
kubectl -n logging get configmap fluentd-config -o yaml
```

#### Setting up Multiple Outputs

```yaml
# Multiple output configuration
<match **>
  @type copy
  <store>
    @type elasticsearch
    host elasticsearch.logging.svc.cluster.local
    port 9200
    logstash_format true
  </store>
  <store>
    @type s3
    s3_bucket my-logs-bucket
    s3_region us-east-1
    path logs/%Y/%m/%d/
    <format>
      @type json
    </format>
    <buffer>
      @type file
      path /var/log/fluentd/s3
    </buffer>
  </store>
  <store>
    @type stdout
  </store>
</match>
```

---

### 4. Common Operations

#### Monitoring Fluentd

```bash
# Check Fluentd metrics (if Prometheus plugin is enabled)
kubectl -n logging get pods -l app=fluentd -o wide

# View Fluentd pod resources
kubectl -n logging describe pod -l app=fluentd

# Check Fluentd configuration reload status
kubectl -n logging logs deployment/fluentd | grep "config file"

# View Fluentd buffer status
kubectl -n logging exec -it deployment/fluentd -- ls -la /var/log/fluentd/buffer
```

#### Restarting Fluentd DaemonSet

```bash
# Rolling restart of Fluentd pods
kubectl -n logging delete pods -l app=fluentd

# Wait for pods to restart
kubectl -n logging rollout status daemonset/fluentd

# Verify all pods are running
kubectl -n logging get pods -l app=fluentd
```

#### Updating Configuration

```bash
# Update ConfigMap
kubectl create configmap fluentd-config \
  --from-file=fluent.conf \
  --namespace=logging \
  --dry-run=client \
  -o yaml | kubectl apply -f -

# Delete pods to trigger reload
kubectl -n logging delete pods -l app=fluentd
```

#### Scaling Fluentd

```bash
# Fluentd typically runs as a DaemonSet (one per node)
# To scale, update the DaemonSet
kubectl -n logging patch daemonset fluentd -p '{"spec":{"template":{"spec":{"containers":[{"name":"fluentd","resources":{"limits":{"cpu":"500m","memory":"512Mi"}}}]}}}}'

# Or edit the daemonset
kubectl -n logging edit daemonset fluentd
```

#### Backup and Restore

```bash
# Backup Fluentd configuration
kubectl -n logging get configmap fluentd-config -o yaml > fluentd-config-backup.yaml

# Export buffer state (if needed)
kubectl -n logging exec deployment/fluentd -- tar czf /tmp/buffer-backup.tar.gz /var/log/fluentd/buffer

# Restore configuration
kubectl -n logging apply -f fluentd-config-backup.yaml
```

---

### 5. Best Practices

#### Configuration Best Practices

1. **Use Separate Sources**: Define separate `<source>` blocks for different log types
2. **Filter Early**: Apply filters as close to the source as possible
3. **Buffer Properly**: Configure buffer to prevent data loss during outages
4. **Use Tags**: Use meaningful tags for route matching
5. **Separate Concerns**: Keep configuration modular with @include directives

#### Performance Optimization

1. **Optimize Buffer**: Adjust buffer settings based on log volume
   ```yaml
   <buffer>
     @type file
     flush_interval 5s
     flush_thread_count 2
     chunk_limit_size 8MB
     queued_chunks_limit_size 32
   </buffer>
   ```

2. **Use Multiple Threads**: Configure flush_thread_count for parallel processing
3. **Reduce Parsing**: Use forward input to receive pre-parsed logs when possible
4. **Compress Buffers**: Enable compression for large buffers

#### Security Best Practices

1. **RBAC**: Configure proper RBAC for Fluentd service account
2. **Network Policies**: Restrict Fluentd network access to required destinations
3. **Secrets Management**: Use Kubernetes Secrets for sensitive configuration
4. **Log Redaction**: Implement filters to redact sensitive data
5. **TLS Encryption**: Use TLS for log transmission to external systems

#### Monitoring and Alerting

1. **Prometheus Metrics**: Enable Fluentd's Prometheus plugin
   ```yaml
   <source>
     @type prometheus
     bind 0.0.0.0
     port 24231
   </source>
   ```

2. **Health Checks**: Configure readiness/liveness probes
3. **Alert on Backlog**: Monitor buffer size and alert on growth
4. **Log Volume Monitoring**: Track log volume trends

#### Kubernetes-Specific Tips

1. **Use DaemonSet**: Deploy Fluentd as a DaemonSet for node-level log collection
2. **Namespace Isolation**: Use separate Fluentd instances per namespace for isolation
3. **Label Selectors**: Use label selectors to filter logs by application
4. **Resource Limits**: Set appropriate CPU/memory limits based on cluster size

---

## Examples

### Basic Configuration


```yaml
# Basic configuration example
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
  namespace: logging
data:
  fluent.conf: |
    <system>
      log_level info
    </system>
    
    <source>
      @type forward
      port 24224
      bind 0.0.0.0
    </source>
    
    <match **>
      @type file
      path /var/log/fluentd/output
      append true
      <format>
        @type json
      </format>
      <buffer>
        @type file
        path /var/log/fluentd/buffer
        flush_interval 1s
      </buffer>
    </match>
```

### Kubernetes Deployment


```yaml
# Fluentd DaemonSet for Kubernetes
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentd
  namespace: logging
  labels:
    app: fluentd
spec:
  selector:
    matchLabels:
      app: fluentd
  template:
    metadata:
      labels:
        app: fluentd
    spec:
      containers:
      - name: fluentd
        image: fluent/fluentd:v1.16
        env:
        - name: FLUENT_UID
          value: "0"
        resources:
          limits:
            memory: "512Mi"
            cpu: "500m"
        volumeMounts:
        - name: config-volume
          mountPath: /fluentd/etc
        - name: varlog
          mountPath: /var/log
      volumes:
      - name: config-volume
        configMap:
          name: fluentd-config
      - name: varlog
        hostPath:
          path: /var/log
```

### Kubernetes Service


```yaml
# Kubernetes service for Fluentd
apiVersion: v1
kind: Service
metadata:
  name: fluentd
  namespace: logging
spec:
  selector:
    app: fluentd
  ports:
  - protocol: TCP
    port: 24224
    targetPort: 24224
    name: fluentd
  - protocol: TCP
    port: 24231
    targetPort: 24231
    name: prometheus
  type: ClusterIP
```

### Kubernetes Container Log Collection

```yaml
# Collect logs from Kubernetes containers
<source>
  @type tail
  path /var/log/containers/*.log
  pos_file /var/log/fluentd-containers.log.pos
  tag kubernetes.*
  read_from_head true
  <parse>
    @type json
    time_key time
    time_format %Y-%m-%dT%H:%M:%S.%NZ
  </parse>
</source>

# Enrich with Kubernetes metadata
<filter kubernetes.**>
  @type kubernetes_metadata
  kubernetes_url https://kubernetes.default.svc
  verify_ssl false
</filter>

# Send to Elasticsearch
<match kubernetes.**>
  @type elasticsearch
  host elasticsearch.logging.svc.cluster.local
  port 9200
  logstash_format true
  logstash_prefix kubernetes
  <buffer>
    @type file
    path /var/log/fluentd/buffer
    flush_interval 5s
  </buffer>
</match>
```

### Multi-Output Configuration

```yaml
# Copy logs to multiple destinations
<match **>
  @type copy
  <store>
    @type elasticsearch
    host es1.example.com
    port 9200
  </store>
  <store>
    @type elasticsearch
    host es2.example.com
    port 9200
  </store>
  <store>
    @type s3
    s3_bucket my-logs
    s3_region us-east-1
  </store>
</match>
```