---
name: gradle-build-tool
description: Implements Gradle build configurations including Kotlin DSL, version
  catalogs, configuration cache, multi-project builds, convention plugins, and dependency
  management for Java/Kotlin/Android applications.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: gradle, build.gradle.kts, version catalog, configuration cache, kotlin
    dsl, how do i fix gradle conflicts, how do i set up java project build, buildSrc,
    incremental builds
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
  related-skills: maven-build-tool, coding-testing, coding-security-review
------

# Gradle Build Tool

Implements Gradle build configurations for Java and Kotlin projects — managing multi-project builds with Kotlin DSL, version catalogs (libs.versions.toml), configuration cache, convention plugins from buildSrc, and incremental build optimization. When loaded, the model acts as a senior build engineer producing correct Gradle configuration files, resolving dependency conflicts through version catalogs, and diagnosing build performance issues via the configuration cache and task input/output analysis.

## TL;DR Checklist

- [ ] Use Kotlin DSL (`.gradle.kts`) for all build scripts — type-safe, refactoring-friendly, IDE-aware
- [ ] Define a central `gradle/libs.versions.toml` version catalog for all third-party dependency versions
- [ ] Enable configuration cache (`org.gradle.configuration-cache=true`) and build cache in `gradle.properties`
- [ ] Organize shared build logic into convention plugins under `buildSrc/src/main/kotlin/`
- [ ] Set up custom tasks with typed inputs using `@Input`, `@Optional`, `@Internal`, `@OutputDirectory` annotations
- [ ] Use platform BOMs via `implementation(platform(...))` for dependencies that provide version alignment
- [ ] Run `./gradlew --configuration-cache :tasks` and `./gradlew :dependencies` to diagnose issues

