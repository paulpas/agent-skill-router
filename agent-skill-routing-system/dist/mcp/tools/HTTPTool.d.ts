import { BaseMCPTool, IMCPTool } from '../types.js';
/**
 * MCP Tool result
 */
interface ToolResult {
    success: boolean;
    output?: unknown;
    error?: string;
    latencyMs: number;
    metadata?: Record<string, unknown>;
}
/**
 * MCP Tool specification for LLM
 */
interface ToolSpec {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
}
/**
 * HTTP Tool for making HTTP requests
 */
export declare class HTTPTool extends BaseMCPTool implements IMCPTool {
    constructor(timeoutMs?: number);
    /**
     * Execute an HTTP request
     */
    execute(args: Record<string, unknown>): Promise<ToolResult>;
    /**
     * Get tool specification
     */
    getSpecification(): ToolSpec;
}
export {};
//# sourceMappingURL=HTTPTool.d.ts.map