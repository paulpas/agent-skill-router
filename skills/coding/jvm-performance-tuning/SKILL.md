---
name: jvm-performance-tuning
description: Optimizes JVM runtime performance through garbage collector selection and tuning, memory layout configuration, JIT compilation flags, and allocation-aware coding patterns for Java 17+ applications.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: jvm tuning, garbage collection, G1GC, zgc, shenandoah, memory management, jit compilation, virtual threads
  archetypes:
    - tactical
    - generation
  anti_triggers:
    - brainstorming
    - vague ideation
    - code golf
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
    - examples
  related-skills: jvm-diagnostics, framework-performance-tuning, async-programming
---

# JVM Performance Tuner

Optimize Java application runtime performance through evidence-based garbage collector selection, memory layout configuration, JIT tuning, and allocation-aware code patterns. Apply measurement-driven changes — baseline first, modify one parameter at a time, validate with controlled benchmarks. This skill covers proactive optimization only; for incident response (OOM diagnosis, thread dump triage, heap leak analysis), use `jvm-diagnostics` instead.

## TL;DR Checklist

- [ ] Benchmark application performance baseline BEFORE changing any JVM flags
- [ ] Select GC based on latency vs throughput SLA: ZGC (< 1ms pauses) or G1GC (balanced) for interactive workloads, Parallel GC for batch/throughput
- [ ] Always set `-Xms` equal to `-Xmx` to eliminate dynamic heap resizing overhead
- [ ] Enable unified GC logging (`-Xlog:gc*`) in production for trend analysis
- [ ] For containerized deployments (Docker/Kubernetes), use `-XX:+UseContainerSupport` and set `-Xmx` to 80% of container memory limit minus ~300MB overhead
- [ ] Prefer Generational ZGC (JDK 21+) over non-generational ZGC for typical workloads

---

## When to Use

Use this skill when:

- Selecting a garbage collector for a new production deployment and need evidence-based guidance
- Tuning an existing application that shows excessive GC pause times violating latency SLAs
- Preparing JVM configuration for containerized deployments (Docker, Kubernetes) with memory limits
- Optimizing memory allocation patterns to reduce GC pressure in the application code
- Evaluating whether Generational ZGC (JDK 21+) is appropriate for the workload
- Tuning JIT compilation thresholds (`CompileThreshold`, `OnStackReplacement`) for long-running applications
- Configuring Metaspace sizing and class unloading behavior for applications with heavy dynamic class loading

---

## When NOT to Use

Avoid this skill for:

- **Debugging OutOfMemoryError incidents** — use `jvm-diagnostics` for heap dump analysis, OOM triage, and leak investigation
- **Investigating thread deadlocks or contention** — use `jvm-diagnostics` for thread dump analysis and lock profiling
- **Analyzing production crash logs (hs_err_pid*.log)** — this skill is proactive optimization, not incident response
- **Single-threaded batch processing with no latency requirements** — default JVM settings are usually sufficient; tuning overhead outweighs benefits

---

## Core Workflow

1. **Capture Performance Baseline** — Run the application under realistic load and measure key metrics: throughput (ops/sec), p50/p95/p99 latency, GC pause times, CPU utilization, and heap utilization over time. Record all existing JVM flags.
    ```bash
    # Enable unified GC logging for baseline measurement (Java 9+)
    -Xlog:gc*:file=/var/log/app/gc_baseline.log:time,uptime,level,tags:filecount=5,filesize=50m

    # Monitor heap and GC in real-time during baseline run
    jstat -gc <pid> 1000 > gc_stats_baseline.csv   # Sample every 1 second
    top -H -p <pid>                                 # Per-thread CPU usage snapshot

    # Capture application metrics (if using JFR)
    jcmd <pid> JFR.start name=baseline duration=5m filename=/tmp/baseline.jfr settings=profile
    ```
    **Checkpoint:** Baseline must run for at least 10 minutes under realistic load. Document throughput, average GC time percentage, and peak heap utilization before proceeding.

2. **Select Garbage Collector** — Choose the collector based on your application's SLA profile:
    - **Sub-millisecond pause requirement (< 1-5ms p99):** Generational ZGC (JDK 21+) or non-generational ZGC (JDK 17+)
    - **Balanced throughput and latency (50-200ms acceptable pauses):** G1GC (default since JDK 11) with tuned parameters
    - **Maximum throughput, pauses don't matter:** Parallel GC (`-XX:+UseParallelGC`) for batch/throughput workloads
    - **Large heaps (> 32GB) with low pause tolerance:** ZGC or Shenandoah (Red Hat builds)
    
    Select ONE collector and apply all tuning knobs for that collector. Do not mix collectors or switch between them without full benchmark cycles.
    **Checkpoint:** Confirm the selected GC is active at runtime: `jcmd <pid> VM.flags | grep -i gc`. In some container environments, the default may differ from documentation.

3. **Configure Memory Layout** — Set explicit heap boundaries and tune memory-related flags for the selected workload type:
    - Fixed heap sizing to eliminate resizing overhead
    - Metaspace configuration for dynamic class-loading applications
    - Code Cache tuning for JIT-heavy workloads
    - Container-aware memory settings with native memory tracking
    
    **Checkpoint:** Verify `-Xms` equals `-Xmx`. Check that `MetaspaceSize` and `MaxMetaspaceSize` are set above the measured baseline to avoid premature class unloading cycles.

4. **Apply Application-Level Allocation Optimizations** — Modify code allocation patterns to reduce GC pressure without changing JVM flags:
    - Replace object creation hotspots with primitive arrays, object pooling, or value-based APIs (`record` types)
    - Reduce escape analysis pressure by keeping short-lived objects truly short-lived (avoid storing them in long-lived data structures)
    - Use `StringConcatFactory`-friendly patterns instead of explicit `StringBuilder` where the JIT can optimize
    - For high-throughput request handlers, use `java.util.concurrent.atomic` with padding to reduce false sharing
    
    **Checkpoint:** After code changes, re-run the baseline benchmark. Measure GC frequency and heap allocation rate improvement (via JFR `jdk.ObjectAllocation` events). Document before/after metrics.

5. **Validate Under Sustained Load** — Run the application with new JVM flags for 30+ minutes under production-like load. Compare all baseline metrics: total GC time percentage, average pause duration, p50/p95/p99 latency, and throughput. If any metric degraded, revert ALL changes to baseline and re-analyze before making a different single change.
    **Checkpoint:** All performance targets must be met during sustained load, not just short bursts. Verify no regression in GC efficiency (e.g., reduced pause time but increased total GC CPU time).

---

## Implementation Patterns / Reference Guide

### Pattern 1: G1GC Tuning for Balanced Workloads

G1GC is the default collector since JDK 11 and provides a good balance of throughput and latency for most production applications. Tune it when you need predictable pause times (typically 50-200ms) but don't require sub-millisecond guarantees. The key tuning parameters control GC frequency, pause targets, and heap region management.

```java
/**
 * G1GC tuning configuration examples for production Java 17+ applications.
 * Apply one set at a time, benchmark, then adjust based on measured results.
 */

// ── Production-Default G1GC Configuration (most workloads) ─────────────────────

// -XX:+UseG1GC                        // Enable G1 garbage collector (JDK 11+ default)
// -Xms8g -Xmx8g                      // Fixed heap: eliminates resizing overhead
// -XX:MaxGCPauseMillis=200           // Target max pause time — JVM adjusts region count to meet this
// -XX:G1HeapRegionSize=16m           // Larger regions for heaps > 4GB (reduces metadata overhead)
// -XX:InitiatingHeapOccupancyPercent=45  // Trigger concurrent marking at 45% heap occupancy
// -XX:G1ReservePercent=10            // Reserve 10% of heap space to handle promotion failures
// -XX:ParallelGCThreads=8            // Parallelism for stop-the-world phases (default: min(4, CPUs))

// ── Low-Latency G1GC Configuration (p99 < 50ms target) ────────────────────────

// -XX:+UseG1GC
// -Xms16g -Xmx16g                    // Larger heap reduces GC frequency but increases memory pressure
// -XX:MaxGCPauseMillis=50            // Tighter pause target — JVM may increase collection frequency
// -XX:G1HeapRegionSize=4m            // Smaller regions for finer-grained evacuation (more overhead)
// -XX:InitiatingHeapOccupancyPercent=35  // Start marking earlier to avoid mixed GC pauses
// -XX:G1ReservePercent=5             // Less reserve — trade promotion failure risk for throughput
// -XX:G1MixedGCCountTarget=8         // Aim for ~8 mixed collections per full cycle
// -XX:G1MixedGCLiveThresholdPercent=85 // Only evacuate regions with >85% live data during mixed GC
// -XX:G1RSetUpdatingPauseTimePercent=5 // Limit time spent updating remembered sets

// ── Code Example: Allocation Pattern That Reduces G1GC Pressure ────────────────

package com.example.gc;

/**
 * Demonstrates allocation patterns that minimize G1GC evacuation overhead.
 * Key insight: G1GC evacuates live objects from young to old generation during mixed GC.
 * Reducing unnecessary object creation decreases the evacuation workload.
 */
public class LowAllocationRequestProcessor {

    // ❌ BAD: Creates a new wrapper object for every single request — 
    // forces high young-gen allocation rate and frequent minor collections
    public Record processWithAllocation(String input) {
        RequestData data = new RequestData(input, System.nanoTime());
        String result = compute(data);
        return new Result(result, false);  // Another short-lived object
    }

    private record RequestData(String input, long timestamp) {}
    private record Result(String value, boolean fromCache) {}

    // ✅ GOOD: Use primitive computation paths where the JIT can optimize.
    // For request handlers with predictable structure, use a reusable holder pattern
    // that avoids creating objects per-request. The JIT's escape analysis can often
    // eliminate short-lived object allocation entirely when the object doesn't escape.
    public String processWithoutAllocation(String input) {
        // Direct computation — no intermediate objects created
        return computeDirect(input);
    }

    private String computeDirect(String input) {
        // JIT-friendly pattern: simple transformation with no temporary allocations
        int hash = input.hashCode();
        char[] chars = new char[input.length()];
        for (int i = 0; i < input.length(); i++) {
            chars[i] = Character.toLowerCase(input.charAt(i));
        }
        return String.copyValueOf(chars) + "_" + hash;
    }

    private String compute(RequestData data) {
        try { Thread.sleep(5); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        return "computed_" + data.input.hashCode();
    }
}

/**
 * Object pooling example for high-frequency allocations that cannot be eliminated.
 * Use when allocation rate exceeds 10k objects/second per thread.
 */
class ObjectPool<T> {
    private final java.util.ArrayDeque<T> available;
    private final java.util.function.Supplier<T> factory;

    public ObjectPool(int initialCapacity, java.util.function.Supplier<T> factory) {
        this.available = new java.util.ArrayDeque<>(initialCapacity);
        this.factory = factory;
        for (int i = 0; i < initialCapacity; i++) {
            available.add(factory.get());
        }
    }

    public T acquire() {
        synchronized (available) {
            T obj = available.poll();
            return obj != null ? obj : factory.get();
        }
    }

    public void release(T obj) {
        synchronized (available) {
            if (obj instanceof Resettable r) {
                r.reset();
            }
            available.offer(obj);
        }
    }

    interface Resettable { void reset(); }
}
```

### Pattern 2: Generational ZGC Configuration (JDK 21+)

Generational ZGC is the recommended collector for most Java 21+ workloads. It extends traditional ZGC with a generational model — short-lived objects are collected in a young generation with minimal pause times, while long-lived objects are promoted to the old generation and collected less frequently. This approach can reduce GC work by 50-90% compared to non-generational ZGC for typical application workloads where most objects die young.

```java
// ── Generational ZGC: JDK 21+ Production Configuration (recommended default) ───

// -XX:+UseZGC                          // Enable Z Garbage Collector
// -XX:+ZGenerational                   // Enable generational mode — critical for most workloads
// -Xms16g -Xmx16g                      // Fixed heap; Generational ZGC handles short-lived objects efficiently
// -XX:ConcGCThreads=8                  // Concurrent GC thread count (default = min(4, CPUs))
// -XX:+ZPageStatistics                 // Print page-level statistics for debugging (diagnostic)

// ── Non-Generational ZGC: JDK 17+ Configuration (use when generational not available) ──

// -XX:+UseZGC                          // Enable Z Garbage Collector
// -Xms32g -Xmx32g                      // Larger heap typical for non-gen ZGC workloads
// -XX:ConcGCThreads=8                  // More concurrent threads to keep up with large heap
// -XX:+UnlockDiagnosticVMOptions       // Required for some ZGC-specific flags

// ── Shenandoah GC Alternative (Red Hat / OpenJDK builds) ──────────────────────

// -XX:+UseShenandoahGC                 // Enable Shenandoah Garbage Collector
// -Xms32g -Xmx32g
// -XX:ShenandoahGCHeuristics=compact   // Heuristic modes: compact, incremental, selective, old
// -XX:ShenandoahRegionSize=1m          // Region size — smaller regions for more frequent collection
// -XX:ShenandoahPromotionFailureLoops=4 // Tries multiple times before fallback to full GC

/**
 * Allocation pattern example optimized for Generational ZGC.
 * 
 * Generational ZGC excels when objects follow a clear lifetime pattern:
 * short-lived objects (request-scoped) die in young gen, 
 * long-lived objects (caches, session data) promote to old gen and stay.
 * The key is to NOT keep short-lived objects alive beyond their natural scope.
 */
package com.example.zgc;

import java.util.concurrent.ConcurrentHashMap;

/**
 * Demonstrates request-scoped vs application-scoped object lifetimes.
 * 
 * Request-scoped objects die young → collected by young gen ZGC (< 1ms pause).
 * Application-scoped objects promote to old gen → collected less frequently.
 * The generational boundary is where the performance win lives.
 */
public class GenerationalZgcHandler {

    // Application-scoped cache: long-lived, promotes to old gen quickly
    private static final ConcurrentHashMap<String, ComputationResult> resultCache = 
        new ConcurrentHashMap<>(256);

    // Per-request objects: die in young generation — ideal for generational ZGC
    public Response handleRequest(String requestId, String payload) {
        // Short-lived temporary object — dies at end of method, collected in young gen
        RequestContext context = new RequestContext(requestId, payload);
        
        try {
            ComputationResult result = computeAndCache(context);
            
            // Another short-lived object — request-scoped data
            Response response = buildResponse(context, result);
            return response;  // Both context and response eligible for collection here
        } finally {
            // Explicit cleanup is NOT needed — the entire RequestContext scope ends here
            // Generational ZGC handles this efficiently in young generation collections
        }
    }

    private ComputationResult computeAndCache(RequestContext ctx) {
        return resultCache.computeIfAbsent(ctx.payload, key -> {
            // Long-lived result: promotes to old generation and stays for future requests
            String data = doExpensiveComputation(key);
            return new ComputationResult(data, System.currentTimeMillis());
        });
    }

    private String doExpensiveComputation(String payload) {
        try { Thread.sleep(5); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        return "computed_" + payload.hashCode();
    }

    private Response buildResponse(RequestContext ctx, ComputationResult result) {
        return new Response(ctx.requestId, result.data, false); // Short-lived
    }

    record RequestContext(String requestId, String payload) {}
    record ComputationResult(String data, long computedAt) {}
    record Response(String requestId, String data, boolean fromCache) {}
}
```

### Pattern 3: Container-Aware JVM Configuration

When running Java applications in Docker containers or Kubernetes pods with memory limits (`resources.limits.memory`), the JVM must be made aware of container boundaries. Without this configuration, the JVM sees the host's total memory and may over-allocate heap space, causing OOM Killer to terminate the container. JDK 17+ enables `UseContainerSupport` by default; JDK 11 requires explicit activation.

```bash
# ── JDK 21+ Container Configuration (recommended) ───────────────────────────────

# UseContainerSupport: enabled by default in JDK 17+. Explicit for clarity.
-XX:+UseContainerSupport

# Generational ZGC with container awareness
-XX:+UseZGC
-XX:+ZGenerational

# Set heap to 80% of container limit — leave ~20% for native memory (threads, metaspace, direct buffers)
# For a 16GB container: -Xmx12g + overhead ≈ 14.5GB total usage
-Xms12g -Xmx12g

# Metaspace: start at 256MB, cap at 512MB (typical for Spring Boot applications)
-XX:MetaspaceSize=256m -XX:MaxMetaspaceSize=512m

# Code Cache: 256MB is sufficient for most JVMs; tune only for native-heavy apps
-XX:ReservedCodeCacheSize=256m

# JIT compilation tuning for containerized workloads (limited CPU cores)
-XX:ConcGCThreads=2                  # Scale concurrent threads to fraction of available CPUs
-XX:ActiveProcessorCount=4           # Tell JVM the visible CPU count if Docker is misreporting

# GC logging for production monitoring
-Xlog:gc*:file=/var/log/app/gc.log:time,uptime,level,tags:filecount=10,filesize=50m

# ── Docker Compose Example ─────────────────────────────────────────────────────

# docker-compose.yml snippet:
# services:
#   app:
#     mem_limit: 16g
#     environment:
#       - JAVA_OPTS=-XX:+UseContainerSupport -XX:+UseZGC -XX:+ZGenerational \
#         -Xms12g -Xmx12g -XX:MetaspaceSize=256m -XX:MaxMetaspaceSize=512m \
#         -Xlog:gc*:file=/var/log/app/gc.log:time,uptime,level,tags
#     command: java $JAVA_OPTS -jar /app.jar

# ── Kubernetes Deployment Example ───────────────────────────────────────────────

# k8s deployment.yaml snippet:
# spec:
#   containers:
#   - name: app
#     resources:
#       limits:
#         memory: "16Gi"
#         cpu: "4000m"
#       requests:
#         memory: "12Gi"
#         cpu: "2000m"
#     env:
#     - name: JAVA_OPTS
#       value: >-
#         -XX:+UseContainerSupport
#         -XX:+UseZGC
#         -XX:+ZGenerational
#         -Xms12g
#         -Xmx12g
#         -XX:MetaspaceSize=256m
#         -XX:MaxMetaspaceSize=512m

# ── JDK 17 Memory Calculator (for manual heap sizing) ───────────────────────────

# Native memory overhead estimate:
#   - Metaspace: 256-512MB
#   - Code Cache: 256MB
#   - Thread stacks: N threads × 1MB default (or 320KB with -Xss1024k)
#   - Direct buffers, compressed class space, GC structures: ~300-500MB
# 
# Formula: heap_limit = container_memory_limit - native_overhead(~2gb for large containers)

# Example: 8GB container → -Xmx6g (leaves ~2GB for native overhead)
```

### Pattern 4: Metaspace and Code Cache Tuning for Dynamic Class Loading Applications

Applications that load classes dynamically (Groovy scripting engines, OSGi frameworks, hot-swap development environments, URLClassLoader-based plugin systems) accumulate metadata in Metaspace. The default `MaxMetaspaceSize` is unbounded, which can cause the JVM to consume excessive native memory. Similarly, applications with heavy JIT compilation need Code Cache tuning to avoid recompilation churn.

```java
/**
 * Metaspace and Code Cache diagnostic class.
 * 
 * Use these getters to monitor Metaspace utilization in application code.
 * If MetaspaceUsage.getUsed() approaches MaxMetaspaceSize, the JVM triggers
 * full GC cycles for class unloading — which adds pause time overhead.
 */
package com.example.metaspace;

import java.lang.management.ClassLoadingMXBean;
import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.MemoryPoolMXBean;
import java.util.List;

/**
 * Monitors Metaspace and Code Cache utilization at runtime.
 */
public class ClassMetadataMonitor {

    private final MemoryMXBean memoryBean;
    private final List<MemoryPoolMXBean> poolBeans;

    public ClassMetadataMonitor() {
        this.memoryBean = ManagementFactory.getMemoryMXBean();
        this.poolBeans = ManagementFactory.getMemoryPoolMXBeans();
    }

    /**
     * Returns current Metaspace utilization as a percentage of MaxMetaspaceSize.
     */
    public double getMetaspaceUtilizationPercent() {
        java.lang.management.MemoryUsage metaUsage = memoryBean.getNonHeapMemoryUsage();
        if (metaUsage.getMax() <= 0) return -1.0; // Unbounded — no max set
        return (double) metaUsage.getUsed() / metaUsage.getMax() * 100;
    }

    /**
     * Returns Code Cache utilization as a percentage of ReservedCodeCacheSize.
     */
    public double getCodeCacheUtilizationPercent() {
        return poolBeans.stream()
            .filter(p -> p.getName().equals("Code Cache"))
            .mapToDouble(p -> (double) p.getUsage().getUsed() / Math.max(p.getUsage().getMax(), 1))
            .findFirst()
            .orElse(0.0);
    }

    /**
     * Returns the count of loaded classes — useful for detecting classloader leaks.
     */
    public long getLoadedClassCount() {
        return ManagementFactory.getClassLoadingMXBean().getLoadedClassCount();
    }

    /**
     * Determine if Metaspace tuning is needed based on current utilization.
     */
    public boolean needsMetaspaceTuning() {
        double utilization = getMetaspaceUtilizationPercent();
        return utilization > 0 && utilization > 80;
    }

    /**
     * JVM configuration flags for high-Metaspace applications:
     * 
     * -XX:MetaspaceSize=512m       // Initial allocation — higher = fewer GC cycles for class loading
     * -XX:MaxMetaspaceSize=1g      // Cap to prevent unbounded native memory consumption
     * -XX:CompileThreshold=10000   // Increase from default 10k for JIT-heavy workloads
     */
    public record MetaspaceConfig(int initialSizeMB, int maxSizeMB) {}

    private static final MetaspaceConfig DEFAULT = new MetaspaceConfig(512, 1024);
}
```

```bash
# ── Code Cache Tuning for JIT-Heavy Applications (AOT, GraalVM, Heavy Annotation) ─

# For applications with > 1M compiled methods:
# -XX:ReservedCodeCacheSize=512m     # Increase from default 240MB
# -XX:InitialCodeCacheSize=64m       # Start larger to avoid resizing during startup
# -XX:CompileThreshold=10000         # Number of method invocations before compilation (default: 10k)
# -XX:-UseOnStackReplacement         # Disable OSR if it causes latency spikes

# ── JIT Compilation Monitoring via jcmd ─────────────────────────────────────────

# View JIT compilation statistics:
jcmd <pid> VM.print_compliance_properties    # Print compliance properties
jcmd <pid> GC.heap_info                       # Current heap state

# Enable verbose JIT logging (for troubleshooting slow startup or recompilation):
# -XX:+UnlockDiagnosticVMOptions
# -XX:+LogCompilation                          # Writes compiler log to hotspot.log
# -XX:LogFile=/var/log/app/compiler.log

# ── Virtual Threads (Project Loom) Configuration — JDK 21+ ──────────────────────

# Virtual threads are lightweight, user-mode threads managed by the JVM.
# They replace platform threads for blocking I/O operations, dramatically reducing 
# thread count and associated native memory usage (thread stacks).

# No special JVM flags needed — virtual threads are opt-in via API:
# Thread.startVirtualThread(Runnable)      // Create and start a virtual thread
# Executors.newVirtualThreadPerTaskExecutor()  // ExecutorService backed by virtual threads

# Recommended tuning for virtual-thread-heavy applications:
# -XX:ActiveProcessorCount=4                 # Set if container misreports CPU count
# -Xss320k                                  # Virtual thread stack size (default is 1MB for platform threads)
#                                          # Smaller stacks allow millions of virtual threads within same memory budget

# Container Java script auto-detection (JDK 17+):
# JAVA_OPTS environment variables are respected by the container-entrypoint scripts:
#   -XX:+UseContainerSupport                   # Detect container limits automatically
#   -XX:ActiveProcessorCount=4                 # Override CPU count if needed
#   -Xms<size> -Xmx<size>                      # Heap sizing (respects container memory limit when UseContainerSupport=true)
```

---

## JVM Flag Reference by GC Type

| Parameter | G1GC Default | G1GC Low-Latency | ZGC (JDK 21+ Gen) | Shenandoah |
|-----------|-------------|------------------|---------------------|------------|
| Enable flag | `-XX:+UseG1GC` (default JDK 11+) | `-XX:+UseG1GC` | `-XX:+UseZGC -XX:+ZGenerational` | `-XX:+UseShenandoahGC` |
| Heap size | `-Xms8g -Xmx8g` | `-Xms16g -Xmx16g` | `-Xms16g -Xmx16g` | `-Xms32g -Xmx32g` |
| Pause target | `MaxGCPauseMillis=200` | `50-100` | Not applicable (< 1ms) | Not applicable (< 1ms) |
| Region size | Auto (2MB-32MB based on heap) | Manual: `-XX:G1HeapRegionSize=4m` | N/A | `-XX:ShenandoahRegionSize=1m` |
| Concurrent threads | Auto (`min(4, CPUs)`) | `-XX:ConcGCThreads=8` | `-XX:ConcGCThreads=8` | Auto |
| IHOP (G1 only) | 45% | 35% | N/A | N/A |

**Always set `-Xms` equal to `-Xmx` in production.** Dynamic heap resizing causes performance spikes as the JVM grows or shrinks the heap during runtime, triggering additional GC cycles and CPU overhead.

---

## Constraints

### MUST DO
- Benchmark all applications with a realistic load profile BEFORE changing any JVM flags — never optimize blind; document throughput, p50/p95/p99 latency, GC pause times, and CPU utilization as baseline metrics
- Select the garbage collector based on your application's SLA: sub-millisecond pauses → Generational ZGC (JDK 21+), balanced → G1GC with tuned parameters, batch/throughput → Parallel GC
- Always set `-Xms` equal to `-Xmx` to eliminate dynamic heap resizing overhead — this single change often reduces GC-related latency spikes by 30%+
- Enable unified GC logging (`-Xlog:gc*:file=/var/log/app/gc.log:time,uptime,level,tags`) in ALL production deployments — GC logs are essential for post-incident analysis and capacity planning
- For containerized deployments (Docker/Kubernetes), always use `-XX:+UseContainerSupport` and set `-Xmx` to approximately 80% of the container memory limit to leave room for native memory overhead (metaspace, code cache, thread stacks, direct buffers)
- Prefer Generational ZGC (JDK 21+) over non-generational ZGC or G1GC when JDK version permits — generational collection typically reduces GC work by 50-90% for workloads where most objects die young
- Use JFR with `settings=profile` configuration for production profiling — it captures JVM-level events (GC, CPU, locks) with < 1% overhead and zero code changes required

### MUST NOT DO
- Increase heap size as a first response to performance problems — optimize GC settings, allocation patterns, or application architecture first; adding RAM only delays the inevitable
- Use Serial GC or Parallel GC in production interactive systems — they cause full stop-the-world pauses that violate latency SLAs and cause visible application freezes
- Use `-XX:+UseConcMarkSweeper` (CMS) — it has been deprecated since JDK 9 and removed in JDK 14; use G1GC or ZGC instead
- Stack multiple JVM flag changes simultaneously — change ONE parameter at a time, benchmark after each change, and document the measured impact. Without isolated testing you cannot attribute any improvement to a specific flag
- Set `-XX:MaxGCPauseMillis` to zero or extremely low values (e.g., 1ms) with G1GC — this causes excessive collection frequency and increases total GC CPU time without meaningful latency improvement
- Pin objects on monitors during long I/O operations — ZGC's concurrent read barriers require thread pinning, and extended pin times stall the entire heap
- Set `-Xss` (stack size) below 256k for production applications unless you have explicit profiling data showing the current stack depth is safe with smaller stacks — thread stack overflow causes native crashes, not Java exceptions

---

## Output Template

When recommending JVM performance optimizations, produce:

1. **Workload Profile** — Application type (REST API, batch processor, streaming), JDK version, expected heap size range, and latency/throughput SLAs
2. **Recommended GC Selection** — Specific collector with justification based on workload profile and SLA requirements
3. **Complete JVM Flag Set** — All `-X`, `-XX:` flags for the selected configuration (do not list individual flags in isolation)
4. **Container Configuration** — Memory sizing formula, container environment adjustments if applicable
5. **Code-Level Optimization Recommendations** — Specific allocation patterns to modify with before/after examples
6. **Validation Steps** — Exact commands to run for post-tuning benchmark comparison and metrics to verify

---

## Live References

| Resource | URL |
|----------|-----|
| JDK 21 JVM Documentation | https://docs.oracle.com/en/java/javase/21 |
| OpenJDK Garbage Collector Overview | https://openjdk.org/groups/vm/garbage-collector.html |
| ZGC Architecture and Features | https://openjdk.org/projects/jdk/21/features/zgc/ |
| Shenandoah GC Documentation | https://wiki.openjdk.org/display/shenandoah/Main |
| Java Virtual Machine Garbage Collection Tuning Guide (Oracle) | https://docs.oracle.com/en/java/javase/21/gctuning/Introduction-to-Garbage-Collection-Tuning-in-HotSpot-Java-VM.html |
| JDK 21 Release Notes — Generational ZGC | https://openjdk.org/jeps/439 |
| Project Loom — Virtual Threads (JEP 444) | https://openjdk.org/jeps/444 |
| Java Flight Recorder User Guide | https://docs.oracle.com/en/java/javase/21/profile/jfr.html |
| Eclipse Memory Analyzer Tool (MAT) | https://www.eclipse.org/mat/ |

---

## Related Skills

| Skill | Purpose |
|---|---|
| `jvm-diagnostics` | Reactive troubleshooting: OOM diagnosis, heap dump analysis, thread dump triage, crash log investigation — use when a production incident requires root cause identification rather than proactive optimization |
| `framework-performance-tuning` | Framework-level optimization (connection pooling, caching, async processing) — tune this layer before touching JVM flags; framework issues account for most performance problems |
| `async-programming` | Virtual threads and structured concurrency (JDK 21+) — use alongside this skill when redesigning thread models for I/O-bound applications |

---

> 📖 skill(local cache): jvm-diagnostics, framework-performance-tuning, async-programming
