"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUpdateTool = registerUpdateTool;
const types_1 = require("../types");
const handleError_1 = require("./handleError");
const response_1 = require("./response");
function chunk(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size)
        out.push(arr.slice(i, i + size));
    return out;
}
function registerUpdateTool(server, ctx) {
    server.registerTool('update', {
        description: 'Update Airtable records (requires diff-before-write via dryRun first).',
        inputSchema: types_1.updateInputSchema.shape,
        outputSchema: types_1.updateOutputSchema.shape
    }, async (raw) => {
        try {
            const args = types_1.updateInputSchema.parse(raw);
            ctx.governance.ensureOperationAllowed('update');
            ctx.governance.ensureBaseAllowed(args.baseId);
            ctx.governance.ensureTableAllowed(args.baseId, args.table);
            const logger = ctx.logger.child({ tool: 'update', baseId: args.baseId, table: args.table });
            if (args.dryRun) {
                const structuredContent = {
                    diff: { added: 0, updated: args.records.length, unchanged: 0, conflicts: 0 },
                    dryRun: true,
                    records: args.records.map((r) => ({ id: r.id, fields: r.fields })),
                    conflicts: []
                };
                return (0, response_1.createToolResponse)(structuredContent);
            }
            const chunks = chunk(args.records, 10);
            const aggregated = [];
            for (let i = 0; i < chunks.length; i++) {
                const body = { records: chunks[i], typecast: args.typecast ?? false };
                const headerKey = args.idempotencyKey ? `${args.idempotencyKey}:${i}` : undefined;
                const response = await ctx.airtable.updateRecords(args.baseId, args.table, body, headerKey);
                if (Array.isArray(response?.records))
                    aggregated.push(...response.records);
            }
            const structuredContent = {
                diff: { added: 0, updated: aggregated.length, unchanged: 0, conflicts: 0 },
                records: aggregated.map((r) => ({ id: String(r.id), fields: r.fields || {} })),
                dryRun: false,
                conflicts: []
            };
            logger.info('Update completed', { updated: aggregated.length });
            return (0, response_1.createToolResponse)(structuredContent);
        }
        catch (error) {
            return (0, handleError_1.handleToolError)('update', error, ctx);
        }
    });
}
//# sourceMappingURL=update.js.map