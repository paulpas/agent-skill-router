# Skill Quality Governance

## Purpose

This document establishes quality standards, ownership structure, and metrics for the agent-skill-router skill ecosystem.

**Goal:** Maintain highest quality standards across all 1,800+ skills through clear governance, accountability, and measurable quality gates.

---

## Code Ownership & Accountability

| Domain | Owner | Responsibility | Current Quality |
|--------|-------|-----------------|-----------------|
| **Trading** | @paulpas | 100% quality responsibility | High (83 skills) |
| **Agent** | @paulpas | Orchestration + routing | Medium (271 skills) |
| **CNCF** | @paulpas | Cloud-native + K8s patterns | Medium (365 skills) |
| **Coding** | @paulpas | Engineering practices + patterns | Medium (316 skills) |
| **Programming** | @paulpas | CS fundamentals + algorithms | Low (791 skills) |

**Total:** 1,826 skills across 5 domains

---

## Quality Metrics & Targets (Monthly Review)

Track these metrics on the 1st of each month. Use `quality-dashboard.html` for real-time visibility.

### Metric 1: Language Compliance (Target: 100%)

**Definition:** % of skills with all English content (no CJK, Arabic, Cyrillic)

| Milestone | Current | Target | Status |
|-----------|---------|--------|--------|
| **English Skills** | 99.4% (1,768/1,778) | 100% | ⚠️ 10 non-English |

**Action:** Audit and remove non-English skills. See `SKILL_REVIEW_CHECKLIST.md` for language detection rules.

### Metric 2: Example Coverage (Target: 100%)

**Definition:** % of substantive skills (>3KB) with at least ❌ BAD + ✅ GOOD examples

| Milestone | Current | Target | Status |
|-----------|---------|--------|--------|
| **With Examples** | 52% (923/1,778) | 100% | 🔴 CRITICAL |
| **Missing Examples** | 855 skills | 0 skills | 🔴 CRITICAL |

**Action:** Phase 1 (Correction) must add examples to all >3KB skills. See `SKILL_TEMPLATE_COMPLETE.md`.

### Metric 3: Good/Bad Pattern Presence (Target: 95%)

**Definition:** % of substantive skills with ❌ WRONG or ✅ GOOD markers

| Milestone | Current | Target | Status |
|-----------|---------|--------|--------|
| **With Patterns** | 72% (1,280/1,778) | 95% | ⚠️ 498 missing |

**Action:** Add `❌ BAD` and `✅ GOOD` markers to code examples.

### Metric 4: Overall Health Score (Target: 85/100)

**Definition:** Composite score weighted across:
- English compliance (-20 points per non-English skill)
- Example coverage (-0.2 points per missing example)
- Pattern presence (-0.1 points per missing pattern)
- Skill size (-0.3 points per undersized skill)

| Milestone | Current | Target | Status |
|-----------|---------|--------|--------|
| **Health Score** | 38 / 100 | 85 / 100 | 🔴 CRITICAL |

**Components:**
- English: 99.4% ✓
- Examples: 52% ✗
- Patterns: 72% ⚠️
- Sizing: 98.3% ✓

**Action:** Focus on Phase 1 (Correction) to add missing examples and patterns.

### Metric 5: Maturity Distribution (Target: 50% Stable, 30% Beta, 20% Draft)

**Definition:** Skills categorized by maturity level

| Maturity | Current | Target | Status |
|----------|---------|--------|--------|
| **Stable** | 856 skills | 913 (50%) | ⚠️ 57 below target |
| **Beta** | 534 skills | 533 (30%) | ✓ On target |
| **Draft** | 388 skills | 366 (20%) | ⚠️ 22 above target |

**Action:** Graduate Beta skills to Stable. Retire low-value Draft skills.

### Metric 6: Average Completeness (Target: 80%)

**Definition:** 0-100 completeness score per skill (frontmatter: `completeness` field)

| Milestone | Current | Target | Status |
|-----------|---------|--------|--------|
| **Avg Completeness** | 72% | 80% | ⚠️ 8% below |

**Action:** Update completeness scores in YAML frontmatter. Use `scripts/completeness-audit.py`.

---

## Quality Review Phases

### Phase 0: Baseline (Completed)

**Goal:** Establish quality foundation and guardrails

- ✅ Pre-commit hooks (LAYER 1)
- ✅ CI/CD gates (LAYER 2)
- ✅ Code review checklist (LAYER 3)
- ✅ Maturity levels (LAYER 4)
- ✅ Quality dashboard (LAYER 5)
- ✅ Governance policy (LAYER 6)
- ✅ Skill templates (LAYER 7)

### Phase 1: Correction (ACTIVE — Target: June 2026)

**Goal:** Fix critical quality issues (examples + patterns)

**Activities:**
1. Audit all >3KB skills for missing examples (855 skills)
2. Add ❌ BAD example to each
3. Add ✅ GOOD example to each
4. Validate examples are real code (not pseudo-code)
5. Run pre-commit validation on all skills

**Success Criteria:**
- [ ] 100% of substantive skills have examples
- [ ] 95% of skills have good/bad patterns
- [ ] Health score ≥ 75 / 100

**Timeline:**
- Week 1-2: Audit high-value domains (Trading, Agent, CNCF)
- Week 3-4: Audit medium-value domains (Coding)
- Week 5-6: Audit programming domain
- Week 7-8: Final validation + refinement

### Phase 2: Maturity Upgrade (Target: July 2026)

**Goal:** Graduate skills to appropriate maturity levels

**Activities:**
1. Review each skill against `SKILL_REVIEW_CHECKLIST.md`
2. Assign maturity: draft → beta → stable
3. Update `completeness` score (0-100)
4. Update `exampleCount` in metadata

**Success Criteria:**
- [ ] 50% of skills at stable maturity
- [ ] Average completeness ≥ 80%
- [ ] All draft skills have clear improvement plan

### Phase 3: Excellence (Target: September 2026)

**Goal:** Exceed quality targets and establish best practices

**Activities:**
1. Add domain-specific optimizations
2. Implement skill clustering and relationships
3. Build auto-generation pipeline for examples
4. Establish continuous quality improvements

**Success Criteria:**
- [ ] Health score ≥ 90 / 100
- [ ] Zero non-English skills
- [ ] 100% of skills with examples

---

## Approval Matrix

### New Skill Submission

**Requirements:**
- ✅ 2 independent reviewers
- ✅ Checklist: All items checked OR documented exceptions
- ✅ No blocking CI/CD failures
- ✅ Domain owner approval (if non-standard)

**Reviewers:**
1. Quality reviewer (language, structure, philosophy)
2. Domain reviewer (examples, constraints, correctness)

**Timeline:**
- Code owner: 48 hours initial review
- Reviewer 1: 24 hours quality check
- Reviewer 2: 24 hours domain check
- Merge: 1 hour (on approval)

### Existing Skill Update (<10% change)

**Requirements:**
- ✅ 1 reviewer (quality OR domain)
- ✅ Checklist: Changed sections only
- ✅ No CI/CD failures

### Major Skill Refactor (>10% change)

**Requirements:**
- ✅ 2 reviewers (same as new submission)
- ✅ Full checklist
- ✅ Backwards compatibility assessment
- ✅ Domain owner approval

---

## Quality Gates (Automated)

### Pre-Commit Hook (`.husky/pre-commit-skill-validation`)

**Blocks commit if:**
- ❌ Non-English skills detected
- ❌ YAML syntax invalid
- ⚠️ Skill <2KB (warning, doesn't block)

**Runs locally before push**

### CI/CD Gate (`.github/workflows/skill-quality-gate.yml`)

**Fails PR if:**
- ❌ Non-English skills in diff
- ❌ Required metadata missing
- ❌ YAML frontmatter invalid
- ⚠️ >10 substantive skills missing examples (fails)

**Runs on all PRs targeting main**

### Code Review Checklist (`SKILL_REVIEW_CHECKLIST.md`)

**Manual gates (require human approval):**
- ✅ Language & encoding ✓
- ✅ Content structure ✓
- ✅ Examples (BAD + GOOD) ✓
- ✅ Philosophy alignment ✓
- ✅ Metadata complete ✓

---

## Escalation Path

### Level 1: Metric Below Target

**When:** Monthly metric drops below target

**Action:**
1. Identify root cause
2. Assign owner
3. Create remediation plan
4. Review in weekly standup

**Example:**
- English compliance drops to 98% → Audit new PRs → Remove non-English skills

### Level 2: Health Score <75

**When:** Overall health falls to critical

**Action:**
1. Team sync immediately
2. Pause non-critical feature work
3. Focused quality sprint
4. Daily metrics review

**Example:**
- Health drops to 38/100 → Activate Phase 1 (Correction) → Daily progress tracking

### Level 3: Skill Rejection

**When:** Skill cannot meet quality standards

**Action:**
1. Document reasons (quality, philosophy, governance)
2. Communicate to submitter
3. Offer mentoring on improvements
4. Archive for future reference

**Example:**
- Stub skill with no examples → Reject → Offer template + examples guidance

---

## Related Skills (Cross-Domain Quality)

All quality guardrails apply equally across domains, but with domain-specific emphasis:

| Domain | Quality Focus | Example |
|--------|---------------|---------|
| **Trading** | Correctness + risk safety | Examples must show risk limits |
| **Agent** | Orchestration correctness | Examples must show fallback paths |
| **CNCF** | Production readiness | Examples must be real manifests |
| **Coding** | Philosophy alignment | Examples must follow 5 Laws |
| **Programming** | Completeness + accuracy | Examples must include complexity |

---

## Monitoring & Alerts

### Real-Time Dashboard

- **URL:** `http://localhost:3000/quality-dashboard.html`
- **Refresh:** Every 30 seconds
- **Metrics:** Health score, examples, patterns, maturity

### Weekly Report (Monday 9 AM)

**Owner:** @paulpas

**Contents:**
- [ ] Weekly metric changes
- [ ] New submissions approved
- [ ] Open issues (if any)
- [ ] Next week forecast

### Monthly Review (1st of month)

**Owner:** @paulpas + Team

**Agenda:**
1. Review all 6 quality metrics
2. Compare vs. targets
3. Identify trend changes
4. Adjust priorities if needed
5. Celebrate wins

---

## Budget & Resources

### Estimation for Phase 1 (Correction)

- **855 skills** need examples added
- **@paulpas:** 40 hrs/week × 8 weeks = 320 hours
- **Estimated effort:** 20 sec/skill average = ~290 hours
- **Effort estimate:** 6-8 weeks (assuming 40 hrs/week)

### Batch Processing Script

To accelerate Phase 1, we provide:
- `scripts/add-missing-examples.py` — Auto-scaffold examples
- `scripts/validate-examples.py` — Audit code examples
- `scripts/completeness-audit.py` — Score completeness

---

## Success Criteria (by Milestone)

### End of Phase 1 (June 2026)

- [ ] 100% of substantive skills have examples
- [ ] 95% of skills have good/bad patterns
- [ ] Health score ≥ 75 / 100
- [ ] 0 non-English skills
- [ ] All Phase 0 guardrails operational

### End of Phase 2 (July 2026)

- [ ] 50% of skills at stable maturity
- [ ] 30% of skills at beta maturity
- [ ] 20% of skills at draft maturity
- [ ] Average completeness ≥ 80%
- [ ] Health score ≥ 82 / 100

### End of Phase 3 (September 2026)

- [ ] Health score ≥ 90 / 100
- [ ] Zero non-English skills
- [ ] 100% of skills with examples
- [ ] 100% of substantive skills with good/bad patterns
- [ ] 60% of skills at stable maturity

---

## References

- [SKILL_REVIEW_CHECKLIST.md](./SKILL_REVIEW_CHECKLIST.md) — Comprehensive review guide
- [SKILL_TEMPLATE_COMPLETE.md](./skills/SKILL_TEMPLATE_COMPLETE.md) — Full skill template
- [AGENTS.md](./AGENTS.md) — Skill creation guidelines
- [SKILL_FORMAT_SPEC.md](./SKILL_FORMAT_SPEC.md) — Format specification

---

**Document Version:** 1.0.0  
**Last Updated:** 2026-04-26  
**Maintained By:** @paulpas  
**Review Cycle:** Monthly (1st of month)
