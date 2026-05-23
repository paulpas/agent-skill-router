---
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
  version: 1.0.0
name: network-troubleshooting
------
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

