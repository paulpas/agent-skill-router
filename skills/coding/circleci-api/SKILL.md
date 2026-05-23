---
name: circleci-api
description: Integrates with the CircleCI REST API v2 to manage pipelines, workflows,
  jobs, contexts, environment variables, project settings, and orb configurations.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: circleci api, circleci python, circleci pipelines, circleci workflows,
    circleci orb, circleci contexts, circleci jobs, circleci v2 api
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
  related-skills: coding-github-api, coding-jenkins-api, coding-gitlab-api
------

# CircleCI API v2 Integration

Integrates with the CircleCI REST API v2 to programmatically manage pipelines, workflows, jobs, contexts, environment variables, project settings, SSH keys, and orbs. Supports both the `circleci.py` Python wrapper and direct API calls.

## TL;DR for Code Generation

- [ ] Authenticate with a CircleCI Personal API Token sent as the `Circle-Token` header
- [ ] Use the v2 API at `https://circleci.com/api/v2/` — v1 is deprecated for most endpoints
- [ ] Project slug format is `{vcs_type}/{org}/{repo}` (e.g., `gh/my-org/my-repo`)
- [ ] Handle pagination with the `next_page_token` field in API v2 responses
- [ ] Use contexts for shared environment variables across projects
- [ ] Use `circleci.py` library for a higher-level Python interface

