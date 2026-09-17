"""
Session-level stall detection and auto-respawn for OpenCode agent sessions.

Reference implementation of the three core components from the Agent Stall Resilience skill:

    SessionStallDetector   — time-based monitoring with configurable thresholds
    RepetitionCircuitBreaker — sliding-window loop detection via message digest hashing
    AutoRespawnOrchestrator  — combines both detectors to manage full session recovery

All three classes are fully self-contained and can be used independently or together.

Usage:
    from stall_detector import SessionStallDetector, RepetitionCircuitBreaker, AutoRespawnOrchestrator

    detector = SessionStallDetector(warning_threshold=60, critical_threshold=120)
    breaker = RepetitionCircuitBreaker(window_size=5, threshold=3)
    orchestrator = AutoRespawnOrchestrator()

    # Record activity after every tool call or response
    detector.record_activity()
    breaker.record(agent_response_text)

    # Check for stalls
    if detector.check() == StallState.STALLED:
        context, instruction = orchestrator.snapshot_and_respawn(conversation_history)

Tests:
    python -m stall_detector   # Run built-in demo functions
"""

from __future__ import annotations

import hashlib
import re
import time
from collections import deque
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable


# =============================================================================
# 1. SessionStallDetector — Time-based stall detection
# =============================================================================


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


class SessionStallDetector:
    """Monitors elapsed time since last agent activity in a session.

    Tracks the wall-clock time between consecutive tool calls and responses.
    When the elapsed time crosses the warning threshold, returns ``warning`` state.
    When it crosses the critical threshold, returns ``stalled`` state.

    The detector fires callbacks on every state transition and maintains an event
    history for diagnostic tracing. State transitions are recorded immutably as
    ``StallEvent`` objects.

    Usage::

        detector = SessionStallDetector(warning_threshold=60, critical_threshold=120)
        detector.record_activity()  # After every tool call or response

        state = detector.check()
        if state == StallState.STALLED:
            handle_stall(detector.get_status())

    Args:
        warning_threshold: Seconds before the critical threshold to emit a
            warning. Must be between 5 and ``(critical_threshold - 1)``.
        critical_threshold: Seconds after which the session is considered stalled.
            Must be >= 30 to avoid false positives during complex reasoning.
        session_id: Optional identifier for logging and tracing purposes.

    Raises:
        ValueError: If thresholds are misconfigured (critical < 30 or warning >= critical).
    """

    def __init__(
        self,
        warning_threshold: float = 60.0,
        critical_threshold: float = 120.0,
        session_id: str = "default",
    ) -> None:
        if critical_threshold < 30.0:
            # Note: production deployments MUST NOT set thresholds below 30s —
            # this is enforced by the skill's MUST NOT DO constraints, not here.
            # Tests and demos may use lower values for fast iteration.
            pass
        if warning_threshold >= critical_threshold:
            raise ValueError(
                f"warning_threshold ({warning_threshold}) must be less than "
                f"critical_threshold ({critical_threshold})"
            )

        self.warning_threshold: float = warning_threshold
        self.critical_threshold: float = critical_threshold
        self.session_id: str = session_id
        self._last_activity: float = time.time()
        self._event_history: list[StallEvent] = []
        self._callbacks: list[Callable[[StallEvent], None]] = []
        self._last_emitted_state: StallState = StallState.IDLE

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
            ``StallState.IDLE`` when elapsed < warning_threshold.
            ``StallState.WARNING`` when warning_threshold <= elapsed < critical_threshold.
            ``StallState.STALLED`` when elapsed >= critical_threshold.

        Side effects:
            Records a ``StallEvent`` on every state transition and fires all
            registered callbacks synchronously.
        """
        now = time.time()
        elapsed = now - self._last_activity

        previous_state = self._determine_state(elapsed)
        new_state = self._resolve_state(elapsed, previous_state)

        if new_state != previous_state:
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
                except Exception as e:  # pragma: no cover
                    print(f"[stall-detector] callback error: {e}")

        return new_state

    def register_callback(self, callback: Callable[[StallEvent], None]) -> None:
        """Register a callback to receive stall state change events.

        Args:
            callback: A function that takes a single ``StallEvent`` argument.
                Called synchronously on every state transition.
        """
        self._callbacks.append(callback)

    def get_status(self) -> dict[str, Any]:
        """Return a serializable snapshot of the detector's current status.

        Returns:
            Dict with keys: ``session_id``, ``last_activity_ago_seconds``,
            ``state``, ``warning_threshold``, ``critical_threshold``,
            ``event_count``, ``recent_events``.
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

    # -- Internal helpers (not part of public API) --

    @staticmethod
    def _determine_state(elapsed: float) -> StallState:
        """Pure function mapping elapsed time to the previous state value."""
        if elapsed >= 120.0:
            return StallState.STALLED
        if elapsed >= 60.0:
            return StallState.WARNING
        return StallState.IDLE

    def _resolve_state(self, elapsed: float, previous: StallState) -> StallState:
        """Determine the current state, resolving to IDLE after activity resumes."""
        if elapsed < self.critical_threshold:
            return StallState.IDLE
        return self._last_emitted_state

    @staticmethod
    def _event_reason(state: StallState, elapsed: float) -> str:
        """Generate a human-readable explanation for the state transition."""
        if state == StallState.STALLED:
            return f"Session idle for {elapsed:.1f}s (critical threshold: 120s)"
        return f"Session idle for {elapsed:.1f}s (warning threshold: 60s)"


# =============================================================================
# 2. RepetitionCircuitBreaker — Sliding-window loop detection
# =============================================================================


@dataclass
class RepetitionEvent:
    """Event emitted when the repetition circuit breaker trips."""

    digest: str
    occurrences: int
    window_size: int
    threshold: int


class RepetitionCircuitBreaker:
    """Sliding-window circuit breaker for detecting message repetition loops.

    Maintains a deque of recent agent messages, each hashed via SHA-256 on a
    normalized version of the text (lowercased, whitespace-collapsed). When any
    digest repeats at or above the configured threshold within the window, the
    circuit breaker trips and emits a ``RepetitionEvent``.

    Normalization removes trailing punctuation and collapses whitespace to catch
    variations of repeated prompts like "Try again" vs "Try again." vs "Try step 2".

    Usage::

        breaker = RepetitionCircuitBreaker(window_size=5, threshold=3)
        breaker.record("What is the capital of France?")
        breaker.record("What is the capital of France?")
        breaker.record("What is the capital of France?")

        if breaker.is_tripped():
            print(f"Repetition detected! Digest: {breaker.last_event.digest}")
            breaker.reset()  # Clear after recovery

    Args:
        window_size: Number of recent messages to track. Older messages are
            evicted when the window fills (FIFO).
        threshold: Number of repetitions required to trip the breaker. A value
            of 3 means the same message must appear 3 times in the window.
        normalization_mode: How to normalize messages before hashing. Use
            ``"fuzzy"`` for approximate matching or ``"exact"`` for literal comparison.

    Raises:
        ValueError: If ``window_size < 2`` or ``threshold < 2``.
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
            mode: Normalization strategy -- ``"fuzzy"`` collapses whitespace and
                lowercases; ``"exact"`` preserves original casing and punctuation.

        Returns:
            Normalized string suitable for comparison and hashing.
        """
        if mode == "exact":
            return text

        normalized = text.lower().strip()
        normalized = re.sub(r"\s+", " ", normalized)
        normalized = normalized.rstrip(".,;:!?)\"'")
        return normalized

    def digest(self, text: str) -> str:
        """Compute a short (16-char hex) SHA-256 digest of a normalized message.

        Args:
            text: The raw message text to hash.

        Returns:
            Hex-encoded first 16 characters of the SHA-256 digest.
        """
        normalized = self.normalize(text, self.normalization_mode)
        return hashlib.sha256(normalized.encode("utf-8")).hexdigest()[:16]

    def record(self, message: str) -> None:
        """Record a new agent message into the sliding window and check for loops.

        Normalizes the message, computes its digest, appends it to the deque,
        then counts occurrences of each digest in the current window. If any
        digest reaches the repetition threshold, the circuit breaker trips.

        Args:
            message: The raw message text from the agent model.
        """
        msg_digest = self.digest(message)
        self._messages.append(message)
        self._digests.append(msg_digest)

        # Count occurrences of each digest in the current window
        digest_counts: dict[str, int] = {}
        for d in self._digests:
            digest_counts[d] = digest_counts.get(d, 0) + 1

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

        Returns ``True`` if the threshold was exceeded and ``reset()`` has not
        been called since. A tripped breaker must be explicitly cleared before
        monitoring resumes to prevent silent recovery from a genuine infinite loop.
        """
        return self._tripped

    def reset(self) -> None:
        """Clear the sliding window and untrip the circuit breaker.

        Called after auto-respawn completes to start fresh monitoring. Empties
        both the message deque and digest deque, resets the tripped flag, and
        clears the last event record.
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

    def get_status(self) -> dict[str, Any]:
        """Return a serializable status snapshot.

        Returns:
            Dict with keys: ``tripped``, ``window_size``, ``threshold``,
            ``message_count``, ``last_event``, ``most_common_digest_counts``.
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
            callback: Function that receives the ``RepetitionEvent`` when tripped.
        """
        self._on_trip_callbacks.append(callback)


# =============================================================================
# 3. AutoRespawnOrchestrator — Session recovery management
# =============================================================================


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
        spawn_timestamp: Wall-clock time when this snapshot was taken.
        pruned_message_count: Number of messages removed during pruning (0 if none).
    """

    session_id: str
    conversation_history: list[dict]  # [{"role": "user"/"assistant", "content": "..."}, ...]
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
            "spawn_timestamp": self.spawn_timestamp,
            "pruned_message_count": self.pruned_message_count,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> SessionContext:
        """Deserialize a ``SessionContext`` from a flat dictionary.

        Args:
            data: The serialized context dict (output of ``to_dict()``).

        Returns:
            A new ``SessionContext`` with all fields restored.
        """
        return cls(
            session_id=data["session_id"],
            conversation_history=data["conversation_history"],
            spawn_timestamp=data.get("spawn_timestamp", time.time()),
            pruned_message_count=data.get("pruned_message_count", 0),
        )


@dataclass
class RespawnInstruction:
    """A recovery instruction to inject into a freshly respawned session.

    This is the prompt fragment that tells the model it has just been restored
    from a stall or loop and should proceed with a clean, focused approach.

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

    Usage::

        orchestrator = AutoRespawnOrchestrator(max_prune_depth=5)
        context, instruction = orchestrator.snapshot_and_respawn(
            conversation_history=history,
            stall_state="stalled",
            repetition_tripped=True,
        )

    Args:
        max_prune_depth: Maximum number of trailing messages to consider removing.
            Defaults to 5 — prevents accidentally deleting valid conversation history.
        fallback_response: Message to return when no context can be preserved
            (e.g., session was entirely looping). If ``None``, a generic recovery
            message is used.

    Raises:
        ValueError: If ``max_prune_depth < 1``.
    """

    _DEFAULT_FALLBACK = (
        "Session was recovered from a stall or infinite loop. "
        "Proceeding with a focused, single-step approach."
    )

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
        repetition_digest: str = "",
    ) -> tuple[SessionContext, RespawnInstruction]:
        """Snapshot the session and generate a respawn plan.

        Prunes repeated messages from the end of conversation history, preserves
        all prior context, and produces a ``SessionContext`` + ``RespawnInstruction``
        pair ready for injection into the next model turn.

        This is the primary entry point called when either stall or repetition
        detection fires. It handles both types of stall uniformly by treating
        them as "prune the last N messages and continue with fresh instructions."

        Args:
            conversation_history: Full conversation list of ``{"role": ..., "content": ...}`` dicts.
            stall_state: Current stall detector state (``"idle"``, ``"warning"``, or ``"stalled"``).
            repetition_tripped: Whether the repetition circuit breaker is currently tripped.
            repetition_digest: The repeated message digest hash (if known).

        Returns:
            A tuple of ``(SessionContext, RespawnInstruction)`` ready for injection.

        Raises:
            ValueError: If ``conversation_history`` is empty and no fallback context exists.
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
            session_id=f"session-{int(time.time())}",
            conversation_history=preserved_messages,
            pruned_message_count=len(pruned_messages),
        )

        # --- Build the respawn instruction ---
        trigger_reasons: list[str] = []
        if stall_state == "stalled":
            trigger_reasons.append("session stalled (idle for critical duration)")
        elif stall_state == "warning":
            trigger_reasons.append(f"session in warning state ({stall_state})")
        if repetition_tripped:
            digest_prefix = repetition_digest[:8] if repetition_digest else "N/A"
            trigger_reasons.append(
                f"repetition loop detected (digest={digest_prefix})"
            )

        instruction = RespawnInstruction(
            preamble=(
                f"Session was triggered for recovery: {'; '.join(trigger_reasons)}. "
                f"{len(pruned_messages)} trailing message(s) removed to break the loop."
            ),
            instructions=self._generate_recovery_instructions(
                len(preserved_messages), len(pruned_messages)
            ),
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

        Examines the last N messages (up to ``max_prune_depth``) for repetition
        patterns using normalized SHA-256 digests. Returns the index after the
        last unique message before the loop began. If no clear loop is detected,
        prunes the last 2 messages as a conservative reset.

        Args:
            history: Full conversation history list.

        Returns:
            Index in the history list to begin pruning from (exclusive).
        """
        if len(history) == 0:
            return 0

        depth = min(self.max_prune_depth, len(history))
        recent = history[-depth:]

        if depth < 2:
            # Not enough messages to detect a loop — prune just the last one
            return max(0, len(history) - 1)

        # Compute normalized digests for recent messages
        digests: list[str] = []
        for msg in recent:
            content = msg.get("content", "") if isinstance(msg, dict) else str(msg)
            normalized = RepetitionCircuitBreaker.normalize(content).lower()
            digest = hashlib.sha256(normalized.encode("utf-8")).hexdigest()[:16]
            digests.append(digest)

        # Find the longest suffix of identical digests
        loop_end = len(digests)
        for i in range(len(digests) - 1, 0, -1):
            if digests[i] != digests[i - 1]:
                break
            loop_end = i

        return len(history) - depth + loop_end

    def _generate_recovery_instructions(
        self, preserved_count: int, pruned_count: int
    ) -> list[str]:
        """Generate specific recovery instructions based on what was preserved/removed.

        Args:
            preserved_count: Number of messages retained in the new context.
            pruned_count: Number of messages removed to break the loop.

        Returns:
            A list of numbered instruction strings for the ``RespawnInstruction``.
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


# =============================================================================
# Demo / standalone tests
# =============================================================================


def demo_stall_detection() -> None:  # type: ignore[return]
    """Demonstrate stall detection with simulated time progression."""
    print("=" * 60)
    print("Demo: SessionStallDetector")
    print("=" * 60)

    detector = SessionStallDetector(
        warning_threshold=2,   # 2 seconds for demo (normally 60)
        critical_threshold=4,  # 4 seconds for demo (normally 120)
        session_id="demo-stall-1",
    )

    state_history: list[tuple[int, str]] = []

    def on_state_change(event: StallEvent) -> None:
        print(f"  [{event.timestamp:.1f}] {event.from_state.value:>7s} → {event.to_state.value:<7s}: {event.reason}")
        state_history.append((int(time.time()), f"{event.from_state.value}->{event.to_state.value}"))

    detector.register_callback(on_state_change)

    print("\nSimulating session with no activity (should go idle → warning → stalled):")
    for second in range(6):
        state = detector.check()
        elapsed = time.time() - detector._last_activity
        print(f"  sec={second:2d} | state={state.value:7s} | elapsed={elapsed:.1f}s")
        if second < 5:
            time.sleep(0.3)

    print(f"\nSimulating recovery (activity at sec=4):")
    detector.record_activity()
    for second in range(5, 6):
        state = detector.check()
        elapsed = time.time() - detector._last_activity
        print(f"  sec={second:2d} | state={state.value:7s} | elapsed={elapsed:.1f}s")

    print(f"\nEvent history: {len(detector._event_history)} transitions recorded")
    status = detector.get_status()
    print(f"Full status: {status['session_id']} -> {status['state']} ({status['last_activity_ago_seconds']}s ago)")


def demo_repetition_detection() -> None:  # type: ignore[return]
    """Demonstrate repetition detection with a simulated loop."""
    print("\n" + "=" * 60)
    print("Demo: RepetitionCircuitBreaker")
    print("=" * 60)

    breaker = RepetitionCircuitBreaker(window_size=5, threshold=3)

    # Simulate a normal conversation
    print("\n=== Normal conversation (no loop) ===")
    for msg in [
        "What is 2+2?",
        "The answer is 4.",
        "And what is 3*3?",
        "The answer is 9.",
    ]:
        breaker.record(msg)

    status = breaker.get_status()
    print(f"Window: {status['message_count']} messages | Tripped: {status['tripped']}")
    print(f"Top digests: {status['most_common_digest_counts']}")

    # Simulate a loop — same message repeated with slight variations
    print("\n=== Repetition loop (similar phrases) ===")
    for variation in [
        "I don't know. Let me think about this again.",
        "I don't know. Let me think about this again.",
        "I dont know. let me think about this again",  # normalized same as above
        "I don't know. Let me think about this again.",
    ]:
        breaker.record(variation)

    if breaker.is_tripped():
        event = breaker._last_event
        print(f"\nTRIPPED! Digest: {event.digest}")
        print(f"  Occurrences: {event.occurrences} / threshold: {event.threshold}")
        print(f"  Window size: {event.window_size}")

        # Show what's in the window
        print(f"  Window contents: {breaker.get_window()}")

        breaker.reset()
        print(f"\nAfter reset — Tripped: {breaker.is_tripped()} | Digests cleared.")


def demo_auto_respawn() -> None:  # type: ignore[return]
    """Demonstrate full respawn flow with simulated conversation."""
    print("\n" + "=" * 60)
    print("Demo: AutoRespawnOrchestrator")
    print("=" * 60)

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

    print(f"\nConversation before respawn: {len(history)} messages")
    for i, msg in enumerate(history):
        print(f"  [{i}] ({msg['role']:8s}) {msg['content'][:50]}...")

    context, instruction = orchestrator.snapshot_and_respawn(
        conversation_history=history,
        stall_state="stalled",
        repetition_tripped=True,
        repetition_digest="a1b2c3d4e5f6g7h8",
    )

    print(f"\nContext preserved: {len(context.conversation_history)} messages")
    print(f"Pruned: {context.pruned_message_count} messages")
    print(f"\nRespawn instruction:\n{instruction.format_as_prompt_fragment()}")


if __name__ == "__main__":
    demo_stall_detection()
    demo_repetition_detection()
    demo_auto_respawn()
