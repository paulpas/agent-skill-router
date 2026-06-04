---




name: instruction-engineering
description: Crafts precise, domain-specific instructions within SKILL.md files that
  reliably guide AI behavior through structured constraint blocks, few-shot examples,
  and explicit fallback routing for every decision branch.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  triggers: instruction engineering, prompt design, skill instructions, how do i write better instructions, AI behavior guidance, constraint blocks, few-shot examples, guard clauses for skills better instructions
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
  - code
  - guidance
  - examples
  - do-dont
  related-skills: skill-composition, skill-ecosystem-design, agent-context-management




---




# Instruction Engineering for AI Skills

Crafts precise, domain-specific instructions within SKILL.md files that reliably steer AI model behavior. When loaded, this skill makes the model act as a senior technical writer and behavioral architect — analyzing existing skill content for ambiguity, rewriting generic workflows into concrete step-by-step procedures with real code, designing constraint blocks that enforce quality standards, and embedding fallback routing so every decision branch has an explicit error path. This skill is the meta-skill about writing SKILL.md files that work as intended on first load.

## TL;DR Checklist

- [ ] Audit every workflow step — replace generic verbs ("assess", "evaluate") with domain-specific operations
- [ ] Embed at least one BAD vs. GOOD example pair per implementation skill to show contrast
- [ ] Write constraints as short imperative sentences, not explanations — rules belong in MUST DO/MUST NOT DO
- [ ] Add **Checkpoint** notes after every step where verification is critical before proceeding
- [ ] Design explicit fallback paths for each branching decision (no silent fall-through)
- [ ] Reference `code-philosophy` (5 Laws of Elegant Defense) when instruction logic involves data flow decisions
- [ ] Validate file size ≥ 3000 bytes and at least 2 fenced code blocks with real implementations

---

## When to Use

Use this skill when:

- Reviewing a newly drafted SKILL.md that feels too generic, thin, or abstract — inject domain-specific detail
- A skill's workflow steps read like "Identify use case → Apply pattern → Validate" and need concrete operations instead
- Adding constraint blocks (MUST DO / MUST NOT DO) to enforce non-negotiable behavior rules
- Designing fallback routing for a decision point that currently has no error path defined
- Auditing an existing skill portfolio for stub patterns, placeholder code, or trigger overlap between siblings
- Writing instructions for a new domain where the model needs explicit guard rails to avoid hallucination

---

## When NOT to Use

Avoid this skill for:

- Implementing domain logic itself (e.g., writing trading algorithms, Kubernetes manifests) — use the relevant implementation skill directly
- Configuring runtime routing infrastructure or confidence scoring — use `agent-skill-router-system` instead
- Managing versioning, lifecycle, or retirement of individual SKILL.md files — use `coding-skill-lifecycle-management` instead
- Single-skill tasks where a brief description is sufficient — do not add instruction engineering overhead for simple one-shot operations

---

## Core Workflow

The instruction engineering process transforms raw domain knowledge into reliably-executable AI behavior. Every skill goes through five transformation passes: **Audit → Structure → Enforce → Example → Validate**.

1. **Audit for Generic Language** — Scan the entire document for placeholder verbs and abstract nouns that could describe any domain: "assess", "evaluate", "determine", "apply the pattern", "validate results". For each instance, replace it with the exact operation the model must perform.
   - ❌ `Assess market conditions before placing a stop` → ✅ `Calculate 14-period ATR and compare against the 30-day moving average band; if ATR exceeds 2x the 30-day median, widen the trailing multiplier to 3.0`
   - ❌ `Apply the appropriate pattern for the situation` → ✅ `If the signal is a crossover above the upper Bollinger Band AND RSI > 70, select mean-reversion short; otherwise select trend-following long`

   **Checkpoint:** Run the "Stranger Test" — if someone unfamiliar with your domain reads each instruction, can they execute it without guessing? If any step requires guessing, rewrite it.

2. **Structure as Decision Trees** — Map every branching point in the workflow to an explicit if/then/else structure. For each branch, specify: the decision criterion, the action for each outcome, and the fallback if neither condition is met. Never leave a conditional with implicit fall-through.
   ```
   Workflow Pattern Template:

   Step X — [Action description]
       ├─ IF [condition A] → [action for A] → continue to step Y
       ├─ IF [condition B] → [action for B] → skip to step Z
       └─ ELSE (neither matches) → [fallback action] → log reason, proceed to step Y
       
   **Checkpoint:** Every branch has exactly one documented fallback. No silent defaults.
   ```

   **Checkpoint:** Draw the full decision tree before writing code. If any edge lacks a labeled outcome, the instruction is incomplete.

3. **Define Constraint Blocks** — Write two tables: MUST DO (positive rules) and MUST NOT DO (anti-patterns). Rules must be short imperative sentences — no explanations. Explanations belong in the Core Workflow or Implementation Patterns sections.
   - Each rule should be independently testable: you should be able to scan a generated output and say "this rule was/is violated"
   - Avoid "follow best practices" type rules — they are untestable and therefore meaningless
   - Include at least 5 constraints per block for implementation skills

4. **Embed Few-Shot Examples** — For every pattern that has an obvious wrong way to implement it, write a BAD vs. GOOD pair. The BAD example should demonstrate the most common failure mode specific to that domain, not a generic placeholder.

   ```
   Example Structure:
   ### ❌ BAD — [Specific failure mode]
   # Code showing the anti-pattern with comment explaining what's wrong
   
   ### ✅ GOOD — [Correct approach]  
   # Working code demonstrating the right pattern with docstring
   ```

   **Checkpoint:** The BAD example should be realistic enough that a junior developer or first-time model could produce it. If the BAD looks obviously absurd, the contrast is too weak to teach.

5. **Validate Against Quality Signals** — Before considering the skill complete, run these checks:
   - File size ≥ 3000 bytes of content (excluding YAML frontmatter)
   - At least 2 fenced code blocks with substantive implementations (not `pass` or `return {}`)
   - No occurrence of placeholder stub text (e.g., "implementing this specific pattern") or sentinel phrases
   - Core Workflow has ≥ 5 numbered steps, each with domain-specific content
   - Triggers include both technical terms and at least one conversational variant ("how do I...")

   **Checkpoint:** Run `./scripts/validate_skill.sh` against the file. Fix any failures before considering the skill published.

---

## Instruction Design Patterns / Reference Guide

### Pattern 1: Structured Guidance Blocks

Use structured YAML-like blocks to encode decision logic that models can parse quickly. These are especially effective for configuration-heavy skills where parameters change based on context.

```python
# Pattern: Encode domain rules as structured data the model reads at instruction time
# This teaches the model NOT to guess parameter values — read them from explicit config

TRAILING_STOP_CONFIG = {
    "trending_market": {
        "atr_multiplier": 2.5,          # Wider trail for trending (lets profits run)
        "min_distance_pct": 0.03,       # Never tighten below 3%
        "recompute_interval_minutes": 15,
        "fallback_if_atr_missing": "fixed_pct",
    },
    "ranging_market": {
        "atr_multiplier": 1.5,          # Tighter trail for ranging (protects gains)
        "min_distance_pct": 0.015,
        "recompute_interval_minutes": 30,
        "fallback_if_atr_missing": "support_resistance",
    },
    "high_volatility": {
        "atr_multiplier": 4.0,          # Wide trail to avoid stop-hunting in volatility spikes
        "min_distance_pct": 0.05,
        "recompute_interval_minutes": 5,  # More frequent recalculation during chaos
        "fallback_if_atr_missing": "volatility_adjusted",
    },
}

def select_trailing_config(regime: str) -> dict:
    """Return trailing stop config for the given market regime.
    
    Falls back to 'trending_market' defaults if an unrecognized regime is requested,
    because being too aggressive in unknown conditions causes more harm than being conservative.
    """
    config = TRAILING_STOP_CONFIG.get(regime)
    if config is None:
        # Explicit fallback — never use hardcoded magic numbers
        return TRAILING_STOP_CONFIG["trending_market"]
    return dict(config)  # Return a copy to prevent mutation
```

**Why this works:** The model reads the config as instruction, not as code to execute. It learns the domain rules (wider trails for trending, tighter for ranging) without needing to implement them from scratch. When writing skills, put these configurations in the Implementation Patterns section so they serve both as reference AND as copy-paste templates.

### Pattern 2: Constraint Enforcement with Guard Clauses

Guard clauses at the beginning of workflow descriptions prevent the model from proceeding with invalid assumptions. Each guard maps directly to a MUST NOT DO rule.

```python
# Pattern: Pre-condition checks that mirror MUST NOT DO constraints
# This creates a feedback loop between rules and enforcement

class SkillInstructionValidator:
    """Validates that generated skill content meets quality thresholds."""
    
    def __init__(self, min_file_size: int = 3000, min_code_blocks: int = 2):
        self.min_file_size = min_file_size
        self.min_code_blocks = min_code_blocks
    
    def validate_workflow(self, steps: list[str]) -> dict[str, bool]:
        """Check that each workflow step is domain-specific, not generic."""
        GENERIC_VERBS = {
            "assess", "evaluate", "determine", "analyze", "apply the pattern",
            "validate results", "iterate based on", "implement the feature"
        }
        
        results = {}
        for i, step in enumerate(steps):
            step_lower = step.lower()
            has_generic = any(verb in step_lower for verb in GENERIC_VERBS)
            
            # Rule: Every step must name at least one domain-specific operation
            # e.g., "calculate ATR" is specific; "assess conditions" is not
            has_domain_operation = (
                any(marker in step_lower for marker in [
                    "calculate", "compute", "apply .* formula", "check.*condition",
                    "return", "raise", "assert", "log", "submit", "query",
                    "parse", "extract", "filter", "transform"
                ]) or
                # Steps with code blocks are assumed to have domain operations
                any("```" in step for _ in [1])
            )
            
            results[f"step_{i+1}"] = not (has_generic and not has_domain_operation)
        
        return {
            "all_steps_specific": all(results.values()),
            "violations": [k for k, v in results.items() if not v],
        }
    
    def validate_file(self, content: str, markdown_content: str) -> dict[str, bool]:
        """Run the full quality gate before considering a skill ready."""
        checks = {}
        
        # Size check — prevents stub skills
        checks["adequate_size"] = len(markdown_content.encode()) >= self.min_file_size
        
        # Code block density — ensures implementation depth
        code_block_count = markdown_content.count("```") // 2
        checks["has_code_examples"] = code_block_count >= self.min_code_blocks
        
        # Stub sentinel check — the killer pattern
        checks["no_stub_sentinel"] = (
            "Implementing this specific" not in content and
            "Implementing this feature" not in content and
            "return pass" not in content.lower()
        )
        
        # Guard clause presence — shows enforceable constraints exist
        has_must_do = "### MUST DO" in markdown_content or "**MUST DO**" in markdown_content
        has_must_not_do = "### MUST NOT DO" in markdown_content or "**MUST NOT DO**" in markdown_content
        checks["has_constraint_blocks"] = has_must_do and has_must_not_do
        
        return checks


# Usage example: validating a drafted skill before publishing
draft_skill_content = open("skills/trading/my-skill/SKILL.md").read()
markdown_section = draft_skill_content.split("---", 2)[-1] if "---" in draft_skill_content else draft_skill_content

validator = SkillInstructionValidator(min_file_size=3000, min_code_blocks=2)
workflow_result = validator.validate_workflow([
    "Assess market conditions before placing a stop",       # ❌ generic
    "Calculate 14-period ATR and compare against band",     # ✅ specific
    "Apply the pattern for this situation",                 # ❌ generic placeholder
    "Submit stop order with trailing multiplier of 2.0",   # ✅ specific
])
file_result = validator.validate_file(draft_skill_content, markdown_section)

print(f"Workflow quality: {workflow_result}")
print(f"File quality:     {file_result}")
```

### Pattern 3: Few-Shot Prompting Within Skills

Embed contrasting examples that teach the model through comparison. Each pair should target one specific anti-pattern that occurs frequently in this domain.

```python
# === PAIR 1: Constraint specificity ===
# ❌ BAD — untestable, vague constraint
MUST DO rules:
  - Follow best practices for code quality
  - Handle errors appropriately
  - Write clean, maintainable code
  
# Why this fails: The model cannot verify compliance. "Best practices" and 
# "appropriate" are undefined. A naive developer following these rules could 
# still produce buggy code and claim they followed the instructions.

# ✅ GOOD — testable, specific constraints
MUST DO rules:
  - Use typed function signatures with docstrings on every public function
  - Include guard clauses at the top of functions for empty/None/null inputs
  - Never use bare `except:` or `except Exception` without logging the cause
  - Keep cyclomatic complexity below 10 — decompose anything larger

# Why this works: Each rule is independently testable. You can scan any output 
# and mark it as compliant or non-compliant for each specific rule.


# === PAIR 2: Workflow step specificity ===
# ❌ BAD — generic template that applies to nothing specific
Core Workflow:
  1. Identify the task requirements — Gather context about what needs to be done.
  2. Apply the appropriate technique — Use the method suited for the situation.
  3. Validate and test the result — Verify everything works correctly before proceeding.
  4. Iterate based on observed results — Refine the approach if outcomes are unsatisfactory.

# Why this fails: These steps describe ANY programming task. They teach nothing 
# about what makes THIS skill's domain unique. A reader could swap these into 
# any other SKILL.md without changing a word.

# ✅ GOOD — domain-specific operations with checkpoints
Core Workflow:
  1. **Extract signal from market data** — Query the OHLCV feed for the requested 
     symbol and timeframe. Compute the EMA(9) and EMA(21). Record their crossover point 
     (bullish when EMA(9) crosses above EMA(21), bearish when it crosses below).
     **Checkpoint:** Both EMAs must be computed on the same candle frequency as the input data.

  2. **Validate signal against volume filter** — At the crossover candle, check that 
     volume exceeds the 20-period moving average of volume by at least 1.5x. If not, 
     discard the signal and log the reason.
     **Fallback:** If volume data is unavailable, use a price-action confirmation instead 
     (close within top 25% of candle range).

  3. **Calculate entry parameters** — Use ATR(14) to determine stop distance:
     long_stop = entry_price - (ATR * 2.0)
     short_stop = entry_price + (ATR * 2.0)
     Calculate position size using risk_per_trade / stop_distance.
```

### Pattern 4: Fallback and Escalation Instructions

Every decision point in a skill's workflow must have an explicit fallback path. This is the most commonly omitted element in poorly-written skills — models default to their training priors when no guidance exists, which leads to inconsistent outputs.

```python
# Pattern: Decision tree with explicit fallback routing
# Each branch has exactly one documented path forward

DECISION_FLOW = {
    "step": "select_risk_method",
    "decision_criterion": "Is ATR data available for the requested symbol?",
    "branches": {
        "yes_atr_available": {
            "action": "Use ATR-based stop calculation with multiplier from market regime config",
            "fallback_if_calculation_fails": "Fall back to percentage-based (2.0% of position value)",
        },
        "no_atr_available": {
            "action": "Use percentage-based stop loss at 2.5% below entry for longs, above for shorts",
            "note": "Percentage stops are less adaptive but better than guessing",
            "fallback_if_data_missing": "Abort trade — log 'insufficient market data' and skip position",
        },
    },
}


# Pattern: Escalation chain for high-stakes decisions
# When a skill produces low-confidence output, escalate rather than proceed

def apply_instruction_escalation(
    skill_output: dict,
    confidence_score: float,
    escalation_threshold: float = 0.6,
) -> dict:
    """Escalate low-confidence skill outputs through a defined chain.
    
    This pattern ensures the model never blindly trusts its own weak output.
    
    Args:
        skill_output: The raw output from the primary skill execution
        confidence_score: Self-assessed confidence (0.0-1.0)
        escalation_threshold: Below this score, trigger escalation
        
    Returns:
        Escalated result with metadata about what actions were taken
    """
    if confidence_score >= escalation_threshold:
        # Normal path — proceed with output as-is
        return {
            **skill_output,
            "escalation_applied": False,
            "confidence": confidence_score,
        }
    
    # Low confidence — apply escalating safeguards
    
    if confidence_score >= 0.4:
        # Level 1: Add disclaimer and suggest manual review
        return {
            **skill_output,
            "escalation_applied": True,
            "escalation_level": "disclaimer",
            "confidence": confidence_score,
            "warning": (
                "Low confidence output — recommend human review before execution. "
                f"Primary confidence: {confidence_score:.2f}"
            ),
        }
    
    # Level 2: Reject and provide structured guidance instead of weak output
    if confidence_score >= 0.2:
        return {
            **skill_output,
            "escalation_applied": True,
            "escalation_level": "guidance_only",
            "confidence": confidence_score,
            "action": "providing_instructional_guidance",
            "note": (
                "Confidence too low for actionable output. Providing structural guidance "
                "instead of specific recommendations."
            ),
        }
    
    # Level 3: Abort — the skill cannot provide value in this context
    return {
        **skill_output,
        "escalation_applied": True,
        "escalation_level": "abort",
        "confidence": confidence_score,
        "action": "abort_and_redirect",
        "note": (
            "Insufficient information to proceed. Redirect to a broader skill or request "
            "additional input parameters."
        ),
    }


# Pattern: Explicit fallback for missing domain knowledge
# When the model encounters an unfamiliar domain, it should admit ignorance 
# rather than hallucinate

def handle_unknown_domain(
    requested_skill: str,
    available_skills: list[str],
) -> str:
    """Return a structured response when a skill operates outside its training domain.
    
    This prevents hallucination by providing a clear protocol for unknown domains:
    1. Acknowledge the gap explicitly
    2. Suggest the closest available alternative from known skills
    3. Request additional context to narrow the problem
    
    Args:
        requested_skill: The skill the user asked about
        available_skills: List of skills in the current repository
        
    Returns:
        Structured fallback response
    """
    # Step 1: Acknowledge the gap (never pretend knowledge you don't have)
    unknown_response = f"""
I don't have specific expertise for `{requested_skill}`. Here's what I can do instead:

1. **Closest match from available skills:** 
   {available_skills[0] if available_skills else 'None found — request a broader skill set'}

2. **Request additional context:** To help narrow this down, please provide:
   - The specific problem you're trying to solve
   - Any error messages or symptoms you've observed
   - Your preferred technology stack or constraints

3. **General guidance framework:** If none of the above is relevant, I can provide 
   general problem-solving structure for debugging and analysis.
"""
    return unknown_response.strip()
```

---

## The Stub Trap: Recognition and Prevention

This section is unique to instruction engineering. It covers how to distinguish a high-quality SKILL.md from a stub that corrupts the router index and harms AI performance. Understanding these patterns at an intuitive level prevents creating or publishing defective skills.

### What Makes a Good SKILL.md vs. a Stub

A good skill teaches **domain-specific operational knowledge**. A stub teaches nothing and wastes context tokens. The difference is not about word count — it's about specificity density.

| Signal | Good Skill | Stub |
|--------|-----------|------|
| Workflow steps | Names exact calculations, formulas, thresholds | Uses verbs like "assess", "evaluate", "determine" |
| Code examples | Real functions with typed signatures and docstrings | `pass`, `return {}`, empty function bodies |
| Constraints | "Use ATR(14) multiplier of 2.0 for trending markets" | "Follow best practices" or "Handle errors appropriately" |
| Triggers | "ATR stop, trailing stop, how do i limit losses" | "risk", "code", "pattern" (too broad to be useful) |
| File size | ≥ 3000 bytes with substantive content | Under threshold, mostly template scaffolding |
| BAD/GOOD pairs | Realistic failure modes specific to the domain | Either missing or showing obviously absurd examples |

### The Three Stages of Stub Degradation

**Stage 1: Template Skeleton** — The skill has proper frontmatter and section headings but content consists only of placeholder descriptions.

```markdown
## Core Workflow

1. **Identify the task requirements** — Gather context about what the user needs.
2. **Apply the appropriate technique** — Use the method suited for the situation.
3. **Validate and test the result** — Verify everything works correctly before proceeding.
4. **Iterate based on observed results** — Refine the approach if outcomes are unsatisfactory.
```

This is immediately rejected. These steps describe ANY programming task and teach nothing about the specific domain.

**Stage 2: Thin Domain Fill** — The skeleton has been filled with domain words, but the operations remain vague.

```markdown
## Core Workflow

1. **Analyze the market** — Check current conditions and determine if trading is appropriate.
2. **Apply risk management** — Use stop loss strategies to protect capital.
3. **Monitor performance** — Track P&L and adjust as needed.
4. **Document outcomes** — Record results for future reference.
```

This passes a naive word-count check but fails the "Stranger Test". A junior trader reading this still wouldn't know what formulas to calculate or thresholds to use. The instruction is domain-flavored but not domain-specific.

**Stage 3: Instruction-Grade Content** — Each step names exact operations, thresholds, and fallbacks.

```markdown
## Core Workflow

1. **Extract ATR(14) from the 1-hour OHLCV feed** — Compute true ranges for each candle over the last 14 periods, then take the exponential moving average. Compare against the 30-period median ATR: if current ATR > 2x median, mark as high-volatility regime.
   
   **Checkpoint:** If OHLCV data is unavailable or has fewer than 14 candles, fall back to percentage-based stop loss at 3% of entry price.

2. **Calculate position size** — Using account balance and risk_per_trade_pct (default 0.01 for 1%), compute:
   dollar_risk = balance * risk_per_trade_pct
   stop_distance = atr * atr_multiplier
   shares = dollar_risk / stop_distance
```

This is the target state. Every sentence contains information that cannot be substituted without changing the skill's domain identity.

### How to Audit Your Own Work

Before publishing any SKILL.md, run this three-pass audit:

**Pass 1 — The Stranger Test (5 minutes)**
Read every workflow step as if you have zero domain knowledge. Can you execute it? If any step makes you think "I need to know more to do this," that step is too vague. Rewrite it with exact operations.

**Pass 2 — The Substitution Test (3 minutes)**
Replace the skill name with another skill's name in each workflow step and constraint. If the result reads equally well for the other skill, your instructions are not domain-specific enough.

**Pass 3 — The Stub Sentinel Scan (1 minute)**
Search for these patterns:
- `Implementing this specific` or `implementing the`
- `pass` statements in code blocks
- `return {}` or empty function bodies
- Generic verbs as step names: "assess", "evaluate", "determine"
- Single generic trigger terms: `code`, `data`, `risk`, `pattern`, `feature`

If you find any, fix them before proceeding.

---

## Constraints

### MUST DO
- Write workflow steps with specific domain operations — name exact calculations, formulas, thresholds, and data sources; never use verbs like "assess", "evaluate", or "determine" without the concrete action they refer to
- Include at least one BAD vs. GOOD example pair for every implementation skill, demonstrating realistic failure modes not obviously absurd caricatures
- Define explicit fallback paths for every branching decision — no silent fall-through, no implicit defaults; each branch must have exactly one documented alternative path
- Add **Checkpoint** notes after steps where verification prevents downstream errors — these are the moments where the model must stop and confirm before proceeding
- Reference `code-philosophy` (5 Laws of Elegant Defense) when instruction logic involves data flow decisions, particularly Law 1 (Early Exit) for guard clauses and Law 4 (Fail Fast) for constraint enforcement
- Write constraints as short, independently testable imperative sentences — avoid "follow best practices" type rules that cannot be verified against output
- Include at least 2 fenced code blocks with substantive implementations on typed signatures; every function must have docstrings explaining its contract

### MUST NOT DO
- Use placeholder verbs ("assess", "evaluate", "determine") as the primary description of a workflow step without following them with the exact operation
- Write stub content: `pass` bodies, `return {}`, or functions that immediately raise NotImplementedError — these are the signature patterns of deleted skills
- Leave any decision branch without a documented fallback — silent fall-through causes inconsistent model behavior and is the most common failure mode in poorly-written skills
- Use generic trigger terms like "code", "data", "risk", or "pattern" alone — they cause false-positive activations across unrelated conversations
- Copy structure from SKILL_FORMAT_SPEC.md or AGENTS.md without adding domain-specific content — structural alignment does not substitute for teaching real expertise
- Write constraints as explanations or justifications — the rule IS the constraint. Reasons belong in the workflow description, not in the MUST DO/MUST NOT DO tables

---

## Related Skills

| Skill | Purpose |
|---|---|
| `skill-composition` | Designs multi-skill workflows; this skill ensures each individual skill within a composition is well-instructed |
| `skill-ecosystem-design` | Organizes skills into networks; this skill ensures the content quality of each node in that network |
| `agent-context-management` | Manages what information is visible to the model at runtime; instruction engineering determines what information gets written into skills in the first place |

---

## Live References

> Authoritative documentation on prompt design, AI behavior control, and structured instruction patterns.

- [Prompt Engineering Guide (Brex)](https://www.promptingguide.ai/) — Comprehensive guide to prompt techniques including few-shot, chain-of-thought, and constraint-based prompting
- [Anthropic Prompt Engineering Documentation](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering) — Practical guidance for writing instructions that reliably produce desired behavior from language models
- [Google Generative AI — Prompting Best Practices](https://ai.google.dev/gemini-api/docs/prompting-strategies) — Strategies for structuring prompts with clear role definitions, examples, and constraints
- [OpenAI Cookbook — System Messages](https://github.com/openai/openai-cookbook/blob/main/examples/How_to_format_inputs_to_ChatGPT_models.ipynb) — Practical patterns for system-level instructions that shape model behavior consistently
- [Prompt Engineering for AI Agents (LangChain)](https://python.langchain.com/docs/concepts/prompt_templates/) — Techniques specific to agent systems where prompts drive tool selection and execution routing
- [Structured Output Patterns (Vercel AI SDK)](https://sdk.vercel.ai/docs/foundations/output-formatting) — Methods for constraining model output to predictable schemas, directly applicable to skill instruction design
- [The 5 Laws of Elegant Defense (code-philosophy)](https://github.com/anthropics/code-philosophy) — Internal logic and data flow philosophy that governs how instructions should guide model reasoning
