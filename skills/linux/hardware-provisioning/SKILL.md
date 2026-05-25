---
name: hardware-provisioning
description: Plans and provisions Linux systems for cloud instances and on-prem hardware
  with workload-appropriate sizing, RAID, and hardware abstraction.
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
  triggers: hardware provisioning, instance sizing, RAID configuration, SSD, cloud
    instance, on-prem hardware, disk sizing, CPU architecture
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: resource-management, kernel-tuning, storage-architecture, linux-security
  maturity: stable
  completeness: 95
  exampleCount: 3
------
# Linux Hardware Provisioning

Infrastructure engineer planning and provisioning Linux systems for cloud instances and on-prem hardware, selecting appropriate sizing, configuring RAID/storage, and abstracting hardware differences for consistent operation.

## TL;DR Checklist

- [ ] Define workload requirements (CPU, memory, storage I/O, network bandwidth) before selecting hardware
- [ ] Choose cloud instance type or on-prem hardware that matches workload profile
- [ ] Verify CPU architecture compatibility (x86_64 vs ARM64) for all software dependencies
- [ ] Select RAID level based on workload durability vs performance requirements
- [ ] Configure SSD/NVMe optimization (TRIM support, I/O scheduler)
- [ ] Set up hardware monitoring (SMART, IPMI, sensor data)
- [ ] Document hardware inventory and configuration for change management
- [ ] Test workload on target hardware with representative benchmarks before production deployment

---

## When to Use

Use this skill when:

- **Selecting cloud instances** — You're choosing instance types and sizes for workloads across AWS, GCP, Azure, or other providers
- **Building on-prem servers** — You're procuring and configuring physical servers for deployment
- **Storage architecture planning** — You need to select RAID levels, disk types (SSD/NVMe/HDD), and capacity for the workload
- **Cross-architecture deployment** — You're deploying software that must run on both x86_64 and ARM64 platforms
- **Hardware capacity planning** — You're sizing infrastructure to handle projected growth and peak load

---

## When NOT to Use

Avoid this skill for:

- **Software application development** — Hardware provisioning is an infrastructure concern, not an application concern
- **Network configuration** — Use `networking` skill for interface, bonding, and firewall configuration
- **OS-level tuning** — Use `kernel-tuning` for performance optimization after hardware is selected
- **When hardware is fully managed by cloud provider** — Bare metal services and managed databases abstract hardware selection away

Use `storage-architecture` for filesystem, LVM, and mount option configuration after storage hardware is provisioned. Use `resource-management` for post-provisioning resource allocation and workload isolation.

---

## Core Workflow

### 1. Define Workload Requirements

Quantify hardware needs based on workload characteristics.

```
Workload Type          CPU     Memory     Storage I/O     Network
─────────────────────────────────────────────────────────────────
Web/API Server         4-16   8-32 GB    Moderate        1-10 Gbps
Database (OLTP)        8-64   32-256 GB  High (low lat)  1-25 Gbps
Database (OLAP)        16-128 64-512 GB  Very High       10-100 Gbps
Batch/Compute          32-256 64-1024 GB Low-Moderate    1-10 Gbps
Storage Server         8-32   32-128 GB  Very High       10-100 Gbps
Monitoring             2-8    4-16 GB    Moderate        1 Gbps
```

**Checkpoint:** Workload requirements are documented with minimum and recommended specs, backed by benchmark data or industry references.

### 2. Select Cloud Instance Type

Match workload to cloud instance family.

**AWS — Query available instance types by family**

```bash
# List general purpose instances with specs
aws ec2 describe-instance-types \
  --filters "Name=instance-type-group-name,Values=general*\" \
  --query 'InstanceTypes[*].[InstanceType,VCPUs,MemoryInfo.SizeInMiB,ProcessorInfo.SupportedArchitectures[0]]' \
  --output table

# List memory-optimized instances
aws ec2 describe-instance-types \
  --filters "Name=instance-type-group-name,Values=memory*" \
  --query 'InstanceTypes[*].[InstanceType,VCPUs,MemoryInfo.SizeInMiB,EbsOptimizedInfo.MaximumEbsBandwidthInGbps]' \
  --output table

# Get pricing for a specific instance (requires Price List API)
aws pricing get-products \
  --service-code AmazonEC2 \
  --filters 'Field=instanceType,Value=m7i.xlarge,MatchOptions=EXACT' \
  --region us-east-1 \
  --output json | jq '.PriceList[0] | fromjson | .product.attributes | {instance_type: instanceType, vcpus: vcpu, memory_gb: memory, storage: storage, price_usd: pricePerUnit.usd}'
```

**GCP — Query available instance types**

```bash
# List machine types with specs
gcloud compute machine-types list \
  --filter="name~'n2-standard' OR name~'m2-ultra' OR name~'c2d'" \
  --format='table[name,zones[0],guest_cpus,memory_mb,local_ssd_disk]'

# List AMD compute-optimized instances
gcloud compute machine-types list \
  --filter="name~'c2d-84' AND zones~'us-east1'" \
  --format='table[name,guest_cpus,memory_mb,local_ssd_disk,networking.guest_cpus_per_nic]'
```

**Instance selection by workload type**

```bash
#!/bin/bash
# Select instance type based on workload requirements
# Usage: ./select-instance.sh workload-type provider [region]

WORKLOAD="${1:-database}"
PROVIDER="${2:-aws}"
REGION="${3:-us-east-1}"

case "$WORKLOAD" in
    database)
        case "$PROVIDER" in
            aws)
                echo "AWS: r7i.xlarge (4 vCPU, 32 GB RAM, 12K IOPS, 125$/mo)"
                echo "       r7i.2xlarge (8 vCPU, 64 GB RAM, 12K IOPS, 250$/mo)"
                ;;
            gcp)
                echo "GCP: n2-standard-4 (4 vCPU, 16 GB RAM, 12K IOPS, 110$/mo)"
                echo "     m2-ultramem-208 (208 vCPU, 2912 GB RAM, 1.6M IOPS, 5500$/mo)"
                ;;
        esac
        ;;
    web)
        case "$PROVIDER" in
            aws) echo "AWS: m7i.xlarge (4 vCPU, 16 GB, gp3, 5Gbps, 91$/mo)" ;;
            gcp) echo "GCP: n2-standard-4 (4 vCPU, 16 GB, pd-ssd, 16Gbps, 110$/mo)" ;;
        esac
        ;;
    compute)
        case "$PROVIDER" in
            aws) echo "AWS: c7i.xlarge (4 vCPU, 8 GB, gp3, 5Gbps, 75$/mo)" ;;
            gcp) echo "GCP: c2d-84 (84 vCPU, 336 GB, local-ssd, 4Tbps, 2100$/mo)" ;;
        esac
        ;;
    *)
        echo "Unknown workload: $WORKLOAD"
        echo "Supported: database, web, compute, batch, storage"
        exit 1
        ;;
esac
```

**Checkpoint:** Instance type is selected that meets minimum requirements with room for growth. Cost is documented.

### 3. Configure RAID for On-Prem Hardware

Select and configure RAID based on workload needs.

```
RAID Level   Durability   Performance    Capacity Efficiency    Best For
────────────────────────────────────────────────────────────────────────────────
RAID 0       None         Max read/write 100%            Development, cache
RAID 1       1 disk loss  Good read,   50%                    OS disk, boot
                         moderate write
RAID 5       N-1 disks    Good read,     (N-1)/N               Read-heavy workloads
                         degraded write
RAID 6       N-2 disks    Good read,     (N-2)/N               Critical storage, NAS
                         degraded write
RAID 10      1 per mirror Max read/write  50%                    High-performance DB
RAID 50      N-1 per set  Good           (N-k)/N               Large read-heavy arrays
RAID 60      N-2 per set  Good           (N-k)/N               Large critical arrays
```

```bash
# Configure RAID 10 with mdadm for database
sudo mdadm --create /dev/md0 --level=10 --raid-devices=4 \
    /dev/sdb /dev/sdc /dev/sdd /dev/sde \
    --chunk=256 --metadata=1.2 --name=db-data

# Configure RAID 6 with mdadm for storage
sudo mdadm --create /dev/md1 --level=6 --raid-devices=6 \
    /dev/sdf /dev/sdg /dev/sdh /dev/sdi /dev/sdj /dev/sdk \
    --chunk=64 --metadata=1.2 --name=storage-data

# Create filesystem on RAID array
sudo mkfs.xfs -f /dev/md0
sudo mkfs.xfs -f /dev/md1

# Add mdadm configuration for persistence
sudo mdadm --detail --scan | sudo tee -a /etc/mdadm/mdadm.conf
sudo update-initramfs -u  # Debian/Ubuntu
sudo dracut --force       # RHEL/CentOS
```

**Checkpoint:** RAID array is assembled, filesystem is created, and mdadm configuration persists across reboots.

### 4. Optimize SSD/NVMe Performance

Configure SSD-specific settings for maximum performance and longevity.

```bash
# Verify TRIM/discard support
sudo fstrim -v /mount/point

# Set I/O scheduler for SSD/NVMe (none/mq-deadline for NVMe)
echo "none" | sudo tee /sys/block/sdX/queue/scheduler
# For NVMe:
echo "none" | sudo tee /sys/block/nvme0n1/queue/scheduler

# Set read-ahead for workload type (default 128 sectors = 64KB)
# Sequential workloads benefit from higher read-ahead
sudo blockdev --setra 4096 /dev/sdX   # 4096 sectors = 2MB read-ahead

# Enable write-back caching (faster but loses data on power failure)
# Use only with UPS or write-through for critical data
sudo hdparm -W1 /dev/sdX

# NVMe-specific: optimize queue depth
echo 1024 | sudo tee /sys/block/nvme0n1/queue/nr_requests

# Create persistent udev rule for SSD optimizations
cat > /etc/udev/rules.d/60-ssd.rules << 'UDEV'
# Set I/O scheduler for all SSDs
ACTION=="add|change", ATTR{queue/rotational}=="0", ATTR{queue/scheduler}="mq-deadline"
# Set read-ahead for SSDs
ACTION=="add|change", ATTR{queue/rotational}=="0", ATTR{queue/read_ahead_kb}="2048"
# Enable TRIM for SSDs
ACTION=="add|change", ATTR{queue/rotational}=="0", ATTR{queue/discard_max_bytes}!="0", ATTR{queue/discard_granularity}!="0"
UDEV
```

**Checkpoint:** I/O scheduler is set to mq-deadline/none for SSDs, TRIM is operational, and read-ahead is tuned for the workload.

### 5. Verify CPU Architecture Compatibility

Ensure software runs correctly on the target CPU architecture.

```bash
# Detect CPU architecture
uname -m                        # x86_64, aarch64, arm64
lscpu | grep -E "Architecture|Model name|CPU\(s\)"

# Check CPU features
grep -oP '^flags\s+:\K.*' /proc/cpuinfo | tr ' ' '\n' | sort -u

# Verify emulation support (running ARM on x86 via QEMU)
dpkg --print-architecture       # Current architecture
dpkg --print-foreign-architectures  # Emulated architectures

# For cross-architecture deployment:
# x86_64 → deploy native packages
# aarch64 → deploy ARM64 packages or build from source
```

**Checkpoint:** Target architecture is identified and all software dependencies have compatible builds for the architecture.

### 6. Set Up Hardware Monitoring

Configure monitoring for hardware health and early failure detection.

```bash
# Install hardware monitoring tools
sudo apt install -y smartmontools ipmitool lm-sensors  # Debian/Ubuntu
sudo dnf install -y smartmontools ipmitool lm_sensors   # RHEL/CentOS

# Configure SMART monitoring for all disks
sudo smartctl --scan
sudo smartctl -a /dev/sda

# Enable SMART auto-testing
sudo smartctl -s on -s/consecutive/offline,/S,/T,60 /dev/sda

# Configure smartd daemon
cat > /etc/smartd.conf << 'SMARTD'
# Monitor all disks, report failures via mail, self-test daily
DEVICESCAN -d removable -n standby -m admin@example.com -M exec /usr/share/smartmontools/smartd-runner
/dev/sda -a -o on -S on -s (S/../.././02|L/../../6/03) -m admin@example.com
/dev/sdb -a -o on -S on -m admin@example.com
SMARTD

# Enable and start services
sudo systemctl enable --now smartd
sudo systemctl enable --now ipmi  # If BMC is available

# Test IPMI access
sudo ipmitool sdr
sudo ipmitool sensor list
```

**Checkpoint:** SMART monitoring is active, alerts are configured, and hardware sensors are accessible.

---

## Implementation Patterns

### Pattern 1: Cloud Instance Selection (BAD vs. GOOD)

**BAD — Arbitrary instance selection without workload analysis**

```bash
# ❌ BAD: Picking the cheapest instance without analyzing workload needs
# "Let's start with t3.medium and scale up if needed"
#
# Problems:
# - t3.medium is burstable (CPU credits), unreliable for databases
# - No I/O optimization for storage-heavy workloads
# - No consideration of ARM vs x86 for cost/performance
# - No cost analysis for long-running vs intermittent workloads

aws ec2 describe-instance-types \
  --filters "Name=instance-type,Values=t3.medium" \
  --query "InstanceTypes[0].InstanceType"
```

**GOOD — Data-driven instance selection based on workload profiling**

```bash
# Instance selection by workload type — reference guide
# Run as part of pre-provisioning checklist

cat > /etc/provisioning/workload-profiles.sh << 'PROFILE'
# Workload-to-instance mapping reference
# Usage: source workload-profiles.sh && get_profile database

get_profile() {
    local workload="$1"
    case "$workload" in
        database)
            echo "AWS family: r7i (memory-optimized)"
            echo "vCPU range: 8-64 | RAM/vCPU: 8-32GB | Storage: io2"
            echo "Network: 10Gbps | Burstable: No"
            echo "Recommended: r7i.xlarge (4 vCPU, 32GB) → r7i.2xlarge (8 vCPU, 64GB)"
            ;;
        web)
            echo "AWS family: m7i (general purpose)"
            echo "vCPU range: 4-32 | RAM/vCPU: 4-8GB | Storage: gp3"
            echo "Network: 5Gbps | Burstable: Yes (t3 for dev)"
            echo "Recommended: m7i.xlarge (4 vCPU, 16GB)"
            ;;
        compute)
            echo "AWS family: c7i (compute optimized)"
            echo "vCPU range: 8-128 | RAM/vCPU: 2-4GB | Storage: gp3"
            echo "Network: 10Gbps | Burstable: No"
            echo "Recommended: c7i.xlarge (4 vCPU, 8GB)"
            ;;
        batch)
            echo "AWS family: c7i (compute optimized) with spot"
            echo "vCPU range: 16-256 | RAM/vCPU: 2-4GB | Storage: gp3"
            echo "Network: 5Gbps | Burstable: Yes (spot-friendly)"
            echo "Recommended: c7i.2xlarge (8 vCPU, 16GB)"
            ;;
        storage)
            echo "AWS family: i7i (storage optimized)"
            echo "vCPU range: 8-64 | RAM/vCPU: 8-16GB | Storage: nvme-raid"
            echo "Network: 25Gbps | Burstable: No"
            echo "Recommended: i7i.2xlarge (8 vCPU, 64GB)"
            ;;
        *)
            echo "Unknown workload: $workload"
            echo "Available: database, web, compute, batch, storage"
            return 1
            ;;
    esac
}
PROFILE

# Source and use
source /etc/provisioning/workload-profiles.sh
get_profile database
```

### Pattern 2: Cross-Architecture Deployment

```bash
# ❌ BAD: Assuming x86_64 everywhere
pip install some-package          # May not have ARM64 wheel
docker build -t myapp .           # May fail on ARM without multi-arch Dockerfile
apt install myapp-binary          # x86 binary won't run on ARM

# ✅ GOOD: Architecture-aware deployment
# Multi-architecture Dockerfile
cat > Dockerfile.multi << 'DOCKERFILE'
# syntax=docker/dockerfile:1
FROM --platform=$BUILDPLATFORM python:3.12-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --prefix=/install -r requirements.txt

FROM python:3.12-slim
WORKDIR /app
COPY --from=builder /install /usr/local
COPY . .
CMD ["python", "app.py"]
DOCKERFILE

# Build for both architectures
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t myapp:latest \
  --push \
  .

# Architecture detection in provisioning scripts
ARCH=$(uname -m)
if [[ "$ARCH" == "x86_64" ]]; then
    PKG_ARCH="amd64"
elif [[ "$ARCH" == "aarch64" ]]; then
    PKG_ARCH="arm64"
else
    echo "Unsupported architecture: $ARCH" >&2
    exit 1
fi
```

### Pattern 3: Hardware Inventory and Documentation

**Bash — Complete hardware inventory script**

```bash
#!/bin/bash
# Collect hardware inventory for change management documentation
# Usage: ./hardware-inventory.sh [--json] [--output /var/inventory/]
# Output: /var/inventory/<hostname>-YYYYMMDD-HHMMSS.json (or plain text)

set -euo pipefail

JSON_OUTPUT=false
OUTPUT_DIR="/var/inventory"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --json) JSON_OUTPUT=true; shift ;;
        --output) OUTPUT_DIR="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

mkdir -p "$OUTPUT_DIR"

HOSTNAME=$(hostname)
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ISO_TIMESTAMP=$(date -Iseconds)

# CPU information
CPU_MODEL=$(grep 'model name' /proc/cpuinfo | head -1 | cut -d: -f2 | xargs)
CPU_ARCH=$(uname -m)
CPU_SOCKETS=$(nproc --all)
CPU_CORES=$(lscpu | awk '/^Core\(s\) per socket:/{print $4}')
CPU_THREADS=$(lscpu | awk '/^Thread\(s\) per core:/{print $4}')
CPU_COUNT=$((CPU_SOCKETS * CPU_CORES * CPU_THREADS))

# Memory information
MEM_TOTAL=$(awk '/^MemTotal:/{printf "%.0f", $2/1024/1024}' /proc/meminfo)
MEM_AVAIL=$(awk '/^MemAvailable:/{printf "%.0f", $2/1024/1024}' /proc/meminfo)
SWAP_TOTAL=$(awk '/^SwapTotal:/{printf "%.0f", $2/1024/1024}' /proc/meminfo)

# Storage inventory
STORAGE_JSON="["
FIRST=true
while IFS= read -r line; do
    DEV=$(echo "$line" | awk '{print $1}')
    SIZE=$(echo "$line" | awk '{print $2}')
    TYPE=$(echo "$line" | awk '{print $3}')
    MODEL=$(echo "$line" | awk '{$1=$2=$3=""; print}' | xargs)
    ROTA=$(cat /sys/block/$DEV/queue/rotational 2>/dev/null || echo "1")
    
    if [[ "$ROTA" == "0" ]]; then
        DISK_TYPE="ssd"
    else
        DISK_TYPE="hdd"
    fi
    
    if [[ "$FIRST" == "true" ]]; then
        FIRST=false
    else
        STORAGE_JSON+=","
    fi
    STORAGE_JSON+="{\"device\":\"/dev/$DEV\",\"size\":\"$SIZE\",\"type\":\"$DISK_TYPE\",\"model\":\"$MODEL\"}"
done < <(lsblk -dno NAME,SIZE,TYPE,MODEL | grep disk)
STORAGE_JSON+="]"

# Network interfaces
NETWORK_JSON="["
FIRST=true
for iface in $(ip -j link show | jq -r '.[].ifname' | grep -v lo); do
    SPEED=$(ethtool "$iface" 2>/dev/null | grep Speed | cut -d: -f2 | xargs || echo "unknown")
    
    if [[ "$FIRST" == "true" ]]; then
        FIRST=false
    else
        NETWORK_JSON+=","
    fi
    NETWORK_JSON+="{\"interface\":\"$iface\",\"speed\":\"$SPEED\"}"
done
NETWORK_JSON+="]"

# Kernel information
KERNEL=$(uname -r)

if [[ "$JSON_OUTPUT" == "true" ]]; then
    # Output as JSON for machine consumption
    cat << EOF
{
  "hostname": "$HOSTNAME",
  "timestamp": "$ISO_TIMESTAMP",
  "kernel": "$KERNEL",
  "cpu": {
    "model": "$CPU_MODEL",
    "architecture": "$CPU_ARCH",
    "sockets": $CPU_SOCKETS,
    "cores_per_socket": $CPU_CORES,
    "threads_per_core": $CPU_THREADS,
    "total_cpus": $CPU_COUNT
  },
  "memory": {
    "total_gb": $MEM_TOTAL,
    "available_gb": $MEM_AVAIL,
    "swap_total_gb": $SWAP_TOTAL
  },
  "storage": $STORAGE_JSON,
  "network": $NETWORK_JSON
}
EOF
else
    # Human-readable output
    echo "=== Hardware Inventory: $HOSTNAME ==="
    echo "Timestamp: $ISO_TIMESTAMP"
    echo "Kernel:    $KERNEL"
    echo ""
    echo "--- CPU ---"
    echo "  Model:     $CPU_MODEL"
    echo "  Architecture: $CPU_ARCH"
    echo "  Sockets:   $CPU_SOCKETS"
    echo "  Cores/Socket: $CPU_CORES"
    echo "  Threads/Core: $CPU_THREADS"
    echo "  Total CPUs: $CPU_COUNT"
    echo ""
    echo "--- Memory ---"
    echo "  Total:    ${MEM_TOTAL}GB"
    echo "  Available: ${MEM_AVAIL}GB"
    echo "  Swap:     ${SWAP_TOTAL}GB"
    echo ""
    echo "--- Storage ---"
    lsblk -dno NAME,SIZE,TYPE,MODEL,ROTA | grep disk | while read -r dev size type model rota; do
        if [[ "$rota" == "0" ]]; then
            dtype="SSD"
        else
            dtype="HDD"
        fi
        echo "  /dev/$dev  $size  $dtype  ($model)"
    done
    echo ""
    echo "--- Network ---"
    for iface in $(ip -j link show | jq -r '.[].ifname' | grep -v lo); do
        speed=$(ethtool "$iface" 2>/dev/null | grep Speed | cut -d: -f2 | xargs || echo "unknown")
        echo "  $iface  speed=$speed"
    done
fi

# Save to file
OUTPUT_FILE="$OUTPUT_DIR/${HOSTNAME}-${TIMESTAMP}.json"
mkdir -p "$OUTPUT_DIR"
cat << EOF > "$OUTPUT_FILE"
{
  "hostname": "$HOSTNAME",
  "timestamp": "$ISO_TIMESTAMP",
  "kernel": "$KERNEL",
  "cpu": {
    "model": "$CPU_MODEL",
    "architecture": "$CPU_ARCH",
    "sockets": $CPU_SOCKETS,
    "cores_per_socket": $CPU_CORES,
    "threads_per_core": $CPU_THREADS,
    "total_cpus": $CPU_COUNT
  },
  "memory": {
    "total_gb": $MEM_TOTAL,
    "available_gb": $MEM_AVAIL,
    "swap_total_gb": $SWAP_TOTAL
  },
  "storage": $STORAGE_JSON,
  "network": $NETWORK_JSON
}
EOF
echo "Inventory saved to $OUTPUT_FILE"
```

---

## Constraints

### MUST DO

- **MUST** analyze workload requirements before selecting hardware — match CPU, memory, storage I/O, and network capacity to actual needs
- **MUST** document all hardware specifications, RAID configurations, and network assignments in a change management system
- **MUST** configure RAID based on durability requirements — critical data gets RAID 1/5/6/10, non-critical gets cheaper alternatives
- **MUST** verify SSD TRIM support and enable periodic fstrim — prevents SSD performance degradation over time
- **MUST** monitor SMART health on all storage devices and set up alerting for predictive failure indicators
- **MUST** account for 20-30% capacity overhead — never provision to 100% utilization; leave headroom for growth and burst
- **MUST** verify cross-architecture compatibility when deploying software across x86_64 and ARM64 environments

### MUST NOT DO

- **MUST NOT** use RAID 5 for databases or write-heavy workloads — RAID 5 write penalty (4 I/Os per write) severely degrades performance
- **MUST NOT** provision to maximum capacity — always maintain 20-30% headroom for growth, failover, and burst
- **MUST NOT** use burstable instances (t3, m5b) for databases or consistently heavy workloads — CPU credit exhaustion causes latency spikes
- **MUST NOT** mix HDD and SSD in the same RAID array — all drives operate at the speed of the slowest drive
- **MUST NOT** use RAID 0 for any production data — zero redundancy means any drive failure loses all data
- **MUST NOT** select cloud instances based solely on price — total cost of ownership includes storage I/O costs, network egress fees, and performance penalties

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `kernel-tuning` | Tune kernel parameters after hardware is provisioned for optimal performance |
| `resource-management` | Allocate resources to workloads on the provisioned hardware |
| `storage-architecture` | Configure filesystems, LVM, and mount options on provisioned storage |
| `linux-security` | Harden the provisioned system against security threats |
| `observability` | Monitor hardware health and set up alerting for failures |
