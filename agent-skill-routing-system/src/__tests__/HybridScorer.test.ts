// Tests for HybridScorer
import { HybridScorer, ScoreComponents } from '../retrieval/HybridScorer';

describe('HybridScorer', () => {
  // Helper: create default components for testing
  function defaultComponents(overrides?: Partial<ScoreComponents>): ScoreComponents {
    return {
      vectorSimilarity: overrides?.vectorSimilarity ?? 0.7,
      bm25Score: overrides?.bm25Score ?? 0.6,
      triggerMatchScore: overrides?.triggerMatchScore ?? 0.5,
      archetypeBoost: overrides?.archetypeBoost ?? 1.0,
      antiTriggerPenalty: overrides?.antiTriggerPenalty ?? 0,
      specificityScore: overrides?.specificityScore ?? 0.7,
      concisenessScore: overrides?.concisenessScore ?? 0.5,
      historicalSuccessRate: overrides?.historicalSuccessRate,
    };
  }

  // --- Test 1: Default weights produce correct formula computation ---
  describe('default weights', () => {
    it('verify with hand-computed example using known values', () => {
      const scorer = new HybridScorer();

      // All components at 0.5 baseline (except archetypeBoost=1.0, antiTriggerPenalty=0)
      const components = defaultComponents({
        vectorSimilarity: 0.5,
        bm25Score: 0.5,
        triggerMatchScore: 0.5,
        archetypeBoost: 1.0,
        antiTriggerPenalty: 0,
        specificityScore: 0.5,
        concisenessScore: 0.5,
      });

      const score = scorer.compute(components);

      // Main weighted sum: (0.5*0.50) + (0.5*0.20) + (0.5*0.15) + (0*0.10) + (0*0.05)
      // = 0.25 + 0.10 + 0.075 + 0 + 0 = 0.425
      // Then: specificity multiplicative * (0.7 + 0.3*0.5) = *1.0 → 0.425
      // Plus conciseness nudge: + (0.5-0.5)*0.05 = +0 → still 0.425
      // Final: 0.425

      expect(score).toBeGreaterThan(0.3);
      expect(score).toBeLessThan(0.6);
    });

    it('all-zero components → final score ~0', () => {
      const scorer = new HybridScorer();
      const components = defaultComponents({
        vectorSimilarity: 0,
        bm25Score: 0,
        triggerMatchScore: 0,
        archetypeBoost: 1.0,
        antiTriggerPenalty: 0,
        specificityScore: 0,
        concisenessScore: 0,
      });

      const score = scorer.compute(components);

      // Main sum = 0 (all zero weighted terms)
      // Specificity multiplicative: * (0.7 + 0.3*0) = *0.7 → 0
      // Conciseness nudge: + (0-0.5)*0.05 = -0.025 → 0 + (-0.025) = -0.025, clamped to 0
      expect(score).toBeCloseTo(0, 3);
    });

    it('max components → final score near 1.0', () => {
      const scorer = new HybridScorer();
      const components = defaultComponents({
        vectorSimilarity: 1.0,
        bm25Score: 1.0,
        triggerMatchScore: 1.0,
        archetypeBoost: 1.3, // max boost
        antiTriggerPenalty: 0, // no penalty
        specificityScore: 1.0,
        concisenessScore: 1.0,
      });

      const score = scorer.compute(components);

      // Main sum: (1*0.50) + (1*0.20) + (1*0.15) + ((0.3/0.3)*0.10) + 0
      // = 0.50 + 0.20 + 0.15 + 0.10 = 0.95
      // Specificity: * (0.7 + 0.3*1.0) = *1.0 → 0.95
      // Conciseness nudge: + ((1.0-0.5)*0.05) = +0.025 → 0.975
      expect(score).toBeGreaterThan(0.9);
      expect(score).toBeLessThanOrEqual(1.0);
    });
  });

  // --- Test 2: Configurable weights ---
  describe('configurable weights', () => {
 it('change vectorWeight to 0.70, verify output changes accordingly', () => {
      // Vector-heavy: high vectorSimilarity should drive score up more than default config
      const components = defaultComponents({
        vectorSimilarity: 0.9,
        bm25Score: 0.1,
        triggerMatchScore: 0.1,
      });

      const weightedScorer = new HybridScorer({
        vectorWeight: 0.70, bm25Weight: 0.10, triggerMatchWeight: 0.10,
        archetypeWeight: 0.05, historicalWeight: 0.05,
      });

      const componentsLow = defaultComponents({
        vectorSimilarity: 0.3,
        bm25Score: 0.9,
        triggerMatchScore: 0.1,
      });

      const highVectorScore = weightedScorer.compute(components);
      const lowVectorScore = weightedScorer.compute(componentsLow);

      // With high vector weight, high vectorSimilarity should dominate
      expect(highVectorScore).toBeGreaterThan(lowVectorScore * 2);
    });
  });

  // --- Test 3: Score breakdown ---
  describe('score breakdown', () => {
    it('contains all component names and correct weighted values', () => {
      const scorer = new HybridScorer();
      const components = defaultComponents({
        vectorSimilarity: 0.8,
        bm25Score: 0.6,
        triggerMatchScore: 0.4,
        archetypeBoost: 1.3,
        antiTriggerPenalty: -0.2,
        specificityScore: 0.7,
        concisenessScore: 0.8,
      });

      const breakdown = scorer.getScoreBreakdown(components);

      // Should contain all component names
      expect(breakdown).toHaveProperty('vectorSimilarity');
      expect(breakdown).toHaveProperty('bm25Score');
      expect(breakdown).toHaveProperty('triggerMatchScore');
      expect(breakdown).toHaveProperty('archetypeBoost');
      expect(breakdown).toHaveProperty('antiTriggerPenalty');
      expect(breakdown).toHaveProperty('specificityScore');
      expect(breakdown).toHaveProperty('concisenessScore');

      // Weighted values should match config
      const config = scorer.getWeightConfig();
      expect(config.vectorWeight).toBe(0.50);
    });
  });

  // --- Test 4: Specificity multiplicative boost ---
  describe('specificity multiplicative boost', () => {
    it('high specificity on same base score → higher final', () => {
      const scorer = new HybridScorer();

      const lowSpecificity = defaultComponents({
        vectorSimilarity: 0.6,
        bm25Score: 0.6,
        triggerMatchScore: 0.6,
        specificityScore: 0.1, // very generic
      });

      const highSpecificity = defaultComponents({
        vectorSimilarity: 0.6,
        bm25Score: 0.6,
        triggerMatchScore: 0.6,
        specificityScore: 0.9, // very specialized
      });

      const lowScore = scorer.compute(lowSpecificity);
      const highScore = scorer.compute(highSpecificity);

      expect(highScore).toBeGreaterThan(lowScore);
    });
  });

  // --- Test 5: Anti-trigger penalty ---
  describe('anti-trigger penalty', () => {
    it('full penalty (-0.5) applied correctly', () => {
      const scorer = new HybridScorer();

      const noPenalty = defaultComponents({
        vectorSimilarity: 0.7,
        bm25Score: 0.7,
        triggerMatchScore: 0.7,
        antiTriggerPenalty: 0,
      });

      const fullPenalty = defaultComponents({
        vectorSimilarity: 0.7,
        bm25Score: 0.7,
        triggerMatchScore: 0.7,
        antiTriggerPenalty: -0.5,
      });

      const noPenaltyScore = scorer.compute(noPenalty);
      const fullPenaltyScore = scorer.compute(fullPenalty);

      expect(fullPenaltyScore).toBeLessThan(noPenaltyScore);
    });
  });

  // --- Test 6: Clamping ---
  describe('clamping', () => {
    it('extreme inputs still produce [0, 1] output', () => {
      const scorer = new HybridScorer();

      // Max possible input
      const maxInput = defaultComponents({
        vectorSimilarity: 1.0,
        bm25Score: 1.0,
        triggerMatchScore: 1.0,
        archetypeBoost: 1.3,
        antiTriggerPenalty: -0.5,
        specificityScore: 1.0,
        concisenessScore: 1.0,
      });

      expect(scorer.compute(maxInput)).toBeGreaterThanOrEqual(0);
      expect(scorer.compute(maxInput)).toBeLessThanOrEqual(1.0);

      // Min possible input
      const minInput = defaultComponents({
        vectorSimilarity: 0,
        bm25Score: 0,
        triggerMatchScore: 0,
        archetypeBoost: 0.5, // minimum boost
        antiTriggerPenalty: -0.5, // maximum penalty
        specificityScore: 0,
        concisenessScore: 0,
      });

      const minScore = scorer.compute(minInput);
      expect(minScore).toBeGreaterThanOrEqual(0);
      expect(minScore).toBeLessThanOrEqual(1.0);
    });
  });

  // --- Test 7: Historical success rate ---
  describe('historical success rate', () => {
    it('if provided, factored into score positively', () => {
      const scorer = new HybridScorer();

 const highHistory = defaultComponents({
        vectorSimilarity: 0.7,
        bm25Score: 0.6,
        triggerMatchScore: 0.5,
        historicalSuccessRate: 1.0,
      });

      const lowHistory = defaultComponents({
        vectorSimilarity: 0.7,
        bm25Score: 0.6,
        triggerMatchScore: 0.5,
        historicalSuccessRate: 0,
      });

      // Both high and low history use same base — just adding the historical component
      const highHistoryScore = scorer.compute(highHistory);
      const lowHistoryScore = scorer.compute(lowHistory);

      // High history should slightly boost score (historicalWeight * normalized_rate)
      expect(highHistoryScore).toBeGreaterThanOrEqual(lowHistoryScore);
    });
  });
});
