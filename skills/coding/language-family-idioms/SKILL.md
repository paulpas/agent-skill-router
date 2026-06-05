---




name: language-family-idioms
description: Implements idiomatic code patterns for JVM, .NET, TypeScript, and Functional ecosystems — showing the right way to write code in each family using modern language features from 2025–2026.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: JVM idioms, Java records, Kotlin coroutines, C# primary constructors, TypeScript discriminated unions, Elixir GenServer, idiomatic code
  archetypes:
    - tactical
    - generation
  anti_triggers:
    - brainstorming
    - vague ideation
    - cross-language integration
    - language comparison
    - which language to use
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: modern-language-comparison, polyglot-development, polyglot-developer-patterns, framework-selection




---





# Language Family Idioms and Patterns

Senior engineer who writes idiomatic code in each programming language family using the features native to that ecosystem — not porting conventions from one family into another. When loaded, this skill makes the model produce code that follows the established conventions of JVM, .NET, TypeScript, and Functional families as they exist in 2025–2026.

## TL;DR Checklist

- [ ] Select the language family first (JVM, .NET, JS/TS, Functional) before writing any code
- [ ] Use the modern feature set of that family — Java 21+, C# 12+, TS 5.6+, Elixir 1.17+
- [ ] Show a BAD example with the anti-pattern, then a GOOD idiomatic replacement
- [ ] Explain WHY the good version is better in comments
- [ ] Never import OOP conventions into functional families or vice versa
- [ ] Reference the specific feature name (records, primary constructors, discriminated unions, GenServer)

---

## When to Use

Use this skill when:

- Writing code in an unfamiliar language family and you want idiomatic patterns instead of translated conventions from another language
- Reviewing a PR where the author is using another family's anti-patterns (e.g., OOP classes in Elixir, mutable state in F#)
- Setting up a new project scaffold with the right idioms for the chosen language
- Teaching or mentoring developers on what "the right way" looks like in each ecosystem
- Migrating from one language family to another and wanting to avoid carrying over bad habits

---

## When NOT to Use

Avoid this skill for:

- Language selection or benchmark comparison — use `modern-language-comparison` instead
- Cross-language integration, gRPC/Protobuf boundaries, monorepo patterns — use `polyglot-development` instead
- Learning strategies, context-switching management, or translation methods — use `polyglot-developer-patterns` instead
- Framework selection (Spring vs. Quarkus, NestJS vs. Express) — use `framework-selection` instead

---

## Core Workflow

1. **Identify the target language family** — JVM (Java/Kotlin), .NET (C#/F#), JS/TS, or Functional (Erlang/Elixir).
   **Checkpoint:** Confirm the exact language version to select the correct feature set.

2. **Determine the idiomatic approach for the task** — Select patterns native to that family's conventions. Do not port from another family.
   **Checkpoint:** Verify you are using the modern feature set (Java 21+, C# 12+, TS 5.6+, Elixir 1.17+).

3. **Write BAD → GOOD code pairs** — Show the common anti-pattern first, then the idiomatic replacement with inline commentary explaining the difference.
   **Checkpoint:** Each pair must use the same problem domain (same inputs, same expected outputs).

4. **Apply family-specific constraints** — Enforce MUST DO / MUST NOT DO rules from the relevant family section.
   **Checkpoint:** No OOP anti-patterns in functional families, no mutable state where immutability is expected.

---

## Implementation Patterns by Language Family

### Family 1: JVM Languages (Java 21+ / Kotlin)

The JVM ecosystem has shifted toward value types, immutable data carriers, and structured concurrency. Java uses records for data carriers and sealed classes for type hierarchies. Kotlin leverages extension functions, data classes, and coroutines for asynchronous code.

#### Modern Java: Records + Sealed Classes vs. Verbose POJOs

```java
// ❌ BAD — Verbose POJO hierarchy with manual equals/hashCode/toString, mutable fields
sealed abstract class PaymentResult permits PaymentResult.Success, PaymentResult.Failure {
    private final String id;

    protected PaymentResult(String id) { this.id = id; }

    public String getId() { return id; }
    // ❌ Must manually write equals(), hashCode(), toString() — boilerplate and error-prone
}

final class Success extends PaymentResult {
    private final BigDecimal amount; // mutable!
    private String transactionId;   // mutable!
    // ❌ Manual setter methods expose mutability
    public void setTransactionId(String id) { this.transactionId = id; }
}

// ❌ BAD — instanceof + cast pattern matching (pre-Java 16 style)
if (result instanceof PaymentResult.Success) {
    PaymentResult.Success s = (PaymentResult.Success) result; // unsafe cast, verbose
    System.out.println(s.getAmount());
}
```

```java
// ✅ GOOD — Record as data carrier + sealed interface for type hierarchy
record PaymentId(String value) {}

sealed interface PaymentResult permits PaymentResult.Success, PaymentResult.Failure {
    record Success(PaymentId id, BigDecimal amount, String transactionId) implements PaymentResult {}
    record Failure(PaymentId id, String reason) implements PaymentResult {}
}

// ✅ GOOD — Pattern matching with instanceof (Java 16+) AND pattern matching in switch (Java 21+)
if (result instanceof PaymentResult.Success s) { // type check + cast in one
    System.out.println(s.amount()); // immutable access, no getter ceremony
}

// ✅ GOOD — Exhaustive pattern matching in switch expression (Java 21+)
String message = switch (result) {
    case PaymentResult.Success(var id, var amount, _) ->
        "Payment %s succeeded: $%s".formatted(id.value(), amount);
    case PaymentResult.Failure(var id, var reason) ->
        "Payment %s failed: %s".formatted(id.value(), reason);
}; // ✅ compiler enforces exhaustiveness — no missing cases
```

#### Kotlin: Data Classes + Extension Functions vs. Java-style Templates

```kotlin
// ❌ BAD — Java-style template class with manual boilerplate
class User(val id: String, var name: String, var email: String) {
    // ❌ var fields are mutable by default — easy to corrupt state
    // ❌ Must manually implement equals/hashCode/toString or use IDE generation
    override fun equals(other: Any?): Boolean { ... }
    override fun hashCode(): Int { ... }
    override fun toString(): String = "User($id, $name, $email)"
}

// ❌ BAD — Helper function attached to a utility class (Java static methods)
object EmailUtils {
    fun validate(email: String): Boolean { ... }
    fun mask(email: String): String { ... }
}
EmailUtils.validate(input) // ❌ procedural, breaks method chaining

// ❌ BAD — Callback hell or raw Thread usage
fun fetchUser(id: String): User { ... } // blocks the thread!
val user = fetchUser("1")
processUser(user)
```

```kotlin
// ✅ GOOD — Data class gives you value semantics for free
data class User(
    val id: String,
    val name: String,
    val email: String
) // ✅ auto-generates equals(), hashCode(), toString(), copy(), componentN()

val original = User("1", "Alice", "alice@example.com")
val updated = original.copy(name = "Alice Smith") // ✅ immutable update via copy()

// ✅ GOOD — Extension functions that read like natural language
fun String.validateEmail(): Boolean =
    Regex("^[\\w-.]+@[\\w-]+\\.[a-zA-Z]{2,}$").matches(this)

fun String.maskEmail(): String {
    val parts = split("@")
    return if (parts.size == 2) "${parts.first().first()}***@${parts[1]}" else this
}

// ✅ GOOD — Chained idiomatic usage
val email = "alice@example.com"
if (email.validateEmail()) {
    println(email.maskEmail()) // outputs: a***@example.com
}

// ✅ GOOD — Coroutine-based async with structured concurrency
import kotlinx.coroutines.*

suspend fun fetchUser(id: String): User { ... } // suspends without blocking a thread

fun main() = runBlocking {
    val user = fetchUser("1")       // ✅ non-blocking suspend point
    processUser(user)               // ✅ sequential, readable code
}

// ✅ GOOD — Concurrent operations with async/await pattern
suspend fun fetchDashboard(userId: String): Dashboard = coroutineScope {
    val userDeferred = async { fetchUser(userId) }
    val preferencesDeferred = async { fetchPreferences(userId) }
    val activityDeferred = async { fetchActivity(userId) }

    Dashboard(
        user = userDeferred.await(),
        preferences = preferencesDeferred.await(),
        activity = activityDeferred.await()
    )
} // ✅ all three run concurrently; coroutineScope ensures cancellation propagation
```

---

### Family 2: .NET Languages (C# 12+ / F#)

.NET has embraced concise syntax with primary constructors, required members, collection expressions, and pattern matching. F# provides a pure functional alternative with pipeline operators, active patterns, and immutable-by-default semantics.

#### C#: Primary Constructors + Required Members vs. Verbose Property Patterns

```csharp
// ❌ BAD — Verbose property declarations, no compile-time guarantees on required fields
public class Order
{
    // ❌ Requires manual null checks in constructor or at every access point
    public string OrderId { get; set; } = default!;
    public decimal Total { get; set; }
    public DateTime OrderedAt { get; set; }
    public List<OrderItem> Items { get; set; } = new();

    // ❌ Manual equality comparison needed for value semantics
    public override bool Equals(object? obj) => ...
}

// ❌ BAD — Verbose LINQ with anonymous types (less readable than method chain)
var result = from o in orders
             where o.Total > 100
             select new { o.OrderId, o.Total };
```

```csharp
// ✅ GOOD — Primary constructor + required members (C# 12+)
public record Order(
    string OrderId,              // primary ctor param = readonly property
    decimal Total,
    DateTime OrderedAt,
    List<OrderItem> Items        // collection expression init below
);

// ✅ GOOD — Required properties with compile-time enforcement
public class ShippingAddress(
    required string Street,       // ✅ compiler error if omitted at construction
    required string City,
    string? Apartment = null      // optional via default value
)
{
    public string Street { get; init; } = Street;
    public string City { get; init; } = City;
    public string? Apartment { get; init; } = Apartment;
}

var address = new ShippingAddress { Street = "123 Main", City = "Boston" };
// var bad = new ShippingAddress { City = "Boston" }; // ❌ CS9035: Required member 'Street' must be set

// ✅ GOOD — Collection expressions (C# 12)
int[] primes = [2, 3, 5, 7, 11, 13];       // concise array literal
List<string> tags = ["java", "csharp", "go"]; // collection expression → List

// ✅ GOOD — Pattern matching with deconstruction (C# 7+ evolved in C# 12)
(string City, string State) GetLocation(Customer c) => (c.City, c.State);

var customer = new Customer("Alice", "Boston", "MA");
if (GetLocation(customer) is ("Boston", "MA")) // ✅ matches tuple via deconstruction
    Console.WriteLine("Local customer");

// ✅ GOOD — Query comprehension with type inference + collection expressions
var highValueOrders = [.. orders.Where(o => o.Total > 100)
                           .OrderByDescending(o => o.Total)
                           .Select(o => o.OrderId)];
```

#### F#: Functional Pipelines vs. Imperative Loops

```fsharp
// ❌ BAD — Imperative style in F# (works, but fights the language)
let processCustomers customers =
    let mutable results = []
    for c in customers do
        if c.IsActive && c.TotalSpent > 100m then
            let name = c.Name.ToUpper()
            results <- results @ [name] // ❌ list concatenation is O(n) per append!
    results
```

```fsharp
// ✅ GOOD — Pipeline operator |> with immutable collections (F# idiomatic)
let processCustomers customers =
    customers
    |> List.filter (fun c -> c.IsActive && c.TotalSpent > 100m)
    |> List.map (fun c -> c.Name.ToUpper()) // ✅ O(1) cons-based list construction
    |> List.sortDescending                  // ✅ composable pipeline stages

// ✅ GOOD — Active patterns for multi-case pattern matching
let (|IsPremium|IsStandard|) customer =
    if customer.TotalSpent > 500m then IsPremium
    else IsStandard

let classifyCustomer c =
    match c with
    | IsPremium -> sprintf "%s is a VIP customer" c.Name
    | IsStandard -> sprintf "%s is a standard customer" c.Name

// ✅ GOOD — Result pipeline for error handling (no exceptions)
type OrderResult =
    | Valid of order: Order
    | Invalid of errors: string list

let validateOrder (order: Order): OrderResult =
    match order.Total > 0m, order.Items.Length > 0 with
    | true, true -> Valid order
    | false, _ -> Invalid ["Total must be positive"]
    | _, false -> Invalid ["Must have at least one item"]

let processOrder (order: Order) =
    validateOrder order
    |> Result.map (fun o -> sprintf "Processing order %s" o.OrderId)
    |> Result.mapError (fun errs -> String.concat "; " errs)
// ✅ Either "Processing order..." or an error string — no try/catch needed

// ✅ GOOD — Record types for immutable data (F# default)
type Customer = {
    Id: Guid
    Name: string
    Email: string
    IsActive: bool
}

let updateCustomerName customer newName =
    { customer with Name = newName } // ✅ creates a new record, original unchanged
```

---

### Family 3: JavaScript / TypeScript Ecosystem

The JS/TS ecosystem values structural typing, immutability through functional patterns, and async iteration. TypeScript 5.6+ brings refined branded types, discriminated unions for state machines, and improved template literal types. Node.js streaming patterns replace callback hell with async iterators.

#### TypeScript: Branded Types + Discriminated Unions vs. Plain Interfaces

```typescript
// ❌ BAD — Plain string/number types are structurally identical and interchangeable
interface UserId { value: string }
interface PostId { value: string }

function getPost(userId: UserId): PostId { ... }
const postId: PostId = { value: "abc123" };
getPost(postId); // ❌ Compiles! UserId and PostId are structurally identical

// ❌ BAD — Callback hell with nested async operations
function fetchOrderHistory(userId: string, callback: (err: any, result: any) => void) {
    getUser(userId, (err, user) => {
        if (err) return callback(err);
        getOrders(user.orgId, (err2, orders) => {
            if (err2) return callback(err2);
            getOrderDetails(orders.map(o => o.id), (err3, details) => {
                if (err3) return callback(err3);
                getCustomerFeedback(userId, (err4, feedback) => {
                    callback(null, { orders: details, feedback });
                });
            });
        });
    });
}
```

```typescript
// ✅ GOOD — Branded types (nominal typing via intersection with unique symbol)
type Brand<T, B> = T & { __brand: B };

type UserId = Brand<string, "UserId">;
type PostId = Brand<string, "PostId">;

function userId(value: string): UserId {
    return value as UserId; // ✅ single assertion at the boundary
}

function getPost(userId: UserId): PostId { ... }

const postId: PostId = { value: "abc123", __brand: "PostId" };
getPost(postId); // ❌ TypeScript error! UserId ≠ PostId

// ✅ GOOD — Discriminated union for finite state machine
type AppState =
    | { status: "idle" }
    | { status: "loading"; progress: number }
    | { status: "success"; data: string }
    | { status: "error"; error: { code: number; message: string } };

function renderApp(state: AppState): string {
    switch (state.status) {
        case "idle":
            return "Ready to start";
        case "loading":
            return `Loading... ${state.progress}%`; // ✅ state.progress is guaranteed number
        case "success":
            return `Data loaded: ${state.data}`;     // ✅ state.data is guaranteed string
        case "error":
            return `Error ${state.error.code}: ${state.error.message}`;
    }
}
// ✅ Exhaustiveness check — add a new variant and compiler flags all unmatched locations
function _assertNever(state: AppState): never {
    throw new Error(`Unexpected state: ${JSON.stringify(state)}`);
}

// ✅ GOOD — Async/await with proper error handling and typed responses
async function fetchOrderHistory(userId: string): Promise<OrderHistory> {
    const user = await getUser(userId);
    const orders = await getOrders(user.orgId);
    const details = await Promise.all(orders.map(id => getOrderDetails(id)));
    const feedback = await getCustomerFeedback(userId);

    return { orders: details, feedback };
}

// ✅ GOOD — Async iteration for streaming data processing (Node.js)
import { pipeline } from "node:stream/promises";
import { createReadStream, createWriteStream } from "node:fs";

async function processLargeFile(inputPath: string, outputPath: string): Promise<void> {
    const read = createReadStream(inputPath, { encoding: "utf-8" });
    const write = createWriteStream(outputPath, { encoding: "utf-8" });

    // ✅ pipeline auto-handles backpressure, cleanup, and errors
    await pipeline(
        read,
        async function* (source) {
            for await (const chunk of source) {
                yield transformChunk(chunk); // ✅ async transformer in the pipeline
            }
        },
        write
    );
}

// ✅ GOOD — Template literal types for route matching (TypeScript 4.1+)
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";
type Route<Suffix extends string> = `${HttpMethod} /api/${Suffix}`;

const getRoute: Route<"users/:id"> = "GET /api/users/:id";
// const badRoute: Route<"users/:id"> = "PATCH /api/users/:id"; // ❌ Type error!
```

---

### Family 4: Functional Languages (Erlang / Elixir)

Functional families treat immutability and message passing as foundational, not optional. Elixir on the BEAM virtual machine uses OTP supervision trees and GenServer processes for fault-tolerant systems. State is managed through message-passing actors, not mutable fields.

#### Elixir: GenServer + Supervision Trees vs. Mutable State

```elixir
# ❌ BAD — Trying to use mutable state or a plain function module as a process
defmodule BadCounter do
    @counter 0  # ❌ This is compile-time constant, NOT mutable state

    def increment do
        # ❌ No persistent state across calls; every invocation starts at 0
        @counter + 1
    end

    # ❌ Attempting to "share" state via module attribute — doesn't work in BEAM
    def get do
        @counter
    end
end

# ❌ BAD — No supervision tree; a crash means total loss of state
# defmodule MyApp do
#     use Application
#     def start(_type, _args) do
#         # ❌ Starting GenServer directly with no supervisor
#         Counter.start_link(0)
#     end
# end

# ❌ BAD — Trying to mutate a map (Elixir maps are immutable; this creates confusion)
defmodule InventoryBad do
    def bad_update(inventory, item, qty) do
        # ❌ This does NOT modify inventory in place! Must rebind:
        inventory = Map.put(inventory, item, Map.get(inventory, item, 0) + qty)
        # ✅ Works but verbose and error-prone with missing keys
    end
end
```

```elixir
# ✅ GOOD — GenServer with proper state management and fault tolerance
defmodule Counter do
    use GenServer

    # --- Public API ---
    @spec start_link(non_neg_integer()) :: GenServer.on_start()
    def start_link(initial_value \\ 0) do
        GenServer.start_link(__MODULE__, initial_value, name: __MODULE__)
    end

    @spec increment(GenServer.server(), non_neg_integer()) :: :ok | {:error, term()}
    def increment(server, amount \\ 1) when is_integer(amount) and amount > 0 do
        GenServer.call(server, {:increment, amount})
    end

    @spec get(GenServer.server()) :: {:ok, non_neg_integer()} | {:error, term()}
    def get(server) do
        GenServer.call(server, :get)
    end

    # --- GenServer Callbacks ---
    @impl true
    def init(initial_value) when is_integer(initial_value) and initial_value >= 0 do
        {:ok, initial_value}
    end

    @impl true
    def handle_call({:increment, amount}, _from, state) do
        new_state = state + amount
        {:reply, :ok, new_state}
    end

    @impl true
    def handle_call(:get, _from, state) do
        {:reply, {:ok, state}, state}
    end

    @impl true
    def terminate(_reason, _state) do
        # ✅ Cleanup resources if needed on shutdown
        :ok
    end
end

# Usage:
{:ok, _pid} = Counter.start_link(0)
Counter.increment(self(), 5)
{ok, value} = Counter.get(self()) # value = 5
# ✅ State persists in the GenServer process; multiple callers share it safely

# ✅ GOOD — Proper OTP supervision tree (Elixir 1.17+ style)
defmodule MyApp.Application do
  use Application

  def start(_type, _args) do
    children = [
      # ✅ Counter is supervised — if it crashes, supervisor restarts it with initial value
      {Counter, 0},
      # ✅ Other processes under the same supervisor tree
      {Registry, keys: :unique, name: MyApp.Registry}
    ]

    opts = [
      strategy: :one_for_one,    # ✅ Restart only the crashed process
      name: MyApp.Supervisor
    ]

    Supervisor.start_link(children, opts)
  end
end

# ✅ GOOD — Immutable data manipulation with pattern matching and Map.update!
defmodule Inventory do
    # ✅ GOOD — Pattern matching + Map.update!/3 for clean immutable updates
    def good_update(inventory, item, qty) do
        inventory
        |> Map.update!(item, fn current -> current + qty end)
        # ✅ Raises KeyError if item doesn't exist (fail-fast for unexpected state)

        # Or use Map.update/4 for safe handling:
        # |> Map.update(item, qty, &(&1 + qty))  # defaults to 0 if missing
    end
end

# ✅ GOOD — Immutable data cascading with struct-based records
defmodule Product do
    defstruct [:sku, :name, :price, :stock] :: [sku: String.t(), name: String.t(), price: Decimal.t(), stock: non_neg_integer()]

    # ✅ Immutable update via struct construction
    def restock(%Product{sku: sku} = product, quantity) do
        %Product{product | stock: product.stock + quantity}
    end

    def price_change(%Product{sku: sku} = product, new_price) when is_struct(product, Product) do
        %{product | price: new_price}
    end
end

# Usage with pattern matching for immutability
product = %Product{sku: "ABC", name: "Widget", price: Decimal.new("9.99"), stock: 100}
restocked = Product.restock(product, 50)
# product.stock is still 100 ✅ immutable!
# restocked.stock is 150 ✅ new struct created

# ✅ GOOD — Enum/LazyEnum for lazy pipeline transformations (memory efficient)
defmodule DataProcessor do
    def process_large_dataset(file_path) do
        file_path
        |> File.stream!()                    # ✅ Lazy: reads line-by-line, no full file in memory
        |> Stream.map(&String.trim/1)         # ✅ Pipeline transformation
        |> Stream.filter(&(not String.contains?(&1, "#"))) # ✅ Skip comments
        |> Enum.map(&parse_record/1)           # ✅ Materialize at the end (terminal operation)
        |> Enum.group_by(& &1.category)       # ✅ Group results
    end

    defp parse_record(line) do
        line |> String.split(",") |> build_record()
    end

    defp build_record([sku, name, price, stock]), do: %Product{sku: sku, name: name, price: Decimal.new(price), stock: String.to_integer(stock)}
    defp build_record(_), do: nil
end
```

---

## Constraints

### JVM Languages — MUST DO
- Use `record` for immutable data carriers; prefer `sealed interface` over deep class hierarchies
- Use pattern matching in `switch` expressions (Java 21+) instead of if/else chains
- In Kotlin, declare properties as `val` by default; use `var` only when mutability is required
- Use coroutine `suspend` functions for async; never block a dispatcher thread with blocking calls
- Prefer immutable collections (`List.of()`, `Set.of()`) over mutable ones

### JVM Languages — MUST NOT DO
- ❌ Do not write manual `equals()`, `hashCode()`, and `toString()` on value objects when `record` suffices
- ❌ Do not use `Thread.sleep()` or raw `Thread` objects in Kotlin; use coroutines or structured concurrency
- ❌ Do not pass mutable objects between components expecting immutability

### .NET Languages — MUST DO
- Use primary constructors for concise type declarations (C# 12+)
- Mark required parameters with the `required` modifier for compile-time safety
- Use collection expressions `[...]` for array and collection literals
- Prefer F# pipelines (`|>`) over imperative loops; embrace immutability as the default

### .NET Languages — MUST NOT DO
- ❌ Do not use verbose property getters/setters when primary constructor params suffice
- ❌ Do not mix mutable state into F# data types unless absolutely necessary
- ❌ Do not use LINQ query syntax when method-chain syntax is clearer (or vice versa — pick one style per codebase)

### TypeScript/JavaScript — MUST DO
- Use discriminated unions for finite state machines; never use string literals or booleans for state
- Apply branded types at API boundaries to prevent mixing structurally identical types
- Use async/await with typed return values; never leave callbacks nested
- Use `pipeline()` from `node:stream/promises` for streaming data processing

### TypeScript/JavaScript — MUST DO
- ❌ Do not use `any` type; prefer `unknown` when the type is truly undetermined
- ❌ Do not mutate state directly in React-style code; use functional updates or immutable patterns
- ❌ Do not nest async callbacks; always lift to top-level async/await

### Erlang/Elixir — MUST DO
- Always run GenServer processes under a supervision tree; never start them bare
- Use pattern matching for data extraction; never access struct fields via string keys
- Treat all data as immutable; use Map.update!/3 and struct construction for updates
- Use `File.stream!()` with lazy pipelines for large files; never read entire files into memory

### Erlang/Elixir — MUST NOT DO
- ❌ Do not use module attributes as mutable state; they are compile-time constants
- ❌ Do not use try/rescue for control flow; use pattern matching on Result-like tuples
- ❌ Do not spawn processes without supervision trees (the "let it crash" philosophy requires supervisors)

---

## Output Template

When this skill is active, the model's output must contain:

1. **Family identification** — State which language family is being targeted (e.g., "JVM Languages (Java 21+)")
2. **BAD example** — A complete, runnable code snippet showing the anti-pattern with inline `// ❌ BAD` comments explaining WHY it is wrong for that family
3. **GOOD example** — A complete, runnable replacement demonstrating the idiomatic approach with `// ✅ GOOD` commentary explaining WHY it is better
4. **Feature names** — Reference the specific modern feature being used (e.g., "records", "primary constructors", "discriminated unions", "GenServer")
5. **Constraint note** — One sentence referencing which MUST DO / MUST NOT DO rule applies

---

## Related Skills

| Skill | Purpose |
|---|---|
| `modern-language-comparison` | Benchmark comparison and language selection decisions before committing to a family |
| `polyglot-development` | Cross-language integration, monorepo patterns, gRPC/Protobuf boundaries between families |
| `polyglot-developer-patterns` | Learning strategies for building fluency across multiple language families |
| `framework-selection` | Choosing specific frameworks within a family (e.g., Quarkus vs. Spring Boot in JVM) |

---

## Live References

> Authoritative documentation links for each language family covered by this skill. These references are resolved at load time to provide additional context on modern features and idiomatic patterns.

- [Java 24 Language Specification — Records and Sealed Classes](https://docs.oracle.com/en/java/javase/24/language/records-and-sealed-classes.html)
- [Kotlin Documentation — Data Classes, Extension Functions, Coroutines](https://kotlinlang.org/docs/data-classes.html)
- [C# 13 Language Specification — Primary Constructors, Required Members](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/proposals/csharp-12.0/primary-constructors)
- [F# Official Guide — Pipeline Operator and Active Patterns](https://learn.microsoft.com/en-us/dotnet/fsharp/tutorials/functions/)
- [TypeScript 5.6 Release Notes — Branded Types, Discriminated Unions](https://devblogs.microsoft.com/typescript/announcing-typescript-5-6/)
- [Elixir 1.17 Documentation — GenServer and OTP Supervision Trees](https://hexdocs.pm/elixir/GenServer.html)
- [BEAM VM Architecture — Process Model and Fault Tolerance](https://www.erlang.org/doc/design_principles/intro.html)
