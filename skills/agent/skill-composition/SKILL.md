---
name: skill-composition
description: Composes multiple specialized skills into coherent workflows using sequential
  chains, parallel fan-out/fan-in, conditional branching, and error-isolation patterns
  for reliable multi-step task execution.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  triggers: skill composition, skill chaining, multi-skill workflow, parallel fan-out,
    fan-in pattern, state management between skills, error handling between skills,
    orchestration patterns, how do i combine multiple skills
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
  content-types:
  - guidance
  - examples
  - do-dont
  - config
  related-skills: parallel-skill-runner, task-decomposition-engine, intelligent-skill-selection,
    skill-router-system
------

# Skill Composition Framework

Composes multiple specialized skills into coherent, reliable workflows. When loaded, this skill makes the model act as a senior orchestration engineer — designing, implementing, and debugging multi-skill workflows that chain sequential steps, fan out to parallel branches, handle errors gracefully at each boundary, and manage state across skill invocations. This skill bridges the gap between selecting individual skills (handled by intelligent-skill-selection) and executing them as a coordinated system.

## TL;DR Checklist

- [ ] Classify the workflow topology: sequential chain, parallel fan-out/fan-in, conditional branching, or hybrid
- [ ] Define the shared state schema that flows between skills before writing any invocation logic
- [ ] Choose an error strategy per edge: retry with backoff, skip-and-log, fallback-to-default, or abort-upstream
- [ ] Implement circuit-breaker guards for expensive or flaky downstream skills
- [ ] Add observability: record entry/exit timestamps, intermediate state snapshots, and failure reasons at every boundary

