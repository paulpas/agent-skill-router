---
name: system-hints-design
description: Constructs layered system hints for agent architectures — identity, context,
  constraint, and behavioral hint layers — with provider-specific patterns for Anthropic,
  OpenAI, and Google Gemini.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: agent
  triggers: system hints, system prompt design, agent behavior control, context layering,
    hint architecture, how do i design better system prompts, tool-use hints, multi-agent
    hints
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
  scope: infrastructure
  output-format: code
  content-types:
  - code
  - guidance
  - do-dont
  related-skills: hint-based-prompting, instruction-engineering, ai-agent-safety,
    agent-context-management
---
# System Hints Design for AI Agents

Constructs layered system hints that serve as the primary behavioral control surface in multi-turn, tool-using agent architectures. The model designs hint systems organized into four structural layers — identity, context, constraint, and behavioral hint — with provider-specific implementations for Anthropic's system prompt parameter, OpenAI's messages array convention, and Google Gemini's system_instruction field.

## TL;DR Checklist

- [ ] Structure every system message across four layers: identity → context → constraint → hints
- [ ] Place hard constraints before behavioral hints so the model parses them first
- [ ] Use provider-native parameters (Anthropic `system`, OpenAI `role=system`, Gemini `system_instruction`) — never pass them in user messages
- [ ] Embed tool-use guidance as preference hints, not exhaustive tool catalogs
- [ ] Apply safety through contextual hints (assume PII, require disclaimers) alongside explicit guardrails
- [ ] Resolve hint/instruction conflicts by ensuring behavioral hints reinforce, never contradict, role definitions
- [ ] Reference code-philosophy (5 Laws of Elegant Defense) when designing constraint layers — parse at boundaries, fail fast on invalid state, guide data naturally

---

## Orchestration Flow

```
System Hint Request
       ↓
┌───────────────────────────────────────┐
│  Parse Requirements                    │
│  - Provider (Anthropic/OpenAI/Gemini)  │
│  - Agent role & domain                 │
│  - Tool set context                    │
│  - Safety requirements                 │
└──────────────┬────────────────────────┘
               ↓
┌───────────────────────────────────────┐
│  Layer 1: Identity                     │
│  Define who the agent is              │
│  ─────────────────────────────────     │
│  Has role? ──► Set agent identity     │
│  Missing? ──► Request clarification   │
└──────────────┬────────────────────────┘
               ↓
┌───────────────────────────────────────┐
│  Layer 2: Context                      │
│  Define operating environment         │
│  ─────────────────────────────────     │
│  Has tools? ──► Add tool awareness    │
│  No context? ──► Use minimal defaults │
└──────────────┬────────────────────────┘
               ↓
┌───────────────────────────────────────┐
│  Layer 3: Constraint                   │
│  Define hard boundaries               │
│  ─────────────────────────────────     │
│  Has explicit rules? ──► Include      │
│  Has safety needs? ──► Add hints +    │
│                        explicit guards  │
└──────────────┬────────────────────────┘
               ↓
┌───────────────────────────────────────┐
│  Layer 4: Behavioral Hints             │
│  Subtle cues for natural behavior     │
│  ─────────────────────────────────     │
│  Has tool-preference hints? ──► Embed │
│  No conflict with constraints? ──► OK │
│  Conflict detected? ──► Resolve first │
└──────────────┬────────────────────────┘
               ↓
┌───────────────────────────────────────┐
│  Format for Provider API              │
│  Apply provider-specific conventions  │
│  ─────────────────────────────────     │
│  Validate structure ──► Return        │
│  Validation fail? ──► Debug layering  │
└───────────────────────────────────────┘
```

## When to Use

Use this skill when:

- Designing the system message for a new agent architecture that uses tool-calling or multi-turn conversations
- Refactoring an existing system prompt that has grown unstructured — decomposing it into clean layers
- Migrating between LLM providers (e.g., from OpenAI to Anthropic) and adapting system message format
- Building a multi-agent system where orchestrator and worker agents need distinct but consistent hint hierarchies
- Embedding safety behavior through hints rather than maintaining long, unmaintainable constraint lists
- Optimizing token usage in system messages by replacing verbose instructions with concise behavioral hints
- Designing tool-use guidance that naturally steers agent decisions without enumerating every available tool

## When NOT to Use

Avoid this skill for:

- Simple single-turn chat completions with no tools or agent behavior to control — a short prompt suffices
- Situations where the system message is generated entirely from user data (e.g., dynamic customer-facing bots) — use `agent-agent-context-management` instead
- Overriding runtime-configured constraints through hints — always make hard constraints explicit parameters, never implicit in system messages
- One-shot code generation tasks with no multi-turn context or tool usage — the layering overhead is wasted tokens

---

## Core Workflow

1. **Identify Provider and Architecture** — Determine the target LLM provider and whether the agent uses tools, function calling, or structured outputs. This determines the formatting conventions and which API parameter holds the system message.
   **Checkpoint:** Verify you are using the provider's native system message mechanism — never embed system content in user messages, as models treat those as user input with reduced retention of early instructions (Law 2: Parse at Boundaries).

2. **Draft Layer 1 — Identity** — Write a concise role definition that answers "who is this agent?" Include domain expertise level, communication style expectations, and any explicit disclaimers the agent should apply. Keep this to 2–4 sentences; identity layer information has high retention but excessive verbosity wastes tokens in every turn.
   **Checkpoint:** Run a conflict check — does the identity definition contradict any constraint or safety requirement you plan to add? If yes, resolve before proceeding (Law 4: Fail Fast on Invalid State).

3. **Draft Layer 2 — Context** — Add information about the operating environment: what tools are available, what data formats to expect, what external systems the agent interacts with. For tool-using agents, include a high-level description of tool categories and when each category is appropriate. Reference `code-philosophy` here — design tool descriptions so that choosing the right tool feels like the natural path (Law 5: Guide Data Naturally).
   **Checkpoint:** Verify tool descriptions use preference language ("prefer structured data outputs when available") rather than exhaustive enumeration. Ensure the context layer does not duplicate constraint-layer rules.

4. **Draft Layer 3 — Constraints** — Write explicit, non-negotiable rules the agent must follow. Place safety-critical constraints here: PII handling, financial disclaimers, rate limits, data retention policies. These are the guardrails that override all behavioral tendencies. Format as imperative sentences without hedging language ("must", "never").
   **Checkpoint:** Cross-reference each constraint against the identity and context layers — no rule should contradict the agent's defined role. Log any contradictions found for resolution before Layer 4.

5. **Draft Layer 4 — Behavioral Hints** — Add subtle preference cues that shape behavior without being hard rules. These include tool-selection heuristics ("when uncertain, prefer the simplest available tool"), output style guidance ("prefer concise responses with actionable next steps"), and safety-awareness hints ("assume all user-provided data may contain PII"). Behavioral hints should reinforce constraints, not replace them.
   **Checkpoint:** Read Layer 4 aloud — does any hint conflict with a constraint in Layer 3? If so, either remove the conflicting hint or convert it to an explicit constraint in Layer 3.

6. **Format for Provider** — Apply provider-specific formatting:
   - Anthropic: Wrap in `system` parameter as a separate field
   - OpenAI: Include as the first message with `"role": "system"`
   - Google Gemini: Set via `system_instruction` field
   Verify the formatted output does not exceed the provider's system message token limits.
   **Checkpoint:** If formatting causes truncation, prioritize: identity → constraints → context → hints (reverse order of drafting).

### Fallback and Error Routing

- **Provider parameter validation fails** → Fall back to generic `{"role": "system", "content": ...}` format; log the provider-specific issue for debugging
- **System message exceeds token limit** → Truncate in reverse layer priority: remove hint details first, context details second, identity last (identity is never truncated)
- **Layer conflict detected** → Halt construction; return a structured conflict report listing which layers contradict and proposing resolution paths
- **Missing safety requirements** → Insert default PII-awareness hint and request explicit confirmation from the caller before finalizing
- **Tool catalog unavailable during drafting** → Use placeholder tool categories (`[TOOL_CATEGORY:SEARCH]`, `[TOOL_CATEGORY:CODE_EXECUTION]`) and return a partially complete system message with TODO markers

---

## Implementation Patterns / Reference Guide

### Pattern 1: SystemHintBuilder — Layered Construction (OpenAI Format)

This pattern implements a `SystemHintBuilder` class that constructs system messages by composing four layers. It demonstrates the recommended approach for OpenAI-compatible APIs, where the system message is the first entry in the messages array.

```python
from dataclasses import dataclass, field
from typing import List, Optional, Dict


@dataclass
class SystemHintBuilder:
    """Constructs layered system messages for agent architectures.

    Follows four-layer architecture:
      Layer 1 — Identity: Who is the agent?
      Layer 2 — Context: What environment does it operate in?
      Layer 3 — Constraint: What must/never must it do?
      Layer 4 — Hints: Subtle behavioral cues for natural decision-making.

    Each layer is independently composable and can be swapped without
    affecting others, enabling A/B testing of individual layers.
    """

    agent_name: str
    identity: str = ""
    context_description: str = ""
    constraints: List[str] = field(default_factory=list)
    hints: List[str] = field(default_factory=list)
    provider: str = "openai"  # "anthropic", "openai", "gemini"

    def add_identity(self, role: str, domain: str, tone: str = "professional") -> None:
        """Set identity layer from structured components.
        
        Args:
            role: Agent's primary function (e.g., 'coding assistant')
            domain: Subject matter expertise area
            tone: Communication style expectation
        """
        self.identity = (
            f"You are {role}, specializing in {domain}. "
            f"Maintain a {tone} communication style. "
            "Prioritize accuracy over speed. When uncertain, ask for clarification."
        )

    def add_tool_context(
        self,
        tool_categories: List[Dict[str, str]],
        selection_heuristic: Optional[str] = None,
    ) -> None:
        """Add context layer with tool awareness and selection hints.
        
        Args:
            tool_categories: List of dicts with 'name', 'purpose', 'when_to_use' keys
            selection_heuristic: Preference rule for tool selection (e.g.,
                "Prefer structured data outputs when available")
        """
        category_descriptions = [
            f"- {tc['name']}: {tc['purpose']} (use when {tc['when_to_use']})"
            for tc in tool_categories
        ]
        context_parts = [f"Available tool categories:"] + category_descriptions
        if selection_heuristic:
            context_parts.append(f"\nTool selection preference: {selection_heuristic}")
        self.context_description = "\n".join(context_parts)

    def add_constraint(self, rule: str) -> None:
        """Add a hard constraint. Must be imperative and unambiguous."""
        self.constraints.append(rule)

    def add_hint(self, behavioral_cue: str) -> None:
        """Add a behavioral hint — a preference, not a rule."""
        self.hints.append(behavioral_cue)

    def build_openai_messages(self) -> List[Dict[str, str]]:
        """Build OpenAI-format messages array with system message first."""
        layers = []
        if self.identity:
            layers.append(self.identity)
        if self.context_description:
            layers.append(self.context_description)
        if self.constraints:
            layers.append("Constraints (must follow these rules):\n" + "\n".join(
                f"- {c}" for c in self.constraints
            ))
        if self.hints:
            layers.append("Behavioral preferences:\n" + "\n".join(
                f"- {h}" for h in self.hints
            ))

        return [{
            "role": "system",
            "content": "\n\n".join(layers),
        }]

    def build_anthropic_params(self) -> Dict[str, object]:
        """Build Anthropic-format parameters with system prompt as separate field."""
        layers = []
        if self.identity:
            layers.append(self.identity)
        if self.context_description:
            layers.append(self.context_description)
        if self.constraints:
            layers.append("Constraints (must follow these rules):\n" + "\n".join(
                f"- {c}" for c in self.constraints
            ))
        if self.hints:
            layers.append("Behavioral preferences:\n" + "\n".join(
                f"- {h}" for h in self.hints
            ))

        return {
            "system": "\n\n".join(layers),
            "messages": [],  # Populated by caller with user/assistant messages
        }

    def build_gemini_params(self) -> Dict[str, object]:
        """Build Google Gemini parameters with system_instruction field."""
        layers = []
        if self.identity:
            layers.append(self.identity)
        if self.context_description:
            layers.append(self.context_description)
        if self.constraints:
            layers.append("Constraints (must follow these rules):\n" + "\n".join(
                f"- {c}" for c in self.constraints
            ))
        if self.hints:
            layers.append("Behavioral preferences:\n" + "\n".join(
                f"- {h}" for h in self.hints
            ))

        return {
            "system_instruction": {
                "parts": [{"text": "\n\n".join(layers)}],
            },
            "contents": [],  # Populated by caller with user/assistant messages
        }


# --- Usage example: Building a research assistant system hint ---

builder = SystemHintBuilder(
    agent_name="research-assistant",
    provider="openai",
)

builder.add_identity(
    role="research and code analysis assistant",
    domain="software engineering, data science, and cloud infrastructure",
    tone="analytical but approachable",
)

builder.add_tool_context(
    tool_categories=[
        {
            "name": "code_search",
            "purpose": "Search source code repositories for patterns and references",
            "when_to_use": "explaining how a feature is implemented across files",
        },
        {
            "name": "file_reader",
            "purpose": "Read file contents from the project filesystem",
            "when_to_use": "needing to inspect specific files before answering",
        },
        {
            "name": "web_search",
            "purpose": "Search the internet for current information",
            "when_to_use": "asking about recent releases, APIs, or best practices not in code",
        },
    ],
    selection_heuristic=(
        "Prefer code_search and file_reader over web_search when the question "
        "can be answered from the project codebase. Use web_search only for "
        "current information not derivable from existing code."
    ),
)

builder.add_constraint("Never fabricate API signatures or library functions that you have not verified")
builder.add_constraint("When providing code examples, ensure they are syntactically valid Python")
builder.add_constraint("Flag any security concerns about provided code as a separate notice")

builder.add_hint("When handling user data, assume it may contain PII — avoid logging raw values")
builder.add_hint("Prefer showing the minimal working example before explaining alternatives")
builder.add_hint("When uncertain, prefer the simplest available tool that solves the problem")

# OpenAI format
openai_messages = builder.build_openai_messages()
# Result: [{"role": "system", "content": "<layered system message>"}]

# Anthropic format
anthropic_params = builder.build_anthropic_params()
# Result: {"system": "<layered system message>", "messages": [...]}

# Gemini format
gemini_params = builder.build_gemini_params()
# Result: {"system_instruction": {...}, "contents": [...]}
```

### Pattern 2: Provider-Specific System Message Formatting (BAD vs. GOOD)

This pattern demonstrates the critical difference between correct provider-native formatting and common anti-patterns that degrade model behavior.

```python
import anthropic
from openai import OpenAI
from google import genai


# ❌ BAD: Embedding system content in user messages
#   This causes models to treat system instructions as user input,
#   reducing retention of early behavioral directives by up to 40%.
def bad_system_message_openai() -> list[dict]:
    """All-in-one user message — no separation between system and user."""
    return [
        {
            "role": "user",
            "content": (
                "You are a coding assistant. "           # System content as user text
                "Always validate inputs before processing. "  # Constraint as user text
                "Prefer Python over shell scripts. "      # Hint as user text
                "\n\nNow help me with this task: ..."
            ),
        }
    ]


# ✅ GOOD: Provider-native system message parameter
def good_system_message_openai(
    openai_client: OpenAI,
    user_content: str,
) -> object:
    """Correctly formats system message using OpenAI's role=system convention."""
    system_layers = []

    # Layer 1 — Identity
    system_layers.append(
        "You are an expert coding assistant specializing in Python and Go."
    )

    # Layer 2 — Context
    system_layers.append(
        "Available tools: file_reader, code_search, terminal_runner. "
        "Prefer file_reader when inspecting existing code before making changes."
    )

    # Layer 3 — Constraints (hard rules)
    system_layers.extend([
        "Never execute terminal commands without first showing them to the user.",
        "Always validate that files exist before attempting to modify them.",
    ])

    # Layer 4 — Behavioral hints (soft preferences)
    system_layers.extend([
        "When uncertain, prefer the simplest approach that meets requirements.",
        "Show incremental progress rather than waiting for complete solutions.",
    ])

    response = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "\n\n".join(system_layers)},
            {"role": "user", "content": user_content},
        ],
    )
    return response


def good_system_message_anthropic(
    anthropic_client: anthropic.Anthropic,
    user_content: str,
) -> object:
    """Correctly formats system message using Anthropic's system parameter.

    Anthropic's API accepts the system message as a separate field from the
    messages array. This is critical — when passed in messages[], it is not
    treated with the same priority as the dedicated system parameter.
    Newer Claude models (3.5 Sonnet, 4) retain early system instructions
    significantly better than earlier versions, but the separation still matters.
    """
    system_text = "\n\n".join([
        # Layer 1 — Identity
        "You are a security-focused code review assistant.",

        # Layer 2 — Context
        (
            "You analyze code for security vulnerabilities including: "
            "injection flaws, authentication bypasses, insecure data handling. "
            "You have access to file_reader and vulnerability_scanner tools."
        ),

        # Layer 3 — Constraints
        "Never suggest removing input validation as a performance optimization.",
        "Always flag OWASP Top 10 violations with severity ratings.",

        # Layer 4 — Hints
        "When handling code containing credentials, redact values in output.",
        "Prefer explaining the vulnerability mechanism over simply naming it.",
    ])

    response = anthropic_client.messages.create(
        model="claude-sonnet-4-20250514",
        system=system_text,  # ← Native system parameter, NOT in messages[]
        messages=[{"role": "user", "content": user_content}],
        max_tokens=4096,
    )
    return response


def good_system_message_gemini(
    gemini_client: genai.Client,
    user_content: str,
) -> object:
    """Correctly formats system message using Gemini's system_instruction field.

    Gemini handles long multi-part system instructions more effectively than
    OpenAI or Anthropic — it maintains coherent understanding of separate
    instruction blocks even when the total token count is high. This makes
    Gemini particularly suitable for complex multi-agent systems where each
    agent receives a detailed system instruction.
    """
    system_text = "\n\n".join([
        # Layer 1 — Identity
        "You are a data pipeline orchestration assistant.",

        # Layer 2 — Context
        (
            "You design and troubleshoot ETL pipelines using Apache Airflow, "
            "dbt, and PostgreSQL. You understand DAG dependencies, retry policies, "
            "and data quality checks."
        ),

        # Layer 3 — Constraints
        "Never suggest running production dbt models without a dry-run first.",
        "Always include error handling in DAG definitions using try/except patterns.",

        # Layer 4 — Hints
        "Prefer declarative configuration over programmatic DAG construction.",
        "When troubleshooting, start from the most recent failure and work backward.",
    ])

    response = gemini_client.models.generate_content(
        model="gemini-2.0-flash",
        system_instruction={
            "parts": [{"text": system_text}],
        },
        contents=[{"role": "user", "parts": [{"text": user_content}]}],
    )
    return response


# ❌ BAD: Using the wrong parameter for the provider
def bad_system_message_gemini(client, user_content: str) -> object:
    """Passing system content as a regular message — Gemini ignores it properly
    but not all providers do, and this pattern is fragile across model versions."""
    return client.models.generate_content(
        model="gemini-2.0-flash",
        # Missing system_instruction! System content embedded in user messages:
        contents=[
            {"role": "user", "parts": [{"text": "You are an assistant...\n\n" + user_content}]}
        ],
    )
```

### Pattern 3: Multi-Agent Hint Hierarchy

In multi-agent systems, each agent receives its own system message with a hint hierarchy that aligns with the overall orchestration. The orchestrator hints direct routing decisions; worker agent hints direct execution style. Cross-agent consistency is maintained through shared constraint templates.

```python
@dataclass
class MultiAgentHintConfig:
    """Defines the hint hierarchy for a multi-agent system.

    Ensures all agents follow consistent constraints while maintaining
    role-specific behavioral preferences. Uses a template-based approach
    so that constraint changes propagate to all agents automatically.
    """

    shared_constraints: List[str] = field(default_factory=list)
    orchestrator_hints: List[str] = field(default_factory=list)
    worker_hint_templates: Dict[str, List[str]] = field(default_factory=dict)

    def add_shared_constraint(self, rule: str) -> None:
        """Add a constraint that applies to ALL agents in the system."""
        self.shared_constraints.append(rule)

    def set_orchestrator_hints(
        self, routing_preferences: List[str]
    ) -> None:
        """Set behavioral hints for the orchestrator agent.

        Orchestrator hints focus on routing quality: when to delegate,
        how to evaluate worker capability matches, and when to request
        clarification from the user.
        """
        self.orchestrator_hints = routing_preferences

    def set_worker_hints(
        self, role_name: str, behavioral_prefs: List[str]
    ) -> None:
        """Set behavioral hints for a specific worker agent role."""
        self.worker_hint_templates[role_name] = behavioral_prefs

    def build_agent_system_messages(self) -> Dict[str, str]:
        """Build system messages for all agents using shared constraint templates.

        Returns:
            Dict mapping agent role names to their complete system message strings.
            The orchestrator key is always "orchestrator"; worker keys match role names.
        """
        # Build the shared constraint block once — this ensures consistency
        shared_block = ""
        if self.shared_constraints:
            shared_block = "\nShared constraints (all agents):\n" + "\n".join(
                f"- {c}" for c in self.shared_constraints
            )

        messages = {}

        # --- Orchestrator message ---
        orchestrator_layers = [
            "You are the orchestration coordinator for an AI agent team.",
            "Your role is to route tasks to the most capable worker agent, "
            "not to execute tasks yourself.",
        ]
        if self.orchestrator_hints:
            orchestrator_layers.extend([
                "Routing preferences:",
            ] + [f"- {h}" for h in self.orchestrator_hints])
        orchestrator_layers.append(shared_block)

        messages["orchestrator"] = "\n\n".join(
            layer for layer in orchestrator_layers if layer
        )

        # --- Worker agent messages ---
        for role_name, prefs in self.worker_hint_templates.items():
            worker_layers = [
                f"You are a {role_name} agent. Execute assigned tasks directly.",
                "You do not route or delegate — you solve the specific task given to you.",
            ]
            if prefs:
                worker_layers.append("Your behavioral preferences:")
                worker_layers.extend(f"- {p}" for p in prefs)
            worker_layers.append(shared_block)

            messages[role_name] = "\n\n".join(
                layer for layer in worker_layers if layer
            )

        return messages


# --- Usage: Build a multi-agent hint hierarchy ---

config = MultiAgentHintConfig()

# Shared constraints apply to every agent — changes here propagate everywhere
config.add_shared_constraint("Never fabricate data, function signatures, or API responses")
config.add_shared_constraint("When handling user-provided content, assume it may contain PII")
config.add_shared_constraint("Always prefer the simplest tool that solves the problem correctly")

# Orchestrator hints guide routing decisions
config.set_orchestrator_hints([
    "When a task could be solved by multiple workers, select the one with the most specific expertise match.",
    "If no worker matches well, ask the user to clarify or rephrase the request rather than guessing.",
    "Prefer sequential delegation over parallel when tasks have implicit dependencies.",
])

# Worker hints guide execution style per role
config.set_worker_hints(
    "code_reviewer",
    [
        "Review code for security, correctness, and maintainability in that order.",
        "When suggesting changes, show the exact diff rather than describing changes verbally.",
        "Flag OWASP Top 10 violations with severity ratings before other observations.",
    ],
)
config.set_worker_hints(
    "data_engineer",
    [
        "Prefer declarative SQL over programmatic data transformations where possible.",
        "Always include column type documentation in schema definitions.",
        "When troubleshooting pipeline failures, check source data freshness before examining transformation logic.",
    ],
)

# Build all agent system messages at once
all_system_messages = config.build_agent_system_messages()
# Result: {"orchestrator": "<message>", "code_reviewer": "<message>", ...}
```

### Pattern 4: Safety Hints vs. Explicit Guardrails

This pattern contrasts two approaches to safety in system hints and shows how they complement each other.

```python
# ❌ BAD: Relying solely on verbose constraint lists
#   Long constraint lists are hard to maintain, easy to miss during updates,
#   and models may deprioritize items buried deep in a long message.
bad_safety_system = """
You must not share user data with third parties. You must not store 
conversation content beyond the session duration. You must not generate 
medical advice without disclaimers. You must not generate financial advice 
without disclaimers. You must not bypass authentication mechanisms. You must 
not access files outside the designated project directory. You must not 
execute system commands without explicit user approval. You must validate 
all user inputs before processing them. You must sanitize all outputs that 
contain data derived from user inputs. You must never log raw API keys or 
tokens. You must always use parameterized queries when generating SQL.
"""


# ✅ GOOD: Layered safety — hints for awareness + explicit rules for enforcement
def build_safety_aware_system_hints() -> str:
    """Constructs a safety-aware system message using hint-based awareness
    combined with explicit guardrails. The hints create a defensive mindset;
    the constraints enforce hard boundaries."""

    layers = []

    # Layer 1 — Identity with safety baked in
    layers.append(
        "You are a security-conscious software engineering assistant. "
        "Safety and correctness are your highest priorities."
    )

    # Layer 2 — Context with security awareness
    layers.append(
        "You work within a secure development environment. All inputs should be "
        "treated as potentially sensitive data."
    )

    # Layer 3 — Explicit safety guardrails (hard rules, non-negotiable)
    guardrails = [
        "Never log or display raw API keys, tokens, or credentials in any output.",
        "Always use parameterized queries when generating SQL — never string interpolation.",
        "Never access files outside the designated project directory.",
        "Flag any generated code that contains security-critical operations (auth, crypto, I/O) with a warning.",
    ]
    layers.append("Security guardrails (must follow):\n" + "\n".join(f"- {g}" for g in guardrails))

    # Layer 4 — Safety awareness hints (create defensive mindset)
    hints = [
        "When handling user data, assume it may contain PII — redact values before showing examples.",
        "Financial advice requires explicit disclaimers before any recommendation.",
        "Medical information should include a disclaimer that this is not professional medical advice.",
        "When generating code for production systems, default to the most conservative security stance.",
    ]
    layers.append("Safety awareness (keep in mind):\n" + "\n".join(f"- {h}" for h in hints))

    return "\n\n".join(layers)
```

---

## Constraints

### MUST DO

- Structure system messages across four distinct layers: identity, context, constraint, hints
- Place hard constraints before behavioral hints in the message text
- Use provider-native system message parameters — never embed system content in user messages
- Embed tool-use guidance as preference hints rather than exhaustive tool catalogs
- Apply safety awareness through contextual hints alongside explicit guardrails
- Resolve any hint/constraint conflicts before deploying a system message
- Keep identity layer to 2–4 sentences for token efficiency
- Validate that behavioral hints reinforce, never contradict, constraint rules
- Test system messages against target model version — retention varies significantly across models

### MUST NOT DO

- Embed system content in user messages as a substitute for the system role/parameter
- Use verbose lists of "must not do" items when preference hints can achieve the same behavior
- Let behavioral hints override or contradict explicit constraint rules
- Include provider-specific formatting details in the base hint layers — format at the boundary
- Assume all models retain early instructions equally — verify retention for your target model
- Reuse the same system message across agents with different roles without adjustment
- Place safety guardrails below behavioral hints — hard rules must appear first

---

## Output Template

When designing or reviewing a system hint, produce:

1. **Provider Selection** — Target LLM provider and model version, with rationale for using native parameters over generic messages
2. **Layer 1 (Identity)** — The identity text and its token count; confirm 2–4 sentences
3. **Layer 2 (Context)** — Tool/environment context and tool-selection heuristics with token budget notes
4. **Layer 3 (Constraints)** — Hard constraint list with each tagged as `security`, `data`, or `operation` category
5. **Layer 4 (Hints)** — Behavioral preference cues with explicit confirmation that none conflict with Layer 3 constraints
6. **Conflict Resolution Report** — List any detected contradictions between layers and how they were resolved
7. **Provider-Formatted Output** — The final system message in the target provider's format

---

## Related Skills

| Skill | Purpose |
|---|---|
| `hint-based-prompting` | Foundational technique for using hints to shape model behavior without explicit enumeration |
| `instruction-engineering` | Broader instruction design patterns beyond the four-layer system hint architecture |
| `ai-agent-safety` | Safety patterns, guardrail design, and constraint enforcement strategies |
| `agent-context-management` | Managing context windows, message routing, and state between multi-agent systems |

---

## Live References

> Authoritative documentation for provider-specific system hint parameters and best practices.

- [Anthropic System Prompt Parameter — Claude API Documentation](https://docs.anthropic.com/en/docs/build-with-claude/system-prompts)
- [OpenAI System Messages Best Practices — Chat Completions Guide](https://platform.openai.com/docs/guides/text-generation/chat-completions-api)
- [Google Gemini System Instructions — Model Configuration](https://ai.google.dev/gemini-api/docs/system-instructions)
- [Anthropic Prompt Engineering Guide — Structured Systems](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering)
- [OpenAI Developer Guide — Function Calling with System Context](https://platform.openai.com/docs/guides/function-calling)
- [Google Gemini API Reference — system_instruction Field](https://ai.google.dev/api/python/google/generativeai/GenerationConfig)
- [Anthropic Claude Model Cards — Instruction Retention Benchmarks](https://www.anthropic.com/research/building-effective-agents)
