import { RouterConfig } from './core/Router';
import { MCPBridgeConfig } from './mcp/MCPBridge';
export * from './core/types';
export * from './core/Router';
export * from './core/ExecutionEngine';
export * from './core/ExecutionPlanner';
export * from './core/SafetyLayer';
export * from './core/SkillCompressor';
export * from './mcp/MCPBridge';
export * from './core/AutoSkillCreator';
export * from './core/SkillCreationTracker';
export * from './core/types';
export * from './embedding/EmbeddingService';
export * from './embedding/VectorDatabase';
export * from './llm/LLMRanker';
export * from './observability/Logger';
export * from './skills/GitHubSkillLoader';
export * from './utils/CompressionMetrics';
/**
 * Main application class
 */
export declare class AgentSkillRoutingApp {
    private app;
    private router;
    private mcpBridge;
    private githubLoader;
    private autoSkillCreator;
    private logger;
    private ready;
    private loadingError;
    private compressionLevel;
    private accessLog;
    constructor(config?: Partial<RouterConfig & MCPBridgeConfig>, compressionLevel?: number);
    private config;
    private remoteIndexUrl;
    private remoteIndexSyncTimer;
    /**
     * Start the HTTP server immediately, then load skills in the background.
     * /health returns 200 right away; /route, /execute, /reload, /skills return
     * 503 until ready === true.
     */
    start(port?: number): Promise<void>;
    /**
     * All heavy init work: GitHub clone, skill loading, embedding generation.
     * Runs after the server is already accepting connections.
     */
    private initializeAsync;
    /**
     * Stop the application
     */
    stop(): Promise<void>;
}
/**
 * Create and return a new application instance
 */
export declare function createApp(config?: RouterConfig & MCPBridgeConfig, compressionLevel?: number): AgentSkillRoutingApp;
//# sourceMappingURL=index.d.ts.map