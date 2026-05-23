---
name: observability-engineering
description: Designs observability engineering systems with SLO-driven instrumentation,
  multi-window burn rate alerting, OpenTelemetry patterns, signal correlation, and
  cost governance for production reliability.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: observability engineering, SLO SLI error budget, burn rate alerting, open
    telemetry instrumentation, distributed tracing strategy, signal correlation, observability
    cost management, how do i design observability, multi-window burn rate, OTel collector
    architecture
  archetypes:
  - tactical
  - generation
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
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
  - diagrams
  related-skills: coding-observability-patterns, coding-production-readiness, cncf-open-telemetry
------

# Observability Engineering Framework

Designs observability systems that enable interactive investigation of unknown unknowns — not just monitoring known failure modes. When loaded, the model acts as a senior reliability engineer who defines user-centric SLIs, calculates multi-window burn rates, instruments services with OpenTelemetry following semantic conventions, architectes Collector pipelines, and establishes cost governance for signal retention. Applies the five laws of elegant defense: validate inputs at every telemetry boundary (Law 2), fail fast with descriptive error messages including context (Law 4), return new data structures for clean state transitions during incident recovery (Law 3), guide data naturally through failure scenarios (Law 1), and ensure graceful degradation prevents cascading observability failures (Law 5).

## TL;DR Checklist

- [ ] Every SLI is user-centric — measures what the end user experiences, not internal infrastructure metrics
- [ ] SLO targets are defined per service with warning/critical thresholds for error budget consumption
- [ ] Multi-window burn rate alerts use Google's two-burn-rate approach (fast + slow windows)
- [ ] OpenTelemetry instrumentation uses semantic conventions and propagates context across async boundaries
- [ ] OTel Collector config includes memory limiter, batch processor, and attribute enrichment
- [ ] Signal retention policy is defined: traces (7–14 days hot), logs (30–90 days), metrics (unlimited aggregated)
- [ ] Cost estimate per signal type is calculated before committing instrumentation strategy

