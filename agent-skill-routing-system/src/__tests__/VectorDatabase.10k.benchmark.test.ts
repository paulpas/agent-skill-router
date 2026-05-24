/**
 * 10K Skill Scaling Benchmark for VectorDatabase
 *
 * Measures:
 * - KD-tree build time (should be fast since KD-tree is disabled at 1536d)
 * - Single query latency (brute-force at 10K)
 * - Batch query latency (10 queries)
 * - Verifies KD-tree is disabled for high-dimensional embeddings
 */

import { VectorDatabase } from '../embedding/VectorDatabase';
import type { SkillDefinition } from '../core/types';

describe('VectorDatabase - 10K Scaling Benchmark', () => {
  const TOTAL_SKILLS = 10000;
  const EMBEDDING_DIM = 1536;

  let db: VectorDatabase;
  let skills: SkillDefinition[];

  beforeAll(() => {
    db = new VectorDatabase({
      useKDTree: true,
      kdTreeDimensionThreshold: 128,
      maxResults: 20,
      similarityThreshold: 0.0,
    });

    // Generate 10,000 mock skills with random unit vector embeddings
    skills = Array.from({ length: TOTAL_SKILLS }, (_, i) => {
      // Generate a random unit vector (L2-normalized)
      const raw: number[] = new Array(EMBEDDING_DIM);
      let magnitude = 0;
      for (let d = 0; d < EMBEDDING_DIM; d++) {
        const val = Math.random() * 2 - 1;
        raw[d] = val;
        magnitude += val * val;
      }
      magnitude = Math.sqrt(magnitude);
      const embedding = magnitude > 0
        ? raw.map(v => v / magnitude)
        : raw.map(() => 0);

      return {
        metadata: {
          name: `benchmark-skill-${i}`,
          description: `Benchmark skill ${i} for 10K scaling test`,
          category: 'test',
          tags: ['benchmark', 'scaling'],
          input_schema: {},
          output_schema: {},
          embedding,
        },
        sourceFile: `skills/test/benchmark-skill-${i}/SKILL.md`,
        rawContent: `# Benchmark Skill ${i}\n\nTest content for scaling.`,
      } as SkillDefinition;
    });
  });

  it('should log KD-tree disabled message (dimension > threshold)', () => {
    // At 1536d with threshold 128, KD-tree should be disabled
    const testDb = new VectorDatabase({
      useKDTree: true,
      kdTreeDimensionThreshold: 128,
    });
    testDb.setSkills(skills);

    // Since dimension is 1536 > 128, KD-tree should be null -> uses brute-force
    expect((testDb as any).kdTree).toBeNull();
  });

  it('should build the vector database under 5 seconds', () => {
    const start = performance.now();
    db.setSkills(skills);
    const elapsed = performance.now() - start;

    console.log(`[BENCHMARK] Build ${TOTAL_SKILLS} skills: ${elapsed.toFixed(1)}ms`);
    expect(elapsed).toBeLessThan(5000);
  });

  it('should perform single query under 1000ms (CI-lenient)', async () => {
    // Generate random query embedding
    const query = Array.from({ length: EMBEDDING_DIM }, () => Math.random() * 2 - 1);

    const start = performance.now();
    const results = await db.search(query, 10);
    const elapsed = performance.now() - start;

    console.log(`[BENCHMARK] Single query: ${elapsed.toFixed(1)}ms, results: ${results.length}`);
    expect(elapsed).toBeLessThan(1000);
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('should perform 10 queries under 5000ms total (CI-lenient)', async () => {
    const queries = Array.from({ length: 10 }, () =>
      Array.from({ length: EMBEDDING_DIM }, () => Math.random() * 2 - 1),
    );

    const start = performance.now();
    for (const query of queries) {
      await db.search(query, 10);
    }
    const elapsed = performance.now() - start;

    console.log(`[BENCHMARK] 10 queries total: ${elapsed.toFixed(1)}ms`);
    expect(elapsed).toBeLessThan(5000);
  });
});
