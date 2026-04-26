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
  performance?: {
    averageLatencyMs: number;
    successRate: number;
    lastUpdated: string;
  };
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
  };
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
  routingScores: Record<string, number>;
  latencyMs: number;
  attributionFooter?: string;
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
}
