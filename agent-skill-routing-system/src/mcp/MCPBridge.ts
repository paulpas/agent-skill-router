// MCP Bridge - central abstraction for all MCP tools

import { IMCPTool, BaseMCPTool } from './types.js';
import { ShellCommandTool } from './tools/ShellCommandTool.js';
import { FileTool } from './tools/FileTool.js';
import { HTTPTool } from './tools/HTTPTool.js';
import { KubectlTool } from './tools/KubectlTool.js';
import { LogFetchTool } from './tools/LogFetchTool.js';
import type { ToolSpec, ToolResult } from '../core/types.js';

/**
 * Configuration for MCP Bridge
 */
export interface MCPBridgeConfig {
  enabledTools?: string[];
  disableTools?: string[];
  defaultTimeoutMs: number;
}

/**
 * MCP Bridge - manages all MCP tools
 */
export class MCPBridge {
  private tools: Map<string, IMCPTool> = new Map();
  private config: MCPBridgeConfig;

  constructor(config: Partial<MCPBridgeConfig> = {}) {
    this.config = {
      enabledTools: [],
      disableTools: [],
      defaultTimeoutMs: 30000,
      ...config,
    };

    this.initializeTools();
  }

  /**
   * Initialize all configured tools
   */
  private initializeTools(): void {
    const enabledTools = this.config.enabledTools.length > 0
      ? this.config.enabledTools
      : ['shell', 'file', 'http', 'kubectl', 'log_fetch'];

    const disabledTools = new Set(this.config.disableTools);

    const toolFactories: Record<string, () => IMCPTool> = {
      shell: () => new ShellCommandTool(this.config.defaultTimeoutMs),
      file: () => new FileTool(this.config.defaultTimeoutMs),
      http: () => new HTTPTool(this.config.defaultTimeoutMs),
      kubectl: () => new KubectlTool(this.config.defaultTimeoutMs),
      log_fetch: () => new LogFetchTool(this.config.defaultTimeoutMs),
    };

    for (const [name, factory] of Object.entries(toolFactories)) {
      if (disabledTools.has(name)) {
        continue;
      }

      if (enabledTools.includes(name)) {
        try {
          const tool = factory();
          this.tools.set(tool.name, tool);
        } catch (error) {
          console.error(`Failed to initialize tool ${name}:`, error);
        }
      }
    }
  }

  /**
   * Get a tool by name
   */
  getTool(name: string): IMCPTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Execute a tool by name
   */
  async executeTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        success: false,
        error: `Tool not found: ${name}`,
        latencyMs: 0,
      };
    }

    return tool.execute(args);
  }

  /**
   * Get all available tools
   */
  getAllTools(): IMCPTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tool specifications for LLM
   */
  getToolSpecs(): ToolSpec[] {
    return this.getAllTools().map((tool) => tool.getSpecification());
  }

  /**
   * Check if a tool is available
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Register a custom tool
   */
  registerTool(tool: IMCPTool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Unregister a tool
   */
  unregisterTool(name: string): void {
    this.tools.delete(name);
  }

  /**
   * Get bridge statistics
   */
  getStats(): {
    totalTools: number;
    enabledTools: string[];
  } {
    return {
      totalTools: this.tools.size,
      enabledTools: Array.from(this.tools.keys()),
    };
  }
}
