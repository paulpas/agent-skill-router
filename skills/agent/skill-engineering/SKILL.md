---
name: skill-engineering
description: Designs high-fidelity OpenCode AI skills with precision trigger engineering,
  stub-free validation frameworks, and domain-specific constraint patterns for the
  agent-skill-router system.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: agent
  triggers: skill design, trigger engineering, SKILL.md crafting, stub detection,
    skill generation, agent skill routing, how do i create a skill
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - guidance
  - examples
  - do-dont
  - config
  related-skills: coding-code-review, agent-task-routing, coding-security-review
---
# Skill Engineering Framework

Designs high-fidelity OpenCode AI skills with precision trigger engineering, stub-free validation frameworks, and domain-specific constraint patterns. When loaded, this skill makes the model act as a senior skill architect — reviewing, creating, or refining SKILL.md files to meet the zero-tolerance quality standards of the agent-skill-router system.

## TL;DR Checklist

- [ ] Verify YAML frontmatter: all required fields present, `name` matches directory kebab-case exactly
- [ ] Check description starts with active verb, includes 1–2 domain terms, stays under ~200 characters
- [ ] Validate triggers: 5–8 terms blending technical precision (e.g., `stop loss`, `PromQL`) with conversational discovery (e.g., `how do i limit losses`)
- [ ] Confirm file is ≥ 3,000 bytes and contains zero instances of the stub sentinel phrase
- [ ] Ensure Core Workflow has numbered steps with **Checkpoint:** notes — no generic "identify → apply → validate" patterns
- [ ] Include at least 2 real code blocks with actual implementations (not placeholders like `# TODO`)
- [ ] Provide BAD vs GOOD comparison pair(s) relevant to the domain
- [ ] Add MUST DO / MUST NOT DO constraints that are actionable and specific (no "follow best practices")

---

## When to Use

Use this skill when:

- Designing a new SKILL.md from scratch for any domain (agent, cncf, coding, trading, go, linux, programming)
- Reviewing an existing SKILL.md that failed automated validation (stub detection, size checks, trigger quality)
- Refining trigger sets that are too broad (matching irrelevant conversations) or too narrow (missing natural phrasings)
- Crafting descriptions that read like topic labels instead of action-oriented capability statements
- Auditing skills for the zero-tolerance stub policy — checking for placeholder code, thin content, or generic workflows
- Adding new skills to the router index and needing to update README.md catalog generation

---

## When NOT to Use

Avoid this skill for:

- Implementing domain logic inside a skill (use `coding-*` or domain-specific implementation skills instead) — this skill designs the SKILL.md wrapper, not the runtime code
- Writing user-facing documentation, blog posts, or README files — use `writing-technical-documentation` or similar
- Debugging runtime agent behavior that is unrelated to skill metadata or trigger matching — use `agent-runtime-log-analyzer`
- Creating skills with fewer than 3 meaningful triggers or for topics too narrow to warrant a separate skill entry

---

## Core Workflow

1. **Parse the Target or Brief** — Determine whether you are creating from scratch, reviewing an existing file, or refining specific sections. Read the full SKILL.md content and AGENTS.md quality checklist.
   **Checkpoint:** Identify the domain (`agent`, `cncf`, `coding`, `trading`, etc.) and confirm the directory name matches the intended `name` field exactly in kebab-case.

2. **Engineer the YAML Frontmatter** — Construct or audit all required frontmatter fields:
   - Verify `name` matches the directory topic name exactly (case-sensitive, kebab-case)
   - Rewrite `description` with an active verb and domain-specific terms if generic
   - Build the trigger set using the Two-Tier Trigger Strategy (see Implementation Patterns)
   - Set `metadata.role`, `scope`, and `output-format` to values that match the skill's actual behavior, not defaults
   **Checkpoint:** All required fields present. No typos in enum values (`implementation` not `implemention`). Triggers between 5–8 terms.

3. **Craft the H1 Title and Purpose Paragraph** — Write a human-readable title (not kebab-case) and a 1–3 sentence role description from the model's perspective. The purpose paragraph must state what loading this skill makes the model *do*, not what the topic is about.
   **Checkpoint:** Title is readable English, not `risk-stop-loss`. Purpose paragraph contains an action verb and describes model behavior.

4. **Build the Core Workflow with Domain-Specific Steps** — Write 4–6 numbered steps. Each step must name a concrete action (e.g., "Calculate ATR-based stop level" not "Apply pattern") and end with a **Checkpoint:** line specifying what to verify before proceeding.
   **Checkpoint:** No generic step names. Every step has domain-specific detail. Every step ends with a Checkpoint.

5. **Create Implementation Patterns / Reference Guide** — Add 2+ patterns as subsections. Each pattern must include:
   - A descriptive name (e.g., "ATR-Based Stop Calculation", not "Pattern 1")
   - A brief explanation of when and why to use it
   - A real code block with typed signatures, docstrings, and guard clauses
   - At least one BAD vs GOOD comparison somewhere in this section
   **Checkpoint:** Code blocks contain actual implementations — no `pass` bodies, no `return {}`, no `# TODO: add implementation`.

6. **Define Constraints (MUST DO / MUST NOT DO)** — Write 5–8 actionable rules per subsection. Each constraint must be a specific behavior, not an abstract principle. Reference `code-philosophy` laws where data flow or constraint architecture applies.
   **Checkpoint:** No constraints read like "follow best practices" or "ensure quality." Each is testable against the actual skill file.

7. **Run Validation Against Stub Policy** — Apply the zero-tolerance checks:
   - File size ≥ 3,000 bytes (excluding frontmatter)
   - Zero occurrences of the stub sentinel phrase
   - ≥ 2 real code blocks with working implementations
   - Core Workflow steps are domain-specific with Checkpoints
   - Triggers avoid ultra-generic single words
   **Checkpoint:** All checks pass. If any fail, iterate and fix before considering the skill complete.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         SKILL LIFECYCLE: DESIGN → VALIDATE → DEPLOY                │
└─────────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐
  │  Idea / Brief │
  └───────┬──────┘
          │
          ▼
  ┌──────────────────────────────────────────────────────────────────────────────┐
  │                        STEP 1: FRONTMATTER ENGINEERING                         │
  │                                                                                │
  │   • name = directory kebab-case (exact match)                                  │
  │   • description = active verb + domain terms (<200 chars)                      │
  │   • triggers = 5-8 terms, two-tier strategy (technical + conversational)       │
  │   • role/scope/output-format match actual behavior                             │
  └────────────────────────┬───────────────────────────────────────────────────────┘
                           │
                           ▼
  ┌──────────────────────────────────────────────────────────────────────────────┐
  │                      STEP 2: CONTENT ARCHITECTURE                              │
  │                                                                                │
  │   • H1 title: human-readable English (NOT kebab-case)                          │
  │   • Purpose paragraph: what the model DOES (not what the topic IS)             │
  │   • TL;DR Checklist: 5-7 concrete checkbox items                               │
  │   • When to Use / NOT to Use: specific situations                              │
  └────────────────────────┬───────────────────────────────────────────────────────┘
                           │
                           ▼
  ┌──────────────────────────────────────────────────────────────────────────────┐
  │                    STEP 3: DOMAIN-SPECIFIC WORKFLOW                            │
  │                                                                                │
  │   • 4-6 numbered steps, each with **Checkpoint:**                              │
  │   • No generic "identify → apply → validate" patterns                          │
  │   • Steps describe concrete actions in the domain (e.g., trading formulas)     │
  └────────────────────────┬───────────────────────────────────────────────────────┘
                           │
                           ▼
  ┌──────────────────────────────────────────────────────────────────────────────┐
  │                  STEP 4: IMPLEMENTATION PATTERNS (CODE)                        │
  │                                                                                │
  │   • 2+ patterns with real code blocks                                          │
  │   • Typed signatures, docstrings, guard clauses                                │
  │   • BAD vs GOOD comparison pairs                                               │
  │   • No placeholders: pass bodies, # TODO, return {}                            │
  └────────────────────────┬───────────────────────────────────────────────────────┘
                           │
                           ▼
  ┌──────────────────────────────────────────────────────────────────────────────┐
  │                  STEP 5: CONSTRAINTS & VALIDATION                              │
  │                                                                                │
  │   • MUST DO: 5-8 actionable, specific rules                                    │
  │   • MUST NOT DO: 4-6 concrete anti-patterns                                    │
  │   • Stub policy checks: size ≥ 3KB, no sentinels, ≥ 2 real code blocks        │
  │   • Reference code-philosophy for constraint design                            │
  └────────────────────────┬───────────────────────────────────────────────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ PASS? ──Yes──► Deploy to router index  │
                    │ No ──► Fix and re-validate             │
                    └─────────────┘
```

---

## Implementation Patterns / Reference Guide

### Pattern 1: Trigger Engineering — Two-Tier Strategy

The most impactful design decision in any skill is its trigger set. Triggers drive auto-discovery; poor triggers mean the skill exists but never fires. Use the **Two-Tier Trigger Strategy**: blend technical precision terms with conversational discovery phrases that non-expert users or business stakeholders would naturally search for.

**Tier 1 — Technical Terms:** Exact domain vocabulary used by practitioners, documentation, and official product names.
**Tier 2 — Conversational Variants:** Natural language questions, business terminology, and everyday problem descriptions.

```yaml
# ❌ BAD: Only technical terms — misses 60%+ of natural user searches
triggers: stop-loss, trailing-stop, atr-based, volatility-adjusted

# ❌ BAD: Too broad — fires on nearly every trading conversation  
triggers: risk, trading, loss, price, money

# ❌ GOOD: Two-tier blend — captures both experts and business users
triggers: >-
  stop loss, trailing stop, ATR stop, position protection,
  emergency stop, how do i limit losses, capital protection
```

**Domain-specific trigger construction templates:**

```yaml
# CNCF Skills (Kubernetes example)
triggers: >-
  kubernetes, k8s, container orchestration, managing containers,
  deploying applications, scaling apps, helm chart management

# Trading Skills (VWAP execution example)  
triggers: >-
  vwap, volume-weighted average price, execution algorithm,
  order execution strategy, how do i execute large orders, minimal market impact, institutional trading

# Coding Skills (Code review example)
triggers: >-
  code review, pull request review, PR quality check, security audit,
  OWASP guidelines, architectural review, peer review process
```

**Calibration heuristic for each trigger term:** Ask "If someone says this word/phrase in a conversation, would they plausibly need this skill?" If no → exclude or make more specific.

### Pattern 2: Description Writing — Active Verb + Domain Specificity

A description tells the router what capability this skill provides. It must start with an active verb and include domain-specific terms. Never write it as a topic label.

```yaml
# ❌ BAD: Topic label, no action verb
description: Stop loss strategies for trading

# ❌ BAD: Too vague, missing domain context
description: Implements risk management patterns

# ✅ GOOD: Active verb + specific strategies + domain context
description: >-
  Implements stop-loss strategies (fixed percentage, ATR-based, trailing, 
  support/resistance levels) to protect position capital in algorithmic 
  trading systems under volatile market conditions

# ❌ BAD: Describes the skill itself, not what it makes the model do
description: This skill covers trigger engineering and stub detection rules

# ✅ GOOD: States model behavior + scope
description: >-
  Designs high-fidelity OpenCode AI skills with precision trigger engineering, 
  stub-free validation frameworks, and domain-specific constraint patterns for 
  the agent-skill-router system
```

**Description formula:** `[Active verb] [what it does] ([specific variants/methods]) to [purpose/outcome] in [domain context].`

### Pattern 3: Stub Detection — The Five Prohibited Patterns

The zero-tolerance stub policy rejects skills exhibiting any of these five patterns. Build defenses against each during design:

```python
def validate_stub_resistance(skill_content: str) -> dict:
    """Apply the five zero-tolerance stub detection checks.
    
    Returns validation result with pass/fail per check and actionable fixes.
    Implements Fail Fast (Law 4) — halts on first critical violation.
    """
    violations = []
    
    # Check 1: Stub sentinel phrase
    # Sentinel to detect: "Implementing" + "this specific pattern or feature"
    sentinel_marker = "Implementing" + " this specific pattern or feature"
    if sentinel_marker in skill_content:
        violations.append({
            "rule": "stub-sentinel",
            "severity": "fatal",
            "fix": "Remove the sentinel phrase and replace with domain-specific implementation details"
        })
    
    # Check 2: File size (excluding frontmatter)
    content_without_fmatter = skill_content.split("---\n", 2)[-1] if "---" in skill_content else skill_content
    if len(content_without_fmatter.encode("utf-8")) < 3000:
        violations.append({
            "rule": "file-size",
            "severity": "fatal",
            "fix": f"Expand content from {len(content_without_fmatter)} bytes to at least 3,000 bytes with real examples"
        })
    
    # Check 3: Generic workflow steps
    generic_patterns = [
        r"\bidentify\s+.*\s*→\s*apply\b",
        r"\bidentify.*analyze.*implement.*validate\b", 
        r"Step \d+: [A-Z][a-z]+\s+\-\s+(Identify|Apply|Implement|Validate)"
    ]
    import re
    for pattern in generic_patterns:
        if re.search(pattern, skill_content):
            violations.append({
                "rule": "generic-workflow", 
                "severity": "fatal",
                "fix": "Replace generic step names with domain-specific actions (e.g., 'Calculate ATR-based stop' not 'Apply pattern')"
            })
    
    # Check 4: Missing real code blocks (implementation skills)
    code_blocks = skill_content.split("```")
    real_code_count = sum(1 for i, block in enumerate(code_blocks) 
                         if i % 2 == 1 and "pass" not in block.lower() 
                         and "# TODO" not in block and "return {}" not in block)
    
    # Check 5: Triggers too broad
    triggers_raw = ""
    for line in skill_content.split("\n"):
        if line.startswith("triggers:") or line.startswith("  triggers:"):
            triggers_raw = line.split(":", 1)[1].strip()
    trigger_terms = [t.strip().lower() for t in triggers_raw.replace(">", "").replace("'", "").replace('"', "").split(",")]
    generic_triggers = {
        "code", "data", "risk", "pattern", "system", "management", 
        "implementation", "development", "testing", "quality"
    }
    overly_generic = [t for t in trigger_terms if t in generic_triggers and len(t) < 6]
    
    return {
        "violations": violations,
        "overall_pass": len(violations) == 0,
        "checks": {
            "stub_sentinel": len([v for v in violations if v["rule"] == "stub-sentinel"]) == 0,
            "file_size": len([v for v in violations if v["rule"] == "file-size"]) == 0,
            "generic_workflow": len([v for v in violations if v["rule"] == "generic-workflow"]) == 0,
            "real_code_blocks": real_code_count >= 2,
            "trigger_quality": len(overly_generic) == 0
        }
    }

# Usage: validate_stub_resistance(skill_md_content)
```

### Pattern 4: Core Workflow Design — Domain-Specific Checkpoints

Generic workflows read like: *"1. Identify the pattern. 2. Apply the solution. 3. Validate the result."* This is a stub signature — it teaches nothing domain-specific. Every step must name a concrete action and end with a checkpoint.

```
# ❌ BAD: Generic workflow (stub pattern)
1. **Identify the use case** — Determine what kind of problem the user has.
2. **Apply the pattern** — Use the appropriate design pattern for the situation.
3. **Validate the implementation** — Make sure the code follows best practices.

# ✅ GOOD: Domain-specific workflow with checkpoints (trading domain)
1. **Assess Market Regime** — Determine if the current market is trending, 
   ranging, or high-volatility using ATR and ADX indicators.
   **Checkpoint:** If ADX < 20 and ATR ratio < 1.5, classify as ranging regime.

2. **Select Stop Type** — Map the identified regime to the appropriate stop strategy:
   - Trending → Trailing stop with ATR-based distance
   - Ranging → Support/resistance level stop with 2% buffer
   - High-volatility → Volatility-adjusted stop (3x ATR) + hard emergency stop
   **Checkpoint:** If no suitable regime matches, default to volatility-adjusted with emergency layer.

3. **Calculate Stop Level** — Apply the formula for the selected stop type.
   For ATR-based: `stop_price = current_price - (atr_value * multiplier)` where 
   multiplier is 2.0 for normal conditions and 3.0 during earnings events.
   **Checkpoint:** Verify calculated stop price does not exceed maximum risk per trade.

4. **Layer Emergency Protection** — Overlay a hard emergency stop at the portfolio 
   level that triggers if total position loss exceeds N% regardless of individual 
   stop placement.
   **Checkpoint:** Emergency stop must be independent of individual position stops.
```

**The checkpoint rule:** Every workflow step MUST end with `**Checkpoint:**` followed by a specific verification condition — a concrete test the model can apply to confirm the step completed correctly before proceeding.

### Pattern 5: Constraint Writing — Actionable, Not Abstract

Constraints translate abstract principles into testable rules. Each constraint must be something you could verify by reading the file without additional context.

```
# ❌ BAD: Abstract constraints (unverifiable)
### MUST DO
- Follow best practices
- Ensure quality code
- Make it maintainable

### MUST NOT DO  
- Write bad code
- Be inefficient
- Ignore edge cases

# ✅ GOOD: Specific, testable constraints
### MUST DO
- Parse all user inputs at the boundary with explicit type checking (Law 2)
- Return early on missing or invalid parameters before any domain logic executes (Law 1)  
- Never mutate input dictionaries; construct and return new objects instead (Law 3)
- Fail immediately with a descriptive error message containing the parameter name and expected format (Law 4)
- Include typed function signatures with docstrings for every public API function
- Reference `code-philosophy` laws in comments explaining constraint design decisions

### MUST NOT DO
- Use bare except clauses — always catch specific exception types
- Hard-code market parameters (ATR multipliers, risk percentages); make them configurable function arguments
- Skip input validation on external data sources (API responses, file reads, environment variables)
- Return None implicitly; either return a well-typed value or raise an explicit error
- Write docstrings that repeat the function signature instead of explaining purpose, edge cases, and examples
```

---

## Constraints

### MUST DO
- Validate all YAML frontmatter fields against the format spec before considering a skill complete
- Ensure `name` field is an exact case-sensitive match to the directory topic name (kebab-case)
- Build trigger sets using the Two-Tier Strategy: technical precision + conversational discovery phrases
- Write Core Workflow steps that describe concrete domain actions with **Checkpoint:** verification points
- Include at least 2 real code blocks with typed signatures, guard clauses, and working implementations
- Provide at least one BAD vs GOOD comparison pair relevant to the skill's domain
- Write constraints as testable rules (verifiable by inspection), never abstract principles like "follow best practices"
- Reference `code-philosophy` (5 Laws of Elegant Defense) in constraint design and code comment patterns
- Include a TL;DR Checklist with 5–7 specific checkbox items the model can verify before delivering output
- Keep descriptions under ~200 characters, starting with an active verb, including 1–2 domain-specific terms

### MUST NOT DO
- Use the exact stub sentinel phrase (the one starting with "Implementing..." and referencing a "specific pattern or feature") anywhere in the file
- Write workflow steps with generic names like "Identify," "Apply," "Analyze," or "Validate" as standalone actions
- Include placeholder code: `pass` bodies, `return {}`, `# TODO: add implementation`, `...`
- Set triggers to single ultra-generic words (`code`, `data`, `risk`, `pattern`, `system`)
- Write a description that reads as a topic label instead of stating what the model does (e.g., "Stop loss for trading")
- Use an H1 title equal to the kebab-case directory name (e.g., `# risk-stop-loss`)
- Set metadata.role/scope/output-format to default values without verifying they match actual skill behavior
- List more than 4 related skills (dilutes focus) or fewer than 2 when complementary skills exist
- Skip the "When NOT to Use" section for any skill with non-obvious applicability boundaries

---

## Output Template

When applying this skill, produce outputs following this structure:

1. **File Audit Summary** — List of all frontmatter fields with pass/fail status, trigger set analysis (tier breakdown), and file size verification
2. **Corrected Frontmatter** — Complete YAML block ready for insertion, with any fixes applied and rationale for changes
3. **Trigger Set Analysis** — Before/after comparison showing old triggers, why they failed the calibration heuristic, and new triggers mapped to technical vs conversational tiers
4. **Workflow Step Review** — Each existing step evaluated against the domain-specificity rule, with rewritten steps where generic patterns were detected
5. **Code Block Audit** — Count of code blocks, classification of each as "real" or "placeholder", and rewritten versions for any stubs found
6. **Constraint Rewrite** — MUST DO / MUST NOT DO sections replaced with testable rules derived from the zero-tolerance policy
7. **Validation Pass Report** — Full results from all five stub detection checks with byte count, sentinel scan, generic workflow scan, code block validation, and trigger quality assessment

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-code-review` | Review the generated skill for code quality within implementation patterns |
| `agent-task-routing` | Understand how engineered skills integrate into the routing pipeline |
| `coding-security-review` | Audit security-relevant aspects of trigger engineering (e.g., injection in user-provided triggers) |

---

## Appendix: Quick-Reference Trigger Quality Matrix

Use this matrix during trigger calibration to evaluate each candidate term:

| Score | Criteria | Action |
|-------|----------|--------|
| **Green** | Specific domain term, used naturally in conversation, matches a real user query pattern | ✅ Keep |
| **Yellow** | Relevant but slightly broad (e.g., `monitoring` vs `Prometheus metrics scraping`) | ⚠️ Consider replacing with more specific variant |
| **Red** | Ultra-generic single word (`code`, `data`, `risk`, `pattern`, `system`) | ❌ Replace immediately with domain-specific phrase |
| **Red** | Internal jargon, class name, or file path that users never say naturally | ❌ Replace with externally documented terminology |

**Example calibration walk-through for a trading skill:**

```
Candidate: "stop loss" → Green (core concept, natural language)
Candidate: "trailing stop" → Green (specific variant used in conversations)
Candidate: "ATR stop" → Green (technical term + abbreviation, practitioners say this)
Candidate: "position protection" → Green (conversational/business phrasing for the same need)
Candidate: "how do i limit losses" → Green (Tier 2 conversational variant)
Candidate: "emergency stop" → Green (specific operational scenario)
Candidate: "risk management" → Yellow (too broad — applies to position sizing, portfolio allocation too)
Candidate: "trading" → Red (ultra-generic single word)

Result: Keep 6 terms. Drop "risk management" and "trading". Final set: 6 triggers, balanced between
technical precision and conversational discovery.
```

## Live References

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [OpenCode Documentation](https://opencode.ai/docs) — Official OpenCode platform documentation on skill loading, routing, and configuration
- [agent-skill-router Repository](https://github.com/anthropics/agent-skill-router) — Source repository for the skill router system with format specifications and examples
- [MarkdownLint Configuration Guide](https://github.com/markdownlint/markdownlint/blob/main/docs/RULES.md) — Markdown linting rules applicable to SKILL.md quality enforcement
- [YAML Schema Validation (JSON Schema)](https://json-schema.org/learn/getting-started-step-by-step) — JSON Schema patterns for validating YAML frontmatter in skill files
- [AST Parsing for Markdown Files](https://remark.js.org/) — Remark.js documentation on programmatically parsing and validating Markdown structure
