"use strict";
// Execution Engine - executes skills with validation, retry, and fallback
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionEngine = void 0;
const util_1 = require("util");
const timers_1 = require("timers");
const SafetyLayer_js_1 = require("./SafetyLayer.js");
const Logger_js_1 = require("../observability/Logger.js");
/**
 * Execution engine for running skills
 */
class ExecutionEngine {
    tools;
    config;
    safetyLayer;
    logger;
    constructor(config, tools) {
        this.tools = tools;
        this.config = {
            maxRetries: 2,
            defaultTimeoutMs: 30000,
            fallbackEnabled: true,
            ...config,
        };
        this.safetyLayer = new SafetyLayer_js_1.SafetyLayer();
        this.logger = new Logger_js_1.Logger('ExecutionEngine');
    }
    /**
     * Execute a single skill
     */
    async executeSkill(skill, inputs, timeoutMs) {
        const startTime = Date.now();
        const skillName = skill.name;
        let retries = 0;
        let lastError;
        this.logger.info('Executing skill', {
            skill: skillName,
            inputs,
            retry: retries,
        });
        while (retries <= this.config.maxRetries) {
            try {
                const tool = this.tools[skillName];
                if (!tool) {
                    throw new Error(`No tool found for skill: ${skillName}`);
                }
                // Sanitize inputs
                const sanitizedInputs = this.safetyLayer.sanitizeInputs(inputs);
                // Execute tool
                const result = await this.executeWithTimeout(tool.execute(sanitizedInputs), timeoutMs || this.config.defaultTimeoutMs);
                if (!result.success) {
                    throw new Error(result.error || 'Tool execution failed');
                }
                this.logger.info('Skill executed successfully', {
                    skill: skillName,
                    latencyMs: Date.now() - startTime,
                    output: result.output,
                });
                return {
                    skillName,
                    status: 'success',
                    output: result.output,
                    latencyMs: Date.now() - startTime,
                    retries,
                };
            }
            catch (error) {
                lastError = error instanceof Error ? error.message : String(error);
                retries++;
                if (retries <= this.config.maxRetries) {
                    this.logger.warn('Skill execution failed, retrying', {
                        skill: skillName,
                        retry: retries,
                        error: lastError,
                    });
                    // Exponential backoff
                    const backoff = Math.pow(2, retries - 1) * 100;
                    await (0, util_1.promisify)(timers_1.setTimeout)(backoff);
                }
                else {
                    this.logger.error('Skill execution failed permanently', {
                        skill: skillName,
                        error: lastError,
                    });
                }
            }
        }
        return {
            skillName,
            status: 'failure',
            error: lastError,
            latencyMs: Date.now() - startTime,
            retries: this.config.maxRetries,
        };
    }
    /**
     * Execute multiple skills sequentially
     */
    async executeSequential(steps, context) {
        const results = [];
        const contextStore = { ...context };
        for (const step of steps) {
            const result = await this.executeSkill({ name: step.skill, score: 1, role: 'primary' }, { ...contextStore, ...step.inputs });
            results.push(result);
            if (result.status === 'success' && result.output) {
                contextStore[step.skill] = result.output;
            }
            if (result.status !== 'success') {
                break;
            }
        }
        return results;
    }
    /**
     * Execute multiple skills in parallel
     */
    async executeParallel(steps, concurrency = 5) {
        const results = [];
        const queue = [...steps];
        const active = [];
        while (queue.length > 0 || active.length > 0) {
            // Wait for some active tasks to complete if at capacity
            if (active.length >= concurrency) {
                await Promise.race(active);
            }
            // Start new tasks
            while (queue.length > 0 && active.length < concurrency) {
                const step = queue.shift();
                const promise = (async () => {
                    const result = await this.executeSkill({ name: step.skill, score: 1, role: 'primary' }, step.inputs);
                    results.push(result);
                })();
                active.push(promise);
            }
            // Clean up completed promises
            for (let i = active.length - 1; i >= 0; i--) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const p = active[i];
                if (p.state === 'fulfilled' || p.state === 'rejected') {
                    active.splice(i, 1);
                }
            }
        }
        return results;
    }
    /**
     * Execute with timeout
     */
    executeWithTimeout(promise, timeoutMs) {
        return Promise.race([
            promise,
            new Promise((_, reject) => (0, timers_1.setTimeout)(() => reject(new Error('Timeout')), timeoutMs)),
        ]);
    }
    /**
     * Execute a full plan
     */
    async executePlan(strategy, steps, context) {
        this.logger.info('Executing plan', {
            strategy,
            stepCount: steps.length,
        });
        switch (strategy) {
            case 'sequential':
                return this.executeSequential(steps, context);
            case 'parallel':
                return this.executeParallel(steps);
            case 'hybrid':
                // Execute independent steps in parallel, then dependent steps sequentially
                return this.executeHybrid(steps, context);
            default:
                return this.executeSequential(steps, context);
        }
    }
    /**
     * Execute with hybrid strategy
     */
    async executeHybrid(steps, context) {
        const results = [];
        const executed = new Set();
        const contextStore = { ...context };
        let changed = true;
        while (changed && steps.length > 0) {
            changed = false;
            // Find all steps that can be executed now
            const ready = steps.filter((step) => {
                const allDepsDone = step.dependencies.every((dep) => executed.has(dep));
                return allDepsDone;
            });
            if (ready.length === 0) {
                break;
            }
            // Execute independent steps in parallel
            const independent = ready.filter((step) => step.dependencies.length === 0);
            const dependent = ready.filter((step) => step.dependencies.length > 0);
            // Execute independent steps in parallel
            if (independent.length > 0) {
                const parallelResults = await this.executeParallel(independent.map((s) => ({
                    skill: s.skill,
                    inputs: s.inputs,
                })));
                results.push(...parallelResults);
                independent.forEach((s) => executed.add(s.skill));
                changed = true;
            }
            // Execute dependent steps sequentially
            if (dependent.length > 0) {
                for (const step of dependent) {
                    const result = await this.executeSkill({ name: step.skill, score: 1, role: 'primary' }, { ...contextStore, ...step.inputs });
                    results.push(result);
                    executed.add(step.skill);
                    changed = true;
                    if (result.status === 'success' && result.output) {
                        contextStore[step.skill] = result.output;
                    }
                }
            }
            // Remove executed steps
            steps = steps.filter((step) => !executed.has(step.skill));
        }
        return results;
    }
    /**
     * Get execution statistics
     */
    getStats() {
        // In production, track these in a counter
        return {
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            totalRetries: 0,
        };
    }
}
exports.ExecutionEngine = ExecutionEngine;
//# sourceMappingURL=ExecutionEngine.js.map