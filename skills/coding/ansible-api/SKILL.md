---
name: ansible-api
description: Integrates with Ansible via ansible-runner, the AWX/Tower API, and the
  Ansible Python API to manage playbooks, inventory, job templates, collections, and
  automation workflows.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: ansible api, ansible-runner, ansible tower, awx api, ansible playbook,
    ansible inventory, ansible collections, automation controller
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
  related-skills: coding-terraform-sdk, coding-kubernetes-api, coding-docker-api
------

# Ansible API & AWX/Tower Integration

Integrates with Ansible using `ansible-runner` for embedded playbook execution, the AWX/Ansible Automation Controller REST API for job template and inventory management, and the native Ansible Python API for custom modules and plugin development.

## TL;DR for Code Generation

- [ ] Use `ansible-runner` for running playbooks from Python — it handles artifacts, events, and callbacks
- [ ] Use the AWX CLI (`awxkit`) or REST API for managing Automation Controller resources (job templates, inventories, credentials)
- [ ] Access playbook results via `runner.status`, `runner.rc`, and `runner.events` generator
- [ ] Always set `private_data_dir` to the directory containing your playbook, inventory, and vars
- [ ] Handle `ansible_runner.exceptions.AnsibleRunnerException` for execution errors
- [ ] Use `runner.get_fact_cache(host)` to retrieve facts gathered during playbook runs

