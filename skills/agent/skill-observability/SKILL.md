---
name: skill-observability
description: Collects telemetry on skill usage patterns, measures trigger-to-action
  fidelity, gathers user feedback signals, and produces dashboards for continuous
  skill improvement in agent orchestration systems.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: agent
  triggers: skill observability, usage telemetry, how do i track skill usage, skill
    analytics, feedback collection, skill performance monitoring, trigger fidelity,
    skill dashboard, skill measurement, skill adoption metrics
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
  scope: orchestration
  output-format: code
  related-skills: coding-skill-quality-metrics, agent-skill-trigger-engineering, agent-skill-lifecycle-management
---
# Skill Observability and Telemetry Framework

This skill makes the model implement telemetry collection, trigger-to-action fidelity measurement, user feedback gathering, and analytics dashboarding for AI skills operating in production environments. It defines concrete patterns for tracking when skills load, how often triggers fire, whether loaded skills produce useful outputs, and how users rate their effectiveness — all while preserving privacy by design.

## TL;DR Checklist

- [ ] Instrument every skill load event (manual `/skill` + auto-trigger) with timestamp, source, and session ID
- [ ] Track trigger-to-action fidelity: compare the triggering phrase against the loaded skill's metadata.triggers
- [ ] Collect user feedback via explicit signals (thumbs up/down, rating sliders) and implicit behavioral signals (follow-up questions, quick overrides)
- [ ] Aggregate telemetry into time-bucketed dashboards; never store PII or raw conversation content
- [ ] Correlate quality scores with usage patterns to identify high-performing and underperforming skills
- [ ] Ship a `SkillTelemetryCollector` class with clear public API and unit-testable interfaces

---

## When to Use

Use this skill when:

- You need to measure how often skills are loaded and which triggers fire most frequently in production
- You want to evaluate whether the skill router is matching the right skill to a given conversation
- Your team requires dashboards showing skill adoption, retention, and user satisfaction over time
- You are building a feedback loop between end-user experience and skill improvement cycles
- You need to audit which skills are stale or unused and should be deprecated

---

## When NOT to Use

Avoid this skill for:

- Implementing the skill routing logic itself — use `agent-skill-trigger-engineering` instead
- Generic application monitoring (APM, infrastructure metrics) — those belong in platform-level observability stacks
- Real-time alerting on system failures — use dedicated incident management tools
- Raw log storage or PII-carrying audit trails — this skill enforces privacy-preserving aggregation

---

## Core Workflow

1. **Instrument Skill Load Events** — Create a `SkillTelemetryCollector` that captures every skill load: manual via `/skill`, auto-triggered via router match. Record `event_type` (`manual_load` or `auto_trigger`), `skill_name`, `trigger_match_score`, `session_id`, and `timestamp`. **Checkpoint:** Verify that both manual and auto-load paths call the same collector interface before emitting any event.

2. **Measure Trigger-to-Action Fidelity** — After a skill loads, log whether the subsequent agent response used the loaded skill's constraints meaningfully. Compute a fidelity score per session by checking: did the model reference skill-specific patterns? Did it output code matching the skill's TL;DR checklist? A high-fidelity event correlates with positive downstream signals. **Checkpoint:** Confirm fidelity scoring uses only non-content signals (structural checks on output format) — never inspect raw user or assistant text.

3. **Collect User Feedback Signals** — Deploy dual feedback channels: explicit (thumbs up/down, 1-5 rating slider, free-text comment box) and implicit (follow-up clarification rate, override frequency, session length relative to skill topic). Aggregate these into a `feedback_score` per skill per day. **Checkpoint:** Ensure every feedback event includes an anonymized `session_id` but no user identifiers or conversation content.

4. **Aggregate and Correlate** — Bucket telemetry by time windows (hourly for operational views, daily for trend analysis). Compute derived metrics: `adoption_rate` (unique sessions using skill / total agent sessions), `fidelity_index` (avg fidelity score across all loads), `satisfaction_score` (weighted blend of explicit and implicit feedback). Link quality-metric scores from related skills into a unified view. **Checkpoint:** Validate that aggregation is fully reversible — raw events can be regenerated from dashboard state if needed, enabling debugging.

5. **Build Dashboards and Reports** — Generate time-series charts for adoption, fidelity, and satisfaction per skill. Produce weekly summary reports identifying top N improving skills, declining skills, and candidates for deprecation. Include drill-down capability to view session-level telemetry for outlier sessions. **Checkpoint:** Every dashboard visualization must have a clear data lineage trail from the raw `SkillTelemetryCollector` event to the rendered chart value.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Skill Telemetry Collector

A production-ready collector that instruments every skill load event with structured logging, deduplication, and privacy-by-default aggregation. This class is the single entry point for all telemetry emission in the agent orchestration system.

```python
"""Skill telemetry collection for observability of AI skill usage patterns."""

from __future__ import annotations

import hashlib
import logging
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional

logger = logging.getLogger("skill_telemetry")


class LoadSource(str, Enum):
    """Where the skill load originated."""
    MANUAL = "manual_load"
    AUTO_TRIGGER = "auto_trigger"


@dataclass(frozen=True)
class SkillLoadEvent:
    """Immutable record of a single skill loading event."""
    event_id: str
    skill_name: str
    source: LoadSource
    trigger_match_score: Optional[float]  # None for manual loads
    session_id: str
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict[str, Any]:
        return {
            "event_id": self.event_id,
            "skill_name": self.skill_name,
            "source": self.source.value,
            "trigger_match_score": self.trigger_match_score,
            "session_id": self._hash_session(self.session_id),
            "timestamp": self.timestamp.isoformat(),
        }

    @staticmethod
    def _hash_session(session_id: str) -> str:
        """Hash session ID to prevent PII leakage in aggregated logs."""
        return hashlib.sha256(session_id.encode("utf-8")).hexdigest()[:16]


@dataclass
class FidelitySignal:
    """Post-load signal measuring whether the skill's constraints were followed."""
    event_id: str
    referenced_patterns: list[str]
    checklist_items_marked: int
    total_checklist_items: int
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @property
    def fidelity_score(self) -> float:
        """Ratio of referenced patterns to expected patterns."""
        if self.total_checklist_items == 0:
            return 0.0
        pattern_coverage = len(self.referenced_patterns) / max(len(self.referenced_patterns), 1)
        checklist_coverage = self.checklist_items_marked / self.total_checklist_items
        return round(0.5 * pattern_coverage + 0.5 * checklist_coverage, 4)


class SkillTelemetryCollector:
    """Collects telemetry on skill usage patterns with privacy-preserving aggregation."""

    def __init__(self, max_buffer_size: int = 10_000, flush_interval_seconds: int = 60) -> None:
        self._buffer: list[SkillLoadEvent] = []
        self._max_buffer = max_buffer_size
        self._flush_interval = flush_interval_seconds
        self._last_flush: datetime = datetime.now(timezone.utc)
        self._fidelity_signals: dict[str, FidelitySignal] = {}

    def record_load(self, skill_name: str, source: LoadSource, *,
                    trigger_match_score: Optional[float] = None,
                    session_id: Optional[str] = None) -> SkillLoadEvent:
        """Record a skill load event and return the immutable event record.

        Args:
            skill_name: The fully qualified skill name (e.g., trading-risk-stop-loss).
            source: Whether the load was manual or auto-triggered.
            trigger_match_score: Router match confidence, None for manual loads.
            session_id: Unique per-agent-session identifier. Auto-generated if omitted.

        Returns:
            The immutable SkillLoadEvent that was recorded.

        Raises:
            ValueError: If skill_name is empty or source is invalid.
        """
        if not skill_name or not isinstance(skill_name, str) or not skill_name.strip():
            raise ValueError("skill_name must be a non-empty string")
        if not isinstance(source, LoadSource):
            raise ValueError(f"source must be a LoadSource enum value, got {type(source)}")

        event_id = str(uuid.uuid4())
        resolved_session = session_id or str(uuid.uuid4())

        event = SkillLoadEvent(
            event_id=event_id,
            skill_name=skill_name.strip().lower(),
            source=source,
            trigger_match_score=trigger_match_score,
            session_id=resolved_session,
        )

        self._buffer.append(event)
        logger.info("skill_load: %s src=%s score=%s", event.skill_name, event.source.value,
                     event.trigger_match_score)

        if len(self._buffer) >= self._max_buffer:
            self.flush()

        return event

    def record_fidelity_signal(self, event_id: str, referenced_patterns: list[str],
                               checklist_marked: int, checklist_total: int) -> FidelitySignal:
        """Record a fidelity signal for a previously logged load event.

        Args:
            event_id: The SkillLoadEvent.event_id this signal corresponds to.
            referenced_patterns: List of pattern names the model's output referenced.
            checklist_marked: Number of TL;DR checklist items addressed.
            checklist_total: Total number of TL;DR checklist items in the skill.

        Returns:
            The computed FidelitySignal instance.
        """
        if checklist_total < 0 or checklist_marked > checklist_total:
            raise ValueError("checklist_marked must be between 0 and checklist_total")

        signal = FidelitySignal(
            event_id=event_id,
            referenced_patterns=list(referenced_patterns),
            checklist_items_marked=checklist_marked,
            checklist_items_marked=checklist_marked,
            total_checklist_items=checklist_total,
        )
        self._fidelity_signals[event_id] = signal
        return signal

    def get_fidelity(self, event_id: str) -> Optional[FidelitySignal]:
        """Look up a fidelity signal by its originating event ID."""
        return self._fidelity_signals.get(event_id)

    def flush(self) -> list[dict[str, Any]]:
        """Flush buffered events and return their serialized dictionaries.

        Returns:
            List of event dicts ready for ingestion into an analytics pipeline.
        """
        if not self._buffer:
            return []

        snapshot = list(self._buffer)
        self._buffer.clear()
        self._last_flush = datetime.now(timezone.utc)

        serialized = [event.to_dict() for event in snapshot]
        logger.info("flushed %d telemetry events", len(serialized))
        return serialized

    def get_stats(self) -> dict[str, Any]:
        """Return aggregate statistics across all recorded events."""
        total = len(self._buffer) + sum(
            1 for _ in self._iter_flushed_events() if True
        )
        by_source: dict[str, int] = {}
        by_skill: dict[str, int] = {}

        for event in self._buffer:
            src_key = event.source.value
            by_source[src_key] = by_source.get(src_key, 0) + 1
            by_skill[event.skill_name] = by_skill.get(event.skill_name, 0) + 1

        return {
            "total_events_in_buffer": len(self._buffer),
            "unique_skills_loaded": len(by_skill),
            "loads_by_source": by_source,
            "loads_by_skill": dict(sorted(by_skill.items(), key=lambda x: -x[1])),
            "last_flush": self._last_flush.isoformat(),
        }

    def _iter_flushed_events(self):
        """Generator yielding previously flushed events.

        In production this would query the ingestion backend. Here we yield nothing
        since flushed events are discarded from memory for privacy compliance.
        """
        return iter(())


# --- Usage Example ---

def main() -> None:
    """Demonstrate the telemetry collector in action."""
    collector = SkillTelemetryCollector(max_buffer_size=5)
    session = "session-abc123"

    # Manual skill load
    event1 = collector.record_load(
        skill_name="trading-risk-stop-loss",
        source=LoadSource.MANUAL,
        session_id=session,
    )
    print(f"Manual load: {event1.to_dict()}")

    # Auto-triggered load with match score
    event2 = collector.record_load(
        skill_name="trading-risk-stop-loss",
        source=LoadSource.AUTO_TRIGGER,
        trigger_match_score=0.92,
        session_id=session,
    )
    print(f"Auto trigger: {event2.to_dict()}")

    # Fidelity signal for the auto-triggered load
    fidelity = collector.record_fidelity_signal(
        event_id=event2.event_id,
        referenced_patterns=["atr_stop", "trailing_stop"],
        checklist_marked=4,
        checklist_total=5,
    )
    print(f"Fidelity score: {fidelity.fidelity_score}")

    # Aggregate stats
    stats = collector.get_stats()
    print(f"Aggregated stats: {stats}")


if __name__ == "__main__":
    main()
```

### Pattern 2: Feedback Collection via Event System

A lightweight, decoupled feedback system that collects both explicit ratings and implicit behavioral signals. Uses a publish-subscribe pattern so telemetry components remain independent from the UI layer that renders feedback controls.

```python
"""Feedback collection using an event-based pub/sub system for skill observability."""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Callable, Optional

logger = logging.getLogger("skill_feedback")


class FeedbackType(str, Enum):
    """Types of feedback signals the system collects."""
    EXPLICIT_THUMBS_UP = "explicit_thumbs_up"
    EXPLICIT_THUMBS_DOWN = "explicit_thumbs_down"
    EXPLICIT_RATING = "explicit_rating"  # 1-5 scale
    IMPLICIT_FOLLOW_UP = "implicit_follow_up"       # user asked for clarification after skill load
    IMPLICIT_OVERRIDE = "implicit_override"         # user quickly dismissed/overrode the skill output
    IMPLICIT_SESSION_EXTEND = "implicit_session_extend"  # session lasted >3x typical duration


@dataclass(frozen=True)
class FeedbackEvent:
    """Immutable event representing a single feedback signal."""
    feedback_id: str
    skill_name: str
    feedback_type: FeedbackType
    rating_value: Optional[int]        # Present only for EXPLICIT_RATING, 1-5
    comment_hash: Optional[str]        # SHA256 hash of free-text comment (no raw text stored)
    session_id: str
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @property
    def numeric_value(self) -> float:
        """Normalize all feedback types to a 0.0-1.0 scale for aggregation."""
        if self.feedback_type == FeedbackType.EXPLICIT_THUMBS_UP:
            return 1.0
        if self.feedback_type == FeedbackType.EXPLICIT_THUMBS_DOWN:
            return 0.0
        if self.feedback_type == FeedbackType.EXPLICIT_RATING and self.rating_value is not None:
            return (self.rating_value - 1) / 4.0  # Map [1,5] to [0,1]
        # Implicit signals have lower weight
        implicit_weights = {
            FeedbackType.IMPLICIT_FOLLOW_UP: 0.3,
            FeedbackType.IMPLICIT_OVERRIDE: 0.1,
            FeedbackType.IMPLICIT_SESSION_EXTEND: 0.7,
        }
        return implicit_weights.get(self.feedback_type, 0.5)

    def to_dict(self) -> dict[str, Any]:
        return {
            "feedback_id": self.feedback_id,
            "skill_name": self.skill_name,
            "type": self.feedback_type.value,
            "numeric_value": self.numeric_value,
            "comment_hash": self.comment_hash,
            "session_id": _hash(self.session_id),
            "timestamp": self.timestamp.isoformat(),
        }


def _hash(text: str) -> Optional[str]:
    """Hash text for privacy-preserving storage of optional comments."""
    if not text:
        return None
    import hashlib
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:32]


class FeedbackCollector:
    """Collects and aggregates user feedback signals via an event-driven architecture.

    Supports multiple listener callbacks for real-time dashboards, alerting, or persistence.
    All stored data is anonymized — session IDs are hashed, comments are hashed.
    """

    def __init__(self) -> None:
        self._listeners: list[Callable[[FeedbackEvent], None]] = []
        self._feedback_history: list[FeedbackEvent] = []

    def register_listener(self, callback: Callable[[FeedbackEvent], None]) -> None:
        """Register a callback to receive every feedback event in real time."""
        if not callable(callback):
            raise TypeError("callback must be callable")
        self._listeners.append(callback)

    def remove_listener(self, callback: Callable[[FeedbackEvent], None]) -> bool:
        """Remove a previously registered listener. Returns True if found and removed."""
        try:
            self._listeners.remove(callback)
            return True
        except ValueError:
            return False

    def collect_explicit_feedback(self, skill_name: str, liked: bool,
                                   session_id: str, rating: Optional[int] = None,
                                   comment: Optional[str] = None) -> FeedbackEvent:
        """Record explicit thumbs up/down or a 1-5 star rating."""
        if rating is not None and not (1 <= rating <= 5):
            raise ValueError("rating must be between 1 and 5 inclusive")

        if liked and rating is None:
            ftype = FeedbackType.EXPLICIT_THUMBS_UP
        elif not liked and rating is None:
            ftype = FeedbackType.EXPLICIT_THUMBS_DOWN
        else:
            ftype = FeedbackType.EXPLICIT_RATING

        import uuid
        event = FeedbackEvent(
            feedback_id=str(uuid.uuid4()),
            skill_name=skill_name.strip().lower(),
            feedback_type=ftype,
            rating_value=rating,
            comment_hash=_hash(comment) if comment else None,
            session_id=session_id,
        )

        self._feedback_history.append(event)
        self._dispatch(event)
        logger.info("feedback: %s type=%s rating=%s", skill_name, ftype.value, rating)
        return event

    def record_implicit_signal(self, skill_name: str, signal_type: FeedbackType,
                                session_id: str) -> FeedbackEvent:
        """Record an implicit behavioral signal (follow-up, override, extended session)."""
        if signal_type not in (FeedbackType.IMPLICIT_FOLLOW_UP,
                               FeedbackType.IMPLICIT_OVERRIDE,
                               FeedbackType.IMPLICIT_SESSION_EXTEND):
            raise ValueError(f"Invalid implicit signal type: {signal_type}")

        import uuid
        event = FeedbackEvent(
            feedback_id=str(uuid.uuid4()),
            skill_name=skill_name.strip().lower(),
            feedback_type=signal_type,
            session_id=session_id,
        )

        self._feedback_history.append(event)
        self._dispatch(event)
        logger.info("implicit_signal: %s type=%s", skill_name, signal_type.value)
        return event

    def get_satisfaction_score(self, skill_name: str, window_hours: int = 24) -> float:
        """Compute the average satisfaction score for a skill within the given time window.

        Returns a value between 0.0 (all negative) and 1.0 (all positive).
        Returns None if no feedback exists in the window.
        """
        cutoff = datetime.now(timezone.utc).timestamp() - (window_hours * 3600)
        recent = [
            evt for evt in self._feedback_history
            if evt.skill_name == skill_name and evt.timestamp.timestamp() >= cutoff
        ]

        if not recent:
            return float("nan")  # No data — caller should handle with fallback defaults

        avg_score = sum(evt.numeric_value for evt in recent) / len(recent)
        return round(avg_score, 4)

    def get_feedback_distribution(self, skill_name: str) -> dict[str, int]:
        """Return count of each feedback type for a skill (lifetime)."""
        distribution: dict[str, int] = {}
        for evt in self._feedback_history:
            if evt.skill_name == skill_name:
                key = evt.feedback_type.value
                distribution[key] = distribution.get(key, 0) + 1
        return distribution

    def _dispatch(self, event: FeedbackEvent) -> None:
        """Send the event to all registered listeners."""
        for listener in self._listeners:
            try:
                listener(event)
            except Exception:
                logger.exception("error in feedback listener for skill=%s", event.skill_name)


# --- Usage Example ---

def _example_dashboard_callback(event: FeedbackEvent) -> None:
    """Example listener that would push updates to a live dashboard."""
    print(f"[DASHBOARD] {event.skill_name} → {event.feedback_type.value} "
          f"(score={event.numeric_value:.2f})")


def main() -> None:
    """Demonstrate the feedback collector in action."""
    collector = FeedbackCollector()
    collector.register_listener(_example_dashboard_callback)

    session = "session-def456"

    # Explicit positive feedback
    evt1 = collector.collect_explicit_feedback(
        skill_name="trading-risk-stop-loss",
        liked=True,
        session_id=session,
    )
    print(f"Explicit thumbs up: {evt1.to_dict()}")

    # Star rating
    evt2 = collector.collect_explicit_feedback(
        skill_name="trading-risk-stop-loss",
        liked=False,
        session_id=session,
        rating=3,
        comment="Good but missing ATR trailing logic",
    )
    print(f"Star rating 3/5: {evt2.to_dict()}")

    # Implicit signals
    collector.record_implicit_signal(
        skill_name="trading-risk-stop-loss",
        signal_type=FeedbackType.IMPLICIT_FOLLOW_UP,
        session_id=session,
    )

    collector.record_implicit_signal(
        skill_name="coding-code-review",
        signal_type=FeedbackType.IMPLICIT_OVERRIDE,
        session_id=session,
    )

    # Satisfaction score
    satisfaction = collector.get_satisfaction_score("trading-risk-stop-loss")
    print(f"Satisfaction score: {satisfaction}")

    # Distribution
    dist = collector.get_feedback_distribution("trading-risk-stop-loss")
    print(f"Feedback distribution: {dist}")


if __name__ == "__main__":
    main()
```

---

## Constraints

### MUST DO
- Hash every session ID before writing to any persistent store; never log raw conversation content
- Record both manual (`/skill`) and auto-triggered skill loads through the same collector interface to ensure consistent data quality
- Compute trigger-to-action fidelity using only structural checks (pattern references, checklist coverage) — never parse assistant text for semantic accuracy
- Aggregate telemetry into time-bucketed windows (hourly, daily) before storing; never retain per-event granularity beyond 24 hours in the primary store
- Correlate quality scores from related skills (`coding-skill-quality-metrics`, `agent-skill-lifecycle-management`) with usage metrics to produce unified dashboards
- Include both explicit feedback (thumbs up/down, star ratings) and implicit signals (follow-up rate, override frequency) in every satisfaction calculation
- Provide a public API (`record_load`, `record_fidelity_signal`, `collect_explicit_feedback`, `get_satisfaction_score`) that is fully testable without external dependencies

### MUST NOT DO
- Store PII, user emails, conversation transcripts, or any personally identifiable information in telemetry events
- Use raw LLM confidence scores as a proxy for skill quality — always combine with behavioral feedback signals
- Skip recording fidelity signals just because they are computationally expensive; defer to async processing if latency is a concern, never omit
- Correlate skills by directory name alone; always use the fully qualified `metadata.name` field from frontmatter for deduplication
- Aggregate data at a granularity finer than per-hour buckets in long-term storage — hourly is the minimum retention bucket size
- Expose individual session telemetry publicly — dashboards must show only aggregated statistics with a minimum of 10 sessions per data point

---

## Output Template

When this skill is active, the model's output must contain:

1. **Telemetry Schema Definition** — A Python `dataclass` or equivalent schema defining all event fields, their types, and which are required vs optional. Must include privacy annotations on sensitive fields.

2. **Collector Implementation** — A complete collector class implementing the `SkillTelemetryCollector` pattern with `record_load`, `get_stats`, and `flush` methods, plus a `FeedbackCollector` with pub/sub listener support.

3. **Fidelity Scoring Logic** — Code that computes trigger-to-action fidelity as a weighted blend of pattern-coverage and checklist-coverage scores. Must include the scoring formula in a docstring comment.

4. **Dashboard Aggregation Query** — Example code showing how to roll up events into hourly/daily buckets and compute `adoption_rate`, `fidelity_index`, and `satisfaction_score` per skill.

5. **Privacy Compliance Checklist** — A brief enumeration of every field in the output, annotated as `[SAFE]` or `[HASHED]` to confirm PII-free design.

6. **Usage Example** — A runnable `main()` function that exercises all collector methods end-to-end and prints representative telemetry output.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-skill-quality-metrics` | Provides the quality scoring framework (code correctness, completeness, pattern adherence) that feeds into skill satisfaction calculations |
| `agent-skill-trigger-engineering` | Defines how trigger keywords are engineered; this skill measures whether those engineering decisions produce good routing fidelity in practice |
| `agent-skill-lifecycle-management` | Handles skill deprecation and retirement decisions; observability metrics from this skill feed directly into lifecycle transition thresholds |

## Live References

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [OpenTelemetry Observability Framework](https://opentelemetry.io/docs/) — Official OpenTelemetry documentation for metrics, traces, and logs observability
- [Prometheus Metrics Best Practices](https://prometheus.io/docs/practices/naming/) — Prometheus documentation on metric naming conventions and labeling strategies
- [Grafana Dashboard Design Patterns](https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/) — Grafana's guide to building effective observability dashboards
- [ELK Stack for Log Analytics (Elastic)](https://www.elastic.co/what-is/elk-stack) — Elastic documentation on Elasticsearch, Logstash, and Kibana for centralized log analysis
- [LangSmith Observability Platform](https://docs.smith.langchain.com/) — LangChain's observability platform for monitoring LLM application performance and tracing
