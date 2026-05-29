// ScoreExplanationBuilder — Build human-readable score explanations for every routed query.

/**
 * Per-component score breakdown for a single routed skill.
 * All numeric values are in [0, 1] unless noted.
 */
export interface ScoreBreakdown {
  /** Vector similarity score from the embedding search */
  vectorScore?: number;
  /** BM25 keyword-matching score */
  bm25Score?: number;
  /** Trigger match score from tag/keyword overlap */
  triggerMatchScore?: number;
  /** Archetype alignment boost */
  archetypeScore?: number;
  /** Specificity score (higher = more specialized skill) */
  specificityScore?: number;
  /** Conciseness score of the skill's content */
  concisenessScore?: number;
  /** MMR diversity penalty applied during selection (negative value) */
  mmerPenalty?: number;
  /** Final combined ranking score [0, 1] */
  finalScore: number;
}

/**
 * Debug JSON shape produced by buildDebugJson.
 */
export interface ScoreDebugJson {
  query: string;
  timestamp: string;
  candidateCount: number;
  candidates: Array<{
    name: string;
    scoreBreakdown: ScoreBreakdown;
    explanation: string[];
  }>;
}

/**
 * ScoreExplanationBuilder — generates human-readable explanations
 * for why a skill received its ranking position.
 */
export class ScoreExplanationBuilder {
  /**
   * Build a score breakdown object from raw component values.
   *
   * @param components — arbitrary key-value pairs mapping to score components.
   * @returns a properly typed ScoreBreakdown with finalScore computed.
   */
  static buildBreakdown(components: Record<string, number>): ScoreBreakdown {
    const breakdown: ScoreBreakdown = {
      finalScore: 0,
    };

    // Map known component names to their fields
    if (components.vectorSimilarity !== undefined || components.vectorScore !== undefined) {
      breakdown.vectorScore = components.vectorSimilarity ?? components.vectorScore;
    }
    if (components.bm25Score !== undefined) {
      breakdown.bm25Score = components.bm25Score;
    }
    if (components.triggerMatchScore !== undefined) {
      breakdown.triggerMatchScore = components.triggerMatchScore;
    }
    if (components.archetypeBoost !== undefined || components.archetypeScore !== undefined) {
      breakdown.archetypeScore = components.archetypeBoost ?? components.archetypeScore;
    }
    if (components.specificityScore !== undefined) {
      breakdown.specificityScore = components.specificityScore;
    }
    if (components.concisenessScore !== undefined) {
      breakdown.concisenessScore = components.concisenessScore;
    }
    if (components.mmerPenalty !== undefined || components.mmrPenalty !== undefined) {
      breakdown.mmerPenalty = components.mmerPenalty ?? components.mmrPenalty;
    }

    // If finalScore was not explicitly provided, compute a weighted average
    if (breakdown.finalScore === 0) {
      const scores = [
        breakdown.vectorScore,
        breakdown.bm25Score,
        breakdown.triggerMatchScore,
        breakdown.archetypeScore,
        breakdown.specificityScore,
        breakdown.concisenessScore,
      ].filter((s): s is number => s !== undefined);

      if (scores.length > 0) {
        // Use vector score as primary weight
        const weightedSum =
          ((breakdown.vectorScore ?? 0) * 0.5) +
          ((breakdown.bm25Score ?? 0) * 0.2) +
          ((breakdown.triggerMatchScore ?? 0) * 0.15) +
          ((breakdown.archetypeScore ?? 0) * 0.1) +
          ((breakdown.specificityScore ?? 0) * 0.05);

        let computed = weightedSum / (0.5 + 0.2 + 0.15 + 0.1 + 0.05); // normalize by weight sum
        // Apply MMR penalty if present
        if (breakdown.mmerPenalty !== undefined) {
          computed += breakdown.mmerPenalty;
        }
        breakdown.finalScore = clamp(computed, 0, 1);
      }
    }

    return breakdown;
  }

  /**
   * Generate human-readable explanation sentences for a skill's ranking.
   *
   * Each non-trivial component produces one explanation line.
   */
  static generateExplanation(
    skillName: string,
    breakdown: ScoreBreakdown
  ): string[] {
    const explanations: string[] = [];

    // Vector score explanation
    if (breakdown.vectorScore !== undefined) {
      if (breakdown.vectorScore >= 0.8) {
        explanations.push(
          `Strong semantic match to your query intent (vector similarity: ${format(breakdown.vectorScore)})`
        );
      } else if (breakdown.vectorScore >= 0.5) {
        explanations.push(
          `Moderate semantic relevance to your query (vector similarity: ${format(breakdown.vectorScore)})`
        );
      } else {
        explanations.push(
          `Weak semantic match to your query intent (vector similarity: ${format(breakdown.vectorScore)})`
        );
      }
    }

    // BM25 score explanation
    if (breakdown.bm25Score !== undefined) {
      if (breakdown.bm25Score >= 0.7) {
        explanations.push(
          `Keyword match confirms this skill addresses your query terms (BM25: ${format(breakdown.bm25Score)})`
        );
      } else if (breakdown.bm25Score > 0) {
        explanations.push(
          `Some keyword overlap with your query (BM25: ${format(breakdown.bm25Score)})`
        );
      }
    }

    // Trigger match explanation
    if (breakdown.triggerMatchScore !== undefined) {
      if (breakdown.triggerMatchScore >= 0.7) {
        explanations.push(
          `Skill triggers closely match your query language (trigger match: ${format(breakdown.triggerMatchScore)})`
        );
      } else if (breakdown.triggerMatchScore > 0) {
        explanations.push(
          `Partial trigger overlap with your query (trigger match: ${format(breakdown.triggerMatchScore)})`
        );
      }
    }

    // Archetype score explanation
    if (breakdown.archetypeScore !== undefined) {
      if (breakdown.archetypeScore >= 0.8) {
        explanations.push(
          `Skill archetype aligns well with your task category (archetype: ${format(breakdown.archetypeScore)})`
        );
      } else if (breakdown.archetypeScore > 0) {
        explanations.push(
          `Some archetype alignment with your task category (archetype: ${format(breakdown.archetypeScore)})`
        );
      }
    }

    // Specificity explanation — only for lower scores (cautionary)
    if (breakdown.specificityScore !== undefined) {
      if (breakdown.specificityScore < 0.3) {
        explanations.push(
          `General-purpose skill, may not be the most specialized option (specificity: ${format(breakdown.specificityScore)})`
        );
      } else if (breakdown.specificityScore >= 0.7) {
        explanations.push(
          `Highly specialized for your use case (specificity: ${format(breakdown.specificityScore)})`
        );
      }
    }

    // Conciseness explanation
    if (breakdown.concisenessScore !== undefined) {
      if (breakdown.concisenessScore >= 0.7) {
        explanations.push(
          `Skill content is concise and focused (conciseness: ${format(breakdown.concisenessScore)})`
        );
      } else if (breakdown.concisenessScore < 0.3) {
        explanations.push(
          `Skill content may be verbose or unfocused (conciseness: ${format(breakdown.concisenessScore)})`
        );
      }
    }

    // MMR penalty explanation
    if (breakdown.mmerPenalty !== undefined && breakdown.mmerPenalty < 0) {
      explanations.push(
        `Similar skills already selected; this is a complementary choice (MMR penalty: ${format(breakdown.mmerPenalty)})`
      );
    }

    // Final score summary
    if (explanations.length === 0) {
      explanations.push(
        `Ranked by overall relevance (${skillName}: ${format(breakdown.finalScore)})`
      );
    } else {
      explanations.push(
        `Final ranking score: ${format(breakdown.finalScore)} for ${skillName}`
      );
    }

    return explanations;
  }

  /**
   * Build full debugging JSON for a routing result.
   *
   * Contains the original query and an array of all candidate skills
   * with their score breakdowns and explanations.
   */
  static buildDebugJson(
    query: string,
    skills: Array<{ name: string; breakdown: ScoreBreakdown }>
  ): ScoreDebugJson {
    return {
      query,
      timestamp: new Date().toISOString(),
      candidateCount: skills.length,
      candidates: skills.map((skill) => ({
        name: skill.name,
        scoreBreakdown: { ...skill.breakdown },
        explanation: this.generateExplanation(skill.name, skill.breakdown),
      })),
    };
  }
}

/** Format a number to 2 decimal places. */
function format(v: number): string {
  return v.toFixed(2);
}

/** Clamp value to [0, 1]. */
function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
