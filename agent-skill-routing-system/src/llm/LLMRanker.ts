// LLM Ranker - ranks skill candidates using OpenAI, Anthropic, or llama.cpp

import type { SkillDefinition, SkillRanking, SelectedSkill, SkillRankingResult } from '../core/types.js';
import { Logger } from '../observability/Logger.js';

export type LLMProvider = 'openai' | 'anthropic' | 'llamacpp';

export interface LLMRankerConfig {
  provider?: LLMProvider;
  /** OpenAI API key (required for openai provider; also used for embeddings) */
  apiKey?: string;
  /** Anthropic API key (required for anthropic provider) */
  anthropicApiKey?: string;
  /** llama.cpp base URL e.g. http://localhost:8080 (required for llamacpp provider) */
  llamacppBaseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  maxCandidates?: number;
}

export class LLMRanker {
  private config: Required<LLMRankerConfig>;
  private logger: Logger;
  private rankingCache: Map<string, SkillRankingResult[]> = new Map();
  private inputTokens: number = 0;
  private outputTokens: number = 0;

  constructor(config: Partial<LLMRankerConfig> = {}) {
    const provider = (process.env.LLM_PROVIDER as LLMProvider) || config.provider || 'openai';
    this.config = {
      provider,
      apiKey: config.apiKey || process.env.OPENAI_API_KEY || '',
      anthropicApiKey: config.anthropicApiKey || process.env.ANTHROPIC_API_KEY || '',
      llamacppBaseUrl: config.llamacppBaseUrl || process.env.LLAMACPP_BASE_URL || 'http://localhost:8080',
      model: config.model || process.env.LLM_MODEL || this.defaultModel(provider),
      temperature: config.temperature ?? 0,
      maxTokens: config.maxTokens ?? 400,
      maxCandidates: config.maxCandidates ?? 10,
    };
    this.logger = new Logger('LLMRanker');
    this.logger.info(`LLMRanker initialized`, { provider: this.config.provider, model: this.config.model });
  }

  /**
   * Deterministic hash key for a task + candidate set combination.
   * Used to avoid redundant LLM calls for identical routing requests.
   */
  private hashKey(task: string, candidates: SkillDefinition[]): string {
    const key = task.trim().toLowerCase() + '|' + candidates.map(c => c.metadata.name).sort().join(',');
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(16).padStart(8, '0');
  }

  private defaultModel(provider: LLMProvider): string {
    switch (provider) {
      case 'anthropic': return 'claude-3-5-haiku-20241022';
      case 'llamacpp':  return 'local-model';
      default:          return 'gpt-4o-mini';
    }
  }

  async rankCandidates(task: string, candidates: SkillDefinition[]): Promise<SkillRankingResult[]> {
    if (candidates.length === 0) return [];

    const limited = candidates.slice(0, this.config.maxCandidates);

    // Check ranking cache first — avoids ~3s LLM round-trip for repeated queries
    const cacheKey = this.hashKey(task, limited);
    const cached = this.rankingCache.get(cacheKey);
    if (cached) {
      this.logger.info('[CACHE HIT] LLM ranking (memory) — remote call avoided', {
        cacheKey,
        task: task.slice(0, 80),
        topSkill: cached[0]?.name ?? null,
        savedMs: '~3000ms',
      });
      return cached;
    }

    const prompt = this.buildRankingPrompt(task, limited);

    // Log what we're sending to the LLM
    this.logger.info('Sending ranking request to LLM', {
      provider: this.config.provider,
      model: this.config.model,
      task: task.slice(0, 120),
      candidateCount: limited.length,
      candidates: limited.map(c => c.metadata.name),
    });

    const t0 = Date.now();
    const response = await this.callLLM(prompt);
    const durationMs = Date.now() - t0;

    // Log raw LLM response
    this.logger.debug('LLM raw response', {
      durationMs,
      responseLength: response.length,
      response: response.slice(0, 500),  // truncate very long responses
    });

    const rankings = this.parseRankingResponse(response, limited.map(c => c.metadata.name));

    // Log parsed rankings
    this.logger.info('LLM ranking result', {
      durationMs,
      rankedCount: rankings.length,
      rankings: rankings.map(r => ({ skill: r.skillName, score: r.score, reason: r.reason?.slice(0, 80) })),
    });

    // Log token usage
    this.logger.debug('LLM token usage', {
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
    });

    // Track total tokens for the entire ranking request
    const totalInputTokens = this.inputTokens;
    const totalOutputTokens = this.outputTokens;

    const result: SkillRankingResult[] = rankings.map((ranking, index) => ({
      name: ranking.skillName,
      score: ranking.score,
      role: (index === 0 ? 'primary' : 'supporting') as SelectedSkill['role'],
      reasoning: ranking.reason,
      // Per-skill token counts are undefined since the tokens are for the entire request
      inputTokens: undefined,
      outputTokens: undefined,
      totalInputTokens,
      totalOutputTokens,
    }));

    this.rankingCache.set(cacheKey, result);
    this.logger.info('[CACHE STORE] LLM ranking cached', {
      cacheKey,
      topSkill: result[0]?.name ?? null,
      cacheSize: this.rankingCache.size,
    });

    return result;
  }

  private buildRankingPrompt(task: string, candidates: SkillDefinition[]): string {
    const candidateLines = candidates
      .map((c, i) => `${i + 1}. ${c.metadata.name}: ${c.metadata.description}`)
      .join('\n');

    return `Task: "${task}"

Candidate skills:
${candidateLines}

Rank these skills by relevance to the task.

Return ONLY this JSON (no prose, no markdown, no explanation):
{
  "rankings": [
    {"skillName": "<name>", "score": 0.0, "reason": "<10 words max>"}
  ]
}

Rules:
- score 0.0-1.0 (1.0 = perfect match)
- reason must be 10 words or fewer
- include only skills with score >= 0.3
- order by score descending`;
  }

  private async callLLM(prompt: string): Promise<string> {
    try {
      switch (this.config.provider) {
        case 'anthropic': return await this.callAnthropic(prompt);
        case 'llamacpp':  return await this.callOpenAICompatible(prompt, this.config.llamacppBaseUrl);
        default:          return await this.callOpenAICompatible(prompt, 'https://api.openai.com');
      }
    } catch (error) {
      this.logger.error('LLM call failed, using fallback ranking', {
        provider: this.config.provider,
        model: this.config.model,
        error: error instanceof Error ? error.message : String(error),
      });
      return this.fallbackRanking();
    }
  }

  /** OpenAI-compatible endpoint (used for both openai and llamacpp) */
  private async callOpenAICompatible(prompt: string, baseUrl: string): Promise<string> {
    const apiKey = this.config.provider === 'llamacpp'
      ? (this.config.apiKey || 'no-key')  // llama.cpp doesn't require a real key
      : this.config.apiKey;

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: 'system', content: 'You are a skill-routing classifier. Respond ONLY with valid JSON. No explanation, no markdown, no preamble. Output nothing except the JSON object requested.' },
          { role: 'user', content: prompt },
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`${baseUrl} API error ${response.status}: ${err}`);
    }

    const data = await response.json() as { 
      choices: { message: { content: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    
    // Track token usage
    const usage = data.usage || {};
    this.inputTokens = usage.prompt_tokens ?? 0;
    this.outputTokens = usage.completion_tokens ?? 0;
    
    return data.choices[0].message.content;
  }

  /** Anthropic Messages API */
  private async callAnthropic(prompt: string): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        system: 'You are a skill-routing classifier. Respond ONLY with valid JSON. No explanation, no markdown, no preamble. Output nothing except the JSON object requested.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API error ${response.status}: ${err}`);
    }

    const data = await response.json() as { 
      content: { type: string; text: string }[];
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    
    // Track token usage
    const usage = data.usage || {};
    this.inputTokens = usage.input_tokens ?? 0;
    this.outputTokens = usage.output_tokens ?? 0;
    
    const textBlock = data.content.find(b => b.type === 'text');
    if (!textBlock) throw new Error('Anthropic response contained no text block');
    return textBlock.text;
  }

  private parseRankingResponse(response: string, availableSkills: string[]): SkillRanking[] {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const json = JSON.parse(jsonMatch[0]) as { rankings?: SkillRanking[] };
        return (json.rankings || []).filter(r => availableSkills.includes(r.skillName));
      }
    } catch (error) {
      this.logger.warn('Failed to parse LLM ranking response as JSON', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // line-by-line fallback
    const rankings: SkillRanking[] = [];
    for (const line of response.split('\n')) {
      const match = line.match(/(\d+)\.\s+(\S+)\s+score:\s*([\d.]+)\s*reason:\s*(.+)/i);
      if (match) {
        const [, , skillName, score, reason] = match;
        if (availableSkills.includes(skillName)) {
          rankings.push({ skillName, score: parseFloat(score) || 0, reason: reason.trim(), confidence: 0.8 });
        }
      }
    }
    return rankings;
  }

  private fallbackRanking(): string {
    return JSON.stringify({ rankings: [{ skillName: 'fallback', score: 0.5, reason: 'LLM unavailable' }] });
  }

  getModel(): string { return this.config.model; }
  getProvider(): LLMProvider { return this.config.provider; }

  getInputTokens(): number { return this.inputTokens; }
  getOutputTokens(): number { return this.outputTokens; }

  /**
   * Reset token counters - useful for testing or fresh sessions
   */
  resetTokenCounters(): void {
    this.inputTokens = 0;
    this.outputTokens = 0;
  }
}
