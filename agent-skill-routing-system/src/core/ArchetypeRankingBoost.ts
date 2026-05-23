// Archetype-based ranking boost computation

/**
 * Given inferred query archetypes and a skill's declared archetypes,
 * compute a boost factor in range [0.5, 1.3].
 *
 * - Full match (all query archetypes found in skill): +30%
 * - Partial match (at least one query archetype found): +10%
 * - No match: no change (factor = 1.0)
 * - Penalty for mismatched enforcement/educational vs tactical queries: -20%
 */
function computeBoost(
  queryArchetypes: string[],
  skillArchetypes: string[]
): number {
  // Guard: empty inputs → no boost or penalty
  if (!queryArchetypes || queryArchetypes.length === 0) return 1.0;
  if (!skillArchetypes || skillArchetypes.length === 0) return 1.0;

  const skillSet = new Set(skillArchetypes.map((a) => a.toLowerCase()));

  // Find overlap using query archetypes directly (querySet not needed separately)
  const overlap = queryArchetypes.filter((q) => skillSet.has(q.toLowerCase()));

  if (overlap.length === 0) {
    // No archetype overlap → check for penalty cases
    return applyPenalty(queryArchetypes, skillArchetypes);
  }

  // Full match: all query archetypes are found in the skill
  if (overlap.length === queryArchetypes.length) {
    return 1.30;
  }

  // Partial match: at least one overlap but not all
  return 1.10;
}

/**
 * Apply penalty for mismatched archetypes when there's no overlap.
 */
function applyPenalty(
  queryArchetypes: string[],
  skillArchetypes: string[]
): number {
  const querySet = new Set(queryArchetypes.map((a) => a.toLowerCase()));
  const skillSet = new Set(skillArchetypes.map((a) => a.toLowerCase()));

  // Penalty case: tactical query + only educational/strategic skill
  if (querySet.has('tactical')) {
    for (const skillArch of skillArchetypes) {
      const lower = skillArch.toLowerCase();
      if (lower === 'educational' || lower === 'strategic') {
        // Check that there's NO overlap with enforcement/educational
        if (!skillSet.has('enforcement')) {
          return Math.max(0.5, 1.0 - 0.2); // floor at 0.5
        }
      }
    }
  }

  return 1.0;
}

/**
 * Apply boost to an existing score, clamping to [0, 1].
 */
function apply(
  score: number,
  queryArchetypes: string[],
  skillArchetypes: string[]
): number {
  const factor = computeBoost(queryArchetypes, skillArchetypes);
  const boosted = score * factor;
  return Math.max(0, Math.min(1, boosted));
}

export const ArchetypeRankingBoost = { computeBoost, apply };
