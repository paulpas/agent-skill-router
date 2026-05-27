---
name: maven-build-system
description: Implements Apache Maven build configurations (POM structure, dependency management, profiles, multi-module builds, plugin configuration) for Java and Kotlin projects.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: maven, pom.xml, mvn command, java build tool, dependency management, maven central, plugin management, build lifecycle, mvnw, effective-pom, BOM, bill of materials, maven profiles
  archetypes: [tactical, generation]
  anti_triggers: [brainstorming, vague ideation, code golf, over-engineering]
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples, config]
  related-skills: gradle-build-system
---

# Maven Build System

Implements Apache Maven build configurations for Java and Kotlin projects — managing multi-module reactor builds, centralized dependency versioning with BOMs, plugin management, profile activation, and production-grade diagnostic workflows. When loaded, the model acts as a senior build engineer producing correct `pom.xml` files, resolving dependency conflicts, and diagnosing build issues using Maven's built-in diagnostics.

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

- Setting up a new Maven project or multi-module reactor from scratch
- Resolving dependency version conflicts across modules using BOMs or `dependencyManagement`
- Configuring Maven profiles for environment-specific builds (dev, staging, production)
- Diagnosing build failures with `effective-pom`, `dependency:tree`, and enforcer rules
- Migrating a non-Maven project to Maven or consolidating multiple projects into a reactor
- Configuring plugin management to standardize compiler, test, and packaging behavior across modules

---

## When NOT to Use

Avoid this skill for:

- Non-Java/Kotlin projects — use `gradle-build-system` for Gradle-based builds instead
- Simple single-file scripts — Maven's overhead is not justified for trivial build needs
- Projects already committed to Gradle with convention plugins and Kotlin DSL
- When only dependency resolution (not full build lifecycle) is needed — consider a dedicated tool like JBang or direct classpath management

---

## Core Workflow

1. **Define Reactor Structure** — Create a root `pom.xml` with `<packaging>pom</packaging>`, declare child modules via `<modules>`, and set the parent `groupId`/`artifactId`/`version`. Every child module must inherit these through a `<parent>` reference with `<relativePath>../pom.xml</relativePath>`.
   **Checkpoint:** Run `mvn help:evaluate -Dexpression=project.modules -q -DforceStdout` to verify all modules are discovered. No child POM should declare its own `groupId` or `version` when inheriting from parent.

2. **Configure Dependency Management** — In the parent POM, place all project dependency coordinates inside `<dependencyManagement>`. For shared third-party libraries (SLF4J, JUnit, Jackson), create a separate BOM module with `pom` packaging that centralizes versions. Child modules reference dependencies without version numbers — Maven resolves them from the parent's management section.
   **Checkpoint:** Run `mvn dependency:tree -Dincludes=com.fasterxml.jackson.core` from the root. All modules must show exactly one Jackson version with no conflict warnings.

3. **Centralize Plugin Management** — Declare plugin versions inside `<build><pluginManagement>` in the parent POM. Apply plugins to individual modules by listing them under each module's `<build><plugins>` section without specifying versions (they inherit from pluginManagement).
   **Checkpoint:** Run `mvn help:effective-pom -pl :my-service` and verify that `maven-compiler-plugin` version matches your declared value. Maven must not emit "Plugin management" warnings about unmanaged plugins.

4. **Enforce Build Policies** — Add the maven-enforcer-plugin with at least three rules: `enforceJavaVersion`, `enforceMavenVersion`, and `banDuplicatePomDependencies`. Configure failure behavior to stop the build on violations.
   **Checkpoint:** Run `mvn enforcer:enforce` from the root in a clean checkout — it must pass. Then intentionally inject a duplicate dependency in one module and verify it fails with a clear error message naming the duplicate artifacts.

5. **Verify Reactor Build** — Execute `mvn clean verify` from the reactor root. Review the output for version convergence warnings, plugin conflicts, or missing dependencies. The build exit code must be 0.
   **Checkpoint:** Confirm that all modules compile, all tests pass, and no module shows `[WARNING] Found dependency conflict`. Check that inter-module dependencies resolve correctly (e.g., `my-api` depends on `my-core`, `my-service` depends on `my-api`).

6. **Diagnostic Resolution** — When builds fail or behave unexpectedly, use Maven's diagnostic commands: `mvn help:effective-pom` to see the resolved POM after interpolation and inheritance, `mvn dependency:tree -Dverbose` for full transitive resolution details, and `mvn help:evaluate -Dexpression=propertyName` to inspect property values.
   **Checkpoint:** Every dependency conflict must have an explicit `<exclusion>` in the module that introduces it, accompanied by a comment explaining why.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Parent POM with Dependency and Plugin Management

A parent POM defines shared configuration while child modules inherit and specialize. The reactor build processes all modules in declaration order, resolving inter-module dependencies automatically.

```xml
<!-- Root pom.xml — Maven multi-module parent (Maven 3.9+) -->
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
        <module>my-bom</module>
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

Child modules inherit everything from the parent. They only declare their own specific dependencies and plugin executions, never specifying versions for managed dependencies.

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
                        <goals><goal>enforce</goal></goals>
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

A dedicated BOM module allows the organization to manage third-party dependency versions in a single place. Child projects import it with `<scope>import</scope>` in their own `dependencyManagement` section. This is the Maven equivalent of Gradle's platform BOM.

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

    <!-- This section becomes the BOM content when imported with scope=import -->
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
                <scope>provided</scope>
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

The enforcer plugin prevents dangerous or inconsistent builds by enforcing policies at build time. Configure it in the parent POM's `<pluginManagement>` with execution bindings that run during the verify phase.

```xml
<!-- Enforcer configuration — parent POM's pluginManagement -->
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
                        <version>[17,)</version>
                        <message>Java 17 or higher is required for this project.</message>
                    </requireJavaVersion>
                    <requireMavenVersion>
                        <version>[3.9.0,)</version>
                        <message>Maven 3.9+ is required for modern dependency resolution.</message>
                    </requireMavenVersion>
                </rules>
            </configuration>
        </execution>
        <execution>
            <id>enforce-dependency-convergence</id>
            <goals><goal>enforce</goal></goals>
            <configuration>
                <rules>
                    <requireUpperBoundDeps/>
                </rules>
            </configuration>
        </execution>
    </executions>
</plugin>
```

### Pattern 5: Maven Profiles for Environment-Specific Builds

Profiles activate conditionally based on OS, properties, or default settings. Use profiles to manage environment-specific configurations such as repository URLs, profiled code paths, and build flags.

```xml
<!-- Parent POM — Profile definitions -->
<profiles>
    <!-- Development profile: activated by default for local work -->
    <profile>
        <id>dev</id>
        <activation>
            <activeByDefault>true</activeByDefault>
        </activation>
        <properties>
            <environment.type>development</environment.type>
            <!-- Enable debug logging in dev builds -->
            <log.level>DEBUG</log.level>
            <!-- Skip integration tests during rapid dev cycles -->
            <skipITs>true</skipITs>
        </properties>
    </profile>

    <!-- Production profile: activated via -Pprod or CI environment variable -->
    <profile>
        <id>prod</id>
        <activation>
            <property><name>env</name><value>prod</value></property>
        </activation>
        <properties>
            <environment.type>production</environment.type>
            <log.level>WARN</log.level>
        </properties>
        <!-- Can override dependencies for production (e.g., different DB driver) -->
        <build>
            <plugins>
                <plugin>
                    <groupId>org.apache.maven.plugins</groupId>
                    <artifactId>maven-jar-plugin</artifactId>
                    <configuration>
                        <archive>
                            <manifestEntries>
                                <Environment>${environment.type}</Environment>
                            </manifestEntries>
                        </archive>
                    </configuration>
                </plugin>
            </plugins>
        </build>
    </profile>

    <!-- Profile for running integration tests with Maven Toolchains -->
    <profile>
        <id>integration-test</id>
        <activation>
            <property><name>skipITs</name><value>false</value></property>
        </activation>
        <build>
            <plugins>
                <plugin>
                    <groupId>org.apache.maven.plugins</groupId>
                    <artifactId>maven-failsafe-plugin</artifactId>
                    <version>3.5.2</version>
                    <executions>
                        <execution>
                            <goals>
                                <goal>integration-test</goal>
                                <goal>verify</goal>
                            </goals>
                        </execution>
                    </executions>
                </plugin>
            </plugins>
        </build>
    </profile>
</profiles>
```

---

## Maven Diagnostic Commands Reference

When builds fail or behave unexpectedly, these commands diagnose the root cause:

| Command | Purpose |
|---------|---------|
| `mvn help:effective-pom` | Show the fully resolved POM after inheritance, interpolation, and profile activation |
| `mvn help:effective-pom -pl :my-service` | Effective POM for a specific module |
| `mvn dependency:tree` | Display the full dependency tree with transitive dependencies |
| `mvn dependency:tree -Dincludes=com.fasterxml.jackson.core` | Filter the dependency tree to specific artifacts |
| `mvn dependency:tree -Dverbose` | Show why each dependency was selected (path length, conflicts) |
| `mvn help:evaluate -Dexpression=project.version -q -DforceStdout` | Print a single property value directly to stdout |
| `mvn enforcer:enforce` | Run enforcer rules and report violations |
| `mvn dependency:analyze` | Report used/declared and unused declared dependencies |
| `mvn -N help:effective-pom` | Show the effective POM of the reactor root (use `-N` for non-recursive) |

---

## BAD vs. GOOD: Common Maven Mistakes

### ❌ Hardcoding versions in child POMs without dependencyManagement

```xml
<!-- ❌ BAD — Child declares version directly; easy to drift across modules -->
<dependency>
    <groupId>org.slf4j</groupId>
    <artifactId>slf4j-api</artifactId>
    <version>2.0.16</version>  <!-- Hardcoded — if another module uses 2.0.9, conflict! -->
</dependency>

<dependency>
    <groupId>com.fasterxml.jackson.core</groupId>
    <artifactId>jackson-databind</artifactId>
    <version>2.17.0</version>  <!-- Different version from my-api module → runtime failure -->
</dependency>
```

### ✅ Centralized versions in parent dependencyManagement

```xml
<!-- ✅ GOOD — Version declared once in parent; children omit version entirely -->
<!-- Parent pom.xml -->
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.slf4j</groupId>
            <artifactId>slf4j-api</artifactId>
            <version>2.0.16</version>
        </dependency>
        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-databind</artifactId>
            <version>2.18.2</version>
        </dependency>
    </dependencies>
</dependencyManagement>

<!-- Child pom.xml — no version needed -->
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
```

### ❌ Using `<source>` and `<target>` instead of `<release>`

```xml
<!-- ❌ BAD — source/target split compilation into two phases; does not set bootstrap classpath -->
<configuration>
    <source>21</source>
    <target>21</target>
</configuration>
```

### ✅ Using the unified `release` flag (Java 9+)

```xml
<!-- ✅ GOOD — Single flag, sets all three aspects correctly for modern Java -->
<configuration>
    <release>21</release>
</configuration>
```

---

## Constraints

### MUST DO
- Always use a parent POM with `<dependencyManagement>` and `<pluginManagement>` for multi-module projects
- Define a BOM module (`pom` packaging) for third-party dependency version alignment; child modules import it with `<scope>import</scope>`
- Use `${project.version}` in all child POMs instead of hardcoded version numbers to keep releases synchronized
- Add maven-enforcer-plugin with at least `requireJavaVersion`, `requireMavenVersion`, and `requireUpperBoundDeps` rules
- Set `<scope>test</scope>` explicitly on all test-scoped dependencies — never rely on default scope (`compile`) for tests
- Use `<exclusions>` to resolve transitive dependency conflicts at the point of declaration, with a comment explaining why
- Run `mvn clean verify` from the reactor root as the standard build command before committing changes

### MUST NOT DO
- Hardcode dependency versions in child POMs when a parent `dependencyManagement` section exists — this creates silent version drift
- Remove the `<relativePath>` from `<parent>` declarations — Maven falls back to the repository, which is slower and may resolve the wrong version
- Use `<source>` and `<target>` instead of `<release>` for Java compilation — use the unified `release` flag introduced in Java 9
- Declare modules that do not exist as directories — Maven will fail with "module directory does not exist"
- Override enforcer-plugin rules in child POMs to disable them for individual modules — this defeats build-time policy enforcement
- Use `<scope>system</scope>` for dependencies — it breaks portability and CI builds; always use Maven Central or a private repository

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `gradle-build-system` | Alternative build system using Gradle Kotlin DSL, version catalogs, and convention plugins for projects that prefer Gradle over Maven |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Apache Maven User Guide](https://maven.apache.org/guides/index.html)
- [Maven POM Reference](https://maven.apache.org/pom.html)
- [Maven Dependency Mechanism](https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html)
- [Multi-Module Projects Guide](https://maven.apache.org/guides/mini/guide-multiple-modules.html)
- [Maven Enforcer Plugin](https://maven.apache.org/enforcer/maven-enforcer-plugin/)
- [Maven Dependency Plugin: tree Goal](https://maven.apache.org/plugins/maven-dependency-plugin/tree-mojo.html)
- [Using Maven Toolchains](https://maven.apache.org/guides/mini/guide-using-toolchains.html)
