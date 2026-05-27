---
name: modern-java
description: Implements modern Java language features (JDK 21–26) including virtual threads, pattern matching switch expressions, records, sequenced collections, and scoped values for production application development.
license: MIT
compatibility: opencode
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
metadata:
  version: "1.0.0"
  domain: java
  triggers: virtual threads, pattern matching switch, record patterns, sequenced collections, scoped values, foreign function memory api, how do i write modern java
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: java-virtual-threads, go-concurrency-patterns, coding-code-review
---

# Modern Java Development (JDK 21–26)

Implements idiomatic modern Java code using language features from JDK 21 through JDK 26 — virtual threads for concurrency, pattern matching in switch and instanceof, records with compact constructors, sequenced collections, scoped values for immutable data sharing, and the Foreign Function & Memory API for safe native interop. The model produces typed, production-ready code following Java best practices for the current LTS (JDK 21) and stable non-LTS releases.

## TL;DR Checklist

- [ ] Use `Executors.newVirtualThreadPerTaskExecutor()` for I/O-bound workloads — never use platform thread pools for this
- [ ] Apply pattern matching with `instanceof Type variable` instead of raw casts after instanceof checks
- [ ] Use switch expressions with pattern matching (`case Type var ->`) for type-based dispatch on sealed hierarchies
- [ ] Declare records for immutable data carriers; include compact constructors when validation logic is needed
- [ ] Prefer `SequencedCollection` / `SequencedMap` interfaces over plain `List` or `Map` when first/last operations are needed
- [ ] Use `ScopedValue` (JDK 25+) instead of `ThreadLocal` for immutable context passed across virtual threads
- [ ] Never share mutable state between virtual threads without explicit synchronization

---

## When to Use

Use this skill when:

- Writing new Java code on JDK 21+ and wanting to use modern language features
- Migrating legacy thread-per-request server code to virtual threads for throughput improvement
- Refactoring instanceof chains with manual casts into pattern matching expressions
- Replacing verbose POJOs with immutable `record` types for DTOs, events, or configuration
- Working on high-concurrency applications where traditional thread pools exhaust resources
- Building native interop code and considering the Foreign Function & Memory API over JNI

---

## When NOT to Use

Avoid this skill for:

- Targeting JDK 17 or earlier — features like virtual threads, records (pre-JDK 16 preview), and pattern matching switch require JDK 21+
- Framework-specific development concerns (Spring Boot configuration, Quarkus build config) — those are framework skills
- CPU-bound computational workloads — use `ForkJoinPool` or bounded platform thread pools instead of virtual threads
- Projects requiring strict backward compatibility with JDK 8 or 11 codebases

---

## Core Workflow

### Step 1: Assess Workload Type — I/O-Bound vs CPU-Bound

Determine whether the task is I/O-bound (waiting on external systems) or CPU-bound (computation). This decision dictates concurrency strategy.

- **I/O-bound**: Database queries, HTTP client calls, file reads/writes, message queue consumption → use virtual threads
- **CPU-bound**: Sorting large collections, cryptographic hashing, image processing, JSON deserialization of millions of records → use `ForkJoinPool` or bounded platform-thread `FixedThreadPool`

**Checkpoint:** If the code spends significant time blocked on I/O (network latency, disk reads, database round-trips), virtual threads are appropriate. CPU-bound tasks will not benefit from virtual threads and may suffer overhead.

### Step 2: Choose Immutable Data Structures

Replace mutable POJOs with records for data carriers, DTOs, configuration objects, and domain events. Use compact constructors only when validation logic is required. Apply `SequencedCollection` / `SequencedMap` interfaces when first/last operations are needed.

**Checkpoint:** Verify that all components declared in the record are effectively final — no mutation after construction. If mutation is needed, use a regular class.

### Step 3: Apply Pattern Matching for Dispatch

Replace instanceof chains with manual casts using pattern matching for `instanceof` in `if` guards, and switch expressions with pattern matching on sealed hierarchies. This eliminates runtime `ClassCastException`, removes boilerplate casts, and enables compiler-enforced exhaustiveness checking.

**Checkpoint:** If the switch covers all members of a sealed interface, omit the `default` case — the compiler will flag missing cases at compile time.

### Step 4: Structure Concurrency for Parallel Tasks

Group related tasks using `StructuredTaskScope` (JDK 21+) when multiple parallel sub-tasks must complete together. If one task fails, all siblings are shut down and the scope throws an exception — eliminating orphan threads.

**Checkpoint:** Always close structured concurrency scopes via try-with-resources (`try (var scope = new StructuredTaskScope.ShutdownOnFailure()) { ... }`) to ensure proper cancellation of forked tasks.

### Step 5: Replace ThreadLocal with Scoped Values

For JDK 25+, migrate `ThreadLocal` usage to `ScopedValue` for immutable context data shared across threads, especially when using virtual threads. Virtual thread multiplexing breaks `ThreadLocal` isolation — scoped values provide safe per-thread access without platform thread pinning.

**Checkpoint:** Verify that all code paths within a scoped value's `bind()` lambda complete before the scope exits, and that no async callbacks escape the bound region.

---

## Implementation Patterns

### Pattern 1: Virtual Thread Executor (BAD vs GOOD)

Replace platform-thread executors with virtual thread executors for I/O-bound workloads. Virtual threads are lightweight JVM-managed threads that multiplex onto a smaller number of carrier (platform) threads, enabling millions of concurrent tasks without exhausting system resources.

```java
// ❌ BAD — Platform thread executor leaks connections under high I/O concurrency
public void processOrdersBad(List<Order> orders) throws InterruptedException {
    ExecutorService executor = Executors.newFixedThreadPool(200);

    List<CompletableFuture<OrderResult>> futures = orders.stream()
        .map(order -> CompletableFuture.supplyAsync(
            () -> processSingleOrder(order), executor))
        .toList();

    // Platform threads block on I/O — pool exhausts and tasks queue up
    for (CompletableFuture<OrderResult> f : futures) {
        OrderResult result = f.get(30, TimeUnit.SECONDS);
        System.out.println("Processed order " + result.orderId());
    }

    executor.shutdown();
}

// ✅ GOOD — Virtual thread executor with try-with-resources auto-close
public void processOrdersGood(List<Order> orders) {
    // Each task gets a lightweight virtual thread; JVM creates ~60K+ per GB of heap
    try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {

        List<OrderResult> results = orders.stream()
            .map(order -> executor.submit(() -> processSingleOrder(order)).join())
            .toList();

        results.forEach(r -> System.out.println("Processed order " + r.orderId()));
    } // AutoCloseable — executor joins all virtual threads on close
}

// ✅ GOOD — Bounded concurrency using Semaphore for downstream system protection
public void processOrdersBounded(List<Order> orders) {
    // Limit concurrent I/O to what the database can handle safely
    var semaphore = new Semaphore(50);

    try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
        List<OrderResult> results = orders.stream()
            .map(order -> executor.submit(() -> {
                try {
                    semaphore.acquire();
                    return processSingleOrder(order);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException("Task interrupted", e);
                } finally {
                    semaphore.release();
                }
            }))
            .toList()
            .stream()
            .map(CompletableFuture::join)
            .toList();
    }
}
```

### Pattern 2: Pattern Matching Switch on Sealed Hierarchy (BAD vs GOOD)

Sealed classes restrict which types can extend or implement them, creating a closed type hierarchy. This enables exhaustive pattern matching in switch expressions — the compiler verifies all permitted subclasses are handled, eliminating unreachable default cases and missing-case bugs.

```java
// ❌ BAD — Legacy instanceof chain with manual casts, runtime ClassCastException risk
public double calculatePayment(Object obj) {
    if (obj instanceof Invoice) {
        Invoice invoice = (Invoice) obj;
        return invoice.getAmount() * (1 - invoice.getDiscountRate());
    } else if (obj instanceof Payment) {
        Payment payment = (Payment) obj;
        return payment.getPrincipal();
    } else if (obj instanceof Refund) {
        Refund refund = (Refund) obj;
        return refund.getAmount() * -1;
    } else if (obj instanceof String s) {
        return Double.parseDouble(s);
    }
    throw new IllegalArgumentException("Unknown type: " + obj.getClass());
}

// ✅ GOOD — Sealed interface with exhaustive pattern matching switch
public record Invoice(int id, double amount, double discountRate) implements Transaction {}
public record Payment(int id, double principal) implements Transaction {}
public record Refund(int id, double amount) implements Transaction {}

public sealed interface Transaction permits Invoice, Payment, Refund {}

// Switch expression with pattern matching — compiler enforces exhaustiveness
public double calculatePayment(Transaction tx) {
    return switch (tx) {
        case Invoice invoice -> invoice.amount() * (1 - invoice.discountRate());
        case Payment payment -> payment.principal();
        case Refund refund   -> refund.amount() * -1;
        // No default needed — compiler guarantees all permits are covered
    };
}

// ✅ GOOD — instanceof pattern matching in if guards with deconstruction
public record Point(int x, int y) {}
public record Circle(Point center, double radius) extends Shape {}
public record Rectangle(Point tl, Point br) extends Shape {}
public abstract sealed class Shape permits Circle, Rectangle {}

public String describeShape(Shape shape) {
    // Pattern matching instanceof with type pattern variable
    if (shape instanceof Circle c && c.radius() > 0) {
        return "Circle at (%d,%d) with radius %.2f".formatted(c.center.x(), c.center.y(), c.radius());
    }
    if (shape instanceof Rectangle r) {
        var width = Math.abs(r.br().x() - r.tl().x());
        var height = Math.abs(r.br().y() - r.tl().y());
        return "Rectangle %dx%d".formatted(width, height);
    }
    throw new IllegalArgumentException("Unhandled shape: " + shape.getClass().getSimpleName());
}
```

### Pattern 3: Records with Compact Constructors and Computed Components

Records provide immutable value objects with auto-generated `equals()`, `hashCode()`, and `toString()`. Use compact constructors for validation logic, and add computed methods for derived behavior. Records are ideal for DTOs, domain events, configuration values, and API response types.

```java
// ✅ GOOD — Record for simple data carrier with no validation needed
public record OrderId(long value) {
    public OrderId {
        if (value <= 0) throw new IllegalArgumentException("Order ID must be positive");
    }
}

// ✅ GOOD — Generic record for paginated API responses with nested metadata
public record PagedResponse<T>(List<T> items, PageMetadata pageInfo) {
    public static <T> PagedResponse<T> empty(int page, int pageSize, long totalElements) {
        return new PagedResponse<>(List.of(), new PageMetadata(page, pageSize, totalElements));
    }

    public boolean hasNextPage() {
        return (long) (pageInfo.page + 1) * pageInfo.size < pageInfo.total;
    }

    public record PageMetadata(int page, int size, long total) {
        public int totalPages() {
            return (int) Math.ceil((double) total / size);
        }
    }
}

// ✅ GOOD — Record with compact constructor for multi-field validation
public record UserRegistration(String email, String displayName, LocalDateTime createdAt) {
    public UserRegistration(String email, String displayName) {
        this(email, displayName, LocalDateTime.now());
        // Validate email format using regex
        if (!email.matches("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$")) {
            throw new IllegalArgumentException("Invalid email: " + email);
        }
        // Validate display name is not empty or whitespace-only
        if (displayName == null || displayName.isBlank()) {
            throw new IllegalArgumentException("Display name is required");
        }
        if (displayName.length() > 50) {
            throw new IllegalArgumentException("Display name exceeds 50 characters");
        }
    }
}

// ❌ BAD — Do NOT use records for objects that need mutability
public class MutableConfig {
    private String apiKey;
    public void setApiKey(String key) { this.apiKey = key; } // Records are immutable
}
// Use a regular class when mutation is required.
```

### Pattern 4: Sequenced Collections (JDK 21+)

Sequenced Collections (JEP 448) add `addFirst`, `addLast`, `getFirst`, `getLast`, and `reverse()` to the collection hierarchy. Use `SequencedCollection` when you need deque-like operations, or `SequencedMap` for first/last key access instead of relying on implementation-specific behavior.

```java
// ❌ BAD — Using plain List with O(n) first element access
public class BadOrderProcessor {
    public String getLastProcessedId(List<String> orderIds) {
        if (orderIds.isEmpty()) return null;
        // Must traverse entire list — O(n) even for last element
        return orderIds.get(orderIds.size() - 1);
    }

    public void addOrder(List<String> queue, String orderId) {
        // No standard List method for adding to front — confusing intent
        queue.add(0, orderId);  // This shifts all elements — O(n)
    }
}

// ✅ GOOD — SequencedCollection provides explicit first/last operations
public class OrderProcessor {

    // Return type exposes the API contract: caller needs first/last semantics
    private final Deque<String> orderQueue = new ArrayDeque<>();

    public String getLastProcessedId() {
        return orderQueue.getLast(); // O(1) — declared on SequencedCollection
    }

    public void addOrder(String orderId) {
        orderQueue.addLast(orderId); // O(1) — explicit intent
    }

    public String nextOrderId() {
        return orderQueue.pollFirst(); // Remove and return first element
    }

    public int queueSize() {
        return orderQueue.size();
    }

    // ✅ GOOD — SequencedMap for first/last key access
    public static void processConfiguration(Map<String, String> config) {
        var sequencedConfig = new LinkedHashMap<String, String>(config);

        // First entry is the base configuration
        String baseEnv = sequencedConfig.firstKey();
        // Last entry overrides everything
        String overrideEnv = sequencedConfig.lastKey();

        System.out.println("Base env: " + baseEnv);
        System.out.println("Override env: " + overrideEnv);

        // Reverse iteration for priority processing (last to first)
        for (var entry : sequencedConfig.reversed()) {
            System.out.println(entry.getKey() + "=" + entry.getValue());
        }
    }
}
```

### Pattern 5: Scoped Values for Immutable Context (JDK 25+)

Scoped Values (JEP 506) provide a lower-overhead alternative to `ThreadLocal` for passing immutable data across threads. Unlike `ThreadLocal`, scoped values are safe with virtual thread multiplexing because the value is bound explicitly within a lambda scope rather than implicitly tied to the carrier thread. This prevents context pollution when virtual threads swap platform carriers.

```java
// ❌ BAD — ThreadLocal breaks with virtual thread multiplexing
public class BadContextHolder {
    // Virtual threads share platform threads → ThreadLocal data leaks across requests
    private static final ThreadLocal<String> USER_ID = ThreadLocal.withInitial(() -> "anonymous");

    public void handleRequest(String userId) {
        USER_ID.set(userId);           // Sets on platform thread, not virtual thread
        // Another virtual thread on same platform thread may see stale data
        processRequest();              // USER_ID.get() could return wrong user
    }
}

// ✅ GOOD — ScopedValue with explicit binding scope (JDK 25+)
public final class RequestContext {
    // Declaring a scoped value — immutable, bound within a lambda
    private static final ScopedValue<String> CURRENT_USER = ScopedValue.newInstance();
    private static final ScopedValue<RequestId> REQUEST_ID = ScopedValue.newInstance();

    private RequestContext() {}

    /** Execute a request handler with bounded context data.
     *  Only code inside the bind() lambda can access these values. */
    public static void execute(
        String userId,
        RequestId requestId,
        Runnable handler
    ) {
        ScopedValue.where(CURRENT_USER, userId)
                   .where(REQUEST_ID, requestId)
                   .run(handler);
    }

    /** Get current user — only valid within a bound scope */
    public static String getCurrentUser() {
        return CURRENT_USER.get();
    }

    /** Get current request ID — only valid within a bound scope */
    public static RequestId getCurrentRequestId() {
        return REQUEST_ID.get();
    }

    /** Run multiple operations under the same scoped context, in parallel */
    public static <R> List<R> executeParallel(
        String userId,
        RequestId requestId,
        List<java.util.concurrent.Callable<R>> tasks
    ) throws Exception {
        var scope = new jdk.incubator.concurrent.StructuredTaskScope<>();

        return ScopedValue.where(CURRENT_USER, userId)
            .where(REQUEST_ID, requestId)
            .callAll(tasks.stream()
                .map(task -> scope.fork(() -> task.call()))
                .toList()
            ).results().stream()
            .map(jdk.incubator.concurrent.StructuredTaskScope.Subtask::get)
            .toList();
    }

    public record RequestId(long value) {
        public RequestId { if (value <= 0) throw new IllegalArgumentException("ID must be positive"); }
    }
}

// Usage: Pass user context across threads safely with virtual threads
public class OrderService {

    public void placeOrder(String userId, String orderId) {
        var requestId = new RequestContext.RequestId(System.nanoTime());

        // Context is bound only within the lambda — safe even with virtual threads
        RequestContext.execute(userId, requestId, () -> {
            System.out.println("Processing order for: " + RequestContext.getCurrentUser());
            System.out.println("Request ID: " + RequestContext.getCurrentRequestId());
            processPayment(orderId);
            notifyCustomer(orderId);
        });
    }

    private void processPayment(String orderId) { /* ... */ }
    private void notifyCustomer(String orderId) { /* ... */ }
}
```

### Pattern 6: Foreign Function & Memory API (JEP 454)

The Foreign Function & Memory API provides a safe replacement for JNI in Java. Use `MemorySegment` for native memory, `Arena` for scoped allocation, and `MemoryLayout` for defining C-compatible struct layouts. This approach avoids the complexity and security risks of JNI while providing near-zero overhead interop with C libraries.

```java
// ✅ GOOD — Reading a file into native memory using Foreign Memory API (JDK 22+)
import java.lang.foreign.*;
import java.nio.channels.FileChannel;
import java.io.IOException;
import java.nio.file.Path;

public class NativeFileReader {

    private static final Arena ARENA = Arena.ofConfined();

    /** Read a file into a native memory segment and return bytes.
     *  Uses MemorySegment.mapToMemory for zero-copy access on supported platforms. */
    public byte[] readFile(Path path) throws IOException {
        try (var channel = FileChannel.open(path)) {
            long fileSize = channel.size();

            // Map the file directly into native memory — no intermediate heap allocation
            var segment = channel.map(FileChannel.MapMode.READ_ONLY, 0, fileSize, ARENA);

            // Convert to Java heap bytes if needed for processing
            byte[] heapCopy = new byte[(int) fileSize];
            MemoryAccess.getArrayBaseOffset(byte[].class);
            segment.copyTo(0, heapCopy, 0, fileSize);

            return heapCopy;
        }
    }

    // ✅ GOOD — Define a C struct layout and read values from native memory
    public static record Point(int x, int y) {}

    public static final MemoryLayout POINT_LAYOUT = MemoryLayout.ofStruct(
        MemoryLayout.ofValueBits(32, ByteOrder.BIG_ENDIAN),  // int x
        MemoryLayout.ofValueBits(32, ByteOrder.BIG_ENDIAN)   // int y
    );

    /** Read a Point struct from native memory at the given address offset */
    public static Point readPoint(MemorySegment segment, long offset) {
        var access = segment.asSlice(offset, POINT_LAYOUT.byteSize());
        int x = MemoryAccess.getIntUnaligned(access, MemoryLayout.PathElement.groupElement("x"));
        int y = MemoryAccess.getIntUnaligned(access, MemoryLayout.PathElement.groupElement("y"));
        return new Point(x, y);
    }
}

// ❌ BAD — Traditional JNI approach with native library coupling
public class BadNativeAccess {
    // Requires a compiled .so/.dll file maintained separately from Java code
    static { System.loadLibrary("mylib"); }
    public native int compute(int a, int b);  // No type safety, no compilation checking
}
// JNI requires maintaining native C/C++ code, separate build pipelines, and
// carries significant security risks from buffer overflows and memory corruption.
```

---

## Constraints

### MUST DO

- Use `Executors.newVirtualThreadPerTaskExecutor()` for all I/O-bound task execution — never use platform thread pools for this purpose
- Declare sealed interfaces/classes with an explicit `permits` clause listing every permitted subclass to enable exhaustive pattern matching
- Apply pattern matching with instanceof (`if (obj instanceof SomeType variable)`) instead of raw casts after instanceof checks
- Use records for immutable data carriers and DTOs; include compact constructors when validation logic is required
- Always close virtual thread executors via try-with-resources (`try (var executor = Executors.newVirtualThreadPerTaskExecutor()) { ... }`)
- Prefer `SequencedCollection` / `SequencedMap` over plain `List` / `Map` when first/last operations are part of the API contract
- Use `ScopedValue` (JDK 25+) instead of `ThreadLocal` for immutable context shared across threads, especially with virtual threads
- Set explicit timeouts on all blocking I/O calls — `HttpClient` with `.connectTimeout()` and JDBC statements with `.setQueryTimeout()`

### MUST NOT DO

- Use virtual threads for CPU-bound computation — use `ForkJoinPool` or bounded platform thread pools instead
- Share mutable state between virtual threads without explicit synchronization — virtual thread scheduling is non-deterministic
- Leave a `StructuredTaskScope` unclosed via try-with-resources — this causes resource leaks and prevents proper task cancellation
- Use raw `instanceof` checks with manual casting (`if (obj instanceof String) { String s = (String) obj; }`) when pattern matching is available
- Use records for objects that require mutability — they are fundamentally immutable by design
- Rely on `ThreadLocal` for per-thread state in virtual thread applications — the multiplexing model breaks isolation guarantees

---

## Live References

> Authoritative documentation links for modern Java language features (JDK 21–26). The model follows markdown links at load time to resolve external references and inline content.

- [OpenJDK Project Loom — Virtual Threads](https://openjdk.org/projects/loom/)
- [Java Language Guide — Records](https://docs.oracle.com/en/java/javase/21/language/records.html)
- [Sequenced Collections (JEP 448)](https://openjdk.org/jeps/448)
- [Scoped Values (JEP 506, JDK 25 Preview)](https://openjdk.org/jeps/506)
- [Foreign Function & Memory API (JEP 454)](https://openjdk.org/jeps/454)
- [Java SE 21 Language Features Overview](https://docs.oracle.com/en/java/javase/21/language/)
- [OpenJDK JEP Index](https://openjdk.org/jeps/)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `go-concurrency-patterns` | Compare Go's goroutine model with Java's virtual threads — useful when evaluating concurrency approaches across languages |
| `coding-code-review` | General code review methodology — applies when reviewing modern Java code for correctness, security, and adherence to these patterns |
