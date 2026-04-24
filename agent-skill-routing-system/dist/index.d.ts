import { RouterConfig } from './core/Router.js';
import { MCPBridgeConfig } from './mcp/MCPBridge.js';
export * from './core/types.js';
export * from './core/Router.js';
export * from './core/ExecutionEngine.js';
export * from './core/ExecutionPlanner.js';
export * from './core/SafetyLayer.js';
export * from './mcp/MCPBridge.js';
export * from './embedding/EmbeddingService.js';
export * from './embedding/VectorDatabase.js';
export * from './llm/LLMRanker.js';
export * from './observability/Logger.js';
export * from './skills/GitHubSkillLoader.js';
/**
 * Main application class
 */
export declare class AgentSkillRoutingApp {
    private app;
    private router;
    private mcpBridge;
    private githubLoader;
    private logger;
    private ready;
    private loadingError;
    private accessLog;
    constructor(config?: Partial<RouterConfig & MCPBridgeConfig>);
    private config;
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
export declare function createApp(config?: RouterConfig & MCPBridgeConfig): AgentSkillRoutingApp;
//# sourceMappingURL=index.d.ts.map