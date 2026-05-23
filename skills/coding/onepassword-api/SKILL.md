---
name: onepassword-api
description: Implements 1Password Connect/SCIM API integration (Vaults, Items, Fields,
  Provisioning, Service Accounts) using onepasswordconnectsdk Python SDK with Connect
  server authentication, item CRUD, SCIM user/group provisioning, and secret reference
  patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: 1password, onepassword connect, op cli, 1password vaults, 1password items,
    secret references, how do i use 1password api, scim provisioning
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
  related-skills: coding-vault-api, coding-aws-iam, coding-entra-id-api
------

# 1Password Connect & CLI API Integration

Implements production-grade 1Password Connect API and 1Password CLI integration using the `onepasswordconnectsdk` Python SDK and `op` CLI patterns. When loaded, this skill makes the model implement Connect server authentication (`OP_CONNECT_HOST`, `OP_CONNECT_TOKEN`), vault operations (list, get), item operations (create, read, update, delete, get by title, CRUD on fields), SCIM (System for Cross-domain Identity Management) user/group provisioning via 1Password Service Accounts, and secret reference syntax (`op://vault/item/field`). All implementations follow 1Password best practices: use Connect server or Service Account tokens (not personal credentials), treat secret references as opaque strings, use field-level access when reading items, enable item versioning and recovery, and use the `op` CLI for scenarios where Connect server isn't available.

## TL;DR Checklist

- [ ] Use `onepasswordconnectsdk.client.new_client(host, token)` for Connect server
- [ ] Read `OP_CONNECT_HOST` and `OP_CONNECT_TOKEN` from environment
- [ ] Vault operations: `client.vaults.list()`, `client.vaults.get(vault_uuid)`
- [ ] Item operations: `client.items.get(vault_uuid, item_uuid)`, `create(vault_uuid, item)`, `update()`, `delete()`
- [ ] Get item by title: `client.items.get_by_title(vault_uuid, title)`
- [ ] Fields: Access via `item.fields`, or helper `get_item_field_value(client, vault_uuid, item_uuid, field_label)`
- [ ] Secret reference syntax: `op://<vault>/<item>/<field>` (resolved at runtime by SDK/CLI)
- [ ] SCIM provisioning: Use 1Password SCIM bridge with Azure AD/Okta/GSuite
- [ ] Service Accounts: Preferred over Connect for new 1Password Business/Enterprise
- [ ] Never log or print item values or secret references
- [ ] Prefer `op` CLI for local development, Connect server for production apps

