/**
 * LLM Client interface (pre-configured from startup)
 */
export interface LLMClient {
    createCompletion(params: {
        model: string;
        messages: Array<{
            role: 'system' | 'user' | 'assistant';
            content: string;
        }>;
        temperature?: number;
        maxTokens?: number;
    }): Promise<{
        choices: Array<{
            message: {
                content: string;
            };
        }>;
    }>;
}
/**
 * A single compressed version with metadata
 */
export interface CompressedVersion {
    content: string;
    tokens: number;
    compressionRatio: number;
    version: 'brief' | 'moderate' | 'detailed';
    generatedAt: Date;
    isValid: boolean;
    validationErrors: string[];
}
/**
 * All three compressed versions
 */
export interface CompressedVersions {
    brief: CompressedVersion;
    moderate: CompressedVersion;
    detailed: CompressedVersion;
}
/**
 * LLMSkillCompressor - Generates 2-3 compressed versions using LLM
 *
 * Strategy:
 * 1. Accept skill content + LLM client
 * 2. Generate brief/moderate/detailed prompts
 * 3. Call LLM for each compression level
 * 4. Validate output (markdown syntax, title, code blocks)
 * 5. Return CompressedVersions or null on graceful degradation
 * 6. Log all errors with context (skillName, version, error)
 * 7. Never throw - caller handles null
 */
export declare class LLMSkillCompressor {
    private logger;
    private llmClient;
    private readonly models;
    constructor(llmClient: LLMClient);
    /**
     * Compress a skill into brief/moderate/detailed versions
     * Early exit guard: validates input before processing
     */
    compressSkill(skillName: string, originalContent: string): Promise<CompressedVersions | null>;
    /**
     * Generate a single compressed version by calling LLM
     * Atomic: pure function with no side effects
     * Returns CompressedVersion with validation status, or null on error
     */
    private generateCompressedVersion;
    /**
     * Build the compression prompt for the LLM
     * Intentional: descriptive prompt structure
     */
    private buildCompressionPrompt;
    /**
     * Validate markdown output
     * Parse: syntax check + title + code blocks
     */
    private validateMarkdownOutput;
    /**
     * Extract YAML frontmatter from content
     * Atomic: pure function, no mutations
     */
    private extractYAMLFrontmatter;
    /**
     * Ensure YAML frontmatter is present in compressed content
     * Intentional: clear method name for readability
     */
    private ensureYAMLFrontmatter;
    /**
     * Create a failed version (graceful degradation)
     * Returns invalid CompressedVersion with original content
     */
    private createFailedVersion;
    /**
     * Estimate token count using conservative heuristic
     * Atomic: pure function
     * ~4 chars per token + newline cost
     */
    private estimateTokens;
    /**
     * Get max tokens for LLM call based on compression style
     * Intentional: clear naming for each level
     */
    private getMaxTokensForStyle;
}
//# sourceMappingURL=LLMSkillCompressor.d.ts.map