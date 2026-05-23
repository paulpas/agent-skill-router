---
name: data-intensive-systems
description: Implements data-intensive architecture patterns including stream processing,
  change data capture, lakehouse storage, event sourcing, and data mesh organizational
  design for high-throughput data systems.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: data architecture, stream processing, kafka, change data capture, CDC,
    event sourcing, lakehouse, data mesh, real-time analytics, batch processing, data
    pipeline design, how do i build a data pipeline, data streaming, Flink, Spark
    Streaming
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
  related-skills: event-driven-architecture, database-design-modeling, observability-patterns,
    distributed-systems-architecture
------

# Data-Intensive Systems Architecture

Designs and implements data-intensive architectures that handle high-volume streaming, real-time processing, and scalable storage. When loaded, the model creates system designs combining stream processing (Kafka Streams, Flink), change data capture pipelines, lakehouse storage patterns (Delta Lake, Apache Iceberg), event sourcing implementations, and data mesh organizational principles to build systems where data flow is the primary architectural concern.

## TL;DR Checklist

- [ ] Choose between Lambda (batch + speed layers) and Kappa (unified stream) architecture based on latency requirements and operational complexity tolerance
- [ ] Implement exactly-once semantics using transactional producers with idempotent consumers and outbox pattern for database-to-stream synchronization
- [ ] Configure partition keys to ensure event ordering within logical partitions while enabling horizontal scalability across partitions
- [ ] Store raw data immutably in object storage (S3, GCS) as the single source of truth for the lakehouse layer
- [ ] Enforce schema evolution strategies (backward-compatible Avro/Protobuf with a dedicated schema registry)
- [ ] Design data products with clear ownership boundaries, SLAs, and discoverability for data mesh compliance

