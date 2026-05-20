---
name: graph-traversal
description: Implements graph traversal algorithms (DFS recursive/iterative, BFS level-order, cycle detection, connected components) with working Python code for algorithmic problem solving.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: programming
  triggers: graph traversal, depth first search, DFS, breadth first search, BFS, connected components, shortest path unweighted, tree traversal, cycle detection, topological sort, graph algorithm, level order traversal
  role: reference
  scope: implementation
  output-format: code
  content-types: [code, guidance, examples]
  related-skills: algorithms, for-loop-iteration
---

# Graph Traversal Algorithms

Implements fundamental graph traversal techniques — DFS and BFS — with working Python code covering recursive and iterative variants, cycle detection, connected components, path finding, and topological sorting. These are the two foundational algorithms every developer should know cold.

## TL;DR Checklist

- [ ] Choose DFS for exploration (cycles, paths, SCCs), BFS for shortest path in unweighted graphs
- [ ] Always maintain a `visited` set to avoid infinite loops on cyclic graphs
- [ ] Use iterative variants (explicit stack/queue) when recursion depth could exceed limits
- [ ] For directed graph cycle detection, track both visited AND the current recursion stack
- [ ] BFS naturally produces shortest paths; DFS naturally produces deep exploration
- [ ] Handle disconnected graphs by iterating over all nodes as potential starting points

---

## When to Use

Use this skill when:

- Implementing a graph algorithm that requires visiting every reachable node (DFS or BFS)
- You need to find the shortest path in an unweighted graph (use BFS)
- Detecting cycles in directed graphs (topological sort prerequisites, course scheduling)
- Finding connected components in an undirected graph (social network clusters, image segmentation)
- Performing topological sorting for dependency resolution (build systems, task scheduling)
- Traversing tree structures (binary search trees, DOM traversal, abstract syntax trees)

## When NOT to Use

Avoid this skill for:

- Shortest path in weighted graphs — use Dijkstra's algorithm or A* instead
- Graphs with negative-weight edges — use Bellman-Ford instead
- Very deep graphs where stack overflow is a real concern without iterative DFS (use BFS or iterative DFS)
- Sparse graphs where adjacency lists are needed but you accidentally use an adjacency matrix (wrong data structure)

---

## Core Workflow

1. **Choose the Right Traversal** — Decide between DFS and BFS based on your goal:
   - Shortest path in unweighted graph → BFS
   - Cycle detection → DFS (directed) or DFS/BFS (undirected)
   - Connected components → Either, but iterative BFS is simpler for large graphs
   - Topological sort → DFS (post-order) or Kahn's algorithm (BFS-based)
   
2. **Choose Your Implementation Strategy** — Recursive or iterative:
   - Recursive DFS: Simple to write, clean code, but risk of `RecursionError` on deep graphs
   - Iterative DFS: Explicit stack, no recursion limit, slightly more verbose
   - Iterative BFS: Queue-based, naturally level-by-level processing
   
3. **Select Graph Representation** — Match your use case:
   - Adjacency list (`dict[int, list[int]]`) for sparse graphs and most real-world cases
   - Adjacency matrix (`list[list[bool]]`) only when dense (near-complete) or O(1) edge lookup needed
   - Named nodes with a mapping (`str -> int id`) for readable code
   
4. **Implement the Traversal** — Write the core algorithm with proper `visited` tracking, handling base cases and edge conditions:
   - Empty graph → return early with empty result
   - Disconnected graph → iterate over all nodes to ensure full coverage
   - Directed vs undirected → undirected edges appear twice (A→B and B→A); directed once
   
5. **Validate Results** — Verify correctness:
   - All reachable nodes visited exactly once (no duplicates, no omissions)
   - BFS level ordering is non-decreasing by distance from source
   - DFS post-order satisfies topological sort constraints

---

## Implementation Patterns

### Pattern 1: DFS — Recursive (Deep Exploration)

Recursive DFS dives deep into each branch before backtracking. Best for readability and simple traversal tasks like checking reachability or finding any path.

```python
"""Recursive DFS — clean, readable, but risk of RecursionError on deep graphs."""


def dfs_recursive(
    graph: dict[int, list[int]],
    start: int,
) -> list[int]:
    """Perform recursive DFS from a starting node. Returns nodes in visitation order.
    
    Args:
        graph: Adjacency list where keys are node IDs and values are neighbor lists.
        start: The node to begin traversal from.
    
    Returns:
        List of visited nodes in DFS order (pre-order).
    
    Raises:
        ValueError: If start node is not in the graph.
    """
    if start not in graph:
        raise ValueError(f"Start node {start} not found in graph")

    visited: set[int] = set()
    result: list[int] = []

    def visit(node: int) -> None:
        """Inner recursive visitor — tracks visited state to prevent loops."""
        if node in visited:
            return  # Already explored this branch; skip it

        visited.add(node)       # Mark as seen before recursing (pre-order)
        result.append(node)     # Record visitation order

        for neighbor in graph.get(node, []):
            visit(neighbor)      # Recurse into unvisited neighbors

    visit(start)
    return result


def dfs_recursive_all_components(
    graph: dict[int, list[int]],
) -> list[list[int]]:
    """Find ALL connected components via recursive DFS.
    
    Handles disconnected graphs by iterating over every node as a potential starting point.
    
    Returns:
        List of lists, where each inner list is one connected component's nodes.
    """
    visited: set[int] = set()
    components: list[list[int]] = []

    for node in graph:
        if node in visited:
            continue  # Already part of a discovered component

        component: list[int] = []

        def explore(current: int) -> None:
            """Inner recursive function — builds one connected component."""
            visited.add(current)
            component.append(current)
            for neighbor in graph.get(current, []):
                if neighbor not in visited:
                    explore(neighbor)

        explore(node)
        components.append(component)

    return components


# Example usage
if __name__ == "__main__":
    # Undirected graph: 0-1, 0-2, 3-4 (disconnected)
    graph = {
        0: [1, 2],
        1: [0],
        2: [0],
        3: [4],
        4: [3],
    }

    print("DFS from node 0:", dfs_recursive(graph, 0))
    # Output: DFS from node 0: [0, 1, 2]

    print("Connected components:", dfs_recursive_all_components(graph))
    # Output: Connected components: [[0, 1, 2], [3, 4]]
```

### Pattern 2: DFS — Iterative (Stack-Based, No Recursion Limit)

Iterative DFS uses an explicit stack. Essential when graphs are deep enough to cause `RecursionError` (Python's default limit is ~1000). Also gives you more control over visitation order.

```python
"""Iterative DFS — safe for deep graphs, no recursion depth concerns."""


def dfs_iterative(
    graph: dict[int, list[int]],
    start: int,
) -> tuple[list[int], list[int]]:
    """Perform iterative DFS from a starting node. Returns (pre_order, post_order) lists.
    
    Pre-order: when a node is first discovered (pushed onto stack).
    Post-order: when all children have been processed (popped from stack).
    
    Args:
        graph: Adjacency list representation.
        start: Starting node ID.
    
    Returns:
        Tuple of (pre_order, post_order) visitation lists.
    
    Raises:
        ValueError: If start node is not in the graph.
    """
    if start not in graph:
        raise ValueError(f"Start node {start} not found in graph")

    visited: set[int] = set()
    pre_order: list[int] = []
    post_order: list[int] = []
    stack: list[int] = [start]  # Explicit stack replaces recursion

    while stack:
        node = stack.pop()

        if node in visited:
            post_order.append(node)  # Second encounter → post-order
            continue

        visited.add(node)
        pre_order.append(node)       # First encounter → pre-order
        stack.append(node)           # Push again to record post-order later

        # Push neighbors in reverse order so they process left-to-right
        for neighbor in reversed(graph.get(node, [])):
            if neighbor not in visited:
                stack.append(neighbor)

    return pre_order, post_order


def dfs_iterative_has_path(
    graph: dict[int, list[int]],
    source: int,
    target: int,
) -> bool:
    """Check if a path exists between source and target using iterative DFS.
    
    Early termination on finding the target — more efficient than full traversal.
    
    Args:
        graph: Adjacency list representation.
        source: Starting node ID.
        target: Destination node ID.
    
    Returns:
        True if a path exists, False otherwise.
    """
    if source == target:
        return True

    visited: set[int] = {source}
    stack: list[int] = [source]

    while stack:
        current = stack.pop()
        for neighbor in graph.get(current, []):
            if neighbor == target:
                return True  # Early exit — found the target!
            if neighbor not in visited:
                visited.add(neighbor)
                stack.append(neighbor)

    return False  # Target unreachable from source


# Example usage
if __name__ == "__main__":
    graph = {
        0: [1, 2, 3],
        1: [4],
        2: [],
        3: [4],
        4: [],
    }

    pre, post = dfs_iterative(graph, 0)
    print("Pre-order:", pre)    # e.g. [0, 3, 4, 2, 1] (depends on push order)
    print("Post-order:", post)   # e.g. [4, 1, 2, 3, 0]

    print("Path exists 0→4?", dfs_iterative_has_path(graph, 0, 4))   # True
    print("Path exists 2→0?", dfs_iterative_has_path(graph, 2, 0))   # False (2 is a sink)
```

### Pattern 3: BFS — Level-Order Shortest Path (Unweighted)

BFS explores layer by layer from the source node. This guarantees that the first time you reach any node, you've found the shortest path to it in an unweighted graph. Use this when distance matters.

```python
"""BFS for shortest path in unweighted graphs — level-by-level exploration."""

from collections import deque


def bfs_shortest_path(
    graph: dict[int, list[int]],
    source: int,
    target: int,
) -> list[int] | None:
    """Find the shortest path from source to target in an unweighted graph.
    
    Uses BFS which guarantees the first discovery of any node is via the shortest path.
    Tracks parent pointers to reconstruct the actual path (not just distance).
    
    Args:
        graph: Adjacency list representation.
        source: Starting node ID.
        target: Destination node ID.
    
    Returns:
        List of node IDs representing the shortest path, or None if unreachable.
    """
    if source == target:
        return [source]

    visited: set[int] = {source}
    parent: dict[int, int | None] = {source: None}  # parent[node] = predecessor on shortest path
    queue: deque[int] = deque([source])

    while queue:
        current = queue.popleft()

        for neighbor in graph.get(current, []):
            if neighbor in visited:
                continue  # Already found a (shorter or equal) path to this node

            visited.add(neighbor)
            parent[neighbor] = current  # Record shortest-path predecessor

            if neighbor == target:
                # Reconstruct path by backtracking through parent pointers
                path: list[int] = []
                node: int | None = target
                while node is not None:
                    path.append(node)
                    node = parent[node]
                path.reverse()  # Reverse to get source → target order
                return path

            queue.append(neighbor)

    return None  # Target unreachable from source


def bfs_levels(
    graph: dict[int, list[int]],
    source: int,
) -> dict[int, int]:
    """Compute the shortest distance (in edges) from source to every reachable node.
    
    Returns a mapping of node → distance in BFS layers.
    Distance = number of edges on the shortest path from source.
    
    Args:
        graph: Adjacency list representation.
        source: Starting node ID.
    
    Returns:
        Dictionary mapping each reachable node to its BFS distance from source.
    """
    distances: dict[int, int] = {source: 0}
    queue: deque[tuple[int, int]] = deque([(source, 0)])  # (node, distance)

    while queue:
        current, dist = queue.popleft()

        for neighbor in graph.get(current, []):
            if neighbor not in distances:
                distances[neighbor] = dist + 1
                queue.append((neighbor, dist + 1))

    return distances


def bfs_shortest_path_length(
    graph: dict[int, list[int]],
    source: int,
    target: int,
) -> int | None:
    """Return the number of edges on the shortest path (just the distance, not the path itself).
    
    More memory-efficient than full path reconstruction when only distance is needed.
    
    Args:
        graph: Adjacency list representation.
        source: Starting node ID.
        target: Destination node ID.
    
    Returns:
        Number of edges on shortest path, or None if unreachable.
    """
    if source == target:
        return 0

    distances: dict[int, int] = {source: 0}
    queue: deque[tuple[int, int]] = deque([(source, 0)])

    while queue:
        current, dist = queue.popleft()

        for neighbor in graph.get(current, []):
            if neighbor not in distances:
                new_dist = dist + 1
                distances[neighbor] = new_dist

                if neighbor == target:
                    return new_dist  # Early exit — found shortest path!

                queue.append((neighbor, new_dist))

    return None


# Example usage
if __name__ == "__main__":
    # Graph: 0→1, 0→2, 1→3, 2→3, 3→4 (all directed)
    graph = {
        0: [1, 2],
        1: [3],
        2: [3],
        3: [4],
        4: [],
    }

    path = bfs_shortest_path(graph, 0, 4)
    print("Shortest path:", path)     # [0, 1, 3, 4] or [0, 2, 3, 4] (both length 3)

    distances = bfs_levels(graph, 0)
    print("Distances from 0:", distances)  # {0: 0, 1: 1, 2: 1, 3: 2, 4: 3}

    print("Path length 0→4:", bfs_shortest_path_length(graph, 0, 4))  # 3
```

### Pattern 4: Cycle Detection (BAD vs GOOD)

Cycle detection is where most bugs occur. The key difference between directed and undirected graphs changes the algorithm entirely. Using the wrong approach silently returns incorrect results.

```python
"""Cycle detection — handling directed vs undirected graphs correctly."""


# ───────────────────────────────────────────────
# ❌ BAD: Treating directed and undirected cycles identically
# This is a common bug that misses directed cycles or falsely reports undirected ones
# ───────────────────────────────────────────────

def bad_cycle_detection(graph: dict[int, list[int]]) -> bool:
    """❌ BAD — treats all graphs as undirected and misidentifies back-edges.
    
    Flaw: In an undirected graph, every edge leads to a "visited" node (the parent),
    causing false positives. In directed graphs, it misses cycles that don't lead
    directly back to the root of the DFS tree.
    """
    visited: set[int] = set()

    def dfs(node: int) -> bool:
        if node in visited:
            return True  # ❌ False positive for undirected graphs (this is just the parent!)
        visited.add(node)
        for neighbor in graph.get(node, []):
            if dfs(neighbor):
                return True
        return False

    for node in graph:
        if node not in visited and dfs(node):
            return True
    return False


# ───────────────────────────────────────────────
# ✅ GOOD: Directed cycle detection using three-state coloring
# Uses WHITE (unvisited), GRAY (in recursion stack), BLACK (fully processed)
# ───────────────────────────────────────────────

def has_directed_cycle(graph: dict[int, list[int]]) -> bool:
    """Detect cycles in a directed graph using DFS with three-state coloring.
    
    States:
      WHITE (0): Node not yet visited
      GRAY  (1): Node is currently on the recursion stack (being explored)
      BLACK (2): Node and all its descendants have been fully processed
    
    A cycle exists if we encounter a GRAY node during DFS — it means we found
    a back-edge to an ancestor in the current DFS tree.
    
    Args:
        graph: Directed adjacency list representation.
    
    Returns:
        True if a cycle exists, False otherwise.
    
    Complexity: O(V + E) time, O(V) space for the three states.
    """
    WHITE, GRAY, BLACK = 0, 1, 2
    color: dict[int, int] = {node: WHITE for node in graph}

    def dfs(node: int) -> bool:
        """Returns True if a cycle is detected starting from this node."""
        color[node] = GRAY  # Mark as being explored (on current stack)

        for neighbor in graph.get(node, []):
            if neighbor not in color:
                continue  # Neighbor doesn't exist as a key in adjacency list

            if color[neighbor] == GRAY:
                return True  # Back-edge found → cycle!
            if color[neighbor] == WHITE and dfs(neighbor):
                return True  # Recurse into unvisited node; propagate cycle detection

        color[node] = BLACK  # All descendants processed — mark complete
        return False

    for node in graph:
        if color[node] == WHITE:
            if dfs(node):
                return True

    return False


# ───────────────────────────────────────────────
# ✅ GOOD: Undirected cycle detection using parent tracking
# Only considers a visited neighbor a "cycle" if it's not the node we came from
# ───────────────────────────────────────────────

def has_undirected_cycle(graph: dict[int, list[int]]) -> bool:
    """Detect cycles in an undirected graph using DFS with parent tracking.
    
    In an undirected graph, every edge appears in both directions (A→B and B→A).
    The "back to parent" case is NOT a cycle — it's the normal tree structure.
    Only back-edges to non-parent ancestors indicate a true cycle.
    
    Args:
        graph: Undirected adjacency list representation.
    
    Returns:
        True if a cycle exists, False otherwise.
    
    Complexity: O(V + E) time, O(V) space for visited tracking and parent chain.
    """
    visited: set[int] = set()

    def dfs(node: int, parent: int | None) -> bool:
        """Returns True if a cycle is detected from this node."""
        visited.add(node)

        for neighbor in graph.get(node, []):
            if neighbor not in visited:
                if dfs(neighbor, parent=node):
                    return True  # Cycle found in deeper subtree
            elif neighbor != parent:
                return True  # Found a visited non-parent → cycle!

        return False  # No cycle through this branch

    for node in graph:
        if node not in visited:
            if dfs(node, None):
                return True  # Cycle found in this disconnected component

    return False


# ───────────────────────────────────────────────
# ✅ GOOD: BFS-based directed cycle detection via topological sort (Kahn's algorithm)
# A directed graph is a DAG iff Kahn's algorithm processes all vertices
# ───────────────────────────────────────────────

def has_directed_cycle_bfs(graph: dict[int, list[int]]) -> bool:
    """Detect cycles in a directed graph using BFS-based topological sort (Kahn's algorithm).
    
    This approach counts in-degrees and repeatedly removes nodes with zero in-degree.
    If all nodes are processed, the graph is acyclic (a DAG).
    If any remain, those nodes form part of a cycle.
    
    Args:
        graph: Directed adjacency list representation.
    
    Returns:
        True if a cycle exists, False otherwise (graph is a DAG).
    
    Complexity: O(V + E) time, O(V) space for in-degree computation.
    """
    # Compute in-degrees for all nodes
    in_degree: dict[int, int] = {node: 0 for node in graph}
    for node in graph:
        for neighbor in graph.get(node, []):
            if neighbor in in_degree:
                in_degree[neighbor] += 1

    # Initialize queue with all zero in-degree nodes
    from collections import deque
    queue: deque[int] = deque([node for node, deg in in_degree.items() if deg == 0])
    processed_count: int = 0

    while queue:
        current = queue.popleft()
        processed_count += 1

        for neighbor in graph.get(current, []):
            if neighbor not in in_degree:
                continue
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    # If we didn't process all nodes, some are trapped in a cycle
    return processed_count != len(graph)


# Example usage
if __name__ == "__main__":
    # Directed cycle: 0→1→2→0 (A→B→C→A)
    directed_with_cycle = {
        0: [1],
        1: [2],
        2: [0],
    }

    print("Directed has cycle?", has_directed_cycle(directed_with_cycle))       # True
    print("Directed has cycle (BFS)?", has_directed_cycle_bfs(directed_with_cycle))  # True

    # Directed acyclic: 0→1→2, 0→3
    directed_acyclic = {
        0: [1, 3],
        1: [2],
        2: [],
        3: [],
    }

    print("DAG has cycle?", has_directed_cycle(directed_acyclic))               # False

    # Undirected cycle: 0-1-2-0
    undirected_with_cycle = {
        0: [1, 2],
        1: [0, 2],
        2: [0, 1],
    }

    print("Undirected has cycle?", has_undirected_cycle(undirected_with_cycle))   # True (triangle)

    # Undirected tree: 0-1-2 (no cycle)
    undirected_tree = {
        0: [1],
        1: [0, 2],
        2: [1],
    }

    print("Undirected tree has cycle?", has_undirected_cycle(undirected_tree))   # False (it's a line)
```

---

## Constraints

### MUST DO
- Always initialize and maintain a `visited` set to prevent infinite loops on cyclic or undirected graphs
- Use iterative BFS/DFS for production code where recursion depth limits could be hit (Python default: 1000)
- For directed graphs, distinguish between back-edges (cycle indicators) and cross-edges (no cycle)
- For undirected graphs, always track the parent node to avoid false cycle detection on the edge you came from
- BFS for shortest path in unweighted graphs; DFS for deep exploration, topological sort, or SCCs
- Handle disconnected graphs by iterating over all nodes as potential starting points
- Use `collections.deque` (not a list) for BFS queues — O(1) popleft vs O(n) pop(0)

### MUST NOT DO
- Do NOT use recursion-based DFS on unbounded/deep graphs without checking sys.getrecursionlimit()
- Do NOT skip the visited check — this is the #1 cause of infinite loops and stack overflows
- Do NOT treat BFS parent-tracking as cycle detection for directed graphs (the algorithm is fundamentally different)
- Do NOT use an adjacency matrix for sparse graphs — wastes O(V²) space when you only have O(E) edges
- Do NOT forget that undirected graph edges appear in both directions in the adjacency list
- Do NOT confuse BFS (queue/FIFO) with DFS (stack/LIFO or recursion) — they explore completely differently

---

## Output Template

When implementing or reviewing graph traversal code, produce:

1. **Traversal Type** — DFS (recursive/iterative) or BFS, with rationale for the choice
2. **Graph Representation** — Adjacency list vs adjacency matrix, with reasoning
3. **Code Implementation** — Typed function signatures, docstrings, and proper type hints
4. **Visited Handling** — Explicit mention of visited set and its initialization strategy
5. **Edge Case Coverage** — Empty graph, single node, disconnected components, self-loops
6. **Complexity Analysis** — Time O(V + E) and Space O(V) with explanation

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `algorithms` | Broader algorithm reference guide including Dijkstra, Floyd-Warshall, dynamic programming patterns |
| `for-loop-iteration` | Foundational iteration patterns that underpin graph traversal control flow |
