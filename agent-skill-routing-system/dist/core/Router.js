"use strict";
// Router - main routing engine that orchestrates the skill routing pipeline
Object.defineProperty(exports, "__esModule", { value: true });
exports.Router = void 0;
const uuid_1 = require("uuid");
const SkillRegistry_js_1 = require("../core/SkillRegistry.js");
const VectorDatabase_js_1 = require("../embedding/VectorDatabase.js");
const EmbeddingService_js_1 = require("../embedding/EmbeddingService.js");
const LLMRanker_js_1 = require("../llm/LLMRanker.js");
const ExecutionPlanner_js_1 = require("../core/ExecutionPlanner.js");
const SafetyLayer_js_1 = require("../core/SafetyLayer.js");
const Logger_js_1 = require("../observability/Logger.js");
/**
 * Router - orchestrates skill routing
 */
class Router {
    skillRegistry;
    vectorDatabase;
    embeddingService;
    llmRanker;
    executionPlanner;
    safetyLayer;
    logger;
    constructor(config) {
        this.skillRegistry = new SkillRegistry_js_1.SkillRegistry({
            skillsDirectory: config.skillsDirectory,
        });
        this.vectorDatabase = new VectorDatabase_js_1.VectorDatabase();
        this.embeddingService = new EmbeddingService_js_1.EmbeddingService({
            model: config.embedding?.model || 'text-embedding-3-small',
            dimensions: config.embedding?.dimensions || 1536,
        });
        this.llmRanker = new LLMRanker_js_1.LLMRanker({
            model: config.llm?.model || 'gpt-4o-mini',
            maxCandidates: config.llm?.maxCandidates || 10,
        });
        this.executionPlanner = new ExecutionPlanner_js_1.ExecutionPlanner({
            maxSkillsPerPlan: config.execution?.maxSkills || 5,
            defaultTimeoutMs: config.execution?.timeoutMs || 30000,
        });
        this.safetyLayer = new SafetyLayer_js_1.SafetyLayer({
            enablePromptInjectionFilter: config.safety?.enablePromptInjectionFilter ?? true,
            requireSchemaValidation: config.safety?.requireSchemaValidation ?? true,
        });
        this.logger = new Logger_js_1.Logger('Router', {
            level: config.observability?.level || 'info',
            includePayloads: config.observability?.includePayloads ?? false,
        });
    }
    /**
     * Initialize the router
     */
    async initialize() {
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
    async routeTask(request) {
        const taskId = request.taskId || (0, uuid_1.v4)();
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
            throw new Error(`Safety validation failed: ${safetyResult.errorMessage}`);
        }
        // Generate task embedding
        const taskEmbedding = await this.embeddingService.generateEmbedding(request.task);
        // Search for candidates
        const candidates = await this.vectorDatabase.search(taskEmbedding.embedding, 20);
        this.logger.debug('Found candidate skills', {
            taskId,
            candidateCount: candidates.length,
        });
        // Get LLM ranker to rank candidates
        const rankedSkills = await this.llmRanker.rankCandidates(request.task, candidates.map((c) => c.skill));
        // Apply deterministic filtering
        const filteredSkills = this.applyDeterministicFilter(rankedSkills, request.constraints);
        this.logger.debug('Filtered skills', {
            taskId,
            filteredCount: filteredSkills.length,
        });
        // Generate execution plan
        const plan = this.executionPlanner.generatePlan(request.task, filteredSkills, request.context);
        // Calculate confidence score
        const confidence = this.calculateConfidence(filteredSkills);
        // Build response
        const response = {
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
    applyDeterministicFilter(rankedSkills, constraints) {
        let filtered = rankedSkills;
        // Filter by max skills
        const maxSkills = constraints?.maxSkills || 5;
        filtered = filtered.slice(0, maxSkills);
        // Filter by categories if specified
        if (constraints?.categories && constraints.categories.length > 0) {
            filtered = filtered.filter((skill) => constraints.categories.some((cat) => skill.name.toLowerCase().includes(cat.toLowerCase())));
        }
        // Filter by minimum score
        filtered = filtered.filter((skill) => skill.score >= 0.5);
        return filtered;
    }
    /**
     * Calculate overall confidence score
     */
    calculateConfidence(skills) {
        if (skills.length === 0) {
            return 0;
        }
        // Average of skill scores
        const averageScore = skills.reduce((sum, s) => sum + s.score, 0) / skills.length;
        // Boost if we have a clear primary
        const hasClearPrimary = skills.length > 0 && skills[0].score > 0.8;
        return Math.min(1, averageScore * (hasClearPrimary ? 1.1 : 1));
    }
    /**
     * Extract routing scores for response
     */
    extractRoutingScores(skills) {
        const scores = {};
        for (const skill of skills) {
            scores[skill.name] = skill.score;
        }
        return scores;
    }
    /**
     * Get router statistics
     */
    getStats() {
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
    async reloadSkills() {
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
exports.Router = Router;
//# sourceMappingURL=Router.js.map