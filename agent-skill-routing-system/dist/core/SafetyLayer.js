"use strict";
// Safety Layer - input validation, prompt injection filtering, skill allowlisting
Object.defineProperty(exports, "__esModule", { value: true });
exports.SafetyLayer = void 0;
/**
 * Whether to run in strict mode: block on any single injection signal.
 * Set SAFETY_STRICT=true to opt in. Default is permissive (require 2+ signals).
 */
const SAFETY_STRICT = process.env.SAFETY_STRICT === 'true';
/**
 * Minimum number of distinct injection signals required to block a request.
 * In strict mode this is 1; in default mode it is 2.
 */
const BLOCK_THRESHOLD = SAFETY_STRICT ? 1 : 2;
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
            maxTaskLength: 5000,
            blockCategories: [],
            ...config,
        };
    }
    /**
     * Validate a routing request
     */
    async validateRouteRequest(request) {
        if (!request.task || request.task.trim().length === 0) {
            return {
                isSafe: false,
                riskLevel: 'critical',
                flags: ['empty-task'],
                errorMessage: 'Task cannot be empty',
            };
        }
        // Reject queries shorter than 3 characters (too ambiguous for routing)
        const MIN_QUERY_LENGTH = 3;
        if (request.task.trim().length < MIN_QUERY_LENGTH) {
            return {
                isSafe: false,
                riskLevel: 'high',
                flags: ['query-too-short'],
                errorMessage: `Query too short (min ${MIN_QUERY_LENGTH} characters)`,
            };
        }
        // Reject queries consisting entirely of stop words (no domain-specific signal)
        const STOP_WORDS = new Set([
            'the', 'a', 'an', 'is', 'it', 'of', 'to', 'in', 'and', 'or', 'for', 'on', 'with', 'as', 'at', 'by',
            'this', 'that', 'these', 'those', 'what', 'which', 'who', 'how', 'why', 'where', 'when',
            'do', 'does', 'did', 'has', 'have', 'had', 'not', 'no', 'yes', 'so', 'if', 'then', 'than', 'but',
            'because', 'about', 'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further', 'once',
            'here', 'there', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such',
            'only', 'own', 'same', 'too', 'very', 'just', 'also', 'now', 'will', 'can', 'may', 'might',
            'shall', 'should', 'would', 'could', 'please', 'help', 'need', 'want', 'like', 'use',
            'me', 'my', 'your', 'you', 'he', 'him', 'his', 'she', 'her', 'we', 'us', 'our', 'they', 'them', 'their',
        ]);
        const queryWords = request.task.trim().toLowerCase().split(/\s+/);
        const allStopWords = queryWords.length > 0 && queryWords.every((w) => STOP_WORDS.has(w));
        // Only apply this filter to short queries (<=5 words) — longer all-stop-word queries
        // are unlikely in practice and could be legitimate (e.g. "what is this and how does it work")
        if (allStopWords && queryWords.length <= 5) {
            return {
                isSafe: false,
                riskLevel: 'high',
                flags: ['query-only-stop-words'],
                errorMessage: 'Query contains only common words, no domain-specific terms to route on',
            };
        }
        if (request.task.length > this.config.maxTaskLength) {
            return {
                isSafe: false,
                riskLevel: 'high',
                flags: ['task-too-long'],
                errorMessage: `Task exceeds maximum length of ${this.config.maxTaskLength}`,
            };
        }
        if (this.config.enablePromptInjectionFilter) {
            const injectionResult = this.checkPromptInjection(request.task);
            if (!injectionResult.isSafe) {
                return injectionResult;
            }
        }
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
        if (!request.task || request.task.trim().length === 0) {
            return {
                isSafe: false,
                riskLevel: 'critical',
                flags: ['empty-task'],
                errorMessage: 'Task cannot be empty',
            };
        }
        if (request.task.length > this.config.maxTaskLength) {
            return {
                isSafe: false,
                riskLevel: 'high',
                flags: ['task-too-long'],
                errorMessage: `Task exceeds maximum length of ${this.config.maxTaskLength}`,
            };
        }
        if (this.config.enablePromptInjectionFilter) {
            const injectionResult = this.checkPromptInjection(request.task);
            if (!injectionResult.isSafe) {
                return injectionResult;
            }
        }
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
     * Check for prompt injection attempts.
     *
     * Design: patterns are categorized by severity:
     *   - CRITICAL → block on a single match (SQL injection, XSS, command injection, etc.)
     *   - HIGH     → block on 2+ matches (prompt hijacking attempts)
     *   - MEDIUM   → warn only, allow through (ambiguous signals)
     *
     * This prevents single-pattern adversarial inputs from bypassing the filter
     * while keeping the existing 2-signal threshold for lower-severity patterns.
     */
    checkPromptInjection(task) {
        const flags = [];
        const criticalFlags = [];
        // ── Category 1: SQL Injection (CRITICAL) ──────────────────────────────
        const sqlPatterns = [
            /'\s*(OR|AND)\s+['"]?\s*\d+\s*['"]?\s*=\s*['"]?\s*\d+/i, // ' OR 1=1
            /(UNION|EXCEPT|INTERSECT)\s+(ALL\s+)?SELECT\s+/i, // UNION SELECT
            /;\s*(DROP|DELETE|TRUNCATE|ALTER|EXEC|EXECUTE)\s+/i, // ; DROP TABLE
            /(SELECT|INSERT|UPDATE|DELETE)\s+.*\s+FROM\s+.*\s+WHERE\s+/i, // SQL DML with WHERE
            /sleep\s*\(\s*\d{2,}\s*\)/i, // SQL timing: SLEEP(5)
            /pg_sleep\s*\(\s*\d+\s*\)/i, // PostgreSQL: pg_sleep(5)
            /'\s*;.*--\s*$/m, // SQL comment injection
        ];
        for (const pattern of sqlPatterns) {
            if (pattern.test(task)) {
                criticalFlags.push('sql-injection');
                break;
            }
        }
        // ── Category 2: XSS / HTML Injection (CRITICAL) ──────────────────────
        const xssPatterns = [
            /<script[\s>]/i, // <script> tag
            /javascript\s*:\s*(alert|confirm|prompt)\s*\(/i, // javascript:alert(
            /\bon(error|load|click|mouse|key|submit|focus|blur|change)\s*=/i, // onerror=, onload=
            /<iframe[\s>]/i, // <iframe> tag
            /<img\s+[^>]*\bonerror\s*=/i, // <img onerror=
            /expression\s*\(\s*[a-z]/i, // CSS expression()
        ];
        for (const pattern of xssPatterns) {
            if (pattern.test(task)) {
                criticalFlags.push('xss-injection');
                break;
            }
        }
        // ── Category 3: Path Traversal (CRITICAL) ────────────────────────────
        const pathPatterns = [
            /\.\.\/\.\.\/\.\.\/\.\.\//, // ../../../../
            /\.\.\\\.\.\\\.\.\\\.\.\\/, // ..\..\..\..\
            /%2e%2e%2f%2e%2e%2f/, // URL-encoded ../
            /%2e%2e%5c%2e%2e%5c/, // URL-encoded ..\
            /\0/, // Null byte injection
        ];
        for (const pattern of pathPatterns) {
            if (pattern.test(task)) {
                criticalFlags.push('path-traversal');
                break;
            }
        }
        // ── Category 4: Credential harvesting (CRITICAL) ──────────────────────
        const harvestPatterns = [
            /\b(reveal|output|print|show|send|leak)\s+(your\s+)?(api\s*key|password|secret|credentials?|token)/i,
            /verify\s+(your|the)\s+(password|credentials|api\s*key|secret|token)/i,
            /what\s+is\s+your\s+(api\s*key|password|secret|token)/i,
        ];
        for (const pattern of harvestPatterns) {
            if (pattern.test(task)) {
                criticalFlags.push('potential-credential-harvesting');
                break;
            }
        }
        // ── Category 5: Active command execution (CRITICAL) ────────────────────
        const commandPatterns = [
            /`[^`]{1,200}`/, // Backtick command: `rm -rf /`
            /\$\([^)]{1,200}\)/, // $(command) substitution
            /\|\s*(sh|bash|zsh)\s*$/, // Pipe-to-shell: ... | sh
            /&&\s*(rm|mkfs|dd|wget|curl)\b/i, // Chained destructive commands
        ];
        for (const pattern of commandPatterns) {
            if (pattern.test(task)) {
                criticalFlags.push('potential-command-injection');
                break;
            }
        }
        // ── Category 6: Prompt hijacking (HIGH) ────────────────────────────────
        const hijackPatterns = [
            /ignore\s+(all\s+)?previous\s+instructions/i,
            /disregard\s+(all\s+)?previous\s+instructions/i,
            /you\s+are\s+now\s+(a|an)\s+\w+\s*(mode|ai|bot|assistant)?/i,
            /your\s+new\s+(instructions?|role|task|system)\s+(is|are)/i,
            /\b(override|bypass)\s+(system\s+prompt|safety\s+filter|content\s+filter)/i,
            /pretend\s+(you\s+have\s+no|there\s+are\s+no)\s+(restrictions?|limits?|filters?)/i,
        ];
        for (const pattern of hijackPatterns) {
            if (pattern.test(task)) {
                flags.push('potential-injection');
                break;
            }
        }
        // ── Category 7: Prompt leak / system prompt extraction (HIGH) ──────────
        const leakPatterns = [
            /(print|output|show|reveal|display|copy|repeat|echo)\s+(your|the)\s+(system\s+)?(prompt|instructions?)/i,
            /(what|how)\s+(are|is)\s+(your|the)\s+(system\s+)?(prompt|instructions?)/i,
            /output\s+(your|the)\s+(entire|full|complete)\s+(system\s+)?prompt/i,
        ];
        for (const pattern of leakPatterns) {
            if (pattern.test(task)) {
                flags.push('potential-prompt-leak');
                break;
            }
        }
        // ── Decision ─────────────────────────────────────────────────────────────
        // CRITICAL patterns → block immediately (single match is enough)
        if (criticalFlags.length > 0) {
            return {
                isSafe: false,
                riskLevel: this.determineRiskLevel([...criticalFlags, ...flags]),
                flags: [...criticalFlags, ...flags],
                errorMessage: 'Potential security threat detected',
            };
        }
        // HIGH patterns → block on 2+ matches (existing behavior)
        if (flags.length >= BLOCK_THRESHOLD) {
            return {
                isSafe: false,
                riskLevel: this.determineRiskLevel(flags),
                flags,
                errorMessage: 'Potential security threat detected',
            };
        }
        // Single HIGH signal → warn but allow through
        if (flags.length === 1) {
            console.warn(`[SafetyLayer] Low-confidence injection signal detected (${flags.join(', ')}). ` +
                `Allowing request. Set SAFETY_STRICT=true to block on single signals.`);
            return { isSafe: true, riskLevel: 'medium', flags };
        }
        // No signals → safe
        return { isSafe: true, riskLevel: 'low', flags: [] };
    }
    /**
     * Determine risk level based on flags
     */
    determineRiskLevel(flags) {
        const criticalFlags = [
            'sql-injection',
            'xss-injection',
            'path-traversal',
            'potential-command-injection',
            'potential-credential-harvesting',
        ];
        const highFlags = [
            'potential-injection',
            'potential-prompt-leak',
        ];
        for (const flag of flags) {
            if (criticalFlags.includes(flag))
                return 'critical';
        }
        for (const flag of flags) {
            if (highFlags.includes(flag))
                return 'high';
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
            if (typeof inputSchema !== 'object' || inputSchema === null) {
                warnings.push('Invalid input schema');
                return { isValid: true, errors, warnings };
            }
            const schema = inputSchema;
            const properties = schema.properties || {};
            const required = schema.required || [];
            for (const field of required) {
                if (inputs[field] === undefined) {
                    errors.push(`Missing required field: ${field}`);
                }
            }
            for (const [field, value] of Object.entries(inputs)) {
                const fieldSchema = properties[field];
                if (fieldSchema && typeof fieldSchema === 'object' && 'type' in fieldSchema) {
                    const fieldSchemaTyped = fieldSchema;
                    const actualType = typeof value;
                    if (actualType !== fieldSchemaTyped.type) {
                        errors.push(`Type mismatch for "${field}": expected ${fieldSchemaTyped.type}, got ${actualType}`);
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