// MCP Tool: Log Fetching

import { BaseMCPTool, IMCPTool } from '../types.js';
import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';

/**
 * Log Fetch Tool for retrieving and parsing logs
 */
export class LogFetchTool extends BaseMCPTool implements IMCPTool {
  private allowedLogDirectories: string[] = [];

  constructor(timeoutMs: number = 30000) {
    super(
      'log_fetch',
      'Fetch and filter logs from files with support for common log formats',
      timeoutMs
    );

    // Configure allowed log directories
    this.allowedLogDirectories = [
      process.cwd(),
      path.join(process.cwd(), 'logs'),
      '/var/log', // System logs (if permissions allow)
    ];
  }

  /**
   * Fetch logs
   */
  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      this.validateArgs(args, ['pattern']);

      const pattern = String(args.pattern);
      const options = args.options || {};

      // Validate and resolve pattern
      const resolvedPattern = this.validatePattern(pattern);

      // Fetch logs
      const matches = await this.fetchLogs(resolvedPattern, options as LogFetchOptions);

      return {
        success: true,
        output: matches,
        latencyMs: Date.now() - startTime,
        metadata: {
          pattern,
          matchCount: matches.length,
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
   * Validate log pattern
   */
  private validatePattern(pattern: string): string {
    // Check for path traversal
    if (pattern.includes('..') || pattern.startsWith('/')) {
      throw new Error('Path traversal not allowed');
    }

    // Resolve pattern
    const resolvedPattern = path.resolve(pattern);

    // Check if directory is allowed
    const isAllowed = this.allowedLogDirectories.some((dir) =>
      resolvedPattern.startsWith(dir)
    );

    if (!isAllowed) {
      throw new Error(`Access to log directory not allowed: ${path.dirname(resolvedPattern)}`);
    }

    return resolvedPattern;
  }

  /**
   * Fetch logs matching pattern
   */
  private async fetchLogs(
    pattern: string,
    options: LogFetchOptions
  ): Promise<LogMatch[]> {
    // Find all matching files
    const files = await glob(pattern);

    const matches: LogMatch[] = [];

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (this.matchesFilters(line, options)) {
            matches.push({
              file,
              line: i + 1,
              content: line,
              timestamp: this.extractTimestamp(line),
            });
          }
        }
      } catch (error) {
        // Skip files that can't be read
        console.warn(`Failed to read log file ${file}:`, error);
      }
    }

    // Sort by timestamp if available
    matches.sort((a, b) => {
      if (a.timestamp && b.timestamp) {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      }
      return 0;
    });

    // Limit results
    return matches.slice(0, options.maxResults || 1000);
  }

  /**
   * Check if line matches filter criteria
   */
  private matchesFilters(line: string, options: LogFetchOptions): boolean {
    // Filter by severity
    if (options.level) {
      const lineLevel = this.extractLevel(line);
      if (lineLevel !== options.level) {
        return false;
      }
    }

    // Filter by text match
    if (options.search) {
      if (!line.toLowerCase().includes(options.search.toLowerCase())) {
        return false;
      }
    }

    // Filter by regex
    if (options.regex) {
      try {
        const regex = new RegExp(options.regex);
        if (!regex.test(line)) {
          return false;
        }
      } catch {
        // Invalid regex, skip filter
      }
    }

    return true;
  }

  /**
   * Extract timestamp from log line
   */
  private extractTimestamp(line: string): string | null {
    // Try common timestamp formats
    const patterns = [
      /^\[(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2})/, // [2024-01-01 12:00:00
      /^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2})/, // 2024-01-01 12:00:00
      /^\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/, // [2024-01-01T12:00:00
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Extract log level from line
   */
  private extractLevel(line: string): string | null {
    const levels = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
    for (const level of levels) {
      if (new RegExp(`\\b${level}\\b`).test(line)) {
        return level.toLowerCase();
      }
    }
    return null;
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
          pattern: {
            type: 'string',
            description: 'Glob pattern for log files (e.g., "logs/*.log")',
          },
          options: {
            type: 'object',
            properties: {
              level: {
                type: 'string',
                enum: ['debug', 'info', 'warn', 'error'],
                description: 'Filter by log level',
              },
              search: {
                type: 'string',
                description: 'Search for text in log lines',
              },
              regex: {
                type: 'string',
                description: 'Regular expression to match',
              },
              maxResults: {
                type: 'number',
                description: 'Maximum number of results to return',
              },
            },
          },
        },
        required: ['pattern'],
      },
    };
  }
}

/**
 * Log fetch options
 */
interface LogFetchOptions {
  level?: 'debug' | 'info' | 'warn' | 'error';
  search?: string;
  regex?: string;
  maxResults?: number;
}

/**
 * Log match result
 */
interface LogMatch {
  file: string;
  line: number;
  content: string;
  timestamp: string | null;
}
