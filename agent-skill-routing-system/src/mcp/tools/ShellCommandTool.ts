// MCP Tool: Shell Command Execution

import { BaseMCPTool, IMCPTool } from '../types.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

      // Security: Validate command doesn't contain dangerous patterns
      this.validateCommand(command);

      // Execute the command
      const { stdout, stderr } = await this.withTimeout(
        execAsync(command, { maxBuffer: 1024 * 1024 * 10 }), // 10MB buffer
        this.timeoutMs
      );

      return {
        success: true,
        output: {
          stdout,
          stderr,
          exitCode: 0,
        },
        latencyMs: Date.now() - startTime,
        metadata: {
          commandLength: command.length,
        },
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
   * Validate command for security
   */
  private validateCommand(command: string): void {
    // Block dangerous commands
    const dangerousPatterns = [
      /rm\s+-rf\s+\/$/,
      /rm\s+-rf\s+\.\.$/,
      /sudo\s+/,
      /eval\s+/,
      /exec\s+\(/,
      /system\s+\(/,
      /base64\s+-d/, // Potential data exfiltration
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(command)) {
        throw new Error(`Dangerous command pattern detected: ${pattern.source}`);
      }
    }

    // Limit command length
    if (command.length > 1000) {
      throw new Error('Command length exceeds maximum of 1000 characters');
    }
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
