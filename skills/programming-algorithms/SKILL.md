---
name: programming-algorithms
description: "Comprehensive algorithm selection guide \u2014 choose, implement, and\
  \ optimize algorithms based on time/space trade-offs, input characteristics, and\
  \ problem constraints"
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: programming
  role: reference
  scope: implementation
  output-format: code
  triggers: algorithm, algorithms, big-o, complexity, data structure, searching, sorting
---
  related-skills: programming-abl-v10-learning, programming-abl-v12-learning


# Skill: programming-algorithms

# Programming Algorithms: A Comprehensive Guide for Algorithm Selection

**Role:** Senior Algorithm Engineer — select, implement, and optimize algorithms for problem-solving across domains.

**Philosophy:** Algorithmic Precision — choose the right tool for the job based on time/space trade-offs, input characteristics, and problem constraints. No fabrication — leverage established, proven algorithms.

## Purpose: Why Standard Algorithms

**The Problem with Fabrication:**
- Reinventing algorithms introduces bugs and suboptimal solutions
- Standard algorithms have decades of academic analysis and optimization
- Edge cases are already understood and handled
- Performance characteristics are well-documented

**When to Use Standard Algorithms:**
1. Problem matches a known pattern (sorting, shortest path, etc.)
2. Input size suggests complexity constraints
3. Resource limits (time/space) are known
4. Industry standards exist for the domain

**Key Principles:**
- **Trade-offs are inevitable:** Time vs space, simplicity vs performance
- **Context matters:** Input size, distribution, and constraints dictate choices
- **Proof first, optimize later:** Ensure correctness before micro-optimizations

---
  related-skills: programming-abl-v10-learning, programming-abl-v12-learning

## Table of Contents

1. [Sorting Algorithms](#sorting-algorithms)
2. [Searching Algorithms](#searching-algorithms)
3. [Graph Algorithms](#graph-algorithms)
4. [Dynamic Programming](#dynamic-programming)
5. [Greedy Algorithms](#greedy-algorithms)
6. [String Algorithms](#string-algorithms)
7. [Mathematical Algorithms](#mathematical-algorithms)
8. [Geometric Algorithms](#geometric-algorithms)
9. [Backtracking Algorithms](#backtracking-algorithms)
10. [Numerical Algorithms](#numerical-algorithms)
11. [Probabilistic Algorithms](#probabilistic-algorithms)
12. [Streaming Algorithms](#streaming-algorithms)
13. [Algorithm Selection Guide](#algorithm-selection-guide)

---
  related-skills: programming-abl-v10-learning, programming-abl-v12-learning

## Sorting Algorithms

### Quick Sort
- **Alternative Names:** Partition-exchange sort
- **Time Complexity:** 
  - Best: O(n log n) (balanced partitions)
  - Average: O(n log n)
  - Worst: O(n²) (poor pivot selection)
- **Space Complexity:** O(log n) (recursion stack)
- **Key Use Cases:**
  - General-purpose sorting when cache locality matters
  - In-place sorting with minimal memory overhead
  - Average-case optimal for random data
- **When to Choose:**
  - Data is randomly distributed
  - Memory is constrained (in-place)
  - Average performance matters more than worst-case guarantee
  - Not suitable for linked lists or nearly-sorted data
- **Optimizations:**
  - Use median-of-three pivot selection
  - Switch to insertion sort for small partitions (n < 10-20)
  - Iterative implementation to avoid stack overflow

### Merge Sort
- **Alternative Names:** Mergesort
- **Time Complexity:** 
  - Best: O(n log n)
  - Average: O(n log n)
  - Worst: O(n log n)
- **Space Complexity:** O(n) (temporary arrays)
- **Key Use Cases:**
  - Linked list sorting
  - External sorting (files too large for memory)
  - Stable sorting required
  - Parallel processing (tasks are independent)
- **When to Choose:**
  - Stability is required (equal elements maintain order)
  - Sorting linked lists (O(1) extra space)
  - External sorting with disk I/O
  - Predictable performance needed
- **Optimizations:**
  - Bottom-up (iterative) implementation
  - Use insertion sort for small subarrays
  - Parallel merge sort for multi-core systems

### Heap Sort
- **Alternative Names:** Heap sorting
- **Time Complexity:** 
  - Best: O(n log n)
  - Average: O(n log n)
  - Worst: O(n log n)
- **Space Complexity:** O(1) (in-place)
- **Key Use Cases:**
  - In-place sorting with guaranteed O(n log n) performance
  - Priority queue implementation
  - Finding top-k elements (use min-heap of size k)
  - Memory-constrained environments
- **When to Choose:**
  - Worst-case performance guarantee needed
  - Memory is extremely constrained
  - Building priority queues
  - Not suitable for nearly-sorted data (no early exit)
- **Optimizations:**
  - Build heap in O(n) time (Floyd's algorithm)
  - Use binary heap for arrays, binomial heap for decreases

### Radix Sort
- **Alternative Names:** Bucket sort (for integers), LSD radix sort
- **Time Complexity:** 
  - Best: O(nk)
  - Average: O(nk)
  - Worst: O(nk)
  - Where k = number of digits/characters
- **Space Complexity:** O(n + k) (buckets)
- **Key Use Cases:**
  - Sorting integers with fixed width
  - Sorting strings by characters
  - Stable sorting for digit-by-digit processing
  - When k is small relative to n
- **When to Choose:**
  - Integers with bounded range
  - Strings with fixed maximum length
  - Need stable sorting
  - k is O(1) or very small
  - Not suitable for floating-point or large k values
- **Optimizations:**
  - MSD (Most Significant Digit) for string sorting
  - LSD (Least Significant Digit) for fixed-width integers
  - Use counting sort as stable subroutine

### Bucket Sort
- **Alternative Names:** Bin sort
- **Time Complexity:** 
  - Best: O(n + k) (uniform distribution)
  - Average: O(n + k)
  - Worst: O(n²) (all elements in one bucket)
- **Space Complexity:** O(nk) (buckets)
- **Key Use Cases:**
  - Uniformly distributed floating-point numbers
  - Sorting data that can be partitioned into ranges
  - Database partitioning
  - Parallel processing (independent buckets)
- **When to Choose:**
  - Input is uniformly distributed over a range
  - Can create appropriate number of buckets
  - Parallel sorting allowed
  - Not suitable for skewed distributions

### Insertion Sort
- **Time Complexity:** 
  - Best: O(n) (already sorted)
  - Average: O(n²)
  - Worst: O(n²)
- **Space Complexity:** O(1) (in-place)
- **Key Use Cases:**
  - Nearly-sorted data
  - Small datasets (n < 20)
  - Online algorithms (inserting elements one at a time)
  - Subroutine for hybrid algorithms
- **When to Choose:**
  - Small input sizes (often used as base case)
  - Data is already partially sorted
  - Online sorting (streaming input)
  - Minimal memory overhead required

### Bubble Sort
- **Time Complexity:** 
  - Best: O(n) (optimized with swapped flag)
  - Average: O(n²)
  - Worst: O(n²)
- **Space Complexity:** O(1) (in-place)
- **Key Use Cases:**
  - Educational demonstrations
  - Detecting nearly-sorted data
  - Small datasets with few swaps needed
- **When to Choose:**
  - Almost never for production (except teaching)
  - Detect if data is already sorted (O(n))
  - Very small datasets where simplicity matters

### Selection Sort
- **Time Complexity:** 
  - Best: O(n²)
  - Average: O(n²)
  - Worst: O(n²)
- **Space Complexity:** O(1) (in-place)
- **Key Use Cases:**
  - Minimizing number of swaps
  - Small datasets where swaps are expensive
  - Educational demonstrations
- **When to Choose:**
  - Memory writes are costly (minimize to n swaps)
  - Small datasets
  - Never for large datasets

### Shell Sort
- **Alternative Names:** Shell's method
- **Time Complexity:** 
  - Best: O(n log² n)
  - Average: O(n log² n) to O(n^(3/2))
  - Worst: O(n²)
- **Space Complexity:** O(1) (in-place)
- **Key Use Cases:**
  - Middle ground between O(n²) and O(n log n)
  - When quick sort/merge sort are too complex
  - Embedded systems with limited resources
- **When to Choose:**
  - Need better than O(n²) without complexity of O(n log n)
  - Memory-constrained but need better performance

---
  related-skills: programming-abl-v10-learning, programming-abl-v12-learning

## Searching Algorithms

### Binary Search
- **Alternative Names:** Half-interval search, logarithmic search
- **Time Complexity:** 
  - Best: O(1)
  - Average: O(log n)
  - Worst: O(log n)
- **Space Complexity:** O(1) iterative, O(log n) recursive
- **Key Use Cases:**
  - Finding elements in sorted arrays
  - Finding first/last occurrence
  - Finding minimum/maximum in bitonic/unimodal functions
  - Floating-point binary search (precision search)
- **When to Choose:**
  - Data is sorted or can be sorted
  - Need O(log n) lookup time
  - Static data (not frequently updated)
  - Not suitable for unsorted or frequently changing data
- **Variants:**
  - Lower bound / Upper bound (first ≥ / first >)
  - Rotated array search
  - 2D matrix search (row-wise and column-wise sorted)
  - Real number binary search (for precision)

### Interpolation Search
- **Time Complexity:** 
  - Best: O(log log n) (uniform distribution)
  - Average: O(log log n)
  - Worst: O(n) (non-uniform distribution)
- **Space Complexity:** O(1)
- **Key Use Cases:**
  - Uniformly distributed sorted data
  - Large datasets with known distribution
  - Numeric data with continuous values
- **When to Choose:**
  - Data is uniformly distributed
  - Data is sorted and large
  - Not suitable for sparse or non-uniform data

### Exponential Search
- **Alternative Names:** Galloping search, doubling search
- **Time Complexity:** 
  - Best: O(1)
  - Average: O(log i)
  - Worst: O(log i)
  - Where i is the position of the element
- **Space Complexity:** O(1)
- **Key Use Cases:**
  - Unbounded/infinite sorted arrays
  - Finding element position for binary search
  - When element might be near the beginning
- **When to Choose:**
  - Sorted array but size unknown
  - Element likely near start
  - As preprocessing for binary search

### Linear Search
- **Time Complexity:** 
  - Best: O(1)
  - Average: O(n)
  - Worst: O(n)
- **Space Complexity:** O(1)
- **Key Use Cases:**
  - Unsorted data
  - Small datasets
  - Single search (sorting not worth it)
  - Linked lists
- **When to Choose:**
  - Data is unsorted
  - Small n where O(n) is acceptable
  - Single search on large dataset

### Ternary Search
- **Time Complexity:** 
  - Best: O(1)
  - Average: O(log n)
  - Worst: O(log n)
- **Space Complexity:** O(1)
- **Key Use Cases:**
  - Finding minimum/maximum of unimodal function
  - Convex/concave functions
  - Golden section search alternative
- **When to Choose:**
  - Optimization of unimodal functions
  - When binary search doesn't apply
  - Compare with golden section search

### Jump Search
- **Alternative Names:** Block search
- **Time Complexity:** 
  - Best: O(1)
  - Average: O(√n)
  - Worst: O(√n)
- **Space Complexity:** O(1)
- **Key Use Cases:**
  - Sorted data where jumping back is expensive
  - Large datasets on disk
  - Intermediate between linear and binary search
- **When to Choose:**
  - Jumping back is costly (disk seeks)
  - O(√n) is acceptable

---
  related-skills: programming-abl-v10-learning, programming-abl-v12-learning

## Graph Algorithms

### Breadth-First Search (BFS)
- **Time Complexity:** O(V + E)
- **Space Complexity:** O(V) (queue)
- **Key Use Cases:**
  - Shortest path in unweighted graphs
  - Level-order traversal
  - Connected components
  - Bipartite checking
  - Web crawling
- **When to Choose:**
  - Unweighted shortest path
  - Need all nodes at distance k
  - Flow networks (Ford-Fulkerson)
  - Social network analysis

### Depth-First Search (DFS)
- **Time Complexity:** O(V + E)
- **Space Complexity:** O(V) (recursion stack)
- **Key Use Cases:**
  - Topological sorting
  - Cycle detection
  - Strongly connected components
  - Maze solving
  - Path finding
- **When to Choose:**
  - Need to explore all paths
  - Stack-based iteration
  - Topological sort
  - Tarjan's SCC algorithm
- **Variants:**
  - Iterative DFS (explicit stack)
  - DFS with parent tracking
  - DFS forest (multiple components)

### Dijkstra's Algorithm
- **Alternative Names:** Dijkstra's shortest path
- **Time Complexity:** 
  - O(V²) (naive)
  - O((V + E) log V) (with priority queue)
  - O(V log V + E) (Fibonacci heap)
- **Space Complexity:** O(V)
- **Key Use Cases:**
  - Single-source shortest path (non-negative weights)
  - Routing protocols
  - GPS navigation
  - Network optimization
- **When to Choose:**
  - Non-negative edge weights
  - Single source to all destinations
  - Need exact shortest path
  - Not suitable for negative weights
- **Optimizations:**
  - Use Fibonacci heap for O(V log V + E)
  - Early termination when target reached
  - Bidirectional Dijkstra for source-target

### Bellman-Ford Algorithm
- **Time Complexity:** O(VE)
- **Space Complexity:** O(V)
- **Key Use Cases:**
  - Single-source shortest path with negative weights
  - Negative cycle detection
  - Distributed routing
  - Linear programming
- **When to Choose:**
  - Graph may have negative edge weights
  - Need negative cycle detection
  - Distributed systems
  - Not suitable for dense graphs (too slow)

### Floyd-Warshall Algorithm
- **Alternative Names:** Floyd's algorithm, Roy-Warshall
- **Time Complexity:** O(V³)
- **Space Complexity:** O(V²)
- **Key Use Cases:**
  - All-pairs shortest path
  - Transitive closure
  - Negative cycle detection
  - Density graphs
- **When to Choose:**
  - Need all-pairs shortest paths
  - Graph is dense (V³ acceptable)
  - Small V (V < 200-500)
  - Transitive closure needed
- **Optimizations:**
  - Use only when V is small
  - Can detect negative cycles

### Kruskal's Algorithm
- **Alternative Names:** Minimum spanning tree (Kruskal)
- **Time Complexity:** O(E log E) or O(E log V)
- **Space Complexity:** O(V) (disjoint set)
- **Key Use Cases:**
  - Minimum spanning tree
  - Network design
  - Approximation algorithms
  - Clustering
- **When to Choose:**
  - Sparse graphs
  - Need MST
  - Edge-based processing
  - Disjoint set data structure available
- **Optimizations:**
  - Union by rank + path compression
  - Pre-sort edges

### Prim's Algorithm
- **Time Complexity:** 
  - O(V²) (naive)
  - O((V + E) log V) (priority queue)
  - O(E + V log V) (Fibonacci heap)
- **Space Complexity:** O(V)
- **Key Use Cases:**
  - Minimum spanning tree
  - Dense graphs
  - Network design
  - Image segmentation
- **When to Choose:**
  - Dense graphs (more edges)
  - Need MST
  - Vertex-based processing
  - Adjacency matrix available
- **Comparison with Kruskal:**
  - Kruskal better for sparse
  - Prim better for dense

### Topological Sort
- **Time Complexity:** O(V + E)
- **Space Complexity:** O(V)
- **Key Use Cases:**
  - Dependency resolution
  - Course scheduling
  - Build systems
  - Job scheduling
- **When to Choose:**
  - Directed acyclic graph (DAG)
  - Need linear ordering
  - Dependency ordering required
  - Cycle detection (if not DAG)
- **Methods:**
  - DFS-based (post-order)
  - Kahn's algorithm (BFS with in-degrees)

### A* Search Algorithm
- **Time Complexity:** O(b^d) worst case (where b = branching, d = depth)
- **Space Complexity:** O(b^d)
- **Key Use Cases:**
  - Heuristic path finding
  - Game AI
  - Robotics
  - Puzzle solving
- **When to Choose:**
  - Need shortest path with heuristic
  - Admissible heuristic available
  - Want to reduce search space
  - Not suitable without good heuristic
- **Heuristic Requirements:**
  - Admissible (never overestimates)
  - Consistent (triangle inequality)
- **Variants:**
  -IDA* (Iterative Deepening A*)
  - SMA* (Simplified Memory-Bounded A*)

### Tarjan's SCC Algorithm
- **Time Complexity:** O(V + E)
- **Space Complexity:** O(V)
- **Key Use Cases:**
  - Strongly connected components
  - Graph condensation
  - Dependency analysis
  - Circuit simulation
- **When to Choose:**
  - Find SCCs in directed graph
  - Graph condensation needed
  - Cycle analysis
  - Topological sort on SCCs

### Johnson's Algorithm
- **Time Complexity:** O(V² log V + VE)
- **Space Complexity:** O(V²)
- **Key Use Cases:**
  - All-pairs shortest path (sparse graphs)
  - Graphs with negative weights
- **When to Choose:**
  - Sparse graphs, all-pairs shortest path
  - Negative weights allowed
  - Better than Floyd-Warshall for sparse

### Chinese Postman Problem
- **Time Complexity:** O(V² log V + E) for undirected
- **Space Complexity:** O(V²)
- **Key Use Cases:**
  - Route optimization (mail carrier)
  - Circuit board inspection
  - Street cleaning
- **When to Choose:**
  - Need to traverse all edges
  - Minimize total distance
  - Graph may have odd-degree vertices

### Traveling Salesman Problem (Approximations)
- **Time Complexity:** Varies by heuristic
- **Space Complexity:** O(V²)
- **Key Use Cases:**
  - Route optimization
  - Logistics
  - Manufacturing (drill positioning)
- **Heuristics:**
  - Nearest neighbor: O(V²)
  - Christofides: O(V³) (3/2 approximation)
  - Simulated annealing
  - Genetic algorithms
- **When to Choose:**
  - NP-hard problem, need approximation
  - Real-world constraints
  - Exact solution not required

### Minimum Cut (Stoer-Wagner)
- **Time Complexity:** O(V³) or O(VE + V² log V)
- **Space Complexity:** O(V²)
- **Key Use Cases:**
  - Network reliability
  - Image segmentation
  - Clustering
- **When to Choose:**
  - Find minimum edge cut
  - Graph partitioning
  - No source-sink constraint

### Maximum Flow (Ford-Fulkerson)
- **Time Complexity:** O(E * max_flow) (integer capacities)
- **Space Complexity:** O(V + E)
- **Key Use Cases:**
  - Network flow
  - Bipartite matching
  - Image segmentation
  - transportation problems
- **When to Choose:**
  - Flow network optimization
  - Matching problems
  - Integer capacities
- **Variants:**
  - Edmonds-Karp: O(VE²) (BFS)
  - Dinic's: O(V²E) (level graph)
  - Push-relabel: O(V²E) (more efficient in practice)

### Hopcroft-Karp Algorithm
- **Time Complexity:** O(E * √V)
- **Space Complexity:** O(V)
- **Key Use Cases:**
  - Maximum bipartite matching
  - Assignment problems
  - Job scheduling
- **When to Choose:**
  - Bipartite graph matching
  - Better than Ford-Fulkerson for bipartite
  - Sparse graphs

### Max-Flow Min-Cut Theorem Applications
- **Time Complexity:** Same as underlying max-flow algorithm
- **Key Use Cases:**
  - Image segmentation (graph cuts)
  - Computer vision
  - Parallel computing
  - VLSI design

---
  related-skills: programming-abl-v10-learning, programming-abl-v12-learning

## Dynamic Programming

### 0/1 Knapsack Problem
- **Time Complexity:** O(nW) where W = capacity
- **Space Complexity:** O(nW) or O(W) (optimized)
- **Key Use Cases:**
  - Resource allocation
  - Investment portfolio
  - Container packing
  - Knapsack variations
- **When to Choose:**
  - Items can only be taken once
  - Capacity constraint
  - Optimal substructure exists
- **Variants:**
  - Unbounded knapsack (unlimited items)
  - Bounded knapsack (limited quantities)
  - Multiple knapsack
  - Fractional knapsack (greedy, not DP)
- **Optimizations:**
  - Space optimization (1D array)
  - Pruning based on bounds
  - Meet-in-the-middle for large n

### Longest Common Subsequence (LCS)
- **Time Complexity:** O(mn) where m, n = string lengths
- **Space Complexity:** O(mn) or O(min(m, n))
- **Key Use Cases:**
  - Diff utilities
  - Bioinformatics (DNA matching)
  - Version control
  - Plagiarism detection
- **When to Choose:**
  - Two sequences common subsequence
  - Order matters, continuity not required
  - Not suitable for substring (use KMP/Rabin-Karp)
- **Reconstruction:**
  - Track decisions during DP
  - Backtrack to build actual LCS
- **Optimizations:**
  - Hirschberg's algorithm: O(min(m,n)) space
  - Early termination if no match

### Longest Increasing Subsequence (LIS)
- **Time Complexity:** O(n²) (DP) or O(n log n) (patience sorting)
- **Space Complexity:** O(n)
- **Key Use Cases:**
  - Pattern recognition
  - Stock market analysis
  - Bioinformatics
  - Data smoothing
- **When to Choose:**
  - Strictly increasing (or non-decreasing)
  - Need longest monotonic subsequence
- **O(n log n) Method:**
  - Maintain active lists
  - Binary search for insertion
  - Track predecessors for reconstruction
- **Variants:**
  - Longest decreasing subsequence
  - Bitonic subsequence
  - Circular variant

### Matrix Chain Multiplication
- **Time Complexity:** O(n³)
- **Space Complexity:** O(n²)
- **Key Use Cases:**
  - Optimal parenthesization
  - Compiler optimization
  - Dynamic programming example
- **When to Choose:**
  - Matrix multiplication order
  - Minimize scalar multiplications
  - All matrices compatible
- **Optimizations:**
  - Store optimal split points
  - Reconstruction for actual multiplication order

### Edit Distance (Levenshtein)
- **Time Complexity:** O(mn)
- **Space Complexity:** O(mn) or O(min(m,n))
- **Key Use Cases:**
  - Spell checking
  - DNA sequence alignment
  - Fuzzy string matching
  - Version control
- **When to Choose:**
  - Minimum edits to transform string A to B
  - Insert, delete, replace operations
- **Variants:**
  - Hamming distance (same length, replace only)
  - Damerau-Levenshtein (adjacent swap)
  - Wagner-Fischer (generalization)
- **Optimizations:**
  - Space optimization
  - Early termination for small distances

### Coin Change Problem
- **Time Complexity:** O(n * amount) where n = coin types
- **Space Complexity:** O(amount)
- **Key Use Cases:**
  - Making change (min coins)
  - Combinatorial counting
  - Resource allocation
- **When to Choose:**
  - Minimize number of coins
  - Count ways to make amount
  - DP applies (optimal substructure)
- **Variants:**
  - Minimum coins (0/1 or unlimited)
  - Count combinations
  - With limited coins
  - Greedy doesn't always work

### Subset Sum Problem
- **Time Complexity:** O(n * sum) or O(n * 2^(n/2)) (meet-in-middle)
- **Space Complexity:** O(n * sum)
- **Key Use Cases:**
  - Scheduling
  - Resource allocation
  - Cryptography
  - NP-complete problems
- **When to Choose:**
  - Find subset with given sum
  - Decision problem (existential)
  - Optimization variant exists
- **Optimizations:**
  - Meet-in-the-middle for large n
  - Bitset optimization
  - Pseudo-polynomial DP

### Traveling Salesman Problem (Dynamic Programming)
- **Time Complexity:** O(n² * 2^n)
- **Space Complexity:** O(n * 2^n)
- **Key Use Cases:**
  - Exact TSP for small n
  - Algorithm comparison
  - Benchmarking
- **When to Choose:**
  - n < 20-25
  - Need exact solution
  - Not suitable for large n
- **Held-Karp Algorithm:**
  - DP with bitmask
  - Track visited set and last city

### Partition Problem
- **Time Complexity:** O(n * sum)
- **Space Complexity:** O(sum)
- **Key Use Cases:**
  - Fair division
  - Load balancing
  - NP-complete problems
- **When to Choose:**
  - Split into equal-sum subsets
  - Decision variant
  - Optimization (minimize difference)

### Longest Palindromic Subsequence
- **Time Complexity:** O(n²)
- **Space Complexity:** O(n²)
- **Key Use Cases:**
  - Palindrome analysis
  - Bioinformatics
  - String algorithms
- **When to Choose:**
  - Find longest palindromic subsequence
  - Not substring (LPS can skip chars)
- **Variants:**
  - Longest palindromic substring (manacher's O(n))
  - Minimum deletions to make palindrome

### Word Break Problem
- **Time Complexity:** O(n²) with dictionary lookup
- **Space Complexity:** O(n)
- **Key Use Cases:**
  - Text segmentation
  - Dictionary matching
  - Natural language processing
- **When to Choose:**
  - Can string be segmented into dictionary words?
  - Count all possible segmentations
- **Optimizations:**
  - Trie for dictionary lookup
  - Memoization
  - Early termination

### Wildcard Pattern Matching
- **Time Complexity:** O(mn)
- **Space Complexity:** O(mn) or O(min(m,n))
- **Key Use Cases:**
  - Regex matching
  - File pattern matching
  - Text processing
- **When to Choose:**
  - Pattern with ? and * wildcards
  - Match against text
- **Variants:**
  - Regex with character classes
  - Case sensitivity
  - Multiline support

### Unique Paths
- **Time Complexity:** O(mn)
- **Space Complexity:** O(mn) or O(min(m,n))
- **Key Use Cases:**
  - Grid path counting
  - Combinatorics
  - Robot motion planning
- **When to Choose:**
  - Grid with obstacles
  - Count paths from top-left to bottom-right
  - Only right/down moves allowed
- **Variants:**
  - With obstacles (grid[i][j] = 1 blocked)
  - With costs (minimum cost path)
  - With forbidden cells

### Egg Dropping Puzzle
- **Time Complexity:** O(n * k²) or O(n * log k)
- **Space Complexity:** O(nk)
- **Key Use Cases:**
  - Testing/quality assurance
  - Optimization under uncertainty
  - Decision theory
- **When to Choose:**
  - Minimize trials to find critical floor
  - k eggs, n floors
  - Binary search when 2 eggs

### Catalan Numbers Applications
- **Time Complexity:** O(n²) for DP, O(n) for formula
- **Space Complexity:** O(n)
- **Key Use Cases:**
  - Parentheses matching
  - Binary tree counting
  - Polygon triangulation
  - Dyck paths
- **When to Choose:**
  - Problems with Catalan structure
  - Combinatorial counting
  - Recursive structure
- **Applications:**
  - n pairs of valid parentheses
  - n+1 leaves in full binary tree
  - n×n grid monotonic paths
  - Convex polygon triangulation

### Optimal Binary Search Tree
- **Time Complexity:** O(n³)
- **Space Complexity:** O(n²)
- **Key Use Cases:**
  - Compiler design
  - Database indexing
  - Optimal search structure
- **When to Choose:**
  - Given probabilities, build optimal BST
  - Minimize search cost
  - Static search set
- **Optimizations:**
  - Knuth's optimization (if quadrangle inequality)
  - O(n²) with Knuth optimization

### Bitmask DP Applications
- **Time Complexity:** O(n * 2^n) or O(m * 3^(n/2))
- **Space Complexity:** O(2^n)
- **Key Use Cases:**
  - Subset problems
  - Graph problems (TSP, Hamiltonian)
  - Set cover
- **When to Choose:**
  - n < 20-25
  - Subsets or states can be encoded as bitmask
  - State space is 2^n

### DP on Trees
- **Time Complexity:** O(V) for simple, O(V * k²) for k-state
- **Space Complexity:** O(V)
- **Key Use Cases:**
  - Tree diameter
  - Tree center
  - Tree coloring
  - Tree independence
- **When to Choose:**
  - Tree structure
  - Root the tree arbitrarily
  - Combine children's results
- **Common Patterns:**
  - Tree diameter (two DFS)
  - Tree center (eccentricity)
  - Tree isomorphism
  - Tree knapsack

### DP with Bitwise Operations
- **Time Complexity:** Varies
- **Space Complexity:** Varies
- **Key Use Cases:**
  - Subset XOR sums
  - Bit manipulation problems
  - State compression
- **When to Choose:**
  - Bitwise operations on subsets
  - XOR-based problems
  - Bitmask DP

---
  related-skills: programming-abl-v10-learning, programming-abl-v12-learning

## Greedy Algorithms

### Activity Selection Problem
- **Time Complexity:** O(n log n) (sorting) or O(n) (if sorted)
- **Space Complexity:** O(1) extra
- **Key Use Cases:**
  - Scheduling resources
  - Meeting room allocation
  - Single-resource scheduling
- **When to Choose:**
  - Select maximum non-overlapping activities
  - Greedy choice works (earliest finish time)
  - Not for weighted activities (need DP)

### Huffman Coding
- **Time Complexity:** O(n log n) (priority queue)
- **Space Complexity:** O(n)
- **Key Use Cases:**
  - Data compression
  - Prefix codes
  - Optimal binary encoding
- **When to Choose:**
  - Character frequencies known
  - Minimal expected codeword length
  - Prefix-free encoding needed
- **Algorithm:**
  - Build frequency table
  - Create min-heap of nodes
  - Combine two smallest frequencies
  - Build tree and assign codes

### Kruskal's MST (Greedy)
- **Time Complexity:** O(E log E)
- **Space Complexity:** O(V)
- **Key Use Cases:**
  - Minimum spanning tree
  - Network design
  - Clustering
- **When to Choose:**
  - Sparse graphs
  - Edge-based processing
  - Union-find available

### Prim's MST (Greedy)
- **Time Complexity:** O(V²) or O(E log V)
- **Space Complexity:** O(V)
- **Key Use Cases:**
  - Minimum spanning tree
  - Dense graphs
  - Vertex-based processing
- **When to Choose:**
  - Dense graphs
  - Adjacency matrix
  - Vertex expansion

### Dijkstra's Algorithm (Greedy)
- **Time Complexity:** O((V + E) log V)
- **Space Complexity:** O(V)
- **Key Use Cases:**
  - Shortest path (non-negative)
  - Routing
  - Network optimization
- **When to Choose:**
  - Non-negative edge weights
  - Single source
  - Greedy choice (shortest known distance)

### Fractional Knapsack
- **Time Complexity:** O(n log n) (sorting)
- **Space Complexity:** O(1) extra
- **Key Use Cases:**
  - Resource allocation
  - Maximizing value with weight limit
  - Continuous items
- **When to Choose:**
  - Items can be split
  - Value/weight ratio matters
  - Not 0/1 knapsack (needs DP)

### Job Sequencing with Deadlines
- **Time Complexity:** O(n²) or O(n log n) with union-find
- **Space Complexity:** O(n)
- **Key Use Cases:**
  - Job scheduling
  - Profit maximization
  - Deadline constraints
- **When to Choose:**
  - Jobs with deadlines and profits
  - One unit time per job
  - Maximize total profit

### Coin Change (Greedy)
- **Time Complexity:** O(n) where n = number of coins
- **Space Complexity:** O(1)
- **Key Use Cases:**
  - Standard currency systems
  - USD, EUR coin systems
  - Greedy-valid denominations
- **When to Choose:**
  - Greedy-valid currency (US, EUR)
  - Not for arbitrary denominations
  - Check if greedy works first

### Graph Coloring (Greedy)
- **Time Complexity:** O(V + E)
- **Space Complexity:** O(V)
- **Key Use Cases:**
  - Register allocation
  - Scheduling
  - Map coloring
- **When to Choose:**
  - Approximation needed
  - Order matters
  - Not optimal but fast

### Stable Marriage Problem (Gale-Shapley)
- **Time Complexity:** O(n²)
- **Space Complexity:** O(n²)
- **Key Use Cases:**
  - Hospital-resident matching
  - School choice
  - Two-sided matching
- **When to Choose:**
  - Two sets with preferences
  - Stable matching required
  - Men-optimal/women-optimal

### Minimum Spanning Tree (General)
- **Time Complexity:** O(E log V)
- **Space Complexity:** O(V)
- **Key Use Cases:**
  - Network design
  - Approximation algorithms
  - Clustering
- **When to Choose:**
  - Connected, undirected graph
  - Minimum total edge weight
  - Greedy algorithms work

### Job Scheduler (Shortest Job First)
- **Time Complexity:** O(n log n) (priority queue)
- **Space Complexity:** O(n)
- **Key Use Cases:**
  - Process scheduling
  - Batch processing
  - Minimize average wait time
- **When to Choose:**
  - Process burst times known
  - Minimize average waiting time
  - Non-preemptive or preemptive

### Interval Scheduling (Weighted)
- **Time Complexity:** O(n log n) with binary search
- **Space Complexity:** O(n)
- **Key Use Cases:**
  - Resource allocation with weights
  - Profit maximization
  - Job selection
- **When to Choose:**
  - Weighted activities
  - Non-overlapping subset
  - Greedy doesn't work, use DP

---
  related-skills: programming-abl-v10-learning, programming-abl-v12-learning

## String Algorithms

### KMP (Knuth-Morris-Pratt)
- **Time Complexity:** O(n + m) where n = text, m = pattern
- **Space Complexity:** O(m) (LPS array)
- **Key Use Cases:**
  - Pattern matching
  - DNA sequence search
  - Text editors
  - Security scanning
- **When to Choose:**
  - Multiple pattern occurrences
  - Pattern has repetitions
  - Need linear time guarantee
  - Preprocessing pattern allowed
- **LPS Array:**
  - Longest proper prefix which is also suffix
  - Avoids re-comparing characters

### Rabin-Karp
- **Time Complexity:** O(n + m) average, O(nm) worst
- **Space Complexity:** O(1) (constant operations)
- **Key Use Cases:**
  - Plagiarism detection
  - Multi-pattern matching
  - String hashing
  - Duplicate detection
- **When to Choose:**
  - Multiple patterns to search
  - Rolling hash useful
  - Average case acceptable
  - Hash collisions manageable

### Boyer-Moore
- **Time Complexity:** O(n/m * m!) worst, O(n/m) average
- **Space Complexity:** O(σ) where σ = alphabet size
- **Key Use Cases:**
  - Large alphabet (ASCII, Unicode)
  - Large text, small pattern
  - Text editors (grep)
  - Bioinformatics
- **When to Choose:**
  - Large alphabet (letters, not just ACGT)
  - Pattern near end of text
  - Good heuristic behavior
  - Not for small alphabet

### Z-Algorithm
- **Time Complexity:** O(n + m)
- **Space Complexity:** O(n + m)
- **Key Use Cases:**
  - Pattern matching
  - String prefix matching
  - String repetition detection
  - Concatenation problems
- **When to Choose:**
  - Z-array computation
  - Prefix matching
  - Alternative to KMP
  - Suffix matching with sentinel

### Manacher's Algorithm
- **Time Complexity:** O(n)
- **Space Complexity:** O(n)
- **Key Use Cases:**
  - Longest palindromic substring
  - All palindromes in string
  - Palindrome density
- **When to Choose:**
  - Linear time palindrome
  -Substring (not subsequence)
  - All palindromes needed
- **Key Insight:**
  - Uses symmetry to avoid re-computation
  - Expands around centers with memoization

### Suffix Array
- **Time Complexity:** O(n log n) (sort) or O(n) (SAIS)
- **Space Complexity:** O(n)
- **Key Use Cases:**
  - Pattern matching (with binary search)
  - Burrows-Wheeler transform
  - Data compression
  - Genomics
- **When to Choose:**
  - Multiple queries on same text
  - Memory efficiency
  - LCP array for additional queries
  - Alternative to suffix tree
- **Construction:**
  - Sorting all suffixes
  - Radix sort for O(n)
  - DC3 algorithm for O(n)

### Suffix Tree (Ukkonen's)
- **Time Complexity:** O(n)
- **Space Complexity:** O(n)
- **Key Use Cases:**
  - Fast pattern matching
  - Longest repeated substring
  - Substring queries
  - Bioinformatics
- **When to Choose:**
  - Single query, fast lookup
  - Multiple pattern queries
  - Space permits
  - Complex query support
- **Applications:**
  - Longest repeated substring
  - Longest common substring
  - Palindrome detection

### Rolling Hash (Rabin-Karp)
- **Time Complexity:** O(1) per shift
- **Space Complexity:** O(1)
- **Key Use Cases:**
  - Rabin-Karp
  - String matching
  - Duplicate detection
  - Streaming
- **When to Choose:**
  - Multiple substring hashes needed
  - Window sliding
  - Hash collision handling

### Longest Prefix Suffix (LPS) / Failure Function
- **Time Complexity:** O(m)
- **Space Complexity:** O(m)
- **Key Use Cases:**
  - KMP algorithm
  - String border
  - Periodicity detection
- **When to Choose:**
  - KMP preprocessing
  - String borders
  - Pattern analysis

### Boyer-Moore-Horspool
- **Time Complexity:** O(n) average
- **Space Complexity:** O(σ)
- **Key Use Cases:**
  - Simplified Boyer-Moore
  - Text search
  - Binary files
- **When to Choose:**
  - Simpler than Boyer-Moore
  - Good average performance
  - Fixed alphabet

### Apostolico-Giancarlo
- **Time Complexity:** O(n) average
- **Space Complexity:** O(m)
- **Key Use Cases:**
  - Speeding up KMP
  - Avoiding re-comparisons
  - Pattern matching
- **When to Choose:**
  - KMP with early termination
  - Memory bandwidth limited
  - Large pattern

### Multiple Pattern Matching (Aho-Corasick)
- **Time Complexity:** O(n + m + z) where z = matches
- **Space Complexity:** O(m * σ)
- **Key Use Cases:**
  - Multiple keywords
  - Security scanning
  - Text processing
  - intrusion detection
- **When to Choose:**
  - Multiple patterns (3+)
  - All occurrences needed
  - Linear time in text length
  - Dictionary matching
- **Structure:**
  - Trie with failure links
  - Output function

### Suffix Trie
- **Time Complexity:** O(m) for query
- **Space Complexity:** O(m * σ^m) (exponential)
- **Key Use Cases:**
  - Educational
  - Small strings only
  - Pattern matching
- **When to Choose:**
  - Never for production
  - Only for small m
  - Understand suffix trees

### Longest Repeated Substring
- **Time Complexity:** O(n) (suffix tree) or O(n log n) (suffix array)
- **Space Complexity:** O(n)
- **Key Use Cases:**
  - Plagiarism detection
  - DNA analysis
  - Code duplication
- **When to Choose:**
  - Repeat detection
  - Suffix tree/array available
  - Overlapping allowed or not

### Longest Common Substring
- **Time Complexity:** O(n + m) (suffix tree) or O(nm) (DP)
- **Space Complexity:** O(n + m)
- **Key Use Cases:**
  - DNA comparison
  - File diff
  - Code similarity
- **When to Choose:**
  - Contiguous match
  - Suffix tree/array for linear
  - DP for simplicity
- **DP Approach:**
  - Table[i][j] = length of common substring ending at i, j
  - Maximum value is answer

### Palindromic Tree (Eertree)
- **Time Complexity:** O(n)
- **Space Complexity:** O(n)
- **Key Use Cases:**
  - All palindromes in string
  - Palindrome counting
  - Palindromic density
- **When to Choose:**
  - All palindromes
  - Online algorithm
  - Memory efficient
- **Structure:**
  - Two roots (even/odd length)
  - Suffix links
  - Palindromic nodes

### String Matching with Wildcards
- **Time Complexity:** O(mn)
- **Space Complexity:** O(mn)
- **Key Use Cases:**
  - Shell globbing
  - File matching
  - Query patterns
- **When to Choose:**
  - Pattern with ? and *
  - DP approach
  - Memoization for optimization

---
  related-skills: programming-abl-v10-learning, programming-abl-v12-learning

## Mathematical Algorithms

### Euclidean GCD
- **Time Complexity:** O(log min(a, b))
- **Space Complexity:** O(1) iterative, O(log n) recursive
- **Key Use Cases:**
  - Simplifying fractions
  - LCM calculation
  - Cryptography
  - Number theory
- **When to Choose:**
  - Greatest common divisor
  - Euclidean algorithm
  - Binary GCD alternative for bit operations
- **Extensions:**
  - Extended GCD (Bezout coefficients)
  - Multiple number GCD
  - LCM = (a * b) / GCD(a, b)

### Binary Exponentiation (Fast Power)
- **Time Complexity:** O(log n)
- **Space Complexity:** O(log n) recursive, O(1) iterative
- **Key Use Cases:**
  - Power computation
  - Matrix exponentiation
  - Modular exponentiation
  - Fibonacci numbers
- **When to Choose:**
  - Large exponents
  - Modular arithmetic
  - Matrix powers
  - Exponentiation by squaring
- **Variants:**
  - Iterative implementation
  - Modular exponentiation (a^b mod m)
  - Matrix exponentiation
  - Fast Fibonacci (O(log n))

### Sieve of Eratosthenes
- **Time Complexity:** O(n log log n)
- **Space Complexity:** O(n)
- **Key Use Cases:**
  - Prime generation
  - Primality testing
  - Number theory
  - Cryptography preprocessing
- **When to Choose:**
  - Generate primes up to n
  - Multiple primality tests
  - Sieve is better for batch
- **Optimizations:**
  - Sieve of Atkin (O(n / log log n))
  - Segmented sieve (for large n)
  - Only odd numbers
  - Bitset compression

### Extended Euclidean Algorithm
- **Time Complexity:** O(log min(a, b))
- **Space Complexity:** O(log n)
- **Key Use Cases:**
  - Modular inverse
  - Bezout coefficients
  - Chinese Remainder Theorem
  - RSA cryptography
- **When to Choose:**
  - Find x, y such that ax + by = GCD(a, b)
  - Modular inverse exists
  - Linear Diophantine equations

### Miller-Rabin Primality Test
- **Time Complexity:** O(k * log³ n) where k = iterations
- **Space Complexity:** O(1)
- **Key Use Cases:**
  - Large number primality
  - Cryptography
  - Probabilistic testing
  - BigInteger libraries
- **When to Choose:**
  - Large numbers (100+ bits)
  - Probabilistic acceptable
  - Deterministic for 64-bit (specific bases)
- **Deterministic:**
  - For n < 2^64, specific bases guarantee correctness
  - Common bases: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37

### Lucas-Lehmer Primality Test
- **Time Complexity:** O(log² p) for Mersenne number M_p
- **Space Complexity:** O(log p)
- **Key Use Cases:**
  - Mersenne primes
  - Large prime discovery
  - GIMPS
- **When to Choose:**
  - Mersenne numbers (2^p - 1)
  - specifically for Mersenne primes
  - Deterministic for Mersenne

### Modular Arithmetic
- **Key Operations:**
  - Addition: (a + b) mod m
  - Multiplication: (a * b) mod m
  - Division: a * mod_inverse(b, m) mod m
  - Subtraction: (a - b + m) mod m
- **When to Choose:**
  - Avoid overflow
  - Cryptography
  - Large number arithmetic

### Fast Fourier Transform (FFT)
- **Time Complexity:** O(n log n)
- **Space Complexity:** O(n)
- **Key Use Cases:**
  - Polynomial multiplication
  - Signal processing
  - Large integer multiplication
  - Convolution
- **When to Choose:**
  - Polynomial multiplication
  - Convolution theorem
  - Signal analysis
  - Circular convolution

### Karatsuba Multiplication
- **Time Complexity:** O(n^log₂3) ≈ O(n^1.585)
- **Space Complexity:** O(n)
- **Key Use Cases:**
  - Large integer multiplication
  - divide and conquer
  - Algorithm comparison
- **When to Choose:**
  - Large integers (beyond native type)
  - Recursive approach
  - Better than O(n²) for big n

### Strassen's Matrix Multiplication
- **Time Complexity:** O(n^log₂7) ≈ O(n^2.807)
- **Space Complexity:** O(n²)
- **Key Use Cases:**
  - Large matrix multiplication
  - Divide and conquer
  - Algorithm comparison
- **When to Choose:**
  - Large matrices
  - Beyond naive O(n³)
  - Space for recursion
  - Crossover point exists (n > 100-1000)

### Chinese Remainder Theorem
- **Time Complexity:** O(k * log² n) where k = congruences
- **Space Complexity:** O(k)
- **Key Use Cases:**
  - Modular arithmetic
  - Cryptography (RSA)
  - Large number computation
  - Number theory
- **When to Choose:**
  - System of congruences
  - Pairwise coprime moduli
  - Reconstruct from remainders
  - CRT optimization

### Discrete Logarithm
- **Algorithms:**
  - Brute force: O(n)
  - Baby-step Giant-step: O(√n) time/space
  - Pollard's rho: O(√n) time, O(1) space
  - Pohlig-Hellman: for smooth order
- **When to Choose:**
  - Solve a^x ≡ b (mod n)
  - Cryptography (Diffie-Hellman, ECC)
  - Group theory
- **Baby-step Giant-step:**
  - Time: O(√n)
  - Space: O(√n)
  - Precompute baby steps

### BigInteger Arithmetic
- **Algorithms:**
  - Addition: O(n)
  - Multiplication: O(n²) naive, O(n^1.585) Karatsuba
  - Division: O(n²) long division
  - GCD: O(log n) Euclidean
- **When to Choose:**
  - Arbitrary precision
  - Libraries available (GMP, BigInteger)
  - Algorithm selection based on size

### Polygon Area (Shoelace Formula)
- **Time Complexity:** O(n) where n = vertices
- **Space Complexity:** O(1)
- **Key Use Cases:**
  - Geometry
  - Computer graphics
  - Geographic information
- **When to Choose:**
  - Simple polygon area
  - Vertices in order
  - Positive for CCW, negative for CW

### Point in Polygon (Ray Casting)
- **Time Complexity:** O(n) where n = polygon vertices
- **Space Complexity:** O(1)
- **Key Use Cases:**
  - Graphics
  - GIS
  - Collision detection
- **When to Choose:**
  - Point containment
  - Simple polygons
  -射线投射法

### Convex Hull (Graham Scan)
- **Time Complexity:** O(n log n)
- **Space Complexity:** O(n)
- **Key Use Cases:**
  - Computational geometry
  - Collision detection
  - Pattern recognition
  - Image processing
- **When to Choose:**
  - Convex hull needed
  - Points in plane
  - Graham scan or Andrew's monotone chain
- **Andrew's Chain:**
  - Sort by x, then y
  - Upper and lower hulls
  - O(n log n), numerically stable

### Convex Hull (Jarvis March / Gift Wrapping)
- **Time Complexity:** O(nh) where h = hull vertices
- **Space Complexity:** O(h)
- **Key Use Cases:**
  - Few hull vertices
  - Adaptive algorithms
  - Incremental
- **When to Choose:**
  - h << n (few hull points)
  - Output-sensitive
  - Simple implementation

### Line Segment Intersection
- **Algorithms:**
  - Brute force: O(n²)
  - Sweep line (Bentley-Ottmann): O((n + k) log n)
- **Key Use Cases:**
  - GIS
  - CAD
  - Collision detection
- **When to Choose:**
  - Line segment intersection
  - Sweep line for many intersections

### Closest Pair of Points
- **Time Complexity:** O(n log n)
- **Space Complexity:** O(n)
- **Key Use Cases:**
  - Computational geometry
  - Graphics
  - Clustering
- **When to Choose:**
  - 2D closest pair
  - Divide and conquer
  - Not for high dimensions (curse of dimensionality)

### Farthest Pair of Points (Diameter)
- **Time Complexity:** O(n log n) (rotating calipers on convex hull)
- **Space Complexity:** O(n)
- **Key Use Cases:**
  -Bounding box
  - Clustering
  - Shape analysis
- **When to Choose:**
  - Convex hull first
  - Rotating calipers
  - Diameter of point set

### Triangulation (Ear Clipping)
- **Time Complexity:** O(n²) for simple polygon
- **Space Complexity:** O(n)
- **Key Use Cases:**
  - Computer graphics
  - Finite element analysis
  - Game development
- **When to Choose:**
  - Simple polygon triangulation
  - O(n²) acceptable
  - Simple implementation
- **Alternative:**
  - Monotone partitioning: O(n log n)
  - Triangulation by diagonal

### Delaunay Triangulation
- **Time Complexity:** O(n log n)
- **Space Complexity:** O(n)
- **Key Use Cases:**
  - Mesh generation
  - Interpolation
  - Terrain modeling
- **When to Choose:**
  - Maximum minimum angle
  - Circumcircle property
  - Voronoi dual

### Voronoi Diagram
- **Time Complexity:** O(n log n)
- **Space Complexity:** O(n)
- **Key Use Cases:**
  - Nearest neighbor
  - Facility location
  - GIS
  - Biology (cell modeling)
- **When to Choose:**
  - Nearest site queries
  - Partitioning plane
  - Delaunay dual

### Line Clipping (Cohen-Sutherland)
- **Time Complexity:** O(n) where n = line segments
- **Space Complexity:** O(1)
- **Key Use Cases:**
  - Graphics
  - Rendering
  - Clipping windows
- **When to Choose:**
  - Rectangle clipping
  - Code-based
  - Simple implementation
- **Alternative:**
  - Liang-Barsky: O(n) with fewer divisions
  - Cyrus-Beck: general convex clip

### Sutherland-Hodgman Clipping
- **Time Complexity:** O(n * m) where n = polygon, m = clip window
- **Space Complexity:** O(n)
- **Key Use Cases:**
  - Polygon clipping
  - Graphics
  - GIS
- **When to Choose:**
  - Convex clip window
  - Polygon clipping
  - Simple implementation

### Point in Convex Polygon
- **Time Complexity:** O(log n) with preprocessing, O(n) without
- **Space Complexity:** O(n)
- **Key Use Cases:**
  - Graphics
  - Collision detection
  - GIS
- **When to Choose:**
  - Convex polygon
  - Multiple queries
  - Binary search on angles

### Rotating Calipers
- **Time Complexity:** O(n) after convex hull
- **Space Complexity:** O(n)
- **Key Use Cases:**
  - Convex hull diameter
  - Minimum width
  - Minimum area rectangle
  - All antipodal pairs
- **When to Choose:**
  - Convex polygon properties
  - Antipodal pairs
  - After convex hull

### Cross Product Applications
- **Time Complexity:** O(1)
- **Space Complexity:** O(1)
- **Key Use Cases:**
  - Collinearity
  - Polygon orientation
  - Point line position
  - Convexity testing
- **When to Choose:**
  - 2D geometry
  - Orientation test
  - Signed area

### Dot Product Applications
- **Time Complexity:** O(1)
- **Space Complexity:** O(1)
- **Key Use Cases:**
  - Angle calculation
  - Projection
  - Perpendicular
  - Work calculation
- **When to Choose:**
  - Angle between vectors
  - Projection length
  - Orthogonality

### Polygon Classification
- **Time Complexity:** O(n)
- **Space Complexity:** O(1)
- **Key Use Cases:**
  - Geometry validation
  - Graphics
  - GIS
- **When to Choose:**
  - Convex/concave
  - Simple/complex
  - Orientation

### Centroid Calculation
- **Time Complexity:** O(n) where n = vertices
- **Space Complexity:** O(1)
- **Key Use Cases:**
  - Center of mass
  - Graphics
  - Physics simulation
- **When to Choose:**
  - Polygon centroid
  - Weighted average
  - Triangle centroid

### Distance from Point to Line/Segment
- **Time Complexity:** O(1)
- **Space Complexity:** O(1)
- **Key Use Cases:**
  - Collision detection
  - Graphics
  - GIS
- **When to Choose:**
  - Shortest distance
  - Line or segment
  - Perpendicular projection

### Angle Between Three Points
- **Time Complexity:** O(1)
- **Space Complexity:** O(1)
- **Key Use Cases:**
  - Geometry analysis
  - Graphics
  - Robot kinematics
- **When to Choose:**
  - Turn angle
  - Interior angle
  - Vector angle

### Circle Operations
- **Time Complexity:** O(1)
- **Space Complexity:** O(1)
- **Key Use Cases:**
  - Circle intersection
  - Point in circle
  - Tangent lines
- **When to Choose:**
  - Circle geometry
  - Distance comparison
  - Quadratic equations

### Line-Circle Intersection
- **Time Complexity:** O(1)
- **Space Complexity:** O(1)
- **Key Use Cases:**
  - Collision detection
  - Graphics
  - Physics
- **When to Choose:**
  - Find intersection points
  - 0, 1, or 2 intersections
  - Quadratic formula

### Circle-Circle Intersection
- **Time Complexity:** O(1)
- **Space Complexity:** O(1)
- **Key Use Cases:**
  - Venn diagrams
  - Collision detection
  - Geometry
- **When to Choose:**
  - Two circles intersection
  - 0, 1, 2, or infinite points
  - Distance between centers

### Triangle Centers
- **Time Complexity:** O(1)
- **Space Complexity:** O(1)
- **Key Use Cases:**
  - Geometry
  - Graphics
  - Engineering
- **Centers:**
  - Centroid (medians)
  - Circumcenter (perpendicular bisectors)
  - Incenter (angle bisectors)
  - Orthocenter (altitudes)

### Polygon Triangulation (Monotone Partition)
- **Time Complexity:** O(n log n)
- **Space Complexity:** O(n)
- **Key Use Cases:**
  - Efficient triangulation
  - Graphics
  - Finite elements
- **When to Choose:**
  - Better than ear clipping
  - O(n log n) guarantee
  - Monotone polygons easy

### Convex Polygon Union
- **Time Complexity:** O(n + m)
- **Space Complexity:** O(n + m)
- **Key Use Cases:**
  - Computational geometry
  - Graphics
  - GIS
- **When to Choose:**
  - Two convex polygons
  - Merge hulls
  - Linear time after convex hull

### Minkowski Sum
- **Time Complexity:** O(nm) or O(n log n + m log m)
- **Space Complexity:** O(n + m)
- **Key Use Cases:**
  - Robotics (configuration space)
  - Collision detection
  - Morphological operations
- **When to Choose:**
  - Sum of two polygons
  - Configuration space obstacle
  - Motion planning

### Line Intersection (General)
- **Time Complexity:** O(1)
- **Space Complexity:** O(1)
- **Key Use Cases:**
  - CAD
  - Graphics
  - Geometry
- **When to Choose:**
  - Two lines intersection
  - Parametric form
  - Determinant method

### Segment-Segment Intersection
- **Time Complexity:** O(1)
- **Space Complexity:** O(1)
- **Key Use Cases:**
  - Collision detection
  - Graphics
  - GIS
- **When to Choose:**
  - Finite segments
  - Parametric with bounds
  - Orientation tests

### Polygon Boolean Operations
- **Algorithms:**
  - CGAL library
  - Greiner-Hormann
  - Sutherland-Hodgman (limited)
- **Time Complexity:** O(n log n)
- **Space Complexity:** O(n)
- **Key Use Cases:**
  - CAD
  - GIS
  - Graphics
- **When to Choose:**
  - Union, intersection, difference
  - Complex polygons
  - Library recommended

---
  related-skills: programming-abl-v10-learning, programming-abl-v12-learning

## Backtracking Algorithms

### N-Queens Problem
- **Time Complexity:** O(N!) worst, O(N^N) with pruning
- **Space Complexity:** O(N²) or O(N) with 1D array
- **Key Use Cases:**
  - Constraint satisfaction
  - Permutation with constraints
  - Algorithm demonstration
- **When to Choose:**
  - Place N queens on NxN board
  - No two queens attack
  - Backtracking with pruning
- **Optimizations:**
  - 1D array (column positions)
  - Symmetry breaking
  - Bitmask for O(1) check
  - Warnsdorff's heuristic (for knights tour)

### Sudoku Solver
- **Time Complexity:** O(9^81) worst, much better with pruning
- **Space Complexity:** O(81) = O(1)
- **Key Use Cases:**
  - Constraint satisfaction
  - Puzzle solving
  - Logic puzzles
- **When to Choose:**
  - Fill 9x9 grid
  - Row, column, 3x3 box constraints
  - Backtracking with constraint propagation
- **Optimizations:**
  - Least constraining value
  - MRV (minimum remaining values)
  - Forward checking
  - Bitmask for quick check

### Rat in Maze
- **Time Complexity:** O(2^(n+m)) worst
- **Space Complexity:** O(nm)
- **Key Use Cases:**
  - Path finding
  - Maze generation
  - Educational
- **When to Choose:**
  - Find path from start to end
  - Obstacles in grid
  - All paths or just one
- **Variants:**
  - Find all paths
  - Shortest path (BFS)
  - Multiple rats

### Knight's Tour
- **Time Complexity:** O(8^n) for n moves
- **Space Complexity:** O(n²)
- **Key Use Cases:**
  - Hamiltonian path on chessboard
  - Backtracking example
  - Performance benchmarking
- **When to Choose:**
  - Visit every square once
  - Knight moves only
  - Open or closed tour
- **Optimizations:**
  - Warnsdorff's heuristic (fewest onward moves)
  - Dividing board
  - Parallel search

### Subset Sum
- **Time Complexity:** O(2^n) worst, O(n * sum) DP
- **Space Complexity:** O(n) or O(n * sum)
- **Key Use Cases:**
  - Resource allocation
  - Cryptography
  - NP-complete problems
- **When to Choose:**
  - Find subset with given sum
  - Decision or optimization
  - Backtracking for small n
- **Alternatives:**
  - DP for pseudo-polynomial
  - Meet-in-the-middle for large n

### Permutation Generation
- **Time Complexity:** O(n * n!)
- **Space Complexity:** O(n) for recursion
- **Key Use Cases:**
  - Combinatorics
  - Cryptography
  - Algorithm testing
- **When to Choose:**
  - All permutations of n elements
  - Heap's algorithm (minimal changes)
  - Lexicographic order
- **Methods:**
  - Heap's algorithm
  - Lexicographic generation
  - Steinhaus-Johnson-Trotter

### Combination Generation
- **Time Complexity:** O(C(n, k) * k)
- **Space Complexity:** O(k)
- **Key Use Cases:**
  - Combinatorics
  - Probability
  - Statistics
- **When to Choose:**
  - Choose k from n
  - All combinations
  - Lexicographic or Gray code
- **Methods:**
  - Recursive generation
  - Iterative with indices
  - Bit manipulation

### Graph Coloring
- **Time Complexity:** O(m^n) where m = colors, n = vertices
- **Space Complexity:** O(n)
- **Key Use Cases:**
  - Scheduling
  - Register allocation
  - Map coloring
- **When to Choose:**
  - m-coloring problem
  - Find valid coloring
  - Backtrack with constraint checking
- **Optimizations:**
  - Degree ordering
  - Forward checking
  - Heuristic ordering

### Hamiltonian Path/Cycle
- **Time Complexity:** O(n!) worst
- **Space Complexity:** O(n)
- **Key Use Cases:**
  - Route planning
  - Network design
  - Algorithm comparison
- **When to Choose:**
  - Visit each vertex exactly once
  - Path or cycle
  - Backtracking with pruning
- **Optimizations:**
  - Degree 1 vertices first
  - Backtracking with adjacency check

### Maze Generation (Recursive Backtracking)
- **Time Complexity:** O(width * height)
- **Space Complexity:** O(width * height)
- **Key Use Cases:**
  - Game development
  - Puzzle generation
  - Procedural content
- **When to Choose:**
  - Generate perfect maze
  - All cells reachable
  - One solution
- **Algorithm:**
  - Start with grid of walls
  - Carve path recursively
  - Backtrack when stuck

### Partition Problem
- **Time Complexity:** O(2^n) or O(n * sum)
- **Space Complexity:** O(n) or O(sum)
- **Key Use Cases:**
  - Fair division
  - Load balancing
  - NP-complete
- **When to Choose:**
  - Split into equal sum subsets
  - Decision problem
  - Backtracking or DP

### Crossword Puzzle Solver
- **Time Complexity:** Exponential
- **Space Complexity:** O(word count * puzzle size)
- **Key Use Cases:**
  - Puzzle solving
  - AI application
  - Natural language
- **When to Choose:**
  - Place words in grid
  - Cross constraints
  - Backtracking with constraint satisfaction
- **Optimizations:**
  - Most constrained variable
  - Least constraining value
  - Forward checking

### Bin Packing (Backtracking)
- **Time Complexity:** Exponential
- **Space Complexity:** O(n)
- **Key Use Cases:**
  - Resource allocation
  - Container loading
  - Optimization
- **When to Choose:**
  - Pack items into bins
  - Minimize number of bins
  - Exact solution for small n
- **Alternatives:**
  - First-fit, best-fit heuristics
  - DP for special cases

### Traveling Salesman (Backtracking)
- **Time Complexity:** O(n!) or O(n² * 2^n) DP
- **Space Complexity:** O(n) or O(n * 2^n)
- **Key Use Cases:**
  - Route optimization
  - Logistics
  - Exact solution for small n
- **When to Choose:**
  - Visit all cities once
  - Return to start
  - Exact solution for n < 20-25
- **Optimizations:**
  - Branch and bound
  - Lower bound pruning
  - Symmetry breaking

---
  related-skills: programming-abl-v10-learning, programming-abl-v12-learning

## Numerical Algorithms

### Newton-Raphson Method
- **Time Complexity:** O(log precision) iterations, O(1) per iteration
- **Space Complexity:** O(1)
- **Key Use Cases:**
  - Root finding
  - Optimization (derivative = 0)
  - Nonlinear equations
  - Square roots
- **When to Choose:**
  - Function differentiable
  - Good initial guess
  - Quadratic convergence near root
  - Not for discontinuous functions
- **Optimizations:**
  - Secant method (no derivative)
  - Hybrid with bisection
  - Damped Newton
- **Applications:**
  - sqrt(x): f(y) = y² - x
  - Reciprocal: f(y) = 1/y - x
  - Optimization: find f'(x) = 0

### Bisection Method
- **Time Complexity:** O(log((b-a)/tolerance))
- **Space Complexity:** O(1)
- **Key Use Cases:**
  - Root finding (continuous functions)
  - Guaranteed convergence
  - Interval methods
- **When to Choose:**
  - Continuous function
  - Sign change in interval
  - Slow but reliable
  - Not for multiple roots in interval
- **Comparison with Newton:**
  - Bisection: guaranteed, linear convergence
  - Newton: fast but may not converge

### Gaussian Elimination
- **Time Complexity:** O(n³)
- **Space Complexity:** O(n²)
- **Key Use Cases:**
  - Solving linear systems
  - Matrix inverse
  - Determinant
  - Linear algebra
- **When to Choose:**
  - Ax = b for square matrix
  - Direct solver
  - Not for sparse large systems
- **Optimizations:**
  - Partial pivoting (avoid division by small)
  - Full pivoting (best accuracy)
  - LU decomposition reuse

### LU Decomposition
- **Time Complexity:** O(n³) factorization, O(n²) solve
- **Space Complexity:** O(n²)
- **Key Use Cases:**
  - Multiple right-hand sides
  - Matrix inverse
  - Determinant
  - Linear systems
- **When to Choose:**
  - Solve Ax = b multiple times
  - Same matrix, different b
  - Matrix invertibility check

### Cholesky Decomposition
- **Time Complexity:** O(n³/3)
- **Space Complexity:** O(n²)
- **Key Use Cases:**
  - Positive definite matrices
  - Monte Carlo simulation
  - Optimization
  - Numerical PDEs
- **When to Choose:**
  - Symmetric positive definite
  - Faster than LU
  - No pivoting needed

### Gradient Descent
- **Time Complexity:** O(iterations * n) where n = parameters
- **Space Complexity:** O(n)
- **Key Use Cases:**
  - Optimization
  - Machine learning
  - Function minimization
  - Neural networks
- **When to Choose:**
  - Differentiable function
  - Large number of parameters
  - Stochastic for big data
- **Variants:**
  - Batch gradient descent
  - Stochastic (SGD)
  - Mini-batch
  - Momentum
  - Adam, RMSProp

### Binary Search (Numerical)
- **Time Complexity:** O(log((high-low)/tolerance))
- **Space Complexity:** O(1)
- **Key Use Cases:**
  - Root finding (monotonic functions)
  - Inverse functions
  - Optimization (unimodal)
- **When to Choose:**
  - Monotonic function
  - Sign change or monotonic
  - Guaranteed convergence
  - Slower than Newton but reliable

### Simpson's Rule (Integration)
- **Time Complexity:** O(n) where n = intervals
- **Space Complexity:** O(1)
- **Key Use Cases:**
  - Numerical integration
  - Area calculation
  - Probability
- **When to Choose:**
  - Smooth functions
  - Higher accuracy than trapezoidal
  - Even number of intervals
- **Composite Simpson:**
  - Divide into subintervals
  - O(1/n⁴) error

### Trapezoidal Rule
- **Time Complexity:** O(n)
- **Space Complexity:** O(1)
- **Key Use Cases:**
  - Numerical integration
  - Approximate area
  - Simple implementation
- **When to Choose:**
  - Quick integration
  - Smooth functions
  - Simpler than Simpson
- **Comparison:**
  - Trapezoidal: O(1/n²) error
  - Simpson: O(1/n⁴) error

### Monte Carlo Integration
- **Time Complexity:** O(n) where n = samples
- **Space Complexity:** O(1)
- **Key Use Cases:**
  - High-dimensional integration
  - Complex domains
  - Statistical physics
- **When to Choose:**
  - High dimensions (d > 3)
  - Complex boundaries
  - Probabilistic error estimate
- **Advantages:**
  - Dimension doesn't affect complexity
  - Easy to parallelize
  - Error decreases as 1/√n

### Runge-Kutta Methods (RK4)
- **Time Complexity:** O(n) where n = steps
- **Space Complexity:** O(1) per step
- **Key Use Cases:**
  - ODE solving
  - Physics simulation
  - Engineering
  - Dynamics
- **When to Choose:**
  - Initial value problems
  - Fourth-order accuracy
  - Non-stiff equations
- **Standard RK4:**
  - Four slope estimates
  - Weighted average
  - O(h⁴) local error

### Jacobi Iteration
- **Time Complexity:** O(n² * iterations)
- **Space Complexity:** O(n²)
- **Key Use Cases:**
  - Linear systems
  - Sparse matrices
  - Parallel computing
- **When to Choose:**
  - Diagonally dominant
  - Sparse systems
  - Parallel implementation
- **Alternative:**
  - Gauss-Seidel (faster, but sequential)
  - SOR (Successive Over-Relaxation)

### Gauss-Seidel Iteration
- **Time Complexity:** O(n² * iterations)
- **Space Complexity:** O(n²)
- **Key Use Cases:**
  - Linear systems
  - PDE discretization
  - Iterative solver
- **When to Choose:**
  - Convergent systems
  - Better than Jacobi
  - Sequential updates

### Fixed-Point Iteration
- **Time Complexity:** O(iterations)
- **Space Complexity:** O(1)
- **Key Use Cases:**
  - Equation solving
  - Functional equations
  - Proofs
- **When to Choose:**
  - g(x) = x formulation
  - Contraction mapping
  - Simple implementation
- **Convergence:**
  - |g'(x)| < 1 near fixed point
  - Linear convergence

### Secant Method
- **Time Complexity:** O(log precision) iterations
- **Space Complexity:** O(1)
- **Key Use Cases:**
  - Root finding (no derivative)
  - Numerical analysis
  - Engineering applications
- **When to Choose:**
  - Derivative unavailable or expensive
  - Good alternative to Newton
  - Superlinear convergence

---
  related-skills: programming-abl-v10-learning, programming-abl-v12-learning

## Probabilistic Algorithms

### Bloom Filter
- **Time Complexity:** O(k) where k = hash functions
- **Space Complexity:** O(m) where m = bit array size
- **Key Use Cases:**
  - Membership testing
  - Spell checking
  - Network routers
  - Database query optimization
- **When to Choose:**
  - Allow false positives
  - No false negatives
  - Memory efficient
  - Large dataset
- **Parameters:**
  - m = bit array size
  - k = number of hash functions
  - n = expected items
  - Optimal k = (m/n) * ln(2)
- **Operations:**
  - add(x): set k bits
  - query(x): check k bits
  - No delete (counting Bloom filter allows)

### HyperLogLog
- **Time Complexity:** O(1) per update/query
- **Space Complexity:** O(log log N) where N = universe size
- **Key Use Cases:**
  - Cardinality estimation
  - Unique visitor count
  - Network traffic analysis
  - Database statistics
- **When to Choose:**
  - Estimate distinct elements
  - Massive scale (billions)
  - Small memory footprint
  - Allow ~2% error
- **Algorithm:**
  - Hash elements
  - Track maximum leading zeros
  - Harmonic mean of estimates
  - Bias correction

### Count-Min Sketch
- **Time Complexity:** O(k) per operation
- **Space Complexity:** O(k * w) where k = hash functions, w = width
- **Key Use Cases:**
  - Frequency estimation
  - Heavy hitters
  - Network monitoring
  - Text analysis
- **When to Choose:**
  - Approximate frequency
  - Overestimated (never underestimate)
  - Stream processing
  - Heavy hitters problem
- **Parameters:**
  - w = width (accuracy)
  - k = depth (confidence)
  - Estimate = minimum of k rows

### Reservoir Sampling
- **Time Complexity:** O(n)
- **Space Complexity:** O(k) where k = sample size
- **Key Use Cases:**
  - Random sampling from stream
  - Unknown stream length
  - Memory constraints
  - Online algorithms
- **When to Choose:**
  - Sample k items from n (n unknown)
  - Equal probability for each item
  - Single pass
  - Each item has k/n probability
- **Algorithm (Algorithm R):**
  - Fill reservoir with first k items
  - For item i > k, replace with probability k/i

### MinHash
- **Time Complexity:** O(nk) where n = elements, k = hash functions
- **Space Complexity:** O(k)
- **Key Use Cases:**
  - Jaccard similarity estimation
  - Duplicate detection
  - News clustering
  - NLP
- **When to Choose:**
  - Similarity between sets
  - Large-scale data
  - Allow approximation
  - Jaccard similarity = P(min hash same)
- **Jaccard Similarity:**
  - |A ∩ B| / |A ∪ B|
  - MinHash estimates this

### Skip List
- **Time Complexity:** O(log n) average, O(n) worst
- **Space Complexity:** O(n) (expected)
- **Key Use Cases:**
  - Ordered dictionary
  - Concurrent data structure
  -替代 balanced trees
- **When to Choose:**
  - Sorted data structure
  - Concurrent access
  - Simpler than balanced trees
  - Probabilistic balancing
- **Operations:**
  - Search, insert, delete: O(log n) average
  - Space: O(n) expected
  - No rebalancing needed

### Randomized Quicksort
- **Time Complexity:** O(n log n) expected, O(n²) worst
- **Space Complexity:** O(log n) expected
- **Key Use Cases:**
  - Average-case optimal
  - Avoiding worst-case
  - Input order unknown
- **When to Choose:**
  - Input adversarial or unknown
  - Expected performance matters
  - Random pivot selection
  - Same as deterministic but better practical performance

### Monte Carlo Methods
- **Time Complexity:** O(n) where n = samples
- **Space Complexity:** O(1)
- **Key Use Cases:**
  - Numerical integration
  - Optimization
  - Risk analysis
  - Physics simulations
- **When to Choose:**
  - Deterministic hard
  - Probabilistic acceptable
  - Parallelization easy
  - Error decreases as 1/√n

### Las Vegas Algorithms
- **Time Complexity:** Varies (randomized)
- **Space Complexity:** Varies
- **Key Use Cases:**
  - Always correct
  - Randomized time
  - Quicksort (expected)
  - Randomized algorithms
- **When to Choose:**
  - Must be correct
  - Randomized running time
  - Contrasts with Monte Carlo

### Karp-Rabin (Hash-based)
- **Time Complexity:** O(n + m) average
- **Space Complexity:** O(1)
- **Key Use Cases:**
  - Pattern matching
  - String hashing
  - Duplicate detection
- **When to Choose:**
  - Substring search
  - Hash collisions handled
  - Rolling hash application

---
  related-skills: programming-abl-v10-learning, programming-abl-v12-learning

## Streaming Algorithms

### Majority Element (Boyer-Moore)
- **Time Complexity:** O(n)
- **Space Complexity:** O(1)
- **Key Use Cases:**
  - Finding majority element
  - Stream processing
  - Memory-constrained
- **When to Choose:**
  - Element appears > n/2 times
  - Single pass
  - O(1) space
  - Verify pass if not guaranteed
- **Algorithm:**
  - Candidate with count
  - Increment on match, decrement otherwise
  - When count = 0, new candidate

### FM-Sketch (Flajolet-Martin)
- **Time Complexity:** O(k) per update
- **Space Complexity:** O(k) where k = hash functions
- **Key Use Cases:**
  - Distinct element estimation
  - Cardinallity estimation
  - Predecessor to HyperLogLog
- **When to Choose:**
  - Distinct elements
  - Large scale
  - Allow approximation
  - Basic probabilistic counting

### Greenwald-Khanna
- **Time Complexity:** O(log(εn)) per update
- **Space Complexity:** O(ε⁻¹ log(εn))
- **Key Use Cases:**
  - Quantile estimation
  - Percentiles
  - Streaming data
- **When to Choose:**
  - Compute approximate quantiles
  - Stream with unknown length
  - Guaranteed error bound
  - ε-error with O(1/ε log(εn)) space

### t-Sketch
- **Time Complexity:** O(log n) per update
- **Space Complexity:** O(ε⁻² log² n)
- **Key Use Cases:**
  - Frequency estimation
  - Heavy hitters
  - Streaming
- **When to Choose:**
  - Frequent items
  - High accuracy
  - Larger space for better accuracy

### Count-Sketch
- **Time Complexity:** O(k) per operation
- **Space Complexity:** O(k * w) where w = width, k = depth
- **Key Use Cases:**
  - Frequency estimation
  - Sparse recovery
  - Machine learning
- **When to Choose:**
  - L2 frequency estimation
  - Allow sign errors
  - Better than Count-Min for L2

### Lossy Counting
- **Time Complexity:** O(n/m) where m = bucket size
- **Space Complexity:** O(m) where m = O(ε⁻¹)
- **Key Use Cases:**
  - Frequent items
  - Market basket analysis
  - Streaming
- **When to Choose:**
  - Frequent itemsets
  - Space O(1/ε)
  - Error bound ε
  - Simple implementation

### Space-Saving
- **Time Complexity:** O(1) per operation
- **Space Complexity:** O(ε⁻¹)
- **Key Use Cases:**
  - Frequent items
  - Top-k elements
  - Stream summary
- **When to Choose:**
  - Top-k elements
  - Space O(k)
  - Count-min with update tracking
  - Better than Lossy Counting

### Stable Sampling
- **Time Complexity:** O(1) per element
- **Space Complexity:** O(k) where k = sample size
- **Key Use Cases:**
  - Streaming sampling
  - Sliding window
  - Approximate queries
- **When to Choose:**
  - Stream with update frequency
  - Sample representative items
  - Approximate aggregate queries

### Sliding Window Algorithms
- **Key Techniques:**
  - Sliding window histogram
  - Smooth histograms
  - Exponential histograms
- **Key Use Cases:**
  - Time-based window
  - Decay functions
  - Real-time analytics
- **When to Choose:**
  - Recent data only
  - Time-sensitive analytics
  - Window size fixed or decaying

### DGIM (Dwork et al.)
- **Time Complexity:** O(log N) per update
- **Space Complexity:** O(log² N)
- **Key Use Cases:**
  - Windowed sum estimation
  - Text processing
  - Sliding windows
- **When to Choose:**
  - Binary stream sum
  - Approximate count
  - Logarithmic space

---
  related-skills: programming-abl-v10-learning, programming-abl-v12-learning

## Algorithm Selection Guide

### Problem Type: Sorting

| Input Size | Distribution | Memory | Recommended Algorithm | Why |
|------------|--------------|--------|----------------------|-----|
| Small (n < 20) | Any | Any | Insertion Sort | Low overhead, fast for small n |
| Small (n < 20) | Nearly sorted | Any | Insertion Sort | O(n) best case |
| Medium (n < 10K) | Random | Constrained | Quick Sort | Average O(n log n), in-place |
| Medium (n < 10K) | Any | Not constrained | Merge Sort | Stable, consistent O(n log n) |
| Medium (n < 10K) | Any | Tight constraint | Heap Sort | Guaranteed O(n log n), O(1) space |
| Large (n > 10K) | Random | Any | Quick Sort (optimized) | Cache-friendly, average optimal |
| Large (n > 10K) | Nearly sorted | Any | Shell Sort or Merge Sort | Avoid O(n²) behavior |
| Large (n > 10K) | Fixed width integers | Any | Radix Sort | O(n) for k = O(1) |
| Linked List | Any | Any | Merge Sort | O(1) extra space, stable |
| External (disk) | Any | Limited RAM | Merge Sort | Sequential I/O, external |

### Problem Type: Searching

| Data Structure | Sorted? | Query Count | Recommended Algorithm | Why |
|----------------|---------|-------------|----------------------|-----|
| Array | Yes | 1 | Binary Search | O(log n) |
| Array | Yes | Many | Binary Search or TBL | Preprocessing amortized |
| Array | No | 1 | Linear Search | No preprocessing |
| Array | No | Many | Sort + Binary Search | O(n log n) preprocessing |
| Linked List | Yes | Any | Linear Search | No random access |
| BST | Yes | Any | BST Search | O(h) = O(log n) balanced |
| Unbalanced BST | Yes | Any | May need balancing | O(n) worst case |
| Hash Table | No | Many | Hash Lookup | O(1) average |
| Array | Yes, uniform | Any | Interpolation Search | O(log log n) for uniform |
| Infinite Array | Yes | Any | Exponential + Binary | Find bound first |

### Problem Type: Graph - Shortest Path

| Graph Type | Edge Weights | Source | Destination | Recommended Algorithm | Why |
|------------|--------------|--------|-------------|----------------------|-----|
| Unweighted | All 1 | Single | Single | BFS | O(V + E), queue-based |
| Unweighted | All 1 | Single | All | BFS | Single run gives all |
| Weighted | Non-negative | Single | Single | Dijkstra | O((V+E) log V) |
| Weighted | Non-negative | Single | All | Dijkstra or Johnson | Johnson for all-pairs |
| Weighted | May be negative | Single | All | Bellman-Ford | O(VE), detects cycles |
| Dense | Any | Single | Single | Dijkstra (V²) | Dense makes heap overhead high |
| Sparse | Non-negative | All | All | Johnson | V × Dijkstra = O(VE log V) |
| All pairs | Any | All | All | Floyd-Warshall | O(V³), simple, negative allowed |
| All pairs | Non-negative | All | All | Dijkstra V times | Better than Floyd for sparse |

### Problem Type: Graph - MST

| Graph Type | Density | Recommended Algorithm | Why |
|------------|---------|----------------------|-----|
| Sparse | E = O(V) | Kruskal | O(E log V), simple |
| Dense | E = O(V²) | Prim | O(V²) or O(E log V) with heap |
| Connected | Any | Both work | Choose based on implementation |
| Disconnected | Any | N/A | No spanning tree exists |

### Problem Type: Graph - Connectivity

| Problem | Recommended Algorithm | Time | Space |
|---------|----------------------|------|-------|
| Connected Components | BFS/DFS | O(V + E) | O(V) |
| Strongly Connected Components | Kosaraju/Tarjan | O(V + E) | O(V) |
| Articulation Points | Tarjan | O(V + E) | O(V) |
| Bridges | Tarjan | O(V + E) | O(V) |
| Bipartite Check | BFS 2-coloring | O(V + E) | O(V) |
| Cycle Detection | DFS | O(V + E) | O(V) |

### Problem Type: Dynamic Programming

| Problem | Input Size | Recommended Approach | Why |
|---------|------------|---------------------|-----|
| 0/1 Knapsack | n < 100, W < 10K | DP table | O(nW) time/space |
| 0/1 Knapsack | n < 40, W large | Meet-in-the-middle | O(n × 2^(n/2)) |
| 0/1 Knapsack | n large, W large | Greedy approximation | FPTAS available |
| LCS | n, m < 1000 | DP table | O(nm) |
| LCS | One string small | DP with O(min) space | Space optimization |
| LCS | Very long strings | Hirschberg | O(min(n,m)) space |
| LIS | n < 10K | DP O(n²) or patience O(n log n) | Patience for large n |
| LIS | Need sequence | DP with parent pointers | Track reconstruction |
| TSP | n < 20 | DP (Held-Karp) | O(n² × 2^n) exact |
| TSP | n > 20 | Heuristics (2-opt, 3-opt) | Exact infeasible |
| Matrix Chain | n < 500 | DP | O(n³) time/space |
| Matrix Chain | n large | Greedy (not optimal) | Heuristic |
| Coin Change | Amount < 10K | DP | O(n × amount) |
| Coin Change | Greedy-valid | Greedy | O(n) |
| Partition | sum < 10K | DP | O(n × sum) |
| Partition | sum large | Karmarkar-Karp | Heuristic |
| Subset Sum | sum < 10K | DP | O(n × sum) |
| Subset Sum | n < 40 | Meet-in-the-middle | O(n × 2^(n/2)) |

### Problem Type: String Matching

| Pattern Size | Text Size | Pattern Characteristics | Recommended Algorithm | Why |
|--------------|-----------|------------------------|----------------------|-----|
| Small (m < 10) | Any | Random | Naive O(mn) | Low overhead |
| Small | Small | Any | Naive | Simple, fast for small |
| Any | Single query | Any | Naive/KMP | KMP for pattern reuse |
| Any | Multiple queries | Any | Build index (suffix array/tree) | Preprocessing amortized |
| Single pattern | Large | Repetitive | KMP | O(n+m) guaranteed |
| Single pattern | Large | Large alphabet | Boyer-Moore | O(n/m) average |
| Multiple patterns | Large | Any | Aho-Corasick | O(n + m + z) |
| With wildcards | Any | ? and * | DP | O(mn) |
| Palindrome | Any | Any | Manacher | O(n) linear |
| Anagram | Any | Any | Sliding window + hash | O(n) |

### Problem Type: Mathematical

| Problem | Number Size | Precision | Recommended Algorithm | Why |
|---------|-------------|-----------|----------------------|-----|
| GCD | Any | Exact | Euclidean | O(log min(a,b)) |
| LCM | Any | Exact | GCD-based | (a × b) / GCD |
| Prime test | Small (< 10^12) | Exact | Trial division | Simple |
| Prime test | Large | Exact | Miller-Rabin | O(k log³ n) |
| Prime test | 64-bit | Exact | Deterministic Miller-Rabin | Specific bases |
| Prime generation | < 10^8 | All | Sieve of Eratosthenes | O(n log log n) |
| Prime generation | Large | All | Segmented sieve | O(n) time, O(√n) space |
| Factorization | Small (< 10^12) | Exact | Trial division | Simple |
| Factorization | Medium | Exact | Pollard's Rho | Fast for small factors |
| Factorization | Large | Exact | Quadratic sieve | Sub-exponential |
| Modular inverse | Prime mod | Exact | Fermat's little theorem | a^(p-2) mod p |
| Modular inverse | Composite | Exact | Extended Euclidean | ax + by = 1 |
| Modular exponentiation | Large | Exact | Binary exponentiation | O(log exp) |
| FFT multiplication | Very large | Exact | FFT | O(n log n) |
| Matrix inverse | Small | Exact | Gaussian elimination | O(n³) |
| Matrix inverse | Large sparse | Approx | Iterative methods | Conjugate gradient |
| Root finding | Smooth function | Approx | Newton-Raphson | Quadratic convergence |
| Root finding | Any continuous | Approx | Bisection | Guaranteed convergence |
| Integration | Smooth | Approx | Simpson's rule | O(1/n⁴) error |
| Integration | High-dim | Approx | Monte Carlo | Dimension-independent |
| ODE solving | Non-stiff | Approx | RK4 | O(h⁴) local error |

### Problem Type: Backtracking

| Problem | Size | Recommended Approach | Why |
|---------|------|---------------------|-----|
| N-Queens | N < 15 | Backtracking with pruning | O(N!) worst case |
| Sudoku | 9×9 | Backtracking + MRV | 81 cells, constraints |
| Sudoku | Larger | CP solver or heuristic | NP-complete |
| Subset Sum | n < 25 | Backtracking | O(2^n) |
| Subset Sum | n large | DP or approximation | Pseudo-polynomial |
| Graph Coloring | Small | Backtracking | NP-complete |
| Hamiltonian Path | Small | Backtracking | NP-complete |
| Maze Generation | Standard | Recursive backtracking | O(V) for perfect maze |

### Problem Type: Numerical

| Problem | Function Properties | Precision | Recommended Algorithm | Why |
|---------|--------------------|-----------|----------------------|-----|
| Root finding | Differentiable | High | Newton-Raphson | Quadratic convergence |
| Root finding | Continuous | Medium | Bisection | Guaranteed, linear |
| Root finding | No derivative | Medium | Secant | Superlinear |
| System Ax=b | Dense | High | Gaussian elimination | Direct, accurate |
| System Ax=b | Sparse | Medium | Iterative (CG, GMRES) | Memory efficient |
| System Ax=b | Symmetric posdef | High | Cholesky | Faster than LU |
| Optimization | Differentiable | Medium | Gradient descent | Scalable |
| Optimization | No gradient | Low | Nelder-Mead | Derivative-free |
| Integration | Smooth 1D | High | Simpson's rule | Accurate |
| Integration | High-dim | Low/Medium | Monte Carlo | Dimension-independent |
| ODE y'=f(t,y) | Non-stiff | Medium | RK4 | Good accuracy |

### Problem Type: Probabilistic

| Problem | Scale | Error Tolerance | Recommended Algorithm | Why |
|---------|-------|----------------|----------------------|-----|
| Membership test | Large | 1% false positive | Bloom filter | O(1) query, space-efficient |
| Cardinality | Billions | 2% error | HyperLogLog | log log N space |
| Frequency estimation | Large | 5% error | Count-Min Sketch | L1 approximation |
| Sampling | Stream | Exact | Reservoir sampling | O(k) space, uniform |
| Similarity | Large | 5% error | MinHash | Jaccard estimate |
| Sorted structure | Concurrent | Probabilistic | Skip list | O(log n) operations |

### Problem Type: Streaming

| Problem | Window | Error | Recommended Algorithm | Why |
|---------|--------|-------|----------------------|-----|
| Majority element | Full stream | Exact | Boyer-Moore | O(1) space |
| Count distinct | Full stream | 2% | HyperLogLog | log log N space |
| Frequency | Full stream | 5% | Count-Min | L1 error bound |
| Quantiles | Full stream | ε | Greenwald-Khanna | Guaranteed error |
| Top-k | Full stream | ε | Space-Saving | O(k/ε) space |
| Windowed sum | Sliding | ε | DGIM | Logarithmic space |
| Heavy hitters | Full stream | ε | Lossy Counting | O(1/ε) space |

---
  related-skills: programming-abl-v10-learning, programming-abl-v12-learning

## Code Patterns for Implementation

### Dynamic Programming Template
```python
def dp_template(problem_state):
    # Initialize DP table
    dp = initialize_dp_table()
    
    # Base cases
    dp[base_case] = base_value
    
    # State transition
    for state in problem_space:
        for choice in valid_choices(state):
            dp[state] = optimal(dp[state], transition(dp[previous_state], choice))
    
    return dp[target_state]
```

### Backtracking Template
```python
def backtrack(state, constraints):
    if is_solution(state):
        record_solution(state)
        return
    
    for candidate in generate_candidates(state):
        if is_valid(candidate, constraints):
            make_move(candidate, state)
            backtrack(state, constraints)
            undo_move(candidate, state)  # Backtrack
```

### Graph Traversal Template
```python
def graph_traversal(graph, start):
    visited = set()
    queue = [start]  # BFS queue or DFS stack
    
    while queue:
        node = queue.pop(0) if BFS else queue.pop()  # DFS
        
        if node not in visited:
            visited.add(node)
            process(node)
            
            for neighbor in graph[node]:
                if neighbor not in visited:
                    queue.append(neighbor)
```

### Greedy Algorithm Template
```python
def greedy_selection(items):
    result = []
    while not_done(items):
        candidate = best_candidate(items)
        if is_valid(candidate, result):
            result.append(candidate)
            items.remove(candidate)
    return result
```

### Binary Search Template
```python
def binary_search(sorted_array, target):
    left, right = 0, len(sorted_array) - 1
    
    while left <= right:
        mid = left + (right - left) // 2
        
        if sorted_array[mid] == target:
            return mid
        elif sorted_array[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    
    return -1  # Not found
```

### Memoization Template
```python
def memoized_recursive(state, memo={}):
    if state in memo:
        return memo[state]
    
    if is_base_case(state):
        return base_value
    
    result = compute(memoized_recursive(substate1), 
                     memoized_recursive(substate2))
    memo[state] = result
    return result
```

### Sliding Window Template
```python
def sliding_window(arr, k):
    n = len(arr)
    if n < k:
        return []
    
    # Initialize window
    window = initialize_window(arr[0:k])
    
    result = [process(window)]
    
    # Slide window
    for i in range(k, n):
        remove_old(arr[i - k], window)
        add_new(arr[i], window)
        result.append(process(window))
    
    return result
```

### Union-Find Template
```python
class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n
    
    def find(self, x):
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])  # Path compression
        return self.parent[x]
    
    def union(self, x, y):
        px, py = self.find(x), self.find(y)
        if px == py:
            return False
        
        # Union by rank
        if self.rank[px] < self.rank[py]:
            px, py = py, px
        self.parent[py] = px
        if self.rank[px] == self.rank[py]:
            self.rank[px] += 1
        
        return True
```

### Monotonic Stack Template
```python
def monotonic_stack(arr):
    stack = []
    result = [None] * len(arr)
    
    for i, num in enumerate(arr):
        # Maintain decreasing/increasing property
        while stack and compare(stack[-1], num):
            idx = stack.pop()
            result[idx] = num  # or process
        
        stack.append(i)
    
    return result
```

### Two-Pointer Template
```python
def two_pointers(arr1, arr2):
    i, j = 0, 0
    result = []
    
    while i < len(arr1) and j < len(arr2):
        if condition(arr1[i], arr2[j]):
            process(arr1[i], arr2[j])
            i += 1
        else:
            j += 1
    
    # Process remaining
    while i < len(arr1):
        process_remaining(arr1[i])
        i += 1
    
    while j < len(arr2):
        process_remaining(arr2[j])
        j += 1
    
    return result
```

---
  related-skills: programming-abl-v10-learning, programming-abl-v12-learning

## Common Pitfalls

### Dynamic Programming Pitfalls
1. **Wrong State Definition**: Define state precisely. `dp[i][j]` should have clear meaning.
2. **Incorrect Base Cases**: Test with small inputs. Edge cases often fail.
3. **Off-by-One Errors**: Arrays vs indices. `dp[0]` vs `dp[1]`.
4. **Missing Transitions**: Ensure all valid states are reachable.
5. **Space Optimization Bugs**: When reducing to 1D, ensure no used values are overwritten.
6. **Order Matters**: Top-down needs correct recursion order. Bottom-up needs correct iteration order.

### Backtracking Pitfalls
1. **Missing Pruning**: Without pruning, exponential time. Prune early when possible.
2. **State Not Restored**: Always undo moves after recursive call.
3. **Duplicate Solutions**: Use set or careful ordering to avoid duplicates.
4. **Incorrect Termination**: Base case should check complete solution.
5. **Memory Leaks**: Large state objects not cleaned up.

### Graph Algorithm Pitfalls
1. **Indexing Confusion**: 0-indexed vs 1-indexed. Consistency matters.
2. **Undirected vs Directed**: Edge direction affects algorithm choice.
3. **Disconnected Graphs**: Handle multiple components.
4. **Negative Cycles**: Bellman-Ford detects, Dijkstra doesn't.
5. **Memory Limits**: Adjacency matrix O(V²) vs list O(V + E).

### String Algorithm Pitfalls
1. **Index Bounds**: String indexing can be tricky with encoding.
2. **Off-by-One in LPS**: LPS array construction often has off-by-one.
3. **Hash Collisions**: Rabin-Karp needs good hash function.
4. **Pattern Empty**: Handle edge case of empty pattern.
5. **Unicode Issues**: Consider character vs byte length.

### Mathematical Algorithm Pitfalls
1. **Overflow**: Intermediate calculations may overflow. Use mod carefully.
2. **Division in Modular**: Multiply by modular inverse, not divide.
3. **Floating Point Precision**: Newton's method may not converge perfectly.
4. **Matrix Singularity**: Check for zero pivot in Gaussian elimination.
5. **Edge Cases**: GCD(0, x) = x, power(x, 0) = 1.

### Greedy Algorithm Pitfalls
1. **Greedy Doesn't Always Work**: Prove greedy choice property first.
2. **Local vs Global Optimum**: Greedy finds local, may not be global.
3. **Sorting Overhead**: Sometimes sorting is the answer, not just a step.
4. **Weighted Cases**: Standard greedy fails; need DP or other approach.

### Numerical Algorithm Pitfalls
1. **Division by Zero**: Newton's method can hit zero derivative.
2. **Convergence**: Not all methods converge for all functions.
3. **Stiff Equations**: Standard ODE solvers may fail; use stiff solvers.
4. **Round-off Error**: Accumulated in iterative methods.
5. **Initial Guess**: Newton's method is sensitive to starting point.

### Probabilistic Algorithm Pitfalls
1. **False Positives/Negatives**: Understand and handle them.
2. **Seed Quality**: Randomness quality affects results.
3. **Error Bounds**: Understand and communicate error tolerance.
4. **Space-Time Tradeoff**: Higher accuracy uses more space.
5. **Deterministic Alternative**: Sometimes deterministic is faster.

### Implementation Pitfalls
1. **Integer Division**: Use // in Python, be careful with casting.
2. **Off-by-One in Loops**: `i < n` vs `i <= n`.
3. **Mutable Defaults**: Don't use mutable objects as default arguments.
4. **Pass by Reference**: Ensure copying when needed.
5. **Edge Cases**: Always test with empty input, single element, max size.

---
  related-skills: programming-abl-v10-learning, programming-abl-v12-learning

## References

### Primary References
1. **CLRS - Introduction to Algorithms** (3rd Edition) by Cormen, Leiserson, Rivest, Stein
   - Comprehensive coverage of all algorithms
   - Clear proofs and analysis
   - Standard reference for algorithm courses

2. **The Art of Computer Programming** by Donald Knuth
   - Volume 1: Fundamental Algorithms
   - Volume 2: Seminumerical Algorithms
   - Volume 3: Sorting and Searching
   - Volume 4: Combinatorial Algorithms

3. **Algorithm Design** by Kleinberg and Tardos
   - Great for algorithm design techniques
   - Real-world applications
   - Clear explanations

4. **Concrete Mathematics** by Graham, Knuth, Patashnik
   - Mathematical foundations
   - Recurrences, summations, asymptotics
   - Essential for algorithm analysis

5. **Programming Challenges** by Skiena and Revilla
   - ACM-style problems
   - Algorithm categorization
   - Practical implementation tips

### Online Resources
1. **GeeksforGeeks** - Great for code examples and explanations
2. **Wikipedia** - Good reference for algorithm details
3. **Algorithm Wiki** - Comprehensive algorithm catalog
4. **CP-algorithms** - Competitive programming algorithms
5. **Visualgo** - Visual algorithm demonstrations

### Specialized Topics
1. **Computational Geometry** by de Berg et al.
2. **Approximation Algorithms** by Vazirani
3. **Randomized Algorithms** by Motwani and Raghavan
4. **Streaming Algorithms** by McGregor
5. **Numerical Recipes** for numerical methods

### Data Structures
1. **Dynamic Arrays** - Amortized O(1) append
2. **Hash Tables** - O(1) average lookup
3. **Balanced BSTs** - O(log n) operations
4. **Heaps** - Priority queues
5. **Tries** - String indexing
6. **Disjoint Sets** - Union-Find
7. **Segment Trees** - Range queries
8. **Fenwick Trees** - Prefix sums

---
  related-skills: programming-abl-v10-learning, programming-abl-v12-learning

## Conclusion

Algorithm selection is a critical skill in computer science. This guide provides:

1. **Comprehensive Coverage**: 15+ algorithm categories with detailed entries
2. **Selection Criteria**: Time/space complexity, use cases, and when to choose
3. **Decision Guide**: Quick lookup for common problem types
4. **Code Patterns**: Implementation templates for common paradigms
5. **Pitfall Avoidance**: Common mistakes to watch for

**Remember:**
- Standard algorithms beat fabrication every time
- Trade-offs are inevitable (time vs space, simplicity vs performance)
- Context matters (input size, distribution, constraints)
- Test edge cases thoroughly
- Document your algorithm choice reasoning

**Pro Tip:** When in doubt, start with the simplest algorithm that meets your requirements. Optimize only after profiling confirms it's necessary.

--- 

*This skill document is designed for OpenCode algorithm selection. For specific implementation questions, refer to the code-philosophy skill for implementation guidelines.*
