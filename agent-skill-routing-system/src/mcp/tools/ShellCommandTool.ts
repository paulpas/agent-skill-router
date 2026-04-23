// MCP Tool: Shell Command Execution

import { BaseMCPTool, IMCPTool } from '../types.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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
 * Shell Command Tool for executing shell commands
 */
export class ShellCommandTool extends BaseMCPTool implements IMCPTool {
  constructor(timeoutMs: number = 30000) {
    super(
      'run_shell_command',
      'Execute shell commands in a bash environment. Supports commands like ls, cd, cat, grep, find, npm, git, etc.',
      timeoutMs
    );
  }

  /**
   * Execute a shell command
   */
  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      this.validateArgs(args, ['command']);

      const command = String(args.command);
      const result = await this.executeCommand(command);

      return {
        success: true,
        output: result,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        latencyMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Execute a shell command with security validation
   */
  private async executeCommand(command: string): Promise<string> {
    // Security check for dangerous commands
    const dangerousPatterns = [
      /rm\s+-rf\s+/,
      /mkfs\s+/,
      /dd\s+/,
      /chmod\s+777\s+/,
      /useradd\s+/,
      /userdel\s+/,
      /passwd\s+/,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(command)) {
        throw new Error('Dangerous command detected and blocked');
      }
    }

    const { stdout, stderr } = await execAsync(command, {
      timeout: this.timeoutMs,
      maxBuffer: 1024 * 1024 * 10, // 10MB
    });

    if (stderr && !stderr.includes('warn') && !stderr.includes('Warning')) {
      throw new Error(stderr);
    }

    return stdout || stderr || 'Command executed successfully';
  }

  /**
   * Get tool specification
   */
  getSpecification(): ToolSpec {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'The shell command to execute',
          },
        },
        required: ['command'],
      },
    };
  }
}
