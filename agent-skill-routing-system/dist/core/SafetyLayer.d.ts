import type { RouteRequest, ExecuteRequest } from '../core/types.js';
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
export declare class SafetyLayer {
    private config;
    constructor(config?: Partial<SafetyLayerConfig>);
    /**
     * Validate a routing request
     */
    validateRouteRequest(request: RouteRequest): Promise<SecurityResult>;
    /**
     * Validate an execute request
     */
    validateExecuteRequest(request: ExecuteRequest): Promise<SecurityResult>;
    /**
     * Check for prompt injection attempts
     */
    private checkPromptInjection;
    /**
     * Determine risk level based on flags
     */
    private determineRiskLevel;
    /**
     * Validate schema compatibility between skill input and execution inputs
     */
    validateSchema(_skillName: string, inputSchema: unknown, inputs: Record<string, unknown>): ValidationResult;
    /**
     * Sanitize execution inputs
     */
    sanitizeInputs(inputs: Record<string, unknown>): Record<string, unknown>;
    /**
     * Sanitize a string value
     */
    private sanitizeString;
    /**
     * Sanitize an object recursively
     */
    private sanitizeObject;
    /**
     * Get configuration
     */
    getConfig(): SafetyLayerConfig;
    /**
     * Check if skill is in allowlist
     */
    isSkillAllowed(skillName: string): boolean;
}
//# sourceMappingURL=SafetyLayer.d.ts.map