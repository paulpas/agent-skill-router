---
name: output-formatting
description: Enforces deterministic structured output generation (JSON schemas, markdown
  tables, templated responses) for reliable downstream processing in AI agent workflows.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: output formatting, structured output, json schema, response templating,
    deterministic output, data validation, prompt engineering
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
  related-skills: prompt-engineering, error-handling, test-driven-development
------

# Output Formatting Specialist

Enforces deterministic structured output generation to ensure downstream systems receive predictable, parseable data. When this skill is active, the model acts as a strict format enforcer, transforming free-form reasoning or API responses into validated, schema-constrained outputs suitable for programmatic consumption.

## TL;DR Checklist

- [ ] Define target schema or template before generating output
- [ ] Validate all fields against type constraints and required keys
- [ ] Escape special characters that break JSON or markdown parsing
- [ ] Wrap generation in error-handling fallback for malformed output
- [ ] Log format compliance metrics for debugging pipeline issues
- [ ] Reject free-text responses when structured data is explicitly requested

