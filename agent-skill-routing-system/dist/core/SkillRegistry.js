"use strict";
// Skill Registry System
// Loads skills from /skills/* directories, extracts metadata, and maintains a registry
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillRegistry = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const glob_1 = require("glob");
const yaml_1 = __importDefault(require("yaml"));
const EmbeddingService_js_1 = require("../embedding/EmbeddingService.js");
const Logger_js_1 = require("../observability/Logger.js");
/**
 * Skill Registry - manages all available skills
 */
class SkillRegistry {
    skills = new Map();
    skillsByCategory = new Map();
    skillsByTag = new Map();
    config;
    embeddingService;
    logger;
    constructor(config) {
        this.config = {
            cacheDirectory: './.skill-cache',
            generateEmbeddings: true,
            ...config,
        };
        this.embeddingService = new EmbeddingService_js_1.EmbeddingService();
        this.logger = new Logger_js_1.Logger('SkillRegistry');
    }
    /**
     * Load all skills from the skills directory
     */
    async loadSkills() {
        this.logger.info('Loading skills from directory', {
            directory: this.config.skillsDirectory,
        });
        try {
            // Find all SKILL.md files exclusively
            const pattern = path_1.default.join(this.config.skillsDirectory, '**/SKILL.md');
            const files = await (0, glob_1.glob)(pattern);
            this.logger.debug(`Found ${files.length} potential skill files`);
            for (const file of files) {
                try {
                    const skill = await this.loadSkillFromFile(file);
                    if (skill) {
                        await this.addSkill(skill);
                    }
                }
                catch (error) {
                    this.logger.error(`Failed to load skill from ${file}`, {
                        error: error instanceof Error ? error.message : String(error),
                        file,
                    });
                }
            }
            // Generate embeddings if configured and not already present
            if (this.config.generateEmbeddings) {
                await this.generateMissingEmbeddings();
            }
            this.logger.info(`Loaded ${this.skills.size} skills total`, {
                skillCount: this.skills.size,
                categories: this.skillsByCategory.size,
                tags: this.skillsByTag.size,
            });
        }
        catch (error) {
            this.logger.error('Failed to load skills', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Load a single skill from a SKILL.md file
     */
    async loadSkillFromFile(filePath) {
        try {
            const content = await fs_1.default.promises.readFile(filePath, 'utf-8');
            const metadata = this.parseSkillFromMarkdown(content, filePath);
            if (!this.isValidSkillMetadata(metadata)) {
                this.logger.warn(`Invalid skill metadata in ${filePath}`);
                return null;
            }
            return { metadata, sourceFile: filePath, rawContent: content };
        }
        catch (error) {
            this.logger.error(`Failed to parse skill file ${filePath}`, {
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
    }
    /**
     * Parse skill metadata from a SKILL.md file with YAML frontmatter
     * Maps OpenCode skill frontmatter fields to SkillMetadata schema
     */
    parseSkillFromMarkdown(content, filePath) {
        // Extract YAML frontmatter between --- delimiters
        const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (!fmMatch) {
            this.logger.debug(`No YAML frontmatter found in ${filePath}, using filename defaults`);
            const baseName = path_1.default.basename(path_1.default.dirname(filePath));
            return {
                name: baseName,
                category: baseName.split('-')[0] || 'general',
                description: `Skill loaded from ${baseName}`,
                tags: [baseName.split('-')[0] || 'general'],
                input_schema: { type: 'object', properties: {}, required: [] },
                output_schema: { type: 'object', properties: {}, required: [] },
            };
        }
        let fm;
        try {
            fm = yaml_1.default.parse(fmMatch[1]);
        }
        catch {
            this.logger.warn(`Failed to parse YAML frontmatter in ${filePath}`);
            const baseName = path_1.default.basename(path_1.default.dirname(filePath));
            return {
                name: baseName,
                category: baseName.split('-')[0] || 'general',
                description: `Skill loaded from ${baseName}`,
                tags: [baseName.split('-')[0] || 'general'],
                input_schema: { type: 'object', properties: {}, required: [] },
                output_schema: { type: 'object', properties: {}, required: [] },
            };
        }
        // Map SKILL.md frontmatter fields to SkillMetadata
        const nestedMeta = fm.metadata || {};
        // name: use frontmatter name, fall back to directory name
        const name = fm.name || path_1.default.basename(path_1.default.dirname(filePath));
        // category: metadata.domain → category, fall back to domain prefix from name
        const category = nestedMeta.domain ||
            name.split('-')[0] ||
            'general';
        // description
        const description = fm.description || `Skill: ${name}`;
        // tags: parse metadata.triggers (comma-separated string) + add domain prefix
        const triggersRaw = nestedMeta.triggers || '';
        const triggerTags = triggersRaw
            .split(',')
            .map((t) => t.trim())
            .filter((t) => t.length > 0);
        // Also add role and scope as tags if present
        const roleTags = [
            nestedMeta.role,
            nestedMeta.scope,
        ].filter(Boolean);
        const tags = [...new Set([category, ...triggerTags, ...roleTags])];
        return {
            name,
            category,
            description,
            tags: tags.length > 0 ? tags : [category],
            version: nestedMeta.version || '1.0.0',
            input_schema: { type: 'object', properties: {}, required: [] },
            output_schema: { type: 'object', properties: {}, required: [] },
        };
    }
    /**
     * Validate skill metadata against expected schema
     */
    isValidSkillMetadata(metadata) {
        const requiredFields = ['name', 'category', 'description', 'tags'];
        for (const field of requiredFields) {
            const value = metadata[field];
            if (value === undefined || value === null) {
                return false;
            }
            if (Array.isArray(value) && value.length === 0) {
                return false;
            }
        }
        return true;
    }
    /**
     * Add a skill to the registry
     */
    async addSkill(skill) {
        const name = skill.metadata.name;
        // Generate embedding if not present
        if (this.config.generateEmbeddings && !skill.metadata.embedding) {
            const embeddingData = await this.embeddingService.generateEmbedding(this.buildEmbeddingText(skill.metadata));
            skill.metadata.embedding = embeddingData.embedding;
        }
        this.skills.set(name, skill);
        // Update category index
        const category = skill.metadata.category;
        if (!this.skillsByCategory.has(category)) {
            this.skillsByCategory.set(category, []);
        }
        this.skillsByCategory.get(category)?.push(name);
        // Update tag index
        for (const tag of skill.metadata.tags) {
            if (!this.skillsByTag.has(tag)) {
                this.skillsByTag.set(tag, []);
            }
            this.skillsByTag.get(tag)?.push(name);
        }
        this.logger.debug(`Added skill: ${name}`, {
            category: skill.metadata.category,
            tags: skill.metadata.tags.length,
        });
    }
    /**
     * Build text for embedding generation from skill metadata
     */
    buildEmbeddingText(metadata) {
        return [
            metadata.name,
            metadata.category,
            metadata.description,
            ...metadata.tags,
            ...(metadata.dependencies || []),
        ].join(' ');
    }
    /**
     * Generate embeddings for skills that don't have them
     */
    async generateMissingEmbeddings() {
        const skillsWithoutEmbeddings = Array.from(this.skills.values()).filter((skill) => !skill.metadata.embedding);
        if (skillsWithoutEmbeddings.length === 0) {
            return;
        }
        this.logger.info(`Generating embeddings for ${skillsWithoutEmbeddings.length} skills`);
        const batch = [];
        for (const skill of skillsWithoutEmbeddings) {
            batch.push({
                skill,
                text: this.buildEmbeddingText(skill.metadata),
            });
        }
        // Process in batches
        const batchSize = 100;
        for (let i = 0; i < batch.length; i += batchSize) {
            const batchSlice = batch.slice(i, i + batchSize);
            const texts = batchSlice.map((b) => b.text);
            try {
                const embeddings = await this.embeddingService.batchEmbeddings(texts, this.config.skillsDirectory);
                embeddings.forEach((embedding, index) => {
                    const { skill } = batchSlice[index];
                    if (skill.metadata.embedding) {
                        skill.metadata.embedding = embedding.embedding;
                    }
                });
            }
            catch (error) {
                this.logger.error('Failed to generate embeddings for batch', {
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
    }
    /**
     * Get a skill by name
     */
    getSkill(name) {
        return this.skills.get(name);
    }
    /**
     * Get all skills
     */
    getAllSkills() {
        return Array.from(this.skills.values());
    }
    /**
     * Get skills by category
     */
    getSkillsByCategory(category) {
        const names = this.skillsByCategory.get(category) || [];
        return names.map((name) => this.skills.get(name)).filter(Boolean);
    }
    /**
     * Get skills by tag
     */
    getSkillsByTag(tag) {
        const names = this.skillsByTag.get(tag) || [];
        return names.map((name) => this.skills.get(name)).filter(Boolean);
    }
    /**
     * Search skills by category or tag
     */
    searchByCategoryOrTag(searchTerm) {
        const categoryResults = this.getSkillsByCategory(searchTerm);
        if (categoryResults.length > 0) {
            return categoryResults;
        }
        const tagResults = this.getSkillsByTag(searchTerm);
        if (tagResults.length > 0) {
            return tagResults;
        }
        return [];
    }
    /**
     * Reload all skills
     */
    async reload() {
        this.skills.clear();
        this.skillsByCategory.clear();
        this.skillsByTag.clear();
        await this.loadSkills();
    }
    /**
     * Get registry statistics
     */
    getStats() {
        const skillsWithoutEmbeddings = Array.from(this.skills.values()).filter((s) => !s.metadata.embedding).length;
        return {
            totalSkills: this.skills.size,
            categories: this.skillsByCategory.size,
            tags: this.skillsByTag.size,
            skillsWithoutEmbeddings,
        };
    }
}
exports.SkillRegistry = SkillRegistry;
//# sourceMappingURL=SkillRegistry.js.map