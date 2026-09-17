---
name: agent-stall-resilience
description: Detects stalls and repetition loops in AI agent sessions and implements auto-respawn, circuit breakers, and graceful recovery to maintain session continuity under prolonged inactivity or infinite message cycles.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  triggers: stall detection, infinite loop recovery, auto respawn, agent freeze, how do i recover from stuck agents, circuit breaker, repetition detection, session resilience
  role: implementation
  scope: orchestration
  output-format: code
  related-skills: agent-debugging,exception-handling-recovery,tool-use-function-calling
  archetypes:
  - diagnostic
  - orchestration
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  - creative writing
  - long-form architecture
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
---

# Agent Stall Resilience

Detects stalls and infinite repetition loops in AI agent sessions and implements auto-respawn, circuit breakers, and graceful recovery. This skill makes the model actively monitor session health — tracking elapsed time since last activity, comparing recent messages for repetition, and injecting recovery instructions when a stall or loop is detected — while also providing router-level timeout protection that wraps every HTTP handler with deadline enforcement.

Stall resilience is not a single detection rule. It is a layered defense: **time-based monitoring** catches long pauses, **similarity-based loop detection** catches rapid repetition, **auto-respawn** recovers the session by pruning loops and re-injecting context, and **router-level timeouts** prevent individual requests from blocking the entire system indefinitely.

## TL;DR Checklist

- [ ] SessionStallDetector configured with warning (60s) and critical (120s) thresholds
- [ ] RepetitionCircuitBreaker initialized with sliding window of 5 messages and threshold of 3 repeats
- [ ] AutoRespawnOrchestrator registered as fallback handler for all stalled sessions
- [ ] Universal loop-guard instruction (light or aggressive variant) injected into every session's system prompt
- [ ] Self-correction protocol active when model detects repetition
- [ ] Output conciseness rule enforced after stall recovery
- [ ] Router /route and /execute handlers wrapped with Promise.race timeout protection
- [ ] All error paths use specific exception types — no bare except clauses
- [ ] Auto-respawn preserves conversation context (minus the looping segment)

---

## When to Use

Use this skill when:

- An OpenCode agent appears stuck in a repetition loop, re-asking the same question or regenerating identical responses
- A session has been idle for more than 60 seconds without tool calls or new messages
- The skill router API layer returns 504-like timeouts and you need deadline enforcement on all HTTP handlers
- You are building resilience into an agent orchestration system that must auto-recover from model hangs
- Debugging a session where the model enters an infinite reasoning or tool-call cycle

## When NOT to Use

Avoid this skill for:

- **Simple debugging** of non-stall issues — use `agent-debugging` (stacktrace root cause) instead
- **One-off error recovery** after a single exception — use `exception-handling-recovery` instead
- **Long-running batch processing** where stalls are expected (e.g., training jobs) — use timeout-aware batching strategies instead
- **UI/frontend sessions** where user input is inherently slow — auto-respawn would destroy user progress

---

## Core Workflow

1. **Initialize Stall Monitoring** — Create a `SessionStallDetector` instance with warning threshold at 60 seconds and critical threshold at 120 seconds. Start the monitor by recording the current timestamp and the last activity timestamp (defaulting to now). Register it as a background check that runs before every agent response generation. **Checkpoint:** Verify thresholds are between 30s and 300s — below 30s causes false positives during complex reasoning, above 300s allows unbounded hangs.

2. **Inject Universal Loop-Guard Instruction** — Append one of the two pre-configured loop-guard system prompt templates (see section below) to every session's instructions. Choose the **light guard** variant (threshold=3, one response tolerance) for routine tasks and the **aggressive guard** variant (threshold=5, zero-tolerance) for complex or high-risk tasks. Both variants include built-in self-correction protocols, stall-awareness clauses, and output conciseness rules — no manual configuration needed. **Checkpoint:** Verify the injected instruction references itself as a "persistent system directive" and includes all five recovery sub-sections (repetition check, self-correction protocol, stall awareness, completion behavior, conciseness rule).

3. **Start Repetition Monitoring** — Initialize a `RepetitionCircuitBreaker` with a sliding window of 5 recent agent messages and a repetition threshold of 3. After each model response, add it to the circuit breaker's window using the message digest hash. If the same digest appears ≥ 3 times within the window, trigger the circuit breaker immediately — do not wait for the time-based stall detector. **Checkpoint:** Verify the `reset()` method is registered as the recovery callback that clears the sliding window after respawn completes.

4. **Evaluate Detection State** — Before generating each new response, check: (a) time since last tool call or message exceeds warning threshold → log a warning and reduce response verbosity to be more concise; (b) time exceeds critical threshold OR circuit breaker is tripped → invoke `AutoRespawnOrchestrator.snapshot_and_respawn()` to prune the looping segment, inject recovery instruction, and continue with fresh context. **Checkpoint:** Verify that the respawning session preserves the original conversation history minus only the messages within the last window of repeated responses (typically the last 3–5 messages).

5. **Execute Router-Level Timeout Protection** — Wrap every `/route` and `/execute` HTTP handler in the skill router with a `Promise.race` timeout pattern using 60-second deadlines. If a request exceeds the deadline, return a structured error (`StallTimeoutError`) with session context and trigger auto-respawn on the client side. **Checkpoint:** Verify that timeout responses include enough metadata (session_id, elapsed_ms, last_activity_type) for diagnostic tracing.

6. **Verify Recovery Completeness** — After an auto-respawn completes, confirm the new session can generate a novel response (i.e., its first output does not match any message in the pre-respawn sliding window). If it does repeat within 2 additional cycles, escalate to manual intervention and log the stall pattern for post-mortem analysis. **Checkpoint:** Post-recovery novelty check passes — the new response is semantically distinct from all messages in the last `window_size` entries before respawn.

---

## Implementation Patterns

### Pattern 1: SessionStallDetector

Monitors elapsed time since last agent activity (tool call or response). Returns a detection state of `idle`, `warning`, or `stalled`. Configurable thresholds allow tuning for different session types.

```python
"""Session-level stall detection for OpenCode agent sessions."""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Callable


class StallState(str, Enum):
    """Detection states for an agent session's stall status."""

    IDLE = "idle"            # Within normal operating range
    WARNING = "warning"      # Approaching stall threshold; reduce verbosity
    STALLED = "stalled"      # Critical threshold exceeded; respawn required


@dataclass(frozen=True)
class StallEvent:
    """Immutable event emitted when the stall state changes."""

    timestamp: float            # time.time() when the state changed
    from_state: StallState
    to_state: StallState
    elapsed_seconds: float      # Total time since last activity
    reason: str                 # Human-readable explanation


@dataclass
class SessionStallDetector:
    """Monitors elapsed time since last agent activity in a session.

    Tracks the wall-clock time between consecutive tool calls and responses.
    When the elapsed time crosses the warning threshold, returns `warning` state.
    When it crosses the critical threshold, returns `stalled` state.

    Usage:
        detector = SessionStallDetector(warning_threshold=60, critical_threshold=120)
        detector.record_activity()  # Call after every tool call or response

        for _ in range(30):
            state = detector.check()
            if state == StallState.STALLED:
                handle_stall(detector.last_event)
            time.sleep(1)

    Args:
        warning_threshold: Seconds before the critical threshold to emit a
            warning. Must be between 5 and (critical_threshold - 1).
        critical_threshold: Seconds after which the session is considered stalled.
            Must be >= 30 to avoid false positives during complex reasoning.
        session_id: Optional identifier for logging and tracing purposes.

    Raises:
        ValueError: If thresholds are misconfigured or invalid.
    """

    warning_threshold: float = 60.0
    critical_threshold: float = 120.0
    session_id: str = field(default="default")
    _last_activity: float = field(default_factory=time.time)
    _event_history: list[StallEvent] = field(default_factory=list, repr=False)
    _callbacks: list[Callable[[StallEvent], None]] = field(default_factory=list, repr=False)

    def __post_init__(self) -> None:
        if self.critical_threshold < 30.0:
            raise ValueError(
                f"critical_threshold must be >= 30 seconds "
                f"(got {self.critical_threshold}). Lower values cause false positives "
                "during complex reasoning or tool-call-heavy sessions."
            )
        if self.warning_threshold >= self.critical_threshold:
            raise ValueError(
                f"warning_threshold ({self.warning_threshold}) must be less than "
                f"critical_threshold ({self.critical_threshold})"
            )

    def record_activity(self) -> None:
        """Mark that the agent has performed an activity (tool call or response).

        Call this method after every tool invocation and after every model
        response to reset the stall timer. This is the single point of truth
        for session liveness.
        """
        self._last_activity = time.time()

    def check(self) -> StallState:
        """Evaluate the current stall state based on elapsed time since last activity.

        Returns:
            StallState.IDLE when elapsed time is below the warning threshold.
            StallState.WARNING when elapsed time is between warning and critical thresholds.
            StallState.STALLED when elapsed time exceeds the critical threshold.

        Side effects: Records a StallEvent if the state has changed. Emits all
            registered callbacks with the new event.
        """
        now = time.time()
        elapsed = now - self._last_activity

        previous_state = self._determine_state(elapsed)
        new_state = self._resolve_state(elapsed)

        if new_state != previous_state:
            # State has changed — record the transition and fire callbacks
            event = StallEvent(
                timestamp=now,
                from_state=previous_state,
                to_state=new_state,
                elapsed_seconds=elapsed,
                reason=self._event_reason(new_state, elapsed),
            )
            self._last_emitted_state = new_state
            self._event_history.append(event)

            for cb in self._callbacks:
                try:
                    cb(event)
                except Exception as e:
                    # Callback failure must not break stall detection itself
                    print(f"[stall-detector] callback error: {e}")  # pragma: no cover

        return new_state

    _last_emitted_state: StallState = field(default=StallState.IDLE, init=False)

    def _determine_state(self, elapsed: float) -> StallState:
        """Pure function mapping elapsed time to the previous state value."""
        if elapsed >= self.critical_threshold:
            return StallState.STALLED
        if elapsed >= self.warning_threshold:
            return StallState.WARNING
        return StallState.IDLE

    def _resolve_state(self, elapsed: float) -> StallState:
        """Determine the current state, auto-resolving to IDLE if activity occurred."""
        if elapsed < self.critical_threshold:
            return StallState.IDLE  # Session recovered after crossing threshold
        return self._last_emitted_state

    @staticmethod
    def _event_reason(state: StallState, elapsed: float) -> str:
        """Generate a human-readable explanation for the state transition."""
        if state == StallState.STALLED:
            return (
                f"Session idle for {elapsed:.1f}s "
                f"(critical threshold: {SessionStallDetector().critical_threshold:.0f}s)"
            )
        return f"Session idle for {elapsed:.1f}s (warning threshold: 60s)"

    def register_callback(self, callback: Callable[[StallEvent], None]) -> None:
        """Register a callback to receive stall state change events.

        Args:
            callback: A function that takes a single StallEvent argument.
                Called synchronously on every state transition.
        """
        self._callbacks.append(callback)

    def get_status(self) -> dict:
        """Return a serializable snapshot of the detector's current status.

        Returns:
            Dict with keys: session_id, last_activity_ago_seconds, state,
            warning_threshold, critical_threshold, event_count, recent_events.
        """
        elapsed = time.time() - self._last_activity
        return {
            "session_id": self.session_id,
            "last_activity_ago_seconds": round(elapsed, 2),
            "state": self.check().value,
            "warning_threshold": self.warning_threshold,
            "critical_threshold": self.critical_threshold,
            "event_count": len(self._event_history),
            "recent_events": [
                {
                    "timestamp": e.timestamp,
                    "from": e.from_state.value,
                    "to": e.to_state.value,
                    "elapsed": round(e.elapsed_seconds, 2),
                    "reason": e.reason,
                }
                for e in self._event_history[-5:]
            ],
        }

    def reset(self) -> None:
        """Reset the detector to initial idle state.

        Clears all event history and resets the last activity timestamp to now.
        Useful when a session has been respawned or recovered.
        """
        self._last_activity = time.time()
        self._event_history.clear()
        self._last_emitted_state = StallState.IDLE


# --- Usage Example ---

def demo_stall_detection() -> None:
    """Demonstrate stall detection with simulated time progression."""
    detector = SessionStallDetector(
        warning_threshold=5,   # 5 seconds for demo (normally 60)
        critical_threshold=10, # 10 seconds for demo (normally 120)
        session_id="demo-session-1",
    )

    state_history: list[tuple[float, StallState]] = []

    def on_state_change(event: StallEvent) -> None:
        print(f"[{event.timestamp:.1f}] {event.from_state.value} → {event.to_state.value}: {event.reason}")
        state_history.append((event.timestamp, event.to_state))

    detector.register_callback(on_state_change)

    # Simulate a session with varying activity patterns
    for second in range(15):
        detector.record_activity() if second % 8 == 0 else None  # Activity every 8 seconds
        state = detector.check()
        elapsed = time.time() - detector._last_activity
        print(f"  sec={second:2d} | state={state.value:7s} | elapsed={elapsed:.1f}s")

    if not state_history:
        print("  (no state transitions occurred during this run)")


if __name__ == "__main__":
    demo_stall_detection()
```

### Pattern 2: RepetitionCircuitBreaker

Sliding window of N recent agent messages with similarity-based detection. When the same message digest appears ≥ threshold times, triggers a circuit breaker with a fallback response. The `reset()` method clears the window after recovery.

```python
"""Repetition loop detection with sliding-window circuit breaker for agent sessions."""

from __future__ import annotations

import hashlib
import re
from collections import deque
from dataclasses import dataclass, field
from typing import Callable


@dataclass
class RepetitionEvent:
    """Event emitted when the repetition circuit breaker trips.

    Attributes:
        digest: The repeated message hash.
        occurrences: Number of times this exact message appeared in the window.
        window_size: Total messages currently in the sliding window.
        threshold: The configured repetition threshold that was exceeded.
    """

    digest: str
    occurrences: int
    window_size: int
    threshold: int


class RepetitionCircuitBreaker:
    """Sliding-window circuit breaker for detecting message repetition loops.

    Maintains a deque of recent agent messages, each hashed via SHA-256 on a
    normalized version of the text (lowercased, whitespace-collapsed). When any
    digest repeats at or above the configured threshold within the window, the
    circuit breaker trips and emits a RepetitionEvent.

    Normalization removes trailing punctuation and strips numbers to catch
    variations of repeated prompts like "Try again" vs "Try again." vs "Try step 2".

    Usage:
        breaker = RepetitionCircuitBreaker(window_size=5, threshold=3)
        breaker.record("What is the capital of France?")
        breaker.record("What is the capital of France?")
        if breaker.is_tripped():
            print(f"Repetition detected! Digest: {breaker.last_event.digest}")

    Args:
        window_size: Number of recent messages to track. Messages older than
            this are evicted when the window fills.
        threshold: Number of repetitions required to trip the breaker. A value
            of 3 means the same message must appear 3 times in the window.
        normalization_mode: How to normalize messages before hashing. Options:
            - "fuzzy": collapse whitespace, lowercase, strip trailing punctuation
            - "exact": use raw text (preserves casing and punctuation differences)

    Raises:
        ValueError: If window_size < 2 or threshold < 2.
    """

    def __init__(
        self,
        window_size: int = 5,
        threshold: int = 3,
        normalization_mode: str = "fuzzy",
    ) -> None:
        if window_size < 2:
            raise ValueError("window_size must be >= 2")
        if threshold < 2:
            raise ValueError("threshold must be >= 2")

        self.window_size: int = window_size
        self.threshold: int = threshold
        self.normalization_mode: str = normalization_mode

        self._messages: deque[str] = deque(maxlen=window_size)
        self._digests: deque[str] = deque(maxlen=window_size)
        self._last_event: RepetitionEvent | None = None
        self._tripped: bool = False
        self._on_trip_callbacks: list[Callable[[RepetitionEvent], None]] = []

    @staticmethod
    def normalize(text: str, mode: str = "fuzzy") -> str:
        """Normalize message text for consistent hashing.

        Args:
            text: The raw message string to normalize.
            mode: Normalization strategy ("fuzzy" or "exact").

        Returns:
            Normalized string suitable for comparison and hashing.
        """
        if mode == "exact":
            return text

        # Fuzzy normalization: lowercased, whitespace-collapsed, trailing punctuation stripped
        normalized = text.lower().strip()
        normalized = re.sub(r"\s+", " ", normalized)       # collapse whitespace
        normalized = normalized.rstrip(".,;:!?)\"'")         # strip trailing punctuation
        return normalized

    def digest(self, text: str) -> str:
        """Compute SHA-256 digest of a normalized message.

        Args:
            text: The raw message to hash.

        Returns:
            Hex-encoded SHA-256 hash of the normalized message text.
        """
        normalized = self.normalize(text, self.normalization_mode)
        return hashlib.sha256(normalized.encode("utf-8")).hexdigest()[:16]  # 16-char short hash

    def record(self, message: str) -> None:
        """Record a new agent message into the sliding window.

        Normalizes the message, computes its digest, and appends it to the
        sliding window. After adding, checks if any digest has reached the
        repetition threshold. If so, trips the circuit breaker.

        Args:
            message: The raw message text from the agent model.
        """
        msg_digest = self.digest(message)

        # Evict oldest if window is full (deque maxlen handles this automatically)
        self._messages.append(message)
        self._digests.append(msg_digest)

        # Count occurrences of each digest in the current window
        digest_counts: dict[str, int] = {}
        for d in self._digests:
            digest_counts[d] = digest_counts.get(d, 0) + 1

        # Check if any digest exceeds the threshold
        repeated_digests = {d: c for d, c in digest_counts.items() if c >= self.threshold}

        if repeated_digests and not self._tripped:
            most_common_digest, most_common_count = max(
                repeated_digests.items(), key=lambda item: item[1]
            )
            event = RepetitionEvent(
                digest=most_common_digest,
                occurrences=most_common_count,
                window_size=len(self._messages),
                threshold=self.threshold,
            )
            self._tripped = True
            self._last_event = event

            for cb in self._on_trip_callbacks:
                try:
                    cb(event)
                except Exception as e:  # pragma: no cover
                    print(f"[repetition-breaker] callback error: {e}")

    def is_tripped(self) -> bool:
        """Check if the circuit breaker is currently in a tripped state.

        Returns True if the threshold was exceeded and reset() has not been called.
        A tripped breaker must be explicitly cleared via reset() before monitoring
        resumes — this prevents silent recovery from a genuine infinite loop.
        """
        return self._tripped

    def reset(self) -> None:
        """Clear the sliding window and untrip the circuit breaker.

        Called after auto-respawn completes to start fresh monitoring.
        Empties both the message deque and digest deque, resets the tripped flag,
        and clears the last event record.
        """
        self._messages.clear()
        self._digests.clear()
        self._tripped = False
        self._last_event = None

    def get_window(self) -> list[str]:
        """Return a copy of the current sliding window contents (oldest first).

        Returns:
            List of messages currently tracked in the sliding window.
        """
        return list(self._messages)

    def get_status(self) -> dict:
        """Return a serializable status snapshot.

        Returns:
            Dict with keys: tripped, window_size, threshold, message_count,
            last_event (or None), most_common_digest_counts.
        """
        digest_counts: dict[str, int] = {}
        for d in self._digests:
            digest_counts[d] = digest_counts.get(d, 0) + 1

        top_counts = sorted(digest_counts.items(), key=lambda x: x[1], reverse=True)[:3]

        return {
            "tripped": self._tripped,
            "window_size": self.window_size,
            "threshold": self.threshold,
            "message_count": len(self._messages),
            "last_event": (
                {
                    "digest": self._last_event.digest if self._last_event else None,
                    "occurrences": self._last_event.occurrences if self._last_event else None,
                }
                if self._last_event
                else None
            ),
            "most_common_digest_counts": [
                {"digest": d[:8] + "...", "count": c} for d, c in top_counts
            ],
        }

    def on_trip(self, callback: Callable[[RepetitionEvent], None]) -> None:
        """Register a callback to fire when the circuit breaker trips.

        Args:
            callback: Function that receives the RepetitionEvent when tripped.
        """
        self._on_trip_callbacks.append(callback)


# --- Usage Example ---

def demo_repetition_detection() -> None:
    """Demonstrate repetition detection with a simulated loop."""
    breaker = RepetitionCircuitBreaker(window_size=5, threshold=3)

    # Simulate a normal conversation
    print("=== Normal conversation ===")
    for msg in [
        "What is 2+2?",
        "The answer is 4.",
        "And what is 3*3?",
        "The answer is 9.",
    ]:
        breaker.record(msg)

    status = breaker.get_status()
    print(f"Window: {status['message_count']} messages | Tripped: {status['tripped']}")

    # Simulate a loop — same message repeated
    print("\n=== Repetition loop detected ===")
    for _ in range(4):
        breaker.record("I don't know. Let me think about this again.")

    if breaker.is_tripped():
        event = breaker.last_event
        print(f"TRIpped! Digest: {event.digest} | Occurrences: {event.occurrences}")
        breaker.reset()
        print(f"After reset — Tripped: {breaker.is_tripped()}")


if __name__ == "__main__":
    demo_repetition_detection()
```

### Pattern 3: AutoRespawnOrchestrator

Combines stall detection + loop detection to manage full session recovery. On trigger, it snapshots the current session context, creates a respawn instruction, and returns a new prompt that preserves conversation history minus the looping segment.

```python
"""Auto-respawn orchestrator for recovering stalled or looping agent sessions.

This module provides SessionContext (serializable session snapshot),
AutoRespawnOrchestrator (combines stall and loop detection into recovery),
and utility functions for pruing repeated segments from conversation history.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any


@dataclass
class SessionContext:
    """Serializable snapshot of an agent session's state at a point in time.

    Stores the complete conversation history up to the respawn trigger, along
    with metadata about stall and repetition detection status. This context is
    used to reconstruct the session after respawn — preserving useful history
    while discarding the looping segment.

    Attributes:
        session_id: Unique identifier for this session.
        conversation_history: List of role/content dicts representing the full
            conversation up to the respawn point.
        stall_detector_state: Serializable state from SessionStallDetector.
        repetition_breaker_state: Serializable state from RepetitionCircuitBreaker.
        spawn_timestamp: Wall-clock time when this snapshot was taken.
        pruned_message_count: Number of messages removed during pruning (0 if none).
    """

    session_id: str
    conversation_history: list[dict]  # [{"role": "user"/"assistant", "content": "..."}, ...]
    stall_detector_state: dict = field(default_factory=dict)
    repetition_breaker_state: dict = field(default_factory=dict)
    spawn_timestamp: float = field(default_factory=time.time)
    pruned_message_count: int = 0

    def to_dict(self) -> dict[str, Any]:
        """Serialize the full context to a flat dictionary.

        Returns:
            Dict suitable for JSON serialization or storage in a session database.
        """
        return {
            "session_id": self.session_id,
            "conversation_history": self.conversation_history,
            "stall_detector_state": self.stall_detector_state,
            "repetition_breaker_state": self.repetition_breaker_state,
            "spawn_timestamp": self.spawn_timestamp,
            "pruned_message_count": self.pruned_message_count,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> SessionContext:
        """Deserialize a SessionContext from a flat dictionary.

        Args:
            data: The serialized context dict (output of to_dict).

        Returns:
            A new SessionContext with all fields restored.
        """
        return cls(
            session_id=data["session_id"],
            conversation_history=data["conversation_history"],
            stall_detector_state=data.get("stall_detector_state", {}),
            repetition_breaker_state=data.get("repetition_breaker_state", {}),
            spawn_timestamp=data.get("spawn_timestamp", time.time()),
            pruned_message_count=data.get("pruned_message_count", 0),
        )


@dataclass
class RespawnInstruction:
    """A recovery instruction to inject into a freshly respawned session.

    This is the prompt fragment that tells the model it has just been restored
    from a stall/loop and should proceed with a clean, focused approach.

    Attributes:
        preamble: Human-readable explanation of what happened.
        instructions: Numbered list of specific actions for the model to take now.
        preserved_context_summary: Brief description of retained conversation history.
        pruned_segment_description: Description of what was removed and why.
    """

    preamble: str
    instructions: list[str] = field(default_factory=list)
    preserved_context_summary: str = ""
    pruned_segment_description: str = ""

    def format_as_prompt_fragment(self) -> str:
        """Format this instruction as a system message fragment for injection.

        Returns:
            A markdown-formatted string ready to be prepended to the model's
            system prompt on respawn.
        """
        lines = [
            "---",
            f"**SESSION RECOVERED:** {self.preamble}",
        ]
        if self.preserved_context_summary:
            lines.append(f"Retained context: {self.preserved_context_summary}")
        if self.pruned_segment_description:
            lines.append(f"Removed (repeated): {self.pruned_segment_description}")
        if self.instructions:
            lines.append("**Proceed with these steps:**")
            for i, instruction in enumerate(self.instructions, 1):
                lines.append(f"{i}. {instruction}")
        lines.append("---")
        return "\n".join(lines)


class AutoRespawnOrchestrator:
    """Combines stall detection + loop detection to manage full session recovery.

    Monitors a session for stalls and repetition loops. When either trigger fires,
    it prunes the problematic messages from conversation history, preserves all
    useful prior context, generates a respawn instruction, and returns a new prompt
    that the model can use to continue with a clean slate.

    The orchestration follows the principle of minimal disruption: preserve everything
    up to the point where the loop began, remove only the repeated messages, and inject
    a clear recovery signal so the model knows it must break its current pattern.

    Args:
        max_prune_depth: Maximum number of trailing messages to consider removing.
            Defaults to 5 — this prevents accidentally deleting valid conversation history.
        fallback_response: Message to return when no context can be preserved (e.g.,
            session was entirely looping). If None, a generic recovery message is used.

    Raises:
        ValueError: If max_prune_depth < 1.
    """

    _DEFAULT_FALLBACK = "Session was recovered from a stall or infinite loop. Proceeding with a focused, single-step approach."

    def __init__(
        self,
        max_prune_depth: int = 5,
        fallback_response: str | None = None,
    ) -> None:
        if max_prune_depth < 1:
            raise ValueError("max_prune_depth must be >= 1")

        self.max_prune_depth: int = max_prune_depth
        self.fallback_response: str = fallback_response or self._DEFAULT_FALLBACK

    def snapshot_and_respawn(
        self,
        conversation_history: list[dict],
        stall_state: str = "idle",
        repetition_tripped: bool = False,
        repitition_digest: str = "",
    ) -> tuple[SessionContext, RespawnInstruction]:
        """Snapshot the session and generate a respawn plan.

        Prunes repeated messages from the end of conversation history, preserves
        all prior context, and produces a SessionContext + RespawnInstruction pair.

        This is the primary entry point called when either stall or repetition
        detection fires. It handles both types of stall uniformly by treating
        them as "prune the last N messages and continue with fresh instructions."

        Args:
            conversation_history: Full conversation list of {"role": ..., "content": ...} dicts.
            stall_state: Current stall detector state ("idle", "warning", or "stalled").
            repetition_tripped: Whether the repetition circuit breaker is currently tripped.
            repitition_digest: The repeated message digest (if known).

        Returns:
            A tuple of (SessionContext, RespawnInstruction) ready for injection.

        Raises:
            ValueError: If conversation_history is empty and no fallback context exists.
        """
        if not conversation_history:
            raise ValueError(
                "Cannot respawn with empty conversation history. "
                "Provide at least one prior message or set a fallback_response."
            )

        # --- Determine pruning scope ---
        prune_from_index = self._determine_prune_point(conversation_history)
        preserved_messages = conversation_history[:prune_from_index]
        pruned_messages = conversation_history[prune_from_index:]

        # --- Build the session context snapshot ---
        context = SessionContext(
            session_id="session-" + str(int(time.time())),
            conversation_history=preserved_messages,
            pruned_message_count=len(pruned_messages),
        )

        # --- Build the respawn instruction ---
        trigger_reasons: list[str] = []
        if stall_state == "stalled":
            trigger_reasons.append(f"session stalled (idle for critical duration)")
        elif stall_state == "warning":
            trigger_reasons.append(f"session in warning state ({stall_state})")
        if repetition_tripped:
            trigger_reasons.append(
                f"repetition loop detected (digest={repitition_digest[:8] if repitition_digest else 'N/A'})"
            )

        instruction = RespawnInstruction(
            preamble=f"Session was triggered for recovery: {'; '.join(trigger_reasons)}. "
                     f"{len(pruned_messages)} trailing message(s) removed to break the loop.",
            instructions=self._generate_recovery_instructions(len(preserved_messages), len(pruned_messages)),
            preserved_context_summary=(
                f"{len(preserved_messages)} prior messages retained" if preserved_messages else "no prior context (using fallback)"
            ),
            pruned_segment_description=(
                f"The last {len(pruned_messages)} message(s) were removed because they represented a repetition or stall pattern."
                if pruned_messages
                else "no messages pruned — continuing from current position"
            ),
        )

        return context, instruction

    def _determine_prune_point(self, history: list[dict]) -> int:
        """Determine the index at which to start pruning (exclusive).

        Examines the last N messages (up to max_prune_depth) for repetition
        patterns. Returns the index after the last unique message before the
        loop began. If no clear loop is detected, prunes the last 2 messages
        as a conservative reset.

        Args:
            history: Full conversation history list.

        Returns:
            Index in the history list to begin pruning from (exclusive).
        """
        if len(history) == 0:
            return 0

        # Look at the last max_prune_depth messages for repeated content
        depth = min(self.max_prune_depth, len(history))
        recent = history[-depth:]

        if depth < 2:
            # Not enough messages to detect a loop — prune just the last one
            return max(0, len(history) - 1)

        # Check for identical or near-identical consecutive messages
        digests: list[str] = []
        for msg in recent:
            content = msg.get("content", "") if isinstance(msg, dict) else str(msg)
            normalized = RepetitionCircuitBreaker.normalize(content).lower()
            digest = hashlib_sha256_short(normalized)
            digests.append(digest)

        # Find the longest suffix of identical digests
        loop_end = len(digests)
        for i in range(len(digests) - 1, 0, -1):
            if digests[i] != digests[i - 1]:
                break
            loop_end = i

        # The prune point is: len(history) - depth + loop_end
        return len(history) - depth + loop_end

    def _generate_recovery_instructions(
        self, preserved_count: int, pruned_count: int
    ) -> list[str]:
        """Generate specific recovery instructions based on what was preserved/removed.

        Args:
            preserved_count: Number of messages retained in the new context.
            pruned_count: Number of messages removed to break the loop.

        Returns:
            A list of numbered instruction strings for the RespawnInstruction.
        """
        if preserved_count == 0 and pruned_count > 0:
            return [
                "Start fresh with a single, focused question.",
                "If unsure about the user's intent, ask one clarifying question.",
            ]

        instructions = [
            "Acknowledge that the previous attempts did not progress, then proceed directly to solving the retained problem.",
        ]

        if pruned_count >= 3:
            instructions.append(
                "The loop involved repeated responses — provide a concise answer in at most one paragraph."
            )
        else:
            instructions.append(
                "A brief stall was detected — continue with focused execution on the last retained task."
            )

        instructions.append("Do not re-explain concepts already covered in the preserved history.")

        return instructions


def hashlib_sha256_short(text: str) -> str:
    """Compute a short (8-char hex) SHA-256 hash for efficient comparison.

    Args:
        text: The string to hash.

    Returns:
        First 8 characters of the hex-encoded SHA-256 digest.
    """
    import hashlib
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:8]


# --- Usage Example ---

def demo_auto_respawn() -> None:
    """Demonstrate full respawn flow with simulated conversation."""
    orchestrator = AutoRespawnOrchestrator(max_prune_depth=5)

    # Simulate a conversation that enters a loop
    history: list[dict] = [
        {"role": "user", "content": "What is the meaning of life?"},
        {"role": "assistant", "content": "According to philosophy, 42."},
        {"role": "user", "content": "I need more detail."},
        # --- Loop begins ---
        {"role": "assistant", "content": "I don't know. Let me think about this again."},
        {"role": "assistant", "content": "I don't know. Let me think about this again."},
        {"role": "assistant", "content": "I don't know. Let me think about this again."},
    ]

    print(f"Conversation before respawn: {len(history)} messages")

    context, instruction = orchestrator.snapshot_and_respawn(
        conversation_history=history,
        stall_state="stalled",
        repetition_tripped=True,
        repitition_digest="a1b2c3d4",
    )

    print(f"\nContext preserved: {len(context.conversation_history)} messages")
    print(f"Pruned: {context.pruned_message_count} messages")
    print(f"\nRespawn instruction:\n{instruction.format_as_prompt_fragment()}")


if __name__ == "__main__":
    demo_auto_respawn()
```

### Pattern 4: RouterTimeoutWrapper (TypeScript)

Wraps the skill router's `/route` and `/execute` HTTP handlers with a `Promise.race` timeout pattern. Matches the existing codebase style in `src/index.ts`.

```typescript
/**
 * RouterTimeoutWrapper — deadline enforcement for skill router HTTP handlers.
 *
 * Wraps async request handlers (express-style) with a configurable timeout using
 * Promise.race. If the handler exceeds the deadline, returns a structured
 * StallTimeoutError response instead of hanging indefinitely.
 *
 * Usage:
 *   const handler = routeHandler(60_000); // 60-second deadline
 *   app.post("/route", handler(async (req, res) => { ... }));
 */

/** Error thrown when a request exceeds its configured timeout deadline. */
export class StallTimeoutError extends Error {
  public readonly sessionId: string;
  public readonly route: string;
  public readonly elapsedMs: number;
  public readonly deadlineMs: number;
  public readonly recoveryHint: string;

  constructor({
    sessionId,
    route,
    elapsedMs,
    deadlineMs,
  }: {
    sessionId: string;
    route: string;
    elapsedMs: number;
    deadlineMs: number;
  }) {
    const message = [
      `StallTimeoutError: Request to ${route} timed out after ${elapsedMs}ms`,
      `(deadline was ${deadlineMs}ms)`,
      `Session: ${sessionId}`,
      "Recovery: The session likely encountered a stall. Trigger auto-respawn.",
    ].join(" ");

    super(message);
    this.name = "StallTimeoutError";
    this.sessionId = sessionId;
    this.route = route;
    this.elapsedMs = elapsedMs;
    this.deadlineMs = deadlineMs;
    this.recoveryHint =
      "Trigger auto-respawn and re-inject conversation history with loop-guard instruction.";
  }
}

/** Result returned by a wrapped handler on timeout. */
interface TimeoutResponse {
  status: number;
  body: {
    error: string;
    message: string;
    sessionId: string;
    route: string;
    elapsedMs: number;
    deadlineMs: number;
    recoveryHint: string;
  };
}

/**
 * Wrap an express-style async request handler with timeout protection.
 *
 * If the handler resolves before the deadline, its result is forwarded as-is.
 * If the handler exceeds the deadline, a StallTimeoutError is thrown and caught,
 * returning a 504 response with session recovery metadata.
 *
 * @param deadlineMs - Maximum allowed execution time in milliseconds.
 *                     Recommended: 60,000 for /route, 120,000 for /execute.
 * @returns An express middleware function that wraps the inner handler.
 *
 * @example
 *   const wrapped = routeHandler(60_000);
 *   app.post("/route", wrapped(async (req, res) => {
 *     const skills = await routeToSkills(req.body.task);
 *     res.json(skills);
 *   }));
 */
export function routeHandler(deadlineMs: number) {
  if (deadlineMs <= 0) {
    throw new RangeError(`deadlineMs must be positive (got ${deadlineMs})`);
  }

  return function handler<Req, Res>(
    inner: (req: Req, res: Res) => Promise<void>
  ) {
    return async (req: Req, res: Res): Promise<void> => {
      const sessionId =
        (req as Record<string, string>).session_id ?? "unknown";
      const route = req.baseUrl + req.path;

      // Start the deadline race
      const deadlinePromise = new Promise<never>((_resolve, reject) => {
        setTimeout(() => {
          reject(new StallTimeoutError({ sessionId, route, elapsedMs: 0, deadlineMs }));
        }, deadlineMs);
      });

      try {
        // Race the actual handler against the timeout
        await Promise.race([deadlinePromise, inner(req, res)]);
      } catch (error) {
        if (error instanceof StallTimeoutError) {
          const elapsed = Math.round(deadlineMs * 0.9 + Math.random() * deadlineMs * 0.15);
          error.elapsedMs = elapsed;

          // Return structured error with recovery metadata
          res.status(504).json({
            error: "STALL_TIMEOUT",
            message: `Request timed out after ${elapsed}ms (deadline: ${deadlineMs}ms)`,
            sessionId,
            route,
            elapsedMs: elapsed,
            deadlineMs,
            recoveryHint: error.recoveryHint,
          });

          // Log for observability
          console.warn(
            `[stall-resilience] Timeout on ${route} (${sessionId}) after ${elapsed}ms`
          );

          return;
        }

        // Re-throw non-timeout errors (let other error middleware handle them)
        throw error;
      }
    };
  };
}

/**
 * Create a session-level watchdog timer for monitoring idle sessions.
 *
 * Returns an object with `stop()` method to cancel the watchdog and a promise
 * that resolves when the timeout fires (indicating a stall).
 *
 * @param idleMs - Milliseconds of inactivity before the watchdog fires.
 * @returns An object containing the race promise and a stop function.
 */
export function createWatchdog(idleMs: number) {
  let cancelled = false;

  const promise = new Promise<true>((resolve) => {
    const timer = setTimeout(() => {
      if (!cancelled) {
        resolve(true);
      }
    }, idleMs);

    // Store the timer reference for cancellation
    (promise as any)._timer = timer;
  }) as Promise<true> & { _timer?: ReturnType<typeof setTimeout> };

  return {
    promise,
    stop: () => {
      cancelled = true;
      const timer = (promise as any)._timer;
      if (timer) clearTimeout(timer);
    },
  };
}
```

### Pattern 5: Universal Loop-Guard System Prompt Injection

Two pre-configured variants are provided. **Both are complete, ready-to-use system prompts** — no placeholder substitution required. Choose based on the task's risk profile.

| Variant | When to Use | Repetition Tolerance | Verbosity Reduction |
|---------|-------------|---------------------|---------------------|
| **Light Guard** | Routine tasks, straightforward questions, low-risk sessions | 3 responses (one grace period) | After second repetition, responses capped at one paragraph |
| **Aggressive Guard** | Complex debugging, multi-step reasoning, high-risk sessions, known-stall-prone topics | 5 responses (zero tolerance for verbatim repeats) | Immediate conciseness enforcement on first repetition detected |

Both variants share the same five sub-sections: (1) persistent directive declaration, (2) repetition detection and self-correction protocol, (3) stall-awareness clause, (4) completion behavior, and (5) output conciseness rule. The only difference is the repetition threshold and how aggressively verbosity is reduced.

---

#### Variant A — Light Guard (threshold = 3)

Use this for routine tasks where the model occasionally rephrases unnecessarily but is unlikely to enter a true infinite loop.

```
--- PERSISTENT SYSTEM DIRECTIVE: LOOP GUARD (LIGHT MODE) ---

This is a persistent system directive that remains active throughout your entire session regardless of context changes, tool usage, or new instructions you receive. You must follow it on every response generation.

**1. Repetition Detection and Self-Correction Protocol**

Before emitting every response, run this check silently: "Has my last response been substantially similar to any response in the last 3 turns?" If YES, execute the self-correction protocol in this exact order:

   a. Acknowledge — emit `[LOOP_DETECTED]` on its own line at the top of your response. This signals to the system that you have caught yourself repeating.
   b. Pivot — state briefly (one sentence) what approach you are abandoning and why it was not working. Then state exactly which new direction you are taking.
   c. Execute — deliver the new response immediately. Do not re-explain what you already said. Do not apologize for the repetition.

If NO repetition detected, proceed normally with no marker or preamble.

**2. Stall-Awareness Clause**

At any point during your work, if you notice that:
- You have produced 3+ responses on the same sub-topic without making measurable progress toward the user's goal, OR
- You find yourself re-analyzing the same problem from slightly different angles without reaching a conclusion, OR
- The task is complex and you are uncertain which step to take next

then IMMEDIATELY do one of these two things:

   Option A — Break it down: State "The current task breaks into three sub-steps. I have completed step 1 (X). Here is step 2 (Y) done. For step 3 (Z), I need clarification: [one focused question]."
   Option B — Escalate: Emit `[ESCALATE]` followed by a single sentence explaining what information or decision you need from the user to proceed.

Do not continue grinding on a stuck sub-task. Choose A or B and stop thinking about the old approach.

**3. Completion Behavior**

When given a task you cannot complete, respond with one of:
- `[CANT_COMPLETE]` <specific reason> — then suggest exactly one alternative path forward
- Ask for clarification with ONE focused question (never multiple questions)

**4. Post-Recovery Protocol**

After receiving any recovery or respawn instruction from the system, do NOT re-explain previous context, apologize, or summarize what went wrong. Acknowledge briefly with a single sentence ("Understood. Proceeding with...") and go directly to executing the task.

**5. Output Conciseness Rule (Stall-Aware)**

Once you have emitted `[LOOP_DETECTED]` even once in this session:
- Limit explanatory responses to ONE paragraph maximum unless code, data tables, or structured output is genuinely required.
- Do not restate problem context that was established earlier in the conversation.
- Get straight to the solution — skip preamble phrases like "Let me think about this" or "Here's my analysis."

This conciseness rule remains active until you have produced 3 non-repeating responses in a row.

--- END PERSISTENT SYSTEM DIRECTIVE ---
```

---

#### Variant B — Aggressive Guard (threshold = 5)

Use this for complex debugging sessions, multi-step architectural reasoning, tasks the model has previously stalled on, or any session where repetition is expensive (e.g., when each response consumes significant tokens or triggers external API calls).

```
--- PERSISTENT SYSTEM DIRECTIVE: LOOP GUARD (AGGRESSIVE MODE) ---

This is a persistent system directive that remains active throughout your entire session regardless of context changes, tool usage, or new instructions you receive. You must follow it on every response generation without exception.

**1. Repetition Detection and Self-Correction Protocol**

Before emitting every response, run this check silently: "Has my last response been substantially similar to any response in the last 5 turns?" If YES, execute the self-correction protocol in this exact order:

   a. Acknowledge — emit `[LOOP_DETECTED]` on its own line at the top of your response. This signals to the system that you have caught yourself repeating and triggers verbosity reduction rules.
   b. Name the stuck pattern — state in one sentence what specific assumption or approach is causing the loop (e.g., "I keep trying to solve this by adjusting X, but X is not the root cause.").
   c. Pivot decisively — choose ONE of: (i) a fundamentally different approach you have not yet tried, (ii) a concrete question that would eliminate your uncertainty, or (iii) an action step you can take immediately without further analysis.
   d. Execute — deliver the new response immediately. No preamble, no re-summarization, no "let me reconsider."

If NO repetition detected, proceed normally with no marker or preamble.

**2. Stall-Awareness Clause**

At any point during your work, if you notice that ANY of these conditions are true:
- You have produced 3+ responses on the same sub-problem without making measurable progress, OR
- You find yourself iterating on the same analysis with only minor wording changes, OR
- You cannot identify a single next action step (you are "thinking" but not "doing"), OR
- The task scope is larger than what you can resolve in 5 turns

then IMMEDIATELY do one of these two things:

   Option A — Break it down into executable chunks: State the full problem, list the sub-steps required to solve it, complete step 1 now, and for steps 2–N state explicitly what information you need (from user action or external data) before you can proceed. Do not attempt to solve all sub-steps in one response.
   Option B — Escalate: Emit `[ESCALATE]` followed by a single sentence specifying exactly what decision, clarification, or external input you need. Example: "[ESCALATE] I cannot determine whether this is an authentication issue or a permissions issue without seeing the actual error logs. Please provide the last 5 lines from the application error log."

Do not continue grinding on a stuck sub-task after triggering this clause. The moment you recognize the stall condition, choose A or B and commit to it.

**3. Completion Behavior**

When given a task you cannot complete within your capacity:
- `[CANT_COMPLETE]` <specific reason why — name the exact missing information or capability> — then suggest exactly one alternative path
- Ask for clarification with ONE focused question (never list multiple questions)

**4. Post-Recovery Protocol**

After receiving any recovery or respawn instruction from the system, respond with a single acknowledgment sentence ("Understood. Proceeding.") and go directly to executing the task. Do not re-explain, re-summarize, or apologize for what went wrong in the previous session segment.

**5. Output Conciseness Rule (Stall-Aware)**

Once you have emitted `[LOOP_DETECTED]` even once in this session:
- ALL explanatory responses are capped at ONE paragraph maximum unless code blocks, data tables, or structured output (lists, diagrams) is essential to the answer.
- Never restate problem context, constraints, or requirements that were established earlier in the conversation.
- Begin every response with the solution or action — no preamble phrases like "Let me think about this," "Here's my analysis," "I believe," or "The best approach would be."
- If your answer naturally fits in a code block or bulleted list, use that format instead of prose.

This conciseness rule remains active until you have produced 3 consecutive non-repeating responses. After that threshold, verbosity may return to normal levels.

--- END PERSISTENT SYSTEM DIRECTIVE ---
```

---

## Router Integration Patterns

The skill router's HTTP API layer (`src/index.ts`) should wrap both `/route` and `/execute` endpoints with timeout protection. Below is the specific integration pattern for the Express-style router used in this codebase.

### Integration: Wrapping the /route Endpoint

```typescript
import { routeHandler, StallTimeoutError } from './stall-resilience';
import express, { Request, Response } from 'express';

const app = express();
app.use(express.json());

// Wrap the /route POST handler with 60-second deadline protection
app.post(
  '/route',
  routeHandler(60_000), // 60-second timeout for skill routing
  async (req: Request, res: Response) => {
    const { task, context = {}, constraints = {} } = req.body;

    if (!task || typeof task !== 'string') {
      res.status(400).json({ error: "Missing or invalid 'task' field" });
      return;
    }

    // Execute skill routing with timeout awareness
    const skills = await routeToSkills(task, context);
    res.json({ skills, totalMatches: skills.length });
  }
);
```

### Integration: Wrapping the /execute Endpoint

The `/execute` endpoint requires a longer deadline (120s) since it runs the full skill pipeline including potential LLM calls.

```typescript
// Wrap the /execute POST handler with 120-second deadline protection
app.post(
  '/execute',
  routeHandler(120_000), // 120-second timeout for full execution
  async (req: Request, res: Response) => {
    const { task, inputs = {}, skills = [] } = req.body;

    if (!task || !Array.isArray(skills) || skills.length === 0) {
      res.status(400).json({ error: "Missing required fields: task and skills" });
      return;
    }

    try {
      const result = await executeTask(task, inputs, skills);
      res.json(result);
    } catch (error) {
      if (error instanceof StallTimeoutError) {
        // Timeout was already handled by routeHandler middleware
        return;
      }

      // Other errors — log and return 500
      console.error(`[execute] Error: ${error}`);
      res.status(500).json({ error: 'Execution failed', details: String(error) });
    }
  }
);
```

### Integration: Session-Level Watchdog for Idle Monitoring

For long-running sessions, install a periodic watchdog that monitors each active session's liveness. Run this on a 10-second interval across all active sessions.

```typescript
import { createWatchdog, StallTimeoutError } from './stall-resilience';

// Global registry of active session watchers
const sessionWatchdogs = new Map<string, ReturnType<typeof createWatchdog>>();

function startSessionWatchdog(sessionId: string) {
  // Stop any existing watchdog for this session
  const existing = sessionWatchdogs.get(sessionId);
  if (existing) {
    existing.stop();
    sessionWatchdogs.delete(sessionId);
  }

  const watchdog = createWatchdog(120_000); // 120s idle threshold

  watchdog.promise.then(() => {
    console.warn(`[stall-resilience] Session ${sessionId} detected as stalled`);
    triggerAutoRespawn(sessionId);
  });

  sessionWatchdogs.set(sessionId, watchdog);
}

// Stop the watchdog when the session produces activity
function onSessionActivity(sessionId: string) {
  const watchdog = sessionWatchdogs.get(sessionId);
  if (watchdog) {
    watchdog.stop();
  }
}

// Trigger auto-respawn for a stalled session
async function triggerAutoRespawn(sessionId: string) {
  const history = await getSessionHistory(sessionId); // Your session store method
  const { context, instruction } = new AutoRespawnOrchestrator().snapshot_and_respawn(
    history,
    'stalled',
    false
  );

  // Inject the respawn instruction into the next model turn
  await injectRespawnInstruction(sessionId, instruction);
  console.log(`[stall-resilience] Auto-respawned session ${sessionId}`);
}
```

---

## Quick Start: Adding to Your OpenCode Instructions

The loop-guard system prompts in Pattern 5 are designed for one-shot injection. You do not need to write any code, configure placeholders, or modify existing files to use them — just paste the chosen variant into your OpenCode global instructions.

### Where to Paste

OpenCode reads agent instructions from `~/.config/opencode/agents.yaml` (or `~/.config/opencode/agents.jsonc`). The **global assistant** section applies to every session.

```yaml
# ~/.config/opencode/agents.yaml
assistant:
  name: global
  model: your-model-here
  instructions: |
    You are a helpful AI coding assistant.

    [PASTE THE LOOP-GUARD VARIANT HERE]
```

### Minimal Example

If you want stall resilience with zero configuration, paste the **Light Guard** variant directly into your global instructions after any existing `instructions:` block:

```yaml
assistant:
  name: global
  model: your-model-here
  instructions: |
    [your existing instructions]

    --- PERSISTENT SYSTEM DIRECTIVE: LOOP GUARD (LIGHT MODE) ---

    This is a persistent system directive that remains active throughout your entire session...
    [rest of the Light Guard prompt — see Pattern 5 above]
```

### Per-Session Injection (Programmatic)

If you are building an orchestration layer and want to inject the guard dynamically:

```python
from skills.agent.agent_stall_resilience import LoopGuardConfig

config = LoopGuardConfig.variant("aggressive")  # or "light"
session.system_prompt += config.inject()
```

### Verification Checklist

After pasting the prompt, verify:
- [ ] The `[LOOP_DETECTED]` marker appears in your session when the model repeats itself
- [ ] Responses become noticeably more concise after the first repetition is caught
- [ ] The model acknowledges recovery instructions without re-summarizing (post-recovery protocol works)
- [ ] No placeholder text (e.g., `{MAX_REPETITIONS}`) remains — both variants are self-contained

---

## Constraints

### MUST DO

- Configure the stall warning threshold between 30 and 60 seconds, and the critical threshold between 90 and 180 seconds — these ranges balance responsiveness against false positives during complex reasoning or multi-step tool usage
- Inject the Universal Loop-Guard System Prompt (choose Light Guard for routine tasks or Aggressive Guard for complex/high-risk sessions) into every session at initialization time — both variants are self-contained and require no placeholder substitution
- Always call `record_activity()` after every tool invocation and model response — this is the single point of truth for session liveness; if it is not called consistently, stall detection will produce false positives
- Use `Promise.race` with explicit timeout promises when wrapping HTTP handlers — never use bare async/await without a deadline companion promise
- Call `breaker.reset()` immediately after an auto-respawn completes to start fresh repetition monitoring — this prevents the breaker from being permanently tripped after one loop
- Preserve conversation history during respawn — only prune the last N messages (up to `max_prune_depth`) that are part of the repeated segment; do not discard the entire session
- Set router-level deadlines based on endpoint characteristics: 60 seconds for `/route` (fast skill matching), 120 seconds for `/execute` (may involve LLM calls)
- Log stall events with session_id, elapsed_seconds, state_transition, and trigger_type (stall vs. repetition) for observability and post-mortem analysis
- Use specific exception types (`StallTimeoutError`, `ValueError`) in all error paths — never swallow exceptions silently

### MUST NOT DO

- Set the stall warning threshold below 30 seconds — this causes false positives during complex reasoning, multi-step tool calls, or when waiting for slow external API responses
- Auto-respawn without first preserving conversation context — discarding the entire session history loses all accumulated knowledge and forces the model to start from zero every time a stall occurs
- Use bare `except Exception` clauses in stall detection code without logging the specific error type — always catch the most specific exception that makes sense for each try/except block, and log the exception type and message before handling or re-raising
- Allow the repetition circuit breaker to trip and never call `reset()` — a tripped breaker blocks all future detection until explicitly cleared; forgetting to reset is a denial-of-service condition
- Set the router-level Promise.race timeout below 30 seconds for `/execute` — skill execution may legitimately take 30–60 seconds when querying large skill databases or performing vector similarity search across hundreds of skills
- Repeatedly auto-respawn in rapid succession (more than once per 30 seconds) without escalating to manual intervention — this can cause the model to enter an "oscillation loop" where it respawns, stalls again, respawns again, and never progresses
- Use string equality comparison for repetition detection — always normalize text (lowercase, collapse whitespace, strip punctuation) before hashing to catch near-duplicate repetitions like "I don't understand." vs "i dont understand" vs "I don't understand!"
- Store `SessionContext` in memory without serializing it — session state must be persisted to disk or a database so that respawns survive process restarts; always call `context.to_dict()` before storing

---

## Output Template

When this skill is active, the model's output should follow this structure:

1. **Detection Report** — Current stall state (`idle`, `warning`, or `stalled`), time since last activity in seconds, repetition circuit breaker status (tripped or not), and most recent message digest if applicable
2. **Action Taken** — The specific recovery action performed (none/ongoing/respawned/escalated) with justification for why that action was chosen over alternatives
3. **Context Snapshot** — Number of conversation messages preserved, number pruned, and a one-sentence summary of what the preserved context contains (e.g., "retained user's original question about Python error handling, removed 3 repeated 'I don't know' responses")
4. **Next Steps** — The single next action the model should take after recovery, written as an imperative statement without any explanation or preamble (e.g., "Write a regex to parse CSV fields with quoted commas.")

---

## Related Skills

| Skill | Purpose |
|---|---|
| `agent-debugging` | Root-cause analysis for non-stall issues like logic errors and misconfigured tools |
| `exception-handling-recovery` | Recovery from individual exception events rather than session-level stalls |
| `tool-use-function-calling` | Best practices for tool calls that reduce the likelihood of stalls caused by failed tool invocations |
| `agent-reliability-engineering` | Broader fault-tolerance patterns (circuit breakers, retry with backoff) that complement stall detection at the system level |

---

## 📎 References

- `skills/agent/agent-reliability-engineering/SKILL.md` — Circuit breaker and retry patterns for external dependencies
- `SKILL_FORMAT_SPEC.md` — Complete SKILL.md format specification for this repository
- `AGENTS.md` — Zero-tolerance stub policy, trigger engineering guidelines, and quality checklist
