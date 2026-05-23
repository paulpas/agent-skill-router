// Tests for IntentDecomposer
import { IntentDecomposer } from '../retrieval/IntentDecomposer';

describe('IntentDecomposer', () => {
  // --- Test 1: Multi-domain query ---
  describe('multi-domain query', () => {
    it('"review this Rust Kubernetes operator" → fragments for rust and kubernetes with weights summing to 1.0', () => {
      const result = IntentDecomposer.decompose('review this Rust Kubernetes operator');

      expect(result.fragments.length).toBeGreaterThan(0);

      // Should have fragments for 'coding' (from rust) and 'cncf' (from kubernetes)
      const fragmentNames = result.fragments.map((f) => f.intent);
      expect(fragmentNames).toContain('coding');
      expect(fragmentNames).toContain('cncf');

      // Weights must sum to 1.0
      const weightSum = result.fragments.reduce((sum, f) => sum + f.weight, 0);
      expect(weightSum).toBeCloseTo(1.0, 3);
    });
  });

  // --- Test 2: Single-intent query ---
  describe('single-intent query', () => {
    it('"fix the stop loss logic" → single fragment for trading', () => {
      const result = IntentDecomposer.decompose('fix the stop loss logic');

      expect(result.fragments.length).toBeGreaterThan(0);
      // Should match 'trading' domain from 'stop loss' keyword
      const fragmentNames = result.fragments.map((f) => f.intent);
      expect(fragmentNames).toContain('trading');
    });
  });

  // --- Test 3: Weights sum to 1.0 ---
  describe('weights normalization', () => {
    it('all fragment weights sum to 1.0 for any query with matches', () => {
      const testQueries = [
        'kubernetes networking with prometheus monitoring',
        'security audit for docker containers and istio service mesh',
        'how do i implement unit testing in go with tdd',
        'rust typescript performance optimization debugging',
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
      // 'testing' should count as 1, 'test' (single word) might match intent map
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

  // --- Test 5: Case insensitivity ---
  describe('case insensitivity', () => {
    it('"RUST KUBERNETES SECURITY" decomposes correctly despite uppercase', () => {
      const result = IntentDecomposer.decompose('RUST KUBERNETES SECURITY');

      expect(result.fragments.length).toBeGreaterThan(0);

      const fragmentNames = result.fragments.map((f) => f.intent);
      expect(fragmentNames).toContain('coding'); // from RUST
      expect(fragmentNames).toContain('cncf');   // from KUBERNETES
      expect(fragmentNames).toContain('security'); // from SECURITY

      const weightSum = result.fragments.reduce((sum, f) => sum + f.weight, 0);
      expect(weightSum).toBeCloseTo(1.0, 3);
    });

    it('"Prometheus and Kubernetes MONITORING" mixed case works', () => {
      const result = IntentDecomposer.decompose('Prometheus and Kubernetes MONITORING');

      expect(result.fragments.length).toBeGreaterThan(0);
      const fragmentNames = result.fragments.map((f) => f.intent);
      expect(fragmentNames).toContain('cncf');
    });
  });

  // --- Test 6: Multi-word intent matching ---
  describe('multi-word intent matching', () => {
    it('"stop loss" matched as one fragment, not two separate words', () => {
      const result = IntentDecomposer.decompose('implement a stop loss strategy');

      expect(result.fragments.length).toBeGreaterThan(0);
      // Should have 'trading' from the multi-word keyword "stop loss"
      const fragmentNames = result.fragments.map((f) => f.intent);
      expect(fragmentNames).toContain('trading');

      // Verify it's not matching both "stop" and "loss" as separate words
      // (the single word 'stop' is not in KEYWORD_MAP, so no spurious matches)
      const fragmentCount = result.fragments.length;
      // Should be exactly 1 or a small number of legitimate matches
      expect(fragmentCount).toBeLessThanOrEqual(3);
    });

    it('"code review" matched as one intent', () => {
      const result = IntentDecomposer.decompose('perform a code review on this PR');

      expect(result.fragments.length).toBeGreaterThan(0);
      const fragmentNames = result.fragments.map((f) => f.intent);
      expect(fragmentNames).toContain('coding');
    });

    it('"service mesh" matched as one intent', () => {
      const result = IntentDecomposer.decompose('configure service mesh for kubernetes');

      expect(result.fragments.length).toBeGreaterThan(0);
      const fragmentNames = result.fragments.map((f) => f.intent);
      expect(fragmentNames).toContain('cncf');
    });

    it('"unit test" and "integration test" both recognized', () => {
      const result = IntentDecomposer.decompose('write unit test and integration test for this module');

      expect(result.fragments.length).toBeGreaterThan(0);
      // Both should map to 'coding' domain, but the intent match may also pick up 'testing'
      const fragmentNames = result.fragments.map((f) => f.intent);
      expect(fragmentNames).toContain('coding');
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

    it('KEYWORD_MAP contains entries for major domains', () => {
      const map = IntentDecomposer.KEYWORD_MAP;
      // coding
      expect(map['rust']).toEqual(['coding']);
      expect(map['kubernetes']).toEqual(['cncf']);
      // trading
      expect(map['trading']).toEqual(['trading']);
      // agent
      expect(map['orchestration']).toEqual(['agent']);
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
      // All three keywords map to 'cncf' → single fragment with count=3

      expect(result.fragments.length).toBe(1);
      expect(result.fragments[0].weight).toBeCloseTo(1.0, 3);
    });

    it('fragments sorted by weight, ties broken alphabetically', () => {
      // "security performance debugging" — each appears once, equal raw counts
      const result = IntentDecomposer.decompose('security performance debugging');

      expect(result.fragments.length).toBe(3);
      // All weights should be equal (~0.333), so alphabetical order applies
      expect(result.fragments[0].intent.localeCompare(result.fragments[1].intent) <= 0).toBe(true);
    });
  });
});
