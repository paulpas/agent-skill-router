---
name: systemd-boot
description: Analyzes and optimizes the systemd boot process including target management,
  boot time profiling with systemd-analyze, initramfs configuration, and custom boot-time
  unit creation for Linux systems.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: linux
  triggers: systemd boot, boot time optimization, systemd-analyze, target management,
    how do i speed up boot, dracut initramfs, rescue mode, boot logging
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
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - config
  - do-dont
  related-skills: linux-services, kernel-tuning, shell-process-management, linux-security
------
# Systemd Boot Process Manager

Senior Linux systems engineer analyzing and optimizing the systemd boot process. Diagnoses slow boots with `systemd-analyze` profiling tools, manages boot targets and runlevels, configures initramfs via dracut, creates custom boot-time units, and traces boot issues through persistent journal logs.

## TL;DR Checklist

- [ ] Run `systemd-analyze blame` to identify slowest services by startup time
- [ ] Run `systemd-analyze critical-chain` to find the blocking path on the boot timeline
- [ ] Set default target with `systemctl set-default multi-user.target` for headless servers
- [ ] Mask non-essential services that block early boot (`systemctl mask <service>`)
- [ ] Use `Type=notify` (not `Type=simple`) for long-startup services to allow parallel initialization
- [ ] Regenerate initramfs with `dracut --force` after adding/removing filesystem or LVM modules
- [ ] Boot logging: use `journalctl -b -0` for current boot, `journalctl -b -1` for previous boot
- [ ] Validate custom units with `systemd-analyze verify <unit>.service` before enabling

---

## When to Use

Use this skill when:

- A system has an excessively long boot time and you need to profile and optimize it
- You need to change the default boot target (e.g., switch from graphical to multi-user)
- The system fails to boot and you must enter rescue or emergency mode
- You need to create a custom service that must start early in the boot sequence
- initramfs configuration needs modification (LVM, LUKS, RAID, network boot)
- Boot-related issues require analysis via journal logs (`journalctl -b`)
- Diagnosing why a specific service is slow or blocking other services at boot
- Preparing a minimal headless server image with only essential boot units enabled

---

## When NOT to Use

Avoid this skill for:

- **Application-level startup issues** — If the app itself is slow (not systemd), use shell-process-management and resource-management instead
- **Container runtime optimization** — Containers do not use systemd; use container-specific tools
- **Kernel panic or early boot crash before systemd starts** — This requires kernel debugging (`dmesg`, `crash`), not systemd tools
- **GRUB/bootloader configuration** — That is handled by GRUB, not systemd (use `grub2-mkconfig`)
- **Post-boot performance tuning** — Use `kernel-tuning` for sysctl and CPU/memory optimization after the system is running

---

## Core Workflow

### 1. Profile the Boot Timeline

Capture the complete boot timeline to establish a baseline. This reveals total boot time, userspace time, firmware overhead, and the critical chain blocking path.

```bash
# Full boot analysis: total time, firmware, loader, kernel, userspace
systemd-analyze

# List all services sorted by startup time (slowest first)
systemd-analyze blame

# Show the single longest dependency chain blocking boot completion
systemd-analyze critical-chain

# Export full unit graph as SVG for visual analysis
systemd-analyze dot | dot -Tsvg > boot-dependency-graph.svg
```

**Checkpoint:** You have identified at least 3 services that each take more than 1 second to start, and the critical chain reveals which service is the actual bottleneck (not just the slowest).

### 2. Analyze Target Configuration

Determine which systemd target is the current default and whether it matches the system's purpose. A graphical workstation needs `graphical.target`; a production server needs `multi-user.target`.

```bash
# Check current default target
systemctl get-default

# List available targets and their descriptions
systemctl list-unit-files --type=target | grep enabled

# View dependencies of a specific target
systemctl list-dependencies multi-user.target

# See what pull graphical.target into the boot (graphical pulls from multi-user)
systemctl list-dependencies graphical.target --reverse
```

**Checkpoint:** Confirm that the default target aligns with system purpose — `multi-user.target` for headless servers, `graphical.target` only when a display manager is required.

### 3. Optimize Boot Time

Apply targeted optimizations based on profiling data from Steps 1–2. Prioritize changes that affect the critical chain over those affecting non-blocking services.

```bash
# Mask a non-essential service so it cannot start at boot (hard disabled)
systemctl mask bluetooth.service
systemctl modprobe@*.service    # prevents auto-loading of unused kernel modules

# Create a mask symlink for any service that blocks early userspace
ln -s /dev/null /etc/systemd/system/cups.service

# Set the default target to the minimal appropriate one
systemctl set-default multi-user.target

# Verify changes took effect
systemctl get-default
```

**Checkpoint:** After each optimization, re-run `systemd-analyze critical-chain` to confirm the bottleneck has shifted or resolved. Do not mask security-critical services (auditd, sshd).

### 4. Configure initramfs / Dracut

If boot delays are caused by early userspace — such as waiting for LVM volume groups, LUKS decryption prompts, or hardware detection — optimize the initramfs configuration.

```bash
# View current initramfs contents and modules
lsinitrd /boot/initramfs-$(uname -r).img | grep -E 'lvm|dm_mod|crypt'

# Regenerate initramfs with explicit module inclusion
dracut --force --add lvm cryptsetup mdadm

# Add kernel cmdline parameters for faster boot
# Edit /etc/dracut.conf.d/99-boot-optimize.conf:
cat << 'CONF' > /etc/dracut.conf.d/99-boot-optimize.conf
# Reduce initramfs size by excluding unnecessary modules
omit_drivers+="i915 nouveau radeon"

# Increase timeout for hardware detection (prevents hangs on missing devices)
hostonly="yes"

# Compress initramfs with zstd for faster decompression
compression="zstd"
CONF

# Regenerate after config changes
dracut --force

# Verify new initramfs is present and bootable
ls -lh /boot/initramfs-$(uname -r).img
```

**Checkpoint:** After regenerating initramfs, verify the system still boots. Always test initramfs changes on a non-critical system first or keep a known-good kernel entry in GRUB.

### 5. Create Custom Boot-Time Units

For services that must start at a specific point in the boot sequence, create custom units with explicit ordering and dependency directives. Use `systemd-generator` scripts for dynamic unit generation based on runtime conditions.

```ini
# /etc/systemd/system/my-app-preload.service
[Unit]
Description=Pre-load application data before main service starts
Documentation=https://www.freedesktop.org/software/systemd/man/systemd.service.html
DefaultDependencies=no
After=local-fs.target sysinit.target
Before=my-app.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/preload-data.sh
RemainAfterExit=yes
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

```bash
# Create a generator script for dynamic unit generation at boot
mkdir -p /etc/systemd/system-generators
cat << 'SCRIPT' > /etc/systemd/system-generators/generate-storage-checks
#!/bin/bash
# Systemd generator: creates units dynamically based on available block devices
GENERATORS_DIR="/sys/fs/cgroup/init.scope"

for dev in $(lsblk -dnpo NAME); do
    if [[ -b "$dev" ]] && blkid -o export "$dev" | grep -q "TYPE=btrfs"; then
        cat << EOF > "/run/systemd/system/btrfs-${dev##*/}.service"
[Unit]
Description=Btrfs check for ${dev}
DefaultDependencies=no
Before=local-fs.target

[Service]
Type=oneshot
ExecStart=/usr/sbin/btrfs scrub start $dev

[Install]
WantedBy=btrfs-scrub.target
EOF
    fi
done
SCRIPT

chmod 755 /etc/systemd/system-generators/generate-storage-checks
systemctl daemon-reexec
```

**Checkpoint:** Verify generated units with `systemd-analyze verify`. Check that `After=` and `Before=` directives do not create circular dependencies using `systemd-analyze critical-chain`.

### 6. Analyze Boot Logs

When boot issues occur, search the persistent journal for errors tied to specific boot phases. Use `-b` flag to select boot session.

```bash
# View all logs from the current boot
journalctl -b

# View logs from a previous boot (e.g., after an update that broke booting)
journalctl -b -1

# Filter for errors and warnings during boot
journalctl -b -p warning..emerg

# Show kernel messages with timestamps during boot
journalctl -b -k

# Search for a specific service failure in the current boot
journalctl -b _SYSTEMD_UNIT=my-app.service --priority=3

# Follow boot journal output in real-time (during reboot)
journalctl -f -b

# Export boot logs to file for analysis
journalctl -b > /var/log/boot-analysis-$(date +%Y%m%d).txt
```

**Checkpoint:** Correlate timestamps from `systemd-analyze critical-chain` with log entries to confirm that the identified slow service actually caused a downstream failure or delay.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Boot Time Analysis Deep Dive

Use all four `systemd-analyze` subcommands together for a complete diagnostic report. This is the standard approach before making any optimization changes.

```bash
#!/usr/bin/env bash
set -euo pipefail
# Boot audit script — generates a comprehensive boot analysis report

readonly REPORT_FILE="/var/log/boot-audit-$(date +%Y%m%d-%H%M%S).txt"

{
    echo "=== BOOT AUDIT REPORT ==="
    echo "Date: $(date)"
    echo "Kernel: $(uname -r)"
    echo ""
    
    echo "--- Total Boot Timeline ---"
    systemd-analyze
    echo ""
    
    echo "--- Top 15 Slowest Services ---"
    systemd-analyze blame | head -15
    echo ""
    
    echo "--- Critical Chain (blocking path) ---"
    systemd-analyze critical-chain | head -20
    echo ""
    
    echo "--- Default Target ---"
    systemctl get-default
    echo ""
    
    echo "--- Failed Units ---"
    systemctl --failed --no-pager
    echo ""
    
    echo "--- Boot Journal Errors (current boot) ---"
    journalctl -b -p err --no-pager | tail -20
    
} > "$REPORT_FILE"

echo "Boot audit report written to: $REPORT_FILE"
```

### Pattern 2: Parallelization with Type=notify

Long-startup services should use `Type=notify` instead of `Type=simple`. With `Type=notify`, systemd starts the service and immediately begins parallelizing other units — the service signals readiness when done rather than waiting for process exit.

```ini
# ❌ BAD: Type=simple blocks parallelization until the process exits
# For a service that takes 30s to warm up, every dependent service waits 30s.
[Unit]
Description=My Application Server
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/my-server --config /etc/myapp/config.yml
Restart=on-failure
```

```ini
# ✅ GOOD: Type=notify allows systemd to proceed with other units immediately.
# The application must call sd_notify(0, "READY=1") when fully ready.
[Unit]
Description=My Application Server
After=network.target

[Service]
Type=notify
ExecStart=/usr/bin/my-server --config /etc/myapp/config.yml
Restart=on-failure
NotifyAccess=all
```

### Pattern 3: WantedBy vs Requires Ordering

Use `.wants/` for soft dependencies (start together but don't block on failure) and `.requires/` for hard dependencies (fail the target if the unit fails). This distinction controls whether one service's failure cascades to others.

```bash
# Soft dependency: start after network, but if network.target fails,
# my-service can still run independently.
ln -s /usr/lib/systemd/system/my-app.service \
      /etc/systemd/system/multi-user.target.wants/my-app.service

# Hard dependency: if nginx.service fails, multi-user.target itself fails.
# This creates a strong ordering constraint in the critical chain.
ln -s /usr/lib/systemd/system/nginx.service \
      /etc/systemd/system/sshd.service.requires/nginx

# View what a target wants vs requires
ls -la /etc/systemd/system/multi-user.target.wants/
ls -la /etc/systemd/system/sshd.service.requires/

# Reload after creating symlinks
systemctl daemon-reload
```

### Pattern 4: Emergency Boot Override

When a misconfigured service prevents normal boot, create an emergency override to bypass it. This is different from rescue mode — you stay in the target but disable specific units.

```bash
# Emergency: mask a broken service to allow boot to proceed
systemctl mask broken-service.service

# Create an emergency drop-in that adds a timeout and retry
mkdir -p /etc/systemd/system/broken-service.service.d
cat << 'DROPIN' > /etc/systemd/system/broken-service.service.d/override.conf
[Service]
TimeoutStartSec=5
ExecStartPre=/usr/bin/test -f /run/emergency-boot
Restart=no
DROPIN

systemctl daemon-reload

# Or boot into rescue mode for manual recovery
# Append 'systemd.unit=rescue.target' to kernel cmdline in GRUB
# or use: systemctl rescue
```

---

## Constraints

### MUST DO
- Always run `systemd-analyze blame` and `critical-chain` before making optimization changes — do not guess what is slow
- Set the default target to `multi-user.target` on headless servers; never leave `graphical.target` on production infrastructure
- Use `Type=notify` for services with significant warmup time so systemd can parallelize other startup work
- Mask (not disable) non-essential services you want permanently off at boot — mask creates a symlink to `/dev/null` preventing any accidental enable
- Test initramfs changes (`dracut --force`) by verifying the resulting image exists and checking its contents with `lsinitrd`
- Use `set -euo pipefail` in all shell scripts for boot-time operations
- Back up `/etc/systemd/` directory before bulk modifications: `tar czf /root/systemd-backup-$(date +%F).tar.gz /etc/systemd/`
- Run `systemd-analyze verify` on custom unit files before enabling them to catch syntax and dependency errors

### MUST NOT DO
- Never mask `systemd-journald.service`, `systemd-udevd.service`, or `systemd-logind.service` — these are foundational boot components
- Do not disable `auditd` on systems requiring compliance (PCI-DSS, HIPAA) or security auditing
- Never set an initramfs without testing boot recovery — always keep a working kernel entry in GRUB
- Avoid hardcoding absolute paths in unit files — use `%i`, `%n`, and systemd path variables where possible
- Do not create circular dependencies with `After=` and `Before=` directives — verify with `systemd-analyze critical-chain`
- Never use `systemctl enable --now` for first-boot scripts — generators and order files are the correct mechanism for one-time early-boot tasks

---

## Output Template

When applying this skill to diagnose or optimize a boot issue, produce:

1. **Boot Timeline Summary** — Total time breakdown (firmware + loader + kernel + userspace) from `systemd-analyze`
2. **Top Bottleneck Services** — Top 3 services from `systemd-analyze blame`, ranked by elapsed time
3. **Critical Chain Analysis** — The blocking dependency path from `systemd-analyze critical-chain`, showing the sequence of units that determine total boot time
4. **Optimization Recommendations** — Specific actions: mask list, target change, initramfs changes, Type=notify conversion
5. **Verification Plan** — Commands to re-run analysis after each change to confirm improvement

---

## Related Skills

| Skill | Purpose |
|---|---|
| `linux-services` | Managing systemd service lifecycle, unit files, and socket activation beyond boot-time concerns |
| `kernel-tuning` | Post-boot kernel parameter optimization for CPU, memory, and network performance |
| `shell-process-management` | Process lifecycle management, signals, cgroups, and resource control for running services |
| `linux-security` | Security hardening that may affect boot (SELinux, secure boot, initramfs encryption) |

---

## Live References

> Authoritative documentation links for the systemd boot process. These sources are resolved at load time to provide detailed reference material.

- [systemd Boot Process Documentation](https://www.freedesktop.org/software/systemd/man/latest/systemd.html) — Official systemd manual and architecture overview
- [systemd-analyze Reference](https://www.freedesktop.org/software/systemd/man/latest/systemd-analyze.html) — Complete reference for all boot profiling subcommands
- [systemd.service(5) — Unit File Configuration](https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html) — Service unit file directives including Type=notify, WantedBy, and ordering
- [dracut Manual — Initramfs Generator](https://man7.org/linux/man-pages/man8/dracut.8.html) — Documentation for initramfs creation, module configuration, and kernel cmdline
- [systemd.generator(7) — Boot-Time Unit Generators](https://www.freedesktop.org/software/systemd/man/latest/systemd.generator.html) — How to create dynamic unit generators that produce units at boot time
- [Journalctl Reference](https://www.freedesktop.org/software/systemd/man/latest/journalctl.html) — Persistent journal query syntax and boot session filtering
- [Boot Chart Visualization](https://github.com/williamh/bootchart2) — Alternative boot timeline visualization using systemd integration
