// MCP Tool Interface and Base Class

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
export abstract class BaseMCPTool implements IMCPTool {
  constructor(
    public name: string,
    public description: string,
    protected timeoutMs: number = 30000
  ) {}

  /** Code generation methodology for AI agents (e.g., TDD instructions) */
  protected methodology: string = '';

  /**
   * Set the code generation methodology for this tool.
   * When set, the methodology is included in the tool specification
   * so AI agents see it as a system-level instruction.
   */
  setMethodology(methodology: string): void {
    this.methodology = methodology;
  }

  /**
   * Validate arguments against expected schema
   */
  protected validateArgs(
    args: Record<string, unknown>,
    requiredKeys: string[]
  ): void {
    const missing = requiredKeys.filter((key) => !(key in args));
    if (missing.length > 0) {
      throw new Error(`Missing required arguments: ${missing.join(', ')}`);
    }
  }

  /**
   * Wrap execution in timeout and error handling
   */
  protected async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeoutMs)
      ),
    ]);
  }

  /**
   * Execute - must be implemented by subclasses
   */
  abstract execute(args: Record<string, unknown>): Promise<ToolResult>;

  /**
   * Get tool specification for LLM
   */
  getSpecification(): ToolSpec {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    };
  }
}
