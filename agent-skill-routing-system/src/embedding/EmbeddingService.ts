// Embedding Service - generates and manages vector embeddings

import fs from 'fs';
import path from 'path';
import { EmbeddingResponse } from '../core/types.js';
import { Logger } from '../observability/Logger.js';

export type EmbeddingProvider = 'openai' | 'llamacpp';

/**
 * Result of batch embedding generation with token information
 */
interface EmbeddingsWithTokens {
  embeddings: number[][];
  inputTokens?: number;
}

/**
 * Configuration for the embedding service
 */
export interface EmbeddingServiceConfig {
  provider?: EmbeddingProvider;
  apiKey?: string;
  llamacppBaseUrl?: string;
  model?: string;
  dimensions: number;
  cacheDirectory?: string;
  batchSize: number;
}

/**
 * Embedding service supporting OpenAI and llama.cpp providers
 */
export class EmbeddingService {
  private config: Required<EmbeddingServiceConfig>;
  private cache: Map<string, EmbeddingResponse> = new Map();
  private logger: Logger;

  constructor(config: Partial<EmbeddingServiceConfig> = {}) {
    const provider = (process.env.EMBEDDING_PROVIDER as EmbeddingProvider) || config.provider || 'openai';
    this.config = {
      provider,
      apiKey: config.apiKey || process.env.OPENAI_API_KEY || '',
      llamacppBaseUrl: config.llamacppBaseUrl || process.env.LLAMACPP_BASE_URL || 'http://localhost:8080',
      model: config.model || process.env.EMBEDDING_MODEL || (provider === 'llamacpp' ? 'local-embedding-model' : 'text-embedding-3-small'),
      dimensions: config.dimensions || 1536,
      batchSize: config.batchSize || 100,
      cacheDirectory: config.cacheDirectory || './.embedding-cache',
    };
    this.logger = new Logger('EmbeddingService');
    this.loadCacheFromDisk();
  }

  /**
   * Load persisted embeddings from disk into the in-memory cache at startup.
   * Prevents re-generating all embeddings after every Docker restart.
   */
  private loadCacheFromDisk(): void {
    try {
      const cacheDir = path.join(this.config.cacheDirectory, 'default');
      if (!fs.existsSync(cacheDir)) return;
      const files = fs.readdirSync(cacheDir).filter(f => f.endsWith('.json'));
      let loaded = 0;
      for (const file of files) {
        try {
          const raw = fs.readFileSync(path.join(cacheDir, file), 'utf-8');
          const entry = JSON.parse(raw) as { text: string; embedding: number[]; inputTokens?: number };
          if (entry.text && Array.isArray(entry.embedding)) {
            this.cache.set(entry.text, {
              embedding: entry.embedding,
              dimensions: entry.embedding.length,
              model: this.config.model,
              inputTokens: entry.inputTokens,
            });
            loaded++;
          }
        } catch {
          // skip corrupt files silently
        }
      }
      if (loaded > 0) {
        this.logger.info('[CACHE] Loaded embeddings from disk', { count: loaded, dir: cacheDir });
      }
    } catch {
      // cache dir doesn't exist yet — that's fine
    }
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<EmbeddingResponse> {
    // Check cache first
    const cached = this.cache.get(text);
    if (cached) {
      this.logger.debug('[CACHE HIT] embedding (memory)', {
        textPreview: text.slice(0, 60),
      });
      return cached;
    }
    this.logger.debug('[CACHE MISS] embedding → API call', {
      provider: this.config.provider,
      textPreview: text.slice(0, 60),
    });

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

    if (results.length > 0 || uncachedTexts.length > 0) {
      const hits = batch.length - uncachedTexts.length;
      this.logger.info('[CACHE] batch embeddings', {
        total: batch.length,
        hits,
        misses: uncachedTexts.length,
      });
    }

    // Generate embeddings for uncached texts
    if (uncachedTexts.length > 0) {
      const embeddingsWithTokens = await this.generateEmbeddingsFromAPI(uncachedTexts);
      const embeddings = embeddingsWithTokens.embeddings;

      // Extract token info from structured return value
      const batchTokenCount = embeddingsWithTokens.inputTokens;

      for (let i = 0; i < embeddings.length; i++) {
        const text = uncachedTexts[i];
        const embedding = embeddings[i];
        const result: EmbeddingResponse = {
          embedding,
          dimensions: this.config.dimensions,
          model: this.config.model,
          // Don't assign inputTokens for batch results - total batch count stored separately
          inputTokens: undefined,
          // Store total batch token count for accumulation by caller
          batchTokenCount: typeof batchTokenCount === 'number' ? batchTokenCount : undefined,
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
   * Generate embedding from API (OpenAI or llama.cpp)
   */
  private async generateEmbeddingFromAPI(
    text: string
  ): Promise<EmbeddingResponse> {
    try {
      const baseUrl = this.config.provider === 'llamacpp'
        ? this.config.llamacppBaseUrl
        : 'https://api.openai.com';

      const apiKey = this.config.provider === 'llamacpp'
        ? (this.config.apiKey || 'no-key')
        : this.config.apiKey;

      const response = await fetch(`${baseUrl}/v1/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model: this.config.model, input: text }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Embedding API error ${response.status}: ${errorData}`);
      }

      const data = await response.json() as { data: { embedding: number[] }[]; usage?: { prompt_tokens?: number; input_tokens?: number } };
      const embedding = data.data[0].embedding;
      const inputTokens = data.usage?.input_tokens ?? data.usage?.prompt_tokens;
      return { 
        embedding, 
        dimensions: embedding.length, 
        model: this.config.model,
        inputTokens: typeof inputTokens === 'number' ? inputTokens : undefined
      };
    } catch (error) {
      // If API fails, generate a deterministic placeholder embedding
      // This allows the system to work without API keys for testing
      this.logger.warn('Failed to generate embedding, using placeholder', {
        provider: this.config.provider,
        error: error instanceof Error ? error.message : String(error),
      });

      const placeholder = this.generatePlaceholderEmbedding(text);
      return {
        embedding: placeholder,
        dimensions: this.config.dimensions,
        model: this.config.model,
        inputTokens: 0,
      };
    }
  }

  /**
    * Generate embeddings from API in batch (OpenAI or llama.cpp)
    */
   private async generateEmbeddingsFromAPI(
     texts: string[]
   ): Promise<EmbeddingsWithTokens> {
     try {
       const baseUrl = this.config.provider === 'llamacpp'
         ? this.config.llamacppBaseUrl
         : 'https://api.openai.com';

       const apiKey = this.config.provider === 'llamacpp'
         ? (this.config.apiKey || 'no-key')
         : this.config.apiKey;

       const response = await fetch(`${baseUrl}/v1/embeddings`, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${apiKey}`,
         },
         body: JSON.stringify({ model: this.config.model, input: texts }),
       });

       if (!response.ok) {
         const errorData = await response.text();
         throw new Error(`Embedding API error ${response.status}: ${errorData}`);
       }

       const data = await response.json() as { data: { embedding: number[] }[]; usage?: { prompt_tokens?: number; total_tokens?: number } };
       
       // Extract token info for batch (usage.total_tokens represents total input tokens for the batch)
       const batchInputTokens = data.usage?.total_tokens ?? data.usage?.prompt_tokens;
       
       // For batch processing, distribute tokens evenly per text if total is available
       // Otherwise return without token info (will be set to 0 by caller)
       const tokensPerText = typeof batchInputTokens === 'number' && texts.length > 0
         ? Math.floor(batchInputTokens / texts.length)
         : undefined;

       const embeddings = data.data.map((item) => item.embedding);
       
       return {
         embeddings,
         inputTokens: tokensPerText,
       };
     } catch (error) {
       this.logger.warn('Failed to generate batch embeddings from API', {
         provider: this.config.provider,
         error: error instanceof Error ? error.message : String(error),
         count: texts.length,
       });

       const placeholders = texts.map((text) => this.generatePlaceholderEmbedding(text));
       return {
         embeddings: placeholders,
         inputTokens: 0,
       };
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
        this.config.cacheDirectory,
        subdirectory || 'default'
      );
      await fs.promises.mkdir(cacheDir, { recursive: true });

      const textHash = this.hashString(text);
      const cacheFile = path.join(cacheDir, `${textHash}.json`);

      const cacheEntry: { text: string; embedding: number[]; inputTokens?: number } = {
        text,
        embedding: result.embedding,
      };

      if (typeof result.inputTokens === 'number') {
        cacheEntry.inputTokens = result.inputTokens;
      }

      await fs.promises.writeFile(
        cacheFile,
        JSON.stringify(cacheEntry)
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
    return this.config.cacheDirectory;
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
