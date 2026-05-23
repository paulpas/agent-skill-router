---
name: maven-build-tool
description: Implements Maven build configurations including multi-module projects,
  dependency management with BOMs, plugin patterns, enforcer rules, and reactor builds
  for Java/Kotlin applications.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: maven, pom.xml, mvn command, dependency management, how do i fix maven
    conflicts, how do i manage java dependencies, reactor build, BOM, plugin management
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
  - config
  related-skills: gradle-build-tool, coding-testing, coding-security-review
------

# Maven Build Tool

Implements Maven build configurations for Java and Kotlin projects — managing multi-module reactor builds, centralized dependency versioning with BOMs, plugin management with enforcer rules, and production-grade diagnostic workflows. When loaded, the model acts as a senior build engineer producing correct `pom.xml` files, resolving dependency conflicts, and diagnosing build issues using Maven's built-in diagnostics.

## TL;DR Checklist

- [ ] Use a parent POM with `<dependencyManagement>` and `<pluginManagement>` for all multi-module projects
- [ ] Define a dedicated BOM module (packaging: `pom`) to centralize third-party dependency versions
- [ ] Add maven-enforcer-plugin rules enforcing Java version, Maven version, and duplicate detection
- [ ] Use `${project.version}` instead of hardcoded version numbers in child POMs
- [ ] Run `mvn help:effective-pom` and `mvn dependency:tree -Dincludes=groupId:artifactId` to diagnose issues
- [ ] Set `<scope>test</scope>` on all test-scoped dependencies; never leave runtime deps as test scope
- [ ] Use `<exclusions>` to resolve transitive dependency conflicts at the point of declaration

