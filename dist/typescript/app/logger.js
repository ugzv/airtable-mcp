"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const LEVEL_ORDER = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};
class Logger {
    constructor(level, context = {}) {
        this.level = level;
        this.context = context;
    }
    child(context) {
        return new Logger(this.level, { ...this.context, ...context });
    }
    error(message, metadata = {}) {
        this.log('error', message, metadata);
    }
    warn(message, metadata = {}) {
        this.log('warn', message, metadata);
    }
    info(message, metadata = {}) {
        this.log('info', message, metadata);
    }
    debug(message, metadata = {}) {
        this.log('debug', message, metadata);
    }
    log(level, message, metadata) {
        if (LEVEL_ORDER[level] > LEVEL_ORDER[this.level]) {
            return;
        }
        const timestamp = new Date().toISOString();
        const output = {
            timestamp,
            level,
            message,
            ...this.context,
            ...(Object.keys(metadata).length > 0 ? { metadata } : {})
        };
        // Write logs to stderr so we don't corrupt the MCP stdio protocol stream.
        process.stderr.write(`${JSON.stringify(output)}\n`);
    }
}
exports.Logger = Logger;
//# sourceMappingURL=logger.js.map