// WeightedAggregator — Merge results from multiple intent-based retrievals with deduplication.

import type { IntentFragment } from './IntentDecomposer';

/**
 * A fragment-level result set returned by a sub-intent retrieval.
 */
export interface FragmentResults {
  /** The fragment this result set is for */
  fragment: string;
  /** Ranked list of skill IDs with raw scores */
  results: Array<{ id: string; score: number }>;
}

/**
 * A deduplicated, aggregated result with contributing fragment information.
 */
export interface AggregatedResult {
  /** Unique skill ID */
  id: string;
  /** Combined weighted score across all contributing fragments */
  score: number;
  /** Which fragments contributed to this result and their weights */
  contributingFragments: Array<{ fragment: string; weight: number }>;
}

/**
 * WeightedAggregator — combines results from separate intent-based retrievals.
 *
 * For each skill appearing in one or more fragment results:
 *   aggregated_score = Σ (fragment_weight × raw_score_for_fragment)
 *
 * Skills are deduplicated, keeping the highest combined score, then sorted descending.
 */
export class WeightedAggregator {
  /**
   * Aggregate results from multiple intent retrievals.
   *
   * @param fragments       — list of intent fragments with their weights.
   * @param fragmentResults — per-fragment ranked result sets.
   * @returns sorted, deduplicated aggregated results with contributing fragment info.
   */
  static aggregate(
    fragments: IntentFragment[],
    fragmentResults: FragmentResults[]
  ): AggregatedResult[] {
    // Early exit: empty inputs
    if (fragments.length === 0 || fragmentResults.length === 0) {
      return [];
    }

    // Build a weight lookup for quick access
    const weightMap = new Map<string, number>();
    for (const f of fragments) {
      weightMap.set(f.intent, f.weight);
    }

    // Accumulate: skillId → { score, contributingFragments[] }
    const aggregated = new Map<string, AggregatedResult>();

    for (const fragmentRes of fragmentResults) {
      if (!fragmentRes.results || fragmentRes.results.length === 0) continue;

      const weight = weightMap.get(fragmentRes.fragment) ?? 1.0;

      for (const result of fragmentRes.results) {
        // Weighted score = fragment weight × raw score
        const weightedScore = weight * result.score;

        if (aggregated.has(result.id)) {
          const existing = aggregated.get(result.id)!;
          // Add to combined score
          existing.score += weightedScore;
          // Track contributing fragment if not already tracked
          if (!existing.contributingFragments.some((cf) => cf.fragment === fragmentRes.fragment)) {
            existing.contributingFragments.push({
              fragment: fragmentRes.fragment,
              weight,
            });
          }
        } else {
          aggregated.set(result.id, {
            id: result.id,
            score: weightedScore,
            contributingFragments: [
              { fragment: fragmentRes.fragment, weight },
            ],
          });
        }
      }
    }

    if (aggregated.size === 0) return [];

    // Sort by combined score descending
    const results = [...aggregated.values()];
    results.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Tiebreak: more contributing fragments wins
      return b.contributingFragments.length - a.contributingFragments.length;
    });

    return results;
  }

  /**
   * Simple deduplication — keep the highest score for each skill ID.
   *
   * @param results — potentially duplicate ranked results.
   * @returns deduplicated results sorted by score descending.
   */
  static deduplicate(
    results: Array<{ id: string; score: number }>
  ): Array<{ id: string; score: number }> {
    if (results.length === 0) return [];

    const best = new Map<string, number>();
    for (const r of results) {
      const current = best.get(r.id);
      if (current === undefined || r.score > current) {
        best.set(r.id, r.score);
      }
    }

    return [...best.entries()]
      .map(([id, score]) => ({ id, score }))
      .sort((a, b) => b.score - a.score);
  }
}
