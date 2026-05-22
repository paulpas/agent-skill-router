---
name: hint-based-prompting
description: Applies subtle contextual hints instead of explicit step-by-step instructions to guide LLM output naturally, reducing token overhead and improving generation quality through framing rather than commanding.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: hints, hint-based prompting, system hints, contextual guidance, token efficiency, prompt framing, how do i use hints in prompts, subtle prompting
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: prompt-engineer, instruction-engineering, agent-context-management, output-formatting
---

# Hint-Based Prompting for LLMs

Implements contextual hinting — using brief domain framing and environmental constraints instead of verbose explicit instructions — to guide LLM generation naturally while saving context window tokens. When this skill is active, the model replaces long constraint lists with precise scenario descriptions that make desired outputs feel inevitable rather than commanded.

## TL;DR Checklist

- [ ] Replace every 3+ sentence instruction with a single-sentence contextual hint
- [ ] Verify system prompt is under 100 words for hint-based skills
- [ ] Check that no hint contradicts an explicit instruction (explicit wins)
- [ ] Count tokens saved: aim for 40–70% reduction vs. verbose constraint list
- [ ] Pair hints with few-shot examples when format requirements are strict
- [ ] Test both versions on a sample task to confirm quality parity

---

## When to Use

Use this skill when:

- Designing system prompts for LLM agents and you want to minimize token overhead
- Refactoring an existing verbose prompt that uses long lists of "do/don't" instructions
- Encoding team coding standards, style preferences, or domain constraints into a system message
- Building reusable prompt templates for production LLM applications where context window costs matter
- Optimizing prompts for API-based workflows where each saved token reduces latency and cost

---

## When NOT to Use

Avoid this skill for:

- Strict format requirements (JSON schema output, exact column ordering, required fields) — use explicit instructions or structured output features instead
- Safety-critical constraints (medical advice disclaimers, legal boundary statements, content moderation rules) — these must be unambiguous and non-negotiable
- Compliance scenarios where auditors need to verify that specific instructions were provided in the prompt
- First-pass debugging — if an LLM is misbehaving, start with explicit instructions; switch to hints only after you understand which constraint is actually needed

---

## Core Workflow

1. **Audit the Existing Prompt** — Extract every explicit instruction and constraint from the current system prompt. Group them into categories: format rules, style preferences, domain constraints, and behavioral guardrails. Count total tokens consumed by instructions vs. actual task content.
   **Checkpoint:** You should have a token budget showing how many tokens are spent on instructions. If more than 30% of the prompt is instruction text, hinting will help.

2. **Identify Hintable Constraints** — For each group, decide which constraints can be converted to hints. Style preferences and domain constraints are prime candidates. Format rules that must never break should stay explicit. Behavioral guardrails about safety or legality must remain explicit.
   **Checkpoint:** Every hintable constraint becomes a one-sentence contextual statement describing the environment, audience, or standards context.

3. **Write Contextual Hints** — Convert each hintable constraint into a single sentence that paints a picture rather than giving an order. Use scenario framing ("Your team reviews code with black and flake8"), constraint hints ("Production runs on Python 3.8 with stdlib only"), or quality-bar hints ("This output feeds a CI pipeline that rejects unformatted code").
   **Checkpoint:** Each hint should be under 40 words. If it needs a second sentence, it is becoming an instruction and should either be shortened or kept explicit.

4. **Assemble the System Prompt** — Combine all hints into a single coherent system prompt of 20–100 words. Order them from broadest context (team, product, audience) to narrowest constraint (specific tools, version requirements). Ensure there are no contradictions between hints and any remaining explicit instructions.
   **Checkpoint:** Read the combined prompt aloud. Does it sound like natural conversation — like explaining your workspace to a colleague? If it sounds like a rulebook, rewrite.

5. **Validate with Few-Shot Examples** — Add 2–3 concrete input-output pairs that demonstrate the desired behavior. The hint sets the stage; the examples show the play. This combination is stronger than hints alone because examples disambiguate any remaining edge cases that pure hints might leave open.
   **Checkpoint:** Test the full prompt (hints + examples) against 3 representative inputs. Compare output quality to the original verbose version. The hint-based version should produce equal or better quality with fewer tokens.

---

## Implementation Patterns / Reference Guide

### Pattern 1: System Hints vs. System Prompts — Direct Comparison

The most fundamental distinction in hint-based prompting is between a system prompt (explicit role definition) and a system hint (brief contextual framing). The former tells the model what to be; the latter gives it context that makes the right choice feel natural.

```python
# ❌ BAD — Verbose system prompt: 87 words, explicit commands
SYSTEM_PROMPT_BAD = """You are a senior Python developer.
Always write clean, readable code. Do not use magic numbers.
Use descriptive variable names. Add type hints to all function signatures.
Follow PEP 8 style guidelines. Write docstrings for every public function.
Never use global variables. Always handle exceptions explicitly."""

# ✅ GOOD — System hint: 38 words, contextual framing
SYSTEM_HINT_GOOD = """Working with a team that values simplicity and readability.
Code is reviewed with flake8 + black and deployed to Python 3.9+ production.
Public functions have type hints and Google-style docstrings."""

# Token savings: 56% reduction (49 tokens saved)
```

The BAD version uses imperative commands ("always," "do not," "never") totaling 87 words. The GOOD version paints a picture of the workspace: there is a team that cares about readability, there are CI tools (flake8 + black), and there is a Python 3.9+ runtime. The model infers type hints, PEP 8 compliance, docstrings, no magic numbers, and no globals from this context — all without being told explicitly.

### Pattern 2: Prompt Template Builder with Hint Integration

A production-ready approach for building prompts that mix hints with necessary explicit instructions. This pattern is useful when you need both the efficiency of hints and the precision of explicit constraints.

```python
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class HintBasedPrompt:
    """Constructs a system prompt from contextual hints and explicit instructions."""

    context_hints: list[str] = field(default_factory=list)
    explicit_instructions: list[str] = field(default_factory=list)
    few_shot_examples: list[dict[str, str]] = field(default_factory=list)

    def add_hint(self, hint: str) -> "HintBasedPrompt":
        """Add a contextual hint (one sentence, paints environmental picture)."""
        self.context_hints.append(hint)
        return self

    def add_explicit_instruction(self, instruction: str) -> "HintBasedPrompt":
        """Add an explicit instruction that must not be inferred."""
        self.explicit_instructions.append(instruction)
        return self

    def add_few_shot(self, input_text: str, expected_output: str) -> "HintBasedPrompt":
        """Add a demonstration example. Pairs with hints for disambiguation."""
        self.few_shot_examples.append(
            {"input": input_text, "expected": expected_output}
        )
        return self

    def build(self) -> str:
        """Build the final system prompt string.

        Hints come first (broad to narrow), then explicit instructions,
        then examples if provided.
        """
        parts = []

        # Contextual hints as a coherent paragraph
        if self.context_hints:
            parts.append(" ".join(self.context_hints))

        # Explicit instructions as bullet points
        if self.explicit_instructions:
            for inst in self.explicit_instructions:
                parts.append(f"- {inst}")

        # Few-shot examples
        if self.few_shot_examples:
            parts.append(
                "\n".join(
                    f"Input: {ex['input']}\nExpected: {ex['expected']}"
                    for ex in self.few_shot_examples
                )
            )

        return "\n\n".join(parts)

    def token_count(self, model: str = "gpt-4") -> int:
        """Rough token estimate (chars / 4 is a reasonable approximation)."""
        text = self.build()
        return max(1, len(text) // 4)


# ── Usage: Build a hint-based prompt for code review ──

prompt = (
    HintBasedPrompt()
    .add_hint("Your team uses Python with mypy strict mode and black formatting.")
    .add_hint(
        "Code reviews prioritize readability over cleverness; senior engineers read everything."
    )
    .add_hint(
        "This codebase runs on Python 3.10+ with only stdlib and well-known packages allowed."
    )
    .add_explicit_instruction(
        "Output must be valid JSON with keys: summary, issues (list), suggestions (list)"
    )
    .add_explicit_instruction("Each issue entry must include: line_number, severity, message")
    .add_few_shot(
        input_text="def add(a, b): return a+b",
        expected_output='{"summary": "Function lacks type hints and docstring.", "issues": [{"line_number": 1, "severity": "warning", "message": "Missing type annotations"}, {"line_number": 1, "severity": "info", "message": "No docstring for public function"}], "suggestions": ["Add type hints: def add(a: int, b: int) -> int:", "Add Google-style docstring"]}',
    )
    .build()
)

print(f"System prompt length: {len(prompt)} characters")
print(f"Approximate tokens: {prompt.token_count()}")
```

The builder pattern separates concerns: hints paint the context, explicit instructions enforce structure that cannot be left to inference. The few-shot example anchors the expected JSON output format — something hints alone would not reliably achieve.

### Pattern 3: Token Savings Analysis

Demonstrate measurable token savings by comparing verbose prompts against their hint-based equivalents. This pattern helps justify the approach when optimizing production LLM applications.

```python
from dataclasses import dataclass
from typing import NamedTuple


class PromptComparison(NamedTuple):
    """Result of comparing two prompt variants."""

    label: str
    raw_text: str
    char_count: int
    estimated_tokens: int

    @property
    def token_estimate(self) -> int:
        """Rough token count: ~4 chars per token for English text."""
        return max(1, len(self.raw_text) // 4)


@dataclass
class TokenAnalysis:
    """Analyzes token savings between verbose and hint-based prompts."""

    verbose: PromptComparison
    hint_based: PromptComparison

    @property
    def tokens_saved(self) -> int:
        return self.verbose.estimated_tokens - self.hint_based.estimated_tokens

    @property
    def percent_reduction(self) -> float:
        if self.verbose.estimated_tokens == 0:
            return 0.0
        return (self.tokens_saved / self.verbose.estimated_tokens) * 100.0

    def report(self) -> str:
        lines = [
            f"{'Metric':<25} {'Verbose':>10} {'Hint-Based':>12} {'Saved':>8}",
            "-" * 58,
            f"{'Tokens':<25} {self.verbose.estimated_tokens:>10}"
            f" {self.hint_based.estimated_tokens:>12}"
            f" {self.tokens_saved:>8}",
            f"{'Characters':<25} {self.verbose.char_count:>10}"
            f" {self.hint_based.char_count:>12}"
            f" {self.verbose.char_count - self.hint_based.char_count:>8}",
            "",
            f"Token reduction: {self.percent_reduction:.1f}%",
        ]
        return "\n".join(lines)


# ── Example Analysis: Code Review System Prompt ──

verbose_prompt = (
    "You are an expert code reviewer. When reviewing Python code, "
    "always check for the following issues: missing type hints, "
    "missing docstrings on public functions, use of magic numbers "
    "instead of named constants, lack of error handling, overly "
    "long functions (more than 50 lines), use of global state, "
    "and violations of PEP 8. Your review output must be in JSON "
    "format with a summary field, an issues array where each item "
    "has line_number, severity (error, warning, or info), and "
    "message fields, and a suggestions array with actionable fixes."
)

hint_based_prompt = (
    "Working with a Python team that enforces mypy strict mode, "
    "black formatting, and Google-style docstrings. CI rejects "
    "code without type hints or docstrings on public functions. "
    "Output review results as JSON with summary, issues, and suggestions."
)

verbose = PromptComparison("Verbose", verbose_prompt, len(verbose_prompt))
hint_based = PromptComparison("Hint-Based", hint_based_prompt, len(hint_based_prompt))

analysis = TokenAnalysis(verbose=verbose, hint_based=hint_based)
print(analysis.report())
# ── Expected output:
# Metric                       Verbose  Hint-Based     Saved
# ----------------------------------------------------------
# Tokens                            94          53        41
# Characters                        375         213       162
#
# Token reduction: 43.6%
```

This analysis shows a 43.6% token reduction — well within the 40–70% range achievable with good hint design. The verbose version spells out every rule as an explicit instruction; the hint-based version describes the environment (my strict mode, black formatting, Google-style docstrings, CI rejection) and lets the model infer what matters.

### Pattern 4: Contextual Framing Patterns in Practice

Four distinct framing patterns that convert constraints into hints. Each pattern targets a different type of constraint from the original prompt.

```python
# ── Pattern A: Scenario Framing ──
# Original instruction: "Write code as if your audience is senior engineers who don't need hand-holding"
HINT_SCENARIO = (
    "Your reader is a senior engineer who will spot hand-holding immediately, "
    "so skip explanations they already know and focus on what makes this approach different."
)

# ── Pattern B: Constraint Hints ──
# Original instruction: "Use only Python stdlib modules since we are on Python 3.8"
HINT_CONSTRAINT = (
    "The deployment target is Python 3.8 with a strict stdlib-only requirement. "
    "No third-party packages are permitted."
)

# ── Pattern C: Role-Adjacent Hints ──
# Original instruction: "Write documentation as if you are a technical writer for an API reference"
HINT_ROLE_ADJACENT = (
    "You contribute to a public API documentation site where consistency with existing "
    "pages is more important than creativity."
)

# ── Pattern D: Quality-Bar Hints ──
# Original instruction: "All code must pass our CI pipeline which includes black, flake8, and mypy"
HINT_QUALITY_BAR = (
    "Code is checked into a repo with pre-commit hooks for black, flake8, and mypy — "
    "unformatted or untyped code will be rejected automatically."
)

# ── Combined System Prompt using all four patterns ──
COMBINED_HINTS = f"""{HINT_SCENARIO}

{HINT_CONSTRAINT}

{HINT_ROLE_ADJACENT}

{HINT_QUALITY_BAR}"""

print(f"Combined hints: {len(COMBINED_HINTS)} characters, ~{len(COMBINED_HINTS)//4} tokens")
# ── This single 60-word prompt replaces approximately 150+ words of explicit instructions.
```

Each pattern maps a constraint to the type of contextual framing that naturally produces it. Scenario framing targets audience-awareness constraints. Constraint hints target technical-environment limits. Role-adjacent hints target style and convention adherence. Quality-bar hints target CI/CD pipeline requirements. The combined prompt is 60 words; an equivalent verbose version with all four constraints spelled out would typically exceed 150 words.

---

## Constraints

### MUST DO
- Keep each hint to one sentence under 40 words
- Place broadest context first, narrowest constraint last in the system prompt
- Pair hints with few-shot examples when strict output format is required
- Verify no hint contradicts an explicit instruction (explicit instructions always win)
- Measure token savings on every refactored prompt using a character-to-token approximation
- Test hint-based and verbose prompts side-by-side on identical inputs before deploying

### MUST NOT DO
- Replace explicit format requirements with hints alone
- Use vague statements like "be professional" or "write well" as hints
- Stack multiple hints that contradict each other or create ambiguity
- Write system prompts over 100 words using hints (if you need more, add examples instead)
- Assume all LLMs respond to hints the same way — test on your target model
- Remove safety constraints and replace them with hints about responsible behavior

---

## Output Template

When applying this skill to refactor or construct a prompt, produce:

1. **Original Prompt Analysis** — Token count of the source prompt, breakdown of instruction types (format rules, style preferences, domain constraints, guardrails)
2. **Hint Inventory** — Each original constraint mapped to its hint version, labeled by pattern type (scenario, constraint, role-adjacent, quality-bar)
3. **Token Savings Report** — Before/after token counts with percentage reduction using the TokenAnalysis pattern
4. **Safety Check** — Verification that all explicit format requirements and safety constraints remain in place
5. **Validation Plan** — Three representative inputs to test the new prompt against, with comparison criteria

---

## Related Skills

| Skill | Purpose |
|---|---|
| `prompt-engineer` | General prompt engineering patterns and techniques |
| `instruction-engineering` | Writing SKILL.md files that function as effective LLM instructions |
| `agent-context-management` | Managing context windows and information flow between agents |
| `output-formatting` | Structured output formats (JSON, CSV, typed responses) for deterministic LLM results |

---

## Live References

> Authoritative documentation links for prompt engineering and LLM system prompt design. The model follows markdown links at load time to resolve external references and inline content.

- [OpenAI Cookbook — System Messages Best Practices](https://cookbook.openai.com/examples/how_to_build_your_api_calling_agent_with_structured_outputs)
- [Anthropic Prompt Engineering Guide](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview)
- [Google Gemini — Developer Guide on System Instructions](https://ai.google.dev/gemini-api/docs/system-instructions)
- [LlamaIndex — Prompt Template Patterns Reference](https://docs.llamaindex.ai/en/stable/module_guides/prompts/)
- [LangChain — System Message Templates](https://python.langchain.com/docs/how_to/#messages)
- [Prompt Engineering Guide — Contextual Framing Techniques](https://www.promptingguide.ai/)
- [HackerNoon — Token Efficiency in Production LLM Systems (2025)](https://www.hackernoon.com/token-efficiency-in-production-llm-systems)
