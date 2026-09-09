/**
 * RouterTimeoutProtection — deadline enforcement for skill router HTTP handlers.
 *
 * Wraps async request handlers with a configurable timeout using Promise.race.
 * If the handler exceeds the deadline, returns a structured StallTimeoutError response.
 * This prevents hung embedding/LLM calls from blocking the server indefinitely.
 */

/** Error thrown when a request exceeds its configured timeout deadline. */
export class StallTimeoutError extends Error {
  public readonly sessionId: string;
  public readonly route: string;
  public readonly elapsedMs: number;
  public readonly deadlineMs: number;
  public readonly recoveryHint: string;

  constructor({ sessionId, route, elapsedMs, deadlineMs }: {
    sessionId: string;
    route: string;
    elapsedMs: number;
    deadlineMs: number;
  }) {
    super([
      `StallTimeoutError: Request to ${route} timed out after ${elapsedMs}ms`,
      `(deadline was ${deadlineMs}ms)`,
      `Session: ${sessionId}`,
    ].join(' '));
    this.name = 'StallTimeoutError';
    this.sessionId = sessionId;
    this.route = route;
    this.elapsedMs = elapsedMs;
    this.deadlineMs = deadlineMs;
    this.recoveryHint = 'Trigger auto-respawn and re-inject conversation history with loop-guard instruction.';
  }
}

/**
 * Wrap a promise with a configurable timeout.
 *
 * @param promise - The async operation to protect
 * @param deadlineMs - Maximum allowed execution time in milliseconds
 * @param sessionId - Session identifier for error reporting
 * @param route - Route path for logging
 * @returns A promise that resolves/rejects with the wrapped operation's result
 */
export function withTimeout<T>(
  promise: Promise<T>,
  deadlineMs: number,
  sessionId: string,
  route: string
): Promise<T> {
  return new Promise<T>((_resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new StallTimeoutError({ sessionId, route, elapsedMs: 0, deadlineMs }));
    }, deadlineMs);

    promise.then(
      (result) => {
        clearTimeout(timer);
        _resolve(result);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/**
 * Default timeout configuration for each endpoint.
 */
export const ROUTER_TIMEOUT_CONFIG = {
  route: Number(process.env['ROUTE_TIMEOUT_MS'] || 60_000),   // 60s default for skill routing
  execute: Number(process.env['EXECUTE_TIMEOUT_MS'] || 120_000), // 120s default for full execution
};
