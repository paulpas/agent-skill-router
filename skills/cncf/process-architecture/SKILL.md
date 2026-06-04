---
name: process-architecture
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: '"Creates or updates ARCHITECTURE.md documenting the project''s design"
  components, and technical decisions for CNCF projects'
id: architecture
license: MIT
maturity: stable
mcp_servers: null
metadata:
  domain: cncf
  output-format: manifests
  related-skills: null
  role: reference
  scope: infrastructure
  triggers: creates, documenting, process architecture, process-architecture, updates
  archetypes:
  - educational
  - strategic
  anti_triggers:
  - brainstorming
  - vague ideation
  - non-containerized architecture
  response_profile:
    verbosity: medium
    directive_strength: low
    abstraction_level: strategic
  version: 1.0.0
template_source: https://contribute.cncf.io/maintainers/templates/
------
# CNCF Architecture Documentation Process

Creates or updates `ARCHITECTURE.md` explaining the project's major components, data flow, and key design decisions.

## When to Use

Use when:
- The project is preparing for incubating or graduation review and lacks a written architecture overview
- A new contributor asks "how does this project actually work?" with no single doc to point to
- A significant architectural change has been merged and the existing document is now stale

Do NOT use when:
- The project is a specification, not code — write a "How it works" section in README.md instead
- The project is extremely small (single binary, <1000 LOC) — a detailed README.md is sufficient

## Steps

1. **Identify major subsystems.** Read the top-level directory structure and README. List
   every package, binary, or module with a distinct responsibility. Aim for 3–10 subsystems.

2. **Draw a component diagram** in ASCII art (preferred — renders everywhere, no tooling needed):
   ```
   ┌─────────────┐   gRPC   ┌──────────────┐
   │   CLI/SDK   │ ──────── │  API Server  │
   └─────────────┘          └──────┬───────┘
                                   │ watches
                            ┌──────▼───────┐
                            │  Controller  │
                            └──────────────┘
   ```
   Label each arrow with the protocol or mechanism.
   ⚠️ Binary image files (PNG, SVG) go stale — use ASCII art or Mermaid in the Markdown source.

3. **Describe each component in 2–5 sentences:** what it does, what it owns, what it does NOT do.

4. **Document the primary data flow** as a numbered sequence for the most important user journey.

5. **List external dependencies:** databases, queues, cloud APIs, Kubernetes API server.
   For each: protocol, required or optional, behavior when unavailable.
   ⚠️ TAG Security reviewers specifically look for this list — missing it is a common finding.

6. **Document the deployment model:** supported topologies, Kubernetes namespace permissions
   if applicable, OS/arch support.
   ⚠️ Undocumented cluster-admin requirements are a red flag to TOC reviewers.

7. **Record extension points** (plugins, webhooks, CRDs). One sentence per extension point.

8. **Add one-sentence rationale for each major design decision.**
   ⚠️ A diagram without rationale tells reviewers what the project does but not whether the design is sound.

9. **State what is intentionally out of scope.**

10. **Add an update policy note** at the end: "Updated as part of any PR that changes the architecture."

11. **Cross-link from README.md and CONTRIBUTING.md.**

## Checklist

- [ ] ARCHITECTURE.md exists in the repo root
- [ ] Component diagram shows all major subsystems and protocols (graduation)
- [ ] Each subsystem has a 2–5 sentence description
- [ ] At least one end-to-end data flow documented as a numbered sequence (graduation)
- [ ] All external dependencies listed with protocol and failure behavior (graduation)
- [ ] Deployment model described including Kubernetes permissions (graduation)
- [ ] Key design decisions include at least one sentence of rationale (graduation)
- [ ] Out-of-scope items stated explicitly
- [ ] Update policy paragraph present
- [ ] README.md links to ARCHITECTURE.md (graduation)
- [ ] CONTRIBUTING.md recommends reading ARCHITECTURE.md before contributing

## Knowledge Reference

- CNCF Maintainer Templates: https://contribute.cncf.io/maintainers/templates/
- CNCF Project Requirements: https://github.com/cncf/toc/tree/main/projects#requirements

---

## Constraints

### MUST DO
- Cite authoritative primary sources (official documentation, RFCs, standards bodies) — avoid secondary or blog references
- Include version-specific guidance when the reference topic has significant version-dependent behavior
- Structure reference content with clear navigation: overview first, then detailed subsections organized by use case
- Keep examples minimal and self-contained so readers can copy-paste without needing external context

### MUST NOT DO
- Do not present opinionated practices as facts — distinguish between standards, recommendations, and personal preferences
- Avoid outdated API references or deprecated patterns; explicitly note version requirements for each code example
- Never include incomplete or pseudocode examples in reference materials — all examples should be runnable
- Do not conflate different product versions when documenting features that vary across releases
