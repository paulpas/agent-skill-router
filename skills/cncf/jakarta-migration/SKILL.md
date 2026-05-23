---
name: jakarta-migration
description: Migrates Java EE 8 applications to Jakarta EE 9+ by handling namespace
  rewrites, dependency updates, build configuration changes, and reference implementation
  transitions.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: cncf
  triggers: java ee migration, javax to jakarta, java ee to jakarta ee, namespace
    change, jakartaee-api, javax.servlet, javax.persistence, migration tool, eclipse
    migration, batch rename, java ee 8 upgrade
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  - non-containerized architecture
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
  - config
  - do-dont
  related-skills: jakarta-ee, microprofile
------

# Java EE to Jakarta EE Migration

Guides the systematic migration of Java EE 8 (Java SE 8 / javax.*) applications to Jakarta EE 9+ by handling namespace rewrites, dependency updates, build configuration changes, container-specific adjustments, and validation of migrated code against a Jakarta EE reference implementation.

## TL;DR Checklist

- [ ] Inventory all `javax.*` imports and dependencies using grep/find across the entire project
- [ ] Replace javax.* Maven artifacts with jakarta.* equivalents in pom.xml or build.gradle
- [ ] Run namespace rewrite (javax→jakarta) across all Java source, XML config, and properties files
- [ ] Update deployment descriptors (web.xml, persistence.xml, faces-config.xml) to new namespaces
- [ ] Build against Jakarta EE 10/11 API and deploy to a reference server for smoke testing

