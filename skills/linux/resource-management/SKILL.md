---




name: resource-management
description: Manages Linux system resources using cgroups v2, namespaces, and systemd
  for workload isolation and resource guarantees in cloud and on-prem environments.
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
  triggers: cgroups, resource management, cpu limit, memory limit, systemd resource,
    OOM, workload isolation, resource quota
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: kernel-tuning, hardware-provisioning, linux-services, storage-architecture
  maturity: stable
  completeness: 95
  exampleCount: 3




---




# Linux Resource Management with cgroups and systemd

Senior systems engineer configuring and managing Linux resources using cgroups v2, namespaces, and systemd to isolate workloads and guarantee resource allocation across cloud and on-prem environments.

## TL;DR Checklist

- [ ] Verify cgroups v2 is enabled (`cat /sys/fs/cgroup/cgroup.controllers`)
- [ ] Assign workloads to dedicated cgroup hierarchies by service or tenant
- [ ] Set CPU limits using `cpu.max` (quota/period) and memory limits using `memory.max`
- [ ] Configure I/O bandwidth limits with `io.max` for block devices
- [ ] Apply systemd resource directives in unit files for managed services
- [ ] Set OOM scoring and memory pressure handlers for critical services
- [ ] Monitor resource utilization with `systemd-cgtop` and cgroup stat tools
- [ ] Validate resource isolation by running stress tests within cgroups

---

## When to Use

Use this skill when:

- **Multi-tenant workloads** — You're running multiple applications or tenants on the same host and need resource isolation
- **Resource guarantee requirements** — A service must have a minimum CPU/memory allocation to meet SLA targets
- **Preventing resource starvation** — A noisy-neighbor workload is consuming all available resources and starving others
- **Container host configuration** — You're configuring the underlying host for container runtimes that rely on cgroups
- **Batch job management** — You need to cap resource usage for intermittent batch or compute workloads

---

## When NOT to Use

Avoid this skill for:

- **Single workload on dedicated host** — If one application owns the entire server, cgroup overhead adds complexity without benefit
- **Container-only environments** — Let the container runtime (Docker, containerd, podman) manage cgroups; configure the runtime instead
- **Soft resource preferences** — If a workload should *prefer* more resources but not be capped, use CPU priority (`cpu.weight`) instead of hard limits
- **Kernel version < 5.7 without cgroups v1 fallback** — cgroups v2 is required for unified resource control; verify your kernel supports it

Use `linux-services` when you need to manage service lifecycle (start/stop/restart) alongside resource constraints. Use `kernel-tuning` when the issue is kernel parameter behavior rather than resource allocation.

---

## Core Workflow

### 1. Verify cgroups v2 Support

Check that the unified cgroups hierarchy is active.

```bash
# Verify cgroups v2 is mounted and active
stat -fc %T /sys/fs/cgroup/

# Check available controllers
cat /sys/fs/cgroup/cgroup.controllers

# Enable missing controllers
echo "+cpu +memory +io" | sudo tee /sys/fs/cgroup/cgroup.subtree_control
```

**Checkpoint:** cgroups v2 is mounted (type `cgroup2`) and all required controllers (cpu, memory, io) are listed in `cgroup.subtree_control`.

### 2. Create Cgroup Hierarchy

Build a hierarchical cgroup structure matching your workload topology.

```bash
# Create hierarchy for multi-workload host
sudo mkdir -p /sys/fs/cgroup/workloads/{web,db,batch}

# Assign CPU and memory limits to each workload
echo "50000 100000" | sudo tee /sys/fs/cgroup/workloads/web/cpu.max
# 50ms CPU quota per 100ms period = 50% of one core

echo "2G" | sudo tee /sys/fs/cgroup/workloads/web/memory.max

# Database gets higher limits
echo "100000 100000" | sudo tee /sys/fs/cgroup/workloads/db/cpu.max
echo "8G" | sudo tee /sys/fs/cgroup/workloads/db/memory.max

# Batch job gets lower priority with OOM protection
echo "25000 100000" | sudo tee /sys/fs/cgroup/workloads/batch/cpu.max
echo "4G" | sudo tee /sys/fs/cgroup/workloads/batch/memory.max
```

**Checkpoint:** Each workload has its own cgroup directory with CPU and memory limits set. Hierarchy reflects workload criticality.

### 3. Configure I/O Control

Set I/O bandwidth limits to prevent disk contention between workloads.

```bash
# Check which block devices are tracked
cat /sys/fs/cgroup/io.stat

# Get major:minor of device
ls -l /dev/sda

# Set I/O limits: max 100MB/s read, 50MB/s write for batch
echo "8:0 rbps=104857600 wbps=52428800" | sudo tee /sys/fs/cgroup/workloads/batch/io.max

# Database gets higher I/O priority with higher limits
echo "8:0 rbps=524288000 wbps=262144000" | sudo tee /sys/fs/cgroup/workloads/db/io.max

# Set I/O weight (fair-share priority): default=100, range=1-10000
echo "500" | sudo tee /sys/fs/cgroup/workloads/db/io.weight
echo "100" | sudo tee /sys/fs/cgroup/workloads/batch/io.weight
```

**Checkpoint:** I/O limits are set per device and workloads have proportional weights reflecting their priority.

### 4. Integrate with systemd

For services managed by systemd, use resource directives in unit files instead of raw cgroup manipulation.

```ini
# /etc/systemd/system/myapp.service
[Unit]
Description=My Application Service
After=network.target

[Service]
Type=simple
ExecStart=/opt/myapp/server
User=myapp

# CPU limits: 2 cores max, 1 core minimum with weight-based sharing
CPUQuota=200%
CPUWeight=500

# Memory limits with OOM protection
MemoryMax=8G
MemoryHigh=7G
OOMPolicy=stop

# I/O weight and bandwidth
IOWeight=500
IOReadBandwidthMax=/dev/sda 500M
IOWriteBandwidthMax=/dev/sda 250M

# Restart policy
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

**Checkpoint:** Unit file is created, reloaded (`systemctl daemon-reload`), and the service starts with resource constraints applied.

### 5. Configure OOM Handling

Set OOM scoring and handling for critical workloads.

```bash
# OOM score adj: lower = less likely to be killed (range -1000 to 1000)
echo "-500" | sudo tee /sys/fs/cgroup/workloads/db/cgroup.oom压力_handler
# Note: use systemd OOMPolicy for managed services instead

# Set up memory pressure monitoring
cat > /usr/local/bin/cgroup-oom-handler << 'HANDLER'
#!/bin/bash
# Handler for OOM events in cgroup
echo "$(date) OOM event in $1" >> /var/log/cgroup-oom.log
systemctl restart "$1"
HANDLER
chmod +x /usr/local/bin/cgroup-oom-handler
```

**Checkpoint:** Critical services have OOM policies that prevent cascading failures. Database uses `OOMPolicy=stop`, non-critical services use `OOMPolicy=kill`.

### 6. Monitor and Validate

Verify resource isolation with monitoring tools.

```bash
# Real-time cgroup monitoring
systemd-cgtop

# Read cgroup resource statistics
cat /sys/fs/cgroup/workloads/web/cpu.stat
cat /sys/fs/cgroup/workloads/web/memory.stat

# Check current limits vs usage
systemctl status myapp.service | grep -A 5 "Memory"

# Stress test within cgroup limits
sudo systemd-run --scope -p MemoryMax=1G -p CPUQuota=50% stress-ng --vm 2 --vm-bytes 500M
```

**Checkpoint:** Monitoring confirms workloads respect their limits. Stress tests confirm cgroup enforcement and no cross-workload resource leakage.

---

## Implementation Patterns

### Pattern 1: Cgroup v2 Resource Limits (BAD vs. GOOD)

**BAD — cgroups v1 mixed hierarchy with manual process management**

```bash
# ❌ BAD: cgroups v1 split hierarchy, manual process tracking
mkdir -p /sys/fs/cgroup/cpu/web
mkdir -p /sys/fs/cgroup/memory/web
echo "50000" > /sys/fs/cgroup/cpu/web/cpu.cfs_quota_us
echo "100000" > /sys/fs/cgroup/cpu/web/cpu.cfs_period_us
echo "2147483648" > /sys/fs/cgroup/memory/web/memory.limit_in_bytes

# Manual process tracking (breaks when process forks/execs)
echo $PID > /sys/fs/cgroup/cpu/web/tasks
echo $PID > /sys/fs/cgroup/memory/web/tasks

# Problems:
# - Split hierarchy: CPU and memory in separate cgroups (no unified control)
# - Memory limit in bytes, not human-readable (2147483648 = 2G)
# - Manual PID management misses child processes
# - No I/O control integration
```

**GOOD — cgroups v2 unified hierarchy with systemd integration**

```ini
# ✅ GOOD: systemd-managed cgroups v2 with unified resource control
# File: /etc/systemd/system/webapp.service

[Service]
# CPU: 2 cores maximum, fair-share weight of 500 (default 100)
CPUQuota=200%
CPUWeight=500

# Memory: hard limit 4G, soft limit 3G (throttle before hard limit)
MemoryMax=4G
MemoryHigh=3G

# I/O: weight 500, bandwidth cap 200MB/s read, 100MB/s write
IOWeight=500
IOReadBandwidthMax=/dev/sda 200M
IOWriteBandwidthMax=/dev/sda 100M

# OOM handling: stop service instead of killing individual processes
OOMPolicy=stop
```

### Pattern 2: Resource Templates for Common Workloads

**Bash — Resource templates for common workload types**

```bash
#!/bin/bash
# Generate systemd service with resource constraints for common workload types
# Usage: ./generate-resource-service.sh <profile-name> <service-name> [exec-cmd]
# Profiles: web-server, database, batch-job, monitoring

set -euo pipefail

PROFILE="${1:-}"
SERVICE_NAME="${2:-}"
EXEC_CMD="${3:-/opt/${SERVICE_NAME:-webapp}/server}"

if [[ -z "$PROFILE" || -z "$SERVICE_NAME" ]]; then
    echo "Usage: $0 <profile-name> <service-name> [exec-cmd]"
    echo "Profiles: web-server, database, batch-job, monitoring"
    exit 1
fi

SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

# Define resource profiles
case "$PROFILE" in
    web-server)
        CPU_QUOTA="100%"
        CPU_WEIGHT="200"
        MEM_MAX="2G"
        MEM_HIGH="1.5G"
        IO_WEIGHT="200"
        OOM_POLICY="restart"
        DESCRIPTION="Web application server"
        ;;
    database)
        CPU_QUOTA="400%"
        CPU_WEIGHT="500"
        MEM_MAX="16G"
        MEM_HIGH="12G"
        IO_WEIGHT="500"
        OOM_POLICY="stop"
        DESCRIPTION="Database server"
        ;;
    batch-job)
        CPU_QUOTA="200%"
        CPU_WEIGHT="50"
        MEM_MAX="4G"
        MEM_HIGH=""
        IO_WEIGHT="50"
        OOM_POLICY="kill"
        DESCRIPTION="Batch processing workload"
        ;;
    monitoring)
        CPU_QUOTA="50%"
        CPU_WEIGHT="50"
        MEM_MAX="512M"
        MEM_HIGH="256M"
        IO_WEIGHT="50"
        OOM_POLICY="restart"
        DESCRIPTION="Monitoring and telemetry agent"
        ;;
    *)
        echo "Unknown profile: $PROFILE"
        echo "Available: web-server, database, batch-job, monitoring"
        exit 1
        ;;
esac

cat > "$SERVICE_FILE" << EOF
[Unit]
Description=${DESCRIPTION}
After=network.target

[Service]
Type=simple
ExecStart=${EXEC_CMD}

# CPU limits
CPUQuota=${CPU_QUOTA}
CPUWeight=${CPU_WEIGHT}

# Memory limits
MemoryMax=${MEM_MAX}
EOF

if [[ -n "$MEM_HIGH" ]]; then
    echo "MemoryHigh=${MEM_HIGH}" >> "$SERVICE_FILE"
fi

cat >> "$SERVICE_FILE" << EOF

# I/O weight
IOWeight=${IO_WEIGHT}

# OOM handling
OOMPolicy=${OOM_POLICY}
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

echo "Generated ${SERVICE_FILE}"
echo "Run: systemctl daemon-reload && systemctl enable --now ${SERVICE_NAME}"
```

### Pattern 3: Cloud Instance Resource Awareness

**Bash — Detect cloud instance type and suggest resource limits**

```bash
#!/bin/bash
# Detect cloud instance type and suggest appropriate resource limits
# Usage: ./detect-instance.sh [--suggest]
set -euo pipefail

SUGGEST=false
if [[ "${1:-}" == "--suggest" ]]; then
    SUGGEST=true
fi

# Detect cloud provider
detect_provider() {
    # AWS
    if curl -s -m 2 http://169.254.169.254/latest/meta-data/instance-type 2>/dev/null | grep -q '^i-'; then
        local inst_type
        inst_type=$(curl -s -m 2 http://169.254.169.254/latest/meta-data/instance-type)
        echo "aws|$inst_type"
        return
    fi
    # GCP
    if curl -s -m 2 -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/machine-type 2>/dev/null | grep -q 'n1-'; then
        local inst_type
        inst_type=$(curl -s -m 2 -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/machine-type)
        inst_type=$(basename "$inst_type")
        echo "gcp|$inst_type"
        return
    fi
    # Azure
    if curl -s -m 2 -H "Metadata-Severity: Interactive" "http://169.254.169.254/metadata/instance?api-version=2021-02-01" 2>/dev/null | grep -q '"compute"'; then
        local inst_type
        inst_type=$(curl -s -m 2 -H "Metadata-Severity: Interactive" "http://169.254.169.254/metadata/instance?api-version=2021-02-01" | jq -r '.compute.vmSize')
        echo "azure|$inst_type"
        return
    fi
    echo "bare-metal|unknown"
}

# Get actual vCPU count
get_vcpus() {
    nproc 2>/dev/null || echo 1
}

# Get memory in GB
get_memory_gb() {
    local kb
    kb=$(awk '/^MemTotal:/{print $2}' /proc/meminfo)
    echo "scale=0; $kb / 1024 / 1024" | bc
}

# Main detection
read -r PROVIDER INST_TYPE <<< "$(detect_provider | tr '|' ' ')"
VCPUS=$(get_vcpus)
MEMORY_GB=$(get_memory_gb)

echo "=== Instance Detection ==="
echo "Provider:   $PROVIDER"
echo "Type:       $INST_TYPE"
echo "vCPUs:      $VCPUS"
echo "Memory:     ${MEMORY_GB}GB"
echo ""

if [[ "$SUGGEST" == "true" ]]; then
    echo "=== Suggested Resource Limits ==="
    # Reserve 25% vCPU for OS/hypervisor
    APP_VCPUS=$((VCPUS * 75 / 100))
    # Reserve 15% memory for OS/hypervisor
    APP_MEM=$((MEMORY_GB * 85 / 100))
    APP_MEM_HIGH=$((APP_MEM * 80 / 100))

    echo "CPUQuota=${APP_VCPUS}00%"
    echo "MemoryMax=${APP_MEM}G"
    echo "MemoryHigh=${APP_MEM_HIGH}G"
    echo ""
    echo "Note: Reserve 25% vCPU and 15% memory for OS/hypervisor overhead"
    echo "On bare metal, adjust reserves to 10% vCPU and 10% memory"
fi

if [[ "$PROVIDER" == "bare-metal" ]]; then
    echo ""
    echo "Bare metal detected — use manual resource configuration"
    echo "Recommended: CPUQuota=400%, MemoryMax=80% of total, MemoryHigh=80% of Max"
fi
```

---

## Constraints

### MUST DO

- **MUST** verify cgroups v2 is active before configuring — check `/sys/fs/cgroup/cgroup.controllers` exists and is type `cgroup2`
- **MUST** set memory limits on all workloads that could grow unbounded — prevent OOM killer from terminating critical services
- **MUST** use systemd resource directives for managed services instead of raw cgroup manipulation — systemd manages process tracking and hierarchy
- **MUST** set `MemoryHigh` (soft limit) below `MemoryMax` (hard limit) to enable memory reclaim pressure before hard OOM
- **MUST** set CPU quota high enough for the workload's peak, not just average — CPU throttling is visible as latency spikes
- **MUST** test resource isolation with stress tests to confirm limits are enforced and no cross-workload leakage occurs
- **MUST** account for hypervisor overhead when sizing cloud instances — the host OS and hypervisor consume resources not available to cgroups

### MUST NOT DO

- **MUST NOT** set CPU quota to 0 — this effectively freezes the cgroup and kills all processes inside it
- **MUST NOT** set memory.max below the application's minimum working set — it will OOM immediately on startup
- **MUST NOT** manage cgroup tasks manually when using systemd — let systemd track processes via the cgroup hierarchy
- **MUST NOT** apply the same resource limits to all workloads — database, web, and batch workloads have fundamentally different resource profiles
- **MUST NOT** forget to set I/O limits on shared-storage hosts — a single noisy-neighbor can degrade all workloads' I/O performance
- **MUST NOT** use cgroups v1 split hierarchy on new deployments — cgroups v1 is deprecated and lacks unified resource control

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `kernel-tuning` | Tune kernel parameters that affect resource behavior (swappiness, OOM scores) |
| `hardware-provisioning` | Select appropriate hardware to ensure resource limits have meaningful headroom |
| `linux-services` | Manage service lifecycle with systemd alongside resource constraints |
| `storage-architecture` | Configure storage I/O parameters that interact with cgroup I/O limits |
| `observability` | Monitor cgroup resource usage and set alerts for resource pressure |
