---
name: maven-build-tool
description: Implements Maven build configurations including multi-module projects,
  dependency management with BOMs, plugin patterns, enforcer rules, and reactor builds
  for Java/Kotlin applications.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
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
---
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

---

## When to Use

Use this skill when:

- Setting up a new multi-module Maven project with shared parent POM and plugin management
- Resolving dependency version conflicts caused by transitive dependencies pulling in incompatible versions
- Configuring a Bill of Materials (BOM) module to centralize third-party dependency versions across the organization
- Adding production-grade build enforcement rules (Java version, forbidden APIs, duplicate jar detection)
- Diagnosing build issues using Maven diagnostics (`effective-pom`, `dependency:tree`, `plugin:help`)
- Migrating a legacy single-module project into a multi-module reactor architecture
- Configuring CI/CD pipelines to run Maven with reproducible builds (lockfile or fixed versions)

---

## When NOT to Use

Avoid this skill for:

- Setting up Gradle-based projects — use `gradle-build-tool` instead
- Writing Java/Kotlin application code — this skill covers build configuration only
- Managing runtime deployment of containers or Kubernetes manifests — use CI/CD pipeline skills
- Projects using sbt (Scala), Leiningen/Clojure, or Ant as their build tool

---

## Core Workflow

1. **Project Structure Design** — Determine module boundaries based on cohesive package groups. Create a root `pom.xml` with `<packaging>pom</packaging>`, declare modules via `<modules>`, and set the parent groupId/artifactId/version.
   **Checkpoint:** Every child module must specify `<parent>` referencing the root POM using relative path `../pom.xml`. Verify no module declares its own groupId or version if they inherit from parent.

2. **Dependency Management Setup** — In the parent POM, declare all project dependencies inside `<dependencyManagement>`. For shared third-party libraries (SLF4J, Lombok, JUnit, Jackson), create a separate BOM module with `pom` packaging that centralizes versions.
   **Checkpoint:** Run `mvn dependency:tree -Dincludes=com.fasterxml.jackson.core` from the root to verify all modules resolve the same Jackson version without conflict warnings.

3. **Plugin Management Configuration** — Centralize plugin versions in `<pluginManagement>` within the parent POM. Apply specific plugins to child modules by declaring them in each module's `<build><plugins>` section.
   **Checkpoint:** Run `mvn help:effective-pom -pl <module-name>` and verify plugin versions match what you declared; Maven should not show warnings about unmanaged plugin versions.

4. **Enforcer Rules Enforcement** — Add maven-enforcer-plugin with at least three rules: enforceJavaVersion, enforceMavenVersion, and banDuplicatePomDependencies. Configure failure behavior to stop the build on violations.
   **Checkpoint:** Run `mvn enforcer:enforce` from the root; verify it passes in a clean checkout and fails if you temporarily inject a duplicate dependency.

5. **Build Verification** — Execute `mvn clean verify` from the reactor root. Review output for version convergence warnings, plugin conflicts, or missing dependencies.
   **Checkpoint:** All modules must compile without errors. Tests in each module must pass. The build exit code must be 0 (success).

6. **Diagnostic Resolution** — When builds fail, use Maven's diagnostic plugins: `mvn help:effective-pom` to see the resolved POM after interpolation and inheritance, `mvn dependency:tree -Dverbose` for full transitive resolution details, and `mvn help:evaluate -Dexpression=property.name` to inspect property values.
   **Checkpoint:** Every dependency conflict must have an explicit `<exclusion>` in the module that introduces it, with a comment explaining why.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Parent POM and Child Module (Reactor Build)

A parent POM defines shared configuration while child modules inherit and specialize. The reactor build processes all modules in declaration order, resolving inter-module dependencies.

```xml
<!-- Root pom.xml — Maven multi-module parent -->
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
                             http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.example</groupId>
    <artifactId>my-platform</artifactId>
    <version>1.0.0-SNAPSHOT</version>
    <packaging>pom</packaging>

    <name>My Platform Parent</name>
    <description>Parent POM for the My Platform multi-module project</description>

    <modules>
        <module>my-core</module>
        <module>my-api</module>
        <module>my-service</module>
        <module>my-web</module>
    </modules>

    <!-- Centralized dependency versions -->
    <dependencyManagement>
        <dependencies>
            <!-- Internal modules — no version needed in children (inherit from parent) -->
            <dependency>
                <groupId>com.example</groupId>
                <artifactId>my-core</artifactId>
                <version>${project.version}</version>
            </dependency>
            <dependency>
                <groupId>com.example</groupId>
                <artifactId>my-api</artifactId>
                <version>${project.version}</version>
            </dependency>

            <!-- Third-party dependencies with centralized versions -->
            <dependency>
                <groupId>org.slf4j</groupId>
                <artifactId>slf4j-api</artifactId>
                <version>2.0.16</version>
            </dependency>
            <dependency>
                <groupId>ch.qos.logback</groupId>
                <artifactId>logback-classic</artifactId>
                <version>1.5.7</version>
            </dependency>
            <dependency>
                <groupId>com.fasterxml.jackson.core</groupId>
                <artifactId>jackson-databind</artifactId>
                <version>2.18.2</version>
            </dependency>
            <dependency>
                <groupId>org.junit.jupiter</groupId>
                <artifactId>junit-jupiter</artifactId>
                <version>5.11.4</version>
                <scope>test</scope>
            </dependency>
        </dependencies>
    </dependencyManagement>

    <!-- Plugin versions centralized here -->
    <build>
        <pluginManagement>
            <plugins>
                <plugin>
                    <groupId>org.apache.maven.plugins</groupId>
                    <artifactId>maven-compiler-plugin</artifactId>
                    <version>3.13.0</version>
                    <configuration>
                        <release>21</release>
                        <parameters>true</parameters>
                    </configuration>
                </plugin>
                <plugin>
                    <groupId>org.apache.maven.plugins</groupId>
                    <artifactId>maven-surefire-plugin</artifactId>
                    <version>3.5.2</version>
                </plugin>
                <plugin>
                    <groupId>org.apache.maven.plugins</groupId>
                    <artifactId>maven-enforcer-plugin</artifactId>
                    <version>3.5.0</version>
                </plugin>
            </plugins>
        </pluginManagement>
    </build>

    <!-- Properties for version management -->
    <properties>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
        <maven.compiler.release>21</maven.compiler.release>
    </properties>
</project>
```

### Pattern 2: Child Module POM with Dependencies

Child modules inherit everything from the parent. They only declare their own specific dependencies and plugin executions.

```xml
<!-- my-service/pom.xml — A child module -->
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
                             http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <!-- Inherits groupId, version, and all management sections from parent -->
    <parent>
        <groupId>com.example</groupId>
        <artifactId>my-platform</artifactId>
        <version>1.0.0-SNAPSHOT</version>
        <relativePath>../pom.xml</relativePath>
    </parent>

    <artifactId>my-service</artifactId>
    <name>My Service Module</name>
    <description>Core business logic for the service layer</description>

    <!-- Dependencies: version omitted — resolved from parent's dependencyManagement -->
    <dependencies>
        <dependency>
            <groupId>com.example</groupId>
            <artifactId>my-api</artifactId>
        </dependency>

        <dependency>
            <groupId>org.slf4j</groupId>
            <artifactId>slf4j-api</artifactId>
        </dependency>

        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-databind</artifactId>
        </dependency>

        <!-- Exclude Log4j-over-SLF4j — causes classloader conflicts in Spring Boot -->
        <dependency>
            <groupId>org.apache.logging.log4j</groupId>
            <artifactId>log4j-to-slf4j</artifactId>
            <version>2.24.3</version>
            <exclusions>
                <exclusion>
                    <groupId>org.slf4j</groupId>
                    <artifactId>slf4j-api</artifactId>
                </exclusion>
            </exclusions>
        </dependency>

        <!-- Test dependencies -->
        <dependency>
            <groupId>org.junit.jupiter</groupId>
            <artifactId>junit-jupiter</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>com.h2database</groupId>
            <artifactId>h2</artifactId>
            <version>2.3.232</version>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <!-- Apply enforcer plugin execution to this module -->
    <build>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-enforcer-plugin</artifactId>
                <executions>
                    <execution>
                        <id>enforce-rules</id>
                        <goals>
                            <goal>enforce</goal>
                        </goals>
                        <configuration>
                            <rules>
                                <requireUpperBoundDeps/>
                            </rules>
                        </configuration>
                    </execution>
                </executions>
            </plugin>
        </plugins>
    </build>
</project>
```

### Pattern 3: BOM (Bill of Materials) Module for Third-Party Versions

A dedicated BOM module allows the organization to manage third-party dependency versions in a single place. Child projects import it with `<scope>import</scope>` in their own `dependencyManagement`.

```xml
<!-- my-bom/pom.xml — Centralized third-party version management -->
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
                             http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>com.example</groupId>
        <artifactId>my-platform</artifactId>
        <version>1.0.0-SNAPSHOT</version>
        <relativePath>../pom.xml</relativePath>
    </parent>

    <artifactId>my-bom</artifactId>
    <packaging>pom</packaging>
    <name>My Platform BOM — Third-Party Dependency Versions</name>
    <description>Import this BOM to use centralized third-party versions. Do not depend on this module as a library.</description>

    <!-- This is NOT a dependencyManagement section — it becomes one when imported -->
    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>io.github.classgraph</groupId>
                <artifactId>classgraph</artifactId>
                <version>4.8.179</version>
            </dependency>
            <dependency>
                <groupId>com.google.guava</groupId>
                <artifactId>guava</artifactId>
                <version>33.3.1-jre</version>
            </dependency>
            <dependency>
                <groupId>org.apache.commons</groupId>
                <artifactId>commons-lang3</artifactId>
                <version>3.17.0</version>
            </dependency>
            <dependency>
                <groupId>com.fasterxml.jackson.core</groupId>
                <artifactId>jackson-databind</artifactId>
                <version>2.18.2</version>
            </dependency>
            <dependency>
                <groupId>org.projectlombok</groupId>
                <artifactId>lombok</artifactId>
                <version>1.18.36</version>
            </dependency>
        </dependencies>
    </dependencyManagement>
</project>
```

Child projects import the BOM:

```xml
<dependencyManagement>
    <dependencies>
        <!-- Import the organization's BOM — scope=import makes it act as dependencyManagement -->
        <dependency>
            <groupId>com.example</groupId>
            <artifactId>my-bom</artifactId>
            <version>${project.version}</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

### Pattern 4: maven-enforcer-plugin with Production-Grade Rules

The enforcer plugin prevents dangerous or inconsistent builds by enforcing policies at build time.

```xml
<!-- Enforcer configuration — goes in parent POM's pluginManagement -->
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-enforcer-plugin</artifactId>
    <executions>
        <execution>
            <id>enforce-java-version</id>
            <goals><goal>enforce</goal></goals>
            <configuration>
                <rules>
                    <requireJavaVersion>
                        <version>[21,)</version>
                        <message>ERROR: Java 21 or later is required. Found: ${java.version}</message>
                    </requireJavaVersion>
                </rules>
            </configuration>
        </execution>
        <execution>
            <id>enforce-maven-version</id>
            <goals><goal>enforce</goal></goals>
            <configuration>
                <rules>
                    <requireMavenVersion>
                        <version>[3.9,)</version>
                        <message>ERROR: Maven 3.9+ is required for reproducible builds.</message>
                    </requireMavenVersion>
                </rules>
            </configuration>
        </execution>
        <execution>
            <id>ban-duplicate-dependencies</id>
            <goals><goal>enforce</goal></goals>
            <configuration>
                <rules>
                    <banDuplicatePomDependencyVersions/>
                    <requireUpperBoundDeps>
                        <excludes>
                            <!-- Exclude known conflicts that cannot be resolved without major refactoring -->
                            <exclude>org.slf4j:slf4j-api</exclude>
                        </excludes>
                    </requireUpperBoundDeps>
                </rules>
            </configuration>
        </execution>
    </executions>
</plugin>
```

### Pattern 5: Dependency Mediation Resolution

Maven uses a "nearest definition wins" strategy for dependency mediation. When two paths lead to different versions of the same artifact, the shorter path in the dependency tree wins. If both paths have equal depth, the first declaration in POM order wins. Understanding this is critical for resolving conflicts.

```
Dependency tree example:

my-service (our module)
├── my-api (1.0.0-SNAPSHOT)          ← direct dep, path length 1
│   └── com.google.guava:guava:33.3.1-jre  ← transitive dep, path length 2
├── commons-lang3:3.17.0              ← direct dep, path length 1

# If my-api also depended on guava:28.0-android (path length 2),
# Maven would choose 33.3.1-jre because both paths are equal depth (2),
# and guava from my-api is declared first in POM order.

# To override this, use an explicit dependency in my-service's pom.xml:
<dependency>
    <groupId>com.google.guava</groupId>
    <artifactId>guava</artifactId>
    <version>33.3.1-jre</version>  <!-- forces this version regardless of mediation -->
</dependency>
```

### Pattern 6: Dependency Management — BAD vs. GOOD

Centralizing versions in the parent POM (or BOM) prevents version drift and eliminates the need for children to specify versions.

```xml
<!-- ❌ BAD — Hardcoded versions scattered across child POMs, no dependencyManagement in parent -->
<!-- my-core/pom.xml -->
<dependencies>
    <dependency>
        <groupId>org.slf4j</groupId>
        <artifactId>slf4j-api</artifactId>
        <version>2.0.16</version>
    </dependency>
    <dependency>
        <groupId>com.fasterxml.jackson.core</groupId>
        <artifactId>jackson-databind</artifactId>
        <version>2.17.0</version>  <!-- Different version from what my-api uses -->
    </dependency>
</dependencies>

<!-- my-api/pom.xml --><dependencies>
    <dependency>
        <groupId>com.fasterxml.jackson.core</groupId>
        <artifactId>jackson-databind</artifactId>
        <version>2.18.2</version>  <!-- Conflicts with my-core's 2.17.0 -->
    </dependency>
</dependencies>

<!-- ✅ GOOD — Parent declares all versions in dependencyManagement using properties, children inherit without versions -->
<!-- parent/pom.xml -->
<dependencyManagement>
    <properties>
        <slf4j.version>2.0.16</slf4j.version>
        <jackson.version>2.18.2</jackson.version>
    </properties>
    <dependencies>
        <dependency>
            <groupId>org.slf4j</groupId>
            <artifactId>slf4j-api</artifactId>
            <version>${slf4j.version}</version>
        </dependency>
        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-databind</artifactId>
            <version>${jackson.version}</version>
        </dependency>
    </dependencies>
</dependencyManagement>

<!-- my-core/pom.xml — No version needed; inherited from parent -->
<dependencies>
    <dependency>
        <groupId>org.slf4j</groupId>
        <artifactId>slf4j-api</artifactId>
    </dependency>
    <dependency>
        <groupId>com.fasterxml.jackson.core</groupId>
        <artifactId>jackson-databind</artifactId>
    </dependency>
</dependencies>

<!-- my-api/pom.xml — Same; no version, no conflict possible -->
<dependencies>
    <dependency>
        <groupId>com.fasterxml.jackson.core</groupId>
        <artifactId>jackson-databind</artifactId>
    </dependency>
</dependencies>
```

---

## Key Maven Diagnostic Commands

Use these commands to diagnose build issues:

```bash
# View the fully resolved POM after all inheritance, profiles, and property interpolation
mvn help:effective-pom

# Show the dependency tree for a specific module (use -pl for project list)
mvn dependency:tree -pl my-service

# Show detailed transitive dependency resolution with version conflicts highlighted
mvn dependency:tree -Dincludes=groupId:artifactId -Dverbose

# Display all properties currently available in the build
mvn help:evaluate -Dexpression=settings.properties -q -DforceStdout

# List all profiles active for this build
mvn help:all-profiles

# Analyze dependency usage (which dependencies are used vs. declared but unused)
mvn dependency:analyze

# Resolve all dependencies and copy them to target/dependency/ (useful for offline builds)
mvn dependency:copy-dependencies

# Verify the project without running tests
mvn verify -DskipTests

# Run enforcer rules only (useful CI step before full build)
mvn enforcer:enforce
```

---

## Constraints

### MUST DO
- Declare all third-party dependency versions in `<dependencyManagement>` — never let transitive dependencies pull in arbitrary versions
- Use `${project.version}` instead of hardcoded version numbers in child module POMs
- Add maven-enforcer-plugin with at least `requireJavaVersion`, `requireMavenVersion`, and `banDuplicatePomDependencyVersions` rules
- Set `<scope>test</scope>` on every test dependency; verify no runtime dependencies leak into the compile classpath
- Resolve transitive dependency conflicts explicitly with `<exclusions>` accompanied by a comment explaining the reason
- Configure `maven-compiler-plugin` with explicit `<release>` (not `<source>` and `<target>`) for JDK 9+ projects

### MUST NOT DO
- Hardcode version numbers in child module dependencies when they are declared in parent's `dependencyManagement`
- Omit `<relativePath>` from the parent declaration — Maven will search the local repository instead of your filesystem, causing stale builds
- Use `<source>` and `<target>` for Java version specification — use `<release>` (JDK 9+) or compile with a matching JDK version
- Declare duplicate dependencies across modules without an explicit BOM — this causes fragile version convergence
- Run `mvn install` to a local repository in CI builds — it pollutes the cache and hides inter-module version conflicts; use `mvn clean verify` instead
- Mix SNAPSHOT and release versions of internal modules in production builds without clear release management

---

## Output Template

When implementing or reviewing a Maven build configuration, produce:

1. **Module Structure** — List of modules with their responsibilities and inter-module dependency graph
2. **Parent POM Snippet** — The `<dependencyManagement>` and `<pluginManagement>` sections with all versions listed
3. **BOM Module** (if applicable) — The BOM `pom.xml` with third-party version declarations
4. **Enforcer Rules** — The complete enforcer plugin configuration with justification for each rule
5. **Resolution Notes** — For every explicit `<exclusion>`, state which artifact excluded it, the version replaced, and the reason

---

## Related Skills

| Skill | Purpose |
|---|---|
| `gradle-build-tool` | Alternative build tool using Gradle with Kotlin DSL, version catalogs, and configuration cache |
| `coding-testing` | Unit test frameworks (JUnit 5, Mockito), integration testing patterns, and coverage configuration for Maven |
| `coding-security-review` | Dependency vulnerability scanning with OWASP dependency-check-maven plugin |

---

## Live References

> Authoritative documentation links for Maven build tooling. The model follows markdown links at load time to resolve external references and inline content.

- [Apache Maven Documentation](https://maven.apache.org/guides/index.html)
- [Maven POM Reference — dependencyManagement](https://maven.apache.org/pom.html#Dependency_Management)
- [Maven Enforcer Plugin Documentation](https://maven.apache.org/enforcer/maven-enforcer-plugin/)
- [Maven Dependency Plugin — Tree Analysis](https://maven.apache.org/plugins/maven-dependency-plugin/tree-mojo.html)
- [Maven Multi-Module Project Guide](https://maven.apache.org/guides/mini/guide-multiple-modules.html)
- [Maven Best Practices for Dependency Management](https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html)
