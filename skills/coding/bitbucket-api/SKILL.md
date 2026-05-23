---
name: bitbucket-api
description: Integrates with Bitbucket Cloud and Bitbucket Data Center REST APIs via
  atlassian-python-api to manage repositories, pull requests, pipelines, webhooks,
  and workspace settings.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: bitbucket api, atlassian-python-api, bitbucket cloud, bitbucket pipelines,
    pull request bitbucket, bitbucket webhooks, manage bitbucket repos, bitbucket
    data center
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
  related-skills: coding-github-api, coding-gitlab-api, coding-jenkins-api
------

# Bitbucket API & atlassian-python-api Integration

Integrates with Bitbucket Cloud (API v2) and Bitbucket Server/Data Center REST APIs using the `atlassian-python-api` library to manage repositories, pull requests, pipelines, branch restrictions, webhooks, and workspace administration.

## TL;DR for Code Generation

- [ ] Use `Cloud(username, password)` for Bitbucket Cloud or `Bitbucket(url, username, password)` for Bitbucket Server/Data Center
- [ ] Bitbucket Cloud provides an object-oriented API (`cloud.workspaces.each()`, `workspace.repositories.each()`)
- [ ] Bitbucket Server uses a functional API (`bitbucket.project_list()`, `bitbucket.get_repo()`)
- [ ] Authenticate with app passwords for Cloud (not your main account password)
- [ ] Pass `sort="-created_on"` to pipeline list calls to get recent builds first
- [ ] Handle `HTTPError` from the `requests` library for API error responses

