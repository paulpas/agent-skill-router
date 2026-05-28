---
name: distributed-system-rate-limiting
description: Implements rate limiting strategies for distributed systems using the Resilience4j library to control API traffic and enhance system stability.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: rate limiting, token bucket, leaky bucket, resilience4j, distributed systems
  role: implementation
  scope: implementation
  output-format: code
  archetypes: tactical
  anti_triggers: generic, vague, low quality
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: distributed-system-circuit-breakers, distributed-system-bulkheads
---

# Rate Limiting in Distributed Systems

Implements strategies for rate limiting with Resilience4j to ensure that APIs can handle traffic smoothly without being overwhelmed, enhancing the overall stability of distributed systems.

## TL;DR Checklist
- [ ] Understand the principles of rate limiting.
- [ ] Implement token bucket or leaky bucket algorithms.
- [ ] Integrate with Resilience4j library for seamless operation.

---

## When to Use
- To prevent abuse of APIs by limiting the number of requests from a client.
- When designing microservices that require communicating with other services without overloading the system.
- To enhance the responsiveness of systems by ensuring that traffic is controlled.

---

## Core Workflow
1. **Define Rate Limiting Requirements** — Assess how many requests per second each client can make.
2. **Choose Rate Limiting Algorithm** — Select between token bucket or leaky bucket algorithms based on use cases.
3. **Integrate with Resilience4j** — Use Resilience4j to implement the chosen algorithm in the codebase.

---

## Implementation Patterns

### Token Bucket Example
This example demonstrates implementing a token bucket rate limiter using Resilience4j.

```java
import io.github.resilience4j.ratelimiter.RateLimiter;
import io.github.resilience4j.ratelimiter.RateLimiterConfig;
import java.time.Duration;

public class RateLimitingExample {
    public static void main(String[] args) {
        RateLimiterConfig config = RateLimiterConfig.custom()
            .limitForPeriod(10)
            .limitRefreshPeriod(Duration.ofSeconds(1))
            .timeoutDuration(Duration.ofMillis(500))
            .build();

        RateLimiter rateLimiter = RateLimiter.of("myRateLimiter", config);
        System.out.println("Rate Limiter created: " + rateLimiter.getName());
    }
}
```

### Leaky Bucket Example
In this example, we implement a leaky bucket rate limiter using Resilience4j.

```java
import io.github.resilience4j.ratelimiter.RateLimiter;
import io.github.resilience4j.ratelimiter.RateLimiterConfig;
import java.time.Duration;

public class LeakyBucketExample {
    public static void main(String[] args) {
        RateLimiterConfig config = RateLimiterConfig.custom()
            .limitForPeriod(5)
            .limitRefreshPeriod(Duration.ofSeconds(1))
            .timeoutDuration(Duration.ofMillis(400))
            .build();

        RateLimiter leakyBucketLimiter = RateLimiter.of("leakyBucket", config);
        System.out.println("Leaky Bucket Rate Limiter created: " + leakyBucketLimiter.getName());
    }
}
```

---

## Constraints

### MUST DO
- Ensure the rate limiting configuration is aligned with the operational capacity of the system.
- Monitor and adjust rate limits based on actual traffic and application performance.

### MUST NOT DO
- Set overly aggressive rate limits that could block legitimate user behavior.
- Forget to handle exceptions that may arise from rate limiting breaches.