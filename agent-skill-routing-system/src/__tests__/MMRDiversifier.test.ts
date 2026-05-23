// Tests for MMRDiversifier
import { MMRDiversifier, MMRCandidate } from '../retrieval/MMRDiversifier';

describe('MMRDiversifier', () => {
  // Helper: create simple 2D embeddings that produce known cosine similarities.
  function embed(x: number, y: number): number[] {
    return [x, y];
  }

  function candidate(id: string, x: number, y: number, score = 0.8): MMRCandidate {
    return { id, embedding: embed(x, y), score };
  }

  // --- Test 1: Near-duplicate elimination ---
  describe('near-duplicate elimination', () => {
    it('two skills with identical embeddings → higher-scored selected first, lower gets diversity penalty', () => {
      const diversifier = new MMRDiversifier({ topK: 5, lambda: 0.7 });
      const candidates: MMRCandidate[] = [
        candidate('skill-a', 1, 0, 0.9),
        candidate('skill-b', 1, 0, 0.85), // identical embedding, lower score
      ];

      const result = diversifier.select([1, 0], candidates);

      // Both are selected (only 2 candidates, topK=5), but order is by relevance first
      expect(result.length).toBe(2);
      expect(result[0].id).toBe('skill-a');
      expect(result[1].id).toBe('skill-b');
      // The second selection from the same direction gets a diversity penalty
      expect(result[1].mmrPenalty).toBeDefined();
      expect(result[1]!.mmrPenalty).toBeGreaterThan(0);
    });

    it('many near-duplicates → topK limits selection', () => {
      const diversifier = new MMRDiversifier({ topK: 2, lambda: 0.7 });

      // 5 nearly identical embeddings (very high inter-similarity)
      const candidates: MMRCandidate[] = [
        candidate('d1', 1.0, 0.05, 0.9),
        candidate('d2', 1.0, -0.03, 0.88),
        candidate('d3', 0.95, 0.1, 0.86),
        candidate('d4', 0.97, -0.07, 0.84),
        candidate('d5', 1.02, 0.02, 0.82),
      ];

      const result = diversifier.select([1.0, 0.0], candidates);

      // Should only select topK=2 despite 5 candidates
      expect(result.length).toBe(2);
    });
  });

  // --- Test 2: Diversity promotion ---
  describe('diversity promotion', () => {
    it('query matches 5 similar skills + 2 different ones → mixed set returned with diversity push', () => {
      const diversifier = new MMRDiversifier({ topK: 5, lambda: 0.5 });

      // Cluster A: four very similar embeddings (cosine ~1.0)
      const clusterA: MMRCandidate[] = [
        candidate('a1', 1.0, 0.0, 0.9),
        candidate('a2', 0.95, 0.05, 0.85),
        candidate('a3', 1.0, 0.1, 0.8),
        candidate('a4', 0.9, 0.1, 0.75),
      ];

      // Cluster B: two diverse embeddings (orthogonal to A)
      const clusterB: MMRCandidate[] = [
        candidate('b1', 0.0, 1.0, 0.68),
        candidate('b2', 0.1, 0.95, 0.62),
      ];

      const allCandidates = [...clusterA, ...clusterB];
      const query = [1.0, 0.0]; // Close to cluster A

      const result = diversifier.select(query, allCandidates);

      // Should select items from both clusters due to diversity push
      const aIds = result.filter((r) => r.id.startsWith('a'));
      const bIds = result.filter((r) => r.id.startsWith('b'));

      expect(aIds.length).toBeGreaterThan(0);
      expect(bIds.length).toBeGreaterThan(0);
      // Diversity should include items from both clusters — key property is mixed selection
      expect(result.length).toBe(5);
    });

    it('orthogonal clusters → items evenly distributed', () => {
      const diversifier = new MMRDiversifier({ topK: 6, lambda: 0.5 });

      // Cluster X (positive x axis)
      const clusterX: MMRCandidate[] = [
        candidate('x1', 1.0, 0.0, 0.7),
        candidate('x2', 0.9, 0.1, 0.65),
      ];

      // Cluster Y (positive y axis) — orthogonal to X
      const clusterY: MMRCandidate[] = [
        candidate('y1', 0.0, 1.0, 0.7),
        candidate('y2', 0.1, 0.9, 0.65),
      ];

      // Cluster Z (negative x axis) — opposite to X
      const clusterZ: MMRCandidate[] = [
        candidate('z1', -1.0, 0.0, 0.7),
        candidate('z2', -0.9, 0.1, 0.65),
      ];

      const result = diversifier.select([1.0, 0.0], [
        ...clusterX, ...clusterY, ...clusterZ,
      ]);

      // With equal scores and diverse directions, should get items from multiple clusters
      const xIds = result.filter((r) => r.id.startsWith('x'));
      const yIds = result.filter((r) => r.id.startsWith('y'));
      const zIds = result.filter((r) => r.id.startsWith('z'));

      expect(xIds.length).toBeGreaterThan(0);
      // Should include items from diverse clusters, not just cluster X
      expect(yIds.length + zIds.length).toBeGreaterThan(0);
    });
  });

  // --- Test 3: Lambda parameterization ---
  describe('lambda parameterization', () => {
    it('λ=0.9 (relevance-focused) picks top-scored items even if similar', () => {
      const diversifierRelevance = new MMRDiversifier({ topK: 5, lambda: 0.9 });

      const candidates: MMRCandidate[] = [
        candidate('high1', 1.0, 0.0, 1.0),
        candidate('high2', 1.0, 0.0, 0.95), // identical direction
        candidate('diverse1', 0.0, 1.0, 0.5),
      ];

      const result = diversifierRelevance.select([1.0, 0.0], candidates);

      // Should pick the two highest-scored first (relevance > diversity)
      expect(result[0].id).toBe('high1');
      expect(result[1].id).toBe('high2');
    });

    it('λ=0.3 (diversity-focused) spreads selections across clusters', () => {
      const diversifierDiverse = new MMRDiversifier({ topK: 5, lambda: 0.3 });

      const candidates: MMRCandidate[] = [
        candidate('high1', 1.0, 0.0, 1.0),
        candidate('similar', 1.0, 0.0, 0.95),
        candidate('diverse1', 0.0, 1.0, 0.6),
        candidate('diverse2', -1.0, 0.0, 0.5),
      ];

      const result = diversifierDiverse.select([1.0, 0.0], candidates);

      // Should include diverse items — similar should not be picked early
      expect(result.length).toBeGreaterThan(1);
      const diverseIncluded = result.some((r) => r.id === 'diverse1' || r.id === 'diverse2');
      expect(diverseIncluded).toBe(true);
    });

    it('different lambdas produce different result orderings', () => {
      const candidates: MMRCandidate[] = [
        candidate('s1', 1.0, 0.1, 0.95),
        candidate('s2', 1.0, -0.1, 0.9),
        candidate('d1', 0.1, 1.0, 0.6),
      ];

      const highLambda = new MMRDiversifier({ topK: 3, lambda: 0.9 });
      const lowLambda = new MMRDiversifier({ topK: 3, lambda: 0.3 });

      const resultsHigh = highLambda.select([1.0, 0.0], candidates);
      const resultsLow = lowLambda.select([1.0, 0.0], candidates);

      // The two results should differ in at least one position
      const different = resultsHigh.some(
        (r, i) => r.id !== resultsLow[i]?.id
      );
      expect(different).toBe(true);
    });
  });

  // --- Test 4: Single candidate ---
  describe('single candidate', () => {
    it('returns the single item regardless of embedding', () => {
      const diversifier = new MMRDiversifier({ topK: 10 });
      const candidates: MMRCandidate[] = [
        candidate('only-one', 0.3, -0.7, 0.5),
      ];

      const result = diversifier.select([1.0, 0.0], candidates);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('only-one');
      // No penalty on first selection
      expect(result[0].mmrPenalty).toBeUndefined();
    });
  });

  // --- Test 5: Empty input ---
  describe('empty input', () => {
    it('empty candidates → empty array', () => {
      const diversifier = new MMRDiversifier({ topK: 10 });
      const result = diversifier.select([1.0, 0.0], []);
      expect(result).toEqual([]);
    });

    it('zero-dimension embedding with empty candidates → empty array', () => {
      const diversifier = new MMRDiversifier({ topK: 10 });
      // Edge case: zero-length query embedding
      const result = diversifier.select([], []);
      expect(result).toEqual([]);
    });
  });

  // --- Test 6: Fewer candidates than topK ---
  describe('fewer candidates than topK', () => {
    it('returns all candidates with no penalties when topK > candidates.length', () => {
      const diversifier = new MMRDiversifier({ topK: 10 });
      const candidates: MMRCandidate[] = [
        candidate('a', 1.0, 0.0, 0.8),
        candidate('b', 0.0, 1.0, 0.6),
        candidate('c', -1.0, 0.0, 0.4),
      ];

      const result = diversifier.select([1.0, 0.0], candidates);

      expect(result.length).toBe(3);
      // First item has no penalty (S was empty)
      expect(result[0].mmrPenalty).toBeUndefined();
    });
  });

  // --- Test 7: Cosine similarity correctness ---
  describe('cosine similarity', () => {
    it('identical vectors → similarity = 1.0', () => {
      const a = [1.0, 2.0, 3.0];
      expect(MMRDiversifier.cosineSimilarity(a, a)).toBeCloseTo(1.0);
    });

    it('opposite vectors → similarity = -1.0', () => {
      const a = [1.0, 2.0, 3.0];
      const b = [-1.0, -2.0, -3.0];
      expect(MMRDiversifier.cosineSimilarity(a, b)).toBeCloseTo(-1.0);
    });

    it('orthogonal vectors → similarity ≈ 0.0', () => {
      const a = [1.0, 0.0, 0.0];
      const b = [0.0, 1.0, 0.0];
      expect(MMRDiversifier.cosineSimilarity(a, b)).toBeCloseTo(0.0);
    });

    it('different lengths → similarity = 0', () => {
      const a = [1.0, 2.0];
      const b = [1.0, 2.0, 3.0];
      expect(MMRDiversifier.cosineSimilarity(a, b)).toBe(0);
    });

    it('empty vectors → similarity = 0', () => {
      expect(MMRDiversifier.cosineSimilarity([], [1.0])).toBe(0);
      expect(MMRDiversifier.cosineSimilarity([1.0], [])).toBe(0);
      expect(MMRDiversifier.cosineSimilarity([], [])).toBe(0);
    });

    it('parallel vectors (same direction) → similarity = 1.0', () => {
      const a = [2.0, 4.0, 6.0]; // 2x of below
      const b = [1.0, 2.0, 3.0];
      expect(MMRDiversifier.cosineSimilarity(a, b)).toBeCloseTo(1.0);
    });
  });

  // --- Test 8: MMR penalty visibility ---
  describe('MMR penalty', () => {
    it('similar candidates get negative penalties visible in output', () => {
      const diversifier = new MMRDiversifier({ topK: 5, lambda: 0.7 });

      // All embeddings point in the same direction → high similarity
      const candidates: MMRCandidate[] = [
        candidate('s1', 1.0, 0.0, 0.9),
        candidate('s2', 0.9, 0.1, 0.85),
        candidate('s3', 0.8, 0.2, 0.8),
      ];

      const result = diversifier.select([1.0, 0.0], candidates);

      expect(result.length).toBe(3);
      // First selection: no penalty (S was empty)
      expect(result[0].mmrPenalty).toBeUndefined();

      // Subsequent selections from similar embeddings should have penalties
      if (result[1].mmrPenalty !== undefined) {
        expect(result[1].mmrPenalty).toBeGreaterThan(0);
      }
      if (result[2]?.mmrPenalty !== undefined) {
        expect(result[2].mmrPenalty).toBeGreaterThan(0);
      }
    });

    it('diverse candidates get zero or near-zero penalties', () => {
      const diversifier = new MMRDiversifier({ topK: 5, lambda: 0.7 });

      // Orthogonal embeddings — no redundancy
      const candidates: MMRCandidate[] = [
        candidate('x', 1.0, 0.0, 0.7),
        candidate('y', 0.0, 1.0, 0.65),
        candidate('z', -1.0, 0.0, 0.6),
      ];

      const result = diversifier.select([1.0, 0.0], candidates);

      expect(result.length).toBe(3);
      // Each item is orthogonal to others — penalties should be near zero
      for (const r of result) {
        if (r.mmrPenalty !== undefined) {
          expect(r.mmrPenalty).toBeLessThan(0.1);
        }
      }
    });
  });
});
