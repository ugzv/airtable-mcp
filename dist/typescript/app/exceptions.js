"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExceptionStore = void 0;
const node_crypto_1 = require("node:crypto");
function mapCategory(code) {
    switch (code) {
        case 'RateLimited':
            return 'rate_limit';
        case 'ValidationError':
            return 'validation';
        case 'AuthError':
            return 'auth';
        case 'ConflictError':
            return 'conflict';
        case 'GovernanceError':
            return 'schema_drift';
        default:
            return 'other';
    }
}
function mapSeverity(code) {
    switch (code) {
        case 'RateLimited':
        case 'AuthError':
        case 'ConflictError':
        case 'GovernanceError':
            return 'error';
        case 'ValidationError':
            return 'warning';
        default:
            return 'error';
    }
}
class ExceptionStore {
    constructor(capacity, logger) {
        this.items = [];
        this.capacity = capacity;
        this.logger = logger.child({ component: 'exception_store' });
    }
    record(error, summary, details, proposedFix) {
        const item = {
            id: (0, node_crypto_1.randomUUID)(),
            timestamp: new Date().toISOString(),
            severity: mapSeverity(error.code),
            category: mapCategory(error.code),
            summary,
            details,
            proposedFix
        };
        this.items.unshift(item);
        if (this.items.length > this.capacity) {
            this.items.pop();
        }
        this.logger.debug('Recorded exception', { code: error.code });
    }
    list(params) {
        const limit = params.limit ?? 100;
        const cursorIndex = this.parseCursor(params.cursor);
        let filtered = this.items;
        if (params.since) {
            filtered = filtered.filter((item) => item.timestamp > params.since);
        }
        if (params.severity) {
            filtered = filtered.filter((item) => item.severity === params.severity);
        }
        const slice = filtered.slice(cursorIndex, cursorIndex + limit);
        const nextCursor = cursorIndex + limit < filtered.length ? String(cursorIndex + limit) : undefined;
        return {
            items: slice,
            cursor: nextCursor
        };
    }
    parseCursor(cursor) {
        if (!cursor) {
            return 0;
        }
        const parsed = Number.parseInt(cursor, 10);
        if (Number.isNaN(parsed) || parsed < 0) {
            return 0;
        }
        return parsed;
    }
}
exports.ExceptionStore = ExceptionStore;
//# sourceMappingURL=exceptions.js.map