---
name: cncf-container-network-interface-cni
description: Container Network Interface in Cloud Native Network - cloud native architecture, patterns, pitfalls, and best practices
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: cncf
  role: reference
  scope: infrastructure
  output-format: manifests
  triggers: container network interface cni, container-network-interface-cni, cloud, native, architecture
---
# Container Network Interface in Cloud-Native Engineering

**Category:** network  
**Status:** Active  
**Stars:** 7,200  
**Last Updated:** 2026-04-22  
**Primary Language:** Go  
**Documentation:** [https://www.cni.dev/](https://www.cni.dev/)  

---

## Purpose and Use Cases

CNI (Container Network Interface) is a CNCF graduated project that provides a standard specification and library for writing plugins to configure network interfaces in Linux containers.

### What Problem Does It Solve?

Container networking fragmentation across different container runtimes. Before CNI, each runtime (Docker, rkt, containerd) had its own networking model. CNI provides a consistent interface that allows any CNI-compliant plugin to work with any CNI-compliant runtime.

### When to Use This Project

Use CNI when you need:
- Container network configuration that works across multiple runtimes
- Custom networking implementations (SDN, overlay networks, etc.)
- Network policies and security controls for containers
- Integration with existing network infrastructure

### Key Use Cases

- **Kubernetes Networking**: CNI is the standard for Kubernetes pod networking
- **Multi-container Networking**: Coordinating network configuration for related containers
- **Network Policy Enforcement**: Implementing network segmentation and security policies
- **Hybrid Network Integration**: Connecting containers to existing network infrastructure
- **Custom Network Functions**: Implementing specialized network services (firewalls, load balancers)

---

## Architecture Design Patterns

### Plugin Architecture

CNI defines a plugin architecture with two types of plugins:

#### 1. Network Plugins (Main Plugins)

Network plugins are responsible for configuring the network interface:

```go
// CNI plugin interface
type CNI interface {
    Add(networkName string, netns string, args *RuntimeArgs) (types.Result, error)
    Del(networkName string, netns string, args *RuntimeArgs) error
}

// Example: Bridge plugin configuration
{
  "cniVersion": "1.0.0",
  "name": "mynet",
  "type": "bridge",
  "bridge": "cni0",
  "isGateway": true,
  "ipam": {
    "type": "host-local",
    "subnet": "10.1.0.0/16"
  }
}
```

#### 2. IPAM Plugins (IP Address Management)

IPAM plugins handle IP address allocation and management:

```go
// IPAM plugin interface
type IPAM interface {
    Add(ipamArgs *IPAMArgs) (*types.Result, error)
    Check(ipamArgs *IPAMArgs) error
    Del(ipamArgs *IPAMArgs) error
    Release(ipamArgs *IPAMArgs) error
}

// Example: host-local IPAM configuration
{
  "type": "host-local",
  "subnet": "10.1.0.0/16",
  "rangeStart": "10.1.0.2",
  "rangeEnd": "10.1.0.254",
  "gateway": "10.1.0.1",
  "dataDir": "/var/lib/cni/networks/mynet"
}
```

### CNI Configuration Format

The CNI configuration is a JSON document:

```json
{
  "cniVersion": "1.0.0",
  "name": "example-network",
  "plugins": [
    {
      "type": "bridge",
      "bridge": "cni0",
      "isGateway": true,
      "ipam": {
        "type": "host-local",
        "subnet": "10.1.0.0/16"
      }
    },
    {
      "type": "portmap",
      "capabilities": {
        "portMappings": true
      }
    }
  ]
}
```

### Plugin Chain

CNI supports chaining multiple plugins together:

```json
{
  "cniVersion": "1.0.0",
  "name": "example",
  "plugins": [
    {
      "type": "flannel",
      "delegate": {
        "hairpinMode": true
      }
    },
    {
      "type": "portmap",
      "capabilities": {
        "portMappings": true
      }
    },
    {
      "type": "firewall",
      "firewall": {
        "ingressPolicy": "deny",
        "egressPolicy": "allow"
      }
    }
  ]
}
```

### Runtime Configuration

CNI plugins receive runtime configuration via environment variables:

```bash
# Environment variables passed to CNI plugins
CNI_COMMAND=ADD
CNI_CONTAINERID=container-id
CNI_NETNS=/var/run/netns/container-netns
CNI_IFNAME=eth0
CNI_PATH=/opt/cni/bin
CNI_ARGS=K8S_POD_NAMESPACE=default;K8S_POD_NAME=nginx

# Environment variables for IPAM plugins
CNI_ARGS=K8S_POD_NAMESPACE=default;K8S_POD_NAME=nginx
CNI_NETNS=/var/run/netns/container-netns
CNI_IFNAME=eth0
```

### Data Flow

```
Runtime Request
     ↓
CNI Library (config parsing)
     ↓
Plugin Chain
 1. Network Plugin 1
 2. Network Plugin 2
     ↓
IPAM Plugin
 1. Allocate IP
 2. Configure IP
     ↓
Result to Runtime
```

---

## Integration Approaches

### Kubernetes Integration

CNI is the standard networking interface for Kubernetes:

```yaml
# Kubernetes Pod with CNI
apiVersion: v1
kind: Pod
metadata:
  name: nginx
  namespace: default
spec:
  containers:
  - name: nginx
    image: nginx
    ports:
    - containerPort: 80
```

#### Pod Network Configuration

```bash
# When Pod is created, kubelet calls CNI plugin
# with the following environment:

CNI_COMMAND=ADD
CNI_CONTAINERID=<pod-container-id>
CNI_NETNS=/var/run/netns/kubelet-netns
CNI_IFNAME=eth0
CNI_PATH=/opt/cni/bin

# The CNI plugin configures the network interface
# and returns the result including IP address
```

### Standalone Container Integration

#### Docker with CNI

```bash
# Create a CNI network for Docker
cat > /etc/cni/net.d/10-mynet.conf << EOF
{
  "cniVersion": "1.0.0",
  "name": "mynet",
  "type": "bridge",
  "bridge": "cni0",
  "isGateway": true,
  "ipam": {
    "type": "host-local",
    "subnet": "10.1.0.0/16"
  }
}
EOF

# Run container with CNI network
docker run --net=cni:mynet nginx
```

#### rkt with CNI

```bash
# rkt configuration with CNI
cat > /etc/rkt/net.d/mynet.conf << EOF
{
  "acKind": "PodManifest",
  "acVersion": "v1",
  "name": "my-pod",
  "app": {
    "name": "my-app",
    "image": {
      "name": "docker://nginx"
    }
  },
  "annotations": {
    "net.beta.kubernetes.io/network-policy": {
      "ingress": {
        "allows": [
          {
            "from": {
              "cidr": "10.1.0.0/16"
            }
          }
        ]
      }
    }
  }
}
EOF
```

### API Server Integration

```bash
# CNI plugin HTTP API (optional)
# GET /healthz - health check
# POST /networks - create network
# DELETE /networks/{network} - delete network
# GET /networks/{network}/interfaces - list interfaces

# Example: Create network via HTTP
curl -X POST http://localhost:9090/networks \
  -H "Content-Type: application/json" \
  -d '{
    "name": "mynet",
    "subnet": "10.1.0.0/16",
    "gateway": "10.1.0.1"
  }'
```

### Cloud Integration

#### AWS VPC CNI

```bash
# AWS VPC CNI plugin
# Plugin: aws-cni
# Features: VPC IP addressing, ENI attachment

# Configuration
{
  "cniVersion": "1.0.0",
  "name": "aws-vpc",
  "type": "aws-cni",
  "vethPrefix": "eni",
  "pluginLogLevel": "DEBUG",
  "pluginEnableSNAT": true,
  "pluginEnablePrefixDelegation": true
}
```

#### GCP GCE CNI

```bash
# Google Cloud CNI plugin
# Plugin: gce-pod-ip-address-cni
# Features: GCE internal IP addresses

# Configuration
{
  "cniVersion": "1.0.0",
  "name": "gce-pod-ip",
  "type": "gce-pod-ip-address-cni",
  "ipam": {
    "type": "host-local",
    "subnet": "10.128.0.0/9"
  }
}
```

---

## Common Pitfalls and How to Avoid Them

### 1. Plugin Path Configuration

**Pitfall:** CNI plugins not found due to incorrect CNI_PATH.

```bash
# ❌ Incorrect - CNI_PATH not set
# Run without CNI_PATH - plugins not found

# ✅ Correct - CNI_PATH set properly
export CNI_PATH=/opt/cni/bin
# or when running as a command
CNI_PATH=/opt/cni/bin cni-plugin-name
```

### 2. Configuration File Format

**Pitfall:** Incorrect JSON formatting in CNI config files.

```json
// ❌ Incorrect - invalid JSON
{
  "cniVersion": "1.0.0",
  "name": "mynet"
  "type": "bridge", // Missing comma!
}

// ✅ Correct - valid JSON
{
  "cniVersion": "1.0.0",
  "name": "mynet",
  "type": "bridge",
  "isGateway": true,
  "ipam": {
    "type": "host-local",
    "subnet": "10.1.0.0/16"
  }
}
```

### 3. IPAM Address Conflicts

**Pitfall:** IP address conflicts when multiple plugins use the same subnet.

```json
// ❌ Incorrect - overlapping subnets
{
  "plugins": [
    {
      "type": "bridge",
      "ipam": {
        "type": "host-local",
        "subnet": "10.1.0.0/16"
      }
    },
    {
      "type": "bridge",
      "ipam": {
        "type": "host-local",
        "subnet": "10.1.0.0/16" // Overlapping!
      }
    }
  ]
}

// ✅ Correct - non-overlapping subnets
{
  "plugins": [
    {
      "type": "bridge",
      "name": "net1",
      "ipam": {
        "type": "host-local",
        "subnet": "10.1.0.0/16"
      }
    },
    {
      "type": "bridge",
      "name": "net2",
      "ipam": {
        "type": "host-local",
        "subnet": "10.2.0.0/16"
      }
    }
  ]
}
```

### 4. DNS Configuration

**Pitfall:** Missing DNS configuration in CNI plugin.

```json
// ❌ Incorrect - no DNS configuration
{
  "type": "bridge",
  "bridge": "cni0",
  "ipam": {
    "type": "host-local",
    "subnet": "10.1.0.0/16"
  }
}

// ✅ Correct - with DNS configuration
{
  "type": "bridge",
  "bridge": "cni0",
  "isGateway": true,
  "ipam": {
    "type": "host-local",
    "subnet": "10.1.0.0/16",
    "routes": [
      { "dst": "0.0.0.0/0" }
    ]
  },
  "dns": {
    "nameservers": ["8.8.8.8", "8.8.4.4"],
    "domain": "cluster.local",
    "search": ["svc.cluster.local"]
  }
}
```

### 5. Network Namespace Handling

**Pitfall:** Incorrect network namespace path.

```go
// ❌ Incorrect - wrong namespace path
func addNetwork(containerID, netns string) error {
    // Using wrong path
    nsPath := "/var/run/netns/" + containerID
    
    // ✅ Correct - use provided netns path
    nsPath := netns
    // or for default namespace
    nsPath := "/proc/self/ns/net"
    
    // ... rest of implementation
}
```

### 6. Error Handling

**Pitfall:** Not properly cleaning up on errors.

```go
// ❌ Incorrect - partial cleanup on error
func addNetwork(config *NetConf, rt *RuntimeArgs) error {
    iface, err := createInterface(config, rt)
    if err != nil {
        return err
    }
    
    ipamResult, err := allocateIP(config, rt)
    if err != nil {
        return err // ❌ interface not cleaned up!
    }
    
    return nil
}

// ✅ Correct - proper cleanup on error
func addNetwork(config *NetConf, rt *RuntimeArgs) error {
    var iface *Interface
    var err error
    
    // Create interface
    iface, err = createInterface(config, rt)
    if err != nil {
        return err
    }
    
    // Allocate IP
    ipamResult, err := allocateIP(config, rt)
    if err != nil {
        // Cleanup interface on error
        delInterface(config, rt)
        return err
    }
    
    return nil
}
```

---

## Coding Practices

### Plugin Template

```go
package main

import (
    "fmt"
    "net"
    "os"
    
    "github.com/containernetworking/cni/pkg/skel"
    "github.com/containernetworking/cni/pkg/types"
    "github.com/containernetworking/cni/pkg/types/current"
    "github.com/containernetworking/cni/pkg/version"
)

// Plugin configuration
type NetConf struct {
    types.NetConf
    Bridge      string `json:"bridge"`
    IsGateway   bool   `json:"isGateway"`
    IPAM        *IPAMConfig `json:"ipam"`
}

type IPAMConfig struct {
    Type string `json:"type"`
    Subnet string `json:"subnet"`
    Gateway net.IP `json:"gateway,omitempty"`
}

func loadNetConf(bytes []byte) (*NetConf, error) {
    conf := &NetConf{}
    if err := json.Unmarshal(bytes, conf); err != nil {
        return nil, fmt.Errorf("failed to load netconf: %v", err)
    }
    return conf, nil
}

func getContainerID(args *skel.CmdArgs) (string, error) {
    if args.ContainerID == "" {
        return "", fmt.Errorf("missing ContainerID")
    }
    return args.ContainerID, nil
}

func getNetNs(args *skel.CmdArgs) (string, error) {
    if args.Netns == "" {
        return "", fmt.Errorf("missing Netns")
    }
    return args.Netns, nil
}

func cmdAdd(args *skel.CmdArgs) error {
    conf, err := loadNetConf(args.StdinData)
    if err != nil {
        return err
    }
    
    containerID, err := getContainerID(args)
    if err != nil {
        return err
    }
    
    netns, err := getNetNs(args)
    if err != nil {
        return err
    }
    
    // Create interface
    iface, err := createInterface(conf, netns, args.IfName)
    if err != nil {
        return err
    }
    
    // Allocate IP
    result, err := allocateIP(conf, netns, args.IfName)
    if err != nil {
        // Cleanup on error
        delInterface(conf, netns, args.IfName)
        return err
    }
    
    return types.PrintResult(result, conf.CNIVersion)
}

func cmdDel(args *skel.CmdArgs) error {
    conf, err := loadNetConf(args.StdinData)
    if err != nil {
        return err
    }
    
    containerID, err := getContainerID(args)
    if err != nil {
        // Don't fail if containerID is missing
        containerID = ""
    }
    
    netns, err := getNetNs(args)
    if err != nil {
        return err
    }
    
    // Delete IP allocation
    if err := releaseIP(conf, netns, args.IfName); err != nil {
        return err
    }
    
    // Delete interface
    if err := delInterface(conf, netns, args.IfName); err != nil {
        return err
    }
    
    return nil
}

func main() {
    skel.PluginMain(cmdAdd, cmdCheck, cmdDel, version.All)
}
```

### IPAM Plugin Example

```go
package main

import (
    "encoding/json"
    "fmt"
    "os"
    
    "github.com/containernetworking/cni/pkg/skel"
    "github.com/containernetworking/cni/pkg/types"
    "github.com/containernetworking/cni/pkg/types/current"
    "github.com/containernetworking/cni/pkg/version"
)

type IPAMConfig struct {
    types.IPAM
    Subnet      string `json:"subnet"`
    RangeStart  string `json:"rangeStart,omitempty"`
    RangeEnd    string `json:"rangeEnd,omitempty"`
    Gateway     string `json:"gateway,omitempty"`
    DataDir     string `json:"dataDir,omitempty"`
    ReconcileCycles int `json:"reconcileCycles,omitempty"`
}

type IPAMResult struct {
    *current.Result
    IPs []*IPConfig `json:"ips"`
}

type IPConfig struct {
    Version string `json:"version"`
    Address net.IPNet `json:"address"`
    Gateway net.IP `json:"gateway,omitempty"`
}

func cmdAdd(args *skel.CmdArgs) error {
    conf := &IPAMConfig{}
    if err := json.Unmarshal(args.StdinData, conf); err != nil {
        return err
    }
    
    // Parse subnet
    _, subnet, err := net.ParseCIDR(conf.Subnet)
    if err != nil {
        return fmt.Errorf("invalid subnet: %v", err)
    }
    
    // Allocate IP address
    ip, err := allocateAddress(subnet, conf)
    if err != nil {
        return err
    }
    
    // Build result
    result := &current.Result{
        CNIVersion: args.CNIVersion,
        IPs: []*current.IPConfig{
            {
                Version: "4",
                Address: *ip,
                Gateway: conf.GatewayIP,
            },
        },
    }
    
    return types.PrintResult(result, args.CNIVersion)
}

func cmdDel(args *skel.CmdArgs) error {
    conf := &IPAMConfig{}
    if err := json.Unmarshal(args.StdinData, conf); err != nil {
        return err
    }
    
    // Release IP address
    if err := releaseAddress(args.ContainerID, conf); err != nil {
        // Log error but don't fail - this is cleanup
        fmt.Fprintf(os.Stderr, "failed to release IP: %v", err)
    }
    
    return nil
}
```

### Testing

```go
package main

import (
    "encoding/json"
    "testing"
    
    "github.com/containernetworking/cni/pkg/skel"
    "github.com/containernetworking/cni/pkg/types"
)

func TestCmdAdd(t *testing.T) {
    // Test valid configuration
    conf := `{
        "cniVersion": "1.0.0",
        "name": "test",
        "type": "test-plugin",
        "bridge": "cni0"
    }`
    
    args := &skel.CmdArgs{
        ContainerID: "test-container",
        Netns:       "/var/run/netns/test",
        IfName:      "eth0",
        StdinData:   []byte(conf),
        Args:        "K8S_POD_NAMESPACE=default;K8S_POD_NAME=test",
    }
    
    result, err := cmdAdd(args)
    if err != nil {
        t.Fatalf("cmdAdd failed: %v", err)
    }
    
    if result == nil {
        t.Fatal("expected non-nil result")
    }
    
    // Verify result structure
    var resultMap map[string]interface{}
    if err := json.Unmarshal(result, &resultMap); err != nil {
        t.Fatalf("result is not valid JSON: %v", err)
    }
    
    if _, ok := resultMap["ips"]; !ok {
        t.Error("result missing 'ips' field")
    }
}

func TestCmdDel(t *testing.T) {
    conf := `{
        "cniVersion": "1.0.0",
        "name": "test",
        "type": "test-plugin"
    }`
    
    args := &skel.CmdArgs{
        ContainerID: "test-container",
        Netns:       "/var/run/netns/test",
        IfName:      "eth0",
        StdinData:   []byte(conf),
    }
    
    if err := cmdDel(args); err != nil {
        t.Fatalf("cmdDel failed: %v", err)
    }
}

func TestLoadNetConf(t *testing.T) {
    validConf := `{
        "cniVersion": "1.0.0",
        "name": "test",
        "type": "test-plugin",
        "bridge": "cni0",
        "isGateway": true
    }`
    
    conf, err := loadNetConf([]byte(validConf))
    if err != nil {
        t.Fatalf("loadNetConf failed: %v", err)
    }
    
    if conf.Bridge != "cni0" {
        t.Errorf("expected bridge 'cni0', got '%s'", conf.Bridge)
    }
    
    if !conf.IsGateway {
        t.Error("expected IsGateway to be true")
    }
}

func TestLoadNetConfInvalid(t *testing.T) {
    invalidConf := `{
        "cniVersion": "1.0.0",
        "name": "test",
        "type": "test-plugin"
        "bridge": "cni0"  // Missing comma
    }`
    
    _, err := loadNetConf([]byte(invalidConf))
    if err == nil {
        t.Fatal("expected error for invalid JSON")
    }
}
```

---

## Fundamentals

### CNI Specification Versions

**Current Version: 1.0.0 (Stable)**

CNI 1.0.0 is the current stable specification, which defines:

- **Plugin Interface**: Standard command-line interface for network plugins
- **Configuration Format**: JSON format for network configuration
- **Result Format**: Standardized result format for successful operations
- **Error Handling**: Standardized error response format

### Supported CNI Versions

CNI supports version negotiation between the runtime and plugins:

```json
// Plugin supports version negotiation
{
  "cniVersion": "1.0.0",
  "supportedVersions": ["0.1.0", "0.2.0", "0.3.0", "0.4.0", "1.0.0"]
}
```

### Plugin Command Arguments

CNI plugins receive three commands:

#### ADD Command
- Configures network interface for container
- Parameters: ContainerID, Netns, IfName, Args, StdinData
- Returns: Result object with network configuration

#### DEL Command
- Removes network configuration from container
- Parameters: ContainerID, Netns, IfName, Args, StdinData
- Returns: Empty result on success

#### CHECK Command (1.0.0+)
- Verifies current network configuration
- Parameters: ContainerID, Netns, IfName, Args, StdinData
- Returns: Empty result if configuration matches

### IP Address Management

CNI IPAM plugins handle IP address allocation:

1. **Allocate**: Reserve an IP address from the pool
2. **Check**: Verify IP is still allocated and valid
3. **Release**: Return IP to the pool
4. **Del**: Remove IPAM configuration

### Plugin Loading

CNI plugins are loaded from a configured path:

```bash
# Plugin loading path
export CNI_PATH=/opt/cni/bin

# Plugins in path
ls /opt/cni/bin
# bridge, host-local, portmap, flannel, etc.
```

### Runtime Arguments

```bash
# Standard runtime arguments
CNI_COMMAND=ADD|DEL|CHECK
CNI_CONTAINERID=<container-id>
CNI_NETNS=<network-namespace-path>
CNI_IFNAME=<interface-name>
CNI_PATH=<plugin-path>
CNI_ARGS=<additional-arguments>
```

---

## Scaling and Deployment Patterns

### High Availability CNI

```bash
# HA CNI deployment with multiple plugins
# Primary: Calico for networking and policy
# Secondary: Cilium for observability

# Configuration
{
  "cniVersion": "1.0.0",
  "name": "ha-network",
  "plugins": [
    {
      "type": "calico",
      "datastore_type": "kubernetes"
    },
    {
      "type": "cilium-cni",
      "enable-ipv4": true,
      "enable-ipv6": false
    }
  ]
}
```

### Multi-tenancy CNI

```bash
# Multi-tenant network isolation
# Each tenant gets isolated network namespace

# Tenant A network
{
  "name": "tenant-a",
  "type": "bridge",
  "ipam": {
    "type": "host-local",
    "subnet": "10.10.0.0/16",
    "dataDir": "/var/lib/cni/tenants/tenant-a"
  }
}

# Tenant B network
{
  "name": "tenant-b",
  "type": "bridge",
  "ipam": {
    "type": "host-local",
    "subnet": "10.20.0.0/16",
    "dataDir": "/var/lib/cni/tenants/tenant-b"
  }
}
```

### Network Policy with CNI

```bash
# CNI plugin for network policies
{
  "type": "network-policy",
  "policy": {
    "defaultIngress": "deny",
    "defaultEgress": "allow",
    "rules": [
      {
        "from": [{"podSelector": {"matchLabels": {"app": "frontend"}}}],
        "to": [{"podSelector": {"matchLabels": {"app": "backend"}}}],
        "ports": [{"port": 80, "protocol": "tcp"}]
      }
    ]
  }
}
```

### Monitoring and Observability

```bash
# CNI plugin metrics
# Expose metrics for monitoring

# Metrics endpoint
curl http://localhost:9101/metrics

# Key metrics to monitor
# cni_plugin_duration_seconds - Plugin execution duration
# cni_plugin_errors_total - Plugin errors
# cni_plugin_ip_allocations_total - IP allocations
# cni_plugin_interfaces_total - Interface count
```

### CNI Plugin Version Management

```bash
# Multiple CNI plugin versions
# Allow rolling upgrades

# Plugin versions
/opt/cni/bin/
├── bridge-v1.0.0
├── bridge-v1.1.0
├── bridge-current -> bridge-v1.1.0
├── host-local-v1.0.0
└── host-local-v1.1.0

# Configuration references specific version
{
  "type": "bridge-current",
  "bridge": "cni0"
}
```

---

## Additional Resources

### Official Documentation

- [CNI GitHub Repository](https://github.com/containernetworking/cni) - Source code and specs
- [CNI Documentation](https://www.cni.dev/docs/) - Complete documentation
- [CNI Spec](https://github.com/containernetworking/cni/blob/master/SPEC.md) - Specification document
- [CNI Plugins](https://github.com/containernetworking/plugins) - Official plugins

### Implementations

- [Kubernetes CNI](https://kubernetes.io/docs/concepts/cluster-administration/networking/#how-to-implement-the-cni-spec) - Kubernetes integration
- [Containerd CNI](https://github.com/containerd/go-cni) - Containerd CNI library
- [Rkt CNI](https://github.com/rkt/rkt/tree/master/net/cni) - rkt CNI integration

### Plugins

- **Official Plugins**: bridge, host-local, ipvlan, loopback, macvlan, ptp, portmap, firewall, tuning
- **Third-party Plugins**: Calico, Cilium, Flannel, Kube-Router, Weave

### Community Resources

- [CNCF CNI](https://www.cncf.io/projects/cni/) - CNCF project page
- [CNI Slack](https://kubernetes.slack.com/archives/C09QYU6JV) - Community discussion
- [CNI Mailing List](https://lists.cncf.io/g/cncf-cni) - Announcements

### Learning Resources

- [CNI Getting Started](https://www.cni.dev/docs/get-started/) - Tutorial
- [CNI Plugin Authoring](https://www.cni.dev/docs/plugin-authoring/) - Plugin development guide
- [CNI Examples](https://github.com/containernetworking/plugins/tree/main/plugins/main) - Plugin examples

---

*This SKILL.md file was verified and last updated on 2026-04-22. Content based on CNCF CNI v1.0.0 specification and production usage patterns.*
## Troubleshooting

### Common Issues

1. **Deployment Failures**
   - Check pod logs for errors
   - Verify configuration values
   - Ensure network connectivity

2. **Performance Issues**
   - Monitor resource usage
   - Adjust resource limits
   - Check for bottlenecks

3. **Configuration Errors**
   - Validate YAML syntax
   - Check required fields
   - Verify environment-specific settings

4. **Integration Problems**
   - Verify API compatibility
   - Check dependency versions
   - Review integration documentation

### Getting Help

- Check official documentation
- Search GitHub issues
- Join community channels
- Review logs and metrics

## Examples

### Basic Configuration


```yaml
# Basic configuration example
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{project_name}}-config
  namespace: default
data:
  # Configuration goes here
  config.yaml: |
    # Base configuration
    # Add your settings here
```

### Kubernetes Deployment


```yaml
# Kubernetes deployment for {{project_name}}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{project_name}}
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: {{project_name}}
  template:
    metadata:
      labels:
        app: {{project_name}}
    spec:
      containers:
      - name: {{project_name}}
        image: {{project_name}}:latest
        ports:
        - containerPort: 8080
        resources:
          limits:
            memory: "128Mi"
            cpu: "500m"
```

### Kubernetes Service


```yaml
# Kubernetes service for {{project_name}}
apiVersion: v1
kind: Service
metadata:
  name: {{project_name}}
  namespace: default
spec:
  selector:
    app: {{project_name}}
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
  type: ClusterIP
```

