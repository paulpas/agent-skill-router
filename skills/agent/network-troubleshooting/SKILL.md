---




name: network-troubleshooting
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Diagnoses and resolves network connectivity issues including firewall
  rules, DNS resolution, load balancer configuration, container networking, VPN connectivity,
  and network policy debugging for Docker, Kubernetes, and cloud-native environments
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: code
  related-skills: agent-docker-debugging
  role: implementation
  scope: implementation
  triggers: network troubleshooting, iptables, dns resolution, firewall rules, load
    balancer, calico, cni, how do i debug network
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
version: "1.0.0"




---




# Network Troubleshooting

Implements comprehensive network troubleshooting workflows for diagnosing connectivity issues including firewall rules (iptables, nftables), DNS resolution failures, load balancer configuration problems, container networking (Docker, CNI, Calico, Cilium), VPN connectivity issues, and network policy enforcement using real command-line tools and diagnostic scripts.

## TL;DR Checklist

- [ ] Check container network connectivity with `docker exec <container> ping -c 3 <target>`
- [ ] Test DNS resolution with `nslookup <hostname>`, `dig <hostname>`, or `host <hostname>`
- [ ] Inspect iptables rules with `iptables -L -n -v` and `iptables-save`
- [ ] Verify network interfaces with `ip addr show`, `ip route show`, and `ss -tuln`
- [ ] Test load balancer health endpoints with `curl -v http://<lb-ip>:<port>/health`
- [ ] Check Docker network configuration with `docker network inspect <network>`
- [ ] Inspect Calico/Cilium network policies with `calicoctl get profile` or `kubectl get networkpolicy`
- [ ] Verify VPN connectivity with `ipsec status` or `strongswan status`
- [ ] Check /etc/hosts and /etc/resolv.conf inside containers
- [ ] Use tcpdump for packet capture: `tcpdump -i <interface> -nn host <ip>`

---

## When to Use

Use network troubleshooting when:

- Containers cannot reach external services or other containers
- DNS resolution fails or returns incorrect records
- Firewall rules block legitimate traffic
- Load balancer health checks fail or return 503 errors
- VPN or IPsec tunnel connectivity is lost
- Network policies prevent expected communication between pods
- Port mapping or publishing issues occur in Docker containers
- Cross-zone or cross-service connectivity problems in Kubernetes
- High latency or packet loss between services
- SSL/TLS handshake failures due to certificate or network issues

---

## When NOT to Use

Avoid this skill for:

- Application-level connection errors (use code-debugging skills)
- Cloud provider API connectivity (use cloud-provider debugging skills)
- Infrastructure provisioning failures (use CNCF infrastructure skills)
- DNS provider configuration (use DNS-specific skills)
- Network hardware failures (use infrastructure networking skills)
- Application timeout issues without network symptoms (use performance debugging)
- Network monitoring and alerting (use Prometheus/Grafana skills)
- Network capacity planning (use infrastructure capacity skills)

---

## Core Workflow

Network troubleshooting follows a systematic layered approach to isolate and resolve connectivity issues:

1. **Assess Network Scope** — Determine if issue is local (single container/host), network-wide, or external. **Checkpoint:** Identify affected services and network boundaries before troubleshooting.
2. **Verify Basic Connectivity** — Test ICMP ping, port reachability, and interface status. **Checkpoint:** Confirm basic IP connectivity before layering higher-level tests.
3. **Inspect Firewall Rules** — Check iptables/nftables rules and security groups for blocking rules. **Checkpoint:** Verify no firewall rules drop packets before troubleshooting application layers.
4. **Test DNS Resolution** — Validate DNS lookup with nslookup, dig, or host commands. **Checkpoint:** Confirm DNS resolution works before testing application connectivity.
5. **Examine Network Configuration** — Review interface addresses, routes, and service configurations. **Checkpoint:** Verify network configuration matches expected topology.
6. **Analyze Traffic Flow** — Use tcpdump, netstat, or ss to capture and analyze network traffic. **Checkpoint:** Identify where packets are dropped or delayed before applying fixes.

---

## Implementation Patterns

### Pattern 1: Firewall Rule Debugging (iptables, nftables, security groups)

Diagnose firewall-related connectivity issues by examining and testing firewall rules on Linux systems, cloud security groups, and container network firewalls.

```bash
# ✅ GOOD — Comprehensive iptables inspection and testing
# List all rules with verbose output
iptables -L -n -v --line-numbers

# Show NAT table rules
iptables -t nat -L -n -v

# Show filter table rules
iptables -t filter -L -n -v

# Export full iptables configuration
iptables-save > /tmp/iptables-backup-$(date +%Y%m%d).rules

# Check specific chain rules (e.g., INPUT, OUTPUT, FORWARD)
iptables -L INPUT -n -v --line-numbers | head -50

# Count packets in each chain
iptables -L | awk '/^Chain/ {print $2} /^pkts/ {next} /[^0]  *[0-9]+/ {print}'
```

```bash
# ❌ BAD — Basic iptables check without details
iptables -L
# ❌ Missing verbose output for packet counts
# ❌ No line numbers for rule identification
# ❌ Only shows filter table, missing NAT
```

```bash
# ✅ GOOD — iptables diagnostic script with rule analysis
#!/bin/bash
# iptables diagnostic script

echo "=== iptables Diagnostic ==="
echo "Timestamp: $(date)"
echo ""

# Check if iptables is available
if ! command -v iptables &> /dev/null; then
    echo "ERROR: iptables not found"
    exit 1
fi

# List all rules with packet counts
echo "=== All Rules (with packet counts) ==="
iptables -L -n -v --line-numbers 2>&1 | head -100

# Check default policies
echo ""
echo "=== Default Policies ==="
iptables -L | grep -E "^Chain (INPUT|OUTPUT|FORWARD)" | awk '{print $2, $3}'

# Check for DROP rules
echo ""
echo "=== DROP Rules ==="
iptables -L -n | grep -i drop

# Check for ACCEPT rules in key chains
echo ""
echo "=== ACCEPT Rules in INPUT Chain ==="
iptables -L INPUT -n | grep -i accept | head -20
```

```bash
# ✅ GOOD — Test connectivity through specific ports
# Test if port is open and reachable
telnet <hostname> <port> 2>&1 | head -10

# Or using nc (netcat)
nc -zv <hostname> <port> 2>&1

# Or using bash built-in /dev/tcp
(timeout 5 bash -c "echo >/dev/tcp/<hostname>/<port>" && echo "Port open") || echo "Port closed"

# Test with curl for HTTP/HTTPS
curl -v --connect-timeout 5 http://<hostname>:<port>/ 2>&1 | head -30
```

```bash
# ✅ GOOD — Check nftables configuration
# List all nftables rules
nft list ruleset

# List specific table
nft list table inet filter

# Check nftables service status
systemctl status nftables 2>&1 | head -20

# Export nftables configuration
nft list ruleset > /tmp/nftables-backup-$(date +%Y%m%d).rules
```

```bash
# ✅ GOOD — Test cloud security group rules (AWS example)
# List security groups with ports open to world
aws ec2 describe-security-groups \
    --query 'SecurityGroups[?contains(IpPermissions[].ToPort, `22`)]' \
    --filters "Name=group-name,Values=*"

# Check if specific port is open
aws ec2 describe-security-groups --group-ids <sg-id> \
    --query 'SecurityGroups[0].IpPermissions[] | [?ToPort==`80`]'
```

### Pattern 2: DNS Resolution Troubleshooting (nslookup, dig, host, /etc/resolv.conf)

Diagnose DNS resolution failures by testing DNS queries, checking resolver configuration, and validating DNS server reachability.

```bash
# ✅ GOOD — Comprehensive DNS diagnostic with multiple tools
# Test with nslookup
nslookup google.com 2>&1

# Test with dig (more detailed)
dig google.com +short
dig google.com +trace 2>&1 | tail -20

# Test with host
host google.com 2>&1

# Check DNS resolver configuration
cat /etc/resolv.conf
```

```bash
# ❌ BAD — Basic DNS check without context
nslookup google.com
# ❌ No error output redirected
# ❌ No trace to show query path
# ❌ No alternative tool verification
```

```bash
# ✅ GOOD — DNS diagnostic script
#!/bin/bash
# DNS diagnostic script

TARGET=${1:-google.com}

echo "=== DNS Diagnostic for $TARGET ==="
echo "Timestamp: $(date)"
echo ""

# Check resolver configuration
echo "=== Resolver Configuration ==="
cat /etc/resolv.conf

# Test with nslookup
echo ""
echo "=== nslookup Test ==="
nslookup "$TARGET" 2>&1

# Test with dig
echo ""
echo "=== dig Test ==="
dig "$TARGET" +short
dig "$TARGET" +trace 2>&1 | tail -10

# Test with host
echo ""
echo "=== host Test ==="
host "$TARGET" 2>&1

# Check for DNSSEC validation
echo ""
echo "=== DNSSEC Validation ==="
dig "$TARGET" +cdflag +dnssec 2>&1 | tail -5
```

```bash
# ✅ GOOD — Test DNS resolution from inside container
# From host, exec into container and test DNS
docker exec myapp-container nslookup api.service.local
docker exec myapp-container dig api.service.local +short
docker exec myapp-container host api.service.local 2>&1

# Check container DNS configuration
docker exec myapp-container cat /etc/resolv.conf
docker exec myapp-container cat /etc/hosts

# Test internal service DNS
docker exec myapp-container nslookup db-service.default.svc.cluster.local
```

```bash
# ✅ GOOD — dig advanced queries for troubleshooting
# Get A record
dig example.com A +short

# Get MX records
dig example.com MX +short

# Get TXT records (for SPF, DKIM)
dig example.com TXT +short

# Query specific DNS server
dig @8.8.8.8 example.com +short

# Check TTL
dig example.com +noall +answer

# Show query time
dig example.com +stats | grep "Query time"
```

```bash
# ✅ GOOD — Test DNS from specific network namespace
# If using network namespaces
ip netns exec <namespace> nslookup example.com
ip netns exec <namespace> dig example.com +short

# List network namespaces
ip netns list
```

### Pattern 3: Load Balancer Configuration and Health Check Debugging

Diagnose load balancer issues by checking listener configuration, health check status, backend server health, and SSL/TLS termination.

```bash
# ✅ GOOD — Load balancer health check testing
# Test health endpoint directly
curl -v http://<lb-ip>:<health-port>/health 2>&1 | head -20

# Test with specific headers (for virtual hosts)
curl -v -H "Host: example.com" http://<lb-ip>/health 2>&1

# Test with timeout
curl --connect-timeout 5 --max-time 10 http://<lb-ip>/health 2>&1

# Test SSL/TLS termination
curl -v --cacert /path/to/ca.crt https://<lb-ip>/health 2>&1 | head -30
```

```bash
# ❌ BAD — Basic curl without headers or timeout
curl http://<lb-ip>/health
# ❌ No timeout, may hang indefinitely
# ❌ No verbose output for debugging
# ❌ No virtual host header for virtual hosts
```

```bash
# ✅ GOOD — Load balancer diagnostic script
#!/bin/bash
# Load balancer diagnostic script

LB_IP=${1:-127.0.0.1}
HEALTH_PORT=${2:-8080}
HEALTH_PATH=${3:-/health}

echo "=== Load Balancer Diagnostic ==="
echo "LB IP: $LB_IP"
echo "Health Port: $HEALTH_PORT"
echo "Health Path: $HEALTH_PATH"
echo "Timestamp: $(date)"
echo ""

# Test basic connectivity
echo "=== Connectivity Test ==="
nc -zv "$LB_IP" "$HEALTH_PORT" 2>&1 || \
curl -v --connect-timeout 5 "http://$LB_IP:$HEALTH_PORT/" 2>&1 | head -20

# Test health endpoint
echo ""
echo "=== Health Endpoint Test ==="
curl -s -w "\nHTTP Status: %{http_code}\nTime: %{time_total}s\n" \
    "http://$LB_IP:$HEALTH_PORT$HEALTH_PATH" 2>&1

# Check SSL certificate
echo ""
echo "=== SSL Certificate Check ==="
openssl s_client -connect "$LB_IP:443" -servername example.com </dev/null 2>/dev/null | \
    openssl x509 -noout -dates -subject -issuer 2>&1 || echo "SSL not configured or connection failed"

# Test with different protocols
echo ""
echo "=== Protocol Support Test ==="
echo -e "GET / HTTP/1.0\r\nHost: $LB_IP\r\n\r\n" | timeout 5 nc "$LB_IP" 80 2>&1 | head -10
```

```bash
# ✅ GOOD — AWS ELB health check diagnostics
# Check ELB health status
aws elb describe-instance-health --load-balancer-name <lb-name>

# Get ELB configuration
aws elb describe-load-balancers --load-balancer-names <lb-name>

# Check target group health (ALB/NLB)
aws elbv2 describe-target-health --target-group-arn <tg-arn>

# Get load balancer listeners
aws elb describe-listeners --load-balancer-name <lb-name>
```

```bash
# ✅ GOOD — NGINX load balancer diagnostics
# Check NGINX configuration
nginx -T 2>&1 | grep -A10 "upstream"

# Test upstream servers
curl http://<nginx-lb>/health 2>&1

# Check NGINX error logs
tail -100 /var/log/nginx/error.log | grep -i "upstream\|connection"

# Check active connections
curl -s http://<nginx-lb>/stub_status 2>&1
```

```bash
# ✅ GOOD — HAProxy diagnostics
# Check HAProxy stats
echo "show stat" | socat stdio /var/run/haproxy.sock | head -50

# Check HAProxy configuration
haproxy -c -f /etc/haproxy/haproxy.cfg 2>&1

# View frontend/backend status
echo "show info" | socat stdio /var/run/haproxy.sock 2>&1 | head -30
```

### Pattern 4: Container Networking Debugging (Docker, CNI, Calico, Cilium)

Diagnose container networking issues by inspecting Docker networks, CNI configurations, network policies, and cross-container connectivity.

```bash
# ✅ GOOD — Docker network inspection and testing
# List all Docker networks
docker network ls

# Inspect specific network
docker network inspect bridge 2>&1 | head -50

# Check container network configuration
docker inspect myapp-container --format='{{range $key, $value := .NetworkSettings.Networks}}{{$key}}: {{(index $value.IPCache).IPAddress}} {{end}}'

# Test container-to-container connectivity
docker exec app-container ping -c 3 db-container
docker exec app-container curl -v http://api-container:8080/health 2>&1
```

```bash
# ❌ BAD — Basic Docker network check
docker network ls
# ❌ No inspection of network configuration
# ❌ No connectivity testing
```

```bash
# ✅ GOOD — Comprehensive Docker network diagnostic script
#!/bin/bash
# Docker network diagnostic script

CONTAINER=${1:-myapp}
TARGET=${2:-db-service}

echo "=== Docker Network Diagnostic ==="
echo "Container: $CONTAINER"
echo "Target: $TARGET"
echo "Timestamp: $(date)"
echo ""

# Check container networks
echo "=== Container Networks ==="
docker inspect --format='{{range $key, $value := .NetworkSettings.Networks}}Network: {{$key}}
IP: {{(index $value.IPCache).IPAddress}}
MAC: {{.MacAddress}}
Gateway: {{.Gateway}}
{{end}}' "$CONTAINER"

# Check DNS resolution from container
echo ""
echo "=== DNS Resolution from Container ==="
docker exec "$CONTAINER" nslookup "$TARGET" 2>&1

# Test connectivity to target
echo ""
echo "=== Connectivity Test ==="
docker exec "$CONTAINER" ping -c 3 "$TARGET" 2>&1

# Check /etc/hosts in container
echo ""
echo "=== /etc/hosts in Container ==="
docker exec "$CONTAINER" cat /etc/hosts

# Check /etc/resolv.conf in container
echo ""
echo "=== DNS Configuration in Container ==="
docker exec "$CONTAINER" cat /etc/resolv.conf
```

```bash
# ✅ GOOD — Calico network policy debugging
# List all Calico profiles
calicoctl get profile 2>&1

# Show profile details
calicoctl get profile <profile-name> -o yaml 2>&1

# List network policies
calicoctl get networkpolicy 2>&1

# Show policy details
calicoctl get networkpolicy <policy-name> -o yaml 2>&1

# Check Calico status
calicoctl node status 2>&1

# View Calico logs
kubectl logs -n kube-system -l k8s-app=calico-node 2>&1 | tail -100
```

```bash
# ✅ GOOD — Cilium network policy debugging
# List all Cilium policies
cilium policy get 2>&1

# Get policy in JSON format
cilium policy get <policy-name> -o json 2>&1

# Check Cilium status
cilium status 2>&1 | head -50

# List endpoints
cilium endpoint list 2>&1

# Check connectivity
cilium connectivity test 2>&1

# View Cilium logs
kubectl logs -n kube-system -l k8s-app=cilium 2>&1 | tail -100
```

```bash
# ✅ GOOD — Kubernetes network policy testing
# List all network policies
kubectl get networkpolicy --all-namespaces 2>&1

# Get specific network policy
kubectl get networkpolicy <name> -n <namespace> -o yaml 2>&1

# Check pod labels for policy matching
kubectl get pods -n <namespace> --show-labels 2>&1

# Test network policy enforcement
kubectl run test-pod --rm -it --image=busybox --restart=Never -- sh
# Inside pod:
ping <target-pod-ip>
nslookup <target-service>
```

```bash
# ✅ GOOD — Check IP addresses and routing
# List all IP addresses
ip addr show 2>&1 | head -100

# Check routing table
ip route show 2>&1

# Check neighbor table (ARP)
ip neighbor show 2>&1 | head -50

# Check routing rules
ip rule show 2>&1

# Check policy routing tables
ip route show table all 2>&1 | head -50
```

```bash
# ✅ GOOD — Network namespace diagnostics
# List network namespaces
ip netns list 2>&1

# Execute in specific namespace
ip netns exec <namespace> ip addr show
ip netns exec <namespace> ip route show
ip netns exec <namespace> iptables -L -n

# Create new network namespace
ip netns add <namespace>
ip link add veth0 type veth peer name veth1
ip link set veth1 netns <namespace>
```

### Pattern 5: VPN and IPsec Connectivity Debugging

Diagnose VPN connectivity issues by checking IPsec status, tunnel state, routing, and authentication.

```bash
# ✅ GOOD — IPsec VPN diagnostics
# Check IPsec status (strongSwan)
strongswan status 2>&1 | head -50

# Check IPsec SAs (Security Associations)
strongswan statusall | grep -A10 "Security Associations"

# Check IPsec connections
strongswan status | grep -E "INSTALLED|ROUTED"

# View IPsec logs
journalctl -u strongswan -f 2>&1 | tail -50
```

```bash
# ❌ BAD — Basic IPsec check
ipsec status
# ❌ No detailed SA information
# ❌ No log inspection
```

```bash
# ✅ GOOD — OpenConnect VPN diagnostics
# Check VPN connection status
nmcli connection show --active 2>&1

# Get VPN connection details
nmcli connection show <vpn-connection> 2>&1

# Test connectivity through VPN
ip route show table 220 2>&1  # VPN routing table
ping -I vpn0 <target-ip> 2>&1

# Check VPN interface
ip addr show vpn0 2>&1
```

```bash
# ✅ GOOD — WireGuard VPN diagnostics
# Check WireGuard interface
wg show 2>&1

# Show interface details
wg show <interface> 2>&1

# Check WireGuard logs
journalctl -u wg-quick@<interface> -f 2>&1 | tail -50

# Test connectivity
ping -I wg0 <vpn-server-ip> 2>&1
```

```bash
# ✅ GOOD — Check routing through VPN
# View all routing tables
ip route show table all 2>&1

# Check default route
ip route show table main 2>&1 | grep default

# Check policy routing
ip rule show 2>&1

# Test connectivity via specific interface
ping -I <vpn-interface> <target-ip> 2>&1
```

### Pattern 6: Network Interface and Port Diagnostics (ip, ss, netstat, tcpdump)

Diagnose network interface issues, port listening status, and traffic patterns using modern Linux networking tools.

```bash
# ✅ GOOD — Comprehensive network interface inspection
# List all network interfaces
ip addr show 2>&1 | head -100

# List interfaces with specific details
ip -s addr show 2>&1  # with statistics

# Show specific interface
ip addr show eth0 2>&1

# Check interface status
ip link show eth0 2>&1

# Check interface statistics
ip -s link show eth0 2>&1 | head -50
```

```bash
# ❌ BAD — Basic interface check
ip addr
# ❌ No specific interface filter
# ❌ No statistics
```

```bash
# ✅ GOOD — Port listening status with ss
# List all listening ports
ss -tuln 2>&1

# Show detailed listening ports
ss -tulnp 2>&1  # with process info

# Check specific port
ss -tuln | grep :80 2>&1

# List established connections
ss -tn state established 2>&1 | head -50

# Show socket statistics
ss -s 2>&1
```

```bash
# ✅ GOOD — netstat alternatives (ss is preferred)
# Show all listening ports
netstat -tuln 2>&1

# Show established connections
netstat -tn 2>&1 | head -50

# Show routing table
netstat -rn 2>&1

# Show interface statistics
netstat -i 2>&1
```

```bash
# ✅ GOOD — tcpdump packet capture
# Capture all traffic on interface
tcpdump -i eth0 -nn 2>&1 | head -100

# Capture specific host
tcpdump -i eth0 -nn host 192.168.1.100 2>&1

# Capture specific port
tcpdump -i eth0 -nn port 80 2>&1 | head -100

# Capture specific protocol
tcpdump -i eth0 -nn tcp 2>&1 | head -100

# Capture with output to file
tcpdump -i eth0 -w /tmp/capture.pcap host 10.0.0.1 2>&1

# Read and display capture
tcpdump -r /tmp/capture.pcap 2>&1 | head -100
```

```bash
# ✅ GOOD — Network namespace tcpdump
# Capture in specific namespace
ip netns exec <namespace> tcpdump -i any -nn 2>&1 | head -100

# Capture from specific interface in namespace
ip netns exec <namespace> tcpdump -i eth0 -nn host 10.0.0.1 2>&1
```

```bash
# ✅ GOOD — Connection state analysis
# Check all connection states
ss -s 2>&1

# Show TCP connection state distribution
ss -tn | awk 'NR>1 {state[$1]++} END {for (s in state) print s, state[s]}'

# Check TIME_WAIT connections
ss -tn state time-wait 2>&1 | head -50

# Check CLOSE_WAIT connections (indicates application issue)
ss -tn state close-wait 2>&1
```

---

## Constraints

### MUST DO

- Always start network troubleshooting with basic connectivity tests (ping, nc, curl)
- Check iptables/nftables rules with verbose output (`iptables -L -n -v`) before troubleshooting application layers
- Test DNS resolution with multiple tools (nslookup, dig, host) to rule out tool-specific issues
- Verify load balancer health endpoints with `curl -v` including headers and timeouts
- Check Docker container network configuration with `docker inspect` before testing connectivity
- Use tcpdump for packet capture when connectivity is intermittent or intermittent failures occur
- Always verify DNS configuration in `/etc/resolv.conf` and `/etc/hosts` inside containers
- Check network policies (Calico, Cilium, Kubernetes) when pods cannot communicate
- Use `ip route show` and `ip addr show` to verify interface and routing configuration
- Test connectivity from inside containers using `docker exec <container> <command>`
- For VPN issues, check IPsec status and security associations before troubleshooting routing
- Always specify timeouts with curl/nc to prevent hanging connections during testing

### MUST NOT DO

- Never assume connectivity is working without testing from the actual source container/host
- Never skip packet capture (tcpdump) when troubleshooting intermittent network issues
- Never check iptables rules without the `-v` flag (missing packet counts hides blocking rules)
- Never test DNS from host only when troubleshooting container DNS issues
- Never ignore network namespaces when debugging container networking
- Never troubleshoot load balancer issues without checking health endpoint directly
- Never assume firewall rules are correct without verifying with `iptables-save`
- Never skip /etc/resolv.conf verification when DNS resolution fails
- Never use ping without `-c` flag (may hang indefinitely)
- Never debug container networking without checking `docker network inspect <network>`
- Never ignore interface statistics (`ip -s`) when troubleshooting packet loss
- Never troubleshoot connectivity without verifying the target IP and port are correct

---

## Output Template

When diagnosing network issues, the output must include:

1. **Connectivity Assessment**
   - Basic connectivity test results (ping, nc, curl)
   - Port reachability status for each service
   - Timeout and latency measurements

2. **Firewall Rule Analysis**
   - iptables/nftables rules showing blocking or allowing patterns
   - Default policies for INPUT, OUTPUT, FORWARD chains
   - Packet and byte counts for each rule

3. **DNS Resolution Status**
   - Results from nslookup, dig, and host commands
   - /etc/resolv.conf contents
   - /etc/hosts entries relevant to the issue

4. **Network Configuration**
   - Interface IP addresses and subnet masks
   - Routing table entries
   - Default gateway configuration
   - Container network configuration from docker inspect

5. **Load Balancer Health**
   - Health endpoint response status and timing
   - SSL/TLS certificate validity
   - Backend server health status

6. **Recommended Actions**
   - Specific commands to apply fixes
   - Configuration changes needed
   - Verification steps after remediation

---

## Related Skills

| Skill | Purpose |
|---|---|
| `agent-docker-debugging` | Container-specific debugging including Docker networking issues |
| `cncf-kubernetes` | Kubernetes cluster debugging including pod-to-pod networking |
| `trading-risk-stop-loss` | Network policy debugging for trading platform security |

---

## References

### Official Documentation

- **Linux Network Administration:** [https://www.kernel.org/doc/html/latest/admin-guide/networking/](https://www.kernel.org/doc/html/latest/admin-guide/networking/)
- **iptables Tutorial:** [https://iptables.org/](https://iptables.org/)
- **iproute2 Documentation:** [https://www.linuxfoundation.org/en/resources/docs/iproute2/](https://www.linuxfoundation.org/en/resources/docs/iproute2/)
- **tcpdump Documentation:** [https://www.tcpdump.org/manpages/tcpdump.1.html](https://www.tcpdump.org/manpages/tcpdump.1.html)
- **Docker Networking:** [https://docs.docker.com/network/](https://docs.docker.com/network/)
- **Calico Networking:** [https://docs.tigera.io/calico/latest/about/](https://docs.tigera.io/calico/latest/about/)
- **Cilium Networking:** [https://docs.cilium.io/en/stable/](https://docs.cilium.io/en/stable/)

### Common Commands Reference

```bash
# Network interface inspection
ip addr show
ip -s addr show  # with statistics
ip link show

# Routing table
ip route show
ip route show table all

# Port listening status
ss -tuln  # all listening ports
ss -tulnp # with process info

# Docker network
docker network ls
docker network inspect <network>
docker exec <container> ping -c 3 <target>

# DNS resolution
nslookup <hostname>
dig <hostname> +short
host <hostname>

# iptables
iptables -L -n -v --line-numbers
iptables-save
iptables -L INPUT -n -v --line-numbers

# Load balancer health
curl -v --connect-timeout 5 http://<lb-ip>:<port>/health

# VPN status
strongswan status
wg show

# Packet capture
tcpdump -i <interface> -nn host <ip>
tcpdump -i eth0 -w /tmp/capture.pcap port 80
```

### Network Troubleshooting Commands Reference

| Command | Purpose |
|---------|---------|
| `ip addr show` | List all network interfaces with IP addresses |
| `ss -tuln` | Show all listening TCP and UDP ports |
| `iptables -L -n -v` | List firewall rules with packet counts |
| `nslookup <host>` | Query DNS for hostname resolution |
| `dig <host> +short` | Get concise DNS resolution output |
| `curl --connect-timeout 5 <url>` | Test HTTP connectivity with timeout |
| `docker exec <c> ping -c 3 <t>` | Test container-to-container connectivity |
| `tcpdump -i eth0 -nn` | Capture and display network packets |
| `strongswan status` | Check IPsec VPN tunnel status |
| `wg show` | Show WireGuard VPN interface status |
| `ip route show` | Display routing table entries |
| `netstat -tuln` | Alternative to ss for listening ports |
| `calicoctl get profile` | List Calico network profiles |
| `cilium status` | Check Cilium CNI status |

---

*Network Troubleshooting Skill - Version 1.0.0*
