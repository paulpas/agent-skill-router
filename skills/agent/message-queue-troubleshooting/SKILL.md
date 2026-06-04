---
name: message-queue-troubleshooting
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent message queue troubleshooting for Kafka, RabbitMQ,
  SQS, and NATS clusters with diagnostic commands, dead letter handling, and backlog
  resolution
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: code
  related-skills: agent-nats
  role: implementation
  scope: implementation
  triggers: message queue troubleshooting, kafka cluster, rabbitmq queues, dead letter,
    sqs visibility, message backlog, nats streaming, how do i debug queues
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  version: 1.0.0
------
# Message Queue Troubleshooting

Diagnoses and resolves issues across Kafka, RabbitMQ, SQS, and NATS message queues with real diagnostic commands, dead letter queue analysis, visibility timeout fixes, and backlog handling strategies.

## TL;DR Checklist

- [ ] Check cluster health before investigating individual queues
- [ ] Verify consumer group status and lag metrics
- [ ] Inspect dead letter queues for error patterns
- [ ] Validate visibility timeout settings against processing duration
- [ ] Analyze message backlog trends before scaling
- [ ] Confirm network connectivity to queue brokers
- [ ] Review broker logs for warnings and errors
- [ ] Test with sample messages after fixes

---

## When to Use

Use this skill when:

- Kafka consumers are not processing messages and you need to identify if it's a consumer group issue or broker problem
- RabbitMQ queues show message accumulation and you need to diagnose producer/consumer imbalances
- SQS messages become invisible but aren't being processed, indicating visibility timeout issues
- Message backlogs are growing and you need to determine root cause (slow consumers, high producers, or failures)
- Dead letter queues are filling and you need to understand why messages are being rejected
- NATS streaming clusters show message persistence issues or subscription problems

---

## When NOT to Use

Avoid this skill for:

- Application-level message handling bugs — use application debugging skills instead
- Message format validation issues — use data validation skills instead
- Simple message loss without queue infrastructure involvement
- Cases where you don't have access to queue broker admin commands
- Real-time trading scenarios where queue delay is expected — use monitoring skills instead

---

## Core Workflow

1. **Assess Cluster Health** — Check broker connectivity and overall cluster status.
   **Checkpoint:** All brokers responding and cluster state is healthy before proceeding.

2. **Identify Affected Queues** — List all queues and identify which are showing issues (backlog, no consumers, errors).
   **Checkpoint:** You have a clear list of problematic queues with their metrics.

3. **Check Consumer Status** — Verify consumers are connected, active, and not experiencing rebalances.
   **Checkpoint:** Consumer groups or queue consumers show expected state (connected, no errors).

4. **Inspect Dead Letter Queues** — Examine DLQ for failed messages and identify error patterns.
   **Checkpoint:** You understand the failure pattern causing messages to reach DLQ.

5. **Analyze Message Backlog** — Determine backlog growth rate and correlate with processing capacity.
   **Checkpoint:** You can distinguish between healthy accumulation and problematic backlog.

6. **Apply Resolution Strategy** — Implement fixes based on root cause (visibility timeout, scaling, DLQ processing).
   **Checkpoint:** Changes applied and verified with test message flow.

---

## Implementation Patterns

### Pattern 1: Kafka Cluster Diagnosis

**Problem:** Kafka consumers not processing messages, potential consumer group or partition issues.

```bash
# 1. Check cluster connectivity
kafka-broker-api-versions --bootstrap-server localhost:9092

# 2. List all topics
kafka-topics --bootstrap-server localhost:9092 --list

# 3. Describe topic to see partitions and replicas
kafka-topics --bootstrap-server localhost:9092 --describe --topic your-topic-name

# 4. Check consumer groups status
kafka-consumer-groups --bootstrap-server localhost:9092 --list

# 5. Inspect consumer group lag (critical metric)
kafka-consumer-groups --bootstrap-server localhost:9092 --describe --group your-consumer-group

# 6. View recent messages on topic (debugging only)
kafka-console-consumer --bootstrap-server localhost:9092 --topic your-topic-name --from-beginning --max-messages 100

# 7. Check broker logs for errors
tail -f /var/log/kafka/server.log | grep -i error

# 8. Verify ZooKeeper connectivity (for older Kafka versions)
kafka-zookeeper-shutil --bootstrap-server localhost:2181 --describe-node
```

**BAD:** Running consumer commands without checking cluster connectivity first
```bash
# ❌ BAD — will fail silently if broker is down
kafka-consumer-groups --bootstrap-server localhost:9092 --list
```

**GOOD:** Always verify cluster connectivity first
```bash
# ✅ GOOD — verify broker is responding
kafka-broker-api-versions --bootstrap-server localhost:9092
# If this works, proceed with consumer commands
kafka-consumer-groups --bootstrap-server localhost:9092 --list
```

---

### Pattern 2: RabbitMQ Queue Debugging

**Problem:** RabbitMQ queues accumulating messages, consumers not processing, dead letter issues.

```bash
# 1. Check RabbitMQ status
rabbitmqctl status

# 2. List all queues with message counts
rabbitmqctl list_queues name messages messages_ready messages_unacknowledged consumers

# 3. Describe specific queue
rabbitmqctl list_queues name messages messages_ready messages_unacknowledged consumers policy durable

# 4. List exchanges
rabbitmqctl list_exchanges name type durable internal

# 5. List bindings for a queue
rabbitmqctl list_bindings source_name destination_name destination_type routing_key

# 6. List consumers per queue
rabbitmqctl list_consumers queue_name consumer_details

# 7. Clear queue (DANGEROUS — use only in development)
rabbitmqctl purge_queue your-queue-name

# 8. List dead letter queues
rabbitmqctl list_queues name messages | grep dlq

# 9. Check broker logs
tail -f /var/log/rabbitmq/rabbit@*.log

# 10. Export queue definitions for analysis
rabbitmqctl export_definitions /tmp/definitions.json
```

**BAD:** Ignoring unacknowledged messages when diagnosing backlogs
```bash
# ❌ BAD — only shows ready messages, misses unacked that block processing
rabbitmqctl list_queues name messages
```

**GOOD:** Include all message states for complete picture
```bash
# ✅ GOOD — shows ready, unacked, and total for full picture
rabbitmqctl list_queues name messages messages_ready messages_unacknowledged
# If unacked > 0, consumers are not acking — check consumer code
```

---

### Pattern 3: SQS Visibility Timeout Fix

**Problem:** SQS messages become invisible but aren't processed, indicating visibility timeout issues.

```bash
# 1. List all queues
aws sqs list-queues

# 2. Get queue attributes (critical for visibility timeout)
aws sqs get-queue-attributes --queue-url https://sqs.region.amazonaws.com/account/queue-name --attribute-names All

# 3. Check specific attributes
aws sqs get-queue-attributes --queue-url https://sqs.region.amazonaws.com/account/queue-name --attribute-names VisibilityTimeout,MaximumMessageSize,MessageRetentionPeriod

# 4. View invisible messages (requires visibility timeout to expire first)
aws sqs receive-message --queue-url https://sqs.region.amazonaws.com/account/queue-name --max-number-of-messages 10 --attribute-names All

# 5. Check for dead letter queue configuration
aws sqs get-queue-attributes --queue-url https://sqs.region.amazonaws.com/account/queue-name --attribute-names RedrivePolicy

# 6. View DLQ messages
aws sqs receive-message --queue-url https://sqs.region.amazonaws.com/account/queue-name-dlq --max-number-of-messages 10

# 7. Calculate visibility timeout issue
# Formula: processing_time > visibility_timeout → message becomes visible again
# Example: 5-minute processing but 30-second timeout = message loops

# 8. Update visibility timeout
aws sqs set-queue-attributes --queue-url https://sqs.region.amazonaws.com/account/queue-name --attributes '{"VisibilityTimeout": "300"}'

# 9. Check SQS metrics in CloudWatch
aws cloudwatch get-metric-statistics --namespace AWS/SQS --metric-name ApproximateNumberOfMessagesVisible --dimensions Name=QueueName,Value=your-queue-name --start-time 2024-01-01T00:00:00Z --end-time 2024-01-01T01:00:00Z --period 300 --statistics Average

# 10. Send test message
aws sqs send-message --queue-url https://sqs.region.amazonaws.com/account/queue-name --message-body "test message"
```

**BAD:** Assuming invisible messages are being processed
```bash
# ❌ BAD — invisible messages may be stuck, not processed
aws sqs get-queue-attributes --queue-url URL --attribute-names ApproximateNumberOfMessages
# This only shows VISIBLE messages, not invisible stuck ones
```

**GOOD:** Check both visible and invisible counts
```bash
# ✅ GOOD — check both metrics
aws sqs get-queue-attributes --queue-url URL --attribute-names ApproximateNumberOfMessages,ApproximateNumberOfMessagesNotVisible
# If NotVisible > 0 and Visible = 0, messages are stuck in processing
```

---

### Pattern 4: NATS Streaming Diagnostic

**Problem:** NATS streaming subscriptions not receiving messages, persistence issues, channel backlogs.

```bash
# 1. Check NATS server status (for NATS 2.x)
nats server ps

# 2. List streams (for NATS JetStream)
nats stream ls

# 3. Describe stream for detailed info
nats stream info YOUR-STREAM

# 4. List consumers for a stream
nats consumer ls YOUR-STREAM

# 5. Describe consumer
nats consumer info YOUR-STREAM YOUR-CONSUMER

# 6. Check stream storage usage
nats stream info YOUR-STREAM | grep -i storage

# 7. View recent messages on stream
nats stream get YOUR-STREAM --last 10

# 8. Check for message backlog
nats stream info YOUR-STREAM | grep -A2 "State:"

# 9. List subjects with message counts
nats stream report

# 10. Check server logs
journalctl -u nats -f | grep -i error

# 11. Delete old messages to free space (caution)
nats stream purge YOUR-STREAM --before 2024-01-01

# 12. Export stream data
nats stream export YOUR-STREAM /tmp/stream-export
```

**BAD:** Not checking consumeracknowledgment settings
```bash
# ❌ BAD — may miss why messages aren't being processed
nats consumer info YOUR-STREAM YOUR-CONSUMER
# Without checking AckPolicy, you won't know if messages need explicit ack
```

**GOOD:** Verify consumer acknowledgment settings
```bash
# ✅ GOOD — check ack policy and pending messages
nats consumer info YOUR-STREAM YOUR-CONSUMER | grep -E "(AckPolicy|NumPending|NumAckPending)"
# If NumAckPending > 0, messages waiting for ack — consumer may be stuck
```

---

### Pattern 5: Message Backlog Analysis

**Problem:** Message backlogs growing across multiple queue types, need to diagnose root cause.

```bash
# Kafka: Check consumer group lag trends
kafka-consumer-groups --bootstrap-server localhost:9092 --describe --group your-group | awk '{print $5}' | tail -20

# RabbitMQ: Calculate queue growth rate
rabbitmqctl list_queues name messages | awk '{sum+=$2} END {print "Total messages:", sum}'

# SQS: Check approximate message counts over time
aws sqs get-queue-attributes --queue-url URL --attribute-names ApproximateNumberOfMessages --query 'Attributes.ApproximateNumberOfMessages'

# NATS: Check stream message count
nats stream info YOUR-STREAM | grep "Messages:" | awk '{print $2}'

# Cross-queue comparison script
cat <<'EOF' > /tmp/queue-diagnostic.sh
#!/bin/bash
echo "=== Kafka ==="
kafka-consumer-groups --bootstrap-server localhost:9092 --describe --group $1 2>/dev/null | grep -v "GROUP" | awk '{sum+=$5} END {print "Total Lag:", sum}'

echo "=== RabbitMQ ==="
rabbitmqctl list_queues name messages 2>/dev/null | tail -n +2 | awk '{sum+=$2} END {print "Total Messages:", sum}'

echo "=== SQS ==="
aws sqs get-queue-attributes --queue-url "$QUEUE_URL" --attribute-names ApproximateNumberOfMessages 2>/dev/null | grep -o '[0-9]*'

echo "=== NATS ==="
nats stream info "$STREAM" 2>/dev/null | grep "Messages:" | awk '{print $2}'
EOF

# Run with: bash /tmp/queue-diagnostic.sh consumer-group-name
```

**BAD:** Scaling producers to fix consumer backlog
```bash
# ❌ BAD — makes backlog worse by adding more messages
kafka-console-producer --broker-list localhost:9092 --topic your-topic < large-file.txt
# Adding messages to already backlogged queue makes problem worse
```

**GOOD:** Scale consumers to match processing capacity
```bash
# ✅ GOOD — increase consumer parallelism
kafka-console-consumer --bootstrap-server localhost:9092 --topic your-topic --group your-group --num-consumers 4
# Or deploy more consumer instances with same group ID
```

---

### Pattern 6: Dead Letter Queue Handling

**Problem:** DLQ filling up with failed messages, need to analyze and process.

```bash
# Kafka: Check dead letter topic
kafka-consumer-groups --bootstrap-server localhost:9092 --describe --group dlq-consumer-group

# Kafka: Process DLQ messages
kafka-console-consumer --bootstrap-server localhost:9092 --topic your-topic.DLQ --from-beginning --max-messages 100 | while read msg; do
  echo "Processing: $msg"
  # Add your retry logic here
done

# RabbitMQ: List DLQ
rabbitmqctl list_queues name messages | grep -E "(dlq|DLQ|dead)"

# RabbitMQ: Reprocess DLQ messages
rabbitmqadmin get queue=your-queue.DLQ count=10 requeue=true

# SQS: Check DLQ configuration
aws sqs get-queue-attributes --queue-url https://sqs.region.amazonaws.com/account/main-queue --attribute-names RedrivePolicy

# SQS: Process DLQ
aws sqs receive-message --queue-url https://sqs.region.amazonaws.com/account/queue-DLQ --max-number-of-messages 10 --attribute-names All | jq -r '.Messages[].Body' | while read msg; do
  echo "Retrying: $msg"
  # Add your retry logic
  aws sqs delete-message --queue-url URL --receipt-handle RECEIPT-HANDLE
done

# NATS: Check stream for failed messages
nats consumer info YOUR-STREAM YOUR-CONSUMER | grep -E "(NumPending|NumRedelivered)"

# Clean up DLQ after processing (caution!)
rabbitmqctl purge_queue your-queue.DLQ
```

**BAD:** Ignoring DLQ error patterns
```bash
# ❌ BAD — just purging without analysis
rabbitmqctl purge_queue your-queue.DLQ
# You lose valuable error information this way
```

**GOOD:** Analyze DLQ before clearing
```bash
# ✅ GOOD — extract error patterns first
rabbitmqctl list_queues name messages | grep -E "(dlq|DLQ)" | while read line; do
  queue=$(echo $line | awk '{print $1}')
  count=$(echo $line | awk '{print $2}')
  echo "DLQ: $queue has $count messages"
  # Process each DLQ before clearing
done
```

---

## Constraints

### MUST DO
- Check cluster connectivity before investigating individual queues (Early Exit)
- Verify consumer group status and lag metrics for all queue types
- Inspect dead letter queues for error pattern analysis
- Validate visibility timeout settings against actual processing duration
- Analyze backlog trends before making scaling decisions
- Confirm network connectivity to queue brokers
- Review broker logs for warnings and errors before application changes
- Test with sample messages after applying fixes

### MUST NOT DO
- Scale producers when backlogs exist — only scale consumers
- Disable DLQ processing "temporarily" — this hides failures
- Clear queues without first analyzing message content
- Change visibility timeout without understanding processing duration
- Ignore consumer rebalance events — they indicate instability
- Run purge commands without backup in production environments
- Assume invisible messages are being processed — verify with metrics

---

## TL;DR for Code Generation

- Use guard clauses — return early on invalid queue states
- Return simple types (dict, str, int, bool, list) - avoid complex nested objects
- Handle null/empty cases explicitly at function top (Early Exit)
- Never mutate input parameters — return new dicts/objects
- Fail fast with descriptive errors — don't try to "patch" bad data
- Include timing and latency metadata in all return values
- Reference queue-specific error codes and metrics

---

## Output Template

When applying this skill, produce:

1. **Cluster Health Status** — Summary of broker connectivity and cluster state
2. **Affected Queue List** — Queue names with current message counts and consumer status
3. **Lag Analysis** — Consumer group lag or unacknowledged message counts
4. **DLQ Summary** — Dead letter queue status and error patterns identified
5. **Root Cause** — Identified cause (visibility timeout, consumer failure, scaling mismatch)
6. **Resolution Steps** — Specific commands to apply fixes
7. **Verification Steps** — Commands to confirm fixes worked
8. **Prevention Measures** — Configuration changes to avoid recurrence

---

## Related Skills

| Skill | Purpose |
|---|---|
| `agent-nats` | NATS-specific orchestration and messaging patterns for agent coordination |
| `agent-performance-monitoring` | Real-time performance metrics collection and alerting |
| `agent-error-pattern-detection` | Automatic identification of recurring error patterns across systems |
| `agent-scaling-optimizer` | Dynamic scaling recommendations based on queue backlog trends |
| `agent-message-format-validator` | Message schema validation and format consistency checks |

---

## References

- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- [RabbitMQ Management Guide](https://www.rabbitmq.com/management.html)
- [AWS SQS Documentation](https://docs.aws.amazon.com/sqs/)
- [NATS Documentation](https://docs.nats.io/)
- [Kafka CLI Tools Reference](https://kafka.apache.org/documentation/#tools)
- [RabbitMQ CLI Tools](https://www.rabbitmq.com/cli.html)
- [AWS CLI SQS Commands](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/sqs/index.html)
- [NATS CLI Reference](https://github.com/nats-io/natscli)

---

## Quick Reference Commands

### Kafka Quick Commands
```bash
kafka-topics --bootstrap-server localhost:9092 --list
kafka-consumer-groups --bootstrap-server localhost:9092 --list
kafka-consumer-groups --bootstrap-server localhost:9092 --describe --group GROUP-NAME
kafka-console-consumer --bootstrap-server localhost:9092 --topic TOPIC-NAME --from-beginning --max-messages 10
```

### RabbitMQ Quick Commands
```bash
rabbitmqctl status
rabbitmqctl list_queues name messages messages_unacknowledged consumers
rabbitmqctl list_consumers
rabbitmqctl purge_queue QUEUE-NAME
```

### SQS Quick Commands
```bash
aws sqs list-queues
aws sqs get-queue-attributes --queue-url URL --attribute-names All
aws sqs receive-message --queue-url URL --max-number-of-messages 10
aws sqs set-queue-attributes --queue-url URL --attributes '{"VisibilityTimeout": "300"}'
```

### NATS Quick Commands
```bash
nats stream ls
nats stream info STREAM-NAME
nats consumer ls STREAM-NAME
nats consumer info STREAM-NAME CONSUMER-NAME
nats stream get STREAM-NAME --last 10
```

---

*This skill provides comprehensive message queue troubleshooting for production systems. Always test diagnostic commands in non-production environments first.*
