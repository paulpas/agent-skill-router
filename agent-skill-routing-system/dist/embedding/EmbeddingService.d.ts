import { EmbeddingResponse } from '../core/types';
export type EmbeddingProvider = 'openai' | 'llamacpp' | 'emulation';
/**
 * JSON schema for embedding output validation
 */
interface EmbeddingJsonSchema {
    type: 'array';
    items: {
        type: 'number';
    };
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
    promptTemplate?: string;
    maxRetries?: number;
    jsonSchema?: EmbeddingJsonSchema;
}
/**
 * Embedding service supporting OpenAI and llama.cpp providers
 */
export declare class EmbeddingService {
    private config;
    private cache;
    private logger;
    constructor(config?: Partial<EmbeddingServiceConfig>);
    /**
     * Load persisted embeddings from disk into the in-memory cache at startup.
     * Prevents re-generating all embeddings after every Docker restart.
     */
    private loadCacheFromDisk;
    /**
     * Generate embedding for a single text
     */
    generateEmbedding(text: string): Promise<EmbeddingResponse>;
    /**
     * Generate embeddings for multiple texts in batch
     */
    batchEmbeddings(texts: string[], cacheKey?: string): Promise<EmbeddingResponse[]>;
    /**
     * Generate embeddings for multiple texts, preserving input order.
     * Unlike batchEmbeddings(), which reorders results (cached items first),
     * this method returns results in exactly the same order as the input texts.
     * Uses a single batch API call per sub-batch for maximum throughput.
     */
    batchEmbeddingsPreservingOrder(texts: string[]): Promise<EmbeddingResponse[]>;
    /**
     * Process a single batch of texts
     */
    private processBatch;
    /**
       * Generate embedding from API (OpenAI or llama.cpp)
       */
    private generateEmbeddingFromAPI;
    /**
      * Generate embeddings from API in batch (OpenAI or llama.cpp)
      */
    private generateEmbeddingsFromAPI;
    /**
     * Generate a deterministic placeholder embedding for testing
     */
    private generatePlaceholderEmbedding;
    /**
     * Generate embedding from LLM via prompt emulation
     * Uses LLM API to generate embeddings through text prompts
     */
    private generateEmbeddingFromEmulation;
    /**
      * Build the prompt for LLM-based embedding generation
      */
    private buildEmulationPrompt;
    /**
     * Call LLM API and extract embedding from response
     * Support configurable LLM endpoint (OpenAI or llama.cpp) for emulation mode
     */
    private callLlmForEmbedding;
    /**
       * Parse JSON embedding from LLM response with recovery
       * Parse-Don't-Validate: parse at boundary (JSON string), trust parsed data internally
       */
    private parseJsonEmbedding;
    /**
     * Parse JSON embedding from LLM response with recovery
     * Parse-Don't-Validate: parse at boundary (JSON string), trust parsed data internally
     */
    /**
      * Extract JSON array from text using regex pattern matching
      */
    private extractJsonArray;
    /**
       * Validate that array contains only numbers and has correct dimensions
       * Optionally validate range for similarity calculation compatibility
       */
    private isValidNumberArray;
    /**
      * Sleep for specified milliseconds
      */
    private sleep;
    /**
      * Save embedding to cache file
      */
    private saveToCacheFile;
    /**
     * Get cache directory path
     */
    getCacheDirectory(): string;
    /**
     * Clear the cache
     */
    clearCache(): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        size: number;
    };
    /**
     * Simple string hash for cache keys
     */
    private hashString;
}
export {};
//# sourceMappingURL=EmbeddingService.d.ts.map