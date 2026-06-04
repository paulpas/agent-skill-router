---
name: linux-services
description: Manages Linux services with systemd for reliable operation, dependency
  ordering, resource isolation, and automated recovery in cloud and on-prem environments.
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
  triggers: systemd, service management, unit file, service restart, socket activation,
    systemd timer, journal, service dependency
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: resource-management, linux-security, hardware-provisioning
  maturity: stable
  completeness: 95
  exampleCount: 3
---
# Linux Service Management with systemd

Infrastructure engineer managing Linux services with systemd for reliable operation, dependency ordering, resource isolation, and automated recovery in cloud and on-prem environments.

## TL;DR Checklist

- [ ] Write proper systemd unit files with correct type, restart policy, and resource limits
- [ ] Configure service dependencies with After=, Wants=, and Requires= directives
- [ ] Set up socket activation for services that don't need to be running constantly
- [ ] Configure journal logging with appropriate retention and forwarding
- [ ] Set up systemd timers for scheduled tasks instead of cron where possible
- [ ] Verify service health with health checks and OnFailure handlers
- [ ] Configure resource limits in unit files (CPU, memory, I/O)
- [ ] Test service failure and recovery with manual stop/start cycles

---

## When to Use

Use this skill when:

- **Creating new systemd services** — You're deploying an application that needs to run as a managed system service
- **Fixing service dependency issues** — Services are starting in the wrong order or failing due to missing dependencies
- **Implementing socket activation** — You want to reduce startup time and resource usage by activating services on demand
- **Configuring scheduled tasks** — You prefer systemd timers over cron for system-integrated scheduling
- **Managing service lifecycle** — You need reliable restart policies, resource limits, and automatic recovery for production workloads
- **Troubleshooting service failures** — A service is crashing, not starting, or failing health checks

---

## When NOT to Use

Avoid this skill for:

- **Container-based deployments** — Use container orchestration (Docker Compose, Kubernetes) instead of systemd for container management
- **One-off script execution** — Use cron or at for simple scheduled tasks, not systemd timers
- **Long-running daemons managed by supervisor** — If you already use supervisord or similar process managers, don't migrate to systemd without clear benefit
- **Batch jobs with complex error handling** — Use dedicated job schedulers (Celery, Airflow) instead of systemd for complex workflows

Use `resource-management` when you need deeper resource isolation beyond systemd's built-in cgroup support. Use `observability` for setting up monitoring and alerting for service health.

---

## Core Workflow

### 1. Write Systemd Unit Files

Create properly structured unit files for service management.

```ini
# /etc/systemd/system/myapp.service
[Unit]
Description=My Application Service
Documentation=https://example.com/docs
After=network.target postgresql.service
Wants=network-online.target
Requires=postgresql.service

[Service]
Type=notify
User=myapp
Group=myapp

# Execution
ExecStart=/opt/myapp/bin/server --config /etc/myapp/config.yaml
ExecReload=/bin/kill -HUP $MAINPID
ExecStop=/opt/myapp/bin/server --shutdown

# Restart and recovery
Restart=on-failure
RestartSec=5s
StartLimitIntervalSec=300
StartLimitBurst=5
OnFailure=emergency.service

# Environment
Environment=APP_ENV=production
EnvironmentFile=/etc/myapp/env

# Resource limits (cgroups)
CPUQuota=200%
MemoryMax=4G
MemoryHigh=3G
IOWeight=500

# Security hardening
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/var/lib/myapp /var/log/myapp
PrivateTmp=yes
ProtectKernelTunables=yes
ProtectKernelModules=yes
ProtectControlGroups=yes
RestrictRealtime=yes
RestrictSUIDSGID=yes
RemoveIPC=yes
SystemCallFilter=@system-service
SystemCallArchitectures=native

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=myapp

# File descriptor limit
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

**Checkpoint:** Unit file is created with all required directives, reloaded with `systemctl daemon-reload`, and the service starts successfully.

### 2. Configure Dependency Ordering

Set up correct service start ordering with dependency directives.

```
Dependency Type    │ Directive       │ Behavior
─────────────────────────────────────────────────────────────
Must start after   │ After=X         │ Ordering only; service X doesn't need to be up
Must require       │ Requires=X      │ If X fails, this service stops too
Soft dependency    │ Wants=X         │ Try to start X, but don't fail if X is unavailable
Condition          │ ConditionPath   │ Only start if path exists/doesn't exist
                   │ Exists=...      │
                   │ Condition       │
                   │ FileExists=...  │
```

```ini
# /etc/systemd/system/webapp.service
[Unit]
Description=Web Application
# Strong dependencies — app cannot function without these
After=network.target postgresql.service redis.service
Requires=postgresql.service

# Soft dependency — app works without cache but prefers it
Wants=redis.service

# Conditional: only start if config exists
ConditionPathExists=/etc/webapp/config.yaml

[Service]
# ... service configuration ...
```

**Checkpoint:** Service starts in correct order. All hard dependencies are satisfied before the service starts. `systemctl list-dependencies myapp.service` shows correct tree.

### 3. Configure Socket Activation

Use socket activation for services that don't need to run constantly.

```ini
# /etc/systemd/system/myapp.socket
[Unit]
Description=My Application Socket

[Socket]
ListenStream=8443
Accept=no

# Security
SocketUser=myapp
SocketGroup=myapp
SocketMode=0660

# Backlog
Backlog=128

# Free resources when idle
IdleExitTimeout=60

[Install]
WantedBy=sockets.target

# /etc/systemd/system/myapp@.service
# Note the @ — template unit for accepting connections
[Unit]
Description=My Application Service Instance
Requires=myapp.socket
After=myapp.socket

[Service]
Type=notify
User=myapp
Group=myapp
ExecStart=/opt/myapp/bin/server --config /etc/myapp/config.yaml --socket $LISTEN_FDS

# Inherit socket from parent
ExecStartPre=-/usr/bin/mkdir -p /run/myapp
StandardInput=socket

[Install]
WantedBy=multi-user.target
```

**Checkpoint:** Socket is listening on the configured port. Service starts on first connection and stops after idle timeout. `systemctl status myapp.socket` shows active (listening).

### 4. Configure Journal and Logging

Set up journal logging with proper retention and forwarding.

```bash
# Journal configuration
cat > /etc/systemd/journald.conf << 'JOURNAL'
[Journal]
# Persistent storage
Storage=persistent

# Size limits
SystemMaxUse=500M
SystemKeepFree=1G
RuntimeMaxUse=100M

# Retention
MaxFileSec=1week
MaxForwardWatchdog=30sec

# Rate limiting
RateLimitInterval=30sec
RateLimitBurst=1000

# Compression
Compress=yes

# Forward to syslog (for legacy tools)
ForwardToSyslog=yes

# Syslog identification
SyslogIdentifier=myapp
JOURNAL

sudo systemctl restart systemd-journald

# Query journal for a specific service
journalctl -u myapp.service --since "1 hour ago" --no-pager
journalctl -u myapp.service --follow  # Live tail

# Filter by priority (emergency=0 to debug=7)
journalctl -u myapp.service -p warning --since today

# View with resources
journalctl -u myapp.service --output=json-pretty | jq '.[] | {timestamp: .__REALTIME_TIMESTAMP, message: .MESSAGE}'
```

**Checkpoint:** Journal storage is persistent, size limits prevent disk exhaustion, and log queries return expected results.

### 5. Configure Systemd Timers

Replace cron with systemd timers for better integration.

```ini
# /etc/systemd/system/myapp-cleanup.timer
[Unit]
Description=Run MyApp cleanup daily
Requires=myapp-cleanup.service

[Timer]
# Run daily at 2:30 AM
OnCalendar=*-*-* 02:30:00
# Also run 5 minutes after boot (one-time)
OnBootSec=5min

# Accuracy: allow 1-minute window for power saving
AccuracySec=1min

# Persistent: catch up on missed runs after downtime
Persistent=true

# Randomized delay to prevent thundering herd
RandomizedDelaySec=5min

[Install]
WantedBy=timers.target

# /etc/systemd/system/myapp-cleanup.service
[Unit]
Description=MyApp data cleanup task
After=network.target

[Service]
Type=oneshot
User=myapp
Group=myapp
ExecStart=/opt/myapp/bin/cleanup --full
TimeoutStartSec=3600

# Resource limits
MemoryMax=2G
CPUQuota=100%

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=myapp-cleanup
```

**Checkpoint:** Timer is enabled and scheduled. `systemctl list-timers --all` shows the timer with next trigger time. Manual trigger works: `systemctl start myapp-cleanup.service`.

### 6. Configure Health Checks and Recovery

Set up automatic recovery for service failures.

```ini
# /etc/systemd/system/myapp.service (with health checks)
[Unit]
Description=My Application Service
After=network.target postgresql.service

[Service]
Type=notify
User=myapp
ExecStart=/opt/myapp/bin/server

# Restart policy
Restart=on-failure
RestartSec=5s

# Health check with Watchdog
WatchdogSec=30
# Application must call sd_notify("WATCHDOG=1") every 30 seconds

# Failure handlers
OnFailure=emergency.service
OnSuccess=report-success.service

# Environment for health check
Environment=HEALTH_CHECK_PATH=/health
Environment=HEALTH_CHECK_PORT=8080

[Install]
WantedBy=multi-user.target

# /etc/systemd/system/report-success.service
[Unit]
Description=Report successful start
After=myapp.service

[Service]
Type=oneshot
ExecStart=/bin/bash -c 'curl -sf http://localhost:8080/health | jq . && logger "myapp started successfully"'
```

**Checkpoint:** Service restarts automatically on failure. Watchdog detects hung processes. OnFailure handler triggers for cascade prevention.

---

## Implementation Patterns

### Pattern 1: Service Types (BAD vs. GOOD)

**BAD — Using wrong service type**

```ini
# ❌ BAD: Using Type=simple for a service that notifies systemd
[Unit]
Description=My Application

[Service]
Type=simple
ExecStart=/opt/myapp/bin/server

# Problem: systemd considers the process "started" as soon as it forks.
# If the server takes 10 seconds to bind a port and report ready,
# dependent services will start before the app is actually ready.
# systemd has no way to know the service is not yet accepting connections.

# ❌ BAD: Using Type=forking for a modern service
# Problem: forking requires the process to explicitly fork() and exit
# the parent. Modern frameworks (Python uvicorn, Node, Go) don't fork.
# Using forking with a non-forking process causes systemd to think
# the service exited immediately.
```

**GOOD — Match service type to application behavior**

```ini
# ✅ GOOD: Type=notify for applications using sd_notify()
[Unit]
Description=My Application

[Service]
Type=notify
# Application calls sd_notify("READY=1") when ready
# Calls sd_notify("WATCHDOG=1") periodically
ExecStart=/opt/myapp/bin/server
WatchdogSec=30
Restart=on-failure
RestartSec=5s

# ✅ GOOD: Type=simple for processes that are the main process
[Unit]
Description=Simple Script Service

[Service]
Type=simple
# The ExecStart process IS the main process — systemd tracks it directly
ExecStart=/opt/scripts/monitor.sh
Restart=always
RestartSec=10s

# ✅ GOOD: Type=exec for wrapper scripts
[Unit]
Description=Wrapper Service

[Service]
Type=exec
# Starts a process group; systemd tracks the last process
ExecStartPre=/opt/scripts/prepare.sh
ExecStart=/opt/scripts/run.sh
```

### Pattern 2: Template Services for Multi-Instance Deployments

```ini
# /etc/systemd/system/myapp@.service
# Template unit — use myapp@instance1.service, myapp@instance2.service
[Unit]
Description=My Application Instance %i
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=notify
User=myapp
Group=myapp

# %i is the template instance name (e.g., "instance1")
Environment=APP_INSTANCE=%i
ExecStart=/opt/myapp/bin/server \
    --instance %i \
    --config /etc/myapp/%i/config.yaml \
    --port $((8443 + %i))

Restart=on-failure
RestartSec=5s
CPUQuota=100%
MemoryMax=2G

[Install]
WantedBy=multi-user.target
```

```bash
# Enable specific instances
sudo systemctl enable --now myapp@1.service
sudo systemctl enable --now myapp@2.service

# List all instances
systemctl list-units 'myapp@*'

# Stop all instances
systemctl stop 'myapp@*'
```

### Pattern 3: Cloud-Ready Service with Metadata Integration

**Bash — Generate cloud-ready systemd service**

```bash
#!/bin/bash
# Generate cloud-ready systemd service with cloud metadata awareness
# Usage: ./generate-cloud-service.sh <service-name> [exec-command] [instance-id] [region]

set -euo pipefail

SERVICE_NAME="${1:-webapp}"
EXEC_CMD="${2:-/opt/${SERVICE_NAME}/bin/server}"
INSTANCE_ID="${3:-$(curl -s -m 2 http://169.254.169.254/latest/meta-data/instance-id 2>/dev/null || echo 'unknown')}"
REGION="${4:-$(curl -s -m 2 http://169.254.169.254/latest/meta-data/placement/availability-zone 2>/dev/null | sed 's/[a-z]$//' || echo 'us-east-1')}"

SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

# Detect cloud provider
DETECT_PROVIDER() {
    if curl -s -m 2 http://169.254.169.254/latest/meta-data/instance-id 2>/dev/null | grep -q '^i-'; then
        echo "aws"
    elif curl -s -m 2 -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/name 2>/dev/null | grep -q .; then
        echo "gcp"
    elif curl -s -m 2 -H "Metadata-Severity: Interactive" "http://169.254.169.254/metadata/instance?api-version=2021-02-01" 2>/dev/null | grep -q '"compute"'; then
        echo "azure"
    else
        echo "bare-metal"
    fi
}

PROVIDER=$(DETECT_PROVIDER)
echo "Detected cloud provider: $PROVIDER"

# Generate systemd service file
cat > "$SERVICE_FILE" << EOF
[Unit]
Description=${SERVICE_NAME} on ${INSTANCE_ID} (${PROVIDER})
After=network.target
Documentation=https://example.com/docs/${SERVICE_NAME}
Wants=network-online.target

[Service]
Type=notify
User=${SERVICE_NAME}
Group=${SERVICE_NAME}

ExecStart=${EXEC_CMD}
Restart=on-failure
RestartSec=5s
WatchdogSec=30

# Resource limits
CPUQuota=200%
MemoryMax=4G
IOWeight=300

# Security
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/var/lib/${SERVICE_NAME} /var/log/${SERVICE_NAME}
PrivateTmp=yes
ProtectKernelTunables=yes
ProtectKernelModules=yes
ProtectControlGroups=yes
RestrictRealtime=yes
RestrictSUIDSGID=yes
RemoveIPC=yes
SystemCallFilter=@system-service
SystemCallArchitectures=native

# Environment
Environment=AWS_REGION=${REGION}
Environment=INSTANCE_ID=${INSTANCE_ID}
Environment=CLOUD_PROVIDER=${PROVIDER}
Environment=APP_ENV=production
Environment=LOG_LEVEL=info
Environment=METRICS_ENABLED=true

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=${SERVICE_NAME}

LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

# Generate journal configuration
JOURNAL_CONF="/etc/systemd/journald.d/${SERVICE_NAME}.conf"
mkdir -p /etc/systemd/journald.d
cat > "$JOURNAL_CONF" << EOF
[Journal]
Storage=persistent
SystemMaxUse=500M
MaxFileSec=1week
Compress=yes
ForwardToSyslog=yes
EOF

echo "Generated ${SERVICE_FILE}"
echo "Generated ${JOURNAL_CONF}"
echo ""
echo "Run: systemctl daemon-reload && systemctl enable --now ${SERVICE_NAME}"
```

---

## Constraints

### MUST DO

- **MUST** use `Type=notify` for applications that support sd_notify() — provides accurate readiness signaling to systemd
- **MUST** set `Restart=on-failure` for all production services — automatic recovery is essential for reliability
- **MUST** configure resource limits (CPU, memory, I/O) in unit files — prevents runaway processes from affecting the host
- **MUST** use dependency directives correctly: `After=` for ordering, `Requires=` for hard dependencies, `Wants=` for soft dependencies
- **MUST** set up journal logging with size limits — prevent disk exhaustion from unbounded log growth
- **MUST** use systemd timers over cron for system-integrated scheduling — better failure handling and dependency management
- **MUST** enable services with `systemctl enable` to persist across reboots

### MUST NOT DO

- **MUST NOT** use `systemctl disable` without a documented reason — every enabled service should have a documented purpose
- **MUST NOT** set `Restart=always` for services that should only restart on failure — `always` restarts even on explicit stop
- **MUST NOT** put sensitive data in Environment directives in unit files — use EnvironmentFile with restricted permissions instead
- **MUST NOT** use `Type=forking` for modern non-forking applications — it causes startup failures
- **MUST NOT** run services as root — create dedicated service accounts with minimum required privileges
- **MUST NOT** override journal default retention without justification — unbounded journal storage causes disk exhaustion
- **MUST NOT** use `OnFailure=halt.target` or `OnFailure=poweroff.target` in production — cascading failures kill the entire system

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `resource-management` | Configure resource limits and isolation for systemd services |
| `linux-security` | Harden systemd services with MAC policies and security directives |
| `hardware-provisioning` | Select hardware that matches service resource requirements |
| `observability` | Monitor systemd service health and set up alerting for failures |
| `kernel-tuning` | Tune kernel parameters that affect service behavior (file descriptors, OOM) |
