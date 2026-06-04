---




name: storage-architecture
description: Designs and implements Linux storage architectures for cloud block storage
  and on-prem SAN/NAS with performance and durability guarantees.
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
  triggers: storage architecture, LVM, filesystem, XFS, ext4, btrfs, cloud storage, NVMe NVMe
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: hardware-provisioning, resource-management, kernel-tuning, linux-security
  maturity: stable
  completeness: 95
  exampleCount: 3




---




# Linux Storage Architecture

Storage engineer designing and implementing Linux storage architectures for cloud block storage and on-prem SAN/NAS, selecting appropriate filesystems, configuring LVM, optimizing mount options, and monitoring storage health for performance and durability.

## TL;DR Checklist

- [ ] Select filesystem based on workload requirements (XFS for large files, ext4 for compatibility, btrfs for snapshots)
- [ ] Configure LVM volumes with appropriate PE size, striping, and mirroring
- [ ] Apply mount options optimized for the workload type (noatime, nodiratime, barrier settings)
- [ ] Enable TRIM/discard for SSD/NVMe storage and configure periodic fstrim
- [ ] Set up storage monitoring for IOPS, throughput, latency, and capacity
- [ ] Configure cloud block storage with appropriate IOPS and throughput profiles
- [ ] Implement backup strategy with filesystem-appropriate tools (xfsdump, e2backup, btrfs send/receive)
- [ ] Validate storage performance with fio benchmarks before production deployment

---

## When to Use

Use this skill when:

- **Designing storage layout** — You're planning the storage architecture for a new system and need to select filesystems, LVM layout, and mount options
- **Optimizing storage performance** — Existing storage is a bottleneck and needs tuning (mount options, I/O scheduler, filesystem parameters)
- **Migrating storage** — You're migrating data between filesystems, storage types, or cloud providers and need the right tools
- **Setting up cloud storage** — You're configuring cloud block storage (EBS, GPD Persistent Disk, Azure Managed Disks) with appropriate performance profiles
- **Implementing storage monitoring** — You need to monitor storage health, capacity, and performance metrics

---

## When NOT to Use

Avoid this skill for:

- **RAID configuration** — Use hardware RAID controllers or mdadm at the block device level before LVM/filesystem
- **Network file sharing** — Use `networking` skill for NFS/SMB/CIFS server configuration
- **Container storage** — Let the container runtime manage ephemeral storage; use persistent volumes for data
- **Database storage configuration** — Database storage needs (IOPS, latency, ordering) often require database-specific tuning beyond generic filesystem config

Use `hardware-provisioning` when selecting the underlying storage hardware (SSD, NVMe, HDD) before filesystem configuration. Use `kernel-tuning` for I/O scheduler and kernel storage parameters.

---

## Core Workflow

### 1. Select Filesystem Based on Workload

Match filesystem characteristics to workload requirements.

```
Filesystem   Max File   Max FS    Journaling   Snapshots   Compression    Best For
─────────────────────────────────────────────────────────────────────────────────────
ext4         50 TB      1 EB      Yes          No          No             General purpose, compatibility
XFS          8 EB       8 EB      Yes          No*         No             Large files, high throughput
btrfs        16 EB      16 EB     Yes (cow)    Yes         Yes (flex)     Snapshots, compression, RAID
ZFS          16 EB      256 ZB    Yes (cow)    Yes         Yes            Data integrity, pools
tmpfs        RAM        RAM        No           No          No             In-memory cache
```

*XFS supports subvolume-like features with project quotas but not true snapshots.

```bash
# Check current filesystem types
findmnt -T / -o SOURCE,FSTYPE,SIZE,USE%

# Create filesystem with workload-appropriate options
# XFS for high-throughput workloads
sudo mkfs.xfs -f -L datapool /dev/vdb

# ext4 for general purpose
sudo mkfs.ext4 -L datapool /dev/vdb

# btrfs for snapshot-enabled storage
sudo mkfs.btrfs -L datapool /dev/vdb
```

**Checkpoint:** Filesystem type matches workload requirements. Labels are set for easy identification.

### 2. Configure LVM Layout

Set up LVM for flexible volume management.

```bash
# Create physical volume on block device
sudo pvcreate /dev/vdb

# Create volume group with appropriate PE (Physical Extent) size
# Default PE=4MB; use larger PE (16MB-64MB) for large volumes to reduce metadata overhead
sudo vgcreate vg-data /dev/vdb
sudo vgdisplay vg-data | grep "PE Size"

# Create logical volumes
# Database volume: 100GB, thin-provisioned
sudo lvcreate -L 100G -n db-data vg-data
sudo lvcreate --name db-meta --size 2G --type raid1 -m 1 vg-data

# Application volume: thin-pooled with overcommit
sudo lvcreate -L 20G -n db-pool vg-data
sudo lvcreate -V 500G --thinpool db-thinpool vg-data
sudo lvcreate -V 50G --thinpool db-thinpool --name app1 vg-data

# Create filesystems on LVs
sudo mkfs.xfs /dev/vg-data/db-data
sudo mkfs.ext4 /dev/vg-data/db-meta

# Add to fstab
echo '/dev/vg-data/db-data  /data/db  xfs  defaults,noatime,nodiratime  0 2' | sudo tee -a /etc/fstab
echo '/dev/vg-data/db-meta  /data/meta  ext4  defaults,noatime  0 2' | sudo tee -a /etc/fstab

# Mount and verify
sudo mkdir -p /data/{db,meta}
sudo mount -a
df -h /data/{db,meta}
```

**Checkpoint:** LVM hierarchy is created (PV → VG → LV), filesystems are formatted and mounted, and fstab entries are correct.

### 3. Configure Mount Options

Apply workload-optimized mount options.

```bash
# Mount options by workload type:
#
# General purpose:
#   defaults,noatime,nodiratime,relatime
#
# Database (XFS):
#   defaults,noatime,nodiratime,logbsize=256k,allocsize=256k,inode64
#
# Database (ext4):
#   defaults,noatime,nodiratime,data=ordered,journal_data_writeback
#
# Web server (XFS):
#   defaults,noatime,nodiratime,inode64,allocsize=64k
#
# NVMe storage:
#   defaults,noatime,nodiratime,discard=once,nobarrier
#
# SSD optimization:
#   defaults,noatime,nodiratime,discard=async

# Example: Database mount with optimized options
sudo mkdir -p /data/db
sudo mount -o defaults,noatime,nodiratime,logbsize=256k,inode64 /dev/vg-data/db-data /data/db

# Verify mount options
findmnt /data/db
mount | grep /data/db

# Make persistent in /etc/fstab
echo '/dev/vg-data/db-data  /data/db  xfs  defaults,noatime,nodiratime,logbsize=256k,inode64  0 2' | sudo tee -a /etc/fstab
```

**Checkpoint:** Mount options are applied and verified. `/etc/fstab` entries persist across reboots.

### 4. Configure SSD/NVMe Optimization

Enable TRIM and optimize for solid-state storage.

```bash
# Check if device is SSD (rotational=0 = SSD)
cat /sys/block/vdb/queue/rotational  # 0 = SSD, 1 = HDD

# Enable TRIM (discard) on mount
# once: discard at mount time only (faster)
# async: background discard (best for performance)
sudo mount -o remount,discard=async /data/db

# Verify fstrim support
sudo fstrim -v /data/db

# Configure periodic fstrim via systemd timer
sudo systemctl enable --now fstrim.timer

# Verify timer is active
sudo systemctl list-timers fstrim.timer

# For NVMe, additional optimizations
echo "none" | sudo tee /sys/block/nvme0n1/queue/scheduler
echo 1024 | sudo tee /sys/block/nvme0n1/queue/nr_requests
blockdev --setra 4096 /dev/nvme0n1  # 2MB read-ahead

# Persistent NVMe udev rules
cat > /etc/udev/rules.d/60-nvme-tuning.rules << 'UDEV'
# Set I/O scheduler for NVMe devices
ACTION=="add|change", KERNEL=="nvme[0-9]*n[0-9]*", ATTR{queue/scheduler}="none"
# Set read-ahead for NVMe
ACTION=="add|change", KERNEL=="nvme[0-9]*n[0-9]*", ATTR{queue/read_ahead_kb}="2048"
# Set queue depth
ACTION=="add|change", KERNEL=="nvme[0-9]*n[0-9]*", ATTR{queue/nr_requests}="1024"
UDEV
```

**Checkpoint:** TRIM is enabled, periodic fstrim is running, NVMe scheduler is set to none/mq-deadline, and read-ahead is optimized.

### 5. Configure Cloud Block Storage

Set up cloud block storage with appropriate performance profiles.

```bash
# AWS EBS optimization
# Set I/O scheduler to none/mq-deadline for EBS (already optimized by hypervisor)
echo "mq-deadline" | sudo tee /sys/block/nvme1n1/queue/scheduler

# Enable write caching if EBS has battery-backed cache
sudo hdparm -W1 /dev/nvme1n1  # Enable write cache (only if backed by UPS/BBU)

# Configure EBS-optimized instance (AWS specific)
# This is done at instance launch, but verify:
aws ec2 describe-instance-attribute \
  --instance-id i-0abc123 \
  --attribute ebsOptimized

# GCP Persistent Disk optimization
# Set I/O scheduler for pd-ssd
echo "none" | sudo tee /sys/block/sdb/queue/scheduler

# Set multi-queue for NVMe
echo "16" | sudo tee /sys/block/nvme1n1/queue/nr_requests

# Azure Managed Disk optimization
# Azure disks are already NVMe-backed; use mq-deadline
echo "mq-deadline" | sudo tee /sys/block/sdc/queue/scheduler
```

**Bash — Storage configuration by workload type**

```bash
#!/bin/bash
# Generate storage configuration based on workload type
# Usage: ./storage-config.sh <workload-type> [device] [mount-point]
# Workload types: database, web, logs, home

set -euo pipefail

WORKLOAD="${1:-database}"
DEVICE="${2:-/dev/vdb}"
MOUNT="${3:-/data}"

# Define storage profiles
case "$WORKLOAD" in
    database)
        FS="xfs"
        MOUNT_OPTS="defaults,noatime,nodiratime,logbsize=256k,inode64,allocsize=256k"
        IOPS_TARGET=16000
        THROUGHPUT=1000
        TRIM_ENABLED=false
        SCHEDULER="mq-deadline"
        ;;
    web)
        FS="xfs"
        MOUNT_OPTS="defaults,noatime,nodiratime,inode64,allocsize=64k"
        IOPS_TARGET=3000
        THROUGHPUT=500
        TRIM_ENABLED=true
        SCHEDULER="mq-deadline"
        ;;
    logs)
        FS="ext4"
        MOUNT_OPTS="defaults,noatime,nodiratime,data=writeback"
        IOPS_TARGET=5000
        THROUGHPUT=200
        TRIM_ENABLED=true
        SCHEDULER="mq-deadline"
        ;;
    home)
        FS="ext4"
        MOUNT_OPTS="defaults,noatime,nodiratime"
        IOPS_TARGET=1000
        THROUGHPUT=100
        TRIM_ENABLED=true
        SCHEDULER="bfq"
        ;;
    *)
        echo "Unknown workload: $WORKLOAD"
        echo "Available: database, web, logs, home"
        exit 1
        ;;
esac

# Add discard option if TRIM enabled
if [[ "$TRIM_ENABLED" == "true" ]]; then
    MOUNT_OPTS="${MOUNT_OPTS},discard=async"
fi

echo "=== Storage Configuration: $WORKLOAD ==="
echo "Device:       $DEVICE"
echo "Mount point:  $MOUNT"
echo "Filesystem:   $FS"
echo "Mount opts:   $MOUNT_OPTS"
echo "IOPS target:  $IOPS_TARGET"
echo "Scheduler:    $SCHEDULER"
echo ""
echo "# Mount command:"
echo "mount -o $MOUNT_OPTS $DEVICE $MOUNT"
echo ""
echo "# fstab entry:"
echo "$DEVICE  $MOUNT  $FS  $MOUNT_OPTS  0  2"
```

**Checkpoint:** Cloud storage is configured with the correct I/O scheduler, mount options, and performance profile.

### 6. Set Up Storage Monitoring

Configure monitoring for storage health, performance, and capacity.

```bash
# Install storage monitoring tools
sudo apt install -y iotop iostat sysstat  # Debian/Ubuntu
sudo dnf install -y sysstat iotop        # RHEL/CentOS

# Monitor real-time I/O
iostat -x 1 5           # Extended I/O statistics
iotop -o                # Top I/O consumers only

# Check filesystem health
df -h                   # Disk usage
df -i                   # Inode usage
xfs_info /data/db       # XFS-specific info
tune2fs -l /dev/sda1    # ext4-specific info

# Monitor SMART health
sudo smartctl -a /dev/vdb
sudo smartctl -H /dev/vdb  # Overall health

# Set up storage monitoring script
cat > /usr/local/bin/storage-check << 'MONITOR'
#!/bin/bash
# Storage health check script
THRESHOLD_WARN=80
THRESHOLD_CRIT=90

# Check disk usage
for mount in $(df -h --output=target | tail -n +2); do
    usage=$(df -h "$mount" | tail -1 | awk '{print $5}' | tr -d '%')
    if [ "$usage" -gt "$THRESHOLD_CRIT" ]; then
        echo "CRITICAL: $mount is ${usage}% full"
    elif [ "$usage" -gt "$THRESHOLD_WARN" ]; then
        echo "WARNING: $mount is ${usage}% full"
    fi
done

# Check inode usage
for mount in $(df -h --output=target | tail -n +2); do
    inode_usage=$(df -i "$mount" | tail -1 | awk '{print $5}' | tr -d '%')
    if [ "$inode_usage" -gt "$THRESHOLD_CRIT" ]; then
        echo "CRITICAL: $mount inode usage at ${inode_usage}%"
    fi
done

# Check SMART health
for disk in /dev/vd* /dev/sd* /dev/nvme*; do
    if [ -b "$disk" ]; then
        health=$(sudo smartctl -H "$disk" 2>/dev/null | grep -oP '(?<=SMART overall-health).*(?=result)')
        if [[ "$health" == *"FAILED"* ]]; then
            echo "CRITICAL: SMART failure detected on $disk"
        fi
    fi
done
MONITOR
sudo chmod +x /usr/local/bin/storage-check

# Schedule hourly checks
sudo bash -c 'echo "0 * * * * /usr/local/bin/storage-check >> /var/log/storage-check.log 2>&1" > /etc/cron.d/storage-check'
```

**Checkpoint:** Storage monitoring is active with disk usage, inode usage, and SMART health checks scheduled.

### 7. Configure Backup Strategy

Set up filesystem-appropriate backup procedures.

```bash
# XFS backup with xfsdump
sudo xfsdump -J - /data/db > /backup/db-$(date +%Y%m%d).xfsdump

# XFS restore
sudo xfsrestore -J - /data/db < /backup/db-20260101.xfsdump

# ext4 backup with rsync (preserves permissions, ownership)
sudo rsync -aHAXx --progress /data/app/ /backup/app-$(date +%Y%m%d)/

# btrfs snapshot-based backup
sudo btrfs subvolume snapshot /data/shared /data/shared-snap-$(date +%Y%m%d)
sudo btrfs send /data/shared-snap-20260101 | btrfs receive /backup/

# btrfs incremental
sudo btrfs send -p /data/shared-snap-20260101 /data/shared-snap-20260102 \
  | btrfs receive /backup/

# Schedule daily backups
sudo bash -c 'cat > /etc/cron.daily/storage-backup << CRON'
#!/bin/bash
BACKUP_DIR="/backup"
TIMESTAMP=$(date +%Y%m%d)
mkdir -p "$BACKUP_DIR"

# Database backup
xfsdump -J - /data/db | gzip > "$BACKUP_DIR/db-${TIMESTAMP}.xfsdump.gz"

# App data backup
rsync -aHAXx --delete /data/app/ "$BACKUP_DIR/app-${TIMESTAMP}/"
CRON
sudo chmod +x /etc/cron.daily/storage-backup
```

**Checkpoint:** Backup procedures are configured and tested. Retention policy is documented. Restores are verified periodically.

---

## Implementation Patterns

### Pattern 1: Filesystem Selection (BAD vs. GOOD)

**BAD — Default filesystem without workload analysis**

```bash
# ❌ BAD: Using mkfs.ext4 on everything
sudo mkfs.ext4 /dev/vdb
sudo mkfs.ext4 /dev/vdc
sudo mkfs.ext4 /dev/vdd

# Problems:
# - ext4 has overhead for large files (>50GB files have performance issues)
# - No built-in compression to save storage costs
# - No snapshot capability for backup
# - Default journaling mode can cause write amplification on databases
# - 50TB max file size limit

# ❌ BAD: Using btrfs for write-heavy databases
sudo mkfs.btrfs /dev/vdb
# Problems:
# - Copy-on-write adds write overhead for sequential writes
# - Database engines do their own caching and I/O optimization
# - COW conflicts with database write patterns
```

**GOOD — Filesystem matched to workload**

```bash
# ✅ GOOD: XFS for database (large files, high throughput)
sudo mkfs.xfs -f -L db-data -d agcount=32 /dev/vdb
# agcount=32: 32 allocation groups for parallel I/O on large volumes
# -L db-data: label for easy identification

# ✅ GOOD: ext4 for general application data
sudo mkfs.ext4 -L app-data -E lazy_itable_init=0,lazy_journal_init=0 /dev/vdb
# lazy_itable_init=0: Initialize inode table at format time (faster first mount)
# lazy_journal_init=0: Initialize journal at format time (faster first mount)

# ✅ GOOD: btrfs for shared storage with snapshots
sudo mkfs.btrfs -L shared-data /dev/vdb
# Supports snapshots, compression, and subvolumes natively
# Ideal for VM storage, shared data, and backup targets

# ✅ GOOD: tmpfs for application cache
sudo mkdir -p /var/cache/app
echo 'tmpfs /var/cache/app tmpfs size=4G,noatime,mode=1777 0 0' | sudo tee -a /etc/fstab
sudo mount /var/cache/app
```

### Pattern 2: LVM Configuration for Database

```ini
# LVM layout for database workload
#
# Physical Volumes:  x 4 NVMe SSDs
# Volume Group:       vg-db
# Logical Volumes:
#   db-data:          200GB (RAID1 mirror) — data files
#   db-wal:           50GB  (RAID1 mirror) — write-ahead log
#   db-index:         100GB (RAID1 mirror) — index files
#   db-backup:        500GB (thin pool)     — backup snapshots

# Create PVs
sudo pvcreate /dev/nvme0n1 /dev/nvme1n1 /dev/nvme2n1 /dev/nvme3n1

# Create VG with large PE for big volumes
sudo vgcreate -s 64M vg-db /dev/nvme0n1 /dev/nvme1n1 /dev/nvme2n1 /dev/nvme3n1

# Create mirrored data volume (RAID1 for durability)
sudo lvcreate -L 200G -m 1 -n db-data vg-db

# Create mirrored WAL volume (RAID1 for fast writes)
sudo lvcreate -L 50G -m 1 -n db-wal vg-db

# Create mirrored index volume
sudo lvcreate -L 100G -m 1 -n db-index vg-db

# Format with XFS (optimized for databases)
sudo mkfs.xfs -f -L db-data -d agcount=16 /dev/vg-db/db-data
sudo mkfs.xfs -f -L db-wal -d agcount=4 /dev/vg-db/db-wal
sudo mkfs.xfs -f -L db-index /dev/vg-db/db-index

# Mount with database-optimized options
sudo mount -o defaults,noatime,nodiratime,logbsize=256k,allocsize=256k \
    /dev/vg-db/db-data /var/lib/postgresql/data
sudo mount -o defaults,noatime,nodiratime,logbsize=256k,allocsize=256k \
    /dev/vg-db/db-wal /var/lib/postgresql/wal
sudo mount -o defaults,noatime,nodiratime,logbsize=256k,allocsize=256k \
    /dev/vg-db/db-index /var/lib/postgresql/index
```

### Pattern 3: Storage Performance Benchmarking with fio

**Bash — Run fio benchmark profiles for storage validation**

```bash
#!/bin/bash
# Storage benchmarking with fio for workload validation
# Usage: ./fio-benchmark.sh [test-file] [output-dir]
# Creates test file, runs 5 benchmark profiles, saves results

set -euo pipefail

TEST_FILE="${1:-/tmp/fio-test}"
RESULTS_DIR="${2:-/var/log}"
RESULTS_FILE="${RESULTS_DIR}/fio-results-$(date +%Y%m%d-%H%M%S).json"

mkdir -p "$RESULTS_DIR"

# Create 4G test file for benchmarks
echo "Creating test file (${TEST_FILE})..."
fio --name=create --filename="$TEST_FILE" \
    --size=4G --ioengine=sync --rw=randwrite \
    --output-format=json --group_reporting > /dev/null 2>&1

echo ""
echo "Running storage benchmarks..."
echo "========================================"

# Define benchmark profiles as bash arrays
declare -a NAMES=("random-read" "random-write" "seq-read" "seq-write" "mixed-randrw")
declare -a RWS=("randread" "randwrite" "read" "write" "randrw")
declare -a BSS=("4k" "4k" "1M" "1M" "8k")
declare -a DEPTHS=(32 32 64 64 16)
declare -a JOBS=(4 4 1 1 4)
declare -a RUNTIMES=(60 60 30 30 120)
declare -a SIZES=("4G" "4G" "8G" "8G" "4G")

RESULTS_JSON="{"
FIRST=true

for i in "${!NAMES[@]}"; do
    NAME="${NAMES[$i]}"
    RW="${RWS[$i]}"
    BS="${BSS[$i]}"
    DEPTH="${DEPTHS[$i]}"
    JOB_COUNT="${JOBS[$i]}"
    RUNTIME="${RUNTIMES[$i]}"
    SIZE="${SIZES[$i]}"

    echo ""
    echo "Benchmark: $NAME"
    echo "  $RW | $BS | depth=$DEPTH | jobs=$JOB_COUNT | runtime=${RUNTIME}s"

    # Run fio and capture JSON output
    OUTPUT=$(fio --name="$NAME" --filename="$TEST_FILE" \
        --rw="$RW" --bs="$BS" --iodepth="$DEPTH" \
        --numjobs="$JOB_COUNT" --runtime="$RUNTIME" \
        --size="$SIZE" \
        --output-format=json --group_reporting \
        2>/dev/null)

    # Parse results using jq (install with: apt install jq)
    READ_IOPS=$(echo "$OUTPUT" | jq -r '.jobs[0].read.iops // 0' 2>/dev/null || echo "0")
    WRITE_IOPS=$(echo "$OUTPUT" | jq -r '.jobs[0].write.iops // 0' 2>/dev/null || echo "0")
    READ_BW=$(echo "$OUTPUT" | jq -r '(.jobs[0].read.bw / 1024) // 0' 2>/dev/null || echo "0")
    WRITE_BW=$(echo "$OUTPUT" | jq -r '(.jobs[0].write.bw / 1024) // 0' 2>/dev/null || echo "0")

    echo "  Read:  ${READ_IOPS} IOPS, ${READ_BW} MB/s"
    echo "  Write: ${WRITE_IOPS} IOPS, ${WRITE_BW} MB/s"

    # Accumulate results
    if [[ "$FIRST" == "true" ]]; then
        FIRST=false
    else
        RESULTS_JSON+=","
    fi
    RESULTS_JSON+="\"$NAME\":{\"read_iops\":${READ_IOPS},\"write_iops\":${WRITE_IOPS},\"read_mbps\":${READ_BW},\"write_mbps\":${WRITE_BW}}"
done

RESULTS_JSON+="}"

# Save results
echo "$RESULTS_JSON" | jq '.' > "$RESULTS_FILE"

echo ""
echo "========================================"
echo "Results saved to: $RESULTS_FILE"
echo ""
echo "# Cleanup test file when done:"
echo "rm -f $TEST_FILE"
```

---

## Constraints

### MUST DO

- **MUST** select filesystem based on workload requirements — XFS for large files/high throughput, ext4 for compatibility, btrfs for snapshots/compression
- **MUST** set appropriate PE size for LVM volume groups — 4MB default is wasteful for large volumes; use 16-64MB for TB-scale storage
- **MUST** use `noatime` and `nodiratime` mount options for all performance-sensitive mounts — eliminates unnecessary metadata writes
- **MUST** enable TRIM/discard on all SSD/NVMe mounts — either `discard=async` on mount or `fstrim.timer` for periodic TRIM
- **MUST** monitor disk usage and inode usage with alerting — capacity exhaustion is a leading cause of production incidents
- **MUST** verify SMART health on all storage devices and set up alerting for predictive failure
- **MUST** test restores from backups periodically — an untested backup is not a backup
- **MUST** set I/O scheduler to `mq-deadline` for SSD/NVMe or `none` for NVMe — BFQ is appropriate only for HDDs with mixed workloads

### MUST NOT DO

- **MUST NOT** use ext4 for databases with files larger than 50GB — ext4 has known performance degradation with large files; use XFS instead
- **MUST NOT** use btrfs for write-heavy database workloads — copy-on-write adds significant write amplification for sequential writes
- **MUST NOT** use the same filesystem for all storage without analysis — different workloads have different filesystem requirements
- **MUST NOT** format all partitions to the same filesystem type without workload analysis — this is a common but suboptimal pattern
- **MUST NOT** rely on hardware RAID without filesystem-level monitoring — RAID controllers can fail silently; SMART and filesystem checks provide independent verification
- **MUST NOT** enable `discard` on cloud block storage without provider support — some cloud providers don't support TRIM on EBS/Managed Disks and may have performance penalties
- **MUST NOT** use LVM thin provisioning for databases without monitoring — thin pool exhaustion causes data loss; always monitor thin pool usage

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `hardware-provisioning` | Select appropriate storage hardware (SSD, NVMe, HDD) for the workload |
| `resource-management` | Set I/O limits on LVM volumes with cgroups to prevent resource starvation |
| `kernel-tuning` | Tune I/O scheduler and kernel storage parameters for optimal performance |
| `linux-security` | Secure storage with encryption (LUKS) and access controls |
| `observability` | Monitor storage I/O, latency, and capacity for proactive management |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [fsck Manual Page](https://man7.org/linux/man-pages/man8/fsck.8.html)
- [Linux Storage Stack Overview](https://www.kernel.org/doc/html/latest/admin-guide/devices.html#block-layer)
- [LVM Administration Guide](https://man7.org/linux/man-pages/man8/lvm.8.html)
- [ext4 Filesystem Documentation](https://www.kernel.org/doc/html/latest/filesystems/ext4/index.html)
- [Block Device Management](https://man7.org/linux/man-pages/man8/blkid.8.html)
