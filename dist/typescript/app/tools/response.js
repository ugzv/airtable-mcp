"use strict";
/**
 * Utility for creating consistent MCP tool responses.
 *
 * The MCP protocol requires the `content` array to contain displayable data.
 * While `structuredContent` is the newer typed output format, most clients
 * read from `content` for backwards compatibility.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createToolResponse = createToolResponse;
/**
 * Creates a tool response with both structuredContent (for typed clients)
 * and content array (for backwards compatibility with MCP clients).
 */
function createToolResponse(data) {
    return {
        structuredContent: data,
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }]
    };
}
//# sourceMappingURL=response.js.map