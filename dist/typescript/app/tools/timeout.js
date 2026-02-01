"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_TIMEOUT_MS = void 0;
exports.withTimeout = withTimeout;
exports.withToolTimeout = withToolTimeout;
const errors_1 = require("../../errors");
// Configurable tool-level timeout (default 60s)
exports.TOOL_TIMEOUT_MS = parseInt(process.env.AIRTABLE_TOOL_TIMEOUT_MS || '', 10) || 60000;
/**
 * Wraps a promise with a timeout. If the timeout expires, the promise is rejected
 * with an InternalServerError indicating a timeout.
 */
function withTimeout(promise, timeoutMs, operation) {
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            const timer = setTimeout(() => {
                reject(new errors_1.InternalServerError(`${operation} timed out after ${timeoutMs}ms`, {
                    status: 504
                }));
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
function withToolTimeout(toolName, handler, timeoutMs = exports.TOOL_TIMEOUT_MS) {
    return async (args, extra) => {
        return withTimeout(handler(args, extra), timeoutMs, `Tool '${toolName}'`);
    };
}
//# sourceMappingURL=timeout.js.map