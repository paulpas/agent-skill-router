---
name: data-pipeline-engineering
description: Designs and implements production data pipelines (ETL, ELT, streaming)
  with data validation, schema evolution handling, idempotent processing, and quality
  gates for reliable data infrastructure.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: data pipeline, ETL, ELT, data ingestion, schema evolution, data validation,
    idempotent processing, data quality, Apache Kafka, Airflow DAG, batch processing,
    streaming pipeline, how do i build a data pipeline, data engineering, backpressure
    handling, deduplication
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
  - examples
  - do-dont
  related-skills: ds-feature-engineering, production-logging, software-error-handling,
    coding-production-readiness
------

# Data Pipeline Engineering Framework

Designs and implements production-grade data pipelines that reliably move, transform, validate, and serve data across systems. This skill makes the model architect ETL/ELT workflows with built-in data quality gates, idempotent processing for exactly-once semantics, schema evolution strategies, and streaming/batch hybrid patterns — ensuring data is trustworthy, traceable, and resilient to failures at every stage.

## TL;DR Checklist

- [ ] Define explicit input/output schemas with Pydantic models before writing any transformation logic
- [ ] Implement idempotent processing: every record must have a unique ID and deduplication logic
- [ ] Add data quality gates at pipeline entry, after each transformation step, and before output
- [ ] Handle schema evolution with forward/backward compatibility — never break downstream consumers
- [ ] Implement retry with exponential backoff and dead-letter queue for failed records
- [ ] Log structured telemetry: record count, bytes processed, error rate, processing latency per batch

