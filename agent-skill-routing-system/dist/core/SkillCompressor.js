"use strict";
// Skill Content Compressor
// Progressively compresses SKILL.md content at levels 0-10+ to reduce token bloat
// Preserves YAML frontmatter, code blocks, and protects structured content
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillCompressor = void 0;
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
class SkillCompressor {
    recipes = new Map();
    MIN_TOKEN_THRESHOLD = 100;
    constructor() {
        this.initializeRecipes();
    }
    /**
     * Initialize compression recipes for all levels
     */
    initializeRecipes() {
        // Level 0: No compression
        this.recipes.set(0, {
            level: 0,
            description: 'No compression (original)',
            transformations: [],
        });
        // Level 1: Remove blank lines within sections (except code blocks)
        this.recipes.set(1, {
            level: 1,
            description: 'Remove blank lines within sections',
            transformations: [
                {
                    name: 'Remove multiple blank lines',
                    pattern: /\n\n+(?!```)/g,
                    replacement: '\n',
                    skipInCodeBlocks: true,
                },
            ],
        });
        // Level 2: Remove "When to Use" section details
        this.recipes.set(2, {
            level: 2,
            description: 'Remove "When to Use" bullets, keep core workflow',
            transformations: [
                {
                    name: 'Remove When to Use bullets',
                    pattern: /^##\s+When to Use\n[\s\S]*?(?=^##|\Z)/m,
                    replacement: () => '',
                    skipInCodeBlocks: false,
                },
            ],
        });
        // Level 3: Remove "When NOT to Use" section
        this.recipes.set(3, {
            level: 3,
            description: 'Remove "When NOT to Use" section',
            transformations: [
                {
                    name: 'Remove When NOT to Use section',
                    pattern: /^##\s+When NOT to Use\n[\s\S]*?(?=^##|\Z)/m,
                    replacement: '',
                    skipInCodeBlocks: false,
                },
            ],
        });
        // Level 4: Collapse Core Workflow to single paragraph
        this.recipes.set(4, {
            level: 4,
            description: 'Collapse Core Workflow to single paragraph',
            transformations: [
                {
                    name: 'Collapse workflow list to paragraph',
                    pattern: /^##\s+Core Workflow\n((?:\d+\.\s+.*\n?)+)/m,
                    replacement: (match) => {
                        const lines = match.match(/^\d+\.\s+(.+?)(?:\n|$)/gm);
                        const steps = (lines || [])
                            .map((line) => {
                            let step = line.replace(/^\d+\.\s+/, '').trim();
                            // Handle bold text at start: **Step Title** - description or **Step Title**: description
                            step = step.replace(/^\*\*(.+?)\*\*\s*[—:-]?\s*/, '$1: ');
                            return step;
                        })
                            .join('; ');
                        return `## Core Workflow\n${steps}`;
                    },
                    skipInCodeBlocks: false,
                },
            ],
        });
        // Level 5: Remove related-skills table
        this.recipes.set(5, {
            level: 5,
            description: 'Remove related-skills table',
            transformations: [
                {
                    name: 'Remove Related Skills section',
                    pattern: /^##\s+Related Skills\n[\s\S]*?(?=^##|\Z)/m,
                    replacement: '',
                    skipInCodeBlocks: false,
                },
            ],
        });
        // Level 6: Remove markdown formatting (bold, italic)
        this.recipes.set(6, {
            level: 6,
            description: 'Remove markdown formatting (bold, italic)',
            transformations: [
                {
                    name: 'Remove bold',
                    pattern: /\*\*(.+?)\*\*/g,
                    replacement: '$1',
                    skipInCodeBlocks: true,
                },
                {
                    name: 'Remove italic',
                    pattern: /\*(.+?)\*/g,
                    replacement: '$1',
                    skipInCodeBlocks: true,
                },
                {
                    name: 'Remove backticks',
                    pattern: /`([^`]+)`/g,
                    replacement: '$1',
                    skipInCodeBlocks: true,
                },
            ],
        });
        // Level 7: Remove code examples (keep code blocks only)
        this.recipes.set(7, {
            level: 7,
            description: 'Remove code examples (keep code blocks only)',
            transformations: [
                {
                    name: 'Remove inline code examples',
                    pattern: /```[\s\S]*?```/g,
                    replacement: '[code example removed]',
                    skipInCodeBlocks: false,
                },
            ],
        });
        // Level 8: Abbreviate section names
        this.recipes.set(8, {
            level: 8,
            description: 'Abbreviate section names',
            transformations: [
                {
                    name: 'Abbreviate sections',
                    pattern: /^##\s+/gm,
                    replacement: '## ',
                    skipInCodeBlocks: false,
                },
                {
                    name: 'Remove "Core Workflow" detail',
                    pattern: /^##\s+Core Workflow$/m,
                    replacement: '## Workflow',
                    skipInCodeBlocks: false,
                },
            ],
        });
        // Level 9: Combine all sections into single block
        this.recipes.set(9, {
            level: 9,
            description: 'Combine all sections into single block',
            transformations: [
                {
                    name: 'Remove section headers',
                    pattern: /^##\s+.+\n/gm,
                    replacement: '',
                    skipInCodeBlocks: false,
                },
                {
                    name: 'Remove blank lines',
                    pattern: /\n\n+/g,
                    replacement: ' ',
                    skipInCodeBlocks: true,
                },
            ],
        });
        // Level 10+: Extreme compression (summary only)
        this.recipes.set(10, {
            level: 10,
            description: 'Extreme compression (summary only)',
            transformations: [
                {
                    name: 'Extract first paragraph',
                    pattern: /^---[\s\S]*?---\n\n# .+?\n\n(.+?)(?:\n\n|\Z)/,
                    replacement: (match) => {
                        const fmMatch = match.match(/^---[\s\S]*?---\n\n# (.+?)$/m);
                        const firstPara = match.match(/^# .+?\n\n(.+?)(?:\n\n|\Z)/s);
                        const title = fmMatch ? fmMatch[1] : 'Skill';
                        const summary = firstPara ? firstPara[1].slice(0, 200) : 'Skill content';
                        return `# ${title}\n\n${summary}`;
                    },
                    skipInCodeBlocks: false,
                },
            ],
        });
    }
    /**
     * Compress skill content to a specific level
     * Returns the compressed content or original if compression fails
     *
     * @param content Skill content (including YAML frontmatter)
     * @param level Compression level (0-10+)
     * @returns Compressed skill content
     */
    compress(content, level) {
        // Guard: Level 0 is no compression
        if (level <= 0) {
            return {
                content,
                originalLength: content.length,
                compressedLength: content.length,
                compressionLevel: 0,
                tokensSaved: 0,
                ratio: 1,
                isCompressed: false,
            };
        }
        // Guard: Skip compression if content is too small (tokens below threshold)
        if (!this.shouldCompress(content)) {
            return {
                content,
                originalLength: content.length,
                compressedLength: content.length,
                compressionLevel: 0,
                tokensSaved: 0,
                ratio: 1,
                isCompressed: false,
            };
        }
        try {
            let compressed = content;
            // Apply recipes from level 1 through requested level
            for (let i = 1; i <= level; i++) {
                const recipe = this.recipes.get(i);
                if (!recipe)
                    break; // Stop if recipe doesn't exist
                compressed = this.applyRecipe(compressed, recipe);
            }
            // Estimate tokens
            const originalTokens = this.estimateTokens(content);
            const compressedTokens = this.estimateTokens(compressed);
            const tokensSaved = Math.max(0, originalTokens - compressedTokens);
            const ratio = originalTokens > 0 ? compressedTokens / originalTokens : 1;
            return {
                content: compressed,
                originalLength: content.length,
                compressedLength: compressed.length,
                compressionLevel: level,
                tokensSaved,
                ratio,
                isCompressed: true,
            };
        }
        catch (error) {
            // Fail fast: if compression fails, return original content
            return {
                content,
                originalLength: content.length,
                compressedLength: content.length,
                compressionLevel: 0,
                tokensSaved: 0,
                ratio: 1,
                isCompressed: false,
            };
        }
    }
    /**
     * Apply a single compression recipe to content
     */
    applyRecipe(content, recipe) {
        let result = content;
        for (const transform of recipe.transformations) {
            if (transform.skipInCodeBlocks) {
                result = this.applyToNonCodeBlocks(result, transform.pattern, transform.replacement);
            }
            else {
                if (typeof transform.replacement === 'string') {
                    result = result.replace(transform.pattern, transform.replacement);
                }
                else {
                    result = result.replace(transform.pattern, transform.replacement);
                }
            }
        }
        return result;
    }
    /**
     * Apply a regex replacement only to non-code blocks
     */
    applyToNonCodeBlocks(content, pattern, replacement) {
        // Split by code blocks (```...```)
        const parts = content.split(/(```[\s\S]*?```)/);
        // Apply pattern to odd indices (non-code blocks) only
        const result = parts
            .map((part, index) => {
            if (index % 2 === 1) {
                // Code block — don't modify
                return part;
            }
            // Non-code block — apply replacement
            if (typeof replacement === 'string') {
                return part.replace(pattern, replacement);
            }
            else {
                return part.replace(pattern, replacement);
            }
        })
            .join('');
        return result;
    }
    /**
     * Estimate tokens saved by compression at a specific level
     */
    estimateTokenSavings(content, level) {
        const originalTokens = this.estimateTokens(content);
        const compressed = this.compress(content, level);
        const compressedTokens = this.estimateTokens(compressed.content);
        return {
            before: originalTokens,
            after: compressedTokens,
            saved: Math.max(0, originalTokens - compressedTokens),
            ratio: originalTokens > 0 ? compressedTokens / originalTokens : 1,
        };
    }
    /**
     * Estimate token count using a simple heuristic:
     * Tokens ≈ (length / 4) + (newlines / 2)
     * This is a fast approximation; actual GPT-3 tokenization may vary
     */
    estimateTokens(content) {
        const charTokens = Math.ceil(content.length / 4);
        const newlineTokens = (content.match(/\n/g) || []).length / 2;
        return Math.max(1, charTokens + newlineTokens);
    }
    /**
     * Should we compress this skill? (Skip if <100 tokens)
     */
    shouldCompress(content) {
        const tokens = this.estimateTokens(content);
        return tokens >= this.MIN_TOKEN_THRESHOLD;
    }
    /**
     * Get the recipe for a specific compression level
     */
    getRecipe(level) {
        if (level < 0)
            return null;
        if (level > 10) {
            return this.recipes.get(10) || null;
        }
        return this.recipes.get(level) || null;
    }
    /**
     * Get description of all compression levels
     */
    getAllLevelDescriptions() {
        const descriptions = [];
        for (let i = 0; i <= 10; i++) {
            const recipe = this.recipes.get(i);
            if (recipe) {
                descriptions.push({ level: i, description: recipe.description });
            }
        }
        return descriptions;
    }
}
exports.SkillCompressor = SkillCompressor;
//# sourceMappingURL=SkillCompressor.js.map