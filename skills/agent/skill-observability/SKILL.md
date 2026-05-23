---
name: skill-observability
description: Collects telemetry on skill usage patterns, measures trigger-to-action
  fidelity, gathers user feedback signals, and produces dashboards for continuous
  skill improvement in agent orchestration systems.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  triggers: skill observability, usage telemetry, how do i track skill usage, skill
    analytics, feedback collection, skill performance monitoring, trigger fidelity,
    skill dashboard, skill measurement, skill adoption metrics
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
  scope: orchestration
  output-format: code
  related-skills: coding-skill-quality-metrics, agent-skill-trigger-engineering, agent-skill-lifecycle-management
------

# Skill Observability and Telemetry Framework

This skill makes the model implement telemetry collection, trigger-to-action fidelity measurement, user feedback gathering, and analytics dashboarding for AI skills operating in production environments. It defines concrete patterns for tracking when skills load, how often triggers fire, whether loaded skills produce useful outputs, and how users rate their effectiveness — all while preserving privacy by design.

## TL;DR Checklist

- [ ] Instrument every skill load event (manual `/skill` + auto-trigger) with timestamp, source, and session ID
- [ ] Track trigger-to-action fidelity: compare the triggering phrase against the loaded skill's metadata.triggers
- [ ] Collect user feedback via explicit signals (thumbs up/down, rating sliders) and implicit behavioral signals (follow-up questions, quick overrides)
- [ ] Aggregate telemetry into time-bucketed dashboards; never store PII or raw conversation content
- [ ] Correlate quality scores with usage patterns to identify high-performing and underperforming skills
- [ ] Ship a `SkillTelemetryCollector` class with clear public API and unit-testable interfaces

