---
name: boot-sequence
description: Implements step-by-step diagnosis and optimization of the modern Linux boot process from UEFI through GRUB, initramfs, and systemd target initialization for production servers.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: linux
  triggers: boot process, systemd, grub2, initramfs, uefi boot, slow startup, boot troubleshooting, linux boot
  role: implementation
  scope: infrastructure
  output-format: code
  content-types: [code, guidance, config, do-dont]
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
  related-skills: systemd-services, linux-security, linux-networking
---

# Linux Boot Process Manager

Orchestrates the complete Linux boot sequence from hardware initialization through UEFI/BIOS, bootloader configuration (GRUB2/systemd-boot), initramfs generation, and systemd target activation. Provides diagnostic workflows and optimization strategies for production environments.

## TL;DR Checklist

- [ ] Verify UEFI vs BIOS mode and Secure Boot status with `fwupdmgr` or `mokutil --sb-state`
- [ ] Inspect bootloader configuration (`/boot/grub2/grub.cfg` or `/boot/loader/entries/`)
- [ ] Analyze initramfs composition using `lsinitrd` or `dracut --print-cmdline`
- [ ] Measure boot time with `systemd-analyze blame` and `systemd-analyze critical-chain`
- [ ] Audit systemd targets to ensure correct default runlevel (multi-user.target)
- [ ] Optimize slow-starting units via `systemd-analyze critical-chain` dependency tree

---

## When to Use

- Diagnosing prolonged boot times or hanging boot sequences in production
- Configuring bootloader parameters for kernel tuning, debugging, or recovery
- Setting up custom initramfs hooks for storage encryption (LUKS) or cloud-init provisioning
- Hardening the boot chain against unauthorized modifications (Secure Boot, signed kernels)
- Migrating from legacy SysVinit or GRUB legacy to UEFI + GRUB2/systemd-boot

---

## When NOT to Use

- Troubleshooting application-level service failures after boot completes — use `systemd-services` instead
- Managing runtime network configuration without rebooting — use `linux-networking` instead
- Containerized workloads that rely on host kernel boot parameters — delegate host boot optimization to this skill and container startup to orchestration tools

---

## Core Workflow

1. **Assess Firmware and Boot Mode** — Determine if the system boots in UEFI or Legacy BIOS mode. Check Secure Boot status.
   **Checkpoint:** `mokutil --sb-state` must confirm Secure Boot state. Mismatched architectures (x86_64 vs aarch64) require matching firmware binaries.

2. **Inspect and Tune Bootloader** — GRUB2 (`/etc/default/grub`) or systemd-boot (`/boot/loader/entries/`). Update kernel command line parameters for diagnostics or performance.
   **Checkpoint:** Run `grub2-mkconfig -o /boot/grub2/grub.cfg` (BIOS) or `grub2-mkconfig -o /boot/efi/EFI/*/grub.cfg` (UEFI) after edits. Verify syntax with `grub2-file --is-x86-64` if cross-checking.

3. **Audit and Rebuild Initramfs** — Examine current initramfs contents using `lsinitrd /boot/initramfs-$(uname -r).img`. Identify missing drivers or oversized filesystems.
   **Checkpoint:** Rebuild with `dracut --force` (RHEL/Rocky) or `mkinitcpio -P` (Arch/Manjaro) only after confirming storage and crypto modules are present. Validate with `lsinitrd | grep -E 'crypt|lvm|nvme'`.

4. **Measure Boot Performance** — Use systemd boot analyzers to isolate bottlenecks.
   **Checkpoint:** `systemd-analyze critical-chain` reveals serial dependencies blocking parallel unit activation. Focus optimization on units appearing on the longest critical path, not highest individual time.

5. **Configure Default Target** — Ensure the system boots to the correct operational state.
   **Checkpoint:** `systemctl get-default` must match intended workload (e.g., `multi-user.target` for servers, `graphical.target` for desktops). Verify no conflicting aliases exist in `/etc/systemd/system/default.target.wants/`.

6. **Implement Hardening** — Apply boot chain security controls.
   **Checkpoint:** Kernel parameters (`kernel.panic`, `kernel.kptr_restrict`) must be set via bootloader or kernel.sysctl drop-ins. Signed kernels require matching shim and GRUB signing infrastructure.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Boot Time Analysis and Optimization

```bash
#!/usr/bin/env bash
set -euo pipefail

# Analyze total boot time and list slowest services
echo "=== Total Boot Time ==="
systemd-analyze

echo -e "\n=== Critical Path (Serial Dependencies) ==="
systemd-analyze critical-chain

echo -e "\n=== Top 10 Slowest Units ==="
systemd-analyze blame | head -n 10

# Export diagnostic report for archival
systemd-analyze dump > /var/log/boot-analysis-$(date +%Y%m%d).txt 2>&1 || true

# Identify units that could be parallelized (missing After= or Wants= constraints)
echo -e "\n=== Units Missing Parallelization Hints ==="
systemd-analyze verify --no-pager systemd-* | grep -i "missing.*After\|Wants" || echo "No missing dependency hints found."
```

### Pattern 2: GRUB2 Kernel Parameter Tuning for Production Stability

```bash
#!/usr/bin/env bash
# Secure, idempotent kernel parameter injection via /etc/default/grub and drop-in overrides
set -euo pipefail

readonly GRUB_CONF="/etc/default/grub"

# Validate current parameters
declare -A TARGET_PARAMS=(
  ["kernel.panic"]="10"
  ["kernel.kptr_restrict"]="2"
  ["net.ipv4.tcp_syncookies"]="1"
)

for param in "${!TARGET_PARAMS[@]}"; do
  value="${TARGET_PARAMS[$param]}"
  # Extract existing value from kernel command line (handles spaces and quotes)
  current=$(cat /proc/cmdline | tr ' ' '\n' | grep "^${param}=" || echo "")
  
  if [[ "$current" != "${param}=${value}" ]]; then
    echo "Tuning ${param} -> ${value} (was: ${current:-unset})"
    # Use grubby for RHEL/CentOS/Rocky/Alma or manual sed for others
    if command -v grubby &>/dev/null; then
      grubby --update-kernel=ALL --args="${param}=${value}"
    else
      sed -i "s|^GRUB_CMDLINE_LINUX=\"\(.*\)\"|GRUB_CMDLINE_LINUX=\"\1 ${param}=${value}\"|" "$GRUB_CONF"
    fi
  fi
done

# Rebuild bootloader config if manually edited GRUB_CONF was modified
if grep -q "^GRUB_CMDLINE_LINUX=" "$GRUB_CONF"; then
  echo "Regenerating GRUB configuration..."
  grub2-mkconfig -o /boot/grub2/grub.cfg || grub2-mkconfig -o /boot/efi/EFI/*/grub.cfg 2>/dev/null || true
fi

echo "Boot parameter tuning complete."
```

### Pattern 3: systemd Drop-In Override for Early-Stage Service Optimization

```ini
# /etc/systemd/system/slow-service.service.d/optimize.conf
[Service]
# Prevent unnecessary disk I/O during boot by deferring non-critical tasks
ExecStartPre=/bin/bash -c 'exec > /dev/null 2>&1'
IOSchedulingClass=idle
CPUWeight=50

# Ensure strict ordering without blocking parallel boot unnecessarily
After=network-online.target
Wants=network-online.target
RequiresMountsFor=/var/lib/data
```

---

## Constraints

### MUST DO
- Always measure before optimizing: use `systemd-analyze critical-chain` to find serial bottlenecks, not just `blame`
- Preserve initramfs integrity: validate storage/crypto modules with `lsinitrd` before rebuilding
- Use `grubby` for kernel parameter management on RHEL-family systems; fall back to `/etc/default/grub` + `grub2-mkconfig` for Debian/Ubuntu
- Set default target explicitly via `systemctl set-default` and verify symlinks in `.wants/` directories
- Document all custom boot scripts in `/usr/lib/systemd/system-sleep/` or `/usr/lib/systemd/system-pre.target.wants/` with proper `[Install]` sections

### MUST NOT DO
- Never disable Secure Boot to bypass missing driver issues — compile and sign drivers instead (ELRepo, DKMS with MOK enrollment)
- Avoid blanket `Type=oneshot` or `RemainAfterExit=yes` for long-running daemons — use `Type=simple` or `Type=forking` with proper PID files
- Do not hardcode device names (`/dev/sda1`) in boot configurations — use UUIDs, LABELs, or `/dev/disk/by-id/` symlinks to prevent enumeration drift
- Never edit `/boot/grub2/grub.cfg` directly — it is auto-generated and will be overwritten on package updates or kernel bumps

---

## Related Skills

| Skill | Purpose |
|---|---|
| `systemd-services` | Runtime service management, journaling, unit creation |
| `linux-security` | File permissions, SELinux/AppArmor, firewall hardening post-boot |
| `linux-networking` | Network interface configuration, routing, DNS resolution |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [systemd Boot Process Documentation](https://www.freedesktop.org/software/systemd/man/latest/bootup.html)
- [GRUB2 Manual](https://www.gnu.org/software/grub/manual/grub/grub.html)
- [dracut Man Pages](https://man7.org/linux/man-pages/man8/dracut.8.html)
- [Linux Kernel Command Line Parameters](https://www.kernel.org/doc/html/latest/admin-guide/kernel-parameters.html)
- [UEFI Secure Boot Guide (tiano.org)](https://wiki.tianocore.org/wiki/Secure_Boot)
