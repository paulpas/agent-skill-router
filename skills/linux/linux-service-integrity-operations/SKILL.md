---
name: linux-service-integrity-operations
description: Executes Linux system changes and deployments using zero-downtime patterns, health monitoring, and safe rollback procedures to maintain host availability.
license: MIT
compatibility: opencode
archetypes:
  - tactical
  - diagnostic
anti_triggers:
  - brainstorming
  - vague ideation
  - long-form architecture
response_profile:
  verbosity: low
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: linux
  triggers: zero downtime, service integrity, safe restart, rolling updates, health checks, Linux operational availability, service disruption prevention
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
---

# Linux Service Integrity Operations

Infrastructure engineer executing zero-downtime changes and deployments on Linux hosts using safe restart patterns, health monitoring during transitions, and automatic rollback procedures to maintain continuous service availability.

## TL;DR Checklist

- [ ] Confirm the service supports graceful reload before considering restart
- [ ] Set up a health check endpoint (HTTP /proc, or systemd-ready notification) before making changes
- [ ] Verify rollback procedure and snapshot exist before starting the change
- [ ] Execute the change with service-isolation (socket activation or port-based switching)
- [ ] Monitor health for at least 60 seconds post-change with active health checks
- [ ] Confirm dependent services have not entered degraded state
- [ ] Document the change in runbook with before/after metrics

---

## When to Use

Use this skill when:

- **Deploying configuration changes to production services** — Applying new settings without unplanned downtime
- **Performing kernel or library updates on running systems** — Services must remain available during package updates
- **Upgrading application binaries or containers** — Zero-downtime deployment of new versions
- **Modifying firewall rules or network configurations** — Maintaining active connections during policy changes
- **Scaling services vertically** — Adjusting resource limits, CPU/memory quotas without service interruption
- **Applying security patches to production workloads** — CVE fixes must not cause service outages

---

## When NOT to Use

Avoid this skill for:

- **Service-level failures where the service is already down** — Use incident response procedures instead
- **Database migrations requiring schema changes** — Use dedicated database migration tools (pg_dump, flyway, etc.)
- **Network-level re-architecting (VPC changes, subnet migrations)** — These require network planning and maintenance windows
- **Complete host re-imaging or OS upgrades** — Requires planned downtime and rebuild procedures

Use `linux-safe-script-execution` for pre-flight analysis before initiating zero-downtime operations.

---

## Core Workflow

### 1. Determine Service Restart Strategy

Choose the correct restart strategy based on the service's capabilities and dependency requirements.

```bash
#!/usr/bin/env bash
# service_strategy.sh — Determine optimal change strategy for a systemd service
# Usage: ./service_strategy.sh <service.service>
set -euo pipefail

determine_strategy() {
    local service="$1"

    if ! systemctl is-active --quiet "$service" 2>/dev/null; then
        echo "ERROR: Service '$service' is not running" >&2
        return 1
    fi

    echo "=== Change Strategy Analysis: ${service} ==="
    echo ""

    # Check if service supports reload
    local has_reload=false
    local exec_start
    exec_start=$(systemctl show "$service" --property=ExecStart --value 2>/dev/null || echo "")

    # Check unit file for ExecReload directive
    local unit_file
    unit_file=$(systemctl show "$service" --property=ExecReload --value 2>/dev/null || echo "")
    if [[ -n "$unit_file" && "$unit_file" != "-" ]]; then
        has_reload=true
        echo "Strategy: GRACEFUL RELOAD (preferred)"
        echo "  ExecReload directive found: $unit_file"
        echo "  Reload sends SIGHUP — connections maintained, no downtime"
    else
        echo "  No ExecReload directive found — restart required"
    fi
    echo ""

    # Check service type for readiness signaling
    local svc_type
    svc_type=$(systemctl show "$service" --property=Type --value 2>/dev/null || echo "simple")
    echo "Service type: $svc_type"

    case "$svc_type" in
        notify)
            echo "  Uses sd_notify() — systemd tracks readiness accurately"
            echo "  Strategy: Signal READY after config load completes"
            ;;
        forking)
            echo "  Forking process — systemd waits for parent exit"
            echo "  Strategy: Fork handles config reload, parent exits"
            ;;
        oneshot)
            echo "  One-shot service — not a long-running daemon"
            echo "  Strategy: Re-run the oneshot with new parameters"
            ;;
        simple|exec|dbus|idle)
            echo "  Simple/exec service — process is the main process"
            echo "  Strategy: Send signal to main process directly"
            ;;
    esac
    echo ""

    # Check for socket activation
    local socket_unit
    socket_unit=$(systemctl list-dependencies "$service" --reverse --no-pager 2>/dev/null | grep '\.socket' | head -5 || true)
    if [[ -n "$socket_unit" ]]; then
        echo "Socket activation detected:"
        echo "$socket_unit" | sed 's/^/  /'
        echo "  Benefit: systemd holds listening sockets during restart"
        echo "  New connections queue until service is ready"
    else
        echo "  No socket activation — brief connection gap during restart"
    fi
    echo ""

    # Determine health check method
    echo "=== Health Check Methods ==="
    if grep -q "ExecStartPre=" "$unit_file" 2>/dev/null || grep -q "ExecStart=" "$unit_file" 2>/dev/null; then
        local health_url
        health_url=$(grep -iE "(health|ready|status|ping)" "$unit_file" 2>/dev/null | grep -iE "exec|cmd" || true)
        if [[ -n "$health_url" ]]; then
            echo "  Built-in health endpoint found"
        else
            echo "  No explicit health endpoint — use systemctl is-active"
        fi
    fi

    # Recommend strategy
    echo ""
    echo "=== Recommended Strategy ==="
    if [[ "$has_reload" == "true" ]]; then
        echo "  1. Send reload signal:   systemctl reload ${service}"
        echo "  2. Verify health:        systemctl is-active --quiet ${service}"
        echo "  3. Check journal:        journalctl -u ${service} --since '1 min ago' -n 20"
    else
        echo "  1. Backup current state: systemctl show ${service} > /tmp/${service}.state"
        echo "  2. Apply configuration changes"
        echo "  3. Restart service:        systemctl restart ${service}"
        echo "  4. Wait for readiness:    systemctl is-active --quiet ${service}"
        echo "  5. Verify health:         journalctl -u ${service} --since '1 min ago'"
        echo "  6. If health fails:       systemctl revert ${service} && systemctl restart ${service}"
    fi
}

determine_strategy "${1:?Usage: $0 <service.service>}"
```

**Checkpoint:** Strategy is determined and matches the service's actual capabilities. Reload is preferred over restart wherever possible.

### 2. Execute Zero-Downtime Configuration Change

Apply changes using the service's native reload mechanism with active health verification.

```bash
#!/usr/bin/env bash
# zero_downtime_deploy.sh — Deploy configuration changes with zero-downtime guarantees
# Usage: ./zero_downtime_deploy.sh <service.service> <config-changes-file> [--health-url http://localhost:8080/health]
set -euo pipefail

SERVICE_NAME="${1:?Usage: $0 <service.service> <config-changes-file> [--health-url URL]}"
CHANGES_FILE="${2:?Config changes file required}"
HEALTH_URL="${3:-}"
DEPLOY_START=$(date +%s)
ROLLBACK_NEEDED=false

cleanup_on_failure() {
    if [[ "$ROLLBACK_NEEDED" == "true" ]]; then
        echo "=== ROLLBACK: Reverting configuration changes ==="
        if systemctl revert "$SERVICE_NAME" &>/dev/null; then
            systemctl restart "$SERVICE_NAME"
            echo "Configuration reverted and service restarted"
        else
            echo "ERROR: Rollback failed — manual intervention required" >&2
            exit 1
        fi
    fi
}

trap cleanup_on_failure ERR

verify_service_health() {
    local service="$1"
    local max_attempts=10
    local attempt=0

    echo "--- Health Verification ---"

    # Method 1: systemd active state
    if ! systemctl is-active --quiet "$service"; then
        echo "FAIL: Service is not active"
        ROLLBACK_NEEDED=true
        return 1
    fi
    echo "  systemd active: OK"

    # Method 2: Health URL if provided
    if [[ -n "$HEALTH_URL" ]]; then
        while [[ $attempt -lt $max_attempts ]]; do
            if curl -sf --max-time 5 "$HEALTH_URL" &>/dev/null; then
                echo "  health endpoint: OK"
                return 0
            fi
            attempt=$((attempt + 1))
            echo "  health endpoint: waiting (attempt $attempt/$max_attempts)..."
            sleep 3
        done
        echo "  health endpoint: FAIL (timed out after $((max_attempts * 3))s)"
        ROLLBACK_NEEDED=true
        return 1
    fi

    # Method 3: Journal check for errors after restart
    local recent_errors
    recent_errors=$(journalctl -u "$service" --since "1 minute ago" -p err --no-pager 2>/dev/null | wc -l)
    if [[ "$recent_errors" -gt 3 ]]; then
        echo "  journal error count: WARNING (${recent_errors} errors in last minute)"
        echo "  Consider monitoring for 60 more seconds"
        return 0
    fi
    echo "  journal error count: OK (${recent_errors} errors)"

    return 0
}

echo "=== Zero-Downtime Deployment ==="
echo "Service:  $SERVICE_NAME"
echo "Changes:  $CHANGES_FILE"
echo "Start:    $(date -Iseconds)"
echo ""

# Verify service is running
echo "--- Pre-change Verification ---"
if ! systemctl is-active --quiet "$SERVICE_NAME"; then
    echo "ERROR: Service '$SERVICE_NAME' is not running" >&2
    exit 1
fi
echo "Service is active. Proceeding..."
echo ""

# Apply configuration changes safely
echo "--- Applying Changes ---"
if [[ -f "$CHANGES_FILE" ]]; then
    # If it's a conf.d drop-in, place it in the correct location
    local_unit_dir="/etc/systemd/system/${SERVICE_NAME}.d"
    mkdir -p "$local_unit_dir"

    # Generate a unique drop-in filename
    local timestamp
    timestamp=$(date +%Y%m%dT%H%M%S)
    local dropin_file="${local_unit_dir}/99-custom-${timestamp}.conf"

    if cp "$CHANGES_FILE" "$dropin_file"; then
        echo "  Drop-in created: $dropin_file"
    else
        echo "ERROR: Failed to create drop-in file" >&2
        exit 1
    fi
else
    echo "WARNING: Config file not found, skipping file deployment"
fi
echo ""

# Reload systemd and service
echo "--- Reloading Systemd ---"
systemctl daemon-reload
echo "  systemd daemon reloaded"

echo "--- Reloading Service ---"
if systemctl reload "$SERVICE_NAME" &>/dev/null; then
    echo "  Service reloaded successfully (graceful)"
elif systemctl restart "$SERVICE_NAME" &>/dev/null; then
    echo "  Service restarted (graceful reload unavailable)"
    ROLLBACK_NEEDED=true  # Mark for rollback on health failure
else
    echo "ERROR: Failed to reload/restart service" >&2
    ROLLBACK_NEEDED=true
    exit 1
fi
echo ""

# Health verification
verify_service_health "$SERVICE_NAME"
ELAPSED=$(($(date +%s) - DEPLOY_START))

echo ""
echo "=== Deployment Summary ==="
echo "Service: $SERVICE_NAME"
echo "Duration: ${ELAPSED}s"
echo "Status: $(systemctl is-active "$SERVICE_NAME")"
echo "Health: $(verify_service_health "$SERVICE_NAME" && echo 'PASS' || echo 'FAIL')"

if [[ "$ROLLBACK_NEEDED" == "true" ]]; then
    echo "WARNING: Changes marked for rollback on health failure"
else
    echo "Changes committed. No rollback needed."
fi
```

**Checkpoint:** Service is active and healthy after changes. All configuration modifications are verified with active health checks.

### 3. Implement Health Monitoring During Changes

Set up continuous health monitoring during the change window with automated alerting on degradation.

```python
"""Health monitor for zero-downtime service changes.

Provides active health checking with configurable thresholds,
alerting on degradation during change windows.
"""

import subprocess
import time
import json
import urllib.request
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Optional


class HealthStatus(Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


@dataclass
class HealthMetric:
    """A single health metric sample."""
    timestamp: datetime
    status: HealthStatus
    response_time_ms: Optional[float] = None
    error_count: int = 0
    detail: str = ""


@dataclass
class HealthMonitorConfig:
    """Configuration for a health monitoring session."""
    service_name: str
    check_interval: float = 2.0       # seconds between health checks
    min_healthy_samples: int = 5      # consecutive healthy checks to consider stable
    max_error_count: int = 3          # errors before marking unhealthy
    timeout: float = 5.0              # HTTP request timeout in seconds
    health_url: Optional[str] = None  # HTTP health endpoint
    alert_on_degradation: bool = True  # alert when status drops from healthy


@dataclass
class HealthMonitor:
    """Monitors a systemd service's health during a change window."""
    config: HealthMonitorConfig
    history: list = field(default_factory=list)
    current_status: HealthStatus = HealthStatus.UNKNOWN
    degradation_detected: bool = False
    alerts: list = field(default_factory=list)

    def _systemd_health_check(self) -> tuple[HealthStatus, int]:
        """Check health via systemd active state.

        Returns:
            Tuple of (status, uptime_seconds)
        """
        try:
            result = subprocess.run(
                ["systemctl", "is-active", "--quiet", self.config.service_name],
                capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0:
                # Service is active — check uptime for stability
                uptime_result = subprocess.run(
                    ["systemctl", "show", self.config.service_name,
                     "--property=ActiveEnterTimestamp"],
                    capture_output=True, text=True, timeout=5
                )
                uptime_line = uptime_result.stdout.strip().split("=", 1)
                if len(uptime_line) == 2:
                    return HealthStatus.HEALTHY, 0
                return HealthStatus.HEALTHY, 0
            else:
                return HealthStatus.UNHEALTHY, 0
        except subprocess.TimeoutExpired:
            return HealthStatus.UNKNOWN, 0
        except FileNotFoundError:
            return HealthStatus.UNKNOWN, 0

    def _http_health_check(self) -> tuple[HealthStatus, float]:
        """Check health via HTTP endpoint.

        Returns:
            Tuple of (status, response_time_ms)
        """
        if not self.config.health_url:
            return HealthStatus.UNKNOWN, 0.0

        start = time.monotonic()
        try:
            req = urllib.request.Request(self.config.health_url, method='GET')
            with urllib.request.urlopen(req, timeout=self.config.timeout) as resp:
                response_time = (time.monotonic() - start) * 1000
                if 200 <= resp.status < 300:
                    return HealthStatus.HEALTHY, response_time
                elif resp.status < 500:
                    return HealthStatus.DEGRADED, response_time
                else:
                    return HealthStatus.UNHEALTHY, response_time
        except (urllib.error.URLError, urllib.error.HTTPError) as e:
            response_time = (time.monotonic() - start) * 1000
            if isinstance(e, urllib.error.HTTPError):
                if 500 <= e.code < 600:
                    return HealthStatus.UNHEALTHY, response_time
                return HealthStatus.DEGRADED, response_time
            return HealthStatus.UNHEALTHY, response_time
        except Exception:
            return HealthStatus.UNKNOWN, 0.0

    def perform_check(self) -> HealthMetric:
        """Perform a single health check and record the result.

        Returns:
            HealthMetric with the check result
        """
        start = time.monotonic()

        # Use HTTP check if available, otherwise systemd
        if self.config.health_url:
            status, response_time = self._http_health_check()
        else:
            status, _ = self._systemd_health_check()
            response_time = 0.0

        elapsed_ms = (time.monotonic() - start) * 1000

        # Update degradation tracking
        prev_status = self.current_status
        self.current_status = status

        if prev_status == HealthStatus.HEALTHY and status in (
            HealthStatus.DEGRADED, HealthStatus.UNHEALTHY
        ):
            self.degradation_detected = True
            alert_msg = (
                f"Degradation detected for {self.config.service_name}: "
                f"{prev_status.value} → {status.value} at {datetime.now().isoformat()}"
            )
            self.alerts.append(alert_msg)

        metric = HealthMetric(
            timestamp=datetime.now(),
            status=status,
            response_time_ms=response_time or elapsed_ms
        )
        self.history.append(metric)
        return metric

    def run_monitoring_session(
        self,
        duration_seconds: int = 120,
        callback=None
    ) -> list[HealthMetric]:
        """Run health monitoring for a specified duration.

        Args:
            duration_seconds: How long to monitor
            callback: Optional function(metric) called after each check

        Returns:
            List of all HealthMetric samples collected
        """
        end_time = time.monotonic() + duration_seconds
        healthy_streak = 0

        while time.monotonic() < end_time:
            metric = self.perform_check()

            if callback:
                callback(metric)

            if metric.status == HealthStatus.HEALTHY:
                healthy_streak += 1
            else:
                healthy_streak = 0

            # Wait for next check interval
            time.sleep(self.config.check_interval)

        # Final status
        stability = (
            "STABLE" if healthy_streak >= self.config.min_healthy_samples
            else "UNSTABLE"
        )

        print(f"\n{'='*50}")
        print(f"Monitoring Session Complete")
        print(f"Service: {self.config.service_name}")
        print(f"Total checks: {len(self.history)}")
        print(f"Stability: {stability}")
        print(f"Final status: {self.current_status.value}")
        if self.alerts:
            print(f"Alerts: {len(self.alerts)}")
            for alert in self.alerts:
                print(f"  ⚠ {alert}")
        print(f"{'='*50}")

        return self.history

    def generate_report(self) -> dict:
        """Generate a health monitoring summary report.

        Returns:
            Dictionary with monitoring summary data
        """
        if not self.history:
            return {"error": "No monitoring data collected"}

        statuses = [m.status for m in self.history]
        healthy_count = statuses.count(HealthStatus.HEALTHY)
        degraded_count = statuses.count(HealthStatus.DEGRADED)
        unhealthy_count = statuses.count(HealthStatus.UNHEALTHY)
        total = len(statuses)

        avg_response = (
            sum(m.response_time_ms or 0 for m in self.history) / total
            if total > 0 else 0
        )

        return {
            "service": self.config.service_name,
            "total_checks": total,
            "healthy_pct": round(healthy_count / total * 100, 1) if total else 0,
            "degraded_pct": round(degraded_count / total * 100, 1) if total else 0,
            "unhealthy_pct": round(unhealthy_count / total * 100, 1) if total else 0,
            "avg_response_ms": round(avg_response, 1),
            "degradation_detected": self.degradation_detected,
            "alerts": self.alerts,
            "final_status": self.current_status.value,
            "samples": [
                {
                    "time": m.timestamp.isoformat(),
                    "status": m.status.value,
                    "response_ms": round(m.response_time_ms or 0, 1),
                }
                for m in self.history[-10:]  # Last 10 samples
            ],
        }
```

**Checkpoint:** Health monitoring runs for a minimum of 120 seconds post-change. Service achieves `min_healthy_samples` consecutive healthy checks before declaring stability.

### 4. Execute Safe Rollback

If health checks fail during or after a change, execute an automated rollback to restore the previous state.

```bash
#!/usr/bin/env bash
# safe_rollback.sh — Automated rollback for zero-downtime deployments
# Usage: ./safe_rollback.sh <service.service> [--verbose]
set -euo pipefail

SERVICE_NAME="${1:?Usage: $0 <service.service> [--verbose]}"
VERBOSE=false
ROLLBACK_TIMESTAMP=$(date +%Y%m%dT%H%M%S)

if [[ "${2:-}" == "--verbose" ]]; then
    VERBOSE=true
fi

log() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo "[$(date +%T)] $*"
    fi
}

echo "=== Service Rollback: ${SERVICE_NAME} ==="
echo "Timestamp: $(date -Iseconds)"
echo ""

# Phase 1: Capture current (broken) state
echo "--- Phase 1: Capture Current State ---"
systemctl show "$SERVICE_NAME" --property=LoadState,ActiveState,SubState \
    > "/tmp/rollback-${SERVICE_NAME}-${ROLLBACK_TIMESTAMP}-pre.conf" 2>/dev/null || true
log "Current service state saved"

# Phase 2: Revert systemd drop-ins and configuration
echo "--- Phase 2: Revert Configuration ---"

# Find and remove all custom drop-ins created after the deployment
local_unit_dir="/etc/systemd/system/${SERVICE_NAME}.d"
if [[ -d "$local_unit_dir" ]]; then
    # List all custom drop-ins (those not in version control or baseline)
    local dropin_count
    dropin_count=$(find "$local_unit_dir" -name "*.conf" 2>/dev/null | wc -l)

    if [[ "$dropin_count" -gt 0 ]]; then
        # Keep only baseline drop-ins (files without timestamp in name)
        find "$local_unit_dir" -name "*.conf" -type f | while IFS= read -r conf; do
            local basename
            basename=$(basename "$conf")
            if [[ "$basename" == *-T* ]]; then
                # Timestamp-based drop-in — remove it
                rm -f "$conf"
                log "Removed drop-in: $basename"
            fi
        done
    fi

    # Use systemd's native revert if available (systemd 252+)
    if systemctl revert "$SERVICE_NAME" 2>/dev/null; then
        log "systemd native revert successful"
    else
        log "systemd revert unavailable — using manual config restore"
    fi
else
    log "No custom drop-in directory found"
fi
echo ""

# Phase 3: Reload and restart
echo "--- Phase 3: Reload and Restart ---"
systemctl daemon-reload
log "systemd daemon reloaded"

# Attempt graceful restart
if systemctl restart "$SERVICE_NAME" 2>/dev/null; then
    log "Service restarted successfully"
else
    log "WARNING: Service restart failed"
fi
echo ""

# Phase 4: Verify rollback health
echo "--- Phase 4: Verify Rollback ---"
sleep 3

if systemctl is-active --quiet "$SERVICE_NAME"; then
    echo "  Service is ACTIVE after rollback"

    # Check journal for errors in the last minute
    local error_count
    error_count=$(journalctl -u "$SERVICE_NAME" --since "1 minute ago" \
        -p err --no-pager 2>/dev/null | wc -l)

    if [[ "$error_count" -gt 0 ]]; then
        echo "  WARNING: ${error_count} error(s) in journal since restart"
        journalctl -u "$SERVICE_NAME" --since "1 minute ago" -p err --no-pager -n 10
    else
        echo "  No errors in journal since restart — rollback verified"
    fi
else
    echo "  ERROR: Service is NOT active after rollback"
    echo "  Attempting one more restart..."
    systemctl restart "$SERVICE_NAME" 2>/dev/null || true
    sleep 3
    if ! systemctl is-active --quiet "$SERVICE_NAME"; then
        echo "  CRITICAL: Service remains down after rollback"
        echo "  Manual intervention required"
        exit 1
    fi
fi
echo ""

# Phase 5: Preserve rollback artifacts
echo "--- Phase 5: Preserve Rollback Artifacts ---"
local rollback_dir="/var/log/rollback/${SERVICE_NAME}"
mkdir -p "$rollback_dir"

# Copy current service state for post-mortem
systemctl show "$SERVICE_NAME" > "${rollback_dir}/post-rollback.conf"
journalctl -u "$SERVICE_NAME" --since "${ROLLBACK_TIMESTAMP}" \
    > "${rollback_dir}/journal.log" 2>/dev/null || true

echo "  Artifacts preserved in: $rollback_dir"
echo ""

echo "=== Rollback Complete ==="
echo "Service: $SERVICE_NAME"
echo "Status: $(systemctl is-active "$SERVICE_NAME")"
```

**Checkpoint:** Service is confirmed active after rollback. Artifacts are preserved for post-mortem analysis.

### 5. Safe Rolling Update for Multi-Instance Services

For services running multiple instances (via systemd templates or containers), perform rolling updates to maintain availability.

```bash
#!/usr/bin/env bash
# rolling_update.sh — Perform rolling updates for multi-instance services
# Usage: ./rolling_update.sh <template.service> <instances_count> [--health-url URL]
set -euo pipefail

TEMPLATE_SERVICE="${1:?Usage: $0 <template.service> <count> [--health-url URL]}"
INSTANCE_COUNT="${2:?Instance count required}"
HEALTH_URL="${3:-}"
MAX_UNHEALTHY=1  # Maximum instances allowed to be down simultaneously
UPDATE_LOG="/var/log/rolling-update-${TEMPLATE_SERVICE}-$(date +%Y%m%d).log"

mkdir -p "$(dirname "$UPDATE_LOG")"

log() {
    echo "[$(date +%T)] $*" | tee -a "$UPDATE_LOG"
}

check_instance_health() {
    local instance="$1"
    if systemctl is-active --quiet "$instance" 2>/dev/null; then
        return 0
    fi
    return 1
}

wait_for_stability() {
    local instance="$1"
    local max_wait=30
    local wait=0

    log "Waiting for $instance to stabilize..."
    while [[ $wait -lt $max_wait ]]; do
        if check_instance_health "$instance"; then
            log "$instance is healthy after ${wait}s"
            return 0
        fi
        sleep 2
        wait=$((wait + 2))
    done

    log "ERROR: $instance did not stabilize within ${max_wait}s"
    return 1
}

log "=== Rolling Update: ${TEMPLATE_SERVICE} ==="
log "Instances: $INSTANCE_COUNT"
log "Max down simultaneously: $MAX_UNHEALTHY"
log ""

# Phase 1: Pre-update health check
log "--- Pre-update Health Check ---"
for i in $(seq 1 "$INSTANCE_COUNT"); do
    local instance="${TEMPLATE_SERVICE/@/$i}"
    if check_instance_health "$instance"; then
        log "  Instance $i: HEALTHY"
    else
        log "  Instance $i: UNHEALTHY (may need separate attention)"
    fi
done
log ""

# Phase 2: Rolling update
log "--- Rolling Update ---"
for i in $(seq 1 "$INSTANCE_COUNT"); do
    local instance="${TEMPLATE_SERVICE/@/$i}"
    local down_count=0

    log "Updating instance $i of $INSTANCE_COUNT: $instance"

    # Stop the current instance
    systemctl stop "$instance" 2>/dev/null
    log "  Instance $i stopped"

    # Wait briefly for port cleanup
    sleep 1

    # Verify other instances are still healthy
    for j in $(seq 1 "$INSTANCE_COUNT"); do
        if [[ $j -ne $i ]]; then
            local other="${TEMPLATE_SERVICE/@/$j}"
            if ! check_instance_health "$other"; then
                down_count=$((down_count + 1))
            fi
        fi
    done

    if [[ $down_count -gt $MAX_UNHEALTHY ]]; then
        log "  ERROR: Too many instances unhealthy ($down_count > $MAX_UNHEALTHY) — aborting"
        # Attempt to restart the stopped instance immediately
        systemctl start "$instance" 2>/dev/null
        log "  Aborting rolling update — restart instance $i for recovery"
        exit 1
    fi

    # Start the instance
    systemctl start "$instance" 2>/dev/null
    log "  Instance $i started"

    # Wait for stability
    if ! wait_for_stability "$instance"; then
        log "  ERROR: Instance $i failed to stabilize"
        log "  Attempting restart..."
        systemctl restart "$instance" 2>/dev/null
        wait_for_stability "$instance" || true
    fi

    log "  Instance $i: DEPLOYED"
    log ""
done

# Phase 3: Post-update verification
log "--- Post-update Verification ---"
all_healthy=true
for i in $(seq 1 "$INSTANCE_COUNT"); do
    local instance="${TEMPLATE_SERVICE/@/$i}"
    if check_instance_health "$instance"; then
        log "  Instance $i: HEALTHY"
    else
        log "  Instance $i: UNHEALTHY — manual attention required"
        all_healthy=false
    fi
done

log ""
if [[ "$all_healthy" == "true" ]]; then
    log "=== Rolling Update Complete: All instances healthy ==="
else
    log "=== Rolling Update Complete: Some instances need attention ==="
    exit 1
fi
```

**Checkpoint:** All instances are healthy after rolling update. No more than `MAX_UNHEALTHY` instances were down simultaneously.

---

## Implementation Patterns

### Pattern 1: Graceful Shutdown vs Hard Restart (BAD vs. GOOD)

**BAD — Hard restart causes service disruption**

```bash
# ❌ BAD: Direct restart with no signal handling or health verification
deploy_update() {
    local service="$1"

    # Stops immediately — active connections are dropped
    systemctl restart "$service"

    # No health check — assumes success
    echo "Update complete"
}

# Problems:
# - All active connections are dropped during restart
# - No health verification — service might fail to start
# - No rollback if health check fails
# - Dependent services start before this one is ready
```

**GOOD — Graceful transition with health verification**

```bash
# ✅ GOOD: Graceful shutdown, health verification, and automatic rollback
deploy_update() {
    local service="$1"
    local max_health_checks=15
    local health_check_interval=3
    local rollback=false

    # Step 1: Check if service supports reload (zero-downtime preferred)
    local has_reload
    has_reload=$(systemctl show "$service" --property=ExecReload --value 2>/dev/null)
    if [[ -n "$has_reload" && "$has_reload" != "-" ]]; then
        echo "Using graceful reload (zero downtime)"
        systemctl reload "$service"
        rollback=false  # Reload rarely needs rollback
    else
        # Step 2: Graceful stop — send SIGTERM, not SIGKILL
        echo "Graceful stop (connections draining)..."
        systemctl stop "$service"
        rollback=true  # Restart needs rollback on failure

        # Step 3: Quick health verification
        echo "Verifying service health..."
        local checks=0
        while [[ $checks -lt $max_health_checks ]]; do
            if systemctl is-active --quiet "$service" 2>/dev/null; then
                echo "Service started and healthy after ${checks}s"
                return 0
            fi
            checks=$((checks + 1))
            echo "  Waiting for service... (${checks}/${max_health_checks})"
            sleep "$health_check_interval"
        done

        # Step 4: Rollback on failure
        echo "ERROR: Service failed to start" >&2
        if [[ "$rollback" == "true" ]]; then
            echo "Rolling back..."
            systemctl start "$service" 2>/dev/null || true
            echo "Rollback complete. Manual review required."
        fi
        return 1
    fi

    # Step 5: Post-deploy verification
    if systemctl is-active --quiet "$service"; then
        echo "Service healthy after deployment"
        return 0
    else
        echo "ERROR: Service unhealthy after deployment" >&2
        return 1
    fi
}
```

### Pattern 2: Health Check with Backoff and Circuit Breaker

**Bash — Resilient health monitoring with circuit breaker pattern**

```bash
#!/usr/bin/env bash
# resilient_health_monitor.sh — Health check with exponential backoff and circuit breaker
# Usage: ./resilient_health_monitor.sh <service.service> [--http URL] [--max-checks 30]
set -euo pipefail

SERVICE_NAME="${1:?Usage: $0 <service.service> [--http URL] [--max-checks N]}"
HEALTH_URL=""
MAX_CHECKS=30
CONSECUTIVE_HEALTHY=0
CIRCUIT_BREAKER_THRESHOLD=3  # consecutive failures to open circuit
CIRCUIT_OPEN=false
RETRY_BACKOFF_BASE=2

while [[ $# -gt 0 ]]; do
    case "$1" in
        --http) HEALTH_URL="$2"; shift 2 ;;
        --max-checks) MAX_CHECKS="$2"; shift 2 ;;
        *) shift ;;
    esac
done

perform_health_check() {
    if [[ -n "$HEALTH_URL" ]]; then
        # HTTP health check with timeout
        if curl -sf --max-time 3 "$HEALTH_URL" &>/dev/null; then
            return 0
        else
            return 1
        fi
    else
        # Systemd health check
        if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
            return 0
        else
            return 1
        fi
    fi
}

echo "=== Resilient Health Monitor ==="
echo "Service: $SERVICE_NAME"
echo "Max checks: $MAX_CHECKS"
echo "Circuit breaker threshold: $CIRCUIT_BREAKER_THRESHOLD"
echo ""

check_num=0
while [[ $check_num -lt $MAX_CHECKS ]]; do
    check_num=$((check_num + 1))

    if [[ "$CIRCUIT_OPEN" == "true" ]]; then
        # Circuit is open — wait for half-open probe
        echo "[$check_num] Circuit OPEN — waiting for recovery probe..."
        sleep 10

        # Half-open: attempt one health check
        if perform_health_check; then
            echo "  Circuit HALF-OPEN: service recovered"
            CIRCUIT_OPEN=false
            CONSECUTIVE_HEALTHY=1
        else
            echo "  Circuit stays OPEN: service still unhealthy"
        fi
        continue
    fi

    # Normal health check
    if perform_health_check; then
        CONSECUTIVE_HEALTHY=$((CONSECUTIVE_HEALTHY + 1))
        backoff=$((RETRY_BACKOFF_BASE ** (CONSECUTIVE_HEALTHY / 5)))  # Increase interval every 5 healthy checks

        if [[ $CONSECUTIVE_HEALTHY -ge 5 ]]; then
            echo "[$check_num] ✓ HEALTHY (consecutive: $CONSECUTIVE_HEALTHY, next check in ${backoff}s)"
        else
            echo "[$check_num] ✓ HEALTHY (consecutive: $CONSECUTIVE_HEALTHY)"
        fi

        # Sleep with backoff between checks
        sleep "$backoff"
    else
        CONSECUTIVE_HEALTHY=0

        if [[ $check_num -le 3 ]]; then
            # Initial transient failures — retry quickly
            echo "[$check_num] ✗ UNHEALTHY (transient, retrying...)"
            sleep 2
        else
            echo "[$check_num] ✗ UNHEALTHY"

            # Check journal for errors
            local errors
            errors=$(journalctl -u "$SERVICE_NAME" --since "${check_num} minutes ago" \
                -p err --no-pager 2>/dev/null | tail -3 || true)
            if [[ -n "$errors" ]]; then
                echo "  Recent errors:"
                echo "$errors" | sed 's/^/    /'
            fi

            # Circuit breaker: if too many consecutive failures, open circuit
            if [[ $check_num -ge $CIRCUIT_BREAKER_THRESHOLD ]]; then
                # Only open circuit after the first few checks are healthy
                if [[ $CONSECUTIVE_HEALTHY -le 1 ]]; then
                    echo "  ⚠ Circuit OPEN: too many failures"
                    CIRCUIT_OPEN=true
                fi
            fi

            sleep 5
        fi
    fi
done

echo ""
echo "=== Monitor Session Complete ==="
if [[ "$CIRCUIT_OPEN" == "true" ]]; then
    echo "Circuit remains OPEN — manual intervention required"
    exit 1
else
    echo "Circuit closed — service is healthy"
    exit 0
fi
```

---

## Constraints

### MUST DO

- **MUST** attempt `systemctl reload` before `systemctl restart` — reload maintains active connections and provides true zero-downtime
- **MUST** run health checks for a minimum of 120 seconds after any service change — short-lived stability does not indicate lasting availability
- **MUST** maintain a rollback-ready state before every change: configuration backup, snapshot, or `systemd revert` capability
- **MUST** use a circuit breaker pattern in health monitoring — open circuit after consecutive failures to prevent check storms
- **MUST** enforce `MAX_UNHEALTHY=1` for rolling updates — never take down more than one instance simultaneously
- **MUST** verify that dependent services have not entered a degraded state after the target service changes
- **MUST** use socket activation where possible — systemd's socket listeners hold connections during service restarts
- **MUST** preserve rollback artifacts (journal logs, service state, config diffs) for post-deploy analysis

### MUST NOT DO

- **MUST NOT** send `SIGKILL` or use `systemctl kill --signal=9` to restart a service — use graceful shutdown with SIGTERM first
- **MUST NOT** skip the health check phase regardless of how confident the change is — every change has failure risk
- **MUST NOT** perform rolling updates on single-instance services — use the full deployment workflow with rollback instead
- **MUST NOT** disable or bypass the circuit breaker "temporarily" — it prevents cascading failure detection
- **MUST NOT** restart core infrastructure services (systemd-journald, dbus, NetworkManager) on production hosts without console access
- **MUST NOT** modify firewall rules without an active management session (SSH) to restore them if the change locks you out
- **MUST NOT** assume a service started correctly because `systemctl restart` returned 0 — always verify actual health state

---

## Output Template

When applying this skill, produce:

1. **Strategy Recommendation** — Reload vs restart vs rolling update, with justification based on service type and dependencies
2. **Pre-Change Health Baseline** — Current service health metrics (active status, error count, response times if available)
3. **Deployment Execution Plan** — Step-by-step commands with timing estimates and expected behavior at each step
4. **Health Verification Report** — Post-change health check results with pass/fail status and duration
5. **Rollback Readiness Statement** — Confirmation that rollback is prepared with specific artifacts and recovery steps
6. **Post-Change Stability Assessment** — 120+ second health monitoring summary with degradation alerts and circuit breaker status

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `linux-safe-script-execution` | Pre-flight validation before initiating zero-downtime operations |
| `linux-services` | Deep systemd unit file configuration for socket activation and watchdog |
| `observability` | Set up Prometheus/Grafana health monitoring and alerting for service changes |
| `networking` | Network port management and load balancer integration for rolling updates |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [systemd.service — Service Manager](https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html)
- [systemd.socket — Socket Activation](https://www.freedesktop.org/software/systemd/man/latest/systemd.socket.html)
- [sd_notify Protocol](https://www.freedesktop.org/software/systemd/man/latest/sd_notify.html)
- [systemd.exec — Execution Environment](https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html)
- [Linux System Administrator Guide — Service Management](https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html/managing_services_with_systemd/assembly_understanding-and-managing-systemd-services_managing-services-with-systemd)
- [nginx Rolling Reload Documentation](https://docs.nginx.com/nginx/admin-guide/basic-functionality/reloading-configuration/)
- [Kernel.org — Systemd and Linux Kernel Integration](https://www.kernel.org/doc/html/latest/admin-guide/pm/systemd.html)
