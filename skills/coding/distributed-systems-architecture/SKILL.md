---
name: distributed-systems-architecture
description: Implements distributed systems patterns (consensus algorithms, consistency
  models, replication strategies, partitioning, clock synchronization, saga orchestration)
  for building correct and resilient multi-node systems.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: distributed systems, consensus algorithm, CAP theorem, eventual consistency,
    data replication, partitioning strategy, Raft, Paxos, vector clocks, service discovery,
    two-phase commit, distributed transactions, clock synchronization, consistent
    hashing
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
  - do-dont
  - examples
  related-skills: microservices-architecture, event-driven-patterns, domain-driven-design,
    software-architecture
------

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

