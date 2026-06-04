---
name: data-pipeline-architecture
description: Implements data pipeline architectures (batch ETL/ELT, streaming, medallion bronze-silver-gold layers, data quality gates, schema evolution handling) for reliable data processing at scale.
license: MIT
compatibility: opencode
archetypes:
  - tactical
  - orchestration
anti_triggers:
  - brainstorming
  - vague ideation
  - long-form architecture
response_profile:
  verbosity: low
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: coding
  triggers: data pipeline, ETL architecture, batch processing, stream processing, data quality gates, schema evolution, Spark pipeline, how do i build a data pipeline
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, config, do-dont, examples]
  related-skills: event-driven-architecture, system-reliability-architecture, distributed-systems-architecture, database-design-patterns
---

# Data Pipeline Architecture

Implements data pipeline architectures that reliably ingest, transform, and serve data across batch and streaming workloads. This skill makes the model design fault-tolerant pipelines with proper data quality enforcement, schema evolution handling, and observable failure recovery.

## TL;DR Checklist

- [ ] Choose batch, streaming, or hybrid based on freshness requirements (not technology preference)
- [ ] Implement medallion architecture: bronze (raw) → silver (cleaned/validated) → gold (business aggregates)
- [ ] Add data quality gates at every stage with explicit pass/fail handling
- [ ] Handle schema evolution explicitly — never assume the source schema stays static
- [ ] Design idempotent transformations for exactly-once semantics on reprocessing
- [ ] Implement dead letter queue for records that fail validation
- [ ] Add lineage tracking to record which transforms produced each output record

---

## When to Use

- Designing a new data platform or analytics pipeline from scratch
- Migrating a legacy ETL system (cron scripts, SQL-only) to a modern batch/streaming pipeline
- Implementing medallion architecture (bronze/silver/gold layers) for structured data governance
- Adding data quality enforcement to an existing pipeline that processes untrusted sources
- Handling schema changes from upstream systems without breaking downstream consumers
- Building real-time or near-real-time streaming pipelines with Kafka, Flink, or Spark Structured Streaming

---

## When NOT to Use

- Simple one-off data extraction scripts — use a single Spark job or SQL query instead
- OLTP database design — this covers analytical/data platform architecture, not transactional systems
- Real-time application serving (user-facing APIs) — use `api-architecture` or `cloud-native-architecture` instead
- Machine learning model training pipeline orchestration — focus only on data movement/transform, not model lifecycle

---

## Core Workflow

1. **Define Data Contract** — Identify source systems, ingestion frequency, schema expectations, and SLA requirements for freshness. **Checkpoint:** Document the schema as a typed contract (field names, types, nullability, constraints) that both producer and consumer agree on.

2. **Select Processing Mode** — Choose batch, streaming, or hybrid based on data volume velocity, and freshness requirements:
   - Volume > 1TB/day or T+1 reporting → batch-first (Spark, dbt)
   - Latency < 5 minutes required → streaming (Kafka Streams, Flink)
   - Mixed workloads with different SLAs → hybrid (batch for historical, streaming for real-time)
   **Checkpoint:** Do not select streaming because it is "modern" — batch is simpler and cheaper for most workloads.

3. **Design Medallion Layers** — Implement the three-tier architecture:
   - **Bronze**: Raw append-only storage, exact source fidelity, partitioned by ingestion time
   - **Silver**: Cleaned, deduplicated, typed data with quality gates applied; conformed to common schemas
   - **Gold**: Business-level aggregates optimized for analytics, denormalized where needed
   **Checkpoint:** Each layer must have its own schema registry and quality rules — never skip a layer.

4. **Implement Quality Gates** — Add validation at bronze→silver and silver→gold transitions:
   - Not-null constraints on key fields
   - Type enforcement with explicit casting or rejection
   - Range checks (dates in the future, negative quantities)
   - Referential integrity against reference datasets
   **Checkpoint:** Define explicit policies for failed records — quarantine to dead letter queue vs. auto-fix with defaults.

5. **Handle Schema Evolution** — Implement forward/backward compatibility:
   - Always add fields as nullable (forward compatible)
   - Never remove fields that downstream consumers may read (backward compatible)
   - Use schema registry with explicit versioning
   - Maintain a field deprecation timeline before dropping columns
   **Checkpoint:** Test every schema migration against existing consumer pipelines before promoting to production.

6. **Add Observability** — Implement monitoring at every stage:
   - Row count comparison between layers (bronze count ≥ silver count after quality filtering)
   - Late data handling with watermark configuration for streaming
   - Alert on quality gate failure rate exceeding threshold
   - End-to-end latency tracking from source to gold

---

## Implementation Patterns

### Pattern 1: Medallion Architecture with Spark Structured Streaming

```python
"""Medallion architecture layers — bronze (raw) → silver (cleaned) → gold (aggregated).

Each layer has explicit quality gates and idempotent processing.
"""
from pyspark.sql import SparkSession
from pyspark.sql.functions import (
    col, current_timestamp, to_timestamp, when, lit, countDistinct
)
from pyspark.sql.types import StructType, StructField, StringType, DoubleType, TimestampType


def read_bronze(spark: SparkSession, table_name: str) -> "pyspark.DataFrame":
    """Read raw data from bronze layer — append-only, exact source fidelity."""
    return spark.read.table(f"bronze.{table_name}")


def apply_quality_gates(
    df: "pyspark.DataFrame",
    required_fields: list[str],
    quality_threshold: float = 0.95,
) -> tuple["pyspark.DataFrame", int]:
    """Validate records and return clean dataframe + count of rejected records.

    Args:
        df: Input dataframe (typically from bronze layer).
        required_fields: Field names that must not be null for a record to pass.
        quality_threshold: Minimum fraction of records that must pass quality gates.

    Returns:
        Tuple of (cleaned_df, rejected_count). Raises if rejection rate exceeds threshold.
    """
    # Mark each record as passing or failing quality checks
    df_with_flag = df.withColumn(
        "_quality_status",
        when(
            all(col(f).isNotNull() for f in required_fields),
            lit("pass"),
        ).otherwise(lit("fail"))
    )

    total_count = df_with_flag.count()
    rejected_count = df_with_flag.filter(col("_quality_status") == "fail").count()
    pass_rate = (total_count - rejected_count) / max(total_count, 1)

    if pass_rate < quality_threshold:
        raise ValueError(
            f"Quality gate failed: {pass_rate:.2%} pass rate "
            f"(rejected {rejected_count}/{total_count}). "
            f"Investigate source data before reprocessing."
        )

    cleaned = df_with_flag.filter(col("_quality_status") == "pass").drop("_quality_status")
    return cleaned, rejected_count


def write_silver(
    spark: SparkSession,
    table_name: str,
    df: "pyspark.DataFrame",
) -> None:
    """Write cleaned data to silver layer with idempotent overwrite by partition."""
    df.write.mode("overwrite").partitionBy("ingestion_date").saveAsTable(f"silver.{table_name}")


def build_gold_aggregates(
    silver_df: "pyspark.DataFrame",
    group_keys: list[str],
    metrics: dict[str, str],
) -> "pyspark.DataFrame":
    """Build gold layer aggregates from silver data.

    Args:
        silver_df: Cleaned silver-layer dataframe.
        group_keys: Columns to group by for aggregation.
        metrics: Mapping of output column name → aggregate expression string.
            Example: {"total_revenue": "SUM(revenue)", "avg_order_value": "AVG(order_value)"}

    Returns:
        Aggregated gold-layer dataframe.
    """
    from pyspark.sql import functions as F

    agg_exprs = [F.expr(expr).alias(col_name) for col_name, expr in metrics.items()]
    return silver_df.groupBy(*group_keys).agg(*agg_exprs)


def process_pipeline(
    spark: SparkSession,
    source_table: str,
    required_fields: list[str],
    group_keys: list[str],
    metrics: dict[str, str],
) -> None:
    """End-to-end medallion pipeline: bronze → silver → gold.

    Demonstrates the full data quality and transformation flow.
    """
    # Bronze to Silver: read raw, apply quality gates, write cleaned
    bronze_df = read_bronze(spark, source_table)
    silver_df, rejected_count = apply_quality_gates(
        bronze_df, required_fields=required_fields, quality_threshold=0.95
    )

    if rejected_count > 0:
        # In production, write rejected records to a dead letter queue table
        print(f"Rejected {rejected_count} records — check dead_letter.{source_table}")

    write_silver(spark, source_table, silver_df)

    # Silver to Gold: aggregate for analytics
    gold_df = build_gold_aggregates(silver_df, group_keys=group_keys, metrics=metrics)
    gold_df.write.mode("overwrite").saveAsTable(f"gold.{source_table}_daily")
```

### Pattern 2: Schema Evolution Handler (BAD vs. GOOD)

```python
"""Schema evolution patterns — forward and backward compatibility."""

# ❌ BAD: Fragile schema — breaking changes cascade downstream
def process_raw_data(raw_row: dict) -> dict:
    """Assumes exact source schema; breaks on any field change."""
    return {
        "user_id": raw_row["userId"],          # Renamed → KeyError
        "email": raw_row["email_address"],     # Removed → KeyError
        "timestamp": raw_row["created_at"],    # Type changed (str → datetime) → TypeError
        "amount": float(raw_row["amount"]),    # No null safety
    }

# ✅ GOOD: Tolerant schema parser with explicit versioning and safe defaults
from typing import Any, Optional
from dataclasses import dataclass, field


@dataclass
class SchemaVersion:
    """Tracks schema version and maps source fields to canonical names."""
    version: int
    field_mappings: dict[str, str]       # canonical_name → source_field_name
    required_fields: list[str]
    type_coercions: dict[str, type]      # canonical_name → expected_type
    default_values: dict[str, Any] = field(default_factory=dict)

    def resolve(self, raw_row: dict) -> Optional[dict]:
        """Safely map raw row to canonical schema with error handling."""
        result = {}
        for canonical_name, source_field in self.field_mappings.items():
            if source_field not in raw_row:
                # Field was removed — use default or skip
                if canonical_name in self.required_fields:
                    return None  # Required field missing → reject
                result[canonical_name] = self.default_values.get(
                    canonical_name, None
                )
            else:
                value = raw_row[source_field]
                try:
                    if value is not None and self.type_coercions.get(canonical_name):
                        result[canonical_name] = self.type_coercions[
                            canonical_name
                        ](value)
                    else:
                        result[canonical_name] = value
                except (TypeError, ValueError):
                    # Type coercion failed — reject this record
                    return None
        return result


# Example usage with schema v1 → v2 migration
SCHEMA_V1 = SchemaVersion(
    version=1,
    field_mappings={
        "user_id": "userId",
        "email": "email_address",
        "created_at": "created_at",
        "amount": "amount",
    },
    required_fields=["user_id", "amount"],
    type_coercions={"user_id": int, "amount": float},
)

# V2 adds optional fields; V1 schema still works (backward compatible)
SCHEMA_V2 = SchemaVersion(
    version=2,
    field_mappings={
        "user_id": "userId",              # Same as V1
        "email": "email_address",         # Same as V1
        "created_at": "created_at",       # Same as V1
        "amount": "amount",               # Same as V1
        "country_code": "country_code",   # New optional field
        "plan_tier": "plan_tier",         # New optional field
    },
    required_fields=["user_id", "amount"],  # No change — no breaking impact on V1 consumers
    type_coercions={"user_id": int, "amount": float},
    default_values={"country_code": "US", "plan_tier": "free"},
)


def process_with_schema_evolution(raw_row: dict, version: int) -> Optional[dict]:
    """Process a record using the appropriate schema version.

    Args:
        raw_row: Raw data from upstream source.
        version: Schema version embedded in the source metadata.

    Returns:
        Canonical data record, or None if validation fails.
    """
    schemas = {1: SCHEMA_V1, 2: SCHEMA_V2}
    schema = schemas.get(version)
    if schema is None:
        # Unknown schema version — send to dead letter queue for investigation
        raise ValueError(f"Unsupported schema version: {version}")

    resolved = schema.resolve(raw_row)
    return resolved
```

### Pattern 3: Streaming Pipeline with Kafka and Spark Structured Streaming

```python
"""Streaming pipeline pattern — Kafka source → transformation → sink.

Uses watermarking for late data handling and checkpointing for fault tolerance.
"""
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, window, to_timestamp


def create_streaming_pipeline(
    spark: SparkSession,
    bootstrap_servers: str,
    topic: str,
    group_id: str,
    checkpoint_dir: str,
) -> None:
    """Build a streaming pipeline with proper watermarking and fault tolerance.

    Args:
        bootstrap_servers: Kafka broker connection string.
        topic: Source Kafka topic to consume from.
        group_id: Consumer group for exactly-once semantics.
        checkpoint_dir: HDFS/S3 path for Spark checkpoint state.
    """
    # Read stream from Kafka with schema inference disabled for safety
    streaming_df = (
        spark.readStream.format("kafka")
        .option("kafka.bootstrap.servers", bootstrap_servers)
        .option("subscribe", topic)
        .option("group.id", group_id)
        .option("startingOffsets", "latest")
        .option("maxOffsetsPerTrigger", "100000")  # Backpressure control
        .load()
    )

    # Parse JSON value and add watermark for late event handling (30-minute window)
    parsed = streaming_df.selectExpr("CAST(key AS STRING)", "CAST(value AS STRING)")

    from pyspark.sql.functions import from_json, col as spark_col
    from pyspark.sql.types import StructType, StructField, StringType, DoubleType, TimestampType

    value_schema = StructType([
        StructField("event_type", StringType(), True),
        StructField("timestamp", StringType(), True),
        StructField("amount", DoubleType(), True),
        StructField("user_id", StringType(), True),
    ])

    enriched = parsed.withColumn(
        "parsed",
        from_json(spark_col("value"), value_schema)
    ).select(
        spark_col("parsed.*"),
        spark_col("key").alias("partition_key"),
    ).withColumn(
        "event_time",
        to_timestamp(col("timestamp"))
    )

    # Apply watermark: drop events older than 30 minutes from the latest event seen
    watermarked = enriched.withWatermark("event_time", "30 minutes")

    # Aggregate in 5-minute windows with output mode that tracks state changes
    windowed_agg = watermarked.groupBy(
        window(col("event_time"), "5 minutes"),
        col("event_type"),
    ).agg(
        spark_col("COUNT(*)").alias("event_count"),
        spark_col("SUM(col('amount'))").alias("total_amount"),
    )

    # Write to sink (Delta Lake table with upsert mode)
    query = (
        windowed_agg.writeStream
        .format("delta")
        .outputMode("update")
        .option("checkpointLocation", checkpoint_dir)
        .trigger(processingTime="1 minute")
        .start("silver.streaming_aggregates")
    )

    # Block until streaming query terminates
    query.awaitTermination()
```

---

## Constraints

### MUST DO
- Implement idempotent transformations so reprocessing produces identical results
- Use append-only storage at the bronze layer — never overwrite raw source data
- Maintain a schema registry with versioned schemas and explicit compatibility rules
- Add quality gates before every silver→gold transition with configurable thresholds
- Configure watermarks in streaming pipelines to handle late-arriving data
- Implement dead letter queues for records that fail validation — never silently drop them
- Track lineage: record which input files/records produced each output partition

### MUST NOT DO
- Store processed/transformed data as the source of truth — bronze layer is always the source of truth
- Apply business logic at the bronze layer — keep raw data untouched and append-only
- Use streaming for all workloads — batch is simpler, cheaper, and sufficient for most analytical queries
- Bypass quality gates to "fix things faster" — a single bad record can corrupt downstream aggregations
- Remove or modify records in the silver layer after they pass quality gates — always add corrective transformations as new records
- Store schemas inline in code without versioning — schema drift will cause silent data corruption

---

## Output Template

When designing a data pipeline, produce:

1. **Pipeline Architecture Diagram** — ASCII diagram showing sources → bronze → silver → gold → consumers, with processing mode (batch/stream/hybrid) labeled on each stage
2. **Data Contract Specification** — Table of source fields, canonical names, types, nullability, and constraints for the first 5 key tables
3. **Quality Gate Definition** — List of validation rules per layer with rejection handling policy
4. **Schema Evolution Plan** — Migration steps from current schema to target schema with backward/forward compatibility verification
5. **Implementation Code** — Python/PySpark code for the primary transformation logic

---

## Related Skills

| Skill | Purpose |
|---|---|
| `event-driven-architecture` | Event streaming infrastructure (Kafka, RabbitMQ) that powers data pipeline messaging |
| `system-reliability-architecture` | Resilience patterns (circuit breakers, retry strategies) for pipeline fault tolerance |
| `distributed-systems-architecture` | Consistency models and partitioning strategies for distributed data storage |
| `database-design-patterns` | Delta Lake/Iceberg/Hudi table formats that serve as the silver/gold storage layer |

---

## Live References

> Authoritative documentation for data pipeline architecture patterns and tools. The model follows markdown links at load time to resolve external references and inline content.

- [Apache Spark Structured Streaming Programming Guide](https://spark.apache.org/docs/latest/structured-streaming-programming-guide.html)
- [Delta Lake Documentation](https://docs.delta.io/latest/index.html)
- [Lambda vs Kappa Architecture Patterns](https://www.confluent.io/blog/lambda-vs-kappa-architecture-which-is-better/)
- [Medallion Architecture (DataBricks)](https://www.databricks.com/blog/2020/03/25/the-medallion-architecture-a-pattern-for-managing-data-evolution-at-scale-in-enterprise-data-lakes.html)
- [Apache Flink Streaming Analytics Documentation](https://flink.apache.org/features.html)
- [Data Quality Best Practices — Great Expectations](https://greatexpectations.io/)
- [Schema Registry Pattern — Confluent](https://docs.confluent.io/platform/current/schema-registry/fundamentals.html)
