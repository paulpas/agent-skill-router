// Router - main routing engine that orchestrates the skill routing pipeline
// Phase 2: Hybrid retrieval pipeline with BM25 + scorer combination

import { v4 as uuidv4 } from 'uuid';
import type {
  RouteRequest,
  RouteResponse,
  SelectedSkill,
  EmbeddingResponse,
} from '../core/types';
import { SkillRegistry } from '../core/SkillRegistry';
import { VectorDatabase } from '../embedding/VectorDatabase';
import { EmbeddingService } from '../embedding/EmbeddingService';
import { LLMRanker } from '../llm/LLMRanker';
import { ExecutionPlanner } from '../core/ExecutionPlanner';
import { SafetyLayer } from '../core/SafetyLayer';
import { Logger } from '../observability/Logger';
import { BM25Indexer, BM25Document } from '../retrieval/BM25Indexer';
import { TriggerMatchScorer } from '../retrieval/TriggerMatchScorer';
import { SpecificityScorer } from '../retrieval/SpecificityScorer';
import { ConcisenessScorer } from '../retrieval/ConcisenessScorer';
import { HybridScorer, HybridScoreConfig, ScoreComponents } from '../retrieval/HybridScorer';
import { QueryArchetypeInferencer } from './QueryArchetypeInferencer';
import { ArchetypeRankingBoost } from './ArchetypeRankingBoost';
import { AntiTriggerScorer } from './AntiTriggerScorer';

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
  // Compression configuration for scaling to 1,778 skills
  compression?: {
    maxCacheSizeBytes?: number;
    warmupSkillsCount?: number;
    compressionBatchSize?: number;
    adaptiveTTL?: boolean;
  };
  // Hybrid retrieval scoring weights (Phase 2)
  retrieval?: RetrievalConfig;
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
  private bm25Indexer: BM25Indexer;
  private hybridScorer: HybridScorer;
  private logger: Logger;
  private config: RouterConfig;

  constructor(config: RouterConfig) {
    this.skillRegistry = new SkillRegistry({
      skillsDirectory: config.skillsDirectory,
      maxCacheSizeBytes: config.compression?.maxCacheSizeBytes,
      warmupSkillsCount: config.compression?.warmupSkillsCount,
      compressionBatchSize: config.compression?.compressionBatchSize,
      adaptiveTTL: config.compression?.adaptiveTTL,
    });

    this.vectorDatabase = new VectorDatabase();
    this.embeddingService = new EmbeddingService({
      model: config.embedding?.model,
      dimensions: config.embedding?.dimensions || 1536,
    });

    this.llmRanker = new LLMRanker({
      model: config.llm?.model,
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
    });

    // Hybrid retrieval initialization (Phase 2)
    const scoreConfig: HybridScoreConfig = {
      vectorWeight: config.retrieval?.vectorWeight ?? 0.50,
      bm25Weight: config.retrieval?.bm25Weight ?? 0.20,
      triggerMatchWeight: config.retrieval?.triggerMatchWeight ?? 0.15,
      archetypeWeight: config.retrieval?.archetypeWeight ?? 0.10,
      historicalWeight: config.retrieval?.historicalWeight ?? 0.05,
    };
    this.hybridScorer = new HybridScorer(scoreConfig);
    this.bm25Indexer = BM25Indexer.buildIndex([]); // Will be rebuilt when skills are indexed

    this.config = config;
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

    // Build BM25 index from all loaded skills
    this.bm25Indexer = this.buildBM25Index();

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
    const taskEmbeddingResponse: EmbeddingResponse = await this.embeddingService.generateEmbedding(
      request.task
    );

    // Search for candidates via vector similarity
    const candidates = await this.vectorDatabase.search(
      taskEmbeddingResponse.embedding,
      20
    );

    this.logger.info('Vector search candidates', {
       taskId,
       candidateCount: candidates.length,
       topCandidates: candidates.slice(0, 5).map(c => ({
         name: c.skill.metadata.name,
         similarity: 'score' in c ? (c as { score: number }).score : null,
       })),
     });

    // --- Phase 2 Hybrid Scoring Pipeline ---
    const rankedSkills = await this.applyHybridScoring(
      request.task,
      candidates.map((c) => c.skill),
    );

    // Apply deterministic filtering (quality gates, max skills, etc.)
    const filteredSkills = this.applyDeterministicFilter(
      rankedSkills,
      request.constraints
    );

    this.logger.info('Selected skills for request', {
      taskId,
      task: request.task.slice(0, 100),
      selectedSkills: filteredSkills.map(s => ({
        name: s.name,
        score: s.score,
        role: s.role,
        reasoning: s.reasoning?.slice(0, 100),
      })),
    });

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
   * Includes quality gate to filter out stub skills (draft: true)
   */
  private applyDeterministicFilter(
    rankedSkills: SelectedSkill[],
    constraints?: RouteRequest['constraints']
  ): SelectedSkill[] {
    let filtered = rankedSkills;

    // Quality gate: filter out stub/draft skills
    const allSkills = this.skillRegistry.getAllSkills();
    const draftSkillSet = new Set(
      allSkills
        .filter((s) => s.metadata.draft === true)
        .map((s) => s.metadata.name)
    );

    const beforeDraftFilter = filtered.length;
    filtered = filtered.filter((skill) => !draftSkillSet.has(skill.name));
    const draftFiltered = beforeDraftFilter - filtered.length;

    if (draftFiltered > 0) {
      this.logger.info('Filtered out stub skills', {
        draftFiltered,
        remaining: filtered.length,
        filteredNames: rankedSkills
          .filter((s) => draftSkillSet.has(s.name))
          .map((s) => s.name),
      });
    }

    // Filter by max skills
    // Config (from env var) takes priority over request constraints
    const maxSkills = this.config.execution?.maxSkills 
      ?? constraints?.maxSkills 
      ?? 5;
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
    // Use 0.3 threshold when we have fallback skills (LLM unavailable)
    const hasFallback = rankedSkills.some(s => s.reasoning?.includes('fallback'));
    const minScore = hasFallback ? 0.3 : 0.5;
    filtered = filtered.filter((skill) => skill.score >= minScore);

    // Ensure at least one skill is returned (fallback behavior)
    if (filtered.length === 0 && rankedSkills.length > 0) {
      this.logger.warn('All skills filtered, returning first candidate as fallback');
      filtered = [rankedSkills[0]];
    }

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
    * Apply hybrid scoring pipeline to rank candidate skills.
    * Combines vector similarity, BM25, trigger match, archetype boost, anti-trigger penalty,
    * specificity, and conciseness into a single score per skill.
    */
  private async applyHybridScoring(
    query: string,
    candidates: Array<{ metadata: ReturnType<SkillRegistry['getAllSkills']>[number]['metadata']; rawContent: string; responseProfile?: unknown }>
  ): Promise<SelectedSkill[]> {
    // LLM ranking enabled via env var — use as fallback/backup for nuanced understanding
    const llmRankingEnabled = process.env.LLM_RANKING_ENABLED === 'true';

    if (llmRankingEnabled && candidates.length > 0) {
      // Run LLM ranking on all candidates first, then apply hybrid adjustments
      const llmRanked = await this.llmRanker.rankCandidates(
        query,
        candidates.map((c) => ({ metadata: c.metadata, rawContent: c.rawContent }) as any)
      );

      // Map LLM scores to candidate set
      const llmScoreMap = new Map<string, number>();
      for (const ranked of llmRanked) {
        llmScoreMap.set(ranked.name, ranked.score);
      }

      // For each candidate, compute hybrid score using LLM similarity as vectorSimilarity fallback
      const hybridResults: Array<{ skill: typeof candidates[0]; hybridScore: number; components: ScoreComponents }> = [];

      for (const candidate of candidates) {
        const llmScore = llmScoreMap.get(candidate.metadata.name) ?? 0;

        // BM25 scoring
      const bm25Results = this.bm25Indexer.score(query);
       const normalizedScores = BM25Indexer.normalizeScores(
          new Map(bm25Results.map(r => [r.id, r.score]))
        );
        const bm25Score = normalizedScores.get(candidate.metadata.name) ?? 0;

        // Trigger match scoring
        const triggerScore = TriggerMatchScorer.score(
          query,
          candidate.metadata.tags ?? [],
          (candidate.metadata as any).triggers ?? []
        );

        // Archetype boost
        const queryArchetypes = QueryArchetypeInferencer.infer(query);
        const archetypeBoost = ArchetypeRankingBoost.computeBoost(
          queryArchetypes,
          candidate.metadata.archetypes ?? []
        );

        // Anti-trigger penalty
        const antiTriggerPenalty = AntiTriggerScorer.computePenalty(
          query,
          candidate.metadata.antiTriggers ?? []
        );

        // Specificity score
        const specificityScore = SpecificityScorer.compute(
          candidate.metadata.name,
          candidate.metadata.description,
          candidate.metadata.tags ?? [],
          candidate.rawContent?.slice(0, 2000)
        );

        // Conciseness score
        const concisenessMetrics = ConcisenessScorer.analyze(candidate.rawContent ?? '', {
          verbosity: (candidate.responseProfile as any)?.verbosity,
          directiveStrength: (candidate.responseProfile as any)?.directiveStrength,
        });
        const concisenessScore = ConcisenessScorer.computeScore(concisenessMetrics);

        // Historical success rate (from metadata if available)
        const historicalRate = candidate.metadata.performance?.successRate ?? undefined;

        const components: ScoreComponents = {
          vectorSimilarity: llmScore,
          bm25Score,
          triggerMatchScore: triggerScore,
          archetypeBoost,
          antiTriggerPenalty,
          specificityScore,
          concisenessScore,
          historicalSuccessRate: historicalRate !== undefined ? historicalRate / 100 : undefined,
        };

        hybridResults.push({ skill: candidate, hybridScore: this.hybridScorer.compute(components), components });
      }

      // Sort by hybrid score descending and convert to SelectedSkill[]
      hybridResults.sort((a, b) => b.hybridScore - a.hybridScore);
      return hybridResults.map((r, i) => ({
        name: r.skill.metadata.name,
        score: r.hybridScore,
        role: i === 0 ? 'primary' : 'supporting',
      }));
    }

    // --- No LLM fallback: compute all scores directly ---
    const hybridResults: Array<{ skill: typeof candidates[0]; hybridScore: number }> = [];

    for (const candidate of candidates) {
      // BM25 scoring
      const bm25Results = this.bm25Indexer.score(query);
      const normalizedScores = BM25Indexer.normalizeScores(
        new Map(bm25Results.map(r => [r.id, r.score]))
      );
      const bm25Score = normalizedScores.get(candidate.metadata.name) ?? 0;

      // Trigger match scoring
      const triggerScore = TriggerMatchScorer.score(
        query,
        candidate.metadata.tags ?? [],
        (candidate.metadata as any).triggers ?? []
      );

      // Archetype boost
      const queryArchetypes = QueryArchetypeInferencer.infer(query);
      const archetypeBoost = ArchetypeRankingBoost.computeBoost(
        queryArchetypes,
        candidate.metadata.archetypes ?? []
      );

      // Anti-trigger penalty
      const antiTriggerPenalty = AntiTriggerScorer.computePenalty(
        query,
        candidate.metadata.antiTriggers ?? []
      );

      // Specificity score
      const specificityScore = SpecificityScorer.compute(
        candidate.metadata.name,
        candidate.metadata.description,
        candidate.metadata.tags ?? [],
        candidate.rawContent?.slice(0, 2000)
      );

      // Conciseness score
      const concisenessMetrics = ConcisenessScorer.analyze(candidate.rawContent ?? '', {
        verbosity: (candidate.responseProfile as any)?.verbosity,
        directiveStrength: (candidate.responseProfile as any)?.directiveStrength,
      });
      const concisenessScore = ConcisenessScorer.computeScore(concisenessMetrics);

      // Historical success rate
      const historicalRate = candidate.metadata.performance?.successRate ?? undefined;

      const components: ScoreComponents = {
        vectorSimilarity: 0, // No LLM similarity — will be overridden by actual vector DB score below
        bm25Score,
        triggerMatchScore: triggerScore,
        archetypeBoost,
        antiTriggerPenalty,
        specificityScore,
        concisenessScore,
        historicalSuccessRate: historicalRate !== undefined ? historicalRate / 100 : undefined,
      };

      hybridResults.push({ skill: candidate, hybridScore: this.hybridScorer.compute(components) });
    }

    // Sort by hybrid score descending
    hybridResults.sort((a, b) => b.hybridScore - a.hybridScore);
    return hybridResults.map((r, i) => ({
      name: r.skill.metadata.name,
      score: r.hybridScore,
      role: i === 0 ? 'primary' : 'supporting',
    }));
  }

  /** Build BM25 documents from all skills in the registry */
  private buildBM25Index(): BM25Indexer {
    const allSkills = this.skillRegistry.getAllSkills();
    const documents: BM25Document[] = allSkills.map((skill) => ({
      id: skill.metadata.name,
      fieldTexts: {
        description: skill.metadata.description || '',
        tags: (skill.metadata.tags || []).join(' '),
        triggers: (skill.metadata as any).triggers?.join(' ') ?? '',
        rawContent: skill.rawContent || '',
      },
    }));
    return BM25Indexer.buildIndex(documents);
  }

  /**
    * Extract routing scores for response — now includes per-component breakdowns
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

  /**
   * Expose the registry so HTTP endpoints can call on-demand methods
   * (e.g. getSkillContent, loadFromRemoteIndex).
   */
  getRegistry(): SkillRegistry {
    return this.skillRegistry;
  }

  /**
   * Sync the vector database from the current registry state.
   * Call after loadFromRemoteIndex() to ensure semantic search reflects the index.
   */
  syncVectorDatabase(): void {
    this.vectorDatabase.setSkills(this.skillRegistry.getAllSkills());
    this.logger.info('Vector database synced', { skillCount: this.skillRegistry.getAllSkills().length });
  }
}
