"use strict";
// Execution Plan Generator - creates execution plans from skill candidates
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionPlanner = void 0;
/**
 * Execution planner that generates execution plans
 */
class ExecutionPlanner {
    config;
    constructor(config = {}) {
        this.config = {
            maxSkillsPerPlan: 5,
            defaultTimeoutMs: 30000,
            parallelThreshold: 3,
            ...config,
        };
    }
    /**
     * Generate an execution plan from selected skills
     */
    generatePlan(task, selectedSkills, context) {
        // Limit to max skills
        const limitedSkills = selectedSkills.slice(0, this.config.maxSkillsPerPlan);
        if (limitedSkills.length === 0) {
            return {
                strategy: 'sequential',
                steps: [],
                reasoning: 'No skills selected for this task',
            };
        }
        // Determine strategy based on skills and task
        const strategy = this.determineStrategy(task, limitedSkills);
        // Generate steps
        const steps = this.generateSteps(limitedSkills, context);
        // Generate reasoning
        const reasoning = this.generateReasoning(task, limitedSkills, strategy);
        return {
            strategy,
            steps,
            reasoning,
        };
    }
    /**
     * Determine the execution strategy
     */
    determineStrategy(task, skills) {
        if (skills.length <= 1) {
            return 'sequential';
        }
        // Check if skills have dependencies
        const hasDependencies = skills.some((s) => s.role === 'supporting');
        if (hasDependencies) {
            return 'hybrid';
        }
        // Check task complexity
        const isComplex = task.length > 500 || task.includes('and') || task.includes('then');
        if (isComplex || skills.length > this.config.parallelThreshold) {
            // Check if skills are independent
            const isIndependent = this.checkSkillIndependence(skills);
            if (isIndependent) {
                return 'parallel';
            }
        }
        return 'sequential';
    }
    /**
     * Check if skills can run in parallel
     */
    checkSkillIndependence(skills) {
        // In a real implementation, this would analyze skill dependencies
        // For now, assume skills with different categories are independent
        const categories = new Set(skills.map((s) => this.getCategoryFromName(s.name)));
        return categories.size === skills.length;
    }
    /**
     * Generate execution steps
     */
    generateSteps(skills, context) {
        const steps = [];
        for (let i = 0; i < skills.length; i++) {
            const skill = skills[i];
            const dependencies = this.calculateDependencies(i, skills);
            steps.push({
                skill: skill.name,
                inputs: {
                    task: context?.task || '',
                    priority: i,
                    ...(context || {}),
                },
                dependencies,
                timeoutMs: this.config.defaultTimeoutMs,
            });
        }
        return steps;
    }
    /**
     * Calculate dependencies for a skill
     */
    calculateDependencies(currentIndex, skills) {
        // Primary skill has no dependencies
        if (currentIndex === 0) {
            return [];
        }
        // Supporting skills depend on primary
        if (skills[currentIndex].role === 'supporting') {
            return [skills[0].name];
        }
        // Otherwise, depend on previous skill
        return [skills[currentIndex - 1].name];
    }
    /**
    * Generate reasoning for the execution plan
     */
    generateReasoning(_task, skills, strategy) {
        const skillNames = skills.map((s) => s.name).join(', ');
        const roles = skills.map((s) => `${s.name} (${s.role})`).join(', ');
        return `Executing task with ${skills.length} skill(s) using ${strategy} strategy: ${skillNames}. Roles: ${roles}.`;
    }
    /**
     * Get category from skill name (simplified)
     */
    getCategoryFromName(name) {
        if (name.includes('trading') || name.includes('order')) {
            return 'trading';
        }
        if (name.includes('kubernetes') || name.includes('k8s')) {
            return 'kubernetes';
        }
        if (name.includes('git') || name.includes('version')) {
            return 'version-control';
        }
        if (name.includes('api') || name.includes('http')) {
            return 'api';
        }
        return 'general';
    }
    /**
     * Validate an execution plan
     */
    validatePlan(steps) {
        const errors = [];
        // Check for circular dependencies
        const visited = new Set();
        const path = new Set();
        for (const step of steps) {
            if (path.has(step.skill)) {
                errors.push(`Circular dependency detected involving ${step.skill}`);
                break;
            }
            visited.add(step.skill);
            path.add(step.skill);
            for (const dep of step.dependencies) {
                if (!visited.has(dep)) {
                    errors.push(`Dependency ${dep} is not defined before ${step.skill}`);
                    break;
                }
            }
            path.delete(step.skill);
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    /**
     * Optimize the execution plan
     */
    optimizePlan(steps) {
        // Simple optimization: group independent steps for parallel execution
        const optimized = [];
        const executed = new Set();
        let changed = true;
        while (changed) {
            changed = false;
            const batch = [];
            const nextBatch = [];
            for (const step of steps) {
                const allDepsDone = step.dependencies.every((dep) => executed.has(dep));
                if (allDepsDone) {
                    batch.push(step);
                    changed = true;
                }
                else {
                    nextBatch.push(step);
                }
            }
            if (batch.length > 0) {
                // Group parallel steps
                if (batch.length > 1) {
                    optimized.push({
                        skill: 'parallel-group',
                        inputs: {
                            skills: batch.map((s) => s.skill),
                        },
                        dependencies: [],
                        timeoutMs: batch.reduce((_, s) => s.timeoutMs || 0, 0),
                    });
                    batch.forEach((s) => executed.add(s.skill));
                }
                else {
                    optimized.push(batch[0]);
                    executed.add(batch[0].skill);
                }
                steps = nextBatch;
            }
        }
        return optimized;
    }
}
exports.ExecutionPlanner = ExecutionPlanner;
//# sourceMappingURL=ExecutionPlanner.js.map