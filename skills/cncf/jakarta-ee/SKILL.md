---
name: jakarta-ee
description: Jakarta EE platform reference covering specifications, APIs, reference
  implementations, build configuration, and architecture patterns for enterprise Java
  development.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: cncf
  triggers: jakarta ee, jakarta-ee, enterprise java, servlet, jax-rs, cdi, jsf, ejb,
    javanamespace migration, javax to jakarta, payara, wildfly, openliberty, tomcat,
    maven build
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
  related-skills: microprofile, jakarta-migration
------

# Jakarta EE Platform

Provides architecture guidance, specification references, and implementation patterns for building enterprise Java applications on the Jakarta EE platform. Acts as a reference for selecting containers, configuring build systems, wiring CDI beans, JAX-RS resources, JPA entities, and JSF pages into production-grade deployments.

## TL;DR Checklist

- [ ] Choose the right container (WildFly for full EE, Payara for GlassFish compatibility, OpenLiberty for modular cloud-native)
- [ ] Use `jakarta.platform:jakarta.jakartaee-api` dependency — never `javax.*` coordinates
- [ ] Configure CDI producers and beans.xml before wiring cross-cutting concerns
- [ ] Set JTA transaction boundaries at the service/manager layer, not on individual DAO methods
- [ ] Include a complete WAR structure with web.xml namespace declarations matching jakarta.* schema

