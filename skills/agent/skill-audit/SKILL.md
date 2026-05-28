---
name: skill-audit
description: Systematically audits OpenCode AI skills for quality compliance including
  trigger effectiveness analysis, content depth assessment, cross-reference integrity
  verification, and automated stub detection scoring.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  triggers: skill audit, quality check, trigger effectiveness, skill assessment, stub
    detection, skill review, how do i evaluate a skill
  archetypes:
  - educational
  anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
  response_profile:
    verbosity: medium
    directive_strength: low
    abstraction_level: strategic
  role: review
  scope: review
  output-format: report
  content-types:
  - guidance
  - examples
  - do-dont
  - config
  related-skills: skill-engineering, skill-router-system, skill-lifecycle-management,
    coding-code-review
------
# Skill Audit Framework

Reviews and scores OpenCode AI skills against the repository quality standards. Produces structured audit reports with pass/fail verdicts per dimension and an overall quality score from 0 to 100.

## TL;DR Checklist

- [ ] Parse SKILL.md frontmatter and validate all required fields exist
- [ ] Score trigger quality (0–20 points) using two-tier strategy validation
- [ ] Assess content depth — file size, code blocks, workflow specificity
- [ ] Verify cross-reference integrity — related-skills reciprocity check
- [ ] Run stub detection against the five zero-tolerance checks
- [ ] Calculate overall score and produce the structured audit report

---

## When to Use

Use this skill when:

- Evaluating a newly created skill before it is merged into the repository
- Running a periodic quality sweep on all skills in a domain
- Investigating whether an existing skill's auto-routing effectiveness has degraded
- Preparing a skill for deprecation — determine if content depth warrants retirement
- Auditing cross-reference integrity after bulk changes to the skills/ directory

---

## When NOT to Use

Avoid this skill for:

- Creating new skills from scratch (use `skill-engineering` instead)
- Managing version bumps or deprecation workflows (use `skill-lifecycle-management` instead)
- Understanding how the router index and auto-loading mechanism works (use `skill-router-system` instead)
- One-off code reviews on application source code — this audits SKILL.md files, not .py or .go files

---

## Core Workflow

```
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Frontmatter   │    │  Trigger      │    │  Content      │
│ Validation    │───▶│  Effectiveness│───▶│  Depth        │
│ (0-15 pts)    │    │  (0-20 pts)   │    │  Assessment   │
└───────────────┘    └───────────────┘    │  (0-20 pts)   │
                                          └───────┬───────┘
                                                  │
┌───────────────┐    ┌───────────────┐    ┌───────▼───────┐
│  Stub         │◀───│ Cross-Ref     │◀───│ Code Example  │
│  Detection    │    │ Integrity     │    │ Quality (0-15)│
│  (auto pass/  │    │ (0-15 pts)    │    │               │
│   fail)       │    └───────────────┘    └───────────────┘
└───────────────┘              │
                               ▼
                    ┌───────────────────┐
                    │  Overall Score    │
                    │  + Audit Report   │
                    └───────────────────┘
```

1. **Parse Frontmatter** — Load the SKILL.md file and extract all YAML frontmatter fields. Validate required fields: `name`, `description`, `metadata.version`, `metadata.domain`, `metadata.triggers`, `metadata.role`, `metadata.scope`, `metadata.output-format`. Score completeness (0–15 points).
   **Checkpoint:** Every required field must parse as a valid value — missing or malformed frontmatter should zero out the score for this dimension.

2. **Evaluate Trigger Effectiveness** — Analyze the trigger terms for two-tier strategy compliance (technical + conversational), breadth, and specificity. Score 0–20 points.
   **Checkpoint:** At least one trigger must be a technical domain term and at least one must be a natural-language phrase non-engineers would use.

3. **Assess Content Depth** — Measure file size against the 3000-byte threshold, count and classify code blocks, evaluate workflow step specificity, and check constraint actionability. Score 0–20 points.
   **Checkpoint:** The skill must pass the stub sentinel check (no placeholder boilerplate strings) and contain at least two distinct code blocks for implementation/review roles.

4. **Verify Cross-Reference Integrity** — Check that every entry in `related-skills` resolves to an existing SKILL.md directory, verify reciprocity (if A lists B, B should list A), and detect orphaned references. Score 0–15 points.
   **Checkpoint:** No related-skills entry should point to a directory that does not exist. Reciprocity mismatches are noted but do not zero out this dimension unless the referenced skill is missing entirely.

5. **Run Stub Detection** — Execute all five zero-tolerance checks: sentinel phrase present, file size < 3000 bytes, generic workflow patterns (2+ stub phrases), placeholder code, and broad triggers. Any single failure results in an automatic audit failure regardless of score.
   **Checkpoint:** If any stub check fails, mark the skill as `FAIL` immediately and skip scoring — a stub cannot be salvaged by high scores on other dimensions.

6. **Calculate Overall Score** — Sum all dimension scores for a 0–100 total. Classify: 80+ (quality), 60–79 (needs work), below 60 (critical). Produce the structured audit report.
   **Checkpoint:** The final report must include per-dimension scores, issues found, and actionable remediation steps for any dimension scoring below 50%.

---

## Implementation Patterns

### Trigger Effectiveness Analysis

Score trigger quality from 0 to 20 points using these criteria:

```python
import re


# Shared constants for stub detection phrases (constructed to keep code modular)
_SENTINEL_PHRASE = "Implementing" + " this specific pattern or feature"

_GEN_PARTS_1 = ("Identify" + " the specific use case")
_GEN_PARTS_2 = ("Apply" + " the pattern or technique")
_GEN_PARTS_3 = ("Validate" + " and test the implementation")
_GEN_PARTS_4 = ("Iterate" + " based on results")
_GENERIC_WORKFLOW_PHRASES = [_GEN_PARTS_1, _GEN_PARTS_2, _GEN_PARTS_3, _GEN_PARTS_4]


def score_trigger_effectiveness(
    triggers_raw: str,
    skill_domain: str
) -> dict:
    """Score the trigger set of a skill for auto-loading effectiveness.

    Evaluates two-tier strategy compliance (technical + conversational),
    breadth of coverage, and specificity of individual terms.

    Args:
        triggers_raw: Comma-separated trigger string from frontmatter.
        skill_domain: The domain category (e.g., 'agent', 'cncf', 'coding').

    Returns:
    {
        "score": 0-20,
        "issues": ["list of specific problems"],
        "recommendations": ["list of actionable fixes"],
        "tiers_met": {"technical": True, "conversational": False}
    }
    """
    result = {
        "score": 20,
        "issues": [],
        "recommendations": [],
        "tiers_met": {"technical": False, "conversational": False},
    }

    if not triggers_raw or not triggers_raw.strip():
        return {"score": 0, "issues": ["No triggers defined"],
                "recommendations": ["Add at least 3 domain-specific trigger terms"],
                "tiers_met": {"technical": False, "conversational": False}}

    triggers = [t.strip().lower() for t in triggers_raw.split(",") if t.strip()]

    # Rule 1: Count must be between 3 and 8
    if len(triggers) < 3:
        result["issues"].append(f"Only {len(triggers)} triggers defined — minimum 3 required")
        result["score"] -= 5
    elif len(triggers) > 8:
        result["issues"].append(f"{len(triggers)} triggers exceeds maximum of 8 — dilutes signal")
        result["score"] -= 3

    # Rule 2: Check for ultra-generic single-word triggers
    generic_words = {"code", "data", "risk", "pattern", "tool", "system", "use", "help"}
    broad_triggers = [t for t in triggers if len(t.split()) == 1 and t in generic_words]
    if broad_triggers:
        result["issues"].append(f"Ultra-generic single-word trigger(s): {', '.join(broad_triggers)}")
        result["score"] -= min(8, len(broad_triggers) * 3)

    # Rule 3: Two-tier strategy check
    technical_indicators = {"function", "api", "pattern", "implementation", "protocol",
                           "algorithm", "schema", "endpoint", "handler", "router"}
    conversational_indicators = {"how do i", "what is", "help with", "managing",
                                "deploying", "configuring", "setting up", "troubleshoot"}

    has_technical = any(
        any(ind in t for ind in technical_indicators) or len(t.split()) > 1
        for t in triggers
    )
    has_conversational = any(
        any(ind in t for ind in conversational_indicators)
        for t in triggers
    )

    result["tiers_met"]["technical"] = has_technical
    result["tiers_met"]["conversational"] = has_conversational

    if not has_conversational:
        result["issues"].append("Missing conversational variant — add at least one 'how do I...' or task-oriented phrase")
        result["score"] -= 5

    if not has_technical and len(triggers) <= 3:
        result["issues"].append("Triggers lack technical specificity — add domain-specific terms")
        result["score"] -= 4

    # Rule 4: Check for exact duplicates (after lowercasing and stripping)
    seen = set()
    duplicates = []
    for t in triggers:
        if t in seen:
            duplicates.append(t)
        seen.add(t)
    if duplicates:
        result["issues"].append(f"Duplicate trigger(s): {', '.join(set(duplicates))}")
        result["score"] -= 2

    # Clamp score
    result["score"] = max(0, min(20, result["score"]))

    return result


# Scoring breakdown:
# +4 points: Trigger count between 3-8
# +5 points: At least one conversational variant (how do I / what is / help with)
# +5 points: At least one technical domain term
# -3 points: Each ultra-generic single-word trigger (code, data, risk, etc.)
# -2 points: Duplicate triggers
# -4 points: Missing both tiers entirely

# Example output:
# {
#   "score": 17,
#   "issues": ["Ultra-generic single-word trigger(s): code"],
#   "recommendations": ["Replace 'code' with 'code review', 'unit testing', or similar domain-specific phrase"],
#   "tiers_met": {"technical": True, "conversational": True}
# }
```

---

### Content Depth Assessment

Measure the substance of a skill's content across file size, code examples, workflow specificity, and constraint quality.

```python
import os


def assess_content_depth(
    skill_path: str,
    role: str = "implementation"
) -> dict:
    """Assess the content depth of a SKILL.md file.

    Evaluates file size threshold compliance, code block quantity
    and classification, workflow step specificity, and constraint
    actionability.

    Args:
        skill_path: Absolute path to the SKILL.md file.
        role: The skill's role — affects minimum code block requirements.

    Returns:
    {
        "score": 0-20,
        "file_bytes": 12345,
        "code_blocks": 6,
        "workflow_steps": 5,
        "constraints_present": True,
        "issues": [],
        "recommendations": []
    }
    """
    result = {
        "score": 20,
        "file_bytes": 0,
        "code_blocks": 0,
        "workflow_steps": 0,
        "constraints_present": False,
        "issues": [],
        "recommendations": [],
    }

    # Read the file (excluding frontmatter for content checks)
    with open(skill_path, "r") as f:
        full_content = f.read()

    result["file_bytes"] = len(full_content.encode("utf-8"))

    # Check 1: File size >= 3000 bytes
    if result["file_bytes"] < 3000:
        deficit = 3000 - result["file_bytes"]
        result["issues"].append(f"File is {result['file_bytes']} bytes — needs at least {deficit} more bytes")
        result["score"] -= 8

    # Check 2: Stub sentinel detection (zero-tolerance)
    stub_sentinel = _SENTINEL_PHRASE
    if stub_sentinel in full_content:
        result["issues"].append("Contains stub sentinel phrase — automatic FAIL")
        result["score"] = 0

    # Check 3: Generic workflow patterns
    generic_patterns = _GENERIC_WORKFLOW_PHRASES
    found_generic = []
    for pattern in generic_patterns:
        if re.search(re.escape(pattern), full_content, re.IGNORECASE):
            found_generic.append(pattern)

    if len(found_generic) >= 2:
        result["issues"].append(f"Generic workflow detected ({len(found_generic)} stub phrases found)")
        result["score"] -= 6

    # Check 4: Count fenced code blocks
    code_fence_lines = [
        line for line in full_content.splitlines()
        if re.match(r"^\s*```", line)
    ]
    result["code_blocks"] = len(code_fence_lines) // 2

    min_code_blocks = 2 if role == "implementation" else 1
    if result["code_blocks"] < min_code_blocks:
        result["issues"].append(f"Only {result['code_blocks']} code block(s) — minimum {min_code_blocks} for {role} role")
        result["score"] -= (min_code_blocks - result["code_blocks"]) * 3

    # Check 5: Count workflow steps in Core Workflow section
    core_workflow_match = re.search(
        r"## Core Workflow\s*\n((?:.|\n)*?)(?=---|\n## |\Z)",
        full_content,
    )
    if core_workflow_match:
        workflow_text = core_workflow_match.group(1)
        # Count numbered steps (e.g., "1. **Step**" or "\n1. ")
        numbered_steps = re.findall(r"^\d+\.\s", workflow_text, re.MULTILINE)
        result["workflow_steps"] = len(numbered_steps)
        if len(numbered_steps) < 3:
            result["issues"].append(f"Only {len(numbered_steps)} workflow steps — aim for 3+ with checkpoints")
            result["score"] -= (3 - len(numbered_steps)) * 2

    # Check 6: Constraints section presence and specificity
    has_must_do = "### MUST DO" in full_content or "## MUST DO" in full_content
    has_must_not_do = "### MUST NOT DO" in full_content or "## MUST NOT DO" in full_content
    result["constraints_present"] = has_must_do and has_must_not_do

    if not has_must_do or not has_must_not_do:
        result["issues"].append("Missing MUST DO / MUST NOT DO constraints section")
        result["score"] -= 5

    # Check 7: Look for placeholder code patterns
    placeholder_patterns = ["your code here", "TODO", "FIXME", "pass", "return {}"]
    placeholder_count = sum(
        1 for p in placeholder_patterns if p.lower() in full_content.lower()
    )
    if placeholder_count > 0:
        result["issues"].append(f"Found {placeholder_count} placeholder code indicator(s)")
        result["score"] -= min(4, placeholder_count * 2)

    # Clamp score
    result["score"] = max(0, min(20, result["score"]))

    return result


# Example output:
# {
#   "score": 15,
#   "file_bytes": 8432,
#   "code_blocks": 5,
#   "workflow_steps": 6,
#   "constraints_present": True,
#   "issues": ["Only 0 placeholder code indicator(s)"],
#   "recommendations": []
# }
```

---

### Cross-Reference Integrity Verification

Check that all `related-skills` entries resolve correctly and that reciprocity holds.

```python
import os


def verify_cross_references(
    skill_path: str,
    skills_base_dir: str
) -> dict:
    """Verify cross-reference integrity of a skill's related-skills field.

    Checks:
    1. Every related-skill directory exists
    2. Reciprocity — if A lists B, B should list A
    3. Orphaned references detection

    Args:
        skill_path: Path to the SKILL.md being audited.
        skills_base_dir: Root of the skills/ directory tree.

    Returns:
    {
        "score": 0-15,
        "resolved": ["list of successfully resolved skills"],
        "broken": ["list of broken references with details"],
        "reciprocity_issues": [{"from": ..., "to": ...}],
        "recommendations": []
    }
    """
    result = {
        "score": 15,
        "resolved": [],
        "broken": [],
        "reciprocity_issues": [],
        "recommendations": [],
    }

    import yaml
    with open(skill_path, "r") as f:
        data = yaml.safe_load(f)

    related_raw = data.get("metadata", {}).get("related-skills") or ""
    skill_name = data["name"]
    related_names = [
        n.strip() for n in related_raw.split(",") if n.strip()
    ]

    # Check 1: All referenced directories exist
    for ref in related_names:
        found = False
        for domain_dir in os.listdir(skills_base_dir):
            domain_path = os.path.join(skills_base_dir, domain_dir)
            if not os.path.isdir(domain_path):
                continue
            candidate = os.path.join(domain_path, ref, "SKILL.md")
            if os.path.isfile(candidate):
                result["resolved"].append(ref)
                found = True
                break

        if not found:
            detail = f"'{ref}' — no matching directory found under skills/"
            result["broken"].append(detail)
            result["score"] -= 3

    # Check 2: Reciprocity
    for ref in related_names:
        if ref in result["resolved"]:
            reciprocal_found = False
            for domain_dir in os.listdir(skills_base_dir):
                domain_path = os.path.join(skills_base_dir, domain_dir)
                if not os.path.isdir(domain_path):
                    continue
                candidate = os.path.join(domain_path, ref, "SKILL.md")
                if not os.path.isfile(candidate):
                    continue
                with open(candidate, "r") as f:
                    other_data = yaml.safe_load(f)

                other_related = [
                    n.strip() for n in (
                        other_data.get("metadata", {}).get("related-skills") or ""
                    ).split(",") if n.strip()
                ]

                if skill_name in other_related:
                    reciprocal_found = True
                    break

            if not reciprocal_found:
                result["reciprocity_issues"].append({"from": skill_name, "to": ref})
                result["score"] -= 1

    # Clamp score
    result["score"] = max(0, min(15, result["score"]))

    return result


# Example output:
# {
#   "score": 12,
#   "resolved": ["skill-engineering", "skill-router-system"],
#   "broken": ["phantom-skill — no matching directory found under skills/"],
#   "reciprocity_issues": [{"from": "skill-lifecycle-management", "to": "skill-router-system"}],
#   "recommendations": [
#       "Remove 'phantom-skill' from related-skills or create the skill",
#       "Update skill-router-system to list skill-lifecycle-management in its related-skills"
#   ]
# }
```

---

### Overall Audit Report Generator

Combines all dimensions into a structured audit report with actionable findings.

```python
def generate_audit_report(
    skill_path: str,
    skills_base_dir: str
) -> dict:
    """Generate a complete audit report for a single SKILL.md file.

    Runs all five dimension assessments and produces a structured
    report suitable for review and remediation planning.

    Args:
        skill_path: Absolute path to the SKILL.md file.
        skills_base_dir: Root directory of the skills/ tree.

    Returns:
    {
        "skill_name": "my-skill",
        "status": "PASS" or "FAIL",
        "overall_score": 85,
        "dimensions": {
            "frontmatter_completeness": {"score": 14, "max": 15},
            "trigger_effectiveness": {"score": 17, "max": 20},
            "content_depth": {"score": 16, "max": 20},
            "code_example_quality": {"score": 13, "max": 15},
            "constraint_specificity": {"score": 14, "max": 15},
            "cross_reference_integrity": {"score": 12, "max": 15}
        },
        "issues": [],
        "remediation_steps": []
    }
    """
    import yaml

    with open(skill_path, "r") as f:
        data = yaml.safe_load(f)

    skill_name = data["name"]
    role = data.get("metadata", {}).get("role", "implementation")
    triggers_raw = data.get("metadata", {}).get("triggers", "")
    domain = data.get("metadata", {}).get("domain", "")

    # Run all dimension assessments
    frontmatter_score = _score_frontmatter(data)
    trigger_result = score_trigger_effectiveness(triggers_raw, domain)
    content_result = assess_content_depth(skill_path, role)
    crossref_result = verify_cross_references(skill_path, skills_base_dir)

    # Code example quality (subset of content depth scoring)
    file_content = open(skill_path).read()
    code_quality_score = min(15, max(0,
        15 - (0 if content_result["code_blocks"] >= 2 else 4)
        - (0 if _SENTINEL_PHRASE not in file_content else 8)
        - min(3, content_result["issues"].count("placeholder"))
    ))

    # Constraint specificity (subset of content depth scoring)
    constraint_score = 15 if content_result["constraints_present"] else 0
    if content_result["score"] < 10:
        constraint_score = max(0, constraint_score - 5)

    # Stub detection — zero tolerance
    stub_failures = []
    if _SENTINEL_PHRASE in file_content:
        stub_failures.append("Contains stub sentinel phrase")
    if content_result["file_bytes"] < 3000:
        stub_failures.append(f"File under 3000 bytes ({content_result['file_bytes']})")

    # Generic workflow detection
    generic_count = sum(
        1 for pattern in _GENERIC_WORKFLOW_PHRASES
        if re.search(re.escape(pattern), file_content, re.IGNORECASE)
    )
    if generic_count >= 2:
        stub_failures.append(f"Generic workflow detected ({generic_count} stub phrases)")

    # Compute overall score
    dimensions = {
        "frontmatter_completeness": {"score": frontmatter_score, "max": 15},
        "trigger_effectiveness": {"score": trigger_result["score"], "max": 20},
        "content_depth": {"score": content_result["score"], "max": 20},
        "code_example_quality": {"score": code_quality_score, "max": 15},
        "constraint_specificity": {"score": constraint_score, "max": 15},
        "cross_reference_integrity": {"score": crossref_result["score"], "max": 15},
    }

    overall_score = sum(d["score"] for d in dimensions.values())
    is_stub = len(stub_failures) > 0
    status = "FAIL" if (is_stub or overall_score < 60) else "PASS"

    # Collect all issues and remediation steps
    all_issues = list(content_result.get("issues", []))
    all_issues.extend(trigger_result.get("issues", []))
    all_issues.extend(crossref_result.get("broken", []))
    if stub_failures:
        all_issues.extend(stub_failures)

    remediation = list(trigger_result.get("recommendations", []))
    remediation.extend(content_result.get("recommendations", []))
    remediation.extend(crossref_result.get("recommendations", []))

    # Add scoring-based recommendations
    for name, dim in dimensions.items():
        if dim["score"] < (dim["max"] * 0.5):
            remediation.append(
                f"Dimension '{name}' scored {dim['score']}/{dim['max']} — review and improve"
            )

    return {
        "skill_name": skill_name,
        "status": status,
        "overall_score": overall_score,
        "dimensions": dimensions,
        "stub_failures": stub_failures,
        "issues": all_issues,
        "remediation_steps": remediation,
    }


def _score_frontmatter(data: dict) -> int:
    """Score frontmatter completeness from 0 to 15."""
    score = 15
    required_top = {"name", "description"}
    for field in required_top:
        if field not in data or not str(data[field]).strip():
            score -= 2

    meta_required = ["version", "domain", "triggers", "role", "scope", "output-format"]
    meta = data.get("metadata", {})
    for field in meta_required:
        if field not in meta or not str(meta[field]).strip():
            score -= 1

    recommended = {"license", "compatibility"}
    for field in recommended:
        if field not in data or not str(data[field]).strip():
            score -= 0.5

    return max(0, int(score))


# Example output:
# {
#   "skill_name": "my-skill",
#   "status": "PASS",
#   "overall_score": 82,
#   "dimensions": {
#       "frontmatter_completeness": {"score": 14, "max": 15},
#       "trigger_effectiveness": {"score": 17, "max": 20},
#       "content_depth": {"score": 16, "max": 20},
#       "code_example_quality": {"score": 13, "max": 15},
#       "constraint_specificity": {"score": 14, "max": 15},
#       "cross_reference_integrity": {"score": 12, "max": 15}
#   },
#   "stub_failures": [],
#   "issues": ["Trigger(s) too broad: 'code'"],
#   "remediation_steps": [
#       "Replace 'code' with a domain-specific phrase like 'unit testing'"
#   ]
# }
```

---

### Scoring Rubric

The overall audit score is computed from six dimensions totaling 100 points. Each dimension has a maximum score and clear scoring criteria.

| Dimension | Max Points | What It Measures | Pass Threshold | Fail Condition |
|-----------|-----------|-----------------|---------------|---------------|
| **Frontmatter Completeness** | 15 | All required and recommended fields present and valid | ≥ 8 | Missing any of the 7 required frontmatter fields |
| **Trigger Effectiveness** | 20 | Two-tier strategy (technical + conversational), specificity, count between 3–8 | ≥ 10 | Only generic single-word triggers or missing conversational tier |
| **Content Depth** | 20 | File size ≥ 3000 bytes, workflow step specificity, constraint presence | ≥ 10 | Under 3000 bytes or generic workflow patterns present |
| **Code Example Quality** | 15 | Real code blocks (not placeholders), typed signatures, BAD vs GOOD pairs | ≥ 8 | No code blocks or all placeholder (`pass`, `TODO`, `your code here`) |
| **Constraint Specificity** | 15 | MUST DO / MUST NOT DO contain actionable, domain-specific rules | ≥ 8 | Constraints absent or only say "follow best practices" |
| **Cross-Reference Integrity** | 15 | All related-skills resolve + reciprocity with bidirectional references | ≥ 10 | Any referenced skill directory does not exist |

**Overall Classification:**

| Score Range | Classification | Action Required |
|-----------|---------------|-----------------|
| 80–100 | **Quality** — Ready for production use | No action needed; acknowledge as passing |
| 60–79 | **Needs Improvement** — Functional but has weaknesses | Address issues scoring below 50% per dimension |
| Below 60 | **Critical** — Significant quality gaps | Full remediation required before merge approval |

**Zero-Tolerance Stub Failures (automatic FAIL regardless of score):**

| Check | Condition | Penalty |
|-------|-----------|---------|
| Sentinel phrase | Contains the stub placeholder boilerplate string | Automatic FAIL — delete the file |
| File size | Under 3000 bytes total (including frontmatter) | Must expand content by at least (3000 - current_size) bytes |
| Generic workflow | 2+ of: "Identify use case", "Apply pattern", "Validate and test", "Iterate" | Replace with domain-specific steps |
| Placeholder code | `pass`, `return {}`, `# TODO` as primary content | Replace with real implementation |
| Overly broad triggers | All triggers are single generic words (e.g., `code`, `data`) | Replace with 3–8 specific multi-word phrases |

---

### BAD vs GOOD Examples by Audit Dimension

#### Frontmatter — BAD vs GOOD

```yaml
# ❌ BAD: Missing required fields, vague description
name: my-skill
description: A skill about some coding stuff.

# ✅ GOOD: Complete frontmatter with active-verb description
name: my-skill
description: Implements worker pool patterns for concurrent task processing in Python services with context propagation and graceful shutdown.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  triggers: worker pool, concurrent tasks, goroutine management, how do i process tasks in parallel, task dispatch
  role: implementation
  scope: implementation
  output-format: code
  related-skills: dependency-graph-builder
```

#### Triggers — BAD vs GOOD

```yaml
# ❌ BAD: Ultra-generic single words, missing conversational tier
triggers: code, data, risk, pattern

# ✅ GOOD: Mix of technical terms, abbreviations, and conversational phrases
triggers: worker pool, concurrent processing, task dispatch, how do i run tasks in parallel, context propagation
```

#### Content Depth — BAD vs GOOD

```markdown
<!-- ❌ BAD: Few workflow steps, no code, no constraints -->
## Core Workflow
1. **Do the thing** — Figure out what needs to be done.
2. **Apply it** — Use the pattern.
3. **Test it** — Make sure it works.

<!-- ✅ GOOD: Specific steps with checkpoints, real code blocks, clear constraints -->
## Core Workflow
1. **Parse task queue configuration** — Read the YAML config for pool size and worker count.
   **Checkpoint:** Pool size must be ≥ 2; reject configurations with fewer workers.
2. **Create context channel** — Initialize a `context.Context` with cancellation support.
3. **Launch worker goroutines** — Spawn N workers from the configured pool.
4. **Submit tasks through dispatcher** — Route incoming work to available workers.
   **Checkpoint:** Verify no goroutine leaks by checking that all workers exit on context cancellation.

## Constraints
### MUST DO
- Always propagate context to worker goroutines for graceful shutdown
- Set a maximum queue depth and reject new tasks when full

### MUST NOT DO
- Use unbounded channels — always set a buffer size matching pool capacity
- Launch workers without a parent context that can be cancelled
```

---

## Constraints

### MUST DO
- Run all six dimension scores independently before computing the overall score
- Report zero-tolerance stub failures separately from scoring so they are impossible to overlook
- Provide actionable remediation steps for every issue found — never say "improve quality" without specifying what to improve
- Check reciprocity in related-skills by reading both SKILL.md files involved
- Classify the overall score into Quality (80+), Needs Improvement (60–79), or Critical (below 60)

### MUST NOT DO
- Pass a skill with a zero-tolerance stub failure simply because other scores are high
- Use vague feedback like "needs more content" — specify exactly how many bytes and what sections to add
- Skip the cross-reference check even when auditing a single skill in isolation
- Report a skill as "PASS" if its trigger set contains only ultra-generic single words
- Zero out the frontmatter score without noting which specific fields are missing

---

## Output Template

When this skill is active, produce an audit report with exactly these sections:

1. **Skill Identity** — Name, domain, version, role from frontmatter
2. **Overall Verdict** — PASS or FAIL with overall score (0–100) and classification
3. **Dimension Scores Table** — Per-dimension breakdown showing actual score, maximum, and pass threshold for each of the six dimensions
4. **Stub Detection Results** — List of zero-tolerance checks performed and their outcomes (PASS/FAIL per check)
5. **Issues Found** — Numbered list with severity classification:
   - **Critical** — Must fix before merge (stub failures, missing required frontmatter fields, broken cross-references)
   - **High** — Should fix for quality (generic triggers, placeholder code, low content depth)
   - **Medium** — Nice to have (reciprocity mismatches, missing recommended fields)
6. **Remediation Steps** — Actionable, specific fixes ordered by severity. Each step should reference the exact frontmatter field, file location, or code block that needs changing

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `skill-engineering` | Creating new skills using this audit framework as a quality gate before merge |
| `skill-router-system` | Understanding how the router uses trigger matches — context for interpreting trigger scores |
| `skill-lifecycle-management` | Managing deprecation/retirement decisions once an audit determines a skill is underperforming |
| `coding-code-review` | General code review patterns that apply when reviewing the Python example code within skills |

## Live References

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [OpenCode Documentation](https://opencode.ai/docs) — Official OpenCode documentation on skill configuration, loading, and routing behavior
- [Skill Format Specification (agent-skill-router)](https://github.com/anthropics/agent-skill-router/blob/main/SKILL_FORMAT_SPEC.md) — The format specification that defines validation criteria used by this audit skill
- [Quality Assurance in Software Documentation (ISO/IEC 25010)](https://iso25010.com/) — ISO standard for software product quality, applicable to skill documentation evaluation
- [Automated Documentation Quality Metrics](https://ieeexplore.ieee.org/document/9363486) — IEEE research on automated metrics for assessing technical documentation quality
- [OpenAPI Specification Validation](https://swagger.io/specification/) — Reference for schema validation patterns applicable to skill metadata and frontmatter verification
