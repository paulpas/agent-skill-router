"use strict";
// Vector Database - for skill retrieval using semantic similarity
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectorDatabase = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const Logger_js_1 = require("../observability/Logger.js");
/**
 * Vector database for skill retrieval
 */
class VectorDatabase {
    skills = [];
    config;
    indexLoaded = false;
    logger;
    constructor(config = {}) {
        this.config = {
            cacheDirectory: './.vector-cache',
            maxResults: 20,
            similarityThreshold: 0.3,
            ...config,
        };
        this.logger = new Logger_js_1.Logger('VectorDatabase', {
            level: 'info',
            includePayloads: false,
        });
    }
    /**
     * Add skills to the database
     */
    addSkills(skills) {
        this.skills.push(...skills);
        this.indexLoaded = true;
    }
    /**
     * Set skills from an array
     */
    setSkills(skills) {
        this.skills = skills;
        this.indexLoaded = true;
    }
    /**
     * Search for similar skills based on embedding
     */
    async search(queryEmbedding, topN) {
        if (!this.indexLoaded) {
            return [];
        }
        const results = await this.calculateSimilarity(queryEmbedding);
        const sorted = results.sort((a, b) => b.score - a.score);
        const limited = sorted.slice(0, topN ?? this.config.maxResults);
        return limited.filter((result) => result.score >= this.config.similarityThreshold);
    }
    /**
     * Calculate similarity between query and all skills
     */
    async calculateSimilarity(queryEmbedding) {
        const results = [];
        for (const skill of this.skills) {
            if (!skill.metadata.embedding) {
                continue;
            }
            const score = this.cosineSimilarity(queryEmbedding, skill.metadata.embedding);
            results.push({
                skill,
                score,
            });
        }
        return results;
    }
    /**
     * Calculate cosine similarity between two vectors
     */
    cosineSimilarity(vecA, vecB) {
        if (vecA.length !== vecB.length) {
            return 0;
        }
        let dotProduct = 0;
        let magnitudeA = 0;
        let magnitudeB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            magnitudeA += vecA[i] * vecA[i];
            magnitudeB += vecB[i] * vecB[i];
        }
        magnitudeA = Math.sqrt(magnitudeA);
        magnitudeB = Math.sqrt(magnitudeB);
        if (magnitudeA === 0 || magnitudeB === 0) {
            return 0;
        }
        return dotProduct / (magnitudeA * magnitudeB);
    }
    /**
     * Save the vector index to disk
     */
    async saveIndex() {
        try {
            await fs_1.promises.mkdir(this.config.cacheDirectory, { recursive: true });
            const indexData = {
                skills: this.skills.map((s) => ({
                    name: s.metadata.name,
                    category: s.metadata.category,
                    embedding: s.metadata.embedding,
                })),
                savedAt: new Date().toISOString(),
            };
            const indexFile = path_1.default.join(this.config.cacheDirectory, 'vector-index.json');
            await fs_1.promises.writeFile(indexFile, JSON.stringify(indexData, null, 2));
        }
        catch (error) {
            this.logger.error('Failed to save vector index:', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    /**
     * Load the vector index from disk
     */
    async loadIndex() {
        try {
            const indexFile = path_1.default.join(this.config.cacheDirectory, 'vector-index.json');
            const data = await fs_1.promises.readFile(indexFile, 'utf-8');
            const indexData = JSON.parse(data);
            this.skills = indexData.skills.map((skill) => ({
                metadata: {
                    name: skill.name,
                    category: skill.category,
                    description: '',
                    tags: [],
                    input_schema: {},
                    output_schema: {},
                    embedding: skill.embedding,
                },
                sourceFile: '',
                rawContent: '',
            }));
            this.indexLoaded = true;
        }
        catch (error) {
            this.logger.error('Failed to load vector index:', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    /**
     * Get all skills from the database
     */
    getAllSkills() {
        return this.skills;
    }
    /**
     * Get the number of skills in the database
     */
    size() {
        return this.skills.length;
    }
    /**
     * Clear the database
     */
    clear() {
        this.skills = [];
        this.indexLoaded = false;
    }
    /**
     * Filter skills by category
     */
    filterByCategory(category) {
        return this.skills.filter((skill) => skill.metadata.category === category);
    }
    /**
     * Filter skills by tag
     */
    filterByTag(tag) {
        return this.skills.filter((skill) => skill.metadata.tags.includes(tag));
    }
}
exports.VectorDatabase = VectorDatabase;
//# sourceMappingURL=VectorDatabase.js.map