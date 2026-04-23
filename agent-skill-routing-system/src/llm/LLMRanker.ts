// LLM Ranker - ranks skill candidates using an LLM

import type { SkillDefinition, SkillRanking, SelectedSkill } from '../core/types.js';
import { Logger } from '../observability/Logger.js';

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
export class LLMRanker {
  private config: LLMRankerConfig;
  private logger: Logger;

  constructor(config: Partial<LLMRankerConfig> = {}) {
    this.config = {
      model: 'gpt-4o-mini',
      temperature: 0.1,
      maxTokens: 1000,
      maxCandidates: 10,
      ...config,
    };
    this.logger = new Logger('LLMRanker', {
      level: 'info',
      includePayloads: false,
    });
  }

  /**
   * Rank skill candidates based on task description
   */
  async rankCandidates(
    task: string,
    candidates: SkillDefinition[]
  ): Promise<SelectedSkill[]> {
    if (candidates.length === 0) {
      return [];
    }

    // Limit to max candidates
    const limitedCandidates = candidates.slice(
      0,
      this.config.maxCandidates!
    );

    // Build prompt
    const prompt = this.buildRankingPrompt(task, limitedCandidates);

    // Get ranking from LLM
    const response = await this.callLLM(prompt);

    // Parse response
    const rankings = this.parseRankingResponse(
      response,
      limitedCandidates.map((c) => c.metadata.name)
    );

    // Convert to SelectedSkill format
    const selectedSkills: SelectedSkill[] = rankings.map((ranking, index) => ({
      name: ranking.skillName,
      score: ranking.score,
      role: index === 0 ? 'primary' : 'supporting',
      reasoning: ranking.reason,
    }));

    return selectedSkills;
   }

   /**
    * Build the ranking prompt for the LLM
    */
   private buildRankingPrompt(
     task: string,
     candidates: SkillDefinition[]
   ): string {
     const candidatesInfo = candidates
       .map(
         (c, index) => `
 ${index + 1}. ${c.metadata.name}
    Category: ${c.metadata.category}
    Description: ${c.metadata.description}
    Tags: ${c.metadata.tags.join(', ')}
 `
       )
       .join('\n');

     return `You are a skill router for an agentic coding system. Given a task, rank the most appropriate skills to execute it.

Task: ${task}

Available Skills:
${candidatesInfo}

Instructions:
1. Rank the skills from 1 (most relevant) to N (least relevant)
2. Assign a relevance score (0.0-1.0) to each skill
3. Provide a brief reason for each ranking
4. Only include skills with score >= 0.5

Output format (JSON):
{
  "rankings": [
    {
      "skillName": "skill-name-1",
      "score": 0.95,
      "reason": "Brief reason why this skill is relevant"
    },
    ...
  ]
}
`;
  }

  /**
   * Parse the LLM ranking response
   */
  private parseRankingResponse(
    response: string,
    availableSkills: string[]
  ): SkillRanking[] {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const json = JSON.parse(jsonMatch[0]);
        return json.rankings || [];
      }
    } catch (error) {
      this.logger.warn('Failed to parse LLM ranking response as JSON:', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Fallback: parse line by line
    const rankings: SkillRanking[] = [];
    const lines = response.split('\n');

    for (const line of lines) {
      const match = line.match(
        /(\d+)\.\s+(\S+)\s+score:\s*([\d.]+)\s*reason:\s*(.+)/i
      );
      if (match) {
        const [, , skillName, score, reason] = match;
        if (availableSkills.includes(skillName)) {
          rankings.push({
            skillName,
            score: parseFloat(score) || 0,
            reason: reason.trim(),
            confidence: 0.8,
          });
        }
      }
    }

    return rankings;
  }

  /**
   * Call the LLM API
   */
  private async callLLM(prompt: string): Promise<string> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content:
                'You are a precise skill router. Always output valid JSON.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `LLM API error: ${response.statusText} - ${JSON.stringify(errorData)}`
        );
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      this.logger.error('LLM call failed:', {
        error: error instanceof Error ? error.message : String(error),
      });
      return this.fallbackRanking();
    }
  }

  /**
   * Fallback ranking when LLM fails
   */
  private fallbackRanking(): string {
    return JSON.stringify({
      rankings: [
        {
          skillName: 'fallback-ranker',
          score: 0.5,
          reason: 'Fallback ranking due to LLM failure',
        },
      ],
    });
  }

  /**
   * Get the LLM model name
   */
  getModel(): string {
    return this.config.model;
  }
}
