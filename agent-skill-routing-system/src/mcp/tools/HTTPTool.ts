// MCP Tool: HTTP Request Execution

import { BaseMCPTool, IMCPTool } from '../types.js';

// undici is a runtime dependency, not a type-only import
// This file requires undici at runtime
// Using type declaration file that comes with @types/node
declare function fetch(input: string, init?: unknown): Promise<{ ok: boolean; status: number; text(): Promise<string>; headers: { entries(): IterableIterator<[string, string]> } }>;

// Type declaration for undici's fetch when used directly
declare const undiciFetch: typeof fetch;

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
 * HTTP Tool for making HTTP requests
 */
export class HTTPTool extends BaseMCPTool implements IMCPTool {
  constructor(timeoutMs: number = 30000) {
    super(
      'http_request',
      'Make HTTP requests (GET, POST, PUT, DELETE, PATCH) with JSON payload support',
      timeoutMs
    );
  }

  /**
   * Execute an HTTP request
   */
  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      this.validateArgs(args, ['url', 'method']);

      const url = String(args.url);
      const method = String(args.method).toUpperCase();
      const headers = (args.headers || {}) as Record<string, string>;
      const body = args.body;

      const options: RequestInit = {
        method,
        headers,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      };

      const response = await undiciFetch(url, options);

      const responseText = await response.text();
      let responseBody: unknown;

      try {
        responseBody = JSON.parse(responseText);
      } catch {
        responseBody = responseText;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return {
        success: true,
        output: {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseBody,
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
            format: 'uri',
            description: 'The HTTP URL to request',
          },
          method: {
            type: 'string',
            enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
            description: 'The HTTP method',
          },
          headers: {
            type: 'object',
            description: 'HTTP headers',
          },
          body: {
            type: 'object',
            description: 'Request body (for POST/PUT/PATCH)',
          },
        },
        required: ['url', 'method'],
      },
    };
  }
}
