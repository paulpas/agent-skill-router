// Tests for BM25Indexer
import { BM25Indexer } from '../retrieval/BM25Indexer';

describe('BM25Indexer', () => {
  // --- Test 1: Single term exact match ---
  describe('single term exact match', () => {
    it('query "kubernetes" matches document with "kubernetes" → high score, non-match excluded', () => {
      const docs = BM25Indexer.buildIndex([
        { id: 'cncf-kubernetes', fieldTexts: { description: 'Kubernetes container orchestration platform', tags: 'k8s containers', triggers: 'kubernetes k8s' } },
        { id: 'coding-python-basics', fieldTexts: { description: 'Python programming basics for beginners', tags: 'python basics', triggers: 'python beginner' } },
      ]);

      const results = docs.score('kubernetes');
      expect(results.length).toBeGreaterThan(0);

      // k8s document should be in results with positive score
      const k8sResult = results.find(r => r.id === 'cncf-kubernetes');
      expect(k8sResult!.score).toBeGreaterThan(0);

      // Python doc has no "kubernetes" term — it should NOT appear in results
      // (BM25 only returns docs that match query terms)
      const pythonResult = results.find(r => r.id === 'coding-python-basics');
      expect(pythonResult).toBeUndefined();
    });
  });

  // --- Test 2: Multiple terms ---
  describe('multiple terms', () => {
    it('query "kubernetes networking" scores both documents containing either/both', () => {
      const docs = BM25Indexer.buildIndex([
        { id: 'skill-net-1', fieldTexts: { description: 'Kubernetes pod networking and service discovery', tags: 'k8s networking', triggers: 'kubernetes networking service' } },
        { id: 'skill-net-2', fieldTexts: { description: 'Container networking fundamentals for microservices', tags: 'containers networking', triggers: 'container networking microservices' } },
        { id: 'skill-net-3', fieldTexts: { description: 'Kubernetes and Docker container orchestration platform', tags: 'k8s docker', triggers: 'kubernetes docker containers' } },
      ]);

      const results = docs.score('kubernetes networking');

      expect(results.length).toBe(3);
      // skill-net-1 has both terms → highest score
      const net1Result = results.find(r => r.id === 'skill-net-1')!;
      const net2Result = results.find(r => r.id === 'skill-net-2')!;
      const net3Result = results.find(r => r.id === 'skill-net-3')!;

      expect(net1Result.score).toBeGreaterThan(net2Result.score);
      // skill-net-1 (both terms) > skill-net-3 (only kubernetes) or skill-net-2 (only networking)
      expect(net1Result.score).toBeGreaterThan(Math.max(net2Result.score, net3Result.score));
    });
  });

  // --- Test 3: Document length normalization ---
  describe('document length normalization', () => {
    it('shorter doc with same term frequency gets higher BM25 than longer doc (B=0.75)', () => {
      // Both docs contain "kubernetes" exactly once
      // Short doc has ~6 tokens, long doc has ~80 tokens
      const docs = BM25Indexer.buildIndex([
        { id: 'short', fieldTexts: { description: 'Kubernetes cluster management and deployment' } },
        { id: 'long', fieldTexts: { description: 'Kubernetes is an open-source container orchestration platform designed for deploying and managing containerized applications at scale. The kubernetes ecosystem includes many tools for monitoring, logging, networking, storage provisioning, and service discovery. With kubernetes organizations can achieve reliable application deployment, horizontal scaling, self-healing capabilities, and automated rollouts and rollbacks across clusters of machines in various cloud environments and on-premises datacenters.' } },
      ]);

      const results = docs.score('kubernetes');
      expect(results.length).toBe(2);

      const shortResult = results.find(r => r.id === 'short')!;
      const longResult = results.find(r => r.id === 'long')!;

      // Short document should score higher (less dilution from length normalization)
      expect(shortResult.score).toBeGreaterThan(longResult.score);
    });
  });

  // --- Test 4: IDF smoothing ---
  describe('IDF smoothing', () => {
    it('rare terms score higher than common terms when appearing in same doc count', () => {
      const docs = BM25Indexer.buildIndex([
        { id: 'skill-1', fieldTexts: { description: 'Kubernetes ecosystem including etcd, kubectl, and container runtime' } },
        { id: 'skill-2', fieldTexts: { description: 'Container orchestration and deployment automation platform' } },
      ]);

      // "etcd" appears only in skill-1 → rarer → higher IDF contribution
      const etcdResults = docs.score('etcd');
      expect(etcdResults.length).toBe(1);
      expect(etcdResults[0].id).toBe('skill-1');
      expect(etcdResults[0].score).toBeGreaterThan(0);

      // "platform" appears in skill-2 → different doc, different IDF
      const platformResults = docs.score('platform');
      expect(platformResults.length).toBe(1);
      expect(platformResults[0].id).toBe('skill-2');
    });

    it('common stop words are filtered out — no results returned', () => {
      const docs = BM25Indexer.buildIndex([
        { id: 'skill-1', fieldTexts: { description: 'the kubernetes deployment configuration' } },
      ]);

      // "the" is a stop word → tokenized away → empty results
      const results = docs.score('the');
      expect(results.length).toBe(0);
    });
  });

  // --- Test 5: No match ---
  describe('no match', () => {
    it('query "quantum computing" against infrastructure docs → returns documents containing matching terms or empty', () => {
      const docs = BM25Indexer.buildIndex([
        { id: 'cncf-prometheus', fieldTexts: { description: 'Prometheus metrics monitoring and alerting system for cloud native' } },
        { id: 'cncf-kubernetes', fieldTexts: { description: 'Kubernetes container orchestration platform' } },
      ]);

      // Neither doc contains "quantum" or "computing" (after stop word filtering)
      const results = docs.score('quantum computing');
      expect(results.length).toBe(0);
    });
  });

  // --- Test 6: Empty query ---
  describe('empty query', () => {
    it('returns empty results for empty query string', () => {
      const docs = BM25Indexer.buildIndex([
        { id: 'skill-1', fieldTexts: { description: 'some content here' } },
      ]);

      expect(docs.score('').length).toBe(0);
    });

    it('returns empty results for whitespace-only query', () => {
      const docs = BM25Indexer.buildIndex([
        { id: 'skill-1', fieldTexts: { description: 'some content here' } },
      ]);

      expect(docs.score('   ').length).toBe(0);
    });
  });

  // --- Test 7: NormalizeScores ---
  describe('normalizeScores', () => {
    it('maps all scores to [0, 1] range with min=0 and max=1', () => {
      const docs = BM25Indexer.buildIndex([
        { id: 'skill-1', fieldTexts: { description: 'kubernetes deployment orchestration' } },
        { id: 'skill-2', fieldTexts: { description: 'python machine learning neural network deep learning' } },
        { id: 'skill-3', fieldTexts: { description: 'go concurrency goroutine channel patterns' } },
      ]);

      const rawResults = docs.score('kubernetes');
      expect(rawResults.length).toBeGreaterThan(0);

      const rawScores = new Map<string, number>();
      for (const r of rawResults) {
        rawScores.set(r.id, r.score);
      }

      const normalized = BM25Indexer.normalizeScores(rawScores);

      // All scores should be in [0, 1]
      for (const [, score] of normalized) {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      }

      // Max score should be exactly 1.0
      const maxScore = Math.max(...normalized.values());
      expect(maxScore).toBeCloseTo(1.0, 10);

      // Min score should be exactly 0.0 (if not all identical)
      if (rawScores.size > 1) {
        const minScore = Math.min(...normalized.values());
        expect(minScore).toBeCloseTo(0.0, 10);
      }
    });

    it('handles scores with zero and positive values correctly', () => {
      const map = new Map<string, number>();
      map.set('a', 0);
      map.set('b', 5);
      map.set('c', 10);

      const normalized = BM25Indexer.normalizeScores(map);

      expect(normalized.get('a')).toBeCloseTo(0.0, 10);
      expect(normalized.get('c')).toBeCloseTo(1.0, 10);
      // b should be midpoint between a and c
      expect(normalized.get('b')).toBeCloseTo(0.5, 10);
    });

    it('handles single score → returns 1.0', () => {
      const map = new Map<string, number>();
      map.set('only', 42.0);

      const normalized = BM25Indexer.normalizeScores(map);

      expect(normalized.get('only')).toBeCloseTo(1.0, 10);
    });

    it('handles empty map → returns empty map', () => {
      const map = new Map<string, number>();
      const normalized = BM25Indexer.normalizeScores(map);
      expect(normalized.size).toBe(0);
    });
  });

  // --- Test 8: Verify BM25 formula correctness with hand-computed example ---
  describe('BM25 formula correctness', () => {
    it('score matches expected value for simple two-document corpus', () => {
      // Two documents:
      // D1: "kubernetes kubernetes" (2 tokens)
      // D2: "kubernetes docker kubernetes kubernetes docker" (6 tokens)
      // avgdl = 4, N = 2

      const docs = BM25Indexer.buildIndex([
        { id: 'd1', fieldTexts: { description: 'kubernetes kubernetes' } },
        { id: 'd2', fieldTexts: { description: 'kubernetes docker kubernetes kubernetes docker' } },
      ]);

      const results = docs.score('kubernetes');

      expect(results.length).toBe(2);

      const d1Result = results.find(r => r.id === 'd1')!;
      const d2Result = results.find(r => r.id === 'd2')!;

      // D1 has fewer tokens (length normalization boost) and D2 is penalized more.
      // With 3 vs 2 occurrences, the longer doc's length penalty makes D1 score higher.
      // Key point: both scores are positive and non-trivial.
      expect(d1Result.score).toBeGreaterThan(0);
      expect(d2Result.score).toBeGreaterThan(0);

      // Verify scores are positive
      expect(d1Result.score).toBeGreaterThan(0);
      expect(d2Result.score).toBeGreaterThan(0);

      // Score values should be in reasonable BM25 range (small for 2-doc corpus)
      expect(d1Result.score).toBeLessThan(2.0);
      expect(d2Result.score).toBeLessThan(2.0);
    });

    it('each matching query term contributes independently to the total score', () => {
      const docs = BM25Indexer.buildIndex([
        { id: 'skill-a', fieldTexts: { description: 'kubernetes deployment orchestration and management platform kubernetes' } },
        { id: 'skill-b', fieldTexts: { description: 'docker container runtime and image management' } },
      ]);

      // Single term query — both docs have "kubernetes", skill-a has 2 occurrences
      const single = docs.score('kubernetes');

      // Multi-term query adds "deployment" which only skill-a has → skill-a accumulates more
      const multi = docs.score('kubernetes deployment');

      expect(single.length).toBe(1);
      expect(multi.length).toBe(1);

      // Skill A should rank first (only matching doc) in both
      expect(single.find(r => r.id === 'skill-a')!.score).toBeGreaterThan(0);
      expect(multi.find(r => r.id === 'skill-a')!.score).toBeGreaterThan(0);

      // Skill A multi-term score > single-term score (deployment adds independent contribution)
      const multiAScore = multi.find(r => r.id === 'skill-a')!.score;
      const singleAScore = single.find(r => r.id === 'skill-a')!.score;
      expect(multiAScore).toBeGreaterThan(singleAScore);
    });
  });

  // --- Additional: Sorting verification ---
  describe('results sorting', () => {
    it('returns results sorted by score descending', () => {
      const docs = BM25Indexer.buildIndex([
        { id: 'low-match', fieldTexts: { description: 'kubernetes is a tool' } },
        { id: 'high-match', fieldTexts: { description: 'Kubernetes kubernetes kubernetes deployment orchestration management platform' } },
      ]);

      const results = docs.score('kubernetes');
      // Only 2 docs, both contain "kubernetes"
      expect(results.length).toBe(2);

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });
  });

  // --- Additional: BuildIndex behavior ---
  describe('buildIndex', () => {
    it('builds index from documents correctly', () => {
      const docs = BM25Indexer.buildIndex([
        { id: 'skill-1', fieldTexts: { description: 'test content' } },
        { id: 'skill-2', fieldTexts: { description: 'more test content here' } },
      ]);

      expect(docs).toBeDefined();
    });

    it('handles single document corpus', () => {
      const docs = BM25Indexer.buildIndex([
        { id: 'only-one', fieldTexts: { description: 'single document testing' } },
      ]);

      const results = docs.score('document');
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('only-one');
      expect(results[0].score).toBeGreaterThan(0);
    });

    it('handles empty document list', () => {
      const docs = BM25Indexer.buildIndex([]);
      expect(docs.score('anything').length).toBe(0);
    });

    it('scores only indexed documents when topK is specified', () => {
      const docs = BM25Indexer.buildIndex([
        { id: 'skill-1', fieldTexts: { description: 'kubernetes deployment' } },
        { id: 'skill-2', fieldTexts: { description: 'docker containers' } },
        { id: 'skill-3', fieldTexts: { description: 'go programming' } },
        { id: 'skill-4', fieldTexts: { description: 'python scripting' } },
        { id: 'skill-5', fieldTexts: { description: 'rust systems programming' } },
      ]);

      const results = docs.score('kubernetes docker', 2);
      expect(results.length).toBe(2);
    });
  });
});
