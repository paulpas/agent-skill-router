// Tests for TriggerMatchScorer
import { TriggerMatchScorer } from '../retrieval/TriggerMatchScorer';

describe('TriggerMatchScorer', () => {
  // --- Test 1: Direct match ---
  describe('direct match', () => {
    it('query "stop loss" vs triggers ["stop loss", "trailing stop"] → high score', () => {
      const score = TriggerMatchScorer.score(
        'stop loss',
        ['stop loss', 'trailing stop', 'emergency stop'],
        []
      );
      expect(score).toBeGreaterThan(0.8);
    });

    it('exact token match in trigger string → contributes to score', () => {
      const score = TriggerMatchScorer.score(
        'kubernetes',
        ['kubernetes', 'k8s', 'container orchestration'],
        []
      );
      expect(score).toBeGreaterThan(0.5);
    });
  });

  // --- Test 2: Acronym expansion ---
  describe('acronym expansion', () => {
    it('query "k8s" vs triggers ["kubernetes"] → should match via ACRONYMS dictionary', () => {
      const score = TriggerMatchScorer.score(
        'k8s',
        ['kubernetes'],
        []
      );
      expect(score).toBeGreaterThan(0);
    });

    it('query "vwap" vs triggers ["volume weighted average price"] → matches via ACRONYMS', () => {
      const score = TriggerMatchScorer.score(
        'vwap',
        ['volume weighted average price'],
        []
      );
      expect(score).toBeGreaterThan(0);
    });

    it('query "atr" vs triggers ["average true range"] → matches via ACRONYMS', () => {
      const score = TriggerMatchScorer.score(
        'atr',
        ['average true range'],
        []
      );
      expect(score).toBeGreaterThan(0);
    });

    it('acronym with expanded form in query: "volume weighted average price" matches trigger "vwap"', () => {
      const score = TriggerMatchScorer.score(
        'volume weighted average price',
        ['vwap'],
        []
      );
      expect(score).toBeGreaterThan(0);
    });

    it('multiple acronym expansions: "k8s promql" matches ["kubernetes", "prometheus"]', () => {
      const score = TriggerMatchScorer.score(
        'k8s promql',
        ['kubernetes', 'prometheus'],
        []
      );
      expect(score).toBeGreaterThan(0.5);
    });
  });

  // --- Test 3: Partial trigger match ---
  describe('partial trigger match', () => {
    it('query "trailing" vs trigger "trailing stop" → partial credit', () => {
      const score = TriggerMatchScorer.score(
        'trailing',
        ['trailing stop', 'fixed percentage'],
        []
      );
      // Should get partial credit for matching within a multi-word trigger
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(1.0);
    });

    it('substring match for multi-word triggers works', () => {
      const score = TriggerMatchScorer.score(
        'networking',
        ['kubernetes networking', 'pod management'],
        []
      );
      // "networking" appears as substring in "kubernetes networking"
      expect(score).toBeGreaterThan(0);
    });
  });

  // --- Test 4: No match ---
  describe('no match', () => {
    it('query "quantum computing" vs trading triggers → score 0', () => {
      const score = TriggerMatchScorer.score(
        'quantum computing',
        ['stop loss', 'trailing stop', 'atr-based', 'position sizing'],
        []
      );
      expect(score).toBe(0);
    });

    it('completely unrelated query → score 0', () => {
      const score = TriggerMatchScorer.score(
        'recipe cake baking',
        ['kubernetes deployment', 'docker containers'],
        []
      );
      expect(score).toBe(0);
    });
  });

  // --- Test 5: Multiple triggers in query ---
  describe('multiple triggers in query', () => {
    it('query "stop loss trailing atr" matches 2/3 triggers → ~0.67', () => {
      const score = TriggerMatchScorer.score(
        'stop loss trailing atr',
        ['stop loss', 'trailing stop', 'atr-based'],
        []
      );
      // "stop loss" matches trigger[0], "trailing" partially matches trigger[1]
      // Expected: ~0.67 (2 out of 3 triggers matched, with partial weighting)
      expect(score).toBeGreaterThan(0.4);
      expect(score).toBeLessThanOrEqual(1.0);
    });

    it('all 3 triggers in query → score close to 1.0', () => {
      const score = TriggerMatchScorer.score(
        'stop loss trailing stop atr based',
        ['stop loss', 'trailing stop', 'atr-based'],
        []
      );
      expect(score).toBeGreaterThan(0.8);
    });
  });

  // --- Test 6: Case insensitivity ---
  describe('case insensitivity', () => {
    it('query "KUBERNETES" matches trigger "kubernetes"', () => {
      const score = TriggerMatchScorer.score(
        'KUBERNETES',
        ['kubernetes'],
        []
      );
      expect(score).toBeGreaterThan(0);
    });

    it('query "Stop Loss Strategy" vs ["stop loss"] → case insensitive match', () => {
      const score = TriggerMatchScorer.score(
        'Stop Loss Strategy',
        ['stop loss'],
        []
      );
      expect(score).toBeGreaterThan(0);
    });
  });

  // --- Test 7: Empty triggers list ---
  describe('empty triggers list', () => {
    it('empty triggers array → score 0', () => {
      const score = TriggerMatchScorer.score(
        'kubernetes',
        [],
        []
      );
      expect(score).toBe(0);
    });

    it('empty tags array with valid triggers → still scores normally', () => {
      const score = TriggerMatchScorer.score(
        'kubernetes',
        ['kubernetes'],
        []
      );
      expect(score).toBeGreaterThan(0);
    });
  });

  // --- Test 8: Score boundary ---
  describe('score boundary', () => {
    it('single trigger match out of many → low but non-zero score', () => {
      const score = TriggerMatchScorer.score(
        'kubernetes',
        ['stop loss', 'trailing stop', 'position sizing', 'risk management', 'kubernetes'],
        []
      );
      // 1 match out of 5 triggers → base ratio is 0.2
      // With exact token weight (2x), the actual score depends on implementation
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(0.5);
    });

    it('score always in [0, 1] range', () => {
      const testCases = [
        { query: 'x', triggers: ['a', 'b'], tags: [] },
        { query: 'kubernetes docker go rust python', triggers: ['kubernetes', 'docker', 'go', 'rust', 'python'], tags: [] },
        { query: '', triggers: ['anything'], tags: [] },
      ];

      for (const tc of testCases) {
        const score = TriggerMatchScorer.score(tc.query, tc.triggers, tc.tags);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1.0);
      }
    });
  });

  // --- Test 9: Tags integration ---
  describe('tags integration', () => {
    it('query matches tag → contributes to score', () => {
      const score = TriggerMatchScorer.score(
        'monitoring',
        ['deployment'],
        ['metrics monitoring alerting']
      );
      expect(score).toBeGreaterThan(0);
    });

    it('triggers and tags combined → higher score for more coverage', () => {
      const withTags = TriggerMatchScorer.score(
        'kubernetes',
        [],
        ['monitoring', 'kubernetes', 'containers']
      );
      const withoutTags = TriggerMatchScorer.score(
        'kubernetes',
        [],
        ['monitoring', 'containers']
      );
      expect(withTags).toBeGreaterThan(withoutTags);
    });
  });

  // --- Test 10: Tokenization behavior ---
  describe('tokenization', () => {
    it('hyphenated terms in query match hyphenated triggers', () => {
      const score = TriggerMatchScorer.score(
        'stop-loss',
        ['stop loss'],
        []
      );
      expect(score).toBeGreaterThan(0);
    });

    it('punctuation-stripped tokens still match', () => {
      const score = TriggerMatchScorer.score(
        'kubernetes, deployment!',
        ['kubernetes deployment'],
        []
      );
      expect(score).toBeGreaterThan(0);
    });
  });
});
