"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerExceptionsTool = registerExceptionsTool;
const types_1 = require("../types");
const response_1 = require("./response");
function registerExceptionsTool(server, ctx) {
    server.registerTool('list_exceptions', {
        description: 'List recent exceptions and remediation proposals.',
        inputSchema: types_1.listExceptionsInputSchema.shape,
        outputSchema: types_1.listExceptionsOutputSchema.shape
    }, async (args) => {
        const snapshot = ctx.exceptions.list(args);
        return (0, response_1.createToolResponse)(snapshot);
    });
}
//# sourceMappingURL=listExceptions.js.map