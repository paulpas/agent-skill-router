// MCP Bridge - central abstraction for all MCP tools

import { IMCPTool } from './types';
import { ShellCommandTool } from './tools/ShellCommandTool';
import { FileTool } from './tools/FileTool';
import { HTTPTool } from './tools/HTTPTool';
import { KubectlTool } from './tools/KubectlTool';
import { LogFetchTool } from './tools/LogFetchTool';
import { SkillGenerationTool } from './tools/SkillGenerationTool';
import { ToolResult, ToolSpec } from '../core/types';
import { Logger } from '../observability/Logger';

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
export class MCPBridge {
  private tools: Map<string, IMCPTool> = new Map();
   private config: MCPBridgeConfig;
   private logger: Logger;

   constructor(config: Partial<MCPBridgeConfig> = {}) {
     this.logger = new Logger('MCPBridge', {
       level: 'info',
       includePayloads: false,
     });
      this.config = {
        enabledTools: [],
        disableTools: [],
        defaultTimeoutMs: 30000,
        methodology:
          'CODE GENERATION METHODOLOGY: Test-Driven Development (TDD)\n' +
          'Follow the RED-GREEN-REFACTOR cycle for ALL code:\n' +
          '- RED: Write a failing test before any implementation code.\n' +
          '- GREEN: Write minimal code to pass the test.\n' +
          '- REFACTOR: Clean up while keeping all tests green.\n' +
          '\n' +
          'REQUIREMENTS:\n' +
          '- Minimum 95% test coverage for all production code.\n' +
          '- Write isolated, deterministic unit tests with mocked external dependencies.\n' +
          '- Test edge cases (empty, boundary, error) before happy path.\n' +
          '- Run full test suite after every REFACTOR phase.\n' +
          '- Language-agnostic: applies to Python, TypeScript, Go, Rust, etc.\n' +
          '- Reference skill: test-driven-development (available via skill router)',
        ...(config || {}),
      };

     // Merge disableTools properly
     if (config.disableTools !== undefined) {
       this.config.disableTools = config.disableTools;
     }

     this.initializeTools();
   }

  /**
    * Initialize all configured tools
    */
   private initializeTools(): void {
     const enabledTools = this.config.enabledTools !== undefined && this.config.enabledTools.length > 0
       ? this.config.enabledTools
       : this.getDefaultEnabledTools();

     const disabledTools = new Set(this.config.disableTools || []);

     const toolFactories: Record<string, () => IMCPTool> = {
        shell: () => new ShellCommandTool(this.config.defaultTimeoutMs),
        file: () => new FileTool(this.config.defaultTimeoutMs),
        http: () => new HTTPTool(this.config.defaultTimeoutMs),
        kubectl: () => new KubectlTool(this.config.defaultTimeoutMs),
        log_fetch: () => new LogFetchTool(this.config.defaultTimeoutMs),
        generate_skill: () => new SkillGenerationTool(this.config.defaultTimeoutMs),
      };

     for (const [name, factory] of Object.entries(toolFactories)) {
       if (disabledTools.has(name)) {
         continue;
       }

       if (enabledTools.includes(name)) {
         try {
            const tool = factory();
            if (this.config.methodology) {
              tool.setMethodology(this.config.methodology);
            }
            this.tools.set(tool.name, tool);
         } catch (error) {
           this.logger.error(`Failed to initialize tool ${name}:`, {
             error: error instanceof Error ? error.message : String(error),
           });
         }
       }
     }
   }

   /**
    * Get default enabled tools based on environment configuration
    */
   private getDefaultEnabledTools(): string[] {
     const autoSkillEnabled = process.env.AUTO_SKILL_ENABLED !== 'false';
     const baseTools = ['shell', 'file', 'http', 'kubectl', 'log_fetch'];
     
    if (autoSkillEnabled) {
        return [...baseTools, 'generate_skill'];
      }
     
     return baseTools;
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
