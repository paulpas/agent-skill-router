---




name: distributed-system-circuit-breakers
description: Implements circuit breakers for fault tolerance in distributed systems using Resilience4j to improve system resilience and stability.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: circuit breaker, resilience4j, fault tolerance, distributed systems
  role: implementation
  scope: implementation
  output-format: code
  archetypes: tactical
  anti_triggers: generic, vague, low quality
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: distributed-system-rate-limiting, distributed-system-bulkheads




---





# Circuit Breakers in Distributed Systems

Circuit breakers prevent potential system overload by stopping the flow of requests to services that are failing, thereby enabling graceful degradation of service.

## TL;DR Checklist
- [ ] Implement circuit breaker pattern to handle system failures.
- [ ] Use Resilience4j for a robust implementation.
- [ ] Adjust configurations based on the observed system performance.

---

## When to Use
- When interacting with external services that may experience failures.
- To improve system resilience and prevent cascading failures.
- During high-load situations where certain components may slow down or fail.

---

## Core Workflow
1. **Define Failure Thresholds** — Determine how many failures are acceptable before the circuit breaker trips.
2. **Implement Circuit Breaker Logic** — Use the Resilience4j library to create a circuit breaker for the relevant service calls.
3. **Adjust Configuration** — Fine-tune the circuit breaker settings based on metrics and performance monitoring.

---

## Implementation Patterns

### Circuit Breaker Example
This example shows how to create a simple circuit breaker with Resilience4j that controls calls to an external service.

```java
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import java.time.Duration;

public class CircuitBreakerExample {
    public static void main(String[] args) {
        CircuitBreakerConfig config = CircuitBreakerConfig.custom()
            .failureRateThreshold(50)
            .waitDurationInOpenState(Duration.ofSeconds(10))
            .slidingWindowSize(10)
            .build();

        CircuitBreaker circuitBreaker = CircuitBreaker.of("myCircuitBreaker", config);
        System.out.println("Circuit Breaker created: " + circuitBreaker.getName());
    }
}
```

### Advanced Circuit Breaker Example
An advanced implementation that hooks into service calls can provide fallback methods for improved fault tolerance.

```java
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import java.util.function.Supplier;

public class AdvancedCircuitBreakerExample {
    public static void main(String[] args) {
        CircuitBreakerRegistry registry = CircuitBreakerRegistry.ofDefaults();
        CircuitBreaker circuitBreaker = registry.circuitBreaker("advancedBreaker");

        Supplier<String> decoratedSupplier = CircuitBreaker.decorateSupplier(circuitBreaker, () -> {
            // Simulate a call to an external service
            return "Response from external service";
        });

        String result = decoratedSupplier.get();
        System.out.println(result);
    }
}
```

---

## Constraints

### MUST DO
- Ensure to log failure occurrences to facilitate monitoring and analysis.
- Set appropriate recovery time to avoid rapid flaps in the circuit.

### MUST NOT DO
- Configure the circuit breaker to be too sensitive, causing unnecessary trips.
- Delay recovery time excessively to avoid service impact.

## Live References

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [Circuit Breaker Pattern (Microsoft P&A)](https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker) — Microsoft's official guide to implementing circuit breakers in distributed systems
- [Resilience4j Circuit Breaker Documentation](https://resilience4j.readthedocs.io/en/latest/circuitbreaker/) — Official Resilience4j docs for the circuit breaker module with configuration options
- [Microservices Patterns: Circuit Breaker (Chris Richardson)](https://microservices.io/patterns/reliability/circuitbreaker.html) — Chris Richardson's Microservices.io reference on circuit breaker implementation
- [Fail Fast Design Principles (Amazon)](https://aws.amazon.com/builders-library/fail-fast/) — AWS Builders Library article on fail-fast patterns and graceful degradation strategies
- [Hystrix: Circuit Breaker Library (Netflix)](https://github.com/Netflix/Hystrix) — Netflix's Hystrix library source code (legacy reference for circuit breaker patterns now in Resilience4j)