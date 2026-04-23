// Embedding Service - generates and manages vector embeddings

import fs from 'fs';
import path from 'path';
import { EmbeddingResponse } from '../core/types.js';
import { Logger } from '../observability/Logger.js';

/**
 * Configuration for the embedding service
 */
export interface EmbeddingServiceConfig {
  apiKey?: string;
  model: string;
  dimensions: number;
  cacheDirectory?: string;
  batchSize: number;
}

/**
 * Embedding service using OpenAI's embedding model
 */
export class EmbeddingService {
  private config: EmbeddingServiceConfig;
  private cache: Map<string, EmbeddingResponse> = new Map();
  private logger: Logger;

  constructor(config: Partial<EmbeddingServiceConfig> = {}) {
    this.config = {
      model: 'text-embedding-3-small',
      dimensions: 1536,
      batchSize: 100,
      cacheDirectory: './.embedding-cache',
      ...config,
    };
    this.logger = new Logger('EmbeddingService', {
      level: 'info',
      includePayloads: false,
    });
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<EmbeddingResponse> {
    // Check cache first
    const cached = this.cache.get(text);
    if (cached) {
      return cached;
    }

    // Generate embedding
    const response = await this.generateEmbeddingFromAPI(text);

    // Cache the result
    this.cache.set(text, response);

    // Also save to file cache
    await this.saveToCacheFile(text, response);

    return response;
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async batchEmbeddings(
    texts: string[],
    cacheKey?: string
  ): Promise<EmbeddingResponse[]> {
    const results: EmbeddingResponse[] = [];

    // Process in batches
    const batchSize = this.config.batchSize;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchResults = await this.processBatch(batch, cacheKey);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Process a single batch of texts
   */
  private async processBatch(
    batch: string[],
    cacheKey?: string
  ): Promise<EmbeddingResponse[]> {
    const results: EmbeddingResponse[] = [];
    const uncachedTexts: string[] = [];

    // Check which texts are already cached
    for (const text of batch) {
      const cached = this.cache.get(text);
      if (cached) {
        results.push(cached);
      } else {
        uncachedTexts.push(text);
      }
    }

    // Generate embeddings for uncached texts
    if (uncachedTexts.length > 0) {
      const embeddings = await this.generateEmbeddingsFromAPI(uncachedTexts);

      for (let i = 0; i < embeddings.length; i++) {
        const text = uncachedTexts[i];
        const embedding = embeddings[i];
        const result: EmbeddingResponse = {
          embedding,
          dimensions: this.config.dimensions,
          model: this.config.model,
        };

        this.cache.set(text, result);
        results.push(result);

        if (cacheKey) {
          await this.saveToCacheFile(text, result, cacheKey);
        }
      }
    }

    return results;
  }

  /**
   * Generate embedding from OpenAI API
   */
  private async generateEmbeddingFromAPI(
    text: string
  ): Promise<EmbeddingResponse> {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          input: text,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `OpenAI API error: ${response.statusText} - ${JSON.stringify(errorData)}`
        );
      }

      const data = await response.json();
      const embedding = data.data[0].embedding;

      return {
        embedding,
        dimensions: embedding.length,
        model: this.config.model,
      };
    } catch (error) {
      // If API fails, generate a deterministic placeholder embedding
      // This allows the system to work without API keys for testing
      this.logger.warn('Failed to generate embedding from API, using placeholder', {
        error: error instanceof Error ? error.message : String(error),
        textLength: text.length,
      });

      const placeholder = this.generatePlaceholderEmbedding(text);
      return {
        embedding: placeholder,
        dimensions: this.config.dimensions,
        model: this.config.model,
      };
    }
  }

  /**
   * Generate embeddings from OpenAI API in batch
   */
  private async generateEmbeddingsFromAPI(
    texts: string[]
  ): Promise<number[][]> {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          input: texts,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `OpenAI API error: ${response.statusText} - ${JSON.stringify(errorData)}`
        );
      }

      const data = await response.json();
      return data.data.map((item: { embedding: number[] }) => item.embedding);
    } catch (error) {
      this.logger.warn('Failed to generate batch embeddings from API', {
        error: error instanceof Error ? error.message : String(error),
        count: texts.length,
      });

      return texts.map((text) => this.generatePlaceholderEmbedding(text));
    }
  }

  /**
   * Generate a deterministic placeholder embedding for testing
   */
  private generatePlaceholderEmbedding(text: string): number[] {
    // Generate a deterministic hash-based embedding
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    // Create a normalized embedding vector
    const embedding: number[] = [];
    const seed = Math.abs(hash);
    let value = seed;

    for (let i = 0; i < this.config.dimensions; i++) {
      value = (value * 9301 + 49297) % 233280;
      embedding.push((value / 233280) * 2 - 1); // Normalize to [-1, 1]
    }

    // Normalize the vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map((val) => val / magnitude);
  }

  /**
   * Save embedding to cache file
   */
  private async saveToCacheFile(
    text: string,
    result: EmbeddingResponse,
    subdirectory?: string
  ): Promise<void> {
    try {
      const cacheDir = path.join(
        this.config.cacheDirectory!,
        subdirectory || 'default'
      );
      await fs.promises.mkdir(cacheDir, { recursive: true });

      const textHash = this.hashString(text);
      const cacheFile = path.join(cacheDir, `${textHash}.json`);

      await fs.promises.writeFile(
        cacheFile,
        JSON.stringify({ text, embedding: result.embedding })
      );
    } catch (error) {
      this.logger.warn('Failed to save embedding to cache file', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get cache directory path
   */
  getCacheDirectory(): string {
    return this.config.cacheDirectory!;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number } {
    return { size: this.cache.size };
  }

  /**
   * Simple string hash for cache keys
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(16).padStart(8, '0');
  }
}
