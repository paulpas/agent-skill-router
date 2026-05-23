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

