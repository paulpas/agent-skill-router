// MCP Tool: HTTP Requests

import { BaseMCPTool } from '../types.js';

/**
 * HTTP Tool for making HTTP requests
 */
export class HTTPTool extends BaseMCPTool {
  constructor(timeoutMs: number = 30000) {
    super(
      'http_request',
      'Make HTTP/HTTPS requests with method, headers, and body support',
      timeoutMs
    );
  }

  /**
   * Execute HTTP request
   */
  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      this.validateArgs(args, ['url']);

      const url = String(args.url);
      const method = String(args.method || 'GET').toUpperCase();
      const headers = args.headers || {};
      const body = args.body;

      // Validate URL
      this.validateUrl(url);

      // Make request
      const response = await this.fetchWithTimeout(url, {
        method,
        headers: headers as Record<string, string>,
        body: body ? JSON.stringify(body) : undefined,
        timeout: this.timeoutMs,
      });

      return {
        success: true,
        output: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: response.ok ? await response.text() : undefined,
        },
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
   * Validate URL for security
   */
  private validateUrl(url: string): void {
    let parsedUrl: URL;

    try {
      parsedUrl = new URL(url);
    } catch {
      throw new Error('Invalid URL format');
    }

    // Check protocol
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error(`Protocol ${parsedUrl.protocol} not allowed`);
    }

    // Check for dangerous host patterns
    const hostname = parsedUrl.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      // Only allow localhost for development
      if (process.env.NODE_ENV !== 'development') {
        throw new Error('Localhost access not allowed in production');
      }
    }

    // Block private IP ranges (in production)
    if (process.env.NODE_ENV !== 'development') {
      if (this.isPrivateIP(hostname)) {
        throw new Error('Private IP access not allowed in production');
      }
    }
  }

  /**
   * Check if hostname resolves to private IP
   */
  private isPrivateIP(hostname: string): boolean {
    // In production, use DNS resolution to check
    // For now, block known private patterns
    return (
      hostname.startsWith('10.') ||
      hostname.startsWith('172.') ||
      hostname.startsWith('192.168.') ||
      hostname === 'localhost' ||
      hostname === '127.0.0.1'
    );
  }

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit & { timeout?: number }
  ): Promise<Response> {
    const { timeout = 30000, ...fetchOptions } = options;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
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
          url: {
            type: 'string',
            description: 'The URL to request',
          },
          method: {
            type: 'string',
            enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
            description: 'HTTP method (default: GET)',
          },
          headers: {
            type: 'object',
            description: 'Request headers',
          },
          body: {
            type: 'object',
            description: 'Request body (for POST/PUT/PATCH)',
          },
        },
        required: ['url'],
      },
    };
  }
}
