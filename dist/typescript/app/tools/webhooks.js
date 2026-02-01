"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerWebhookTools = registerWebhookTools;
const handleError_1 = require("./handleError");
const response_1 = require("./response");
function registerWebhookTools(server, ctx) {
    server.registerTool('list_webhooks', { description: 'List Airtable webhooks for the default base.' }, async (_args) => {
        try {
            const baseId = ctx.config.auth.defaultBaseId || ctx.config.auth.allowedBases[0];
            if (!baseId)
                throw new Error('No base configured');
            const body = await ctx.airtable.queryRecords(baseId, 'meta/webhooks');
            return (0, response_1.createToolResponse)({ webhooks: body });
        }
        catch (error) {
            return (0, handleError_1.handleToolError)('list_webhooks', error, ctx);
        }
    });
    server.registerTool('create_webhook', { description: 'Create a new webhook for a base.' }, async (args) => {
        try {
            const baseId = args.baseId || ctx.config.auth.defaultBaseId || ctx.config.auth.allowedBases[0];
            if (!baseId)
                throw new Error('No base configured');
            const payload = { notificationUrl: String(args.notificationUrl || '') };
            const result = await ctx.airtable.createRecords(baseId, 'meta/webhooks', payload);
            return (0, response_1.createToolResponse)({ webhook: result });
        }
        catch (error) {
            return (0, handleError_1.handleToolError)('create_webhook', error, ctx);
        }
    });
    server.registerTool('refresh_webhook', { description: 'Refresh webhook expiration.' }, async (args) => {
        try {
            const baseId = args.baseId || ctx.config.auth.defaultBaseId || ctx.config.auth.allowedBases[0];
            if (!baseId)
                throw new Error('No base configured');
            const result = await ctx.airtable.updateRecords(baseId, `meta/webhooks/${String(args.webhookId)}/refresh`, {});
            return (0, response_1.createToolResponse)({ webhook: result });
        }
        catch (error) {
            return (0, handleError_1.handleToolError)('refresh_webhook', error, ctx);
        }
    });
}
//# sourceMappingURL=webhooks.js.map