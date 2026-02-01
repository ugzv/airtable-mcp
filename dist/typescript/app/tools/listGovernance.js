"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerGovernanceTool = registerGovernanceTool;
const types_1 = require("../types");
const response_1 = require("./response");
function registerGovernanceTool(server, ctx) {
    server.registerTool('list_governance', {
        description: 'Return governance allow-lists and PII masking policies.',
        outputSchema: types_1.governanceOutputSchema.shape
    }, async () => {
        const snapshot = ctx.governance.getSnapshot();
        return (0, response_1.createToolResponse)(snapshot);
    });
}
//# sourceMappingURL=listGovernance.js.map