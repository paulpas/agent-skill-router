---
name: distributed-systems-architecture
description: Implements distributed systems patterns (consensus algorithms, consistency models, replication strategies, partitioning, clock synchronization, saga orchestration) for building correct and resilient multi-node systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: distributed systems, consensus algorithm, CAP theorem, eventual consistency, data replication, partitioning strategy, Raft, Paxos, vector clocks, service discovery, two-phase commit, distributed transactions, clock synchronization, consistent hashing
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: microservices-architecture, event-driven-patterns, domain-driven-design, software-architecture
---

# Distributed Systems Architecture

Implements distributed systems patterns including consensus algorithms, consistency models, data replication strategies, partitioning schemes, clock synchronization mechanisms, and distributed transaction orchestrations to build correct and resilient multi-node architectures.

## TL;DR Checklist

- [ ] Define the CAP tradeoff for each service before choosing a consistency model
- [ ] Use consistent hashing with virtual nodes for any sharding or partitioning scheme
- [ ] Implement vector clocks (not physical clocks) for causal event ordering across nodes
- [ ] Replace 2PC with Saga orchestration for cross-service transactions in production microservices
- [ ] Treat every network call as unreliable — add timeouts, retries with exponential backoff, and circuit breakers
- [ ] Assign unique idempotency keys to all mutable operations (commands, message delivery, HTTP requests)
- [ ] Design the outbox pattern for reliable event publication from database transactions
- [ ] Implement service discovery with heartbeats, health checks, and automatic stale-node removal
- [ ] Document consistency guarantees per service in architecture decision records

---

## When to Use

Use this skill when:

- Designing a new multi-service or multi-node system where nodes communicate over a network
- Choosing between consistency models (strong, eventual, causal) for data storage layers
- Implementing leader election or consensus among cluster members (e.g., config management, distributed locks)
- Building a sharded database or partitioned key-value store that must handle node churn gracefully
- Synchronizing events across services and needing causal ordering guarantees without physical clock trust
- Coordinating transactions that span multiple services or databases where ACID is unavailable
- Implementing service discovery, health checking, or dynamic cluster membership management

---

## When NOT to Use

Avoid this skill for:

- Single-node applications with no distributed coordination needs — use standard concurrency patterns instead
- Read-heavy caches that only need TTL-based expiration — Redis or Memcached handles this without complex consensus
- Simple request-response APIs with a single database backend — microservices overhead outweighs benefit
- Real-time systems requiring sub-millisecond deterministic latency — use in-memory locks on a single process

---

## Core Workflow

1. **Map the Failure Model** — Document which failures your system must tolerate: node crashes, network partitions (CAP), clock drift, message duplication/reordering. Write each failure scenario as an explicit assumption. **Checkpoint:** Every inter-service boundary has at least one documented failure mode and a corresponding mitigation pattern.

2. **Choose Consistency per Service** — For each data store or service boundary, select the consistency model: strong (linearizable), causal, or eventual. Base this on whether the operation needs to prevent double-spending (strong) versus whether stale reads are tolerable (eventual). **Checkpoint:** Each service has a documented consistency guarantee in its API contract.

3. **Design Partitioning Strategy** — For any horizontally scaled data store, implement consistent hashing with virtual nodes (at least 150–300 vnodes per physical node) using CRC32 or MurmurHash3. Compute hash ring positions, then verify that adding/removing a node redistributes fewer than `total_keys / num_nodes` keys on average. **Checkpoint:** The rebalance ratio stays below 1/num_nodes when a single node is added or removed.

4. **Implement Causal Ordering** — Where events from multiple nodes must be ordered causally (not necessarily globally), implement vector clocks with per-node monotonic counters. Provide `happens_before()`, `concurrent_with()`, and `merge()` operations. For global ordering requirements, use a timestamp-based total order service. **Checkpoint:** Every event carries its vector clock; downstream consumers can detect and resolve concurrent updates.

5. **Select Transaction Coordination** — For cross-service transactions, prefer the Saga pattern (choreography or orchestration) over 2PC. Implement compensating actions for each step that roll back the logical effect. Reserve 2PC only for single-database distributed transaction scenarios where you control all participating resources. **Checkpoint:** Each saga step has an idempotent execute and a compensating rollback; the orchestrator handles timeouts and retries with exponential backoff.

6. **Build Reliability Primitives** — For each inter-service communication path, implement: (a) request-level timeouts (connect ≤ 1s, read ≤ 3s), (b) circuit breaker with half-open state after recovery probe, (c) retry with jittered exponential backoff (base delay 100ms, max 5 retries, max delay 30s). Apply the outbox pattern for event publication. **Checkpoint:** No single service can hang the entire cluster through synchronous blocking on a downstream call.

---

## When NOT to Use (Anti-Patterns)

- **Using distributed consensus for a single-node deployment** — Raft/Paxos add 2–3x latency and operational complexity for zero fault tolerance.
- **Relying on NTP-correct clocks for ordering critical events** — Clock drift of ±500ms is common even with NTP; use vector clocks instead.
- **Implementing "eventually consistent" without reconciliation** — Without explicit conflict resolution or backfill, divergence accumulates silently until data corruption is detected in production.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Consistent Hashing with Virtual Nodes

Consistent hashing maps both keys and nodes onto a circular hash ring. When a node joins or leaves, only keys near that node's position need to move — minimizing data redistribution. Virtual nodes (multiple ring positions per physical node) ensure even key distribution regardless of hash collisions between node identifiers.

This is the foundation of sharding in Dynamo-style systems, Cassandra, and consistent load balancers.

```python
"""Consistent Hashing Ring with Virtual Nodes for distributed partitioning."""

from __future__ import annotations

import hashlib
import bisect
from typing import Iterable

MODULAR_HASH_SPACE = 2**32


def _crc32_hash(key: str) -> int:
    """Compute CRC32-style hash of a string, returning unsigned 32-bit integer."""
    return int(hashlib.crc32(key.encode("utf-8")) & 0xFFFFFFFF)


class ConsistentHashRing:
    """Consistent hashing ring with virtual node distribution.

    Each physical node is placed at `virtual_nodes` evenly-spaced positions
    around the hash ring to ensure uniform key distribution.

    Args:
        virtual_nodes: Number of virtual nodes per physical node (default 150).
                       Higher values produce more uniform distribution but use more memory.
        hasher: Optional custom hash function taking a string and returning int.
                Defaults to CRC32 over the modular hash space.
    """

    def __init__(
        self,
        virtual_nodes: int = 150,
        hasher: callable | None = None,
    ) -> None:
        if virtual_nodes < 1:
            raise ValueError("virtual_nodes must be >= 1")
        self._virtual_nodes = virtual_nodes
        self._hasher = hasher or (_crc32_hash)
        self._ring: list[int] = []          # sorted hash positions
        self._node_map: dict[int, str] = {} # position -> node_id
        self._nodes: set[str] = set()       # physical node IDs

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def add_node(self, node_id: str) -> None:
        """Add a physical node to the ring, distributing it across virtual nodes."""
        if node_id in self._nodes:
            raise KeyError(f"Node {node_id!r} is already present in the ring")
        self._nodes.add(node_id)
        for i in range(self._virtual_nodes):
            vnode_key = f"{node_id}:vnode_{i}"
            pos = self._hasher(vnode_key) % MODULAR_HASH_SPACE
            bisect.insort(self._ring, pos)
            self._node_map[pos] = node_id

    def remove_node(self, node_id: str) -> None:
        """Remove a physical node from the ring and all its virtual nodes."""
        if node_id not in self._nodes:
            raise KeyError(f"Node {node_id!r} is not in the ring")
        # Rebuild the ring without this node (simplest correct approach).
        # For production systems with frequent churn, maintain a reverse index.
        old_ring = list(self._ring)
        old_map = dict(self._node_map)
        self._ring.clear()
        self._node_map.clear()
        for pos in old_ring:
            if old_map[pos] != node_id:
                bisect.insort(self._ring, pos)
                self._node_map[pos] = old_map[pos]
        self._nodes.discard(node_id)

    def get_node(self, key: str) -> str | None:
        """Find the responsible node for a given key (clockwise from key's hash)."""
        if not self._ring:
            return None
        pos = self._hasher(key) % MODULAR_HASH_SPACE
        idx = bisect.bisect_right(self._ring, pos)
        # Wrap around the ring (modulo for circularity)
        if idx >= len(self._ring):
            idx = 0
        return self._node_map[self._ring[idx]]

    def get_nodes(self, key: str, replicas: int = 3) -> list[str]:
        """Return the first `replicas` distinct nodes responsible for a key."""
        if not self._ring:
            return []
        assigned: list[str] = []
        seen: set[str] = set()
        pos = self._hasher(key) % MODULAR_HASH_SPACE
        idx = bisect.bisect_right(self._ring, pos)
        while len(assigned) < replicas and len(seen) < len(self._nodes):
            actual_idx = idx % len(self._ring)
            node = self._node_map[self._ring[actual_idx]]
            if node not in seen:
                assigned.append(node)
                seen.add(node)
            idx += 1
        return assigned

    def get_distribution_stats(self) -> dict[str, int]:
        """Return key counts per node (for verification of uniformity)."""
        stats: dict[str, int] = {n: 0 for n in self._nodes}
        if not self._ring:
            return stats
        # Distribute a large sample of keys and count assignments
        num_samples = 10_000
        for i in range(num_samples):
            node = self.get_node(f"key_{i}")
            if node is not None:
                stats[node] += 1
        return stats

    @property
    def node_count(self) -> int:
        return len(self._nodes)

    @property
    def vnode_count(self) -> int:
        return len(self._ring)
```

**Verification — Uniform Distribution Check:**

```python
def verify_distribution_uniformity(ring: ConsistentHashRing, tolerance_pct: float = 5.0) -> bool:
    """Assert that keys are distributed within `tolerance_pct` of perfect uniformity."""
    stats = ring.get_distribution_stats()
    if not stats:
        return True
    counts = list(stats.values())
    ideal = sum(counts) / len(counts)
    for node, count in stats.items():
        deviation = abs(count - ideal) / ideal * 100
        if deviation > tolerance_pct:
            raise AssertionError(
                f"Node {node}: distribution deviation {deviation:.1f}% exceeds "
                f"tolerance {tolerance_pct}%"
            )
    return True
```

---

### Pattern 2: Vector Clocks for Causal Ordering

Physical clocks drift and cannot reliably establish causal order across distributed nodes. Vector clocks provide a logical timestamp scheme where each node maintains a counter for every other node it has communicated with. The happens-before relationship (`VC_a < VC_b`) can be computed by comparing component-wise maximums.

```python
"""Vector Clocks for causal ordering of events in distributed systems."""

from __future__ import annotations

import copy
from typing import Protocol


class NodeId:
    """Opaque identifier for a node in the distributed system."""
    def __init__(self, value: str) -> None:
        self._value = value

    @property
    def value(self) -> str:
        return self._value

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, NodeId):
            return NotImplemented
        return self._value == other._value

    def __hash__(self) -> int:
        return hash(self._value)

    def __repr__(self) -> str:
        return f"NodeId({self._value!r})"


class VectorClock:
    """Causal clock maintaining per-node logical timestamps.

    Each component tracks the last known event count from that node.
    Supports happens-before, concurrency detection, and merge operations.

    Args:
        clocks: Dict mapping NodeId to integer counter values.
                If None, starts with all-zero counters for every observed node.
    """

    __slots__ = ("_clocks",)

    def __init__(self, clocks: dict[NodeId, int] | None = None) -> None:
        self._clocks: dict[NodeId, int] = dict(clocks) if clocks else {}

    # ---------------------------------------------------------------
    # Mutation
    # ---------------------------------------------------------------

    def increment(self, node_id: NodeId) -> None:
        """Advance this node's own clock component by one.

        Must be called before processing any local event at the given node.
        """
        self._clocks[node_id] = self._clocks.get(node_id, 0) + 1

    def merge(self, other: "VectorClock") -> None:
        """Merge with another vector clock by taking component-wise maximum.

        Used when a node receives a message carrying the sender's vector clock.
        After merging, this node has learned about all events known to the other.
        """
        for nid, ts in other._clocks.items():
            self._clocks[nid] = max(self._clocks.get(nid, 0), ts)

    # ---------------------------------------------------------------
    # Comparison operators (causal ordering)
    # ---------------------------------------------------------------

    def happens_before(self, other: "VectorClock") -> bool:
        """Return True if this clock is causally before `other`.

        Definition: VC_a < VC_b iff all components of a <= b AND at least one
        component of a < b. In other words, 'other' has learned about strictly
        more events than 'this'.
        """
        all_keys = set(self._clocks.keys()) | set(other._clocks.keys())
        at_least_one_less = False
        for k in all_keys:
            a_val = self._clocks.get(k, 0)
            b_val = other._clocks.get(k, 0)
            if a_val > b_val:
                return False
            if a_val < b_val:
                at_least_one_less = True
        return at_least_one_less

    def is_concurrent(self, other: "VectorClock") -> bool:
        """Return True if this clock and `other` are causally independent.

        Two events are concurrent when neither happens-before the other —
        meaning they occurred on different branches of execution that haven't
        yet been merged. Concurrent events require explicit conflict resolution.
        """
        return not self.happens_before(other) and not other.happens_before(self) \
            and self._clocks != other._clocks

    def is_equal(self, other: "VectorClock") -> bool:
        """Return True if both clocks represent the same causal state."""
        all_keys = set(self._clocks.keys()) | set(other._clocks.keys())
        return all(
            self._clocks.get(k, 0) == other._clocks.get(k, 0)
            for k in all_keys
        )

    # ---------------------------------------------------------------
    # Inspectors
    # ---------------------------------------------------------------

    def total_order(self) -> int:
        """Sum of all components — useful for approximate global ordering.

        WARNING: Total order is NOT a substitute for happens-before comparison.
        Two events can have the same total but be concurrent, or different totals
        with no causal relationship. Use only for tie-breaking in display/logic,
        never for correctness-critical ordering.
        """
        return sum(self._clocks.values())

    def copy(self) -> "VectorClock":
        """Return a deep copy of this vector clock."""
        return VectorClock(copies=self._clocks.copy())

    def __repr__(self) -> str:
        parts = ", ".join(f"{n.value}:{v}" for n, v in sorted(
            self._clocks.items(), key=lambda x: x[0].value
        ))
        return f"VC({parts})"

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, VectorClock):
            return NotImplemented
        return self.is_equal(other)
```

**Usage — Handling Concurrent Updates (Conflict Resolution):**

```python
def resolve_concurrent_conflicts(
    local_vc: VectorClock,
    remote_vc: VectorClock,
    local_value: str,
    remote_value: str,
    conflict_resolver: callable | None = None,
) -> tuple[str, VectorClock]:
    """Resolve a write-write conflict caused by concurrent updates.

    Args:
        local_vc: Vector clock of the local node's latest state.
        remote_vc: Vector clock from the peer node.
        local_value: The value held at the local node.
        remote_value: The value received from the peer.
        conflict_resolver: Optional callable(local_value, remote_value) -> str.
                          If None, use last-writer-wins based on NodeId.

    Returns:
        Tuple of (resolved_value, merged_vector_clock).
    """
    merged_vc = local_vc.copy()
    merged_vc.merge(remote_vc)

    if not local_vc.is_concurrent(remote_vc):
        # No conflict — causal order is clear; pick the one that happened after.
        if remote_vc.happens_before(local_vc):
            return local_value, merged_vc
        else:
            return remote_value, merged_vc

    # True concurrent update — need explicit resolution strategy.
    if conflict_resolver is not None:
        resolved = conflict_resolver(local_value, remote_value)
    else:
        # Default: last-writer-wins by lexicographic NodeId comparison
        # (In production, use a Lamport-style tie-breaker with unique IDs.)
        resolved = max(local_value, remote_value)

    return resolved, merged_vc
```

---

### Pattern 3: Outbox Pattern for Reliable Message Delivery

The outbox pattern guarantees that every business transaction is accompanied by a message publication event. By storing both the database mutation and the corresponding event in the same ACID transaction, you ensure zero message loss even if the publisher crashes after the DB commit but before sending the message. A separate publisher process polls the outbox table and delivers events, retrying on failure.

```python
"""Transactional Outbox Pattern for reliable event publication."""

from __future__ import annotations

import uuid
import time
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any
from enum import Enum

logger = logging.getLogger(__name__)


class EnvelopeStatus(str, Enum):
    PENDING = "pending"
    DELIVERED = "delivered"
    FAILED = "failed"


@dataclass(frozen=True)
class OutboxEvent:
    """Immutable record of an event to be published from the outbox table.

    Attributes:
        id: Unique event ID for deduplication on the consumer side.
        aggregate_type: Domain entity type that triggered the event (e.g., 'order').
        aggregate_id: Primary key of the affected domain entity.
        event_type: Semantic event name (e.g., 'OrderCreated', 'PaymentCompleted').
        payload: JSON-serializable event data.
        created_at: Timestamp when the event was committed to the outbox.
        status: Current delivery status.
        version: Monotonic sequence number for ordering within the same aggregate.
    """
    id: str
    aggregate_type: str
    aggregate_id: str
    event_type: str
    payload: dict[str, Any]
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    status: EnvelopeStatus = EnvelopeStatus.PENDING
    version: int = 0


class TransactionalOutbox:
    """Manages the outbox table — events are committed within DB transactions.

    This class simulates a database-backed outbox. In production, replace the
    in-memory storage with actual SQL (INSERT into outbox_events table) or
    an ORM call within the same explicit transaction as your business data mutation.

    The key invariant: every business-state commit has its corresponding outbox
    row committed atomically. The publisher reads PENDING rows independently.
    """

    def __init__(self) -> None:
        self._events: dict[str, OutboxEvent] = {}

    # ---------------------------------------------------------------
    # Core: Commit with business transaction (atomic with business data)
    # ---------------------------------------------------------------

    def commit_event(
        self,
        aggregate_type: str,
        aggregate_id: str,
        event_type: str,
        payload: dict[str, Any],
        version: int = 0,
    ) -> OutboxEvent:
        """Atomically store an event in the outbox alongside a business transaction.

        In production, this runs inside the same DB transaction as your UPDATE/INSERT
        on the business table. The publisher then reads these rows separately.

        Args:
            aggregate_type: Domain entity type (e.g., 'order', 'invoice').
            aggregate_id: ID of the affected entity.
            event_type: Semantic event name for routing/consumption.
            payload: JSON-serializable event body.
            version: Per-aggregate sequence number to enforce ordering.

        Returns:
            The committed OutboxEvent with its unique ID and status.
        """
        event_id = str(uuid.uuid4())
        event = OutboxEvent(
            id=event_id,
            aggregate_type=aggregate_type,
            aggregate_id=aggregate_id,
            event_type=event_type,
            payload=payload,
            version=version,
        )
        self._events[event_id] = event
        return event

    # ---------------------------------------------------------------
    # Publisher: Read and deliver pending events
    # ---------------------------------------------------------------

    def fetch_pending(self, batch_size: int = 50) -> list[OutboxEvent]:
        """Retrieve up to `batch_size` PENDING events for publication."""
        pending = [
            e for e in self._events.values()
            if e.status == EnvelopeStatus.PENDING
        ]
        # Sort by creation time, then by version within same aggregate
        pending.sort(key=lambda e: (e.aggregate_type, e.aggregate_id, e.created_at))
        return pending[:batch_size]

    def mark_delivered(self, event_id: str) -> None:
        """Mark an event as successfully delivered to its consumers."""
        if event_id not in self._events:
            raise KeyError(f"Event {event_id!r} not found in outbox")
        self._events[event_id].status = EnvelopeStatus.DELIVERED

    def mark_failed(self, event_id: str) -> None:
        """Mark an event as failed (will be retried on next fetch)."""
        if event_id not in self._events:
            raise KeyError(f"Event {event_id!r} not found in outbox")
        self._events[event_id].status = EnvelopeStatus.FAILED

    # ---------------------------------------------------------------
    # Cleanup (archived delivered events)
    # ---------------------------------------------------------------

    def purge_delivered(self, older_than: datetime) -> int:
        """Remove delivered events older than `older_than` to reclaim storage.

        Returns the number of events purged. Run periodically (e.g., nightly).
        Do NOT purge before consumers have had time to process and acknowledge.
        """
        before = len([e for e in self._events.values() if e.status == EnvelopeStatus.DELIVERED])
        to_delete = [
            eid for eid, e in self._events.items()
            if e.status == EnvelopeStatus.DELIVERED and e.created_at < older_than
        ]
        for eid in to_delete:
            del self._events[eid]
        after = len([e for e in self._events.values() if e.status == EnvelopeStatus.DELIVERED])
        return before - after
```

---

### Pattern 4: Leader Election (Raft Conceptual Implementation)

Leader election provides a single point of decision for log ordering. In Raft, nodes cycle through FOLLOWER, CANDIDATE, and LEADER states. A candidate requests votes from peers; if it receives a majority (N/2 + 1), it becomes leader and begins sending heartbeat messages to maintain authority.

```python
"""Conceptual Leader Election — Raft-style with majority quorum."""

from __future__ import annotations

import enum
import time
import threading
from dataclasses import dataclass, field
from typing import Optional


class NodeState(str, enum.Enum):
    FOLLOWER = "follower"
    CANDIDATE = "candidate"
    LEADER = "leader"


@dataclass
class ElectionTerm:
    """Raft term (monotonically increasing election round)."""
    number: int
    leader_id: Optional[str] = None

    def __post_init__(self) -> None:
        if self.number < 0:
            raise ValueError("term number must be non-negative")


class Node:
    """Represents a Raft-style node in the cluster.

    In production, each Node instance runs on a separate machine/process.
    This example simulates message passing in-memory for demonstration.

    Args:
        node_id: Unique identifier for this node.
        peer_ids: IDs of all other nodes in the cluster (including self).
    """

    def __init__(self, node_id: str, peer_ids: list[str]) -> None:
        self._node_id = node_id
        self._peer_ids = [pid for pid in peer_ids if pid != node_id]
        self._state = NodeState.FOLLOWER
        self._term = ElectionTerm(number=0)
        self._voted_for: Optional[str] = None
        self._last_heartbeat = time.time()
        self._election_timeout_ms = 150 + hash(node_id) % 150  # randomized timeout
        self._lock = threading.Lock()

    @property
    def node_id(self) -> str:
        return self._node_id

    @property
    def state(self) -> NodeState:
        return self._state

    @property
    def term(self) -> ElectionTerm:
        return self._term

    def start_election(self, cluster_nodes: list["Node"]) -> bool:
        """Begin leader election: increment term, transition to CANDIDATE, vote for self.

        Args:
            cluster_nodes: All nodes in the cluster (for message simulation).

        Returns:
            True if this node won the election and became LEADER.
        """
        with self._lock:
            old_term = self._term.number
            self._term = ElectionTerm(number=old_term + 1, leader_id=None)
            self._state = NodeState.CANDIDATE
            self._voted_for = self._node_id

        votes_received = 1  # vote for self
        total_nodes = len(cluster_nodes)
        majority = (total_nodes // 2) + 1

        for peer in cluster_nodes:
            if peer.node_id == self._node_id:
                continue
            result = peer.receive_vote_request(self._term)
            if result:
                votes_received += 1

        if votes_received >= majority:
            with self._lock:
                self._state = NodeState.LEADER
                self._term.leader_id = self._node_id
            return True
        else:
            with self._lock:
                self._state = NodeState.FOLLOWER
            return False

    def receive_vote_request(self, incoming_term: ElectionTerm) -> bool:
        """Handle a vote request from a CANDIDATE.

        Votes are granted if the candidate's term is >= current term AND
        this node hasn't voted for another candidate in this term.
        """
        with self._lock:
            if incoming_term.number > self._term.number:
                self._term = ElectionTerm(number=incoming_term.number, leader_id=None)
                self._state = NodeState.FOLLOWER
                self._voted_for = None

            if incoming_term.number >= self._term.number and (
                self._voted_for is None or self._voted_for == self._node_id
            ):
                # For simplicity, grant vote if term is higher and not already voted.
                # In production Raft, also check log up-to-date-ness.
                if self._voted_for is None:
                    self._voted_for = self._node_id  # Would be candidate's ID in real impl
                    return True
            return False

    def receive_heartbeat(self) -> bool:
        """Receive a heartbeat from the current LEADER.

        Resets election timer and validates term consistency.
        """
        with self._lock:
            now = time.time()
            if now - self._last_heartbeat > self._election_timeout_ms / 1000:
                # Timer expired — should start new election in a background goroutine.
                return False
            self._last_heartbeat = now
            return True

    def get_current_leader(self) -> Optional[str]:
        """Return the current known leader ID, or None if no leader exists."""
        with self._lock:
            if self._state == NodeState.LEADER:
                return self._node_id
            if self._term.leader_id:
                return self._term.leader_id
            return None


def elect_leader(cluster: list[Node]) -> str | None:
    """Run leader election across a simulated cluster.

    Tries each node as candidate in order; the first to win becomes LEADER.
    Returns the winning leader's ID or None if no leader could be elected.
    """
    for node in cluster:
        if node.start_election(cluster):
            return node.node_id
    return None
```

---

### Pattern 5: Saga Orchestration with Compensation

The Saga pattern breaks a distributed transaction into a sequence of local transactions, each with a compensating action that reverses its effect. An orchestrator coordinates the saga steps and executes compensations when a step fails. This avoids the synchronous blocking nature of 2PC while still providing ACID-like guarantees at the business level.

```python
"""Saga Orchestration — multi-step distributed transaction with compensation."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Callable, Any

logger = logging.getLogger(__name__)


class SagaStatus(str, Enum):
    RUNNING = "running"
    COMPLETED = "completed"
    COMPENSATING = "compensating"
    FAILED = "failed"


@dataclass
class SagaStep:
    """A single step in a saga with its forward and compensating actions.

    Args:
        name: Human-readable step identifier (e.g., 'reserve_inventory').
        execute: Function that performs the business action. Returns result dict or raises on failure.
        compensate: Function that reverses the effect of `execute`. Receives the original result.
                    Should be idempotent — safe to call multiple times.
    """
    name: str
    execute: Callable[..., dict[str, Any]]
    compensate: Callable[[dict[str, Any]], None]


class SagaOrchestrator:
    """Orchestrates a saga by executing steps sequentially and compensating on failure.

    Args:
        saga_id: Unique identifier for this saga instance (used for tracing/logging).
    """

    def __init__(self, saga_id: str) -> None:
        self._saga_id = saga_id
        self._status = SagaStatus.RUNNING
        self._completed_steps: list[tuple[str, dict[str, Any]]] = []  # (name, result)
        self._error: Exception | None = None

    @property
    def status(self) -> SagaStatus:
        return self._status

    @property
    def saga_id(self) -> str:
        return self._saga_id

    def execute_saga(self, steps: list[SagaStep]) -> bool:
        """Execute all saga steps in order. On any failure, compensate backwards.

        Args:
            steps: List of SagaStep definitions to execute sequentially.

        Returns:
            True if the saga completed successfully (all steps executed).
            False if compensation was needed or final status is FAILED.
        """
        try:
            for step in steps:
                logger.info(
                    "[Saga %s] Executing step: %s",
                    self._saga_id, step.name,
                )
                result = step.execute()
                self._completed_steps.append((step.name, result))

        except Exception as exc:
            self._error = exc
            self._status = SagaStatus.COMPENSATING
            logger.error(
                "[Saga %s] Step failed: %s — starting compensation. Error: %s",
                self._saga_id, step.name, exc,
            )
            self._compensate_failed(steps)
            self._status = SagaStatus.FAILED
            return False

        self._status = SagaStatus.COMPLETED
        return True

    def _compensate_failed(self, steps: list[SagaStep]) -> None:
        """Compensate completed steps in reverse order.

        Compensates only the steps that finished execution before the failure point.
        Each compensation action is wrapped in try/except to prevent one failed
        compensation from aborting the entire rollback sequence.
        """
        for step_name, result in reversed(self._completed_steps):
            # Find the corresponding step definition
            step_def = next((s for s in steps if s.name == step_name), None)
            if step_def is None:
                logger.warning(
                    "[Saga %s] No step definition found for compensation of %s",
                    self._saga_id, step_name,
                )
                continue

            try:
                logger.info(
                    "[Saga %s] Compensating step: %s",
                    self._saga_id, step_name,
                )
                step_def.compensate(result)
            except Exception as comp_exc:
                # Compensation itself failed — log and continue.
                # In production, this needs manual intervention / dead-letter queue.
                logger.error(
                    "[Saga %s] COMPENSATION FAILED for step %s: %s",
                    self._saga_id, step_name, comp_exc,
                )

    def get_result(self) -> dict[str, Any]:
        """Return summary of saga execution for monitoring/tracing."""
        return {
            "saga_id": self._saga_id,
            "status": self._status.value,
            "steps_completed": len(self._completed_steps),
            "error": str(self._error) if self._error else None,
        }
```

**Example — Ordering Saga:**

```python
def example_order_saga() -> bool:
    """Demonstrate a complete order-fulfillment saga."""

    # --- Business state (simulated) ---
    inventory: dict[str, int] = {"widget": 100}
    payments: list[dict[str, Any]] = []
    shipments: list[dict[str, Any]] = []

    def reserve_inventory(qty: int) -> dict[str, Any]:
        if inventory["widget"] < qty:
            raise ValueError(f"Insufficient inventory: need {qty}, have {inventory['widget']}")
        inventory["widget"] -= qty
        return {"item": "widget", "quantity_reserved": qty}

    def cancel_inventory_reservation(reservation: dict[str, Any]) -> None:
        item = reservation["item"]
        qty = reservation["quantity_reserved"]
        inventory[item] = inventory.get(item, 0) + qty

    def process_payment(amount: float) -> dict[str, Any]:
        payment_id = f"pay_{len(payments) + 1}"
        payments.append({"id": payment_id, "amount": amount})
        return {"payment_id": payment_id}

    def cancel_payment(payment: dict[str, Any]) -> None:
        # Refund logic — in production, call payment gateway API.
        pass

    def create_shipment(order_data: dict[str, Any]) -> dict[str, Any]:
        shipment_id = f"ship_{len(shipments) + 1}"
        shipments.append({"id": shipment_id, "order": order_data})
        return {"shipment_id": shipment_id}

    def cancel_shipment(shipment: dict[str, Any]) -> None:
        # Mark shipment as cancelled in logistics system.
        pass

    # --- Build saga steps ---
    steps = [
        SagaStep(name="reserve_inventory", execute=lambda: reserve_inventory(1), compensate=cancel_inventory_reservation),
        SagaStep(name="process_payment", execute=lambda: process_payment(29.99), compensate=cancel_payment),
        SagaStep(name="create_shipment", execute=lambda: create_shipment({"item": "widget"}), compensate=cancel_shipment),
    ]

    # --- Execute ---
    orchestrator = SagaOrchestrator(saga_id="order_saga_001")
    result = orchestrator.execute_saga(steps)
    print(orchestrator.get_result())
    return result
```

---

### Pattern 6: Service Discovery with Heartbeats

Service discovery enables dynamic service registration, health checking, and automatic deregistration of failed nodes. This pattern is essential for load balancers, client-side routing, and cloud-native architectures where instances scale up and down frequently.

```python
"""Simple service registry with heartbeats and automatic stale-node removal."""

from __future__ import annotations

import time
import threading
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ServiceInstance:
    """Represents a running instance of a service in the registry.

    Attributes:
        instance_id: Unique identifier for this instance (e.g., UUID).
        service_name: Logical service name (e.g., 'payment-service').
        host: IP address or hostname.
        port: Listening port number.
        metadata: Arbitrary key-value metadata (version, zone, capabilities).
        registered_at: Timestamp when the instance was first registered.
        last_heartbeat: Timestamp of the most recent heartbeat received.
        health_status: Current health state.
    """
    instance_id: str
    service_name: str
    host: str
    port: int
    metadata: dict[str, str] = field(default_factory=dict)
    registered_at: float = field(default_factory=time.time)
    last_heartbeat: float = 0.0
    health_status: str = "healthy"


class ServiceRegistry:
    """In-memory service registry with heartbeat-based stale-node removal.

    Args:
        stale_timeout_seconds: Seconds without a heartbeat before marking an instance stale.
                               Default 30s — adjust based on your deployment's expected latency.
    """

    def __init__(self, stale_timeout_seconds: float = 30.0) -> None:
        self._stale_timeout = stale_timeout_seconds
        self._instances: dict[str, ServiceInstance] = {}
        self._service_index: dict[str, list[str]] = {}  # service_name -> [instance_ids]
        self._lock = threading.Lock()

    def register(self, instance: ServiceInstance) -> None:
        """Register a new service instance. Overwrites existing registration by instance_id."""
        with self._lock:
            old_service = self._instances.get(instance.instance_id)
            if old_service:
                # Remove from old service index if service name changed
                if old_service.service_name != instance.service_name:
                    self._unindex_instance(old_service)

            self._instances[instance.instance_id] = instance
            self._service_index.setdefault(instance.service_name, []).append(instance.instance_id)

    def deregister(self, instance_id: str) -> Optional[ServiceInstance]:
        """Remove a service instance. Returns the removed instance or None."""
        with self._lock:
            instance = self._instances.pop(instance_id, None)
            if instance is not None:
                self._unindex_instance(instance)
            return instance

    def heartbeat(self, instance_id: str) -> bool:
        """Record a heartbeat for an instance. Returns False if instance not found."""
        with self._lock:
            if instance_id not in self._instances:
                return False
            self._instances[instance_id].last_heartbeat = time.time()
            self._instances[instance_id].health_status = "healthy"
            return True

    def get_instances(self, service_name: str) -> list[ServiceInstance]:
        """Get all healthy instances for a service. Excludes stale (unresponsive) nodes."""
        with self._lock:
            now = time.time()
            stale_ids = set()
            result: list[ServiceInstance] = []

            for iid in self._service_index.get(service_name, []):
                inst = self._instances.get(iid)
                if inst is None:
                    continue
                if now - inst.last_heartbeat > self._stale_timeout:
                    stale_ids.add(iid)
                    inst.health_status = "stale"
                else:
                    result.append(inst)

            # Clean up stale entries
            for sid in stale_ids:
                inst = self._instances.pop(sid, None)
                if inst:
                    self._unindex_instance(inst)

            return result

    def cleanup_stale(self) -> int:
        """Explicitly remove all stale instances. Returns count removed.

        Should be called periodically (e.g., every 10 seconds).
        Also called automatically by get_instances() for the queried service.
        """
        with self._lock:
            now = time.time()
            to_remove = [
                iid for iid, inst in self._instances.items()
                if now - inst.last_heartbeat > self._stale_timeout
            ]
            for iid in to_remove:
                inst = self._instances.pop(iid)
                self._unindex_instance(inst)
            return len(to_remove)

    def _unindex_instance(self, instance: ServiceInstance) -> None:
        """Remove an instance from the service index. Caller must hold lock."""
        if instance.service_name in self._service_index:
            try:
                self._service_index[instance.service_name].remove(instance.instance_id)
                if not self._service_index[instance.service_name]:
                    del self._service_index[instance.service_name]
            except ValueError:
                pass  # Already removed

    @property
    def instance_count(self) -> int:
        return len(self._instances)
```

---

## Consistency Models — Quick Reference

| Model | Guarantee | Use When | Latency Cost |
|-------|-----------|----------|-------------|
| **Linearizable** (Strong) | Every read returns the most recent write across all nodes | Financial transactions, inventory checks, authentication | Highest — requires consensus on every read path |
| **Sequential** | All processes observe writes in the same total order | Chat systems, collaborative editing where global order matters | Moderate — single log but no full linearizability |
| **Causal** | Causally related operations are observed in order; concurrent ones may be seen differently | Social feeds, comment threads, version control merges | Low — vector clocks add minimal overhead |
| **Eventual** | If no new writes occur, all reads eventually return the last written value | Cache layers, analytics dashboards, CDN origins | Lowest — independent replication with background sync |

---

## Constraints

### MUST DO
- Treat every network call as potentially failing — implement timeouts (connect ≤ 1s, read ≤ 3s), retries with jittered exponential backoff (base 100ms, max 5, cap 30s), and circuit breakers for all inter-service communication
- Use unique idempotency keys on every mutable operation — commands, message delivery, HTTP POST/PUT requests — to handle duplicate delivery from retries or at-least-once semantics
- Design for the failure assumption: any node can die at any time, any network partition can occur without warning, and physical clocks can drift by ±500ms or more
- Use consistent hashing with virtual nodes (≥150 per physical node) whenever implementing sharding or key-based partitioning — never use modulo-N partitioning that causes O(N) redistribution on node churn
- Implement vector clocks for causal event ordering across services — do not trust NTP for ordering critical events
- Replace 2PC with Saga orchestration (choreography or orchestration pattern) for cross-service transactions in production microservices architectures
- Apply the outbox pattern for all event publication — store events in the same ACID transaction as business data mutations
- Implement service discovery with heartbeats, health checks, and automatic stale-node removal at configurable timeout intervals
- Add monitoring for consistency divergence — track read-repair frequency, vector clock concurrency rates, and saga compensation counts

### MUST NOT DO
- Rely on physical clock synchronization (NTP) for ordering critical events — clock drift of ±500ms is common even with NTP; use vector clocks or logical timestamps instead
- Use Two-Phase Commit for cross-service transactions in production microservices architectures — the synchronous blocking nature creates cascading failure paths that violate service autonomy and amplify outage blast radius
- Design systems assuming eventual consistency means "events will eventually be consistent" without explicit reconciliation — always implement compensating transactions, conflict resolution strategies, and monitoring for divergence
- Implement modulo-N partitioning (`hash(key) % N_nodes`) — when a node leaves, all keys must be remapped; consistent hashing reduces this to `~1/N` of keys per key change
- Use synchronous request-reply for any operation where the downstream service is not in your operational blast radius — use async event-driven communication (message queues, outbox pattern) instead
- Skip idempotency on retry logic — if a message is delivered twice and the handler is not idempotent, data corruption (double charges, duplicate shipments, inconsistent counters) will occur

---

## Output Template

When applying this skill to a design or implementation task, structure your output as:

1. **Failure Model Analysis** — Document which failures the system must handle (node crashes, partitions, clock drift, message duplication) and map each to a mitigation pattern
2. **Consistency Contract** — Define the consistency guarantee per service boundary in the API contract; justify why the chosen model fits the use case
3. **Partitioning Diagram** — For any sharded data store, show the hash function, vnode count, key distribution verification results, and rebalance impact analysis
4. **Event Ordering Schema** — Document which events are causally ordered (vector clocks) vs globally ordered (timestamp service), including conflict resolution strategy for concurrent updates
5. **Saga Definition** — For cross-service transactions, list each step with its execute and compensate functions, idempotency keys, and timeout settings
6. **Reliability Checklist** — Verify every inter-service call has: timeout configuration, retry policy with jittered backoff, circuit breaker thresholds, and outbox pattern for event publication

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `microservices-architecture` | Complements distributed systems patterns with service boundaries, API gateways, and deployment strategies |
| `event-driven-patterns` | Works alongside the outbox pattern and saga orchestration for asynchronous communication design |
| `domain-driven-design` | Provides the bounded context analysis needed to correctly identify transaction boundaries for sagas |
| `software-architecture` | Covers broader architectural decision-making, including when NOT to use distributed patterns (over-engineering prevention) |

---

## Quick Decision Matrix

```
                    ┌─────────────────────────────────────────┐
                    │  Do you need fault tolerance?           │
                    └──────────────┬──────────────────────────┘
                             Yes   │   No → Use single-process patterns
                                    │
               ┌────────────────────▼────────────────────┐
               │ How many services share state?          │
               └──────────────┬──────────────────────────┘
                          1  │     ≥ 2
                             │        │
                    ┌────────▼──┐ ┌───▼──────────────┐
                    │ Single DB │ │ Multi-service    │
                    │ Use local │ │ Saga pattern for  │
                    │ ACID txns │ │ cross-service txns│
                    │           │ │ Vector clocks     │
                    │           │ │ for causal order  │
                    └───────────┘ └──────────────────┘

               ┌────────────────────▼────────────────────┐
               │ Is there a single point of failure?     │
               └──────────────┬──────────────────────────┘
                          No  │    Yes
                             │        │
                      ┌──────▼───┐ ┌──▼──────────────────┐
                      │ Use Raft │ │ Consider:           │
                      │ leader   │ │ - Read replicas     │
                      │ election │ │ - Consistent hashing│
                      │ + log    │ │ - Service discovery │
                      │  replication│ └───────────────────┘
                      └──────────┘
```
