---
name: yaml-anchor-alias
description: Creates reusable YAML anchor and alias patterns with merge keys to eliminate
  repetition in configuration files across Kubernetes, Ansible, Terraform, and Helm
  deployments.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: yaml anchor, yaml alias, config deduplication, merge key, helm template,
    ansible common config, kubernetes shared spec, how do i reduce yaml repetition,
    <<:, &label, *alias
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
  - config
  - examples
  - diagrams
  related-skills: coding-data-encoding, cncf-kubernetes, linux-systemd-services
------

# YAML Anchor and Alias Patterns

Implements YAML anchor (`&`) and alias (`*`) reference patterns with merge keys (`<<:`) to eliminate configuration repetition across Kubernetes manifests, Ansible playbooks, Terraform provider configs, Helm templates, and other YAML-based configuration files. Anchors define reusable blocks of data; aliases inject those definitions at any nesting depth without copying the content. This skill covers anchor definition, alias injection, deep merge behavior, anchor inheritance through mapping keys, and framework-specific patterns for infrastructure-as-code workflows.

## TL;DR Checklist

- [ ] Identify repeated configuration blocks (3+ occurrences) before applying anchors
- [ ] Place anchors at the deepest reusable node level — not on individual scalars unless those scalars repeat
- [ ] Use merge key (`<<:`) with explicit overrides to extend base configurations instead of copying entire blocks
- [ ] Verify that merged keys are non-conflicting; YAML merge overwrites duplicate keys from right to left
- [ ] Test YAML files with `python3 -c "import yaml; yaml.safe_load(open('file.yaml'))"` after every anchor/alias change
- [ ] Document anchor locations in file headers when the same anchor is referenced across multiple files

