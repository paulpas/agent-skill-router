---
name: cncf-prometheus
description: Prometheus in Cloud-Native Engineering - The Prometheus monitoring system and time series database.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: cncf
  role: reference
  scope: infrastructure
  output-format: manifests
  triggers: prometheus, cloud-native, engineering, monitoring
---

# Prometheus in Cloud-Native Engineering

**Category:** alerting  
**Status:** Active  
**Stars:** 63,688  
**Last Updated:** 2026-04-22  
**Primary Language:** Go  
**Documentation:** [https://prometheus.io/docs/](https://prometheus.io/docs/)  

---

## Purpose and Use Cases

Prometheus is a core component of the cloud-native ecosystem, serving as a monitoring and alerting toolkit designed for reliability and scalability in dynamic cloud-native environments.

### What Problem Does It Solve?

Complex monitoring requirements in dynamic cloud environments with frequent scale changes, microservices, and ephemeral containers. It provides reliable metrics collection, storage, and alerting.

### When to Use This Project

Use Prometheus when you need to monitor microservices, require metrics-based alerting, want to integrate with Kubernetes via kube-state-metrics and cAdvisor, or need a scalable, pull-based monitoring system. Consider alternatives if you need native distributed tracing or complex log correlation.

### Key Use Cases


- Kubernetes cluster monitoring with kube-state-metrics
- Application performance monitoring
- Infrastructure metrics collection
- Alerting for service degradation
- Integration with Grafana for visualization


---

## Architecture Design Patterns

### Core Components


- **Prometheus Server**: Main server that scrapes and stores metrics
- **PromQL**: Query language for metrics analysis
- **Alertmanager**: Alert management and notification routing
- **Client Libraries**: Instrumentation libraries for applications
- **Exporter**: Components that expose metrics from third-party systems
- **Service Discovery**: Automatic discovery of targets for scraping


### Component Interactions


1. **Prometheus → Targets**: Scrapes metrics via HTTP
2. **Service Discovery → Prometheus**: Provides target list
3. **Prometheus → Alertmanager**: Sends alerts
4. **Client → Prometheus API**: Queries and retrieves data
5. **TSDB**: Storage for time-series data
6. **Rules → Alertmanager**: Evaluates alerting rules


### Data Flow Patterns


1. **Scrape Cycle**: Service discovery → Target list → HTTP scrape → Storage → Queryable
2. **Alerting**: Rule evaluation → Triggered alerts → Alertmanager → Notifications
3. **Storage**: Timestamped samples → Chunk creation →Compaction → Block creation
4. **Query Path**: PromQL parsing → AST evaluation → Result generation → API response


### Design Principles


- **Pull-based Scraping**: Servers expose metrics, Prometheus polls
- **Federation**: Hierarchical data collection
- **Time-Series Database**: Optimized for metrics storage
- **PromQL**: Powerful query language for metrics
- **Multi-dimensional**: Labels for metric identification
- **Pushgateway**: Short-lived job support


---

## Integration Approaches

### Integration with Other CNCF Projects


- **Kubernetes**: kube-state-metrics, node-exporter, cAdvisor integration
- **Grafana**: Visualization and dashboards
- **Alertmanager**: Alert management and routing
- **OpenTelemetry**: Metrics collection instrumentation
- **etcd**: Metrics for cluster monitoring
- **CoreDNS**: DNS metrics collection
- **Helm**: Prometheus operator for deployment


### API Patterns


- **HTTP API**: Query and management endpoints
- **Pull Model**: Server scrapes targets
- **Metrics Endpoint**: Standard format for metrics exposure
- **PromQL API**: Query endpoint with PromQL
- **Alertmanager API**: Alert management endpoints
- **Service Discovery API**: Dynamic target discovery


### Configuration Patterns


- **YAML Configuration**: Server configuration
- **Service Discovery**: Dynamic target configuration
- **Rule Files**: Alerting and recording rules
- **ConfigMap**: Kubernetes configuration
- **Environment Variables**: Override configuration


### Extension Mechanisms


- **Exporters**: Expose third-party metrics
- **Client Libraries**: Instrument applications
- **Remote Write**: Send data to storage
- **Alertmanager Templates**: Custom alert formats
- **Service Discovery**: Custom discovery mechanisms


---

## Common Pitfalls and How to Avoid Them

### Misconfigurations


- **Scrape Intervals**: Too frequent or infrequent
- **Retention**: Not setting appropriate retention time
- **Resource Limits**: Insufficient memory for metrics
- **Service Discovery**: Not discovering all targets
- **Alert Rules**: Missing or incorrect alert thresholds
- **Federation**: Incorrect federation configuration
- **Time Series Cardinality**: Too many unique labels


### Performance Issues


- **Memory Usage**: High memory for time series data
- **Scrape Latency**: Slow target responses
- **Query Performance**: Complex PromQL queries
- **Storage I/O**: High disk usage
- **Series Cardinality**: Too many time series
- **Retention Size**: Excessive storage requirements
- **Rule Evaluation**: Slow rule processing


### Operational Challenges


- **Retention Policy**: Balancing storage and data duration
- **High Availability**: Redundancy configuration
- **Scaling**: Vertical and horizontal scaling
- **Data Migration**: Moving between installations
- **Backup Strategy**: Metrics data backup
- **Alert Fatigue**: Managing alert noise
- **Label Management**: Consistent labeling strategy


### Security Pitfalls


- **API Access**: Unrestricted query API
- **Target Authentication**: Missing authentication for scraping
- **Secrets**: Storing sensitive data in metrics
- **External Labels**: Information disclosure
- **Federation**: Unrestricted federation endpoints


---

## Coding Practices

### Idiomatic Configuration


- **YAML Configuration**: Clear structure
- **Environment Variables**: Dynamic configuration
- **Service Discovery**: Auto-discover targets
- **Rule Files**: Modular alerting rules
- **ConfigMap**: Kubernetes integration


### API Usage Patterns


- **HTTP API**: Query and management
- **PromQL**: Metrics querying
- **Alertmanager API**: Alert management
- **Service Discovery API**: Target management
- **Pushgateway API**: Short-lived jobs


### Observability Best Practices


- **Metrics Collection**: Comprehensive metrics
- **Alerting Rules**: Clear alert thresholds
- **Recording Rules**: Pre-computed metrics
- **Service Discovery**: Dynamic target discovery
- **High Availability**: Redundant deployments
- **Federation**: Hierarchical collection


### Testing Strategies


- **Unit Tests**: Rule and expression tests
- **Integration Tests**: Service integration
- **E2E Tests**: Full monitoring stack
- **Benchmark Tests**: Performance measurement
- **Compatibility Tests**: Version compatibility


### Development Workflow


- **Development**: Prometheus server for testing
- **Testing**: promtool for rule validation
- **Debugging**: Metrics endpoint, query API
- **Deployment**: Operator or Helm
- **CI/CD**: Integration with pipeline tools
- **Tools**: promtool, Grafana, prombench


---

## Fundamentals

### Essential Concepts


- **Time-Series**: Metrics stored with timestamps
- **Metrics Types**: Counter, Gauge, Histogram, Summary
- **Labels**: Key-value pairs for metric identification
- **Metrics Name**: Unique identifier for a metric
- **Instance**: Single scraped target
- **Job**: Group of instances with the same scraping config
- **Alert**: Triggered when threshold exceeded
- **Recording Rule**: Pre-computed metric expression
- **TSDB**: Time-series database for storage
- **Pull Model**: Metrics are scraped, not pushed


### Terminology Glossary


- **Scrape**: Pull metrics from target
- **Target**: Service being monitored
- **Metric**: Measurable value
- **Label**: Key-value pair for metric identification
- **Timestamp**: Time associated with sample
- **Sample**: Single data point
- **Series**: All samples of a metric
- **Alert**: Triggered threshold
- **Rule**: Alerting or recording rule
- **TSDB**: Time-series database
- **Pushgateway**: Gateway for short-lived jobs


### Data Models and Types


- **Metric Samples**: Time-series data points
- **Labels**: Key-value pairs for metrics
- **Alert**: Alerting rule instance
- **Rule Group**: Group of rules
- **Series**: Time-series identifier
- **Histogram Buckets**: Histogram data
- **Summary Quantiles**: Summary data
- **Timestamp**: Time in milliseconds
- **Value**: Numeric metric value


### Lifecycle Management


- **Scrape Lifecycle**: Discover → Scrape → Store
- **Alert Lifecycle**: Evaluate → Trigger → Send
- **Rule Lifecycle**: Create → Evaluate → Update
- **Storage Lifecycle**: Append → Compaction → Block
- **Retention Lifecycle**: Expiration → Deletion
- **Service Discovery Lifecycle**: Discover → Update → Remove


### State Management


- **TSDB**: Time-series data storage
- **Series Metadata**: Metric labels
- **Rule State**: Alert and rule evaluation
- **Target State**: Scraped targets
- **Storage Blocks**: Compacted data blocks
- **Checkpoint**: WAL checkpoint for recovery


---

## Scaling and Deployment Patterns

### Horizontal Scaling


- **Sharding**: Horizontal sharding of metrics
- **Federation**: Hierarchical federation
- **Rule Sharding**: Distributing alerting rules
- **Storage Sharding**: Time-based storage separation


### High Availability


- **Two-Prometheus HA**: Mutual scraping
- **Remote Write**: Redundant storage endpoints
- **Federation HA**: Redundant federation endpoints
- **Storage HA**: Clustered storage solutions


### Production Deployments


- **Architecture**: HA pair with remote storage
- **Storage Configuration**: Long-term storage integration
- **Alerting Setup**: Multiple alert notification channels
- **Service Discovery**: Dynamic target discovery
- **Security**: Authentication and authorization
- **Resource Limits**: Appropriate memory and CPU limits
- **Backup Strategy**: TSDB snapshot and remote storage


### Upgrade Strategies


- **Version Skew**: Compatible versions
- **Storage Compatibility**: TSDB compatibility
- **Configuration Changes**: Configuration drift detection
- **Rolling Update**: Zero-downtime upgrade
- **Data Migration**: Storage migration if needed


### Resource Management


- **Memory Configuration**: TSDB memory usage
- **Storage Quota**: Disk space management
- **Retention Period**: Data retention configuration
- **Scrape Interval**: Resource vs. granularity trade-off


---

## Additional Resources

- **Official Documentation:** [https://prometheus.io/docs/](https://prometheus.io/docs/)
- **GitHub Repository:** [github.com/prometheus/prometheus](https://github.com/prometheus/prometheus)
- **CNCF Project Page:** [cncf.io/projects/prometheus/](https://www.cncf.io/projects/prometheus/)
- **Community:** Check the GitHub repository for community channels
- **Versioning:** Refer to project's release notes for version-specific features

---

## Troubleshooting

### Common Issues

1. **Deployment Failures**
   - Check pod logs for errors
   - Verify configuration values
   - Ensure network connectivity

2. **Performance Issues**
   - Monitor resource usage
   - Adjust resource limits
   - Check for bottlenecks

3. **Configuration Errors**
   - Validate YAML syntax
   - Check required fields
   - Verify environment-specific settings

4. **Integration Problems**
   - Verify API compatibility
   - Check dependency versions
   - Review integration documentation

### Getting Help

- Check official documentation
- Search GitHub issues
- Join community channels
- Review logs and metrics
*Content generated automatically. Verify against official documentation before production use.*

## Tutorial

This tutorial will guide you through installing, configuring, and using Prometheus for monitoring Kubernetes applications.

### Prerequisites

Before beginning, ensure you have:
- A running Kubernetes cluster (minikube, kind, EKS, GKE, AKS)
- `kubectl` configured with cluster-admin permissions
- `helm` CLI (for Helm installation method)
- Basic understanding of monitoring concepts (metrics, alerts, dashboards)

Verify your setup:

```bash
# Check cluster connectivity
kubectl cluster-info

# Verify kubectl configuration
kubectl get nodes

# Verify access to kube-system namespace
kubectl get pods -n kube-system
```

---

### 1. Installation

Prometheus can be installed using various methods including kubectl, Helm, or using the Prometheus Operator.

#### Method 1: Using kubectl with kube-prometheus-stack (Recommended)

```bash
# Create monitoring namespace
kubectl create namespace monitoring

# Download and apply Prometheus Operator manifests
kubectl apply -f https://raw.githubusercontent.com/prometheus-operator/prometheus-operator/main/bundle.yaml

# Verify installation
kubectl get pods -n monitoring

# Or use kube-prometheus-stack for a complete installation
kubectl apply -f https://raw.githubusercontent.com/prometheus-operator/kube-prometheus/main/manifests/setup/kube-prometheus-crd.yaml

# Wait for CRDs to be created
kubectl wait --for=condition=Established --all=CustomResourceDefinition --timeout=30s

# Apply kube-prometheus-stack
kubectl apply -f https://raw.githubusercontent.com/prometheus-operator/kube-prometheus/main/manifests/
```

#### Method 2: Using Helm (Recommended for most users)

```bash
# Add the Prometheus Community Helm repository
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add prometheus-stack https://prometheus-community.github.io/helm-charts
helm repo update

# Install kube-prometheus-stack (includes Prometheus, Grafana, Alertmanager)
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --wait

# Verify installation
kubectl get pods -n monitoring
helm list -n monitoring
```

#### Method 3: Using Helm with Custom Values

```bash
# Create custom values file
cat > prometheus-values.yaml << EOF
prometheus:
  prometheusSpec:
    retention: 30d
    replicas: 2
    resources:
      requests:
        memory: 400Mi
        cpu: 100m
      limits:
        memory: 2Gi
        cpu: 1000m
    storageSpec:
      volumeClaimTemplate:
        spec:
          storageClassName: standard
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 50Gi

alertmanager:
  alertmanagerSpec:
    replicas: 3
    resources:
      requests:
        memory: 100Mi
        cpu: 50m

grafana:
  enabled: true
  adminPassword: admin
EOF

# Install with custom configuration
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  -f prometheus-values.yaml \
  --wait
```

#### Method 4: Using kubectl with vanilla Prometheus

```bash
# Create namespace
kubectl create namespace monitoring

# Deploy Prometheus without Operator
kubectl apply -n monitoring -f - <<EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  name: prometheus
  namespace: monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: prometheus
rules:
- apiGroups: [""]
  resources:
  - nodes
  - nodes/proxy
  - services
  - endpoints
  - pods
  verbs: ["get", "list", "watch"]
- apiGroups: ["extensions"]
  resources:
  - ingresses
  verbs: ["get", "list", "watch"]
- nonResourceURLs: ["/metrics", "/metrics/cadvisor"]
  verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: prometheus
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: prometheus
subjects:
- kind: ServiceAccount
  name: prometheus
  namespace: monitoring
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
    scrape_configs:
    - job_name: 'prometheus'
      static_configs:
      - targets: ['localhost:9090']
    - job_name: 'kubernetes-nodes'
      kubernetes_sd_configs:
      - role: node
    - job_name: 'kubernetes-pods'
      kubernetes_sd_configs:
      - role: pod
---
apiVersion: v1
kind: Service
metadata:
  name: prometheus
  namespace: monitoring
  labels:
    app: prometheus
spec:
  selector:
    app: prometheus
  ports:
  - port: 9090
    targetPort: 9090
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: prometheus
  template:
    metadata:
      labels:
        app: prometheus
    spec:
      serviceAccountName: prometheus
      containers:
      - name: prometheus
        image: prom/prometheus:v2.45.0
        args:
        - "--config.file=/etc/prometheus/prometheus.yml"
        - "--storage.tsdb.path=/prometheus"
        ports:
        - containerPort: 9090
        volumeMounts:
        - name: config
          mountPath: /etc/prometheus
        - name: storage
          mountPath: /prometheus
      volumes:
      - name: config
        configMap:
          name: prometheus-config
      - name: storage
        emptyDir: {}
EOF
```

---

### 2. Basic Configuration

#### Accessing Prometheus UI

```bash
# Port-forward to access Prometheus UI
kubectl -n monitoring port-forward svc/prometheus-kube-prometheus-prometheus 9090:9090

# Or access via LoadBalancer
kubectl -n monitoring patch svc prometheus-kube-prometheus-prometheus -p '{"spec":{"type":"LoadBalancer"}}'

# Or access via Ingress
kubectl -n monitoring create ingress prometheus \
  --class=nginx \
  --rule="prometheus.example.com/*=prometheus-kube-prometheus-prometheus:9090"
```

#### Configuring Scrape Targets

```yaml
# Add custom scrape configuration via ConfigMap
cat > prometheus-scrape-config.yaml << EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-additional-configs
  namespace: monitoring
data:
  additional-scrape-configs.yaml: |
    - job_name: 'myapp'
      static_configs:
      - targets: ['myapp-service:8080']
      metrics_path: /metrics
EOF

kubectl apply -f prometheus-scrape-config.yaml
```

#### Configuring Alerting Rules

```yaml
# Create alerting rules
cat > prometheus-alert-rules.yaml << EOF
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: application-alerts
  namespace: monitoring
  labels:
    prometheus: kube-prometheus
    role: alert-rules
spec:
  groups:
  - name: application.rules
    rules:
    - alert: HighErrorRate
      expr: |
        sum(rate(http_requests_total{status=~"5.."}[5m]))
        /
        sum(rate(http_requests_total[5m])) > 0.05
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "High error rate detected"
        description: "Error rate is {{ $value | humanizePercentage }}"
    - alert: ServiceDown
      expr: up == 0
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "Service {{ $labels.instance }} is down"
        description: "{{ $labels.instance }} of job {{ $labels.job }} has been down for more than 2 minutes."
EOF

kubectl apply -f prometheus-alert-rules.yaml
```

#### Configuring Service Monitors

```yaml
# ServiceMonitor to automatically discover and scrape services
cat > service-monitor.yaml << EOF
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: myapp-monitor
  namespace: production
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app: myapp
  namespaceSelector:
    matchNames:
    - production
  endpoints:
  - port: metrics
    interval: 15s
    path: /metrics
    scheme: http
EOF

kubectl apply -f service-monitor.yaml
```

---

### 3. Usage Examples

#### Querying Metrics with PromQL

```bash
# View all metrics
curl http://localhost:9090/api/v1/label/__name__/values

# Query CPU usage
curl -s 'http://localhost:9090/api/v1/query?query=node_cpu_seconds_total' | jq .

# Query memory usage
curl -s 'http://localhost:9090/api/v1/query?query=node_memory_MemAvailable_bytes' | jq .

# Query pod CPU usage
curl -s 'http://localhost:9090/api/v1/query?query=sum by (pod) (rate(container_cpu_usage_seconds_total[5m]))' | jq .
```

#### Using PromQL in Prometheus UI

```promql
# CPU usage percentage
100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory usage percentage
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100

# HTTP error rate
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100

# Request latency percentiles
histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service))

# Up time percentage
avg(rate(up[5m])) by (instance) * 100
```

#### Creating Grafana Dashboards

```bash
# Access Grafana
kubectl -n monitoring port-forward svc/prometheus-grafana 3000:80

# Or get admin password
kubectl -n monitoring get secret prometheus-grafana \
  -o jsonpath="{.data.admin-password}" | base64 -d; echo

# Import dashboard via API
curl -X POST http://localhost:3000/api/dashboards/db \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d @dashboard.json
```

---

### 4. Common Operations

#### Monitoring Prometheus Health

```bash
# Check Prometheus status
kubectl get pods -n monitoring -l app=kube-prometheus-prometheus

# View Prometheus logs
kubectl logs -n monitoring prometheus-kube-prometheus-prometheus-0 -c prometheus

# Check Prometheus configuration
kubectl -n monitoring get configmap prometheus-kube-prometheus-prometheus -o yaml

# View Prometheus targets
curl http://localhost:9090/api/v1/targets | jq .

# View active alerts
curl http://localhost:9090/api/v1/alerts | jq .

# View rule groups
curl http://localhost:9090/api/v1/rules | jq .
```

#### Managing Retention and Storage

```bash
# Scale storage (for StatefulSet deployments)
kubectl -n monitoring scale statefulset prometheus-kube-prometheus-prometheus --replicas=3

# Check storage usage
kubectl -n monitoring exec prometheus-kube-prometheus-prometheus-0 -- df -h /prometheus

# Extend retention period
kubectl -n monitoring patch prometheus prometheus-kube-prometheus-prometheus \
  --type='merge' -p '{"spec":{"retention":"90d"}}'
```

#### Backing Up and Restoring

```bash
# Create backup of Prometheus data
kubectl -n monitoring exec prometheus-kube-prometheus-prometheus-0 \
  -- mkdir -p /backup

kubectl -n monitoring exec prometheus-kube-prometheus-prometheus-0 \
  -- cp -r /prometheus/* /backup/

# Export backup
kubectl -n monitoring cp monitoring/prometheus-kube-prometheus-prometheus-0:/backup \
  ./prometheus-backup --container=prometheus
```

#### Upgrading Prometheus

```bash
# Using Helm
helm upgrade prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  -f prometheus-values.yaml

# Using kubectl (Operator)
kubectl -n monitoring apply -f manifests/

# Rollback if needed
helm rollback prometheus -n monitoring
```

---

### 5. Best Practices

#### Configuration Best Practices

1. **Set Appropriate Retention**: Balance between storage costs and historical data needs
2. **Configure Scrape Intervals**: Shorter intervals for critical metrics, longer for infrequent metrics
3. **Use Relabeling**: Configure relabeling to reduce metric cardinality
4. **Configure Alertmanagers**: Set up HA Alertmanager configuration
5. **Set Resource Limits**: Configure CPU and memory limits for Prometheus
6. **Enable Remote Write**: Configure remote write for long-term storage
7. **Use Recording Rules**: Pre-compute expensive queries
8. **Configure Federation**: Set up federation for multi-cluster monitoring

#### Query Best Practices

1. **Use Aggregation**: Always aggregate metrics when possible
2. **Set Appropriate Time Ranges**: Use appropriate duration windows for queries
3. **Avoid High Cardinality**: Filter metrics by labels to reduce cardinality
4. **Use Rate vs Counter**: Use rate() for counters, instant for gauges
5. **Test Queries**: Test queries in Prometheus UI before dashboards
6. **Use Vector Matching**: Understand instant vs range vectors
7. **Limit Results**: Use limit() for large result sets
8. **Cache Results**: Use recording rules for complex queries

#### Security Best Practices

1. **Enable Authentication**: Configure basic auth or OAuth for Prometheus UI
2. **Use Network Policies**: Restrict access to Prometheus and Alertmanager
3. **Configure RBAC**: Grant minimal required permissions
4. **Encrypt Traffic**: Use TLS for all communications
5. **Scrape interval**: Configure appropriate scrape intervals to avoid overwhelming targets
6. **Secret Management**: Store sensitive configuration in secrets
7. **Audit Logging**: Enable audit logging for security analysis
8. **Image Verification**: Use verified Prometheus images from trusted sources

#### Alerting Best Practices

1. **Set Appropriate Thresholds**: Balance between false positives and missed alerts
2. **Use For Duration**: Include for clause to prevent flapping alerts
3. **Group Related Alerts**: Use alert groups for related metrics
4. **Set Severity Levels**: Use warning and critical severity levels
5. **Downtime Notification**: Configure silence rules for maintenance
6. **Escalation Policies**: Set up alert escalation paths
7. **Alert Clustering**: Use Alertmanager for alert clustering
8. **Test Alerts**: Regularly test alerting rules

*Content generated automatically. Verify against official documentation before production use.*

## Examples

### Prometheus Configuration with Kubernetes Service Discovery


```yaml
# prometheus.yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: production
    environment: prod

alerting:
  alertmanagers:
  - static_configs:
    - targets:
      - alertmanager:9093

rule_files:
  - /etc/prometheus/rules/*.yml

scrape_configs:
  # Kubernetes node metrics
  - job_name: 'kubernetes-nodes'
    kubernetes_sd_configs:
    - role: node
    scheme: https
    tls_config:
      ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
    relabel_configs:
    - action: labelmap
      regex: __meta_kubernetes_node_label_(.+)

  # Kubernetes pods
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
    - role: pod
    relabel_configs:
    - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
      action: keep
      regex: true
    - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
      action: replace
      target_label: __metrics_path__
      regex: (.+)
    - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
      action: replace
      regex: ([^:]+)(?::\d+)?;(\d+)
      replacement: $1:$2
      target_label: __address__

  # Kubernetes services
  - job_name: 'kubernetes-services'
    kubernetes_sd_configs:
    - role: service
    relabel_configs:
    - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_scrape]
      action: keep
      regex: true
```

### Alerting Rules for Application Health


```yaml
# rules/alerting.rules.yml
groups:
- name: application-alerts
  rules:
  - alert: HighErrorRate
    expr: |
      sum(rate(http_requests_total{status=~"5.."}[5m]))
      /
      sum(rate(http_requests_total[5m])) > 0.05
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value | humanizePercentage }} for the last 5 minutes."

  - alert: ServiceDown
    expr: up{job="kubernetes-pods"} == 0
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "Service is down"
      description: "Service {{ $labels.pod }} in namespace {{ $labels.namespace }} has been down for more than 2 minutes."

  - alert: HighLatency
    expr: |
      histogram_quantile(0.99, 
        sum(rate(http_request_duration_seconds_bucket[5m])) 
        by (le, service)
      ) > 1
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "High latency detected"
      description: "99th percentile latency is above 1 second for service {{ $labels.service }}."

- name: infrastructure-alerts
  rules:
  - alert: HighMemoryUsage
    expr: |
      (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes)
      / node_memory_MemTotal_bytes > 0.8
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High memory usage on node"
      description: "Node {{ $labels.instance }} is using {{ $value | humanizePercentage }} of memory."

  - alert: HighCPUUsage
    expr: |
      100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High CPU usage on node"
      description: "Node {{ $labels.instance }} is using {{ $value | humanizePercentage }} of CPU."
```

### Service Monitor for Custom Application


```yaml
# ServiceMonitor for Prometheus Operator
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: myapp-monitor
  namespace: monitoring
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app: myapp
  namespaceSelector:
    matchNames:
    - production
  endpoints:
  - port: http
    interval: 15s
    path: /metrics
    scheme: http
    scrapeTimeout: 10s
    honorLabels: true
    metricRelabelings:
    - sourceLabels: [__name__]
      regex: 'go_.*'
      action: drop
```

