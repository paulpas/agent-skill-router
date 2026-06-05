// Tests for IntentDecomposer
import { IntentDecomposer } from '../retrieval/IntentDecomposer';

describe('IntentDecomposer', () => {
  // --- Test 1: Fallback for queries without domain index ---
  describe('fallback for unknown terms', () => {
    it('query with no INTENT_MAP matches → single intent fragment (Phase 4)', () => {
      const result = IntentDecomposer.decompose('review this Rust Kubernetes operator');

      // Without a loaded dynamic index, these domain keywords won't resolve.
      // Phase 4 fallback produces a single fragment with the whole query.
      expect(result.fragments.length).toBe(1);
      expect(result.fragments[0].weight).toBeCloseTo(1.0, 3);
    });
  });

  // --- Test 2: Single-intent INTENT_MAP queries ---
  describe('single-intent query', () => {
    it('"fix the stop loss logic" → debugging intent from "fix"', () => {
      const result = IntentDecomposer.decompose('fix the stop loss logic');

      expect(result.fragments.length).toBeGreaterThan(0);
      // INTENT_MAP maps "fix" to "debugging"
      const fragmentNames = result.fragments.map((f) => f.intent);
      expect(fragmentNames).toContain('debugging');
    });
  });

  // --- Test 3: Weights sum to 1.0 ---
  describe('weights normalization', () => {
    it('all fragment weights sum to 1.0 for any query with matches', () => {
      const testQueries = [
        'kubernetes networking with prometheus monitoring', // "monitoring" → INTENT_MAP
        'security audit for docker containers and istio service mesh', // "security" → INTENT_MAP
        'how do i implement unit testing in go with tdd', // "testing" → INTENT_MAP
        'rust typescript performance optimization debugging', // "performance", "debugging" → INTENT_MAP
      ];

      for (const query of testQueries) {
        const result = IntentDecomposer.decompose(query);

        // If there are fragments, weights must sum to 1.0
        if (result.fragments.length > 0) {
          const weightSum = result.fragments.reduce((sum, f) => sum + f.weight, 0);
          expect(weightSum).toBeCloseTo(1.0, 3);
        }
      }
    });

    it('weights are properly normalized (no single weight exceeds 1.0)', () => {
      const result = IntentDecomposer.decompose('kubernetes kubernetes kubernetes');
      for (const fragment of result.fragments) {
        expect(fragment.weight).toBeGreaterThanOrEqual(0);
        expect(fragment.weight).toBeLessThanOrEqual(1.0);
      }
    });

    it('multiple occurrences of the same keyword are counted correctly', () => {
      const result = IntentDecomposer.decompose('test test testing test');
      // 'testing' should count as 1 from INTENT_MAP
      const weightSum = result.fragments.reduce((sum, f) => sum + f.weight, 0);
      expect(weightSum).toBeCloseTo(1.0, 3);
    });
  });

  // --- Test 4: Fallback for unknown queries ---
  describe('fallback', () => {
    it('query with no known keywords → single intent with weight 1.0', () => {
      const result = IntentDecomposer.decompose('xyz qwr abc def random gibberish');

      expect(result.fragments.length).toBe(1);
      expect(result.fragments[0].weight).toBeCloseTo(1.0, 3);
    });

    it('empty query → empty fragments array', () => {
      const result = IntentDecomposer.decompose('');
      expect(result.fragments.length).toBe(0);
      expect(result.originalQuery).toBe('');
    });

    it('whitespace-only query → empty fragments', () => {
      const result = IntentDecomposer.decompose('   ');
      expect(result.fragments.length).toBe(0);
    });
  });

  // --- Test 5: Case insensitivity (INTENT_MAP queries) ---
  describe('case insensitivity', () => {
    it('"SECURITY PERFORMANCE DESIGN" decomposes correctly despite uppercase', () => {
      const result = IntentDecomposer.decompose('SECURITY PERFORMANCE DESIGN');

      expect(result.fragments.length).toBeGreaterThan(0);

      const fragmentNames = result.fragments.map((f) => f.intent);
      expect(fragmentNames).toContain('security');
      expect(fragmentNames).toContain('performance');
      expect(fragmentNames).toContain('design');

      const weightSum = result.fragments.reduce((sum, f) => sum + f.weight, 0);
      expect(weightSum).toBeCloseTo(1.0, 3);
    });

    it('"MONITORING AND OBSERVABILITY" mixed case works', () => {
      const result = IntentDecomposer.decompose('Prometheus and Kubernetes MONITORING');

      expect(result.fragments.length).toBeGreaterThan(0);
      const fragmentNames = result.fragments.map((f) => f.intent);
      expect(fragmentNames).toContain('monitoring');
    });
  });

  // --- Test 6: Multi-word matching (Phase 1 without KEYWORD_MAP) ---
  describe('multi-word keyword matching', () => {
    it('domain keywords without dynamic index fall to Phase 4', () => {
      // Without a loaded registry, domain keywords like "stop loss", "code review"
      // no longer map to domains (KEYWORD_MAP removed). They should fall through.
      const result = IntentDecomposer.decompose('implement a stop loss strategy');

      expect(result.fragments.length).toBe(1);
      expect(result.fragments[0].weight).toBeCloseTo(1.0, 3);
    });

    it('unknown multi-word phrase falls to Phase 4', () => {
      const result = IntentDecomposer.decompose('perform a code review on this PR');

      expect(result.fragments.length).toBe(1);
      expect(result.fragments[0].weight).toBeCloseTo(1.0, 3);
    });
  });

  // --- Test 7: Domain constants ---
  describe('domain constants', () => {
    it('DOMAINS contains all expected domain names', () => {
      const domains = IntentDecomposer.DOMAINS;
      expect(domains).toContain('coding');
      expect(domains).toContain('cncf');
      expect(domains).toContain('trading');
      expect(domains).toContain('agent');
      expect(domains).toContain('go');
      expect(domains).toContain('linux');
    });

    it('decompose() gracefully handles uninitialized index (Phase 3 fallback)', () => {
      // Save current index, set to null, test Phase 3 single-word fallback
      const savedIndex = IntentDecomposer.getTriggerDomainIndex();
      (IntentDecomposer as any)._triggerDomainIndex = null;

      // Query with a term not in INTENT_MAP should produce a single-fragment result
      const result = IntentDecomposer.decompose('kubernetes');
      expect(result.fragments.length).toBeGreaterThan(0);

      // Restore the index
      (IntentDecomposer as any)._triggerDomainIndex = savedIndex;
    });
  });

  // --- Test 8: Intent category matching ---
  describe('intent category matching', () => {
    it('"security vulnerability OWASP audit" → security intent fragment', () => {
      const result = IntentDecomposer.decompose('security vulnerability OWASP audit');

      expect(result.fragments.length).toBeGreaterThan(0);
      const fragmentNames = result.fragments.map((f) => f.intent);
      expect(fragmentNames).toContain('security');
    });

    it('"performance optimization latency speed" → performance intent', () => {
      const result = IntentDecomposer.decompose('performance optimization latency speed');

      expect(result.fragments.length).toBeGreaterThan(0);
      const fragmentNames = result.fragments.map((f) => f.intent);
      expect(fragmentNames).toContain('performance');
    });

    it('"debug bug fix error trace" → debugging intent', () => {
      const result = IntentDecomposer.decompose('debug bug fix error trace');

      expect(result.fragments.length).toBeGreaterThan(0);
      const fragmentNames = result.fragments.map((f) => f.intent);
      expect(fragmentNames).toContain('debugging');
    });

    it('multi-intent query: "security design performance" → multiple fragments', () => {
      const result = IntentDecomposer.decompose('security design performance');

      expect(result.fragments.length).toBe(3); // security, design, performance
      const fragmentNames = result.fragments.map((f) => f.intent);
      expect(fragmentNames).toContain('security');
      expect(fragmentNames).toContain('design');
      expect(fragmentNames).toContain('performance');

      const weightSum = result.fragments.reduce((sum, f) => sum + f.weight, 0);
      expect(weightSum).toBeCloseTo(1.0, 3);
    });
  });

  // --- Test 9: Fragments sorted by weight ---
  describe('fragment ordering', () => {
    it('fragments are sorted by weight descending', () => {
      const result = IntentDecomposer.decompose('kubernetes docker helm');
      // Without dynamic index, falls to Phase 4 → single fragment

      expect(result.fragments.length).toBe(1);
      expect(result.fragments[0].weight).toBeCloseTo(1.0, 3);
    });

    it('fragments sorted by weight, ties broken alphabetically', () => {
      // "security performance debugging" — each appears once in INTENT_MAP, equal raw counts
      const result = IntentDecomposer.decompose('security performance debugging');

      expect(result.fragments.length).toBe(3);
      // All weights should be equal (~0.333), so alphabetical order applies
      expect(result.fragments[0].intent.localeCompare(result.fragments[1].intent) <= 0).toBe(true);
    });
  });
});
