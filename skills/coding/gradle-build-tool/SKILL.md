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

---

## When to Use

Use this skill when:

- Setting up a new multi-project Gradle build with Kotlin DSL and shared convention plugins
- Creating or migrating version catalogs (`libs.versions.toml`) to centralize dependency versions across modules
- Configuring the Gradle configuration cache and build cache for reproducible, fast CI builds
- Extracting shared build logic from repetitive `build.gradle.kts` files into convention plugins under `buildSrc`
- Writing custom Gradle tasks with typed inputs/outputs that participate in incremental builds
- Diagnosing slow builds using the configuration cache report, task input/output tracking, and dependency analysis
- Setting up Java/Kotlin projects with JUnit 5, Spotless, Jacoco, and Dokka via convention plugins
- Migrating from Maven `pom.xml` files to Gradle Kotlin DSL

---

## When NOT to Use

Avoid this skill for:

- Setting up Maven-based projects — use `maven-build-tool` instead
- Writing Java/Kotlin application code — this skill covers build configuration only
- Managing Android-specific build features (NDK, APK signing configs) beyond standard dependency management
- Projects using sbt (Scala), Leiningen/Clojure, or Ant as their build tool

---

## Core Workflow

1. **Root Project Initialization** — Create `settings.gradle.kts` with the root project name, version catalog declaration, and module inclusion. Configure the plugin portal and Maven Central repositories early in the settings script to avoid repository conflicts.
   **Checkpoint:** Run `./gradlew projects` after creating settings.gradle.kts; verify all expected modules appear. The output should list every included subproject under the correct composite name (e.g., `:my-api`, `:my-service`).

2. **Version Catalog Setup** — Create `gradle/libs.versions.toml` with all third-party dependency versions organized by group and alias. Use semantic versioning constraints (`>=`, `<`, `~>`) where appropriate to allow flexible updates.
   **Checkpoint:** Run `./gradlew help --rerun-tasks` and verify no "unable to resolve" warnings for catalog aliases in any module's build script.

3. **Convention Plugin Creation** — Extract repeated configuration from individual module build scripts into convention plugins under `buildSrc/src/main/kotlin/`. Use `plugins {}` blocks with typed extension classes (e.g., `MyAppExtension`) for customizable plugin behavior.
   **Checkpoint:** Every module's `build.gradle.kts` should be fewer than 40 lines of pure `plugins { }` declarations and dependency declarations — no Java compiler settings, no test configurations, no custom task definitions.

4. **Configuration Cache Setup** — Add `org.gradle.configuration-cache=true` and `org.gradle.caching=true` to `gradle.properties`. Run the build with `--configuration-cache` to verify compatibility; fix any reported incompatibilities.
   **Checkpoint:** The configuration cache report must show zero "Configuration cache issues" warnings. If it reports serialization problems, replace non-serializable objects in extension classes with Gradle's `ObjectFactory` or `Provider<T>`.

5. **Dependency Resolution Verification** — Run `./gradlew :my-service:dependencies --configuration runtimeClasspath` to verify all dependencies resolve correctly and no conflicting versions are pulled in transitively. Use version catalog aliases consistently across all modules.
   **Checkpoint:** No dependency resolution failures or version conflict warnings in the output. Every module uses catalog aliases, not hardcoded version strings.

6. **Incremental Build Optimization** — Add `@Input`, `@Optional`, `@Internal`, `@OutputDirectory` annotations to custom task inputs and outputs. Use Gradle's incremental build APIs (`task.upToDateWhen`, `SourceTask.setIncludes/setExcludes`) to maximize cache hits.
   **Checkpoint:** Run the same task twice in a clean environment (second run should show "UP-TO-DATE"). Verify with `./gradlew :module:tasks --all | grep -i <task-name>`.

---

## Implementation Patterns / Reference Guide

### Pattern 1: settings.gradle.kts and Version Catalog

The settings script controls project composition, while the version catalog centralizes all dependency versions in a single TOML file.

```kotlin
// settings.gradle.kts — Project structure and repository configuration
plugins {
    id("org.gradle.toolchains.foojay-resolver-convention") version "0.9.0"
}

rootProject.name = "my-platform"

enableFeaturePreview("TYPESAFE_PROJECT_ACCESSORS")

include(":my-core")
include(":my-api")
include(":my-service")
include(":my-web")
include(":my-bom")
```

```toml
# gradle/libs.versions.toml — Version catalog for all dependency versions
[versions]
# Core platform versions
java = "21"
junit-jupiter = "5.11.4"
kotlin = "2.0.21"
slf4j = "2.0.16"
logback = "1.5.7"
jackson = "2.18.2"
guava = "33.3.1-jre"
commons-lang3 = "3.17.0"
classgraph = "4.8.179"

# Plugin versions
spotless = "6.25.0"
jacoco = "0.8.12"
dokka = "1.9.20"
shadow = "8.3.0"
dependency-check = "12.0.4"

[bundles]
# Pre-grouped dependency bundles for common use cases
jackson = ["jackson-core", "jackson-databind", "jackson-annotations"]
test-base = ["junit-jupiter-api", "junit-jupiter-engine", "mockito-core"]

[libraries]
# --- Core Logging ---
slf4j-api = { module = "org.slf4j:slf4j-api", version.ref = "slf4j" }
logback-classic = { module = "ch.qos.logback:logback-classic", version.ref = "logback" }

# --- Jackson ---
jackson-core = { module = "com.fasterxml.jackson.core:jackson-core", version.ref = "jackson" }
jackson-databind = { module = "com.fasterxml.jackson.core:jackson-databind", version.ref = "jackson" }
jackson-annotations = { module = "com.fasterxml.jackson.core:jackson-annotations", version.ref = "jackson" }

# --- Google Guava ---
guava = { module = "com.google.guava:guava", version.ref = "guava" }

# --- Apache Commons ---
commons-lang3 = { module = "org.apache.commons:commons-lang3", version.ref = "commons-lang3" }

# --- Class Graph ---
classgraph = { module = "io.github.classgraph:classgraph", version.ref = "classgraph" }

# --- Kotlin ---
kotlin-stdlib = { module = "org.jetbrains.kotlin:kotlin-stdlib", version.ref = "kotlin" }
kotlin-reflect = { module = "org.jetbrains.kotlin:kotlin-reflect", version.ref = "kotlin" }

# --- Testing ---
junit-jupiter-api = { module = "org.junit.jupiter:junit-jupiter-api", version.ref = "junit-jupiter" }
junit-jupiter-engine = { module = "org.junit.jupiter:junit-jupiter-engine", version.ref = "junit-jupiter" }
mockito-core = { module = "org.mockito:mockito-core", version = "5.14.2" }
mockito-junit-jupiter = { module = "org.mockito:mockito-junit-jupiter", version = "5.14.2" }

# --- Build Tools ---
spotless-plugin = { module = "com.diffplug.spotless:spotless-plugin-gradle", version.ref = "spotless" }
jacoco-plugin = { module = "org.gradle.jacoco:org.gradle.jacoco.gradle.plugin", version.ref = "jacoco" }
dokka-plugin = { module = "org.jetbrains.dokka:dokka-gradle-plugin", version.ref = "dokka" }
shadow-plugin = { module = "com.github.johnrengelman:shadow", version.ref = "shadow" }
dependency-check-plugin = { module = "org.owasp:dependency-check-gradle", version.ref = "dependency-check" }

# --- Test Runtime ---
h2 = { module = "com.h2database:h2", version = "2.3.232" }
```

### Pattern 2: Module build.gradle.kts Using Version Catalogs

Individual modules apply convention plugins and declare dependencies using catalog aliases — no hardcoded versions anywhere.

```kotlin
// my-service/build.gradle.kts — Minimal, clean, catalog-driven
plugins {
    id("my-platform.java-library")        // Convention plugin from buildSrc
    alias(libs.plugins.spotless)           // Plugin alias from settings or plugins block
}

dependencies {
    // Internal module dependencies
    implementation(project(":my-api"))

    // Third-party — versions resolved from libs.versions.toml
    implementation(libs.slf4j.api)
    implementation(libs.jackson.databind)
    implementation(libs.guava)
    implementation(libs.commons.lang3)

    // Exclude Log4j-over-SLF4j transitive dependency — conflicts with logback-classic
    implementation(libs.logback.classic) {
        exclude(group = "org.slf4j", module = "slf4j-api")
    }

    // Testing dependencies via catalog bundle
    testImplementation(libs.bundles.test.base)
    testRuntimeOnly(libs.h2)
}

spotless {
    java {
        googleJavaFormat("1.25.2")
        target("src/**/*.java")
    }
}
```

### Pattern 3: Convention Plugin from buildSrc

Convention plugins encapsulate shared build logic in `buildSrc`. Use the typed extension pattern for customizable behavior.

```kotlin
// buildSrc/src/main/kotlin/my-platform.java-library.gradle.kts
import com.android.build.api.variant.LibraryAndroidComponentsExtension
import java.util.Properties

plugins {
    `java-library`
}

// Typed extension — allows customization per module via extensions.create()
extensions.create("myJava", JavaConventionExtension::class.java)

val ext = extensions.getByType(JavaConventionExtension::class.java)

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(ext.javaVersion))
    }

    withSourcesJar()
    withJavadocJar()
}

tasks.withType<JavaCompile>().configureEach {
    options.encoding = "UTF-8"
    options.compilerArgs.addAll(listOf(
        "-parameters",          // Preserve parameter names for reflection/Spring
        "-Xlint:unchecked",     // Warn on unchecked operations
        "-Xlint:deprecation"    // Warn on deprecated API usage
    ))
}

tasks.withType<Test>().configureEach {
    useJUnitPlatform()
    systemProperty("user.timezone", "UTC")
    systemProperty("file.encoding", "UTF-8")
    reports.html.required.set(true)
    reports.junitXml.required.set(true)
}

dependencies {
    testImplementation("org.assertj:assertj-core:3.26.3")
    testImplementation(libs.mockito.core)
    testImplementation(libs.mockito.junit.jupiter)
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

abstract class JavaConventionExtension @Inject constructor(
    objectFactory: ObjectFactory
) {
    val javaVersion: Int = 21
}
```

### Pattern 4: Custom Task with Typed Inputs (Incremental Builds)

Custom tasks must declare their inputs and outputs for incremental build support and cacheability.

```kotlin
// buildSrc/src/main/kotlin/my-platform.code-gen.gradle.kts
import org.gradle.api.DefaultTask
import org.gradle.api.file.DirectoryProperty
import org.gradle.api.file.RegularFileProperty
import org.gradle.api.provider.ListProperty
import org.gradle.api.provider.Property
import org.gradle.api.tasks.*

plugins {
    base
}

// Register the custom task with typed inputs
tasks.register<CodeGenerationTask>("codeGenerate") {
    inputSchema.set(layout.projectDirectory.file("schema/schema.xsd"))
    outputDir.set(layout.buildDirectory.dir("generated/codegen"))
    targetLanguages.set(listOf("java", "kotlin"))
}

@CacheableTask
abstract class CodeGenerationTask : DefaultTask() {

    @InputFile
    @Optional
    abstract val inputSchema: RegularFileProperty

    @OutputDirectory
    abstract val outputDir: DirectoryProperty

    @Input
    abstract val targetLanguages: ListProperty<String>

    @Option(
        option = "override-output",
        description = "Force regeneration even if up-to-date"
    )
    var overrideOutput: Boolean = false

    @TaskAction
    fun generate() {
        val schema = inputSchema.orNull ?: run {
            logger.warn("No schema file provided — skipping code generation")
            return
        }

        val outputs = outputDir.get().asFile
        if (!overrideOutput && outputs.listFiles()?.isNotEmpty() == true) {
            logger.lifecycle("Code generation is up-to-date. Skipping.")
            return
        }

        outputs.mkdirs()
        targetLanguages.get().forEach { lang ->
            val outputFile = File(outputs, "generated-${lang}.txt")
            outputFile.writeText(
                "// Auto-generated code for $lang\n" +
                "// Schema: ${schema.asFile.absolutePath}\n" +
                "// Generated at: ${java.time.Instant.now()}"
            )
            logger.lifecycle("Generated code for target: $lang → ${outputFile.path}")
        }
    }
}
```

### Pattern 5: gradle.properties with Performance Optimizations

Performance settings go in `gradle.properties` (project-level) or `$HOME/.gradle/gradle.properties` (user-level).

```properties
# gradle/gradle.properties — Project-level performance and configuration

# ── Build Performance ──────────────────────────────────────────────
# Enable the Gradle Configuration Cache — caches the build configuration phase
org.gradle.configuration-cache=true

# Enable the Gradle Build Cache — reuses outputs from previous builds (local or remote)
org.gradle.caching=true

# Max heap for Gradle daemon (default is 512m; increase for large projects)
org.gradle.jvmargs=-Xmx2g -XX:MaxMetaspaceSize=512m -XX:+HeapDumpOnOutOfMemoryError

# Limit parallel workers to avoid CPU contention with IDE or other tools
org.gradle.workers.max=4

# Enable parallel project evaluation (can speed up multi-project builds)
org.gradle.parallel=true

# ── Daemon Settings ────────────────────────────────────────────────
# Keep the daemon alive for 6 hours instead of shutting down after 3 min idle
org.gradle.daemon.idletimeout=3600000

# ── Kotlin DSL Optimization ───────────────────────────────────────
# Reduce memory usage for Kotlin Script compilation
org.gradle.kotlin.dsl.allWarningsAsErrors=false

# ── JVM Toolchain (optional — managed by foojay-resolver) ────────
# Automatically download and manage Java toolchains
org.gradle.java.installations.auto-download=true
```

### Pattern 5: Version Management — BAD vs. GOOD

Version catalogs (`libs.versions.toml`) eliminate hardcoded version strings from build scripts. Every module references catalog aliases instead of inline versions.

```kotlin
// ❌ BAD — Hardcoded version strings directly in build.gradle.kts dependencies blocks
// my-service/build.gradle.kts
dependencies {
    implementation("org.slf4j:slf4j-api:2.0.16")
    implementation("com.fasterxml.jackson.core:jackson-databind:2.18.2")
    implementation("com.google.guava:guava:33.3.1-jre")
    
    // Another module might use different versions
    testImplementation("org.junit.jupiter:junit-jupiter:5.10.2")
}

// my-api/build.gradle.kts — Same dependencies, different Jackson version
dependencies {
    implementation("com.fasterxml.jackson.core:jackson-databind:2.17.0")  // Conflict!
    testImplementation("org.junit.jupiter:junit-jupiter:5.11.4")           // Different JUnit too!
}

// ✅ GOOD — All versions in libs.versions.toml, using catalog aliases like libs.jackson.databind
// gradle/libs.versions.toml
// [versions]
// jackson = "2.18.2"
// junit-jupiter = "5.11.4"
//
// [libraries]
// jackson-databind = { module = "com.fasterxml.jackson.core:jackson-databind", version.ref = "jackson" }
// junit-jupiter = { module = "org.junit.jupiter:junit-jupiter", version.ref = "junit-jupiter" }

// my-service/build.gradle.kts — Clean, no hardcoded versions
dependencies {
    implementation(libs.jackson.databind)
    testImplementation(libs.junit.jupiter)
}

// my-api/build.gradle.kts — Same aliases, guaranteed same versions
dependencies {
    implementation(libs.jackson.databind)
    testImplementation(libs.junit.jupiter)
}
```

---

## Dependency Mediation in Gradle

Gradle resolves dependency conflicts using a "closest wins" strategy. When the same artifact appears on multiple paths at different versions, Gradle selects the one from the shortest path in the dependency graph. If paths are equal length, the first declared version wins. Use platform BOMs to align transitive versions:

```kotlin
// Using a platform BOM to manage all Jackson versions across modules
dependencies {
    // Platform acts like Maven's <dependencyManagement> with scope=import
    implementation(platform(libs.jackson.bom))
    
    // Versions inherited from platform — no version needed here
    implementation(libs.jackson.databind)
    implementation(libs.jackson.core)
    implementation(libs.jackson.annotations)
}

// For explicit version override (use sparingly):
dependencies {
    constraints {
        implementation("com.google.guava:guava") {
            version {
                strictly("33.3.1-jre")  // Forces this exact version
            }
        }
    }
}
```

---

## Key Gradle Diagnostic Commands

Use these commands to diagnose build issues and performance problems:

```bash
# List all tasks with configuration cache enabled — tests cache compatibility
./gradlew --configuration-cache :tasks

# Show the full dependency graph for a specific module and configuration
./gradlew :my-service:dependencies --configuration runtimeClasspath

# Generate a configuration cache report — shows what was cached and why
./gradlew --configuration-cache :compileJava

# List all included projects in the multi-project build
./gradlew projects

# Show task dependencies (which tasks depend on this one)
./gradlew :my-service:tasks --all | grep -i codegen

# Run a single module's tests with full output
./gradlew :my-service:test --info

# Check what version Gradle is actually using
./gradlew --version

# Analyze build performance with profiling
./gradlew clean assemble --profile

# Show which tasks are up-to-date vs. skipped vs. executed
./gradlew :my-service:assemble

# Clear configuration cache and build cache (for troubleshooting)
./gradlew --stop && rm -rf .gradle/configuration-cache build
```

---

## Constraints

### MUST DO
- Use Kotlin DSL (`.gradle.kts`) for all build scripts — never mix Groovy and Kotlin in the same project
- Centralize all third-party dependency versions in `gradle/libs.versions.toml` — no hardcoded version strings in `build.gradle.kts` files
- Enable configuration cache (`org.gradle.configuration-cache=true`) in `gradle.properties` for every multi-project build
- Organize shared build logic into convention plugins under `buildSrc/src/main/kotlin/` with typed extensions
- Annotate custom task inputs and outputs with `@Input`, `@Optional`, `@Internal`, or `@OutputDirectory` for incremental builds
- Configure JVM toolchains (`java.toolchain.languageVersion`) instead of hardcoded JDK paths for reproducible builds

### MUST NOT DO
- Put version catalogs in individual module build scripts — they belong exclusively in `gradle/libs.versions.toml`
- Use deprecated APIs like `compile` scope — use `implementation`, `api`, or `testImplementation` instead
- Run Gradle with `--configuration-cache` if your convention plugins serialize non-serializable objects (e.g., file collections, custom Groovy closures) without fixing them first
- Hardcode Java version in compiler options (`sourceCompatibility = "21"`) — use the toolchain API instead
- Mix `buildSrc` convention plugins with inline configuration in module build scripts — it defeats the purpose of convention plugins
- Run `./gradlew assemble` on the full multi-project build without specifying a specific project when diagnosing issues — always scope to `:module-name` first

---

## Output Template

When implementing or reviewing a Gradle build configuration, produce:

1. **Project Structure** — List of modules with their responsibilities and dependency relationships
2. **settings.gradle.kts** — The settings script with project name, module includes, and repository configuration
3. **libs.versions.toml** — The complete version catalog with all third-party dependencies organized by group
4. **Convention Plugin** — The convention plugin file from `buildSrc/` showing shared build logic
5. **Module build.gradle.kts** — A sample module showing clean, minimal declarations using only `plugins { }` and dependency aliases
6. **gradle.properties** — Performance optimization settings for configuration cache and build performance
7. **Dependency Resolution Notes** — For any explicit version constraints or exclusions, state the conflict and resolution rationale

---

## Related Skills

| Skill | Purpose |
|---|---|
| `maven-build-tool` | Alternative build tool using Maven with POM files, reactor builds, and enforcer rules |
| `coding-testing` | Unit test frameworks (JUnit 5, Mockito), integration testing patterns, and coverage configuration for Gradle |
| `coding-security-review` | Dependency vulnerability scanning with OWASP dependency-check-gradle plugin |

---

## Live References

> Authoritative documentation links for Gradle build tooling. The model follows markdown links at load time to resolve external references and inline content.

- [Gradle User Guide — Getting Started](https://docs.gradle.org/current/userguide/userguide.html)
- [Gradle Kotlin DSL Documentation](https://docs.gradle.org/current/userguide/kotlin_dsl.html)
- [Version Catalogs Guide](https://docs.gradle.org/current/userguide/platforms.html)
- [Configuration Cache Reference](https://docs.gradle.org/current/userguide/configuration_cache.html)
- [Convention Plugins — Community Plugin Repository](https://plugins.gradle.org/)
- [Gradle Build Cache Documentation](https://docs.gradle.org/current/userguide/build_cache.html)
- [Incremental Build Documentation](https://docs.gradle.org/current/userguide/incremental_build.html)
