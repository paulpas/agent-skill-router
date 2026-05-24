import { IMCPTool } from './types';
import { ToolResult, ToolSpec } from '../core/types';
/**
 * Configuration for MCP Bridge
 */
export interface MCPBridgeConfig {
    enabledTools?: string[];
    disableTools?: string[];
    defaultTimeoutMs: number;
    /** Code generation methodology instructions (e.g., TDD) for AI agents using MCP tools */
    methodology?: string;
}
/**
 * MCP Bridge - manages all MCP tools
 */
export declare class MCPBridge {
    private tools;
    private config;
    private logger;
    constructor(config?: Partial<MCPBridgeConfig>);
    /**
      * Initialize all configured tools
      */
    private initializeTools;
    /**
     * Get default enabled tools based on environment configuration
     */
    private getDefaultEnabledTools;
    /**
     * Get a tool by name
     */
    getTool(name: string): IMCPTool | undefined;
    /**
     * Execute a tool by name
     */
    executeTool(name: string, args: Record<string, unknown>): Promise<ToolResult>;
    /**
     * Get all available tools
     */
    getAllTools(): IMCPTool[];
    /**
     * Get tool specifications for LLM
     */
    getToolSpecs(): ToolSpec[];
    /**
     * Check if a tool is available
     */
    hasTool(name: string): boolean;
    /**
     * Register a custom tool
     */
    registerTool(tool: IMCPTool): void;
    /**
     * Unregister a tool
     */
    unregisterTool(name: string): void;
    /**
     * Get bridge statistics
     */
    getStats(): {
        totalTools: number;
        enabledTools: string[];
    };
}
//# sourceMappingURL=MCPBridge.d.ts.map