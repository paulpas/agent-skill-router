// Vector Database - for skill retrieval using semantic similarity

import { promises as fs } from 'fs';
import path from 'path';
import type { SkillDefinition, SkillSearchResult } from '../core/types';
import { Logger } from '../observability/Logger';
import { KDTree } from './KDTree';

/**
 * Configuration for the vector database
 */
export interface VectorDatabaseConfig {
  cacheDirectory?: string;
  maxResults?: number;
  similarityThreshold?: number;
  useKDTree?: boolean;
  kdTreeDimensionThreshold?: number;
}

/**
 * Vector database for skill retrieval
 */
export class VectorDatabase {
  private skills: SkillDefinition[] = [];
  private config: VectorDatabaseConfig;
  private indexLoaded = false;
  private logger: Logger;
  private kdTree: KDTree | null = null;
  private embeddingDimension: number = 1536;
  private totalInputTokens: number = 0;
  private totalOutputTokens: number = 0;

  constructor(config: VectorDatabaseConfig = {}) {
    this.config = {
      cacheDirectory: './.vector-cache',
      maxResults: 20,
      similarityThreshold: 0.3,
      useKDTree: true,
      kdTreeDimensionThreshold: 128,
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
    
    // Rebuild KD-tree for efficient nearest neighbor search
    this.rebuildKDTree();
  }

  /**
   * Set skills from an array
   */
  setSkills(skills: SkillDefinition[]): void {
    this.skills = skills;
    this.indexLoaded = true;
    
    // Rebuild KD-tree for efficient nearest neighbor search
    this.rebuildKDTree();
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

    // Use KD-tree for efficient search if enabled and available
    if (this.config.useKDTree && this.kdTree) {
      return this.searchWithKDTree(queryEmbedding, topN);
    }

    const results = await this.calculateSimilarity(queryEmbedding);
    const sorted = results.sort((a, b) => b.score - a.score);
    const limited = sorted.slice(0, topN ?? this.config.maxResults!);

    return limited.filter(
      (result) => result.score >= this.config.similarityThreshold!
    );
  }

  /**
   * Search using KD-tree for O(log n) nearest neighbor search
   */
  private async searchWithKDTree(
    queryEmbedding: number[],
    topN?: number
  ): Promise<SkillSearchResult[]> {
    // Fail fast: validate query dimension matches KD-tree dimension
    if (queryEmbedding.length !== this.embeddingDimension) {
      this.logger.error('Query embedding dimension mismatch', {
        queryDimension: queryEmbedding.length,
        expectedDimension: this.embeddingDimension,
      });
      return [];
    }

    // Early exit: empty KD-tree
    if (!this.kdTree || this.skills.length === 0) {
      return [];
    }

    // Normalize query embedding to unit vector for consistent distance calculation
    const normalizedQuery = this.normalizeVector(queryEmbedding);
    if (!normalizedQuery) {
      this.logger.error('Failed to normalize query embedding (zero magnitude)', {
        queryLength: queryEmbedding.length,
      });
      return [];
    }

    // Find nearest neighbors using KD-tree
    // KD-tree was built with normalized unit vectors, so Euclidean distance
    // is equivalent to cosine distance. The ranking is already correct.
    const k = topN ?? this.config.maxResults!;
    const nearestResults = this.kdTree.nearest(normalizedQuery, k);

    // Map KD-tree indices back to skill search results
    const results: SkillSearchResult[] = [];

    for (const result of nearestResults) {
      const skill = this.skills[result.index];
      if (!skill || !skill.metadata.embedding) {
        continue;
      }

      // Calculate cosine similarity for the final score
      // Using the original (non-normalized) embedding for accurate cosine value
      const score = this.cosineSimilarity(
        queryEmbedding,
        skill.metadata.embedding
      );

      results.push({
        skill,
        score,
      });
    }

    // Sort by score (descending) for consistent output
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
   * Rebuild KD-tree from skill embeddings
   * Normalizes embeddings to unit vectors before building.
   * 
   * For unit vectors, Euclidean distance is equivalent to cosine distance:
   * ||a - b||^2 = ||a||^2 + ||b||^2 - 2*a.b = 2 - 2*cos(theta) when ||a||=||b||=1
   * 
   * This means ranking by Euclidean distance on normalized vectors gives the same
   * result as ranking by cosine similarity, but KD-tree is optimized for Euclidean.
   */
  private rebuildKDTree(): void {
    // Early exit: KD-tree disabled
    if (!this.config.useKDTree) {
      this.kdTree = null;
      return;
    }

    // Early exit: no skills to index
    if (this.skills.length === 0) {
      this.kdTree = null;
      return;
    }

    // Early exit: KD-tree is ineffective at high dimensions (curse of dimensionality)
    if (this.embeddingDimension > (this.config.kdTreeDimensionThreshold ?? 128)) {
      this.logger.info('KD-tree disabled for high-dimensional embeddings', {
        dimension: this.embeddingDimension,
        threshold: this.config.kdTreeDimensionThreshold,
      });
      this.kdTree = null;
      return;
    }

    // Parse and validate embeddings at boundary, normalize to unit vectors
    const points: number[][] = [];
    let validatedDimension = this.embeddingDimension;

    for (const skill of this.skills) {
      if (!skill.metadata.embedding) {
        continue;
      }

      const embedding = skill.metadata.embedding;

      // Validate embedding is array
      if (!Array.isArray(embedding)) {
        this.logger.warn('Invalid embedding format, skipping skill', {
          skillName: skill.metadata.name,
        });
        continue;
      }

      // Validate dimension consistency - fail fast on mismatch
      if (embedding.length !== validatedDimension) {
        this.logger.warn('Dimension mismatch in embedding, skipping skill', {
          skillName: skill.metadata.name,
          expectedDimension: validatedDimension,
          actualDimension: embedding.length,
        });
        continue;
      }

      // Validate all coordinates are valid numbers
      let isValid = true;
      let magnitude = 0;
      for (let i = 0; i < embedding.length; i++) {
        if (typeof embedding[i] !== 'number' || isNaN(embedding[i])) {
          this.logger.warn('Invalid coordinate in embedding, skipping skill', {
            skillName: skill.metadata.name,
            dimension: i,
          });
          isValid = false;
          break;
        }
        magnitude += embedding[i] * embedding[i];
      }

      if (!isValid) {
        continue;
      }

      // Calculate magnitude and normalize to unit vector
      magnitude = Math.sqrt(magnitude);
      if (magnitude === 0) {
        this.logger.warn('Zero-magnitude embedding, skipping skill', {
          skillName: skill.metadata.name,
        });
        continue;
      }

      // Store normalized (unit vector) copy
      const normalizedPoint: number[] = [];
      for (let i = 0; i < embedding.length; i++) {
        normalizedPoint.push(embedding[i] / magnitude);
      }
      points.push(normalizedPoint);
    }

    // Fail fast: no valid embeddings found
    if (points.length === 0) {
      this.kdTree = null;
      this.logger.warn('No valid embeddings found for KD-tree build');
      return;
    }

    // Update embedding dimension based on validated data
    this.embeddingDimension = validatedDimension;

    try {
      // Build KD-tree with normalized unit vectors
      this.kdTree = new KDTree(this.embeddingDimension);
      this.kdTree.build(points);
      
      this.logger.info('KD-tree built successfully', {
        skillCount: points.length,
        dimension: this.embeddingDimension,
        normalization: 'unit vectors (cosine equivalence)',
      });
    } catch (error) {
      this.logger.error('Failed to build KD-tree', {
        error: error instanceof Error ? error.message : String(error),
      });
      this.kdTree = null;
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

      // Rebuild KD-tree after loading
      this.rebuildKDTree();
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
    this.kdTree = null;
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
