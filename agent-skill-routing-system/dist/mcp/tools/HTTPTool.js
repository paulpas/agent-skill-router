"use strict";
// MCP Tool: HTTP Request Execution
Object.defineProperty(exports, "__esModule", { value: true });
exports.HTTPTool = void 0;
const types_1 = require("../types");
/**
 * HTTP Tool for making HTTP requests
 */
class HTTPTool extends types_1.BaseMCPTool {
    constructor(timeoutMs = 30000) {
        super('http_request', 'Make HTTP requests (GET, POST, PUT, DELETE, PATCH) with JSON payload support', timeoutMs);
    }
    /**
     * Execute an HTTP request
     */
    async execute(args) {
        const startTime = Date.now();
        try {
            this.validateArgs(args, ['url', 'method']);
            const url = String(args.url);
            const method = String(args.method).toUpperCase();
            const headers = (args.headers || {});
            const body = args.body;
            const options = {
                method,
                headers,
                ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
            };
            const response = await undiciFetch(url, options);
            const responseText = await response.text();
            let responseBody;
            try {
                responseBody = JSON.parse(responseText);
            }
            catch {
                responseBody = responseText;
            }
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return {
                success: true,
                output: {
                    status: response.status,
                    headers: Object.fromEntries(response.headers.entries()),
                    body: responseBody,
                },
                latencyMs: Date.now() - startTime,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                latencyMs: Date.now() - startTime,
            };
        }
    }
    /**
     * Get tool specification
     */
    getSpecification() {
        const spec = {
            name: this.name,
            description: this.description,
            parameters: {
                type: 'object',
                properties: {
                    url: {
                        type: 'string',
                        format: 'uri',
                        description: 'The HTTP URL to request',
                    },
                    method: {
                        type: 'string',
                        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
                        description: 'The HTTP method',
                    },
                    headers: {
                        type: 'object',
                        description: 'HTTP headers',
                    },
                    body: {
                        type: 'object',
                        description: 'Request body (for POST/PUT/PATCH)',
                    },
                },
                required: ['url', 'method'],
            },
        };
        if (this.methodology) {
            spec.methodology = this.methodology;
        }
        return spec;
    }
}
exports.HTTPTool = HTTPTool;
//# sourceMappingURL=HTTPTool.js.map