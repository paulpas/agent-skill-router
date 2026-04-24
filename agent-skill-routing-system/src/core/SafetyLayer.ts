// Safety Layer - input validation, prompt injection filtering, skill allowlisting

import type { RouteRequest, ExecuteRequest } from '../core/types.js';

/**
 * Whether to run in strict mode: block on any single injection signal.
 * Set SAFETY_STRICT=true to opt in. Default is permissive (require 2+ signals).
 */
const SAFETY_STRICT = process.env.SAFETY_STRICT === 'true';

/**
 * Minimum number of distinct injection signals required to block a request.
 * In strict mode this is 1; in default mode it is 2.
 */
const BLOCK_THRESHOLD = SAFETY_STRICT ? 1 : 2;

/**
 * Configuration for the safety layer
 */
export interface SafetyLayerConfig {
  enablePromptInjectionFilter: boolean;
  requireSchemaValidation: boolean;
  skillAllowlist: string[];
  maxTaskLength: number;
  blockCategories: string[];
}

/**
 * Security risk level
 */
export type SecurityRiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Security result
 */
export interface SecurityResult {
  isSafe: boolean;
  riskLevel: SecurityRiskLevel;
  flags: string[];
  errorMessage?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Safety layer for input validation and security
 */
export class SafetyLayer {
  private config: SafetyLayerConfig;

  constructor(config: Partial<SafetyLayerConfig> = {}) {
    this.config = {
      enablePromptInjectionFilter: true,
      requireSchemaValidation: true,
      skillAllowlist: [],
      maxTaskLength: 10000,
      blockCategories: [],
      ...config,
    };
  }

  /**
   * Validate a routing request
   */
  async validateRouteRequest(
    request: RouteRequest
  ): Promise<SecurityResult> {
    if (!request.task || request.task.trim().length === 0) {
      return {
        isSafe: false,
        riskLevel: 'critical',
        flags: ['empty-task'],
        errorMessage: 'Task cannot be empty',
      };
    }

    if (request.task.length > this.config.maxTaskLength) {
      return {
        isSafe: false,
        riskLevel: 'high',
        flags: ['task-too-long'],
        errorMessage: `Task exceeds maximum length of ${this.config.maxTaskLength}`,
      };
    }

    if (this.config.enablePromptInjectionFilter) {
      const injectionResult = this.checkPromptInjection(request.task);
      if (!injectionResult.isSafe) {
        return injectionResult;
      }
    }

    if (this.config.skillAllowlist.length > 0 && request.constraints?.categories) {
      const allowedCategories = new Set(this.config.skillAllowlist);
      const requestedCategories = new Set(request.constraints.categories);

      for (const cat of requestedCategories) {
        if (!allowedCategories.has(cat)) {
          return {
            isSafe: false,
            riskLevel: 'high',
            flags: ['category-not-allowed'],
            errorMessage: `Category "${cat}" is not in the allowlist`,
          };
        }
      }
    }

    return {
      isSafe: true,
      riskLevel: 'low',
      flags: [],
    };
  }

  /**
   * Validate an execute request
   */
  async validateExecuteRequest(
    request: ExecuteRequest
  ): Promise<SecurityResult> {
    if (!request.task || request.task.trim().length === 0) {
      return {
        isSafe: false,
        riskLevel: 'critical',
        flags: ['empty-task'],
        errorMessage: 'Task cannot be empty',
      };
    }

    if (request.task.length > this.config.maxTaskLength) {
      return {
        isSafe: false,
        riskLevel: 'high',
        flags: ['task-too-long'],
        errorMessage: `Task exceeds maximum length of ${this.config.maxTaskLength}`,
      };
    }

    if (this.config.enablePromptInjectionFilter) {
      const injectionResult = this.checkPromptInjection(request.task);
      if (!injectionResult.isSafe) {
        return injectionResult;
      }
    }

    if (
      this.config.skillAllowlist.length > 0 &&
      request.skills &&
      request.skills.length > 0
    ) {
      const allowedSkills = new Set(this.config.skillAllowlist);
      for (const skill of request.skills) {
        if (!allowedSkills.has(skill)) {
          return {
            isSafe: false,
            riskLevel: 'high',
            flags: ['skill-not-allowed'],
            errorMessage: `Skill "${skill}" is not in the allowlist`,
          };
        }
      }
    }

    return {
      isSafe: true,
      riskLevel: 'low',
      flags: [],
    };
  }

  /**
   * Check for prompt injection attempts.
   *
   * Design: collect signals from three independent categories, then decide:
   *   - 0 signals  → safe
   *   - 1 signal   → warn (log), but allow through (unless SAFETY_STRICT=true)
   *   - 2+ signals → block
   *
   * Patterns are deliberately high-confidence to avoid false positives on
   * normal developer task descriptions like:
   *   "review code for security issues and check for vulnerabilities"
   *   "use dependency injection in this service"
   *   "run shell script to deploy"
   */
  private checkPromptInjection(task: string): SecurityResult {
    const flags: string[] = [];

    // ── Category 1: Prompt hijacking ────────────────────────────────────────
    // Must clearly attempt to override AI instructions, not just describe a task.
    const hijackPatterns = [
      // "ignore all previous instructions", "disregard prior instructions"
      /ignore\s+(all\s+)?previous\s+instructions/i,
      /disregard\s+(all\s+)?previous\s+instructions/i,
      // "you are now a different AI / you are now in DAN mode"
      /you\s+are\s+now\s+(a|an)\s+\w+\s*(mode|ai|bot|assistant)?/i,
      // "your new instructions are" / "your new role is"
      /your\s+new\s+(instructions?|role|task|system)\s+(is|are)/i,
      // "override system prompt" / "bypass safety"
      /\b(override|bypass)\s+(system\s+prompt|safety\s+filter|content\s+filter)/i,
      // "pretend you have no restrictions"
      /pretend\s+(you\s+have\s+no|there\s+are\s+no)\s+(restrictions?|limits?|filters?)/i,
    ];

    for (const pattern of hijackPatterns) {
      if (pattern.test(task)) {
        flags.push('potential-injection');
        break;
      }
    }

    // ── Category 2: Active command execution ────────────────────────────────
    // Shell metacharacters that appear in an execution context, not text discussion.
    const commandPatterns = [
      /`[^`]{1,200}`/,          // Backtick command substitution: `rm -rf /`
      /\$\([^)]{1,200}\)/,      // $(command) substitution
      /\|\s*(sh|bash|zsh)\s*$/, // Pipe-to-shell at end of string: ... | sh
      /&&\s*(rm|mkfs|dd|wget|curl)\b/i, // Chained destructive/download commands
    ];

    for (const pattern of commandPatterns) {
      if (pattern.test(task)) {
        flags.push('potential-command-injection');
        break;
      }
    }

    // ── Category 3: Credential harvesting ───────────────────────────────────
    // Asking the AI to reveal or confirm secrets — not just mentioning security.
    const harvestPatterns = [
      /\b(reveal|output|print|show|send|leak)\s+(your\s+)?(api\s*key|password|secret|credentials?|token)/i,
      /verify\s+(your|the)\s+(password|credentials|api\s*key|secret|token)/i,
      /what\s+is\s+your\s+(api\s*key|password|secret|token)/i,
    ];

    for (const pattern of harvestPatterns) {
      if (pattern.test(task)) {
        flags.push('potential-credential-harvesting');
        break;
      }
    }

    // ── Decision ─────────────────────────────────────────────────────────────
    if (flags.length === 0) {
      return { isSafe: true, riskLevel: 'low', flags: [] };
    }

    if (flags.length < BLOCK_THRESHOLD) {
      // Single signal: warn but allow through
      console.warn(
        `[SafetyLayer] Low-confidence injection signal detected (${flags.join(', ')}). ` +
        `Allowing request. Set SAFETY_STRICT=true to block on single signals.`
      );
      return { isSafe: true, riskLevel: 'medium', flags };
    }

    // Multiple signals (or strict mode with 1+): block
    return {
      isSafe: false,
      riskLevel: this.determineRiskLevel(flags),
      flags,
      errorMessage: 'Potential security threat detected',
    };
  }

  /**
   * Determine risk level based on flags
   */
  private determineRiskLevel(flags: string[]): SecurityRiskLevel {
    const criticalFlags = [
      'potential-command-injection',
      'potential-credential-harvesting',
    ];

    const highFlags = [
      'potential-injection',
    ];

    for (const flag of flags) {
      if (criticalFlags.includes(flag)) return 'critical';
    }

    for (const flag of flags) {
      if (highFlags.includes(flag)) return 'high';
    }

    return 'medium';
  }

  /**
   * Validate schema compatibility between skill input and execution inputs
   */
  validateSchema(
    _skillName: string,
    inputSchema: unknown,
    inputs: Record<string, unknown>
  ): ValidationResult {
    if (!this.config.requireSchemaValidation) {
      return { isValid: true, errors: [], warnings: [] };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      if (typeof inputSchema !== 'object' || inputSchema === null) {
        warnings.push('Invalid input schema');
        return { isValid: true, errors, warnings };
      }

      const schema = inputSchema as any;
      const properties = schema.properties || {};
      const required = schema.required || [];

      for (const field of required) {
        if (inputs[field] === undefined) {
          errors.push(`Missing required field: ${field}`);
        }
      }

      for (const [field, value] of Object.entries(inputs)) {
        const fieldSchema = properties[field];
        if (fieldSchema && fieldSchema.type) {
          const actualType = typeof value;
          if (actualType !== fieldSchema.type) {
            errors.push(
              `Type mismatch for "${field}": expected ${fieldSchema.type}, got ${actualType}`
            );
          }
        }
      }
    } catch (error) {
      warnings.push(`Schema validation error: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Sanitize execution inputs
   */
  sanitizeInputs(inputs: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(inputs)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Sanitize a string value
   */
  private sanitizeString(value: string): string {
    return value
      .replace(/eval\s*\(/g, 'eval_blocked(')
      .replace(/exec\s*\(/g, 'exec_blocked(')
      .replace(/system\s*\(/g, 'system_blocked(')
      .replace(/`/g, '\\`');
  }

  /**
   * Sanitize an object recursively
   */
  private sanitizeObject(obj: unknown): unknown {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map((item) =>
          typeof item === 'string' ? this.sanitizeString(item) : item
        );
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Get configuration
   */
  getConfig(): SafetyLayerConfig {
    return { ...this.config };
  }

  /**
   * Check if skill is in allowlist
   */
  isSkillAllowed(skillName: string): boolean {
    if (this.config.skillAllowlist.length === 0) {
      return true;
    }
    return this.config.skillAllowlist.includes(skillName);
  }
}
