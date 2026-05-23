// Tests for WeightedAggregator
import { WeightedAggregator, FragmentResults } from '../retrieval/WeightedAggregator';
import type { IntentFragment } from '../retrieval/IntentDecomposer';

describe('WeightedAggregator', () => {
  // Helper: create a simple fragment list
  function fragments(...pairs: Array<[string, number]>): IntentFragment[] {
    return pairs.map(([intent, weight]) => ({ intent, weight }));
  }

  function fragmentResults(fragment: string, results: Array<{ id: string; score: number }>): FragmentResults {
    return { fragment, results };
  }

  // --- Test 1: Single fragment passthrough ---
  describe('single fragment', () => {
    it('result passes through with weight applied', () => {
      const fragList = fragments(['coding', 1.0]);
      const fragRes = [fragmentResults('coding', [
        { id: 'skill-a', score: 0.8 },
        { id: 'skill-b', score: 0.5 },
      ])];

      const result = WeightedAggregator.aggregate(fragList, fragRes);

      expect(result.length).toBe(2);
      // Weight is 1.0, so scores remain the same
      expect(result[0].id).toBe('skill-a');
      expect(result[0].score).toBeCloseTo(0.8 * 1.0, 4);
      expect(result[1].score).toBeCloseTo(0.5 * 1.0, 4);
    });
  });

  // --- Test 2: Multi-fragment aggregation ---
  describe('multi-fragment aggregation', () => {
    it('skill appearing in 2 fragments gets combined score', () => {
      const fragList = fragments(
        ['coding', 0.6],
        ['cncf', 0.4]
      );

      const fragRes: FragmentResults[] = [
        fragmentResults('coding', [
          { id: 'skill-mixed', score: 0.8 },
          { id: 'skill-coding-only', score: 0.6 },
        ]),
        fragmentResults('cncf', [
          { id: 'skill-mixed', score: 0.5 },
          { id: 'skill-cncf-only', score: 0.9 },
        ]),
      ];

      const result = WeightedAggregator.aggregate(fragList, fragRes);

      expect(result.length).toBe(3);

      // skill-mixed: 0.6*0.8 + 0.4*0.5 = 0.48 + 0.20 = 0.68
      const mixedResult = result.find((r) => r.id === 'skill-mixed');
      expect(mixedResult).toBeDefined();
      expect(mixedResult!.score).toBeCloseTo(0.68, 4);

      // Contributing fragments should list both
      expect(mixedResult!.contributingFragments.length).toBe(2);
      expect(mixedResult!.contributingFragments.some((cf) => cf.fragment === 'coding')).toBe(true);
      expect(mixedResult!.contributingFragments.some((cf) => cf.fragment === 'cncf')).toBe(true);

      // skill-coding-only: only in coding fragment → 0.6*0.6 = 0.36
      const codingOnly = result.find((r) => r.id === 'skill-coding-only');
      expect(codingOnly!.score).toBeCloseTo(0.36, 4);

      // skill-cncf-only: only in cncf fragment → 0.4*0.9 = 0.36
      const cncfOnly = result.find((r) => r.id === 'skill-cncf-only');
      expect(cncfOnly!.score).toBeCloseTo(0.36, 4);

      // Mixed should rank highest
      expect(result[0].id).toBe('skill-mixed');
    });
  });

  // --- Test 3: Deduplication ---
  describe('deduplication', () => {
    it('same skill in multiple fragment results → highest combined score kept', () => {
      const fragList = fragments(
        ['coding', 0.7],
        ['security', 0.3]
      );

      const fragRes: FragmentResults[] = [
        fragmentResults('coding', [
          { id: 'shared-skill', score: 0.9 },
        ]),
        fragmentResults('security', [
          { id: 'shared-skill', score: 0.4 },
        ]),
      ];

      const result = WeightedAggregator.aggregate(fragList, fragRes);

      // Should be deduplicated to a single entry
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('shared-skill');
      // Combined: 0.7*0.9 + 0.3*0.4 = 0.63 + 0.12 = 0.75
      expect(result[0].score).toBeCloseTo(0.75, 4);
    });

    it('deduplicate() keeps highest score for duplicates', () => {
      const results = [
        { id: 'skill-a', score: 0.5 },
        { id: 'skill-b', score: 0.8 },
        { id: 'skill-a', score: 0.9 }, // higher score should replace
        { id: 'skill-c', score: 0.3 },
      ];

      const deduped = WeightedAggregator.deduplicate(results);

      expect(deduped.length).toBe(3);
      const skillA = deduped.find((r) => r.id === 'skill-a');
      expect(skillA!.score).toBeCloseTo(0.9);

      // Sorted descending
      expect(deduped[0].score).toBeGreaterThanOrEqual(deduped[1].score);
    });
  });

  // --- Test 4: Weight multiplication ---
  describe('weight multiplication', () => {
    it('weight=0.5, score=0.8 → weighted = 0.4', () => {
      const fragList = fragments(['test', 0.5]);
      const fragRes = [fragmentResults('test', [{ id: 'skill-x', score: 0.8 }])];

      const result = WeightedAggregator.aggregate(fragList, fragRes);

      expect(result.length).toBe(1);
      expect(result[0].score).toBeCloseTo(0.4, 4);
    });

    it('weight=0.25, score=0.6 → weighted = 0.15', () => {
      const fragList = fragments(['frag-a', 0.25]);
      const fragRes = [fragmentResults('frag-a', [{ id: 'skill-y', score: 0.6 }])];

      const result = WeightedAggregator.aggregate(fragList, fragRes);

      expect(result[0].score).toBeCloseTo(0.15, 4);
    });
  });

  // --- Test 5: Empty results ---
  describe('empty results', () => {
    it('all fragments return empty → empty output', () => {
      const fragList = fragments(['a', 0.5], ['b', 0.5]);
      const fragRes: FragmentResults[] = [
        fragmentResults('a', []),
        fragmentResults('b', []),
      ];

      expect(WeightedAggregator.aggregate(fragList, fragRes)).toEqual([]);
    });

    it('empty fragment list → empty output', () => {
      const fragRes: FragmentResults[] = [
        fragmentResults('a', [{ id: 'x', score: 0.5 }]),
      ];

      expect(WeightedAggregator.aggregate([], fragRes)).toEqual([]);
    });

    it('empty results → empty output', () => {
      expect(WeightedAggregator.aggregate([], [])).toEqual([]);
    });
  });

  // --- Test 6: Contributing fragments tracking ---
  describe('contributing fragments', () => {
    it('output includes which fragments contributed per skill', () => {
      const fragList = fragments(
        ['coding', 0.5],
        ['security', 0.3],
        ['performance', 0.2]
      );

      const fragRes: FragmentResults[] = [
        fragmentResults('coding', [
          { id: 'skill-wide', score: 0.9 },
        ]),
        fragmentResults('security', [
          { id: 'skill-wide', score: 0.7 },
        ]),
        fragmentResults('performance', [
          { id: 'skill-wide', score: 0.5 },
        ]),
      ];

      const result = WeightedAggregator.aggregate(fragList, fragRes);

      expect(result.length).toBe(1);
      const wide = result[0];

      // Should have all 3 contributing fragments
      expect(wide.contributingFragments.length).toBe(3);

      const fragmentNames = wide.contributingFragments.map((cf) => cf.fragment);
      expect(fragmentNames).toContain('coding');
      expect(fragmentNames).toContain('security');
      expect(fragmentNames).toContain('performance');

      // Verify weights are correctly tracked
      for (const cf of wide.contributingFragments) {
        const expectedWeight = fragList.find((f) => f.intent === cf.fragment)?.weight;
        expect(cf.weight).toBeCloseTo(expectedWeight ?? 0, 4);
      }
    });

    it('single-fragment skill has exactly one contributing fragment', () => {
      const fragList = fragments(['coding', 0.6], ['cncf', 0.4]);
      const fragRes: FragmentResults[] = [
        fragmentResults('coding', [{ id: 'coding-only', score: 0.8 }]),
        fragmentResults('cncf', [{ id: 'cncf-only', score: 0.7 }]),
      ];

      const result = WeightedAggregator.aggregate(fragList, fragRes);

      expect(result.length).toBe(2);
      for (const r of result) {
        expect(r.contributingFragments.length).toBe(1);
      }
    });
  });

  // --- Test 7: Sorting by aggregated score ---
  describe('sorting', () => {
    it('results are sorted by combined score descending', () => {
      const fragList = fragments(['a', 0.5], ['b', 0.5]);
      const fragRes: FragmentResults[] = [
        fragmentResults('a', [
          { id: 'low', score: 0.3 },
          { id: 'high', score: 0.9 },
          { id: 'mid', score: 0.6 },
        ]),
        fragmentResults('b', [
          { id: 'high-extra', score: 0.8 },
        ]),
      ];

      const result = WeightedAggregator.aggregate(fragList, fragRes);

      // Verify descending order
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score);
      }
    });
  });
});
