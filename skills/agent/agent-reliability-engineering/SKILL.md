---
name: agent-reliability-engineering
description: Implements fault-tolerance mechanisms for AI agent systems including
  circuit breakers, exponential backoff retries, graceful degradation, health checks,
  dead letter queues, and timeout management with observability hooks.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  triggers: fault tolerance, circuit breaker, retry strategy, exponential backoff,
    graceful degradation, health check, dead letter queue, timeout management, reliability
    engineering, agent resilience
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
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - config
  - examples
  - do-dont
  related-skills: agent-architecture-patterns, workflow-patterns, failure-mode-analysis
------

# Agent Reliability Engineering

Implements fault-tolerance mechanisms for AI agent systems to ensure graceful operation under partial failure. This skill guides the model in applying circuit breakers, retry strategies, degradation patterns, health monitoring, and observability primitives that keep agent systems operational when external dependencies fail.

Reliability is not a single pattern — it is a layered defense spanning detection (health checks), prevention (circuit breakers), recovery (retries with backoff), mitigation (graceful degradation), learning (dead letter queues), and visibility (observability hooks) that together prevent cascading failures from taking down the entire agent system.

## TL;DR Checklist

- [ ] Configure circuit breakers per external dependency with domain-appropriate thresholds
- [ ] Implement exponential backoff with jitter for all retryable operations
- [ ] Design graceful degradation paths for each critical service dependency
- [ ] Register health checks (startup, readiness, liveness) in correct lifecycle order
- [ ] Set up dead letter queues for failed operations requiring manual review
- [ ] Wire observability hooks at every failure boundary for metrics collection

