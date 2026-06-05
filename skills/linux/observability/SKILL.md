---




name: observability
description: Implements Linux system observability with metrics, logs, and performance
  profiling for proactive infrastructure management across cloud and on-prem environments.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: linux
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - config
  - do-dont
  triggers: linux observability, system metrics, log collection, performance profiling,
    eBPF, perf, capacity planning, monitoring
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: resource-management, kernel-tuning, networking, linux-security,
    hardware-provisioning
  maturity: stable
  completeness: 95
  exampleCount: 3




---




# Linux System Observability

Infrastructure engineer implementing comprehensive Linux system observability with metrics collection, log aggregation, performance profiling, and capacity planning for proactive infrastructure management across cloud and on-prem environments.

## TL;DR Checklist

- [ ] Deploy metrics collection for CPU, memory, disk I/O, and network throughput
- [ ] Configure log collection from systemd journal and application logs
- [ ] Set up performance profiling with perf and eBPF for latency investigation
- [ ] Define alerting thresholds for resource utilization and error rates
- [ ] Implement capacity planning with trend analysis and growth projections
- [ ] Validate observability stack with synthetic load and failure injection tests
- [ ] Document baseline metrics and alerting configuration for each workload type
- [ ] Test alerting delivery and runbook execution for each alert type

---

## When to Use

Use this skill when:

- **Setting up monitoring from scratch** — You're deploying a new system and need to establish observability baselines
- **Investigating performance issues** — A system is experiencing latency, throughput, or reliability problems and needs profiling
- **Capacity planning** — You need to project resource needs based on historical growth trends
- **Setting up alerting** — You need threshold-based alerts for proactive incident detection
- **Post-incident review** — You need to analyze what happened during an incident using collected metrics and logs
- **Cloud vs on-prem observability differences** — You need to adapt observability strategy for different deployment environments

---

## When NOT to Use

Avoid this skill for:

- **Application-level monitoring** — Use application-specific APM tools (OpenTelemetry, Datadog APM) for application metrics
- **Network packet analysis** — Use tcpdump or Wireshark for packet-level investigation
- **Security forensics** — Use `linux-security` skill for forensic investigation of security incidents
- **Real-time debugging** — Use `perf record` and eBPF for low-level kernel debugging, not production monitoring

Use `resource-management` when investigating specific resource contention issues (CPU throttling, memory pressure). Use `networking` when network performance is the suspected bottleneck.

---

## Core Workflow

### 1. Deploy Metrics Collection

Set up system metrics collection for CPU, memory, disk, and network.

```bash
# Install node_exporter (Prometheus metrics)
sudo useradd --no-create-home --shell /bin/false node_exporter
wget https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-amd64.tar.gz
tar xzf node_exporter-*.tar.gz
sudo cp node_exporter-*/node_exporter /usr/local/bin/
rm -rf node_exporter-*

# Create systemd service
cat > /etc/systemd/system/node_exporter.service << 'NODE'
[Unit]
Description=Node Exporter
After=network.target

[Service]
Type=simple
User=node_exporter
Group=node_exporter
ExecStart=/usr/local/bin/node_exporter \
    --collector.textfile.directory=/var/lib/node_exporter/textfile_collector \
    --web.listen-address=:9100
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
NODE

sudo systemctl daemon-reload
sudo systemctl enable --now node_exporter

# Verify metrics endpoint
curl -s http://localhost:9100/metrics | head -20

# Collect additional system metrics
# CPU stats
cat /proc/stat | head -5
cat /proc/cpuinfo | grep "model name" | head -1

# Memory stats
free -h
cat /proc/meminfo | head -10

# Disk I/O
cat /proc/diskstats
iostat -x 1 5

# Network stats
ss -s
cat /proc/net/netstat | head -5
```

**Checkpoint:** node_exporter is running and exposing metrics on port 9100. All system metrics are collectable.

### 2. Configure Log Collection

Set up centralized log collection from systemd journal and application logs.

```bash
# Configure systemd journal forwarding
cat > /etc/systemd/journald.conf << 'JOURNAL'
[Journal]
Storage=persistent
SystemMaxUse=500M
SystemMaxFileSize=50M
MaxRetentionSec=30day
ForwardToSyslog=yes
Compress=yes
JournalFileFlushInterval=30s
JOURNAL

sudo systemctl restart systemd-journald

# Configure rsyslog for log forwarding (centralized logging)
sudo apt install -y rsyslog  # or dnf install rsyslog

cat > /etc/rsyslog.d/50-forward.conf << 'RSYSLOG'
# Forward all logs to centralized log server
*.* @@log-server.example.com:514

# Forward critical logs with higher priority
mail.*                          /var/log/mail.log
auth,authpriv.*                 /var/log/auth.log
kern.*                          /var/log/kern.log

# Rate limit to prevent log floods
$SystemLogRateLimitInterval 5
$SystemLogRateLimitBurst 1000
RSYSLOG

sudo systemctl restart rsyslog

# Configure logrotate for application logs
cat > /etc/logrotate.d/myapp << 'LOGROTATE'
/var/log/myapp/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 myapp myapp
    sharedscripts
    postrotate
        systemctl reload myapp > /dev/null 2>&1 || true
    endscript
}
LOGROTATE
```

**Checkpoint:** Journal storage is persistent and sized appropriately. Logs are forwarded to central server. Log rotation prevents disk exhaustion.

### 3. Set Up Performance Profiling

Configure performance profiling with perf and eBPF for latency investigation.

```bash
# Install perf and BPF tools
sudo apt install -y linux-tools-generic linux-tools-$(uname -r) bpfcc-tools  # Debian/Ubuntu
sudo dnf install -y kernel-tools bpf-tools  # RHEL/CentOS

# Check eBPF availability
sudo bpftrace -l | head -10  # List available eBPF probes

# Trace system calls for a specific process
sudo perf record -g -p $(pgrep myapp) -F 99 -a -- sleep 30
sudo perf report --stdio

# Profile specific syscalls
sudo bpftrace -e '
tracepoint:syscalls:sys_enter_openat {
    printf("%s %s\n", comm, str(args->filename));
}
'

# Measure disk I/O latency
sudo bpftrace -e '
tracepoint:block:block_rq_issue {
    @start[args->dev] = nsecs;
}
tracepoint:block:block_rq_complete {
    @latency[args->dev] = hist(nsecs - @start[args->dev]);
    delete(@start[args->dev]);
}
'

# Profile kernel functions
sudo perf record -g -e cpu-clock task-clock page-faults context-switches \
    -p $(pgrep myapp) -- sleep 60
sudo perf report --stdio

# Trace network latency with bcc
sudo trace-cmd record -e tcp:tcp_sendmsg -e tcp:tcp_rcv_space_adjust \
    -p $(pgrep myapp) -- sleep 30
sudo trace-cmd report
```

**Checkpoint:** Performance profiling tools are installed and functional. Baseline profiles are captured for comparison.

### 4. Define Alerting Thresholds

Set up threshold-based alerts for resource utilization and error rates.

**Bash — Generate Prometheus alerting rules by workload type**

```bash
#!/bin/bash
# Generate Prometheus alerting rules for a workload type
# Usage: ./generate-alerts.sh <workload-type> [output-dir]
# Workload types: database, web-server, batch-job, monitoring

set -euo pipefail

WORKLOAD="${1:-database}"
OUTPUT_DIR="${2:-/etc/prometheus/rules}"

mkdir -p "$OUTPUT_DIR"

# Define alert thresholds per workload type
case "$WORKLOAD" in
    database)
        CPU_WARN=70; CPU_CRIT=90
        MEM_WARN=75; MEM_CRIT=90
        DISK_WARN=75; DISK_CRIT=85
        NET_ERR_RATE=0.01
        ;;
    web-server)
        CPU_WARN=60; CPU_CRIT=80
        MEM_WARN=70; MEM_CRIT=85
        DISK_WARN=80; DISK_CRIT=90
        NET_ERR_RATE=0.05
        ;;
    batch-job)
        CPU_WARN=80; CPU_CRIT=95
        MEM_WARN=80; MEM_CRIT=95
        DISK_WARN=85; DISK_CRIT=95
        NET_ERR_RATE=0.10
        ;;
    monitoring)
        CPU_WARN=50; CPU_CRIT=70
        MEM_WARN=60; MEM_CRIT=80
        DISK_WARN=70; DISK_CRIT=80
        NET_ERR_RATE=0.01
        ;;
    *)
        echo "Unknown workload: $WORKLOAD"
        echo "Available: database, web-server, batch-job, monitoring"
        exit 1
        ;;
esac

OUTPUT_FILE="${OUTPUT_DIR}/${WORKLOAD}-alerts.yml"

cat > "$OUTPUT_FILE" << EOF
groups:
  - name: ${WORKLOAD}-alerts
    rules:
      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > ${CPU_CRIT}
        for: 5m
        labels:
          severity: critical
          workload: ${WORKLOAD}
        annotations:
          summary: "CPU usage above ${CPU_CRIT}% on \${labels.instance}"
          description: "CPU has been above ${CPU_CRIT}% for more than 5 minutes."

      - alert: HighCPUUsageWarning
        expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > ${CPU_WARN}
        for: 10m
        labels:
          severity: warning
          workload: ${WORKLOAD}
        annotations:
          summary: "CPU usage above ${CPU_WARN}% on \${labels.instance}"

      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > ${MEM_CRIT}
        for: 5m
        labels:
          severity: critical
          workload: ${WORKLOAD}
        annotations:
          summary: "Memory usage above ${MEM_CRIT}% on \${labels.instance}"

      - alert: HighMemoryUsageWarning
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > ${MEM_WARN}
        for: 10m
        labels:
          severity: warning
          workload: ${WORKLOAD}
        annotations:
          summary: "Memory usage above ${MEM_WARN}% on \${labels.instance}"

      - alert: DiskSpaceCritical
        expr: (1 - (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"})) * 100 > ${DISK_CRIT}
        for: 5m
        labels:
          severity: critical
          workload: ${WORKLOAD}
        annotations:
          summary: "Disk usage above ${DISK_CRIT}% on \${labels.instance}"

      - alert: DiskSpaceWarning
        expr: (1 - (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"})) * 100 > ${DISK_WARN}
        for: 10m
        labels:
          severity: warning
          workload: ${WORKLOAD}
        annotations:
          summary: "Disk usage above ${DISK_WARN}% on \${labels.instance}"

      - alert: HighNetworkErrorRate
        expr: rate(node_network_receive_errs_total[5m]) / rate(node_network_receive_bytes_total[5m]) > ${NET_ERR_RATE}
        for: 5m
        labels:
          severity: critical
          workload: ${WORKLOAD}
        annotations:
          summary: "Network error rate above $(echo "$NET_ERR_RATE * 100" | bc)%% on \${labels.instance}"
EOF

echo "Generated Prometheus alerting rules: ${OUTPUT_FILE}"
echo "Thresholds: CPU ${CPU_WARN}/${CPU_CRIT}%, Memory ${MEM_WARN}/${MEM_CRIT}%, Disk ${DISK_WARN}/${DISK_CRIT}%"
```

**Checkpoint:** Alert thresholds are defined for each workload type. Rules are deployed to the monitoring stack and tested with synthetic load.

### 5. Implement Capacity Planning

Set up capacity planning with trend analysis and growth projections.

```bash
# Collect historical metrics for capacity analysis
# Create metrics collection script
cat > /usr/local/bin/capacity-collect << 'CAPACITY'
#!/bin/bash
TIMESTAMP=$(date +%s)
HOSTNAME=$(hostname)
OUTPUT="/var/lib/capacity-history/metrics-$(hostname).csv"

mkdir -p /var/lib/capacity-history

# CPU usage (percentage)
CPU_IDLE=$(top -bn1 | grep "Cpu(s)" | awk '{print $8}' | cut -d. -f1)
CPU_USAGE=$((100 - CPU_IDLE))

# Memory usage (percentage)
MEM_TOTAL=$(grep MemTotal /proc/meminfo | awk '{print $2}')
MEM_AVAIL=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
MEM_USAGE=$(echo "scale=1; (1 - $MEM_AVAIL / $MEM_TOTAL) * 100" | bc)

# Disk usage (percentage)
DISK_USAGE=$(df / --output=pcent | tail -1 | tr -d ' %')

# Load average (1min, 5min, 15min)
LOADAVG=$(cat /proc/loadavg | awk '{print $1, $2, $3}')

# Network throughput (bytes received/sent in last interval)
NET_RX=$(cat /proc/net/dev | grep -E "eth[0-9]|ens[0-9]|enp[0-9]" | tail -1 | awk '{print $2}')
NET_TX=$(cat /proc/net/dev | grep -E "eth[0-9]|ens[0-9]|enp[0-9]" | tail -1 | awk '{print $10}')

echo "${TIMESTAMP},${HOSTNAME},${CPU_USAGE},${MEM_USAGE},${DISK_USAGE},${LOADAVG},${NET_RX},${NET_TX}" >> "$OUTPUT"
CAPACITY
sudo chmod +x /usr/local/bin/capacity-collect

# Run every 5 minutes
sudo bash -c 'echo "*/5 * * * * /usr/local/bin/capacity-collect" > /etc/cron.d/capacity-collect'

# Capacity analysis script
cat > /usr/local/bin/capacity-analyze << 'ANALYZE'
#!/bin/bash
# Analyze capacity trends and project when thresholds will be hit

METRICS_FILE="/var/lib/capacity-history/metrics-$(hostname).csv"

if [ ! -f "$METRICS_FILE" ]; then
    echo "No metrics data found. Run capacity-collect first."
    exit 1
fi

# Calculate current averages and trends
echo "=== Capacity Analysis: $(hostname) ==="
echo "Date: $(date)"
echo ""

# Disk trend (simple linear projection)
DISK_CURRENT=$(tail -1 "$METRICS_FILE" | cut -d',' -f5)
DISK_HISTORY=$(awk -F',' '{print $5}' "$METRICS_FILE" | tail -288)  # 24 hours at 5min intervals

echo "Disk Usage:"
echo "  Current: ${DISK_CURRENT}%"
echo "  24h avg: $(echo "$DISK_HISTORY" | awk '{sum+=$1} END {printf "%.1f", sum/NR}')%"
echo "  24h min: $(echo "$DISK_HISTORY" | sort -n | head -1)%"
echo "  24h max: $(echo "$DISK_HISTORY" | sort -n | tail -1)%"

# Project days until disk is full (simple linear extrapolation)
# This is a simplified model; use proper time-series for production
echo ""
echo "Estimated days until disk full: $(echo "$DISK_CURRENT" | awk '{if ($1 >= 100) print "ALREADY FULL"; else printf "%d", (100-$1)/($1-$(echo "$DISK_HISTORY" | sort -n | head -1))}') days"
ANALYZE
sudo chmod +x /usr/local/bin/capacity-analyze
```

**Checkpoint:** Historical metrics are being collected. Capacity trends are analyzable. Growth projections provide actionable planning data.

### 6. Cloud vs On-Prem Observability

```
┌─────────────────────────────────────────────────────────────────────────┐
│                  Cloud vs On-Prem Observability Strategy                  │
├─────────────────────┬───────────────────────────────────────────────────┤
│ Aspect              │ Cloud                                             │ On-Prem        │
├─────────────────────┼───────────────────────────────────────────────────┤
│ Infrastructure      │ Cloud provider metrics (CloudWatch, Stackdriver,  │
│ Metrics             │ Azure Monitor) — auto-collected, no agents       │           │
│                     │ needed for compute, storage, network                │                   │
├─────────────────────┼───────────────────────────────────────────────────┤
│ Instance Metrics    │ node_exporter + Prometheus for application-      │ node_exporter +  │
│                     │ level metrics; CloudWatch agent for              │ Prometheus       │
│                     │ enhanced monitoring                           │ (self-hosted)    │
├─────────────────────┼───────────────────────────────────────────────────┤
│ Logging             │ CloudTrail + VPC Flow Logs +                  │ rsyslog +        │
│                     │ structured logging to S3/GCS/                  │ journald +       │
│                     │ Blob Storage + CloudWatch Logs                 │ centralized      │
│                     │                                                  │ log server       │
├─────────────────────┼───────────────────────────────────────────────────┤
│ Tracing             │ X-Ray, Cloud Trace, Application               │ Jaeger +         │
│                     │ Insights (auto-instrumentation)               │ OpenTelemetry    │
├─────────────────────┼───────────────────────────────────────────────────┤
│ Cost                │ Pay per metric ingested;                      │ Fixed cost;      │
│                     │ auto-scaling observability is free              │ self-managed     │
├─────────────────────┼───────────────────────────────────────────────────┤
│ Access              │ IAM-based; no physical access needed          │ Full hardware    │
│                     │                                                   │ access; TPM/     │
│                     │                                                   │ IPMI for hardware│
└─────────────────────┴───────────────────────────────────────────────────┘
```

---

## Implementation Patterns

### Pattern 1: System Health Dashboard Script (BAD vs. GOOD)

**BAD — Manual health checking without automation**

```bash
# ❌ BAD: Ad-hoc manual health checks
echo "CPU: $(top -bn1 | grep 'Cpu(s)')"
free -h
df -h
ss -tuln
# Problems:
# - Not repeatable or automatable
# - No historical data for comparison
# - No alerting — must manually review each time
# - Inconsistent format makes comparison impossible
# - No baseline comparison
```

**GOOD — Automated health check with structured output**

```bash
#!/bin/bash
# Automated system health check with JSON output
# Usage: ./health-check.sh [--json] [--output-dir /var/lib/health-checks/]
set -euo pipefail

JSON_OUTPUT=false
OUTPUT_DIR="/var/lib/health-checks"
HOSTNAME=$(hostname)
TIMESTAMP=$(date -Iseconds)

while [[ $# -gt 0 ]]; do
    case "$1" in
        --json) JSON_OUTPUT=true; shift ;;
        --output-dir) OUTPUT_DIR="$2"; shift 2 ;;
        *) shift ;;
    esac
done

mkdir -p "$OUTPUT_DIR"

# Check CPU usage
get_cpu_usage() {
    local idle
    idle=$(top -bn1 | grep "Cpu(s)" | awk '{print $8}' | cut -d. -f1)
    echo $((100 - ${idle:-0}))
}

# Check memory usage
get_memory_usage() {
    local total avail
    total=$(awk '/^MemTotal:/{print $2}' /proc/meminfo)
    avail=$(awk '/^MemAvailable:/{print $2}' /proc/meminfo)
    if [[ $total -gt 0 ]]; then
        echo "scale=1; (1 - $avail / $total) * 100" | bc | cut -d. -f1
    else
        echo 0
    fi
}

# Check disk usage
get_disk_usage() {
    df / --output=pcent | tail -1 | tr -d ' %'
}

# Check load ratio
get_load_ratio() {
    local load nproc load_ratio
    load=$(awk '{print $1}' /proc/loadavg)
    nproc=$(nproc)
    load_ratio=$(echo "scale=2; $load / $nproc" | bc)
    echo "$load_ratio"
}

# Determine status from threshold
get_status() {
    local value warn crit
    value=$(echo "$1" | cut -d. -f1)
    warn=${2:-70}
    crit=${3:-90}
    if [[ $value -ge $crit ]]; then echo "critical"
    elif [[ $value -ge $warn ]]; then echo "warning"
    else echo "ok"; fi
}

CPU_USAGE=$(get_cpu_usage)
MEM_USAGE=$(get_memory_usage)
DISK_USAGE=$(get_disk_usage)
LOAD_RATIO=$(get_load_ratio)

CPU_STATUS=$(get_status "$CPU_USAGE" 70 90)
MEM_STATUS=$(get_status "$MEM_USAGE" 75 90)
DISK_STATUS=$(get_status "$DISK_USAGE" 75 90)
LOAD_STATUS=$(get_status "${LOAD_RATIO%.*}" 1 2)

# Determine overall status
OVERALL="healthy"
if [[ "$CPU_STATUS" == "critical" || "$MEM_STATUS" == "critical" || "$DISK_STATUS" == "critical" || "$LOAD_STATUS" == "critical" ]]; then
    OVERALL="critical"
elif [[ "$CPU_STATUS" == "warning" || "$MEM_STATUS" == "warning" || "$DISK_STATUS" == "warning" || "$LOAD_STATUS" == "warning" ]]; then
    OVERALL="degraded"
fi

if [[ "$JSON_OUTPUT" == "true" ]]; then
    # Output JSON
    cat << EOF
{
  "hostname": "$HOSTNAME",
  "timestamp": "$TIMESTAMP",
  "overall_status": "$OVERALL",
  "checks": [
    {"metric": "cpu_usage", "value": $CPU_USAGE, "unit": "%", "status": "$CPU_STATUS", "threshold_warning": 70, "threshold_critical": 90},
    {"metric": "memory_usage", "value": $MEM_USAGE, "unit": "%", "status": "$MEM_STATUS", "threshold_warning": 75, "threshold_critical": 90},
    {"metric": "disk_usage", "value": $DISK_USAGE, "unit": "%", "status": "$DISK_STATUS", "threshold_warning": 75, "threshold_critical": 90},
    {"metric": "load_ratio", "value": $LOAD_RATIO, "unit": "x", "status": "$LOAD_STATUS", "threshold_warning": 1.0, "threshold_critical": 2.0}
  ]
}
EOF
else
    # Human-readable output
    echo "=== System Health: $HOSTNAME ==="
    echo "Timestamp: $TIMESTAMP"
    echo "Overall: $OVERALL"
    echo ""
    echo "CPU Usage:    ${CPU_USAGE}% [${CPU_STATUS}]"
    echo "Memory Usage: ${MEM_USAGE}% [${MEM_STATUS}]"
    echo "Disk Usage:   ${DISK_USAGE}% [${DISK_STATUS}]"
    echo "Load Ratio:   ${LOAD_RATIO}x [${LOAD_STATUS}]"
fi

# Save to file
OUTPUT_FILE="$OUTPUT_DIR/${HOSTNAME}-${TIMESTAMP}.json"
mkdir -p "$OUTPUT_DIR"
cat << EOF > "$OUTPUT_FILE"
{
  "hostname": "$HOSTNAME",
  "timestamp": "$TIMESTAMP",
  "overall_status": "$OVERALL",
  "checks": [
    {"metric": "cpu_usage", "value": $CPU_USAGE, "unit": "%", "status": "$CPU_STATUS", "threshold_warning": 70, "threshold_critical": 90},
    {"metric": "memory_usage", "value": $MEM_USAGE, "unit": "%", "status": "$MEM_STATUS", "threshold_warning": 75, "threshold_critical": 90},
    {"metric": "disk_usage", "value": $DISK_USAGE, "unit": "%", "status": "$DISK_STATUS", "threshold_warning": 75, "threshold_critical": 90},
    {"metric": "load_ratio", "value": $LOAD_RATIO, "unit": "x", "status": "$LOAD_STATUS", "threshold_warning": 1.0, "threshold_critical": 2.0}
  ]
}
EOF
echo "Report saved to $OUTPUT_FILE"
```

### Pattern 2: eBPF-Based Latency Investigation

```bash
# ❌ BAD: Using strace for performance investigation
# strace -p $(pgrep myapp) -e trace=network
# Problems:
# - High overhead (can slow process by 10-100x)
# - Not suitable for production
# - Generates massive output

# ✅ GOOD: Using eBPF for low-overhead tracing
# Install BCC tools
sudo apt install -y bpfcc-tools linux-headers-$(uname -r)

# Measure TCP connection latency with low overhead
sudo bpftrace -e '
tracepoint:tcp:tcp_set_state /args->state == 1/ {
    @connect_latency[tid] = nsecs;
}

tracepoint:tcp:tcp_rcv_space_adjust /@connect_latency[tid]/ {
    $latency = nsecs - @connect_latency[tid];
    printf("%d %d\n", tid, $latency);
    delete(@connect_latency[tid]);
}
'

# Profile file system latency
sudo bpftrace -e '
tracepoint:block:block_rq_issue {
    @start[args->dev, args->sector] = nsecs;
}

tracepoint:block:block_rq_complete /@start[args->dev, args->sector]/ {
    $latency = nsecs - @start[args->dev, args->sector];
    @latency_hist[args->dev] = hist($latency);
    delete(@start[args->dev, args->sector]);
}
'

# System-wide syscall latency histogram
sudo bpftrace -e '
kprobe:do_sys_open {
    @start[tid] = nsecs;
}

kretprobe:do_sys_open /@start[tid]/ {
    $latency = nsecs - @start[tid];
    @latency = hist($latency);
    delete(@start[tid]);
}
'
```

### Pattern 3: Alert Threshold Configuration by Workload

**Bash — Alert threshold configuration by workload**

```bash
#!/bin/bash
# Display alert thresholds for a workload type
# Usage: ./alert-thresholds.sh <workload-type>
# Workload types: database, web-server

set -euo pipefail

WORKLOAD="${1:-}"
if [[ -z "$WORKLOAD" ]]; then
    echo "Usage: $0 {database|web-server}"
    exit 1
fi

echo "=== Alert Thresholds: ${WORKLOAD} ==="
echo ""

case "$WORKLOAD" in
    database)
        echo "# Database workload alert thresholds"
        echo "# File: /etc/prometheus/rules/database-alerts.yml"
        echo ""
        cat << 'RULES'
groups:
  - name: database-alerts
    rules:
      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 90
        for: 5m
        labels: { severity: critical, workload: database }

      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 90
        for: 5m
        labels: { severity: critical, workload: database }

      - alert: DiskIOSaturation
        expr: rate(node_disk_io_time_seconds_total[5m]) > 0.95
        for: 5m
        labels: { severity: critical, workload: database }

      - alert: DBConnectionsHigh
        expr: postgresql_connections_active > 200
        for: 1m
        labels: { severity: critical, workload: database }

      - alert: ReplicationLag
        expr: postgresql_replication_lag_seconds > 300
        for: 5m
        labels: { severity: critical, workload: database }
RULES
        echo ""
        echo "  CPU:    warning=70%, critical=90%"
        echo "  Memory: warning=75%, critical=90%"
        echo "  DiskIO: warning=80%, critical=95%"
        echo "  Conns:  warning=100, critical=200"
        echo "  RepLag: warning=30s, critical=300s"
        ;;

    web-server)
        echo "# Web server workload alert thresholds"
        echo "# File: /etc/prometheus/rules/web-server-alerts.yml"
        echo ""
        cat << 'RULES'
groups:
  - name: web-server-alerts
    rules:
      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels: { severity: critical, workload: web-server }

      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 85
        for: 5m
        labels: { severity: critical, workload: web-server }

      - alert: HighRequestLatency
        expr: histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m])) > 5
        for: 5m
        labels: { severity: critical, workload: web-server }

      - alert: HighErrorRate
        expr: rate(http_request_errors_total[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 5m
        labels: { severity: critical, workload: web-server }

      - alert: HighNginxConnections
        expr: nginx_active_connections > 5000
        for: 1m
        labels: { severity: critical, workload: web-server }
RULES
        echo ""
        echo "  CPU:      warning=60%, critical=80%"
        echo "  Memory:   warning=70%, critical=85%"
        echo "  Latency:  warning=1.0s, critical=5.0s"
        echo "  ErrorRt:  warning=1.0%, critical=5.0%"
        echo "  Conns:    warning=1000, critical=5000"
        ;;

    *)
        echo "Unknown workload: $WORKLOAD"
        echo "Available: database, web-server"
        exit 1
        ;;
esac
```

---

## Constraints

### MUST DO

- **MUST** collect metrics at a consistent interval (5 minutes minimum, 1 minute for critical workloads) for accurate trend analysis
- **MUST** store metrics with timestamps and labels (hostname, workload, region) for proper filtering and correlation
- **MUST** set alert thresholds based on workload baselines, not arbitrary values — collect 2 weeks of baseline data before setting alerts
- **MUST** configure log rotation with size limits to prevent disk exhaustion from unbounded log growth
- **MUST** use eBPF-based tools (bcc, bpftrace, perf) for production performance investigation — they have minimal overhead compared to strace
- **MUST** document alert runbooks for each alert type — responders need clear steps to diagnose and remediate
- **MUST** test alerting delivery (email, Slack, PagerDuty) for each alert severity level
- **MUST** maintain a 30-day metrics retention window minimum for capacity planning trend analysis

### MUST NOT DO

- **MUST NOT** set alert thresholds on the first day of deployment — allow at least 2 weeks of baseline data collection
- **MUST NOT** use strace or similar high-overhead tracing tools in production without explicit approval — use eBPF instead
- **MUST NOT** store all logs on the local disk indefinitely — forward to centralized log storage with defined retention
- **MUST NOT** ignore warning alerts — treat warnings as pre-critical signals that require investigation within SLA timeframes
- **MUST NOT** set the same alert thresholds for all workload types — databases, web servers, and batch jobs have fundamentally different profiles
- **MUST NOT** rely solely on cloud provider metrics for observability — deploy agent-based metrics collection for application-level visibility
- **MUST NOT** set CPU alert thresholds above 90% for production systems — sustained high CPU indicates capacity planning issues

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `resource-management` | Investigate resource contention issues flagged by monitoring |
| `kernel-tuning` | Apply kernel parameter changes based on performance profiling results |
| `networking` | Investigate network performance issues flagged by observability |
| `linux-security` | Monitor security-relevant metrics (failed logins, audit events) |
| `hardware-provisioning` | Plan hardware capacity based on observability-driven growth projections |
