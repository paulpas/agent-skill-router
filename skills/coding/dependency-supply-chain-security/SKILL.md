---
name: dependency-supply-chain-security
description: Implements end-to-end software dependency supply chain security including
  SBOM generation (SPDX/CycloneDX), SLSA attestation levels, exact version pinning,
  Sigstore/cosign verification, CI scanning pipelines, transitive vulnerability management,
  and reproducible build patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: SBOM, SLSA, sigstore, cosign, supply chain attack, dependency pinning,
    how do i secure my dependencies, package signing
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
  related-skills: dependency-management, review
------

# Dependency Supply Chain Security

Implements comprehensive supply chain security controls across the software dependency lifecycle — from generating SBOMs and signing artifacts to verifying signatures in CI, pinning versions, scanning transitive vulnerabilities, and building reproducible outputs. This skill covers every layer of defense against modern supply chain attacks like log4shell and the xz backdoor.

## TL;DR Checklist

- [ ] Generate SBOM (SPDX or CycloneDX) on every build
- [ ] Pin all dependencies to exact versions with lockfiles
- [ ] Verify package signatures (Sigstore/cosign) before install
- [ ] Scan for vulnerabilities including transitive dependencies in CI
- [ ] Configure fail-on-critical policy for dependency scanning gates
- [ ] Implement SLSA Level 2+ provenance attestation
- [ ] Use patch files or override mechanisms for vulnerable transitive deps
- [ ] Build artifacts reproducibly for deterministic outputs

