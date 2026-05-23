// Anti-trigger scoring — penalizes skills whose anti-triggers appear in a query

const PENALTY_PER_MATCH = 0.15;
const MAX_TOTAL_PENALTY = 0.5;

/**
 * Given a query and skill's anti_triggers list, compute penalty in range [0, -0.5].
 *
 * - Each matching anti-trigger adds -0.15 penalty (cumulative, max -0.5)
 * - No matches → no penalty (factor = 1.0)
 */
function computePenalty(query: string, antiTriggers: string[]): number {
  if (!antiTriggers || antiTriggers.length === 0) return 0;

  let totalPenalty = 0;
  const seen = new Set<string>();

  for (const trigger of antiTriggers) {
    // Skip duplicates
    const normalized = trigger.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);

    // Word boundary check: anti-trigger should appear as a distinct substring
    // Use regex with word boundaries to avoid matching "debug" in "debut"
    const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`\\b${escaped}\\b`, 'i');
    if (pattern.test(query)) {
      totalPenalty += PENALTY_PER_MATCH;
    }
  }

  // Clamp to [-0.5, 0]; coerce -0 to +0 for consistency
  const clamped = -Math.min(MAX_TOTAL_PENALTY, totalPenalty);
  return clamped === 0 ? 0 : clamped;
}

/**
 * Apply penalty to an existing score. Result clamped to [0, 1].
 */
function apply(
  score: number,
  query: string,
  antiTriggers: string[]
): number {
  const penalty = computePenalty(query, antiTriggers);
  const reduced = score + penalty; // penalty is negative, so this subtracts
  return Math.max(0, Math.min(1, reduced));
}

export const AntiTriggerScorer = { computePenalty, apply };
