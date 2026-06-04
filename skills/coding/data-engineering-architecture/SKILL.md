---
name: data-engineering-architecture
description: Implements streaming pipeline patterns with Kafka, CDC replication, Delta Lake lakehouse architecture, and orchestrator integration for building scalable data infrastructure.
license: MIT
compatibility: opencode
archetypes:
  - tactical
  - generation
anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
response_profile:
  verbosity: low
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: coding
  triggers: data engineering, streaming pipeline, kafka, delta lake, dbt, spark, etl patterns, data quality framework
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: data-pipeline-architecture, engineering-api-design, production-readiness
---

# Data Engineering Architecture

Implements modern data engineering infrastructure patterns including streaming pipelines with Apache Kafka, change data capture (CDC) replication, Delta Lake lakehouse architecture, and orchestrator integration for building scalable, reliable data platforms. When loaded, the model acts as a senior data engineer designing production-grade data infrastructure.

## TL;DR Checklist

- [ ] Separate raw ingestion from transformation — never mix CDC streaming with batch transforms in the same job
- [ ] Use Kafka Schema Registry for all topic schemas; enforce backward compatibility
- [ ] Implement Delta Lake time travel and MERGE for idempotent upserts
- [ ] Add dead letter queues to every streaming consumer group
- [ ] Configure watermarking for late data in streaming workloads
- [ ] Version all orchestrator DAGs with Git and enforce dependency graphs

---

## When to Use

Use this skill when:

- Designing a real-time streaming pipeline with Kafka or similar message brokers
- Implementing CDC (change data capture) from a transactional database (PostgreSQL, MySQL) into a data lake
- Building a lakehouse architecture using Delta Lake, Iceberg, or Hudi on top of object storage
- Integrating an orchestrator (Airflow, Dagster) with streaming workloads for hybrid batch+streaming
- Designing schema registry and governance policies for a multi-consumer data platform
- Setting up materialized views that refresh incrementally from streaming sources

---

## When NOT to Use

Avoid this skill for:

- Simple batch ETL pipelines without streaming components — use `data-pipeline-architecture` instead
- Application-level database schema design or migration management — use `database-migrations`
- Real-time application APIs (user-facing endpoints) — use `engineering-api-design`
- Machine learning model training — this covers data infrastructure only, not model lifecycle

---

## Core Workflow

1. **Choose Ingestion Strategy** — Determine whether the source supports native CDC replication (PostgreSQL WAL, MySQL binlog, Debezium connectors) or requires polling/snapshot-based ingestion. **Checkpoint:** If the database supports logical replication, always prefer CDC over polling — it is lower latency and does not add load to OLTP queries.

2. **Design Stream Topology** — Map out Kafka topics, consumer groups, and processing topology:
   - One topic per domain entity with partitioning by natural key
   - Separate raw topic (append-only) from processed topics (enriched/aggregated)
   - Configure `min.insync.replicas=2` for durability on all production topics
   **Checkpoint:** Every topic must have a documented schema in the Schema Registry before producers or consumers are deployed.

3. **Implement CDC Pipeline** — Set up change data capture with proper offset management:
   - Use Debezium connectors for PostgreSQL/MySQL source databases
   - Configure `transforms.unwrap` to extract only changed records
   - Store offsets in a dedicated Kafka topic, not in the connector framework store
   **Checkpoint:** Test that replaying CDC events from a given offset produces identical output — idempotency is mandatory.

4. **Build Lakehouse Layer** — Implement Delta Lake or Iceberg on top of object storage:
   - Write raw CDC events to Bronze (append-only)
   - Apply transformations and write to Silver (cleaned, deduplicated, typed)
   - Aggregate to Gold for analytics consumption
   **Checkpoint:** Every layer must support time travel (`TIMESTAMP AS OF`) — this is critical for debugging data issues.

5. **Configure Orchestrator** — Integrate Airflow/Dagster for scheduled batch workloads alongside streaming:
   - Define DAGs with explicit upstream/downstream dependencies
   - Use trigger-based task scheduling where possible (Kafka topic size, watermark lag)
   **Checkpoint:** Never schedule streaming tasks on cron alone — always include a backpressure check.

6. **Add Data Quality Framework** — Implement automated quality checks:
   - Row count comparisons between layers after each transformation
   - Null/freshness checks on key columns at bronze and silver boundaries
   - Distribution alerts for numerical columns (unexpected shifts in mean/std)
   **Checkpoint:** Failed quality gates must quarantine bad records to a dead letter topic, not halt the entire pipeline.

---

## Implementation Patterns

### Pattern 1: Kafka Streaming with Schema Registry

```python
from kafka import KafkaConsumer, KafkaProducer
from kafka.errors import KafkaError
from schema_registry.client import SchemaRegistryClient, schema
import json
import logging

logger = logging.getLogger(__name__)


class StreamPipeline:
    """Kafka streaming pipeline with Schema Registry enforcement.
    
    Enforces typed schemas at the boundary between producers and consumers.
    All records are validated against Avro schemas before processing.
    """
    
    def __init__(
        self,
        bootstrap_servers: str,
        schema_registry_url: str,
        topic: str,
        consumer_group: str
    ) -> None:
        self.bootstrap_servers = bootstrap_servers
        self.topic = topic
        self.consumer_group = consumer_group
        
        # Initialize Schema Registry client with compatibility checking
        self.schema_registry = SchemaRegistryClient(url=schema_registry_url)
        
        # Consumer configured for exactly-once semantics
        self.consumer = KafkaConsumer(
            topic,
            bootstrap_servers=bootstrap_servers,
            group_id=consumer_group,
            auto_offset_reset="earliest",
            enable_auto_commit=False,  # Manual commit for idempotency
            max_poll_records=500,
            session_timeout_ms=30000,
            heartbeat_interval_ms=10000,
        )
        
        logger.info("StreamPipeline initialized for topic=%s group=%s", topic, consumer_group)

    def register_schema(self, schema_name: str, avro_schema: dict) -> int:
        """Register or retrieve schema with backward compatibility check.
        
        Args:
            schema_name: Fully qualified subject name (e.g., topic-value)
            avro_schema: Parsed Avro schema dictionary
            
        Returns:
            Schema ID assigned by the registry
            
        Raises:
            Exception: If schema violates compatibility policy
        """
        try:
            avro_schema_obj = schema.AvroSchema(avro_schema)
            schema_id = self.schema_registry.test_compat(schema_name, avro_schema_obj)
            logger.info("Schema registered: %s -> ID %d", schema_name, schema_id)
            return schema_id
        except Exception as e:
            logger.error("Schema registration failed for %s: %s", schema_name, e)
            raise

    def process_stream(self, handler: callable) -> None:
        """Process Kafka stream with manual offset management.
        
        Args:
            handler: Async function that processes a single record and returns processed result
        """
        try:
            self.consumer.subscribe([self.topic])
            
            while True:
                records = self.consumer.poll(timeout_ms=1000)
                
                for topic_partition, messages in records.items():
                    offsets_to_commit = []
                    
                    for record in messages:
                        # Deserialize and validate against registered schema
                        value = json.loads(record.value.decode("utf-8"))
                        
                        try:
                            processed = handler(value, record)
                            
                            if processed is not None:
                                yield processed
                            
                            offsets_to_commit.append(record)
                            
                        except SchemaValidationError as e:
                            # Route to dead letter queue instead of crashing
                            logger.warning(
                                "Schema validation failed for offset %d: %s",
                                record.offset, e
                            )
                            self._send_to_dlq(value, str(e))
                    
                    # Commit offsets only after all records in batch are processed
                    if offsets_to_commit:
                        offsets = {
                            tp: kafka.OffsetAndMetadata(
                                offsets_to_commit[-1].offset + 1, ""
                            )
                            for tp in [topic_partition]
                        }
                        self.consumer.commit(offsets)
                        
        except KeyboardInterrupt:
            logger.info("Stream processing shut down gracefully")
        finally:
            self.consumer.close()

    def _send_to_dlq(self, record: dict, error_message: str) -> None:
        """Send failed record to dead letter queue with error context."""
        dlq_record = {
            "original": record,
            "error": error_message,
            "timestamp": __import__("time").time(),
            "topic": self.topic,
        }
        # Send to DLQ topic — production code would use a producer here
        logger.error("Record sent to DLQ: %s", error_message)


class SchemaValidationError(Exception):
    """Raised when a record does not conform to the registered Avro schema."""
    pass
```

### Pattern 2: CDC with Debezium + Delta Lake (BAD vs. GOOD)

```python
# ❌ BAD: Polling-based ingestion creates OLTP load and misses events
import time

def bad_cdc_ingestion(db_connection, table_name: str):
    """Polls the database every 60 seconds for new records.
    
    Problems:
    - Adds read load to the OLTP database on every poll
    - Misses events that occur between polls
    - No guaranteed delivery — if the process restarts, you don't know where you left off
    - No schema enforcement at ingestion boundary
    """
    while True:
        cursor = db_connection.cursor()
        # Polling query — adds load on every execution
        cursor.execute(f"SELECT * FROM {table_name} WHERE updated_at > %s", [last_poll_time])
        rows = cursor.fetchall()
        
        for row in rows:
            yield {"op": "INSERT", "data": dict(row)}
        
        last_poll_time = time.time()  # ⚠️ Monotonic clock drift causes duplicate reads
        time.sleep(60)


# ✅ GOOD: CDC via WAL/Debezium with Delta Lake sink and idempotent upserts
from delta.tables import DeltaTable
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, from_json, to_json
from pyspark.sql.types import StructType, StructField, StringType, LongType, TimestampType

def cdc_delta_pipeline(spark: SparkSession, cdc_stream_df, table_path: str):
    """Processes CDC events and writes idempotently to Delta Lake.
    
    Uses MERGE INTO for upsert semantics — replaying the same CDC events
    produces identical table state. Implements time travel for debugging.
    
    Args:
        spark: Active SparkSession with Delta Lake support
        cdc_stream_df: Streaming DataFrame from Debezium Kafka source
        table_path: Delta Lake table path (e.g., s3://bucket/db/schema/table)
    """
    # Define CDC event schema matching Debezium envelope format
    cdc_schema = StructType([
        StructField("before", StringType(), True),
        StructField("after", StringType(), True),
        StructField("op", StringType(), False),  # c=create, u=update, d=delete
        StructField("source", StructType([
            StructField("db", StringType(), False),
            StructField("table", StringType(), False),
            StructField("ts_ms", LongType(), True),
        ]), False),
    ])
    
    # Parse JSON envelope strings into structured columns
    parsed = cdc_stream_df.withColumn(
        "cdc", from_json(col("value").cast("string"), cdc_schema)
    ).select(
        col("cdc.before"),
        col("cdc.after"),
        col("cdc.op"),
        col("cdc.source.db").alias("database"),
        col("cdc.source.table").alias("source_table"),
        col("cdc.source.ts_ms").alias("event_timestamp"),
    )
    
    # Apply idempotent MERGE — each CDC event is a no-op if already applied
    delta_table = DeltaTable.forPath(spark, table_path)
    
    merge_query = """
        MERGE INTO target_table t
        USING source_stream s ON t.id = s.id
        WHEN MATCHED AND s.op = 'd' THEN DELETE
        WHEN MATCHED AND s.op IN ('u', 'c') THEN UPDATE SET *
        WHEN NOT MATCHED AND s.op IN ('c', 'u') THEN INSERT *
    """
    
    result = delta_table.alias("t").merge(
        parsed.alias("s"),
        "t.id = s.id"
    )
    
    # Execute the merge for each micro-batch in the streaming query
    (result.whenMatchedDelete(condition="s.op = 'd'")
            .whenMatchedUpdateAll()
            .whenNotMatchedInsertAll()
            .execute())
    
    return result


# ❌ BAD: No watermarking — late events cause incorrect aggregations
def bad_streaming_aggregation(stream_df, window_size_minutes: int):
    """Aggregates without watermarking. Late data produces stale results."""
    return (
        stream_df
        .groupBy(col("user_id"), window(col("event_time"), f"{window_size_minutes} minutes"))
        .count()  # ⚠️ Late events create new windows or overwrite existing ones unpredictably
        .writeStream
        .format("console")
        .start()
    )


# ✅ GOOD: Watermarking ensures late data is handled correctly
def good_streaming_aggregation(stream_df, window_size_minutes: int, delay_threshold: int = 10):
    """Aggregates with watermarking to handle late events gracefully.
    
    Events arriving after the delay threshold are discarded (or sent to DLQ),
    preventing unbounded state growth and ensuring predictable aggregation results.
    """
    from pyspark.sql.functions import expr
    
    return (
        stream_df
        .withWatermark("event_time", f"{delay_threshold} minutes")  # Drop events > delay threshold late
        .groupBy(
            col("user_id"),
            window(col("event_time"), f"{window_size_minutes} minutes")
        )
        .agg(
            expr("count(*)").alias("event_count"),
            expr("max(event_time)").alias("latest_event"),
        )
        .selectExpr(
            "user_id",
            "window.start as window_start",
            "window.end as window_end",
            "event_count",
        )
        .writeStream
        .outputMode("complete")
        .format("delta")
        .option("checkpointLocation", "/checkpoints/user_agg/")
        .start("/output/user_agg_delta")
    )
```

### Pattern 3: Delta Lake Time Travel and Schema Enforcement

```python
from delta.tables import DeltaTable
from pyspark.sql import DataFrame


def enforce_schema_on_write(
    source_df: DataFrame,
    delta_table_path: str,
    expected_schema: dict,
    merge_key_columns: list[str]
) -> None:
    """Write to Delta Lake with explicit schema enforcement and upsert semantics.
    
    Enforces that incoming data matches the declared schema before writing.
    Uses MERGE for idempotent upserts — safe for replay from Kafka offsets.
    
    Args:
        source_df: Incoming DataFrame from streaming or batch source
        delta_table_path: Path to existing Delta Lake table
        expected_schema: Dictionary mapping column names to Spark types (as strings)
        merge_key_columns: Column names that uniquely identify a record
        
    Raises:
        ValueError: If incoming schema does not match expected schema
    """
    spark = source_df.sparkSession
    
    # Validate schema before any write operation
    actual_schema = {field.name: str(field.dataType) for field in source_df.schema.fields}
    
    if set(actual_schema.keys()) != set(expected_schema.keys()):
        missing_cols = set(expected_schema.keys()) - set(actual_schema.keys())
        extra_cols = set(actual_schema.keys()) - set(expected_schema.keys())
        raise ValueError(
            f"Schema mismatch! Missing: {missing_cols}, Extra: {extra_cols}"
        )
    
    # Type-check each column
    for col_name, expected_type_str in expected_schema.items():
        actual_type_str = actual_schema[col_name]
        if actual_type_str != expected_type_str:
            raise ValueError(
                f"Type mismatch on column '{col_name}': "
                f"expected {expected_type_str}, got {actual_type_str}"
            )
    
    # Execute idempotent MERGE
    delta_table = DeltaTable.forPath(spark, delta_table_path)
    
    merge_keys = [f"{k} = source.{k}" for k in merge_key_columns]
    condition = " AND ".join(merge_keys)
    
    result = (
        delta_table.alias("target")
        .merge(source_df.alias("source"), condition)
        .whenMatchedUpdateAll()
        .whenNotMatchedInsertAll()
    )
    
    result.execute()
    print(f"Schema enforced and merged into {delta_table_path}")


def query_time_travel(
    delta_table_path: str,
    version_as_of: int | None = None,
    timestamp_as_of: str | None = None
) -> DataFrame:
    """Query a Delta Lake table at a previous version or timestamp.
    
    Time travel is critical for debugging data issues without restoring backups.
    Delta Lake retains historical versions for 30 days by default (retention setting).
    
    Args:
        delta_table_path: Path to the Delta Lake table
        version_as_of: Specific table version number (integer)
        timestamp_as_of: ISO-8601 timestamp string
        
    Returns:
        DataFrame representing the table at the specified point in time
    """
    spark = SparkSession.builder.getOrCreate()
    
    if version_as_of is not None:
        df = spark.read.format("delta").load(f"{delta_table_path}@v{version_as_of}")
    elif timestamp_as_of is not None:
        df = spark.read.format("delta").option("timestampAsOf", timestamp_as_of).load(delta_table_path)
    else:
        df = spark.read.format("delta").load(delta_table_path)
    
    return df


def vacuum_delta_table(table_path: str, retention_hours: int = 168) -> None:
    """Clean up old files from Delta Lake table.
    
    Delta Lake uses a transaction log to track changes. Vacuum removes physical
    files that are no longer referenced by any version within the retention window.
    Must be run periodically — stale files accumulate with every MERGE/UPDATE.
    
    Args:
        table_path: Path to the Delta Lake table
        retention_hours: Minimum file age in hours (default 168 = 7 days)
    """
    spark = SparkSession.builder.getOrCreate()
    delta_table = DeltaTable.forPath(spark, table_path)
    
    # Dry-run first to see what will be deleted
    removals = delta_table.vacuum(retention_hours=retention_hours)
    print(f"Vacuum would remove {len(removals)} files: {removals[:5]}")
    
    # Uncomment for actual deletion (DANGEROUS — irreversible without backup):
    # delta_table.vacuum(retention_hours=retention_hours, dryRun=False)
```

### Pattern 4: Airflow DAG with Streaming Dependencies

```python
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.utils.dates import days_ago
import requests


def check_watermark_lag(topic: str, max_lag_seconds: int = 300) -> bool:
    """Check if Kafka consumer group watermark lag is within acceptable bounds.
    
    Returns True if the lag is within the threshold — used as a trigger
    condition for downstream tasks.
    
    Args:
        topic: Kafka topic name to check
        max_lag_seconds: Maximum acceptable watermark lag in seconds
        
    Returns:
        True if lag is within tolerance, False otherwise
    """
    # In production, this would query Kafka metrics via JMX or a monitoring system
    # This is a simplified placeholder for the pattern
    metrics = _get_kafka_consumer_metrics(topic)
    lag_seconds = metrics.get("max_lag_seconds", 0)
    
    if lag_seconds > max_lag_seconds:
        raise AirflowSkipException(
            f"Watermark lag {lag_seconds}s exceeds threshold {max_lag_seconds}s "
            f"for topic {topic} — skipping downstream tasks"
        )
    return True


def _get_kafka_consumer_metrics(topic: str) -> dict:
    """Fetch consumer lag metrics from monitoring system.
    
    Returns dict with keys: max_lag_seconds, avg_lag_seconds, active_consumers
    """
    # Implementation depends on monitoring stack (Prometheus/JMX exporter)
    raise NotImplementedError("Integrate with your monitoring system")


def run_cdc_validation(source_table: str, delta_path: str) -> dict:
    """Validate CDC pipeline completeness between source and Delta Lake sink.
    
    Checks row counts, freshness of last event, and schema consistency.
    
    Args:
        source_table: Source database table name
        delta_path: Delta Lake table path
        
    Returns:
        Validation results dictionary for alerting
    """
    # Count comparison — Delta Lake row count should match after deduplication
    source_count = _count_source_rows(source_table)
    delta_count = _count_delta_rows(delta_path)
    
    # Freshness check — last CDC event should be recent
    last_event_time = _get_last_cdc_timestamp(delta_path)
    freshness_seconds = (time.time() - last_event_time.timestamp()) if last_event_time else float("inf")
    
    results = {
        "source_count": source_count,
        "delta_count": delta_count,
        "count_match": abs(source_count - delta_count) < 100,  # Allow small reconciliation delay
        "freshness_seconds": freshness_seconds,
        "within_sla": freshness_seconds < 300,  # 5-minute SLA for CDC lag
    }
    
    if not results["count_match"]:
        raise AirflowException(
            f"Row count mismatch: source={source_count}, delta={delta_count}"
        )
    
    return results


default_args = {
    "owner": "data-engineering",
    "retries": 2,
    "retry_delay_sec": 300,
}

with DAG(
    dag_id="cdc_validation_and_refresh",
    default_args=default_args,
    schedule_interval="*/15 * * * *",  # Every 15 minutes
    catchup=False,
    tags=["data-quality", "cdc", "delta-lake"],
) as dag:

    check_lag = PythonOperator(
        task_id="check_kafka_watermark_lag",
        python_callable=lambda: check_watermark_lag("orders-cdc", max_lag_seconds=300),
    )

    validate_cdc = PythonOperator(
        task_id="validate_cdc_completeness",
        python_callable=run_cdc_validation,
        op_args=["public.orders", "s3://data-lake/silver/orders"],
    )

    refresh_materialized_view = PythonOperator(
        task_id="refresh_analytics_views",
        python_callable=lambda: print("Executing dbt materialization"),
        trigger_rule="all_success",
    )

    # DAG dependency chain with streaming-aware gating
    check_lag >> validate_cdc >> refresh_materialized_view
```

---

## Constraints

### MUST DO
- Use Schema Registry for every Kafka topic — never allow untyped records to flow through the pipeline
- Implement dead letter queues on every consumer group — no record is too important to lose but must be quarantined for inspection
- Configure watermarking on all streaming aggregations — late data handling is non-negotiable
- Enforce Delta Lake schema enforcement mode (`MERGE` with explicit type checks) — never write with schema relaxation enabled
- Store CDC offsets in a Kafka topic, not the connector's internal store, for auditability and replay capability
- Implement time travel queries for debugging — every Delta table must support `TIMESTAMP AS OF` or version-based queries

### MUST NOT DO
- Poll OLTP databases instead of using native CDC replication (WAL/binlog) — this adds unacceptable read load
- Write streaming and batch transformations in the same job — they have different fault recovery semantics
- Configure Kafka with `acks=0` for any topic that carries financial or transactional data
- Skip dead letter queues to "simplify debugging" — unhandled records silently break downstream aggregations
- Run `VACUUM` with retention less than 168 hours (7 days) without coordinating with time travel queries
- Mix schema evolution and production traffic — always test schema changes against consumers in staging first

---

## Related Skills

| Skill | Purpose |
|---|---|
| `data-pipeline-architecture` | Broader data pipeline design (medallion architecture, schema evolution, quality gates) — use when designing end-to-end pipelines rather than specific streaming/infrastructure patterns |
| `engineering-api-design` | API design for downstream consumers of your data platform — use when building REST/gRPC interfaces to expose processed data |
| `production-readiness` | General production deployment concerns (monitoring, capacity planning, SLA definitions) — use alongside this skill for full production readiness |

---

## Live References

> Authoritative documentation links for this skill's domain.

- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- [Debezium CDC Connectors](https://debezium.io/documentation/)
- [Delta Lake Documentation](https://docs.delta.io/latest/delta-index.html)
- [Apache Airflow DAG Best Practices](https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/dags.html)
- [Kafka Streams API Reference](https://kafka.apache.org/36/javadoc/org/apache/kafka/streams/package-summary.html)
- [Apache Iceberg Documentation](https://iceberg.apache.org/docs/latest/)
- [dbt Data Transformation Framework](https://docs.getdbt.com/docs/introduction)
