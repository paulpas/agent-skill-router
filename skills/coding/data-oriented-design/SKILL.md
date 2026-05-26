---
name: data-oriented-design
description: Implements Data-Oriented Design (DOD) patterns including Structure-of-Arrays layouts, cache-efficient data access, zero-allocation hot paths, and vectorized processing for performance-critical Python systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: data oriented design, DOD, structure of arrays, SoA layout, cache efficiency, AoS to SoA, vectorized processing, data layout optimization
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  archetypes: [tactical]
  anti_triggers: [vague performance claims, premature optimization, micro-benchmarking without baseline]
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: performance-optimization, async-runtime, design-patterns-architecture
---

# Data-Oriented Design (DOD)

Implements Data-Oriented Design patterns to maximize CPU cache efficiency and eliminate allocation overhead in performance-critical Python systems. When loaded, the model acts as a senior performance engineer — analyzing data access patterns, refactoring object layouts from AoS to SoA or hybrid structures, and producing measurable speedups through contiguous memory access and zero-allocation hot paths.

## TL;DR Checklist

- [ ] Profile first with `cProfile` or `line_profiler` — never refactor without a baseline
- [ ] Classify access patterns: whole-entity reads (AoS) vs. per-field batch ops (SoA)
- [ ] Prefer `numpy.ndarray` for hot field arrays; use `dataclasses(slots=True)` only for cold-path entity containers
- [ ] Pre-allocate all buffers in init — no allocation inside the simulation/processing loop
- [ ] Benchmark before and after with `pytest-benchmark` or `timeit`; aim for ≥2× improvement to justify complexity
- [ ] Separate hot data (per-frame) from cold data (rarely accessed) into different structures
- [ ] Keep entity identity minimal — use integer indices, not object references, in hot paths

---

## When to Use

Use this skill when:

- Processing 10,000+ similar objects per frame/tick (physics simulations, game engines, particle systems)
- Writing performance-critical loops where cache misses are the measured bottleneck
- Building high-frequency data pipelines that must process millions of records per second
- Developing financial tick processing, market data normalization, or order book matching engines
- Implementing ECS-style architecture where components are queried independently

---

## When NOT to Use

Avoid this skill for:

- Small datasets (<1,000 entities) where cache effects are negligible — OOP overhead is not the bottleneck
- Domains where entity cohesion and encapsulation are primary concerns (UI frameworks, business logic layers)
- Rapid prototyping where iteration speed matters more than runtime performance
- Situations where the real bottleneck is I/O, network latency, or database queries — profile first

---

## Core Workflow

1. **Profile the Hot Path** — Run `cProfile` on the critical loop to identify the actual bottleneck. Use `line_profiler` ( kernprof ) on suspected functions. **Checkpoint:** Confirm that CPU cache misses or object allocation overhead is the primary cost before proceeding. If I/O dominates, DOD will not help.

2. **Classify Access Patterns** — Audit every read and write inside the hot path. Ask: "Does this code touch all fields of each entity uniformly (whole-entity access), or does it operate on individual fields across all entities independently (per-field access)?" Categorize as AoS-friendly, SoA-friendly, or mixed. **Checkpoint:** Produce a field-access matrix — which fields are read/written in which functions? This determines the optimal layout.

3. **Choose Layout Strategy** — Apply the decision matrix:
   - Pure AoS → Entity classes with `__slots__` (minimal change)
   - Pure SoA → Separate `numpy.ndarray` per field (maximal speedup for batch ops)
   - Mixed workload → Hybrid SoAoS: hot fields in contiguous arrays, cold fields attached to entity indices

4. **Implement with Contiguous Arrays** — Convert the chosen layout into code using `numpy` pre-allocated buffers. Replace list-of-objects patterns with indexed array access. Pre-allocate all intermediate buffers at initialization time. **Checkpoint:** Every function in the hot path must have zero allocations (no `list.append`, no `np.zeros`, no object construction).

5. **Benchmark and Validate** — Run identical workloads before and after refactoring using `pytest-benchmark` or `timeit`. Measure wall-clock time, memory allocation count (`tracemalloc`), and CPU cache miss rate (`perf stat -e cache-misses`). **Checkpoint:** Verify ≥2× speedup OR measurable reduction in allocations. If improvement is <5%, the complexity trade-off may not be worth it.

---

## Implementation Patterns

### Pattern 1: Structure of Arrays (SoA) with NumPy

Convert a list-of-objects (AoS) layout into field-aligned `numpy.ndarray` arrays. Each field becomes a contiguous vector, maximizing cache-line utilization when iterating over a single field across all entities.

```python
import numpy as np
from dataclasses import dataclass
from typing import Sequence


@dataclass(slots=True)
class PhysicsBody:
    """Original AoS layout — each body is an object with all fields bundled."""
    position_x: float
    position_y: float
    velocity_x: float
    velocity_y: float
    mass: float
    active: bool = True


class PhysicsSystemSoA:
    """SoA-backed physics system — fields stored as contiguous NumPy arrays.
    
    Memory layout (100,000 bodies):
      position_x: [800 KB contiguous]     position_y: [800 KB contiguous]
      velocity_x: [800 KB contiguous]     velocity_y: [800 KB contiguous]
      mass:       [800 KB contiguous]     active:   [100 KB boolean mask]
    
    Iterating over positions accesses 4× fewer cache lines than AoS
    because all x-coordinates are packed contiguously.
    """

    def __init__(self, capacity: int) -> None:
        self.capacity = capacity
        # Pre-allocate ALL arrays at init — zero allocations in the hot path
        self.position_x = np.empty(capacity, dtype=np.float64)
        self.position_y = np.empty(capacity, dtype=np.float64)
        self.velocity_x = np.empty(capacity, dtype=np.float64)
        self.velocity_y = np.empty(capacity, dtype=np.float64)
        self.mass = np.full(capacity, 1.0, dtype=np.float64)
        self.active = np.ones(capacity, dtype=np.bool_)
        self.count = 0

    def add_body(
        self,
        x: float, y: float,
        vx: float, vy: float,
        mass: float = 1.0
    ) -> int:
        """Add a body and return its integer index (entity ID)."""
        idx = self.count
        if idx >= self.capacity:
            raise RuntimeError(f"Capacity exceeded: {self.capacity}")
        self.position_x[idx] = x
        self.position_y[idx] = y
        self.velocity_x[idx] = vx
        self.velocity_y[idx] = vy
        self.mass[idx] = mass
        self.active[idx] = True
        self.count += 1
        return idx

    def integrate(self, dt: float) -> None:
        """Integrate all active bodies using Euler method.
        
        All operations are vectorized — NumPy applies the computation
        across entire arrays in C loops with no Python iteration overhead.
        """
        mask = self.active[:self.count]
        # Vectorized update: single pass over contiguous memory
        self.position_x[:self.count] += self.velocity_x[:self.count] * dt
        self.position_y[:self.count] += self.velocity_y[:self.count] * dt

    def compute_total_mass(self) -> float:
        """Sum of all active body masses — reduces to a single NumPy sum."""
        return float(np.sum(self.mass[:self.count] * self.active[:self.count].astype(np.float64)))
```

### Pattern 2: Pre-allocated Pool (Zero-Allocation Hot Path)

Replace per-frame object allocation with a pre-allocated pool. This eliminates garbage collection pauses in simulation loops by reusing fixed-size buffers.

```python
import numpy as np
from typing import Iterator


class TransformPool:
    """Pre-allocated transform buffer pool for zero-allocation rendering.
    
    Reuses pre-allocated numpy arrays across frames instead of creating
    new Transform objects each frame. The pool is sized at init time
    based on the maximum concurrent entities.
    
    Usage:
        pool = TransformPool(max_entities=50_000)
        with pool.acquire() as transforms:
            for i, entity in enumerate(world.entities):
                transforms.position_x[i] = entity.x
                transforms.position_y[i] = entity.y
            renderer.draw(transforms, count=len(world.entities))
    """

    def __init__(self, max_entities: int) -> None:
        self.max_entities = max_entities
        # Pre-allocate once at construction — never reallocates
        self.position_x = np.empty(max_entities, dtype=np.float64)
        self.position_y = np.empty(max_entities, dtype=np.float64)
        self.rotation = np.empty(max_entities, dtype=np.float64)
        self.scale = np.empty(max_entities, dtype=np.float64)
        self._in_use = False

    def acquire(self) -> "TransformPoolHandle":
        """Acquire a handle to write transforms into the pool buffer."""
        if self._in_use:
            raise RuntimeError("Transform pool already acquired — previous frame not flushed")
        self._in_use = True
        return TransformPoolHandle(self)

    def flush(self) -> None:
        """Signal that all writes are complete; renderer can consume the buffer."""
        self._in_use = False


class TransformPoolHandle:
    """Context-manager handle for safe pool usage with automatic release."""

    def __init__(self, pool: TransformPool) -> None:
        self._pool = pool
        # Expose array references directly — no indirection overhead
        self.position_x = pool.position_x
        self.position_y = pool.position_y
        self.rotation = pool.rotation
        self.scale = pool.scale

    def __enter__(self) -> "TransformPoolHandle":
        return self

    def __exit__(self, *args: object) -> None:
        self._pool.flush()


class ParticleSystem:
    """Zero-allocation particle system using TransformPool for batch transforms."""

    def __init__(self, max_particles: int) -> None:
        self.max_particles = max_particles
        self.pool = TransformPool(max_particles)
        # Also pre-allocate particle data arrays
        self.particle_positions_x = np.empty(max_particles, dtype=np.float64)
        self.particle_positions_y = np.empty(max_particles, dtype=np.float64)
        self.particle_active = np.ones(max_particles, dtype=np.bool_)
        self.active_count = 0

    def emit(self, x: float, y: float) -> None:
        """Emit a single particle — no allocation, just writes to pre-allocated slot."""
        if self.active_count >= self.max_particles:
            return
        idx = self.active_count
        self.particle_positions_x[idx] = x
        self.particle_positions_y[idx] = y
        self.particle_active[idx] = True
        self.active_count += 1

    def update_and_render(self, dt: float, renderer: object) -> None:
        """Update particles and pass batch to renderer — zero allocations."""
        mask = self.particle_active[:self.active_count]
        active_n = int(np.sum(mask))

        if active_n == 0:
            return

        # Step 1: Update particle positions (vectorized)
        self.particle_positions_y[:self.active_count] -= dt * 200.0  # gravity

        # Step 2: Acquire pool handle — writes transform data into contiguous buffers
        with self.pool.acquire() as transforms:
            np.copyto(transforms.position_x, self.particle_positions_x[:active_n])
            np.copyto(transforms.position_y, self.particle_positions_y[:active_n])
            # Renderer consumes the pre-allocated buffer directly
            renderer.draw_particles(transforms, count=active_n)
```

### Pattern 3: Hybrid SoAoS with Hot/Cold Data Separation

Separate frequently-accessed "hot" fields (stored in contiguous NumPy arrays) from rarely-accessed "cold" fields (attached to entity index objects). This gives the best of both worlds when entities have many fields but only a few are touched per frame.

```python
from __future__ import annotations

import numpy as np
from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class ColdEntity:
    """Cold path entity with all fields bundled.
    
    Used only for entities that are rarely queried in the hot loop.
    slots=True reduces per-instance memory by ~30% vs regular dataclasses.
    """
    name: str = ""
    description: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)
    created_at: float = 0.0
    tags: list[str] = field(default_factory=list)


class HybridEntitySystem:
    """Hybrid SoAoS system — hot fields in arrays, cold data on side.
    
    Hot path (per-frame): position, velocity, health → contiguous NumPy arrays
    Cold path (rare access): name, metadata, tags → per-index entity objects
    
    Entity identity is an integer index shared between both systems.
    """

    def __init__(self, capacity: int) -> None:
        self.capacity = capacity

        # === HOT DATA: contiguous arrays for per-frame operations ===
        self.hot_x = np.empty(capacity, dtype=np.float64)
        self.hot_y = np.empty(capacity, dtype=np.float64)
        self.hot_vx = np.empty(capacity, dtype=np.float64)
        self.hot_vy = np.empty(capacity, dtype=np.float64)
        self.hot_health = np.ones(capacity, dtype=np.float64)
        self.hot_alive = np.ones(capacity, dtype=np.bool_)
        self.next_free = 0

        # === COLD DATA: one object per entity index, allocated on demand ===
        self.cold_entities: list[ColdEntity | None] = [None] * capacity

    def create_entity(self, name: str = "", **kwargs: Any) -> int:
        """Create an entity and return its integer index.
        
        Allocates cold data lazily at creation time only.
        The hot arrays are already pre-allocated — no runtime cost for them.
        """
        idx = self.next_free
        if idx >= self.capacity:
            raise RuntimeError(f"Entity capacity {self.capacity} reached")

        # Allocate cold entity lazily
        if self.cold_entities[idx] is None:
            self.cold_entities[idx] = ColdEntity(name=name, **kwargs)

        self.hot_health[idx] = 1.0
        self.hot_alive[idx] = True
        self.next_free += 1
        return idx

    def update_hot_path(self, dt: float) -> None:
        """Per-frame hot path — operates ONLY on contiguous arrays.
        
        Cold fields (name, metadata, tags) are never touched here.
        This loop processes all alive entities in a single vectorized pass.
        """
        active = self.hot_alive[:self.next_free]
        n_active = int(np.sum(active))

        if n_active == 0:
            return

        # Vectorized position + velocity update
        indices = np.where(active)[0][:n_active]
        self.hot_x[indices] += self.hot_vx[indices] * dt
        self.hot_y[indices] += self.hot_vy[indices] * dt

    def get_cold_data(self, idx: int) -> ColdEntity:
        """Access cold entity data by index. Only called outside the hot path."""
        if idx >= self.next_free or self.cold_entities[idx] is None:
            raise KeyError(f"Entity {idx} does not exist")
        return self.cold_entities[idx]

    def update_cold_data(self, idx: int, name: str | None = None, **kwargs: Any) -> None:
        """Update cold entity data by index. Only called outside the hot path."""
        entity = self.get_cold_data(idx)
        if name is not None:
            entity.name = name
        entity.metadata.update(kwargs)

    def count_alive(self) -> int:
        """Fast count of alive entities — single NumPy sum on contiguous bool array."""
        return int(np.sum(self.hot_alive[:self.next_free]))
```

---

## Anti-Patterns

### Anti-Pattern 1: Pointer Chasing vs. Contiguous Access

```python
# ❌ BAD: AoS pointer chasing — accessing one field requires loading all fields into cache
class BadCharacterAoS:
    """Each character is a full object — reading 'name' loads name, stats, inventory, ai_data..."""
    def __init__(self, count: int) -> None:
        self.characters = [
            Character(
                name=f"Char {i}",
                x=float(i), y=0.0,          # 64 bytes per object overhead
                stats=CharacterStats(),       # nested objects add more indirection
                inventory=[]                  # list allocation per entity
            )
            for i in range(count)             # count separate heap allocations
        ]

    def update_all_x(self, dt: float) -> None:
        # Python loop + pointer chasing through N distinct objects
        for char in self.characters:       # O(N) Python iterations
            char.x += char.speed * dt      # each access may miss cache


# ✅ GOOD: SoA contiguous access — reading 'x' loads only x-coordinates into cache
class GoodCharacterSoA:
    """Fields stored as separate arrays — iterating x touches only x memory."""
    def __init__(self, count: int) -> None:
        self.x = np.empty(count, dtype=np.float64)
        self.speed = np.empty(count, dtype=np.float64)
        # No per-entity Python objects — just two contiguous 800KB blocks for 100K entities

    def update_all_x(self, dt: float) -> None:
        # Single NumPy vectorized operation — C-level loop over contiguous memory
        self.x[:] += self.speed * dt       # O(1) Python statement, O(N) work in SIMD


### Anti-Pattern 2: Per-Frame Allocation vs. Pool Allocation

```python
import numpy as np


# ❌ BAD: Allocates a new array every frame — triggers GC pressure at 60 FPS
class BadRendererPerFrameAllocation:
    def render_frame(self, points: list[tuple[float, float]]) -> None:
        # Creates a NEW ndarray each frame — garbage collector wakes up constantly
        coords = np.array(points)           # allocation per call
        transformed = coords * 2.0          # another allocation
        clipped = np.clip(transformed, -50, 50)  # yet another allocation
        self.display.draw(clipped)           # renders the 3rd allocation


# ✅ GOOD: Pre-allocated buffers reused across frames — zero allocations in hot path
class GoodRendererPoolAllocation:
    def __init__(self, max_points: int) -> None:
        # Allocate once at init
        self._coords = np.empty(max_points, dtype=np.float64)
        self._transformed = np.empty(max_points, dtype=np.float64)
        self._clipped = np.empty(max_points, dtype=np.float64)

    def render_frame(self, points: list[tuple[float, float]]) -> None:
        n = len(points)
        # Fill pre-allocated buffer — no new memory allocated
        for i, (x, y) in enumerate(points[:n]):
            self._coords[2*i] = x
            self._coords[2*i + 1] = y

        # In-place operations reuse the same buffers
        np.multiply(self._coords, 2.0, out=self._transformed)
        np.clip(self._transformed, -50, 50, out=self._clipped)
        self.display.draw(self._clipped[:2*n])  # renders rebuffer — no allocation
```

---

## Constraints

### MUST DO

- Profile the actual bottleneck with `cProfile` or `line_profiler` before choosing a layout — do not assume AoS is slow
- Pre-allocate all buffers at initialization time; never allocate inside performance-critical loops
- Use integer indices for entity identity in hot paths — avoid object references and pointer chasing
- Keep hot data (per-frame fields) in separate `numpy.ndarray` arrays from cold data (rarely accessed fields)
- Benchmark every refactoring with `pytest-benchmark` or `timeit`; require ≥2× measurable improvement to justify the complexity increase
- Use `dataclasses(slots=True)` for cold-path entity containers that need identity but not field-level vectorization
- Design for cache-line alignment: group frequently co-accessed fields in the same array when possible (e.g., x+y position pairs)

### MUST NOT DO

- Convert to SoA without profiling first — premature optimization increases code complexity and maintenance cost
- Store entity objects inside `numpy.ndarray` using `dtype=object` — this provides zero cache benefit over regular lists
- Mix hot and cold fields in the same NumPy array — heterogeneous dtypes defeat vectorization and require struct-of-arrays workarounds
- Use `list.append()` or list comprehensions inside loops that run per-frame at 60+ FPS — pre-allocate with `np.empty(capacity)`
- Create new numpy arrays with `np.zeros()` or `np.ones()` inside hot paths — reuse pre-allocated buffers instead
- Apply DOD to small datasets (<1,000 entities) where cache effects are imperceptible — the complexity overhead hurts readability

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `performance-optimization` | General Python performance profiling and optimization techniques (before applying layout-specific DOD patterns) |
| `async-runtime` | Async I/O patterns for non-CPU-bound bottlenecks — when the bottleneck is network or disk, not cache efficiency |
| `design-patterns-architecture` | Architectural design patterns that complement DOD; choose DOD for data-intensive loops, GOF patterns for structural organization |

---

## Live References

> Authoritative documentation and talks on Data-Oriented Design, cache efficiency, and high-performance Python.

- [GDC: "ECS in C++" by Mike Acton](https://www.youtube.com/watch?v=-CkVIqMCRUg) — Foundational talk on data-oriented design for game engines; concepts transfer to Python
- [GDC: "Architecture of a Modular Game Engine" — Cache-friendly layouts](https://www.gdcvault.com/play/1022358/Game-Engine-Patterns-Cache) — Practical cache-line aware architecture patterns
- [NumPy Performance Guide](https://numpy.org/doc/stable/user/theory.html) — NumPy vectorization, broadcasting, and memory layout documentation
- [Perf Events and Cache Misses](https://perf.wiki.kernel.org/index.php/Tutorial) — Linux `perf` tutorial for measuring cache-miss rates to validate DOD improvements
- [Python Data Model: __slots__](https://docs.python.org/3/reference/datamodel.html#slots) — How `__slots__` reduces memory overhead in dataclasses and plain classes
- [Brendan Burns: "Data-Oriented Design for Game Engines"](https://www.youtube.com/watch?v=iNhV9r2a8Ss) — Modern perspective on DOD applied to real-time systems
