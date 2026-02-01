"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUpsertTool = registerUpsertTool;
const types_1 = require("../types");
const handleError_1 = require("./handleError");
const response_1 = require("./response");
function chunk(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size)
        out.push(arr.slice(i, i + size));
    return out;
}
function registerUpsertTool(server, ctx) {
    server.registerTool('upsert', {
        description: 'Upsert Airtable records using performUpsert.fieldsToMergeOn.',
        inputSchema: types_1.upsertInputSchema.shape,
        outputSchema: types_1.upsertOutputSchema.shape
    }, async (raw) => {
        try {
            const args = types_1.upsertInputSchema.parse(raw);
            ctx.governance.ensureOperationAllowed('upsert');
            ctx.governance.ensureBaseAllowed(args.baseId);
            ctx.governance.ensureTableAllowed(args.baseId, args.table);
            const logger = ctx.logger.child({ tool: 'upsert', baseId: args.baseId, table: args.table });
            const matchedBy = args.performUpsert.fieldsToMergeOn;
            if (args.dryRun) {
                const structuredContent = {
                    diff: { added: args.records.length, updated: 0, unchanged: 0, conflicts: 0 },
                    dryRun: true,
                    records: args.records.map((r) => ({ id: 'pending', fields: r.fields })),
                    conflicts: []
                };
                // Note: Upsert output in PRD expects 'matchedBy' array and no conflicts property; keep consistent with docs
                // When using strict PRD output, we can omit conflicts and include matchedBy
                structuredContent.matchedBy = matchedBy;
                delete structuredContent.conflicts;
                return (0, response_1.createToolResponse)(structuredContent);
            }
            const chunks = chunk(args.records, 10);
            const aggregated = [];
            for (let i = 0; i < chunks.length; i++) {
                const body = {
                    records: chunks[i],
                    typecast: args.typecast ?? false,
                    performUpsert: { fieldsToMergeOn: matchedBy }
                };
                const headerKey = args.idempotencyKey ? `${args.idempotencyKey}:${i}` : undefined;
                const response = await ctx.airtable.upsertRecords(args.baseId, args.table, body, headerKey);
                if (Array.isArray(response?.records))
                    aggregated.push(...response.records);
            }
            const structuredContent = {
                diff: { added: 0, updated: aggregated.length, unchanged: 0 },
                matchedBy,
                records: aggregated.map((r) => ({ id: String(r.id), fields: r.fields || {} })),
                dryRun: false
            };
            logger.info('Upsert completed', { processed: aggregated.length, matchedBy });
            return (0, response_1.createToolResponse)(structuredContent);
        }
        catch (error) {
            return (0, handleError_1.handleToolError)('upsert', error, ctx);
        }
    });
}
//# sourceMappingURL=upsert.js.map