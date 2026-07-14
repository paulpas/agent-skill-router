---
name: verb-based-instruction-design
description: Decomposes agent instructions into action verbs with explicit success criteria per verb class to eliminate ambiguity and ensure LLMs correctly interpret intended operations.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  role: implementation
  scope: implementation
  output-format: code
  triggers: verb-based instructions, action verbs, prompt semantics, instruction design, ambiguous verbs, how do i write clear prompts, precise instructions
  archetypes: [tactical]
  anti_triggers:
    - brainstorming
    - vague ideation
    - structured output, JSON schema
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  related-skills: prompt-chaining, prompt-engineering-patterns-v2, iterative-prompt-refinement
---

# Verb-Based Instruction Design Pattern

Decomposes agent instructions into action verbs with explicit success criteria per verb class. This skill makes the model design unambiguous instruction templates using a structured grammar of action verbs, eliminating vague terms like "handle" and "process" in favor of precise, measurable operations that LLMs can reliably execute.

## TL;DR Checklist

- [ ] Identify all required operations for the task
- [ ] Map each operation to a specific, unambiguous action verb from the verb matrix
- [ ] Replace vague verbs (handle, process, manage) with precise alternatives
- [ ] Define success criteria per verb class (what does "analyze" mean in context?)
- [ ] Test instruction interpretation against edge cases before deployment
- [ ] Include example inputs/outputs for ambiguous verb combinations
- [ ] Validate that each verb maps to exactly one operation

---

## When to Use

Use this skill when:

- Agent instructions produce inconsistent or unpredictable outputs across runs
- Multiple LLM providers give different results on the same instruction (ambiguity indicator)
- Building production systems where prompt behavior must be deterministic and auditable
- Debugging why an agent performs poorly on specific sub-tasks within a larger workflow
- Onboarding new team members to write prompts that consistently work

## When NOT to Use

Avoid this skill for:

- Simple, single-step instructions with one obvious interpretation
- Creative/freestyle tasks where variation is desired (not a bug)
- Prototyping phases where speed of iteration matters more than precision
- Tasks involving subjective judgment where verb choice doesn't affect outcome significantly

---

## Core Workflow

1. **Task Decomposition** — Break the agent's overall objective into discrete operations. Each operation must be a single, atomic action (e.g., "extract entities," not "analyze and summarize the text"). **Checkpoint:** Each operation should be performable independently without knowledge of other operations' outputs.
2. **Verb Selection from Matrix** — For each operation, select the most precise verb from the verb matrix. Map vague verbs to specific alternatives: "handle" → "validate" or "transform" or "reject"; "process" → "parse" or "aggregate" or "filter." **Checkpoint:** Every selected verb must appear in the approved verb matrix with a defined scope of application.
3. **Success Criteria Definition** — For each verb in context, define what constitutes successful execution. "Extract entities" succeeds when all person/org/location mentions are captured; "Summarize" succeeds when the output is ≤ 20% of original length and contains key points. **Checkpoint:** Each criterion must be objectively measurable, not subject to interpretation.
4. **Instruction Assembly** — Combine verb+criteria pairs into a coherent instruction template. Order operations sequentially (or in parallel groups where dependencies allow). Add transition language between steps. **Checkpoint:** The assembled instruction must contain zero instances of ambiguous verbs (handle, process, manage, deal with, take care of).
5. **Interpretation Validation** — Test the instruction by having a second LLM re-explain what it thinks the instruction means. Compare against the intended operations list. Flag any mismatches for revision. **Checkpoint:** If > 20% of test cases show misinterpretation, revise ambiguous terms.
6. **Versioned Deployment** — Deploy the validated instruction with its verb matrix and success criteria documented alongside. Track which verbs were changed from previous versions and why. **Checkpoint:** Every deployed instruction must have its verb matrix and criteria stored in a versioned configuration file.

---

## Implementation Patterns

### Pattern 1: Verb Selection Matrix

```python
from dataclasses import dataclass
from enum import Enum
from typing import Callable, Optional


class VerbCategory(Enum):
    """Categories of action verbs used in instruction design."""

    # Cognitive operations (understanding input)
    ANALYZE = "analyze"
    CLASSIFY = "classify"
    EXTRACT = "extract"
    SUMMARIZE = "summarize"
    COMPARE = "compare"

    # Transformation operations (modifying data)
    TRANSLATE = "translate"
    REFORMAT = "refactor"  # not "format" — too vague
    AGGREGATE = "aggregate"
    FILTER = "filter"
    SORT = "sort"

    # Generation operations (creating new content)
    GENERATE = "generate"
    PARAPHRASE = "paraphrase"
    SYNTHESIZE = "synthesize"  # different from "generate" — combines multiple sources

    # Evaluation operations (judgment calls)
    VALIDATE = "validate"
    SCORE = "score"
    RANK = "rank"
    APPROVE = "approve"

    # Control operations (workflow management)
    ROUTE = "route"
    ESCALATE = "escalate"
    DELEGATE = "delegate"


@dataclass
class VerbDefinition:
    """A precise definition of an action verb with success criteria.

    Attributes:
        verb: The canonical verb string used in instructions.
        category: The semantic category this verb belongs to.
        description: What this operation actually means in context.
        success_criteria: Objective criteria for successful execution.
        forbidden_outputs: Outputs that indicate the verb was misinterpreted.
    """

    verb: str
    category: VerbCategory
    description: str
    success_criteria: list[str]
    forbidden_outputs: list[str] = None

    def __post_init__(self) -> None:
        if self.forbidden_outputs is None:
            self.forbidden_outputs = []


# Approved verb matrix — only these verbs may be used in instructions
VERB_MATRIX: dict[str, VerbDefinition] = {
    "analyze": VerbDefinition(
        verb="analyze",
        category=VerbCategory.ANALYZE,
        description="Identify structural components and relationships within the input",
        success_criteria=[
            "All major sections or segments are identified by name or role",
            "Relationships between components are explicitly stated",
            "No content is lost — analysis covers 100% of relevant input"
        ],
        forbidden_outputs=["Only mentions keywords without explaining relationships"]
    ),
    "extract": VerbDefinition(
        verb="extract",
        category=VerbCategory.EXTRACT,
        description="Pull specific data points from the input based on defined schema",
        success_criteria=[
            "Each requested field is present in the output",
            "Values are extracted verbatim or with specified transformation applied",
            "Missing values are explicitly marked as null, not inferred"
        ],
    ),
    "validate": VerbDefinition(
        verb="validate",
        category=VerbCategory.VALIDATE,
        description="Check input against a defined set of rules and return pass/fail per rule",
        success_criteria=[
            "Every validation rule is evaluated (no skipped checks)",
            "Results include both the rule name and whether it passed or failed",
            "Failed rules include the specific value that caused the failure"
        ],
    ),
}


def select_verb(operation_name: str) -> Optional[VerbDefinition]:
    """Select the most precise verb from the matrix for a given operation.

    Args:
        operation_name: The natural-language description of the operation
            to find a matching verb for.

    Returns:
        A VerbDefinition if a match is found, None otherwise.
    """
    key = operation_name.lower().strip()
    if key in VERB_MATRIX:
        return VERB_MATRIX[key]

    # Fallback: find closest match by category keywords
    for verb, definition in VERB_MATRIX.items():
        if any(word in definition.description.lower() for word in key.split()):
            return definition

    return None


# BAD — Vague instruction with ambiguous verbs
prompt_bad = "Handle the input and process it to get what we need."
# LLM might extract, summarize, translate, or do anything else. No one knows.

# GOOD — Precise instruction with verb matrix mapping
prompt_good: str = """Analyze: Identify all named entities (persons, organizations, locations) in the text.
Extract: Pull each entity's name and type into a structured format.
Validate: Check that every extracted entity has both name and type fields."""
# LLM knows exactly what to do at each step.
```

### Pattern 2: Instruction Ambiguity Analyzer

```python
from typing import Any


AMBIGUOUS_VERBS: dict[str, list[str]] = {
    "handle": ["analyze", "process", "manage", "respond to"],
    "process": ["parse", "transform", "validate", "route"],
    "manage": ["maintain", "update", "track", "organize"],
    "deal with": ["address", "resolve", "handle", "investigate"],
    "take care of": ["fix", "resolve", "complete", "deliver"],
    "check": ["validate", "verify", "inspect", "review"],  # "check" is too vague
    "look at": ["examine", "analyze", "review"],
    "make sure": ["validate", "ensure", "verify"],
}


def analyze_ambiguity(instruction: str) -> dict[str, Any]:
    """Scan an instruction for ambiguous verbs and suggest replacements.

    Args:
        instruction: The natural-language instruction to scan.

    Returns:
        A dictionary mapping each found vague verb to its position,
        surrounding context, and suggested alternatives.
    """
    findings: dict[str, Any] = {}
    instruction_lower = instruction.lower()

    for vague_verb, alternatives in AMBIGUOUS_VERBS.items():
        if vague_verb in instruction_lower:
            # Find the actual context position
            idx = instruction_lower.index(vague_verb)
            # Get surrounding context (±50 chars)
            start = max(0, idx - 50)
            end = min(len(instruction), idx + len(vague_verb) + 50)
            context = instruction[start:end].strip()

            findings[vague_verb] = {
                "position": idx,
                "context": f"...{context}...",
                "suggested_alternatives": alternatives,
            }

    return findings


def rewrite_instruction(
    original: str,
    replacements: dict[str, list[str]]
) -> str:
    """Replace ambiguous verbs with the first suggested alternative.

    Args:
        original: The original instruction containing vague verbs.
        replacements: A dictionary mapping vague verbs to lists of
            replacement alternatives (ordered by preference).

    Returns:
        The rewritten instruction with vague verbs replaced,
        preserving the original casing style.
    """
    result = original
    for vague_verb, alternatives in replacements.items():
        if alternatives:
            replacement = alternatives[0]
            # Case-preserving replacement
            idx = result.lower().index(vague_verb) if vague_verb in result.lower() else -1
            if idx >= 0:
                original_word = result[idx:idx + len(vague_verb)]
                if original_word[0].isupper():
                    replacement = replacement.capitalize()
                elif original_word.isupper():
                    replacement = replacement.upper()
                result = result[:idx] + replacement + result[idx + len(vague_verb):]
    return result


# Example usage:
instruction = "Handle the user request and process it through the pipeline."
findings = analyze_ambiguity(instruction)
# {"handle": {"position": 0, ...}, "process": {"position": 35, ...}}

rewritten = rewrite_instruction(instruction, findings)
# "Address the user request and parse it through the pipeline."
```

### Pattern 3: Success Criteria Validator

```python
from dataclasses import dataclass, field
from typing import Any, Callable


@dataclass
class ExecutionResult:
    """Captures whether an operation succeeded per its verb's success criteria.

    Attributes:
        verb: The verb that was executed.
        input_size: Character count of the input text.
        output_size: Character count of the output text.
        passed_criteria: List of criteria names that were met.
        failed_criteria: List of criteria names that were not met.
    """

    verb: str
    input_size: int
    output_size: int
    passed_criteria: list[str] = field(default_factory=list)
    failed_criteria: list[str] = field(default_factory=list)

    @property
    def is_valid(self) -> bool:
        """Return True if all criteria passed and at least one was checked."""
        return len(self.failed_criteria) == 0 and len(self.passed_criteria) > 0


class CriteriaValidator:
    """Validates an operation's output against its verb-specific success criteria.

    Provides a registry of custom validators keyed by verb name, plus
    built-in structural checks for common verb categories.
    """

    # Criterion checkers per verb category
    _validators: dict[str, Callable[[Any, Any], tuple[bool, str]]] = {}

    @classmethod
    def register_validator(cls, verb: str, checker: Callable) -> None:
        """Register a custom validator for a specific verb.

        Args:
            verb: The canonical verb string to register under.
            checker: A callable that takes (input_text, output_text)
                and returns (is_valid: bool, reason: str).
        """
        cls._validators[verb] = checker

    @classmethod
    def validate(
        cls,
        verb: str,
        input_text: str,
        output_text: str,
        definition: Optional[VerbDefinition] = None
    ) -> ExecutionResult:
        """Validate output against the verb's success criteria.

        Args:
            verb: The action verb describing what operation was performed.
            input_text: The original input provided to the operation.
            output_text: The output produced by the operation.
            definition: Optional VerbDefinition with custom criteria.

        Returns:
            An ExecutionResult with passed and failed criteria listed.
        """
        passed: list[str] = []
        failed: list[str] = []

        # Default validators based on verb category
        if verb in VERB_MATRIX:
            definition = VERB_MATRIX[verb]

        # Check basic structural criteria
        if not output_text or not output_text.strip():
            return ExecutionResult(
                verb=verb,
                input_size=len(input_text),
                output_size=0,
                failed_criteria=["Output is empty"]
            )

        # Size ratio check (for extract/summarize)
        size_ratio = len(output_text) / max(len(input_text), 1)

        if verb == "extract":
            # Extracted output should not be larger than input
            if size_ratio > 2.0:
                failed.append(f"Output ({size_ratio:.1f}x input size) suggests hallucination")
            else:
                passed.append(f"Output size ratio {size_ratio:.2f}x is reasonable for extraction")

        elif verb == "summarize":
            if size_ratio > 0.3 or size_ratio < 0.05:
                failed.append(f"Summary size ratio {size_ratio:.1%} outside expected range (5%-30%)")
            else:
                passed.append(f"Summary size ratio {size_ratio:.1%} is within bounds")

        # Run custom validators if registered
        if verb in cls._validators:
            valid, reason = cls._validators[verb](input_text, output_text)
            (passed if valid else failed).append(reason)

        return ExecutionResult(
            verb=verb,
            input_size=len(input_text),
            output_size=len(output_text),
            passed_criteria=passed,
            failed_criteria=failed
        )


# Register custom validator for "classify"
def _validate_classification(input_text: str, output_text: str) -> tuple[bool, str]:
    """A classifier must output exactly one category label.

    Args:
        input_text: The original input provided for classification.
        output_text: The output produced by the classifier.

    Returns:
        A tuple of (is_valid, reason_string).
    """
    lines = [l.strip() for l in output_text.strip().split("\n") if l.strip()]
    if len(lines) != 1:
        return False, f"Expected exactly 1 classification label, got {len(lines)}"
    if len(lines[0]) > 50:  # Category names shouldn't be paragraphs
        return False, "Classification output looks like prose, not a label"
    return True, "Single-label classification output format is valid"


CriteriaValidator.register_validator("classify", _validate_classification)
```

### Pattern 4: Interpretation Validation Test

```python
from typing import Any


def validate_instruction_interpretation(
    instruction: str,
    intended_operations: list[str],
    validator_llm: Any,
    n_test_cases: int = 5
) -> dict[str, Any]:
    """Test whether an LLM correctly interprets an instruction by having it re-explain.

    Sends the instruction to a validator LLM and compares its explanation of what
    operations it would perform against the intended operations list. Mismatches
    indicate ambiguous or poorly specified terms.

    Args:
        instruction: The full instruction text to validate.
        intended_operations: List of expected atomic operations.
        validator_llm: An LLM client with a .generate() method that accepts
            an instruction string and returns a response object.
        n_test_cases: Number of independent validation runs to average over.

    Returns:
        A dictionary with match_rate (percentage), total mismatches,
        and up to 5 mismatch detail entries.
    """
    mismatches: list[dict[str, Any]] = []

    for i in range(n_test_cases):
        # Ask the validator LLM to explain what the instruction means
        explanation_prompt = f"""Read this instruction and explain exactly what operations you would perform:

Instruction: {instruction}

List each operation as a numbered step. Do NOT execute — just describe your understanding.
"""
        response = validator_llm.generate(explanation_prompt)
        interpretation = response.choices[0].message.content  # type: ignore[attr-defined]

        # Compare interpretation against intended operations
        for op in intended_operations:
            if op.lower() not in interpretation.lower():
                mismatches.append({
                    "operation": op,
                    "interpretation": interpretation[:200],
                    "test_case": i + 1,
                })

    total_checks = n_test_cases * len(intended_operations)
    match_rate = (total_checks - len(mismatches)) / total_checks if total_checks > 0 else 0

    return {
        "n_test_cases": n_test_cases,
        "n_intended_operations": len(intended_operations),
        "mismatches": len(mismatches),
        "match_rate": round(match_rate * 100, 1),
        "mismatch_details": mismatches[:5],  # Top 5 mismatches
    }


# Example usage:
instructions: str = """Analyze the input for sentiment. Extract any product names mentioned. Score each product on a scale of 1-5."""
intended_ops = ["analyze sentiment", "extract product names", "score products"]
result = validate_instruction_interpretation(
    instruction=instructions,
    intended_operations=intended_ops,
    validator_llm=my_llm,
    n_test_cases=10
)
# result: {"match_rate": 95.0, "mismatches": 1, ...}
```

## Constraints

### MUST DO
1. Replace every vague verb (handle, process, manage, deal with, take care of) with a specific alternative from the verb matrix before writing any instruction
2. Define success criteria for each verb in context — never assume "analyze" means the same thing across different tasks
3. Order operations sequentially where dependencies exist; parallel groups only where there are truly no dependencies
4. Test every new instruction by having an LLM re-explain it — if > 20% of test cases show misinterpretation, revise
5. Store verb matrices and success criteria in versioned configuration files alongside prompt templates
6. Use the forbidden outputs list from each VerbDefinition to catch misinterpretations programmatically
7. Reference `code-philosophy` (5 Laws of Elegant Defense): fail fast on ambiguous verbs, parse don't validate by using structured output formats
8. When combining multiple verbs in one instruction, add transition language that clarifies the relationship ("After extracting entities, analyze them for...")

### MUST NOT DO
1. Use "handle," "process," "manage," or "deal with" anywhere in production instructions — they are always ambiguous
2. Define success criteria that require subjective judgment ("the summary should be good") — all criteria must be objectively measurable
3. Put more than 4 verbs in a single instruction — break complex tasks into separate pipeline steps
4. Assume a verb means the same thing across different domains — "classify" for text categories is different from "classify" for image types
5. Skip interpretation validation before deploying new instructions to production
6. Change verbs without updating the success criteria — each verb has different expectations

---

## Output Template

When this skill is active, deliver:

1. **Verb matrix** — All approved verbs with category, description, and success criteria
2. **Task decomposition** — Original task broken into atomic operations with mapped verbs
3. **Rewritten instruction** — Full prompt using only verbs from the matrix with transition language
4. **Ambiguity analysis** — Any remaining vague terms flagged with replacement suggestions
5. **Validation test results** — Interpretation match rate and mismatch details
6. **Success criteria per operation** — Objective measures for each verb's execution

---

## Related Skills

| Skill | Purpose |
|---|---|
| `prompt-chaining` | Each chain step benefits from precise verb-based instructions |
| `prompt-engineering-patterns-v2` | Verb design is a core component of prompt engineering patterns |
| `iterative-prompt-refinement` | Ambiguity analysis feeds into the prompt improvement loop |

> 📖 skill(local cache): prompt-chaining, prompt-engineering-patterns-v2, iterative-prompt-refinement
