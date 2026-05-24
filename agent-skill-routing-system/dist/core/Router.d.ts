import type { RouteRequest, RouteResponse } from '../core/types';
import { SkillRegistry } from '../core/SkillRegistry';
/**
 * Hybrid retrieval weight configuration for the Router.
 */
export interface RetrievalConfig {
    vectorWeight?: number;
    bm25Weight?: number;
    triggerMatchWeight?: number;
    archetypeWeight?: number;
    historicalWeight?: number;
}
/**
 * Configuration for the Router
 */
export interface RouterConfig {
    skillsDirectory: string | string[];
    embedding?: {
        model?: string;
        dimensions?: number;
    };
    llm?: {
        model?: string;
        maxCandidates?: number;
    };
    execution?: {
        maxSkills?: number;
        timeoutMs?: number;
    };
    safety?: {
        enablePromptInjectionFilter?: boolean;
        requireSchemaValidation?: boolean;
    };
    observability?: {
        level?: 'debug' | 'info' | 'warn' | 'error';
        includePayloads?: boolean;
    };
    compression?: {
        maxCacheSizeBytes?: number;
        warmupSkillsCount?: number;
        compressionBatchSize?: number;
        adaptiveTTL?: boolean;
    };
    retrieval?: RetrievalConfig;
    diversity?: {
        /** Relevance vs diversity tradeoff. Default: 0.7 */
        lambda?: number;
        /** Whether to enable MMR diversification. Default: true */
        enabled?: boolean;
    };
}
/**
 * Router - orchestrates skill routing
 */
export declare class Router {
    private skillRegistry;
    private vectorDatabase;
    private embeddingService;
    private llmRanker;
    private executionPlanner;
    private safetyLayer;
    private bm25Indexer;
    private hybridScorer;
    private mmrDiversifier;
    /** Tracks MMR diversity penalties by skill name for observability */
    private mmrPenalties;
    private logger;
    private config;
    constructor(config: RouterConfig);
    /**
     * Initialize the router
     */
    initialize(): Promise<void>;
    /**
     * Route a task to appropriate skills
     */
    routeTask(request: RouteRequest): Promise<RouteResponse>;
    /**
     * Apply deterministic filtering to ranked skills
     * Includes quality gate to filter out stub skills (draft: true)
     */
    private applyDeterministicFilter;
    /**
     * Calculate overall confidence score
     */
    private calculateConfidence;
    /**
        * Apply hybrid scoring pipeline to rank candidate skills.
        * Combines vector similarity, BM25, trigger match, archetype boost, anti-trigger penalty,
        * specificity, and conciseness into a single score per skill.
        */
    private applyHybridScoring;
    /** Build BM25 documents from all skills in the registry */
    private buildBM25Index;
    /**
          * Extract routing scores for response — returns per-component breakdown objects.
          * Uses stored scoreBreakdown when available (from hybrid scorer), otherwise falls back to scalar.
          */
    private extractRoutingScores;
    /**
         * Extract routing scores as ScoreBreakdown objects for each selected skill.
         */
    private extractRoutingScoresAsBreakdown;
    /**
      * Get router statistics
     */
    getStats(): {
        totalSkills: number;
        categories: number;
        tags: number;
    };
    /**
     * Reload skills
     */
    reloadSkills(): Promise<void>;
    /**
     * Get all loaded skill definitions (delegates to registry)
     */
    getAllSkills(): import("../core/types").SkillDefinition[];
    /**
     * Expose the registry so HTTP endpoints can call on-demand methods
     * (e.g. getSkillContent, loadFromRemoteIndex).
     */
    getRegistry(): SkillRegistry;
    /**
     * Sync the vector database from the current registry state.
     * Call after loadFromRemoteIndex() to ensure semantic search reflects the index.
     */
    syncVectorDatabase(): void;
}
//# sourceMappingURL=Router.d.ts.map