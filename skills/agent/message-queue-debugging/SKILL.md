---
name: message-queue-debugging
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Debugs Kafka, RabbitMQ, and SQS message queues with consumer lag analysis,
  dead letter handling, and message flow troubleshooting for distributed systems
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: code
  related-skills: agent-database-admin, agent-message-queue-troubleshooting, cncf-kubernetes-debugging
  role: implementation
  scope: implementation
  triggers: kafka troubleshooting, rabbitmq debugging, sqs issues, message queue problems,
    dead letter queues, consumer lag, message backlog, queue monitoring
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
version: "1.0.0"
---
# Message Queue Debugging

Debugs distributed message queue systems including Kafka, RabbitMQ, and SQS — identifies consumer lag, dead letter queue issues, message backlogs, and flow bottlenecks to restore reliable message delivery.

---

## TL;DR Checklist

- [ ] Verify queue connectivity with basic connection test for each broker
- [ ] Check consumer group status and identify lagging consumers
- [ ] Examine dead letter queue (DLQ) for failed message patterns
- [ ] Review message throughput metrics (inbound vs outbound rates)
- [ ] Validate message visibility timeout settings against processing time
- [ ] Analyze partition or queue distribution for load imbalance
- [ ] Trace message flow using correlation IDs or message headers
- [ ] Check broker logs for errors, warnings, or connection drops

---

## When to Use

Use this skill when:

- Messages are piling up in queues and consumers aren't processing them
- Consumer lag metrics show increasing delays in message processing
- Messages appear in dead letter queues without clear error patterns
- Distributed system messages are disappearing or duplicating unexpectedly
- Queue connection errors or timeouts occur in production logs
- Message ordering guarantees aren't being maintained across consumers

---

## When NOT to Use

Avoid this skill for:

- Simple application logging issues — use `agent-logging-debugging` instead
- Database query performance problems — use `agent-database-admin` instead
- Network connectivity outside message broker ports — use `cncf-kubernetes-debugging` for infrastructure issues
- Application code bugs that don't involve message queue operations
- Authentication/authorization issues — verify IAM roles, ACLs, or user permissions separately

---

## Core Workflow

1. **Initial Diagnosis** — Gather baseline metrics: queue depths, consumer counts, message rates. **Checkpoint:** Confirm whether issue is latency (slow processing) or throughput (backlog accumulation).

2. **Consumer Health Check** — Verify all consumers are connected, active, and not in rebalance state. **Checkpoint:** Identify any consumers that are offline or stuck in partition assignment.

3. **Dead Letter Queue Analysis** — Examine DLQ contents to identify failure patterns (serialization errors, business rule violations, infrastructure failures). **Checkpoint:** Determine if failures are transient (retry) or persistent (data/model issue).

4. **Message Flow Tracing** — Use correlation IDs or message headers to track specific messages through the system. **Checkpoint:** Locate exactly where messages are being dropped, duplicated, or delayed.

5. **Configuration Review** — Validate broker settings: visibility timeouts, retention policies, replication factors, prefetch counts. **Checkpoint:** Ensure settings match expected processing characteristics.

6. **Resolution Implementation** — Apply fixes: scale consumers, adjust timeouts, clear DLQ after analysis, restart stuck consumers. **Checkpoint:** Verify metrics improve within expected time window after changes.

---

## Implementation Patterns

### Pattern 1: Kafka Consumer Lag Monitoring

Monitor consumer group lag to detect processing delays.

```bash
# Check consumer group lag for all topics
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --list --exclude-internal-topics | \
  xargs -I {} kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --describe --group {}

# Detailed lag breakdown by partition
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --describe --group my-consumer-group

# ❌ BAD — checking only current offset without lag context
kafka-console-consumer.sh --bootstrap-server localhost:9092 \
  --topic my-topic --from-beginning --max-messages 1

# ✅ GOOD — monitoring lag over time with timestamp
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --describe --group my-consumer-group | \
  awk 'NR>3 { lag += $5 } END { print "Total Lag:", lag }'
```

---

### Pattern 2: Kafka Topic and Partition Analysis

Investigate topic health and partition distribution.

```bash
# List all topics with detailed information
kafka-topics.sh --bootstrap-server localhost:9092 \
  --describe --topic my-topic

# Check partition leader distribution
kafka-topics.sh --bootstrap-server localhost:9092 \
  --describe | awk '/Partition:/{p=$2} /Leader:/{l=$4} END{print "Partitions:", p, "Leaders:", l}'

# ✅ BAD — assuming all partitions are balanced
kafka-topics.sh --bootstrap-server localhost:9092 \
  --describe | grep -v "Leader: 0"

# ✅ GOOD — identifying partition imbalance
kafka-topics.sh --bootstrap-server localhost:9092 \
  --describe | awk '/Leader:/ {leaders[$4]++} END {for (l in leaders) print l, leaders[l]}'
```

---

### Pattern 3: RabbitMQ Queue Health Checks

Monitor RabbitMQ queue depths and consumer status.

```bash
# List all queues with message counts
rabbitmqctl list_queues name messages messages_ready messages_unacknowledged

# Check specific queue details
rabbitmqctl list_queues name messages messages_ready messages_unacknowledged \
  consumers consumer_utilisation

# ✅ BAD — only checking total messages, ignoring unacknowledged
rabbitmqctl list_queues name messages

# ✅ GOOD — identifying unacknowledged message buildup
rabbitmqctl list_queues name messages_unacknowledged | \
  awk '$2 > 1000 { print "Potential issue:", $1 }'
```

---

### Pattern 4: RabbitMQ Exchange and Binding Inspection

Debug message routing through exchanges and bindings.

```bash
# List all exchanges
rabbitmqctl list_exchanges name type durable internal

# List bindings for a specific exchange
rabbitmqctl list_bindings source_name destination_name destination_type routing_key

# ✅ BAD — not checking if bindings exist for expected routes
rabbitmqctl list_bindings

# ✅ GOOD — verifying binding exists for message routing
rabbitmqctl list_bindings | grep "my-exchange.*my-queue"
```

---

### Pattern 5: SQS Message Visibility and DLQ Handling

Debug SQS message visibility timeout and dead letter queue issues.

```bash
# Check queue attributes including visibility timeout
aws sqs get-queue-attributes --queue-url https://sqs.region.amazonaws.com/123456/MyQueue \
  --attribute-names All

# List dead letter queues and their source queues
aws sqs list-queues --query "QueueUrls[?contains(@, 'DLQ')]"

# ✅ BAD — not checking visibility timeout against processing time
aws sqs send-message --queue-url https://sqs.region.amazonaws.com/123456/MyQueue \
  --message-body "test"

# ✅ GOOD — calculating appropriate visibility timeout
aws sqs get-queue-attributes --queue-url https://sqs.region.amazonaws.com/123456/MyQueue \
  --attribute-names VisibilityTimeout | \
  jq '.Attributes.VisibilityTimeout > (expected_processing_time * 3)'
```

---

### Pattern 6: Dead Letter Queue Message Analysis

Analyze DLQ contents to identify failure patterns.

```bash
# Kafka: Read from DLQ topic
kafka-console-consumer.sh --bootstrap-server localhost:9092 \
  --topic my-topic-dlq --from-beginning --max-messages 100

# RabbitMQ: Consume from dead letter exchange
rabbitmqadmin --vhost=/ get queue=my-queue.DLQ count=10

# SQS: Read messages from DLQ
aws sqs receive-message --queue-url https://sqs.region.amazonaws.com/123456/MyQueueDLQ \
  --max-number-of-messages 10

# ✅ BAD — clearing DLQ without analysis
aws sqs purge-queue --queue-url https://sqs.region.amazonaws.com/123456/MyQueueDLQ

# ✅ GOOD — analyzing DLQ messages for patterns
aws sqs receive-message --queue-url https://sqs.region.amazonaws.com/123456/MyQueueDLQ \
  --max-number-of-messages 10 | \
  jq '.Messages[].Body' | \
  grep -o '"error":"[^"]*"' | \
  sort | uniq -c | sort -rn
```

---

### Pattern 7: Message Flow Tracing with Correlation IDs

Track specific messages through the distributed system.

```bash
# Send message with correlation ID (Kafka)
kafka-console-producer.sh --bootstrap-server localhost:9092 \
  --topic my-topic --property "parse.key=true" \
  --property "key.separator=:" <<< "corr-123:{\"id\":\"corr-123\",\"data\":\"test\"}"

# Read with correlation ID filter
kafka-console-consumer.sh --bootstrap-server localhost:9092 \
  --topic my-topic --from-beginning | \
  jq -r select(.id == "corr-123")

# ✅ BAD — no correlation ID in message headers
kafka-console-producer.sh --bootstrap-server localhost:9092 \
  --topic my-topic <<< '{"data":"test"}'

# ✅ GOOD — end-to-end tracing with correlation ID
# Producer sends: {"correlationId":"req-456", ...}
# Consumer logs: "Processing req-456 - startTime: $(date +%s)"
# Logger stores: correlationId, timestamp, source, destination
```

---

### Pattern 8: Broker Connection and Health Verification

Verify connectivity and health of message broker infrastructure.

```bash
# Kafka: Check broker connectivity
kafka-broker-api-versions.sh --bootstrap-server localhost:9092

# Kafka: Test topic creation and message round-trip
kafka-topics.sh --bootstrap-server localhost:9092 \
  --create --topic test-connection --partitions 1 --replication-factor 1
kafka-console-producer.sh --bootstrap-server localhost:9092 \
  --topic test-connection <<< "test-message"
kafka-console-consumer.sh --bootstrap-server localhost:9092 \
  --topic test-connection --from-beginning --timeout-ms 5000

# ✅ BAD — assuming broker is healthy without verification
# No connectivity check before production deployment

# ✅ GOOD — comprehensive broker health verification
kafka-broker-api-versions.sh --bootstrap-server localhost:9092 \
  | grep -q "kafka" && echo "Broker healthy" || echo "Broker unhealthy"
```

---

## Additional Debugging Commands

### Kafka Advanced Troubleshooting

```bash
# Describe consumer group in detail
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --describe --group my-group --members

# List consumer group states
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --list | while read group; do
    state=$(kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
      --describe --group "$group" 2>&1 | grep "State:" | head -1)
    echo "$group: $state"
  done

# Check log segments and retention
ls -lh /var/lib/kafka/data/my-topic-0/ | head -20

# Analyze log compaction status
kafka-log-dirs.sh --bootstrap-server localhost:9092 \
  --describe --topic-sets my-topic:0
```

### RabbitMQ Advanced Troubleshooting

```bash
# List consumers with details
rabbitmqctl list_consumers queue=my-queue consumer_details

# Check policy application
rabbitmqctl list_policies

# Examine queue length over time (via management API)
curl -s http://localhost:15672/api/queues | jq '.[] | {name, messages, consumers}'

# Force queue synchronization
rabbitmqctl sync_queue my-queue

# Clear a specific queue
rabbitmqadmin purge queue=my-queue
```

### SQS Advanced Troubleshooting

```bash
# Check message age in queue
aws sqs get-queue-attributes --queue-url https://sqs.region.amazonaws.com/123456/MyQueue \
  --attribute-names ApproximateAgeOfOldestMessage

# Test message visibility timeout behavior
aws sqs send-message --queue-url https://sqs.region.amazonaws.com/123456/MyQueue \
  --message-body "test" --delay-seconds 0
aws sqs receive-message --queue-url https://sqs.region.amazonaws.com/123456/MyQueue \
  --max-number-of-messages 1 --visibility-timeout 0
# Message should reappear after visibility timeout

# Check redrive policy for DLQ
aws sqs get-queue-attributes --queue-url https://sqs.region.amazonaws.com/123456/MyQueue \
  --attribute-names RedrivePolicy

# List all SQS queues
aws sqs list-queues --query "QueueUrls[]"
```

### General Monitoring Commands

```bash
# Monitor queue depth in real-time (Kafka)
watch -n 5 "kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --describe --group my-group | grep -v 'GROUP' | awk '{lag+=\$5} END {print lag}'"

# RabbitMQ queue depth monitoring
watch -n 5 "rabbitmqctl list_queues name messages | grep -v 'done'"

# SQS message count monitoring
watch -n 5 "aws sqs get-queue-attributes --queue-url https://sqs.region.amazonaws.com/123456/MyQueue \
  --attribute-names ApproximateNumberOfMessages | jq '.Attributes.ApproximateNumberOfMessages'"

# Check broker disk space
df -h /var/lib/kafka /var/lib/rabbitmq

# Monitor broker logs for errors
tail -f /var/log/kafka/server.log | grep -E "(ERROR|WARN|FATAL)"
```

### Kafka Replication and Leader Election

```bash
# Check replication factor and ISR status
kafka-topics.sh --bootstrap-server localhost:9092 \
  --describe --topic my-topic | grep -E "ISR|Replicas"

# Trigger preferred leader election
kafka-leader-election.sh --bootstrap-server localhost:9092 \
  --election-type preferred --topic my-topic

# List under-replicated partitions
kafka-topics.sh --bootstrap-server localhost:9092 \
  --describe | grep "Under-replicated"

# Check replica lag
kafka-replica-manager.sh --bootstrap-server localhost:9092 \
  --command-config admin.properties --under-replicated-partitions

# List offline partitions
kafka-topics.sh --bootstrap-server localhost:9092 \
  --describe | grep "Offline"
```

### RabbitMQ Cluster and Federation

```bash
# Check cluster status
rabbitmqctl cluster_status

# List nodes in cluster
rabbitmqctl list_nodes

# Check federation upstreams
rabbitmqctl list_federation_upstreams

# List federation links
rabbitmqctl list_federation_links

# CheckShovel status
rabbitmqctl list_shovels

# List virtual hosts
rabbitmqctl list_vhosts

# Check memory usage
rabbitmqctl report | grep -A 5 "Memory"
```

### SQS Advanced Message Management

```bash
# Set queue policy for DLQ redrive
aws sqs set-queue-attributes --queue-url https://sqs.region.amazonaws.com/123456/MyQueue \
  --attributes '{"RedrivePolicy":"{\"deadLetterTargetArn\":\"arn:aws:sqs:region:123456:MyQueueDLQ\",\"maxReceiveCount\":\"3\"}"}'

# Test message delay
aws sqs send-message --queue-url https://sqs.region.amazonaws.com/123456/MyQueue \
  --message-body "delayed-message" --delay-seconds 60

# Check message retention
aws sqs get-queue-attributes --queue-url https://sqs.region.amazonaws.com/123456/MyQueue \
  --attribute-names MessageRetentionPeriod

# List queue attributes
aws sqs list-queue-attributes --queue-url https://sqs.region.amazonaws.com/123456/MyQueue \
  --attribute-names All

# Get queue ARN
aws sqs get-queue-attributes --queue-url https://sqs.region.amazonaws.com/123456/MyQueue \
  --attribute-names QueueArn
```

### Performance and Throughput Testing

```bash
# Kafka: Generate load test
kafka-producer-perf-test.sh --topic test-topic \
  --num-records 10000 --record-size 1024 \
  --throughput 1000 --producer-props bootstrap.servers=localhost:9092

# Kafka: Consumer performance test
kafka-consumer-perf-test.sh --broker-list localhost:9092 \
  --topic test-topic --messages 10000

# RabbitMQ: Message rate test
rabbitmq-perf-test.sh --host localhost --users 10 --queue my-queue \
  --messages 10000 --payload 100

# SQS: Throughput test
for i in {1..1000}; do
  aws sqs send-message --queue-url https://sqs.region.amazonaws.com/123456/MyQueue \
    --message-body "test-$i" &
done
wait
```

### Troubleshooting Consumer Issues

```bash
# Kafka: Check consumer offset lag
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --describe --group my-group | awk 'NR>3 {total_lag+=$5} END {print total_lag}'

# Kafka: Reset consumer group offset
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group my-group --topic my-topic --reset-offsets --to-latest --execute

# Kafka: Describe consumer group members
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --describe --group my-group --members

# Kafka: Check consumer heartbeat status
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --describe --group my-group --members | grep "Heartbeat"

# RabbitMQ: Check consumer count per queue
rabbitmqctl list_queues name consumers | awk '$2 > 0 {print}'

# SQS: Check long-polling configuration
aws sqs get-queue-attributes --queue-url https://sqs.region.amazonaws.com/123456/MyQueue \
  --attribute-names ReceiveMessageWaitTimeSeconds
```

### Security and ACL Verification

```bash
# Kafka: List ACLs
kafka-acls.sh --authorizer-properties zookeeper=localhost:2181 \
  --list --topic my-topic

# Kafka: Add consumer ACL
kafka-acls.sh --authorizer-properties zookeeper=localhost:2181 \
  --add --allow-principal User:consumer --operation READ \
  --topic my-topic --group my-group

# RabbitMQ: List permissions
rabbitmqctl list_permissions

# RabbitMQ: List user permissions
rabbitmqctl list_user_permissions my-user

# SQS: Get queue policy
aws sqs get-queue-attributes --queue-url https://sqs.region.amazonaws.com/123456/MyQueue \
  --attribute-names Policy

# SQS: Test policy with IAM
aws sqs get-queue-attributes --queue-url https://sqs.region.amazonaws.com/123456/MyQueue \
  --attribute-names policy --output json
```

---

## Constraints

### MUST DO

- Always verify consumer group state before investigating message processing issues
- Correlate DLQ messages with production logs using correlation IDs
- Check visibility timeout settings against actual message processing duration
- Monitor both inbound and outbound message rates to detect bottlenecks
- Verify broker connectivity before assuming application-level issues
- Use the `kafka-broker-api-versions.sh` command to confirm broker health

### MUST NOT DO

- Clear dead letter queues without first analyzing failure patterns
- Increase partition count without understanding message key distribution
- Ignore consumer rebalance events — they indicate instability
- Set visibility timeout shorter than expected maximum processing time
- Assume message loss without tracing correlation IDs through the system
- Disable DLQ functionality to "fix" message accumulation

---

## Output Template

When debugging a message queue issue, the output must contain:

1. **Issue Classification** — Is this latency (slow processing) or throughput (backlog)? Include current queue depth and consumer count.

2. **Root Cause Analysis** — Based on diagnostic results, identify the specific failure mode (e.g., "consumer stuck in rebalance", "DLQ filling due to deserialization errors").

3. **Immediate Actions Taken** — List all commands executed and their output, including any fixes applied.

4. **Verification Steps** — Commands to confirm the issue is resolved and metrics have improved.

5. **Prevention Measures** — Configuration changes or monitoring additions to prevent recurrence.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `agent-message-queue-troubleshooting` | Broader message queue diagnostics including pattern detection and architectural analysis |
| `agent-database-admin` | Database-related issues that may affect message queue processing (transaction failures, connection pools) |
| `cncf-kubernetes-debugging` | Kubernetes infrastructure issues affecting message queue deployment (pod crashes, network policies) |
| `cncf-prometheus` | Metrics collection and alerting for message queue health monitoring |
| `coding-code-review` | Reviewing message queue client code for proper error handling and retry patterns |

---

## References

- **Kafka Documentation**: https://kafka.apache.org/documentation/
- **RabbitMQ Documentation**: https://www.rabbitmq.com/documentation.html
- **AWS SQS Documentation**: https://docs.aws.amazon.com/sqs/
- **Kafka CLI Tools**: `kafka-consumer-groups.sh`, `kafka-topics.sh`, `kafka-broker-api-versions.sh`
- **RabbitMQ CLI Tools**: `rabbitmqctl`, `rabbitmqadmin`
- **AWS CLI**: `aws sqs` commands for SQS management

---

> 📖 skill: message-queue-debugging
