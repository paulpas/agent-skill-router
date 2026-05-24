// KDTree (k-dimensional tree) for efficient nearest neighbor search in high-dimensional vector spaces

/**
 * Represents a node in the KD-tree
 */
export interface KDTreeNode {
  point: number[];
  index: number;
  left: KDTreeNode | null;
  right: KDTreeNode | null;
}

/**
 * Result of a search operation
 */
export interface SearchResult {
  index: number;
  distance: number;
}

/**
 * KD-tree implementation for efficient nearest neighbor search
 * Uses Euclidean distance for similarity measurements
 */
export class KDTree {
  private dimension: number;
  private root: KDTreeNode | null = null;
  private points: number[][] = [];
  private indexMap: Map<number[], number> = new Map();

  /**
   * Creates a new KD-tree
   * @param dimension The number of dimensions for each point
   */
  constructor(dimension: number) {
    if (dimension <= 0) {
      throw new Error('Dimension must be a positive integer');
    }
    this.dimension = dimension;
  }

  /**
   * Builds the KD-tree from an array of vectors
   * @param points Array of vectors, where each vector has exactly `dimension` elements
   */
  build(points: number[][]): void {
    // Parse and validate input data at boundary
    this.points = this.parsePoints(points);
    this.indexMap = new Map(this.points.map((p, i) => [p, i]));

    // Reset tree before rebuilding
    this.root = null;
    
    // Build balanced tree using recursive median partitioning
    this.root = this.buildRecursive(this.points, 0);
  }

  /**
   * Parses and validates points array
   * Fails fast if input doesn't match expected dimensions
   */
  private parsePoints(points: number[][]): number[][] {
    if (!Array.isArray(points)) {
      throw new Error('Points must be an array');
    }

    const validated: number[][] = [];

    for (let i = 0; i < points.length; i++) {
      const point = points[i];

      if (!Array.isArray(point)) {
        throw new Error(`Point at index ${i} is not an array`);
      }

      if (point.length !== this.dimension) {
        throw new Error(
          `Point at index ${i} has ${point.length} dimensions, expected ${this.dimension}`
        );
      }

      // Validate all coordinates are numbers
      for (let j = 0; j < this.dimension; j++) {
        if (typeof point[j] !== 'number' || isNaN(point[j])) {
          throw new Error(
            `Invalid coordinate at point ${i}, dimension ${j}: must be a valid number`
          );
        }
      }

      validated.push([...point]); // Store a copy
    }

    return validated;
  }

/**
   * Recursively builds a balanced KD-tree by selecting the median along the current axis
   * @param points Points to partition
   * @param depth Current depth in the tree (determines splitting axis)
   * @returns Root node of the subtree, or null if no points remain
   */
  buildRecursive(points: number[][], depth: number): KDTreeNode | null {
    // Early exit: no points to process
    if (points.length === 0) {
      return null;
    }

    // Determine splitting axis based on depth
    const axis = depth % this.dimension;

    // Sort points by the current axis
    const sorted = [...points].sort((a, b) => a[axis] - b[axis]);

    // Find median index
    const medianIndex = Math.floor(sorted.length / 2);
    const medianPoint = sorted[medianIndex];

    // Create node with the median point
    const node: KDTreeNode = {
      point: medianPoint,
      index: this.indexMap.get(medianPoint) ?? 0,
      left: null,
      right: null,
    };

    // Split points into left and right subsets
    const leftPoints = sorted.slice(0, medianIndex);
    const rightPoints = sorted.slice(medianIndex + 1);

    // Recursively build left and right subtrees
    node.left = this.buildRecursive(leftPoints, depth + 1);
    node.right = this.buildRecursive(rightPoints, depth + 1);

    return node;
  }

  /**
   * Finds the k-nearest neighbors to a query point
   * @param query Query vector with exactly `dimension` elements
   * @param k Number of neighbors to find
   * @returns Array of search results sorted by distance (closest first)
   */
  nearest(query: number[], k: number): SearchResult[] {
    // Validate query at boundary
    const validatedQuery = this.validateQuery(query);

    // Early exit: empty tree
    if (!this.root) {
      return [];
    }

    // Early exit: invalid k
    if (k <= 0) {
      return [];
    }

    const results: SearchResult[] = [];
    const bestDistances: number[] = [];

    this.searchNearest(this.root, validatedQuery, k, results, bestDistances, 0);

    // Sort results by distance (ascending)
    return results.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Finds all points within a given radius of the query point
   * @param query Query vector with exactly `dimension` elements
   * @param radius Maximum distance for inclusion
   * @returns Array of search results within the radius, sorted by distance
   */
  radius(query: number[], radius: number): SearchResult[] {
    // Validate query at boundary
    const validatedQuery = this.validateQuery(query);

    // Early exit: invalid radius
    if (radius < 0) {
      return [];
    }

    // Early exit: empty tree
    if (!this.root) {
      return [];
    }

    const results: SearchResult[] = [];

    this.searchRadius(this.root, validatedQuery, radius, results, 0);

    // Sort results by distance (ascending)
    return results.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Validates the query vector
   */
  private validateQuery(query: number[]): number[] {
    if (!Array.isArray(query)) {
      throw new Error('Query must be an array');
    }

    if (query.length !== this.dimension) {
      throw new Error(
        `Query has ${query.length} dimensions, expected ${this.dimension}`
      );
    }

    for (let i = 0; i < this.dimension; i++) {
      if (typeof query[i] !== 'number' || isNaN(query[i])) {
        throw new Error(
          `Invalid coordinate at dimension ${i}: must be a valid number`
        );
      }
    }

    return [...query]; // Return a copy
  }

  /**
   * Recursive nearest neighbor search
   * Uses a best-first search strategy with a priority queue (implemented via arrays)
   * @param node Current tree node
   * @param query Query point
   * @param k Number of neighbors to find
   * @param results Accumulated results
   * @param bestDistances Distances corresponding to results
   * @param depth Current depth in the tree (determines splitting axis)
   */
  searchNearest(
    node: KDTreeNode | null,
    query: number[],
    k: number,
    results: SearchResult[],
    bestDistances: number[],
    depth: number
  ): void {
    // Early exit: no node to process
    if (!node) {
      return;
    }

    // Calculate distance to current node
    const distance = this.euclideanDistance(node.point, query);

    // Add current node to results if we have space or it's closer than existing
    if (results.length < k) {
      results.push({ index: node.index, distance });
      bestDistances.push(distance);
    } else {
      // Only replace if this is closer than the furthest existing result
      const maxDistance = Math.max(...bestDistances);
      if (distance < maxDistance) {
        // Find and replace the furthest result
        const maxIndex = bestDistances.indexOf(maxDistance);
        results[maxIndex] = { index: node.index, distance };
        bestDistances[maxIndex] = distance;
      }
    }

    // Determine splitting axis based on depth
    const axis = depth % this.dimension;
    const queryVal = query[axis];
    const nodeVal = node.point[axis];

    // Determine which subtree to search first
    const firstSubtree = queryVal < nodeVal ? node.left : node.right;
    const secondSubtree = queryVal < nodeVal ? node.right : node.left;

    // Search the closer subtree first
    this.searchNearest(firstSubtree, query, k, results, bestDistances, depth + 1);

    // Check if we need to search the other subtree
    // Calculate the minimum distance to the splitting hyperplane
    const diff = queryVal - nodeVal;
    const minDistToHyperplane = diff * diff;
    const maxDistanceInResults = results.length < k ? Infinity : Math.max(...bestDistances);

    // Only search the second subtree if it could contain closer points
    if (minDistToHyperplane < maxDistanceInResults) {
      this.searchNearest(secondSubtree, query, k, results, bestDistances, depth + 1);
    }
  }

  /**
   * Searches for all points within radius
   * @param node Current tree node
   * @param query Query point
   * @param radius Maximum distance for inclusion
   * @param results Accumulated results
   * @param depth Current depth in the tree (determines splitting axis)
   */
  private searchRadius(
    node: KDTreeNode | null,
    query: number[],
    radius: number,
    results: SearchResult[],
    depth: number
  ): void {
    // Early exit: no node to process
    if (!node) {
      return;
    }

    // Calculate distance to current node
    const distance = this.euclideanDistance(node.point, query);

    // Add to results if within radius
    if (distance <= radius) {
      results.push({ index: node.index, distance });
    }

    // Determine splitting axis based on depth
    const axis = depth % this.dimension;
    const queryVal = query[axis];
    const nodeVal = node.point[axis];

    // Calculate minimum distance to splitting hyperplane
    const diff = queryVal - nodeVal;
    const minDistToHyperplane = diff * diff;

    // Search both subtrees if they could contain points within radius
    if (minDistToHyperplane <= radius * radius) {
      this.searchRadius(node.left, query, radius, results, depth + 1);
      this.searchRadius(node.right, query, radius, results, depth + 1);
    } else if (queryVal < nodeVal) {
      // Only search the left subtree
      this.searchRadius(node.left, query, radius, results, depth + 1);
    } else {
      // Only search the right subtree
      this.searchRadius(node.right, query, radius, results, depth + 1);
    }
  }

/**
   * Calculates Euclidean distance between two points
   * @param a First point
   * @param b Second point
   * @returns Euclidean distance
   */
  euclideanDistance(a: number[], b: number[]): number {
    // Fail fast: dimension mismatch
    if (a.length !== b.length) {
      throw new Error(
        `Dimension mismatch: ${a.length} vs ${b.length}`
      );
    }

    let sum = 0;

    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }

    return Math.sqrt(sum);
  }

}
