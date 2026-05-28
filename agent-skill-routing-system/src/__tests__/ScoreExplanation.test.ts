// Tests for ScoreExplanationBuilder
import { ScoreExplanationBuilder, ScoreBreakdown } from '../observability/ScoreExplanation';

describe('ScoreExplanationBuilder', () => {
  // Helper: create a minimal breakdown
  function build(opts: Partial<ScoreBreakdown> = {}): ScoreBreakdown {
    return {
      finalScore: opts.finalScore ?? 0.72,
      ...opts,
    };
  }

  // --- Test 1: High vector score → positive explanation ---
  describe('high vector score', () => {
    it('vectorScore ≥ 0.8 produces strong semantic match language', () => {
      const breakdown = build({
        vectorScore: 0.85,
        finalScore: 0.82,
      });

      const explanations = ScoreExplanationBuilder.generateExplanation('coding-refactoring', breakdown);

      expect(explanations.length).toBeGreaterThan(0);
      // Should contain the high-score explanation
      expect(explanations.some((e) => e.includes('Strong semantic'))).toBe(true);
    });

    it('vectorScore 0.5-0.79 produces moderate match language', () => {
      const breakdown = build({
        vectorScore: 0.62,
        finalScore: 0.58,
      });

      const explanations = ScoreExplanationBuilder.generateExplanation('coding-testing', breakdown);

      expect(explanations.some((e) => e.includes('Moderate semantic'))).toBe(true);
    });

    it('vectorScore < 0.5 produces weak match language', () => {
      const breakdown = build({
        vectorScore: 0.2,
        finalScore: 0.35,
      });

      const explanations = ScoreExplanationBuilder.generateExplanation('trading-arbitrage', breakdown);

      expect(explanations.some((e) => e.includes('Weak semantic'))).toBe(true);
    });
  });

  // --- Test 2: Low specificity → cautionary explanation ---
  describe('low specificity', () => {
    it('specificityScore < 0.3 produces generic skill warning', () => {
      const breakdown = build({
        specificityScore: 0.15,
        finalScore: 0.45,
      });

      const explanations = ScoreExplanationBuilder.generateExplanation('coding-basics', breakdown);

      expect(explanations.some((e) => e.includes('General-purpose'))).toBe(true);
    });

    it('specificityScore ≥ 0.7 produces specialized skill praise', () => {
      const breakdown = build({
        specificityScore: 0.9,
        finalScore: 0.85,
      });

      const explanations = ScoreExplanationBuilder.generateExplanation('trading-risk-stop-loss', breakdown);

      expect(explanations.some((e) => e.includes('Highly specialized'))).toBe(true);
    });
  });

  // --- Test 3: MMR diversity penalty explanation ---
  describe('MMR penalty', () => {
    it('negative mmerPenalty produces complementary choice language', () => {
      const breakdown = build({
        mmerPenalty: -0.12,
        finalScore: 0.68,
      });

      const explanations = ScoreExplanationBuilder.generateExplanation('coding-code-review', breakdown);

      expect(explanations.some((e) => e.includes('Similar skills already selected'))).toBe(true);
    });
  });

  // --- Test 4: Debug JSON structure ---
  describe('debug JSON', () => {
    it('buildDebugJson contains query, candidates array with scores', () => {
      const candidates = [
        {
          name: 'coding-refactoring',
          breakdown: build({ vectorScore: 0.85, finalScore: 0.82 }),
        },
        {
          name: 'cncf-kubernetes',
          breakdown: build({ vectorScore: 0.6, finalScore: 0.55 }),
        },
      ];

      const debugJson = ScoreExplanationBuilder.buildDebugJson(
        'how do i refactor legacy code',
        candidates
      );

      expect(debugJson).toHaveProperty('query');
      expect((debugJson as ScoreBreakdown).query).toBe('how do i refactor legacy code');
      expect(debugJson).toHaveProperty('timestamp');
      expect(debugJson).toHaveProperty('candidateCount');
      expect((debugJson as ScoreBreakdown).candidateCount).toBe(2);

      const cands = (debugJson as ScoreBreakdown).candidates;
      expect(Array.isArray(cands)).toBe(true);
      expect(cands.length).toBe(2);

      for (const cand of cands) {
        expect(cand).toHaveProperty('name');
        expect(cand).toHaveProperty('scoreBreakdown');
        expect(cand).toHaveProperty('explanation');
        expect(Array.isArray(cand.explanation)).toBe(true);
        expect(cand.explanation.length).toBeGreaterThan(0);
      }
    });

    it('debug JSON for empty candidates list produces empty candidates array', () => {
      const debugJson = ScoreExplanationBuilder.buildDebugJson('empty query', []);

      expect((debugJson as ScoreBreakdown).candidateCount).toBe(0);
      expect((debugJson as ScoreBreakdown).candidates).toEqual([]);
    });
  });

  // --- Test 5: Non-empty explanation for non-trivial input ---
  describe('non-empty explanations', () => {
    it('any non-trivial breakdown produces at least one explanation line', () => {
      const breakdown = build({ finalScore: 0.72 });
      const explanations = ScoreExplanationBuilder.generateExplanation('coding-testing', breakdown);

      expect(explanations.length).toBeGreaterThan(0);
    });

    it('explanation with no component scores still produces a summary line', () => {
      const breakdown: ScoreBreakdown = { finalScore: 0.5 };
      const explanations = ScoreExplanationBuilder.generateExplanation('generic-skill', breakdown);

      expect(explanations.length).toBeGreaterThan(0);
      // Should contain the fallback explanation mentioning relevance and score
      expect(explanations.some((e) => e.toLowerCase().includes('relevance') || e.toLowerCase().includes('final'))).toBe(true);
    });

    it('minimal breakdown → explanation includes skill name and score', () => {
      const breakdown: ScoreBreakdown = { finalScore: 0.45 };
      const explanations = ScoreExplanationBuilder.generateExplanation('test-skill', breakdown);

      expect(explanations.some((e) => e.includes('test-skill'))).toBe(true);
    });
  });

  // --- Test 6: Missing optional components ---
  describe('missing optional components', () => {
    it('no vectorScore → no explanation line for vector score', () => {
      const breakdown = build({
        bm25Score: 0.7,
        finalScore: 0.65,
      });

      const explanations = ScoreExplanationBuilder.generateExplanation('test-skill', breakdown);

      // Should NOT contain vector similarity mentions
      expect(explanations.some((e) => e.includes('vector'))).toBe(false);
    });

    it('only finalScore provided → single summary explanation', () => {
      const breakdown: ScoreBreakdown = { finalScore: 0.6 };
      const explanations = ScoreExplanationBuilder.generateExplanation('minimal-skill', breakdown);

      // Should produce exactly one line (the fallback)
      expect(explanations.length).toBe(1);
    });

    it('bm25Score only → explanation mentions keyword overlap', () => {
      const breakdown = build({
        bm25Score: 0.75,
        finalScore: 0.7,
      });

      const explanations = ScoreExplanationBuilder.generateExplanation('test-skill', breakdown);

      expect(explanations.some((e) => e.includes('Keyword match'))).toBe(true);
    });
  });

  // --- Test 7: buildBreakdown from raw components ---
  describe('buildBreakdown', () => {
    it('maps ScoreComponents-style keys to ScoreBreakdown fields', () => {
      const breakdown = ScoreExplanationBuilder.buildBreakdown({
        vectorSimilarity: 0.8,
        bm25Score: 0.6,
        triggerMatchScore: 0.5,
        archetypeBoost: 1.1,
        specificityScore: 0.7,
        concisenessScore: 0.6,
      });

      expect(breakdown.vectorScore).toBe(0.8);
      expect(breakdown.bm25Score).toBe(0.6);
      expect(breakdown.triggerMatchScore).toBe(0.5);
      expect(breakdown.archetypeScore).toBe(1.1);
      expect(breakdown.specificityScore).toBe(0.7);
      expect(breakdown.concisenessScore).toBe(0.6);
    });

    it('supports both vectorSimilarity and vectorScore naming', () => {
      const breakdownA = ScoreExplanationBuilder.buildBreakdown({
        vectorSimilarity: 0.9,
        finalScore: 0.85,
      });
      expect(breakdownA.vectorScore).toBe(0.9);

      const breakdownB = ScoreExplanationBuilder.buildBreakdown({
        vectorScore: 0.75,
        finalScore: 0.7,
      });
      expect(breakdownB.vectorScore).toBe(0.75);
    });

    it('finalScore computed when not provided', () => {
      const breakdown = ScoreExplanationBuilder.buildBreakdown({
        vectorSimilarity: 0.8,
        bm25Score: 0.6,
        triggerMatchScore: 0.5,
      });

      expect(breakdown.finalScore).toBeDefined();
      expect(typeof breakdown.finalScore).toBe('number');
      // Should be in [0, 1]
      expect(breakdown.finalScore).toBeGreaterThanOrEqual(0);
      expect(breakdown.finalScore).toBeLessThanOrEqual(1);
    });

    it('mmrPenalty field works with both naming variants', () => {
      const breakdown = ScoreExplanationBuilder.buildBreakdown({
        mmrPenalty: -0.12,
        finalScore: 0.7,
      });

      expect(breakdown.mmerPenalty).toBe(-0.12);
    });
  });

  // --- Test 8: Conciseness explanation ---
  describe('conciseness', () => {
    it('high conciseness (≥ 0.7) produces positive language', () => {
      const breakdown = build({ concisenessScore: 0.85, finalScore: 0.8 });

      const explanations = ScoreExplanationBuilder.generateExplanation('concise-skill', breakdown);

      expect(explanations.some((e) => e.includes('concise and focused'))).toBe(true);
    });

    it('low conciseness (< 0.3) produces cautionary language', () => {
      const breakdown = build({ concisenessScore: 0.2, finalScore: 0.4 });

      const explanations = ScoreExplanationBuilder.generateExplanation('verbose-skill', breakdown);

      expect(explanations.some((e) => e.includes('verbose or unfocused'))).toBe(true);
    });
  });

  // --- Test 9: Trigger match and archetype ---
  describe('trigger match and archetype', () => {
    it('high trigger match produces confirmation language', () => {
      const breakdown = build({ triggerMatchScore: 0.85, finalScore: 0.8 });

      const explanations = ScoreExplanationBuilder.generateExplanation('matched-skill', breakdown);

      expect(explanations.some((e) => e.includes('closely match'))).toBe(true);
    });

    it('high archetype alignment produces positive language', () => {
      const breakdown = build({ archetypeScore: 0.9, finalScore: 0.85 });

      const explanations = ScoreExplanationBuilder.generateExplanation('aligned-skill', breakdown);

      expect(explanations.some((e) => e.includes('aligns well'))).toBe(true);
    });
  });
});
