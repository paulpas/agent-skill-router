---




name: serverless-architecture-patterns
description: Implements serverless architecture patterns including AWS Lambda function design, event-driven triggers (S3, DynamoDB streams, SQS/SNS), Serverless API Gateway integration, cold start optimization, distributed tracing, and multi-region deployment strategies for cost-effective scalable applications.
license: MIT
compatibility: opencode
archetypes:
  - tactical
  - generation
  - strategic
anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
response_profile:
  verbosity: low
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: coding
  triggers: serverless architecture, AWS Lambda, Cloudflare Workers, edge computing, cold start optimization, provisioned concurrency, Serverless API Gateway, how do I build serverless applications
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: microservices-architecture, event-driven-architecture, cloud-native-architecture




---





# Serverless Architecture Patterns

Implements serverless architecture patterns using managed compute services (AWS Lambda, Cloudflare Workers, Google Cloud Functions, Azure Functions) that execute code in response to events without requiring server provisioning. When loaded, this skill makes the model design idempotent function handlers, configure event source mappings, optimize cold starts, implement distributed observability, and architect multi-region serverless deployments for elastic, cost-efficient systems.

## TL;DR Checklist

- [ ] Design each Lambda function with a single responsibility — never create god-functions that handle multiple domains
- [ ] Implement idempotent handlers with deduplication keys for event-driven processing (at-least-once delivery guarantee)
- [ ] Optimize cold starts: keep deployment package under 50MB, use provisioned concurrency for latency-sensitive paths
- [ ] Use event source mapping with batch window tuning (SQS batch size, DynamoDB stream batching)
- [ ] Implement structured logging with correlation IDs for distributed tracing across function chains
- [ ] Set appropriate memory allocation — Lambda pricing is per-millisecond of execution, so right-size CPU and memory together

---

## When to Use

Use this skill when:

- Workload has unpredictable or bursty traffic patterns where auto-scaling is critical (e.g., flash sales, batch processing windows)
- You want to minimize operational overhead by eliminating server management — no OS patching, capacity planning, or cluster administration
- Event-driven processing is needed: S3 uploads triggering image transforms, DynamoDB changes propagating search index updates, scheduled tasks running nightly reports
- Development speed is prioritized over infrastructure control — you want to ship features faster with managed services
- Cost efficiency for intermittent workloads matters — pay only for actual execution time rather than idle server hours

---

## When NOT to Use

Avoid this skill for:

- Long-running processes exceeding 15 minutes (Lambda maximum timeout) — use ECS/Fargate or EC2 Auto Scaling instead
- Stateful applications requiring persistent local storage between invocations — Lambda is stateless by design; use DynamoDB or ElastiCache instead
- Workloads with consistent, predictable traffic where reserved capacity would be cheaper — provisioned instances or containers may be more cost-effective at scale
- Applications needing fine-grained control over the runtime environment (custom OS kernels, specific library versions not available in Lambda runtimes)

---

## Core Workflow

1. **Define Event Sources** — Identify all triggers that invoke your functions: API Gateway HTTP requests, S3 object uploads, DynamoDB table changes, SQS message queues, CloudWatch Events (scheduled cron). Each event source maps to a dedicated Lambda function handler with its own input schema and error handling strategy.

2. **Design Function Handlers** — Implement idempotent handler functions with proper error handling. Each function should have a single responsibility and process its event payload independently. Use module-level initialization for resource caching to reduce cold start latency, and always propagate errors so Lambda can trigger retries or DLQ routing.

3. **Configure Event Source Mapping** — Set up SQS queue as a Lambda trigger with batch size tuning (default 10, max 10,000 for SQS), batch window of up to 5 minutes for throughput optimization, and maximum batch size configuration for DynamoDB streams. Always configure a dead letter queue for failed invocations.

4. **Optimize for Cold Starts** — Reduce package size by excluding unnecessary dependencies (use `pip install --target` in a virtualenv, prune with `aws-lambda-builders`), use Lambda Layers for shared code, and configure provisioned concurrency for critical paths requiring under 100ms cold starts. Consider container image deployment when you need custom runtimes or larger binaries.

5. **Add Observability** — Integrate AWS X-Ray for distributed tracing across function chains, implement structured JSON logging with correlation IDs propagated through all API Gateway responses, and set up CloudWatch Alarms for error rate anomalies, duration p95 spikes, and provisioned concurrency utilization below 20%.

---

## Implementation Patterns

### Pattern 1: Idempotent Lambda Handler with Deduplication

AWS guarantees at-least-once delivery for SQS, SNS, and DynamoDB streams. Implement idempotency using a deduplication table to prevent duplicate processing of the same event. The pattern uses DynamoDB conditional writes with TTL-based expiration to track processed event IDs.

```python
"""
AWS Lambda handler with idempotency guarantee for event-driven serverless processing.
Uses DynamoDB-based deduplication to handle at-least-once delivery from SQS/SNS/DynamoDB streams.
"""
import json
import logging
import os
import time
import uuid
from decimal import Decimal
from typing import Any, Dict, Optional

import boto3
from boto3.dynamodb.conditions import Attr, Key

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Configuration from environment — never hardcoded
IDEMPOTENCY_TABLE: str = os.environ.get("IDEMPOTENCY_TABLE", "idempotency-store")
LAMBDA_FUNCTION_NAME: str = os.environ.get("AWS_LAMBDA_FUNCTION_NAME", "unknown")

dynamodb = boto3.resource("dynamodb")
dedup_table = dynamodb.Table(IDEMPOTENCY_TABLE)


def lambda_handler(event: dict, context: Any) -> dict:
    """
    Main Lambda handler with idempotency support.
    
    Handles at-least-once delivery from SQS/SNS/DynamoDB streams by using
    a deduplication table to prevent duplicate processing of the same event.
    
    Args:
        event: The Lambda event payload (SQS records, API Gateway request, etc.)
        context: Lambda runtime context object with invocation metadata
    
    Returns:
        API Gateway-compatible response dict with statusCode and body
    """
    # Extract unique event identifier for deduplication
    event_id: str = _extract_event_id(event, context)
    
    # Check if this event has already been successfully processed
    if _is_already_processed(event_id):
        logger.info("Event %s already processed — idempotent skip", event_id)
        return _success_response("idempotent_skip", {"event_id": event_id})
    
    try:
        # Mark as processing immediately to prevent concurrent duplicate invocations
        _mark_as_processing(event_id, ttl_seconds=3600)  # 1 hour TTL
        
        # Execute core business logic
        result = _process_event(event, context)
        
        # Mark as completed and store result for idempotency verification
        _mark_as_completed(event_id, result)
        
        return _success_response("processed", {"event_id": event_id, "result": result})
    
    except Exception as e:
        logger.error("Event %s processing failed: %s", event_id, str(e), exc_info=True)
        # Re-raise so Lambda can retry (up to 3 times by default) or route to DLQ
        raise


def _extract_event_id(event: dict, context: Any) -> str:
    """
    Extract or generate a unique ID from the event payload for deduplication.
    
    Tries multiple common patterns for different AWS event source types.
    Falls back to Lambda's aws_request_id when no other ID is available.
    """
    # SQS, DynamoDB Streams, Kinesis — first record carries the source ID
    if "Records" in event:
        record: dict = event["Records"][0]
        return (
            record.get("messageId")
            or record.get("eventID", str(uuid.uuid4()))
        )
    
    # Direct invocation with eventId field (e.g., EventBridge)
    if "eventId" in event:
        return event["eventId"]
    
    # API Gateway — combine HTTP method, path, and request ID
    if "requestContext" in event:
        ctx = event["requestContext"]
        method = ctx.get("http", {}).get("method", ctx.get("httpMethod", "UNKNOWN"))
        path = event.get("rawPath", ctx.get("path", "/"))
        return f"{method}:{path}:{context.aws_request_id}"
    
    # Fallback: use Lambda's unique request ID
    return context.aws_request_id


def _is_already_processed(event_id: str) -> bool:
    """Check if event was already successfully completed, using DynamoDB conditional read."""
    try:
        response = dedup_table.get_item(
            Key={"pk": f"IDEMPOTENCY#{event_id}", "sk": "status"}
        )
        item = response.get("Item")
        return item is not None and item.get("status") == "COMPLETED"
    except Exception:
        # If dedup table is unreachable, fail open — safe to re-process rather than lose data
        logger.warning("Dedup table unreachable for %s — assuming not processed", event_id)
        return False


def _mark_as_processing(event_id: str, ttl_seconds: int = 3600) -> None:
    """Mark event as being processed to prevent concurrent duplicate invocations."""
    dedup_table.put_item(
        Item={
            "pk": f"IDEMPOTENCY#{event_id}",
            "sk": "status",
            "status": "PROCESSING",
            "function": LAMBDA_FUNCTION_NAME,
            "timestamp": time.time(),
            "ttl": int(time.time()) + ttl_seconds,
        }
    )


def _mark_as_completed(event_id: str, result: dict) -> None:
    """Mark event as successfully completed and store the result."""
    dedup_table.put_item(
        Item={
            "pk": f"IDEMPOTENCY#{event_id}",
            "sk": "status",
            "status": "COMPLETED",
            "function": LAMBDA_FUNCTION_NAME,
            "timestamp": time.time(),
            "result": json.dumps(result, default=str),
            "ttl": int(time.time()) + 86400,  # 24-hour TTL
        }
    )


def _process_event(event: dict, context: Any) -> dict:
    """Core business logic dispatcher — route based on event type."""
    logger.info("Processing event in %s (memory_limit: %dMB)", context.function_name, context.memory_limit_in_mb)
    
    if "Records" in event:
        # Batch source: SQS, DynamoDB Streams, Kinesis
        processed = []
        for record in event["Records"]:
            body_str: str = record.get("body", "{}")
            try:
                body = json.loads(body_str) if isinstance(body_str, str) else body_str
            except json.JSONDecodeError:
                logger.warning("Invalid JSON in record %s", record.get("messageId"))
                continue
            processed.append(_process_single_message(body))
        return {"count": len(processed), "processed": processed}
    
    # Single-event source: direct invocation, EventBridge, API Gateway
    return _process_single_event(event)


def _process_single_message(body: dict) -> dict:
    """Process a single message from a batch. Business logic goes here."""
    event_type = body.get("type", "unknown")
    
    if event_type == "order.created":
        return {"status": "handled", "action": "process_order", "data": body}
    elif event_type == "payment.completed":
        return {"status": "handled", "action": "fulfill_payment", "data": body}
    else:
        logger.warning("Unhandled message type: %s", event_type)
        return {"status": "unhandled", "event_type": event_type, "data": body}


def _process_single_event(event: dict) -> dict:
    """Process a single event payload."""
    return {"status": "handled", "event_type": event.get("type", "unknown")}


def _success_response(status: str, data: dict) -> dict:
    """Standard success response format compatible with API Gateway HTTP API."""
    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({"status": status, "data": data}),
    }
```

### Pattern 2: Cold Start Optimization with Provisioned Concurrency

Module-level code executes only during cold starts. Use lazy initialization to cache clients and connections at module scope, and configure provisioned concurrency for latency-sensitive paths that cannot tolerate >100ms cold start delays.

```python
"""
Cold start optimization patterns for AWS Lambda.
Demonstrates initialization caching, package size reduction strategies,
and connection reuse via module-level lazy initialization.
"""
import json
import os
import time
from typing import Any, Dict, List

# ── Module-level cache (initialized once per container during cold start) ──
_client_cache: Dict[str, Any] = None
_db_connection_pool: Dict[str, Any] = None


def lambda_handler(event: dict, context: Any) -> dict:
    """
    Optimized Lambda handler with lazy initialization pattern.
    
    Module-level code runs only during cold starts. Warm invocations skip
    initialization and reuse cached resources, reducing cold start latency
    from ~2000ms to ~50ms for Python 3.x runtimes.
    
    Key optimization: clients are initialized once per container and reused
    across all subsequent invocations on that warm container.
    """
    # Lazy initialization — only runs during the first invocation on a new container
    global _client_cache
    if _client_cache is None:
        _initialize_clients()
    
    start = time.perf_counter_ns()
    
    result = _handle_request(event, context)
    
    elapsed_ms = (time.perf_counter_ns() - start) / 1_000_000
    
    # Structured logging for X-Ray integration and CloudWatch Insights
    print(json.dumps({
        "level": "INFO",
        "message": "lambda_execution",
        "function": context.function_name,
        "duration_ms": round(elapsed_ms, 1),
        "memory_mb_used": context.memory_limit_in_mb,
        "request_id": context.aws_request_id,
    }))
    
    return result


def _initialize_clients() -> None:
    """
    Initialize shared AWS SDK clients and connection pools.
    Only runs on cold start — subsequent invocations reuse these objects.
    """
    global _client_cache, _db_connection_pool
    
    import boto3
    from botocore.config import Config
    
    config = Config(
        retries={"max_attempts": 3, "mode": "adaptive"},
        connect_timeout=5,
        read_timeout=10,
        max_pool_connections=25,
    )
    
    _client_cache = {
        "sqs": boto3.client("sqs", config=config),
        "dynamodb": boto3.client("dynamodb", config=config),
        "s3": boto3.client("s3", config=config),
        "sns": boto3.client("sns", config=config),
        "events": boto3.client("events", config=config),
    }
    
    # Pre-warm database connection pool for RDS Proxy usage
    _db_connection_pool = {
        "max_connections": 25,
        "initialized_at": time.time(),
        "host": os.environ.get("RDS_PROXY_ENDPOINT"),
    }
    
    print(f"[INIT] Initialized {len(_client_cache)} AWS clients")


def _handle_request(event: dict, context: Any) -> dict:
    """Route and process the event using pre-initialized cached clients."""
    if "Records" in event:
        return _process_batch(event["Records"], context.aws_request_id)
    
    return {"status": "processed", "request_id": context.aws_request_id}


def _process_batch(records: list, request_id: str) -> dict:
    """Process SQS/DynamoDB stream batch using cached clients — no new connections."""
    results = []
    sqs_client = _client_cache["sqs"] if _client_cache else None
    topic_arn = os.environ.get("SNS_TOPIC_ARN")
    
    for record in records[:10]:  # Process up to 10 messages per invocation
        try:
            body_str = record.get("body", "{}")
            body = json.loads(body_str) if isinstance(body_str, str) else body_str
            message_id = record.get("messageId", "unknown")
            
            # Use cached SNS client — no connection overhead on warm invocations
            if _client_cache and topic_arn:
                try:
                    _client_cache["sns"].publish(
                        TopicArn=topic_arn,
                        Message=json.dumps({"event_id": request_id, "record": body}),
                    )
                except Exception as e:
                    print(f"Failed to publish SNS notification: {e}")
            
            results.append({
                "status": "processed",
                "record_id": message_id,
                "request_id": request_id,
            })
        except Exception as e:
            print(f"Failed to process record {record.get('messageId')}: {e}")
            results.append({
                "status": "failed",
                "record_id": record.get("messageId"),
                "error": str(e),
            })
    
    return {"count": len(results), "results": results, "request_id": request_id}


# ── BAD vs GOOD: Cold Start Anti-Patterns ──────────────────────────────

# ❌ BAD: Initializing clients inside the handler — runs on EVERY invocation,
#    including warm ones. Adds ~50-200ms to every single execution.
def bad_cold_start_handler(event: dict, context: Any) -> dict:
    import boto3  # Imported on every invocation
    sqs = boto3.client("sqs")  # New client created on every invocation
    ddb = boto3.resource("dynamodb")  # New resource on every invocation
    return {"status": "processed"}

# ✅ GOOD: Module-level caching — clients initialized once per container,
#    reused across thousands of warm invocations.
# (See _initialize_clients() above)
```

### Pattern 3: Serverless API Gateway with Request/Response Transformation

Unified Lambda handler for HTTP API routing with path-based dispatch, correlation ID propagation for distributed tracing, and standardized error responses. HTTP APIs are preferred over REST APIs for new projects — they are ~70% cheaper and have lower latency.

```python
"""
Serverless API pattern using AWS Lambda + API Gateway (HTTP API).
Demonstrates path-based routing, request validation, correlation ID propagation,
and response transformation with X-Ray trace context injection.
"""
import json
import os
import time
from datetime import datetime, timezone
from typing import Any, Dict

# Correlation ID header name — propagated across all service boundaries
CORRELATION_ID_HEADER: str = "X-Correlation-ID"


def lambda_handler(event: dict, context: Any) -> dict:
    """
    Unified Lambda handler for API Gateway HTTP API.
    
    Routes requests based on path and method to specific domain handlers.
    Injects correlation ID into response headers for distributed tracing
    across the entire serverless application stack.
    """
    http_ctx = event.get("requestContext", {}).get("http", {})
    http_method: str = http_ctx.get("method", "GET")
    path: str = event.get("rawPath", "/").rstrip("/") or "/"
    
    # Extract or generate correlation ID for distributed tracing
    headers = event.get("headers", {}) or {}
    correlation_id = (
        headers.get(CORRELATION_ID_HEADER, "")
        or headers.get("x-correlation-id", "")
        or context.aws_request_id
    )
    
    start_time: float = time.time()
    
    try:
        # Path-based routing to domain handlers
        body = _route(http_method, path, event)
        execution_ms = (time.time() - start_time) * 1000
        
        response: dict = {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                CORRELATION_ID_HEADER: correlation_id,
                "X-Execution-Time": f"{execution_ms:.0f}ms",
                "X-Amzn-Trace-Id": context.aws_request_id,
            },
            "body": json.dumps(body, default=str),
        }
        
        return response
    
    except ValueError as e:
        return _error_response(400, str(e), correlation_id)
    except PermissionError as e:
        return _error_response(403, str(e), correlation_id)
    except Exception as e:
        print(f"[ERROR] {http_method} {path}: {e}")
        return _error_response(500, "Internal Server Error", correlation_id)


def _route(method: str, path: str, event: dict) -> dict:
    """Route HTTP request to the appropriate domain handler."""
    # Health check — minimal invocation for load balancers and canaries
    if path == "/health":
        return _handle_health()
    
    # Product endpoints
    if path.startswith("/products"):
        suffix = path[len("/products"):] or ""
        return _handle_products(method, suffix, event)
    
    # Order endpoints
    if path.startswith("/orders"):
        suffix = path[len("/orders"):] or ""
        return _handle_orders(method, suffix, event)
    
    # Not found — use structured 404 response
    raise ValueError(f"Route not found: {method} {path}")


def _handle_health() -> dict:
    """Health check endpoint — returns service status with runtime diagnostics."""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "function_name": os.environ.get("AWS_LAMBDA_FUNCTION_NAME", "unknown"),
        "memory_limit_mb": int(os.environ.get("AWS_LAMBDA_FUNCTION_MEMORY_SIZE", 0)),
    }


def _handle_products(method: str, suffix: str, event: dict) -> dict:
    """Handle product CRUD operations via DynamoDB."""
    import boto3
    
    dynamodb = boto3.resource("dynamodb")
    table_name: str = os.environ["PRODUCTS_TABLE"]
    table = dynamodb.Table(table_name)
    
    if method == "GET" and not suffix:
        # List all products with optional category filter via GSI
        query_kwargs: dict = {"TableName": table_name}
        
        params = event.get("queryStringParameters", {}) or {}
        if "category" in params:
            query_kwargs["IndexName"] = "category-index"
            query_kwargs["KeyConditionExpression"] = "category = :cat"
            query_kwargs["ExpressionAttributeValues"] = {":cat": {"S": params["category"]}}
        
        response = table.query(**query_kwargs)
        return {"items": response.get("Items", []), "count": len(response.get("Items", []))}
    
    elif method == "GET" and suffix:
        # Get single product by ID
        product_id = suffix.lstrip("/")
        response = table.get_item(Key={"product_id": product_id})
        item = response.get("Item")
        if not item:
            raise ValueError(f"Product not found: {product_id}")
        return item
    
    elif method == "POST":
        body = json.loads(event["body"])
        product = {**body, "product_id": f"prod_{int(time.time())}"}
        table.put_item(Item=product)
        return {"item": product, "status": "created"}
    
    raise ValueError(f"Unsupported method: {method}")


def _handle_orders(method: str, suffix: str, event: dict) -> dict:
    """Handle order CRUD operations — pattern mirrors products but with order schema."""
    # Implementation depends on your order management schema.
    # Apply the same routing + DynamoDB access pattern as _handle_products.
    raise NotImplementedError("Order handler — implement per domain schema")


def _error_response(status_code: int, message: str, correlation_id: str) -> dict:
    """Standardized error response for consistent client error handling."""
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            CORRELATION_ID_HEADER: correlation_id,
        },
        "body": json.dumps({
            "error": {
                "code": status_code,
                "message": message,
                "correlation_id": correlation_id,
            }
        }),
    }


# Import time module for _handle_health usage
import time
```

### Pattern 4: SQS Consumer with Batch Processing and Dead Letter Queue

Production SQS Lambda consumer implementing per-message error isolation, partial batch failure reporting, and DLQ routing. Failed messages are retried independently so a single bad record never blocks the entire batch.

```python
"""
SQS Lambda consumer with batch processing, dead letter queue (DLQ),
and partial batch failure reporting for high-throughput event processing.
"""
import json
import logging
import os
from typing import Any, Dict, List

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event: dict, context: Any) -> dict:
    """
    SQS Lambda consumer with per-message error isolation and DLQ routing.
    
    Key design decisions:
    - Each message is processed independently — one failure never blocks the batch
    - Partial batch failures are reported so SQS can retry only failed messages
    - Failed messages are moved to a Dead Letter Queue (DLQ) for later analysis
    - Batch size and window are tuned per throughput/latency requirements
    
    AWS Lambda automatically batches SQS messages based on:
    - Maximum batch size (configurable 1-10,000 for SQS)
    - Batch window (default 0 seconds, up to 5 minutes for throughput)
    
    To enable partial batch failure reporting in CloudFormation/SAM:
      FunctionConfigType: Regular
    
    To disable (legacy behavior — all-or-nothing):
      FunctionConfigType: ReducedSuccessReporting
    """
    dlq_url: str = os.environ.get("SQS_DLQ_URL", "")
    records: list[dict] = event.get("records", [])
    batch_size: int = len(records)
    
    logger.info("Processing SQS batch of %d messages in %s", batch_size, context.function_name)
    
    successful_ids: List[str] = []
    failed_ids: List[str] = []
    
    for record in records:
        try:
            body_str: str = record.get("body", "{}")
            body: dict = json.loads(body_str) if isinstance(body_str, str) else body_str
            message_id: str = record.get("messageId", "unknown")
            
            # Process the individual message — isolated from other messages in batch
            _process_message(body, context.aws_request_id)
            
            successful_ids.append(message_id)
            
        except Exception as e:
            logger.error(
                "Failed to process SQS message %s: %s",
                record.get("messageId"), str(e), exc_info=True,
            )
            failed_ids.append(record.get("messageId", "unknown"))
    
    # Log batch processing summary for CloudWatch Metrics and X-Ray subsegments
    logger.info(
        "Batch complete: %d succeeded, %d failed out of %d total",
        len(successful_ids), len(failed_ids), batch_size,
    )
    
    # Move failed messages to DLQ for post-mortem analysis
    if failed_ids and dlq_url:
        _move_to_dlq(records, successful_ids, dlq_url)
    
    return {
        "statusCode": 200,
        "body": json.dumps({
            "processed": len(successful_ids),
            "failed": len(failed_ids),
            "total": batch_size,
        }),
    }


def _process_message(body: dict, request_id: str) -> None:
    """
    Process a single SQS message. Must be idempotent — AWS may deliver the same
    message multiple times (at-least-once delivery).
    """
    logger.info("Processing message %s", request_id)
    
    event_type = body.get("type", "unknown")
    
    if event_type == "order.created":
        _handle_order_created(body)
    elif event_type == "payment.completed":
        _handle_payment_completed(body)
    elif event_type == "inventory.updated":
        _handle_inventory_updated(body)
    else:
        logger.warning("Unhandled event type in message %s: %s", request_id, event_type)


def _handle_order_created(order: dict) -> None:
    """Persist new order to DynamoDB with idempotency via unique order_id."""
    import boto3
    
    dynamodb = boto3.resource("dynamodb")
    table_name: str = os.environ.get("ORDERS_TABLE", "orders")
    table = dynamodb.Table(table_name)
    
    # Use the order's own ID as the primary key for deduplication
    table.put_item(Item={
        "order_id": order["order_id"],
        "status": "processing",
        "customer_id": order.get("customer_id"),
        "items_count": len(order.get("items", [])),
        "created_at": order.get("created_at"),
        "processed_by_lambda": True,
    }, ConditionExpression="attribute_not_exists(order_id)")


def _handle_payment_completed(payment: dict) -> None:
    """Update order status to paid when payment event arrives."""
    # Update the order record with payment confirmation
    pass


def _handle_inventory_updated(inventory: dict) -> None:
    """Handle inventory change events — update stock levels in DynamoDB."""
    pass


def _move_to_dlq(records: list, success_ids: List[str], dlq_url: str) -> None:
    """Move failed SQS messages to the Dead Letter Queue for later analysis and replay."""
    import boto3
    
    sqs = boto3.client("sqs")
    
    # Identify records that were NOT successfully processed
    failed_records = [
        r for r in records if r.get("messageId") not in success_ids
    ]
    
    for record in failed_records:
        try:
            message_attrs: dict[str, Any] = {
                "original-queue": {"DataType": "String", "StringValue": os.environ.get("SQS_QUEUE_URL", "")},
            }
            
            # Track remaining retry count for prioritization
            receive_count = int(record.get("attributes", {}).get("ApproximateReceiveCount", 0) or 0)
            message_attrs["retry-count"] = {"DataType": "Number", "StringValue": str(receive_count)}
            
            sqs.send_message(
                QueueUrl=dlq_url,
                MessageBody=record.get("body", "{}"),
                MessageAttributes=message_attrs,
            )
        except Exception as e:
            logger.error("Failed to move message to DLQ: %s", str(e))
```

### Pattern 5: Distributed Tracing with Structured Logging and Correlation IDs

Production observability setup using structured JSON logging that X-Ray parses into trace subsegments, correlation ID propagation through all API boundaries, and CloudWatch Insights queries for operational dashboards.

```python
"""
Distributed tracing implementation for serverless architectures.
Uses structured JSON logging + AWS X-Ray for end-to-end request tracing.
"""
import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any


class TraceLogger:
    """
    Structured logger that injects trace context into every log line
    and writes to both stdout (CloudWatch) and X-Ray subsegments.
    
    Usage:
        tracer = TraceLogger(__name__)
        tracer.info("Processing order", extra={"order_id": "ord_123"})
    """
    
    def __init__(self, name: str):
        self._logger = logging.getLogger(name)
        self._trace_id = os.environ.get("_X_AMZN_TRACE_ID", "")
        self._request_id = None
        self._correlation_id = None
    
    def _ensure_context(self) -> None:
        """Lazily initialize request and correlation IDs on first use."""
        import boto3
        from botocore.config import Config
        
        if self._request_id is None:
            # In Lambda, these are available via os.environ at invocation time
            self._request_id = os.environ.get("AWS_LAMBDA_LOG_STREAM_NAME", "unknown")
        
        if self._correlation_id is None:
            self._correlation_id = str(uuid.uuid4())
    
    def _build_record(self, level: str, message: str, extra: dict | None = None) -> dict:
        """Build a structured log record with trace context."""
        self._ensure_context()
        
        record: dict = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": level,
            "message": message,
            "function": os.environ.get("AWS_LAMBDA_FUNCTION_NAME", "unknown"),
            "request_id": self._request_id,
            "correlation_id": self._correlation_id,
            "trace_id": self._trace_id,
        }
        
        if extra:
            record.update(extra)
        
        return record
    
    def info(self, message: str, extra: dict | None = None) -> None:
        self._logger.info(json.dumps(self._build_record("INFO", message, extra)))
    
    def error(self, message: str, extra: dict | None = None) -> None:
        self._logger.error(json.dumps(self._build_record("ERROR", message, extra)))
    
    def warning(self, message: str, extra: dict | None = None) -> None:
        self._logger.warning(json.dumps(self._build_record("WARNING", message, extra)))


# ── X-Ray Subsegment Builder ──────────────────────────────────────────

def create_subsegment(name: str, metadata: dict | None = None) -> dict:
    """
    Build an X-Ray subsegment for the current AWS X-Ray daemon.
    
    The subsegment is written to the special /var/runtime file that the
    X-Ray daemon reads asynchronously. This pattern works without any
    additional SDK dependencies.
    
    Args:
        name: Subsegment name (e.g., "SqsConsumer", "DynamoDB.Query")
        metadata: Optional key-value pairs for segment metadata
    
    Returns:
        The subsegment dict (also written to X-Ray daemon pipe)
    """
    import random
    
    trace_id = os.environ.get("_X_AMZN_TRACE_ID", "")
    parent_id = os.environ.get("_X_AMZN_TRACE_PARENT", "")
    
    # Parse the X-Ray trace ID from the environment variable
    # Format: Root=1-5759e988-bd862e3fe1be46a994272793;Parent=557abcec39d189c0;Sampled=1
    if trace_id.startswith("Root="):
        trace_id = trace_id.split(";")[0].replace("Root=", "")
    
    segment: dict = {
        "id": hex(random.getrandbits(64))[2:],
        "name": name,
        "trace_id": trace_id or str(uuid.uuid4()),
        "start_time": datetime.now(timezone.utc).timestamp(),
        "end_time": None,  # Filled in when subsegment closes
        "parents": [parent_id] if parent_id else [],
        "metadata": {
            "default": metadata or {},
        },
    }
    
    return segment


# ── CloudWatch Insights Query Patterns ────────────────────────────────

# Use these query patterns in CloudWatch Logs Insights to debug serverless issues:

# ERROR_RATE_BY_FUNCTION — Find functions with highest error rates:
# fields @timestamp, @message, @logStream
# | filter @message like /"level":"ERROR"/
# | stats count() as errors by bin(5m), aws.lambda.function
# | sort errors desc

# SLOW_INVOCATIONS — Find slow Lambda invocations (> 1s):
# fields @timestamp, @message
# | filter @message like /duration_ms/
# | parse @message /"duration_ms":*(?<duration_ms>[0-9.]+)/*
# | filter duration_ms > 1000
# | sort duration_ms desc

# CORRELATION_TRACE — Follow a single request across services:
# fields @timestamp, @message, correlation_id
# | filter correlation_id = "abc-123-def"
# | sort @timestamp asc


# ── BAD vs GOOD: Structured Logging Anti-Patterns ─────────────────────

# ❌ BAD: Plain text logging — cannot be parsed by CloudWatch Insights or X-Ray.
#    Makes distributed tracing and operational queries impossible.
def bad_logging_example():
    import logging
    logger = logging.getLogger(__name__)
    
    # No trace context, no structure — these log lines are unqueryable
    logger.info(f"Processing request for user {user_id}")  # User ID in message text
    logger.info(f"Database query took {elapsed}ms")        # Timing in free text
    
    # ❌ Also bad: Logging secrets or PII in plain text
    logger.info(f"User email: {user_email}, password hash: {hash}")

# ✅ GOOD: Structured JSON logging with trace context and typed fields.
#    Parseable by CloudWatch Insights, X-Ray, and external log aggregators.
# (See TraceLogger class above)
```

---

## Constraints

### MUST DO
- Design each Lambda function for a single responsibility — god-functions create coupling and increase cold start times proportional to initialization complexity
- Implement idempotent handlers using deduplication tables or message IDs — AWS guarantees at-least-once delivery, so duplicates will occur with SQS/SNS/DynamoDB Streams
- Right-size memory allocation based on actual CPU usage measurements from CloudWatch — Lambda pricing is proportional to memory, and CPU scales linearly with memory allocation (128MB = 0.25 vCPU, 1792MB = 3.75 vCPU)
- Use provisioned concurrency for latency-sensitive paths requiring under 100ms cold starts; calculate minimum provisioned capacity based on baseline traffic patterns during peak hours
- Configure dead letter queues (DLQ) for all SQS and Kinesis event sources — failed messages must be preserved for analysis, not silently dropped

### MUST NOT DO
- Block on synchronous HTTP calls to external services inside Lambda — use async SDK calls or offload to a message queue; set timeout to 5s max for any outbound call
- Store state between invocations beyond module-level variables and environment variables — cold starts reset the container filesystem (ephemeral /tmp is only available during the current container's lifetime)
- Set memory to the maximum 10GB when your function only needs 512MB — pricing is per-GB-second, so a 2x memory overestimation doubles cost without performance benefit
- Use API Gateway REST APIs for new projects — prefer HTTP APIs which are ~70% cheaper and have lower latency; only use REST APIs when you need request/response validation at the gateway or WAF integration
- Hardcode AWS region or account IDs in Lambda code — use environment variables or IAM role-based access to maintain portability across environments

---

## Output Template

When this skill is active, output must include:

1. **Lambda Handler Code** — Python implementation with proper error handling, idempotency checks via deduplication, structured logging via TraceLogger, and typed signatures throughout
2. **Event Source Configuration** — SQS/DynamoDB/S3 trigger setup with batch size tuning parameters (batch window, maximum batch size, transformation batch size), DLQ ARN reference, and function configuration type
3. **Cold Start Optimization Strategy** — Package sizing targets (< 50MB uncompressed), provisioned concurrency settings based on baseline traffic analysis, initialization caching pattern, and Lambda Layer decomposition for shared dependencies
4. **Observability Setup** — X-Ray tracing enabled at function level, structured JSON logging with correlation ID injection, CloudWatch Alarm definitions for error rate > 1%, duration p95 > target threshold, and provisioned concurrency utilization < 20%

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `microservices-architecture` | Serverless functions can serve as individual microservice backends — understand service boundaries and inter-service communication patterns |
| `event-driven-architecture` | Serverless Lambda is an event consumer — SQS, DynamoDB Streams, Kinesis, and EventBridge are the delivery mechanisms that connect services |
| `cloud-native-architecture` | Serverless is one of the core cloud-native paradigms alongside container orchestration and service mesh — understand when to choose which approach |

---

## Live References

> Authoritative documentation links for serverless architecture. The model follows these at load time to resolve external references and inline content.

- [AWS Lambda Developer Guide](https://docs.aws.amazon.com/lambda/latest/dg/)
- [AWS Lambda Function Configuration Limits](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html)
- [API Gateway HTTP API Documentation](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vs-rest.html)
- [AWS X-Ray SDK for Python](https://docs.aws.amazon.com/xray-sdk-for-python/latest/reference/)
- [AWS Lambda Layers Documentation](https://docs.aws.amazon.com/lambda/latest/dg/chapter-layers.html)
- [Amazon SQS Dead Letter Queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloper/sqs-dead-letter-queue.html)
- [CloudWatch Logs Insights Query Syntax](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html)
