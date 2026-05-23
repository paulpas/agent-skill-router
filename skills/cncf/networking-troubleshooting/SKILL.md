---
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
  version: 1.0.0
name: networking-troubleshooting
------
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

