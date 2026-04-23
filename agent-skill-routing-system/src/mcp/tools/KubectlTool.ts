// MCP Tool: Kubectl Command Execution

import { BaseMCPTool } from '../types.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Kubectl Tool for executing Kubernetes commands
 */
export class KubectlTool extends BaseMCPTool {
  constructor(timeoutMs: number = 30000) {
    super(
      'kubectl',
      'Execute kubectl commands for Kubernetes cluster management',
      timeoutMs
    );
  }

  /**
   * Execute kubectl command
   */
  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      this.validateArgs(args, ['command']);

      const command = String(args.command);

      // Validate command
      this.validateKubectlCommand(command);

      // Check if kubectl is available
      await this.checkKubectlAvailable();

      // Execute kubectl command
      const fullCommand = `kubectl ${command}`;
      const { stdout, stderr } = await this.withTimeout(
        execAsync(fullCommand),
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
          command: fullCommand,
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
   * Validate kubectl command
   */
  private validateKubectlCommand(command: string): void {
    // Block dangerous operations
    const dangerousPatterns = [
      /kubectl\s+delete\s+(all|namespace|clusterrolebinding|clusterrole)\s+/,
      /kubectl\s+delete\s+-n\s+kube-system/,
      /kubectl\s+exec\s+-it/,
      /kubectl\s+run\s+--generator=/,
      /kubectl\s+create\s+serviceaccount\s+default/,
      /kubectl\s+create\s+clusterrolebinding\s+/,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(command)) {
        throw new Error(`Dangerous kubectl command pattern detected: ${pattern.source}`);
      }
    }

    // Limit command length
    if (command.length > 500) {
      throw new Error('kubectl command length exceeds maximum of 500 characters');
    }
  }

  /**
   * Check if kubectl is available
   */
  private async checkKubectlAvailable(): Promise<void> {
    try {
      const { execSync } = require('child_process');
      execSync('kubectl version --client', { stdio: 'ignore' });
    } catch {
      throw new Error('kubectl is not installed or not available in PATH');
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
            description: 'kubectl subcommand (e.g., "get pods", "apply -f config.yaml")',
          },
        },
        required: ['command'],
      },
    };
  }
}
