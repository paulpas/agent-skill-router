"use strict";
// LLM-Based Skill Compressor
// Generates 2-3 compressed versions (brief/moderate/detailed) optimized for agentic tools
// Preserves YAML frontmatter, code blocks, and validates output
// Error handling with logging (no throw, graceful degradation)
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMSkillCompressor = void 0;
const Logger_1 = require("../observability/Logger");
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
class LLMSkillCompressor {
    logger;
    llmClient;
    models = {
        brief: 'gpt-4o-mini',
        moderate: 'gpt-4o-mini',
        detailed: 'gpt-4o-mini',
    };
    constructor(llmClient) {
        this.llmClient = llmClient;
        this.logger = new Logger_1.Logger('LLMSkillCompressor');
    }
    /**
     * Compress a skill into brief/moderate/detailed versions
     * Early exit guard: validates input before processing
     */
    async compressSkill(skillName, originalContent) {
        // Guard: validate input
        if (!skillName || !originalContent) {
            this.logger.error('Invalid input to compressSkill', {
                skillName,
                contentLength: originalContent?.length || 0,
            });
            return null;
        }
        // Guard: extract YAML frontmatter early
        const yamlFrontmatter = this.extractYAMLFrontmatter(originalContent);
        if (!yamlFrontmatter) {
            this.logger.warn('Skill missing YAML frontmatter', { skillName });
            // Continue anyway - frontmatter is not strictly required
        }
        try {
            // Atomic predictability: generate all versions independently and in parallel
            const [brief, moderate, detailed] = await Promise.allSettled([
                this.generateCompressedVersion(skillName, originalContent, 'brief', yamlFrontmatter),
                this.generateCompressedVersion(skillName, originalContent, 'moderate', yamlFrontmatter),
                this.generateCompressedVersion(skillName, originalContent, 'detailed', yamlFrontmatter),
            ]);
            // Parse results: convert PromiseSettledResult to CompressedVersion
            const briefVersion = brief.status === 'fulfilled' && brief.value
                ? brief.value
                : this.createFailedVersion('brief', originalContent);
            const moderateVersion = moderate.status === 'fulfilled' && moderate.value
                ? moderate.value
                : this.createFailedVersion('moderate', originalContent);
            const detailedVersion = detailed.status === 'fulfilled' && detailed.value
                ? detailed.value
                : this.createFailedVersion('detailed', originalContent);
            // Fail fast: log if any compression failed
            if (brief.status === 'rejected') {
                this.logger.error('Brief compression failed', {
                    skillName,
                    error: String(brief.reason),
                });
            }
            if (moderate.status === 'rejected') {
                this.logger.error('Moderate compression failed', {
                    skillName,
                    error: String(moderate.reason),
                });
            }
            if (detailed.status === 'rejected') {
                this.logger.error('Detailed compression failed', {
                    skillName,
                    error: String(detailed.reason),
                });
            }
            return {
                brief: briefVersion,
                moderate: moderateVersion,
                detailed: detailedVersion,
            };
        }
        catch (error) {
            // Fail fast: unexpected error during compression
            this.logger.error('Unexpected error in compressSkill', {
                skillName,
                error: String(error),
            });
            return null;
        }
    }
    /**
     * Generate a single compressed version by calling LLM
     * Atomic: pure function with no side effects
     * Returns CompressedVersion with validation status, or null on error
     */
    async generateCompressedVersion(skillName, originalContent, targetStyle, yamlFrontmatter) {
        // Guard: early validation
        if (!skillName || !originalContent || !targetStyle) {
            return null;
        }
        try {
            // Build prompt (Intentional Naming: descriptive method name)
            const prompt = this.buildCompressionPrompt(originalContent, targetStyle);
            // Call LLM with atomic predictability (same prompt = same output)
            const model = this.models[targetStyle];
            const response = await this.llmClient.createCompletion({
                model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a skill documentation optimizer for agentic AI tools. ' +
                            'Return valid Markdown with YAML frontmatter preserved.',
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                temperature: 0.2, // Low temperature for consistency
                maxTokens: this.getMaxTokensForStyle(targetStyle),
            });
            // Parse: extract content from response
            const compressedContent = response.choices[0]?.message?.content;
            if (!compressedContent) {
                this.logger.warn('LLM returned empty response', { skillName, targetStyle });
                return null;
            }
            // Reconstruct with YAML if needed
            const finalContent = yamlFrontmatter
                ? this.ensureYAMLFrontmatter(compressedContent, yamlFrontmatter)
                : compressedContent;
            // Validate: syntax parse + title + code blocks
            const validation = this.validateMarkdownOutput(finalContent);
            // Estimate tokens
            const originalTokens = this.estimateTokens(originalContent);
            const compressedTokens = this.estimateTokens(finalContent);
            const compressionRatio = originalTokens > 0 ? compressedTokens / originalTokens : 1;
            return {
                content: finalContent,
                tokens: compressedTokens,
                compressionRatio,
                version: targetStyle,
                generatedAt: new Date(),
                isValid: validation.valid,
                validationErrors: validation.errors,
            };
        }
        catch (error) {
            // Fail fast: log error without throwing
            this.logger.error('Error generating compressed version', {
                skillName,
                targetStyle,
                error: String(error),
            });
            return null;
        }
    }
    /**
     * Build the compression prompt for the LLM
     * Intentional: descriptive prompt structure
     */
    buildCompressionPrompt(skillContent, targetStyle
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ) {
        const tokenTargets = {
            brief: { min: 200, max: 400, removal: 'aggressive' },
            moderate: { min: 500, max: 800, removal: 'balanced' },
            detailed: { min: 1000, max: 1500, removal: 'minimal' },
        };
        const target = tokenTargets[targetStyle];
        return `You are a skill documentation optimizer for agentic AI tools (OpenAI o1, Claude Code, etc).

Compress the following SKILL.md to optimize for agent efficacy while preserving essential meaning.

COMPRESSION_LEVEL: ${targetStyle}
TARGET_TOKENS: ${target.min}-${target.max}
COMPRESSION_APPROACH: ${target.removal}

CRITICAL RULES:
1. PRESERVE: YAML frontmatter (---...---) EXACTLY as-is, do not modify
2. PRESERVE: Code blocks with exact syntax and indentation
3. PRESERVE: Skill title (# Title) and core purpose statement
4. PRESERVE: Core implementation logic, critical patterns, agent-actionable guidance
5. REMOVE: Verbose prose, redundant explanations, token-wasting repetition
6. REMOVE: "When to Use" / "When NOT to Use" sections if ${target.removal} removal
7. OPTIMIZE: For agentic tool efficacy - agents need concise, actionable information
8. OUTPUT: Valid Markdown starting with "# SkillName"
9. VALIDATE: Ensure markdown syntax is correct (balanced code blocks)

Original SKILL.md:
---
${skillContent}
---

Return ONLY the compressed Markdown content (including YAML frontmatter if present). Do not add explanations or comments.`;
    }
    /**
     * Validate markdown output
     * Parse: syntax check + title + code blocks
     */
    validateMarkdownOutput(content
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ) {
        const errors = [];
        // Guard: check content exists
        if (!content || content.length < 50) {
            errors.push('Content too short (< 50 chars)');
            return { valid: false, errors };
        }
        // Parse: H1 title must exist (may come after YAML frontmatter)
        // Find content after YAML frontmatter if present
        let markdownContent = content;
        if (content.startsWith('---')) {
            const endIndex = content.indexOf('---', 3);
            if (endIndex !== -1) {
                markdownContent = content.substring(endIndex + 3).trim();
            }
        }
        // Check for H1 title in markdown content
        const titleMatch = markdownContent.match(/^#\s+\w+/);
        if (!titleMatch) {
            errors.push('Missing H1 title (must start with "# Title")');
        }
        // Parse: code block balance check
        const codeBlockCount = (content.match(/```/g) || []).length;
        if (codeBlockCount % 2 !== 0) {
            errors.push(`Unbalanced code blocks (found ${codeBlockCount} backtick groups, expected even)`);
        }
        // Parse: YAML frontmatter (optional but if present, must be balanced)
        const yamlStart = content.indexOf('---');
        if (yamlStart === 0) {
            const yamlEnd = content.indexOf('---', 3);
            if (yamlEnd === -1) {
                errors.push('YAML frontmatter missing closing "---"');
            }
        }
        // Parse: check for markdown link syntax validity
        const badLinkPattern = /\[.*?\]\(/g;
        const linkMatches = content.match(badLinkPattern) || [];
        for (const match of linkMatches) {
            const closeIndex = content.indexOf(')', content.indexOf(match) + match.length);
            if (closeIndex === -1) {
                errors.push(`Invalid markdown link: ${match}`);
            }
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    /**
     * Extract YAML frontmatter from content
     * Atomic: pure function, no mutations
     */
    extractYAMLFrontmatter(content) {
        if (!content.startsWith('---')) {
            return null;
        }
        const endIndex = content.indexOf('---', 3);
        if (endIndex === -1) {
            return null;
        }
        return content.substring(0, endIndex + 3);
    }
    /**
     * Ensure YAML frontmatter is present in compressed content
     * Intentional: clear method name for readability
     */
    ensureYAMLFrontmatter(compressedContent, yamlFrontmatter) {
        // Guard: if YAML already present, don't duplicate
        if (compressedContent.startsWith('---')) {
            return compressedContent;
        }
        // Reconstruct with YAML at top
        return `${yamlFrontmatter}\n\n${compressedContent}`;
    }
    /**
     * Create a failed version (graceful degradation)
     * Returns invalid CompressedVersion with original content
     */
    createFailedVersion(version, originalContent) {
        const tokens = this.estimateTokens(originalContent);
        return {
            content: originalContent,
            tokens,
            compressionRatio: 1,
            version,
            generatedAt: new Date(),
            isValid: false,
            validationErrors: ['LLM compression failed, returning original content'],
        };
    }
    /**
     * Estimate token count using conservative heuristic
     * Atomic: pure function
     * ~4 chars per token + newline cost
     */
    estimateTokens(content) {
        // Guard: empty content
        if (!content) {
            return 0;
        }
        // Parse: character count (conservative: 4 chars per token)
        const baseTokens = Math.ceil(content.length / 4);
        // Parse: newline cost (~0.5 tokens per newline)
        const newlineCount = (content.match(/\n/g) || []).length;
        const newlineTokens = newlineCount * 0.5;
        // Atomic: sum and return
        return Math.max(1, Math.ceil(baseTokens + newlineTokens));
    }
    /**
     * Get max tokens for LLM call based on compression style
     * Intentional: clear naming for each level
     */
    getMaxTokensForStyle(style) {
        const maxTokens = {
            brief: 600,
            moderate: 1200,
            detailed: 2000,
        };
        return maxTokens[style];
    }
}
exports.LLMSkillCompressor = LLMSkillCompressor;
//# sourceMappingURL=LLMSkillCompressor.js.map