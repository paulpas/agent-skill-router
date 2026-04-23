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
 * Log Fetch Tool for reading log files
 */
export declare class LogFetchTool extends BaseMCPTool implements IMCPTool {
    constructor(timeoutMs?: number);
    /**
      * Execute log fetching
      */
    execute(args: Record<string, unknown>): Promise<ToolResult>;
    /**
     * Fetch log file content
     */
    private fetchLogs;
    /**
     * Get tool specification
     */
    getSpecification(): ToolSpec;
}
export {};
//# sourceMappingURL=LogFetchTool.d.ts.map