---
name: cncf-networking-osi
description: OSI Model Networking for Cloud-Native - All 7 layers with CNCF project
  mappings, Kubernetes networking, and troubleshooting patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: cncf
  role: reference
  scope: infrastructure
  output-format: manifests
  triggers: cloud-native, layers, model, networking osi, networking-osi
---
  related-skills: cncf-aws-route53, cncf-azure-cdn, cncf-azure-traffic-manager, cncf-azure-virtual-networks


# OSI Model Networking for Cloud-Native

**Category:** networking  
**Status:** Active  
**Last Updated:** 2026-04-22  
**Primary Reference:** [OSI Model - ISO/IEC 7498-1](https://www.iso.org/standard/7462.html)

---

## Purpose: Why OSI Layers Matter for CNCF

Understanding the OSI model is essential for cloud-native engineering because:

### The 5 Laws of Network Defense

1. **Early Exit**: Troubleshoot from Layer 1 upward. A physical layer failure at Layer 1 invalidates all upper layers.
2. **Parse, Don't Validate**: Each layer has a specific data format. Don't try to fix Layer 4 TCP issues by examining Layer 2 frames.
3. **Atomic Predictability**: Each layer provides deterministic services. TCP guarantees delivery; IP does not. Know what to expect.
4. **Fail Fast, Fail Loud**: Network failures cascade predictably. Identify the root layer quickly to avoid chasing symptoms.
5. **Intentional Naming**: Layer 3 = Network (IP routing), Layer 4 = Transport (TCP/UDP ports). Confusing these wastes hours.

### CNCF Context

Cloud-native applications span multiple layers:
- **Layer 1-2**: CNI plugins (Calico, Cilium, Flannel) handle pod networking
- **Layer 3**: Service discovery, cross-node routing
- **Layer 4**: Service meshes (Istio, Linkerd) manage traffic at transport layer
- **Layer 7**: Ingress controllers (NGINX, Contour, Gloo) handle HTTP/HTTPS

---

## OSI Layer Overview

| Layer # | Name | PDU | Key Function | CNCF Relevance |
|---------|------|-----|--------------|----------------|
| 7 | Application | Data | User interfaces, protocols (HTTP, DNS, FTP) | Ingress, API gateways |
| 6 | Presentation | Data | Data formatting, encryption, compression | TLS termination, encoding |
| 5 | Session | Data | Connection management, dialog control | WebSockets, RPC sessions |
| 4 | Transport | Segments | End-to-end communication, flow control | TCP/UDP, service meshes |
| 3 | Network | Packets | Logical addressing, routing | IP, CNI routing, load balancers |
| 2 | Data Link | Frames | Physical addressing, error detection | Ethernet, VLANs, switches |
| 1 | Physical | Bits | Electrical/optical signals, cables | NICs, fiber, copper |

---

## Layer 1: Physical

### Key Concepts

The Physical layer handles raw bit transmission over physical media. No addressing, no protocols, just electrical signals.

### Key Protocols and Technologies

| Technology | Speed | Medium | Use Case |
|------------|-------|--------|----------|
| Ethernet (IEEE 802.3) | 10 Mbps - 800 Gbps | Copper/Fiber | Standard LAN |
| USB | 480 Mbps - 40 Gbps | Copper | Device connectivity |
| Fiber Channel | 8-128 Gbps | Fiber | Storage networks |
| Wi-Fi (IEEE 802.11) | 54 Mbps - 9.6 Gbps | Radio | Wireless LAN |
| Thunderbolt | 40 Gbps | Copper | High-speed peripheral |

### Common Tools and Commands

```bash
# Check interface status and link layer info
ip link show
ip -s link show  # With statistics

# Check physical media type
ethtool eth0
ethtool -i eth0  # Driver info
ethtool -m eth0  # SFP module info

# Monitor interface statistics
ip -s link show docker0

# Watch for errors in real-time
watch -n 1 'ip -s link show eth0 | grep -E "(errors|dropped|overrun)"'
```

### CNCF Project Examples

| Project | Layer 1 Interaction |
|---------|---------------------|
| **CNI** | Configures network interfaces, handles NIC attachment |
| **kubevirt** | Manages virtual NICs, passes through physical devices |
| **KubeEdge** | Edge device network interface management |

### Real-World Examples

**Use Case: Node Network Troubleshooting**
```bash
# Check if interface is up
ip link show eth0
# Expected: state UP

# Check link speed and duplex
ethtool eth0 | grep -E "(Speed|Duplex|Link detected)"

# Check for hardware errors
dmesg | grep -i "eth0" | grep -iE "(error|fail|drop)"

# Check SFP module status (common in cloud)
ethtool -m eth0 | grep -E "(Temp|Voltage|TxPower|RxPower)"
```

### Troubleshooting Tips

1. **"No Carrier" errors**: Check physical connections first
2. **CRC errors**: Faulty cable, bad NIC, or electrical interference
3. **Collisions** (full-duplex shouldn't have these): Duplex mismatch or hardware issue
4. **Interface flapping**: Loose cable, faulty NIC, or power issue

---

## Layer 2: Data Link

### Key Concepts

The Data Link layer provides node-to-node data transfer, error detection, and MAC addressing. It segments into two sublayers:
- **LLC (Logical Link Control)**: Error checking, flow control
- **MAC (Media Access Control)**: Device addressing, frame delimiting

### Key Protocols and Technologies

| Protocol | Function | Use Case |
|----------|----------|----------|
| Ethernet (802.3) | Frame format, MAC addressing | Standard LAN |
| VLAN (802.1Q) | Virtual LAN segmentation | Network isolation |
| ARP | IP to MAC address resolution | IPv4 addressing |
| NDP | IP to MAC address resolution | IPv6 addressing |
| STP | Spanning Tree Protocol | Prevent loop in switched networks |

### Common Tools and Commands

```bash
# View MAC addresses
ip link show
ip addr show

# View ARP table
ip neigh show
arp -a  # Legacy

# Monitor VLANs
ip link show type vlan

# View switch ports (if available)
ss -p -tuln  # Listening TCP/UDP ports
```

### CNCF Project Examples

| Project | Layer 2 Function |
|---------|------------------|
| **Cilium** | BPF-based VLAN handling, MAC learning |
| **Calico** | VXLAN encapsulation (Layer 2.5) |
| **Flannel** | VXLAN, host-gw for pod networking |
| **KubeVirt** | Virtual NIC MAC address assignment |
| **CoreDNS** | ARP/NDP for service discovery |

### Real-World Examples

**Use Case: Pod-to-Pod Communication on Same Node**
```bash
# Get pod IP and MAC
kubectl get pod -o wide
kubectl exec <pod> -- ip addr show eth0

# Check ARP table on node
ip neigh show | grep <pod-ip>

# Check VLAN configuration
ip link show type vlan
```

**Use Case: VLAN Troubleshooting in Kubernetes**
```bash
# Create VLAN interface (on node)
ip link add link eth0 name eth0.100 type vlan id 100
ip link set eth0.100 up

# CNI configuration for VLAN (Calico)
cat <<EOF | kubectl apply -f -
apiVersion: crd.projectcalico.org/v1
kind: BGPConfiguration
metadata:
  name: default
spec:
  vlan: 100
EOF
```

### Troubleshooting Tips

1. **MAC address conflicts**: Duplicate MACs cause flapping
2. **VLAN mismatch**: Pods can't communicate across VLANs
3. **MTU issues**: Oversized frames get dropped
4. **STP blocking**: Ports in blocking state don't forward

---
  related-skills: cncf-aws-route53, cncf-azure-cdn, cncf-azure-traffic-manager, cncf-azure-virtual-networks

## Layer 3: Network

### Key Concepts

The Network layer handles logical addressing (IP), routing, and forwarding. It enables communication across different networks.

### Key Protocols and Technologies

| Protocol | Function | Port/Value |
|----------|----------|------------|
| IP (IPv4/IPv6) | Logical addressing | 32/128-bit addresses |
| ICMP | Error reporting, ping | Type 0/8 (echo) |
| ARP | IPv4 MAC resolution | Ethernet type 0x0806 |
| NDP | IPv6 MAC resolution | ICMPv6 messages |
| IGMP | Multicast group management | Protocol 2 |
| MLD | Multicast listener discovery | ICMPv6 |

### Routing Protocols

| Protocol | Type | Use Case |
|----------|------|----------|
| Static | Manual | Simple, predictable routing |
| RIP | Distance vector | Legacy small networks |
| OSPF | Link-state | Enterprise networks |
| BGP | Path vector | Internet routing, CNIs |

### Common Tools and Commands

```bash
# View routing table
ip route show
route -n  # Legacy

# Test connectivity (ICMP)
ping <ip>
ping6 <ipv6>  # IPv6

# Trace route
traceroute <ip>
tracepath <ip>  # Without root

# Check IPv6
ip -6 route show

# Monitor ICMP
tcpdump -i eth0 icmp  # IPv4
tcpdump -i eth0 icmp6  # IPv6
```

### CNCF Project Examples

| Project | Layer 3 Function |
|---------|------------------|
| **Calico** | BGP routing, IP-in-IP, VXLAN |
| **Cilium** | BPF-based routing, eBPF datapath |
| **Kube-router** | BGP routing, service proxy |
| **CoreDNS** | DNS resolution for pod IPs |
| **KubeVirt** | VM network interface IP assignment |

### Real-World Examples

**Use Case: Cross-Node Pod Communication**
```bash
# On node 1: Get pod IP
kubectl get pod -o wide

# Ping pod on different node
kubectl exec <pod-on-node1> -- ping <pod-ip-on-node2>

# Check routing table
ip route show | grep <pod-cidr>

# Verify CNI routing (Calico BGP)
kubectl exec -n calico-system -it <calico-node> -- birdc show ip route
```

**Use Case: Troubleshooting Network Partitions**
```bash
# Check if nodes can reach each other
kubectl get nodes -o wide
for node in $(kubectl get nodes -o name); do
  kubectl exec <some-pod> -- ping $(kubectl get $node -o jsonpath='{.status.addresses[?(@.type=="InternalIP")].address}')
done

# Check iptables rules (legacy kube-proxy)
iptables -L -n -v | grep KUBE-SERVICES
```

### Troubleshooting Tips

1. **"No route to host"**: Missing route or default gateway
2. **TTL exceeded**: Routing loop
3. **ICMP unreachable**: Firewall blocking or no route
4. **Pod can't reach external**: Missing egress route or NAT

---

## Layer 4: Transport

### Key Concepts

The Transport layer provides end-to-end communication services, including connection management, flow control, and error recovery.

### Key Protocols

| Protocol | Connection | Reliability | Use Case |
|----------|------------|-------------|----------|
| TCP | Yes | Guaranteed | HTTP, gRPC, databases |
| UDP | No | Best effort | DNS, streaming, gaming |
| SCTP | Yes | Guaranteed | Telecom, SIGTRAN |
| DCCP | No | Unreliable | Streaming, VoIP |

### TCP Features

- **Three-way handshake**: SYN → SYN-ACK → ACK
- **Flow control**: Sliding window via advertised window
- **Congestion control**: Slow start, congestion avoidance
- **Error recovery**: Retransmission on timeout

### UDP Features

- No connection establishment
- No flow control
- No congestion control
- Lightweight, low latency

### Common Tools and Commands

```bash
# View TCP connections
ss -tuln  # Listening
ss -tulnp # With processes

# TCP state breakdown
ss -s  # Summary
ss -an | awk '{print $1}' | sort | uniq -c

# View port usage
netstat -tuln  # Legacy
lsof -i :8080  # Process using port

# TCP dump analysis
tcpdump -i eth0 port 80 -w capture.pcap
tcpdump -i eth0 tcp[tcpflags] & tcpflags != 0  # TCP flags only
```

### CNCF Project Examples

| Project | Layer 4 Function |
|---------|------------------|
| **Service Mesh (Istio/Linkerd)** | TCP connection pooling, retries, timeouts |
| **CoreDNS** | UDP/TCP for DNS queries |
| **Kong** | TCP/UDP load balancing, rate limiting |
| **Kafka** | TCP for broker communication |
| **etcd** | TCP for cluster consensus |

### Real-World Examples

**Use Case: Service Mesh Traffic Management**
```yaml
# Istio VirtualService for TCP traffic
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: database-routes
spec:
  hosts:
  - database.default.svc.cluster.local
  tcp:
  - match:
    - port: 5432
    route:
    - destination:
        host: database.default.svc.cluster.local
        port:
          number: 5432
      weight: 90
    - destination:
        host: database-standby.default.svc.cluster.local
        port:
          number: 5432
      weight: 10
```

**Use Case: Troubleshooting Connection Issues**
```bash
# Check established connections
ss -tnp | grep :443

# Check TIME_WAIT connections (can exhaust ports)
ss -tn state time-wait | wc -l

# View socket buffer sizes
ss -l -t -n | head -5

# TCP dump for handshake analysis
tcpdump -i eth0 host <server> and port <port> -X
```

### Troubleshooting Tips

1. **Port exhaustion**: Too many TIME_WAIT connections
2. **Connection refused**: No process listening on port
3. **Connection reset**: Server reset the connection
4. **Slow transfer**: Congestion control or flow control issue

---
  related-skills: cncf-aws-route53, cncf-azure-cdn, cncf-azure-traffic-manager, cncf-azure-virtual-networks

## Layer 5: Session

### Key Concepts

The Session layer manages dialog control (cooperation between applications), including establishment, maintenance, and termination of sessions.

### Key Functions

- **Session establishment**: Handshakes, authentication
- **Session maintenance**: Keep-alive, checkpointing
- **Session termination**: Graceful close, abort
- **Dialog control**: Full-duplex, half-duplex

### Key Protocols

| Protocol | Function | Session Type |
|----------|----------|--------------|
| NetBIOS | Session service | Legacy Windows |
| PPTP | Point-to-point tunneling | VPN |
| SIP | Session Initiation | VoIP, WebRTC |
| RPC | Remote procedure calls | Distributed apps |
| WebSocket | Full-duplex communication | Web apps |

### Common Tools and Commands

```bash
# WebSocket debug (browser dev tools or CLI)
wscat -c wss://example.com/ws

# Check RPC services
rpcinfo -p  # NFS, etc.

# NetBIOS session (if enabled)
nmblookup -A <ip>
```

### CNCF Project Examples

| Project | Session Layer Function |
|---------|------------------------|
| **Knative** | Session management for eventing |
| **Dapr** | Service-to-service invocation sessions |
| **gRPC** | HTTP/2 stream multiplexing |
| **WebSockets (API servers)** | Real-time communication |

### Real-World Examples

**Use Case: WebSocket Session in Kubernetes**
```yaml
# Example: WebSocket service with proper session handling
apiVersion: v1
kind: Service
metadata:
  name: websocket-service
spec:
  selector:
    app: websocket-app
  ports:
  - name: http
    port: 80
    targetPort: 8080
  - name: ws
    port: 8080
    targetPort: 8080
---
  related-skills: cncf-aws-route53, cncf-azure-cdn, cncf-azure-traffic-manager, cncf-azure-virtual-networks
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: websocket-ingress
  annotations:
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
spec:
  rules:
  - http:
      paths:
      - path: /ws
        pathType: Prefix
        backend:
          service:
            name: websocket-service
            port:
              number: 80
```

**Use Case: Troubleshooting Session Timeouts**
```bash
# Check HTTP/2 streams (gRPC uses HTTP/2)
tcpdump -i eth0 port 50051 -X | grep -i "WINDOW_UPDATE"

# WebSocket ping/pong (keep-alive)
wscat -c wss://example.com/ws --no-check
# Send: {"type": "ping"}
```

### Troubleshooting Tips

1. **Session stuck**: Client or server not sending FIN
2. **Session timeout**: Idle timeout too short for long operations
3. **Half-open sessions**: Client crashed, server unaware

---
  related-skills: cncf-aws-route53, cncf-azure-cdn, cncf-azure-traffic-manager, cncf-azure-virtual-networks

## Layer 6: Presentation

### Key Concepts

The Presentation layer handles data formatting, encryption/decryption, compression, and translation between application and network formats.

### Key Functions

- **Data formatting**: JSON, XML, protobuf encoding
- **Encryption/Decryption**: TLS, SSL
- **Compression**: gzip, deflate, Brotli
- **Character encoding**: UTF-8, ASCII

### Common Protocols

| Protocol | Function | Use Case |
|----------|----------|----------|
| TLS/SSL | Encryption | HTTPS, mTLS in service mesh |
| ASN.1 | Abstract syntax notation | Protocol encoding |
| JPEG/PNG | Image encoding | Web assets |
| Protobuf | Serialization | gRPC messages |

### Common Tools and Commands

```bash
# SSL/TLS certificate check
openssl s_client -connect example.com:443 -showcerts
curl -v https://example.com  # HTTP with headers

# Check TLS version and ciphers
openssl s_client -connect example.com:443 -tls1_2
openssl s_client -connect example.com:443 -tls1_3

# View certificate details
openssl x509 -in cert.pem -text -noout
```

### CNCF Project Examples

| Project | Presentation Layer Function |
|---------|-----------------------------|
| **Cert-manager** | TLS certificate management |
| **Istio** | mTLS between services |
| **SPIRE** | SPIFFE/SPIRE identity management |
| **Traefik** | TLS termination |
| **Kong** | SSL certificates, JWT validation |

### Real-World Examples

**Use Case: Service Mesh mTLS Verification**
```bash
# Check if mTLS is enabled between pods
kubectl exec <pod> -- curl -v https://other-pod:8080

# Check Istio sidecar TLS configuration
istioctl proxy-status

# View certificate details from sidecar
istioctl proxy-config secrets <pod> | jq '.dynamicActiveSecrets[0].tlsContext.rootCert'
```

**Use Case: Certificate Troubleshooting**
```bash
# Check certificate expiry
openssl s_client -connect api.example.com:443 </dev/null 2>/dev/null | \
  openssl x509 -noout -dates

# Check certificate chain
curl --cacert ca.pem --cert cert.pem --key key.pem https://example.com

# Verify certificate with service mesh
istioctl analyze
```

### Troubleshooting Tips

1. **Certificate expired**: Check expiry dates
2. **Certificate chain incomplete**: Add intermediate certificates
3. **Cipher mismatch**: Client/server don't share cipher suite
4. **Hostname mismatch**: CN/SAN doesn't match hostname

---

## Layer 7: Application

### Key Concepts

The Application layer is where user-facing protocols operate. This is where HTTP, DNS, FTP, SSH, and other application protocols function.

### Key Protocols

| Protocol | Port | Type | Use Case |
|----------|------|------|----------|
| HTTP/HTTPS | 80/443 | Request/Response | Web applications |
| DNS | 53 | Query/Response | Name resolution |
| FTP | 21 | File transfer | File sharing |
| SSH | 22 | Secure shell | Remote management |
| SMTP | 25 | Email | Email delivery |
| gRPC | 50051 | RPC | High-performance APIs |
| WebSocket | 80/443 | Full-duplex | Real-time apps |

### Common Tools and Commands

```bash
# HTTP request testing
curl -v https://example.com
wget -S https://example.com -O /dev/null

# DNS lookup
nslookup example.com
dig example.com
host example.com

# HTTP/2 check
curl -v --http2 https://example.com

# WebSocket test
wscat -c wss://example.com/ws
```

### CNCF Project Examples

| Project | Layer 7 Function |
|---------|------------------|
| **Ingress Controllers** | HTTP routing, TLS termination |
| **Kong** | API gateway, rate limiting |
| **Contour** | Envoy-based ingress |
| **Traefik** | Dynamic ingress |
| **Envoy** | HTTP/L7 proxy |
| **CoreDNS** | DNS service discovery |

### Real-World Examples

**Use Case: Ingress Controller Configuration**
```yaml
# Nginx Ingress Controller with path-based routing
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  tls:
  - hosts:
    - app.example.com
    secretName: app-tls
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 80
      - path: /static
        pathType: Prefix
        backend:
          service:
            name: static-service
            port:
              number: 80
```

**Use Case: Application Layer Troubleshooting**
```bash
# Debug HTTP 5xx errors
kubectl exec <pod> -- curl -v http://backend:8080/health

# Check response headers
curl -I https://api.example.com/v1/users

# DNS resolution test
kubectl exec <pod> -- nslookup kubernetes.default.svc.cluster.local

# gRPC health check
grpcurl -plaintext api.example.com:50051 list
```

### Troubleshooting Tips

1. **HTTP 404**: Route not found, path mismatch
2. **HTTP 502**: Backend not responding
3. **HTTP 503**: All backends unhealthy
4. **DNS failure**: CoreDNS issue or network partition

---
  related-skills: cncf-aws-route53, cncf-azure-cdn, cncf-azure-traffic-manager, cncf-azure-virtual-networks

## Modern Cloud Implementations: CNCF Project Mappings

### CNCF Project to OSI Layer Mapping

| CNCF Project | Primary Layers | Role |
|--------------|----------------|------|
| **CNI** | L2-L3 | Container networking |
| **Calico** | L3-L4 | BGP routing, network policy |
| **Cilium** | L2-L7 | eBPF datapath, L7 policy |
| **CoreDNS** | L7 | DNS service discovery |
| **Envoy** | L3-L7 | Service mesh data plane |
| **Istio** | L4-L7 | Service mesh control plane |
| **Linkerd** | L4-L7 | Lightweight service mesh |
| **Kong** | L7 | API gateway |
| **Contour** | L7 | Ingress controller |
| **Traefik** | L7 | Edge router |
| **Cert-manager** | L6 | TLS certificates |
| **SPIRE** | L6 | Identity management |
| **Kong** | L4-L7 | TCP/UDP and HTTP load balancing |

### Kubernetes Networking Stack

```
Application Layer (L7)
├── Ingress Controllers (Nginx, Contour, Traefik)
├── Service Meshes (Istio, Linkerd)
├── API Gateway (Kong)
└── CoreDNS

Transport Layer (L4)
├── kube-proxy (iptables/IPVS)
├── CNI Plugins (Calico, Cilium, Flannel)
└── Service Meshes (connection pooling, retries)

Network Layer (L3)
├── IPAM (Calico IPAM)
├── Route Controllers
└── BGP Peering (Calico)

Data Link Layer (L2)
├── veth pairs
├── Linux bridges (cbr0)
├── VLANs (if configured)
└── MAC addresses

Physical Layer (L1)
├── Network interfaces
├── NIC drivers
└── Physical links
```

### Real-World Architecture Example

**Multi-Cluster Service Mesh with L7 Load Balancing**
```
                     ┌─────────────────────────┐
                     │  Global Ingress (L7)    │
                     │        Traefik          │
                     └─────────────┬───────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
    ┌────▼─────┐             ┌────▼─────┐             ┌────▼─────┐
    │ Cluster  │             │ Cluster  │             │ Cluster  │
    │  A       │             │  B       │             │  C       │
    └────┬─────┘             └────┬─────┘             └────┬─────┘
         │                         │                         │
    ┌────▼─────┐             ┌────▼─────┐             ┌────▼─────┐
    │  Istio   │             │  Istio   │             │  Istio   │
    │  (L4-L7) │             │  (L4-L7) │             │  (L4-L7) │
    └────┬─────┘             └────┬─────┘             └────┬─────┘
         │                         │                         │
    ┌────▼─────┐             ┌────▼─────┐             ┌────▼─────┐
    │  Calico  │             │  Calico  │             │  Cilium  │
    │  (L3-L4) │             │  (L3-L4) │             │  (L2-L7) │
    └──────────┘             └──────────┘             └──────────┘
```

---

## Best Practices

### Network Design Principles

1. **Defense in Depth**: Layer security controls across OSI layers
2. **Segmentation**: Use VLANs, network policies to isolate workloads
3. **Least Privilege**: Network policies should deny by default
4. **Redundancy**: Multiple paths, ECMP for resilience

### Security Best Practices

```bash
# Network policy for default deny all ingress
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
spec:
  podSelector: {}
  policyTypes:
  - Ingress
EOF

# Allow only specific namespace
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-from-frontend
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: frontend
    - podSelector:
        matchLabels:
          app: web
    ports:
    - protocol: TCP
      port: 8080
EOF
```

### Monitoring Best Practices

```bash
# Monitor network policy enforcement
kubectl get networkpolicies --all-namespaces

# Check CNI plugin status (Calico)
kubectl get bgpconfigurations
kubectl get bgppeers
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{end}' | \
  xargs -I {} kubectl get node {} -o jsonpath='{.status.conditions[?(@.type=="NetworkUnavailable")].message}'

# TCP connection tracking
ss -s | grep -E "(TCP|TCPtw|TCPorphan)"
```

### Troubleshooting Methodology

1. **Start at Layer 1**: Check physical links, interface status
2. **Move Up**: Verify Layer 2 (MAC, ARP), Layer 3 (routing, IP)
3. **Layer 4**: Check ports, protocols, firewalls
4. **Layer 7**: Application-specific issues

```bash
# Complete network troubleshooting checklist
echo "=== Layer 1: Physical ==="
ip link show | grep -E "state|link/ether"

echo "=== Layer 2: Data Link ==="
ip neigh show | head -10
ip link show type vlan

echo "=== Layer 3: Network ==="
ip route show
ip route get 8.8.8.8  # Test routing

echo "=== Layer 4: Transport ==="
ss -tuln | head -20
ss -s | grep TCP

echo "=== Layer 7: Application ==="
kubectl get services --all-namespaces
kubectl get ingress --all-namespaces
```

---
  related-skills: cncf-aws-route53, cncf-azure-cdn, cncf-azure-traffic-manager, cncf-azure-virtual-networks

## Scaling Considerations

### Horizontal Scaling Strategies

1. **Layer 4 Load Balancing**: Distribute TCP/UDP connections
2. **Layer 7 Load Balancing**: HTTP-based routing, content switching
3. **ECMP**: Equal-cost multi-path for network layer load balancing
4. **DNS-based**: Round-robin DNS for simple load distribution

### Service Mesh Scaling

```yaml
# Istio load balancing policy
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: backend-loadbalancing
spec:
  host: backend.default.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      simple: ROUND_ROBIN  # Also: LEAST_CONN, RANDOM, PASSTHROUGH
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: UPGRADE
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
```

### CDN Integration

```yaml
# Frontend with CDN fallback
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: frontend-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/configuration-snippet: |
      location /static/ {
        proxy_pass https://cdn.example.com;
        proxy_cache_valid 200 1d;
      }
spec:
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
```

### Edge Computing

```yaml
# KubeEdge edge node configuration
# On edge node
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: edge-config
  namespace: kubeedge
data:
  edgehub.conf: |
    {
      "edgehub": {
        "mqtt": {
          "mode": "cloud",
          "server": "tcp://coredns.kube-system.svc.cluster.local:1883"
        }
      }
    }
EOF
```

### Performance Tuning

```bash
# TCP tuning for high throughput
echo "net.core.somaxconn = 65535" >> /etc/sysctl.conf
echo "net.ipv4.tcp_tw_reuse = 1" >> /etc/sysctl.conf
echo "net.ipv4.tcp_fin_timeout = 15" >> /etc/sysctl.conf
sysctl -p

# Kubernetes pod network tuning
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: cni-config
  namespace: kube-system
data:
  cni.conf: |
    {
      "name": "calico",
      "cniVersion": "0.3.1",
      "plugins": [
        {
          "type": "calico",
          "mtu": 1450,
          "log_level": "info"
        },
        {
          "type": "portmap",
          "snat": true,
          "capabilities": {"portMappings": true}
        }
      ]
    }
EOF
```

---
  related-skills: cncf-aws-route53, cncf-azure-cdn, cncf-azure-traffic-manager, cncf-azure-virtual-networks

## References

- **OSI Model**: ISO/IEC 7498-1 standard
- **Kubernetes Networking**: [https://kubernetes.io/docs/concepts/cluster-administration/networking/](https://kubernetes.io/docs/concepts/cluster-administration/networking/)
- **Calico Documentation**: [https://docs.tigera.io/calico/latest/about/](https://docs.tigera.io/calico/latest/about/)
- **Cilium Documentation**: [https://docs.cilium.io/](https://docs.cilium.io/)
- **Service Mesh Interface**: [https://smi-spec.io/](https://smi-spec.io/)

---

## Quick Reference: Troubleshooting Commands

```bash
# One-line network diagnostics
kubectl get pods -o wide && \
  ip link show && \
  ip route show && \
  ss -tuln && \
  curl -s http://kubernetes.default.svc/healthz

# Service mesh health check (Istio)
istioctl proxy-status && \
  istioctl analyze && \
  kubectl get destinationrules,sidecars --all-namespaces

# DNS troubleshooting
kubectl exec -n kube-system -it <coredns-pod> -- nslookup kubernetes.default.svc.cluster.local
kubectl exec <pod> -- nslookup <service>.<namespace>.svc.cluster.local
```
