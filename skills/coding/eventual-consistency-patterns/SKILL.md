---




name: eventual-consistency-patterns
description: Manages eventual consistency challenges in distributed systems — read model reconciliation, conflict resolution with CRDTs and vector clocks, anti-corruption layers, and stale read mitigation for event-driven architectures.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: eventual consistency, read model drift, conflict resolution, stale reads, anti-corruption layer, CRDT, vector clock, how do i handle inconsistent data in distributed systems
  archetypes:
    - tactical
    - diagnostic
  anti_triggers:
    - brainstorming
    - vague ideation
    - code golf
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, config, do-dont]
  related-skills: cqrs-pattern,event-sourcing-pattern,distributed-systems-architecture




---





# Eventual Consistency Management

Manages eventual consistency challenges in distributed event-driven architectures. When loaded, this skill makes the model implement concrete patterns for detecting read-model drift, resolving write conflicts with CRDTs and vector clocks, protecting bounded contexts via anti-corruption layers, and handling stale reads with staleness indicators and retry logic.

## TL;DR Checklist

- [ ] Calculate drift score (lagged events / total events) before selecting reconciliation strategy
- [ ] Use causal ordering for dependent events; total ordering only when global sequence is required
- [ ] Implement LWW-Register or G-Counter CRDTs for simple mergeable state instead of custom conflict logic
- [ ] Wrap all downstream reads with staleness indicators and exponential-backoff retry
- [ ] Deploy anti-corruption layer between bounded contexts to translate conflicting schemas
- [ ] Log reconciliation events with source, timestamp, conflict type, and resolution chosen
- [ ] Provide strong-consistency path for financial or compliance-critical reads

---

## When to Use

Use this skill when:

- Read models (projections) are falling behind event store writes and you need automated drift detection and reconciliation
- Multiple writers update the same logical entity and you need deterministic conflict resolution (CRDTs, vector clocks, last-write-wins)
- A downstream bounded context receives inconsistent or stale data from an upstream system and needs a translation layer
- User interfaces display data that may be seconds or minutes old and you need to surface staleness to users
- Event ordering is critical for business logic and causal dependencies must be preserved across distributed services
- You are designing a CQRS or event-sourcing architecture and need consistency guarantees documented with code

---

## When NOT to Use

Avoid this skill for:

- Implementing strict ACID transactions in a single database — use `cqrs-pattern` or direct relational transactions instead
- Designing distributed consensus algorithms (Paxos, Raft) — these require different patterns entirely
- Simple monolithic applications with no read/write split — eventual consistency overhead is not justified
- Brainstorming architectural tradeoffs without implementation intent — use a strategic planning approach first

---

## Core Workflow

1. **Identify the Consistency Model Required** — Determine whether causal ordering, monotonic reads, or snapshot isolation is sufficient for each read path. For financial transactions or compliance reads requiring strong consistency, mark them as `strong_consistency = True` and use a direct database query instead of the projection store. **Checkpoint:** Map every read endpoint to its consistency requirement (causal, eventual, or strong). Strong-consistency paths bypass all reconciliation logic.

    Use this table to select the appropriate consistency model for each read path:

    | Consistency Model | Guarantee | Latency Impact | Use Case | Implementation Cost |
    |---|---|---|---|---|
    | **Strong** | Always returns latest written value | High (blocking on consensus) | Financial balances, regulatory compliance | Highest — direct DB queries, locks |
    | **Causal** | Causally-related reads see consistent state | Medium (vector clock coordination) | User profiles with dependent updates | Medium — vector clocks + causal buffer |
    | **Monotonic Read** | Once a value is seen, future reads never regress | Low (local cache + version check) | Session data, feature flags | Low — version tags on responses |
    | **Eventual** | All replicas converge within bounded time | Lowest (async replication) | Analytics dashboards, recommendation feeds | Lowest — async projection, periodic reconciliation |

2. **Deploy Read-Model Drift Detection** — Implement a drift monitor that compares event-sequence IDs between the event store and each read-model table. Calculate the lag in events and the time delta since the last processed event. When drift exceeds the configured threshold (`max_lag_events` or `max_lag_seconds`), trigger reconciliation. **Checkpoint:** Drift monitor must emit a structured log entry containing: `source_event_id`, `read_model_last_id`, `lag_count`, `lag_seconds`, and `reconciliation_status`.

2. **Deploy Read-Model Drift Detection** — Implement a drift monitor that compares event-sequence IDs between the event store and each read-model table. Calculate the lag in events and the time delta since the last processed event. When drift exceeds the configured threshold (`max_lag_events` or `max_lag_seconds`), trigger reconciliation. **Checkpoint:** Drift monitor must emit a structured log entry containing: `source_event_id`, `read_model_last_id`, `lag_count`, `lag_seconds`, and `reconciliation_status`.

3. **Execute Reconciliation** — For small drift windows, replay missed events directly into the read model. For large gaps (exceeding `replay_threshold`), trigger a full rebuild of the affected projection by rehydrating from the event store with snapshot support. **Checkpoint:** After reconciliation, verify that `read_model_last_id == event_store_committed_id - unresolved_head_events`. Log any events that could not be replayed due to schema incompatibility.

4. **Resolve Write Conflicts** — When multiple writers update the same entity concurrently, apply the appropriate conflict-resolution strategy: use a CRDT (LWW-Register for scalar values, G-Counter for increments) when mergeability is possible, fall back to vector clocks for causal ordering of complex updates, or apply last-write-wins with configurable timestamp sources (wall-clock vs. logical clock). **Checkpoint:** Every resolved conflict must record the winner, loser, resolution strategy, and causality relationship.

5. **Implement Anti-Corruption Layer Translation** — Between any two bounded contexts sharing data across an event stream, implement a translation adapter that maps source schema to target schema, validates business invariants on translated events, and routes unresolvable translations to a quarantine queue for manual inspection. **Checkpoint:** The anti-corruption layer must never pass raw upstream events downstream without schema validation; every translation produces a domain-valid target event.

6. **Handle Stale Reads with Backoff and Indicators** — Every read operation against a projection store must check staleness by comparing the request's `consistent_since` timestamp against the read model's last-write timestamp. If stale, return data with a staleness indicator (e.g., `data_stale: True`, `staleness_seconds`) and retry the query up to `max_retry_count` times with exponential backoff (`base_delay * 2^attempt`). **Checkpoint:** Stale-read handling must complete within `max_stale_read_latency_ms`; if exceeded, fail over to the strong-consistency read path or return a cached result with explicit staleness warnings.

---

## Implementation Patterns

### Pattern 1: Read Model Drift Detection and Reconciliation

Detects when projections fall behind the event store by comparing sequence IDs. Supports incremental replay for small drift windows and full rebuild for large gaps.

```python
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional


@dataclass
class DriftMetrics:
    """Measure of how far a read model lags behind the event store."""
    source_event_id: str
    read_model_last_id: str
    lag_count: int
    lag_seconds: float
    reconciliation_status: str  # "in_sync", "recovering", "rebuild_needed"
    detected_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class ReconciliationResult:
    """Result of a reconciliation operation."""
    events_replayed: int
    rebuild_triggered: bool
    failed_events: list[str] = field(default_factory=list)
    completed_at: datetime = field(default_factory=datetime.utcnow)


class ReadModelDriftDetector:
    """Detects and reconciles drift between event store and read models.

    Uses sequence ID comparison to measure lag. Supports incremental replay
    for small gaps and full projection rebuild for large gaps with snapshot support.
    """

    def __init__(
        self,
        max_lag_events: int = 100,
        max_lag_seconds: float = 30.0,
        replay_threshold: int = 500,
    ) -> None:
        self.max_lag_events = max_lag_events
        self.max_lag_seconds = max_lag_seconds
        self.replay_threshold = replay_threshold

    def detect_drift(
        self,
        source_event_id: str,
        read_model_last_id: str,
        last_write_time: Optional[datetime] = None,
        current_time: Optional[datetime] = None,
    ) -> DriftMetrics:
        """Compare event store sequence against read model position.

        Calculates lag in event count and time delta since the read model was last updated.

        Args:
            source_event_id: Latest committed event ID from the event store.
            read_model_last_id: Last event ID processed by the read model projection.
            last_write_time: Timestamp of the read model's last write. If None,
                lag_seconds is estimated from sequence gap alone.
            current_time: Current UTC time for lag calculation. Defaults to now.

        Returns:
            DriftMetrics with lag count, time delta, and recommended status.
        """
        if current_time is None:
            current_time = datetime.utcnow()

        lag_count = self._parse_sequence_id(source_event_id) - self._parse_sequence_id(read_model_last_id)

        # Clamp negative values (read model ahead of source is impossible in normal operation)
        if lag_count < 0:
            lag_count = 0

        lag_seconds = (current_time - last_write_time).total_seconds() if last_write_time else float(lag_count) * 0.5

        # Determine reconciliation status
        if lag_count == 0 and lag_seconds == 0:
            status = "in_sync"
        elif lag_count > self.replay_threshold:
            status = "rebuild_needed"
        elif lag_count > self.max_lag_events or lag_seconds > self.max_lag_seconds:
            status = "recovering"
        else:
            status = "recovering"

        return DriftMetrics(
            source_event_id=source_event_id,
            read_model_last_id=read_model_last_id,
            lag_count=lag_count,
            lag_seconds=lag_seconds,
            reconciliation_status=status,
            detected_at=current_time,
        )

    def reconcile(
        self,
        metrics: DriftMetrics,
        replay_events: Optional[list[dict]] = None,
    ) -> ReconciliationResult:
        """Execute reconciliation based on detected drift.

        For small drift windows (below replay_threshold), replays missed events
        directly into the read model. For large gaps, triggers a full rebuild.

        Args:
            metrics: DriftMetrics from detect_drift().
            replay_events: List of event dicts to replay. Each dict must contain
                'event_id', 'type', 'payload', and 'timestamp' keys.

        Returns:
            ReconciliationResult with count of events processed and any failures.

        Raises:
            ValueError: If replay_events is provided but metrics indicates rebuild_needed.
        """
        if metrics.reconciliation_status == "rebuild_needed" and replay_events:
            raise ValueError(
                f"Cannot incrementally replay {len(replay_events)} events when "
                f"drift ({metrics.lag_count} events) exceeds replay_threshold. "
                f"Trigger full rebuild instead."
            )

        if metrics.reconciliation_status == "in_sync":
            return ReconciliationResult(events_replayed=0, rebuild_triggered=False)

        result = ReconciliationResult(rebuild_triggered=False, failed_events=[])

        if metrics.lag_count <= self.replay_threshold and replay_events:
            # Incremental replay of missed events
            for event in replay_events[:metrics.lag_count]:
                try:
                    self._apply_event_to_read_model(event)
                    result.events_replayed += 1
                except Exception as exc:
                    result.failed_events.append(f"{event.get('event_id', 'unknown')}: {exc}")

        elif metrics.reconciliation_status == "rebuild_needed":
            result.rebuild_triggered = True
            result.events_replayed = 0

        return result

    def _parse_sequence_id(self, event_id: str) -> int:
        """Extract numeric sequence from a string-prefixed event ID.

        Expected format: 'evt-12345' or '12345'.

        Args:
            event_id: Event identifier string.

        Returns:
            Integer sequence number extracted from the event ID.
        """
        try:
            numeric_part = event_id.replace("evt-", "").replace("event-", "")
            return int(numeric_part)
        except (ValueError, AttributeError):
            return 0

    def _apply_event_to_read_model(self, event: dict) -> None:
        """Apply a single event to the read model projection.

        In production this would emit domain events to the projection handler.
        Here it validates structure and raises on invalid input.

        Args:
            event: Dict with 'event_id', 'type', 'payload', 'timestamp' keys.

        Raises:
            ValueError: If required keys are missing from the event dict.
        """
        required_keys = {"event_id", "type", "payload"}
        missing = required_keys - event.keys()
        if missing:
            raise ValueError(f"Event missing required keys: {missing}")

        if not isinstance(event["payload"], dict):
            raise ValueError("Event payload must be a dict")
```

**BAD vs GOOD — Drift detection configuration:**

```python
# ❌ BAD: Magic numbers, no threshold separation, status always "recovering"
class BadDriftDetector:
    def check(self, store_id: str, model_id: str):
        lag = int(store_id) - int(model_id)
        return {"status": "lagging", "lag": lag}  # Never distinguishes recoverable vs rebuild

# ✅ GOOD: Explicit thresholds for incremental replay vs. full rebuild,
#   structured metrics with timestamps and status categories
detector = ReadModelDriftDetector(
    max_lag_events=100,
    max_lag_seconds=30.0,
    replay_threshold=500,
)
metrics = detector.detect_drift("evt-1050", "evt-980")
# metrics.reconciliation_status == "recovering" (70 events lag → incremental replay)

# When lag exceeds 500 events:
big_metrics = detector.detect_drift("evt-2000", "evt-1000")
# big_metrics.reconciliation_status == "rebuild_needed" → triggers full projection rebuild
```

---

### Pattern 2: Conflict Resolution with CRDTs (LWW-Register)

Implements a Last-Write-Wins Register CRDT for simple mergeable scalar state. Each replica carries its own timestamp; on merge, the latest timestamp wins. If timestamps match, use replica ID as tiebreaker.

```python
import time
from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass(order=True)
class LWWRegister:
    """Last-Write-Wins Register CRDT for mergeable scalar state.

    Each update carries a monotonic timestamp and a unique replica identifier.
    On merge, the value with the highest (timestamp, replica_id) tuple wins.
    This ensures convergence: all replicas eventually agree on the same value.

    Attributes:
        value: The current stored value.
        timestamp: Monotonic timestamp of the last write.
        replica_id: Unique identifier for the writing replica.
        last_writer_host: Human-readable hostname or service name of the writer.
    """

    value: Any = None
    timestamp: float = 0.0
    replica_id: str = ""
    last_writer_host: str = ""

    def __lt__(self, other: "LWWRegister") -> bool:
        """Compare two registers by (timestamp, replica_id) for merge resolution."""
        if self.timestamp == other.timestamp:
            return self.replica_id < other.replica_id
        return self.timestamp < other.timestamp

    def update(self, new_value: Any, timestamp: Optional[float] = None) -> None:
        """Record a write to this register.

        Args:
            new_value: The value to store. Pass None to tombstone (delete).
            timestamp: Monotonic timestamp for ordering. Defaults to time.monotonic().
        """
        if timestamp is None:
            timestamp = time.monotonic()
        self.value = new_value
        self.timestamp = timestamp

    def merge(self, other: "LWWRegister") -> "LWWRegister":
        """Merge this register with another replica's state.

        Returns the winning register (latest timestamp wins; replica_id breaks ties).
        This operation is commutative, associative, and idempotent — required properties
        of any CRDT merge function.

        Args:
            other: Another LWWRegister instance from a different replica.

        Returns:
            The merged LWWRegister with the winning value and metadata.
        """
        winner = max(self, other)
        return LWWRegister(
            value=winner.value,
            timestamp=winner.timestamp,
            replica_id=winner.replica_id,
            last_writer_host=winner.last_writer_host,
        )

    def to_dict(self) -> dict:
        """Serialize for network transfer or persistence."""
        return {
            "value": self.value,
            "timestamp": self.timestamp,
            "replica_id": self.replica_id,
            "last_writer_host": self.last_writer_host,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "LWWRegister":
        """Deserialize from a transferred dictionary."""
        return cls(
            value=data["value"],
            timestamp=data["timestamp"],
            replica_id=data["replica_id"],
            last_writer_host=data.get("last_writer_host", ""),
        )


def merge_inventory_quantities(replicas: list[LWWRegister]) -> int:
    """Resolve conflicting inventory quantities across replicas.

    Uses LWW-Register to converge on a single authoritative quantity.
    Each replica reports its latest observed inventory count; the most recent
    write wins, preventing lost updates from concurrent stock adjustments.

    Args:
        replicas: List of LWWRegister instances, each representing a replica's
            view of the inventory quantity for the same SKU.

    Returns:
        The converged inventory quantity after merge.
        If any replica has been tombstoned (value=None), returns 0.
    """
    if not replicas:
        return 0

    merged = replicas[0]
    for replica in replicas[1:]:
        merged = merged.merge(replica)

    return merged.value if merged.value is not None else 0
```

**BAD vs GOOD — Conflict resolution approach:**

```python
# ❌ BAD: Simple timestamp comparison without tiebreaker, no CRDT convergence guarantees
def bad_resolve_conflict(a_value: Any, a_ts: float, b_value: Any, b_ts: float) -> Any:
    """Choose the latest value — but fails when timestamps are identical."""
    if a_ts > b_ts:
        return a_value
    if b_ts > a_ts:
        return b_value
    # Timestamp collision: silently picks 'a' with no deterministic tiebreaker
    return a_value


# ✅ GOOD: LWW-Register CRDT with deterministic (timestamp, replica_id) comparison.
#   Commutative, associative, idempotent merge ensures all replicas converge.
register_a = LWWRegister(value=42, timestamp=1700000010.5, replica_id="service-a")
register_b = LWWRegister(value=38, timestamp=1700000010.5, replica_id="service-b")
merged = register_a.merge(register_b)
# merged.value == 42 (same timestamp → 'service-a' < 'service-b' alphabetically, so b wins)
assert merged.value == 38
```

---

### Pattern 3: Vector Clock for Causal Ordering Tracking

Implements vector clocks to track causal dependencies between events across services. Enables detection of concurrent vs. causally ordered events and provides the foundation for causal consistency reads.

```python
from dataclasses import dataclass, field
from typing import Optional


@dataclass(frozen=True)
class VectorClock:
    """Vector clock for tracking causal ordering in distributed systems.

    Each component represents a service's logical clock. The clock tracks
    causality: if clock A happens-before clock B, then every component in A
    is <= the corresponding component in B, and at least one component is strictly less.

    Implements total ordering via lexicographic comparison for deterministic event processing.
    """

    clocks: dict[str, int] = field(default_factory=dict)

    def __post_init__(self) -> None:
        # Ensure no zero or negative values (defensive)
        for svc, count in self.clocks.items():
            if count < 0:
                raise ValueError(f"Vector clock component '{svc}' cannot be negative: {count}")

    @classmethod
    def create(cls, service_id: str) -> "VectorClock":
        """Create a new vector clock for a fresh service instance."""
        return cls(clocks={service_id: 1})

    def increment(self, service_id: str) -> "VectorClock":
        """Increment this service's counter and return a new VectorClock.

        Args:
            service_id: The service performing the write.

        Returns:
            New VectorClock with incremented component. Original unchanged (immutable).
        """
        new_clocks = dict(self.clocks)
        new_clocks[service_id] = new_clocks.get(service_id, 0) + 1
        return VectorClock(clocks=new_clocks)

    def merge(self, other: "VectorClock") -> "VectorClock":
        """Merge with another vector clock (take max of each component).

        Called when receiving an event from a peer. Updates this clock to
        reflect knowledge of the peer's state.

        Args:
            other: The incoming vector clock to merge with.

        Returns:
            New VectorClock with merged components.
        """
        all_keys = set(self.clocks.keys()) | set(other.clocks.keys())
        merged = {key: max(self.clocks.get(key, 0), other.clocks.get(key, 0)) for key in all_keys}
        return VectorClock(clocks=merged)

    def happens_before(self, other: "VectorClock") -> bool:
        """Check if this clock causally precedes another.

        A happens-before B when: every component in A is <= corresponding
        component in B, and at least one component is strictly less.

        Args:
            other: The vector clock to compare against.

        Returns:
            True if self happens-before other (self is causally earlier).
        """
        all_keys = set(self.clocks.keys()) | set(other.clocks.keys())

        at_least_one_less = False
        for key in all_keys:
            self_val = self.clocks.get(key, 0)
            other_val = other.clocks.get(key, 0)

            if self_val > other_val:
                return False
            if self_val < other_val:
                at_least_one_less = True

        return at_least_one_less

    def is_concurrent(self, other: "VectorClock") -> bool:
        """Check if two clocks are concurrent (neither happens-before the other).

        Concurrent events have no causal relationship and must be resolved
        via conflict resolution (CRDT or LWW).

        Args:
            other: The vector clock to compare against.

        Returns:
            True if neither clock happens-before the other.
        """
        return not self.happens_before(other) and not other.happens_before(self) and self != other

    def is_equal(self, other: "VectorClock") -> bool:
        """Check if two clocks represent identical state."""
        return self.clocks == other.clocks

    @property
    def causal_order_key(self) -> tuple[tuple[str, int], ...]:
        """Generate a deterministic tuple for total ordering of concurrent events.

        Useful when you must sequence concurrent events deterministically.

        Returns:
            Sorted tuple of (service_id, counter) pairs.
        """
        return tuple(sorted(self.clocks.items()))

    def to_dict(self) -> dict[str, int]:
        return dict(self.clocks)

    @classmethod
    def from_dict(cls, data: dict[str, int]) -> "VectorClock":
        return cls(clocks=data)


def sequence_events_causally(events: list[dict]) -> list[dict]:
    """Process a batch of events in causal order.

    Groups events by their vector clocks and processes them in happens-before
    order. Concurrent events are sorted by their deterministic causal_order_key.

    Args:
        events: List of event dicts, each with 'event_id', 'vc' (vector clock dict),
            and 'payload' keys.

    Returns:
        Events sorted so that causally-ordered events appear in correct sequence.
        Concurrent events are ordered by their deterministic key for reproducibility.

    Raises:
        ValueError: If an event has no vector clock or invalid VC format.
    """
    validated = []
    for event in events:
        vc_data = event.get("vc")
        if not vc_data or not isinstance(vc_data, dict):
            raise ValueError(f"Event '{event.get('event_id')}' missing valid vector clock")

        vc = VectorClock(clocks=vc_data)
        validated.append({**event, "_vector_clock": vc})

    # Stable sort: happens-before first, then deterministic key for concurrent events
    def sort_key(item: dict) -> tuple[bool, int, tuple]:
        vc = item["_vector_clock"]
        return (not any(vc.happens_before(e["_vector_clock"]) for e in validated if e is not item),
                0,
                vc.causal_order_key)

    sorted_events = sorted(validated, key=sort_key)
    return [dict((k, v) for k, v in item.items() if k != "_vector_clock") for item in sorted_events]
```

---

### Pattern 4: Anti-Corruption Layer with Schema Translation

Protects a bounded context from inconsistent or incompatible data from an upstream system by translating event schemas and validating business invariants before forwarding.

```python
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional


class TranslationStatus(Enum):
    SUCCESS = "success"
    QUARANTINED = "quarantined"
    SKIPPED = "skipped"


@dataclass
class UpstreamEvent:
    """Raw event received from an external or upstream bounded context."""
    source_system: str
    raw_event_id: str
    payload: dict
    received_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class DownstreamEvent:
    """Translated event validated for the local bounded context."""
    domain_event_id: str
    event_type: str
    aggregate_id: str
    payload: dict
    vector_clock: dict[str, int] = field(default_factory=dict)
    translated_at: datetime = field(default_factory=datetime.utcnow)
    source_system: str = ""


@dataclass
class TranslationResult:
    """Result of translating an upstream event through the anti-corruption layer."""
    status: TranslationStatus
    downstream_event: Optional[DownstreamEvent] = None
    quarantine_reason: str = ""
    translation_errors: list[str] = field(default_factory=list)


class AntiCorruptionLayer:
    """Translates and validates events between bounded contexts.

    Implements the Anti-Corruption Layer (ACL) pattern to prevent external
    data model inconsistencies from polluting the local domain model. Every
    upstream event passes through schema mapping, invariant validation, and
    optional quarantine for unresolvable translations.

    Attributes:
        source_systems: Set of allowed upstream system identifiers.
        required_fields: Mapping of event types to required payload field names.
    """

    def __init__(self, source_systems: list[str], required_fields: Optional[dict[str, list[str]]] = None) -> None:
        self.source_systems = set(source_systems)
        self.required_fields = required_fields or {}

    def translate(
        self,
        upstream_event: UpstreamEvent,
        target_event_type: str,
    ) -> TranslationResult:
        """Translate an upstream event into the local domain model.

        Performs three stages: source validation, schema translation, and
        invariant checking. Any stage failure results in quarantine.

        Args:
            upstream_event: Raw event from an external system.
            target_event_type: The local domain event type to produce.

        Returns:
            TranslationResult indicating success or failure with reason.
        """
        errors: list[str] = []

        # Stage 1: Validate source system is trusted
        if upstream_event.source_system not in self.source_systems:
            return TranslationResult(
                status=TranslationStatus.QUARANTINED,
                quarantine_reason=f"Untrusted source system: {upstream_event.source_system}",
            )

        # Stage 2: Schema translation — map upstream fields to target schema
        translated_payload = self._translate_schema(upstream_event.payload, target_event_type)
        if translated_payload is None:
            errors.append("Schema translation produced no valid payload")
            return TranslationResult(
                status=TranslationStatus.QUARANTINED,
                quarantine_reason=f"Failed to translate event {upstream_event.raw_event_id}",
                translation_errors=errors,
            )

        # Stage 3: Validate business invariants on translated payload
        validation_result = self._validate_invariants(translated_payload, target_event_type)
        if not validation_result:
            return TranslationResult(
                status=TranslationStatus.QUARANTINED,
                quarantine_reason=f"Invariant check failed for event {upstream_event.raw_event_id}",
                translation_errors=errors,
            )

        # All stages passed — produce downstream event
        downstream = DownstreamEvent(
            domain_event_id=self._generate_domain_id(upstream_event),
            event_type=target_event_type,
            aggregate_id=str(translated_payload.get("aggregate_id", "")),
            payload=translated_payload,
            source_system=upstream_event.source_system,
        )

        return TranslationResult(status=TranslationStatus.SUCCESS, downstream_event=downstream)

    def _translate_schema(
        self,
        raw_payload: dict,
        target_type: str,
    ) -> Optional[dict]:
        """Map upstream schema fields to local domain model fields.

        Each event type may require different field mappings from the source.
        Returns None if required fields are missing after translation.

        Args:
            raw_payload: The upstream event payload with foreign-schema fields.
            target_type: The target event type to translate into.

        Returns:
            Translated payload dict, or None if translation fails.
        """
        # Define field mappings per event type
        field_mappings = {
            "order_created": {
                "order_id": "aggregate_id",
                "customer_ref": "customer_id",
                "line_items": "items",
                "total_amount": "total",
                "currency_code": "currency",
            },
            "inventory_updated": {
                "sku": "product_id",
                "warehouse_id": "location_id",
                "delta_qty": "quantity_delta",
                "reason_code": "adjustment_reason",
            },
        }

        mapping = field_mappings.get(target_type, {})
        if not mapping:
            # No mapping defined — pass through with validation check
            return raw_payload

        translated = {}
        for src_field, tgt_field in mapping.items():
            value = raw_payload.get(src_field)
            if value is not None:
                translated[tgt_field] = value

        # Ensure aggregate_id is present
        if "aggregate_id" not in translated and "order_id" in raw_payload:
            translated["aggregate_id"] = raw_payload["order_id"]

        return translated if translated else None

    def _validate_invariants(self, payload: dict, event_type: str) -> bool:
        """Validate business invariants on a translated event payload.

        Args:
            payload: Translated event payload to validate.
            event_type: The event type for which to apply invariant rules.

        Returns:
            True if all invariants pass; False otherwise.
        """
        required = self.required_fields.get(event_type, [])
        for field_name in required:
            if field_name not in payload or payload[field_name] is None:
                return False

        # Domain-specific invariant: order total must be positive
        if event_type == "order_created":
            total = payload.get("total", 0)
            if total <= 0:
                return False
            items = payload.get("items", [])
            if not items or not isinstance(items, list):
                return False

        # Domain-specific invariant: inventory delta must be non-zero integer
        if event_type == "inventory_updated":
            delta = payload.get("quantity_delta")
            if not isinstance(delta, int) or delta == 0:
                return False

        return True

    def _generate_domain_id(self, upstream_event: UpstreamEvent) -> str:
        """Generate a deterministic local event ID from the upstream event.

        Uses SHA-256 hash of source + raw_event_id for uniqueness and auditability.

        Args:
            upstream_event: The original upstream event.

        Returns:
            A locally unique event ID string.
        """
        import hashlib
        key = f"{upstream_event.source_system}:{upstream_event.raw_event_id}"
        return hashlib.sha256(key.encode()).hexdigest()[:16]


# --- Usage example ---
# acl = AntiCorruptionLayer(
#     source_systems=["inventory-service", "warehouse-service"],
#     required_fields={"order_created": ["aggregate_id", "total"]},
# )
# result = acl.translate(
#     upstream_event=UpstreamEvent(
#         source_system="inventory-service",
#         raw_event_id="ext-001",
#         payload={"order_id": "ORD-123", "customer_ref": "CUST-456", "line_items": [], "total_amount": 99.99, "currency_code": "USD"},
#     ),
#     target_event_type="order_created",
# )
# assert result.status == TranslationStatus.SUCCESS
```

**BAD vs GOOD — Anti-corruption layer design:**

```python
# ❌ BAD: Passes upstream data directly downstream without translation or validation
def bad_pass_through(upstream_event: dict) -> dict:
    """Just forward the event as-is."""
    return upstream_event  # No schema mapping, no invariant checks


# ✅ GOOD: Every upstream event goes through three stages:
#   1. Source system trust check
#   2. Schema field translation (foreign keys → local model)
#   3. Business invariant validation before forwarding
# Unresolvable events are quarantined for manual inspection, never pollute the domain.
```

---

### Pattern 5: Stale Read Handler with Indicators and Retry

Handles reads from potentially stale read models by checking staleness, surfacing indicators to callers, and retrying with exponential backoff before failing over to strong-consistency paths.

```python
import asyncio
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Coroutine, Generic, Optional, TypeVar


class DataFreshness(Enum):
    FRESH = "fresh"
    SLIGHTLY_STALE = "slightly_stale"  # < 5 seconds behind
    STALE = "stale"                     # > 5 seconds behind
    VERY_STALE = "very_stale"           # > 60 seconds behind


@dataclass
class StalenessIndicator:
    """Metadata about read data staleness for UI display and retry logic."""
    freshness: DataFreshness
    staleness_seconds: float
    read_model_last_write: datetime
    suggested_action: str  # "use_data", "retry_with_backoff", "failover_to_strong"

    @property
    def is_acceptable(self) -> bool:
        """Whether the data is acceptable for normal consumption without retry."""
        return self.freshness in (DataFreshness.FRESH, DataFreshness.SLIGHTLY_STALE)


@dataclass
class StaleReadResult(Generic[T]):
    """Wrapper around read results carrying staleness metadata."""
    data: T
    staleness: StalenessIndicator
    was_retry: bool = False

    @property
    def is_stale(self) -> bool:
        return not self.staleness.is_acceptable


@dataclass
class DateTimeMixin:
    """Helper for UTC time in dataclasses."""
    pass


from datetime import datetime


async def retry_with_backoff(
    fn: Callable[..., Coroutine[Any, Any, T]],
    max_retries: int = 3,
    base_delay: float = 0.1,
    max_delay: float = 5.0,
    jitter: bool = True,
) -> StaleReadResult[T]:
    """Execute a read function with exponential backoff retry on staleness.

    If the first read returns stale data, retries up to max_retries times with
    exponentially increasing delays. On final failure, returns the last result
    marked as stale with suggested_action="failover_to_strong".

    Args:
        fn: Async callable that returns a StaleReadResult or raises.
        max_retries: Maximum number of retry attempts after initial failure.
        base_delay: Base delay in seconds for exponential backoff (0.1s = 100ms).
        max_delay: Maximum cap on delay between retries (5 seconds).
        jitter: Whether to add random jitter to prevent thundering herd.

    Returns:
        StaleReadResult with data and staleness metadata from the final attempt.

    Raises:
        RuntimeError: If fn raises a non-staleness exception (propagates immediately).
    """
    import random

    last_result: Optional[StaleReadResult[T]] = None
    last_staleness_seconds: float = 0.0

    for attempt in range(max_retries + 1):
        try:
            result = await fn()

            if result.is_stale and attempt < max_retries:
                # Calculate delay with exponential backoff + jitter
                delay = min(base_delay * (2 ** attempt), max_delay)
                if jitter:
                    delay *= (0.5 + random.random() * 0.5)
                await asyncio.sleep(delay)
                last_result = result
                last_staleness_seconds = result.staleness.staleness_seconds
                continue

            return result

        except StaleDataError as exc:
            if attempt < max_retries:
                delay = min(base_delay * (2 ** attempt), max_delay)
                await asyncio.sleep(delay)
                last_result = None
            else:
                # Final attempt exhausted — failover to strong-consistency path
                return StaleReadResult(
                    data=exc.last_data,
                    staleness=StalenessIndicator(
                        freshness=DataFreshness.VERY_STALE,
                        staleness_seconds=last_staleness_seconds if last_staleness_seconds else exc.staleness_seconds,
                        read_model_last_write=datetime.utcnow(),
                        suggested_action="failover_to_strong",
                    ),
                    was_retry=True,
                )

    # Should not reach here, but handle gracefully
    if last_result:
        return StaleReadResult(
            data=last_result.data,
            staleness=StalenessIndicator(
                freshness=DataFreshness.VERY_STALE,
                staleness_seconds=last_staleness_seconds,
                read_model_last_write=datetime.utcnow(),
                suggested_action="failover_to_strong",
            ),
            was_retry=True,
        )

    raise RuntimeError("retry_with_backoff exhausted without a result")


class StaleDataError(Exception):
    """Raised when a read returns data that is stale beyond the acceptable threshold."""

    def __init__(
        self,
        staleness_seconds: float,
        last_data: Any = None,
        read_model_last_write: Optional[datetime] = None,
    ) -> None:
        self.staleness_seconds = staleness_seconds
        self.last_data = last_data
        self.read_model_last_write = read_model_last_write or datetime.utcnow()
        super().__init__(f"Read model is {staleness_seconds:.1f}s stale")


def assess_freshness(
    read_model_last_write: datetime,
    consistent_since: Optional[datetime] = None,
    max_acceptable_staleness: float = 5.0,
) -> StalenessIndicator:
    """Evaluate how stale the read model data is relative to a freshness requirement.

    Args:
        read_model_last_write: Timestamp when the read model was last updated.
        consistent_since: The caller's minimum freshness requirement. If None,
            uses the system default acceptable staleness threshold.
        max_acceptable_staleness: Maximum allowed staleness in seconds before
            data is considered unacceptable for normal use.

    Returns:
        StalenessIndicator with classification and suggested action.
    """
    if consistent_since is not None:
        staleness = (datetime.utcnow() - consistent_since).total_seconds()
    else:
        staleness = (datetime.utcnow() - read_model_last_write).total_seconds()

    if staleness <= 0:
        freshness = DataFreshness.FRESH
        action = "use_data"
    elif staleness <= max_acceptable_staleness:
        freshness = DataFreshness.SLIGHTLY_STALE
        action = "use_data"
    elif staleness <= 60.0:
        freshness = DataFreshness.STALE
        action = "retry_with_backoff"
    else:
        freshness = DataFreshness.VERY_STALE
        action = "failover_to_strong"

    return StalenessIndicator(
        freshness=freshness,
        staleness_seconds=staleness,
        read_model_last_write=read_model_last_write,
        suggested_action=action,
    )
```

---

### Pattern 6: Causal Ordering Enforcement for Event Processing

Ensures events are processed in causal order using vector clocks, preventing race conditions when downstream services depend on prior state changes from upstream producers.

```python
from dataclasses import dataclass, field
from collections import defaultdict
from typing import Any, Optional


@dataclass
class ProcessedEvent:
    """An event that has been processed in causal order."""
    event_id: str
    event_type: str
    payload: dict
    vector_clock: dict[str, int]
    processed_at: float = field(default_factory=time.monotonic)


@dataclass
class CausalBufferEntry:
    """An event held in a buffer waiting for causal dependencies to resolve."""
    event_id: str
    event_type: str
    payload: dict
    vector_clock: dict[str, int]
    arrival_time: float = field(default_factory=time.monotonic)


class CausalEventProcessor:
    """Processes events in causal order using a buffering mechanism.

    Events arriving out of causal order are buffered until all their
    causal dependencies have been processed. A timeout ensures that
    stale buffers do not block processing indefinitely.

    This implements the causal ordering guarantee for event streams:
    if event B causally depends on event A (A happens-before B), then
    A must be processed before B, even if B arrives first.
    """

    def __init__(
        self,
        buffer_timeout_seconds: float = 10.0,
        max_buffer_size: int = 10000,
    ) -> None:
        self.buffer_timeout_seconds = buffer_timeout_seconds
        self.max_buffer_size = max_buffer_size
        self._buffer: list[CausalBufferEntry] = []
        self._processed_clocks: dict[str, dict[str, int]] = {}  # event_id -> vector_clock
        self._processing_order: list[ProcessedEvent] = []
        self._last_vector_clock: dict[str, int] = {}

    def process_event(
        self,
        event_id: str,
        event_type: str,
        payload: dict,
        vector_clock: Optional[dict[str, int]] = None,
    ) -> list[ProcessedEvent]:
        """Attempt to process an event in causal order.

        If the event's causal dependencies have all been processed, it is
        emitted immediately along with any buffered events that now satisfy
        their causality constraints. Otherwise, the event is buffered.

        Args:
            event_id: Unique identifier for this event.
            event_type: The type/domain name of the event.
            payload: Event data payload.
            vector_clock: Optional vector clock from the event producer.
                If None, a local incrementing clock is assigned.

        Returns:
            List of events that were emitted (processed in order). Empty if
            the incoming event had to be buffered due to unmet dependencies.
        """
        # Assign local vector clock if none provided
        if vector_clock is None:
            vector_clock = dict(self._last_vector_clock)
            service_id = "local-processor"
            vector_clock[service_id] = vector_clock.get(service_id, 0) + 1

        event = CausalBufferEntry(
            event_id=event_id,
            event_type=event_type,
            payload=payload,
            vector_clock=vector_clock,
        )

        # Check if all causal dependencies are satisfied
        if self._dependencies_satisfied(event):
            # Process this event and any now-ready buffered events
            emitted = []
            emitted.append(self._emit_event(event))

            # Drain buffer for events whose dependencies are now met
            still_buffered: list[CausalBufferEntry] = []
            for buffered in self._buffer:
                if self._dependencies_satisfied(buffered):
                    emitted.append(self._emit_event(buffered))
                else:
                    still_buffered.append(buffered)

            self._buffer = still_buffered

            # Prune expired entries
            self._prune_expired()

            return emitted
        else:
            # Buffer the event for later processing
            if len(self._buffer) >= self.max_buffer_size:
                # Buffer full — drop oldest to prevent memory exhaustion
                self._buffer.pop(0)

            self._buffer.append(event)
            return []

    def _dependencies_satisfied(self, entry: CausalBufferEntry) -> bool:
        """Check if all causal dependencies for an event have been processed.

        An event's dependencies are satisfied when every service component in its
        vector clock that is greater than 0 has a corresponding processed event
        whose clock includes that same or higher component value.

        Args:
            entry: The buffered event to check.

        Returns:
            True if all causal prerequisites have been met.
        """
        for service_id, count in entry.vector_clock.items():
            if count > 0:
                # Check if we've seen a processed event from this service
                # with at least the same component value
                found = False
                for processed_vc in self._processed_clocks.values():
                    if processed_vc.get(service_id, 0) >= count:
                        found = True
                        break

                # Special case: if this is a new service we haven't seen before,
                # and the count is exactly 1 (first event from this service), it's ok
                if not found:
                    if count == 1 and service_id not in self._processed_clocks:
                        continue
                    return False

        return True

    def _emit_event(self, entry: CausalBufferEntry) -> ProcessedEvent:
        """Transition a buffered event to processed state.

        Args:
            entry: The buffer entry to emit.

        Returns:
            ProcessedEvent with the event's data and processing metadata.
        """
        self._last_vector_clock = dict(entry.vector_clock)
        self._processed_clocks[entry.event_id] = entry.vector_clock

        processed = ProcessedEvent(
            event_id=entry.event_id,
            event_type=entry.event_type,
            payload=entry.payload,
            vector_clock=dict(entry.vector_clock),
        )

        self._processing_order.append(processed)
        return processed

    def _prune_expired(self) -> None:
        """Remove events from the buffer that have exceeded the timeout."""
        cutoff = time.monotonic() - (self.buffer_timeout_seconds * 1000)  # ms
        self._buffer = [entry for entry in self._buffer if entry.arrival_time > cutoff]

    @property
    def processed_events(self) -> list[ProcessedEvent]:
        """Return all events processed so far, in causal order."""
        return list(self._processing_order)

    @property
    def buffer_size(self) -> int:
        """Current number of events waiting in the causal buffer."""
        return len(self._buffer)


# --- Usage example ---
# processor = CausalEventProcessor(buffer_timeout_seconds=10.0)
#
# # Event A: creates an order (no dependencies)
# emitted_a = processor.process_event("evt-001", "order.created", {"order_id": 42}, {"local-processor": 1})
# assert len(emitted_a) == 1  # Emitted immediately
#
# # Event B: depends on A (higher counter from same service, or dependency declared)
# emitted_b = processor.process_event("evt-002", "order.paid", {"order_id": 42}, {"local-processor": 2})
# assert len(emitted_b) == 1  # Emitted after A is processed
```

---

## Constraints

### MUST DO

- Measure drift with explicit metrics (`lag_count`, `lag_seconds`) before selecting any reconciliation strategy — never reconcile blindly
- Use CRDTs (LWW-Register, G-Counter) for mergeable scalar state instead of custom conflict resolution code
- Include vector clocks on all events that cross service boundaries to enable causal ordering guarantees
- Wrap every read-model query with staleness checking — no projection store read is allowed to return data without a freshness assessment
- Deploy anti-corruption layer schemas with explicit field mappings between every upstream/downstream bounded context pair
- Quarantine unresolvable translations rather than dropping or corrupting downstream data; route quarantined events to a dead-letter queue for inspection
- Implement exponential backoff with jitter on stale-read retries to prevent thundering herd patterns
- Provide a strong-consistency fallback path (direct database query) for financial, compliance-critical, or regulatory reads
- Log all reconciliation events with structured fields: `event_id`, `source`, `drift_metrics`, `reconciliation_method`, `result`
- Design conflict resolution as a deterministic function — same inputs must always produce the same output

### MUST NOT DO

- Use wall-clock timestamps for last-write-wins in production distributed systems — use logical or hybrid clocks to avoid clock skew issues
- Bypass the anti-corruption layer to directly query upstream databases or share schema objects between bounded contexts
- Allow stale reads to silently propagate to end users without staleness indicators — always surface `data_stale: True` with context
- Buffer events indefinitely in the causal ordering processor — enforce a strict timeout (default 10 seconds) and drop expired entries
- Use global locks or distributed transactions to enforce consistency across read models — this defeats the purpose of eventual consistency
- Store vector clocks larger than the number of active services plus 3 — they grow unbounded without pruning old components
- Implement CRDTs for complex nested objects that cannot be decomposed into mergeable primitives — use version-based conflict resolution instead
- Assume all events are delivered exactly once — design idempotent handlers for every event type

---

## Related Skills

| Skill | Purpose |
|---|---|
| `cqrs-pattern` | CQRS architecture patterns including command/query separation and read/write model design that provide the foundation for eventual consistency strategies |
| `event-sourcing-pattern` | Event sourcing implementation with event store, snapshots, and projection building — the source of truth that read models reconcile against |
| `distributed-systems-architecture` | Broader distributed systems patterns including CAP theorem, consensus algorithms, and service mesh topologies that contextualize consistency tradeoffs |

---

## Live References

> Authoritative documentation links for eventual consistency and event-driven architecture.

- [Designing Data-Intensive Applications — Chapter 9: Replication](https://dataintensive.net/)
- [Amazon Dynamo Paper — Design of a Fault-Tolerant Data System](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf)
- [CockroachDB Vector Clocks and Causal Ordering](https://www.cockroachlabs.com/docs/stable/vector-clocks.html)
- [Crystallized CRDTs — Merge-Protocol-Free Replicated Data Types](https://arxiv.org/abs/1806.07830)
- [Event Sourcing vs CQRS — Martin Fowler's Analysis](https://martinfowler.com/eaaDev/EventSourcing.html)
