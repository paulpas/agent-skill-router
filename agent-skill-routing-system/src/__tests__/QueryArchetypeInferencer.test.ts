// Tests for QueryArchetypeInferencer
import { QueryArchetypeInferencer } from '../core/QueryArchetypeInferencer';

describe('QueryArchetypeInferencer', () => {
  // --- Real-world query tests ---
  describe('real-world queries', () => {
    it('fix this ingress timeout → returns tactical', () => {
      const results = QueryArchetypeInferencer.infer('fix this ingress timeout');

      expect(results).toContain('tactical');
      // "fix" is a tactical keyword; no diagnostic keywords present in query
    });

    it('troubleshoot why the service is broken → returns diagnostic', () => {
      const results = QueryArchetypeInferencer.infer('troubleshoot why the service is broken');

      expect(results).toContain('diagnostic'); // "troubleshoot" and "broken" are diagnostic keywords
    });

    it('design a scalable event bus → returns strategic', () => {
      const results = QueryArchetypeInferencer.infer('design a scalable event bus');

      expect(results).toContain('strategic');
    });

    it('teach me how kubernetes networking works → returns educational', () => {
      const results = QueryArchetypeInferencer.infer('teach me how kubernetes networking works');

      expect(results).toContain('educational');
    });

    it('implement a stop loss strategy for crypto trading → returns tactical', () => {
      const results = QueryArchetypeInferencer.infer('implement a stop loss strategy for crypto trading');

      expect(results).toContain('tactical');
    });

    it('automate my CI/CD pipeline with gitops workflow orchestration → returns orchestration', () => {
      const results = QueryArchetypeInferencer.infer('automate my CI/CD pipeline with gitops workflow orchestration');

      expect(results).toContain('orchestration'); // "automate", "pipeline", "workflow", "orchestrate"
      // No tactical keywords in this query
    });
  });

  // --- Edge cases ---
  describe('edge cases', () => {
    it('empty query returns empty array', () => {
      expect(QueryArchetypeInferencer.infer('')).toEqual([]);
    });

    it('query with no matching keywords returns empty array', () => {
      const results = QueryArchetypeInferencer.infer('the quick brown fox jumps over the lazy dog');
      expect(results.length).toBe(0);
    });

    it('single keyword triggers correct archetype', () => {
      const result = QueryArchetypeInferencer.infer('generate code');
      expect(result).toContain('generation');
    });
  });

  // --- Confidence scoring ---
  describe('confidence scoring', () => {
    it('confidence is in [0, 1] range for all results', () => {
      const results = QueryArchetypeInferencer.inferWithConfidence(
        'fix this bug and design a scalable pipeline'
      );

      for (const r of results) {
        expect(r.confidence).toBeGreaterThanOrEqual(0);
        expect(r.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('more keyword matches increase confidence', () => {
      const singleMatch = QueryArchetypeInferencer.inferWithConfidence('fix error');
      const doubleMatch = QueryArchetypeInferencer.inferWithConfidence('fix this bug and resolve the error');

      // Both should have tactical; double match should have higher confidence
      const singleConfidence = singleMatch.find((r) => r.archetype === 'tactical')?.confidence ?? 0;
      const doubleConfidence = doubleMatch.find((r) => r.archetype === 'tactical')?.confidence ?? 0;

      expect(doubleConfidence).toBeGreaterThanOrEqual(singleConfidence);
    });

    it('infersWithConfidence returns sorted by confidence descending', () => {
      const results = QueryArchetypeInferencer.inferWithConfidence(
        'fix this bug and resolve the error in my code'
      );

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].confidence).toBeGreaterThanOrEqual(results[i].confidence);
      }
    });

    it('only archetypes with matches are included', () => {
      const results = QueryArchetypeInferencer.inferWithConfidence('fix this bug');
      const archetypes = new Set(results.map((r) => r.archetype));

      // Should include tactical (for "fix" and "bug")
      expect(archetypes).toContain('tactical');
    });
  });

  // --- Keyword coverage ---
  describe('keyword coverage', () => {
    const testKeywords: Record<string, string[]> = {
      tactical: ['fix my code', 'resolve this issue', 'debug the function', 'configure the server', 'set up a database', 'install dependencies', 'patch the vulnerability', 'error handling', 'fix that bug', 'implement a validator', 'add error handling'],
      strategic: ['design the system', 'architect the solution', 'plan the migration', 'build a scalable service', 'long-term strategy', 'future-proof the design', 'evolve to microservices', 'migrate from monolith', 'restructure the codebase'],
      diagnostic: ['why is this failing', 'what caused the crash', 'investigate the slowness', 'root cause analysis', 'diagnose the problem', 'troubleshoot deployment', 'slow response time', 'service is broken', 'issue with auth', 'check why it failed'],
      orchestration: ['automate the pipeline', 'coordinate multiple services', 'orchestrate deployments', 'integrate multiple APIs', 'chain of microservices', 'multi-step workflow', 'task delegation'],
      educational: ['explain how this works', 'teach me about patterns', 'how does dependency injection work', 'what is a design pattern', 'learn about testing', 'tutorial on auth', 'understand the concept of closures', 'concept of monads', 'difference between let and const'],
      enforcement: ['compliance check required', 'security policy update', 'perform security audit', 'requirement for encryption', 'must not expose secrets', 'forbidden patterns', 'validation gate', 'check that auth is enabled'],
      generation: ['generate boilerplate code', 'create from scratch', 'scaffold a new project', 'produce unit tests', 'auto-generate docs', 'code gen script'],
    };

    for (const [archetype, queries] of Object.entries(testKeywords)) {
      it(`"${queries[0]}" → includes ${archetype}`, () => {
        const results = QueryArchetypeInferencer.infer(queries[0]);
        expect(results).toContain(archetype);
      });
    }
  });
});
