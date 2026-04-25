import type { RouteRequest, RouteResponse } from '../core/types.js';
import { SkillRegistry } from '../core/SkillRegistry.js';
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
    private logger;
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
     */
    private applyDeterministicFilter;
    /**
     * Calculate overall confidence score
     */
    private calculateConfidence;
    /**
     * Extract routing scores for response
     */
    private extractRoutingScores;
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
    getAllSkills(): import("../core/types.js").SkillDefinition[];
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