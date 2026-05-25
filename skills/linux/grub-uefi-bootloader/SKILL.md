---
name: grub-uefi-bootloader
description: Configures GRUB2 bootloader for UEFI firmware boot processes including
  ESP management, Secure Boot signing, multi-boot setups, kernel parameters, and bootloader
  recovery procedures.
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
  triggers: grub2, UEFI boot, Secure Boot, EFI System Partition, bootloader recovery,
    how do i repair bootloader, efibootmgr, GRUB configuration, dual boot, shim signing
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: linux-services, linux-security, kernel-tuning, shell-process-management,
    cloud-linux-engineering
  maturity: stable
  completeness: 95
  exampleCount: 5
------
# GRUB2 and UEFI Bootloader Manager

System engineer managing the GRUB2 bootloader in UEFI environments — configuring boot entries, integrating Secure Boot via Shim signing, setting up multi-boot systems, tuning kernel parameters, performing recovery operations, and chain-loading network boot configurations.

## TL;DR Checklist

- [ ] Verify ESP is mounted at `/boot/efi` with FAT32 filesystem and 512 MiB minimum size
- [ ] Confirm UEFI firmware mode with `efibootmgr --verbose` before any bootloader changes
- [ ] Set kernel parameters in `/etc/default/grub`, never edit `grub.cfg` directly
- [ ] Generate new GRUB config with `grub-mkconfig -o /boot/grub2/grub.cfg` (RHEL) or `update-grub` (Debian)
- [ ] For Secure Boot: sign kernel and initramfs with `sbsign` using Shim/MOK key pair
- [ ] Validate boot entries with `efibootmgr` after every GRUB reinstall
- [ ] Test bootloader recovery procedure on non-production systems before relying on it

---

## When to Use

Use this skill when:

- **Installing or reinstalling GRUB2** on a UEFI system, including ESP layout and bootloader file placement
- **Repairing a broken bootloader** after a Windows update, disk change, or failed OS upgrade (chroot recovery)
- **Configuring dual-boot systems** with Linux alongside Windows or other operating systems
- **Integrating Secure Boot** by signing kernels, initramfs, and GRUB itself with MOK/Shim keys
- **Managing UEFI boot entries** — adding, deleting, reordering, or fixing broken NVRAM boot entries
- **Tuning kernel command line parameters** for console output, crash dumps, quiet splash, or network debugging
- **Setting up chain-loading** for iPXE, PXE network boot, or other bootloaders from within GRUB menu
- **Diagnosing boot failures** — missing ESP, incorrect UUID references in GRUB config, or firmware NVRAM corruption

---

## When NOT to Use

Avoid this skill for:

- **BIOS/legacy (MBR) boot systems** — use `grub-install` with a disk device target instead of EFI target; UEFI and BIOS are fundamentally different boot paths
- **Replacing GRUB entirely** — if you want systemd-boot, rEFInd, or another bootloader, that is a separate decision outside GRUB scope
- **Firmware-level issues** — if the system won't POST, has firmware bugs, or Secure Boot key enrollment is failing at UEFI level, diagnose in firmware first
- **Application-level boot problems** — services failing after boot, user session issues, or systemd unit failures are not bootloader concerns

Use `linux-security` for full Secure Boot key management including TPM integration and MOK enrollment workflows. Use `kernel-tuning` for deeper kernel parameter optimization beyond what GRUB passes at boot time.

---

## Core Workflow

### 1. Verify UEFI Mode and ESP Layout

Before any bootloader work, confirm the system is in UEFI mode and the EFI System Partition exists with correct properties.

```bash
# Check if booted in UEFI mode (file exists only on UEFI systems)
[[ -d /sys/firmware/efi ]] && echo "UEFI mode" || echo "Legacy BIOS mode"

# List all partitions and their types (look for EFI System type: EF00)
lsblk -o NAME,FSTYPE,SIZE,MOUNTPOINT,LABEL | grep -E 'efi|ESP'

# Check ESP mount point — should be FAT32 mounted at /boot/efi
mount | grep efivarfs  # UEFI variables filesystem
findmnt -T /boot/efi   # Verify what is mounted on ESP

# Typical ESP layout:
# /dev/nvme0n1p1   vfat   512M   /boot/efi   EFI

# Inspect ESP contents — should have GRUB and possibly other bootloaders
ls -la /boot/efi/EFI/
# Expected output:
# /boot/efi/EFI/BOOT/          — fallback boot directory
# /boot/efi/EFI/ubuntu/        — or distro-specific bootloader files
# /boot/efi/EFI/Microsoft/     — Windows bootloader (if dual-boot)

# Check current UEFI boot entries in NVRAM
sudo efibootmgr -v
```

**Checkpoint:** System is confirmed UEFI, ESP is FAT32 and mounted at `/boot/efi`, and `lsblk` shows at least one EFI System partition (type EF00). Proceed only if these conditions are met.

### 2. Configure GRUB Defaults

Edit `/etc/default/grub` to set kernel parameters, menu behavior, and visual options. Never edit `grub.cfg` directly — it is auto-generated and will be overwritten.

```bash
# Edit GRUB default configuration (Debian/Ubuntu)
sudoedit /etc/default/grub

# Key parameters to configure:
# ---------------------------------
GRUB_DEFAULT=0                          # Default menu entry (0-indexed) or "saved" with GRUB_SAVEDEFAULT
GRUB_TIMEOUT=5                          # Seconds before auto-booting default entry
GRUB_TIMEOUT_STYLE=menu                 # "menu" shows countdown; "hidden" hides it entirely
GRUB_DISTRIBUTOR="$(lsb_release -i -s 2> /dev/null || echo Debian)"
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash loglevel=3"
GRUB_CMDLINE_LINUX=""                   # Parameters for both default and recovery entries

# Common kernel parameters:
# console=tty0,console=ttyS0,115200n8  — Console output (local + serial)
# crashkernel=auto                       — Reserve memory for kdump crash dump capture
# rd.auto=1                              — Automatically discover and mount root devices
# nomodeset                              — Skip kernel mode setting (fallback for GPU issues)
# reboot=warm                            — Warm reboot instead of cold reset
# nosmp                                  — Disable SMP (single-core, debugging)

# For systemd-boot detection, disable GRUB's OS-prober scanning Windows
# GRUB_DISABLE_OS_PROBER=true           — Only if you manage boot entries manually via efibootmgr

# Save and regenerate GRUB configuration
sudo grub-mkconfig -o /boot/grub2/grub.cfg    # RHEL / Fedora / Arch
# OR
sudo update-grub                                # Debian / Ubuntu
```

**Checkpoint:** `/etc/default/grub` contains desired parameters, `grub.cfg` is regenerated successfully with no errors, and the new configuration includes expected kernel command line options. Verify by inspecting the generated file: `grep GRUB_CMDLINE_LINUX_DEFAULT /boot/grub2/grub.cfg`.

### 3. Install/Reinstall GRUB to ESP

Install GRUB EFI binary to the correct location on the ESP.

```bash
# Identify the ESP partition device
ESP_DEV=$(findmnt -n -o SOURCE /boot/efi)
echo "ESP device: $ESP_DEV"

# Install GRUB to UEFI target (this places grubx64.efi and related files on ESP)
sudo grub-install \
    --target=x86_64-efi \
    --efi-directory=/boot/efi \
    --bootloader-id=ubuntu \
    --recheck \
    --no-nvram

# Parameters explained:
# --target=x86_64-efi   — EFI x86_64 target (required for UEFI)
# --efi-directory       — Mount point of the ESP
# --bootloader-id       — Name of the directory under /boot/efi/EFI/ (becomes the NVRAM label)
# --recheck             — Re-check partition table even if cached
# --no-nvram            — Do not modify NVRAM boot entries (safe for manual entry management)

# Expected files installed:
# /boot/efi/EFI/ubuntu/grubx64.efi     — GRUB EFI binary (signed or unsigned)
# /boot/efi/EFI/ubuntu/shimx64.efi      — Shim bootloader (for Secure Boot chain)
# /boot/efi/EFI/ubuntu/grub.cfg         — Standalone copy of grub.cfg

# Verify installation
ls -la /boot/efi/EFI/ubuntu/
```

**Checkpoint:** `grubx64.efi` exists under `/boot/efi/EFI/<bootloader-id>/`, `grub.cfg` is present in the same directory, and no errors were reported by `grub-install`. If Secure Boot is enabled, verify signing (see Section 5).

### 4. Manage UEFI Boot Entries with efibootmgr

Add, remove, or reorder boot entries stored in firmware NVRAM.

```bash
# List all current boot entries with verbose file paths
sudo efibootmgr -v

# Expected output format:
# BootCurrent: 0001
# Timeout: 5 seconds
# BootOrder: 0001,0002,0000
# Boot0000* Windows Boot Manager — HD(1,GPT,...)/File(\EFI\MICROSOFT\BOOT\BOOTMGFW.EFI)
# Boot0001* ubuntu             — HD(1,GPT,...)/File(\EFI\UBUNTU\GRUBX64.EFI)
# Boot0002* rEFInd             — HD(1,GPT,...)/File(\EFI\REFIND\REFIND_X64.EFI)

# Add a new boot entry for GRUB (replace values from efibootmgr -v output)
sudo efibootmgr \
    --create \
    --disk /dev/nvme0n1 \
    --part 1 \
    --label "Ubuntu GRUB" \
    --loader '\EFI\ubuntu\grubx64.efi'

# Set boot order (first entry boots automatically)
sudo efibootmgr --bootorder 0001,0002,0000

# Delete a boot entry by number
sudo efibootmgr --deleteboot 0002

# Set timeout directly from NVRAM
sudo efibootmgr --timeout 10

# Enable/disable a boot entry (toggle the '*' asterisk)
sudo efibootmgr --bootnum 0003 --write-signature

# Reset boot order to default (distribution-specific)
sudo efibootmgr --bootorder "$(efibootmgr | grep BootOrder | cut -d',' -f1 | sed 's/BootOrder=//')"
```

**Checkpoint:** `efibootmgr -v` shows the desired boot entries with correct loader paths, and the boot order places preferred systems first. Verify the system boots into the intended default OS after a reboot.

### 5. Secure Boot Integration: Signing Kernels with Shim/MOK

When Secure Boot is enabled in firmware, all bootloader components must be signed with a trusted key enrolled in MOK (Machine Owner Key) or the Microsoft PK.

```bash
# --- Method 1: Using sbsign (manual signing workflow) ---

# Generate your own signing keys (one-time setup)
openssl req -new -x509 -newkey rsa:4096 -keyout MOK.priv \
    -outform DER -out MOK.der -nodes -days 36500 \
    -subj "/CN=Custom MOK Key/"

# Convert DER to PEM for use with mokutil
openssl x509 -in MOK.der -inform DER -out MOK.pem

# Sign the kernel
sudo sbsign --key MOK.priv --cert MOK.pem --output /boot/vmlinuz-$(uname -r) /boot/vmlinuz-$(uname -r)

# Sign the initramfs
sudo sbsign --key MOK.priv --cert MOK.pem --output /boot/initrd.img-$(uname -r) /boot/initrd.img-$(uname -r)

# Sign GRUB EFI binary
sudo sbsign --key MOK.priv --cert MOK.pem \
    --output /boot/efi/EFI/ubuntu/grubx64.efi \
    /usr/lib/grub/x86_64-efi-signed/grub-signed-x64.efi

# Enroll the MOK key via mokutil (triggers MOK Manager at next boot)
sudo mokutil --import MOK.der

# --- Method 2: Using sbctl (modern automated workflow — recommended) ---

# Install sbctl (Debian/Ubuntu: from source or AUR equivalent)
git clone https://github.com/antiwave/sbctl.git
cd sbctl
make && sudo make install

# Generate or import keys
sudo sbctl setup-keys

# Enroll the Microsoft PK to enable full Secure Boot (requires reboot)
sudo sbctl enroll-microsoft-keys

# Sign all relevant boot files automatically
sudo sbctl sign-all

# Verify signatures on boot files
sbctl verify /boot/vmlinuz-$(uname -r)
sbctl verify /usr/lib/grub/x86_64-efi-signed/grub-signed-x64.efi

# Expected output:
# ✓ /boot/vmlinuz-6.1.0-generic signed with key db.key
# ✓ /usr/lib/grub/x86_64-efi-signed/grub-signed-x64.efi signed with key db.key
```

**Checkpoint:** All boot components (`vmlinuz`, `initrd.img`, `grubx64.efi`) are signed and verify correctly. The MOK key is enrolled (visible via `mokutil --list-enrolled`). After reboot, Secure Boot should be active without requiring manual MOK Manager intervention.

### 6. Multi-Boot Configuration: Dual Boot with Windows

Configure GRUB to detect and chain-load Windows alongside Linux.

```bash
# Enable OS Prober to detect Windows installations
sudoedit /etc/default/grub
# Set (or uncomment):
GRUB_DISABLE_OS_PROBER=false

# Install os-prober if not already installed
sudo apt install os-prober ntfs-3g    # Debian/Ubuntu
sudo dnf install os-prober ntfs-utils  # RHEL/Fedora

# Manually detect additional OS installations
sudo os-prober
# Expected output:
# /dev/nvme0n1p3@/EFI/Microsoft/Boot/bootmgfw.efi:Windows Boot Manager:Windows:efi

# Regenerate GRUB configuration (now includes Windows entry)
sudo update-grub                    # Debian/Ubuntu
# OR
sudo grub-mkconfig -o /boot/grub2/grub.cfg  # RHEL/Fedora

# Verify the generated config contains the Windows menuentry
grep -A5 "Windows Boot Manager" /boot/grub/grub.cfg
```

**Checkpoint:** `os-prober` detects the Windows installation, `grub.cfg` includes a valid menu entry for Windows Boot Manager with correct EFI path. The system boots into GRUB menu showing both Linux and Windows options.

### 7. Bootloader Recovery via Chroot

Repair a broken bootloader when the system cannot boot into either OS. Use a live USB environment.

```bash
# --- Step 1: Boot from live USB and identify partitions ---
lsblk
# Expected layout:
# nvme0n1
# ├─nvme0n1p1  vfat   512M    /boot/efi    ← ESP
# ├─nvme0n1p2  ext4   50G     /            ← Linux root
# └─nvme0n1p3  ntfs   200G    C:           ← Windows

# --- Step 2: Mount the Linux root partition ---
sudo mount /dev/nvme0n1p2 /mnt

# --- Step 3: Bind-mount virtual filesystems for chroot ---
for dir in /dev /dev/pts /proc /sys /run; do
    sudo mount --bind "$dir" "/mnt$dir"
done

# --- Step 4: Mount the ESP (EFI System Partition) ---
sudo mount /dev/nvme0n1p1 /mnt/boot/efi

# --- Step 5: Enter the chroot environment ---
sudo chroot /mnt

# --- Step 6: Inside chroot — reinstall GRUB to ESP ---
grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=ubuntu --recheck

# --- Step 7: Regenerate GRUB config inside chroot ---
update-grub   # Debian/Ubuntu
# OR
grub-mkconfig -o /boot/grub2/grub.cfg  # RHEL/Fedora

# --- Step 8: Re-add NVRAM boot entry (if missing) ---
efibootmgr --create \
    --disk /dev/nvme0n1 \
    --part 1 \
    --label "Ubuntu" \
    --loader '\EFI\ubuntu\grubx64.efi'

# --- Step 9: Exit chroot and clean up ---
exit
sudo umount -R /mnt   # Unmount all bindings recursively

# --- Step 10: Reboot into repaired system ---
sudo reboot

# --- Verify recovery ---
# After boot, confirm:
efibootmgr -v | grep ubuntu   # Boot entry exists in NVRAM
cat /proc/cmdline             # Kernel parameters loaded correctly
```

**Checkpoint:** System boots successfully into the repaired installation. `efibootmgr` shows a valid GRUB entry, kernel parameters from `/etc/default/grub` are applied (check via `cat /proc/cmdline`), and both Linux and Windows are detectable.

---

## Implementation Patterns

### Pattern 1: Kernel Command Line Parameter Management

Use helper scripts to manage kernel parameters safely without manual editing of `/etc/default/grub`.

```bash
#!/usr/bin/env bash
# kernel-params.sh — Manage GRUB kernel command line parameters
# Usage: ./kernel-params.sh [--add <param>] [--remove <param>] [--show] [--verify]
set -euo pipefail

GRUB_CONF="/etc/default/grub"
PARAMS_FILE="/tmp/kernel_params_work"

usage() {
    echo "Usage: $0 [--add <key> | --remove <key> | --show | --verify]"
    echo ""
    echo "  --add <key>       Append parameter to GRUB_CMDLINE_LINUX_DEFAULT"
    echo "  --remove <key>    Remove parameter from GRUB_CMDLINE_LINUX_DEFAULT"
    echo "  --show            Display current kernel parameters"
    echo "  --verify          Verify parameters were applied after grub-mkconfig"
}

extract_default_params() {
    grep '^GRUB_CMDLINE_LINUX_DEFAULT=' "$GRUB_CONF" | sed 's/^GRUB_CMDLINE_LINUX_DEFAULT=//;s/^"//;s/"$//'
}

update_default_params() {
    local current="$1"
    local quoted="\"${current}\""
    sudo sed -i "s|^GRUB_CMDLINE_LINUX_DEFAULT=.*|GRUB_CMDLINE_LINUX_DEFAULT=${quoted}|" "$GRUB_CONF"
}

add_param() {
    local param="$1"
    local current
    current=$(extract_default_params)

    # Check if parameter already exists (avoid duplicates)
    if echo "$current" | grep -qw "$param"; then
        echo "Parameter '$param' already present. Skipping."
        return 0
    fi

    local new_params="${current:+$current }${param}"
    update_default_params "$new_params"
    echo "Added: $param → GRUB_CMDLINE_LINUX_DEFAULT=\"${new_params}\""

    # Regenerate config
    if command -v grub-mkconfig &>/dev/null; then
        sudo grub-mkconfig -o /boot/grub2/grub.cfg
    elif command -v update-grub &>/dev/null; then
        sudo update-grub
    fi
}

remove_param() {
    local param="$1"
    local current
    current=$(extract_default_params)

    if ! echo "$current" | grep -qw "$param"; then
        echo "Parameter '$param' not found. Skipping."
        return 0
    fi

    local new_params
    new_params=$(echo "$current" | sed "s/\\b${param}\\b//g; s/  */ /g; s/^ //; s/ $//")
    update_default_params "$new_params"
    echo "Removed: $param → GRUB_CMDLINE_LINUX_DEFAULT=\"${new_params}\"

    if command -v grub-mkconfig &>/dev/null; then
        sudo grub-mkconfig -o /boot/grub2/grub.cfg
    elif command -v update-grub &>/dev/null; then
        sudo update-grub
    fi
}

show_params() {
    local current
    current=$(extract_default_params)
    echo "Current GRUB_CMDLINE_LINUX_DEFAULT parameters:"
    echo "  $current"
    echo ""
    echo "Currently running kernel parameters (cat /proc/cmdline):"
    cat /proc/cmdline 2>/dev/null || echo "  (cannot read from live system)"
}

verify_params() {
    local current
    current=$(extract_default_params)
    local quoted="\"${current}\""

    # Check generated config matches defaults
    if command -v grub-mkconfig &>/dev/null; then
        if grep -q "GRUB_CMDLINE_LINUX_DEFAULT=${quoted}" /boot/grub2/grub.cfg 2>/dev/null; then
            echo "✓ Generated grub.cfg matches /etc/default/grub"
        else
            echo "⚠ WARNING: grub.cfg may not reflect current /etc/default/grub settings"
            echo "  Run 'sudo update-grub' or 'sudo grub-mkconfig -o /boot/grub2/grub.cfg'"
        fi
    elif command -v update-grub &>/dev/null; then
        if grep -q "GRUB_CMDLINE_LINUX_DEFAULT=${quoted}" /boot/grub/grub.cfg 2>/dev/null; then
            echo "✓ Generated grub.cfg matches /etc/default/grub"
        else
            echo "⚠ WARNING: grub.cfg may not reflect current settings"
        fi
    fi

    # Show running kernel params for comparison
    local running
    running=$(cat /proc/cmdline 2>/dev/null || echo "")
    if [[ -n "$running" ]]; then
        echo ""
        echo "Running kernel cmdline:"
        echo "  $running"
        # Check if new parameters appear in running system
        for p in $current; do
            if echo "$running" | grep -qw "$p"; then
                echo "  ✓ $p present in running kernel"
            fi
        done
    fi
}

# Argument parsing
case "${1:-}" in
    --add)
        [[ -z "${2:-}" ]] && { echo "Error: --add requires a parameter name" >&2; exit 1; }
        add_param "$2"
        ;;
    --remove)
        [[ -z "${2:-}" ]] && { echo "Error: --remove requires a parameter name" >&2; exit 1; }
        remove_param "$2"
        ;;
    --show) show_params ;;
    --verify) verify_params ;;
    *) usage ;;
esac
```

### Pattern 2: iPXE Chain-Loading from GRUB

Configure GRUB to chain-load an iPXE bootloader for network-based installation or PXE boot.

```bash
# --- Step 1: Download and prepare iPXE image ---
sudo mkdir -p /boot/efi/EFI/ipxe
sudo wget -O /boot/efi/EFI/ipxe/ipxe-x86_64.efi \
    https://rom-o-matic.net/generate/ipxe-x86_64.efi?options=pni%20sse4.1%20pxe%20ndis

# Alternative: build iPXE from source with specific options
# git clone https://github.com/ipxe/ipxe.git
# cd ipxe/src
# make -j$(nproc) EMBED=netboot.ipxe bin/x86_64-efi/ipxe.efi

# --- Step 2: Create iPXE config that PXE boots from a specified server ---
cat > /boot/eth0.ipxe << 'IPXEOF'
#!ipxe
# iPXE script: boot from network via DHCP + TFTP/PXE
# Customize NEXTSERVER and image URL as needed

set next-server 192.168.1.10
imgfetch tftp://${next-server}/boot/vmlinuz /vmlinuz
imgfetch tftp://${next-server}/boot/initrd.img /initrd.img
boot || echo "Boot failed" && shell
IPXEOF

# --- Step 3: Add GRUB menu entry for iPXE chain-load ---
cat >> /etc/grub.d/40_custom << 'GRUBEOF'

menuentry "Network Boot (iPXE)" --class network {
    set root=(hd0,gpt1)
    linux16 /EFI/ipxe/ipxe-x86_64.efi
}
GRUBEOF

# --- Step 4: Regenerate GRUB configuration ---
sudo update-grub   # Debian/Ubuntu
# OR
sudo grub-mkconfig -o /boot/grub2/grub.cfg  # RHEL/Fedora

# Verify the iPXE entry appears in the menu
grep -A3 "Network Boot" /boot/grub/grub.cfg
```

**Checkpoint:** `ipxe-x86_64.efi` exists on ESP, `/etc/grub.d/40_custom` contains the chain-load entry, and `grub.cfg` includes a "Network Boot (iPXE)" menuentry. The iPXE script points to a valid TFTP server with bootable kernel + initramfs images.

### Pattern 3: Boot Failure Diagnostics Script

Automated diagnostics for common GRUB/UEFI boot issues.

```bash
#!/usr/bin/env bash
# grub-diag.sh — Diagnose UEFI/GRUB boot configuration issues
set -euo pipefail

PASS=0
WARN=0
FAIL=0

check() {
    local desc="$1" cmd="$2"
    echo -n "  [CHECK] $desc ... "
    if eval "$cmd" &>/dev/null; then
        echo "OK"
        ((PASS++))
    else
        echo "FAILED"
        ((FAIL++))
    fi
}

warn() {
    local desc="$1"
    echo -n "  [WARN]  $desc ... "
    if eval "${2:-true}" &>/dev/null; then
        echo "OK"
        ((PASS++))
    else
        echo "ISSUE DETECTED"
        ((WARN++))
    fi
}

echo "=== GRUB/UEFI Boot Diagnostics ==="
echo ""

# UEFI mode verification
echo "--- UEFI Environment ---"
if [[ -d /sys/firmware/efi ]]; then
    echo "  System booted in UEFI mode ✓"
else
    echo "  WARNING: Not booted in UEFI mode (checking BIOS compatibility) ..."
fi

# ESP presence and mount
echo ""
echo "--- EFI System Partition ---"
ESP_MOUNT=$(findmnt -n -o TARGET /boot/efi 2>/dev/null || echo "")
if [[ -n "$ESP_MOUNT" ]]; then
    echo "  ESP is mounted at $ESP_MOUNT ✓"
else
    echo "  WARNING: ESP not mounted at /boot/efi — check mount points"
fi

# Check ESP filesystem type (must be FAT32)
ESP_FS=$(findmnt -n -o FSTYPE /boot/efi 2>/dev/null || echo "")
if [[ "$ESP_FS" == "vfat" ]]; then
    echo "  ESP filesystem is FAT32 ✓"
elif [[ -z "$ESP_FS" ]]; then
    echo "  WARNING: Cannot determine ESP filesystem type (not mounted?)"
else
    echo "  ERROR: ESP is $ESP_FS (expected vfat/FAT32)"
fi

# ESP size check (minimum 512 MiB recommended)
if [[ -n "$ESP_MOUNT" ]]; then
    ESP_SIZE_KB=$(df --output=size /boot/efi | tail -1)
    ESP_SIZE_MB=$((ESP_SIZE_KB / 1024))
    echo "  ESP size: ${ESP_SIZE_MB} MiB"
    if [[ $ESP_SIZE_MB -lt 512 ]]; then
        echo "  WARNING: ESP is less than 512 MiB — consider enlarging it"
    fi
fi

# GRUB configuration files
echo ""
echo "--- GRUB Configuration ---"
if [[ -f /etc/default/grub ]]; then
    echo "  /etc/default/grub exists ✓"
else
    echo "  ERROR: /etc/default/grub not found"
fi

if [[ -f /boot/grub/grub.cfg ]] || [[ -f /boot/grub2/grub.cfg ]]; then
    GRUB_CFG=$(ls /boot/grub/grub.cfg /boot/grub2/grub.cfg 2>/dev/null | head -1)
    echo "  Generated grub.cfg found at $GRUB_CFG ✓"
else
    echo "  ERROR: No generated grub.cfg found"
fi

# GRUB EFI binary presence
echo ""
echo "--- GRUB EFI Binary ---"
for efi_path in \
    /boot/efi/EFI/ubuntu/grubx64.efi \
    /boot/efi/EFI/fedora/grubx64.efi \
    /boot/efi/EFI/arch/grubx64.efi \
    /boot/efi/EFI/Microsoft/Boot/bootmgfw.efi \
    /boot/efi/EFI/BOOT/shimx64.efi; do
    if [[ -f "$efi_path" ]]; then
        echo "  Found: $efi_path"
    fi
done

if [[ ! -f /boot/efi/EFI/ubuntu/grubx64.efi ]] && \
   [[ ! -f /boot/efi/EFI/fedora/grubx64.efi ]] && \
   [[ ! -f /boot/efi/EFI/arch/grubx64.efi ]]; then
    echo "  WARNING: No distro-specific grubx64.efi found on ESP"
fi

# UEFI boot entries
echo ""
echo "--- UEFI Boot Entries (NVRAM) ---"
if command -v efibootmgr &>/dev/null; then
    sudo efibootmgr -v 2>/dev/null || echo "  Cannot read NVRAM entries (requires root)"
else
    echo "  WARNING: efibootmgr not installed — cannot verify UEFI boot entries"
fi

# Summary
echo ""
echo "--- Diagnostics Summary ---"
echo "  Passed: $PASS"
echo "  Warnings: $WARN"
echo "  Failed: $FAIL"
echo ""
if [[ $FAIL -gt 0 ]]; then
    echo "  ⚠ Boot issues detected. Review failed checks above."
else
    echo "  ✓ No critical issues found."
fi
```

### Pattern 4: GRUB Rescue Mode Commands

When GRUB fails to load normally, use the built-in rescue shell to manually locate and boot the system.

```
# --- GRUB Rescue Shell Prompt ---
# grub rescue>

# Step 1: Find the partition containing GRUB modules
set prefix=(hd0,gpt2)/boot/grub
insmod normal

# Step 2: If step 1 fails, search for the correct root partition
ls (hd0,gpt1)/          # List files on partition — look for EFI/ or grub/ directories
ls (hd1,gpt2)/boot/grub/modules/   # Check common paths

# Step 3: Set variables manually
set root='hd0,gpt2'
set prefix='/boot/grub'

# Step 4: Load required modules
insmod ext2              # Or: insmod fat (for ESP), insmod ntfs
insmod linux             # For loading kernel
insmod gzio              # For compressed initramfs (.gz)
insmod all_video         # For video output
insmod efi_gop           # For EFI GOP video mode

# Step 5: Boot the kernel manually
linux /vmlinuz-6.1.0-generic root=UUID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx ro quiet splash
initrd /initrd.img-6.1.0-generic
boot

# --- Alternative: Using ls to identify partitions ---
# grub rescue> ls
# (hd0,gpt1) (hd0,gpt2) (hd0,gpt3) (hd1) (hd1,gpt1)

# grub rescue> ls (hd0,gpt1)/
# EFI/    boot/   config.txt

# grub rescue> ls (hd0,gpt2)/
# boot/    dev/     etc/     home/    lib/     root/    var/     vmlinuz  initrd.img

# So: hd0,gpt2 is the Linux root with kernel and initrd
set root='hd0,gpt2'
linux /vmlinuz-6.1.0-generic root=/dev/nvme0n1p2 ro quiet splash
initrd /initrd.img-6.1.0-generic
boot
```

**Checkpoint:** In rescue mode, manually setting `root`, `prefix`, and loading modules allows booting the system. After recovery, run the full reinstall workflow (Core Workflow Step 3 + 4) to make the configuration persistent.

---

## Constraints

### MUST DO

- **MUST** always edit `/etc/default/grub` for kernel parameter changes — never modify `grub.cfg` directly as it is auto-generated
- **MUST** use `grub-mkconfig -o /boot/grub2/grub.cfg` (RHEL/Fedora) or `update-grub` (Debian/Ubuntu) after any `/etc/default/grub` changes
- **MUST** verify ESP is FAT32 and mounted at `/boot/efi` before installing GRUB to UEFI target
- **MUST** use `--target=x86_64-efi` when running `grub-install` on UEFI systems — never omit this parameter
- **MUST** verify NVRAM boot entries with `efibootmgr -v` after every GRUB reinstall or bootloader modification
- **MUST** back up the existing ESP contents (`cp -a /boot/efi /boot/efi.backup`) before reformatting or replacing the ESP
- **MUST** ensure both Linux and Windows boot entries are present in NVRAM for dual-boot systems
- **MUST** test kernel parameter changes with `grub-mkconfig` regeneration before relying on them in production

### MUST NOT DO

- **MUST NOT** edit `/boot/grub/grub.cfg` directly — any changes will be overwritten by the next `update-grub` or `grub-mkconfig` run
- **MUST NOT** disable Secure Boot without first signing all boot components with a trusted key pair
- **MUST NOT** format the ESP as ext4, btrfs, or any non-FAT filesystem — UEFI firmware requires FAT32 (FAT16/FAT12) for EFI binaries
- **MUST NOT** run `grub-install` on a BIOS/legacy system with `--target=x86_64-efi` — mismatch between firmware mode and target causes silent boot failure
- **MUST NOT** remove the `EFI/BOOT/BOOTX64.EFI` fallback file unless explicitly replacing it with another bootloader
- **MUST NOT** disable OS Prober (`GRUB_DISABLE_OS_PROBER=true`) without manually adding all required boot entries via `efibootmgr`
- **MUST NOT** set GRUB timeout to 0 without setting `GRUB_TIMEOUT_STYLE=hidden` — zero timeout with visible menu causes immediate unexpected default boot

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `linux-security` | Full Secure Boot key management including TPM integration, MOK enrollment, and firmware policy configuration |
| `kernel-tuning` | Deeper kernel parameter optimization beyond what GRUB passes at boot time (sysctl, cgroup tuning) |
| `shell-process-management` | Managing shell environments, process groups, and scripting patterns for bootloader automation scripts |
| `linux-services` | Systemd integration with boot ordering, emergency targets, and initramfs service configuration |
| `cloud-linux-engineering` | Cloud-init boot customization, cloud provider EFI image handling, and automated provisioning workflows |

---

## Live References

> Authoritative documentation links for GRUB2 and UEFI bootloader management. The model follows markdown links at load time to resolve external references and inline content.

- [GNU GRUB Manual](https://www.gnu.org/software/grub/manual/grub/) — Complete official GRUB reference manual covering configuration, rescue mode, and scripting
- [GRUB EFI Installation Guide](https://www.gnu.org/software/grub/manual/grub/html_node/EFI_002fUEFI-installation.html) — Official UEFI target installation instructions
- [efibootmgr Manual Page](https://man7.org/linux/man-pages/man8/efibootmgr.8.html) — Complete reference for UEFI NVRAM boot entry management
- [systemd Boot Loader Specification](https://www.freedesktop.org/software/systemd/man/latest/systemd-boot.html) — Standard for EFI boot loader interfaces on Linux
- [Secure Boot and Shim Documentation](https://github.com/rhboot/shim) — Microsoft Secure Boot chain, MOK manager, and key enrollment details
- [ipxe Documentation](https://ipxe.org/manual) — iPXE bootloader documentation for network boot and PXE configuration
- [UEFI Specification (EDK II)](https://uefi.org/specifications) — Official UEFI firmware specification defining EFI system partition layout and boot process
