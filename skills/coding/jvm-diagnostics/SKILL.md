---
name: jvm-diagnostics
description: Diagnoses JVM production incidents including OutOfMemoryError root causes, thread deadlock detection, heap leak analysis via MAT, and crash log triage for Java 17+ applications.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: jvm diagnostics, thread dump, heap dump, oom error, deadlock detection, jstack analysis, MAT leak suspect, GC thrashing
  archetypes:
    - diagnostic
    - tactical
  anti_triggers:
    - brainstorming
    - vague ideation
    - code golf
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: review
  scope: review
  output-format: analysis
  content-types:
    - guidance
    - examples
    - do-dont
  related-skills: jvm-performance-tuning, framework-performance-tuning, async-programming
---

# JVM Diagnostician

Diagnose and triage JVM production incidents using thread dumps, heap dumps, GC logs, and crash analysis. This skill covers reactive troubleshooting — when a production system is failing, degraded, or crashed. For proactive performance tuning and GC configuration, use `jvm-performance-tuning` instead. All diagnosis follows measurement-first principles: collect evidence, classify the root cause category, then recommend targeted fixes.

## TL;DR Checklist

- [ ] Capture thread dump (`jcmd <pid> Thread.print`) before any restart — it is your only live state record
- [ ] Capture heap dump (`jcmd <pid> GC.heap_dump /tmp/dump.hprof`) for OutOfMemoryError incidents before restarting
- [ ] Check `hs_err_pid*.log` crash files for native memory issues, stack overflow, or JVM internal errors
- [ ] Analyze thread dumps for BLOCKED/WAITING patterns, deadlocks, and thread state distribution
- [ ] Use Eclipse MAT Leak Suspects Report as the primary diagnostic artifact for heap dump analysis
- [ ] Classify root cause into one category: OOM (memory leak / capacity), deadlock/thread contention, GC thrashing, or native crash — never guess

---

## When to Use

Use this skill when:

- Production application throws `OutOfMemoryError` and requires heap dump analysis to identify the memory leak source
- Application hangs or becomes unresponsive — thread dump analysis needed to detect deadlocks or lock contention
- GC logs show "GC thrashing" — frequent collections with no heap reclaimed, indicating either a leak or misconfigured GC
- JVM crashes with a `hs_err_pid*.log` file requiring crash analysis
- High CPU utilization without throughput gains suggests spinning threads or runaway JIT compilation
- Application memory usage grows monotonically over hours/days, indicating a suspected memory leak in application code
- Investigating thread pool exhaustion or virtual thread misbehavior (JDK 21+ Project Loom)

---

## When NOT to Use

Avoid this skill for:

- **Proactive JVM tuning before deployment** — use `jvm-performance-tuning` for GC selection, memory configuration, and allocation optimization
- **Application logic bugs** (null pointer exceptions, incorrect business results, data corruption in the database) — these are code bugs, not JVM issues; use a debugger or structured logging instead
- **I/O or database bottlenecks** — if thread dumps show threads WAITING on network/disk I/O, optimize those layers first (query indexes, connection pools, CDN caching) before blaming the JVM
- **Development-time profiling** — VisualVM or IntelliJ profiler are more appropriate for development; production diagnostics tools (`jcmd`, JFR, MAT) are for live incident analysis

---

## Core Workflow

1. **Collect Diagnostic Evidence** — Before making any changes or restarting the application, capture all available diagnostic data:
    ```bash
    # Find the Java process PID
    jps -l

    # Thread dump (all threads with full stack traces)
    jcmd <pid> Thread.print > threads_$(date +%s).txt

    # Heap dump (binary HPROF format for MAT analysis — critical for OOM)
    jcmd <pid> GC.heap_dump /tmp/heapdump_$(date +%s).hprof

    # Current JVM flags (to confirm active GC and memory settings)
    jcmd <pid> VM.flags > vmflags_$(date +%s).txt

    # Memory and GC statistics snapshot
    jstat -gcutil <pid> 1000 5 > gc_stats_$(date +%s).csv

    # Check for crash logs (native crashes produce hs_err_pid*.log in the working directory)
    ls -la /path/to/app/working/dir/hs_err_pid*.log
    ```
    **Checkpoint:** Verify all diagnostic files were created and have non-zero size. If `jcmd` fails, check process permissions — it requires running as the same user as the Java process or as root.

2. **Classify Incident Category** — Analyze collected data to determine the primary incident category. Only one category should be the primary focus; secondary categories often stem from the primary:
    - **OutOfMemoryError**: Heap dump analysis shows specific classes dominating memory (use MAT Leak Suspects Report)
    - **Deadlock/Thread Contention**: Thread dump shows `BLOCKED` threads waiting on monitors, or "Found one Java-level deadlock" in jcmd output
    - **GC Thrashing**: GC logs show collections running every few seconds with < 5% heap reclaimed; total GC time exceeds 90% of CPU
    - **Native Crash**: `hs_err_pid*.log` exists — analyze the Native frames and `# Problematic frame` lines for root cause

    **Checkpoint:** The incident category determines which deep-dive analysis to perform. Misclassifying a memory leak as GC thrashing (by increasing heap instead of fixing the leak) delays the real fix and wastes recovery time.

3. **Deep-Dive Analysis** — Perform targeted analysis based on the classified incident:

    **For OutOfMemoryError:**
    ```bash
    # Load HPROF file into Eclipse Memory Analyzer (MAT):
    mat /tmp/heapdump_*.hprof
    
    # Generate Leak Suspects Report (automated analysis):
    # In MAT GUI: Report → Leak Suspects Report
    
    # Key MAT metrics to examine:
    # - Dominator Tree: which objects hold the most retained heap?
    # - Thread Overview: which threads retain which objects?
    # - Top Consumers: which classes allocate the most memory?
    ```

    **For Deadlocks:**
    ```bash
    # jcmd automatically detects Java-level deadlocks in thread dump output:
    jcmd <pid> Thread.print | grep -A 15 "deadlock\|BLOCKED"

    # Look for circular lock dependency chains:
    # Thread A holds Lock X, waits for Lock Y
    # Thread B holds Lock Y, waits for Lock X → DEADLOCK
    ```

    **For GC Thrashing:**
    ```bash
    # Analyze GC log for patterns:
    grep -E "GC( pause|Heap resize)" /var/log/app/gc.log | tail -50
    
    # Check if collections reclaim any heap:
    # If collection time > 90% of wall-clock time and heap usage doesn't decrease → leak or capacity issue

    # Use jstat to see GC history in real-time:
    jstat -gcutil <pid> 1000 20
    ```

4. **Identify Root Cause** — Based on deep-dive analysis, determine the specific root cause within the incident category. Memory issues fall into these sub-types (ranked by frequency in production incidents):
    - **Unbounded Cache**: Application stores objects in a `Map` or `Set` without eviction limits (most common OOM cause)
    - **ThreadLocal Leak**: Thread-local data not cleaned up in thread pool workers; next task inherits stale memory
    - **Static Collection Growth**: Static `List`, `Map`, or `Set` accumulates objects forever with no bounded size or periodic flush
    - **String Interning Leak**: Unbounded calls to `String.intern()` retain every unique string in the StringTable (permanent heap retention)
    - **Listener Registration Without Unregistration**: Event handler lists grow without corresponding deregistration

    Thread issues fall into these sub-types:
    - **Monitor Contention**: Single lock guarding too many independent operations, causing thread blocking under load
    - **Thread Pool Starvation**: Blocking I/O task submitted to a bounded executor, exhausting all threads and preventing other tasks from running
    - **Lock Ordering Violation**: Different code paths acquire locks in different orders, causing deadlocks

5. **Recommend Targeted Fixes** — Provide specific remediation steps based on the root cause classification:

    ```java
    // ── Root Cause: Unbounded Cache → Fix: Bounded Cache with Eviction ─────────────

    // ❌ BAD: HashMap grows without limit — OOM when memory exhausted
    private static final Map<String, Object> cache = new HashMap<>();
    public void put(String key, Object value) {
        cache.put(key, value);  // Never removed
    }

    // ✅ GOOD: Bounded LinkedHashMap with LRU eviction
    private static final Map<String, Object> boundedCache = new LinkedHashMap<>(16, 0.75f, true) {
        @Override
        protected boolean removeEldestEntry(Map.Entry<String, Object> eldest) {
            return size() > 10_000;  // Evict oldest when cache exceeds 10k entries
        }
    };

    // ── Root Cause: ThreadLocal Leak → Fix: Always Call remove() in finally Block ───

    // ❌ BAD: ThreadLocal in thread pool holds references indefinitely
    private static final ThreadLocal<UserContext> context = ThreadLocal.withInitial(UserContext::new);
    public void handleRequest(Request req) {
        UserContext ctx = context.get();
        ctx.parse(req);
        process(ctx);
        // FORGOT: context.remove() — next pool thread reuses stale data AND memory
    }

    // ✅ GOOD: Always clear ThreadLocal in finally block
    public void handleRequestSafe(Request req) {
        UserContext ctx = safeContext.get();
        try {
            ctx.parse(req);
            process(ctx);
        } finally {
            safeContext.remove();  // Prevents leak to next task in pool
        }
    }

    // ── Root Cause: Static Collection Growth → Fix: Bounded Buffer with Periodic Flush ──

    // ❌ BAD: Static list accumulates all processed items forever
    private static final List<ProcessedRecord> records = new ArrayList<>();
    public void process(String data) {
        records.add(new ProcessedRecord(data, System.currentTimeMillis()));  // OOM eventually
    }

    // ✅ GOOD: Circular buffer with bounded size and periodic flush to storage
    private static final Deque<ProcessedRecord> processedBuffer = new ArrayDeque<>(10_000);
    public void processBounded(String data) {
        if (processedBuffer.size() >= 10_000) {
            flushToStorage(processedBuffer);
            processedBuffer.clear();
        }
        processedBuffer.addLast(new ProcessedRecord(data, System.currentTimeMillis()));
    }

    // ── Root Cause: Lock Ordering Deadlock → Fix: Consistent Global Lock Order ───────

    private final Object lockA = new Object();
    private final Object lockB = new Object();

    // ❌ BAD: Thread 1 acquires lockA→lockB, Thread 2 acquires lockB→lockA = DEADLOCK
    public void transfer(int amount) {
        synchronized (lockA) {
            synchronized (lockB) { /* ... */ }
        }
    }
    public void reverseTransfer(int amount) {
        synchronized (lockB) {   // Different order from above → deadlock potential
            synchronized (lockA) { /* ... */ }
        }
    }

    // ✅ GOOD: Always acquire locks by consistent global ordering (identity hash)
    private static void synchronizedTogether(Object l1, Object l2, Runnable action) {
        Object first = System.identityHashCode(l1) < System.identityHashCode(l2) ? l1 : l2;
        Object second = first == l1 ? l2 : l1;
        synchronized (first) {
            synchronized (second) {
                action.run();
            }
        }
    }

    // ── Root Cause: Thread Pool Starvation → Fix: Separate Executor for Blocking I/O ──

    private final ExecutorService ioExecutor = Executors.newFixedThreadPool(
        Runtime.getRuntime().availableProcessors() * 2
    );

    // ✅ GOOD: Blocking I/O runs on dedicated executor, not shared application pool
    public String handleRequest() throws Exception {
        return ioExecutor.submit(() -> slowDatabaseQuery()).get(10, TimeUnit.SECONDS);
    }
    ```

6. **Validate Remediation** — After applying fixes, validate the system under production-like load:
    ```bash
    # Verify thread dump no longer shows BLOCKED threads accumulating
    jcmd <pid> Thread.print | grep -c "BLOCKED"

    # Verify heap usage remains stable (no monotonic growth) over 30+ minute sustained load
    jstat -gcutil <pid> 10000 180 > post_fix_gc_stats.csv

    # For OOM: verify heap dump shows dominant objects have been eliminated
    # Use MAT to compare pre-fix and post-fix heap dumps if available

    # For GC thrashing: verify GC log shows healthy collection patterns
    grep -E "GC pause" /var/log/app/gc.log | tail -20
    ```
    **Checkpoint:** Monitor the corrected metric for at least 30 minutes. Memory issues require longer observation (1-4 hours) to confirm leaks are actually fixed, as gradual growth may not be immediately apparent.

---

## Diagnostic Reference: Thread Dump Analysis Patterns

Thread dumps are the single most valuable diagnostic artifact for JVM incidents. Learn to read them quickly during production outages.

### Thread State Distribution Quick Check

```bash
# Count threads in each state from a thread dump file
grep -c "RUNNABLE" threads.txt      # Executing code
grep -c "BLOCKED" threads.txt       # Waiting for monitor lock
grep -c "WAITING" threads.txt       # Waiting indefinitely (LockSupport.park)
grep -c "TIMED_WAITING" threads.txt # Waiting with timeout (Thread.sleep, wait())
```

### Deadlock Detection in Thread Dumps

JVM thread dumps include automatic deadlock detection output. Look for this section:

```
Found one Java-level deadlock:
=============================
  "pool-1-thread-4":
    waiting to lock monitor 0x00007f8b1c003e68 (object 0x000000076ab2e4d8, a java.lang.Object),
    which is held by "pool-1-thread-2"
  "pool-1-thread-2":
    waiting to lock monitor 0x00007f8b1c003f38 (object 0x000000076ab2e5a0, a java.lang.Object),
    which is held by "pool-1-thread-4"

Java stack information for the threads listed above:
===================================================
  "pool-1-thread-4":
    at com.example.TransferService.transfer(TransferService.java:42)
        - waiting to lock <0x000000076ab2e4d8> (a java.lang.Object)
        - locked <0x000000076ab2e5a0> (a java.lang.Object)
    at com.example.TransferService.reverseTransfer(TransferService.java:58)
  "pool-1-thread-2":
    at com.example.TransferService.reverseTransfer(TransferService.java:58)
        - waiting to lock <0x000000076ab2e5a0> (a java.lang.Object)
        - locked <0x000000076ab2e4d8> (a java.lang.Object)
    at com.example.TransferService.transfer(TransferService.java:42)
```

### Thread Pool Exhaustion Pattern

```
"pool-1-thread-3" #15 prio=5 os_prio=0 cpu=123.4ms elapsed=3600000ms tid=0x00007f8b1c0a1000 nid=0x1234 waiting on condition [0x00007f8b14ffd000]
   java.lang.Thread.State: WAITING (parking)
    at jdk.internal.misc.Unsafe.park(java.base@21/Native Method)
        - parking to wait for  <0x000000076ab5f0a0> (a java.util.concurrent.FutureTask$InterruptibleCarry)
    at java.util.concurrent.locks.LockSupport.park(java.base@21/LockSupport.java:221)
    at java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionNode.block(java.base@21/AbstractQueuedSynchronizer.java:473)
    at java.util.concurrent.FutureTask.get(java.base@21/FutureTask.java:205)
    at com.example.Handler.processRequest(Handler.java:87)

   Locked ownable synchronizers:
    - None
```

This thread is stuck waiting for a `Future` result that may never arrive because all threads in the pool are also blocked. The key indicator: **all pool threads show WAITING state, and some are waiting on each other's futures**.

---

## Diagnostic Reference: Heap Dump Analysis with Eclipse MAT

Eclipse Memory Analyzer (MAT) is the standard tool for analyzing Java heap dumps. Load the HPROF file and examine these reports in priority order:

### Leak Suspects Report (First Stop)

This is the primary diagnostic output from MAT. It automatically identifies objects that are holding unexpectedly large amounts of retained heap memory. Key fields to examine:

- **Leak Path**: The reference chain showing how the leaked object is reachable from a GC root (thread, class loader, static field)
- **Shallow Size**: Memory consumed by the object itself
- **Retained Size**: Total memory that would be reclaimed if this object were garbage collected
- **Retained Heap**: Percentage of total heap retained by the leak suspect

### Dominator Tree Analysis

The Dominator Tree shows objects in descending order of retained heap. Top entries reveal which classes consume the most memory:

```
Dominator Tree (sorted by retained size):
com.example.CacheEntry[]                    1,245,678,901   45.2%    [root]
java.lang.String                            890,123,456     32.3%      └─ cached by CacheEntry[].value
byte[]                                      234,567,890      8.5%      ├─ internalized in String
com.example.UserContext                     123,456,789      4.5%      └─ retained by Thread-42
```

### Thread Overviews

Identify which threads retain the most heap memory. Useful for detecting ThreadLocal leaks:

```
Thread Overviews:
"pool-1-thread-42"          123,456,789 bytes    4.5%   (ThreadLocal/UserContext)
"main"                        12,345,678 bytes    0.4%   
"GC-task-threads"              1,234,567 bytes    0.04%  
```

---

## Diagnostic Reference: hs_err_pid*.log Analysis

When the JVM crashes (native error, stack overflow, or internal error), it writes a `hs_err_pid<pid>.log` file in the working directory. Analyze this file in order:

### Crash Header (First 20 lines)

```
# A fatal error has been detected by the Java Runtime Environment:
#
#  SIGSEGV (0xb) at pc=0x00007f8b1c0a1000, pid=12345, tid=67890
#
# JRE version: OpenJDK 21.0.1+12 (21.0.1+12)
# Java VM: OpenJDK 64-Bit Server VM (21.0.1+12, mixed mode, sharing)
# Problematic frame:
# v  ~BufferBlob::Interpreter frames
```

Key information:
- **Signal code**: `SIGSEGV` = segfault (native memory access violation), `SIGBUS` = bus error, `SIGABRT` = abort
- **Problematic frame**: The native frame where the crash occurred. This points to JVM internals or a JNI call.

### Native Memory Sections

Look for these sections in order of priority:
1. **# Register to memory mapping** — Shows which registers map to which memory regions (helps identify if a register holds an invalid pointer)
2. **# C [libnative.so+0x...]** — Native library frames leading to the crash
3. **# Java threads** — State of all Java threads at crash time
4. **Virtual memory info** — Heap and metaspace sizes at crash time

### Stack Overflow Pattern

```
# Stack: [0x00007f8b14ffd000,0x00007f8b150fe000],  sp=0x00007f8b150fc9e0,  free space=1016k
Native frames: (J=compiled java code, j=interpreted, Vv=VM code, C=native code)
C  [libc.so.6+0x... ]  __restore_rt
C  [libjvm.so+0x... ]  JVM_RegisterNatives+0x...

Java frames: (J=compiled java code, j=interpreted, Vv=VM code)
J 8945 com.example.RecursiveParser.parse(RecursiveParser.java:42) jvmti
J 8944 com.example.RecursiveParser.parseChildren(RecursiveParser.java:67) jvmti
```

Stack overflow manifests as a very small free stack space and deeply nested Java frames. Common causes: infinite recursion, excessive logging recursion, or `toString()` methods that trigger recursive calls on circular object graphs.

---

## Diagnostic Reference: GC Log Analysis Patterns

Modern JVMs (Java 9+) use unified logging for GC events. Parse GC logs to identify problematic patterns.

### Identifying GC Thrashing

```bash
# Check if GC is running more than 90% of the time with minimal heap reclaimed:
grep "GC pause" /var/log/app/gc.log | awk '{print $1, $3}' | tail -100

# If you see collections every 1-5 seconds with "old gen" or "mixed" collections → thrashing
```

Example GC log analysis showing thrashing:

```
2024-03-15T10:23:01.123+0000: 123.456: [GC pause (G1 Evacuation Pause) (young) (metric) ... heap usage: 78% → 77%]
2024-03-15T10:23:01.456+0000: 123.789: [GC pause (G1 Evacuation Pause) (young) (metric) ... heap usage: 82% → 81%]
2024-03-15T10:23:01.789+0000: 124.122: [GC pause (G1 Evacuation Pause) (young) (metric) ... heap usage: 86% → 85%]
```

Note the **heap usage is not decreasing** — collections are running but memory is not being reclaimed. This confirms a memory leak rather than temporary GC pressure.

### Identifying Full GC Cycles

```bash
# Search for full GC (FGC) which causes longest pause times:
grep "Full GC" /var/log/app/gc.log | tail -20

# Full GCs should be extremely rare in production. Frequent FGC indicates:
# 1. Metaspace exhaustion (too many loaded classes)
# 2. Old generation filling faster than concurrent marking can keep up
# 3. Insufficient heap for the working set size
```

---

## Constraints

### MUST DO
- Capture thread dump and heap dump BEFORE restarting a failed application — they are the only evidence of the live system state at failure time; once restarted, all diagnostic data is lost forever
- Use Eclipse MAT Leak Suspects Report as the primary artifact for OOM root cause analysis — it automatically identifies objects holding unexpectedly large amounts of retained heap memory along with their allocation paths
- Classify every incident into one primary category (OOM, deadlock/contention, GC thrashing, native crash) before recommending fixes — misclassification wastes recovery time and can make the situation worse
- Verify `OutOfMemoryError` type precisely: `Java heap space` indicates heap capacity issue or memory leak; `Metaspace` indicates too many loaded classes or classloader leaks; `GC overhead limit exceeded` indicates GC is spending > 98% of time collecting < 2% of heap reclaimed
- Check `hs_err_pid*.log` crash files for native memory issues (stack overflow, OOM in native memory, JNI errors) — these indicate JVM-level or OS-level problems that require different remediation than Java heap issues
- Monitor corrected metrics for at least 30 minutes under sustained load after applying fixes; memory leak fixes require 1-4 hours of observation to confirm gradual growth has stopped

### MUST NOT DO
- Restart a failed production application before capturing thread dumps and heap dumps — this destroys the only diagnostic evidence available for root cause analysis
- Increase heap size as the first response to any memory-related incident — always determine whether the issue is a genuine leak (fix the code) or capacity insufficiency (increase heap); increasing heap without fixing a leak only delays the inevitable OOM and masks the root cause
- Use `-XX:+UseConcMarkSweeper` (CMS) in new deployments — it has been deprecated since JDK 9 and removed in JDK 14; use G1GC or ZGC instead
- Ignore `TIMED_WAITING` threads in thread dump analysis — while some are normal (sleep, lock waits), a high proportion of TIMED_WAITING threads indicates application-level spin-waiting patterns that waste CPU without making progress
- Recommend JVM flag changes as the primary fix for memory leaks — code-level fixes (bounded caches, ThreadLocal cleanup, proper resource closing) address root causes; JVM flags are secondary tuning parameters

---

## Output Template

When diagnosing a JVM incident, produce:

1. **Incident Summary** — Error type (`OutOfMemoryError`, crash, hang), application context (JDK version, GC type, heap size, container limits), and timeline of symptoms observed
2. **Diagnostic Evidence** — Relevant excerpts from thread dumps (blocked/waiting chains, deadlock indicators), heap dump analysis results (MAT Leak Suspects Report top entries), GC logs (pause times, collection frequency, reclaimed percentages), and/or crash log headers
3. **Root Cause Classification** — Primary category: memory leak (type: unbounded cache / ThreadLocal / static collection / string interning / listener registration), thread contention/deadlock, GC thrashing, or native crash; include confidence level
4. **Specific Code Fixes** — Concrete code changes to address the root cause (bounded caches, ThreadLocal cleanup patterns, fine-grained locking with consistent ordering) with before/after examples
5. **Validation Plan** — Exact commands and metrics to verify the fix resolves the incident, with minimum monitoring duration

---

## Live References

| Resource | URL |
|----------|-----|
| JDK 21 JVM Diagnostic Tools (jcmd, jstat, jstack) | https://docs.oracle.com/en/java/javase/21/tools/jcmd.html |
| OpenJDK GC Log Analysis Guide | https://openjdk.org/groups/vm/garbage-collector.html |
| Eclipse Memory Analyzer Tool (MAT) User Guide | https://www.eclipse.org/mat/userguide.php |
| JVM Crash Log (hs_err_pid*.log) Reference | https://docs.oracle.com/en/java/javase/21/troubleshoot/reporting-jvm-crashes-and-errors-using-core-dumps008.html |
| Java Thread Dump Analysis Guide | https://docs.oracle.com/en/java/javase/21/management/thread-and-processor-monitoring.html |
| OpenJDK JVM Crash Analysis (hs_err_pid log) | https://wiki.openjdk.org/display/HotSpot/How+to+analyze+a+core+dump |
| JDK Diagnostic Command Reference | https://docs.oracle.com/en/java/javase/21/tools/jcmd.html |

---

## Related Skills

| Skill | Purpose |
|---|---|
| `jvm-performance-tuning` | Proactive JVM optimization (GC selection, memory configuration, JIT tuning) — use for pre-deployment tuning; this skill handles reactive troubleshooting when production incidents occur |
| `framework-performance-tuning` | Framework-level debugging (connection pool exhaustion, framework-specific thread pools, caching issues) — many "JVM issues" actually originate from misconfigured frameworks like Spring or Hibernate |
| `async-programming` | Virtual threads and structured concurrency diagnostics (JDK 21+) — use when the incident involves virtual thread behavior, uncaught exceptions in virtual threads, or ThreadFactory misconfiguration |

---

> 📖 skill(local cache): jvm-performance-tuning, framework-performance-tuning, async-programming