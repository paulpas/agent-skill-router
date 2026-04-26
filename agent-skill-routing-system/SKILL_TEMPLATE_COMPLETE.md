# Complete Skill Template

Use this template as a starting point for creating new skills. It includes all required sections, best practices, and examples.

> **Important:** This is a **template**. Replace all placeholder text with your actual content before submitting.

---

## Full SKILL.md Template

```markdown
---
name: example-skill-name
description: Clear action verb + specific domain terms + measurable benefit (max 200 chars)
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding                                    # agent, cncf, coding, trading, programming
  role: implementation                              # implementation, reference, review, orchestration
  scope: implementation                             # implementation, infrastructure, orchestration, review
  output-format: code                               # code, manifests, analysis, report
  triggers: keyword1, keyword2, keyword3, how-do-i, vernacular-term, business-phrase, another-term, related-concept
  related-skills: other-skill-name-1, other-skill-name-2
  maturity: stable                                  # draft, beta, stable
  completeness: 95                                  # 0-100 quality score
  exampleCount: 3                                   # Number of code examples included
---

# Skill Title (Human Readable, Not Kebab-Case)

One to three sentences explaining what loading this skill makes the model do. This is the **role**: how does this skill change the model's behavior? Be specific about the benefit.

Example roles:
- "Implements stop-loss strategies to limit position losses in trading algorithms"
- "Selects appropriate algorithm based on input size and performance constraints"
- "Analyzes code for security vulnerabilities using OWASP Top 10 patterns"
- "Routes tasks to specialized agents based on complexity and domain"

## TL;DR Checklist

- [ ] Actionable step 1 (not just a concept)
- [ ] Actionable step 2 (something the model should do)
- [ ] Actionable step 3 (concrete guideline)
- [ ] Actionable step 4 (if complex skill)
- [ ] Actionable step 5 (if complex skill)

---

## When to Use

Use this skill when:

- **Specific scenario 1** — What's the concrete situation? Not vague.
- **Specific scenario 2** — What exact problem are you solving?
- **Specific scenario 3** — What pattern does this apply to?

Example:
- "You're implementing position risk controls and need to decide where to place the stop loss"
- "You're reviewing trading algorithm code and need to verify stop-loss implementation"
- "You're designing an emergency stop mechanism and need to know best practices"

---

## When NOT to Use

Avoid this skill for:

- **Anti-pattern 1** — When you should use [Other Skill] instead
- **Anti-pattern 2** — When situation doesn't match (e.g., why not to use this for simple cases)
- **Anti-pattern 3** — When simpler approach exists (and what that is)

Example:
- "Don't use this for implementing your first stop loss without reading OWASP security guidelines"
- "Don't apply this to ultra-low-latency market-making where alternatives are better"
- "Not applicable if you already have a risk management system; use that instead"

---

## Core Workflow

Follow these steps in order. Each step has a clear **Checkpoint** to verify before proceeding.

### 1. Assess Current Situation

Describe the initial state and what needs evaluation.

**Checkpoint:** You can clearly describe the current state and why it matters.

### 2. Apply the Core Principle

The fundamental technique or concept that solves the problem.

**Checkpoint:** You understand the principle and can explain it in plain English.

### 3. Implement the Pattern

The concrete implementation with specific steps.

**Checkpoint:** You have working code that follows the pattern.

### 4. Validate & Test

How to verify the implementation is correct.

**Checkpoint:** You've run the checklist and code works correctly.

---

## Implementation Patterns

### Pattern 1: The Correct Approach (❌ BAD vs ✅ GOOD)

Brief explanation of why this pattern is correct and how it solves the problem.

#### ❌ BAD — Why This Doesn't Work

Brief explanation of what's wrong with this approach and why it fails.

```python
# ❌ BAD — Explanation of the flaw
def bad_example():
    """This approach violates [constraint] because [reason]."""
    result = do_something()
    # Problem: modifies global state, no error handling, ignores edge cases
    return process_result(result)
```

**What's wrong:**
- Specific issue 1 (with impact)
- Specific issue 2 (with impact)
- Specific issue 3 (with impact)

#### ✅ GOOD — Why This Works

Brief explanation of how this pattern solves the problem correctly.

```python
# ✅ GOOD — Explanation of why this is correct
def good_example(input_data: dict) -> dict:
    """
    Correctly handles [task] by following [principle].
    
    Args:
        input_data: Validated input with required fields
    
    Returns:
        Result dict with all required fields
    
    Raises:
        ValueError: If input is invalid
    """
    # Guard clause: handle edge cases early
    if not input_data:
        raise ValueError("input_data cannot be empty")
    
    # Parse: ensure data is in trusted state
    parsed = parse_and_validate(input_data)
    
    # Process: pure logic, no side effects
    result = process_safely(parsed)
    
    # Return: new data structure, no mutations
    return result
```

**Why this works:**
- Follows principle 1 (with benefit)
- Handles edge cases 2 (with benefit)
- Is predictable and testable (with benefit)

---

### Pattern 2: Advanced Case (Optional)

For complex skills, include 2-3 patterns showing different scenarios or approaches.

```python
# ✅ GOOD — Advanced pattern for [scenario]
def advanced_pattern(data: list[dict], options: dict) -> list[dict]:
    """Handle [complex case] with [technique]."""
    # Implementation details
    pass
```

---

## Constraints

These are non-negotiable rules that apply to all code using this skill.

### MUST DO

- **Constraint 1** — Why this matters and impact of violation
- **Constraint 2** — Specific requirement with no exceptions
- **Constraint 3** — How to verify compliance

### MUST NOT DO

- **Anti-pattern 1** — Why this breaks the system
- **Anti-pattern 2** — Common mistake to avoid
- **Anti-pattern 3** — Silent failure mode to prevent

---

## Philosophy Alignment

This skill adheres to [Your Framework]. Verify these principles:

### For Coding Skills (5 Laws of Elegant Defense):

- ✅ **Early Exit** — Edge cases handled at top with guard clauses
- ✅ **Parse Don't Validate** — Data parsed to trusted state at boundary
- ✅ **Atomic Predictability** — Functions are pure (same input = same output)
- ✅ **Fail Fast** — Invalid states halt with descriptive errors immediately
- ✅ **Intentional Naming** — Code reads like English, names guarantee logic

### For Trading Skills:

- ✅ **Risk Management** — All constraints prevent catastrophic loss
- ✅ **Predictability** — Behavior is deterministic and auditable
- ✅ **Transparency** — All calculations can be traced and verified
- ✅ **Safety First** — Emergency stops take absolute priority

### For Agent Skills:

- ✅ **Single Responsibility** — Agent handles one concern
- ✅ **Clear Fallback** — Failure mode is explicitly defined
- ✅ **Observable** — Routing decisions can be logged and audited
- ✅ **Composable** — Works well with other agents

---

## Related Skills

Use these companion skills before or after this one:

| Skill Name | When to Use | Relationship |
|------------|------------|--------------|
| `related-skill-1` | Use **before** this skill for [task] | Prerequisite: sets up context |
| `related-skill-2` | Use **after** this skill to [task] | Complementary: handles next step |
| `related-skill-3` | Use **instead** for [scenario] | Alternative: similar goal, different approach |

---

## Output Template

When applying this skill, your output should contain:

1. **Reasoning** — Explain the decision and why it's correct
2. **Implementation** — Provide the working code/guidance
3. **Validation** — Show how to test that it works
4. **Risks** — Identify any constraints violated (should be zero)

Example output format:
```
## Solution

**Why this approach:**
- Follows constraint 1 ✓
- Handles edge case 2 ✓
- Achieves goal 3 ✓

**Implementation:**
[Code block with working example]

**How to validate:**
[Testing steps]

**Risks:** None
```

---

## Checklist for Submission

Before submitting this skill:

- [ ] All sections completed (no TODO or placeholder text)
- [ ] BAD and GOOD examples are actual working code
- [ ] Examples validate against [framework]
- [ ] All triggers are specific (not ultra-generic)
- [ ] Related-skills are bidirectional
- [ ] No non-English content
- [ ] File size > 2000 bytes
- [ ] YAML frontmatter is valid
- [ ] Metadata fields all present

---

## References & Further Reading

- [5 Laws of Elegant Defense](./code-philosophy/SKILL.md) — Core philosophy for coding skills
- [SKILL_REVIEW_CHECKLIST.md](./SKILL_REVIEW_CHECKLIST.md) — Full review requirements
- [SKILL_GOVERNANCE.md](./SKILL_GOVERNANCE.md) — Quality standards and metrics

---

**Skill Version:** 1.0.0  
**Created:** 2026-04-26  
**Maturity:** stable  
**Completeness:** 95%
```

---

## How to Use This Template

### Step 1: Copy the Template

Copy the full `SKILL.md` template above into your new skill file:

```bash
mkdir -p skills/<domain>/<topic>
# Paste template content into skills/<domain>/<topic>/SKILL.md
```

### Step 2: Customize for Your Domain

Replace placeholders based on your domain:

| Domain | Replace Metadata with | Replace Philosophy with |
|--------|----------------------|------------------------|
| `coding` | `role: implementation` | 5 Laws of Elegant Defense |
| `trading` | `role: implementation` | Risk Management principles |
| `cncf` | `role: reference` | Cloud-native best practices |
| `agent` | `role: orchestration` | Agent choreography patterns |
| `programming` | `role: reference` | Algorithm design principles |

### Step 3: Fill in Content

1. **Describe your skill** (1–2 sentences) — what does loading this make the model do?
2. **List when to use it** — 3+ specific scenarios
3. **List when NOT to use it** — 3+ anti-patterns or alternatives
4. **Provide workflow** — 3–5 concrete steps with checkpoints
5. **Include patterns** — At least one ❌ BAD and ✅ GOOD pair
6. **State constraints** — What's mandatory and forbidden?

### Step 4: Validate

Run the validation script:

```bash
python3 scripts/validate-skill.py skills/<domain>/<topic>/SKILL.md
```

Expected output:
```
✅ SKILL.md format valid
✅ Examples detected (2 examples)
✅ Constraints defined
✅ Metadata complete
✅ Ready for submission
```

### Step 5: Submit

```bash
git add skills/<domain>/<topic>/SKILL.md
git commit -m "feat: add <topic> skill"
git push origin feature/<topic>
# Open PR for review
```

---

## Common Mistakes to Avoid

| Mistake | Problem | Fix |
|---------|---------|-----|
| **No BAD examples** | Doesn't show what to avoid | Always include ❌ BAD pattern |
| **Vague "When to Use"** | Model doesn't know when to apply skill | Use specific scenarios, not concepts |
| **Placeholder text** | Incomplete skill confuses model | Remove all TODO, FIXME, example.com |
| **Metadata missing** | Skill won't route or load | Check all required fields in frontmatter |
| **Non-English content** | Fails quality gates | Audit with language checker |
| **Generic constraints** | Doesn't enforce behavior | Make constraints specific + actionable |
| **No philosophy alignment** | Code quality suffers | Verify against 5 Laws or framework |

---

## Domain-Specific Examples

### Coding Skill Example

See: `skills/coding/code-review/SKILL.md`

- Focus: Philosophy (5 Laws)
- Examples: TypeScript/Python code
- Constraints: SOLID principles + elegance

### Trading Skill Example

See: `skills/trading/risk-stop-loss/SKILL.md`

- Focus: Risk safety
- Examples: Python with type hints
- Constraints: Emergency stops mandatory

### CNCF Skill Example

See: `skills/cncf/kubernetes/SKILL.md`

- Focus: Production readiness
- Examples: Real YAML manifests
- Constraints: Security + reliability

---

## Getting Help

- **Questions about template?** See `AGENTS.md` for full skill creation guide
- **Format errors?** Check `SKILL_FORMAT_SPEC.md`
- **Quality concerns?** Review `SKILL_REVIEW_CHECKLIST.md`
- **Governance?** See `SKILL_GOVERNANCE.md`

---

**Template Version:** 1.0.0  
**Last Updated:** 2026-04-26  
**Maintained By:** @paulpas
