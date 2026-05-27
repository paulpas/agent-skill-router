---
name: gradle-build-system
description: Implements Gradle build configurations (Kotlin DSL, version catalogs, multi-project builds, dependency locking, configuration cache) for Java and Kotlin projects.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: gradle, build.gradle.kts, gradle kotlin dsl, version catalog, dependency locking, configuration cache, gradle daemon, java plugin, multi project build, libs.versions.toml, declarative plugins block
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
  related-skills: maven-build-system
---

# Gradle Build System

Implements Gradle build configurations for Java and Kotlin projects — managing multi-project builds with Kotlin DSL, version catalogs (`libs.versions.toml`), configuration cache, convention plugins from `buildSrc`, and incremental build optimization. When loaded, the model acts as a senior build engineer producing correct Gradle configuration files, resolving dependency conflicts through version catalogs, and diagnosing build performance issues via the configuration cache and task input/output analysis.

## TL;DR Checklist

- [ ] Use Kotlin DSL (`*.gradle.kts`) for all build scripts — type-safe, refactoring-friendly, IDE-aware
- [ ] Define a central `gradle/libs.versions.toml` version catalog for all third-party dependency versions
- [ ] Enable configuration cache (`org.gradle.configuration-cache=true`) and build cache in `gradle.properties`
- [ ] Organize shared build logic into convention plugins under `buildSrc/src/main/kotlin/`
- [ ] Set up custom tasks with typed inputs using `@Input`, `@Optional`, `@Internal`, `@OutputDirectory` annotations
- [ ] Use platform BOMs via `implementation(platform(...))` for dependencies that provide version alignment
- [ ] Run `./gradlew --configuration-cache :tasks` and `./gradlew :dependencies` to diagnose issues

---

## When to Use

Use this skill when:

- Setting up a new Gradle project or multi-project build from scratch using Kotlin DSL
- Configuring version catalogs (`libs.versions.toml`) to centralize dependency versions across modules
- Creating convention plugins in `buildSrc` to eliminate duplicated build logic across modules
- Diagnosing configuration cache incompatibilities and build performance bottlenecks
- Setting up dependency locking for reproducible builds in CI/CD pipelines
- Configuring Java toolchains with automatic JDK provisioning via the Foojay Resolver plugin
- Migrating a Groovy DSL (`build.gradle`) project to Kotlin DSL (`build.gradle.kts`)

---

## When NOT to Use

Avoid this skill for:

- Simple single-file scripts — Gradle's configuration phase overhead is not justified for trivial builds
- Projects already committed to Maven with established reactor builds and BOMs
- Android projects that need the full Android Gradle Plugin (AGP) features — use AGP-specific skills instead
- When only dependency resolution (not full build lifecycle) is needed — consider a dedicated tool

---

## Core Workflow

1. **Initialize Project Structure** — Create `settings.gradle.kts` with the root project name, version catalog declaration via `pluginManagement {}` and `dependencyResolutionManagement {}`, and module inclusion via `include()`. Configure repositories early in the settings script to avoid repository conflicts across modules. Enable `TYPESAFE_PROJECT_ACCESSORS` feature preview for type-safe project dependency accessors (e.g., `project(":my-api")` becomes `libs.projects.myApi`).
   **Checkpoint:** Run `./gradlew projects` after creating `settings.gradle.kts`; verify all expected modules appear under the correct composite name (e.g., `:my-api`, `:my-service`).

2. **Configure Version Catalog** — Create `gradle/libs.versions.toml` with all third-party dependency versions organized by group in `[versions]`, library coordinates in `[libraries]`, and optional bundles in `[bundles]`. Use semantic versioning constraints (`>=`, `<`, `~>`) where appropriate to allow flexible updates. Every module references catalog aliases (e.g., `libs.jackson.databind`) instead of hardcoded version strings.
   **Checkpoint:** Run `./gradlew help --rerun-tasks` and verify no "unable to resolve" warnings for catalog aliases in any module's build script.

3. **Create Convention Plugins** — Extract repeated configuration from individual module build scripts into convention plugins under `buildSrc/src/main/kotlin/`. Use the typed extension pattern: create an abstract class with `@get:Inject` constructor parameters, expose it via `extensions.create()`, and apply it as a plugin ID in `plugins {}` blocks. Convention plugins encapsulate Java compilation settings, test configuration, and shared dependencies so that individual module build scripts stay under 40 lines.
   **Checkpoint:** Every module's `build.gradle.kts` should contain only `plugins {}` declarations and `dependencies {}` blocks — zero Java compiler settings, zero test configurations, zero custom task definitions in the module scripts themselves.

4. **Enable Configuration Cache** — Add `org.gradle.configuration-cache=true` and `org.gradle.caching=true` to `gradle.properties`. Run the build with `--configuration-cache` to verify compatibility; fix any reported incompatibilities (non-serializable objects, direct file I/O in configuration phase).
   **Checkpoint:** The configuration cache report must show zero "Configuration cache issues" warnings. If it reports serialization problems, replace non-serializable objects in extension classes with Gradle's `ObjectFactory` or `Provider<T>`.

5. **Verify Dependency Resolution** — Run `./gradlew :my-service:dependencies --configuration runtimeClasspath` to verify all dependencies resolve correctly and no conflicting versions are pulled in transitively. Use version catalog aliases consistently across all modules. For multi-project builds, run this for every module to catch inter-module dependency issues.
   **Checkpoint:** No dependency resolution failures or version conflict warnings. Every module uses catalog aliases, not hardcoded version strings.

6. **Optimize Incremental Builds** — Add proper task input/output annotations (`@Input`, `@Optional`, `@Internal`, `@OutputDirectory`) to custom tasks. Use Gradle's incremental build APIs (`task.upToDateWhen`, `SourceTask.setIncludes/setExcludes`) to maximize cache hits. Run the same task twice and verify the second run reports "UP-TO-DATE".
   **Checkpoint:** Custom tasks that have not changed produce no output on re-execution, confirming inputs and outputs are correctly declared for Gradle's incremental build system.

---

## Implementation Patterns / Reference Guide

### Pattern 1: settings.gradle.kts and Version Catalog

The settings script controls project composition while the version catalog centralizes all dependency versions in a single TOML file. The declarative `plugins {}` block replaces the legacy classpath-based approach.

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

Individual modules apply convention plugins and declare dependencies using catalog aliases — no hardcoded versions anywhere in the build scripts. This is the core advantage of version catalogs.

```kotlin
// my-service/build.gradle.kts — Minimal, clean, catalog-driven
plugins {
    id("my-platform.java-library")        // Convention plugin from buildSrc
    alias(libs.plugins.spotless)           // Plugin alias from settings or plugins block
}

dependencies {
    // Internal module dependencies (type-safe accessor with TYPESAFE_PROJECT_ACCESSORS)
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
```

### Pattern 3: Convention Plugin from buildSrc with Typed Extensions

Convention plugins encapsulate shared build logic in `buildSrc`. Use the typed extension pattern for customizable behavior — each module can override defaults by configuring the extension.

```kotlin
// buildSrc/src/main/kotlin/my-platform.java-library.gradle.kts
import org.gradle.api.plugins.JavaPluginExtension
import org.gradle.kotlin.dsl.configure
import org.gradle.kotlin.dsl.dependencies
import org.gradle.kotlin.dsl.withType
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

Custom tasks must declare their inputs and outputs for incremental build support and cacheability. Use the modern typed task API with abstract properties and Gradle's `@TaskAction` annotation.

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

Performance settings go in `gradle.properties` (project-level) or `$HOME/.gradle/gradle.properties` (user-level). These control the Gradle daemon, configuration cache, and memory allocation.

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

### Pattern 6: Version Management — BAD vs. GOOD

Version catalogs (`libs.versions.toml`) eliminate hardcoded version strings from build scripts. Every module references catalog aliases instead of inline versions.

```kotlin
// ❌ BAD — Hardcoded version strings directly in dependencies blocks
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

### Pattern 7: Dependency Mediation with Platform BOMs

Gradle resolves dependency conflicts using a "closest wins" strategy. Use platform BOMs to align transitive versions, equivalent to Maven's `<dependencyManagement>` with `scope=import`.

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

## Gradle Diagnostic Commands Reference

When builds fail or behave unexpectedly, these commands diagnose the root cause:

| Command | Purpose |
|---------|---------|
| `./gradlew --configuration-cache :tasks` | List all tasks with configuration cache pre-check |
| `./gradlew :my-service:dependencies --configuration runtimeClasspath` | Show dependency tree for a specific module and configuration |
| `./gradlew :my-service:dependencies --dependency com.fasterxml.jackson.core` | Filter dependency tree to specific artifacts |
| `./gradlew help --dry-run` | Execute all tasks in dry-run mode to verify task graph without executing |
| `./gradlew build --scan` | Produce a Build Scan (Gradle Enterprise) for performance analysis |
| `./gradlew properties` | List all project properties and extensions |
| `./gradlew tasks --all` | List all tasks including convention-plugin-registered ones |
| `./gradlew --stop` | Stop the Gradle daemon process to clear stale state |
| `./gradlew :my-module:help --rerun-tasks` | Force re-execution of help task for fresh diagnostic output |
| `./gradlew --configure-on-demand` | Configure only requested projects (faster for large multi-project builds) |

---

## Constraints

### MUST DO
- Always use Kotlin DSL (`*.gradle.kts`) instead of Groovy DSL (`*.gradle`) for type safety, refactoring support, and IDE integration
- Centralize all third-party dependency versions in `gradle/libs.versions.toml` — never hardcode version strings in build scripts
- Enable the configuration cache (`org.gradle.configuration-cache=true`) and verify compatibility with every release
- Extract repeated build logic into convention plugins under `buildSrc/src/main/kotlin/` rather than duplicating code across module build scripts
- Use proper task input/output annotations (`@Input`, `@Optional`, `@OutputDirectory`, `@PathSensitive`) on all custom tasks for incremental build support
- Set Java toolchain version in convention plugins via `java { toolchain { languageVersion.set(JavaLanguageVersion.of(n)) } }` rather than relying on the system JDK
- Run `./gradlew --configuration-cache :build` in CI to ensure configuration cache compatibility is validated on every build

### MUST NOT DO
- Hardcode dependency versions directly in `dependencies {}` blocks when a version catalog exists — this defeats the purpose of centralized version management
- Use the legacy `buildscript { dependencies { classpath(...) } }` block for plugin application — always use the declarative `plugins {}` block
- Directly read or write files during the configuration phase — defer all file I/O to task actions, or use `layout.projectDirectory.file()` with providers
- Disable the configuration cache as a "workaround" for build issues — fix the root cause (non-serializable objects) instead of suppressing the feature
- Use `project.evaluationDependsOn(":module")` for inter-module dependencies — it creates circular evaluation risks; use `implementation(project(":module"))` instead
- Configure plugins in `buildSrc` using Groovy (`*.gradle`) when the convention plugin itself is Kotlin (`*.gradle.kts`) — language mismatch causes compilation failures

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `maven-build-system` | Alternative build system using Maven POM structure, BOMs, and profile activation for teams that prefer Maven over Gradle |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Gradle User Guide](https://docs.gradle.org/current/userguide/userguide.html)
- [Gradle Kotlin DSL Documentation](https://docs.gradle.org/current/userguide/kotlin_dsl.html)
- [Version Catalogs Documentation](https://docs.gradle.org/current/userguide/platforms.html)
- [Configuration Cache Documentation](https://docs.gradle.org/current/userguide/configuration_cache.html)
- [Convention Plugins Guide](https://docs.gradle.org/current/userguide/organizing_gradle_projects.html#sec:convention_plugins)
- [Java Plugin Reference](https://docs.gradle.org/current/dsl/org.gradle.api.plugins.JavaPluginExtension.html)
- [Dependency Management Documentation](https://docs.gradle.org/current/userguide/dependency_management_basics.html)
