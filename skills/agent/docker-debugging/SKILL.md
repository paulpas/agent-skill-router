---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Diagnoses and resolves Docker container issues including crashes, OOM
  errors, network problems, volume mounts, resource contention, and caching optimization
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: code
  related-skills: agent-network-troubleshooting
  role: implementation
  scope: implementation
  triggers: docker debugging, container crash, oom error, network troubleshooting,
    docker compose, container logs, how do i debug docker, volume mount
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
name: docker-debugging
------
# Docker Container Debugging

Implements comprehensive Docker container debugging workflows for diagnosing crashes, OOM errors, network issues, volume mount problems, resource contention, and optimization issues using Docker CLI commands, inspection tools, and log analysis.

## TL;DR Checklist

- [ ] Check container logs with `docker logs --tail 100 <container>`
- [ ] Inspect container configuration with `docker inspect <container>`
- [ ] Monitor resource usage with `docker stats --no-stream`
- [ ] Verify network connectivity with `docker network inspect <network>`
- [ ] Check volume mounts with `docker inspect --format='{{.Mounts}}' <container>`
- [ ] Review container exit codes and crash patterns
- [ ] Use `docker system df` to identify disk space issues
- [ ] Check for OOM kills with `dmesg | grep -i 'killed process'`

