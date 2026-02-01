"use strict";
/**
 * Error taxonomy aligned with Airtable Brain guardrails.
 *
 * All tool errors should use these types so the LLM can reason about
 * retry behaviour and user messaging. Avoid leaking raw Airtable payloads
 * through error messages.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernanceError = exports.InternalServerError = exports.NotFoundError = exports.ConflictError = exports.AuthError = exports.AirtableValidationError = exports.RateLimitError = exports.AirtableBrainError = void 0;
class AirtableBrainError extends Error {
    constructor(code, message, options = {}) {
        super(message);
        this.name = code;
        this.code = code;
        if (options.cause !== undefined) {
            this.cause = options.cause;
        }
        if (options.status !== undefined) {
            this.status = options.status;
        }
        if (options.retryAfterMs !== undefined) {
            this.retryAfterMs = options.retryAfterMs;
        }
        this.context = options.context ?? {};
    }
    withContext(context) {
        Object.assign(this.context, context);
        return this;
    }
}
exports.AirtableBrainError = AirtableBrainError;
class RateLimitError extends AirtableBrainError {
    constructor(message, options = {}) {
        super('RateLimited', message, options);
    }
}
exports.RateLimitError = RateLimitError;
class AirtableValidationError extends AirtableBrainError {
    constructor(message, options = {}) {
        super('ValidationError', message, options);
    }
}
exports.AirtableValidationError = AirtableValidationError;
class AuthError extends AirtableBrainError {
    constructor(message, options = {}) {
        super('AuthError', message, options);
    }
}
exports.AuthError = AuthError;
class ConflictError extends AirtableBrainError {
    constructor(message, options = {}) {
        super('ConflictError', message, options);
    }
}
exports.ConflictError = ConflictError;
class NotFoundError extends AirtableBrainError {
    constructor(message, options = {}) {
        super('NotFound', message, options);
    }
}
exports.NotFoundError = NotFoundError;
class InternalServerError extends AirtableBrainError {
    constructor(message, options = {}) {
        super('InternalError', message, options);
    }
}
exports.InternalServerError = InternalServerError;
class GovernanceError extends AirtableBrainError {
    constructor(message, options = {}) {
        super('GovernanceError', message, options);
    }
}
exports.GovernanceError = GovernanceError;
//# sourceMappingURL=errors.js.map