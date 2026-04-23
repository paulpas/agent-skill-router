// MCP Tool: File Operations

import { BaseMCPTool, IMCPTool } from '../types.js';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * File Tool for reading and writing files
 */
export class FileTool extends BaseMCPTool implements IMCPTool {
  private allowedDirectories: string[] = [];

  constructor(timeoutMs: number = 30000) {
    super(
      'file_operations',
      'Read and write files with security validations',
      timeoutMs
    );

    // Configure allowed directories for security
    this.allowedDirectories = [
      process.cwd(),
      path.join(process.cwd(), 'src'),
      path.join(process.cwd(), 'tests'),
    ];
  }

  /**
   * Execute file operations
   */
  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      this.validateArgs(args, ['operation', 'filepath']);

      const operation = String(args.operation);
      const filepath = String(args.filepath);

      // Validate filepath
      const resolvedPath = this.validatePath(filepath);

      // Execute operation
      let output: unknown;

      switch (operation) {
        case 'read':
          output = await this.readFile(resolvedPath);
          break;

        case 'write':
          this.validateArgs(args, ['content']);
          const content = String(args.content);
          output = await this.writeFile(resolvedPath, content);
          break;

        case 'append':
          this.validateArgs(args, ['content']);
          const appendContent = String(args.content);
          output = await this.appendFile(resolvedPath, appendContent);
          break;

        case 'exists':
          output = await this.fileExists(resolvedPath);
          break;

        case 'list':
          output = await this.listFiles(resolvedPath);
          break;

        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      return {
        success: true,
        output,
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
   * Validate and resolve filepath
   */
  private validatePath(filepath: string): string {
    // Prevent path traversal
    if (filepath.includes('..') || filepath.startsWith('/')) {
      throw new Error('Path traversal not allowed');
    }

    // Check if directory is allowed
    const resolvedPath = path.resolve(filepath);

    const isAllowed = this.allowedDirectories.some((dir) =>
      resolvedPath.startsWith(dir)
    );

    if (!isAllowed) {
      throw new Error(`Access to directory not allowed: ${path.dirname(resolvedPath)}`);
    }

    return resolvedPath;
  }

  /**
   * Read file contents
   */
  private async readFile(filepath: string): Promise<string> {
    try {
      return await fs.readFile(filepath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Write file contents
   */
  private async writeFile(filepath: string, content: string): Promise<void> {
    try {
      await fs.writeFile(filepath, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to write file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Append to file
   */
  private async appendFile(filepath: string, content: string): Promise<void> {
    try {
      await fs.appendFile(filepath, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to append to file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if file exists
   */
  private async fileExists(filepath: string): Promise<boolean> {
    try {
      await fs.access(filepath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List directory contents
   */
  private async listFiles(dirpath: string): Promise<string[]> {
    try {
      return await fs.readdir(dirpath);
    } catch (error) {
      throw new Error(`Failed to list directory: ${error instanceof Error ? error.message : String(error)}`);
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
          operation: {
            type: 'string',
            enum: ['read', 'write', 'append', 'exists', 'list'],
            description: 'The file operation to perform',
          },
          filepath: {
            type: 'string',
            description: 'The file path',
          },
          content: {
            type: 'string',
            description: 'Content to write (for write/append operations)',
          },
        },
        required: ['operation', 'filepath'],
      },
    };
  }
}
