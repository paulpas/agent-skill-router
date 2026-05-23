---
name: github-api
description: Integrates with the GitHub REST API and GraphQL API via PyGithub and
  Octokit to manage repositories, issues, pull requests, Actions workflows, and Copilot
  metrics.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: github api, octokit, pygithub, github rest api, github graphql, manage
    repositories, github actions, pull request automation
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
  related-skills: coding-gitlab-api, coding-bitbucket-api, coding-jenkins-api
------

# GitHub API & Octokit Integration

Integrates with GitHub's REST API v3 and GraphQL API v4 to automate repository management, issue tracking, pull request workflows, Actions pipelines, and Copilot usage analytics. Use PyGithub for Python projects or Octokit for JavaScript/TypeScript projects.

## TL;DR for Code Generation

- [ ] Authenticate with a fine-grained personal access token (PAT) — never use passwords or legacy tokens
- [ ] Use `github.Auth.Token()` for PyGithub or `new Octokit({ auth })` for Octokit.js
- [ ] Handle pagination explicitly with `get_paginated()` or `for async of` iterators
- [ ] Wrap API calls in try/except for `github.GithubException` or `octokit.RequestError`
- [ ] Set a user-agent header identifying your application for rate-limit tracking
- [ ] Respect rate limits — check `get_rate_limit()` before bulk operations
- [ ] Use GraphQL for complex nested queries; use REST for bulk list operations

