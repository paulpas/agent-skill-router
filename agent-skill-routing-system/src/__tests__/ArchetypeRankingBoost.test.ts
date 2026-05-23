// Tests for ArchetypeRankingBoost
import { ArchetypeRankingBoost } from '../core/ArchetypeRankingBoost';

describe('ArchetypeRankingBoost', () => {
  // --- Full match ---
  describe('full match', () => {
    it("['tactical', 'diagnostic'] vs ['tactical', 'diagnostic'] → 1.30", () => {
      const factor = ArchetypeRankingBoost.computeBoost(
        ['tactical', 'diagnostic'],
        ['tactical', 'diagnostic']
      );
      expect(factor).toBeCloseTo(1.30, 2);
    });

    it("['strategic'] vs ['strategic'] → 1.30", () => {
      const factor = ArchetypeRankingBoost.computeBoost(['strategic'], ['strategic']);
      expect(factor).toBeCloseTo(1.30, 2);
    });
  });

  // --- Partial match ---
  describe('partial match', () => {
    it("['tactical', 'strategic'] vs ['tactical'] → 1.10", () => {
      const factor = ArchetypeRankingBoost.computeBoost(
        ['tactical', 'strategic'],
        ['tactical']
      );
      expect(factor).toBeCloseTo(1.10, 2);
    });

    it("['educational', 'tactical'] vs ['tactical', 'educational'] → 1.30 (full)", () => {
      const factor = ArchetypeRankingBoost.computeBoost(
        ['educational', 'tactical'],
        ['tactical', 'educational']
      );
      expect(factor).toBeCloseTo(1.30, 2);
    });

    it("['tactical'] vs ['tactical', 'strategic', 'diagnostic'] → 1.30 (full)", () => {
      const factor = ArchetypeRankingBoost.computeBoost(['tactical'], ['tactical', 'strategic', 'diagnostic']);
      expect(factor).toBeCloseTo(1.30, 2);
    });
  });

  // --- No match ---
  describe('no match', () => {
    it("['tactical'] vs ['educational'] → penalty 0.80", () => {
      const factor = ArchetypeRankingBoost.computeBoost(['tactical'], ['educational']);
      expect(factor).toBeCloseTo(0.80, 2);
    });

    it("['strategic'] vs ['tactical', 'diagnostic'] → 1.00", () => {
      const factor = ArchetypeRankingBoost.computeBoost(['strategic'], ['tactical', 'diagnostic']);
      expect(factor).toBeCloseTo(1.00, 2);
    });

    it("['generation'] vs ['orchestration'] → 1.00", () => {
      const factor = ArchetypeRankingBoost.computeBoost(['generation'], ['orchestration']);
      expect(factor).toBeCloseTo(1.00, 2);
    });
  });

  // --- Empty inputs ---
  describe('empty inputs', () => {
    it('empty skill archetypes: any query vs [] → 1.00', () => {
      const factor = ArchetypeRankingBoost.computeBoost(['tactical'], []);
      expect(factor).toBeCloseTo(1.00, 2);
    });

    it('empty query archetypes: [] vs any skill → 1.00', () => {
      const factor = ArchetypeRankingBoost.computeBoost([], ['tactical']);
      expect(factor).toBeCloseTo(1.00, 2);
    });

    it('both empty → 1.00', () => {
      const factor = ArchetypeRankingBoost.computeBoost([], []);
      expect(factor).toBeCloseTo(1.00, 2);
    });
  });

  // --- Penalty cases ---
  describe('penalty for archetype mismatch', () => {
    it("tactical vs educational → factor should be 0.80", () => {
      const factor = ArchetypeRankingBoost.computeBoost(['tactical'], ['educational']);
      expect(factor).toBeCloseTo(0.80, 2);
    });

    it("tactical vs strategic → factor should be 0.80", () => {
      const factor = ArchetypeRankingBoost.computeBoost(['tactical'], ['strategic']);
      expect(factor).toBeCloseTo(0.80, 2);
    });

    it("tactical vs [educational, strategic] → floor at 0.50", () => {
      const factor = ArchetypeRankingBoost.computeBoost(['tactical'], ['educational', 'strategic']);
      expect(factor).toBeCloseTo(0.80, 2);
    });

    it("tactical vs enforcement → no penalty (1.00)", () => {
      // enforcement is not in the penalty list for tactical queries
      const factor = ArchetypeRankingBoost.computeBoost(['tactical'], ['enforcement']);
      expect(factor).toBeCloseTo(1.00, 2);
    });

    it("strategic vs educational → no penalty (1.00)", () => {
      const factor = ArchetypeRankingBoost.computeBoost(['strategic'], ['educational']);
      expect(factor).toBeCloseTo(1.00, 2);
    });
  });

  // --- Apply function ---
  describe('apply function', () => {
    it('score 0.77 + boost 1.3 → capped at 1.0 (max score)', () => {
      const result = ArchetypeRankingBoost.apply(0.77, ['tactical'], ['tactical']);
      expect(result).toBeCloseTo(1.0, 2); // 0.77 * 1.3 = 1.001 → capped at 1.0
    });

    it('score 0.7 + boost 1.3 → 0.91', () => {
      const result = ArchetypeRankingBoost.apply(0.7, ['tactical'], ['tactical']);
      expect(result).toBeCloseTo(0.91, 2); // 0.7 * 1.3 = 0.91
    });

    it('score 0.5 + boost 1.1 → 0.55', () => {
      const result = ArchetypeRankingBoost.apply(0.5, ['tactical'], ['tactical']);
      expect(result).toBeCloseTo(0.65, 2); // 0.5 * 1.3 = 0.65 (full match)
    });

    it('score 0.1 with no boost → 0.1', () => {
      const result = ArchetypeRankingBoost.apply(0.1, ['strategic'], ['tactical']);
      expect(result).toBeCloseTo(0.1, 2); // 0.1 * 1.0 = 0.1 (no overlap, no penalty)
    });

    it('score boundary: apply to score 0 with boost → still 0', () => {
      const result = ArchetypeRankingBoost.apply(0, ['tactical'], ['tactical']);
      expect(result).toBeCloseTo(0, 2); // 0 * 1.3 = 0
    });

    it('score 1 with any boost → stays 1', () => {
      const result = ArchetypeRankingBoost.apply(1, ['tactical'], ['tactical']);
      expect(result).toBeCloseTo(1, 2); // min(1, 1 * 1.3) = 1
    });

    it('score 0.5 with penalty (tactical vs educational) → floor at max(score*0.8, 0)', () => {
      const result = ArchetypeRankingBoost.apply(0.5, ['tactical'], ['educational']);
      expect(result).toBeCloseTo(0.4, 2); // 0.5 * 0.8 = 0.4
    });

    it('score 0.3 with penalty (tactical vs educational) → 0.24', () => {
      const result = ArchetypeRankingBoost.apply(0.3, ['tactical'], ['educational']);
      expect(result).toBeCloseTo(0.24, 2); // 0.3 * 0.8 = 0.24
    });
  });

  // --- Case insensitivity ---
  describe('case handling', () => {
    it('handles mixed-case archetype names', () => {
      const factor = ArchetypeRankingBoost.computeBoost(
        ['Tactical', 'DiAgNoStIc'],
        ['TACTICAL', 'diagnostic']
      );
      expect(factor).toBeCloseTo(1.30, 2);
    });

    it('apply handles mixed case too', () => {
      const result = ArchetypeRankingBoost.apply(0.7, ['Tactical'], ['tactical']);
      expect(result).toBeCloseTo(0.91, 2); // 0.7 * 1.3 = 0.91
    });
  });
});
