---
name: observability
description: Implements Linux system observability with metrics, logs, and performance
  profiling for proactive infrastructure management across cloud and on-prem environments.
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
  triggers: linux observability, system metrics, log collection, performance profiling,
    eBPF, perf, capacity planning, monitoring
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: resource-management, kernel-tuning, networking, linux-security,
    hardware-provisioning
  maturity: stable
  completeness: 95
  exampleCount: 3
------

# Linux System Observability

Infrastructure engineer implementing comprehensive Linux system observability with metrics collection, log aggregation, performance profiling, and capacity planning for proactive infrastructure management across cloud and on-prem environments.

## TL;DR Checklist

- [ ] Deploy metrics collection for CPU, memory, disk I/O, and network throughput
- [ ] Configure log collection from systemd journal and application logs
- [ ] Set up performance profiling with perf and eBPF for latency investigation
- [ ] Define alerting thresholds for resource utilization and error rates
- [ ] Implement capacity planning with trend analysis and growth projections
- [ ] Validate observability stack with synthetic load and failure injection tests
- [ ] Document baseline metrics and alerting configuration for each workload type
- [ ] Test alerting delivery and runbook execution for each alert type

