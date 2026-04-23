import { SkillExecutionResult, SelectedSkill } from '../core/types.js';
import { IMCPTool } from '../mcp/types.js';
/**
 * Configuration for the execution engine
 */
export interface ExecutionEngineConfig {
    maxRetries: number;
    defaultTimeoutMs: number;
    fallbackEnabled: boolean;
}
/**
 * Execution engine for running skills
 */
export declare class ExecutionEngine {
    private tools;
    private config;
    private safetyLayer;
    private logger;
    constructor(config: Partial<ExecutionEngineConfig>, tools: Record<string, IMCPTool>);
    /**
     * Execute a single skill
     */
    executeSkill(skill: SelectedSkill, inputs: Record<string, unknown>, timeoutMs?: number): Promise<SkillExecutionResult>;
    /**
     * Execute multiple skills sequentially
     */
    executeSequential(steps: Array<{
        skill: string;
        inputs: Record<string, unknown>;
    }>, context?: Record<string, unknown>): Promise<SkillExecutionResult[]>;
    /**
     * Execute multiple skills in parallel
     */
    executeParallel(steps: Array<{
        skill: string;
        inputs: Record<string, unknown>;
    }>, concurrency?: number): Promise<SkillExecutionResult[]>;
    /**
     * Execute with timeout
     */
    private executeWithTimeout;
    /**
     * Execute a full plan
     */
    executePlan(strategy: 'sequential' | 'parallel' | 'hybrid', steps: Array<{
        skill: string;
        inputs: Record<string, unknown>;
        dependencies: string[];
    }>, context?: Record<string, unknown>): Promise<SkillExecutionResult[]>;
    /**
     * Execute with hybrid strategy
     */
    private executeHybrid;
    /**
     * Get execution statistics
     */
    getStats(): {
        totalExecutions: number;
        successfulExecutions: number;
        failedExecutions: number;
        totalRetries: number;
    };
}
//# sourceMappingURL=ExecutionEngine.d.ts.map