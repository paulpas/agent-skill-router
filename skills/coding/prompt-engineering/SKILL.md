---
name: prompt-engineering
description: Implements prompt design patterns including chain-of-thought reasoning, role-setting, few-shot exemplars, structured output schemas, and system prompt optimization for reliable LLM agent behavior.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: prompt engineering, chain of thought, few shot prompting, role setting, structured output, system prompt design, prompt templates, LLM instructions, prompt patterns, prompt design, prompt architecture
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont]
  related-skills: prompt-optimization, coding-code-review
  archetypes: [tactical, generation]
  anti_triggers: brainstorming, vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
---

# Prompt Engineering Patterns

Designs and implements production prompt templates using proven engineering patterns. Covers chain-of-thought reasoning, role-setting techniques, few-shot exemplar selection, structured output enforcement, and system prompt architecture for reliable LLM behavior. When loaded, this skill makes the model act as a senior prompt engineer — constructing system prompts that produce deterministic, structurally consistent outputs suitable for downstream programmatic consumption.

## TL;DR Checklist

- [ ] Define the output schema before writing any prompt text
- [ ] Use role-setting to anchor the model's response style and exclude irrelevant behaviors
- [ ] Include few-shot exemplars when task complexity exceeds zero-shot capability
- [ ] Enforce structured output format with explicit negative constraints (no explanations)
- [ ] Test prompts against at least 3 diverse inputs before deploying to production
- [ ] Validate all outputs parse against the defined schema without post-processing

---

## When to Use

Use this skill when:

- Building system prompts for LLM-powered agents that need reliable tool-call or structured output behavior
- Designing prompt templates for extraction, classification, or summarization tasks requiring consistent JSON or enumerated output
- Zero-shot prompts consistently produce incorrect formats, hallucinated fields, or verbose free-text responses
- You are creating a new prompt from scratch (not iterating on an existing one — use `prompt-optimization` instead)
- Implementing chain-of-thought reasoning for multi-step tasks like code generation, debugging, or logical analysis
- Designing prompts where the model's output feeds directly into another system (API response, database write, UI render) and structural consistency is critical

---

## When NOT to Use

Avoid this skill for:

- **Improving existing prompts** — Use `prompt-optimization` instead. This skill focuses on initial prompt design from first principles, not iterative A/B testing or gradient-based refinement of existing templates.
- **Evaluating prompt quality at scale** — Use `agentic-evaluation` instead. That skill covers automated evaluation frameworks, rubric design, and batch scoring across thousands of test cases.
- **Debugging agent runtime failures** — Use `debugging-methodology` instead. Runtime errors, tool-call failures, and orchestration bugs are distinct from prompt-level issues.
- **Creative writing or open-ended generation** — This skill targets structured, deterministic outputs for programmatic consumption. Creative tasks benefit from higher temperature and looser constraints.

---

## Core Workflow

1. **Define Output Contract** — Specify the exact output format before writing any prompt text. This is a JSON schema for extraction tasks, an enumerated choice list for classification, or a fixed template for summaries. **Checkpoint:** Every valid response must be parsable against the defined schema without post-processing. Write the schema first; the prompt enforces it.

2. **Set Role and Scope** — Anchor the model with a specific role that constrains its behavior domain. Use "You are a [specific job title] specializing in [narrow domain]" not "You are an AI assistant." The role must actively exclude behaviors outside the task scope (e.g., don't describe yourself as a "creative writer" for factual extraction tasks). **Checkpoint:** Read the role description and ask: "Could this same role plausibly produce answers in an unrelated domain?" If yes, it is too broad.

3. **Choose Reasoning Pattern** — Select the appropriate reasoning technique based on task complexity:
   - **Zero-shot**: Simple classification, straightforward extraction, direct Q&A where the model has sufficient pre-training coverage.
   - **Chain-of-thought (CoT)**: Multi-step reasoning tasks requiring intermediate deductions (e.g., code debugging, mathematical problem solving). Format as "thought:" → "answer:" pairs.
   - **Step-back prompting**: Complex queries that first benefit from abstraction ("What general principle applies here?") before concrete reasoning.
   
   **Checkpoint:** Chain-of-thought adds approximately 2× token cost. Only use when zero-shot produces demonstrably incorrect intermediate reasoning.

4. **Add Few-Shot Exemplars** — Select 3–5 exemplars that cover the hardest edge cases, not the easiest ones. Prefer exemplars that are dissimilar to each other (different topics, different input formats, different difficulty levels). Each exemplar must include both the input and the exact expected output in the target format. **Checkpoint:** Remove any exemplar where the model could produce the correct answer via shortcut reasoning — if removing an exemplar doesn't change the model's behavior on that type of input, it was not teaching a real pattern.

5. **Enforce Output Structure** — Add explicit format constraints that override the model's natural tendency toward verbose responses. Include negative constraints ("Do NOT include explanations or commentary outside the JSON structure"). Specify delimiter markers if using text-based extraction ("Wrap your response in ```json ... ``` blocks."). **Checkpoint:** Test with at least 3 different inputs of varying difficulty to verify structural consistency — extract must always parse, classify must always be one of the enumerated choices.

---

## Implementation Patterns

### Pattern 1: Chain-of-Thought Prompting

Chain-of-thought prompting forces the model to produce intermediate reasoning steps before committing to a final answer. This dramatically improves accuracy on multi-step tasks but costs approximately 2× the tokens and latency. The key is constraining the reasoning format so it can be reliably parsed — always use "thought:" and "answer:" delimiters.

```python
"""Chain-of-Thought prompt builder with strict formatting constraints."""

from typing import List, Optional
import json


def build_cot_prompt(
    task_description: str,
    examples: List[dict],
    output_schema: dict,
    system_role: str = "You are a precise analytical reasoning assistant."
) -> tuple[str, str]:
    """Build a chain-of-thought prompt with constrained intermediate reasoning format.

    The model is instructed to produce reasoning in 'thought:' blocks followed by
    a final answer in 'answer:' block. This structure enables programmatic extraction
    of both the reasoning and the final result.

    Args:
        task_description: Natural language description of the reasoning task.
        examples: List of dicts with 'input' (str) and 'exemplar_cot' (dict with
                  'thoughts' (list[str]) and 'answer' (any)) keys.
        output_schema: JSON schema dict defining the expected output structure.
        system_role: Role-setting string anchoring the model's behavior domain.

    Returns:
        Tuple of (system_prompt, user_prompt) ready for API submission.

    Raises:
        ValueError: If examples list is empty or schemas are invalid.
    """
    if not task_description.strip():
        raise ValueError("task_description must be non-empty")
    if not examples:
        raise ValueError("At least one example with chain-of-thought reasoning required")

    # System prompt establishes role and reasoning protocol
    system_prompt = f"""{system_role}

Your task is to reason through problems step by step before answering. You MUST follow this exact format:

THOUGHT PROCESS (required):
thought: [First reasoning step — what do you observe in the input?]
thought: [Second reasoning step — what pattern or rule applies here?]
thought: [Third reasoning step — connect to the output schema]

ANSWER FORMAT:
answer: <final result as a JSON object matching this schema>
{json.dumps(output_schema, indent=2)}

RULES:
- You must write at least 3 thought steps for every problem.
- Each thought must be a single sentence ending with a period or question mark.
- The answer MUST be valid JSON that matches the schema above.
- Do NOT include any text outside of 'thought:' and 'answer:' lines.
- Do NOT explain your formatting choices — just produce them."""

    # User prompt contains task description and few-shot exemplars
    user_lines: List[str] = [f"Task: {task_description}\n"]
    user_lines.append("Here are examples of the required reasoning format:\n")

    for i, example in enumerate(examples, 1):
        exemplar = example["exemplar_cot"]
        user_lines.append(f"--- Example {i} ---")
        user_lines.append(f"Input: {example['input']}")
        for thought in exemplar["thoughts"]:
            user_lines.append(f"thought: {thought}")
        user_lines.append(f"answer: {json.dumps(exemplar['answer'], indent=2)}\n")

    user_lines.append("--- Now solve the following ---")
    user_lines.append("Input: {{user_input}}")

    return system_prompt, "\n".join(user_lines)


# --- Usage example ---
if __name__ == "__main__":
    schema = {
        "type": "object",
        "required": ["classification", "confidence", "evidence"],
        "properties": {
            "classification": {"type": "string", "enum": ["positive", "negative", "neutral"]},
            "confidence": {"type": "number", "minimum": 0.0, "maximum": 1.0},
            "evidence": {"type": "string"}
        }
    }

    examples = [
        {
            "input": "The software crashed unexpectedly after the latest deployment.",
            "exemplar_cot": {
                "thoughts": [
                    "The word 'crashed' indicates a negative system event with user impact.",
                    "The phrase 'after the latest deployment' suggests causation but does not confirm it.",
                    "Sentiment is clearly negative; confidence is high because 'crashed' is unambiguous."
                ],
                "answer": {
                    "classification": "negative",
                    "confidence": 0.95,
                    "evidence": "The term 'crashed' describes a system failure event"
                }
            }
        },
        {
            "input": "Performance has improved slightly but the UI feels cluttered.",
            "exemplar_cot": {
                "thoughts": [
                    "'Improved slightly' is a weak positive signal, while 'cluttered' is a negative signal.",
                    "The sentiment contains mixed signals with no clear dominant polarity.",
                    "This warrants a neutral classification with moderate confidence due to conflicting cues."
                ],
                "answer": {
                    "classification": "neutral",
                    "confidence": 0.55,
                    "evidence": "Conflicting positive (improved) and negative (cluttered) signals"
                }
            }
        }
    ]

    system_prompt, user_template = build_cot_prompt(
        task_description="Classify the sentiment of user feedback into one of three categories.",
        examples=examples,
        output_schema=schema
    )

    print("=== SYSTEM PROMPT ===")
    print(system_prompt[:200] + "...")
    print(f"\nTotal system tokens: ~{len(system_prompt.split())} words")
    print(f"User template has {sum(1 for e in examples)} few-shot exemplars with CoT chains")
```

**Why this works:** The strict `thought:` / `answer:` delimiter format ensures the output can be parsed programmatically. By requiring at least 3 thought steps, we prevent the model from skipping intermediate reasoning and jumping to conclusions. The schema embedded in the system prompt serves as a contract — the model sees it before any user input.

---

### Pattern 2: Role-Setting and Scope Anchoring

Role-setting is the single highest-leverage technique for controlling LLM behavior. A strong role acts as a behavioral boundary — it tells the model not just what to do, but implicitly what NOT to do by defining an identity with specific expertise boundaries. The difference between weak and strong role-setting is the difference between unpredictable outputs and consistent ones.

```python
"""Role-setting patterns with behavioral scope enforcement."""

from typing import Dict, Any
import json


def build_role_anchored_prompt(
    task: str,
    output_schema: Dict[str, Any],
    exclusions: list[str] | None = None,
) -> dict[str, str]:
    """Build a prompt with strong role-setting and explicit scope boundaries.

    Uses the identity-anchor pattern: the model is given a specific professional
    identity that inherently constrains its behavior domain. This is stronger than
    imperative instructions alone because it leverages the model's pre-existing
    knowledge about what that role entails.

    Args:
        task: The core task to perform (will be inserted into the prompt).
        output_schema: JSON schema dict for structured output validation.
        exclusions: List of behavior types the model must NOT exhibit.
                    E.g., ["marketing language", "unsolicited suggestions"].

    Returns:
        Dict with 'system' and 'user' keys containing the respective prompts.

    Raises:
        ValueError: If task is empty or output_schema lacks required fields.
    """
    if not task.strip():
        raise ValueError("Task description must be non-empty")
    if "type" not in output_schema or "required" not in output_schema:
        raise ValueError("output_schema must have 'type' and 'required' keys")

    # BAD role-setting (too generic — activates no specific knowledge boundary)
    bad_role = "You are a helpful AI assistant that answers questions accurately."

    # GOOD role-setting (specific identity with clear domain boundaries)
    good_role = """You are a Senior Security Engineer at a fintech company.
Your expertise is reviewing Kubernetes manifests and container configurations for
security violations, including privilege escalation risks, secret exposure, network
policy gaps, and image vulnerability patterns. You do NOT provide general DevOps
advice, cost optimization guidance, or application-level security reviews."""

    # Build exclusions clause (active negation strengthens boundaries)
    exclusion_text = ""
    if exclusions:
        exclusion_parts = []
        for excl in exclusions:
            exclusion_parts.append(f"  - NEVER {excl}")
        exclusion_text = f"\n\nSCOPE EXCLUSIONS (hard constraints):\n" + "\n".join(exclusion_parts)

    system_prompt = f"""{good_role}{exclusion_text}

OUTPUT FORMAT — you MUST produce valid JSON matching this schema:
{json.dumps(output_schema, indent=2)}

TASK:
{task}

Follow these rules:
1. Analyze the input using your role's specific expertise only.
2. Do NOT provide advice outside your defined scope.
3. If a concern falls outside your expertise domain, omit it rather than speculating.
4. Your entire response must be parseable as the JSON schema above — no commentary."""

    user_prompt = "Input: {{user_input}}"

    return {"system": system_prompt, "user": user_prompt}


# --- BAD vs GOOD comparison ---
if __name__ == "__main__":
    # Demonstrate the contrast between weak and strong role-setting
    schema = {
        "type": "object",
        "required": ["findings", "severity"],
        "properties": {
            "findings": {"type": "array", "items": {"type": "string"}},
            "severity": {"type": "string", "enum": ["critical", "high", "medium", "low"]}
        }
    }

    prompt = build_role_anchored_prompt(
        task="Review the following Kubernetes Deployment manifest for security issues.",
        output_schema=schema,
        exclusions=["provide cost optimization suggestions", "recommend specific container images", "write YAML configuration"]
    )

    # Show what a weak role-setting produces vs strong
    print("=== BAD ROLE (generic — no behavioral boundary) ===")
    print('  "You are a helpful AI assistant that answers questions accurately."')
    print("  → Model activates ALL pre-training knowledge; output format varies wildly.\n")

    print("=== GOOD ROLE (specific identity with explicit exclusions) ===")
    print(f"  Role: Senior Security Engineer at a fintech company")
    print(f"  Exclusions: {len(prompt['system'].split('SCOPE EXCLUSIONS')[1].strip())} constraint lines\n")

    # Count the boundary-enforcing elements
    boundary_lines = [l for l in prompt["system"].split("\n") if l.strip().startswith("-") or "NEVER" in l]
    print(f"  Boundary constraints: {len(boundary_lines)} active negation rules")
```

**Why strong role-setting works:** The model's training data contains millions of examples written by people in specific professional roles. When you assign "Senior Security Engineer," you activate a coherent cluster of knowledge, vocabulary, and behavioral expectations from that cluster. Weak roles like "helpful assistant" activate a diffuse mixture of every possible conversational pattern.

**Key distinction table:**

| Aspect | BAD Role ("helpful AI") | GOOD Role ("Senior SRE reviewing K8s manifests") |
|---|---|---|
| Activated knowledge | Diffuse — all domains | Focused — security, Kubernetes, compliance |
| Output format consistency | Low — varies by query | High — stays in character |
| Boundary enforcement | None — answers anything | Implicit — ignores out-of-scope concerns |
| Behavioral exclusions | None explicit | "Do not recommend images, cost optimization" |

---

### Pattern 3: Few-Shot Exemplar Selection Strategy

The quality of few-shot exemplars matters far more than their quantity. Three carefully chosen exemplars that cover edge cases consistently outperform five exemplars that show only easy, similar examples. The goal is to teach the model generalization — patterns it can apply to inputs it has never seen — not to memorize specific answers.

```python
"""Few-shot exemplar selection engine that prioritizes edge case coverage."""

from typing import List, Dict, Any, Optional
import json


class ExemplarSelector:
    """Selects high-value few-shot exemplars based on diversity and edge-case coverage.

    Implements a greedy diversification algorithm: iteratively select the exemplar
    most dissimilar to those already chosen, weighted by difficulty (edge cases score higher).
    """

    def __init__(
        self,
        all_exemplars: List[dict],
        max_select: int = 5,
    ):
        """Initialize with candidate exemplars.

        Args:
            all_exemplars: List of exemplar dicts, each containing 'input' (str),
                          'output' (any), and optional 'difficulty' (float 0-1) or 'category' (str).
            max_select: Maximum number of exemplars to select (3-5 recommended).
        """
        if max_select < 2:
            raise ValueError("Minimum 2 exemplars required for meaningful few-shot learning")
        self.all_exemplars = all_exemplars
        self.max_select = min(max_select, len(all_exemplars))

    @staticmethod
    def _compute_similarity(text_a: str, text_b: str) -> float:
        """Compute token-overlap similarity between two text strings.

        Uses Jaccard similarity on token sets for efficiency. For production use
        with semantic understanding, replace this with a sentence embedding distance.

        Args:
            text_a: First string to compare.
            text_b: Second string to compare.

        Returns:
            Float between 0.0 (completely different) and 1.0 (identical tokens).
        """
        tokens_a = set(text_a.lower().split())
        tokens_b = set(text_b.lower().split())
        if not tokens_a or not tokens_b:
            return 0.0
        intersection = tokens_a & tokens_b
        union = tokens_a | tokens_b
        return len(intersection) / len(union)

    def select(self) -> List[dict]:
        """Select exemplars using diversity-first, difficulty-weighted greedy algorithm.

        Algorithm:
        1. Sort all candidates by difficulty (descending).
        2. Greedily pick the most dissimilar exemplar from remaining pool.
        3. Repeat until max_select reached or pool exhausted.

        Returns:
            List of selected exemplar dicts ordered for prompt placement.
        """
        if not self.all_exemplars:
            return []

        # Start with highest difficulty (hardest edge case goes first — primacy effect)
        candidates = sorted(
            self.all_exemplars,
            key=lambda e: e.get("difficulty", 0.5),
            reverse=True,
        )

        selected: List[dict] = [candidates.pop(0)]

        while len(selected) < self.max_select and candidates:
            best_candidate = None
            worst_min_similarity = -1.0

            for candidate in candidates:
                # Compute minimum similarity to any already-selected exemplar
                min_sim = min(
                    self._compute_similarity(candidate["input"], s["input"])
                    for s in selected
                )
                if min_sim > worst_min_similarity:
                    worst_min_similarity = min_sim
                    best_candidate = candidate

            if best_candidate is None:
                break

            selected.append(best_candidate)
            candidates.remove(best_candidate)

        return selected


def build_few_shot_prompt(
    task_instruction: str,
    exemplars: List[dict],
    output_format_spec: str,
) -> tuple[str, str]:
    """Build a prompt with carefully selected few-shot exemplars.

    The prompt structure follows the proven pattern:
    1. Task instruction (what to do)
    2. Output format specification (how to structure it)
    3. Few-shot examples in order from easiest to hardest
    4. User input (the actual task)

    Args:
        task_instruction: Natural language description of the task.
        exemplars: List of dicts with 'input' and 'output' keys. Each output
                   must be in the exact format expected from the model.
        output_format_spec: Human-readable description of the required output format.

    Returns:
        Tuple of (system_prompt, user_prompt).
    """
    system_prompt = f"""You are a precise pattern-matching assistant. Your job is to analyze input and produce output in a specific structured format.

OUTPUT FORMAT RULES:
{output_format_spec}

You will be shown examples. Study them carefully — they define the exact structure and reasoning depth expected."""

    user_lines: List[str] = [task_instruction, "\n"]

    for i, ex in enumerate(exemplars, 1):
        output_str = json.dumps(ex["output"], indent=2) if isinstance(ex["output"], dict) else str(ex["output"])
        user_lines.append(f"Example {i}:")
        user_lines.append(f"Input: {ex['input']}")
        user_lines.append(f"Output:\n{output_str}")
        user_lines.append("")

    user_lines.append("Your turn:")
    user_lines.append("Input: {{user_input}}")
    user_lines.append("Output:")

    return system_prompt, "\n".join(user_lines)


# --- Usage example ---
if __name__ == "__main__":
    # Simulate a pool of candidate exemplars with varying difficulty and similarity
    candidate_pool = [
        {"input": "The app crashed on startup.", "output": {"issue": "crash", "severity": "critical"}, "difficulty": 0.4, "category": "basic_crash"},
        {"input": "Database connection timeout after 30 seconds of high traffic.", "output": {"issue": "timeout", "severity": "high"}, "difficulty": 0.8, "category": "performance"},
        {"input": "Memory usage grew by 200MB per request and never decreased.", "output": {"issue": "memory_leak", "severity": "critical"}, "difficulty": 0.9, "category": "resource_leak"},
        {"input": "User login fails with 401 after password reset.", "output": {"issue": "auth_failure", "severity": "high"}, "difficulty": 0.7, "category": "authentication"},
        {"input": "CSS styles not applying on mobile devices in Safari.", "output": {"issue": "rendering_bug", "severity": "medium"}, "difficulty": 0.6, "category": "frontend"},
        {"input": "API returns correct data but response time exceeds 5 seconds under load.", "output": {"issue": "slow_response", "severity": "high"}, "difficulty": 0.75, "category": "performance"},
        {"input": "Cache invalidation causes thundering herd on page refresh.", "output": {"issue": "cache_stampede", "severity": "medium"}, "difficulty": 0.95, "category": "caching"},
    ]

    selector = ExemplarSelector(all_exemplars=candidate_pool, max_select=4)
    selected = selector.select()

    print("=== Selected exemplars (diversity-first, difficulty-weighted) ===")
    for i, ex in enumerate(selected, 1):
        print(f"  {i}. [{ex['category']}] difficulty={ex['difficulty']} — \"{ex['input'][:50]}...\"")

    system_prompt, user_template = build_few_shot_prompt(
        task_instruction="Analyze the bug report and classify it into a structured issue type with severity.",
        exemplars=selected,
        output_format_spec="""Produce a JSON object with:
- "issue": string (one of: crash, timeout, memory_leak, auth_failure, rendering_bug, slow_response, cache_stampede, or unknown)
- "severity": string (one of: critical, high, medium, low)""",
    )

    print(f"\nSystem prompt tokens: ~{len(system_prompt.split())}")
    print(f"User template contains {len(selected)} exemplars")
```

**Selection strategy principles:**
1. **Start with the hardest example** — The model's first exposure sets a strong pattern for the depth of reasoning expected. If the first example is trivial, the model defaults to shallow analysis.
2. **Maximize dissimilarity** — Two exemplars about different topics (one about memory leaks, one about authentication) teach generalization better than two about slightly different crash scenarios.
3. **Cover all output categories** — If your schema has 5 possible values for a field, ensure at least 3 of them appear in the exemplars. Don't show 5 exemplars where every single one maps to the same classification.
4. **Never include an exemplar that can be solved by keyword matching** — If removing the exemplar doesn't change the model's behavior on that type of input, it was not teaching a real pattern.

---

### Pattern 4: Structured Output Enforcement

When the model's output feeds into another system (JSON parser, database write, API consumer), you must enforce structural consistency at the prompt level — post-processing parsing cannot fix missing fields or wrong types. The most reliable approach combines three techniques: schema embedding in the system prompt, explicit negative constraints ("do NOT add extra fields"), and format delimiters.

```python
"""Structured output enforcement with JSON schema embedding and validation."""

from typing import Dict, Any, Optional
import json


def build_structured_output_prompt(
    task_description: str,
    schema: Dict[str, Any],
    examples: Optional[List[dict]] = None,
    strict_mode: bool = True,
) -> tuple[str, str, Dict[str, Any]]:
    """Build a prompt that enforces strict structured JSON output.

    This is the most critical pattern for production systems. The model receives
    the exact JSON schema as part of its system prompt and is explicitly told
    what NOT to do (add fields, add explanations, change types).

    Args:
        task_description: What the model should analyze or extract from the input.
        schema: JSON Schema dict defining the output structure. Must include 'type',
                'required', and 'properties' keys for meaningful enforcement.
        examples: Optional few-shot exemplars. Each must produce output matching schema.
                  When omitted, the model relies on zero-shot understanding of the schema.
        strict_mode: If True, adds hard constraints that forbid any non-JSON output.
                     Use False when debugging — allows seeing what the model produces
                     before tightening constraints.

    Returns:
        Tuple of (system_prompt, user_prompt, schema) for API submission and validation.

    Raises:
        ValueError: If schema is not a valid JSON Schema structure.
    """
    # Validate schema structure early
    required_schema_keys = {"type", "required", "properties"}
    if not isinstance(schema, dict):
        raise ValueError("schema must be a dict")
    missing_keys = required_schema_keys - set(schema.keys())
    if missing_keys:
        raise ValueError(f"schema missing required keys: {missing_keys}")

    schema_json = json.dumps(schema, indent=2)
    properties_json = json.dumps(schema["properties"], indent=2)

    # Core system prompt with embedded schema
    system_prompt = f"""You are a structured data extraction engine. You produce ONLY valid JSON objects — no explanations, no commentary, no markdown formatting.

YOUR OUTPUT MUST match this exact JSON Schema:
{schema_json}

FIELD DEFINITIONS:
{properties_json}

STRICT OUTPUT RULES (these override all other instructions):
1. Your ENTIRE response must be a single JSON object — nothing before or after it.
2. Include ONLY the fields listed in "required" above. No extra fields, no omitted required fields.
3. Do NOT wrap your output in markdown code blocks (no ```json ... ```). Just produce raw JSON.
4. Do NOT add explanatory text, reasoning, or notes — even if the input seems ambiguous.
5. If the input does not contain information for a field, use null rather than guessing.

TASK:
{task_description}"""

    # User prompt template
    user_prompt = "Input data to analyze:\n{{user_input}}"

    # Build few-shot examples if provided
    if examples:
        example_lines = ["Here are examples of correct output format:\n"]
        for i, ex in enumerate(examples, 1):
            example_output = json.dumps(ex["output"], indent=2) if isinstance(ex.get("output"), dict) else str(ex["output"])
            example_lines.append(f"Example {i}:")
            example_lines.append(f"Input: {ex['input']}")
            example_lines.append(f"Correct JSON output:\n{example_output}\n")

        user_prompt = "\n".join(example_lines) + "Now produce the JSON output:\nInput data to analyze:\n{{user_input}}"

    if strict_mode:
        # Add extra hardening for production use
        system_prompt += """

ADDITIONAL HARDENING RULES:
- Do NOT include a markdown code fence (```json or ```) around your output.
- If you find yourself wanting to add an explanation, DO NOT — produce only the JSON.
- Verify internally that your output matches the schema before writing it."""

    return system_prompt, user_prompt, schema


def validate_json_output(
    raw_response: str,
    schema: Dict[str, Any],
) -> dict[str, Any]:
    """Parse and validate a model's raw JSON response against its schema.

    This function handles common failure modes: markdown code fences, trailing
    commas in JSON (which some models produce), leading/trailing whitespace,
    and non-JSON wrapper text.

    Args:
        raw_response: The raw string returned by the LLM API.
        schema: The JSON schema that defines expected structure.

    Returns:
        Dict with 'valid' (bool), 'data' (parsed object or None), and 'error' (str or None).

    Raises:
        ValueError: If inputs are invalid types.
    """
    if not isinstance(raw_response, str):
        raise ValueError("raw_response must be a string")
    if not isinstance(schema, dict):
        raise ValueError("schema must be a dict")

    # Cleanup common LLM output artifacts
    cleaned = raw_response.strip()

    # Remove markdown code fence if present (```)
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        # Find the JSON content between fences
        json_lines = [l for l in lines if not l.strip().startswith("```")]
        cleaned = "\n".join(json_lines).strip()

    # Try to extract JSON from any surrounding text
    # Models sometimes add "Here is the output:" before the JSON
    if "{" in cleaned:
        start_idx = cleaned.index("{")
        if "}" in cleaned[start_idx:]:
            end_idx = cleaned.rindex("}") + 1
            cleaned = cleaned[start_idx:end_idx]

    # Parse JSON
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as e:
        return {
            "valid": False,
            "data": None,
            "error": f"JSON parse error: {str(e)}. Raw input was truncated to first 200 chars: {raw_response[:200]!r}"
        }

    # Basic schema validation (type and required fields)
    errors = []

    if schema.get("type") == "object" and not isinstance(data, dict):
        errors.append(f"Expected object type but got {type(data).__name__}")

    for field in schema.get("required", []):
        if field not in data:
            errors.append(f"Missing required field: '{field}'")

    # Validate property types if defined
    properties = schema.get("properties", {})
    for field, prop_schema in properties.items():
        if field in data:
            expected_type = prop_schema.get("type")
            value = data[field]
            type_map = {
                "string": str, "number": (int, float), "integer": int,
                "boolean": bool, "array": list, "object": dict, "null": type(None)
            }
            if expected_type and expected_type in type_map:
                expected_python_type = type_map[expected_type]
                if isinstance(value, expected_python_type):
                    # Enum validation
                    enum_values = prop_schema.get("enum")
                    if enum_values and value not in enum_values:
                        errors.append(f"Field '{field}' value {value!r} not in allowed values: {enum_values}")
                else:
                    errors.append(f"Field '{field}' has type {type(value).__name__}, expected {expected_type}")

    if errors:
        return {"valid": False, "data": data, "error": "; ".join(errors)}

    return {"valid": True, "data": data, "error": None}


# --- BAD vs GOOD comparison ---
if __name__ == "__main__":
    schema = {
        "type": "object",
        "required": ["code", "message"],
        "properties": {
            "code": {"type": "integer", "enum": [200, 400, 500]},
            "message": {"type": "string"}
        }
    }

    system_prompt, user_template, _ = build_structured_output_prompt(
        task_description="Analyze the log line and extract the HTTP status code and a one-sentence description of what went wrong.",
        schema=schema,
        strict_mode=True,
    )

    print("=== SYSTEM PROMPT (structured output enforced) ===")
    for line in system_prompt.split("\n"):
        if line.startswith("STRICT") or line.startswith("ADDITIONAL") or line.strip().startswith("-"):
            print(f"  {line}")
    print()

    # Demonstrate validation of various response formats
    test_responses = [
        '{"code": 200, "message": "Success"}',  # Perfect
        '```json\n{"code": 400, "message": "Bad request"}\n```',  # With markdown fence
        'Here is the result:\n{"code": 500, "message": "Server error"}',  # With preamble text
        '{"code": 200, "message": "OK", "extra_field": "should not be here"}',  # Extra field (accepted — validation catches it)
    ]

    print("=== VALIDATION TESTS ===")
    for i, response in enumerate(test_responses, 1):
        result = validate_json_output(response, schema)
        status = "✅ PASS" if result["valid"] else "❌ FAIL"
        error_note = f" — Error: {result['error']}" if not result["valid"] else ""
        print(f"  Test {i}: {status}{error_note}")
```

**Key enforcement techniques ranked by effectiveness:**

| Technique | Effectiveness | When to Use |
|---|---|---|
| Embed JSON schema in system prompt | Critical — baseline requirement | Always |
| Explicit negative constraints ("Do NOT add fields") | High — prevents common violations | Always with structured output |
| Raw JSON mode (no markdown fences) | Medium-high — reduces parsing errors | Production systems |
| Few-shot exemplars showing exact output | High — demonstrates format concretely | Non-trivial schemas |
| Post-processing parser cleanup | Fallback — handles model imperfections | Always, as a safety net |

**Critical insight:** Prompt-level enforcement is 10× more effective than post-processing parsing. A parser can recover from missing markdown fences but cannot invent a missing required field or fix an incorrect enum value. Always design the prompt first; treat validation as a belt-and-suspenders safety net, not a primary control mechanism.

---

## Constraints

### MUST DO
- Define output format (JSON schema, enumerated list, fixed template) before writing any prompt text. The schema is the contract — the prompt enforces it.
- Use specific role-setting that constrains behavior scope. "You are a [title] specializing in [narrow domain]" not "You are helpful."
- Include few-shot exemplars covering edge cases when zero-shot prompts produce incorrect or inconsistent results. Select 3–5 diverse examples, prioritizing difficulty over quantity.
- Enforce structured output with explicit negative constraints ("Do NOT include explanations", "Do NOT add extra fields"). The model's natural tendency is to be verbose — actively suppress it.
- Test prompts against at least 3 different input types (easy, medium, edge case) before deploying to production. Document which inputs caused failures and iterate.

### MUST NOT DO
- Use vague roles like "You are an AI assistant" or "You are helpful" — these activate no specific behavioral boundary.
- Include more than 5 few-shot exemplars — diminishing returns set in after 5, and excess exemplars waste context window and dilute the model's focus.
- Mix multiple reasoning patterns in a single prompt (e.g., chain-of-thought combined with step-back prompting) — the model will confuse the instruction protocols and produce garbled output.
- Write prompts that allow the model to choose its own output format — this is the single most common cause of production failures where downstream parsers receive unpredictable structures.
- Use this skill for improving existing prompts — use `prompt-optimization` instead, which covers iterative testing, A/B evaluation, and gradient-based refinement.

---

## Output Template

When applying this skill to design a prompt, produce:

1. **Output Contract** — JSON schema or format specification written before any prompt text
2. **Role Statement** — Specific identity with explicit scope boundaries (what the model IS and what it is NOT)
3. **Reasoning Protocol** — Chosen reasoning pattern (zero-shot / CoT / step-back) with justification
4. **Exemplar Set** — 3–5 carefully selected examples covering hardest edge cases, with diversity analysis
5. **Full Prompt Pair** — Completed system_prompt and user_prompt strings ready for API submission
6. **Validation Plan** — 3 test inputs (easy / medium / edge case) with expected outputs matching the schema

---

## Related Skills

| Skill | Purpose |
|---|---|
| `prompt-optimization` | Testing and iterative improvement of existing prompts using evaluation frameworks and A/B testing (this skill is for initial design from scratch) |
| `code-review` | Reviewing the code that consumes prompt outputs, ensuring parsers and validators are robust against malformed responses |
| `agentic-evaluation` | Evaluating prompt quality across large test case sets with automated rubrics and scoring at scale |

---

## Quick Reference: Prompt Pattern Selection Guide

Use this decision matrix when choosing which pattern to apply:

| Task Complexity | Output Structure | Recommended Pattern |
|---|---|---|
| Low (simple classification) | Enumerated choice | Role-setting + output format spec |
| Low (straightforward extraction) | JSON fields | Structured output enforcement |
| Medium (multi-step reasoning) | JSON with nested objects | Chain-of-thought + structured output |
| High (complex analysis, novel domain) | Complex JSON schema | CoT + few-shot exemplars + structured output |
| Very high (reasoning over abstract principles) | Free-form but structured | Step-back prompting + CoT |

**Default strategy when unsure:** Start with role-setting + structured output enforcement + 3 diverse few-shot exemplars. Add chain-of-thought only if zero-shot outputs are factually incorrect on at least 2 of your test inputs. This minimizes token cost while maximizing reliability for most production use cases.