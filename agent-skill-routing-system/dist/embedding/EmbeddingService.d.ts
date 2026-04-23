import { EmbeddingResponse } from '../core/types.js';
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
export declare class EmbeddingService {
    private config;
    private cache;
    private logger;
    constructor(config?: Partial<EmbeddingServiceConfig>);
    /**
     * Generate embedding for a single text
     */
    generateEmbedding(text: string): Promise<EmbeddingResponse>;
    /**
     * Generate embeddings for multiple texts in batch
     */
    batchEmbeddings(texts: string[], cacheKey?: string): Promise<EmbeddingResponse[]>;
    /**
     * Process a single batch of texts
     */
    private processBatch;
    /**
     * Generate embedding from OpenAI API
     */
    private generateEmbeddingFromAPI;
    /**
     * Generate embeddings from OpenAI API in batch
     */
    private generateEmbeddingsFromAPI;
    /**
     * Generate a deterministic placeholder embedding for testing
     */
    private generatePlaceholderEmbedding;
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
//# sourceMappingURL=EmbeddingService.d.ts.map