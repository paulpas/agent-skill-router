---
name: networking
description: Configures and optimizes Linux networking for cloud virtual networks
  and on-prem data center infrastructure with performance and security focus.
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
  triggers: linux networking, bond interface, VLAN, bridge, network namespace, nftables,
    routing, cloud networking, VPC
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: kernel-tuning, resource-management, hardware-provisioning, linux-security
  maturity: stable
  completeness: 95
  exampleCount: 3
------
# Linux Networking Configuration

Senior network engineer configuring and optimizing Linux networking for cloud virtual networks and on-prem data center infrastructure, covering bonding, VLANs, bridges, network namespaces, firewalls, and routing.

## TL;DR Checklist

- [ ] Verify interface status and IP configuration with `ip addr show` and `ip route show`
- [ ] Configure bond interfaces with appropriate mode for redundancy or throughput needs
- [ ] Set up VLAN tagging with 802.1Q for network segmentation
- [ ] Configure network namespaces for service isolation when needed
- [ ] Apply nftables firewall rules with explicit deny-all default policy
- [ ] Validate routing tables and forwarding behavior for all workloads
- [ ] Test failover and redundancy by simulating link failures
- [ ] Document network topology including IPs, subnets, and interface assignments

---

## When to Use

Use this skill when:

- **Setting up redundant network interfaces** — You need link aggregation or failover for high availability
- **Configuring network segmentation** — You need VLANs or network namespaces to isolate traffic between workloads or tenants
- **Deploying cloud instances** — You're configuring VPC networking, security groups, and routing for cloud workloads
- **Building data center infrastructure** — You're configuring on-prem switches, bridges, and routing between subnets
- **Implementing firewall policies** — You need to configure nftables/iptables for network security with explicit deny policies

---

## When NOT to Use

Avoid this skill for:

- **Simple single-interface setups** — If a system has one network interface with default routing, basic configuration is sufficient
- **Cloud-managed networking** — When the cloud provider manages VPC, routing, and security groups (AWS, GCP, Azure), Linux-level config is supplemental only
- **Software-defined networking overlay** — For Kubernetes CNI, Calico, or similar SDN solutions, configure the CNI plugin instead of raw interfaces
- **DNS configuration** — Use `resolv.conf` or systemd-resolved for DNS, not the networking skill's scope

Use `linux-security` for advanced firewall hardening and security policies. Use `kernel-tuning` when network performance tuning (TCP parameters) is the primary concern.

---

## Core Workflow

### 1. Assess Current Network State

Document existing interfaces, routes, and configurations.

```bash
# Inventory current network state
ip addr show
ip route show
ip link show type bond
cat /etc/netplan/*.yaml          # Ubuntu/Debian
cat /etc/network/interfaces     # Debian legacy
nmcli device status             # NetworkManager
ss -tuln                        # Listening sockets
```

**Checkpoint:** You have a complete picture of interfaces, IP assignments, routing tables, and listening services.

### 2. Configure Bond Interfaces

Set up NIC bonding for redundancy or throughput.

```bash
# Bond mode selection:
# mode=0 (balance-rr)       — Round-robin, max throughput
# mode=1 (active-backup)    — Active/passive, failover
# mode=4 (802.3ad)          — LACP, requires switch support
# mode=6 (balance-tlb)      — Adaptive transmit load balancing

# Netplan configuration (Ubuntu/Debian)
cat > /etc/netplan/01-bond.yaml << 'NETPLAN'
network:
  version: 2
  ethernets:
    ens192: {dhcp4: false}
    ens224: {dhcp4: false}
  bonds:
    bond0:
      interfaces: [ens192, ens224]
      parameters:
        mode: active-backup
        fail_over_mac: active
        mii_monitor_interval: 100
      addresses:
        - 10.0.1.50/24
      routes:
        - to: default
          via: 10.0.1.1
      nameservers:
        addresses: [10.0.0.53, 1.1.1.1]
NETPLAN

# Apply
netplan apply
```

**Checkpoint:** Bond interface is up, all member interfaces are enslaved, and failover mode is active.

### 3. Configure VLAN Tagging

Set up VLANs for network segmentation.

```bash
# Create VLAN interfaces using netplan
cat > /etc/netplan/02-vlan.yaml << 'NETPLAN'
network:
  version: 2
  vlans:
    vlan100:
      id: 100
      link: bond0
      addresses: [10.100.0.50/24]
    vlan200:
      id: 200
      link: bond0
      addresses: [10.200.0.50/24]
NETPLAN

# Apply
netplan apply

# Verify VLAN interfaces
ip addr show vlan100
ip addr show vlan200
```

**Checkpoint:** VLAN interfaces are created, assigned correct subnets, and traffic is tagged/untagged correctly.

### 4. Configure Network Namespaces

Isolate networking for container-like environments or service segregation.

```bash
# Create network namespace
sudo ip netns add myapp-ns

# Create veth pair for namespace connectivity
sudo ip link add veth-host type veth peer name veth-ns

# Move one end into namespace
sudo ip link set veth-ns netns myapp-ns

# Configure namespace interfaces
sudo ip netns exec myapp-ns ip addr add 10.99.0.2/24 dev veth-ns
sudo ip netns exec myapp-ns ip link set veth-ns up
sudo ip netns exec myapp-ns ip link set lo up
sudo ip netns exec myapp-ns ip route add default via 10.99.0.1

# Configure host side
sudo ip addr add 10.99.0.1/24 dev veth-host
sudo ip link set veth-host up

# Test connectivity
sudo ip netns exec myapp-ns ping -c 3 10.99.0.1
```

**Checkpoint:** Namespace has its own network stack, veth pair provides connectivity to the host network, and routing is correct.

### 5. Configure nftables Firewall

Set up firewall rules with explicit deny-all default policy.

```bash
# Create nftables configuration
cat > /etc/nftables.conf << 'NFTABLES'
#!/usr/sbin/nft -f

flush ruleset

table inet filter {
    # Default policy: drop everything
    chain input {
        type filter hook input priority 0; policy drop;

        # Allow established/related connections
        ct state established,related accept

        # Allow loopback
        iif "lo" accept

        # Allow SSH (rate-limited)
        tcp dport 22 ct state new ct count over 3/minute drop
        tcp dport 22 accept

        # Allow HTTP/HTTPS for web servers
        tcp dport { 80, 443 } accept

        # Allow ICMP ping (rate-limited)
        icmp type echo-request ct count over 5/second drop
        icmp type echo-request accept

        # Allow DNS
        udp dport 53 accept
        tcp dport 53 accept
    }

    chain forward {
        type filter hook forward priority 0; policy drop;
        # Only forward if explicitly allowed by rules below
    }

    chain output {
        type filter hook output priority 0; policy accept;
        # Allow all outbound by default; restrict via egress rules if needed
    }
}
NFTABLES

# Load and enable nftables
sudo nft -f /etc/nftables.conf
sudo systemctl enable nftables
sudo systemctl start nftables
```

**Checkpoint:** Firewall is running with default drop policy, essential services are reachable, and no accidental lockout occurred.

### 6. Configure Routing

Set up static routes, policy routing, and forwarding as needed.

```bash
# Add static route
sudo ip route add 10.200.0.0/24 via 10.0.1.1 dev bond0

# Make route persistent (RHEL/CentOS)
cat > /etc/sysconfig/network-scripts/route-bond0 << 'ROUTE'
10.200.0.0/24 via 10.0.1.1 dev bond0
ROUTE

# Enable IP forwarding for routing/bridging
echo "net.ipv4.ip_forward = 1" | sudo tee /etc/sysctl.d/99-forwarding.conf
sudo sysctl -p /etc/sysctl.d/99-forwarding.conf

# Policy-based routing: separate routing table for specific traffic
cat > /etc/iproute2/rt_tables << 'RTABLES'
100    web-tier
RTABLES

# Add rule: traffic from web-tier subnet uses web-tier routing table
sudo ip rule add from 10.100.0.0/24 table web-tier
sudo ip route add default via 10.100.0.1 table web-tier
```

**Checkpoint:** Routes are correct, forwarding is enabled, and policy-based routing (if used) handles traffic as expected.

---

## Implementation Patterns

### Pattern 1: Bond Interface Modes (BAD vs. GOOD)

**BAD — Wrong bonding mode for the use case**

```bash
# ❌ BAD: Using balance-rr without switch LACP support
# This creates a bond that sends packets on both interfaces
# but the switch doesn't understand LACP, causing packet reordering and drops
cat > /etc/netplan/01-bond.yaml << 'NETPLAN'
network:
  bonds:
    bond0:
      interfaces: [ens192, ens224]
      parameters:
        mode: balance-rr    # Round-robin — requires switch config!
        miimon: 100
NETPLAN

# ❌ BAD: Using 802.3ad without switch LACP configuration
# LACP negotiation will fail, link stays down
parameters:
  mode: 802.3ad          # Requires switch port-channel/LACP config
  lacp_rate: fast
```

**GOOD — Match bonding mode to infrastructure capability**

```bash
# ✅ GOOD: Active-backup for cloud environments (no switch dependency)
cat > /etc/netplan/01-bond-cloud.yaml << 'NETPLAN'
network:
  bonds:
    bond0:
      interfaces: [ens192, ens224]
      parameters:
        mode: active-backup          # Primary/secondary failover
        fail_over_mac: active        # MAC follows active interface
        primary_reselect: always     # Revert to primary when available
        mii_monitor_interval: 100    # Check link every 100ms
        arp_validate: none           # Don't validate ARP (cloud limitation)
      addresses: [10.0.1.50/24]
      routes:
        - to: default
          via: 10.0.1.1
NETPLAN

# ✅ GOOD: 802.3ad LACP for on-prem with switch support
# NOTE: Requires switch configuration:
#   switch(config)# port-channel mode active
#   switch(config-if)# channel-group 10 mode active
cat > /etc/netplan/01-bond-datacenter.yaml << 'NETPLAN'
network:
  bonds:
    bond0:
      interfaces: [ens192, ens224]
      parameters:
        mode: 802.3ad                # LACP — requires switch port-channel
        lacp_rate: fast
        xmit_hash_policy: layer3+4   # Hash by src/dst IP + port
        miimon: 100
      addresses: [10.0.1.50/24]
      routes:
        - to: default
          via: 10.0.1.1
NETPLAN
```

### Pattern 2: Cloud vs On-Prem Network Configuration

**Cloud VM — Active-backup bonding (no switch dependency)**

```bash
# Cloud VM netplan — active-backup for failover without switch config
cat > /etc/netplan/01-cloud.yaml << 'NETPLAN'
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: false
      addresses:
        - 10.0.1.50/24
      routes:
        - to: default
          via: 10.0.1.1
      nameservers:
        addresses: [10.0.0.53, 169.254.169.253]  # AWS local DNS

  bonds:
    bond0:
      interfaces: [eth0, eth1]
      parameters:
        mode: active-backup          # Primary/secondary failover
        fail_over_mac: active        # MAC follows active interface
        primary_reselect: always     # Revert to primary when available
        mii_monitor_interval: 100    # Check link every 100ms
      addresses:
        - 10.0.1.50/24
      routes:
        - to: default
          via: 10.0.1.1
NETPLAN

netplan apply
```

**On-prem server — 802.3ad LACP bonding (requires switch configuration)**

```bash
# On-prem netplan — 802.3ad LACP requires switch port-channel config
# Switch side (example Cisco):
#   switch(config)# port-channel mode active
#   switch(config-if)# channel-group 10 mode active

cat > /etc/netplan/01-onprem.yaml << 'NETPLAN'
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: false
    eth1:
      dhcp4: false

  bonds:
    bond0:
      interfaces: [eth0, eth1]
      parameters:
        mode: 802.3ad                # LACP — requires switch port-channel
        lacp_rate: fast
        xmit_hash_policy: layer3+4   # Hash by src/dst IP + port
        miimon: 100
      addresses:
        - 10.10.1.50/24
      routes:
        - to: default
          via: 10.10.1.1
      nameservers:
        addresses: [10.10.0.53, 8.8.8.8]
NETPLAN

netplan apply
```

**Automated cloud instance provisioning with bash**

```bash
#!/bin/bash
# Generate netplan from cloud metadata or CLI — works on AWS/GCP/Azure
# Usage: ./generate-netplan.sh cloud on-prem <instance-id>

ENV="${1:-cloud}"
TARGET="${2:-cloud}"
NAME="${3:-server}"
OUTPUT="/etc/netplan/01-${TARGET}-${NAME}.yaml"

# Detect cloud provider metadata
detect_provider() {
    # AWS
    if curl -s -m 2 http://169.254.169.254/latest/meta-data/instance-id 2>/dev/null | grep -q '^i-'; then
        echo "aws"
        return
    fi
    # GCP
    if curl -s -m 2 -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/name 2>/dev/null | grep -q '^'; then
        echo "gcp"
        return
    fi
    # Azure
    if curl -s -m 2 -H "Metadata-Severity: Interactive" "http://169.254.169.254/metadata/instance?api-version=2021-02-01" 2>/dev/null | grep -q '"compute"'; then
        echo "azure"
        return
    fi
    echo "bare-metal"
}

PROVIDER=$(detect_provider)

# Generate netplan based on environment
generate_netplan() {
    local target="$1"
    case "$target" in
        cloud)
            cat << 'NETPLAN'
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: false
      addresses: [10.0.1.50/24]
      routes:
        - to: default
          via: 10.0.1.1
      nameservers:
        addresses: [10.0.0.53, 169.254.169.253]
  bonds:
    bond0:
      interfaces: [eth0, eth1]
      parameters:
        mode: active-backup
        fail_over_mac: active
        mii_monitor_interval: 100
      addresses: [10.0.1.50/24]
      routes:
        - to: default
          via: 10.0.1.1
NETPLAN
            ;;
        on-prem)
            cat << 'NETPLAN'
network:
  version: 2
  ethernets:
    eth0: {dhcp4: false}
    eth1: {dhcp4: false}
  bonds:
    bond0:
      interfaces: [eth0, eth1]
      parameters:
        mode: 802.3ad
        lacp_rate: fast
        xmit_hash_policy: layer3+4
        miimon: 100
      addresses: [10.10.1.50/24]
      routes:
        - to: default
          via: 10.10.1.1
      nameservers:
        addresses: [10.10.0.53, 8.8.8.8]
NETPLAN
            ;;
    esac
}

generate_netplan "$TARGET" > "$OUTPUT"
echo "Generated $OUTPUT"
echo "Run: netplan apply"
```

### Pattern 3: nftables Chain for Service Exposure

```nftables
# Service-facing nftables rules
table inet services {
    chain input {
        type filter hook input priority 0; policy drop;

        # Allow established connections
        ct state established,related accept
        iif "lo" accept

        # SSH with brute-force protection
        tcp dport 22 ct state new limit rate 3/minute burst 5 packets accept

        # Web services
        tcp dport 80 accept
        tcp dport 443 accept

        # Application API
        tcp dport 8443 ip saddr != { 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16 } drop
        tcp dport 8443 accept

        # Metrics (internal only)
        tcp dport 9100 ip saddr 10.0.0.0/8 accept
        tcp dport 9100 drop

        # Rate limit all other new connections
        ct state new limit rate 100/second burst 200 packets accept
        log prefix "DROPPED: " level warn
    }
}
```

---

## Constraints

### MUST DO

- **MUST** use explicit deny-all default policies in firewall rules — never use accept-all defaults
- **MUST** configure bonding mode to match available switch infrastructure — active-backup for cloud/no-switch, 802.3ad for switch-LACP
- **MUST** use `nftables` for new firewall configurations — iptables is legacy, nftables is the modern replacement
- **MUST** document all network assignments (IPs, subnets, gateways, DNS) in a network topology diagram or config file
- **MUST** test network changes from a separate session or console — never lock yourself out of remote management
- **MUST** enable connection tracking (`ct state established,related accept`) to allow return traffic through the firewall
- **MUST** use VLANs for network segmentation on shared infrastructure to isolate tenant or workload traffic

### MUST NOT DO

- **MUST NOT** use `balance-rr` bonding mode without switch-side LACP configuration — causes packet reordering and drops
- **MUST NOT** open SSH (port 22) without rate limiting — automated brute-force scanners will target it immediately
- **MUST NOT** disable connection tracking in the INPUT chain — it breaks stateful firewall operation
- **MUST NOT** use deprecated `iptables-legacy` for new firewall rules — use `nftables` exclusively
- **MUST NOT** configure VLANs on cloud VMs without provider support — most clouds don't support 802.1Q tagging on VM interfaces
- **MUST NOT** rely on MAC-based firewall rules on cloud VMs — MAC addresses are managed by the hypervisor and can change during live migration
- **MUST NOT** configure network namespaces without proper veth pair connectivity — an isolated namespace without routing is unreachable

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `kernel-tuning` | Tune TCP parameters and network stack kernel settings for performance |
| `resource-management` | Allocate network namespaces as isolated resource boundaries |
| `hardware-provisioning` | Select network interfaces (1GbE, 10GbE, 25GbE) appropriate for workload |
| `linux-security` | Apply security hardening that complements network firewall policies |
| `observability` | Monitor network throughput, latency, and packet loss metrics |
