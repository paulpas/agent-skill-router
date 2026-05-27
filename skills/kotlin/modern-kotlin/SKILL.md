---
name: modern-kotlin
description: Implements idiomatic Kotlin 2.0–2.4 patterns including coroutines, sealed interfaces, data classes, context receivers, and kotlinx libraries for production applications.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: kotlin
  role: implementation
  scope: implementation
  output-format: code
  content-types:
    - code
    - guidance
    - do-dont
    - examples
  triggers:
    - kotlin coroutines
    - sealed interfaces
    - data classes
    - kotlinx serialization
    - context receivers
    - how do i write modern kotlin
    - suspend function
  archetypes:
    - tactical
    - educational
  anti_triggers:
    - brainstorming
    - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: kotlin-coroutines-fundamentals, kotlin-serialization-patterns, kotlin-context-receivers, kotlin-jvm-interop
  maturity: stable
  completeness: 97
  exampleCount: 5
---

# Modern Kotlin Development

Senior Kotlin engineer writing idiomatic Kotlin 2.0–2.4 code using coroutines, sealed interfaces, data classes, context receivers, and kotlinx libraries. Focus on language features, null safety, smart casts, scope functions, and modern concurrency patterns — not framework-specific configuration.

## TL;DR Checklist

- [ ] Use `val` by default; only use `var` when mutation is genuinely necessary
- [ ] Leverage data classes with auto-generated equals/hashCode/toString/copy/destructuring
- [ ] Prefer sealed interfaces for finite type hierarchies with exhaustive when expressions
- [ ] Write suspend functions and manage coroutine lifecycles with SupervisorJob
- [ ] Apply smart casts after `is` checks — never use explicit `as` casts for subtypes
- [ ] Use kotlinx.serialization instead of Jackson/Gson for Kotlin projects
- [ ] Use context receivers (Kotlin 2.3+) for contextual dependencies without boilerplate

---

## When to Use

Use this skill when:

- Writing new Kotlin code and you need idiomatic patterns for modern Kotlin (2.0–2.4)
- Implementing async workflows with coroutines and structured concurrency
- Designing data models using sealed interfaces, data classes, and smart casts
- Adding JSON serialization to data classes with kotlinx.serialization
- Refactoring Java-style Kotlin code into idiomatic Kotlin
- Building multiplatform libraries or Android applications in Kotlin

---

## When NOT to Use

Avoid this skill for:

- Framework-specific questions (Ktor routing setup, Jetpack Compose UI design) — use a framework-focused skill instead
- JVM interoperability concerns with existing Java codebases — consult the `kotlin-jvm-interop` skill
- Kotlin/Native compilation targets or platform-specific native interop concerns
- Deep dive into coroutines fundamentals (dispatchers, cancellation tokens, flow operators) — use the dedicated coroutine skill for comprehensive coverage

---

## Core Workflow

1. **Enforce Immutability** — Declare all variables as `val` by default; only use `var` when mutation is unavoidable. Prefer `data class` for value objects and immutable collection types from `kotlinx.collections.immutable`. **Checkpoint:** Scan all variable declarations in the file — any `var` must have a clear justification comment explaining why mutation is needed.

2. **Apply Null Safety at Boundaries** — Annotate nullable types explicitly with `String?`, use safe call operator `?.`, elvis operator `?:`, and non-null assertion `!!:` only when null has already been verified. **Checkpoint:** Trace every nullable path — no code flow should produce an NPE. All `T?` values must either unwrap via `?:` or pass through an `is T` check before use.

3. **Model Data with Sealed Interfaces** — For finite type sets, define a sealed interface and implement it across modules. Use exhaustive `when` expressions without else branches to handle all cases at compile time. **Checkpoint:** The when expression covers every known implementation — the compiler rejects the code if any case is missing.

4. **Write Async with Coroutines** — Mark async operations as `suspend fun`, manage lifecycles with coroutine scopes using `SupervisorJob` for error isolation, use `flow` for cold streams of values, and apply `async`/`await` for concurrent fan-out. **Checkpoint:** Every launch or async has a structured lifecycle tied to its parent scope — no orphaned coroutines that outlive their context.

5. **Select Scope Functions by Intent** — Use `let` for nullable operations, `run` for transforming receiver returns, `apply` for configuration, `also` for side effects, and `with` when the receiver is not a Kotlin object. **Checkpoint:** Each scope function's return value is used or discarded intentionally — never choose a scope function solely for brevity at the cost of clarity.

6. **Serialize with kotlinx.serialization** — Annotate data classes with `@Serializable`, configure the format (JSON, Protobuf, CBOR), and use generated serializers. Prefer this over Jackson for Kotlin projects as it works across JVM, Native, and JS targets. **Checkpoint:** The serialization config handles polymorphic types correctly when sealed interfaces are serialized.

---

## Implementation Patterns

### Pattern 1: Data Classes with Smart Casts (❌ BAD vs ✅ GOOD)

Data classes auto-generate equals(), hashCode(), toString(), copy(), and componentN() destructuring. Combined with smart casts after `is` checks, they eliminate boilerplate entirely.

#### ❌ BAD: Java-style class with manual boilerplate and no null safety

```kotlin
// ❌ BAD: Manual boilerplate, mutable fields, no null safety
class User {
    private var name: String? = null
    private var age: Int = 0
    
    constructor(name: String?, age: Int) {
        this.name = name
        this.age = age
    }
    
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false
        other as User  // Explicit cast needed — no smart cast
        if (name != other.name) return false
        return age == other.age
    }
    
    override fun hashCode(): Int {
        var result = name?.hashCode() ?: 0
        result = 31 * result + age
        return result
    }
    
    override fun toString(): String {
        return "User(name=$name, age=$age)"
    }
}
```

#### ✅ GOOD: Data class with smart casts, null safety, and destructuring

```kotlin
/** User value object with auto-generated equals, hashCode, toString, copy. */
data class User(
    val name: String,       // Non-nullable by default — NPE impossible
    val age: Int
) {
    init {
        require(age >= 0) { "Age must be non-negative, got $age" }
    }

    /** Returns true if the user has reached adulthood. */
    fun isAdult(): Boolean = age >= 18

    /** Immutable copy with modified name — no manual field copying needed. */
    fun withName(newName: String): User = copy(name = newName)
}

/** Smart casts eliminate explicit type casting after 'is' checks. */
fun greetUser(user: Any) {
    if (user is User) {
        // Kotlin smart-casts `user` to User automatically — no `as User` needed
        val greeting = "Hello, ${user.name}! You are ${if (user.isAdult()) "an adult" else "a minor"}."
        println(greeting)
    }
}

/** Destructuring via auto-generated componentN() functions. */
fun printUserDetails(user: User) {
    val (name, age) = user  // Calls component1() and component2() on the data class
    println("Name: $name, Age: $age")
}

/** Nullable handling with safe calls and elvis operator. */
data class Address(
    val street: String?,
    val city: String?,
    val zipCode: String?
)

fun formatAddress(address: Address?): String = address
    ?.let { it.street?.plus(", ")?.plus(it.city ?: "") + " ${it.zipCode ?: ""}" }
    ?: "No address provided"
```

**Why this works:**
- `data class` eliminates ~40 lines of boilerplate (equals, hashCode, toString, copy)
- Non-nullable `String` prevents null pointer bugs at the type level
- Smart casts after `is User` remove all explicit casting overhead
- Destructuring provides clean component extraction without accessor methods
- Safe call chains with `?.let` provide idiomatic null handling

---

### Pattern 2: Sealed Interfaces with Exhaustive When (❌ BAD vs ✅ GOOD)

Sealed interfaces define restricted type hierarchies where all direct implementations are known at compile time. They enable exhaustive `when` expressions without `else` branches and can be implemented across module boundaries — unlike sealed classes which must reside in the same file.

#### ❌ BAD: Regular interface hierarchy — no compile-time exhaustiveness checking

```kotlin
// ❌ BAD: Any class can implement PaymentMethod — compiler cannot verify all cases handled
interface PaymentMethod {
    fun pay(amount: Double): Boolean
}

class CreditCard(val cardNumber: String, val expiryDate: String) : PaymentMethod {
    override fun pay(amount: Double): Boolean = true
}

class PayPal(val email: String) : PaymentMethod {
    override fun pay(amount: Double): Boolean = true
}

class Crypto(val walletAddress: String) : PaymentMethod {
    override fun pay(amount: Double): Boolean = true
}

// ❌ No compile-time warning if a new PaymentMethod implementation is added later
fun processPayment(method: PaymentMethod, amount: Double) {
    when (method) {
        is CreditCard -> println("Charging card ${method.cardNumber}")
        // PayPal and Crypto cases may be forgotten — compiler won't catch it
        else -> println("Unknown payment method")  // Catches future implementations silently
    }
}
```

#### ✅ GOOD: Sealed interface with exhaustive when — compiler guarantees all cases handled

```kotlin
/** Sealed interface for payment methods. All implementations are known at compile time. */
sealed interface PaymentMethod {
    val id: String

    /** Process a payment and return the transaction ID. */
    suspend fun pay(amount: Double): String
}

data class CreditCardPayment(
    override val id: String,
    val lastFourDigits: String,
    val expiryDate: String
) : PaymentMethod {
    override suspend fun pay(amount: Double): String = "TXN_CC_$id"
}

data class PayPalPayment(
    override val id: String,
    val email: String
) : PaymentMethod {
    override suspend fun pay(amount: Double): String = "TXN_PP_$id"
}

class CryptoPayment(
    override val id: String,
    val walletAddress: String,
    val network: String
) : PaymentMethod {
    override suspend fun pay(amount: Double): String = "TXN_CR_$id"
}

/** Compiler enforces exhaustive when — removing a case causes a compile error. */
fun calculateFee(method: PaymentMethod): Double = when (method) {
    is CreditCardPayment -> 0.029 * method.pay(100.0).length  // 2.9% fee
    is PayPalPayment -> 0.035 * method.pay(100.0).length       // 3.5% fee
    is CryptoPayment -> 0.001                                    // Flat network fee
}

/** Nested destructuring with when — access deep properties cleanly. */
fun summarizePayment(method: PaymentMethod) {
    when (method) {
        is CreditCardPayment -> println("Card ending in ${method.lastFourDigits}")
        is PayPalPayment -> println("PayPal: ${method.email}")
        is CryptoPayment -> println("Crypto (${$method.network}): ${method.walletAddress}")
    }
}

/** Sealed interfaces support polymorphic serialization via @Serializable annotation. */
@kotlinx.serialization.Serializable
sealed interface TransactionEvent {
    val timestamp: Long
    val amount: Double
}

@kotlinx.serialization.Serializable
data class PaymentCompleted(
    override val timestamp: Long,
    override val amount: Double,
    val paymentMethodId: String
) : TransactionEvent

@kotlinx.serialization.Serializable
data class PaymentFailed(
    override val timestamp: Long,
    override val amount: Double,
    val errorMessage: String
) : TransactionEvent
```

**Why this works:**
- Compiler rejects code if a new sealed interface implementation is added without updating the `when` expression
- Sealed interfaces can be implemented across module boundaries — unlike sealed classes
- Polymorphic serialization with `@Serializable` on the sealed interface handles type discriminators automatically
- Nested destructuring in `when` arms provides clean access to nested properties

---

### Pattern 3: Context Receivers (Kotlin 2.3 Stable)

Context receivers let functions access contextual objects without passing them through every call site. They provide a structured alternative to implicit parameters and global state, similar to Scala implicits but fully explicit at the call site.

```kotlin
/** Repository for persisting user data. */
interface UserRepository {
    suspend fun save(user: User): String
    suspend fun findById(id: String): User?
}

/** Thread-safe logger for application events. */
interface Logger {
    fun info(message: String)
    fun error(message: String, cause: Throwable? = null)
}

// Context receivers declare the contextual dependencies required by all functions in this block.
context(UserRepository, Logger)
class UserService(
    private val repository: UserRepository,
    private val logger: Logger
) {
    /** Creates a new user and logs the operation via context receiver. */
    suspend fun createUser(name: String, age: Int): User {
        val newUser = User(name, age)
        val savedId = repository.save(newUser)
        logger.info("Created user $name with ID $savedId")
        return newUser.copy(id = savedId)
    }

    /** Finds a user by ID or creates an informative error via context receiver. */
    suspend fun findUser(id: String): Result<User> {
        val user = repository.findById(id)
        return if (user != null) {
            Result.success(user)
        } else {
            logger.error("User not found: $id")
            Result.failure(IllegalArgumentException("User $id not found"))
        }
    }
}

/** Context receivers work on top-level functions too — no class wrapper needed. */
context(Logger)
suspend fun logOperation(operation: String, durationMs: Long) {
    info("Operation '$operation' completed in ${durationMs}ms")
}

/** Context receivers compose naturally across call chains. */
context(UserRepository, Logger)
fun buildUserSummary(user: User): String = run {
    val details = "User: $name, Age: $age"
    info("Building summary for user $id")
    "[$id] $details"
}

/** Using context receivers in a coroutine scope — dependencies propagate automatically. */
suspend fun exampleUsage(scope: CoroutineScope) {
    val repo: UserRepository = UserRepositoryImpl()
    val log: Logger = StdoutLogger()

    scope.launch {
        // Context receivers resolve via implicit passage — no explicit passing needed
        val service = UserService(repo, log)
        val user = service.createUser("Alice", 30)
        logOperation("createUser", 42)
        println(buildUserSummary(user))
    }
}
```

**Why this works:**
- Context receivers are resolved implicitly at the call site — no manual parameter passing
- The compiler checks that all context receiver types are available in scope
- Unlike global state, contexts are explicit and testable — you control what enters the context
- Top-level functions can use context receivers without being methods of a class

---

### Pattern 4: Coroutines with Structured Concurrency

Structured concurrency ensures all child coroutines are tracked by their parent scope. `SupervisorJob` isolates errors so one failing coroutine doesn't cancel siblings. `flow` provides lazy streams; `async`/`await` enable concurrent fan-out patterns.

```kotlin
/** Result wrapper for operations that can fail. */
data class FetchResult(
    val url: String,
    val data: String?,
    val error: Throwable?
) {
    val success: Boolean get() = error == null && data != null
}

/** Processes a list of URLs concurrently using structured concurrency.
 *  Each URL is fetched in parallel with a per-request timeout.
 */
suspend fun fetchUrlsConcurrently(
    urls: List<String>,
    scope: CoroutineScope,
    timeoutMs: Long = 5000
): List<FetchResult> = coroutineScope {
    val results = mutableListOf<FetchResult>()

    for (url in urls) {
        // async starts the fetch; supervisorJob ensures one failure doesn't cancel siblings
        launch(SupervisorJob(scope.coroutineContext[Job] ?: throw IllegalStateException("No parent job"))) {
            try {
                val data = withTimeout(timeoutMs) {
                    fetchData(url)
                }
                results.add(FetchResult(url, data, null))
            } catch (e: TimeoutCancellationException) {
                results.add(FetchResult(url, null, e))
            } catch (e: Exception) {
                results.add(FetchResult(url, null, e))
            }
        }
    }

    // Wait for all launched coroutines to complete
    coroutineContext[Job]!!.children.toList().forEach { it.join() }
    results.toList()
}

/** Simulates an HTTP fetch operation as a suspend function. */
suspend fun fetchData(url: String): String {
    delay(100L)  // Simulates network latency
    return "Response from $url"
}

/** Flow-based stream processing — cold, lazy, and cancellable by design. */
fun processEvents(): Flow<Event> = flow {
    for (i in 1..10) {
        delay(50L)  // Non-blocking delay — frees the thread during wait
        emit(Event(i, "Event #$i"))
    }
}.buffer()  // Prevents backpressure from slow consumers

/** Data class representing a domain event. */
data class Event(val id: Int, val message: String)

/** Collecting a flow with transformation and filtering. */
suspend fun consumeEvents() {
    processEvents()
        .filter { it.id % 2 == 0 }          // Only even IDs
        .map { it.message.toUpperCase() }   // Transform to uppercase
        .collect { println(it) }            // Terminal operation — starts the flow
}
```

**Why this works:**
- `coroutineScope` creates a structured scope that waits for all children before returning
- `SupervisorJob` isolates errors — one failed fetch doesn't cancel all others
- `withTimeout` provides per-request timeout with clean cancellation
- `flow` is lazy (cold) and cancellable — it only runs when collected
- Non-blocking `delay` frees threads during wait periods

---

### Pattern 5: Scope Functions by Intent

Kotlin's five scope functions transform the receiver object in different ways. Choose based on what you need the function to return, not for brevity alone.

```kotlin
/** Demonstrates all five scope functions with their distinct purposes. */
fun demonstrateScopeFunctions() {
    // let: Returns transformed result; idiomatically used for nullable operations
    val name: String? = null
    val defaultName = name?.let { it.toUpperCase() } ?: "Anonymous"
    println("Name: $defaultName")  // Prints "Name: Anonymous"

    // apply: Returns the receiver itself; ideal for configuration blocks
    val config = StringBuilder().apply {
        append("Host: localhost\n")
        append("Port: 8080\n")
        append("Timeout: 30s\n")
    }
    println(config.toString())  // Prints the configured string builder content

    // also: Returns the receiver; used for side effects on an already-configured object
    val list = mutableListOf(1, 2, 3).also {
        println("Initial size: ${it.size}")  // Side effect — print for logging
        it.add(4)                             // Modify
    }

    // run: Returns the lambda result; combines transformation + return value
    val description = listOf("kotlin", "coroutines", "serialization").run {
        this.joinToString(" + ")   // `this` is implicit as receiver
    }
    println("Topics: $description")  // Prints "Topics: kotlin + coroutines + serialization"

    // with: Returns the lambda result; same as run but uses an explicit argument
    val user = User("Bob", 25)
    val summary = with(user) {
        "User($name, $age)"  // `this` refers to the passed object explicitly
    }
    println(summary)  // Prints "User(Bob, 25)"
}

/** Scope function selection guide with real-world patterns. */
context(Logger)
fun createUserSafe(input: Map<String, Any?>): Result<User> = input
    .getValue("name") as? String                    // Smart cast after type check
    ?.let { name ->
        val age = (input["age"] as? Int) ?: 0       // Default with elvis
        User(name, age).also { logger.info("Created user $it") }
    }?.let { Result.success(it) }
    ?: run {
        logger.error("Invalid input for user creation")
        Result.failure(IllegalArgumentException("Missing or invalid name"))
    }
```

**Scope function selection rules:**
| Function | Receiver Access | Return Value | Primary Use |
|----------|----------------|--------------|-------------|
| `let` | `it` (property access) | Lambda result | Nullable operations, transformation |
| `run` | `this` (implicit) | Lambda result | Combining multiple operations on same object |
| `apply` | `this` (implicit) | Receiver object | Configuration blocks |
| `also` | `it` (property access) | Receiver object | Side effects, logging, chaining |
| `with` | `this` (explicit arg) | Lambda result | Same as `run` but receiver is a non-Kotlin argument |

---

## Constraints

### MUST DO

- Use `val` for all variable declarations unless mutation is provably necessary
- Use data classes for value objects that represent domain state — let the compiler generate equals, hashCode, toString, copy, and destructuring
- Define sealed interfaces (or sealed classes within a single file) for finite type hierarchies
- Write exhaustive `when` expressions without `else` branches for sealed types — trust the compiler
- Apply smart casts after `is` checks — never write `obj as Type` when Kotlin already knows the type
- Use `suspend fun` to mark asynchronous operations and always manage coroutine lifecycles with structured concurrency
- Prefer kotlinx.serialization over Jackson or Gson for Kotlin projects — it is cross-platform and generates compile-time safe serializers
- Annotate nullable types explicitly with `T?` at API boundaries (function parameters, return types)
- Use the five scope functions according to their semantics, not arbitrarily

### MUST NOT DO

- Do not use explicit `as` casts for type hierarchies where smart casts apply via `is` checks
- Do not use `!!:` (non-null assertion) when a safer alternative like `?:` or an `if (x != null)` guard exists
- Do not launch coroutines without a coroutine scope — every `launch`, `async`, or `withContext` must be structured under a parent scope
- Do not share mutable state between coroutines without synchronization (`Mutex`, `AtomicReference`, or channel communication)
- Do not use `Thread.sleep` inside suspend functions — always use `delay` which is non-blocking and cancellable
- Do not serialize sealed interfaces with Jackson/Gson unless polymorphic type handling is explicitly configured — kotlinx.serialization handles this natively with `@Serializable` on the sealed interface
- Do not use Kotlin scope functions to hide complex logic — readability always trumps brevity

## Related Skills

| Skill | Purpose |
|-------|---------|
| `kotlin-coroutines-fundamentals` | Deep dive into coroutine dispatchers, cancellation tokens, and flow operators |
| `kotlin-serialization-patterns` | Advanced serialization patterns including polymorphic types, custom serializers, and format plugins |
| `kotlin-context-receivers` | Focused coverage of context receiver design, composition, and migration from extension functions |
| `kotlin-jvm-interop` | Java interoperability patterns including type mapping, exception handling, and performance considerations |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Kotlin 2.x Release Notes](https://kotlinlang.org/docs/whatsnew20.html)
- [Kotlin Standard Library Reference](https://kotlinlang.org/api/core/kotlin-stdlib/)
- [kotlinx.coroutines GitHub Repository](https://github.com/Kotlin/kotlinx.coroutines)
- [kotlinx.serialization GitHub Repository](https://github.com/Kotlin/kotlinx.serialization)
- [Kotlin Multiplatform Documentation](https://kotlinlang.org/docs/multiplatform.html)
