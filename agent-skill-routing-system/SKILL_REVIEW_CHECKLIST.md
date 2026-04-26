# Skill Review Checklist

Every skill PR must be approved by 2 reviewers using this comprehensive checklist.

## Pre-Submission Validation

Before opening a PR, ensure:

- [ ] Skill directory follows naming: `skills/<domain>/<topic>/SKILL.md`
- [ ] Domain is one of: `agent`, `cncf`, `coding`, `trading`, `programming`
- [ ] Topic name is kebab-case (lowercase with hyphens)

---

## Language & Encoding

- [ ] All content is in English
- [ ] No Chinese characters (U+4E00–U+9FFF)
- [ ] No Japanese characters (Hiragana U+3040–U+309F, Katakana U+30A0–U+30FF)
- [ ] No Korean characters (Hangul U+AC00–U+D7A3)
- [ ] No Arabic characters (U+0600–U+06FF)
- [ ] No Cyrillic characters (U+0400–U+04FF)
- [ ] Special characters are ASCII-safe (no mojibake)

---

## Content Structure

- [ ] Has clear H1 title (human-readable, not kebab-case)
- [ ] Has "Role" section (1–3 sentences explaining model behavior)
- [ ] Has "When to Use" section with **specific scenarios** (not vague)
- [ ] Has "When NOT to Use" section with anti-patterns and exclusions
- [ ] Has core content section (Workflow, Patterns, or reference material)

---

## Content Quality

- [ ] File size > 2000 bytes (unless it's a small utility skill)
- [ ] Content is substantive, not placeholder text
- [ ] No TODO, FIXME, or "example.com" placeholder links
- [ ] External links point to real, stable URLs
- [ ] No debug statements or commented-out code

---

## Code Examples

- [ ] Contains at least **one ❌ BAD example** (what NOT to do)
- [ ] Contains at least **one ✅ GOOD example** (what to do)
- [ ] Examples are actual code, not just text descriptions
- [ ] Code examples match the appropriate language for domain
  - `coding`, `trading`, `programming`: Python/TypeScript/JavaScript
  - `cncf`: YAML manifests
  - `agent`: Pseudocode or Python

---

## Philosophy & Constraints

- [ ] Has "Constraints" or "MUST DO / MUST NOT DO" section
- [ ] Constraints are **specific and actionable** (not vague)
- [ ] Constraints are enforced by the code examples
- [ ] For `coding` domain: aligns with 5 Laws of Elegant Defense
  - [ ] Early Exit (guard clauses)
  - [ ] Parse Don't Validate (trusted state)
  - [ ] Atomic Predictability (pure functions)
  - [ ] Fail Fast (descriptive errors)
  - [ ] Intentional Naming (readable code)

---

## YAML Frontmatter

- [ ] `name` field exactly matches directory topic (kebab-case)
- [ ] `description` leads with action verb (Implements, Selects, Analyzes, etc.)
- [ ] `description` includes 1–2 domain-specific terms
- [ ] `description` is ≤ 200 characters
- [ ] `license: MIT` is present
- [ ] `compatibility: opencode` is present
- [ ] `metadata.version` is present (semantic version: "1.0.0")
- [ ] `metadata.domain` is one of: `agent`, `cncf`, `coding`, `trading`, `programming`
- [ ] `metadata.role` is one of: `implementation`, `reference`, `orchestration`, `review`
- [ ] `metadata.scope` is one of: `implementation`, `infrastructure`, `orchestration`, `review`
- [ ] `metadata.output-format` is one of: `code`, `manifests`, `analysis`, `report`
- [ ] `metadata.triggers` contains 3–8 keywords (both technical AND conversational)
- [ ] Triggers include at least one "how do I..." variant (if applicable)
- [ ] Triggers avoid ultra-generic terms (`code`, `data`, `risk`)
- [ ] `metadata.related-skills` lists complementary skills (if any exist)
- [ ] Related-skills are bidirectional (if A lists B, B lists A)
- [ ] `metadata.author` and `metadata.source` present ONLY if externally sourced

---

## Domain-Specific Checks

### For `coding` skills:
- [ ] Includes BAD/GOOD code pattern pairs
- [ ] References relevant standard (SOLID, DRY, OWASP, etc.)
- [ ] MUST DO / MUST NOT DO constraints are code-enforcing

### For `trading` skills:
- [ ] Python implementation with typed signatures
- [ ] Risk constraints explicitly stated
- [ ] Aligns with APEX platform patterns
- [ ] No financial advice (algorithmic guidance only)

### For `cncf` skills:
- [ ] Architecture/Design Patterns section present
- [ ] Integration Approaches section present
- [ ] Common Pitfalls section present
- [ ] At least one complete working YAML manifest example
- [ ] Example is production-ready (not placeholder)

### For `agent` skills:
- [ ] Orchestration flow diagram present (ASCII or text)
- [ ] Fallback/error routing explicitly described
- [ ] References code-philosophy (5 Laws of Elegant Defense)
- [ ] Covers sequential, parallel, or hybrid execution patterns

### For `programming` skills:
- [ ] Algorithm explanation precedes implementation
- [ ] Time and space complexity discussed
- [ ] Include worked examples with concrete inputs/outputs
- [ ] Comparison to alternative approaches included

---

## Maturity & Completeness

- [ ] Skill is marked as `draft`, `beta`, or `stable`
- [ ] Draft/beta skills have clear roadmap or improvement notes
- [ ] Completeness score ≥ 75 (0-100 scale)
- [ ] Example count ≥ 2 (one bad, one good minimum)

---

## Testing & Validation

- [ ] No lint errors in frontmatter YAML
- [ ] All links are valid (test with `curl` or browser)
- [ ] Code examples are syntactically valid
- [ ] Skill validates against SKILL_FORMAT_SPEC.md

---

## Reviewer Sign-Off

### Reviewer 1: Quality & Philosophy

- [ ] Language check passed
- [ ] Content structure complete
- [ ] Examples included and proper
- [ ] Constraints aligned with philosophy
- **Signature:** _________________ **Date:** _______

### Reviewer 2: Domain Expertise

- [ ] Domain-specific requirements met
- [ ] Metadata complete and accurate
- [ ] Related-skills correctly linked
- [ ] Maturity level appropriate
- **Signature:** _________________ **Date:** _______

---

## Approval Criteria

**Required for merge:**
- ✅ Reviewer 1 approval
- ✅ Reviewer 2 approval
- ✅ All checklist items checked OR documented exception
- ✅ No blocking issues from CI/CD gates

**Documented exceptions:**
If skipping a checklist item, provide justification in PR comments:
- Why does this skill not meet this criterion?
- What is the plan to address it in future updates?

---

## Related Documentation

- [AGENTS.md](./AGENTS.md) — Skill creation guidelines
- [SKILL_FORMAT_SPEC.md](./SKILL_FORMAT_SPEC.md) — Complete format specification
- [SKILL_GOVERNANCE.md](./SKILL_GOVERNANCE.md) — Quality metrics and governance

---

**Last updated:** 2026-04-26
**Maintained by:** @paulpas
