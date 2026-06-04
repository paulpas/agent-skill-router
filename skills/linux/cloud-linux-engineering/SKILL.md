---
name: cloud-linux-engineering
description: Engineers Linux systems for cloud-native environments with cloud-init
  bootstrapping, IMDSv2 security, ephemeral lifecycle management, spot instance handling,
  and cloud observability integration.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: linux
  triggers: cloud-init, IMDSv2, ephemeral instance, cloud metadata, spot instance,
    user-data, instance metadata, cloud observability, cloud SSH keys, instance lifecycle
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: infrastructure
  output-format: code
  content-types:
  - code
  - guidance
  - config
  - do-dont
  related-skills: linux-services, networking, resource-management, linux-security
  maturity: stable
  completeness: 95
  exampleCount: 6
---
# Cloud Linux Engineering

Senior infrastructure engineer designing and operating Linux systems specifically for cloud-native environments, focusing on ephemeral instance lifecycle, cloud-init bootstrapping, IMDSv2 security, and cloud-observable observability patterns.

## TL;DR Checklist

- [ ] Write cloud-init as idempotent modules (yaml), not shell scripts — re-runnable on every boot
- [ ] Enforce IMDSv2 (token-based metadata) — never rely on IMDSv1 (no-token HTTP)
- [ ] Design all instances for replacement, not repair — include graceful degradation in shutdown handlers
- [ ] Use cloud provider-agnostic patterns where possible, fall back to provider-specific APIs when needed
- [ ] Configure cloud observability (logs, metrics, traces) at boot via cloud-init user-data
- [ ] Handle spot/preemptible signals with graceful checkpointing and drain logic
- [ ] Manage SSH keys via cloud-init, not manual key distribution

---

## When to Use

Use this skill when:

- **Designing cloud instance bootstrapping** — You need to configure a cloud VM's initial state via cloud-init user-data
- **Hardening cloud metadata access** — You need to enforce IMDSv2 or restrict metadata API access on cloud instances
- **Building for ephemeral infrastructure** — You're designing instances that are meant to be replaced, not patched in-place
- **Handling spot/preemptible instances** — You need graceful shutdown, checkpointing, and drain logic for discounted cloud compute
- **Integrating cloud observability** — You need to ship logs, metrics, and traces to cloud-native monitoring at boot
- **Managing SSH keys at scale** — You need to distribute or rotate SSH keys across a fleet of cloud instances

---

## When NOT to Use

Avoid this skill for:

- **On-prem or bare-metal Linux setup** — Use `hardware-provisioning` and `linux-services` instead; cloud-init won't run
- **Configuring cloud VPC or networking at the infrastructure layer** — Use `networking` for bond/VLAN/firewall config; cloud networking is managed by the provider
- **Tuning kernel parameters** — Use `kernel-tuning` for TCP, cgroups, or filesystem tuning after the instance is running
- **Application-level deployment** — Use configuration management (Ansible, Salt, Chef) for application state; cloud-init handles only boot-time configuration
- **Persistent VM management** — If instances are long-lived and patched in-place, this skill's ephemeral patterns create unnecessary complexity

---

## Core Workflow

### 1. Design Cloud-Init User-Data

Write cloud-init configurations as YAML modules, prioritizing idempotency and re-runnability.

```bash
# Cloud-init user-data: idempotent YAML modules (not shell scripts)
# This runs on every boot — it must be safe to re-execute
cat > /var/lib/cloud/scripts/per-boot/idempotent-setup.sh << 'USERDATA'
#!/bin/bash
# cloud-init per-boot script — runs every boot, must be idempotent
set -euo pipefail

readonly LOG_FILE="/var/log/cloud-init-setup.log"
exec >>"${LOG_FILE}" 2>&1

# Example: ensure application user exists (idempotent)
if ! id "appuser" &>/dev/null; then
    useradd -r -s /usr/sbin/nologin -d /opt/app appuser
fi

# Example: ensure directory structure exists (idempotent)
mkdir -p /opt/app/{config,logs,data}
chown -R appuser:appuser /opt/app
chmod 750 /opt/app

# Example: deploy config only if it doesn't exist (idempotent)
if [[ ! -f /opt/app/config/settings.conf ]]; then
    cp /opt/app/config/settings.conf.default /opt/app/config/settings.conf
fi

echo "$(date -Iseconds) Boot script completed successfully"
USERDATA

chmod +x /var/lib/cloud/scripts/per-boot/idempotent-setup.sh
```

**Checkpoint:** Cloud-init user-data is YAML-based where possible, shell scripts are idempotent (safe to run multiple times), and all operations have guard clauses for existing state.

### 2. Enforce IMDSv2 (Token-Based Metadata)

Configure all instances to use IMDSv2 and validate token-based metadata access.

```bash
#!/bin/bash
# Enforce IMDSv2 on cloud instances
# This works on AWS, GCP, and Azure with provider-specific commands
set -euo pipefail

# --- AWS: Require IMDSv2 at the instance level ---
require_imds_v2_aws() {
    local instance_id
    instance_id=$(curl -s -m 2 -H "X-aws-ec2-metadata-token: $(curl -s -m 2 -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")" http://169.254.169.254/latest/meta-data/instance-id 2>/dev/null || echo "")

    if [[ -z "$instance_id" ]]; then
        echo "Not an AWS instance or IMDSv2 not enforced yet"
        return 1
    fi

    # Require tokens for metadata access (rejects IMDSv1)
    aws ec2 modify-instance-metadata-options \
        --instance-id "$instance_id" \
        --http-tokens required \
        --http-endpoint enabled

    echo "IMDSv2 enforced for instance: $instance_id"
}

# --- GCP: Metadata server already requires headers ---
require_imds_v2_gcp() {
    local metadata
    metadata=$(curl -s -m 2 \
        -H "Metadata-Flavor: Google" \
        http://metadata.google.internal/computeMetadata/v1/instance/name 2>/dev/null || echo "")

    if [[ -z "$metadata" ]]; then
        echo "Not a GCP instance"
        return 1
    fi

    echo "GCP instance detected: $metadata (metadata server already requires headers)"
    echo "GCP compute metadata API enforces Metadata-Flavor: Google header"
}

# --- Azure: Metadata requires header since API version 2019-02-01 ---
require_imds_v2_azure() {
    local metadata
    metadata=$(curl -s -m 2 \
        -H "Metadata-Severity: Interactive" \
        -H "Authorization: Bearer $(curl -s -m 2 -H 'Metadata-Severity: Interactive' 'http://169.254.169.254/metadata/instance?api-version=2021-02-01' | jq -r '.metadata' 2>/dev/null || echo 'token')" \
        "http://169.254.169.254/metadata/instance?api-version=2021-02-01" 2>/dev/null | jq -r '.compute.name' 2>/dev/null || echo "")

    if [[ -z "$metadata" ]]; then
        echo "Not an Azure instance"
        return 1
    fi

    echo "Azure instance detected: $metadata (metadata API requires header since 2019-02-01)"
}

# Detect provider and enforce
detect_provider() {
    if curl -s -m 2 -H "X-aws-ec2-metadata-token: test" http://169.254.169.254/latest/meta-data/instance-id 2>/dev/null | grep -q '^i-'; then
        echo "aws"
    elif curl -s -m 2 -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/name 2>/dev/null | grep -q '^'; then
        echo "gcp"
    elif curl -s -m 2 -H "Metadata-Severity: Interactive" http://169.254.169.254/metadata/instance?api-version=2021-02-01 2>/dev/null | grep -q '"compute"'; then
        echo "azure"
    else
        echo "bare-metal"
    fi
}

PROVIDER=$(detect_provider)
echo "Detected provider: $PROVIDER"

case "$PROVIDER" in
    aws) require_imds_v2_aws ;;
    gcp) require_imds_v2_gcp ;;
    azure) require_imds_v2_azure ;;
    bare-metal) echo "Bare metal — no cloud metadata API to enforce" ;;
esac

# --- Harden: Block IMDSv1 access at the host firewall level ---
# Only allow token-based metadata access (IMDSv2 requires X-aws-ec2-metadata-token header)
# Note: This is Linux-level; cloud provider also enforces at the hypervisor layer
sudo iptables -A OUTPUT -d 169.254.169.254 -p tcp --dport 80 \
    -m conntrack --ctstate NEW -m string --string "PUT" --algo bm -j ACCEPT
sudo iptables -A OUTPUT -d 169.254.169.254 -p tcp --dport 80 \
    -m conntrack --ctstate NEW -j DROP
```

**Checkpoint:** IMDSv2 is enforced at the cloud provider level (metadata-options) AND Linux-level firewall blocks unauthenticated metadata requests. Instance metadata is only accessible with valid tokens.

### 3. Design for Ephemeral Instance Lifecycle

Implement shutdown handlers and graceful degradation for replaceable instances.

```bash
#!/bin/bash
# Graceful shutdown handler for ephemeral cloud instances
# Registered as a systemd service that runs on SIGTERM/shutdown
# Usage: cp shutdown-handler.service /etc/systemd/system/ && systemctl daemon-reload
set -euo pipefail

# This script runs on instance shutdown — must complete quickly (<30s)
SHUTDOWN_LOG="/var/log/instance-shutdown.log"
LOCK_FILE="/run/shutdown-handler.lock"
readonly SHUTDOWN_LOG LOCK_FILE

# Prevent concurrent shutdown runs
exec 200>"$LOCK_FILE"
flock -n 200 || { echo "Shutdown handler already running" >&2; exit 1; }

log() {
    echo "$(date -Iseconds) $*" | tee -a "$SHUTDOWN_LOG"
}

# Phase 1: Stop accepting new work
log "Phase 1: Draining load balancer traffic"
# Remove from load balancer (AWS example — adapt for provider)
INSTANCE_ID=$(curl -s -m 2 -H "X-aws-ec2-metadata-token: $(curl -s -m 2 -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")" http://169.254.169.254/latest/meta-data/instance-id 2>/dev/null || echo "unknown")

if [[ "$INSTANCE_ID" != "unknown" ]]; then
    # Deregister from target group (non-blocking, fire-and-forget)
    aws elbv2 deregister-targets \
        --target-group-arn "arn:aws:elasticloadbalancing:$(curl -s -m 2 -H "X-aws-ec2-metadata-token: $(curl -s -m 2 -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 21600') http://169.254.169.254/latest/meta-data/placement/region 2>/dev/null || echo us-east-1)":targets" \
        --targets "Id=$INSTANCE_ID" &
    log "Deregistered instance $INSTANCE_ID from load balancer"
fi

# Phase 2: Flush connection state
log "Phase 2: Draining active connections"
# Wait for active connections to close (grace period)
sleep 5

# Phase 3: Persist critical state
log "Phase 3: Persisting critical state"
if [[ -d /opt/app/data ]]; then
    # Ensure data is flushed to durable storage
    sync
    # Copy critical state to shared storage if available
    if mountpoint -q /mnt/shared-state; then
        cp -a /opt/app/data/*.state /mnt/shared-state/ 2>/dev/null || true
    fi
fi

log "Shutdown complete. Instance may be terminated."
```

**Checkpoint:** Shutdown handler is registered as a systemd service with `ExecStopPre` and `ExecStop`, runs within the shutdown timeout, and persists critical state before instance termination.

### 4. Configure Cloud-Specific Filesystem Layouts

Use cloud-aware device paths and ephemeral storage patterns.

```bash
#!/bin/bash
# Cloud filesystem layout detection and configuration
# Cloud providers use predictable device naming via /dev/disk/cloud/*
set -euo pipefail

echo "=== Cloud Filesystem Layout Detection ==="

# --- AWS: EBS volumes and instance store ---
echo "--- EBS Volumes (persistent block storage) ---"
# EBS volumes appear as /dev/xvda, /dev/xvdb, etc.
# Cloud provider symlinks: /dev/disk/cloud/aws_ebs-*
lsblk -o NAME,SIZE,TYPE,MOUNTPOINT,MODEL | grep -E "disk|part" 2>/dev/null || echo "No block devices found"

# EBS-specific symlinks (persistent across reboots and instance stops)
if [[ -d /dev/disk/cloud ]]; then
    echo "--- EBS Persistent Symlinks ---"
    ls -la /dev/disk/cloud/
fi

# --- AWS: Instance Store (ephemeral NVMe) ---
echo ""
echo "--- Instance Store (ephemeral, lost on stop/terminate) ---"
# Instance store NVMe devices
lsblk -dno NAME,SIZE,TYPE,ROTA | grep -E "disk.*0$" || echo "No instance store devices found"
# Ephemeral storage mount points (AWS convention)
# /mnt — ephemeral storage (instance store)
# /dev/nvme1n1 — instance store (lost on stop)
# /dev/nvme0n1 — root EBS (persistent)

# --- Detect ephemeral vs persistent storage ---
detect_storage_type() {
    local dev="$1"
    # Check if device is behind EBS (persistent)
    if [[ -L "/dev/disk/cloud/aws_ebs_${dev}" ]]; then
        echo "persistent-ebs"
    # Check if device is NVMe rotational (0 = SSD/NVMe)
    elif [[ -f "/sys/block/${dev}/queue/rotational" ]]; then
        local rota
        rota=$(cat "/sys/block/${dev}/queue/rotational")
        if [[ "$rota" == "0" ]]; then
            echo "ssd-nvme"
        else
            echo "hdd"
        fi
    else
        echo "unknown"
    fi
}

# --- Mount ephemeral storage safely ---
mount_ephemeral_storage() {
    local device="$1"
    local mount_point="$2"

    # Only mount ephemeral storage on NVMe device (not root)
    if [[ "$(basename "$device")" == "nvme0n1" ]]; then
        echo "Warning: $device appears to be root device — not mounting as ephemeral"
        return 1
    fi

    mkdir -p "$mount_point"
    # mkfs only if not already formatted (idempotent)
    if ! blkid "$device" | grep -q 'TYPE='; then
        echo "Formatting $device with ext4"
        mkfs.ext4 -F "$device"
    fi

    # Mount with discard for TRIM on NVMe
    if ! mountpoint -q "$mount_point"; then
        mount -o discard,defaults "$device" "$mount_point"
        echo "Mounted $device on $mount_point"
    else
        echo "$mount_point already mounted"
    fi
}
```

**Checkpoint:** Ephemeral storage is correctly identified (NVMe vs EBS), mounted with appropriate options, and never used for persistent data. Root volume is always EBS-backed.

### 5. Configure Cloud Observability at Boot

Ship logs, metrics, and traces to cloud-native observability via cloud-init.

```bash
# Cloud-init YAML for observability agent installation
# This runs at first-boot to install and configure monitoring agents

# Install AWS CloudWatch Agent (provider-agnostic pattern: install agent, configure via env)
cat > /var/lib/cloud/scripts/per-boot/install-observability.sh << 'OBSERVABILITY'
#!/bin/bash
set -euo pipefail

# --- CloudWatch Agent (AWS) ---
install_cloudwatch_agent() {
    local region
    region=$(curl -s -m 2 -H "X-aws-ec2-metadata-token: $(curl -s -m 2 -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 21600')" http://169.254.169.254/latest/meta-data/placement/region 2>/dev/null || echo "us-east-1")

    if command -v amazon-cloudwatch-agent-config-wizard &>/dev/null; then
        echo "CloudWatch agent already installed"
        return 0
    fi

    echo "Installing CloudWatch agent for region: $region"

    # Install CloudWatch Agent
    wget "https://amazoncloudwatch-agent-${region}.s3.amazonaws.com/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm" \
        -O /tmp/cloudwatch-agent.rpm 2>/dev/null || true

    if [[ -f /tmp/cloudwatch-agent.rpm ]]; then
        rpm -U /tmp/cloudwatch-agent.rpm
        rm /tmp/cloudwatch-agent.rpm
    fi
}

# --- CloudWatch Agent Configuration ---
configure_cloudwatch_agent() {
    cat > /opt/aws/amazon-cloudwatch-agent/etc/conf.d/cloudwatch_config.json << 'CW_CONFIG'
{
    "agent": {
        "metrics_collection_interval": 60,
        "run_as_user": "root",
        "debug": false
    },
    "metrics": {
        "metrics_collected": {
            "collectd": {
                "metrics_aggregation_interval": 60
            },
            "cpu": {
                "measurement": ["cpu_usage_idle", "cpu_usage_user", "cpu_usage_system"],
                "metrics_collection_interval": 60,
                "resources": ["*"]
            },
            "disk": {
                "measurement": ["disk_used_percent", "disk_io_time"],
                "metrics_collection_interval": 60,
                "resources": ["*"]
            },
            "mem": {
                "measurement": ["mem_used_percent", "mem_available"],
                "metrics_collection_interval": 60
            },
            "net": {
                "measurement": ["net_bytes_sent", "net_bytes_recv"],
                "metrics_collection_interval": 60,
                "resources": ["*"]
            }
        },
        "append_dimensions": {
            "InstanceId": "${aws:InstanceId}",
            "ImageId": "${aws:ImageId}",
            "AutoScalingGroupName": "${aws:AutoScalingGroupName}"
        }
    },
    "logs": {
        "logs_collected": {
            "files": {
                "collect_list": [
                    {
                        "log_group_name": "/var/log/myapp/{AutoScalingGroupName}",
                        "log_group_region": "{region}",
                        "file_path": "/var/log/myapp/*.log"
                    },
                    {
                        "log_group_name": "/var/log/syslog",
                        "log_group_region": "{region}",
                        "file_path": "/var/log/syslog"
                    }
                ]
            }
        }
    }
}
CW_CONFIG
}

# --- CloudTrail integration (audit logging) ---
configure_cloudtrail_logging() {
    # Ensure auditd is running for CloudTrail-compatible audit trails
    if command -v auditctl &>/dev/null; then
        # Log all privilege escalations
        auditctl -a always,exit -F arch=b64 -S execve -k exec_audit
        # Log all file access to sensitive paths
        auditctl -w /etc/shadow -p rwxa -k shadow_changes
        auditctl -w /etc/passwd -p wa -k passwd_changes
        auditctl -w /etc/sudoers -p wa -k sudoers_changes
    fi
}

install_cloudwatch_agent
configure_cloudwatch_agent
configure_cloudtrail_logging

echo "$(date -Iseconds) Observability setup complete"
OBSERVABILITY

chmod +x /var/lib/cloud/scripts/per-boot/install-observability.sh
```

**Checkpoint:** CloudWatch agent (or equivalent) is installed, configured with instance metadata for dimension enrichment, syslog and application logs are collected, and auditd captures security-relevant events.

### 6. Handle Spot/Preemptible Instance Signals

Implement graceful shutdown, checkpointing, and drain for spot instances.

```bash
#!/bin/bash
# Spot instance graceful shutdown handler
# AWS: EC2 Instance Stop/Retirement notifications via CloudWatch Events
# GCP: Preemption events via metadata
# Azure: Eviction/Deallocation notifications via metadata
set -euo pipefail

LOG_FILE="/var/log/spot-handler.log"
CHECKPOINT_DIR="/opt/app/checkpoints"
readonly LOG_FILE CHECKPOINT_DIR

log() {
    echo "$(date -Iseconds) $*" | tee -a "$LOG_FILE"
}

# --- AWS Spot Instance Interruption Handling ---
# AWS sends 2-minute and 1-minute advance notices via CloudWatch Events
# This script is triggered by the SNS topic subscription on EC2 spot interruption
handle_aws_spot_interruption() {
    local message="$1"
    local instance_id
    instance_id=$(curl -s -m 2 -H "X-aws-ec2-metadata-token: $(curl -s -m 2 -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 21600')" http://169.254.169.254/latest/meta-data/instance-id 2>/dev/null || echo "unknown")

    log "=== AWS Spot Interruption ==="
    log "Instance: $instance_id"
    log "Message: $message"

    # Extract time remaining from message
    local event_type
    event_type=$(echo "$message" | jq -r '.event' 2>/dev/null || echo "spot-interruption")
    local time_remaining
    case "$event_type" in
        *EC2_Instance-Stop*) time_remaining=120 ;;  # Stop
        *EC2_Instance-Retirement*) time_remaining=300 ;;  # Retirement
        *EC2_Spot_Instance-Interruption*) time_remaining=120 ;;  # Spot
        *) time_remaining=60 ;;  # Default: 1 minute
    esac

    log "Time remaining: ${time_remaining}s"

    # Phase 1: Flush application state (0-120s window)
    log "Phase 1: Flushing application state to durable storage"
    mkdir -p "$CHECKPOINT_DIR"
    sync

    # Phase 2: Gracefully stop accepting new connections
    log "Phase 2: Stopping application"
    systemctl stop myapp-service 2>/dev/null || true

    # Phase 3: Persist checkpoints
    log "Phase 3: Saving checkpoints"
    if [[ -d /opt/app/data ]]; then
        tar czf "${CHECKPOINT_DIR}/checkpoint-$(date +%Y%m%d-%H%M%S).tar.gz" -C /opt/app/data . 2>/dev/null || true
    fi

    # Phase 4: Deregister from load balancer
    log "Phase 4: Deregistering from load balancer"
    if [[ "$instance_id" != "unknown" ]]; then
        aws elbv2 deregister-targets \
            --target-group-arn "arn:aws:elasticloadbalancing:*:targets" \
            --targets "Id=$instance_id" &>/dev/null || true
    fi

    # Phase 5: Exit — instance will be terminated
    log "Spot interruption handled. Exiting gracefully."
    exit 0
}

# --- GCP Preemption Handling ---
handle_gcp_preemption() {
    log "=== GCP Preemption Detected ==="
    # GCP sends SIGTERM with ~30s grace period
    # Preemption notice via metadata: /metadata/preempted
    local preempted
    preempted=$(curl -s -m 2 -H "Metadata-Flavor: Google" \
        http://metadata.google.internal/computeMetadata/v1/instance/preempted 2>/dev/null || echo "false")

    if [[ "$preempted" == "true" ]]; then
        log "Instance is preempted — executing checkpoint and drain"
        systemctl stop myapp-service 2>/dev/null || true
        sync
        exit 0
    fi
}

# --- Azure Deallocation Handling ---
handle_azure_deallocation() {
    log "=== Azure Deallocation Detected ==="
    # Azure sends SIGTERM via custom handler
    local deallocation
    deallocation=$(curl -s -m 2 \
        -H "Metadata-Severity: Interactive" \
        "http://169.254.169.254/metadata/instance?api-version=2021-02-01" 2>/dev/null | \
        jq -r '.compute.vmState' 2>/dev/null || echo "running")

    if [[ "$deallocation" == "deallocated" ]]; then
        log "VM is being deallocated — executing checkpoint and drain"
        systemctl stop myapp-service 2>/dev/null || true
        sync
        exit 0
    fi
}

# --- Generic: CloudWatch event trigger ---
# Set up CloudWatch Events rule to trigger this on spot interruption
# Usage: ./spot-handler.sh aws <sns-message-json>
# Usage: ./spot-handler.sh gcp
# Usage: ./spot-handler.sh azure

case "${1:-}" in
    aws) handle_aws_spot_interruption "${2:-{}}" ;;
    gcp) handle_gcp_preemption ;;
    azure) handle_azure_deallocation ;;
    *) echo "Usage: $0 {aws|gcp|azure} [args...]" ;;
esac
```

**Checkpoint:** Spot handler is registered as a systemd service triggered by CloudWatch Events (AWS) or metadata polling (GCP/Azure). Checkpoints are saved within the interruption window, and the load balancer is notified before termination.

### 7. Manage SSH Keys at Scale

Distribute and rotate SSH keys via cloud-init without manual key management.

```bash
# Cloud-init user-data: SSH key injection and rotation
# Keys are injected via EC2 User Data or AWS Systems Manager Parameter Store

cat > /var/lib/cloud/scripts/per-boot/manage-ssh-keys.sh << 'SSH_KEYS'
#!/bin/bash
set -euo pipefail

SSH_KEY_DIR="/home/appuser/.ssh"
SSH_KEY_FILE="${SSH_KEY_DIR}/authorized_keys"

# --- Option A: Inject keys from Systems Manager Parameter Store ---
fetch_keys_from_ssm() {
    local param_path="$1"
    local keys

    keys=$(aws ssm get-parameter \
        --name "$param_path" \
        --with-decryption \
        --query 'Parameter.Value' \
        --output text 2>/dev/null) || {
        echo "Failed to fetch keys from SSM: $param_path" >&2
        return 1
    }

    echo "$keys" > "${SSH_KEY_FILE}.new"
}

# --- Option B: Inject keys from AWS Secrets Manager ---
fetch_keys_from_secrets() {
    local secret_id="$1"
    local keys

    keys=$(aws secretsmanager get-secret-value \
        --secret-id "$secret_id" \
        --query 'SecretString' \
        --output text 2>/dev/null) || {
        echo "Failed to fetch keys from Secrets Manager: $secret_id" >&2
        return 1
    }

    echo "$keys" > "${SSH_KEY_FILE}.new"
}

# --- Option C: Inject keys from cloud metadata (instance-specific) ---
fetch_keys_from_metadata() {
    local public_key
    public_key=$(curl -s -m 2 -H "X-aws-ec2-metadata-token: $(curl -s -m 2 -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 21600')" \
        http://169.254.169.254/latest/meta-data/public-keys/0/openssh-key 2>/dev/null) || {
        echo "No public key in metadata" >&2
        return 1
    }

    echo "$public_key" > "${SSH_KEY_FILE}.new"
}

# --- Apply SSH keys (atomic, with backup) ---
apply_ssh_keys() {
    local source="${1:-metadata}"

    # Create SSH directory with strict permissions
    mkdir -p "$SSH_KEY_DIR"
    chmod 700 "$SSH_KEY_DIR"

    case "$source" in
        ssm)
            fetch_keys_from_ssm "/secure/ssh-keys/fleet" || return 1
            ;;
        secrets)
            fetch_keys_from_secrets "ssh-keys/fleet" || return 1
            ;;
        metadata)
            fetch_keys_from_metadata || return 1
            ;;
        *)
            echo "Unknown source: $source" >&2
            return 1
            ;;
    esac

    # Atomic swap: validate and replace
    if grep -q '^ssh-rsa\|^ssh-ed25519\|^ecdsa-sha2-nistp' "${SSH_KEY_FILE}.new"; then
        mv "${SSH_KEY_FILE}.new" "$SSH_KEY_FILE"
        chown appuser:appuser "$SSH_KEY_FILE"
        chmod 600 "$SSH_KEY_FILE"
        echo "SSH keys updated successfully from: $source"
    else
        rm -f "${SSH_KEY_FILE}.new"
        echo "Invalid key format — key not applied" >&2
        return 1
    fi
}

# --- Key rotation: remove keys not in current rotation ---
rotate_ssh_keys() {
    local new_keys_file="$1"
    local backup_dir="/etc/ssh-keys/backup"
    local timestamp
    timestamp=$(date +%Y%m%d-%H%M%S)

    # Backup current keys
    mkdir -p "$backup_dir"
    if [[ -f "$SSH_KEY_FILE" ]]; then
        cp "$SSH_KEY_FILE" "${backup_dir}/keys-${timestamp}"
    fi

    # Atomic replace
    mv "$new_keys_file" "$SSH_KEY_FILE"
    chown appuser:appuser "$SSH_KEY_FILE"
    chmod 600 "$SSH_KEY_FILE"

    # Rotate backups: keep last 10
    ls -t "${backup_dir}"/keys-* 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true

    echo "SSH keys rotated at $timestamp"
}

# --- Usage: called from cloud-init or systemd timer for periodic rotation ---
apply_ssh_keys "${1:-metadata}"
SSH_KEYS

chmod +x /var/lib/cloud/scripts/per-boot/manage-ssh-keys.sh

# --- Cloud-init YAML for SSH key injection via SSM ---
cat > /etc/cloud/cloud.cfg.d/99-ssh-keys.cfg << 'SSH_CLOUDINIT'
# cloud-init config: SSH key management via SSM Parameter Store
ssh_authorized_keys: []  # Clear default keys — we manage via script

# Run key management at boot
runcmd:
  - /var/lib/cloud/scripts/per-boot/manage-ssh-keys.sh ssm
SSH_CLOUDINIT
```

**Checkpoint:** SSH keys are managed centrally (SSM/Secrets Manager), injected atomically with proper permissions, rotated with backup retention, and never stored on-disk in plaintext outside the authorized_keys file.

---

## Implementation Patterns

### Pattern 1: Cloud-Init User-Data (Shell Script vs. YAML Modules)

```bash
# ❌ BAD: Using shell scripts for all cloud-init configuration
# Shell scripts run once and are hard to make idempotent
# They also bypass cloud-init's structured module system

#cloud-config
# This is still a shell script approach — fragile, not modular
runcmd:
  - apt-get update && apt-get install -y nginx
  - systemctl enable nginx
  - echo "server_name myapp;" > /etc/nginx/sites-available/default

# Problems:
# - apt-get install runs on EVERY boot (cloud-init re-executes per-boot scripts)
# - No idempotency — apt-get update fails if network is flaky
# - No structured config management
# - Cannot be validated by cloud-init schema

# ✅ GOOD: Using cloud-init YAML modules (idempotent, structured, validated)
#cloud-config

# Package installation — idempotent, handles dependencies
package_update: true
package_upgrade: false

packages:
  - nginx

# File resource — writes files atomically with ownership
write_files:
  - path: /etc/nginx/sites-available/default
    content: |
      server {
          listen 80;
          server_name myapp;
          location / {
              proxy_pass http://localhost:8080;
          }
      }
    owner: root:root
    permissions: '0644'

# Cloud-config modules are idempotent — safe to re-run on every boot
# Package module: only installs if not already present
# Write_files module: only writes if content differs (uses hash comparison)
# Runcmd: runs only once on first boot (not per-reboot)

# For per-boot idempotent logic, use per-boot scripts with guard clauses
# (see Core Workflow Step 1)
```

### Pattern 2: Provider-Agnostic Instance Detection

```bash
# ❌ BAD: Hardcoding AWS assumptions everywhere
INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
REGION=$(aws ec2 describe-instance-attribute --instance-id $INSTANCE_ID --query Groups --output text)

# Problems:
# - No token for IMDSv1 (security risk)
# - AWS CLI not always available
# - Fails on GCP/Azure without modification
# - No error handling

# ✅ GOOD: Provider-agnostic detection with IMDSv2 enforcement
#!/bin/bash
set -euo pipefail

detect_cloud_provider() {
    # IMDSv2 token — works for all providers that support token-based metadata
    local token=""

    # AWS IMDSv2 token
    token=$(curl -s -m 2 -X PUT "http://169.254.169.254/latest/api/token" \
        -H "X-aws-ec2-metadata-token-ttl-seconds: 30" 2>/dev/null) || token=""

    # GCP metadata flavor
    if curl -s -m 2 -H "Metadata-Flavor: Google" \
        http://metadata.google.internal/computeMetadata/v1/instance/name 2>/dev/null | grep -q '^'; then
        echo "gcp"
        return
    fi

    # Azure metadata
    if curl -s -m 2 -H "Metadata-Severity: Interactive" \
        "http://169.254.169.254/metadata/instance?api-version=2021-02-01" 2>/dev/null | grep -q '"compute"'; then
        echo "azure"
        return
    fi

    # AWS (fallback — if we get here, it's AWS)
    if [[ -n "$token" ]]; then
        echo "aws"
        return
    fi

    echo "bare-metal"
}

# Usage: provider-agnostic instance attributes
get_instance_attribute() {
    local provider
    provider=$(detect_cloud_provider)
    local attr="$1"

    case "$provider" in
        aws)
            local token
            token=$(curl -s -m 2 -X PUT "http://169.254.169.254/latest/api/token" \
                -H "X-aws-ec2-metadata-token-ttl-seconds: 30" 2>/dev/null || echo "")
            [[ -z "$token" ]] && return 1
            curl -s -m 2 -H "X-aws-ec2-metadata-token: $token" \
                "http://169.254.169.254/latest/meta-data/$attr"
            ;;
        gcp)
            curl -s -m 2 -H "Metadata-Flavor: Google" \
                "http://metadata.google.internal/computeMetadata/v1/instance/$attr"
            ;;
        azure)
            local token
            token=$(curl -s -m 2 -H "Metadata-Severity: Interactive" \
                "http://169.254.169.254/metadata/instance?api-version=2021-02-01" 2>/dev/null | \
                jq -r '.metadata' 2>/dev/null || echo "")
            curl -s -m 2 -H "Metadata-Severity: Interactive" \
                -H "Authorization: Bearer $token" \
                "http://169.254.169.254/metadata/instance?api-version=2021-02-01" | \
                jq -r ".compute.$attr" 2>/dev/null
            ;;
        bare-metal)
            echo "Not a cloud instance" >&2
            return 1
            ;;
    esac
}

# Examples:
get_instance_attribute "instance-id"       # AWS: i-0abc123
get_instance_attribute "name"              # GCP: my-instance-name
get_instance_attribute "placement/region"  # AWS: us-east-1
```

### Pattern 3: Cloud-Init Systemd Service for Observability

```ini
# /etc/systemd/system/cloud-observability.service
[Unit]
Description=Cloud Observability Agent Manager
After=network-online.target cloud-final.service
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/cloud-observability-bootstrap.sh
TimeoutStartSec=120
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

```bash
#!/bin/bash
# /usr/local/bin/cloud-observability-bootstrap.sh
# Bootstrap cloud observability agents — idempotent, provider-agnostic
set -euo pipefail

LOG="/var/log/cloud-observability-bootstrap.log"
exec >>"${LOG}" 2>&1

log() { echo "$(date -Iseconds) $*"; }

BOOTSTRAP_MARKER="/var/lib/cloud-observability/bootstrap-done"

# Skip if already bootstrapped (idempotent)
if [[ -f "$BOOTSTRAP_MARKER" ]]; then
    log "Already bootstrapped — skipping"
    exit 0
fi

log "Starting cloud observability bootstrap"

# Detect provider
PROVIDER=$(detect_cloud_provider 2>/dev/null || echo "unknown")
log "Detected provider: $PROVIDER"

case "$PROVIDER" in
    aws)
        # Install and configure CloudWatch agent
        if ! systemctl is-active --quiet amazon-cloudwatch-agent.service 2>/dev/null; then
            log "Installing CloudWatch agent"
            install_cloudwatch_agent
            configure_cloudwatch_agent
            systemctl enable --now amazon-cloudwatch-agent
        fi

        # Configure auditd for CloudTrail-compatible audit trails
        if systemctl is-active --quiet auditd; then
            log "Auditd already running"
        else
            systemctl enable --now auditd
            log "Started auditd"
        fi
        ;;
    gcp)
        # Install Google Cloud Logging agent
        if ! systemctl is-active --quiet google-fluentd 2>/dev/null; then
            log "Installing Google Cloud Logging agent"
            install_gcp_logging_agent
            systemctl enable --now google-fluentd
        fi
        ;;
    azure)
        # Install Azure Monitor agent
        if ! systemctl is-active --quiet azuremonitoragent 2>/dev/null; then
            log "Installing Azure Monitor agent"
            install_azure_monitor_agent
            systemctl enable --now azuremonitoragent
        fi
        ;;
    *)
        log "No cloud provider detected — skipping cloud-specific agents"
        ;;
esac

# Create marker to prevent re-bootstrap
touch "$BOOTSTRAP_MARKER"
chmod 644 "$BOOTSTRAP_MARKER"
log "Bootstrap complete"
```

**Checkpoint:** Bootstrap runs once, is idempotent (checks for existing agent), provider-specific, and creates a marker file to prevent re-execution.

---

## Constraints

### MUST DO

- **MUST** write cloud-init user-data as YAML modules when possible — shell scripts in user-data should be used only for logic that cannot be expressed in YAML
- **MUST** enforce IMDSv2 on all cloud instances — never access metadata without a token; configure `--http-tokens required` at the instance level
- **MUST** design every instance as disposable — no in-place upgrades, no persistent state on local storage (except ephemeral caches with TTL)
- **MUST** ensure all cloud-init scripts are idempotent — they run on every boot, including reboots and recovery
- **MUST** configure cloud observability at boot time, not after instance is running — gaps in observability are gaps in incident detection
- **MUST** handle spot/preemptible signals gracefully — implement checkpointing, drain, and load balancer deregistration
- **MUST** manage SSH keys via centralized secret management (SSM, Secrets Manager, HashiCorp Vault) — never distribute keys manually
- **MUST** use `/dev/disk/cloud/*` symlinks for cloud storage devices — these are persistent across instance stop/start cycles

### MUST NOT DO

- **MUST NOT** use IMDSv1 (unauthenticated metadata endpoint `http://169.254.169.254/latest/meta-data/`) — it is vulnerable to SSRF attacks (e.g., ROAST attack)
- **MUST NOT** store persistent data on ephemeral instance store (`/mnt`, `/dev/nvme*` instance store) — this data is lost on stop/terminate
- **MUST NOT** use `runcmd` for package installation — use cloud-init's `packages` module instead; `runcmd` runs every boot and is not idempotent
- **MUST NOT** hardcode cloud provider APIs in application code — use provider-agnostic patterns or abstraction layers
- **MUST NOT** bypass IMDSv2 enforcement even in development — the same security posture must apply to all environments
- **MUST NOT** rely on cron-based metadata polling for spot interruption — use CloudWatch Events (AWS), metadata preemption events (GCP), or custom handlers (Azure)
- **MUST NOT** store SSH private keys on cloud instances — only public keys should be injected; private keys must never leave the key owner's machine
- **MUST NOT** mount instance store without checking it's not the root device — mounting `/dev/nvme0n1` (root) as ephemeral storage destroys the OS

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `linux-services` | Manage systemd service lifecycle alongside cloud-init bootstrapping |
| `networking` | Configure VPC networking, security groups, and ENI-level networking at the Linux layer |
| `resource-management` | Configure cgroups and resource limits for cloud workloads |
| `linux-security` | Apply security hardening that complements IMDSv2 and cloud-specific security controls |

---

> 📖 skill(local cache): cloud-linux-engineering