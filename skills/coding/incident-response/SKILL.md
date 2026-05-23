---
name: incident-response
description: Orchestrates production incident response including severity classification,
  on-call escalation procedures, blameless postmortem analysis, and root cause remediation
  to minimize downtime and prevent recurrence.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: incident response, production outage, on-call procedures, postmortem,
    blameless postmortem, RCA root cause analysis, service degradation, how do i handle
    a production incident, incident command, severity classification, rollback procedure,
    escalation path
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
  - do-dont
  - examples
  related-skills: systematic-debugging, observability-patterns, engineering-principles,
    production-logging
------

# Incident Response and Postmortem Framework

Orchestrates production incident response including severity classification, on-call escalation procedures, blameless postmortem analysis, and root cause remediation. When loaded, this skill makes the model act as an incident commander — following structured escalation paths, isolating failures to restore service first, then conducting thorough post-incident analysis that focuses on system design flaws rather than individual errors. This skill applies the 5 Laws of Elegant Defense: validate inputs at every boundary (Law 2), fail fast with descriptive error messages including context (Law 4), return new data structures for clean state transitions during incident recovery (Law 3), guide data naturally through failure scenarios (Law 1), and ensure graceful degradation prevents cascading failures (Law 5).

## TL;DR Checklist

- [ ] Classify incident severity using the SLA-based matrix before any communication
- [ ] Announce incident to stakeholders with initial impact assessment within 5 minutes
- [ ] Prioritize service restoration over root cause identification in the first 30 minutes
- [ ] Assign dedicated incident commander — one person leads, everyone else follows instructions
- [ ] Document all actions and decisions in real-time during the incident timeline
- [ ] Conduct blameless postmortem within 48 hours of incident resolution
- [ ] Convert every postmortem finding into an actionable improvement ticket with priority

