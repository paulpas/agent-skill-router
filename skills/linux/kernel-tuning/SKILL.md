---
name: kernel-tuning
description: Tunes Linux kernel parameters for workload optimization across cloud
  VMs and bare metal with hardware-aware adjustments for CPU, memory, and network
  performance.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: linux
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - config
  - do-dont
  triggers: kernel tuning, sysctl, NUMA, interrupt affinity, page cache, TCP tuning,
    kernel parameters, performance tuning
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: resource-management, hardware-provisioning, storage-architecture,
    linux-security
  maturity: stable
  completeness: 95
  exampleCount: 3
------
# Kernel Tuning for Linux Systems

Senior Linux engineer tuning kernel parameters to optimize system performance for specific workloads across cloud virtual machines and bare metal servers. Applies hardware-aware adjustments for CPU topology, memory architecture, and network stacks.

## TL;DR Checklist

- [ ] Audit current sysctl values with `sysctl -a` before any changes
- [ ] Measure baseline performance with workload-appropriate benchmarks
- [ ] Apply kernel parameters in staging before production deployment
- [ ] Verify NUMA topology with `numactl --hardware` and align workloads accordingly
- [ ] Configure interrupt affinity based on CPU core distribution
- [ ] Test TCP parameter changes under realistic network load
- [ ] Persist tuned parameters via `/etc/sysctl.d/` drop-in files
- [ ] Monitor post-change metrics to confirm improvement and no regressions

---

## When to Use

Use this skill when:

- **Optimizing VM or bare metal performance** — A production workload (database, web server, compute) is underperforming and needs kernel-level tuning
- **Workload-specific tuning required** — You're deploying a latency-sensitive application, high-throughput network service, or memory-intensive workload
- **Cloud vs on-prem parameter divergence** — You need to know which sysctl parameters differ between cloud hypervisors and bare metal hardware
- **NUMA and interrupt optimization** — You're tuning multi-socket servers for optimal memory locality and IRQ distribution
- **TCP stack tuning** — You need to optimize network throughput, latency, or connection handling for your workload profile

---

## When NOT to Use

Avoid this skill for:

- **General purpose desktop tuning** — These guidelines are for servers, not interactive workstations
- **Container-only environments without host access** — If you cannot modify the host kernel parameters, tuning is limited to container-level cgroups (use `resource-management` instead)
- **When the bottleneck is application-level** — If CPU, memory, or I/O profiling shows the application itself is the constraint, not the kernel
- **Kernel upgrades or compilation** — This skill covers parameter tuning, not building or updating the kernel itself

Use `hardware-provisioning` when selecting the right instance type or hardware baseline is the issue. Use `resource-management` when workload isolation and resource limits are the primary concern.

---

## Core Workflow

### 1. Assess Current State

Capture the baseline system state. Document kernel version, hardware topology, and current sysctl values.

```bash
# Capture baseline
uname -r
numactl --hardware
lscpu | grep -E 'Socket|Core|Thread|NUMA'
cat /proc/interrupts | head -20
sysctl -a | grep -E '^net\.(tcp|ip)\.|^vm\.' > baseline_sysctl.conf
```

**Checkpoint:** You have a complete baseline including kernel version, CPU/memory topology, and current sysctl values to compare against after changes.

### 2. Identify Workload Profile

Classify the workload to determine the appropriate tuning category.

```
Workload Type          → Focus Areas
─────────────────────────────────────────────
Database (OLTP)        → vm.dirty_ratio, vm.swappiness, TCP keepalive
Web/API server         → net.core.somaxconn, TCP backlog, file descriptors
High-throughput net    → TCP window scaling, RPS limits, ring buffer
Latency-sensitive      → CPU isolation, IRQ pinning, NUMA locality
Batch/Compute          → vm.dirty_background_ratio, I/O scheduler, page cache
```

**Checkpoint:** Workload type is classified and the corresponding tuning category is selected.

### 3. Apply Kernel Parameters

Create sysctl drop-in files in `/etc/sysctl.d/` for workload-specific tuning. Apply and verify.

```bash
# Create workload-specific sysctl configuration
cat > /etc/sysctl.d/99-$(workload-type).conf << 'EOF'
# Example: database workload tuning
vm.swappiness = 1
vm.dirty_ratio = 10
vm.dirty_background_ratio = 5
vm.min_free_kbytes = 65536
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 8192
EOF

# Apply and verify
sysctl --system
sysctl vm.swappiness vm.dirty_ratio net.core.somaxconn
```

**Checkpoint:** All parameters apply without errors. `sysctl --system` reports success and no warnings.

### 4. Configure NUMA and Interrupt Affinity

On multi-socket servers, align workloads to NUMA nodes and distribute interrupts.

```bash
# Check NUMA topology
numactl --hardware

# Pin process to NUMA node 0 (preferred allocation + local CPU)
numactl --cpunodebind=0 --membind=0 ./your_application

# Distribute IRQs across CPU cores
for irq in /proc/irq/*/smp_affinity; do
    cpu_mask=$(printf '%x' $((1 << $(echo "$irq" | grep -oP '\d+') % $(nproc))))
    echo "$cpu_mask" | sudo tee "$irq"
done
```

**Checkpoint:** Workloads are pinned to NUMA nodes and IRQs are distributed across all available cores. No single NUMA node is overloaded.

### 5. Persist and Monitor

Ensure tuning survives reboots and monitor for regressions.

```bash
# Verify persistence
cat /etc/sysctl.d/99-workload.conf
sysctl --system

# Set up monitoring for key tunables
watch -n 5 'sysctl vm.swappiness vm.dirty_ratio net.core.somaxconn'
```

**Checkpoint:** Parameters persist across reboots and monitoring confirms values remain at target levels.

---

## Implementation Patterns

### Pattern 1: Workload-Specific sysctl Configurations

**BAD — Generic one-size-fits-all tuning**

```bash
# ❌ BAD: Applying all parameters blindly without workload context
sysctl -w vm.swappiness=0
sysctl -w net.core.somaxconn=65535
sysctl -w vm.dirty_ratio=80
sysctl -w net.ipv4.tcp_tw_reuse=1

# Problems:
# - dirty_ratio=80 is catastrophic for databases (data loss on crash)
# - tcp_tw_reuse is deprecated in newer kernels
# - No persistence mechanism (lost on reboot)
# - No baseline comparison to measure improvement
```

**GOOD — Workload-aware, persisted configuration**

```bash
# ✅ GOOD: Database workload sysctl tuning (file: /etc/sysctl.d/99-database.conf)
cat > /etc/sysctl.d/99-database.conf << 'SYSCTL'
# Database workload tuning — prevents data loss, reduces latency

# Memory management: minimize swapping for database stability
vm.swappiness = 1
vm.overcommit_memory = 2
vm.min_free_kbytes = 131072

# Dirty page management: prevent I/O spikes
vm.dirty_ratio = 10
vm.dirty_background_ratio = 3
vm.dirty_expire_centisecs = 1000

# Network: connection handling for DB clients
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 8192
net.ipv4.tcp_keepalive_time = 600
net.ipv4.tcp_keepalive_intvl = 30

# File system
fs.file-max = 2097152
fs.inotify.max_user_watches = 524288
SYSCTL

# Apply
sysctl --system
```

### Pattern 2: TCP Tuning for Network Throughput

**BAD — Manual sysctl commands without persistence**

```bash
# ❌ BAD: Ephemeral changes, no error checking, no workload basis
sysctl -w net.core.rmem_max=16777216
sysctl -w net.core.wmem_max=16777216
sysctl -w net.ipv4.tcp_rmem="4096 87380 16777216"
sysctl -w net.ipv4.tcp_wmem="4096 65536 16777216"

# Problems:
# - Lost on reboot
# - No validation of current values before override
# - Overly aggressive window sizes can consume memory on low-spec instances
```

**GOOD — Persisted, conditional TCP tuning with cloud awareness**

```bash
#!/bin/bash
# Apply TCP tuning sysctl configuration based on workload type
# Usage: ./tcp-tuning.sh <workload-type>
# Workload types: high-throughput, low-latency, cloud-standard

set -euo pipefail

WORKLOAD="${1:-cloud-standard}"
TARGET="/etc/sysctl.d/99-tcp-${WORKLOAD}.conf"

# Validate workload type
case "$WORKLOAD" in
    high-throughput|low-latency|cloud-standard) ;;
    *) echo "Invalid workload: $WORKLOAD"; echo "Usage: $0 {high-throughput|low-latency|cloud-standard}"; exit 1 ;;
esac

# Backup current sysctl before changes
echo "Backing up current sysctl configuration..."
sudo cp /etc/sysctl.conf "/etc/sysctl.conf.bak.$(date +%Y%m%d)"

# Generate sysctl configuration
cat > "$TARGET" << 'SYSCTL'
# TCP tuning profile — workload-specific configuration
# Auto-generated — verify before production deployment
SYSCTL

case "$WORKLOAD" in
    high-throughput)
        cat >> "$TARGET" << 'SYSCTL'

# High-throughput: Maximize buffer sizes for data pipelines, bulk transfers
# Socket buffer sizes (16MB max)
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.core.rmem_default = 8388608
net.core.wmem_default = 8388608

# TCP dynamic buffer sizes (min, default, max)
net.ipv4.tcp_rmem = "4096 87380 16777216"
net.ipv4.tcp_wmem = "4096 65536 16777216"

# BBR congestion control for high throughput
net.ipv4.tcp_congestion_control = bbr
net.ipv4.tcp_fastopen = 3
net.ipv4.tcp_tw_reuse = 1

# Connection handling
net.ipv4.tcp_max_syn_backlog = 8192
net.core.somaxconn = 65535
SYSCTL
        echo "Applied high-throughput TCP tuning profile"
        ;;

    low-latency)
        cat >> "$TARGET" << 'SYSCTL'

# Low-latency: Minimize buffer sizes for API servers, real-time services
# Small buffers reduce queueing delay
net.core.rmem_max = 262144
net.core.wmem_max = 262144
net.core.rmem_default = 131072
net.core.wmem_default = 131072

# TCP dynamic buffer sizes (small)
net.ipv4.tcp_rmem = "4096 16384 262144"
net.ipv4.tcp_wmem = "4096 16384 262144"

# BBR congestion control (good for latency too)
net.ipv4.tcp_congestion_control = bbr

# Reduce connection tracking latency
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_keepalive_time = 600
net.ipv4.tcp_keepalive_intvl = 30
net.ipv4.tcp_keepalive_probes = 5

# Connection handling
net.ipv4.tcp_max_syn_backlog = 4096
net.core.somaxconn = 4096
SYSCTL
        echo "Applied low-latency TCP tuning profile"
        ;;

    cloud-standard)
        cat >> "$TARGET" << 'SYSCTL'

# Cloud-standard: Balanced profile for general cloud workloads
# Moderate buffer sizes suitable for most cloud instances
net.core.rmem_max = 4194304
net.core.wmem_max = 4194304
net.core.rmem_default = 2097152
net.core.wmem_default = 2097152

# TCP dynamic buffer sizes (moderate)
net.ipv4.tcp_rmem = "4096 87380 4194304"
net.ipv4.tcp_wmem = "4096 65536 4194304"

# BBR congestion control
net.ipv4.tcp_congestion_control = bbr
net.ipv4.tcp_fastopen = 3

# Connection handling
net.ipv4.tcp_max_syn_backlog = 8192
net.core.somaxconn = 65535
SYSCTL
        echo "Applied cloud-standard TCP tuning profile"
        ;;
esac

# Apply and verify
echo "Applying sysctl configuration..."
sudo sysctl --system 2>&1 | grep -v "ignoring" || true
echo ""
echo "Current values for ${WORKLOAD}:"
sysctl net.core.rmem_max net.core.wmem_max net.ipv4.tcp_rmem net.ipv4.tcp_wmem net.ipv4.tcp_congestion_control
echo ""
echo "Configuration written to: $TARGET"
echo "Verify with: sysctl -a | grep -E 'tcp_.*|rmem|wmem'"
```

### Pattern 3: Cloud vs On-Prem Kernel Differences

```
┌────────────────────────┬──────────────────────┬──────────────────────┐
│ Parameter               │ Cloud VM             │ On-Prem Bare Metal   │
├────────────────────────┼──────────────────────┼──────────────────────┤
│ vm.swappiness          │ 1-10 (overcommit    │ 1-5 (full control    │
│                        │  may be enforced by  │   of memory)         │
│                        │  hypervisor)         │                      │
├────────────────────────┼──────────────────────┼──────────────────────┤
│ net.ipv4.tcp_          │ May be restricted    │ Full control         │
│ fastopen               │ by cloud provider    │                      │
├────────────────────────┼──────────────────────┼──────────────────────┤
│ kernel.kptr_restrict   │ Often locked at 2    │ Default 0 or 1       │
│                        │ (no kernel ptr       │                      │
│                        │  exposure)           │                      │
├────────────────────────┼──────────────────────┼──────────────────────┤
│ kernel.perf_event_paranoid │ High (restricted)│ Full control         │
│                        │ (limits perf/eBPF)   │                      │
├────────────────────────┼──────────────────────┼──────────────────────┤
│ vm.nr_hugepages        │ Limited by hypervisor│ Full control         │
│                        │ memory reservation   │                      │
├────────────────────────┼──────────────────────┼──────────────────────┤
│ IO scheduler           │ Often set to none/   │ Choose per-device:   │
│                        │ mq-deadline by       │ mq-deadline (SSD),   │
│                        │ hypervisor           │ bfq (HDD)            │
└────────────────────────┴──────────────────────┴──────────────────────┘
```

---

## Constraints

### MUST DO

- **MUST** create sysctl configuration files in `/etc/sysctl.d/` — never use `sysctl -w` for production changes as they are lost on reboot
- **MUST** verify current kernel version supports the parameters you are setting — some parameters change or are deprecated across kernel releases
- **MUST** test all kernel parameter changes in a staging environment matching production topology before applying to production
- **MUST** measure baseline performance metrics before and after tuning to quantify improvement
- **MUST** validate NUMA alignment for workloads on multi-socket servers — local memory access is significantly faster than remote
- **MUST** use `sysctl --system` to reload configuration and verify with `sysctl <param>` that changes took effect
- **MUST** consider cloud provider restrictions — some kernel parameters are locked or overridden by the hypervisor

### MUST NOT DO

- **MUST NOT** apply generic "internet tuning" scripts without evaluating each parameter against your workload profile
- **MUST NOT** set `vm.swappiness` to 0 on systems where OOM conditions are possible — it can cause immediate OOM kills instead of gradual swapping
- **MUST NOT** override cloud provider kernel parameters without explicit approval — hypervisors may enforce security constraints
- **MUST NOT** configure interrupt affinity on single-core VMs — there are no additional cores to distribute to
- **MUST NOT** use `tcp_tw_reuse` or `tcp_tw_recycle` — these are removed or deprecated in modern kernels (5.x+)
- **MUST NOT** apply kernel tuning as a substitute for adequate hardware sizing — tuning extracts 10-30% improvement, not orders of magnitude

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `resource-management` | Manage workload resource limits with cgroups when kernel tuning alone is insufficient |
| `hardware-provisioning` | Select appropriate hardware/instance type before tuning for optimal baseline performance |
| `storage-architecture` | Tune storage-specific parameters (I/O scheduler, mount options) alongside kernel tuning |
| `linux-security` | Ensure kernel hardening does not conflict with performance tuning goals |
| `observability` | Monitor kernel parameters and performance metrics to validate tuning effectiveness |
