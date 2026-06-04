---




name: linux-security
description: Hardens Linux systems against common attack vectors with security baselines,
  access controls, and audit frameworks for cloud and on-prem environments.
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
  triggers: linux security, hardening, CIS benchmark, SELinux, AppArmor, SSH hardening,
    file integrity, audit framework
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: kernel-tuning, resource-management, networking, hardware-provisioning
  maturity: stable
  completeness: 95
  exampleCount: 3




---




# Linux Security Hardening

Security engineer hardening Linux systems against common attack vectors with security baselines, mandatory access controls, SSH hardening, file integrity monitoring, and audit frameworks for cloud and on-prem environments.

## TL;DR Checklist

- [ ] Apply OS-specific security baseline (CIS benchmark or equivalent)
- [ ] Harden SSH configuration with key-based authentication and disabled root login
- [ ] Configure SELinux or AppArmor in enforcing mode for all workloads
- [ ] Set up auditd with rules for security-relevant events
- [ ] Configure file integrity monitoring for critical system files
- [ ] Apply firewall rules with explicit deny-all default policy
- [ ] Disable unnecessary services and network ports
- [ ] Configure automatic security updates and patch management

---

## When to Use

Use this skill when:

- **Initial system hardening** — You're provisioning a new server and need to apply security baselines before exposing it to the network
- **Compliance requirements** — You need to meet CIS benchmarks, PCI DSS, HIPAA, or SOC 2 security requirements
- **Security incident response** — A system has been compromised or suspected of compromise and needs forensic lockdown
- **Security audit preparation** — You're preparing systems for a security audit and need to verify all controls are in place
- **Hardening container hosts** — You need to secure the underlying host that runs containerized workloads

---

## When NOT to Use

Avoid this skill for:

- **Application-level security** — Use application security practices, not OS hardening, to protect application code
- **Network perimeter security** — Use dedicated firewalls, WAFs, and network security groups for perimeter defense
- **Cloud IAM and identity** — Use cloud provider IAM (AWS IAM, GCP IAM, Azure RBAC) for identity management, not local user accounts
- **Encryption of application data** — Use application-level encryption or database encryption, not OS-level disk encryption for all data

Use `networking` for firewall configuration that complements security baselines. Use `kernel-tuning` for kernel parameters that affect security (kernel hardening sysctls).

---

## Core Workflow

### 1. Apply Security Baseline

Implement OS-specific security baseline using CIS benchmarks or equivalent.

```bash
# Install CIS benchmark scanner (Debian/Ubuntu)
sudo apt install -y cis-hardening

# Install RHEL/CentOS CIS tools
sudo dnf install -y scap-security-guide

# Apply CIS profile for your OS level
# Level 1: Basic hardening (recommended for all)
sudo remediate --profile cis --level 1

# Verify baseline compliance
sudo grep-audit --profile cis --level 1

# Manual baseline checklist
# 1. Disable unused filesystems
sudo sed -i 's/^#\?install\s*module_blacklist.*/module_blacklist=autofs,can_bcm,can,gps,dm-ml,/g' /etc/default/grub
sudo update-grub  # or grub2-mkconfig -o /boot/grub2/grub.cfg

# 2. Set permissions on critical files
sudo chmod 644 /etc/passwd
sudo chmod 640 /etc/shadow
sudo chmod 644 /etc/group
sudo chmod 640 /etc/gshadow
sudo chmod 755 /etc/ssh/sshd_config

# 3. Configure password policies
cat > /etc/security/pwquality.conf << 'PWQUALITY'
minlen = 14
minclass = 3
maxrepeat = 3
maxclassrepeat = 4
lcredit = -1
ucredit = -1
dcredit = -1
ocredit = -1
PWQUALITY
```

**Checkpoint:** Security baseline is applied and verified. Non-compliant items are documented and justified if exceptions are needed.

### 2. Harden SSH Configuration

Secure SSH access with key-based authentication, disable root login, and apply hardening.

```bash
# SSH hardening configuration
cat > /etc/ssh/sshd_config.d/hardening.conf << 'SSH'
# Disable root login
PermitRootLogin no

# Key-based authentication only
PubkeyAuthentication yes
PasswordAuthentication no
KbdInteractiveAuthentication no
ChallengeResponseAuthentication no

# Restrict to specific users/groups
AllowUsers deployer admin
# Or: AllowGroups ssh-users

# Protocol and algorithm hardening
Protocol 2
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com
KexAlgorithms curve25519-sha256,curve25519-sha256@libssh.org

# Session hardening
LoginGraceTime 30
MaxAuthTries 3
MaxSessions 3
ClientAliveInterval 300
ClientAliveCountMax 2
PermitEmptyPasswords no
PermitUserEnvironment no

# Logging
LogLevel VERBOSE
SSH

# Restart SSH
sudo systemctl restart sshd

# Verify no password-based auth is possible
ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no user@host
# Expected: "Permission denied (publickey)"
```

**Checkpoint:** Root login is disabled, password authentication is disabled, only authorized users can connect, and connection attempts with password auth are rejected.

### 3. Configure Mandatory Access Control

Set up SELinux (RHEL/CentOS) or AppArmor (Debian/Ubuntu) in enforcing mode.

```bash
# SELinux configuration (RHEL/CentOS)
# Check current status
sestatus

# Set to enforcing mode
sudo sed -i 's/^SELINUX=.*/SELINUX=enforcing/' /etc/selinux/config
sudo setenforce 1

# Verify
getenforce  # Should output "Enforcing"

# If a service needs custom policy, create it instead of disabling SELinux
# Example: Allow Nginx to write to custom directory
sudo mkdir -p /var/www/custom-app
sudo semanage fcontext -a -t httpd_sys_rw_content_t "/var/www/custom-app(/.*)?"
sudo restorecon -Rv /var/www/custom-app

# View SELinux denials
sudo ausearch -m avc -ts recent
sudo sealert -a /var/log/audit/audit.log

# --- OR AppArmor (Debian/Ubuntu) ---
# Check status
sudo aa-status

# Set to enforcing mode
sudo aa-enforce /etc/apparmor.d/*

# Create custom profile for an application
cat > /etc/apparmor.d/usr.local.bin.myapp << 'APPARMOR'
#include <tunables/global>

/usr.local.bin.myapp {
  #include <abstractions/base>

  # Allow reading config files
  /etc/myapp/config.yaml r,

  # Allow writing to application data directory
  /var/lib/myapp/ rw,
  /var/lib/myapp/** rw,

  # Allow network connections
  network inet stream,
  network inet dgram,

  # Deny everything else by default (implicit in AppArmor)
}
APPARMOR

# Load profile
sudo apparmor_parser -r /etc/apparmor.d/usr.local.bin.myapp
sudo systemctl reload apparmor
```

**Checkpoint:** MAC is in enforcing mode, all critical services have appropriate profiles, and no excessive denials are occurring in the logs.

### 4. Configure Audit Framework

Set up auditd to log security-relevant events.

```bash
# Install and configure auditd
sudo apt install -y auditd  # Debian/Ubuntu
sudo dnf install -y audit  # RHEL/CentOS
sudo systemctl enable --now auditd

# Audit rules for security events
cat > /etc/audit/rules.d/30-security.rules << 'AUDIT'
# Monitor changes to authentication files
-w /etc/passwd -p wa -k identity
-w /etc/shadow -p wa -k identity
-w /etc/group -p wa -k identity
-w /etc/gshadow -p wa -k identity
-w /etc/security/ -p wa -k security_config

# Monitor sudo configuration
-w /etc/sudoers -p wa -k sudo_config
-w /etc/sudoers.d/ -p wa -k sudo_config

# Monitor login/logout events
-w /var/log/lastlog -p wa -k login_logout
-w /var/run/faillock/ -p wa -k login_logout

# Monitor kernel module loading/unloading
-a always,exit -F arch=b64 -S init_module -S finit_module -S delete_module -k module_load
-a always,exit -F arch=b32 -S init_module -S finit_module -S delete_module -k module_load

# Monitor system time changes
-a always,exit -F arch=b64 -S adjtimex -S settimeofday -k time_change
-a always,exit -F arch=b32 -S adjtimex -S settimeofday -S stime -k time_change

# Monitor user/group management
-w /usr/sbin/useradd -p x -k user_mgmt
-w /usr/sbin/userdel -p x -k user_mgmt
-w /usr/sbin/groupadd -p x -k group_mgmt
-w /usr/sbin/groupdel -p x -k group_mgmt

# Monitor cron changes
-w /etc/cron.d/ -p wa -k cron
-w /etc/crontab -p wa -k cron
-w /var/spool/cron/ -p wa -k cron

# Monitor network configuration changes
-w /etc/hosts -p wa -k network_config
-w /etc/hostname -p wa -k network_config
-w /etc/sysctl.conf -p wa -k network_config
-w /etc/network/ -p wa -k network_config
AUDIT

# Load rules
sudo augenrules --load

# Verify audit is running
sudo auditctl -s
```

**Checkpoint:** auditd is running, all security-relevant events are being logged, and audit rules are persistent across reboots.

### 5. Configure File Integrity Monitoring

Set up file integrity monitoring for critical system files.

```bash
# Install AIDE (Advanced Intrusion Detection Environment)
sudo apt install -a aide  # Debian/Ubuntu
sudo dnf install -y aide  # RHEL/CentOS

# Initialize AIDE database
sudo aideinit

# Configure AIDE
cat > /etc/aide/aide.conf << 'AIDE'
# Monitor critical system files
/bin CHAGRIL+SHA512
/sbin CHAGRIL+SHA512
/usr/bin CHAGRIL+SHA512
/usr/sbin CHAGRIL+SHA512
/etc CHAGRIL+SHA512
/boot CHAGRIL+SHA512
/var/log CHAGRIL+SHA512

# Monitor SSH configuration specifically
/etc/ssh CHAGRIL+SHA512

# Monitor audit configuration
/etc/audit CHAGRIL+SHA512
/etc/aide CHAGRIL+SHA512

# Monitor cron configuration
/etc/cron.d CHAGRIL+SHA512
/etc/cron.daily CHAGRIL+SHA512
/etc/cron.hourly CHAGRIL+SHA512
/etc/cron.weekly CHAGRIL+SHA512
/etc/cron.monthly CHAGRIL+SHA512
AIDE

# Run initial check and schedule daily
sudo aide --init
sudo mv /var/lib/aide/aide.db.new /var/lib/aide/aide.db

# Schedule daily checks
cat > /etc/cron.daily/aide-check << 'CRON'
#!/bin/bash
sudo aide --check 2>&1 | mail -s "AIDE Integrity Report: $(hostname)" admin@example.com
CRON
sudo chmod +x /etc/cron.daily/aide-check
```

**Checkpoint:** AIDE database is initialized with critical files, daily integrity checks are scheduled, and alerts are configured for changes.

### 6. Configure Firewall with Deny-All Default

Set up nftables firewall with explicit deny-all default policy.

```bash
# See: networking skill for complete nftables configuration
# Key security principles:
# 1. Default deny all inbound
# 2. Explicit allow for required services
# 3. Rate limit SSH and other exposed services
# 4. Log dropped packets for forensic analysis
# 5. Only allow outbound from specific services

cat > /etc/nftables.conf << 'NFTABLES'
#!/usr/sbin/nft -f
flush ruleset

table inet security {
    chain input {
        type filter hook input priority 0; policy drop;

        # Allow established connections
        ct state established,related accept

        # Allow loopback
        iif "lo" accept

        # SSH with rate limiting
        tcp dport 22 ct state new limit rate 3/minute burst 5 packets accept

        # HTTP/HTTPS
        tcp dport { 80, 443 } accept

        # ICMP ping (rate limited)
        icmp type echo-request limit rate 5/second accept

        # Log everything else
        log prefix "INPUT-DROPPED: " level warn
    }

    chain forward {
        type filter hook forward priority 0; policy drop;
        log prefix "FORWARD-DROPPED: " level warn
    }

    chain output {
        type filter hook output priority 0; policy accept;
    }
}
NFTABLES

sudo nft -f /etc/nftables.conf
sudo systemctl enable --now nftables
```

**Checkpoint:** Firewall is active with deny-all policy, only required services are accessible, and dropped packets are logged.

### 7. Disable Unnecessary Services

Remove or disable services that are not required for the workload.

```bash
# List all enabled services
systemctl list-unit-files --state=enabled

# Disable unnecessary services (example for a web server)
sudo systemctl disable --now \
    bluetooth.service \
    cups.service \
    avahi-daemon.service \
    ModemManager.service \
    irqbalance.service \
    lvm2-monitor.service \
    rpcbind.service

# Mask services that must never start
sudo systemctl mask \
    bluetooth.service \
    cups.service

# Verify no unnecessary ports are listening
ss -tuln | grep -v "^Netid"

# Remove unnecessary packages
sudo apt autoremove --purge -y  # Debian/Ubuntu
sudo dnf autoremove -y          # RHEL/CentOS
```

**Checkpoint:** Only required services are enabled and running. No unnecessary ports are listening. Unneeded packages are removed.

---

## Implementation Patterns

### Pattern 1: SSH Hardening (BAD vs. GOOD)

**BAD — Default SSH configuration**

```bash
# ❌ BAD: Default SSH settings with no hardening
# PermitRootLogin yes
# PasswordAuthentication yes
# Port 22
# No cipher restrictions
# No rate limiting
# No user restrictions

# Problems:
# - Root login allows direct authentication attacks
# - Password authentication is vulnerable to brute force
# - No cipher restrictions allow weak cryptographic algorithms
# - No rate limiting allows unlimited login attempts
# - All system users can authenticate via SSH
```

**GOOD — Hardened SSH configuration**

```bash
# ✅ GOOD: SSH hardening with defense in depth
# File: /etc/ssh/sshd_config.d/99-hardening.conf

# Authentication
PermitRootLogin no
PubkeyAuthentication yes
PasswordAuthentication no
KbdInteractiveAuthentication no
AuthenticationMethods publickey
MaxAuthTries 3
MaxSessions 3

# Cryptography
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com
KexAlgorithms curve25519-sha256,curve25519-sha256@libssh.org

# Access control
AllowGroups ssh-access
DenyUsers root admin
LoginGraceTime 30

# Session
ClientAliveInterval 300
ClientAliveCountMax 2
PermitEmptyPasswords no
X11Forwarding no
AllowTcpForwarding no
PermitTunnel no
```

### Pattern 2: Security Baseline Automation

**Bash — Security baseline hardening script**

```bash
#!/bin/bash
# Automated Linux security baseline hardening
# Usage: ./security-baseline.sh [--dry-run]
set -euo pipefail

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
    DRY_RUN=true
    echo "DRY RUN — no changes will be made"
fi

PASS=0
FAIL=0
REPORT=""

run_task() {
    local name="$1" category="$2" description="$3" command="$4" verify_cmd="${5:-}"
    echo -n "  [$category] $name ... "

    if $DRY_RUN; then
        echo "SKIP (dry-run)"
        ((PASS++))
        REPORT+="  ✓ $name: SKIP (dry-run)\n"
        return
    fi

    if eval "$command" 2>&1; then
        echo "APPLIED"
        ((PASS++))
        REPORT+="  ✓ $name: APPLIED\n"
    else
        echo "FAILED"
        ((FAIL++))
        REPORT+="  ✗ $name: FAILED\n"
    fi

    if [[ -n "$verify_cmd" ]]; then
        if eval "$verify_cmd" 2>&1; then
            echo "    verified ✓"
        else
            echo "    verification failed ✗"
            ((FAIL++))
        fi
    fi
}

echo "=== Linux Security Baseline Hardening ==="
echo ""

# SSH Hardening
echo "--- SSH Hardening ---"
run_task \
    "Disable SSH root login" \
    "ssh" \
    "Prevent direct root SSH access" \
    "grep -q 'PermitRootLogin no' /etc/ssh/sshd_config.d/hardening.conf || echo 'PermitRootLogin no' | sudo tee -a /etc/ssh/sshd_config.d/hardening.conf" \
    "grep -q 'PermitRootLogin no' /etc/ssh/sshd_config.d/hardening.conf"

run_task \
    "Disable SSH password auth" \
    "ssh" \
    "Enforce key-based SSH authentication" \
    "grep -q 'PasswordAuthentication no' /etc/ssh/sshd_config.d/hardening.conf || echo 'PasswordAuthentication no' | sudo tee -a /etc/ssh/sshd_config.d/hardening.conf"

# Filesystem permissions
echo ""
echo "--- Filesystem Permissions ---"
run_task \
    "Secure shadow file" \
    "fs" \
    "Restrict access to password hashes" \
    "sudo chmod 640 /etc/shadow && sudo chown root:shadow /etc/shadow" \
    "stat -c '%a %U:%G' /etc/shadow"

run_task \
    "Secure passwd file" \
    "fs" \
    "Prevent unauthorized passwd modifications" \
    "sudo chmod 644 /etc/passwd" \
    "stat -c '%a' /etc/passwd"

# Service hardening
echo ""
echo "--- Service Hardening ---"
run_task \
    "Disable unused services" \
    "svc" \
    "Reduce attack surface" \
    "sudo systemctl disable --now bluetooth cups avahi-daemon ModemManager"

# Audit configuration
echo ""
echo "--- Audit Configuration ---"
run_task \
    "Enable auditd" \
    "audit" \
    "Enable kernel audit framework" \
    "sudo systemctl enable --now auditd" \
    "systemctl is-active auditd"

# Report
echo ""
echo "=== Security Baseline Report ==="
echo "Total tasks: $((PASS + FAIL))"
echo "Passed: $PASS"
echo "Failed: $FAIL"
echo ""
echo -e "$REPORT"

if [[ $FAIL -gt 0 ]]; then
    echo "⚠ Some tasks failed. Review output above."
    exit 1
fi
echo "✓ All baseline tasks completed successfully."
```

### Pattern 3: Cloud-Specific Security Adjustments

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Cloud vs On-Prem Security Considerations               │
├────────────────────────┬────────────────────────────────────────────────┤
│ Consideration          │ Cloud                                            │ On-Prem          │
├────────────────────────┼────────────────────────────────────────────────┤
│ Physical access        │ Provider controls physical security            │ You control it   │
│                        │ (no SSH to hypervisor)                         │                  │
├────────────────────────┼────────────────────────────────────────────────┤
│ Network perimeter      │ Security groups / NACLs handle L3/4           │ Your firewall    │
│                        │ (use these as primary boundary)             │ handles it       │
├────────────────────────┼────────────────────────────────────────────────┤
│ SSH access             │ Use cloud provider key management          │ Manage keys      │
│                        │ (AWS SSM Session Manager, GCP OS Config)   │ yourself         │
├────────────────────────┼────────────────────────────────────────────────┤
│ Metadata service       │ IMDSv2 required (v1 is deprecated)       │ No metadata      │
│                        │ Always use --metadata-ttl 1 --             │ service to worry │
│                        │ metadata-endpoint                        │ about            │
├────────────────────────┼────────────────────────────────────────────────┤
│ Instance store         │ Ephemeral data not persistent              │ You control RAID  │
│                        │ Treat as cache, never store data           │ and backup       │
├────────────────────────┼────────────────────────────────────────────────┤
│ Logging                │ CloudTrail / VPC Flow Logs capture         │ Your auditd      │
│                        │ infrastructure changes externally          │ captures events  │
├────────────────────────┼────────────────────────────────────────────────┤
│ Compliance             │ Shared responsibility model:              │ Full            │
│                        │ Provider: infrastructure                    │ responsibility   │
│                        │ You: OS, application, data                 │                   │
└────────────────────────┴────────────────────────────────────────────────┘
```

---

## Constraints

### MUST DO

- **MUST** apply security baseline (CIS or equivalent) to all new systems before connecting to any network
- **MUST** enforce key-based SSH authentication and disable password authentication for all user accounts
- **MUST** disable root login over SSH — use sudo for privilege escalation with audit logging
- **MUST** configure SELinux or AppArmor in enforcing mode — never disable MAC just because a service has policy issues
- **MUST** set up auditd with rules covering authentication, privilege escalation, file changes, and network configuration
- **MUST** configure firewall with explicit deny-all default policy and only allow required services
- **MUST** enable automatic security updates for critical patches (CVEs with known exploits)
- **MUST** document all security exceptions with justification and review cadence

### MUST NOT DO

- **MUST NOT** disable SELinux/AppArmor to "fix" application issues — create or fix the MAC policy instead
- **MUST NOT** add rules to SSH `authorized_keys` without verifying the public key fingerprint with the key owner
- **MUST NOT** use `iptables` for new firewall configurations — use `nftables` exclusively
- **MUST NOT** run services as root — create dedicated service accounts with minimum required privileges
- **MUST NOT** store SSH private keys on remote systems or in version control
- **MUST NOT** use default credentials on any provisioned system — change all default passwords on first boot
- **MUST NOT** expose monitoring or management ports (Prometheus, Grafana, SSH) to the public internet without VPN or bastion host
- **MUST NOT** disable the firewall to "troubleshoot" — use targeted temporary rules and restore the baseline immediately after

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `kernel-tuning` | Configure kernel security parameters (kptr_restrict, perf_event_paranoid, etc.) |
| `resource-management` | Isolate workloads with cgroups to contain security breaches |
| `networking` | Configure firewall rules and network segmentation to complement security baselines |
| `hardware-provisioning` | Provision hardware with secure boot, TPM, and encrypted storage support |
| `observability` | Monitor security events and set alerts for policy violations |
