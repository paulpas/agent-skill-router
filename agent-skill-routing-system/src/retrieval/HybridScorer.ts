// HybridScorer — combines all component scores into a single hybrid ranking score.
// Applies configurable weights, multiplicative specificity boost, and additive conciseness nudge.

/**
 * Weight configuration for the hybrid scorer.
 * Default weights sum to approximately 1.0 for primary components.
 */
export interface HybridScoreConfig {
  vectorWeight: number;    // default 0.50
  bm25Weight: number;      // default 0.20
  triggerMatchWeight: number; // default 0.15
  archetypeWeight: number;   // default 0.10
  historicalWeight: number;  // default 0.05
}

/**
 * All component scores fed into the hybrid scorer.
 */
export interface ScoreComponents {
  vectorSimilarity: number;      // from KD-tree cosine similarity [0, 1]
  bm25Score: number;             // from BM25Indexer (normalized) [0, 1]
  triggerMatchScore: number;     // from TriggerMatchScorer [0, 1]
  archetypeBoost: number;        // from ArchetypeRankingBoost [0.5, 1.3]
  antiTriggerPenalty: number;    // from AntiTriggerScorer [0, -0.5]
  specificityScore: number;      // from SpecificityScorer [0, 1]
  concisenessScore: number;      // from ConcisenessScorer [0, 1]
  historicalSuccessRate?: number; // optional, from usage data [0, 1]
}

/** Default weight configuration */
const DEFAULT_CONFIG: HybridScoreConfig = {
  vectorWeight: 0.50,
  bm25Weight: 0.20,
  triggerMatchWeight: 0.15,
  archetypeWeight: 0.10,
  historicalWeight: 0.05,
};

/**
 * Combine all component scores into a single hybrid ranking score [0, 1].
 */
export class HybridScorer {
  private config: HybridScoreConfig;

  constructor(config?: Partial<HybridScoreConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Compute final hybrid score from all component scores.
   *
   * Formula:
   *   1. Weighted sum of primary components (vector + bm25 + triggerMatch + archetype + historical)
   *   2. Normalize archetype boost to [0, 1]: (archetypeBoost - 1.0) / 0.3
   *   3. Normalize anti-trigger penalty to [0, 1]: (-antiTriggerPenalty) / 0.5
   *   4. Apply specificity as multiplicative factor: score * (0.7 + 0.3 * specificityScore)
   *   5. Apply conciseness as additive nudge: + (concisenessScore - 0.5) * 0.05
   *   6. Clamp to [0, 1]
   */
  compute(components: ScoreComponents): number {
    const c = this.config;

 // 1. Weighted sum of primary components
    const archetypeNormalized = (components.archetypeBoost - 1.0) / 0.3; // normalize from [0,1] to [0,1] where 1.0→0, 1.3→1.0

   let weightedSum =
      (components.vectorSimilarity * c.vectorWeight) +
      (components.bm25Score * c.bm25Weight) +
      (components.triggerMatchScore * c.triggerMatchWeight) +
      (Math.max(0, Math.min(1, archetypeNormalized)) * c.archetypeWeight);

    // Historical success rate: positive contribution [0, 1]
    const historicalRate = components.historicalSuccessRate ?? 0;
    weightedSum += historicalRate * c.historicalWeight;

    // Anti-trigger penalty: already negative, so it reduces the score
    // e.g., -0.5 * 0.05 = -0.025 (small reduction from historical weight)
    weightedSum += components.antiTriggerPenalty * c.historicalWeight;

    // 2. Specificity multiplicative boost: [0.7, 1.0] range
    const specificityFactor = 0.7 + 0.3 * components.specificityScore;
    weightedSum *= specificityFactor;

    // 3. Conciseness additive nudge: [-0.025, +0.025] around neutral 0.5
    const concisenessNudge = (components.concisenessScore - 0.5) * 0.05;
    weightedSum += concisenessNudge;

    // 4. Clamp to [0, 1]
    return Math.max(0, Math.min(1, weightedSum));
  }

  /**
   * Get the full score breakdown for observability.
   */
 getScoreBreakdown(components: ScoreComponents): Record<string, number> {
    const c = this.config;

    const archetypeNormalized = (components.archetypeBoost - 1.0) / 0.3;

    return {
      vectorSimilarity: components.vectorSimilarity * c.vectorWeight,
      bm25Score: components.bm25Score * c.bm25Weight,
      triggerMatchScore: components.triggerMatchScore * c.triggerMatchWeight,
      archetypeBoost: Math.max(0, Math.min(1, archetypeNormalized)) * c.archetypeWeight,
      antiTriggerPenalty: components.antiTriggerPenalty * c.historicalWeight, // negative → score reduction
      specificityScore: components.specificityScore, // raw value (used as multiplicative factor)
      concisenessScore: components.concisenessScore,  // raw value (used as additive nudge)
      historicalSuccessRate: components.historicalSuccessRate ?? 0,
    };
  }

  /** Get the current weight configuration */
  getWeightConfig(): HybridScoreConfig {
    return { ...this.config };
  }
}
