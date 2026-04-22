# External Skills Analysis & Integration Plan
## Mapping External Repositories to /home/paulpas/git/skills/

**Date:** 2026-04-22  
**Analysis Target:** opencode-skills, cncf-skills, microsoft/skills, juice-shop

---

## Executive Summary

This analysis examines 4 external skill repositories and maps their content to the existing `/home/paulpas/git/skills/` naming convention. Key findings:

1. **High Overlap Potential:** Many opencode-skills skills map to existing trading/development skills
2. **CNCF Skills Are Process-Oriented:** Different from technical project skills
3. **Naming Convention Conflict:** External repos use different naming (e.g., `python-pro` vs `coding-python-basics`)
4. **No Direct Duplicates:** Existing skills are domain-specific, external skills are general-purpose

---

## Repository Analysis

### 1. farmage/opencode-skills
**URL:** https://github.com/farmage/opencode-skills  
**Clone Location:** `/home/paulpas/git/opencode-skills`  
**Total Skills:** ~80 SKILL.md files (in skills/ and .opencode/skills/)

#### Directory Structure
```
opencode-skills/
├── skills/                    # Primary skill definitions
│   ├── [language]-[expertise]/SKILL.md
│   ├── [framework]-[ specialist]/SKILL.md
│   ├── [tool]-[specialist]/SKILL.md
│   └── [domain]-[expert]/SKILL.md
├── .opencode/skills/          # Alternative location (80 skills)
└── README.md
```

#### Sample Skills Extracted

| Skill Name | Category | Naming Format | Description |
|------------|----------|---------------|-------------|
| python-pro | coding | `[language]-[expertise]` | Python 3.11+ with type safety, pytest, mypy |
| kubernetes-specialist | infrastructure | `[domain]-[specialist]` | K8s deployments, RBAC, NetworkPolicies |
| code-reviewer | quality | `[domain]-[specialist]` | PR review, security vulnerabilities, code smells |
| architecture-designer | design | `[domain]-[specialist]` | System design, component diagrams |
| fastapi-expert | coding | `[framework]-[expertise]` | FastAPI with Pydantic, async patterns |

#### Naming Convention
```
<domain>-<expertise>
```
- `<domain>`: technology domain (python, kubernetes, react, etc.)
- `<expertise>`: proficiency level (pro, expert, specialist, architect)

#### YAML Frontmatter Pattern
```yaml
---
name: skill-name
description: Single-line description
license: MIT
compatibility: opencode
metadata:
  author: https://github.com/username
  version: "1.1.0"
  domain: <category>
  triggers: comma-separated triggers
  role: specialist|implementation|review
  scope: implementation|infrastructure|review
  output-format: code|manifests|report
  related-skills: skill1, skill2, skill3
---
```

#### Content Structure Template
1. **When to Use This Skill** - Use cases
2. **Core Workflow** - 4-5 step process
3. **Reference Guide** - Tables linking to reference docs
4. **Constraints** - MUST DO / MUST NOT DO checklist
5. **Code Examples** - Specific implementation patterns
6. **Output Templates** - Expected output format

---

### 2. cncf-skills
**URL:** https://github.com/castrojo/cncf-skills  
**Clone Location:** `/home/paulpas/git/cncf-skills`  
**Total Skills:** 23 SKILL.md files

#### Directory Structure
```
cncf-skills/
└── skills/
    ├── [process-topic]/SKILL.md
    ├── security-*/SKILL.md
    ├── governance-*/SKILL.md
    └── _index/SKILL.md
```

#### Sample Skills

| Skill Name | Category | Purpose |
|------------|----------|---------|
| incident-response | security | Security incident triage and response process |
| architecture | documentation | ARCHITECTURE.md creation for CNCF projects |
| security-policy | security | SECURITY.md document creation |
| releases | release | Release process and versioning |
| contributing-guide | community | Contributor onboarding |

#### Naming Convention
```
[process-topic]
```
- Single-word or hyphenated process topics
- Focus on project governance and processes

#### YAML Frontmatter Pattern
```yaml
---
description: Single-line description
how_to_guide: https://url
id: skill-id
mcp_servers:
  - id: github
    url: https://github.com/github/mcp-server-github
template_source: https://github.com/.../template.md
---
```

#### Content Structure
1. **When to use** - Project state when to invoke
2. **Steps** - Numbered procedural steps
3. **Checklist** - Completion verification

#### Key Difference
CNCF skills are **process documents** for CNCF project maintainers, not technical implementation guides.

---

### 3. microsoft/skills
**Note:** Repository already exists at `/home/paulpas/git/skills/` - contains trading/domain-specific skills

#### Existing Skills Structure
```
skills/
├── cncf-*/SKILL.md              # 70+ CNCF project skills
├── trading-*/SKILL.md           # Trading-specific skills (50+)
├── coding-*/SKILL.md            # Coding pattern skills
└── README.md
```

#### Naming Convention
```
<category>-<topic>
```
- `<category>`: cncf, trading, coding
- `<topic>`: specific technology or concept (kubernetes, stop-loss, pydantic-models)

#### Content Structure
1. **Frontmatter** (minimal)
2. **Purpose and Use Cases**
3. **Architecture Design Patterns**
4. **Integration Approaches**
5. **Common Pitfalls**
6. **Coding Practices**
7. **Fundamentals**
8. **Additional Resources**
9. **Troubleshooting**
10. **Examples** (YAML/Python)

---

## Mapping Analysis

### Mapping opencode-skills → Existing Skills

| opencode-skill | Existing skill | Mapping Quality | Notes |
|----------------|----------------|-----------------|-------|
| python-pro | N/A | New skill | coding-python-basics exists but not comprehensive |
| kubernetes-specialist | cncf-kubernetes | High overlap | Could consolidate with refinement |
| code-reviewer | N/A | New skill | Code review patterns not covered |
| fastapi-expert | coding-fastapi-patterns | High overlap | May need merging |
| architecture-designer | N/A | New skill | System design not covered |
| security-reviewer | N/A | New skill | Security patterns not covered |
| test-master | N/A | New skill | Testing patterns not covered |

### Mapping CNCF Skills → Existing Skills

| cncf-skill | Existing skill | Mapping Quality |
|------------|----------------|-----------------|
| incident-response | N/A | New skill |
| security-policy | N/A | New skill |
| architecture | N/A | New skill |
| releases | N/A | New skill |

**Note:** CNCF skills are governance/process focused and don't map to technical implementation skills.

---

## Proposed Integration Plan

### Phase 1: High-Priority Skills (Merge First)

#### 1. `code-reviewer` → `coding-code-review` (NEW)
**Priority:** High  
**Reason:** Essential for quality, no existing equivalent  
**Action:** Create new skill, inherit from opencode-skills content

#### 2. `security-reviewer` → `coding-security-review` (NEW)
**Priority:** High  
**Reason:** Security patterns not covered  
**Action:** Create new skill

#### 3. `python-pro` → `coding-python-basics` (REFINE)
**Priority:** Medium  
**Reason:** Existing skill needs enhancement  
**Action:** Merge content, keep existing structure, add advanced patterns

#### 4. `kubernetes-specialist` → `cncf-kubernetes` (CONSOLIDATE)
**Priority:** Medium  
**Reason:** High overlap  
**Action:** Merge, keep cncf-kubernetes as primary (more comprehensive)

### Phase 2: Medium-Priority Skills

#### 5. New Skills to Add
- `coding-architecture-design` (from architecture-designer)
- `coding-test-master` (from test-master)
- `trading-code-coverage` (from test-master)
- `cncf-incident-response` (from cncf-skills)
- `cncf-security-policy` (from cncf-skills)
- `cncf-architecture` (from cncf-skills)

### Phase 3: CNCF Process Skills (New Category)

#### 6. CNCF Process Skills
**New Category:** `cncf-process-*`

| Existing | Proposed | Notes |
|----------|----------|-------|
| (new) | `cncf-process-incident-response` | Process document |
| (new) | `cncf-process-security-policy` | Process document |
| (new) | `cncf-process-releases` | Process document |
| (new) | `cncf-process-contributing` | Process document |
| (new) | `cncf-process-architecture` | Process document |

---

## Detailed Skill Mappings

### opencode-skills → Integration Targets

#### 1. **python-pro** → `coding-python-basics`
**Conflict Resolution:**
- Keep existing `coding-python-basics` as base
- Merge python-pro's pytest, mypy, async patterns
- Add type system reference sections

#### 2. **kubernetes-specialist** → `cncf-kubernetes`
**Conflict Resolution:**
- `cncf-kubernetes` has 601 lines, more comprehensive
- kubernetes-specialist focuses on deployment patterns
- Merge deployment patterns into cncf-kubernetes

#### 3. **code-reviewer** → New `coding-code-review`
**Rationale:** No equivalent exists  
**Content to Migrate:**
- Review workflow (context → structure → details → tests → feedback)
- Common issues (N+1 queries, magic numbers, SQL injection)
- Output template (summary, critical/major/minor issues)
- Constraints (MUST DO / MUST NOT DO)

#### 4. **security-reviewer** → New `coding-security-review`
**Rationale:** No equivalent exists  
**Content to Migrate:**
- OWASP Top 10 patterns
- Security checklist
- Vulnerability detection patterns

#### 5. **fastapi-expert** → Existing `coding-fastapi-patterns`
**Conflict Resolution:**
- Check existing skill's content
- Merge async patterns, Pydantic patterns
- Add validation and error handling patterns

#### 6. **architecture-designer** → New `coding-architecture`
**Rationale:** No equivalent exists  
**Content to Migrate:**
- Component diagram patterns (ASCII art)
- Data flow documentation
- Design decision rationale

---

## File Organization

### New Directory Structure
```
skills/
├── cncf-*/                     # CNCF project technical skills (existing)
│   └── SKILL.md
├── trading-*/                  # Trading implementation skills (existing)
│   └── SKILL.md
├── coding-*/                   # Coding pattern skills (existing + new)
│   ├── python-basics/
│   ├── code-review/            # NEW
│   ├── security-review/        # NEW
│   ├── architecture/           # NEW
│   ├── test-master/            # NEW
│   └── SKILL.md
├── cncf-process-*/             # CNCF process/governance skills (NEW)
│   ├── incident-response/
│   ├── security-policy/
│   ├── releases/
│   └── SKILL.md
├── trading-process-*/          # Trading process skills (NEW)
│   └── SKILL.md
└── README.md
```

### Naming Convention (Final)
```
<domain>-<topic>[-<specialization>]
```

Domains:
- `cncf`: Cloud Native Computing Foundation projects
- `trading`: Trading platform domains
- `coding`: General software engineering patterns
- `cncf-process`: CNCF project governance processes

---

## Quality Checklist for Integrated Skills

### Frontmatter Requirements
- [ ] `name`: `<category>-<skill>` format
- [ ] `description`: Single-line, clear purpose
- [ ] `metadata.category`: domain category
- [ ] `metadata.author`: Original author if external
- [ ] `metadata.license`: MIT or equivalent

### Content Requirements
- [ ] **Early Exit**: Guard clauses at top
- [ ] **Parse Don't Validate**: Data parsed at boundaries
- [ ] **Atomic Predictability**: Pure functions where possible
- [ ] **Fail Fast**: Invalid states halt with descriptive errors
- [ ] **Intentional Naming**: Code reads like English

### Structure Requirements
- [ ] **When to Use** section
- [ ] **Core Workflow** section (numbered steps)
- [ ] **Reference Guide** (table of references)
- [ ] **Constraints** (MUST DO / MUST NOT DO)
- [ ] **Code Examples** section
- [ ] **Output Templates** section

---

## Risk Assessment

### Low Risk
- ✅ Creating new skills for missing functionality
- ✅ Adding process skills (CNCF process category)
- ✅ Enhancing existing skills with external content

### Medium Risk
- ⚠️ Consolidating similar skills (kubernetes-specialist + cncf-kubernetes)
- ⚠️ Merging overlapping content (python-pro + coding-python-basics)
- ⚠️ Preserving original author attribution

### Mitigation
- Create new branches for each consolidation
- Preserve original skill files as references
- Add `MIGRATION NOTES` section in merged skills

---

## Recommended Next Steps

1. **Review this plan** with orchestrator approval
2. **Create branches** for each integration
3. **Implement Phase 1** skills (code-reviewer, security-reviewer)
4. **Test** new skills with sample tasks
5. **Review** merged skills for philosophy compliance
6. **Document** all changes in migration log

---

## Appendix: Sample Frontmatter Templates

### Technical Implementation Skill
```yaml
---
name: <category>-<skill>
description: <single-line purpose>
---
```

### Process/Governance Skill
```yaml
---
description: <single-line purpose>
id: <skill-id>
how_to_guide: <url>
template_source: <url>
---
```

### External Skill with Attribution
```yaml
---
name: <category>-<skill>
description: <single-line purpose>
license: MIT
metadata:
  author: https://github.com/username
  source: https://github.com/repo
  version: "1.0.0"
---
```
