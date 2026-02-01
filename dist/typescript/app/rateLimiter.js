"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = void 0;
const promises_1 = require("node:timers/promises");
/**
 * Lightweight token-based rate limiter to enforce Airtable quotas.
 * Maintains per-key queues to preserve ordering and fairness.
 */
class RateLimiter {
    constructor({ maxRequestsPerSecond }) {
        this.lockByKey = new Map();
        this.nextAvailableByKey = new Map();
        if (maxRequestsPerSecond <= 0) {
            throw new Error('maxRequestsPerSecond must be greater than zero');
        }
        this.minIntervalMs = Math.ceil(1000 / maxRequestsPerSecond);
    }
    async schedule(key) {
        const previous = this.lockByKey.get(key) ?? Promise.resolve();
        let release = () => undefined;
        const current = new Promise((resolve) => {
            release = resolve;
        });
        this.lockByKey.set(key, previous.then(() => current));
        await previous;
        const now = Date.now();
        const availableAt = this.nextAvailableByKey.get(key) ?? now;
        const waitMs = Math.max(availableAt - now, 0);
        if (waitMs > 0) {
            await (0, promises_1.setTimeout)(waitMs);
        }
        this.nextAvailableByKey.set(key, Date.now() + this.minIntervalMs);
        release();
    }
}
exports.RateLimiter = RateLimiter;
//# sourceMappingURL=rateLimiter.js.map