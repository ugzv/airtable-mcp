import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AppContext } from '../context';
export { withTimeout, withToolTimeout, TOOL_TIMEOUT_MS } from './timeout';
export declare function registerAllTools(server: McpServer, ctx: AppContext): void;
