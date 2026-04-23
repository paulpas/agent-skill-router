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
 * Kubectl Tool for executing kubectl commands
 */
export declare class KubectlTool extends BaseMCPTool implements IMCPTool {
    constructor(timeoutMs?: number);
    /**
     * Execute a kubectl command
     */
    execute(args: Record<string, unknown>): Promise<ToolResult>;
    /**
     * Execute a kubectl command with security validation
     */
    private executeCommand;
    /**
     * Get tool specification
     */
    getSpecification(): ToolSpec;
}
export {};
//# sourceMappingURL=KubectlTool.d.ts.map