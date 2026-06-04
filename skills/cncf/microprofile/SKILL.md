---




name: microprofile
description: MicroProfile specification reference covering Config, OpenAPI, Fault
  Tolerance, Metrics, Health, JWT Security, Open Telemetry, and Server Sent Events
  for cloud-native Java microservices.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: cncf
  triggers: microprofile, fault tolerance, service mesh, openapi spec, health checks, metrics endpoint, config source, jwt security metrics endpoint
  archetypes:
  - educational
  - strategic
  anti_triggers:
  - brainstorming
  - vague ideation
  - non-containerized architecture
  response_profile:
    verbosity: medium
    directive_strength: low
    abstraction_level: strategic
  role: reference
  scope: infrastructure
  output-format: manifests
  content-types:
  - guidance
  - examples
  - do-dont
  - config
  related-skills: jakarta-ee, jakarta-migration




---




# MicroProfile for Cloud-Native Java

Implements and configures MicroProfile specifications to add cloud-native operational capabilities — externalized configuration, service mesh compatibility, observability (metrics, tracing, health), fault tolerance patterns, and JWT-based security — on top of Jakarta EE application servers or as part of native compilation with Quarkus.

## TL;DR Checklist

- [ ] Select only the MicroProfile features needed — avoid loading unnecessary specification overhead
- [ ] Configure MicroProfile Config sources in priority order (env vars > system properties > config.properties > defaults)
- [ ] Implement both liveness and readiness health checks for proper Kubernetes pod lifecycle management
- [ ] Use @CircuitBreaker with appropriate thresholds to prevent cascading failures across services
- [ ] Verify OpenAPI docs are generated and accessible at /openapi before exposing the service

---

## Purpose and Use Cases

MicroProfile is a specification overlay on Jakarta EE focused exclusively on cloud-native microservice concerns. While Jakarta EE provides the enterprise platform (servlets, JPA, CDI, transactions), MicroProfile adds operational capabilities required for containerized, Kubernetes-deployed services.

**Use MicroProfile when:**

- Deploying Jakarta EE applications to Kubernetes or other container orchestration platforms
- Needing standardized health checks, metrics, and tracing across a microservice ecosystem
- Implementing resilience patterns (circuit breaker, retry, timeout) consistently across services
- Requiring externalized configuration with layered sources for multi-environment deployments
- Building service-to-service communication with JWT-based authentication
- Targeting Open Liberty, WildFly Payara Server, or Quarkus as runtime containers

**Do not use MicroProfile when:**

- Running Jakarta EE applications on-premises without container orchestration needs
- Using Spring Boot — it provides equivalent capabilities through Spring Cloud / Actuator natively
- Building monolithic applications where operational concerns are managed at the infrastructure level

---

## When to Use

Use this skill when:

- Adding cloud-native operational features (health, metrics, config, fault tolerance) to a Jakarta EE application
- Deploying services to Kubernetes and needing liveness/readiness probes for pod lifecycle management
- Implementing distributed resilience patterns (circuit breaker, retry with backoff, timeout enforcement)
- Configuring externalized configuration with layered sources across dev/staging/production environments
- Setting up JWT-based authentication for inter-service communication in a microservice architecture
- Integrating OpenTelemetry distributed tracing across Jakarta EE service boundaries
- Building event-driven or streaming APIs using Server-Sent Events (SSE) on top of JAX-RS

---

## When NOT to Use

Avoid this skill for:

- Setting up Spring Boot Actuator — it provides equivalent health/metrics/tracing natively without MicroProfile
- Developing a single-server monolith where operational concerns are handled at the infrastructure level
- Building applications that don't need externalized configuration or resilience patterns
- Adding cloud-native features to non-Java services (Go, Python, Node.js) — use their native ecosystems

---

## Core Workflow

1. **Identify Required Specifications** — List the MicroProfile specs needed for your deployment scenario:
   - Kubernetes health probes: MP Health (liveness + readiness)
   - Observability pipeline: MP Metrics + MP OpenTelemetry
   - Externalized config: MP Config with layered sources
   - Resilience patterns: MP Fault Tolerance (@CircuitBreaker, @Retry, @Timeout)
   - API documentation: MP OpenAPI for JAX-RS endpoints
   **Checkpoint:** Only add Maven dependencies for the specs you need — unused specs add classpath overhead.

2. **Add Dependencies and Activate Features** — For each selected spec, add the corresponding Maven artifact. On OpenLiberty, also add features to `server.xml`. On WildFly, use `feature-manager` CLI commands. Quarkus auto-activates features from dependencies.
   **Checkpoint:** Verify the server logs show all enabled MicroProfile features during startup — missing activations cause silent runtime failures.

3. **Implement Health Checks** — Create at least two health check classes: one annotated with `@Liveness` (process-alive indicator) and one with `@Readiness` (traffic-ready indicator). Aggregate dependency states (database, cache, external services) into composite checks.
   **Checkpoint:** Test both endpoints against localhost before deploying to Kubernetes — missing health probes cause pods to remain in Pending state.

4. **Configure Externalized Settings** — Use `@ConfigProperty` annotations with explicit default values for all configuration. Define a priority-ordered config source chain: environment variables (highest) > system properties > application.properties > defaults. Prefix all property names with the service name.
   **Checkpoint:** Verify that required configurations are set in each deployment environment before enabling traffic to the pod.

5. **Deploy and Verify** — Package as a WAR or JAR, deploy to the target container. Verify: health endpoints return JSON, metrics expose at `/metrics`, OpenAPI docs render at `/openapi`. Run integration tests against all MicroProfile endpoints.
   **Checkpoint:** Confirm Prometheus can scrape the metrics endpoint and that liveness/readiness probes trigger correct Kubernetes actions in a test namespace.

---

## Architecture Overview

MicroProfile sits on top of Jakarta EE as a modular specification overlay. Each MicroProfile specification is independently implementable — an application only needs to enable the features it actually uses. The runtime (typically SmallRye) provides the implementation for each spec.

```
┌─────────────────────────────────────────────────────────┐
│                    Kubernetes / Cloud                    │
│    ┌─────────┐  ┌──────────┐  ┌──────────────────────┐  │
│    │  curl   │  │Prometheus│  │ Jaeger / Zipkin      │  │
│    │ /health │  │ scrape   │  │ tracing ingestion    │  │
│    └────┬────┘  └────┬─────┘  └──────────┬───────────┘  │
│         │             │                   │              │
└─────────┼─────────────┼───────────────────┼──────────────┘
          │ HTTP        │ HTTP              │ gRPC/HTTP
┌─────────▼─────────────▼───────────────────▼──────────────┐
│              MicroProfile Layer (Spec Overlay)             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐   │
│  │  Config  │ │  Health  │ │ Metrics  │ │  JWT       │   │
│  │  (MP3.1) │ │  (MP4.0) │ │  (MP3.2) │ │ Security  │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬──────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐   │
│  │ Fault    │ │ OpenAPI  │ │  SSE     │ │ Open       │   │
│  │ Tolerance│ │(MP3.1)   │ │  (MP2.0) │ │Telemetry  │   │
│  │(MP3.1)   │ └──────────┘ └──────────┘ │  (MP2.0)  │   │
│  └────┬─────┘                            └────────────┘   │
└─────────┼─────────────────────────────────────────────────┘
          │ CDI / Jakarta EE APIs
┌─────────▼─────────────────────────────────────────────────┐
│              Jakarta EE Container                          │
│  (WildFly, Payara, OpenLiberty, Quarkus)                   │
│  CDI · Servlet · JAX-RS · JPA · EJB · Interceptors       │
└───────────────────────────────────────────────────────────┘
```

### Modular Activation

Each MicroProfile feature is activated independently by adding the appropriate Maven dependency. This means minimal overhead — you only pay for what you use:

```xml
<!-- Minimal MicroProfile setup — enable only what you need -->
<dependency>
    <groupId>org.eclipse.microprofile.config</groupId>
    <artifactId>microprofile-config-api</artifactId>
    <version>3.1</version>
</dependency>
<dependency>
    <groupId>org.eclipse.microprofile.health</groupId>
    <artifactId>microprofile-health-api</artifactId>
    <version>3.1</version>
</dependency>
<dependency>
    <groupId>org.eclipse.microprofile.fault-tolerance</groupId>
    <artifactId>microprofile-fault-tolerance-api</artifactId>
    <version>3.1</version>
</dependency>
```

---

## MicroProfile Specifications Table

| Specification | Current Version | Maven Artifact | Description |
|--------------|-----------------|----------------|-------------|
| **Config** | MP Config 3.1 | `microprofile-config-api` | Externalized configuration with layered sources (env vars, system properties, config.properties files), typed values, and validators |
| **OpenAPI** | MP OpenAPI 3.1 | `microprofile-openapi-api` | Automatic OpenAPI 3.0 specification generation from JAX-RS annotations, providing interactive API documentation |
| **Fault Tolerance** | MP Fault Tolerance 3.1 | `microprofile-fault-tolerance-api` | Resilience patterns: circuit breaker, retry with exponential backoff, timeout enforcement, bulkhead isolation |
| **Metrics** | MP Metrics 3.2 | `microprofile-metrics-api` | Prometheus-compatible metrics export with counter, gauge, histogram, timer, and meter types |
| **Health** | MP Health 3.1 | `microprofile-health-api` | Liveness and readiness probes for Kubernetes pod lifecycle management and service mesh routing |
| **JWT Security** | MP JWT 2.0 | `microprofile-jwt-auth-api` | JSON Web Token authentication and authorization, container-managed JWT extraction from HTTP headers |
| **OpenTelemetry** | MP OpenTelemetry 2.0 | `microprofile-opentelemetry-api` | Distributed tracing with W3C Trace Context propagation across service boundaries |
| **Server Sent Events** | MP SSE 2.0 | `microprofile-sse-api` | Server-side streaming responses using the Server-Sent Events protocol |
| **Rest Client** | MP Rest Client 3.1 | `microprofile-rest-client-api` | Type-safe declarative REST client interfaces with automatic JSON serialization and fault tolerance integration |
| **Messaging** | MP Messaging 3.0 | `microprofile-messaging-api` | Asynchronous messaging using the MicroProfile Messaging pattern (Kafka, RabbitMQ adapters) |
| **ConductR** | Retired | — | Service discovery for Lightbend ConductR — retired, replaced by Kubernetes-native approaches |

---

## Complete Working Examples

### Example 1: Fault Tolerance — Combined Resilience Patterns

Combines @CircuitBreaker, @Retry, and @Timeout on a single service method. This pattern is the most common production configuration for inter-service communication:

```java
package com.example.service;

import org.eclipse.microprofile.faulttolerance.*;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.time.Duration;
import java.util.Optional;

@ApplicationScoped
public class PaymentService {

    @Inject
    private PaymentGatewayClient gatewayClient;

    /**
     * Process payment with full resilience pattern:
     * - Retry up to 3 times with exponential backoff (1s, 2s, 4s) on failure
     * - Timeout after 5 seconds to prevent hung requests
     * - Circuit breaker opens after 5 consecutive failures, half-opens after 10s
     */
    @Retry(maxRetries = 3, delay = 1000, delayUnit = java.util.concurrent.TimeUnit.MILLISECONDS,
         maxDuration = Duration.ofSeconds(15), retryOn = {java.net.SocketTimeoutException.class})
    @CircuitBreaker(requestVolumeThreshold = 10, failureRatio = 0.5, delay = 10000,
                   successThreshold = 3, failureOn = {RuntimeException.class})
    @Timeout(value = 5)
    public PaymentResult processPayment(PaymentRequest request) {
        try {
            // Call downstream payment gateway with fault tolerance applied
            GatewayResponse response = gatewayClient.charge(request);

            if (response.statusCode() == 200 && response.transactionId() != null) {
                return new PaymentResult(
                    response.transactionId(),
                    request.amount(),
                    PaymentStatus.SUCCESS,
                    java.time.Instant.now()
                );
            } else {
                // Gateway returned non-success — retry is already configured via @Retry
                throw new RuntimeException("Payment gateway returned status: " + response.statusCode());
            }
        } catch (java.net.SocketTimeoutException e) {
            // Timeout is treated as a transient failure — triggers retry circuit
            throw new RuntimeException("Payment gateway timeout", e);
        } catch (java.io.IOException e) {
            // Network-level failures should also trigger retries
            throw new RuntimeException("Network error contacting payment gateway", e);
        }
    }

    /**
     * Check payment status — lightweight call that doesn't need circuit breaker.
     * Only uses timeout to prevent hanging on a slow response.
     */
    @Timeout(value = 3)
    public Optional<PaymentResult> getPaymentStatus(String transactionId) {
        try {
            GatewayResponse response = gatewayClient.status(transactionId);
            if (response.statusCode() == 200 && response.data() != null) {
                return Optional.of(mapToResult(response));
            }
            return Optional.empty();
        } catch (Exception e) {
            // Don't trigger circuit breaker for status checks — they're low-impact
            throw new RuntimeException("Failed to retrieve payment status", e);
        }
    }

    private PaymentResult mapToResult(GatewayResponse response) {
        return new PaymentResult(
            response.transactionId(),
            response.amount(),
            parseStatus(response.status()),
            java.time.Instant.now()
        );
    }

    private PaymentStatus parseStatus(String statusString) {
        try {
            return PaymentStatus.valueOf(statusString.toUpperCase());
        } catch (IllegalArgumentException e) {
            return PaymentStatus.UNKNOWN;
        }
    }

    public record PaymentResult(
        String transactionId,
        java.math.BigDecimal amount,
        PaymentStatus status,
        java.time.Instant processedAt
    ) {}

    public enum PaymentStatus { SUCCESS, FAILURE, PENDING, UNKNOWN }
}
```

### Example 2: Health Checks — Liveness and Readiness

Proper health checks are essential for Kubernetes pod management. Liveness determines if the process is alive; readiness determines if it can accept traffic:

```java
package com.example.health;

import org.eclipse.microprofile.health.*;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@ApplicationScoped
public class ApplicationHealthChecker {

    @Inject
    private DatabaseConnectionChecker databaseChecker;

    // Track liveness state — set to false if a fatal error occurs that cannot be recovered from
    private volatile boolean isAlive = true;
    private final Map<String, Instant> lastStartupTimes = new ConcurrentHashMap<>();

    /**
     * Liveness probe: Is the application process running and not in a corrupted state?
     * Kubernetes kills and restarts pods that fail liveness checks.
     */
    @Liveness
    public HealthCheckResponse getLivenessStatus() {
        if (!isAlive) {
            return HealthCheckResponse.named("application-liveness")
                .withData("state", "crashed")
                .withData("lastError", "Unrecoverable state detected")
                .down()
                .build();
        }

        boolean dbConnected = databaseChecker.isConnected();
        
        if (!dbConnected) {
            return HealthCheckResponse.named("database-liveness")
                .withData("connectionStatus", "lost")
                .down()
                .build();
        }

        return HealthCheckResponse.named("application-liveness")
            .withData("state", "running")
            .withData("uptime", Duration.between(lastStartupTimes.getOrDefault("start", Instant.now()), Instant.now()).toSeconds())
            .withData("database", dbConnected ? "connected" : "disconnected")
            .up()
            .build();
    }

    /**
     * Readiness probe: Is the application ready to accept traffic?
     * Kubernetes removes pods from service load balancing when readiness fails.
     */
    @Readiness
    public HealthCheckResponse getReadinessStatus() {
        boolean dbConnected = databaseChecker.isConnected();
        boolean cacheWarm = checkCacheWarmth();

        if (!dbConnected) {
            return HealthCheckResponse.named("service-readiness")
                .withData("database", "disconnected")
                .notReady()
                .build();
        }

        if (!cacheWarm) {
            // Not ready until cache is warmed — important for cold starts after scaling events
            return HealthCheckResponse.named("cache-readiness")
                .withData("cacheStatus", "warming")
                .notReady()
                .build();
        }

        return HealthCheckResponse.named("service-readiness")
            .withData("database", "connected")
            .withData("cache", "warm")
            .withData("readyToServeTraffic", true)
            .up()
            .build();
    }

    private boolean checkCacheWarmth() {
        // In production, this would check a proper cache initialization state
        return lastStartupTimes.values().stream()
            .anyMatch(t -> Duration.between(t, Instant.now()).toSeconds() > 30);
    }

    /**
     * Mark the application as alive — call during startup completion.
     * This is a deliberate liveness signal that survives container restarts.
     */
    public void markAlive() {
        this.isAlive = true;
        this.lastStartupTimes.put("start", Instant.now());
    }

    /**
     * Mark the application as crashed — call from error handlers for unrecoverable errors.
     * This triggers Kubernetes to restart the pod automatically.
     */
    public void markCrashed(String reason) {
        this.isAlive = false;
        // Log the crash reason for debugging
        System.err.println("CRITICAL: Application marked as crashed: " + reason);
    }
}
```

### Example 3: OpenAPI Documentation

Auto-generates OpenAPI 3.0 specification from JAX-RS annotations — no manual API docs required:

```java
package com.example.resource;

import org.eclipse.microprofile.openapi.annotations.*;
import org.eclipse.microprofile.openapi.annotations.enums.*;
import org.eclipse.microprofile.openapi.annotations.media.*;
import org.eclipse.microprofile.openapi.annotations.parameters.*;
import org.eclipse.microprofile.openapi.annotations.responses.*;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@OpenAPIDefinition(
    info = @Info(
        title = "User Management API",
        version = "1.0.0",
        description = "RESTful API for managing user accounts and profiles in the platform.",
        contact = @Contact(name = "API Support", email = "api-support@example.com"),
        license = @License(name = "MIT", url = "https://opensource.org/licenses/MIT")
    ),
    tags = {
        @Tag(name = "users", description = "User account operations"),
        @Tag(name = "admin", description = "Administrative user operations")
    }
)
@Path("api/v1/users")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class UserResource {

    /**
     * Retrieve all users with pagination support.
     */
    @GET
    @Operation(
        summary = "List all users",
        description = "Returns a paginated list of users ordered by creation date.",
        tags = {"users"},
        responses = {
            @ApiResponse(
                responseCode = "200",
                description = "Successfully returned user list",
                content = @Content(
                    array = @ArraySchema(
                        schema = @Schema(implementation = UserDTO.class)
                    ),
                    examples = @ExampleObject(
                        name = "Sample users",
                        value = "[{\"id\":1,\"username\":\"alice\",\"email\":\"alice@example.com\"}]"
                    )
                )
            ),
            @ApiResponse(responseCode = "500", description = "Internal server error")
        }
    )
    @Parameter(name = "page", description = "Page number (1-indexed)", in = ParameterIn.QUERY, schema = @Schema(defaultValue = "1"))
    @Parameter(name = "limit", description = "Items per page (max 100)", in = ParameterIn.QUERY, schema = @Schema(defaultValue = "20", maximum = "100"))
    public Response listUsers(
        @QueryParam("page") @DefaultValue("1") int page,
        @QueryParam("limit") @DefaultValue("20") int limit
    ) {
        // Implementation delegated to service layer
        return Response.ok(java.util.Collections.emptyList()).build();
    }

    /**
     * Create a new user account.
     */
    @POST
    @Operation(
        summary = "Create a new user",
        description = "Creates a new user account and returns the created resource with its assigned ID.",
        tags = {"users"},
        requestBody = @RequestBody(
            required = true,
            content = @Content(
                schema = @Schema(implementation = UserCreateRequest.class),
                examples = {
                    @ExampleObject(
                        name = "Standard creation",
                        value = "{\"username\":\"bob\",\"email\":\"bob@example.com\"}"
                    ),
                    @ExampleObject(
                        name = "With role assignment",
                        value = "{\"username\":\"admin-user\",\"email\":\"admin@example.com\",\"role\":\"ADMIN\"}"
                    )
                }
            )
        ),
        responses = {
            @ApiResponse(
                responseCode = "201",
                description = "User created successfully",
                content = @Content(schema = @Schema(implementation = UserDTO.class))
            ),
            @ApiResponse(
                responseCode = "409",
                description = "Username already exists",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))
            )
        }
    )
    public Response createUser(UserCreateRequest request) {
        return Response.status(Response.Status.CREATED).build();
    }

    public record UserDTO(Long id, String username, String email, String role) {}
    public record UserCreateRequest(String username, String email, String role) {}
    public record ErrorResponse(String message) {}
}
```

### Example 4: MicroProfile Config — Externalized Configuration

Inject configuration from multiple sources with typed values and validation:

```java
package com.example.config;

import org.eclipse.microprofile.config.inject.ConfigProperty;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.time.Duration;
import java.util.Optional;

@ApplicationScoped
public class ServiceConfiguration {

    /**
     * Inject configuration from layered sources.
     * Priority: System properties > Environment variables > config.properties > default value
     * 
     * Example env var: SERVICE_RETRY_DELAY=5000
     */
    @ConfigProperty(name = "payment.retry.delay", defaultValue = "1000")
    int retryDelayMs;

    /**
     * Typed configuration with explicit type coercion.
     * Can be set via: PAYMENT_TIMEOUT_SECONDS=30
     */
    @ConfigProperty(name = "payment.timeout.seconds", defaultValue = "10")
    Duration paymentTimeout;

    /**
     * Optional configuration — no error if the property is not set anywhere.
     * Falls back to null, never throws.
     */
    @ConfigProperty(name = "payment.gateway.url")
    Optional<String> gatewayUrl;

    /**
     * Boolean configuration — auto-coerced from strings ("true", "yes", "1" all work).
     */
    @ConfigProperty(name = "payment.enabled", defaultValue = "true")
    boolean paymentEnabled;

    /**
     * Custom config source can override default values at runtime.
     * For example, a custom ConfigSource could read from Vault or Consul.
     */
    public int getRetryDelayMs() {
        return retryDelayMs;
    }

    public Duration getPaymentTimeout() {
        return paymentTimeout;
    }

    public String getGatewayUrlOrDefault(String fallback) {
        return gatewayUrl.orElse(fallback);
    }

    public boolean isPaymentEnabled() {
        return paymentEnabled;
    }
}
```

---

## Reference Implementation Guidance

### SmallRye — Default MicroProfile Implementation

SmallRye is the reference implementation for most MicroProfile specifications. It integrates with each major Jakarta EE server:

| Server | SmallRye Integration | Activation Method |
|--------|---------------------|-------------------|
| **OpenLiberty** | Built-in — no additional dependencies needed | Add features to `server.xml`: `<feature>microprofile-faultTolerance-3.1</feature>` |
| **WildFly** | Optional feature via WildFly Swarm / overlay | Install the MicroProfile subsystem: `jboss-cli.sh --command="feature-manager add microprofile-fault-tolerance-3.1"` |
| **Payara Server** | Included by default in Payara Platform 6+ | No configuration needed — all MicroProfile features auto-activate when APIs are on classpath |
| **Quarkus** | Native MicroProfile implementation optimized for GraalVM | Enable via `application.properties`: `quarkus.smallrye-fault-tolerance.enabled=true` |

### Quarkus Native Compilation Considerations

When compiling Jakarta EE + MicroProfile applications to native images with GraalVM, additional configuration is needed:

```properties
# application.properties — Quarkus native compilation config
quarkus.native.additional-build-args=\
  -H:ReflectionConfigurationFiles=reflection-config.json,\
  -H:ResourceConfigurationFiles=resource-config.json

# Register beans for reflection (required for CDI proxy generation)
# src/main/resources/reflection-config.json
[
  {
    "name": "com.example.service.PaymentService",
    "allPublicMethods": true,
    "allPublicFields": true
  }
]

# MicroProfile specific native config
quarkus.smallrye-openapi.store-schema-directory=target/openapi
quarkus.smallrye-metrics.enabled=true
```

---

## Common Pitfalls

| Pitfall | Cause | Prevention |
|---------|-------|------------|
| **Fault tolerance transaction boundary conflicts** | @CircuitBreaker and @Retry on a method with `@TransactionAttribute.REQUIRED` causes the transaction to participate in the retry loop | Keep fault tolerance annotations on methods that do NOT begin new JTA transactions; put them on the service facade and let the EJB/CDI bean manage transactions separately |
| **Health check false positives causing pod restarts** | Readiness checks passing even when critical dependencies are degraded | Implement layered health checks — separate liveness (process-alive) from readiness (traffic-ready); use composite health checks that aggregate multiple dependency states |
| **Metrics naming collisions across services** | Multiple services exporting metrics with identical names to the same Prometheus instance | Use service-specific metric prefixes: `my_service_http_requests_total` instead of just `http_requests_total`. Configure via MicroProfile Metrics custom naming. |
| **Config source priority confusion** | Environment variables silently override application-default config.properties values, causing unexpected behavior in different deployment environments | Document the full config source priority order; use unique property names with service prefixes (e.g., `payment.retry.delay` instead of `retry.delay`) |
| **OpenAPI duplication** | Multiple JAX-RS resource classes define overlapping @OpenAPIDefinition annotations that merge incorrectly | Define OpenAPI metadata at a single entry point or use package-level @OpenAPIDefinition; avoid annotating individual methods with tag definitions |

---

## Constraints

### MUST DO
- Implement both liveness and readiness health checks — Kubernetes needs both for correct pod lifecycle management
- Use MicroProfile Config with explicit default values for all required configuration — never rely on properties being present at runtime
- Prefix fault tolerance annotations only on public, non-transactional service facade methods to avoid JTA transaction conflicts
- Register metrics with descriptive names that include the service name to prevent collisions across a multi-service deployment
- Generate and review OpenAPI documentation at `/openapi` before each release — it is the source of truth for API consumers

### MUST NOT DO
- Disable or bypass circuit breakers in production — they are essential for preventing cascading failures in distributed systems
- Use @CircuitBreaker on database persistence methods — combine fault tolerance with transaction management only at the service boundary
- Place @Timeout on methods that perform long-running batch operations without measuring actual execution time first
- Mix MicroProfile Config property names across different namespaces (e.g., `timeout` vs `payment.timeout`) — use a consistent naming convention throughout
- Deploy to production with unvalidated MicroProfile Config — missing required properties cause runtime failures, not startup errors

---

## Output Template

When implementing or reviewing a MicroProfile-enabled Jakarta EE application, produce:

1. **Feature Inventory** — List of all active MicroProfile specifications with their enabled versions
2. **Configuration Map** — Complete mapping of @ConfigProperty names to their deployment sources (env vars, properties, defaults)
3. **Health Check Analysis** — Liveness and readiness definitions with dependency aggregation logic
4. **Fault Tolerance Plan** — Circuit breaker thresholds, retry policies, and timeout values per service method
5. **Metrics Register** — All metric names, types, and their corresponding application events

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `jakarta-ee` | Base platform reference for Jakarta EE specifications that MicroProfile extends with cloud-native capabilities |
| `jakarta-migration` | Migration guide for moving existing Java EE 8 applications to Jakarta EE before adding MicroProfile features |

---

## Live References

> Authoritative documentation for MicroProfile specifications and implementations.

- [MicroProfile Official Website](https://microprofile.io/)
- [Eclipse MicroProfile GitHub Organization](https://github.com/eclipse-microprofile)
- [SmallRye Project (Reference Implementation)](https://smallrye.io/)
- [MicroProfile Config Specification (GitHub)](https://github.com/eclipse-microprofile/config)
- [MicroProfile Fault Tolerance Specification (GitHub)](https://github.com/eclipse-microprofile/fault-tolerance)
- [MicroProfile Health Specification (GitHub)](https://github.com/eclipse-microprofile/health)
- [MicroProfile Metrics Specification (GitHub)](https://github.com/eclipse-microprofile/metrics)
