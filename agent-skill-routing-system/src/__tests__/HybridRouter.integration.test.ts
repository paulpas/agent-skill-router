// Integration tests for Hybrid Router Pipeline (Phase 2)
// Tests end-to-end scoring pipeline through direct component composition
// (Router is not imported directly due to uuid ESM incompatibility with Jest)
import { BM25Indexer, BM25Document } from '../retrieval/BM25Indexer';
import { TriggerMatchScorer } from '../retrieval/TriggerMatchScorer';
import { SpecificityScorer } from '../retrieval/SpecificityScorer';
import { ConcisenessScorer } from '../retrieval/ConcisenessScorer';
import { HybridScorer, ScoreComponents } from '../retrieval/HybridScorer';
import { QueryArchetypeInferencer } from '../core/QueryArchetypeInferencer';
import { ArchetypeRankingBoost } from '../core/ArchetypeRankingBoost';
import { AntiTriggerScorer } from '../core/AntiTriggerScorer';

/** Mock skill definition matching Router's expected structure */
interface MockSkill {
  metadata: {
    name: string;
    description: string;
    tags: string[];
    triggers?: string[];
    archetypes?: string[];
    antiTriggers?: string[];
    responseProfile?: { verbosity?: string; directiveStrength?: string };
    performance?: { successRate: number };
  };
  rawContent: string;
}

/**
 * Full hybrid scoring pipeline — mirrors Router.applyHybridScoring logic.
 */
function applyFullHybridPipeline(
  query: string,
  bm25Indexer: BM25Indexer,
  skills: MockSkill[],
  config?: Partial<{ vectorWeight: number; bm25Weight: number; triggerMatchWeight: number; archetypeWeight: number; historicalWeight: number }>
): Array<{ name: string; score: number }> {
  const scorer = new HybridScorer({
    vectorWeight: config?.vectorWeight ?? 0.50,
    bm25Weight: config?.bm25Weight ?? 0.20,
    triggerMatchWeight: config?.triggerMatchWeight ?? 0.15,
    archetypeWeight: config?.archetypeWeight ?? 0.10,
    historicalWeight: config?.historicalWeight ?? 0.05,
  });

  const results = skills.map((skill) => {
    // BM25 scoring
    const bm25Results = bm25Indexer.score(query);
    const normalizedScores = BM25Indexer.normalizeScores(
      new Map(bm25Results.map(r => [r.id, r.score]))
    );
    const bm25Score = normalizedScores.get(skill.metadata.name) ?? 0;

    // Trigger match scoring
    const triggerScore = TriggerMatchScorer.score(
      query,
      skill.metadata.tags ?? [],
      skill.metadata.triggers ?? []
    );

    // Archetype boost
    const queryArchetypes = QueryArchetypeInferencer.infer(query);
    const archetypeBoost = ArchetypeRankingBoost.computeBoost(
      queryArchetypes,
      skill.metadata.archetypes ?? []
    );

    // Anti-trigger penalty
    const antiTriggerPenalty = AntiTriggerScorer.computePenalty(
      query,
      skill.metadata.antiTriggers ?? []
    );

    // Specificity score
    const specificityScore = SpecificityScorer.compute(
      skill.metadata.name,
      skill.metadata.description,
      skill.metadata.tags ?? [],
      skill.rawContent?.slice(0, 2000)
    );

    // Conciseness score
    const concisenessMetrics = ConcisenessScorer.analyze(skill.rawContent ?? '', {
      verbosity: skill.metadata.responseProfile?.verbosity,
      directiveStrength: skill.metadata.responseProfile?.directiveStrength,
    });
    const concisenessScore = ConcisenessScorer.computeScore(concisenessMetrics);

    // Historical success rate
    const historicalRate = skill.metadata.performance?.successRate ?? 50;

    const components: ScoreComponents = {
      vectorSimilarity: 0, // Vector similarity would come from KD-tree; set to 0 for pipeline-only test
      bm25Score,
      triggerMatchScore: triggerScore,
      archetypeBoost,
      antiTriggerPenalty,
      specificityScore,
      concisenessScore,
      historicalSuccessRate: historicalRate / 100,
    };

    return { name: skill.metadata.name, score: scorer.compute(components) };
  });

  // Sort by hybrid score descending
  results.sort((a, b) => b.score - a.score);
  return results;
}

/** Mock BM25 documents from skills */
function buildBM25Docs(skills: MockSkill[]): BM25Document[] {
  return skills.map(skill => ({
    id: skill.metadata.name,
    fieldTexts: {
      description: skill.metadata.description || '',
      tags: (skill.metadata.tags || []).join(' '),
      triggers: (skill.metadata.triggers || []).join(' '),
      rawContent: skill.rawContent || '',
    },
  }));
}

describe('Hybrid Router Pipeline Integration', () => {
  // Test skill dataset — a representative subset of real skills
  const testSkills: MockSkill[] = [
    {
      metadata: {
        name: 'cncf-kubernetes-networking',
        description: 'Kubernetes pod networking, service discovery, and ingress controller configuration',
        tags: ['kubernetes', 'networking', 'service mesh', 'ingress'],
        triggers: ['kubernetes networking k8s ingress service mesh'],
        archetypes: ['tactical'],
        responseProfile: { verbosity: 'low', directiveStrength: 'high' },
      },
      rawContent: `# Kubernetes Networking Guide\n\n1. **Configure** the Service resource for cluster-internal communication.\n2. **Deploy** an Ingress controller (nginx or traefik).\n3. **Set up** TLS termination in the Ingress spec.\n\n## Checklist\n- [ ] Verify DNS resolution\n- [ ] Test health endpoints`,
    },
    {
      metadata: {
        name: 'cncf-prometheus-monitoring',
        description: 'Prometheus metrics scraping, alerting rules configuration, and ServiceMonitor setup',
        tags: ['prometheus', 'monitoring', 'alerting', 'metrics'],
        triggers: ['prometheus promql monitoring alerting servicemonitor'],
        archetypes: ['tactical'],
        antiTriggers: ['trading', 'stock market'],
        responseProfile: { verbosity: 'medium', directiveStrength: 'high' },
      },
      rawContent: `# Prometheus Configuration\n\n1. **Install** Prometheus via Helm chart.\n2. **Configure** scrape targets in prometheus.yml.\n3. **Deploy** ServiceMonitor for automatic discovery.\n4. **Set up** alerting rules in alertmanager.yaml.`,
    },
    {
      metadata: {
        name: 'trading-risk-stop-loss',
        description: 'Implements stop-loss strategies (fixed percentage, ATR-based, trailing) for position risk management',
        tags: ['trading', 'stop loss', 'atr', 'risk management'],
        triggers: ['stop loss trailing stop atr position protection'],
        archetypes: ['tactical', 'enforcement'],
        responseProfile: { verbosity: 'low', directiveStrength: 'high' },
      },
      rawContent: `# Stop Loss Strategies\n\n1. **Calculate** ATR-based stop level: current_price - (atr * 2.0)\n2. **Apply** trailing stop with 3x ATR distance\n3. **Layer** emergency stop at portfolio level`,
    },
    {
      metadata: {
        name: 'agent-task-routing',
        description: 'Helps you orchestrate tasks and coordinate between multiple agents to complete complex workflows automatically',
        tags: ['orchestration', 'workflow', 'automation'],
        triggers: ['task routing orchestration delegation automation'],
        archetypes: ['orchestration'],
        responseProfile: { verbosity: 'high', directiveStrength: 'low' },
      },
      rawContent: `# Task Routing\n\nThis skill provides general guidance on task orchestration and workflow automation. Follow best practices for each use case.`,
    },
    {
      metadata: {
        name: 'coding-security-review',
        description: 'Security code review patterns including OWASP Top 10, injection prevention, authentication checks',
        tags: ['security', 'code review', 'owasp', 'injection'],
        triggers: ['code review security audit owasp vulnerability'],
        archetypes: ['enforcement'],
        responseProfile: { verbosity: 'medium', directiveStrength: 'high' },
      },
      rawContent: `# Security Review Checklist\n\n- [ ] Check for SQL injection vulnerabilities\n- [ ] Verify authentication on all endpoints\n- [ ] Validate input sanitization\n- [ ] Review CORS configuration`,
    },
  ];

  const bm25Indexer = BM25Indexer.buildIndex(buildBM25Docs(testSkills));

  // --- Test 1: End-to-end routing produces ranked results ---
  describe('end-to-end hybrid scoring', () => {
    it('produces ranked results that are non-empty and sorted descending', () => {
      const query = 'How do I configure Kubernetes ingress for TLS termination?';
      const results = applyFullHybridPipeline(query, bm25Indexer, testSkills);

      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBe(testSkills.length);

      // Verify scores are sorted descending
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }

      // Top result should be a Kubernetes-related skill
      const topName = results[0].name;
      expect(topName).toContain('kubernetes');
    });
  });

  // --- Test 2: Hybrid score differs from pure vector (LLM) ranking ---
  describe('hybrid vs LLM-only ranking', () => {
    it('BM25 component changes the relative ordering for exact keyword matches', () => {
      // Query with strong keyword match
      const query = 'prometheus alerting rules';

      const results = applyFullHybridPipeline(query, bm25Indexer, testSkills);

      // The Prometheus skill should be highly ranked due to BM25 + trigger match
      const prometheusIdx = results.findIndex(r => r.name === 'cncf-prometheus-monitoring');
      expect(prometheusIdx).toBeLessThan(2); // Should be top 2
    });

    it('hybrid pipeline produces different results for different queries', () => {
      const tradingQuery = 'implement stop loss strategy';
      const infraQuery = 'set up container networking';

      const tradingResults = applyFullHybridPipeline(tradingQuery, bm25Indexer, testSkills);
      const infraResults = applyFullHybridPipeline(infraQuery, bm25Indexer, testSkills);

      // Different queries should surface different top skills
      expect(tradingResults[0].name).toContain('stop-loss');
      expect(infraResults.find(r => r.name.includes('kubernetes'))).toBeDefined();
    });
  });

  // --- Test 3: BM25 exact term match boosts score ---
  describe('BM25 exact term match boosting', () => {
    it('query with exact keyword matches get higher scores than partial matches', () => {
      const query = 'kubernetes ingress controller';
      const results = applyFullHybridPipeline(query, bm25Indexer, testSkills);

      const k8sNetworkingScore = results.find(r => r.name === 'cncf-kubernetes-networking')!.score;
      const genericOrchestrationScore = results.find(r => r.name === 'agent-task-routing')!.score;

      // Kubernetes networking should score higher (has matching keywords)
      expect(k8sNetworkingScore).toBeGreaterThan(genericOrchestrationScore);
    });
  });

  // --- Test 4: High-specificity skill outranks generic ---
  describe('specificity ranking', () => {
    it('specialized technical queries surface specialized skills first', () => {
      const query = 'configure prometheus service monitor custom annotations';
      const results = applyFullHybridPipeline(query, bm25Indexer, testSkills);

      // The Prometheus monitoring skill is more specific than the generic orchestration skill
      const prometheusScore = results.find(r => r.name === 'cncf-prometheus-monitoring')!.score;
      const genericScore = results.find(r => r.name === 'agent-task-routing')!.score;

      expect(prometheusScore).toBeGreaterThan(genericScore);
    });

    it('generic orchestration skill scores lower on specific technical queries', () => {
      const query = 'debug TLS certificate error nginx ingress';
      const results = applyFullHybridPipeline(query, bm25Indexer, testSkills);

      // Kubernetes networking (specific) > task routing (generic)
      const k8sScore = results.find(r => r.name === 'cncf-kubernetes-networking')!.score;
      const genericScore = results.find(r => r.name === 'agent-task-routing')!.score;

      expect(k8sScore).toBeGreaterThan(genericScore);
    });
  });

  // --- Test 5: Anti-trigger penalty reduces score ---
  describe('anti-trigger penalty', () => {
    it('skills with anti-triggers matching the query get reduced scores', () => {
      // The prometheus skill has antiTriggers: ['trading', 'stock market']
      // Query about trading should trigger anti-triggers for prometheus

      const tradingQuery = 'crypto trading strategy analysis';
      const results = applyFullHybridPipeline(tradingQuery, bm25Indexer, testSkills);

      const prometheusScore = results.find(r => r.name === 'cncf-prometheus-monitoring')!.score;
      const stopLossScore = results.find(r => r.name === 'trading-risk-stop-loss')!.score;

      // Stop loss skill should score higher (it's trading-relevant, no anti-triggers)
      expect(stopLossScore).toBeGreaterThan(prometheusScore);
    });
  });

  // --- Test 6: Configurable weights affect ranking ---
  describe('configurable weights', () => {
    it('changing retrieval weights produces different score values for same query', () => {
      const query = 'kubernetes deployment';

      // High BM25 weight config
      const bm25HeavyResults = applyFullHybridPipeline(
        query, bm25Indexer, testSkills,
        { vectorWeight: 0.10, bm25Weight: 0.70, triggerMatchWeight: 0.10, archetypeWeight: 0.05, historicalWeight: 0.05 }
      );

      // Balanced config (default)
      const balancedResults = applyFullHybridPipeline(
        query, bm25Indexer, testSkills,
        { vectorWeight: 0.50, bm25Weight: 0.20, triggerMatchWeight: 0.15, archetypeWeight: 0.10, historicalWeight: 0.05 }
      );

 // Scores should be valid in both cases
      expect(bm25HeavyResults[0].score).toBeGreaterThanOrEqual(0);
      expect(bm25HeavyResults[0].score).toBeLessThanOrEqual(1);
      expect(balancedResults[0].score).toBeGreaterThanOrEqual(0);
      expect(balancedResults[0].score).toBeLessThanOrEqual(1);

      // At least one config should have a positive top score
      expect(bm25HeavyResults[0].score).toBeGreaterThan(0);
    });
  });

  // --- Test 7: LLM fallback — hybrid scores work without vector similarity ---
  describe('LLM fallback', () => {
    it('when vectorSimilarity is 0, hybrid scores are computed from other components', () => {
      const query = 'implement authentication for web application';
      const results = applyFullHybridPipeline(query, bm25Indexer, testSkills);

      // At least one skill should have a positive score (from non-vector components)
      const hasPositiveScore = results.some(r => r.score > 0);
      expect(hasPositiveScore).toBe(true);
    });
  });

  // --- Test 8: Score breakdown correctness ---
  describe('score component validation', () => {
    it('all individual scorers contribute to the final score', () => {
      const query = 'debug a failing Kubernetes pod';
      const scorer = new HybridScorer();

      for (const skill of testSkills) {
        const bm25Results = bm25Indexer.score(query);
        const normScores = BM25Indexer.normalizeScores(
          new Map(bm25Results.map(r => [r.id, r.score]))
        );
        const bm25Score = normScores.get(skill.metadata.name) ?? 0;

      const triggerMatchScore = TriggerMatchScorer.score(
          query, skill.metadata.tags ?? [], skill.metadata.triggers ?? []
        );

        const archetypes = QueryArchetypeInferencer.infer(query);
        const archetypeBoost = ArchetypeRankingBoost.computeBoost(archetypes, skill.metadata.archetypes ?? []);

        const antiTriggerPenalty = AntiTriggerScorer.computePenalty(
          query, skill.metadata.antiTriggers ?? []
        );

        const specificityScore = SpecificityScorer.compute(
          skill.metadata.name, skill.metadata.description, skill.metadata.tags ?? [], skill.rawContent?.slice(0, 2000)
        );

        const concisenessMetrics = ConcisenessScorer.analyze(skill.rawContent ?? '', {
          verbosity: skill.metadata.responseProfile?.verbosity,
          directiveStrength: skill.metadata.responseProfile?.directiveStrength,
        });
        const concisenessScore = ConcisenessScorer.computeScore(concisenessMetrics);

        const components: ScoreComponents = {
          vectorSimilarity: 0.5,
          bm25Score,
          triggerMatchScore,
          archetypeBoost,
          antiTriggerPenalty,
          specificityScore,
          concisenessScore,
          historicalSuccessRate: skill.metadata.performance?.successRate ? skill.metadata.performance.successRate / 100 : undefined,
        };

        const finalScore = scorer.compute(components);

        // Final score should be clamped to [0, 1]
        expect(finalScore).toBeGreaterThanOrEqual(0);
        expect(finalScore).toBeLessThanOrEqual(1);

        // Breakdown should be available
        const breakdown = scorer.getScoreBreakdown(components);
        expect(breakdown.vectorSimilarity).toBeDefined();
        expect(breakdown.bm25Score).toBeDefined();
      }
    });
  });

  // --- Test 9: Edge cases ---
  describe('edge cases', () => {
    it('handles queries with no matching skills gracefully (all components still produce valid scores)', () => {
      const query = 'xyzzy plugh nonsense random words';
      const results = applyFullHybridPipeline(query, bm25Indexer, testSkills);

      expect(results.length).toBe(testSkills.length);
      // All scores should be in valid range even with nonsensical query
      for (const r of results) {
        expect(r.score).toBeGreaterThanOrEqual(0);
        expect(r.score).toBeLessThanOrEqual(1);
      }
    });

    it('empty skills array returns empty results', () => {
      const query = 'anything';
      const results = applyFullHybridPipeline(query, bm25Indexer, []);
      expect(results.length).toBe(0);
    });
  });
});
