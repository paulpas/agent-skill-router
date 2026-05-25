---
name: spring-boot-core
description: Implements Spring Boot 3.x core patterns including dependency injection,
  auto-configuration, RESTful API design with Record DTOs, profile-based configuration,
  and Actuator monitoring for production-grade Java applications.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: spring boot, spring framework, dependency injection, auto configuration,
    rest controller, record dto, profile configuration, actuator, java 21, virtual
    threads, @service, @component, @autowired, how do i build a spring app
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
  - do-dont
  - examples
  related-skills: coding-spring-security, coding-spring-data-jpa, coding-framework-performance-tuning,
    coding-observability-patterns
------
# Spring Boot 3 Core Patterns

Implements modern Spring Boot 3.x application architecture using Java 21 features including Records, Virtual Threads, and Sealed Classes. When loaded, the model acts as a senior Spring developer — producing production-ready REST APIs, configuring dependency injection with proper scoping, implementing auto-configuration safely, and wiring Actuator endpoints for observability.

This skill covers core Spring Boot patterns that form the foundation of any enterprise Java application. Use this skill when building new Spring Boot services or refactoring legacy Spring MVC applications to Boot 3.x.

## TL;DR Checklist

- [ ] Annotate configuration classes with `@Configuration` and beans with `@Bean`; use `@Service`, `@Repository`, `@Component` for auto-detection
- [ ] Prefer constructor injection over `@Autowired` field injection for immutability and testability
- [ ] Define REST controllers as stateless classes returning typed Record DTOs — never expose entity objects directly
- [ ] Separate profiles via `application-{profile}.yml` with `spring.profiles.active` for environment-specific config
- [ ] Add `@Transactional(readOnly = true)` on read-only service methods to optimize Hibernate flush behavior
- [ ] Enable Actuator endpoints (`/actuator/health`, `/actuator/info`, `/actuator/metrics`) with security filtering

---

## When to Use

Use this skill when:

- Building a new Spring Boot REST API service from scratch or scaffolding a microservice
- Refactoring legacy Spring MVC (XML-configured) applications to Spring Boot 3.x auto-configuration
- Implementing dependency injection with proper bean scoping (`@Singleton`, `@RequestScope`, `@SessionScope`)
- Designing RESTful controllers that return typed Record DTOs instead of JPA entities
- Configuring environment-specific behavior using Spring Profiles and `application-{profile}.yml`
- Adding health checks, metrics, and info endpoints via Spring Boot Actuator for production monitoring
- Implementing custom auto-configuration conditions (`@ConditionalOnProperty`, `@ConditionalOnClass`)

---

## When NOT to Use

Avoid this skill for:

- Designing authentication and authorization logic — use `coding-spring-security` instead
- Implementing database repository patterns or JPA entity mapping — use `coding-spring-data-jpa` instead
- Optimizing framework runtime performance — use `coding-framework-performance-tuning` instead
- Setting up logging, tracing, or metrics collection infrastructure — use `coding-observability-patterns` instead
- Writing unit tests for Spring beans — use JUnit 5 and `@SpringBootTest` with test slices directly

---

## Core Workflow

1. **Define the Application Entry Point** — Create a main class annotated with `@SpringBootApplication` which combines `@Configuration`, `@EnableAutoConfiguration`, and `@ComponentScan`. Place it at the root package so component scanning covers all sub-packages. **Checkpoint:** Verify that the package name matches the directory structure — Spring's auto-component scan only works when classes are under the entry point's package tree.

2. **Configure Bean Lifecycle with Dependency Injection** — Design service and repository classes as `@Service`, `@Repository`, or `@Component` annotations. Use constructor injection exclusively (public final fields) instead of field injection with `@Autowired`. This guarantees immutability, explicit dependencies, and testability. **Checkpoint:** Every bean that depends on another must declare it in its constructor — if a class has more than 5 constructor parameters, consider splitting the responsibility.

3. **Implement RESTful Controllers** — Create stateless `@RestController` classes annotated with `@RequestMapping` at the class level. Each method maps to an HTTP verb (`@GetMapping`, `@PostMapping`, etc.). Return typed Record DTOs from methods — never return JPA entity objects directly as they leak persistence details and cause lazy-loading N+1 issues. **Checkpoint:** Every controller method should have a corresponding service method call; controllers orchestrate, services implement business logic.

4. **Set Up Profile-Based Configuration** — Create environment-specific configuration files (`application-dev.yml`, `application-staging.yml`, `application-prod.yml`) under `src/main/resources/`. Use Spring's `@Value` annotation or `@ConfigurationProperties` for typed configuration binding. Activate profiles via `spring.profiles.active` in the base `application.yml` or JVM arguments. **Checkpoint:** No production-sensitive values (credentials, secret keys) should exist in any YAML file — inject them via environment variables using `${ENV_VAR:default}` syntax.

5. **Wire Auto-Configuration Conditionally** — For reusable modules, create custom auto-configuration classes under `src/main/resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`. Use conditional annotations (`@ConditionalOnProperty`, `@ConditionalOnClass`, `@ConditionalOnMissingBean`) to ensure the configuration only activates when appropriate. **Checkpoint:** Every custom auto-config must have a corresponding `@AutoConfigurationBefore` or ordering annotation if it depends on other Boot configurations loading first.

6. **Enable Actuator Observability** — Add the `spring-boot-starter-actuator` dependency and configure endpoints in `application.yml`. Expose `health`, `info`, and `metrics` by default; enable `env`, `beans`, and `threaddump` only in development profiles. Secure actuator endpoints separately from the main application port. **Checkpoint:** Production must never expose `env` or `beans` endpoints — verify via profile-specific management.server.port configuration.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Constructor-Based Dependency Injection (BAD vs. GOOD)

Spring's dependency injection is the foundation of loose coupling and testability. The BAD pattern uses field injection with `@Autowired`, which makes dependencies implicit, breaks immutability, and hinders unit testing without Spring context. The GOOD pattern uses constructor injection with `final` fields, making all dependencies explicit and guaranteed to be available.

```java
// ❌ BAD: Field injection — dependencies are implicit and mutable
@Service
public class OrderService {

    @Autowired  // Hidden dependency — requires Spring context for unit tests
    private UserRepository userRepository;

    @Autowired
    private NotificationService notificationService;

    public Order createOrder(String userId, List<OrderItem> items) {
        var user = userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException(userId));
        // Logic here...
        return order;
    }
}

// ✅ GOOD: Constructor injection — all dependencies explicit and immutable
@Service
public class OrderService {

    private final UserRepository userRepository;
    private final NotificationService notificationService;

    // Public constructor with final fields — no @Autowired needed (Java 16+)
    public OrderService(UserRepository userRepository, NotificationService notificationService) {
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    public Order createOrder(String userId, List<OrderItem> items) {
        var user = userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException(userId));
        // Business logic uses injected dependencies safely
        return order;
    }
}
```

**Key principles:**
- Constructor injection is the default Spring recommendation since version 4.3+ (single constructor doesn't need `@Autowired`)
- Use `final` fields to guarantee immutability — Spring sets them once via the constructor
- Field injection breaks composition-based testing and makes refactoring dangerous
- Constructor injection enables pure JUnit tests: instantiate the service directly with mocked dependencies

---

### Pattern 2: REST Controller with Record DTOs (Java 21)

Modern Spring Boot 3.x leverages Java Records for immutable, compact DTOs. Records eliminate boilerplate (`equals`, `hashCode`, `toString`) and prevent accidental mutation of response data. Never expose JPA entities directly through REST endpoints — they leak implementation details, cause lazy-loading exceptions, and create security vulnerabilities.

```java
// ❌ BAD: Returning entity objects directly — leaks persistence layer
@RestController
@RequestMapping("/api/orders")
public class BadOrderController {

    private final OrderRepository orderRepository;

    public BadOrderController(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    @GetMapping("/{id}")
    public Order getOrder(@PathVariable String id) {
        // JPA entity exposed over HTTP — N+1 queries, lazy loading failures, 
        // circular references in JSON serialization, security leaks
        return orderRepository.findById(id).orElseThrow();
    }
}

// ✅ GOOD: Record DTOs with explicit field mapping — clean API contract
record OrderResponse(
    String id,
    String customerId,
    List<OrderItemResponse> items,
    BigDecimal totalAmount,
    LocalDateTime createdAt
) {}

record OrderItemResponse(
    String productId,
    String productName,
    int quantity,
    BigDecimal unitPrice
) {}

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor  // Lombok generates constructor for final fields
public class OrderController {

    private final OrderService orderService;  // Service layer, not repository

    @GetMapping("/{id}")
    public ResponseEntity<OrderResponse> getOrder(@PathVariable String id) {
        Order order = orderService.findById(id);  // Business logic in service
        
        var dto = new OrderResponse(
            order.getId(),
            order.getCustomerId(),
            order.getItems().stream()
                .map(item -> new OrderItemResponse(
                    item.getProduct().getId(),
                    item.getProduct().getName(),
                    item.getQuantity(),
                    item.getUnitPrice()
                ))
                .toList(),
            order.getTotalAmount(),
            order.getCreatedAt()
        );
        
        return ResponseEntity.ok(dto);  // Explicit HTTP 200 with typed response
    }

    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(@Valid @RequestBody CreateOrderRequest request) {
        Order created = orderService.create(request);
        var dto = new OrderResponse(
            created.getId(),
            created.getCustomerId(),
            created.getItems().stream()
                .map(item -> new OrderItemResponse(
                    item.getProduct().getId(),
                    item.getProduct().getName(),
                    item.getQuantity(),
                    item.getUnitPrice()
                ))
                .toList(),
            created.getTotalAmount(),
            created.getCreatedAt()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);  // HTTP 201 for creation
    }
}

// Request DTO — also a Record for immutability
record CreateOrderRequest(
    @NotBlank String customerId,
    @NotEmpty List<OrderItemRequest> items
) {}

record OrderItemRequest(
    @NotBlank String productId,
    @Min(1) int quantity
) {}
```

**Key principles:**
- Records are immutable by default — perfect for DTOs that must not change after creation
- Keep DTOs flat and focused on the API consumer's needs — do not mirror internal entity structure
- Use `ResponseEntity<T>` for explicit HTTP status codes (200, 201, 404, 409) rather than implicit defaults
- Validate incoming requests with `@Valid` and Bean Validation annotations (`@NotBlank`, `@Min`, `@Email`)
- The service layer transforms entities to DTOs — controllers stay thin and stateless

---

### Pattern 3: Profile-Based Configuration with @ConfigurationProperties

Spring Boot's profile system enables environment-specific configuration without code changes. Modern Spring Boot 3.x uses `@ConfigurationProperties` with typed binding instead of scattered `@Value` annotations. This provides compile-time safety, IDE autocomplete, and automatic validation via `@Validated`.

```java
// ❌ BAD: Scattered @Value annotations — no type safety, no grouping, fragile to refactoring
@Service
public class BadPaymentService {

    @Value("${payment.gateway.url}")
    private String gatewayUrl;

    @Value("${payment.gateway.api-key}")
    private String apiKey;

    @Value("${payment.timeout:30}")
    private int timeoutSeconds;  // Integer instead of Duration — no unit clarity

    @Value("${payment.retry.max-attempts:3}")
    private int maxAttempts;

    public void processPayment(PaymentRequest request) {
        // Properties are raw strings — no validation, no grouping, easy to mistype
        httpClient.post(gatewayUrl)
            .header("X-API-Key", apiKey)
            .timeout(Duration.ofSeconds(timeoutSeconds))
            .retry(maxAttempts)
            .body(request);
    }
}

// ✅ GOOD: Typed @ConfigurationProperties with validation — centralized and safe
@Configuration
@ConfigurationProperties(prefix = "payment")
@Validated  // Enables JSR-380 Bean Validation on bound properties
public class PaymentProperties {

    @NotBlank
    private String gatewayUrl;

    @NotBlank
    private String apiKey;

    private Duration timeout = Duration.ofSeconds(30);

    @Min(1)
    @Max(10)
    private int maxAttempts = 3;

    // Getters and setters (required for binding)
    public String getGatewayUrl() { return gatewayUrl; }
    public void setGatewayUrl(String gatewayUrl) { this.gatewayUrl = gatewayUrl; }
    public String getApiKey() { return apiKey; }
    public void setApiKey(String apiKey) { this.apiKey = apiKey; }
    public Duration getTimeout() { return timeout; }
    public void setTimeout(Duration timeout) { this.timeout = timeout; }
    public int getMaxAttempts() { return maxAttempts; }
    public void setMaxAttempts(int maxAttempts) { this.maxAttempts = maxAttempts; }
}

@ConfigurationPropertiesScan  // Auto-discovers @ConfigurationProperties classes in this package
@EnableConfigurationProperties(PaymentProperties.class)  // Explicitly registers the properties bean
@SpringBootApplication
public class PaymentApplication {}

// Service that depends on typed configuration — safe and testable
@Service
@RequiredArgsConstructor
public class GoodPaymentService {

    private final PaymentProperties paymentConfig;  // Typed, validated configuration
    private final RestTemplate restTemplate;

    public PaymentResult processPayment(PaymentRequest request) {
        var httpClient = new PaymentHttpClient(paymentConfig.getGatewayUrl())
            .apiKey(paymentConfig.getApiKey())
            .timeout(paymentConfig.getTimeout())
            .retry(paymentConfig.getMaxAttempts());

        return httpClient.post(request);
    }
}
```

**application.yml structure:**
```yaml
# src/main/resources/application.yml (shared defaults)
payment:
  gateway-url: "https://api.stripe.com/v1"
  timeout: 30s
  max-attempts: 3

---
# src/main/resources/application-dev.yml (development overrides)
spring:
  config:
    activate:
      profile: dev

payment:
  gateway-url: "https://api.stripe.com/v1/test"  # Test environment
  api-key: "${STRIPE_TEST_KEY:sk_test_default}"  # Injected from env, with fallback for local dev

---
# src/main/resources/application-prod.yml (production overrides)
spring:
  config:
    activate:
      profile: prod

payment:
  gateway-url: "https://api.stripe.com/v1"  # Production endpoint
  api-key: "${STRIPE_PROD_KEY}"  # Strictly required — no fallback in production
  timeout: 15s  # Tighter timeout in prod for better user experience
  max-attempts: 2  # Fewer retries to avoid cascading failures
```

**Key principles:**
- `@ConfigurationProperties` groups related settings under a single prefix — refactor safely without touching code that uses them
- Use `Duration`, `DataSize`, and other typed Spring converters for unit clarity (`30s`, `10MB`)
- Always provide sensible defaults in the annotation or YAML — fail gracefully on missing config
- Environment-sensitive values (API keys, secrets) must use `${ENV_VAR}` syntax with NO hardcoded defaults in production profiles
- Enable `spring.config.import` for externalized configuration files in cloud deployments

---

### Pattern 4: Auto-Configuration with Conditional Activation

Spring Boot's auto-configuration automatically wires beans when dependencies are on the classpath. Custom auto-configuration lets you build reusable libraries that "just work" when dropped into a project. Use `@ConditionalOnProperty`, `@ConditionalOnClass`, and `@ConditionalOnMissingBean` to control activation precisely.

```java
// Auto-configuration class — loaded via META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports
@Configuration(proxyBeanMethods = false)  // Proxy-bean methods = false for better AOT/GraalVM compatibility
@ConditionalOnClass(RestClient.class)     // Only activate if RestClient is on classpath (Boot 3.2+)
@ConditionalOnProperty(
    prefix = "custom.client",
    name = "enabled",
    havingValue = "true",
    matchIfMissing = true  // Enabled by default — disable explicitly with custom.client.enabled=false
)
@ConditionalOnMissingBean(CustomClient.class)  // Only create bean if user hasn't defined their own
@EnableConfigurationProperties(CustomClientProperties.class)
public class CustomClientAutoConfiguration {

    private final CustomClientProperties properties;

    public CustomClientAutoConfiguration(CustomClientProperties properties) {
        this.properties = properties;
    }

    @Bean
    @Primary  // This auto-configured bean takes precedence over user-defined beans of same type
    RestClient customRestClient() {
        return RestClient.builder()
            .baseUrl(properties.getBaseUrl())
            .defaultHeader("Accept", "application/json")
            .requestFactory(new JdkClientHttpRequestFactory(
                java.net.http.HttpClient.newBuilder()
                    .connectTimeout(java.time.Duration.ofSeconds(properties.getConnectionTimeout().getSeconds()))
                    .build()
            ))
            .build();
    }

    @Bean
    CustomClient customClient(RestClient restClient) {
        return new CustomClient(restClient, properties);
    }
}

// Properties for the auto-configured client
@ConfigurationProperties(prefix = "custom.client")
@Data  // Lombok: generates getters, setters, equals, toString
public class CustomClientProperties {
    private String baseUrl = "http://localhost:8080";
    private Duration connectionTimeout = Duration.ofSeconds(5);
    private int readTimeoutSeconds = 30;
    private boolean enabled = true;
}

// The actual client — uses the auto-configured RestClient
public class CustomClient {
    private final RestClient restClient;
    private final CustomClientProperties properties;

    public CustomClient(RestClient restClient, CustomClientProperties properties) {
        this.restClient = restClient;
        this.properties = properties;
    }

    public <T> T get(String path, Class<T> responseType) {
        return restClient.get()
            .uri(path)
            .retrieve()
            .body(responseType);
    }
}
```

**Registration file — `src/main/resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`:**
```
com.example.custom.CustomClientAutoConfiguration
```

**Key principles:**
- `@ConditionalOnMissingBean` is the most important condition — it allows users to override your auto-configured bean by defining their own of the same type in their application
- Use `proxyBeanMethods = false` on `@Configuration` classes for better AOT compilation and GraalVM Native Image compatibility (Boot 3.x optimization)
- Place conditional logic in the `@ConditionalOn*` annotations, not inside `@Bean` method bodies — this keeps auto-configuration lazy and efficient
- Always register your auto-configuration class in the `.imports` file — Spring Boot's `SpringFactoriesLoader` reads this to discover configurations at startup
- Document how to disable the auto-configuration (`custom.client.enabled=false`) for users who need custom behavior

---

## Constraints

### MUST DO
- Use constructor injection exclusively — never use `@Autowired` on fields; public constructors make dependencies explicit and testable without Spring context
- Return Record DTOs from REST controllers — never expose JPA entities directly as they leak persistence details, cause lazy-loading N+1 exceptions, and create circular reference serialization failures
- Separate profiles using `application-{profile}.yml` files with `spring.profiles.active` for environment-specific configuration; inject secrets via `${ENV_VAR}` syntax with NO hardcoded credentials in production profiles
- Annotate read-only service methods with `@Transactional(readOnly = true)` to optimize Hibernate flush behavior and prevent accidental modifications during queries
- Enable Actuator endpoints (`/actuator/health`, `/actuator/info`, `/actuator/metrics`) for production monitoring; secure them on a separate management port (`management.server.port: 8443`) in production
- Place the `@SpringBootApplication` class at the root package to ensure `@ComponentScan` covers all sub-packages automatically

### MUST NOT DO
- Never use field injection with `@Autowired` on private fields — it creates hidden dependencies, breaks immutability, and requires Spring context for unit testing
- Never return JPA entity objects directly from REST endpoints — they leak internal data structures, cause LazyInitializationException on JSON serialization, and expose security-sensitive fields
- Never hardcode API keys, database passwords, or secret tokens in YAML configuration files — always use environment variable injection (`${DB_PASSWORD:}`) or a secrets manager (Vault, AWS Secrets Manager)
- Never mix transactional and non-transactional logic in the same method without `@Transactional(readOnly = true)` on query methods — this causes unnecessary flushes and potential concurrent modification exceptions
- Never enable all Actuator endpoints (`management.endpoints.web.exposure.include=*`) in production — `env`, `beans`, `threaddump`, and `logfile` expose sensitive internal state that attackers can exploit

---

## Output Template

When implementing or reviewing Spring Boot core architecture, produce:

1. **Application Structure** — Package layout showing entry point, controllers, services, repositories, and configuration classes with their annotations
2. **Dependency Injection Graph** — List of all `@Service`, `@Repository`, `@Component` beans with their constructor-injected dependencies mapped out
3. **REST API Contract** — Record DTO definitions for each endpoint, HTTP status codes, and request/response mappings (no entities exposed)
4. **Profile Configuration Matrix** — Table showing which properties differ across dev/staging/prod profiles with their injection source (YAML default vs env var)
5. **Auto-Configuration Conditions** — For any custom starter: the `@ConditionalOn*` annotations, registration path in `.imports`, and how to disable/override
6. **Actuator Endpoint Exposure** — Which endpoints are exposed per profile and on which port (`server.port` vs `management.server.port`)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-spring-security` | Authentication and authorization patterns (JWT, OAuth2, method security) that secure the APIs built with this skill |
| `coding-spring-data-jpa` | Repository patterns, entity mapping, derived queries, and transaction management for database access |
| `coding-framework-performance-tuning` | Connection pooling, query optimization, async processing, and caching to tune Spring Boot runtime performance |
| `coding-observability-patterns` | Logging (SLF4J/Logback), distributed tracing (Micrometer/OpenTelemetry), and metrics collection for Spring Boot |

---

## Live References

> Authoritative documentation links for Spring Boot 3.x development.

- [Spring Boot 3.4 Reference Documentation](https://docs.spring.io/spring-boot/docs/current/reference/html/)
- [Spring Framework Reference — Dependency Injection](https://docs.spring.io/spring-framework/reference/core/beans.html)
- [Java Records (JEP 395)](https://openjdk.org/jeps/395) — Java 14+ feature for compact immutable data classes
- [Spring Boot Actuator Documentation](https://docs.spring.io/spring-boot/docs/current/reference/htmlsingle/#actuator)
- [Virtual Threads (JEP 444)](https://openjdk.org/jeps/444) — Java 21 lightweight threads for high-concurrency Spring applications
