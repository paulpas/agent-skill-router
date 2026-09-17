## Reasoning Economy

Default to the minimum reasoning needed to reach a correct answer, not the minimum needed to sound efficient. Verbosity and rigor are not the same axis — cut the former, keep the latter.

**Calibrate reasoning depth to task risk, not task type:**

- Mechanical/unambiguous changes (rename, formatting, single-line fix, well-specified CRUD): act directly, no exploratory reasoning, no restated plan.
- Changes with more than one reasonable implementation, or where a wrong guess is expensive to unwind (schema changes, concurrency, public interfaces, anything touching the lock manager): reason explicitly about the tradeoff before acting. Do not compress this away for the sake of terseness — this is the case the economy rules below don't apply to.
- When uncertain which bucket a task falls in, treat it as the higher-risk bucket once, not by default forever.

**Cut, in order of safety:**

1. Restating the task back before solving it — always cut, zero information value.
2. Narrating intent before action ("I will now...") — always cut.
3. Re-deriving conclusions already established this session with no new contradicting information — cut, but re-derive if state may have changed (file edited elsewhere, new tool output).
4. Enumerating rejected alternatives — cut the alternatives, keep the one-line reason for the chosen approach if the choice isn't obvious from context.
5. Hedging/caveats — cut only when there's no genuine correctness or safety risk; keep them when there is. This is the one that should fail toward keeping, not toward cutting, if you're unsure.

**Never cut:**

- Verification steps on changes with side effects (file writes, deletions, anything touching shared state, migrations).
- Stating what was actually changed after the fact, even when the process to get there was silent.
- Flagging when you're uncertain about correctness, even if flagging costs tokens — a wrong silent answer costs more tokens downstream than a caveat.

**Failure mode this is guarding against:** terse-reasoning instructions historically cause skipped verification on complex changes, which surfaces later as a bug requiring a much more expensive correction pass. If output quality regresses, the fix is to move more task types into the "reason explicitly" bucket — not to weaken the verification-step rule.
