"use strict";
// Safety Layer - input validation, prompt injection filtering, skill allowlisting
Object.defineProperty(exports, "__esModule", { value: true });
exports.SafetyLayer = void 0;
/**
 * Safety layer for input validation and security
 */
class SafetyLayer {
    config;
    constructor(config = {}) {
        this.config = {
            enablePromptInjectionFilter: true,
            requireSchemaValidation: true,
            skillAllowlist: [],
            maxTaskLength: 10000,
            blockCategories: [],
            ...config,
        };
    }
    /**
     * Validate a routing request
     */
    async validateRouteRequest(request) {
        // Check if task is empty
        if (!request.task || request.task.trim().length === 0) {
            return {
                isSafe: false,
                riskLevel: 'critical',
                flags: ['empty-task'],
                errorMessage: 'Task cannot be empty',
            };
        }
        // Check task length
        if (request.task.length > this.config.maxTaskLength) {
            return {
                isSafe: false,
                riskLevel: 'high',
                flags: ['task-too-long'],
                errorMessage: `Task exceeds maximum length of ${this.config.maxTaskLength}`,
            };
        }
        // Check for prompt injection
        if (this.config.enablePromptInjectionFilter) {
            const injectionResult = this.checkPromptInjection(request.task);
            if (!injectionResult.isSafe) {
                return injectionResult;
            }
        }
        // Check skill allowlist
        if (this.config.skillAllowlist.length > 0 && request.constraints?.categories) {
            const allowedCategories = new Set(this.config.skillAllowlist);
            const requestedCategories = new Set(request.constraints.categories);
            for (const cat of requestedCategories) {
                if (!allowedCategories.has(cat)) {
                    return {
                        isSafe: false,
                        riskLevel: 'high',
                        flags: ['category-not-allowed'],
                        errorMessage: `Category "${cat}" is not in the allowlist`,
                    };
                }
            }
        }
        return {
            isSafe: true,
            riskLevel: 'low',
            flags: [],
        };
    }
    /**
     * Validate an execute request
     */
    async validateExecuteRequest(request) {
        // Check if task is empty
        if (!request.task || request.task.trim().length === 0) {
            return {
                isSafe: false,
                riskLevel: 'critical',
                flags: ['empty-task'],
                errorMessage: 'Task cannot be empty',
            };
        }
        // Check task length
        if (request.task.length > this.config.maxTaskLength) {
            return {
                isSafe: false,
                riskLevel: 'high',
                flags: ['task-too-long'],
                errorMessage: `Task exceeds maximum length of ${this.config.maxTaskLength}`,
            };
        }
        // Check for prompt injection
        if (this.config.enablePromptInjectionFilter) {
            const injectionResult = this.checkPromptInjection(request.task);
            if (!injectionResult.isSafe) {
                return injectionResult;
            }
        }
        // Check skill allowlist
        if (this.config.skillAllowlist.length > 0 &&
            request.skills &&
            request.skills.length > 0) {
            const allowedSkills = new Set(this.config.skillAllowlist);
            for (const skill of request.skills) {
                if (!allowedSkills.has(skill)) {
                    return {
                        isSafe: false,
                        riskLevel: 'high',
                        flags: ['skill-not-allowed'],
                        errorMessage: `Skill "${skill}" is not in the allowlist`,
                    };
                }
            }
        }
        return {
            isSafe: true,
            riskLevel: 'low',
            flags: [],
        };
    }
    /**
     * Check for prompt injection attempts
     */
    checkPromptInjection(task) {
        const flags = [];
        // Check for common prompt injection patterns
        const injectionPatterns = [
            /ignore\s+(all|previous|above|prior)/i,
            /disregard\s+(all|previous|above|prior)/i,
            /you\s+are\s+(now|a|an)/i,
            /system\s+(override|bypass|disable|ignore)/i,
            /role\s+(play|change|switch)/i,
            /hacker|inject|exploit|bypass/i,
            /base64|eval|exec|system|shell/i,
            /\{\{.*\}\}/, // Template injection
            /\$\{.*\}/, // Variable injection
        ];
        for (const pattern of injectionPatterns) {
            if (pattern.test(task)) {
                flags.push('potential-injection');
                break;
            }
        }
        // Check for command injection
        const commandPatterns = [
            /`.*`/, // Backtick commands
            /\$\(.+\)/, // Command substitution
            /\|\s*sh\s*$/, // Pipe to shell
            /&&\s*(rm|mv|cp|wget|curl)/i, // Command chaining
        ];
        for (const pattern of commandPatterns) {
            if (pattern.test(task)) {
                flags.push('potential-command-injection');
                break;
            }
        }
        // Check for social engineering
        const socialEngineerPatterns = [
            /verify\s+(your|the)\s+(password|credentials|api\s*key)/i,
            /confirm\s+(your|the)/i,
            /immediate\s+(action|required)/i,
            /urgent|emergency|critical/i,
        ];
        for (const pattern of socialEngineerPatterns) {
            if (pattern.test(task)) {
                flags.push('potential-social-engineering');
                break;
            }
        }
        if (flags.length === 0) {
            return {
                isSafe: true,
                riskLevel: 'low',
                flags: [],
            };
        }
        return {
            isSafe: false,
            riskLevel: this.determineRiskLevel(flags),
            flags,
            errorMessage: 'Potential security threat detected',
        };
    }
    /**
     * Determine risk level based on flags
     */
    determineRiskLevel(flags) {
        const riskyPatterns = [
            'command-injection',
            'exploit',
            'bypass',
            'hack',
        ];
        const suspiciousPatterns = [
            'injection',
            'social-engineering',
            'override',
        ];
        const flagsLower = flags.join(' ').toLowerCase();
        for (const pattern of riskyPatterns) {
            if (flagsLower.includes(pattern)) {
                return 'critical';
            }
        }
        for (const pattern of suspiciousPatterns) {
            if (flagsLower.includes(pattern)) {
                return 'high';
            }
        }
        return 'medium';
    }
    /**
     * Validate schema compatibility between skill input and execution inputs
     */
    validateSchema(_skillName, inputSchema, inputs) {
        if (!this.config.requireSchemaValidation) {
            return { isValid: true, errors: [], warnings: [] };
        }
        const errors = [];
        const warnings = [];
        try {
            // Basic validation - in production, use a proper JSON schema validator
            if (typeof inputSchema !== 'object' || inputSchema === null) {
                warnings.push('Invalid input schema');
                return { isValid: true, errors, warnings };
            }
            const schema = inputSchema;
            const properties = schema.properties || {};
            const required = schema.required || [];
            // Check required fields
            for (const field of required) {
                if (inputs[field] === undefined) {
                    errors.push(`Missing required field: ${field}`);
                }
            }
            // Type validation (basic)
            for (const [field, value] of Object.entries(inputs)) {
                const fieldSchema = properties[field];
                if (fieldSchema && fieldSchema.type) {
                    const actualType = typeof value;
                    if (actualType !== fieldSchema.type) {
                        errors.push(`Type mismatch for "${field}": expected ${fieldSchema.type}, got ${actualType}`);
                    }
                }
            }
        }
        catch (error) {
            warnings.push(`Schema validation error: ${error instanceof Error ? error.message : String(error)}`);
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }
    /**
     * Sanitize execution inputs
     */
    sanitizeInputs(inputs) {
        const sanitized = {};
        for (const [key, value] of Object.entries(inputs)) {
            if (typeof value === 'string') {
                sanitized[key] = this.sanitizeString(value);
            }
            else if (typeof value === 'object' && value !== null) {
                sanitized[key] = this.sanitizeObject(value);
            }
            else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
    /**
     * Sanitize a string value
     */
    sanitizeString(value) {
        // Remove potentially dangerous patterns
        return value
            .replace(/eval\s*\(/g, 'eval_blocked(')
            .replace(/exec\s*\(/g, 'exec_blocked(')
            .replace(/system\s*\(/g, 'system_blocked(')
            .replace(/`/g, '\\`');
    }
    /**
     * Sanitize an object recursively
     */
    sanitizeObject(obj) {
        if (typeof obj !== 'object' || obj === null) {
            return obj;
        }
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                sanitized[key] = this.sanitizeString(value);
            }
            else if (Array.isArray(value)) {
                sanitized[key] = value.map((item) => typeof item === 'string' ? this.sanitizeString(item) : item);
            }
            else if (typeof value === 'object' && value !== null) {
                sanitized[key] = this.sanitizeObject(value);
            }
            else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
    /**
     * Get configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Check if skill is in allowlist
     */
    isSkillAllowed(skillName) {
        if (this.config.skillAllowlist.length === 0) {
            return true;
        }
        return this.config.skillAllowlist.includes(skillName);
    }
}
exports.SafetyLayer = SafetyLayer;
//# sourceMappingURL=SafetyLayer.js.map