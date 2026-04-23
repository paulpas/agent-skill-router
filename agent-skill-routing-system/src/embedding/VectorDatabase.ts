// Vector Database - for skill retrieval using semantic similarity

import { promises as fs } from 'fs';
import path from 'path';
import type { SkillDefinition, SkillSearchResult } from '../core/types.js';
import { Logger } from '../observability/Logger.js';

/**
 * Configuration for the vector database
 */
export interface VectorDatabaseConfig {
  cacheDirectory?: string;
  maxResults?: number;
  similarityThreshold?: number;
}

/**
 * Vector database for skill retrieval
 */
export class VectorDatabase {
  private skills: SkillDefinition[] = [];
  private config: VectorDatabaseConfig;
  private indexLoaded = false;
  private logger: Logger;

  constructor(config: VectorDatabaseConfig = {}) {
    this.config = {
      cacheDirectory: './.vector-cache',
      maxResults: 20,
      similarityThreshold: 0.3,
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
  }

  /**
   * Set skills from an array
   */
  setSkills(skills: SkillDefinition[]): void {
    this.skills = skills;
    this.indexLoaded = true;
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

    const results = await this.calculateSimilarity(queryEmbedding);
    const sorted = results.sort((a, b) => b.score - a.score);
    const limited = sorted.slice(0, topN ?? this.config.maxResults!);

    return limited.filter(
      (result) => result.score >= this.config.similarityThreshold!
    );
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

      this.skills = indexData.skills.map((skill: any) => ({
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

      this.indexLoaded = true;
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
