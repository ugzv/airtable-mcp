"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_TIMEOUT_MS = exports.withToolTimeout = exports.withTimeout = void 0;
exports.registerAllTools = registerAllTools;
const listBases_1 = require("./listBases");
const describe_1 = require("./describe");
const query_1 = require("./query");
const listGovernance_1 = require("./listGovernance");
const listExceptions_1 = require("./listExceptions");
const create_1 = require("./create");
const update_1 = require("./update");
const upsert_1 = require("./upsert");
const webhooks_1 = require("./webhooks");
// Export timeout utilities for use in tool handlers
var timeout_1 = require("./timeout");
Object.defineProperty(exports, "withTimeout", { enumerable: true, get: function () { return timeout_1.withTimeout; } });
Object.defineProperty(exports, "withToolTimeout", { enumerable: true, get: function () { return timeout_1.withToolTimeout; } });
Object.defineProperty(exports, "TOOL_TIMEOUT_MS", { enumerable: true, get: function () { return timeout_1.TOOL_TIMEOUT_MS; } });
function registerAllTools(server, ctx) {
    (0, listBases_1.registerListBasesTool)(server, ctx);
    (0, describe_1.registerDescribeTool)(server, ctx);
    (0, query_1.registerQueryTool)(server, ctx);
    (0, listGovernance_1.registerGovernanceTool)(server, ctx);
    (0, listExceptions_1.registerExceptionsTool)(server, ctx);
    (0, create_1.registerCreateTool)(server, ctx);
    (0, update_1.registerUpdateTool)(server, ctx);
    (0, upsert_1.registerUpsertTool)(server, ctx);
    (0, webhooks_1.registerWebhookTools)(server, ctx);
}
//# sourceMappingURL=index.js.map