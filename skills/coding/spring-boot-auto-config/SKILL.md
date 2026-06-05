---




name: spring-boot-auto-config
description: Implements Spring Boot auto-configuration mechanics, externalized config binding with @ConfigurationProperties, custom starter development with conditional annotations, and Actuator endpoint customization for production-ready applications.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: auto configuration, application properties, spring profiles, custom starter, conditional beans, actuator endpoints, @configurationproperties, externalized config
  archetypes:
    - tactical
    - diagnostic
  anti_triggers:
    - brainstorming
    - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types:
    - code
    - config
    - do-dont
    - patterns
  related-skills: spring-security-core, spring-data-jpa




---





# Spring Boot Auto-Configuration & Externalized Config

Implements auto-configuration mechanics, externalized configuration binding with `@ConfigurationProperties`, profile-based activation, custom starter development with conditional annotations, and Actuator health/metrics customization for production-grade Spring Boot applications. When loaded, this skill makes the model write type-safe configuration classes, conditionally registered beans, and production-ready Actuator endpoints using modern Spring Boot 3.x APIs.

## TL;DR Checklist

- [ ] Verify all `@ConfigurationProperties` are bound to records or final classes with `@ConstructorBinding`
- [ ] Confirm custom starters include `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`
- [ ] Ensure `@ConditionalOnClass`, `@ConditionalOnMissingBean`, and `@ConditionalOnProperty` guard all auto-config beans
- [ ] Check that Actuator health indicators implement `HealthIndicator` interface with meaningful UP/DOWN status
- [ ] Validate profile activation uses `spring.profiles.active` or `spring.profiles.include` in application.yml
- [ ] Confirm externalized config uses `.yml` or `.yaml` format (not `.properties`) for nested structures

---

## When to Use

Use this skill when:

- Implementing auto-configuration that should activate only when specific classes or beans are present on the classpath
- Binding external configuration from `application.yml`, environment variables, or command-line arguments to typed configuration objects
- Creating a custom Spring Boot starter library for internal platforms or public distribution
- Extending Actuator health checks with application-specific component status reporting
- Managing multi-environment configuration (dev, staging, production) with Spring Profiles

---

## When NOT to Use

Avoid this skill for:

- Simple bean registration without conditional logic — use a plain `@Configuration` class instead
- Direct database or security configuration — use `spring-data-jpa` or `spring-security-core` skills
- Runtime configuration changes without restart — Spring Boot config is loaded at startup; use Spring Cloud Config for dynamic refresh
- Configuration that requires complex validation beyond type-safe binding — add JSR-380 constraints to `@ConfigurationProperties` classes

---

## Core Workflow

1. **Define the External Configuration Model** — Create a record or class annotated with `@ConfigurationProperties(prefix = "your.prefix")`. Use Java records for immutable configuration, or final classes with `@ConstructorBinding` constructors for complex hierarchies. Register the bean in a `@Configuration` class using `@EnableConfigurationProperties(YourConfig.class)` or rely on Spring Boot's component scan with the annotation present.

   **Checkpoint:** Every property binding key maps to a real field. Nested objects use separate nested records/classes, not `Map<String, Object>` wrappers. Run a compilation check — no missing imports for `org.springframework.boot.context.properties.ConfigurationProperties`.

2. **Guard Beans with Conditional Annotations** — Wrap auto-configuration beans using `@ConditionalOnClass`, `@ConditionalOnMissingBean`, `@ConditionalOnProperty`, and `@ConditionalOnWebApplication` to ensure the configuration activates only when its dependencies exist and no conflicting bean is already registered. Always combine at least two conditions: one for classpath presence (`@ConditionalOnClass`) and one for bean absence (`@ConditionalOnMissingBean`).

   **Checkpoint:** If removing a dependency JAR causes the auto-config to silently disable without an error, the condition is correct. Verify that `@ConditionalOnProperty(name = "your.feature.enabled", havingValue = "true")` gate can be toggled via environment variable override (`YOUR_FEATURE_ENABLED=true`).

3. **Build Custom Starter with AutoConfiguration.imports** — Create a starter JAR by placing the fully qualified auto-configuration class names (one per line) into `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`. This replaces the deprecated `spring.factories` approach used in Spring Boot 2.x. The starter POM should have `scope=compile` for runtime dependencies and `scope=provided` for API dependencies like Jackson or Hibernate.

   **Checkpoint:** After building the starter JAR, inspect it with `jar tf your-starter.jar | grep AutoConfiguration.imports` to confirm the file exists. Verify no entries appear in `META-INF/spring.factories`. Run a test app that depends on the starter and confirm the auto-config triggers without explicit `@Import`.

4. **Activate Profiles Strategically** — Configure environment-specific overrides using profile-activated `@Configuration` classes annotated with `@Profile("profile-name")`. In `application.yml`, use `spring.profiles.active: dev,local` for active profiles and `spring.profiles.include: common` for always-loaded defaults. Never hardcode profile names in application logic — resolve them via `Environment#getActiveProfiles()` or constructor injection of `@Value("${spring.profiles.active}")`.

   **Checkpoint:** When launching with `-Dspring.profiles.active=prod`, all other profiles must be overridden. Verify the correct DataSource, security settings, and Actuator exposure are active by checking bean registration order in debug logging (`--debug` flag).

5. **Implement Custom Actuator Health Indicator** — Create a class implementing `org.springframework.boot.actuate.health.HealthIndicator`. Implement the `health()` method to check downstream dependencies (database, cache, message broker) and return either `Health.up().withDetail("key", "value").build()` or `Health.down().withException(e).build()`. Register the bean in an auto-config class with `@ConditionalOnProperty(name = "management.health.custom.enabled", havingValue = "true", matchIfMissing = true)`.

   **Checkpoint:** The `/actuator/health` endpoint must return a JSON object with your component's name as a key. Ensure health checks are non-blocking and include timeout logic (use `CompletableFuture.supplyAsync()` with `.orTimeout(3, TimeUnit.SECONDS)`). Verify that an `OutOfMemoryError` or unhandled exception in the health check does not crash the application — wrap all health checks in try/catch returning `Health.unknown()`.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Type-Safe Configuration Properties Bound to a Record

Modern Spring Boot 3.x works seamlessly with Java records for immutable, type-safe configuration. The record's compact constructor serves as the binding target — no setters needed.

```java
package com.example.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import java.time.Duration;
import java.util.List;

/**
 * Binds properties prefixed with "app.gateway" from application.yml,
 * environment variables (APP_GATEWAY_*), and command-line arguments.
 */
@ConfigurationProperties(prefix = "app.gateway")
public record GatewayProperties(
    String baseUrl,
    Duration connectTimeout,
    Duration readTimeout,
    boolean retryEnabled,
    int maxRetries,
    List<String> allowedOrigins
) {
    /**
     * Compact constructor for validation of bound properties.
     */
    public GatewayProperties {
        if (baseUrl == null || baseUrl.isBlank()) {
            throw new IllegalArgumentException("app.gateway.base-url must be set");
        }
        if (connectTimeout == null) {
            connectTimeout = Duration.ofSeconds(5);
        }
        if (readTimeout == null) {
            readTimeout = Duration.ofMinutes(1);
        }
        if (maxRetries < 0) {
            throw new IllegalArgumentException("app.gateway.max-retries must be >= 0");
        }
    }
}
```

```yaml
# application.yml — corresponding configuration
app:
  gateway:
    base-url: "https://api.example.com"
    connect-timeout: 5s
    read-timeout: 60s
    retry-enabled: true
    max-retries: 3
    allowed-origins:
      - "https://app.example.com"
      - "https://admin.example.com"
```

> **Production pitfall:** `@ConfigurationProperties` on records works only with Spring Boot 3.2+. For earlier versions, use a final class with `@ConstructorBinding`. Always provide sensible defaults — unconfigured properties cause startup failures.

### Pattern 2: Conditional Auto-Configuration for Custom Starter

This pattern creates a starter that registers beans conditionally based on classpath presence, bean existence, and property flags. The `AutoConfiguration.imports` file is the registration mechanism for Spring Boot 3.x.

```java
package com.example.autoconfig;

import jakarta.annotation.PostConstruct;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;

/**
 * Auto-configuration for a custom HTTP client library.
 * Activates only when the target library is on the classpath,
 * the feature flag is enabled, and no custom HttpClient bean exists.
 */
@AutoConfiguration
@ConditionalOnClass(name = "com.example.httpclient.HttpClient")
@ConditionalOnProperty(prefix = "app.custom-client", name = "enabled", havingValue = "true", matchIfMissing = true)
public class CustomClientAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public com.example.httpclient.HttpClient customHttpClient(
            GatewayProperties gatewayProps) {
        var client = new com.example.httpclient.HttpClient(gatewayProps.baseUrl());
        client.setConnectTimeout(gatewayProps.connectTimeout());
        client.setReadTimeout(gatewayProps.readTimeout());
        if (gatewayProps.retryEnabled()) {
            client.setMaxRetries(gatewayProps.maxRetries());
        }
        return client;
    }

    @PostConstruct
    void logConfiguration() {
        // Logged after all beans are initialized — safe to access properties here
        System.out.println("[CustomClient] HttpClient auto-configured for: "
                + gatewayProps.baseUrl());
    }
}
```

```properties
# META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports
com.example.autoconfig.CustomClientAutoConfiguration
```

> **Production pitfall:** Use `@ConditionalOnClass(name = "...")` with the fully qualified class name as a string when you want to avoid importing the dependency at compile time. This is essential for optional dependencies in starters — the starter compiles without the library but activates it when present.

### Pattern 3: Custom Actuator Health Indicator with Timeout Protection

Production systems must have robust health endpoints that do not crash the application when downstream services are unavailable.

```java
package com.example.health;

import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.Map;

/**
 * Health indicator for a downstream REST API dependency.
 * Implements non-blocking health checks with configurable timeouts
 * to prevent the /actuator/health endpoint from hanging or crashing.
 */
@Component
public class DownstreamApiHealthIndicator implements HealthIndicator {

    private final String apiBaseUrl;
    private final Duration timeout;

    public DownstreamApiHealthIndicator(
            com.example.config.GatewayProperties gatewayProps) {
        this.apiBaseUrl = gatewayProps.baseUrl();
        this.timeout = gatewayProps.readTimeout().dividedBy(2); // half of read timeout
    }

    @Override
    public Health health() {
        try {
            CompletableFuture<Boolean> checkFuture = CompletableFuture.supplyAsync(() -> {
                // Simulated health check — in production, use RestTemplate or WebClient
                boolean isReachable = checkApiReachability(apiBaseUrl);
                return isReachable;
            });

            Boolean result = checkFuture.orTimeout(
                    Math.max(timeout.toMillis(), 1000),
                    TimeUnit.MILLISECONDS
            ).join();

            if (result) {
                return Health.up()
                        .withDetail("apiUrl", apiBaseUrl)
                        .withDetail("responseTimeMs", System.currentTimeMillis())
                        .build();
            } else {
                return Health.down()
                        .withDetail("apiUrl", apiBaseUrl)
                        .withDetail("reason", "API not reachable")
                        .build();
            }

        } catch (Exception e) {
            // Timeout, cancellation, or any runtime error — report UNKNOWN, never crash
            return Health.unknown()
                    .withDetail("service", "downstream-api")
                    .withDetail("error", e.getMessage())
                    .build();
        }
    }

    private boolean checkApiReachability(String baseUrl) {
        // In production: use WebClient or RestTemplate with timeout
        // For demonstration, assume a ping endpoint exists at /health
        try {
            // var response = webClient.get().uri("/health").retrieve().toBodilessEntity().block(Duration.ofSeconds(2));
            // return response.getStatusCode().is2xxSuccessful();
            return true; // Placeholder — replace with actual HTTP call
        } catch (Exception e) {
            return false;
        }
    }
}
```

### Pattern 4: Profile-Based Configuration Override

Different environments require different beans, properties, and behaviors. This pattern shows profile-activated configuration classes that selectively override defaults.

```java
package com.example.config.profiles;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * Production-specific configuration: hardened security settings,
 * connection pooling tuning, and monitoring integration.
 */
@Configuration
@Profile("prod")
public class ProductionConfig {

    @Bean
    public com.zaxxer.hikari.HikariDataSource productionDataSource(
            @Value("${spring.datasource.url}") String url,
            @Value("${spring.datasource.username}") String username,
            @Value("${spring.datasource.password}") String password) {

        var config = new com.zaxxer.hikari.HikariDataSource();
        config.setJdbcUrl(url);
        config.setUsername(username);
        config.setPassword(password);
        // Production-specific tuning — aggressive pool sizing for high-traffic apps
        config.setMaximumPoolSize(20);
        config.setMinimumIdle(5);
        config.setIdleTimeout(300_000L);
        config.setMaxLifetime(1_800_000L);
        config.setConnectionTimeout(30_000L);
        return config;
    }
}

/**
 * Development profile: relaxed settings, debug logging, H2 in-memory database.
 */
@Configuration
@Profile("dev")
public class DevelopmentConfig {

    @Bean
    public com.zaxxer.hikari.HikariDataSource developmentDataSource() {
        var config = new com.zaxxer.hikari.HikariDataSource();
        config.setJdbcUrl("jdbc:h2:mem:devdb;DB_CLOSE_DELAY=-1");
        config.setUsername("sa");
        config.setPassword("");
        // Development-friendly — small pool, auto-reset on error
        config.setMaximumPoolSize(3);
        config.setMinimumIdle(1);
        return config;
    }
}
```

---

## Constraints

### MUST DO
- Use `@ConfigurationProperties(prefix = "...")` on records or final classes with `@ConstructorBinding` constructors for all externalized config binding
- Guard every auto-configuration bean with at least two conditional annotations (`@ConditionalOnClass` + `@ConditionalOnMissingBean`)
- Place auto-configuration class FQNs in `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`, never in `spring.factories`
- Implement all Actuator health indicators with timeout protection using `CompletableFuture.orTimeout()` — no blocking calls that can hang the health endpoint
- Register `@EnableConfigurationProperties` on a configuration class or use `@ConfigurationPropertiesScan` to auto-scan for properties classes
- Use `.yml` / `.yaml` format for all configuration files containing nested objects, lists, or multi-line values
- Validate configuration in record compact constructors with descriptive `IllegalArgumentException` messages

### MUST NOT DO
- Annotate `@ConfigurationProperties` classes with `@Component` — they are managed by Spring Boot's property binding mechanism, not component scanning
- Use `.properties` format for complex nested configurations — use YAML to avoid key duplication and improve readability
- Block the health indicator thread — never call blocking I/O (e.g., `RestTemplate.getForObject()`) without wrapping in async execution with a timeout
- Hardcode profile names in application logic — resolve them through `@Value("${spring.profiles.active}")` injection or constructor dependency on `Environment`
- Include more than three active profiles simultaneously — this creates unpredictable precedence conflicts; use `spring.profiles.include` for shared defaults instead

---

## Output Template

When applying this skill, produce outputs following this structure:

1. **Configuration Model** — Typed record/class with `@ConfigurationProperties`, compact constructor validation, and corresponding YAML mapping
2. **Auto-Configuration Class** — Conditional annotations, bean definitions, and `@AutoConfiguration` registration
3. **Starter Registration File** — Complete `AutoConfiguration.imports` file content
4. **Profile-Specific Configuration** — `@Profile("name")` annotated classes with environment-specific overrides
5. **Actuator Health Indicator** — Async health check implementation with timeout and error handling
6. **Production Pitfalls Section** — Common mistakes, anti-patterns, and mitigation strategies

---

## Related Skills

| Skill | Purpose |
|---|---|
| `spring-security-core` | Security configuration layer that sits on top of auto-configured beans (DataSource for JDBC auth, custom filters) |
| `spring-data-jpa` | JPA/hibernate auto-configuration with derived query methods, pagination, and transaction management |

---

## Live References

1. [Spring Boot Auto-Configuration Documentation](https://docs.spring.io/spring-boot/docs/current/reference/htmlsingle/#features.external-config.typesafe-configuration-properties)
2. [@ConfigurationProperties Reference](https://docs.spring.io/spring-boot/docs/current/api/org/springframework/boot/context/properties/ConfigurationProperties.html)
3. [Conditional Annotations Guide](https://docs.spring.io/spring-boot/docs/current/reference/htmlsingle/#features.feature-auto-dependency-conditionals)
4. [Spring Boot Starter Auto-Configuration Import File](https://docs.spring.io/spring-boot/docs/current/reference/htmlsingle/#features.feature-spring-application-auto-configuration.imports)
5. [Actuator Health Indicators API](https://docs.spring.io/spring-boot/docs/current/api/org/springframework/boot/actuate/health/HealthIndicator.html)
6. [Spring Profiles Documentation](https://docs.spring.io/spring-boot/docs/current/reference/htmlsingle/#features.feature-features.profiles)
7. [Externalized Configuration Overview](https://docs.spring.io/spring-boot/docs/current/reference/htmlsingle/#features.external-config)
