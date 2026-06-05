---




name: yaml-anchor-alias
description: Creates reusable YAML anchor and alias patterns with merge keys to eliminate
  repetition in configuration files across Kubernetes, Ansible, Terraform, and Helm
  deployments.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: yaml anchor, yaml alias, config deduplication, merge key, helm template, ansible common config, kubernetes shared spec, how do i reduce yaml repetition ansible common config
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




---




# YAML Anchor and Alias Patterns

Implements YAML anchor (`&`) and alias (`*`) reference patterns with merge keys (`<<:`) to eliminate configuration repetition across Kubernetes manifests, Ansible playbooks, Terraform provider configs, Helm templates, and other YAML-based configuration files. Anchors define reusable blocks of data; aliases inject those definitions at any nesting depth without copying the content. This skill covers anchor definition, alias injection, deep merge behavior, anchor inheritance through mapping keys, and framework-specific patterns for infrastructure-as-code workflows.

## TL;DR Checklist

- [ ] Identify repeated configuration blocks (3+ occurrences) before applying anchors
- [ ] Place anchors at the deepest reusable node level — not on individual scalars unless those scalars repeat
- [ ] Use merge key (`<<:`) with explicit overrides to extend base configurations instead of copying entire blocks
- [ ] Verify that merged keys are non-conflicting; YAML merge overwrites duplicate keys from right to left
- [ ] Test YAML files with `python3 -c "import yaml; yaml.safe_load(open('file.yaml'))"` after every anchor/alias change
- [ ] Document anchor locations in file headers when the same anchor is referenced across multiple files

---

## When to Use

Use this skill when:

- A configuration file has the same block of YAML repeated three or more times (e.g., identical container specs, service definitions, or provider blocks)
- Multiple configuration files share common defaults that may need coordinated updates (e.g., shared labels, annotations, or health-check endpoints)
- You are maintaining infrastructure-as-code templates where the same resource pattern is instantiated with different parameter values
- You need to override specific keys within an inherited block without duplicating the entire parent structure

## When NOT to Use

Avoid this skill for:

- Simple YAML files under 20 lines — anchors add cognitive overhead that outweighs any reduction in copy volume
- Files where each section must be independently readable without cross-referencing anchor definitions scattered elsewhere
- JSON output generation — anchors and aliases are a YAML-only feature and do not exist in JSON, TOML, or INI formats
- Highly dynamic configuration where values change per-deployment through external templating (use Helm templates or Ansible variables instead of static anchors)

---

## Core Workflow

1. **Identify Repetition** — Scan the YAML file for blocks that are structurally identical or nearly identical. Group them by their common prefix. Look for patterns such as multiple container definitions with the same image registry, labels, resource limits, and readiness probes, differing only in the container name and image tag.
   **Checkpoint:** Confirm at least 3 occurrences of similar structure exist. If only 2 occurrences exist, consider whether a template or external variable would be cleaner than an inline anchor.

2. **Extract the Shared Block** — Select the deepest node that contains all common attributes. Move it to the top level of the document (or a dedicated `defaults:` mapping) and prefix its key with an ampersand (`&name`) to create the anchor definition.
   **Checkpoint:** The anchor name must be unique within the document and follow kebab-case conventions to avoid collisions in multi-document YAML files.

3. **Inject Aliases** — Replace each duplicate block with a merge key (`<<:`) that references the anchor, followed by any keys that need to differ from the base definition. Place overrides directly under the same mapping level as `<<:`.
   **Checkpoint:** Verify that every override key has a clear purpose and does not duplicate an inherited key unintentionally. YAML merges left-to-right with right-to-left overwrite semantics.

4. **Handle Cross-File Sharing** — When anchors need to be shared across multiple files, extract the common block into a separate `.yaml` or `.yml` include file and reference it using a tool-specific import mechanism (e.g., `!!include`, Ansible's `import_tasks`, Helm's `_helpers.tpl`).
   **Checkpoint:** Cross-file anchors require explicit loader support — `yaml.safe_load()` alone cannot resolve cross-document references. Document the external dependency clearly in the consuming file header.

5. **Validate Merge Behavior** — Test the resulting file to ensure that merged keys produce the expected output. Pay special attention to nested mappings where a child merge may overwrite a parent's deeply-nested key rather than merging at that depth.
   **Checkpoint:** Use a YAML linter (`yamllint`) or Python `yaml.safe_load()` to verify structural correctness, then run a dry-run of any tool that consumes the file (e.g., `kubectl apply --dry-run=client`).

---

## Implementation Patterns

### Pattern 1: Basic Anchor and Alias for Mapping Objects

Define a reusable block with `&anchor_name` and reference it with `*anchor_name`. This is the simplest pattern — the alias substitutes the entire value of the anchor at that point.

```yaml
# ❌ BAD — repeated container specs across three deployments
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  template:
    spec:
      containers:
        - name: web
          image: myregistry/app:v1.2
          ports: [{containerPort: 80}]
          resources:
            limits: {cpu: "500m", memory: "256Mi"}
            requests: {cpu: "250m", memory: "128Mi"}
          readinessProbe:
            httpGet: {path: /healthz, port: 80}
            initialDelaySeconds: 5
            periodSeconds: 10
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  template:
    spec:
      containers:
        - name: api
          image: myregistry/app:v1.2
          ports: [{containerPort: 80}]
          resources:
            limits: {cpu: "500m", memory: "256Mi"}
            requests: {cpu: "250m", memory: "128Mi"}
          readinessProbe:
            httpGet: {path: /healthz, port: 80}
            initialDelaySeconds: 5
            periodSeconds: 10
```

```yaml
# ✅ GOOD — anchor defines the shared container spec once
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  template:
    spec:
      containers:
        - name: web
          <<: *base_container
          image: myregistry/app:v1.2   # Override only the image tag
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  template:
    spec:
      containers:
        - name: api
          <<: *base_container
          image: myregistry/app:v2.0   # Different version per deployment

# Anchor definition at top level
base_container: &base_container
  ports: [{containerPort: 80}]
  resources:
    limits: {cpu: "500m", memory: "256Mi"}
    requests: {cpu: "250m", memory: "128Mi"}
  readinessProbe:
    httpGet: {path: /healthz, port: 80}
    initialDelaySeconds: 5
    periodSeconds: 10
```

### Pattern 2: Merge Key with Inline Overrides (Recommended)

The merge key (`<<:`) combines the anchor's content with locally-specified keys. Keys specified after `<<:` take precedence, enabling partial overrides without duplicating the base block.

```python
"""Demonstration of YAML merge key behavior using Python's PyYAML library.
Shows how merge key ordering determines override precedence."""

import yaml


def parse_yaml_with_merge(content: str) -> dict:
    """Parse a YAML string that contains merge keys and return the resolved structure.
    
    The yaml.safe_load function in PyYAML automatically handles <<: merge key syntax,
    merging the anchor mapping with any subsequent keys at the same level.
    Later keys overwrite earlier ones (rightmost wins for duplicate keys).
    
    Args:
        content: YAML string containing anchor definitions and merge key references.
        
    Returns:
        Fully resolved Python dictionary with all anchors expanded and merges applied.
        
    Raises:
        yaml.YAMLError: If the input contains invalid YAML syntax or unresolvable aliases.
    """
    return yaml.safe_load(content)


def demonstrate_merge_override():
    """Show how merge key overrides work — keys defined after <<: win."""
    yaml_source = """
defaults: &defaults
  replicas: 3
  strategy:
    type: RollingUpdate
  securityContext:
    runAsNonRoot: true
    readOnlyRootFilesystem: true

deployment-a:
  name: service-alpha
  <<: *defaults
  replicas: 5          # Overrides the default of 3
  strategy:
    type: RollingUpdate   # Inherits from defaults
    rollingUpdate:
      maxSurge: 1        # Extended — not in defaults

deployment-b:
  name: service-beta
  <<: *defaults
  replicas: 2          # Overrides to fewer replicas
  securityContext:     # Full override replaces the inherited block
    runAsUser: 1000
"""
    result = parse_yaml_with_merge(yaml_source)

    print("Deployment A merged result:")
    for key, value in result["deployment-a"].items():
        print(f"  {key}: {value}")

    print("\nDeployment B merged result (securityContext fully overridden):")
    for key, value in result["deployment-b"].items():
        print(f"  {key}: {value}")


demonstrate_merge_override()
```

Expected output:
```
Deployment A merged result:
  name: service-alpha
  replicas: 5          # Overridden from 3 to 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # Extended beyond defaults
  securityContext:
    runAsNonRoot: true
    readOnlyRootFilesystem: true

Deployment B merged result:
  name: service-beta
  replicas: 2          # Overridden from 3 to 2
  strategy:
    type: RollingUpdate   # Inherited from defaults
  securityContext:        # Full override — not merged at nested level
    runAsUser: 1000       # runAsNonRoot and readOnlyRootFilesystem are gone
```

### Pattern 3: Anchor on Scalar Values

Anchors can bind to individual scalars (strings, numbers, booleans), enabling reuse of repeated values across a file. This is common for version numbers, image registries, or environment names.

```yaml
# Anchor on scalar values for shared constants
defaults: &defaults
  namespace: production
  cluster: eu-west-1

provider: &aws_provider
  region: us-east-1
  profile: default
  skip_metadata_api_check: false

resources:
  aws_instance:
    web_server_1:
      <<: *aws_provider
      instance_type: t3.medium
      tags: {Name: "web-prod-1", Environment: *defaults}   # Alias to scalar

    web_server_2:
      <<: *aws_provider
      instance_type: t3.large
      tags: {Name: "web-prod-2", Environment: *defaults}   # Same scalar alias, no duplication

  aws_s3_bucket:
    logs:
      <<: *aws_provider
      bucket: app-logs-${var.environment}-eu   # Scalar anchors don't help here — use variables instead
```

### Pattern 4: Anchor Inheritance Through Nested Mappings

When an anchor is applied to a mapping, any alias that references it inherits the entire nested structure. This means deeply-nested keys are also reused automatically.

```yaml
# Deep nesting with inherited security and networking configurations
network_policies: &default_network_policy
  spec:
    podSelector:
      matchLabels: {app: default}
    policyTypes: [Ingress, Egress]
    ingress:
      - from:
          - namespaceSelector:
              matchLabels: {tier: frontend}
        ports: [{protocol: TCP, port: 443}]
    egress:
      - to:
          - namespaceSelector:
              matchLabels: {tier: database}
        ports: [{protocol: TCP, port: 5432}]

# Each policy inherits the full network spec and overrides only what differs
ingress-gateway:
  name: ingress-gateway
  <<: *default_network_policy
  spec:
    podSelector:
      matchLabels: {app: gateway}     # Override selector for this specific policy
    ingress:                           # Replace entire ingress section with different rules
      - from:
          - ipBlock: {cidr: 0.0.0.0/0}
        ports: [{protocol: TCP, port: 443}]

backend-api:
  name: backend-api
  <<: *default_network_policy
  spec:
    podSelector:
      matchLabels: {app: api}         # Override selector for this specific policy
    egress:                           # Replace entire egress section — only DB access allowed
      - to:
          - namespaceSelector:
              matchLabels: {tier: database}
        ports: [{protocol: TCP, port: 5432}]
```

---

## Constraints

### MUST DO
- Extract anchors at the deepest reusable node level — do not anchor individual keys within a block that repeats; anchor the entire block so all sub-keys are reused together
- Use merge key (`<<:`) instead of bare aliases when you need to override inherited keys — this is the most common and safest pattern for extending base configs
- Name anchors with descriptive kebab-case identifiers (e.g., `base_container`, `common_labels`) that describe their purpose, not their position in the file
- Always validate YAML files with a linter after adding or modifying anchors — merge key syntax is easy to get wrong and silent failures are common
- Place anchor definitions near the top of the file so they can be found easily by readers who encounter aliases further down

### MUST NOT DO
- Use bare alias references (`*anchor`) when you need any override — always prefer `<<: *anchor` with explicit overrides over duplicating an entire block for minor differences
- Define anchors inside a flow mapping or flow sequence on the same line as their anchor name — this creates fragile, hard-to-read YAML that breaks in some parsers
- Share anchor names across multiple top-level keys unless you explicitly want them to refer to the exact same object reference — aliasing shares the object identity in Python's yaml.safe_load, so mutations through one alias affect all other aliases of the same anchor
- Nest merge keys inside other mappings where the inherited key names could collide with existing keys at that level without intending a replacement
- Use YAML anchors as a substitute for proper templating systems (Helm, Ansible variables, Terraform modules) when configuration values change per environment — anchors are static references, not dynamic substitution

---

## Output Template

When implementing or reviewing YAML anchor/alias patterns, produce:

1. **Identified Repetition** — List the duplicated blocks with their file location and line ranges
2. **Anchor Definition** — The proposed `&anchor_name` definition with its full content
3. **Merge Key Usage** — Each usage site showing `<<: *anchor_name` plus any override keys
4. **Override Analysis** — For each override, confirm it actually differs from the base and explain what changes
5. **Validation Result** — YAML syntax verification output from a linter or Python parser

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-data-encoding` | Covers JSON, XML, Base64, and other data encoding formats used alongside YAML configurations |
| `cncf-kubernetes` | Kubernetes manifests commonly use these anchor/alias patterns for shared spec blocks |
| `linux-systemd-services` | System unit files can use similar DRY patterns when managing multiple service instances |
