import type { SkillDefinition, SkillSearchResult } from '../core/types';
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
export declare class VectorDatabase {
    private skills;
    private config;
    private indexLoaded;
    private logger;
    private hnsw;
    private embeddingDimension;
    private totalInputTokens;
    private totalOutputTokens;
    constructor(config?: VectorDatabaseConfig);
    /**
     * Add skills to the database
     */
    addSkills(skills: SkillDefinition[]): void;
    /**
     * Set skills from an array
     */
    setSkills(skills: SkillDefinition[]): void;
    /**
     * Search for similar skills based on embedding
     */
    search(queryEmbedding: number[], topN?: number): Promise<SkillSearchResult[]>;
    /**
     * Search using HNSW for approximate nearest neighbor search
     */
    private searchWithHNSW;
    /**
     * Calculate similarity between query and all skills
     */
    private calculateSimilarity;
    /**
     * Calculate cosine similarity between two vectors
     */
    private cosineSimilarity;
    /**
     * Normalize a vector to unit length (L2 normalization)
     * @param vector Input vector
     * @returns Normalized vector or null if magnitude is zero
     */
    private normalizeVector;
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
    private rebuildHNSW;
    /**
     * Add input tokens to the tracker
     */
    addInputTokens(count: number): void;
    /**
     * Add output tokens to the tracker
     */
    addOutputTokens(count: number): void;
    /**
     * Get token statistics
     */
    getTokenStats(): {
        input: number;
        output: number;
        total: number;
    };
    /**
     * Save the vector index to disk
     */
    saveIndex(): Promise<void>;
    /**
     * Load the vector index from disk
     */
    loadIndex(): Promise<void>;
    /**
     * Get all skills from the database
     */
    getAllSkills(): SkillDefinition[];
    /**
     * Get the number of skills in the database
     */
    size(): number;
    /**
     * Clear the database
     */
    clear(): void;
    /**
     * Filter skills by category
     */
    filterByCategory(category: string): SkillDefinition[];
    /**
     * Filter skills by tag
     */
    filterByTag(tag: string): SkillDefinition[];
}
//# sourceMappingURL=VectorDatabase.d.ts.map