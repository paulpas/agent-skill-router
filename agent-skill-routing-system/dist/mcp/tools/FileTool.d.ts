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
 * File Tool for reading and writing files
 */
export declare class FileTool extends BaseMCPTool implements IMCPTool {
    private allowedDirectories;
    constructor(timeoutMs?: number);
    /**
     * Execute file operations
     */
    execute(args: Record<string, unknown>): Promise<ToolResult>;
    /**
     * Validate and resolve filepath
     */
    private validatePath;
    /**
     * Read file contents
     */
    private readFile;
    /**
     * Write file contents
     */
    private writeFile;
    /**
     * Append to file
     */
    private appendFile;
    /**
     * Check if file exists
     */
    private fileExists;
    /**
     * List directory contents
     */
    private listFiles;
    /**
     * Get tool specification
     */
    getSpecification(): ToolSpec;
}
export {};
//# sourceMappingURL=FileTool.d.ts.map