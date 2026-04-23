"use strict";
// Agent Skill Routing System - Main Entry Point
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentSkillRoutingApp = void 0;
exports.createApp = createApp;
const fastify_1 = __importDefault(require("fastify"));
const Router_js_1 = require("./core/Router.js");
const MCPBridge_js_1 = require("./mcp/MCPBridge.js");
const Logger_js_1 = require("./observability/Logger.js");
__exportStar(require("./core/types.js"), exports);
__exportStar(require("./core/Router.js"), exports);
__exportStar(require("./core/ExecutionEngine.js"), exports);
__exportStar(require("./core/ExecutionPlanner.js"), exports);
__exportStar(require("./core/SafetyLayer.js"), exports);
__exportStar(require("./mcp/MCPBridge.js"), exports);
// DO NOT export mcp/types.js to avoid duplicate ToolResult/ToolSpec exports
__exportStar(require("./embedding/EmbeddingService.js"), exports);
__exportStar(require("./embedding/VectorDatabase.js"), exports);
__exportStar(require("./llm/LLMRanker.js"), exports);
__exportStar(require("./observability/Logger.js"), exports);
/**
  * Main application class
   */
class AgentSkillRoutingApp {
    app = null;
    router = null;
    mcpBridge = null;
    logger;
    constructor(config = {}) {
        this.logger = new Logger_js_1.Logger('Main', {
            level: config.observability?.level || 'info',
        });
        // Store config for later use if needed
        this.config = config;
    }
    config;
    /**
     * Initialize the application
     */
    async initialize() {
        this.logger.info('Initializing Agent Skill Routing System');
        // Initialize MCP Bridge
        this.mcpBridge = new MCPBridge_js_1.MCPBridge({
            enabledTools: this.config.enabledTools,
            disableTools: this.config.disableTools,
            defaultTimeoutMs: this.config.defaultTimeoutMs,
        });
        // Initialize Router
        this.router = new Router_js_1.Router(this.config);
        await this.router.initialize();
        this.logger.info('Agent Skill Routing System initialized successfully', {
            skillCount: this.router.getStats().totalSkills,
            tools: this.mcpBridge.getStats().enabledTools,
        });
    }
    /**
     * Start the HTTP server
     */
    async start(port = 3000) {
        this.app = (0, fastify_1.default)({
            logger: false,
        });
        // Define routes with proper Fastify typing
        this.app.post('/route', async (request, reply) => {
            try {
                const body = request.body;
                const response = await this.router.routeTask(body);
                reply.code(200).send(response);
            }
            catch (error) {
                this.logger.error('Route request failed', {
                    error: error instanceof Error ? error.message : String(error),
                });
                reply.code(500).send({
                    error: 'Route failed',
                    message: error instanceof Error ? error.message : String(error),
                });
            }
        });
        this.app.post('/execute', async (request, reply) => {
            try {
                const body = request.body;
                const { task, taskId, inputs, skills } = body;
                const results = [];
                if (skills && skills.length > 0) {
                    for (const skillName of skills) {
                        const tool = this.mcpBridge.getTool(skillName);
                        if (tool) {
                            const result = await tool.execute(inputs || {});
                            results.push({
                                skillName,
                                status: result.success ? 'success' : 'failure',
                                output: result.output,
                                error: result.error,
                                latencyMs: result.latencyMs,
                            });
                        }
                        else {
                            results.push({
                                skillName,
                                status: 'failure',
                                error: `Tool not found: ${skillName}`,
                                latencyMs: 0,
                            });
                        }
                    }
                }
                reply.code(200).send({
                    taskId: taskId || 'auto_' + Date.now(),
                    task,
                    status: results.every((r) => r.status === 'success') ? 'success' : 'partial_failure',
                    results,
                });
            }
            catch (error) {
                this.logger.error('Execute request failed', {
                    error: error instanceof Error ? error.message : String(error),
                });
                reply.code(500).send({
                    error: 'Execution failed',
                    message: error instanceof Error ? error.message : String(error),
                });
            }
        });
        this.app.get('/health', async (_request, reply) => {
            reply.code(200).send({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: '1.0.0',
            });
        });
        this.app.get('/stats', async (_request, reply) => {
            const routerStats = this.router.getStats();
            const mcpStats = this.mcpBridge.getStats();
            reply.code(200).send({
                skills: routerStats,
                mcpTools: mcpStats,
            });
        });
        // Start server
        try {
            await this.app.listen({ port, host: '0.0.0.0' });
            this.logger.info(`Server started on port ${port}`);
        }
        catch (error) {
            this.logger.error('Failed to start server', {
                error: error instanceof Error ? error.message : String(error),
            });
            process.exit(1);
        }
    }
    /**
     * Stop the application
     */
    async stop() {
        if (this.app) {
            await this.app.close();
        }
        if (this.router) {
            await this.router.reloadSkills();
        }
    }
}
exports.AgentSkillRoutingApp = AgentSkillRoutingApp;
/**
 * Create and return a new application instance
 */
function createApp(config) {
    return new AgentSkillRoutingApp(config);
}
//# sourceMappingURL=index.js.map