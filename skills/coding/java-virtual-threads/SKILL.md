---
name: java-virtual-threads
description: Implements modern Java concurrency with virtual threads (JDK 21+), structured
  concurrency, sealed classes, pattern matching switch expressions, and records for
  high-throughput application development.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: virtual threads, Project Loom, JEP 444, sealed classes, pattern matching
    switch, thread-per-request, Java concurrency
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
  related-skills: async-programming, framework-performance-tuning, design-patterns-and-principles
------
# Modern Java Concurrency Engineer

When this skill loads, the model implements high-throughput concurrent applications using Java 21+ features — specifically virtual threads from Project Loom, structured concurrency via StructuredTaskScope, sealed class hierarchies with exhaustive pattern matching in switch expressions, and immutable data transfer objects via records. The model writes production-grade code that replaces legacy platform-thread executors and thread-per-request server patterns with lightweight concurrency primitives.

## TL;DR Checklist

- [ ] Use `Executors.newVirtualThreadPerTaskExecutor()` for I/O-bound workloads instead of `newFixedThreadPool`
- [ ] Apply pattern matching with `instanceof` in `if` guards — never use raw casts after instanceof checks
- [ ] Declare sealed classes with `permits` clause to constrain implementation hierarchy, then use exhaustive switch expressions on them
- [ ] Prefer `record` types for DTOs and immutable data carriers; use compact constructors only when validation logic is needed
- [ ] Use `StructuredTaskScope` (JDK 21+) instead of manual thread joins with `ExecutorCompletionService`
- [ ] Migrate ThreadLocal state to ThreadScopedStorage or restructure code — virtual threads multiplex across platform threads
- [ ] Always specify explicit timeout on blocking I/O calls (`HttpClient`, JDBC) to prevent resource exhaustion under load

---

## When to Use

Use this skill when:

- Building high-throughput HTTP servers that need thread-per-request semantics without managing a bounded thread pool (e.g., Spring Boot 3.2+, Micronaut, Tomcat with virtual threads)
- Migrating existing platform-thread-based executors (`FixedThreadPool`, `CachedThreadPool`) to virtual threads for I/O-bound workloads
- Implementing parallel data pipelines where each pipeline stage involves blocking I/O calls (databases, REST APIs, file systems)
- Replacing deep instanceof chains and switch-on-string with sealed class hierarchies and exhaustive pattern matching
- Designing immutable DTOs or domain value objects — records eliminate boilerplate for equals/hashCode/toString/construction

---

## When NOT to Use

Avoid this skill for:

- **CPU-bound computation** — Virtual threads add scheduler overhead without improving throughput. Use `ForkJoinPool.commonPool()` or a bounded `ExecutorService` with platform threads instead.
- **Simple sequential scripts** — Single-threaded programs gain nothing from virtual threads; keep the code simple.
- **Code tightly coupled to ThreadLocal state** — Virtual threads multiplex across platform OS threads, so ThreadLocal variables are not isolated per virtual thread. Either migrate away from ThreadLocal or use `InheritableThreadLocal` with explicit cleanup.
- **Low-throughput internal services** — If your service handles fewer than ~100 concurrent requests, the operational complexity of virtual threads may outweigh the benefit.

---

## Core Workflow

### Step 1: Assess Workload Type — I/O-bound vs CPU-bound

Determine whether the task is I/O-bound (waiting on external systems) or CPU-bound (computation). This decision dictates executor choice.

- **I/O-bound**: Database queries, HTTP client calls, file reads/writes, message queue consumption → use virtual threads
- **CPU-bound**: Sorting large collections, cryptographic hashing, image processing, JSON deserialization of millions of records → use `ForkJoinPool` or platform-thread `FixedThreadPool`

**Checkpoint:** Run a quick benchmark with 10k tasks. If switching from `newCachedThreadPool()` to `newVirtualThreadPerTaskExecutor()` improves throughput without increasing memory, the workload is I/O-bound and virtual threads are appropriate.

```java
// Checklist: verify ThreadFactory behavior
public void assessWorkload() {
    // Virtual threads report their factory as a special internal type
    ThreadFactory vtFactory = Thread.ofVirtual().factory();
    Thread vThread = vtFactory.newThread(() -> System.out.println("virtual"));
    System.out.println(vThread.isVirtual()); // true
    
    // Platform thread factory for comparison
    ThreadFactory ptFactory = Thread.ofPlatform().factory();
    Thread pThread = ptFactory.newThread(() -> System.out.println("platform"));
    System.out.println(pThread.isVirtual()); // false
}
```

### Step 2: Migrate Executor Service to Virtual Thread Executor

Replace platform-thread executors with `Executors.newVirtualThreadPerTaskExecutor()`. This requires updating connection pool configurations since virtual threads are not long-lived.

```java
// ❌ BAD — Platform thread executor for I/O-bound work
// Under load, this creates thousands of platform threads that consume native memory
ExecutorService oldExecutor = Executors.newFixedThreadPool(200);
List<Future<UserProfile>> futures = users.stream()
    .map(user -> oldExecutor.submit(() -> fetchUserProfile(user.id())))
    .toList();

// ✅ GOOD — Virtual thread executor for I/O-bound work
// Each task gets a lightweight virtual thread; the JVM creates ~60K+ per GB of heap
ExecutorService vtExecutor = Executors.newVirtualThreadPerTaskExecutor();
List<UserProfile> profiles = users.stream()
    .map(user -> vtExecutor.submit(() -> fetchUserProfile(user.id())).join())
    .toList();
vtExecutor.close(); // implements AutoCloseable — always close when done

// IMPORTANT: Migrate ThreadLocal usage in database connection pools
// HikariCP supports virtual threads natively since version 5.1.0 (JDK 21+).
// Configure it with a maximum pool size matching expected concurrent connections,
// not the number of virtual threads (which may be in the tens of thousands).
HikariConfig config = new HikariConfig();
config.setDataSourceClassName("com.mysql.cj.jdbc.MysqlDataSource");
config.addDataSourceProperty("serverName", "db.example.com");
config.setMaximumPoolSize(50);       // Match DB capacity, NOT thread count
config.setMinimumIdle(10);
config.setProperty("cachePrepStmts", "true");
config.setProperty("prepStmtCacheSize", "250");

// ThreadLocal migration: if using a legacy connection holder pattern:
public final class LegacyConnectionHolder {
    private static final ThreadLocal<Connection> CONNECTION = new ThreadLocal<>();
    // ❌ BROKEN with virtual threads — multiplexing breaks per-thread isolation
}

// ✅ MIGRATED: Use method parameter or structured scope instead
public Connection getConnection() {
    return dataSource.getConnection(); // Direct call, no ThreadLocal needed
}
```

### Step 3: Apply Pattern Matching Switch Expressions

Replace instanceof chains and switch on strings/enums with pattern matching features available in JDK 21+. This reduces boilerplate, eliminates runtime ClassCastException, and enables compiler-enforced exhaustiveness.

```java
// ❌ BAD — Legacy instanceof chain with manual casts
public double calculatePayment(Object obj) {
    if (obj instanceof Invoice) {
        Invoice invoice = (Invoice) obj;
        return invoice.getAmount() * (1 - invoice.getDiscountRate());
    } else if (obj instanceof Payment) {
        Payment payment = (Payment) obj;
        return payment.getPrincipal();
    } else if (obj instanceof Refund) {
        Refund refund = (Refund) obj;
        return refund.getAmount() * -1; // Negative to indicate outflow
    } else if (obj instanceof String s) {
        return Double.parseDouble(s);
    }
    throw new IllegalArgumentException("Unknown type: " + obj.getClass());
}

// ✅ GOOD — Pattern matching with instanceof in if guard
public double calculatePayment(Object obj) {
    if (obj instanceof Invoice invoice) {
        return invoice.amount() * (1 - invoice.discountRate());
    }
    if (obj instanceof Payment payment) {
        return payment.principal();
    }
    if (obj instanceof Refund refund) {
        return refund.amount() * -1;
    }
    if (obj instanceof String s && !s.isBlank()) {
        return Double.parseDouble(s);
    }
    throw new IllegalArgumentException("Unknown type: " + obj.getClass().getSimpleName());
}

// ✅ GOOD — Exhaustive switch expression on sealed hierarchy
public record Invoice(int id, double amount, double discountRate) {}
public record Payment(int id, double principal) {}
public record Refund(int id, double amount) {}

public sealed interface Transaction permits Invoice, Payment, Refund {}

public double calculatePayment(Transaction tx) {
    return switch (tx) {
        case Invoice invoice -> invoice.amount() * (1 - invoice.discountRate());
        case Payment payment -> payment.principal();
        case Refund refund -> refund.amount() * -1;
    }; // Compiler enforces exhaustiveness — no default needed
}
```

### Step 4: Use Sealed Classes for Type Hierarchy

Sealed classes restrict which types can extend or implement them, creating a closed type hierarchy. This enables exhaustive pattern matching and documents the complete set of valid subclasses at compile time.

```java
// Define a sealed interface with explicit permits (preferred over extends/implements)
public sealed interface PaymentMethod
    permits CreditCardPayment, BankTransferPayment, CryptocurrencyPayment, GiftCardPayment {

    /** Returns the maximum refund amount allowed for this payment method */
    BigDecimal maxRefundAmount();
    
    /** Indicates whether refunds are reversible after a grace period */
    boolean isReversibleAfterGracePeriod();
}

// Concrete implementations — each in its own class or as record
public final class CreditCardPayment implements PaymentMethod {
    private final String lastFourDigits;
    private final String expiryDate;
    private final CardNetwork network; // Visa, Mastercard, Amex
    
    public CreditCardPayment(String lastFourDigits, String expiryDate, CardNetwork network) {
        if (lastFourDigits == null || !lastFourDigits.matches("\\d{4}")) {
            throw new IllegalArgumentException("lastFourDigits must be 4 digits");
        }
        this.lastFourDigits = lastFourDigits;
        this.expiryDate = expiryDate;
        this.network = network;
    }
    
    public String lastFourDigits() { return lastFourDigits; }
    public CardNetwork network() { return network; }
    
    @Override
    public BigDecimal maxRefundAmount() {
        return BigDecimal.valueOf(10_000); // $10,000 per transaction for credit cards
    }
    
    @Override
    public boolean isReversibleAfterGracePeriod() { return false; }
}

public record BankTransferPayment(String iban, String swiftCode) implements PaymentMethod {
    public BankTransferPayment {
        if (iban == null || !iban.startsWith("DE") && !iban.startsWith("GB")) {
            throw new IllegalArgumentException("IBAN must start with DE or GB");
        }
    }
    
    @Override
    public BigDecimal maxRefundAmount() { return BigDecimal.valueOf(500_000); }
    @Override
    public boolean isReversibleAfterGracePeriod() { return true; }
}

public record CryptocurrencyPayment(String walletAddress, String blockchainNetwork) 
    implements PaymentMethod {
    
    @Override
    public BigDecimal maxRefundAmount() { return null; // No fixed limit for crypto }
    @Override
    public boolean isReversibleAfterGracePeriod() { return false; }
}

// Exhaustive processing — compiler enforces all permits are handled
public record ProcessingResult(boolean success, String reason) {}

public ProcessingResult processRefund(PaymentMethod method, BigDecimal amount) {
    return switch (method) {
        case CreditCardPayment card -> new ProcessingResult(
            amount.compareTo(card.maxRefundAmount()) <= 0,
            "Credit card refund processed"
        );
        case BankTransferPayment bt -> new ProcessingResult(
            amount.compareTo(bt.maxRefundAmount() != null ? bt.maxRefundAmount() : BigDecimal.valueOf(Long.MAX_VALUE)) <= 0,
            "Bank transfer refund queued for manual review"
        );
        case CryptocurrencyPayment crypto -> {
            if (amount.compareTo(BigDecimal.ZERO) > 0) {
                yield new ProcessingResult(false, "Crypto refunds require on-chain reversal");
            } else {
                yield new ProcessingResult(true, "No refund needed");
            }
        }
        case GiftCardPayment gc -> new ProcessingResult(
            true,
            "Gift card balance restored to original account"
        );
    };
}
```

### Step 5: Implement Records for Data Transfer and Domain Objects

Records provide immutable value objects with auto-generated constructors, accessors, equals, hashCode, and toString. Use them for DTOs, domain events, and configuration values.

```java
// ✅ GOOD — Record for simple data carrier
public record OrderId(long value) {
    public OrderId {
        if (value <= 0) throw new IllegalArgumentException("Order ID must be positive");
    }
}

// ✅ GOOD — Nested records for hierarchical DTOs
public record ApiResponse<T>(
    int statusCode,
    String message,
    T data
) implements Serializable {
    
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(200, "OK", data);
    }
    
    public static <T> ApiResponse<T> error(int code, String message) {
        return new ApiResponse<>(code, message, null);
    }
}

// ✅ GOOD — Record with compact constructor for validation logic
public record UserRegistration(
    String email,
    String displayName,
    LocalDateTime createdAt
) {
    public UserRegistration(String email, String displayName) {
        this(email, displayName, LocalDateTime.now());
        // Compact constructor — validates before delegating to canonical fields
        if (!email.matches("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$")) {
            throw new IllegalArgumentException("Invalid email format: " + email);
        }
        if (displayName == null || displayName.isBlank()) {
            throw new IllegalArgumentException("Display name is required");
        }
    }
}

// ✅ GOOD — Record components as generic type parameters in DTOs
public record PaginatedResponse<T>(
    List<T> items,
    int page,
    int pageSize,
    long totalElements
) {
    public boolean hasNextPage() {
        return (long) (page + 1) * pageSize < totalElements;
    }
    
    public boolean hasPrevPage() {
        return page > 0;
    }
}

// ❌ BAD — Do NOT use records for objects that need mutability
public class MutableConfig {
    private String apiKey;
    public void setApiKey(String key) { this.apiKey = key; }
}
// Use a regular class with fields when mutation is required.
// Records are fundamentally immutable — their components are final.
```

---

## Implementation Patterns

### Pattern 1: Virtual Thread Executor Service (BAD vs GOOD)

```java
// ❌ BAD — Platform thread pool leaks connections under high I/O concurrency
public void processOrdersBad(List<Order> orders) throws InterruptedException {
    ExecutorService executor = Executors.newFixedThreadPool(
        Math.min(Runtime.getRuntime().availableProcessors() * 2, 100)
    );
    
    List<CompletableFuture<OrderResult>> futures = orders.stream()
        .map(order -> CompletableFuture.supplyAsync(
            () -> processSingleOrder(order), executor
        ))
        .toList();
    
    // Platform threads block on I/O — pool exhausts and tasks queue up
    for (CompletableFuture<OrderResult> f : futures) {
        OrderResult result = f.get(30, TimeUnit.SECONDS);
        log.info("Processed order {} → {}", result.orderId(), result.status());
    }
    
    executor.shutdown();
}

// ✅ GOOD — Virtual threads scale to match I/O-bound concurrency needs
public void processOrdersGood(List<Order> orders) {
    try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
        
        List<OrderResult> results = orders.parallelStream()
            .map(order -> executor.submit(() -> processSingleOrder(order)).join())
            .toList();
        
        results.forEach(r -> 
            log.info("Processed order {} → {}", r.orderId(), r.status())
        );
    } // AutoCloseable — executor closes and joins all virtual threads
}

// ✅ GOOD — Hybrid pattern: bounded virtual threads for controlled concurrency
public void processOrdersBounded(List<Order> orders) {
    // Use a Semaphore to limit concurrent I/O to what the downstream system can handle
    Semaphore semaphore = new Semaphore(50); // Max 50 concurrent DB connections
    
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

### Pattern 2: Structured Concurrency with StructuredTaskScope (JDK 21+)

Structured concurrency groups related tasks so that they share a common lifetime. If one task fails, all sibling tasks are shut down and the scope throws an exception — eliminating "fire-and-forget" orphan threads.

```java
import jdk.incubator.concurrent.StructuredTaskScope;

// ✅ GOOD — StructuredTaskScope for parallel sub-task execution with proper error handling
public record OrderSummary(String orderId, UserProfile user, InventoryCheck inventory) {}

public OrderSummary processOrderWithStructuredConcurrency(String orderId) 
        throws InterruptedException {
    
    try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
        
        // Subtask 1: Fetch user profile in parallel
        StructuredTaskScope.Subtask<UserProfile> userTask = scope.fork(() -> 
            fetchUserProfile(orderId).orElseThrow(() -> 
                new RuntimeException("User not found for order " + orderId)
            )
        );
        
        // Subtask 2: Check inventory availability
        StructuredTaskScope.Subtask<InventoryCheck> inventoryTask = scope.fork(() -> 
            checkInventoryAvailability(orderId)
        );
        
        // Wait for both to complete; if either fails, shut down the other and throw
        scope.join();
        scope.throwIfFailed();
        
        return new OrderSummary(
            orderId,
            userTask.get(),
            inventoryTask.get()
        );
    } // On exception: all forked tasks are automatically cancelled
}

// ✅ GOOD — ShutdownSubtask for timeout-based cancellation
public Optional<UserProfile> fetchWithTimeout(String userId) throws InterruptedException {
    try (var scope = new StructuredTaskScope.ShutdownOnSuccess<>()) {
        
        // Subtask: actual network call
        scope.fork(() -> fetchUserProfile(userId));
        
        // Fork a watchdog to cancel after 5 seconds
        scope.fork(() -> {
            Thread.sleep(5_000);
            scope.shutdown("Timeout exceeded");
            return null;
        });
        
        scope.join();
        return scope.result().orElse(Optional.empty());
    }
}

// ✅ GOOD — ForkJoinPool for CPU-bound work (NOT virtual threads)
public List<BigInteger> computePrimes(List<Integer> candidates, int threadCount) {
    ForkJoinPool pool = new ForkJoinPool(Math.min(threadCount, 
        Runtime.getRuntime().availableProcessors()));
    
    try {
        return pool.invoke(
            CompletableFuture.supplyAsync(
                () -> candidates.parallelStream()
                    .filter(n -> n >= 2)
                    .map(BigInteger::valueOf)
                    .filter(n -> n.isProbablePrime(50))
                    .toList(),
                pool
            )
        );
    } finally {
        pool.shutdown();
    }
}
```

### Pattern 3: Record-Based DTOs with Compact Constructors

```java
// ✅ GOOD — Fully validated record for API request body
public record CreateAccountRequest(
    @Email String email,
    @NotBlank String password,
    AccountType accountType
) {
    public enum AccountType { PERSONAL, BUSINESS, ENTERPRISE }
    
    // Compact constructor validates business rules beyond simple format checks
    public CreateAccountRequest {
        if (password == null || password.length() < 12) {
            throw new IllegalArgumentException("Password must be at least 12 characters");
        }
        if (!password.matches(".*[A-Z].*")) {
            throw new IllegalArgumentException("Password must contain an uppercase letter");
        }
        if (!password.matches(".*\\d.*")) {
            throw new IllegalArgumentException("Password must contain a digit");
        }
    }
}

// ✅ GOOD — Record with computed components (derived from canonical fields)
public record TransactionRecord(
    String transactionId,
    BigDecimal amount,
    Currency currency,
    LocalDateTime timestamp
) {
    /** Returns the amount formatted as a display string (e.g., "$1,234.56 USD") */
    public String displayAmount() {
        return NumberFormat.getCurrencyInstance(Locale.getDefault())
            .format(amount.setScale(2)) + " " + currency.getSymbol();
    }
    
    /** Returns true if the transaction occurred within the last 24 hours */
    public boolean isRecent() {
        return timestamp.isAfter(LocalDateTime.now().minusHours(24));
    }
}

// ✅ GOOD — Generic record for paginated API responses with self-contained size method
public record PagedResponse<T>(
    List<T> items,
    PageMetadata pageInfo
) {
    public record PageMetadata(
        int currentPage,
        int totalPages,
        long totalItems,
        int pageSize
    ) {
        /** Returns the number of items shown on this page */
        public int getPageSize() { return Math.min(pageSize, (int) totalItems - (currentPage - 1) * pageSize); }
        
        /** Indicates whether additional pages exist */
        public boolean hasMorePages() {
            return currentPage < totalPages;
        }
    }
}
```

### Pattern 4: High-Throughput Server with Virtual Threads

```java
import java.net.http.HttpClient;
import java.time.Duration;

// ✅ GOOD — Minimal HTTP server using virtual threads (JDK 19+ incubating, JDK 21+ stable)
public class HighThroughputServer {
    private final HttpClient httpClient;
    private final int port;
    
    public HighThroughputServer(int port) {
        this.port = port;
        // HttpClient with virtual thread factory — each request handled in its own lightweight thread
        this.httpClient = HttpClient.newBuilder()
            .executor(Executors.newVirtualThreadPerTaskExecutor())
            .connectTimeout(Duration.ofSeconds(10))
            .version(HttpClient.Version.HTTP_2)
            .build();
    }
    
    public void start() throws Exception {
        java.net.http.HttpServer server = java.net.http.HttpServer.create(
            new java.net.InetSocketAddress(port), 0
        );
        
        // Configure the underlying thread pool to use virtual threads (Tomcat/Spring Boot 3.2+ do this automatically)
        // For plain Java: set system property -Djava.util.concurrent.ForkJoinPool.common.parallelism
        
        server.createContext("/api/orders", exchange -> {
            try {
                String orderId = exchange.getRequestURI().getQuery() != null 
                    ? parseOrderId(exchange) 
                    : "unknown";
                
                // Each request runs on a virtual thread — no pool exhaustion under load
                OrderSummary summary = processOrderWithStructuredConcurrency(orderId);
                
                byte[] response = java.util.Base64.getEncoder()
                    .encodeToString(
                        java.time.LocalDateTime.now().toString().getBytes(java.nio.charset.StandardCharsets.UTF_8)
                    );
                
                exchange.sendResponseHeaders(200, response.length);
                try (var os = exchangeResponseBody()) {
                    os.write(response);
                }
            } catch (Exception e) {
                exchange.sendResponseHeaders(500, -1);
            } finally {
                exchange.close();
            }
        });
        
        server.start();
    }
    
    // In Spring Boot 3.2+ this is a single property — no code changes needed:
    // server.tomcat.threads.type=virtual
    
    private String parseOrderId(java.net.http.HttpExchange exchange) {
        // Simplified parsing for example
        return "sample-order";
    }
    
    private java.io.OutputStream exchangeResponseBody() throws IOException {
        return null;
    }
}

// ✅ GOOD — Connection pooling with virtual threads (HikariCP 5.1+ supports JDK 21)
public class DatabaseService {
    private final DataSource dataSource;
    
    public DatabaseService(String url, String user, String password) {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(url);
        config.setUsername(user);
        config.setPassword(password);
        config.setMaximumPoolSize(50);           // Bounded — protects DB from overload
        config.setMinimumIdle(10);
        config.setIdleTimeout(Duration.ofMinutes(5));
        config.setMaxLifetime(Duration.ofMinutes(30));
        config.setConnectionTimeout(Duration.ofSeconds(10));
        config.addDataSourceProperty("cachePrepStmts", "true");
        config.addDataSourceProperty("prepStmtCacheSize", "250");
        // Virtual threads work natively — no custom ThreadFactory needed since HikariCP 5.1.0
        
        this.dataSource = new HikariDataSource(config);
    }
    
    /** Executes a query using virtual thread semantics — each call is lightweight */
    public List<UserRecord> findUsersActiveAfter(LocalDateTime cutoff) {
        String sql = "SELECT id, email, display_name FROM users WHERE last_active > ? ORDER BY last_active DESC LIMIT 100";
        
        try (var conn = dataSource.getConnection();
             var stmt = conn.prepareStatement(sql)) {
            
            stmt.setTimestamp(1, Timestamp.valueOf(cutoff));
            try (var rs = stmt.executeQuery()) {
                return new ArrayList<>(); // Process ResultSet to UserRecord list
            }
        } catch (SQLException e) {
            throw new RuntimeException("Database query failed", e);
        }
    }
}
```

---

## Constraints

### MUST DO
- Use `Executors.newVirtualThreadPerTaskExecutor()` for all I/O-bound task execution — never use platform thread pools for this purpose
- Declare sealed interfaces/classes with an explicit `permits` clause listing every permitted subclass to enable exhaustive pattern matching
- Apply pattern matching with instanceof (`if (obj instanceof SomeType variable)`) instead of raw casts after instanceof checks
- Use records for immutable data carriers and DTOs; include compact constructors when validation logic is required
- Always close virtual thread executors via try-with-resources (`try (var executor = Executors.newVirtualThreadPerTaskExecutor()) { ... }`)
- Set explicit timeouts on all blocking I/O calls — `HttpClient` with `.connectTimeout()` and JDBC statements with `.setQueryTimeout()`
- Migrate ThreadLocal usage before switching to virtual threads — use direct method parameters, structured scopes, or per-call context objects instead

### MUST NOT DO
- Use virtual threads for CPU-bound computation — use `ForkJoinPool` or bounded platform thread pools instead
- Leave a `StructuredTaskScope` unclosed via try-with-resources — this causes resource leaks and prevents proper task cancellation
- Use raw `instanceof` checks with manual casting (`if (obj instanceof String) { String s = (String) obj; }`) when pattern matching is available
- Share mutable state between virtual threads without explicit synchronization — virtual thread scheduling is non-deterministic
- Set HikariCP `maximumPoolSize` equal to the expected number of concurrent virtual threads — pool size should reflect database connection capacity, not thread count

---

## Live References

- [JEP 444: Virtual Threads](https://openjdk.org/jeps/444) — Official specification for Project Loom virtual threads
- [Java Records Documentation](https://docs.oracle.com/en/java/javase/21/language/records.html) — Record syntax, compact constructors, and usage patterns
- [Sealed Classes (JEP 409)](https://openjdk.org/jeps/409) — Closed type hierarchies for exhaustive matching
- [Structured Concurrency JEP](https://openjdk.org/jeps/453) — StructuredTaskScope API for grouping related tasks
- [Spring Boot 3.2 Virtual Threads Guide](https://spring.io/blog/2023/10/19/reactivating-virtual-threads-in-spring-framework-6-1-and-spring-boot-3-2) — Framework integration with virtual threads
- [HikariCP 5.1 JDK 21 Support](https://github.com/brettwooldridge/HikariCP) — Connection pooling compatibility with virtual threads
- [Java Concurrency Best Practices (Oracle)](https://www.oracle.com/java/technologies/javase/concurrency-guide.html) — General concurrency patterns and pitfalls

---

## Related Skills

| Skill | Purpose |
|---|---|
| `async-programming` | General asynchronous programming patterns across languages — complementary when comparing virtual threads to async/await approaches |
| `framework-performance-tuning` | Performance optimization techniques for Java frameworks — helps tune server configs after virtual thread migration |
| `design-patterns-and-principles` | Foundational design principles including SOLID and DRY — applies when refactoring legacy code to use sealed classes and records |
