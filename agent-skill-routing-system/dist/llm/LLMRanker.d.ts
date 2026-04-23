import type { SkillDefinition, SelectedSkill } from '../core/types.js';
/**
 * Configuration for the LLM ranker
 */
export interface LLMRankerConfig {
    apiKey?: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
    maxCandidates?: number;
}
/**
 * LLM-based skill ranker
 */
export declare class LLMRanker {
    private config;
    private logger;
    constructor(config?: Partial<LLMRankerConfig>);
    /**
     * Rank skill candidates based on task description
     */
    rankCandidates(task: string, candidates: SkillDefinition[]): Promise<SelectedSkill[]>;
    /**
     * Build the ranking prompt for the LLM
     */
    private buildRankingPrompt;
    /**
     * Parse the LLM ranking response
     */
    private parseRankingResponse;
    /**
     * Call the LLM API
     */
    private callLLM;
    /**
     * Fallback ranking when LLM fails
     */
    private fallbackRanking;
    /**
     * Get the LLM model name
     */
    getModel(): string;
}
//# sourceMappingURL=LLMRanker.d.ts.map