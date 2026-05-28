---
name: systems-thinking-engineering
description: Applies systems thinking to engineering problems—modeling stocks/flows, feedback loops, leverage points, and emergent behavior for holistic architecture design.
license: MIT
compatibility: opencode
metadata:
    archetypes: tactical, educational
    anti_triggers: vague ideation, simple solutions, short-sightedness
    response_profile:
      verbosity: medium
      directive_strength: high
      abstraction_level: operational
  version: "1.0.0"
  domain: coding
  role: implementation
  scope: implementation
  output-format: code
  triggers: systems thinking, feedback loops, emergent behavior, system architecture, stocks and flows, leverage points, system modeling, how do i design complex systems
  related-skills: code-philosophy, feature-research
---

# Systems Thinking in Engineering

Apply systems thinking principles to understand and design complex engineering systems. This skill teaches how to model interconnections, identify feedback loops, discover leverage points (Meadows' hierarchy), and anticipate emergent behavior before it destabilizes your architecture.

When you load this skill, you will:
- Model systems as stocks, flows, and feedback mechanisms
- Identify high-impact leverage points in your architecture
- Predict emergent behavior and unintended consequences
- Design with explicit constraints, delays, and feedback visibility
- Break analysis paralysis by focusing on the 20% of factors controlling 80% of system behavior

## TL;DR Checklist

- [ ] **Map the system** — Draw stocks (resources), flows (movement), and connections before writing architecture decisions
- [ ] **Identify feedback loops** — Find reinforcing loops (accelerators) and balancing loops (stabilizers); mark them as explicit in design
- [ ] **Locate delays** — Note communication delays, processing time, and information lag; these create unexpected oscillations
- [ ] **Find leverage points** — Use Meadows' hierarchy (rules → information structures → feedback) to target high-impact changes
- [ ] **Test mental models** — Simulate two competing designs; predict which emergent behavior each produces
- [ ] **Expose interdependencies** — Make connections between components explicit in code, config, and documentation
- [ ] **Design for observability** — Build visibility into stocks, flows, and feedback loops before they break

---

## When to Use

Use this skill when:

- Designing a new microservice architecture and need to understand cascade failure modes
- Debugging unexpected behavior in a trading system (slippage amplification, drawdown spirals)
- Planning infrastructure scaling and need to predict feedback loops between load, latency, and retry storms
- Architecting a distributed system and need to model eventual consistency delays and their effects
- Reviewing someone's design and want to ask "what happens when X changes rapidly?"
- Building a complex feature and need to model interaction effects between multiple subsystems
- Leading a technical decision and need to show stakeholders why a seemingly simple change has complex ripples
- Troubleshooting a production incident where root cause wasn't obvious and required thinking across system boundaries

---

## When NOT to Use

Avoid this skill for:

- Simple, isolated functions with no cross-system dependencies (use `code-philosophy` instead)
- Pure algorithm optimization problems where the system boundary is already clear
- Quick bug fixes that don't require understanding system-wide behavior
- Tasks where the system is already fully observable and well-instrumented (systems thinking is most valuable when visibility is low)

---

## Core Workflow

### 1. **Map the Current System**

Draw the system as stocks, flows, and feedback. Don't write code yet.

**What to identify:**
- **Stocks** (accumulations): user sessions, connection pools, cache contents, order queues, account balances
- **Flows** (movements): requests/second, message processing rate, cache eviction, deposit/withdrawal, memory allocation
- **Connections** (interdependencies): which component's output is another's input?

**Checkpoint:** Can you draw this on a whiteboard? If you can't explain the system topology, your code won't prevent cascade failures.

**Example: Web service under load**
```
[Incoming Requests] → [Request Queue] → [Worker Pool] → [Database Connection Pool] → [Database]
                           ↑                                                              ↓
                           ← ← ← ← ← [Latency Feedback] ← ← ← ← ← [Slow Queries]
```

### 2. **Identify Feedback Loops**

Find reinforcing loops (self-amplifying) and balancing loops (self-correcting).

**Reinforcing loops** accelerate and destabilize:
- More traffic → longer response time → more retries → even more traffic (cascade)
- High memory usage → slower GC → higher latency → more retries (death spiral)
- Popularity → more users → more load → better performance → more popularity (growth)

**Balancing loops** self-correct:
- High CPU → backpressure → requests queued → CPU recovers (stabilizer)
- Cache miss → slow query → cache invalidation → next query hits cache (self-healing)

**Checkpoint:** Can you name 3+ feedback loops in your system? If you can't, you don't understand it yet.

### 3. **Find Delays and Latencies**

Delays between cause and effect create unexpected oscillations. A system without visible delays appears stable; delays reveal instability.

**Sources of delay:**
- Network round-trip time (RTT)
- Message queue processing time
- Garbage collection pauses
- Database replication lag (eventual consistency)
- Feature flag propagation time
- Metrics aggregation and alerting lag

**Checkpoint:** For each critical flow, estimate the end-to-end delay. Is it 10ms? 1s? 10s? Delays larger than the feedback response time cause oscillation.

### 4. **Locate Leverage Points (Meadows' Hierarchy)**

Not all changes have equal impact. Meadows ranked leverage points from highest to lowest impact:

| Rank | Leverage Point | Example | Impact |
|------|---|---|---|
| **1** | **System rules/constraints** | Debt ceiling, rate limit, circuit breaker threshold | Massive (controls entire system behavior) |
| **2** | **Information structures** | What metrics are visible? Who sees them? | High (determines what decisions get made) |
| **3** | **Goals of the system** | Optimize for latency? Throughput? Cost? | High (drives all other design choices) |
| **4** | **Power to change rules** | Who can adjust rate limits? Who owns the SLA? | High (determines responsiveness) |
| **5** | **Feedback loop strength** | How fast does latency trigger circuit break? | Medium (affects oscillation frequency) |
| **6** | **Information delays** | How old is the metric when used for decision? | Medium (creates lag in feedback) |
| **7** | **Stock-flow balance** | Is queue depth growing or shrinking? | Medium (determines trajectory) |
| **8** | **System components** | What language? Async or sync? | Low (rarely as important as people think) |

**Checkpoint:** For your system, identify the top 3 leverage points. Should you be optimizing component code (rank 8) or fixing the information structure (rank 2)?

### 5. **Simulate Competing Designs**

Test your mental model by simulating "what happens when..."

Ask these questions for each design:
- **What happens when load increases 10x?** (reinforcing loops + delays → cascade?)
- **What happens when a dependency becomes slow?** (Does backpressure protect you? Or does retry storm amplify?)
- **What happens when the feedback is delayed by 5 minutes?** (Oscillation? Dead zone?)
- **What happens when network splits?** (Feedback broken → what's the default behavior?)

**Checkpoint:** Can you predict one specific, concrete emergent behavior of each design? If you can't simulate it, you don't understand the tradeoffs.

### 6. **Design with Explicit Interdependencies**

Make the system model visible in your code, not just your whiteboard.

Use explicit:
- **Circuit breakers** at decision points (explicit feedback)
- **Backpressure mechanisms** so overload propagates safely
- **Observable state** for stocks and flows (metrics, logs, traces)
- **Delay-aware communication** (async, queues, eventual consistency)
- **Constraint enforcement** (rate limiters, max pool size, max queue depth)

**Checkpoint:** A new engineer reading your code should be able to trace a request through the system and predict where it might get stuck.

### 7. **Build Observability into Feedback Loops**

Systems break in the dark. Design visibility from day one.

Measure:
- **Stocks**: queue depths, pool utilization, memory usage, cache size
- **Flows**: requests/sec, processing rate, eviction rate, allocation rate
- **Feedback delays**: P99 latency, queue wait time, time-to-circuit-break
- **Leverage points**: rule violations, information staleness, goal achievement

**Checkpoint:** Before deploying, ask: "If this system fails in production, will I see it in my metrics _before_ users complain?"

---

## Implementation Patterns

### Pattern 1: Explicit Feedback Loop Modeling (Stocks and Flows)

Model a system as interconnected stocks and flows. Use type hints to make interdependencies explicit.

```python
from dataclasses import dataclass
from typing import Protocol
from enum import Enum
import time

class SystemComponent(Protocol):
    """Protocol for components in a feedback-driven system."""
    def process(self, input_flow: float) -> float:
        """Process input, return output flow."""
        ...
    
    def get_stock_level(self) -> float:
        """Current stock (queue depth, memory, connections)."""
        ...
    
    def get_feedback_signal(self) -> float:
        """Signal back to upstream (latency, utilization)."""
        ...


@dataclass
class QueueComponent:
    """Explicit stock-flow model: Request Queue with feedback."""
    
    name: str
    max_stock: int  # max queue depth
    current_stock: int = 0  # current queue depth (stock)
    processing_rate: float = 1.0  # items/sec (outflow)
    
    def inflow(self, requests_per_sec: float) -> float:
        """Inflow of requests; return how many we accept."""
        can_accept = max(0, self.max_stock - self.current_stock)
        accepted = min(can_accept, int(requests_per_sec))
        self.current_stock += accepted
        return float(accepted)
    
    def process(self) -> float:
        """Process items from queue; return outflow."""
        processed = min(self.current_stock, int(self.processing_rate))
        self.current_stock -= processed
        return float(processed)
    
    def get_stock_level(self) -> float:
        """Return current queue depth (stock)."""
        return float(self.current_stock)
    
    def get_feedback_signal(self) -> float:
        """
        Feedback to upstream: queue pressure.
        As queue grows, signal increases (triggers backpressure).
        """
        utilization = self.current_stock / max(1, self.max_stock)
        return utilization  # 0.0 (empty) to 1.0 (full)
    
    def is_saturated(self) -> bool:
        """Leverage point: constraint enforcement."""
        return self.current_stock >= self.max_stock * 0.8  # 80% threshold


@dataclass
class LoadGenerator:
    """Simulate incoming load with feedback-aware adjustment."""
    
    target_requests_per_sec: float
    queue: QueueComponent
    feedback_response_delay: int = 0  # delay in iterations before responding to feedback
    recent_feedback: list[float] = None  # circular buffer of recent feedback
    
    def __post_init__(self):
        if self.recent_feedback is None:
            self.recent_feedback = []
    
    def generate(self) -> float:
        """
        Generate load, but adjust based on feedback from queue.
        This creates a feedback loop: high queue → reduce send rate → queue drains.
        """
        # Simulate feedback delay: respond to feedback from N iterations ago
        if len(self.recent_feedback) > self.feedback_response_delay:
            old_feedback = self.recent_feedback[self.feedback_response_delay]
            # If queue was saturated, back off
            adjustment = 1.0 - (old_feedback * 0.5)  # reduce by up to 50%
        else:
            adjustment = 1.0
        
        actual_requests = self.target_requests_per_sec * adjustment
        self.recent_feedback.append(self.queue.get_feedback_signal())
        
        # Keep only last 100 iterations of feedback
        if len(self.recent_feedback) > 100:
            self.recent_feedback.pop(0)
        
        return actual_requests


def simulate_with_feedback(iterations: int = 100, feedback_delay: int = 0) -> list[dict]:
    """
    Simulate a system with explicit feedback loops.
    
    Shows how delays in feedback create oscillation vs. stable equilibrium.
    """
    queue = QueueComponent(name="request_queue", max_stock=50, processing_rate=10.0)
    loader = LoadGenerator(
        target_requests_per_sec=15.0,
        queue=queue,
        feedback_response_delay=feedback_delay
    )
    
    results = []
    for i in range(iterations):
        # Inflow: load generator sends requests
        incoming = loader.generate()
        accepted = queue.inflow(incoming)
        
        # Processing: queue processes items
        processed = queue.process()
        
        # Record state
        results.append({
            "iteration": i,
            "incoming": incoming,
            "accepted": accepted,
            "queue_depth": queue.get_stock_level(),
            "feedback": queue.get_feedback_signal(),
            "saturated": queue.is_saturated(),
        })
    
    return results


# Compare: no feedback delay vs. high feedback delay
print("=== With Fast Feedback (delay=0) ===")
results_fast = simulate_with_feedback(iterations=50, feedback_delay=0)
for r in results_fast[40:50]:  # last 10 iterations (should be stable)
    print(f"Iteration {r['iteration']}: queue={r['queue_depth']:.1f}, feedback={r['feedback']:.2f}")

print("\n=== With Slow Feedback (delay=5) ===")
results_slow = simulate_with_feedback(iterations=50, feedback_delay=5)
for r in results_slow[40:50]:  # last 10 iterations (may still oscillate)
    print(f"Iteration {r['iteration']}: queue={r['queue_depth']:.1f}, feedback={r['feedback']:.2f}")
```

**What this teaches:**
- Feedback delays (5 iteration lag) create oscillation instead of equilibrium
- Without feedback, the queue saturates and stays full
- With fast feedback, load self-adjusts and queue stabilizes
- This is why microservice timeouts and circuit breaker delays matter

---

### Pattern 2: Leverage Point Analysis (Meadows' Hierarchy)

Identify the highest-impact changes to your system.

```python
from enum import Enum
from dataclasses import dataclass
from typing import Callable

class LeverageLevel(Enum):
    """Meadows' hierarchy of leverage points (highest to lowest impact)."""
    SYSTEM_RULES = 1  # e.g., rate limit, max queue size, SLA
    INFORMATION_STRUCTURE = 2  # e.g., what metrics are visible, who sees them
    SYSTEM_GOALS = 3  # e.g., optimize for latency vs throughput
    POWER_TO_CHANGE_RULES = 4  # e.g., who owns the config?
    FEEDBACK_LOOP_STRENGTH = 5  # e.g., how responsive is the circuit breaker?
    INFORMATION_DELAY = 6  # e.g., how stale are metrics?
    STOCK_FLOW_BALANCE = 7  # e.g., is the queue growing or shrinking?
    SYSTEM_COMPONENTS = 8  # e.g., what language? hardware?


@dataclass
class LeveragePoint:
    """Represents a single leverage point in a system."""
    level: LeverageLevel
    name: str
    description: str
    current_value: str
    proposed_value: str
    estimated_impact: str  # low, medium, high, massive
    implementation_effort: str  # low, medium, high
    risk: str  # low, medium, high
    
    def __str__(self) -> str:
        return (
            f"[{self.level.name}] {self.name}\n"
            f"  Current: {self.current_value}\n"
            f"  Proposed: {self.proposed_value}\n"
            f"  Impact: {self.estimated_impact} | Effort: {self.implementation_effort} | Risk: {self.risk}"
        )


def analyze_microservice_architecture() -> list[LeveragePoint]:
    """
    Real example: Analyze a microservice architecture for leverage points.
    Shows how Meadows' hierarchy applies to engineering decisions.
    """
    
    return [
        # Rank 1: System Rules (highest impact)
        LeveragePoint(
            level=LeverageLevel.SYSTEM_RULES,
            name="Circuit Breaker Threshold",
            description="When to break circuit to failing dependency?",
            current_value="50ms P99 latency threshold, 5% error rate",
            proposed_value="100ms P99 + 10% error rate (more lenient)",
            estimated_impact="MASSIVE",
            implementation_effort="low",
            risk="high",  # Being too lenient cascades
        ),
        
        # Rank 2: Information Structure (high impact)
        LeveragePoint(
            level=LeverageLevel.INFORMATION_STRUCTURE,
            name="Visibility into Critical Metrics",
            description="Who sees latency? When do they see it?",
            current_value="Metrics available in Prometheus, 30s aggregation, on-call team sees alerts",
            proposed_value="Real-time dashboards, per-service view, automatic paging on anomaly",
            estimated_impact="high",
            implementation_effort="medium",
            risk="low",
        ),
        
        # Rank 3: System Goals (high impact)
        LeveragePoint(
            level=LeverageLevel.SYSTEM_GOALS,
            name="Optimization Target",
            description="Are we optimizing for latency, throughput, or cost?",
            current_value="Minimize latency (P99 < 100ms)",
            proposed_value="Optimize cost/request (allow higher latency for batch jobs)",
            estimated_impact="high",
            implementation_effort="high",
            risk="high",  # Changes all downstream decisions
        ),
        
        # Rank 5: Feedback Loop Strength
        LeveragePoint(
            level=LeverageLevel.FEEDBACK_LOOP_STRENGTH,
            name="Backpressure Response Time",
            description="How fast does the system respond to overload?",
            current_value="Backpressure triggered at 80% queue utilization, processed in 1s",
            proposed_value="Triggered at 60%, processed in 100ms",
            estimated_impact="medium",
            implementation_effort="medium",
            risk="medium",
        ),
        
        # Rank 8: System Components (lowest impact)
        LeveragePoint(
            level=LeverageLevel.SYSTEM_COMPONENTS,
            name="Language / Framework Choice",
            description="Python vs Go vs Rust?",
            current_value="Python with FastAPI",
            proposed_value="Go with chi router",
            estimated_impact="low",
            implementation_effort="high",
            risk="high",
        ),
    ]


# Find the highest-impact improvements
leverage_points = analyze_microservice_architecture()
leverage_points.sort(key=lambda x: x.level.value)  # Sort by Meadows' rank

print("=== Highest-Impact Improvements (Meadows' Hierarchy) ===\n")
for point in leverage_points[:3]:  # Top 3 leverage points
    print(point)
    print()

print("\n=== Waste Effort Alert ===")
print("Rewriting microservice in Go (Rank 8) won't help if circuit breaker threshold is wrong (Rank 1)")
```

**What this teaches:**
- Rewriting in Go (Rank 8) is pointless if your circuit breaker rules (Rank 1) are wrong
- Visibility (Rank 2) is often the cheapest, highest-impact improvement
- System goals (Rank 3) drive all other decisions
- Use Meadows' hierarchy to argue for what matters most

---

### Pattern 3: Emergent Behavior Prediction (What Happens When...)

Predict system behavior before it breaks.

```python
from dataclasses import dataclass
from typing import Callable
import json

@dataclass
class ScenarioTest:
    """Test how a system behaves under a specific scenario."""
    name: str
    description: str
    input_conditions: dict  # What we change
    predict_output: dict  # What we expect to happen
    leverage_points_affected: list[str]  # Which parts of system are stressed
    risk_level: str  # low, medium, high
    
    def __str__(self) -> str:
        return (
            f"Scenario: {self.name}\n"
            f"  Description: {self.description}\n"
            f"  Input: {json.dumps(self.input_conditions, indent=4)}\n"
            f"  Predicted: {json.dumps(self.predict_output, indent=4)}\n"
            f"  Risk: {self.risk_level}"
        )


def predict_trading_system_behavior() -> list[ScenarioTest]:
    """
    Real example: Predict emergent behavior in an algorithmic trading system.
    Shows how feedback loops, delays, and leverage points create unexpected outcomes.
    """
    
    return [
        ScenarioTest(
            name="Flash Crash Cascade",
            description="Market drops 5%; all traders adjust stops simultaneously",
            input_conditions={
                "market_drop_pct": 5,
                "stop_loss_triggered_simultaneously": True,
                "liquidity_available": "low",
            },
            predict_output={
                "emergent_behavior": "Cascading sells → deeper market drop → more stops triggered → death spiral",
                "feedback_loop": "Reinforcing: drop → stops → sell pressure → deeper drop",
                "leverage_point": "Circuit breaker rule: when does exchange halt trading?",
                "feedback_delay": "milliseconds (market can crash faster than humans react)",
                "outcome": "System-wide crash in 5 seconds or trade halt",
            },
            leverage_points_affected=["circuit_breaker_threshold", "position_sizing_rule", "retry_backoff"],
            risk_level="high",
        ),
        
        ScenarioTest(
            name="Retry Storm from Timeout Cascade",
            description="One market data feed slows down; all strategies timeout; all retry",
            input_conditions={
                "feed_latency_p99_ms": 5000,  # was 50ms
                "strategy_timeout_ms": 1000,
                "retry_on_timeout": True,
                "num_strategies": 100,
            },
            predict_output={
                "emergent_behavior": "Each strategy times out and retries → 100x more requests → feed gets slower → more timeouts → exponential load",
                "feedback_loop": "Reinforcing: slow feed → timeouts → retries → more load → slower feed",
                "leverage_point": "System rule: max_retries_per_request and circuit_breaker",
                "feedback_delay": "seconds (builds up as queue grows)",
                "outcome": "Retry storm collapses the feed for everyone",
            },
            leverage_points_affected=["max_retry_attempts", "circuit_breaker_threshold", "timeout_value"],
            risk_level="high",
        ),
        
        ScenarioTest(
            name="Memory Leak Spiral (GC Pressure Feedback)",
            description="Small memory leak; as memory grows, GC pauses increase; increased pause → more latency → more retries",
            input_conditions={
                "memory_leak_bytes_per_sec": 1000,
                "gc_pause_ms_at_80_pct_heap": 500,
                "strategy_timeout_ms": 1000,
                "retry_on_timeout": True,
            },
            predict_output={
                "emergent_behavior": "Leak → memory grows → GC pauses increase → requests timeout → retries → memory pressure → GC pauses longer → system dies",
                "feedback_loop": "Reinforcing: memory → GC pause → timeout → retry → memory",
                "leverage_point": "System rule: max heap size and GC stop-the-world time",
                "feedback_delay": "minutes to hours (leak is slow)",
                "outcome": "System gracefully degrades over hours, then crashes suddenly",
            },
            leverage_points_affected=["max_heap_size", "gc_pause_threshold", "timeout_value"],
            risk_level="medium",
        ),
    ]


# Predict system behavior
scenarios = predict_trading_system_behavior()

print("=== Emergent Behavior Predictions ===\n")
for scenario in scenarios[:2]:  # Show first two
    print(scenario)
    print("\n" + "="*60 + "\n")

print("\nKey insight: You can't see these problems by reading individual components.")
print("You must model the FEEDBACK LOOPS across components to predict emergent behavior.")
```

**What this teaches:**
- Retry storms emerge from timeout feedback loops, not from a single "bad" component
- Small leaks become crashes because of GC feedback loops
- The same leverage point (circuit breaker) prevents multiple different disasters

---

## BAD vs GOOD: System Design Under Load

### ❌ BAD: No Feedback, No Explicit Constraints

```python
class BadMicroservice:
    """No feedback loops, no explicit constraints. Fails in production."""
    
    def __init__(self):
        self.request_queue = []  # Unbounded queue
        self.max_retries = 10  # High retries without backoff
        self.timeout_ms = 1000
    
    def process_request(self, request):
        """No backpressure, no circuit breaker, no feedback."""
        # Just keep retrying forever
        for attempt in range(self.max_retries):
            try:
                return self.call_dependency(request)
            except TimeoutError:
                # No exponential backoff, no circuit breaker
                continue
        
        # Timeout means what? Add to queue and hope?
        self.request_queue.append(request)
        return None
    
    def call_dependency(self, request):
        """No timeout, no monitoring."""
        # Synchronous, blocking call with no feedback
        return requests.post(url, data=request, timeout=self.timeout_ms)


# In production: dependency gets slow → timeouts increase → queue grows unbounded
# → memory exhausted → cascading failure
```

**Problems:**
- No explicit feedback from queue to load generator
- Unbounded retry creates retry storm amplification
- No circuit breaker to break the loop
- No observability into queue depth or feedback latency
- No constraint on max queue size

---

### ✅ GOOD: Explicit Feedback, Constraints, and Observability

```python
from dataclasses import dataclass
from typing import Optional
import asyncio
from enum import Enum
import time

class CircuitState(Enum):
    CLOSED = "closed"  # Normal, allowing requests
    OPEN = "open"  # Broken, rejecting requests
    HALF_OPEN = "half_open"  # Testing if dependency recovered


@dataclass
class SystemConstraints:
    """Explicit system rules (Meadows' Rank 1: System Rules)."""
    max_queue_depth: int = 100
    circuit_breaker_error_threshold: float = 0.10  # 10% errors
    circuit_breaker_timeout_sec: int = 10
    max_retries: int = 3
    initial_backoff_ms: int = 100
    max_backoff_ms: int = 5000


class GoodMicroservice:
    """Explicit feedback, constraints, and observability."""
    
    def __init__(self, constraints: SystemConstraints):
        self.constraints = constraints
        self.request_queue: asyncio.Queue = asyncio.Queue(
            maxsize=constraints.max_queue_depth
        )
        
        # Circuit breaker state (Meadows' Rank 1: explicit system rule)
        self.circuit_state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time = 0
        
        # Metrics (Meadows' Rank 2: information structure)
        self.metrics = {
            "requests_sent": 0,
            "requests_failed": 0,
            "queue_depth": 0,
            "circuit_breaker_trips": 0,
        }
    
    async def process_request(self, request: dict) -> Optional[dict]:
        """
        Process with explicit feedback and constraints.
        
        Feedback loop:
        1. Queue depth → rejection (backpressure)
        2. Failure rate → circuit breaker (stops amplification)
        3. Metrics → observability (see the problem before it crashes)
        """
        
        # Constraint 1: Check queue before accepting request (backpressure)
        if self.request_queue.full():
            # Queue is full; reject to prevent unbounded growth
            self.metrics["queue_depth"] = self.request_queue.qsize()
            return {"error": "queue_full", "retry_after_sec": 5}
        
        try:
            # Constraint 2: Circuit breaker (Meadows' Rank 1 leverage point)
            if not self._should_allow_request():
                return {"error": "circuit_breaker_open", "retry_after_sec": 10}
            
            # Constraint 3: Bounded retries with exponential backoff
            result = await self._call_with_backoff(request)
            
            # Reset failure count on success
            self.failure_count = 0
            return result
        
        except asyncio.TimeoutError:
            self.failure_count += 1
            self.metrics["requests_failed"] += 1
            
            # Feedback: high failure rate → open circuit (break the loop)
            if self._should_trip_circuit():
                self.circuit_state = CircuitState.OPEN
                self.last_failure_time = time.time()
                self.metrics["circuit_breaker_trips"] += 1
            
            return {"error": "timeout", "retry_after_sec": 10}
    
    async def _call_with_backoff(self, request: dict) -> dict:
        """Retry with exponential backoff (limited)."""
        backoff_ms = self.constraints.initial_backoff_ms
        
        for attempt in range(self.constraints.max_retries):
            try:
                self.metrics["requests_sent"] += 1
                # Call dependency with timeout
                return await asyncio.wait_for(
                    self._call_dependency(request),
                    timeout=1.0  # seconds
                )
            
            except asyncio.TimeoutError:
                if attempt < self.constraints.max_retries - 1:
                    # Exponential backoff with jitter
                    await asyncio.sleep(backoff_ms / 1000.0)
                    backoff_ms = min(
                        backoff_ms * 2,
                        self.constraints.max_backoff_ms
                    )
                else:
                    raise
    
    def _should_allow_request(self) -> bool:
        """Circuit breaker logic (explicit feedback)."""
        if self.circuit_state == CircuitState.CLOSED:
            return True
        elif self.circuit_state == CircuitState.OPEN:
            # Check if enough time has passed to try recovery
            elapsed = time.time() - self.last_failure_time
            if elapsed > self.constraints.circuit_breaker_timeout_sec:
                self.circuit_state = CircuitState.HALF_OPEN
                return True
            return False
        else:  # HALF_OPEN
            return True
    
    def _should_trip_circuit(self) -> bool:
        """Trip circuit if failure rate exceeds threshold."""
        if self.metrics["requests_sent"] == 0:
            return False
        
        error_rate = (
            self.metrics["requests_failed"] / self.metrics["requests_sent"]
        )
        return error_rate > self.constraints.circuit_breaker_error_threshold
    
    async def _call_dependency(self, request: dict) -> dict:
        """Call external dependency (actual implementation)."""
        # In real code: call HTTP endpoint, database, etc.
        await asyncio.sleep(0.01)  # Simulate network latency
        return {"status": "ok", "data": request}
    
    def get_metrics(self) -> dict:
        """Observability: expose current system state (Meadows' Rank 2)."""
        return {
            **self.metrics,
            "queue_depth": self.request_queue.qsize(),
            "circuit_state": self.circuit_state.value,
            "failure_count": self.failure_count,
        }


# Real usage showing system behavior
async def main():
    constraints = SystemConstraints(
        max_queue_depth=100,
        max_retries=3,
        circuit_breaker_error_threshold=0.10,
    )
    service = GoodMicroservice(constraints)
    
    # Simulate load
    for i in range(50):
        result = await service.process_request({"id": i})
        if i % 10 == 0:
            print(f"Iteration {i}: metrics={service.get_metrics()}")


# asyncio.run(main())
```

**Why this is good:**
- **Explicit constraint**: max queue depth prevents unbounded memory growth
- **Feedback loop**: high failure rate triggers circuit breaker (stops retry amplification)
- **Backpressure**: full queue rejects requests, signals to upstream to slow down
- **Observability**: metrics expose queue depth, circuit state, failure rate
- **Bounded retries**: exponential backoff prevents retry storms
- **Leverage points**: circuit breaker threshold and max queue size are visible and tunable

This design prevents cascade failures by making feedback explicit.

---

## MUST DO

- [ ] **Draw the system before writing code** — Identify stocks, flows, and connections on a whiteboard
- [ ] **Find at least 3 feedback loops** — Name reinforcing loops (accelerators) and balancing loops (stabilizers)
- [ ] **Identify the top 3 leverage points using Meadows' hierarchy** — Focus on system rules (rank 1) before optimizing components (rank 8)
- [ ] **Make feedback explicit in code** — Use circuit breakers, backpressure, and queue limits instead of hoping for resilience
- [ ] **Build observability from the start** — Expose metrics for stocks (queue depth), flows (requests/sec), and feedback signals (latency)
- [ ] **Simulate competing designs** — Ask "what happens when X changes 10x?" and predict emergent behavior
- [ ] **Document interdependencies** — Make connections between components explicit; new engineers should understand why delays matter
- [ ] **Set explicit constraints** — Max queue depth, circuit breaker thresholds, max retry attempts are leverage points, not implementation details

---

## MUST NOT DO

- [ ] **Do NOT assume feedback is instant** — Assume 100ms to 10s delays between cause and effect; this creates oscillation
- [ ] **Do NOT build unbounded queues** — Unbounded storage = unbounded failure scenarios
- [ ] **Do NOT retry without circuit breakers** — Retries without feedback amplify load, creating retry storms
- [ ] **Do NOT optimize component code before fixing system rules** — You can't engineer your way out of wrong feedback loops
- [ ] **Do NOT ignore cascade failure modes** — "Component A is fast" doesn't prevent cascade failure when A fails and creates retry storm
- [ ] **Do NOT hide interdependencies** — "Just async it" or "cache it" doesn't solve feedback problems; it hides them
- [ ] **Do NOT treat metrics as optional** — If you can't see queue depth, circuit breaker state, and latency, you're flying blind
- [ ] **Do NOT assume high-rank components (code, hardware) matter more than system rules** — Rewriting in faster language won't help if circuit breaker rule is wrong

---

## ASCII Diagrams: System Topology and Feedback

### Diagram 1: Web Service Under Load (Feedback Loops Highlighted)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    INCOMING TRAFFIC (Load Generator)                     │
│                          target: 1000 req/s                              │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │
                    (Feedback Signal: queue pressure)
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       REQUEST QUEUE (Stock)                              │
│   [#1] [#2] [#3] ... [#50]  ← max_depth=50 (explicit constraint)        │
│                    ▲                                                      │
│                    │                                                      │
│     Inflow: 1000 req/s                                                   │
│     Outflow: min(queue_depth, max_processing_rate)                       │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     WORKER POOL (Processors)                             │
│   [W1: busy] [W2: busy] [W3: busy] ... [W10: busy]                      │
│   Processing rate: 500 req/s (limited by worker capacity)                │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              DATABASE / EXTERNAL DEPENDENCY                              │
│              Response time: P99 = 50ms (normally)                        │
│              Response time: P99 = 5000ms (when slow)                     │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │
                    (Feedback: Latency)
                           │
                           ▼
        ┌──────────────────────────────────────────┐
        │   CIRCUIT BREAKER (Leverage Point #1)    │
        │   Rule: If P99 > 1000ms, OPEN circuit    │
        │   Effect: Stop sending requests (fail)   │
        │   Prevents: Retry amplification          │
        └──────────────────────────────────────────┘

FEEDBACK LOOPS:
━━━━━━━━━━━━━━

Reinforcing (Dangerous):
  Load ↑ → Queue Deep ↑ → Wait Time ↑ → P99 Latency ↑ → Timeouts ↑ → Retries ↑ → Load ↑

Balancing (Stabilizing):
  Queue Deep ↑ → Circuit Breaker Opens → Requests Rejected → Load ↓ → Queue Drains ↓
```

### Diagram 2: Meadows' Leverage Points Applied to Microservices

```
LEVERAGE POINT ANALYSIS:
═══════════════════════════════════════════════════════════════════

Rank 1: System Rules (MOST IMPACT)
  ┌─────────────────────────────────────────────────────────┐
  │ • Circuit breaker threshold: P99 > 1s → OPEN circuit    │
  │ • Max queue depth: 100 items (hard limit)               │
  │ • Max retries: 3 attempts with exponential backoff      │
  │ • Timeout: 1s per request                               │
  └─────────────────────────────────────────────────────────┘
  Impact: CHANGES ENTIRE SYSTEM BEHAVIOR
  Example: Increase max_queue_depth from 100 to 10000
           → System becomes volatile, prone to cascade failure
           → Hundreds more things can go wrong

Rank 2: Information Structure (HIGH IMPACT)
  ┌─────────────────────────────────────────────────────────┐
  │ • Who sees latency metrics? (on-call team)              │
  │ • How often are they updated? (10s aggregation)         │
  │ • Who can adjust circuit breaker threshold? (ops team)  │
  │ • Is circuit breaker state visible in dashboards?       │
  └─────────────────────────────────────────────────────────┘
  Impact: DETERMINES WHAT DECISIONS GET MADE
  Example: Make circuit breaker state visible to all engineers
           → More people understand system behavior
           → Faster problem detection

Rank 5: Feedback Loop Strength
  ┌─────────────────────────────────────────────────────────┐
  │ • How quickly does backpressure respond? (100ms)        │
  │ • How quickly does circuit breaker open? (5s)           │
  │ • How long until circuit half-open tries again? (10s)   │
  └─────────────────────────────────────────────────────────┘
  Impact: AFFECTS OSCILLATION FREQUENCY
  Example: Increase circuit breaker recovery time from 10s to 1s
           → System recovers faster but may flip-flop more

Rank 8: System Components (LEAST IMPACT)
  ┌─────────────────────────────────────────────────────────┐
  │ • Language: Python vs Go vs Rust                        │
  │ • Hardware: CPU cores, RAM, network bandwidth           │
  │ • Framework: FastAPI vs Flask vs Bottle                 │
  └─────────────────────────────────────────────────────────┘
  Impact: MINOR (compared to Rank 1 rules)
  Example: Rewrite Python microservice in Go
           → Maybe 10-20% faster
           → But doesn't fix wrong circuit breaker rule!
```

---

## Related Skills

| Skill | Purpose |
|---|---|
| `code-philosophy` | Complements this skill: principles for defensive code within a system (5 Laws of Elegant Defense) |
| `feature-research` | How to research complex system interactions before implementing |

---

## Summary

Systems thinking in engineering is about seeing the whole before optimizing parts. Use this skill when:

1. You're designing a system with feedback loops, delays, and interdependencies
2. You want to predict emergent behavior before it breaks in production
3. You're debugging a cascade failure and need to understand the feedback loop
4. You want to argue for what matters most (Meadows' leverage points, not busywork)

The core insight: **Most engineering problems aren't solved by optimizing individual components. They're solved by understanding and designing feedback loops.**

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Systems Thinking (Wikipedia)](https://en.wikipedia.org/wiki/System_thinking)
- [The Fifth Discipline — Systems Thinking (Peter Senyold)](https://www.petersenyold.com/the-fifth-discipline/)
- [System Dynamics — MIT Media Lab](https://mitsloan.mit.edu/ideas-made-to-matter/system-dynamics)
- [Cynefin Framework for Complex Decision-Making](https://en.wikipedia.org/wiki/Cynefin_framework)
- [Feedback Loops in Software Systems (Amazon Web Services)](https://aws.amazon.com/builders-library/designing-and-implementing-feedback-loops/)
