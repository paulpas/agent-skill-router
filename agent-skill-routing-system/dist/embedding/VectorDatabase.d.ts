import type { SkillDefinition, SkillSearchResult } from '../core/types.js';
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
export declare class VectorDatabase {
    private skills;
    private config;
    private indexLoaded;
    private logger;
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
     * Calculate similarity between query and all skills
     */
    private calculateSimilarity;
    /**
     * Calculate cosine similarity between two vectors
     */
    private cosineSimilarity;
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