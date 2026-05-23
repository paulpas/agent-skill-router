// MMRDiversifier — Maximal Marginal Relevance for retrieval diversification
// Selects a diverse subset of candidates balancing relevance against redundancy.

/**
 * Configuration for MMR diversification.
 */
export interface MMRConfig {
  /** Tradeoff between relevance (1.0) and diversity (0.0). Default: 0.7 */
  lambda?: number;
  /** Maximum number of results to return. Default: 10 */
  topK?: number;
}

/**
 * A candidate with an embedding vector and a pre-computed relevance score.
 */
export interface MMRCandidate {
  id: string;
  embedding: number[];
  score: number;
}

/**
 * Result of the MMR selection — the selected item with its original score
 * and the diversity penalty applied (undefined if S is empty at selection time).
 */
export interface MMRResult {
  id: string;
  /** The original relevance score from the hybrid scorer */
  score: number;
  /** Negative diversity penalty; undefined on the first selection (no prior items in S) */
  mmrPenalty?: number;
}

/** Default MMR configuration */
const DEFAULT_CONFIG: Required<MMRConfig> = {
  lambda: 0.7,
  topK: 10,
};

/**
 * Maximal Marginal Relevance (MMR) diversifier.
 *
 * Given a query embedding and a pool of candidate embeddings with scores,
 * iteratively selects the item that maximizes:
 *   MMR(d_i) = λ * rel(S ∪ {d_i}) − (1 − λ) * max_{d_j ∈ S} sim(d_i, d_j)
 *
 * This reduces redundancy while preserving relevance.
 */
export class MMRDiversifier {
  private lambda: number;
  private topK: number;

  constructor(config?: MMRConfig) {
    // Use explicit fallback defaults instead of spread — prevents undefined values from overwriting defaults.
    const lambda = config?.lambda ?? DEFAULT_CONFIG.lambda;
    const topK = config?.topK ?? DEFAULT_CONFIG.topK;
    this.lambda = clamp(lambda, 0, 1);
    this.topK = Math.max(1, Math.round(topK));
  }

  /**
   * Select a diverse subset of candidates using the MMR algorithm.
   *
   * @param queryEmbedding — embedding of the user's query (unused directly;
   *                         relevance comes from each candidate's `score` field).
   * @param candidates     — pool of candidates with embeddings and pre-computed scores.
   * @returns sorted list of selected results up to `topK`.
   */
  select(
    _queryEmbedding: number[],
    candidates: MMRCandidate[]
  ): MMRResult[] {
    // Early exit: no candidates or zero topK
    if (candidates.length === 0 || this.topK <= 0) {
      return [];
    }

    const selected: MMRResult[] = [];
    const remaining: Map<string, MMRCandidate> = new Map(
      candidates.map((c) => [c.id, c])
    );
    // S is implicitly tracked via `selected`

    const iterations = Math.min(this.topK, candidates.length);

    for (let iter = 0; iter < iterations; iter++) {
      let bestId: string | null = null;
      let bestMMR = -Infinity;

      for (const [id, candidate] of remaining) {
        // Relevance = pre-computed hybrid score (normalized to [0,1])
        const relevance = clamp(candidate.score, 0, 1);

        // Diversity = max cosine similarity to any already-selected item
        let maxSimilarity = 0;
        if (selected.length > 0) {
          for (const sel of selected) {
            const selCandidate = candidates.find((c) => c.id === sel.id);
            if (!selCandidate || !candidate.embedding.length) continue;

            const sim = MMRDiversifier.cosineSimilarity(
              candidate.embedding,
              selCandidate.embedding
            );
            if (sim > maxSimilarity) {
              maxSimilarity = sim;
            }
          }
        }

        // MMR formula: λ * relevance − (1 − λ) * max_similarity
        const mmrScore = this.lambda * relevance - (1 - this.lambda) * maxSimilarity;

        if (mmrScore > bestMMR) {
          bestMMR = mmrScore;
          bestId = id;
        }
      }

      if (bestId === null) break; // No more candidates

      const chosenCandidate = remaining.get(bestId)!;
      remaining.delete(bestId);

      // The penalty is the diversity term that was subtracted
      const penalty = selected.length > 0
        ? this.computeMaxSimilarity(chosenCandidate.embedding, selected, candidates)
        : undefined;

      selected.push({
        id: bestId,
        score: chosenCandidate.score,
        mmrPenalty: penalty,
      });
    }

    return selected;
  }

  /**
   * Compute cosine similarity between two vectors.
   *
   * @returns value in [-1, 1]; 0 if either vector has zero magnitude or lengths differ.
   */
  static cosineSimilarity(a: number[], b: number[]): number {
    // Early exit: empty vectors
    if (a.length === 0 || b.length === 0) return 0;
    // Length mismatch → orthogonal in practice
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }

    magA = Math.sqrt(magA);
    magB = Math.sqrt(magB);

    if (magA === 0 || magB === 0) return 0;

    return dotProduct / (magA * magB);
  }

  /** Internal: compute max similarity of a vector against selected results. */
  private computeMaxSimilarity(
    embedding: number[],
    selected: MMRResult[],
    candidatesMap: MMRCandidate[]
  ): number {
    let maxSim = 0;
    for (const sel of selected) {
      const candidate = candidatesMap.find((c) => c.id === sel.id);
      if (!candidate) continue;
      const sim = MMRDiversifier.cosineSimilarity(embedding, candidate.embedding);
      if (sim > maxSim) maxSim = sim;
    }
    return maxSim;
  }
}

/** Clamp value to [min, max]. */
function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
