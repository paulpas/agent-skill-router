---
name: linux-safe-script-execution
description: Performs pre-flight validation and interaction mapping for Linux automation scripts to identify availability risks before execution.
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
  triggers: script safety, pre-flight checks, availability risk, script interaction, automation safety, service disruption, Linux operational safety
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
---

# Safe Script Execution for Linux Infrastructure Automation

Infrastructure engineer performing pre-flight validation and interaction mapping for Linux automation scripts to identify availability risks, resource conflicts, and service disruption points before execution.

## TL;DR Checklist

- [ ] Verify script has `set -euo pipefail` and explicit error handling on every command
- [ ] Map all file-system paths the script touches and confirm no data-loss operations without backup
- [ ] Check every `systemctl` call — would restarting this service cause downtime for dependent services?
- [ ] Verify no `rm -rf`, `dd`, `truncate`, or filesystem resize operations without explicit user confirmation
- [ ] Confirm all network ports the script opens are within the approved range and documented
- [ ] Check resource consumption estimates against host capacity (disk space, memory, CPU)
- [ ] Validate that the script runs under a dedicated service account, not root, unless explicitly required

---

## When to Use

Use this skill when:

- **Deploying automation scripts on production hosts** — Any script that modifies system state, restarts services, or changes configurations
- **Reviewing third-party or vendor scripts** — Evaluating scripts from external sources before running them on your infrastructure
- **Implementing CI/CD pipeline steps that touch production systems** — Ensuring automated deployment steps don't disrupt running services
- **Auditing existing runbooks and playbooks** — Identifying risky operations in documented procedures
- **Preparing to run migration or upgrade scripts** — Systems undergoing version changes where downtime or data loss is unacceptable
- **Validating infrastructure-as-code changes before apply** — Terraform, Ansible, or Salt states that modify live systems

---

## When NOT to Use

Avoid this skill for:

- **Local development or sandbox environments** — Where no availability risk exists, standard testing is sufficient
- **Read-only inspection commands** — `systemctl status`, `journalctl`, `df`, `free` do not modify system state
- **One-time setup on disposable infrastructure** — Where the entire VM/container is ephemeral and can be discarded
- **Network packet capture or passive monitoring** — Tools like `tcpdump` or `ss` that observe without modifying

Use `linux-service-integrity-operations` when the script is ready to execute and you need safe restart patterns and health monitoring during the change.

---

## Core Workflow

### 1. Parse Script for Dangerous Operations

Identify all operations that modify system state. Build an inventory of every file, service, and network endpoint the script touches.

```bash
#!/usr/bin/env bash
# preflight_audit.sh — Analyze a deployment script for availability risks
# Usage: ./preflight_audit.sh <script.sh>
set -euo pipefail

readonly DANGEROUS_PATTERNS=(
    'systemctl\s+(restart|stop|reload|kill)'
    'rm\s+(-rf|--no-preserve-root)'
    'dd\s+of='
    'truncate\s+-s\s+0'
    'mkfs\.'
    'lvremove|lvreduce|vgremove'
    'iptables|nftables\s+-F'
    'modprobe|insmod|rmmod'
    'fallocate|truncate\s+-s'
    'curl|wget.*\|.*bash|sh\s*-'
    'chattr\s+-i'
    'umount'
    'swapoff'
)

readonly DANGEROUS_PATTERNS_NAMES=(
    'service_restart' 'destructive_rm' 'disk_write' 'file_truncate'
    'filesystem_create' 'lv_destruction' 'firewall_flush' 'kernel_module'
    'disk_allocation' 'pipe_risk' 'attr_remove' 'unmount' 'swap_disable'
)

audit_script() {
    local script_file="$1"
    local risk_level="LOW"
    local findings=()
    local service_ops=()
    local file_ops=()
    local resource_risks=()

    if [[ ! -f "$script_file" ]]; then
        echo "ERROR: Script not found: $script_file" >&2
        return 1
    fi

    echo "=== Pre-flight Audit: $(basename "$script_file") ==="
    echo "File: $script_file"
    echo "Size: $(wc -c < "$script_file") bytes"
    echo ""

    # Check for safety patterns
    if ! grep -q 'set -euo pipefail' "$script_file"; then
        findings+=("CRITICAL: Missing 'set -euo pipefail' — unhandled errors will cascade")
        risk_level="CRITICAL"
    fi

    if ! grep -qE '^\s*(set|trap)' "$script_file"; then
        findings+=("WARNING: No error trapping or set flags — failures may go undetected")
    fi

    # Check dangerous operations
    for i in "${!DANGEROUS_PATTERNS[@]}"; do
        if grep -qE "${DANGEROUS_PATTERNS[$i]}" "$script_file"; then
            local matches
            matches=$(grep -cE "${DANGEROUS_PATTERNS[$i]}" "$script_file")
            findings+=("HIGH: ${DANGEROUS_PATTERNS_NAMES[$i]} detected — ${matches} occurrence(s)")
            risk_level="HIGH"
        fi
    done

    # Check for hard-coded credentials
    if grep -qiE '(password|secret|key|token)\s*=\s*["\x27]' "$script_file"; then
        findings+=("CRITICAL: Hard-coded credentials detected in script")
        risk_level="CRITICAL"
    fi

    # Map systemctl operations
    while IFS= read -r line; do
        service_ops+=("$line")
    done < <(grep -nE 'systemctl\s+(restart|stop|reload|kill|disable|enable)' "$script_file" 2>/dev/null || true)

    if [[ ${#service_ops[@]} -gt 0 ]]; then
        echo ""
        echo "=== Service Impact Analysis ==="
        for op in "${service_ops[@]}"; do
            local svc_name
            svc_name=$(echo "$op" | grep -oE '[a-zA-Z0-9_-]+\.service' || echo "unknown service")
            echo "  [${op}] → Service: $svc_name"
        done
    fi

    echo ""
    echo "=== Risk Assessment ==="
    echo "Overall risk: $risk_level"
    echo "Findings: ${#findings[@]}"
    for finding in "${findings[@]}"; do
        echo "  • $finding"
    done

    echo ""
    echo "=== Recommendations ==="
    if [[ "$risk_level" == "CRITICAL" ]]; then
        echo "  • DO NOT run this script in production without remediation"
        echo "  • Address all CRITICAL findings before proceeding"
        echo "  • Obtain approval from on-call engineer"
    elif [[ "$risk_level" == "HIGH" ]]; then
        echo "  • Review all HIGH findings before execution"
        echo "  • Schedule during maintenance window"
        echo "  • Ensure rollback procedure is ready"
    else
        echo "  • Standard change process applies"
        echo "  • Ensure monitoring is active during execution"
    fi
}

audit_script "${1:?Usage: $0 <script.sh>}"
```

**Checkpoint:** All dangerous operations are identified and catalogued. No CRITICAL findings remain unresolved.

### 2. Map Service Dependencies

Determine what other services depend on any service this script will restart or modify. Use `systemctl list-dependencies` to map the full dependency tree.

```bash
#!/usr/bin/env bash
# service_dependency_map.sh — Map full dependency impact before restarting a service
# Usage: ./service_dependency_map.sh <service.service>
set -euo pipefail

map_dependencies() {
    local target_service="$1"

    if ! systemctl list-unit-files "${target_service}" &>/dev/null; then
        echo "ERROR: Service '${target_service}' not found" >&2
        return 1
    fi

    echo "=== Dependency Impact Analysis: ${target_service} ==="
    echo ""

    # Upstream dependencies — what must be running for this service to work
    echo "--- Upstream Dependencies (Required Before Restart) ---"
    systemctl list-dependencies --reverse "${target_service}" --no-pager 2>/dev/null | \
        sed 's/├── /  /; s/└── /  /; s/│   /  /' | \
        grep -v 'list-dependencies' || echo "  (none)"
    echo ""

    # Downstream dependents — what breaks if this service restarts
    echo "--- Downstream Dependents (At Risk During Restart) ---"
    systemctl list-dependencies "${target_service}" --no-pager 2>/dev/null | \
        sed 's/├── /  /; s/└── /  /; s/│   /  /' | \
        grep -v 'list-dependencies' || echo "  (none)"
    echo ""

    # Check for network ports that would be briefly unavailable
    echo "--- Network Port Impact ---"
    local socket_unit
    socket_unit=$(systemctl cat "${target_service}" 2>/dev/null | grep -E '^ListenStream|^ListenDatagram' || true)
    if [[ -n "$socket_unit" ]]; then
        echo "  Socket activations detected:"
        echo "$socket_unit" | while IFS= read -r line; do
            echo "    $line"
        done
    fi

    # Check if this is a core infrastructure service
    local critical_services=(
        "systemd-journald" "systemd-logind" "dbus" "NetworkManager"
        "sshd" "cron" "systemd-timesyncd" "containerd" "docker"
        "polkit" "udev" "runit"
    )

    for crit in "${critical_services[@]}"; do
        if [[ "$target_service" == "${crit}.service" || "$target_service" == "${crit}.timer" ]]; then
            echo ""
            echo "  ⚠ CRITICAL: '${target_service}' is a core infrastructure service"
            echo "  ⚠ Restart may cause brief system-wide instability"
            echo "  ⚠ Use 'systemctl reload' instead of 'restart' where possible"
            echo "  ⚠ Ensure remote access is available via console/serial before proceeding"
            break
        fi
    done

    # Check for OnFailure handlers
    local failure_handler
    failure_handler=$(systemctl cat "${target_service}" 2>/dev/null | grep '^OnFailure=' || true)
    if [[ -n "$failure_handler" ]]; then
        echo ""
        echo "--- Cascade Failure Risk ---"
        echo "  OnFailure handler: $failure_handler"
        echo "  If this service fails to restart, $failure_handler will be triggered"
    fi
}

map_dependencies "${1:?Usage: $0 <service.service>}"
```

**Checkpoint:** Full dependency tree is mapped. No core infrastructure services are targeted for restart without console access.

### 3. Verify Resource Headroom

Confirm the host has sufficient disk space, memory, and CPU headroom for the script's expected workload.

```bash
#!/usr/bin/env bash
# resource_headroom.sh — Verify host has sufficient resources before running a script
# Usage: ./resource_headroom.sh <script.sh>
set -euo pipefail

check_resource_headroom() {
    local script_file="$1"

    echo "=== Resource Headroom Check ==="
    echo ""

    # Disk space analysis
    echo "--- Disk Space ---"
    local disk_usage
    disk_usage=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
    local disk_free
    disk_free=$(df -h / | awk 'NR==2 {print $4}')

    if [[ "$disk_usage" -gt 90 ]]; then
        echo "  ⚠ CRITICAL: Root filesystem at ${disk_usage}% — script may fail"
        echo "  ⚠ Free space: $disk_free"
    elif [[ "$disk_usage" -gt 80 ]]; then
        echo "  WARNING: Root filesystem at ${disk_usage}% — tight on space"
        echo "  Free space: $disk_free"
    else
        echo "  OK: Root filesystem at ${disk_usage}% — sufficient space"
        echo "  Free space: $disk_free"
    fi

    # Check if script creates/extends any files
    local estimated_disk
    estimated_disk=$(grep -oE '(truncate\s+-s\s+(\d+[kmgKMG])?)|(dd\s+.*count=\d+)|(mkfs|fdisk)' "$script_file" 2>/dev/null || true)
    if [[ -n "$estimated_disk" ]]; then
        echo "  ⚠ Script contains disk-extending operations"
        echo "  Operations: $estimated_disk"
    fi
    echo ""

    # Memory analysis
    echo "--- Memory ---"
    local mem_total
    mem_total=$(grep MemTotal /proc/meminfo | awk '{print int($2/1024)}')
    local mem_available
    mem_available=$(grep MemAvailable /proc/meminfo | awk '{print int($2/1024)}')
    local mem_used_pct
    mem_used_pct=$(awk "BEGIN {printf \"%d\", (1 - $mem_available / $mem_total) * 100}")

    if [[ "$mem_used_pct" -gt 90 ]]; then
        echo "  ⚠ CRITICAL: Memory at ${mem_used_pct}% — ($mem_available MB available of ${mem_total} MB)"
    elif [[ "$mem_used_pct" -gt 80 ]]; then
        echo "  WARNING: Memory at ${mem_used_pct}% — ($mem_available MB available of ${mem_total} MB)"
    else
        echo "  OK: Memory at ${mem_used_pct}% — ($mem_available MB available of ${mem_total} MB)"
    fi
    echo ""

    # CPU load check
    echo "--- CPU Load ---"
    local load_avg
    load_avg=$(cat /proc/loadavg | awk '{print $1}')
    local cpu_count
    cpu_count=$(nproc)
    local load_ratio
    load_ratio=$(awk "BEGIN {printf \"%.2f\", $load_avg / $cpu_count}")

    if awk "BEGIN {exit !($load_ratio > 2.0)}"; then
        echo "  ⚠ WARNING: Load ratio ${load_ratio}x CPU count — consider delaying execution"
    else
        echo "  OK: Load ratio ${load_ratio}x CPU count (${load_avg} on ${cpu_count} CPUs)"
    fi
    echo ""

    # File descriptor check
    echo "--- File Descriptors ---"
    local fd_limit
    fd_limit=$(ulimit -n)
    local fd_used
    fd_used=$(ls /proc/$$/fd 2>/dev/null | wc -l)

    if [[ "$fd_limit" -lt 1024 ]]; then
        echo "  WARNING: File descriptor limit is low ($fd_limit)"
    else
        echo "  OK: FD limit $fd_limit, currently used $fd_used"
    fi
}

check_resource_headroom "${1:?Usage: $0 <script.sh>}"
```

**Checkpoint:** All resource metrics are within acceptable thresholds. No CRITICAL findings.

### 4. Generate Risk Assessment Report

Produce a structured summary of all findings, risk level, and required approvals before execution.

```python
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional
from datetime import datetime


class RiskLevel(Enum):
    SAFE = "SAFE"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


@dataclass
class ScriptFinding:
    """A single finding from pre-flight script analysis."""
    severity: str  # CRITICAL, HIGH, WARNING, INFO
    category: str  # error_handling, dangerous_op, service_impact, etc.
    message: str
    line_number: Optional[int] = None
    remediation: str = ""


@dataclass
class RiskAssessment:
    """Structured pre-flight risk assessment for a Linux automation script."""
    script_path: str
    risk_level: RiskLevel
    findings: list = field(default_factory=list)
    service_impacts: list = field(default_factory=list)
    resource_risks: list = field(default_factory=list)
    requires_approval: bool = False
    recommended_window: str = ""

    def add_finding(self, severity: str, category: str, message: str,
                    line_number: Optional[int] = None, remediation: str = ""):
        self.findings.append(ScriptFinding(severity, category, message, line_number, remediation))
        if severity == "CRITICAL":
            self.risk_level = RiskLevel.CRITICAL
            self.requires_approval = True
        elif severity == "HIGH" and self.risk_level not in (RiskLevel.CRITICAL,):
            self.risk_level = RiskLevel.HIGH
            self.requires_approval = True

    def to_report(self) -> str:
        """Generate a human-readable risk assessment report."""
        lines = [
            f"=== Pre-Flight Risk Assessment ===",
            f"Script: {self.script_path}",
            f"Risk Level: {self.risk_level.value}",
            f"Timestamp: {datetime.now().isoformat()}",
            f"Requires Approval: {'YES' if self.requires_approval else 'No'}",
            f"",
            f"--- Findings ({len(self.findings)}) ---",
        ]

        for f in self.findings:
            prefix = "🔴" if f.severity == "CRITICAL" else "🟡" if f.severity == "HIGH" else "🔵" if f.severity == "WARNING" else "ℹ️"
            line = f"  {prefix} [{f.severity}] {f.category}: {f.message}"
            if f.line_number:
                line += f" (line {f.line_number})"
            if f.remediation:
                line += f"\n     → {f.remediation}"
            lines.append(line)

        if self.service_impacts:
            lines.append("")
            lines.append("--- Service Impact ---")
            for imp in self.service_impacts:
                lines.append(f"  • {imp}")

        lines.append("")
        lines.append("--- Execution Recommendation ---")
        if self.risk_level == RiskLevel.CRITICAL:
            lines.append("  DO NOT EXECUTE without remediation and approval.")
        elif self.risk_level == RiskLevel.HIGH:
            lines.append("  Schedule during maintenance window. Ensure rollback is ready.")
        elif self.risk_level == RiskLevel.MEDIUM:
            lines.append("  Standard change process applies. Monitor closely.")
        else:
            lines.append("  Low risk. Standard execution procedure applies.")

        return "\n".join(lines)


def assess_script_risk(
    script_path: str,
    dangerous_ops: Optional[list[str]] = None
) -> RiskAssessment:
    """Perform a pre-flight risk assessment on a shell script.

    Analyzes the script for error handling, dangerous operations,
    service dependencies, and resource consumption risks.

    Args:
        script_path: Path to the shell script to analyze
        dangerous_ops: Optional list of additional dangerous patterns to check

    Returns:
        RiskAssessment with all findings and risk level

    Raises:
        FileNotFoundError: If script_path does not exist
        PermissionError: If script_path is not readable
    """
    import os
    import re

    if not os.path.isfile(script_path):
        raise FileNotFoundError(f"Script not found: {script_path}")
    if not os.access(script_path, os.R_OK):
        raise PermissionError(f"Script not readable: {script_path}")

    assessment = RiskAssessment(script_path=script_path)
    content = open(script_path).read()
    lines = content.splitlines()

    default_dangerous = [
        ("systemctl\\s+(restart|stop|reload|kill)", "service_restart"),
        ("rm\\s+(-rf|--no-preserve-root)", "destructive_rm"),
        ("(dd\\s+of=|truncate\\s+-s\\s+0)", "disk_write"),
        ("(iptables|nftables)\\s+-F", "firewall_flush"),
        ("(modprobe|insmod|rmmod)", "kernel_module"),
        ("curl.*\\|.*bash", "pipe_risk"),
    ]

    patterns = dangerous_ops or default_dangerous

    for i, line in enumerate(lines, start=1):
        for pattern, category in patterns:
            if re.search(pattern, line):
                assessment.add_finding(
                    severity="HIGH" if "restart" in category else "CRITICAL",
                    category=category,
                    message=f"Dangerous operation in line {i}: {line.strip()}",
                    line_number=i,
                    remediation=f"Add --dry-run support and rollback before this operation"
                )

        # Check for credential patterns
        if re.search(r'(password|secret|token)\s*=\s*["\'][^\s"\']', line, re.IGNORECASE):
            assessment.add_finding(
                severity="CRITICAL",
                category="credential_exposure",
                message=f"Hard-coded credential detected",
                line_number=i,
                remediation="Move to environment variable or secrets manager"
            )

    # Check error handling
    if "set -euo pipefail" not in content:
        assessment.add_finding(
            severity="CRITICAL",
            category="error_handling",
            message="Missing 'set -euo pipefail' — unhandled errors will cascade",
            remediation="Add 'set -euo pipefail' as the second line of the script"
        )

    if "trap" not in content and "set -E" not in content:
        assessment.add_finding(
            severity="WARNING",
            category="error_handling",
            message="No error trapping configured",
            remediation="Add 'trap cleanup EXIT ERR INT TERM' handler"
        )

    return assessment
```

**Checkpoint:** Risk assessment report is generated. All CRITICAL findings have remediation steps. Approval decision is documented.

---

## Implementation Patterns

### Pattern 1: Safe File Operation Wrapper

**BAD — Unsafe file operations with no validation**

```bash
#!/bin/bash
# ❌ BAD: No error handling, no backup, no validation
deploy_config() {
    cp /tmp/new-config.conf /etc/myapp/config.conf
    systemctl restart myapp
    echo "Deployed successfully"
}

# Problems:
# - If cp fails, the old config is replaced with nothing (data loss)
# - If restart fails, service is down with no recovery
# - No backup of original config
# - No post-deploy health check
```

**GOOD — Safe file operations with validation and rollback**

```bash
#!/usr/bin/env bash
# ✅ GOOD: Safe deploy with backup, validation, and rollback
set -euo pipefail

readonly APP_NAME="myapp"
readonly APP_DIR="/etc/${APP_NAME}"
readonly BACKUP_DIR="${APP_DIR}/.backups"
readonly CONFIG_FILE="${APP_DIR}/config.conf"

deploy_config() {
    local source_file="${1:?Usage: deploy_config <new-config.conf>}"
    local deploy_timestamp
    deploy_timestamp="$(date +%Y%m%dT%H%M%S)"

    # Validate source exists and is readable
    [[ -f "$source_file" ]] && [[ -r "$source_file" ]] || {
        echo "ERROR: Source config not found or not readable: $source_file" >&2
        return 1
    }

    # Validate destination directory exists
    [[ -d "$APP_DIR" ]] || {
        echo "ERROR: Application directory does not exist: $APP_DIR" >&2
        return 1
    }

    # Backup current config
    mkdir -p "$BACKUP_DIR"
    local backup_file="${BACKUP_DIR}/config.conf.${deploy_timestamp}"
    cp -a "$CONFIG_FILE" "$backup_file"
    echo "Backed up config to $backup_file"

    # Validate new config syntax before deploying
    if command -v "${APP_NAME}-ctl" &>/dev/null; then
        if ! "${APP_NAME}-ctl" validate-config "$source_file" 2>/dev/null; then
            echo "ERROR: New config failed syntax validation" >&2
            echo "Restoring backup..."
            cp -a "$backup_file" "$CONFIG_FILE"
            return 1
        fi
    fi

    # Deploy with correct ownership
    cp "$source_file" "${CONFIG_FILE}"
    chown root:root "$CONFIG_FILE"
    chmod 644 "$CONFIG_FILE"

    # Reload service (prefer reload over restart to minimize disruption)
    if systemctl reload "${APP_NAME}" &>/dev/null; then
        echo "Service reloaded successfully"
    elif systemctl restart "${APP_NAME}" &>/dev/null; then
        echo "Service restarted (reload unavailable)"
    else
        echo "ERROR: Failed to reload/restart ${APP_NAME}" >&2
        echo "Restoring backup..."
        cp -a "$backup_file" "$CONFIG_FILE"
        echo "Config restored. Contact operations team."
        return 1
    fi

    # Health check after deploy
    sleep 2
    if systemctl is-active --quiet "${APP_NAME}"; then
        echo "Post-deploy health check passed"
        return 0
    else
        echo "ERROR: Health check failed after deploy" >&2
        echo "Restoring backup and stopping service..."
        cp -a "$backup_file" "$CONFIG_FILE"
        systemctl restart "${APP_NAME}"
        return 1
    fi
}

deploy_config "${1:?Usage: $0 <new-config.conf>}"
```

### Pattern 2: Pre-flight Script Executor with Dry-Run

**Bash — Safe execution framework with dry-run and rollback support**

```bash
#!/usr/bin/env bash
# safe_script_executor.sh — Execute scripts with pre-flight validation and rollback
# Usage: ./safe_script_executor.sh [--dry-run] [--timeout 300] <script.sh>
set -euo pipefail

DRY_RUN=false
TIMEOUT=300
SCRIPT_PATH=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --dry-run) DRY_RUN=true; shift ;;
        --timeout) TIMEOUT="$2"; shift 2 ;;
        *) SCRIPT_PATH="$1"; shift ;;
    esac
done

if [[ -z "$SCRIPT_PATH" ]]; then
    echo "Usage: $0 [--dry-run] [--timeout N] <script.sh>" >&2
    exit 1
fi

# Create a rollback snapshot if this is a live run
ROLLBACK_SNAPSHOT=""
create_rollback_snapshot() {
    ROLLBACK_SNAPSHOT=$(mktemp -d "/tmp/safe-exec-rollback.XXXXXX")

    # Snapshot mounted filesystems (only those we can safely snapshot)
    for mount_point in /etc /var/lib /opt; do
        if [[ -d "$mount_point" ]]; then
            echo "  Snapshotting: $mount_point"
            rsync -a --delete "$mount_point/" "${ROLLBACK_SNAPSHOT}${mount_point}/" 2>/dev/null || true
        fi
    done

    # Snapshot systemd service states
    systemctl list-unit-files --state=enabled --no-pager 2>/dev/null | \
        awk 'NR>1 {print $1}' > "${ROLLBACK_SNAPSHOT}/enabled-services.txt"

    echo "Rollback snapshot created: $ROLLBACK_SNAPSHOT"
}

rollback() {
    if [[ -z "$ROLLBACK_SNAPSHOT" ]]; then
        echo "WARNING: No rollback snapshot available" >&2
        return 1
    fi

    echo "=== Executing Rollback ==="

    # Restore configuration directories
    for target in /etc /var/lib /opt; do
        if [[ -d "${ROLLBACK_SNAPSHOT}${target}" ]]; then
            echo "  Restoring: $target"
            rsync -a "${ROLLBACK_SNAPSHOT}${target}/" "$target/" 2>/dev/null || true
        fi
    done

    echo "Rollback complete. Snapshot available at: $ROLLBACK_SNAPSHOT"
    echo "Review differences with: diff -r $target ${ROLLBACK_SNAPSHOT}${target}"
}

trap rollback ERR

# Pre-flight checks
echo "=== Pre-flight Checks ==="
echo "Script: $SCRIPT_PATH"
echo "Dry-run: $DRY_RUN"
echo "Timeout: ${TIMEOUT}s"
echo ""

# Check script exists and is readable
if [[ ! -f "$SCRIPT_PATH" ]]; then
    echo "ERROR: Script not found: $SCRIPT_PATH" >&2
    exit 1
fi
if [[ ! -r "$SCRIPT_PATH" ]]; then
    echo "ERROR: Script not readable: $SCRIPT_PATH" >&2
    exit 1
fi

# Run the preflight audit if available
if command -v ./preflight_audit.sh &>/dev/null; then
    echo "Running preflight audit..."
    ./preflight_audit.sh "$SCRIPT_PATH" || echo "WARNING: Preflight audit had findings — review above"
    echo ""
fi

# Create rollback snapshot for live runs
if [[ "$DRY_RUN" != "true" ]]; then
    create_rollback_snapshot
    echo ""
    echo "WARNING: This is a LIVE run. A rollback snapshot has been created."
    echo "Press Ctrl+C within 5 seconds to cancel..."
    sleep 5
else
    echo "DRY RUN mode — no changes will be made. No rollback needed."
    echo ""
fi

# Execute the script with timeout
echo "=== Executing Script ==="
if [[ "$DRY_RUN" == "true" ]]; then
    bash -n "$SCRIPT_PATH" && echo "Syntax check passed" || {
        echo "ERROR: Script has syntax errors" >&2
        exit 1
    }
    echo "DRY RUN: Would execute: bash \"$SCRIPT_PATH\""
else
    bash "$SCRIPT_PATH" &
    SCRIPT_PID=$!

    # Monitor with timeout
    (
        sleep "$TIMEOUT"
        if kill -0 "$SCRIPT_PID" 2>/dev/null; then
            echo "ERROR: Script exceeded ${TIMEOUT}s timeout — killing" >&2
            kill -TERM "$SCRIPT_PID" 2>/dev/null || true
            sleep 5
            kill -9 "$SCRIPT_PID" 2>/dev/null || true
            exit 1
        fi
    ) &
    MONITOR_PID=$!

    wait "$SCRIPT_PID"
    EXEC_EXIT=$?

    # Kill the monitor
    kill "$MONITOR_PID" 2>/dev/null || true
    wait "$MONITOR_PID" 2>/dev/null || true

    if [[ $EXEC_EXIT -ne 0 ]]; then
        echo "ERROR: Script exited with code $EXEC_EXIT" >&2
        echo "Rollback has been triggered automatically."
        exit 1
    fi

    echo "Script completed successfully"
fi

# Cleanup rollback on success
if [[ -n "$ROLLBACK_SNAPSHOT" && $EXEC_EXIT -eq 0 ]]; then
    rm -rf "$ROLLBACK_SNAPSHOT"
    echo "Rollback snapshot cleaned up (deployment succeeded)"
fi

echo "=== Execution Complete ==="
```

---

## Constraints

### MUST DO

- **MUST** require `set -euo pipefail` in all scripts before approving execution — scripts without it are unconditionally rejected
- **MUST** map every service restart to its full dependency tree using `systemctl list-dependencies` before approving
- **MUST** create a rollback snapshot or backup before any operation that modifies filesystem state on a running production host
- **MUST** verify disk space and memory headroom before executing scripts that modify data or launch new processes
- **MUST** use `systemctl reload` instead of `systemctl restart` wherever the service supports graceful reload
- **MUST** run a post-execution health check after every service restart — never assume the service started correctly
- **MUST** validate new configuration files with the application's native validation command before deploying them
- **MUST** implement a timeout wrapper around every script execution to prevent hung processes from blocking the host

### MUST NOT DO

- **MUST NOT** run `rm -rf` or any destructive file operation on a production host without an explicit `--yes` flag and manual confirmation
- **MUST NOT** restart `systemd-journald`, `dbus`, or `udev` on a running system — these can cause cascading failures
- **MUST NOT** flush firewall rules (`iptables -F` or `nft flush ruleset`) without immediately restoring the allow rules
- **MUST NOT** run scripts as root when a dedicated service account can perform the task
- **MUST NOT** pipe remote data directly into a shell (`curl URL | bash`) — download, verify checksum, then execute
- **MUST NOT** skip the pre-flight audit step regardless of script size or perceived trust level
- **MUST NOT** hard-code credentials in scripts — use environment variables, systemd `EnvironmentFile`, or a secrets manager

---

## Output Template

When applying this skill, produce:

1. **Risk Assessment Summary** — Risk level (SAFE/LOW/MEDIUM/HIGH/CRITICAL), total findings count, and whether approval is required
2. **Dangerous Operations Inventory** — Every file-system, service, and network operation the script performs, with line numbers and severity
3. **Service Dependency Map** — For every service the script restarts: upstream dependencies and downstream dependents
4. **Resource Headroom Report** — Current disk, memory, and CPU metrics with pass/fail against safety thresholds
5. **Execution Decision** — Clear recommendation: approved, approved-with-caveats, or blocked, with justification
6. **Rollback Plan** — Specific rollback steps and snapshot location if execution fails or causes unexpected disruption

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `linux-service-integrity-operations` | Execute changes without service interruption — use after pre-flight validation passes |
| `linux-security` | Validate that the script doesn't introduce security regressions (permissions, MAC policies) |
| `linux-services` | Understand systemd unit file structure and dependency ordering for accurate impact analysis |
| `networking` | Check network port allocations and firewall implications of the script's operations |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Bash Reference Manual — Error Handling](https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html)
- [systemctl Documentation](https://www.freedesktop.org/software/systemd/man/latest/systemctl.html)
- [Systemd Service Manager — Security](https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html)
- [Linux Foundation — Safe Scripting Practices](https://www.linuxfoundation.org/research/scripting)
- [GNU coreutils — Safe File Operations](https://www.gnu.org/software/coreutils/manual/html_node/file-operation-options.html)
- [rsync Documentation](https://rsync.samba.org/documentation.html)
- [procps-ng — Linux Memory and Resource Info](https://wiki.ubuntu.com/Kernel/Reference/uptime)
