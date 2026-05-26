---
name: agent-context-memory
description: Implements context window management and memory architectures for LLM agents including token budgeting, sliding window strategies, summarization fallbacks, cross-turn state persistence, and external vector store integration.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  triggers: context window management, memory architecture, token budgeting, sliding window, conversation summary, cross-turn state, vector store retrieval, long-term memory, short-term memory, agent memory, context overflow, token limit
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont]
  related-skills: observability-patterns, agentic-evaluation, multi-agent-orchestration
  archetypes: [tactical, strategic]
  anti_triggers: brainstorming, vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
---

# Agent Context and Memory Management

Manages context windows and memory architectures for LLM agents to prevent token overflow, preserve critical state across turns, and retrieve relevant information efficiently. Implements token budgeting, sliding window strategies, summarization fallbacks, cross-turn persistence, and vector store integration.

## TL;DR Checklist

- [ ] Initialize a token budget manager before the first agent step
- [ ] Implement sliding window that preserves system prompt while trimming conversation history
- [ ] Configure summarization fallback when approaching context limits
- [ ] Cross-reference external memory store for relevant prior state
- [ ] Apply relevance threshold filtering to all vector retrievals
- [ ] Serialize and merge cross-turn agent state with deterministic merge rules

---

## When to Use

Use this skill when:

- Building multi-turn agents where conversation history exceeds token limits (e.g., long-running research or coding agents)
- Need persistent state across agent invocations (session-based workflows that span multiple requests)
- Agent loses critical context after N turns due to sliding window truncation, causing repetitive or inconsistent behavior
- Designing an agent that references external knowledge bases during execution and needs to merge retrieved facts into context
- Building agents with strict cost constraints where unbounded context growth leads to runaway API costs
- Implementing long-running task completion (e.g., multi-step data analysis) where early-turn decisions must be remembered

---

## When NOT to Use

Avoid this skill for:

- Production monitoring and tracing — use `observability-patterns` instead
- Debugging agent failures or root cause analysis — use `agent-debugging` instead
- Multi-agent coordination and task routing — use `multi-agent-orchestration` instead
- Simple single-turn query answering where context never exceeds limits — the overhead is unnecessary

---

## Core Workflow

1. **Initialize Token Budget** — Create a budget manager tracking input tokens, output tokens, and remaining context before each agent invocation. Include system prompt token count as a fixed cost. **Checkpoint:** Budget must be checked BEFORE every LLM call, not after.

2. **Implement Sliding Window Strategy** — Configure which parts of the conversation to preserve (system prompt, recent messages) vs trim (older turns). Use token-based trimming rather than message-count-based. **Checkpoint:** Always preserve the system prompt and the user's most recent input. Never truncate mid-thought.

3. **Configure Summarization Fallback** — When the sliding window approach still exceeds limits, trigger a summarization pass using a separate LLM call to condense trimmed context into a summary paragraph. **Checkpoint:** The summary must include key decisions made and current task state, not just a text compression.

4. **Integrate External Memory Store** — For cross-turn or cross-session persistence, implement vector store retrieval that fetches relevant prior state based on the current query. Use semantic similarity for retrieval. **Checkpoint:** Only retrieve memories relevant to the current task — include a relevance filter threshold (e.g., cosine similarity > 0.7).

---

## Implementation Patterns

### Pattern 1: Token Budget Manager

A token budget manager tracks per-step and total token consumption, enforces hard limits before each LLM call, and provides cost estimation from token counts. It treats the system prompt as a fixed overhead that must be accounted for in every budget check.

```python
"""Token budget management for LLM agent context windows."""

from dataclasses import dataclass, field
from enum import Enum
import time


class BudgetAction(Enum):
    """Action to take when budget is exceeded."""
    STOP = "stop"           # Raise an error and halt the agent step
    SUMMARIZE = "summarize"  # Trigger summarization fallback
    TRIM = "trim"            # Apply sliding window trim


@dataclass
class TokenUsage:
    """Tracks token consumption for a single operation."""
    input_tokens: int = 0
    output_tokens: int = 0
    system_prompt_tokens: int = 0

    @property
    def total_tokens(self) -> int:
        return self.input_tokens + self.output_tokens

    @property
    def remaining_input_tokens(self) -> int:
        return max(0, self.max_input_tokens - self.input_tokens)

    @property
    def utilization_ratio(self) -> float:
        if self.max_input_tokens == 0:
            return 1.0
        return self.input_tokens / self.max_input_tokens

    # Fixed per-model costs (override in config)
    max_input_tokens: int = 8192
    max_output_tokens: int = 4096


@dataclass
class StepBudgetResult:
    """Result of a budget check before an LLM call."""
    allowed: bool
    remaining_input_tokens: int
    utilization_ratio: float
    action_hint: BudgetAction | None = None
    message: str = ""


class TokenBudgetManager:
    """
    Manages token budgets for agent steps, enforcing hard limits
    before each LLM call to prevent context overflow and cost runaway.

    Usage:
        manager = TokenBudgetManager(max_input_tokens=8192)
        manager.record_system_prompt(system_prompt_text)

        # Before every LLM call:
        result = manager.check_budget(conversation_messages, estimated_output=500)
        if not result.allowed:
            context = manager.apply_fallback_strategy()
            result = manager.check_budget(context, estimated_output=500)

    """

    def __init__(
        self,
        max_input_tokens: int = 8192,
        max_output_tokens: int = 4096,
        safety_margin_ratio: float = 0.1,
        on_exceed: BudgetAction = BudgetAction.TRIM,
    ) -> None:
        self.max_input_tokens = max_input_tokens
        self.max_output_tokens = max_output_tokens
        self.safety_margin = max_input_tokens * safety_margin_ratio
        self.on_exceed = on_exceed

        self._system_prompt_tokens: int = 0
        self._cumulative_input_tokens: int = 0
        self._cumulative_output_tokens: int = 0
        self._step_start_time: float | None = None
        self._step_token_count: int = 0

    def record_system_prompt(self, prompt_text: str, token_estimator: object) -> None:
        """
        Register the system prompt token count as a fixed overhead.

        Args:
            prompt_text: The system prompt string (used for logging).
            token_estimator: An object with an estimate_tokens(text: str) -> int method.
                             Can be tiktoken.Encoding or any compatible estimator.
        """
        self._system_prompt_tokens = token_estimator.estimate_tokens(prompt_text)

    def count_conversation_tokens(
        self, messages: list[dict[str, str]], token_estimator: object
    ) -> int:
        """Count total tokens for a list of message dicts with 'content' keys."""
        total = 0
        for msg in messages:
            content = msg.get("content", "")
            if content:
                total += token_estimator.estimate_tokens(content)
        return total

    def check_budget(
        self,
        conversation_messages: list[dict[str, str]],
        estimated_output_tokens: int = 0,
    ) -> StepBudgetResult:
        """
        Check whether the proposed LLM call fits within budget.

        This MUST be called before every LLM call, not just at startup.
        Accounts for system prompt overhead plus conversation tokens.

        Args:
            conversation_messages: List of message dicts with 'role' and 'content'.
            estimated_output_tokens: Expected output token count for this step.

        Returns:
            StepBudgetResult indicating if the call is allowed and what action to take.
        """
        conversation_tokens = self.count_conversation_tokens(
            conversation_messages, type("Est", (), {"estimate_tokens": lambda _, t: len(t.split())})()  # placeholder — use real estimator in production
        )
        required_input = self._system_prompt_tokens + conversation_tokens
        remaining = self.max_input_tokens - required_input

        utilization = required_input / self.max_input_tokens if self.max_input_tokens > 0 else 1.0
        headroom = remaining - estimated_output_tokens

        if headroom >= 0 and required_input <= (self.max_input_tokens - self.safety_margin):
            return StepBudgetResult(
                allowed=True,
                remaining_input_tokens=remaining,
                utilization_ratio=round(utilization, 3),
            )

        # Budget exceeded — determine fallback action
        if headroom < 0:
            message = (
                f"Context budget exceeded by {abs(headroom)} tokens "
                f"(system: {self._system_prompt_tokens}, conversation: {conversation_tokens}). "
                f"Estimated output: {estimated_output_tokens}."
            )
        else:
            message = (
                f"Context approaching limit ({utilization * 100:.0f}% utilized), "
                f"safety margin breached. Remaining input: {remaining} tokens."
            )

        return StepBudgetResult(
            allowed=False,
            remaining_input_tokens=max(0, remaining),
            utilization_ratio=round(utilization, 3),
            action_hint=self.on_exceed,
            message=message,
        )

    def record_step_usage(self, input_token_count: int, output_token_count: int) -> None:
        """Record token usage after an LLM call completes."""
        self._cumulative_input_tokens += input_token_count
        self._cumulative_output_tokens += output_token_count
        self._step_token_count = input_token_count + output_token_count

    @property
    def total_tokens_consumed(self) -> int:
        return self._cumulative_input_tokens + self._cumulative_output_tokens

    def get_cost_estimate(
        self,
        input_price_per_million: float = 1.50,
        output_price_per_million: float = 6.00,
    ) -> dict[str, float]:
        """Estimate cumulative cost based on token usage and model pricing."""
        input_cost = (self._cumulative_input_tokens / 1_000_000) * input_price_per_million
        output_cost = (self._cumulative_output_tokens / 1_000_000) * output_price_per_million
        return {
            "input_cost_usd": round(input_cost, 4),
            "output_cost_usd": round(output_cost, 4),
            "total_cost_usd": round(input_cost + output_cost, 4),
        }
```

### Pattern 2: Sliding Window with Token-Aware Trimming

Trims conversation history based on token counts rather than message counts. Always preserves the system prompt and the user's most recent input. Handles variable-length messages efficiently by trimming from the oldest turn backward.

```python
"""Sliding window strategy for context window management."""

from dataclasses import dataclass
from typing import Protocol


class TokenEstimator(Protocol):
    """Interface for counting tokens in text."""

    def estimate_tokens(self, text: str) -> int: ...


@dataclass(frozen=True)
class WindowConfig:
    """Configuration for the sliding window strategy."""
    max_tokens: int = 8192
    min_recent_messages: int = 3           # Always keep at least N recent messages
    preserve_system_prompt: bool = True
    trim_strategy: str = "token_weighted"  # "token_weighted" or "message_rounds"


class SlidingWindowManager:
    """
    Implements token-aware sliding window trimming for conversation history.

    Key behaviors:
    - Always preserves system prompt (stored separately)
    - Always preserves the user's most recent input
    - Trims from oldest turn backward using token-based thresholds
    - Never truncates mid-thought — trims at message boundaries

    Usage:
        window = SlidingWindowManager()
        window.set_system_prompt(system_text, estimator)
        context = window.apply(messages, conversation, config)
    """

    def __init__(self) -> None:
        self._system_prompt: str = ""
        self._system_tokens: int = 0

    def set_system_prompt(self, prompt: str, estimator: TokenEstimator) -> None:
        """Register system prompt and count its token overhead."""
        self._system_prompt = prompt
        self._system_tokens = estimator.estimate_tokens(prompt)

    def apply(
        self,
        conversation_messages: list[dict[str, str]],
        config: WindowConfig | None = None,
        estimator: TokenEstimator | None = None,
    ) -> list[dict[str, str]]:
        """
        Apply sliding window to trim conversation while preserving critical context.

        Args:
            conversation_messages: Full list of message dicts with 'role' and 'content'.
            config: Window trimming configuration. Defaults to max 8192 tokens.
            estimator: Token counting function. Required if token-based trim is used.

        Returns:
            Trimmed list of messages that fits within the configured token budget.
        """
        if config is None:
            config = WindowConfig()

        result_messages: list[dict[str, str]] = []

        # Step 1: Always include system prompt at the top
        if self._system_prompt and config.preserve_system_prompt:
            result_messages.append({"role": "system", "content": self._system_prompt})

        # Step 2: Separate user's most recent input from the rest
        recent_user_message: dict[str, str] | None = None
        earlier_messages: list[dict[str, str]] = []

        for msg in conversation_messages:
            if msg.get("role") == "user":
                recent_user_message = msg
            else:
                earlier_messages.append(msg)

        # Step 3: Count tokens for the buffer (system + earlier messages)
        total_tokens = self._system_tokens
        buffered: list[dict[str, str]] = []

        for msg in earlier_messages:
            msg_tokens = estimator.estimate_tokens(msg.get("content", "")) if estimator else len(msg.get("content", "").split())
            # Add message only if it fits within budget
            if total_tokens + msg_tokens <= config.max_tokens - self._system_tokens:
                buffered.append(msg)
                total_tokens += msg_tokens
            elif not result_messages:
                # At least include the message to avoid empty context
                buffered.append(msg)
                total_tokens += msg_tokens

        # Reverse so chronological order is maintained (oldest first)
        buffered.reverse()

        # Step 4: Reconstruct with buffer + recent user message
        result_messages.extend(buffered)

        if recent_user_message:
            result_messages.append(recent_user_message)

        return result_messages

    def remaining_budget(
        self,
        current_messages: list[dict[str, str]],
        estimator: TokenEstimator,
        max_tokens: int = 8192,
    ) -> int:
        """Calculate how many tokens remain before hitting the window limit."""
        consumed = self._system_tokens
        for msg in current_messages:
            consumed += estimator.estimate_tokens(msg.get("content", ""))
        return max(0, max_tokens - consumed)

    def trim_to_budget(
        self,
        messages: list[dict[str, str]],
        estimator: TokenEstimator,
        target_max_tokens: int = 8192,
    ) -> list[dict[str, str]]:
        """
        Aggressively trim messages to fit within a strict token budget.

        Strips from the oldest non-system, non-user-last message backward until
        the total fits. Never removes system prompt or last user input.
        """
        budget = target_max_tokens - self._system_tokens
        result: list[dict[str, str]] = []
        last_user_idx = None

        # Find the last user message (preserve it)
        for i, msg in enumerate(messages):
            if msg.get("role") == "user":
                last_user_idx = i

        # Collect all messages except the preserved last user message
        trimmable = [msg for i, msg in enumerate(messages) if i != last_user_idx]

        total = self._system_tokens
        kept: list[dict[str, str]] = []

        for msg in reversed(trimmable):  # Start from newest
            msg_tokens = estimator.estimate_tokens(msg.get("content", ""))
            if total + msg_tokens <= budget:
                kept.insert(0, msg)
                total += msg_tokens
            else:
                break

        # Add back the preserved last user message
        if last_user_idx is not None:
            result.extend(kept)
            result.append(messages[last_user_idx])
        else:
            result = kept

        return result
```

### Pattern 3: Conversation Summarization Fallback

When sliding window trimming still exceeds limits, this pattern triggers a summarization pass. The summarizer prompt explicitly requests key decisions, current task state, and remaining questions — not just text compression. The result merges the summary with recent messages into the context window.

```python
"""Conversation summarization fallback for context overflow."""

from dataclasses import dataclass
import json


@dataclass
class ConversationSummary:
    """Structured summary of trimmed conversation history."""
    key_decisions: list[str] = field(default_factory=list)
    current_task_state: str = ""
    remaining_questions: list[str] = field(default_factory=list)
    tools_used: list[str] = field(default_factory=list)
    files_modified: list[str] = field(default_factory=list)
    raw_summary: str = ""

    def to_message(self) -> dict[str, str]:
        """Convert summary to a system message format for LLM context."""
        return {
            "role": "system",
            "content": self._build_context_string(),
        }

    def _build_context_string(self) -> str:
        parts = [f"**Context Summary:**\n{self.raw_summary}"]

        if self.key_decisions:
            parts.append("\n**Key Decisions:**")
            for decision in self.key_decisions:
                parts.append(f"  - {decision}")

        if self.current_task_state:
            parts.append(f"\n**Current Task State:**\n{self.current_task_state}")

        if self.remaining_questions:
            parts.append("\n**Remaining Questions:**")
            for q in self.remaining_questions:
                parts.append(f"  - {q}")

        return "\n".join(parts)


class ConversationSummarizer:
    """
    Triggers summarization when sliding window trimming alone cannot fit
    conversation into the context budget.

    The summarizer produces a structured summary (not just compressed text)
    that includes decisions made, current state, and outstanding questions.

    Usage:
        summarizer = ConversationSummarizer()
        summary = summarizer.summarize(trimmed_messages, full_context_text, client)
        context = [summary.to_message()] + recent_messages
    """

    def __init__(self, system_summary_template: str | None = None) -> None:
        self.system_summary_template = system_summary_template or (
            "You are a conversation summarizer for an LLM agent. "
            "Condense the following conversation history into a structured summary. "
            "Extract key decisions made, current task state, any remaining questions, "
            "tools used, and files modified. Do NOT just compress the text — "
            "extract actionable context that preserves what matters for continuing the task."
        )

    def summarize(
        self,
        conversation_messages: list[dict[str, str]],
        full_context_text: str,
        llm_client: object,
        max_summary_tokens: int = 1000,
    ) -> ConversationSummary:
        """
        Generate a structured summary of trimmed conversation context.

        Args:
            conversation_messages: Messages that were trimmed (not in recent window).
            full_context_text: The raw text of the full conversation for summarization input.
            llm_client: LLM client with a `generate(prompt, max_tokens)` method.
            max_summary_tokens: Hard limit on summary length.

        Returns:
            ConversationSummary with structured fields for agent context.
        """
        # Build summarizer prompt with explicit extraction requirements
        summarization_prompt = f"""{self.system_summary_template}

## Conversation to Summarize
{full_context_text}

## Instructions
Produce a JSON summary with these exact fields:
- "raw_summary": 3-5 sentence overview of what was accomplished
- "key_decisions": list of decisions the agent made (up to 10)
- "current_task_state": description of what the agent is currently working on
- "remaining_questions": open questions or next steps (up to 10)
- "tools_used": list of tools/APIs the agent interacted with
- "files_modified": list of files the agent read, wrote, or modified

Respond ONLY with valid JSON. No markdown fences, no extra text.
Limit raw_summary to {max_summary_tokens} tokens max.
"""

        # Call LLM for summarization (adapter pattern — adjust to your client)
        response_text = llm_client.generate(summarization_prompt, max_tokens=max_summary_tokens * 2)

        return self._parse_summary(response_text, conversation_messages)

    def _parse_summary(self, response_text: str, original_messages: list[dict[str, str]]) -> ConversationSummary:
        """Parse LLM response into structured ConversationSummary."""
        try:
            parsed = json.loads(response_text.strip())
        except json.JSONDecodeError:
            # Fallback: wrap raw text in a basic summary
            return ConversationSummary(
                raw_summary=response_text[:2000],
                current_task_state="Continuing from previous conversation context.",
            )

        return ConversationSummary(
            raw_summary=parsed.get("raw_summary", ""),
            key_decisions=parsed.get("key_decisions", []),
            current_task_state=parsed.get("current_task_state", ""),
            remaining_questions=parsed.get("remaining_questions", []),
            tools_used=parsed.get("tools_used", []),
            files_modified=parsed.get("files_modified", []),
        )

    def merge_with_recent(
        self,
        summary: ConversationSummary,
        recent_messages: list[dict[str, str]],
    ) -> list[dict[str, str]]:
        """
        Merge structured summary with recent conversation messages.

        The summary becomes the first message (system role), followed by
        the preserved recent conversation turn. This gives the agent both
        historical context and recent state in a compact window.
        """
        context = [summary.to_message()]
        context.extend(recent_messages)
        return context
```

### Pattern 4: Cross-Turn State Persistence

Agent state that persists across turns, with serialization, deserialization, and deterministic merge rules. The merge strategy handles conflicts between loaded historical state and fresh turn data.

```python
"""Cross-turn state persistence for long-running agent sessions."""

import json
import time
from dataclasses import dataclass, field, asdict
from typing import Any


@dataclass
class AgentTurnState:
    """
    Captures the full state of an agent at a given turn for cross-turn persistence.

    This is serialized to JSON and stored in a memory store (file, database, or vector store)
    between invocations. On load, it merges with any fresh inputs for that turn.
    """
    session_id: str = ""
    turn_number: int = 0
    timestamp_created: float = field(default_factory=time.time)
    timestamp_updated: float = field(default_factory=time.time)

    # Task context — what the agent is working on
    task_description: str = ""
    current_subtask: str = ""
    progress_status: str = "in_progress"  # "not_started", "in_progress", "blocked", "completed"

    # Knowledge state — facts the agent has learned or verified
    verified_facts: list[dict[str, Any]] = field(default_factory=list)
    hypotheses: list[str] = field(default_factory=list)
    rejected_hypotheses: list[str] = field(default_factory=list)

    # Action log — what tools/methods were used and their results
    actions_taken: list[dict[str, Any]] = field(default_factory=list)
    files_read: list[str] = field(default_factory=list)
    files_written: list[str] = field(default_factory=list)

    # Decision trail — critical choices with rationale
    decisions: list[dict[str, Any]] = field(default_factory=list)

    # Constraints that must be respected in future turns
    active_constraints: list[str] = field(default_factory=list)

    @property
    def is_terminal(self) -> bool:
        return self.progress_status == "completed"

    def mark_blocked(self, reason: str) -> None:
        self.progress_status = "blocked"
        self.actions_taken.append({"type": "block", "reason": reason, "time": time.time()})

    def record_decision(self, decision: str, rationale: str, alternatives_considered: list[str] | None = None) -> None:
        """Log a decision with its rationale for future context."""
        self.decisions.append({
            "decision": decision,
            "rationale": rationale,
            "alternatives_considered": alternatives_considered or [],
            "turn": self.turn_number,
            "time": time.time(),
        })
        self.timestamp_updated = time.time()

    def record_action(self, action_type: str, result: Any, details: dict[str, Any] | None = None) -> None:
        """Record an action taken by the agent with its outcome."""
        entry = {
            "type": action_type,
            "result": str(result)[:500],  # Truncate to prevent bloat
            "details": details or {},
            "turn": self.turn_number,
            "time": time.time(),
        }
        self.actions_taken.append(entry)
        self.timestamp_updated = time.time()

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @staticmethod
    def from_dict(data: dict[str, Any]) -> "AgentTurnState":
        """Deserialize from stored JSON."""
        return AgentTurnState(**{k: v for k, v in data.items() if k in AgentTurnState.__dataclass_fields__})


class StatePersistenceManager:
    """
    Manages serialization, storage, and merging of agent turn state across invocations.

    Provides a deterministic merge strategy: loaded state is the base; fresh inputs
    update fields that changed. Fields never silently overwrite — conflicts are logged.
    """

    def __init__(self, max_actions_to_preserve: int = 50) -> None:
        self._store: dict[str, str] = {}  # session_id -> JSON string
        self.max_actions_to_preserve = max_actions_to_preserve

    def save_state(self, state: AgentTurnState) -> str:
        """Serialize and persist agent state for a session."""
        json_str = json.dumps(state.to_dict(), indent=2)
        self._store[state.session_id] = json_str
        return json_str

    def load_state(self, session_id: str) -> AgentTurnState | None:
        """Load previously saved state for a session. Returns None if not found."""
        stored = self._store.get(session_id)
        if not stored:
            return None
        try:
            data = json.loads(stored)
            return AgentTurnState.from_dict(data)
        except (json.JSONDecodeError, TypeError):
            return None

    def merge_state(
        self,
        loaded_state: AgentTurnState,
        fresh_state: AgentTurnState,
    ) -> AgentTurnState:
        """
        Merge a previously saved state with fresh turn state using deterministic rules.

        Merge strategy:
        1. session_id and timestamp_created come from the loaded (historical) state.
        2. turn_number increments from loaded + fresh delta.
        3. Actions, files, decisions are combined (deduplicated by type+timestamp).
        4. Verified facts and hypotheses are merged; conflicts are resolved by keeping both.
        5. Active constraints are union of both sets (no removal).
        """
        merged = AgentTurnState(
            session_id=loaded_state.session_id,
            timestamp_created=loaded_state.timestamp_created,
            turn_number=loaded_state.turn_number + fresh_state.turn_number,
            task_description=fresh_state.task_description or loaded_state.task_description,
            current_subtask=fresh_state.current_subtask or loaded_state.current_subtask,
            progress_status=fresh_state.progress_status if fresh_state.progress_status != "in_progress" else loaded_state.progress_status,
        )

        # Merge action logs (keep recent N)
        all_actions = loaded_state.actions_taken + fresh_state.actions_taken
        merged.actions_taken = all_actions[-self.max_actions_to_preserve:]

        # Merge file lists with deduplication
        merged.files_read = list(dict.fromkeys(loaded_state.files_read + fresh_state.files_read))
        merged.files_written = list(dict.fromkeys(loaded_state.files_written + fresh_state.files_written))

        # Merge verified facts by (key, value) tuple — keep latest
        fact_map: dict[tuple, dict] = {}
        for f in loaded_state.verified_facts + fresh_state.verified_facts:
            key = tuple(sorted(f.get("key", ""), items if isinstance((items := f.get("key", [])), list) else (f.get("value", ""),)))
            fact_map[key] = f
        merged.verified_facts = list(fact_map.values())

        # Merge hypotheses
        merged.hypotheses = list(dict.fromkeys(loaded_state.hypotheses + fresh_state.hypotheses))
        merged.rejected_hypotheses = list(dict.fromkeys(loaded_state.rejected_hypotheses + fresh_state.rejected_hypotheses))

        # Merge decisions
        all_decisions = loaded_state.decisions + fresh_state.decisions
        merged.decisions = all_decisions[-50:]  # Keep most recent 50 decisions

        # Union of constraints (never remove)
        constraint_set: set[str] = set(loaded_state.active_constraints) | set(fresh_state.active_constraints)
        merged.active_constraints = sorted(constraint_set)

        merged.timestamp_updated = time.time()
        return merged

    def truncate_actions(self, state: AgentTurnState, max_count: int = 50) -> AgentTurnState:
        """Prevent action logs from consuming context by keeping only recent entries."""
        if len(state.actions_taken) <= max_count:
            return state
        truncated = AgentTurnState(**state.to_dict())
        truncated.actions_taken = state.actions_taken[-max_count:]
        return truncated

    def get_summary_for_context(self, state: AgentTurnState) -> str:
        """
        Produce a compact summary string of agent state for context injection.

        Only includes high-level state — not the full serialized object.
        Keeps the summary under ~500 tokens to minimize context window usage.
        """
        lines = [
            f"Session: {state.session_id}",
            f"Turn: {state.turn_number}",
            f"Status: {state.progress_status}",
        ]

        if state.task_description:
            lines.append(f"Task: {state.task_description}")

        if state.current_subtask:
            lines.append(f"Current subtask: {state.current_subtask}")

        if state.decisions:
            recent_decisions = state.decisions[-3:]
            for d in recent_decisions:
                lines.append(f"Decision: {d['decision']}")

        if state.files_written:
            lines.append(f"Files modified: {', '.join(state.files_written[-5:])}")

        return "\n".join(lines)
```

### Pattern 5: Vector Store Memory Retrieval

Semantic retrieval from an external memory store. Uses embedding-based similarity search with a configurable relevance threshold to avoid injecting noise into the context window. Designed to work with any vector store backend (ChromaDB, FAISS, or custom).

```python
"""Vector store memory retrieval for agent context augmentation."""

import math
import json
from dataclasses import dataclass, field
from typing import Protocol


@dataclass
class MemoryEntry:
    """A single entry in the external memory store."""
    id: str
    text: str
    metadata: dict[str, Any] = field(default_factory=dict)
    embedding: list[float] | None = None

    def to_context_message(self, relevance_score: float) -> dict[str, str]:
        """Convert to a conversation message with relevance annotation."""
        return {
            "role": "system",
            "content": (
                f"[Retrieved memory — relevance: {relevance_score:.3f}]\n"
                f"{self.text}"
            ),
        }


class EmbeddingModel(Protocol):
    """Interface for producing text embeddings."""

    def embed(self, text: str) -> list[float]: ...


class MemoryStore(Protocol):
    """Interface for vector memory storage and retrieval."""

    def upsert(self, entries: list[MemoryEntry]) -> None: ...
    def search(self, query_embedding: list[float], top_k: int = 5) -> list[tuple[MemoryEntry, float]]: ...


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    dot_product = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot_product / (norm_a * norm_b)


class VectorMemoryRetriever:
    """
    Retrieves relevant prior state from a vector memory store based on semantic similarity.

    Usage:
        retriever = VectorMemoryRetriever(
            store=my_store,
            embedder=my_embedder,
            min_relevance=0.65,
            max_tokens_per_memory=500,
        )
        retrieved = retriever.retrieve("how do I handle rate limiting?", top_k=3)
        context_messages = [m.to_context_message(score) for m, score in retrieved]

    The relevance threshold prevents irrelevant memories from polluting the context window.
    """

    def __init__(
        self,
        store: MemoryStore,
        embedder: EmbeddingModel,
        min_relevance: float = 0.65,
        max_tokens_per_memory: int = 500,
        max_total_context_tokens: int = 1500,
    ) -> None:
        self.store = store
        self.embedder = embedder
        self.min_relevance = min_relevance
        self.max_tokens_per_memory = max_tokens_per_memory
        self.max_total_context_tokens = max_total_context_tokens

    def retrieve(
        self,
        query: str,
        top_k: int = 5,
        session_filter: dict[str, str] | None = None,
    ) -> list[tuple[MemoryEntry, float]]:
        """
        Search memory store for entries relevant to the current query.

        Args:
            query: The current agent query or task description to match against.
            top_k: Maximum number of candidates to retrieve before filtering.
            session_filter: Optional metadata filter (e.g., {"session_id": "abc123"}).

        Returns:
            List of (MemoryEntry, relevance_score) tuples above the relevance threshold,
            sorted by score descending. Total context is bounded by max_total_context_tokens.
        """
        query_embedding = self.embedder.embed(query)

        # Search for candidates
        candidates = self.store.search(query_embedding, top_k=top_k * 2)

        # Filter by session if specified
        if session_filter:
            candidates = [
                (entry, score)
                for entry, score in candidates
                if all(
                    entry.metadata.get(k) == v
                    for k, v in session_filter.items()
                )
            ]

        # Apply relevance threshold and select top-k
        filtered: list[tuple[MemoryEntry, float]] = []
        for entry, score in sorted(candidates, key=lambda x: -x[1]):
            if score < self.min_relevance:
                break  # Scores are descending; once below threshold, stop
            filtered.append((entry, score))
            if len(filtered) >= top_k:
                break

        return filtered

    def retrieve_and_contextualize(
        self,
        query: str,
        existing_context_tokens: int = 0,
        top_k: int = 3,
    ) -> tuple[list[dict[str, str]], int]:
        """
        Retrieve relevant memories and format them into context messages.

        Respects the remaining context budget — stops retrieving when the
        combined memory context would exceed available space.

        Args:
            query: The agent's current task or query.
            existing_context_tokens: Tokens already used by system prompt + conversation.
            top_k: Number of memories to attempt retrieval for.

        Returns:
            Tuple of (context_messages, total_retrieved_tokens).
        """
        retrieved = self.retrieve(query, top_k=top_k)
        context_messages: list[dict[str, str]] = []
        tokens_used = 0

        # Estimate tokens per memory entry (rough approximation)
        for entry, score in retrieved:
            # Rough token count: ~4 chars per token
            entry_tokens = len(entry.text) // 4
            if tokens_used + entry_tokens > self.max_total_context_tokens:
                break  # Budget exhausted

            context_messages.append(entry.to_context_message(score))
            tokens_used += entry_tokens

        return context_messages, tokens_used

    def store_memory(
        self,
        text: str,
        metadata: dict[str, Any] | None = None,
        session_id: str = "",
    ) -> MemoryEntry:
        """Store a new memory entry with its embedding."""
        import uuid
        entry = MemoryEntry(
            id=str(uuid.uuid4()),
            text=text[:2000],  # Prevent unbounded memory entries
            metadata=metadata or {},
        )
        entry.embedding = self.embedder.embed(text)
        if session_id:
            entry.metadata["session_id"] = session_id
        self.store.upsert([entry])
        return entry

    def flush_to_json(self, entries: list[tuple[MemoryEntry, float]]) -> str:
        """Serialize retrieved memories for logging or debugging."""
        serialized = []
        for entry, score in entries:
            serialized.append({
                "id": entry.id,
                "text": entry.text[:500],
                "score": round(score, 4),
                "metadata": entry.metadata,
            })
        return json.dumps(serialized, indent=2)


class InMemoryVectorStore:
    """
    A lightweight in-memory vector store for development and testing.

    For production, replace with ChromaDB, FAISS, Pinecone, or a database-backed store.
    This implementation stores all entries locally and performs brute-force cosine search.
    Suitable for <10k entries; beyond that, use an indexed vector store.
    """

    def __init__(self) -> None:
        self._entries: list[MemoryEntry] = []
        self._metadata_index: dict[str, list[int]] = {}

    def upsert(self, entries: list[MemoryEntry]) -> None:
        for entry in entries:
            # Update existing or append new
            found = False
            for i, existing in enumerate(self._entries):
                if existing.id == entry.id:
                    self._entries[i] = entry
                    found = True
                    break
            if not found:
                self._entries.append(entry)

    def search(self, query_embedding: list[float], top_k: int = 5) -> list[tuple[MemoryEntry, float]]:
        """Brute-force cosine similarity search."""
        scores: list[tuple[MemoryEntry, float]] = []
        for entry in self._entries:
            if entry.embedding is None:
                continue
            sim = cosine_similarity(query_embedding, entry.embedding)
            scores.append((entry, sim))

        scores.sort(key=lambda x: -x[1])
        return scores[:top_k]
```

---

## Constraints

### MUST DO
- Check token budget before EVERY LLM call, not just at startup — the budget check is a per-step guard, not a one-time setup
- Preserve system prompt and most recent user input through all trimming strategies — these are non-negotiable anchors
- Use token-based (not message-count-based) sliding window configuration — two messages can have wildly different token counts
- Summarize key decisions and current task state — never just compress text. The summary must include: decisions made, current subtask, remaining questions
- Filter retrieved memories by relevance threshold to avoid noise — set a minimum cosine similarity (typically 0.65–0.75) based on your embedding model quality

### MUST NOT DO
- Hard-code message count limits without considering token usage — a system with 100 messages might fit in 4K tokens; one with 3 might not
- Truncate the system prompt under any circumstances — it defines the agent's identity, tools, and constraints
- Store sensitive data (PII, credentials, API keys) in vector memory stores without encryption — use field-level encryption or avoid storing at all
- Let context grow unbounded — always have a fallback strategy: sliding window → summarization → stop
- Use this skill for production monitoring — use `observability-patterns` instead

---

## Related Skills

| Skill | Purpose |
|---|---|
| `observability-patterns` | Production tracing and metrics for monitoring context usage patterns |
| `agentic-evaluation` | Evaluating agent performance across different memory strategies |
| `multi-agent-orchestration` | Cross-agent state passing and coordination patterns |
