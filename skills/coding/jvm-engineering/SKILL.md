---
name: jvm-engineering
description: Diagnoses and optimizes JVM performance through garbage collector tuning,
  memory profiling with JFR and async-profiler, heap dump analysis, thread contention
  detection, and configuration best practices for production Java applications.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: jvm tuning, garbage collection, GC tuning, zgc, shenandoah, jfr, jcmd,
    heap dump, memory leak, java performance, oom error, out of memory, thread deadlock,
    jstack, async-profiler, cpu profiling, jstat, jit compilation, metaspace
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
  - config
  - do-dont
  - examples
  related-skills: framework-performance-tuning, design-patterns-and-principles, async-programming
------
# JVM Performance Engineer

Act as a senior JVM performance engineer diagnosing production issues, tuning garbage collectors, profiling application behavior, and optimizing memory layout for high-throughput Java systems running on JDK 17+ or JDK 21+. You combine deep knowledge of HotSpot internals — the G1, ZGC, Shenandoah, and Parallel GC implementations — with practical expertise in the JDK diagnostic toolkit (jcmd, jstat, jstack, JFR, async-profiler) and heap analysis tools (Eclipse MAT). Your work is always measurement-driven: baseline first, change one variable at a time, validate with controlled benchmarks. This skill applies the 5 Laws of Elegant Defense — validate inputs before processing, make illegal states unrepresentable, fail fast with descriptive errors, return new data structures, and guide data naturally through the diagnostic pipeline.

## TL;DR Checklist

- [ ] Capture GC log with `-Xlog:gc*` before tuning — no tuning without GC metrics
- [ ] Use JFR flight recording for production profiling — zero code changes, low overhead (< 1%)
- [ ] Always capture a heap dump (`jcmd <pid> GC.heap_dump`) before restarting in OOM situations
- [ ] Set explicit `-Xms` and `-Xmx` to the same value to avoid dynamic resizing overhead
- [ ] Use `jcmd <pid> VM.flags | grep -i gc` to confirm which GC is actually active at runtime
- [ ] Compare baseline metrics before and after any tuning change — never optimize blind
- [ ] Increase heap size only AFTER confirming no memory leak exists with MAT leak suspect reports

---

## When to Use

Use this skill when:

- Production application throws `OutOfMemoryError` and requires heap dump analysis to identify the cause
- GC pause times are violating SLA targets (e.g., p99 latency spikes caused by stop-the-world pauses)
- Memory usage grows monotonically over hours or days, indicating a suspected memory leak
- Thread contention is causing CPU utilization to spike without throughput gains (spinning threads)
- Preparing JVM configuration for a new production deployment and need evidence-based GC selection
- Application experiences "GC thrashing" — frequent minor collections with no heap space reclaimed
- JIT compilation pauses cause visible application freezes (common on startup or after code cache filling)

---

## When NOT to Use

Avoid this skill for:

- **Debugging application logic bugs** — null pointer exceptions, incorrect business logic, or data corruption are not JVM problems; use a debugger or logging instead
- **Single-threaded batch jobs** — use VisualVM or IntelliJ profiler during development; production diagnostics tools are overkill for non-concurrent workloads
- **I/O or database bottlenecks** — if the profiler shows thread waits on network or disk, optimize those first (query indexes, connection pools, CDN caching)
- **Container memory limits without JVM awareness** — this skill tunes JVM flags; use `-XX:+UseContainerSupport` with `-Xmx` set to the container limit, but actual container orchestration is outside scope

---

## Core Workflow

1. **Gather Diagnostic Data** — Collect heap dump, thread dump, and GC logs using jcmd/JFR before making any changes. In a live incident, this is the critical first step because restarting without data loses the only evidence.
   ```bash
   # Identify the Java process
   jps -l

   # Capture thread dump (all threads with stack traces)
   jcmd <pid> Thread.print > threads_$(date +%s).txt

   # Capture heap dump (binary HPROF format for MAT analysis)
   jcmd <pid> GC.heap_dump /tmp/heapdump_$(date +%s).hprof

   # Start JFR flight recording if not already running
   jcmd <pid> JFR.start name=profile duration=5m filename=/tmp/profile.jfr

   # Check current GC configuration
   jcmd <pid> VM.flags | grep -iE "gc|heap"
   ```
   **Checkpoint:** Verify all four files were created and have non-zero size before proceeding. If any tool fails, check process permissions — `jcmd` requires the same user as the Java process or root access.

2. **Identify Bottleneck Category** — Classify the problem into one of four categories by analyzing the diagnostic data:
   - **Memory pressure**: Heap usage near capacity, frequent young GC cycles, possible OOM imminent. Check with `jstat -gc <pid> 1000 5`.
   - **GC thrashing**: GC runs taking > 90% of CPU time with minimal heap reclaimed. Check GC log for repeated collection cycles with short intervals.
   - **Thread contention / deadlock**: Threads blocked on monitors, lock waits accumulating. Check thread dump for `BLOCKED` state and "locked" resource chains.
   - **CPU bottleneck**: High user-space CPU without corresponding GC or I/O wait. Use `top -H -p <pid>` or async-profiler to identify hot JVM frames.
   **Checkpoint:** The bottleneck category determines the entire tuning strategy. Misclassifying memory pressure as a GC problem (by increasing heap instead of fixing the leak) delays the real fix.

3. **Analyze Heap Structure** — Load the HPROF file into Eclipse Memory Analyzer (MAT). Generate the "Leak Suspects Report" first, then drill into Dominator Trees and Thread Overviews for specific patterns:
   - `byte[]` arrays dominating heap → possible unbounded caching or large message buffers
   - Internalized strings (`java.lang.String`) growing → likely string interning from unbounded dynamic key generation (e.g., SQL query strings)
   - ThreadLocal maps not cleared → threads holding references in pools
   **Checkpoint:** The Leak Suspects Report must identify the specific class and allocation site. If MAT reports "no obvious leak," the problem may be GC configuration rather than a true leak.

4. **Tune GC Strategy** — Select and configure the appropriate garbage collector based on latency vs throughput requirements (detailed patterns below):
   - **Low-latency SLA (< 10ms pauses)**: Use ZGC or Shenandoah with `-XX:+UseZGC` or `-XX:+UseShenandoahGC`
   - **Balanced throughput/latency**: Tune G1GC with `-XX:MaxGCPauseMillis`, `-XX:G1HeapRegionSize`, and evacuation pause controls
   - **Maximum throughput (batch)**: Use Parallel GC with `-XX:+UseParallelGC` and tuned `-XX:ParallelGCThreads`
   **Checkpoint:** After applying changes, run the same load test used in Step 1 baseline. Compare `gc.log` metrics — total GC time percentage, average pause duration, and frequency of collections.

5. **Validate Changes** — Re-benchmark with the same realistic load profile. Document all JVM flags changed, the before/after metrics (GC pause times, throughput, heap utilization), and whether SLAs improved. If performance degraded, revert flags and re-analyze — never stack multiple changes simultaneously.
   **Checkpoint:** All p50/p95/p99 latency targets must be met under sustained load (30+ minutes), not just short bursts. Verify no new regression in GC behavior (e.g., reduced pause time but increased total GC CPU time).

---

## Implementation Patterns / Reference Guide

### Pattern 1: G1GC Tuning for Low Latency

G1GC is the default collector since JDK 11 and works well for most production workloads. Tune it when you need predictable pause times (typically 10-200ms) but don't need sub-millisecond guarantees. The key tuning knobs control GC frequency, pause targets, and heap region management.

```java
/**
 * JVM configuration examples for G1GC tuning in low-latency production systems.
 *
 * These flags are intended for Java 17+ (G1GC is mature and stable).
 * Apply one set at a time, benchmark, then adjust based on measured results.
 */

// ── Baseline G1GC Configuration (production-ready default) ─────────────────────

// -XX:+UseG1GC                        // Enable G1 garbage collector (default in JDK 11+)
// -Xms4g -Xmx4g                      // Fixed heap size — prevent dynamic resizing
// -XX:MaxGCPauseMillis=200           // Target maximum GC pause time (milliseconds)
// -XX:G1HeapRegionSize=16m           // Region size — larger regions reduce overhead for large heaps
// -XX:InitiatingHeapOccupancyPercent=45  // Trigger concurrent marking at 45% heap occupancy
// -XX:G1ReservePercent=10            // Reserve 10% of heap for promotion failures

// ── Low-Latency G1GC Configuration (p99 < 50ms) ───────────────────────────────

// -XX:+UseG1GC
// -Xms8g -Xmx8g                      // Larger fixed heap to reduce GC frequency
// -XX:MaxGCPauseMillis=50            // Tighter pause target — may increase GC frequency
// -XX:G1HeapRegionSize=4m            // Smaller regions for finer-grained evacuation
// -XX:InitiatingHeapOccupancyPercent=35  // Start marking earlier to avoid mixed GC pauses
// -XX:G1ReservePercent=5             // Less reserve — trade promotion failure risk for throughput
// -XX:G1MixedGCCountTarget=8         // Aim for 8 mixed collections per full cycle
// -XX:G1MixedGCLiveThresholdPercent=85 // Only evacuate regions with >85% live data in mixed GC
// -XX:G1RSetUpdatingPauseTimePercent=5 // Limit time spent updating remembered sets

// ── Diagnostic Flags (always include in production for post-incident analysis) ─

// -Xlog:gc*:file=/var/log/app/gc.log:time,uptime,level,tags:filecount=10,filesize=50m
// -XX:+UnlockDiagnosticVMOptions
// -XX:+DebugNonSafepoints             // More precise profiling without overhead
// -XX:+PrintGCApplicationStoppedTime  // Print actual stop-the-world pause duration

// ── Java Code: GC Pressure Monitor (MBean-based runtime monitoring) ────────────

package com.example.monitor;

import javax.management.*;
import java.lang.management.GarbageCollectorMXBean;
import java.lang.management.ManagementFactory;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Runtime GC pressure monitor that tracks collection counts, times, and heap usage.
 * Integrates with existing metrics pipelines (Prometheus, Datadog) via getter accessors.
 */
public class GcPressureMonitor {

    private final List<GarbageCollectorMXBean> gcBeans;
    private final javax.management.MemoryMXBean memoryBean;

    // Rolling counters for recent collections (last 60 seconds window)
    private final AtomicLong recentCollectionCount = new AtomicLong(0);
    private volatile long lastCheckTime = System.nanoTime();
    private volatile double recentGcPressure = 0.0; // Percentage of time spent in GC (last window)

    public GcPressureMonitor() {
        this.gcBeans = ManagementFactory.getGarbageCollectorMXBeans();
        this.memoryBean = ManagementFactory.getMemoryMXBean();
        Runtime.getRuntime().addShutdownHook(new Thread(this::logFinalStats));
    }

    /**
     * Check current GC pressure and return an alert if thresholds are exceeded.
     *
     * @param maxCollectionCount threshold: max collections in the 60-second window
     * @param maxPressurePercent threshold: max percentage of time spent in GC (e.g., 30.0 = 30%)
     * @return alert message if thresholds exceeded, null otherwise
     */
    public String checkGcPressure(int maxCollectionCount, double maxPressurePercent) {
        long now = System.nanoTime();
        long elapsedSeconds = (now - lastCheckTime) / 1_000_000_000L;

        if (elapsedSeconds >= 60) {
            long totalCollections = gcBeans.stream()
                    .mapToLong(GarbageCollectorMXBean::getCollectionCount)
                    .sum();

            double collectionRate = (double) (totalCollections - recentCollectionCount.get()) / Math.max(elapsedSeconds, 1);

            // Calculate GC pressure: time spent in GC / elapsed time
            long totalGcTimeMs = gcBeans.stream()
                    .mapToLong(GarbageCollectorMXBean::getCollectionTime)
                    .sum();
            recentGcPressure = (double) totalGcTimeMs / Math.max(elapsedSeconds * 1000, 1) * 100;

            recentCollectionCount.set(totalCollections);
            lastCheckTime = now;
        }

        long currentCollections = gcBeans.stream()
                .mapToLong(GarbageCollectorMXBean::getCollectionCount)
                .sum();

        if (recentGcPressure > maxPressurePercent) {
            return String.format(
                    "GC PRESSURE ALERT: %.1f%% of time spent in GC (threshold: %.0f%%). " +
                    "Total collections: %d, Heap: %.1f%% used",
                    recentGcPressure, maxPressurePercent, currentCollections,
                    getHeapUsagePercent());
        }

        if (recentGcPressure > maxPressurePercent * 0.8) {
            return String.format(
                    "GC WARNING: %.1f%% of time spent in GC (approaching threshold: %.0f%%). " +
                    "Consider tuning GC parameters.",
                    recentGcPressure, maxPressurePercent);
        }

        return null; // Normal — no alert
    }

    private double getHeapUsagePercent() {
        var heap = memoryBean.getHeapMemoryUsage();
        long used = heap.getUsed();
        long committed = heap.getCommitted();
        return (double) used / committed * 100;
    }

    private void logFinalStats() {
        System.out.println("=== Final GC Statistics ===");
        for (GarbageCollectorMXBean bean : gcBeans) {
            System.out.printf("%s: count=%d, time=%d ms%n",
                    bean.getName(), bean.getCollectionCount(), bean.getCollectionTime());
        }
    }

    public double getRecentGcPressure() { return recentGcPressure; }
}
```

---

### Pattern 2: ZGC Configuration for Sub-Millisecond Pause Times

ZGC (introduced in JDK 11 as experimental, production-ready since JDK 15) provides pause times that are independent of heap size — typically < 1ms even for multi-terabyte heaps. Shenandoah (available since JDK 12, production-ready JDK 15+) offers similar characteristics. Use these when your application has strict latency SLAs and cannot tolerate stop-the-world pauses above a few milliseconds.

```java
/**
 * JVM configuration examples for ZGC in ultra-low-latency production systems.
 *
 * Requirements: JDK 17+ (ZGC is production-ready). JDK 21+ provides enhanced ZGC
 * features including Generational ZGC mode (-XX:+ZGenerational) for further GC speedup.
 */

// ── ZGC Baseline Configuration (JDK 17+) ─────────────────────────────────────

// -XX:+UseZGC                      // Enable Z Garbage Collector
// -Xms32g -Xmx32g                  // Fixed heap — ZGC scales with heap size but pauses stay low
// -XX:ConcGCThreads=8              // Parallelism of concurrent GC threads (default = min(4, CPUs))
// -ZCollectionInterval=0           // 0 = always concurrent; non-zero enables periodic mixed mode
// -XX:+UnlockDiagnosticVMOptions   // Required for some ZGC-specific flags

// ── Generational ZGC (JDK 21+ — recommended for most workloads) ───────────────

// -XX:+UseZGC
// -XX:+ZGenerational               // Enable generational mode: short-lived objects in young gen,
//                                  // long-lived objects promoted to old gen (reduces work per cycle)
// -Xms16g -Xmx16g                  // Smaller heap needed with generational collection
// -XX:+ZPageStatistics             // Print page-level statistics for debugging

// ── Shenandoah GC Alternative (OpenJDK / Red Hat builds) ──────────────────────

// -XX:+UseShenandoahGC             // Enable Shenandoah Garbage Collector
// -Xms32g -Xmx32g
// -XX:ShenandoahGCHeuristics=compact  // Heuristic mode: compact, incremental, or selective
// -XX:ShenandoahRegionSize=1m      // Region size for Shenandoah
// -XX:ShenandoahPromotionFailureLoops=4 // Tries to handle promotion failures gracefully

// ── Java Code: ZGC-Friendly Allocation Patterns ───────────────────────────────

package com.example.gc;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.StampedLock;

/**
 * Example class demonstrating allocation patterns that work well with generational GC.
 * Key principle: minimize long-lived objects in the young generation and reduce
 * false sharing on hot counters by padding atomic fields.
 */
public class ZgcFriendlyRequestHandler {

    // StampedLock for high-throughput read-write access (avoids lock contention under ZGC pauses)
    private final StampedLock lock = new StampedLock();

    // Cache with bounded size — prevents unbounded growth in old generation
    private final ConcurrentHashMap<String, RequestResult> resultCache = new ConcurrentHashMap<>(256);

    /**
     * Thread-safe padding pattern to reduce false sharing on hot counters.
     * Without padding, adjacent atomic fields share cache lines, causing excessive
     * cache coherency traffic that compounds GC pause effects.
     */
    private static final class PaddedAtomicLong {
        long p1, p2, p3, p4, p5, p6, p7;
        volatile long value = 0;
        long p8, p9, p10, p11, p12, p13, p14;
    }

    // One counter per hotspot to minimize false sharing
    private final PaddedAtomicLong successCount = new PaddedAtomicLong();
    private final PaddedAtomicLong failCount = new PaddedAtomicLong();

    /**
     * Process a request with caching and metrics tracking.
     * Designed for low-latency: short-lived temporary objects, bounded cache,
     * no unnecessary long-lived allocations per request.
     */
    public RequestResult handleRequest(String requestId, String payload) {
        // Try cache first (fast path — read lock is cheap with StampedLock)
        String cacheKey = buildCacheKey(requestId, payload);
        ResultValue cached = resultCache.get(cacheKey);
        if (cached != null && System.nanoTime() - cached.createdAt < 30_000_000_000L) { // 30s TTL
            successCount.value++;
            return new RequestResult(cached.body, true); // Short-lived result object
        }

        // Compute result (write lock — rare path due to cache hits)
        long writeStamp = lock.writeLock();
        try {
            cached = resultCache.get(cacheKey); // Re-check after acquiring write lock
            if (cached != null && System.nanoTime() - cached.createdAt < 30_000_000_000L) {
                successCount.value++;
                return new RequestResult(cached.body, true);
            }

            String body = computeResult(payload);
            long now = System.nanoTime();
            ResultValue rv = new ResultValue(body, now);
            resultCache.put(cacheKey, rv);

            // Evict entries older than 60 seconds to prevent old-gen pressure
            evictExpiredEntries(now - 60_000_000_000L);

            successCount.value++;
            return new RequestResult(body, false);

        } finally {
            lock.unlockWrite(writeStamp);
        }
    }

    private String buildCacheKey(String requestId, String payload) {
        // Use hash-based key instead of concatenating full request strings
        // — reduces string object retention pressure
        return Integer.toString(payload.hashCode(), 32);
    }

    private String computeResult(String payload) {
        // Simulate computation (I/O, database query, external API call)
        try { Thread.sleep(5); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        return "result_" + payload.hashCode();
    }

    private void evictExpiredEntries(long olderThanNanos) {
        resultCache.entrySet().removeIf(entry ->
                entry.getValue().createdAt < olderThanNanos);
    }

    // Immutable result — safe for ZGC concurrent reading (no read barriers needed)
    public record RequestResult(String body, boolean fromCache) {}
    private record ResultValue(String body, long createdAt) {}
}
```

---

### Pattern 3: JFR Flight Recording for Production Profiling

Java Flight Recorder (JFR) is the preferred profiling tool for production environments because it has near-zero overhead (~1%), requires no code changes, and records comprehensive JVM-level data including GC events, thread states, CPU usage, lock contention, and method-level profiling. Unlike manual instrumentation or third-party profilers, JFR can be started and stopped on a running process via jcmd.

```bash
# ── Start a JFR recording with the default "profile" config (recommended for production) ──
jcmd <pid> JFR.start name=profile duration=5m filename=/tmp/app_profile.jfr settings=profile

# ── Use a custom configuration for detailed profiling (CPU-heavy investigation) ───
jcmd <pid> JFR.start name=detailed duration=10m \
  filename=/tmp/detailed_profile.jfr \
  settings=profile \
  jdk.CPUAllocationSample.enabled=true \
  jdk.JavaMonitorEnter.enabled=true \
  jdk.ExecutedThreadSubmit.enabled=true

# ── List all active recordings ────────────────────────────────────────────────────
jcmd <pid> JFR.check

# ── Stop a recording (if duration is not specified, must stop explicitly) ──────────
jcmd <pid> JFR.stop name=profile

# ── Convert JFR to human-readable text report ─────────────────────────────────────
jfrcat /tmp/app_profile.jfr --events jdk.ExecutionSample | head -50

# ── Use JDK 21+ jfr command-line tool for analysis (no GUI needed) ────────────────
jfr print --events java.ThreadAllocation java.ThreadPark /tmp/app_profile.jfr
jfr summary /tmp/app_profile.jfr > /tmp/profile_summary.txt  # Full text report

# ── Compare two recordings to measure impact of a code change ─────────────────────
jfr diff baseline.jfr after_change.jfr --events java.ThreadAllocation > comparison.txt
```

```java
/**
 * Java Flight Recorder integration for application-level events.
 *
 * JFR can record both JVM-native events (GC, thread states) and custom
 * application events via the jdk.jfr.Event API — no instrumentation overhead
 * when the event is not being consumed.
 */
package com.example.jfr;

import jdk.jfr.Category;
import jdk.jfr.Description;
import jdk.jfr.Event;
import jdk.jfr.Label;
import jdk.jfr.TimestampNanos;

/**
 * Custom JFR event for tracking business-level metrics without impacting performance.
 * When JFR is not recording, the onCommit() method is never called — zero overhead.
 */
@Label("Request Processing Time")
@Description("Records end-to-end request processing duration and outcome")
@Category({"application", "performance"})
public class RequestLatencyEvent extends Event {

    @Label("Endpoint Path")
    private final String path;

    @Label("HTTP Method")
    private final String method;

    @Label("Response Status Code")
    private final int statusCode;

    @Label("Processing Duration (nanoseconds)")
    @TimestampNanos
    private long durationNanos;

    /**
     * Constructor captures the values at event creation time.
     * These are "snapshot" fields — recorded once when the event is emitted.
     */
    public RequestLatencyEvent(String path, String method, int statusCode) {
        this.path = path;
        this.method = method;
        this.statusCode = statusCode;
    }

    /**
     * onCommit() is called by JFR when the event is actually being recorded.
     * If JFR is not active, this method is never invoked — no overhead.
     */
    @Override
    protected void onCommit() {
        this.durationNanos = System.nanoTime() - startTime;
    }

    /**
     * Static start time captured at construction for duration calculation.
     */
    private final long startTime;

    public RequestLatencyEvent(String path, String method, int statusCode, long startTime) {
        super();
        this.path = path;
        this.method = method;
        this.statusCode = statusCode;
        this.startTime = startTime;
    }

    /**
     * Emit this event from your application code. JFR will buffer it if recording,
     * or discard it silently if not — zero runtime cost when idle.
     *
     * Example usage:
     *   long start = System.nanoTime();
     *   try {
     *       // ... process request ...
     *       var event = new RequestLatencyEvent(path, method, 200, start);
     *       event.commit();
     *   } catch (Exception e) {
     *       var event = new RequestLatencyEvent(path, method, 500, start);
     *       event.commit();
     *       throw e;
     *   }
     */
    public void emit() {
        this.commit();
    }
}

/**
 * JFR Continuous Recording Configuration (JDK 11+).
 *
 * Start with JVM flag to enable continuous recording that automatically
 * rolls over every N minutes, preserving the last K recordings for debugging.
 * This is ideal for catching intermittent issues without manual intervention.
 *
 *   java -XX:StartFlightRecording:mode=continuous,duration=5m,filecount=10,filename=/tmp/recording_%.jfr \
 *        -jar myapp.jar
 *
 * Then retrieve recordings via jcmd:
 *   jcmd <pid> JFR.dump name=continuous filename=/tmp/recent.jfr
 *   jcmd <pid> JFR.show
 */
```

---

### Pattern 4: Heap Dump Analysis with Memory Analyzer Tool (MAT)

When the JVM throws `OutOfMemoryError: Java heap space`, the immediate action is to capture a heap dump before restarting. Then analyze it with Eclipse MAT to find the dominant objects and leak suspects. This section covers the most common OOM patterns and how to identify them in MAT's reports.

```bash
# ── Automatic Heap Dump on OOM (configure at JVM startup) ───────────────────────

# Java 9+: Unified logging format
-XX:+HeapDumpOnOutOfMemoryError
-XX:HeapDumpPath=/var/log/app/heapdump_%.hprof
-Xlog:gc*:file=/var/log/app/gc.log:time,uptime,level,tags

# For older Java versions (before 12) with -Xlog disabled:
# -XX:+HeapDumpOnOutOfMemoryError
# -XX:HeapDumpPath=/var/log/app/heapdump.hprof
# -XX:+PrintGCDetails -XX:+PrintGCDateStamps

# ── Capture Heap Dump on Demand from Live Process ───────────────────────────────

jps -l                                    # Find the Java PID
jcmd <pid> GC.heap_dump /tmp/dump.hprof   # Binary HPROF format (MAT-compatible)
jcmd <pid> GC.heap_dump -all /tmp/all.hprof # Include class metadata (larger file)
```

```java
/**
 * Common memory leak patterns in Java applications with code examples.
 * These represent the top causes of OOM errors found in production heap dumps analyzed via MAT.
 */
package com.example.leaks;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

// ── Pattern 1: Unbounded Cache — MOST COMMON ───────────────────────────────────

class UnboundedCacheLeak {
    // ❌ BAD: HashMap grows without limit — every unique key is retained forever
    private static final Map<String, Object> cache = new HashMap<>();

    public void put(String key, Object value) {
        cache.put(key, value);  // Never removed — OOM when memory exhausted
    }

    // ✅ GOOD: Use a bounded cache with eviction (e.g., LinkedHashMap with removeEldestEntry)
    private static final Map<String, Object> boundedCache = new LinkedHashMap<String, Object>(16, 0.75f, true) {
        @Override
        protected boolean removeEldestEntry(Map.Entry<String, Object> eldest) {
            return size() > 10_000; // Evict when cache exceeds 10k entries
        }
    };

    public void putBounded(String key, Object value) {
        boundedCache.put(key, value);  // Old entries evicted automatically
    }
}

// ── Pattern 2: Static Collection Growth — CLASS LEADER IN MAT LEAK SUSPECT REPORTS ─

class StaticCollectionLeak {
    // ❌ BAD: Static list accumulates all processed items forever
    private static final List<ProcessedRecord> records = new ArrayList<>();

    public void process(String data) {
        ProcessedRecord record = new ProcessedRecord(data, System.currentTimeMillis());
        records.add(record);  // Never cleared — grows until OOM
    }

    // ✅ GOOD: Use a circular buffer or bounded queue with periodic flush to storage
    private static final Deque<ProcessedRecord> processedBuffer = new ArrayDeque<>(10_000);
    private static int totalProcessed = 0;

    public void processBounded(String data) {
        ProcessedRecord record = new ProcessedRecord(data, System.currentTimeMillis());

        if (processedBuffer.size() >= 10_000) {
            flushToStorage(processedBuffer);
            processedBuffer.clear();
        }

        processedBuffer.addLast(record);
        totalProcessed++;
    }

    private void flushToStorage(Deque<ProcessedRecord> buffer) {
        // Persist to database, message queue, or file
        totalProcessed -= buffer.size();
    }
}

record ProcessedRecord(String data, long timestamp) {}

// ── Pattern 3: ThreadLocal Not Cleared in Thread Pools ─────────────────────────

class ThreadLocalLeak {
    // ❌ BAD: ThreadLocal in a thread pool holds references indefinitely
    private static final ThreadLocal<UserContext> context = ThreadLocal.withInitial(UserContext::new);

    public void handleRequest(Request req) {
        UserContext ctx = context.get();
        ctx.parse(req);       // Populates large objects
        process(ctx);
        // ❌ FORGOT: context.remove() — next thread in the pool reuses stale data AND memory
    }

    // ✅ GOOD: Always clear ThreadLocal in finally block or try-with-resources pattern
    private static final ThreadLocal<UserContext> safeContext = ThreadLocal.withInitial(UserContext::new);

    public void handleRequestSafe(Request req) {
        UserContext ctx = safeContext.get();
        try {
            ctx.parse(req);
            process(ctx);
        } finally {
            safeContext.remove(); // Prevents leak to next task in pool
        }
    }

    record Request(String data) {}
    static class UserContext {
        private final Map<String, Object> data = new HashMap<>();
        public void parse(Request req) { data.put("request", req); }
    }
}

// ── Pattern 4: String Interning from Dynamic Keys (JDK 7+) ─────────────────────

class StringInternLeak {
    // In JDK 6 and earlier, interned strings lived in PermGen.
    // In JDK 7+, they live in the regular heap — unbounded interning still causes OOM.

    private static final Set<String> internalized = new HashSet<>();

    public void process(String dynamicKey) {
        // ❌ BAD: Interning every unique key permanently retains it in heap
        String interned = dynamicKey.intern();  // Retained in StringTable forever
        internalized.add(interned);

        // In JDK 7+, dynamicKey.intern() adds the string to the StringTable (in heap),
        // which is never garbage collected until JVM shutdown. With millions of unique keys,
        // this fills the heap rapidly.
    }

    // ✅ GOOD: Use a bounded LRU cache instead of interning
    private final Map<String, String> keyCache = new java.util.concurrent.ConcurrentHashMap<>();

    public String processBounded(String dynamicKey) {
        return keyCache.computeIfAbsent(dynamicKey, k -> "processed_" + k.hashCode());
    }
}

// ── Pattern 5: Listener / Callback Registration Without Unregistration ─────────

class ListenerLeak {
    private static final List<EventHandler> handlers = new ArrayList<>();

    public void register(EventHandler handler) {
        handlers.add(handler);  // Never removed — references held forever
    }

    // ✅ GOOD: Provide unregister method and use WeakReference for observers
    private static final Set<WeakReference<EventHandler>> weakHandlers = ConcurrentHashMap.newKeySet();

    public void registerWeak(EventHandler handler) {
        weakHandlers.add(new WeakReference<>(handler));
    }

    public void trigger() {
        // Clean up dead references and notify live ones
        Iterator<WeakReference<EventHandler>> it = weakHandlers.iterator();
        while (it.hasNext()) {
            EventHandler handler = it.next().get();
            if (handler == null) {
                it.remove();  // GC collected — remove stale reference
            } else {
                handler.onEvent(new Event());
            }
        }
    }

    interface EventHandler { void onEvent(Event e); }
    record Event() {}
}
```

---

### Pattern 5: Thread Contention Diagnosis

Thread contention manifests as high CPU utilization from spinning threads, elevated wall-clock time with low throughput, and thread dumps showing many `BLOCKED` or `WAITING` states. Use `jstack`, `jcmd Thread.print`, or async-profiler to diagnose and resolve.

```bash
# ── Capture Thread Dump for Contention Analysis ─────────────────────────────────

# Method 1: jcmd (preferred — structured output, lower overhead than kill -3)
jcmd <pid> Thread.print > threads_$(date +%s).txt

# Method 2: jstack (legacy but widely available)
jstack -l <pid> > threads_$(date +%s).txt

# Method 3: Continuous thread sampling with async-profiler (best for sustained issues)
./async-profiler.sh start <pid>
sleep 60
./async-profiler.sh stop --format flat --output flamegraph.html <pid>

# ── Deadlock Detection ─────────────────────────────────────────────────────────

# Built-in deadlock detection in thread dump output:
# Look for "Found one Java-level deadlock" in jcmd/jstack output
jcmd <pid> Thread.print | grep -A 10 "deadlock\|BLOCKED"

# ── Monitor Thread States Over Time ────────────────────────────────────────────

# Quick snapshot of thread state distribution
jcmd <pid> Thread.print | grep -c "BLOCKED"   # Count blocked threads
jcmd <pid> Thread.print | grep -c "WAITING"    # Count waiting threads
jcmd <pid> Thread.print | grep -c "RUNNABLE"   # Count runnable threads

# ── Use async-profiler for CPU + Lock Contention Flame Graphs ──────────────────

./profiler.sh --alloc 10ms -d 60 -f alloc.html <pid>       # Allocation profile
./profiler.sh --lock 10ms -d 60 -f locks.html <pid>         # Lock contention profile
./profiler.sh --cpu -d 60 -f cpu.svg <pid>                  # CPU flame graph
```

```java
/**
 * Thread contention patterns with diagnosis code and solutions.
 */
package com.example.threading;

import java.util.concurrent.*;
import java.util.concurrent.locks.ReentrantLock;

// ── Pattern 1: Monitor Contention — The Classic BLOCKED State ───────────────────

class MonitorContention {
    // ❌ BAD: Single lock guarding too many operations — causes contention under load
    private final Object heavyLock = new Object();
    private int counterA = 0;
    private int counterB = 0;
    private long lastAccessTime = 0;

    public void incrementAll() {
        synchronized (heavyLock) {           // Every call blocks all others
            counterA++;                       // These three operations don't compete
            counterB++;                       // for the same data but share one lock
            lastAccessTime = System.nanoTime();
        }
    }

    // ✅ GOOD: Use separate locks for independent state or ReentrantLock with fairness policy
    private final long lockA = 0L;   // Using object identity as lock (simplified — in production use ReentrantLock)
    private final long lockB = 1L;

    public void incrementAllFineGrained() {
        synchronized (counterA) { counterA++; }           // Lock only counterA's data
        synchronized (counterB) { counterB++; }           // Independent lock for counterB
        synchronized (lastAccessTime) {                   // Separate lock for timestamp
            lastAccessTime = System.nanoTime();
        }
    }

    // ✅ GOOD: Use StampedLock for read-heavy workloads (much higher throughput than synchronized)
    private final ReentrantReadWriteLock rwLock = new ReentrantReadWriteLock();

    public int readCounterA() {
        rwLock.readLock().lock();
        try { return counterA; } finally { rwLock.readLock().unlock(); }
    }

    public void writeAll() {
        rwLock.writeLock().lock();
        try {
            counterA++;
            counterB++;
            lastAccessTime = System.nanoTime();
        } finally {
            rwLock.writeLock().unlock();
        }
    }
}

// ── Pattern 2: Thread Pool Starvation — Deadlock via ExecutorService ─────────────

class ThreadPoolStarvation {
    private final ExecutorService executor = Executors.newFixedThreadPool(4);

    // ❌ BAD: Submitting a blocking task from within an already-executing task on the same pool
    public String problematicMethod() throws Exception {
        Future<String> future = executor.submit(() -> {
            return slowDatabaseQuery();  // Takes 5 seconds
        });
        // Blocks the calling thread waiting for result
        // If caller is also in this pool, the task that should complete the wait
        // can never run → deadlock
        return future.get(10, TimeUnit.SECONDS);  // Throws TimeoutException if deadlocked
    }

    // ✅ GOOD: Use a separate bounded executor for blocking operations
    private final ExecutorService ioExecutor = Executors.newFixedThreadPool(
            Runtime.getRuntime().availableProcessors() * 2
    );

    public String fixedMethod() throws Exception {
        return ioExecutor.submit(() -> slowDatabaseQuery()).get(10, TimeUnit.SECONDS);
    }

    // ✅ GOOD (JDK 21+): Use Virtual Threads for blocking I/O — no executor needed
    // Thread.startVirtualThread(() -> processBlockingRequest());
    // Virtual threads park on I/O without consuming platform threads.

    private String slowDatabaseQuery() {
        try { Thread.sleep(5000); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        return "query_result";
    }
}

// ── Pattern 3: Lock Ordering Deadlock — Classic Two-Thread Scenario ──────────────

class LockOrderDeadlock {
    private final Object lockA = new Object();
    private final Object lockB = new Object();
    private int valueA = 0;
    private int valueB = 0;

    // Thread 1 calls transfer(10): acquires lockA, waits for lockB
    // Thread 2 calls reverseTransfer(5): acquires lockB, waits for lockA → DEADLOCK
    public void transfer(int amount) {
        synchronized (lockA) {
            try { Thread.sleep(10); } catch (InterruptedException ignored) {}
            synchronized (lockB) {          // Acquires lockB while holding lockA
                valueA -= amount;
                valueB += amount;
            }
        }
    }

    public void reverseTransfer(int amount) {
        synchronized (lockB) {
            try { Thread.sleep(10); } catch (InterruptedException ignored) {}
            synchronized (lockA) {          // Acquires lockA while holding lockB — DEADLOCK!
                valueB -= amount;
                valueA += amount;
            }
        }
    }

    // ✅ GOOD: Always acquire locks in the same global order (by object identity/hash)
    private static void synchronizedTogether(Object l1, Object l2, Runnable action) {
        // Sort by identity hash to ensure consistent lock ordering
        Object first = System.identityHashCode(l1) < System.identityHashCode(l2) ? l1 : l2;
        Object second = first == l1 ? l2 : l1;

        synchronized (first) {
            synchronized (second) {
                action.run();
            }
        }
    }

    public void transferSafe(int amount) {
        synchronizedTogether(lockA, lockB, () -> {
            valueA -= amount;
            valueB += amount;
        });
    }

    public void reverseTransferSafe(int amount) {
        synchronizedTogether(lockB, lockA, () -> {  // Same order regardless of call site
            valueB -= amount;
            valueA += amount;
        });
    }
}
```

---

## Profiling with async-profiler (Production-Grade Sampling Profiler)

async-profiler is a low-overhead sampling profiler for Java that works in production environments. It profiles CPU time, allocations, locks, and method execution without modifying application code. Install from https://github.com/async-profiler/async-profiler.

```bash
# ── CPU Profiling (most common — identifies hot methods) ────────────────────────

./profiler.sh <pid>                          # Start profiling
sleep 60                                     # Let it run for 60 seconds
./profiler.sh stop <pid>                     # Stop and generate output

# Output formats:
./profiler.sh flamegraph <pid> -o svg        # Save as SVG flame graph (visualize in browser)
./profiler.sh collapsed <pid> -o profile.txt # Collapsed stack format (for speedscope.io)
./profiler.sh flat <pid>                     # Flat list of methods by self time %

# ── Allocation Profiling (identifies objects consuming most heap) ───────────────

./profiler.sh alloc start <pid>              # Start allocation profiling
sleep 120                                    # Run for 2 minutes
./profiler.sh stop <pid> -o svg --alloc      # Generate allocation flame graph

# ── Lock Profiling (identifies contention hotspots) ─────────────────────────────

./profiler.sh lock start <pid>               # Start lock profiling
sleep 60
./profiler.sh stop <pid> -o html --lock 10   # 10ms granularity for lock events

# ── Combined Profile (CPU + Allocation) ─────────────────────────────────────────

./profiler.sh start <pid> -e cpu,alloc       # Profile both CPU and allocations
sleep 180
./profiler.sh stop <pid> -f profile.svg      # Generates combined flame graph

# ── Analyze with Speedscope (browser-based visualizer) ──────────────────────────

# Convert to speedscope format:
./profiler.sh collapsed <pid> -o profile.txt
# Open https://www.speedscope.app/ in browser, load profile.txt
```

---

## JVM Flag Reference by GC Type

| Parameter | G1GC Default | G1GC Tuned | ZGC (JDK 17+) | Shenandoah |
|-----------|-------------|------------|---------------|------------|
| Enable flag | `-XX:+UseG1GC` (default) | `-XX:+UseG1GC` | `-XX:+UseZGC` | `-XX:+UseShenandoahGC` |
| Heap size | `-Xms4g -Xmx4g` | Same as above | `-Xms32g -Xmx32g` | `-Xms32g -Xmx32g` |
| Pause target | `MaxGCPauseMillis=200` | `50-100` | Not applicable (< 1ms) | Not applicable (< 1ms) |
| Region size | Auto (2MB-32MB) | Manual: `4m-16m` | Not applicable | `-XX:ShenandoahRegionSize=1m` |
| Concurrent threads | Auto (`min(4, CPUs)`) | Set explicitly: `8` | `-XX:ConcGCThreads=8` | Auto |
| IO threading (G1 only) | Auto | `-XX:G1IOThreading=true` | N/A | N/A |
| Mixed GC threshold | IHOP=45% | IHOP=35%, `MixedGCCountTarget=8` | N/A | N/A |

**Always set `-Xms` equal to `-Xmx` in production.** Dynamic heap resizing causes performance spikes as the JVM grows or shrinks the heap during runtime, triggering additional GC cycles and CPU overhead.

---

## Constraints

### MUST DO
- Always capture a heap dump (`jcmd <pid> GC.heap_dump`) before restarting in OOM situations — this is your only evidence for post-mortem analysis with MAT
- Use JFR over manual instrumentation for production profiling — zero code changes needed, < 1% overhead, comprehensive JVM-level data including GC, locks, and CPU samples
- Compare baseline metrics before and after any tuning change — document the exact JVM flags changed and their measured impact (GC pause times, throughput, heap utilization %)
- Monitor GC pause times with `-Xlog:gc*:file=gc.log:time,uptime,level,tags` in production — this log is essential for post-incident analysis and trend detection
- Set explicit heap size limits (`-Xms`, `-Xmx`) to the same value — avoid dynamic resizing overhead and unpredictable GC behavior
- Use `jcmd <pid> VM.flags | grep -iE "gc|heap"` to confirm which GC collector is actually active at runtime (Docker/container environments sometimes override defaults)
- Profile CPU hot paths with async-profiler flame graphs before tuning JVM flags — application code issues account for ~80% of performance problems, not JVM settings
- Use `-XX:+UseContainerSupport` when running in containers (default JDK 17+) and set `-Xmx` to the container's memory limit minus overhead (~300MB)

### MUST NOT DO
- Use Serial GC or Parallel GC in production unless specifically optimizing for embedded/batch workloads — they cause full stop-the-world pauses unsuitable for interactive systems
- Increase heap size as a first response to memory issues — fix memory leaks first using MAT leak suspect reports; adding RAM only delays the inevitable OOM and masks the real problem
- Disable GC logging in production — it's essential for post-incident analysis, capacity planning, and detecting GC thrashing before it causes SLA violations
- Use `-XX:+UseConcMarkSweeper` (CMS) — it has been deprecated since JDK 9 and removed in JDK 14; use G1GC or ZGC instead
- Pin threads on monitors during long operations — with ZGC's concurrent read barriers, thread pinning prevents the GC from updating references, causing stale reads
- Set `-XX:MaxGCPauseMillis` to zero or extremely low values (e.g., 1ms) with G1GC — this causes excessive collection frequency and increases total GC CPU time without meaningful latency improvement
- Stack multiple JVM flag changes simultaneously — change one parameter at a time and benchmark each change in isolation to attribute impact correctly

---

## Output Template

When analyzing or resolving a JVM performance issue, produce:

1. **Incident Summary** — OOM error type, application context (JDK version, GC type, heap size, container limits), and timeline of symptoms
2. **Diagnostic Evidence** — Relevant excerpts from heap dump (MAT Leak Suspects Report), thread dumps (blocked/waiting chain), GC logs (pause times, collection frequency), and JFR/async-profiler output
3. **Root Cause Classification** — Memory leak (type: unbounded cache / static collection / ThreadLocal / listener registration / string interning), GC misconfiguration, thread contention, or CPU hotspot
4. **Recommended JVM Flags** — Specific `-XX:` flags with before/after values for each tuning target, including diagnostic flags to enable
5. **Code-Level Fixes** — Specific code patterns to modify (bounded caches, proper ThreadLocal cleanup, fine-grained locking) with concrete examples
6. **Validation Plan** — How to verify the fix: benchmark methodology, expected metric improvements, monitoring thresholds to confirm resolution

---

## Live References

| Resource | URL |
|----------|-----|
| JDK 21 JVM Documentation | https://docs.oracle.com/en/java/javase/21 |
| OpenJDK Garbage Collector Guide (G1GC) | https://openjdk.org/groups/vm/garbage-collector.html |
| OpenJDK ZGC Documentation | https://openjdk.org/projects/jdk/21/features/zgc/ |
| OpenJDK Shenandoah GC | https://wiki.openjdk.org/display/shenandoah/Main |
| Java Flight Recorder (JFR) Guide | https://docs.oracle.com/en/java/javase/21/profile/jfr.html |
| JDK Diagnostic Commands (jcmd, jstat, jstack) | https://docs.oracle.com/en/java/javase/21/tools/jcmd.html |
| Eclipse Memory Analyzer Tool (MAT) | https://www.eclipse.org/mat/ |
| async-profiler GitHub | https://github.com/async-profiler/async-profiler |
| HotSpot VM Diagnostic Flags Reference | https://openjdk.org/groups/vm/docs/current.html#diagnostic-options |
| JFR Continuous Recording Mode | https://docs.oracle.com/en/java/javase/21/profile/jfr-continuous-recording-mode.html |

---

## Related Skills

| Skill | Purpose |
|---|---|
| `framework-performance-tuning` | Framework-level optimization (connection pooling, caching, async); this skill handles JVM-native tuning beneath the framework layer |
| `async-programming` | Virtual threads and structured concurrency (JDK 21+); use together when thread contention is caused by blocking I/O on platform threads |
| `design-patterns-and-principles` | Memory-efficient design patterns (bounded caches, flyweight, object pooling) that prevent leaks at the architectural level before they reach production |

---

> 📖 skill(local cache): framework-performance-tuning, async-programming, design-patterns-and-principles