---
name: gitlab-api
description: Integrates with the GitLab REST API v4 and GraphQL API via python-gitlab
  to automate projects, merge requests, CI/CD pipelines, runners, and container registry
  management.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: gitlab api, python-gitlab, gitlab ci/cd, merge request automation, gitlab
    pipelines, gitlab runner, gitlab graphql, manage projects
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
  related-skills: coding-github-api, coding-bitbucket-api, coding-kubernetes-api
------

# GitLab API & python-gitlab Integration

Integrates with the GitLab REST API v4 and GraphQL API using the `python-gitlab` library to programmatically manage projects, groups, merge requests, CI/CD pipelines, runners, container registry, and GitLab Pages.

## TL;DR for Code Generation

- [ ] Authenticate with a personal access token (PAT) via `gitlab.Gitlab(url, token)` or config file
- [ ] Use the `gl.projects.get()`, `gl.groups.get()`, and `gl.runners.all()` patterns for resource access
- [ ] Enable pagination with `iterator=True` on list calls to auto-fetch all pages
- [ ] Handle `gitlab.exceptions.GitlabError` with specific subclasses for auth, not-found, and validation errors
- [ ] Use `gl.gitlab_cli()` for command-line style operations or the Python API for programmatic access
- [ ] Target both gitlab.com SaaS and self-managed instances by configuring `url` explicitly

