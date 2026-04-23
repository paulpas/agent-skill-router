import type { RouteRequest, RouteResponse } from '../core/types.js';
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
}
//# sourceMappingURL=Router.d.ts.map