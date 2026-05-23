---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: Implements comprehensive Kubernetes debugging workflow with pod inspection,
  log analysis, resource debugging, network troubleshooting, and common failure pattern
  diagnosis using kubectl commands.
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: code
  related-skills: agent-docker-debugging, agent-network-troubleshooting, cncf-prometheus
  role: implementation
  scope: implementation
  triggers: kubernetes debugging, k8s troubleshooting, pod crashes, node failures,
    cluster debugging, kubectl debug, container logs, k8s errors
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
name: kubernetes-debugging
------
# Kubernetes Cluster Debugging

Implements systematic debugging workflows for Kubernetes clusters using kubectl commands to diagnose pod issues, node failures, network problems, resource constraints, and common failure patterns.

## TL;DR Checklist

- [ ] **Step 1:** Check pod status and events with `kubectl get pods -A -o wide` and `kubectl describe pod <pod> -n <namespace>`
- [ ] **Step 2:** Retrieve container logs with `kubectl logs <pod> -n <namespace> --tail=100 --previous`
- [ ] **Step 3:** Exec into container for interactive debugging with `kubectl exec -it <pod> -n <namespace> -- /bin/sh`
- [ ] **Step 4:** Inspect node conditions and resource usage with `kubectl get nodes` and `kubectl describe node <node>`
- [ ] **Step 5:** Test network connectivity between pods with `kubectl run test-pod --rm -it --image=busybox -- ping <service>`
- [ ] **Step 6:** Check resource constraints (OOM, CPU throttling) with `kubectl top pods` and `kubectl describe pod <pod>`
- [ ] **Step 7:** Use kubectl debug for temporary containers with `kubectl debug -it <pod> --image=busybox -- sh`
- [ ] **Step 8:** Diagnose cluster components with `kubectl get --raw=/readyz` and `kubectl logs -n kube-system <component-pod>`

