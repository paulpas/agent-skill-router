// Vector Database - for skill retrieval using semantic similarity

import { promises as fs } from 'fs';
import path from 'path';
import type { SkillDefinition, SkillSearchResult } from '../core/types';
import { Logger } from '../observability/Logger';
import { HNSWIndex } from './HNSW';

/**
 * Configuration for the vector database
 */
export interface VectorDatabaseConfig {
  cacheDirectory?: string;
  maxResults?: number;
  similarityThreshold?: number;
  useHNSW?: boolean;
  hnswM?: number;
  hnswEfConstruction?: number;
  hnswEfSearch?: number;
}

/**
 * Vector database for skill retrieval
 */
export class VectorDatabase {
  private skills: SkillDefinition[] = [];
  private config: VectorDatabaseConfig;
  private indexLoaded = false;
  private logger: Logger;
  private hnsw: HNSWIndex | null = null;
  private embeddingDimension: number = 1536;
  private totalInputTokens: number = 0;
  private totalOutputTokens: number = 0;

  constructor(config: VectorDatabaseConfig = {}) {
    this.config = {
      cacheDirectory: './.vector-cache',
      maxResults: 20,
      similarityThreshold: 0.3,
      useHNSW: true,
      hnswM: parseInt(process.env.HNSW_M || '16', 10),
      hnswEfConstruction: parseInt(process.env.HNSW_EF_CONSTRUCTION || '200', 10),
      hnswEfSearch: parseInt(process.env.HNSW_EF_SEARCH || '100', 10),
      ...config,
    };
    this.logger = new Logger('VectorDatabase', {
      level: 'info',
      includePayloads: false,
    });
  }

  /**
   * Add skills to the database
   */
  addSkills(skills: SkillDefinition[]): void {
    this.skills.push(...skills);
    this.indexLoaded = true;
    
    // Rebuild HNSW for efficient approximate nearest neighbor search
    this.rebuildHNSW();
  }

  /**
   * Set skills from an array
   */
  setSkills(skills: SkillDefinition[]): void {
    this.skills = skills;
    this.indexLoaded = true;

    // Rebuild HNSW for efficient approximate nearest neighbor search
    this.rebuildHNSW();
  }

  /**
   * Search for similar skills based on embedding
   */
  async search(
    queryEmbedding: number[],
    topN?: number
  ): Promise<SkillSearchResult[]> {
    if (!this.indexLoaded) {
      return [];
    }

    // Use HNSW for efficient approximate search if enabled and available
    if (this.config.useHNSW && this.hnsw) {
      return this.searchWithHNSW(queryEmbedding, topN);
    }

    // Fallthrough: brute-force O(n)
    const results = await this.calculateSimilarity(queryEmbedding);
    const sorted = results.sort((a, b) => b.score - a.score);
    const limited = sorted.slice(0, topN ?? this.config.maxResults!);

    return limited.filter(
      (result) => result.score >= this.config.similarityThreshold!
    );
  }

  /**
   * Search using HNSW for approximate nearest neighbor search
   */
  private async searchWithHNSW(
    queryEmbedding: number[],
    topN?: number
  ): Promise<SkillSearchResult[]> {
    if (!this.hnsw || this.skills.length === 0) {
      return [];
    }

    // Normalize query embedding to unit vector
    const normalizedQuery = this.normalizeVector(queryEmbedding);
    if (!normalizedQuery) {
      this.logger.error('Failed to normalize query embedding (zero magnitude)');
      return [];
    }

    const k = topN ?? this.config.maxResults!;
    const nearestResults = this.hnsw.search(normalizedQuery, k);

    // Map HNSW indices back to skill search results
    const results: SkillSearchResult[] = [];
    for (const result of nearestResults) {
      const skill = this.skills[result.index];
      if (!skill || !skill.metadata.embedding) continue;

      // Calculate exact cosine similarity for final score
      const score = this.cosineSimilarity(queryEmbedding, skill.metadata.embedding);
      results.push({ skill, score });
    }

    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate similarity between query and all skills
   */
  private async calculateSimilarity(
    queryEmbedding: number[]
  ): Promise<SkillSearchResult[]> {
    const results: SkillSearchResult[] = [];

    for (const skill of this.skills) {
      if (!skill.metadata.embedding) {
        continue;
      }

      const score = this.cosineSimilarity(
        queryEmbedding,
        skill.metadata.embedding
      );

      results.push({
        skill,
        score,
      });
    }

    return results;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      return 0;
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      magnitudeA += vecA[i] * vecA[i];
      magnitudeB += vecB[i] * vecB[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Normalize a vector to unit length (L2 normalization)
   * @param vector Input vector
   * @returns Normalized vector or null if magnitude is zero
   */
  private normalizeVector(vector: number[]): number[] | null {
    // Parse: validate input is array
    if (!Array.isArray(vector)) {
      return null;
    }

    // Calculate L2 magnitude
    let magnitude = 0;
    for (let i = 0; i < vector.length; i++) {
      const val = vector[i];
      if (typeof val !== 'number' || isNaN(val)) {
        return null;
      }
      magnitude += val * val;
    }

    magnitude = Math.sqrt(magnitude);

    // Fail fast: zero magnitude vector cannot be normalized
    if (magnitude === 0) {
      return null;
    }

    // Normalize each component
    const normalized: number[] = [];
    for (let i = 0; i < vector.length; i++) {
      normalized.push(vector[i] / magnitude);
    }

    return normalized;
  }

  /**
   * Rebuild HNSW index from skill embeddings.
   * Normalizes embeddings to unit vectors before building.
   *
   * For unit vectors, squared Euclidean distance is equivalent to cosine distance:
   * ||a - b||^2 = ||a||^2 + ||b||^2 - 2*a.b = 2 - 2*cos(theta) when ||a||=||b||=1
   *
   * This means ranking by squared Euclidean distance on normalized vectors gives the
   * same result as ranking by cosine similarity.
   */
  private rebuildHNSW(): void {
    // Early exit: HNSW disabled
    if (!this.config.useHNSW) {
      this.hnsw = null;
      return;
    }

    // Early exit: no skills to index
    if (this.skills.length === 0) {
      this.hnsw = null;
      return;
    }

    // Parse and validate embeddings at boundary, normalize to unit vectors
    const points: number[][] = [];

    for (const skill of this.skills) {
      if (!skill.metadata.embedding) continue;

      const embedding = skill.metadata.embedding;

      // Validate embedding is array
      if (!Array.isArray(embedding)) {
        this.logger.warn('Invalid embedding format, skipping skill', {
          skillName: skill.metadata.name,
        });
        continue;
      }

      // Validate dimension consistency
      if (embedding.length !== this.embeddingDimension) {
        this.logger.warn('Dimension mismatch in embedding, skipping skill', {
          skillName: skill.metadata.name,
          expectedDimension: this.embeddingDimension,
          actualDimension: embedding.length,
        });
        continue;
      }

      // Validate all coordinates are valid numbers and compute magnitude
      let magnitude = 0;
      let valid = true;
      for (let i = 0; i < embedding.length; i++) {
        if (typeof embedding[i] !== 'number' || isNaN(embedding[i])) {
          valid = false;
          break;
        }
        magnitude += embedding[i] * embedding[i];
      }
      if (!valid) continue;

      magnitude = Math.sqrt(magnitude);
      if (magnitude === 0) continue;

      // Normalize to unit vector
      const normalized: number[] = [];
      for (let i = 0; i < embedding.length; i++) {
        normalized.push(embedding[i] / magnitude);
      }
      points.push(normalized);
    }

    // Fail fast: no valid embeddings found
    if (points.length === 0) {
      this.hnsw = null;
      this.logger.warn('No valid embeddings found for HNSW build');
      return;
    }

    try {
      this.hnsw = new HNSWIndex(
        this.config.hnswM,
        this.config.hnswEfConstruction,
        this.config.hnswEfSearch
      );
      const t0 = performance.now();
      this.hnsw.build(points);
      const elapsed = performance.now() - t0;

      this.logger.info('HNSW index built successfully', {
        skillCount: points.length,
        dimension: this.embeddingDimension,
        config: this.hnsw.getConfig(),
        buildTimeMs: Math.round(elapsed),
      });
    } catch (error) {
      this.logger.error('Failed to build HNSW index', {
        error: error instanceof Error ? error.message : String(error),
      });
      this.hnsw = null;
    }
  }

  /**
   * Add input tokens to the tracker
   */
  addInputTokens(count: number): void {
    // Parse: ensure count is a valid positive number
    if (typeof count !== 'number' || count < 0 || isNaN(count)) {
      this.logger.warn('Invalid token count for input tracking', { count });
      return;
    }

    this.totalInputTokens += count;
  }

  /**
   * Add output tokens to the tracker
   */
  addOutputTokens(count: number): void {
    // Parse: ensure count is a valid positive number
    if (typeof count !== 'number' || count < 0 || isNaN(count)) {
      this.logger.warn('Invalid token count for output tracking', { count });
      return;
    }

    this.totalOutputTokens += count;
  }

  /**
   * Get token statistics
   */
  getTokenStats(): { input: number; output: number; total: number } {
    // Atomic: return fresh object, don't expose internal state
    return {
      input: this.totalInputTokens,
      output: this.totalOutputTokens,
      total: this.totalInputTokens + this.totalOutputTokens,
    };
  }

  /**
   * Save the vector index to disk
   */
  async saveIndex(): Promise<void> {
    try {
      await fs.mkdir(this.config.cacheDirectory!, { recursive: true });

      const indexData = {
        skills: this.skills.map((s) => ({
          name: s.metadata.name,
          category: s.metadata.category,
          embedding: s.metadata.embedding,
        })),
        tokenStats: {
          inputTokens: this.totalInputTokens,
          outputTokens: this.totalOutputTokens,
        },
        savedAt: new Date().toISOString(),
      };

      const indexFile = path.join(
        this.config.cacheDirectory!,
        'vector-index.json'
      );
      await fs.writeFile(indexFile, JSON.stringify(indexData, null, 2));
    } catch (error) {
      this.logger.error('Failed to save vector index:', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Load the vector index from disk
   */
  async loadIndex(): Promise<void> {
    try {
      const indexFile = path.join(
        this.config.cacheDirectory!,
        'vector-index.json'
      );

      const data = await fs.readFile(indexFile, 'utf-8');
      const indexData = JSON.parse(data);

this.skills = indexData.skills.map((skill: { name: string; category: string; embedding: number[] }) => ({
         metadata: {
           name: skill.name,
           category: skill.category,
           description: '',
           tags: [],
           input_schema: {},
           output_schema: {},
           embedding: skill.embedding,
         },
         sourceFile: '',
         rawContent: '',
       }));

      // Restore token stats if present
      if (indexData.tokenStats) {
        this.totalInputTokens = indexData.tokenStats.inputTokens || 0;
        this.totalOutputTokens = indexData.tokenStats.outputTokens || 0;
      }

      this.indexLoaded = true;

      // Rebuild HNSW after loading
      this.rebuildHNSW();
    } catch (error) {
      this.logger.error('Failed to load vector index:', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get all skills from the database
   */
  getAllSkills(): SkillDefinition[] {
    return this.skills;
  }

  /**
   * Get the number of skills in the database
   */
  size(): number {
    return this.skills.length;
  }

  /**
   * Clear the database
   */
  clear(): void {
    this.skills = [];
    this.indexLoaded = false;
    this.hnsw = null;
    this.totalInputTokens = 0;
    this.totalOutputTokens = 0;
  }

  /**
   * Filter skills by category
   */
  filterByCategory(category: string): SkillDefinition[] {
    return this.skills.filter(
      (skill) => skill.metadata.category === category
    );
  }

  /**
   * Filter skills by tag
   */
  filterByTag(tag: string): SkillDefinition[] {
    return this.skills.filter((skill) =>
      skill.metadata.tags.includes(tag)
    );
  }
}
