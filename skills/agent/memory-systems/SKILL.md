---




name: memory-systems
description: Implements conversation memory patterns (bounded buffers, auto-summarization, vector-backed long-term storage) for AI agent context management and factual recall.
archetypes:
  - tactical
  - orchestration
anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
response_profile:
  verbosity: medium
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: agent
  triggers: conversation memory, long-term memory, vector store, embedding, context window, auto-summarization, chat history, semantic memory
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: tool-use-function-calling, agent-context-management, user-memory-system
  maturity: stable
  completeness: 95




---





# AI Agent Memory Systems

Implements conversation memory patterns that keep AI agents coherent across extended interactions. Provides bounded conversation buffers with turn limits and token budgets, auto-summarization of stale turns to preserve conversational continuity, and vector-backed long-term storage for semantic recall of facts discovered during agent sessions. A well-architected memory system is the backbone of any production-grade agent — without it, every prompt starts from zero and every session forgets what happened five minutes ago.

## TL;DR Checklist

- [ ] Set bounded conversation buffer with explicit turn limits and token budget tracking before each model call
- [ ] Implement sliding window truncation that preserves system prompt and recent turns while discarding oldest messages first
- [ ] Detect memory pressure using token ratio thresholds (warn at 70%, trigger summary at 85%)
- [ ] Configure vector store backend (FAISS, Chroma, or Qdrant) with appropriate embeddings model for the target domain
- [ ] Run similarity search with configurable top-k and minimum score before injecting memories into context
- [ ] Reference `code-philosophy` (5 Laws of Elegant Defense) — parse inputs at boundaries, fail fast on invalid states, never mutate shared state

---

## When to Use

Use this skill when:

- Building an AI agent that must maintain coherent conversation across many turns (10+)
- Designing memory architecture for a chat application where context window limits are a constraint
- Implementing long-term factual recall so the agent remembers information from earlier in a session
- Needing to compress old conversation turns into summaries before hitting context token limits
- Building a RAG-enhanced agent that combines short-term buffer with vector-backed semantic retrieval
- Integrating memory management into an existing agent framework (LangChain, LlamaIndex, custom)

---

## When NOT to Use

Avoid this skill for:

- Single-turn interactions where no conversation history needs preservation — the overhead outweighs any benefit
- Ultra-low-latency inference contexts (<50ms response budget) — vector similarity search and summarization add measurable latency
- Simple echo or passthrough chatbots that do not need memory of prior turns — just append to a raw list
- Sessions where the full conversation fits comfortably within the model's context window with significant headroom (<40% utilization)

---

## Orchestration Flow

```
User Input ──► Token Budget Check ─────────────────────────────────┐
                          ↓                                        │
              ┌───────────▼───────────┐                            │
              │  Memory Pressure?     │                            │
              │                       │                            │
              │  < 70%: Full pass    │                            │
              │  70-85%: Log warning │                            │
              │  > 85%: Summarize    │                            │
              └───────────┬───────────┘                            │
                          ↓                                        │
              ┌───────────▼───────────┐                            │
              │ Short-Term Buffer     │◄──────────────┐            │
              │ (bounded window)      │               │            │
              └───────────┬───────────┘               │            │
                          ↓                           │            │
              ┌───────────▼───────────┐               │            │
              │ Long-Term Memory      │               │            │
              │ (vector store query)  │               │            │
              └───────────┬───────────┘               │            │
                          ↓                           │            │
              ┌───────────▼───────────┐               │            │
              │ Assemble Prompt:      │               │            │
              │ System + Memories +   │               │            │
              │ Recent History        │               │            │
              └───────────┬───────────┘               │            │
                          ↓                           │            │
              ┌───────────▼───────────┐               │            │
              │ Model Call            │               │            │
              └───────────┬───────────┘               │            │
                          ↓                           │            │
              ┌───────────▼───────────┐               │            │
              │ Store Turn in Buffer  │───────────────┘            │
              │ Extract facts → Store │                            │
              └───────────────────────────────────────────────────┘
```

---

## Core Workflow

### Step 1: Configure Short-Term Memory

Set up a bounded conversation buffer that enforces turn limits and tracks token consumption. The buffer must never grow unbounded — every model call starts from a known, bounded state. Use both a maximum message count (N recent turns) and a maximum token budget (tokens for dynamic content only).

```python
"""
Bounded conversation memory with token-aware window management.

Enforces turn limits via configurable max_messages and tracks cumulative
token usage through an optional tokenizer callback. The buffer supports
append-only operations with automatic eviction of oldest messages when
budget constraints are exceeded.

Designed for production agents that must maintain coherent context
across extended conversations without exceeding model context windows.
"""

from __future__ import annotations

import logging
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable, Optional

logger = logging.getLogger(__name__)


@dataclass
class ConversationMessage:
    """A single message in the conversation buffer.

    Attributes:
        role: The sender role ('system', 'user', 'assistant', or 'tool').
        content: The message text content.
        tokens: Cached token count, computed lazily via tokenizer.
        timestamp: When this message was added to the buffer.
        metadata: Optional structured data (e.g., tool call results, citations).
    """

    role: str
    content: str
    tokens: int = 0
    timestamp: datetime = field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        """Serialize this message for API transmission."""
        return {
            "role": self.role,
            "content": self.content,
            **self.metadata if self.metadata else {},
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> ConversationMessage:
        """Deserialize a message from API format."""
        return cls(
            role=data["role"],
            content=data["content"],
            metadata={k: v for k, v in data.items() if k not in ("role", "content")},
        )


class BoundedConversationBuffer:
    """Bounded conversation buffer with token-aware window management.

    Maintains a deque of ConversationMessage instances, enforcing both
    a maximum message count and a maximum token budget for dynamic
    (non-system) content. System messages are always preserved regardless
    of budget — only user/assistant/tool messages are evicted.

    Follows Law 3 (Atomic Predictability): all mutations return explicit
    confirmation and never mutate the caller's input data.
    """

    def __init__(
        self,
        max_messages: int = 50,
        max_tokens: int = 128_000,
        system_message_max_tokens: Optional[int] = None,
        tokenizer: Optional[Callable[[str], int]] = None,
    ) -> None:
        """Initialize the bounded conversation buffer.

        Args:
            max_messages: Maximum number of dynamic messages to retain (excl. system).
                Evicts oldest first when exceeded. Set 0 for unlimited count.
            max_tokens: Token budget for dynamic messages (excl. system prompt).
                When exceeded, oldest messages are evicted until under budget.
                Set 0 for unlimited tokens.
            system_message_max_tokens: Optional hard limit for total system message tokens.
            tokenizer: Callable that returns token count for a string.
                If None, uses a rough character-based estimate (~4 chars/token).
        """
        self._max_messages = max_messages
        self._max_tokens = max_tokens
        self._system_message_max_tokens = system_message_max_tokens or 0
        self._tokenizer = tokenizer or (lambda text: len(text) // 4)
        self._messages: deque[ConversationMessage] = deque()
        self._dynamic_token_count: int = 0
        self._static_token_count: int = 0

    @property
    def message_count(self) -> int:
        """Total number of messages in the buffer."""
        return len(self._messages)

    @property
    def dynamic_token_count(self) -> int:
        """Token count for non-system (dynamic) messages only."""
        return self._dynamic_token_count

    @property
    def static_token_count(self) -> int:
        """Token count for system/developer messages."""
        return self._static_token_count

    @property
    def total_token_count(self) -> int:
        """Total token count across all messages."""
        return self._dynamic_token_count + self._static_token_count

    @property
    def utilization_ratio(self) -> float:
        """Ratio of current dynamic tokens to the budget (0.0 - 1.0+)."""
        if self._max_tokens <= 0:
            return 0.0
        return self._dynamic_token_count / self._max_tokens

    @property
    def is_under_budget(self) -> bool:
        """Whether the buffer is within both message count and token budgets."""
        if self._max_messages > 0 and len(self._messages) >= self._max_messages:
            return False
        if self._max_tokens > 0 and self._dynamic_token_count > self._max_tokens:
            return False
        return True

    def add_system_message(self, content: str, metadata: Optional[dict[str, Any]] = None) -> None:
        """Add or replace the system message. Always preserved regardless of budget.

        Args:
            content: The system prompt text.
            metadata: Optional metadata attached to this message.
        """
        # Remove existing system messages if present
        self._messages = deque(
            msg for msg in self._messages if msg.role not in ("system", "developer")
        )
        self._static_token_count -= self.total_system_tokens

        token_count = self._tokenizer(content)

        if self._system_message_max_tokens > 0 and token_count > self._system_message_max_tokens:
            logger.warning(
                "System message (%d tokens) exceeds max budget (%d). Truncating.",
                token_count,
                self._system_message_max_tokens,
            )

        msg = ConversationMessage(
            role="system",
            content=content,
            tokens=token_count,
            metadata=metadata or {},
        )
        self._messages.appendleft(msg)
        self._static_token_count += token_count

    def append(self, role: str, content: str, metadata: Optional[dict[str, Any]] = None) -> bool:
        """Append a message to the buffer, evicting old messages if needed.

        Args:
            role: The message role ('user', 'assistant', or 'tool').
            content: The message content text.
            metadata: Optional structured data for this message.

        Returns:
            True if the message was added successfully, False if budget exceeded
            and all dynamic messages were already evicted.
        """
        if role in ("system", "developer"):
            raise ValueError(f"Use add_system_message() for system roles, got '{role}'")

        token_count = self._tokenizer(content)

        # Evict oldest messages until budget is satisfied
        while not self.is_under_budget and self._messages:
            oldest = self._messages[0]
            if oldest.role in ("system", "developer"):
                break  # Never evict system messages
            self._dynamic_token_count -= oldest.tokens
            self._messages.popleft()

        new_msg = ConversationMessage(
            role=role,
            content=content,
            tokens=token_count,
            metadata=metadata or {},
        )
        self._messages.append(new_msg)
        self._dynamic_token_count += token_count

        return True

    def get_history(self) -> list[dict[str, Any]]:
        """Return the full conversation history as a list of API-compatible dicts.

        Preserves order: system message first, then chronological messages.
        """
        return [msg.to_dict() for msg in self._messages]

    def get_recent_messages(self, n: int = 10) -> list[dict[str, Any]]:
        """Return the N most recent messages (excluding system)."""
        dynamic = [m for m in reversed(self._messages) if m.role not in ("system", "developer")]
        return [m.to_dict() for m in dynamic[:n]]

    @property
    def total_system_tokens(self) -> int:
        """Sum of tokens used by all system/developer messages."""
        return sum(m.tokens for m in self._messages if m.role in ("system", "developer"))

    def reset(self) -> None:
        """Clear all dynamic messages, preserving only the system message.

        Useful when starting a new sub-task within an agent workflow.
        """
        self._messages = deque(
            msg for msg in self._messages if msg.role in ("system", "developer")
        )
        self._dynamic_token_count = 0

    def __repr__(self) -> str:
        return (
            f"BoundedConversationBuffer(messages={len(self._messages)}, "
            f"tokens={self.total_token_count}/{self._max_tokens}, "
            f"utilization={self.utilization_ratio:.1%})"
        )
```

**Checkpoint:** After configuring the buffer, verify that `is_under_budget` returns True and that system messages are preserved after any eviction cycle. The token budget should account for 60-70% of the model's maximum context window, leaving headroom for retrieval-augmented memories and tool output.

---

### Step 2: Implement Context Window Bounds Management

When memory pressure is detected (utilization ratio crosses thresholds), apply graduated responses: log warnings at 70%, begin truncating oldest messages at 85%, and trigger auto-summarization above 95%. Never silently drop messages — always record what was compressed.

```python
"""
Context window bounds management with graduated memory pressure response.

Tracks token usage against model context limits and triggers appropriate
compression actions when thresholds are crossed. Ensures system instructions,
recent conversation, and retrieved memories all fit within budget.
"""


class ContextWindowManager:
    """Manages the agent's active context window with graduated pressure response.

    Works alongside BoundedConversationBuffer to enforce hard context limits.
    When the buffer approaches capacity, this manager selects the appropriate
    compression strategy based on current utilization and available strategies.
    """

    # Pressure thresholds as fractions of max_tokens budget
    WARN_THRESHOLD: float = 0.70
    TRUNCATE_THRESHOLD: float = 0.85
    SUMMARIZE_THRESHOLD: float = 0.95

    def __init__(
        self,
        buffer: BoundedConversationBuffer,
        summary_handler: Optional[Any] = None,
    ) -> None:
        """Initialize the context window manager.

        Args:
            buffer: The bounded conversation buffer to monitor.
            summary_handler: Callable that accepts a list of messages and returns
                a compressed summary string. Required when SUMMARIZE_THRESHOLD
                is reachable. Signature: (messages: list[dict]) -> str.
        """
        self._buffer = buffer
        self._summary_handler = summary_handler
        self._pressure_log: list[dict[str, Any]] = []

    def check_and_compress(self) -> dict[str, Any]:
        """Evaluate memory pressure and apply appropriate compression.

        Returns a dict with the action taken and its impact on token count.
        Possible actions: 'none', 'log_warning', 'truncate_oldest', 'summarize'.

        Returns:
            Action result describing what compression was applied (if any).
        """
        utilization = self._buffer.utilization_ratio

        if utilization < self.WARN_THRESHOLD:
            return {"action": "none", "utilization": round(utilization, 3)}

        if utilization < self.TRUNCATE_THRESHOLD:
            action_result = self._log_warning_and_truncate()
            return {**action_result, "action": "log_warning"}

        if utilization < self.SUMMARIZE_THRESHOLD:
            action_result = self._truncate_oldest_messages()
            return {**action_result, "action": "truncate_oldest"}

        # Above summarize threshold — requires summary handler
        if self._summary_handler is None:
            logger.error(
                "Memory pressure at %.1f%% but no summary handler configured.",
                utilization * 100,
            )
            return {"action": "error", "reason": "no_summary_handler"}

        action_result = self._trigger_summarization()
        return {**action_result, "action": "summarize"}

    def _log_warning_and_truncate(self) -> dict[str, Any]:
        """Log a warning and evict the single oldest dynamic message."""
        old_count = self._buffer.dynamic_token_count
        if self._buffer.is_under_budget:
            return {"tokens_freed": 0}

        # Remove oldest non-system message
        for msg in list(self._buffer._messages):
            if msg.role not in ("system", "developer"):
                self._buffer._dynamic_token_count -= msg.tokens
                self._buffer._messages.remove(msg)
                break

        new_count = self._buffer.dynamic_token_count
        freed = old_count - new_count

        logger.warning(
            "Memory pressure at %.1f%% — evicted oldest message, freed %d tokens",
            self._buffer.utilization_ratio * 100,
            freed,
        )
        return {"tokens_freed": freed}

    def _truncate_oldest_messages(self) -> dict[str, Any]:
        """Evict oldest messages until utilization drops below truncate threshold."""
        target_utilization = self.TRUNCATE_THRESHOLD - 0.05  # Small safety margin
        target_tokens = int(self._buffer._max_tokens * target_utilization)

        old_count = self._buffer.dynamic_token_count
        while (
            self._buffer.dynamic_token_count > target_tokens
            and self._buffer._messages
        ):
            for msg in list(self._buffer._messages):
                if msg.role not in ("system", "developer"):
                    self._buffer._dynamic_token_count -= msg.tokens
                    self._buffer._messages.remove(msg)
                    break
            else:
                break  # No more dynamic messages to remove

        new_count = self._buffer.dynamic_token_count
        freed = old_count - new_count

        logger.info(
            "Truncated %d messages, freed %d tokens (utilization now %.1f%%)",
            max(1, len([m for m in self._buffer._messages if m.role not in ("system", "developer")])),
            freed,
            (self._buffer.dynamic_token_count / max(self._buffer._max_tokens, 1)) * 100,
        )
        return {"tokens_freed": freed}

    def _trigger_summarization(self) -> dict[str, Any]:
        """Compress old messages via the summary handler.

        Keeps recent messages raw and replaces older turns with a structured summary.
        The summary preserves: goals discovered, facts learned, pending actions, constraints.
        """
        # Separate system messages from dynamic history
        static_msgs = [m for m in self._buffer._messages if m.role in ("system", "developer")]
        dynamic_msgs = [m.to_dict() for m in self._buffer._messages if m.role not in ("system", "developer")]

        if len(dynamic_msgs) < 6:
            # Not enough history to meaningfully summarize — just truncate
            return self._truncate_oldest_messages()

        # Keep the last 4 turns raw; summarize the rest
        recent_turns = dynamic_msgs[-4:]
        older_turns = dynamic_msgs[:-4]

        if not older_turns:
            return {"tokens_freed": 0}

        try:
            summary_text = self._summary_handler(older_turns)
        except Exception as exc:
            logger.error("Summarization failed: %s — falling back to truncation", exc)
            return self._truncate_oldest_messages()

        # Replace old messages with a single summary message
        old_dynamic_count = len(dynamic_msgs)
        summary_msg = ConversationMessage(
            role="assistant",
            content=summary_text,
            tokens=self._buffer._tokenizer(summary_text),
            metadata={"source": "auto_summary", "turns_compressed": old_dynamic_count - 4},
        )

        self._buffer._messages.clear()
        for msg in static_msgs:
            self._buffer._messages.append(msg)
        self._buffer._messages.append(summary_msg)
        for msg_dict in recent_turns:
            self._buffer._messages.append(ConversationMessage.from_dict(msg_dict))

        freed = old_dynamic_count * (self._buffer.dynamic_token_count / max(old_dynamic_count, 1))
        return {
            "tokens_freed": int(freed),
            "turns_compressed": len(older_turns),
            "summary_tokens": summary_msg.tokens,
        }

    def get_pressure_status(self) -> dict[str, Any]:
        """Return current pressure status for monitoring and telemetry.

        Returns:
            Dict with utilization, threshold levels, and recommended action.
        """
        util = self._buffer.utilization_ratio
        if util < self.WARN_THRESHOLD:
            recommended = "none"
        elif util < self.TRUNCATE_THRESHOLD:
            recommended = "log_warning_and_truncate"
        elif util < self.SUMMARIZE_THRESHOLD:
            recommended = "truncate_oldest_messages"
        else:
            recommended = "trigger_summarization"

        return {
            "utilization": round(util, 3),
            "dynamic_tokens": self._buffer.dynamic_token_count,
            "max_tokens": self._buffer._max_tokens,
            "message_count": self._buffer.message_count,
            "recommended_action": recommended,
        }
```

**Checkpoint:** After compression, verify the buffer's `utilization_ratio` has dropped below the target threshold. If summarization was triggered, confirm the summary message includes a `source: auto_summary` metadata tag for auditing purposes.

---

### Step 3: Implement Auto-Summarization of Old Turns

When the buffer crosses the summarize threshold, compress older conversation turns into a condensed summary that preserves goals, facts, pending actions, and constraints. The summarizer should be lightweight — typically using a smaller model or distilled prompt — to avoid introducing significant latency into the agent's main loop.

```python
"""
Auto-summarization engine for compressing old conversation turns.

Detects memory pressure from bounded buffer utilization and produces
structured summaries of older messages while preserving conversational
continuity through recent turns kept in raw form.

The summarizer preserves four categories of information:
  1. User goals and objectives stated during the session
  2. Facts discovered or confirmed (data points, configurations)
  3. Pending actions and commitments made by the agent
  4. Constraints and preferences that shaped earlier decisions
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Optional


@dataclass
class SummaryResult:
    """Structured output from summarizing old conversation turns."""

    compressed_text: str
    turns_compressed: int
    tokens_before: int
    tokens_after: int
    preserved_categories: list[str]

    @property
    def compression_ratio(self) -> float:
        """Ratio of before/after token count (>1.0 means reduction)."""
        if self.tokens_after == 0:
            return 0.0
        return self.tokens_before / self.tokens_after


class ConversationSummarizer:
    """Compresses older conversation turns into structured summaries.

    Preserves conversational continuity by maintaining recent messages in raw form
    while replacing older turns with a condensed summary. The summary is organized
    into four categories for efficient retrieval and parsing by downstream agents.

    BAD vs GOOD example:
        ❌ BAD: Naive truncation that drops all context before index N,
               destroying goals discovered mid-conversation and any
               constraints the user stated early on.
        ✅ GOOD: Structured compression that preserves semantic intent —
                 the "what" and "why" of each conversation segment — while
                 discarding verbose exchanges that don't affect ongoing tasks.
    """

    # Minimum turns needed before summarization is meaningful
    MIN_TURNS_BEFORE_SUMMARIZE: int = 6

    def __init__(
        self,
        llm_summarizer: Optional[Any] = None,
        fallback_max_summary_length: int = 500,
    ) -> None:
        """Initialize the summarizer.

        Args:
            llm_summarizer: An LLM client with a chat() method that accepts
                [messages: list[dict], model: str] and returns a string.
                If None, uses rule-based fallback summarization.
            fallback_max_summary_length: Maximum character length for the
                rule-based fallback summary when no LLM is available.
        """
        self._llm_summarizer = llm_summarizer
        self._fallback_max_length = fallback_max_summary_length

    def summarize(
        self,
        older_messages: list[dict[str, Any]],
        tokenizer: Optional[callable[[str], int]] = None,
    ) -> SummaryResult:
        """Compress older conversation turns into a structured summary.

        Uses the configured LLM summarizer when available; falls back to
        rule-based extraction that preserves key categories from the text.

        Args:
            older_messages: List of message dicts from older turns (oldest first).
                These are the messages to compress. Recent messages should be
                kept separate and passed to append() directly on the buffer.
            tokenizer: Optional token counter for measuring compression ratio.

        Returns:
            SummaryResult with compressed text, turn count, and metrics.

        Raises:
            ValueError: If fewer than MIN_TURNS_BEFORE_SUMMARIZE messages provided.
        """
        if len(older_messages) < self.MIN_TURNS_BEFORE_SUMMARIZE:
            raise ValueError(
                f"Need at least {self.MIN_TURNS_BEFORE_SUMMARIZE} turns to summarize, "
                f"got {len(older_messages)}"
            )

        token_count_fn = tokenizer or (lambda text: len(text) // 4)

        # Try LLM-based summarization first
        if self._llm_summarizer is not None:
            return self._llm_based_summary(older_messages, token_count_fn)

        # Rule-based fallback
        return self._rule_based_summary(older_messages, token_count_fn)

    def _llm_based_summary(
        self,
        messages: list[dict[str, Any]],
        token_count_fn: callable[[str], int],
    ) -> SummaryResult:
        """Use an LLM to produce a high-fidelity summary of old turns.

        The prompt explicitly requests four preservation categories so the
        downstream agent can parse structured context from the compressed form.
        """
        conversation_text = "\n".join(
            f"[{msg['role']}] {msg['content']}" for msg in messages
        )

        summary_prompt = (
            "Summarize the following conversation turns. Preserve exactly four categories:\n"
            "1. GOALS: User's stated objectives and tasks to accomplish\n"
            "2. FACTS: Confirmed data points, configurations, preferences discovered\n"
            "3. ACTIONS: Pending actions or commitments the agent agreed to perform\n"
            "4. CONSTRAINTS: Constraints, preferences, or rules established during conversation\n\n"
            f"Conversation turns:\n{conversation_text}\n\n"
            "Return only the four categories with bullet points under each."
        )

        try:
            result = self._llm_summarizer.chat(
                messages=[{"role": "user", "content": summary_prompt}],
                model="summary-tiny-model",  # Use smallest/fastest model available
                max_tokens=512,
            )
            compressed_text = str(result).strip()
        except Exception as exc:
            logger.error("LLM summarization failed: %s — using fallback", exc)
            return self._rule_based_summary(messages, token_count_fn)

        tokens_before = sum(token_count_fn(msg["content"]) for msg in messages)
        tokens_after = token_count_fn(compressed_text)

        return SummaryResult(
            compressed_text=compressed_text,
            turns_compressed=len(messages),
            tokens_before=tokens_before,
            tokens_after=tokens_after,
            preserved_categories=["goals", "facts", "actions", "constraints"],
        )

    def _rule_based_summary(
        self,
        messages: list[dict[str, Any]],
        token_count_fn: callable[[str], int],
    ) -> SummaryResult:
        """Rule-based fallback summarization when no LLM is available.

        Extracts sentences that indicate goals, facts, actions, or constraints
        using keyword heuristics. Falls back to the first and last few messages
        if no heuristic matches are found.

        This approach has lower fidelity than LLM summarization but works in
        offline/embedded contexts without external model dependencies.
        """
        goals: list[str] = []
        facts: list[str] = []
        actions: list[str] = []
        constraints: list[str] = []

        goal_patterns = [r"\b(goal|objective|target|want to|need to|should)\b"]
        fact_patterns = [r"\bis\s+\w+", r"\b(found|discovered|confirmed|learned)\b"]
        action_patterns = [r"\bi'll\s+\w+", r"\bwould (be |to |have )\b", r"\balright.*let's\b"]
        constraint_patterns = [r"\b(must|should not|never|always|only if)\b"]

        for msg in messages:
            content_lower = msg.get("content", "").lower()
            role = msg.get("role", "unknown")

            # Skip system messages — they're handled separately by the buffer
            if role in ("system", "developer"):
                continue

            for pattern_group, target_list in [
                (goal_patterns, goals),
                (fact_patterns, facts),
                (action_patterns, actions),
                (constraint_patterns, constraints),
            ]:
                for pattern in pattern_group:
                    if re.search(pattern, content_lower):
                        # Take the first matching sentence fragment
                        sentences = re.split(r'[.!?]+', content_lower)
                        for sentence in sentences:
                            cleaned = sentence.strip()
                            if len(cleaned) > 20 and cleaned not in target_list:
                                target_list.append(cleaned[:200])
                        break

        # Build structured summary
        parts = []
        if goals:
            parts.append("GOALS: " + "; ".join(goals[:3]))
        if facts:
            parts.append("FACTS: " + "; ".join(facts[:5]))
        if actions:
            parts.append("ACTIONS: " + "; ".join(actions[:3]))
        if constraints:
            parts.append("CONSTRAINTS: " + "; ".join(constraints[:3]))

        # If no heuristics matched, fall back to first/last message summary
        if not parts and messages:
            first = messages[0].get("content", "")[:200]
            last = messages[-1].get("content", "")[:200]
            parts.append(f"Conversation context: began with '{first}...' and ended with '{last}...'")

        compressed_text = "\n".join(parts)

        # Enforce max length for fallback
        if len(compressed_text) > self._fallback_max_length:
            compressed_text = compressed_text[: self._fallback_max_length - 3] + "..."

        tokens_before = sum(token_count_fn(msg.get("content", "")) for msg in messages)
        tokens_after = token_count_fn(compressed_text)

        return SummaryResult(
            compressed_text=compressed_text,
            turns_compressed=len(messages),
            tokens_before=tokens_before,
            tokens_after=tokens_after,
            preserved_categories=parts[:4],
        )
```

**Checkpoint:** After summarization, verify the `compression_ratio` is at least 2.0 (summary is at least half the token size of the original turns). If not, the summary handler may need tuning or a larger model with better compression capability.

---

### Step 4: Connect Long-Term Memory Store

Set up a vector store backend for persistent semantic memory. The vector store holds structured facts and knowledge discovered during agent sessions, enabling retrieval by similarity rather than keyword match. Supported backends include FAISS (in-memory, fast), Chroma (disk-backed, simple), and Qdrant (distributed, production-grade). Configure the embedding model based on your domain — general-purpose text-embedding models work well for most agent memory use cases.

```python
"""
Vector store backed long-term memory for AI agents.

Provides semantic recall of facts and information discovered during agent
sessions. Memories are stored as embedded vectors in a vector database,
enabling similarity-based retrieval that goes beyond keyword matching.

Supports three backends: FAISS (fast in-memory), Chroma (simple disk-backed),
and Qdrant (production-grade distributed). Uses a unified interface so the
agent code doesn't need to know which backend is active.
"""

from __future__ import annotations

import logging
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional

logger = logging.getLogger(__name__)


@dataclass
class StoredMemory:
    """A single memory entry in the vector store.

    Memories are text chunks that have been embedded and stored with metadata
    for filtering and retrieval. Each memory has a unique ID, creation timestamp,
    access count (for recency bias), and associated tags.
    """

    memory_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    content: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    last_accessed: Optional[datetime] = None
    access_count: int = 0

    @property
    def age_hours(self) -> float:
        """Hours since this memory was created."""
        return (datetime.now(timezone.utc) - self.created_at).total_seconds() / 3600

    def record_access(self) -> None:
        """Record a retrieval access for recency scoring."""
        self.access_count += 1
        self.last_accessed = datetime.now(timezone.utc)


@dataclass
class RetrievalResult:
    """A single result from querying the vector store.

    Attributes:
        memory: The stored memory matched to the query.
        similarity_score: Floating point score (0.0-1.0) indicating relevance.
        rank: Position in the sorted results (1-based).
    """

    memory: StoredMemory
    similarity_score: float
    rank: int = 1


class EmbeddingProvider(ABC):
    """Abstract interface for generating text embeddings."""

    @abstractmethod
    def embed(self, text: str) -> list[float]:
        """Generate an embedding vector for the given text.

        Args:
            text: The text to embed (will be truncated if too long).

        Returns:
            A fixed-length float vector representing the text semantics.
        """
        ...

    @property
    @abstractmethod
    def dimension(self) -> int:
        """The dimensionality of embedding vectors produced by this provider."""
        ...


class FAISSEmbeddingProvider(EmbeddingProvider):
    """Embedding provider using a lightweight local model (sentence-transformers).

    In production, replace with an API-based provider. This demonstrates the
    interface contract that any embedding backend must satisfy.
    """

    def __init__(self, model_name: str = "all-MiniLM-L6-v2") -> None:
        self._model_name = model_name
        self._dimension = 384  # MiniLM-L6 output dimension

    @property
    def dimension(self) -> int:
        return self._dimension

    def embed(self, text: str) -> list[float]:
        """Generate embedding using sentence-transformers.

        In production, this would use the actual model pipeline.
        For skill documentation purposes, returns a deterministic placeholder
        that demonstrates the expected interface and output shape.
        """
        # Truncate to 512 tokens (typical embedding model limit)
        truncated = text[:1500]

        # In production: embeddings = self._pipeline(truncated)[0][0].tolist()
        # For documentation, use a deterministic hash-based placeholder
        import hashlib
        h = hashlib.sha256(truncated.encode()).hexdigest()
        # Generate 384 pseudo-random floats from the hash (deterministic for testing)
        return [float(int(h[i*2:i*2+2], 16)) / 65535.0 - 0.5 for i in range(384)]


class VectorMemoryStore:
    """Unified interface to vector-backed long-term memory storage.

    Wraps a specific vector store backend (FAISS, Chroma, or Qdrant) behind
    a common API for storing memories, querying by similarity, and managing
    memory lifecycle including recency bias and staleness pruning.

    Follows Law 3 (Atomic Predictability): add_memory returns confirmation;
    query returns new result lists without modifying stored state.
    """

    def __init__(
        self,
        embedding_provider: EmbeddingProvider,
        max_memories_per_query: int = 10,
        min_similarity_threshold: float = 0.5,
    ) -> None:
        """Initialize the vector memory store.

        Args:
            embedding_provider: Backend for generating text embeddings.
            max_memories_per_query: Maximum results to return per query.
            min_similarity_threshold: Minimum cosine similarity score to
                include a result (0.0-1.0). Higher = more precise, fewer results.
        """
        self._embedding_provider = embedding_provider
        self._max_per_query = max_memories_per_query
        self._min_similarity = min_similarity_threshold
        self._memories: list[StoredMemory] = []

    def add_memory(self, content: str, metadata: Optional[dict[str, Any]] = None) -> StoredMemory:
        """Store a new memory in the vector store.

        The content is embedded using the configured embedding provider.
        Metadata tags are stored alongside for filtering during retrieval.

        Args:
            content: The text content to store as a memory.
            metadata: Optional structured data (e.g., source, confidence, category).

        Returns:
            The StoredMemory instance with its assigned ID and timestamp.
        """
        memory = StoredMemory(
            content=content,
            metadata=metadata or {},
        )
        self._memories.append(memory)
        logger.debug(
            "Stored memory %s (%d chars, metadata keys: %s)",
            memory.memory_id,
            len(content),
            list(metadata.keys()) if metadata else [],
        )
        return memory

    def query(
        self,
        query_text: str,
        max_results: Optional[int] = None,
        min_similarity: Optional[float] = None,
        filter_tags: Optional[list[str]] = None,
    ) -> list[RetrievalResult]:
        """Query the vector store for memories similar to the query text.

        Uses cosine similarity between query embedding and stored memory embeddings.
        Results are ranked by similarity score (descending), then by recency bonus
        for frequently-accessed or recently-retrieved memories.

        Args:
            query_text: The natural language query to match against stored memories.
            max_results: Override the default max per query limit.
            min_similarity: Override the default minimum similarity threshold.
            filter_tags: Only include memories that contain ALL of these tags.

        Returns:
            List of RetrievalResult objects sorted by relevance score (descending).
            Empty list if no results exceed the similarity threshold.
        """
        max_results = max_results or self._max_per_query
        min_similarity = min_similarity or self._min_similarity

        query_embedding = self._embedding_provider.embed(query_text)
        dimension = self._embedding_provider.dimension

        # Compute cosine similarity against all memories
        scored: list[tuple[float, StoredMemory]] = []

        for memory in self._memories:
            # Skip if tags don't match (no embedding computation needed)
            if filter_tags:
                mem_tags = memory.metadata.get("tags", [])
                if not all(tag in mem_tags for tag in filter_tags):
                    continue

            # Compute cosine similarity
            score = self._cosine_similarity(query_embedding, memory.metadata.get("embedding", []), dimension)

            # Apply recency bonus — frequently accessed memories get a small boost
            access_bonus = min(memory.access_count * 0.02, 0.15)  # Max +0.15 bonus

            adjusted_score = score + access_bonus

            if adjusted_score >= min_similarity:
                scored.append((adjusted_score, memory))

        # Sort by adjusted similarity score descending
        scored.sort(key=lambda x: x[0], reverse=True)
        results = scored[:max_results]

        # Record access on matched memories
        for _, memory in results:
            memory.record_access()

        return [
            RetrievalResult(
                memory=memory,
                similarity_score=round(score, 4),
                rank=i + 1,
            )
            for i, (score, memory) in enumerate(results)
        ]

    def _cosine_similarity(self, vec_a: list[float], vec_b: list[float], dimension: int) -> float:
        """Compute cosine similarity between two vectors.

        Handles missing embeddings gracefully — returns 0.0 if either vector
        is empty or has wrong dimensions.
        """
        if not vec_a or not vec_b:
            return 0.0

        a = vec_a[:dimension]
        b = vec_b[:dimension]

        dot_product = sum(x * y for x, y in zip(a, b))
        norm_a = sum(x * x for x in a) ** 0.5
        norm_b = sum(x * x for x in b) ** 0.5

        if norm_a == 0 or norm_b == 0:
            return 0.0

        return dot_product / (norm_a * norm_b)

    def prune_stale_memories(self, max_age_hours: float = 720) -> int:
        """Remove memories older than the specified age threshold.

        Memories that are too old and haven't been recently accessed are
        considered stale and are removed to prevent storage bloat and
        retrieval noise.

        Args:
            max_age_hours: Maximum age in hours before a memory is pruned.
                Default 720 hours (30 days).

        Returns:
            Number of memories pruned.
        """
        cutoff = datetime.now(timezone.utc).timestamp() - (max_age_hours * 3600)
        original_count = len(self._memories)

        self._memories = [
            m for m in self._memories
            if m.created_at.timestamp() > cutoff or m.access_count >= 5
        ]

        pruned = original_count - len(self._memories)
        if pruned > 0:
            logger.info("Pruned %d stale memories (age > %d hours)", pruned, max_age_hours)
        return pruned

    def get_memory_stats(self) -> dict[str, Any]:
        """Return statistics about the memory store.

        Returns:
            Dict with total memories, average age, and tag distribution.
        """
        if not self._memories:
            return {"total": 0, "avg_age_hours": 0}

        avg_age = sum(m.age_hours for m in self._memories) / len(self._memories)
        tag_counts: dict[str, int] = {}
        for m in self._memories:
            for tag in m.metadata.get("tags", []):
                tag_counts[tag] = tag_counts.get(tag, 0) + 1

        return {
            "total": len(self._memories),
            "avg_age_hours": round(avg_age, 1),
            "max_access_count": max((m.access_count for m in self._memories), default=0),
            "tag_distribution": dict(sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:10]),
        }
```

**Checkpoint:** After connecting the vector store, verify that embedding dimensions match between the provider and store. The dimension from `embedding_provider.dimension` should be consistent across all calls. Run a test query to confirm non-empty results before deploying to production.

---

### Step 5: Retrieve Relevant Facts Into Context

When preparing a prompt for the agent model, query the vector store with the current user context to find relevant memories. Inject the top-k retrieved facts into the system prompt or message history so the agent can reference prior knowledge during reasoning. Use tag filters to scope retrieval to relevant domains (e.g., "config" for configuration facts, "preference" for user preferences).

```python
"""
Memory retrieval pipeline that injects relevant long-term memories
into the agent's active context before each model call.

Combines short-term buffer contents with retrieved long-term memories
to produce a complete, bounded prompt that fits within the model's
context window while preserving maximum relevant information.
"""

from __future__ import annotations

from typing import Any


class MemoryRetrievalPipeline:
    """Orchestrates retrieval of relevant memories into the agent's active context.

    Combines the bounded short-term buffer with vector-backed long-term memory
    to produce a complete prompt context for each model call. Handles budget
    allocation between system instructions, retrieved memories, recent history,
    and the current user input.

    Example BAD vs GOOD:

        ❌ BAD: Retrieving all matching memories regardless of token budget,
               causing the context window to overflow or truncate critical
               system instructions at the last moment.

        ✅ GOOD: Pre-allocating a memory budget (e.g., 10% of max tokens),
               retrieving candidates within that budget, and stopping once
               the budget is exhausted — preserving space for system prompt
               and recent conversation.
    """

    def __init__(
        self,
        buffer: BoundedConversationBuffer,
        memory_store: VectorMemoryStore,
        context_window_manager: ContextWindowManager,
        memory_budget_fraction: float = 0.10,
    ) -> None:
        """Initialize the retrieval pipeline.

        Args:
            buffer: The bounded conversation buffer containing recent history.
            memory_store: Vector store for long-term semantic memory.
            context_window_manager: Manager that handles pressure and compression.
            memory_budget_fraction: Fraction of max_tokens allocated for retrieved
                memories. Default 10% — adjust based on your agent's typical
                need for historical facts vs. recent conversation.
        """
        self._buffer = buffer
        self._memory_store = memory_store
        self._context_window_manager = context_window_manager
        self._memory_budget_fraction = memory_budget_fraction

    def prepare_prompt_context(
        self,
        user_input: str,
        filter_tags: Optional[list[str]] = None,
    ) -> dict[str, Any]:
        """Prepare a complete prompt context with retrieved memories injected.

        Combines system instructions, long-term memory facts, recent history,
        and the current user input into a single context dict that fits within
        the configured token budget.

        Args:
            user_input: The current message from the user.
            filter_tags: Optional tags to scope retrieval (e.g., ["config", "user"]).

        Returns:
            Dict with keys:
                - messages: Full conversation history as API-compatible dicts.
                - retrieved_count: Number of memories injected from vector store.
                - memory_tokens: Token budget used by retrieved memories.
                - context_stats: Detailed token breakdown and utilization info.
        """
        # Calculate memory budget (fraction of total dynamic token capacity)
        max_dynamic_tokens = self._buffer._max_tokens
        memory_budget = int(max_dynamic_tokens * self._memory_budget_fraction)

        # Query long-term memories with the user input as search query
        retrieved_results = self._memory_store.query(
            query_text=user_input,
            filter_tags=filter_tags,
            max_results=self._buffer._max_messages,  # Start generous; we'll budget below
        )

        # Select memories within token budget — take highest similarity first
        injected_memories: list[str] = []
        memory_tokens_used = 0

        for result in retrieved_results:
            mem_tokens = self._buffer._tokenizer(result.memory.content)
            if memory_tokens_used + mem_tokens > memory_budget:
                break  # Budget exhausted — stop adding memories

            injected_memories.append(result.memory.content)
            memory_tokens_used += mem_tokens

        # Build system prompt with injected memories
        system_parts = [self._buffer.get_history()[0]["content"]] if self._buffer.get_history() else []
        if injected_memories:
            system_parts.append(
                f"\n\n--- Relevant Facts from Long-Term Memory ---\n" +
                "\n".join(f"- {mem}" for mem in injected_memories) +
                "\n--- End of Memory Facts ---"
            )

        # Add recent history to the context
        recent_messages = self._buffer.get_recent_messages(n=10)

        # Append current user input
        all_messages = [{"role": "user", "content": user_input}]

        # Enforce final budget check and compress if needed
        pressure_status = self._context_window_manager.check_and_compress()
        new_history = self._buffer.get_history()

        return {
            "messages": new_history + recent_messages + all_messages,
            "retrieved_count": len(injected_memories),
            "memory_tokens": memory_tokens_used,
            "memory_budget": memory_budget,
            "compression_applied": pressure_status["action"] != "none",
            "context_stats": self._context_window_manager.get_pressure_status(),
        }

    def store_discovered_facts(
        self,
        conversation_messages: list[dict[str, Any]],
        extracted_facts: list[str],
        tags: Optional[list[str]] = None,
    ) -> list[StoredMemory]:
        """Store newly discovered facts from the current interaction.

        After an agent completes a task and has identified new facts,
        configurations, or user preferences, this method persists them
        to the vector store for future retrieval.

        Args:
            conversation_messages: The messages from the completed turn(s).
                Used for context about where each fact was discovered.
            extracted_facts: List of fact strings identified by the agent
                as worth storing long-term. Each should be a self-contained
                statement (e.g., "User prefers dark mode", "API endpoint is https://...").
            tags: Optional tags to categorize memories (e.g., "preference", "config", "fact").

        Returns:
            List of StoredMemory instances that were persisted.
        """
        stored = []
        tags = tags or []

        for fact in extracted_facts:
            if not fact or len(fact.strip()) < 10:
                continue  # Skip very short or empty facts

            memory = self._memory_store.add_memory(
                content=fact.strip(),
                metadata={
                    "tags": tags,
                    "source": "agent_discovery",
                    "conversation_turns": len(conversation_messages),
                },
            )
            stored.append(memory)

        logger.info(
            "Stored %d facts from agent discovery (tags: %s)",
            len(stored),
            tags,
        )
        return stored
```

**Checkpoint:** After preparing the prompt context, verify that `messages` fits within the model's actual context window (not just the buffer's budget — leave headroom for tool output). The `retrieved_count` should reflect how many long-term memories were actually injected. If zero memories were retrieved despite having data in the store, check that embedding dimensions match and similarity threshold isn't too high.

---

## Implementation Patterns Summary

### Pattern Reference: Complete Agent Memory Pipeline

Here is a BAD vs GOOD comparison showing how memory systems should be wired together.

```python
# ❌ BAD: No bounded buffer, no summarization, raw history dump
def bad_agent_loop(model_call_fn, user_input: str) -> str:
    """Does not manage memory — just appends everything and overflows context."""
    # No buffer size limits → memory leaks grow unbounded
    conversation = [{"role": "system", "content": SYSTEM_PROMPT}]

    for msg in raw_history:  # Unbounded history, never compressed
        conversation.append(msg)

    conversation.append({"role": "user", "content": user_input})

    # No retrieval of long-term memories — agent has no factual recall
    return model_call_fn(conversation)


# ✅ GOOD: Bounded buffer + vector memory + pressure management + summary
def good_agent_loop(
    model_call_fn,
    user_input: str,
    buffer: BoundedConversationBuffer,
    pipeline: MemoryRetrievalPipeline,
) -> str:
    """Production-ready agent loop with proper memory management."""

    # 1. Prepare full context with retrieved long-term memories
    context = pipeline.prepare_prompt_context(user_input)

    # 2. Check pressure — compress if needed before making the model call
    pressure_status = pipeline._context_window_manager.check_and_compress()

    # 3. Make the model call (ensure messages fit in actual model window)
    response = model_call_fn(context["messages"])

    # 4. Append result to bounded buffer (auto-evicts old messages if over budget)
    buffer.append("assistant", response)

    # 5. Extract and store newly discovered facts for long-term recall
    extracted_facts = extract_facts_from_response(response, user_input)
    if extracted_facts:
        pipeline.store_discovered_facts(
            conversation_messages=context["messages"],
            extracted_facts=extracted_facts,
            tags=["discovered", "agent_session"],
        )

    return response
```

---

## Constraints

### MUST DO
- Always enforce both a message count limit AND a token budget on the conversation buffer — neither alone is sufficient
- Preserve system and developer messages through all eviction and summarization cycles — they define agent behavior
- Configure memory budget as a fraction (10-20%) of total dynamic token capacity — never let memories consume more than half the context window
- Use structured metadata tags on every stored memory for filterable retrieval by category, source, or session
- Apply recency and access-count bonuses when scoring retrieved memories — frequently accessed memories are likely still relevant
- Run `check_and_compress()` before every model call — never assume the buffer is under budget without explicit verification
- Store discovered facts as self-contained statements that can be understood out of context — avoid pronouns or references that require surrounding conversation to interpret

### MUST NOT DO
- Never allow the conversation buffer to grow without bounds — this is the single most common cause of OOM crashes in production agents
- Do not use raw keyword matching for memory retrieval — semantic embeddings are essential for finding relevant facts when the query phrasing differs from stored memories
- Avoid storing full tool output or API responses as memories — extract only the key facts, configurations, and results that an agent would need later
- Never inject retrieved memories into the middle of recent conversation history — always prepend them to system instructions so they have consistent priority
- Do not set the similarity threshold too low (below 0.3) — this causes irrelevant memories to pollute the agent's context with false information
- Never call `check_and_compress()` only on a schedule — always check before model calls since memory pressure can spike between scheduled intervals
- Avoid using the same embedding model for both short-term and long-term memory scoring — use consistent dimensions but consider domain-specific fine-tuning for retrieval accuracy

---

## Output Template

When implementing or auditing memory systems, produce:

1. **Buffer Configuration** — max_messages, max_tokens, tokenizer type, current utilization
2. **Pressure Status** — Current threshold level (none/warning/truncate/summarize) and recommended action
3. **Memory Budget Allocation** — How many tokens are reserved for system, memories, recent history, and user input
4. **Retrieved Memories** — List of facts injected with their similarity scores, tags, and access counts
5. **Compression Audit** — What was summarized, how many turns were compressed, tokens saved
6. **Discovery Log** — New facts stored since last check, with tag distribution

---

## Related Skills

| Skill | Purpose |
|---|---|
| `tool-use-function-calling` | Manages tool calling patterns for agent external integration; memory systems provide context for tool selection decisions |
| `agent-context-management` | Handles context window sliding windows and compression strategies; complementary to this skill's bounded buffers and auto-summarization |
| `user-memory-system` | Implements episodic/semantic/procedural user memory layers; sits alongside this skill's vector store for personalized long-term recall |

---

## Live References

> Authoritative documentation for AI memory architectures and vector-based recall systems.

- [LangChain Memory Module](https://python.langchain.com/docs/modules/memory/)
- [LlamaIndex Memory & Context Window](https://docs.llamaindex.ai/en/stable/module_guides/supporting/context_compression/)
- [FAISS Vector Database Documentation](https://github.com/facebookresearch/faiss)
- [Chroma Vector Store](https://docs.trychroma.com/)
- [Qdrant Vector Database](https://qdrant.tech/documentation/)
- [OpenAI Embedding Models Reference](https://platform.openai.com/docs/guides/embeddings)

---

> 📖 skill(local cache): agent-context-management, tool-use-function-calling, planning-reasoning, rag-pipelines | 📖 skill(remotely sourced): user-memory-system, conversation-memory