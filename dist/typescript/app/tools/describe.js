"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDescribeTool = registerDescribeTool;
const types_1 = require("../types");
const errors_1 = require("../../errors");
const handleError_1 = require("./handleError");
const response_1 = require("./response");
const timeout_1 = require("./timeout");
// Configurable timeout for the entire describe operation (default: half of tool timeout)
const DESCRIBE_TIMEOUT_MS = parseInt(process.env.AIRTABLE_DESCRIBE_TIMEOUT_MS || '', 10) || timeout_1.TOOL_TIMEOUT_MS;
/**
 * Normalize field based on detail level:
 * - identifiersOnly: only id and name
 * - full: all details including type, description, options
 */
function normalizeField(raw, detailLevel) {
    const source = raw;
    const field = {
        id: String(source?.id ?? ''),
        name: String(source?.name ?? ''),
        type: detailLevel === 'full' ? String(source?.type ?? '') : ''
    };
    // Only include full details in 'full' mode
    if (detailLevel === 'full') {
        if (source?.description && typeof source.description === 'string') {
            field.description = source.description;
        }
        if (source?.options && typeof source.options === 'object') {
            field.options = source.options;
        }
    }
    // Remove empty type for identifiersOnly
    if (detailLevel === 'identifiersOnly') {
        delete field.type;
    }
    return field;
}
/**
 * Normalize view based on detail level:
 * - identifiersOnly: only id and name
 * - full: includes type
 */
function normalizeView(raw, detailLevel) {
    const source = raw;
    const view = {
        id: String(source?.id ?? ''),
        name: String(source?.name ?? '')
    };
    if (detailLevel === 'full' && source?.type && typeof source.type === 'string') {
        view.type = source.type;
    }
    return view;
}
/**
 * Normalize table based on detail level:
 * - tableIdentifiersOnly: only id and name
 * - identifiersOnly: id, name, and field/view identifiers
 * - full: complete details
 */
function normalizeTable(raw, options) {
    const { detailLevel, includeFields, includeViews } = options;
    const source = raw;
    const table = {
        id: String(source?.id ?? ''),
        name: String(source?.name ?? '')
    };
    // tableIdentifiersOnly: stop here
    if (detailLevel === 'tableIdentifiersOnly') {
        return table;
    }
    // identifiersOnly and full: include primaryFieldId
    if (source?.primaryFieldId && typeof source.primaryFieldId === 'string') {
        table.primaryFieldId = source.primaryFieldId;
    }
    // Include fields based on settings
    if (includeFields && Array.isArray(source?.fields)) {
        table.fields = source.fields.map((field) => normalizeField(field, detailLevel));
    }
    // Include views based on settings
    if (includeViews && Array.isArray(source?.views)) {
        table.views = source.views.map((view) => normalizeView(view, detailLevel));
    }
    return table;
}
function registerDescribeTool(server, ctx) {
    server.registerTool('describe', {
        description: `Describe Airtable base or table schema.

Use detailLevel to optimize context usage:
- tableIdentifiersOnly: Only table IDs and names (minimal)
- identifiersOnly: Table, field, and view IDs and names
- full: Complete details including field types and options (default)`,
        inputSchema: types_1.describeInputShape,
        outputSchema: types_1.describeOutputSchema.shape
    }, async (args, _extra) => {
        try {
            const input = types_1.describeInputSchema.parse(args);
            ctx.governance.ensureOperationAllowed('describe');
            ctx.governance.ensureBaseAllowed(input.baseId);
            // Determine detail level and field/view inclusion
            const detailLevel = input.detailLevel ?? 'full';
            // For backward compatibility, respect includeFields/includeViews
            // but detailLevel takes precedence for tableIdentifiersOnly
            const includeFields = detailLevel !== 'tableIdentifiersOnly' && (input.includeFields ?? true);
            const includeViews = detailLevel !== 'tableIdentifiersOnly' && (input.includeViews ?? false);
            const normalizeOptions = {
                detailLevel,
                includeFields,
                includeViews
            };
            const logger = ctx.logger.child({
                tool: 'describe',
                baseId: input.baseId,
                scope: input.scope,
                detailLevel
            });
            // Use sequential calls with timeout to prevent hangs when either call blocks
            const baseInfo = await (0, timeout_1.withTimeout)(ctx.airtable.getBase(input.baseId), DESCRIBE_TIMEOUT_MS / 2, 'getBase');
            const tableInfo = await (0, timeout_1.withTimeout)(ctx.airtable.listTables(input.baseId), DESCRIBE_TIMEOUT_MS / 2, 'listTables');
            const baseName = typeof baseInfo?.name === 'string'
                ? String(baseInfo.name)
                : input.baseId;
            const rawTables = Array.isArray(tableInfo?.tables)
                ? tableInfo.tables
                : [];
            const tables = rawTables
                .filter((rawTable) => {
                const record = rawTable;
                const tableId = typeof record.id === 'string' ? record.id : '';
                const tableName = typeof record.name === 'string' ? record.name : '';
                const idAllowed = tableId
                    ? ctx.governance.isTableAllowed(input.baseId, tableId)
                    : false;
                const nameAllowed = tableName
                    ? ctx.governance.isTableAllowed(input.baseId, tableName)
                    : false;
                return idAllowed || nameAllowed;
            })
                .map((table) => normalizeTable(table, normalizeOptions));
            let selectedTables = tables;
            if (input.scope === 'table') {
                const target = tables.find((tableRecord) => String(tableRecord.id) === input.table ||
                    String(tableRecord.name).toLowerCase() === input.table?.toLowerCase());
                if (!target) {
                    const context = { baseId: input.baseId };
                    if (input.table) {
                        context.table = input.table;
                    }
                    throw new errors_1.NotFoundError(`Table ${input.table} not found in base ${input.baseId}`, {
                        context
                    });
                }
                const targetId = String(target.id);
                const targetName = String(target.name);
                if (!ctx.governance.isTableAllowed(input.baseId, targetId) &&
                    !ctx.governance.isTableAllowed(input.baseId, targetName)) {
                    const context = { baseId: input.baseId };
                    if (input.table) {
                        context.table = input.table;
                    }
                    throw new errors_1.GovernanceError(`Table ${input.table} is not allowed in base ${input.baseId}`, {
                        context
                    });
                }
                selectedTables = [target];
            }
            const structuredContent = {
                base: {
                    id: input.baseId,
                    name: baseName
                },
                tables: selectedTables
            };
            if (input.scope === 'base' && includeViews) {
                structuredContent.views = rawTables
                    .flatMap((table) => {
                    const record = table;
                    return Array.isArray(record.views) ? record.views : [];
                })
                    .map((view) => normalizeView(view, detailLevel));
            }
            logger.debug('Describe completed', {
                tableCount: selectedTables.length
            });
            return (0, response_1.createToolResponse)(structuredContent);
        }
        catch (error) {
            return (0, handleError_1.handleToolError)('describe', error, ctx);
        }
    });
}
//# sourceMappingURL=describe.js.map