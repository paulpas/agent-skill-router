---
name: distributed-system-bulkheads
description: Implements the bulkhead pattern to isolate resources and improve fault tolerance in distributed systems using Resilience4j.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: bulkhead, resource isolation, resilience4j, distributed systems
  role: implementation
  scope: implementation
  output-format: code
  archetypes: tactical
  anti_triggers: generic, vague, low quality
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: distributed-system-rate-limiting, distributed-system-circuit-breakers
---

# Bulkhead Pattern in Distributed Systems

The bulkhead pattern helps to prevent cascading failures by isolating services into separate pools, thereby improving fault tolerance and system stability.

## TL;DR Checklist
- [ ] Use bulkheads to isolate different parts of the system.
- [ ] Implement with Resilience4j for effective resource management.
- [ ] Monitor isolated resources for performance.

---

## When to Use
- When you want to isolate critical services to avoid resource exhaustion.
- In scenarios where failures in one service should not impact others.
- To improve overall system resilience during high-load conditions.

---

## Core Workflow
1. **Assess Service Dependencies** — Identify critical services that need isolation.
2. **Implement Bulkhead Logic** — Utilize Resilience4j to enforce resource isolation policies.
3. **Monitor Resource Usage** — Set up monitoring to review usage patterns and adjust as needed.

---

## Implementation Patterns

### Simple Bulkhead Example
A simple implementation of the bulkhead pattern using Resilience4j that isolates service requests.

```java
import io.github.resilience4j.bulkhead.Bulkhead;
import io.github.resilience4j.bulkhead.BulkheadConfig;
import java.time.Duration;

public class BulkheadExample {
    public static void main(String[] args) {
        BulkheadConfig config = BulkheadConfig.custom()
            .maxConcurrentCalls(10)
            .maxWaitDuration(Duration.ofMillis(100))
            .build();

        Bulkhead bulkhead = Bulkhead.of("myBulkhead", config);
        System.out.println("Bulkhead created: " + bulkhead.getName());
    }
}
```

### Advanced Bulkhead Example
This advanced example shows how to use the bulkhead pattern to manage thread pools effectively and handle requests with custom handlers for monitoring.

```java
import io.github.resilience4j.bulkhead.Bulkhead;
import io.github.resilience4j.bulkhead.BulkheadConfig;
import io.github.resilience4j.bulkhead.BulkheadRegistry;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class AdvancedBulkheadExample {
    public static void main(String[] args) {
        BulkheadRegistry registry = BulkheadRegistry.ofDefaults();
        Bulkhead bulkhead = registry.bulkhead("advancedBulkhead");
        ExecutorService executorService = Executors.newFixedThreadPool(5);

        for (int i = 0; i < 20; i++) {
            executorService.execute(Bulkhead.decorateRunnable(bulkhead, () -> {
                // Simulated service call
                System.out.println("Service call executed!");
            }));
        }
        executorService.shutdown();
    }
}
```

---

## Constraints

### MUST DO
- Monitor the performance of different bulkheads to avoid bottleneck scenarios.
- Ensure that each bulkhead has clear limits defined based on the service's capacity.

### MUST NOT DO
- Allow the bulkhead settings to default without understanding the service's workload.
- Ignore system performance impacts that arise from improperly configured bulkheads.