---
name: dlq-retry-patterns
description: Implements dead letter queue architectures with retry strategies (exponential backoff, circuit breaker integration, poison pill detection) for resilient event-driven systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: dead letter queue, DLQ, retry pattern, exponential backoff, poison pill, circuit breaker, how do i handle failed events, event processing failure
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
  related-skills: event-driven-patterns,event-sourcing-pattern,idempotent-distributed-operations
---

# Dead Letter Queue and Retry Patterns

Implements dead letter queue architectures with retry strategies to ensure resilient event-driven systems. When loaded, this skill makes the model design DLQ routing, configure exponential backoff with jitter, detect and quarantine poison pills, integrate circuit breakers into event handlers, and build replay workflows for recovered messages.

## TL;DR Checklist

- [ ] Configure a dedicated dead letter queue for every processing queue — never let failures silently disappear
- [ ] Set maximum retry counts with exponential backoff and full jitter before routing to DLQ
- [ ] Implement poison pill detection: reject messages that fail consistently (>3 retries on same error type)
- [ ] Add idempotency keys to all retry logic so reprocessing never causes duplicate side effects
- [ ] Instrument DLQ depth metrics with alerting thresholds for proactive incident response
- [ ] Build a replay workflow that moves fixed messages back to original queues after root cause is resolved
- [ ] Circuit-break downstream dependencies before allowing retries to hammer an already-failing service

---

## When to Use

Use this skill when:

- Designing or implementing dead letter queue infrastructure for a message broker (RabbitMQ, Kafka, SQS, NATS)
- Building retry logic for event handlers that need exponential backoff with jitter
- Debugging poison pill scenarios where one bad message blocks an entire processing pipeline
- Integrating circuit breaker patterns into event consumers to prevent cascade failures
- Setting up monitoring and alerting on DLQ depth and retry failure rates
- Designing replay workflows for reprocessing messages after a known transient issue is resolved
- Implementing idempotent retry strategies to safely reprocess events without duplicate side effects

---

## When NOT to Use

Avoid this skill for:

- **Simple synchronous error handling** — use standard try/except with local retries instead of DLQ machinery
- **State machine design** — use `event-sourcing-pattern` for state transitions that need event replay at the domain level
- **General message queue topology** — use `event-driven-patterns` for pub/sub, saga coordination, and outbox patterns
- **One-off script failures** — logging and manual intervention are sufficient; don't over-engineer DLQ infrastructure for simple tasks

---

## Core Workflow

1. **Map the Failure Surface** — Identify every event handler that can fail, classify failures as transient (network timeout, downstream unavailable) or permanent (schema violation, invalid payload). **Checkpoint:** Every handler has a documented failure classification — transient vs. permanent determines retry policy and DLQ routing logic.

2. **Configure Queue Topology** — Create source queues with `x-dead-letter-exchange` and `x-dead-letter-routing-key` parameters so failed messages automatically route to the DLQ after exhausting retries. Use separate DLQs per handler for diagnostic isolation, or a single shared DLQ for simpler systems. **Checkpoint:** Every queue has explicit retry counts, TTL, and DLQ routing configured — never rely on broker defaults.

3. **Implement Retry with Backoff** — Add exponential backoff with full jitter to each event handler. Configure max retries (typically 3–5), then route to the DLQ. Integrate circuit breaker checks before each retry attempt. **Checkpoint:** The retry loop records every attempt with timestamp, error type, and delay — this data powers poison pill detection and operational dashboards.

4. **Detect Poison Pills** — Implement a poison pill detector that tracks failure patterns per message ID. If the same error repeats beyond a threshold (e.g., 3 failures with identical error types on the same message), quarantine the message immediately instead of continuing futile retries. **Checkpoint:** Quarantined messages are isolated in a separate DLQ sub-queue named after the failure category (schema_error, downstream_timeout, etc.).

5. **Instrument and Alert** — Add metrics collection for DLQ depth per queue, retry count distribution, error type frequency, and average message age in DLQ. Configure alerts when DLQ depth exceeds thresholds (e.g., >100 messages) or when messages age beyond SLA bounds (e.g., >30 minutes). **Checkpoint:** Every metric has a corresponding Grafana dashboard panel and PagerDuty/Slack alerting rule — silent DLQ accumulation is an incident, not a feature.

6. **Build Replay Workflow** — Implement a safe replay mechanism that reads from the DLQ, validates messages for recoverability, applies idempotency keys, and publishes back to the original source queue. Include manual approval gates for high-risk replays. **Checkpoint:** The replay workflow processes messages in bounded batches (max 50 at a time) with per-message retry limits to prevent overwhelming the system on re-entry.

---

## Implementation Patterns

### Pattern 1: Dead Letter Queue Manager with Automatic Routing

A production-grade DLQ manager that wraps any message broker, providing automatic routing of failed messages to dead letter queues with metadata preservation and configurable policies. Uses separate DLQs per source queue for diagnostic isolation.

```python
from __future__ import annotations

import json
import logging
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Callable, Protocol


logger = logging.getLogger(__name__)


class FailureCategory(Enum):
    """Classifies why a message failed, enabling targeted DLQ routing."""
    TRANSIENT = "transient"               # Network timeout, downstream unavailable
    SCHEMA = "schema"                     # Payload doesn't match expected schema
    BUSINESS = "business"                 # Business rule violation (e.g., negative quantity)
    INTEGRATION = "integration"           # External service call failed permanently


@dataclass(frozen=True)
class DeliveryMetadata:
    """Immutable metadata attached to every delivery attempt."""
    message_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    source_queue: str = ""
    correlation_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    delivered_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    attempt_number: int = 0
    max_retries: int = 3


@dataclass
class DeadLetterRecord:
    """Persistent record of a message that moved to the dead letter queue."""
    original_message_id: str
    source_queue: str
    payload: dict[str, Any]
    headers: dict[str, Any]
    failure_category: FailureCategory
    error_reason: str
    attempt_number: int
    max_retries: int
    first_failed_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    last_attempted_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    retry_history: list[dict[str, Any]] = field(default_factory=list)

    @property
    def age_seconds(self) -> float:
        """How long this message has been in the DLQ."""
        return (datetime.now(timezone.utc) - self.first_failed_at).total_seconds()


class MessageBroker(Protocol):
    """Minimal protocol for broker interactions — any real broker adapter implements this."""

    def publish(self, queue: str, payload: dict[str, Any], headers: dict[str, Any] | None = None) -> str: ...
    def consume(self, queue: str, timeout_ms: int = 5000) -> dict[str, Any] | None: ...
    def acknowledge(self, delivery_tag: str) -> None: ...
    def reject(self, delivery_tag: str, requeue: bool = False) -> None: ...


class DeadLetterQueueManager:
    """Manages dead letter queue operations with automatic routing and metadata preservation.

    When a message fails processing beyond its retry limit, this manager:
    1. Classifies the failure type (transient vs permanent)
    2. Routes to the appropriate DLQ (per-queue isolation by default)
    3. Preserves full message context for forensic analysis
    4. Records metrics for monitoring and alerting

    Separate DLQs per source queue enable targeted investigation — a DLQ depth spike
    on `order.processing.dlq` immediately signals an issue with order processing,
    not shipping or payment handlers.
    """

    def __init__(
        self,
        broker: MessageBroker,
        dlq_prefix: str = ".dlq",
        max_retries: int = 3,
    ) -> None:
        self._broker = broker
        self._max_retries = max_retries
        self._dlq_prefix = dlq_prefix
        self._dlq_records: dict[str, DeadLetterRecord] = {}

    @property
    def dlq_name(self, source_queue: str) -> str:
        """Derive the DLQ name from a source queue using convention.

        Args:
            source_queue: The original message queue name.

        Returns:
            DLQ-qualified name (e.g., 'order.processing' → 'order.processing.dlq').
        """
        return f"{source_queue}{self._dlq_prefix}"

    def record_failure(
        self,
        source_queue: str,
        payload: dict[str, Any],
        headers: dict[str, Any],
        error: Exception,
        attempt_number: int,
        failure_category: FailureCategory = FailureCategory.TRANSIENT,
    ) -> DeadLetterRecord | None:
        """Record a message failure and route to DLQ if retries exhausted.

        Returns the DeadLetterRecord if routed to DLQ, or None if still retriable.

        Args:
            source_queue: The queue the message came from.
            payload: The original message payload.
            headers: Message metadata headers.
            error: The exception that caused processing failure.
            attempt_number: Current retry attempt number (1-based).
            failure_category: Classification of the failure type.

        Returns:
            DeadLetterRecord if DLQ routing occurred, None if still within retry budget.
        """
        if attempt_number < self._max_retries:
            logger.info(
                "Message %s failed on attempt %d/%d — will retry",
                headers.get("message_id", "unknown"),
                attempt_number,
                self._max_retries,
            )
            return None

        # Retry budget exhausted — route to DLQ
        source_queue_name = source_queue
        dlq_name = self.dlq_name(source_queue_name)
        message_id = headers.get("message_id", str(uuid.uuid4()))

        record = DeadLetterRecord(
            original_message_id=message_id,
            source_queue=source_queue_name,
            payload=payload,
            headers=headers,
            failure_category=failure_category,
            error_reason=str(error),
            attempt_number=attempt_number,
            max_retries=self._max_retries,
        )

        # Publish to DLQ with extended metadata
        dlq_headers = {**headers, "dlq_routed_at": datetime.now(timezone.utc).isoformat(),
                       "failure_category": failure_category.value}
        self._broker.publish(dlq_name, {"_dlq_record": record.__dict__, "_original_payload": payload}, dlq_headers)

        self._dlq_records[message_id] = record
        logger.warning(
            "Message %s routed to DLQ (%s) after %d attempts: %s",
            message_id, dlq_name, attempt_number, error,
        )

        return record

    def get_dlq_records(self, source_queue: str | None = None) -> list[DeadLetterRecord]:
        """Retrieve DLQ records, optionally filtered by source queue.

        Args:
            source_queue: If provided, filter to only records from this queue.

        Returns:
            List of DeadLetterRecord instances matching the filter.
        """
        if source_queue is None:
            return list(self._dlq_records.values())

        return [
            r for r in self._dlq_records.values()
            if r.source_queue == source_queue
        ]


class DirectMessageBrokerAdapter:
    """Concrete broker adapter implementing the MessageBroker protocol.

    This is a simplified in-memory adapter for demonstration. In production,
    replace with RabbitMQChannelPublisher, KafkaProducerAdapter, or SqsClientAdapter.
    """

    def __init__(self) -> None:
        self._queues: dict[str, list[dict[str, Any]]] = {}

    def publish(self, queue: str, payload: dict[str, Any], headers: dict[str, Any] | None = None) -> str:
        message_id = str(uuid.uuid4())
        message = {
            "message_id": message_id,
            "payload": payload,
            "headers": headers or {},
            "published_at": time.monotonic(),
        }
        self._queues.setdefault(queue, []).append(message)
        return message_id

    def consume(self, queue: str, timeout_ms: int = 5000) -> dict[str, Any] | None:
        messages = self._queues.get(queue, [])
        if not messages:
            return None
        return messages.pop(0)

    def acknowledge(self, delivery_tag: str) -> None:
        logger.debug("Acknowledged delivery %s", delivery_tag)

    def reject(self, delivery_tag: str, requeue: bool = False) -> None:
        logger.debug("Rejected delivery %s, requeue=%s", delivery_tag, requeue)
```

---

### Pattern 2: Exponential Backoff with Full Jitter Retry Decorator

A retry mechanism that uses exponential backoff with full random jitter to prevent thundering herd problems when multiple consumers simultaneously retry failed messages. Includes circuit breaker awareness to avoid hammering already-failing downstream services.

```python
from __future__ import annotations

import asyncio
import logging
import random
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from typing import TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")


@dataclass(frozen=True)
class RetryPolicy:
    """Immutable retry policy configuration."""
    max_attempts: int = 5
    base_delay_ms: float = 100.0       # Base delay for exponential backoff
    max_delay_ms: float = 30_000.0     # Cap on individual retry delays
    backoff_multiplier: float = 2.0    # Exponent base
    jitter_mode: str = "full"          # full | random | none
    retryable_exceptions: tuple[type[Exception], ...] = (ConnectionError, TimeoutError)

    @property
    def should_retry(self) -> Callable[[Exception], bool]:
        """Return a predicate that determines if an exception is worth retrying."""
        return lambda exc: isinstance(exc, self.retryable_exceptions)


@dataclass
class RetryResult:
    """Outcome of a retry operation."""
    success: bool
    attempts: int = 0
    total_duration_ms: float = 0.0
    final_error: str | None = None
    circuit_breaker_opened: bool = False


def compute_delay(
    attempt: int,
    policy: RetryPolicy,
) -> float:
    """Calculate delay for a given retry attempt with jitter.

    Uses full jitter (AWS recommended pattern): random value between 0 and
    the calculated exponential backoff delay. This spreads retry attempts
    evenly across time, preventing thundering herd when many clients retry
    simultaneously.

    Args:
        attempt: The 1-based attempt number.
        policy: Retry policy configuration.

    Returns:
        Delay in seconds to wait before the next retry.
    """
    # Exponential backoff: base_delay * (multiplier ^ (attempt - 1))
    exponential_delay_ms = min(
        policy.base_delay_ms * (policy.backoff_multiplier ** (attempt - 1)),
        policy.max_delay_ms,
    )

    if policy.jitter_mode == "full":
        # Full jitter: random value in [0, exponential_delay]
        delay_ms = random.uniform(0, exponential_delay_ms)
    elif policy.jitter_mode == "random":
        # Random jitter: exponential_delay * random(0.5, 1.5)
        delay_ms = exponential_delay_ms * random.uniform(0.5, 1.5)
    else:
        # No jitter: exact exponential
        delay_ms = exponential_delay_ms

    return delay_ms / 1000.0


class CircuitBreaker:
    """Simple circuit breaker to prevent retrying when a downstream is clearly failing.

    States:
      CLOSED   → Normal operation, retries proceed
      OPEN     → Downstream failing, all retries rejected immediately
      HALF_OPEN → Testing if downstream recovered (one probe attempt allowed)

    Args:
        failure_threshold: Number of consecutive failures before opening circuit.
        recovery_timeout_seconds: Seconds to wait before transitioning to half-open.
    """

    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout_seconds: float = 30.0,
    ) -> None:
        self._failure_threshold = failure_threshold
        self._recovery_timeout = recovery_timeout_seconds
        self._failure_count: int = 0
        self._last_failure_time: float = 0.0
        self._state: str = "closed"

    @property
    def state(self) -> str:
        return self._state

    def allow_request(self) -> bool:
        """Check if a retry attempt is allowed through the circuit breaker."""
        if self._state == "closed":
            return True

        if self._state == "open":
            # Transition to half-open after recovery timeout
            if time.monotonic() - self._last_failure_time > self._recovery_timeout:
                self._state = "half-open"
                logger.info("Circuit breaker transitioning to HALF_OPEN")
                return True  # Allow one probe attempt
            return False

        # half-open — allow exactly one probe
        return True

    def record_success(self) -> None:
        """Record a successful call — resets circuit breaker state."""
        self._failure_count = 0
        self._state = "closed"

    def record_failure(self) -> None:
        """Record a failed call — increments failure count and may open circuit."""
        self._failure_count += 1
        self._last_failure_time = time.monotonic()

        if self._failure_count >= self._failure_threshold:
            self._state = "open"
            logger.warning(
                "Circuit breaker OPENED after %d consecutive failures",
                self._failure_count,
            )


def retry_with_backoff(
    func: Callable[..., T],
    policy: RetryPolicy | None = None,
    circuit_breaker: CircuitBreaker | None = None,
) -> Callable[..., RetryResult]:
    """Decorator that wraps a function with exponential backoff and jitter retry.

    Usage:
        @retry_with_backoff(RetryPolicy(max_attempts=3))
        def send_to_downstream(message):
            ...

    Args:
        func: The function to wrap with retry logic.
        policy: Retry policy configuration (default: 5 attempts, full jitter).
        circuit_breaker: Optional circuit breaker for downstream protection.

    Returns:
        A wrapped function that returns RetryResult with outcome details.
    """
    if policy is None:
        policy = RetryPolicy()

    def wrapper(*args: Any, **kwargs: Any) -> RetryResult:
        cb_opened = False
        last_error: Exception | None = None

        for attempt in range(1, policy.max_attempts + 1):
            # Check circuit breaker before attempting retry
            if circuit_breaker and not circuit_breaker.allow_request():
                logger.warning("Circuit breaker OPEN — skipping retry attempt %d", attempt)
                cb_opened = True
                return RetryResult(success=False, attempts=attempt, circuit_breaker_opened=True)

            try:
                result = func(*args, **kwargs)
                if circuit_breaker:
                    circuit_breaker.record_success()
                duration_ms = 0.0  # Would be tracked with a timer wrapper
                return RetryResult(success=True, attempts=attempt, total_duration_ms=duration_ms)

            except Exception as exc:
                last_error = exc

                if not policy.should_retry(exc):
                    logger.info("Non-retryable exception %s — giving up", type(exc).__name__)
                    break

                if attempt < policy.max_attempts:
                    delay = compute_delay(attempt, policy)
                    logger.info(
                        "Attempt %d/%d failed (%s), retrying in %.1fms",
                        attempt, policy.max_attempts, exc, delay * 1000,
                    )
                    time.sleep(delay)

                if circuit_breaker:
                    circuit_breaker.record_failure()

        return RetryResult(
            success=False,
            attempts=policy.max_attempts,
            total_duration_ms=0.0,
            final_error=str(last_error),
            circuit_breaker_opened=cb_opened,
        )

    return wrapper
```

---

### Pattern 3: Poison Pill Detection and Quarantine

Detects poison pills by analyzing failure patterns across retry attempts. Messages that fail repeatedly with the same error type are classified as poison pills and quarantined to a separate sub-queue, preventing them from blocking normal processing retries.

```python
from __future__ import annotations

import logging
import time
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class FailureSignature:
    """A hashable fingerprint of a failure for pattern detection.

    Groups failures by error type and message content so that repeated
    failures from the same cause are detected quickly.
    """
    error_type: str
    queue_name: str
    handler_name: str
    # Optional: hash a snippet of payload to detect malformed content
    payload_hash: str = ""

    @classmethod
    def from_message(
        cls,
        message: dict[str, Any],
        error: Exception,
        handler_name: str,
    ) -> FailureSignature:
        import hashlib
        return cls(
            error_type=type(error).__name__,
            queue_name=message.get("source_queue", "unknown"),
            handler_name=handler_name,
            payload_hash=hashlib.md5(
                str(message.get("payload", "")).encode()[:100]
            ).hexdigest(),
        )


@dataclass
class PoisonPillAlert:
    """Alert raised when a poison pill is detected and quarantined."""
    message_id: str
    source_queue: str
    handler_name: str
    failure_signature: FailureSignature
    consecutive_failures: int
    quarantine_time: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    reason: str = ""


class PoisonPillDetector:
    """Detects and quarantines poison pills — messages that consistently fail processing.

    A poison pill is a message whose content or state makes it impossible to process,
    regardless of retries. Examples: corrupted JSON payload, missing required field,
    permanently invalid business rule violation.

    Detection strategy:
      1. Track consecutive failures per message (grouped by failure signature).
      2. If the same error type repeats ≥ threshold times, classify as poison pill.
      3. Quarantine to a named quarantine sub-queue (e.g., `order.processing.dlq.quarantine.schema`).
      4. Raise an alert for on-call investigation.

    The key insight: continuing to retry the same error is waste and blocks queue progress.
    A poison pill needs human intervention or payload correction, not more retries.
    """

    def __init__(
        self,
        failure_threshold: int = 3,
        time_window_seconds: float = 60.0,
    ) -> None:
        self._failure_threshold = failure_threshold
        self._time_window = time_window_seconds
        # Tracks consecutive failures per message ID grouped by error type
        self._message_failures: dict[str, list[dict[str, Any]]] = defaultdict(list)
        # Tracks handler-level failure rates for bulk poison detection
        self._handler_failures: dict[str, int] = defaultdict(int)

    def record_failure(
        self,
        message_id: str,
        message: dict[str, Any],
        error: Exception,
        handler_name: str,
    ) -> PoisonPillAlert | None:
        """Record a failure attempt and check if the message is now a poison pill.

        Args:
            message_id: Unique ID of the failing message.
            message: The original message payload and headers.
            error: The exception raised during processing.
            handler_name: Name of the handler that failed.

        Returns:
            PoisonPillAlert if quarantined, None if still within normal retry bounds.
        """
        signature = FailureSignature.from_message(message, error, handler_name)
        now = time.monotonic()

        # Record this failure attempt
        self._message_failures[message_id].append({
            "timestamp": now,
            "error_type": signature.error_type,
            "signature": signature,
            "handler": handler_name,
            "queue": message.get("source_queue", "unknown"),
        })

        # Clean old entries outside the time window
        self._message_failures[message_id] = [
            entry for entry in self._message_failures[message_id]
            if now - entry["timestamp"] < self._time_window
        ]

        recent_entries = self._message_failures[message_id]

        # Check for poison pill: same error type repeated ≥ threshold times
        error_counts: dict[str, int] = defaultdict(int)
        for entry in recent_entries:
            error_counts[entry["error_type"]] += 1

        for error_type, count in error_counts.items():
            if count >= self._failure_threshold:
                alert = PoisonPillAlert(
                    message_id=message_id,
                    source_queue=message.get("source_queue", "unknown"),
                    handler_name=handler_name,
                    failure_signature=signature,
                    consecutive_failures=count,
                    reason=(
                        f"Message failed {count} times with {error_type} in "
                        f"{self._time_window:.0f}s window — quarantining"
                    ),
                )
                logger.error(
                    "POISON PILL detected: message %s (queue: %s, handler: %s) — %s",
                    message_id, message.get("source_queue"), handler_name, alert.reason,
                )
                return alert

        return None

    def quarantine_subqueue(self, source_queue: str, signature: FailureSignature) -> str:
        """Derive the quarantine sub-queue name for a given failure signature.

        Args:
            source_queue: The original source queue.
            signature: The failure signature classifying the error type.

        Returns:
            Quarantine queue name (e.g., 'order.processing.dlq.quarantine.schema_error').
        """
        base_dlq = f"{source_queue}.dlq.quarantine"
        return f"{base_dlq}.{signature.error_type.lower().replace('error', 'err')}"

    def reset_message(self, message_id: str) -> None:
        """Reset failure tracking for a message (e.g., after manual fix and replay)."""
        self._message_failures.pop(message_id, None)
        logger.info("Reset failure tracking for message %s", message_id)
```

---

### Pattern 4: Circuit Breaker for Event Handlers

A circuit breaker integrated into event handler execution that prevents cascading failures when downstream dependencies are unavailable. Opens after consecutive failures and transitions to half-open to probe recovery.

```python
from __future__ import annotations

import logging
import threading
import time
from collections import defaultdict
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Generic, Protocol, TypeVar

logger = logging.getLogger(__name__)


class CircuitState(Enum):
    CLOSED = "closed"       # Normal — allow requests through
    OPEN = "open"           # Failing — reject all requests immediately
    HALF_OPEN = "half-open" # Testing — allow limited probe requests


T = TypeVar("T")


@dataclass
class CircuitBreakerMetrics:
    """Live metrics for a circuit breaker instance."""
    total_calls: int = 0
    successful_calls: int = 0
    failed_calls: int = 0
    rejected_calls: int = 0
    state_transitions: int = 0
    last_failure_time: float | None = None
    current_state: CircuitState = CircuitState.CLOSED


class EventHandler(Protocol, Generic[T]):
    """Protocol for event handlers that can be wrapped with circuit breaker protection."""

    async def handle(self, event: dict[str, Any]) -> T: ...

    @property
    def name(self) -> str: ...


@dataclass
class CircuitBreakerConfig:
    """Configuration for a circuit breaker protecting a specific downstream dependency."""
    failure_threshold: int = 5          # Consecutive failures before opening
    success_threshold_half_open: int = 2  # Successes needed in half-open to close
    recovery_timeout_seconds: float = 30.0  # Time to wait before probing
    maximum_concurrent_probes: int = 1    # Allowed concurrent calls in half-open state


class HandlerCircuitBreaker(Generic[T]):
    """Circuit breaker that protects individual event handlers from cascading failures.

    Each handler gets its own circuit breaker instance, allowing independent failure
    tracking per downstream dependency. For example, the `EmailNotificationHandler`
    might trip while `PaymentProcessingHandler` continues operating normally.

    State transitions:
      CLOSED → OPEN:     After `failure_threshold` consecutive failures.
      OPEN → HALF_OPEN:  After `recovery_timeout_seconds` elapses.
      HALF_OPEN → CLOSED: After `success_threshold_half_open` successful probe calls.
      HALF_OPEN → OPEN:  Any single failure in half-open state reopens immediately.

    Usage:
        breaker = HandlerCircuitBreaker(name="email_notifications")
        result = await breaker.execute(lambda: send_email(event))
        if result.rejected:
            route_to_dlq(event, "handler_circuit_open")
    """

    def __init__(self, name: str, config: CircuitBreakerConfig | None = None) -> None:
        self._name = name
        self._config = config or CircuitBreakerConfig()
        self._state = CircuitState.CLOSED
        self._consecutive_failures = 0
        self._consecutive_successes = 0
        self._last_failure_time: float = 0.0
        self._half_open_probes = 0
        self._lock = threading.Lock()
        self._metrics = CircuitBreakerMetrics()

    @property
    def name(self) -> str:
        return self._name

    @property
    def state(self) -> CircuitState:
        """Current circuit breaker state, with automatic OPEN→HALF_OPEN transition."""
        if self._state == CircuitState.OPEN:
            if (time.monotonic() - self._last_failure_time) >= self._config.recovery_timeout_seconds:
                self._transition_to(CircuitState.HALF_OPEN)
        return self._state

    def execute(self, handler_fn: Callable[[], T]) -> "HandlerExecutionResult[T]":
        """Execute a handler through the circuit breaker.

        Args:
            handler_fn: A callable that performs the event handling logic.

        Returns:
            HandlerExecutionResult with outcome details including rejection status.
        """
        current_state = self.state

        if current_state == CircuitState.OPEN:
            self._metrics.rejected_calls += 1
            return HandlerExecutionResult(
                success=False, rejected=True, state=self.state,
                error=f"Circuit breaker OPEN for handler '{self._name}'",
            )

        self._metrics.total_calls += 1

        try:
            result = handler_fn()
            self._on_success()
            return HandlerExecutionResult(
                success=True, rejected=False, state=self.state, result=result,
            )

        except Exception as exc:
            self._on_failure(exc)
            return HandlerExecutionResult(
                success=False, rejected=False, state=self.state, error=str(exc),
            )

    async def execute_async(self, handler_fn: Callable[[], Any]) -> "HandlerExecutionResult[Any]":
        """Async version of execute for use with async handlers."""
        current_state = self.state

        if current_state == CircuitState.OPEN:
            self._metrics.rejected_calls += 1
            return HandlerExecutionResult(
                success=False, rejected=True, state=self.state,
                error=f"Circuit breaker OPEN for handler '{self._name}'",
            )

        self._metrics.total_calls += 1

        try:
            result = await handler_fn()
            self._on_success()
            return HandlerExecutionResult(success=True, rejected=False, state=self.state, result=result)

        except Exception as exc:
            self._on_failure(exc)
            return HandlerExecutionResult(
                success=False, rejected=False, state=self.state, error=str(exc),
            )

    def _on_success(self) -> None:
        """Handle a successful handler execution."""
        if self._state == CircuitState.HALF_OPEN:
            self._consecutive_successes += 1
            if self._consecutive_successes >= self._config.success_threshold_half_open:
                self._transition_to(CircuitState.CLOSED)
        else:
            self._consecutive_failures = 0
            self._consecutive_successes += 1

        self._metrics.successful_calls += 1

    def _on_failure(self, exc: Exception) -> None:
        """Handle a failed handler execution."""
        self._consecutive_failures += 1
        self._consecutive_successes = 0
        self._last_failure_time = time.monotonic()
        self._metrics.failed_calls += 1

        if self._state == CircuitState.HALF_OPEN:
            # Any failure in half-open reopens the circuit immediately
            logger.warning("Circuit breaker for '%s' reopened from HALF_OPEN", self._name)
            self._transition_to(CircuitState.OPEN)
        elif self._consecutive_failures >= self._config.failure_threshold:
            logger.warning(
                "Circuit breaker for '%s' OPENED after %d consecutive failures: %s",
                self._name, self._consecutive_failures, exc,
            )
            self._transition_to(CircuitState.OPEN)

    def _transition_to(self, new_state: CircuitState) -> None:
        """Transition the circuit breaker to a new state."""
        old_state = self._state
        self._state = new_state
        self._metrics.state_transitions += 1
        self._metrics.current_state = new_state

        if new_state == CircuitState.HALF_OPEN:
            self._consecutive_successes = 0
            self._half_open_probes = 0

        logger.info(
            "Circuit breaker '%s': %s → %s",
            self._name, old_state.value, new_state.value,
        )


@dataclass
class HandlerExecutionResult(Generic[T]):
    """Result of executing a handler through the circuit breaker."""
    success: bool
    rejected: bool
    state: CircuitState
    result: T | None = None
    error: str | None = None


# ── BAD vs GOOD Comparison ─────────────────────────────────────────────

# ❌ BAD — No circuit breaker: retries hammer an already-downstream service,
#          consuming resources and potentially causing complete system outage.
async def bad_event_handler(event: dict[str, Any]) -> None:
    """Processes events by retrying until success — no backoff protection."""
    for attempt in range(10):  # Will retry forever regardless of downstream state
        try:
            await call_downstream_service(event)
            return
        except ConnectionError:
            time.sleep(1)  # Bare 1-second delay, no exponential backoff
            continue  # Continues hammering the failing service

# ✅ GOOD — Circuit breaker prevents cascade: after 5 failures, all retries
#          are rejected immediately, and downstream gets recovery time.
async def good_event_handler(event: dict[str, Any], cb: HandlerCircuitBreaker) -> None:
    """Processes events with circuit breaker protection for the downstream service."""
    result = await cb.execute_async(lambda: call_downstream_service(event))

    if result.rejected:
        # Circuit is open — route to DLQ instead of retrying
        route_to_dlq(event, f"circuit_open_{cb.name}", "handler_circuit_breaker")
        return

    if not result.success:
        # Retryable failure within closed/half-open state — retry once more
        await call_downstream_service(event)
```

---

### Pattern 5: DLQ Monitoring and Metrics Collection

Collects operational metrics on dead letter queue depth, message age, error type distribution, and retry patterns. Produces structured telemetry that feeds monitoring dashboards and alerting systems.

```python
from __future__ import annotations

import json
import logging
import time
from collections import defaultdict
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any


logger = logging.getLogger(__name__)


@dataclass
class DlqMetricsSnapshot:
    """Point-in-time snapshot of DLQ operational metrics.

    This structure is suitable for structured logging, Prometheus histogram buckets,
    or export to a metrics backend like Datadog or New Relic.
    """
    timestamp_utc: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    total_dlq_depth: int = 0
    queues: dict[str, "QueueMetrics"] = field(default_factory=dict)
    error_distribution: dict[str, int] = field(default_factory=lambda: defaultdict(int))
    oldest_message_age_seconds: float = 0.0
    messages_over_threshold: list["QueueMetrics"] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "timestamp": self.timestamp_utc.isoformat(),
            "total_depth": self.total_dlq_depth,
            "queues": {k: asdict(v) for k, v in self.queues.items()},
            "error_distribution": dict(self.error_distribution),
            "oldest_age_seconds": self.oldest_message_age_seconds,
            "messages_over_threshold": len(self.messages_over_threshold),
        }


@dataclass
class QueueMetrics:
    """Per-queue metrics for a single DLQ."""
    queue_name: str = ""
    depth: int = 0
    oldest_message_age_seconds: float = 0.0
    error_types: dict[str, int] = field(default_factory=lambda: defaultdict(int))
    avg_retries_before_dlq: float = 0.0
    messages_over_threshold_count: int = 0


class DlqMetricsCollector:
    """Collects and aggregates metrics from dead letter queues for monitoring.

    Scans all DLQs, computes depth, age distribution, error type breakdown,
    and identifies queues that exceed alerting thresholds. Produces snapshots
    suitable for dashboard rendering and automated alert evaluation.

    In production, replace the in-memory scanning with real broker API calls
    (RabbitMQ HTTP API, Kafka JMX metrics, SQS GetQueueAttributes).
    """

    def __init__(
        self,
        age_threshold_seconds: float = 1800.0,  # 30 minutes
        depth_threshold_per_queue: int = 100,
    ) -> None:
        self._age_threshold = age_threshold_seconds
        self._depth_threshold = depth_threshold_per_queue
        self._historical_snapshots: list[DlqMetricsSnapshot] = []

    def scan_queues(
        self,
        queue_data: dict[str, list[dict[str, Any]]],
    ) -> DlqMetricsSnapshot:
        """Scan DLQ queue data and produce a metrics snapshot.

        Args:
            queue_data: Mapping of queue name to list of message dicts.
                Each message dict should contain: 'age_seconds', 'error_type',
                'retry_count', and optionally 'source_queue'.

        Returns:
            DlqMetricsSnapshot with computed metrics.
        """
        snapshot = DlqMetricsSnapshot()
        total_depth = 0

        for queue_name, messages in queue_data.items():
            if not messages:
                continue

            depth = len(messages)
            total_depth += depth
            max_age = 0.0
            error_counts: dict[str, int] = defaultdict(int)
            retry_sums = 0
            over_threshold = 0

            for msg in messages:
                age = msg.get("age_seconds", 0.0)
                if age > max_age:
                    max_age = age
                if age > self._age_threshold:
                    over_threshold += 1

                error_type = msg.get("failure_category", "unknown")
                error_counts[error_type] += 1
                retry_sums += msg.get("retry_count", 0)

            avg_retries = retry_sums / depth if depth > 0 else 0.0

            metrics = QueueMetrics(
                queue_name=queue_name,
                depth=depth,
                oldest_message_age_seconds=max_age,
                error_types=dict(error_counts),
                avg_retries_before_dlq=avg_retries,
                messages_over_threshold_count=over_threshold,
            )

            snapshot.queues[queue_name] = metrics
            snapshot.error_distribution.update(error_counts)

            if max_age > snapshot.oldest_message_age_seconds:
                snapshot.oldest_message_age_seconds = max_age

            if over_threshold > 0:
                snapshot.messages_over_threshold.append(metrics)

        snapshot.total_dlq_depth = total_depth

        # Log summary and check thresholds
        self._evaluate_alerts(snapshot)
        self._historical_snapshots.append(snapshot)

        logger.info(
            "DLQ Metrics: depth=%d, queues=%d, oldest=%.0fs",
            total_depth, len(queue_data), snapshot.oldest_message_age_seconds,
        )

        return snapshot

    def evaluate_alerts(self, snapshot: DlqMetricsSnapshot) -> list[str]:
        """Evaluate alerting conditions against the metrics snapshot.

        Returns a list of alert descriptions (empty if no alerts fire).

        Alert rules:
          - DLQ depth exceeds per-queue threshold (>100 messages)
          - Oldest message in DLQ exceeds age threshold (>30 minutes)
          - Any single error type accounts for >50% of DLQ traffic
        """
        alerts: list[str] = []

        for queue_name, metrics in snapshot.queues.items():
            if metrics.depth >= self._depth_threshold:
                alerts.append(
                    f"[DEPTH] {queue_name}: {metrics.depth} messages "
                    f"(threshold: {self._depth_threshold})"
                )

        if snapshot.oldest_message_age_seconds >= self._age_threshold:
            alerts.append(
                f"[AGE] Oldest DLQ message is {snapshot.oldest_message_age_seconds:.0f}s old "
                f"(threshold: {self._age_threshold}s)"
            )

        # Check for dominant error types (potential systematic issue)
        total_errors = sum(snapshot.error_distribution.values())
        if total_errors > 0:
            for error_type, count in snapshot.error_distribution.items():
                ratio = count / total_errors
                if ratio > 0.5 and count > 10:
                    alerts.append(
                        f"[ERROR_DOMINANCE] {error_type} accounts for {ratio:.0%} "
                        f"of {total_errors} DLQ errors ({count})"
                    )

        for alert in alerts:
            logger.warning("DLQ ALERT: %s", alert)

        return alerts

    def get_trend(
        self, queue_name: str, window_size: int = 10,
    ) -> dict[str, float] | None:
        """Compute a simple trend for DLQ depth over recent snapshots.

        Args:
            queue_name: The DLQ queue to analyze.
            window_size: Number of recent snapshots to include.

        Returns:
            Dict with 'average_depth', 'recent_depth', and 'direction' (increasing/decreasing/stable),
            or None if insufficient data.
        """
        if len(self._historical_snapshots) < 2:
            return None

        recent = self._historical_snapshots[-window_size:]
        depths = [sq.queues.get(queue_name, QueueMetrics()).depth for sq in recent]

        average_depth = sum(depths) / len(depths)
        recent_depth = depths[-1] if depths else 0
        direction = "stable"
        if len(depths) >= 2 and depths[-1] > depths[0] * 1.2:
            direction = "increasing"
        elif len(depths) >= 2 and depths[-1] < depths[0] * 0.8:
            direction = "decreasing"

        return {
            "queue": queue_name,
            "average_depth": round(average_depth, 1),
            "recent_depth": recent_depth,
            "direction": direction,
        }
```

---

### Pattern 6: DLQ Replay Workflow with Idempotency Safeguards

A safe replay mechanism that reads messages from the dead letter queue, validates them for recoverability, applies idempotency keys to prevent duplicates, and publishes back to the original source queue. Includes batch processing, retry limits on re-entry, and manual approval gates.

```python
from __future__ import annotations

import logging
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any


logger = logging.getLogger(__name__)


class ReplayDecision(Enum):
    """Decision made when evaluating a DLQ message for replay."""
    REPLAY = "replay"              # Safe to replay — publish to original queue
    SKIP_SCHEMA = "skip_schema"    # Message has invalid schema — requires manual fix
    SKIP_EXPIRED = "skip_expired"  # Message TTL has expired — safe to discard
    SKIP_DOWNSTREAM = "skip_downstream"  # Downstream still unavailable — defer replay


@dataclass
class ReplayResult:
    """Outcome of a replay operation for a single message."""
    message_id: str
    decision: ReplayDecision
    original_queue: str
    attempts_before_dlq: int
    replay_timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    error: str | None = None
    idempotency_key: str = ""


class DlqReplayWorkflow:
    """Safely replays dead letter queue messages back to their original source queues.

    The replay workflow enforces multiple safety checks before publishing a message:
      1. Schema validation — reject structurally invalid messages (skip, don't crash)
      2. TTL check — skip messages that have expired since first failure
      3. Downstream readiness — only replay if the downstream dependency is healthy
      4. Idempotency keys — ensure reprocessing doesn't create duplicate side effects
      5. Re-entry retry limits — prevent infinite replay loops

    Messages are processed in bounded batches to avoid overwhelming consumers.
    Each replay carries a unique idempotency key that includes the original message ID
    plus a replay timestamp, allowing downstream handlers to safely deduplicate.

    Usage:
        workflow = DlqReplayWorkflow(broker=broker, max_batch_size=50)
        results = await workflow.replay_from_dlq(
            source_queue="order.processing",
            approved=False,  # Manual approval gate
        )
        for result in results:
            print(f"{result.message_id}: {result.decision.value}")
    """

    def __init__(
        self,
        broker: MessageBroker,
        max_batch_size: int = 50,
        message_ttl_seconds: float = 86400.0,  # 24 hours
        max_replay_retries: int = 1,
    ) -> None:
        self._broker = broker
        self._max_batch_size = max_batch_size
        self._message_ttl = message_ttl_seconds
        self._max_replay_retries = max_replay_retries

    async def replay_from_dlq(
        self,
        source_queue: str,
        approved: bool = False,
    ) -> list[ReplayResult]:
        """Execute a replay batch from the DLQ of a specific source queue.

        Args:
            source_queue: The original queue whose DLQ messages to replay.
            approved: If True, bypass manual approval gate (use for automated replays).
                      If False, only replay messages marked as auto-eligible.

        Returns:
            List of ReplayResult with per-message decision and status.
        """
        dlq_name = f"{source_queue}.dlq"
        results: list[ReplayResult] = []

        # Read messages from DLQ in bounded batches
        while True:
            message = self._broker.consume(dlq_name, timeout_ms=1000)
            if message is None:
                break

            result = await self._process_replay_message(message, source_queue, approved)
            results.append(result)

            if len(results) >= self._max_batch_size:
                logger.info("Replay batch limit (%d) reached, pausing", self._max_batch_size)
                break

        return results

    async def _process_replay_message(
        self,
        message: dict[str, Any],
        source_queue: str,
        approved: bool,
    ) -> ReplayResult:
        """Evaluate a single DLQ message and either replay it or skip it.

        Checks applied in order:
          1. Approval gate (manual or automated)
          2. Schema validity
          3. TTL expiry
          4. Downstream health

        Args:
            message: The DLQ message record (contains _dlq_record and _original_payload).
            source_queue: Original queue name for routing back.
            approved: Whether manual approval was granted.

        Returns:
            ReplayResult with the decision and metadata.
        """
        dlq_record = message.get("_dlq_record", {})
        original_payload = message.get("_original_payload", {})
        message_id = dlq_record.get("original_message_id", str(uuid.uuid4()))

        # Check 1: Approval gate
        if not approved and not dlq_record.get("auto_eligible", False):
            return ReplayResult(
                message_id=message_id,
                decision=ReplayDecision.SKIP_SCHEMA,
                original_queue=source_queue,
                attempts_before_dlq=dlq_record.get("attempt_number", 0),
                error="Not auto-eligible — requires manual approval",
            )

        # Check 2: Schema validation
        if not self._validate_schema(original_payload):
            return ReplayResult(
                message_id=message_id,
                decision=ReplayDecision.SKIP_SCHEMA,
                original_queue=source_queue,
                attempts_before_dlq=dlq_record.get("attempt_number", 0),
                error="Schema validation failed — payload structurally invalid",
            )

        # Check 3: TTL expiry
        age_seconds = dlq_record.get("age_seconds", 0.0)
        if age_seconds > self._message_ttl:
            logger.info("Message %s expired (%.0fs old), skipping replay", message_id, age_seconds)
            return ReplayResult(
                message_id=message_id,
                decision=ReplayDecision.SKIP_EXPIRED,
                original_queue=source_queue,
                attempts_before_dlq=dlq_record.get("attempt_number", 0),
                error=f"Message expired: {age_seconds:.0f}s > {self._message_ttl:.0f}s TTL",
            )

        # Check 4: Downstream health (would check circuit breaker state in production)
        if not self._check_downstream_health(source_queue):
            return ReplayResult(
                message_id=message_id,
                decision=ReplayDecision.SKIP_DOWNSTREAM,
                original_queue=source_queue,
                attempts_before_dlq=dlq_record.get("attempt_number", 0),
                error="Downstream dependency unhealthy — deferring replay",
            )

        # All checks passed — publish to original queue with idempotency key
        idempotency_key = f"replay:{message_id}:{datetime.now(timezone.utc).isoformat()}"
        replay_headers = {
            **dlq_record.get("headers", {}),
            "x-replayed": "true",
            "x-original-id": message_id,
            "x-idempotency-key": idempotency_key,
            "x-replay-attempt": str(dlq_record.get("attempt_number", 0) + 1),
        }

        self._broker.publish(source_queue, original_payload, replay_headers)

        logger.info(
            "Replayed message %s to %s (idempotency key: %s)",
            message_id, source_queue, idempotency_key,
        )

        return ReplayResult(
            message_id=message_id,
            decision=ReplayDecision.REPLAY,
            original_queue=source_queue,
            attempts_before_dlq=dlq_record.get("attempt_number", 0),
            idempotency_key=idempotency_key,
        )

    def _validate_schema(self, payload: dict[str, Any]) -> bool:
        """Validate that a replay message has a valid schema.

        In production, this would use JSON Schema validation or a typed
        deserializer (pydantic, marshmallow). Here we do minimal structural checks.

        Args:
            payload: The original message payload to validate.

        Returns:
            True if the payload passes schema validation.
        """
        if not isinstance(payload, dict):
            return False

        # Check for required fields based on common event patterns
        required_fields = {"event_type", "timestamp_utc"}
        missing = required_fields - set(payload.keys())
        if missing:
            logger.debug("Schema validation failed: missing fields %s", missing)
            return False

        return True

    def _check_downstream_health(self, source_queue: str) -> bool:
        """Check if the downstream dependency for a queue is healthy.

        In production, this would query the circuit breaker state or call
        a health-check endpoint on the downstream service.

        Args:
            source_queue: The original queue name to check downstream health for.

        Returns:
            True if the downstream is healthy and can accept replayed messages.
        """
        # Simplified — in production, query circuit breaker state per handler
        return True  # Placeholder: replace with real health check


# ── BAD vs GOOD Comparison ─────────────────────────────────────────────

# ❌ BAD: No idempotency on replay — same message processed twice causes duplicate orders.
def bad_replay(broker, dlq_message):
    """Replays DLQ message without any safeguards."""
    payload = dlq_message["payload"]
    broker.publish(dlq_message["source_queue"], payload)
    # If the original delivery succeeded but ack was lost, this creates a duplicate

# ✅ GOOD: Idempotency key prevents duplicates; TTL check avoids stale replays;
#          downstream health check prevents hammering failing services.
async def good_replay(broker, dlq_message, approval_required=True):
    """Safely replay DLQ message with idempotency and health checks."""
    result = await DlqReplayWorkflow(broker).replay_from_dlq(dlq_message["source_queue"])
    if not result:
        return  # Nothing to replay
```

---

## Retry Strategy Comparison

Choose the retry strategy that matches your failure characteristics. Not all failures are equal — matching strategy to failure type reduces DLQ volume while keeping latency acceptable.

| Strategy | Best For | Delay Formula | Pros | Cons | Jitter Required? |
|----------|----------|---------------|------|------|-----------------|
| **Exponential Backoff + Full Jitter** | Transient network errors, downstream unavailability | `random(0, base * 2^(attempt-1))` | Prevents thundering herd, adapts to recovery time | Can delay recovery for long failures | **Yes — always** |
| **Linear Backoff** | Stable failure rates, predictable workloads | `base_delay + (attempt * step)` | Simple to understand and tune | Doesn't adapt to recovery pace | No (or minimal) |
| **Fixed-Rate Retry** | Fast-fail scenarios where quick response is critical | Constant delay (e.g., 500ms) | Predictable timing, low overhead | Wastes resources if service is down | Yes — spread retries across clients |
| **Circuit Breaker + No Retry** | Known fragile downstreams with long recovery times | N/A (rejects immediately when open) | Prevents cascade failures | May route too many messages to DLQ | Not applicable |
| **Progressive Backoff with Escalation** | Multi-tier failure classification | Different formulas per tier | Optimized for mixed failure types | More complex to implement and monitor | Yes |

### When to Retry vs. Send to DLQ Immediately

```
                    Message arrives at handler
                            │
                   ┌────────▼────────┐
                   │  Schema valid?   │──── No ──→ Route to DLQ immediately (SCHEMA category)
                   └────────┬────────┘
                            │ Yes
                   ┌────────▼────────┐
                   │ Business rule    │
                   │ violation?       │──── Yes → Route to DLQ immediately (BUSINESS category)
                   └────────┬────────┘
                            │ No
                   ┌────────▼────────┐
                   │ Transient failure│
                   │ (network, etc.)  │──── Yes → Retry with backoff + circuit breaker
                   └────────┬────────┘
                            │
                  Exhausted retries?
                   ┌────────▼────────┐
                   │   Retry limit    │──── Yes → Route to DLQ (TRANSIENT category)
                   │   reached?       │
                   └──────────────────┘
```

---

## Constraints

### MUST DO
- Always configure a dead letter queue for every processing queue — unhandled failures are production incidents, not edge cases
- Use exponential backoff with **full jitter** (not fixed delays) to prevent thundering herd on retry storms
- Include the circuit breaker check before every retry attempt — never let retries hammer an already-failing downstream service
- Assign every retried message a unique idempotency key that survives across retry attempts and replays
- Classify failures into categories (transient, schema, business, integration) at the point of failure for targeted DLQ routing
- Instrument DLQ depth per queue with alerting — a silent accumulation of dead letters is how outages begin
- Set explicit TTL on all messages including DLQ entries — never let stale messages accumulate indefinitely
- Process DLQ replays in bounded batches to prevent overwhelming consumers during recovery

### MUST NOT DO
- Retry forever without a circuit breaker — this is how cascade failures happen
- Route all failed messages to a single undifferentiated queue — diagnostic isolation requires per-queue DLQs or at least categorized sub-queues
- Replay DLQ messages without idempotency keys — duplicate processing causes data corruption and financial loss
- Use fixed (non-jittered) delays for retry backoff — simultaneous retries from many consumers cause renewed failures
- Disable poison pill detection to "give more chances" — a poison pill blocks the entire queue for every other message
- Store DLQ records only in memory — persistent tracking is required for replay and audit trails
- Replay expired messages (older than their original TTL) — they may represent business events that are no longer valid or actionable

---

## Output Template

When implementing or reviewing dead letter queue and retry patterns, produce:

1. **Queue Topology Diagram** — ASCII diagram showing source queues, DLQs, quarantine sub-queues, and routing paths for each failure category
2. **Retry Policy Configuration** — Table of handlers with their retry counts, backoff parameters, circuit breaker thresholds, and failure classifications
3. **DLQ Metrics Dashboard Spec** — List of metrics to track (depth per queue, error distribution, oldest message age) with alerting thresholds
4. **Replay Workflow Definition** — Step-by-step replay procedure including approval gates, idempotency key format, and downstream health checks
5. **Poison Pill Detection Rules** — Failure threshold parameters, time window configuration, and quarantine naming conventions

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `event-driven-patterns` | Covers pub/sub messaging, saga coordination, and outbox pattern for overall event-driven architecture |
| `event-sourcing-pattern` | Provides event store and projection layer — useful when DLQ messages need domain event replay at the CQRS level |
| `idempotent-distributed-operations` | Implements idempotency key patterns and deduplication stores needed to safely retry DLQ-recovered messages |

---

## Live References

> Authoritative documentation links for dead letter queue and retry pattern implementations.

- [AWS SQS Dead Letter Queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloper/sqs-dead-letter-queues.html)
- [RabbitMQ DLX (Dead Letter Exchange)](https://www.rabbitmq.com/dlx.html)
- [Kafka Dead Letter Queue Pattern](https://www.confluent.io/blog/kafka-dead-letter-queue-pattern/)
- [Resilient Web Design: Retry Patterns](https://resilientwebdesign.com/chapter/retry_patterns/)
- [Circuit Breaker Pattern (Martin Fowler)](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Exponential Backoff And Jitter (AWS Best Practices)](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
- [Microsoft Resilient Systems: Retry Guidance](https://learn.microsoft.com/en-us/azure/architecture/patterns/retry)

> 📖 skill(local cache): event-driven-patterns, event-sourcing-pattern, idempotent-distributed-operations | 📖 skill(remotely sourced): microservice-resilience-patterns, message-queue-design