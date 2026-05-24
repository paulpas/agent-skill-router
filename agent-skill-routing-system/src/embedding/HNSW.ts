// HNSW (Hierarchical Navigable Small World) — Zero-dependency ANN implementation
// Reference: Malkov & Yashunin, "Efficient and robust approximate nearest neighbor search
//            using Hierarchical Navigable Small World graphs" (2016)

/**
 * Result of a search operation
 */
export interface SearchResult {
  index: number;
  distance: number;
}

/**
 * A node in the HNSW graph
 */
interface HNSWNode {
  vector: number[];
  neighbors: number[][]; // neighbors[layer] = [nodeIndex, ...]
}

/**
 * HNSW index for approximate nearest neighbor search in high-dimensional spaces.
 *
 * Design:
 * - Multi-layer graph where top layers are sparse (routing layer), bottom layer is dense
 * - Search starts at top layer, descends greedily, then performs BFS on layer 0
 * - Supports configurable tradeoff between speed and accuracy via M, efConstruction, efSearch
 * - Uses squared Euclidean on unit vectors (equivalent to cosine similarity ranking)
 */
export class HNSWIndex {
  private nodes: HNSWNode[] = [];
  private entryPoint: number = -1;
  private maxLayer: number = -1;

  // Configuration
  private M: number;
  private Mmax0: number;
  private efConstruction: number;
  private efSearch: number;
  private mL: number;

  // Reusable buffer to avoid GC pressure during build
  private visitedSet: Uint8Array | null = null;
  private visitedTag: number = 0;

  /**
   * @param M Max connections per node per layer (default: 16)
   * @param efConstruction Dynamic candidate list size during construction (default: 200)
   * @param efSearch Dynamic candidate list size during search (default: 100)
   * @param Mmax0 Max connections for layer 0 (default: M * 2)
   */
  constructor(
    M: number = 16,
    efConstruction: number = 200,
    efSearch: number = 100,
    Mmax0?: number
  ) {
    if (M < 2) throw new Error('M must be >= 2');
    if (efConstruction < 1) throw new Error('efConstruction must be >= 1');
    if (efSearch < 1) throw new Error('efSearch must be >= 1');

    this.M = M;
    this.Mmax0 = Mmax0 ?? M * 2;
    this.efConstruction = efConstruction;
    this.efSearch = efSearch;
    this.mL = 1 / Math.log(M);
  }

  /**
   * Build index from a batch of vectors.
   * Clears any existing index.
   */
  build(vectors: number[][]): void {
    this.nodes = [];
    this.entryPoint = -1;
    this.maxLayer = -1;
    this.visitedSet = null;
    this.visitedTag = 0;

    for (const vector of vectors) {
      this.insert(vector);
    }
  }

  /**
   * Get number of indexed vectors
   */
  size(): number {
    return this.nodes.length;
  }

  /**
   * Get the configuration
   */
  getConfig(): { M: number; Mmax0: number; efConstruction: number; efSearch: number } {
    return {
      M: this.M,
      Mmax0: this.Mmax0,
      efConstruction: this.efConstruction,
      efSearch: this.efSearch,
    };
  }

  /**
   * Generate random level for a new node.
   * Uses exponential decay: most nodes at level 0, few at higher levels.
   */
  private getRandomLevel(): number {
    // mL = 1/ln(M) ensures the graph has logarithmic scale
    return Math.floor(-Math.log(Math.random()) * this.mL);
  }

  /**
   * Squared Euclidean distance between two vectors.
   * For unit vectors, this produces the same ranking as cosine similarity:
   * ||a-b||² = 2 - 2*cos(a,b)
   */
  private distance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return sum;
  }

  /**
   * Insert a single vector into the index.
   *
   * Algorithm:
   * 1. Assign random level l to the new node
   * 2. If l > maxLayer, set as new entry point
   * 3. Greedy traverse from entry point down to level l+1 (no connections modified)
   * 4. From level min(l, maxLayer) down to 0:
   *    a. Search for efConstruction nearest neighbors
   *    b. Select M nearest and create bidirectional connections
   *    c. Trim connections of neighbors if they exceed max connections
   */
  insert(vector: number[]): number {
    const nodeIndex = this.nodes.length;
    const level = this.getRandomLevel();

    // Initialize neighbor lists for each layer this node belongs to
    const neighbors: number[][] = [];
    for (let l = 0; l <= level; l++) {
      neighbors[l] = [];
    }

    this.nodes.push({ vector, neighbors });

    // First node — becomes entry point
    if (this.entryPoint === -1) {
      this.entryPoint = nodeIndex;
      this.maxLayer = level;
      return nodeIndex;
    }

    // Phase 1: Traverse top layers greedily (no modifications)
    let currEntryPoint = this.entryPoint;

    for (let l = this.maxLayer; l > level; l--) {
      const result = this.greedySearchOnLayer(vector, currEntryPoint, l);
      currEntryPoint = result.nodeIndex;
    }

    // Phase 2: Search and connect on layers from min(level, maxLayer) down to 0
    for (let l = Math.min(level, this.maxLayer); l >= 0; l--) {
      // Search for efConstruction nearest neighbors on this layer
      const candidates = this.searchLayer(
        vector,
        [currEntryPoint],
        this.efConstruction,
        l
      );

      // Select M nearest neighbors
      const candidateDists = new Float64Array(candidates.length);
      for (let i = 0; i < candidates.length; i++) {
        candidateDists[i] = this.distance(vector, this.nodes[candidates[i]].vector);
      }
      this.sortByKeyInPlace(candidates, candidateDists);

      const maxConn = l === 0 ? this.Mmax0 : this.M;
      const selectedNeighbors = candidates.slice(0, Math.min(maxConn, candidates.length));

      // Connect: node → neighbors AND neighbors → node (bidirectional)
      const nodeNeighbors = this.nodes[nodeIndex].neighbors[l];
      for (const neighborIdx of selectedNeighbors) {
        nodeNeighbors.push(neighborIdx);

        // Reverse connection: neighbor → node
        const neighborNode = this.nodes[neighborIdx];
        const nn = neighborNode.neighbors[l];
        nn.push(nodeIndex);

        // Trim neighbor's connections if they exceed max
        if (nn.length > maxConn) {
          this.shrinkConnections(neighborIdx, l, maxConn);
        }
      }

      // Update entry point for next (lower) layer
      if (candidates.length > 0) {
        currEntryPoint = candidates[0];
      }
    }

    // Update global entry point if this node reached a higher layer
    if (level > this.maxLayer) {
      this.entryPoint = nodeIndex;
      this.maxLayer = level;
    }

    return nodeIndex;
  }

  /**
   * Search for k approximate nearest neighbors.
   *
   * Algorithm:
   * 1. Start at entry point (top layer)
   * 2. Greedily traverse down to layer 1 (single path)
   * 3. On layer 0, perform BFS with efSearch candidates
   * 4. Return k closest from the result set
   */
  search(query: number[], k: number): SearchResult[] {
    if (this.nodes.length === 0 || this.entryPoint === -1) {
      return [];
    }

    if (k <= 0) {
      return [];
    }

    // Phase 1: Greedy descent from top layer to layer 1
    let currEntryPoint = this.entryPoint;

    for (let l = this.maxLayer; l > 0; l--) {
      const result = this.greedySearchOnLayer(query, currEntryPoint, l);
      currEntryPoint = result.nodeIndex;
    }

    // Phase 2: Search layer 0 with efSearch candidates
    const ef = Math.max(k, this.efSearch);
    const candidates = this.searchLayer(query, [currEntryPoint], ef, 0);

    // Phase 3: Select k closest, return actual Euclidean distance
    const candidateDists = new Float64Array(candidates.length);
    for (let i = 0; i < candidates.length; i++) {
      candidateDists[i] = this.distance(query, this.nodes[candidates[i]].vector);
    }
    this.sortByKeyInPlace(candidates, candidateDists);

    const results: SearchResult[] = [];
    const limit = Math.min(k, candidates.length);
    for (let i = 0; i < limit; i++) {
      results.push({
        index: candidates[i],
        distance: Math.sqrt(candidateDists[i]), // actual Euclidean distance
      });
    }

    return results;
  }

  /**
   * Greedy search on a single layer.
   * Follows the closest neighbor at each step until no closer neighbor is found.
   * Returns the single closest node found.
   */
  private greedySearchOnLayer(
    query: number[],
    entryPoint: number,
    layer: number
  ): { nodeIndex: number; distance: number } {
    let best = entryPoint;
    let bestDist = this.distance(query, this.nodes[best].vector);

    // Greedy descent: keep moving to closer neighbors until convergence
    while (true) {
      let improved = false;
      const neighbors = this.nodes[best].neighbors[layer] || [];

      for (const neighborIdx of neighbors) {
        const neighborDist = this.distance(query, this.nodes[neighborIdx].vector);
        if (neighborDist < bestDist) {
          best = neighborIdx;
          bestDist = neighborDist;
          improved = true;
        }
      }

      if (!improved) break;
    }

    return { nodeIndex: best, distance: bestDist };
  }

  /**
   * Search a single layer for ef nearest neighbors using BFS with pruning.
   * Maintains a min-heap (candidates to explore) and a max-heap (results so far).
   *
   * Uses Uint8Array visited set with epoch-based reclamation for O(1) lookups
   * without clearing between searches.
   */
  private searchLayer(
    query: number[],
    entryPoints: number[],
    ef: number,
    layer: number
  ): number[] {
    const n = this.nodes.length;

    // Initialize/reuse visited set
    if (!this.visitedSet || this.visitedSet.length < n) {
      this.visitedSet = new Uint8Array(Math.max(n, 64));
      this.visitedTag = 0;
    }

    // Bump tag (reset if overflow)
    this.visitedTag++;
    if (this.visitedTag === 0) {
      this.visitedSet.fill(0);
      this.visitedTag = 1;
    }

    // Initialize candidates (min-heap) and results (max-heap by distance)
    const candidates: number[] = [];
    const candDists: number[] = [];
    const results: number[] = [];
    const resultDists: number[] = [];

    // Add entry points
    for (const ep of entryPoints) {
      if (ep < 0 || ep >= n) continue;
      this.visitedSet[ep] = this.visitedTag;

      const dist = this.distance(query, this.nodes[ep].vector);
      this.insertSorted(candidates, candDists, ep, dist);
      this.insertSorted(results, resultDists, ep, dist);

      // Maintain ef size for results (max-heap behavior: keep closest ef)
      if (results.length > ef) {
        results.pop();
        resultDists.pop();
      }
    }

    // BFS: explore closest candidates first
    while (candidates.length > 0) {
      // Pop closest candidate
      const closestDist = candDists[0];
      const furthestResultDist = resultDists[resultDists.length - 1];

      // Stop if the closest candidate is farther than the furthest result
      if (closestDist > furthestResultDist) {
        break;
      }

      // Remove closest from candidates
      const nodeIdx = candidates.shift()!;
      candDists.shift();

      // Explore neighbors
      const neighborIndices = this.nodes[nodeIdx].neighbors[layer] || [];
      for (const neighborIdx of neighborIndices) {
        if (neighborIdx < 0 || neighborIdx >= n) continue;
        if (this.visitedSet[neighborIdx] === this.visitedTag) continue;
        this.visitedSet[neighborIdx] = this.visitedTag;

        const dist = this.distance(query, this.nodes[neighborIdx].vector);

        // Always add to candidates (they're a min-heap)
        this.insertSorted(candidates, candDists, neighborIdx, dist);

        // Add to results if closer than furthest result (or under ef limit)
        if (resultDists.length < ef || dist < resultDists[resultDists.length - 1]) {
          this.insertSorted(results, resultDists, neighborIdx, dist);
          if (results.length > ef) {
            results.pop();
            resultDists.pop();
          }
        }
      }
    }

    return results;
  }

  /**
   * Shrink a node's neighbor list on a layer to keep only the closest maxConn neighbors.
   */
  private shrinkConnections(nodeIndex: number, layer: number, maxConn: number): void {
    const node = this.nodes[nodeIndex];
    const neighborIndices = node.neighbors[layer];

    if (neighborIndices.length <= maxConn) return;

    // Sort neighbors by distance to node and keep closest
    const nodeVec = node.vector;
    const withDists: { idx: number; dist: number }[] = [];

    for (const idx of neighborIndices) {
      withDists.push({ idx, dist: this.distance(nodeVec, this.nodes[idx].vector) });
    }

    withDists.sort((a, b) => a.dist - b.dist);
    node.neighbors[layer] = withDists.slice(0, maxConn).map(x => x.idx);
  }

  /**
   * Sort an array by corresponding keys, in-place.
   * Uses indexed sort to avoid modifying original indices.
   */
  private sortByKeyInPlace(arr: number[], keys: Float64Array): void {
    if (arr.length <= 1) return;

    // Create index array and sort by keys
    const idxArr = Array.from({ length: arr.length }, (_, i) => i);
    idxArr.sort((a, b) => keys[a] - keys[b]);

    // Reorder arr in-place
    const sortedArr = idxArr.map(i => arr[i]);
    for (let i = 0; i < arr.length; i++) {
      arr[i] = sortedArr[i];
    }
  }

  /**
   * Insert an item into a sorted array (ascending by key).
   * Uses binary search for O(log n) insertion point + O(n) splice.
   */
  private insertSorted(arr: number[], keys: number[], item: number, key: number): void {
    // Binary search for insertion point
    let low = 0;
    let high = keys.length;

    while (low < high) {
      const mid = (low + high) >>> 1;
      if (keys[mid] < key) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }

    arr.splice(low, 0, item);
    keys.splice(low, 0, key);
  }
}
