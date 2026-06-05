---




name: event-sourcing
description: Persists application state as an append-only immutable event log, enabling
  full state reconstruction, audit trails, temporal queries, and snapshot-based performance
  optimization for complex domain models.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: event sourcing, event store, aggregate, snapshots, optimistic concurrency, event versioning, projections, read models event versioning
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
  content-types:
  - code
  - guidance
  - config
  - do-dont
  related-skills: cqrs-pattern, saga-pattern, idempotency-patterns




---





# Event Sourcing

Persists state as an append-only immutable event log, enabling full historical reconstruction, audit trails, and temporal queries. Uses snapshots for performance optimization, optimistic concurrency control via version columns, and projections to materialize read models from event streams.

## TL;DR Checklist

- [ ] Define all state changes as immutable domain events with UUIDv7 IDs
- [ ] Use PostgreSQL JSONB-backed event store with time-based partitioning
- [ ] Implement optimistic concurrency using aggregate version columns + advisory locks
- [ ] Create snapshots every ~20 events or 24 hours (hybrid strategy) to avoid replaying millions of events
- [ ] Build projections as incremental checkpoint-based consumers from the event stream
- [ ] Version all events with additive-only migration rules — never modify existing events
- [ ] Set up monitoring for projection lag and conflict rate metrics

## When to Use

Use this skill when:

- You need a complete audit trail of all state changes (financial systems, compliance)
- The domain model has complex business logic with many possible state transitions
- Temporal queries are needed ("what was the order status at time T?")
- Read/write data access patterns differ significantly (pairs naturally with CQRS)
- Multiple downstream systems need to react to state changes

## When NOT to Use

Avoid this skill for:

- Simple CRUD applications with fewer than 5 entity types and simple state machines
- Systems with no audit trail or regulatory requirement for event history
- Teams without distributed systems experience (adds significant complexity)
- High-write, high-read systems where replay latency is unacceptable (use snapshots aggressively)

## Core Workflow

1. **Design Domain Events** — For every meaningful state change, create a frozen dataclass event with UUIDv7 ID, aggregate type/id, event type string, version number (for schema evolution), and timestamp. Group related changes into single events rather than creating one event per field.
   **Checkpoint:** Each event must be immutable (use `frozen=True` in dataclass), serializable to JSONB, and include a clear business meaning (not an implementation detail).

2. **Implement the Event Store** — Create a PostgreSQL-backed event store using JSONB columns for payloads, time-range partitioning by `occurred_at`, and optimistic concurrency via aggregate version checks with advisory transaction locks (`pg_advisory_xact_lock`).
   **Checkpoint:** The append operation must check `expected_version == current_version` before writing and raise `ConflictError` on mismatch. Use partial indexes on `published_at IS NULL` for outbox queries.

3. **Build the Aggregate Root** — Create aggregate classes that hold domain state, accept commands, validate invariants, record new events (without immediately persisting), and provide an `apply_event(event)` method to replay events during reconstruction.
   **Checkpoint:** The aggregate must never write directly to the event store — it only records events for the UnitOfWork to commit.

4. **Configure Snapshot Strategy** — Implement a hybrid snapshot strategy: snapshot when either (a) event count since last snapshot exceeds 20, or (b) 24 hours have passed since the last snapshot. Store snapshots in a dedicated `aggregate_snapshots` table with version tracking.
   **Checkpoint:** Loading an aggregate must first load the latest snapshot, then replay only delta events from the snapshot version onward.

5. **Build Projections** — Implement event handlers that consume streams of domain events and materialize read models into optimized stores (denormalized tables, search indexes, caches). Use checkpoint persistence to resume from the last processed position after restarts.
   **Checkpoint:** Every projection handler must be idempotent — re-processing the same event must produce the same result without side effects.

6. **Handle Event Versioning** — When event schemas change, create new `_v2`, `_v3` variants rather than modifying existing events. Implement a deserialization router that maps event_type strings to the appropriate handler. Plan for additive-only changes and projection rebuilds during migrations.
   **Checkpoint:** All projections must handle both old and new event versions gracefully during migration windows.

## Implementation Patterns

### Pattern 1: Domain Event Definition and Aggregate Root

```python
from dataclasses import dataclass, field
from typing import Generic, TypeVar, List, Any, Callable
from uuid import UUID, uuid7
from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum


T = TypeVar("T")


@dataclass(frozen=True)
class DomainEvent:
    """Base class for all domain events — immutable and serializable.

    Every event carries metadata (UUIDv7 ID, aggregate identity, timestamp)
    alongside its specific payload. Events are frozen dataclasses so they
    cannot be mutated after creation, preserving historical integrity.
    """
    event_id: UUID = field(default_factory=uuid7.uuid7)
    aggregate_type: str = ""
    aggregate_id: UUID = field(default_factory=uuid7.uuid7)
    event_type: str = ""
    version: int = 1  # Event schema version (not aggregate version)
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict[str, Any]:
        """Serialize event to dictionary for JSONB storage."""
        return {
            "event_id": str(self.event_id),
            "aggregate_type": self.aggregate_type,
            "aggregate_id": str(self.aggregate_id),
            "event_type": self.event_type,
            "version": self.version,
            "occurred_at": self.occurred_at.isoformat(),
        }


```

### Pattern 2: Event Store with PostgreSQL JSONB Backend

```python
from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal
from typing import AsyncIterator, Optional
from uuid import UUID

import asyncpg


class ConflictError(Exception):
    """Raised when optimistic concurrency check fails."""
    def __init__(self, stream_id: UUID, expected_version: int, current_version: int):
        super().__init__(
            f"Concurrency conflict on stream {stream_id}: "
            f"expected version {expected_version}, current version {current_version}"
        )
        self.stream_id = stream_id


class EventStore:
    """PostgreSQL-backed event store with JSONB payload storage."""

    CREATE_TABLE_SQL = """
        CREATE TABLE IF NOT EXISTS domain_events (
            id              BIGSERIAL PRIMARY KEY,
            stream_id       UUID NOT NULL,
            aggregate_id    UUID NOT NULL,
            aggregate_type  TEXT NOT NULL,
            event_type      TEXT NOT NULL,
            version         INTEGER NOT NULL,
            data            JSONB NOT NULL DEFAULT '{}',
            occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            published_at    TIMESTAMPTZ,
            CONSTRAINT uq_stream_version UNIQUE (stream_id, version)
        );
    """

    def __init__(self, dsn: str):
        self._dsn = dsn
        self._pool = None

    async def initialize(self) -> None:
        pool = await asyncpg.create_pool(dsn=self._dsn, min_size=2, max_size=10)
        async with pool.acquire() as conn:
            await conn.execute(self.CREATE_TABLE_SQL)
            await conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_events_published_at "
                "ON domain_events (published_at) WHERE published_at IS NULL"
            )
        self._pool = pool

    async def append_events(
        self,
        stream_id: UUID,
        aggregate_id: UUID,
        events: list[dict],
        expected_version: int,
    ) -> int:
        """Append events with optimistic concurrency control."""
        if not events:
            return expected_version

        async with self._pool.acquire() as conn:
            await conn.execute("SELECT pg_advisory_xact_lock(hashtext($1))", str(aggregate_id))

            row = await conn.fetchrow(
                "SELECT COALESCE(MAX(version), 0) AS cv FROM domain_events WHERE stream_id = $1",
                stream_id,
            )
            current_version = int(row["cv"])

            if current_version != expected_version:
                raise ConflictError(stream_id, expected_version, current_version)

            base_version = expected_version + 1
            values = [
                (stream_id, aggregate_id, e["event_type"], base_version + i, e.get("data", {}))
                for i, e in enumerate(events)
            ]
            await conn.executemany(
                "INSERT INTO domain_events (stream_id, aggregate_id, event_type, version, data) "
                "VALUES ($1, $2, $3, $4, $5)", values,
            )
            return base_version + len(events) - 1

    async def load_events(self, stream_id: UUID, from_version: int = 0) -> list[dict]:
        """Load events from a stream starting at a given version."""
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT event_type, version, data FROM domain_events "
                "WHERE stream_id = $1 AND version > $2 ORDER BY version ASC",
                stream_id, from_version,
            )
            return [
                {"event_type": r["event_type"], "version": int(r["version"]), "data": r["data"]}
                for r in rows
            ]

    async def close(self) -> None:
        if self._pool:
            await self._pool.close()


# Usage example:
# store = EventStore("postgresql://localhost/events")
# await store.initialize()
# new_version = await store.append_events(
#     stream_id=aggregate_id,
#     aggregate_id=aggregate_id,
#     events=[{"event_type": "order_created", "data": {"amount": 100}}],
#     expected_version=0,
# )
```

## Constraints

### MUST DO
- Encapsulate behavior within the pattern object — it should be self-contained with clear public interfaces
- Use composition over inheritance when extending or combining patterns to reduce coupling and increase reusability
- Document the intent of each pattern with a one-line docstring describing what problem it solves and when to use it
- Implement tests that verify both correct behavior under normal conditions and graceful degradation under edge cases

### MUST NOT DO
- Do not force a pattern where it adds complexity without benefit — start simple and refactor to patterns as needs emerge
- Avoid deep inheritance chains (>3 levels) when using design patterns — prefer composition or interfaces
- Never implement a Singleton as a global mutable singleton in multi-threaded environments without proper synchronization
- Do not apply the Command pattern to simple function calls with no undo/redo requirement — it adds unnecessary indirection


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Event Sourcing Pattern (Microsoft Azure Architecture Center)](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing)
- [Event Sourcing — Martin Fowler Bliki](https://martinfowler.com/eaaDev/EventSourcing.html)
- [Event Store Platform Documentation](https://eventstore.com/docs/)
- [Axon Framework Event Sourcing Guide](https://docs.axoniq.io/reference-guide/extensions/event-sourcing)
- [Building an Event-Sourced System (Event-Driven.io)](https://event-driven.io/en/event_sourcing_pattern/) 