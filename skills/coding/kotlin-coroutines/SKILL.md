---
name: kotlin-coroutines
description: Implements Kotlin coroutine patterns including structured concurrency, Flow APIs, dispatcher management, cancellation handling, and test-driven async development for production-grade concurrent applications.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: kotlin coroutines, structured concurrency, coroutine scope, SupervisorJob, Flow API, StateFlow, kotlinx-coroutines
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: async-programming, testing-best-practices, error-handling-patterns
---

# Kotlin Concurrency Engineer

When this skill loads, the model implements concurrent and asynchronous Kotlin applications using kotlinx-coroutines. The model designs coroutine scopes with structured concurrency via SupervisorJob, selects appropriate dispatchers (IO, Default, Main), builds reactive streams with Flow APIs, and writes production-grade cancellation-aware async code. When testing is involved, the model applies `runTest` with TestDispatcher patterns for deterministic concurrent test execution.

## TL;DR Checklist

- [ ] Always scope coroutines to a lifecycle-aware CoroutineScope — never launch bare coroutines without a Job parent
- [ ] Use `SupervisorJob()` instead of `Job()` when child failures should not cancel sibling tasks; use plain `Job()` when any failure cancels the entire tree
- [ ] Select `Dispatchers.IO` for blocking I/O, `Dispatchers.Default` for CPU-bound work, and `Dispatchers.Main` for Android/JavaFX UI updates — never use `Unconfined` in production
- [ ] Prefer `async { }.awaitAll()` over individual `launch + await` calls when fan-out patterns are needed — it aggregates all errors instead of failing fast
- [ ] Use `StateFlow` for state that consumers read at any time, and `SharedFlow` for one-time events or replayable commands — never expose MutableStateFlow publicly
- [ ] Test coroutines with `runTest { }` from kotlinx-coroutines-test and inject `TestDispatcher` via `StandardTestDispatcher` — never use `runBlocking` in unit tests
- [ ] Propagate cancellation through structured concurrency — never catch `CancellationException` as a normal error; rethrow it after cleanup

---

## When to Use

Use this skill when:

- Implementing Android UI thread async operations — background work with UI updates must use Dispatchers.Main and lifecycle-aware scopes
- Parallelizing network calls using structured concurrency (e.g., fetching user profile, settings, and notifications simultaneously before rendering a screen)
- Building reactive data streams with `Flow` for real-time UI updates, database change listeners, or event-driven architecture
- Writing suspending functions that perform I/O-bound work — database queries, HTTP requests, file operations
- Designing background processing services that need reliable cancellation and structured task grouping

---

## When NOT to Use

Avoid this skill for:

- **Pure synchronous logic** — If the function does no I/O, waits on nothing, and can run entirely in one frame, a regular function is simpler and faster
- **CPU-bound heavy computation with no I/O interleaving** — While `Dispatchers.Default` can handle this, large-scale numeric computation may benefit from native threading via JNI or specialized libraries like ND4J/arrow2d
- **Simple scripts or CLI tools** — Single-threaded sequential code gains nothing from coroutine machinery; add complexity only when it solves a real problem

---

## Core Workflow

### Step 1: Choose Coroutine Scope & Job Type

Every coroutine must belong to a `CoroutineScope`. The scope defines the lifecycle and parent Job, which controls cancellation propagation.

```kotlin
import kotlinx.coroutines.*

// ✅ GOOD — Lifecycle-aware scope for Android (ViewModel)
class MyViewModel : ViewModel() {
    // SupervisorJob means child failures don't cancel sibling coroutines
    private val viewModelScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    
    fun loadData(userId: String) {
        viewModelScope.launch {
            try {
                val profile = userRepository.fetchProfile(userId)
                _uiState.value = UiState.Success(profile)
            } catch (e: Exception) {
                _uiState.value = UiState.Error(e.message ?: "Unknown error")
            }
        }
    }
    
    override fun onCleared() {
        super.onCleared()
        // SupervisorJob cancels all children automatically when scope is cancelled
        viewModelScope.cancel()
    }
}

// ✅ GOOD — Application-level scope with explicit lifecycle
class ApplicationService {
    private val job = SupervisorJob()
    private val scope = CoroutineScope(job + Dispatchers.Default)
    
    fun startBackgroundWork() {
        scope.launch {
            while (isActive) {
                doPeriodicCleanup()
                delay(CLEANUP_INTERVAL_MILLIS)
            }
        }
        
        scope.launch {
            while (isActive) {
                monitorHeartbeat()
                delay(HEARTBEAT_INTERVAL_MILLIS)
            }
        }
    }
    
    fun shutdown() {
        job.cancel() // Cancels ALL child coroutines — structured concurrency in action
        runBlocking { job.join() } // Wait for graceful completion
    }
}

// Job vs SupervisorJob decision:
// - Use Job(): Any child failure cancels the entire tree (useful when one failure means the whole operation is invalid)
// - Use SupervisorJob(): Child failures are isolated — siblings continue running (useful for independent parallel tasks)
val job = Job()                           // Failure in child A → cancels B, C, D
val supervisor = SupervisorJob()          // Failure in child A → B, C, D keep running

```

### Step 2: Select Dispatcher Wisely

Dispatchers determine which thread pool a coroutine runs on. The wrong dispatcher choice causes UI jank, database connection exhaustion, or main-thread blocking.

```kotlin
// Dispatchers.IO — Designed for blocking I/O operations
// Internal thread pool uses lazy creation with a default of ~64 threads (capped at min(128, CPU cores * 2))
val ioScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

fun fetchUserData(userId: String): User {
    // This suspends without blocking a platform thread — coroutine mechanism handles it
    return databaseRepository.findById(userId)
}

// ✅ GOOD — Custom dispatcher with bounded threads for resource-critical I/O
val customIoDispatcher = Executors.newFixedThreadPool(10) {
    Thread(it, "custom-io-worker").apply { isDaemon = true }
}.asCoroutineDispatcher()

// Use the custom dispatcher when you need tighter control over concurrency limits
val scoped = CoroutineScope(SupervisorJob() + customIoDispatcher)

// Dispatchers.Default — CPU-bound work
// Internal pool size equals Runtime.getRuntime().availableProcessors()
val defaultScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

fun processLargeDataset(data: List<Record>): Summary {
    return defaultScope.coroutineContext.withTimeoutOrNull(30_000) {
        data.asSequence()
            .filter { it.isValid }
            .map { transform(it) }
            .groupBy { it.category }
            .mapValues { (_, items) -> Summary(items.sumOf { it.value }, items.count()) }
    } ?: throw TimeoutCancellationException("Processing exceeded 30 seconds")
}

// Dispatchers.Main — UI thread (Android or JavaFX via kotlinx-coroutines-javafx)
fun updateUI(result: Data) {
    MainScope().launch {
        // This runs on the Android main thread — safe for UI updates
        binding.resultText.text = result.formattedString
        binding.progressBar.visibility = View.GONE
    }
}

// ❌ BAD — Unconfined dispatcher (never use in production)
// Runs on whatever thread initiated the call, then resumes on whatever thread 
// completes the suspending function. This creates unpredictable threading behavior.
fun badExample() {
    GlobalScope.launch(Dispatchers.Unconfined) {
        println("Running on: ${Thread.currentThread().name}") // Unpredictable!
        someRepository.fetchData()
        println("Resumed on: ${Thread.currentThread().name}")  // Could be different thread!
    }
}

// ✅ GOOD — Always use named dispatchers with explicit naming for debugging
fun goodExample() {
    val dispatcher = Dispatchers.IO.limitedParallelism(20, name = "data-fetcher")
    CoroutineScope(SupervisorJob() + dispatcher).launch {
        fetchAndProcessData()
    }
}

```

### Step 3: Launch Concurrent Work with Proper Patterns

Choose between `launch` (fire-and-forget) and `async` (returns a Deferred result) based on whether you need the computation result.

```kotlin
// ✅ GOOD — launch for fire-and-forget tasks
fun startNotifications(scope: CoroutineScope) {
    scope.launch {
        // No return value needed — just side effects
        notificationService.pushUpdates()
    }
}

// ✅ GOOD — async/await for computed results from a single source
suspend fun getUserDashboard(userId: String): Dashboard {
    return async(Dispatchers.IO) {
        userRepository.findById(userId)
    }.await()
}

// ✅ GOOD — Fan-out with async { }.awaitAll() — aggregates ALL errors, not just the first
suspend fun fetchUserDashboardComprehensive(userId: String): Dashboard {
    val fetches = listOf(
        async { userRepository.findById(userId) },
        async { orderRepository.recentOrders(userId) },
        async { notificationService.pendingNotifications(userId) },
        async { preferencesRepository.loadPreferences(userId) }
    )
    
    // awaitAll() collects results from ALL deferreds. If any fail, it aggregates
    // all exceptions (not just the first one), enabling better diagnostic information.
    return try {
        val results = fetches.awaitAll()
        Dashboard(
            user = results[0] as User,
            orders = results[1] as List<Order>,
            notifications = results[2] as List<Notification>,
            preferences = results[3] as Preferences
        )
    } catch (e: Exception) {
        // e is a CompositeException if multiple coroutines failed simultaneously
        log.error("Dashboard fetch failed", e)
        Dashboard.empty(userId)
    }
}

// ✅ GOOD — Fan-out with timeout and selective results
suspend fun fetchWithPartialResults(timeoutMs: Long, userIds: List<String>): Map<String, UserProfile> {
    val startTime = System.currentTimeMillis()
    
    // Collect all async operations
    val deferredMap = userIds.associateWith { id ->
        async(Dispatchers.IO) {
            userRepository.findById(id)
        }
    }
    
    // Wait up to timeoutMs for any result — process as they complete
    val results = mutableMapOf<String, UserProfile>()
    val pending = deferredMap.values.toMutableSet()
    
    while (pending.isNotEmpty()) {
        // Check if we've exceeded the overall timeout
        if (System.currentTimeMillis() - startTime > timeoutMs) break
        
        // Wait for at least one completion
        val completed = withTimeoutOrNull(1000) {
            pending.firstNotNullOfOrNull { it.await() to it }?.second
        } ?: break
        
        completed?.let { results[it] = it.await() }
        pending -= completed!!
    }
    
    return results
}

```

### Step 4: Implement Flow for Reactive Streams

Flow is Kotlin's cancellation-aware, cold async stream type. Use `flow {}` to build streams, operators to transform them, and collectors to consume them.

```kotlin
import kotlinx.coroutines.flow.*

// ✅ GOOD — Basic flow builder with explicit exception handling
fun createUserEventsFlow(userId: String): Flow<UserEvent> = flow {
    val stream = databaseRepository.observeUserChanges(userId)
    
    for (change in stream) {
        // flow {} automatically handles cancellation — the for loop is suspension-aware
        if (change.type == ChangeType.DELETED) {
            emit(UserEvent.Deleted(change.recordId))
            return@flow  // Cancel the flow after deletion event
        }
        
        try {
            val transformed = transformEvent(change, userId)
            emit(transformed)
        } catch (e: TransformationException) {
            log.warn("Failed to transform event", e)
            emit(UserEvent.Error(change.recordId, e.message ?: "Transform failed"))
        }
    }
}.catch { e ->
    // catch{} is the Flow equivalent of try-catch — runs when upstream emits an error
    log.error("User events stream error", e)
    emit(UserEvent.StreamError(e))
}

// ✅ GOOD — Chaining operators for reactive pipeline
fun processOrderEvents(orderFlow: Flow<OrderEvent>): Flow<ProcessedResult> = orderFlow
    .filter { it.isValid() }              // Filter out malformed events
    .map { transform(it) }                // Transform each event
    .buffer(Channel.BUFFERED)             // Prevent backpressure from slowing consumers
    .flatMapMerge(4) {                    // Process up to 4 in parallel, merge as complete
        async(Dispatchers.Default) { 
            computeResult(it) 
        }
    }
    .conflate()                           // Drop intermediate values if consumer is slow
    .distinctUntilChanged { it.orderId }   // Deduplicate by order ID

// ✅ GOOD — StateFlow for mutable state that consumers always read the current value of
class SearchViewModel : ViewModel() {
    private val _searchState = MutableStateFlow(SearchState.Idle)
    
    // Expose immutable StateFlow publicly — external code can only READ, never WRITE
    val searchState: StateFlow<SearchState> = _searchState.asStateFlow()
    
    fun search(query: String) {
        viewModelScope.launch {
            _searchState.value = SearchState.Loading
            try {
                val results = searchRepository.query(query)
                _searchState.value = SearchState.Success(results)
            } catch (e: Exception) {
                _searchState.value = SearchState.Error(e.message ?: "Search failed")
            }
        }
    }
}

// ✅ GOOD — SharedFlow for one-shot events and replayable commands
class EventBus {
    private val _commandChannel = MutableSharedFlow<Command>(replay = 0)
    
    // replay = 0: consumers only get events emitted AFTER they subscribe (one-shot)
    // replay > 0: new subscribers receive the last N events (e.g., replay = 1 for latest)
    val commandChannel: SharedFlow<Command> = _commandChannel
    
    suspend fun sendCommand(command: Command) {
        _commandChannel.emit(command)
    }
    
    suspend fun broadcastToMultiple(command: Command): Result<Unit> = runCatching {
        // emitAll allows emitting multiple values at once (useful for batch operations)
        _commandChannel.emitAll(
            flowOf(command).onEach { log.info("Broadcasting command: $it") }
        )
    }
}

// Backpressure strategies with buffer() and channel types:
fun createBackpressuredFlow(): Flow<Int> = (1..10000).asSequence().flow(Dispatchers.Default)
    .buffer(Channel.UNLIMITED)     // No backpressure — buffers all items (memory risk)
    // .buffer(Channel.BUFFERED, 64) // Default: buffers up to 64, then applies backpressure
    // .buffer(0)                    // Synchronous — producer waits until consumer is ready
    // .conflated()                  // Drop intermediate values, keep only latest

// ✅ GOOD — Combine multiple flows with zip (waits for all, emits when any new value)
fun mergeUserAndOrderStreams(userId: String): Flow<UserOrderSnapshot> {
    return combine(
        userRepository.observeById(userId).distinctUntilChanged(),
        orderRepository.observeByUserId(userId),
        ::UserOrderSnapshot
    )
}

```

### Step 5: Handle Errors & Cancellation Correctly

Cancellation and error handling in coroutines follow structured concurrency rules. `CancellationException` is special — it signals intentional cancellation, not a runtime error.

```kotlin
// ✅ GOOD — Try-catch with proper cancellation awareness
suspend fun processWithCleanup(data: Data): Result<ProcessedData> = runCatching {
    val resource = acquireResource()
    try {
        // If cancelled here, the finally block still executes
        val processed = expensiveTransform(data)
        ProcessedData(processed, resource.snapshot())
    } catch (e: CancellationException) {
        // Re-throw cancellation — do NOT swallow it or treat as a normal error
        throw e
    } catch (e: Exception) {
        // Non-cancellation exceptions are wrapped
        throw ProcessingFailedException("Transform failed for data ID ${data.id}", e)
    } finally {
        // Always released, even on cancellation — structured concurrency guarantees this
        releaseResource(resource)
    }
}

// ✅ GOOD — Cancel-on-error pattern with SupervisorJob
suspend fun fanOutWithErrorIsolation(
    ids: List<String>,
    processor: suspend (String) -> ProcessedItem
): List<ProcessedItem> {
    // SupervisorJob prevents one failure from cancelling siblings
    val parentJob = SupervisorJob()
    val scope = CoroutineScope(Dispatchers.IO + parentJob)
    
    val results = mutableListOf<Result<ProcessedItem>>()
    val children = ids.map { id ->
        scope.launch {
            try {
                val item = processor(id)
                results.add(Result.success(item))
            } catch (e: Exception) {
                // Each child catches its own errors — siblings continue
                results.add(Result.failure(e))
                log.error("Failed to process $id", e)
            }
        }
    }
    
    // Wait for all children to complete (some may have failed)
    children.joinAll()
    
    return results.mapNotNull { result -> result.getOrNull() }
}

// ✅ GOOD — CoroutineExceptionHandler as a last-resort fallback
val handler = CoroutineExceptionHandler { _, exception ->
    log.error("Unhandled coroutine exception", exception)
    // This is a FALLBACK — structured cancellation should prevent most exceptions from reaching here
}

fun setupWithErrorHandler(): Job {
    val job = SupervisorJob() + handler  // ExceptionHandler goes at the root
    
    CoroutineScope(job).launch {
        // If an exception escapes all try-catch blocks within this coroutine,
        // it propagates up to the parent scope and hits this handler
        launch { riskyOperationA() }
        launch { riskyOperationB() }
    }
    
    return job
}

// ✅ GOOD — Timeout handling with proper cancellation propagation
suspend fun fetchWithTimeout(url: String): String {
    // withTimeout throws TimeoutCancellationException if the block doesn't complete in time
    return withTimeout(5_000) {
        httpClient.fetch(url)
    }
}

// ✅ GOOD — withTimeoutOrNull for graceful degradation instead of exception throwing
suspend fun fetchWithGracefulDegradation(url: String): String? {
    return withTimeoutOrNull(5_000) {
        httpClient.fetch(url)
    }
}

// ❌ BAD — Never catch CancellationException as a normal error
fun neverDoThis() = launch {
    try {
        doWork()
    } catch (e: Exception) {
        // DO NOT catch CancellationException here and "recover" from it
        // The coroutine was cancelled intentionally — re-throw or let structured concurrency handle it
        log.error("Error during work", e)
        // If you need cleanup, use finally {} — not catch {} for CancellationException
    }
}

```

---

## Implementation Patterns

### Pattern 1: Structured Concurrency with SupervisorJob (Fan-Out/Fan-In)

```kotlin
// ✅ GOOD — Complete structured concurrency pattern with error isolation
data class UserProfile(
    val id: String,
    val name: String,
    val email: String,
    val preferences: UserPreferences,
    val recentOrders: List<Order>
)

data class UserPreferences(val theme: String, val notifications: Boolean)
data class Order(val id: Long, val total: Double, val status: String)

// A function that fetches all user data using structured concurrency.
// Each subtask runs independently — if one fails, its sibling continues.
// The parent coroutine collects results and can decide how to handle partial failures.
suspend fun assembleUserProfile(
    userId: String,
    profileRepository: UserProfileRepository,
    preferencesRepository: UserPreferencesRepository,
    orderRepository: OrderRepository
): UserProfile {
    
    // SupervisorJob allows independent subtask failure isolation
    val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    
    try {
        // Fork 3 independent subtasks — each runs concurrently on the IO dispatcher
        val profileDeferred = scope.async { profileRepository.findById(userId) }
        val preferencesDeferred = scope.async { preferencesRepository.findByUserId(userId) }
        val ordersDeferred = scope.async { orderRepository.findRecent(userId, limit = 10) }
        
        // Join all subtasks — if any threw an exception, it propagates here
        // Because we use SupervisorJob, the other tasks continue running even if one fails
        val (profile, preferences, orders) = try {
            Triple(profileDeferred.await(), preferencesDeferred.await(), ordersDeferred.await())
        } catch (e: CompositeException) {
            // Multiple failures — log all and use defaults for failed subtasks
            e.exceptions.forEach { exc ->
                log.error("Subtask failure during profile assembly", exc)
            }
            Triple(
                profileRepository.getDefaultProfile(userId),
                preferencesDeferred.getCompletionExceptionOrNull()?.let { 
                    log.warn("Preferences fetch failed, using defaults"; null)
                    UserPreferences("default", true)
                } ?: preferencesDeferred.await(),
                ordersDeferred.getCompletionExceptionOrNull()?.let {
                    log.warn("Orders fetch failed"; emptyList())
                } ?: ordersDeferred.await()
            )
        }
        
        return UserProfile(profile.id, profile.name, profile.email, preferences, orders)
        
    } finally {
        // Always clean up — cancel all children and wait for graceful shutdown
        scope.cancelAndJoin()
    }
}

// Extension for clean cancellation + join in one call
private suspend fun CoroutineScope.cancelAndJoin(
    timeoutMillis: Long = 5_000
) {
    this@cancelAndJoin.cancel()
    coroutineContext.job?.join(timeoutMillis)
}

```

### Pattern 2: Flow-Based Reactive Pipeline with StateFlow

```kotlin
// ✅ GOOD — Complete reactive search pipeline
sealed interface SearchState {
    object Idle : SearchState
    object Loading : SearchState
    data class Success(val results: List<SearchResult>) : SearchState
    data class Error(val message: String) : SearchState
}

data class SearchResult(val id: String, val title: String, val relevance: Double)

class SearchViewModel(
    private val searchRepository: SearchRepository
) : ViewModel() {
    
    // Private mutable state — only this class writes to it
    private val _query = MutableStateFlow("")
    private val _searchResults = MutableStateFlow<List<SearchResult>>(emptyList())
    private val _loading = MutableStateFlow(false)
    
    // Public immutable views for external consumers
    val query: StateFlow<String> = _query.asStateFlow()
    val results: StateFlow<List<SearchResult>> = _searchResults.asStateFlow()
    val loading: StateFlow<Boolean> = _loading.asStateFlow()
    
    init {
        // Debounce user input — only search after 300ms of inactivity
        query.debounce(300)
            .distinctUntilChanged()
            .filter { it.isNotBlank() }
            .flatMapLatest { query ->
                _loading.value = true
                tryFlow { searchRepository.search(query) }
                    .catch { e -> 
                        log.error("Search failed for query: $query", e)
                        emit(emptyList())
                    }
                    .onEach { results ->
                        _searchResults.value = results
                        _loading.value = false
                    }
            }
            .launchIn(viewModelScope)
    }
    
    fun updateQuery(newQuery: String) {
        _query.value = newQuery
    }
    
    // tryFlow wraps a suspending call that might throw, converting exceptions to empty flow
    private suspend fun <T> tryFlow(block: suspend () -> T): Flow<T> = flow {
        emit(block())
    }.catch { e ->
        log.error("Operation failed", e)
        // Emit nothing — the downstream debounce/retry logic handles recovery
    }
}

// ✅ GOOD — SharedFlow for event publishing (commands, not state)
sealed interface AppCommand {
    data class NavigateTo(val screen: String) : AppCommand
    data class ShowSnackbar(val message: String) : AppCommand
    object CloseDialog : AppCommand
}

class AppEventBus(private val scope: CoroutineScope) {
    
    // replay = 0 + extraBufferCapacity — new subscribers miss events emitted before subscribe
    private val _commands = MutableSharedFlow<AppCommand>(
        replay = 0,
        extraBufferCapacity = Channel.UNLIMITED
    )
    
    val commands: SharedFlow<AppCommand> = _commands.asSharedFlow()
    
    suspend fun publish(command: AppCommand) {
        _commands.emit(command)
    }
    
    // For batch operations — emit multiple commands atomically
    suspend fun publishBatch(commands: List<AppCommand>) {
        _commands.emitAll(flowOf(*commands.toTypedArray()))
    }
}

```

### Pattern 3: Network Call Parallelization with async/awaitAll

```kotlin
// ✅ GOOD — Complete parallel network fetch with error aggregation
data class DashboardData(
    val user: User,
    val stats: UserStats,
    val recentActivity: List<Activity>,
    val recommendations: List<Recommendation>
)

sealed interface FetchResult<T> {
    data class Success<T>(val value: T) : FetchResult<T>
    data class Failure<T>(val exception: Throwable) : FetchResult<T>
}

suspend fun fetchDashboardData(
    userId: String,
    apiClient: ApiClient,
    statsService: StatsService,
    activityRepo: ActivityRepository,
    recommendationEngine: RecommendationEngine
): DashboardData {
    
    // Fire all network calls in parallel — awaitAll waits for ALL to complete
    val results = listOf(
        async(apiClient) { fetchUserProfile(userId) },
        async(statsService) { fetchUserStats(userId) },
        async(activityRepo) { fetchRecentActivity(userId, limit = 20) },
        async(recommendationEngine) { generateRecommendations(userId) }
    ).awaitAll()
    
    @Suppress("UNCHECKED_CAST")
    return DashboardData(
        user = results[0] as User,
        stats = results[1] as UserStats,
        recentActivity = results[2] as List<Activity>,
        recommendations = results[3] as List<Recommendation>
    )
}

// ✅ GOOD — Retry with exponential backoff for transient failures
suspend fun <T> withRetry(
    maxRetries: Int = 3,
    baseDelayMs: Long = 1_000,
    block: suspend () -> T
): T {
    var lastException: Throwable? = null
    
    repeat(maxRetries) + 1 { attempt ->
        try {
            return block()
        } catch (e: Exception) {
            lastException = e
            
            // Don't retry cancellation — propagate it immediately
            if (e is CancellationException) throw e
            
            // Don't retry on non-retriable errors (e.g., 4xx client errors)
            val shouldRetry = when (e) {
                is TimeoutCancellationException -> true
                is java.net.SocketTimeoutException -> true
                is java.net.ConnectException -> true
                else -> false
            }
            
            if (!shouldRetry || attempt == maxRetries) break
            
            // Exponential backoff with jitter
            val delayMs = baseDelayMs * (1L shl attempt) / 2 + 
                          (Math.random() * baseDelayMs).toLong()
            log.info("Attempt $attempt failed, retrying in ${delayMs}ms", e)
            delay(delayMs)
        }
    }
    
    throw lastException ?: RuntimeException("Unknown error during retry")
}

// ✅ GOOD — Bounded parallelism for resource-limited downstream systems
suspend fun fetchWithBoundedParallelism(
    ids: List<String>,
    fetcher: suspend (String) -> Data,
    maxConcurrent: Int = 10
): List<Data> {
    
    return ids.chunked(maxConcurrent).flatMapSequential { chunk ->
        chunk.map { id ->
            async(Dispatchers.IO) { 
                fetcher(id) 
            }
        }.awaitAll()
    }
}

```

### Pattern 4: Coroutine Testing with runTest and TestDispatcher

```kotlin
// ✅ GOOD — Deterministic coroutine testing with runTest
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.currentTime
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class SearchViewModelTest {
    
    private val testDispatcher = StandardTestDispatcher()
    private val testScope = TestScope(testDispatcher)
    
    @Test
    fun `search query updates results`() = runTest(testDispatcher) {
        val repository = FakeSearchRepository(listOf(
            SearchResult("1", "Kotlin coroutines", 0.95),
            SearchResult("2", "Flow API patterns", 0.87)
        ))
        
        val viewModel = SearchViewModel(repository)
        
        // Act: update the query
        viewModel.updateQuery("coroutines")
        
        // Advance time to allow debounce + network call to complete
        advanceUntilIdle()
        
        // Assert: verify results and loading state
        assertEquals(2, viewModel.results.value.size)
        assertFalse(viewModel.loading.value)
    }
    
    @Test
    fun `search error sets error state`() = runTest(testDispatcher) {
        val failingRepo = FakeSearchRepository(emptyList(), shouldFail = true)
        val viewModel = SearchViewModel(failingRepo)
        
        viewModel.updateQuery("test")
        advanceUntilIdle()
        
        // The view model catches the error and shows an error state
        assertTrue(viewModel.results.value.isEmpty())
    }
    
    @Test
    fun `debounce skips rapid successive queries`() = runTest(testDispatcher) {
        val repository = FakeSearchRepository(listOf(SearchResult("1", "Result", 1.0)))
        val viewModel = SearchViewModel(repository)
        
        // Send rapid queries — only the last one should trigger a search after debounce
        viewModel.updateQuery("a")
        viewModel.updateQuery("ab")
        viewModel.updateQuery("abc")
        
        advanceUntilIdle()
        
        assertEquals(1, viewModel.results.value.size)
    }
}

// ✅ GOOD — Fake repository for testing coroutines
class FakeSearchRepository(
    private val results: List<SearchResult>,
    private val shouldFail: Boolean = false,
    private val delayMs: Long = 0L
) : SearchRepository {
    
    override suspend fun search(query: String): List<SearchResult> {
        // Simulate network delay (useful for testing debounce and loading states)
        if (delayMs > 0) kotlinx.coroutines.delay(delayMs)
        
        if (shouldFail) throw IOException("Simulated network failure")
        
        return results.filter { 
            it.title.lowercase().contains(query.lowercase()) 
        }
    }
}

// ✅ GOOD — Testing shared flow emission timing
@Test
fun `event bus broadcasts commands to subscribers`() = runTest(testDispatcher) {
    val eventBus = AppEventBus(this)
    
    var receivedCommands = mutableListOf<AppCommand>()
    
    // Subscribe before publishing
    testScope.launch {
        eventBus.commands.collect { cmd ->
            receivedCommands.add(cmd)
        }
    }
    
    advanceUntilIdle()
    
    // Publish commands
    eventBus.publish(AppCommand.NavigateTo("dashboard"))
    eventBus.publish(AppCommand.ShowSnackbar("Welcome!"))
    
    advanceUntilIdle()
    
    assertEquals(2, receivedCommands.size)
    assertTrue(receivedCommands[0] is AppCommand.NavigateTo)
    assertTrue(receivedCommands[1] is AppCommand.ShowSnackbar)
}

```

---

## Constraints

### MUST DO
- Always create a named `CoroutineScope` with an explicit `Job` parent — never use `GlobalScope.launch` in application code
- Use `SupervisorJob()` when independent tasks must survive sibling failures; use plain `Job()` when any failure should cancel the entire tree
- Select `Dispatchers.IO` for blocking I/O (network, database, file), `Dispatchers.Default` for CPU-bound computation, and `Dispatchers.Main` for UI updates — document dispatcher choice in code comments
- Expose `StateFlow` publicly as read-only (`StateFlow<T>`, not `MutableStateFlow<T>`) — keep the mutable instance private
- Test coroutines with `runTest { }` and inject `TestDispatcher` — never use `runBlocking` in unit tests
- Use `async { }.awaitAll()` for fan-out patterns instead of launching individual `launch { }` blocks — it provides better error aggregation
- Propagate cancellation by rethrowing `CancellationException` from catch blocks — do not swallow it or treat it as a normal recoverable error

### MUST NOT DO
- Use `Dispatchers.Unconfined` in production code — it causes unpredictable thread execution and makes testing impossible
- Catch `CancellationException` and suppress it — this breaks structured concurrency's cancellation propagation and leaks coroutines
- Expose `MutableStateFlow` or `MutableSharedFlow` publicly — consumers should not be able to modify shared state directly
- Launch coroutines from a plain function without a scope — every coroutine must have a parent Job that can cancel it
- Use `GlobalScope` for background work that outlives the application component — use a scoped coroutine tied to the lifecycle of the owning component

---

## Live References

- [Kotlin Coroutines Official Documentation](https://kotlinlang.org/docs/coroutines-overview.html) — Complete guide to coroutines, structured concurrency, and Flow APIs
- [kotlinx-coroutines GitHub Repository](https://github.com/Kotlin/kotlinx.coroutines) — Source code, examples, and changelog for the coroutine library
- [Structured Concurrency Design Document](https://github.com/Kotlin/KEEP/blob/coroutines-proposals/proposals/coroutines/structured-concurrency.md) — Official design document explaining why structured concurrency matters
- [Flow API Documentation](https://kotlinlang.org/docs/flow.html) — Flow builders, operators, backpressure strategies, and state flows
- [Coroutine Testing Guide](https://kotlinlang.org/docs/coroutines/test.html) — runTest, TestDispatcher, and testing best practices
- [Dispatchers Documentation](https://kotlinlang.org/api/kotlinx.coroutines/kotlinx-coroutines-core/kotlinx.coroutines/-dispatcher/) — Dispatcher selection guide and custom dispatcher creation
- [StateFlow vs SharedFlow Comparison](https://kotlinlang.org/docs/stateflow.html#stateflow-vs-sharedflow) — When to use each flow type

---

## Related Skills

| Skill | Purpose |
|---|---|
| `async-programming` | General async patterns across languages — helpful when comparing coroutine-based design to Promise/async-await approaches in other ecosystems |
| `testing-best-practices` | Testing strategies that complement coroutine unit testing — covers mocking, test doubles, and test organization alongside kotlinx-coroutines-test patterns |
| `error-handling-patterns` | Systematic error handling techniques — pairs with structured concurrency's cancellation-on-error and CompositeException handling patterns |
