// Agent Skill Routing System - Main Entry Point

import fastify, { FastifyInstance } from 'fastify';
import { Router, RouterConfig } from './core/Router.js';
import { MCPBridge, MCPBridgeConfig } from './mcp/MCPBridge.js';
import { Logger } from './observability/Logger.js';

/**
 * Route request body
 */
interface RouteRequestBody {
  task: string;
  context?: Record<string, unknown>;
  constraints?: {
    categories?: string[];
    maxSkills?: number;
    latencyBudgetMs?: number;
  };
}

/**
 * Execute request body
 */
interface ExecuteRequestBody {
  task: string;
  taskId?: string;
  inputs?: Record<string, unknown>;
  skills?: string[];
}

export * from './core/types.js';
export * from './core/Router.js';
export * from './core/ExecutionEngine.js';
export * from './core/ExecutionPlanner.js';
export * from './core/SafetyLayer.js';
export * from './mcp/MCPBridge.js';
// DO NOT export mcp/types.js to avoid duplicate ToolResult/ToolSpec exports
export * from './embedding/EmbeddingService.js';
export * from './embedding/VectorDatabase.js';
export * from './llm/LLMRanker.js';
export * from './observability/Logger.js';

/**
  * Main application class
   */
  export class AgentSkillRoutingApp {
    private app: FastifyInstance | null = null;
    private router: Router | null = null;
    private mcpBridge: MCPBridge | null = null;
    private logger: Logger;

    constructor(config: Partial<RouterConfig & MCPBridgeConfig> = {}) {
      this.logger = new Logger('Main', {
        level: config.observability?.level || 'info',
      });
      // Store config for later use if needed
      this.config = config as RouterConfig & MCPBridgeConfig;
    }
    
    private config: RouterConfig & MCPBridgeConfig;

  /**
   * Initialize the application
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Agent Skill Routing System');

    // Initialize MCP Bridge
    this.mcpBridge = new MCPBridge({
      enabledTools: this.config.enabledTools,
      disableTools: this.config.disableTools,
      defaultTimeoutMs: this.config.defaultTimeoutMs,
    });

    // Initialize Router
    this.router = new Router(this.config);

    await this.router.initialize();

    this.logger.info('Agent Skill Routing System initialized successfully', {
      skillCount: this.router.getStats().totalSkills,
      tools: this.mcpBridge.getStats().enabledTools,
    });
  }

  /**
   * Start the HTTP server
   */
  async start(port: number = 3000): Promise<void> {
    this.app = fastify({
      logger: false,
    });

    // Define routes with proper Fastify typing
    this.app.post(
      '/route',
      async (request, reply) => {
        try {
          const body = request.body as RouteRequestBody;
          const response = await this.router!.routeTask(body);
          reply.code(200).send(response);
        } catch (error) {
          this.logger.error('Route request failed', {
            error: error instanceof Error ? error.message : String(error),
          });
          reply.code(500).send({
            error: 'Route failed',
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    );

    this.app.post(
      '/execute',
      async (request, reply) => {
        try {
          const body = request.body as ExecuteRequestBody;
          const { task, taskId, inputs, skills } = body;
          const results: {
            skillName: string;
            status: 'success' | 'failure';
            output?: unknown;
            error?: string;
            latencyMs: number;
          }[] = [];

          if (skills && skills.length > 0) {
            for (const skillName of skills) {
              const tool = this.mcpBridge!.getTool(skillName);
              if (tool) {
                const result = await tool.execute(inputs || {});
                results.push({
                  skillName,
                  status: result.success ? 'success' : 'failure',
                  output: result.output,
                  error: result.error,
                  latencyMs: result.latencyMs,
                });
              } else {
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
        } catch (error) {
          this.logger.error('Execute request failed', {
            error: error instanceof Error ? error.message : String(error),
          });
          reply.code(500).send({
            error: 'Execution failed',
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    );

    this.app.get('/health', async (_request, reply) => {
      reply.code(200).send({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      });
    });

    this.app.get('/stats', async (_request, reply) => {
      const routerStats = this.router!.getStats();
      const mcpStats = this.mcpBridge!.getStats();
      reply.code(200).send({
        skills: routerStats,
        mcpTools: mcpStats,
      });
    });

    // Start server
    try {
      await this.app.listen({ port, host: '0.0.0.0' });
      this.logger.info(`Server started on port ${port}`);
    } catch (error) {
      this.logger.error('Failed to start server', {
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    }
  }

  /**
   * Stop the application
   */
  async stop(): Promise<void> {
    if (this.app) {
      await this.app.close();
    }
    if (this.router) {
      await this.router.reloadSkills();
    }
  }
}

/**
 * Create and return a new application instance
 */
export function createApp(config?: RouterConfig & MCPBridgeConfig): AgentSkillRoutingApp {
  return new AgentSkillRoutingApp(config);
}
