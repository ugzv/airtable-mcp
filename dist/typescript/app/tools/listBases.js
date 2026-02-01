"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerListBasesTool = registerListBasesTool;
const zod_1 = require("zod");
const handleError_1 = require("./handleError");
const response_1 = require("./response");
// Schema for list_bases output
const listBasesOutputSchema = zod_1.z.object({
    bases: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        name: zod_1.z.string(),
        permissionLevel: zod_1.z.string().optional()
    }))
});
function registerListBasesTool(server, ctx) {
    server.registerTool('list_bases', {
        description: 'List all accessible Airtable bases with their names, IDs, and permission levels',
        inputSchema: {},
        outputSchema: listBasesOutputSchema.shape
    }, async (_args, _extra) => {
        try {
            ctx.logger.info('Listing accessible Airtable bases');
            const response = await ctx.airtable.listBases();
            const bases = response.bases;
            if (!bases || bases.length === 0) {
                const structuredContent = {
                    bases: []
                };
                return (0, response_1.createToolResponse)(structuredContent);
            }
            const normalizedBases = bases.map((base) => ({
                id: String(base.id ?? ''),
                name: String(base.name ?? ''),
                permissionLevel: base.permissionLevel ? String(base.permissionLevel) : undefined
            }));
            const structuredContent = {
                bases: normalizedBases
            };
            ctx.logger.info('Successfully listed bases', { count: bases.length });
            return (0, response_1.createToolResponse)(structuredContent);
        }
        catch (error) {
            return (0, handleError_1.handleToolError)('list_bases', error, ctx);
        }
    });
}
//# sourceMappingURL=listBases.js.map