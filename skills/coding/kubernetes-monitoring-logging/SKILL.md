---




name: kubernetes-monitoring-logging
description: Manages monitoring and logging in Kubernetes, including setting up Prometheus, Grafana, and logging best practices.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  archetypes: monitoring, observability
  anti_triggers: overloading, manual configuration
  response_profile:
      verbosity: medium
      directive_strength: high
  domain: coding
  triggers: monitoring, kubernetes monitoring, logging, prometheus, grafana
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance]




---





# Kubernetes Monitoring and Logging

This skill manages monitoring and logging in Kubernetes environments, enabling the setup of Prometheus and Grafana for observability.

## When to Use

Use this skill when:
- Setting up a new Kubernetes cluster and needing to implement monitoring.
- Reviewing or enhancing existing monitoring and logging strategies.
- Ensuring compliance with best practices for observability in Kubernetes.

## Core Workflow

1. **Setup Prometheus**  
   a. Deploy Prometheus using Helm charts or YAML manifests.  
   b. Configure Prometheus to scrape metrics from your desired endpoints.  

2. **Deploy Grafana**  
   a. Install Grafana using Helm charts or YAML manifests.  
   b. Configure data sources to connect Grafana to Prometheus.  
   c. Create dashboards to visualize your metrics.

3. **Implement Logging**  
   a. Choose a logging solution (e.g., ELK Stack or Fluentd).  
   b. Configure your logging solution to capture logs from all relevant Kubernetes pods.  

## Implementation Patterns

### Pattern 1: Deploying Prometheus
```yaml
apiVersion: v1
kind: Service
metadata:
  name: prometheus
  labels:
    app: prometheus
spec:
  type: ClusterIP
  ports:
    - name: web
      port: 9090
  selector:
    app: prometheus
---

apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
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
      containers:
        - name: prometheus
          image: prom/prometheus:latest
          args:
            - '--config.file=/etc/prometheus/prometheus.yml'
          ports:
            - containerPort: 9090
          volumeMounts:
            - name: prometheus-config
              mountPath: /etc/prometheus
      volumes:
        - name: prometheus-config
          configMap:
            name: prometheus-config 
```

### Pattern 2: Deploying Grafana
```yaml
apiVersion: v1
kind: Service
metadata:
  name: grafana
spec:
  type: NodePort
  ports:
    - port: 3000
      targetPort: 3000
  selector:
    app: grafana
---

apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
spec:
  replicas: 1
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
    spec:
      containers:
        - name: grafana
          image: grafana/grafana:latest
          ports:
            - containerPort: 3000
          env:
            - name: GF_SECURITY_ADMIN_PASSWORD
              value: admin
```

## Constraints

### MUST DO
- Ensure that Prometheus is configured to scrape all necessary Kubernetes metrics.  
- Set up Grafana dashboards for critical metrics that need monitoring regularly.

### MUST NOT DO
- Do not expose Prometheus or Grafana services directly to the public internet without authentication.
- Avoid using default credentials for Grafana and Prometheus accounts.

## Related Skills

| Skill | Purpose |
|-------|---------|
| kubernetes-security-best-practices | Ensures secure Kubernetes configurations and practices. |
| kubernetes-logging-best-practices | Enhances logging strategies in Kubernetes environments.

## Live References

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [Prometheus Monitoring on Kubernetes](https://prometheus.io/docs/guides/kubernetes/) — Official Prometheus guide for monitoring Kubernetes clusters
- [EFK Stack (Elasticsearch, Fluentd, Kibana) for K8s](https://www.elastic.co/guide/en/cloud-on-k8s/current/k8s-deploy-fluentd.html) — Elastic's documentation on centralized logging in Kubernetes
- [OpenTelemetry for Kubernetes](https://opentelemetry.io/docs/platforms/kubernetes/) — OpenTelemetry's official guide to instrumenting K8s applications
- [Kubernetes Dashboard Monitoring](https://kubernetes.io/docs/tasks/extend-kubernetes/setup-monitoring-visualui/) — Official K8s guide to setting up monitoring UIs
- [Grafana Dashboards for Kubernetes](https://grafana.com/grafana/dashboards/?search=kubernetes) — Grafana's curated Kubernetes dashboard templates and configuration guides|
