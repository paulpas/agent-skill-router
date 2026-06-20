// Embedding Service - generates and manages vector embeddings

import fs from 'fs';
import path from 'path';
import { EmbeddingResponse } from '../core/types';
import { Logger } from '../observability/Logger';

export type EmbeddingProvider = 'openai' | 'llamacpp' | 'emulation';

/**
 * Resolve the OpenAI-compatible base URL.
 * Honors OPENAI_BASE_URL / OPENAI_API_BASE for LiteLLM, ollama, vLLM, etc.
 * Strips trailing slash and trailing `/v1` so callers can append `/v1/...`.
 */
function resolveOpenAIBase(): string {
  const raw = process.env.OPENAI_BASE_URL || process.env.OPENAI_API_BASE || 'https://api.openai.com';
  return raw.replace(/\/v1\/?$/, '').replace(/\/+$/, '');
}

/**
 * Default prompt template for embedding emulation via LLM
 */
const EMBEDDING_PROMPT_TEMPLATE =
  'Represent the following text as a JSON array of 64 floats capturing its semantic meaning. ' +
  'Output only the array, no additional text. ' +
  'Example format: [0.123, -0.456, 0.789, ...]';

/**
 * Maximum character length for a single text input to the embedding API.
 * OpenAI's text-embedding models have an 8192 token limit (~32KB max), but
 * we cap at 4000 characters to leave safe margin for token overhead and
 * multi-language content. Text exceeding this is truncated with a warning.
 */
const MAX_TEXT_LENGTH = 4_000;

/**
 * Preview length used when logging truncated text to keep log lines readable.
 */
const PREVIEW_LENGTH = 120;

/**
 * Result of batch embedding generation with token information
 */
interface EmbeddingsWithTokens {
  embeddings: number[][];
  inputTokens?: number;
}

/**
 * JSON schema for embedding output validation
 */
interface EmbeddingJsonSchema {
  type: 'array';
  items: { type: 'number' };
  minItems: number;
  maxItems: number;
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
  // Emulation-specific configuration
  promptTemplate?: string;
  maxRetries?: number;
  jsonSchema?: EmbeddingJsonSchema;
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
      // Emulation-specific defaults
      promptTemplate: config.promptTemplate || EMBEDDING_PROMPT_TEMPLATE,
      maxRetries: config.maxRetries ?? 3,
      jsonSchema: config.jsonSchema ?? {
        type: 'array',
        items: { type: 'number' },
        minItems: 64,
        maxItems: 64,
      },
    };
    this.logger = new Logger('EmbeddingService');
    this.loadCacheFromDisk().catch((err) => {
      this.logger.warn('Failed to load embedding cache from disk', {
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }

  /**
   * Load persisted embeddings from disk into the in-memory cache at startup.
   * Uses async I/O with concurrent reads for better startup performance at scale.
   */
  private async loadCacheFromDisk(): Promise<void> {
    try {
      const cacheDir = path.join(this.config.cacheDirectory, 'default');
      try {
        await fs.promises.access(cacheDir);
      } catch {
        return; // cache dir doesn't exist yet
      }
      const files = (await fs.promises.readdir(cacheDir)).filter(f => f.endsWith('.json'));
      if (files.length === 0) return;

      let loaded = 0;
      const readPromises = files.map(async (file) => {
        try {
          const raw = await fs.promises.readFile(path.join(cacheDir, file), 'utf-8');
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
      });

      await Promise.all(readPromises);

      if (loaded > 0) {
        this.logger.debug('[CACHE] Loaded embeddings from disk', { count: loaded, dir: cacheDir });
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
   * Generate embeddings for multiple texts, preserving input order.
   * Unlike batchEmbeddings(), which reorders results (cached items first),
   * this method returns results in exactly the same order as the input texts.
   * Uses a single batch API call per sub-batch for maximum throughput.
   */
  async batchEmbeddingsPreservingOrder(texts: string[]): Promise<EmbeddingResponse[]> {
    const results: (EmbeddingResponse | undefined)[] = new Array(texts.length);
    const uncachedTexts: string[] = [];
    const uncachedIndices: number[] = [];

    // Phase 1: Check cache and identify what needs API calls
    for (let i = 0; i < texts.length; i++) {
      const cached = this.cache.get(texts[i]);
      if (cached) {
        results[i] = cached;
      } else {
        uncachedTexts.push(texts[i]);
        uncachedIndices.push(i);
      }
    }

    if (uncachedTexts.length === 0) {
      return results as EmbeddingResponse[];
    }

    // Phase 2: Process uncached texts in sub-batches via the API
    const subBatchSize = this.config.batchSize; // default 100
    for (let j = 0; j < uncachedTexts.length; j += subBatchSize) {
      const subBatch = uncachedTexts.slice(j, j + subBatchSize);
      const subIndices = uncachedIndices.slice(j, j + subBatchSize);

      const apiResult = await this.generateEmbeddingsFromAPI(subBatch);

      for (let k = 0; k < subBatch.length; k++) {
        const response: EmbeddingResponse = {
          embedding: apiResult.embeddings[k],
          dimensions: this.config.dimensions,
          model: this.config.model,
          inputTokens: apiResult.inputTokens ? Math.floor(apiResult.inputTokens / subBatch.length) : undefined,
        };
        // Cache for future use
        this.cache.set(subBatch[k], response);
        results[subIndices[k]] = response;
      }
    }

    return results as EmbeddingResponse[];
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
      this.logger.debug('[CACHE] batch embeddings', {
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
    // Early exit: if emulation provider, use LLM-based generation
    if (this.config.provider === 'emulation') {
      return this.generateEmbeddingFromEmulation(text);
    }

    // Defensive truncation: cap text at MAX_TEXT_LENGTH to prevent API errors.
    const safeText = text.length > MAX_TEXT_LENGTH
      ? (() => {
          this.logger.debug(
            `[TRUNCATED] Single text exceeds max length (${text.length} > ${MAX_TEXT_LENGTH} chars). Truncated to ${MAX_TEXT_LENGTH}.`,
            { textPreview: text.slice(0, PREVIEW_LENGTH) },
          );
          return text.slice(0, MAX_TEXT_LENGTH);
        })()
      : text;

    try {
      const baseUrl = this.config.provider === 'llamacpp'
        ? this.config.llamacppBaseUrl
        : resolveOpenAIBase();

      const apiKey = this.config.provider === 'llamacpp'
        ? (this.config.apiKey || 'no-key')
        : this.config.apiKey;

      const response = await fetch(`${baseUrl}/v1/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model: this.config.model, input: safeText }),
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
      this.logger.debug('Failed to generate embedding, using placeholder', {
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
        // Defensive truncation: cap each text at MAX_TEXT_LENGTH to prevent
        // "maximum input length" API errors. One oversized entry should not
        // fail the entire batch — truncated entries still produce embeddings.
        const safeTexts: string[] = [];
        for (let i = 0; i < texts.length; i++) {
          const text = texts[i];
          if (text.length > MAX_TEXT_LENGTH) {
            this.logger.debug(
              `[TRUNCATED] Text ${i + 1}/${texts.length} exceeds max length (${text.length} > ${MAX_TEXT_LENGTH} chars). Truncated to ${MAX_TEXT_LENGTH}.`,
              { textPreview: text.slice(0, PREVIEW_LENGTH) },
            );
            safeTexts.push(text.slice(0, MAX_TEXT_LENGTH));
          } else {
            safeTexts.push(text);
          }
        }

        const baseUrl = this.config.provider === 'llamacpp'
          ? this.config.llamacppBaseUrl
          : resolveOpenAIBase();

        const apiKey = this.config.provider === 'llamacpp'
          ? (this.config.apiKey || 'no-key')
          : this.config.apiKey;

        const response = await fetch(`${baseUrl}/v1/embeddings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ model: this.config.model, input: safeTexts }),
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
        this.logger.debug('Failed to generate batch embeddings from API', {
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
   * Generate embedding from LLM via prompt emulation
   * Uses LLM API to generate embeddings through text prompts
   */
  private async generateEmbeddingFromEmulation(text: string): Promise<EmbeddingResponse> {
    // Early exit: sanitize input
    if (!text || text.length === 0) {
      this.logger.warn('[Emulation] Empty text provided, using fallback embedding');
      return {
        embedding: this.generatePlaceholderEmbedding(''),
        dimensions: this.config.dimensions,
        model: this.config.model,
        inputTokens: 0,
      };
    }

    // Parse and validate JSON schema
    const schema = this.config.jsonSchema;
    if (!schema || schema.type !== 'array' || schema.items.type !== 'number') {
      this.logger.error('[Emulation] Invalid JSON schema configuration');
      throw new Error('Invalid JSON schema for embedding emulation: must be array of numbers');
    }

    const expectedDimensions = schema.minItems;

    // Build prompt
    const prompt = this.buildEmulationPrompt(text, expectedDimensions);

    // Try to get embedding with retries
    let lastError: Error | undefined;
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const embedding = await this.callLlmForEmbedding(prompt, expectedDimensions);
        if (embedding) {
          return {
            embedding,
            dimensions: embedding.length,
            model: this.config.model,
            inputTokens: 0, // LLM token count not available in emulation mode
          };
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn('[Emulation] Failed attempt', {
          attempt,
          maxRetries: this.config.maxRetries,
          error: lastError.message,
        });
        
        // Exponential backoff (only if not last attempt)
        if (attempt < this.config.maxRetries) {
          await this.sleep(100 * Math.pow(2, attempt - 1));
        }
      }
    }

    // All retries failed - use deterministic fallback
    this.logger.error('[Emulation] All retries failed, using fallback embedding', {
      error: lastError?.message,
    });
    const fallback = this.generatePlaceholderEmbedding(text);
    return {
      embedding: fallback,
      dimensions: fallback.length,
      model: this.config.model,
      inputTokens: 0,
    };
  }

  /**
    * Build the prompt for LLM-based embedding generation
    */
  private buildEmulationPrompt(text: string, _dimensions: number): string {
    const template = this.config.promptTemplate || EMBEDDING_PROMPT_TEMPLATE;
    return `${template}\n\nText to embed:\n"${text}"`;
  }

  /**
   * Call LLM API and extract embedding from response
   * Support configurable LLM endpoint (OpenAI or llama.cpp) for emulation mode
   */
  private async callLlmForEmbedding(prompt: string, expectedDimensions: number): Promise<number[] | undefined> {
    try {
      // Determine LLM endpoint based on provider configuration
      const baseUrl = this.config.provider === 'llamacpp'
        ? this.config.llamacppBaseUrl
        : resolveOpenAIBase();
      
      const apiKey = this.config.provider === 'llamacpp'
        ? (this.config.apiKey || 'no-key')
        : (this.config.apiKey || process.env.OPENAI_API_KEY || '');

      const model = this.config.model || (this.config.provider === 'llamacpp' ? 'local-embedding-model' : 'gpt-4o-mini');
      
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`LLM API error ${response.status}: ${errorData}`);
      }

      const data = await response.json() as { choices: { message: { content: string } }[]; usage?: { prompt_tokens: number } };
      const content = data.choices[0]?.message?.content || '';

      // Parse JSON array from response
      return this.parseJsonEmbedding(content, expectedDimensions);
    } catch (error) {
      this.logger.error('[Emulation] LLM call failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      // Return undefined to trigger fallback behavior in calling function
      // Don't throw - allow deterministic fallback to be used
      return undefined;
    }
  }

/**
   * Parse JSON embedding from LLM response with recovery
   * Parse-Don't-Validate: parse at boundary (JSON string), trust parsed data internally
   */
  private parseJsonEmbedding(jsonString: string, expectedDimensions: number): number[] {
    // Early exit: handle empty or whitespace-only input
    if (!jsonString || jsonString.trim().length === 0) {
      throw new Error('Empty JSON string received from LLM');
    }

    // Try parsing JSON directly first
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed) && this.isValidNumberArray(parsed, expectedDimensions)) {
        return parsed;
      }
    } catch (error) {
      // JSON parse failed - continue to recovery strategies
      this.logger.debug('[Emulation] Direct JSON parse failed, attempting recovery', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Recovery 1: Extract JSON array from text using regex
    const extracted = this.extractJsonArray(jsonString);
    if (extracted) {
try {
         const parsed = JSON.parse(extracted);
         if (Array.isArray(parsed) && this.isValidNumberArray(parsed, expectedDimensions)) {
           return parsed;
         }
       } catch {
         this.logger.debug('[Emulation] Regex extraction failed, using fallback');
       }
    }

    // Recovery 2: Generate deterministic fallback embedding
    this.logger.warn('[Emulation] All parsing strategies failed, using deterministic fallback');
    return this.generatePlaceholderEmbedding(jsonString);
  }

  /**
   * Parse JSON embedding from LLM response with recovery
   * Parse-Don't-Validate: parse at boundary (JSON string), trust parsed data internally
   */

  /**
    * Extract JSON array from text using regex pattern matching
    */
   private extractJsonArray(text: string): string | undefined {
     // Match JSON array pattern: [numbers, separated, by, commas]
     // Supports negative numbers at any position (including last element)
     const jsonRegex = /\[\s*(?:-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\s*,\s*)*-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\s*\]/;
     const match = text.match(jsonRegex);
     return match ? match[0] : undefined;
   }

 /**
    * Validate that array contains only numbers and has correct dimensions
    * Optionally validate range for similarity calculation compatibility
    */
   private isValidNumberArray(value: unknown, expectedDimensions: number, validateRange: boolean = false): boolean {
     // Early exit: must be an array
     if (!Array.isArray(value)) {
       return false;
     }

     // Validate dimensions
     if (value.length !== expectedDimensions) {
       this.logger.debug('[Emulation] Dimension mismatch', {
         actual: value.length,
         expected: expectedDimensions,
       });
       return false;
     }

    // Validate all elements are numbers
      for (const item of value) {
        if (typeof item !== 'number' || isNaN(item)) {
          return false;
        }
        // Validate normalized range if requested
        if (validateRange && (item < -1 || item > 1)) {
          this.logger.debug('[Emulation] Range validation failed', {
            value: item,
            expectedRange: '[-1, 1]',
          });
          return false;
        }
      }

    return true;
   }

 /**
   * Sleep for specified milliseconds
   */
   private sleep(ms: number): Promise<void> {
     return new Promise((resolve) => setTimeout(resolve, ms));
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
