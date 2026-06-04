---
name: on-prem-infrastructure
description: Engineers on-premises infrastructure including IPMI/iLO/iDRAC remote
  management, PXE deployment, network storage (NFS/iSCSI/FC), multipath I/O, and datacenter
  physical operations for bare-metal Linux systems.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: linux
  triggers: IPMI, iLO, iDRAC, PXE boot, iSCSI, multipath, bare-metal provisioning,
    datacenter rack
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
  related-skills: hardware-provisioning, networking, kernel-tuning, linux-security
  maturity: draft
  completeness: 90
  exampleCount: 6
---
# On-Premises Infrastructure Engineering

Infrastructure engineer managing physical servers, datacenter operations, and network-attached hardware for on-premises Linux environments — covering remote management (IPMI/iLO/iDRAC), PXE deployment, network storage (NFS/iSCSI/FC), multipath I/O, and datacenter physical operations.

## TL;DR Checklist

- [ ] Verify BMC/management interface accessibility via IPMI before any remote hardware operation
- [ ] Configure multipath I/O for all SAN-attached storage with appropriate failover policy
- [ ] Set up NFS mounts with hard/async or soft/sync options matching workload criticality
- [ ] Test PXE boot workflow with a non-production host before mass deployment
- [ ] Validate NTP/PTP synchronization across all on-prem systems for time-sensitive operations
- [ ] Check thermal and power metrics (sensors, PDU) before any hardware replacement procedure
- [ ] Document datacenter rack position, U slot, cable IDs, and BMC IP for every server

---

## When to Use

Use this skill when:

- **Managing remote server hardware** — You need to interact with IPMI, iLO, or iDRAC interfaces for power control, console access, or hardware diagnostics
- **Deploying OS at scale** — You need to set up PXE boot infrastructure for network-based operating system installation across multiple bare-metal servers
- **Configuring network-attached storage** — You need to set up NFS mounts, iSCSI targets/initiators, or Fibre Channel HBA configuration
- **Troubleshooting on-prem storage** — SAN/NAS connectivity issues, multipath I/O problems, or HBA firmware/configuration
- **Datacenter physical operations** — You need guidance on rack positioning, cable management, power/cooling considerations, or hardware replacement procedures
- **Hardware diagnostics at scale** — You need to run ECC memory tests, thermal monitoring, or SMART analysis across many servers

---

## When NOT to Use

Avoid this skill for:

- **Cloud instance provisioning** — Use `hardware-provisioning` for cloud instances (AWS EC2, GCP, Azure VMs)
- **Virtual network configuration** — Use `networking` for bond interfaces, VLANs, and nftables firewall rules
- **Kernel parameter tuning** — Use `kernel-tuning` for TCP stack, filesystem, or I/O scheduler parameters
- **Software application development** — This skill covers infrastructure, not application-level concerns

Use `hardware-provisioning` for RAID array configuration (local storage), SSD optimization, and initial workload-to-hardware matching. Use `hardware-provisioning` when the task is about selecting or sizing hardware before deployment.

---

## Core Workflow

### 1. Verify Management Interface Accessibility

Before any remote hardware operation, confirm the BMC/management interface is reachable and responsive.

```bash
# Test IPMI connectivity to BMC
sudo ipmitool -I lanplus -H <BMC_IP> -U <username> -P '<password>' chassis power status

# If IPMI over LAN is blocked, try serial-over-LAN (SOL)
sudo ipmitool -I lanplus -H <BMC_IP> -U <username> -P '<password>' sol activate

# For iLO (HPE) — use the hponcfg or ipmitool with iLO-specific commands
sudo ipmitool -I lanplus -H <ILO_IP> -U admin chassis power status

# For iDRAC (Dell) — check iDRAC specific sensors and alerts
sudo ipmitool -I lanplus -H <IDRAC_IP> -U root sdr type "Temperature"
sudo ipmitool -I lanplus -H <IDRAC_IP> -U root event list

# Bulk check all BMCs from an inventory file
while IFS=',' read -r hostname bmc_ip bmc_user bmc_pass; do
    status=$(sudo ipmitool -I lanplus -H "$bmc_ip" -U "$bmc_user" -P "$bmc_pass" chassis power status 2>&1)
    echo "$hostname | BMC: $bmc_ip | Power: $status"
done < /opt/inventory/bmc_hosts.csv
```

**Checkpoint:** All target BMCs respond to basic IPMI commands. If a BMC is unreachable, verify network connectivity to the management VLAN (typically UDP port 623) and that the BMC is powered on.

### 2. Assess Hardware Health via BMC and Sensors

Gather a comprehensive hardware health picture before making changes or planning maintenance.

```bash
# Comprehensive hardware health check script
# Usage: ./hardware-health-check.sh [--bmc <ip> --user <u> --pass <p>] [--local]

set -euo pipefail

BMC_IP="${BMC_IP:-}"
BMC_USER="${BMC_USER:-}"
BMC_PASS="${BMC_PASS:-}"
MODE="${1:---local}"

check_local_health() {
    echo "=== Local Hardware Health ==="

    # CPU temperatures and fan speeds via lm-sensors
    echo "--- Thermal Sensors ---"
    sudo sensors 2>/dev/null || echo "lm-sensors not configured. Run: sudo sensors-detect"

    # SMART health for all disks
    echo "--- Disk SMART Health ---"
    for dev in /dev/sd* /dev/nvme*; do
        [[ -b "$dev" ]] || continue
        echo -n "$dev: "
        sudo smartctl -H "$dev" 2>/dev/null | grep -oP 'Overall-health.*?\K.*' || echo "N/A"
    done

    # ECC memory errors (if available)
    echo "--- Memory Error Counts ---"
    if command -v edac-util &>/dev/null; then
        edac-util -v 2>/dev/null || echo "EDAC not reporting errors"
    elif [[ -f /sys/devices/system/edac/mc/mc*/csrow*/ch*_ce_count ]]; then
        echo "Correctable errors:"
        cat /sys/devices/system/edac/mc/mc*/csrow/*/ch*_ce_count 2>/dev/null || echo "N/A"
    else
        echo "EDAC interface not available — ECC error monitoring requires kernel support"
    fi

    # PSU status via DMI
    echo "--- PSU Status ---"
    sudo ipmitool sdr type "Power Supply" 2>/dev/null || echo "IPMI not available for PSU check"
}

check_bmc_health() {
    echo "=== BMC-Managed Hardware Health ==="

    # SEL (System Event Log) — critical for failure forensics
    echo "--- System Event Log (last 20 entries) ---"
    sudo ipmitool -I lanplus -H "$BMC_IP" -U "$BMC_USER" -P "$BMC_PASS" sel list 2>/dev/null | tail -20

    # FRU (Field Replaceable Unit) information
    echo "--- Field Replaceable Unit Info ---"
    sudo ipmitool -I lanplus -H "$BMC_IP" -U "$BMC_USER" -P "$BMC_PASS" fru print 2>/dev/null || echo "FRU info unavailable"

    # Asset tag
    echo "--- Asset Information ---"
    sudo ipmitool -I lanplus -H "$BMC_IP" -U "$BMC_USER" -P "$BMC_PASS" fru print "Asset Tag" 2>/dev/null || echo "Asset tag unavailable"

    # Power supply status
    echo "--- Power Supplies ---"
    sudo ipmitool -I lanplus -H "$BMC_IP" -U "$BMC_USER" -P "$BMC_PASS" sdr type "Power Supply" 2>/dev/null

    # Thermal status
    echo "--- Thermal Readings ---"
    sudo ipmitool -I lanplus -H "$BMC_IP" -U "$BMC_USER" -P "$BMC_PASS" sdr type "Temperature" 2>/dev/null
}

case "$MODE" in
    --local)   check_local_health ;;
    --bmc)     check_bmc_health ;;
    *)         check_local_health; check_bmc_health ;;
esac
```

**Checkpoint:** SEL logs are reviewed for recurring errors, SMART health is green for all disks, and thermal readings are within manufacturer specifications. Any anomalies are documented before proceeding.

### 3. Configure Network-Attached Storage

Set up the appropriate network storage protocol based on workload requirements.

```bash
# =============================================
# Pattern 1: NFS Mount Configuration
# =============================================

# NFS mount options — choose based on workload:
# hard,intr     — Retry forever on server failure (databases, filesystems)
# soft,timeo=N  — Return errors after timeout (non-critical, interactive)
# async         — Improve write performance (non-critical data)
# sync          — Guarantee writes are flushed (critical data)
# noatime       — Skip access time updates (performance)

# /etc/fstab entry for NFS
cat >> /etc/fstab << 'FSTAB'
# Production database storage — hard mount, noatime, sync
server1.example.com:/data/db     /mnt/db    nfs4  hard,intr,rsize=131072,wsize=131072,noatime,sync  0 0

# General file storage — hard mount, async, noatime
server1.example.com:/data/files  /mnt/files nfs4  hard,intr,rsize=131072,wsize=131072,noatime,async 0 0

# Temporary/scratch storage — soft mount, async, noatime
server2.example.com:/data/scratch /mnt/scratch nfs4 soft,timeo=50,retrans=2,noatime,async 0 0
FSTAB

# Verify mount
sudo mount -a
df -h /mnt/db /mnt/files /mnt/scratch

# NFS client performance tuning
cat > /etc/sysctl.d/99-nfs-client.conf << 'SYSCTL'
# NFS client socket buffer tuning
net.core.rmem_max = 16777216
net.core.rmem_default = 1048576
net.core.wmem_max = 16777216
net.core.wmem_default = 1048576
# NFS mount timeout tuning
fs.nfs.tcp_write_timeout_min = 1000
fs.nfs.tcp_read_timeout_list = 600 1000 2000 4000
SYSCTL
sudo sysctl -p /etc/sysctl.d/99-nfs-client.conf

# =============================================
# Pattern 2: iSCSI Initiator Configuration
# =============================================

# Install iSCSI initiator tools
sudo apt install -y open-iscsi iscsadm   # Debian/Ubuntu
sudo dnf install -y iscsi-initiator-utils # RHEL/CentOS/Alma

# Discover targets on the iSCSI network
iscsiadm -m discovery -t st -p 10.100.50.10:3260
iscsiadm -m discovery -t st -p 10.100.50.11:3260

# Log into discovered targets (persistent across reboots)
iscsiadm -m node -T iqn.2001-04.com.example:storage.disk1 --login

# Set initiator name in config
cat > /etc/iscsi/initiatorname.iscsi << 'INITIATOR'
InitiatorName=iqn.2025-01.local:hostname.example.com
INITIATOR

# Configure CHAP authentication (required by most SAN arrays)
cat > /etc/iscsi/iscsid.conf << 'ISCSID'
# CHAP authentication to target
node.session.auth.authmethod = CHAP
node.session.auth.username = initiator_user
node.session.auth.password = secret_password

# Enable multipath-friendly path detection
node.conn[0].timeo.noop_out_interval = 5
node.conn[0].timeo.noop_out_timeout = 5
node.conn[0].timeo.initial_r2t_time = 0
ISCSID

# =============================================
# Pattern 3: Multipath I/O Configuration
# =============================================

# Install and configure multipath-tools
sudo apt install -y multipath-tools   # Debian/Ubuntu
sudo dnf install -y device-mapper-multipath  # RHEL/CentOS

# Start multipath service
sudo systemctl enable --now multipathd

# Configure multipath
cat > /etc/multipath.conf << 'MULTIPATH'
defaults {
    user_friendly_names yes
    find_multipaths yes
    max_fds 8192
}

devices {
    device {
        vendor                  "DELL"
        product                 "MD38xx"
        path_checker            tur
        path_selector           "service-time 0"
        hardware_handler        "1 alua"
        failback                immediate
        no_path_retry           18
        rr_weight               priorities
        features                "1 queue_if_no_path"
        prio                    alua
    }
    device {
        vendor                  "HPE"
        product                 "P6000"
        path_checker            tur
        path_selector           "service-time 0"
        hardware_handler        "1 alua"
        failback                immediate
        no_path_retry           18
        prio                    alua
    }
    device {
        vendor                  "NETAPP"
        product                 "LUN"
        path_checker            tur
        path_selector           "service-time 0"
        hardware_handler        "1 alua"
        failback                immediate
        no_path_retry           18
        prio                    alua
    }
}

blacklist {
    devnode "^sda"          # Exclude local OS disk
    devnode "^nvme[0-9]n1"  # Exclude local NVMe
}
MULTIPATH

# Reload and verify multipath
sudo multipath -r
sudo multipath -ll

# Expected output shows multiple paths per device with failover
# dm-0 (3600601603e1d2800d6e9f0a1b3c4d5e6) dm-0 DEVEL,MD38xx
# size=2.0T features='1 queue_if_no_path' hwhandler='1 alua'
# \_ round-robin 0 [prio=200][active]
#   \_ 3:0:0:0 sdb 8:16  [ready][running]
#   \_ 4:0:0:0 sdc 8:32  [ready][running]
```

**Checkpoint:** All storage paths are visible via `multipath -ll`, the device is marked active, and failover paths are ready. For NFS, verify the mount with `mount | grep nfs` and test read/write operations.

### 4. Configure PXE Boot Infrastructure

Set up network-based OS deployment for bare-metal server provisioning.

```bash
# =============================================
# PXE Boot Infrastructure Setup
# =============================================
# Components needed:
#   - DHCP server (isc-dhcp-server or dnsmasq)
#   - TFTP server (tftpd-hpa or dnsmasq)
#   - HTTP/HTTPS server (nginx/apache) for install media
#   - Kickstart/PXE config files

# --- Step 1: DHCP Configuration ---
cat > /etc/dhcp/dhcpd.conf << 'DHCPD'
# PXE boot DHCP configuration
authoritative;

# Option for PXE client to find TFTP server
option tftp-server-name "10.0.1.20";
option bootfile-name "pxelinux.0";

subnet 10.0.1.0 netmask 255.255.255.0 {
    range 10.0.1.100 10.0.1.200;
    option routers 10.0.1.1;
    option domain-name-servers 10.0.1.53, 8.8.8.8;

    # PXE boot group — all hosts
    next-server 10.0.1.20;

    # Per-host PXE entries (optional, for specific provisioning)
    # host server-rack1a {
    #     hardware ethernet 00:1a:2b:3c:4d:5e;
    #     fixed-address 10.0.1.10;
    #     option host-name "server-rack1a";
    # }
}
DHCPD

# --- Step 2: TFTP Server Setup ---
sudo apt install -y tftpd-hpa   # Debian/Ubuntu
sudo dnf install -y tftp-server  # RHEL/CentOS

# Configure tftpd-hpa
sudo tee /etc/default/tftpd-hpa > /dev/null << 'TFTPD'
TFTP_USERNAME="tftp"
TFTP_DIRECTORY="/var/lib/tftpboot"
TFTP_ADDRESS="0.0.0.0:69"
TFTP_OPTIONS="--secure --listen --map-file=/etc/tftpd-map"
TFTPD

# --- Step 3: Deploy PXE Boot Files ---
sudo mkdir -p /var/lib/tftpboot/{pxelinux.cfg,EFI/boot,kernel,initrd}

# Copy PXE boot loader (Syslinux)
sudo cp /usr/lib/syslinux/modules/bios/pxelinux.0 /var/lib/tftpboot/
sudo cp /usr/lib/syslinux/modules/bios/libutil.c32 /var/lib/tftpboot/
# UEFI boot
sudo cp /usr/lib/shim/shimx64.efi.signed /var/lib/tftpboot/EFI/boot/bootx64.efi 2>/dev/null || \
    sudo cp /usr/lib/shim/shimx64.efi /var/lib/tftpboot/EFI/boot/bootx64.efi

# Copy kernel and initrd for the target OS
sudo cp /var/www/html/ubuntu/22.04/casper/vmlinuz /var/lib/tftpboot/kernel/vmlinuz-ubuntu2204
sudo cp /var/www/html/ubuntu/22.04/casper/initrd.lz /var/lib/tftpboot/initrd/initrd-ubuntu2204.lz

# PXE boot menu configuration
cat > /var/lib/tftpboot/pxelinux.cfg/default << 'PXE'
DEFAULT menu.c32
PROMPT 0
TIMEOUT 300
ONTIMEOUT ubuntu-local

LABEL ubuntu-local
    MENU LABEL ^Local Boot
    LOCALBOOT 0

LABEL ubuntu-2204-ks
    MENU LABEL Ubuntu 22.04 ^Kickstart (Automated)
    KERNEL /kernel/vmlinuz-ubuntu2204
    APPEND initrd=/initrd/initrd-ubuntu2204.lz auto=true priority=critical \
        url=http://10.0.1.20/ks/ubuntuks.cfg \
        ip=dhcp netcfg/choose_interface=auto

LABEL ubuntu-2204-manual
    MENU LABEL Ubuntu 22.04 ^Manual Install
    KERNEL /kernel/vmlinuz-ubuntu2204
    APPEND initrd=/initrd/initrd-ubuntu2204.lz auto=true priority=high \
        ip=dhcp netcfg/choose_interface=auto

LABEL memtest
    MENU LABEL ^Memory Test (Memtest86+)
    KERNEL /kernel/memtest
PXE

# --- Step 4: Kickstart Configuration (RHEL/Alma) ---
cat > /var/www/html/ks/almalinux.cfg << 'KICKSTART'
# Auto-provisioned AlmaLinux 9
install
text
keyboard 'us'
lang en_US.UTF-8
network --bootproto=dhcp --device=eth0 --onboot=on --hostname=$HOSTNAME
rootpw --iscrypted <hashed_root_password>
timezone UTC --isUtc
bootloader --location=mbr --driveorder=sda --append="crashkernel=auto"

# Disk layout — wipe all disks
zerombr
clearpart --all --initlabel
part /boot --fstype=xfs --size=1024 --ondisk=sda
part / --fstype=xfs --size=100 --grow --ondisk=sda

# Firewall configuration
firewall --enabled --ssh

# Reboot after installation
reboot --exit

%packages
@core
@hardware-monitoring
smartmontools
ipmitool
net-tools
wget
curl
%end

%post
# Configure NTP
yum install -y chrony
systemctl enable --now chronyd

# Enable IPMI
systemctl enable --now ipmi

# Install monitoring agent
wget -O /usr/local/bin/node-exporter https://example.com/node_exporter
chmod +x /usr/local/bin/node-exporter

# Set up SSH authorized keys from config server
curl -s http://10.0.1.20/keys/$HOSTNAME.pub >> /root/.ssh/authorized_keys

# Update hostname
hostnamectl set-hostname $HOSTNAME
%end
KICKSTART
```

**Checkpoint:** PXE boot is verified by booting a test client. Confirm DHCP assigns the correct bootfile, TFTP serves the boot files, and the kickstart installation completes without manual intervention.

### 5. Configure Network Time Synchronization

Set up NTP or PTP for precision timing across on-prem infrastructure.

```bash
# =============================================
# Pattern 1: NTP with Chrony (recommended)
# =============================================

sudo apt install -y chrony       # Debian/Ubuntu
sudo dnf install -y chrony       # RHEL/CentOS

# Chrony configuration for on-prem datacenter
cat > /etc/chrony/chrony.conf << 'CHRONY'
# Datacenter NTP configuration
# Stratum 1: Direct GPS or PTP grandmaster
# Stratum 2: Local datacenter NTP servers
# Stratum 3+: All other servers

# External time sources (stratum 1)
server time.cloudflare.com iburst minpoll 4 maxpoll 6
server pool.ntp.org iburst minpoll 4 maxpoll 6

# Local stratum 1 reference (GPS or hardware clock)
# server 127.127.28.1 # GPS reference clock
# fudge 127.127.28.1 refid GPS

# Local NTP servers for the datacenter (stratum 2)
server ntp1.internal.corp iburst prefer
server ntp2.internal.corp iburst

# Allow local clients to sync from this server (if acting as NTP server)
# Allow subnet only — never open to the world
allow 10.0.0.0/8
allow 172.16.0.0/12
allow 192.168.0.0/16
# deny 0.0.0.0/0  # Explicit deny all others

# Local clock as fallback (when no external sources available)
local stratum 10
leapsectz right/UTC

# Record clock drift for analysis
driftfile /var/lib/chrony/drift

# Log every 30 minutes
logdir /var/log/chrony
log measurements statistics tracking

# Key tracking
keyfile /etc/chrony/chrony.keys

# Clock discipline
makestep 1.0 3
rtcsync
CHRONY

sudo systemctl enable --now chronyd

# Verify synchronization
chronyc tracking
chronyc sources -v

# =============================================
# Pattern 2: PTP (Precision Time Protocol) for sub-microsecond precision
# =============================================

# PTP is required for: financial trading, distributed databases, HPC clusters
# Requires: PTP-capable NIC, PTP grandmaster, linuxptp package

sudo apt install -y linuxptp   # Debian/Ubuntu
sudo dnf install -y linuxptp   # RHEL/CentOS

# PTP configuration — select the PTP-capable interface
# Check if NIC supports PTP
ethtool -T eth1 | grep "SOF_TIMESTAMPING"

# Configure phc2sys (hardware timestamping)
cat > /etc/ptp4l.conf << 'PTP'
[global]
    default_ds.port_state_change_threshold 5
    delay_mechanism E2E
    time_stamping hardware
    log_announce_interval -3
    announce_receipt_timeout 4
    sync_receipt_timeout 3
    announce_interval -3
    sync_interval -3
    parentstats_mean_offset_threshold 10000000
    assume_two_step 0

[eth1]
    # PTP-enabled interface
    delay_filter 2
PTP

# Start PTP clock
sudo ptp4l -i eth1 -f /etc/ptp4l.conf &
sudo phc2sys -a -s eth1

# Verify PTP sync
sudo phc_ctl eth1 getcrosstimestamp
sudo ptptime eth1
```

**Checkpoint:** `chronyc tracking` shows locked to a stratum 1 or 2 source with offset in acceptable range (< 1ms for NTP, < 1μs for PTP). `chronyc sources -v` shows at least one reachable source marked with `*`.

### 6. Hardware Replacement Procedure

When a component fails, follow a structured replacement procedure to minimize downtime and data loss.

```bash
#!/bin/bash
# Hardware replacement procedure — for use during maintenance windows
# Usage: ./hardware-replace.sh <component> <server> [--dry-run]
# Components: disk, memory, psu, hba, fan, cpu

set -euo pipefail

COMPONENT="${1:-}"
SERVER="${2:-}"
DRY_RUN="${3:---live}"

if [[ -z "$COMPONENT" || -z "$SERVER" ]]; then
    echo "Usage: $0 <component> <server> [--dry-run]"
    echo "Components: disk, memory, psu, hba, fan, cpu"
    exit 1
fi

echo "=== Hardware Replacement Procedure ==="
echo "Component: $COMPONENT"
echo "Server:    $SERVER"
echo "Mode:      $DRY_RUN"
echo "=== "

# Pre-replacement checks
echo ""
echo "1. Pre-Replacement Health Check"
echo "---"

if [[ "$COMPONENT" == "disk" ]]; then
    # Identify the failing disk
    echo "Checking SMART status on all disks..."
    for dev in /dev/sd* /dev/nvme*; do
        [[ -b "$dev" ]] || continue
        health=$(sudo smartctl -H "$dev" 2>/dev/null | grep -oP 'Overall-health.*?\K.*' || echo "unknown")
        temp=$(sudo smartctl -A "$dev" 2>/dev/null | grep -i 'temperature' | head -1 | awk '{print $10}')
        reallocated=$(sudo smartctl -A "$dev" 2>/dev/null | grep -i 'Reallocated_Sector' | awk '{print $10}')
        echo "  $dev: health=$health temp=${temp}C reallocated=$reallocated"
    done

    # Identify disk in RAID (if applicable)
    if command -v mdadm &>/dev/null; then
        echo ""
        echo "RAID status:"
        mdadm --detail --scan 2>/dev/null | while read -r line; do
            echo "  $line"
        done
    fi
    if command -v multipath &>/dev/null; then
        echo ""
        echo "Multipath devices:"
        multipath -ll 2>/dev/null | head -20
    fi
fi

if [[ "$COMPONENT" == "psu" ]]; then
    echo "Checking power supply status via IPMI..."
    sudo ipmitool sdr type "Power Supply" 2>/dev/null || echo "IPMI unavailable"
    sudo ipmitool sdr type "Voltage" 2>/dev/null | grep -i "psu\|power" || echo "No PSU voltage sensors found"
fi

if [[ "$COMPONENT" == "memory" ]]; then
    echo "Checking memory error counts..."
    if command -v edac-util &>/dev/null; then
        edac-util -v 2>/dev/null || echo "No EDAC errors reported"
    fi
    dmesg | grep -iE 'mem|e?cc|uncorrectable' | tail -20 || echo "No memory errors in dmesg"
fi

# Pre-replacement data backup
echo ""
echo "2. Verify Data Backup Status"
echo "---"
echo "  [!] Ensure backups are current before replacing any component"
echo "  [!] For disk replacement, verify RAID sync is complete"
echo "  [!] For PSU replacement, confirm UPS is connected and functional"

# Component-specific steps
echo ""
echo "3. Component-Specific Replacement Steps"
echo "---"

case "$COMPONENT" in
    disk)
        echo "   a. Identify the failing disk: /dev/sdX"
        echo "   b. Mark disk as failed in RAID:   mdadm /dev/md0 --fail /dev/sdX"
        echo "   c. Remove disk from RAID:         mdadm /dev/md0 --remove /dev/sdX"
        echo "   d. Physically replace disk (hot-swap capable)"
        echo "   e. Add new disk:                    mdadm /dev/md0 --add /dev/sdX"
        echo "   f. Monitor rebuild:                  watch cat /proc/mdstat"
        echo "   g. Verify SMART on new disk:         smartctl -a /dev/sdX"
        ;;
    psu)
        echo "   a. Verify UPS is connected and functional"
        echo "   b. Check current PSU power draw:    ipmitool sdr type 'Power Supply'"
        echo "   c. Power down if non-hot-swap:       ipmitool power off"
        echo "   d. Replace PSU (observe ESD precautions)"
        echo "   e. Power on:                          ipmitool power on"
        echo "   f. Verify both PSUs are reporting:    ipmitool sdr type 'Power Supply'"
        ;;
    memory)
        echo "   a. Identify failed DIMM slot via BMC: ipmitool sdr type Memory"
        echo "   b. Power down the server"
        echo "   c. Replace DIMM (observe ESD precautions, match speed/capacity)"
        echo "   d. Power on and verify:               dmidecode -t memory"
        echo "   e. Run memtest86+ if ECC errors persist"
        ;;
    hba)
        echo "   a. Identify HBA and current paths:    multipath -ll"
        echo "   b. Stop multipath:                     systemctl stop multipathd"
        echo "   c. Detach all paths:                   multipath -f all"
        echo "   d. Power down if non-hot-swap HBA"
        echo "   e. Replace HBA card"
        echo "   f. Power on, reload multipath:         systemctl start multipathd"
        echo "   g. Verify paths:                       multipath -ll"
        echo "   h. Update firmware if needed:          hpssacli ctrl all show config"
        ;;
    fan)
        echo "   a. Identify failed fan via BMC:        ipmitool sdr type 'Fan'"
        echo "   b. Hot-swap fan if supported (server must remain powered)"
        echo "   c. Verify fan speed recovery:          ipmitool sdr type 'Fan'"
        echo "   d. Monitor temperature:                ipmitool sdr type 'Temperature'"
        ;;
    cpu)
        echo "   a. CPU replacement is a major operation"
        echo "   b. Power down and unplug server"
        echo "   c. Discharge residual power (hold power button 30s)"
        echo "   d. Replace CPU (match socket, TDP, stepping)"
        echo "   e. Apply fresh thermal paste"
        echo "   f. Power on and verify:                 lscpu"
        echo "   g. Run stress test:                     stress-ng --cpu 0"
        ;;
    *)
        echo "  Unknown component: $COMPONENT"
        echo "  Valid components: disk, memory, psu, hba, fan, cpu"
        exit 1
        ;;
esac

if [[ "$DRY_RUN" == "--dry-run" ]]; then
    echo ""
    echo "=== DRY RUN COMPLETE — No changes made ==="
else
    echo ""
    echo "=== Execute the above steps in your maintenance window ==="
    echo "=== Ensure rollback procedures are documented ==="
fi
```

**Checkpoint:** After replacement, run a full hardware health check (step 2) to confirm the new component is recognized, reporting normal metrics, and no error messages appear in SEL or dmesg.

---

## Implementation Patterns

### Pattern 1: IPMI Remote Power Cycle (BAD vs. GOOD)

```bash
# ❌ BAD: Blindly powering cycle without checking health first
ipmitool -I lanplus -H $BMC_IP -U admin chassis power cycle
#
# Problems:
# - No health check before the power cycle
# - No confirmation the right BMC is targeted
# - No audit trail of the action
# - Could power cycle the wrong server in a large fleet

# ✅ GOOD: Safe remote power management with health checks and audit trail
#!/usr/bin/env bash
set -euo pipefail

BMC_IP="${1:?Usage: $0 <bmc_ip> <action>}"
ACTION="${2:-status}"
AUDIT_LOG="/var/log/ipmi-actions.log"

# Validate BMC IP format
if ! [[ "$BMC_IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Error: Invalid BMC IP: $BMC_IP" >&2
    exit 1
fi

# Check BMC connectivity before acting
echo "Checking BMC connectivity..."
if ! sudo ipmitool -I lanplus -H "$BMC_IP" -U "$BMC_USER" -P "$BMC_PASS" sdr 2>/dev/null | head -1 > /dev/null; then
    echo "Error: BMC at $BMC_IP is unreachable" >&2
    exit 1
fi

# Get hostname from inventory (correlate BMC to server)
get_hostname() {
    local bmc_ip="$1"
    grep "^$bmc_ip," /opt/inventory/bmc_hosts.csv | cut -d',' -f1 || echo "unknown-$bmc_ip"
}

HOSTNAME=$(get_hostname "$BMC_IP")
TIMESTAMP=$(date -Iseconds)

case "$ACTION" in
    status)
        echo "Power status of $HOSTNAME ($BMC_IP):"
        sudo ipmitool -I lanplus -H "$BMC_IP" -U "$BMC_USER" -P "$BMC_PASS" chassis power status
        ;;
    on)
        echo "Powering ON $HOSTNAME..."
        sudo ipmitool -I lanplus -H "$BMC_IP" -U "$BMC_USER" -P "$BMC_PASS" chassis power on
        ;;
    off)
        echo "Gracefully shutting down $HOSTNAME..."
        # Prefer OS-level shutdown first (graceful)
        ssh -o ConnectTimeout=5 root@"$HOSTNAME" 'poweroff' 2>/dev/null || {
            echo "SSH shutdown failed. Using BMC power off."
            sudo ipmitool -I lanplus -H "$BMC_IP" -U "$BMC_USER" -P "$BMC_PASS" chassis power off
        }
        ;;
    cycle)
        echo "Power cycling $HOSTNAME..."
        sudo ipmitool -I lanplus -H "$BMC_IP" -U "$BMC_USER" -P "$BMC_PASS" chassis power off
        sleep 5
        sudo ipmitool -I lanplus -H "$BMC_IP" -U "$BMC_USER" -P "$BMC_PASS" chassis power on
        ;;
    *)
        echo "Usage: $0 <bmc_ip> {status|on|off|cycle}"
        exit 1
        ;;
esac

# Audit log entry
echo "$TIMESTAMP | $HOSTNAME | $BMC_IP | $ACTION | $(whoami)" >> "$AUDIT_LOG"
```

### Pattern 2: PXE Boot Health Check Before Mass Deployment

```bash
#!/usr/bin/env bash
# Validate PXE infrastructure before deploying to production fleet
set -euo pipefail

TFTP_DIR="/var/lib/tftpboot"
DHCPD_CONF="/etc/dhcp/dhcpd.conf"
HTTP_ROOT="/var/www/html"

echo "=== PXE Infrastructure Pre-Flight Check ==="
PASS=0
FAIL=0

check() {
    local desc="$1"
    local result="$2"
    if [[ "$result" == "0" ]]; then
        echo "  [PASS] $desc"
        ((PASS++))
    else
        echo "  [FAIL] $desc"
        ((FAIL++))
    fi
}

# Check DHCP service
systemctl is-active --quiet dhcpd 2>/dev/null || systemctl is-active --quiet isc-dhcp-server 2>/dev/null
check "DHCP service is running" $?

# Check TFTP directory exists and has boot files
[[ -d "$TFTP_DIR" ]] && [[ -f "$TFTP_DIR/pxelinux.0" ]]
check "TFTP directory exists with pxelinux.0" $?

# Check PXE menu exists
[[ -f "$TFTP_DIR/pxelinux.cfg/default" ]]
check "PXE boot menu configuration exists" $?

# Check kernel and initrd are present
[[ -f "$TFTP_DIR/kernel/vmlinuz"* ]] && [[ -f "$TFTP_DIR/initrd/initrd"* ]]
check "Kernel and initrd files present" $?

# Check HTTP/HTTPS serve of kickstart files
curl -s -o /dev/null -w "%{http_code}" "http://localhost${HTTP_ROOT}" | grep -q "^200" || curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1${HTTP_ROOT}" | grep -q "^200"
check "Kickstart files are accessible via HTTP" $?

# Check DHCP configuration syntax
dhcpd -t 2>/dev/null
check "DHCP configuration syntax is valid" $?

# Check TFTP server is listening
ss -ulnp | grep -q ':69'
check "TFTP server is listening on UDP 69" $?

echo ""
echo "Results: $PASS passed, $FAIL failed"

if [[ "$FAIL" -gt 0 ]]; then
    echo "Fix failures before PXE deployment!"
    exit 1
fi
echo "PXE infrastructure is ready for deployment."
```

### Pattern 3: Bulk BMC Health Check Across Fleet

```bash
#!/usr/bin/env bash
# Check health of all BMCs in the datacenter
# Inventory CSV format: hostname,bmc_ip,bmc_user,bmc_pass,location,rack
set -euo pipefail

INVENTORY="/opt/inventory/bmc_hosts.csv"
RESULTS="/tmp/bmc-health-$(date +%Y%m%d-%H%M%S).csv"
TIMEOUT=5

echo "hostname,bmc_ip,status,power,alert_count,last_check" > "$RESULTS"

if [[ ! -f "$INVENTORY" ]]; then
    echo "Error: Inventory file not found: $INVENTORY" >&2
    exit 1
fi

# Skip header line
tail -n +2 "$INVENTORY" | while IFS=',' read -r hostname bmc_ip bmc_user bmc_pass location rack; do
    TIMESTAMP=$(date -Iseconds)

    # Test BMC connectivity
    if ! sudo ipmitool -I lanplus -H "$bmc_ip" -U "$bmc_user" -P "$bmc_pass" -t "$TIMEOUT" chassis power status &>/dev/null; then
        echo "$hostname,$bmc_ip,unreachable,-,-,$TIMESTAMP" >> "$RESULTS"
        continue
    fi

    # Get power status
    power=$(sudo ipmitool -I lanplus -H "$bmc_ip" -U "$bmc_user" -P "$bmc_pass" chassis power status 2>/dev/null | grep -oP 'Chassis Power.*?\K.*' || echo "unknown")

    # Count recent SEL alerts (last 24h)
    alert_count=$(sudo ipmitool -I lanplus -H "$bmc_ip" -U "$bmc_user" -P "$bmc_pass" sel elist 2>/dev/null | wc -l || echo "0")

    # Determine status
    if [[ "$alert_count" -gt 10 ]]; then
        status="degraded"
    elif [[ "$power" == "on" ]]; then
        status="healthy"
    else
        status="powered-off"
    fi

    echo "$hostname,$bmc_ip,$status,$power,$alert_count,$TIMESTAMP" >> "$RESULTS"
done

echo ""
echo "=== BMC Health Summary ==="
echo "Results saved to: $RESULTS"
echo ""
cat "$RESULTS"
```

---

## Constraints

### MUST DO

- **MUST** verify BMC connectivity and power status before any remote power operation — never assume the server is in the expected state
- **MUST** use `multipath-tools` with `ALUA` path priority for all iSCSI and Fibre Channel SAN storage — single-path storage is a single point of failure
- **MUST** configure NFS mounts with `hard` option for database and filesystem workloads — `soft` mounts can cause data corruption if the server temporarily goes unreachable
- **MUST** test PXE boot with a non-production host before any mass deployment — PXE issues can lock out entire server fleets
- **MUST** document datacenter rack position, U slot, cable IDs, and BMC IP for every server in an asset inventory — physical operations require this information
- **MUST** use `set -euo pipefail` in all shell scripts that interact with hardware — unexpected failures can cause data loss or hardware damage
- **MUST** maintain NTP synchronization across all on-prem systems — distributed systems with unsynchronized clocks produce unreliable logs, metrics, and transaction ordering
- **MUST** review SEL (System Event Log) before any hardware replacement — the SEL often reveals the root cause of the failure

### MUST NOT DO

- **MUST NOT** power cycle a server without first attempting a graceful OS-level shutdown via SSH or BMC SOL — abrupt power loss can corrupt filesystems and databases
- **MUST NOT** replace a disk in a RAID array without verifying backup integrity first — if the array fails during rebuild, you lose everything
- **MUST NOT** expose iSCSI or NFS to untrusted networks without authentication (CHAP for iSCSI, IP-based access controls for NFS)
- **MUST NOT** disable multipath failover or set `no_path_retry` to `off` — this creates immediate I/O failure on any path interruption
- **MUST NOT** rely on BMC-only management — always maintain console access (serial/IPMI SOL) as a fallback when IPMI LAN is unavailable
- **MUST NOT** configure PXE boot without validating DHCP, TFTP, and HTTP services first — a broken PXE infrastructure can prevent all servers from booting
- **MUST NOT** ignore thermal warnings before hardware maintenance — high temperatures indicate cooling failures that could worsen during component replacement

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `hardware-provisioning` | Initial hardware sizing, RAID configuration, and SSD optimization for the provisioned servers |
| `networking` | Bond interfaces, VLANs, and firewall rules that complement on-prem network storage and PXE infrastructure |
| `kernel-tuning` | Tune I/O scheduler, TCP, and filesystem parameters for multipath and NFS performance |
| `linux-security` | Harden the server post-provisioning: SSH hardening, file permissions, and audit logging |

> 📖 skill(local cache): on-prem-infrastructure
