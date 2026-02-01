"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerQueryTool = registerQueryTool;
const node_crypto_1 = require("node:crypto");
const types_1 = require("../types");
const handleError_1 = require("./handleError");
const response_1 = require("./response");
const sanitize_1 = require("../sanitize");
// Protect against prototype pollution
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
function isSafeKey(key) {
    return typeof key === 'string' && !UNSAFE_KEYS.has(key);
}
function maskValue(value) {
    if (value === null || value === undefined) {
        return value;
    }
    if (Array.isArray(value)) {
        return value.map(() => '••••');
    }
    if (typeof value === 'object') {
        return '[redacted]';
    }
    return '••••';
}
function hashValue(value) {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value ?? '');
    return (0, node_crypto_1.createHash)('sha256').update(serialized).digest('hex');
}
function applyPiiPolicies(fields, policies) {
    if (!policies.length) {
        return fields;
    }
    const result = { ...fields };
    for (const policy of policies) {
        // Skip unsafe keys to prevent prototype pollution
        if (!isSafeKey(policy.field))
            continue;
        if (!(policy.field in result))
            continue;
        switch (policy.policy) {
            case 'drop':
                delete result[policy.field];
                break;
            case 'mask':
                result[policy.field] = maskValue(result[policy.field]);
                break;
            case 'hash':
                result[policy.field] = hashValue(result[policy.field]);
                break;
            default:
                break;
        }
    }
    return result;
}
function registerQueryTool(server, ctx) {
    server.registerTool('query', {
        description: 'Query Airtable records with filtering, sorting, and pagination.',
        inputSchema: types_1.queryInputShape,
        outputSchema: types_1.queryOutputSchema.shape
    }, async (args, _extra) => {
        try {
            const input = types_1.queryInputSchema.parse(args);
            ctx.governance.ensureOperationAllowed('query');
            ctx.governance.ensureBaseAllowed(input.baseId);
            ctx.governance.ensureTableAllowed(input.baseId, input.table);
            const logger = ctx.logger.child({
                tool: 'query',
                baseId: input.baseId,
                table: input.table
            });
            const queryParams = {};
            if (input.fields) {
                queryParams.fields = input.fields;
            }
            if (input.filterByFormula) {
                // Validate formula for suspicious patterns (log warning but don't block)
                const formulaValidation = (0, sanitize_1.validateFormula)(input.filterByFormula);
                if (!formulaValidation.isValid) {
                    logger.warn('Potentially unsafe formula pattern detected', {
                        warning: formulaValidation.warning,
                        formula: input.filterByFormula.substring(0, 100) // Truncate for logging
                    });
                }
                queryParams.filterByFormula = input.filterByFormula;
            }
            if (input.view) {
                queryParams.view = input.view;
            }
            if (input.pageSize) {
                queryParams.pageSize = input.pageSize;
            }
            if (input.maxRecords) {
                queryParams.maxRecords = input.maxRecords;
            }
            if (input.offset) {
                queryParams.offset = input.offset;
            }
            if (typeof input.returnFieldsByFieldId === 'boolean') {
                queryParams.returnFieldsByFieldId = input.returnFieldsByFieldId;
            }
            if (input.sorts) {
                input.sorts.forEach((sort, index) => {
                    queryParams[`sort[${index}][field]`] = sort.field;
                    queryParams[`sort[${index}][direction]`] = sort.direction ?? 'asc';
                });
            }
            const response = await ctx.airtable.queryRecords(input.baseId, input.table, queryParams);
            const rawRecords = Array.isArray(response?.records)
                ? response.records
                : [];
            const piiPolicies = ctx.governance.listPiiPolicies(input.baseId, input.table);
            const sanitizedRecords = rawRecords.map((record) => {
                const fields = typeof record.fields === 'object' && record.fields !== null ? record.fields : {};
                return {
                    id: String(record.id ?? ''),
                    createdTime: record.createdTime ? String(record.createdTime) : undefined,
                    fields: applyPiiPolicies(fields, piiPolicies)
                };
            });
            const structuredContent = {
                records: sanitizedRecords,
                offset: typeof response?.offset === 'string' ? response.offset : undefined,
                summary: {
                    returned: sanitizedRecords.length,
                    hasMore: Boolean(response?.offset)
                }
            };
            logger.debug('Query completed', {
                returned: sanitizedRecords.length,
                hasMore: structuredContent.summary?.hasMore
            });
            return (0, response_1.createToolResponse)(structuredContent);
        }
        catch (error) {
            return (0, handleError_1.handleToolError)('query', error, ctx);
        }
    });
}
//# sourceMappingURL=query.js.map