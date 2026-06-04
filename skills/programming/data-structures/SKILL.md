---




name: data-structures
description: Implements and compares fundamental data structures (hash tables, balanced BSTs, tries, heaps, linked lists, graphs) with O(1) through O(n log n) complexity analysis for optimal algorithm selection.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: programming
  triggers: data structures, hash table, balanced tree, AVL tree, trie, heap priority queue, linked list, graph traversal
  archetypes:
    - educational
    - tactical
  anti_triggers:
    - brainstorming
    - vague ideation
  response_profile:
    verbosity: medium
    directive_strength: medium
    abstraction_level: operational
  role: reference
  scope: implementation
  output-format: code
  content-types:
    - code
    - guidance
    - examples
    - diagrams
  related-skills: algorithms, graph-traversal, for-loop-iteration




---





# Data Structures Reference

Senior engineer selecting optimal data structures based on access patterns, mutation frequency, and complexity constraints. This skill makes the model reason about space-time trade-offs, memory layout implications, and language-specific implementations before recommending or implementing any data structure.

## TL;DR Checklist

- [ ] Match access pattern (random lookup → hash table, ordered traversal → BST, prefix search → trie)
- [ ] Consider mutation frequency — linked lists beat arrays for frequent insertions in the middle
- [ ] Verify space overhead of tree-based structures vs flat array or hash table layouts
- [ ] Prefer language-native implementations (Python dict, list, heapq) before rolling custom solutions
- [ ] Check complexity at boundaries: worst-case, average-case, and amortized
- [ ] For ordered operations, prefer red-black trees (self-balancing) over AVL when writes are frequent

---

## When to Use

- Choosing between data structures for a new module or function where performance characteristics matter
- Diagnosing a bottleneck caused by suboptimal data structure selection (e.g., O(n) lookups in a loop)
- Interview preparation or code review where you need to justify structural choices
- Implementing autocomplete, caching, priority scheduling, or pathfinding systems
- Comparing trade-offs between multiple candidate structures for the same problem

---

## When NOT to Use

- Simple scripts with tiny datasets (< 100 items) where O(n²) is imperceptible — optimize only when profiling shows a real bottleneck
- When domain constraints (persistence, serialization format, database schema) dictate the structure regardless of algorithmic preference
- For in-memory caching that should use LRU/TTL semantics — use `functools.lru_cache`, `cachetools.TTLCache`, or a dedicated cache library instead of rolling your own hash table
- When you need full-text search with fuzzy matching — use an inverted index with a library like Whoosh or Elasticsearch, not a raw trie

---

## Core Reference Guide

### 1. Hash Tables (Dicts / Maps)

Hash tables provide O(1) average-case lookup, insertion, and deletion by mapping keys to indices via a hash function. They are the most frequently used data structure in practice.

**Internal Mechanics (Python dict):**
- Uses open addressing with a perturb-based probing scheme (not separate chaining).
- The table grows when it reaches 2/3 capacity (load factor threshold of ~0.667).
- Key order is preserved in insertion order since Python 3.7+ (guaranteed in 3.8+).
- Each entry stores key, value, and hash; dummy entries handle tombstones during deletion.
- Hash collisions are resolved via pseudo-random probing with a perturb shift that decreases by right-shifting on each probe.

**Collision Resolution Strategies:**

| Strategy | Mechanism | Pros | Cons |
|---|---|---|---|
| Separate Chaining | Each bucket holds a linked list of entries | Simple, no upper limit on load factor | Pointer overhead, poor cache locality |
| Open Addressing — Linear Probing | Next free slot found by sequential scan | Excellent cache locality | Clustering degrades performance at high load |
| Open Addressing — Quadratic Probing | Probe distance grows quadratically | Reduces primary clustering | Secondary clustering, may not find empty slot |
| Open Addressing — Double Hashing | Second hash determines probe step | Best distribution of all open addressing methods | Requires two hash functions, careful prime table sizing |

**Load Factor Guidelines:**
- Target load factor: 0.5–0.75 for best average performance
- Above 0.8: expect significant degradation due to clustering
- Below 0.3: wasting space — consider shrinking the table

### 2. Balanced Binary Search Trees (AVL, Red-Black)

Binary search trees maintain sorted order with O(log n) operations when balanced. Self-balancing variants guarantee worst-case bounds by restructuring on inserts/deletes.

**AVL Trees:**
- Balance factor of each node is the height difference between left and right subtrees; must be -1, 0, or +1.
- More rigidly balanced than red-black trees → faster lookups but more rotations on insertion.
- Ideal when reads heavily outnumber writes (search-heavy workloads).
- Rotation types: single (LL, RR) and double (LR, RL).

**Red-Black Trees:**
- Properties ensure the path from root to any leaf is no more than twice as long as any other path → O(log n) guaranteed.
- Fewer rotations on insertion/deletion than AVL since balance is "good enough" rather than "optimal."
- Used by Java's `TreeMap`/`TreeSet`, C++ `std::map`/`std::set`, Python's `sortedcontainers`.
- Node color (red/black) encodes structural invariants instead of explicit height.

**Rotation Operations (Conceptual):**

```
Left Rotation on node X:
       X                  Y
      / \               /   \
     A   Y     →       X     Z
        / \           / \
       B   Z         A   B

Right Rotation on node Y:
       Y                    X
      / \                  /  \
     X   C    →          A    Y
    / \                      / \
   A   B                    B   C
```

### 3. Tries (Prefix Trees)

Tries store characters along paths from root to nodes, making prefix operations exceptionally fast. The depth of the trie equals the key length.

**Key Properties:**
- Lookup time is O(k) where k = key length, independent of n (number of keys).
- No hash function needed — structure encodes the key directly.
- Naturally supports prefix matching and autocomplete.
- Space can be wasteful: many nodes with few children; use compressed tries (radix trees) or Patricia tries when memory is tight.

**Character-Level Insertion:**
```
Insert "cat":
root → 'c' → 'a' → 't' ★  (★ = end-of-word marker)

Insert "car":
root → 'c' → 'a' → 'r' ★
         ↑ shares 'c'→'a' path with "cat"
```

**Auto-complete Pattern:**
- Given prefix "app", traverse to node for 'p', then collect all end-of-word markers reachable via DFS from that node.
- Time: O(k + m) where k = prefix length, m = number of completions returned.

### 4. Heaps / Priority Queues

Heaps are complete binary trees maintaining the heap property (min-heap: parent ≤ children; max-heap: parent ≥ children). Implemented efficiently as arrays.

**Array Representation:**
For a node at index `i` (0-based):
- Parent: `(i - 1) // 2`
- Left child: `2 * i + 1`
- Right child: `2 * i + 2`

**Operations:**
| Operation | Min-Heap | Description |
|---|---|---|
| Insert | O(log n) | Append at end, sift up |
| Extract min | O(log n) | Replace root with last element, sift down |
| Peek / get-min | O(1) | Root is always the minimum |
| Build heap | O(n) | Heapify from bottom-up (not n individual inserts) |

**Heapify — Bottom-Up Construction:**
- Start from the last non-leaf node at index `(n // 2 - 1)` down to 0.
- Sift each node down to restore heap property.
- Total work: O(n), not O(n log n), because most nodes are near the bottom and move very few positions.

**Heap Sort:**
1. Build max-heap from the array — O(n)
2. Repeatedly swap root (max) with last element, reduce heap size by 1, sift down — O(log n) per step
3. Total: O(n log n), in-place, not stable

### 5. Linked Lists (Singly, Doubly, Circular)

Linked lists trade random access for O(1) insertion/deletion when the node reference is known. They are fundamental building blocks for stacks, queues, and LRU caches.

**Memory Layout:**
```
Singly Linked List:    [data|next] → [data|next] → [data|next] → None
Doubly Linked List:    None ← [prev|data|next] ↔ [prev|data|next] ↔ [prev|data|next] → None
Circular (singly):     [data|next] → [data|next] → back to first node
```

**When Linked Lists Excel:**
- Implementing a stack or queue where you only access the head/tail
- LRU cache implementation (doubly linked list + hash map for O(1) operations)
- Merging sorted sequences without extra allocation
- Undo/redo stacks where bidirectional traversal is needed

**When Linked Lists Fail:**
- Random access — O(n) per lookup vs O(1) in arrays
- Cache unfriendliness — nodes are scattered in memory, causing cache misses
- Memory overhead — 2 pointers per node (4–8 bytes each on 64-bit systems)

### 6. Graph Representations

Graphs model relationships between entities. The choice of representation affects traversal speed, memory usage, and mutation cost.

**Adjacency Matrix:**
```
      A   B   C   D
    +---+---+---+---+
A   | 0 | 1 | 0 | 1 |
B   | 1 | 0 | 1 | 0 |
C   | 0 | 1 | 0 | 1 |
D   | 1 | 0 | 1 | 0 |
    +---+---+---+---+
```

| Property | Adjacency Matrix | Adjacency List |
|---|---|---|
| Space | O(V²) | O(V + E) |
| Edge lookup | O(1) | O(degree of source node) |
| Add edge | O(1) | O(1) (append to list) |
| Iterate neighbors | O(V) — scans entire row | O(degree) — only traverses existing edges |
| Dense graph suitability | ✅ Excellent | Good but wasteful |
| Sparse graph suitability | ❌ Wasteful | ✅ Optimal |

**Rule of thumb:** Use adjacency list for sparse graphs (E << V²). Use adjacency matrix when the graph is dense or you need O(1) edge existence checks in hot loops.

---

## Implementation Patterns

### Pattern 1: Hash Table with Open Addressing (Probing)

```python
class OpenAddressingHashTable:
    """Hash table using open addressing with linear probing and tombstone deletion.
    
    This is a teaching implementation illustrating how hash tables resolve collisions.
    For production use, prefer Python's built-in dict.
    
    Attributes:
        capacity: Total number of buckets in the table (must be prime for best distribution)
        size: Number of active (non-tombstone) entries
        load_threshold: Load factor above which the table resizes
    """

    EMPTY = None       # Unused slot marker
    TOMBSTONE = object()  # Deleted slot marker

    def __init__(self, capacity: int = 7, load_threshold: float = 0.65) -> None:
        """Initialize hash table with given capacity.
        
        Args:
            capacity: Initial number of buckets (will be adjusted to prime if not prime)
            load_threshold: Load factor triggering resize; default 0.65 matches CPython dict behavior
        """
        self.capacity = self._next_prime(max(capacity, 7))
        self.load_threshold = load_threshold
        self.keys = [self.EMPTY] * self.capacity
        self.values = [None] * self.capacity
        self.size = 0

    @staticmethod
    def _next_prime(n: int) -> int:
        """Find the smallest prime number >= n for table sizing."""
        while True:
            if all(n % i != 0 for i in range(2, int(n**0.5) + 1)):
                return n
            n += 1

    def _hash(self, key: object) -> int:
        """Compute initial probe index from key hash."""
        return hash(key) % self.capacity

    def insert(self, key: object, value: object) -> None:
        """Insert or update a key-value pair. Resizes table if load factor exceeds threshold.
        
        Args:
            key: Hashable key (must be immutable for correctness)
            value: Any value to associate with the key
            
        Raises:
            TypeError: If key is not hashable
        """
        if self.size / self.capacity >= self.load_threshold:
            self._resize()

        index = self._hash(key)
        first_tombstone = -1

        while True:
            if self.keys[index] == self.EMPTY:
                # Found a genuinely empty slot — key cannot exist in table
                pos = index if first_tombstone == -1 else first_tombstone
                self.keys[pos] = key
                self.values[pos] = value
                self.size += 1
                return
            elif self.keys[index] == self.TOMBSTONE:
                # Mark first tombstone position for potential reuse
                if first_tombstone == -1:
                    first_tombstone = index
            elif self.keys[index] == key:
                # Key exists — update value in place
                self.values[index] = value
                return
            # Linear probe to next slot
            index = (index + 1) % self.capacity

    def search(self, key: object) -> object | None:
        """Look up a key. Returns value or None if not found.
        
        Args:
            key: Hashable key to look up
            
        Returns:
            Associated value, or None if key does not exist
        """
        index = self._hash(key)

        while True:
            if self.keys[index] == self.EMPTY:
                # Reached genuinely empty slot — key not in table
                return None
            elif self.keys[index] == key:
                return self.values[index]
            index = (index + 1) % self.capacity

    def delete(self, key: object) -> bool:
        """Remove a key-value pair. Marks slot as tombstone to preserve probe chains.
        
        Args:
            key: Hashable key to remove
            
        Returns:
            True if key was found and removed, False if not found
        """
        index = self._hash(key)

        while True:
            if self.keys[index] == self.EMPTY:
                return False  # Key not in table
            elif self.keys[index] == key:
                self.keys[index] = self.TOMBSTONE
                self.values[index] = None
                self.size -= 1
                return True
            index = (index + 1) % self.capacity

    def _resize(self) -> None:
        """Double the table capacity and rehash all active entries."""
        old_keys = list(self.keys)
        old_values = list(self.values)
        new_capacity = self._next_prime(self.capacity * 2)
        self.capacity = new_capacity
        self.keys = [self.EMPTY] * new_capacity
        self.values = [None] * new_capacity
        self.size = 0

        for k, v in zip(old_keys, old_values):
            if k != self.EMPTY and k != self.TOMBSTONE:
                self.insert(k, v)

    @property
    def load_factor(self) -> float:
        """Current load factor of the hash table."""
        return self.size / self.capacity
```

### Pattern 2: Red-Black Tree (Insert with Self-Balancing)

```python
from typing import Generic, TypeVar, Optional

K = TypeVar('K', bound='Comparable')
V = TypeVar('V')


class Comparable:
    """Base class defining comparison protocol for generic tree keys."""
    def __lt__(self, other: object) -> bool: ...
    def __eq__(self, other: object) -> bool: ...


class RBNode(Generic[K, V]):
    """Node in a red-black tree.
    
    Attributes:
        key: The comparison key (must implement __lt__, __eq__)
        value: Associated payload
        color: True = RED, False = BLACK
        left: Left child subtree
        right: Right child subtree
        parent: Parent node reference (None for root)
    """
    __slots__ = ('key', 'value', 'color', 'left', 'right', 'parent')

    def __init__(self, key: K, value: V, color: bool = True) -> None:  # True = RED
        self.key = key
        self.value = value
        self.color = color
        self.left: Optional['RBNode[K, V]'] = None
        self.right: Optional['RBNode[K, V]'] = None
        self.parent: Optional['RBNode[K, V]'] = None


class RedBlackTree(Generic[K, V]):
    """Self-balancing binary search tree with O(log n) worst-case operations.
    
    Maintains the red-black invariants through color flips and rotations after insertion.
    Used as the basis for ordered maps in many standard libraries.
    
    Invariants:
        1. Every node is either RED or BLACK
        2. Root is always BLACK
        3. RED nodes cannot have RED children (no two consecutive reds)
        4. Every path from root to leaf has the same number of black nodes (black-height)
    """

    RED = True
    BLACK = False

    def __init__(self) -> None:
        self.root: Optional[RBNode[K, V]] = None
        self.size: int = 0

    def insert(self, key: K, value: V) -> None:
        """Insert a key-value pair and rebalance to restore red-black invariants.
        
        Args:
            key: Comparison key
            value: Associated payload
            
        Time Complexity: O(log n) amortized
        """
        node = RBNode(key, value, color=self.RED)
        self.size += 1

        if self.root is None:
            self.root = node
            node.color = self.BLACK
            return

        current = self.root
        while True:
            if key < current.key:
                if current.left is None:
                    current.left = node
                    node.parent = current
                    break
                current = current.left
            elif key > current.key:
                if current.right is None:
                    current.right = node
                    node.parent = current
                    break
                current = current.right
            else:
                # Key already exists — update value, no rebalancing needed
                current.value = value
                self.size -= 1
                return

        self._fix_insert(node)

    def _fix_insert(self, node: RBNode[K, V]) -> None:
        """Restore red-black invariants after insertion by recoloring and rotating."""
        while node != self.root and node.parent.color == self.RED:
            parent = node.parent
            grandparent = parent.parent

            if parent is grandparent.left:
                uncle = grandparent.right
                if uncle and uncle.color == self.RED:
                    # Case 1: Recolor — both parent and uncle are red
                    parent.color = self.BLACK
                    uncle.color = self.BLACK
                    grandparent.color = self.RED
                    node = grandparent
                else:
                    if node is parent.right:
                        # Case 2: Left rotation on parent (reorient to case 3)
                        self._rotate_left(parent)
                        node = parent
                        parent = node.parent
                        grandparent = parent.parent
                    # Case 3: Right rotate on grandparent + recolor
                    parent.color = self.BLACK
                    grandparent.color = self.RED
                    self._rotate_right(grandparent)
            else:
                uncle = grandparent.left
                if uncle and uncle.color == self.RED:
                    parent.color = self.BLACK
                    uncle.color = self.BLACK
                    grandparent.color = self.RED
                    node = grandparent
                else:
                    if node is parent.left:
                        self._rotate_right(parent)
                        node = parent
                        parent = node.parent
                        grandparent = parent.parent
                    parent.color = self.BLACK
                    grandparent.color = self.RED
                    self._rotate_left(grandparent)

        self.root.color = self.BLACK

    def _rotate_left(self, pivot: RBNode[K, V]) -> None:
        """Perform left rotation around pivot. Right child becomes new root of subtree."""
        right = pivot.right
        if right is None:
            return
        pivot.right = right.left
        if right.left:
            right.left.parent = pivot
        right.parent = pivot.parent
        if pivot.parent is None:
            self.root = right
        elif pivot is pivot.parent.left:
            pivot.parent.left = right
        else:
            pivot.parent.right = right
        right.left = pivot
        pivot.parent = right

    def _rotate_right(self, pivot: RBNode[K, V]) -> None:
        """Perform right rotation around pivot. Left child becomes new root of subtree."""
        left = pivot.left
        if left is None:
            return
        pivot.left = left.right
        if left.right:
            left.right.parent = pivot
        left.parent = pivot.parent
        if pivot.parent is None:
            self.root = left
        elif pivot is pivot.parent.right:
            pivot.parent.right = left
        else:
            pivot.parent.left = left
        left.right = pivot
        pivot.parent = left

    def search(self, key: K) -> Optional[V]:
        """Find value associated with key using BST property.
        
        Args:
            key: Key to look up
            
        Returns:
            Value if found, None otherwise
        """
        current = self.root
        while current is not None:
            if key == current.key:
                return current.value
            elif key < current.key:
                current = current.left
            else:
                current = current.right
        return None

    def min_key(self) -> Optional[K]:
        """Return the smallest key in the tree."""
        if self.root is None:
            return None
        current = self.root
        while current.left:
            current = current.left
        return current.key

    def max_key(self) -> Optional[K]:
        """Return the largest key in the tree."""
        if self.root is None:
            return None
        current = self.root
        while current.right:
            current = current.right
        return current.key
```

### Pattern 3: Trie with Auto-Complete

```python
class TrieNode:
    """Single node in a trie (prefix tree).
    
    Attributes:
        children: Mapping from character to child TrieNode
        end_of_word: True if this node marks the end of a valid word
        value: Associated payload for dictionary-style lookups
    """
    __slots__ = ('children', 'end_of_word', 'value')

    def __init__(self) -> None:
        self.children: dict[str, 'TrieNode'] = {}
        self.end_of_word: bool = False
        self.value: object | None = None


class Trie:
    """Prefix tree optimized for string prefix operations and auto-complete.
    
    Insertion, search, and prefix-match are all O(k) where k = key length,
    independent of the total number of stored keys. Space is O(k * n) in the
    worst case where every character of every key requires a unique node.
    """

    def __init__(self) -> None:
        self.root = TrieNode()
        self.size: int = 0

    def insert(self, word: str, value: object | None = None) -> bool:
        """Insert a word into the trie.
        
        Args:
            word: String key to store (any iterable of hashable characters)
            value: Optional payload associated with the complete word
            
        Returns:
            True if this was a new word, False if it already existed
        """
        node = self.root
        for char in word:
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]

        was_new = not node.end_of_word
        node.end_of_word = True
        node.value = value
        if was_new:
            self.size += 1
        return was_new

    def search(self, word: str) -> object | None:
        """Check if an exact word exists in the trie.
        
        Args:
            word: String to look up
            
        Returns:
            Associated value if found, None otherwise
        """
        node = self._traverse(word)
        if node is None or not node.end_of_word:
            return None
        return node.value

    def starts_with(self, prefix: str) -> bool:
        """Check if any word in the trie has the given prefix.
        
        Args:
            prefix: String prefix to check
            
        Returns:
            True if at least one stored word starts with prefix
        """
        return self._traverse(prefix) is not None

    def autocomplete(self, prefix: str, max_results: int = 10) -> list[tuple[str, object | None]]:
        """Find all complete words matching a prefix.
        
        Uses DFS from the prefix node, collecting every end-of-word marker
        encountered along with its accumulated path. Results are limited by
        max_results to prevent unbounded output on broad prefixes.
        
        Args:
            prefix: String prefix to search for
            max_results: Maximum number of completions to return
            
        Returns:
            List of (word, value) tuples sorted lexicographically
        """
        node = self._traverse(prefix)
        if node is None:
            return []

        results: list[tuple[str, object | None]] = []
        self._collect_words(node, prefix, max_results, results)
        results.sort(key=lambda x: x[0])
        return results[:max_results]

    def delete(self, word: str) -> bool:
        """Delete a word from the trie, pruning empty branches.
        
        Args:
            word: String to remove
            
        Returns:
            True if the word existed and was removed, False otherwise
        """
        deleted = self._delete_recursive(self.root, word, 0)
        if deleted:
            self.size -= 1
        return deleted

    def _traverse(self, key: str) -> TrieNode | None:
        """Walk down the trie following key characters. Returns None if path breaks."""
        node = self.root
        for char in key:
            if char not in node.children:
                return None
            node = node.children[char]
        return node

    def _collect_words(self, node: TrieNode, prefix: str, limit: int, results: list) -> int:
        """DFS helper that collects all complete words under a node."""
        count = 0
        if node.end_of_word and node.value is not None:
            results.append((prefix, node.value))
            count += 1

        if count >= limit:
            return count

        for char in sorted(node.children):
            collected = self._collect_words(
                node.children[char], prefix + char, limit - count, results
            )
            count += collected
            if count >= limit:
                break
        return count

    def _delete_recursive(self, node: TrieNode, word: str, depth: int) -> bool:
        """Recursively delete a word. Returns True if the current node can be pruned."""
        if depth == len(word):
            if not node.end_of_word:
                return False
            node.end_of_word = False
            node.value = None
            return len(node.children) == 0

        char = word[depth]
        if char not in node.children:
            return False

        should_delete_child = self._delete_recursive(
            node.children[char], word, depth + 1
        )

        if should_delete_child:
            del node.children[char]
            return (not node.end_of_word) and len(node.children) == 0

        return False
```

### Pattern 4: Min-Heap / Priority Queue via Array Heapify

```python
import heapq
from typing import Generic, TypeVar, list as typelist

T = TypeVar('T')


class MinHeap(Generic[T]):
    """Array-based min-heap with O(1) peek, O(log n) insert/extract-min.
    
    The heap is stored in a flat list where the array representation satisfies:
        parent(i) = (i - 1) // 2
        left_child(i) = 2 * i + 1
        right_child(i) = 2 * i + 2
    
    Time Complexity:
        insert: O(log n) amortized
        extract_min: O(log n)
        peek: O(1)
        build_heap: O(n) using Floyd's bottom-up heapify
        size check: O(1)
    """

    def __init__(self, items: typelist[T] | None = None) -> None:
        """Initialize heap from optional list.
        
        Args:
            items: Initial collection of comparable items. If provided,
                   uses O(n) Floyd's heapify instead of n individual inserts.
        """
        self._heap: list[T] = []
        if items is not None:
            self._heap = list(items)
            self._heapify()

    def _parent(self, i: int) -> int:
        """Return index of parent node."""
        return (i - 1) // 2

    def _left_child(self, i: int) -> int:
        """Return index of left child node."""
        return 2 * i + 1

    def _right_child(self, i: int) -> int:
        """Return index of right child node."""
        return 2 * i + 2

    def _sift_up(self, i: int) -> None:
        """Restore heap property by moving element at index i upward.
        
        Swaps with parent while the element is smaller than its parent.
        Runs in O(log n).
        """
        while i > 0:
            parent_idx = self._parent(i)
            if self._heap[i] < self._heap[parent_idx]:
                self._heap[i], self._heap[parent_idx] = self._heap[parent_idx], self._heap[i]
                i = parent_idx
            else:
                break

    def _sift_down(self, i: int) -> None:
        """Restore heap property by moving element at index i downward.
        
        Swaps with the smaller child while the element is larger than both children.
        Runs in O(log n).
        """
        n = len(self._heap)
        while True:
            smallest = i
            left = self._left_child(i)
            right = self._right_child(i)

            if left < n and self._heap[left] < self._heap[smallest]:
                smallest = left
            if right < n and self._heap[right] < self._heap[smallest]:
                smallest = right

            if smallest != i:
                self._heap[i], self._heap[smallest] = self._heap[smallest], self._heap[i]
                i = smallest
            else:
                break

    def _heapify(self) -> None:
        """Build heap from arbitrary list in O(n) using bottom-up sifting.
        
        Floyd's algorithm: start from the last non-leaf node and sift each down.
        Most nodes are near the bottom and require at most one or two swaps,
        so total work is linear, not O(n log n).
        """
        n = len(self._heap)
        for i in range(n // 2 - 1, -1, -1):
            self._sift_down(i)

    def insert(self, item: T) -> None:
        """Add an item to the heap.
        
        Appends at end and sifts up to maintain heap property.
        
        Args:
            item: Comparable item to add
        """
        self._heap.append(item)
        self._sift_up(len(self._heap) - 1)

    def extract_min(self) -> T:
        """Remove and return the smallest element.
        
        Replaces root with last element, removes last, then sifts down from root.
        
        Returns:
            The minimum element
            
        Raises:
            IndexError: If the heap is empty
        """
        if not self._heap:
            raise IndexError("extract_min from empty heap")
        if len(self._heap) == 1:
            return self._heap.pop()
        root = self._heap[0]
        self._heap[0] = self._heap.pop()
        self._sift_down(0)
        return root

    def peek(self) -> T:
        """Return the smallest element without removing it.
        
        Returns:
            The minimum element
            
        Raises:
            IndexError: If the heap is empty
        """
        if not self._heap:
            raise IndexError("peek on empty heap")
        return self._heap[0]

    def __len__(self) -> int:
        return len(self._heap)

    def __bool__(self) -> bool:
        return bool(self._heap)


def heap_sort(items: typelist[int]) -> typelist[int]:
    """Sort a list using heap sort — O(n log n) in-place, not stable.
    
    Builds a max-heap then repeatedly extracts the maximum to fill the result.
    This is an in-place algorithm with guaranteed O(n log n) worst case.
    
    Args:
        items: List of comparable elements to sort
        
    Returns:
        New sorted list in ascending order (original list is modified in place)
    """
    heap = MinHeap(items)
    result: typelist[int] = []
    while heap:
        result.append(heap.extract_min())
    return result
```

### Pattern 5: Doubly Linked List for LRU Cache

```python
from collections.abc import MutableMapping


class _DLLNode:
    """Doubly linked list node for O(1) insertion and removal."""
    __slots__ = ('key', 'value', 'prev', 'next')

    def __init__(self, key: object, value: object) -> None:
        self.key = key
        self.value = value
        self.prev: '_DLLNode | None' = None
        self.next: '_DLLNode | None' = None


class LRUCache(MutableMapping):
    """Least Recently Used cache using a hash map + doubly linked list.
    
    Achieves O(1) for get, put, and delete by maintaining two data structures:
    - A dict mapping keys to DLL nodes (for O(1) lookup)
    - A doubly linked list ordering nodes by recency (newest at tail)
    
    When the cache exceeds capacity, the oldest node (head sentinel's next) is evicted.
    Accessing or inserting a key moves it to the tail (most recently used).
    """

    def __init__(self, capacity: int) -> None:
        """Initialize LRU cache with fixed capacity.
        
        Args:
            capacity: Maximum number of items; must be positive
            
        Raises:
            ValueError: If capacity is not a positive integer
        """
        if capacity <= 0:
            raise ValueError(f"Capacity must be positive, got {capacity}")

        self.capacity = capacity
        self._cache: dict[object, _DLLNode] = {}

        # Sentinel nodes eliminate edge-case checks for empty/full lists
        self._head = _DLLNode(None, None)  # Dummy head (oldest end)
        self._tail = _DLLNode(None, None)  # Dummy tail (newest end)
        self._head.next = self._tail
        self._tail.prev = self._head

    def get(self, key: object) -> object | None:
        """Retrieve a value and mark the key as recently used.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value, or None if key is not present
        """
        if key not in self._cache:
            return None
        node = self._cache[key]
        self._move_to_tail(node)  # Mark as most recently used
        return node.value

    def put(self, key: object, value: object) -> None:
        """Insert or update a key-value pair.
        
        If the key exists, updates its value and moves it to most-recently-used.
        If inserting would exceed capacity, evicts the least recently used item.
        
        Args:
            key: Cache key
            value: Value to cache
        """
        if key in self._cache:
            node = self._cache[key]
            node.value = value
            self._move_to_tail(node)
            return

        if len(self._cache) >= self.capacity:
            self._evict_oldest()

        node = _DLLNode(key, value)
        self._cache[key] = node
        self._add_to_tail(node)

    def __setitem__(self, key: object, value: object) -> None:
        self.put(key, value)

    def __getitem__(self, key: object) -> object:
        value = self.get(key)
        if value is None:
            raise KeyError(key)
        return value

    def __delitem__(self, key: object) -> None:
        if key not in self._cache:
            raise KeyError(key)
        node = self._cache.pop(key)
        self._unlink(node)

    def __contains__(self, key: object) -> bool:
        return key in self._cache

    def __len__(self) -> int:
        return len(self._cache)

    def __iter__(self):
        return iter(self._cache)

    def _add_to_tail(self, node: _DLLNode) -> None:
        """Insert node right before the tail sentinel (most recent position)."""
        prev = self._tail.prev
        prev.next = node
        node.prev = prev
        node.next = self._tail
        self._tail.prev = node

    def _move_to_tail(self, node: _DLLNode) -> None:
        """Remove node from its current position and reinsert at tail."""
        self._unlink(node)
        self._add_to_tail(node)

    def _unlink(self, node: _DLLNode) -> None:
        """Remove a node from the doubly linked list without freeing it."""
        prev_node = node.prev
        next_node = node.next
        if prev_node is not None:
            prev_node.next = next_node
        if next_node is not None:
            next_node.prev = prev_node

    def _evict_oldest(self) -> None:
        """Remove the least recently used entry (node right after head sentinel)."""
        oldest = self._head.next
        if oldest is self._tail:
            return  # Cache is empty (shouldn't happen if capacity check passed)
        del self._cache[oldest.key]
        self._unlink(oldest)
```

---

### BAD vs GOOD Example Pairs

#### Pair 1: Linear Search in Unsorted List vs. Hash Table Lookup

```python
# ❌ BAD: O(n) lookup inside a loop — quadratic overall when checking many items
def find_common_bad(items_a: list[int], items_b: list[int]) -> list[int]:
    """Find all elements present in both lists. Uses nested linear search."""
    result = []
    for item_a in items_a:
        for item_b in items_b:  # O(n) per iteration → O(n*m) total
            if item_a == item_b:
                result.append(item_a)
                break
    return result

# ✅ GOOD: O(n + m) using a hash set for O(1) lookups
def find_common_good(items_a: list[int], items_b: list[int]) -> set[int]:
    """Find all elements present in both lists. Uses hash set for O(1) lookup."""
    set_b = set(items_b)  # O(m) — build hash table once
    return {item for item in items_a if item in set_b}  # O(n) — one pass with O(1) checks
```

#### Pair 2: Array Insertion in Middle vs. Linked List (when appropriate)

```python
# ❌ BAD: list.insert(0, x) is O(n) because it shifts all elements
def process_stream_bad(items: list[int]) -> list[int]:
    """Process a stream by always prepending results — catastrophic for large streams."""
    result: list[int] = []
    for item in items:
        result.insert(0, item * 2)  # O(n) per insert → O(n²) total
    return result

# ✅ GOOD: Use collections.deque for O(1) end-appends, then reverse at the end
from collections import deque

def process_stream_good(items: list[int]) -> list[int]:
    """Process a stream with O(1) appends, reverse once at O(n)."""
    result = deque()
    for item in items:
        result.appendleft(item * 2)  # O(1) per insert → O(n) total
    return list(result)
```

---

## Complexity Comparison Table

| Operation | Hash Table (dict) | AVL Tree | Red-Black Tree | Trie | Min-Heap (array) | Singly Linked List | Doubly Linked List | Adjacency List | Adjacency Matrix |
|---|---|---|---|---|---|---|---|---|---|
| **Lookup** | O(1) avg / O(n) worst | O(log n) | O(log n) | O(k) | — | O(n) | O(n) | O(degree) | O(1) |
| **Insert** | O(1) amortized | O(log n) | O(log n) | O(k) | O(log n) | O(1)* | O(1)* | O(1) | O(1) |
| **Delete** | O(1) avg / O(n) worst | O(log n) | O(log n) | O(k) | O(log n) | O(1)* | O(1)* | O(degree) | O(1) |
| **Find Min/Max** | — (unordered) | O(log n) | O(log n) | — | O(1) | O(n) | O(n) | O(V log V) | O(V²) |
| **Iterate Sorted** | O(n) | O(n) | O(n) | O(k + m) | — | O(n) | O(n) | O(V log V) | O(V²) |
| **Space** | O(n) | O(n) | O(n) | O(k * n) worst | O(n) | O(n) | O(n) | O(V + E) | O(V²) |

*O(1) requires a reference to the node; finding the node by key/value is O(n).
`k` = key length, `n` = number of elements, `V` = vertices, `E` = edges, `m` = completions returned.

**Quick Selection Guide:**

| Need | Best Choice | Why |
|---|---|---|
| Fastest lookups by arbitrary key | Hash table (dict) | O(1) average, language-native |
| Ordered traversal / range queries | Red-black tree | Balanced, O(log n) for all ops |
| Prefix matching / autocomplete | Trie | O(k) independent of total entries |
| Top-k elements / scheduling | Min/max-heap | O(1) peek, O(log n) update |
| Frequent middle insertions/deletions | Doubly linked list | O(1) with node reference |
| Shortest path (unweighted) | Adjacency list + BFS | Only traverses existing edges |
| Dense graph / fast edge checks | Adjacency matrix | O(1) edge lookup, compact for full graphs |

---

## Constraints

### MUST DO
- Always consider the access pattern before selecting a structure — random lookup favors hash tables, ordered traversal favors BSTs
- Use language-native implementations (Python `dict`, `list`, `heapq`, `collections.deque`) unless you have a measurable performance reason to build custom
- Document the expected worst-case and amortized complexity for every public method in docstrings
- For tree structures, verify balance guarantees — never assume an unbalanced BST stays O(log n) with real-world data
- When implementing LRU caches or similar eviction policies, always pair the linked list with a hash map for O(1) operations
- Profile before optimizing — measure actual bottleneck rather than guessing that a data structure is the problem

### MUST NOT DO
- Implement a hash table from scratch for production caching — Python's dict is highly optimized in C and handles resizing, hashing, and collision resolution better
- Use nested linear search (O(n²)) when a hash set gives O(n) — this is the most common data structure anti-pattern
- Store tree nodes as deeply nested dicts without explicit node objects — it makes rotations and balancing errors-prone and unreadable
- Choose an adjacency matrix for sparse graphs — O(V²) space wastes memory on graphs where E << V²
- Rely on recursion for deep traversals (> 1000 levels) in Python — hit the default recursion limit; use iterative variants with explicit stacks/queues
- Compare AVL vs. red-black trees prematurely — pick red-black as the default balanced BST unless profiling shows lookup-bound workloads that justify AVL's stricter balance

---

## Related Skills

| Skill | Purpose |
|---|---|
| `algorithms` | Algorithm selection guide for sorting, searching, and dynamic programming — pairs with data structure choice to solve problems efficiently |
| `graph-traversal` | DFS/BFS implementations that operate on graph representations (adjacency list / matrix) from this skill |
| `for-loop-iteration` | Python iteration patterns that complement data structure usage — when to use list comprehensions vs. generators with these structures |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Python Data Model — collections module](https://docs.python.org/3/library/collections.html)
- [CPython dict implementation (C source)](https://github.com/python/cpython/blob/main/Objects/dictobject.c)
- [Introduction to Algorithms (CLRS) — Chapters 11-14](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/)
- [Red-Black Trees on Wikipedia](https://en.wikipedia.org/wiki/Red%E2%80%93black_tree)
- [AVL Trees on Wikipedia](https://en.wikipedia.org/wiki/AVL_tree)
- [Python heapq Module Documentation](https://docs.python.org/3/library/heapq.html)
