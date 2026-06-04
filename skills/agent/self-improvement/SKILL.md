---
name: self-improvement
description: Enables AI agents to continuously improve through structured reflection
  cycles, feedback-driven strategy evolution, pattern recognition across experiences,
  and adaptive knowledge base management.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: agent
  triggers: self improvement, agent reflection, feedback loop, strategy evolution,
    continuous improvement, how do i improve ai agent, experience-based learning,
    agent optimization
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
  related-skills: personal-workflow-framework,conversation-memory,confidence-based-selector
---
# Self-Improving AI Agent Framework

Enables AI agents to continuously improve through structured reflection cycles, feedback-driven strategy evolution, pattern recognition across experiences, and adaptive knowledge base management. The model acts as a meta-cognitive agent that observes its own outcomes, extracts generalizable lessons, and applies them to future decisions — turning every interaction into an improvement opportunity.

## TL;DR Checklist

- [ ] Complete a reflection cycle after every meaningful task outcome (success or failure)
- [ ] Extract exactly 3 learnings per reflection: what worked, what didn't, what to try next
- [ ] Store experience records with situation-context, action-taken, and outcome-evaluated
- [ ] Run strategy evaluation weekly to identify underperforming tactics and replace them
- [ ] Retrieve past experiences by situational similarity before attempting a new strategy
- [ ] Update knowledge base only with verified learnings — never store unvalidated assumptions
- [ ] Reference code-philosophy (5 Laws of Elegant Defense) in all data mutation logic

---

## Orchestration Flow

```
Task Completion
    ↓
┌───────────────────────────────────────────┐
│  Capture Task Outcome                     │
│  (strategy, quality, result details)      │
│                                           │
│  Missing data? ──► Reject, request fix    │
│  Complete? ──► Proceed to reflection      │
└──────────────┬────────────────────────────┘
               ↓
┌───────────────────────────────────────────┐
│  Run Reflection Cycle                     │
│  (what worked / what failed → learnings)  │
│                                           │
│  <1 learning? ──► Generate default       │
│  ≥1 learning? ──► Store record            │
└──────────────┬────────────────────────────┘
               ↓
┌───────────────────────────────────────────┐
│  Store Experience Record                  │
│  (context hash + action + outcome)        │
│                                           │
│  Duplicate ID? ──► Skip, log warning      │
│  New record? ──► Persist atomically       │
└──────────────┬────────────────────────────┘
               ↓
┌───────────────────────────────────────────┐
│  Evaluate Strategies (periodic)           │
│  (win rate + avg quality + trend)         │
│                                           │
│  <5 data points? ──► Defer decision       │
│  ≥5 points? ──► Retain/Promote/Retire    │
└──────────────┬────────────────────────────┘
               ↓
┌───────────────────────────────────────────┐
│  Update Knowledge Base                    │
│  (merge learnings, deduplicate, version)  │
│                                           │
│  Conflict detected? ──► Flag for review   │
│  Verified? ──► Merge into KB              │
└──────────────┬────────────────────────────┘
               ↓
┌───────────────────────────────────────────┐
│  Retrieve Similar Experiences             │
│  (for next task strategy selection)       │
│                                           │
│  <2 matches? ──► Use default strategy    │
│  Sufficient? ──► Load top-k precedents    │
└───────────────────────────────────────────┘
```

## When to Use

Use this skill when:

- An AI agent operates repeatedly over time and benefits from learning across interactions
- Building a system where strategy selection improves as more experience data accumulates
- Implementing post-mortem analysis that feeds back into improved decision-making
- Designing a tutoring or coaching assistant that adapts its teaching approach based on student performance
- Creating a code-review assistant that gets better at spotting project-specific issues over time
- Developing an operations agent that learns from incident responses and optimizes future runbooks

## When NOT to Use

Avoid this skill for:

- Single-use, one-shot tasks with no continuity — reflection requires history to be meaningful
- Real-time systems where the overhead of reflection would cause latency spikes — defer non-critical reflections to background batches
- Domains with extremely high-frequency interactions (>1000/day) — aggregation windows must be tuned or you'll drown in noise
- When feedback signals are unreliable or systematically biased — garbage learnings corrupt the improvement loop

---

## Core Workflow

1. **Capture Task Outcome** — After completing a task, record the outcome with structured metadata: task description, strategy used, resources consumed, success/failure status, and any measurable result (latency, accuracy, user satisfaction).
   **Checkpoint:** All mandatory fields must be populated. If the task produced an observable artifact (code output, report, decision), attach its reference or summary.

2. **Run Reflection Cycle** — Analyze the captured outcome using the ReflectionEngine:
   - Identify what went well and why
   - Identify what went wrong or could improve
   - Generate 1-3 actionable learnings with specific conditions attached
   **Checkpoint:** Each learning must be testable — it should state a concrete "if X, then try Y" pattern. Vague observations like "communication was poor" are rejected; they must be operationalized into "when the user asked follow-up questions, providing a summary first reduced confusion."

3. **Store Experience Record** — Persist the full experience in the ExperienceMemory with: situation context (hashed for similarity search), action taken, outcome evaluated, and extracted learnings.
   **Checkpoint:** Ensure the experience record includes a unique ID and timestamp. Verify it's retrievable by querying with a sample of its own context before considering it stored.

4. **Evaluate Strategies** — Periodically (daily or weekly) analyze all strategies against their performance metrics:
   - Compute win rate, average outcome quality, and resource efficiency per strategy
   - Identify strategies below the performance threshold
   - Generate replacement candidates from learnings of successful situations with similar context
   **Checkpoint:** Only retire a strategy if it has at least 5 data points — avoid premature optimization on insufficient evidence.

5. **Update Knowledge Base** — Merge validated learnings into the agent's knowledge base:
   - Deduplicate against existing entries using similarity matching
   - Flag conflicting learnings for manual review
   - Update strategy registry with new or improved tactics
   **Checkpoint:** Never overwrite a learning without preserving the original (audit trail). Use versioned knowledge entries.

6. **Retrieve Relevant Experiences** — Before starting a new task, query ExperienceMemory for similar past situations using situation-context similarity. Load the top-k results to inform strategy selection.
   **Checkpoint:** If fewer than 2 experiences match above threshold, proceed with default strategy but note the gap in experience coverage.

### Fallback and Error Routing

- **Empty experience memory** → Proceed with default strategies; do not block task execution waiting for history that doesn't exist yet
- **Reflection produces no actionable learnings** → Generate a default "re-attempt with adjusted parameters" learning to ensure continuous signal flow
- **Strategy evaluation inconclusive** (insufficient data points) → Mark strategy as `continue_tracking`; never retire or promote without minimum evidence
- **Knowledge base conflict** (two learnings with contradictory conditions for same context) → Flag for manual review; do not auto-resolve
- **Experience storage full** → Prune oldest 20% of records first, then retry the write; log a warning if pruning doesn't free sufficient space
- **Similarity search returns no matches** → Fall back to broad-category matching (match on outcome_quality instead of context) for at least one precedent

---

## Implementation Patterns

### Pattern 1: Reflection Cycle Engine

```python
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List, Optional, Tuple


class OutcomeQuality(Enum):
    EXCELLENT = 5
    GOOD = 4
    AVERAGE = 3
    POOR = 2
    FAILURE = 1


@dataclass(frozen=True)
class ExperienceRecord:
    """Immutable record of a completed task with outcome and learnings.

    Frozen dataclass ensures immutability after creation (Law 3).
    Each record captures enough context for future similarity matching.

    Attributes:
        record_id: Unique identifier (UUID-like string)
        timestamp: When the task was completed
        situation_context: Hashable description of the problem context
        action_taken: What strategy/approach was used
        outcome_quality: Rated quality of the result on 1-5 scale
        result_summary: Brief summary of what happened
        learnings: List of extracted lessons with specific conditions
    """

    record_id: str
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    situation_context: str = ""
    action_taken: str = ""
    outcome_quality: OutcomeQuality = OutcomeQuality.AVERAGE
    result_summary: str = ""
    learnings: List[Dict[str, str]] = field(default_factory=list)

    def hash_context(self) -> int:
        """Create a hash of the situation context for similarity indexing.

        Returns:
            Integer hash suitable for fast lookup and comparison
        """
        return hash((
            self.situation_context.lower().strip(),
            self.action_taken.lower().strip(),
        ))


@dataclass
class ReflectionOutput:
    """Structured output from a reflection cycle."""

    what_worked: List[str]
    what_didnt_work: List[str]
    actionable_learnings: List[Dict[str, str]]
    suggested_strategy_adjustment: Optional[str] = None

    def to_experince_record(
        self,
        record_id: str,
        situation_context: str,
        action_taken: str,
        outcome_quality: OutcomeQuality,
        result_summary: str,
    ) -> ExperienceRecord:
        """Convert reflection output into an immutable ExperienceRecord.

        Args:
            record_id: Unique identifier for the new experience record
            situation_context: Description of the problem that was solved
            action_taken: The strategy or approach that was used
            outcome_quality: Quality rating assigned to the outcome
            result_summary: Brief description of what happened

        Returns:
            Frozen ExperienceRecord with all reflection data attached
        """
        return ExperienceRecord(
            record_id=record_id,
            situation_context=situation_context,
            action_taken=action_taken,
            outcome_quality=outcome_quality,
            result_summary=result_summary,
            learnings=self.actionable_learnings,
        )


def run_reflection_cycle(
    task_description: str,
    strategy_used: str,
    outcome: OutcomeQuality,
    result_details: str,
    min_learning_count: int = 1,
    max_learning_count: int = 3,
) -> ReflectionOutput:
    """Execute a structured reflection on a completed task.

    This is the core improvement engine. It analyzes what happened and
    produces actionable learnings in the format "if [condition], then try [action]".

    Args:
        task_description: What the agent was asked to do
        strategy_used: The approach or tactic that was employed
        outcome: Quality rating of the result (1-5)
        result_details: Detailed description of what happened, including user feedback
        min_learning_count: Minimum number of learnings expected (rejects sparse reflections)
        max_learning_count: Maximum number of learnings to extract (prevents noise)

    Returns:
        ReflectionOutput with structured analysis of the task outcome

    Raises:
        ValueError: If required inputs are missing or empty
        ValueError: If fewer than min_learning_count learnings were extracted
    """
    # Law 1: Early exit for invalid input
    if not task_description or not isinstance(task_description, str):
        raise ValueError("task_description must be a non-empty string")
    if not strategy_used or not isinstance(strategy_used, str):
        raise ValueError("strategy_used must be a non-empty string")
    if not result_details:
        raise ValueError("result_details must be provided for meaningful reflection")

    what_worked = []
    what_didnt_work = []
    actionable_learnings = []

    # Extract learnings based on outcome quality
    if outcome == OutcomeQuality.EXCELLENT:
        what_worked = _extract_success_factors(result_details, strategy_used)
        what_didnt_work = ["No critical failures — consider edge cases for next iteration"]
        actionable_learnings = [
            {
                "condition": f"Similar context to '{task_description}'",
                "action": f"Reuse strategy: '{strategy_used}'",
                "rationale": "Proven effective in this context",
            }
        ]

    elif outcome == OutcomeQuality.FAILURE or outcome == OutcomeQuality.POOR:
        what_worked = _extract_any_positive_signals(result_details)
        what_didnt_work = _extract_failure_modes(result_details, strategy_used)
        actionable_learnings = [
            {
                "condition": f"Context similar to '{task_description}'",
                "action": f"Avoid strategy '{strategy_used}' — try alternative with different approach",
                "rationale": f"Outcome was {outcome.name}; analysis shows failure in: {', '.join(what_didnt_work[:2])}",
            }
        ]

    else:
        # Average / Good outcomes produce nuanced reflections
        what_worked = _extract_partial_success(result_details, strategy_used)
        what_didnt_work = _extract_improvement_areas(result_details)
        actionable_learnings = [
            {
                "condition": f"Context similar to '{task_description}'",
                "action": f"Tweak strategy '{strategy_used}' by: {'; '.join(what_didnt_work[:1])}",
                "rationale": "Partial success indicates room for targeted improvement",
            }
        ]

    # Enforce minimum learning count (Law 4: explicit validation)
    if len(actionable_learnings) < min_learning_count:
        actionable_learnings.append({
            "condition": f"Context similar to '{task_description}'",
            "action": "Re-attempt with adjusted parameters from what_worked list",
            "rationale": "Insufficient learnings extracted — default improvement path",
        })

    return ReflectionOutput(
        what_worked=what_worked[:3],
        what_didnt_work=what_didnt_work[:3],
        actionable_learnings=actionable_learnings[:max_learning_count],
    )


def _extract_success_factors(result: str, strategy: str) -> List[str]:
    """Extract positive outcomes from the result description."""
    indicators = ["succeeded", "completed", "user confirmed", "no errors",
                  "faster than expected", "accepted without changes"]
    found = [ind for ind in indicators if ind.lower() in result.lower()]
    return found or [f"Strategy '{strategy}' produced a valid outcome"]


def _extract_failure_modes(result: str, strategy: str) -> List[str]:
    """Extract failure indicators from the result description."""
    indicators = ["error", "failed", "rejected", "incorrect", "too slow",
                  "user complained", "wrong answer", "timeout", "crashed"]
    found = [ind for ind in indicators if ind.lower() in result.lower()]
    return found or [f"Strategy '{strategy}' had undefined failure mode"]


def _extract_improvement_areas(result: str) -> List[str]:
    """Identify areas where the outcome could have been better."""
    indicators = ["could be faster", "missing detail", "unclear", "too verbose",
                  "incomplete", "redundant", "format issue"]
    return [ind for ind in indicators if ind.lower() in result.lower()]


def _extract_any_positive_signals(result: str) -> List[str]:
    """Find at least one positive signal even in poor outcomes."""
    positives = ["attempted", "partially", "some progress", "learned"]
    found = [p for p in positives if p.lower() in result.lower()]
    return found or ["Process was executed — infrastructure was functional"]


def _extract_partial_success(result: str, strategy: str) -> List[str]:
    """Extract nuanced learnings from mixed outcomes."""
    signals = ["worked for part", "succeeded conditionally", "acceptable with caveats"]
    return [ind for ind in signals if ind.lower() in result.lower()] or [
        f"Strategy '{strategy}' produced partial results worth analyzing further"
    ]
```

### Pattern 2: Strategy Evaluation System (BAD vs GOOD)

```python
# ❌ BAD: Simple pass/fail with no statistical rigor — one bad run kills a good strategy
def bad_strategy_eval(strategy_name: str, records: List[Dict]) -> Dict:
    wins = sum(1 for r in records if r["outcome"] == "success")
    return {
        "name": strategy_name,
        "win_rate": wins / len(records) if records else 0,
        "retired": wins < len(records),  # Retires on any failure — absurd threshold
    }


# ✅ GOOD: Multi-metric evaluation with sample-size validation and trend detection
def evaluate_strategy_performance(
    strategy_name: str,
    experiences: List[ExperienceRecord],
    min_data_points: int = 5,
    win_rate_threshold: float = 0.30,
) -> Dict:
    """Evaluate a strategy's performance using multi-metric analysis.

    Applies statistical rigor: requires minimum data points before making
    retirement decisions, computes multiple quality dimensions, and tracks
    trend direction to catch degrading strategies early.

    Args:
        strategy_name: Name of the strategy to evaluate
        experiences: List of ExperienceRecord objects where action_taken matches this strategy
        min_data_points: Minimum records needed before making a retention decision
        win_rate_threshold: Minimum win rate (quality >= GOOD) to consider strategy viable

    Returns:
        Dict with performance metrics, retention recommendation, and trend data.
        Always returns the same keys regardless of outcome for caller stability.
    """
    # Law 1: Guard clause for empty input
    if not experiences:
        return _empty_strategy_report(strategy_name)

    # Filter to matching strategy (Law 2: parse at boundary — normalize action_taken)
    matching = [
        e for e in experiences
        if e.action_taken.lower().strip() == strategy_name.lower().strip()
    ]

    if len(matching) < min_data_points:
        return {
            "strategy_name": strategy_name,
            "data_points": len(experiences),
            "status": "insufficient_data",
            "recommendation": "continue_tracking",
            "win_rate": None,
            "avg_quality": None,
            "trend": "unknown",
        }

    # Compute metrics (Law 3: return new data structures, never mutate inputs)
    qualities = [e.outcome_quality.value for e in matching]
    win_count = sum(1 for q in qualities if q >= OutcomeQuality.GOOD.value)
    win_rate = win_count / len(matching)
    avg_quality = sum(qualities) / len(qualities)

    # Detect trend: compare last-half vs first-half quality
    split_idx = len(matching) // 2
    first_half_avg = sum(q.value for q in matching[:split_idx]) / max(split_idx, 1)
    second_half_avg = sum(q.value for q in matching[split_idx:]) / max(len(matching) - split_idx, 1)
    trend = "improving" if second_half_avg > first_half_avg + 0.2 else (
        "degrading" if first_half_avg > second_half_avg + 0.2 else "stable"
    )

    # Make retention decision
    should_retire = (
        win_rate < win_rate_threshold
        and trend == "degrading"
    )
    should_promote = (
        win_rate >= 0.80
        and avg_quality >= OutcomeQuality.GOOD.value + 0.5
        and trend == "improving"
    )

    recommendation = "promote" if should_promote else (
        "retire" if should_retire else "retain"
    )

    return {
        "strategy_name": strategy_name,
        "data_points": len(matching),
        "status": "active",
        "recommendation": recommendation,
        "win_rate": round(win_rate, 4),
        "avg_quality": round(avg_quality, 2),
        "trend": trend,
    }


def _empty_strategy_report(name: str) -> Dict:
    """Return a standard empty report structure."""
    return {
        "strategy_name": name,
        "data_points": 0,
        "status": "no_data",
        "recommendation": "insufficient_data",
        "win_rate": None,
        "avg_quality": None,
        "trend": "unknown",
    }
```

### Pattern 3: Experience Memory with Similarity Retrieval

```python
class ExperienceMemory:
    """Persistent store for experience records with similarity-based retrieval.

    Manages the lifecycle of ExperienceRecord objects: creation, storage,
    retrieval by situational similarity, and periodic pruning of stale data.

    Follows Law 3 (Atomic Predictability) — all writes produce new state;
    no in-place mutation of stored records.
    """

    def __init__(self):
        """Initialize an empty experience memory store."""
        self._records: Dict[str, ExperienceRecord] = {}

    def store_experience(self, experience: ExperienceRecord) -> bool:
        """Store an experience record immutably.

        Args:
            experience: The ExperienceRecord to persist

        Returns:
            True if stored successfully, False if duplicate ID detected

        Raises:
            ValueError: If the experience record is None or has invalid fields
        """
        # Law 1: Guard clause
        if experience is None:
            raise ValueError("experience must not be None")
        if not experience.record_id or not isinstance(experience.record_id, str):
            raise ValueError("experience must have a valid record_id")
        if not experience.situation_context:
            raise ValueError("experience must have a situation_context for similarity search")

        # Law 4: Fail fast on duplicates
        if experience.record_id in self._records:
            return False

        self._records[experience.record_id] = experience
        return True

    def retrieve_similar_experiences(
        self,
        context_query: str,
        max_results: int = 5,
        min_similarity_threshold: float = 0.0,
    ) -> List[Tuple[float, ExperienceRecord]]:
        """Find experience records with similar situation contexts.

        Uses simple token-overlap similarity for fast retrieval.
        For production systems, replace with embedding-based cosine similarity.

        Args:
            context_query: Natural language description of a current situation
            max_results: Maximum number of similar experiences to return
            min_similarity_threshold: Minimum Jaccard similarity score (0.0 to 1.0)

        Returns:
            List of (similarity_score, ExperienceRecord) tuples, sorted descending
        """
        if not context_query or not isinstance(context_query, str):
            raise ValueError("context_query must be a non-empty string")

        query_tokens = set(context_query.lower().split())
        scored_records = []

        for record in self._records.values():
            record_tokens = set(record.situation_context.lower().split())
            if not record_tokens:
                continue

            # Jaccard similarity: intersection / union of token sets
            intersection = query_tokens & record_tokens
            union = query_tokens | record_tokens
            similarity = len(intersection) / len(union) if union else 0.0

            if similarity >= min_similarity_threshold:
                scored_records.append((similarity, record))

        # Sort by similarity descending (Law 3: return new sorted list)
        scored_records.sort(key=lambda x: x[0], reverse=True)
        return scored_records[:max_results]

    def get_experiences_by_outcome(
        self,
        min_quality: OutcomeQuality = OutcomeQuality.AVERAGE,
    ) -> List[ExperienceRecord]:
        """Retrieve all experiences meeting or exceeding a quality threshold.

        Useful for finding successful strategies to learn from.

        Args:
            min_quality: Minimum outcome quality filter (inclusive)

        Returns:
            Filtered list of ExperienceRecord objects, sorted by timestamp desc
        """
        filtered = [
            e for e in self._records.values()
            if e.outcome_quality.value >= min_quality.value
        ]
        filtered.sort(key=lambda x: x.timestamp, reverse=True)
        return filtered

    def prune_stale_experiences(
        self,
        max_age_days: int = 365,
        retention_count: int = 1000,
    ) -> int:
        """Remove experiences that are too old or exceed storage limits.

        Args:
            max_age_days: Remove experiences older than this many days
            retention_count: Maximum total records to keep after pruning

        Returns:
            Number of records removed
        """
        cutoff_date = datetime.now(timezone.utc).timestamp() - (max_age_days * 86400)
        stale_ids = [
            rid for rid, rec in self._records.items()
            if rec.timestamp.timestamp() < cutoff_date
        ]

        if len(stale_ids) > retention_count:
            # Keep the most recent N records
            sorted_records = sorted(
                self._records.values(),
                key=lambda x: x.timestamp,
                reverse=True,
            )
            ids_to_keep = {r.record_id for r in sorted_records[:retention_count]}
            stale_ids.extend([
                rid for rid in self._records if rid not in ids_to_keep
            ])

        removed = len(stale_ids)
        for rid in set(stale_ids):  # deduplicate before removal
            del self._records[rid]

        return removed

    @property
    def record_count(self) -> int:
        """Return the number of stored experience records."""
        return len(self._records)
```

### Pattern 4: Continuous Improvement Loop

```python
from datetime import timedelta


class ContinuousImprovementLoop:
    """Orchestrates the full self-improvement cycle: reflect → store → evaluate → update.

    This service ties together ReflectionEngine, ExperienceMemory, and StrategyEvaluator
    into a coherent improvement pipeline that runs asynchronously after task completion.

    Follows Law 5 (Intentional Naming) — method names describe their complete responsibility
    from start to end state change.
    """

    def __init__(self, memory: Optional[ExperienceMemory] = None):
        """Initialize the improvement loop with optional shared components.

        Args:
            memory: Shared ExperienceMemory instance for persistent storage.
                   If None, a fresh store is created (useful for testing).
        """
        self.memory = memory or ExperienceMemory()

    def record_and_reflect(
        self,
        task_id: str,
        task_description: str,
        strategy_used: str,
        outcome: OutcomeQuality,
        result_details: str,
    ) -> ReflectionOutput:
        """Complete a full reflection cycle and store the resulting experience.

        This is the primary API for turning task outcomes into learnings:
        1. Run reflection on the task outcome
        2. Create an ExperienceRecord from the reflection
        3. Store the record in ExperienceMemory
        4. Return the reflection output for immediate use

        Args:
            task_id: Unique identifier for the completed task
            task_description: What was asked of the agent
            strategy_used: The approach that was attempted
            outcome: Quality rating of the result
            result_details: Detailed description of the outcome

        Returns:
            ReflectionOutput with what worked, what didn't, and actionable learnings

        Raises:
            ValueError: If required inputs are invalid
        """
        # Step 1: Run reflection
        reflection = run_reflection_cycle(
            task_description=task_description,
            strategy_used=strategy_used,
            outcome=outcome,
            result_details=result_details,
        )

        # Step 2: Create and store experience record
        experience_record = reflection.to_experince_record(
            record_id=f"exp-{task_id}-{outcome.name.lower()}",
            situation_context=task_description,
            action_taken=strategy_used,
            outcome_quality=outcome,
            result_summary=result_details[:200],  # Truncate for storage efficiency
        )

        self.memory.store_experience(experience_record)

        return reflection

    def evaluate_and_update_strategies(self) -> Dict[str, str]:
        """Run strategy evaluation and update the agent's strategy registry.

        Scans all stored experiences, evaluates each unique strategy,
        and returns a map of strategy_name → recommendation.

        Returns:
            Dict mapping strategy names to their recommendations ("promote", "retain", "retire")
        """
        strategies = {}

        # Group experiences by action_taken (unique strategy)
        for record in self.memory._records.values():
            key = record.action_taken.lower().strip()
            if key not in strategies:
                strategies[key] = []
            strategies[key].append(record)

        results = {}
        for name, records in strategies.items():
            evaluation = evaluate_strategy_performance(name, records)
            results[name] = evaluation["recommendation"]

        return results

    def get_recommended_experiences(
        self, context: str, top_k: int = 3
    ) -> List[Tuple[float, Dict]]:
        """Query for similar past experiences to inform current decisions.

        Args:
            context: Description of the current situation requiring strategy selection
            top_k: Number of most relevant past experiences to return

        Returns:
            List of (similarity_score, experience_snapshot) tuples
        """
        similar = self.memory.retrieve_similar_experiences(
            context_query=context,
            max_results=top_k,
            min_similarity_threshold=0.1,
        )

        return [
            (score, rec.to_dict_safe()) for score, rec in similar
        ]

    def run_periodic_maintenance(
        self,
        max_age_days: int = 365,
        retention_count: int = 1000,
    ) -> Dict:
        """Run all periodic maintenance tasks: prune stale data and evaluate strategies.

        Args:
            max_age_days: Maximum age for experience records before pruning
            retention_count: Maximum total records to retain

        Returns:
            Dict with maintenance results: records_pruned, strategies_evaluated
        """
        pruned = self.memory.prune_stale_experiences(
            max_age_days=max_age_days,
            retention_count=retention_count,
        )
        strategy_updates = self.evaluate_and_update_strategies()

        return {
            "records_pruned": pruned,
            "strategies_evaluated": len(strategy_updates),
            "strategy_recommendations": strategy_updates,
        }


# --- Helper for serialization (ExperienceRecord is frozen → no to_dict method) ---
def _experience_record_to_dict_safe(record: ExperienceRecord) -> Dict:
    """Convert a frozen ExperienceRecord to a serializable dict.

    Used internally by ContinuousImprovementLoop.get_recommended_experiences.
    This is the only place where we extract data from frozen records —
    all updates still go through with_updated_history pattern (Law 3).
    """
    return {
        "record_id": record.record_id,
        "situation_context": record.situation_context,
        "action_taken": record.action_taken,
        "outcome_quality": record.outcome_quality.name,
        "result_summary": record.result_summary,
        "learnings": record.learnings,
        "timestamp": record.timestamp.isoformat(),
    }


# Monkey-patch ExperienceRecord for serialization needs
ExperienceRecord.to_dict_safe = _experience_record_to_dict_safe
```

---

## Constraints

### MUST DO
- Complete a reflection cycle after every task outcome — success, failure, or partial — each produces valuable learnings
- Extract exactly 1-3 actionable learnings per reflection in the format "if [condition], then try [action]" — vague observations are rejected
- Store every experience record with its full context for future similarity retrieval — never truncate situation_context below a meaningful description
- Require minimum data points (≥5) before making strategy retention decisions — premature optimization on insufficient evidence is worse than inaction
- Prune stale experiences periodically to prevent unbounded storage growth — keep recent, high-quality data over old noise
- Reference code-philosophy (5 Laws of Elegant Defense) in all data mutation logic — immutable records (Law 3), guard clauses everywhere (Law 1), fail fast on corruption (Law 4)

### MUST NOT DO
- Retire a strategy based on fewer than 5 data points — one bad outcome doesn't invalidate a good pattern
- Store learnings that can't be tested or applied to future decisions — "be more careful" is not a learning
- Override the reflection cycle with hardcoded responses — if you can't reflect, you can't improve
- Cache strategy evaluations indefinitely — re-evaluate at least weekly to catch degrading performance
- Allow unvalidated learnings into the knowledge base — every learning must be traced back to an actual experience record with outcome data

---

## Output Template

When applying this skill, produce:

1. **Reflection Summary** — Task outcome quality, what worked, what didn't, and extracted learnings
2. **Experience Stored** — Record ID, situation context hash, and confirmation of persistence in ExperienceMemory
3. **Strategy Impact** — How this reflection affects current strategy registry (new tactic added, existing tactic refined, or no change)
4. **Retrieved Precedents** — Similar past experiences found via similarity search, with relevance scores
5. **Improvement Trend** — Whether the agent's performance in this context is improving, stable, or degrading based on recent data

---

## Related Skills

| Skill | Purpose |
|---|---|
| `personal-workflow-framework` | Defines the recurring workflows that produce the outcomes being reflected upon |
| `conversation-memory` | Provides persistent memory infrastructure that feeds experience records into this framework |
| `confidence-based-selector` | Uses learned strategy performance to improve confidence scores for future task routing |

## Live References

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [Continual Learning in Neural Networks (Castro et al.)](https://arxiv.org/abs/1810.05091) — Foundational research on continuous learning mechanisms that prevent catastrophic forgetting
- [Experience Replay for Reinforcement Learning (Schaul et al.)](https://arxiv.org/abs/1511.05952) — Original prioritized experience replay paper applicable to agent self-improvement
- [Reflection-Tuning: Training LLMs in Self-Reflection with Minimal Human Labels](https://arxiv.org/abs/2403.12778) — Research on using self-reflection for model improvement without external labels
- [Meta-Learning for Agent Strategy Evolution (Schmidhuber)](https://arxiv.org/abs/2106.05883) — Meta-learning approaches for rapid adaptation and strategy evolution in intelligent agents
- [Active Memory Mechanisms in LLMs (Qin et al.)](https://arxiv.org/abs/2401.17889) — Research on memory-augmented LLM architectures for sustained self-improvement
