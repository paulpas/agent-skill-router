---
name: networking-troubleshooting
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: Implements comprehensive networking troubleshooting workflows for cloud-native
  environments including iptables debugging, DNS resolution, load balancer configuration,
  Kubernetes CNI, container networking, and VPN connectivity analysis
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: code
  related-skills: agent-docker-debugging, agent-network-troubleshooting, cncf-service-mesh-debugging
  role: implementation
  scope: implementation
  triggers: iptables debugging, dns issues, load balancer problems, network policies,
    kubernetes networking, container networking, vpn troubleshooting, firewall rules
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  - non-containerized architecture
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
version: "1.0.0"
---
# Networking Troubleshooting

Implements comprehensive networking troubleshooting workflows for cloud-native environments. This skill provides step-by-step procedures for diagnosing network connectivity issues across iptables rules, DNS resolution, load balancer configurations, Kubernetes CNI implementations, container networking, and VPN connectivity.

## TL;DR Checklist

- [ ] Check basic connectivity with ping and netcat to verify layer 3/4 connectivity
- [ ] Verify iptables rules with `iptables -L -n -v --line-numbers` and test rule impact
- [ ] Test DNS resolution using nslookup, dig, and check /etc/resolv.conf
- [ ] Examine load balancer health checks and backend pool status
- [ ] Validate Kubernetes network policies with kubectl and cni-debug
- [ ] Inspect container networking with docker exec and ip command
- [ ] Verify VPN tunnel status with ipsec status and wireguard commands
- [ ] Capture and analyze packet traffic with tcpdump and wireshark

---

## TL;DR for Code Generation

When implementing networking debugging solutions:

- [ ] Use `set -euo pipefail` in all bash scripts for strict error handling
- [ ] Include input validation and usage messages at the start of every script
- [ ] Add exit codes (0=success, 1=general error, 2=config error, 3=connectivity error)
- [ ] Use descriptive variable names like `TARGET_HOST` instead of `h1`
- [ ] Log all errors to stderr with `echo "ERROR: ..." >&2`
- [ ] Include rollback instructions for destructive commands
- [ ] Add comments explaining the purpose of each major code block
- [ ] Always test scripts in a non-production environment first

---

## When to Use

Use this skill when:

- Investigating network connectivity failures between services in a Kubernetes cluster
- Diagnosing DNS resolution issues affecting service discovery
- Troubleshooting load balancer health check failures or traffic routing problems
- Debugging iptables rules blocking legitimate traffic or allowing unauthorized access
- Investigating VPN connectivity issues for hybrid cloud or remote access scenarios
- Analyzing network policy enforcement and container-to-container communication failures
- Diagnosing cross-network communication issues in multi-cluster or multi-cloud environments

---

## When NOT to Use

Avoid this skill for:

- Application-layer protocol debugging (use application-specific skills instead)
- Performance bottleneck analysis (use profiling skills instead)
- Security vulnerability assessment (use security-review skill instead)
- Code-level network implementation issues (use coding network programming skills)
- Network infrastructure design decisions (use cncf-infrastructure skills)

---

## Core Workflow

1. **Assess Scope and Impact** — Determine the scope of the networking issue: single pod, entire namespace, cluster-wide, or cross-cluster. **Checkpoint:** Have you identified the affected services and the expected traffic flow?

2. **Basic Connectivity Verification** — Verify layer 3 and layer 4 connectivity using ping, traceroute, and netcat. **Checkpoint:** Can you establish basic TCP/UDP connections between endpoints?

3. **DNS Resolution Validation** — Test DNS resolution for all service names involved. **Checkpoint:** Do all required service names resolve to correct IP addresses?

4. **Firewall and Rule Analysis** — Examine iptables rules, network policies, and security groups. **Checkpoint:** Have you verified that rules allow required traffic and block only intended traffic?

5. **Load Balancer and Service Discovery** — Verify load balancer configuration, health checks, and backend pool status. **Checkpoint:** Are backends healthy and receiving traffic?

6. **Container and CNI Deep Dive** — Inspect container networking, CNI configurations, and network interfaces. **Checkpoint:** Can you trace the packet path through all network components?

---

## Implementation Patterns

### Pattern 1: iptables Debugging

Debugging iptables rules requires understanding the flow through chains and verifying rule matches.

```bash
# List all rules with verbose output and line numbers
iptables -L -n -v --line-numbers

# Check rule hit counts for specific chain
iptables -L INPUT -n -v --line-numbers | grep -v "0     0"

# Save current rules for analysis
iptables-save > /tmp/iptables-backup-$(date +%Y%m%d).rules

# Test a specific rule by matching packet criteria
iptables -I INPUT 1 -p tcp --dport 8080 -j LOG --log-prefix "PORT8080: "

# Flush rules temporarily for testing (WARNING: destructive)
iptables-save > /tmp/backup.rules
iptables -F
# Test connectivity
iptables-restore < /tmp/backup.rules

# Create a test rule to verify rule processing order
iptables -I INPUT -s 10.0.0.0/8 -p tcp --dport 443 -j ACCEPT
```

**BAD: Assuming rules are processed in table order**
```bash
# ❌ WRONG - Rules are processed in chain order within a table
# Tables (filter, nat, mangle, raw, security) are processed in fixed order
# Chains within tables are processed in order specified by rule insertion
iptables -L
# Must check -N flags and rule positions, not just display order
```

**GOOD: Using rule hit counts to identify effective rules**
```bash
# ✅ CORRECT - Check which rules are actually matching packets
iptables -L INPUT -n -v --line-numbers | awk '$1 > 0 && $2 > 0 {print}'
# Focus on rules with non-zero packet/byte counts
```

---

### Pattern 2: DNS Resolution Troubleshooting

DNS issues are common in Kubernetes environments. This pattern covers comprehensive DNS testing.

```bash
# Test DNS resolution with nslookup
nslookup kubernetes.default.svc.cluster.local

# Use dig for detailed DNS information
dig kubernetes.default.svc.cluster.local +short
dig @10.96.0.10 kubernetes.default.svc.cluster.local +short

# Check resolv.conf in container
kubectl exec -n kube-system <pod-name> -- cat /etc/resolv.conf

# Test CoreDNS pod connectivity
kubectl get pods -n kube-system -l k8s-app=kube-dns
kubectl exec -n kube-system <coredns-pod> -- nslookup kubernetes.default

# Flush DNS cache (Linux)
sudo systemd-resolve --flush-caches
sudo /etc/init.d/dns-clean

# Test external DNS resolution
dig google.com
dig @8.8.8.8 google.com
```

**BAD: Only testing DNS from one pod**
```bash
# ❌ WRONG - May miss Coredns-specific issues
kubectl run -it --rm debug --image=busybox -- sh
# Must test from multiple pods and namespaces
```

**GOOD: Comprehensive DNS test script**
```bash
# ✅ CORRECT - Tests all DNS resolution paths
#!/bin/bash
DNS_SERVERS=(10.96.0.10 8.8.8.8 1.1.1.1)
SERVICES=(kubernetes.default.svc.cluster.local google.com)

for server in "${DNS_SERVERS[@]}"; do
  echo "Testing DNS server: $server"
  for svc in "${SERVICES[@]}"; do
    echo -n "$svc: "
    nslookup "$svc" "$server" 2>&1 | grep -E "Name:|Address:|** server" || echo "FAIL"
  done
done
```

---

### Pattern 3: Load Balancer Configuration Verification

Verify load balancer health checks, backend pools, and traffic distribution.

```bash
# Check Kubernetes Service load balancer status
kubectl get svc <service-name> -n <namespace> -o yaml

# Verify load balancer health check endpoint
curl -s http://<lb-ip>:<health-port>/healthz

# Check backend pod readiness
kubectl get endpoints <service-name> -n <namespace>

# Test load balancer distribution
for i in {1..10}; do
  curl -s http://<lb-ip>/ | grep -oP '"pod":"[^"]*"' || echo "No pod info"
done

# AWS ELB health check test
aws elb describe-instance-health --load-balancer-name <lb-name>

# GCP HTTP load balancer test
gcloud compute backend-services get-health <backend-service> --region <region>

# Check Nginx Ingress controller logs
kubectl logs -n ingress-nginx <ingress-controller-pod> | grep -i "upstream"
```

**BAD: Only checking service endpoint exists**
```bash
# ❌ WRONG - Missing backend health verification
kubectl get endpoints <service>
# Must verify individual pod health and readiness
```

**GOOD: Load balancer verification script**
```bash
# ✅ CORRECT - Comprehensive load balancer check
#!/bin/bash
LB_IP=$1
PORT=${2:-80}

echo "=== Load Balancer Health Check ==="
echo "Endpoint: $LB_IP:$PORT"

# Check service exists
kubectl get svc -A | grep -q "$LB_IP" || echo "⚠️  Service not found in cluster"

# Test connectivity
nc -zv $LB_IP $PORT 2>&1

# Check health endpoint
curl -sf "http://$LB_IP:$PORT/health" && echo "Health: OK" || echo "Health: FAIL"

# Test load distribution
echo "=== Traffic Distribution Test ==="
for i in {1..5}; do
  response=$(curl -s "http://$LB_IP:$PORT")
  echo "Request $i: $response"
done
```

---

### Pattern 4: Kubernetes CNI Debugging

Debugging CNI issues requires examining CNI plugins, network policies, and pod networking.

```bash
# Check CNI configuration files
kubectl exec -n kube-system <cni-pod> -- cat /etc/cni/net.d/10-flannel.conflist

# Verify CNI plugin pods
kubectl get pods -n kube-system | grep -E "flannel|calico|cilium|weave"

# Check CNI plugin logs
kubectl logs -n kube-system <flannel-pod>
kubectl logs -n kube-system <calico-node> --all-containers

# Test pod-to-pod communication
kubectl exec <pod1> -- ping <pod2-ip>
kubectl exec <pod1> -- nc -zv <pod2-ip> 80

# Verify network policy enforcement
kubectl get netpol -A
kubectl describe netpol <policy-name> -n <namespace>

# Test with cni-debug (if available)
kubectl debug node/<node-name> -it --image=ubuntu -- cni-debug

# Check IPAM allocation
kubectl exec -n kube-system <calico-node> -- calicoctl ipam show --show-usage
```

**BAD: Assuming CNI is working without verification**
```bash
# ❌ WRONG - No actual connectivity test
kubectl get pods -o wide
# Must test actual network connectivity between pods
```

**GOOD: CNI troubleshooting checklist script**
```bash
# ✅ CORRECT - Systematic CNI verification
#!/bin/bash
NAMESPACE=${1:-default}

echo "=== CNI Troubleshooting ==="

# Check CNI pods
echo "1. CNI Plugin Status:"
kubectl get pods -n kube-system | grep -E "flannel|calico|cilium|weave" || echo "No CNI pods found"

# Check pod IPs
echo "2. Pod IP Assignment:"
kubectl get pods -n $NAMESPACE -o wide | head -5

# Test pod-to-pod (same node)
echo "3. Same-Node Connectivity:"
POD1=$(kubectl get pods -n $NAMESPACE -o name | head -1 | cut -d/ -f2)
POD2=$(kubectl get pods -n $NAMESPACE -o name | tail -1 | cut -d/ -f2)
if [ -n "$POD1" ] && [ -n "$POD2" ]; then
  kubectl exec $POD1 -- ping -c 3 $(kubectl get pod $POD2 -o jsonpath='{.status.podIP}') 2>&1
fi

# Test pod-to-service
echo "4. Service Connectivity:"
kubectl exec $POD1 -- curl -s http://kubernetes.default.svc:443 2>&1 | head -1
```

---

### Pattern 5: Container Networking Verification

Debugging container networking requires examining container networks, bridges, and iptables.

```bash
# List Docker networks
docker network ls

# Inspect a specific network
docker network inspect <network-name>

# Check container network interfaces
docker exec <container> ip addr show

# Test container connectivity
docker exec <container1> ping <container2-ip>
docker exec <container1> nc -zv <container2-ip> 80

# Check bridge configuration
ip link show docker0
brctl show docker0

# Verify iptables for Docker
iptables -t nat -L -n -v

# Check container DNS configuration
docker exec <container> cat /etc/resolv.conf

# Test DNS from container
docker exec <container> nslookup google.com

# Debug with netshoot
docker run --rm -it netshoot tools
```

**BAD: Only checking container is running**
```bash
# ❌ WRONG - No network verification
docker ps
# Must verify actual network connectivity
```

**GOOD: Container networking diagnostics script**
```bash
# ✅ CORRECT - Complete container network diagnostics
#!/bin/bash
CONTAINER=${1:-app}

echo "=== Container Network Diagnostics ==="
echo "Container: $CONTAINER"

# Check if container exists
docker ps -a --format '{{.Names}}' | grep -q "^$CONTAINER$" || { echo "Container not found"; exit 1; }

# Network interfaces
echo "1. Network Interfaces:"
docker exec $CONTAINER ip addr show

# Routes
echo "2. Route Table:"
docker exec $CONTAINER ip route show

# DNS configuration
echo "3. DNS Configuration:"
docker exec $CONTAINER cat /etc/resolv.conf

# Test external connectivity
echo "4. External DNS:"
docker exec $CONTAINER nslookup google.com 2>&1 | head -5

# Test HTTP connectivity
echo "5. HTTP Connectivity:"
docker exec $CONTAINER curl -s -o /dev/null -w "%{http_code}" https://google.com || echo "FAIL"
```

---

### Pattern 6: VPN Connectivity Troubleshooting

Debugging VPN connectivity requires checking tunnel status, routing, and firewall rules.

```bash
# Check IPsec status
sudo ipsec status

# View IPsec connections
sudo ipsec statusall

# Check WireGuard interface
sudo wg show

# View routing table
ip route show

# Add VPN route manually
sudo ip route add <subnet> via <vpn-gateway>

# Test VPN connectivity
ping <vpn-endpoint-ip>
nc -zv <vpn-endpoint-ip> 443

# Capture VPN traffic
sudo tcpdump -i any host <vpn-endpoint-ip> -w /tmp/vpn.pcap

# Check firewall rules for VPN
sudo iptables -L -n -v | grep -E "(500|4500|1194)"

# Restart VPN service
sudo systemctl restart strongswan
sudo systemctl restart wg-quick@wg0

# View VPN logs
sudo journalctl -u strongswan -f
sudo journalctl -u wg-quick@wg0 -f
```

**BAD: Only checking VPN service is running**
```bash
# ❌ WRONG - No actual connectivity verification
systemctl status strongswan
# Must test actual network connectivity through VPN
```

**GOOD: VPN connectivity verification script**
```bash
# ✅ CORRECT - Comprehensive VPN verification
#!/bin/bash
VPN_NAME=${1:-vpn0}
REMOTE_HOST=${2:-vpn.example.com}

echo "=== VPN Troubleshooting ==="

# Check VPN interface
echo "1. VPN Interface:"
ip addr show $VPN_NAME 2>/dev/null || echo "Interface $VPN_NAME not found"

# Check tunnel status
echo "2. VPN Tunnel Status:"
case $VPN_NAME in
  wg*) wg show $VPN_NAME ;;
  *) ipsec status ;;
esac

# Check routes
echo "3. VPN Routes:"
ip route show | grep -E "($REMOTE_HOST|via $VPN_NAME)"

# Test connectivity
echo "4. VPN Endpoint Connectivity:"
ping -c 3 $REMOTE_HOST 2>&1 || echo "Ping failed"

# Test specific ports
echo "5. Port Connectivity:"
for port in 443 8443 500 4500; do
  nc -zv $REMOTE_HOST $port 2>&1 | grep -q "succeeded" && echo "Port $port: OPEN" || echo "Port $port: CLOSED"
done
```

---

### Pattern 7: Network Policy Enforcement Testing

Verify that network policies are correctly enforced and not blocking legitimate traffic.

```bash
# List all network policies
kubectl get netpol -A

# Describe a specific policy
kubectl describe netpol <policy-name> -n <namespace>

# Test policy enforcement with netshoot
kubectl run -it --rm debug --image=netshoot -- sh

# From debug pod, test connectivity to pods in different namespaces
curl -s http://<target-pod-ip>:<port>

# Verify ingress/egress rules
kubectl get netpol <policy> -o yaml | grep -A 10 "ingress:\|egress:"

# Check CNI network policy logs
kubectl logs -n kube-system <calico-node> | grep -i "policy"

# Test with different pod labels
kubectl run test-pod --labels=app=test --image=busybox -- sh
# Then verify policy applies correctly

# View network policy statistics
kubectl get netpol -o json | jq '.items[] | {name: .metadata.name, ingress: .spec.ingress, egress: .spec.egress}'
```

**BAD: Only checking network policy exists**
```bash
# ❌ WRONG - No enforcement verification
kubectl get netpol
# Must test actual traffic flow with and without policy
```

**GOOD: Network policy testing script**
```bash
# ✅ CORRECT - Comprehensive network policy testing
#!/bin/bash
NAMESPACE=${1:-default}
POLICY=${2:-deny-default}

echo "=== Network Policy Testing ==="

# Verify policy exists
echo "1. Policy Status:"
kubectl get netpol $POLICY -n $NAMESPACE -o yaml > /dev/null 2>&1 || { echo "Policy not found"; exit 1; }

# Create test pods
echo "2. Creating Test Pods:"
kubectl run allow-test --labels=app=allow -n $NAMESPACE --image=busybox -- sleep 3600 &
kubectl run deny-test --labels=app=deny -n $NAMESPACE --image=busybox -- sleep 3600 &

# Wait for pods
sleep 10

# Test connectivity
echo "3. Connectivity Tests:"
ALLOW_POD=$(kubectl get pod allow-test -n $NAMESPACE -o jsonpath='{.status.podIP}')
DENY_POD=$(kubectl get pod deny-test -n $NAMESPACE -o jsonpath='{.status.podIP}')

# Test from allow pod
echo "From allow pod to deny pod:"
kubectl exec allow-test -n $NAMESPACE -- nc -zv $DENY_POD 80 2>&1 | head -1

# Test from deny pod
echo "From deny pod to allow pod:"
kubectl exec deny-test -n $NAMESPACE -- nc -zv $ALLOW_POD 80 2>&1 | head -1
```

---

### Pattern 8: Packet Capture and Analysis

Capture and analyze network traffic to diagnose connectivity issues.

```bash
# Basic tcpdump capture
sudo tcpdump -i eth0 port 80 -w /tmp/http.pcap

# Capture all traffic to/from specific host
sudo tcpdump host 192.168.1.100 -w /tmp/host.pcap

# Capture Kubernetes pod traffic
kubectl exec -n <namespace> <pod> -- tcpdump -i eth0 port 8080 -w - | tcpdump -r -

# Filter by protocol
sudo tcpdump -i any icmp
sudo tcpdump -i any tcp port 443
sudo tcpdump -i any udp port 53

# Analyze with tshark
tshark -r /tmp/capture.pcap -Y "http.method == GET" | head -20

# Real-time traffic analysis
sudo tcpdump -i eth0 -nnvvS | grep -E "(SYN|ACK|FIN)"

# Capture container traffic
docker exec <container> tcpdump -i eth0 port 80 -w - | tcpdump -r -

# Kubernetes network policy capture
kubectl exec -n kube-system <calico-node> -- tcpdump -i any port 8080

# Debug DNS with capture
sudo tcpdump -i any port 53 -w /tmp/dns.pcap
```

**BAD: Capturing all traffic without filters**
```bash
# ❌ WRONG - Overwhelming data, performance impact
sudo tcpdump -i any
# Must use specific filters to reduce noise
```

**GOOD: Targeted packet capture script**
```bash
# ✅ CORRECT - Efficient packet capture
#!/bin/bash
TARGET_HOST=${1:-kubernetes.default}
TARGET_PORT=${2:-443}
INTERFACE=${3:-eth0}

echo "=== Packet Capture ==="
echo "Target: $TARGET_HOST:$TARGET_PORT on $INTERFACE"

# Get target IP if hostname provided
if [[ $TARGET_HOST =~ ^[a-z] ]]; then
  TARGET_IP=$(getent hosts $TARGET_HOST | awk '{print $1}')
  echo "Resolved to: $TARGET_IP"
else
  TARGET_IP=$TARGET_HOST
fi

# Capture with filters
sudo tcpdump -i $INTERFACE \
  -w /tmp/capture-$(date +%Y%m%d-%H%M%S).pcap \
  -c 100 \
  "host $TARGET_IP and port $TARGET_PORT" || \
sudo tcpdump -i $INTERFACE "host $TARGET_IP and port $TARGET_PORT"
```

---

### Pattern 9: Kubernetes Service Discovery

Debug Kubernetes service discovery issues including headless services and external services.

```bash
# Check Service definition
kubectl get svc <service-name> -n <namespace> -o yaml

# Verify endpoints
kubectl get endpoints <service-name> -n <namespace>

# Test service DNS from within cluster
kubectl run -it --rm debug --image=busybox -- sh
nslookup <service-name>.<namespace>.svc.cluster.local

# Check external name service
kubectl get svc <external-service> -n <namespace> -o yaml

# Test external service resolution
kubectl exec <pod> -- nslookup <external-service>.<namespace>.svc.cluster.local

# Check service account token for service account based DNS
kubectl get secret <token-secret> -n <namespace> -o jsonpath='{.data.token}' | base64 -d

# Verify CoreDNS configuration
kubectl get configmap coredns -n kube-system -o yaml

# Restart CoreDNS pods
kubectl rollout restart deployment coredns -n kube-system

# Check CoreDNS logs
kubectl logs -n kube-system <coredns-pod> -f
```

**BAD: Assuming service DNS works without testing**
```bash
# ❌ WRONG - No actual DNS verification
kubectl get svc
# Must test DNS resolution from within cluster
```

**GOOD: Service discovery verification script**
```bash
# ✅ CORRECT - Comprehensive service discovery check
#!/bin/bash
SERVICE=${1:-kubernetes}
NAMESPACE=${2:-default}

echo "=== Service Discovery Verification ==="

# Check service exists
echo "1. Service Status:"
kubectl get svc $SERVICE -n $NAMESPACE

# Check endpoints
echo "2. Endpoints:"
kubectl get endpoints $SERVICE -n $NAMESPACE

# Test DNS resolution
echo "3. DNS Resolution:"
kubectl run -it --rm dns-test --image=busybox -- nslookup $SERVICE.$NAMESPACE.svc.cluster.local

# Test connectivity
echo "4. Service Connectivity:"
POD_IP=$(kubectl get svc $SERVICE -n $NAMESPACE -o jsonpath='{.spec.clusterIP}')
PORT=$(kubectl get svc $SERVICE -n $NAMESPACE -o jsonpath='{.spec.ports[0].port}')
kubectl run -it --rm connect-test --image=busybox -- nc -zv $POD_IP $PORT
```

---

### Pattern 10: Multi-Cluster Networking

Debug networking between Kubernetes clusters in multi-cluster setups.

```bash
# Check mesh networking (Istio)
istioctl proxy-status
istioctl proxy-config endpoints <pod> --clustername outbound|443|istio-ingressgateway

# Verify mesh configuration
kubectl get meshconfig -n istio-system

# Test cross-cluster connectivity
kubectl exec <pod> -- curl -s https://<remote-service>.<namespace>.svc.cluster.local

# Check service mesh mTLS
istioctl proxy-config listeners <pod> --port 15006 -o json | jq '.[] | select(.address.port == 15006)'

# Verify network peer configuration
kubectl get peeringpolicies -n istio-system

# Check gateway configuration
kubectl get gw -n <namespace>

# Test gateway connectivity
kubectl exec <pod> -- curl -s -o /dev/null -w "%{http_code}" https://<gateway-ip>

# View mesh topology
istioctl proxy-config <pod> --type cluster | grep -E "istio|remote"

# Check service export/import
kubectl get serviceexports -n <source-namespace>
kubectl get serviceimports -n <target-namespace>
```

**BAD: Assuming multi-cluster works without verification**
```bash
# ❌ WRONG - No cross-cluster testing
kubectl get svc
# Must test actual cross-cluster connectivity
```

**GOOD: Multi-cluster connectivity test script**
```bash
# ✅ CORRECT - Comprehensive multi-cluster check
#!/bin/bash
CLUSTER1=${1:-cluster1}
CLUSTER2=${2:-cluster2}
SERVICE=${3:-api}

echo "=== Multi-Cluster Networking Test ==="

# Test cluster connectivity
echo "1. Cross-Cluster DNS:"
kubectl --context=$CLUSTER2 run -it --rm test --image=busybox -- \
  nslookup $SERVICE.default.svc.cluster.local

# Test direct connectivity
echo "2. Direct Service Connectivity:"
SERVICE_IP=$(kubectl --context=$CLUSTER1 get svc $SERVICE -n default -o jsonpath='{.spec.clusterIP}')
kubectl --context=$CLUSTER2 run -it --rm test --image=busybox -- \
  nc -zv $SERVICE_IP 80

# Check mesh status
echo "3. Service Mesh Status:"
istioctl --context=$CLUSTER1 proxy-status | head -5
istioctl --context=$CLUSTER2 proxy-status | head -5
```

---

## Constraints

### MUST DO

- Always start troubleshooting with basic connectivity tests (ping, nc) before diving into complex configurations
- Document all rule changes before applying them in production environments
- Test network policies in a non-production namespace first
- Use the principle of least privilege for firewall rules
- Capture packet traces when investigating intermittent issues
- Verify both ingress and egress rules when debugging connectivity
- Check DNS resolution from multiple containers to isolate CNI issues
- Validate load balancer health checks before investigating service issues

### MUST NOT DO

- Do not flush iptables rules in production without a documented rollback plan
- Do not disable network policies to "fix" connectivity issues
- Do not rely solely on `kubectl get pods` for networking verification
- Do not assume DNS is working without testing from multiple namespaces
- Do not ignore error messages from CNI plugin logs
- Do not make network changes during peak traffic hours
- Do not skip packet capture when investigating complex routing issues

---

## Output Template

When implementing networking troubleshooting solutions, provide:

1. **Root Cause Analysis** — Clear explanation of what's failing and why
2. **Affected Components** — List of all network components involved (pods, services, CNI, LBs, firewalls)
3. **Verification Steps** — Command sequence to confirm the fix works
4. **Rollback Plan** — Steps to restore previous configuration if needed
5. **Prevention Measures** — Recommendations to avoid similar issues

### Code Output Format

For implementation skills, provide:

```bash
#!/bin/bash
# Script title and purpose
# Usage: ./script.sh [options]

set -euo pipefail

# Configuration
# Variables and defaults

# Main logic
main() {
  # Step-by-step implementation
}

# Execute
main "$@"
```

Include:
- Error handling with set -euo pipefail
- Input validation and usage messages
- Exit codes for different failure modes
- Logging to stderr for debugging

---

## Related Skills

| Skill | Purpose |
|---|---|
| `agent-network-troubleshooting` | Agent-level network diagnostics and orchestration |
| `agent-docker-debugging` | Container-specific debugging and inspection |
| `cncf-service-mesh-debugging` | Service mesh (Istio, Linkerd) troubleshooting |
| `cncf-prometheus` | Network metrics collection and alerting |
| `coding-network-programming` | Network code implementation patterns |

---

## References

- [Kubernetes Networking Documentation](https://kubernetes.io/docs/concepts/cluster-administration/networking/)
- [Istio Networking Concepts](https://istio.io/latest/docs/concepts/networking/)
- [Calico Documentation](https://docs.tigera.io/calico/latest/about/)
- [CoreDNS Configuration](https://coredns.io/manual/toc/)
- [iptables Handbook](https://netfilter.org/documentation/)
- [TCP/IP Guide](https://www.tcpipguide.com/)
- [Network Policy Cookbook](https://github.com/ahmetb/kubernetes-network-policy-recipes)

---

*This skill provides comprehensive networking troubleshooting workflows for cloud-native environments. Always verify fixes in a non-production environment before applying to production systems.*
