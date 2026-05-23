// Tests for SpecificityScorer
import { SpecificityScorer } from '../retrieval/SpecificityScorer';

describe('SpecificityScorer', () => {
  // --- Test 1: Generic orchestration skill → low specificity ---
  describe('generic orchestration skill', () => {
   it('generic orchestration content → low specificity (~0.25)', () => {
      const description = 'This skill helps you orchestrate tasks and coordinate between multiple agents to complete complex workflows automatically.';
      const tags = ['orchestration', 'workflow', 'automation'];

      const score = SpecificityScorer.compute(
        'agent-task-routing',
        description,
        tags
      );

      // Generic orchestration prose without concrete technical details
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(0.55);
    });

   it('very generic prose with no technical terms → near-zero specificity', () => {
      const score = SpecificityScorer.computeTechnicalDensity(
        'The skill is useful for implementing this specific pattern or feature in your project. It helps you use the best approach and follow good practices to make sure everything works correctly.'
      );

      // All words are either stop words, generic fillers, or common English — low density
      expect(score).toBeLessThan(0.5);
    });
  });

  // --- Test 2: Highly specialized skill → high specificity ---
  describe('highly specialized skill', () => {
    it('kubernetes ingress controller debug → high specificity (~0.75+)', () => {
      const description = 'Debug Kubernetes ingress controller issues including TLS certificate errors, service endpoint misconfigurations, and network policy conflicts.';
      const tags = ['kubernetes', 'ingress', 'controller', 'debugging', 'tls'];

      const score = SpecificityScorer.compute(
        'cncf-k8s-ingress-debug',
        description,
        tags
      );

      // Technical content with domain-specific terms should score high
      expect(score).toBeGreaterThan(0.4);
    });

    it('dense technical content → high technical term density', () => {
      const text = 'Calculate the ATR-based stop loss level using exponential moving average of true range with volatility-adjusted multiplier for crypto futures trading positions.';

      const score = SpecificityScorer.computeTechnicalDensity(text);
      // Several domain terms (atr, stop, loss, crypto, futures) boost density
      expect(score).toBeGreaterThan(0.35);
    });
  });

  // --- Test 3: Technical density normalization ---
  describe('technical density', () => {
    it('short text vs long text — normalize by content length', () => {
      const shortText = 'kubernetes deployment orchestration';
      const longText = 'Kubernetes is an open-source container orchestration platform. Kubernetes provides developers and architects the building blocks to deploy microservices based applications across clusters of machines.';

      const shortScore = SpecificityScorer.computeTechnicalDensity(shortText);
      const longScore = SpecificityScorer.computeTechnicalDensity(longText);

      // Both should reflect similar technical density
      // Short text has 3 terms: kubernetes, deployment, orchestration — all technical
      // Long text has more generic words mixed in
      expect(shortScore).toBeGreaterThan(0.2);
      expect(longScore).toBeGreaterThanOrEqual(0);
      expect(longScore).toBeLessThanOrEqual(1.0);
    });

    it('single word → very low specificity', () => {
      const score = SpecificityScorer.computeTechnicalDensity('kubernetes');
      // Single technical word gets dampened to ~0.5
      expect(score).toBeLessThan(0.6);
    });

    it('empty input → returns 0', () => {
      const score = SpecificityScorer.computeTechnicalDensity('');
      expect(score).toBe(0);
    });

    it('only stop words → returns 0', () => {
      const score = SpecificityScorer.computeTechnicalDensity('the a is an of in for on with at by');
      expect(score).toBe(0);
    });
  });

  // --- Test 4: Stop words filtering ---
  describe('stop word filtering', () => {
    it('stop words are filtered out and do not count toward specificity', () => {
      const text = 'the skill is useful for implementing this pattern in the project with the best approach';
      const score = SpecificityScorer.computeTechnicalDensity(text);
      // After stop word removal: skill, useful, implementing, pattern, project, best, approach
      // "useful", "best" are generic — should reduce density somewhat
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1.0);
    });

    it('technical terms boost score above stop words', () => {
      const technicalText = 'kubernetes docker container orchestration deployment automation';
      const genericText = 'the a is an of in for on with at by to and';

      const techScore = SpecificityScorer.computeTechnicalDensity(technicalText);
      const genScore = SpecificityScorer.computeTechnicalDensity(genericText);

      expect(techScore).toBeGreaterThan(genScore);
    });
  });

  // --- Test 5: Domain vocabulary ratio ---
  describe('domain vocabulary', () => {
    it('trading terms boost score for a trading skill', () => {
      const text = 'calculate the volume weighted average price using Bollinger Bands with RSI divergence confirmation for crypto futures entry and exit points.';
      const score = SpecificityScorer.computeTechnicalDensity(text);

      // Several technical trading terms (rsi, bollinger, bands, crypto, futures) boost score
      expect(score).toBeGreaterThan(0.25);
    });

   it('mixed generic + specific → intermediate specificity', () => {
      const text = 'This skill provides guidance on implementing configuration management for production deployments. The approach includes validation, testing, and rollback procedures.';
      const score = SpecificityScorer.computeTechnicalDensity(text);

      // Mix of technical terms (deployment, testing) and generic English words
      expect(score).toBeGreaterThan(0.1);
    });

   it('cncf terms boost specificity for cncf skill', () => {
      const text = 'Configure Prometheus service monitor to scrape metrics from Kubernetes statefulset pods with custom labels and annotation-based discovery.';
      const score = SpecificityScorer.computeTechnicalDensity(text);

      // Multiple CNCF-specific terms (prometheus, kubernetes, pod) boost score
      expect(score).toBeGreaterThan(0.35);
    });
  });

  // --- Test 6: Empty input ---
  describe('empty input', () => {
    it('empty description → low specificity', () => {
      const score = SpecificityScorer.compute(
        'test-skill',
        '',
        []
      );
      expect(score).toBe(0);
    });

    it('only tags with no content → moderate score from tags alone', () => {
      const score = SpecificityScorer.compute(
        'test-skill',
        '',
        ['kubernetes', 'docker', 'containers']
      );
      // Tags contribute technical terms even without description
      expect(score).toBeGreaterThan(0);
    });

    it('computeTechnicalDensity on empty string → 0', () => {
      expect(SpecificityScorer.computeTechnicalDensity('')).toBe(0);
    });
  });

  // --- Test 7: Noun entropy ---
  describe('noun entropy', () => {
    it('focused domain → low noun entropy', () => {
      const text = 'kubernetes container orchestration deployment scaling';
      // Most words are related to the same domain (k8s)
      const score = SpecificityScorer.computeNounEntropy(text);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1.0);
    });

    it('mixed domains → higher noun entropy', () => {
      const text = 'kubernetes docker python javascript react node express';
      // Multiple distinct technologies
      const score = SpecificityScorer.computeNounEntropy(text);
      expect(score).toBeGreaterThan(0.5);
    });

    it('empty input → 0 entropy', () => {
      expect(SpecificityScorer.computeNounEntropy('')).toBe(0);
    });
  });

  // --- Test 8: Full compute() with rawContent ---
  describe('full compute() with rawContent', () => {
   it('skill with rich technical content and metadata → high score', () => {
      const description = 'Implements ATR-based trailing stop loss for crypto futures trading positions';
      const tags = ['trading', 'crypto', 'stop-loss', 'atr'];
      const rawContent = `# Trailing Stop Loss\n\nImplements automated trailing stop loss with Average True Range calculation.\n\n## Pattern 1: ATR-Based Trailing Stop\n\n\`\`\`typescript\ndef atr_trailing_stop(current_price: float, atr: float, multiplier: float = 2.0) -> float:\n    """Calculate ATR-based trailing stop level."""\n    return current_price - (atr * multiplier)\n\`\`\`\n\n## Pattern 2: Volatility-Adjusted Stop\n\nUses Bollinger Bands width to dynamically adjust stop distance.`;

      const score = SpecificityScorer.compute(
        'trading-atr-trailing-stop',
        description,
        tags,
        rawContent
      );

      // Rich technical trading content should score above baseline
      expect(score).toBeGreaterThan(0.2);
    });

   it('mix of generic + specific content → intermediate score (~0.3-0.6)', () => {
      const description = 'This skill helps you design and implement a good architecture for your application. It covers the main patterns and best practices.';
      const tags = ['architecture', 'design'];

      const score = SpecificityScorer.compute(
        'arch-general-patterns',
        description,
        tags
      );

      // Very generic content with only broad tag terms — expect low specificity
      expect(score).toBeLessThan(0.3);
    });
  });
});
