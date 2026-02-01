#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.start = start;
// Import via require to avoid TS type resolution issues with deep subpath exports
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const http = __importStar(require("node:http"));
const config_1 = require("./app/config");
const logger_1 = require("./app/logger");
const rateLimiter_1 = require("./app/rateLimiter");
const airtable_client_1 = require("./app/airtable-client");
const governance_1 = require("./app/governance");
const exceptions_1 = require("./app/exceptions");
const tools_1 = require("./app/tools");
const PROTOCOL_VERSION = '2024-11-05';
function buildContext(config, rootLogger) {
    const baseLimiter = new rateLimiter_1.RateLimiter({ maxRequestsPerSecond: 5 });
    const patLimiter = new rateLimiter_1.RateLimiter({ maxRequestsPerSecond: 50 });
    // Configurable HTTP timeout (default 30s)
    const httpTimeoutMs = parseInt(process.env.AIRTABLE_HTTP_TIMEOUT_MS || '', 10) || 30000;
    // Configurable max retries (default 1 to prevent long hangs)
    const maxRetries = parseInt(process.env.AIRTABLE_MAX_RETRIES || '', 10) || 1;
    const airtable = new airtable_client_1.AirtableClient(config.auth.personalAccessToken, {
        baseLimiter,
        patLimiter,
        logger: rootLogger.child({ component: 'airtable_client' }),
        userAgent: `airtable-brain-mcp/${config.version}`,
        patHash: config.auth.patHash,
        httpTimeoutMs,
        maxRetries
    });
    const governance = new governance_1.GovernanceService(config.governance);
    const exceptions = new exceptions_1.ExceptionStore(config.exceptionQueueSize, rootLogger);
    return {
        config,
        logger: rootLogger,
        airtable,
        governance,
        exceptions
    };
}
async function start() {
    const config = (0, config_1.loadConfig)();
    const logger = new logger_1.Logger(config.logLevel, { component: 'server' });
    const context = buildContext(config, logger);
    const server = new McpServer({
        name: 'airtable-brain',
        version: config.version,
        protocolVersion: PROTOCOL_VERSION
    }, {
        capabilities: {
            tools: {},
            prompts: {},
            resources: {}
        },
        instructions: 'Use describe and query tools for read flows. All mutations require diff review and idempotency keys.'
    });
    (0, tools_1.registerAllTools)(server, context);
    // Check if HTTP mode is requested (for Smithery hosting)
    const httpPort = process.env.PORT || process.env.MCP_HTTP_PORT;
    if (httpPort) {
        // HTTP transport for hosted deployments
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => crypto.randomUUID(),
        });
        const httpServer = http.createServer(async (req, res) => {
            // Health check endpoint
            if (req.url === '/health' && req.method === 'GET') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ok', version: config.version }));
                return;
            }
            // MCP endpoint
            if (req.url === '/mcp' || req.url === '/') {
                await transport.handleRequest(req, res);
                return;
            }
            res.writeHead(404);
            res.end('Not Found');
        });
        await server.connect(transport);
        const port = parseInt(httpPort, 10);
        httpServer.listen(port, () => {
            logger.info('Airtable Brain MCP server ready (HTTP mode)', {
                version: config.version,
                protocolVersion: PROTOCOL_VERSION,
                port
            });
        });
        const shutdown = async (signal) => {
            logger.info('Shutting down due to signal', { signal });
            httpServer.close();
            await server.close();
            process.exit(0);
        };
        process.on('SIGINT', () => void shutdown('SIGINT'));
        process.on('SIGTERM', () => void shutdown('SIGTERM'));
    }
    else {
        // Stdio transport for local usage
        const transport = new StdioServerTransport();
        await server.connect(transport);
        logger.info('Airtable Brain MCP server ready (stdio mode)', {
            version: config.version,
            protocolVersion: PROTOCOL_VERSION
        });
        const shutdown = async (signal) => {
            logger.info('Shutting down due to signal', { signal });
            await server.close();
            await transport.close();
            process.exit(0);
        };
        process.on('SIGINT', () => void shutdown('SIGINT'));
        process.on('SIGTERM', () => void shutdown('SIGTERM'));
    }
}
if (typeof require !== 'undefined' && require.main === module) {
    start().catch((error) => {
        // eslint-disable-next-line no-console
        console.error('Failed to start Airtable Brain MCP server:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=airtable-mcp-server.js.map