"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCreateTool = registerCreateTool;
const types_1 = require("../types");
const handleError_1 = require("./handleError");
const response_1 = require("./response");
function chunk(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size)
        out.push(arr.slice(i, i + size));
    return out;
}
function registerCreateTool(server, ctx) {
    server.registerTool('create', {
        description: 'Create Airtable records (requires diff-before-write via dryRun first).',
        inputSchema: types_1.createInputSchema.shape,
        outputSchema: types_1.createOutputSchema.shape
    }, async (raw) => {
        try {
            const args = types_1.createInputSchema.parse(raw);
            ctx.governance.ensureOperationAllowed('create');
            ctx.governance.ensureBaseAllowed(args.baseId);
            ctx.governance.ensureTableAllowed(args.baseId, args.table);
            const logger = ctx.logger.child({ tool: 'create', baseId: args.baseId, table: args.table });
            if (args.dryRun) {
                const structuredContent = {
                    diff: { added: args.records.length, updated: 0, unchanged: 0 },
                    dryRun: true,
                    records: args.records.map((r) => ({ id: 'pending', fields: r.fields }))
                };
                return (0, response_1.createToolResponse)(structuredContent);
            }
            const chunks = chunk(args.records, 10);
            const aggregated = [];
            for (let i = 0; i < chunks.length; i++) {
                const body = { records: chunks[i], typecast: args.typecast ?? false };
                const headerKey = args.idempotencyKey ? `${args.idempotencyKey}:${i}` : undefined;
                const response = await ctx.airtable.createRecords(args.baseId, args.table, body, headerKey);
                if (Array.isArray(response?.records))
                    aggregated.push(...response.records);
            }
            const structuredContent = {
                diff: { added: aggregated.length, updated: 0, unchanged: 0 },
                records: aggregated.map((r) => ({ id: String(r.id), fields: r.fields || {} })),
                dryRun: false
            };
            logger.info('Create completed', { added: aggregated.length });
            return (0, response_1.createToolResponse)(structuredContent);
        }
        catch (error) {
            return (0, handleError_1.handleToolError)('create', error, ctx);
        }
    });
}
//# sourceMappingURL=create.js.map