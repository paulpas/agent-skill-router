// MCP Tool: Kubectl Command Execution

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
 * Kubectl Tool for executing kubectl commands
 */
export class KubectlTool extends BaseMCPTool implements IMCPTool {
  constructor(timeoutMs: number = 30000) {
    super(
      'run_kubectl_command',
      'Execute kubectl commands for Kubernetes cluster management. Supports commands like get, describe, logs, apply, delete, etc.',
      timeoutMs
    );
  }

  /**
   * Execute a kubectl command
   */
  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      this.validateArgs(args, ['command']);

      const command = String(args.command);
      const fullCommand = `kubectl ${command}`;
      const result = await this.executeCommand(fullCommand);

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
   * Execute a kubectl command with security validation
   */
  private async executeCommand(command: string): Promise<string> {
    // Security check for dangerous operations
    const dangerousPatterns = [
      /kubectl\s+run\s+.*--generator=run-pod\/v1/,
      /kubectl\s+delete\s+--all/,
      /kubectl\s+create\s+serviceaccount\s+.*--cluster-role=cluster-admin/,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(command)) {
        throw new Error('Dangerous kubectl command detected and blocked');
      }
    }

    const { stdout, stderr } = await execAsync(command, {
      timeout: this.timeoutMs,
      maxBuffer: 1024 * 1024 * 10,
    });

    if (stderr && stderr.includes('Error')) {
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
            description: 'The kubectl subcommand to execute (e.g., "get pods", "describe node node-1")',
          },
        },
        required: ['command'],
      },
    };
  }
}
