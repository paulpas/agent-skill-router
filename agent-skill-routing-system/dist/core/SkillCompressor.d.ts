/**
 * Compression transformation step
 */
export interface CompressionTransformation {
    name: string;
    pattern: RegExp;
    replacement: string | ((match: string, ...args: unknown[]) => string);
    skipInCodeBlocks: boolean;
}
/**
 * Compression recipe: regex patterns and transformations for a compression level
 */
export interface CompressionRecipe {
    level: number;
    description: string;
    transformations: CompressionTransformation[];
}
/**
 * Compressed skill content with metadata
 */
export interface CompressedSkill {
    content: string;
    originalLength: number;
    compressedLength: number;
    compressionLevel: number;
    tokensSaved: number;
    compressPercent: number;
    isCompressed: boolean;
}
/**
 * Token estimation result
 */
export interface TokenEstimate {
    before: number;
    after: number;
    saved: number;
    compressPercent: number;
}
/**
 * SkillCompressor - applies progressive compression to skill content
 *
 * Compression Levels:
 * - Level 0: No compression (original)
 * - Level 1: Remove blank lines within sections (except code blocks)
 * - Level 2: Remove "When to Use" bullets, keep only core workflow
 * - Level 3: Remove "When NOT to Use" section
 * - Level 4: Collapse "Core Workflow" to single paragraph
 * - Level 5: Remove related-skills table
 * - Level 6: Remove all markdown formatting (bold, italic)
 * - Level 7: Remove code examples (keep code blocks only)
 * - Level 8: Abbreviate section names
 * - Level 9: Combine all sections into single block
 * - Level 10+: Extreme compression (summary only)
 */
export declare class SkillCompressor {
    private recipes;
    private readonly MIN_TOKEN_THRESHOLD;
    constructor();
    /**
     * Initialize compression recipes for all levels
     */
    private initializeRecipes;
    /**
     * Compress skill content to a specific level
     * Returns the compressed content or original if compression fails
     *
     * @param content Skill content (including YAML frontmatter)
     * @param level Compression level (0-10+)
     * @returns Compressed skill content
     */
    compress(content: string, level: number): CompressedSkill;
    /**
     * Apply a single compression recipe to content
     */
    private applyRecipe;
    /**
     * Apply a regex replacement only to non-code blocks
     */
    private applyToNonCodeBlocks;
    /**
     * Estimate tokens saved by compression at a specific level
     */
    estimateTokenSavings(content: string, level: number): TokenEstimate;
    /**
     * Estimate token count using a simple heuristic:
     * Tokens ≈ (length / 4) + (newlines / 2)
     * This is a fast approximation; actual GPT-3 tokenization may vary
     */
    private estimateTokens;
    /**
     * Should we compress this skill? (Skip if <100 tokens)
     */
    shouldCompress(content: string): boolean;
    /**
     * Get the recipe for a specific compression level
     */
    getRecipe(level: number): CompressionRecipe | null;
    /**
     * Get description of all compression levels
     */
    getAllLevelDescriptions(): Array<{
        level: number;
        description: string;
    }>;
}
//# sourceMappingURL=SkillCompressor.d.ts.map