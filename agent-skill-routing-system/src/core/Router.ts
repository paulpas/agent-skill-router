// Router - main routing engine that orchestrates the skill routing pipeline
// Phase 2: Hybrid retrieval pipeline with BM25 + scorer combination

import { v4 as uuidv4 } from 'uuid';
import type {
  RouteRequest,
  RouteResponse,
  SelectedSkill,
  EmbeddingResponse,
  ScoreBreakdown,
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
import { MMRDiversifier, MMRCandidate } from '../retrieval/MMRDiversifier';
import { ScoreExplanationBuilder, ScoreBreakdown as ObsScoreBreakdown } from '../observability/ScoreExplanation';
import { QueryArchetypeInferencer } from './QueryArchetypeInferencer';
import { ArchetypeRankingBoost } from './ArchetypeRankingBoost';
import { AntiTriggerScorer } from './AntiTriggerScorer';
import { ValidationError } from './AppError';
import { IntentDecomposer } from '../retrieval/IntentDecomposer';

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
  // MMR diversification configuration (Phase 3)
  diversity?: {
    /** Relevance vs diversity tradeoff. Default: 0.7 */
    lambda?: number;
    /** Whether to enable MMR diversification. Default: true */
    enabled?: boolean;
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
  private bm25Indexer: BM25Indexer;
  private hybridScorer: HybridScorer;
  private mmrDiversifier: MMRDiversifier | null = null;
  /** Tracks MMR diversity penalties by skill name for observability */
  private mmrPenalties = new Map<string, number>();
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

    // Helper: parse env var as float with safe fallback (NaN-safe)
    const envWeight = (key: string, defaultVal: number): number => {
      const val = process.env[key];
      if (val !== undefined) {
        const parsed = parseFloat(val);
        if (!isNaN(parsed)) return parsed;
      }
      return defaultVal;
    };

    // Hybrid retrieval initialization (Phase 2)
    // Priority: programmatic config > env var > hardcoded default
    const scoreConfig: HybridScoreConfig = {
      vectorWeight: config.retrieval?.vectorWeight ?? envWeight('RETRIEVAL_VECTOR_WEIGHT', 0.50),
      bm25Weight: config.retrieval?.bm25Weight ?? envWeight('RETRIEVAL_BM25_WEIGHT', 0.30),
      triggerMatchWeight: config.retrieval?.triggerMatchWeight ?? envWeight('RETRIEVAL_TRIGGER_MATCH_WEIGHT', 0.15),
      archetypeWeight: config.retrieval?.archetypeWeight ?? envWeight('RETRIEVAL_ARCHETYPE_WEIGHT', 0.10),
      historicalWeight: config.retrieval?.historicalWeight ?? envWeight('RETRIEVAL_HISTORICAL_WEIGHT', 0.05),
    };
    this.hybridScorer = new HybridScorer(scoreConfig);
    this.bm25Indexer = BM25Indexer.buildIndex([]); // Will be rebuilt when skills are indexed

    // Semantic selection control: enables/disables vector similarity + BM25 scoring
    const semanticSelectionEnabled = process.env.SEMANTIC_SKILL_SELECTION !== 'false';
    if (!semanticSelectionEnabled) {
      this.hybridScorer = new HybridScorer({
        vectorWeight: 0,
        bm25Weight: 0,
      });
    }

    // MMR diversifier (Phase 3)
    // Priority: programmatic config > env var > hardcoded default (0.7)
    const diversityEnabled = config.diversity?.enabled ?? true;
    if (diversityEnabled) {
      const mmrLambda = config.diversity?.lambda ?? envWeight('MMR_LAMBDA', 0.7);
      this.mmrDiversifier = new MMRDiversifier({ lambda: mmrLambda });
    }

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

    // Build the dynamic trigger→domain index from loaded skills' metadata.triggers.
    // This makes keyword matching self-documenting: new skills automatically teach
    // the router their triggers without any code changes to IntentDecomposer.
    IntentDecomposer.initialize(this.skillRegistry);
    const idx = IntentDecomposer.getTriggerDomainIndex();
    this.logger.info('Dynamic trigger domain index built', {
      skillCount: this.skillRegistry.getAllSkills().length,
      indexedTriggers: idx?.size ?? 0,
    });

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

      throw new ValidationError(
        `Safety validation failed: ${safetyResult.errorMessage}`,
        'SAFETY_VALIDATION'
      );
    }

    // Truncate task to 2000 chars before embedding to save cost/latency
    const embeddingInput = request.task.length > 2000
      ? request.task.slice(0, 2000)
      : request.task;
    if (embeddingInput.length !== request.task.length) {
      this.logger.info('Task truncated for embedding', {
        originalLength: request.task.length,
        truncatedLength: embeddingInput.length,
      });
    }

    // Generate task embedding
    const taskEmbeddingResponse: EmbeddingResponse = await this.embeddingService.generateEmbedding(
      embeddingInput
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

    // --- Phase 3 MMR Diversification ---
    let diverseCandidates = candidates;
    if (this.mmrDiversifier && candidates.length > 1) {
      const mmrInput: MMRCandidate[] = candidates.map((c) => ({
        id: c.skill.metadata.name,
        embedding: c.skill.metadata.embedding ?? [],
        score: c.score,
      }));

      // Bug fix: Early-exit when similarity spread is too low (e.g., emulation mode with near-zero vectors).
      // When all candidates have nearly identical similarity scores, MMR's diversity penalty will eliminate everything.
      const scores = candidates.map((c) => c.score);
      const meanScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const variance = scores.reduce((sum, s) => sum + Math.pow(s - meanScore, 2), 0) / scores.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev < 0.05) {
        this.logger.debug('Skipping MMR: similarity variance too low', {
          taskId,
          stdDev,
        });
      } else {
        const queryEmbedding = taskEmbeddingResponse.embedding;
        const diverseResults = this.mmrDiversifier.select(queryEmbedding, mmrInput);

        // Store MMR penalties for observability
        this.mmrPenalties.clear();
        for (const dr of diverseResults) {
          if (dr.mmrPenalty !== undefined) {
            this.mmrPenalties.set(dr.id, dr.mmrPenalty);
          }
        }

        // Map diversified results back to full SkillSearchResult objects
        const candidateIdSet = new Set(candidates.map((c) => c.skill.metadata.name));
        const idToSkill = new Map(
          candidates.map((c) => [c.skill.metadata.name, c] as const)
        );

        diverseCandidates = diverseResults
          .filter((dr) => candidateIdSet.has(dr.id))
          .map((dr) => {
            const base = idToSkill.get(dr.id)!;
            return {
              ...base,
              score: dr.score,
            };
          });

        // Safety fallback: if MMR returned no results (e.g., NaN scores due to config issue),
        // fall back to original candidates to avoid empty routing.
        if (diverseCandidates.length === 0 && candidates.length > 0) {
          this.logger.warn('MMR diversification returned empty set, falling back to original candidates', {
            taskId,
            candidateCount: candidates.length,
          });
          diverseCandidates = candidates;
        }

        this.logger.info('MMR diversification applied', {
          taskId,
          inputCount: candidates.length,
          outputCount: diverseCandidates.length,
        });
      }
    }

    // --- Phase 2 Hybrid Scoring Pipeline ---
    // Pass vector DB scores alongside skill data for the no-LLM fallback path
    const rankedSkills = await this.applyHybridScoring(
      request.task,
      diverseCandidates.map((c) => ({
        metadata: c.skill.metadata,
        rawContent: c.skill.rawContent,
        responseProfile: (c.skill.metadata as any).responseProfile,
        vectorScore: c.score,  // Pass the actual vector DB similarity score
      })),
    );

    // Apply deterministic filtering (quality gates, max skills, etc.)
    let filteredSkills = this.applyDeterministicFilter(
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

    // Minimum confidence threshold: if the top skill's confidence is too low,
    // the query is too ambiguous to route meaningfully. Return empty results
    // instead of hallucinating a match.
    const MIN_CONFIDENCE_THRESHOLD = 0.15;
    if (filteredSkills.length > 0 && filteredSkills[0].score < MIN_CONFIDENCE_THRESHOLD) {
      this.logger.warn('Query confidence below threshold, returning empty results', {
        taskId,
        topSkill: filteredSkills[0].name,
        topScore: filteredSkills[0].score,
        threshold: MIN_CONFIDENCE_THRESHOLD,
      });
      filteredSkills = [];
    }

    // Collect token usage from embedding service
    const embeddingTokens = taskEmbeddingResponse.inputTokens ?? 0;

    // Collect token usage from LLM ranker if it was used
    let llmInputTokens = 0;
    let llmOutputTokens = 0;
    const llmRankingEnabled = process.env.LLM_RANKING_ENABLED === 'true';
    // The LLMRanker overwrites its token counters on each call (not accumulated).
    // Since we call rankCandidates at most once per routeTask, getInputTokens/getOutputTokens
    // represent that single call's token usage.
    if (llmRankingEnabled && this.llmRanker) {
      llmInputTokens = this.llmRanker.getInputTokens();
      llmOutputTokens = this.llmRanker.getOutputTokens();
    }

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
      inputTokens: embeddingTokens + llmInputTokens,
      outputTokens: llmOutputTokens,
    };

    // Add score explanations if requested (Phase 5)
    const explainRequested =
      request.constraints?.includeScoreBreakdown === true ||
      process.env.DEBUG_ROUTING === 'true';

    if (explainRequested && filteredSkills.length > 0) {
      // Build breakdowns and explanations for selected skills
      const explanations: Record<string, string[]> = {};
      const breakdownMap = this.extractRoutingScoresAsBreakdown(filteredSkills);

      for (const skill of filteredSkills) {
        const breakdown = breakdownMap[skill.name];
        if (breakdown) {
          explanations[skill.name] = ScoreExplanationBuilder.generateExplanation(
            skill.name,
            breakdown
          );
        }
      }

      response.scoreExplanations = explanations;
    }

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
    * Includes quality gate to filter out stub skills (draft: true) and built-in skills with no metadata (customize-opencode)
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

    // Exclude built-in skill that has no metadata and over-matches broadly
    const BUILT_IN_EXCLUDE_LIST = new Set(['customize-opencode']);
    const beforeBuiltinFilter = filtered.length;
    filtered = filtered.filter((skill) => !BUILT_IN_EXCLUDE_LIST.has(skill.name));
    const builtinFiltered = beforeBuiltinFilter - filtered.length;

    if (builtinFiltered > 0) {
      this.logger.info('Filtered out built-in skill (no metadata, over-matching)', {
        builtinFiltered,
        remaining: filtered.length,
        filteredNames: ['customize-opencode'],
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
    // Use lower threshold when no LLM ranking is active (emulation mode scores are naturally lower).
    const hasFallback = rankedSkills.some(s => s.reasoning?.includes('fallback'));
    const minScore = hasFallback ? 0.3 : 0.25;
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
    candidates: Array<{ metadata: ReturnType<SkillRegistry['getAllSkills']>[number]['metadata']; rawContent: string; responseProfile?: unknown; vectorScore?: number }>
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

      // Compute query-wide scorers ONCE outside the loop (performance optimization)
      const bm25Results = this.bm25Indexer.score(query);
      const normalizedBm25Scores = BM25Indexer.normalizeScores(
        new Map(bm25Results.map(r => [r.id, r.score]))
      );
      const queryArchetypes = QueryArchetypeInferencer.infer(query);

      const hybridResults: Array<{ skill: typeof candidates[0]; hybridScore: number; components: ScoreComponents; breakdown?: ObsScoreBreakdown }> = [];

      for (const candidate of candidates) {
        const llmScore = llmScoreMap.get(candidate.metadata.name) ?? 0;

        // BM25 scoring (from precomputed results)
        const bm25Score = normalizedBm25Scores.get(candidate.metadata.name) ?? 0;

        // Trigger match scoring
        const triggerScore = TriggerMatchScorer.score(
          query,
          candidate.metadata.tags ?? [],
          (candidate.metadata.triggers ?? [])
        );

        // Archetype boost (from precomputed query archetypes)
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

        // Use actual vector DB score from candidate (not LLM ranker output)
        // The LLM ranker is a fallback for nuanced understanding only
        const components: ScoreComponents = {
          vectorSimilarity: candidate.vectorScore ?? llmScore,
          bm25Score,
          triggerMatchScore: triggerScore,
          archetypeBoost,
          antiTriggerPenalty,
          specificityScore,
          concisenessScore,
          historicalSuccessRate: historicalRate !== undefined ? historicalRate / 100 : undefined,
        };

        const finalScore = this.hybridScorer.compute(components);
        // Convert ScoreComponents → ScoreBreakdown for observability
        const breakdown: ObsScoreBreakdown = {
          finalScore,
          vectorScore: components.vectorSimilarity,
          bm25Score: components.bm25Score,
          triggerMatchScore: components.triggerMatchScore,
          specificityScore: components.specificityScore,
          concisenessScore: components.concisenessScore,
        };
        // Normalize archetypeBoost from [0.5,1.3] to [0,1] range for display
        const archetypeNormalized = (components.archetypeBoost - 1.0) / 0.3;
        breakdown.archetypeScore = Math.max(0, Math.min(1, archetypeNormalized));

        hybridResults.push({ skill: candidate, hybridScore: finalScore, components, breakdown });
      }

      // Sort by hybrid score descending and convert to SelectedSkill[]
      hybridResults.sort((a, b) => b.hybridScore - a.hybridScore);
      return hybridResults.map((r, i) => ({
        name: r.skill.metadata.name,
        score: r.hybridScore,
        role: i === 0 ? 'primary' : 'supporting',
        scoreBreakdown: r.breakdown,
      }));
    }

    // --- No LLM fallback: compute all scores directly ---

    // Compute query-wide scorers ONCE outside the loop (performance optimization)
    const bm25Results = this.bm25Indexer.score(query);
    const normalizedBm25Scores = BM25Indexer.normalizeScores(
      new Map(bm25Results.map(r => [r.id, r.score]))
    );
    const queryArchetypes = QueryArchetypeInferencer.infer(query);

    const hybridResults: Array<{ skill: typeof candidates[0]; hybridScore: number; components: ScoreComponents; breakdown?: ObsScoreBreakdown }> = [];

    for (const candidate of candidates) {
      // BM25 scoring (from precomputed results)
      const bm25Score = normalizedBm25Scores.get(candidate.metadata.name) ?? 0;

      // Trigger match scoring
      const triggerScore = TriggerMatchScorer.score(
        query,
        candidate.metadata.tags ?? [],
        (candidate.metadata.triggers ?? [])
      );

      // Archetype boost (from precomputed query archetypes)
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

      // Use vector DB score from candidate (set in routeTask), not the LLM ranker
      // In the no-LLM branch, the actual semantic similarity comes from the vector DB search
      const components: ScoreComponents = {
        vectorSimilarity: candidate.vectorScore ?? 0,
        bm25Score,
        triggerMatchScore: triggerScore,
        archetypeBoost,
        antiTriggerPenalty,
        specificityScore,
        concisenessScore,
        historicalSuccessRate: historicalRate !== undefined ? historicalRate / 100 : undefined,
      };

      const finalScore = this.hybridScorer.compute(components);
      // Convert ScoreComponents → ScoreBreakdown for observability
      const breakdown: ObsScoreBreakdown = {
        finalScore,
        vectorScore: components.vectorSimilarity,
        bm25Score: components.bm25Score,
        triggerMatchScore: components.triggerMatchScore,
        specificityScore: components.specificityScore,
        concisenessScore: components.concisenessScore,
      };
      // Normalize archetypeBoost from [0.5,1.3] to [0,1] range for display
      const archetypeNormalized = (components.archetypeBoost - 1.0) / 0.3;
      breakdown.archetypeScore = Math.max(0, Math.min(1, archetypeNormalized));

      hybridResults.push({ skill: candidate, hybridScore: finalScore, components, breakdown });
    }

    // Sort by hybrid score descending
    hybridResults.sort((a, b) => b.hybridScore - a.hybridScore);
    return hybridResults.map((r, i) => ({
      name: r.skill.metadata.name,
      score: r.hybridScore,
      role: i === 0 ? 'primary' : 'supporting',
      scoreBreakdown: r.breakdown,
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
        rawContent: skill.rawContent || '',
      },
    }));
    return BM25Indexer.buildIndex(documents);
  }

/**
      * Extract routing scores for response — returns per-component breakdown objects.
      * Uses stored scoreBreakdown when available (from hybrid scorer), otherwise falls back to scalar.
      */
     private extractRoutingScores(skills: SelectedSkill[]): Record<string, ScoreBreakdown | number> {
       const scores: Record<string, ScoreBreakdown | number> = {};
       for (const skill of skills) {
         if (skill.scoreBreakdown) {
           // Use the full component breakdown from the hybrid scorer
           scores[skill.name] = skill.scoreBreakdown;
         } else {
           // Fallback: scalar score for skills without breakdown data
           scores[skill.name] = skill.score;
         }
       }
       return scores;
     }

 /**
      * Extract routing scores as ScoreBreakdown objects for each selected skill.
      */
    private extractRoutingScoresAsBreakdown(
      skills: SelectedSkill[]
    ): Record<string, ObsScoreBreakdown> {
      const map: Record<string, ObsScoreBreakdown> = {};
      for (const skill of skills) {
        // Use stored breakdown if available (from hybrid scorer), otherwise build minimal
        if (skill.scoreBreakdown) {
          const breakdown: ObsScoreBreakdown = { ...skill.scoreBreakdown };
          map[skill.name] = breakdown;
        } else {
          const breakdown: ObsScoreBreakdown = { finalScore: skill.score };
          map[skill.name] = breakdown;
        }
        // Add MMR penalty if this skill was diversified
        const mmrPenalty = this.mmrPenalties.get(skill.name);
        if (mmrPenalty !== undefined) {
          map[skill.name].mmerPenalty = mmrPenalty;
        }
      }
      return map;
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
   * Detect whether a route response indicates a gap in existing skills.
   * Returns true when:
   *   - No skills matched (empty selectedSkills)
   *   - Confidence score is below the configured threshold
   *   - Top skill's raw score is very low (< 0.1), indicating almost certainly not a real match
   *
   * The confidence threshold is read from the AUTO_SKILL_CONFIDENCE_THRESHOLD env var (default: 0.35).
   */
  public detectGap(response: RouteResponse): boolean {
    const threshold = parseFloat(process.env.AUTO_SKILL_CONFIDENCE_THRESHOLD || '0.35');
    if (isNaN(threshold)) {
      // Fallback to sensible default if env var is garbage
      return response.selectedSkills.length === 0;
    }

    // No skills matched at all → gap
    if (response.selectedSkills.length === 0) return true;

    // Confidence below threshold → gap
    if (response.confidence < threshold) return true;

    // Top skill score is very low (< 0.1) — almost certainly not a real match
    const topScore = response.selectedSkills[0]?.score ?? 0;
    if (topScore < 0.1) return true;

    return false;
  }

  /**
   * Reload skills
   */
  async reloadSkills(): Promise<void> {
    await this.skillRegistry.reload();
    this.vectorDatabase.setSkills(this.skillRegistry.getAllSkills());
    // Rebuild BM25 index so newly added skills are searchable (important after auto-creation)
    this.bm25Indexer = this.buildBM25Index();
    // Rebuild the dynamic trigger→domain index after reload
    IntentDecomposer.initialize(this.skillRegistry);
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
