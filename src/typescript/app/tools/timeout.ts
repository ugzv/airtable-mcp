import { InternalServerError } from '../../errors';

// Configurable tool-level timeout (default 60s)
export const TOOL_TIMEOUT_MS = parseInt(process.env.AIRTABLE_TOOL_TIMEOUT_MS || '', 10) || 60_000;

/**
 * Wraps a promise with a timeout. If the timeout expires, the promise is rejected
 * with an InternalServerError indicating a timeout.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      const timer = setTimeout(() => {
        reject(
          new InternalServerError(`${operation} timed out after ${timeoutMs}ms`, {
            status: 504
          })
        );
      }, timeoutMs);
      // Ensure the timer doesn't prevent process exit
      timer.unref?.();
    })
  ]);
}

/**
 * Wraps a tool handler function with a configurable timeout.
 * If the handler exceeds the timeout, returns an error response.
 */
export function withToolTimeout<TArgs, TResult>(
  toolName: string,
  handler: (args: TArgs, extra: unknown) => Promise<TResult>,
  timeoutMs: number = TOOL_TIMEOUT_MS
): (args: TArgs, extra: unknown) => Promise<TResult> {
  return async (args: TArgs, extra: unknown): Promise<TResult> => {
    return withTimeout(handler(args, extra), timeoutMs, `Tool '${toolName}'`);
  };
}
