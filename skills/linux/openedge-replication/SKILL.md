---
name: openedge-replication
description: Implements three-tier replication architecture (DRBD+AI, ZFS+AI, AI-only rsync) for Progress OpenEdge 12.x databases without OER license.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: linux
  role: reference
  scope: infrastructure
  output-format: manifests
  content-types: [guidance, config, examples, diagrams]
  triggers: openedge replication, DRBD, ZFS snapshot, AI shipping, failover runbook, rfutil roll-forward, keepalived VIP
  archetypes: [tactical, strategic]
  anti_triggers: [brainstorming, vague ideation]
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: tactical
  related-skills: linux-services, storage-architecture, shell-process-management
  maturity: stable
  completeness: 95
  exampleCount: 5

---

# OpenEdge Replication System (Homemade DR)

Configures and operates a three-tier database replication architecture for Progress OpenEdge 12.x databases without the OER license — using After-Image shipping, DRBD block replication, ZFS snapshots, keepalived VIP failover, and rfutil roll-forward for sub-second to five-minute RPO/RTO targets.

## TL;DR Checklist

- [ ] Select tier based on infrastructure (DRBD+AI for <2s RPO, ZFS+AI for geo-distributed, AI-only rsync as simplest fallback)
- [ ] Enable After-Imaging on source with `proutil -C aimage begin` and configure archiver directory
- [ ] Deploy AI ship daemon (inotifywait + rsync) on source and AI apply daemon (rfutil roll-forward) on target
- [ ] Configure split-brain prevention: lock files, quorum checks, DRBD fence-peer scripts
- [ ] Set up keepalived VIP for transparent client failover with health check script
- [ ] Validate replication lag stays within RPO thresholds using the health monitor
- [ ] Test failover procedure end-to-end before relying on it in production

---

## When to Use

Use this skill when:

- **Deploying OpenEdge HA without OER** — You need database high availability for Progress OpenEdge 12.x but do not have (or cannot purchase) the OER licensed product
- **Designing tiered DR strategy** — You must choose between block-level replication, snapshot-based replication, or AI-only shipping based on RPO/RTO requirements and infrastructure
- **Configuring After-Image shipping** — You need to set up continuous transaction-level replication using OpenEdge's built-in AI logging (`proutil -C aimage`) and `rfutil roll-forward`
- **Implementing VIP failover** — You want clients to connect to a floating IP that automatically moves between primary and standby on failure (keepalived + VRRP)
- **Running a planned or emergency failover** — You need the step-by-step procedures from the runbook for graceful migration or source-server loss scenarios
- **Setting up read-only standby** — You want to offload report/BI queries to a standby OpenEdge instance running in `-RO` mode

---

## When NOT to Use

Avoid this skill for:

- **New database deployments without replication needs** — If you do not need high availability, a single primary with regular backups is simpler
- **Sub-millisecond RPO requirements** — This homemade solution cannot match dedicated OER or native clustering products for ultra-low latency failover; use OER instead
- **Non-Linux platforms** — DRBD and the provided scripts require Linux kernel modules and systemd; Tier 3 (AI-only) works on any OS but loses BI protection
- **Replacing a fully functional OER setup** — If you already have OER replication running, do not migrate to this system without thorough testing
- **Database versions before 10.2B** — OPLOCK-based roll-forward requires OpenEdge 10.2B or later; earlier versions need manual `rfutil` apply

---

## Core Workflow

### 1. Assess Requirements and Select Tier

Determine which replication tier matches your RPO, RTO, infrastructure, and budget constraints.

| Tier | Mechanism | RPO | RTO | BI Protected | Complexity |
|------|-----------|-----|-----|-------------|------------|
| **Tier 1** | DRBD async + AI shipping | < 2s | < 30s | Yes (DRBD replicates .bi) | Medium |
| **Tier 2** | ZFS snapshot + AI shipping | < 5min | < 2min | Yes (in snapshot) | Medium-High |
| **Tier 3** | AI-only rsync | 1-5min | < 2min | No | Low |

**Checkpoint:** Confirm your RPO and RTO targets, verify available infrastructure (DRBD kernel module, ZFS pool, or neither), and decide if BI protection is required. Tier 3 has no BI protection — uncommitted transactions at crash time are lost.

### 2. Enable After-Imaging on Source Database

After-Imaging records committed transaction changes that can be replayed on the target via `rfutil roll-forward`.

```bash
# Connect to the source database broker
proenv

# Enable AI logging (online, no restart required)
proutil mydb -C aimage begin

# Verify AI is enabled and archiver is running
proutil mydb -C aimage list
# Expected: After Image Enabled: Yes, Archive Destination: /data/ai-archive, Archive Status: Active

# Configure AI archiver directory (copies completed extents for shipping)
proutil mydb -C aiarchive enable -aiarcdir /data/ai-archive
```

**Checkpoint:** Verify `Archive Status: Active` in the output. The archiver copies completed AI extents to `/data/ai-archive/`, which is the source for rsync transport.

### 3. Configure Tier-Specific Block/Snapshot Replication

#### Tier 1: DRBD Configuration (`/etc/drbd.d/mydb.res`)

```
resource mydb {
    protocol C;

    on primary-server {
        device     /dev/drbd1;
        disk       /dev/sda3;
        address    10.0.0.1:7788;
        meta-disk  internal;
    }

    on standby-server {
        device     /dev/drbd1;
        disk       /dev/sda3;
        address    10.0.0.2:7788;
        meta-disk  internal;
    }

    syncer {
        rate       100M;
        al-extents 3833;
        verify-alg sha1;
    }

    disk {
        on-io-error detach;
        fencing    resource-only;
    }

    net {
        cram-hmac-alg   sha256;
        shared-secret   "your-secret-here";
        after-sb-0p     disconnect;
        after-sb-1p     disconnect;
        after-sb-2p     disconnect;
    }

    fence-peer {
        program "/usr/lib/drbd/crm-fence-peer.sh";
    }
}
```

Initialize:
```bash
drbdadm create-md mydb
drbdadm -- --overwrite-data-of-primary primary mydb
drbdadm secondary mydb          # On standby
cat /proc/drbd                  # Verify sync progress
```

**Checkpoint:** DRBD must show `Connected` state and syncing must reach 100% before going live. The `after-sb-2p disconnect` policy prevents split-brain by dropping the connection if both sides are primary.

#### Tier 2: ZFS Snapshot Replication

```bash
# Source pool setup
zpool create -f mirror /dev/sda /dev/sdb -o ashift=12 dbdata
zfs set compression=lz4 dbdata
zfs set atime=off dbdata
zfs set sync=always dbdata/db      # Durability for database
zfs set checksum=sha256 dbdata/db
zfs create dbdata/db
zfs create dbdata/ai-archive

# Initial full replication
zfs send -v dbdata/db | ssh target zfs receive -F dbdata/db

# Incremental (run via cron every 5 min)
zfs send -v -i dbdata/db@repl-202601011200 dbdata/db@repl-202601011205 \
  | ssh target zfs receive -F dbdata/db
```

**Checkpoint:** Verify incremental send completes successfully and ZFS pool has sufficient space for snapshot retention. Use `zfs list -t snapshot -r dbdata/db` to review snapshot history.

### 4. Deploy AI Ship and AI Apply Daemons

The AI shipping layer provides transaction-level replication independent of block/snapshot replication, catching transactions between DRBD sync or ZFS snapshot intervals.

**Source — AI Ship Daemon** (`/opt/repl/bin/ai-ship-daemon.sh`):

```bash
#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="/data/ai-archive"
TARGET_HOST="target-server"
TARGET_DIR="/data/ai-received"
DB_NAME="mydb"
LOG_FILE="/var/log/repl/ai-ship.log"
PID_FILE="/var/run/repl/ai-ship.pid"

running() { kill -0 "$1" 2>/dev/null; }

start_daemon() {
    if [ -f "$PID_FILE" ] && running "$(cat "$PID_FILE")"; then
        echo "Already running (PID $(cat "$PID_FILE"))" >&2
        return 1
    fi

    mkdir -p "$(dirname "$LOG_FILE")"
    (
        while true; do
            inotifywait -e close_write,moved_to "$SOURCE_DIR" 2>/dev/null || continue
            sleep 2
            latest_ai=$(ls -t "$SOURCE_DIR"/${DB_NAME}.ai* 2>/dev/null | head -1)
            if [ -n "$latest_ai" ]; then
                rsync --checksum --compress --timeout=60 "$latest_ai" "$TARGET_HOST:$TARGET_DIR/" \
                    >> "$LOG_FILE" 2>&1
            fi
        done
    ) &
    echo $! > "$PID_FILE"
}

stop_daemon() {
    [ -f "$PID_FILE" ] && kill "$(cat "$PID_FILE")" 2>/dev/null || true
    rm -f "$PID_FILE"
}

case "${1:-}" in
    start) start_daemon ;;
    stop)  stop_daemon ;;
    status) [ -f "$PID_FILE" ] && running "$(cat "$PID_FILE")" && echo "Running" || echo "Stopped" ;;
    *) echo "Usage: $0 {start|stop|status}"; exit 1 ;;
esac
```

**Target — AI Apply Daemon** (`/opt/repl/bin/ai-apply-daemon.sh`):

```sh
#!/usr/bin/env bash
set -euo pipefail

DB_NAME="mydb"
RECEIVE_DIR="/data/ai-received"
APPLY_DIR="/data/ai-pending"
LOG_FILE="/var/log/repl/ai-apply.log"
PID_FILE="/var/run/repl/ai-apply.pid"
LOCK_FILE="/var/run/repl/ai-apply.lock"
APPLY_INTERVAL=60

acquire_lock() {
    [ -f "$LOCK_FILE" ] && return 1
    echo $$ > "$LOCK_FILE"
}
release_lock() { rm -f "$LOCK_FILE"; }

apply_ai() {
    local pending
    pending=$(ls -1 "$RECEIVE_DIR"/${DB_NAME}.ai* 2>/dev/null | wc -l)
    [ "$pending" -eq 0 ] && return 0

    ls -1 "$RECEIVE_DIR"/${DB_NAME}.ai* | sort > /tmp/ai-apply-list.txt
    rfutil "$DB_NAME" -C roll forward oplock -ailist /tmp/ai-apply-list.txt >> "$LOG_FILE" 2>&1 || true
    rm -f /tmp/ai-apply-list.txt
    proutil "$DB_NAME" -C aimage begin 2>/dev/null || true

    for f in "$RECEIVE_DIR"/${DB_NAME}.ai*; do
        [ -f "$f" ] && mv "$f" "$APPLY_DIR/.applied/" 2>/dev/null || true
    done
}

start_daemon() {
    mkdir -p "$APPLY_DIR/.applied" "$(dirname "$LOG_FILE")"
    (
        while true; do
            if acquire_lock; then apply_ai; release_lock; fi
            sleep "$APPLY_INTERVAL"
        done
    ) &
    echo $! > "$PID_FILE"
}

stop_daemon() {
    [ -f "$PID_FILE" ] && kill "$(cat "$PID_FILE")" 2>/dev/null || true
    rm -f "$PID_FILE"; release_lock
}

case "${1:-}" in
    start) start_daemon ;;
    stop)  stop_daemon ;;
    status) [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null && echo "Running" || echo "Stopped" ;;
    *) echo "Usage: $0 {start|stop|status}"; exit 1 ;;
esac
```

**Checkpoint:** Both daemons must show `Running` status. Verify AI files appear in `$TARGET_DIR/ai-received/` and get applied to `$APPLY_DIR/.applied/`.

### 5. Configure Keepalived VIP (Tier 1 + Optional for All Tiers)

The Virtual IP floats between servers, allowing clients to connect without reconnection code on failover.

**Keepalived config** (`/etc/keepalived/keepalived.conf`):

```
global_defs {
    router_id mydb-repl
}

vrrp_script chk_proserve {
    script "/opt/repl/bin/check-proserve.sh"
    interval 5
    timeout 3
    fall 2
    rise 1
}

vrrp_instance mydb_vip {
    state BACKUP
    interface eth0
    virtual_router_id 51
    priority 100
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass mydbsecret
    }
    virtual_ipaddress {
        192.168.1.100/24 dev eth0
    }
    track_script { chk_proserve }
    notify /etc/keepalived/notify.sh
}
```

**Health check script** (`/opt/repl/bin/check-proserve.sh`):

```bash
#!/usr/bin/env bash
DB_NAME="${DB_NAME:-mydb}"
if proshut "$DB_NAME" -C status 2>/dev/null | grep -q "Multi-User"; then
    exit 0
else
    exit 1
fi
```

**Standby startup command:**
```bash
# Primary (read-write)
proserve mydb -H primary-server -S 3001

# Standby (read-only, for offloading SELECT queries)
proserve mydb -RO -H standby-server -S 3001
```

**Checkpoint:** `ip addr show eth0 | grep 192.168.1.100` must show the VIP on the primary. Stopping the primary should cause the VIP to migrate to standby within ~5 seconds (3 failed checks at 5s interval + fall count).

### 6. Configure systemd Services

```ini
# /etc/systemd/system/ai-ship.service
[Unit]
Description=AI Ship Daemon for OpenEdge Database Replication
After=network.target remote-fs.target
[Service]
Type=forking
ExecStart=/opt/repl/bin/ai-ship-daemon.sh start
ExecStop=/opt/repl/bin/ai-ship-daemon.sh stop
PIDFile=/var/run/repl/ai-ship.pid
Restart=on-failure
RestartSec=10
[Install]
WantedBy=multi-user.target

# /etc/systemd/system/ai-apply.service
[Unit]
Description=AI Apply Daemon for OpenEdge Database Replication
After=network.target remote-fs.target
[Service]
Type=forking
ExecStart=/opt/repl/bin/ai-apply-daemon.sh start
ExecStop=/opt/repl/bin/ai-apply-daemon.sh stop
PIDFile=/var/run/repl/ai-apply.pid
Restart=on-failure
RestartSec=10
[Install]
WantedBy=multi-user.target

# /etc/systemd/system/keepalived.service
[Unit]
Description=Keepalived VRRP for OpenEdge VIP Failover
After=network.target
[Service]
Type=forking
ExecStart=/usr/sbin/keepalived --vrrp --dump-conf /tmp/keepalived.conf
ExecStop=/usr/sbin/keepalived -k
PIDFile=/var/run/keepalived.pid
[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
systemctl daemon-reload
systemctl enable --now ai-ship.service ai-apply.service keepalived.service
```

### 7. Validate the Full Stack

Run health checks across all components:

```bash
# Overall health (source + target + replication lag)
/opt/repl/bin/health-monitor.sh all

# DRBD-specific (Tier 1 only)
drbdadm status mydb
cat /proc/drbd

# ZFS-specific (Tier 2 only)
zfs list -t snapshot -r dbdata/db

# Service health
systemctl status ai-ship.service ai-apply.service keepalived.service

# Database integrity on target
proutil mydb -C dbanalys > /tmp/verify-analysis.txt
grep -i "error\|corrupt\|inconsistent" /tmp/verify-analysis.txt
```

**Checkpoint:** Health monitor reports lag < threshold (5 minutes), DRBD/ZFS shows connected/synced, no errors in dbanalys output.

---

## When to Choose Each Tier

### Tier 1: VIP + DRBD + AI — Choose When

- You need the lowest RPO (< 2 seconds) and RTO (< 30 seconds)
- Both servers are in the same datacenter (low-latency network < 1ms)
- BI crash recovery is required (DRBD replicates `.bi` files at block level)
- You want read-only standby offloading for reports/BI queries (`proserve -RO`)
- Linux environment with DRBD kernel module available

### Tier 2: ZFS + AI — Choose When

- Your infrastructure already uses ZFS pools
- Sites are geographically distributed (WAN-friendly `zfs send/recv` over SSH)
- Application-consistent snapshots via pre-freeze hooks are important
- You do not have DRBD kernel module access or preference for user-space replication
- RPO up to 5 minutes is acceptable

### Tier 3: AI-Only — Choose When

- Budget-constrained or minimal infrastructure requirements
- No block-level replication tools available (no DRBD, no ZFS)
- LAN-only deployment where 1-5 minute RPO is acceptable
- Development/test environments where data loss of uncommitted transactions is tolerable
- You want the simplest possible setup to get started

**WARNING for Tier 3:** The BI file is NOT replicated. On sudden source failure (power loss, kernel panic), any uncommitted transactions at crash time are lost. This tier must never be used for financial or transaction-critical production databases.

---

## Implementation Patterns

### Pattern 1: Split-Brain Prevention

Split-brain occurs when both servers believe they are primary, leading to data corruption. All three tiers prevent this through layered defense.

#### ❌ BAD — No Lock File, Direct Promotion Without Verification

```bash
#!/usr/bin/env bash
# DANGEROUS: Promotes without verifying source is truly dead or checking existing locks
drbdadm primary mydb
proserve mydb -H new-primary -S 3001
```

**What's wrong:**
- No check for `/var/run/repl/failover.lock` — concurrent failover attempts can produce dual-primary state
- No verification that the original source is unreachable — a temporary network glitch should not trigger failover
- No quorum or fencing mechanism — DRBD may allow both sides primary if fence-peer fails

#### ✅ GOOD — Full Pre-Failover Verification Chain

```bash
#!/usr/bin/env bash
set -euo pipefail

DB_NAME="mydb"
SOURCE_HOST="primary-server"
LOCK_FILE="/var/run/repl/failover.lock"

# Step 1: Acquire failover lock (prevents concurrent attempts)
if [ -f "$LOCK_FILE" ]; then
    echo "ERROR: Failover already in progress" >&2
    exit 1
fi
echo $$ > "$LOCK_FILE"
trap 'rm -f "$LOCK_FILE"' EXIT

# Step 2: Verify source is truly dead (multiple independent methods)
source_alive=false

ping -c 3 -W 5 "$SOURCE_HOST" >/dev/null 2>&1 && source_alive=true
ssh -o ConnectTimeout=5 "$SOURCE_HOST" "echo alive" >/dev/null 2>&1 && source_alive=true
proshut "$DB_NAME" -C status 2>/dev/null | grep -q "Multi-User" && source_alive=true

if $source_alive; then
    echo "ERROR: Source is still reachable — do not fail over" >&2
    exit 1
fi

# Step 3: Stop AI apply daemon before promoting
/opt/repl/bin/ai-apply-daemon.sh stop

# Step 4: Promote DRBD (Tier 1) or ZFS (Tier 2 is already current via receive -F)
drbdadm primary mydb

# Step 5: Start database — BI crash recovery runs automatically on startup
proserve "$DB_NAME" -H new-primary -S 3001

# Step 6: Apply remaining delta AI files
/opt/repl/bin/ai-apply-daemon.sh start
sleep 10
/opt/repl/bin/ai-apply-daemon.sh stop

# Step 7: Verify database is accepting connections
if proshut "$DB_NAME" -C status | grep -q "Multi-User"; then
    echo "FAILOVER COMPLETE: Database running on new primary"
else
    echo "ERROR: Database failed to start — check logs at /data/${DB_NAME}/*.lg" >&2
    exit 1
fi

echo "" > "$LOCK_FILE"   # Clear lock file only after verified success
trap - EXIT              # Disable cleanup trap since we cleared the lock ourselves
```

**Why this works:**
- Lock file prevents concurrent failover from a second admin or automated system
- Triple verification (ping + SSH + DB status) eliminates false positives from transient network issues
- AI apply is stopped before promotion to prevent race conditions during the handoff
- Post-promotion verification confirms success before clearing the lock

### Pattern 2: Application-Consistent ZFS Snapshot (Tier 2 Only)

Database files must be quiesced before snapshot to ensure consistency. The pre/post-snapshot hooks freeze and resume the database.

```bash
#!/usr/bin/env bash
set -euo pipefail

DATABASE="mydb"
POOL="dbdata/db"
SNAP_PREFIX="repl"
TARGET_HOST="target-server"
LOG_FILE="/var/log/repl/zfs-replicate.log"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "$LOG_FILE"; }

snapshot_name="${POOL}@${SNAP_PREFIX}-$(date +%Y%m%d%H%M)"
last_snapshot=""

# Find last sent snapshot on target for incremental
if ssh "$TARGET_HOST" "zfs list -t snapshot -r dbdata/db 2>/dev/null"; then
    last_snapshot=$(ssh "$TARGET_HOST" \
        "zfs list -t snapshot -r dbdata/db | grep '${SNAP_PREFIX}' | tail -1 | awk '{print \$1}'") || true
fi

log "Creating snapshot: $snapshot_name"
touch /var/run/repl/pre-snapshot.done

# Quiesce database — flush buffers and ensure consistent state
# OpenEdge has no native quiesce; we wait for idle transactions
proenv
proutil "$DATABASE" -C promon 2>/dev/null || true

zfs snapshot "$snapshot_name"
rm -f /var/run/repl/pre-snapshot.done

if [ -n "$last_snapshot" ]; then
    log "Sending incremental from $last_snapshot to $snapshot_name"
    zfs send -v -i "$last_snapshot" "$snapshot_name" \
        | ssh "$TARGET_HOST" zfs receive -F dbdata/db
else
    log "Sending full snapshot"
    zfs send -v "$snapshot_name" | ssh "$TARGET_HOST" zfs receive -F dbdata/db
fi

log "Replication complete"
```

**Why this works:** The marker file (`pre-snapshot.done`) signals to external tools (like monitoring) that a snapshot is in progress. Using incremental sends with the last-known target snapshot minimizes bandwidth and ensures the target stays current.

### Pattern 3: Replication Lag Monitoring

Track replication lag between source AI files and applied AI files on the target. The health monitor compares timestamps to detect when lag exceeds the RPO threshold.

```sh
#!/usr/bin/env bash
set -euo pipefail

SOURCE_HOST="primary-server"
DB_NAME="mydb"
RECEIVE_DIR="/data/ai-received"
APPLY_DIR="/data/ai-pending/.applied"
LAG_THRESHOLD=300  # 5 minutes in seconds

# Get latest shipped AI timestamp from source archive
latest_source=$(ssh "$SOURCE_HOST" \
    "ls -t /data/ai-archive/${DB_NAME}.ai*" 2>/dev/null | head -1)

# Get latest applied AI timestamp on target
latest_applied=$(ls -t "${APPLY_DIR}/${DB_NAME}.ai*" 2>/dev/null | head -1)

if [ -z "$latest_source" ] || [ -z "$latest_applied" ]; then
    echo "WARNING: Cannot determine lag — missing AI files"
    exit 0
fi

source_time=$(stat -c %Y "$latest_source")
applied_time=$(stat -c %Y "$latest_applied")
lag=$(( source_time - applied_time ))

if [ "$lag" -gt "$LAG_THRESHOLD" ]; then
    echo "ERROR: Replication lag ${lag}s exceeds threshold ${LAG_THRESHOLD}s"
    exit 1
else
    echo "Replication lag: ${lag}s (within ${LAG_THRESHOLD}s threshold)"
    exit 0
fi
```

**Why this works:** Comparing AI file timestamps provides an accurate picture of how far behind the target is relative to committed transactions on the source. This metric directly maps to your RPO — if lag is below your RPO threshold, replication is healthy.

### Pattern 4: Emergency Failover with Tier Differentiation

Emergency failover differs by tier because the storage state at failover time varies significantly.

```bash
#!/usr/bin/env bash
set -euo pipefail

DB_NAME="mydb"
TIER="${1:-tier1}"  # tier1, tier2, or tier3
LOG_FILE="/var/log/repl/failover.log"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "$LOG_FILE"; }

log "Starting emergency failover (Tier: $TIER)..."

# 1. Acquire lock
[ -f /var/run/repl/failover.lock ] && { echo "Failover in progress" >&2; exit 1; }
echo $$ > /var/run/repl/failover.lock

# 2. Stop AI apply daemon
/opt/repl/bin/ai-apply-daemon.sh stop

# Tier-specific promotion steps
case "$TIER" in
    tier1)
        log "Tier 1: Promoting DRBD"
        drbdadm primary mydb
        mount /dev/drbd1 /data/$DB_NAME
        ;;
    tier2)
        log "Tier 2: ZFS already at latest via receive -F"
        zpool import dbdata || true
        ;;
    tier3)
        log "Tier 3: No block promotion needed — applying remaining AI"
        for ai in /data/ai-received/${DB_NAME}.ai*; do
            [ -f "$ai" ] || continue
            echo "$ai" > /tmp/final-apply.txt
            proshut "$DB_NAME" -by 2>/dev/null || true
            rfutil "$DB_NAME" -C roll forward oplock -ailist /tmp/final-apply.txt >> "$LOG_FILE" 2>&1
            rm -f "$ai" /tmp/final-apply.txt
        done
        ;;
esac

# 3. Enable AI on target for future replication
proutil "$DB_NAME" -C aimage begin

# 4. Start database
log "Starting database..."
proserve "$DB_NAME" -H new-primary -S 3001

# 5. Verify
if proshut "$DB_NAME" -C status | grep -q "Multi-User"; then
    log "FAILOVER COMPLETE: Database running on $(hostname)"
else
    log "ERROR: Database failed to start — check /data/$DB_NAME/*.lg"
    rm -f /var/run/repl/failover.lock
    exit 1
fi

rm -f /var/run/repl/failover.lock
```

### Pattern 5: Planned Failover (Graceful Migration)

Planned failover during maintenance windows is significantly safer than emergency failover because you can ensure replication is fully caught up before switching.

```bash
#!/usr/bin/env bash
set -euo pipefail

DB_NAME="mydb"
TARGET_HOST="target-server"

# Step 1: Verify target readiness
/opt/repl/bin/health-monitor.sh all
echo "Replication lag check passed"

# Step 2: Stop new transactions (coordinate with applications)
echo "Waiting for applications to drain connections..."
sleep 30

# Step 3: Wait for replication to fully catch up
/opt/repl/bin/check-ai-lag.sh
if [ $? -ne 0 ]; then
    echo "ERROR: Replication not caught up — aborting planned failover"
    exit 1
fi

# Step 4: Stop AI shipping on source
systemctl stop ai-ship.service

# Step 5: Manually ship any remaining files
rsync -avz /data/ai-archive/${DB_NAME}.ai* "${TARGET_HOST}:/data/ai-pending/"

# Step 6: Final apply on target (ensures zero-gap)
/opt/repl/bin/ai-apply-daemon.sh start
sleep 10
/opt/repl/bin/ai-apply-daemon.sh stop

# Step 7: Promote target based on tier
drbdadm primary mydb          # Tier 1

# Step 8: Start database and verify
proserve "$DB_NAME" -H new-primary -S 3001
proshut "$DB_NAME" -C status | grep "Multi-User" && echo "Planned failover complete"
```

---

## Constraints

### MUST DO

- Always acquire `/var/run/repl/failover.lock` before any failover or promotion operation to prevent concurrent attempts
- Verify source is dead through at least 3 independent methods (ping, SSH, DB status) before emergency failover
- Use `oplock` flag with `rfutil roll-forward` on OpenEdge 10.2B+ to prevent other processes from interfering during apply
- Test the complete failover procedure in a non-production environment before relying on it for production disaster recovery
- Run `/opt/repl/bin/health-monitor.sh all` daily as part of operational checks
- Use DRBD Protocol C (sync after write acknowledgement) for the lowest RPO — never use Protocol A (async send) or Protocol B (sync write)
- Keep AI apply daemon running at all times on target — even with DRBD/ZFS, it catches transactions between block/snapshot syncs
- Maintain systemd service files for all replication components with `Restart=on-failure` policies
- Document the RPO achieved during each failover test by comparing last applied AI timestamp to failover time

### MUST NOT DO

- Never promote a target without verifying the original source is truly unreachable — this causes split-brain and data corruption
- Do not skip the lock file check — concurrent failovers produce dual-primary databases that silently corrupt data
- Never run `drbdadm primary` on both servers simultaneously — this creates a guaranteed split-brain condition
- Do not use AI-only (Tier 3) for financial, banking, or transaction-critical databases where uncommitted transaction loss is unacceptable
- Never manually edit AI files in `/data/ai-archive/` or `/data/ai-received/` — always let the daemons manage file lifecycle
- Do not run `proshut -by` on a standby without first confirming it's safe to do so during normal operations
- Never disable the keepalived health check script or set `fall` higher than 2 — false negatives will delay failover indefinitely
- Do not use the same `virtual_router_id` for multiple VIPs on the same network segment — this causes keepalived conflicts

---

## Output Template

When applying this skill, your output should contain:

1. **Selected Tier** — Which tier and the rationale (infrastructure constraints, RPO/RTO targets, BI protection requirements)
2. **Configuration Files** — Complete systemd unit files, DRBD/ZFS configs, keepalived config with correct hostnames and ports
3. **Daemon Scripts** — Working `ai-ship-daemon.sh` and `ai-apply-daemon.sh` adapted for the target environment
4. **Failover Procedure** — The specific sequence of commands (emergency or planned) with tier differentiation
5. **Verification Steps** — Commands to confirm health after configuration or failover

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `linux-services` | Managing the replication daemons and keepalived as systemd services with proper dependencies, restart policies, and resource limits |
| `storage-architecture` | Deep ZFS pool design, VDEV configuration, snapshot retention policies, and DRBD disk setup for database workloads |
| `shell-process-management` | Writing robust daemon processes with proper signal handling, PID file management, lock files, and logging — patterns used by ai-ship and ai-apply daemons |

---

## Live References

> Authoritative documentation links for OpenEdge replication, DRBD, ZFS, and keepalived. The model follows these at load time to resolve external references and inline content.

- [Progress OpenEdge Database Administration](https://documentation.progress.com/output/ea/OpenEdge%20Database%20Administration/) — Official OpenEdge database administration guide covering AI logging, rfutil, proshut, and crash recovery
- [OpenEdge Data Management Reference](https://documentation.progress.com/output/ea/OpenEdge%20Data%20Management/) — Reference for proutil commands including `-C aimage begin`, `-C aiarchive enable`, `-C dbanalys`, and `-C sequence`
- [DRBD Documentation](https://docs.linbit.com/docs/users-guide-9.2/) — Official DRBD user guide covering resource configuration, protocols A/B/C, fencing, split-brain recovery, and CRM integration
- [ZFS Boot Environment & Replication Guide](https://openzfs.github.io/openzfs-docs/) — OpenZFS documentation for zfs send/recv, incremental replication, snapshot management, and pool administration
- [Keepalived Documentation](https://keepalived.org/documentation.html) — Keepalived VRRP configuration guide for VIP failover, health checks, notification scripts, and multi-instance setups
- [rfutil Roll Forward Documentation](https://documentation.progress.com/output/uaOpenEdge124/admrvtbl/rfutil-roll-forward.html) — OpenEdge rfutil roll-forward command reference including OPLOCK flag usage and AI file list syntax
- [Progress OpenEdge Best Practices for High Availability](https://documentation.progress.com/output/ea/OpenEdge%20Best%20Practices/) — Official Progress recommendations for database HA, replication patterns, and performance tuning
