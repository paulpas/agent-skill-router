import { ToolResult, ToolSpec } from '../core/types';
/**
 * Base interface for all MCP tools
 */
export interface IMCPTool {
    /**
     * Unique identifier for the tool
     */
    name: string;
    /**
     * Description of what the tool does
     */
    description: string;
    /**
     * Execute the tool with given arguments
     */
    execute(args: Record<string, unknown>): Promise<ToolResult>;
    /**
     * Set the code generation methodology for this tool
     */
    setMethodology(methodology: string): void;
    /**
     * Get the tool specification (for LLM)
     */
    getSpecification(): ToolSpec;
}
/**
 * Base implementation for MCP tools
 */
export declare abstract class BaseMCPTool implements IMCPTool {
    name: string;
    description: string;
    protected timeoutMs: number;
    constructor(name: string, description: string, timeoutMs?: number);
    /** Code generation methodology for AI agents (e.g., TDD instructions) */
    protected methodology: string;
    /**
     * Set the code generation methodology for this tool.
     * When set, the methodology is included in the tool specification
     * so AI agents see it as a system-level instruction.
     */
    setMethodology(methodology: string): void;
    /**
     * Validate arguments against expected schema
     */
    protected validateArgs(args: Record<string, unknown>, requiredKeys: string[]): void;
    /**
     * Wrap execution in timeout and error handling
     */
    protected withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T>;
    /**
     * Execute - must be implemented by subclasses
     */
    abstract execute(args: Record<string, unknown>): Promise<ToolResult>;
    /**
     * Get tool specification for LLM
     */
    getSpecification(): ToolSpec;
}
//# sourceMappingURL=types.d.ts.map