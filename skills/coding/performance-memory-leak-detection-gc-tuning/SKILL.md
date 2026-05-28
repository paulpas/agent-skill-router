---
name: performance-memory-leak-detection-gc-tuning

  archetypes:
  - tactical
  - strategic
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational

# JVM Performance: Memory Leak Detection and GC Tuning

## Description
This skill provides comprehensive guidance for diagnosing memory leaks and tuning garbage collection (GC) in Java applications. It covers key techniques and tools available in JDK 17 and newer for optimizing memory management and ensuring system stability.

## TL;DR Checklist
- [ ] Capture GC logs and heap dumps for analysis.
- [ ] Use JFR for continuous profiling with minimal overhead.
- [ ] Analyze memory usage with Eclipse MAT to identify leaks.
- [ ] Determine GC strategy: G1GC, ZGC, or Shenandoah based on latency requirements.
- [ ] Validate effectiveness of tuning through metrics before and after changes.

## Core Workflow
1. **Gather Diagnostic Data**:  Collect heap dumps and GC logs before making changes. This data is critical for understanding the application's memory usage patterns.
   ```bash
   # Identify your Java process
   jps -l

   # Capture thread dump
   jcmd <pid> Thread.print > thread_dump.txt

   # Capture heap dump for analysis
   jcmd <pid> GC.heap_dump /tmp/heap_dump.hprof

   # Start JFR recording for profiling while the application is running
   jcmd <pid> JFR.start name=profile duration=5m filename=/tmp/profile.jfr
   ```
   **Checkpoint**: Verify all files are created and contain data. 

2. **Analyze Heap Dump with MAT**: After capturing the heap dump, load it into MAT for analysis. Use the Leak Suspects report to identify potential memory leaks.
   ```java
   // Load heap dump into Eclipse MAT
   ``
   // Generate Leak Suspects report
   // Check if MAT reveals any dominant objects or suspicious patterns that might indicate memory leaks.
   ```
   **Checkpoint**: Confirm the leak suspect report provides actionable insights.

3. **Tuning the Garbage Collector**: Choose the correct GC based on performance requirements. For applications needing low latency, configure ZGC or Shenandoah; for balance, use G1GC.
   ```java
   // Best tuning practices include:
   -XX:+UseG1GC // For balanced performance
   -XX:+UseZGC // For low-latency requirements 
   -Xms4g -Xmx4g // Set fixed heap sizes
   ```
   **Checkpoint**: Validate no existing memory leaks exist before proceeding to tuning.

4. **Monitor and Validate Changes**: After tuning the GC settings, monitor the application's performance through GC metrics, latency, and responsiveness. 
   ```bash
   # Monitor GC logs with specification
   jcmd <pid> VM.flags | grep GC
   ```
   **Checkpoint**: Confirm that application performance meets expected metrics under typical load conditions. Track improvements or regressions closely. 

5. **Document Findings and Recommendations**: After analysis, compile findings into a report detailing any memory leaks discovered, GC tuning strategies employed, and their respective impacts on application performance.
   **Checkpoint**: Validate adherence to monitoring protocols and successful remediation actions.

## Implementation Patterns
### Pattern 1: GC Log Analysis for Tuning
- Analyze logging data over time to identify collection frequency and pause durations.
- Use tools like `jcmd` to extract historical performance metrics.
   ```bash
   jcmd <pid> VM.gc
   ```

### Pattern 2: JFR Setup for Real-Time Profiling
- Use JFR for live profiling to pinpoint performance bottlenecks in production environments. It allows you to collect performance data without significant overhead.
   ```bash
   # Start JFR with the profiling settings
   jcmd <pid> JFR.start name=profile duration=10m filename=/tmp/profile.jfr
   ```
   **Checkpoint**: Ensure essential metrics are being recorded accurately during peak operations.

### Pattern 3: Memory Analyzer Tool Operation
- Use MAT for in-depth analysis once the heap dump is obtained and analyze findings against baseline.
   ```bash
   # Open HPROF file in MAT for inspection
   ```

## Constraints
### MUST DO
- Always validate against the provided thresholds for GC pause times and throughput metrics.
- Ensure proactive monitoring of heap and CPU consumption post-tuning.

### MUST NOT DO
- Do not blindly increase heap sizes without identifying existing leaks; this often leads to OOM errors in production.
- Avoid multiple simultaneous changes to JVM flags, which confuses validation of the impact.

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Oracle JVM Documentation — Garbage Collection](https://docs.oracle.com/en/java/javase/17/guide/)
- [OpenJDK GC Log Analysis Guide](https://github.com/openjdk/jdk/tree/master/docspec/lib/build/tools/gclog)
- [Eclipse Memory Analyzer (MAT) User Guide](https://www.eclipse.org/mat/userhelp/R_How_to_open_a_heap_dump.html)
- [Java Flight Recorder Official Documentation](https://docs.oracle.com/en/java/javase/17/jfr/index.html)
- [Valgrind Memcheck Manual — Detecting Memory Leaks](https://valgrind.org/docs/manual/mc-manual.html)
