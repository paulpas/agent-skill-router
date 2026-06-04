---




name: message-queue-design
description: Implements production-grade message queue design patterns (delivery semantics, ordering guarantees, consumer groups, dead letter queues, priority and delayed delivery) for reliable distributed systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: message queue, message broker, pub/sub, consumer groups, delivery semantics, RabbitMQ, Kafka, SQS
  archetypes:
    - tactical
    - generation
  anti_triggers:
    - brainstorming
    - vague ideation
    - code golf
    - over-engineering
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, config, do-dont, examples]
  related-skills: event-driven-patterns, event-bus, domain-events, idempotent-distributed-operations, system-reliability-architecture




---





# Message Queue Design Patterns

Implements production-grade message queue design patterns for reliable distributed systems. Covers delivery semantics (at-least-once, at-most-once, exactly-once), ordering guarantees, consumer group management, dead letter queues, priority and delayed delivery, and broker selection decision frameworks to match infrastructure to workload requirements.

## TL;DR Checklist

- [ ] Select delivery semantics based on idempotency capability of consumers
- [ ] Define partitioning strategy that preserves ordering for related messages
- [ ] Configure consumer groups with balanced rebalancing strategies
- [ ] Implement dead letter queue with poison message detection and retry logic
- [ ] Set message TTL to prevent stale messages from accumulating indefinitely
- [ ] Match broker choice to workload (Kafka for streaming, RabbitMQ for complex routing, SQS for managed simplicity)

---

## When to Use

Use this skill when:

- Designing inter-service communication that requires reliable async messaging
- Implementing a distributed workflow where message ordering affects correctness
- Building event pipelines that must survive broker restarts and network partitions
- Configuring consumer groups for horizontal scaling across multiple worker instances
- Adding dead letter queue handling to prevent poison messages from blocking queues
- Selecting a message broker (Kafka, RabbitMQ, NATS, SQS) for a new system

---

## When NOT to Use

Avoid this skill for:

- Simple synchronous RPC between services — use HTTP/gRPC instead (see `grpc-patterns`, `rest-api-patterns`)
- High-frequency real-time trading where sub-millisecond latency is required — consider in-process event buses
- Single-process applications with no distributed components — the broker overhead outweighs benefits
- When all consumers are already on a shared memory bus — use an in-process EventBus instead (see `event-bus`)

---

## Core Workflow

1. **Analyze Communication Requirements** — Determine delivery semantics, ordering needs, throughput targets, and retention requirements. **Checkpoint:** If the consumer can safely deduplicate messages, choose at-least-once with idempotency. If zero duplication is required, implement exactly-once with idempotency keys.

2. **Select Queue Topology** — Choose between point-to-point (each message consumed once), pub/sub (each message delivered to all subscribers), fan-out (one producer to many independent queues), or competitive consumers (multiple consumers in one group sharing load). **Checkpoint:** Each consumer group must have a clear purpose — never split a single logical workload across multiple groups.

3. **Define Partitioning Strategy** — Choose partitioning keys that preserve ordering for related messages (e.g., `order_id` for order events, `user_id` for user activity). **Checkpoint:** All consumers in the same group must receive the same set of partitions; rebalancing must not reorder messages within a partition.

4. **Configure Delivery Semantics** — Implement ack-based acknowledgment with configurable timeouts. Set up redelivery policies and dead letter routing. **Checkpoint:** Every message path must have a DLQ — unhandled failures are production incidents, not edge cases.

5. **Implement Consumer Groups** — Define group topology with balanced partition assignment and graceful shutdown handling. **Checkpoint:** Consumers must handle rebalance events by draining in-flight messages before releasing partition ownership.

6. **Set Operational Controls** — Configure TTL for message expiration, priority levels for urgent messages, and delayed delivery for scheduled workflows. **Checkpoint:** All operational controls must have monitoring dashboards — stale queues and blocked DLQs are silent failures.

---

## Implementation Patterns

### Pattern 1: Delivery Semantics — At-Least-Once with Idempotency

At-least-once is the safest default. Consumers implement idempotency to safely handle duplicate messages that arrive after a network timeout or broker retry.

```python
from __future__ import annotations

import hashlib
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass(frozen=True)
class MessageEnvelope:
    """Immutable message envelope wrapping payload with delivery metadata."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    payload: dict[str, Any]
    headers: dict[str, str] = field(default_factory=dict)
    attempt_count: int = 0
    delivered_at: float = field(default_factory=time.monotonic)

    @property
    def dedup_key(self) -> str:
        """Deterministic deduplication key combining message id and consumer group."""
        return f"{self.id}:{self.headers.get('consumer_group', 'default')}"


class IdempotentConsumer:
    """Processes messages with at-least-once delivery guarantees via deduplication.

    Uses an in-memory (or backable) store to reject duplicate message IDs
    within a configurable time window. In production, replace the in-memory
    store with Redis or a database-backed idempotency table.
    """

    def __init__(self, dedup_ttl_seconds: float = 3600.0) -> None:
        self._dedup_store: dict[str, float] = {}
        self._dedup_ttl = dedup_ttl_seconds
        self._processed_count: int = 0

    def process(self, message: MessageEnvelope) -> str:
        """Process a message, returning result or raising on business failure.

        Rejects duplicates based on dedup_key. Idempotent — calling this
        multiple times with the same message returns the cached result.

        Args:
            message: The incoming message envelope to process.

        Returns:
            A string describing the processing outcome.

        Raises:
            RuntimeError: If business logic fails (message will be retried).
        """
        dedup_key = message.dedup_key

        # Check dedup store — skip already-processed messages
        if dedup_key in self._dedup_store:
            return f"DUPLICATE_SKIPPED:{dedup_key}"

        # Mark as seen
        self._dedup_store[dedup_key] = time.monotonic()
        self._cleanup_expired_dedup_entries()

        try:
            result = self._execute_business_logic(message)
        except Exception as exc:
            # Business failure — message will be redelivered by broker
            raise RuntimeError(f"Processing failed for {message.id}: {exc}") from exc

        self._processed_count += 1
        return f"PROCESSED:{message.id} -> {result}"

    def _execute_business_logic(self, message: MessageEnvelope) -> str:
        """Core business logic — replace with domain-specific implementation."""
        action = message.headers.get("action", "unknown")
        entity_id = message.payload.get("entity_id")
        return f"action={action} entity={entity_id}"

    def _cleanup_expired_dedup_entries(self) -> None:
        """Remove expired deduplication entries to prevent unbounded memory growth."""
        now = time.monotonic()
        expired_keys = [
            key for key, seen_at in self._dedup_store.items()
            if now - seen_at > self._dedup_ttl
        ]
        for key in expired_keys:
            del self._dedup_store[key]


class ExactlyOnceProcessor(IdempotentConsumer):
    """Extends at-least-once with explicit idempotency keys from producers.

    Producers must include a unique `idempotency_key` header. The consumer
    deduplicates based on this key rather than the auto-generated message ID,
    enabling cross-session deduplication (e.g., client retries after timeout).
    """

    def process(self, message: MessageEnvelope) -> str:
        """Override to use producer-supplied idempotency key."""
        idem_key = message.headers.get("idempotency_key")
        if not idem_key:
            raise ValueError(
                "ExactlyOnceProcessor requires 'idempotency_key' header "
                f"on message {message.id}"
            )

        if idem_key in self._dedup_store:
            return f"EXACTLY_ONCE_DUPLICATE_SKIPPED:{idem_key}"

        self._dedup_store[idem_key] = time.monotonic()
        self._cleanup_expired_dedup_entries()

        try:
            result = self._execute_business_logic(message)
        except Exception as exc:
            # Do NOT remove from dedup store on failure — retry will re-send same key
            raise RuntimeError(
                f"ExactlyOnce processing failed for idempotency_key={idem_key}: {exc}"
            ) from exc

        self._processed_count += 1
        return f"EXACTLY_ONCE:{message.id} -> {result}"
```

---

### Pattern 2: Ordered Partitioning by Key

Partitioned queues preserve ordering for messages sharing a partition key. All messages with the same key are delivered to the same consumer instance in FIFO order within that partition.

```python
from __future__ import annotations

import hashlib
from dataclasses import dataclass
from typing import Protocol


@dataclass
class OrderedMessage:
    """A message with an explicit ordering key for partition assignment."""
    key: str
    sequence_number: int  # Monotonic within the producer for this key
    payload: dict


class PartitionStrategy(Protocol):
    """Protocol defining how messages are assigned to partitions."""
    def assign_partition(self, key: str, total_partitions: int) -> int: ...


class HashPartitionStrategy:
    """Deterministic partition assignment using consistent hashing.

    Messages with the same key always map to the same partition.
    This preserves per-key ordering regardless of consumer rebalancing.
    """

    def __init__(self, num_partitions: int) -> None:
        if num_partitions < 1:
            raise ValueError("num_partitions must be >= 1")
        self._num_partitions = num_partitions

    def assign_partition(self, key: str, total_partitions: Optional[int] = None) -> int:
        """Assign a message key to a partition deterministically.

        Args:
            key: The partition key (e.g., order_id, user_id).
            total_partitions: Override default partition count.

        Returns:
            An integer partition index in range [0, total_partitions).
        """
        partitions = total_partitions or self._num_partitions
        hash_value = int(hashlib.sha256(key.encode()).hexdigest(), 16)
        return hash_value % partitions

    @property
    def num_partitions(self) -> int:
        return self._num_partitions


class OrderedPartitionedProducer:
    """Produces messages with guaranteed per-key ordering via partitioning.

    Usage:
        producer = OrderedPartitionedProducer(num_partitions=8)
        producer.send(OrderedMessage("order-123", 1, {"action": "create"}))
        producer.send(OrderedMessage("order-123", 2, {"action": "update"}))
        # Both messages always go to the same partition → ordered delivery.
    """

    def __init__(self, num_partitions: int = 8) -> None:
        self._strategy = HashPartitionStrategy(num_partitions)

    @property
    def num_partitions(self) -> int:
        return self._strategy.num_partitions

    def send(self, message: OrderedMessage) -> dict:
        """Send a message to the appropriate partition.

        Args:
            message: The ordered message with key and sequence number.

        Returns:
            Metadata about where the message was placed.
        """
        partition = self._strategy.assign_partition(message.key)
        return {
            "partition": partition,
            "key": message.key,
            "sequence_number": message.sequence_number,
            "payload": message.payload,
        }

    def send_batch(
        self,
        messages: list[OrderedMessage],
    ) -> dict[str, list[dict]]:
        """Send multiple messages, grouping results by partition.

        Args:
            messages: List of ordered messages to batch-send.

        Returns:
            Dict mapping partition index to list of placed message metadata.
        """
        by_partition: dict[int, list[dict]] = {}
        for msg in messages:
            result = self.send(msg)
            by_partition.setdefault(result["partition"], []).append(result)
        return by_partition
```

---

### Pattern 3: Consumer Groups with Balanced Load Distribution

Consumer groups enable horizontal scaling — multiple consumers share partitions and each partition is processed by exactly one consumer in the group at a time. This skill shows balanced assignment with rebalance awareness.

```python
from __future__ import annotations

import logging
import time
from collections import defaultdict
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Optional


logger = logging.getLogger(__name__)


class ConsumerState(Enum):
    """Lifecycle states for a consumer in a group."""
    IDLE = "idle"
    CONSUMING = "consuming"
    REBALANCING = "rebalancing"
    SHUTTING_DOWN = "shutting_down"


@dataclass
class PartitionAssignment:
    """Represents which partitions a consumer owns within its group."""
    consumer_id: str
    group_id: str
    partitions: list[int] = field(default_factory=list)

    @property
    def is_empty(self) -> bool:
        return len(self.partitions) == 0

    def add_partitions(self, partitions: list[int]) -> None:
        for p in sorted(partitions):
            if p not in self.partitions:
                self.partitions.append(p)

    def remove_partitions(self, partitions: list[int]) -> None:
        self.partitions = [p for p in self.partitions if p not in partitions]


class BalancedConsumerGroup:
    """Manages partition assignment across consumers in a group using round-robin.

    Handles rebalancing when consumers join or leave the group. During rebalance,
    all consumers drain in-flight messages before reassignment takes effect.

    Usage:
        group = BalancedConsumerGroup("payments", num_partitions=12)
        consumer = group.register_consumer("worker-1")
        group.add_consumer(consumer)
        # ... process messages ...
        group.remove_consumer(consumer, drain=True)
    """

    def __init__(self, group_id: str, num_partitions: int) -> None:
        if num_partitions < 1:
            raise ValueError("num_partitions must be >= 1")
        self._group_id = group_id
        self._num_partitions = num_partitions
        self._consumers: dict[str, BalancedConsumer] = {}
        self._assignments: dict[str, PartitionAssignment] = {}

    def register_consumer(self, consumer_id: str) -> BalancedConsumer:
        """Register a new consumer and return it.

        Args:
            consumer_id: Unique identifier for this consumer instance.

        Returns:
            A configured Consumer instance ready to be added to the group.
        """
        if consumer_id in self._consumers:
            raise ValueError(f"Consumer {consumer_id} already registered")
        consumer = BalancedConsumer(consumer_id, self._group_id)
        self._consumers[consumer_id] = consumer
        return consumer

    def add_consumer(self, consumer: BalancedConsumer) -> dict[int, list[str]]:
        """Add a consumer to the group and trigger partition rebalancing.

        Args:
            consumer: A registered consumer instance.

        Returns:
            Mapping of partition index to list of consumer IDs (for verification).
        """
        if consumer.id not in self._consumers:
            raise ValueError(
                f"Consumer {consumer.id} not registered with this group"
            )
        consumer.state = ConsumerState.REBALANCING
        self._rebalance()
        consumer.state = ConsumerState.CONSUMING
        return self._get_partition_map()

    def remove_consumer(
        self, consumer_id: str, drain: bool = True
    ) -> dict[int, list[str]]:
        """Remove a consumer and rebalance partitions among remaining members.

        Args:
            consumer_id: The consumer to remove.
            drain: If True, simulate draining in-flight messages first.

        Returns:
            Updated partition map after removal.
        """
        if consumer_id not in self._consumers:
            raise ValueError(f"Consumer {consumer_id} not found in group")

        consumer = self._consumers[consumer_id]
        if drain and not consumer.is_empty:
            logger.info(
                "Draining %d in-flight messages for consumer %s before removal",
                len(consumer.in_flight),
                consumer_id,
            )
            time.sleep(0.01)  # Simulate drain

        del self._consumers[consumer_id]
        if consumer.id in self._assignments:
            del self._assignments[consumer_id]
        self._rebalance()
        return self._get_partition_map()

    def _rebalance(self) -> None:
        """Reassign all partitions round-robin across active consumers."""
        alive_ids = sorted(self._consumers.keys())
        if not alive_ids:
            return

        # Clear existing assignments
        for assignment in self._assignments.values():
            assignment.partitions.clear()

        # Round-robin assignment
        for i, partition_idx in enumerate(range(self._num_partitions)):
            owner_id = alive_ids[partition_idx % len(alive_ids)]
            if owner_id not in self._assignments:
                self._assignments[owner_id] = PartitionAssignment(
                    consumer_id=owner_id, group_id=self._group_id
                )
            self._assignments[owner_id].add_partitions([partition_idx])

    def _get_partition_map(self) -> dict[int, list[str]]:
        """Get a mapping of partition -> owning consumers (for verification)."""
        partition_map: dict[int, list[str]] = defaultdict(list)
        for assignment in self._assignments.values():
            for p in assignment.partitions:
                partition_map[p].append(assignment.consumer_id)
        return dict(partition_map)

    @property
    def active_consumers(self) -> int:
        return len([c for c in self._consumers.values() if c.state == ConsumerState.CONSUMING])


class BalancedConsumer:
    """A single consumer instance within a group.

    Tracks its assigned partitions and in-flight messages for rebalance safety.
    """

    def __init__(self, consumer_id: str, group_id: str) -> None:
        self.id = consumer_id
        self.group_id = group_id
        self.state = ConsumerState.IDLE
        self._assigned_partitions: list[int] = []
        self.in_flight: dict[int, Any] = {}

    @property
    def is_empty(self) -> bool:
        return len(self.in_flight) == 0

    @property
    def assigned_partitions(self) -> list[int]:
        return self._assigned_partitions[:]

    def assign_partitions(self, partitions: list[int]) -> None:
        """Update this consumer's partition assignment."""
        for p in sorted(partitions):
            if p not in self._assigned_partitions:
                self._assigned_partitions.append(p)
        logger.info(
            "Consumer %s now owns partitions: %s", self.id, self._assigned_partitions
        )

    def release_partitions(self, partitions: list[int]) -> None:
        """Release ownership of specified partitions during rebalance.

        MUST drain in-flight messages before releasing to prevent data loss.
        """
        for p in partitions:
            if p in self.in_flight:
                logger.warning(
                    "Releasing partition %d with %d in-flight messages — "
                    "ensure message is requeued",
                    p, len(self.in_flight),
                )
        self._assigned_partitions = [
            p for p in self._assigned_partitions if p not in partitions
        ]
```

---

### Pattern 4: Dead Letter Queue with Poison Message Handling

Dead letter queues (DLQ) catch messages that fail processing after exhausting retries. Poison message detection prevents a single bad message from blocking an entire queue.

```python
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional


logger = logging.getLogger(__name__)


class FailureReason(Enum):
    """Categorizes why a message processing attempt failed."""
    CONSUMER_ERROR = "consumer_error"          # Business logic threw
    SCHEMA_VALIDATION = "schema_validation"   # Payload doesn't match expected schema
    TIMEOUT = "timeout"                        # Processing exceeded deadline
    INTEGRATION_FAILURE = "integration_failure"  # Downstream service unavailable


@dataclass
class RetryRecord:
    """Tracks retry history for a message."""
    attempt: int
    timestamp: float = field(default_factory=time.monotonic)
    error: Optional[str] = None
    reason: Optional[FailureReason] = None

    @property
    def is_expired(self, max_age_seconds: float = 86400.0) -> bool:
        """Return True if the retry record has exceeded its time-to-live."""
        return (time.monotonic() - self.timestamp) > max_age_seconds


@dataclass
class DeadLetterMessage:
    """A message that has exhausted all retries and landed in the DLQ.

    Contains full metadata for forensic analysis — original payload, headers,
    retry history, and the final error that caused the move.
    """
    original_message_id: str
    payload: dict[str, Any]
    headers: dict[str, str] = field(default_factory=dict)
    queue_name: str = ""
    consumer_group: str = ""
    retry_history: list[RetryRecord] = field(default_factory=list)
    final_error: Optional[str] = None
    moved_at: float = field(default_factory=time.monotonic)

    @property
    def age_seconds(self) -> float:
        return time.monotonic() - self.moved_at


class PoisonMessageDetector:
    """Detects and classifies poison messages that repeatedly fail processing.

    A poison message is one that fails every retry attempt, typically due to
    malformed data or an irrecoverable downstream dependency failure. This
    detector classifies failures to enable targeted remediation strategies.
    """

    def __init__(self, max_retries: int = 3) -> None:
        self._max_retries = max_retries

    def record_failure(
        self,
        message_id: str,
        error: str,
        reason: FailureReason,
    ) -> RetryRecord:
        """Record a processing failure. Returns the retry record for this attempt."""
        return RetryRecord(attempt=1, error=error, reason=reason)  # Updated by processor


class DeadLetterQueueManager:
    """Manages dead letter queue operations including poison message detection.

    After max_retries is exhausted, messages are moved to a DLQ with full
    metadata for investigation and manual reprocessing. Includes exponential
    backoff for retry attempts before DLQ routing.
    """

    def __init__(
        self,
        max_retries: int = 3,
        dlq_prefix: str = "dlq_",
        poison_threshold: int = 5,
    ) -> None:
        if max_retries < 1:
            raise ValueError("max_retries must be >= 1")
        self._max_retries = max_retries
        self._dlq_prefix = dlq_prefix
        self._poison_threshold = poison_threshold
        self._retry_store: dict[str, list[RetryRecord]] = {}
        self._failed_consumer_count: dict[str, int] = defaultdict(int)

    @property
    def max_retries(self) -> int:
        return self._max_retries

    def should_retry(self, message_id: str) -> bool:
        """Determine if a failed message should be retried.

        Args:
            message_id: The ID of the message that just failed.

        Returns:
            True if retries remain, False if the message goes to DLQ.
        """
        history = self._retry_store.get(message_id, [])
        return len(history) < self._max_retries

    def record_attempt(
        self,
        message_id: str,
        error: str,
        reason: FailureReason,
    ) -> RetryRecord | None:
        """Record a processing attempt and check if DLQ routing is needed.

        Args:
            message_id: ID of the message being processed.
            error: The exception message or error description.
            reason: Classification of why it failed.

        Returns:
            The retry record (always returned), or None if not tracked yet.
        """
        record = RetryRecord(
            attempt=len(self._retry_store.get(message_id, [])) + 1,
            error=error,
            reason=reason,
        )
        self._retry_store.setdefault(message_id, []).append(record)

        if not self.should_retry(message_id):
            logger.warning(
                "Message %s exhausted %d retries → routing to DLQ",
                message_id, self._max_retries,
            )
            return record  # Caller moves this to DLQ

        return record

    def get_dlq_name(self, source_queue: str) -> str:
        """Derive the DLQ name from a source queue name.

        Args:
            source_queue: The original queue that messages came from.

        Returns:
            DLQ name with prefix (e.g., dlq_orders).
        """
        return f"{self._dlq_prefix}{source_queue}"

    def get_retry_delay(self, message_id: str) -> float:
        """Calculate exponential backoff delay for the next retry.

        Uses base 2^n seconds with a cap of 60 seconds.
        Returns 0.0 if no retries remain (should go to DLQ instead).

        Args:
            message_id: ID of the message being retried.

        Returns:
            Delay in seconds before next delivery attempt.
        """
        history = self._retry_store.get(message_id, [])
        attempt = len(history) + 1
        if attempt > self._max_retries:
            return 0.0
        # Exponential backoff: 1s, 2s, 4s, 8s, ... cap at 60s
        delay = min(2 ** (attempt - 1), 60.0)
        return delay

    def get_poison_message_history(self, message_id: str) -> list[RetryRecord] | None:
        """Get full retry history for a failed message (for DLQ investigation).

        Args:
            message_id: ID of the poisoned message.

        Returns:
            List of all retry records, or None if message not tracked.
        """
        return self._retry_store.get(message_id)
```

---

### Pattern 5: Message TTL, Priority Queues, and Delayed Delivery

Production systems need to expire stale messages, prioritize urgent work, and schedule delayed delivery for time-based workflows (e.g., "send reminder after 24 hours").

```python
from __future__ import annotations

import heapq
import logging
import time
from dataclasses import dataclass, field
from typing import Any


logger = logging.getLogger(__name__)


@dataclass(order=True)
class PriorityMessage:
    """A message with an explicit priority level for queue ordering.

    Lower numeric values indicate higher priority (0 = highest).
    Uses Python's heapq so the highest-priority message is always first.
    """
    priority: int
    created_at: float = field(default_factory=time.monotonic, repr=False)
    message_id: str = field(default="", repr=False)
    payload: dict[str, Any] = field(default_factory=dict, repr=False)
    ttl_seconds: Optional[float] = None

    @property
    def is_expired(self) -> bool:
        """Check if this message has exceeded its time-to-live.

        Returns:
            True if the message has expired and should be dropped.
        """
        if self.ttl_seconds is None:
            return False
        return (time.monotonic() - self.created_at) > self.ttl_seconds


class PriorityMessageQueue:
    """Thread-safe priority queue for messages with TTL support.

    Messages are dequeued in priority order (lowest number = highest priority).
    Expired messages are automatically purged during dequeue operations.

    Usage:
        queue = PriorityMessageQueue()
        queue.enqueue(PriorityMessage(priority=1, payload={"urgent": True}))
        queue.enqueue(PriorityMessage(priority=5, payload={"normal": True}))
        # dequeue() always returns priority=1 message first
    """

    def __init__(self, max_size: int = 100_000) -> None:
        self._heap: list[PriorityMessage] = []
        self._max_size = max_size
        self._purged_count: int = 0
        self._delivered_count: int = 0

    @property
    def size(self) -> int:
        return len(self._heap)

    @property
    def is_empty(self) -> bool:
        return len(self._heap) == 0

    def enqueue(self, message: PriorityMessage) -> bool:
        """Add a message to the priority queue.

        Args:
            message: The priority message to add.

        Returns:
            True if added successfully, False if queue is full.
        """
        if len(self._heap) >= self._max_size:
            logger.error("Queue full (%d messages), dropping message %s", self._max_size, message.message_id)
            return False
        heapq.heappush(self._heap, message)
        self._delivered_count += 1
        return True

    def dequeue(self) -> PriorityMessage | None:
        """Remove and return the highest-priority non-expired message.

        Expired messages are silently purged before returning a result.
        Returns None if the queue is empty or all messages have expired.

        Returns:
            The highest-priority valid message, or None.
        """
        while self._heap:
            message = heapq.heappop(self._heap)
            if message.is_expired:
                self._purged_count += 1
                logger.debug(
                    "Purging expired priority message %s (age=%.1fs)",
                    message.message_id,
                    time.monotonic() - message.created_at,
                )
                continue
            return message

        return None

    def peek(self) -> PriorityMessage | None:
        """Return the highest-priority message without removing it.

        Returns:
            The top message or None if queue is empty.
        """
        # Clean expired items at front only (non-destructive for others)
        while self._heap and self._heap[0].is_expired:
            heapq.heappop(self._heap)
            self._purged_count += 1
        return self._heap[0] if self._heap else None

    def purge_expired(self) -> int:
        """Remove all expired messages from the queue.

        Returns:
            The number of messages purged.
        """
        before = len(self._heap)
        self._heap = [m for m in self._heap if not m.is_expired]
        heapq.heapify(self._heap)
        purged = before - len(self._heap)
        self._purged_count += purged
        return purged


@dataclass
class DelayedMessage:
    """A message scheduled for delivery at a specific future time."""
    deliver_at: float  # Monotonic timestamp for when this should be delivered
    message_id: str
    payload: dict[str, Any]
    queue_name: str = ""

    @property
    def is_ready(self) -> bool:
        return time.monotonic() >= self.deliver_at


class DelayedDeliveryScheduler:
    """Manages delayed message delivery using a min-heap sorted by deliver_at.

    Messages are held until their scheduled delivery time, then released
    for processing. Supports both absolute timestamps and relative delays.

    Usage:
        scheduler = DelayedDeliveryScheduler()
        # Deliver in 5 minutes from now
        scheduler.schedule(message, delay_seconds=300)
        # or deliver at specific time
        scheduler.schedule_at(message, deliver_at=time.monotonic() + 3600)

        # Periodically check for ready messages
        ready = scheduler.poll_ready()
    """

    def __init__(self, max_capacity: int = 500_000) -> None:
        self._schedule: list[DelayedMessage] = []
        self._max_capacity = max_capacity

    @property
    def pending_count(self) -> int:
        return len(self._schedule)

    def schedule(self, message_id: str, payload: dict, delay_seconds: float, queue_name: str = "") -> bool:
        """Schedule a message for delivery after a relative delay.

        Args:
            message_id: Unique identifier for the scheduled message.
            payload: The message data to deliver.
            delay_seconds: Seconds from now until delivery is allowed.
            queue_name: Target queue for the delivered message.

        Returns:
            True if scheduled, False if capacity is full.
        """
        if len(self._schedule) >= self._max_capacity:
            logger.error("Scheduler at capacity (%d), dropping delayed message %s", self._max_capacity, message_id)
            return False
        msg = DelayedMessage(
            deliver_at=time.monotonic() + delay_seconds,
            message_id=message_id,
            payload=payload,
            queue_name=queue_name,
        )
        heapq.heappush(self._schedule, msg)
        return True

    def schedule_at(self, message_id: str, payload: dict, deliver_at: float, queue_name: str = "") -> bool:
        """Schedule a message for delivery at an absolute monotonic timestamp.

        Args:
            message_id: Unique identifier for the scheduled message.
            payload: The message data to deliver.
            deliver_at: Monotonic timestamp when the message should be delivered.
            queue_name: Target queue name.

        Returns:
            True if scheduled, False if capacity is full.
        """
        if len(self._schedule) >= self._max_capacity:
            return False
        msg = DelayedMessage(
            deliver_at=deliver_at,
            message_id=message_id,
            payload=payload,
            queue_name=queue_name,
        )
        heapq.heappush(self._schedule, msg)
        return True

    def poll_ready(self, max_count: int = 100) -> list[DelayedMessage]:
        """Poll and return all messages that are ready for delivery.

        Removes delivered messages from the scheduler. Returns at most
        max_count messages to prevent thundering herds on clock skew.

        Args:
            max_count: Maximum messages to return in one poll call.

        Returns:
            List of messages whose deliver_at time has passed.
        """
        ready: list[DelayedMessage] = []
        remaining: list[DelayedMessage] = []

        while self._schedule and len(ready) < max_count:
            msg = heapq.heappop(self._schedule)
            if msg.is_ready:
                ready.append(msg)
            else:
                remaining.append(msg)

        # Put back non-ready messages (they're still pending)
        for msg in remaining:
            heapq.heappush(self._schedule, msg)

        return ready

    def cancel(self, message_id: str) -> bool:
        """Cancel a scheduled delayed message by ID.

        Args:
            message_id: The ID of the message to cancel.

        Returns:
            True if the message was found and removed.
        """
        before = len(self._schedule)
        self._schedule = [m for m in self._schedule if m.message_id != message_id]
        heapq.heapify(self._schedule)
        return len(self._schedule) < before  # Was removed if count decreased
```

---

### Pattern 6: Broker Selection Decision Framework

Choosing the right message broker depends on workload characteristics. This framework compares Kafka, RabbitMQ, NATS, and SQS across key dimensions with decision logic for common scenarios.

```python
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


logger = logging.getLogger(__name__)


class BrokerCapability(Enum):
    """Capabilities that distinguish message broker platforms."""
    AT_LEAST_ONCE = "at_least_once"
    EXACTLY_ONCE = "exactly_once"
    ORDERED_PARTITIONS = "ordered_partitions"
    PUB_SUB = "pub_sub"
    POINT_TO_POINT = "point_to_point"
    COMPLEX_ROUTING = "complex_routing"
    PRIORITY_QUEUES = "priority_queues"
    DELAYED_DELIVERY = "delayed_delivery"
    DEAD_LETTER_QUEUES = "dead_letter_queues"
    MESSAGE_RETENTION = "message_retention"  # Persist and replay history
    MANAGED_SERVICE = "managed_service"       # Fully hosted (AWS SQS, etc.)


@dataclass(frozen=True)
class BrokerProfile:
    """Defines the capabilities and trade-offs of a message broker."""
    name: str
    description: str
    strengths: list[str]
    weaknesses: list[str]
    capabilities: list[BrokerCapability]
    best_for: list[str]
    recommended_max_throughput_mps: int  # messages per second


class BrokerSelector:
    """Decision framework for selecting the right message broker.

    Evaluates workload requirements against broker profiles to recommend
    the best-fit platform. Uses weighted scoring for nuanced comparisons.

    Usage:
        selector = BrokerSelector()
        requirements = {
            "requires_exactly_once": True,
            "needs_ordered_delivery": True,
            "managed_service_preferred": False,
            "max_throughput_mps": 50_000,
        }
        recommendation = selector.select(requirements)
    """

    # Broker profiles — the knowledge base for decisions
    PROFILES: list[BrokerProfile] = [
        BrokerProfile(
            name="Kafka",
            description="Distributed event streaming platform optimized for high-throughput "
                        "log-based messaging with persistent retention and replay.",
            strengths=[
                "Extremely high throughput (millions of messages/sec)",
                "Persistent message storage with configurable retention",
                "Strong ordering guarantees within partitions",
                "Built-in replication and fault tolerance",
                "Excellent for event sourcing and data pipelines",
            ],
            weaknesses=[
                "Complex operational footprint — requires ZooKeeper/KRaft cluster",
                "Higher latency than pub/sub brokers (~1ms+)",
                "No native complex routing (direct exchange, headers, etc.)",
                "Operational overhead for small teams",
            ],
            capabilities=[
                BrokerCapability.AT_LEAST_ONCE,
                BrokerCapability.EXACTLY_ONCE,
                BrokerCapability.ORDERED_PARTITIONS,
                BrokerCapability.PUB_SUB,
                BrokerCapability.MESSAGE_RETENTION,
            ],
            best_for=[
                "Event streaming and data pipelines",
                "High-throughput event sourcing",
                "Audit log aggregation",
                "Real-time analytics feeds",
            ],
            recommended_max_throughput_mps=1_000_000,
        ),
        BrokerProfile(
            name="RabbitMQ",
            description="Flexible message broker with advanced routing capabilities including "
                        "direct exchange, topic exchange, headers, and dead letter queues.",
            strengths=[
                "Rich routing model (direct, topic, headers, fanout exchanges)",
                "Excellent dead letter queue support",
                "Priority queue support natively",
                "Low latency (~1ms for simple delivery)",
                "Good management UI and monitoring tools",
            ],
            weaknesses=[
                "Lower throughput than Kafka (tens of thousands msg/sec)",
                "No persistent message log — messages lost if broker goes down without persistence",
                "Memory-conscious design requires tuning at scale",
                "Limited replay capability for consumed messages",
            ],
            capabilities=[
                BrokerCapability.AT_LEAST_ONCE,
                BrokerCapability.PUB_SUB,
                BrokerCapability.POINT_TO_POINT,
                BrokerCapability.COMPLEX_ROUTING,
                BrokerCapability.PRIORITY_QUEUES,
                BrokerCapability.DEAD_LETTER_QUEUES,
            ],
            best_for=[
                "Complex message routing scenarios",
                "Task queues with priority ordering",
                "RPC-style request/response patterns",
                "Systems needing dead letter queue management",
            ],
            recommended_max_throughput_mps=100_000,
        ),
        BrokerProfile(
            name="NATS",
            description="Ultra-fast pub/sub messaging system designed for cloud-native "
                        "environments with JetStream for persistence.",
            strengths=[
                "Extreme performance (hundreds of thousands msg/sec)",
                "Lowest latency of all major brokers (~sub-millisecond)",
                "Simple and lightweight — single binary deployment",
                "JetStream adds persistence, ordering, and ack semantics",
                "Excellent for microservices and edge computing",
            ],
            weaknesses=[
                "Smaller ecosystem and community than Kafka/RabbitMQ",
                "Complex routing less mature than RabbitMQ",
                "No exactly-once delivery guarantees",
                "Limited message retention compared to Kafka",
            ],
            capabilities=[
                BrokerCapability.AT_LEAST_ONCE,
                BrokerCapability.ORDERED_PARTITIONS,
                BrokerCapability.PUB_SUB,
                BrokerCapability.POINT_TO_POINT,
                BrokerCapability.DELAYED_DELIVERY,
            ],
            best_for=[
                "Low-latency microservices communication",
                "Edge computing and IoT message routing",
                "High-performance pub/sub workloads",
                "Simple deployments with minimal ops overhead",
            ],
            recommended_max_throughput_mps=500_000,
        ),
        BrokerProfile(
            name="AWS SQS",
            description="Fully managed message queue service in AWS with automatic scaling, "
                        "reliability, and integration with the AWS ecosystem.",
            strengths=[
                "Fully managed — no infrastructure to operate",
                "Automatic scaling and high availability",
                "Seamless AWS integration (Lambda, Step Functions, S3)",
                "Standard queue: at-least-once; FIFO queue: exactly-once ordering",
                "Built-in visibility timeout for processing guarantees",
            ],
            weaknesses=[
                "Locked into AWS — difficult to migrate elsewhere",
                "Minimum 256ms delay on standard queues (visibility timeout)",
                "Higher latency than self-hosted alternatives",
                "FIFO queues have lower throughput than standard",
                "Cost scales with API requests, not just volume",
            ],
            capabilities=[
                BrokerCapability.AT_LEAST_ONCE,
                BrokerCapability.EXACTLY_ONCE,  # FIFO only
                BrokerCapability.PUB_SUB,         # via SNS fan-out
                BrokerCapability.POINT_TO_POINT,
                BrokerCapability.DEAD_LETTER_QUEUES,
                BrokerCapability.MANAGED_SERVICE,
            ],
            best_for=[
                "AWS-native applications with minimal ops burden",
                "Decoupling microservices in serverless architectures",
                "Integration with AWS Lambda and Step Functions",
                "Simpler workloads that don't need complex routing",
            ],
            recommended_max_throughput_mps=100_000,  # FIFO; standard is higher but variable
        ),
    ]

    def get_profile(self, broker_name: str) -> BrokerProfile | None:
        """Retrieve the full profile for a named broker.

        Args:
            broker_name: One of Kafka, RabbitMQ, NATS, SQS.

        Returns:
            The BrokerProfile, or None if not found.
        """
        for profile in self.PROFILES:
            if profile.name.lower() == broker_name.lower():
                return profile
        return None

    def list_brokers(self) -> list[str]:
        """Return the list of available broker names."""
        return [p.name for p in self.PROFILES]

    def select(
        self,
        requirements: dict,
    ) -> BrokerProfile:
        """Select the best broker based on workload requirements.

        Evaluates requirements against each broker profile using a scoring system:
        - Exactly-once requirement favors Kafka (native) and SQS FIFO
        - Complex routing strongly favors RabbitMQ
        - High throughput (>100k mps) favors Kafka or NATS
        - Managed service preference favors SQS

        Args:
            requirements: Dict with keys like:
                - requires_exactly_once (bool)
                - needs_ordered_delivery (bool)
                - needs_complex_routing (bool)
                - managed_service_preferred (bool)
                - max_throughput_mps (int)
                - needs_message_retention (bool)

        Returns:
            The most suitable BrokerProfile.
        """
        score = self._calculate_scores(requirements)
        if not score:
            raise ValueError("No brokers available for evaluation")

        best_name, best_score = max(score.items(), key=lambda x: x[1])
        profile = next(p for p in self.PROFILES if p.name == best_name)

        logger.info(
            "Selected %s (score=%.2f) for requirements: %s",
            best_name, best_score,
            ", ".join(f"{k}={v}" for k, v in requirements.items()),
        )
        return profile

    def compare(self, broker_a: str, broker_b: str) -> dict:
        """Compare two brokers side-by-side for a given set of requirements.

        Args:
            broker_a: First broker name to compare.
            broker_b: Second broker name to compare.

        Returns:
            Dict with names as keys, each containing profile info and score.
        """
        if not requirements:
            requirements = {
                "requires_exactly_once": False,
                "needs_ordered_delivery": False,
                "needs_complex_routing": False,
                "managed_service_preferred": False,
                "max_throughput_mps": 10_000,
                "needs_message_retention": False,
            }

        scores = self._calculate_scores(requirements)
        return {
            broker_a: {
                "score": scores.get(broker_a, 0),
                **self._profile_summary(self.get_profile(broker_a)),
            },
            broker_b: {
                "score": scores.get(broker_b, 0),
                **self._profile_summary(self.get_profile(broker_b)),
            },
        }

    def _calculate_scores(
        self, requirements: dict
    ) -> dict[str, float]:
        """Calculate weighted scores for each broker against requirements."""
        scores: dict[str, float] = {}

        exactly_once = requirements.get("requires_exactly_once", False)
        ordered = requirements.get("needs_ordered_delivery", False)
        complex_routing = requirements.get("needs_complex_routing", False)
        managed = requirements.get("managed_service_preferred", False)
        throughput = requirements.get("max_throughput_mps", 1_000)
        retention = requirements.get("needs_message_retention", False)

        for profile in self.PROFILES:
            base_score = 0.0

            # Throughput fit — brokers excel near their sweet spot
            if throughput <= profile.recommended_max_throughput_mps * 0.1:
                base_score += 5  # Well under capacity, good margin
            elif throughput <= profile.recommended_max_throughput_mps:
                base_score += 10  # Within recommended range
            else:
                base_score -= 3  # Exceeding recommended — potential bottleneck

            # Capability matches
            if exactly_once and BrokerCapability.EXACTLY_ONCE in profile.capabilities:
                base_score += 8
            elif exactly_once and BrokerCapability.EXACTLY_ONCE not in profile.capabilities:
                base_score -= 5

            if ordered and BrokerCapability.ORDERED_PARTITIONS in profile.capabilities:
                base_score += 6
            elif ordered and BrokerCapability.ORDERED_PARTITIONS not in profile.capabilities:
                base_score -= 4

            if complex_routing and BrokerCapability.COMPLEX_ROUTING in profile.capabilities:
                base_score += 8
            elif complex_routing and BrokerCapability.COMPLEX_ROUTING not in profile.capabilities:
                base_score -= 5

            if managed and BrokerCapability.MANAGED_SERVICE in profile.capabilities:
                base_score += 5
            elif managed and BrokerCapability.MANAGED_SERVICE not in profile.capabilities:
                base_score -= 2

            if retention and BrokerCapability.MESSAGE_RETENTION in profile.capabilities:
                base_score += 6
            elif retention and BrokerCapability.MESSAGE_RETENTION not in profile.capabilities:
                base_score -= 3

            scores[profile.name] = max(0.0, base_score)

        return scores

    def _profile_summary(self, profile: BrokerProfile | None) -> dict:
        """Extract a concise summary dict from a broker profile."""
        if profile is None:
            return {"name": "Unknown", "description": "", "capabilities": []}
        return {
            "name": profile.name,
            "description": profile.description[:200],
            "capabilities": [c.value for c in profile.capabilities],
        }


# Convenience function for quick broker selection
def select_broker(requirements: dict) -> BrokerProfile:
    """One-line broker selection from requirements.

    Args:
        requirements: Dict of workload requirements (see BrokerSelector.select).

    Returns:
        The recommended BrokerProfile.

    Example:
        broker = select_broker({
            "requires_exactly_once": True,
            "needs_ordered_delivery": True,
            "max_throughput_mps": 50_000,
        })
        print(f"Recommended: {broker.name}")
    """
    selector = BrokerSelector()
    return selector.select(requirements)
```

---

## Constraints

### MUST DO
- Always implement idempotency (deduplication) when using at-least-once delivery — duplicates WILL occur
- Route messages to dead letter queues after exhausting retries — never let poison messages block the queue
- Set message TTL on all transient work items to prevent stale messages from accumulating indefinitely
- Choose partition keys that preserve ordering for semantically related messages (e.g., `order_id`)
- Match broker choice to workload requirements using the decision framework, not convention or familiarity
- Configure consumer groups so each logical workflow has exactly one group — never split a single use case across groups
- Handle consumer rebalance events by draining in-flight messages before releasing partition ownership

### MUST NOT DO
- Assume at-least-once delivery means zero duplicates — without idempotency, duplicates WILL cause data corruption
- Use FIFO queues for high-throughput workloads (>50k msg/sec) — throughput will be the bottleneck
- Route all messages through a single unpartitioned queue in production — this creates a single point of contention
- Bypass dead letter queues "for simplicity" — unhandled failures become production incidents
- Share consumer groups across unrelated business domains — this causes unpredictable load balancing and silent message loss
- Set message TTL to zero or omit it entirely on any queue that processes time-sensitive data

---

## Related Skills

| Skill | Purpose |
|---|---|
| `event-driven-patterns` | Broader EDA patterns — event sourcing, CQRS, saga orchestration, outbox pattern |
| `event-bus` | In-process event bus implementation for single-process or tightly-coupled services |
| `domain-events` | Domain-driven design event modeling — identifying and naming domain events within bounded contexts |
| `idempotent-distributed-operations` | Distributed idempotency patterns (deduplication tables, idempotency keys, compensation transactions) |
| `system-reliability-architecture` | Circuit breakers, retry strategies, bulkhead isolation, health checks, and graceful degradation |

---

## Live References

> Authoritative documentation links for message queue infrastructure.

- [RabbitMQ Documentation](https://www.rabbitmq.com/documentation)
- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- [NATS Documentation](https://docs.nats.io/)
- [AWS SQS Developer Guide](https://docs.aws.amazon.com/sqs/latest/dqs/what-is-sqs.html)
- [RabbitMQ Exchange Types](https://www.rabbitmq.com/tutorials/amqp-concepts#exchange)
- [Kafka Consumer Groups](https://kafka.apache.org/documentation/#consumerconfigs)
- [SQS FIFO Queues](https://docs.aws.amazon.com/sqs/latest/dqs/fifo-queues.html)
