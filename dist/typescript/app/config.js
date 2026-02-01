"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = require("node:crypto");
const dotenv_1 = require("dotenv");
const types_1 = require("./types");
const errors_1 = require("../errors");
const validateApiKey_1 = require("./validateApiKey");
(0, dotenv_1.config)();
const DEFAULT_EXCEPTION_QUEUE_SIZE = 500;
function parseCsv(value) {
    if (!value) {
        return [];
    }
    return value
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
}
function hashSecret(secret) {
    return (0, node_crypto_1.createHash)('sha256').update(secret).digest('hex').slice(0, 12);
}
function resolveLogLevel() {
    const raw = (process.env.LOG_LEVEL || 'info').toLowerCase();
    if (raw === 'error' || raw === 'warn' || raw === 'info' || raw === 'debug') {
        return raw;
    }
    return 'info';
}
function determineAllowedBases(defaultBaseId) {
    const fromEnv = parseCsv(process.env.AIRTABLE_ALLOWED_BASES || process.env.AIRTABLE_BASE_ALLOWLIST);
    const baseSet = new Set();
    if (defaultBaseId) {
        baseSet.add(defaultBaseId);
    }
    fromEnv.forEach((base) => baseSet.add(base));
    // Allow empty base list - users can use list_bases tool to discover bases
    // and then specify them dynamically in tool calls
    return Array.from(baseSet);
}
function parseAllowedTables(raw) {
    if (!raw) {
        return [];
    }
    const tables = [];
    for (const entry of raw.split(',')) {
        const trimmed = entry.trim();
        if (!trimmed)
            continue;
        const [baseId, table] = trimmed.split(':');
        if (!baseId || !table) {
            throw new errors_1.GovernanceError(`Invalid AIRTABLE_ALLOWED_TABLES entry "${trimmed}". Expected format baseId:tableName.`);
        }
        tables.push({ baseId: baseId.trim(), table: table.trim() });
    }
    return tables;
}
function readGovernanceFile() {
    const explicitPath = process.env.AIRTABLE_GOVERNANCE_PATH;
    const fallbackPath = node_path_1.default.resolve(process.cwd(), 'config', 'governance.json');
    const filePath = explicitPath || fallbackPath;
    if (!node_fs_1.default.existsSync(filePath)) {
        return undefined;
    }
    try {
        const raw = node_fs_1.default.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        const partialSchema = types_1.governanceOutputSchema.partial();
        const result = partialSchema.parse(parsed);
        return result;
    }
    catch (error) {
        throw new errors_1.GovernanceError(`Failed to parse governance configuration at ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
}
function buildGovernanceSnapshot(allowedBases) {
    const baseSnapshot = {
        allowedBases,
        allowedTables: [],
        allowedOperations: ['describe', 'query', 'create', 'update', 'upsert'],
        piiFields: [],
        redactionPolicy: 'mask_on_inline',
        loggingPolicy: 'minimal',
        retentionDays: 7
    };
    const overrides = readGovernanceFile();
    const envAllowedTables = parseAllowedTables(process.env.AIRTABLE_ALLOWED_TABLES);
    const merged = {
        ...baseSnapshot,
        ...(overrides ?? {})
    };
    // Ensure allow-lists include env tables/bases.
    const bases = new Set(merged.allowedBases);
    allowedBases.forEach((base) => bases.add(base));
    merged.allowedBases = Array.from(bases);
    if (overrides?.allowedTables || envAllowedTables.length > 0) {
        const tableSet = new Map();
        (overrides?.allowedTables ?? []).forEach((table) => {
            tableSet.set(`${table.baseId}:${table.table}`, table);
        });
        envAllowedTables.forEach((table) => {
            tableSet.set(`${table.baseId}:${table.table}`, table);
        });
        merged.allowedTables = Array.from(tableSet.values());
    }
    return types_1.governanceOutputSchema.parse(merged);
}
function loadConfig() {
    const personalAccessToken = process.env.AIRTABLE_PAT ||
        process.env.AIRTABLE_TOKEN ||
        process.env.AIRTABLE_API_TOKEN ||
        process.env.AIRTABLE_API_KEY;
    if (!personalAccessToken) {
        throw new errors_1.GovernanceError('Missing Airtable credentials. Set AIRTABLE_PAT (preferred) or AIRTABLE_TOKEN.');
    }
    const defaultBaseId = process.env.AIRTABLE_DEFAULT_BASE ?? process.env.AIRTABLE_BASE_ID ?? process.env.AIRTABLE_BASE;
    const allowedBases = determineAllowedBases(defaultBaseId);
    const governance = buildGovernanceSnapshot(allowedBases);
    // Validate token format and collect warnings
    const tokenValidation = (0, validateApiKey_1.validateApiKey)(personalAccessToken);
    if (tokenValidation.warnings.length > 0) {
        // Log warnings to stderr (will be visible in MCP server logs)
        tokenValidation.warnings.forEach((warning) => {
            console.error(`[airtable-mcp] Token warning: ${warning}`);
        });
    }
    const auth = {
        personalAccessToken,
        patHash: hashSecret(personalAccessToken),
        allowedBases,
        tokenFormatWarnings: tokenValidation.warnings
    };
    if (defaultBaseId) {
        auth.defaultBaseId = defaultBaseId;
    }
    return {
        version: process.env.npm_package_version || '0.0.0',
        auth,
        governance,
        logLevel: resolveLogLevel(),
        exceptionQueueSize: Number.parseInt(process.env.EXCEPTION_QUEUE_SIZE || '', 10) > 0
            ? Number.parseInt(process.env.EXCEPTION_QUEUE_SIZE, 10)
            : DEFAULT_EXCEPTION_QUEUE_SIZE
    };
}
//# sourceMappingURL=config.js.map