"use strict";
// MCP Tool Interface and Base Class
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseMCPTool = void 0;
/**
 * Base implementation for MCP tools
 */
class BaseMCPTool {
    name;
    description;
    timeoutMs;
    constructor(name, description, timeoutMs = 30000) {
        this.name = name;
        this.description = description;
        this.timeoutMs = timeoutMs;
    }
    /**
     * Validate arguments against expected schema
     */
    validateArgs(args, requiredKeys) {
        const missing = requiredKeys.filter((key) => !(key in args));
        if (missing.length > 0) {
            throw new Error(`Missing required arguments: ${missing.join(', ')}`);
        }
    }
    /**
     * Wrap execution in timeout and error handling
     */
    async withTimeout(promise, timeoutMs) {
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeoutMs)),
        ]);
    }
    /**
     * Get tool specification for LLM
     */
    getSpecification() {
        return {
            name: this.name,
            description: this.description,
            parameters: {
                type: 'object',
                properties: {},
                required: [],
            },
        };
    }
}
exports.BaseMCPTool = BaseMCPTool;
//# sourceMappingURL=types.js.map