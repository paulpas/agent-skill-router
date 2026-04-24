// Agent Skill Routing System - Main Entry Point

import fastify, { FastifyInstance } from 'fastify';
import { Router, RouterConfig } from './core/Router.js';
import { MCPBridge, MCPBridgeConfig } from './mcp/MCPBridge.js';
import { Logger } from './observability/Logger.js';
import { GitHubSkillLoader } from './skills/GitHubSkillLoader.js';

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
export * from './skills/GitHubSkillLoader.js';

/**
 * Main application class
 */
export class AgentSkillRoutingApp {
  private app: FastifyInstance | null = null;
  private router: Router | null = null;
  private mcpBridge: MCPBridge | null = null;
  private githubLoader: GitHubSkillLoader | null = null;
  private logger: Logger;
  private ready = false;
  private loadingError: string | null = null;
  private accessLog: Array<{
    timestamp: string;
    task: string;
    topSkill: string | null;
    totalMatches: number;
    confidence: number;
    latencyMs: number;
  }> = [];

  constructor(config: Partial<RouterConfig & MCPBridgeConfig> = {}) {
    this.logger = new Logger('Main', {
      level: config.observability?.level || 'info',
    });
    this.config = config as RouterConfig & MCPBridgeConfig;
  }

  private config: RouterConfig & MCPBridgeConfig;

  /**
   * Start the HTTP server immediately, then load skills in the background.
   * /health returns 200 right away; /route, /execute, /reload, /skills return
   * 503 until ready === true.
   */
  async start(port: number = 3000): Promise<void> {
    this.app = fastify({ logger: false });

    // Log every HTTP request/response
    this.app.addHook('onRequest', async (request) => {
      (request as any)._startTime = Date.now();
      this.logger.info(`→ ${request.method} ${request.url}`);
    });
    this.app.addHook('onSend', async (request, reply, payload) => {
      const durationMs = Date.now() - ((request as any)._startTime || Date.now());
      this.logger.info(`← ${request.method} ${request.url}`, {
        status: reply.statusCode,
        durationMs,
      });
      return payload;
    });

    // ── /route ─────────────────────────────────────────────────────────────
    this.app.post('/route', async (request, reply) => {
      if (!this.ready) {
        reply.code(503).send({ error: 'Service unavailable', message: 'Skills are still loading' });
        return;
      }
      try {
        const body = request.body as RouteRequestBody;
        this.logger.info('Routing task', { task: body.task.slice(0, 120) });
        const response = await this.router!.routeTask(body);
        this.logger.info('Route result', {
          topSkill: response.selectedSkills?.[0]?.name ?? null,
          reason: response.selectedSkills?.[0]?.reasoning?.slice(0, 150) ?? null,
          score: response.selectedSkills?.[0]?.score ?? null,
          totalMatches: response.selectedSkills?.length,
          confidence: response.confidence,
          latencyMs: response.latencyMs,
        });
        this.accessLog.push({
          timestamp: new Date().toISOString(),
          task: body.task.length > 120 ? body.task.slice(0, 120) + '...' : body.task,
          topSkill: response.selectedSkills?.[0]?.name ?? null,
          totalMatches: response.selectedSkills?.length ?? 0,
          confidence: response.confidence,
          latencyMs: response.latencyMs,
        });
        // Keep only last 100 entries
        if (this.accessLog.length > 100) this.accessLog.shift();
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
    });

    // ── /execute ───────────────────────────────────────────────────────────
    this.app.post('/execute', async (request, reply) => {
      if (!this.ready) {
        reply.code(503).send({ error: 'Service unavailable', message: 'Skills are still loading' });
        return;
      }
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
    });

    // ── /reload ────────────────────────────────────────────────────────────
    this.app.post('/reload', async (_request, reply) => {
      if (!this.ready) {
        reply.code(503).send({ error: 'Service unavailable', message: 'Skills are still loading' });
        return;
      }
      try {
        if (this.githubLoader) {
          await this.githubLoader.syncNow(async () => {
            await this.router!.reloadSkills();
          });
        } else {
          await this.router!.reloadSkills();
        }
        const stats = this.router!.getStats();
        reply.code(200).send({ status: 'reloaded', skills: stats });
      } catch (error) {
        this.logger.error('Reload failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        reply.code(500).send({
          error: 'Reload failed',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    });

    // ── /skills ────────────────────────────────────────────────────────────
    this.app.get('/skills', async (_request, reply) => {
      if (!this.ready) {
        reply.code(503).send({ error: 'Service unavailable', message: 'Skills are still loading' });
        return;
      }
      const skills = this.router!.getAllSkills().map((s) => ({
        name: s.metadata.name,
        category: s.metadata.category,
        description: s.metadata.description,
        tags: s.metadata.tags,
        version: s.metadata.version,
        sourceFile: s.sourceFile,
      }));
      reply.code(200).send({ total: skills.length, skills });
    });

    // ── /access-log ────────────────────────────────────────────────────────
    this.app.get('/access-log', async (_request, reply) => {
      if (!this.ready) {
        return reply.status(503).send({ error: 'Skills are still loading, please wait.' });
      }
      reply.send({
        totalRequests: this.accessLog.length,
        entries: [...this.accessLog].reverse(), // newest first
      });
    });

    // ── /health — always 200 immediately ──────────────────────────────────
    this.app.get('/health', async (_request, reply) => {
      reply.code(200).send({
        status: 'healthy',
        ready: this.ready,
        loading: !this.ready && !this.loadingError,
        error: this.loadingError,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      });
    });

    // ── /stats — returns loading status when not ready ────────────────────
    this.app.get('/stats', async (_request, reply) => {
      if (!this.ready) {
        reply.code(200).send({
          status: this.loadingError ? 'error' : 'loading',
          message: this.loadingError || 'Skills are still loading, please wait',
          skills: { totalSkills: 0, categories: 0, tags: 0 },
          mcpTools: { totalTools: 0, enabledTools: [] },
        });
        return;
      }
      const routerStats = this.router!.getStats();
      const mcpStats = this.mcpBridge!.getStats();
      reply.code(200).send({ skills: routerStats, mcpTools: mcpStats });
    });

    // Bind port IMMEDIATELY — skills load in background below
    try {
      await this.app.listen({ port, host: '0.0.0.0' });
      this.logger.info(`Server listening on port ${port} (skills loading in background)`);
    } catch (error) {
      this.logger.error('Failed to start server', {
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    }

    // Heavy init runs without blocking the already-bound server
    this.initializeAsync().catch((err) => {
      this.loadingError = err instanceof Error ? err.message : String(err);
      this.logger.error('Background initialization failed', { error: this.loadingError });
    });
  }

  /**
   * All heavy init work: GitHub clone, skill loading, embedding generation.
   * Runs after the server is already accepting connections.
   */
  private async initializeAsync(): Promise<void> {
    this.logger.info('Starting background skill initialization');

    const localSkillsDir =
      (this.config.skillsDirectory as string) ||
      process.env.SKILLS_DIRECTORY ||
      './samples/skill-definitions';
    const skillsDirs: string[] = [localSkillsDir];

    const githubEnabled = process.env.GITHUB_SKILLS_ENABLED !== 'false';
    if (githubEnabled) {
      const repoUrl = process.env.GITHUB_SKILLS_REPO || 'https://github.com/paulpas/skills';
      const cacheDir = process.env.SKILL_CACHE_DIR || '/cache/skills';
      const syncIntervalMs = parseInt(process.env.SKILL_SYNC_INTERVAL || '3600', 10) * 1000;
      const githubToken = process.env.GITHUB_TOKEN || '';

      this.githubLoader = new GitHubSkillLoader({ repoUrl, cacheDir, syncIntervalMs, githubToken });
      try {
        await this.githubLoader.initialize();
        skillsDirs.push(this.githubLoader.getSkillsDir());
        this.logger.info('GitHub skills loaded', { dir: cacheDir });
      } catch (err) {
        this.logger.warn('GitHub skill loader failed, continuing with local skills only', {
          error: err instanceof Error ? err.message : String(err),
        });
        this.githubLoader = null;
      }
    }

    // Initialize MCP Bridge
    this.mcpBridge = new MCPBridge({
      enabledTools: this.config.enabledTools,
      disableTools: this.config.disableTools,
      defaultTimeoutMs: this.config.defaultTimeoutMs,
    });

    // Initialize Router with all skill directories
    this.router = new Router({ ...this.config, skillsDirectory: skillsDirs });
    await this.router.initialize();

    // Start background GitHub sync after router is ready
    if (this.githubLoader) {
      this.githubLoader.startSync(async () => {
        await this.router!.reloadSkills();
      });
    }

    this.ready = true;
    this.logger.info('Background initialization complete', {
      skillCount: this.router.getStats().totalSkills,
      githubSync: !!this.githubLoader,
    });
  }

  /**
   * Stop the application
   */
  async stop(): Promise<void> {
    if (this.githubLoader) {
      this.githubLoader.stopSync();
    }
    if (this.app) {
      await this.app.close();
    }
  }
}

/**
 * Create and return a new application instance
 */
export function createApp(config?: RouterConfig & MCPBridgeConfig): AgentSkillRoutingApp {
  return new AgentSkillRoutingApp(config);
}

// Auto-start when run directly
if (require.main === module) {
  const skillsDirectory = process.env.SKILLS_DIRECTORY || './samples/skill-definitions';
  const port = parseInt(process.env.PORT || '3000', 10);
  const app = createApp({ skillsDirectory } as RouterConfig & MCPBridgeConfig);
  app.start(port).catch((err) => {
    console.error('Failed to start:', err);
    process.exit(1);
  });
}
