---
name: releases
description: '"Creates or updates RELEASES.md documenting the release process, versioning"
  policy, and release cadence for CNCF projects'
license: MIT
compatibility: opencode
how_to_guide: https://contribute.cncf.io/maintainers/github/releases/
id: releases
mcp_servers: null
template_source: https://contribute.cncf.io/maintainers/github/releases/
metadata:
  version: 1.0.0
  domain: cncf
  role: reference
  scope: infrastructure
  output-format: manifests
  triggers: creates, documenting, process releases, process-releases, updates
---


  related-skills: cncf-argo, cncf-aws-dynamodb, cncf-aws-ec2, cncf-aws-eks


# CNCF Release Process

Creates `RELEASES.md` documenting the project's versioning scheme, release cadence, supported versions, artifact signing, and publication locations.

## When to Use

Use when:
- Project has no `RELEASES.md` or equivalent release process document
- Release process exists only as tribal knowledge and has never been written down
- Preparing a CNCF incubation or graduation application
- Current `RELEASES.md` lacks versioning policy, artifact signing, or supported-versions guidance
- Onboarding a new release manager

Do NOT use when:
- Project is a specification or documentation-only project with no compiled artifacts — adapt the document to describe the specification publication process instead

## Steps

1. **Check for an existing file.**
   If GitHub MCP available: `github_get_contents` path=RELEASES.md
   Otherwise: `gh api repos/{owner}/{repo}/contents/RELEASES.md`
   If it exists, read it and identify gaps before editing.

2. **Document the versioning scheme.**
   State whether the project uses [Semantic Versioning](https://semver.org/) or
   [Calendar Versioning](https://calver.org/). Define concretely what triggers each
   component (breaking change → MAJOR, new feature → MINOR, bug fix → PATCH).
   Define pre-release labels if used (`alpha`, `beta`, `rc`) and their promotion criteria.

3. **Document the release cadence.**
   State whether releases are time-based (e.g., minor every 12 weeks) or feature-based.
   Include guidance on unscheduled patch/security releases. "Releases are made as needed"
   is acceptable if stated explicitly.

4. **Define supported versions and backport policy.**
   List which release lines receive bug fixes and security backports. This table must
   be consistent with `SECURITY.md`. ⚠️ Inconsistency between these two files is a
   common graduation blocker — define the policy in one file and reference it from the other.

5. **State release authority.**
   Identify which role (maintainer, release manager) is authorized to publish releases.
   Link to `MAINTAINERS.md`. If a separate release team exists, link to its charter.

6. **Write the end-to-end release checklist.**
   A numbered list a release manager can execute verbatim. Cover at minimum: branch cut,
   changelog, version bump, signed git tag (`git tag -s`), CI build trigger, artifact
   signing (cosign or SLSA provenance), publication (GitHub Releases, container registry,
   language registries), and announcement (mailing list, Slack).
   ⚠️ Prose descriptions cannot be executed reliably — use a numbered list.

7. **List all publication locations.**
   GitHub Releases URL, container registry, Helm chart repo, language package registries.
   Include the exact pull command for each artifact.

8. **Document artifact verification.**
   Explain how users verify checksums, cosign signatures, or SLSA provenance.
   Provide copy-pasteable example commands.
   ⚠️ Unsigned artifacts are a graduation blocker — cosign or SLSA level 1+ required.

9. **Cross-link and validate consistency.**
   Add links from `RELEASES.md` to `SECURITY.md`, `MAINTAINERS.md`, `CONTRIBUTING.md`,
   and the CI release workflow file. Add a link to `RELEASES.md` from `README.md`.

## Checklist

- [ ] `RELEASES.md` exists in the repository root
- [ ] Versioning scheme named with definitions for each component
- [ ] Release cadence stated
- [ ] Supported versions and backport policy defined and consistent with `SECURITY.md` (graduation)
- [ ] Release authority identified, linked to `MAINTAINERS.md` (graduation)
- [ ] End-to-end release steps written as a numbered checklist (graduation)
- [ ] Artifact signing documented with verification commands (graduation)
- [ ] All publication locations listed with URLs or pull commands (graduation)
- [ ] Breaking changes policy stated
- [ ] `README.md` links to `RELEASES.md`
- [ ] CI release workflow file is linked from `RELEASES.md`

## Knowledge Reference

- CNCF Release Process: https://contribute.cncf.io/maintainers/github/releases/
- Semantic Versioning: https://semver.org/
- Calendar Versioning: https://calver.org/
- OpenSSF Best Practices: https://openssf.org/best-practices/
