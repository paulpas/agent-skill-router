---
name: cncf-process-security-policy
description: Creates or updates SECURITY.md defining the vulnerability reporting process, disclosure timeline, and supported versions for CNCF projects
license: MIT
compatibility: opencode
how_to_guide: https://contribute.cncf.io/projects/best-practices/security/
id: security-policy
mcp_servers: 
template_source: https://github.com/cncf/tag-security/blob/main/project-resources/templates/SECURITY.md
metadata:
  version: "1.0.0"
  domain: cncf
  role: reference
  scope: infrastructure
  output-format: manifests
  triggers: process security policy, process-security-policy, creates, updates, defining
---

# CNCF Security Policy Process

Creates or updates `SECURITY.md` with the project's vulnerability reporting channel, supported versions matrix, and response timeline.

## When to Use

Use when:
- A CNCF incubating or graduating project does not yet have a `SECURITY.md`
- The existing `SECURITY.md` is missing the reporting channel, response SLA, or supported versions
- A project is working toward an OpenSSF Best Practices badge (requires a security disclosure policy)

Do NOT use when:
- The repository is documentation-only with no executable code — link to the parent project's SECURITY.md instead

## Steps

1. **Fetch the template.**
   If GitHub MCP available: `github_get_contents` path=`cncf/tag-security/main/project-resources/templates/SECURITY.md`
   Otherwise: `gh api repos/cncf/tag-security/contents/project-resources/templates/SECURITY.md`

2. **Fill in Reporting a Vulnerability:**
   - Primary: GitHub Private Vulnerability Reporting
     (`Settings → Code security → Private vulnerability reporting → Enable`)
   - Fallback: security@<project>.io or security@lists.cncf.io
   ⚠️ Never direct reporters to a public GitHub issue — this exposes the vulnerability before a patch exists.

3. **Fill in Supported Versions table.** Mark EOL versions clearly.
   ⚠️ Define how a version reaches EOL, or link to RELEASES.md that does.

4. **Fill in Response Timeline** (CNCF recommended):
   - Acknowledge: within 2 business days
   - Triage + severity: within 5 business days
   - Patch + coordinated disclosure: within 90 days (non-critical) / 7 days (critical)
   ⚠️ All dates must use UTC to avoid timezone ambiguity with downstream distributors.

5. **Enable GitHub Private Vulnerability Reporting** in repo settings if not already on:
   `https://github.com/<org>/<repo>/settings/security_analysis`

6. **Set up OpenSSF tooling.** See the `openssf-scorecards` and `openssf-badge` skills.

7. **Remove all TODO markers and instruction links.**

## Checklist

- [ ] Reporting channel documented (GitHub PVR or email)
- [ ] Supported versions table filled in with EOL criteria
- [ ] Response timeline defined in UTC (graduation)
- [ ] GitHub Private Vulnerability Reporting enabled in repo settings (graduation)
- [ ] OpenSSF Best Practices badge applied for and link in README (graduation — hard gate)
- [ ] OpenSSF Scorecards action added (graduation)
- [ ] Branch protection rules enforced on default branch (graduation)
- [ ] 2FA enforced on GitHub org (graduation)
- [ ] No `TODO` markers remain

## Knowledge Reference

- CNCF Security Policy Best Practices: https://contribute.cncf.io/projects/best-practices/security/
- OpenSSF Best Practices: https://openssf.org/best-practices/
- CNCF TAG Security: https://github.com/cncf/tag-security
