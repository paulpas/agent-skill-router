import { ExecutionStrategy, ExecutionStep, SelectedSkill } from '../core/types.js';
/**
 * Configuration for the execution planner
 */
export interface ExecutionPlannerConfig {
    maxSkillsPerPlan: number;
    defaultTimeoutMs: number;
    parallelThreshold: number;
}
/**
 * Execution planner that generates execution plans
 */
export declare class ExecutionPlanner {
    private config;
    constructor(config?: Partial<ExecutionPlannerConfig>);
    /**
     * Generate an execution plan from selected skills
     */
    generatePlan(task: string, selectedSkills: SelectedSkill[], context?: Record<string, unknown>): {
        strategy: ExecutionStrategy;
        steps: ExecutionStep[];
        reasoning: string;
    };
    /**
     * Determine the execution strategy
     */
    private determineStrategy;
    /**
     * Check if skills can run in parallel
     */
    private checkSkillIndependence;
    /**
     * Generate execution steps
     */
    private generateSteps;
    /**
     * Calculate dependencies for a skill
     */
    private calculateDependencies;
    /**
    * Generate reasoning for the execution plan
     */
    private generateReasoning;
    /**
     * Get category from skill name (simplified)
     */
    private getCategoryFromName;
    /**
     * Validate an execution plan
     */
    validatePlan(steps: ExecutionStep[]): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Optimize the execution plan
     */
    optimizePlan(steps: ExecutionStep[]): ExecutionStep[];
}
//# sourceMappingURL=ExecutionPlanner.d.ts.map