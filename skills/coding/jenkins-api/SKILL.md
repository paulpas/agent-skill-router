---
name: jenkins-api
description: Integrates with the Jenkins REST API via python-jenkins and JenkinsAPI
  to manage jobs, builds, pipelines, credentials, plugins, nodes, and folder organization.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: jenkins api, python-jenkins, jenkinsapi, jenkins job, jenkins pipeline,
    jenkins build, jenkins plugin, jenkins credentials
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
  related-skills: coding-github-api, coding-gitlab-api, coding-circleci-api
------

# Jenkins API & python-jenkins Integration

Integrates with the Jenkins REST API using `python-jenkins` and `JenkinsAPI` libraries to automate jobs, builds, pipelines, credentials, plugins, nodes, folders, and system configuration.

## TL;DR for Code Generation

- [ ] Use `python-jenkins` (`jenkins.Jenkins`) for server administration (jobs, plugins, nodes, credentials)
- [ ] Use `JenkinsAPI` (`jenkinsapi.jenkins.Jenkins`) for build-centric workflows (artifacts, revisions, blocking)
- [ ] Authenticate with username + API token (not password) — tokens are generated in the Jenkins user profile
- [ ] Use the `tree` query parameter to filter API responses and reduce payload size
- [ ] Set a reasonable timeout (>=30s) for all Jenkins connections
- [ ] Handle `jenkins.JenkinsException` for auth failures and `requests.exceptions.ConnectionError` for connection issues

