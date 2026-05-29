// Core types and interfaces for the Agentic Skill Routing System

/**
 * Skill metadata from the skill definition
 */
export interface SkillMetadata {
  name: string;
  category: string;
  description: string;
  tags: string[];
  version?: string;
  author?: string;
  dependencies?: string[];
  input_schema: unknown;
  output_schema: unknown;
  embedding?: number[];
  draft?: boolean; // Quality gate: true if skill is a stub/template
  maturity?: 'draft' | 'beta' | 'stable'; // NEW: Skill maturity level
  completeness?: number; // NEW: 0-100 quality completeness score
  exampleCount?: number; // NEW: Number of code examples provided
  contentTypes?: ContentType[]; // Context-specific content types for this skill
  performance?: {
    averageLatencyMs: number;
    successRate: number;
    lastUpdated: string;
  };
  /** Archetypes describing the skill's primary role patterns */
  archetypes?: Archetype[];
  /** Triggers — keywords that cause this skill to be auto-loaded */
  triggers?: string[];
  /** Anti-triggers — topics/phrases that indicate the user should NOT use this skill */
  antiTriggers?: string[];
  /** Response profile shaping tone, depth, and abstraction of outputs */
  responseProfile?: ResponseProfile;
}

/**
 * Skill definition as stored in the registry
 */
export interface SkillDefinition {
  metadata: SkillMetadata;
  sourceFile: string;
  rawContent: string;
}

/**
 * Search result from vector database
 */
export interface SkillSearchResult {
  skill: SkillDefinition;
  score: number;
}

/**
 * MCP Tool result
 */
export interface ToolResult {
  success: boolean;
  output?: unknown;
  error?: string;
  latencyMs: number;
  metadata?: Record<string, unknown>;
}

/**
 * MCP Tool specification
 */
export interface ToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  /** Code generation methodology instructions for AI agents using this tool */
  methodology?: string;
}

/**
 * LLM ranking result for a skill candidate
 */
export interface SkillRanking {
  skillName: string;
  score: number;
  reason: string;
  confidence: number;
}

/**
 * Selected skill for execution with routing information
 */
export interface SelectedSkill {
  name: string;
  score: number;
  role: 'primary' | 'supporting' | 'fallback';
  reasoning?: string;
  /** Per-component hybrid scoring breakdown for observability */
  scoreBreakdown?: ScoreBreakdown;
}

/**
 * Skill ranking result with token usage information
 */
export interface SkillRankingResult extends SelectedSkill {
  /**
   * Token usage for this specific skill ranking (undefined since tokens are for entire request)
   * Per-skill token breakdown is not available from LLM API responses
   */
  inputTokens?: number;
  outputTokens?: number;
  /**
   * Total token usage for the entire ranking request (all skills)
   * This represents the combined input/output tokens for the LLM call
   */
  totalInputTokens: number;
  totalOutputTokens: number;
}

/**
 * Execution step in a plan
 */
export interface ExecutionStep {
  skill: string;
  inputs: Record<string, unknown>;
  dependencies: string[];
  timeoutMs?: number;
}

/**
 * Execution plan strategy
 */
export type ExecutionStrategy = 'sequential' | 'parallel' | 'hybrid';

/**
 * Execution plan with strategy and steps
 */
export interface ExecutionPlan {
  strategy: ExecutionStrategy;
  steps: ExecutionStep[];
}

/**
 * Skill routing request
 */
export interface RouteRequest {
  taskId?: string;
  task: string;
  context?: Record<string, unknown>;
  constraints?: {
    categories?: string[];
    maxSkills?: number;
    latencyBudgetMs?: number;
    /** When true, populate scoreExplanations in the response */
    includeScoreBreakdown?: boolean;
  };
}

/**
 * Per-skill scoring breakdown in hybrid pipeline.
 */
export interface ScoreBreakdown {
  finalScore: number;
  vectorScore?: number;
  bm25Score?: number;
  triggerMatchScore?: number;
  archetypeScore?: number;
  specificityScore?: number;
  concisenessScore?: number;
  /** MMR diversity penalty applied during selection (negative value) */
  mmerPenalty?: number;
}

/**
 * Skill routing response
 */
export interface RouteResponse {
  taskId: string;
  selectedSkills: SelectedSkill[];
  executionPlan: ExecutionPlan;
  confidence: number;
  reasoningSummary: string;
  candidatePool: string[];
  routingScores: Record<string, ScoreBreakdown | number>;
  latencyMs: number;
  attributionFooter?: string;
  /** Human-readable score explanations per skill (only when requested) */
  scoreExplanations?: Record<string, string[]>;
}


/**
 * Execution request
 */
export interface ExecuteRequest {
  task: string;
  taskId?: string;
  inputs?: Record<string, unknown>;
  skills?: string[];
}

/**
 * Execution result for a skill
 */
export interface SkillExecutionResult {
  skillName: string;
  status: 'success' | 'failure' | 'timeout' | 'skipped';
  output?: unknown;
  error?: string;
  latencyMs: number;
  retries: number;
}

/**
 * Execution response
 */
export interface ExecuteResponse {
  taskId: string;
  task: string;
  status: 'success' | 'partial_failure' | 'failure';
  results: SkillExecutionResult[];
  totalLatencyMs: number;
  confidence: number;
}

/**
 * Observability log entry
 */
export interface LogEntry {
  timestamp: string;
  taskId: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  category: string;
  message: string;
  data?: Record<string, unknown>;
  modelName?: string;
  inputTokens?: number;
  outputTokens?: number;
}

/**
 * Embedding request/response
 */
export interface EmbeddingRequest {
  text: string;
  model: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  dimensions: number;
  model: string;
  inputTokens?: number;
  batchTokenCount?: number;
}

/**
 * Content types that a skill may produce
 */
export type ContentType = 'guidance' | 'examples' | 'do-dont' | 'config' | 'code' | 'diagrams';

/**
 * Archetype categories for skill classification
 */
export type Archetype =
  | 'tactical'
  | 'strategic'
  | 'diagnostic'
  | 'orchestration'
  | 'educational'
  | 'enforcement'
  | 'generation';

/**
 * Response profile — how a skill should shape its output tone and depth
 */
export interface ResponseProfile {
  verbosity: 'low' | 'medium' | 'high';
  directiveStrength: 'low' | 'medium' | 'high';
  abstractionLevel: 'operational' | 'tactical' | 'strategic';
}

/**
 * Domain configuration defaults from domains.json
 */
export interface DomainConfig {
  role: string;
  scope: string;
  contentTypes: ContentType[];
  description?: string;
}

/**
 * Domain configuration file structure
 */
export interface DomainsConfig {
  domains: Record<string, DomainConfig>;
}
