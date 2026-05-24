import { BaseMCPTool, IMCPTool } from '../types';
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
    /** Code generation methodology instructions for AI agents using this tool */
    methodology?: string;
}
/**
 * Shell Command Tool for executing shell commands
 */
export declare class ShellCommandTool extends BaseMCPTool implements IMCPTool {
    constructor(timeoutMs?: number);
    /**
     * Execute a shell command
     */
    execute(args: Record<string, unknown>): Promise<ToolResult>;
    /**
     * Execute a shell command with security validation
     */
    private executeCommand;
    /**
     * Get tool specification
     */
    getSpecification(): ToolSpec;
}
export {};
//# sourceMappingURL=ShellCommandTool.d.ts.map