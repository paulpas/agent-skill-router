// Router - main routing engine that orchestrates the skill routing pipeline

import { v4 as uuidv4 } from 'uuid';
import type {
  RouteRequest,
  RouteResponse,
  SelectedSkill,
} from '../core/types.js';
import { SkillRegistry } from '../core/SkillRegistry.js';
import { VectorDatabase } from '../embedding/VectorDatabase.js';
import { EmbeddingService } from '../embedding/EmbeddingService.js';
import { LLMRanker } from '../llm/LLMRanker.js';
import { ExecutionPlanner } from '../core/ExecutionPlanner.js';
import { SafetyLayer } from '../core/SafetyLayer.js';
import { Logger } from '../observability/Logger.js';

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
export class Router {
  private skillRegistry: SkillRegistry;
  private vectorDatabase: VectorDatabase;
  private embeddingService: EmbeddingService;
  private llmRanker: LLMRanker;
  private executionPlanner: ExecutionPlanner;
  private safetyLayer: SafetyLayer;
  private logger: Logger;

  constructor(config: RouterConfig) {
    this.skillRegistry = new SkillRegistry({
      skillsDirectory: config.skillsDirectory,
    });

    this.vectorDatabase = new VectorDatabase();
    this.embeddingService = new EmbeddingService({
      model: config.embedding?.model || 'text-embedding-3-small',
      dimensions: config.embedding?.dimensions || 1536,
    });

    this.llmRanker = new LLMRanker({
      model: config.llm?.model || 'gpt-4o-mini',
      maxCandidates: config.llm?.maxCandidates || 10,
    });

    this.executionPlanner = new ExecutionPlanner({
      maxSkillsPerPlan: config.execution?.maxSkills || 5,
      defaultTimeoutMs: config.execution?.timeoutMs || 30000,
    });

    this.safetyLayer = new SafetyLayer({
      enablePromptInjectionFilter:
        config.safety?.enablePromptInjectionFilter ?? true,
      requireSchemaValidation: config.safety?.requireSchemaValidation ?? true,
    });

    this.logger = new Logger('Router', {
      level: config.observability?.level || 'info',
      includePayloads: config.observability?.includePayloads ?? false,
    });
  }

  /**
   * Initialize the router
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Router');

    // Load skills
    await this.skillRegistry.loadSkills();

    // Add skills to vector database
    this.vectorDatabase.setSkills(this.skillRegistry.getAllSkills());

    this.logger.info('Router initialized successfully', {
      skillCount: this.skillRegistry.getAllSkills().length,
    });
  }

  /**
   * Route a task to appropriate skills
   */
  async routeTask(request: RouteRequest): Promise<RouteResponse> {
    const taskId = request.taskId || uuidv4();
    const startTime = Date.now();

    this.logger.info('Routing task', {
      taskId,
      task: request.task,
      constraints: request.constraints,
    });

    // Validate request
    const safetyResult = await this.safetyLayer.validateRouteRequest(request);
    if (!safetyResult.isSafe) {
      this.logger.error('Safety validation failed', {
        taskId,
        error: safetyResult.errorMessage,
        flags: safetyResult.flags,
      });

      throw new Error(
        `Safety validation failed: ${safetyResult.errorMessage}`
      );
    }

    // Generate task embedding
    const taskEmbedding = await this.embeddingService.generateEmbedding(
      request.task
    );

    // Search for candidates
    const candidates = await this.vectorDatabase.search(
      taskEmbedding.embedding,
      20
    );

    this.logger.debug('Found candidate skills', {
      taskId,
      candidateCount: candidates.length,
    });

    // Get LLM ranker to rank candidates
    const rankedSkills = await this.llmRanker.rankCandidates(
      request.task,
      candidates.map((c) => c.skill)
    );

    // Apply deterministic filtering
    const filteredSkills = this.applyDeterministicFilter(
      rankedSkills,
      request.constraints
    );

    this.logger.debug('Filtered skills', {
      taskId,
      filteredCount: filteredSkills.length,
    });

    // Generate execution plan
    const plan = this.executionPlanner.generatePlan(
      request.task,
      filteredSkills,
      request.context
    );

    // Calculate confidence score
    const confidence = this.calculateConfidence(filteredSkills);

    // Build response
    const response: RouteResponse = {
      taskId,
      selectedSkills: filteredSkills,
      executionPlan: plan,
      confidence,
      reasoningSummary: plan.reasoning,
      candidatePool: candidates.map((c) => c.skill.metadata.name),
      routingScores: this.extractRoutingScores(filteredSkills),
      latencyMs: Date.now() - startTime,
    };

    this.logger.info('Routing completed', {
      taskId,
      selectedSkills: filteredSkills.length,
      confidence,
      latencyMs: response.latencyMs,
    });

    return response;
  }

  /**
   * Apply deterministic filtering to ranked skills
   */
  private applyDeterministicFilter(
    rankedSkills: SelectedSkill[],
    constraints?: RouteRequest['constraints']
  ): SelectedSkill[] {
    let filtered = rankedSkills;

    // Filter by max skills
    const maxSkills = constraints?.maxSkills || 5;
    filtered = filtered.slice(0, maxSkills);

    // Filter by categories if specified
    if (constraints?.categories && constraints.categories.length > 0) {
      filtered = filtered.filter((skill) =>
        constraints!.categories!.some((cat) =>
          skill.name.toLowerCase().includes(cat.toLowerCase())
        )
      );
    }

    // Filter by minimum score
    filtered = filtered.filter((skill) => skill.score >= 0.5);

    return filtered;
  }

  /**
   * Calculate overall confidence score
   */
  private calculateConfidence(skills: SelectedSkill[]): number {
    if (skills.length === 0) {
      return 0;
    }

    // Average of skill scores
    const averageScore =
      skills.reduce((sum, s) => sum + s.score, 0) / skills.length;

    // Boost if we have a clear primary
    const hasClearPrimary =
      skills.length > 0 && skills[0].score > 0.8;

    return Math.min(1, averageScore * (hasClearPrimary ? 1.1 : 1));
  }

  /**
   * Extract routing scores for response
   */
  private extractRoutingScores(skills: SelectedSkill[]): Record<string, number> {
    const scores: Record<string, number> = {};
    for (const skill of skills) {
      scores[skill.name] = skill.score;
    }
    return scores;
  }

  /**
   * Get router statistics
   */
  getStats(): {
    totalSkills: number;
    categories: number;
    tags: number;
  } {
    const stats = this.skillRegistry.getStats();
    return {
      totalSkills: stats.totalSkills,
      categories: stats.categories,
      tags: stats.tags,
    };
  }

  /**
   * Reload skills
   */
  async reloadSkills(): Promise<void> {
    await this.skillRegistry.reload();
    this.vectorDatabase.setSkills(this.skillRegistry.getAllSkills());
  }

  /**
   * Get all loaded skill definitions (delegates to registry)
   */
  getAllSkills() {
    return this.skillRegistry.getAllSkills();
  }
}
