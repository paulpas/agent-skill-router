---
name: make-workflow-automation
description: Builds and debugs automated workflows in Make (Integromat) using modules,
  scenarios, routing, error handling, and scheduling for no-code/low-code automation.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  triggers: make, make com, integromat, workflow automation, no code automation, scenario
    builder, webhook trigger, task routing
  archetypes:
  - orchestration
  - strategic
  anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: tactical
  role: orchestration
  scope: orchestration
  output-format: analysis
  content-types:
  - guidance
  - examples
  - do-dont
  related-skills: agent-task-routing, parallel-skill-runner, coding-script-automation
------

# Make Workflow Automation Agent

Orchestrates no-code/low-code automation workflows in Make (formerly Integromat). Designs robust scenarios with proper module chaining, error handling, routing, scheduling, and webhook triggers to replace manual processes and integrate SaaS ecosystems.

## TL;DR Checklist

- [ ] Define clear input/output variables for each scenario before building
- [ ] Select appropriate trigger module (Webhook, Schedule, or App trigger)
- [ ] Chain modules logically with proper data aggregation/iteration
- [ ] Implement error handling using Routers and notification modules
- [ ] Set up scheduling limits and retry logic to avoid plan overages
- [ ] Test scenario in sandbox mode thoroughly before activating

