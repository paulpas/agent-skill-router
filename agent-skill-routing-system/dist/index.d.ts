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
/**
  * Main application class
   */
export declare class AgentSkillRoutingApp {
    private app;
    private router;
    private mcpBridge;
    private logger;
    constructor(config?: Partial<RouterConfig & MCPBridgeConfig>);
    private config;
    /**
     * Initialize the application
     */
    initialize(): Promise<void>;
    /**
     * Start the HTTP server
     */
    start(port?: number): Promise<void>;
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