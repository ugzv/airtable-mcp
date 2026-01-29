export declare const TOOL_TIMEOUT_MS: number;
/**
 * Wraps a promise with a timeout. If the timeout expires, the promise is rejected
 * with an InternalServerError indicating a timeout.
 */
export declare function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T>;
/**
 * Wraps a tool handler function with a configurable timeout.
 * If the handler exceeds the timeout, returns an error response.
 */
export declare function withToolTimeout<TArgs, TResult>(toolName: string, handler: (args: TArgs, extra: unknown) => Promise<TResult>, timeoutMs?: number): (args: TArgs, extra: unknown) => Promise<TResult>;
