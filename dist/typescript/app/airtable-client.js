"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AirtableClient = void 0;
const node_https_1 = __importDefault(require("node:https"));
const node_url_1 = require("node:url");
const promises_1 = require("node:timers/promises");
const errors_1 = require("../errors");
function toQueryString(query) {
    if (!query) {
        return '';
    }
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
        if (value === undefined)
            continue;
        if (Array.isArray(value)) {
            value.forEach((item) => params.append(`${key}[]`, String(item)));
        }
        else {
            params.append(key, String(value));
        }
    }
    const queryString = params.toString();
    return queryString.length > 0 ? `?${queryString}` : '';
}
function parseRetryAfter(headers) {
    const retryAfter = headers['retry-after'];
    if (!retryAfter)
        return undefined;
    const parsedSeconds = Number(retryAfter);
    if (!Number.isNaN(parsedSeconds)) {
        return parsedSeconds * 1000;
    }
    const retryDate = new Date(retryAfter);
    if (!Number.isNaN(retryDate.getTime())) {
        return Math.max(retryDate.getTime() - Date.now(), 0);
    }
    return undefined;
}
class AirtableClient {
    constructor(personalAccessToken, options) {
        this.pat = personalAccessToken;
        this.baseLimiter = options.baseLimiter;
        this.patLimiter = options.patLimiter;
        this.logger = options.logger;
        this.userAgent = options.userAgent;
        this.patHash = options.patHash;
        this.maxRetries = options.maxRetries ?? 1;
        this.httpTimeoutMs = options.httpTimeoutMs ?? 30000;
    }
    async listBases() {
        return this.request({
            method: 'GET',
            path: '/v0/meta/bases'
        });
    }
    async getBase(baseId) {
        return this.request({
            method: 'GET',
            path: `/v0/meta/bases/${encodeURIComponent(baseId)}`,
            baseId
        });
    }
    async listTables(baseId) {
        return this.request({
            method: 'GET',
            path: `/v0/meta/bases/${encodeURIComponent(baseId)}/tables`,
            baseId
        });
    }
    async queryRecords(baseId, table, query) {
        const requestOptions = {
            method: 'GET',
            path: `/v0/${encodeURIComponent(baseId)}/${encodeURIComponent(table)}`,
            baseId
        };
        if (query && Object.keys(query).length > 0) {
            requestOptions.query = query;
        }
        return this.request(requestOptions);
    }
    async createRecords(baseId, table, payload, idempotencyKey) {
        const requestOptions = {
            method: 'POST',
            path: `/v0/${encodeURIComponent(baseId)}/${encodeURIComponent(table)}`,
            baseId,
            body: payload
        };
        if (idempotencyKey) {
            requestOptions.idempotencyKey = idempotencyKey;
        }
        return this.request(requestOptions);
    }
    async updateRecords(baseId, table, payload, idempotencyKey) {
        const requestOptions = {
            method: 'PATCH',
            path: `/v0/${encodeURIComponent(baseId)}/${encodeURIComponent(table)}`,
            baseId,
            body: payload
        };
        if (idempotencyKey) {
            requestOptions.idempotencyKey = idempotencyKey;
        }
        return this.request(requestOptions);
    }
    async upsertRecords(baseId, table, payload, idempotencyKey) {
        const requestOptions = {
            method: 'PATCH',
            path: `/v0/${encodeURIComponent(baseId)}/${encodeURIComponent(table)}`,
            baseId,
            body: payload
        };
        if (idempotencyKey) {
            requestOptions.idempotencyKey = idempotencyKey;
        }
        return this.request(requestOptions);
    }
    async request(options) {
        const { baseId } = options;
        if (baseId) {
            await this.baseLimiter.schedule(baseId);
        }
        await this.patLimiter.schedule(this.patHash);
        return this.withRetry(() => this.performRequest(options));
    }
    async withRetry(fn) {
        let attempt = 0;
        let lastError;
        while (attempt < this.maxRetries) {
            try {
                return await fn();
            }
            catch (error) {
                lastError = error;
                attempt += 1;
                if (error instanceof errors_1.RateLimitError) {
                    const delayMs = error.retryAfterMs ?? this.backoffWithJitter(attempt);
                    this.logger.warn('Rate limited, backing off', {
                        attempt,
                        delayMs
                    });
                    await (0, promises_1.setTimeout)(delayMs);
                    continue;
                }
                if (error instanceof errors_1.InternalServerError && attempt < this.maxRetries) {
                    const delayMs = this.backoffWithJitter(attempt);
                    this.logger.warn('Upstream error, retrying', {
                        attempt,
                        delayMs
                    });
                    await (0, promises_1.setTimeout)(delayMs);
                    continue;
                }
                throw error;
            }
        }
        if (lastError instanceof errors_1.AirtableBrainError) {
            throw lastError.withContext({ attempt: this.maxRetries, totalAttempts: this.maxRetries });
        }
        throw lastError;
    }
    backoffWithJitter(attempt) {
        const baseDelay = Math.min(1000 * 2 ** (attempt - 1), 8000);
        const jitter = Math.random() * 250;
        return baseDelay + jitter;
    }
    performRequest(options) {
        const { method = 'GET', path, query, body, idempotencyKey } = options;
        const logger = this.logger.child({
            op: 'airtable_request',
            method,
            path,
            baseId: options.baseId,
            patHash: this.patHash
        });
        const queryString = toQueryString(query);
        const url = new node_url_1.URL(`https://api.airtable.com${path}${queryString}`);
        const payload = body === undefined ? undefined : JSON.stringify(body);
        return new Promise((resolve, reject) => {
            const request = node_https_1.default.request({
                method,
                hostname: url.hostname,
                path: url.pathname + url.search,
                headers: {
                    Authorization: `Bearer ${this.pat}`,
                    'Content-Type': 'application/json',
                    'User-Agent': this.userAgent,
                    ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
                    ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {})
                }
            }, (response) => {
                const chunks = [];
                response.on('data', (chunk) => {
                    chunks.push(chunk);
                });
                response.on('end', () => {
                    const rawBody = Buffer.concat(chunks).toString('utf8');
                    let parsedBody;
                    if (rawBody.length > 0) {
                        try {
                            parsedBody = JSON.parse(rawBody);
                        }
                        catch (error) {
                            reject(new errors_1.InternalServerError('Failed to parse Airtable response', {
                                cause: error,
                                status: response.statusCode ?? 0
                            }));
                            return;
                        }
                    }
                    const result = {
                        status: response.statusCode ?? 0,
                        body: parsedBody,
                        headers: response.headers
                    };
                    try {
                        if (result.status >= 200 && result.status < 300) {
                            resolve(parsedBody);
                            return;
                        }
                        reject(this.toDomainError(result, options));
                    }
                    catch (error) {
                        reject(error);
                    }
                });
            });
            request.on('error', (error) => {
                logger.error('Network error calling Airtable', {
                    error: error instanceof Error ? error.message : String(error)
                });
                reject(new errors_1.InternalServerError('Network error communicating with Airtable', {
                    cause: error
                }));
            });
            request.setTimeout(this.httpTimeoutMs, () => {
                request.destroy();
                reject(new errors_1.InternalServerError('Airtable request timed out', {
                    status: 504
                }));
            });
            if (payload) {
                request.write(payload);
            }
            request.end();
        });
    }
    toDomainError(response, request) {
        const { status, body, headers } = response;
        const { type: upstreamErrorType, message: upstreamErrorMessage } = this.safeExtractErrorInfo(body);
        const requestId = this.extractRequestId(headers);
        const baseContext = {
            endpoint: request.path,
            ...(request.baseId && { baseId: request.baseId }),
            ...(upstreamErrorType && { upstreamErrorType }),
            ...(upstreamErrorMessage && { upstreamErrorMessage }),
            ...(requestId && { upstreamRequestId: requestId })
        };
        if (status === 401 || status === 403) {
            return new errors_1.AuthError('Authentication failed with Airtable', {
                status,
                context: baseContext
            });
        }
        if (status === 404) {
            return new errors_1.NotFoundError('Requested resource was not found in Airtable', {
                status,
                context: baseContext
            });
        }
        if (status === 409) {
            return new errors_1.ConflictError('Airtable reported a conflict', {
                status,
                context: baseContext
            });
        }
        if (status === 400 || status === 422) {
            return new errors_1.AirtableValidationError('Airtable validation error', {
                status,
                context: baseContext
            });
        }
        if (status === 429) {
            const retryAfterMs = parseRetryAfter(headers);
            return new errors_1.RateLimitError('Airtable rate limit exceeded', {
                status,
                ...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
                context: baseContext
            });
        }
        if (status >= 500) {
            return new errors_1.InternalServerError('Airtable returned an internal error', {
                status,
                context: baseContext
            });
        }
        return new errors_1.InternalServerError('Unexpected Airtable response', {
            status,
            context: baseContext
        });
    }
    safeExtractErrorInfo(body) {
        if (body && typeof body === 'object' && 'error' in body) {
            const error = body.error;
            if (error && typeof error === 'object') {
                const errorObj = error;
                const result = {};
                if (typeof errorObj.type === 'string') {
                    result.type = errorObj.type;
                }
                if (typeof errorObj.message === 'string') {
                    result.message = errorObj.message;
                }
                return result;
            }
        }
        return {};
    }
    extractRequestId(headers) {
        const requestId = headers['x-airtable-request-id'];
        return typeof requestId === 'string' ? requestId : undefined;
    }
}
exports.AirtableClient = AirtableClient;
//# sourceMappingURL=airtable-client.js.map